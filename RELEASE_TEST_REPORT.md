# AI Running Coach v15.8.4 — Evidence Transparency QA

**Build:** 51840  
**Based on:** user's saved v15.8.3 complete flat upload package (build 51830)  
**Storage schema:** 10400, unchanged  
**Delivery:** complete replacement GitHub Pages static file ZIP; not deployed

## Problems corrected

1. **Overstated timer warning.** FIT duration and recorded timestamps often differ by a few fractional seconds. This build records actual `unassignedTimerSeconds`, detects mismatches conservatively and does not repeatedly label negligible boundary differences as alarming trailing gaps. The exact location of missing time is not presumed. Genuinely significant mismatches remain visible, significant discrepancies fail closed, long recording holes remain unknown.
2. **Excluded mixed workouts.** Hills, Easy + strides, and selected interval/mixed sessions are now inspected for physically verifiable, sufficiently long steady-running sections. Hills require measured altitude to verify terrain; quality runs require a dated LT2 anchor. No high-intensity, high-pain, high-RPE or uninterpretable section is promoted to aerobic evidence. This changes the LT1 evidence selection only, not race training intensity prescriptions or exercise scoring.
3. **Invisible rejected runs.** The Progress → LT1 observation details report now lists each recent run as **Accepted**, **Partially accepted**, or **Excluded**, with reason, source, verified duration and one-per-day counting. Older evidence with insufficient stored details is identified rather than recreated or made up.
4. **Historical activity repair.** Log → Import FIT/CSV now detects a matching already-saved activity and offers **Refresh recording evidence only**. This reuses detailed records from the re-upload and replaces just compact `lt1Evidence`, `trainingDose` and stored lap/timer evidence of the same original activity. It does not create a duplicate, rewrite workouts or recalibrate fitness history. Before saving, a second strict date/distance/timer match check prevents accidental cross-activity attachment; persistence failure restores original evidence.
5. **Understandable actual coverage.** Each recent run reveals HR and power sample coverage as seconds and percentage plus quantified timer discrepancy (if known). Old compact reports with missing timestamp-boundary diagnostics are labelled historical/unknown rather than given fabricated timings.

## Verification: source unit and regression suites

All tests were executed against the packaged source after the patch; no assertion was disabled to obtain a pass.

| Test suite | Passed | Failed |
| --- | ---: | ---: |
| Adaptive learning and guarded personalization | 219 | 0 |
| Automatic fitness | 21 | 0 |
| Automatic LT1 (existing compatibility) | 286 | 0 |
| Calibration integration | 25 | 0 |
| Calibration UI | 16 | 0 |
| Coach Intelligence v2 | 67 | 0 |
| Continuous aerobic fitness | 18 | 0 |
| VO₂max and fitness age | 41 | 0 |
| Plan timeline | 5 | 0 |
| Target comparison | 21 | 0 |
| Weekly review | 29 | 0 |
| **New FIT timing and LT1 evidence regression** | **130** | **0** |
| **All suites** | **878** | **0** |

The **130 new tests** include 34 direct assertions and 96 seeded fault injections covering rounded FIT timers, longer/implausible mismatches, pauses, missing HR/power/elevation, sensor coverage independent of intensity classification, mixed-workout steady sections, unqualified hills, quality-workout LT2 requirements, difficult workout safety exclusions, edited-activity evidence invalidation, same-day deduplication, historical compact evidence, HTML injection escaping and static reanalysis-source transaction invariants.

All six key JavaScript modules (`app.js`, `training-lt1.js`, `training-dose.js`, `training-gui.js`, `training-coordinator.js`, `coach-intelligence.js`) passed `node --check`.

## Browser integration

Chromium executed the real `index.html`, styles and app scripts with an in-memory copy of a prior training snapshot augmented by synthetic Oct 20/21/24 activity evidence (synthetic data strictly confined to the test browser, not included in the deliverable ZIP). Both **390 px phone** and **768 px tablet** widths passed without JavaScript page errors or horizontal overflow. Verified:

- 24 Oct **Hills** appears as *Excluded* with a meaningful terrain-related reason when no level section exists.
- 21 Oct **Easy + strides** appears as *Partially accepted* when its stable underlying section passes strict checks.
- Recording evidence includes HR and power coverage and a small quantified FIT timer difference, without the old alarming generic phrase.
- Recent activity and LT1 observation lists render correctly with persisted compact data.

## Cautions / what is not verified

- The **actual 2026-10-24 FIT file** and 2026-10-21 FIT were not supplied in this request. Their true measurement gaps and qualified steady-section disposition cannot be asserted from screenshots; re-import the original FIT files to re-analyse them with this engine.
- The historical snapshot was dated before these activities, so the browser scenarios used generated synthetic examples to test both inclusion and exclusion pathways. The tests do **not** constitute a clinical calibration or scientific validation of LT1 estimation accuracy.
- Static source checks exercised the non-duplication and transactional safeguard; an end-to-end re-import using the user's actual FIT files is still outstanding.
- Existing performance prediction, load planning, automatic VO₂max, threshold and coach-scoring algorithms remain unchanged.
- The ZIP is supplied for deployment to the existing GitHub repository; no deployment, browser-storage mutation or saved-history upload was performed.

## Packaging

The ZIP retains every file from the v15.8.3 complete flat package and adds `training-evidence-regression-tests.js`; all expected app references, schema and cache-busting version markers are updated to **v15.8.4 / build 51840**. No personal data backups, temporary fixture files or QA screenshots are included. The `SHA256SUMS.txt` manifest contains the SHA-256 of every other archive member.
