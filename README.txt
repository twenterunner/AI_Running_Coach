AI Running Coach v10.0.20 Stable — build 10200

This release changes only the Injury tab and its supporting injury check-in logic.

Injury check-in consistency update:
- Related fields synchronise immediately while the user edits the form.
- Positive running minutes automatically create a completed running exposure unless the user explicitly records symptom-limited stopping.
- A completed run cannot coexist with a walk/run target marked not planned, not started or symptom-stopped.
- A symptom-stopped run automatically sets the walk/run target to symptom-stopped.
- Unable to start clears running details and records the planned walk/run target as not started.
- A run that was not planned remains neutral and can coexist with a completed walking target.
- Achieving the optional stretch goal requires completion of the applicable planned components.
- Completion remains separate from tolerance: pain and altered gait can limit progression even when the target was completed.
- The form displays a live plain-language interpretation before saving.
- Calendar badges, adherence, running-capacity evidence and recovery rationale use the same saved execution states.
- Existing injury records and older check-ins remain compatible.
- No non-Injury calculations, plans, predictions, tabs or workflows were changed.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA so cache build 10200 activates.


v10.0.20 execution consistency fix
- Walking-target execution and running exposure are separate authoritative inputs.
- Overall execution is withheld until exercises, walking and running each have an explicit answer.
- Not planned is neutral; not assessed prevents a misleading percentage.
- Calendar badges show exercises, walking and running separately.


v10.0.20 Injury check-in update
- Daily check-in questions are generated from the prescription scheduled for the selected date.
- Unscheduled exercise, walking, impact and running components are hidden and saved as not planned.
- The form displays the exact scheduled walking target, exercises and running/impact exposure before answers are entered.
- Saved check-ins retain a snapshot of that day’s prescription for later editing and auditability.


v10.0.20 Injury-date controls
- Injury date and rehabilitation-plan start date are independently editable.
- Injury age and prognosis continue to use the injury date.
- The seven-day calendar and adherence period use the rehabilitation-plan start date.
- The rehabilitation-plan start date cannot precede the injury date.
- Existing injuries migrate with the injury date as their initial rehabilitation-plan start date.

v10.0.20 Daily check-in consistency
- Every saved in-plan check-in must answer all activities scheduled for that date and therefore receives an execution score.
- A completed walking target requires actual minutes at least equal to the prescribed target; partial or symptom-stopped walking requires positive minutes; not started requires zero minutes.
- A completed or symptom-stopped run requires positive minutes; an unable-to-start run cannot retain running minutes.
- Walking minutes and execution status synchronize in real time.
- Calendar tiles now show one concise check-in/execution badge; component details remain inside the expanded day.


v10.0.20 Injury check-in consistency update
- Adds two explicit low-level impact-assessment days in every Stage 3-entry week (while the runner is in Build Capacity / stage index 2).
- Uses the rehabilitation-week cycle rather than absolute plan-day numbers, so assessment and run days repeat correctly after the first week.
- Requires explicit strength and impact-tolerance answers whenever those activities are scheduled.
- Keeps completion/adherence separate from tolerance; a fully completed impact session can still be marked not tolerated and will not advance progression.
- Verifies that every progression criterion has a scheduled assessment opportunity and that hidden, unscheduled fields are saved as not planned.


v10.0.20 contradiction-proof check-in
- Exercise execution now controls whether strength and impact tolerance may be assessed.
- Not-started work clears tolerance; symptom-stopped work records not tolerated.
- Dedicated impact assessment remains separate from later running exposure.
- Previous-load worsening and response categories synchronize automatically.
- Save-time validation rejects any residual incompatible state.


v10.0.20 Injury recommendation intelligence
- Replaces generic optional stretch goals with stage- and rehabilitation-family-specific progression.
- Withholds optional loading after pain, gait, swelling or delayed-response concerns and for bone-stress/safety-held patterns.
- Adds an explanation for why each stretch goal is offered or withheld.
- Adds a best-possible-outcome statement to every rehabilitation day.
- Adds a transparent recommendation-evidence meter based on check-in completeness and relevant functional evidence.
