# Performance benchmark

`bench.py` serves a copy of `dist/` with brotli (like the real host) and loads the home page in
headless Chromium under two profiles, cache off:

- **phone**: 390×844 at DPR 3, Lighthouse's mobile preset (slow 4G, 150 ms RTT, 1.6 Mbps, 4× CPU).
- **desktop**: 1920×1080 at DPR 1, Lighthouse's desktop preset (40 ms RTT, 10 Mbps, no CPU slowdown).

Load metrics are medians over `--runs` cold loads. Runtime metrics come from separate sessions on the
real page: idle at the top, idle with the experience timeline in view, clicks on the timeline, and a scroll
pass. Headless Chromium has no GPU, so its "main thread busy" and frame-gap numbers overstate painting
cost; the script share is the reliable runtime figure.

The reference page (`ref-plain.html`) is the same built home page with every script, canvas, web font
rule and font preload removed. It is the "plain .html" floor the site is measured against.

## Run

```sh
python3 -m pip install playwright brotli
python3 -m playwright install chromium
npm run build
python3 bench/bench.py --label my-run --runs 5
```

Results are written to `bench/results/<label>.json`; the tables are printed to stdout.

## Result files

| File | What it is |
| --- | --- |
| `baseline-304f1a4.json` | The page before optimisation (Google Fonts, per-frame sky allocations, field canvas churn). |
| `final.json` | The optimised page (see the summary in the repo README). |

Use the same machine for before/after runs; the profiles slow the CPU and network, but host load still
moves the medians by a few percent.
