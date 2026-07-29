AI Running Coach v9.0.0 Stable — build 9000

WHAT CHANGED
- Replaced the generic Coach assessment paragraph with an evidence-based coaching report.
- Every surfaced strength and opportunity is derived from configured goals, plan-linked workouts, logged runs, valid assessments, Garmin HRV or pain entries.
- Added expandable evidence details showing the measured values, calculation window, score, impact and confidence.
- Added deterministic prioritisation by evidence strength, marathon impact and urgency.
- Added recovery-aware contradiction handling so load-building advice is not prioritised when supported pain or HRV evidence calls for caution.
- Limited recommended actions to the three highest-value, evidence-backed next steps.
- Updated the dedicated Coach report page and the Dashboard Coach assessment consistently.
- Updated schema, version labels, cache references and service worker to v9.0.0 build 9000.

VERIFICATION STANDARD
The coach does not infer sleep, nutrition, motivation, mental fatigue, overtraining or other conditions unless corresponding information exists in the app. Missing data remains missing. Race predictions are model estimates and are clearly separated from directly observed training evidence.

INSTALLATION
Replace all six files in the GitHub Pages repository. Keep the existing icon files. Fully close and reopen the browser tab or installed PWA once so cache build 9000 activates. Existing stored data is migrated in place.
