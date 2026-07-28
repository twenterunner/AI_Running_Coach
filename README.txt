AI Running Coach v6.6.1 — build 6601
================================================

A browser-based adaptive race training coach with transparent readiness,
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
The service worker cache is arc-v661-web-6601. After deployment, refresh once or
close and reopen the installed PWA to activate the new cache.

BACKUP
------
Use Settings > Download backup before replacing an older deployment. Restore the
backup after deployment if browser storage was cleared.


v6.6 WORKOUT MATCHING
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


v6.6 RACE-DISTANCE PROFILES
---------------------------
Changing race distance in Settings now pre-populates the race model:
- 5K profile: 12 km peak long run, 25 km maximum week, 7 taper days
- 10K profile: 18 km peak long run, 40 km maximum week, 10 taper days
- Half marathon: 24 km peak long run, 60 km maximum week, 14 taper days
- Marathon: 34 km peak long run, 80 km maximum week, 21 taper days

The values remain editable after pre-population. Saving Settings rebuilds future
workouts and recalculates endurance, preparation time, prediction and readiness
against the selected race profile. Past workouts remain unchanged.


v6.6.1 WORKOUT MATCHING FIX
----------------------------
The run-to-plan selector no longer hides all planned workouts when none falls inside
the former 21-day window. It now shows a suggested match, all sessions from the
run's training week, and the nearest other planned workouts. Already-linked sessions
remain visible but disabled. Ad hoc and unresolved remain available under Other actions.
