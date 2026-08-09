AI Running Coach v10.0.53 Stable — build 10530

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

After upgrading an installed PWA, fully close and reopen it once so cache arc-v1053-stable-10530-premium1 activates. Existing v10.x local data are migrated into schema 10330 and retained under a deterministic primary/mirror storage pair.


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


v10.0.53 Post-run Coach Update
-----------------------------
After a manual or FIT/CSV run is saved, the app now captures before/after Pace & Power, learned Distance & Load, readiness, race estimate and the next prescribed workout target. It stores an explainable Coach Update with the run and shows Why, What changed, and What this changes next. Editing a run recalculates the update. Existing training, prediction, recovery and plan decision logic is unchanged.


v10.0.53 Post-run prescription impact and mobile modal fix
----------------------------------------------------------
- Post-run Coach Update now compares the next six planned sessions before vs after the saved run.
- It explicitly shows distance, pace and power changes, including unchanged values.
- Future distance is labelled as held until the weekly review when the learned load factor has changed but the plan has not yet been rebuilt.
- Import/review modals are portrait-safe on mobile: the modal body scrolls within the viewport and the final action button remains reachable/sticky above the safe-area inset.


v10.0.53 Weekly pathway commitment
----------------------------------
- Pace & Power and Distance & Load are now treated as weekly-committed learned capabilities.
- Completed runs update Pace & Power provisionally during the week; future pace/power prescriptions stay on the applied factor until the weekly review.
- Distance & Load continues to contribute to the weekly review rather than changing future distances after a single run.
- Post-run Coach Update now shows Applied vs Provisional Pace & Power and projects what upcoming pace/power targets would become if the provisional factor is confirmed.
- Readiness remains an immediate protective modifier and may still reduce an upcoming session before the weekly review.


v10.0.53 Scheduled-activity progression fix
-------------------------------------------
- Optional rehabilitation progression is now generated from the activities actually prescribed for that date, not merely from the overall rehab stage.
- Strength days can only progress scheduled strength work (or the walking target); they can never introduce an unscheduled run.
- Recovery days may only add a small walking progression.
- Impact-assessment days may only add walking; extra impact/jogging is explicitly prohibited.
- Walk-run exposure days may offer one extra interval only because running is scheduled that day.
- Continuous-run days may offer a 5–10% running-time progression only because running is scheduled that day.
- The seven-day calendar, Today's rehabilitation plan and daily check-in all consume the same day-specific optional-progression object.
- Carries forward the v10.0.38 Save analysed run reliability fix.


v10.0.53 Visual Design v2
-------------------------
- Stronger five-item mobile bottom navigation with larger type, icons, active-state tile and touch feedback.
- New brand palette and stronger hierarchy with navy/blue/teal gradients, softer neutral page surfaces, fewer heavy borders and more selective elevation.
- Today is now a true daily briefing. An active injury plan becomes the primary Today hero instead of showing 'No workout scheduled'; scheduled running remains available in a secondary fold-out when relevant.
- Refined typography, cards, controls, dashboard hero and daily information hierarchy.
- Tiny visible revision retained in the header and added to a lightweight footer.
- No training, prediction, recovery, injury or pathway calculation logic changed in this visual release.


v10.0.53 Bottom navigation interaction fix
------------------------------------------
- Fixes mobile bottom-navigation taps after v10.0.40 introduced SVG icons and nested label spans.
- Navigation now resolves the closest button rather than requiring the exact tapped child element to contain data-page.
- Tapping the icon, label, background or any other part of Today, Plan, Log, Progress or More now activates the destination.
- More-menu items use the same robust delegated click handling.


v10.0.53 Coach-first Today
--------------------------
- Today now begins with a consolidated AI Coach Briefing rather than a workout/rehab card.
- The briefing synthesizes race status, target estimate/probability, race time remaining, latest run execution, pain, active rehabilitation, weekly completion, Pace & Power, Distance & Load, readiness and evidence coverage.
- A concise Coach's Call translates the full state into one personalized action for the day.
- Rehab, running plan and progress snapshot are supporting visual cards below the briefing.
- Today's coloured banner uses larger, consistently white typography.
- Added richer visual language across run cards, week cards, progress bars, KPI cards, injury calendar cards and expandable sections.
- No underlying training, injury, recovery, prediction or pathway equations were changed.


v10.0.53 Today simplification and evidence clarity
--------------------------------------------------
- Removed the duplicate Rehab Day hero from Today; rehabilitation is already represented in the supporting Rehabilitation tile below the AI Coach Briefing.
- Removed the Log/Import, This Week and Rehab Plan shortcut buttons from Today because those destinations are already available from the bottom navigation and supporting tiles.
- AI Coach Briefing is now the dominant coloured banner with substantially larger, pure-white typography.
- Replaced confusing '0% evidence' wording with 'Training evidence building' when coverage is zero.
- Added an explanation that training-evidence coverage measures qualifying completed runs, assessments and linked execution evidence used by the race-performance model; it does not represent all information the app knows about the athlete.


