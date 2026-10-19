# AI Running Coach v15.8.0 — release verification

**Build:** 51800  
**Basis:** uploaded v15.7.30 source, matched byte-for-byte to the recovered v15.7.30 package.  
**Baseline source commit:** `90be017b1d3b0f70bc8bbb05d5567e860a0830c0`.  
**Disposition:** complete static application package; new optimizer defaults to Shadow.

## Executed release gates

| Suite / scope | Passed |
|---|---:|
| Existing baseline regression suites | 176/176 |
| Training-dose module | 634/634 |
| Workout coordinator module | 533/533 |
| Additional boundaries | 20/20 |
| Full-app integration and layouts | 57/57 |
| Full-app import, persistence and fault workflows | 34/34 |
| Populated shoe-engine baseline comparisons | 9/9 |
| Isolated GUI controls | 18/18 |
| **Total executed gate checks** | **1481/1481** |

The dose suite includes 600 fixed-seed sensor/boundary scenarios. The coordinator suite
includes 500 fixed-seed allocation scenarios. These are synthetic test cases, not 1,100
independent athlete trials or evidence of physiological/predictive accuracy.

The eight existing baseline suites total 176 cases and passed both before and after
integration. Only version/build assertions were updated in the two release-marker checks;
existing behavioral assertions were not relaxed. All five active JavaScript files pass
Node syntax checks. Every one of the 34 statically identified local asset references resolves.

## Full-application coverage

The complete app.js and styles.css executed in Chromium, with populated synthetic history.
Tests compared the new Shadow/Off paths with the legacy application; exercised actual
configuration controls, imported CSV recordings, retry after failed save, duplicate rejection,
manual create/edit/delete, calibrated target changes, assessment synchronization, populated
rehabilitation, pause/re-entry protection, backup download/restore, invalid backup rejection,
full application reload and all principal tabs. Layout checks covered 320, 360, 390, 430,
768 and 1280 px widths. The eight populated shoe scenarios produced the same decisions and
valid assignment counts as the baseline. No uncaught JavaScript exceptions were observed
in the completed full-application suites.

## Fault injection and boundaries

Injected failures covered measurement exceptions, optimizer exceptions, malformed outputs,
mutating callbacks, increased distances, altered power targets, changed historical workouts,
undeclared plan changes and persistence failures. Integration checks verify fallback to the
core baseline, no corruption of the original activity, no duplicate import, and no falsely
reported successful save. Missing extension modules leave the original application usable.

Input tests include missing/null/NaN/infinite readings, duplicate and conflicting timestamps,
unsorted samples, pauses, inconsistent timer durations, long gaps, invalid and future dates,
LT1/LT2 ordering, absent LT1 or CP, future calibration dates, stale summaries after activity
edits, corrupted persisted bands/coverage, maximal supported durations and record limits,
insufficient response evidence, unknown pain, global adaptation disabled, injuries, locked
sessions and taper/horizon boundaries. Active changes never increase a per-session or weekly
running allowance or apply an additional recovery multiplier.

## Defects found and corrected during integration

- The first bridge location fell inside a date-helper extraction boundary used by the
  existing calibration suite. Moving it restored all 25 unchanged calibration checks.
- The baseline could rebuild an absent plan before its recovery cache had initialized when
  historical runs existed. Startup rebuild and link reconciliation now run after initialization.
- Old dose summaries needed activity-date/duration/distance provenance and invalidation after edits.
- Demoted workouts could retain irrelevant interval fields from the old prescription. These
  fields are now cleared before the existing prescription generator fills the new structure.
- Accepted workout types needed to survive their transition into the current training week.
- The bridge now isolates optimizer inputs and independently rechecks output authorities.
- Completed-week active reviews are persisted and checked on startup/import, avoiding a
  feature that would otherwise run only when its settings were manually saved.

## Additional historical rehabilitation checks — separate known differences

An older v16.1.0 static rehabilitation suite was recovered and run as an extra comparison.
It produced **26/28 passes in BOTH v15.7.30 and v15.8.0**. Its two failures expect automatic
phase rollback and a displayed regression magnitude. The supplied baseline instead retains
its highest attained phase (`stage=peakStage`, `regressedBy=0`, `setback=false`). That behavior
is unchanged in this release; the older checks were not relabelled as passes or rewritten
to conceal the difference. Their logs remain in the QA archive, outside the release-gate total.
This is not a new regression, but neither this test nor the new optimizer validates clinical
rehabilitation recommendations. The optimizer makes no changes while rehabilitation is active.

## Important test limitations

- This environment blocks normal browser navigation to local/deployed app URLs. Full-app
  browser tests therefore executed the actual application in Chromium about:blank with an
  in-memory, fault-capable localStorage API. They validate JavaScript integration, persistence
  contracts and rendering, **not native browser storage/eviction, installed Android PWA behavior,
  live GitHub Pages deployment, browser cache upgrades or service-worker activation**.
- CSV upload and parsing were exercised end-to-end within that harness. FIT adapter tests
  supplied deterministic decoded message fixtures and checked the actual importer, retained
  altitude/timer fields and compaction. The network-fetched external Garmin FIT SDK and an
  actual watch-generated binary recording were not revalidated in this environment.
- No current personal athlete backup was supplied or used. Tests use synthetic fixtures;
  they do not exhaust every possible combination of historical stored user data.
- Mathematical bounds and regression tests do not establish that a workout is medically
  appropriate, that a goal forecast is calibrated, or that optimization improves marathon outcomes.

## Packaging and installation

The deployment ZIP has no enclosing folder and includes the complete active app, updated GUI,
original stylesheet, service worker, manifest, existing icons/shoe imagery, release notes and
baseline regression scripts. It contains no installer patch, mock storage code, synthetic
athlete backup, QA exports, node_modules or developer backup folder.

Back up the existing app's JSON first. Extract and upload every file into the existing
repository root, replacing matching files. Keep the same Pages address and browser storage.
After deployment, verify **v15.8.0 / build 51800**. Do not reset the app or clear site data.
Shadow preserves the existing workout mix; Active is available through the new Training controls.

The measurement benchmark in this container processed 3,601 samples in about 8 ms and 14,401
samples in about 11 ms. These are single-container observations, not Android performance promises.
