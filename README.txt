AI Running Coach v10.0.34 Stable — build 10340

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

After upgrading an installed PWA, fully close and reopen it once so cache arc-v1034-stable-10340-premium1 activates. Existing v10.x local data are migrated into schema 10330 and retained under a deterministic primary/mirror storage pair.


UI refinement release
---------------------
- UI-only premium design pass; training, prediction, recovery and injury decision logic is unchanged.
- Cleaner neutral surface system, stronger typography hierarchy, fewer visible borders and more deliberate spacing.
- Mobile navigation is now a persistent bottom navigation bar with the secondary destinations opening above it.
- Today is visually prioritised as the daily briefing, with the scheduled workout and next action carrying the strongest hierarchy.
- Progress uses a calmer race-outlook hero and lower-noise cards instead of full-page warning colours.
- Plan now shows the actual weekly workout schedule first; timeline, adaptation pathways and intensity mix sit in one secondary insights disclosure.
- Injury cards, recovery views, forms, tables and charts share the same quieter design language.
- Accessibility behaviours from v10.0.33 are retained, including focus visibility, reduced-motion handling and chart data tables.

Key release changes retained from v10.0.33
------------------------------------------
- The Today Progress link now opens the full Progress page, and the three mobile summary tiles use aligned label/value rows.
- Today Coach focus now lists the exact training and active injury-recovery actions required for the day.
- Active injury recovery is given clear visual priority without changing either the training-plan or injury-recovery decision logic.
- The former generic execution/readiness tiles are replaced by a compact Progress snapshot showing weekly distance, Pace & Power, Distance & Load, evidence confidence and next review date.
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
