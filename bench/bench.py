#!/usr/bin/env python3
"""Performance benchmark for the built site (dist/).

Serves a copy of dist/ with brotli, like the real host, and loads the home page in headless Chromium
under two profiles, each with the cache off. It also loads a reference page: the same home page HTML and
CSS with every script, the sky canvas and the web fonts removed. That reference is the "plain .html"
floor the site is measured against.

  python3 bench/bench.py --label baseline          # writes bench/results/baseline.json and prints tables
  python3 bench/bench.py --label x --runs 3 --only phone

Load metrics are medians over --runs fresh loads. Runtime metrics (idle CPU, scrolling, sky redraw, glyph
field) come from separate sessions on the real page only.

Probes (installed before any page script runs):
- sky frame: from the frame's first fillRect(0,0,..) on #sky to the end of that task (microtask). Assumes
  the engine still starts each frame with a full-canvas fillRect.
- rAF work: time inside every requestAnimationFrame callback (the glyph field and nav run there).
Headless Chromium has no real GPU compositing, so frame pacing shows main-thread jank only.
"""
import argparse, asyncio, json, re, shutil, statistics, tempfile, threading, time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import brotli
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PROFILES = {
    'phone': dict(vp=(390, 844), dpr=3, mobile=True, cpu=4, rtt=150, mbps=1.6),
    'desktop': dict(vp=(1920, 1080), dpr=1, mobile=False, cpu=1, rtt=40, mbps=10),
}
COMPRESS = {'.html', '.css', '.js', '.svg', '.json', '.txt', '.xml'}

PROBE = r"""(() => {
  const M = window.__b = { lt: [], cls: 0, sky: [], raf: [], ev: [], frames: [] };
  const po = (type, fn, o = {}) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true, ...o }); } catch {} };
  po('longtask', (e) => M.lt.push([e.startTime, e.duration]));
  po('paint', (e) => { M[e.name] = e.startTime; });
  po('largest-contentful-paint', (e) => { M.lcp = e.startTime; const el = e.element; M.lcpEl = el ? (el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '')) : null; });
  po('layout-shift', (e) => { if (!e.hadRecentInput) M.cls += e.value; });
  po('event', (e) => M.ev.push([e.name, e.duration, e.processingStart - e.startTime]), { durationThreshold: 16 });
  const fr = CanvasRenderingContext2D.prototype.fillRect; let open = false;
  CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
    if (!open && x === 0 && y === 0 && this.canvas.id === 'sky') {
      open = true; const s = performance.now();
      queueMicrotask(() => { M.sky.push([s, performance.now() - s]); open = false; });
    }
    return fr.call(this, x, y, w, h);
  };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { const s = performance.now(); cb(t); const d = performance.now() - s; if (d > 0.25) M.raf.push([s, d]); });
  const tick = (t) => { M.frames.push(t); raf(tick); }; raf(tick);
})();"""


class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    cache: dict = {}

    def log_message(self, *a):
        pass

    def do_GET(self):
        path = Path(self.translate_path(self.path.split('?')[0]))
        if path.is_dir():
            path = path / 'index.html'
        if not path.is_file():
            alt = path.with_suffix('.html')
            if not alt.is_file():
                self.send_error(404)
                return
            path = alt
        body = path.read_bytes()
        enc = None
        if path.suffix in COMPRESS and 'br' in self.headers.get('Accept-Encoding', ''):
            key = str(path)
            if key not in self.cache:
                self.cache[key] = brotli.compress(body, quality=11)
            body, enc = self.cache[key], 'br'
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        if enc:
            self.send_header('Content-Encoding', enc)
        self.end_headers()
        self.wfile.write(body)


def make_site(dist: Path) -> Path:
    site = Path(tempfile.mkdtemp(prefix='bench-site-'))
    shutil.copytree(dist, site, dirs_exist_ok=True)
    h = (site / 'index.html').read_text()
    h = re.sub(r'<script\b[^>]*>.*?</script>', '', h, flags=re.S)
    h = re.sub(r'<canvas\b[^>]*></canvas>', '', h)
    h = re.sub(r'<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>', '', h)
    h = re.sub(r'<link[^>]*as="font"[^>]*>', '', h)
    h = re.sub(r'@font-face\s*\{[^}]*\}', '', h)
    (site / 'ref-plain.html').write_text(h)
    return site


