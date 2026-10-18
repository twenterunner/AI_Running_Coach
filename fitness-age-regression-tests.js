'use strict';
const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),path=require('path');
const base=__dirname,app=fs.readFileSync(path.join(base,'app.js'),'utf8'),html=fs.readFileSync(path.join(base,'index.html'),'utf8'),css=fs.readFileSync(path.join(base,'styles.css'),'utf8');
const start=app.indexOf('/* BEGIN cardiorespiratory fitness tracking v15.7.28'),end=app.indexOf('/* END cardiorespiratory fitness tracking */',start);
assert(start>0&&end>start,'New source region exists');
const functions=app.slice(start,end);
let successes=0,failures=0;
function test(name,fn){try{fn();successes++;console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,':',e.message)}}
function sample(date,pace,more={}){return{kind:'pace',value:pace,date,effectiveOn:date,measuredOn:date,sequence:1,source:'Fitness assessment',assessmentId:`test-${date}`,...more}}
function harness({records=[],group=null,birthYear=null,now='2026-10-18',calibration=null,saveOk=true,currentOverride=null}={}){
 const ctx=vm.createContext({console,Math,Number,String,Map,Set});
 const script=`
  let sampleDay=${JSON.stringify(now)};
  function today(){return new Date(sampleDay+'T12:00:00')}
  function iso(d){const x=new Date(d);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')}
  const CORE={isIsoDate:x=>/^\\d{4}-\\d{2}-\\d{2}$/.test(String(x||''))};
  const state={fitnessProfile:{birthYear:${birthYear==null?'null':birthYear},referenceGroup:${JSON.stringify(group)}},calibration:{version:1,records:${JSON.stringify(records)}}};
  function ensureCalibrationState(){return state.calibration}
  function calibrationFor(kind,date){return state.calibration.records.filter(r=>r.kind===kind&&r.effectiveOn<=date).sort((a,b)=>a.effectiveOn.localeCompare(b.effectiveOn)||a.sequence-b.sequence).at(-1)||null}
  function fmtDate(date){return date}
  function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
  function tightMetricChartBounds(vals){if(!vals.length)return null;return{min:Math.min(...vals)-2,max:Math.max(...vals)+2}}
  let charts=[];
  function progressSvgIntoMount(mountId,series,options){charts.push({mountId,series,options})}
  let saveCount=0;function save(){saveCount++;return ${saveOk?'true':'false'}}
  let invalidationCount=0;function invalidatePageRenderCache(x){invalidationCount++}
  const elements=new Map();
  const $=id=>{if(!elements.has(id))elements.set(id,{id,value:'',innerHTML:'',textContent:'',onclick:null});return elements.get(id)};
  ${functions}
 `;
 vm.runInContext(script,ctx,{timeout:10000});
 return code=>vm.runInContext(code,ctx,{timeout:4000});
}
test('Known Daniels benchmark 5 km in 25:00 yields approximately 38.3 VDOT',()=>{const e=harness();const x=e('raceEquivalentVdot(300)');assert(x>38.1&&x<38.5,x)});
test('A 5 km in 20:00 indicates a higher running oxygen equivalent than 25:00',()=>{const e=harness();assert(e('raceEquivalentVdot(240)')>e('raceEquivalentVdot(300)'))});
test('Pace outside defensible race time range is rejected',()=>{const e=harness();for(const pace of [0,30,134,1201,Infinity,-1,NaN])assert.equal(e(`raceEquivalentVdot(${Number.isNaN(pace)?'NaN':pace===Infinity?'Infinity':pace})`),null)});
test('FRIEND 2015 men age-45 reference median is 37.8',()=>{const e=harness();assert.equal(e("referenceMedianVO2('men',45)"),37.8)});
test('FRIEND 2015 women age-45 reference median is 26.7',()=>{const e=harness();assert.equal(e("referenceMedianVO2('women',45)"),26.7)});
test('Reference interpolation is monotonic across an age decade',()=>{const e=harness();assert(e("referenceMedianVO2('men',41)")>e("referenceMedianVO2('men',43)"))});
test('Unsupported normative groups and ages do not produce fitness-age values',()=>{const e=harness();for(let a of [0,19,80,100])assert.equal(e(`referenceMedianVO2('men',${a})`),null);assert.equal(e("referenceMedianVO2('other',45)"),null)});
test('A VO2-equivalent equal to male median age 45 maps to about age 45',()=>{const e=harness();assert.equal(e("aerobicFitnessAgeEquivalent(37.8,'men').value"),45)});
test('Higher running fitness maps to younger age-equivalent within same cohort',()=>{const e=harness();assert(e("aerobicFitnessAgeEquivalent(42,'men').value")<e("aerobicFitnessAgeEquivalent(32,'men').value"))});
test('Reference age beyond limits is bounded, not extrapolated',()=>{const e=harness();assert.equal(e("aerobicFitnessAgeEquivalent(70,'men').label"),'Under 25');assert.equal(e("aerobicFitnessAgeEquivalent(12,'men').label"),'Over 75')});
test('Age references distinguish men and women; no sex-independent invented result',()=>{const e=harness();assert.equal(e("aerobicFitnessAgeEquivalent(38,'unknown')"),null);assert(e("aerobicFitnessAgeEquivalent(38,'women').value")<e("aerobicFitnessAgeEquivalent(38,'men').value"))});
test('Unverified legacy setup is not treated as a VO2max observation',()=>{const e=harness({records:[{kind:'pace',value:300,effectiveOn:'2026-01-01',source:'Legacy setup',legacy:true}]});assert.equal(e('fitnessTrajectory().latest'),null);assert(e('fitnessProgressCardHtml()').includes('Awaiting enough steady or timed evidence'));assert(e('fitnessProgressCardHtml()').includes('—'))});
test('Two historical validated 5 km assessments create two ordered trend points',()=>{const e=harness({records:[sample('2026-03-01',300),sample('2026-08-01',290)]});assert.equal(e('fitnessTrajectory().history.length'),2);assert(e('fitnessTrajectory().delta')>0);assert.equal(e('fitnessTrajectory().latest.date'),'2026-08-01')});
test('Dated automatic running performances enter the history and survive window expiry',()=>{const e=harness({records:[{kind:'pace',value:285,effectiveOn:'2025-09-01',measuredOn:'2025-09-01',automatic:true,source:'Automatic: race / assessment',sequence:2}]});assert.equal(e('fitnessTrajectory().history.length'),1);assert.equal(e('fitnessTrajectory().latest.date'),'2025-09-01')});
test('Future-dated records are not shown in current trends',()=>{const e=harness({records:[sample('2026-11-12',245),sample('2026-07-01',300)]});assert.equal(e('fitnessTrajectory().history.length'),1);assert.equal(e('fitnessTrajectory().latest.date'),'2026-07-01')});
test('One day contributes at most one point; qualified assessment preferred',()=>{const records=[sample('2026-04-01',300,{assessmentId:null,automatic:true,sequence:7}),sample('2026-04-01',295,{assessmentId:'a',sequence:1})];const e=harness({records});assert.equal(e('fitnessTrajectory().history.length'),1);assert.equal(e('fitnessTrajectory().latest.pace'),295)});
test('A demographic profile without a timed result shows no invented fitness age',()=>{const e=harness({group:'men',birthYear:1982});assert.equal(e('fitnessTrajectory().fitnessAge'),null);assert(e('fitnessProgressCardHtml()').includes('Not enough validated performance evidence'))});
test('Valid performance but missing demographics shows VO2 and no misleading age',()=>{const e=harness({records:[sample('2026-04-01',300)]});assert(e('fitnessTrajectory().latest.vdot')>38);assert.equal(e('fitnessTrajectory().fitnessAge'),null);assert(e('fitnessProgressCardHtml()').includes('Set profile once to enable'))});
test('One-time birth year and reference group support automatic fitness-age trend',()=>{const e=harness({group:'men',birthYear:1982,records:[sample('2026-04-01',300),sample('2026-07-01',285)]});assert.equal(e('fitnessTrajectory().age'),44);assert(e('fitnessTrajectory().fitnessAge.value')>20);assert(e('fitnessTrajectory().history.every(x=>x.ageEquivalent!==null)'))});
test('Birth year stored, chronological age changes without any profile update',()=>{const e=harness({group:'men',birthYear:1982,now:'2026-12-31'});assert.equal(e('fitnessChronologicalAge(1982,"2026-12-31")'),44);assert.equal(e('fitnessChronologicalAge(1982,"2027-01-01")'),45)});
test('Progress HTML describes VO2 as VDOT not lab test and age as nonmedical',()=>{const e=harness({records:[sample('2026-04-01',300)],group:'men',birthYear:1982});const h=e('fitnessProgressCardHtml()');for(const a of ['VO₂max','VDOT','not a laboratory','not a health diagnosis','not medical age','FRIEND'])assert(h.toLowerCase().includes(a.toLowerCase()),a)});
test('Fitness profile is optional and only reference cohort chosen appears in form',()=>{const e=harness({group:'women',birthYear:1988});const h=e('fitnessProgressCardHtml()');assert(h.includes('value="1988"'));assert(h.includes('value="women" selected'))});
test('Rendering creates both trend series in Progress and invokes no automatic saves',()=>{const e=harness({group:'men',birthYear:1982,records:[sample('2026-04-01',300),sample('2026-07-01',285)]});e('renderFitnessProgressPanel()');const arr=JSON.parse(e('JSON.stringify(charts)'));assert.equal(arr.length,2);assert.equal(arr[0].series[0].data.length,2);assert.equal(arr[1].series[0].data.length,2);assert.equal(e('saveCount'),0)});
test('Empty running evidence keeps both charts in explanatory empty states',()=>{const e=harness();e('renderFitnessProgressPanel()');const arr=JSON.parse(e('JSON.stringify(charts)'));assert.deepEqual(arr[0].series[0].data,[]);assert.deepEqual(arr[1].series[0].data,[])});
test('Saving profile writes profile only, not workouts or a plan rebuild',()=>{const e=harness({records:[sample('2026-04-01',300)]});e('renderFitnessProgressPanel()');e("$('fitnessBirthYear').value='1982';$('fitnessReferenceGroup').value='men';$('saveFitnessProfile').onclick()");assert.equal(e('state.fitnessProfile.birthYear'),1982);assert.equal(e('state.fitnessProfile.referenceGroup'),'men');assert.equal(e('saveCount'),1);assert.equal(e('invalidationCount'),1)});
test('Invalid profile year is rejected without saving',()=>{const e=harness();e('renderFitnessProgressPanel()');e("$('fitnessBirthYear').value='1899';$('fitnessReferenceGroup').value='men';$('saveFitnessProfile').onclick()");assert.equal(e('saveCount'),0);assert.equal(e('state.fitnessProfile.birthYear'),null)});
test('Failed storage save restores prior demographics',()=>{const e=harness({saveOk:false});e('renderFitnessProgressPanel()');e("$('fitnessBirthYear').value='1982';$('fitnessReferenceGroup').value='men';$('saveFitnessProfile').onclick()");assert.equal(e('state.fitnessProfile.birthYear'),null);assert.equal(e('saveCount'),1)});
test('Existing chart and fitness metric elements are retained',()=>{for(let id of ['metricKpis','efficiencyChartMount','driftChartMount','cardioFitnessProgress'])assert(html.includes(`id="${id}"`))});
test('No existing run or assessment modification introduced in cardio fitness segment',()=>{assert(!functions.includes('state.runs='));assert(!functions.includes('state.assessments='));assert(!functions.includes('buildPlan('))});
test('New profile has strict load-time normalization without changing primary schema',()=>{assert(app.includes('const fitnessProfile={birthYear:Number.isInteger'));assert(app.includes("const SCHEMA = 10400"));assert(app.includes('fitnessProfile,programStartPrediction'))});
test('New version markers and deployment assets agree',()=>{const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.webmanifest'))),sw=fs.readFileSync(path.join(base,'service-worker.js'));assert(app.includes("VERSION = '15.7.28'"));assert(html.includes('build 51028'));assert.equal(manifest.version,'15.7.28');assert.equal(manifest.build,51028);assert(sw.includes('51028'));assert(html.includes('app.js?v=51028'))});
test('Mobile CSS includes single-column and two-column layouts',()=>{assert(css.includes('.cardioFitnessCharts{grid-template-columns:1fr}'));assert(css.includes('@media(max-width:360px)'))});
console.log(`FITNESS AGE TRACKING ${successes}/${successes+failures} passed`);process.exitCode=failures?1:0;
