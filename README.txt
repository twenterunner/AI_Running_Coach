AI Running Coach v8.6.3 Stable — build 8630
Schema: 8500 (backwards compatible)

DEPLOYMENT
Replace all six files together:
- index.html
- styles.css
- app.js
- manifest.webmanifest
- service-worker.js
- README.txt

Keep the existing icon files in the repository. After GitHub Pages deploys, fully close and reopen the browser tab or installed PWA once so service-worker cache 8630 activates.

v8.6.3 DASHBOARD CLARITY UPDATE

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
- Synchronized index, app, stylesheet, manifest, service worker and README to v8.6.3 build 8630.

No readiness calculation, race prediction calculation, workout-generation rule, schema or stored athlete data was changed. Schema remains 8500.


v8.6.3 CHANGES
- Moved the adaptive-factor foldout into Section 2, Progress to goal.
- Made the Training progression factor KPI tile open and close the calculation foldout.
- Removed the Weekly completion rate graph. Completion evidence remains in the readiness model.
- Removed Section 6, What to do next, and its Next key sessions panel.
- Clarified that the prediction chart shows valid assessment history plus one automatically updated live estimate.
- Fixed missing Schedule adherence interpretation, action and calculation-definition mappings that could display undefined.
- Synchronized all six release files to v8.6.3 build 8630.


v8.6.3 focused update
- Readiness pillars are tappable and reveal their calculation in place.
- All Progress KPIs remain visible on mobile and desktop.
- Chart points can be tapped for date, value and context.
- Prediction snapshots are stored after saved runs, Stryd imports and assessments.
- Readiness colours consistently mean green/on track, amber/watch, red/action and grey/no evidence.


v8.6.3 FOCUSED PATCH
- Corrected the day-length constant from 86,401,000 ms to 86,400,000 ms.
- Corrected manifest version metadata and synchronized all release references to v8.6.3 build 8630.
- Removed the More details / Show less control; all Progress KPIs remain visible.
- Moved the adaptive-factor foldout directly below the KPI grid.
- Removed automatic scrolling when the Training progression factor tile is tapped.
