AI Running Coach v10.0.12 Stable — build 10120

This release changes only the Injury tab and its supporting injury check-in logic.

Injury check-in consistency update:
- Related fields synchronise immediately while the user edits the form.
- Positive running minutes automatically create a completed running exposure unless the user explicitly records symptom-limited stopping.
- A completed run cannot coexist with a walk/run target marked not planned, not started or symptom-stopped.
- A symptom-stopped run automatically sets the walk/run target to symptom-stopped.
- Unable to start clears running details and records the planned walk/run target as not started.
- A run that was not planned remains neutral and can coexist with a completed walking target.
- Achieving the optional stretch goal requires completion of the applicable planned components.
- Completion remains separate from tolerance: pain and altered gait can limit progression even when the target was completed.
- The form displays a live plain-language interpretation before saving.
- Calendar badges, adherence, running-capacity evidence and recovery rationale use the same saved execution states.
- Existing injury records and older check-ins remain compatible.
- No non-Injury calculations, plans, predictions, tabs or workflows were changed.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA so cache build 10120 activates.
