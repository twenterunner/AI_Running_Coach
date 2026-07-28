let preview=null;
(()=>{'use strict';
const DAY=86401000, $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function today(){return dte(iso(new Date()))}
const iso=d=>{let x=new Date(d),y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),q=String(x.getDate()).padStart(2,'0');return `${y}-${m}-${q}`},
dte=s=>{let [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d,12,0,0,0)},
fmtDate=s=>dte(s).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
const sum=a=>a.reduce((x,y)=>x+(Number.isFinite(y)?y:0),0), avg=a=>{let v=a.filter(Number.isFinite);return v.length?sum(v)/v.length:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dec=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):'—';
function fmtTime(s){if(!Number.isFinite(s))return'—';let h=Math.floor(s/3600),m=Math.floor(s%3600/60),q=Math.round(s%60);if(q===60){q=0;m++}if(m===60){m=0;h++}return h?`${h}:${String(m).padStart(2,'0')}:${String(q).padStart(2,'0')}`:`${m}:${String(q).padStart(2,'0')}`}
function parseTime(v){let p=String(v||'').split(':').map(Number);if(p.some(x=>!Number.isFinite(x)))return null;return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1]}
function pace(s){return Number.isFinite(s)?fmtTime(s)+'/km':'—'} function toast(t,bad=false){$('toast').textContent=t;$('toast').className='toast'+(bad?' bad':'');setTimeout(()=>$('toast').className='toast hidden',3500)}
const diagnostics=[];
function recordDiagnostic(source,error){const message=error?.stack||error?.message||String(error);diagnostics.unshift({time:new Date().toLocaleString(),source,message});if(diagnostics.length>20)diagnostics.length=20;console.error(source,error);renderDiagnostics();}
function renderDiagnostics(){const box=$('diagnosticsContent');if(!box)return;box.innerHTML=diagnostics.length?diagnostics.map(x=>`<div class="diagnosticItem"><b>${esc(x.time)} · ${esc(x.source)}</b><pre>${esc(x.message)}</pre></div>`).join(''):'<p class="muted">No JavaScript errors have been recorded in this session.</p>';}
window.addEventListener('error',e=>recordDiagnostic('Window error',e.error||e.message));window.addEventListener('unhandledrejection',e=>recordDiagnostic('Unhandled promise rejection',e.reason));
const RACE_PROFILES=[
 {key:'5k',label:'5K',maxDistance:7.5,peakLong:12,maxWeekly:25,taperDays:7},
 {key:'10k',label:'10K',maxDistance:15.55,peakLong:18,maxWeekly:40,taperDays:10},
 {key:'half',label:'Half marathon',maxDistance:31.65,peakLong:24,maxWeekly:60,taperDays:14},
 {key:'marathon',label:'Marathon',maxDistance:Infinity,peakLong:34,maxWeekly:80,taperDays:21}
];
function raceProfile(distance=state?.setup?.raceDistance){let d=Number(distance);return RACE_PROFILES.find(p=>d<=p.maxDistance)||RACE_PROFILES.at(-1)}
function raceProfileValues(distance){let p=raceProfile(distance);return{peakLong:p.peakLong,maxWeekly:p.maxWeekly,taperDays:p.taperDays}}
function trainingOpportunityModel(setup=state.setup,enabledDays=state.days.filter(d=>d[1]).length,currentPhase=phase(currentWeek())){
 const profile=raceProfile(setup.raceDistance);
 // Minimum effective frequencies are intended for performance-oriented preparation,
 // not merely completing the distance. Above the minimum, frequency is not awarded
 // bonus confidence because additional days mainly improve load distribution.
 const minimumEffectiveDays={"5k":3,"10k":3,"half":4,"marathon":4}[profile.key]||4;
 const idealDays={"5k":5,"10k":5,"half":6,"marathon":6}[profile.key]||5;
 const baseOpportunity=clamp(Math.pow(enabledDays/Math.max(1,minimumEffectiveDays),1.6),0,1);
 const raceImportance={"5k":5,"10k":8,"half":12,"marathon":18}[profile.key]||12;
 const phaseMultiplier={Base:.7,Build:1,Peak:1.3,Taper:.3}[currentPhase]??1;
 const peakWeekly=Math.max(0,Number(setup.maxWeekly)||0);
 const ambitionMultiplier=peakWeekly<30?.6:peakWeekly<45?.8:peakWeekly<60?1:peakWeekly<75?1.2:1.5;
 const deficit=1-baseOpportunity;
 // raceImportance is the maximum percentage-point deduction at normal Build-phase
 // sensitivity; phase and ambition make the consequence context-specific.
 const confidencePenalty=clamp(deficit*raceImportance*phaseMultiplier*ambitionMultiplier,0,60);
 // The component score uses the same non-linear deficit, normalized to marathon
 // sensitivity so that fewer days matter progressively more as race distance rises.
 const distanceSensitivity=raceImportance/18;
 const opportunityScore=clamp(100-deficit*100*distanceSensitivity*phaseMultiplier*ambitionMultiplier,0,100);
 const averagePeakKmPerRun=enabledDays>0?peakWeekly/enabledDays:null;
 return{profileKey:profile.key,enabledDays,minimumEffectiveDays,idealDays,baseOpportunity,opportunityScore,confidencePenalty,raceImportance,phaseMultiplier,ambitionMultiplier,averagePeakKmPerRun,currentPhase};
}
function buildRequirementEstimate(setup=state.setup){
 let longest=Math.max(Number(setup.currentLongest)||0,...((state?.runs||[]).map(r=>Number(r.distanceKm)||0)));
 let currentWeekly=Math.max(1,Number(setup.currentWeekly)||1),targetWeekly=Math.max(1,Number(setup.maxWeekly)||currentWeekly),growth=Math.max(.01,Number(setup.growth)||.05);
 let longGap=Math.max(0,(Number(setup.peakLong)||0)-longest),safeLongStep=Math.max(1.5,longest*.10),longRun=longGap/safeLongStep;
 let weeklyVolume=targetWeekly<=currentWeekly?0:Math.log(targetWeekly/currentWeekly)/Math.log(1+growth);
 let latest=(state?.assessments||[]).filter(a=>a.valid).sort((a,b)=>b.date.localeCompare(a.date))[0];
 let testTime=latest?latest.time:Number(setup.testTime),testDist=latest?latest.distance:Number(setup.testDistance);
 let projected=testTime>0&&testDist>0?testTime*Math.pow(Number(setup.raceDistance)/testDist,1.06):Number(setup.targetTime);
 let fitnessScore=projected>0&&setup.targetTime>0?clamp(100-(projected/setup.targetTime-1)*300,0,100):70;
 let fitness=Math.max(0,(85-fitnessScore)/7);
 let cutoff=new Date(today().getTime()-84*DAY),recent=(state?.runs||[]).filter(r=>dte(r.date)>=cutoff&&dte(r.date)<=today());
 let longEvidence=recent.filter(r=>['Long run','Race'].includes(r.type)&&Number(r.distanceKm)>=Math.min(Number(setup.peakLong)*.65,Number(setup.raceDistance)*.75)).length;
 let enduranceEvidence=Math.max(0,3-longEvidence);
 let specificEvidence=recent.filter(r=>['Tempo','Intervals','Fitness assessment','Marathon'].includes(r.type)).length;
 let specificity=Math.max(0,4-specificEvidence)/1.5;
 let components={longRun,weeklyVolume,fitness,enduranceEvidence,specificity};
 let limiting=Math.max(...Object.values(components));
 return{components,consolidation:1.5,requiredBuildWeeks:limiting+1.5,longest,fitnessScore};
}
function recommendedRaceDate(setup){
 let p=raceProfile(setup.raceDistance),minimumTotal={"5k":6,"10k":8,"half":12,"marathon":20}[p.key]||12;
 let req=buildRequirementEstimate(setup),taperWeeks=Math.max(1,Number(setup.taperDays||p.taperDays)/7);
 let totalWeeks=Math.ceil(Math.max(minimumTotal,req.requiredBuildWeeks+taperWeeks+2));
 return{date:iso(new Date(dte(setup.planStart).getTime()+totalWeeks*7*DAY)),totalWeeks,requiredBuildWeeks:req.requiredBuildWeeks,taperWeeks};
}
const BUILD=8520, SCHEMA=8500, STORAGE_KEY='arc_v62_web', MIRROR_KEY='arc_v8500_web', BACKUP_KEY='arc_pre8500_backup';
const defaults=()=>{let start=iso(new Date()),setup={planStart:start,raceDate:start,raceName:'Goal Race',raceDistance:42.195,targetTime:15300,currentWeekly:35,currentLongest:18,testDistance:5,testTime:1515,thresholdHr:168,criticalPower:300,bodyWeight:93,maxWeekly:80,growth:.08,peakLong:34,taperDays:21,minFactor:.85,maxFactor:1.05,adaptive:true};setup.raceDate=recommendedRaceDate(setup).date;return({schemaVersion:SCHEMA,setup,days:[['Monday',false,'Easy'],['Tuesday',true,'Intervals'],['Wednesday',true,'Easy'],['Thursday',false,'Easy'],['Friday',true,'Tempo'],['Saturday',true,'Easy'],['Sunday',true,'Long run']],runs:[],assessments:[],plan:[],weekView:null,migration:{to:SCHEMA,status:'new',time:new Date().toISOString()}})};
let migrationReport={from:null,to:SCHEMA,status:'new install',source:'defaults',runs:0,assessments:0,fieldsRecovered:0,warning:''};
function parseStored(raw){if(!raw)return null;try{const x=JSON.parse(raw);return x&&typeof x==='object'?x:null}catch(err){recordDiagnostic('Storage parse',err);return null}}
function storageCandidates(){const keys=[STORAGE_KEY,MIRROR_KEY,'arc_v84_web','arc_v83_web','arc_v8_web'];return keys.map(key=>({key,value:parseStored(localStorage.getItem(key))})).filter(x=>x.value)}
function scoreState(x){if(!x||typeof x!=='object')return -1;return (x.setup?100:0)+(Array.isArray(x.runs)?x.runs.length*10:0)+(Array.isArray(x.assessments)?x.assessments.length*5:0)+(Array.isArray(x.plan)?1:0)+(Number(x.schemaVersion)||0)/100000}
function loadStoredState(){let candidates=[];try{candidates=storageCandidates()}catch(err){recordDiagnostic('Storage access',err)}if(!candidates.length)return null;candidates.sort((a,b)=>scoreState(b.value)-scoreState(a.value));migrationReport.source=candidates[0].key;return candidates[0].value}
function normaliseState(input){
 const base=defaults(),src=input&&typeof input==='object'?input:{};
 const numericSetup=['raceDistance','targetTime','currentWeekly','currentLongest','testDistance','testTime','thresholdHr','criticalPower','bodyWeight','maxWeekly','growth','peakLong','taperDays','minFactor','maxFactor'];
 const setup={...base.setup,...(src.setup&&typeof src.setup==='object'?src.setup:{})};
 let recovered=0;numericSetup.forEach(k=>{const n=Number(setup[k]);if(Number.isFinite(n)){setup[k]=n}else{setup[k]=base.setup[k];recovered++}});
 ['planStart','raceDate','raceName'].forEach(k=>{if(setup[k]==null||setup[k]===''){setup[k]=base.setup[k];recovered++}});
 setup.adaptive=setup.adaptive!==false;
 const runs=Array.isArray(src.runs)?src.runs.filter(Boolean).map(r=>({...r,distanceKm:Number(r.distanceKm)||0,durationSec:Number(r.durationSec)||0,avgHr:Number(r.avgHr)||0,avgPower:Number(r.avgPower)||0,rpe:r.rpe==null?null:Number(r.rpe),pain:r.pain==null?null:Number(r.pain),recovery:r.recovery==null?null:Number(r.recovery),powerDrift:r.powerDrift==null?null:Number(r.powerDrift)})):[];
 const assessments=Array.isArray(src.assessments)?src.assessments.filter(Boolean).map(a=>({...a,distance:Number(a.distance)||0,time:Number(a.time)||0,thresholdHr:Number(a.thresholdHr)||0,criticalPower:Number(a.criticalPower)||0,valid:Boolean(a.valid)})):[];
 const plan=Array.isArray(src.plan)?src.plan.filter(Boolean).map(x=>({...x,week:Number(x.week)||1,distance:Number(x.distance)||0,factor:Number(x.factor)||1,zone:{...(x.zone||{}),pace:Number(x.zone?.pace)||0,hr:Number(x.zone?.hr)||0,power:Number(x.zone?.power)||0}})):[];
 migrationReport={...migrationReport,from:Number(src.schemaVersion)||'legacy',to:SCHEMA,status:'success',runs:runs.length,assessments:assessments.length,fieldsRecovered:recovered};
 return{...base,...src,schemaVersion:SCHEMA,setup,days:Array.isArray(src.days)&&src.days.length?src.days:base.days,runs,assessments,plan,weekView:Number(src.weekView)||null,migration:{...migrationReport,time:new Date().toISOString()}};
}
let rawState=loadStoredState();
try{if(rawState) localStorage.setItem(BACKUP_KEY,JSON.stringify(rawState))}catch(err){recordDiagnostic('Pre-migration backup',err)}
let state;try{state=normaliseState(rawState||defaults())}catch(err){recordDiagnostic('Migration failure',err);migrationReport.status='recovered defaults';migrationReport.warning=err.message;state=defaults()}
function save(){const text=JSON.stringify(state);try{localStorage.setItem(STORAGE_KEY,text);localStorage.setItem(MIRROR_KEY,text);return true}catch(err){recordDiagnostic('Save failure',err);toast('Data could not be saved on this device.',true);return false}}
save();
function baselineOn(date){let valid=state.assessments.filter(a=>a.valid&&a.date<=date).sort((a,b)=>a.date.localeCompare(b.date));let a=valid.at(-1);return a?{pace:a.time/a.distance,hr:a.thresholdHr||state.setup.thresholdHr,cp:a.criticalPower||state.setup.criticalPower}:{pace:state.setup.testTime/state.setup.testDistance,hr:state.setup.thresholdHr,cp:state.setup.criticalPower}}
const zoneDef={Recovery:[1.42,.78,.72,'RPE 2–3 · relaxed and restorative'],Easy:[1.30,.84,.78,'RPE 3–4 · conversational aerobic running'],Steady:[1.20,.89,.84,'RPE 5 · controlled moderate work'],Marathon:[1.15,.92,.88,'RPE 5–6 · race-specific control'],Tempo:[1.08,1,.95,'RPE 7–8 · strong but sustainable'],Intervals:[.98,1.04,1.05,'RPE 8–9 · quality repetitions'],Repetition:[.92,1.08,1.15,'RPE 9 · short fast work'],['Fitness assessment']:[1,1,1,'Even maximal benchmark'],['Race Day']:[1.15,.92,.88,'Controlled race execution']};
function zone(type,date){let b=baselineOn(date),z=zoneDef[type]||zoneDef.Easy;return{pace:b.pace*z[0],hr:Math.round(b.hr*z[1]),power:Math.round(b.cp*z[2]),guide:z[3]}}
function weeks(){return Math.max(1,Math.floor((dte(state.setup.raceDate)-dte(state.setup.planStart))/(7*DAY))+1)}function weekStart(w){return new Date(dte(state.setup.planStart).getTime()+(w-1)*7*DAY)}
function phase(w){let t=weeks(),tw=Math.ceil(state.setup.taperDays/7);if(w>t-tw)return'Taper';if(w>t-tw-3)return'Peak';if(w<=3)return'Base';return'Build'}
function currentWeek(){return clamp(Math.floor((today()-dte(state.setup.planStart))/(7*DAY))+1,1,weeks())}
function recentRuns(days=28){return state.runs.filter(r=>today()-dte(r.date)<=days*DAY&&today()>=dte(r.date))}
function metrics(r){let dur=Number(r.durationSec),km=Number(r.distanceKm),hr=Number(r.avgHr),pw=Number(r.avgPower),kg=Number(state.setup.bodyWeight);
let validRun=dur>0&&km>0,validHr=validRun&&hr>0,validPw=validRun&&pw>0&&kg>0;
return{pace:validRun?dur/km:null,dph:validHr?km*1000/(dur/60*hr):null,wpb:validHr&&pw>0?pw/hr:null,
 efficiencyJ:validHr&&pw>0?pw*60/hr:null,effect:validPw?(km*1000/dur)/(pw/kg):null,wkg:pw>0&&kg>0?pw/kg:null}}
