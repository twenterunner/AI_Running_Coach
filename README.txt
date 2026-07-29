AI Running Coach v8.7.4 Stable (build 8740)

FILES
- index.html
- styles.css
- app.js
- manifest.webmanifest
- service-worker.js
- README.txt

DEPLOYMENT
Replace all six files in the GitHub Pages repository. Keep the existing icon files. Fully close and reopen the browser tab or installed PWA once so cache 8740 activates.

V8.7.4 PREDICTION AND EXECUTION UPDATE

1. Corrected asymmetric probability model
- The central predicted time is now the median: 50% of outcomes lie faster and 50% slower before comparison with the target.
- The faster tail remains narrower and the slower tail wider, but asymmetry no longer shifts most probability mass slower than the stated prediction.
- This corrects the understated follow-programme probability in v8.7.3a.

2. More useful uncertainty ranges
- Dashboard ranges are now central 70% ranges rather than very broad 80% ranges.
- Uncertainty is bounded and driven by assessment extrapolation, evidence coverage and current execution confidence.
- Completing the programme narrows uncertainty but never eliminates race-day variability.

3. Scientifically conservative programme outlook
- Short-race Riegel extrapolation is corrected for marathon durability when long-run and volume evidence are incomplete.
- Full programme execution improves durability and allows only a modest, capped central fitness gain.
- A probability above 90% occurs only when projected capability has a sufficient margin over the target; it is not guaranteed merely for completing a plan.

4. Training execution matching fix
- Same-day imported runs are prioritised for matching to the same-day planned workout.
- Existing unlinked runs are automatically reconciled only when there is one credible exact-date match.
- Training execution to date now updates for today's completed workout.

5. Pace adherence
- Added an overall pace-adherence row for matched runs.
- It compares whole-session actual pace with a whole-session planned estimate that includes warm-up and cooldown.
- Quality-session pace remains approximate without lap-level CSV targets.

6. Dashboard cleanup and colour consistency
- Removed Evidence coverage from Progress to race because it is already shown in Execution confidence.
- The outlook hero, current scenario and programme scenario now use consistent green, amber or red status colouring.
