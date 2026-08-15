AI Running Coach v13.7.30 — rehab shoe selection persistence fix — build 30730

- Fixes edited rehab shoe selections appearing to revert to the planned/default pair.
- Root cause 1: opening today's rehab check-in from Today or the generic Injury check-in action opened a fresh form instead of today's already-saved check-in, so the shoe selector was pre-populated from the planned recommendation again.
- Root cause 2: plannedRehabShoeId() prioritised plannedRehabShoes over the shoe actually stored in a completed check-in.
- Today's existing check-in is now reopened in edit mode when present.
- A completed check-in's rehabShoeId is authoritative for that date and overrides the planned/default shoe.
- Saving an edited check-in explicitly persists the selected rehabShoeId before shoe-ledger reconciliation.
- Planned/default rehab shoe selection is used only where no completed check-in shoe exists.
- No training, rehabilitation progression, prediction, readiness, recovery, pathway or scoring equations changed.
- Schema remains 10400.

AI Running Coach v13.7.30 — shoe lifecycle + rehab mileage integrity — build 30730

- A matching logged run is now authoritative for the entire rehab locomotion session. The rehab check-in adds zero duplicate shoe mileage, preventing one physical session from being split across two shoes.
- Portfolio-optimised mileage diverted to another physical pair is removed from the original pair projection.
- The graph rationale now explicitly enforces a hard physical-pair lifecycle rule: no pair may be intentionally planned beyond its model-specific replacement threshold; optimisation can reallocate workouts but cannot extend wear life.
- With the user-entered baselines of 298 km Novablast 4 and 42 km Superblast 3, a single 4 km logged session assigned to the Superblast resolves to 298 km and 46 km respectively, provided there are no other logged activities/manual adjustments.

AI Running Coach v13.7.30 — physical-pair lifecycle rollover — build 30730

- Fixes the lifecycle bug that could project a proposed future training pair beyond 1,350 km.
- Every future graph curve now represents one physical pair.
- At the model-specific planned replacement threshold, remaining training/rehab demand rolls onto another fresh physical pair.
- Successive future physical pairs are distinguished in the legend and graph-event rationale.
- The separate Race Day pair remains protected by its target mileage/familiarisation window.
- No training, rehabilitation progression, readiness, prediction, pathway, or scoring equations changed.

AI Running Coach v13.7.30 — cross-source rehab/run mileage deduplication — build 30730

- Fixes a remaining shoe-ledger integrity gap where the same physical rehab running exposure could be represented once in a rehab check-in and again as a normal logged/imported run.
- Same-day rehab running is matched conservatively against logged runs using duration and/or distance agreement. When matched, the run component is counted only through the logged run; the rehab check-in contributes only any separate walking component.
- A new rehab check-in prefers the shoe already attached to a matching same-day logged run before falling back to the planned rehab shoe.
- The check-in UI states when running mileage is already represented in Log and therefore excluded from the rehab mileage contribution.
- Existing rehab usage is rebuilt from saved check-ins during reconciliation, so duplicate cross-source mileage is repaired automatically.
- No training, rehabilitation progression, prediction, readiness, recovery, pathway or scoring equations changed.
- Schema remains 10400.

AI Running Coach v13.7.30 — atomic rehab shoe usage — build 30730

- A completed rehabilitation check-in now creates exactly one shoe-usage record for exactly one selected physical pair.
- Walking and running components remain separately auditable inside that record, but their combined distance is credited to the same shoe.
- This removes ambiguity from the previous two-record walk/run representation and prevents one rehab session from being distributed across different physical pairs.
- Existing rehab shoe usage is regenerated from saved check-ins during reconciliation, so old split component records are replaced automatically.
- Missing distances continue to be estimated at 10:00/km walking and 6:30/km rehabilitation running; explicit distances remain authoritative.
- No training, rehabilitation progression, prediction, readiness, recovery, pathway or scoring equations changed.
- Schema remains 10400.

AI Running Coach v13.7.30 — rehab shoe-mileage estimation fix — build 30730

- Fixes rehab sessions with minutes but no explicit distance incorrectly contributing 0 km to shoe mileage.
- Root cause: Number(null) was interpreted as 0 and then treated as a measured distance.
- A rehab distance is now treated as measured only when the user actually supplied a distance value.
- Otherwise the existing Shoes-only estimates are used: walking at 10:00/km and rehab running at 6:30/km.
- Already-saved rehab check-ins are repaired automatically on reconciliation because shoeUsage is derived again from the saved check-in minutes.
- No training, rehab progression, prediction, readiness, recovery, pathway or scoring equations changed.
- Schema remains 10400.

AI Running Coach v13.7.30 — shoe planner render hotfix — build 30730

- Fixes the blank/unresponsive app introduced in v13.7.22.
- Root cause: the new portfolio shoe-purchase optimiser called a workout-fit scoring helper that was scoped only inside the shoe-chart renderer, causing a runtime ReferenceError during normal rendering.
- The optimiser now uses a globally scoped, side-effect-free scoring helper.
- Portfolio-wide replacement optimisation from v13.7.22 remains enabled.
- No training, rehabilitation, prediction, readiness, recovery, pathway or scoring equations changed.
- Schema remains 10400.

AI Running Coach v13.7.30 — portfolio-optimised shoe purchasing — build 30730

- Future shoe replacements are now optimised across the whole rotation rather than independently per shoe.
- When two proposed purchases fall within 49 days, the engine tests whether the first replacement pair is a strong equipment-fit substitute for compatible workouts assigned to the second rotation slot.
- It only redistributes mileage when the substitute fit remains high; workout suitability stays primary.
- If at least 12 km can be safely redistributed and the second purchase can be delayed by at least 21 days, the later purchase date, graph, purchase countdown and rationale are updated.
- Graph event explanations explicitly identify portfolio optimisation and show the original date, delayed date, mileage shifted and which pair absorbs it.
- Race Day lifecycle planning remains separate and protected; training purchases are not delayed at the expense of the Race Day target window.
- No training, rehab, prediction, readiness, pathway, scoring or recovery calculations changed.

AI Running Coach v13.7.30 — visible shoe-mileage confirmation — build 30730

- After saving a rehabilitation check-in with a selected shoe, the app immediately confirms the shoe name, previous mileage, new mileage and net contribution from that rehab session.
- The same immediate mileage confirmation is shown after manual runs, imported runs and edited runs when a shoe is selected.
- The underlying auditable shoe-usage ledger remains the source of truth; the confirmation is derived from the reconciled ledger after save.
- Shoe totals, graph history, replacement timing and race-day projections continue to refresh immediately from the new actual mileage.
- No training, prediction, pathway, recovery, readiness or rehabilitation progression equations changed.

AI Running Coach v13.7.30 — immediate shoe-mileage refresh after activity save — build 30730

- Saving or editing a logged run immediately reconciles the shoe-usage ledger and invalidates all Shoes projections/caches.
- Saving or editing a rehabilitation check-in immediately records measured/estimated walking/running shoe mileage and refreshes the shoe engine.
- Deleting a run or rehabilitation check-in immediately removes its shoe-mileage contribution and refreshes projections.
- Future shoe assignments, replacement timing, race-day planning and the lifecycle graph therefore restart from the new actual accumulated mileage on the next render.
- No training-plan, prediction, pathway, recovery, readiness or rehabilitation progression equations changed.

AI Running Coach v13.7.30 — completed-day rehab freeze + future-only shoe projection — build 30730

- Once today's rehabilitation check-in exists, today's displayed rehabilitation prescription remains the pre-check-in prescription that was actually completed; recalculated rehabilitation prescriptions begin from tomorrow.
- The Shoes forward rehabilitation projection likewise excludes today after today's check-in has been saved. Today's shoe exposure comes only from the completed check-in/ledger; future estimated rehab mileage starts tomorrow.
- Future rehab days continue to update dynamically from the new rehabilitation state.
- No training-plan, prediction, pathway, recovery, readiness or rehabilitation progression equations changed.

AI Running Coach v13.7.30 — linked shoe-graph lifecycle events — build 30730

- Adds numbered, colour-coded graph markers linked one-to-one with material Training plan, Rehab plan and Shoe rotation explanation cards.
- Cause colours are independent from physical-pair curve colours: blue = rehab, teal = training, amber = rotation.
- Only material slope/rotation events are annotated to keep the graph readable.


- Each active shoe card now shows a concrete next-pair purchase recommendation: proposed replacement model, buy-by date, days remaining, and planned kilometres remaining until that purchase date.
- Separates the acquisition deadline from the planned handover/replacement date so the runner has time to receive and introduce the new pair before the outgoing shoe reaches its programme-driven replacement range.
- Uses programme-driven replacement timing when the remaining training/rehab plan crosses the shoe replacement range; otherwise falls back to the existing usage-based forecast with confidence shown.
- Existing replacement-range, lifecycle graph, race-day planning, rehab shoe mileage and all locked training/recovery/injury calculations remain unchanged.
- VERSION 13.7.30 · BUILD 30730 · SCHEMA 10400.
- Repository remains flat.

AI Running Coach v13.7.13 — auditable shoe-curve drivers — build 30713

- Shoe lifecycle graph now classifies material allocation/slope changes as Training plan, Rehab plan, or Shoe rotation.
- Adds concise rationale cards below the graph explaining the date, affected physical pair, and why its planned mileage rate changes.
- Every physical-pair curve now has its own legend entry, including all owned pairs, future training replacements and any future Race Day pair.
- Uses a deliberately high-contrast curve palette so physical pairs are visually distinguishable; future/replacement/race line styles remain distinct as a second cue.
- Graph remains based on solid logged mileage through today and dashed/dotted planned mileage from today through Race Day.
- No training-plan, rehabilitation, prediction, pathway, recovery, injury or scoring calculation changed.
- Schema remains 10400; repository remains flat.

AI Running Coach v13.7.12 — startup render hotfix — build 30712

- Fixes the blank app shell introduced in v13.7.10.
- Root cause: the new planned-shoe assignment cache used a block-scoped declaration below the startup save/reconciliation call; cache invalidation therefore hit the temporal dead zone and stopped JavaScript before navigation/Today rendering.
- Changes the cache storage to startup-safe function-scope initialization while retaining the v13.7.10 performance optimizations.
- No training, prediction, pathway, recovery, injury, rehabilitation, scoring, import or plan-generation calculations changed.
- Schema remains 10400.
- Repository remains flat.

AI Running Coach v13.7.10 — Shoes performance regression fix — build 30710

- Fixes a performance regression introduced by forward rehabilitation-distance integration into the Shoes engine.
- Future rehabilitation shoe exposure is now calculated once per relevant app state and reused across shoe recommendations instead of rebuilding up to 120 rehabilitation days inside each shoe/workout scoring pass.
- Planned shoe assignment lookup is indexed rather than repeatedly scanning the complete assignment array.
- Automatic future-shoe assignments are skipped when their relevant state has not changed.
- The hidden Shoes page no longer rebuilds its large lifecycle DOM while another tab is active; it refreshes fully when Shoes is opened.
- Shoe recommendation, mileage, rehabilitation-distance, lifecycle and race-day logic are unchanged; this release changes computation reuse only.
- Existing training, prediction, pathway, recovery, injury, rehabilitation and scoring functions are unchanged.
- Repository remains flat.

AI Running Coach v13.7.9 — race-distance shoe choice + rehab shoe forecasting — build 30709

- Removes the redundant purchase-plan tile from the Shoes page; future purchases remain represented in lifecycle planning/graph and the add-shoe proposal flow.
- Adds a Shoes section recommending which currently owned pair is best for a 5 km, 10 km, half marathon and marathon if raced today.
- Future rehabilitation walking/running distance is estimated conservatively and included in shoe planned-mileage, replacement and lifecycle projections; it remains Shoes-only and does not affect rehabilitation or training calculations.
- Rehab days with walking/running now propose an existing shoe automatically; that proposal pre-populates the daily rehabilitation check-in and remains user-changeable.
- Existing logged rehab mileage remains authoritative for past dates; future rehab mileage is explicitly model-estimated.
- VERSION/BUILD/cache identifiers updated; schema remains 10400.
- Repository remains flat.

AI Running Coach v13.7.8 — proposed purchase catalogue + rehab-day shoe planning — build 30708