const metricRunTypes=['Recovery','Easy','Long run','Marathon','Tempo','Intervals','Fitness assessment','Race'];
const runTypeColors={'Recovery':'#58a65c','Easy':'#2d82c7','Long run':'#7457c8','Marathon':'#e49b35','Tempo':'#d65353','Intervals':'#d4aa23','Fitness assessment':'#7b8794','Race':'#202a35'};
function metricSeries(runs,valueFn,labelSuffix=''){return metricRunTypes.map(type=>({
 label:type+labelSuffix,data:runs.map(r=>r.type===type?valueFn(r):null),color:runTypeColors[type]
})).filter(s=>s.data.some(Number.isFinite))}
function typeMetricSummary(runs){return metricRunTypes.map(type=>{
 let group=runs.filter(r=>r.type===type),eff=group.map(r=>metrics(r).efficiencyJ).filter(Number.isFinite),drift=group.map(r=>r.powerDrift).filter(Number.isFinite);
 return{type,count:group.length,effAvg:avg(eff),effBest:eff.length?Math.max(...eff):null,driftAvg:avg(drift),driftBest:drift.length?Math.min(...drift):null};
}).filter(x=>x.effAvg!==null||x.driftAvg!==null)}
function weekData(w){let st=weekStart(w),en=new Date(st.getTime()+7*DAY),p=state.plan.filter(x=>x.week===w&&x.type!=='Rest'),r=state.runs.filter(x=>dte(x.date)>=st&&dte(x.date)<en);return{planned:sum(p.map(x=>x.distance)),actual:sum(r.map(x=>x.distanceKm)),runs:r,plan:p}}
function adaptiveFactorDetails(w){
 if(!state.setup.adaptive||w<=1)return{factor:1,rawFactor:1,baseFactor:1,items:[{name:'Baseline',adjustment:0,detail:w<=1?'No previous training week is available.':'Adaptive planning is disabled.'}],previousWeek:w-1,plannedKm:null,completedKm:null,status:w<=1?'baseline':'disabled'};
 let previousWeek=w-1,previousEnd=new Date(weekStart(previousWeek).getTime()+7*DAY);
 // A future factor must not interpret an unfinished future week as 0% completion.
 // It remains neutral until the complete preceding week is available.
 if(previousEnd>today())return{factor:1,rawFactor:1,baseFactor:1,items:[{name:'Pending evidence',adjustment:0,detail:`Week ${previousWeek} is not complete. This future factor remains neutral until that week ends.`}],previousWeek,plannedKm:null,completedKm:null,status:'pending'};
 let prev=weekData(previousWeek),ad=prev.planned>0?prev.actual/prev.planned:null;
 let items=[],f=1;
 const add=(name,adjustment,detail)=>{f+=adjustment;items.push({name,adjustment,detail})};
 if(!Number.isFinite(ad))add('Completed load',0,'No planned load was available; no adjustment applied.');
 else if(ad<.70)add('Completed load',-.08,`${Math.round(ad*100)}% of planned distance completed (<70%).`);
 else if(ad<.85)add('Completed load',-.04,`${Math.round(ad*100)}% of planned distance completed (70–84%).`);
 else if(ad<=1.05)add('Completed load',0,`${Math.round(ad*100)}% of planned distance completed (85–105%).`);
 else add('Completed load',-.02,`${Math.round(ad*100)}% completed; excess load is not rewarded.`);
 let aerobic=state.runs.filter(r=>['Easy','Recovery','Long run'].includes(r.type)&&Number(r.durationSec)>=2700&&dte(r.date)>=new Date(weekStart(w).getTime()-35*DAY)&&dte(r.date)<weekStart(w));
 let byType={};aerobic.forEach(r=>(byType[r.type]??=[]).push(r));
 let effChanges=[];
 Object.values(byType).forEach(group=>{group.sort((a,b)=>a.date.localeCompare(b.date));let vals=group.map(r=>metrics(r).efficiencyJ).filter(Number.isFinite);if(vals.length>=4){let cut=Math.floor(vals.length/2),a=avg(vals.slice(0,cut)),b=avg(vals.slice(cut));if(a>0)effChanges.push((b/a-1)*100)}});
 let effChange=avg(effChanges),canReward=Number.isFinite(ad)&&ad>=.85&&ad<=1.05&&aerobic.length>=2;
 if(!Number.isFinite(effChange))add('Efficiency trend',0,'Fewer than four comparable runs of the same type; no adjustment applied.');
 else if(effChange<=-3)add('Efficiency trend',-.02,`Same-type efficiency changed ${effChange.toFixed(1)}%.`);
 else if(effChange>=2&&canReward)add('Efficiency trend',.01,`Same-type efficiency improved ${effChange.toFixed(1)}% with adequate completed load.`);
 else if(effChange>=2)add('Efficiency trend',0,`Efficiency improved ${effChange.toFixed(1)}%, but positive adjustment requires 85–105% load completion and at least two qualifying aerobic runs.`);
 else add('Efficiency trend',0,`Same-type efficiency changed ${effChange.toFixed(1)}%.`);
 let driftVals=aerobic.map(r=>Number(r.powerDrift)).filter(Number.isFinite),drift=driftVals.length?avg(driftVals):null;
 if(!Number.isFinite(drift))add('Cardiac drift',0,'No valid power-based drift data; no adjustment applied.');
 else if(drift>7)add('Cardiac drift',-.04,`Average power-based drift ${drift.toFixed(1)}%.`);
 else if(drift>5)add('Cardiac drift',-.02,`Average power-based drift ${drift.toFixed(1)}%.`);
 else if(drift<=3&&canReward)add('Cardiac drift',.01,`Average power-based drift ${drift.toFixed(1)}% with adequate completed load.`);
 else if(drift<=3)add('Cardiac drift',0,`Drift was ${drift.toFixed(1)}%, but positive adjustment requires 85–105% load completion and at least two qualifying aerobic runs.`);
 else add('Cardiac drift',0,`Average power-based drift ${drift.toFixed(1)}%.`);
 let rawFactor=f,boundedFactor=clamp(rawFactor,state.setup.minFactor,state.setup.maxFactor);
 return{factor:boundedFactor,rawFactor,baseFactor:1,items,previousWeek,plannedKm:prev.planned,completedKm:prev.actual,status:'calculated'};
}
function adaptiveFactor(w){return adaptiveFactorDetails(w).factor}
function validateWorkout(workout){
 const errors=[];
 if(!workout||typeof workout!=='object')return{valid:false,errors:['Workout is missing.']};
 const total=Number(workout.distance),warm=Number(workout.warmDistance||0),main=Number(workout.mainDistance||0),cool=Number(workout.coolDistance||0);
 if(workout.type!=='Rest'&&workout.type!=='Race Day'){
  if(![total,warm,main,cool].every(Number.isFinite))errors.push('A distance component is not numeric.');
  if([total,warm,main,cool].some(x=>x<0))errors.push('A distance component is negative.');
  if(Math.abs((warm+main+cool)-total)>.051)errors.push(`Components total ${(warm+main+cool).toFixed(1)} km but session shows ${total.toFixed(1)} km.`);
  if(total<1)errors.push('Running session is implausibly short.');
  if(!workout.targetScope)errors.push('Target scope is missing.');
  if(!workout.purpose||!workout.coach)errors.push('Coaching explanation is incomplete.');
 }
 if(workout.type==='Intervals'){
  const reps=Number(workout.repetitions),recs=Number(workout.recoveryCount);
  if(!(reps>=2))errors.push('Interval repetition count is invalid.');
  if(recs!==reps-1)errors.push('Interval recovery count must equal repetitions minus one.');
 }
 if(workout.type==='Fitness assessment'&&Number(workout.assessmentDistance)<=0)errors.push('Assessment distance is missing.');
 return{valid:errors.length===0,errors};
}
function validatePlan(plan=state.plan){
 const issues=[],ids=new Set();
 (plan||[]).forEach((p,i)=>{
  if(ids.has(p.id))issues.push({severity:'error',id:p.id,message:'Duplicate workout ID.'});
  ids.add(p.id);
  const check=validateWorkout(p);
  check.errors.forEach(message=>issues.push({severity:'error',id:p.id,index:i,message}));
  const cfg=state.days.find(d=>d[0]===p.day);
  if(p.type!=='Rest'&&p.type!=='Race Day'&&cfg&&!cfg[1])issues.push({severity:'error',id:p.id,message:`Workout scheduled on disabled day ${p.day}.`});
  if(p.phase==='Taper'&&p.type==='Fitness assessment')issues.push({severity:'warning',id:p.id,message:'Maximal assessment appears during taper.'});
  if(p.type!=='Rest'&&p.type!=='Race Day'&&(!p.zone||![p.zone.pace,p.zone.hr,p.zone.power].every(Number.isFinite)))issues.push({severity:'error',id:p.id,message:'Training targets are missing or invalid.'});
 });
 const errors=issues.filter(x=>x.severity==='error').length,warnings=issues.length-errors;
 const score=Math.max(0,100-errors*8-warnings*2);
 return{checked:(plan||[]).length,issues,errors,warnings,score,valid:errors===0};
}
function safeWorkoutFallback(item){
 const total=Math.max(3,Number(item.distance)||3),warm=Math.min(1,Math.max(.5,total*.15)),cool=Math.min(1,Math.max(.5,total*.15)),main=Math.max(.5,total-warm-cool);
 return{...item,type:'Easy',distance:Math.round((warm+main+cool)*10)/10,warmDistance:Math.round(warm*10)/10,mainDistance:Math.round(main*10)/10,coolDistance:Math.round(cool*10)/10,
  warmup:`${warm.toFixed(1)} km very easy`,main:`${main.toFixed(1)} km conversational easy running`,cooldown:`${cool.toFixed(1)} km very easy`,distanceCheck:`${warm.toFixed(1)} + ${main.toFixed(1)} + ${cool.toFixed(1)} = ${(warm+main+cool).toFixed(1)} km`,purpose:'Preserve aerobic continuity with a safe fallback session.',coach:'The original workout failed internal validation and was replaced with an easy run. Review Plan Health for details.',fuel:'Water according to thirst.',targetScope:'Entire easy run',whyThis:'A safe aerobic session preserves consistency without relying on an invalid prescription.',whyAmount:'The distance is limited to the planned session allowance.',skipImpact:'Skipping one fallback easy run has little fitness impact; do not compensate later.'};
}
function buildPlan(){
 let old=new Map((state.plan||[]).filter(p=>dte(p.date)<today()).map(p=>[p.id,p])),out=[],total=weeks(),taper=Math.ceil(state.setup.taperDays/7);
 for(let w=1;w<=total;w++){
   let ph=phase(w),factor=adaptiveFactor(w),base=Math.min(state.setup.maxWeekly,state.setup.currentWeekly*Math.pow(1+state.setup.growth,w-1));
   if(w%4===0&&ph==='Build')base*=.9;
   if(ph==='Taper'){let left=total-w;base*=left===0?.42:left===1?.62:.78}
   base*=factor;

   let prog=clamp((w-1)/Math.max(1,total-taper-2),0,1);
   let long=state.setup.currentLongest+(state.setup.peakLong-state.setup.currentLongest)*prog;
   if(w%4===0&&ph==='Build')long*=.85;
   if(ph==='Taper'){let left=total-w;long=Math.min(long,left===0?0:left===1?18:24)}

   let weekDates=[];
   for(let offset=0;offset<7;offset++){
     let dateObj=new Date(weekStart(w).getTime()+offset*DAY),date=iso(dateObj);
     if(dte(date)>dte(state.setup.raceDate))continue;
     let dayName=dateObj.toLocaleDateString('en-US',{weekday:'long'});
     let cfg=state.days.find(x=>x[0]===dayName)||[dayName,false,'Easy'];
     weekDates.push({dateObj,date,dayName,cfg});
   }

   let isRaceWeek=weekDates.some(x=>x.date===state.setup.raceDate);
   let training=weekDates.filter(x=>x.cfg[1]&&x.date!==state.setup.raceDate);
   let hasLong=training.some(x=>x.cfg[2]==='Long run');
   let quality=training.filter(x=>['Intervals','Tempo'].includes(x.cfg[2]));
   let aerobic=training.filter(x=>!['Intervals','Tempo','Long run'].includes(x.cfg[2]));

   // In race week the race itself is not counted as ordinary training volume.
   // Retain short taper sessions before race day instead of assigning zero km.
   let trainingBudget=isRaceWeek?Math.min(18,Math.max(8,base*.32)):base;
   let longDistance=hasLong?Math.min(long,trainingBudget*.62):0;
   let remaining=Math.max(0,trainingBudget-longDistance);
   let qualityBudget=quality.length?remaining*(isRaceWeek?.32:.48):0;
   let aerobicBudget=Math.max(0,remaining-qualityBudget);
   let qualityShare=quality.length?qualityBudget/quality.length:0;
   let aerobicShare=aerobic.length?aerobicBudget/aerobic.length:0;

   weekDates.forEach(({dateObj,date,dayName,cfg})=>{
     let type=date===state.setup.raceDate?'Race Day':(cfg[1]?cfg[2]:'Rest');
     if(type==='Intervals'&&w%4===0&&ph!=='Taper')type='Fitness assessment';
     // Avoid a maximal assessment during race week.
     if(isRaceWeek&&type==='Fitness assessment')type='Easy';

     let dist=0;
     if(type==='Race Day')dist=state.setup.raceDistance;
     else if(type==='Long run')dist=longDistance;
     else if(['Intervals','Tempo','Fitness assessment'].includes(type))dist=qualityShare;
     else if(type!=='Rest')dist=aerobicShare;

     let z=zone(type,date),id=`${date}-${type}`,detail=prescription(type,dist,w,ph,z);
     let prescribedDistance=Number.isFinite(detail.totalDistance)?detail.totalDistance:Math.round(dist*10)/10;
     let item={id,week:w,date,day:dayName,type,distance:prescribedDistance,phase:ph,factor,zone:z,...detail};
     let selected=old.get(id)||item;
     let check=validateWorkout(selected);
     if(!check.valid){recordDiagnostic(`Invalid generated workout ${id}`,new Error(check.errors.join(' ')));selected=safeWorkoutFallback(item)}
     out.push(selected);
   });
 }
 state.plan=out;state.schemaVersion=SCHEMA;state.lastPlanHealth=validatePlan(out);save()
}
function prescription(type,km,w,ph,z){
 const r1=v=>Math.round((Number(v)||0)*10)/10;
 const fmt=v=>r1(v).toFixed(1);
 const result=(warm,main,cool,extra={})=>{
  warm=r1(warm);main=r1(main);cool=r1(cool);
  const total=r1(warm+main+cool);
  return{totalDistance:total,warmDistance:warm,mainDistance:main,coolDistance:cool,
   distanceCheck:`${fmt(warm)} + ${fmt(main)} + ${fmt(cool)} = ${fmt(total)} km`,accounting:extra.accounting||[{label:'Warm-up',km:warm},{label:'Main set',km:main},{label:'Cooldown',km:cool}],...extra};
 };
 km=r1(Math.max(0,Number(km)||0));
 if(type==='Rest')return{totalDistance:0,warmup:'—',main:'Rest day',cooldown:'—',purpose:'Absorb training and restore freshness.',coach:'Walking and light mobility are fine. Avoid turning recovery into another workout.',fuel:'Normal daily hydration.',targetScope:'No running targets'};
 if(type==='Easy'){
  const total=Math.max(3,km),warm=r1(Math.max(.5,Math.min(1,total*.15))),cool=r1(Math.max(.5,Math.min(1,total*.15))),main=r1(total-warm-cool);
  return result(warm,main,cool,{warmup:`${fmt(warm)} km very easy to settle into relaxed running`,main:`${fmt(main)} km conversational easy running`,cooldown:`${fmt(cool)} km very easy`,purpose:'Develop aerobic capacity while keeping fatigue low.',coach:'The entire run remains easy. Pace, HR and power describe the central easy section; the opening and closing sections should feel even gentler. Slow down for heat, hills, illness or poor recovery.',fuel:total>=12?'Carry fluids; use carbohydrate if running longer than 75–90 min.':'Water according to thirst.',targetScope:'Entire easy run',whyThis:'Easy running builds aerobic capacity and supports recovery from harder sessions.',whyAmount:'The distance fills the aerobic share of the week while keeping intensity low.',skipImpact:'Missing one easy run has little effect. Do not compensate by extending a hard or long session.'});
 }
 if(type==='Long run'){
  const total=Math.max(6,km),warm=r1(Math.min(2,Math.max(1,total*.1))),cool=r1(Math.min(1.5,Math.max(1,total*.07))),main=r1(total-warm-cool);
  let mainText=`${fmt(main)} km controlled aerobic endurance`;
  if(ph==='Peak'&&total>=22)mainText=`${fmt(main-3)} km controlled aerobic endurance, then 3.0 km at controlled marathon effort`;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km deliberately easy`,main:mainText,cooldown:`${fmt(cool)} km very easy`,purpose:'Build aerobic durability, musculoskeletal resilience and race-specific fuelling skill.',coach:`The displayed ${fmt(total)} km is the complete long run. The opening, main section and final easy running are all included. Keep effort controlled; a marathon-effort finish is prescribed only where explicitly stated.`,fuel:'Practise 60–90 g carbohydrate/hour and approximately 400–800 ml fluid/hour, adjusted for conditions.',targetScope:ph==='Peak'&&total>=22?'Controlled endurance; marathon target only for final 3 km':'Controlled endurance section',whyThis:'The long run is the main endurance stimulus and develops durability, fuelling skill and fatigue resistance.',whyAmount:`${fmt(total)} km follows the planned long-run progression and current weekly-volume limit.`,skipImpact:'Missing a long run matters more than missing an easy run, but it should not be squeezed into the next few days. Resume safely and let the plan rebuild progression.'});
 }
 if(type==='Intervals'){
  let rep=ph==='Build'||ph==='Peak'?.8:.4, rec=rep===.8?.4:.2;
  let minReps=rep===.8?4:5,maxReps=rep===.8?6:8;
  let suggested=Math.round((Math.max(km,5)-3.5+rec)/(rep+rec));
  let reps=clamp(suggested,minReps,maxReps);
  if(ph==='Taper'){rep=.4;rec=.2;reps=4;}
  const warm=2.0,cool=1.5,fast=r1(reps*rep),recoveries=Math.max(0,reps-1),recoveryTotal=r1(recoveries*rec),main=r1(fast+recoveryTotal);
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy, with drills and 3–4 strides within the final 0.5 km`,main:`${reps} × ${Math.round(rep*1000)} m fast (${fmt(fast)} km) with ${recoveries} × ${Math.round(rec*1000)} m easy-jog recovery (${fmt(recoveryTotal)} km) between repetitions; main set ${fmt(main)} km total`,cooldown:`${fmt(cool)} km very easy`,purpose:rep>=.8?'Improve aerobic power and the ability to sustain strong repeatable efforts.':'Improve VO₂max, leg speed and running economy with controlled repeatable efforts.',coach:'Pace, HR and power targets apply only to the fast repetitions. Each recovery is completed between repetitions; there is no recovery after the final repetition. The total session distance is derived from the prescribed warm-up, repetitions, recoveries and cooldown.',fuel:'Arrive hydrated; carbohydrate is useful when the total session exceeds 60 minutes.',targetScope:'Fast repetitions only',repetitions:reps,recoveryCount:recoveries,fastDistance:fast,recoveryDistance:recoveryTotal,accounting:[{label:'Warm-up',km:warm},{label:'Fast running',km:fast},{label:'Recoveries',km:recoveryTotal},{label:'Cooldown',km:cool}],whyThis:'This session develops aerobic power and running economy through repeatable high-quality efforts.',whyAmount:`${reps} repetitions provide a meaningful stimulus while keeping the hard volume appropriate for the current phase.`,skipImpact:'Missing one interval session has limited effect. Do not add it to another day; resume the plan and protect the next long run.'});
 }
 if(type==='Tempo'){
  const warm=2.0,cool=1.5;
  let blocks,blockDistance,recoveryDistance;
  if(ph==='Base'){blocks=1;blockDistance=3;recoveryDistance=0;}
  else if(ph==='Build'){blocks=2;blockDistance=2;recoveryDistance=.5;}
  else if(ph==='Peak'){blocks=2;blockDistance=3;recoveryDistance=.5;}
  else {blocks=1;blockDistance=2.5;recoveryDistance=0;}
  // Let available weekly volume scale the work, but preserve a meaningful scientific session.
  if(km>=10&&ph==='Build'){blocks=2;blockDistance=2.5;}
  const quality=r1(blocks*blockDistance),recoveries=Math.max(0,blocks-1),recoveryTotal=r1(recoveries*recoveryDistance),main=r1(quality+recoveryTotal);
  const mainText=blocks===1?`${fmt(quality)} km continuous at controlled tempo/threshold effort`:`${blocks} × ${fmt(blockDistance)} km at controlled tempo/threshold effort (${fmt(quality)} km quality) with ${recoveries} × ${fmt(recoveryDistance)} km easy jog (${fmt(recoveryTotal)} km); main set ${fmt(main)} km total`;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy, including 3–4 short strides`,main:mainText,cooldown:`${fmt(cool)} km very easy`,purpose:'Raise sustainable threshold speed while preserving controlled, repeatable execution.',coach:'Pace, HR and power targets apply to the tempo/threshold work only. Recoveries, when prescribed, are easy and are included in the main-set and total-session distance.',fuel:'Take a small carbohydrate intake beforehand when training fasted or after a long workday.',targetScope:'Tempo/threshold work only',qualityDistance:quality,recoveryCount:recoveries,recoveryDistance:recoveryTotal,accounting:[{label:'Warm-up',km:warm},{label:'Tempo work',km:quality},{label:'Recoveries',km:recoveryTotal},{label:'Cooldown',km:cool}],whyThis:'Threshold work raises the fastest pace you can sustain without rapidly accumulating fatigue.',whyAmount:`${fmt(quality)} km of quality work matches the current training phase and available weekly load.`,skipImpact:'A single missed tempo run is not critical. Continue with the next planned session rather than trying to catch up.'});
 }
 if(type==='Fitness assessment'){
  const test=Math.max(1,r1(Number(state.setup.testDistance)||5)),warm=2.0,cool=1.5,main=test;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy, with drills and 3–4 strides within the final 0.5 km`,main:`${fmt(test)} km evenly paced maximal assessment`,cooldown:`${fmt(cool)} km very easy`,purpose:'Create a repeatable benchmark that can update future training targets.',coach:'The assessment distance is the hard test itself, not the complete outing. Pace, HR and power targets apply to the assessment only; the displayed total includes warm-up and cooldown.',fuel:'Use a normal pre-run meal and avoid starting depleted.',targetScope:'Assessment effort only',assessmentDistance:test,accounting:[{label:'Warm-up',km:warm},{label:'Assessment',km:test},{label:'Cooldown',km:cool}],whyThis:'A repeatable benchmark updates training zones and race prediction using completed evidence.',whyAmount:`The ${fmt(test)} km test is long enough to measure current fitness while remaining repeatable.`,skipImpact:'Postpone the assessment when ill, injured or poorly recovered; normal training can continue without compensating.'});
 }
 if(type==='Marathon'){
  const warm=2.0,cool=1.5,quality=Math.max(3,r1(Math.max(km,7)-warm-cool)),main=quality;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy`,main:`${fmt(quality)} km at controlled marathon effort`,cooldown:`${fmt(cool)} km very easy`,purpose:'Develop race-specific pace control, economy and durability.',coach:'Pace, HR and power targets apply only to the marathon-effort block. The displayed total is derived from all three sections.',fuel:'Practise the carbohydrate and fluid routine intended for race day.',targetScope:'Marathon-effort section',whyThis:'Marathon-effort running develops race-specific economy and pacing control.',whyAmount:`${fmt(quality)} km provides specific work without turning the whole session into a race effort.`,skipImpact:'Do not move this session next to another hard workout. Resume the plan and preserve the next long run.'});
 }
 return{totalDistance:km,warmup:'Pre-race mobility and easy jogging as needed (outside the official race distance)',main:`${fmt(km)} km race`,cooldown:'Walk and begin recovery nutrition after finishing (outside the official race distance)',purpose:'Execute the race plan.',coach:'The displayed distance is the official race distance. Pace, HR and power refer to the race itself; pre-race warm-up and post-race walking are additional.',fuel:'60–90 g carbohydrate/hour and 400–800 ml fluid/hour.',targetScope:'Race effort'};
}
if(state.schemaVersion!==SCHEMA){state.plan=[];buildPlan()}else if(!state.plan?.length)buildPlan();
state.runs.forEach(r=>{if(r.planId){r.matchStatus='matched';r.matchMethod=r.matchMethod||'legacy';let p=state.plan.find(x=>x.id===r.planId);if(p){r.plannedDate=p.date;r.dayOffset=Math.round((dte(r.date)-dte(p.date))/DAY)}}else if(!r.matchStatus)r.matchStatus='adHoc'});save();
function compatibleRunType(planType,runType){
 const groups={
  'Long run':['Long run'],
  'Tempo':['Tempo','Marathon'],
  'Intervals':['Intervals','Fitness assessment'],
  'Fitness assessment':['Fitness assessment','Race'],
  'Easy':['Easy','Recovery'],
  'Recovery':['Recovery','Easy'],
  'Marathon':['Marathon','Tempo'],
  'Race Day':['Race']
 };
 return (groups[planType]||[planType]).includes(runType);
}
function matchingRun(p,runs=state.runs){return runs.find(r=>r.planId===p.id)}
function matchTimingCredit(run,plan){
 if(!run||!plan)return 0;
 let offset=Math.round((dte(run.date)-dte(plan.date))/DAY),a=Math.abs(offset);
 return a===0?100:a===1?90:a===2?75:50;
}
function applyRunMatch(run,selection,method='user'){
 delete run.planId;delete run.plannedDate;delete run.dayOffset;
 run.matchMethod=method;
 if(selection&&selection!=='adhoc'&&selection!=='unresolved'){
  let p=state.plan.find(x=>x.id===selection);
  if(!p)throw Error('The selected planned workout no longer exists.');
  let occupied=state.runs.find(x=>x.id!==run.id&&x.planId===p.id);
  if(occupied)throw Error('That planned workout is already linked to another run.');
  run.planId=p.id;run.matchStatus='matched';run.plannedDate=p.date;
  run.dayOffset=Math.round((dte(run.date)-dte(p.date))/DAY);
 }else run.matchStatus=selection==='unresolved'?'unresolved':'adHoc';
 return run;
}
function suggestedPlanId(run){
 let candidates=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&!state.runs.some(r=>r.id!==run.id&&r.planId===p.id));
 candidates.sort((a,b)=>{
  let ac=compatibleRunType(a.type,run.type)?0:1,bc=compatibleRunType(b.type,run.type)?0:1;
  let ad=Math.abs(dte(a.date)-dte(run.date)),bd=Math.abs(dte(b.date)-dte(run.date));
  return ac-bc||ad-bd;
 });
 let best=candidates[0];
 return best&&Math.abs(dte(best.date)-dte(run.date))<=14*DAY?best.id:null;
}
function planMatchOptions(run,selected){
 const actual=dte(run.date),actualTime=actual.getTime();
 const validActual=Number.isFinite(actualTime);
 let plans=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day');
 const details=p=>{
  const planned=dte(p.date),plannedTime=planned.getTime();
  const validPlanned=Number.isFinite(plannedTime);
  const offset=validActual&&validPlanned?Math.round((actualTime-plannedTime)/DAY):null;
  const linked=state.runs.find(r=>r.id!==run.id&&r.planId===p.id);
  return {p,offset,linked,distance:offset===null?Number.MAX_SAFE_INTEGER:Math.abs(offset)};
 };
 let rows=plans.map(details).sort((a,b)=>a.distance-b.distance||a.p.date.localeCompare(b.p.date));
 const option=x=>{
  let {p,offset,linked}=x;
  let timing=offset===null?'date unavailable':offset===0?'same day':offset>0?`${offset} day${offset===1?'':'s'} late`:`${Math.abs(offset)} day${offset===-1?'':'s'} early`;
  let type=compatibleRunType(p.type,run.type)?'type compatible':'different type';
  return `<option value="${esc(p.id)}" ${selected===p.id?'selected':''} ${linked?'disabled':''}>${fmtDate(p.date)} · ${esc(p.type)} · ${p.distance.toFixed(1)} km · ${timing} · ${type}${linked?' · already linked':''}</option>`;
 };
 const suggestedId=suggestedPlanId(run),suggested=rows.find(x=>x.p.id===suggestedId&&!x.linked);
 const sameWeek=rows.filter(x=>x.offset!==null&&Math.floor((actualTime-dte(state.setup.planStart).getTime())/(7*DAY))===Math.floor((dte(x.p.date).getTime()-dte(state.setup.planStart).getTime())/(7*DAY))&&x.p.id!==suggestedId);
 const nearby=rows.filter(x=>!sameWeek.includes(x)&&x.p.id!==suggestedId).slice(0,24);
 let html='';
 if(suggested)html+=`<optgroup label="Suggested match">${option(suggested)}</optgroup>`;
 if(sameWeek.length)html+=`<optgroup label="This training week">${sameWeek.map(option).join('')}</optgroup>`;
 if(nearby.length)html+=`<optgroup label="Other planned workouts">${nearby.map(option).join('')}</optgroup>`;
 html+=`<optgroup label="Other actions"><option value="adhoc" ${selected==='adhoc'?'selected':''}>Ad hoc — not linked to the plan</option><option value="unresolved" ${selected==='unresolved'?'selected':''}>Decide later — leave unresolved</option></optgroup>`;
 return html;
}
function matchSummary(run){
 if(run.planId){let p=state.plan.find(x=>x.id===run.planId);if(p){let o=Math.round((dte(run.date)-dte(p.date))/DAY),timing=o===0?'same day':o>0?`${o} day${o===1?'':'s'} late`:`${Math.abs(o)} day${o===-1?'':'s'} early`;return `${p.type} · ${timing}${compatibleRunType(p.type,run.type)?'':' · different type'}`}}
 return run.matchStatus==='unresolved'?'Needs matching review':'Ad hoc';
}
function status(p){let done=matchingRun(p);if(done)return'completed';if(p.type==='Rest')return'rest';let d=dte(p.date);if(d<today())return'missed';if(d.getTime()===today().getTime())return'today';return'upcoming'}
function confidence(){
 let raceDate=dte(state.setup.raceDate);
 let daysRemaining=Math.max(0,(raceDate-today())/DAY),weeksRemaining=daysRemaining/7;
 let taperWeeks=Math.max(1,state.setup.taperDays/7),usableBuildWeeks=Math.max(0,weeksRemaining-taperWeeks);
 // A planned session becomes evidence only after its calendar day has passed.
 // A completed session logged today is included immediately, but an unfinished session
 // scheduled for later today is not treated as a measured zero.
 let completedDateSet=new Set(state.runs.map(r=>r.date));
 const hasElapsedOrCompleted=p=>dte(p.date)<today()||Boolean(matchingRun(p));
 let due=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&hasElapsedOrCompleted(p)&&today()-dte(p.date)<=28*DAY);
 let windowStart=due.length?dte(due[0].date):new Date(today().getTime()-28*DAY);
 let recent=state.runs.filter(r=>dte(r.date)>=windowStart&&dte(r.date)<=today());
 let plannedKm=sum(due.map(p=>p.distance)),actual=sum(recent.map(r=>r.distanceKm));
 let latest=state.assessments.filter(a=>a.valid).sort((a,b)=>b.date.localeCompare(a.date))[0];
 let testTime=latest?latest.time:state.setup.testTime,testDist=latest?latest.distance:state.setup.testDistance;
 let riegel=testTime*Math.pow(state.setup.raceDistance/testDist,1.06);
 let fitness=clamp(100-(riegel/state.setup.targetTime-1)*300,0,100);
 let completedLongest=state.runs.length?Math.max(...state.runs.map(r=>Number(r.distanceKm)||0)):0;
 let longest=completedLongest;
 let endurance=clamp(longest/state.setup.peakLong*100,0,100);
 let completedDates=new Set(recent.map(r=>r.date)),matchedRuns=due.map(p=>({p,r:matchingRun(p,recent)})).filter(x=>x.r),matched=matchedRuns.length,opportunities=due.length;
 let executionEvidence=opportunities>0;
 let consistency=executionEvidence?clamp(matched/opportunities*100,0,100):null;
 let adherence=executionEvidence&&plannedKm>0?clamp(actual/plannedKm*100,0,100):null;
 let scheduleAdherence=matchedRuns.length?avg(matchedRuns.map(x=>matchTimingCredit(x.r,x.p))):null;
 let recoveryValues=recent.map(r=>Number(r.recovery)).filter(v=>Number.isFinite(v)&&v>0),painValues=recent.map(r=>Number(r.pain)).filter(Number.isFinite);
 let recoveryScore=recoveryValues.length?clamp(avg(recoveryValues)/5*100,0,100):null;
 let painScore=painValues.length?clamp((10-avg(painValues))/10*100,0,100):null;

 // Field efficiency proxy: compare J/heartbeat only within the same run type, then combine
 // its trend with recent power-based cardiac drift. This is not laboratory running economy.
 let typeTrends=[];
 ['Easy','Recovery','Long run'].forEach(type=>{
   let vals=recent.filter(r=>r.type===type&&r.durationSec>=1800).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>metrics(r).efficiencyJ).filter(Number.isFinite);
   if(vals.length>=4){let cut=Math.floor(vals.length/2),early=avg(vals.slice(0,cut)),late=avg(vals.slice(cut));if(early>0)typeTrends.push((late/early-1)*100)}
 });
 let effTrend=avg(typeTrends),effTrendScore=Number.isFinite(effTrend)?clamp(70+effTrend*5,0,100):null;
 let driftRecent=recent.filter(r=>['Easy','Recovery','Long run'].includes(r.type)).map(r=>Number(r.powerDrift)).filter(Number.isFinite);
 let driftAvg=driftRecent.length?avg(driftRecent):null;
 let driftScore=Number.isFinite(driftAvg)?clamp(100-(Math.max(0,driftAvg-2)/8)*100,0,100):null;
 let efficiency=(Number.isFinite(effTrendScore)||Number.isFinite(driftScore))?
   ((Number.isFinite(effTrendScore)?effTrendScore:0)*.60+(Number.isFinite(driftScore)?driftScore:0)*.40):null;

 let buildModel=buildRequirementEstimate(state.setup),requiredBuildWeeks=buildModel.requiredBuildWeeks;
 let preparationTime=daysRemaining<=0?0:clamp((usableBuildWeeks/Math.max(1,requiredBuildWeeks))*100,0,100);
 // Training opportunity is a non-linear, race-specific feasibility model.
 // It combines enabled days, race distance, current phase and planned peak volume.
 let enabledTrainingDays=state.days.filter(d=>d[1]).length;
 let opportunityModel=trainingOpportunityModel(state.setup,enabledTrainingDays,phase(currentWeek()));
 let trainingOpportunity=opportunityModel.opportunityScore;
 let recommendedTrainingDays=opportunityModel.idealDays;
 let minimumTrainingDays=opportunityModel.minimumEffectiveDays;
 let dueLongs=state.plan.filter(p=>p.type==='Long run'&&hasElapsedOrCompleted(p)&&today()-dte(p.date)<=84*DAY);
 let completedLongs=dueLongs.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)});
 let longRunExecution=dueLongs.length?clamp(completedLongs.length/dueLongs.length*100,0,100):null;
 let specificDue=state.plan.filter(p=>['Tempo','Intervals','Fitness assessment'].includes(p.type)&&hasElapsedOrCompleted(p)&&today()-dte(p.date)<=56*DAY);
 let specificDone=specificDue.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)}).length;
 let specificity=specificDue.length?clamp(specificDone/specificDue.length*100,0,100):null;
 const weighted=(items)=>{
  let enriched=items.map(x=>{
   let evidenceFraction=Number.isFinite(x.evidenceFraction)?clamp(x.evidenceFraction,0,1):(typeof x.hasEvidence==='boolean'?(x.hasEvidence?1:0):(Number.isFinite(x.score)?1:0));
   let hasEvidence=evidenceFraction>0;
   return{...x,hasEvidence,evidenceFraction,displayScore:hasEvidence&&Number.isFinite(x.score)?x.score:0};
  });
  let totalWeight=sum(enriched.map(x=>x.weight)),availableWeight=sum(enriched.map(x=>x.weight*x.evidenceFraction));
  return{score:totalWeight?sum(enriched.map(x=>x.displayScore*x.weight))/totalWeight:0,coverage:totalWeight?availableWeight/totalWeight:0,items:enriched};
 };
 // Each component belongs to exactly one pillar.
 let pillars=[
  {name:'Physiological readiness',weight:.35,color:'#2d82c7',description:'Current performance capacity, long-run endurance and field efficiency.',...weighted([{name:'Fitness',score:fitness,weight:.50,hasEvidence:Number.isFinite(testTime)&&testTime>0&&testDist>0},{name:'Endurance',score:endurance,weight:.30,hasEvidence:state.runs.some(r=>(Number(r.distanceKm)||0)>0)},{name:'Efficiency',score:efficiency,weight:.20,evidenceFraction:(Number.isFinite(effTrendScore)?.60:0)+(Number.isFinite(driftScore)?.40:0)}])},
  {name:'Training execution',weight:.25,color:'#159487',description:'How closely completed volume, sessions and timing match the plan.',...weighted([{name:'Adherence',score:adherence,weight:.45,hasEvidence:executionEvidence},{name:'Consistency',score:consistency,weight:.35,hasEvidence:executionEvidence},{name:'Schedule adherence',score:scheduleAdherence,weight:.20,hasEvidence:matchedRuns.length>0}])},
  {name:'Recovery & health',weight:.20,color:'#7457c8',description:'Whether recovery and pain evidence support absorbing the programme.',...weighted([{name:'Recovery',score:recoveryScore,weight:.60,hasEvidence:recoveryValues.length>0},{name:'Pain status',score:painScore,weight:.40,hasEvidence:painValues.length>0}])},
  {name:'Race readiness',weight:.20,color:'#e49b35',description:'Whether time, weekly training opportunity, key long runs and race-specific sessions support the goal.',...weighted([{name:'Preparation time',score:preparationTime,weight:.35,hasEvidence:true},{name:'Training opportunity',score:trainingOpportunity,weight:.20,hasEvidence:true},{name:'Long-run execution',score:longRunExecution,weight:.30,hasEvidence:dueLongs.length>0},{name:'Specificity',score:specificity,weight:.15,hasEvidence:specificDue.length>0}])}
 ];
 let rawOverall=sum(pillars.map(p=>p.score*p.weight))/sum(pillars.map(p=>p.weight));
 let evidenceCoverage=sum(pillars.map(p=>p.weight*p.coverage));
 let overall=clamp(rawOverall-opportunityModel.confidencePenalty,0,100); // Missing evidence contributes zero; schedule feasibility applies an immediate context-specific deduction.
 let measuredPillars=pillars.map(p=>{let available=p.items.filter(i=>i.hasEvidence),aw=sum(available.map(i=>i.weight));return{weight:p.weight*p.coverage,score:aw?sum(available.map(i=>i.displayScore*i.weight))/aw:null}}).filter(p=>Number.isFinite(p.score)&&p.weight>0);
 let measuredOverall=measuredPillars.length?sum(measuredPillars.map(p=>p.score*p.weight))/sum(measuredPillars.map(p=>p.weight)):null;
 let components=pillars.flatMap(p=>p.items.map(i=>({...i,pillar:p.name,pillarColor:p.color})));
 return{pillars,components,overall,rawOverall,evidenceCoverage,riegel,plannedKm,actual,longest,completedLongest,matched,opportunities,weeksRemaining,usableBuildWeeks,requiredBuildWeeks,buildRequirements:buildModel.components,preparationTime,trainingOpportunity,enabledTrainingDays,recommendedTrainingDays,minimumTrainingDays,opportunityModel,effTrend,driftAvg,measuredOverall}
}
function prediction(){
 let c=confidence();
 let basis=Number.isFinite(c.measuredOverall)?c.measuredOverall:75;
 let penalty=Math.max(0,(75-basis)/500);
 return c.riegel*(1+penalty)
}
const interpretations={
 'Fitness':s=>s>=85?'Recent assessment performance strongly supports the target.':s>=65?'Performance is credible but not yet comfortably above the target requirement.':'Current assessment evidence does not support the target.',
 'Endurance':s=>s>=85?'Longest-run evidence is close to the planned peak.':s>=65?'Endurance is progressing but key long runs remain.':'Long-run preparation is still limited.',
 'Efficiency':s=>s==null?'Comparable same-type runs with power and heart rate are required.':s>=75?'Efficiency and durability evidence is stable or improving.':'Efficiency or durability evidence needs improvement.',
 'Adherence':s=>s==null?'No planned distance is due yet.':s>=85?'Completed distance closely matches due distance.':'There is a meaningful completed-volume gap.',
 'Consistency':s=>s==null?'No scheduled sessions are due yet.':s>=80?'Scheduled training frequency is reliable.':'Recent session completion is inconsistent.',
 'Long-run execution':s=>s==null?'No long runs are due yet.':s>=80?'Key long runs are being completed reliably.':'Several due long runs remain incomplete.',
 'Recovery':s=>s==null?'Add recovery ratings after runs to create evidence.':s>=75?'Recovery ratings support normal training.':'Recovery ratings suggest fatigue management is needed.',
 'Pain status':s=>s==null?'Add pain ratings after runs to create evidence.':s>=80?'Pain evidence is reassuring.':'Pain evidence warrants caution and possible load reduction.',
 'Preparation time':s=>s>=80?'Sufficient build time remains.':s>=60?'The timeline is workable but has little disruption margin.':s>=40?'The required progression is aggressive.':'Too little build time remains for the current peak targets.',
 'Training opportunity':s=>s>=95?'Weekly training frequency supports the race profile and planned load.':s>=75?'The selected frequency is workable but offers less load-distribution flexibility.':s>=55?'Training opportunities are materially limited for this race distance, phase and ambition.':'Too few weekly training opportunities support the current race goal and planned peak load.',
 'Specificity':s=>s==null?'No marathon-specific sessions are due yet.':s>=80?'Specific sessions are being completed reliably.':'Marathon-specific execution is incomplete.'
};
const actions={
 'Fitness':'Complete a valid evenly paced assessment before making the race goal more aggressive.',
 'Endurance':'Prioritise controlled long runs and practise race fuelling.',
 'Efficiency':'Collect comparable same-type aerobic runs and review both J/heartbeat and power-based drift.',
 'Adherence':'Close the volume gap gradually and never recover missed kilometres in one week.',
 'Consistency':'Protect the core weekly sessions before adding optional work.',
 'Long-run execution':'Complete the next suitable long run rather than adding intensity.',
 'Recovery':'Log recovery and reduce load when ratings trend downward.',
 'Pain status':'Do not progress load while pain changes stride or rises across runs.',
 'Preparation time':'Extend the timeline, reduce peak requirements or keep the target conservative.',
 'Training opportunity':'Enable another suitable training day, reduce the weekly-volume target or adopt a more conservative race goal.',
 'Specificity':'Complete the next marathon-specific session at controlled, repeatable effort.'
};
const componentDefinitions={
 'Fitness':'Score = 100 − 300 × (Riegel-predicted race time ÷ target time − 1), limited to 0–100. The latest valid assessment is used.',
 'Endurance':'Score = longest credible completed run ÷ planned peak long run × 100, limited to 0–100.',
 'Efficiency':'60% same-run-type J/heartbeat trend and 40% recent power-based cardiac-drift score. Missing sub-evidence contributes zero; comparisons require similar run types.',
 'Adherence':'Score = completed distance ÷ due planned distance over the recent 28-day window × 100, limited to 0–100.',
 'Consistency':'Score = due sessions completed on the scheduled date ÷ all due sessions over the recent window × 100.',
 'Long-run execution':'Score = completed due long runs ÷ due long runs during the last 84 days × 100.',
 'Recovery':'Score = average logged recovery rating ÷ 5 × 100.',
 'Pain status':'Score = (10 − average logged pain rating) ÷ 10 × 100, so lower pain scores higher.',
 'Preparation time':'Score compares usable build weeks before taper with estimated weeks needed to reach weekly-volume and peak-long-run targets safely.',
 'Training opportunity':'Base opportunity = (enabled days ÷ minimum effective days)^1.6, capped at 100%. Its consequence is scaled by race distance (5/8/12/18 points), phase (Base 0.7, Build 1.0, Peak 1.3, Taper 0.3) and peak-week ambition (0.6–1.5).',
 'Specificity':'Score = completed due tempo, interval and fitness-assessment sessions ÷ all such due sessions during the last 56 days × 100.'
};

function assessmentText(c){let weak=[...c.components].sort((a,b)=>a.score-b.score)[0];if(c.overall>=85)return'Your current fitness, endurance and training execution strongly support the goal. Preserve consistency and avoid adding unnecessary fatigue.';if(c.overall>=70)return`The goal is realistic, but readiness still depends on completing the remaining key sessions and maintaining recovery. The weakest component is ${weak.name}.`;if(c.overall>=55)return`Some indicators support the goal, but overall readiness is not yet secure. The largest current limiter is ${weak.name}. Focus there before making the target more aggressive.`;return'The available training evidence does not yet support the target with readiness. Rebuild the weakest foundations, log completed sessions consistently and use the next assessment to review the goal.'}
function kpi(l,v,s=''){return`<div class="kpi"><label>${esc(l)}</label><strong>${esc(v)}</strong><small>${esc(s)}</small></div>`}
function coachLabel(name,score){
 const labels={
  'Fitness':score>=85?'Current fitness supports the race target':'Fitness evidence needs strengthening',
  'Preparation time':score>=80?'The preparation timeline is sufficient':'The preparation timeline is tight',
  'Training opportunity':score>=95?'Weekly training frequency supports the goal':'Training frequency limits the preparation plan',
  'Endurance':score>=75?'Long-run endurance is progressing well':'Long-run endurance remains a limiter',
  'Adherence':score>=80?'Training volume is being completed reliably':'Completed volume is below plan',
  'Consistency':score>=80?'Weekly training frequency is consistent':'Session consistency needs attention',
  'Schedule adherence':score>=85?'Planned sessions are usually completed close to schedule':'Workout timing is frequently shifted',
  'Long-run execution':score>=80?'Key long runs are being completed':'Long-run execution needs attention',
  'Recovery':score>=75?'Recovery supports normal training':'Recovery evidence suggests caution',
  'Pain status':score>=80?'Pain evidence is reassuring':'Pain requires closer monitoring',
  'Specificity':score>=80?'Specific sessions are on track':'Race-specific work is incomplete',
  'Efficiency':score>=75?'Aerobic efficiency is improving':'Aerobic efficiency needs more evidence'
 };
 return labels[name]||`${name}: ${Math.round(score)}`;
}

function uniqueComponents(components){let seen=new Set();return components.filter(x=>{if(seen.has(x.name))return false;seen.add(x.name);return true})}
function coachEngine(){
 let c=confidence(),pred=prediction(),cw=currentWeek(),wd=weekData(cw),scored=uniqueComponents(c.components.filter(x=>x.hasEvidence).map(x=>({...x,score:x.displayScore}))).sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name));
 let strongest=[...scored].sort((a,b)=>b.score-a.score)[0],weakest=scored[0];
 let raceWeeks=Math.max(0,c.weeksRemaining),feasibility=clamp(c.usableBuildWeeks/Math.max(1,c.requiredBuildWeeks),0,1.15);
 let baseFollowPlan=60+feasibility*34+(c.overall*.04);
 // Frequency is a forward-looking feasibility constraint. A reduced schedule therefore
 // lowers race-day readiness immediately even before any workout has been missed.
 let opportunityPenalty=c.opportunityModel.confidencePenalty;
 let followPlan=clamp(baseFollowPlan-opportunityPenalty,0,98),currentTrend=clamp(c.overall+(followPlan-c.overall)*.72,0,96),missWeekly=clamp(followPlan-Math.min(18,6+raceWeeks*.35),0,95);
 let coachConfidencePct=Math.round(clamp(c.evidenceCoverage*100,0,100));
 let status=followPlan>=85?'On track':followPlan>=72?'Achievable with focused execution':followPlan>=60?'At risk — key preparation gaps remain':'Not yet supported by current evidence';
 let completedRuns=state.runs.filter(r=>dte(r.date)<=today()&&Number(r.distanceKm)>0);
 let completedLongs=completedRuns.filter(r=>['Long run','Race'].includes(r.type)).length;
 let completedSpecific=completedRuns.filter(r=>['Tempo','Intervals','Marathon','Fitness assessment'].includes(r.type)).length;
 let matched=completedRuns.filter(r=>r.planId).length;
 let completedWeekVolumes=[];
 for(let w=1;w<=currentWeek();w++)completedWeekVolumes.push(weekData(w).actual);
 let bestCompletedWeek=completedWeekVolumes.length?Math.max(0,...completedWeekVolumes):0;
 let dueWorkouts=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&dte(p.date)<=today()).length;
 let progress=[
  {label:'Longest verified run',value:c.completedLongest,target:Number(state.setup.peakLong)||1,unit:'km'},
  {label:'Best completed week',value:bestCompletedWeek,target:Number(state.setup.maxWeekly)||1,unit:'km'},
  {label:'Long-run evidence',value:completedLongs,target:Math.max(3,Math.ceil(weeks()*.22)),unit:'runs'},
  {label:'Race-specific sessions',value:completedSpecific,target:Math.max(4,Math.ceil(weeks()*.30)),unit:'sessions'},
  {label:'Weekly training opportunities',value:c.enabledTrainingDays,target:c.minimumTrainingDays,unit:'days'},
  {label:'Plan-linked workouts',value:matched,target:Math.max(1,dueWorkouts),unit:'workouts'}
 ];
 let limiting=Object.entries(c.buildRequirements).sort((a,b)=>b[1]-a[1])[0];
 let next=state.plan.filter(p=>p.type!=='Rest'&&dte(p.date)>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0];
 return{c,pred,cw,wd,scored,strongest,weakest,followPlan,currentTrend,missWeekly,coachConfidencePct,status,progress,limiting,next};
}
function progressCard(x){let pct=clamp(x.value/Math.max(.01,x.target)*100,0,100);let value=x.unit==='km'?`${x.value.toFixed(1)} / ${x.target.toFixed(1)} km`:`${Math.round(x.value)} / ${Math.round(x.target)} ${x.unit}`;return `<div class="progressCard"><div><b>${x.label}</b><span>${value}</span></div><strong>${Math.round(pct)}%</strong><div class="progressTrack"><i style="width:${pct}%"></i></div></div>`}
function renderDashboard(){
 let engine=coachEngine(),{c,pred,cw,wd}=engine;
 $('phaseBadge').textContent=phase(cw);
 $('raceTitle').textContent=state.setup.raceName;
 $('raceSubtitle').textContent=`${dte(state.setup.raceDate).toLocaleDateString()} • ${state.setup.raceDistance.toFixed(1)} km • ${raceProfile().label} profile`;
 $('confidenceValue').textContent=Math.round(c.overall)+'%';
 document.querySelector('.confidenceRing').style.setProperty('--pct',Math.round(c.overall)+'%');
 $('raceDayReadiness').textContent=Math.round(engine.followPlan)+'%';
 $('coachConfidence').textContent=`Coach confidence ${engine.coachConfidencePct}%`;
 $('trackStatus').innerHTML=`<span class="statusDot"></span><b>${engine.status}</b>`;
 $('coachSnapshot').innerHTML=`<div class="snapshotItem"><span>Biggest strength</span><b>${engine.strongest?.name||'More evidence needed'}</b><small>${engine.strongest?interpretations[engine.strongest.name](engine.strongest.score):'Log completed training to improve confidence.'}</small></div><div class="snapshotItem warn"><span>Biggest limiter</span><b>${engine.weakest?.name||'More evidence needed'}</b><small>${engine.weakest?interpretations[engine.weakest.name](engine.weakest.score):'No measured limiter yet.'}</small></div><div class="snapshotItem"><span>Best action now</span><b>${engine.next?`${fmtDate(engine.next.date)} · ${engine.next.type}`:'Recover and review'}</b><small>${engine.next?`${engine.next.distance.toFixed(1)} km · ${engine.next.purpose}`:'No future workout is available.'}</small></div>`;
 $('goalProgress').innerHTML=engine.progress.map(progressCard).join('');
 let total=Math.max(1,weeks()),pos=clamp((engine.cw-1)/(Math.max(1,total-1))*100,0,100),taper=Math.max(0,100-(Math.ceil(state.setup.taperDays/7)/total*100));
 $('raceTimeline').innerHTML=`<div class="timelineLabels"><span>Plan start</span><span>Peak</span><span>Taper</span><span>Race</span></div><div class="timelineTrack"><i class="timelineDone" style="width:${pos}%"></i><span class="timelineNow" style="left:${pos}%"></span><span class="timelineTaper" style="left:${taper}%"></span></div><div class="timelineMeta"><b>${phase(engine.cw)} phase</b><span>${Math.max(0,Math.ceil(c.weeksRemaining))} weeks until race</span></div>`;
 $('forecastScenarios').innerHTML=`<div><span>Follow the plan</span><b>${Math.round(engine.followPlan)}%</b></div><div><span>Current trend continues</span><b>${Math.round(engine.currentTrend)}%</b></div><div><span>Miss one run each week</span><b>${Math.round(engine.missWeekly)}%</b></div><div><span>Current readiness</span><b>${Math.round(c.overall)}%</b></div>`;

 $('kpis').innerHTML=
   kpi('Evidence coverage',Math.round(c.evidenceCoverage*100)+'%','Missing data shown separately')+
   kpi('Time until race',Math.max(0,Math.ceil(c.weeksRemaining)))+
   kpi('Estimated build time',c.requiredBuildWeeks.toFixed(1),c.usableBuildWeeks.toFixed(1)+' available · limited by '+Object.entries(c.buildRequirements).sort((a,b)=>b[1]-a[1])[0][0].replace(/([A-Z])/g,' $1').toLowerCase())+
   kpi('Planned this week',wd.planned.toFixed(1)+' km',wd.actual.toFixed(1)+' km completed')+
   kpi('Longest verified run',c.completedLongest.toFixed(1)+' km','Longest completed run in the run log')+
   kpi('Training progression factor',adaptiveFactorDetails(cw).factor.toFixed(2),'Multiplies next-week training volume');

 $('assessmentText').textContent=assessmentText(c);
 $('evidenceBadge').textContent=`Evidence ${Math.round(c.evidenceCoverage*100)}% complete`;
 let afd=adaptiveFactorDetails(cw);
 $('adaptiveFactorDetail').innerHTML=`<summary><span>Adaptive factor · ${afd.status==='pending'?'pending · ':''}${afd.factor.toFixed(2)}</span><small>${afd.status==='calculated'?`Based on Week ${afd.previousWeek}`:'Tap to see how it is calculated'}</small></summary><div class="adaptiveFoldout"><p class="muted compact">Evidence-informed weekly load multiplier, bounded by ${state.setup.minFactor.toFixed(2)}–${state.setup.maxFactor.toFixed(2)}</p>
 <div class="adaptiveFormula"><b>Calculation</b><span>1.00 ${afd.items.map(i=>`${i.adjustment>=0?'+':'−'} ${Math.abs(i.adjustment).toFixed(2)}`).join(' ')} = ${afd.rawFactor.toFixed(2)} → applied ${afd.factor.toFixed(2)}</span></div>
 <div class="adaptiveContext"><span>Evidence week</span><b>${afd.previousWeek>0?`Week ${afd.previousWeek}`:'—'}</b><span>Planned / completed</span><b>${Number.isFinite(afd.plannedKm)?afd.plannedKm.toFixed(1):'—'} / ${Number.isFinite(afd.completedKm)?afd.completedKm.toFixed(1):'—'} km</b></div>
 <div class="adaptiveBreakdown">${afd.items.map(i=>`<div class="adaptiveRow"><b>${i.name}</b><span class="${i.adjustment>0?'positive':i.adjustment<0?'negative':''}">${i.adjustment>0?'+':''}${i.adjustment.toFixed(2)}</span><small>${i.detail}</small></div>`).join('')}</div>
 <div class="adaptiveExplanation"><p><b>How it is used:</b> the factor multiplies that week's planned training volume after the normal progression, recovery-week and taper rules. A factor of 0.92 reduces volume by 8%; 1.03 increases it by 3%.</p><p><b>Constituents:</b></p><div class="adaptiveRules"><div><b>Completed load</b><span>−0.08 below 70%; −0.04 at 70–84%; 0 at 85–105%; −0.02 above 105%.</span></div><div><b>Efficiency trend</b><span>−0.02 if same-type J/beat falls at least 3%; +0.01 if it improves at least 2% and completed load is 85–105%.</span></div><div><b>Cardiac drift</b><span>−0.04 above 7%; −0.02 above 5%; +0.01 at 3% or lower when completed load is 85–105%.</span></div></div><p><b>Qualifying evidence:</b> efficiency and drift use aerobic runs of at least 45 minutes. Positive adjustments require at least two qualifying runs.</p><p><b>Missing inputs:</b> missing efficiency or drift data causes no adjustment. It is not interpreted as good or poor adaptation.</p><p><b>Future weeks:</b> a factor is calculated only after the preceding week is complete. Later weeks display a neutral 1.00 and are marked pending; they are recalculated as training data becomes available.</p><p><b>Interpretation:</b> this is a conservative coaching load multiplier, not a recovery score or a direct physiological measurement.</p></div></div>`;

 const predictionGap=pred-state.setup.targetTime;
 const predictionPace=pred/state.setup.raceDistance;
 const gapLabel=Math.abs(predictionGap)<30
   ? 'On target'
   : `${fmtTime(Math.abs(predictionGap))} ${predictionGap<0?'ahead of':'behind'} target`;
 $('predictionSummary').innerHTML=`
   <div class="predictionPrimary">
     <span>Latest predicted finish</span>
     <strong>${fmtTime(pred)}</strong>
     <small>${pace(predictionPace)}</small>
   </div>
   <div class="predictionComparison ${predictionGap<=0?'ahead':'behind'}">
     <span>Target ${fmtTime(state.setup.targetTime)}</span>
     <strong>${gapLabel}</strong>
     <small>Updates automatically after valid assessments and new training evidence.</small>
   </div>`;

 $('pillarCards').innerHTML=c.pillars.map(p=>`
   <div class="pillarCard" style="--pillar:${p.color}">
    <div class="pillarTop"><b>${p.name}</b><span class="pillarScore">${Number.isFinite(p.score)?Math.round(p.score):'—'}</span></div>
    <div class="pillarBar"><i style="width:${Number.isFinite(p.score)?p.score:0}%"></i></div>
    <p>${p.description}</p>
    <div class="pillarMeta"><span>Model weight ${Math.round(p.weight*100)}%</span><span>Evidence ${Math.round(p.coverage*100)}%</span></div>
    <details class="pillarExplain"><summary>How this is calculated</summary>
      <div class="calcTable">${p.items.map(i=>`<div class="calcRow"><span>${i.name}</span><span>${i.hasEvidence?Math.round(i.displayScore):'No evidence → 0'}</span><span>${Math.round(i.weight*100)}%</span></div>`).join('')}</div>
      <p class="muted">A missing contributor contributes 0 to the score but does not count as evidence. A genuine measured score of 0 still counts as evidence.</p>
    </details>
   </div>`).join('');

 $('componentGuide').innerHTML=c.components.map(x=>`
   <div><b>${x.name}</b><p>${componentDefinitions[x.name]}</p>
   <small class="${x.hasEvidence?'muted':'metricMissing'}">${x.hasEvidence?`Current score: ${Math.round(x.displayScore)} / 100 · evidence ${Math.round((x.evidenceFraction??1)*100)}%`:'No evidence yet · contributes 0'} · within-pillar weight ${Math.round(x.weight*100)}%</small></div>`).join('');

 let scored=uniqueComponents(c.components.filter(x=>x.hasEvidence).map(x=>({...x,score:x.displayScore}))).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
 let missing=uniqueComponents(c.components.filter(x=>!x.hasEvidence));
 $('strengths').innerHTML=scored.slice(0,3).map(x=>`<div class="note good"><b>✓ ${coachLabel(x.name,x.score)}</b><br>${interpretations[x.name](x.score)}</div>`).join('')||'<p class="muted">More training data is needed.</p>';
 $('risks').innerHTML=[...scored].reverse().slice(0,3).map(x=>`<div class="note warn"><b>⚠ ${coachLabel(x.name,x.score)}</b><br>${interpretations[x.name](x.score)}</div>`).join('')||'<p class="muted">More training data is needed.</p>';
 $('dashboardActions').innerHTML=[...scored].sort((a,b)=>a.score-b.score).slice(0,3).map((x,i)=>`<div class="actionRow"><strong>${i+1}</strong><b>${x.name}</b><span>${Math.round(x.score)}%</span><div>${actions[x.name]}<br><small class="muted">${interpretations[x.name](x.score)}</small></div></div>`).join('')||'<p class="muted">No measured limiter is available yet.</p>';
 $('dataNeeded').innerHTML=missing.length?missing.map(x=>`<div class="note"><b>${x.name}</b><br>${componentDefinitions[x.name]}</div>`).join(''):'<p class="muted">All model components currently have evidence.</p>';

 let future=state.plan.filter(p=>p.type!=='Rest'&&dte(p.date)>=today()).slice(0,4);
 $('keySessions').innerHTML=future.map(p=>`<div class="miniSession"><b>${fmtDate(p.date)} · ${p.type}</b><span>${p.distance.toFixed(1)} km · ${pace(p.zone.pace)}<br>${p.purpose}</span></div>`).join('');
 drawDashboardCharts();
}
function drawLine(canvas,series,options={}){
 let ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
 let top=series.some(s=>s.label)?70:28,left=options.left||78,bottom=66,right=24;
 ctx.clearRect(0,0,W,H);

 if(series.some(s=>s.label)){
   ctx.font='600 22px system-ui';ctx.textAlign='left';let x=left;
   series.forEach(s=>{
     if(!s.label)return;
     ctx.save();ctx.strokeStyle=s.color;ctx.lineWidth=6;ctx.lineCap='round';
     if(s.dashed)ctx.setLineDash([16,10]);
     ctx.beginPath();ctx.moveTo(x,30);ctx.lineTo(x+30,30);ctx.stroke();ctx.restore();
     ctx.fillStyle='#536172';ctx.fillText(s.label,x+42,38);
     x+=52+ctx.measureText(s.label).width+34;
   });
 }

 let vals=series.flatMap(s=>s.data).filter(Number.isFinite);
 if(!vals.length){
   ctx.fillStyle='#8190a0';ctx.font='600 27px system-ui';ctx.textAlign='center';
   ctx.fillText(options.empty||'More completed data is needed',W/2,H/2);return;
 }
 let min=Number.isFinite(options.min)?options.min:(options.zero===false?Math.min(...vals):0);
 let max=Number.isFinite(options.max)?options.max:Math.max(...vals);
 if(max<=min){max=min+1}
 if(!Number.isFinite(options.min)&&!Number.isFinite(options.max)){
   let pad=(max-min)*.10||1;max+=pad;if(options.zero===false)min-=pad;
 }
 let chartH=H-bottom-top,chartW=W-left-right;
 ctx.font='20px system-ui';ctx.textAlign='right';
 let ticks=options.ticks||5;
 for(let i=0;i<ticks;i++){
   let fraction=i/(ticks-1),v=min+(max-min)*fraction,y=H-bottom-chartH*fraction;
   ctx.strokeStyle=i===0?'#d9e2ea':'#eaf0f5';ctx.lineWidth=i===0?2:1;
   ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(W-right,y);ctx.stroke();
   ctx.fillStyle='#748293';
   ctx.fillText(options.formatY?options.formatY(v):v.toFixed(v<10?1:0),left-12,y+7);
 }
 let n=Math.max(1,...series.map(s=>s.data.length));
 const px=i=>n===1?left+chartW/2:left+i*chartW/(n-1);
 const py=v=>H-bottom-(v-min)/(max-min)*chartH;

 series.forEach((s,si)=>{
   let good=s.data.map((v,i)=>({v,i})).filter(x=>Number.isFinite(x.v));if(!good.length)return;
   if(options.area&&si===0&&good.length>1){
     let g=ctx.createLinearGradient(0,top,0,H-bottom);
     g.addColorStop(0,s.color+'35');g.addColorStop(1,s.color+'00');
     ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(px(good[0].i),H-bottom);
     good.forEach(o=>ctx.lineTo(px(o.i),py(o.v)));
     ctx.lineTo(px(good.at(-1).i),H-bottom);ctx.closePath();ctx.fill();
   }
   ctx.save();ctx.strokeStyle=s.color;ctx.lineWidth=s.width||5;ctx.lineJoin='round';ctx.lineCap='round';
   if(s.dashed)ctx.setLineDash([16,10]);
   ctx.beginPath();good.forEach((o,j)=>j?ctx.lineTo(px(o.i),py(o.v)):ctx.moveTo(px(o.i),py(o.v)));
   if(good.length>1)ctx.stroke();ctx.restore();
   if(s.points!==false)good.forEach(o=>{
     ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px(o.i),py(o.v),7,0,Math.PI*2);ctx.fill();
     ctx.strokeStyle=s.color;ctx.lineWidth=4;ctx.stroke();
   });
 });
 if(options.labels?.length){
   let positions=options.allLabels?options.labels.map((_,i)=>i):
     [0,Math.floor((options.labels.length-1)/2),options.labels.length-1].filter((v,i,a)=>a.indexOf(v)===i);
   ctx.font='19px system-ui';ctx.fillStyle='#748293';ctx.textAlign='center';
   positions.forEach(i=>ctx.fillText(options.labels[i]||'',px(i),H-18));
 }
}
function completedWeekSeries(){
 return Array.from({length:weeks()},(_,i)=>weekData(i+1));
}
function drawDonut(canvas,segments){
 let ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,cx=W*.32,cy=H*.52,r=105,total=sum(segments.map(s=>s.value));
 ctx.clearRect(0,0,W,H);
 if(!total){ctx.fillStyle='#8190a0';ctx.font='600 28px system-ui';ctx.textAlign='center';ctx.fillText('No planned training volume',W/2,H/2);return}
 let a=-Math.PI/2;
 segments.forEach(s=>{let da=s.value/total*Math.PI*2;ctx.beginPath();ctx.strokeStyle=s.color;ctx.lineWidth=38;ctx.lineCap='butt';ctx.arc(cx,cy,r,a,a+da);ctx.stroke();a+=da});
 ctx.fillStyle='#172536';ctx.font='800 38px system-ui';ctx.textAlign='center';ctx.fillText(Math.round(total)+' km',cx,cy+8);
 ctx.font='20px system-ui';ctx.fillStyle='#748293';ctx.fillText('planned',cx,cy+37);
 ctx.textAlign='left';let y=82;
 segments.forEach(s=>{ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(W*.58,y-6,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#314253';ctx.font='600 22px system-ui';ctx.fillText(s.label,W*.61,y);ctx.fillStyle='#748293';ctx.font='21px system-ui';ctx.fillText(`${s.value.toFixed(1)} km · ${Math.round(s.value/total*100)}%`,W*.61,y+28);y+=65});
}
function roundRect(ctx,x,y,w,h,r){w=Math.max(0,w);r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function drawDashboardCharts(){
 let c=confidence(),arr=completedWeekSeries(),weekLabels=arr.map((_,i)=>'W'+(i+1));
 drawLine($('volumeChart'),[
   {label:'Planned km',data:arr.map(x=>x.planned),color:'#2d82c7',dashed:true,points:false},
   {label:'Completed km',data:arr.map(x=>x.actual),color:'#159487'}
 ],{empty:'No weekly distance data yet',labels:weekLabels,area:false});
 drawLine($('adherenceChart'),[
   {label:'Completion rate',data:arr.map((x,i)=>i+1<=currentWeek()&&x.planned?Math.min(125,x.actual/x.planned*100):null),color:'#159487'}
 ],{min:0,max:125,empty:'Complete a planned week to see adherence',formatY:v=>Math.round(v)+'%',labels:weekLabels,area:true});
 let plannedLong=Array.from({length:weeks()},(_,i)=>state.plan.find(x=>x.week===i+1&&x.type==='Long run')?.distance??null);
 let completedLong=Array.from({length:weeks()},(_,i)=>{
   let st=weekStart(i+1),en=new Date(st.getTime()+7*DAY);
   let r=state.runs.filter(x=>x.type==='Long run'&&dte(x.date)>=st&&dte(x.date)<en);
   return r.length?Math.max(...r.map(x=>x.distanceKm)):null;
 });
 drawLine($('longRunChart'),[
   {label:'Planned long run',data:plannedLong,color:'#2d82c7',dashed:true,points:false},
   {label:'Completed long run',data:completedLong,color:'#159487'}
 ],{min:0,max:Math.max(state.setup.peakLong*1.12,10),empty:'Log a long run to show completed progression',labels:weekLabels});

 let tests=state.assessments.filter(a=>a.valid).sort((a,b)=>a.date.localeCompare(b.date));
 let predSec=tests.map(a=>a.time*Math.pow(state.setup.raceDistance/a.distance,1.06));
 let labels=tests.map(a=>dte(a.date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));
 if(!predSec.length){predSec=[c.riegel];labels=['Baseline']}
 const currentPrediction=prediction();
 predSec.push(currentPrediction);
 labels.push('Latest');
 let allSec=[...predSec,state.setup.targetTime],low=Math.min(...allSec),high=Math.max(...allSec);
 let minSec=Math.max(2*3600,Math.floor((low-1800)/1800)*1800);
 let maxSec=Math.min(7*3600,Math.ceil((high+1800)/1800)*1800);
 if(maxSec-minSec<3600)maxSec=minSec+3600;
 drawLine($('predictionChart'),[
   {label:'Predicted finish',data:predSec,color:'#7457c8'},
   {label:'Target time',data:predSec.map(()=>state.setup.targetTime),color:'#d75b67',dashed:true,points:false}
 ],{min:minSec,max:maxSec,ticks:5,formatY:v=>fmtTime(v),labels,left:98});

 // Current week + next three complete plan weeks, rather than the entire plan.
 let cw=currentWeek(),windowEnd=cw+3;
 let windowPlan=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&p.week>=cw&&p.week<=windowEnd);
 let groups=[
  {label:'Easy / recovery',value:sum(windowPlan.filter(p=>['Easy','Recovery'].includes(p.type)).map(p=>p.distance)),color:'#2d82c7'},
  {label:'Long runs',value:sum(windowPlan.filter(p=>p.type==='Long run').map(p=>p.distance)),color:'#159487'},
  {label:'Tempo',value:sum(windowPlan.filter(p=>p.type==='Tempo').map(p=>p.distance)),color:'#e49b35'},
  {label:'Intervals / tests',value:sum(windowPlan.filter(p=>['Intervals','Fitness assessment'].includes(p.type)).map(p=>p.distance)),color:'#7457c8'}
 ].filter(x=>x.value>0);
 drawDonut($('mixChart'),groups);
}
function coachIntelligenceHtml(p){
 if(p.type==='Rest'||p.type==='Race Day')return'';
 return `<div class="coachWhy"><h4>Coach intelligence</h4><p><b>Why this workout:</b> ${esc(p.whyThis||p.purpose)}</p><p><b>Why this amount:</b> ${esc(p.whyAmount||'The prescribed amount reflects the current phase, weekly load and adaptive factor.')}</p><p><b>If you skip it:</b> ${esc(p.skipImpact||'Do not catch up by stacking sessions. Continue with the next appropriate workout.')}</p></div>`;
}
function workoutHtml(p){let st=status(p),accounting=Array.isArray(p.accounting)?`<div class="accounting"><h4>Session accounting</h4>${p.accounting.map(x=>`<div><span>${esc(x.label)}</span><b>${Number(x.km).toFixed(1)} km</b></div>`).join('')}<div class="accountingTotal"><span>Total session</span><b>${Number(p.distance).toFixed(1)} km ✓</b></div></div>`:'';return`<div class="workout" data-id="${p.id}"><div class="workoutHead"><div class="dateBox"><b>${new Date(p.date+'T00:00:00').getDate()}</b><span>${new Date(p.date+'T00:00:00').toLocaleDateString(undefined,{month:'short'})}</span></div><div class="workoutTitle"><h3>${p.type}</h3><p>${p.type==='Rest'?p.purpose:`${p.distance.toFixed(1)} km · ${p.phase}`}</p></div><span class="status ${st}">${st}</span></div><div class="workoutDetails"><div class="targets">${p.type==='Rest'?'':`<div class="target"><small>Main-set pace</small><b>${pace(p.zone.pace)}</b></div><div class="target"><small>Main-set HR</small><b>${p.zone.hr} bpm</b></div><div class="target"><small>Main-set power</small><b>${p.zone.power} W</b></div>`}</div>${p.type==='Rest'?'':`<p class="targetScope">Targets apply to: <b>${esc(p.targetScope||'main set')}</b></p>`}<div class="prescription"><p><b>Warm-up:</b> ${p.warmup}</p><p><b>Main set:</b> ${p.main}</p><p><b>Cooldown:</b> ${p.cooldown}</p>${p.distanceCheck?`<p class="distanceCheck"><b>Distance check:</b> ${esc(p.distanceCheck)} ✓</p>`:''}<p><b>Purpose:</b> ${p.purpose}</p><p><b>Coach guidance:</b> ${p.coach}</p><p><b>Fuel / hydration:</b> ${p.fuel}</p></div>${accounting}${coachIntelligenceHtml(p)}</div></div>`}

function renderToday(){let p=state.plan.find(x=>x.date===iso(today()));$('todayDate').textContent=today().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});$('todayCard').innerHTML=p?workoutHtml(p):'<div class="panel">No workout scheduled.</div>';$('todayCoach').innerHTML=p?`<div class="note">${p.coach}</div><div class="note good">${p.purpose}</div>`:''}
function renderPlan(){if(!state.weekView)state.weekView=currentWeek();let arr=state.plan.filter(p=>p.week===state.weekView),wd=weekData(state.weekView),afd=adaptiveFactorDetails(state.weekView),factor=arr[0]?.factor||afd.factor||1;let factorText=afd.status==='pending'?`adaptive factor pending · currently ${factor.toFixed(2)}`:afd.status==='calculated'?`adaptive factor ${factor.toFixed(2)} · based on Week ${afd.previousWeek}`:`adaptive factor ${factor.toFixed(2)}`;$('weekHeader').innerHTML=`<b>Week ${state.weekView} · ${phase(state.weekView)}</b><br><span class="muted">${fmtDate(iso(weekStart(state.weekView)))} · ${wd.planned.toFixed(1)} km planned · ${wd.actual.toFixed(1)} km completed · ${factorText}</span>`;$('planCards').innerHTML=arr.map(workoutHtml).join('')}

function streamAnalysis(records){
 let valid=records.filter(r=>Number.isFinite(r.t)&&r.hr>40&&(r.power>0||r.speed>0)).sort((a,b)=>a.t-b.t);
 if(valid.length<180)return null;
 // Remove obvious pauses and implausible samples.
 valid=valid.filter(r=>(!r.speed||r.speed>.5)&&(!r.power||r.power<1000)&&r.hr<230);
 if(valid.length<180)return null;
 let start=valid[0].t,end=valid.at(-1).t,total=end-start;
 if(total<1800)return null;
 let warmup=Math.min(900,Math.max(300,total*.15));
 valid=valid.filter(r=>r.t>=start+warmup);
 if(valid.length<150)return null;
 let mid=(valid[0].t+valid.at(-1).t)/2,a=valid.filter(r=>r.t<=mid),b=valid.filter(r=>r.t>mid);
 if(a.length<60||b.length<60)return null;
 const mean=(arr,key)=>avg(arr.map(x=>x[key]).filter(v=>Number.isFinite(v)&&v>0));
 let h1=mean(a,'hr'),h2=mean(b,'hr'),p1=mean(a,'power'),p2=mean(b,'power'),v1=mean(a,'speed'),v2=mean(b,'speed');
 let powerDrift=p1&&p2&&h1&&h2?((h2/p2)/(h1/p1)-1)*100:null;
 let paceDrift=v1&&v2&&h1&&h2?(1-(v2/h2)/(v1/h1))*100:null;
 let drift=powerDrift;
 if(!Number.isFinite(drift))return null;
 return{
   drift,powerDrift,paceDrift,firstHr:h1,secondHr:h2,firstPower:p1,secondPower:p2,
   firstSpeed:v1,secondSpeed:v2,recordCount:valid.length,analysisDuration:valid.at(-1).t-valid[0].t,
   reliability:valid.length>=1200?'High':valid.length>=600?'Medium':'Low'
 };
}
function parseCSV(t){let rows=[],r=[],f='',q=false;for(let i=0;i<t.length;i++){let c=t[i],n=t[i+1];if(c=='"'&&q&&n=='"'){f+='"';i++}else if(c=='"')q=!q;else if(c==','&&!q){r.push(f);f=''}else if((c=='\n'||c=='\r')&&!q){if(c=='\r'&&n=='\n')i++;r.push(f);if(r.some(x=>x))rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows}
function summariseCSV(rows){
 let rawHeaders=rows[0].map(x=>String(x).trim()),norm=x=>String(x).trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');
 let headers=rawHeaders.map(norm),data=rows.slice(1).filter(r=>r.some(x=>String(x).trim()!==''));
 const findExact=(names)=>{
   let variants=names.map(norm);
   for(let n of variants){let exact=headers.indexOf(n);if(exact>=0)return exact}
   return -1;
 };
 const find=(names)=>{
   let exact=findExact(names);if(exact>=0)return exact;
   let variants=names.map(norm);
   for(let n of variants){let fuzzy=headers.findIndex(h=>h.includes(n)||n.includes(h));if(fuzzy>=0)return fuzzy}
   return -1;
 };
 const indexMap={
   timestamp:find(['Timestamp','Time','Date Time','datetime']),
   hr:find(['Heart Rate (bpm)','Heart Rate','heartrate']),
   watchSpeed:find(['Watch Speed (m/s)','Speed (m/s)','speed']),
   strydSpeed:find(['Stryd Speed (m/s)']),
   powerW:findExact(['Power (W)','Power (Watts)','Watts','Average Power (W)']),
   powerKg:findExact(['Power (w/kg)','Power W/kg','W/kg']),
   watchDistance:find(['Watch Distance (meters)','Distance (meters)','distance']),
   strydDistance:find(['Stryd Distance (meters)']),
   cadence:find(['Cadence (spm)','Cadence']),
   gct:find(['Ground Time (ms)','Ground Contact Time (ms)']),
   vo:find(['Vertical Oscillation (cm)','Vertical Oscillation'])
 };
 const number=(r,i)=>{
   if(i<0)return null;
   let x=String(r[i]??'').trim().replace(',','.');
   let v=Number(x);return Number.isFinite(v)?v:null;
 };
 const timestamp=(r)=>{
   let raw=r[indexMap.timestamp];
   let numeric=Number(raw);
   if(Number.isFinite(numeric))return numeric;
   let parsed=Date.parse(raw);
   return Number.isFinite(parsed)?parsed:null;
 };
 if(indexMap.timestamp<0)throw Error('No timestamp column was found in this CSV.');
 let records=data.map(r=>{
   let watts=number(r,indexMap.powerW),wkg=number(r,indexMap.powerKg);
   // Stryd exports may contain either watts or W/kg. Values below 20 in a
   // purported watts column are almost certainly W/kg and are converted.
   if(Number.isFinite(watts)&&watts>0&&watts<20&&!Number.isFinite(wkg))wkg=watts,watts=null;
   let resolvedPower=Number.isFinite(watts)&&watts>0?watts:(Number.isFinite(wkg)&&wkg>0?wkg*state.setup.bodyWeight:null);
   return{
     t:timestamp(r),
     hr:number(r,indexMap.hr),
     speed:number(r,indexMap.watchSpeed)||number(r,indexMap.strydSpeed),
     power:resolvedPower,
     distance:number(r,indexMap.watchDistance)||number(r,indexMap.strydDistance)
   }
 }).filter(r=>Number.isFinite(r.t));
 if(records.length<2)throw Error('Too few valid timestamped records were found in the CSV.');
 let maxTs=Math.max(...records.map(r=>r.t)),scale=maxTs>1e12?1000:1;
 records.forEach(r=>r.t/=scale);
 let distanceRecords=records.map(r=>r.distance).filter(Number.isFinite);
 let dist=distanceRecords.length?Math.max(...distanceRecords)/1000:null;
 let duration=records.at(-1).t-records[0].t;
 if(!Number.isFinite(dist)||dist<=0||!Number.isFinite(duration)||duration<=0)throw Error('The CSV does not contain valid cumulative distance and duration.');
 const positive=key=>avg(records.map(r=>r[key]).filter(v=>Number.isFinite(v)&&v>0));
 let analysis=streamAnalysis(records);
 let originalStart=records[0].t;
 return{
   id:'stryd-'+Math.round(originalStart)+'-'+Math.round(dist*1000),
   date:iso(new Date(originalStart*1000)),type:'Easy',distanceKm:dist,durationSec:duration,
   avgHr:Number.isFinite(positive('hr'))?Math.round(positive('hr')):null,
   avgPower:Number.isFinite(positive('power'))?Math.round(positive('power')):null,
   cadence:indexMap.cadence>=0?Math.round(avg(data.map(r=>number(r,indexMap.cadence)).filter(v=>Number.isFinite(v)&&v>0))||0)||null:null,
   gct:indexMap.gct>=0?Math.round(avg(data.map(r=>number(r,indexMap.gct)).filter(v=>Number.isFinite(v)&&v>0))||0)||null:null,
   vo:indexMap.vo>=0?Number((avg(data.map(r=>number(r,indexMap.vo)).filter(v=>Number.isFinite(v)&&v>0))||0).toFixed(1))||null:null,
   rpe:null,pain:null,recovery:null,temperature:null,notes:'Imported from Stryd CSV',
   drift:null,powerDrift:null,paceDrift:null,
   candidateDrift:analysis?.drift??null,candidatePowerDrift:analysis?.powerDrift??null,candidatePaceDrift:analysis?.paceDrift??null,
   candidateStreamEvidence:analysis,streamEvidence:null,sourceFormat:'csv-timeseries'
 };
}

function renderRuns(){$('runList').innerHTML=state.runs.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=>{let m=metrics(r);return`<div class="runCard clickable" data-run="${r.id}"><div class="runSummary"><div><h3>${fmtDate(r.date)} · ${esc(r.type)}</h3><p>${r.distanceKm.toFixed(2)} km · ${fmtTime(r.durationSec)} · ${pace(m.pace)}</p><p class="muted compact"><b>Plan:</b> ${esc(matchSummary(r))}</p><div class="runStats"><span>HR ${r.avgHr?Math.round(r.avgHr):'—'}</span><span>${r.avgPower?Math.round(r.avgPower):'—'} W</span><span>${dec(m.efficiencyJ,1)} J/beat</span><span>${Number.isFinite(r.powerDrift)?r.powerDrift.toFixed(1)+'% drift':'— drift'}</span></div></div><span>›</span></div></div>`}).join('')||'<div class="panel">No completed runs saved yet.</div>'}
function migrateImportedPower(){
 let changed=false,weight=Number(state.setup.bodyWeight)||0;
 if(!weight)return;
 state.runs.forEach(r=>{
   if((r.sourceFormat==='csv-timeseries'||String(r.id||'').startsWith('stryd-'))&&Number.isFinite(Number(r.avgPower))&&Number(r.avgPower)>0&&Number(r.avgPower)<20){
     r.avgPower=Math.round(Number(r.avgPower)*weight);
     r.powerUnit='W';
     changed=true;
   }
 });
 if(changed)save();
}
function renderMetrics(){
 let rs=state.runs.slice().sort((a,b)=>a.date.localeCompare(b.date));
 let efficiencyRuns=rs.filter(r=>Number.isFinite(metrics(r).efficiencyJ));
 let driftRuns=rs.filter(r=>Number.isFinite(r.powerDrift));
 let latestEff=efficiencyRuns.at(-1),latestDrift=driftRuns.at(-1);
 let recentEff=efficiencyRuns.slice(-3).map(r=>metrics(r).efficiencyJ);
 let recentDrift=driftRuns.slice(-3).map(r=>r.powerDrift);

 $('metricKpis').innerHTML=
   kpi('Latest efficiency factor',latestEff?dec(metrics(latestEff).efficiencyJ,1)+' J/beat':'—','Average running power converted to joules of external work per heartbeat. Higher is better.')+
   kpi('3-run efficiency average',recentEff.length?dec(avg(recentEff),1)+' J/beat':'—')+
   kpi('Latest power cardiac drift',latestDrift?latestDrift.powerDrift.toFixed(1)+'%':'—','Change in the power-to-heart-rate relationship between run halves. Lower is better.')+
   kpi('3-run drift average',recentDrift.length?dec(avg(recentDrift),1)+'%':'—');

 let allMetricRuns=rs.filter(r=>Number.isFinite(metrics(r).efficiencyJ)||Number.isFinite(r.powerDrift));
 let labels=allMetricRuns.map(r=>dte(r.date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));
 let effValues=allMetricRuns.map(r=>metrics(r).efficiencyJ).filter(Number.isFinite);
 let driftValues=allMetricRuns.map(r=>r.powerDrift).filter(Number.isFinite);

 drawLine($('efficiencyChart'),metricSeries(allMetricRuns,r=>metrics(r).efficiencyJ),{
   min:effValues.length?Math.floor(Math.min(...effValues)-5):80,
   max:effValues.length?Math.ceil(Math.max(...effValues)+5):140,zero:false,ticks:6,
   formatY:v=>Math.round(v)+' J',labels,allLabels:allMetricRuns.length<=8,
   empty:'Log a run with average power and heart rate'});

 let driftSeries=metricSeries(allMetricRuns,r=>r.powerDrift);
 drawLine($('driftChart'),driftSeries,{
   min:driftValues.length?Math.min(0,Math.floor(Math.min(...driftValues)-2)):0,
   max:driftValues.length?Math.max(10,Math.ceil(Math.max(...driftValues)+2)):10,ticks:6,
   formatY:v=>Math.round(v)+'%',labels,allLabels:allMetricRuns.length<=8,
   empty:'Import a detailed Stryd CSV with timestamped heart rate and power'});

 let summary=typeMetricSummary(rs);
 $('metricTypeSummary').innerHTML=summary.length?`<div class="metricTypeTable"><div class="metricTypeHead"><b>Run type</b><b>Efficiency avg</b><b>Efficiency best</b><b>Drift avg</b><b>Drift best</b></div>${summary.map(x=>`<div class="metricTypeRow"><span><i style="--runColor:${runTypeColors[x.type]}"></i>${esc(x.type)}</span><span>${Number.isFinite(x.effAvg)?x.effAvg.toFixed(1)+' J/beat':'—'}</span><span>${Number.isFinite(x.effBest)?x.effBest.toFixed(1)+' J/beat':'—'}</span><span>${Number.isFinite(x.driftAvg)?x.driftAvg.toFixed(1)+'%':'—'}</span><span>${Number.isFinite(x.driftBest)?x.driftBest.toFixed(1)+'%':'—'}</span></div>`).join('')}</div>`:'<span class="muted">No qualifying run metrics yet.</span>';

}
function assessmentRunId(a){return a.runId||`assessment-run-${a.id}`}
function syncAssessmentRun(a){
 let id=assessmentRunId(a),i=state.runs.findIndex(r=>r.id===id||r.assessmentId===a.id);
 let previous=i>=0?state.runs[i]:{};
 let planned=state.plan.find(p=>p.date===a.date&&p.type==='Fitness assessment');
 let run={...previous,id,assessmentId:a.id,source:'assessment',date:a.date,type:'Fitness assessment',
   distanceKm:Number(a.distance),durationSec:Number(a.time),
   avgHr:Number(a.thresholdHr)||previous.avgHr||null,
   avgPower:Number(a.criticalPower)||previous.avgPower||null,
   cadence:previous.cadence??null,rpe:previous.rpe??null,pain:previous.pain??null,
   recovery:previous.recovery??null,temperature:previous.temperature??null,
   notes:previous.notes||'Fitness assessment',planId:planned?.id||previous.planId};
 if(i>=0)state.runs[i]=run;else state.runs.push(run);
 a.runId=id;
}
function deleteAssessmentAndRun(a){
 state.runs=state.runs.filter(r=>r.id!==assessmentRunId(a)&&r.assessmentId!==a.id);
 state.assessments=state.assessments.filter(x=>x.id!==a.id);
}
function migrateAssessmentRuns(){
 state.assessments.forEach(syncAssessmentRun);
 save();
}
function renderAssessments(){$('assessmentList').innerHTML=state.assessments.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(a=>`<div class="panel clickable" data-assessment="${a.id}"><div class="panelHead"><div><b>${fmtDate(a.date)} · ${a.distance.toFixed(1)} km</b><p class="muted">${fmtTime(a.time)} · ${pace(a.time/a.distance)} · ${a.valid?'Valid and applied to future targets':'Not applied'}<br>Also included in run history and training metrics</p></div><span class="status ${a.valid?'completed':'rest'}">${a.valid?'valid':'invalid'}</span></div></div>`).join('')||'<div class="panel">No fitness assessment results entered.</div>'}
function renderCoach(){let c=confidence(),pred=prediction(),gap=pred-state.setup.targetTime;$('coachTop').innerHTML=kpi('Overall readiness',Math.round(c.overall)+'%')+kpi('Predicted time',fmtTime(pred))+kpi('Target gap',(gap>=0?'+':'−')+fmtTime(Math.abs(gap)))+kpi('Current phase',phase(currentWeek()));$('fullAssessment').textContent=assessmentText(c);let sorted=uniqueComponents(c.components.filter(x=>x.hasEvidence).map(x=>({...x,score:x.displayScore}))).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));$('coachStrengths').innerHTML=sorted.slice(0,3).map(x=>`<div class="note good"><b>✓ ${x.name} · ${Math.round(x.score)}</b><br>${interpretations[x.name](x.score)}<br><small class="muted">${componentDefinitions[x.name]}</small></div>`).join('');$('coachRisks').innerHTML=[...sorted].reverse().slice(0,3).map(x=>`<div class="note warn"><b>⚠ ${x.name} · ${Math.round(x.score)}</b><br>${interpretations[x.name](x.score)}<br><small class="muted">${componentDefinitions[x.name]}</small></div>`).join('');$('actionsTable').innerHTML=[...sorted].sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name)).slice(0,3).map((x,i)=>`<div class="actionRow"><strong>${i+1}</strong><b>${x.name}</b><span>${Math.round(x.score)}%</span><div>${actions[x.name]}<br><small class="muted">${componentDefinitions[x.name]}</small></div></div>`).join('')}
function renderRace(){let c=confidence(),pred=prediction(),targetPace=state.setup.targetTime/state.setup.raceDistance,predictedPace=pred/state.setup.raceDistance;$('raceKpis').innerHTML=kpi('Target time',fmtTime(state.setup.targetTime))+kpi('Target pace',pace(targetPace))+kpi('Predicted finish',fmtTime(pred))+kpi('Predicted pace',pace(predictedPace))+kpi('Target HR',Math.round(state.setup.thresholdHr*.92)+' bpm')+kpi('Target power',Math.round(state.setup.criticalPower*.88)+' W')+kpi('Confidence',Math.round(c.overall)+'%');let rd=state.setup.raceDistance,first=Math.max(1,Math.round(rd*.20)),final=Math.max(first+1,Math.round(rd*.75));$('racePacing').innerHTML=`<div class="note"><b>0–${first} km:</b> Start controlled, slightly slower than target pace. Let heart rate rise gradually.</div><div class="note"><b>${first}–${final} km:</b> Settle at target effort and protect fuelling. Avoid reacting to short pace fluctuations.</div><div class="note good"><b>After ${final} km:</b> Progress only when breathing, form and stomach remain stable. Otherwise preserve target effort.</div>`;$('raceFuel').innerHTML='<p><b>Carbohydrate:</b> 60–90 g/hour, practised in long runs.</p><p><b>Fluids:</b> approximately 400–800 ml/hour, adjusted for temperature and sweat rate.</p><p><b>Sodium:</b> use the same product and concentration tested in training.</p>';$('raceRules').innerHTML='<p>Slow down early if heart rate is unusually high at normal power.</p><p>Do not chase lost seconds on hills or crowded sections.</p><p>Use effort rather than pace when conditions are hot, windy or technical.</p>'}
function renderSettings(){let defs=[['planStart','Plan start','date'],['raceDate','Race date','date'],['raceName','Race name','text'],['raceDistance','Race distance km','number'],['targetTime','Target time','time'],['currentWeekly','Current weekly km','number'],['currentLongest','Current longest run km','number'],['testDistance','Recent test distance km','number'],['testTime','Recent test time','time'],['thresholdHr','Threshold HR','number'],['criticalPower','Critical power W','number'],['bodyWeight','Body weight kg','number'],['maxWeekly','Max weekly km','number'],['growth','Max weekly growth %','percent'],['peakLong','Peak long run km','number'],['taperDays','Taper days','number']];$('settingsGrid').innerHTML=defs.map(d=>{let v=state.setup[d[0]];if(d[2]=='time')v=fmtTime(v);if(d[2]=='percent')v=Math.round(v*100);return`<div class="field"><label>${d[1]}</label><input data-setting="${d[0]}" data-type="${d[2]}" type="${d[2]=='date'?'date':'text'}" value="${esc(v)}"></div>`}).join('');
 let raceDistanceInput=document.querySelector('[data-setting="raceDistance"]');
 const inputSetup=()=>{let x={...state.setup};document.querySelectorAll('[data-setting]').forEach(el=>{let v=el.value,t=el.dataset.type;if(t==='number')v=Number(v);if(t==='time')v=parseTime(v);if(t==='percent')v=Number(v)/100;x[el.dataset.setting]=v});return x};
 const showRecommendedDate=()=>{let r=recommendedRaceDate(inputSetup()),box=$('raceDateRecommendation');if(box)box.innerHTML=`<b>Model-recommended race date: ${fmtDate(r.date)}</b><p class="muted compact">${r.totalWeeks} weeks total: ${r.requiredBuildWeeks.toFixed(1)} estimated build weeks, ${r.taperWeeks.toFixed(1)} taper weeks and an ideal-scenario buffer.</p><button id="recommendRaceDate" type="button" class="secondary">Use this date</button>`;let btn=$('recommendRaceDate');if(btn)btn.onclick=()=>{let dateInput=document.querySelector('[data-setting="raceDate"]');if(dateInput)dateInput.value=r.date;toast(`Recommended race date applied: ${fmtDate(r.date)}.`)};return r};
 $('raceDateRecommendation')?.remove();
 if(!$('raceDateRecommendation'))if(!$('raceDateRecommendation'))$('settingsGrid').insertAdjacentHTML('afterend','<div id="raceDateRecommendation" class="note"></div>');
 raceDistanceInput?.addEventListener('change',()=>{let d=Number(raceDistanceInput.value);if(!(d>0))return;let profile=raceProfile(d),values=raceProfileValues(d);Object.entries(values).forEach(([key,value])=>{let input=document.querySelector(`[data-setting="${key}"]`);if(input)input.value=value});let r=showRecommendedDate(),dateInput=document.querySelector('[data-setting="raceDate"]');if(dateInput)dateInput.value=r.date;toast(`${profile.label} defaults and recommended race date ${fmtDate(r.date)} applied.`)});
 ['planStart','currentWeekly','currentLongest','maxWeekly','growth','peakLong','taperDays','testDistance','testTime','targetTime'].forEach(key=>document.querySelector(`[data-setting="${key}"]`)?.addEventListener('change',showRecommendedDate));
 showRecommendedDate();
 $('daysGrid').innerHTML=state.days.map((d,i)=>`<div class="panelHead" style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${d[0]}</b><label><input data-day="${i}" type="checkbox" ${d[1]?'checked':''}> Train</label><select data-session="${i}"><option ${d[2]=='Easy'?'selected':''}>Easy</option><option ${d[2]=='Intervals'?'selected':''}>Intervals</option><option ${d[2]=='Tempo'?'selected':''}>Tempo</option><option ${d[2]=='Long run'?'selected':''}>Long run</option></select></div>`).join('')}