def serve(site: Path):
    srv = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(site)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


async def open_page(p, prof, net=True):
    b = await p.chromium.launch()
    ctx = await b.new_context(viewport=dict(width=prof['vp'][0], height=prof['vp'][1]), device_scale_factor=prof['dpr'],
                              is_mobile=prof['mobile'], has_touch=prof['mobile'])
    await ctx.add_init_script(PROBE)
    pg = await ctx.new_page()
    cdp = await ctx.new_cdp_session(pg)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
    if net:
        bps = prof['mbps'] * 1e6 / 8
        await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': prof['rtt'], 'downloadThroughput': bps, 'uploadThroughput': bps})
    await cdp.send('Emulation.setCPUThrottlingRate', {'rate': prof['cpu']})
    await cdp.send('Performance.enable')
    return b, pg, cdp


async def metrics(cdp):
    return {m['name']: m['value'] for m in (await cdp.send('Performance.getMetrics'))['metrics']}


async def load_once(p, prof, url):
    b, pg, cdp = await open_page(p, prof)
    reqs = {}
    cdp.on('Network.requestWillBeSent', lambda e: reqs.setdefault(e['requestId'], {'url': e['request']['url'], 't0': e['timestamp']}))
    cdp.on('Network.loadingFinished', lambda e: reqs.get(e['requestId'], {}).update(bytes=e['encodedDataLength'], t1=e['timestamp']))
    await pg.goto(url, wait_until='load')
    await pg.wait_for_timeout(3000)
    m = await pg.evaluate("""() => { const B = __b, n = performance.getEntriesByType('navigation')[0];
      const res = performance.getEntriesByType('resource');
      return { ttfb: n.responseStart, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, fcp: B['first-contentful-paint'],
        lcp: B.lcp, lcpEl: B.lcpEl, cls: B.cls, lt: B.lt, sky: B.sky,
        blocking: res.filter((r) => r.renderBlockingStatus === 'blocking').map((r) => r.name.split('/').pop().slice(0, 40)),
        dom: document.getElementsByTagName('*').length }; }""")
    met = await metrics(cdp)
    await b.close()
    fcp = m['fcp'] or 0
    m['tbt'] = sum(max(0, d - 50) for s, d in m['lt'] if s + d > fcp)
    m['maxLT'] = max((d for _, d in m['lt']), default=0)
    m['nLT'] = len(m['lt'])
    m['skyDrawn'] = max(fcp, m['sky'][0][0] + m['sky'][0][1]) if m['sky'] else None
    m['skyFramesAtLoad'] = len(m['sky'])
    m['skyFrameMs'] = statistics.median(d for _, d in m['sky']) if m['sky'] else None
    done = [r for r in reqs.values() if 'bytes' in r and not r['url'].startswith('data:')]
    m['kb'] = sum(r['bytes'] for r in done) / 1024
    m['fontKB'] = sum(r['bytes'] for r in done if re.search(r'\.(woff2?|ttf|otf)(\?|$)', r['url'])) / 1024
    m['jsKB'] = sum(r['bytes'] for r in done if re.search(r'\.m?js(\?|$)', r['url'])) / 1024
    fonts = [r for r in done if re.search(r'\.(woff2?|ttf|otf)(\?|$)', r['url'])]
    nav0 = min(r['t0'] for r in reqs.values())
    m['fonts'] = (max(r['t1'] for r in fonts) - nav0) * 1000 if fonts else None
    m['requests'] = len(done)
    m['origins'] = len({re.match(r'https?://[^/]+', r['url']).group(0) for r in done if r['url'].startswith('http')})
    m['scriptMsLoad'] = met['ScriptDuration'] * 1000
    m['taskMsLoad'] = met['TaskDuration'] * 1000
    del m['lt'], m['sky']
    return m


