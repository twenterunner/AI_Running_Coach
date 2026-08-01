AI Running Coach v10.0.0 Stable — build 10000

This release changes only the Injury tab and its supporting injury data model.

Injury clinical-reasoning update:
- Adds structured symptom, timing, footwear, recurrence, focal-tenderness, hopping, neurological and load-change questions.
- Uses structured evidence, contradiction penalties and region constraints to rank compatible patterns.
- Adds a lateral plantar muscle overload / footwear-compression pattern for short-lived cramp-like outer-sole symptoms.
- Independently cross-checks clinician-entered diagnoses instead of automatically accepting them.
- Explains likely contributors, prevention, and whether formal rehabilitation or self-management is appropriate.
- Generates targeted follow-up questions when the current evidence cannot separate leading diagnoses.
- Removes the View label from seven-day rehabilitation calendar tiles.
- Keeps all non-Injury calculations, tabs and workflows unchanged.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA so cache build 10000 activates.
