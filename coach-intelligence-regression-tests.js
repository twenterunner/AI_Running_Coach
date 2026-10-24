/* Coach Intelligence v2 independent read-only contract & fault-injection suite.
 * Tests are real assertions against coach-intelligence.js, not a mock implementation.
 */
'use strict';
const A = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const c = require('./coach-intelligence.js');
let passed = 0, failed = 0;
function test(name, fn) {
  try {fn(); passed++; console.log('PASS ' + name)}
  catch (e) {failed++;console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1}
}
function run(r={}) {return {id:'a1',date:'2026-10-20',type:'Easy',distanceKm:4.75,durationSec:1850,avgHr:142,avgPower:212,rpe:4,pain:0,...r}}
function details(score=78) {return {score,evidenceQuality:'moderate',components:[{name:'Control',score:65,effectiveWeight:.4,detail:'Out of range'},{name:'Effort',score:90,effectiveWeight:.6,detail:'Appropriate'}]}}
const plan = {type:'Easy',date:'2026-10-20',distance:2.7};
const report = (...args)=>c.runAssessment(...args);

test('API is frozen to prevent a competing mutable engine',()=>A.equal(Object.isFrozen(c),true));
test('null remains unknown rather than an observed zero',()=>A.equal(c.number(null),null));
test('undefined remains unknown',()=>A.equal(c.number(undefined),null));
test('empty string remains unknown',()=>A.equal(c.number(''),null));
test('boolean false remains unknown',()=>A.equal(c.number(false),null));
test('finite string number is accepted',()=>A.equal(c.number('1.2'),1.2));
test('zero is a known numeric observation',()=>A.equal(c.number(0),0));
test('non-finite string is never accepted',()=>A.equal(c.number('Infinity'),null));
test('invalid calendar day rejected',()=>A.equal(c.dateValid('2026-02-30'),false));
test('leap day accepted',()=>A.equal(c.dateValid('2024-02-29'),true));
test('non-leap February 29 rejected',()=>A.equal(c.dateValid('2026-02-29'),false));
test('day arithmetic DST independent',()=>A.equal(c.shift('2026-10-25',-1),'2026-10-24'));
test('day arithmetic crosses year boundary',()=>A.equal(c.shift('2027-01-01',-1),'2026-12-31'));
test('invalid shift returns null',()=>A.equal(c.shift('bad',7),null));

test('28-day rolling distance sums days and ignores future activities',()=>{
 const r=[run({date:'2026-10-20',distanceKm:5}),run({id:'z',date:'2026-10-01',distanceKm:10}),run({id:'f',date:'2026-10-21',distanceKm:8})];
 A.deepEqual(c.distanceWindow(r,'2026-10-20',28),{km:15,count:2,days:28});
});
test('7-day rolling distance excludes the eighth day',()=>{
 const rows=[run({id:'s',date:'2026-10-14',distanceKm:3}),run({id:'o',date:'2026-10-13',distanceKm:4})];
 A.equal(c.distanceWindow(rows,'2026-10-20',7).km,3);
});
test('duplicate imported activity ID is not double-counted',()=>{
 const rows=[run({id:'same',distanceKm:4}),run({id:'same',distanceKm:4})];
 A.equal(c.distanceWindow(rows,'2026-10-20',7).km,4);
});
test('two distinct workouts on one date are counted',()=>{
 const rows=[run({id:'A',distanceKm:4}),run({id:'B',distanceKm:7})];
 A.equal(c.distanceWindow(rows,'2026-10-20',7).km,11);
});
test('two distinct ID-less workouts on one day are counted',()=>{
 const rows=[run({id:null,distanceKm:4}),run({id:null,distanceKm:7})];
 A.equal(c.distanceWindow(rows,'2026-10-20',7).km,11);
});
test('exact duplicate ID-less fallback workouts are deduplicated',()=>{
 const rows=[run({id:null,distanceKm:4}),run({id:null,distanceKm:4})];
 A.equal(c.distanceWindow(rows,'2026-10-20',7).km,4);
});
test('zero, negative, invalid and absurd distances are excluded',()=>{
 const rows=[run({id:'z',distanceKm:0}),run({id:'n',distanceKm:-2}),run({id:'i',distanceKm:'blah'}),run({id:'b',distanceKm:1000})];
 A.equal(c.distanceWindow(rows,'2026-10-20',28).km,0);
});
test('assessment-only artifacts excluded from training volume',()=>{
 A.equal(c.distanceWindow([run({source:'assessment'})],'2026-10-20',7).km,0)
});
test('invalid date cannot imply training volume',()=>A.equal(c.distanceWindow([run()], 'not-a-day',7).km,null));
test('empty history does not invent percentage improvement',()=>A.equal(c.loadSummary([], '2026-10-20').percent7,null));
test('zero previous week leaves percentage unknown, not infinite',()=>A.equal(c.loadSummary([run({distanceKm:7})],'2026-10-20').percent7,null));
test('weekly comparison is arithmetic, not a new calibrated fatigue risk',()=>{
 const r=[run({date:'2026-10-20',distanceKm:10}),run({id:'b',date:'2026-10-10',distanceKm:5})];
 const x=c.loadSummary(r,'2026-10-20'); A.equal(x.last7.km,10);A.equal(x.previous7.km,5);A.equal(x.percent7,100);
});

