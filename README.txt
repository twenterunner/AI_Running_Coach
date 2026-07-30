AI Running Coach v9.4.1 Stable — build 9410

This release makes the Dashboard calibration pathways consistent with the Plan tab.

Changes:
- Replaces the mixed four-tile athlete-state strip with two matching pathway cards shown side by side.
- Shows current and in-progress factors for both Pace & Power and Distance & Load.
- Uses the same factor precision and terminology as the corresponding Plan pathway.
- Keeps recovery and pain context inside the Distance & Load pathway rather than presenting them as unrelated calibration tiles.
- Adds a direct link from the Dashboard assessment to the detailed pathway calculations on the Plan tab.
- Updates schema, manifest and service-worker cache to build 9410.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9410 activates.
