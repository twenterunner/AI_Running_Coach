AI Running Coach v8.5.4 Stable — build 8540

INSTALLATION
Replace index.html, styles.css, app.js, manifest.webmanifest, service-worker.js and README.txt together. Keep the existing icon files in the same repository. After GitHub Pages deploys, close and reopen the installed PWA once so build 8540 activates its new service-worker cache.

v8.5.4 LIMITER CLASSIFICATION CORRECTION
- The dashboard no longer labels the lowest score as a major limiter when that score is still healthy.
- Score below 70: shown as “Biggest limiter”.
- Score from 70 to below 85: shown as “Primary watch item” and explicitly described as the smallest margin rather than a major limiter.
- Score 85 or higher: shown as “No significant limiter identified”.
- This is a presentation and coaching-interpretation correction only. It does not alter readiness calculations, predicted race-day readiness, plan generation or stored data.
- Schema remains 8500 for backward compatibility.
