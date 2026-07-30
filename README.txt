AI Running Coach v9.4.0 Stable — build 9400

This release makes the two weekly-adjustment pathways fully consistent.

Changes:
- Uses factors for both Pace & Power and Distance & Load instead of mixing percentages and factors.
- Shows Current factor and In-progress factor prominently in both pathway cards.
- Pace & Power shows the rounded applied factor beside the raw evidence factor that is still accumulating.
- Distance & Load shows the current-week applied factor beside the provisional next-review factor.
- Moves the calculation constituents into matching fold-out sections for both pathways.
- Displays each Pace & Power evidence event as a factor contribution.
- Displays each Distance & Load constituent as a factor contribution.
- Keeps all underlying adaptation, recovery, injury and execution logic unchanged.
- Updates schema, manifest and service-worker cache to build 9400.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9400 activates.
