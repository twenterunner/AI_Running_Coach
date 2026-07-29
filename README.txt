AI Running Coach v9.0.5 Stable — build 9050

WHAT CHANGED
- Rebuilt the predicted marathon-time trend around three clearly separated concepts:
  1. Target time — a fixed horizontal reference line with its time in the legend.
  2. Predicted at programme start — a fixed horizontal reference line with its time in the legend.
  3. Prediction updates — event points added only after a run is uploaded/logged or a valid assessment is saved.
- The programme-start prediction is now stored independently from prediction history. It is derived from the plan-start test, weekly-volume and longest-run inputs and remains fixed.
- Before any uploaded event, the chart contains only the two horizontal reference lines and no artificial prediction point.
- After events are saved, the current prediction is called out against both the programme-start prediction and the target.
- Editing the same run or assessment updates its existing event point rather than creating a duplicate.
- Changing core plan-start inputs creates a new fixed programme baseline and clears the old progression history so incompatible programmes are not mixed.
- Updated schema, version labels, manifest and service-worker cache to v9.0.5 build 9050.

INSTALLATION
Replace all six files in the GitHub Pages repository and retain the existing icon files. After deployment, fully close and reopen the browser or installed PWA so cache build 9050 activates.
