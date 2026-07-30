AI Running Coach v9.3.7 Stable — build 9370

Changes in this release
- Replaces the nearly permanent “Pending review” card with the finalised current-week adjustment factor.
- Keeps that current factor visible and active for the entire training week.
- Shows the next review date and the date from which the next finalised factor applies.
- Clarifies that evidence accumulates during the week while current-week completion is not penalised before week close.
- Adds pain as an explicit numeric Weekly Plan Adjustment input, resolving the prior wording/calculation inconsistency.
- Recovery now shows the combined quantified contribution from Garmin HRV and pain.
- The weekly calculation continues to use only existing app inputs: completed load, efficiency, cardiac drift, Garmin HRV and pain.
- Updates schema, manifest and service-worker cache to build 9370.

Weekly display behaviour
- During Week N, the card shows the finalised factor that is actively controlling Week N.
- The next review remains open in the background and is finalised after the last day of Week N.
- At the start of Week N+1, the newly finalised factor becomes the visible current-week factor and remains visible for that full week.
- Therefore, a final result is not shown only briefly between two “Pending review” states.

Deployment
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9370 activates.
