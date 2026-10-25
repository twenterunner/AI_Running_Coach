# AI Running Coach v15.8.5 — Chart readability release QA

**Build:** 51850  
**Baseline:** v15.8.4 full GitHub upload ZIP, build 51840  
**Local data schema:** 10400 (unchanged)  
**Scope:** Visual identity in comparable-run Progress charts only

## Modification summary

- Introduced a centralized mapping from run type to an accessible high-contrast
  color and one of multiple reproducible SVG marker shapes.
- `metricSeries` now returns the marker along with its existing values/color.
- Both chart renderer paths use the run-type marker shape; legends show the
  correct colored line plus symbol; the expandable metric type card uses the
  same glyph. Other chart series without run-type markers retain old behavior.
- No activity-data parsing, models, physiology calculations, workout compliance,
  training planning, athlete storage, migration, or integrations changed.
- Updated app, manifest, HTML CSS/JS cache URLs and service worker to 51850.

## Automated verification

12 unchanged existing regression suites ran against this complete packaged
source (their version marker assertions were updated for v15.8.5):

| Existing suites | Passed | Failed |
| --- | ---: | ---: |
| Adaptive learning | 219 | 0 |
| Automatic fitness | 21 | 0 |
| Automatic LT1 | 286 | 0 |
| Calibration integration | 25 | 0 |
| Calibration UI | 16 | 0 |
| Coach Intelligence v2 | 67 | 0 |
| Continuous aerobic fitness | 18 | 0 |
| VO2max and fitness age | 41 | 0 |
| Plan timeline | 5 | 0 |
| Target comparison | 21 | 0 |
| Training evidence | 130 | 0 |
| Weekly review | 29 | 0 |
| **Existing total** | **878** | **0** |
| **New run-type chart QA** | **7** | **0** |
| **Total** | **885** | **0** |

Additional checks: `node --check` for all `.js` files. A test browser loaded
the actual mapping and inline-SVG rendering functions extracted directly from
the modified app source, with illustrative synthetic observations at **360,
390 and 768 CSS pixels**. Both chart legends included four matching symbols,
there were no page errors or renderer diagnostics, and no horizontal overflow.

## Scope limits

The browser fixtures use synthetic values solely for appearance and rendering
validation, not the user's activity history; a live GitHub Pages deployment
was not performed. The data shown in the optional visual preview is synthetic.
No actual run FIT files were imported for this change, as the calculation path
was not modified. Existing user data should remain on its current app origin.
