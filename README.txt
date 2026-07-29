AI Running Coach v8.7.3a Stable (build 8731)

FILES
- index.html
- styles.css
- app.js
- manifest.webmanifest
- service-worker.js
- README.txt

DEPLOYMENT
Replace the six files in the GitHub Pages repository. Keep the existing icon files. After deployment, fully close and reopen the browser tab or installed PWA once so cache 8731 activates.

V8.7.3 MODEL AND DASHBOARD UPDATE

0. Asymmetric outcome range
- Finish-time uncertainty now uses a split-normal distribution rather than a symmetric range.
- The faster-than-predicted tail is shorter; the slower tail is longer to reflect the greater number of ways a marathon can underperform capability (durability, pacing, fuelling, weather, illness and pain).
- Target probability is calculated from this same asymmetric distribution.


1. Realistic race-today versus full-programme outlook
- A short-distance assessment is no longer extrapolated to a marathon with one fixed exponent.
- Race Today uses a conservative marathon-durability correction when long-run, volume and race-specific evidence are incomplete.
- Follow Programme projects the durability correction after completing the planned long runs and quality work.
- It also permits a modest, capped central fitness adaptation of up to 2.5%, with diminishing returns and health/training-opportunity limits.
- Preparation therefore affects both marathon transfer and forecast uncertainty, but does not overwrite the underlying assessment result.

2. No invented 50 scores
- A component with zero evidence now displays Not scored / N/A.
- Missing evidence widens uncertainty instead of being shown as a neutral score.
- Preparation time is future opportunity and no longer counts as proof of current marathon preparation.

3. Training execution breakdown
- Shows completed versus due sessions for all runs.
- Shows completed versus due distance.
- Separates easy/recovery, tempo/interval/assessment, quality-run pace and long-run completion.
- Quality pace uses matched completed workouts and a tolerance around the planned main-set pace. It is identified as an approximate whole-run check where split-level pace is unavailable.

4. Prediction trend clarification
- Each qualifying run import, edited run or assessment can save a dated prediction point.
- The chart shows movement in the central marathon estimate over time against the target line.
- It does not repeat the current versus programme uncertainty comparison from Marathon Outlook.

5. Dashboard and plan cleanup
- Training intensity mix moved from Dashboard to the Plan tab.
- Longest verified run continues to show the planned peak-long-run distance.
- Preparation milestone section remains removed.

MODEL LIMITS
This is a transparent coaching forecast, not a clinically or statistically validated individual race guarantee. The dynamic fatigue exponent, adaptation cap, uncertainty coefficients and probability labels are conservative model assumptions. They should be calibrated against actual marathon outcomes before being treated as population-validated coefficients.

VALIDATION
- JavaScript syntax checked.
- Manifest JSON checked.
- Duplicate HTML IDs checked.
- Version, build, service-worker and asset-cache references synchronised.
- Existing storage schema and athlete data remain backwards compatible.

5. Dashboard and Plan layout
- Projected scores were removed from the visible execution-confidence model; it shows current evidence only.
- Training execution to date now sits under Progress to race.
- The Plan tab shows three intensity mixes: next week, all completed runs to date and the overall programme.