- Add Running Shoe now lists every current lifecycle proposal in one dropdown: training replacements and the dedicated Race Day pair, not only saved race purchases.
- Selecting a proposal pre-fills its ASICS model/generation and links the actual purchased pair to that proposal. Buying a different shoe remains supported and immediately recalculates the future rotation around what is actually owned.
- Race Day planning includes a Future Purchases view covering proposed training replacements as well as the Race Day pair, with purchase timing, purpose and rationale.
- Rehabilitation days that prescribe walking or running now show a Shoe selector in Today’s rehab focus and in the expanded 7-day rehabilitation calendar. The planned rehab shoe is copied into the daily check-in by default and remains changeable there.
- Rehab shoe planning is equipment-only and does not alter injury stage, rehabilitation prescription, readiness, load, pathway or race prediction logic.
- Schema remains 10400; repository remains flat.

AI Running Coach v13.7.7 — shoe-plan synchronization and graph clarity — build 30707

Changes in v13.7.7:
- Simplified lifecycle graph: solid past from logged/observed shoe mileage, dashed future from today using current training-plan shoe assignments.
- Removed per-curve enable/disable controls and reduced graph annotation clutter.
- Proposed purchases can be selected directly when adding a shoe; matching purchases are integrated into the existing plan, while a different purchase causes the plan to recalculate around the actual shoe.
- Plan workout expansion now explains why the suggested shoe is recommended.
- Active Rotation cards now state what each shoe is best at.
- Shoes tab surfaces aligned to the approved Today teal card hierarchy.


- Mileage/lifecycle graph now represents physical pairs: owned shoes only appear from purchase/tracking start; proposed training and race pairs only appear from proposed purchase dates.
- Prevents one physical pair from simultaneously appearing as a worn training shoe and a separate fresh Race Day shoe.
- If the preferred owned race-capable pair is planned for replacement before Race Day, a new Race Day pair is planned instead.
- Race Day pair familiarisation remains backward-planned from Race Day.
- Graph typography enlarged and chart card now uses the approved Today Level-1 teal surface.
- Removed the Today “Why this shoe?” disclosure; compact shoe recommendation remains.
- Training, prediction, recovery, injury, pathway, scoring and plan-generation logic unchanged.
- Schema remains 10400.
- Repository remains flat.

AI Running Coach v13.7.5 — optimal race-day shoe lifecycle strategy — build 30705

- Corrects the race-day lifecycle graph so an owned race-capable shoe that is projected to be too worn is no longer shown as the intended Race Day pair.
- Current shoes now stop at their programme-driven replacement point; proposed training replacements carry later training mileage.
- A separate planned Race Day pair is introduced when the current race-capable pair would be outside the desired race-day mileage window.
- Race-day familiarisation is selected backwards from Race Day using the latest suitable race-specific workouts, rather than forward from today, to avoid unnecessary early mileage.
- Planned Race Day mileage targets the middle of the modelled desired window rather than merely its lower edge.
- The lifecycle chart labels training replacements and the Race Day pair separately so the full current → replacement → race-day configuration is visible.
- No training-plan, prediction, recovery, injury, pathway, scoring or plan-generation calculation is changed.
- Schema remains 10400 and repository remains flat.

AI Running Coach v13.7.4 — race-day shoe strategy lifecycle graph — build 30704

- Replaces the competing plan-driven vs usage-rate markers in the Shoes lifecycle graph with one plan-driven replacement rule.
- The lifecycle chart now always shows the intended race-day shoe strategy, including a future race shoe that has not yet been purchased.
- Race-day target mileage is shown as a right-edge Race Day target zone rather than a misleading programme-wide horizontal band.
- Current shoe lines stop at their planned replacement; proposed replacement pairs start at 0 km and inherit only later workouts.
- Proposed race-shoe familiarisation is plotted through the configured Race Day, with projected race-day mileage and target window stated above the graph.
- Graph labels/axes use larger mobile-readable type and replacement wording is simplified to “Planned replacement”.
- No training, prediction, recovery, injury, rehabilitation, pathway, scoring, plan-generation or import calculations changed.
- Schema remains 10400. Repository remains flat.

AI Running Coach v13.7.3 — shoe lifecycle chart race-date + target clarity — build 30703

- Makes the Shoes lifecycle chart explicitly end at the configured race date and prints the full race-day date including year.
- Enlarges chart axes, lifecycle-marker, replacement, target-band and legend text for phone readability.
- Replaces the ambiguous “nominal replacement” wording with “usage-rate estimate”; plan-driven replacement is the actual assigned-workout threshold crossing, while the usage-rate estimate is only a secondary weekly-rate comparison.
- Adds a visible desired race-shoe mileage band to the graph and identifies the intended/proposed race shoe and target mileage window.
- Clarifies that an outgoing trainer line ends at replacement; the proposed new pair then starts from 0 km and receives later assigned workouts, so high outgoing mileage is not interpreted as race-day shoe mileage.
- Replacement and race-day labels now include the year, avoiding January/April ambiguity across calendar years.
- No training, prediction, recovery, injury, pathway, scoring, import, plan-generation or schema logic changed.
- Schema remains 10400. Repository remains flat.

AI Running Coach v13.7.2 — shoe plan visibility + race-day target + lifecycle chart clarity — build 30702

- Adds the planned/proposed shoe directly to every non-rest daily Plan tile, visible before expanding the workout. Manual selections are labelled Selected shoe; automatic assignments Planned shoe; immediate model-only suggestions Proposed shoe.
- Adds a prominent Desired race-day situation card in Shoes showing the target shoe/model, desired race-day mileage window, current projected race-day mileage and familiarisation intent.
- Reworks the Shoes lifecycle chart so outgoing shoes stop accumulating planned mileage once their plan-driven replacement point is reached; the proposed replacement pair then inherits the remaining assigned mileage. This avoids double-counting the outgoing and replacement pair on the visual forecast.
- Adds distinct nominal replacement-date markers from the usage-rate forecast alongside the plan-driven replacement markers. Dates after race day are explicitly labelled as after race.
- Increases graph axis, marker and legend typography for phone readability and adds a Why does this graph look like this? foldout with shoe-specific dynamic rationale.
- Fixes Today shoe-card spacing so the shoe pictogram no longer intrudes into the shoe name/copy and aligns the equipment row with the existing tile hierarchy.
- No training, plan-generation, prediction, pathway, recovery, injury, rehabilitation or workout-scoring calculation was changed. Schema remains 10400.
- Repository remains flat.

AI Running Coach v13.7.1 — Shoes programme mileage + lifecycle timeline — build 30701

- Replaces the Shoes mileage-history view with a programme-wide actual-versus-planned cumulative mileage chart through race day.
- Solid lines show observed accumulated mileage through today; dashed lines start from each shoe’s current real mileage and add its current future plan assignments through race day.
- Adds approximate replacement markers directly to the timeline. Planned threshold crossings are preferred; the existing usage-rate forecast is used only when planned assignments do not establish the crossing date.
- Adds lifecycle callouts naming the shoe being replaced and proposing the most appropriate current/recent ASICS replacement model for the same role.
- Proposed replacement pairs are also projected from their replacement point to race day using the future workouts that would transfer from the outgoing pair.
- When the race-day lifecycle engine recommends an additional race shoe, its proposed familiarisation mileage is shown through race day as a separate planned line/callout.
- Race day and Today are explicit timeline references. Individual shoe visibility toggles remain available.
- Existing Shoes ledger, recommendations, race-day planning and purchase planning remain intact.
- No schema change. Existing training, prediction, pathway, recovery, injury, rehabilitation, scoring and plan-generation engines are unchanged.
- Repository remains flat.

AI Running Coach v13.7.0 — complete Shoes lifecycle and race-day planning module — build 30700

- Adds an offline-first serious-runner Shoes module inside More while preserving the five-item primary bottom navigation.
- Adds additive schema 10400 structures: shoes, shoeUsage, plannedShoeAssignments and plannedShoePurchases. Existing schema-10330 data migrates without renaming or reinterpreting existing fields.
- Mileage is ledger-derived from starting mileage, linked run usage, rehabilitation walking/running usage and explicit manual adjustments; no mutable total is used as source of truth.
- Run edits, deletions and shoe changes propagate through the ledger without duplicate mileage. Retired shoes retain historical dependencies and stop appearing in recommendations.
- Injury/Rehab check-ins can record the shoe used. Explicit rehab distance is used when entered; otherwise walking is estimated at 4.8 km/h and slow rehab running at 7.5 km/h. Estimated values are labelled and remain Shoes-only data.
- Built-in local ASICS neutral catalogue covers current and recent GEL-NIMBUS, GEL-CUMULUS, NOVABLAST, SUPERBLAST, MEGABLAST, SONICBLAST, MAGIC SPEED, METASPEED SKY/EDGE/RAY, NOOSA TRI, GEL-PULSE, EVORIDE and related neutral models plus relevant TR variants. Stability lines such as GEL-KAYANO, GT-2000 and GT-1000 are not classified as neutral.
- Official ASICS positioning is stored separately from app-derived practical suitability scores and recommendation logic. Unknown shoes remain supported through user-entered surface/role/cushioning/ride information.
- Adds workout-specific recommendation profiles, rotation balancing, recent-use/wear penalties, race-shoe preservation and race-only filtering for Race/Race Day recommendations.
- Adds cumulative shoe-mileage history, replacement ranges, future-plan usage forecasts, condition feedback and replacement timing based first on planned assignments and then recent actual usage.
- Adds a race-day lifecycle planner that works backward from race day: desired condition → familiarisation exposure → suitable existing workouts → first use → purchase window.
- Race-shoe readiness is explicitly separate from athlete race readiness. The module can recommend no purchase, familiarisation of an existing shoe, or a model-derived future ASICS purchase with a purchase window and projected race-day mileage.
- Future auto-assignments are recalculated chronologically so projected wear and specialised-shoe preservation influence later recommendations without changing the training plan.
- Adds compact Shoes integration to Today, expanded Plan workouts, FIT/CSV/manual run review, logged-run detail and Injury/Rehab check-ins. Existing training, prediction, pathway, recovery, injury and scoring engines remain unchanged.
- Mobile layouts are constrained to the existing teal Level-1/2/3 visual system and avoid page-level horizontal scrolling.
- Repository remains completely flat.

AI Running Coach v13.6.7 — Rest pictogram clarification — build 30607

- Replaces the previous ambiguous Rest pictogram with a simple crescent-moon + Z/sleep symbol.
- The same Rest concept is used consistently for both the larger workout pictogram and compact workout-type icon.
- Existing semantic/status colour inheritance is preserved.
- No calculations, wording, layout, chart, interaction, navigation, plan or rehab logic changed.
- All previous fixes are retained.
- Repository remains flat.

AI Running Coach v13.6.6 — Plan race-range labels + mobile rebuild modal — build 30606

- Plan race-context labels changed from “Likely 70% time range” and “Likely 70% pace range” to “Likely time range” and “Likely pace range”.
- Underlying range calculations and displayed values are unchanged.
- Plan rebuild preview modal is now constrained to the actual dynamic mobile viewport (100dvh), scrolls internally when needed, respects the bottom safe area, and keeps actions within screen width.
- On very narrow or short screens the action buttons stack vertically to prevent clipping.
- No plan-generation logic, calculations, approved Plan hierarchy, charts or other app behaviour changed.
- All previous pictogram and rehabilitation-trajectory corrections retained.
- Repository remains flat.

AI Running Coach v13.6.5 — rehabilitation trajectory calculation/visual alignment — build 30605

- Corrects a visual inconsistency in Observed versus nominal progression.
- The interpretation already compares observed completion against nominal completion at the current elapsed day: nominal = elapsed / nominalTotal × 100.
- The graph had incorrectly scaled its X-axis to max(nominalTotal, updated predicted total). When the updated prognosis was longer than nominal, this lowered the plotted nominal line at Today and visually understated how far behind nominal the athlete was.
- The rehabilitation trajectory X-axis now represents the original nominal recovery pathway from injury (0%) to nominal unrestricted training (100%).
- The nominal line therefore reaches exactly the same nominal percentage at Today as the text/calculation uses.
- Adds a small dashed vertical gap at Today plus a hollow nominal point, making the observed-versus-nominal separation directly visible without adding text over the data.
- Phase headings remain in their dedicated label band and cannot interfere with plot lines or datapoints.
- No injury completion, stage, diagnosis, prognosis, check-in, recovery or other model/data calculations changed.
- Unique run-type pictograms from v13.6.4 are retained.
- Repository remains flat.

