'use strict';
const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8');

const a=app.indexOf('function freshShoeLifecyclePlan()');
const b=app.indexOf('function freshLifecycleAssignmentForPlan',a);
const build=app.slice(a,b);

const calls=[...build.matchAll(/shoeEngineRepairPurchaseSpacing\(/g)];
assert.strictEqual(calls.length,1,'freshShoeLifecyclePlan must invoke spacing optimisation exactly once');

assert(build.includes('// FINAL authoritative purchase-spacing pass.'));
assert(!build.includes('shoeEngineRepairPurchaseSpacing(preRaceResult'));
assert(build.includes('Canonical purchase dates are derived from the FINAL physical-pair assignment ledger.'));
assert(build.includes('Graph BUY markers are rebuilt only after first-use dates are canonical and final.'));

const canon=build.indexOf('Canonical purchase dates are derived');
const graph=build.indexOf('result.pairs.forEach(pair=>lifecycleRebuildPoints');
assert(graph>canon,'graph must be rebuilt after canonical first-use dates');

assert(app.includes("for(const b of result.purchases){b.spacingAdjusted=false;b.spacingReason='';b.spacingOverride=false}"));
assert(app.includes('race-first-spacing-v8-sustained-use'));

console.log(JSON.stringify({passed:8,failed:0}));
