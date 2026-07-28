AI Running Coach v8.5.1 Stable — build 8510
================================================

INSTALL / UPDATE
----------------
Upload every file from this package to the root of the GitHub Pages repository, replacing the existing files. Keep index.html, app.js, styles.css, manifest.webmanifest and service-worker.js on the same build.

After GitHub Pages deploys, close and reopen the installed PWA once. Build 8510 uses a new service-worker cache and network-first loading.

v8.5.1 TRAINING-FREQUENCY UPDATE
--------------------------------
- Enabled training days now directly affect both current overall readiness and predicted race-day readiness.
- The model compares selected weekly training opportunities with race-specific recommendations:
  5K: 3 days; 10K: 3 days; half marathon: 4 days; marathon: 5 days.
- A steeper penalty applies below the minimum viable frequency:
  5K/10K: 2 days; half marathon/marathon: 3 days.
- Reducing training days therefore changes confidence immediately, even before a workout is missed.
- Training opportunity is shown as a Race readiness component, with its own explanation and recommended action.
- Saving Settings now explicitly saves the rebuilt plan and rejects a zero-day schedule.

MODEL RATIONALE
---------------
Training frequency is treated as a forward-looking feasibility constraint, not as completed-training evidence. Fewer weekly sessions reduce the ability to distribute easy volume, quality work, long runs and recovery. The effect scales with race distance and becomes stronger below the minimum viable frequency.

DATA SAFETY
-----------
- Schema remains 8500, so this update does not require a new data migration.
- Continues reading and writing the established arc_v62_web key.
- Continues mirroring saves to arc_v8500_web.
- Existing runs, assessments, settings, training days and plan history remain compatible.

FILES CHANGED
-------------
app.js
index.html
manifest.webmanifest
README.txt
service-worker.js
styles.css (unchanged content, included so the release remains a complete synchronized replacement set)