AI Running Coach v13.6.4 — unique run-type pictograms + rehab trajectory correction — build 30604

- Every generated run/workout type now has its own dedicated simple SVG pictogram; run types no longer share a generic quality, shoe, recovery or race pictogram.
- Pictograms remain simple symbols rather than stick figures and retain inherited semantic/status colour behaviour.
- Rehabilitation trajectory labels now sit in a dedicated band above the plotting area so labels cannot overlap the nominal line, observed line or datapoints.
- The nominal rehabilitation line now always runs from the start of phase 1 to the end of phase 6, independent of the observed/forecast horizon.
- Existing rehabilitation observations, stage logic, trajectory calculations, status logic and all other model/data calculations are unchanged.
- No approved card hierarchy, wording, interaction, navigation or responsive behaviour changed.
- Repository remains flat.

AI Running Coach v13.6.3 — simplified pictogram system — build 30603

- Replaces the v13.6.2 stick-figure / pseudo-anatomical pictograms with simple symbolic SVGs.
- No human stick figures are used.
- Uses immediately recognisable symbols such as running shoe, heart/ECG, medical cross, warning/pain mark, flag, calendar, recovery arrow and load bars.
- Preserves the existing semantic colour/status behaviour: icon geometry identifies the subject; inherited colour communicates status.
- Workout-type pictograms remain SVG-based but use simple symbols rather than human figures.
- Navigation pictograms are simplified for fast recognition at 20–24 px.
- Only pictogram artwork and minimal icon-centering CSS changed.
- No calculations, data, thresholds, wording, hierarchy, card layout, charts, interactions, navigation behaviour, foldouts or responsive logic changed.
- Repository remains flat.

AI Running Coach v13.6.2 — realistic pictogram/icon refinement — build 30602

- Reworked the shared SVG pictogram family to be more immediately recognisable at mobile size.
- Running-related icons now use runner/shoe/body geometry rather than abstract arrows, diamonds, clocks or text glyphs where practical.
- Injury/pain uses a two-arm/two-leg human figure with a localised pain marker.
- Rehabilitation combines a recognisable lower-limb rehabilitation form with the existing medical/recovery cue.
- Recovery/rest uses a resting-athlete/bench form; race uses runner + finish flag; training load combines runner + load bars.
- Heart/readiness retains physiological ECG context.
- Replaced text-symbol workout-type markers with SVGs from the same visual family.
- Refined navigation icons for Log, Progress, Recovery, Injury and Race Day.
- Existing semantic status colour logic is preserved; SVGs continue to inherit the existing status/card classes.
- Only icon artwork and minimal icon-specific optical-alignment CSS changed. No calculations, data, thresholds, wording, hierarchy, layout, charts, interactions, navigation behaviour, foldouts or responsive logic changed.
- Repository remains flat.

AI Running Coach v13.6.1 — full GUI QA and reliability pass — build 30601

- Removes the stale Injury-only CSS `order` rules that were overriding the visible section numbers.
- Injury/Rehab sections are now explicitly sorted by the number displayed in each section-number circle, so the current numbering is the source of truth for tile order.
- Aligns the visible header/footer revision, app VERSION/BUILD constants, manifest, cache-busters and service-worker cache to v13.3.8 build 30370.
- No rehabilitation calculations, progression logic, storage schema, or locked Today/Plan/Log/Progress/Recovery content changed.

AI Running Coach v13.3.7 — Injury section order follows section numbers — build 30361

- Injury & Rehab sections are displayed strictly in their existing numeric order.
- No section content, calculation, rehabilitation logic, or locked-tab behaviour changed.


- Reorders Injury & Rehab around a serious runner workflow: status → programme → progression criteria → trajectory → symptoms → function/return-to-run → adherence → training impact → assessment → history.
- Moves “What this means now” into Rehabilitation Status as a supporting tile rather than a separate numbered section.
- Renumbers Injury/Rehab sections consistently.
- No rehabilitation calculation, progression, prescription, storage, or data-model logic changed.
- Today, Plan, Log, Progress and Recovery implementation remains untouched.

AI Running Coach v13.3.5 — Injury rehab section order + copy cleanup — build 30350

- Removes the explanatory rehabilitation-status/check-in paragraph below the 7-day rehabilitation calendar.
- Swaps the visible section numbering so Rehabilitation Status is section 2 and Rehabilitation Programme is section 3.
- No calculation, rehabilitation progression, storage, or non-Injury tab logic changed.

- Injury/Rehab exercise cards no longer use exercise images or pictograms. Tapping an exercise row expands its existing textual technique, dose, purpose, muscle-area and progression information.
- Observed versus nominal progression phase bands now span the full usable graph width, while the observed and nominal time-series calculations remain unchanged.
- Changes are scoped to Injury/Rehab presentation. Today, Plan, Log, Progress and Recovery are unchanged.
- No rehabilitation, injury, prediction, pathway, recovery, plan, scoring, import, storage or other data-model calculations were changed.

AI Running Coach v13.3.3 — Injury surface + trajectory width correction — build 30330

- Injury & Rehab Level-1 cards now use the exact approved Today primary gradient, border and radius.
- Injury nested Level-2 surfaces now use the Today nested surface treatment.
- Injury Level-3 disclosures use one consistent dark disclosure treatment.
- Observed versus nominal progression now uses essentially the full SVG width (8 px plotting inset per side instead of the prior 48/18 px gutter).
- No rehabilitation calculations or data-model logic changed.
- Today, Plan, Log, Progress and Recovery presentation code was not edited.

AI Running Coach v13.3.2 — Injury visual refinement — build 30320

- Injury-only visual refinement: Today-style teal surfaces, larger rehabilitation phase labels, and realistic exercise reference PNG integrated into exercise image viewing.
- Today, Plan, Log, Progress and Recovery remain locked.
- No calculation/data-model changes.

AI Running Coach v13.3.1 — Injury refinement — build 30310

v13.3.1
-------
- Injury Assessment (section 10) now appears first, followed immediately by Rehabilitation Programme (section 5); the remaining sections retain their established sequence.
- Observed versus nominal progression now visibly segments and labels all six existing rehabilitation phases without changing stage logic or trajectory calculations.
- Injury Level-2 cards now use the same approved teal-gradient surface language as the preceding runner dashboard tiles.
- Corrected Injury typography/spacing, including block separation between eyebrow labels, values and symptom text.
- Added flat PNG technique illustrations for every exercise currently referenced by the rehabilitation exercise-image map; exercise cards remain tappable for enlarged viewing.
- All changes are Injury-scoped presentation/assets plus version/cache identifiers. Today, Plan, Log, Progress and Recovery remain unchanged. No calculation or data-model logic changed.

AI Running Coach v13.3.1 — Injury & Rehab serious-runner rebuild — build 30301

v13.3.1
-------
- Today, Plan, Log, Progress and Recovery are frozen against v13.3.1 build 30301.
- Injury & Rehab rebuilt around rehabilitation status, runner interpretation, trajectory, progression criteria, today/7-day programme, symptom progression, functional/return-to-run progression, adherence, training impact, clinical context and history.
- Injury styling is scoped under #injury and follows the approved Today-led Level-1/2/3 surface, typography, spacing and semantic-colour hierarchy.
- Existing injury prediction, stage progression, criteria, prognosis, adherence, diagnosis, return-to-running and storage calculations are unchanged.
- New symptom and function charts only visualise existing check-in observations; missing observations remain missing.
- Multiple assessed injuries remain supported; one active plan controls rehabilitation while parallel assessments stay separated.
- Repository remains completely flat.

AI Running Coach v13.3.1 — Recovery visual consistency refinement — build 30301

v13.3.1
-------
- Removed the Recovery page subtitle requested after the v13.2.0 redesign.
- Recovery section-number circles now exactly match the Progress section-number dimensions and responsive sizing.
- Baseline-building / insufficient-evidence copy is neutral white rather than status-coloured; the word “building” is no longer classified as a warning state.
- Today, Plan, Log and Progress remain frozen. No model or calculation logic changed.

AI Running Coach v13.2.0 — Recovery serious-runner rebuild — build 30200

v13.2.0
-------
- Today, Plan, Log and Progress are frozen against v13.1.18 build 30118. Their page markup and render functions are unchanged.
- Recovery rebuilt from scratch using the approved Today visual hierarchy and only existing recovery/readiness data.
- New Recovery hierarchy: current status; recovery drivers; HRV vs personal baseline; pain/physical restriction; training absorption; load vs recovery; temporary readiness vs learned Distance & Load; recovery history; concise interpretation.
- Recovery surfaces reuse Today primary teal gradient, nested dark surfaces, typography, spacing, foldout and semantic status language.
- HRV and readiness charts are Recovery-scoped, mobile SVGs with data-driven Y-axis scaling and explicit baseline/reference lines.
- Personal Response Model recovery speed, volume tolerance, intensity tolerance and long-run tolerance are surfaced as observational evidence only.
- Missing HRV/pain/history are shown as missing/baseline-building states rather than zero.
- No race, plan, pathway, readiness, HRV, pain, injury, import, scoring, storage or other calculation/data-model logic changed.

AI Running Coach v13.1.18 — Progress section 7 removed — build 30118

v13.1.18
- Removed Progress section 07: Recovery vs Training.
- No changes to Today, Plan, Log, or Progress sections 01–06.

AI Running Coach v13.1.17 — Progress chart autoscaling and pathway labels — build 30117

v13.1.17 Progress chart autoscaling and pathway clarity
--------------------------------------------------------
- All Progress Y-axes now autoscale from the values actually displayed, including target/reference series.
- Weekly distance and long-run charts use data-driven non-negative scales rather than fixed maxima.
- Race-readiness time scale auto-ranges around race estimate plus target with runner-readable 15-minute ticks.
- Efficiency factor auto-ranges around observed values; aerobic durability auto-ranges while retaining zero because drift sign is meaningful.
- Full pathway history now auto-ranges around observed Pace & Power / Distance & Load factors and the 1.000 baseline instead of a fixed 0.94–1.06 window.
- Adaptation decision history now writes Pace & Power and Distance & Load in full instead of the cryptic P and L abbreviations.
- No calculation, scoring, prediction, pathway or data-model equations changed.

v13.1.13 Progress canonical Today-style root fix
------------------------------------------------
- Removed the accumulated v13.1.x Progress CSS override stack and replaced it with one scoped canonical Progress design block.
- Progress Level-1 cards now use the exact locked Today primary gradient, border and 18 px radius.
- Progress Level-2 metric surfaces use the same compact nested treatment as Today; Level-3 disclosures use the same dark disclosure treatment.
- Progress card heading, eyebrow, supporting-text and metric typography now mirror Today runner-card typography.
- Chart cards no longer inherit canvas/min-height spacers: legacy canvases are removed from layout and each card height is content-driven by its title, legend and 640x226 SVG chart.
- Horizontal overflow is constrained to the Progress page without changing Today, Plan or Log.
- Today, Plan and Log markup and render functions are unchanged. No calculation/data-model logic changed.


- Longitudinal Training Review now sits directly between Race Readiness and Fitness & Capability.
- Progress chart cards shrink to their chart content and no longer show the View chart summary and data foldouts.
- Level-1 Progress cards use the exact locked Today teal gradient and border; level-2 and level-3 surfaces use matching nested/disclosure treatments.
- Progress is constrained to the viewport to prevent horizontal page scrolling.
- Today, Plan and Log rendering/calculation logic remain unchanged.

AI Running Coach v13.1.8 — Progress chart and mobile-navigation repair — build 30108

- Restored all Progress charts to the proven canvas renderer; race-readiness, weekly-distance and long-run charts no longer disappear behind an empty teal surface.
- Aerobic durability and efficiency charts again render one valid observation as a real point; zero observations use the explicit baseline-building state.
- Added a matching teal level-2 container behind the four Fitness & Capability metric tiles.
- Removed Fitness Assessments from the visible navigation while retaining the underlying assessment data/model support.
- Hardened the mobile bottom navigation against Android browser visual-viewport changes so it remains fully visible while scrolling and browser chrome expands/collapses.
- Progress-only visual changes; Today, Plan and Log are unchanged. No calculation, prediction, pathway, recovery, injury, import, storage or data-model logic changed.


