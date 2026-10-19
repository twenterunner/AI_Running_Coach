'use strict';
const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),path=require('path');
const root=__dirname,app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const begin=app.indexOf('/* BEGIN cardiorespiratory fitness tracking v15.7.30'),end=app.indexOf('/* END cardiorespiratory fitness tracking */',begin);
assert(begin>0&&end>begin,'Integrated independent aerobic fitness source exists');
const code=app.slice(begin,end);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log('PASS',name)}catch(error){failed++;console.error('FAIL',name,'\n',error.stack)}}
function eq(r){return JSON.parse(JSON.stringify(r))}
function run(date,opts={}){
 const {hr=158,speed=2.5,quality=.75,terrainVerified=true,rpe=4,pain=0,type='Easy',notes='',durationSec=1200,runId=date,missing=false}=opts;
 return{id:runId,date,type,rpe,pain,notes,sourceFormat:'fit-activity',
  ...(!missing?{aerobicFitnessEvidence:{version:1,durationSec,avgHr:hr,speedMps:speed,hrCoverage:.98,quality,
   speedVariation:.025,hrDrift:2.2,terrainVerified,paceSecPerKm:1000/speed}}:{})};
}
const dates=['2026-09-04','2026-09-06','2026-09-08','2026-10-03','2026-10-11','2026-10-18','2026-10-20'];
const runs=()=>dates.slice(0,6).map((date,i)=>run(date,{hr:159+i%2,speed:2.45+i*.015}));
function harness({runs:runsIn=[],calibrationRecords=[],birthYear=1982,group='men',restingHr=null,maxHr=null,thresholdHr=180,now='2026-10-18',saveOk=true}={}){
 const context=vm.createContext({console});
 const prepare=[
  'const state='+JSON.stringify({runs:runsIn,calibration:{records:calibrationRecords},setup:{thresholdHr},fitnessProfile:{birthYear,referenceGroup:group,restingHr,maxHr}})+';',
  'const CORE={isIsoDate:s=>/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(String(s||""))};',
  'const now='+JSON.stringify(now)+';',
  'function today(){return new Date(now+"T12:00:00")}',
  'function iso(date){const x=new Date(date);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,"0"),String(x.getDate()).padStart(2,"0")].join("-")}',
  'function addCalendarDays(value,days){const x=value instanceof Date?new Date(value):new Date(value+"T12:00:00");x.setDate(x.getDate()+days);return x}',
  'function calendarDayNumber(value){const x=value instanceof Date?value:new Date(value+"T12:00:00");return Date.UTC(x.getFullYear(),x.getMonth(),x.getDate())/86400000}',
  'function calibrationFor(kind,date){return state.calibration.records.filter(r=>r.kind===kind&&r.effectiveOn<=date).sort((a,b)=>a.effectiveOn.localeCompare(b.effectiveOn)).at(-1)||null}',
  'function ensureCalibrationState(){return state.calibration}',
  'function fmtDate(date){return date}',
  'function esc(x){return String(x??"")}',
  'function pace(s){return Math.floor(s/60)+":"+String(Math.round(s%60)).padStart(2,"0")+"/km"}',
  'function tightMetricChartBounds(v){return v.length?{min:Math.min(...v)-3,max:Math.max(...v)+3}:null}',
  'const charts=[];function progressSvgIntoMount(id,series,options){charts.push({id,series,options})}',
  'const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,{id,value:"",innerHTML:"",textContent:"",onclick:null});return elements.get(id)};',
  'let saveCount=0,invalidations=0;function save(){saveCount++;return '+saveOk+'} function invalidatePageRenderCache(){invalidations++}',
  code
 ].join('\n');
 vm.runInContext(prepare,context,{timeout:12000});
 return expr=>vm.runInContext(expr,context,{timeout:6000});
}
const close=(actual,expected,tolerance=.001)=>assert(Math.abs(actual-expected)<=tolerance,`Expected ${expected} but got ${actual}`);
test('ACSM level running oxygen-demand and HR reserve are distinct from VDOT',()=>{const e=harness();close(e('runningVo2EstimateForObservation({avgHr:160,speedMps:2.5},60,188)'),41.9)});
test('No ordinary running evidence means no invented VO2max or fitness age',()=>{const e=harness();assert.equal(e('fitnessTrajectory().vo2max'),null);assert.equal(e('fitnessTrajectory().fitnessAge'),null)});
test('A device race prediction alone never becomes a VO2max observation',()=>{const e=harness({calibrationRecords:[{kind:'pace',value:334.2,effectiveOn:'2026-10-18',source:'Garmin Race Predictor',performanceKind:'predicted'}]});assert.equal(e('fitnessTrajectory().vo2max'),null);assert.equal(e('fitnessTrajectory().fitnessAge'),null)});
test('Three eligible separate dates establish a physiological-model estimate',()=>{const e=harness({runs:runs().slice(0,3)});const f=e('fitnessTrajectory()');assert(f.vo2max>30&&f.vo2max<60);assert.equal(f.history.length,1);assert.equal(f.latest.count,3)});
test('One and two run dates are insufficient',()=>{for(const n of [1,2])assert.equal(harness({runs:runs().slice(0,n)})('fitnessTrajectory().vo2max'),null)});
test('Independent estimate is invariant to changed Garmin race-time prediction',()=>{const list=runs().slice(0,3),ref=t=>[{kind:'pace',value:t,effectiveOn:'2026-10-18',measuredOn:'2026-10-18',source:'Garmin Race Predictor'}];close(harness({runs:list,calibrationRecords:ref(270)})('fitnessTrajectory().vo2max'),harness({runs:list,calibrationRecords:ref(350)})('fitnessTrajectory().vo2max'))});
test('Changing the measured HR or pace changes the oxygen-based model',()=>{const a=harness({runs:runs().slice(0,3)})('fitnessTrajectory().vo2max'),b=harness({runs:runs().slice(0,3).map(r=>({...r,aerobicFitnessEvidence:{...r.aerobicFitnessEvidence,speedMps:2.9,paceSecPerKm:1000/2.9}}))})('fitnessTrajectory().vo2max');assert(b>a+2)});
test('Low confidence when resting HR and HRmax are not measured',()=>{const e=harness({runs:runs().slice(0,3)});assert.equal(e('fitnessTrajectory().latest.confidence'),'low');assert(e('fitnessTrajectory().latest.upper')-e('fitnessTrajectory().latest.lower')>6)});
test('Model explicitly records age + HR assumptions',()=>{const e=harness({runs:runs().slice(0,3)});assert.equal(e('fitnessTrajectory().inputs.maxHr'),188);assert.equal(e('fitnessTrajectory().inputs.restingHr'),60);assert.equal(e('fitnessTrajectory().inputs.knownRest'),false);assert.equal(e('fitnessTrajectory().inputs.knownMax'),false)});
test('One-time resting/max HR inputs replace defaults',()=>{const e=harness({runs:runs().slice(0,3),restingHr:48,maxHr:193});assert.equal(e('fitnessTrajectory().inputs.maxHr'),193);assert.equal(e('fitnessTrajectory().inputs.restingHr'),48);assert.equal(e('fitnessTrajectory().inputs.knownMax'),true)});
test('Quality may be moderate only with both HR measurements plus terrain and repeated data',()=>{const e=harness({runs:runs(),restingHr:48,maxHr:193});assert.equal(e('fitnessTrajectory().latest.confidence'),'moderate')});
test('Missing birth year blocks age-predicted HRmax and VO2max',()=>{const e=harness({runs:runs(),birthYear:null});assert.equal(e('fitnessTrajectory().vo2max'),null);assert.match(e('fitnessTrajectory().reason'),/birth year/i)});
test('Missing comparison group leaves VO2max but suppresses fitness age',()=>{const e=harness({runs:runs(),group:null});assert(e('fitnessTrajectory().vo2max')>20);assert.equal(e('fitnessTrajectory().fitnessAge'),null)});
test('Population fitness age uses model VO2max and FRIEND median, not race pace',()=>{const e=harness({runs:runs()});const f=e('fitnessTrajectory()');assert(f.fitnessAge.value>20&&f.fitnessAge.value<75);assert.equal(f.cohortMedian>30,true);assert(!e('fitnessProgressCardHtml()').includes('33.7'))});
test('VO2max 37.8 maps to male age 45 in FRIEND lookup',()=>{const e=harness();close(e("aerobicFitnessAgeEquivalent(37.8,'men').value"),45)});
test('Fitness age improves monotonically as VO2max improves',()=>{const e=harness();assert(e("aerobicFitnessAgeEquivalent(40,'men').value")<e("aerobicFitnessAgeEquivalent(34,'men').value"))});
test('VO2max estimates outside the plausible model bounds are rejected',()=>{const e=harness();assert.equal(e('runningVo2EstimateForObservation({avgHr:99,speedMps:2.5},60,188)'),null);assert.equal(e('runningVo2EstimateForObservation({avgHr:180,speedMps:1.7},60,188)'),null)});
test('HR too close to extrapolated maximum is rejected',()=>{const e=harness();assert.equal(e('runningVo2EstimateForObservation({avgHr:193,speedMps:2.5},60,188)'),null)});
test('Treadmill activity with unknown grade is excluded',()=>{const arr=runs().slice(0,3).map(r=>({...r,notes:'Treadmill'}));const e=harness({runs:arr});assert.equal(e('fitnessTrajectory().vo2max'),null)});
test('Intervals and hill sessions are not interpreted as steady aerobic effort',()=>{for(const type of ['Hills','Intervals','Tempo','Race']){const e=harness({runs:runs().slice(0,3).map(r=>({...r,type}))});assert.equal(e('fitnessTrajectory().vo2max'),null)}});
test('Higher pain and hard RPE reject evidence',()=>{const e=harness({runs:runs().slice(0,3).map(r=>({...r,rpe:9,pain:4}))});assert.equal(e('fitnessTrajectory().vo2max'),null)});
test('Missing or low-quality HR coverage rejects evidence',()=>{const e=harness({runs:runs().slice(0,3).map(r=>({...r,aerobicFitnessEvidence:{...r.aerobicFitnessEvidence,hrCoverage:.2}}))});assert.equal(e('fitnessTrajectory().vo2max'),null)});
test('Excessive speed variation or HR drift is rejected',()=>{for(const patch of [{speedVariation:.3},{hrDrift:18}]){const e=harness({runs:runs().slice(0,3).map(r=>({...r,aerobicFitnessEvidence:{...r.aerobicFitnessEvidence,...patch}}))});assert.equal(e('fitnessTrajectory().vo2max'),null)}});
test('Run dates after today do not leak into fitness estimates',()=>{const arr=[...runs().slice(0,2),run('2026-10-20')];const e=harness({runs:arr,now:'2026-10-18'});assert.equal(e('fitnessTrajectory().vo2max'),null)});
test('Duplicate imports on same date do not provide three independent runs',()=>{const arr=[run('2026-10-01'),run('2026-10-01',{runId:'duplicate'}),run('2026-10-04')];const e=harness({runs:arr});assert.equal(e('fitnessTrajectory().vo2max'),null)});
test('An implausible single fast run cannot jump the VO2 estimate by more than 1.5',()=>{const arr=runs().slice(0,5);arr.push(run('2026-10-18',{speed:3.8,hr:158}));const e=harness({runs:arr});const h=eq(e('fitnessTrajectory().history'));for(let i=1;i<h.length;i++)assert(Math.abs(h[i].value-h[i-1].value)<=1.501)});
test('Historical VO2 estimates update over repeated qualifying runs',()=>{const e=harness({runs:runs()});assert(e('fitnessTrajectory().history.length')>=4)});
test('Nonqualifying newest run holds last qualified figure without inventing evidence',()=>{const arr=[...runs(),run('2026-10-18',{type:'Hills',runId:'newer'})];const e=harness({runs:arr});assert.equal(e('fitnessTrajectory().latest.date'),'2026-10-18')});
test('Older results remain as dated stale estimates after a long import pause',()=>{const e=harness({runs:runs().slice(0,4),now:'2027-02-10'});assert(e('fitnessTrajectory().vo2max')>20);assert.match(e('fitnessProgressCardHtml()'),/stale/)});
test('Archived FIT laps can reconstruct a steady observation without resurrecting raw streams',()=>{const base=runs().slice(0,3).map((r,i)=>{delete r.aerobicFitnessEvidence;r.fitLaps=[{index:1,distanceKm:1,durationSec:410,avgHr:140},...Array.from({length:4},(_,j)=>({index:j+2,distanceKm:1,durationSec:400+i*3,avgHr:158+j}))];return r});const e=harness({runs:base});assert(e('fitnessTrajectory().vo2max')>25);assert.match(e('fitnessProgressCardHtml()'),/archived FIT/)});
test('Laps that fluctuate strongly in pace cannot establish submaximal VO2max',()=>{const r=run('2026-10-10',{missing:true});r.fitLaps=Array.from({length:5},(_,i)=>({index:i+2,distanceKm:1,durationSec:i%2?550:300,avgHr:157}));assert.equal(harness({runs:[r]})('runningVo2LapObservation(state.runs[0])'),null)});
test('Reference group age and sex appear as explicit source context',()=>{const e=harness({runs:runs()});const h=e('fitnessProgressCardHtml()');assert.match(h,/FRIEND/);assert.match(h,/not biological age/)});
test('VO2 progress deliberately does not display VDOT as main metric',()=>{const e=harness({runs:runs()});const h=e('fitnessProgressCardHtml()');assert.match(h,/ESTIMATED VO₂MAX/);assert.match(h,/Estimated fitness age/);assert.doesNotMatch(h,/RACE PERFORMANCE · VDOT/)});
test('Rendering gives VO2max and age chart series without writes',()=>{const e=harness({runs:runs()});e('renderFitnessProgressPanel()');const charts=eq(e('charts'));assert.equal(charts.length,2);assert.equal(charts[0].series[0].data.length,4);assert(charts[1].series[0].data.every(Number.isFinite));assert.equal(e('saveCount'),0)});
test('Profile save accepts optional HR values without rebuilding the plan',()=>{const e=harness({runs:runs()});e('renderFitnessProgressPanel()');e("$('fitnessBirthYear').value='1982';$('fitnessReferenceGroup').value='men';$('fitnessRestingHr').value='47';$('fitnessMaxHr').value='191';$('saveFitnessProfile').onclick()");assert.equal(e('state.fitnessProfile.restingHr'),47);assert.equal(e('state.fitnessProfile.maxHr'),191);assert.equal(e('saveCount'),1)});
test('Invalid HR profiles are rejected without saving',()=>{const e=harness({runs:runs()});e('renderFitnessProgressPanel()');e("$('fitnessBirthYear').value='1982';$('fitnessReferenceGroup').value='men';$('fitnessRestingHr').value='100';$('fitnessMaxHr').value='140';$('saveFitnessProfile').onclick()");assert.equal(e('saveCount'),0)});
test('Failed profile write restores prior profile',()=>{const e=harness({runs:runs(),saveOk:false});e('renderFitnessProgressPanel()');e("$('fitnessBirthYear').value='1982';$('fitnessReferenceGroup').value='men';$('fitnessRestingHr').value='47';$('fitnessMaxHr').value='191';$('saveFitnessProfile').onclick()");assert.equal(e('state.fitnessProfile.restingHr'),null)});
test('Fitness model never edits runs, calibration, planned workouts or HR thresholds',()=>{const e=harness({runs:runs()});const before=e('JSON.stringify(state)');e('fitnessTrajectory()');assert.equal(e('JSON.stringify(state)'),before);assert(!code.includes('buildPlan('))});
test('Original Progress mount and small-screen layout exist',()=>{assert(html.includes('id="cardioFitnessProgress"'));assert(css.includes('@media(max-width:360px)'));assert(css.includes('.cardioFitnessCharts{grid-template-columns:1fr}'))});
test('Normalization preserves optional HR fields without changing storage schema',()=>{assert(app.includes('restingHr:optionalBounded(rawFitnessProfile.restingHr,35,110)'));assert(app.includes('maxHr:optionalBounded(rawFitnessProfile.maxHr,125,225)'));assert(app.includes('const SCHEMA = 10400'))});
test('Version markers align across script, HTML, manifest and service worker',()=>{const man=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'))),sw=fs.readFileSync(path.join(root,'service-worker.js'));assert(app.includes("VERSION = '15.8.0'"));assert.equal(man.version,'15.8.0');assert.equal(man.build,51800);assert(html.includes('app.js?v=51800'));assert(sw.includes('51800'))});
console.log(`INDEPENDENT VO2MAX + FITNESS AGE ${passed}/${passed+failed} passed`);process.exitCode=failed?1:0;
