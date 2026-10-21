# AI Running Coach v15.8.3 — Coach Intelligence v2 QA report

**Build:** 51830  
**Baseline:** v15.8.2, released 20 October 2026  
**Storage schema:** 10400, unchanged  
**Deployment:** fully packaged as flat replacement GitHub Pages site files; not deployed to a live GitHub repository.

## What changed

- Added `coach-intelligence.js`: pure read-only interpretation of imported run physiology, existing workout scoring and two-pathway outputs, HR/pace fitness timeline, dated calibration records, readiness and prediction snapshots. No new engine is allowed to update the plan or athlete state.
- Added `coach-intelligence.css`, scoped to Today; one daily/post-run evidence panel with explicit verdict, component scores and their weights, physiology/metric deltas, 7/28-day load context, race forecast distinction, next action, and expandable provenance.
- Adapted **one** active `consolidatedTodayCoachBriefing` function in `app.js`. Removed redundant standalone automatic-fitness summary from Today only; the original fitness algorithm and Settings summary remain unchanged.
- Adjusted Today decision wording so a 176% completed-vs-prescribed run cannot be described simply as "bank a high-quality session". Full scoring itself is unchanged.
- Fixed existing null-data presentation: unknown pain is not 0/10, unavailable RPE/pain is not treated as a measured good recovery signal, no derived positive or negative fitness delta is fabricated from retained legacy CP/LT2/pace settings.
- Incremented HTML, JS, manifest, service-worker and static build markers to `15.8.3` / `51830`.

## Existing regression suite

| Suite | Passed | Failed |
|---|---:|---:|
| Adaptive learning and guarded personalization | 219 | 0 |
| Auto-fitness | 21 | 0 |
| Automatic LT1 | 286 | 0 |
| Calibration integration | 25 | 0 |
| Calibration UI | 16 | 0 |
| Continuous aerobic fitness | 18 | 0 |
| VO₂max and fitness age | 41 | 0 |
| Plan timeline | 5 | 0 |
| Target comparison | 21 | 0 |
| Weekly training review | 29 | 0 |
| **Existing suites total** | **681** | **0** |

The three pre-existing tests that required the hardcoded version/build markers were updated to the new release values; no behavioural assertion was removed or bypassed.

## New coach-specific regression

**67/67 passed**, including unknown-vs-zero handling, strictly dated 7/28-day observations, leap dates, missing baseline/estimate, future-record exclusion, duplicate-run deduplication, missing HR/power/RPE/pain, score provenance and unchanged weighting, 176% run overshoot, high pain override, no unconditional green verdict with missing recovery signals, tiered comparable-run confidence, full source replay, and 200 malformed-input fault injections.

## Browser integration

**10/10 Chromium scenarios passed**, tested with the packaged app source in a headless browser using an *in-memory* test fixture from a prior training-backup snapshot (not included in this ZIP). Synthetic runs were only created inside the test browser to exercise failure branches.

- Pre-run Today at 320, 390 and 768 px
- Overshoot post-run Today at 390 and 1200 px
- High-pain post-run override at 390 px
- Under-distance/missing-sensors scenario
- Normal-distance/missing-recovery scenario
- No runs/assessments scenario: unobserved VO₂max/pain explicitly unknown
- Future-run injection: future data excluded from rolling load

All 10 scenarios had one intelligence panel, six physiological metric cards, two distinct marathon estimate categories, working score audit disclosure where applicable, zero JavaScript page errors and no horizontal overflow.

## Conflict audit

There is still only one computational authority per domain: workout score from `workoutScoreDetails`, comparable-run context from `comparableRunAnalysis`, thresholds and power from `calibrationFor`/automatic fitness, VO₂max and fitness age from `fitnessTrajectory`, LT1 from `arcCurrentLT1`, race forecast from `coachEngine`, readiness from `readinessModel`, plan changes from the existing guarded planner. The new interpreter performs only aggregation, difference reporting, conservative verdict labels, and HTML representation.

The coach-specific module makes no network requests, writes no persistent storage, changes no existing training-plan rules, and does not call the learning update routines. No new storage schema or migration is introduced. The existing adaptive-learning and automatic-fitness tests passed unchanged apart from version-assertion updates.

## Limits and release qualification

Results are not laboratory VO₂max/LT1/LT2, clinical injury diagnoses, or measured future marathon performances. Comparisons may reflect measurement noise, terrain, heat, footwear, hydration or unusual effort. Retained legacy threshold or power values cannot generate observed trend claims. The user's current live GitHub Pages site has **not** been modified; the release must still be published and checked on the actual device/browser with the user's current local data.

The ZIP must be extracted before uploading its individual files; GitHub does not deploy an archive merely because it is uploaded.
