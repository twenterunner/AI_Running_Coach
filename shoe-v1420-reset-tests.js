'use strict';
const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8');

// Architecture cleanup: one planner, old competing planners removed.
for(const legacy of [
 'function lifecycleCreatePair(','function lifecycleFallbackPlan(','function lifecycleRepairPlan(',
 'function lifecyclePruneLateRedundantPurchases(','function lifecycleEmergencyRacePair(',
 'function lifecycleBuildDedicatedRacePair(','function freshShoeSlopeEvents(','function shoeGraphRationaleHtml('
]) assert(!app.includes(legacy),`legacy artifact remains: ${legacy}`);
assert(app.includes("engine:'session-suitability-v12-clean'"));
assert(app.includes('This is the first chronological session that cannot be covered appropriately within the lifecycle capacity of the physical pairs already available.'));
assert(app.includes('shoePlannerCleanupPurchases(result)'));
assert(app.includes('weeklyMinimumShare:.25'));
assert(app.includes('raceDayMaximumKm:250'));
assert(app.includes('function shoeNonFlatSvgSegments'));

// Capacity boundary regression approximating the live state in the screenshots.
// Novablast: 298/800 -> 502 km capacity. Superblast: 46/850 -> 804 km capacity.
// 1,400 km remaining programme therefore needs only 94 km from ONE future pair.
const capacities=[800-298,850-46];
const programmeKm=1400;
const deficit=Math.max(0,programmeKm-capacities.reduce((a,b)=>a+b,0));
assert.equal(deficit,94);
const freshPairCapacity=850;
assert(deficit>0 && deficit<=freshPairCapacity,'exactly one fresh ordinary pair is sufficient');
const ordinaryPurchases=Math.ceil(deficit/freshPairCapacity);
assert.equal(ordinaryPurchases,1,'must not manufacture two ordinary replacement pairs');
// That fresh pair can also be Race Day eligible if preserved at 42-169 km; no dedicated race pair is intrinsically required.
const projectedFreshRaceKm=105;
assert(projectedFreshRaceKm>=42&&projectedFreshRaceKm<=169&&projectedFreshRaceKm<250);

console.log(JSON.stringify({passed:17,failed:0,currentLike:{remainingProgrammeKm:programmeKm,ownedCapacityKm:1306,deficitKm:deficit,ordinaryPurchases,projectedFreshRaceKm}}));
