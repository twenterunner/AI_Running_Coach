AI Running Coach v10.6.0 Stable — build 16000

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

After upgrading an installed PWA, fully close and reopen it once so cache arc-v1060-stable-16000-premium1 activates. Existing v10.x local data are migrated into schema 10330 and retained under a deterministic primary/mirror storage pair.


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


v10.6.0 Post-run Coach Update
-----------------------------
After a manual or FIT/CSV run is saved, the app now captures before/after Pace & Power, learned Distance & Load, readiness, race estimate and the next prescribed workout target. It stores an explainable Coach Update with the run and shows Why, What changed, and What this changes next. Editing a run recalculates the update. Existing training, prediction, recovery and plan decision logic is unchanged.


v10.6.0 Post-run prescription impact and mobile modal fix
----------------------------------------------------------
- Post-run Coach Update now compares the next six planned sessions before vs after the saved run.
- It explicitly shows distance, pace and power changes, including unchanged values.
- Future distance is labelled as held until the weekly review when the learned load factor has changed but the plan has not yet been rebuilt.
- Import/review modals are portrait-safe on mobile: the modal body scrolls within the viewport and the final action button remains reachable/sticky above the safe-area inset.


v10.6.0 Weekly pathway commitment
----------------------------------
- Pace & Power and Distance & Load are now treated as weekly-committed learned capabilities.
- Completed runs update Pace & Power provisionally during the week; future pace/power prescriptions stay on the applied factor until the weekly review.
- Distance & Load continues to contribute to the weekly review rather than changing future distances after a single run.
- Post-run Coach Update now shows Applied vs Provisional Pace & Power and projects what upcoming pace/power targets would become if the provisional factor is confirmed.
- Readiness remains an immediate protective modifier and may still reduce an upcoming session before the weekly review.


v10.6.0 Scheduled-activity progression fix
-------------------------------------------
- Optional rehabilitation progression is now generated from the activities actually prescribed for that date, not merely from the overall rehab stage.
- Strength days can only progress scheduled strength work (or the walking target); they can never introduce an unscheduled run.
- Recovery days may only add a small walking progression.
- Impact-assessment days may only add walking; extra impact/jogging is explicitly prohibited.
- Walk-run exposure days may offer one extra interval only because running is scheduled that day.
- Continuous-run days may offer a 5–10% running-time progression only because running is scheduled that day.
- The seven-day calendar, Today's rehabilitation plan and daily check-in all consume the same day-specific optional-progression object.
- Carries forward the v10.0.38 Save analysed run reliability fix.


v10.6.0 Visual Design v2
-------------------------
- Stronger five-item mobile bottom navigation with larger type, icons, active-state tile and touch feedback.
- New brand palette and stronger hierarchy with navy/blue/teal gradients, softer neutral page surfaces, fewer heavy borders and more selective elevation.
- Today is now a true daily briefing. An active injury plan becomes the primary Today hero instead of showing 'No workout scheduled'; scheduled running remains available in a secondary fold-out when relevant.
- Refined typography, cards, controls, dashboard hero and daily information hierarchy.
- Tiny visible revision retained in the header and added to a lightweight footer.
- No training, prediction, recovery, injury or pathway calculation logic changed in this visual release.


v10.6.0 Bottom navigation interaction fix
------------------------------------------
- Fixes mobile bottom-navigation taps after v10.0.40 introduced SVG icons and nested label spans.
- Navigation now resolves the closest button rather than requiring the exact tapped child element to contain data-page.
- Tapping the icon, label, background or any other part of Today, Plan, Log, Progress or More now activates the destination.
- More-menu items use the same robust delegated click handling.


v10.6.0 Coach-first Today
--------------------------
- Today now begins with a consolidated AI Coach Briefing rather than a workout/rehab card.
- The briefing synthesizes race status, target estimate/probability, race time remaining, latest run execution, pain, active rehabilitation, weekly completion, Pace & Power, Distance & Load, readiness and evidence coverage.
- A concise Coach's Call translates the full state into one personalized action for the day.
- Rehab, running plan and progress snapshot are supporting visual cards below the briefing.
- Today's coloured banner uses larger, consistently white typography.
- Added richer visual language across run cards, week cards, progress bars, KPI cards, injury calendar cards and expandable sections.
- No underlying training, injury, recovery, prediction or pathway equations were changed.


