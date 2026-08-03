AI Running Coach v10.0.24 Stable — build 10240

Files included:
- index.html
- app.js
- styles.css
- manifest.webmanifest
- service-worker.js
- README.txt

Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA so cache build 10240 activates.

Build 10240 Injury-module prescription-source fix:
- The current-day and future daily check-in always use the exact prescription displayed by the current seven-day rehabilitation calendar.
- A previously saved same-day snapshot can no longer override a newly recalculated walking duration or exercise dose.
- Historical check-ins still retain their original saved prescription snapshot for auditability.
- Walking-target validation, completion scoring and the saved check-in snapshot all use the same canonical target duration.
- Version and cache references are aligned.
