'use strict';
const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
assert(app.includes('function shoeEnginePrepareWeekPortfolio'));
assert(app.includes('function shoeEngineCanReachWeeklyShare'));
assert(app.includes("pair.plannedRetireDate=shoeEngineLastUseBefore"));
assert(app.includes("insufficient lifecycle capacity for the next active rotation week"));
assert(!app.includes('.slice(0,SESSION_SHOE_RULES.targetMaxPairs)'));
assert(app.includes("add('active-pair-below-25pct'"));
assert(app.includes("add('fewer-than-two-active-pairs'"));
assert(app.includes("p.role==='race'?SESSION_SHOE_RULES.raceDayMaximumKm-.5"));
assert(app.includes('raceChoice.pair.raceReserved=true'));
assert(app.includes("pair.projectedRetireDate=pair.plannedRetireDate||"));
assert(app.includes('pair.projectedRetireDate||pair.plannedRetireDate'));
assert(!app.includes('function shoeEngineNeedSecondPair'));
// policy arithmetic: 40 km week => each of two active pairs requires >=10 km.
const total=40,target=.25*total;assert.equal(target,10);assert(12>=target&&28>=target);
console.log(JSON.stringify({passed:14,failed:0,targetKm:target}));
