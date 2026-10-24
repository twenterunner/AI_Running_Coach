'use strict';
const A=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const LT1=require('./training-lt1.js'),Dose=require('./training-dose.js'),Coord=require('./training-coordinator.js');
let pass=0,fail=0;function test(name,fn){try{fn();pass++;}catch(e){fail++;console.error('FAIL',name,e.stack||e);}}
function clock(day){return new Date(Date.UTC(2026,8,1+day,12)).toISOString().slice(0,10)}
function stream(base=140,increase=0,opts={}){
 const rows=[];for(let i=0;i<=2200;i++){
  if(opts.gap&&i>opts.gap[0]&&i<opts.gap[1])continue;
  const rise=i>480?Math.max(0,(i-480)/1720):0;
  rows.push({t:i,hr:opts.noHr?null:base+increase*rise,power:opts.powerNull?null:240,speed:opts.speedUnstable&&i>1300?4:3,altitude:opts.hilly?100+i*.03:100,distance:i*3});
 }
 return rows;
}
function run(day,base,increase=0,opts={}){const r={id:`r${day}`,date:clock(day),type:opts.type||'Easy',durationSec:2200,distanceKm:6.6,rpe:4,pain:0,powerDiagnostics:{mapping:'native exact'}};const records=stream(base,increase,opts);r.lt1Evidence=LT1.summarize(r,records);return{r,records};}
const samples=()=>[run(1,136,0),run(4,145,0),run(9,150,0),run(15,156,24),run(19,162,24),run(23,165,24)];
test('Automatic estimator starts unknown with no runs',()=>{const x=LT1.estimate([],clock(25),180);A.equal(x.hr,null);A.equal(x.status,'building');});
test('Second-by-second per-record HR/effort produces an observation',()=>{const x=run(1,136);A.equal(x.r.lt1Evidence.status,'observed');A(x.r.lt1Evidence.seconds>850);A(x.r.lt1Evidence.coverage>.9);});
test('Stable HR is not automatically called measured LT1',()=>{const x=LT1.estimate(samples().slice(0,3).map(x=>x.r),clock(25),180);A.equal(x.hr,null);});
test('Multiple bracketing effort observations yield only a provisional LT1 proxy',()=>{const r=samples().map(x=>x.r),x=LT1.estimate(r,clock(25),180);A.equal(x.status,'provisional',JSON.stringify(x));A(x.hr>=140&&x.hr<175);A.equal(x.confidence,'low');A(x.range.length===2);});
test('Calibrated LT2 absent => no LT1',()=>{const x=LT1.estimate(samples().map(x=>x.r),clock(25),null);A.equal(x.hr,null);});
test('Future runs cannot establish historical LT1',()=>{const x=LT1.estimate(samples().map(x=>x.r),clock(10),180);A.equal(x.hr,null);});
test('Duplicate days not counted twice',()=>{const xs=samples().map(x=>x.r);const x=LT1.estimate([...xs,xs[0]],clock(25),180);A.equal(x.days,6);});
test('All low-drift days imply unknown boundary',()=>{const xs=[1,4,9,15,19,23].map((day,i)=>run(day,130+i*2).r);A.equal(LT1.estimate(xs,clock(25),180).hr,null);});
test('All high-drift days imply unknown boundary',()=>{const xs=[1,4,9,15,19,23].map((day,i)=>run(day,130+i*2,14).r);A.equal(LT1.estimate(xs,clock(25),180).hr,null);});
test('HR at elevated drift below stable HR implies unknown',()=>{const xs=[1,4,9].map((day,i)=>run(day,160+i*2).r).concat([15,19,23].map((day,i)=>run(day,138+i*2,14).r));A.equal(LT1.estimate(xs,clock(25),180).hr,null);});
test('Pain excludes observation',()=>{const x=run(1,137);x.r.pain=5;A.equal(LT1.evidence(x.r).status,'unavailable');});
test('High RPE excludes observation',()=>{const x=run(1,137);x.r.rpe=9;A.equal(LT1.evidence(x.r).status,'unavailable');});
test('Interval run excluded from LT1',()=>{A.equal(run(1,140,0,{type:'Intervals'}).r.lt1Evidence.status,'unavailable');});
test('Missing HR => withheld',()=>{A.equal(run(1,140,0,{noHr:true}).r.lt1Evidence.status,'unavailable');});
test('Unreliable power but good speed still computes lower confidence',()=>{const x=run(1,140,0,{powerNull:true}).r.lt1Evidence;A.equal(x.status,'observed');A.equal(x.effortSource,'speed');});
test('No reliable power/speed => withheld',()=>{A.equal(run(1,140,0,{powerNull:true,speedUnstable:true}).r.lt1Evidence.status,'unavailable');});
test('Hills reject an otherwise plausible aerobic response',()=>{A.equal(run(1,140,0,{hilly:true}).r.lt1Evidence.status,'unavailable');});
test('Large timestamp gap => ignored; no invented continuous run',()=>{A.equal(run(1,140,0,{gap:[700,1500]}).r.lt1Evidence.status,'unavailable');});
test('Old lap stream does not pretend to be second by second',()=>{const {r}=run(1,140);delete r.lt1Evidence;r.fitLaps=[{durationSec:400,avgHr:130,distanceKm:1,avgPower:238},...[132,134,136,138,140].map(hr=>({durationSec:400,avgHr:hr,distanceKm:1,avgPower:240}))];A.equal(LT1.evidence(r).method,'archived lap HR');});
test('Bad lap stream yields unknown',()=>{const {r}=run(1,140);delete r.lt1Evidence;r.fitLaps=[{durationSec:400,avgHr:150,distanceKm:1,avgPower:240}];A.equal(LT1.evidence(r).status,'unavailable');});
test('Stale stream evidence cannot survive user edits',()=>{const {r}=run(1,140);r.durationSec=2700;A.equal(LT1.evidence(r).status,'unavailable');});
test('Corrupt stream evidence falls back to honest unknown',()=>{const {r}=run(1,140);r.lt1Evidence.hr=NaN;A.equal(LT1.evidence(r).status,'unavailable');});
test('Invalid date fails closed',()=>{const x=LT1.estimate(samples().map(x=>x.r),'2026-02-30',180);A.equal(x.hr,null);});
test('Power bands remain independent of LT1 estimate',()=>{const {r,records}=run(1,140,0);const d=Dose.measure(r,records,{lt2Hr:180,criticalPower:254,asOf:r.date});const old=JSON.stringify(d.power);const change=Dose.withAutomaticLT1(d,{status:'provisional',hr:157});A.equal(JSON.stringify(change.power),old);});
test('No LT1 histogram => no invented classification',()=>{const {r,records}=run(1,140);const d=Dose.measure(r,records,{lt2Hr:180,criticalPower:254,asOf:r.date});d.hr.histogram=[];A.strictEqual(Dose.withAutomaticLT1(d,{status:'provisional',hr:157}),d);});
test('Actual per-second histogram can be classified after later LT1 evidence',()=>{const {r,records}=run(1,140);const d=Dose.measure(r,records,{lt2Hr:180,criticalPower:254,asOf:r.date});const x=Dose.withAutomaticLT1(d,{status:'provisional',hr:157});A(x.hr.seconds.low>2000);A(Dose.isUsableDose(x));A.equal(d.hr.seconds.low,0,'original dose unchanged');});
test('Invalid LT1 above LT2 stays unknown',()=>{const {r,records}=run(1,140);const d=Dose.measure(r,records,{lt2Hr:180,asOf:r.date});A.strictEqual(Dose.withAutomaticLT1(d,{status:'provisional',hr:178}),d);});
test('New configuration contains only optimizer mode, drops old manual and other-sport fields',()=>{const x=Coord.config({mode:'active',activities:[{day:'Thursday',name:'Tennis',minutes:60,rpe:9}],lt1Hr:145,lt1Date:clock(1),talkTest:'yes'});A.deepEqual(Object.keys(x).sort(),['mode','version']);});
test('Invalid optimizer mode rejected',()=>{A.throws(()=>Coord.config({mode:'maximum'}));});
test('Previously compacted activities without raw streams or laps cannot invent LT1',()=>{const rows=Array.from({length:9},(_,i)=>({id:'old'+i,date:clock(i+1),type:'Easy',durationSec:1800,distanceKm:5,avgHr:145+i,powerDrift:2,streamCompacted:true}));const e=LT1.estimate(rows,clock(25),180);A.equal(e.hr,null);A.equal(e.days,0);});
test('LT1 module is not allowed to build or change training plans',()=>{const s=fs.readFileSync(__dirname+'/training-lt1.js','utf8');A(!s.includes('buildPlan('));A(!s.includes('localStorage.'));});
test('No talk test or other sport GUI fields remain',()=>{const s=fs.readFileSync(__dirname+'/training-gui.js','utf8');A(!/name="lt1Hr"|name="activities"|name="talkTest"|Talk test|Other exercise/.test(s));});
test('Normalisation removes retired stored LT1 / talk / other sport inputs',()=>{const source=fs.readFileSync(__dirname+'/app.js','utf8');A(source.includes('setup.trainingCoordinator={version:2,mode:'));A(source.includes('const previousCoordinator=setup.trainingCoordinator'));});
test('Stream analysis precedes irreversible compaction',()=>{const s=fs.readFileSync(__dirname+'/app.js','utf8');const a=s.indexOf('function compactRunActivityStream('),b=s.indexOf('function compactHistoricalActivityStreams(',a),block=s.slice(a,b);A(block.indexOf('arcCaptureTrainingDose(run,records)')>=0);A(block.indexOf('arcCaptureTrainingDose(run,records)')<block.indexOf('delete run.fitRecords'));});
test('Updated front-end loads LT1 analysis before core integration',()=>{const s=fs.readFileSync(__dirname+'/index.html','utf8');A(s.indexOf('training-lt1.js')<s.indexOf('app.js?v='));});
test('Version markers all agree',()=>{const s=fs.readFileSync(__dirname+'/app.js','utf8'),h=fs.readFileSync(__dirname+'/index.html','utf8'),m=JSON.parse(fs.readFileSync(__dirname+'/manifest.webmanifest','utf8'));A(s.includes("VERSION = '15.8.4'"));A(h.includes('v15.8.4'));A.equal(m.build,51840);});
let seed=51840;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<250;i++)test('Seeded sensor fault and boundary '+i,()=>{
 const day=i%25,r=run(day,120+Math.floor(random()*70),Math.floor(random()*17));
 const damage=Math.floor(random()*8);
 if(damage===0)r.records.forEach(x=>x.hr=null);
 if(damage===1)r.records.splice(100,700);
 if(damage===2)r.records.forEach(x=>x.power=null);
 if(damage===3)r.records.reverse();
 if(damage===4)r.records.push({...r.records[0],hr:2});
 if(damage===5)r.records.forEach(x=>x.altitude=100+x.t*.08);
 if(damage===6)r.records.forEach(x=>x.speed=x.t>1300?5:3);
 if(damage===7)r.records.push({t:NaN,hr:Infinity,power:'<script>alert(1)</script>'});
 const before=JSON.stringify(r.records),e=LT1.summarize(r.r,r.records);
 A(['observed','unavailable'].includes(e.status));A.equal(JSON.stringify(r.records),before);
 if(e.status==='observed'){A(e.hr>=80&&e.hr<=210);A(e.seconds>=850);A(e.coverage>=.9);}
});
console.log('AUTOMATIC LT1 REGRESSIONS:',pass,'/',pass+fail,'passed');process.exitCode=fail?1:0;
