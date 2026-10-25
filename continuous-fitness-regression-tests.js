'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/app.js','utf8'),a=source.indexOf('/* BEGIN Garmin-style continuous aerobic running observation'),b=source.indexOf('/* END Garmin-style continuous aerobic running observation */',a),c=source.indexOf('function fitnessMedian('),d=source.indexOf('function observedFitnessHistory(',c);
assert(a>=0&&b>a&&c>=0&&d>c);
const code=source.slice(a,b)+source.slice(c,d);
const context=vm.createContext({console});
vm.runInContext(`const state={runs:[],setup:{thresholdHr:168}};const CORE={isIsoDate:x=>/^\\d{4}-\\d{2}-\\d{2}$/.test(x)};function today(){return new Date('2026-10-18T12:00:00Z')}function iso(d){return new Date(d).toISOString().slice(0,10)}function addCalendarDays(d,n){return new Date(Date.parse(d+'T12:00:00Z')+86400000*n)}function calendarDayNumber(d){return Date.parse(d+'T12:00:00Z')/86400000}\n${code}`,context);
const evaluate=js=>vm.runInContext(js,context,{timeout:6000});
const runCode=(js)=>evaluate(js);
function stream({duration=1800,speed=2.6,hr=143,altitude=100,gap=null,hrNull=false,grade=0,change=null}={}){
 const records=[];let travelled=0;
 for(let t=0;t<=duration;t++){
  if(gap&&t>=gap[0]&&t<gap[1])continue;
  let v=typeof change==='function'?change(t):speed;
  travelled=v*t; // suitable for constant pace and deliberate thirds stress tests
  records.push({t,distance:travelled,hr:hrNull?null:typeof hr==='function'?hr(t):hr,altitude:altitude==null?null:altitude+travelled*grade});
 }
 return records;
}
const plain=x=>JSON.parse(JSON.stringify(x));
let good=0,bad=0;
function test(name,fn){try{fn();good++;console.log('PASS',name)}catch(e){bad++;console.error('FAIL',name,e.stack)}}
function extract(records){return plain(runCode(`autoAerobicSteadyEvidence(${JSON.stringify(records)})`))}
const anchor={date:'2026-09-27',quality:3,vdot:38.2,source:'5 km time trial'};
function setRuns(paces){runCode('state.runs=[]');for(let i=0;i<paces.length;i++){
 const d=['2026-10-01','2026-10-03','2026-10-05','2026-10-08','2026-10-11','2026-10-14'][i];
 const speed=paces[i],e=extract(stream({speed}));assert(e,'sufficient steady evidence '+i);
 runCode(`state.runs.push(${JSON.stringify({id:'r'+i,date:d,source:'FIT',type:'Easy',rpe:4,pain:0,aerobicFitnessEvidence:e})})`);
}}
function points(){return plain(evaluate(`aerobicFitnessTrendPoints(${JSON.stringify([anchor])},'2026-10-18')`));}
test('Continuous 20-minute GPS/HR section produces compact steady evidence',()=>{const e=extract(stream());assert.equal(e.version,1);assert.equal(e.durationSec,1200);assert(Math.abs(e.avgHr-143)<.1);assert(Math.abs(e.speedMps-2.6)<.001);assert(e.hrCoverage>.9);assert(e.terrainVerified)});
test('Missing GPS altitude lowers quality and never claims flat terrain verified',()=>{const a=extract(stream({altitude:100})),b=extract(stream({altitude:null}));assert(b);assert(!b.terrainVerified);assert(b.quality<a.quality)});
test('No usable HR means no aerobic observation',()=>assert.equal(extract(stream({hrNull:true})),null));
test('Short run under 10 min cannot qualify',()=>assert.equal(extract(stream({duration:500})),null));
test('Steep sustained climb cannot masquerade as flat pace fitness',()=>assert.equal(extract(stream({grade:.05})),null));
test('Large stop/data gap destroys a sustained 10-minute measurement',()=>assert.equal(extract(stream({duration:1100,gap:[500,700]})),null));
test('Erratic pace or highly uneven thirds rejected',()=>{const rows=stream({duration:1200,change:t=>t<400?2:t<800?3.6:2.2});assert.equal(extract(rows),null)});
test('Excessive physiological drift rejected',()=>{const rows=stream({hr:t=>Math.floor(t/180)%2===0?125:162});assert.equal(extract(rows),null)});
test('Under-minimum HR/effort does not infer aerobic fitness',()=>assert.equal(extract(stream({hr:99})),null));
test('Does not invent a VO2 estimate without a dated performance anchor',()=>{setRuns([2.6,2.6,2.6,2.8]);assert.deepEqual(plain(evaluate(`aerobicFitnessTrendPoints([],'2026-10-18')`)),[])});
test('Three distinct quality steady runs establish a stable anchored baseline',()=>{setRuns([2.6,2.6,2.6]);const p=points();assert.equal(p.length,1);assert(Math.abs(p[0].vdot-38.2)<.001)});
test('One unusually fast same-HR run cannot produce an immediate large fitness jump',()=>{setRuns([2.6,2.6,2.6,3.2]);const p=points();assert.equal(p.length,2);assert(Math.abs(p.at(-1).vdot-38.2)<1.01)});
test('Repeated faster runs at matching HR raise fitness conservatively with bounded step',()=>{setRuns([2.6,2.6,2.6,2.8,2.8,2.8]);const p=points();assert(p.length>=4);assert(p.at(-1).vdot>38.2);for(let i=1;i<p.length;i++)assert(p[i].vdot-p[i-1].vdot<=.800001)});
test('RPE >=8 and pain >=3 exclude submax estimate updates',()=>{setRuns([2.6,2.6,2.6,2.8]);runCode('state.runs[3].rpe=9');assert.equal(points().length,1);runCode('state.runs[3].rpe=4;state.runs[3].pain=4');assert.equal(points().length,1)});
test('Future-dated activities never leak into past VO2-equivalent trend',()=>{setRuns([2.6,2.6,2.6,2.8]);const p=plain(evaluate(`aerobicFitnessTrendPoints(${JSON.stringify([anchor])},'2026-10-06')`));assert.equal(p.length,1)});
test('No late hard efforts falsely redefine CP or threshold HR from this function',()=>{setRuns([2.6,2.6,2.6]);assert.equal(runCode('state.setup.thresholdHr'),168);assert.equal(plain(evaluate('state.runs')).length,3)});
test('Regression: imported time-series are compacted BEFORE stream deletion and no plan edits here',()=>{const block=source.slice(source.indexOf('function compactRunActivityStream('),source.indexOf('function compactHistoricalActivityStreams('));assert(block.includes('autoAerobicSteadyEvidence(records)'));assert(block.indexOf('autoAerobicSteadyEvidence(records)')<block.indexOf('delete run.fitRecords'));assert(!code.includes('buildPlan('))});
test('All public deployment markers are updated consistently',()=>{const html=fs.readFileSync(__dirname+'/index.html','utf8'),sw=fs.readFileSync(__dirname+'/service-worker.js','utf8'),man=JSON.parse(fs.readFileSync(__dirname+'/manifest.webmanifest','utf8'));assert(source.includes("VERSION = '15.8.6'"));assert(source.includes('BUILD = 51860'));assert(html.includes('v15.8.6'));assert(html.includes('app.js?v=51860'));assert(sw.includes('51860'));assert.equal(man.build,51860)});
console.log(`CONTINUOUS AEROBIC TESTS: ${good}/${good+bad} PASS`);process.exitCode=bad?1:0;