v10.6.0 Today simplification and evidence clarity
--------------------------------------------------
- Removed the duplicate Rehab Day hero from Today; rehabilitation is already represented in the supporting Rehabilitation tile below the AI Coach Briefing.
- Removed the Log/Import, This Week and Rehab Plan shortcut buttons from Today because those destinations are already available from the bottom navigation and supporting tiles.
- AI Coach Briefing is now the dominant coloured banner with substantially larger, pure-white typography.
- Replaced confusing '0% evidence' wording with 'Training evidence building' when coverage is zero.
- Added an explanation that training-evidence coverage measures qualifying completed runs, assessments and linked execution evidence used by the race-performance model; it does not represent all information the app knows about the athlete.


v10.6.0: Top header AI Running Coach title is larger, heavier and pure white.


v10.6.0 Coach-perspective separation
-------------------------------------
- Today now presents Today's Coach Briefing: one immediate coaching decision based on today's schedule, active rehabilitation, readiness, recent pain, latest run execution and current-week completion.
- Detailed race probability, pathway calibration and longitudinal strengths/limiters are intentionally omitted from Today unless they materially affect today's action.
- Progress now labels the broader coach section Training Review and keeps the longitudinal race outlook, pathway trends, strengths, limiters, execution trends and strategic priorities.
- Both views continue to use the same underlying coach/athlete-state engine, preventing contradictory coaching while giving each tab a distinct time horizon and purpose.


v10.6.0 Interval FIT intelligence + Weekly Review
--------------------------------------------------
- FIT imports now retain lap summaries and identify likely work repetitions for structured workouts.
- When sufficient lap evidence exists, interval pace and power execution are scored from the identified repetitions instead of whole-run averages.
- Run details show repetition distance, pace, power, HR, execution score, consistency and late-repetition change.
- Plan now includes a first-class Weekly Adaptation Review showing applied/provisional Pace & Power, Distance & Load, readiness, the evidence behind the review and projected next-week prescription effects.
- Weekly pathway commitment rules remain unchanged: learned changes commit at weekly review; acute readiness remains an immediate protective modifier.


v10.6.0 Weekly review pathway clarification
--------------------------------------------
- Weekly Adaptation Review now shows only the two cumulative learned pathways: Pace & Power and Distance & Load.
- Readiness is no longer presented as a third equivalent factor.
- A separate Recovery Context strip shows whether temporary readiness is normal or reducing load.
- The UI explicitly states that recovery context is temporary and does not change learned Distance & Load capability.


v10.6.0 Record-stream interval detection
-----------------------------------------
- Structured-workout interval detection now uses second-by-second FIT pace transitions rather than assuming FIT lap boundaries are workout repetitions.
- FIT lap boundaries remain a fallback inspection source only.
- Imported FIT activities retain a compact record stream so interval detection can be recalculated when the run is matched or edited.
- Detected repetitions are no longer forced to equal the prescribed repetition count; extra repetitions are reported as additional/unplanned load.
- Interval evidence affects execution scoring only at high detection confidence. Moderate/limited detections are displayed but cannot distort the execution score.
- 'CV' is renamed 'Rep consistency' and shown as percentage variation.
- Late-rep pace/power is now written in plain language such as '7.5% faster' rather than a confusing signed percentage.


v10.6.0 Stryd per-repetition power + interval score transparency
-----------------------------------------------------------------
- Raw Stryd developer Power samples are retained instead of being reduced to activity average only.
- When decoded record power is absent, Stryd power samples are aligned to the FIT record stream so detected repetitions receive average running power.
- Exact sample/record counts use one-to-one alignment; small count mismatches use proportional sequence alignment and are reported in import diagnostics.
- Interval pace/power scores now use a true 0–100 scale; the previous arbitrary 45-point metric floor has been removed.
- Only the prescribed repetitions contribute to rep pace/power execution. Extra detected repetitions cannot improve execution.
- Extra reps receive a small prescription-adherence penalty (2 points each, capped at 10) and remain additional training load.
- Missing prescribed reps receive a stronger completion penalty.
- Interval details now include a 'How score is calculated' foldout showing pace, power, base execution and adherence penalties.