function weeklyCompletedLongs(){
 return Array.from({length:weeks()},(_,i)=>{
   let st=weekStart(i+1),en=new Date(st.getTime()+7*DAY);
   let r=state.runs.filter(x=>dte(x.date)>=st&&dte(x.date)<en);
   return r.length?Math.max(...r.map(x=>Number(x.distanceKm)||0)):null;
 });
}

function renderPlanHealth(){
 const box=$('planHealthContent');if(!box)return;
 const report=validatePlan(state.plan);state.lastPlanHealth=report;
 const cls=report.errors?'bad':report.warnings?'warn':'good';
 box.innerHTML=`<div class="healthScore ${cls}"><b>${report.score}/100</b><span>${report.valid?'Plan passed all release-blocking checks':'Plan needs attention'}</span></div><div class="healthGrid"><div><b>${report.checked}</b><span>workouts checked</span></div><div><b>${report.errors}</b><span>errors</span></div><div><b>${report.warnings}</b><span>warnings</span></div></div>${report.issues.length?`<div class="healthIssues">${report.issues.slice(0,30).map(x=>`<p class="${x.severity}"><b>${x.severity.toUpperCase()}</b> ${esc(x.id||'Plan')}: ${esc(x.message)}</p>`).join('')}</div>`:'<p class="note good"><b>All checks passed.</b> Distances reconcile, targets are present, IDs are unique and training days are respected.</p>'}`;
}
function renderMigrationReport(){const box=$('migrationReport');if(!box)return;const m=state.migration||migrationReport;box.innerHTML=`<div class="migrationStatus good"><b>Upgrade status: ${esc(m.status||'ready')}</b><span>Schema ${esc(m.from??'new')} → ${SCHEMA}</span><span>${Number(m.runs)||0} runs · ${Number(m.assessments)||0} assessments preserved</span><span>${Number(m.fieldsRecovered)||0} invalid or missing fields repaired</span><small>Storage source: ${esc(m.source||migrationReport.source||STORAGE_KEY)}</small></div>`;}
function renderAll(){[renderDashboard,renderToday,renderPlan,renderRuns,renderMetrics,renderAssessments,renderCoach,renderRace,renderSettings,renderPlanHealth,renderMigrationReport].forEach(fn=>{try{fn()}catch(err){recordDiagnostic('Render failure in '+fn.name,err)}});renderDiagnostics()}
const pages=[['dashboard','Dashboard'],['today','Today'],['plan','Plan'],['runs','Runs'],['assessments','Assessments'],['race','Race day'],['settings','Settings']];
$('nav').innerHTML=pages.map((p,i)=>`<button data-page="${p[0]}" class="${i?'':'active'}">${p[1]}</button>`).join('');$('nav').onclick=e=>{let p=e.target.dataset.page;if(!p)return;document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===p));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===p));renderAll();scrollTo(0,0)};document.body.onclick=e=>{if(e.target.dataset.go){document.querySelector(`[data-page="${e.target.dataset.go}"]`).click()}let w=e.target.closest('.workout');if(w&&!e.target.closest('button'))w.classList.toggle('open')};
$('prevWeek').onclick=()=>{state.weekView=clamp((state.weekView||currentWeek())-1,1,weeks());renderPlan()};$('nextWeek').onclick=()=>{state.weekView=clamp((state.weekView||currentWeek())+1,1,weeks());renderPlan()};$('thisWeek').onclick=()=>{state.weekView=currentWeek();renderPlan()};