AI Running Coach v13.1.3 — Progress chart and mobile spacing correction — build 30103

Progress-only GUI correction. Today, Plan and Log remain frozen to approved v13.0.6 build 30006. Calculation/data-model logic unchanged.
Repository remains completely flat.

- Fixed Projected fitness tile/foldout hierarchy and wrapping.
- Target margin now uses a centred faster/target/slower diverging scale with semantic colour.
- Single valid efficiency/drift observations remain visible; zero-data charts use compact baseline states.
- Race readiness always renders genuine start/current/model-history evidence instead of a blank chart.
- Fixed Progress KPI, pathway, evidence and interpretation text spacing on 360–430 px screens.
- Standardised gaps between Progress tiles/cards.

AI Running Coach v13.1.2 — Progress visual alignment — build 30102

Progress-only GUI release. Today, Plan and Log remain frozen to approved v13.0.6 build 30006. Calculation/data-model logic unchanged.
Repository remains completely flat.

AI Running Coach v13.0.6 — Serious Runner Plan — build 30006


v13.1.2 Progress visual alignment

- Progress surfaces now use the same teal gradient, nested tile, typography and foldout language as the approved Today, Plan and Log tabs.
- Progress header pictogram now exactly reuses the bottom-navigation Progress icon geometry.
- Trend charts no longer show blank or misleading single-point canvases; fewer than two historical/comparable observations produce an explicit baseline-building state instead.
- Comparable-run metric summaries use mobile metric cards rather than a squeezed five-column table.
- Progress validation/scientific tiles have explicit label/value spacing to prevent concatenated text.
- Changes are scoped to #dashboard; Today, Plan and Log remain unchanged. No calculation or data-model logic changed.
------------------------------------
- Corrected FIT import-preview metric typography and spacing so labels, values and supporting notes cannot concatenate on narrow mobile screens.
- Added explicit scoped styling for the post-save “What this run changes” view so both pathway blocks use the same visual hierarchy and spacing.
- “Supports current level” now always uses the same neutral headline colour in both Pace & Power and Distance & Load. Card/badge semantic colour still reflects the accepted learning contribution where applicable.
- Changes are limited to Log presentation plus version/cache identifiers; Today, Plan, Progress and all calculation/data-model logic are unchanged.

Deployment
----------
Replace these six flat application files in the repository root:

- index.html
- app.js
- styles.css
- manifest.webmanifest
- service-worker.js
- README.txt

Keep all existing exercise images, icons, favicons and social-preview images beside these files. No subfolders are introduced.

Version 12.0 GUI rebuild
------------------------
- Complete mobile-first frontend design-system rebuild; this is not a restyle of the previous GUI.
- Frozen calculation/data engines retained: prediction, plan generation, pathways, recovery, injury, scoring, imports, storage and validation equations are unchanged.
- New coherent surface, spacing, typography, button, disclosure, icon and chart language across all screens.
- Today is action-first; Plan is week-first with one-workout-at-a-time disclosure; Log uses visual run summaries; Progress is a race-readiness dashboard; Recovery leads with readiness; Injury/Rehab prioritises stage, today and exercises.
- All existing chart data sources are retained with responsive canvases and accessible data-table fallbacks.
- Exercise images remain real tappable images with the existing enlarged viewer.
- Five-item bottom navigation retained with a compact More menu for secondary destinations.
- Version/cache identifiers moved to v12.0.0 / build 20000.

FIT import note
---------------
The original Garmin FIT decoder URL is retained because this code-only package contains no third-party or image assets. CSV import and all installed application functions remain local; importing a FIT file requires network access when the decoder has not already been loaded.

Privacy and safety
------------------
Athlete data remain in browser local storage unless the user explicitly downloads a backup or CSV. Coaching and injury guidance are decision support, not diagnosis or emergency care.


v10.6.1 Post-run Coach Update
-----------------------------
After a manual or FIT/CSV run is saved, the app now captures before/after Pace & Power, learned Distance & Load, readiness, race estimate and the next prescribed workout target. It stores an explainable Coach Update with the run and shows Why, What changed, and What this changes next. Editing a run recalculates the update. Existing training, prediction, recovery and plan decision logic is unchanged.


v10.6.1 Post-run prescription impact and mobile modal fix
----------------------------------------------------------
- Post-run Coach Update now compares the next six planned sessions before vs after the saved run.
- It explicitly shows distance, pace and power changes, including unchanged values.
- Future distance is labelled as held until the weekly review when the learned load factor has changed but the plan has not yet been rebuilt.
- Import/review modals are portrait-safe on mobile: the modal body scrolls within the viewport and the final action button remains reachable/sticky above the safe-area inset.


v10.6.1 Weekly pathway commitment
----------------------------------
- Pace & Power and Distance & Load are now treated as weekly-committed learned capabilities.
- Completed runs update Pace & Power provisionally during the week; future pace/power prescriptions stay on the applied factor until the weekly review.
- Distance & Load continues to contribute to the weekly review rather than changing future distances after a single run.
- Post-run Coach Update now shows Applied vs Provisional Pace & Power and projects what upcoming pace/power targets would become if the provisional factor is confirmed.
- Readiness remains an immediate protective modifier and may still reduce an upcoming session before the weekly review.


v10.6.1 Scheduled-activity progression fix
-------------------------------------------
- Optional rehabilitation progression is now generated from the activities actually prescribed for that date, not merely from the overall rehab stage.
- Strength days can only progress scheduled strength work (or the walking target); they can never introduce an unscheduled run.
- Recovery days may only add a small walking progression.
- Impact-assessment days may only add walking; extra impact/jogging is explicitly prohibited.
- Walk-run exposure days may offer one extra interval only because running is scheduled that day.
- Continuous-run days may offer a 5–10% running-time progression only because running is scheduled that day.
- The seven-day calendar, Today's rehabilitation plan and daily check-in all consume the same day-specific optional-progression object.
- Carries forward the v10.0.38 Save analysed run reliability fix.


v10.6.1 Visual Design v2
-------------------------
- Stronger five-item mobile bottom navigation with larger type, icons, active-state tile and touch feedback.
- New brand palette and stronger hierarchy with navy/blue/teal gradients, softer neutral page surfaces, fewer heavy borders and more selective elevation.
- Today is now a true daily briefing. An active injury plan becomes the primary Today hero instead of showing 'No workout scheduled'; scheduled running remains available in a secondary fold-out when relevant.
- Refined typography, cards, controls, dashboard hero and daily information hierarchy.
- Tiny visible revision retained in the header and added to a lightweight footer.
- No training, prediction, recovery, injury or pathway calculation logic changed in this visual release.


v10.6.1 Bottom navigation interaction fix
------------------------------------------
- Fixes mobile bottom-navigation taps after v10.0.40 introduced SVG icons and nested label spans.
- Navigation now resolves the closest button rather than requiring the exact tapped child element to contain data-page.
- Tapping the icon, label, background or any other part of Today, Plan, Log, Progress or More now activates the destination.
- More-menu items use the same robust delegated click handling.


v10.6.1 Coach-first Today
--------------------------
- Today now begins with a consolidated AI Coach Briefing rather than a workout/rehab card.
- The briefing synthesizes race status, target estimate/probability, race time remaining, latest run execution, pain, active rehabilitation, weekly completion, Pace & Power, Distance & Load, readiness and evidence coverage.
- A concise Coach's Call translates the full state into one personalized action for the day.
- Rehab, running plan and progress snapshot are supporting visual cards below the briefing.
- Today's coloured banner uses larger, consistently white typography.
- Added richer visual language across run cards, week cards, progress bars, KPI cards, injury calendar cards and expandable sections.
- No underlying training, injury, recovery, prediction or pathway equations were changed.


v10.6.1 Today simplification and evidence clarity
--------------------------------------------------
- Removed the duplicate Rehab Day hero from Today; rehabilitation is already represented in the supporting Rehabilitation tile below the AI Coach Briefing.
- Removed the Log/Import, This Week and Rehab Plan shortcut buttons from Today because those destinations are already available from the bottom navigation and supporting tiles.
- AI Coach Briefing is now the dominant coloured banner with substantially larger, pure-white typography.
- Replaced confusing '0% evidence' wording with 'Training evidence building' when coverage is zero.
- Added an explanation that training-evidence coverage measures qualifying completed runs, assessments and linked execution evidence used by the race-performance model; it does not represent all information the app knows about the athlete.


v10.6.1: Top header AI Running Coach title is larger, heavier and pure white.


v10.6.1 Coach-perspective separation
-------------------------------------
- Today now presents Today's Coach Briefing: one immediate coaching decision based on today's schedule, active rehabilitation, readiness, recent pain, latest run execution and current-week completion.
- Detailed race probability, pathway calibration and longitudinal strengths/limiters are intentionally omitted from Today unless they materially affect today's action.
- Progress now labels the broader coach section Training Review and keeps the longitudinal race outlook, pathway trends, strengths, limiters, execution trends and strategic priorities.
- Both views continue to use the same underlying coach/athlete-state engine, preventing contradictory coaching while giving each tab a distinct time horizon and purpose.


v10.6.1 Interval FIT intelligence + Weekly Review
--------------------------------------------------
- FIT imports now retain lap summaries and identify likely work repetitions for structured workouts.
- When sufficient lap evidence exists, interval pace and power execution are scored from the identified repetitions instead of whole-run averages.
- Run details show repetition distance, pace, power, HR, execution score, consistency and late-repetition change.
- Plan now includes a first-class Weekly Adaptation Review showing applied/provisional Pace & Power, Distance & Load, readiness, the evidence behind the review and projected next-week prescription effects.
- Weekly pathway commitment rules remain unchanged: learned changes commit at weekly review; acute readiness remains an immediate protective modifier.


v10.6.1 Weekly review pathway clarification
--------------------------------------------
- Weekly Adaptation Review now shows only the two cumulative learned pathways: Pace & Power and Distance & Load.
- Readiness is no longer presented as a third equivalent factor.
- A separate Recovery Context strip shows whether temporary readiness is normal or reducing load.
- The UI explicitly states that recovery context is temporary and does not change learned Distance & Load capability.


v10.6.1 Record-stream interval detection
-----------------------------------------
- Structured-workout interval detection now uses second-by-second FIT pace transitions rather than assuming FIT lap boundaries are workout repetitions.
- FIT lap boundaries remain a fallback inspection source only.
- Imported FIT activities retain a compact record stream so interval detection can be recalculated when the run is matched or edited.
- Detected repetitions are no longer forced to equal the prescribed repetition count; extra repetitions are reported as additional/unplanned load.
- Interval evidence affects execution scoring only at high detection confidence. Moderate/limited detections are displayed but cannot distort the execution score.
- 'CV' is renamed 'Rep consistency' and shown as percentage variation.
- Late-rep pace/power is now written in plain language such as '7.5% faster' rather than a confusing signed percentage.


v10.6.1 Stryd per-repetition power + interval score transparency
-----------------------------------------------------------------
- Raw Stryd developer Power samples are retained instead of being reduced to activity average only.
- When decoded record power is absent, Stryd power samples are aligned to the FIT record stream so detected repetitions receive average running power.
- Exact sample/record counts use one-to-one alignment; small count mismatches use proportional sequence alignment and are reported in import diagnostics.
- Interval pace/power scores now use a true 0–100 scale; the previous arbitrary 45-point metric floor has been removed.
- Only the prescribed repetitions contribute to rep pace/power execution. Extra detected repetitions cannot improve execution.
- Extra reps receive a small prescription-adherence penalty (2 points each, capped at 10) and remain additional training load.
- Missing prescribed reps receive a stronger completion penalty.
- Interval details now include a 'How score is calculated' foldout showing pace, power, base execution and adherence penalties.


