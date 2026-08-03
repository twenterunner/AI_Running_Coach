AI Running Coach v10.0.27 Stable — build 10270

Files included:
- index.html
- app.js
- styles.css
- manifest.webmanifest
- service-worker.js
- README.txt

Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA so cache build 10270 activates.

Build 10270 run-import update:
- Existing detailed Stryd CSV import retained.
- Added browser-based Garmin and Stryd FIT activity import using the official Garmin FIT JavaScript SDK.
- FIT records are normalized into the existing run model, including duration, distance, heart rate, cadence and native/developer power fields when available.
- Added activity-file validation, running-sport validation and duplicate detection.

Previous criterion-layout fix:
- The current-day and future daily check-in always use the exact prescription displayed by the current seven-day rehabilitation calendar.
- A previously saved same-day snapshot can no longer override a newly recalculated walking duration or exercise dose.
- Historical check-ins still retain their original saved prescription snapshot for auditability.
- Walking-target validation, completion scoring and the saved check-in snapshot all use the same canonical target duration.
- Version and cache references are aligned.
