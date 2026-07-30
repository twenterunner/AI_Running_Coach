AI Running Coach v9.8.1 Stable — build 9810

This release upgrades the independent Injury tab into an adaptive rehabilitation coach without changing the running programme, workout adaptation or race-prediction calculations.

Changes:
- Adds daily stage-specific exercise prescriptions with sets/repetitions and execution cues.
- Selects a hamstring, calf/Achilles, knee or general lower-limb exercise pathway from the recorded injury location and symptoms.
- Expands daily check-ins with pain, morning stiffness, walking, stairs, strength tolerance, hopping, exercise completion, running exposure, confidence, swelling and next-morning response.
- Calculates a transparent recovery score and compares observed progress with the original expected trajectory.
- Clearly labels progress as faster than expected, on the expected trajectory or slower than expected.
- Shows the original and current estimated return-to-running dates and how many days the trajectory moved earlier or later.
- Adds a visual expected-versus-observed recovery graph and a seven-day progress summary.
- Generates daily guidance to progress, hold or step back based on symptom and functional response.
- Uses criteria-based stages from protect and settle through return to performance; dates alone do not unlock progression.
- Preserves all existing injury records and check-ins through schema migration to build 9800.
- Keeps rehabilitation data fully independent from plan generation, weekly adaptation, Plan Health and race outlook.
- Retains urgent-assessment red flags and the clear boundary that the app does not diagnose or medically clear an athlete.

Scientific design basis:
The module follows criteria-based return-to-sport principles and symptom/capacity-led progression. Exercise details remain broad guidance because optimal dosage and progression depend on the diagnosis, tissue, severity and individual response.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9800 activates.


Build 9810 fixes injury scoring before the first check-in, gates trajectory comparisons on observed data, adds explicit met/not-met progression criteria, reorders navigation, and improves mobile text containment.