v10.6.1 Native + developer FIT record power
--------------------------------------------
- Low-level FIT parsing now reads native Record.power (standard FIT field 7, watts) as well as developer-field Stryd Power.
- One raw power slot is retained per FIT Record message so power can be aligned directly to the second-by-second pace/HR stream.
- Exact raw record alignment is preferred; proportional alignment is only a last-resort fallback.
- Interval analysis now displays Running power stream coverage (powered FIT records / total FIT records) and the recovered source.
- This makes missing per-repetition power diagnosable rather than silently displaying dashes.


v10.6.1 Drift chart FIT-stream repair
--------------------------------------
- Progress now recalculates missing power-based cardiac drift from stored FIT record streams after import.
- Saved v10.0.50 FIT runs with timestamped HR + power can therefore populate drift without being re-imported when the stored record stream is sufficient.
- The drift graph now builds its labels and points only from runs with actual drift values, eliminating orphan dates on an empty chart.
- Removed stale CSV-only guidance; the chart correctly accepts FIT or detailed CSV timestamped HR + running-power data.
- Import preview now explicitly displays the power-based drift candidate.


v10.6.1: Renamed Strength between running exposures to Strength & recovery day; removed WHY THIS IS TODAY'S CALL, the Today-vs-Progress scope footer, and the Progress expand-conclusion instruction.


v10.6.1: Progress Snapshot reordered: Week Distance + Readiness on row 1; Pace & Power + Distance & Load on row 2.


v10.6.1 Readiness Center
-------------------------
- Recovery is now the primary home for Readiness.
- Added explicit HRV and pain contributions, exact temporary modifier, learned Distance & Load factor, and combined effective load context.
- Added a next-session impact example and explicit statement that Pace & Power is not directly multiplied by readiness.
- Added a 14-day Readiness history around the neutral 1.000 baseline.
- Readiness is clearly presented as a temporary recovery overlay rather than a third learned pathway.


v10.6.1 Rehabilitation adherence correction
---------------------------------------------
- Adherence no longer averages only reported check-ins.
- Every past scheduled rehab day is included in the denominator.
- A past scheduled day without a completed execution report contributes 0% and is marked Missed / unreported.
- Partial execution contributes its actual recorded percentage.
- Today remains pending and future days are excluded.
- Rehabilitation adherence now has three tiles: 7 Days, 14 Days and Overall.
- Each tile shows the score plus reported/scheduled-day counts and missed days.
- Added a foldout with the full day-by-day adherence history.


v10.6.1 Workout Intelligence 2.0 + Comparable Runs
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


v10.6.1 Training Decision Engine
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


v10.6.1 Personal Response Model
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


v10.6.1 Unified Two-Pathway Decision Engine
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


v10.6.1 Evidence acceptance transparency
- Each pathway shows raw evidence, confidence, safeguard/accepted signal, accepted run contribution, weekly bucket, and projected next factor.
- Exact contribution formula is displayed.
- Pace negative Developing-confidence protection is explicitly explained.
- Distance & Load now uses an additive accepted-evidence weekly bucket.


v10.6.1: Fixed accepted Distance & Load run contributions being omitted from the current-week bucket. Simplified post-run pathway UI to Run evidence → Acceptance → This week → Projected next factor; removed duplicate Why/What changed text and repeated numbers.


v10.6.1: Fixed circular JSON save error by removing persisted pathwayTrace/twoPathway objects from coachUpdate. Pathway traces are recomputed on view and contain only plain date/type/contribution rows. Weekly buckets count only non-zero accepted contributions. Post-run UI reduced to Run signal, Accepted into learning, This week, Projected factor, with details behind one foldout.


v10.6.1 Personal-model classification + pathway tile consistency
-----------------------------------------------------------------
- Personal Response Model now classifies uploaded runs by the linked planned workout type when available, rather than relying only on the manually selected imported run type.
- A run linked to an interval or threshold workout therefore counts immediately as one Intensity Tolerance observation.
- Long-run and demanding-session classifications use the linked plan type in the same way.
- Comparable Run Engine also uses the linked planned workout family when available.
- Zero-observation explanations now state what evidence is required.
- Both Pace & Power and Distance & Load acceptance tiles always show confidence level and evidence-weight percentage, even when safeguards reduce the accepted contribution to zero.


v10.6.1: Renamed evidence weight to learning confidence weight; shows analysed vs contributed run counts; calculation details expose base confidence weight and multipliers.


v10.6.1 Information architecture cleanup
-----------------------------------------
- Progress is now the single canonical home for numeric Pace & Power and Distance & Load calibration factors.
- Added Progress → Adaptation panel with applied factor, this-week change, projected factor, since-start change, accepted contributions and pathway history.
- Today removes numeric pathway factors; it shows qualitative fitness calibration, load tolerance and readiness states.
- Plan removes numeric pathway factors and instead shows actual prescription consequences: pace/power target direction, load/distance direction, recovery context and projected workout changes.
- Log removes weekly/projected pathway factors; each uploaded run shows only its run signal, accepted contribution and confidence, with detailed calculation behind a foldout.
- Recovery removes learned Distance & Load and effective-load factor displays; it is now dedicated to temporary Readiness, HRV, pain and prescription impact.
- Numeric pathway calculations are no longer duplicated across Today, Plan, Log and Recovery.


v10.6.1 Progress navigation + duplicate cleanup
-----------------------------------------------
- Fixed "View accumulated adaptation in Progress" from the run dialog: navigation now closes the modal before switching tabs.
- Added anchored navigation so adaptation links land directly on Progress → Adaptation instead of the top of Progress.
- Removed the duplicate Pace & Power / Distance & Load numeric pathway cards from the longitudinal coach review lower on Progress.
- The upper Adaptation panel is now the only numeric pathway summary on Progress; the lower coach review focuses on interpretation, strengths, limiters and next actions.


v10.6.1 Auditable pathway calculations
---------------------------------------
- Both Pace & Power and Distance & Load calculation foldouts now show the complete Run signal equation.
- Each component shows its normalized signal, pathway weight and weighted contribution.
- Pace & Power Run signal = Performance capability ×58% + Comparable-run efficiency ×24% + Physiological cost ×12% + Personal pace response ×6%.
- Distance & Load Run signal = Prescribed load completion ×40% + Load-tolerance response ×38% + Execution support ×14% + Personal load response ×8%.
- The foldout separately shows Run signal → safeguard/Accepted signal → learning-confidence derivation → Accepted contribution.
- Accepted contribution explicitly displays Accepted signal × learning confidence × pathway learning rate.
- Component source evidence remains available in a nested foldout.
- Removed the duplicated accepted-contribution number from the pathway card header.


v10.6.1 Audit & Validation: added internal validation center; fixed linked-plan family use in personal pathway signal; prevented shortened-run load completion from being penalised again at week close; separated evidence-backed concepts from app-specific heuristics; automatic self-calibration remains disabled.


v10.6.1 Execution lineage: pathway calculation foldouts now begin with Execution Breakdown → pathway evidence. Pace & Power lists the exact pace/power/repetition execution components and their normalized effective weights used to create the capability score, then shows capability-score → normalized performance signal. Distance & Load explicitly shows overall execution score → execution-support signal, planned completion → completion signal, and separate tolerance evidence. Calculation chain is now Execution Breakdown → pathway evidence → Run signal → safeguard → confidence → factor contribution.


v10.6.1 Progressive disclosure
-------------------------------
- Post-run pathway cards now default to coach interpretation rather than formulas.
- Level 1 shows Workout evidence, Coach decision and Contribution.
- Level 2 "Why?" shows the execution evidence that drove the pathway decision in plain language.
- Pace & Power lists the relevant execution components and labels their influence.
- Distance & Load shows planned-load completion, overall execution support and load-tolerance evidence separately.
- Level 3 "Show technical calculation" retains the full auditable formulas from v10.5.1.
- Raw Run signal values are no longer prominent in the default view; they remain visible inside Why?/technical detail.


v10.6.1 Pathway presentation consistency
----------------------------------------
- Pace & Power and Distance & Load now use the exact same three-card structure and foldout hierarchy.
- Replaced "Workout evidence" with "What this run suggests".
- Replaced "Coach decision" with "How the model responds".
- Replaced "Contribution" with "Learning contribution".
- Added plain-language Run interpretation and Model response text.
- Both Why? foldouts now use the same Evidence / Observed / Role columns.
- Standardized evidence roles to Primary / Secondary / Supporting rather than mixed wording such as strong, moderate, major and supporting influence.
- Both technical foldouts use the same "Technical calculation" and "Source signal details" labels.


v10.6.1 Pathway wording simplification
--------------------------------------
- Replaced Positive/Conservative pathway labels with athlete-facing progression/caution wording.
- Labels are now: Strong progression signal, Progression signal, Slight progression signal, Supports current level, Slight caution signal, Caution signal, Strong caution signal.
- Removed the duplicate "What this run suggests" tile.
- Removed the duplicate "How the model responds" tile.
- Each pathway card now uses the interpretation once in the card header and retains only the Learning contribution tile.


v10.6.1 Run-detail hierarchy
----------------------------
- Run detail now starts with Workout Intelligence 2.0.
- Comparable Runs / Personal baseline is always shown immediately below Workout Intelligence.
- The two pathway adaptation cards follow those two high-level interpretation cards.
- Interval-level FIT analysis and the detailed Execution Breakdown follow the pathway cards.
- Edit fields remain below the analysis.
- The same hierarchy is used after editing or creating a run, avoiding a different post-save experience.


v10.6.1: removed Today Progress Snapshot, Plan Why and How adaptation affects plan panel; moved interval FIT analysis directly below Workout Intelligence; repetition rows are folded out; Execution Breakdown is collapsed and linked from the green score; harmonized supporting card surfaces.

v10.6.1 Visual simplification
----------------------------
- Added day-of-week labels to Plan workout date cards and HRV chart labels where dates are shown.
- Added a consistent visual icon/accent language for easy, quality, threshold, long, recovery, race and rest sessions.
- Added subtle workout-type accent bars for faster weekly scanning.
- Compressed Workout Intelligence findings into a denser visual grid while preserving the underlying evidence.
- Added compact visual cues to Recovery metrics.
- Removed dead Plan adaptation-rendering code left behind after the panel was removed in v10.5.6.
- Standardized visual hierarchy without changing coaching or adaptation calculations.


v10.6.1 Visual UX Release
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

- v10.6.1 flat-package revision: all exercise image assets are stored directly in the main application folder; no assets subfolder is required.


v10.6.1 Unified Teal Design System
----------------------------------
- Standardized all tabs around three information levels.
- Level 1 = teal gradient primary conclusions.
- Level 2 = light teal supporting interpretation.
- Level 3 = white detailed evidence/metrics.
- Foldouts now use one consistent neutral/light-teal style throughout the app.
- Warning/caution states now use small semantic accents instead of separate yellow/green/red card designs.
- Plan workout cards retain workout-type icons but no longer change the card surface color.
- Applied across Today, Plan, Log, Progress, Recovery and Injury/Rehab.
- No coaching/model logic changed.


v10.6.2 Teal hierarchy + exercise visuals
------------------------------------------
- Applies one consistent teal visual hierarchy across all tabs: level 1 = dominant teal hero/decision, level 2 = supporting teal cards, level 3 = quiet detail, with one foldout treatment everywhere.
- Removes inherited white/yellow card fills from the main information hierarchy and uses semantic amber/red/green only as compact status accents.
- Keeps weekday names with dates throughout plan, run, recovery and rehabilitation views.
- Rehabilitation exercise cards now use the existing rendered exercise pictures directly in the cards, show target-muscle chips, clearer technique cues, and open the full image in the app modal when tapped.
- Exercise images remain flat root-level repository files (no assets folder). Expected filenames: 01_slow_calf_raise.png through 13_double_leg_bridge.png as already referenced by the app.
- No training, prediction, recovery, injury, pathway or scoring equations were changed.


v10.6.5 Render fidelity + runner-flow correction
------------------------------------------------
- Removes the remaining inherited white content tiles from Today, Plan, Log, Progress, Recovery and Injury/Rehab so the live app matches the approved dark-teal reference hierarchy.
- Hardens foreground/background contrast across nested cards, weekly-review tiles, workout details, KPI/evidence cells, warnings, inputs, icons and foldouts.
- Plan keeps the runner-first order: current week and scheduled workouts first, provisional adaptation consequences second, deeper insights last.
- Injury/Rehab now presents today's prescribed rehabilitation immediately after the active injury/plan decision, before longitudinal recovery and adherence summaries.
- Exercise thumbnails are explicit zoom targets; tapping the image opens the large technique viewer while written cues, target muscles, pain rule and progression remain available in the card.
- Repository remains flat. No training, prediction, recovery, injury, pathway or execution-scoring equations changed.


