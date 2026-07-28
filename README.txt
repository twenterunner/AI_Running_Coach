AI Running Coach v8.5.0 Stable — build 8500
================================================

INSTALL / UPDATE
----------------
Upload every file from this package to the root of the GitHub Pages repository, replacing the existing files. Do not upload only app.js: index.html, styles.css, manifest.webmanifest and service-worker.js must remain on the same build.

After GitHub Pages deploys, open the site once in the browser. v8.5 uses network-first loading and cache build 8500. If the installed PWA remains open, close and reopen it once.

DATA SAFETY AND FIELD-POPULATION FIX
------------------------------------
- Continues reading the established arc_v62_web storage key used by earlier stable versions.
- Searches compatible legacy/mirror keys and selects the copy containing the most user data.
- Creates an untouched pre-migration safety copy under arc_pre8500_backup before conversion.
- Writes every successful save to both arc_v62_web and arc_v8500_web.
- Normalises each setup field individually; one missing or invalid value can no longer blank the complete settings form.
- Preserves runs, assessments, training-day selections and compatible plan history.
- Shows an Upgrade & data integrity report in Settings.
- Records storage, migration and rendering errors in Phone diagnostics.

v8.5 COACHING FEATURES
-----------------------
- Scientifically explicit warm-up, quality work, between-repetition recoveries, cooldown and total-distance accounting.
- Workout validation engine with safe fallback sessions when a generated prescription fails validation.
- Plan Health checks workout arithmetic, dates, IDs, enabled days, race-week logic and targets.
- Coach Intelligence explains Why this workout, Why this amount and What if skipped.
- Existing dashboard, Stryd CSV import, assessment, adaptive factor, readiness and race-day features remain available.

BACKWARDS COMPATIBILITY
-----------------------
The app deliberately retains the original arc_v62_web key so an update installed over v8.3.3 or earlier reads the existing browser data rather than creating an apparently empty profile.

FILES CHANGED
-------------
app.js
index.html
styles.css
service-worker.js
manifest.webmanifest
README.txt
