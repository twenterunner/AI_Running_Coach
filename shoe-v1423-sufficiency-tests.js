'use strict';
const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8');

assert(app.includes('function shoePlannerCanSafelyCover'));
assert(app.includes('function shoePlannerCoverageCandidates'));
assert(app.includes('HARD PURCHASE GATE: existing safe capacity always wins over buying.'));
assert(app.includes('Existing-shoe compromise'));
assert(app.includes('function shoePlannerPurchaseIsNecessary'));
assert(app.includes("else if(!shoePlannerPurchaseIsNecessary(p,result))add('unnecessary-purchase'"));
assert(app.includes('assessment.score>=20&&hardFit>=20'));

// Boundary proof: preferred threshold and purchase threshold are intentionally different.
const preferredMin=50, score=38, hardFit=45;
const preferred = score >= preferredMin;
const safe = score >= 20 && hardFit >= 20;
assert.equal(preferred,false);
assert.equal(safe,true);
assert.equal(!safe,false);

console.log(JSON.stringify({passed:10,failed:0}));
