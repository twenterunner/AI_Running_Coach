AI Running Coach v8.8.0 Stable — build 8800

Changes: Garmin previous-night HRV logging, baseline from first logged value, 7-value rolling average, HRV-informed adaptive factor, unique prediction-history points, race defaults through 100 km, and corrected version labels.

AI Running Coach v8.7.8 Stable (v8.7.8)

INSTALLATION
Replace all six files in the GitHub Pages repository. Keep the existing icon files. Fully close and reopen the browser tab or installed PWA once so cache 8780 activates.

V8.7.6 PLAN-SENSITIVE PREDICTION MODEL

1. Plan settings now influence the projected race result
- The full-programme scenario scores the actual planned peak weekly distance, peak long run, enabled running days, weekly growth limit, taper duration, intensity mix and whether the peak is reachable in the available build weeks.
- These settings affect marathon durability, the bounded central fitness gain and the taper benefit.
- A weak or incomplete plan therefore produces a materially smaller projected improvement than a well-constructed marathon plan.

2. Time model
- Race today starts with the latest valid assessment and applies a distance-extrapolation exponent.
- The exponent moves from 1.06 toward 1.115 when marathon-specific evidence is incomplete, preventing a short-race result from being treated as fully marathon-ready.
- Follow programme recalculates durability from the plan-quality profile and permits a bounded 0.8–3.5% central adaptation, scaled by available weeks, recovery and training opportunity.
- A valid taper contributes a separate capped benefit of up to 0.6%.

3. Probability model
- The central time is the median of an asymmetric finish-time distribution.
- The faster tail is narrower and the slower tail wider.
- Evidence coverage, extrapolation and execution confidence control the width.
- The displayed interval is the central 70% range. Current uncertainty is capped at 12 minutes standard scale; projected uncertainty at 8 minutes.
- Target probability is the distribution area at or faster than the selected target time and is displayed between 5% and 95%.

4. Prediction transparency
- Added an expandable calculation panel directly below Marathon Outlook.
- It shows the current central time, projected central time, plan-quality inputs, durability exponent, central adaptation, taper benefit and probability interpretation.
- Exact coefficients are explicitly identified as evidence-informed app calibration assumptions rather than a validated clinical equation.

5. Adaptive factor interaction
- The adaptive-factor calculation is completely hidden until the progression-factor tile is pressed.
- It expands inside the same tile position and collapses in place.

6. Training execution above 100%
- Completion and distance ratios may now display above 100% when more work was completed than planned.
- The progress bar remains visually capped at 100%; the numeric value preserves the actual ratio.
- Pace adherence remains a bounded quality score rather than a volume ratio.

REPRESENTATIVE MODEL CHECKS
Using a 25:15 5 km assessment and a 4:15 marathon target:
- Sparse marathon evidence: race-today estimate approximately 4:32 with a very low target probability.
- Weak 10-week plan (about 40 km peak, 24 km long run, 3 days/week): projected approximately 4:14 and about a 54% target probability.
- Moderate 14-week plan (about 55 km peak, 30 km long run, 4 days/week): projected approximately 4:07 and about a 93% target probability.
- Strong 17-week plan (about 80 km peak, 34 km long run, 5 days/week): projected approximately 4:02 and capped at 95% probability.
These are calibration tests, not guarantees. Changing the assessment, target, health, available weeks or plan settings changes the outputs.

BACKWARDS COMPATIBILITY
Existing schema-8500 data, completed runs, assessments and generated plans remain compatible.

HRV UPDATE IN v8.7.8
- Garmin previous-night HRV is used from the first logged value.
- 1 value: provisional baseline, no plan penalty.
- 2–3 values: maximum HRV moderation 1%.
- 4–6 values: maximum HRV moderation 3%.
- 7–20 values: maximum HRV moderation 6%.
- 21+ values: established model, maximum HRV moderation 10%.
- Early estimates are labelled by maturity and remain deliberately low influence.


v8.8.0 RECOVERY CONSOLIDATION
- Added one dedicated Recovery tab rather than duplicating HRV cards across the Dashboard.
- Consolidates Garmin HRV, pain status, overall recovery conclusion and Adaptive Factor contribution.
- HRV trend graph shows nightly values, recent average and personal baseline.
- HRV is used from the first logged value with staged influence: 0%, 1%, 3%, 6% and 10% maximum moderation as evidence matures.
- Detailed explanation confirms HRV changes future training load only and does not directly alter race prediction.
