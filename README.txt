AI Running Coach v8.6.0 Stable — build 8600
Schema: 8500 (backwards compatible)

DEPLOYMENT
Replace all six files together:
- index.html
- styles.css
- app.js
- manifest.webmanifest
- service-worker.js
- README.txt

Keep the existing icon files in the repository. After GitHub Pages deploys, fully close and reopen the browser tab or installed PWA once so service-worker cache 8600 activates.

v8.6.0 DASHBOARD INFORMATION HIERARCHY

The Dashboard is now ordered around the way a runner uses coaching information:
1. Coach verdict — the immediate assessment and what matters now.
2. Progress to goal — race requirements, timeline, weekly volume and long-run progression.
3. Current training status — readiness pillars, completion, intensity mix and adaptive factor.
4. Future outlook — readiness scenarios and race prediction trend.
5. Performance analytics — efficiency, cardiac drift, run-type comparisons and definitions.
6. What to do next — upcoming key sessions and direct access to the plan.

Clear numbered section headings now separate each decision layer. The existing calculations, charts, IDs and stored athlete data are preserved; only the dashboard presentation order and section framing changed.

RELEASE NOTES
- Reordered the Dashboard from summary through evidence to action.
- Moved Coach assessment directly below the race overview.
- Grouped Goal progress, Race timeline, weekly volume and long-run progression together.
- Grouped readiness pillars, adherence, intensity mix and adaptive factor together.
- Grouped readiness forecast and race prediction under Future outlook.
- Kept technical efficiency and cardiac-drift analysis in a dedicated Performance analytics section.
- Made Next key sessions the final dashboard section.
- Added responsive styling for the numbered dashboard section headings.
- Synchronized index, app, stylesheet, manifest, service worker and README to v8.6.0 build 8600.

No readiness calculation, race prediction calculation, workout-generation rule, schema or stored athlete data was changed. Schema remains 8500.
