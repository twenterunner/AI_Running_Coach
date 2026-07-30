AI Running Coach v9.7.0 Stable — build 9700

This release adds an independent, evidence-informed Injury tab without changing the running programme or race-prediction calculations.

Changes:
- Records injury date, mechanism, symptoms at onset, symptoms now, pain, walking limitation, bruising/swelling and pop/snap.
- Predicts a conservative return-to-running window and displays six rehabilitation stages with criteria.
- Adds daily check-ins for pain, walking, functional loading, walk-run exposure and next-morning response.
- Recalculates the timeline from symptom trend and criteria achieved; regressions move the athlete back a stage.
- Keeps injury rehabilitation data fully independent from plan generation, workout adaptation, plan health and race outlook.
- Includes urgent-assessment red flags and clearly states that the app does not diagnose or medically clear an athlete.
- Migrates existing local data to schema/build 9700 and preserves all prior runs, assessments, plan data and settings.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9700 activates.
