'use strict';
const fs=require('fs'),assert=require('assert'),cp=require('child_process');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const manifest=JSON.parse(fs.readFileSync(__dirname+'/manifest.webmanifest','utf8'));
const sw=fs.readFileSync(__dirname+'/service-worker.js','utf8');
function ok(name,fn){try{fn();console.log('PASS',name);return 1}catch(e){console.error('FAIL',name,'-',e.message);process.exitCode=1;return 0}}
let n=0;
n+=ok('app syntax',()=>cp.execFileSync(process.execPath,['--check',__dirname+'/app.js']));
n+=ok('service worker syntax',()=>cp.execFileSync(process.execPath,['--check',__dirname+'/service-worker.js']));
n+=ok('version consistency',()=>{assert(app.includes("const VERSION = '15.0.3'"));assert(app.includes('const BUILD = 50003'));assert(html.includes('v15.0.3 · build 50003'));assert.equal(manifest.version,'15.0.3');assert.equal(manifest.build,50003);assert(sw.includes('v15.0.3 · build 50003'))});
n+=ok('authoritative snapshot present',()=>['SHOE_PLAN_SNAPSHOT_VERSION','publishAuthoritativeShoeSnapshot','actualMileageLedger','forecastAssignmentLedger','sessionAssignments','purchaseEvents','retirementEvents','inputFingerprint'].forEach(x=>assert(app.includes(x),x)));
n+=ok('fail closed before cache publish',()=>{const i=app.indexOf("if(!result.valid){");const c=app.indexOf("freshShoePlanCache={stamp,value:published}",i);assert(i>0&&c>i)});
n+=ok('deterministic production path',()=>{const shoe=app.slice(app.indexOf('/* === Shoes module'),app.indexOf('/* === End Shoes module'));assert(!/\bMath\.random\s*\(/.test(shoe));assert(!/genetic algorithm/i.test(shoe));});
n+=ok('whole-session mileage rule retained',()=>{assert(app.includes("if(seenRuns.has(u.runId)"));assert(app.includes("A run may contribute mileage to only one shoe."))});
n+=ok('purchase tied to first positive use',()=>{assert(app.includes("first=pair.assignments.slice().filter(a=>Number(a.km)>0)"));assert(app.includes("buy.firstUseDate=d"))});
n+=ok('race-day 250 km hard check',()=>assert(app.includes("race-day-shoe-250km-or-more")));
n+=ok('lifecycle overflow hard repair',()=>assert(app.includes('shoeEngineRepairLifecycleOverflow')));
n+=ok('retirement X uses canonical lifecycle point',()=>{assert(app.includes('const explicitlyRetired=Boolean'));assert(app.includes('pair.finalPlannedUseDate'));assert(app.includes('× RETIRE'))});
n+=ok('tab navigation renders destination only',()=>{
 const start=app.indexOf('function activatePage(page,anchor=null)');
 const end=app.indexOf('renderNavigation();',start);
 const body=app.slice(start,end);
 assert(body.includes('renderPage(page)'));
 assert(!body.includes('renderAll()'));
 const rp=app.slice(app.indexOf('function renderPage(page)'),app.indexOf("const pages=",app.indexOf('function renderPage(page)')));
 assert(rp.includes('today:[renderToday]'));
 assert(rp.includes('shoes:[renderShoes]'));
 assert(rp.includes('dashboard:[renderDashboard,renderMetrics,renderProgressChartsStandalone]'));
});
n+=ok('shoe graph shows outgoing-pair X marker',()=>{
 assert(app.includes("label=rp.kind==='handover'?'× HANDOVER':'× RETIRE'"));
 assert(app.includes("b.replacesPairId===pair.id"));
 assert(app.includes("kind:explicitlyRetired?'retire':'handover'"));
});
console.log(`Static/regression checks passed: ${n}/13`);