v10.6.5 Approved-render fidelity
----------------------------------
- Removes remaining light/white content-card surfaces across Today, Plan, Log, Progress, Recovery and Injury/Rehab.
- Uses the supplied reference render as the visual source of truth: dark teal page, layered teal cards, white headings, aqua metadata, compact semantic status accents, dark foldouts, and no white active bottom-nav pill.
- Workout rows, pathway cards, interval analysis, comparison cards, KPI cells, rehab cards and chart containers now share the same dark-teal hierarchy.
- Exercise thumbnails remain tappable to enlarge in the technique viewer.
- No training, prediction, recovery, injury, pathway or scoring equations changed.


v10.6.6 Reference-render lock
-------------------------------
- Adds a final inline reference-render CSS layer in index.html so legacy light-card rules cannot override the supplied dark-teal reference design.
- Removes white/pale content tiles across Today, Plan, Log, Progress, Recovery, Injury/Rehab and secondary views.
- Keeps dark-teal Level 1/2/3 surfaces, white primary text, aqua supporting text, compact semantic status accents, dark foldouts, teal chart canvases and non-white mobile navigation.
- No training, prediction, recovery, injury, pathway or scoring equations changed.


v10.6.7 Target-render fidelity lock
----------------------------------
- Uses the supplied dark-teal mobile render as the visual source of truth across Today, Plan, Log, Progress, Recovery and Injury/Rehab.
- Removes remaining pale/white content surfaces, including Plan intensity-mix wrappers, Log interval-analysis/modal cards, Progress prediction/validation tiles, injury diagnosis/adherence tiles and Today action buttons.
- Bottom navigation now uses a dark bar with cyan active icon/indicator; no white active pill.
- All runner-facing buttons use dark teal with white text for reliable contrast.
- Chart canvases and chart-detail wrappers are embedded dark teal, and canvas labels/grid lines were recoloured for dark-background readability.
- No training, prediction, recovery, injury, pathway or scoring equations changed.


v10.6.8 Logo-blue visual system
--------------------------------
- Replaces the teal visual system with the dark-blue, light-blue and white palette used by the AI Running Coach icon.
- Standardises Progress so Personal Response Model, validation, prediction and pathway sections use the same card hierarchy rather than introducing a separate gradient treatment.
- Fixes low-contrast buttons/links, More-menu text, interval score elements and remaining pale-on-pale labels.
- Removes white shells around Plan intensity-mix charts and uses a dark-blue chart canvas with blue-led series colours.
- Daily workout, rehab, run-detail modal, pathway, validation, adherence and diagnosis surfaces share the same blue hierarchy.
- Bottom navigation uses navy/blue active states rather than white tiles.
- No training, prediction, recovery, injury, pathway or execution calculations changed.


v10.6.10 Unified Logo-Blue Visual System
----------------------------------------
- Removes residual teal/green card surfaces from Today, Plan, Log, Progress, Recovery, Injury/Rehab and More.
- Canonical palette now follows the app icon: deep navy, dark blue, medium blue, light blue and white.
- Level 1 conclusions use dark/mid blue; Level 2 supporting cards use medium blue; Level 3 metrics/evidence use lighter blue.
- Teal is no longer used as a structural surface colour. Green remains only as a compact success/positive semantic accent.
- Progress cards, pathway blocks, coach review, personal-response model, interval analysis, rehab and modal surfaces all use the same hierarchy.
- Chart canvases, gridlines and labels are normalized to the same blue family.
- No training, prediction, recovery, injury, pathway or scoring logic changed.


v10.6.10 Stronger logo-blue palette
------------------------------------
- Shifts all structural surfaces away from blue-green/teal toward navy, royal blue and clear sky-blue shades sampled from the app-logo family.
- Dark navy remains the application shell; level-1 cards use deep blue, level-2 cards medium blue, level-3 tiles brighter blue, with pale blue and white for contrast.
- Semantic green remains limited to success indicators only.
- No coaching, prediction, recovery, injury, pathway or scoring logic changed.


v10.7.0 Icon-derived visual system
-----------------------------------
- Full visual-system refactor based on the app icon: deep navy, royal/sky blue and white; teal/green is no longer structural.
- Four consistent information levels are applied across Today, Plan, Log, Progress, Recovery and Injury/Rehab.
- Added compact line-icon wells, circular gauges, horizontal progress bars and consistent metric tracks.
- Plan week header now shows planned/completed/remaining distance plus a graphical completion bar.
- Training-intensity doughnut charts are replaced with more readable horizontal blue bar distributions.
- Progress sections are normalized to one cadence and no longer use independent gradients/colour islands.
- Model-validation percentages now include compact evidence bars.
- Injury prognosis adds a stage timeline with central-estimate and confidence visualization.
- Modal/run analysis, charts, foldouts, forms and navigation all use the same icon-derived palette.
- Semantic green/amber/red are reserved for success/caution/problem accents only.
- Training, prediction, recovery, injury, pathway and scoring equations are unchanged.

v10.7.1 Clean Blue Restart
--------------------------
- Rebuilds the visual palette from one canonical token system rather than layering another colour patch.
- Structural colours are restricted to deep navy, dark blue, medium blue and one action blue; teal, purple and green are no longer structural surfaces.
- Green, amber and red are semantic-only status colours.
- Removes the v10.7.0 inline theme lock and the accumulated v10.6.x theme-override blocks from the active stylesheet.
- Training-intensity visuals are now deterministic HTML horizontal bars, so Next week, Completed to date and Overall programme always render even when the insights disclosure starts collapsed.
- Adds graphical confidence bars to Personal Response Model dimensions, score bars to verified strengths/opportunities, and bars to workout-execution KPIs.
- Interval repetition dots and metric bars now use the same blue family, with amber used only for extra/unplanned repetitions.
- Progress, Today, Plan, Log, Recovery and Injury/Rehab share the same Level 1 / Level 2 / metric / foldout treatments.
- No training, prediction, pathway, recovery, injury or scoring equations were changed.

v10.7.2 Hard Color Reset
------------------------
- Removes the previous theme owner and rebuilds colours from a strict canonical palette.
- Structural UI now uses only #071B2E (background), #0D3558 (cards), and #174F7A (nested modules).
- #2E8FD0 / #7FC8F1 are reserved for actions, icons, graphs and progress indicators.
- Teal/purple are removed as structural colours. Green #42C97B, amber #F2B84B, and red #FF6B7A are semantic-only.
- Legacy gradients are stripped from the active stylesheet.
- Progress is explicitly forced onto the same level-1 / level-2 hierarchy as Today, Plan, Log, Recovery and Injury/Rehab.
- No training, prediction, pathway, recovery, injury or scoring equations changed.

v10.7.3 User-Palette Rebuild
----------------------------
- Rebuilds the UI around the exact five blue shades sampled from the supplied reference image:
  #BBF5F9, #88C5FC, #3980EC, #0129BF, #080B6C.
- Removes all v10.6.x/v10.7.x visual override layers from the active stylesheet and retains only the original layout CSS plus one new theme owner.
- Repairs the mobile Plan week summary so week/phase/date and Planned/Completed/Remaining metrics do not overlap.
- Bottom navigation is explicitly locked to the darkest supplied blue; only the active tab uses pale blue.
- Main cards use royal blue, nested modules use mid blue, icons/bars use light blue, and pale blue is reserved for selected/highlight states.
- Native intensity distribution bars remain enabled for Next week, Completed to date and Overall programme.
- No training, prediction, pathway, recovery, injury or scoring equations changed.

v11.0.0 Clean-slate GUI
-----------------------
The visual layer was rebuilt from scratch around the supplied five-blue palette.
No training, prediction, adaptation, recovery, injury, assessment, import, scoring,
storage, migration or calculation engine was intentionally changed.
Information architecture retained:
Today = decision/action; Plan = prescription; Log = observed execution;
Progress = longitudinal learning/prediction; More = assessments/recovery/injury/race/settings.


v11.1.0 Premium UI rebuild
--------------------------
- New neutral dark-navy/slate visual system with blue/cyan data accents.
- Bottom navigation fixed to exactly Today, Plan, Log, Progress and More on mobile.
- More menu converted to compact list rows with correctly stroked SVG icons.
- Metric cards receive explicit block layout and overflow protection to prevent concatenated text.
- Injury recovery overview uses a 2x2 metric grid on mobile to accommodate long stage names.
- Today coach action icon receives fixed dimensions to prevent oversized/black SVG boxes.
- Consistent card, foldout, button, chart, badge and icon primitives across all destinations.
- No training, prediction, adaptation, recovery, injury, scoring, storage, import or assessment engine changes.

v11.2.0 UX refinement — build 18200
-----------------------------------
- UI-only change. No training, prediction, adaptation, recovery, injury, scoring, import or storage engines changed.
- Plan days are collapsed by default and expand when the day is tapped.
- Reworked Progress evidence cards so titles, explanations, impact and confidence never concatenate.
- Added/strengthened micro-visuals: pathway sparklines, evidence score bars, recovery score/pain bars, plan-health and outlook rails.
- Replaced bright blue CTA slabs with dark premium controls and cyan emphasis.
- Recovery/injury KPI tiles use a robust 2-column mobile layout.
- More menu is a compact icon + label list.

v11.3.0 Visual + typography refinement — build 18300
----------------------------------------------------
- UI-only changes.
- Restores the graphical Programme Timeline with colored phase segments and current-week marker.
- Revisits global text spacing, line-height, wrapping and metric-card structure to prevent concatenation/misalignment.
- Adds deliberate pictogram colors by purpose and visual color-coding to progress bars and timeline segments.
- Separates page background, primary cards, nested tiles and plotting surfaces into distinct dark-slate layers.
- No model/data engine changes.


v12.0.1 — Today tab locked baseline
-----------------------------------
- Today-only presentation refinement; model/data engines unchanged.
- All Today tiles use the same teal gradient, 18 px corners and 12 px spacing.
- Coach Briefing now uses a briefing/speech SVG pictogram.
- Session/Rehab, Readiness and Pain use three equal-width, identically structured tiles.
- User-specific values and actions have stronger styling than generic explanatory copy.
- Today support cards use the same header/content/action pattern and larger headings.
- LOCK RULE: future tab work must not change the scoped #today UI contract or Today rendering functions unless the user explicitly asks for another Today update.


v12.0.2 — Today professional status cards
-----------------------------------------
- Today-only refinement; frozen model/data engines remain unchanged.
- Removed the decorative pale highlight from the Coach Briefing.
- Enforced a 12 px gap between every top-level Today card, including briefing, status row, workout disclosure and support cards.
- Rehab/Training, Readiness and Pain are standalone equal-width cards with centered large circular pictograms, strong personalized values and compact supporting context from existing app data.
- The three status cards share exactly the same internal layout and spacing.
- Today v12.0.2 remains the locked baseline for all future non-Today tab work.


v12.0.3 — Today render-led rebuild
-----------------------------------
- Today tab rebuilt from the approved reference render, not patched from the previous layout.
- Larger SVG pictograms, three equal athlete-status cards, Plan Health gauge, visual workout-structure bars and compact support cards.
- Workout structure visual is generated only from the existing prescribed workout data (warm-up / main set / cooldown and detected repetition count).
- No calculation, prediction, pathway, recovery, injury, scoring, import, storage or data-model engine logic changed.
- Today remains locked against unrelated future tab updates.


v12.0.4 — Today visual reliability refinement
----------------------------------------------
- Today-only UI refinement; calculation and data engines remain frozen.
- Workout Structure is now a true inline SVG profile generated from the existing structured prescription fields: warm-up distance, work repetitions, recovery count/distance, main-set distance and cooldown distance.
- The three Rehab/Training, Readiness and Pain cards now use identical grid geometry, font sizes, font weights and centered alignment.
- Replaced the simple single-colour status icons with larger bespoke multi-tone SVG pictograms for running, readiness and pain.
- Evidence coverage is displayed as a circular completeness plot using the existing evidenceCoverage value.
- Today remains locked against unrelated future-tab changes.


