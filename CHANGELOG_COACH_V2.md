# v15.8.4 / build 51840 — FIT evidence quality and LT1 transparency

- Quantified timing offsets and sensor coverage; generic one-second endpoint warnings suppressed.
- Every recent LT1-reviewed run appears with reason and contribution status, including rejected runs.
- Segment-level low-intensity screening in mixed workouts with strict terrain/threshold safeguards.
- Existing FIT records may be re-analysed without creating duplicate activities or changing plans.
- No browser-storage schema change, no third-party transfers, no change to fitness scoring or plan logic.

# Coach Intelligence v2 change inventory

New: `coach-intelligence.js` (read-only UMD interpretation), `coach-intelligence.css` (Today-only styles), `coach-intelligence-regression-tests.js` (concrete regression and 200 malformed input injections).

Updated: `app.js` (one embedded Today adapter, no second model; null-safe pain and original top-line verdict), `index.html` (versioned asset links), `manifest.webmanifest`, `service-worker.js` (cache busting), `INSTALL.txt`, `README.txt`, three existing version-marker regression test files and `SHA256SUMS.txt`.

No changes to the existing model authority functions, training plan builder, source FIT processing, adaptive learning algorithms, stored data schema or GitHub Pages origin.
