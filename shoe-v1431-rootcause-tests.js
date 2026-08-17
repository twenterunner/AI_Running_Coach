'use strict';
const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('styles.css','utf8'),sw=fs.readFileSync('service-worker.js','utf8');

assert(!css.includes('\\n  #nav{'),'mobile CSS must not contain escaped newline literals');
assert(css.includes('height:86px!important'));
assert(css.includes('grid-template-rows:28px 16px!important'));
assert(css.includes('grid-template-columns:minmax(0,1fr) 76px!important'));
assert(!app.includes('const affected=[...new Set(allSessions.filter(s=>s.date>=shoePlannerEntryDate(raceChoice.pair)||raceChoice.pair.owned)'));
assert(app.includes('Race Day is the final allocation stage.'));
assert(app.includes('function shoeEngineFinalizeRaceDay'));
assert(app.includes("engine:'session-suitability-v22-graph-race-ui'"));
assert(sw.includes('arc-v1432-build-40302'));
console.log(JSON.stringify({passed:9,failed:0}));
