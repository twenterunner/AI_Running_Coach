AI Running Coach v9.3.4 Stable — build 9340

Changes in this release:
- Removes the non-actionable “One system, two outputs” explanation.
- Replaces generic calculation text with the actual Weekly Plan Adjustment breakdown: starting factor, each applied input, bounded result and calculation timing.
- Prevents an unfinished week from being labelled low tolerance or penalised before the weekly review.
- Adds an expandable explanation of Fitness Evidence Confidence, including confidence bands, baseline date and the completed runs that contributed evidence.
- Extends the evidence-based Dashboard and Coach assessments to include fitness calibration, recovery, pain and the Weekly Plan Adjustment decision.
- Keeps programme-timeline phase names as whole words and rotates them on narrow mobile screens rather than breaking words.
- Introduces no new health or recovery inputs; only existing HRV, pain, completed load, efficiency, cardiac drift, adherence and workout evidence are used.
- Updates schema, manifest and service-worker cache to build 9340.

Files:
- index.html
- styles.css
- app.js
- manifest.webmanifest
- service-worker.js
- README.txt

Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9340 activates.
