AI Running Coach v9.9.0 Stable — build 9900

This release expands the Injury tab's working-diagnosis engine for common running injuries.

Changes:
- Adds a library of 32 common running-related injury patterns across hip, groin, thigh, knee, shin, calf, Achilles, ankle and foot.
- Ranks the three most likely working diagnoses from body region, exact location, onset, mechanism, symptoms and pain triggers.
- Shows pattern confidence, supporting evidence, alternative diagnoses and information still needed to improve confidence.
- Adds structured injury inputs for body region, sudden/gradual onset and activities that reproduce symptoms.
- Uses diagnosis-specific nominal recovery durations, adjusted for reported severity, when estimating full unrestricted running training.
- Flags higher-risk Achilles and bone-stress patterns for clinical assessment before progression.
- Preserves the existing rehabilitation stages, daily check-ins, nominal comparison and recovery graph.
- Does not change any non-Injury tab calculations or workflows.
- Updates schema, manifest and service-worker cache to build 9900.

Deployment:
Replace all six application files in the GitHub Pages repository. Retain the existing icon files. Fully close and reopen the installed PWA after deployment so cache build 9900 activates.
