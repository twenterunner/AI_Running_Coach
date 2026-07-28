AI Running Coach v8.3.2 — build 8320
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


v8.3.2 STABILITY FIX
--------------------
- Corrected the startup-order error that could stop JavaScript before the first render on a fresh browser or cleared site data.
- Consolidated compatible styling for every new coach-dashboard class.
- Added in-app phone diagnostics under Settings.
- Updated HTML, JavaScript, CSS, manifest and service-worker cache together to build 8320.


v8.3.2 COMPLETED-EVIDENCE AND PRESCRIPTION FIX
------------------------------------------------
- Every Goal progress card now uses completed runs only.
- Weekly-volume progress is the best completed training week; setup baseline values are not counted as completed evidence.
- Longest-run evidence no longer treats the manually entered baseline as a completed run.
- Every planned training-session distance equals warm-up + main set + cooldown.
- Quality-session pace, HR and power cards are explicitly labelled as main-set targets.
- Session wording now identifies which section the targets apply to and whether recovery distance is included.
- Build 8320 forces the future plan to regenerate so old inconsistent prescriptions are replaced.
