AI Running Coach v9.8.9 Stable — build 9890

This release improves only the Injury tab and leaves all running-plan, recovery, assessment, race and dashboard calculations unchanged.

Changes:
- Restores the established tab order: Dashboard, Today, Plan, Runs, Assessments, Recovery, Injury, Race day, Settings.
- Colour-codes rehabilitation completion using red, amber and green thresholds.
- Restores the observed-versus-nominal recovery progress graph in the Injury tab.
- Removes the large blue explanatory block from the Injury tab.
- Shows only one Add injury control, and hides it once an injury is active.
- Always produces a clearly labelled working diagnosis from the entered mechanism, location and symptoms when no clinician diagnosis is supplied.
- Adds transparent rehabilitation completion, nominal comparison, functional blockers and full-unrestricted-training forecast.
- Explains the forecast using injury severity, elapsed time, pain, walking, strength, impact, running exposure and next-morning response.
- Adds daily focus and detailed written exercise guides with purpose, selection rationale, step-by-step technique, pain rules and progression criteria.
- Expands daily check-ins with confidence, altered gait and new swelling/bruising.
- Keeps Injury data independent from plan generation and race prediction.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9890 activates.


Build 9890 fixes:
- Keeps the expanded Projected Fitness explanation and calculation inside its tile on narrow screens.
- Corrects banner, runtime, manifest and cache version mismatches.
- Leaves all prediction calculations and non-layout functionality unchanged.