v10.0.53: Top header AI Running Coach title is larger, heavier and pure white.


v10.0.53 Coach-perspective separation
-------------------------------------
- Today now presents Today's Coach Briefing: one immediate coaching decision based on today's schedule, active rehabilitation, readiness, recent pain, latest run execution and current-week completion.
- Detailed race probability, pathway calibration and longitudinal strengths/limiters are intentionally omitted from Today unless they materially affect today's action.
- Progress now labels the broader coach section Training Review and keeps the longitudinal race outlook, pathway trends, strengths, limiters, execution trends and strategic priorities.
- Both views continue to use the same underlying coach/athlete-state engine, preventing contradictory coaching while giving each tab a distinct time horizon and purpose.


v10.0.53 Interval FIT intelligence + Weekly Review
--------------------------------------------------
- FIT imports now retain lap summaries and identify likely work repetitions for structured workouts.
- When sufficient lap evidence exists, interval pace and power execution are scored from the identified repetitions instead of whole-run averages.
- Run details show repetition distance, pace, power, HR, execution score, consistency and late-repetition change.
- Plan now includes a first-class Weekly Adaptation Review showing applied/provisional Pace & Power, Distance & Load, readiness, the evidence behind the review and projected next-week prescription effects.
- Weekly pathway commitment rules remain unchanged: learned changes commit at weekly review; acute readiness remains an immediate protective modifier.


v10.0.53 Weekly review pathway clarification
--------------------------------------------
- Weekly Adaptation Review now shows only the two cumulative learned pathways: Pace & Power and Distance & Load.
- Readiness is no longer presented as a third equivalent factor.
- A separate Recovery Context strip shows whether temporary readiness is normal or reducing load.
- The UI explicitly states that recovery context is temporary and does not change learned Distance & Load capability.


v10.0.53 Record-stream interval detection
-----------------------------------------
- Structured-workout interval detection now uses second-by-second FIT pace transitions rather than assuming FIT lap boundaries are workout repetitions.
- FIT lap boundaries remain a fallback inspection source only.
- Imported FIT activities retain a compact record stream so interval detection can be recalculated when the run is matched or edited.
- Detected repetitions are no longer forced to equal the prescribed repetition count; extra repetitions are reported as additional/unplanned load.
- Interval evidence affects execution scoring only at high detection confidence. Moderate/limited detections are displayed but cannot distort the execution score.
- 'CV' is renamed 'Rep consistency' and shown as percentage variation.
- Late-rep pace/power is now written in plain language such as '7.5% faster' rather than a confusing signed percentage.


v10.0.53 Stryd per-repetition power + interval score transparency
-----------------------------------------------------------------
- Raw Stryd developer Power samples are retained instead of being reduced to activity average only.
- When decoded record power is absent, Stryd power samples are aligned to the FIT record stream so detected repetitions receive average running power.
- Exact sample/record counts use one-to-one alignment; small count mismatches use proportional sequence alignment and are reported in import diagnostics.
- Interval pace/power scores now use a true 0–100 scale; the previous arbitrary 45-point metric floor has been removed.
- Only the prescribed repetitions contribute to rep pace/power execution. Extra detected repetitions cannot improve execution.
- Extra reps receive a small prescription-adherence penalty (2 points each, capped at 10) and remain additional training load.
- Missing prescribed reps receive a stronger completion penalty.
- Interval details now include a 'How score is calculated' foldout showing pace, power, base execution and adherence penalties.


v10.0.53 Native + developer FIT record power
--------------------------------------------
- Low-level FIT parsing now reads native Record.power (standard FIT field 7, watts) as well as developer-field Stryd Power.
- One raw power slot is retained per FIT Record message so power can be aligned directly to the second-by-second pace/HR stream.
- Exact raw record alignment is preferred; proportional alignment is only a last-resort fallback.
- Interval analysis now displays Running power stream coverage (powered FIT records / total FIT records) and the recovered source.
- This makes missing per-repetition power diagnosable rather than silently displaying dashes.


v10.0.53 Drift chart FIT-stream repair
--------------------------------------
- Progress now recalculates missing power-based cardiac drift from stored FIT record streams after import.
- Saved v10.0.50 FIT runs with timestamped HR + power can therefore populate drift without being re-imported when the stored record stream is sufficient.
- The drift graph now builds its labels and points only from runs with actual drift values, eliminating orphan dates on an empty chart.
- Removed stale CSV-only guidance; the chart correctly accepts FIT or detailed CSV timestamped HR + running-power data.
- Import preview now explicitly displays the power-based drift candidate.


v10.0.53: Renamed Strength between running exposures to Strength & recovery day; removed WHY THIS IS TODAY'S CALL, the Today-vs-Progress scope footer, and the Progress expand-conclusion instruction.


v10.0.53: Progress Snapshot reordered: Week Distance + Readiness on row 1; Pace & Power + Distance & Load on row 2.
