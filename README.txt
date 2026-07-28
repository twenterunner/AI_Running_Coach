AI Running Coach v8.5.2 Stable — build 8520

INSTALLATION
Replace index.html, styles.css, app.js, manifest.webmanifest, service-worker.js and README.txt together. Keep the existing icon files in the same repository. After GitHub Pages deploys, close and reopen the installed PWA once so build 8520 activates its new service-worker cache.

v8.5.2 SCIENCE-BASED TRAINING-OPPORTUNITY UPDATE

Training frequency now changes both current readiness and predicted race-day readiness immediately. The calculation is no longer a fixed deduction.

1. NON-LINEAR BASE OPPORTUNITY
Base opportunity = (enabled training days / minimum effective days)^1.6, capped at 100%.

Minimum effective days for performance-oriented preparation:
- 5K: 3 days/week
- 10K: 3 days/week
- Half marathon: 4 days/week
- Marathon: 4 days/week

Ideal load-distribution reference:
- 5K and 10K: 5 days/week
- Half marathon and marathon: 6 days/week

2. RACE-DISTANCE IMPORTANCE
The maximum normal Build-phase confidence consequence scales with distance:
- 5K: 5 percentage points
- 10K: 8 percentage points
- Half marathon: 12 percentage points
- Marathon: 18 percentage points

3. TRAINING-PHASE MULTIPLIER
- Base: 0.7
- Build: 1.0
- Peak: 1.3
- Taper: 0.3

4. AMBITION MULTIPLIER FROM PLANNED PEAK WEEK
- below 30 km: 0.6
- 30 to below 45 km: 0.8
- 45 to below 60 km: 1.0
- 60 to below 75 km: 1.2
- 75 km or more: 1.5

The app also calculates the implied average peak kilometres per enabled running day for diagnostics. The selected schedule is therefore judged in the context of race distance, phase and planned workload rather than by frequency alone.

DATA COMPATIBILITY
Schema remains 8500. Existing runs, assessments, plans and settings are preserved. Future plan sessions are rebuilt when settings are saved.
