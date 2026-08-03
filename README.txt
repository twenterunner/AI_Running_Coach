AI Running Coach v10.0.32 Stable — build 10320

Files included:
- index.html
- app.js
- styles.css
- manifest.webmanifest
- service-worker.js
- README.txt

Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA so cache build 10320 activates.

Build 10320 capability-and-readiness update:
- Both Pace & Power and Distance & Load now display cumulative calibration since programme start (or the active assessment baseline for Pace & Power).
- Distance & Load no longer resets its learned factor to 1.000 at each weekly review.
- Each completed weekly review applies its durable load-tolerance adjustment to the previous cumulative factor.
- Current factor, change this week and change since programme start use the same cumulative history calculation.
- The shared Plan graph now plots both pathways cumulatively against baseline 1.000.
- HRV and pain remain separate temporary recovery modifiers. They can moderate the effective planning factor without permanently changing learned load tolerance.
- The calculation fold-out shows the previous cumulative factor, the new weekly learning adjustment, the resulting cumulative factor and the temporary recovery modifier separately.
- Future weeks retain the latest cumulative factor until new completed-week evidence is available.
- Cumulative and effective planning factors remain bounded by the configured minimum and maximum safeguards.
- Header, manifest, schema, asset references and service-worker cache are aligned to build 10320.

Validation:
- JavaScript syntax passed.
- Manifest JSON passed.
- No stale v10.0.30/build 10300 references remain.
- ZIP integrity passed.

- The pathway graph contains only cumulative learned Pace & Power and Distance & Load capability.
- A separate Plan panel shows learned pace capability, learned load capability, current readiness modifier and the effective load factor actually applied this week.
- Pace and power prescriptions use the cumulative Pace & Power factor; weekly distance and session load use cumulative Distance & Load multiplied by temporary readiness.