test('unknown metric history reports no current estimate',()=>A.equal(c.seriesDelta([], '2026-10-20').current,null));
test('single observation is not an improvement',()=>{
 const x=c.seriesDelta([{date:'2026-10-20',value:39}], '2026-10-20');
 A.equal(x.priorDelta,null);A.equal(x.observedToday,true);A.equal(x.changedToday,false);
});
test('valid paired observations return observed delta',()=>{
 const x=c.seriesDelta([{date:'2026-10-19',value:38},{date:'2026-10-20',value:39}],'2026-10-20');
 A.equal(x.priorDelta,1);A.equal(x.observedToday,true);A.equal(x.changedToday,true);
});
test('duplicate date revisions use the final observation, not both',()=>{
 const x=c.seriesDelta([{date:'2026-10-19',value:38},{date:'2026-10-20',value:40},{date:'2026-10-20',value:39}],'2026-10-20');
 A.equal(x.priorDelta,1);
});
test('future estimates excluded from today',()=>{
 const x=c.seriesDelta([{date:'2026-10-20',value:38},{date:'2026-10-21',value:99}],'2026-10-20'); A.equal(x.current,38);
});
test('an observation in past does not claim changed today',()=>{
 const x=c.seriesDelta([{date:'2026-10-13',value:38},{date:'2026-10-18',value:39}],'2026-10-20');A.equal(x.observedToday,false);A.equal(x.changedToday,false);
});
test('7-day change requires 7-day baseline',()=>{
 const x=c.seriesDelta([{date:'2026-10-15',value:38},{date:'2026-10-20',value:39}],'2026-10-20');A.equal(x.delta7,null);
});
test('7-day change calculates correct difference when baseline present',()=>{
 const x=c.seriesDelta([{date:'2026-10-12',value:38},{date:'2026-10-20',value:39}],'2026-10-20');A.equal(x.delta7,1);
});
test('28-day change remains unknown if no 28-day baseline',()=>{
 const x=c.seriesDelta([{date:'2026-10-12',value:38},{date:'2026-10-20',value:39}],'2026-10-20');A.equal(x.delta28,null);
});
test('28-day change calculates against older baseline',()=>{
 const x=c.seriesDelta([{date:'2026-09-20',value:38},{date:'2026-10-20',value:39}],'2026-10-20');A.equal(x.delta28,1);
});
test('invalid values ignored in series without inventing zero',()=>{
 const x=c.seriesDelta([{date:'2026-10-18',value:''},{date:'2026-10-19',value:null},{date:'2026-10-20',value:41}],'2026-10-20');A.equal(x.previous,null)
});
test('unknown date has no series estimate',()=>A.equal(c.seriesDelta([{date:'2026-10-20',value:38}],'x').current,null));

