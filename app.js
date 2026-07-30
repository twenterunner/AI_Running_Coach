let preview=null;
(()=>{'use strict';
const DAY=87300000, $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
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
const FIVE_DAY_TEMPLATE=[['Monday',false,'Easy'],['Tuesday',true,'Intervals'],['Wednesday',true,'Easy'],['Thursday',true,'Tempo'],['Friday',false,'Easy'],['Saturday',true,'Easy'],['Sunday',true,'Long run']];
const RACE_PROFILES=[
 {key:'5k',label:'5K',maxDistance:7.5,currentWeekly:18,peakLong:12,maxWeekly:32,growth:.07,taperDays:7,days:[['Monday',false,'Easy'],['Tuesday',true,'Intervals'],['Wednesday',true,'Easy'],['Thursday',false,'Easy'],['Friday',false,'Easy'],['Saturday',true,'Tempo'],['Sunday',true,'Long run']]},
 {key:'10k',label:'10K',maxDistance:15.55,currentWeekly:24,peakLong:16,maxWeekly:42,growth:.07,taperDays:7,days:[['Monday',false,'Easy'],['Tuesday',true,'Intervals'],['Wednesday',true,'Easy'],['Thursday',false,'Easy'],['Friday',false,'Easy'],['Saturday',true,'Tempo'],['Sunday',true,'Long run']]},
 {key:'half',label:'Half marathon',maxDistance:31.65,currentWeekly:30,peakLong:24,maxWeekly:52,growth:.07,taperDays:14,days:FIVE_DAY_TEMPLATE.map(d=>[...d])},
 {key:'marathon',label:'Marathon',maxDistance:47.5,currentWeekly:35,peakLong:32,maxWeekly:65,growth:.07,taperDays:14,days:FIVE_DAY_TEMPLATE.map(d=>[...d])},
 {key:'50k',label:'50 km ultra',maxDistance:62.5,currentWeekly:40,peakLong:38,maxWeekly:72,growth:.06,taperDays:14,days:FIVE_DAY_TEMPLATE.map(d=>[...d])},
 {key:'75k',label:'75 km ultra',maxDistance:87.5,currentWeekly:45,peakLong:45,maxWeekly:82,growth:.06,taperDays:18,days:FIVE_DAY_TEMPLATE.map(d=>[...d])},
 {key:'100k',label:'100 km ultra',maxDistance:Infinity,currentWeekly:50,peakLong:50,maxWeekly:92,growth:.05,taperDays:21,days:FIVE_DAY_TEMPLATE.map(d=>[...d])}
];
function raceProfile(distance=state?.setup?.raceDistance){let d=Number(distance);return RACE_PROFILES.find(p=>d<=p.maxDistance)||RACE_PROFILES.at(-1)}
function raceProfileValues(distance){let p=raceProfile(distance);return{currentWeekly:p.currentWeekly,peakLong:p.peakLong,maxWeekly:p.maxWeekly,growth:p.growth,taperDays:p.taperDays}}
const TYPE_ALIASES={'Easy + strides':'Easy','Hills':'Intervals','Fartlek':'Intervals','Threshold':'Tempo','Threshold intervals':'Tempo','VO₂max intervals':'Intervals','Race-pace intervals':'Intervals','Steady aerobic':'Steady','Medium-long':'Steady','Progression':'Steady','Marathon-specific':'Marathon','Half-marathon-specific':'Tempo','Specific long run':'Long run','Race rehearsal':'Long run','Shakeout':'Recovery','Repetition':'Intervals'};
function baseType(type){return TYPE_ALIASES[type]||type}
function detailedPhase(w){const total=weeks(),tw=Math.max(1,Math.ceil(state.setup.taperDays/7)),pre=Math.max(1,total-tw),p=raceProfile();if(w>pre)return'Taper';const x=w/pre;if(x<=.20)return'Foundation';if(x<=.45)return'Aerobic';if(x<=.68)return p.key==='marathon'||['50k','75k','100k'].includes(p.key)?'Endurance':'Development';if(x<=.88)return'Specific';return'Peak'}
function displayPhaseFromDetailed(dp){return dp==='Foundation'||dp==='Aerobic'?'Base':dp==='Development'||dp==='Endurance'||dp==='Specific'?'Build':dp}
function phase(w){return displayPhaseFromDetailed(detailedPhase(w))}
function assessmentWeeks(total=weeks(),profile=raceProfile()){const taper=Math.max(1,Math.ceil(state.setup.taperDays/7)),last=Math.max(2,total-taper-2),fractions=profile.key==='5k'||profile.key==='10k'?[.38,.72]:profile.key==='half'||profile.key==='marathon'?[.48]:[.42];return[...new Set(fractions.map(f=>clamp(Math.round(last*f),3,last)).filter(w=>w>1))]}
const RACE_PHASE_MATRIX={
 '5k':{Foundation:['Hills','Easy','Easy + strides','Recovery','Long run'],Aerobic:['Threshold','Easy','Easy + strides','Recovery','Long run'],Development:['VO₂max intervals','Easy','Threshold','Recovery','Long run'],Specific:['Race-pace intervals','Easy','Repetition','Recovery','Long run'],Peak:['Race-pace intervals','Easy','Easy + strides','Recovery','Long run'],Taper:['Race-pace intervals','Easy','Shakeout','Recovery','Long run']},
 '10k':{Foundation:['Fartlek','Easy','Easy + strides','Recovery','Long run'],Aerobic:['Threshold','Easy','Steady aerobic','Recovery','Long run'],Development:['Threshold intervals','Easy','VO₂max intervals','Recovery','Long run'],Specific:['Race-pace intervals','Easy','Threshold','Easy + strides','Long run'],Peak:['Race-pace intervals','Easy','Easy + strides','Recovery','Long run'],Taper:['Race-pace intervals','Easy','Shakeout','Recovery','Long run']},
 'half':{Foundation:['Threshold','Easy','Easy + strides','Recovery','Long run'],Aerobic:['Threshold','Easy','Medium-long','Recovery','Long run'],Development:['Threshold intervals','Easy','Medium-long','Recovery','Progression'],Specific:['Half-marathon-specific','Easy','Medium-long','Recovery','Specific long run'],Peak:['Half-marathon-specific','Easy','Medium-long','Recovery','Specific long run'],Taper:['Half-marathon-specific','Easy','Shakeout','Recovery','Long run']},
 'marathon':{Foundation:['Hills','Easy','Easy + strides','Recovery','Long run'],Aerobic:['Threshold','Easy','Medium-long','Recovery','Long run'],Endurance:['Threshold','Easy','Medium-long','Recovery','Progression'],Specific:['Marathon-specific','Easy','Medium-long','Recovery','Specific long run'],Peak:['Marathon-specific','Easy','Medium-long','Recovery','Race rehearsal'],Taper:['Marathon-specific','Easy','Shakeout','Recovery','Long run']},
 'ultra':{Foundation:['Hills','Easy','Easy','Recovery','Long run'],Aerobic:['Steady aerobic','Easy','Medium-long','Recovery','Long run'],Endurance:['Hills','Easy','Medium-long','Recovery','Specific long run'],Specific:['Steady aerobic','Easy','Medium-long','Recovery','Race rehearsal'],Peak:['Easy','Recovery','Medium-long','Recovery','Race rehearsal'],Taper:['Steady aerobic','Easy','Shakeout','Recovery','Long run']}};
function profileMatrixKey(profile=raceProfile()){return['50k','75k','100k'].includes(profile.key)?'ultra':profile.key}
function weekTypeAssignments(w,weekDates){const profile=raceProfile(),dp=detailedPhase(w),key=profileMatrixKey(profile),matrix=RACE_PHASE_MATRIX[key]||RACE_PHASE_MATRIX.marathon,types=matrix[dp]||matrix.Specific;const enabled=weekDates.filter(x=>x.cfg[1]&&x.date!==state.setup.raceDate),longCandidate=enabled.find(x=>x.cfg[2]==='Long run')||enabled.at(-1),nonLong=enabled.filter(x=>x!==longCandidate),assigned=new Map();nonLong.forEach((x,i)=>assigned.set(x.date,types[Math.min(i,3)]||'Easy'));if(longCandidate)assigned.set(longCandidate.date,types[4]||'Long run');if(assessmentWeeks().includes(w)&&nonLong.length&&dp!=='Taper')assigned.set(nonLong[0].date,'Fitness assessment');return assigned}
function applyRaceProfileDays(profile){if(!profile?.days)return;state.days=profile.days.map(d=>[...d])}
function trainingOpportunityModel(setup=state.setup,enabledDays=state.days.filter(d=>d[1]).length,currentPhase=phase(currentWeek())){
 const profile=raceProfile(setup.raceDistance);
 // Minimum effective frequencies are intended for performance-oriented preparation,
 // not merely completing the distance. Above the minimum, frequency is not awarded
 // bonus confidence because additional days mainly improve load distribution.
 const minimumEffectiveDays={"5k":3,"10k":3,"half":4,"marathon":4,"50k":4,"75k":5,"100k":5}[profile.key]||4;
 const idealDays={"5k":5,"10k":5,"half":5,"marathon":5,"50k":5,"75k":6,"100k":6}[profile.key]||5;
 const baseOpportunity=clamp(Math.pow(enabledDays/Math.max(1,minimumEffectiveDays),1.6),0,1);
 const raceImportance={"5k":5,"10k":8,"half":12,"marathon":18,"50k":20,"75k":24,"100k":28}[profile.key]||12;
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
 let p=raceProfile(setup.raceDistance),minimumTotal={"5k":6,"10k":8,"half":12,"marathon":20,"50k":22,"75k":24,"100k":26}[p.key]||12;
 let req=buildRequirementEstimate(setup),taperWeeks=Math.max(1,Number(setup.taperDays||p.taperDays)/7);
 let totalWeeks=Math.ceil(Math.max(minimumTotal,req.requiredBuildWeeks+taperWeeks+2));
 return{date:iso(new Date(dte(setup.planStart).getTime()+totalWeeks*7*DAY)),totalWeeks,requiredBuildWeeks:req.requiredBuildWeeks,taperWeeks};
}
const BUILD=9380, SCHEMA=9380, STORAGE_KEY='arc_v62_web', MIRROR_KEY='arc_v8500_web', BACKUP_KEY='arc_pre8500_backup';
const defaults=()=>{let start=iso(new Date()),setup={planStart:start,raceDate:start,raceName:'Goal Race',raceDistance:42.195,targetTime:15300,currentWeekly:35,currentLongest:18,testDistance:5,testTime:1515,thresholdHr:168,criticalPower:300,bodyWeight:93,maxWeekly:65,growth:.07,peakLong:32,taperDays:14,minFactor:.85,maxFactor:1.05,adaptive:true};setup.raceDate=recommendedRaceDate(setup).date;return({schemaVersion:SCHEMA,setup,days:FIVE_DAY_TEMPLATE.map(d=>[...d]),runs:[],assessments:[],plan:[],weekView:null,migration:{to:SCHEMA,status:'new',time:new Date().toISOString()}})};
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
 const runs=Array.isArray(src.runs)?src.runs.filter(Boolean).map(r=>({...r,distanceKm:Number(r.distanceKm)||0,durationSec:Number(r.durationSec)||0,avgHr:Number(r.avgHr)||0,avgPower:Number(r.avgPower)||0,rpe:r.rpe==null?null:Number(r.rpe),pain:r.pain==null?null:Number(r.pain),recovery:null,hrv:r.hrv==null?null:Number(r.hrv),powerDrift:r.powerDrift==null?null:Number(r.powerDrift)})):[];
 const assessments=Array.isArray(src.assessments)?src.assessments.filter(Boolean).map(a=>({...a,distance:Number(a.distance)||0,time:Number(a.time)||0,thresholdHr:Number(a.thresholdHr)||0,criticalPower:Number(a.criticalPower)||0,valid:Boolean(a.valid)})):[];
 const plan=Array.isArray(src.plan)?src.plan.filter(Boolean).map(x=>({...x,week:Number(x.week)||1,distance:Number(x.distance)||0,factor:Number(x.factor)||1,zone:{...(x.zone||{}),pace:Number(x.zone?.pace)||0,hr:Number(x.zone?.hr)||0,power:Number(x.zone?.power)||0}})):[];
 migrationReport={...migrationReport,from:Number(src.schemaVersion)||'legacy',to:SCHEMA,status:'success',runs:runs.length,assessments:assessments.length,fieldsRecovered:recovered};
 let predictionHistory=Array.isArray(src.predictionHistory)?src.predictionHistory.filter(x=>x&&x.date&&Number.isFinite(Number(x.seconds))).map(x=>({...x,seconds:Number(x.seconds)})):[];
 const standaloneRuns=runs.filter(r=>r.source!=='assessment').length,maxTrendEvents=standaloneRuns+assessments.length;
 if(maxTrendEvents===0)predictionHistory=[];else if(predictionHistory.every(x=>!x.entityId)&&predictionHistory.length>maxTrendEvents)predictionHistory=predictionHistory.slice(-maxTrendEvents);
 const storedStart=Number(src.programStartPrediction);const programStartPrediction=Number.isFinite(storedStart)?storedStart:initialProgrammePrediction(setup);
 return{...base,...src,schemaVersion:SCHEMA,setup,days:Array.isArray(src.days)&&src.days.length?src.days:base.days,runs,assessments,plan,predictionHistory,programStartPrediction,weekView:Number(src.weekView)||null,migration:{...migrationReport,time:new Date().toISOString()}};
}
let rawState=loadStoredState();
try{if(rawState) localStorage.setItem(BACKUP_KEY,JSON.stringify(rawState))}catch(err){recordDiagnostic('Pre-migration backup',err)}
let state;try{state=normaliseState(rawState||defaults())}catch(err){recordDiagnostic('Migration failure',err);migrationReport.status='recovered defaults';migrationReport.warning=err.message;state=defaults()}
function save(){const text=JSON.stringify(state);try{localStorage.setItem(STORAGE_KEY,text);localStorage.setItem(MIRROR_KEY,text);return true}catch(err){recordDiagnostic('Save failure',err);toast('Data could not be saved on this device.',true);return false}}
save();
const EVIDENCE_WEIGHT={Recovery:.10,Easy:.16,'Easy + strides':.20,'Steady aerobic':.26,'Medium-long':.34,Progression:.34,'Long run':.34,'Specific long run':.48,'Race rehearsal':.52,Hills:.30,Fartlek:.30,Threshold:.48,'Threshold intervals':.55,'Half-marathon-specific':.55,'Marathon-specific':.55,'VO₂max intervals':.52,'Race-pace intervals':.58,Intervals:.48,Tempo:.48,'Fitness assessment':.90,Race:.95};
const EXECUTION_PROFILES={
 Recovery:{distance:.18,pace:.08,power:.08,hr:.32,drift:.24,rpe:.10,objective:'Promote recovery while keeping effort genuinely easy.'},
 Easy:{distance:.24,pace:.12,power:.12,hr:.24,drift:.18,rpe:.10,objective:'Build aerobic fitness with controlled, conversational effort.'},
 Steady:{distance:.25,pace:.18,power:.18,hr:.18,drift:.13,rpe:.08,objective:'Deliver a controlled moderate aerobic stimulus below threshold.'},
 Marathon:{distance:.24,pace:.24,power:.26,hr:.12,drift:.08,rpe:.06,objective:'Hold race-specific effort economically and under control.'},
 Tempo:{distance:.23,pace:.25,power:.28,hr:.10,drift:.07,rpe:.07,objective:'Accumulate sustainable threshold work without turning it into a race.'},
 Intervals:{distance:.22,pace:.24,power:.30,hr:.08,drift:.04,rpe:.12,objective:'Complete repeatable high-quality repetitions at the intended intensity.'},
 Repetition:{distance:.20,pace:.27,power:.27,hr:.05,drift:.03,rpe:.18,objective:'Develop relaxed speed and economy while preserving form.'},
 'Long run':{distance:.34,pace:.08,power:.08,hr:.18,drift:.24,rpe:.08,objective:'Build endurance, durability and late-run control without excess strain.'},
 'Fitness assessment':{distance:.20,pace:.28,power:.26,hr:.12,drift:.02,rpe:.12,objective:'Produce a valid, evenly paced benchmark that reflects current fitness.'},
 Race:{distance:.18,pace:.28,power:.22,hr:.12,drift:.05,rpe:.15,objective:'Execute the goal race with controlled pacing and sustainable effort.'}
};
function executionProfile(type){const b=baseType(type);if(['Specific long run','Race rehearsal','Progression'].includes(type))return EXECUTION_PROFILES['Long run'];return EXECUTION_PROFILES[b]||EXECUTION_PROFILES.Easy}
function expectedRpe(type){const b=baseType(type);return({Recovery:[1,3],Easy:[2,4],Steady:[4,6],Marathon:[5,7],Tempo:[7,8.5],Intervals:[7.5,9.5],Repetition:[8,10],'Long run':[3,6],'Fitness assessment':[9,10],Race:[8,10]})[b]||[2,6]}
function scoreBand(score){return score>=95?'Excellent execution':score>=85?'Good execution':score>=70?'Useful session; improve control':score>=50?'Limited training benefit':'Session objective largely missed'}
function targetMetricReliability(plan){if(!plan)return 0;const t=plan.type,b=baseType(t);if(['Recovery','Easy','Steady','Long run','Race'].includes(b)&&!['Progression','Specific long run','Race rehearsal'].includes(t))return .85;return .35}
function workoutScoreDetails(run,plan=run?.planId?state.plan.find(p=>p.id===run.planId):null){
 if(!run)return null;
 const actualKm=Number(run.distanceKm)||0,dur=Number(run.durationSec)||0;
 if(!(actualKm>0&&dur>0))return null;
 const type=plan?.type||run.type||'Easy',profile=executionProfile(type),plannedKm=plan?Math.max(.1,Number(plan.distance)||0):null,actualPace=dur/actualKm;
 const components=[],add=(key,name,score,baseWeight,detail,reliability=1)=>{if(Number.isFinite(score)&&baseWeight>0)components.push({key,name,score:clamp(score,0,100),baseWeight,weight:baseWeight*reliability,detail,reliability})};
 if(plan){
  const ratio=actualKm/plannedKm,diff=Math.abs(ratio-1),score=diff<=.05?100:ratio<1?clamp(100-(diff-.05)*125,35,100):clamp(100-(diff-.05)*95,35,100);
  const direction=ratio>1.05?'Over-completion is not rewarded because it adds unplanned load.':ratio<.95?'The intended volume was not fully completed.':'Completed within the intended distance range.';
  add('distance','Distance execution',score,profile.distance,`${actualKm.toFixed(2)} km completed versus ${plannedKm.toFixed(2)} km planned. ${direction}`);
 }
 const reliability=targetMetricReliability(plan),aggregateNote=reliability<.5?' Whole-run averages include warm-up, recoveries and cooldown, so this is supporting evidence only.':'';
 if(plan?.zone?.pace>0){const ratio=plan.zone.pace/actualPace,score=clamp(100-Math.abs(1-ratio)*145,45,100);add('pace','Pace execution',score,profile.pace,`${pace(actualPace)} whole-run average versus ${pace(plan.zone.pace)} target for the prescribed target portion.${aggregateNote}`,reliability)}
 if(Number(run.avgPower)>0&&plan?.zone?.power>0){const ratio=Number(run.avgPower)/plan.zone.power,score=clamp(100-Math.abs(1-ratio)*140,45,100);add('power','Power execution',score,profile.power,`${Math.round(Number(run.avgPower))} W whole-run average versus ${Math.round(plan.zone.power)} W target.${aggregateNote}`,reliability)}
 if(Number(run.avgHr)>0&&plan?.zone?.hr>0){const hr=Number(run.avgHr),guide=plan.zone.hr,delta=(hr-guide)/Math.max(1,guide),score=hr<=guide?100:clamp(100-delta*180,55,100);add('hr','Heart-rate control',score,profile.hr,`${Math.round(hr)} bpm whole-run average versus ${Math.round(guide)} bpm guide. Lower-than-guide HR receives full, not extra, credit.${aggregateNote}`,reliability)}
 if(Number.isFinite(Number(run.powerDrift))){const drift=Number(run.powerDrift),score=clamp(100-Math.max(0,drift-2)*6,55,100),relevance=['Intervals','Repetition','Fitness assessment'].includes(baseType(type))?.45:1;add('drift','Cardiac drift',score,profile.drift,`${drift.toFixed(1)}% power-based drift; values up to about 2% receive full credit.${relevance<1?' Drift has limited relevance for short-repetition sessions.':''}`,relevance)}
 const rpe=Number(run.rpe),range=expectedRpe(type);if(Number.isFinite(rpe)&&rpe>0){const dist=rpe<range[0]?range[0]-rpe:rpe>range[1]?rpe-range[1]:0,score=clamp(100-dist*14,45,100);add('rpe','Effort appropriateness',score,profile.rpe,`RPE ${rpe}/10 versus expected ${range[0]}–${range[1]} for this session objective.`)}
 const weightTotal=sum(components.map(c=>c.weight));components.forEach(c=>c.effectiveWeight=weightTotal?c.weight/weightTotal:0);
 let raw=weightTotal?sum(components.map(c=>c.score*c.weight))/weightTotal:null,cap=null,capReason='';
 if(Number(run.pain)>=7){cap=50;capReason=`Pain ${Number(run.pain)}/10 substantially reduced the training value and caps the final score at 50.`}
 else if(Number(run.pain)>=5){cap=70;capReason=`Although the observable execution may have been sound, pain ${Number(run.pain)}/10 limits the training value and caps the final score at 70.`}
 else if(Number(run.pain)>=3){cap=82;capReason=`Although the workout may have been executed well, pain ${Number(run.pain)}/10 limits progression and caps the final score at 82.`}
 const final=Number.isFinite(raw)?Math.round(clamp(cap==null?raw:Math.min(raw,cap),0,100)):null;
 const evidenceQuality=plan?(reliability>=.8?'high':'moderate'):(components.length>=2?'low':'very low');
 return{score:final,rawScore:Number.isFinite(raw)?raw:null,components,cap,capReason,plan,objective:plan?.purpose||profile.objective,interpretation:scoreBand(final),evidenceQuality};
}
function workoutScore(run,plan=run?.planId?state.plan.find(p=>p.id===run.planId):null){return workoutScoreDetails(run,plan)?.score??null}
function trainingEvidence(asOf=iso(today())){let valid=state.assessments.filter(a=>a.valid&&a.date<=asOf).sort((a,b)=>a.date.localeCompare(b.date)),anchor=valid.at(-1),anchorDate=anchor?.date||state.setup.planStart,runs=state.runs.filter(r=>r.date>=anchorDate&&r.date<=asOf&&r.source!=='assessment').sort((a,b)=>a.date.localeCompare(b.date)),raw=100,evidence=0,events=[];runs.forEach(r=>{let p=r.planId?state.plan.find(x=>x.id===r.planId):null,score=workoutScore(r,p),weight=EVIDENCE_WEIGHT[r.type]??EVIDENCE_WEIGHT[baseType(r.type)]??.15;if(score==null)return;let confidence=weight;if(Number(r.pain)>=3||(!p&&r.type!=='Race'))confidence*=.35;if(p&&Number(r.distanceKm)<Number(p.distance)*.7)confidence*=.35;let maxMove=confidence*.65,signal=clamp((score-82)/18,-1,1);if(signal<0&&confidence<.35)signal=0;let delta=signal*maxMove;raw=clamp(raw+delta,95,105);evidence+=confidence;events.push({date:r.date,type:r.type,score,delta,confidence})});let applied=Math.round((raw-100)*2)/2+100;if(Math.abs(applied-100)<.75)applied=100;let confidence=clamp(Math.round(evidence/4*100),0,100);return{rawIndex:raw,index:applied,adjustment:applied/100,confidence,events,anchorDate,anchorType:anchor?'Fitness assessment':'Setup baseline'}}
function baselineOn(date){let valid=state.assessments.filter(a=>a.valid&&a.date<=date).sort((a,b)=>a.date.localeCompare(b.date)),a=valid.at(-1),base=a?{pace:a.time/a.distance,hr:a.thresholdHr||state.setup.thresholdHr,cp:a.criticalPower||state.setup.criticalPower}:{pace:state.setup.testTime/state.setup.testDistance,hr:state.setup.thresholdHr,cp:state.setup.criticalPower},ev=trainingEvidence(date);return{pace:base.pace/ev.adjustment,hr:base.hr,cp:base.cp*ev.adjustment,evidence:ev}}
const zoneDef={Recovery:[1.42,.78,.72,'RPE 2–3 · relaxed and restorative'],Easy:[1.30,.84,.78,'RPE 3–4 · conversational aerobic running'],Steady:[1.20,.89,.84,'RPE 5 · controlled moderate work'],Marathon:[1.15,.92,.88,'RPE 5–6 · race-specific control'],Tempo:[1.08,1,.95,'RPE 7–8 · strong but sustainable'],Intervals:[.98,1.04,1.05,'RPE 8–9 · quality repetitions'],Repetition:[.92,1.08,1.15,'RPE 9 · short fast work'],['Fitness assessment']:[1,1,1,'Even maximal benchmark'],['Race Day']:[1.15,.92,.88,'Controlled race execution']};
function zone(type,date){let b=baselineOn(date),z=zoneDef[baseType(type)]||zoneDef.Easy;return{pace:b.pace*z[0],hr:Math.round(b.hr*z[1]),power:Math.round(b.cp*z[2]),guide:z[3],fitnessIndex:b.evidence?.index||100}}
function weeks(){return Math.max(1,Math.floor((dte(state.setup.raceDate)-dte(state.setup.planStart))/(7*DAY))+1)}function weekStart(w){return new Date(dte(state.setup.planStart).getTime()+(w-1)*7*DAY)}
function currentWeek(){return clamp(Math.floor((today()-dte(state.setup.planStart))/(7*DAY))+1,1,weeks())}
function recentRuns(days=28){return state.runs.filter(r=>today()-dte(r.date)<=days*DAY&&today()>=dte(r.date))}
function metrics(r){let dur=Number(r.durationSec),km=Number(r.distanceKm),hr=Number(r.avgHr),pw=Number(r.avgPower),kg=Number(state.setup.bodyWeight);
let validRun=dur>0&&km>0,validHr=validRun&&hr>0,validPw=validRun&&pw>0&&kg>0;
return{pace:validRun?dur/km:null,dph:validHr?km*1000/(dur/60*hr):null,wpb:validHr&&pw>0?pw/hr:null,
 efficiencyJ:validHr&&pw>0?pw*60/hr:null,effect:validPw?(km*1000/dur)/(pw/kg):null,wkg:pw>0&&kg>0?pw/kg:null}}
const metricRunTypes=['Recovery','Easy','Easy + strides','Steady aerobic','Medium-long','Long run','Specific long run','Race rehearsal','Marathon-specific','Half-marathon-specific','Threshold','Threshold intervals','Hills','Fartlek','VO₂max intervals','Race-pace intervals','Fitness assessment','Race'];
const runTypeColors={'Recovery':'#58a65c','Shakeout':'#58a65c','Easy':'#2d82c7','Easy + strides':'#2d82c7','Steady aerobic':'#378f91','Medium-long':'#378f91','Long run':'#7457c8','Specific long run':'#6949b8','Race rehearsal':'#5635a3','Marathon':'#e49b35','Marathon-specific':'#e49b35','Half-marathon-specific':'#df7d35','Tempo':'#d65353','Threshold':'#d65353','Threshold intervals':'#c94444','Intervals':'#d4aa23','Hills':'#b88e1c','Fartlek':'#c29a21','VO₂max intervals':'#d4aa23','Race-pace intervals':'#ef6b2d','Fitness assessment':'#7b8794','Race':'#202a35'};
function metricSeries(runs,valueFn,labelSuffix=''){return metricRunTypes.map(type=>({
 label:type+labelSuffix,data:runs.map(r=>r.type===type?valueFn(r):null),color:runTypeColors[type]
})).filter(s=>s.data.some(Number.isFinite))}
function typeMetricSummary(runs){return metricRunTypes.map(type=>{
 let group=runs.filter(r=>r.type===type),eff=group.map(r=>metrics(r).efficiencyJ).filter(Number.isFinite),drift=group.map(r=>r.powerDrift).filter(Number.isFinite);
 return{type,count:group.length,effAvg:avg(eff),effBest:eff.length?Math.max(...eff):null,driftAvg:avg(drift),driftBest:drift.length?Math.min(...drift):null};
}).filter(x=>x.effAvg!==null||x.driftAvg!==null)}
function weekData(w){let st=weekStart(w),en=new Date(st.getTime()+7*DAY),p=state.plan.filter(x=>x.week===w&&x.type!=='Rest'),r=state.runs.filter(x=>dte(x.date)>=st&&dte(x.date)<en);return{planned:sum(p.map(x=>x.distance)),actual:sum(r.map(x=>x.distanceKm)),runs:r,plan:p}}

function hrvHistory(excludeRunId=null){
 return (state.runs||[]).filter(r=>r.id!==excludeRunId&&Number.isFinite(Number(r.hrv))&&Number(r.hrv)>0)
  .map(r=>({date:r.date,value:Number(r.hrv),id:r.id})).sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));
}
function median(values){let a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;let m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function hrvModel(){
 const hist=hrvHistory(), values=hist.map(x=>x.value), n=values.length;
 if(!n)return{count:0,status:'not available',factor:1,baseline:null,rolling:null,deviation:null,ready:false,confidence:'none',detail:'No previous-night Garmin HRV values have been logged.'};

 // HRV is used from the first logged value. Early estimates are deliberately
 // low influence because the personal baseline is still provisional.
 let stage,rollingValues,baselinePool,maxPenalty;
 if(n===1){
  stage='provisional';rollingValues=values.slice(-1);baselinePool=values.slice(0,1);maxPenalty=0;
 }else if(n<=3){
  stage='early baseline';rollingValues=values.slice();baselinePool=values.slice();maxPenalty=.01;
 }else if(n<=6){
  stage='early baseline';rollingValues=values.slice(-3);baselinePool=values.slice();maxPenalty=.03;
 }else if(n<=20){
  stage='developing baseline';rollingValues=values.slice(-7);baselinePool=values.slice(-Math.min(21,n));maxPenalty=.06;
 }else{
  stage='established baseline';rollingValues=values.slice(-7);
  // Compare the recent seven values with up to 21 earlier values so the
  // mature baseline changes slowly and is not pulled down by the same dip.
  baselinePool=values.slice(Math.max(0,n-28),n-7);maxPenalty=.10;
 }
 const rolling=avg(rollingValues);
 const baseline=median(baselinePool)||median(values)||rolling;
 const deviation=baseline>0?(rolling/baseline-1):0;

 // Wide trend bands. The stage-specific cap prevents early values from
 // making large plan changes before enough personal evidence exists.
 let status='within normal range',rawFactor=1;
 if(deviation<=-.35){status='strongly suppressed';rawFactor=.90}
 else if(deviation<=-.25){status='suppressed';rawFactor=.94}
 else if(deviation<=-.15){status='below normal range';rawFactor=.98}
 else if(deviation>=.25){status='above normal range';rawFactor=1}
 const factor=Math.max(1-maxPenalty,rawFactor);
 const windowLabel=rollingValues.length===1?'latest value':`latest ${rollingValues.length}-value average`;
 const confidence=n===1?'very low':n<=6?'low':n<=20?'developing':'established';
 const capText=maxPenalty?`Maximum plan moderation at this stage is ${(maxPenalty*100).toFixed(0)}%.`:'No plan penalty is applied from a single value.';
 return{count:n,status,factor,baseline,rolling,deviation,ready:true,confidence,stage,maxPenalty,
  detail:`${stage[0].toUpperCase()+stage.slice(1)} (${n} logged value${n===1?'':'s'}): ${windowLabel} ${rolling.toFixed(0)} ms versus personal baseline ${baseline.toFixed(0)} ms (${deviation>=0?'+':''}${(deviation*100).toFixed(0)}%). ${capText}`};
}
function painAdjustment(pain=recoveryPainState()){
 const max=Number(pain?.max)||0;
 if(!pain?.count)return{adjustment:0,detail:'No recent pain ratings; no pain adjustment applied.'};
 if(max>=7)return{adjustment:-.10,detail:`Recent maximum pain ${max}/10 requires a major load reduction.`};
 if(max>=5)return{adjustment:-.06,detail:`Recent maximum pain ${max}/10 restricts demanding training.`};
 if(max>=3)return{adjustment:-.03,detail:`Recent maximum pain ${max}/10 limits progression and intensity.`};
 return{adjustment:0,detail:`Recent maximum pain ${max}/10 adds no load reduction.`};
}
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
 let trainingResponse=f;
 let hrv=hrvModel();
 if(!hrv.ready)add('Garmin HRV',0,hrv.detail);
 else if(hrv.factor<1)add('Garmin HRV',hrv.factor-1,`${hrv.detail} Recovery moderation is based on the rolling pattern, not one night.`);
 else add('Garmin HRV',0,`${hrv.detail} No progression penalty applied.`);
 const painAdj=painAdjustment();
 add('Pain',painAdj.adjustment,painAdj.detail);
 let rawFactor=f,boundedFactor=clamp(rawFactor,state.setup.minFactor,state.setup.maxFactor);
 return{factor:boundedFactor,rawFactor,baseFactor:1,trainingResponse,hrvFactor:hrv.factor,hrv,items,previousWeek,plannedKm:prev.planned,completedKm:prev.actual,status:'calculated'};
}
function adaptiveFactor(w){return adaptiveFactorDetails(w).factor}
function provisionalWeeklyAdjustment(w=currentWeek()){
 const current=Math.max(1,Math.min(weeks(),w)),items=[],hrv=hrvModel(),painAdj=painAdjustment();let f=1;
 const add=(name,adjustment,detail,status='available')=>{f+=adjustment;items.push({name,adjustment,detail,status})};
 add('Completed load',0,`Week ${current} is still in progress. Completion is shown but is not scored until the weekly review closes.`,'pending');
 let aerobic=state.runs.filter(r=>['Easy','Recovery','Long run'].includes(r.type)&&Number(r.durationSec)>=2700&&dte(r.date)>=new Date(weekStart(current).getTime()-28*DAY)&&dte(r.date)<=today());
 let byType={};aerobic.forEach(r=>(byType[r.type]??=[]).push(r));let effChanges=[];
 Object.values(byType).forEach(group=>{group.sort((a,b)=>a.date.localeCompare(b.date));let vals=group.map(r=>metrics(r).efficiencyJ).filter(Number.isFinite);if(vals.length>=4){let cut=Math.floor(vals.length/2),a=avg(vals.slice(0,cut)),b=avg(vals.slice(cut));if(a>0)effChanges.push((b/a-1)*100)}});
 let effChange=avg(effChanges);
 if(!Number.isFinite(effChange))add('Efficiency trend',0,'Not enough comparable same-type aerobic runs yet; provisional effect is neutral.','insufficient');
 else if(effChange<=-3)add('Efficiency trend',-.02,`Current same-type efficiency trend is ${effChange.toFixed(1)}%.`);
 else add('Efficiency trend',0,`Current same-type efficiency trend is ${effChange.toFixed(1)}%; no provisional reduction.`);
 let driftVals=aerobic.map(r=>Number(r.powerDrift)).filter(Number.isFinite),drift=driftVals.length?avg(driftVals):null;
 if(!Number.isFinite(drift))add('Cardiac drift',0,'No valid power-based drift evidence yet; provisional effect is neutral.','insufficient');
 else if(drift>7)add('Cardiac drift',-.04,`Current average power-based drift is ${drift.toFixed(1)}%.`);
 else if(drift>5)add('Cardiac drift',-.02,`Current average power-based drift is ${drift.toFixed(1)}%.`);
 else add('Cardiac drift',0,`Current average power-based drift is ${drift.toFixed(1)}%; no provisional reduction.`);
 if(!hrv.ready)add('Garmin HRV',0,hrv.detail,'insufficient');else if(hrv.factor<1)add('Garmin HRV',hrv.factor-1,hrv.detail);else add('Garmin HRV',0,`${hrv.detail} No provisional reduction.`);
 add('Pain',painAdj.adjustment,painAdj.detail);
 const rawFactor=f,factor=clamp(rawFactor,state.setup.minFactor,state.setup.maxFactor);
 return{factor,rawFactor,baseFactor:1,items,status:'provisional',week:current};
}
function athleteState(w=currentWeek()){
 const current=Math.max(1,Math.min(weeks(),w)),next=Math.min(weeks(),current+1),ev=trainingEvidence(),applied=adaptiveFactorDetails(current),nextAfd=adaptiveFactorDetails(next),preview=provisionalWeeklyAdjustment(current),pain=recoveryPainState(),hrv=hrvModel();
 const fitnessDelta=ev.index-100,fitnessTrend=fitnessDelta>.5?'Improving':fitnessDelta<-.5?'Declining':'Stable';
 const wd=weekData(current),completion=wd.planned>0?wd.actual/wd.planned:null;
 const currentWeekEnd=new Date(weekStart(current).getTime()+7*DAY),weekComplete=currentWeekEnd<=today();
 let readiness='Normal';
 if((pain.max??0)>=5||hrv.factor<=.94)readiness='Restricted';else if((pain.max??0)>=3||hrv.factor<1)readiness='Reduced';
 let tolerance=weekComplete?'Normal':'In progress';
 if(weekComplete&&Number.isFinite(completion)){if(completion<.70)tolerance='Low';else if(completion<.85)tolerance='Reduced';else if(completion<=1.05)tolerance='Normal';else tolerance='Excess load';}
 const adjustment=applied.factor,isPending=nextAfd.status==='pending',direction=adjustment<.995?'Reduce':adjustment>1.005?'Increase':'Maintain',pct=Math.round(Math.abs(adjustment-1)*100),reasons=[];
 (applied.items||[]).forEach(i=>{if(Math.abs(Number(i.adjustment)||0)>.0001)reasons.push(`${i.name.toLowerCase()} ${i.adjustment>0?'+':''}${Math.round(i.adjustment*100)}%`)});
 if(!reasons.length)reasons.push(current<=1?'baseline factor for the opening week':'all finalised inputs were neutral');
 const nextStart=weekStart(next),reviewDate=iso(new Date(nextStart.getTime()-DAY));
 return{currentWeek:current,nextWeek:next,fitnessTrend,fitnessIndex:ev.index,fitnessDelta,evidenceConfidence:ev.confidence,fitnessEvidence:ev,readiness,tolerance,completion,weekComplete,adjustment,direction,pct,reasons,applied,nextAfd,preview,isPending,pain,hrv,reviewDate,nextStart:iso(nextStart)};
}
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
 if(baseType(workout.type)==='Intervals'){
  const reps=Number(workout.repetitions),recs=Number(workout.recoveryCount);
  if(!(reps>=2))errors.push('Interval repetition count is invalid.');
  if(recs!==reps-1)errors.push('Interval recovery count must equal repetitions minus one.');
 }
 if(baseType(workout.type)==='Fitness assessment'&&Number(workout.assessmentDistance)<=0)errors.push('Assessment distance is missing.');
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
   let dp=detailedPhase(w),ph=phase(w),factor=adaptiveFactor(w),base=Math.min(state.setup.maxWeekly,state.setup.currentWeekly*Math.pow(1+state.setup.growth,w-1));
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

   let isRaceWeek=weekDates.some(x=>x.date===state.setup.raceDate),assignments=weekTypeAssignments(w,weekDates);
   let training=weekDates.filter(x=>x.cfg[1]&&x.date!==state.setup.raceDate);
   let assignedTypes=training.map(x=>assignments.get(x.date)||'Easy');
   let hasLong=assignedTypes.some(x=>['Long run','Specific long run','Race rehearsal','Progression'].includes(x));
   let qualityTypes=['Intervals','Tempo','Fitness assessment','Hills','Fartlek','Threshold','Threshold intervals','VO₂max intervals','Race-pace intervals','Marathon-specific','Half-marathon-specific'];
   let quality=training.filter(x=>qualityTypes.includes(assignments.get(x.date)));
   let aerobic=training.filter(x=>!qualityTypes.includes(assignments.get(x.date))&&!['Long run','Specific long run','Race rehearsal','Progression'].includes(assignments.get(x.date)));

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
     let type=date===state.setup.raceDate?'Race Day':(cfg[1]?(assignments.get(date)||'Easy'):'Rest');
     if(isRaceWeek&&type==='Fitness assessment')type='Easy';
     if(isRaceWeek&&['Long run','Specific long run','Race rehearsal','Progression'].includes(type))type='Easy';

     let dist=0;
     if(type==='Race Day')dist=state.setup.raceDistance;
     else if(['Long run','Specific long run','Race rehearsal','Progression'].includes(type))dist=longDistance;
     else if(qualityTypes.includes(type))dist=qualityShare;
     else if(type!=='Rest')dist=aerobicShare;

     let z=zone(type,date),id=`${date}-${type}`,detail=prescription(type,dist,w,ph,z);
     let prescribedDistance=Number.isFinite(detail.totalDistance)?detail.totalDistance:Math.round(dist*10)/10;
     let item={id,week:w,date,day:dayName,type,distance:prescribedDistance,phase:ph,detailedPhase:dp,factor,zone:z,...detail};
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
 const originalType=type,bt=baseType(type);
 if(type==='Rest')return{totalDistance:0,warmup:'—',main:'Rest day',cooldown:'—',purpose:'Absorb training and restore freshness.',coach:'Walking and light mobility are fine. Avoid turning recovery into another workout.',fuel:'Normal daily hydration.',targetScope:'No running targets'};
 if(bt==='Recovery'){
  const total=Math.max(3,km),warm=r1(Math.max(.5,Math.min(1,total*.15))),cool=r1(Math.max(.5,Math.min(1,total*.15))),main=r1(total-warm-cool);
  return result(warm,main,cool,{warmup:`${fmt(warm)} km very easy`,main:originalType==='Shakeout'?`${fmt(main)} km relaxed shakeout with 3–4 short strides only if feeling fresh`:`${fmt(main)} km relaxed recovery running`,cooldown:`${fmt(cool)} km very easy`,purpose:originalType==='Shakeout'?'Maintain rhythm and freshness close to race day.':'Promote recovery while preserving low-intensity consistency.',coach:'Keep this genuinely easy. Stop when pain changes your stride or worsens as you continue.',fuel:'Water according to thirst.',targetScope:'Entire relaxed run',whyThis:'Low-intensity running supports recovery and maintains routine with minimal fatigue.',whyAmount:'The session is deliberately short relative to the surrounding training load.',skipImpact:'This is low priority; skip it rather than compromising recovery.'});
 }
 if(originalType==='Easy + strides'){const total=Math.max(4,km),warm=r1(Math.max(.8,Math.min(1.5,total*.15))),cool=r1(Math.max(.8,Math.min(1.2,total*.12))),main=r1(total-warm-cool);return result(warm,main,cool,{warmup:`${fmt(warm)} km very easy`,main:`${fmt(main)} km easy, including 6 × 20-second relaxed strides with full easy recovery`,cooldown:`${fmt(cool)} km very easy`,purpose:'Build aerobic fitness while maintaining relaxed speed and running economy.',coach:'Strides are smooth accelerations, not sprints. Stop if form or hamstring comfort deteriorates.',fuel:'Water according to thirst.',targetScope:'Easy running; strides by relaxed feel',whyThis:'Easy running develops aerobic capacity while strides preserve neuromuscular coordination.',whyAmount:'A small stride dose adds speed economy without creating a hard session.',skipImpact:'Skip the strides when sore or fatigued; keep the easy running relaxed.'})}
 if(originalType==='Medium-long'||originalType==='Steady aerobic'){const total=Math.max(7,km),warm=r1(Math.min(1.5,Math.max(1,total*.1))),cool=r1(Math.min(1.2,Math.max(.8,total*.08))),main=r1(total-warm-cool);return result(warm,main,cool,{warmup:`${fmt(warm)} km easy`,main:`${fmt(main)} km controlled aerobic running`,cooldown:`${fmt(cool)} km very easy`,purpose:originalType==='Medium-long'?'Develop midweek aerobic durability and distribute endurance load.':'Provide a moderate aerobic stimulus below threshold.',coach:'Keep this controlled. It is more purposeful than recovery running but should not become a race effort.',fuel:total>=12?'Carry fluids and consider carbohydrate for sessions beyond 75–90 minutes.':'Water according to thirst.',targetScope:'Controlled aerobic main section',whyThis:'Sustained aerobic work improves durability without the recovery cost of threshold training.',whyAmount:'The distance supports race-specific endurance while protecting the long run.',skipImpact:'Do not add missed distance to the next quality or long session.'})}
 if(originalType==='Progression'){const total=Math.max(8,km),warm=r1(Math.min(2,Math.max(1,total*.12))),cool=r1(Math.min(1.5,Math.max(1,total*.08))),main=r1(total-warm-cool),steady=r1(Math.min(5,Math.max(2,main*.25)));return result(warm,main,cool,{warmup:`${fmt(warm)} km easy`,main:`${fmt(main-steady)} km controlled aerobic, then ${fmt(steady)} km steady`,cooldown:`${fmt(cool)} km very easy`,purpose:'Develop controlled fatigue resistance without a full race-specific long run.',coach:'Progress gradually; the final steady section remains below threshold.',fuel:'Practise normal long-run hydration and carbohydrate when duration exceeds 75–90 minutes.',targetScope:'Final steady section',whyThis:'A controlled finish develops durability while keeping most of the run aerobic.',whyAmount:'Only the final portion progresses, limiting recovery cost.',skipImpact:'Convert to an easy long run when recovery or pain is questionable.'})}
 if(originalType==='Specific long run'||originalType==='Race rehearsal'){const total=Math.max(14,km),warm=r1(Math.min(2,Math.max(1,total*.08))),cool=r1(Math.min(1.5,Math.max(1,total*.05))),main=r1(total-warm-cool),specific=r1(Math.min(originalType==='Race rehearsal'?12:8,Math.max(3,main*.28)));return result(warm,main,cool,{warmup:`${fmt(warm)} km deliberately easy`,main:`${fmt(main-specific)} km controlled aerobic plus ${fmt(specific)} km at race-specific effort in controlled blocks`,cooldown:`${fmt(cool)} km very easy`,purpose:originalType==='Race rehearsal'?'Rehearse pacing, fuelling, equipment and late-run control.':'Develop race-specific durability within a predominantly aerobic long run.',coach:'This counts as a quality session. Do not combine it with two other hard sessions in the same week.',fuel:'Practise the intended race carbohydrate, fluid and equipment strategy.',targetScope:'Race-specific blocks only',whyThis:'Specific work under fatigue prepares pacing and economy for race demands.',whyAmount:'The race-specific portion is deliberately limited so the full long run remains sustainable.',skipImpact:'Replace with an easy long run when recovery is poor; never catch up later.'})}

 if(bt==='Easy'){
  const total=Math.max(3,km),warm=r1(Math.max(.5,Math.min(1,total*.15))),cool=r1(Math.max(.5,Math.min(1,total*.15))),main=r1(total-warm-cool);
  return result(warm,main,cool,{warmup:`${fmt(warm)} km very easy to settle into relaxed running`,main:`${fmt(main)} km conversational easy running`,cooldown:`${fmt(cool)} km very easy`,purpose:'Develop aerobic capacity while keeping fatigue low.',coach:'The entire run remains easy. Pace, HR and power describe the central easy section; the opening and closing sections should feel even gentler. Slow down for heat, hills, illness or poor recovery.',fuel:total>=12?'Carry fluids; use carbohydrate if running longer than 75–90 min.':'Water according to thirst.',targetScope:'Entire easy run',whyThis:'Easy running builds aerobic capacity and supports recovery from harder sessions.',whyAmount:'The distance fills the aerobic share of the week while keeping intensity low.',skipImpact:'Missing one easy run has little effect. Do not compensate by extending a hard or long session.'});
 }
 if(bt==='Long run'){
  const total=Math.max(6,km),warm=r1(Math.min(2,Math.max(1,total*.1))),cool=r1(Math.min(1.5,Math.max(1,total*.07))),main=r1(total-warm-cool);
  let mainText=`${fmt(main)} km controlled aerobic endurance`;
  if(ph==='Peak'&&total>=22)mainText=`${fmt(main-3)} km controlled aerobic endurance, then 3.0 km at controlled marathon effort`;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km deliberately easy`,main:mainText,cooldown:`${fmt(cool)} km very easy`,purpose:'Build aerobic durability, musculoskeletal resilience and race-specific fuelling skill.',coach:`The displayed ${fmt(total)} km is the complete long run. The opening, main section and final easy running are all included. Keep effort controlled; a marathon-effort finish is prescribed only where explicitly stated.`,fuel:'Practise 60–90 g carbohydrate/hour and approximately 400–800 ml fluid/hour, adjusted for conditions.',targetScope:ph==='Peak'&&total>=22?'Controlled endurance; marathon target only for final 3 km':'Controlled endurance section',whyThis:'The long run is the main endurance stimulus and develops durability, fuelling skill and fatigue resistance.',whyAmount:`${fmt(total)} km follows the planned long-run progression and current weekly-volume limit.`,skipImpact:'Missing a long run matters more than missing an easy run, but it should not be squeezed into the next few days. Resume safely and let the plan rebuild progression.'});
 }
 if(bt==='Intervals'){
  let rep=ph==='Build'||ph==='Peak'?.8:.4, rec=rep===.8?.4:.2;if(originalType==='Hills'||originalType==='Fartlek'){rep=.4;rec=.2}if(originalType==='Race-pace intervals'&&raceProfile().key==='10k'){rep=1;rec=.4}if(originalType==='VO₂max intervals'){rep=.8;rec=.4}
  let minReps=rep===.8?4:5,maxReps=rep===.8?6:8;
  let suggested=Math.round((Math.max(km,5)-3.5+rec)/(rep+rec));
  let reps=clamp(suggested,minReps,maxReps);
  if(ph==='Taper'){rep=.4;rec=.2;reps=4;}
  const warm=2.0,cool=1.5,fast=r1(reps*rep),recoveries=Math.max(0,reps-1),recoveryTotal=r1(recoveries*rec),main=r1(fast+recoveryTotal);
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy, with drills and 3–4 strides within the final 0.5 km`,main:`${reps} × ${Math.round(rep*1000)} m fast (${fmt(fast)} km) with ${recoveries} × ${Math.round(rec*1000)} m easy-jog recovery (${fmt(recoveryTotal)} km) between repetitions; main set ${fmt(main)} km total`,cooldown:`${fmt(cool)} km very easy`,purpose:rep>=.8?'Improve aerobic power and the ability to sustain strong repeatable efforts.':'Improve VO₂max, leg speed and running economy with controlled repeatable efforts.',coach:'Pace, HR and power targets apply only to the fast repetitions. Each recovery is completed between repetitions; there is no recovery after the final repetition. The total session distance is derived from the prescribed warm-up, repetitions, recoveries and cooldown.',fuel:'Arrive hydrated; carbohydrate is useful when the total session exceeds 60 minutes.',targetScope:'Fast repetitions only',repetitions:reps,recoveryCount:recoveries,fastDistance:fast,recoveryDistance:recoveryTotal,accounting:[{label:'Warm-up',km:warm},{label:'Fast running',km:fast},{label:'Recoveries',km:recoveryTotal},{label:'Cooldown',km:cool}],whyThis:'This session develops aerobic power and running economy through repeatable high-quality efforts.',whyAmount:`${reps} repetitions provide a meaningful stimulus while keeping the hard volume appropriate for the current phase.`,skipImpact:'Missing one interval session has limited effect. Do not add it to another day; resume the plan and protect the next long run.'});
 }
 if(bt==='Tempo'){
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
 if(bt==='Fitness assessment'){
  const test=Math.max(1,r1(Number(state.setup.testDistance)||5)),warm=2.0,cool=1.5,main=test;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy, with drills and 3–4 strides within the final 0.5 km`,main:`${fmt(test)} km evenly paced maximal assessment`,cooldown:`${fmt(cool)} km very easy`,purpose:'Create a repeatable benchmark that can update future training targets.',coach:'The assessment distance is the hard test itself, not the complete outing. Pace, HR and power targets apply to the assessment only; the displayed total includes warm-up and cooldown.',fuel:'Use a normal pre-run meal and avoid starting depleted.',targetScope:'Assessment effort only',assessmentDistance:test,accounting:[{label:'Warm-up',km:warm},{label:'Assessment',km:test},{label:'Cooldown',km:cool}],whyThis:'A repeatable benchmark updates training zones and race prediction using completed evidence.',whyAmount:`The ${fmt(test)} km test is long enough to measure current fitness while remaining repeatable.`,skipImpact:'Postpone the assessment when ill, injured or poorly recovered; normal training can continue without compensating.'});
 }
 if(bt==='Marathon'){
  const warm=2.0,cool=1.5,quality=Math.max(3,r1(Math.max(km,7)-warm-cool)),main=quality;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy`,main:`${fmt(quality)} km at controlled marathon effort`,cooldown:`${fmt(cool)} km very easy`,purpose:'Develop race-specific pace control, economy and durability.',coach:'Pace, HR and power targets apply only to the marathon-effort block. The displayed total is derived from all three sections.',fuel:'Practise the carbohydrate and fluid routine intended for race day.',targetScope:'Marathon-effort section',whyThis:'Marathon-effort running develops race-specific economy and pacing control.',whyAmount:`${fmt(quality)} km provides specific work without turning the whole session into a race effort.`,skipImpact:'Do not move this session next to another hard workout. Resume the plan and preserve the next long run.'});
 }
 return{totalDistance:km,warmup:'Pre-race mobility and easy jogging as needed (outside the official race distance)',main:`${fmt(km)} km race`,cooldown:'Walk and begin recovery nutrition after finishing (outside the official race distance)',purpose:'Execute the race plan.',coach:'The displayed distance is the official race distance. Pace, HR and power refer to the race itself; pre-race warm-up and post-race walking are additional.',fuel:'60–90 g carbohydrate/hour and 400–800 ml fluid/hour.',targetScope:'Race effort'};
}
if(state.schemaVersion!==SCHEMA){state.plan=[];buildPlan()}else if(!state.plan?.length)buildPlan();
state.runs.forEach(r=>{if(r.planId&&!state.plan.some(p=>p.id===r.planId)){delete r.planId;delete r.plannedDate;delete r.dayOffset;r.matchStatus='adHoc';r.matchMethod='schema-remap'}if(r.planId){r.matchStatus='matched';r.matchMethod=r.matchMethod||'legacy';let p=state.plan.find(x=>x.id===r.planId);if(p){r.plannedDate=p.date;r.dayOffset=Math.round((dte(r.date)-dte(p.date))/DAY)}}else if(!r.matchStatus)r.matchStatus='adHoc'});save();
reconcileExactDateMatches();
function compatibleRunType(planType,runType){
 const groups={
  'Long run':['Long run','Specific long run','Race rehearsal','Progression'],'Specific long run':['Long run','Specific long run','Race rehearsal'],'Race rehearsal':['Long run','Specific long run','Race rehearsal'],'Progression':['Long run','Easy','Steady aerobic','Medium-long'],
  'Tempo':['Tempo','Marathon','Threshold','Threshold intervals','Half-marathon-specific'],'Threshold':['Tempo','Threshold','Threshold intervals'],'Threshold intervals':['Tempo','Threshold','Threshold intervals'],'Half-marathon-specific':['Tempo','Half-marathon-specific','Race'],'Marathon-specific':['Marathon','Tempo','Marathon-specific'],
  'Intervals':['Intervals','Fitness assessment','Hills','Fartlek','VO₂max intervals','Race-pace intervals'],'Hills':['Intervals','Hills','Fartlek'],'Fartlek':['Intervals','Fartlek','Hills'],'VO₂max intervals':['Intervals','VO₂max intervals'],'Race-pace intervals':['Intervals','Race-pace intervals','Race'],
  'Fitness assessment':['Fitness assessment','Race'],'Easy':['Easy','Recovery','Easy + strides','Shakeout'],'Easy + strides':['Easy','Recovery','Easy + strides'],'Steady aerobic':['Easy','Steady aerobic','Medium-long'],'Medium-long':['Easy','Steady aerobic','Medium-long'],'Recovery':['Recovery','Easy','Shakeout'],'Shakeout':['Recovery','Easy','Shakeout'],'Marathon':['Marathon','Tempo','Marathon-specific'],'Race Day':['Race']
 };
 return (groups[planType]||[planType]).includes(runType);
}
function matchingRun(p,runs=state.runs){
 const linked=runs.find(r=>r.planId===p.id);if(linked)return linked;
 // Fallback for imported runs saved before automatic exact-date matching was added.
 // Only use a unique same-day candidate, so an unrelated run is never silently counted.
 const candidates=runs.filter(r=>r.date===p.date&&!r.planId&&r.matchStatus!=='unresolved');
 const compatible=candidates.filter(r=>compatibleRunType(p.type,r.type));
 const pool=compatible.length===1?compatible:(candidates.length===1?candidates:[]);
 if(pool.length!==1)return null;
 const r=pool[0],planned=Math.max(.1,Number(p.distance)||0),actual=Math.max(.1,Number(r.distanceKm)||0);
 return Math.abs(actual-planned)/planned<=.35?r:null;
}
function reconcileExactDateMatches(){
 let changed=false;
 state.runs.forEach(run=>{
  if(run.planId||run.matchStatus==='unresolved')return;
  const candidates=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&p.date===run.date&&!state.runs.some(r=>r.id!==run.id&&r.planId===p.id));
  if(!candidates.length)return;
  candidates.sort((a,b)=>{
   const ac=compatibleRunType(a.type,run.type)?0:1,bc=compatibleRunType(b.type,run.type)?0:1;
   const ad=Math.abs((Number(run.distanceKm)||0)-(Number(a.distance)||0))/Math.max(1,Number(a.distance)||1);
   const bd=Math.abs((Number(run.distanceKm)||0)-(Number(b.distance)||0))/Math.max(1,Number(b.distance)||1);
   return ac-bc||ad-bd;
  });
  const best=candidates[0],distanceGap=Math.abs((Number(run.distanceKm)||0)-(Number(best.distance)||0))/Math.max(1,Number(best.distance)||1);
  if((compatibleRunType(best.type,run.type)&&distanceGap<=.45)||distanceGap<=.20){applyRunMatch(run,best.id,'auto-exact-date');changed=true}
 });
 if(changed)save();
 return changed;
}
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
  let ad=Math.abs(dte(a.date)-dte(run.date)),bd=Math.abs(dte(b.date)-dte(run.date));
  let as=ad===0?0:1,bs=bd===0?0:1;
  let ac=compatibleRunType(a.type,run.type)?0:1,bc=compatibleRunType(b.type,run.type)?0:1;
  let ag=Math.abs((Number(a.distance)||0)-(Number(run.distanceKm)||0))/Math.max(1,Number(a.distance)||1);
  let bg=Math.abs((Number(b.distance)||0)-(Number(run.distanceKm)||0))/Math.max(1,Number(b.distance)||1);
  return as-bs||ac-bc||ad-bd||ag-bg;
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
 let endurance=clamp(completedLongest/Math.max(1,state.setup.peakLong)*100,0,100);
 let recentWeekVolumes=[];for(let w=Math.max(1,currentWeek()-3);w<=currentWeek();w++)recentWeekVolumes.push(weekData(w).actual);
 let bestRecentWeek=recentWeekVolumes.length?Math.max(0,...recentWeekVolumes):0;
 let volumeProgression=clamp(bestRecentWeek/Math.max(1,state.setup.maxWeekly)*100,0,100);
 let matchedRuns=due.map(p=>({p,r:matchingRun(p,recent)})).filter(x=>x.r),matched=matchedRuns.length,opportunities=due.length;
 let executionEvidence=opportunities>0;
 let consistency=executionEvidence?clamp(matched/opportunities*100,0,100):null;
 let adherence=executionEvidence&&plannedKm>0?clamp(actual/plannedKm*100,0,100):null;
 let scheduleAdherence=matchedRuns.length?avg(matchedRuns.map(x=>matchTimingCredit(x.r,x.p))):null;
 let painValues=state.runs.filter(r=>dte(r.date)>=new Date(today().getTime()-28*DAY)&&dte(r.date)<=today()&&r.pain!==null&&r.pain!==undefined&&r.pain!=='').map(r=>Number(r.pain)).filter(Number.isFinite);
 let hrvState=hrvModel();
 let recoveryScore=hrvState.ready?clamp(100+(hrvState.deviation||0)*100,0,100):null;
 let painScore=painValues.length?clamp((10-avg(painValues))/10*100,0,100):null;
 let typeTrends=[];
 ['Easy','Recovery','Long run'].forEach(type=>{
   let vals=recent.filter(r=>r.type===type&&r.durationSec>=1800).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>metrics(r).efficiencyJ).filter(Number.isFinite);
   if(vals.length>=4){let cut=Math.floor(vals.length/2),early=avg(vals.slice(0,cut)),late=avg(vals.slice(cut));if(early>0)typeTrends.push((late/early-1)*100)}
 });
 let effTrend=avg(typeTrends),effTrendScore=Number.isFinite(effTrend)?clamp(70+effTrend*5,0,100):null;
 let driftRecent=recent.filter(r=>['Easy','Recovery','Long run'].includes(r.type)).map(r=>Number(r.powerDrift)).filter(Number.isFinite);
 let driftAvg=driftRecent.length?avg(driftRecent):null;
 let driftScore=Number.isFinite(driftAvg)?clamp(100-(Math.max(0,driftAvg-2)/8)*100,0,100):null;
 let efficiency=(Number.isFinite(effTrendScore)||Number.isFinite(driftScore))?((Number.isFinite(effTrendScore)?effTrendScore:0)*.60+(Number.isFinite(driftScore)?driftScore:0)*.40):null;
 let buildModel=buildRequirementEstimate(state.setup),requiredBuildWeeks=buildModel.requiredBuildWeeks;
 let preparationTime=daysRemaining<=0?0:clamp((usableBuildWeeks/Math.max(1,requiredBuildWeeks))*100,0,100);
 let enabledTrainingDays=state.days.filter(d=>d[1]).length;
 let opportunityModel=trainingOpportunityModel(state.setup,enabledTrainingDays,phase(currentWeek()));
 let trainingOpportunity=opportunityModel.opportunityScore;
 let dueLongs=state.plan.filter(p=>p.type==='Long run'&&hasElapsedOrCompleted(p)&&today()-dte(p.date)<=84*DAY);
 let completedLongs=dueLongs.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)});
 let longRunExecution=dueLongs.length?clamp(completedLongs.length/dueLongs.length*100,0,100):null;
 let specificDue=state.plan.filter(p=>['Tempo','Intervals','Fitness assessment'].includes(p.type)&&hasElapsedOrCompleted(p)&&today()-dte(p.date)<=56*DAY);
 let specificDone=specificDue.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)}).length;
 let specificity=specificDue.length?clamp(specificDone/specificDue.length*100,0,100):null;
 const weighted=(items)=>{
  let enriched=items.map(x=>{let evidenceFraction=Number.isFinite(x.evidenceFraction)?clamp(x.evidenceFraction,0,1):(typeof x.hasEvidence==='boolean'?(x.hasEvidence?1:0):(Number.isFinite(x.score)?1:0));return{...x,hasEvidence:evidenceFraction>0,evidenceFraction,displayScore:evidenceFraction>0&&Number.isFinite(x.score)?x.score:null}});
  let totalWeight=sum(enriched.map(x=>x.weight)),availableWeight=sum(enriched.map(x=>x.weight*x.evidenceFraction));
  let measured=sum(enriched.filter(x=>x.hasEvidence&&Number.isFinite(x.displayScore)).map(x=>x.displayScore*x.weight*x.evidenceFraction));
  let coverage=totalWeight?availableWeight/totalWeight:0;
  let rawScore=availableWeight?measured/availableWeight:null;
  // No evidence is displayed as not scored. Internally, uncertainty is handled by
  // evidence coverage rather than inventing a visible neutral score.
  let score=Number.isFinite(rawScore)?50+(rawScore-50)*coverage:null;
  return{score:Number.isFinite(score)?clamp(score,0,100):null,rawScore,coverage,items:enriched};
 };
 let physiological=weighted([{name:'Fitness',score:fitness,weight:.55,hasEvidence:Number.isFinite(testTime)&&testTime>0&&testDist>0},{name:'Endurance',score:endurance,weight:.30,hasEvidence:state.runs.some(r=>(Number(r.distanceKm)||0)>0)},{name:'Efficiency',score:efficiency,weight:.15,evidenceFraction:(Number.isFinite(effTrendScore)?.60:0)+(Number.isFinite(driftScore)?.40:0)}]);
 let marathonPreparation=weighted([{name:'Long-run execution',score:longRunExecution,weight:.45,hasEvidence:dueLongs.length>0},{name:'Volume progression',score:volumeProgression,weight:.30,hasEvidence:state.runs.some(r=>(Number(r.distanceKm)||0)>0)},{name:'Specificity',score:specificity,weight:.25,hasEvidence:specificDue.length>0}]);
 let planExecution=weighted([{name:'Adherence',score:adherence,weight:.45,hasEvidence:executionEvidence},{name:'Consistency',score:consistency,weight:.35,hasEvidence:executionEvidence},{name:'Schedule adherence',score:scheduleAdherence,weight:.20,hasEvidence:matchedRuns.length>0}]);
 let recoveryHealth=weighted([{name:'Garmin HRV trend',score:recoveryScore,weight:.60,hasEvidence:hrvState.ready},{name:'Pain status',score:painScore,weight:.40,hasEvidence:painValues.length>0}]);
 let performancePillar={name:'Physiological fitness',weight:1,color:'#2d82c7',description:'Demonstrated capability used to centre the marathon-time prediction.',...physiological};
 let pillars=[
  {name:'Marathon preparation',weight:.50,color:'#e49b35',description:'How much marathon-specific evidence supports sustaining the predicted pace for 42.2 km.',...marathonPreparation},
  {name:'Plan execution',weight:.30,color:'#159487',description:'How reliably completed volume, sessions and timing match the programme.',...planExecution},
  {name:'HRV & health',weight:.20,color:'#7457c8',description:'Whether the recent Garmin HRV pattern and pain evidence support absorbing training.',...recoveryHealth}
 ];
 let scoredPillars=pillars.filter(p=>Number.isFinite(p.score));
 let overall=scoredPillars.length?clamp(sum(scoredPillars.map(p=>p.score*p.weight))/sum(scoredPillars.map(p=>p.weight)),0,100):null;
 let evidenceCoverage=sum(pillars.map(p=>p.weight*p.coverage));
 let measuredPillars=pillars.map(p=>{let available=p.items.filter(i=>i.hasEvidence),aw=sum(available.map(i=>i.weight));return{weight:p.weight*p.coverage,score:aw?sum(available.map(i=>i.displayScore*i.weight))/aw:null}}).filter(p=>Number.isFinite(p.score)&&p.weight>0);
 let measuredOverall=measuredPillars.length?sum(measuredPillars.map(p=>p.score*p.weight))/sum(measuredPillars.map(p=>p.weight)):null;
 let components=pillars.flatMap(p=>p.items.map(i=>({...i,pillar:p.name,pillarColor:p.color})));
 const expectedWholeRunPace=p=>{
   const easyPace=Number(zone('Easy',p.date)?.pace)||Number(p.zone?.pace)||360;
   const mainPace=Number(p.zone?.pace)||easyPace;
   const warm=Number(p.warmDistance)||0,cool=Number(p.coolDistance)||0,total=Math.max(.1,Number(p.distance)||0);
   const main=Math.max(0,total-warm-cool);
   return (warm+cool+main)>0?((warm+cool)*easyPace+main*mainPace)/(warm+cool+main):mainPace;
 };
 const paceScoreFor=(p,r)=>{
   const actual=Number(r?.durationSec)/Math.max(.1,Number(r?.distanceKm));
   const expected=expectedWholeRunPace(p);
   if(!Number.isFinite(actual)||!Number.isFinite(expected)||expected<=0)return null;
   const deviation=Math.abs(actual-expected)/expected;
   return clamp(100-(Math.max(0,deviation-.05)/.15)*100,0,100);
 };
 const executionCategories=[
  {key:'all',label:'All scheduled runs',types:null},
  {key:'distance',label:'Distance completed',types:null,distance:true},
  {key:'paceAll',label:'Pace adherence',types:null,pace:true},
  {key:'easy',label:'Easy / recovery',types:['Easy','Recovery']},
  {key:'quality',label:'Tempo / intervals',types:['Tempo','Intervals','Fitness assessment']},
  {key:'long',label:'Long runs',types:['Long run']}
 ].map(cat=>{
   const planned=due.filter(p=>!cat.types||cat.types.includes(p.type));
   const matchedPairs=planned.map(p=>({p,r:matchingRun(p,recent)})).filter(x=>Boolean(x.r));
   const completed=matchedPairs.map(x=>x.p);
   const plannedDistance=sum(planned.map(p=>p.distance));
   const completedDistance=sum(matchedPairs.map(x=>Number(x.r?.distanceKm)||0));
   const paceScores=cat.pace?matchedPairs.map(x=>paceScoreFor(x.p,x.r)).filter(Number.isFinite):[];
   const score=cat.pace?(paceScores.length?avg(paceScores):null):cat.distance?(plannedDistance>0?Math.max(0,completedDistance/plannedDistance*100):null):(planned.length?Math.max(0,completed.length/planned.length*100):null);
   return{...cat,plannedCount:planned.length,completedCount:completed.length,plannedDistance,completedDistance,paceCount:paceScores.length,score,barScore:Number.isFinite(score)?clamp(score,0,100):null};
 });
 return{pillars,performancePillar,components,overall,evidenceCoverage,riegel,plannedKm,actual,completedLongest,matched,opportunities,weeksRemaining,usableBuildWeeks,requiredBuildWeeks,buildRequirements:buildModel.components,preparationTime,trainingOpportunity,enabledTrainingDays,recommendedTrainingDays:opportunityModel.idealDays,minimumTrainingDays:opportunityModel.minimumEffectiveDays,opportunityModel,effTrend,driftAvg,measuredOverall,executionCategories};
}
function initialProgrammePrediction(setup=state.setup){
 const testTime=Number(setup.testTime),testDist=Math.max(.1,Number(setup.testDistance)),raceDist=Math.max(.1,Number(setup.raceDistance));
 if(!(testTime>0&&testDist>0&&raceDist>0))return null;
 const longRatio=clamp((Number(setup.currentLongest)||0)/Math.max(1,Number(setup.peakLong)||1),0,1);
 const volumeRatio=clamp((Number(setup.currentWeekly)||0)/Math.max(1,Number(setup.maxWeekly)||1),0,1);
 const initialDurability=clamp(longRatio*.55+volumeRatio*.45,0,1);
 const extrapolation=clamp(Math.log(Math.max(1,raceDist/testDist))/Math.log(42.195/5),0,1);
 const exponent=1.06+.055*(1-initialDurability)*extrapolation;
 return testTime*Math.pow(raceDist/testDist,exponent);
}
function rawPrediction(){
 // Raw model signal. This is not applied in full after every activity because
 // ordinary training runs provide much weaker fitness evidence than assessments.
 const c=confidence();
 const latest=state.assessments.filter(a=>a.valid).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const testTime=latest?latest.time:state.setup.testTime,testDist=Math.max(.1,latest?latest.distance:state.setup.testDistance);
 const prep=c.pillars.find(p=>p.name==='Marathon preparation');
 const prepEvidence=prep?.coverage||0,prepScore=Number.isFinite(prep?.score)?prep.score:0;
 const durability=clamp((prepScore/100)*prepEvidence,0,1);
 const extrapolation=clamp(Math.log(Math.max(1,state.setup.raceDistance/testDist))/Math.log(42.195/5),0,1);
 const exponent=1.06+.055*(1-durability)*extrapolation;
 return testTime*Math.pow(state.setup.raceDistance/testDist,exponent);
}
function prediction(){
 const history=(state.predictionHistory||[]).filter(x=>Number.isFinite(Number(x.seconds))).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.updatedAt||'').localeCompare(b.updatedAt||''));
 const saved=history.at(-1);
 return saved?Number(saved.seconds):(Number(state.programStartPrediction)||initialProgrammePrediction(state.setup)||rawPrediction());
}
function predictionEvidencePolicy(source,entityId){
 const run=(state.runs||[]).find(r=>r.id===entityId);
 const assessment=(state.assessments||[]).find(a=>a.id===entityId);
 const type=assessment?'Fitness assessment':(run?.type||source||'Training update');
 const policies={
  'Recovery':{weight:.04,cap:12,benefit:3,quality:'Low',reason:'Recovery running earns a small non-negative training benefit; it does not reduce established capability.'},
  'Easy':{weight:.06,cap:20,benefit:8,quality:'Low',reason:'Easy running builds aerobic fitness and consistency. A completed easy run maintains or slightly improves the estimate; it does not make it slower.'},
  'Long run':{weight:.28,cap:120,benefit:25,quality:'Medium',reason:'Long runs build marathon durability. Appropriate completion earns a meaningful non-negative benefit.'},
  'Tempo':{weight:.18,cap:75,benefit:15,quality:'Medium',reason:'Tempo running builds sustained aerobic capability. Appropriate completion maintains or improves the estimate.'},
  'Intervals':{weight:.20,cap:75,benefit:18,quality:'Medium',reason:'Intervals build speed and aerobic power. Appropriate completion maintains or improves the estimate.'},
  'Fitness assessment':{weight:.70,cap:480,benefit:0,quality:'High',reason:'A valid assessment directly measures current performance and may move the capability estimate faster or slower.'},
  'Race':{weight:.90,cap:900,benefit:0,quality:'Very high',reason:'A race result is high-quality direct performance evidence and may move the capability estimate in either direction.'}
 };
 return{type,run,assessment,...(policies[type]||{weight:.08,cap:30,benefit:5,quality:'Low',reason:'Completed training earns a small non-negative benefit; weak evidence affects confidence before capability.'})};
}
function trainingUpdateAssessment(policy){
 const run=policy.run;
 if(!run)return{successful:true,completionRatio:1,benefit:policy.benefit||0,status:'Completed training'};
 const planned=run.planId?(state.plan||[]).find(p=>p.id===run.planId):null;
 const actualDuration=Number(run.durationSec)||0;
 const actualDistance=Number(run.distanceKm)||0;
 let plannedDuration=0;
 if(planned){
  const paceSec=Number(planned.zone?.pace)||0;
  plannedDuration=paceSec>0?(Number(planned.distance)||0)*paceSec:0;
 }
 const durationRatio=plannedDuration>0&&actualDuration>0?actualDuration/plannedDuration:null;
 const distanceRatio=planned&&Number(planned.distance)>0&&actualDistance>0?actualDistance/Number(planned.distance):null;
 const completionRatio=Number.isFinite(durationRatio)?durationRatio:(Number.isFinite(distanceRatio)?distanceRatio:1);
 const pain=run.pain===null||run.pain===undefined?null:Number(run.pain);
 const unsafe=Number.isFinite(pain)&&pain>=5;
 const substantiallyShort=completionRatio<.70;
 const successful=!unsafe&&!substantiallyShort;
 const cappedRatio=clamp(completionRatio,.50,1.15);
 const benefit=successful?(policy.benefit||0)*cappedRatio:0;
 const status=unsafe?'Maintained: pain signal prevents a fitness reward':substantiallyShort?'Maintained: partial session provides insufficient evidence for a fitness gain':completionRatio>1.15?'Improved: planned stimulus completed; extra duration is capped to avoid rewarding unnecessary load':'Improved: planned training stimulus completed';
 return{successful,completionRatio,benefit,status,plannedDuration,actualDuration,pain};
}
function scoreStatus(score,hasEvidence=true){if(!hasEvidence||!Number.isFinite(score))return'noEvidence';if(score>=80)return'good';if(score>=60)return'watch';return'action'}
function reconcilePredictionHistory(){
 const history=Array.isArray(state.predictionHistory)?state.predictionHistory:[];
 const invalid=history.some(x=>Number(x.predictionModelVersion)!==2||!Number.isFinite(Number(x.updateDelta)));
 if(!invalid)return false;
 state.predictionHistory=[];
 const events=[];
 (state.runs||[]).filter(r=>r&&r.id&&r.date&&r.source!=='assessment').forEach(r=>events.push({date:r.date,source:r.source==='stryd'?'Stryd import':'Run update',entityId:r.id,order:r.updatedAt||r.date}));
 (state.assessments||[]).filter(a=>a&&a.valid&&a.id&&a.date).forEach(a=>events.push({date:a.date,source:'Fitness assessment',entityId:a.id,order:a.updatedAt||a.date}));
 events.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.order).localeCompare(String(b.order)));
 events.forEach(e=>recordPredictionSnapshot(e.date,e.source,e.entityId));
 return true;
}
function recordPredictionSnapshot(date=iso(today()),source='Training update',entityId=null){
 const raw=rawPrediction();if(!Number.isFinite(raw))return;
 state.predictionHistory=Array.isArray(state.predictionHistory)?state.predictionHistory:[];
 let existing=entityId?state.predictionHistory.find(x=>x.entityId===entityId):state.predictionHistory.find(x=>x.date===date&&x.source===source&&!x.entityId);
 if(entityId&&!existing){const sameDateLegacy=state.predictionHistory.filter(x=>!x.entityId&&x.date===date);if(sameDateLegacy.length===1)existing=sameDateLegacy[0];}
 const other=state.predictionHistory.filter(x=>x!==existing&&Number.isFinite(Number(x.seconds))).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.updatedAt||'').localeCompare(b.updatedAt||''));
 const previous=other.at(-1)?.seconds??Number(state.programStartPrediction)??initialProgrammePrediction(state.setup)??raw;
 const policy=predictionEvidencePolicy(source,entityId);
 let applied=0,updateMode='maintained',trainingAssessment=null;
 if(policy.assessment||policy.type==='Race'){
  const requested=(raw-Number(previous))*policy.weight;
  applied=clamp(requested,-policy.cap,policy.cap);
  updateMode=applied<-.5?'improved':applied>.5?'slower':'maintained';
 }else{
  trainingAssessment=trainingUpdateAssessment(policy);
  const modelImprovement=Math.max(0,Number(previous)-raw)*policy.weight;
  const earnedBenefit=Math.max(0,trainingAssessment.benefit||0);
  applied=-Math.min(policy.cap,earnedBenefit+modelImprovement);
  updateMode=applied<-.5?'improved':'maintained';
 }
 const seconds=Number(previous)+applied;
 const reason=trainingAssessment?`${policy.reason} ${trainingAssessment.status}.`:policy.reason;
 const metadata={rawSeconds:raw,previousSeconds:Number(previous),updateDelta:applied,evidenceWeight:policy.weight,evidenceQuality:policy.quality,evidenceType:policy.type,evidenceReason:reason,maxChange:policy.cap,predictionModelVersion:2,updateMode,completionRatio:trainingAssessment?.completionRatio??null,earnedBenefit:trainingAssessment?.benefit??null};
 if(existing){Object.assign(existing,{date,seconds,source,entityId:entityId||existing.entityId,updatedAt:new Date().toISOString(),...metadata})}
 else state.predictionHistory.push({id:'pred-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),date,seconds,source,entityId,updatedAt:new Date().toISOString(),...metadata});
 const seen=new Set();state.predictionHistory=state.predictionHistory.sort((a,b)=>(a.updatedAt||'').localeCompare(b.updatedAt||'')).filter(x=>{let k=x.entityId?'e:'+x.entityId:`l:${x.date}|${x.source}`;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.updatedAt||'').localeCompare(b.updatedAt||'')).slice(-60);
}
const interpretations={
 'Fitness':s=>s>=85?'Recent assessment performance strongly supports the target.':s>=65?'Performance is credible but not yet comfortably above the target requirement.':'Current assessment evidence does not support the target.',
 'Endurance':s=>s>=85?'Longest-run evidence is close to the planned peak.':s>=65?'Endurance is progressing but key long runs remain.':'Long-run preparation is still limited.',
 'Efficiency':s=>s==null?'Comparable same-type runs with power and heart rate are required.':s>=75?'Efficiency and durability evidence is stable or improving.':'Efficiency or durability evidence needs improvement.',
 'Adherence':s=>s==null?'No planned distance is due yet.':s>=85?'Completed distance closely matches due distance.':'There is a meaningful completed-volume gap.',
 'Consistency':s=>s==null?'No scheduled sessions are due yet.':s>=80?'Scheduled training frequency is reliable.':'Recent session completion is inconsistent.',
 'Schedule adherence':s=>s==null?'No plan-linked completed sessions are available yet.':s>=85?'Completed sessions are usually close to their planned dates.':'Completed sessions are often shifted away from their planned dates.',
 'Volume progression':s=>s==null?'Log completed runs to establish weekly-volume evidence.':s>=80?'Recent weekly volume is close to the planned peak.':'Weekly volume progression remains incomplete.',
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
 'Schedule adherence':'Complete sessions near their planned dates; do not stack displaced workouts to catch up.',
 'Volume progression':'Build weekly volume gradually within the programmed progression limits.',
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
 'Consistency':'Score = completed due sessions ÷ all due sessions over the recent window × 100.',
 'Schedule adherence':'Average timing credit for plan-linked completed sessions: full credit on the planned day, with progressively less credit as the session moves further away.',
 'Volume progression':'Score = best completed weekly distance during the latest four training weeks ÷ planned peak weekly distance × 100, limited to 0–100.',
 'Long-run execution':'Score = completed due long runs ÷ due long runs during the last 84 days × 100.',
 'Garmin HRV trend':'Uses Garmin overnight HRV from the first logged value. Influence is staged from provisional to established as more values accumulate, with a slowly moving personal baseline.',
 'Pain status':'Score = (10 − average logged pain rating) ÷ 10 × 100, so lower pain scores higher.',
 'Garmin HRV trend':'Starts on day 1. One value is provisional with no penalty; 2–3 values can moderate by at most 1%, 4–6 by 3%, 7–20 by 6%, and 21+ by 10%.',
 'Preparation time':'Score compares usable build weeks before taper with estimated weeks needed to reach weekly-volume and peak-long-run targets safely.',
 'Training opportunity':'Base opportunity = (enabled days ÷ minimum effective days)^1.6, capped at 100%. Its consequence is scaled by race distance (5/8/12/18 points), phase (Base 0.7, Build 1.0, Peak 1.3, Taper 0.3) and peak-week ambition (0.6–1.5).',
 'Specificity':'Score = completed due tempo, interval and fitness-assessment sessions ÷ all such due sessions during the last 56 days × 100.'
};

function assessmentText(c){let weak=[...c.components].sort((a,b)=>a.score-b.score)[0];if(c.overall>=85)return'Your current fitness, endurance and training execution strongly support the goal. Preserve consistency and avoid adding unnecessary fatigue.';if(c.overall>=70)return`The goal is realistic, but readiness still depends on completing the remaining key sessions and maintaining recovery. The weakest component is ${weak.name}.`;if(c.overall>=55)return`Some indicators support the goal, but overall readiness is not yet secure. The largest current limiter is ${weak.name}. Focus there before making the target more aggressive.`;return'The available training evidence does not yet support the target with readiness. Rebuild the weakest foundations, log completed sessions consistently and use the next assessment to review the goal.'}
function kpi(l,v,s=''){return`<div class="kpi"><label>${esc(l)}</label><strong>${esc(v)}</strong><small>${esc(s)}</small></div>`}
function factorKpi(afd){
 const change=Math.round((afd.factor-1)*100),direction=change<0?'Reduce':change>0?'Increase':'Maintain';
 const when=afd.status==='calculated'?`Applies to future plan load after the weekly review`:'Current plan baseline';
 return`<div class="kpi factorKpi factorSummaryOnly"><label>Weekly plan adjustment</label><strong>${afd.factor.toFixed(2)} · ${direction}${change?` ${Math.abs(change)}%`:''}</strong><small>${when} · full calculation on Plan</small></div>`
}
function coachLabel(name,score){
 const labels={
  'Fitness':score>=85?'Current fitness supports the race target':'Fitness evidence needs strengthening',
  'Preparation time':score>=80?'The preparation timeline is sufficient':'The preparation timeline is tight',
  'Training opportunity':score>=95?'Weekly training frequency supports the goal':'Training frequency limits the preparation plan',
  'Endurance':score>=75?'Long-run endurance is progressing well':'Long-run endurance remains a limiter',
  'Adherence':score>=80?'Training volume is being completed reliably':'Completed volume is below plan',
  'Consistency':score>=80?'Weekly training frequency is consistent':'Session consistency needs attention',
  'Schedule adherence':score>=85?'Planned sessions are usually completed close to schedule':'Workout timing is frequently shifted',
  'Volume progression':score>=80?'Weekly volume is approaching the planned peak':'Weekly volume progression remains incomplete',
  'Long-run execution':score>=80?'Key long runs are being completed':'Long-run execution needs attention',
  'Recovery':score>=75?'Recovery supports normal training':'Recovery evidence suggests caution',
  'Pain status':score>=80?'Pain evidence is reassuring':'Pain requires closer monitoring',
  'Specificity':score>=80?'Specific sessions are on track':'Race-specific work is incomplete',
  'Efficiency':score>=75?'Aerobic efficiency is improving':'Aerobic efficiency needs more evidence'
 };
 return labels[name]||`${name}: ${Math.round(score)}`;
}

function uniqueComponents(components){let seen=new Set();return components.filter(x=>{if(seen.has(x.name))return false;seen.add(x.name);return true})}

function normalCdf(z){
 const sign=z<0?-1:1,x=Math.abs(z)/Math.sqrt(2),t=1/(1+.3275911*x);
 const erf=1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-x*x);
 return .5*(1+sign*erf);
}
function probabilityLabel(probability){return probability>=80?'Very likely':probability>=60?'Good chance':probability>=40?'Possible':'Unlikely'}
function predictionUncertainty(c,pred,confidenceScore,projected=false){
 const latest=state.assessments.filter(a=>a.valid).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const testDistance=Math.max(.1,Number(latest?.distance||state.setup.testDistance)||5);
 const extrapolation=clamp(Math.log(Math.max(1,state.setup.raceDistance/testDistance))/Math.log(42.195/5),0,1);
 const evidence=projected?Math.max(c.evidenceCoverage,.90):clamp(c.evidenceCoverage,0,1);
 const execution=clamp(Number.isFinite(confidenceScore)?confidenceScore/100:.50,0,1);
 // Calibrated practical uncertainty: short-race extrapolation and sparse marathon
 // evidence widen the range; a fully completed programme narrows it but never to zero.
 // Percentages are intentionally conservative and bounded to avoid unusably broad ranges.
 const pct=projected
   ?(.014+.004*extrapolation+.005*(1-evidence)+.006*(1-execution))
   :(.018+.008*extrapolation+.012*(1-evidence)+.010*(1-execution));
 const baseSigma=clamp(pred*pct,projected?150:180,projected?480:720);
 const fastSigma=baseSigma*(projected?.72:.70);
 const slowSigma=baseSigma*(projected?1.18:1.28);
 return{baseSigma,fastSigma,slowSigma};
}
function splitNormalCdf(x,mu,leftSigma,rightSigma){
 // Keep the central prediction as the median: 50% of outcomes are faster and
 // 50% slower. Different side scales create realistic asymmetry without shifting
 // the stated prediction toward the slower tail.
 if(x<=mu)return normalCdf((x-mu)/leftSigma);
 return normalCdf((x-mu)/rightSigma);
}
function splitNormalQuantile(p,mu,leftSigma,rightSigma){
 const leftMass=leftSigma/(leftSigma+rightSigma);
 let lo=mu-8*leftSigma,hi=mu+8*rightSigma;
 for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(splitNormalCdf(mid,mu,leftSigma,rightSigma)<p)lo=mid;else hi=mid}
 return(lo+hi)/2;
}
function probabilityFromScenario(c,pred,confidenceScore,projected=false){
 const uncertainty=predictionUncertainty(c,pred,confidenceScore,projected);
 const target=Number(state.setup.targetTime);
 const probability=clamp(splitNormalCdf(target,pred,uncertainty.fastSigma,uncertainty.slowSigma)*100,5,95);
 const rangeLow=Math.max(0,splitNormalQuantile(.15,pred,uncertainty.fastSigma,uncertainty.slowSigma));
 const rangeHigh=splitNormalQuantile(.85,pred,uncertainty.fastSigma,uncertainty.slowSigma);
 return{probability,label:probabilityLabel(probability),sigma:uncertainty.baseSigma,fastSigma:uncertainty.fastSigma,slowSigma:uncertainty.slowSigma,rangeLow,rangeHigh};
}
function planSettingsProfile(c){
 const future=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&dte(p.date)>=today()&&dte(p.date)<=dte(state.setup.raceDate));
 const enabledDays=Math.max(1,state.days.filter(d=>d[1]).length);
 const futureWeeks=Math.max(1,c.weeksRemaining);
 const weekTotals=[];for(let w=currentWeek();w<=weeks();w++){const km=sum(state.plan.filter(p=>p.week===w&&p.type!=='Rest').map(p=>Number(p.distance)||0));if(km>0)weekTotals.push(km)}
 const plannedPeak=weekTotals.length?Math.max(...weekTotals):Number(state.setup.maxWeekly)||0;
 const currentWeekly=Math.max(1,Number(state.setup.currentWeekly)||1);
 const peakLong=Math.max(0,Number(state.setup.peakLong)||0);
 const volumeScore=clamp((plannedPeak-30)/35*100,0,100); // <30 limited; ~65 km strongly supportive in recreational cohorts
 const longScore=clamp((peakLong-22)/10*100,0,100);      // <25 km weak; 30–32+ km strongly supportive
 const frequencyScore=clamp((enabledDays-3)/2*100,0,100); // 3 days workable, 5+ distributes load better
 const growth=clamp(Number(state.setup.growth)||.08,.01,.25);
 const progressionScore=growth<=.10?100:growth<=.13?75:growth<=.16?45:20;
 const taperDays=Math.max(0,Number(state.setup.taperDays)||0);
 const taperScore=taperDays>=10&&taperDays<=21?100:taperDays>=7&&taperDays<=28?70:35;
 const totalKm=sum(future.map(p=>Number(p.distance)||0));
 const qualityKm=sum(future.filter(p=>['Tempo','Intervals','Fitness assessment','Threshold','Threshold intervals','Marathon-specific','Half-marathon-specific','Hills','Fartlek','VO₂max intervals','Race-pace intervals','Specific long run','Race rehearsal'].includes(p.type)).map(p=>Number(p.mainDistance)||Number(p.distance)||0));
 const easyLongKm=sum(future.filter(p=>['Easy','Recovery','Easy + strides','Shakeout','Steady aerobic','Medium-long','Progression','Long run'].includes(p.type)).map(p=>Number(p.distance)||0));
 const qualityShare=totalKm?qualityKm/totalKm:0;
 const easyShare=totalKm?easyLongKm/totalKm:0;
 const intensityScore=qualityShare>=.10&&qualityShare<=.28&&easyShare>=.65?100:qualityShare<=.35&&easyShare>=.55?75:45;
 const reachRatio=plannedPeak/currentWeekly;
 const availableBuild=Math.max(1,c.usableBuildWeeks);
 const requiredAtGrowth=Math.log(Math.max(1,reachRatio))/Math.log(1+growth);
 const reachabilityScore=clamp((availableBuild/Math.max(1,requiredAtGrowth))*100,0,100);
 const score=.25*volumeScore+.25*longScore+.12*frequencyScore+.12*progressionScore+.12*taperScore+.09*intensityScore+.05*reachabilityScore;
 return{score:clamp(score,0,100),plannedPeak,peakLong,enabledDays,growth,taperDays,qualityShare,easyShare,volumeScore,longScore,frequencyScore,progressionScore,taperScore,intensityScore,reachabilityScore,futureWeeks,totalKm};
}
function projectedPreparationModel(c){
 const profile=planSettingsProfile(c);
 const weeks=Math.max(0,c.usableBuildWeeks),timePotential=1-Math.exp(-.16*weeks);
 const healthPillar=c.pillars.find(p=>p.name==='HRV & health');
 const health=healthPillar&&healthPillar.coverage>0?healthPillar.score:75;
 const tolerance=clamp((health/100)*(.82+Math.min(1,c.trainingOpportunity/100)*.18),.45,1);
 const completionAssumption=1;
 const projectedPillars=c.pillars.map(p=>{
  let score=Number.isFinite(p.score)?p.score:50;
  if(p.name==='Marathon preparation')score=clamp(score+(profile.score-score)*timePotential*tolerance,0,100);
  if(p.name==='Plan execution')score=100;
  if(p.name==='HRV & health')score=health;
  return{...p,currentScore:p.score,projectedScore:score};
 });
 const overall=clamp(sum(projectedPillars.map(p=>p.projectedScore*p.weight))/sum(projectedPillars.map(p=>p.weight)),0,100);
 return{pillars:projectedPillars,overall,timePotential,tolerance,health,profile,completionAssumption};
}
function programmeProjection(c,currentPred,projectedPreparation){
 const latest=state.assessments.filter(a=>a.valid).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const testTime=latest?latest.time:state.setup.testTime,testDist=Math.max(.1,latest?latest.distance:state.setup.testDistance);
 const profile=projectedPreparation.profile;
 const weeks=Math.max(0,c.usableBuildWeeks),saturation=1-Math.exp(-.12*weeks);
 const health=clamp(projectedPreparation.health/100,.45,1),opportunity=clamp(c.trainingOpportunity/100,.45,1);
 const planQuality=clamp(profile.score/100,.25,1);
 const extrapolation=clamp(Math.log(Math.max(1,state.setup.raceDistance/testDist))/Math.log(42.195/5),0,1);
 // The plan first improves marathon transfer/durability, then adds a smaller central fitness gain.
 // The settings influence both: volume, long run, frequency, taper, safe progression and intensity mix.
 const projectedDurability=clamp(.35+.65*planQuality*saturation*health,0,1);
 const projectedExponent=1.06+.055*(1-projectedDurability)*extrapolation;
 const durabilityTime=testTime*Math.pow(state.setup.raceDistance/testDist,projectedExponent);
 const volumeLift=clamp((profile.plannedPeak-Math.max(25,Number(state.setup.currentWeekly)||0))/40,0,1);
 const centralGainCap=.008+.027*planQuality; // roughly 0.8–3.5%, bounded and plan-sensitive
 const fitnessGainPct=clamp(centralGainCap*saturation*health*opportunity*(.55+.45*volumeLift),0,.035);
 const taperGain=(profile.taperScore/100)*clamp(.006*saturation,0,.006);
 const predictedTime=durabilityTime*(1-fitnessGainPct-taperGain);
 const improvementSec=Math.max(0,currentPred-predictedTime);
 return{predictedTime,improvementSec,improvementPct:currentPred>0?improvementSec/currentPred:0,projectedExponent,fitnessGainPct,taperGain,planQuality:profile.score,profile};
}
function coachEngine(){
 let c=confidence(),pred=prediction(),cw=currentWeek(),wd=weekData(cw);
 let projectedPreparation=projectedPreparationModel(c);
 let projection=programmeProjection(c,pred,projectedPreparation);
 let currentSupport=Number.isFinite(c.overall)?c.overall:50;
 let projectedSupport=projectedPreparation.overall;
 let currentModel=probabilityFromScenario(c,pred,currentSupport,false);
 let projectedModel=probabilityFromScenario(c,projection.predictedTime,projectedSupport,true);
 let scored=uniqueComponents(c.components.filter(x=>x.hasEvidence).map(x=>({...x,score:x.displayScore}))).sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name));
 let strongest=[...scored].sort((a,b)=>b.score-a.score)[0],weakest=scored[0];
 let limiterCard=!weakest?{label:'Current limiter',name:'More evidence needed',text:'Log completed training to identify meaningful constraints.',severity:'neutral'}:weakest.score<70?{label:'Biggest limiter',name:weakest.name,text:interpretations[weakest.name](weakest.score),severity:'warn'}:weakest.score<85?{label:'Primary watch item',name:weakest.name,text:`${interpretations[weakest.name](weakest.score)} This is the smallest current margin.`,severity:'watch'}:{label:'Current limiter',name:'No significant limiter identified',text:`${weakest.name} is the lowest measured area, but it remains strong.`,severity:'good'};
 let coachConfidencePct=Math.round(clamp(c.evidenceCoverage*100,0,100));
 let status=currentModel.probability>=80?'Target strongly supported today':currentModel.probability>=60?'Target currently supported':currentModel.probability>=40?'Target remains possible':'Target not yet supported today';
 let completedRuns=state.runs.filter(r=>dte(r.date)<=today()&&Number(r.distanceKm)>0);
 let completedLongs=completedRuns.filter(r=>['Long run','Race'].includes(r.type)).length;
 let completedSpecific=completedRuns.filter(r=>['Tempo','Intervals','Marathon','Fitness assessment'].includes(r.type)).length;
 let matched=completedRuns.filter(r=>r.planId).length;
 let completedWeekVolumes=[];for(let w=1;w<=currentWeek();w++)completedWeekVolumes.push(weekData(w).actual);
 let bestCompletedWeek=completedWeekVolumes.length?Math.max(0,...completedWeekVolumes):0;
 let dueWorkouts=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&dte(p.date)<=today()).length;
 let progress=[
  {label:'Longest verified run',value:c.completedLongest,target:Number(state.setup.peakLong)||1,unit:'km'},
  {label:'Best completed week',value:bestCompletedWeek,target:Number(state.setup.maxWeekly)||1,unit:'km'},
  {label:'Long-run evidence',value:completedLongs,target:Math.max(3,Math.ceil(weeks()*.22)),unit:'runs'},
  {label:'Race-specific sessions',value:completedSpecific,target:Math.max(4,Math.ceil(weeks()*.30)),unit:'sessions'},
  {label:'Plan-linked workouts',value:matched,target:Math.max(1,dueWorkouts),unit:'workouts'}
 ];
 let next=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&dte(p.date)>=today()&&!matchingRun(p)).sort((a,b)=>a.date.localeCompare(b.date))[0];
 return{c,pred,cw,wd,projectedPreparation,projection,currentSupport,projectedSupport,currentModel,projectedModel,scored,strongest,weakest,limiterCard,coachConfidencePct,status,progress,next};
}

