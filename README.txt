AI Running Coach v8.7.0 Stable (build 8700)

DEPLOYMENT
Replace all six files together:
- index.html
- styles.css
- app.js
- manifest.webmanifest
- service-worker.js
- README.txt

Keep the existing icon files in the repository. After GitHub Pages deploys, fully close and reopen the browser tab or installed PWA once so service-worker cache 8700 activates.

V8.7.0 DASHBOARD AND MODEL UPDATE

Dashboard structure
1. Marathon Outlook — compares the probability of meeting the target if racing today with the projected probability after completing the remaining programme.
2. Coach Summary — shows the main positive, the current limiter and the highest-value next step.
3. Race Preparation — one shared model with current and projected component scores.
4. Progress to Race — time remaining, weekly volume, long-run progression, milestones, timeline and adaptive factor.
5. Performance Trends — prediction history, intensity mix, efficiency and cardiac drift.

Shared Race Preparation model
- Physiological fitness: 40%
- Marathon preparation: 30%
- Plan execution: 20%
- Recovery and health: 10%

Target outlook scenarios
- Race today uses the current predicted finish, current preparation-support score and current uncertainty.
- Physiological fitness drives the predicted time and is therefore not counted a second time in the probability adjustment; marathon preparation, execution and health provide the limited supporting adjustment.
- Follow programme assumes all remaining sessions are completed.
- Plan execution becomes 100 only in the projected scenario.
- Physiological fitness improves conservatively with diminishing returns, remaining build weeks, health and training opportunity.
- Marathon preparation increases according to remaining long runs, race-specific sessions and usable build time.
- Recovery and health are not automatically improved.
- Evidence coverage widens or narrows uncertainty; missing evidence does not automatically reduce the preparation score.
- Both probabilities remain capped at 5–95% to retain race-day uncertainty.

VALIDATION
- JavaScript syntax checked with Node.
- Manifest JSON validated.
- Static HTML IDs checked for duplicates.
- Service-worker core cache restricted to the six release files so missing optional image assets cannot block installation.
- Version, build and cache references synchronised to 8.7.0 / 8700.

BACKWARDS COMPATIBILITY
The existing storage key and schema remain unchanged. Existing setup, runs, assessments, plan data and prediction history are preserved.
