AI Running Coach v10.0.22 Stable — build 10220

This release changes only the Injury tab and its supporting check-in logic.

Fixes:
- The daily check-in now reads the exact prescription object already displayed for that date in the seven-day rehabilitation calendar.
- The check-in plan title, walking duration, exercise list, running/impact status and optional stretch goal therefore use one source of truth.
- A stretch-goal question is shown only when the plan explicitly contains stretchGoalOffered: true.
- “Stretch goal unavailable” and “No stretch goal” days automatically store the stretch component as not planned and exclude it from scoring.
- A save-time consistency guard prevents a stretch result from being stored when no stretch goal was planned.
- Historical check-ins continue to use their saved prescription snapshot when edited.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA so cache build 10220 activates.

Build 10220 Injury-module consistency update:
- Today's exercise technique guides are derived from the exact same daily prescription object used by the seven-day calendar and date-specific check-in.
- Impact-assessment guides now match quiet jogging in place and controlled double-leg hops.
- A prescription consistency validator removes any guide that is not present in that day's prescribed activities.
