AI Running Coach v9.3.8 Stable — build 9380

This release upgrades execution scoring and the Evidence-based Assessment.

Changes:
- Uses session-specific execution weights so recovery, easy, threshold, interval, long-run and race sessions are judged against their actual physiological purpose.
- Does not reward excessive distance or values above 100.
- Treats whole-run pace, power and HR averages as lower-reliability evidence for structured workouts containing warm-up, recoveries or cooldown.
- Varies cardiac-drift relevance by workout type and adds RPE appropriateness when available.
- Scores only observable evidence for ad hoc runs; missing planned targets reduce evidence quality rather than receiving neutral points.
- Adds the workout objective, score interpretation, evidence quality and pace-versus-power conflict explanation to each run breakdown.
- Keeps the pain cap but explains it as reduced training value rather than poor technical execution.
- Makes the Evidence-based Assessment race-, phase- and goal-specific using race outlook, programme phase, weeks remaining, athlete state, execution patterns, recovery, pain, plan adherence, long-run evidence, specificity and the next planned session.
- Identifies recurring execution weaknesses and produces prioritised, evidence-labelled actions.
- Updates schema, manifest and service-worker cache to build 9380.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9380 activates.
