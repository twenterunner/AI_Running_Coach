AI Running Coach v6.5 — build 6500
================================================

A browser-based adaptive marathon training coach with transparent readiness,
evidence coverage and conservative weekly plan adaptation.

CORE PERFORMANCE METRICS
------------------------
1. Efficiency Factor (J/heartbeat)
   Average running power × 60 ÷ average heart rate.
   Higher is better when comparing similar run types and conditions.

2. Power-based Cardiac Drift (%)
   Percentage deterioration in power per heartbeat from the first usable half
   of a run to the second. Lower is better. Detailed timestamped heart-rate and
   power data are required.

READINESS MODEL
---------------
The four pillars are:
- Physiological readiness: Fitness, Endurance, Efficiency
- Training execution: Adherence, Consistency
- Recovery & health: Recovery, Pain status
- Race readiness: Preparation time, Long-run execution, Specificity

Missing evidence contributes 0 to the readiness score but does not count toward
evidence coverage. Missing metrics are not ranked as measured weaknesses.

ADAPTIVE FACTOR
---------------
The adaptive factor uses only:
- completed load versus planned load;
- same-run-type Efficiency Factor trend;
- qualifying power-based Cardiac Drift.

Future weeks remain pending at 1.00 until the preceding week is complete.
The applied factor is constrained by the configured safety range.

RUN-TO-PLAN MATCHING
--------------------
A completed run matches a planned workout by plan ID, or by both date and a
compatible run type. An Easy run cannot complete a planned Intervals or Long-run
session.

INSTALLATION / DEPLOYMENT
-------------------------
Upload all files in this folder to the root of the GitHub Pages repository.
The service worker cache is arc-v65-web-6500. After deployment, refresh once or
close and reopen the installed PWA to activate the new cache.

BACKUP
------
Use Settings > Download backup before replacing an older deployment. Restore the
backup after deployment if browser storage was cleared.


v6.5 WORKOUT MATCHING
---------------------
Every imported or manually entered run is explicitly classified by the user as:
- linked to a selected planned workout;
- ad hoc and intentionally not linked; or
- unresolved for later review.

The app suggests likely planned sessions but never silently confirms the link. A linked
run stores the planned date and day offset. Training execution separately assesses
completed volume, session completion and schedule timing. Long-run execution and
specificity require a compatible run type, while ad hoc runs still contribute to actual
weekly volume and physiological metrics.

Timing credit: same day 100%, one day early/late 90%, two days 75%, more than two
days 50%. A planned workout can only be linked to one run. Links can be changed or
removed from the run editor at any time.
