'use strict';
const A=require('node:assert/strict'),fs=require('node:fs');
const LT1=require('./training-lt1.js'),Dose=require('./training-dose.js'),UI=require('./training-gui.js');
let pass=0,fail=0;
function test(name,fn){try{fn();pass++;}catch(e){fail++;console.error('FAIL:',name,e.stack||e);}}
function exercise(opts={}){
 const date=opts.date||'2026-10-24',type=opts.type||'Easy',durationSec=opts.durationSec??2800;
 const run={id:opts.id||'fit-2026-10-24',date,type,durationSec,distanceKm:8.4,rpe:opts.rpe??4,pain:opts.pain??0,
  powerDiagnostics:{mapping:opts.proportional?'fallback proportional alignment':'decoded FIT record power'},trainingTimerEvents:opts.events||[]};
 const records=[];for(let t=0;t<=2800;t++){
  const surge=opts.surge&&t>1950;
  const climb=opts.hilly? t*.03:(surge&&opts.climbEnd?(t-1950)*.06:0);
  records.push({t,hr:opts.noHr?null:(surge&&opts.hardHr?178:140+t*.002),speed:surge?4.8:3,
   power:opts.noPower?null:surge?370:240,altitude:opts.noAlt?null:100+climb,distance:t*3});
 }
 return {run,records};
}
function getEvidence(opts={}){const {run,records}=exercise(opts);const lt1=LT1.summarize(run,records,{lt2Hr:opts.lt2??180});
 run.lt1Evidence={...lt1,activity:lt1.activity||{date:run.date,durationSec:run.durationSec,distanceKm:run.distanceKm}};
 return {run,records,lt1};}
