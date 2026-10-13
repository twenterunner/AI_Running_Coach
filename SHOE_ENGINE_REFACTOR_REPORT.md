# AI Running Coach v15.7.21 / build 51021 — shoe-engine conflict and legacy cleanup

## Source authority & deployment status
Baseline: GitHub `twenterunner/AI_Running_Coach`, main @ `3fc753c71635a87e85c1bf1022d4c11209c6e4f6`, `app.js` Git blob SHA `4ed6a8f1b208d9f15fed035b2a479fccf40953f8` (identical to previously archived v15.7.19). Incorporates **v15.7.20** purchase-necessity fix. This archive **has not been committed or deployed**, because the GitHub connector returned `403 Resource not accessible by integration` when creating a branch.

## Structural cleanup
- Deleted **25 proven-unreferenced functions** from the existing shoe-engine and shoe-page render logic. These were verified by whole-source lexical occurrence checks and a syntactic check after removal.
- Removed **two redundant legacy end-stage optimisation loops** (the four-pass post-optimizer finalisation and the six-/eight-pass pre-retirement publication firewalls). The v15.7.20 post-retirement purchase necessity check remains the single final purchase-removal authority after all lifecycle/reconciliation steps.
- Replaced the misleading `shoeEngineGuaranteeTwoServiceablePairs` name with `shoeEnginePreferTwoServiceablePairs` to reflect actual behaviour: it only redistributes existing pairs and never creates a pair solely to satisfy the rotation preference. Removed a dead no-op 'hard pair count' validator block; two active pairs and weekly >=25% share remain soft targets, not purchasing requirements.
- Added strict `shoeEngineRebindExistingLedger` to ensure pair-local rows and the canonical master assignment rows share **one object identity** after speculative/global portfolio commits and rollbacks. The relinker never creates a new pair or rewrites a workout. Any missing pair is a hard error instead of silent recovery.
- Removed nonfunctional purchase-interval settings from the shoe-cache fingerprint, where they previously invalidated caches despite being unused by the optimiser.
- Renamed the recorded engine build ID and bumped cache/build assets to 51021. The user-data schema remains unchanged (`10400`).

## Verified regression checks
- 38 synthetic scenarios: **38/38 valid**, no hard shoe-invariant failures; all planned sessions assigned; no individually removable non-race planned purchase; deterministic repeat calls; no browser JavaScript errors.
- Exact purchase count matched the v15.7.20 baseline in **38/38** cases. The two-purchase bug reproduction continues to result in **one** justified purchase, not two.
- Race-day pre-start mileage was identical in 37/38 scenarios. One high-volume 140-day case changed from 64.4 km to 83.9 km of race-shoe familiarity. Both satisfy the race-shoe start-mileage window and lifecycle rules; this was recorded as a valid-but-changed decision and is **not** represented as output-identical.
- Historical data and training-plan logic were not deliberately changed. No actual local runner state was available; all tests used synthetic fixtures. Full production-data and varied-injury/override validation remains necessary for enterprise-grade assurance.

## Safeguards and unresolved scope
- No claim of eliminating **all** possible legacy code across a 1.2 MB single-file app. The retained lifecycle and beam optimisation stages still have nontrivial interactions. This refactor removes proven dead paths and duplicated final loops while preserving the live optimiser's safety behaviour.
- No changes to shoe model service-life calculation, suitability floors, race-day max mileage, runner overrides, storage keys, login, historical shoes or other non-shoe engines.
- No user data reset. Existing app settings and browser storage continue to use schema 10400.

## Deployment
Apply only these changed source files at the GitHub repository root: `app.js`, `index.html`, `manifest.webmanifest`, `service-worker.js`. Keep all unchanged CSS/assets and your existing GitHub settings. Wait for GitHub Pages to deploy. Verify the footer shows `v15.7.21 · build 51021`. Never clear local browser storage for updates.
