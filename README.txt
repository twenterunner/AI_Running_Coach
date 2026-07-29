AI Running Coach v8.5.8 Stable — build 8580
Schema: 8500 (backwards compatible)

DEPLOYMENT
Replace all six files together:
- index.html
- styles.css
- app.js
- manifest.webmanifest
- service-worker.js
- README.txt

Keep the existing icon files in the repository. After GitHub Pages deploys, fully close and reopen the browser tab or installed PWA once so service-worker cache 8580 activates.

v8.5.8 INTERFACE REFINEMENT

Removed the following duplicated sections from both the Dashboard and Coach views:
- Current strengths
- Risks and limiters
- Highest-impact next actions

The hidden/conditional Watch items classification panel was also removed from the Coach view so the old classification interface cannot reappear when data changes.

The Coach view now contains only:
- Overall readiness, predicted time, target gap and current phase
- Overall assessment
- Model interpretation guidance

Detailed evidence remains available through:
- Readiness pillars and component calculations
- Goal progress
- Metrics and run-type analysis
- Plan Health
- Data needed
- Next key sessions

No readiness calculation, predicted probability calculation, plan-generation rule or stored athlete data was changed. Schema remains 8500.


v8.5.8 CHANGES
- Time until race now includes weeks or days and a consistent secondary label.
- Removed the duplicate Session accounting distance table; the green distance check remains.
- Plan Health now shows only the final validation conclusion.
- Renamed Run health check to Validate plan.
- Removed Upgrade & data integrity and Phone diagnostics from Settings.
- All six release files regenerated together for build 8580.