v10.6.0 Native + developer FIT record power
--------------------------------------------
- Low-level FIT parsing now reads native Record.power (standard FIT field 7, watts) as well as developer-field Stryd Power.
- One raw power slot is retained per FIT Record message so power can be aligned directly to the second-by-second pace/HR stream.
- Exact raw record alignment is preferred; proportional alignment is only a last-resort fallback.
- Interval analysis now displays Running power stream coverage (powered FIT records / total FIT records) and the recovered source.
- This makes missing per-repetition power diagnosable rather than silently displaying dashes.


v10.6.0 Drift chart FIT-stream repair
--------------------------------------
- Progress now recalculates missing power-based cardiac drift from stored FIT record streams after import.
- Saved v10.0.50 FIT runs with timestamped HR + power can therefore populate drift without being re-imported when the stored record stream is sufficient.
- The drift graph now builds its labels and points only from runs with actual drift values, eliminating orphan dates on an empty chart.
- Removed stale CSV-only guidance; the chart correctly accepts FIT or detailed CSV timestamped HR + running-power data.
- Import preview now explicitly displays the power-based drift candidate.


v10.6.0: Renamed Strength between running exposures to Strength & recovery day; removed WHY THIS IS TODAY'S CALL, the Today-vs-Progress scope footer, and the Progress expand-conclusion instruction.


v10.6.0: Progress Snapshot reordered: Week Distance + Readiness on row 1; Pace & Power + Distance & Load on row 2.


v10.6.0 Readiness Center
-------------------------
- Recovery is now the primary home for Readiness.
- Added explicit HRV and pain contributions, exact temporary modifier, learned Distance & Load factor, and combined effective load context.
- Added a next-session impact example and explicit statement that Pace & Power is not directly multiplied by readiness.
- Added a 14-day Readiness history around the neutral 1.000 baseline.
- Readiness is clearly presented as a temporary recovery overlay rather than a third learned pathway.


v10.6.0 Rehabilitation adherence correction
---------------------------------------------
- Adherence no longer averages only reported check-ins.
- Every past scheduled rehab day is included in the denominator.
- A past scheduled day without a completed execution report contributes 0% and is marked Missed / unreported.
- Partial execution contributes its actual recorded percentage.
- Today remains pending and future days are excluded.
- Rehabilitation adherence now has three tiles: 7 Days, 14 Days and Overall.
- Each tile shows the score plus reported/scheduled-day counts and missed days.
- Added a foldout with the full day-by-day adherence history.


v10.6.0 Workout Intelligence 2.0 + Comparable Runs
--------------------------------------------------
- Major intelligence release; manual FIT/CSV upload remains the intended workflow.
- Added workout-family-specific interpretation for recovery, aerobic/easy, long-run, threshold/tempo, interval and assessment/race sessions.
- Interval analysis uses detected repetitions, completion, consistency and late-rep stability.
- Long-run analysis uses early/middle/late FIT-stream thirds for durability and late-run stability.
- Recovery sessions are judged on recovery specificity rather than speed.
- Aerobic sessions incorporate cardiac drift and personal comparable-run efficiency.
- Threshold sessions inspect sustained power and HR development across the run.
- Added Comparable Run Engine using previous sessions in the same workout family and injury/training context.
- Similarity weights: intensity 32%, duration 27%, distance 18%, pace 13%, exact workout type 10%.
- Up to eight high-similarity historical sessions form the personal baseline.
- Comparable-run confidence is High, Moderate or Low. Low-confidence comparisons remain descriptive and do not imply adaptation evidence.
- Run details now show Workout Intelligence and Comparable Runs before the raw execution calculation.
- Run list shows a compact efficiency-vs-similar-runs badge when comparison confidence is adequate.
- Existing Pace & Power, Distance & Load and Readiness equations are intentionally unchanged in v10.1; the new layer improves observation quality and explanation first.