async def runtime(p, prof, url):
    """One session on the real page: idle at the top, idle with the timeline in view, a scroll pass, clicks."""
    b, pg, cdp = await open_page(p, prof, net=False)
    await pg.goto(url, wait_until='load')
    await pg.wait_for_timeout(2500)
    out = {}

    async def window(label, ms, action=None):
        await pg.evaluate('__b.raf = []; __b.frames = []; __b.sky = []; __b.lt = []')
        a = await metrics(cdp)
        t = time.perf_counter()
        if action:
            await action()
        rest = ms - (time.perf_counter() - t) * 1000
        if rest > 0:
            await pg.wait_for_timeout(rest)
        z = await metrics(cdp)
        el = (time.perf_counter() - t) * 1000
        B = await pg.evaluate('({ raf: __b.raf, frames: __b.frames, sky: __b.sky, lt: __b.lt })')
        gaps = [y - x for x, y in zip(B['frames'], B['frames'][1:])]
        r = {'busyPct': 100 * (z['TaskDuration'] - a['TaskDuration']) * 1000 / el,
             'scriptPct': 100 * (z['ScriptDuration'] - a['ScriptDuration']) * 1000 / el,
             'rafWorkMs': statistics.median([d for _, d in B['raf']]) if B['raf'] else 0,
             'rafWorkN': len(B['raf']),
             'skyFrames': len(B['sky']), 'skyFrameMs': statistics.median([d for _, d in B['sky']]) if B['sky'] else None,
             'longTasks': len(B['lt']), 'maxLT': max((d for _, d in B['lt']), default=0)}
        if gaps:
            r['framesOver25msPct'] = 100 * sum(g > 25 for g in gaps) / len(gaps)
            r['worstFrameMs'] = max(gaps)
        out[label] = r

    await window('idleTop', 5000)
    await pg.evaluate("document.querySelector('#experience') && document.querySelector('#experience').scrollIntoView({block: 'center'})")
    await pg.wait_for_timeout(800)
    await window('idleTimeline', 5000)

    async def clicks():
        box = await pg.evaluate("(() => { const r = document.querySelector('.tl-role').getBoundingClientRect(); return [r.left + 20, r.top + 10]; })()")
        for _ in range(8):
            await pg.mouse.click(*box)
            await pg.wait_for_timeout(250)
    await pg.evaluate('__b.ev = []')
    await window('clicksTimeline', 2500, clicks)
    ev = await pg.evaluate('__b.ev')
    out['clicksTimeline']['worstEventMs'] = max((d for _, d, _ in ev), default=0)

    await pg.evaluate('scrollTo(0, 0)')
    await pg.wait_for_timeout(600)
    H = await pg.evaluate('document.documentElement.scrollHeight - innerHeight')

    async def scroll():
        y = 0
        while y < H:
            for _ in range(6):
                await pg.mouse.wheel(0, 80)
                await pg.wait_for_timeout(16)
            y += 480
            await pg.wait_for_timeout(250)
    await window('scroll', 0, scroll)
    await b.close()
    return out