function runEditorHtml(r){
 if((r.sourceFormat==='csv-timeseries'||String(r.id||'').startsWith('stryd-'))&&Number(r.avgPower)>0&&Number(r.avgPower)<20){
   r.avgPower=Math.round(Number(r.avgPower)*(Number(state.setup.bodyWeight)||1));
 }
 return `<h2>Edit run</h2><div class="formGrid">
  <div class="field"><label>Date</label><input id="erDate" type="date" value="${r.date}"></div>
  <div class="field"><label>Run type</label><select id="erType">${['Easy','Recovery','Long run','Tempo','Intervals','Fitness assessment','Race'].map(x=>`<option ${r.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Distance km</label><input id="erDistance" type="number" step="0.01" value="${Number(r.distanceKm).toFixed(2)}"></div>
  <div class="field"><label>Duration</label><input id="erDuration" value="${fmtTime(r.durationSec)}"></div>
  <div class="field"><label>Average HR</label><input id="erHr" type="number" value="${Number.isFinite(r.avgHr)?Math.round(r.avgHr):''}"></div>
  <div class="field"><label>Average power</label><input id="erPower" type="number" value="${Number.isFinite(r.avgPower)?Math.round(r.avgPower):''}"></div>
  <div class="field"><label>RPE 1–10 <small class="muted">1 easy · 10 maximal</small></label><input id="erRpe" type="number" min="1" max="10" value="${r.rpe??''}"></div>
  <div class="field"><label>Pain 0–10 <small class="muted">0 none · 5 affects form</small></label><input id="erPain" type="number" min="0" max="10" value="${r.pain??''}"></div>
  <div class="field"><label>Recovery 1–5 <small class="muted">1 poor · 3 normal · 5 excellent</small></label><input id="erRecovery" type="number" min="1" max="5" value="${r.recovery??''}"></div>
  <div class="field"><label>Link to planned workout</label><select id="erPlanMatch">${planMatchOptions(r,r.planId||(r.matchStatus==='unresolved'?'unresolved':'adhoc'))}</select><small class="muted">You control the link. Timing and workout-type differences are scored automatically.</small></div>
  <div class="field"><label>Notes</label><textarea id="erNotes">${esc(r.notes||'')}</textarea></div>
 </div>
 ${Number.isFinite(r.drift)?`<div class="dataStatus"><b>Imported cardiac drift: ${r.drift.toFixed(1)}%</b><br><span class="muted">Time-series analysis is preserved when summary fields are edited.</span></div>`:''}
 <button id="saveRunEdit" class="primary full">Save changes</button>`;
}
function refreshEditorPlanOptions(r){
 let date=$('erDate')?.value||r.date,type=$('erType')?.value||r.type,select=$('erPlanMatch');if(!select)return;
 let current=select.value||r.planId||(r.matchStatus==='unresolved'?'unresolved':'adhoc');
 select.innerHTML=planMatchOptions({...r,date,type},current);
 if([...select.options].some(o=>o.value===current&&!o.disabled))select.value=current;
}
function bindEditorPlanRefresh(r){
 refreshEditorPlanOptions(r);
 $('erDate').onchange=()=>refreshEditorPlanOptions(r);
 $('erType').onchange=()=>refreshEditorPlanOptions(r);
}
function updatedRunFromForm(r){
 let distance=Number($('erDistance').value),duration=parseTime($('erDuration').value);
 if(!$('erDate').value||!distance||!duration)throw Error('Enter a valid date, distance and duration.');
 let updated={...r,date:$('erDate').value,type:$('erType').value,distanceKm:distance,durationSec:duration,
  avgHr:Number($('erHr').value)||null,avgPower:Number($('erPower').value)||null,
  rpe:Number($('erRpe').value)||null,pain:$('erPain').value===''?null:Number($('erPain').value),
  recovery:Number($('erRecovery').value)||null,notes:$('erNotes').value};
 applyRunMatch(updated,$('erPlanMatch').value,'user');
 return updated;
}
$('runList').onclick=e=>{
 let card=e.target.closest('[data-run]');if(!card)return;
 let r=state.runs.find(x=>x.id===card.dataset.run);if(!r)return;
 if(r.source==='assessment'&&r.assessmentId){
   toast('Edit this run from the Assessments page so both records stay synchronized.',true);
   return;
 }
 $('modalContent').innerHTML=runEditorHtml(r)+`<button id="deleteEditedRun" class="danger buttonLike full">Delete run</button>`;
 $('modal').className='modal';
 bindEditorPlanRefresh(r);
 $('saveRunEdit').onclick=()=>{
   try{
    let updated=updatedRunFromForm(r),i=state.runs.findIndex(x=>x.id===r.id);
    if(i<0)throw Error('Run not found.');
    state.runs[i]=updated;save();$('modal').className='modal hidden';renderAll();toast('Run updated.');
   }catch(err){toast(err.message,true)}
 };
 $('deleteEditedRun').onclick=()=>{
   if(!confirm('Delete this run?'))return;
   state.runs=state.runs.filter(x=>x.id!==r.id);save();$('modal').className='modal hidden';renderAll();toast('Run deleted.');
 };
};
$('manualRunBtn').onclick=()=>{
 let r={id:'manual-'+Date.now(),date:iso(today()),type:'Easy',distanceKm:'',durationSec:null,avgHr:null,avgPower:null,rpe:null,pain:null,recovery:null,notes:''};
 $('modalContent').innerHTML=runEditorHtml(r);
 $('modal').className='modal';
 bindEditorPlanRefresh(r);
 $('saveRunEdit').onclick=()=>{
   try{let created=updatedRunFromForm(r);state.runs.push(created);save();$('modal').className='modal hidden';renderAll();toast('Run saved.')}catch(err){toast(err.message,true)}
 };
};
$('closeModal').onclick=()=>{$('modal').className='modal hidden'};
$('modal').onclick=e=>{if(e.target===$('modal'))$('modal').className='modal hidden'};

$('activityFile').onchange=async e=>{
 const input=e.target;
 const f=input.files?.[0];
 if(!f)return;
 preview=null;
 $('importPreview').className='hidden';
 try{
   if(!f.name.toLowerCase().endsWith('.csv'))throw Error('Please choose a detailed Stryd CSV file.');
   const text=await f.text();
   if(!text.trim())throw Error('The selected CSV file is empty.');
   const rows=parseCSV(text);
   if(!rows?.length||rows.length<2)throw Error('The CSV does not contain activity rows.');
   preview=summariseCSV(rows);
   if(!preview||!preview.distanceKm||!preview.durationSec)throw Error('The activity could not be summarised from this CSV.');

   let m=metrics(preview);
   $('importPreview').className='panel';
   $('importPreview').innerHTML=`<h3>CSV analysis preview</h3>
   <div class="metricGrid">
    ${kpi('Date',preview.date)}
    ${kpi('Distance',preview.distanceKm.toFixed(2)+' km')}
    ${kpi('Duration',fmtTime(preview.durationSec))}
    ${kpi('Pace',pace(m.pace))}
    ${kpi('Heart rate',preview.avgHr?Math.round(preview.avgHr)+' bpm':'—')}
    ${kpi('Power',preview.avgPower?Math.round(preview.avgPower)+' W':'—',
      preview.avgPower&&preview.avgPower<20?'Detected value is implausibly low—check body weight and CSV headers':'Parsed as watts')}
    ${kpi('Cardiac drift',Number.isFinite(preview.candidateDrift)?preview.candidateDrift.toFixed(1)+'% candidate':'Not available',
      preview.candidateStreamEvidence?.reliability?preview.candidateStreamEvidence.reliability+' reliability · saved for every run type':'Needs ≥30 min with HR and power')}
    ${kpi('Power–HR drift',Number.isFinite(preview.candidatePowerDrift)?preview.candidatePowerDrift.toFixed(1)+'% candidate':'—')}
    ${kpi('Pace–HR drift',Number.isFinite(preview.candidatePaceDrift)?preview.candidatePaceDrift.toFixed(1)+'% candidate':'—')}
    ${kpi('Efficiency factor',dec(m.efficiencyJ,1)+' J/beat')}
   </div>
   <div class="formGrid">
    <div class="field"><label>Run type</label><select id="iType"><option>Easy</option><option>Recovery</option><option>Long run</option><option>Tempo</option><option>Intervals</option><option>Fitness assessment</option><option>Race</option></select></div>
    <div class="field"><label>Link to planned workout</label><select id="iPlanMatch"></select><small class="muted">Confirm a planned workout, choose ad hoc, or leave unresolved.</small></div>
    <div class="field"><label>RPE 1–10 <small class="muted">1 very easy · 10 maximal</small></label><input id="iRpe" type="number" min="1" max="10"></div>
    <div class="field"><label>Pain 0–10 <small class="muted">0 none · 5 affects form · 10 extreme</small></label><input id="iPain" type="number" min="0" max="10"></div>
    <div class="field"><label>Recovery 1–5 <small class="muted">1 very poor · 3 normal · 5 excellent</small></label><input id="iRecovery" type="number" min="1" max="5"></div>
    <div class="field"><label>Notes</label><input id="iNotes"></div>
   </div>
   <button id="saveImport" class="primary full">Save analysed run</button>`;
   const refreshImportMatches=()=>{let draft={...preview,type:$('iType').value};let suggested=preview.planId||suggestedPlanId(draft)||'adhoc';$('iPlanMatch').innerHTML=planMatchOptions(draft,suggested)};
   refreshImportMatches();$('iType').onchange=refreshImportMatches;

   $('saveImport').onclick=()=>{
    try{
      if(!preview)throw Error('The import preview has expired. Choose the CSV again.');
      if(state.runs.some(r=>r.id===preview.id))throw Error('This run was already imported.');
      Object.assign(preview,{
        type:$('iType').value,
        rpe:Number($('iRpe').value)||null,
        pain:$('iPain').value===''?null:Number($('iPain').value),
        recovery:Number($('iRecovery').value)||null,
        notes:$('iNotes').value
      });
      preview.drift=preview.candidatePowerDrift;
      preview.powerDrift=preview.candidatePowerDrift;
      preview.paceDrift=null;
      preview.streamEvidence=preview.candidateStreamEvidence;
      delete preview.candidateDrift;
      delete preview.candidatePowerDrift;
      delete preview.candidatePaceDrift;
      delete preview.candidateStreamEvidence;
      applyRunMatch(preview,$('iPlanMatch').value,'user');
      state.runs.push({...preview});
      save();
      $('importPreview').className='hidden';
      preview=null;
      input.value='';
      renderAll();
      toast('CSV analysed and run saved.');
    }catch(err){
      toast(err?.message||'The run could not be saved.',true);
    }
   };
 }catch(err){
   preview=null;
   input.value='';
   $('importPreview').className='hidden';
   toast(err?.message||'The CSV could not be imported.',true);
 }
};
$('addAssessmentBtn').onclick=()=>{$('assessmentForm').className='panel';$('assessmentForm').innerHTML=`<h3>Fitness assessment result</h3><div class="formGrid"><div class="field"><label>Date</label><input id="aDate" type="date" value="${iso(today())}"></div><div class="field"><label>Distance km</label><input id="aDist" value="5"></div><div class="field"><label>Time</label><input id="aTime" placeholder="25:15"></div><div class="field"><label>Average / threshold HR</label><input id="aHr" value="${state.setup.thresholdHr}"></div><div class="field"><label>Average / critical power W</label><input id="aCp" value="${state.setup.criticalPower}"></div><div class="field"><label>Valid result</label><select id="aValid"><option value="true">Yes</option><option value="false">No</option></select></div></div><button id="saveAssessment" class="primary full">Save assessment and completed run</button>`;$('saveAssessment').onclick=()=>{let a={id:'a-'+Date.now(),date:$('aDate').value,distance:Number($('aDist').value),time:parseTime($('aTime').value),thresholdHr:Number($('aHr').value),criticalPower:Number($('aCp').value),valid:$('aValid').value==='true'};if(!a.date||!a.distance||!a.time)return toast('Complete date, distance and time.',true);state.assessments.push(a);syncAssessmentRun(a);buildPlan();syncAssessmentRun(a);save();renderAll();$('assessmentForm').className='hidden';toast(a.valid?'Assessment saved, added to run history and applied to future targets.':'Assessment saved and added to run history, but not applied to prediction.')}};

function validateSetup(candidate){
 const errors=[];
 if(!candidate.planStart||!candidate.raceDate||dte(candidate.raceDate)<=dte(candidate.planStart))errors.push('Race date must be after the plan start date.');
 if(!(candidate.raceDistance>0&&candidate.raceDistance<=200))errors.push('Race distance must be between 0 and 200 km.');
 if(!(candidate.bodyWeight>25&&candidate.bodyWeight<250))errors.push('Body weight must be between 25 and 250 kg.');
 if(!(candidate.currentWeekly>=0&&candidate.currentWeekly<=250&&candidate.maxWeekly>0&&candidate.maxWeekly<=250))errors.push('Weekly-distance settings are inconsistent.');
 if(!(candidate.peakLong>0&&candidate.peakLong<=100))errors.push('Peak long run must be above 0 and no more than 100 km.');
 if(!(candidate.minFactor>0&&candidate.maxFactor>=candidate.minFactor&&candidate.maxFactor<=1.25))errors.push('Adaptive-factor limits are invalid.');
 if(!(candidate.targetTime>0&&candidate.testTime>0&&candidate.testDistance>0))errors.push('Target and assessment time/distance must be positive.');
 return errors;
}
function validateBackup(obj){return obj&&typeof obj==='object'&&obj.setup&&Array.isArray(obj.runs)&&Array.isArray(obj.assessments)&&Array.isArray(obj.days)}
$('saveSettings').onclick=()=>{let candidate={...state.setup};document.querySelectorAll('[data-setting]').forEach(el=>{let k=el.dataset.setting,t=el.dataset.type,v=el.value;if(t==='number')v=Number(v);if(t==='time')v=parseTime(v);if(t==='percent')v=Number(v)/100;candidate[k]=v});let errors=validateSetup(candidate);if(errors.length)return toast(errors[0],true);let selectedDays=[...document.querySelectorAll('[data-day]')].filter(el=>el.checked).length;if(selectedDays<1)return toast('Select at least one training day.',true);state.setup=candidate;document.querySelectorAll('[data-day]').forEach(el=>state.days[Number(el.dataset.day)][1]=el.checked);document.querySelectorAll('[data-session]').forEach(el=>state.days[Number(el.dataset.session)][2]=el.value);buildPlan();state.weekView=currentWeek();save();renderAll();toast('Settings saved. Training frequency and race-day readiness were recalculated; future workouts rebuilt.')};
function download(n,t,m){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('planHealthBtn').onclick=()=>{renderPlanHealth();toast(validatePlan(state.plan).valid?'Plan health check passed.':'Plan health check found issues.',!validatePlan(state.plan).valid)};
$('backupBtn').onclick=()=>download('ai-running-coach-backup.json',JSON.stringify(state,null,2),'application/json');$('restoreFile').onchange=e=>e.target.files[0]?.text().then(t=>{let candidate=JSON.parse(t);if(!validateBackup(candidate))throw new Error('Backup structure is incomplete.');let errors=validateSetup(candidate.setup);if(errors.length)throw new Error(errors[0]);candidate.schemaVersion=SCHEMA;candidate.plan=Array.isArray(candidate.plan)?candidate.plan:[];state=candidate;buildPlan();save();renderAll();toast('Backup restored and migrated.')}).catch(err=>toast(err?.message||'Invalid backup.',true));$('exportBtn').onclick=()=>download('run-log.csv',['Date,Type,Distance km,Duration sec,HR,Power,RPE,Pain,Recovery,Match status,Plan ID,Day offset,Notes',...state.runs.map(r=>[r.date,r.type,r.distanceKm,r.durationSec,r.avgHr,r.avgPower,r.rpe,r.pain,r.recovery,r.matchStatus||'',r.planId||'',r.dayOffset??'',`"${String(r.notes||'').replaceAll('"','""')}"`].join(','))].join('\n'),'text/csv');$('resetBtn').onclick=()=>{if(confirm('Delete all app data?')){state=defaults();buildPlan();save();renderAll();toast('App reset.')}};
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('installBtn').className='install'});$('installBtn').onclick=()=>deferred?.prompt();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('service-worker.js');
migrateAssessmentRuns();
migrateImportedPower();
renderAll();
console.info('AI Running Coach v8.5.2 stable build 8520');
})();