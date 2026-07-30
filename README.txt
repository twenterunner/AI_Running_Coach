AI Running Coach v9.5.0 Stable — build 9500

Prediction architecture update

- Uses the latest valid assessment as the race-performance baseline.
- Uses the existing Fitness Index as the single general-fitness update pathway for current race predictions.
- Adds an explicit Durability Index derived from current volume, long-run execution and race-specific preparation.
- Removes fixed seconds awarded to ordinary completed workouts, preventing duplicated training benefits.
- Current race time is calculated from assessment capability, Fitness Index and distance-specific Durability.
- Future race time projects both Fitness and Durability using plan quality, realistic expected execution, current health, training opportunity and diminishing returns.
- Future execution is no longer assumed to be 100%; it is bounded using observed plan execution.
- Prediction tolerances separately combine assessment age, distance transfer, Fitness evidence, Durability evidence and execution uncertainty.
- Future tolerance additionally includes adherence and adaptation uncertainty and is therefore not automatically narrower than the current range.
- Prediction-history entries now store model snapshots and index values rather than fixed workout rewards.
- Existing configurable training days and external GitHub icon files are preserved.

Installation

Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9500 activates.
