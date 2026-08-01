AI Running Coach v9.9.8 Stable — build 9980

This release changes only the Injury tab and its supporting injury data model.

Injury-tab changes:
- Blank pain and function fields remain unknown instead of becoming zero or positive evidence.
- Progression criteria now show Met, Not met or Not assessed.
- Rehabilitation stage progression requires repeated stable check-ins rather than one isolated observation.
- Higher-risk patterns in the leading differential pause app-directed progression.
- Pattern matching is shown qualitatively instead of as an unvalidated diagnostic probability.
- Clinician-entered diagnoses can use a clinician-provided recovery duration and are not independently verified by the app.
- Adds rehabilitation families for hamstring, other muscle strains, tendons, knee, ankle, foot, bone-stress concern and neural/exertional patterns.
- Replaces a single exact recovery date with an estimated recovery window and staged milestones.
- Moves the daily check-in action to the top and collapses detailed rationale, diagnosis and progress sections.
- Keeps all non-Injury calculations, plans, predictions, tabs and workflows unchanged.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9980 activates.


v9.9.8 Injury update
- Body-region constrained pattern matching prevents knee entries from returning hip or hamstring patterns.
- Injury library expanded to 50 running-related patterns.
- Treatment guidance is selected by clinically coherent rehabilitation family and safety-held for higher-risk patterns.
- Injury entry and review layouts reorganised around location, symptoms, current status, action and progression.


v9.9.8 Injury recovery update
- Adds broad condition-specific recovery windows for all 50 injury patterns and uses a central comparison point rather than presenting a single universal duration.
- Moves the most likely working symptom pattern to the top of each injury card.
- Restores a colour-coded recovery score: green ahead of nominal, amber close to nominal, red behind nominal, grey when evidence is insufficient.
- Explains which observed factors make recovery better or worse than the nominal pathway.
- Keeps all non-Injury calculations and workflows unchanged.


v9.9.8 Check-in and trajectory update
- Current and previous daily injury check-ins can be opened, corrected or deleted.
- Editing an earlier check-in recalculates all later recovery points and the unrestricted-running forecast.
- The recovery graph now displays the six rehabilitation phases, nominal trajectory, observed points and today's position.
- The estimated unrestricted-running date blends diagnosis baseline, current stage, observed recovery slope and adverse responses such as next-morning flare, new swelling or altered gait.
- No non-Injury workflow or calculation was changed.


v9.9.8 Longitudinal injury scoring update
- A rest day or unassessed running field no longer erases previously demonstrated running capacity.
- Recovery scoring uses the full check-in history, recent adverse responses, last observed capabilities and trend evidence rather than the latest day in isolation.
- Adds structured symptom, function, rehabilitation-load, running-exposure and delayed-response questions.
- Distinguishes no run planned, running not assessed, completed running, symptom-limited stopping and inability to start.
- The unrestricted-running forecast is recalculated from longitudinal stage, capability and response evidence.

v9.9.8 Rolling rehabilitation calendar
- Adds a rolling seven-day rehabilitation calendar to each active injury.
- Schedules load, recovery, assessment and running-progression days according to the current rehabilitation phase and injury family.
- Rebuilds future days after every saved, edited or deleted check-in.
- Treats rest days and unassessed running as neutral rather than loss of demonstrated capacity.
- Preserves completed activity through the dated check-in history and labels plans changed by new evidence.
- Shows the prescription, rationale and adjustment rule for each day.
- Keeps the seven-day calendar separate from the longer phase roadmap and estimated unrestricted-running window.


v9.9.8 Walking prescription update
- Replaces vague walking-as-tolerated wording with an adaptive target duration for every calendar day.
- Uses the latest demonstrated walking capacity, current rehabilitation phase, walking pain and recent flare evidence.
- Adds an optional daily stretch goal only when pain, gait and delayed response permit progression.
- Keeps safety-held injuries at comfortable activity without progression targets.
