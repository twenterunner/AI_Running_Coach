AI Running Coach v9.0.4 Stable — build 9040

- Prediction history now always draws the fixed start-of-programme and target-time horizontal reference lines, including when only one prediction point exists.
WHAT CHANGED
- The Goal Race outlook block now uses a clear status-aligned background: green when the target is supported, amber when it remains possible, and red when it is not yet supported today.
- Reworked the marathon prediction-history chart into three explicit series:
  1. Prediction progression — one point for each saved run or assessment event.
  2. Start-of-programme prediction — a fixed horizontal reference line.
  3. Target time — a fixed horizontal reference line.
- Editing a saved run or assessment continues to update its existing prediction point rather than adding a duplicate.
- Existing installations use the earliest saved prediction as the best available start-of-programme baseline; new installations retain the first available estimate as the fixed baseline.
- Updated schema, version labels, cache references, manifest and service worker to v9.0.4 build 9040.

VERIFICATION STANDARD
The graph distinguishes user-event prediction history from fixed reference values. No artificial intermediate prediction points are generated.

INSTALLATION
Replace all six files in the GitHub Pages repository. Keep the existing icon files. After GitHub Pages deploys, fully close and reopen the browser tab or installed PWA so cache build 9040 activates. Existing stored data is migrated in place.
