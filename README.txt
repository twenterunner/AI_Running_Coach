AI Running Coach v10.0.4 Stable — build 10040

This release changes only the Injury tab and its supporting injury data model.

Injury-tab changes:
- Each major topic now has its own card: diagnosis/prognosis, clinician cross-check, recovery overview, adherence, today’s plan, seven-day calendar, milestones, progression criteria and check-in history.
- Exercise technique is integrated beneath today’s prescription instead of appearing as an unrelated standalone section.
- Clinician-entered information is independently classified as confirmed, partly agreed with, or contradicted by the app assessment.
- A second injury can be assessed in parallel without replacing the current injury record.
- Diagnosis and prognosis are shown before the user chooses whether to follow the new recovery plan.
- Only one injury recovery plan can be active at a time; switching plans requires explicit confirmation.
- Inactive injuries remain available as parallel assessments but do not generate the active daily plan, adherence or calendar.
- No non-Injury calculations, plans, predictions, tabs or workflows were changed.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA so cache build 10040 activates.

v10.0.4 Injury check-in correction
- Positive running minutes automatically set the running status to Run completed.
- The form no longer discards entered running minutes when the status was left at Not assessed.
- Legacy check-ins containing positive running minutes are interpreted as completed running evidence.
- Running status and duration are validated before saving.
