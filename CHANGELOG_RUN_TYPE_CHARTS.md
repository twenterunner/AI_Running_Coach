# AI Running Coach v15.8.5 / build 51850

## Progress chart readability

The **Efficiency factor** and **Aerobic durability** charts now use consistent,
individually distinct run-type identities instead of several similar cyan lines.
Every included observation carries a colour and geometric symbol, repeated in
its legend and under **Metrics by comparable run type**.

| Run type | Colour | Symbol |
| --- | --- | --- |
| Easy | Cyan `#45CDF5` | Circle |
| Easy + strides | Magenta `#EF86FA` | Diamond |
| Long run | Green `#8BE77C` | Square |
| Hills | Amber `#FFBD4B` | Upward triangle |

All other 14 comparable run types have their own unique colours and shape
identities. The mapping is centralized in `runTypeColors` and `runTypeMarkers`
within `app.js`. SVG markup is deterministic, requiring no icon libraries.

The old metric calculations, run classification, storage schema (10400),
training plan, import logic and physiological estimators were not modified.
Previous v15.8.4 improvements remain.

**Version/caching:** HTML asset URLs, manifest, service worker and app display
bumped together to v15.8.5 / 51850 to avoid old scripts being reused.

**Testing:** 878 existing regression cases pass, plus 7 new chart tests.
Real SVG chart functions rendered on isolated Chromium fixtures at 360, 390 and
768 CSS pixels without JS errors, incomplete legends or horizontal overflow.
Fixture values are illustrative only, not the user's run history.