v10.6.0 Training Decision Engine
--------------------------------
- Added formal Evidence → Interpretation → Decision → Consequence architecture.
- Pace & Power evidence now routes through a confidence-weighted decision signal rather than execution score alone.
- Inputs include workout execution, comparable-run efficiency, physiological cost, completion, pain/safety and evidence confidence.
- Positive performance combined with unusually high physiological cost is treated as conflicting evidence and progression is deliberately damped.
- Low-confidence negative evidence remains protected from unnecessarily reducing established capability.
- Post-run updates expose the integrated signal, confidence weight and conflict handling in a calculation foldout.
- Projected impact at next weekly review is now collapsed by default as a foldout.
- Top three post-run factor tiles use aligned label/value/detail rows.
- Progress includes an Adaptation Decision History audit trail.


v10.6.0 Personal Response Model
-------------------------------
- Added an athlete-specific Personal Response Model under Progress.
- Learns slowly from repeated observations in six areas: volume tolerance, intensity tolerance, long-run tolerance, recovery speed, performance responsiveness and long-run durability signals.
- Volume tolerance compares weekly progression with following-week execution and pain.
- Intensity tolerance evaluates repeated quality-session execution, RPE, drift, pain and subsequent-session response.
- Long-run tolerance uses long-run drift, late-run efficiency, pain and completed distance.
- Recovery speed observes demanding-session → next-recorded-session response within 72 hours.
- Performance responsiveness uses moderate/high-confidence Comparable Run efficiency differences.
- Every dimension displays observation count, evidence maturity, confidence, summary and supporting observations.
- All learned relationships are explicitly described as observational associations rather than causal proof.
- Personal response now contributes a small capped signal (±0.15 maximum) to the Training Decision Engine only when evidence has reached Emerging confidence or better.
- Personalization cannot override pain/safety logic or temporary Readiness.
- Post-run Decision Engine shows the relevant personal-response context when it is mature enough to influence the decision.


v10.6.0 Unified Two-Pathway Decision Engine
-------------------------------------------
- Every completed run now produces two independent learning decisions from one evidence set: Pace & Power and Distance & Load.
- Pace & Power focuses on performance capability: target-section pace/power, comparable-run efficiency, physiological cost and pace-specific personal response.
- Easy and ordinary long-run execution can no longer create a positive speed/capability signal merely because the workout scored well.
- Distance & Load separately evaluates prescribed load completion, run-specific tolerance, long-run late-session stability, pain, execution support and load-specific personal response.
- Distance & Load now has a genuine provisional next-review factor during the week and commits cumulatively at weekly review.
- Readiness remains a separate temporary recovery overlay and is not learned into either pathway.
- Projected weekly-review impact can now show both pace/power changes and projected distance changes.
- Execution scoring is now workout-type specific:
  * Intervals/repetitions: pace and power use detected work repetitions; HR uses later work reps as low-weight supporting evidence; whole-run cardiac drift is not scored; RPE is session-level.
  * Threshold/tempo: detected work sections are preferred; whole-run target pace/power are supporting-only when work sections cannot be isolated; drift is supporting-only.
  * Easy/recovery: whole-run distance, HR and drift are relevant; pace/power are treated as intensity ceilings rather than exact targets.
  * Long run: whole-run distance/HR/drift matter; Workout Intelligence handles early-to-late durability. Specific long runs/race rehearsals prefer detected work sections.
  * RPE is always whole-session; reliability is reduced for substantially incomplete quality workouts to avoid double-penalising incompletion.
- Execution breakdown now explicitly labels the scope used for every metric.


v10.6.0 Evidence acceptance transparency
- Each pathway shows raw evidence, confidence, safeguard/accepted signal, accepted run contribution, weekly bucket, and projected next factor.
- Exact contribution formula is displayed.
- Pace negative Developing-confidence protection is explicitly explained.
- Distance & Load now uses an additive accepted-evidence weekly bucket.


v10.6.0: Fixed accepted Distance & Load run contributions being omitted from the current-week bucket. Simplified post-run pathway UI to Run evidence → Acceptance → This week → Projected next factor; removed duplicate Why/What changed text and repeated numbers.