v12.1.0 — Serious-runner Today redesign
----------------------------------------
- v12.0.4 visual language is now the default visual baseline for future tab redesigns.
- Today is rebuilt around a serious runner's daily decisions: coach priority, readiness, weekly load, pain/injury, full structured workout targets and profile, active rehab when relevant, weekly progression, latest execution signal and concise race context.
- Today surfaces existing plan, runner and model data only; no new fitness, prediction, injury, pathway or readiness calculations were added.
- Detailed prescription uses the existing warm-up/main/cooldown, target pace, target power, target HR, purpose and fuel/hydration fields.
- Race context uses the existing phase, countdown, target time, race estimate and target probability.
- Latest training signal uses the existing workout-execution, efficiency and cardiac-drift calculations.
- The Today tab remains locked against unrelated future updates.


v12.1.1 — Runner-first Today refinement
----------------------------------------
- Plan Health removed from Today; it is programme-design context rather than a useful daily signal.
- Active rehabilitation is now the first and strongest Today card and explicitly overrides the running plan.
- Today hierarchy: active rehab (when present) → coach decision/evidence → mode/readiness/pain → running prescription → one weekly summary → latest run signal → race context.
- Week load is shown only once, in the weekly summary.
- Long explanatory text is replaced by concise bullet lists where practical.
- Today cards use the full available card width; pictograms now sit in card headers instead of permanently reserving a left-side content column.
- Pain pictogram changed to an anatomical lower-limb/joint cue.
- View full prescription now resolves the workout by date instead of relying on an internal workout ID.
- No calculation, prediction, plan-generation, pathway, readiness, injury, scoring, import, storage or data-model equations changed.


v12.1.2 — Today interaction refinement
- Order: Coach Briefing → three status cards → active rehab → workout → remaining context.
- Evidence circle fixed beside Coach Briefing.
- Removed redundant Priority and Rehab first pills.
- Removed full-description button; tapping workout structure now expands/collapses prescription and intervals.
- Pain pictogram revised to a more anatomical lower-limb/joint representation.
- Model/data engines unchanged.


v12.1.3 — Today briefing refinement
- Evidence completeness moved beside Coach Briefing heading; Today's Priority spans full width below.
- Rehab pictogram replaced by runner-leg/resistance-band physiotherapy illustration.
- Pain pictogram replaced by anatomical leg/knee pain illustration.
- Remaining Today layout/interactions preserved; model/data engines unchanged.


v12.1.4 — Today briefing layout fix
-----------------------------------
- Coach Briefing heading and Evidence completeness circle now share only the top row.
- Today's Priority spans the entire width underneath, preventing the narrow-column wrapping seen in v12.1.3.
- Removed the Next scheduled run row from the weekly summary.
- Rehab pictogram redesigned as a runner performing a resistance-band rehabilitation movement.
- Pain pictogram redesigned as an injured leg/knee with a clearly highlighted pain point and pain rays.
- Remaining Today content and interactions preserved.
- Model/data engines unchanged.


v12.1.5 — Today structural fix
------------------------------
- Fixed malformed Coach Briefing HTML that caused Today's Priority to be nested inside the Evidence column.
- Only Coach Briefing heading and Evidence completeness now share the top row.
- Today's Priority is a separate DOM sibling below the header and therefore always spans the full card width.
- Rehab pictogram changed to a controlled physiotherapy leg exercise with resistance band and medical cross.
- Pain pictogram changed to a bent leg/knee with a prominent pain bolt and radiating pain marks.
- No model/data-engine calculations changed.


v12.1.6 — Today pictogram refinement
------------------------------------
- Rehab pictogram redesigned using the supplied rehabilitation reference as direction: person at a rehab/treatment bench with medical cross.
- Pain/Injury pictogram redesigned using the supplied running-pain reference as direction: running figure with a localized pain bolt at the hip/thigh.
- Artwork is newly drawn SVG and does not reuse or copy the stock-image assets.
- Removed the up/down arrow from the tappable workout-structure foldout; the workout visualization itself remains the disclosure control.
- No model/data-engine calculations changed.


v12.1.7
- Removed 'Priority 1' and 'secondary' wording from Today.
- Rehab icon: exactly two arms/two legs, rehab table, medical cross.
- Pain/Injury icon: exactly two arms/two legs, localized pain bolt.
- Model/data engines unchanged.

v12.1.8
- Rehab pictogram simplified to a centered medical/rehabilitation cross based on the supplied reference.
- All Today pictograms are explicitly centered in circular holders.
- Weekly completion %, race-weeks remaining and latest execution score use the same mini-value typography.
- Mini-value colors now communicate status: green favourable, amber caution, red poor, teal neutral.
- Weekly completion color is evaluated against elapsed progress through the current week.
- Race-time color reflects available preparation time relative to taper; execution score uses score bands.
- Model/data engines unchanged.

v12.1.9
- Evidence-completeness circle reduced in size.
- Today rehab action now opens the Injury tab and targets the daily rehab check-in.
- Small Rehab/Training tile changes to Normal Running when rehab is active.
- That tile now shows the model's estimated unrestricted-running date and ahead/behind-nominal status when those fields are available.
- Ahead/behind text uses semantic good/warn/bad color.
- No model/data-engine calculations changed.

v12.2.0
- Small Today rehab tile now uses injuryPrediction().fullDate directly: the active rehab plan's central estimate for full unrestricted training.
- Supporting text shows the model's remaining estimated days and confidence.
- If no active rehab plan exists, the same tile becomes Today's Mode and shows today's run type/distance or Recovery.
- Removed guessed return-date field aliases and ahead/behind-date inference from this tile.
- No injury-model calculations changed.

v12.2.1
- Left status tile is Active Rehab when a rehab plan exists; it shows the model's fullDate and explains that this is the normal-running estimate.
- Without active rehab, the same tile becomes Today's Focus and shows today's workout type/distance/purpose or recovery focus.
- Readiness tile now explains why it is Normal/Reduced/Restricted: HRV deviation, pain signal, or both, plus the resulting percentage load reduction.
- Pain/Injury tile wording explicitly identifies the body region/status and that the displayed value is the highest recent pain signal.
- Removed a regressed 'remains secondary' phrase.
- Model/data engines unchanged.

v12.2.2
- Daily rehab check-in button now directly calls openInjuryCheck() for the active rehab-plan injury; removed unreliable DOM-search navigation.
- Coach Briefing phase line now shows the phase-specific race priority beside the phase name, e.g. Foundation · durable easy running and safe consistency.
- Race Context now includes the model's existing central 70% finish-time range and matching pace range.
- No prediction, rehab, readiness or training-model calculations changed.


v12.3.0 — Serious Runner Plan redesign
-----------------------------------------
- Today is regression-locked and byte-equivalent in its Today-specific markup, rendering functions and scoped Today CSS.
- Plan rebuilt from scratch around serious-runner questions: programme position, weekly prescription, weekly structure, adaptation consequences, programme timeline and intensity distribution.
- Programme header shows current phase + existing phase priority, week/total, race countdown, target, current-week planned/completed distance and qualitative adaptation status.
- Seven-day schedule is collapsed by default; only one workout expands at a time. Expanded workouts use existing pace/power/HR targets, visual warm-up/work/recovery/cooldown structure, full prescription, purpose, coaching, fueling and missed-session guidance.
- Completed workouts link to existing Run Intelligence.
- Weekly Structure shows planned distance, sessions, quality-session count, longest/long-run contribution and planned-volume progression around the selected week.
- Plan Adaptation intentionally does not duplicate numeric learned pathway factors: it shows Pace & Power, Distance & Load and Recovery consequences plus projected workout changes and evidence foldouts, consistent with the app's existing information architecture.
- Active rehab appears only as a protective plan constraint and can supersede scheduled running.
- Programme Timeline shows phase blocks, current/viewed week, next key long run, peak long run, taper start and race day.
- Intensity Distribution uses the existing plan workout classifications and actual planned distance.
- No prediction, training-plan generation, pathway, recovery, injury, scoring, import, storage or data-model equations changed.


v12.3.1 — Today wording + Plan consolidation
----------------------------------------------
- Today: removed phase priority from Race Context, removed phase name from Race Context, and removed SECONDARY from the running-plan eyebrow.
- Plan: vague Protective adjustment top status replaced by Plan moderated plus the actual cause(s): pace/power moderation, distance/load reduction, and/or material recovery restriction.
- Plan: selected/future-week summary and Weekly Structure consolidated into one Week Overview with date/focus, planned/completed distance, sessions, quality count, longest session, long-run share and surrounding-week volume.
- Plan: Programme Timeline rebuilt using contained equal-width phase blocks plus a separate proportional programme-position bar so phase names/week ranges cannot spill outside their segments.
- Model/data engines unchanged.


v12.3.2 — Quantified Plan adaptation
-------------------------------------
- Plan Adaptation now shows applied adaptation for the selected/current week and projected adaptation for the next weekly review.
- Pace & Power and Distance & Load are shown separately, each as percentage vs baseline and factor value.
- Recovery is shown separately as a temporary overlay because it is not a learned weekly adaptation.
- Existing adaptation/pathway calculations are unchanged; the UI exposes intermediate values already calculated by weeklyReviewData.
- Today remains unchanged from v12.3.1.


v12.3.3 — Race Context moved to Plan
--------------------------------------
- Removed Race Context card from Today at the user's request.
- Race Context is now the first Plan card, replacing the previous Current Programme Position hero.
- Race Context retains target, current estimate, target probability, countdown, likely 70% finish-time range and pace range, and adds current phase/focus appropriate to Plan.
- Removed the Volume Around This Week graph from Week Overview; the useful weekly metrics remain.
- All other approved Today and Plan components/interactions remain unchanged.
- No model/data-engine calculations changed.


v12.3.4 corrected
- Rebuilt from known-good v12.3.3.
- Programme Timeline is second Plan tile.
- Intensity Distribution is a foldout inside it.
- Existing Plan renderer and target IDs preserved.
- Race target-gap bullet removed and text reduced.
- No model/data-engine changes.


v12.3.5 — Plan spacing and timeline refinement
-----------------------------------------------
- Standardized vertical spacing between Plan cards and sections.
- Week navigator uses symmetric arrow columns with the week control centered between them.
- Opening Plan resets the viewed week to the actual current programme week.
- Programme phase widths are proportional to their week duration.
- Programme phase colours now communicate training demand/phase character: base, build, specific, peak, taper and race.
- Existing model/data calculations remain unchanged.


v12.3.6 — corrected Plan default week and programme timeline
- Opening Plan now explicitly resets state.weekView to currentWeek() before rendering.
- Timeline phase width is flex-weighted by actual phase duration in weeks.
- Timeline colour is data-driven from existing planned average weekly distance and quality/specific distance share.
- Added compact demand legend.
- No calculation/model/data-engine changes.


v12.3.7 — Programme Timeline alignment
- Programme Timeline card now uses the same left/right content inset as the other Plan cards.
- Heading, timeline content and intensity foldout share the same left starting point.
- No other Plan or Today layout/content changed.
- No model/data-engine calculations changed.


v12.3.8 — Programme Timeline alignment and label fit
- Programme Timeline uses the same internal card inset as the other Plan cards, without double-padding the heading.
- Phase names and week ranges are forced to a single line.
- Phase label font size is dynamically reduced only when needed to fit the proportional phase width.
- No timeline duration, colour logic, Today UI, or model/data-engine calculations changed.


v12.3.9 — Programme Timeline phase-label fit
- Fixed dynamic phase-label sizing being overridden by !important CSS.
- Phase names and week ranges now receive inline !important font sizing based on the actual rendered segment width.
- Added last-resort horizontal compression for very short proportional phases.
- Removed NOW and VIEW W... badges from inside phase blocks; current/viewed state remains communicated by segment highlighting.
- No timeline duration or demand-colour calculations changed.


v12.4.0 — Programme Timeline readability
- Programme phase names are rotated vertically at a readable font size instead of being aggressively shrunk.
- Week ranges remain horizontal and compact at the bottom of each proportional phase.
- Removed the separate programme-position slider below the timeline.
- Current programme position is now shown as a vertical line directly through the phase graph, with the current week label.
- Phase duration proportions and data-driven demand colours remain unchanged.
- No model/data-engine calculations changed.


