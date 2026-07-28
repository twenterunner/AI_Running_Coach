AI Running Coach v8.5.6 Stable — build 8560
Schema: 8500 (backwards compatible)

Replace index.html, styles.css, app.js, manifest.webmanifest, service-worker.js and README.txt together. Keep the existing icon files in the same repository. After GitHub Pages deploys, close and reopen the installed PWA once so build 8560 activates its new service-worker cache.

v8.5.6 COACH CLASSIFICATION CORRECTION

- Coach-page components are now placed into mutually exclusive categories.
- Strengths: score 85–100.
- Watch items: score 70–84.
- Risks and limiters: score below 70.
- A component can no longer appear in both strengths and risks.
- Highest-impact actions are generated only from risks and watch items.
- Components scoring 85 or higher no longer generate corrective actions.
- When no risks or actions exist, the app shows an explicit maintenance message instead of inventing a weakness.
- Current and predicted readiness calculations are unchanged.


v8.5.6 build 8560 correction
- Coach categories are now rebuilt by the executing JavaScript, even if stale HTML is cached.
- Strengths: 85-100 only. Watch items: 70-84 only. Risks: below 70 only.
- Corrective actions are generated only for components below 85.
- The same component cannot appear in multiple categories.
- The visible build label is stamped by app.js, preventing an updated HTML file from falsely implying that an older script is active.
- Service-worker registration is versioned and bypasses the HTTP cache when checking for updates.