function evidenceConfidence(fraction,count=0){
 const f=clamp(Number(fraction)||0,0,1);
 if(f>=.8&&count!==1)return{label:'High',rank:3};
 if(f>=.45||count>=3)return{label:'Medium',rank:2};
 return{label:'Low',rank:1};
}
function impactForComponent(name){
 return ({'Long-run execution':3,'Volume progression':3,'Endurance':3,'Adherence':3,'Fitness':3,'Specificity':2,'Consistency':2,'Schedule adherence':2,'Garmin HRV trend':2,'Pain status':3,'Efficiency':2,'Training opportunity':2,'Preparation time':3}[name]||1);
}
function impactLabel(rank){return rank>=3?'High':rank===2?'Medium':'Low'}
function componentEvidence(c,item){
 const name=item.name,score=Number(item.displayScore),window=name==='Long-run execution'?'Last 84 days':name==='Specificity'?'Last 56 days':name==='Volume progression'?'Latest 4 training weeks':name==='Fitness'?'Latest valid assessment or configured test':'Recent 28-day training window';
 let facts=[];
 if(name==='Fitness'){
  const latest=state.assessments.filter(a=>a.valid).sort((a,b)=>b.date.localeCompare(a.date))[0];
  facts.push(latest?`Latest valid assessment: ${latest.distance.toFixed(1)} km in ${fmtTime(latest.time)} on ${fmtDate(latest.date)}`:`Configured benchmark: ${Number(state.setup.testDistance).toFixed(1)} km in ${fmtTime(state.setup.testTime)}`);
  facts.push(`Assessment-only Riegel estimate: ${fmtTime(c.riegel)} versus target ${fmtTime(state.setup.targetTime)}`);
 }else if(name==='Endurance')facts.push(`Longest verified completed run: ${c.completedLongest.toFixed(1)} km`,`Planned peak long run: ${Number(state.setup.peakLong).toFixed(1)} km`);
 else if(name==='Adherence')facts.push(`Completed distance: ${c.actual.toFixed(1)} km`,`Due planned distance: ${c.plannedKm.toFixed(1)} km`);
 else if(name==='Consistency')facts.push(`Completed due sessions: ${c.matched}`,`Due sessions: ${c.opportunities}`);
 else if(name==='Volume progression'){
  let vols=[];for(let w=Math.max(1,currentWeek()-3);w<=currentWeek();w++)vols.push(weekData(w).actual);
  facts.push(`Best completed week in window: ${Math.max(0,...vols).toFixed(1)} km`,`Configured peak weekly distance: ${Number(state.setup.maxWeekly).toFixed(1)} km`);
 }else if(name==='Long-run execution'){
  const due=state.plan.filter(p=>p.type==='Long run'&&(dte(p.date)<today()||matchingRun(p))&&today()-dte(p.date)<=84*DAY);
  const done=due.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)});
  facts.push(`Completed due long runs: ${done.length}`,`Due long runs: ${due.length}`);
 }else if(name==='Specificity'){
  const due=state.plan.filter(p=>['Tempo','Intervals','Fitness assessment'].includes(p.type)&&(dte(p.date)<today()||matchingRun(p))&&today()-dte(p.date)<=56*DAY);
  const done=due.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)});
  facts.push(`Completed due specific sessions: ${done.length}`,`Due specific sessions: ${due.length}`);
 }else if(name==='Schedule adherence')facts.push(`${c.matched} plan-linked completed session${c.matched===1?'':'s'} available for timing comparison`);
 else if(name==='Efficiency'){
  if(Number.isFinite(c.effTrend))facts.push(`Comparable aerobic efficiency trend: ${c.effTrend>=0?'+':''}${c.effTrend.toFixed(1)}%`);
  if(Number.isFinite(c.driftAvg))facts.push(`Recent average power-based cardiac drift: ${c.driftAvg.toFixed(1)}%`);
 }else if(name==='Garmin HRV trend'){
  const h=hrvModel();facts.push(`${h.count} Garmin HRV value${h.count===1?'':'s'} logged`);if(h.rolling!=null)facts.push(`Current HRV trend value: ${h.rolling.toFixed(0)} ms`);if(h.baseline!=null)facts.push(`Personal baseline: ${h.baseline.toFixed(1)} ms`);facts.push(`Applied HRV factor: ${h.factor.toFixed(2)}`);
 }else if(name==='Pain status'){
  const p=recoveryPainState();facts.push(`${p.count} recent pain rating${p.count===1?'':'s'}`);if(p.average!=null)facts.push(`Average pain: ${p.average.toFixed(1)} / 10`,`Highest recent pain: ${p.max.toFixed(0)} / 10`);
 }
 return{facts,window};
}
function executionScoreSummary(days=42){
 const cutoff=new Date(today().getTime()-days*DAY);
 const rows=(state.runs||[]).filter(r=>dte(r.date)>=cutoff&&dte(r.date)<=today()).map(r=>{
  const plan=r.planId?state.plan.find(p=>p.id===r.planId):null,details=workoutScoreDetails(r,plan),score=details?.score;
  return score==null?null:{run:r,plan,details,score,date:r.date,type:plan?.type||r.type,pain:Number(r.pain),drift:Number(r.powerDrift)};
 }).filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date));
 const recent=rows.slice(0,8),scores=recent.map(x=>x.score),average=avg(scores);
 const key=recent.filter(x=>x.plan&&['Tempo','Intervals','Threshold','Threshold intervals','VO₂max intervals','Race-pace intervals','Marathon-specific','Half-marathon-specific','Long run','Specific long run','Race rehearsal','Fitness assessment'].includes(x.plan.type));
 const keyAverage=avg(key.map(x=>x.score)),strong=recent.filter(x=>x.score>=90),limited=recent.filter(x=>x.score<75);
 const trend=recent.length>=4?avg(recent.slice(0,Math.ceil(recent.length/2)).map(x=>x.score))-avg(recent.slice(Math.ceil(recent.length/2)).map(x=>x.score)):null;
 const objectiveMisses={};recent.forEach(x=>x.details.components.filter(c=>c.score<75).forEach(c=>objectiveMisses[c.key]=(objectiveMisses[c.key]||0)+1));
 const recurringWeakness=Object.entries(objectiveMisses).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
 return{rows,recent,average,keyAverage,strong,limited,trend,count:recent.length,recurringWeakness};
}
function raceSpecificPriority(){
 const p=raceProfile(),dp=detailedPhase(currentWeek()),weeksLeft=Math.max(0,weeks()-currentWeek());
 const map={
  '5k':{Foundation:'easy consistency, hills and relaxed strides',Aerobic:'threshold development and aerobic support',Development:'VO₂max and repeatable speed',Specific:'5 km-pace execution and economy',Peak:'sharpness without excess fatigue',Taper:'freshness and short race-pace reminders'},
  '10k':{Foundation:'aerobic consistency and relaxed speed',Aerobic:'threshold development',Development:'threshold durability with selective VO₂max work',Specific:'10 km-pace control',Peak:'race-specific sharpness',Taper:'freshness and pace confidence'},
  half:{Foundation:'aerobic consistency',Aerobic:'threshold endurance and medium-long running',Development:'sustained threshold durability',Specific:'half-marathon-effort control under fatigue',Peak:'specific endurance with controlled recovery cost',Taper:'freshness while retaining race rhythm'},
  marathon:{Foundation:'durable easy running and safe consistency',Aerobic:'aerobic volume and medium-long endurance',Endurance:'weekly-volume tolerance and long-run durability',Specific:'marathon-effort economy, fuelling and fatigue resistance',Peak:'race rehearsal and controlled peak endurance',Taper:'fatigue reduction while preserving marathon rhythm'},
  ultra:{Foundation:'time-on-feet tolerance',Aerobic:'aerobic durability and terrain strength',Endurance:'long-run resilience and fuelling tolerance',Specific:'terrain, run-walk and race-execution rehearsal',Peak:'final durability rehearsal without overload',Taper:'freshness and logistical readiness'}
 };
 const key=profileMatrixKey(p);return{priority:(map[key]||map.marathon)[dp]||'consistent race-specific preparation',phase:dp,weeksLeft,profile:p};
}
function evidenceBasedCoach(engine){
 const c=engine.c,ast=athleteState(engine.cw),execution=executionScoreSummary(),components=uniqueComponents(c.components.filter(i=>i.hasEvidence&&Number.isFinite(i.displayScore))),race=raceSpecificPriority();
 let findings=components.map(item=>{const evidence=componentEvidence(c,item),confidence=evidenceConfidence(item.evidenceFraction??1,evidence.facts.length),impact=impactForComponent(item.name),score=Number(item.displayScore);return{...item,score,confidence,impact,evidence,status:score>=80?'strength':score<70?'opportunity':'watch',priority:(100-score)*impact*confidence.rank}});
 const pain=findings.find(x=>x.name==='Pain status'),hrv=findings.find(x=>x.name==='Garmin HRV trend'),recoveryConstraint=(pain&&pain.score<60)||(hrv&&hrv.score<60);
 let strengths=findings.filter(x=>x.status==='strength').sort((a,b)=>b.score-a.score||b.confidence.rank-a.confidence.rank).slice(0,3),opportunities=findings.filter(x=>x.status==='opportunity').sort((a,b)=>b.priority-a.priority).slice(0,3);if(!opportunities.length)opportunities=findings.filter(x=>x.status==='watch').sort((a,b)=>b.priority-a.priority).slice(0,2);
 const targetGap=engine.pred-state.setup.targetTime,targetPosition=targetGap<=0?`${fmtTime(Math.abs(targetGap))} inside target`:`${fmtTime(targetGap)} outside target`,planDecision=`factor ${ast.adjustment.toFixed(2)} (${ast.direction}${ast.pct?` ${ast.pct}%`:''})`;
 const executionSentence=Number.isFinite(execution.average)?`Recent execution is ${Math.round(execution.average)}/100 (${scoreBand(Math.round(execution.average)).toLowerCase()})${Number.isFinite(execution.keyAverage)?`; key sessions average ${Math.round(execution.keyAverage)}/100`:''}.`:'There is not yet enough completed-run detail to judge workout execution.';
 let conclusion=`You are in the ${race.phase.toLowerCase()} phase with ${race.weeksLeft} week${race.weeksLeft===1?'':'s'} remaining before ${state.setup.raceName}. The present priority is ${race.priority}. Current race estimate is ${fmtTime(engine.pred)} (${targetPosition}), with ${Math.round(engine.currentModel.probability)}% estimated target probability. ${executionSentence} This week uses ${planDecision}.`;
 if(recoveryConstraint)conclusion+=` Recovery or pain currently takes priority over progression.`;else if(execution.limited.length)conclusion+=` Improve execution consistency before adding training load or faster targets.`;else if(engine.currentModel.probability<50)conclusion+=` The goal is not yet well supported, so the next block should build the weakest race-relevant evidence rather than force the target pace.`;else conclusion+=` Continue building the phase-specific stimulus without exceeding the planned load.`;
 const projected=`Completing the current programme as prescribed projects ${fmtTime(engine.projection.predictedTime)} and ${Math.round(engine.projectedModel.probability)}% estimated target probability; this remains conditional on healthy, consistent execution.`;
 let actionsList=[];
 if(recoveryConstraint){if(pain&&pain.score<60)actionsList.push({title:'Protect the injury first',text:actions['Pain status'],source:'Recent pain and athlete state'});else actionsList.push({title:'Let recovery govern intensity',text:'Keep the next demanding session easy or postpone it until the recorded recovery signal returns toward baseline.',source:'Garmin HRV trend'});}
 if(execution.limited.length){const x=execution.limited[0],weak=x.details.components.filter(c=>c.score<80).sort((a,b)=>a.score-b.score)[0];actionsList.push({title:`Improve ${weak?.name?.toLowerCase()||'session execution'}`,text:`The ${fmtDate(x.date)} ${x.type} scored ${x.score}/100. ${weak?weak.detail:''} Repeat the intended stimulus with control; do not compensate through extra distance.`,source:'Session-specific execution breakdown'});}
 else if(execution.recurringWeakness){const labels={distance:'distance discipline',pace:'pace control',power:'power control',hr:'heart-rate control',drift:'aerobic durability',rpe:'effort selection'};actionsList.push({title:`Strengthen ${labels[execution.recurringWeakness]||'execution'}`,text:'This component has been the most repeated weak point across recent scored sessions. Focus on the prescribed objective rather than the headline pace alone.',source:'Repeated workout-execution pattern'});}
 else if(Number.isFinite(execution.trend)&&execution.trend>=5)actionsList.push({title:'Preserve improving execution',text:`Execution has improved by about ${execution.trend.toFixed(0)} points. Keep the same pacing and recovery discipline; allow fitness calibration to move targets only after sufficient evidence accumulates.`,source:'Workout execution trend'});
 const raceOpportunity=opportunities.find(f=>['Endurance','Long-run execution','Specificity','Volume progression','Adherence','Fitness'].includes(f.name))||opportunities[0];
 if(actionsList.length<3&&raceOpportunity&&!(recoveryConstraint&&['Adherence','Volume progression','Long-run execution','Specificity'].includes(raceOpportunity.name)))actionsList.push({title:`Build ${raceOpportunity.name.toLowerCase()}`,text:actions[raceOpportunity.name]||interpretations[raceOpportunity.name]?.(raceOpportunity.score)||'Improve this verified limiter through the planned progression.',source:`${raceOpportunity.name} · ${raceOpportunity.confidence.label.toLowerCase()}-confidence evidence`});
 if(actionsList.length<3&&engine.next)actionsList.push({title:'Execute the next purposeful session',text:`${fmtDate(engine.next.date)} · ${engine.next.type} · ${engine.next.distance.toFixed(1)} km. Objective: ${engine.next.purpose}`,source:`${race.phase} phase plan`});
 if(actionsList.length<3)actionsList.push({title:'Improve evidence quality',text:'Keep plan links, distance, duration, power, HR, RPE, pain and HRV complete. Better evidence improves both target calibration and prediction certainty.',source:'Current data coverage'});
 actionsList=actionsList.filter((x,i,a)=>a.findIndex(y=>y.title===x.title)===i).slice(0,3);
 return{conclusion,current:`Current estimate: ${fmtTime(engine.pred)} (${targetPosition}).`,projected,strengths,opportunities,actions:actionsList,evidenceCoverage:Math.round(c.evidenceCoverage*100),recoveryConstraint,athleteState:ast,execution,race};
}
function evidenceFindingHtml(f,positive=false){
 const cls=positive?'evidenceStrength':'evidenceOpportunity';
 return `<details class="evidenceFinding ${cls}"><summary><span><b>${esc(f.name)}</b><small>${esc(interpretations[f.name]?.(f.score)||'Measured from logged training evidence.')}</small></span><span class="evidenceTags"><i>${impactLabel(f.impact)} impact</i><i>${f.confidence.label} confidence</i></span></summary><div class="evidenceDetail"><div class="evidenceFacts">${f.evidence.facts.map(x=>`<p>${esc(x)}</p>`).join('')}</div><div class="evidenceMeta"><span>Score <b>${Math.round(f.score)} / 100</b></span><span>Window <b>${esc(f.evidence.window)}</b></span><span>Verification <b>${f.confidence.label==='Low'?'Partial':'Supported'}</b></span></div><p class="muted compact">Calculation: ${esc(componentDefinitions[f.name]||'Derived directly from the displayed user-entered and plan-linked values.')}</p></div></details>`;
}
function coachReportHtml(report,compact=false){
 const strengths=report.strengths.length?report.strengths.map(x=>evidenceFindingHtml(x,true)).join(''):'<p class="muted">No strength is labelled yet because the available evidence does not reach the required threshold.</p>';
 const opportunities=report.opportunities.length?report.opportunities.map(x=>evidenceFindingHtml(x,false)).join(''):'<p class="muted">No material evidence-backed opportunity is currently identified.</p>';
 const ast=report.athleteState,decision=`${ast.adjustment.toFixed(2)} · ${ast.direction}${ast.pct?` ${ast.pct}%`:''}`,ex=report.execution;
 const executionHtml=ex&&ex.count?`<section class="executionAssessment"><div class="executionHead"><div><h4>Workout execution</h4><p class="muted compact">How well recent completed sessions delivered their intended stimulus.</p></div><strong>${Number.isFinite(ex.average)?Math.round(ex.average):'—'}/100</strong></div><div class="executionKpis"><span>Recent average <b>${Number.isFinite(ex.average)?Math.round(ex.average):'—'}</b></span><span>Key sessions <b>${Number.isFinite(ex.keyAverage)?Math.round(ex.keyAverage):'—'}</b></span><span>Trend <b>${Number.isFinite(ex.trend)?`${ex.trend>=0?'+':''}${ex.trend.toFixed(0)} pts`:'Insufficient data'}</b></span></div><details class="executionDetails"><summary>Session-by-session evidence</summary>${ex.recent.map(x=>`<div class="executionRow"><span>${fmtDate(x.date)} · ${esc(x.type)}</span><b>${x.score}/100</b><small>${x.plan?`Planned ${x.plan.distance.toFixed(1)} km · actual ${Number(x.run.distanceKm).toFixed(1)} km`:'Ad hoc run'}${Number.isFinite(x.pain)?` · pain ${x.pain}/10`:''}${Number.isFinite(x.drift)?` · drift ${x.drift.toFixed(1)}%`:''}</small></div>`).join('')}</details></section>`:'<section class="executionAssessment"><h4>Workout execution</h4><p class="muted">No completed run has enough information for an execution score yet.</p></section>';
 return `<div class="coachReport ${compact?'compactReport':''}"><div class="coachVerdict"><span>Evidence-based assessment</span><p class="coachConclusion">${esc(report.conclusion)}</p><p class="coachProjection">${esc(report.projected)}</p><small>Evidence coverage ${report.evidenceCoverage}% · Coaching uses logged, configured, plan-linked and execution-score evidence.</small></div><div class="coachStateStrip"><div><span>Pace & power calibration</span><b>${ast.fitnessDelta>=0?'+':''}${ast.fitnessDelta.toFixed(1)}%</b></div><div><span>Recovery</span><b>${esc(ast.readiness)}</b></div><div><span>Pain</span><b>${ast.pain.count?`${ast.pain.max}/10`:'No data'}</b></div><div><span>Distance & load</span><b>${esc(decision)}</b></div></div>${executionHtml}<div class="coachEvidenceGrid"><section><h4>Verified strengths</h4>${strengths}</section><section><h4>Priority opportunities</h4>${opportunities}</section></div><section class="coachActions"><h4>Next actions</h4>${report.actions.map((a,i)=>`<div class="coachAction"><strong>${i+1}</strong><div><b>${esc(a.title)}</b><p>${esc(a.text)}</p><small>Based on: ${esc(a.source)}</small></div></div>`).join('')}</section></div>`;
}
function progressCard(x){let pct=clamp(x.value/Math.max(.01,x.target)*100,0,100);let value=x.unit==='km'?`${x.value.toFixed(1)} / ${x.target.toFixed(1)} km`:`${Math.round(x.value)} / ${Math.round(x.target)} ${x.unit}`;return `<div class="progressCard"><div><b>${x.label}</b><span>${value}</span></div><strong>${Math.round(pct)}%</strong><div class="progressTrack"><i style="width:${pct}%"></i></div></div>`}
function renderDashboard(){
 let engine=coachEngine(),{c,pred,cw,wd}=engine;
 $('phaseBadge').textContent=phase(cw);
 $('raceTitle').textContent=state.setup.raceName;
 $('raceSubtitle').textContent=`${dte(state.setup.raceDate).toLocaleDateString()} • ${state.setup.raceDistance.toFixed(1)} km • target ${fmtTime(state.setup.targetTime)} (${pace(state.setup.targetTime/state.setup.raceDistance)})`;
 document.querySelector('.currentOutlook>span').textContent=`Chance of meeting ${fmtTime(state.setup.targetTime)} if racing today`;
 document.querySelector('.projectedOutlook>span').textContent=`Chance of meeting ${fmtTime(state.setup.targetTime)} after full programme`;
 $('currentProbability').textContent=Math.round(engine.currentModel.probability)+'%';
 $('currentProbabilityLabel').textContent=engine.currentModel.label;
 $('currentPrediction').textContent=`${fmtTime(pred)} predicted · ${pace(pred/state.setup.raceDistance)}`;
 $('currentRange').textContent=`Likely 70% range ${fmtTime(engine.currentModel.rangeLow)}–${fmtTime(engine.currentModel.rangeHigh)} · ${pace(engine.currentModel.rangeLow/state.setup.raceDistance)}–${pace(engine.currentModel.rangeHigh/state.setup.raceDistance)}`;
 $('projectedProbability').textContent=Math.round(engine.projectedModel.probability)+'%';
 $('projectedProbabilityLabel').textContent=engine.projectedModel.label;
 $('projectedPrediction').textContent=`${fmtTime(engine.projection.predictedTime)} projected · ${pace(engine.projection.predictedTime/state.setup.raceDistance)}`;
 $('projectedRange').textContent=`Likely 70% range ${fmtTime(engine.projectedModel.rangeLow)}–${fmtTime(engine.projectedModel.rangeHigh)} · ${pace(engine.projectedModel.rangeLow/state.setup.raceDistance)}–${pace(engine.projectedModel.rangeHigh/state.setup.raceDistance)}`;
 const gain=engine.projectedModel.probability-engine.currentModel.probability;
 $('outlookGain').innerHTML=`Projected programme benefit: <b>${gain>=0?'+':''}${Math.round(gain)} percentage points</b> · ${fmtTime(engine.projection.improvementSec)} estimated time improvement`;
 $('trackStatus').innerHTML=`<span class="statusDot"></span><b>${engine.status}</b>`;
 const hero=$('trackStatus').closest('.outlookHero');
 if(hero)hero.classList.remove('outlook-good','outlook-watch','outlook-action');
 if(hero)hero.classList.add(engine.currentModel.probability>=70?'outlook-good':engine.currentModel.probability>=45?'outlook-watch':'outlook-action');
 const currentCard=document.querySelector('.currentOutlook'),projectedCard=document.querySelector('.projectedOutlook');
 [currentCard,projectedCard].forEach(card=>card&&card.classList.remove('metric-good','metric-watch','metric-action'));
 if(currentCard)currentCard.classList.add(engine.currentModel.probability>=70?'metric-good':engine.currentModel.probability>=45?'metric-watch':'metric-action');
 if(projectedCard)projectedCard.classList.add(engine.projectedModel.probability>=70?'metric-good':engine.projectedModel.probability>=45?'metric-watch':'metric-action');
 const coachReport=evidenceBasedCoach(engine);
 $('assessmentText').innerHTML=coachReportHtml(coachReport,true);
 const pf=engine.projection.profile;
 $('predictionModelContent').innerHTML=`<div class="modelSteps"><section><b>Race today — central time</b><p>Latest valid assessment is extrapolated to ${state.setup.raceDistance.toFixed(1)} km. Marathon durability changes the distance exponent from 1.06 toward 1.115 when long-run, weekly-volume and specific-session evidence is incomplete.</p><code>${fmtTime(engine.pred)} at ${pace(engine.pred/state.setup.raceDistance)}</code></section><section><b>Follow programme — central time</b><p>The completed-plan scenario recalculates durability from the actual settings and adds a bounded adaptation estimate. Current plan quality is ${Math.round(pf.score)}/100: peak ${pf.plannedPeak.toFixed(1)} km/week, longest run ${pf.peakLong.toFixed(1)} km, ${pf.enabledDays} running days/week, ${(pf.growth*100).toFixed(1)}% growth, ${pf.taperDays} taper days and ${Math.round(pf.qualityShare*100)}% quality distance.</p><code>${fmtTime(engine.projection.predictedTime)} at ${pace(engine.projection.predictedTime/state.setup.raceDistance)} · durability exponent ${engine.projection.projectedExponent.toFixed(3)} · fitness gain ${(engine.projection.fitnessGainPct*100).toFixed(1)}% · taper ${(engine.projection.taperGain*100).toFixed(1)}%</code></section><section><b>Target probability</b><p>The central time is treated as the median of an asymmetric finish-time distribution. The faster tail is narrower and the slower tail wider. Current evidence and execution confidence control the width. Probability is the area finishing at or before ${fmtTime(state.setup.targetTime)}.</p><code>Today ${Math.round(engine.currentModel.probability)}% · programme ${Math.round(engine.projectedModel.probability)}% · displayed as central 70% ranges</code></section></div><p class="muted compact">The relationships are evidence-informed but the exact coefficients are app calibration assumptions, not a clinically or externally validated prediction equation.</p>`;
 $('currentPreparationScore').textContent=Number.isFinite(c.overall)?Math.round(c.overall)+' / 100':'Not scored';
  $('evidenceBadge').textContent=`Evidence ${Math.round(c.evidenceCoverage*100)}%`;
 const evidenceContributions=engine.projectedPreparation.pillars.map(p=>({name:p.name,points:p.weight*p.coverage*100,weight:p.weight,coverage:p.coverage}));
 $('pillarCards').innerHTML=`<details class="evidenceCoverageExplain"><summary>How ${Math.round(c.evidenceCoverage*100)}% evidence is used</summary><p><b>Evidence coverage controls prediction uncertainty, not the central predicted time.</b> Lower coverage widens the likely finish-time range and makes the target probability less certain.</p><div class="calcTable">${evidenceContributions.map(x=>`<div class="calcRow"><span>${esc(x.name)}</span><span>${Math.round(x.coverage*100)}% available</span><span>${x.points.toFixed(0)} points</span></div>`).join('')}<div class="calcRow total"><span>Total evidence coverage</span><span></span><span>${Math.round(c.evidenceCoverage*100)}%</span></div></div><p class="muted compact">Each contribution equals model weight × available evidence. Component scores affect whether the available evidence is favourable; missing evidence widens the range instead of being assigned a neutral score.</p></details>`+engine.projectedPreparation.pillars.map((p,pi)=>`
   <div class="pillarCard status-${scoreStatus(p.currentScore,p.coverage>0)}" data-pillar-index="${pi}" role="button" tabindex="0" aria-expanded="false" style="--pillar:${p.color}">
    <div class="pillarTop"><b>${p.name}</b><span class="pillarScore">${Number.isFinite(p.currentScore)?Math.round(p.currentScore):'N/A'}</span></div>
    <div class="pillarBar"><i style="width:${Number.isFinite(p.currentScore)?p.currentScore:0}%"></i></div>
    <p>${p.description}</p>
    <div class="pillarMeta"><span>Model weight ${Math.round(p.weight*100)}%</span><span>Evidence ${Math.round(p.coverage*100)}%</span></div>
    <details class="pillarExplain"><summary>How this is calculated</summary><div class="calcTable">${p.items.map(i=>`<div class="calcRow"><span>${i.name}</span><span>${i.hasEvidence?Math.round(i.displayScore):'No evidence'}</span><span>${Math.round(i.weight*100)}%</span></div>`).join('')}</div><p class="muted">Only current completed evidence is scored. Missing evidence is shown as missing and widens the prediction range; it does not receive a neutral or projected score.</p></details>
   </div>`).join('');
 let total=Math.max(1,weeks()),pos=clamp((engine.cw-1)/(Math.max(1,total-1))*100,0,100);
 const blockNames=[];for(let w=1;w<=total;w++){const name=detailedPhase(w),last=blockNames.at(-1);if(!last||last.name!==name)blockNames.push({name,startWeek:w,endWeek:w});else last.endWeek=w}
 const phaseClass=name=>({'Foundation':'foundation','Aerobic':'aerobic','Development':'development','Endurance':'endurance','Specific':'specific','Peak':'peak','Taper':'taper'}[name]||'build');
 const pctStart=w=>(w-1)/total*100,pctEnd=w=>w/total*100;
 const timelineLabel=name=>({'Foundation':'Foundation','Aerobic':'Aerobic','Development':'Development','Endurance':'Endurance','Specific':'Specific','Peak':'Peak','Taper':'Taper'}[name]||esc(name));
 const blocks=blockNames.map(b=>({name:b.name,label:timelineLabel(b.name),start:pctStart(b.startWeek),end:pctEnd(b.endWeek),cls:phaseClass(b.name)}));
 $('raceTimeline').innerHTML=`<div class="timelineBlocks">${blocks.map(b=>`<div class="timelineBlock timeline-${b.cls}" style="left:${b.start}%;width:${b.end-b.start}%" title="${esc(b.name)}"><span>${b.label}</span></div>`).join('')}<i class="timelineProgress" style="width:${pos}%"></i><span class="timelineNow" style="left:${pos}%" aria-label="Current programme position"></span></div><div class="timelineScale"><span>Plan start</span><span>Race day</span></div><div class="timelineMeta"><b>${detailedPhase(engine.cw)} phase · week ${engine.cw} of ${total}</b><span>${Math.max(0,Math.ceil(c.weeksRemaining))} weeks until race</span></div>`;
 let afd=adaptiveFactorDetails(cw);
 $('kpis').innerHTML=kpi('Time until race',(()=>{const days=Math.max(0,Math.ceil((dte(state.setup.raceDate)-today())/DAY));return days<14?`${days} ${days===1?'day':'days'}`:`${Math.ceil(days/7)} weeks`;})(),'Remaining')+kpi('Completed this week',wd.actual.toFixed(1)+' km',`${wd.planned.toFixed(1)} km planned`)+kpi('Longest verified run',c.completedLongest.toFixed(1)+' km',`${Number(state.setup.peakLong).toFixed(1)} km target`)+factorKpi(afd);
 const trendHistory=(state.predictionHistory||[]).filter(x=>Number.isFinite(Number(x.seconds))).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const startPrediction=Number(state.programStartPrediction)||initialProgrammePrediction(state.setup)||pred;
 const targetTime=Number(state.setup.targetTime);
 const currentSaved=trendHistory.at(-1);
 const currentEstimate=currentSaved?Number(currentSaved.seconds):null;
 const vsStart=Number.isFinite(currentEstimate)?currentEstimate-startPrediction:null;
 const vsTarget=Number.isFinite(currentEstimate)?currentEstimate-targetTime:null;
 const eventCount=trendHistory.length;
 const deltaText=(v,betterLabel='faster',worseLabel='slower')=>!Number.isFinite(v)?'—':Math.abs(v)<30?'No material change':`${v<0?betterLabel:worseLabel} by ${fmtTime(Math.abs(v))}`;
 $('predictionSummary').innerHTML=`<div class="predictionReferences"><div><span>Target time</span><strong>${fmtTime(targetTime)}</strong><small>Fixed race goal</small></div><div><span>Predicted at programme start</span><strong>${fmtTime(startPrediction)}</strong><small>Fixed baseline from the plan-start inputs</small></div></div>${eventCount?`<div class="predictionCurrent" data-update-mode="${esc(currentSaved.updateMode||'maintained')}"><span>Current prediction after ${eventCount} uploaded update${eventCount===1?'':'s'}</span><strong>${fmtTime(currentEstimate)}</strong><div class="predictionDeltas"><span><b>${deltaText(vsStart)}</b><small>versus programme start</small></span><span><b>${deltaText(vsTarget,'inside target','outside target')}</b><small>versus target</small></span></div><small>Latest update: ${esc(currentSaved.source||'Run update')} · ${fmtDate(currentSaved.date)}</small>${currentSaved.evidenceReason?`<div class="predictionUpdateEvidence"><b>${esc(currentSaved.evidenceQuality||'Low')} evidence · ${Math.round((Number(currentSaved.evidenceWeight)||0)*100)}% update weight</b><span>${esc(currentSaved.evidenceReason)}</span><small>${Number(currentSaved.updateDelta)<-.5?`Earned improvement ${fmtTime(Math.abs(Number(currentSaved.updateDelta)||0))}`:'Prediction maintained'}${Number.isFinite(Number(currentSaved.completionRatio))?` · ${Math.round(Number(currentSaved.completionRatio)*100)}% of expected stimulus`:''}. Negative training evidence affects confidence and recovery before established capability.</small></div>`:''}</div>`:`<div class="predictionAwaiting"><strong>No run-based prediction updates yet</strong><p>Upload or log a run, or save a valid assessment, to add the first progression point. The two horizontal lines below are the fixed programme-start prediction and target.</p></div>`}`;
 if($('componentGuide'))$('componentGuide').innerHTML=c.components.map(x=>`<div><b>${x.name}</b><p>${componentDefinitions[x.name]}</p><small class="${x.hasEvidence?'muted':'metricMissing'}">${x.hasEvidence?`Current score: ${Math.round(x.displayScore)} / 100 · evidence ${Math.round((x.evidenceFraction??1)*100)}%`:'No evidence yet'} · within-component weight ${Math.round(x.weight*100)}%</small></div>`).join('');
 let missing=uniqueComponents(c.components.filter(x=>!x.hasEvidence));
 $('dataNeeded').innerHTML=missing.length?missing.map(x=>`<div class="note"><b>${x.name}</b><br>${componentDefinitions[x.name]}</div>`).join(''):'<p class="muted">All preparation-model components currently have evidence.</p>';
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
   ctx.beginPath();
   if(s.horizontal){
     const y=py(good[0].v);ctx.moveTo(left,y);ctx.lineTo(W-right,y);ctx.stroke();
   }else{
     good.forEach((o,j)=>j?ctx.lineTo(px(o.i),py(o.v)):ctx.moveTo(px(o.i),py(o.v)));
     if(good.length>1)ctx.stroke();
   }
   ctx.restore();
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
 const interactive=[];series.forEach(s=>s.data.forEach((v,i)=>{if(Number.isFinite(v)&&s.points!==false)interactive.push({x:px(i),y:py(v),label:s.label||'Value',value:v,index:i})}));
 canvas._chartPoints=interactive;canvas._chartOptions=options;
 if(!canvas.dataset.chartInteractive){canvas.dataset.chartInteractive='1';canvas.style.cursor='pointer';canvas.addEventListener('click',ev=>{const rect=canvas.getBoundingClientRect(),sx=canvas.width/rect.width,sy=canvas.height/rect.height,x=(ev.clientX-rect.left)*sx,y=(ev.clientY-rect.top)*sy;let nearest=(canvas._chartPoints||[]).map(p=>({...p,d:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.d-b.d)[0];if(!nearest||nearest.d>55)return;let detail=canvas._chartOptions?.pointDetails?.[nearest.index];let formatted=canvas._chartOptions?.formatY?canvas._chartOptions.formatY(nearest.value):Number(nearest.value).toFixed(1);toast(detail||`${nearest.label}: ${formatted}`)});}
}
function completedWeekSeries(){
 return Array.from({length:weeks()},(_,i)=>weekData(i+1));
}
function drawDonut(canvas,segments,centerLabel='planned',emptyText='No training volume'){ 
 let ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,cx=W*.32,cy=H*.52,r=105,total=sum(segments.map(s=>s.value));
 ctx.clearRect(0,0,W,H);
 if(!total){ctx.fillStyle='#8190a0';ctx.font='600 28px system-ui';ctx.textAlign='center';ctx.fillText(emptyText,W/2,H/2);return}
 let a=-Math.PI/2;
 segments.forEach(s=>{let da=s.value/total*Math.PI*2;ctx.beginPath();ctx.strokeStyle=s.color;ctx.lineWidth=38;ctx.lineCap='butt';ctx.arc(cx,cy,r,a,a+da);ctx.stroke();a+=da});
 ctx.fillStyle='#172536';ctx.font='800 38px system-ui';ctx.textAlign='center';ctx.fillText(Math.round(total)+' km',cx,cy+8);
 ctx.font='20px system-ui';ctx.fillStyle='#748293';ctx.fillText(centerLabel,cx,cy+37);
 ctx.textAlign='left';let y=82;
 segments.forEach(s=>{ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(W*.58,y-6,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#314253';ctx.font='600 22px system-ui';ctx.fillText(s.label,W*.61,y);ctx.fillStyle='#748293';ctx.font='21px system-ui';ctx.fillText(`${s.value.toFixed(1)} km · ${Math.round(s.value/total*100)}%`,W*.61,y+28);y+=65});
}
function intensityGroups(items,distanceKey){
 const dist=x=>Math.max(0,Number(x[distanceKey]??x.distance??x.distanceKm)||0);
 return[
  {label:'Easy / recovery',value:sum(items.filter(x=>['Easy','Recovery','Easy + strides','Shakeout'].includes(x.type)).map(dist)),color:'#2d82c7'},
  {label:'Aerobic endurance',value:sum(items.filter(x=>['Steady aerobic','Medium-long','Progression'].includes(x.type)).map(dist)),color:'#378f91'},
  {label:'Long / specific long',value:sum(items.filter(x=>['Long run','Specific long run','Race rehearsal','Race'].includes(x.type)).map(dist)),color:'#159487'},
  {label:'Threshold / race specific',value:sum(items.filter(x=>['Tempo','Marathon','Threshold','Threshold intervals','Marathon-specific','Half-marathon-specific'].includes(x.type)).map(dist)),color:'#e49b35'},
  {label:'Speed / tests',value:sum(items.filter(x=>['Intervals','Hills','Fartlek','VO₂max intervals','Race-pace intervals','Fitness assessment'].includes(x.type)).map(dist)),color:'#7457c8'}
 ].filter(x=>x.value>0);
}
function roundRect(ctx,x,y,w,h,r){w=Math.max(0,w);r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function drawDashboardCharts(){
 let c=confidence(),arr=completedWeekSeries(),weekLabels=arr.map((_,i)=>'W'+(i+1));
 drawLine($('volumeChart'),[
   {label:'Planned km',data:arr.map(x=>x.planned),color:'#2d82c7',dashed:true,points:false},
   {label:'Completed km',data:arr.map(x=>x.actual),color:'#159487'}
 ],{empty:'No weekly distance data yet',labels:weekLabels,area:false});
 let plannedLong=Array.from({length:weeks()},(_,i)=>state.plan.find(x=>x.week===i+1&&['Long run','Specific long run','Race rehearsal','Progression'].includes(x.type))?.distance??null);
 let completedLong=Array.from({length:weeks()},(_,i)=>{
   let st=weekStart(i+1),en=new Date(st.getTime()+7*DAY);
   let r=state.runs.filter(x=>['Long run','Specific long run','Race rehearsal'].includes(x.type)&&dte(x.date)>=st&&dte(x.date)<en);
   return r.length?Math.max(...r.map(x=>x.distanceKm)):null;
 });
 drawLine($('longRunChart'),[
   {label:'Planned long run',data:plannedLong,color:'#2d82c7',dashed:true,points:false},
   {label:'Completed long run',data:completedLong,color:'#159487'}
 ],{min:0,max:Math.max(state.setup.peakLong*1.12,10),empty:'Log a long run to show completed progression',labels:weekLabels});

 let history=(state.predictionHistory||[]).filter(x=>Number.isFinite(Number(x.seconds))).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const startPrediction=Number(state.programStartPrediction)||initialProgrammePrediction(state.setup)||prediction();
 const targetTime=Number(state.setup.targetTime);
 const predSec=history.map(x=>Number(x.seconds));
 const labels=history.map(x=>dte(x.date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));
 const pointDetails=history.map(x=>`${fmtDate(x.date)} · ${x.source||'Run update'} · ${fmtTime(Number(x.seconds))}`);
 let allSec=[...predSec,startPrediction,targetTime],low=Math.min(...allSec),high=Math.max(...allSec);
 let minSec=Math.max(2*3600,Math.floor((low-1800)/1800)*1800);
 let maxSec=Math.min(7*3600,Math.ceil((high+1800)/1800)*1800);
 if(maxSec-minSec<3600)maxSec=minSec+3600;
 drawLine($('predictionChart'),[
   {label:`Prediction updates${predSec.length?` (${predSec.length})`:''}`,data:predSec,color:'#7457c8'},
   {label:`Programme start ${fmtTime(startPrediction)}`,data:[startPrediction],color:'#68778a',dashed:true,points:false,horizontal:true},
   {label:`Target ${fmtTime(targetTime)}`,data:[targetTime],color:'#d75b67',dashed:true,points:false,horizontal:true}
 ],{min:minSec,max:maxSec,ticks:5,formatY:v=>fmtTime(v),labels,left:98,pointDetails,empty:'No uploaded prediction updates yet'});

}
function coachIntelligenceHtml(p){
 if(p.type==='Rest'||p.type==='Race Day')return'';
 return `<div class="coachWhy"><h4>Coach intelligence</h4><p><b>Why this workout:</b> ${esc(p.whyThis||p.purpose)}</p><p><b>Why this amount:</b> ${esc(p.whyAmount||'The prescribed amount reflects the current phase, weekly load and Weekly Plan Adjustment.')}</p><p><b>If you skip it:</b> ${esc(p.skipImpact||'Do not catch up by stacking sessions. Continue with the next appropriate workout.')}</p></div>`;
}
function workoutHtml(p){let st=status(p);return`<div class="workout" data-id="${p.id}"><div class="workoutHead"><div class="dateBox"><b>${new Date(p.date+'T00:00:00').getDate()}</b><span>${new Date(p.date+'T00:00:00').toLocaleDateString(undefined,{month:'short'})}</span></div><div class="workoutTitle"><h3>${p.type}</h3><p>${p.type==='Rest'?p.purpose:`${p.distance.toFixed(1)} km · ${p.phase}`}</p></div><span class="status ${st}">${st}</span></div><div class="workoutDetails"><div class="targets">${p.type==='Rest'?'':`<div class="target"><small>Main-set pace</small><b>${pace(p.zone.pace)}</b></div><div class="target"><small>Main-set HR</small><b>${p.zone.hr} bpm</b></div><div class="target"><small>Main-set power</small><b>${p.zone.power} W</b></div>`}</div>${p.type==='Rest'?'':`<p class="targetScope">Targets apply to: <b>${esc(p.targetScope||'main set')}</b></p>`}<div class="prescription"><p><b>Warm-up:</b> ${p.warmup}</p><p><b>Main set:</b> ${p.main}</p><p><b>Cooldown:</b> ${p.cooldown}</p>${p.distanceCheck?`<p class="distanceCheck"><b>Distance check:</b> ${esc(p.distanceCheck)} ✓</p>`:''}<p><b>Purpose:</b> ${p.purpose}</p><p><b>Coach guidance:</b> ${p.coach}</p><p><b>Fuel / hydration:</b> ${p.fuel}</p></div>${coachIntelligenceHtml(p)}</div></div>`}

function renderToday(){let p=state.plan.find(x=>x.date===iso(today()));$('todayDate').textContent=today().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});$('todayCard').innerHTML=p?workoutHtml(p):'<div class="panel">No workout scheduled.</div>';$('todayCoach').innerHTML=p?`<div class="note">${p.coach}</div><div class="note good">${p.purpose}</div>`:''}
function renderPlan(){
 const ast=athleteState(state.weekView||currentWeek());if($('fitnessEvidence')){
  const evidence=ast.fitnessEvidence,fitnessTarget=ast.fitnessDelta,recoveryImpact=Math.round((ast.hrv.factor-1)*100);
  const painAction=!ast.pain.count?'Log pain after runs so injury restrictions can be evidence based.':ast.pain.max>=5?'Stop demanding running and reassess before the next session.':ast.pain.max>=3?'Keep running easy; do not add load or intensity.':'No pain-based restriction is currently applied.';
  const completionText=!Number.isFinite(ast.completion)?'No planned distance available':ast.weekComplete?`${Math.round(ast.completion*100)}% of the completed week’s planned km`:`${Math.round(ast.completion*100)}% completed so far; the week remains in progress`;
  const calc=ast.weekComplete&&ast.nextAfd.status==='calculated'?ast.nextAfd:ast.preview;
  const calcTitle=ast.weekComplete&&ast.nextAfd.status==='calculated'?`Final Week ${ast.nextWeek} load calculation`:`Provisional next-review calculation`;
  const appliedTitle=`Applied throughout Week ${ast.currentWeek}`;
  const calcRows=[{name:'Starting factor',adjustment:0,detail:'Every weekly load calculation starts at 1.00.'},...(calc.items||[])];
  const evidenceRows=(evidence.events||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  const confidenceMeaning=evidence.confidence<20?'Very limited evidence; pace and power targets are held stable.':evidence.confidence<50?'Early evidence; only small accumulated changes can affect targets.':evidence.confidence<80?'Moderate evidence; recent execution can meaningfully calibrate targets.':'Strong evidence; pace and power calibration is well supported by recent training and tests.';
  $('fitnessEvidence').innerHTML=`<div class="adaptationPathways"><section class="adaptationPath pacePath"><div class="pathHeader"><span>PACE & POWER PATHWAY</span><strong>${fitnessTarget>=0?'+':''}${fitnessTarget.toFixed(1)}%</strong></div><h3>Fitness calibration</h3><p>Completed-run execution, assessments and races determine whether future pace and power targets should change.</p><div class="pathStats"><span>Evidence confidence <b>${ast.evidenceConfidence}%</b></span><span>Status <b>${esc(ast.fitnessTrend)}</b></span></div><details class="stateDetails"><summary>Show pace and power calculation</summary><p>${esc(confidenceMeaning)}</p><div class="confidenceBands"><span><b>0–19%</b> Very limited</span><span><b>20–49%</b> Early</span><span><b>50–79%</b> Moderate</span><span><b>80–100%</b> Strong</span></div><p class="muted compact">Confidence is the amount of weighted evidence accumulated since the ${esc(evidence.anchorType.toLowerCase())} on ${fmtDate(evidence.anchorDate)}. It is not a fitness score. Targets change only when the accumulated fitness signal produces at least a 0.5% calibration step.</p><div class="evidenceEventList">${evidenceRows.length?evidenceRows.map(e=>`<div><span>${fmtDate(e.date)} · ${esc(e.type)}</span><b>Execution ${Math.round(e.score)}/100</b><small>${(e.confidence/4*100).toFixed(1)} confidence points · fitness signal ${e.delta>=0?'+':''}${e.delta.toFixed(2)}</small></div>`).join(''):'<p class="muted">No qualifying completed-run evidence has accumulated since the current baseline.</p>'}</div><div class="adjustmentCalcTotal"><span>Applied target calibration</span><b>${fitnessTarget>=0?'+':''}${fitnessTarget.toFixed(1)}%</b><small>Applied to future pace and power targets; heart-rate targets remain stable.</small></div></details></section><section class="adaptationPath loadPath"><div class="pathHeader"><span>DISTANCE & LOAD PATHWAY</span><strong>${ast.adjustment.toFixed(2)}</strong></div><h3>${ast.direction}${ast.pct?` ${ast.pct}%`:''} this week</h3><p>Recovery, pain, completed load, efficiency and cardiac drift determine future distance and session load.</p><div class="pathStats"><span>Applied factor <b>${ast.adjustment.toFixed(2)}</b></span><span>Provisional next review <b>${calc.factor.toFixed(2)}</b></span><span>HRV <b>${recoveryImpact?`${recoveryImpact}%`:'0%'}</b></span><span>Training tolerance <b>${esc(ast.tolerance)}</b></span><span>Pain <b>${ast.pain.count?`${ast.pain.max}/10`:'No data'}</b></span></div><p class="pathAction">${esc(painAction)} ${esc(completionText)}.</p><details class="stateDetails"><summary>Show distance and load calculation</summary><div class="adjustmentCalcHeader appliedCalc"><b>${appliedTitle}</b><span>${ast.applied.factor.toFixed(2)}</span></div><p class="muted compact">This finalised factor remains fixed for the whole current week.</p><div class="adjustmentCalcHeader"><b>${calcTitle}</b><span>Current estimate ${calc.factor.toFixed(2)}</span></div><div class="adjustmentCalcTable">${calcRows.map((i,idx)=>`<div class="adjustmentCalcRow"><span>${esc(i.name)}</span><b>${idx===0?'1.00':`${i.adjustment>=0?'+':''}${(i.adjustment*100).toFixed(0)}%`}</b><small>${esc(i.detail)}</small></div>`).join('')}<div class="adjustmentCalcTotal"><span>${ast.weekComplete?'Bounded final factor':'Provisional bounded factor'}</span><b>${calc.factor.toFixed(2)}</b><small>${ast.weekComplete?'Finalised for the next week.':'Visible during the week for transparency; completed-load scoring is added only when the week closes.'} Limited to ${Number(state.setup.minFactor).toFixed(2)}–${Number(state.setup.maxFactor).toFixed(2)}.</small></div></div></details></section></div><div class="adjustmentSchedule"><b>When changes apply</b><p>Week ${ast.currentWeek} keeps factor ${ast.applied.factor.toFixed(2)} for the entire week. The next distance-and-load review is finalised after ${fmtDate(ast.reviewDate)} and applies from ${fmtDate(ast.nextStart)}. Pace and power calibration updates independently whenever enough execution evidence crosses the 0.5% threshold.</p></div>`;
 }
 if(!state.weekView)state.weekView=currentWeek();let arr=state.plan.filter(p=>p.week===state.weekView),wd=weekData(state.weekView),afd=adaptiveFactorDetails(state.weekView),factor=arr[0]?.factor||afd.factor||1;let factorText=afd.status==='pending'?`weekly adjustment pending · currently ${factor.toFixed(2)}`:afd.status==='calculated'?`weekly adjustment ${factor.toFixed(2)} · based on Week ${afd.previousWeek}`:`weekly adjustment ${factor.toFixed(2)}`;$('weekHeader').innerHTML=`<b>Week ${state.weekView} · ${detailedPhase(state.weekView)}</b><br><span class="muted">${fmtDate(iso(weekStart(state.weekView)))} · ${wd.planned.toFixed(1)} km planned · ${wd.actual.toFixed(1)} km completed · ${factorText}</span>`;$('planCards').innerHTML=arr.map(workoutHtml).join('');
 const nextWeek=Math.min(weeks(),currentWeek()+1);
 const nextWeekPlan=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&p.week===nextWeek);
 const completedRuns=state.runs.filter(r=>Number(r.distanceKm)>0&&dte(r.date)<=today());
 const entirePlan=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day');
 if($('nextWeekMixChart'))drawDonut($('nextWeekMixChart'),intensityGroups(nextWeekPlan,'distance'),`week ${nextWeek}`,'No sessions planned next week');
 if($('completedMixChart'))drawDonut($('completedMixChart'),intensityGroups(completedRuns,'distanceKm'),'completed','No completed runs yet');
 if($('overallMixChart'))drawDonut($('overallMixChart'),intensityGroups(entirePlan,'distance'),'full plan','No plan volume');
}
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

function runExecutionBreakdownHtml(r){
 const plan=r.planId?state.plan.find(p=>p.id===r.planId):null,d=workoutScoreDetails(r,plan);
 if(!d)return'<section class="runExecutionBreakdown"><h3>Execution breakdown</h3><p class="muted">Not enough distance and duration information to calculate a score.</p></section>';
 const rows=d.components.map(c=>`<div class="executionCalcRow"><span>${esc(c.name)}</span><b>${Math.round(c.score)}/100</b><small>Effective weight ${Math.round(c.effectiveWeight*100)}%${c.reliability<1?` · ${Math.round(c.reliability*100)}% metric reliability`:''} · ${esc(c.detail)}</small></div>`).join('');
 const paceComp=d.components.find(c=>c.key==='pace'),powerComp=d.components.find(c=>c.key==='power');
 const conflict=paceComp&&powerComp&&Math.abs(paceComp.score-powerComp.score)>=12?`<div class="executionNotice"><b>Pace and power disagree</b><p>Terrain, wind, GPS or whole-run averaging may explain the difference. The coach treats this as mixed evidence rather than assuming either metric is correct on its own.</p></div>`:'';
 return `<section class="runExecutionBreakdown"><div class="executionBreakdownHead"><div><h3>Execution breakdown</h3><p class="muted compact">How this run delivered the intended physiological objective.</p></div><strong>${d.score}/100</strong></div><div class="executionObjective"><small>WORKOUT OBJECTIVE</small><b>${esc(d.objective)}</b><span>${esc(d.interpretation)} · ${esc(d.evidenceQuality)} evidence</span></div>${plan?`<p class="muted compact">Matched to ${fmtDate(plan.date)} · ${esc(plan.type)} · ${plan.distance.toFixed(1)} km.</p>`:'<p class="muted compact">Ad hoc run: only directly observable components are scored. Missing targets reduce evidence quality rather than being awarded neutral points.</p>'}${conflict}<div class="executionCalcTable">${rows}</div><div class="adjustmentCalcTotal"><span>Weighted score before pain adjustment</span><b>${Math.round(d.rawScore)}/100</b>${d.capReason?`<small>${esc(d.capReason)}</small>`:'<small>No pain-related cap applied.</small>'}</div></section>`;
}
function renderRuns(){$('runList').innerHTML=state.runs.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=>{let m=metrics(r),ws=workoutScore(r);return`<div class="runCard clickable" data-run="${r.id}"><div class="runSummary"><div><h3>${fmtDate(r.date)} · ${esc(r.type)}</h3><p>${r.distanceKm.toFixed(2)} km · ${fmtTime(r.durationSec)} · ${pace(m.pace)}</p><p class="muted compact"><b>Plan:</b> ${esc(matchSummary(r))}${ws!=null?` · <b>Workout score ${ws}/100</b>`:''}</p><div class="runStats"><span>HR ${r.avgHr?Math.round(r.avgHr):'—'}</span><span>${r.avgPower?Math.round(r.avgPower):'—'} W</span><span>${dec(m.efficiencyJ,1)} J/beat</span><span>${Number.isFinite(r.powerDrift)?r.powerDrift.toFixed(1)+'% drift':'— drift'}</span><span>${Number.isFinite(Number(r.hrv))?Math.round(Number(r.hrv))+' ms HRV':'— HRV'}</span></div></div><span>›</span></div></div>`}).join('')||'<div class="panel">No completed runs saved yet.</div>'}
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
function renderCoach(){
 const engine=coachEngine(),c=engine.c,pred=engine.pred,gap=pred-state.setup.targetTime,report=evidenceBasedCoach(engine);
 $('coachTop').innerHTML=kpi('Evidence coverage',report.evidenceCoverage+'%','Available verified inputs')+kpi('Predicted time',fmtTime(pred),pace(pred/state.setup.raceDistance))+kpi('Target gap',(gap>=0?'+':'−')+fmtTime(Math.abs(gap)),gap<=0?'Inside target':'Outside target')+kpi('Current phase',phase(currentWeek()));
 $('fullAssessment').innerHTML=coachReportHtml(report,false);
}

function renderRace(){let c=confidence(),pred=prediction(),targetPace=state.setup.targetTime/state.setup.raceDistance,predictedPace=pred/state.setup.raceDistance;$('raceKpis').innerHTML=kpi('Target time',fmtTime(state.setup.targetTime))+kpi('Target pace',pace(targetPace))+kpi('Predicted finish',fmtTime(pred))+kpi('Predicted pace',pace(predictedPace))+kpi('Target HR',Math.round(state.setup.thresholdHr*.92)+' bpm')+kpi('Target power',Math.round(state.setup.criticalPower*.88)+' W')+kpi('Confidence',Math.round(c.overall)+'%');let rd=state.setup.raceDistance,first=Math.max(1,Math.round(rd*.20)),final=Math.max(first+1,Math.round(rd*.75));$('racePacing').innerHTML=`<div class="note"><b>0–${first} km:</b> Start controlled, slightly slower than target pace. Let heart rate rise gradually.</div><div class="note"><b>${first}–${final} km:</b> Settle at target effort and protect fuelling. Avoid reacting to short pace fluctuations.</div><div class="note good"><b>After ${final} km:</b> Progress only when breathing, form and stomach remain stable. Otherwise preserve target effort.</div>`;$('raceFuel').innerHTML='<p><b>Carbohydrate:</b> 60–90 g/hour, practised in long runs.</p><p><b>Fluids:</b> approximately 400–800 ml/hour, adjusted for temperature and sweat rate.</p><p><b>Sodium:</b> use the same product and concentration tested in training.</p>';$('raceRules').innerHTML='<p>Slow down early if heart rate is unusually high at normal power.</p><p>Do not chase lost seconds on hills or crowded sections.</p><p>Use effort rather than pace when conditions are hot, windy or technical.</p>'}
function renderTrainingDays(){
 const box=$('daysGrid');if(!box)return;const enabled=state.days.filter(d=>d[1]),longDay=(enabled.find(d=>d[2]==='Long run')||enabled.at(-1))?.[0];
 box.innerHTML=`<div class="note trainingDayNote"><b>Set availability only</b><p class="muted compact">Tick the days you can run and select exactly one of those as the long-run day. The plan engine assigns every run type automatically according to race distance, phase and recovery.</p></div><div class="trainingDayHeader"><span>Day</span><span>Run</span><span>Long run</span></div>`+state.days.map((d,i)=>`<div class="trainingDayRow"><b>${d[0]}</b><label class="dayChoice"><input data-day="${i}" type="checkbox" ${d[1]?'checked':''}><span>Run</span></label><label class="dayChoice longChoice"><input data-long-day="${i}" name="longRunDay" type="radio" ${d[0]===longDay?'checked':''} ${d[1]?'':'disabled'}><span>Long</span></label></div>`).join('');
 box.querySelectorAll('[data-day]').forEach(cb=>cb.addEventListener('change',()=>{const i=Number(cb.dataset.day),radio=box.querySelector(`[data-long-day="${i}"]`);radio.disabled=!cb.checked;if(!cb.checked&&radio.checked){const replacement=[...box.querySelectorAll('[data-day]')].find(x=>x.checked);if(replacement)box.querySelector(`[data-long-day="${replacement.dataset.day}"]`).checked=true;}if(cb.checked&&![...box.querySelectorAll('[data-long-day]')].some(x=>x.checked))radio.checked=true;}));
}
function renderSettings(){let defs=[['planStart','Plan start','date'],['raceDate','Race date','date'],['raceName','Race name','text'],['raceDistance','Race distance km','number'],['targetTime','Target time','time'],['currentWeekly','Current weekly km','number'],['currentLongest','Current longest run km','number'],['testDistance','Recent test distance km','number'],['testTime','Recent test time','time'],['thresholdHr','Threshold HR','number'],['criticalPower','Critical power W','number'],['bodyWeight','Body weight kg','number'],['maxWeekly','Max weekly km','number'],['growth','Max weekly growth %','percent'],['peakLong','Peak long run km','number'],['taperDays','Taper days','number']];$('settingsGrid').innerHTML=defs.map(d=>{let v=state.setup[d[0]];if(d[2]=='time')v=fmtTime(v);if(d[2]=='percent')v=Math.round(v*100);return`<div class="field"><label>${d[1]}</label><input data-setting="${d[0]}" data-type="${d[2]}" type="${d[2]=='date'?'date':'text'}" value="${esc(v)}"></div>`}).join('');
 let raceDistanceInput=document.querySelector('[data-setting="raceDistance"]');
 const inputSetup=()=>{let x={...state.setup};document.querySelectorAll('[data-setting]').forEach(el=>{let v=el.value,t=el.dataset.type;if(t==='number')v=Number(v);if(t==='time')v=parseTime(v);if(t==='percent')v=Number(v)/100;x[el.dataset.setting]=v});return x};
 const showRecommendedDate=()=>{let r=recommendedRaceDate(inputSetup()),box=$('raceDateRecommendation');if(box)box.innerHTML=`<b>Model-recommended race date: ${fmtDate(r.date)}</b><p class="muted compact">${r.totalWeeks} weeks total: ${r.requiredBuildWeeks.toFixed(1)} estimated build weeks, ${r.taperWeeks.toFixed(1)} taper weeks and an ideal-scenario buffer.</p><button id="recommendRaceDate" type="button" class="secondary">Use this date</button>`;let btn=$('recommendRaceDate');if(btn)btn.onclick=()=>{let dateInput=document.querySelector('[data-setting="raceDate"]');if(dateInput)dateInput.value=r.date;toast(`Recommended race date applied: ${fmtDate(r.date)}.`)};return r};
 $('raceDateRecommendation')?.remove();$('raceDefaultsNote')?.remove();$('settingsGrid').insertAdjacentHTML('afterend',`<div id="raceDefaultsNote" class="note"><b>${raceProfile(state.setup.raceDistance).label} training defaults</b><p class="muted compact">Changing race distance from 5 km through 100 km applies conservative recreational defaults for weekly distance, long run, growth, taper, training frequency and session types. Adjust them for injury history, experience and available time.</p></div>`);
 if(!$('raceDateRecommendation'))if(!$('raceDateRecommendation'))$('settingsGrid').insertAdjacentHTML('afterend','<div id="raceDateRecommendation" class="note"></div>');
 raceDistanceInput?.addEventListener('change',()=>{let d=Number(raceDistanceInput.value);if(!(d>0))return;let profile=raceProfile(d),values=raceProfileValues(d);Object.entries(values).forEach(([key,value])=>{let input=document.querySelector(`[data-setting="${key}"]`);if(input)input.value=key==='growth'?Math.round(value*100):value});applyRaceProfileDays(profile);renderTrainingDays();let r=showRecommendedDate(),dateInput=document.querySelector('[data-setting="raceDate"]');if(dateInput)dateInput.value=r.date;toast(`${profile.label} defaults and recommended race date ${fmtDate(r.date)} applied.`)});
 ['planStart','currentWeekly','currentLongest','maxWeekly','growth','peakLong','taperDays','testDistance','testTime','targetTime'].forEach(key=>document.querySelector(`[data-setting="${key}"]`)?.addEventListener('change',showRecommendedDate));
 showRecommendedDate();
 renderTrainingDays()}
function weeklyCompletedLongs(){
 return Array.from({length:weeks()},(_,i)=>{
   let st=weekStart(i+1),en=new Date(st.getTime()+7*DAY);
   let r=state.runs.filter(x=>dte(x.date)>=st&&dte(x.date)<en);
   return r.length?Math.max(...r.map(x=>Number(x.distanceKm)||0)):null;
 });
}

function recoveryPainState(){
 const recent=(state.runs||[]).filter(r=>Number.isFinite(Number(r.pain))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 if(!recent.length)return{count:0,average:null,max:null,status:'No pain data'};
 const vals=recent.map(r=>Number(r.pain));const average=avg(vals),max=Math.max(...vals);
 const status=max>=5?'Pain needs attention':max>=3?'Monitor pain':'No significant pain signal';
 return{count:vals.length,average,max,status};
}
function hrvDirection(hist){
 const vals=hist.map(x=>x.value);if(vals.length<2)return{symbol:'→',label:'Building',delta:null};
 const short=avg(vals.slice(-Math.min(3,vals.length))),prior=avg(vals.slice(-Math.min(6,vals.length),-Math.min(3,vals.length)));
 if(!Number.isFinite(prior))return{symbol:'→',label:'Building',delta:null};
 const delta=prior?short/prior-1:0;
 return Math.abs(delta)<.03?{symbol:'→',label:'Stable',delta}:{symbol:delta>0?'▲':'▼',label:delta>0?'Improving':'Declining',delta};
}
function recoveryConclusion(hrv,pain){
 if((pain.max??0)>=5||hrv.factor<=.94)return{label:'Recovery compromised',cls:'bad',recommendation:'Reduce intensity and reassess symptoms before the next demanding session.'};
 if((pain.max??0)>=3||hrv.factor<1)return{label:'Monitor',cls:'warn',recommendation:'Continue cautiously. Keep easy running easy and avoid adding unplanned load.'};
 return{label:'Recovered',cls:'good',recommendation:'Recovery evidence supports the planned training load.'};
}
function renderRecovery(){
 const statusBox=$('recoveryStatus');if(!statusBox)return;
 const hrv=hrvModel(),pain=recoveryPainState(),hist=hrvHistory(),dir=hrvDirection(hist),conclusion=recoveryConclusion(hrv,pain);
 const afd=adaptiveFactorDetails(Math.max(1,currentWeek()));
 const maturity=hrv.count===0?'No profile':hrv.count===1?'Provisional':hrv.count<=6?'Early':hrv.count<=20?'Developing':'Established';
 const confidence=hrv.count===0?'No HRV evidence':`${maturity} · ${hrv.count} value${hrv.count===1?'':'s'}`;
 statusBox.innerHTML=`<article class="panel recoveryConclusion ${conclusion.cls}"><div><span>Overall recovery</span><strong>${conclusion.label}</strong><p>${conclusion.recommendation}</p></div><span class="recoveryConfidence">${confidence}</span></article><div class="recoveryMetrics"><div class="metric-card"><span>Current HRV</span><strong class="viz-stat-value">${Number.isFinite(hrv.rolling)?Math.round(hrv.rolling)+' ms':'—'}</strong><small>${dir.symbol} ${dir.label}</small></div><div class="metric-card"><span>Personal baseline</span><strong class="viz-stat-value">${Number.isFinite(hrv.baseline)?Math.round(hrv.baseline)+' ms':'—'}</strong><small>${hrv.count?`${hrv.deviation>=0?'+':''}${Math.round(hrv.deviation*100)}% recent deviation`:'Log HRV with a run'}</small></div><div class="metric-card"><span>HRV status</span><strong class="viz-stat-value recoveryStatusText">${hrv.status}</strong><small>HRV factor ${hrv.factor.toFixed(2)}</small></div><div class="metric-card"><span>Pain signal</span><strong class="viz-stat-value recoveryStatusText">${pain.status}</strong><small>${pain.count?`Recent average ${pain.average.toFixed(1)} / 10`:'No recent ratings'}</small></div></div>`;
 $('hrvTrendBadge').textContent=confidence;
 $('hrvLegend').innerHTML='<span><i class="legendNightly"></i>Nightly HRV</span><span><i class="legendAverage"></i>Recent average</span><span><i class="legendBaseline"></i>Personal baseline</span>';
 const painAdj=painAdjustment(pain),recoveryChange=Math.round(((hrv.factor-1)+painAdj.adjustment)*100);
 $('recoveryAdaptive').innerHTML=`<div class="recoveryContribution"><span>Recovery and pain contribution to next review</span><strong class="${recoveryChange<0?'negative':''}">${recoveryChange?`${recoveryChange}%`:'0%'}</strong><p>${esc(hrv.detail)} ${esc(painAdj.detail)}</p><small>The complete Weekly Plan Adjustment, including completed load, efficiency and cardiac drift, is shown once on the Plan tab.</small></div>`;
 $('hrvExplanation').innerHTML=`<div><b>Starts on day 1</b><p>The first Garmin value creates a provisional baseline. It is shown immediately, but one value cannot reduce the plan.</p></div><div><b>Influence grows with evidence</b><p>2–3 values can reduce future load by at most 1%; 4–6 by 3%; 7–20 by 6%; and 21+ by 10%.</p></div><div><b>Trend, not one night</b><p>The model compares a recent average with your personal median baseline. Wider bands prevent normal nightly variation from causing unnecessary changes.</p></div><div><b>One recovery location</b><p>This tab shows recovery evidence and its contribution only. The complete Weekly Plan Adjustment is calculated and explained on the Plan tab.</p></div>`;
 drawHrvChart();
}
function drawHrvChart(){
 const canvas=$('hrvChart');if(!canvas)return;const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,hist=hrvHistory(),model=hrvModel();ctx.clearRect(0,0,W,H);
 if(!hist.length){ctx.fillStyle='#8190a0';ctx.font='600 27px system-ui';ctx.textAlign='center';ctx.fillText('Log previous-night Garmin HRV to start the trend',W/2,H/2);return}
 const shown=hist.slice(-28),vals=shown.map(x=>x.value),base=Number.isFinite(model.baseline)?model.baseline:median(vals),recentN=model.count<=3?model.count:model.count<=6?3:7;
 const rolling=shown.map((x,i)=>avg(shown.slice(Math.max(0,i-recentN+1),i+1).map(y=>y.value)));
 let min=Math.min(...vals,base*.62),max=Math.max(...vals,base*1.18),pad=Math.max(3,(max-min)*.08);min=Math.max(0,min-pad);max+=pad;
 const left=78,right=24,top=34,bottom=70,cw=W-left-right,ch=H-top-bottom,px=i=>shown.length===1?left+cw/2:left+i*cw/(shown.length-1),py=v=>top+(max-v)/(max-min)*ch;
 const bands=[{from:min,to:base*.65,fill:'rgba(197,73,63,.10)'},{from:base*.65,to:base*.75,fill:'rgba(224,157,42,.10)'},{from:base*.75,to:max,fill:'rgba(55,151,91,.08)'}];
 bands.forEach(b=>{const y1=py(Math.min(max,b.to)),y2=py(Math.max(min,b.from));ctx.fillStyle=b.fill;ctx.fillRect(left,y1,cw,Math.max(0,y2-y1))});
 ctx.font='20px system-ui';ctx.textAlign='right';for(let i=0;i<5;i++){const v=min+(max-min)*i/4,y=py(v);ctx.strokeStyle='#e5ebf0';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(W-right,y);ctx.stroke();ctx.fillStyle='#748293';ctx.fillText(Math.round(v),left-12,y+7)}
 ctx.save();ctx.strokeStyle='#8793a1';ctx.setLineDash([14,10]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(left,py(base));ctx.lineTo(W-right,py(base));ctx.stroke();ctx.restore();
 ctx.strokeStyle='#58a65c';ctx.lineWidth=4;ctx.beginPath();rolling.forEach((v,i)=>i?ctx.lineTo(px(i),py(v)):ctx.moveTo(px(i),py(v)));ctx.stroke();
 ctx.strokeStyle='#2d82c7';ctx.lineWidth=4;ctx.beginPath();vals.forEach((v,i)=>i?ctx.lineTo(px(i),py(v)):ctx.moveTo(px(i),py(v)));ctx.stroke();vals.forEach((v,i)=>{ctx.fillStyle='#2d82c7';ctx.beginPath();ctx.arc(px(i),py(v),6,0,Math.PI*2);ctx.fill()});
 ctx.font='18px system-ui';ctx.fillStyle='#748293';ctx.textAlign='center';const step=Math.max(1,Math.ceil(shown.length/6));shown.forEach((x,i)=>{if(i%step&&i!==shown.length-1)return;const d=dte(x.date);ctx.fillText(`${d.getDate()}/${d.getMonth()+1}`,px(i),H-32)});ctx.save();ctx.translate(24,H/2);ctx.rotate(-Math.PI/2);ctx.fillText('HRV (ms)',0,0);ctx.restore();
}
function renderPlanHealth(){
 const box=$('planHealthContent');if(!box)return;
 const report=validatePlan(state.plan);state.lastPlanHealth=report;
 const cls=report.errors?'bad':report.warnings?'warn':'good';
 box.innerHTML=`<div class="healthConclusion ${cls}"><b>${report.valid?'✓ Plan passed all validation checks':'⚠ Plan validation needs attention'}</b>${report.valid?'':`<span>${report.errors} error${report.errors===1?'':'s'} · ${report.warnings} warning${report.warnings===1?'':'s'}</span>`}</div>`;
}
function renderMigrationReport(){const box=$('migrationReport');if(!box)return;const m=state.migration||migrationReport;box.innerHTML=`<div class="migrationStatus good"><b>Upgrade status: ${esc(m.status||'ready')}</b><span>Schema ${esc(m.from??'new')} → ${SCHEMA}</span><span>${Number(m.runs)||0} runs · ${Number(m.assessments)||0} assessments preserved</span><span>${Number(m.fieldsRecovered)||0} invalid or missing fields repaired</span><small>Storage source: ${esc(m.source||migrationReport.source||STORAGE_KEY)}</small></div>`;}
function renderAll(){[renderDashboard,renderToday,renderPlan,renderRuns,renderMetrics,renderAssessments,renderCoach,renderRecovery,renderRace,renderSettings,renderPlanHealth,renderMigrationReport].forEach(fn=>{try{fn()}catch(err){recordDiagnostic('Render failure in '+fn.name,err)}});renderDiagnostics()}
const pages=[['dashboard','Dashboard'],['recovery','Recovery'],['today','Today'],['plan','Plan'],['runs','Runs'],['assessments','Assessments'],['race','Race day'],['settings','Settings']];
$('nav').innerHTML=pages.map((p,i)=>`<button data-page="${p[0]}" class="${i?'':'active'}">${p[1]}</button>`).join('');$('nav').onclick=e=>{let p=e.target.dataset.page;if(!p)return;document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===p));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===p));renderAll();scrollTo(0,0)};document.body.onclick=e=>{if(e.target.dataset.go){document.querySelector(`[data-page="${e.target.dataset.go}"]`).click()}let factorToggle=e.target.closest('.factorToggle');if(factorToggle){let tile=factorToggle.closest('.factorKpi'),open=tile.classList.toggle('open');factorToggle.setAttribute('aria-expanded',String(open));return}let w=e.target.closest('.workout');if(w&&!e.target.closest('button'))w.classList.toggle('open')};
$('prevWeek').onclick=()=>{state.weekView=clamp((state.weekView||currentWeek())-1,1,weeks());renderPlan()};$('nextWeek').onclick=()=>{state.weekView=clamp((state.weekView||currentWeek())+1,1,weeks());renderPlan()};$('thisWeek').onclick=()=>{state.weekView=currentWeek();renderPlan()};

function runEditorHtml(r){
 if((r.sourceFormat==='csv-timeseries'||String(r.id||'').startsWith('stryd-'))&&Number(r.avgPower)>0&&Number(r.avgPower)<20){
   r.avgPower=Math.round(Number(r.avgPower)*(Number(state.setup.bodyWeight)||1));
 }
 return `<h2>Edit run</h2><div class="formGrid">
  <div class="field"><label>Date</label><input id="erDate" type="date" value="${r.date}"></div>
  <div class="field"><label>Run type</label><select id="erType">${['Easy','Easy + strides','Recovery','Shakeout','Steady aerobic','Medium-long','Progression','Long run','Specific long run','Race rehearsal','Hills','Fartlek','Threshold','Threshold intervals','VO₂max intervals','Race-pace intervals','Half-marathon-specific','Marathon-specific','Fitness assessment','Race'].map(x=>`<option ${r.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Distance km</label><input id="erDistance" type="number" step="0.01" value="${Number(r.distanceKm).toFixed(2)}"></div>
  <div class="field"><label>Duration</label><input id="erDuration" value="${fmtTime(r.durationSec)}"></div>
  <div class="field"><label>Average HR</label><input id="erHr" type="number" value="${Number.isFinite(r.avgHr)?Math.round(r.avgHr):''}"></div>
  <div class="field"><label>Average power</label><input id="erPower" type="number" value="${Number.isFinite(r.avgPower)?Math.round(r.avgPower):''}"></div>
  <div class="field"><label>RPE 1–10 <small class="muted">1 easy · 10 maximal</small></label><input id="erRpe" type="number" min="1" max="10" value="${r.rpe??''}"></div>
  <div class="field"><label>Pain 0–10 <small class="muted">0 none · 5 affects form</small></label><input id="erPain" type="number" min="0" max="10" value="${r.pain??''}"></div>
  <div class="field"><label>Previous-night Garmin HRV (ms)</label><input id="erHrv" type="number" min="1" max="250" value="${r.hrv??''}"><small class="muted">Enter Garmin's Overnight Average from the night before this run.</small></div>
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
  hrv:$('erHrv').value===''?null:Number($('erHrv').value),recovery:null,notes:$('erNotes').value};
 applyRunMatch(updated,$('erPlanMatch').value,'user');
 return updated;
}
$('runList').onclick=e=>{
 let card=e.target.closest('[data-run]');if(!card)return;
 let r=state.runs.find(x=>x.id===card.dataset.run);if(!r)return;
 if(r.source==='assessment'&&r.assessmentId){
   $('modalContent').innerHTML=runExecutionBreakdownHtml(r)+`<div class="note">This run was created from a fitness assessment. Edit it from the Assessments tab so both records remain synchronized.</div>`;
   $('modal').className='modal';
   return;
 }
 $('modalContent').innerHTML=runExecutionBreakdownHtml(r)+runEditorHtml(r)+`<button id="deleteEditedRun" class="danger buttonLike full">Delete run</button>`;
 $('modal').className='modal';
 bindEditorPlanRefresh(r);
 $('saveRunEdit').onclick=()=>{
   try{
    let updated=updatedRunFromForm(r),i=state.runs.findIndex(x=>x.id===r.id);
    if(i<0)throw Error('Run not found.');
    state.runs[i]=updated;recordPredictionSnapshot(updated.date,'Run update',updated.id);save();$('modal').className='modal hidden';renderAll();toast('Run updated.');
   }catch(err){toast(err.message,true)}
 };
 $('deleteEditedRun').onclick=()=>{
   if(!confirm('Delete this run?'))return;
   state.runs=state.runs.filter(x=>x.id!==r.id);state.predictionHistory=(state.predictionHistory||[]).filter(x=>x.entityId!==r.id);save();$('modal').className='modal hidden';renderAll();toast('Run deleted.');
 };
};
$('manualRunBtn').onclick=()=>{
 let r={id:'manual-'+Date.now(),date:iso(today()),type:'Easy',distanceKm:'',durationSec:null,avgHr:null,avgPower:null,rpe:null,pain:null,recovery:null,hrv:null,notes:''};
 $('modalContent').innerHTML=runEditorHtml(r);
 $('modal').className='modal';
 bindEditorPlanRefresh(r);
 $('saveRunEdit').onclick=()=>{
   try{let created=updatedRunFromForm(r);state.runs.push(created);recordPredictionSnapshot(created.date,'Run saved',created.id);save();$('modal').className='modal hidden';renderAll();toast('Run saved.')}catch(err){toast(err.message,true)}
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
    <div class="field"><label>Run type</label><select id="iType"><option>Easy</option><option>Easy + strides</option><option>Recovery</option><option>Shakeout</option><option>Steady aerobic</option><option>Medium-long</option><option>Progression</option><option>Long run</option><option>Specific long run</option><option>Race rehearsal</option><option>Hills</option><option>Fartlek</option><option>Threshold</option><option>Threshold intervals</option><option>VO₂max intervals</option><option>Race-pace intervals</option><option>Half-marathon-specific</option><option>Marathon-specific</option><option>Fitness assessment</option><option>Race</option></select></div>
    <div class="field"><label>Link to planned workout</label><select id="iPlanMatch"></select><small class="muted">Confirm a planned workout, choose ad hoc, or leave unresolved.</small></div>
    <div class="field"><label>RPE 1–10 <small class="muted">1 very easy · 10 maximal</small></label><input id="iRpe" type="number" min="1" max="10"></div>
    <div class="field"><label>Pain 0–10 <small class="muted">0 none · 5 affects form · 10 extreme</small></label><input id="iPain" type="number" min="0" max="10"></div>
    <div class="field"><label>Previous-night Garmin HRV (ms)</label><input id="iHrv" type="number" min="1" max="250"><small class="muted">Garmin Overnight Average from the night before this run.</small></div>
    <div class="field"><label>Notes</label><input id="iNotes"></div>
   </div>
   <button id="saveImport" class="primary full">Save analysed run</button>`;
   const sameDayPlan=state.plan.find(p=>p.type!=='Rest'&&p.type!=='Race Day'&&p.date===preview.date&&!state.runs.some(r=>r.planId===p.id));
   if(sameDayPlan){$('iType').value=sameDayPlan.type==='Fitness assessment'?'Fitness assessment':sameDayPlan.type}
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
        hrv:$('iHrv').value===''?null:Number($('iHrv').value),recovery:null,
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
      reconcileExactDateMatches();
      recordPredictionSnapshot(preview.date,'Stryd import',preview.id);
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
$('addAssessmentBtn').onclick=()=>{$('assessmentForm').className='panel';$('assessmentForm').innerHTML=`<h3>Fitness assessment result</h3><div class="formGrid"><div class="field"><label>Date</label><input id="aDate" type="date" value="${iso(today())}"></div><div class="field"><label>Distance km</label><input id="aDist" value="5"></div><div class="field"><label>Time</label><input id="aTime" placeholder="25:15"></div><div class="field"><label>Average / threshold HR</label><input id="aHr" value="${state.setup.thresholdHr}"></div><div class="field"><label>Average / critical power W</label><input id="aCp" value="${state.setup.criticalPower}"></div><div class="field"><label>Valid result</label><select id="aValid"><option value="true">Yes</option><option value="false">No</option></select></div></div><button id="saveAssessment" class="primary full">Save assessment and completed run</button>`;$('saveAssessment').onclick=()=>{let a={id:'a-'+Date.now(),date:$('aDate').value,distance:Number($('aDist').value),time:parseTime($('aTime').value),thresholdHr:Number($('aHr').value),criticalPower:Number($('aCp').value),valid:$('aValid').value==='true'};if(!a.date||!a.distance||!a.time)return toast('Complete date, distance and time.',true);state.assessments.push(a);syncAssessmentRun(a);buildPlan();syncAssessmentRun(a);recordPredictionSnapshot(a.date,'Fitness assessment',a.id);save();renderAll();$('assessmentForm').className='hidden';toast(a.valid?'Assessment saved, added to run history and applied to future targets.':'Assessment saved and added to run history, but not applied to prediction.')}};

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
$('saveSettings').onclick=()=>{let candidate={...state.setup};document.querySelectorAll('[data-setting]').forEach(el=>{let k=el.dataset.setting,t=el.dataset.type,v=el.value;if(t==='number')v=Number(v);if(t==='time')v=parseTime(v);if(t==='percent')v=Number(v)/100;candidate[k]=v});let errors=validateSetup(candidate);if(errors.length)return toast(errors[0],true);let selectedDays=[...document.querySelectorAll('[data-day]')].filter(el=>el.checked).length;if(selectedDays<1)return toast('Select at least one training day.',true);const baselineKeys=['planStart','raceDistance','targetTime','testDistance','testTime','currentWeekly','currentLongest','maxWeekly','peakLong'];const baselineChanged=baselineKeys.some(k=>String(candidate[k])!==String(state.setup[k]));state.setup=candidate;if(baselineChanged){state.programStartPrediction=initialProgrammePrediction(candidate);state.predictionHistory=[];}document.querySelectorAll('[data-day]').forEach(el=>state.days[Number(el.dataset.day)][1]=el.checked);let longRadio=document.querySelector('[data-long-day]:checked'),longIdx=longRadio?Number(longRadio.dataset.longDay):null;if(longIdx==null||!state.days[longIdx]?.[1])return toast('Select one enabled running day as the long-run day.',true);state.days.forEach((d,i)=>d[2]=i===longIdx?'Long run':'Adaptive');buildPlan();state.weekView=currentWeek();save();renderAll();toast('Settings saved. Training frequency and race outlook and preparation model were recalculated; future workouts rebuilt.')};
function download(n,t,m){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('planHealthBtn').onclick=()=>{renderPlanHealth();const ok=validatePlan(state.plan).valid;toast(ok?'Plan validation passed.':'Plan validation found issues.',!ok)};
$('backupBtn').onclick=()=>download('ai-running-coach-backup.json',JSON.stringify(state,null,2),'application/json');$('restoreFile').onchange=e=>e.target.files[0]?.text().then(t=>{let candidate=JSON.parse(t);if(!validateBackup(candidate))throw new Error('Backup structure is incomplete.');let errors=validateSetup(candidate.setup);if(errors.length)throw new Error(errors[0]);candidate.schemaVersion=SCHEMA;candidate.plan=Array.isArray(candidate.plan)?candidate.plan:[];state=candidate;buildPlan();save();renderAll();toast('Backup restored and migrated.')}).catch(err=>toast(err?.message||'Invalid backup.',true));$('exportBtn').onclick=()=>download('run-log.csv',['Date,Type,Distance km,Duration sec,HR,Power,RPE,Pain,Previous-night Garmin HRV,Match status,Plan ID,Day offset,Notes',...state.runs.map(r=>[r.date,r.type,r.distanceKm,r.durationSec,r.avgHr,r.avgPower,r.rpe,r.pain,r.hrv??'',r.matchStatus||'',r.planId||'',r.dayOffset??'',`"${String(r.notes||'').replaceAll('"','""')}"`].join(','))].join('\n'),'text/csv');$('resetBtn').onclick=()=>{if(confirm('Delete all app data?')){state=defaults();buildPlan();save();renderAll();toast('App reset.')}};
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('installBtn').className='install'});$('installBtn').onclick=()=>deferred?.prompt();
$('pillarCards')?.addEventListener('click',e=>{const card=e.target.closest('.pillarCard');if(!card||e.target.closest('summary'))return;const detail=card.querySelector('.pillarExplain');if(!detail)return;card.classList.toggle('open');detail.open=card.classList.contains('open');card.setAttribute('aria-expanded',String(detail.open))});
$('pillarCards')?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('pillarCard')){e.preventDefault();e.target.click()}});
const brandVersion=document.querySelector('.brand-copy p');if(brandVersion)brandVersion.textContent=`Race-specific adaptive planning • v9.3.8 · build ${BUILD}`;
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register(`service-worker.js?v=${BUILD}`,{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
migrateAssessmentRuns();
migrateImportedPower();
if(reconcilePredictionHistory())save();
renderAll();
console.info('AI Running Coach v9.3.8 stable build 9380');
})();