v10.6.0: Fixed circular JSON save error by removing persisted pathwayTrace/twoPathway objects from coachUpdate. Pathway traces are recomputed on view and contain only plain date/type/contribution rows. Weekly buckets count only non-zero accepted contributions. Post-run UI reduced to Run signal, Accepted into learning, This week, Projected factor, with details behind one foldout.


v10.6.0 Personal-model classification + pathway tile consistency
-----------------------------------------------------------------
- Personal Response Model now classifies uploaded runs by the linked planned workout type when available, rather than relying only on the manually selected imported run type.
- A run linked to an interval or threshold workout therefore counts immediately as one Intensity Tolerance observation.
- Long-run and demanding-session classifications use the linked plan type in the same way.
- Comparable Run Engine also uses the linked planned workout family when available.
- Zero-observation explanations now state what evidence is required.
- Both Pace & Power and Distance & Load acceptance tiles always show confidence level and evidence-weight percentage, even when safeguards reduce the accepted contribution to zero.


v10.6.0: Renamed evidence weight to learning confidence weight; shows analysed vs contributed run counts; calculation details expose base confidence weight and multipliers.


v10.6.0 Information architecture cleanup
-----------------------------------------
- Progress is now the single canonical home for numeric Pace & Power and Distance & Load calibration factors.
- Added Progress → Adaptation panel with applied factor, this-week change, projected factor, since-start change, accepted contributions and pathway history.
- Today removes numeric pathway factors; it shows qualitative fitness calibration, load tolerance and readiness states.
- Plan removes numeric pathway factors and instead shows actual prescription consequences: pace/power target direction, load/distance direction, recovery context and projected workout changes.
- Log removes weekly/projected pathway factors; each uploaded run shows only its run signal, accepted contribution and confidence, with detailed calculation behind a foldout.
- Recovery removes learned Distance & Load and effective-load factor displays; it is now dedicated to temporary Readiness, HRV, pain and prescription impact.
- Numeric pathway calculations are no longer duplicated across Today, Plan, Log and Recovery.


v10.6.0 Progress navigation + duplicate cleanup
-----------------------------------------------
- Fixed "View accumulated adaptation in Progress" from the run dialog: navigation now closes the modal before switching tabs.
- Added anchored navigation so adaptation links land directly on Progress → Adaptation instead of the top of Progress.
- Removed the duplicate Pace & Power / Distance & Load numeric pathway cards from the longitudinal coach review lower on Progress.
- The upper Adaptation panel is now the only numeric pathway summary on Progress; the lower coach review focuses on interpretation, strengths, limiters and next actions.


v10.6.0 Auditable pathway calculations
---------------------------------------
- Both Pace & Power and Distance & Load calculation foldouts now show the complete Run signal equation.
- Each component shows its normalized signal, pathway weight and weighted contribution.
- Pace & Power Run signal = Performance capability ×58% + Comparable-run efficiency ×24% + Physiological cost ×12% + Personal pace response ×6%.
- Distance & Load Run signal = Prescribed load completion ×40% + Load-tolerance response ×38% + Execution support ×14% + Personal load response ×8%.
- The foldout separately shows Run signal → safeguard/Accepted signal → learning-confidence derivation → Accepted contribution.
- Accepted contribution explicitly displays Accepted signal × learning confidence × pathway learning rate.
- Component source evidence remains available in a nested foldout.
- Removed the duplicated accepted-contribution number from the pathway card header.


v10.6.0 Audit & Validation: added internal validation center; fixed linked-plan family use in personal pathway signal; prevented shortened-run load completion from being penalised again at week close; separated evidence-backed concepts from app-specific heuristics; automatic self-calibration remains disabled.


v10.6.0 Execution lineage: pathway calculation foldouts now begin with Execution Breakdown → pathway evidence. Pace & Power lists the exact pace/power/repetition execution components and their normalized effective weights used to create the capability score, then shows capability-score → normalized performance signal. Distance & Load explicitly shows overall execution score → execution-support signal, planned completion → completion signal, and separate tolerance evidence. Calculation chain is now Execution Breakdown → pathway evidence → Run signal → safeguard → confidence → factor contribution.