v12.4.1 — Programme Timeline vertical labels
- Phase name and week range now rotate together as one vertical label.
- Taper uses a slightly tighter but still readable vertical label treatment for its two-week proportional block.
- Current-week vertical marker remains inside the graph.
- Proportional phase widths and demand colours unchanged.
- No model/data-engine changes.


v13.0.0 — Runner-first Log redesign
-----------------------------------
- Today and Plan remain regression-locked to the approved v12.4.1 implementation.
- Log main screen rebuilt around Run History, compact import/manual actions, and runner-focused recent-run cards.
- Added a new multi-colour completed-run analysis pictogram and Log navigation icon.
- Run detail hierarchy is now: Run summary → Workout execution → Execution breakdown → Interval-level fit → Personal comparison → Training evidence → Training consequence.
- Execution score is a prominent circular gauge; the detailed calculation remains a foldout.
- Interval repetitions are visualized as compact rep cards using the existing interval detector and pace/power rep scores. Full rep table remains expandable.
- Pace & Power and Distance & Load use identical Training Evidence cards with evidence weight, run signal, accepted contribution, weekly bucket, applied factor and projected next-review factor.
- Full pathway calculation remains available in How was this calculated? foldouts.
- Training consequence explicitly separates this-run evidence, adaptation applied now, and projected next-review adaptation.
- Import preview, manual/edit form and run-detail modal receive Log-specific mobile styling.
- No calculation, scoring, pathway, prediction, adaptation, import parsing, matching, storage or data-model equations changed.


v13.0.1 — Log consistency and duplication cleanup
-------------------------------------------------
- Today and Plan remain regression-locked to approved v12.4.1.
- Overall workout execution score is shown once in Run Detail as a semantic radial completion gauge.
- Recent-run execution score also uses the same semantic radial gauge language.
- Removed the second repetition-details table; the visual repetition cards are now the only rep-detail presentation.
- Removed duplicate visible execution-score values from Run Summary, Execution Breakdown summary, and interval summary/header.
- Log primary cards now use the same teal gradient/card hierarchy as Today and Plan; nested cards use one consistent secondary surface.
- Corrected mobile spacing in Running power stream, execution calculations, interval calculations and pathway calculations so labels/values cannot concatenate.
- Expanded P&P and D&L presentation to Pace & Power and Distance & Load, with a concise pathway explanation.
- Projected workout consequences now include future dates only; past workouts are excluded.
- Log pictogram/navigation icon no longer contains a person; it uses running-shoe/activity-trace/check symbolism.
- No calculation, scoring, pathway, prediction, adaptation, import, matching, storage or data-model equations changed.


v13.0.2 — Log text rhythm and run-card metrics
-----------------------------------------------
- Today and Plan remain regression-locked to approved v12.4.1.
- Rebuilt pathway evidence-driver layout so name, explanation, observed score and Primary/Secondary/Supporting role cannot concatenate.
- Rebuilt weighted pathway calculation rows so component name, derivation, weighting and result have explicit spacing tracks.
- Pace & Power and Distance & Load values in Training Consequence now use identical font size, weight and markup.
- Recent-run cards now add available runner-relevant chips for HR, power, RPE, pain, efficiency (J/beat) and power-based cardiac drift.
- Sparse metrics are omitted rather than showing meaningless placeholders.
- No calculation, scoring, pathway, prediction, adaptation, import, matching, storage or data-model equations changed.


v13.0.3 — Pathway evidence typography and semantic alignment
-------------------------------------------------------------
- Today and Plan remain regression-locked to approved v12.4.1.
- Pathway status text is now semantic: green/amber/red/teal according to the existing run signal, accepted contribution and evidence confidence.
- Evidence-weight circular gauges use the same semantic status colour.
- Run signal, accepted contribution and this-week values are aligned in equal metric cells with identical numeric typography.
- Applied and Projected Next Review tiles now have equal dimensions and matching font sizes/weights.
- Pace & Power and Distance & Load pathway presentation remains explicit and consistent.
- Deeper calculation foldouts now use one unified font scale and weight hierarchy.
- No calculation, scoring, pathway, prediction, adaptation, import, matching, storage or data-model equations changed.

v13.0.4
-------
- Removed the Training Consequence / "What this means for your plan" tile from Log run detail.
- Today and Plan remain unchanged.
- No calculation or data-model logic changed.


v13.0.6
-------
- Fixed Log Workout Objective typography so label, objective and interpretation no longer run together.
- Added explicit spacing between Workout Execution finding bullets/status marks and their text.
- Today and Plan unchanged; no model/data-engine calculations changed.


v13.1.8 Progress chart and hierarchy repair
--------------------------------------------
- Progress charts now use a dedicated inline SVG renderer after each model render, avoiding browser canvas blanking on mobile.
- Race readiness, weekly distance, long-run progression, efficiency and aerobic durability charts render whenever genuine data exists.
- Progress-only card typography, padding and spacing are normalised for Personal Response Model, Model Validation, Longitudinal Training Review and adaptive pathway cards.
- No calculation, prediction, pathway, recovery, injury, import, matching, storage or data-model logic changed.

v13.1.8 Verified Progress rendering repair
-------------------------------------------
- Replaces the repeatedly unreliable Progress canvas/dynamically-inserted-SVG presentation with dedicated persistent chart mounts in the Progress markup. Race readiness, efficiency, aerobic durability, long-run progression and weekly distance render into those mounts from existing data only.
- Empty-state handling is retained only when a chart has no valid underlying observations; single observations render as points.
- Longitudinal Training Review is now concise bulleted evidence-linked text rather than one dense paragraph.
- Progress uses one scoped three-level surface hierarchy: teal primary analysis surfaces, dark secondary cards, darker disclosure/details surfaces.
- Corrects narrow-phone spacing for execution evidence, model-validation rows, evidence metadata, pathway tiles and adjacent label/value text.
- Normalises inter-card spacing throughout Progress.
- Removes an accidental duplicate Fitness Assessments heading in markup; the assessment engine/data remain unchanged.
- Today, Plan and Log markup and logic are unchanged. No prediction, pathway, scoring, recovery, injury, import, storage or plan calculations are modified.

v13.1.8 Progress chart reliability correction
---------------------------------------------
- Fixed a Progress render exception caused by a removed legacy `dataNeeded` mount. That exception occurred before Race Readiness, Long-run Progression and Weekly Distance chart rendering, leaving their Level-2 cards blank.
- Progress chart rendering now continues when legacy explanatory mounts are absent.
- Fixed SVG metric plotting so `null` observations remain missing instead of being converted to numeric zero. This removes false efficiency-factor lines dropping to zero between unrelated workout types.
- Comparable metric series remain separated by workout type; isolated observations render as points and only same-type observations can form a trend line.
- Future weeks are no longer plotted as zero completed distance. Planned future volume remains a reference, while completed distance stops at the current week.
- No training, prediction, pathway, recovery, injury, scoring, import, storage or data-model calculation was changed.


v13.1.13 Progress hierarchy refinement
-------------------------------------
- Moves the Longitudinal Training Review directly below Race Readiness, before Fitness & Capability.
- Removes the visible chart-summary/data disclosures from Progress charts while retaining accessible chart labels.
- Progress level-1 cards now use the exact primary teal gradient/border used by the locked Today cards; nested and disclosure surfaces follow the same three-level hierarchy.
- Chart cards size to their rendered chart content instead of carrying excess empty vertical space.
- Progress is hard-clipped to the viewport on mobile to prevent left/right page scrolling.
- Today, Plan and Log remain frozen; no calculation or data-model logic changed.


v13.1.13 Progress typography root fix
-------------------------------------
- Progress composite cards now explicitly use the Today-tab typography hierarchy rather than browser-default inline flow.
- Model Validation, Personal Response Model, Longitudinal Training Review, evidence cards and metadata use block/grid structures with Today-equivalent label, heading, body and supporting-text sizes.
- Fixes concatenated labels/values such as Evidence-backed conceptsIndividualised progression and Score/Window/Verification.
- No calculation/data-model logic changed; Today, Plan and Log implementations remain frozen.

v13.4.1 Race Day execution redesign
----------------------------------
- Rebuilds only the Race Day UI around current race outcome, execution, pace/power, effort, fuelling, evidence, endurance, constraints, adaptive confidence, target checkpoints and detailed model context.
- Uses only existing race calculations and stored app outputs; no prediction, pathway, recovery, injury, training-plan, scoring, storage or model logic is changed.
- Race Day styling is scoped under #race and follows the approved Today-led teal Level-1/2/3 visual language.
- Removes unsupported standalone race-day claims and clearly distinguishes target, prediction, uncertainty range, learned factors and temporary recovery context.
- Keeps Today, Plan, Log, Progress, Recovery and Injury & Rehab implementations frozen except for the required global version/build display update.


v13.5.2 Settings and Daily Check-in redesign
- Settings and Daily Check-in presentation rebuilt using Today-led scoped visual hierarchy.
- Existing settings/check-in IDs, calculations, validation, storage and rehabilitation logic preserved.
- Approved Today, Plan, Log, Progress, Recovery, Injury & Rehab and Race Day implementations were not intentionally changed.

v13.6.1 Full GUI QA and reliability pass
-----------------------------------------
- Fixed two Progress runtime errors that could stop dashboard rendering: removed a stale programmeBlocks/currentBlockName path and replaced a stale pred reference with the current prediction source.
- Normalised the Progress programme timeline to the existing detailed phase model without changing training calculations.
- Fixed narrow-phone layout pressure in the Plan adaptation header and Projected Fitness disclosure.
- Added a root modal viewport reset whenever a dialog opens so Daily Check-in, Injury assessment, Log and other dialogs always begin at the top instead of inheriting a previous dialog scroll position.
- Restyled the Injury assessment form hierarchy using the approved Today-led Level-2/Level-3 surfaces, spacing, section-number treatment and typography; no injury logic or fields changed.
- Verified the fixed bottom navigation remains visible at 360, 390 and 430 px in automated browser layout checks.
- Automated browser checks covered Today, Plan, Log, Progress, Recovery, Injury & Rehab, Race Day and Settings; no page-level horizontal overflow or JavaScript render errors remained in the tested baseline state.
- Scenario checks covered fresh onboarding, empty run history, invalid Settings input, manual-run modal opening, active injury creation, activation of a rehab plan, Daily Check-in opening/saving and check-in history creation.
- No calculation, prediction, adaptation, recovery, injury/rehab, import, matching or storage-schema logic changed.

v13.6.1 Bottom navigation visibility hardening — build 30601
------------------------------------------------------------
- Mobile primary navigation now uses five `minmax(0,1fr)` tracks so no tab can force another tab beyond the viewport.
- The fixed bar is explicitly contained to the full viewport width, with zero horizontal margin/transform and safe-area-aware bottom padding.
- Every mobile navigation button is constrained to its grid track; labels cannot expand the bar horizontally.
- Main content reserves bottom space beneath the fixed navigation on every tab.
- The More menu is anchored above the fixed navigation with safe-area clearance.
- Adds `interactive-widget=resizes-content` to the viewport declaration for browsers that support keyboard-aware viewport resizing.
- No training, prediction, adaptation, recovery, injury/rehab, race-day, import, storage or scoring calculation was changed.

v13.7.12 build 30712 — shoe-plan clarity and evidence update
- Race-day recommendation now labels the physical pair explicitly as EXISTING or PROPOSED FUTURE.
- Familiarity is incorporated into the integrated decision instead of emitting a separate "theoretically suitable / insufficient verified use" warning.
- Shoe graph legend labels all owned, future training-replacement and future race-day pairs.
- Rehab shoe-distance assumptions updated to 10:00/km walking and 6:30/km rehabilitation running; estimates remain Shoes-only.
- Added an optional link to the live official ASICS NL neutral range before purchase. Offline catalogue/recommendation remains the baseline because cross-origin live catalogue scraping is not dependable for this static offline-capable app.
- Shoe evidence hierarchy clarified: manufacturer profile -> observed physical-pair data -> model-derived workout/lifecycle/race-day decision.