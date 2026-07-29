AI Running Coach v9.2.0 Stable — build 9200

Changes in this release
- Reworked prediction updates so an appropriately completed training run cannot make established race capability slower.
- Every normal training run now either maintains the central prediction or earns a small improvement.
- Assessments and races remain direct performance evidence and can move the capability estimate in either direction.
- Run duration now affects the earned training benefit through completion versus the planned stimulus.
- Extra duration is capped so the model does not reward unnecessary overtraining.
- A substantially shortened run or a pain rating of 5/10 or higher maintains the current prediction and changes recovery/confidence instead of removing fitness.
- Existing prediction history is rebuilt once under prediction model version 2.
- Updated app.js, index.html, styles.css, manifest.webmanifest, service-worker.js and README.txt to build 9200.

Deployment
Replace all six files in the GitHub Pages repository and retain the existing icon files. After deployment, fully close and reopen the browser or installed PWA so cache build 9200 activates.
