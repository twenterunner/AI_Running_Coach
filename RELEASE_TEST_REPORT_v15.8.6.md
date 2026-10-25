# AI Running Coach v15.8.6 / Build 51860

**Build date:** 25 October 2026  
**Source:** `twenterunner/AI_Running_Coach`, GitHub Pages deployment from commit `b4e4fcdaad8cd4907c0ecd206eaf409a8abc50c0`.  
**Source build:** v15.8.5 / 51850. **New build:** v15.8.6 / 51860.  
**Storage schema:** 10400, unchanged.

## Change scope

1. Original FIT/CSV power-based cardiac-drift formula and stored signed measurements are unchanged.
2. A single predicate excludes zero/negative/nonfinite measurements from the visible Progress chart, run cards, summaries, coaching outcomes, workout/physiological scoring, race durability evidence, and personal response aggregates.
3. Displayed positive percentages retain measured values, with additional precision for results below 0.1% to avoid a false displayed 0.0%.
4. Excluded observations create gaps; chart Y-axis remains strictly positive. When no eligible observations exist, the app shows a clear exclusion/no-evidence message.
5. UI text, version/build markers, installed-PWA cache references and documentation were updated.
6. Two isolated test harnesses now load the shared drift helper. Their weekly fixture uses 1.5% positive drift to verify unrelated weekly-load arithmetic without treating an excluded 0% as positive evidence.

## Deterministic regression test results

The complete 22-suite `*regression-tests.js` batch was run under Node.js 22.16.0 on both the supplied Pages baseline and the updated source. All 14 suites expected to pass on the current source are green:

| Suite | Result |
|---|---:|
| adaptive-learning | 219/219 |
| auto-fitness | 21/21 |
| automatic-lt1 | 286/286 |
| calibration | 25/25 |
| calibration-ui | 16/16 |
| **cardiac-drift (new)** | **12/12** |
| coach-intelligence | 67/67 |
| continuous-fitness | 18/18 |
| fitness-age | 41/41 |
| plan-timeline | 5/5 |
| run-type-chart | 7/7 |
| target-comparison | 21/21 |
| training-evidence | 130/130 |
| weekly-review | 29/29 |

**14 passing suites, 897 passing cases**, using each suite's own reported case counts.

Eight historical suites continue to fail identically on both the original v15.8.5 source and this update: `migration-regression-tests.js`, `performance-regression-tests.js`, `shoe-engine-v15-regression-tests.js`, `shoe-engine-v15.0.4-regression-tests.js`, `v15.0.5-regression-tests.js`, `v15.0.6-update-regression-tests.js`, `v15.1.0-regression-tests.js`, `v15.1.1-regression-tests.js`. Their existing assertions include older build/version strings, retired symbols, or legacy functions. These failures predate the drift fix. They are preserved, not silently removed or counted as passing.

Additional checks: updated JavaScript files parse; 16 edge cases (zero, negative, tiny positive, strings, missing and invalid inputs) were checked in the version-locked patch preflight; chart point gaps, exclusion notice, empty positive-data case and strictly positive scale were verified by the independent new tests.

**Limitations:** Chromium browser navigation to local HTTP/file URLs is blocked in this execution environment (`ERR_BLOCKED_BY_ADMINISTRATOR`), so a live full-app browser smoke test was not completed. The isolated Progress chart and other Node regression tests passed. No user FIT file or local PWA storage was modified, and no GitHub push occurred.

## Recommended manual acceptance test

After deploying the extracted files to your existing GitHub Pages origin, confirm the header shows **v15.8.6 · build 51860**. Open Progress → Aerobic durability and verify that the chart and comparable-run cards show only positive drift percentages, zero/negative readings appear nowhere as numbers, and the explanatory exclusion text is visible where applicable. Confirm regular training history and other charts still display normally.
