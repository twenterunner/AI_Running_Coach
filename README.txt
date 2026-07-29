AI Running Coach v9.1.1 Stable — build 9110

Changes in this release
- Fixed pain evidence detection. A supplied 0–10 pain rating is now recognised independently of plan matching and the due-workout window.
- Added evidence-weighted prediction updates. Easy and recovery runs can move the central estimate only slightly; long runs, quality sessions, assessments and races have progressively greater influence.
- Added per-activity change caps to prevent one ordinary run from causing an implausibly large prediction swing.
- Added an explanation to the latest prediction update showing evidence quality, update weight, applied change and cap.
- HRV and pain continue to affect recovery and training adaptation; they do not directly manufacture a race-time change.
- Updated schema, version labels, manifest and service-worker cache to v9.1.1 build 9110.

Deployment
Replace all six files in the GitHub Pages repository and retain the existing icon files. After deployment, fully close and reopen the browser or installed PWA so cache build 9110 activates.
