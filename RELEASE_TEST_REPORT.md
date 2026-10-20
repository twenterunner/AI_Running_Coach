# AI Running Coach v15.8.2 — implementation and verification

**Build** 51820 · **Source** v15.8.1 full GitHub release ZIP · **Date** 20 October 2026

## Changes delivered

- Created `adaptive-learning.js`: a deterministic, on-device, bounded personal model, with no remote learning service.
- Pace & Power signal importance (4 weights), quality-workout capability threshold (82 baseline) and run learning rate (0.65% baseline) are now eligible for personalization. Distance & Load 4 signal weights and positive/negative learning rates (1.20%, 2.50% baselines) are eligible too.
- Learning labels are **subsequent** comparable-run efficiency or future-session pain/execution; a run's own output is not its training target. Comparisons use chronological data and require a minimum of 20 relevant follow-up cases, 12 outcome dates, and an unseen holdout. Repeated re-tuning requires six newer outcome dates, using them as the new holdout.
- Regularization, parameter bounds, partial (30%) weight-step toward candidates, and no-change fallbacks limit sensitivity. Negative load learning cannot drop below the 2.50% original safety baseline. Existing pain and conflicting-evidence controls remain.
- The learner refreshes observations asynchronously after successful local saves. Accepted new settings are persisted locally and become effective only for runs starting the next calendar day. Recorded historical runs are not reinterpreted with a future calibration. Amended/deleted/retargeted history invalidates stale snapshots.
- Progress > Adaptive Learning shows baseline/validated status, counted follow-ups, held-out improvement (only when validated), effective dates, current/candidate rates, thresholds and weights.
- Clarified **easy-run performance gating**: theoretical capability can be positive, but a direct speed improvement is not applied to an easy run. Low execution may still produce a negative caution signal.
- Increased contribution-display precision to 7 decimals and displays the equivalent factor percentage, preventing nonzero contributions from appearing as `↔ 0.000`.

## Tests run in this delivery

| Suite | Passed | Failed |
|---|---:|---:|
| Existing eight app regression suites (re-run on this build) | 176 | 0 |
| Existing automatic LT1 suite | 286 | 0 |
| New personal adaptive model suite, including 200 deterministic malformed input cases | 219 | 0 |
| **Total Node assertions** | **681** | **0** |

A headless Chromium smoke/integration check loaded the whole six-script application and realistic saved running-app state in a fault-capable in-memory storage substitute at a 390 px mobile viewport with **no uncaught JavaScript errors**. Progress > Adaptive Learning rendered and reported baseline/insufficient data. A separately injected *synthetic historical parameter snapshot* changed the actual Pace & Power and Distance & Load signal weights and learning rates. Existing easy-run gating stayed zero for positive direct speed credit, and pain 5/10 continued forcing a negative load signal (−0.65). No injected snapshot or private data is bundled.

## Compatibility

- Storage schema remains 10400. Existing run history, assessments, shoe data, calibrations, and training plans stay in the browser. No backup restore or account sign-in required after replacing static files.
- `personalAdaptive` is an additive backup field; corrupted values are range-validated. The previous model's constants remain fallback baselines.
- Existing `training-lt1.js` and optimizer files remain included and unchanged except their release integration context. No other-sport/talk-test inputs have been reintroduced.
- The ZIP contains the **entire flat app**, not just patches. All source, images, CSS, manifests and test suites are present.

## Limitations and release boundaries

The optimizer is **experimental observational personalization**, not a medically validated predictor or proof of a causal effect of training. Subsequent pace/HR/power efficiency can be affected by terrain, weather, hydration, fatigue, sensor errors, concurrent illness and workout choice. Delayed future-run labels require time to accumulate; many users will appropriately remain at the original conservative rates for several weeks or longer. More observations do not guarantee that a personalized candidate will be accepted. Tuning rates does not retrain a neural network and does not promise better race outcomes.

The new code was verified offline in a browser harness and regression tests; Android PWA installation/updates, GitHub Pages actual deployment, full FIT binary import, sustained 350-run performance and service-worker activation were **not** revalidated in this turn. Preserve the same site origin and site storage. Do not clear the app's data when updating.
