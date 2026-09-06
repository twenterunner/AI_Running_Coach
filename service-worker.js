// AI Running Coach v15.7.14 · build 51014
'use strict';

const BUILD = 51014;
const PATCH_TAG = '51014-checkin-history';
const CACHE_PREFIX = 'arc-v';

function patchAppSource(source) {
  // This hotfix is intentionally limited to the currently deployed 15.7.13 app.
  // If a later app.js has already been deployed, leave it untouched.
  if (!/const VERSION\s*=\s*'15\.7\.13';\s*\n\s*const BUILD\s*=\s*51013;/.test(source)) {
    return source;
  }

  let patched = source;
  const applied = [];

  function replace(label, pattern, replacement) {
    const next = patched.replace(pattern, replacement);
    if (next !== patched) {
      applied.push(label);
      patched = next;
    } else {
      console.error(`[ARC ${PATCH_TAG}] patch target missing: ${label}`);
    }
  }

  // Runtime version/build shown by the app after the hotfix is active.
  replace(
    'runtime version',
    /const VERSION\s*=\s*'15\.7\.13';\s*\n\s*const BUILD\s*=\s*51013;/,
    "const VERSION = '15.7.14';\n  const BUILD = 51014;"
  );

  // CHECK-IN FLOW FIX 1:
  // Preserve the third options argument through the validation wrapper. The old
  // wrapper accepted only (injury, existing), so timeline/day-specific check-ins
  // silently lost options.date and opened as today's check-in instead.
  replace(
    'check-in route options',
    /openInjuryCheck=function\(injury,existing=null\)\{\s*\n\s*openInjuryCheckUnvalidated\(injury,existing\);/,
    "openInjuryCheck=function(injury,existing=null,options={}){\n openInjuryCheckUnvalidated(injury,existing,options);"
  );

  // CHECK-IN FLOW FIX 2:
  // Let the Saving… state paint before the persistence/model work starts. The old
  // requestAnimationFrame callback ran before paint, which could make the button
  // look dead while synchronous save/recalculation was running on mobile.
  replace(
    'check-in save scheduling',
    /saveButton\.textContent=existing\?'Saving update…':'Saving…';requestAnimationFrame\(/,
    "saveButton.textContent=existing?'Saving update…':'Saving…';setTimeout("
  );

  // CHECK-IN FLOW FIX 3 / PERFORMANCE:
  // Full historical race-readiness backfill is useful when Progress/startup needs
  // the chart, but ordinary saves should refresh only today's snapshot. This keeps
  // a rehab check-in save from recalculating every historical day synchronously.
  replace(
    'history sync options',
    /function syncRaceReadinessHistory\(\)\{/,
    'function syncRaceReadinessHistory(options={}){'
  );

  replace(
    'history start date',
    / const existingEarliest=history\.length\?history\.slice\(\)\.sort\(\(a,b\)=>a\.date\.localeCompare\(b\.date\)\)\[0\]\.date:null;\s*\n const configuredStart=CORE\.isIsoDate\(state\.setup\?\.planStart\)\?state\.setup\.planStart:realToday;\s*\n let start=existingEarliest&&existingEarliest<configuredStart\?existingEarliest:configuredStart,end=realToday<=raceDate\?realToday:raceDate;\s*\n if\(start>end\)start=end;/,
    " const existingEarliest=history.length?history.slice().sort((a,b)=>a.date.localeCompare(b.date))[0].date:null;\n const configuredStart=CORE.isIsoDate(state.setup?.planStart)?state.setup.planStart:realToday;\n const predictionDates=(state.predictionHistory||[]).filter(x=>x&&CORE.isIsoDate(x.date)&&x.date<=realToday).map(x=>x.date).sort();\n const earliestPredictionDate=predictionDates[0]||null;\n let start=[existingEarliest,configuredStart,earliestPredictionDate].filter(x=>CORE.isIsoDate(x)).sort()[0]||configuredStart,end=realToday<=raceDate?realToday:raceDate;\n if(start>end)start=end;\n const backfill=options.backfill!==false;"
  );

  replace(
    'history backfill loop',
    / const byDate=new Map\(history\.map\(x=>\[x\.date,x\]\)\);\s*\n let changed=false;\s*\n for\(let d=dte\(start\),last=dte\(end\),guard=0;d<=last&&guard<1500;d=new Date\(d\.getTime\(\)\+DAY\),guard\+\+\)\{/,
    " const byDate=new Map(history.map(x=>[x.date,x]));\n let changed=false;\n const loopStart=backfill?start:end;\n for(let d=dte(loopStart),last=dte(end),guard=0;d<=last&&guard<1500;d=new Date(d.getTime()+DAY),guard++){"
  );

  replace(
    'save-time history refresh',
    /try\{syncRaceReadinessHistory\(\)\}catch\(err\)\{recordDiagnostic\('Race-readiness daily snapshot',err\)\}/,
    "try{syncRaceReadinessHistory({backfill:false})}catch(err){recordDiagnostic('Race-readiness daily snapshot',err)}"
  );

  // GRAPH FIX 1:
  // The first historical point was always labelled "Start", which hid yesterday's
  // actual date. Show the calendar date for every historical day and Today only on
  // the final point.
  replace(
    'history date labels',
    / const lastIndex=dates\.length-1,labels=dates\.map\(\(date,i\)=>lastIndex===0\?\(end===realToday\?'Today':'Race'\):i===0\?'Start':i===lastIndex\?\(end===realToday\?'Today':'Race'\):dte\(date\)\.toLocaleDateString\(undefined,\{day:'numeric',month:'short'\}\)\);/,
    " const lastIndex=dates.length-1,labels=dates.map((date,i)=>lastIndex===0?(end===realToday?'Today':'Race'):i===lastIndex?(end===realToday?'Today':'Race'):dte(date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));"
  );

  // GRAPH FIX 2:
  // For the short day-by-day history currently in use, show every daily x-axis
  // label and preserve per-point detail text for taps.
  replace(
    'history chart labels/details',
    /formatY:v=>fmtTime\(v\),labels:daily\.labels,aria:'Daily race readiness history with current and expected finish times'/,
    "formatY:v=>fmtTime(v),labels:daily.labels,allLabels:daily.dates.length<=8,pointDetails:daily.details,aria:'Daily race readiness history with current and expected finish times'"
  );

  if (applied.length) {
    console.info(`[ARC ${PATCH_TAG}] applied: ${applied.join(', ')}`);
  }
  return patched;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .then(async () => {
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        for (const client of clients) {
          client.postMessage({ type: 'ARC_BUILD_ACTIVE', build: BUILD });
          try {
            const url = new URL(client.url);
            if (url.searchParams.get('hotfix') !== PATCH_TAG) {
              url.searchParams.set('hotfix', PATCH_TAG);
              url.searchParams.set('refresh', Date.now().toString());
              await client.navigate(url.toString());
            }
          } catch (err) {
            console.error(`[ARC ${PATCH_TAG}] activation reload failed`, err);
          }
        }
      })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Serve app.js with the narrow v15.7.14 hotfix applied. Other files continue to
// load directly from GitHub Pages and are not cached by this worker.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.pathname.endsWith('/app.js')) return;

  event.respondWith((async () => {
    const response = await fetch(event.request, { cache: 'no-store' });
    if (!response.ok) return response;

    const original = await response.text();
    const patched = patchAppSource(original);
    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/javascript; charset=utf-8');
    headers.set('cache-control', 'no-store, no-cache, must-revalidate');
    headers.set('x-arc-hotfix', PATCH_TAG);
    headers.delete('content-length');

    return new Response(patched, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  })());
});
