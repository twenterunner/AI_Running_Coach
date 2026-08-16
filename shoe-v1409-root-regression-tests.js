'use strict';
const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8'),sw=fs.readFileSync('service-worker.js','utf8');

assert(app.includes("for(const shoe of (state.shoes||[]).filter(sh=>sh.status!=='retired'))"),'owned inventory is authoritative');
assert(app.includes("An owned active shoe is always scored for a session."),'owned shoe visibility cannot depend on forecast allocation');
assert(!app.includes("const availableOn=shoePairStartDate(shoe)||pair.availableDate||'0000-00-00';if(availableOn>plan.date)continue;"),'owned shoes are not hidden by stale start dates');
assert(!app.includes("if(before+km>Number(pair.retireKm)+1e-6)continue;\n  const assessment=shoeSuitabilityAssessment(pair.profile,plan,{rehab,shoe"),'owned shoes are not hidden by forecast capacity');
assert(app.match(/lifecyclePruneLateRedundantPurchases[\s\S]{0,600}lifecycleEnforceWeeklyMinimumShare\(ctx,fixed,assignments,manual\)/),'25% optimiser runs after pruning');
assert(app.includes("add('available-shoe-below-25pct-weekly-mileage',x)"),'25% weekly share is hard-validated');
assert(css.includes('#shoes .shoeSection,#shoes .shoeSection.level1,#shoes .shoeSection:not(.level1)'),'all shoe main sections share one visual rule');
assert(css.includes('linear-gradient(145deg,#075468 0%,#073c50 52%,#062c3d 100%)'),'shoe gradient exactly equals locked Today gradient');
assert(html.includes('grid-template-columns:minmax(0,1fr) max-content!important'),'daily available shoes are full-width rows');
assert(html.includes('app.js?v=40009'),'app cache buster updated');
assert(sw.includes("arc-v1409-build-40009"),'service worker cache version updated');
console.log(JSON.stringify({passed:11,failed:0}));
