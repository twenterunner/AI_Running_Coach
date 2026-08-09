AI Running Coach v10.0.41 Stable — build 10410

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

After upgrading an installed PWA, fully close and reopen it once so cache arc-v1041-stable-10410-premium1 activates. Existing v10.x local data are migrated into schema 10330 and retained under a deterministic primary/mirror storage pair.


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


v10.0.41 Post-run Coach Update
-----------------------------
After a manual or FIT/CSV run is saved, the app now captures before/after Pace & Power, learned Distance & Load, readiness, race estimate and the next prescribed workout target. It stores an explainable Coach Update with the run and shows Why, What changed, and What this changes next. Editing a run recalculates the update. Existing training, prediction, recovery and plan decision logic is unchanged.


v10.0.41 Post-run prescription impact and mobile modal fix
----------------------------------------------------------
- Post-run Coach Update now compares the next six planned sessions before vs after the saved run.
- It explicitly shows distance, pace and power changes, including unchanged values.
- Future distance is labelled as held until the weekly review when the learned load factor has changed but the plan has not yet been rebuilt.
- Import/review modals are portrait-safe on mobile: the modal body scrolls within the viewport and the final action button remains reachable/sticky above the safe-area inset.


v10.0.41 Weekly pathway commitment
----------------------------------
- Pace & Power and Distance & Load are now treated as weekly-committed learned capabilities.
- Completed runs update Pace & Power provisionally during the week; future pace/power prescriptions stay on the applied factor until the weekly review.
- Distance & Load continues to contribute to the weekly review rather than changing future distances after a single run.
- Post-run Coach Update now shows Applied vs Provisional Pace & Power and projects what upcoming pace/power targets would become if the provisional factor is confirmed.
- Readiness remains an immediate protective modifier and may still reduce an upcoming session before the weekly review.


v10.0.41 Scheduled-activity progression fix
-------------------------------------------
- Optional rehabilitation progression is now generated from the activities actually prescribed for that date, not merely from the overall rehab stage.
- Strength days can only progress scheduled strength work (or the walking target); they can never introduce an unscheduled run.
- Recovery days may only add a small walking progression.
- Impact-assessment days may only add walking; extra impact/jogging is explicitly prohibited.
- Walk-run exposure days may offer one extra interval only because running is scheduled that day.
- Continuous-run days may offer a 5–10% running-time progression only because running is scheduled that day.
- The seven-day calendar, Today's rehabilitation plan and daily check-in all consume the same day-specific optional-progression object.
- Carries forward the v10.0.38 Save analysed run reliability fix.


v10.0.41 Visual Design v2
-------------------------
- Stronger five-item mobile bottom navigation with larger type, icons, active-state tile and touch feedback.
- New brand palette and stronger hierarchy with navy/blue/teal gradients, softer neutral page surfaces, fewer heavy borders and more selective elevation.
- Today is now a true daily briefing. An active injury plan becomes the primary Today hero instead of showing 'No workout scheduled'; scheduled running remains available in a secondary fold-out when relevant.
- Refined typography, cards, controls, dashboard hero and daily information hierarchy.
- Tiny visible revision retained in the header and added to a lightweight footer.
- No training, prediction, recovery, injury or pathway calculation logic changed in this visual release.


v10.0.41 Bottom navigation interaction fix
------------------------------------------
- Fixes mobile bottom-navigation taps after v10.0.40 introduced SVG icons and nested label spans.
- Navigation now resolves the closest button rather than requiring the exact tapped child element to contain data-page.
- Tapping the icon, label, background or any other part of Today, Plan, Log, Progress or More now activates the destination.
- More-menu items use the same robust delegated click handling.