v10.6.0 Progressive disclosure
-------------------------------
- Post-run pathway cards now default to coach interpretation rather than formulas.
- Level 1 shows Workout evidence, Coach decision and Contribution.
- Level 2 "Why?" shows the execution evidence that drove the pathway decision in plain language.
- Pace & Power lists the relevant execution components and labels their influence.
- Distance & Load shows planned-load completion, overall execution support and load-tolerance evidence separately.
- Level 3 "Show technical calculation" retains the full auditable formulas from v10.5.1.
- Raw Run signal values are no longer prominent in the default view; they remain visible inside Why?/technical detail.


v10.6.0 Pathway presentation consistency
----------------------------------------
- Pace & Power and Distance & Load now use the exact same three-card structure and foldout hierarchy.
- Replaced "Workout evidence" with "What this run suggests".
- Replaced "Coach decision" with "How the model responds".
- Replaced "Contribution" with "Learning contribution".
- Added plain-language Run interpretation and Model response text.
- Both Why? foldouts now use the same Evidence / Observed / Role columns.
- Standardized evidence roles to Primary / Secondary / Supporting rather than mixed wording such as strong, moderate, major and supporting influence.
- Both technical foldouts use the same "Technical calculation" and "Source signal details" labels.


v10.6.0 Pathway wording simplification
--------------------------------------
- Replaced Positive/Conservative pathway labels with athlete-facing progression/caution wording.
- Labels are now: Strong progression signal, Progression signal, Slight progression signal, Supports current level, Slight caution signal, Caution signal, Strong caution signal.
- Removed the duplicate "What this run suggests" tile.
- Removed the duplicate "How the model responds" tile.
- Each pathway card now uses the interpretation once in the card header and retains only the Learning contribution tile.


v10.6.0 Run-detail hierarchy
----------------------------
- Run detail now starts with Workout Intelligence 2.0.
- Comparable Runs / Personal baseline is always shown immediately below Workout Intelligence.
- The two pathway adaptation cards follow those two high-level interpretation cards.
- Interval-level FIT analysis and the detailed Execution Breakdown follow the pathway cards.
- Edit fields remain below the analysis.
- The same hierarchy is used after editing or creating a run, avoiding a different post-save experience.


v10.6.0: removed Today Progress Snapshot, Plan Why and How adaptation affects plan panel; moved interval FIT analysis directly below Workout Intelligence; repetition rows are folded out; Execution Breakdown is collapsed and linked from the green score; harmonized supporting card surfaces.

v10.6.0 Visual simplification
----------------------------
- Added day-of-week labels to Plan workout date cards and HRV chart labels where dates are shown.
- Added a consistent visual icon/accent language for easy, quality, threshold, long, recovery, race and rest sessions.
- Added subtle workout-type accent bars for faster weekly scanning.
- Compressed Workout Intelligence findings into a denser visual grid while preserving the underlying evidence.
- Added compact visual cues to Recovery metrics.
- Removed dead Plan adaptation-rendering code left behind after the panel was removed in v10.5.6.
- Standardized visual hierarchy without changing coaching or adaptation calculations.


v10.6.0 Visual UX Release
-------------------------
- Added consistent SVG visual language across workout types and analysis.
- Workout Intelligence execution score is now a circular gauge and remains the link to Execution Breakdown.
- Interval analysis now shows prescribed/extra/missing repetitions visually and uses compact execution, consistency and late-change bars.
- Comparable Runs now emphasizes current-vs-personal-baseline deltas with visual direction bars.
- Progress pathway cards now use direction arrows, semantic accents and mini sparklines while keeping detailed evidence folded away.
- Today coach briefing now uses compact context chips and a single Next Action rather than repeating recent-run and weekly-volume information.
- Recovery summary is compressed into Recovery / HRV / Baseline / Pain visual indicators.
- Rehab technique cards now show the generated exercise illustrations where a matching exercise exists.
- Removed redundant explanatory text about where numeric factors live.
- All underlying coaching, execution, readiness, pathway and race-prediction calculations remain unchanged.
