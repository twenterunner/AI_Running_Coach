/* Independent, deterministic regression tests for AI Running Coach v15.8.6.
   Run from repository root AFTER applying the updater: node cardiac-drift-regression-tests.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=process.cwd();
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const coach=require(path.join(ROOT,'coach-intelligence.js'));
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.webmanifest'),'utf8'));
let passed=0;
function test(label,fn){try{fn();passed++;console.log('PASS',label)}catch(e){console.error('FAIL',label,e.stack);process.exitCode=1}}
const s=app.indexOf('function eligibleCardiacDrift('),e=app.indexOf('function typeMetricSummary(',s);
assert(s>0&&e>s,'Policy and metric series exist');
const env={metricRunTypes:['Easy','Long run'],runTypeColors:{Easy:'#123456','Long run':'#654321'},runTypeMarkers:{Easy:null,'Long run':null}};
vm.runInNewContext(app.slice(s,e)+';globalThis.policy={eligibleCardiacDrift,excludedCardiacDrift,formatCardiacDrift,excludedDriftMessage,metricSeries};',env);
const p=env.policy;

test('Actual positive drift remains the measured percentage',()=>{
 for(const n of [0.1,0.4,1.23,3.5,12.7,100]){
  assert.equal(p.eligibleCardiacDrift(n),true);assert(p.formatCardiacDrift(n).endsWith('%'));
  assert.equal(Number(p.formatCardiacDrift(n).slice(0,-1)).toFixed(1),n.toFixed(1));
 }
});
test('Zero, negative and negative string are excluded and not shown',()=>{
 for(const n of [0,-0,-.00001,-1,-7, '-0.1','0']){
  assert.equal(p.eligibleCardiacDrift(n),false);assert.equal(p.excludedCardiacDrift(n),true);assert.equal(p.formatCardiacDrift(n),'—');
 }
});
test('Missing, invalid, infinity and boolean are not fabricated as drift',()=>{
 for(const n of [undefined,null,'',NaN,Infinity,-Infinity,'bad',true,false]){
  assert.equal(p.eligibleCardiacDrift(n),false);assert.equal(p.excludedCardiacDrift(n),false);assert.equal(p.formatCardiacDrift(n),'—');
 }
});
test('Very small positive values never round down to displayed zero',()=>{
 for(const n of [.000000003,.0001,.003,.04,.051,.09]){
  assert(p.eligibleCardiacDrift(n));assert(!/^0(?:\.0+)?%$/.test(p.formatCardiacDrift(n)));
 }
 assert.equal(p.formatCardiacDrift(.051),'0.051%');
});
test('Only positive drift creates chart points and gaps stay gaps',()=>{
 const data=[{date:'2026-10-10',type:'Easy',powerDrift:1.2},{date:'2026-10-11',type:'Easy',powerDrift:0},{date:'2026-10-12',type:'Easy',powerDrift:-2.1},{date:'2026-10-13',type:'Easy',powerDrift:4.5}];
 const series=p.metricSeries(data,r=>p.eligibleCardiacDrift(r.powerDrift)?Number(r.powerDrift):null);
 assert.equal(series.length,1);assert.deepEqual(Array.from(series[0].data),[1.2,null,null,4.5]);
});
test('Chart has strictly positive percentage ticks and an exclusion notice',()=>{
 const start=app.indexOf('function progressAutoScale('),end=app.indexOf('function renderProgressChartsStandalone(',start);
 assert(start>0&&end>start);
 const mount={innerHTML:'',attrs:{},setAttribute(k,v){this.attrs[k]=v}};
 const ctx={...env,policy:p,$:()=>mount,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),esc:v=>String(v),runTypeLegendGlyph:()=>'<i />',recordDiagnostic:(name,e)=>{throw Error(name+': '+e.message)}};
 vm.runInNewContext(app.slice(start,end)+';globalThis.api={progressSvgIntoMount,tightMetricChartBounds};',ctx);
 const vals=[.01,5],bounds=ctx.api.tightMetricChartBounds(vals,{paddingFraction:.05,minPadding:.2,singlePadding:1});
 const min=Math.max(Math.min(...vals)*.5,bounds.min),max=Math.max(Math.max(...vals)*1.1,bounds.max);
 assert(min>0&&max>min);
 const data=[{type:'Easy',powerDrift:-2},{type:'Easy',powerDrift:0},{type:'Easy',powerDrift:.01},{type:'Easy',powerDrift:5}];
 const series=p.metricSeries(data,r=>p.eligibleCardiacDrift(r.powerDrift)?Number(r.powerDrift):null);
 ctx.api.progressSvgIntoMount('test',series,{scaleMin:min,scaleMax:max,ticks:5,formatY:p.formatCardiacDrift,labels:['A','B','C','D'],notice:p.excludedDriftMessage(2),aria:'Cardiac drift'});
 assert.match(mount.innerHTML,/2 runs excluded/);assert.match(mount.innerHTML,/<svg/);
 assert(!/class="axis"[^>]*>\s*(?:0+(?:\.0+)?|-[\d.]+)%</.test(mount.innerHTML));
 assert(!mount.innerHTML.includes('−2.0%'));
});
test('No positive drift yields only an exclusion message',()=>{
 const data=[{type:'Easy',powerDrift:0},{type:'Long run',powerDrift:-1}];
 const series=p.metricSeries(data,r=>p.eligibleCardiacDrift(r.powerDrift)?Number(r.powerDrift):null);
 assert.equal(series.length,0);assert.match(p.excludedDriftMessage(2),/excluded/);
});
test('Coach report excludes nonpositive drift without calling it beneficial',()=>{
 const report=n=>coach.runAssessment({run:{id:'1',date:'2026-10-20',type:'Easy',distanceKm:8,powerDrift:n},scoreDetails:{score:80,components:[]}});
 for(const n of [-3,0]){
  const d=report(n).drivers.find(x=>x.label==='Cardiac drift');assert(d);assert.equal(d.value,'Excluded · not used');assert.equal(d.tone,'neutral');
 }
 assert.equal(report(null).drivers.some(x=>x.label==='Cardiac drift'),false);
 assert.equal(report(1.2).drivers.find(x=>x.label==='Cardiac drift').value,'1.2%');
});
test('Execution, profiles, progression and race totals use eligibility checks',()=>{
 const must=["if(eligibleCardiacDrift(run.powerDrift)){","if(eligibleCardiacDrift(drift)&&!['interval'].includes(family))","if(eligibleCardiacDrift(drift)&&(family==='aerobic'||family==='recovery'||family==='long'))",'drift=group.map(r=>Number(r.powerDrift)).filter(eligibleCardiacDrift)','let driftRecent=','drift=avg(wd.runs.map(r=>Number(r.powerDrift)).filter(eligibleCardiacDrift))','driftRows=longRuns.map(r=>Number(r.powerDrift)).filter(eligibleCardiacDrift)','const scorableLong=longObs.filter('];
 for(const needle of must)assert(app.includes(needle),needle);
});
test('Raw FIT cardiac drift and saved import evidence are unchanged',()=>{
 assert(app.includes('let powerDrift=p1&&p2&&h1&&h2?((h2/p2)/(h1/p1)-1)*100:null;'));
 assert(app.includes('preview.drift=preview.candidatePowerDrift;preview.powerDrift=preview.candidatePowerDrift;'));
});
test('Deployment markers consistent and JavaScript parses',()=>{
 new vm.Script(app);
 assert(app.includes("const VERSION = '15.8.6'"));assert(app.includes('const BUILD = 51860'));
 assert(html.includes('v15.8.6 · build 51860'));assert(sw.includes('51860'));assert.equal(manifest.version,'15.8.6');assert.equal(manifest.build,51860);
});
test('Live Progress card omits nonpositive results but retains date gaps',()=>{
 const begin=app.indexOf('function renderProgressChartsStandalone('),end=app.indexOf('/* === Shoes module:',begin);
 assert(begin>0&&end>begin);
 const calls=[],errors=[];
 let runs=[
  {id:'a',date:'2026-10-10',type:'Easy',powerDrift:1.2},
  {id:'b',date:'2026-10-11',type:'Easy',powerDrift:0},
  {id:'c',date:'2026-10-12',type:'Easy',powerDrift:-1.5},
  {id:'d',date:'2026-10-13',type:'Easy',powerDrift:4.5}
 ];
 const context={
  state:{setup:{targetTime:15000}},
  completedWeekSeries:()=>[],currentWeek:()=>1,weeks:()=>0,trainingWeekRuns:()=>[],
  programmePauseChartBands:()=>[],programmePauseLongRunSeries:()=>[],
  raceReadinessDailySeries:()=>({dates:[],labels:[],current:[],expected:[],latestCurrent:15000,latestExpected:15000}),
  tightTimeChartBounds:()=>null,
  metrics:()=>({efficiencyJ:80}),
  completedRuns:()=>runs,
  dte:date=>new Date(date+'T12:00:00Z'),
  fmtTime:()=>'',
  tightMetricChartBounds:vals=>vals.length?{min:Math.min(...vals)-.2,max:Math.max(...vals)+.2}:null,
  metricSeries:(entries,value)=>p.metricSeries(entries,value),
  eligibleCardiacDrift:p.eligibleCardiacDrift,
  excludedCardiacDrift:p.excludedCardiacDrift,
  formatCardiacDrift:p.formatCardiacDrift,
  excludedDriftMessage:p.excludedDriftMessage,
  progressSvgIntoMount:(id,series,opts)=>calls.push({id,series,opts}),
  recordDiagnostic:(name,err)=>errors.push(name+': '+err)
 };
 vm.runInNewContext(app.slice(begin,end)+'; renderProgressChartsStandalone();',context);
 assert.equal(errors.length,0,errors.join('; '));
 let shown=calls.find(c=>c.id==='driftChartMount');assert(shown);
 assert.deepEqual(Array.from(shown.series[0].data),[1.2,null,null,4.5]);
 assert.match(shown.opts.notice,/2 runs excluded/);
 assert(shown.opts.scaleMin>0);
 assert(shown.opts.scaleMax>shown.opts.scaleMin);
 calls.length=0;
 runs=[{date:'2026-10-12',type:'Easy',powerDrift:0},{date:'2026-10-13',type:'Easy',powerDrift:-1}];
 vm.runInNewContext(app.slice(begin,end)+'; renderProgressChartsStandalone();',context);
 shown=calls.find(c=>c.id==='driftChartMount');assert(shown);
 assert.equal(shown.series.length,0);
 assert.match(shown.opts.empty,/excluded/);
});
console.log(`${passed}/12 drift regression groups PASS${process.exitCode?' (some failures)':''}`);
