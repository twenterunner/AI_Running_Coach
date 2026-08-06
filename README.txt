AI Running Coach v10.0.33 Stable — build 10330

Deployment
----------
Replace only these six application files in the GitHub Pages repository:

- index.html
- app.js
- styles.css
- manifest.webmanifest
- service-worker.js
- README.txt

Retain your existing image assets separately and unchanged. The image references remain exactly as supplied in v10.0.32, including their existing cache-query values. Keep the separately managed icon, favicon, Apple touch icon and social-preview files beside these application files.

After upgrading an installed PWA, fully close and reopen it once so cache arc-v1033-stable-10330 activates. Existing v10.x local data are migrated into schema 10330 and retained under a deterministic primary/mirror storage pair.

Key release changes
-------------------
- Strict boundary validation and field-level errors for runs, imports, assessments, injuries, settings and backups.
- Strict M:SS / H:MM:SS parsing; malformed or ambiguous time values are rejected.
- Deterministic, revision-based storage recovery plus a completed-migration marker that prevents deleted current data from being repopulated by old storage keys.
- Deep backup validation and sanitization with restore preview and one-step rollback.
- Future-dated evidence is excluded from current calculations.
- Partial efficiency evidence is reweighted over available components.
- First-run onboarding, provisional sparse-evidence estimates, Today-first workflow, mobile More navigation and plan-rebuild preview/Undo.
- Accessible labels/errors, dialogs, live messages, current-page navigation and chart data tables.
- Same-origin-only service-worker caching with safe navigation fallback.

FIT import note
---------------
The original Garmin FIT decoder URL is retained because this code-only package contains no third-party or image assets. CSV import and all installed application functions remain local; importing a FIT file requires network access when the decoder has not already been loaded.

Privacy and safety
------------------
Athlete data remain in browser local storage unless the user explicitly downloads a backup or CSV. Coaching and injury guidance are decision support, not diagnosis or emergency care.
