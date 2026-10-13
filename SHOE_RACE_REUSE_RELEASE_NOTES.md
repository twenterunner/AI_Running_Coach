# AI Running Coach v15.7.22 · build 51022

## Verified cause (current repository code)
The preferred Race Day start-line mileage window (for example 42–169 km on SUPERBLAST 3) was treated as a hard feasibility rule in merge, finalisation, post-processing and validation. As a result, a safe training replacement pair with 170–249 km could be denied the Race Day role, and the engine would buy a second physical pair of the same model. This is a proven inconsistency in the existing code.

## Change
- Race Day preferred upper-band is a soft performance preference, not a purchase-forcing hard ceiling.
- Absolute race-start <250 km, race-distance + remaining-life reserve, physical serviceability, session suitability and minimum familiarisation are unchanged hard constraints.
- Existing and already-planned race-capable pairs are considered before a new Race Day purchase.
- Duplicate planned training/race physical-pair merge can succeed above the preferred upper-band when within the absolute cap.
- Race-window validation and finalisation agree on the same physical safety rules.
- The race page and chart label the old band as preferred, and show when an over-band but safe pair was selected.
- The snapshot fingerprint and service-worker/web assets are bumped to build 51022; persistent user data schema 10400 is unchanged.

## Reproduction and validation
Synthetic 2026-10-13 → 2027-04-11 programmes with 2 owned pairs (NOVABLAST 4 initial 310 km; SUPERBLAST 3 initial 87 km):
- ~58 km/wk: v15.7.21: 2 purchases; fixed: 1 purchase, race-start 162.1 km.
- ~60 km/wk: v15.7.21: 2 purchases; fixed: 1 purchase, race-start 199.8 km (above preferred but safely below 250).
- ~62 km/wk: 2 purchases remain; direct pair consolidation would exceed 250 km before the race.
- ~65 / ~75 km/wk: two purchases remained; combined mileage exceeds safe race start window.
Eight standard baseline cases also passed: hard invariants, deterministic repeat, no individually removable future training purchase, complete assignment ledger, no browser JavaScript errors.

Tests above are synthetic. User device-local shoe log, injury/rehab state and current training plan were not accessible, so the screenshot's exact numerical purchase necessity is not reproduced. Production GitHub has not been changed by this archive. No claim is made of certainty without a user-data replay.

## Deployment
Upload the four changed files (`app.js`, `index.html`, `manifest.webmanifest`, `service-worker.js`) into the root of `twenterunner/AI_Running_Coach` replacing existing files. Wait for the Pages deployment and confirm build 51022. Do not erase browser/local storage.
