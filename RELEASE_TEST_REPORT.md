# AI Running Coach v15.8.1 — verification and release notes

**Build:** 51810  
**Basis:** v15.8.0 full uploaded ZIP (49 files); complete flat replacement app  
**Disposition:** functional replacement ZIP; automatically inferred LT1 remains experimental and defaults to unavailable if unsupported.

## Completed execution checks

| Suite | Passed | Failed |
|---|---:|---:|
| Eight original application regression suites | 176 | 0 |
| New automatic-LT1 regressions (including 250 deterministic corrupted-input and boundary scenarios) | 286 | 0 |
| Full application Chromium integration (legacy plan comparison, every main tab, storage faults, optimizer fallback, responsive widths, reload) | 51 | 0 |
| Real 2,201-row CSV import through the complete app, persistence, compaction, reload | 9 | 0 |
| **Total** | **522** | **0** |

The full app's **Shadow-mode plan and original Pace & Power / Distance & Load calculations** were tested against the frozen v15.8.0 baseline using matching synthetic athlete history. The current week, linked/completed prescriptions, target sources and load factors were preserved in optimizer Active/Off/Shadow tests. The selected protected workouts were not modified. The optimizer continues to block unsafe and invalid proposals. The original eight suites passed after the source integration and the separate LT1/sensor regressions and end-to-end browser checks passed after subsequent refinements.

## Input, failure and boundary scenarios

- Zero data; archived runs lacking per-second records; weak FIT lap averages; insufficient days; identical HR ranges with no transition; all-stable and all-high-drift series; reversed HR ordering; missing/future-dated LT2.
- Records sampled once per second or with missing data; duplicate/conflicting timestamps, out-of-order and invalid samples, long HR gaps and pauses, speed/power drift, hills, data-age and duration editing, race/interval exclusion, pain and high exertion.
- Invalid automatically estimated LT1 is *not* promoted to training-zone data. Only a supported low-confidence provisional result can reclassify saved valid per-bpm HR histograms; missing older raw activity remains unknown.
- Optimizer intentionally drops legacy LT1/manual talk-test and other-sport settings, retains only Off/Shadow/Active mode, and does not add a second volume multiplier.
- Injected primary browser-storage failure, throwing optimizer, throwing training-dose engine and missing extension modules did not overwrite the authoritative core baseline in tested cases.
- GUI: all primary pages and the new LT1/review cards rendered in Chromium with no uncaught exceptions. Tested 320, 390 and 768 px layout widths; complete app imported actual detailed CSV, compacted stream after deriving HR evidence and restored after reload.

## Clinical and measurement limitations

The **automatic LT1 is not a physiological measurement or independently calibrated LT1 predictor**. Stable heart-rate-to-power/speed decoupling can suggest aerobic durability, but drift is confounded by heat, fatigue, terrain, hydration and exercise duration. The model only displays a provisional HR breakpoint if repeated observations bracket a plausible change; a failure to identify it is expected with many normal training histories. LT2 or CP does not by itself identify LT1. There are no speech or talk-test requirements, and no RR-beat-level DFA-alpha1 calculation; second-by-second HR is not RR-interval HRV.

The test dataset is synthetic; 522 software checks **do not** demonstrate clinical accuracy, safety for every athlete, improvements in marathon outcomes, or statistically calibrated race-goal probabilities.

## Test-environment limitations

The full-app Chromium tests ran the actual application code and styling in a browser harness with an in-memory, fault-capable localStorage substitute. Installed Android PWA upgrades, real GitHub Pages production deployment, native localStorage quota/eviction and service-worker activation were **not** revalidated. Detailed CSV parsing was exercised end to end; the externally loaded Garmin FIT SDK was not tested against a freshly exported physical-watch FIT binary in this turn. QA screenshots are not included in this release report.

## Data protection

No user backup, athlete history, private source files, raw HR traces or test fixture state is bundled. The release keeps schema 10400 and existing primary/mirror storage keys. Derived per-run LT1 evidence is a new additive field; previously compacted recordings are not reconstructed. Completed historic workout prescriptions are not rewritten. Standard backups remain compatible with stored additive fields.

## Installation

Extract the **FULL_UPLOAD** ZIP and upload every extracted file into your existing GitHub repo root; do not upload the ZIP itself or put it inside a subfolder. Use the same Pages URL/browser, avoid reset and clearing site data, and verify **v15.8.1 / build 51810** in Settings. A backup is optional insurance rather than a required migration action.
