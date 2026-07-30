AI Running Coach v9.4.2 Stable — build 9420

This maintenance release fixes verified date, version, pathway-state and cache inconsistencies without changing training-day flexibility or icon deployment.

Changes:
- Corrects the day-duration constant from 87,300,000 ms to 86,400,000 ms so week generation, race countdowns and rolling evidence windows do not drift over time.
- Introduces one central VERSION constant and aligns the visible header and console diagnostics to v9.4.2 build 9420.
- Makes the Dashboard Distance & Load pathway use the same final-versus-provisional factor selection as the Plan tab.
- Uses nullish numeric fallbacks for pathway factors so valid numeric values are not incorrectly replaced.
- Prevents the service worker from caching unsuccessful HTTP responses.
- Updates schema, HTML asset references, manifest and service-worker cache to build 9420.
- Deliberately preserves configurable training on any day and keeps icon files outside this six-file package.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9420 activates.
