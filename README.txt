AI Running Coach v9.9.1 Stable — build 9910

This release changes only the Injury tab and its supporting injury data model.

Injury-tab changes:
- Blank pain and function fields remain unknown instead of becoming zero or positive evidence.
- Progression criteria now show Met, Not met or Not assessed.
- Rehabilitation stage progression requires repeated stable check-ins rather than one isolated observation.
- Higher-risk patterns in the leading differential pause app-directed progression.
- Pattern matching is shown qualitatively instead of as an unvalidated diagnostic probability.
- Clinician-entered diagnoses can use a clinician-provided recovery duration and are not independently verified by the app.
- Adds rehabilitation families for hamstring, other muscle strains, tendons, knee, ankle, foot, bone-stress concern and neural/exertional patterns.
- Replaces a single exact recovery date with an estimated recovery window and staged milestones.
- Moves the daily check-in action to the top and collapses detailed rationale, diagnosis and progress sections.
- Keeps all non-Injury calculations, plans, predictions, tabs and workflows unchanged.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9910 activates.
