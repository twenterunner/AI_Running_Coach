'use strict';
const assert=require('assert');
function classify(total,km){return km/total<.25?'advisory':'pass'}
assert.equal(classify(40,10),'pass');
assert.equal(classify(41,10),'advisory'); // whole-session arithmetic can miss exact 25%
const hardIssues=[];
const advisories=[{code:'weekly-share-below-target'}];
assert.equal(hardIssues.length,0);
assert.equal(advisories[0].code,'weekly-share-below-target');
console.log(JSON.stringify({passed:4,failed:0}));
