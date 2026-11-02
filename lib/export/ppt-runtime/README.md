# Offline PowerPoint runtime

The HTML export runs the live backend's `app.services.reportgen` package in a
browser worker. Do not implement separate slide layouts in TypeScript. The
backend supplies the current report source, Karla fonts, logos, prepared-by
credit, main question, design constraints, and the exact prepared artwork when
the HTML file is exported. Exporting PPTX from that file uses no backend or CDN.

Runtime: Pyodide 0.29.0 (Python 3.13), Pillow 11.3.0, lxml 6.0.2,
python-pptx 1.0.2, XlsxWriter 3.2.9, typing_extensions 4.15.0.
The wheels in this folder are pinned and checked against `manifest.json` at
build time. Core runtime files come from the pinned `pyodide` npm dependency.

`npm run build:export-assets` creates `public/export-assets/appeal-ppt-runtime.json`.
This is about 21 MB before transfer compression. It is embedded once per HTML
file and initialized only when PowerPoint is requested. The worker is reused
for subsequent exports; no presentation layouts are generated on the UI thread.

The report uses a bounded per-render cache for resized image layers and fast
lossless PNG encoding. The worker retains its prepared previews across filter
changes, and repeating an unchanged export reuses the finished PPTX. Slide
progress renews the worker inactivity watchdog; an active large deck is never
terminated merely because its total generation time exceeds three minutes.

Only when updating dependencies, run `node scripts/prepare-offline-ppt-runtime.mjs`
with network access, inspect the pinned versions/hashes, and commit the wheels
and manifest. Normal builds do not download dependencies.

Run the browser/live parity check with Chrome installed:

```
node scripts/test-offline-ppt-parity.mjs <backend-repository> <temporary-work-directory>
```

The test generates the live reference decks, opens a local HTML with networking
disabled, generates PPTX in the browser, and compares all slide/chart/table XML
and decoded image pixels. It covers grid, layer, text, hybrid, video, artwork,
design constraints, and changed filters/settings. Generated decks are test
artifacts only. They are not templates or production dependencies.