def med(runs, k):
    v = [r[k] for r in runs if r.get(k) is not None]
    return statistics.median(v) if v else None


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--label', default='run')
    ap.add_argument('--dist', default=str(ROOT / 'dist'))
    ap.add_argument('--runs', type=int, default=5)
    ap.add_argument('--only', choices=list(PROFILES))
    a = ap.parse_args()
    site = make_site(Path(a.dist))
    srv, base = serve(site)
    res = {'label': a.label, 'date': time.strftime('%Y-%m-%d %H:%M'), 'runs': a.runs, 'load': {}, 'runtime': {}}
    try:
        async with async_playwright() as p:
            for name, prof in PROFILES.items():
                if a.only and name != a.only:
                    continue
                for page in ('site', 'ref-plain'):
                    url = base + ('/' if page == 'site' else '/ref-plain.html')
                    runs = []
                    for _ in range(a.runs):
                        runs.append(await load_once(p, prof, url))
                    res['load'][f'{name}/{page}'] = {'median': {k: med(runs, k) for k in runs[0] if isinstance(runs[0][k], (int, float)) or runs[0][k] is None},
                                                     'fcpRange': [min(r['fcp'] for r in runs), max(r['fcp'] for r in runs)],
                                                     'lcpEl': runs[0]['lcpEl'], 'blocking': runs[0]['blocking']}
                    print(f'  loaded {name}/{page} x{a.runs}', flush=True)
                res['runtime'][name] = await runtime(p, prof, base + '/')
                print(f'  runtime {name}', flush=True)
    finally:
        srv.shutdown()
        shutil.rmtree(site, ignore_errors=True)
    out = ROOT / 'bench' / 'results' / f'{a.label}.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(res, indent=1))
    report(res)
    print(f'\nsaved {out.relative_to(ROOT)}')


def fmt(v, unit=''):
    if v is None:
        return '-'
    return f'{v:.0f}{unit}' if abs(v) >= 10 else f'{v:.1f}{unit}'


def report(res):
    L = res['load']
    cols = list(L)
    rows = [('First text on screen (FCP)', 'fcp', 'ms'), ('Largest paint (LCP)', 'lcp', 'ms'), ('Sky visible', 'skyDrawn', 'ms'),
            ('Last web font arrived', 'fonts', 'ms'), ('Load event', 'load', 'ms'), ('Blocking time after FCP (TBT)', 'tbt', 'ms'),
            ('Longest task', 'maxLT', 'ms'), ('Long tasks', 'nLT', ''), ('Sky redraws during load', 'skyFramesAtLoad', ''),
            ('Sky redraw', 'skyFrameMs', 'ms'), ('Script time during load', 'scriptMsLoad', 'ms'), ('Transferred', 'kb', ' KB'),
            ('  of which fonts', 'fontKB', ' KB'), ('  of which JS', 'jsKB', ' KB'), ('Requests', 'requests', ''), ('Origins', 'origins', ''),
            ('Layout shift (CLS)', 'cls', '')]
    print(f"\n## Load ({res['label']}, median of {res['runs']} cold loads)\n")
    print('| Metric | ' + ' | '.join(cols) + ' |\n|---|' + '---|' * len(cols))
    for lab, k, u in rows:
        cells = [(f"{L[c]['median'][k]:.3f}" if k == 'cls' and L[c]['median'][k] is not None else fmt(L[c]['median'][k], u)) for c in cols]
        print(f'| {lab} | ' + ' | '.join(cells) + ' |')
    print('| FCP range | ' + ' | '.join(f"{L[c]['fcpRange'][0]:.0f}–{L[c]['fcpRange'][1]:.0f}" for c in cols) + ' |')
    print('| Render-blocking | ' + ' | '.join(', '.join(L[c]['blocking']) or 'none' for c in cols) + ' |')
    R = res['runtime']
    print('\n## Runtime (real page, after load)\n')
    rr = [('Main thread busy', 'busyPct', '%'), ('Script share', 'scriptPct', '%'), ('Frames over 25 ms', 'framesOver25msPct', '%'),
          ('Worst frame gap', 'worstFrameMs', 'ms'), ('rAF callback (median)', 'rafWorkMs', 'ms'), ('Sky redraws', 'skyFrames', ''),
          ('Sky redraw (median)', 'skyFrameMs', 'ms'), ('Long tasks', 'longTasks', ''), ('Longest task', 'maxLT', 'ms'),
          ('Worst click (0 = all under 16 ms)', 'worstEventMs', 'ms')]
    win = [(n, w) for n in R for w in R[n]]
    print('| Metric | ' + ' | '.join(f'{n} {w}' for n, w in win) + ' |\n|---|' + '---|' * len(win))
    for lab, k, u in rr:
        print(f'| {lab} | ' + ' | '.join(fmt(R[n][w].get(k), u) for n, w in win) + ' |')


if __name__ == '__main__':
    asyncio.run(main())
