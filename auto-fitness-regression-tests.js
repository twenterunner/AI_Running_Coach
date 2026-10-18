'use strict';
// Independent, synthetic, no user data. Execute actual engine functions from app.js.
// node auto-fitness-regression-tests.js
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/app.js','utf8');
const start=src.indexOf('/* BEGIN offline automatic fitness model'),end=src.indexOf('/* END offline automatic fitness model');
assert(start>0&&end>start,'fitness model lives in app.js');
const real=src.slice(start,end);
const makeDate=(v,diff)=>{const d=new Date(v+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+diff);return d.toISOString().slice(0,10)};
function setup(obj={}){
 const ctx=vm.createContext({console});
 vm.runInContext(`
 let state=${JSON.stringify({storageRevision:0,runs:[],assessments:[],setup:{testTime:1500,testDistance:5,criticalPower:294,thresholdHr:169,bodyWeight:92},calibration:{version:1,records:[]},...obj})};
 const CORE={isIsoDate:v=>/^\\d{4}-\\d{2}-\\d{2}$/.test(String(v))};
 const clock='2026-10-18';
 const iso=d=>typeof d==='string'?d:new Date(d).toISOString().slice(0,10);
 const today=()=>new Date(clock+'T12:00:00Z');
 const addCalendarDays=(d,n)=>{const x=new Date(iso(d)+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x};
 const calendarDayNumber=d=>Date.parse(iso(d)+'T00:00:00Z')/86400000;
 const calibrationDate=d=>CORE.isIsoDate(d)?d:null;
 const calibrationKinds=()=>['pace','power','hr','weight'];
 const calibrationValidValue=(kind,n)=>Number.isFinite(Number(n))&&Number(n)>0;
 const calibrationRecordIsCurrent=(r,date)=>r.effectiveOn<=date;
 const ensureCalibrationState=()=>state.calibration;
 const calibrationAppendRecord=(cal,r)=>{const x={...r,id:'auto-test-'+(cal.records.length+1),sequence:cal.records.length+1};cal.records.push(x);return x;};
 const calibrationFor=(kind)=>state.calibration.records.filter(r=>r.kind===kind).sort((a,b)=>b.effectiveOn.localeCompare(a.effectiveOn))[0]||null;
 const pace=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0')+'/km';
 const fmtDate=d=>d;
 const fmtTime=s=>s+' sec';
 const esc=x=>String(x);
 let saves=0,builds=0;
 const save=()=>{saves++;return true};
 const buildPlan=()=>{builds++;return true};
 ${real}
 `,ctx,{filename:'isolated-auto-fitness.js'});
 const evaluate=(str)=>vm.runInContext(str,ctx,{timeout:12000});
 return {evaluate,record:(r)=>evaluate(`state.runs.push(${JSON.stringify(r)});invalidateAutomaticFitnessCache();`),assessment:(a)=>evaluate(`state.assessments.push(${JSON.stringify(a)});invalidateAutomaticFitnessCache();`),ctx};
}
function readings(dur,watts,hr=170,options={}){
 const step=options.step||1,rows=[];
 for(let i=0;i<=dur+2;i+=step){if(options.gapStart!=null&&i>=options.gapStart&&i<options.gapEnd)continue;rows.push({t:i,power:typeof watts==='function'?watts(i):watts,hr:typeof hr==='function'?hr(i):hr,distance:i*3});}
 return rows;
}
function run(id,day,seconds,watts,rpe=9,type='Threshold',hr=167,options={}){
 const rows=readings(seconds,watts,hr,options);return{id,date:day,type,rpe,pain:0,source:'fit-activity',durationSec:seconds,distanceKm:seconds/360,avgPower:typeof watts==='number'?watts:null,avgHr:typeof hr==='number'?hr:null,
  fitnessPowerCurve:null,fitRecords:rows};
}
let passed=0,failed=0;function test(title,fn){try{fn();console.log('PASS',title);passed++}catch(e){console.error('FAIL',title, e.stack?.split('\n').slice(0,7).join('\n'));failed++}}
function flatten(x){return JSON.parse(JSON.stringify(x))}