function dose(opts={}){const x=exercise(opts);return Dose.measure(x.run,x.records,{asOf:x.run.date,lt1Hr:150,lt2Hr:180,criticalPower:254});}
test('1-second fractional timer/sample mismatch is quantified without generic warning',()=>{
 const d=dose({durationSec:2800.926});A.equal(d.status,'measured');A(Math.abs(d.timing.unassignedTimerSeconds-.926)<.001);
 A.equal(d.timing.materialUnassigned,false);A(!d.flags.some(x=>/trailing unrecorded/i.test(x)));
 A(Math.abs(d.hr.validSeconds-2800)<.01);A(Math.abs(d.hr.seconds.unknown-.926)<.01);
});
test('Time remains unknown even when the gap is too small for a warning',()=>{const d=dose({durationSec:2802});A(!d.timing.materialUnassigned);A(Math.abs(d.hr.seconds.unknown-2)<.001);A(Dose.isUsableDose(d));});
test('Meaningful 15-second timer mismatch names actual amount and retains unknown',()=>{const d=dose({durationSec:2815});A.equal(d.status,'measured');A.equal(d.timing.materialUnassigned,true);A(d.flags.some(f=>f.includes('15.0 s')));A(d.hr.seconds.unknown>=15);});
test('Implausible timer mismatch is withheld with amounts, not asserted trailing seconds',()=>{const d=dose({durationSec:2900});A.equal(d.status,'unavailable');A(d.reason.includes('100.0 s'));A(d.timing.unassignedTimerSeconds>=100);});
test('Sensor coverage is separate from LT1 zone classification',()=>{const x=exercise(),d=Dose.measure(x.run,x.records,{asOf:x.run.date,lt2Hr:180,criticalPower:254});A(d.hr.coverage>.99);A.equal(d.hr.classifiedCoverage,0);A(d.power.classifiedCoverage>.99);});
test('Stopped timer intervals are not double-counted as training',()=>{const x=exercise({durationSec:2780,events:[{t:950,type:'stop'},{t:970,type:'start'}]});const d=Dose.measure(x.run,x.records,{asOf:x.run.date,lt1Hr:150,lt2Hr:180,criticalPower:254});A.equal(d.status,'measured');A.equal(d.pausedSeconds,20);A(!d.timing.materialUnassigned);});
test('Ordinary complete Easy run remains a whole-run accepted observation',()=>{const e=getEvidence().lt1;A.equal(e.status,'observed');A.equal(e.partial,false);A.equal(e.observedRunType,'Easy');});
test('Hills with a steady level section are partially accepted, with measured terrain',()=>{const e=getEvidence({type:'Hills',surge:true,climbEnd:true}).lt1;A.equal(e.status,'observed',e.reason);A.equal(e.partial,true);A.equal(e.terrainVerified,true);A(e.seconds>=850);});
test('Easy + strides can contribute stable section without accepting fast ending',()=>{const e=getEvidence({type:'Easy + strides',surge:true}).lt1;A.equal(e.status,'observed',e.reason);A.equal(e.partial,true);A(e.observedSection.endOffsetSec<2400);});
test('Hilly full run is not used as a spurious low-drift observation',()=>{const e=getEvidence({type:'Hills',hilly:true}).lt1;A.equal(e.status,'unavailable');A.match(e.reason,/terrain/i);});
test('Hills without altitude recordings are excluded even with steady HR and power',()=>{const e=getEvidence({type:'Hills',noAlt:true}).lt1;A.equal(e.status,'unavailable');A.match(e.reason,/elevation|terrain|hill/i);});
test('Quality workout requires an LT2 anchor even when its HR looks low',()=>{const x=exercise({type:'Intervals',surge:true});A.equal(LT1.summarize(x.run,x.records).status,'unavailable');});
test('Quality workout low-HR steady section can contribute only with LT2',()=>{const e=getEvidence({type:'Intervals',surge:true}).lt1;A.equal(e.status,'observed',e.reason);A.equal(e.partial,true);A.equal(e.qualityVerified,true);});
test('Quality near LT2 cannot contribute a misleading mixed-workout observation',()=>{const x=exercise({type:'Intervals',surge:true,hardHr:true});x.records.forEach(r=>{if(r.t<1950)r.hr=174});const e=LT1.summarize(x.run,x.records,{lt2Hr:180});A.equal(e.status,'unavailable');});
test('High RPE still excludes regardless of valid sample stream',()=>{const e=getEvidence({type:'Easy + strides',surge:true,rpe:9}).lt1;A.equal(e.status,'unavailable');A.match(e.reason,/exertion/i);});
test('Pain >=3 still excludes regardless of valid sample stream',()=>{const e=getEvidence({type:'Hills',surge:true,pain:4}).lt1;A.equal(e.status,'unavailable');A.match(e.reason,/Pain/i);});
test('Uploaded run does not mutate raw samples',()=>{const x=exercise({type:'Hills',surge:true});const before=JSON.stringify(x.records);LT1.summarize(x.run,x.records,{lt2Hr:180});A.equal(JSON.stringify(x.records),before);});
test('Mixed-workout source-type edit invalidates previously counted evidence',()=>{const x=getEvidence({type:'Easy + strides',surge:true});x.run.type='Hills';const e=LT1.evidence(x.run,{lt2Hr:180});A.equal(e.status,'unavailable');A.match(e.reason,/changed/i);});
test('An otherwise stable Hills observation must have a matching activity identity',()=>{const x=getEvidence({type:'Hills',surge:true});x.run.durationSec++;A.equal(LT1.evidence(x.run,{lt2Hr:180}).status,'unavailable');});
test('Archived Hills laps cannot invent missing terrain',()=>{const x=exercise({type:'Hills'}).run;x.fitLaps=Array.from({length:7},()=>({durationSec:380,avgHr:140,distanceKm:1,avgPower:240}));A.equal(LT1.evidence(x,{lt2Hr:180}).status,'unavailable');});
test('Legacy mixed workout gives specific reanalysis reason without claiming new data',()=>{const x=exercise({type:'Hills'}).run;x.lt1Evidence={version:1,status:'unavailable',method:'second-by-second HR',reason:'Workout type, pain or exertion excludes an LT1 proxy observation'};const e=LT1.evidence(x,{lt2Hr:180});A.match(e.reason,/previous LT1 engine/i);});
test('Activity review includes rejected latest Hills run instead of hiding it',()=>{
 const x=getEvidence({type:'Hills',hilly:true});const y=getEvidence({type:'Easy',date:'2026-10-20',id:'older'});
 const report=LT1.estimate([y.run,x.run],'2026-10-24',180);
 A.equal(report.days,1);A.equal(report.reviewed.length,2);A.equal(report.reviewed.at(-1).date,'2026-10-24');A.equal(report.reviewed.at(-1).status,'excluded');A(report.reviewed.at(-1).reason);
});
test('Accepted steady segments show partially accepted and count once',()=>{const x=getEvidence({type:'Hills',surge:true,climbEnd:true});const e=LT1.estimate([x.run],'2026-10-24',180);A.equal(e.days,1);A.equal(e.reviewed[0].status,'partial');A.equal(e.reviewed[0].counted,true);});
test('Two qualifying same-day observations are reviewed but counted once',()=>{
 const a=getEvidence({date:'2026-10-24',id:'a'}).run,b=getEvidence({date:'2026-10-24',id:'b'}).run;
 const e=LT1.estimate([a,b],'2026-10-24',180);A.equal(e.reviewed.length,2);A.equal(e.days,1);A.equal(e.reviewed.filter(x=>x.counted).length,1);
});
test('Future workout cannot appear in history of past cutoff',()=>{const x=getEvidence({date:'2026-10-25'});A.equal(LT1.estimate([x.run],'2026-10-24',180).reviewed.length,0);});
test('UI shows explicit Hills exclusion, including date, but no fabricated HR/drift',()=>{
 const e=LT1.estimate([getEvidence({type:'Hills',hilly:true}).run],'2026-10-24',180),html=UI.lt1Card(e);
 A.match(html,/2026-10-24 · Hills/);A.match(html,/Excluded/);A.match(html,/terrain/i);A(!html.includes('NaN'));A(!html.includes('undefined'));
});
test('UI shows correct accepted segment classification',()=>{const e=LT1.estimate([getEvidence({type:'Easy + strides',surge:true}).run],'2026-10-24',180),h=UI.lt1Card(e);A.match(h,/Partially accepted/);A.match(h,/steady section only/);});
test('UI escapes arbitrary activity names and reasons',()=>{const h=UI.lt1Card({reason:'<b>test</b>',reviewed:[{date:'2026-10-24',type:'<img src=x onerror=alert(1)>',status:'excluded',reason:'<script>bad</script>'}]});A(!h.includes('<img src=x'));A(!h.includes('<script>bad</script>'));A(h.includes('&lt;script&gt;'));});
test('UI exposes actual coverage from compact history',()=>{
 const x=exercise({durationSec:2800.926}),d=Dose.measure(x.run,x.records,{asOf:x.run.date,lt1Hr:150,lt2Hr:180,criticalPower:254});
 global.window={ARCTrainingDose:Dose};const html=UI.doseEvidenceHtml({...x.run,trainingDose:d});delete global.window;
 A.match(html,/HR samples/);A.match(html,/Power samples/);A.match(html,/99\.97%/);A.match(html,/0\.9 s of timer time/);A(!html.includes('Trailing unrecorded timer seconds'));
});
test('UI handles historical no-timing-data without alleging missing trailing time',()=>{
 const x=exercise(),d=Dose.measure(x.run,x.records,{asOf:x.run.date,lt1Hr:150,lt2Hr:180,criticalPower:254});delete d.timing;
 d.flags.push('Trailing unrecorded timer seconds remain unknown');global.window={ARCTrainingDose:Dose};const h=UI.doseEvidenceHtml({...x.run,trainingDose:d});delete global.window;
 A(h.includes('precise timer-to-sample boundary offset not stored'));A(!h.includes('Trailing unrecorded timer seconds'));
});
test('UI prevents malicious FIT flag injection',()=>{const x=exercise(),d=Dose.measure(x.run,x.records,{asOf:x.run.date,lt1Hr:150,lt2Hr:180,criticalPower:254});d.flags.push('<svg/onload=alert(1)>');global.window={ARCTrainingDose:Dose};const h=UI.doseEvidenceHtml({...x.run,trainingDose:d});delete global.window;A(!h.includes('<svg/onload'));A(h.includes('&lt;svg/'));});
test('Source retains strict reanalysis matching and non-duplicate update',()=>{
 const a=fs.readFileSync(__dirname+'/app.js','utf8');A(a.includes('if(priorRun){'));A(a.includes('arcReanalyseRecording'));A(a.includes('const next={...original'));A(a.includes('state.runs[idx]=next'));A(a.includes('if(!save()){state.runs[idx]=original'));A(a.includes('delete source.trainingDose'));
});
test('Run model and fitness scoring code unchanged by reanalysis in existing app',()=>{
 const a=fs.readFileSync(__dirname+'/app.js','utf8');const x=a.slice(a.indexOf("$('arcReanalyseRecording').onclick"),a.indexOf("    return;\n   }",a.indexOf("$('arcReanalyseRecording').onclick")));
 A(!x.includes('buildPlan('));A(!x.includes('postRunCoachUpdate('));A(!x.includes('persistAutomaticFitnessUpdate('));
});
test('Schema and public build markers are coherent',()=>{
 const a=fs.readFileSync(__dirname+'/app.js','utf8'),h=fs.readFileSync(__dirname+'/index.html','utf8'),m=JSON.parse(fs.readFileSync(__dirname+'/manifest.webmanifest','utf8'));
 A(a.includes("VERSION = '15.8.6'"));A(a.includes('SCHEMA = 10400'));A(h.includes('v15.8.6'));A.equal(m.build,51860);
});
let seed=51840;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<96;i++)test('Seeded mixed-workout fault and timer boundary '+i,()=>{
 const types=['Hills','Easy + strides','Intervals','Easy','Fartlek'];
 const opts={type:types[i%types.length],surge:(i%3===0),climbEnd:i%5===0,lt2:i%6===0?null:180,noAlt:i%9===0,noHr:i%11===0};
 const {run,records}=exercise(opts),damage=Math.floor(random()*7);
 if(damage===0)records.splice(150,350);
 if(damage===1)records.push({...records.at(-1),t:NaN,hr:'<script>'});
 if(damage===2)records.push({...records.at(-1),t:1500,hr:999});
 if(damage===3)records.reverse();
 if(damage===4)run.trainingTimerEvents=[{t:700,type:'stop'},{t:1800,type:'start'}];
 if(damage===5)run.rpe=9;
 if(damage===6)records.forEach(r=>r.speed=null);
 const before=JSON.stringify(records),e=LT1.summarize(run,records,{lt2Hr:opts.lt2});A(['observed','unavailable'].includes(e.status));A.equal(JSON.stringify(records),before);
 if(e.status==='observed'){A(e.seconds>=850);A(e.coverage>=.9);A(e.hr>=80&&e.hr<=210);if(opts.type==='Hills')A(e.terrainVerified);}
});
console.log('TRAINING EVIDENCE: '+pass+'/'+(pass+fail)+' passed');process.exitCode=fail?1:0;
