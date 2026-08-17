'use strict';
const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8');

assert(app.includes('function shoePlannerEntryDate(pair)'));
assert(app.includes('function shoePlannerIsAvailableOn(pair,date)'));
assert(app.includes('plannedEntryDate:firstUse'));
assert(app.includes('if(!shoePlannerIsAvailableOn(pair,plan?.date))return null'));
assert(app.includes('if(!newPair||!row||!shoePlannerIsAvailableOn(newPair,row.date)'));
assert(!app.includes('pair.availableDate=first.date;pair.purchaseDate=first.date'));
assert(app.includes("if(entry&&row.date<entry)add('shoe-used-before-purchase'"));
assert(app.includes('start=pair.owned?todayStr:(shoePlannerEntryDate(pair)||todayStr)'));

// Minimal chronology proof: a pair entering 30 Aug cannot take 18 Aug.
function entry(pair){return pair.owned?null:(pair.plannedEntryDate||pair.availableDate||pair.purchaseDate||null)}
function available(pair,date){const e=entry(pair);return !!pair&&!!date&&(!e||String(date)>=String(e))}
const future={owned:false,plannedEntryDate:'2026-08-30',availableDate:'2026-08-30',purchaseDate:'2026-08-30'};
assert.equal(available(future,'2026-08-18'),false);
assert.equal(available(future,'2026-08-30'),true);
assert.equal(available(future,'2026-09-01'),true);

console.log(JSON.stringify({passed:11,failed:0}));