// Timed and race-equivalent performance
 test('five kilometre benchmark stays the timed five kilometre performance',()=>{const h=setup();assert.equal(h.evaluate('fiveKmEquivalentSeconds(1500,5)'),1500)});
 test('ten kilometre in 60 minutes converts to a slower-than-5k pace equivalent',()=>{const h=setup();let v=h.evaluate('fiveKmEquivalentSeconds(3600,10)');assert(Math.abs(v-1726.2)<5,v);});
 test('a timed race creates realistic differentiated predictions with provenance',()=>{const h=setup();h.assessment({id:'a',date:'2026-10-15',valid:true,distance:5,time:1500});const m=flatten(h.evaluate('autoFitnessModel()'));assert.equal(m.pace.value,300);assert.equal(m.pace.status,'Strong evidence');assert.equal(m.predictions.length,4);assert.equal(m.predictions[0].seconds,1500);assert(m.predictions[3].seconds>m.predictions[2].seconds);});
 test('a casual run with attractive power and pace never updates any fitness baseline',()=>{const h=setup();for(let i=1;i<=10;i++)h.record({id:'easy'+i,date:makeDate('2026-10-18',-i),source:'fit-activity',type:'Easy',distanceKm:10,durationSec:3600,avgPower:290,avgHr:160,pain:0,rpe:4});let m=flatten(h.evaluate('autoFitnessModel()'));assert.equal(m.pace,null);assert.equal(m.power,null);assert.equal(m.hr,null);});
 test('an easy run with 237 W and HR 161 never redefines CP or threshold HR',()=>{const h=setup();let r=run('easy','2026-10-17',2400,237,4,'Easy',161);r.fitnessPowerCurve=flatten(h.evaluate(`autoFitnessPowerCurve(${JSON.stringify(r.fitRecords)})`));delete r.fitRecords;h.record(r);const m=flatten(h.evaluate('autoFitnessModel()'));assert.equal(m.power,null);assert.equal(m.hr,null)});
 test('one strong three minute effort alone is insufficient for CP',()=>{const h=setup();let r=run('short','2026-10-14',185,310);r.fitnessPowerCurve=flatten(h.evaluate(`autoFitnessPowerCurve(${JSON.stringify(r.fitRecords)})`));delete r.fitRecords;h.record(r);assert.equal(h.evaluate('autoFitnessModel().power'),null)});
 test('the running-power time-series is summarized into duration-specific best efforts',()=>{const h=setup(),curve=flatten(h.evaluate(`autoFitnessPowerCurve(${JSON.stringify(readings(2400,255,167))})`));assert(curve?.durations.some(d=>d.durationSec===180));assert(curve.durations.some(d=>d.durationSec===1200));assert(curve.durations.some(d=>d.durationSec===2400));assert(Math.abs(curve.durations[0].avgPower-255)<.01);});
 test('independent three-minute and twenty-minute hard efforts estimate critical power',()=>{const h=setup();for(const [id,date,dur,pow,type]of[['short','2026-10-13',185,315,'VO₂max intervals'],['long','2026-10-15',1205,275,'Threshold']]){let r=run(id,date,dur,pow,9,type);r.fitnessPowerCurve=flatten(h.evaluate(`autoFitnessPowerCurve(${JSON.stringify(r.fitRecords)})`));delete r.fitRecords;h.record(r)}const m=flatten(h.evaluate('autoFitnessModel()'));assert(m.power,m);assert(Math.abs(m.power.value-268)<=2,m.power.value);assert.equal(m.power.used,2);assert(m.power.confidence>=.7);});
 test('three missing-RPE structured training sessions may qualify, two cannot',()=>{const h=setup();let inputs=[['short','2026-10-11',185,315,'VO₂max intervals'],['long','2026-10-12',1205,275,'Threshold'],['repeat','2026-10-14',1205,275,'Threshold']];inputs.forEach(([id,date,dur,pow,type],i)=>{let r=run(id,date,dur,pow,null,type);r.fitnessPowerCurve=flatten(h.evaluate(`autoFitnessPowerCurve(${JSON.stringify(r.fitRecords)})`));delete r.fitRecords;h.record(r);assert.equal(h.evaluate(`autoFitnessEffortClass(state.runs.at(-1))`),'structured');if(i===1)assert.equal(h.evaluate('autoFitnessModel().power'),null);});assert(h.evaluate('autoFitnessModel().power?.value')>100)});
 test('long gaps and missing power do not produce fake sustained power',()=>{const h=setup();const curve=flatten(h.evaluate(`autoFitnessPowerCurve(${JSON.stringify(readings(1300,280,165,{gapStart:100,gapEnd:1200}))})`));assert(!curve?.durations.some(x=>x.durationSec>=180),curve);});
 test('HR threshold needs sustained near-CP efforts, not one average HR',()=>{const h=setup();for(const [id,date,dur,pow,hr]of[['short','2026-10-07',185,315,180],['long','2026-10-08',1205,275,170],['hr1','2026-10-10',2105,268,166],['hr2','2026-10-12',2105,269,168]]){let r=run(id,date,dur,pow,9,'Threshold',hr);r.fitnessPowerCurve=flatten(h.evaluate(`autoFitnessPowerCurve(${JSON.stringify(r.fitRecords)})`));delete r.fitRecords;h.record(r);if(id==='hr1')assert.equal(h.evaluate('autoFitnessModel().hr'),null)}const m=flatten(h.evaluate('autoFitnessModel()'));assert(m.power);assert(m.hr,m);assert(m.hr.value>=166&&m.hr.value<=170,m.hr.value);assert(m.hr.confidence>=.7);});
 test('actual explicit FIT CP and LTHR metadata supersede indirect modelling',()=>{const h=setup();h.record({id:'fit',date:'2026-10-18',source:'fit-activity',type:'Easy',rpe:3,distanceKm:8,durationSec:2800,deviceCriticalPower:254,deviceThresholdHr:164,sourceDevice:'Stryd/Garmin FIT'});const m=flatten(h.evaluate('autoFitnessModel()'));assert.equal(m.power.value,254);assert.equal(m.hr.value,164);assert(m.power.source.includes('FIT'));});
 test('future dated records are excluded from every current estimate',()=>{const h=setup();h.record({id:'future',date:'2026-10-19',source:'fit-activity',type:'Race',distanceKm:5,durationSec:1100,deviceCriticalPower:340,deviceThresholdHr:190});const m=flatten(h.evaluate('autoFitnessModel()'));assert.equal(m.pace,null);assert.equal(m.power,null);assert.equal(m.hr,null)});
 test('a race outside the ninety-day evidence window is not treated as a current fresh test',()=>{const h=setup();h.assessment({id:'old',date:'2026-06-01',valid:true,distance:5,time:1400});assert.equal(h.evaluate('autoFitnessModel().pace'),null)});
 test('persisted automatic CP stays active after its training evidence falls outside ninety days',()=>{const h=setup();h.record({id:'fit',date:'2026-10-14',source:'fit-activity',type:'Easy',rpe:3,distanceKm:8,durationSec:2800,deviceCriticalPower:254});h.evaluate('persistAutomaticFitnessUpdate({pace:null,power:null,hr:null})');let records=flatten(h.evaluate('state.calibration.records'));assert(records.find(x=>x.kind==='power'&&x.value===254&&x.automatic));h.evaluate('state.runs=[];invalidateAutomaticFitnessCache()');assert.equal(h.evaluate('automaticFitnessRecord(\'power\')'),null);assert.equal(h.evaluate("calibrationFor('power').value"),254);});
 test('the same automatic observation is never committed twice',()=>{const h=setup();h.record({id:'fit',date:'2026-10-18',source:'fit-activity',type:'Easy',rpe:3,distanceKm:8,durationSec:2800,deviceCriticalPower:254});h.evaluate('persistAutomaticFitnessUpdate({pace:null,power:null,hr:null})');h.evaluate('persistAutomaticFitnessUpdate({pace:null,power:254,hr:null})');assert.equal(h.evaluate('state.calibration.records.length'),1)});
 test('a more recent explicit manual CP overrides older evidence',()=>{const h=setup({calibration:{version:1,records:[{kind:'power',value:250,effectiveOn:'2026-10-18',measuredOn:'2026-10-18',source:'Manual Stryd',sequence:1}]}});h.record({id:'fit',date:'2026-10-12',type:'Easy',distanceKm:10,durationSec:3500,deviceCriticalPower:254});assert.equal(h.evaluate('automaticFitnessRecord(\'power\')'),null);h.evaluate('persistAutomaticFitnessUpdate({pace:null,power:null,hr:null})');assert.equal(h.evaluate('state.calibration.records.length'),1);});
 test('without sufficient performance evidence the UI visibly identifies held seeds',()=>{const h=setup({calibration:{version:1,records:[{kind:'power',value:294,effectiveOn:'2026-05-01',source:'Legacy setup',legacy:true},{kind:'hr',value:170,effectiveOn:'2026-05-01',legacy:true}]}});const html=h.evaluate('autoFitnessSummaryHtml()');assert.match(html,/Retained starting value/);assert.match(html,/294 W/);assert.match(html,/170 bpm/);assert.match(html,/does not connect directly/);});
 test('scheduled assessments for twenty-seven-week marathon are weeks 1, 8, 15, 22',()=>{const x=src.slice(src.indexOf('function assessmentWeeks('),src.indexOf('const RACE_PHASE_MATRIX='));const c=vm.createContext({state:{setup:{taperDays:14}},weeks:()=>27,raceProfile:()=>({key:'marathon'}),Math});vm.runInContext(x,c);assert.deepEqual(flatten(vm.runInContext('assessmentWeeks()',c)),[1,8,15,22]);});
 test('run evidence is summarized BEFORE FIT stream is discarded for compact storage',()=>{const f=src.slice(src.indexOf('function compactRunActivityStream('),src.indexOf('function compactHistoricalActivityStreams('));assert(f.includes('autoFitnessPowerCurve(records)'));assert(f.indexOf('autoFitnessPowerCurve(records)')<f.indexOf('delete run.fitRecords'));});
 test('real importer triggers auto update and maintains the existing saved training plan logic',()=>{const x=src.slice(src.indexOf("$('saveImport').onclick="),src.indexOf("$('addAssessmentBtn').onclick="));assert(x.includes('compactRunActivityStream(preview)'));assert(x.includes('persistAutomaticFitnessUpdate(beforeAuto)'));assert(x.includes('recordPredictionSnapshot'));});
 console.log(`AUTO FITNESS: ${passed}/${passed+failed} passed`);process.exitCode=failed?1:0;
