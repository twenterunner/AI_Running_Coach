AI Running Coach v10.0.2 Stable — build 10020

This release changes only the Injury tab and its supporting injury presentation logic.

Injury-tab changes:
- Today’s rehabilitation plan is generated from the exact same day object used by the first tile in the rolling seven-day calendar.
- Today’s walking target, exercises, stretch goal, rationale and adjustment rule therefore cannot contradict the calendar.
- Today’s rehabilitation plan is positioned directly above the seven-day calendar.
- Detailed exercise technique remains in a separate Exercise guides section below the calendar.
- Clinical reasoning, likely contributors, prevention and the rehabilitation-vs-self-management decision are now placed in a collapsed fold-out.
- Check-in and rehabilitation completion statuses remain separate.
- No non-Injury calculations, plans, predictions, tabs or workflows were changed.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA so cache build 10020 activates.
