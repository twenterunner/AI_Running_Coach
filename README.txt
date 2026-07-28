AI Running Coach v8.4.0 — build 8400
===============================================

Major coach-led dashboard redesign:
- Central Coach Engine provides one consistent training state for Dashboard, forecast and coaching insights.
- Current and predicted race-day readiness shown together.
- On-track status, coach confidence, biggest strength, biggest limiter and best next action.
- Goal-progress cards for longest verified run, weekly volume, long-run evidence, race-specific work and plan-linked workouts.
- Visual Build / Peak / Taper / Race timeline.
- Readiness scenarios for following the plan, continuing the current trend and missing one run per week.
- Clearer terminology: Longest Verified Run, Estimated Build Time, Time Until Race, Planned This Week and Training Progression Factor.
- Existing detailed readiness pillars, charts, run import, matching, plan and race-day features remain available.

Install by uploading all files in this folder to the GitHub Pages repository root.


v8.4.0 STABILITY FIX
--------------------
- Corrected the startup-order error that could stop JavaScript before the first render on a fresh browser or cleared site data.
- Consolidated compatible styling for every new coach-dashboard class.
- Added in-app phone diagnostics under Settings.
- Updated HTML, JavaScript, CSS, manifest and service-worker cache together to build 8400.


v8.4.0 COMPLETED-EVIDENCE AND PRESCRIPTION FIX
------------------------------------------------
- Every Goal progress card now uses completed runs only.
- Weekly-volume progress is the best completed training week; setup baseline values are not counted as completed evidence.
- Longest-run evidence no longer treats the manually entered baseline as a completed run.
- Every planned training-session distance equals warm-up + main set + cooldown.
- Quality-session pace, HR and power cards are explicitly labelled as main-set targets.
- Session wording now identifies which section the targets apply to and whether recovery distance is included.
- Build 8400 forces the future plan to regenerate so old inconsistent prescriptions are replaced.


v8.4.0 SCIENTIFIC SESSION STRUCTURE AND DISTANCE ACCOUNTING
---------------------------------------------------------
- Workout structure now determines total session distance; the plan no longer compresses a prescribed workout to fit an arbitrary quality-run distance.
- Intervals use explicit repetition and between-repetition recovery distances. Recovery count is repetitions minus one.
- Tempo sessions use phase-specific continuous or cruise-interval structures.
- Fitness assessments include the configured test distance plus a 2.0 km warm-up and 1.5 km cooldown.
- Long-run opening, endurance section and final easy section are all included in the displayed long-run distance.
- Each non-race workout displays a numerical distance check.


v8.4.0 Stable adds release-blocking workout validation, session accounting, Coach Intelligence explanations, Plan Health checks, schema migration 8400 and synchronized PWA cache versioning.