test('no activity means no run judgement',()=>A.equal(report({run:null}),null));
test('post-run 176% overdistance is called out despite strong score',()=>{
 const x=report({run:run(),plan,scoreDetails:details(90)}); A.equal(x.over,true);A.match(x.verdict,/unplanned distance/);A.equal(Math.round(x.ratio*100),176);
});
test('pain 7/10 overrides high performance',()=>{
 const x=report({run:run({pain:7}),plan,scoreDetails:details(99)});A.equal(x.hasPainStop,true);A.equal(x.tone,'bad');A.match(x.verdict,/Pain overrides/);
});
test('missing pain is not treated as measured zero',()=>{
 const x=report({run:run({pain:null}),plan,scoreDetails:details(80)});A.equal(x.hasPainStop,false);A.ok(x.limitations.includes('pain'));A.equal(x.drivers.some(d=>d.label==='Pain'),false);
});
test('missing HR and power appear as evidence limits',()=>{
 const x=report({run:run({avgHr:null,avgPower:undefined}),plan,scoreDetails:details(80)});A.ok(x.limitations.includes('average HR'));A.ok(x.limitations.includes('power'));
});
test('unknown RPE explicitly exposed',()=>{
 const x=report({run:run({rpe:null}),plan,scoreDetails:details(80)});A.ok(x.limitations.includes('RPE'));
});
test('missing linked prescription not scored as compliant',()=>{
 const x=report({run:run(),plan:null,scoreDetails:details(80)});A.equal(x.ratio,null);A.equal(x.drivers[0].tone,'neutral');A.ok(x.limitations.includes('linked prescription'));
});
test('undershoot is a caution',()=>{
 const x=report({run:run({distanceKm:2}),plan,scoreDetails:details(80)});A.equal(x.under,true);A.match(x.verdict,/Session incomplete/);
});
test('poor execution is called out even when distance close',()=>{
 const x=report({run:run({distanceKm:2.7}),plan,scoreDetails:details(45)});A.match(x.verdict,/Execution fell short/);
});
test('well-executed on-plan run gets credit with recovery caveat',()=>{
 const x=report({run:run({distanceKm:2.7}),plan,scoreDetails:details(90)});A.match(x.verdict,/Well-executed/);A.match(x.verdict,/recovery/);
});
test('high score with no pain/RPE record is not treated as full green',()=>{
 const x=report({run:run({distanceKm:2.7,pain:null,rpe:null}),plan,scoreDetails:details(95)});
 A.equal(x.tone,'neutral');A.match(x.verdict,/recovery evidence incomplete/);
});
test('unknown score is not passed off as a measured quality score',()=>{
 const x=report({run:run({distanceKm:2.7}),plan,scoreDetails:{}});A.equal(x.score,null);A.match(x.verdict,/evidence is too limited/);
});
test('score stays exactly from original engine, not recalculated',()=>{
 const x=report({run:run(),plan,scoreDetails:details(78.4)});A.equal(x.score,78.4);A.equal(x.components.length,2);A.equal(x.components[0].score,65);
});
test('score components show original weights unchanged',()=>{
 const x=report({run:run(),plan,scoreDetails:details(78)});A.deepEqual(x.components.map(c=>c.weight),[40,60]);
});
test('a low-confidence comparison cannot claim efficiency gain',()=>{
 const x=report({run:run(),plan,scoreDetails:details(),comparison:{efficiencyDelta:8,count:10,confidence:'low'}});A.equal(x.comparisonReliable,false);A.match(x.drivers.find(d=>d.label==='Aerobic efficiency').value,/pending/);
});
test('a high confidence comparison requires at least three runs',()=>{
 const x=report({run:run(),plan,scoreDetails:details(),comparison:{efficiencyDelta:8,count:2,confidence:'high'}});A.equal(x.comparisonReliable,false);
});
test('only qualified comparison is displayed as evidence, not proof',()=>{
 const x=report({run:run(),plan,scoreDetails:details(),comparison:{efficiencyDelta:5.9,count:4,confidence:'moderate'}});
 const d=x.drivers.find(d=>d.label==='Aerobic efficiency');A.equal(d.value,'+5.9%');A.match(d.detail,/not proof of adaptation/);
});
test('power-based drift displays raw provided evidence, not simulated data',()=>{
 const x=report({run:run({powerDrift:1.2}),plan,scoreDetails:details()});A.equal(x.drivers.find(d=>d.label==='Cardiac drift').value,'1.2%');
});
test('missing drift does not show zero drift',()=>{
 const x=report({run:run({powerDrift:null}),plan,scoreDetails:details()});A.equal(x.drivers.some(d=>d.label==='Cardiac drift'),false);
});
test('pathway signals retain source confidence',()=>{
 const x=report({run:run(),plan,scoreDetails:details(),pathways:{pace:{finalSignal:.3,confidence:'moderate'},load:{finalSignal:-.2,confidence:'low'}}});
 A.deepEqual(x.pathways.map(y=>y.signal),[.3,-.2]);A.deepEqual(x.pathways.map(y=>y.confidence),['moderate','low']);
});
test('missing pathways stay unknown, not zero',()=>{
 const x=report({run:run(),plan,scoreDetails:details()});A.equal(x.pathways[0].signal,null);A.equal(x.pathways[1].signal,null);
});
test('real second-by-second training dose summary preserved',()=>{
 const r=run({trainingDose:{status:'measured',timerSeconds:1800,hr:{classifiedCoverage:.75,seconds:{low:900,moderate:400,high:100,unknown:400}},power:{classifiedCoverage:.8}}});
 const x=report({run:r,plan,scoreDetails:details()});A.equal(x.dose.hrCoverage,.75);A.equal(x.dose.unknownHr,400);
});
test('unavailable dose explicitly recorded as a limitation',()=>{
 const x=report({run:run({trainingDose:{status:'unavailable'}}),plan,scoreDetails:details()});A.ok(x.limitations.includes('usable second-by-second training dose'));
});
test('not mutating workouts, plan, scores or their history',()=>{
 const r=Object.freeze(run()),p=Object.freeze({...plan}),score=Object.freeze({score:88,components:Object.freeze([])});
 report({run:r,plan:p,scoreDetails:score});A.equal(r.distanceKm,4.75);A.equal(p.distance,2.7);A.equal(score.score,88);
});
test('read-only module has no persistent browser storage references',()=>{
 const source=fs.readFileSync(path.join(__dirname,'coach-intelligence.js'),'utf8');
 A.doesNotMatch(source, /localStorage|indexedDB|sessionStorage|fetch\s*\(/); A.doesNotMatch(source,/\bbuildPlan\s*\(|\bsave\s*\(/);
});
test('Today page integrates existing sources and renders a single consolidated report',()=>{
 const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
 A.match(app,/consolidatedTodayCoachBriefing\(p\)\+calibrationReviewCardHtml\('today'\)/);
 A.match(app,/coachIntelTodayHtml\(\{todayRun,plan:p,engine,report,ready/);
 A.match(app,/workoutScoreDetails\(todayRun,runPlan\)/);
 A.match(app,/fitnessTrajectory\(key\)/);
 A.match(app,/calibrationFor\('power',key\)/);
 A.match(app,/twoPathwayDecisionForRun\(todayRun,runPlan\)/);
 A.match(app,/\bfunction coachIntelCalibrationHistory\(/);
 A.equal((app.match(/function coachIntelTodayHtml\(/g)||[]).length,1);
});
test('no duplicate automatic fitness panel on Today, Settings retains it',()=>{
 const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
 A.match(app,/\$\('settingsGrid'\)\.innerHTML=autoFitnessSummaryHtml\(\)/);
 A.doesNotMatch(app,/\$\('todayCard'\)\.innerHTML=consolidatedTodayCoachBriefing\(p\)\+autoFitnessSummaryHtml\(\)/);
});
test('coaching extension loaded before app, with coherent build ids',()=>{
 const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 const man=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.webmanifest'),'utf8'));
 A.match(html,/<script src="coach-intelligence\.js\?v=51840"><\/script>.*<script src="app\.js\?v=51840&training=51840"><\/script>/s);
 A.match(html,/<link rel="stylesheet" href="coach-intelligence\.css\?v=51840">/);
 A.equal(man.version,'15.8.4');A.equal(man.build,51840);
});
let seed=417;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
test('200 fault injections: malformed samples do not crash the interpreter',()=>{
 const bad=[null,undefined,'',false,'weird',-1,0,NaN,Infinity,12,{},[],{test:1}];
 for(let i=0;i<200;i++){
  const pick=()=>bad[Math.floor(rand()*bad.length)],r=run({id:'stress'+i,date:i%3?'2026-10-20':pick(),distanceKm:pick(),rpe:pick(),pain:pick(),powerDrift:pick(),trainingDose:pick()});
  const answer=report({run:r,plan:rand()>.5?{distance:pick()}:null,comparison:{efficiencyDelta:pick(),count:pick(),confidence:pick()},scoreDetails:{score:pick(),components:pick()},pathways:{pace:pick(),load:pick()}});
  A.ok(answer&&typeof answer.verdict==='string');A.ok(['good','caution','bad','neutral'].includes(answer.tone));
  c.loadSummary([r], '2026-10-20');c.seriesDelta([{date:r.date,value:pick()}], '2026-10-20');
 }
});
console.log(`COACH INTELLIGENCE V2: ${passed} / ${passed+failed} passed${failed?' WITH FAILURES':''}`);
