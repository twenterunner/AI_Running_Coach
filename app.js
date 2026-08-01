let preview=null;
(()=>{'use strict';
const DAY=86400000, $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
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
const BUILD=10120, SCHEMA=10120, STORAGE_KEY='arc_v62_web', MIRROR_KEY='arc_v8500_web', BACKUP_KEY='arc_pre8500_backup';
const defaults=()=>{let start=iso(new Date()),setup={planStart:start,raceDate:start,raceName:'Goal Race',raceDistance:42.195,targetTime:15300,currentWeekly:35,currentLongest:18,testDistance:5,testTime:1515,thresholdHr:168,criticalPower:300,bodyWeight:93,maxWeekly:65,growth:.07,peakLong:32,taperDays:14,minFactor:.85,maxFactor:1.05,adaptive:true};setup.raceDate=recommendedRaceDate(setup).date;return({schemaVersion:SCHEMA,setup,days:FIVE_DAY_TEMPLATE.map(d=>[...d]),runs:[],assessments:[],injuries:[],activeInjuryPlanId:null,plan:[],weekView:null,migration:{to:SCHEMA,status:'new',time:new Date().toISOString()}})};
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
 const injuries=Array.isArray(src.injuries)?src.injuries.filter(Boolean).map(i=>({...i,checkIns:Array.isArray(i.checkIns)?i.checkIns.filter(Boolean):[]})):[];
  const plan=Array.isArray(src.plan)?src.plan.filter(Boolean).map(x=>({...x,week:Number(x.week)||1,distance:Number(x.distance)||0,factor:Number(x.factor)||1,zone:{...(x.zone||{}),pace:Number(x.zone?.pace)||0,hr:Number(x.zone?.hr)||0,power:Number(x.zone?.power)||0}})):[];
 migrationReport={...migrationReport,from:Number(src.schemaVersion)||'legacy',to:SCHEMA,status:'success',runs:runs.length,assessments:assessments.length,fieldsRecovered:recovered};
 let predictionHistory=Array.isArray(src.predictionHistory)?src.predictionHistory.filter(x=>x&&x.date&&Number.isFinite(Number(x.seconds))).map(x=>({...x,seconds:Number(x.seconds)})):[];
 const standaloneRuns=runs.filter(r=>r.source!=='assessment').length,maxTrendEvents=standaloneRuns+assessments.length;
 if(maxTrendEvents===0)predictionHistory=[];else if(predictionHistory.every(x=>!x.entityId)&&predictionHistory.length>maxTrendEvents)predictionHistory=predictionHistory.slice(-maxTrendEvents);
 const storedStart=Number(src.programStartPrediction);const programStartPrediction=Number.isFinite(storedStart)?storedStart:initialProgrammePrediction(setup);
 return{...base,...src,schemaVersion:SCHEMA,setup,days:Array.isArray(src.days)&&src.days.length?src.days:base.days,runs,assessments,injuries,plan,predictionHistory,programStartPrediction,weekView:Number(src.weekView)||null,migration:{...migrationReport,time:new Date().toISOString()}};
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
function raceTimeRemaining(){const days=Math.max(0,Math.ceil((dte(state.setup.raceDate)-today())/DAY));return{days,weeks:Math.ceil(days/7),label:days<14?`${days} ${days===1?'day':'days'}`:`${Math.ceil(days/7)} weeks`}}
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
 const executionPillar=c.pillars.find(p=>p.name==='Plan execution');
 const health=healthPillar&&healthPillar.coverage>0?healthPillar.score:75;
 const observedExecution=executionPillar&&Number.isFinite(executionPillar.score)?executionPillar.score:85;
 const completionAssumption=clamp((observedExecution/100)*.55+.40,.75,.93);
 const tolerance=clamp((health/100)*(.82+Math.min(1,c.trainingOpportunity/100)*.18),.45,1);
 const projectedPillars=c.pillars.map(p=>{
  let score=Number.isFinite(p.score)?p.score:50;
  if(p.name==='Marathon preparation')score=clamp(score+(profile.score-score)*timePotential*tolerance*completionAssumption,0,100);
  if(p.name==='Plan execution')score=completionAssumption*100;
  if(p.name==='HRV & health')score=health;
  return{...p,currentScore:p.score,projectedScore:score};
 });
 const overall=clamp(sum(projectedPillars.map(p=>p.projectedScore*p.weight))/sum(projectedPillars.map(p=>p.weight)),0,100);
 return{pillars:projectedPillars,overall,timePotential,tolerance,health,profile,completionAssumption};
}
function fitnessProjectionModel(c,projectedPreparation,planHealthScore){
 const profile=projectedPreparation.profile,weeks=Math.max(0,c.usableBuildWeeks),timePotential=1-Math.exp(-.14*weeks);
 const completion=clamp(Number(projectedPreparation.completionAssumption)||.85,.75,.93),health=clamp(projectedPreparation.health/100,.45,1),opportunity=clamp(c.trainingOpportunity/100,.45,1),planQuality=clamp((Number(planHealthScore)||0)/100,.25,1);
 const currentFitness=trainingEvidence().adjustment,currentWeekly=Math.max(1,Number(state.setup.currentWeekly)||1),plannedPeak=Math.max(currentWeekly,profile.plannedPeak);
 const volumeRise=clamp(plannedPeak/currentWeekly-1,0,1.5),volumePotential=2.25*(1-Math.exp(-1.25*volumeRise))*timePotential;
 const qualityFit=clamp(1-Math.abs(profile.qualityShare-.20)/.20,0,1),qualityPotential=1.35*qualityFit*timePotential;
 const frequencyPotential=.75*clamp((profile.enabledDays-2)/3,0,1)*timePotential;
 const durationPotential=1.10*timePotential;
 const specificityPotential=.85*clamp((profile.longScore+profile.intensityScore)/200,0,1)*timePotential;
 const common=planQuality*health*opportunity*completion;
 const diminishing=clamp(1-(currentFitness-1)*4,.55,1.10);
 const contributions=[
  {name:'Weekly-volume progression',potential:volumePotential},
  {name:'Quality-session stimulus',potential:qualityPotential},
  {name:'Training frequency',potential:frequencyPotential},
  {name:'Time available to adapt',potential:durationPotential},
  {name:'Race-specific stimulus',potential:specificityPotential}
 ].map(x=>({...x,realised:x.potential*common*diminishing}));
 const rawPercent=sum(contributions.map(x=>x.realised));
 const expectedGain=clamp(rawPercent/100,0,.08);
 return{expectedGain,projectedFitness:clamp(currentFitness*(1+expectedGain),.90,1.15),contributions,common,diminishing,timePotential,currentFitness,rawPercent};
}
function taperProjectionModel(profile,completion){
 const total=weeks(),taperWeeks=Math.max(1,Math.ceil((Number(state.setup.taperDays)||0)/7)),start=Math.max(1,total-taperWeeks+1);
 const weekly=[];for(let w=1;w<=total;w++)weekly.push({week:w,km:sum(state.plan.filter(p=>p.week===w&&p.type!=='Rest'&&p.type!=='Race Day').map(p=>Number(p.distance)||0)),quality:state.plan.filter(p=>p.week===w&&['Tempo','Intervals','Threshold','Threshold intervals','Marathon-specific','Half-marathon-specific','Hills','Fartlek','VO₂max intervals','Race-pace intervals','Specific long run','Race rehearsal'].includes(p.type)).length});
 const pre=weekly.filter(x=>x.week<start&&x.km>0).slice(-4),taper=weekly.filter(x=>x.week>=start&&x.km>0);
 const baseline=pre.length?sum(pre.map(x=>x.km))/pre.length:Math.max(1,Number(state.setup.currentWeekly)||1);
 const ratios=taper.map(x=>x.km/Math.max(1,baseline));
 const avgRatio=ratios.length?sum(ratios)/ratios.length:1,averageReduction=clamp(1-avgRatio,0,1);
 const durationScore=profile.taperDays>=10&&profile.taperDays<=21?100:profile.taperDays>=7&&profile.taperDays<=28?70:35;
 const reductionScore=clamp(100-Math.abs(averageReduction-.48)*220,0,100);
 const progressive=ratios.length<2?70:sum(ratios.slice(1).map((r,i)=>r<=ratios[i]+.08?1:0))/Math.max(1,ratios.length-1)*100;
 const intensityScore=taper.length?clamp(sum(taper.map(x=>x.quality))/Math.max(1,taper.length)*85,25,100):35;
 const score=.30*durationScore+.35*reductionScore+.20*progressive+.15*intensityScore;
 const preLoad=clamp(baseline/Math.max(20,Number(state.setup.currentWeekly)||20),.55,1.35);
 const gain=clamp(.022*(score/100)*clamp(Number(completion)||.85,.75,.93)*preLoad,0,.025);
 return{gain,score,durationScore,reductionScore,progressiveScore:progressive,intensityScore,averageReduction,baseline,taperWeeks,ratios};
}
function planHealthAssessment(c=confidence()){
 const profile=planSettingsProfile(c),validation=validatePlan(state.plan);
 const components=[
  {name:'Weekly-volume design',score:profile.volumeScore,weight:.18,detail:`Peak ${profile.plannedPeak.toFixed(1)} km/week compared with the configured starting load and race profile.`},
  {name:'Long-run progression',score:profile.longScore,weight:.18,detail:`Peak long run ${profile.peakLong.toFixed(1)} km compared with the target-distance requirement.`},
  {name:'Progression safety',score:profile.progressionScore,weight:.16,detail:`Configured maximum weekly growth ${(profile.growth*100).toFixed(1)}%.`},
  {name:'Intensity distribution',score:profile.intensityScore,weight:.14,detail:`${Math.round(profile.qualityShare*100)}% quality and ${Math.round(profile.easyShare*100)}% easy/long-run distance.`},
  {name:'Taper structure',score:profile.taperScore,weight:.14,detail:`${profile.taperDays} taper days with generated volume reduction.`},
  {name:'Training frequency',score:profile.frequencyScore,weight:.10,detail:`${profile.enabledDays} enabled running days per week.`},
  {name:'Target reachability',score:profile.reachabilityScore,weight:.10,detail:'Available build time compared with the progression needed to reach the planned peak safely.'}
 ];
 let score=sum(components.map(x=>x.score*x.weight));
 score=clamp(score-validation.errors*8-validation.warnings*2,0,100);
 const recommendations=[];
 if(profile.volumeScore<70)recommendations.push(`Align peak weekly distance more closely with the ${raceProfile().label} requirement while respecting your current ${Number(state.setup.currentWeekly).toFixed(0)} km/week baseline.`);
 if(profile.longScore<70)recommendations.push(`Increase the peak long run gradually toward a race-appropriate level, provided pain and recovery remain acceptable.`);
 if(profile.progressionScore<75)recommendations.push(`Reduce maximum weekly growth from ${(profile.growth*100).toFixed(0)}% to approximately 5–10% and use recovery weeks.`);
 if(profile.intensityScore<75)recommendations.push('Keep most distance easy and limit demanding quality work to a sustainable share of total volume.');
 if(profile.taperScore<75)recommendations.push('Use a progressive 10–21 day taper with reduced volume while retaining small doses of intensity.');
 if(profile.frequencyScore<60)recommendations.push('Distribute the planned load across an additional running day if your schedule and injury history allow.');
 if(profile.reachabilityScore<75)recommendations.push('Extend the preparation period or reduce peak targets so the plan does not require rushed progression.');
 if(validation.errors)recommendations.unshift(`Resolve ${validation.errors} structural validation error${validation.errors===1?'':'s'} before following the plan.`);
 if(!recommendations.length)recommendations.push('No material structural change is recommended. Continue to let recovery and execution govern weekly adaptation.');
 const label=score>=90?'Excellent':score>=80?'Strong':score>=70?'Good':score>=60?'Needs refinement':'High risk';
 return{score,label,components,recommendations,validation,profile};
}
function programmeProjection(c,currentPred,projectedPreparation){
 const latest=state.assessments.filter(a=>a.valid).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const testTime=latest?latest.time:state.setup.testTime,testDist=Math.max(.1,latest?latest.distance:state.setup.testDistance);
 const profile=projectedPreparation.profile,healthAssessment=planHealthAssessment(c),planHealthScore=healthAssessment.score;
 const weeksRemaining=Math.max(0,c.usableBuildWeeks),saturation=1-Math.exp(-.12*weeksRemaining);
 const health=clamp(projectedPreparation.health/100,.45,1),planQuality=clamp(planHealthScore/100,.25,1);
 const extrapolation=clamp(Math.log(Math.max(1,state.setup.raceDistance/testDist))/Math.log(42.195/5),0,1);
 const projectedDurability=clamp(.35+.65*planQuality*saturation*health*projectedPreparation.completionAssumption,0,1);
 const projectedExponent=1.06+.055*(1-projectedDurability)*extrapolation;
 const durabilityTime=testTime*Math.pow(state.setup.raceDistance/testDist,projectedExponent);
 const fitness=fitnessProjectionModel(c,projectedPreparation,planHealthScore);
 const taper=taperProjectionModel(profile,projectedPreparation.completionAssumption);
 const predictedTime=durabilityTime/Math.max(.90,fitness.projectedFitness)*(1-taper.gain);
 const improvementSec=Math.max(0,currentPred-predictedTime);
 return{predictedTime,improvementSec,improvementPct:currentPred>0?improvementSec/currentPred:0,projectedExponent,fitnessGainPct:fitness.expectedGain,taperGain:taper.gain,planQuality:planHealthScore,planHealthScore,profile,projectedFitnessIndex:fitness.projectedFitness*100,projectedDurabilityIndex:Math.round(projectedDurability*100),completionAssumption:projectedPreparation.completionAssumption,fitnessProjection:fitness,taperProjection:taper};
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
 const p=raceProfile(),dp=detailedPhase(currentWeek()),remaining=raceTimeRemaining(),weeksLeft=remaining.weeks;
 const map={
  '5k':{Foundation:'easy consistency, hills and relaxed strides',Aerobic:'threshold development and aerobic support',Development:'VO₂max and repeatable speed',Specific:'5 km-pace execution and economy',Peak:'sharpness without excess fatigue',Taper:'freshness and short race-pace reminders'},
  '10k':{Foundation:'aerobic consistency and relaxed speed',Aerobic:'threshold development',Development:'threshold durability with selective VO₂max work',Specific:'10 km-pace control',Peak:'race-specific sharpness',Taper:'freshness and pace confidence'},
  half:{Foundation:'aerobic consistency',Aerobic:'threshold endurance and medium-long running',Development:'sustained threshold durability',Specific:'half-marathon-effort control under fatigue',Peak:'specific endurance with controlled recovery cost',Taper:'freshness while retaining race rhythm'},
  marathon:{Foundation:'durable easy running and safe consistency',Aerobic:'aerobic volume and medium-long endurance',Endurance:'weekly-volume tolerance and long-run durability',Specific:'marathon-effort economy, fuelling and fatigue resistance',Peak:'race rehearsal and controlled peak endurance',Taper:'fatigue reduction while preserving marathon rhythm'},
  ultra:{Foundation:'time-on-feet tolerance',Aerobic:'aerobic durability and terrain strength',Endurance:'long-run resilience and fuelling tolerance',Specific:'terrain, run-walk and race-execution rehearsal',Peak:'final durability rehearsal without overload',Taper:'freshness and logistical readiness'}
 };
 const key=profileMatrixKey(p);return{priority:(map[key]||map.marathon)[dp]||'consistent race-specific preparation',phase:dp,weeksLeft,remainingLabel:remaining.label,profile:p};
}
function evidenceBasedCoach(engine){
 const c=engine.c,ast=athleteState(engine.cw),execution=executionScoreSummary(),components=uniqueComponents(c.components.filter(i=>i.hasEvidence&&Number.isFinite(i.displayScore))),race=raceSpecificPriority();
 let findings=components.map(item=>{const evidence=componentEvidence(c,item),confidence=evidenceConfidence(item.evidenceFraction??1,evidence.facts.length),impact=impactForComponent(item.name),score=Number(item.displayScore);return{...item,score,confidence,impact,evidence,status:score>=80?'strength':score<70?'opportunity':'watch',priority:(100-score)*impact*confidence.rank}});
 const pain=findings.find(x=>x.name==='Pain status'),hrv=findings.find(x=>x.name==='Garmin HRV trend'),recoveryConstraint=(pain&&pain.score<60)||(hrv&&hrv.score<60);
 let strengths=findings.filter(x=>x.status==='strength').sort((a,b)=>b.score-a.score||b.confidence.rank-a.confidence.rank).slice(0,3),opportunities=findings.filter(x=>x.status==='opportunity').sort((a,b)=>b.priority-a.priority).slice(0,3);if(!opportunities.length)opportunities=findings.filter(x=>x.status==='watch').sort((a,b)=>b.priority-a.priority).slice(0,2);
 const targetGap=engine.pred-state.setup.targetTime,targetPosition=targetGap<=0?`${fmtTime(Math.abs(targetGap))} inside target`:`${fmtTime(targetGap)} outside target`,planDecision=`factor ${ast.adjustment.toFixed(3)} (${ast.direction}${ast.pct?` ${ast.pct}%`:''})`;
 const executionSentence=Number.isFinite(execution.average)?`Recent execution is ${Math.round(execution.average)}/100 (${scoreBand(Math.round(execution.average)).toLowerCase()})${Number.isFinite(execution.keyAverage)?`; key sessions average ${Math.round(execution.keyAverage)}/100`:''}.`:'There is not yet enough completed-run detail to judge workout execution.';
 let conclusion=`You are in the ${race.phase.toLowerCase()} phase with ${race.remainingLabel} remaining before ${state.setup.raceName}. The present priority is ${race.priority}. Current race estimate is ${fmtTime(engine.pred)} (${targetPosition}), with ${Math.round(engine.currentModel.probability)}% estimated target probability. ${executionSentence} This week uses ${planDecision}.`;
 if(recoveryConstraint)conclusion+=` Recovery or pain currently takes priority over progression.`;else if(execution.limited.length)conclusion+=` Improve execution consistency before adding training load or faster targets.`;else if(engine.currentModel.probability<50)conclusion+=` The goal is not yet well supported, so the next block should build the weakest race-relevant evidence rather than force the target pace.`;else conclusion+=` Continue building the phase-specific stimulus without exceeding the planned load.`;
 const projected=`Following the current programme with realistic expected execution projects ${fmtTime(engine.projection.predictedTime)} and ${Math.round(engine.projectedModel.probability)}% estimated target probability; this remains conditional on healthy, consistent execution.`;
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
 const ast=report.athleteState,ex=report.execution;
 const paceEvidence=ast.fitnessEvidence||{},paceCurrentFactor=Number(paceEvidence.index??100)/100,paceInProgressFactor=Number(paceEvidence.rawIndex??paceEvidence.index??100)/100;
 const loadCurrentFactor=Number(ast.adjustment??1);
 const loadCandidate=ast.weekComplete&&ast.nextAfd?.status==='calculated'?ast.nextAfd:ast.preview;
 const loadInProgressFactor=Number(loadCandidate?.factor??loadCurrentFactor);
 const paceDecision=ast.fitnessDelta>.05?'Increase targets':ast.fitnessDelta<-.05?'Reduce targets':'Maintain targets';
 const loadDecision=`${ast.direction}${ast.pct?` ${ast.pct}%`:''}`;
 const recoverySummary=ast.readiness==='Normal'?'Recovery supports normal progression':ast.readiness==='Reduced'?'Recovery suggests caution':'Recovery currently restricts progression';
 const painSummary=ast.pain.count?`Latest recent maximum ${ast.pain.max}/10`:'No pain data logged';
 const executionHtml=ex&&ex.count?`<section class="executionAssessment"><div class="executionHead"><div><h4>Workout execution</h4><p class="muted compact">How well recent completed sessions delivered their intended stimulus.</p></div><strong>${Number.isFinite(ex.average)?Math.round(ex.average):'—'}/100</strong></div><div class="executionKpis"><span>Recent average <b>${Number.isFinite(ex.average)?Math.round(ex.average):'—'}</b></span><span>Key sessions <b>${Number.isFinite(ex.keyAverage)?Math.round(ex.keyAverage):'—'}</b></span><span>Trend <b>${Number.isFinite(ex.trend)?`${ex.trend>=0?'+':''}${ex.trend.toFixed(0)} pts`:'Insufficient data'}</b></span></div><details class="executionDetails"><summary>Session-by-session evidence</summary>${ex.recent.map(x=>`<div class="executionRow"><span>${fmtDate(x.date)} · ${esc(x.type)}</span><b>${x.score}/100</b><small>${x.plan?`Planned ${x.plan.distance.toFixed(1)} km · actual ${Number(x.run.distanceKm).toFixed(1)} km`:'Ad hoc run'}${Number.isFinite(x.pain)?` · pain ${x.pain}/10`:''}${Number.isFinite(x.drift)?` · drift ${x.drift.toFixed(1)}%`:''}</small></div>`).join('')}</details></section>`:'<section class="executionAssessment"><h4>Workout execution</h4><p class="muted">No completed run has enough information for an execution score yet.</p></section>';
 return `<div class="coachReport ${compact?'compactReport':''}"><div class="coachVerdict"><span>Evidence-based assessment</span><p class="coachConclusion">${esc(report.conclusion)}</p><p class="coachProjection">${esc(report.projected)}</p><small>Evidence coverage ${report.evidenceCoverage}% · Coaching uses logged, configured, plan-linked and execution-score evidence.</small></div><div class="coachPathwaySummary"><article class="coachPathwayCard paceSummary"><span class="coachPathwayLabel">PACE & POWER PATHWAY</span><b class="coachPathwayDecision">${esc(paceDecision)}</b><div class="coachFactorPair"><div><small>Current factor</small><strong>${paceCurrentFactor.toFixed(3)}</strong></div><div><small>In-progress factor</small><strong>${paceInProgressFactor.toFixed(3)}</strong></div></div><p>Execution, assessments and races calibrate future pace and power.</p></article><article class="coachPathwayCard loadSummary"><span class="coachPathwayLabel">DISTANCE & LOAD PATHWAY</span><b class="coachPathwayDecision">${esc(loadDecision)}</b><div class="coachFactorPair"><div><small>Current factor</small><strong>${loadCurrentFactor.toFixed(3)}</strong></div><div><small>In-progress factor</small><strong>${loadInProgressFactor.toFixed(3)}</strong></div></div><p>Recovery, pain and load tolerance calibrate distance and session load.</p></article></div><div class="coachRecoverySummary"><div><span>Recovery</span><b>${esc(ast.readiness)}</b><small>${esc(recoverySummary)}</small></div><div><span>Pain</span><b>${ast.pain.count?`${ast.pain.max}/10`:'No data'}</b><small>${esc(painSummary)}</small></div></div><button class="coachPlanLink" data-go="plan">View pathway calculations in Plan →</button>${executionHtml}<div class="coachEvidenceGrid"><section><h4>Verified strengths</h4>${strengths}</section><section><h4>Priority opportunities</h4>${opportunities}</section></div><section class="coachActions"><h4>Next actions</h4>${report.actions.map((a,i)=>`<div class="coachAction"><strong>${i+1}</strong><div><b>${esc(a.title)}</b><p>${esc(a.text)}</p><small>Based on: ${esc(a.source)}</small></div></div>`).join('')}</section></div>`;
}
function progressCard(x){let pct=clamp(x.value/Math.max(.01,x.target)*100,0,100);let value=x.unit==='km'?`${x.value.toFixed(1)} / ${x.target.toFixed(1)} km`:`${Math.round(x.value)} / ${Math.round(x.target)} ${x.unit}`;return `<div class="progressCard"><div><b>${x.label}</b><span>${value}</span></div><strong>${Math.round(pct)}%</strong><div class="progressTrack"><i style="width:${pct}%"></i></div></div>`}
function renderDashboard(){
 let engine=coachEngine(),{c,pred,cw,wd}=engine;
 $('phaseBadge').textContent=phase(cw);
 $('raceTitle').textContent=state.setup.raceName;
 $('raceSubtitle').textContent=`${dte(state.setup.raceDate).toLocaleDateString()} • ${state.setup.raceDistance.toFixed(1)} km • target ${fmtTime(state.setup.targetTime)} (${pace(state.setup.targetTime/state.setup.raceDistance)})`;
 document.querySelector('.currentOutlook>span').textContent='Current race capability';
 document.querySelector('.projectedOutlook>span').textContent='Expected programme outcome';
 $('currentProbability').textContent=fmtTime(pred);
 $('currentProbabilityLabel').textContent=`Today · ${pace(pred/state.setup.raceDistance)}`;
 $('currentPrediction').textContent=`${Math.round(engine.currentModel.probability)}% chance of ${fmtTime(state.setup.targetTime)} · ${engine.currentModel.label}`;
 $('currentRange').textContent=`Likely 70% range ${fmtTime(engine.currentModel.rangeLow)}–${fmtTime(engine.currentModel.rangeHigh)} · ${pace(engine.currentModel.rangeLow/state.setup.raceDistance)}–${pace(engine.currentModel.rangeHigh/state.setup.raceDistance)}`;
 $('projectedProbability').textContent=fmtTime(engine.projection.predictedTime);
 $('projectedProbabilityLabel').textContent=`Race-day scenario · ${pace(engine.projection.predictedTime/state.setup.raceDistance)}`;
 $('projectedPrediction').textContent=`${Math.round(engine.projectedModel.probability)}% chance of target · ${engine.projectedModel.label}`;
 $('projectedRange').textContent=`Likely 70% range ${fmtTime(engine.projectedModel.rangeLow)}–${fmtTime(engine.projectedModel.rangeHigh)} · ${pace(engine.projectedModel.rangeLow/state.setup.raceDistance)}–${pace(engine.projectedModel.rangeHigh/state.setup.raceDistance)}`;
 const gain=engine.projectedModel.probability-engine.currentModel.probability,targetMargin=state.setup.targetTime-engine.projection.predictedTime;
 const health=planHealthAssessment(c)||{score:0};
 const projectedFitness=Number(engine.projection?.projectedFitnessIndex);
 const projectedFitnessSafe=Number.isFinite(projectedFitness)?projectedFitness:100;
 const fitnessGainPct=Number(engine.projection?.fitnessGainPct);
 const fitnessGainSafe=Number.isFinite(fitnessGainPct)?fitnessGainPct:Math.max(0,(projectedFitnessSafe-100)/100);
 const fitnessContributions=Array.isArray(engine.projection?.fitnessProjection?.contributions)?engine.projection.fitnessProjection.contributions:[];
 const contributionRows=fitnessContributions.length?fitnessContributions.map(x=>{const potential=Number(x?.potential),realised=Number(x?.realised);return `<div class="calcRow"><span>${esc(x?.name||'Plan stimulus')}</span><span>${Number.isFinite(potential)?potential.toFixed(2):'—'}% potential</span><span>${Number.isFinite(realised)?realised.toFixed(2):'—'}%</span></div>`}).join(''):`<div class="calcRow"><span>Plan-derived projection</span><span>Calculated from the current plan</span><span>${(fitnessGainSafe*100).toFixed(2)}%</span></div>`;
 $('outlookGain').innerHTML=`<div><span>Expected improvement</span><b>${fmtTime(engine.projection.improvementSec)}</b></div><div><span>Target margin</span><b>${targetMargin>=0?fmtTime(targetMargin)+' faster':fmtTime(-targetMargin)+' slower'}</b></div><details class="outlookMetricDetail"><summary><span>Projected fitness</span><b>${projectedFitnessSafe.toFixed(1)}</b><small>What does this mean?</small></summary><div class="outlookMetricCalc"><p><b>${projectedFitnessSafe.toFixed(1)}</b> means the model expects general race capability to be ${(projectedFitnessSafe-100).toFixed(1)}% above the latest assessment baseline of 100, before the separate durability and taper adjustments.</p><div class="calcTable">${contributionRows}<div class="calcRow total"><span>Projected Fitness gain</span><span></span><span>+${(fitnessGainSafe*100).toFixed(2)}%</span></div></div><p class="muted compact">Realisation reflects plan health, expected completion, recovery, training opportunity and diminishing returns. Marathon durability and taper are calculated separately.</p></div></details><div><span>Plan health</span><b>${Math.round(Number(health.score)||0)}/100</b></div>`;
 const assumption=document.querySelector('.outlookAssumption');if(assumption)assumption.textContent=`Expected scenario uses ${Math.round(clamp(Number(engine.projection.completionAssumption)||.85,.75,.93)*100)}% plan completion, plan-derived fitness and durability gains, and a taper benefit calculated from the actual taper structure.`;
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
 const predictionModelContent=$('predictionModelContent');
 if(predictionModelContent)predictionModelContent.innerHTML=`<div class="modelSteps"><section><b>Race today — central time</b><p>Latest valid assessment is extrapolated to ${state.setup.raceDistance.toFixed(1)} km. Marathon durability changes the distance exponent from 1.06 toward 1.115 when long-run, weekly-volume and specific-session evidence is incomplete.</p><code>${fmtTime(engine.pred)} at ${pace(engine.pred/state.setup.raceDistance)}</code></section><section><b>Follow programme — central time</b><p>The programme scenario recalculates durability and plan-derived fitness from the actual settings. Plan Health is ${Math.round(engine.projection.planHealthScore)}/100: peak ${pf.plannedPeak.toFixed(1)} km/week, longest run ${pf.peakLong.toFixed(1)} km, ${pf.enabledDays} running days/week, ${(pf.growth*100).toFixed(1)}% growth, ${pf.taperDays} taper days and ${Math.round(pf.qualityShare*100)}% quality distance.</p><code>${fmtTime(engine.projection.predictedTime)} at ${pace(engine.projection.predictedTime/state.setup.raceDistance)} · durability exponent ${engine.projection.projectedExponent.toFixed(3)} · projected fitness ${engine.projection.projectedFitnessIndex.toFixed(1)} · taper ${(engine.projection.taperGain*100).toFixed(1)}% · completion ${Math.round(clamp(Number(engine.projection.completionAssumption)||.85,.75,.93)*100)}%</code></section><section><b>Target probability</b><p>The central time is treated as the median of an asymmetric finish-time distribution. The faster tail is narrower and the slower tail wider. Current evidence and execution confidence control the width. Probability is the area finishing at or before ${fmtTime(state.setup.targetTime)}.</p><code>Today ${Math.round(engine.currentModel.probability)}% · programme ${Math.round(engine.projectedModel.probability)}% · displayed as central 70% ranges</code></section></div><p class="muted compact">The relationships are evidence-informed but the exact coefficients are app calibration assumptions, not a clinically or externally validated prediction equation.</p>`;
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
 const programmeStart=state.plan.length?dte(state.plan.map(x=>x.date).sort()[0]):today();
 const programmeEnd=dte(state.setup.raceDate);
 const remaining=raceTimeRemaining();
 const programmeSpan=Math.max(DAY,programmeEnd-programmeStart);
 const programmeCompletion=clamp((today()-programmeStart)/programmeSpan*100,0,100);
 $('raceTimeline').innerHTML=`<div class="timelineBlocks">${blocks.map(b=>`<div class="timelineBlock timeline-${b.cls}" style="left:${b.start}%;width:${b.end-b.start}%" title="${esc(b.name)}"><span>${b.label}</span></div>`).join('')}<i class="timelineProgress" style="width:${pos}%"></i><span class="timelineNow" style="left:${pos}%" aria-label="Current programme position"></span></div><div class="timelineScale"><span>Plan start</span><span>Race day</span></div><div class="timelineMeta"><b>${detailedPhase(engine.cw)} phase · week ${engine.cw} of ${total}</b><span>${Math.round(programmeCompletion)}% complete · ${remaining.label} until race</span></div>`;
 let afd=adaptiveFactorDetails(cw);
 $('kpis').innerHTML=kpi('Time until race',remaining.label,'Remaining')+kpi('Programme completion',`${Math.round(programmeCompletion)}%`,'Elapsed on timeline');
 $('weeklyDistanceSummary').innerHTML=`<span class="chartSummaryLabel">This week</span><strong>${wd.actual.toFixed(1)} / ${wd.planned.toFixed(1)} km</strong>`;
 $('longRunSummary').innerHTML=`<span class="chartSummaryLabel">Longest verified</span><strong>${c.completedLongest.toFixed(1)} / ${Number(state.setup.peakLong).toFixed(1)} km</strong>`;
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
 return Array.from({length:weeks()},(_,i)=>{
  const w=i+1,data=weekData(w),start=weekStart(w),end=new Date(start.getTime()+7*DAY),raceDate=dte(state.setup.raceDate);
  const race=state.plan.find(p=>p.week===w&&p.type==='Race Day'),isRaceWeek=Boolean(race)||(raceDate>=start&&raceDate<end);
  const plannedForChart=data.planned>0?data.planned:(isRaceWeek?Number(state.setup.raceDistance)||0:0);
  return{...data,plannedForChart,isRaceWeek};
 });
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
 let c=confidence(),arr=completedWeekSeries(),weekLabels=arr.map((x,i)=>x.isRaceWeek?'Race':('W'+(i+1)));
 drawLine($('volumeChart'),[
   {label:'Planned km',data:arr.map(x=>x.plannedForChart),color:'#2d82c7',dashed:true,points:false},
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
function workoutHtml(p){let st=status(p);return`<div class="workout" data-id="${p.id}"><div class="workoutHead"><div class="dateBox"><b>${new Date(p.date+'T00:00:00').getDate()}</b><span>${new Date(p.date+'T00:00:00').toLocaleDateString(undefined,{month:'short'})}</span></div><div class="workoutTitle"><h3>${p.type}</h3><p>${p.type==='Rest'?p.purpose:`${p.distance.toFixed(1)} km · ${p.phase}`}</p></div><span class="status ${st}">${st}</span></div><div class="workoutDetails"><div class="targets">${p.type==='Rest'?'':`<div class="target"><small>Main-set pace</small><b>${pace(p.zone.pace)}</b></div><div class="target"><small>Main-set HR</small><b>${p.zone.hr} bpm</b></div><div class="target"><small>Main-set power</small><b>${p.zone.power} W</b></div>`}</div>${p.type==='Rest'?'':`<p class="targetScope">Targets apply to: <b>${esc(p.targetScope||'main set')}</b></p>`}<div class="prescription"><p><b>Warm-up:</b> ${p.warmup}</p><p><b>Main set:</b> ${p.main}</p><p><b>Cooldown:</b> ${p.cooldown}</p>${p.distanceCheck?`<p class="distanceCheck"><b>Distance check:</b> ${esc(p.distanceCheck)} ✓</p>`:''}<p><b>Purpose:</b> ${p.purpose}</p><p><b>Coach guidance:</b> ${p.coach}</p><p><b>Fuel / hydration:</b> ${p.fuel}</p></div>${coachIntelligenceHtml(p)}${(()=>{const linked=matchingRun(p);return linked?`<button class="viewPlanRun primary full" data-plan-run="${linked.id}">View entered run details</button>`:''})()}</div></div>`}

function renderToday(){let p=state.plan.find(x=>x.date===iso(today()));$('todayDate').textContent=today().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});$('todayCard').innerHTML=p?workoutHtml(p):'<div class="panel">No workout scheduled.</div>';$('todayCoach').innerHTML=p?`<div class="note">${p.coach}</div><div class="note good">${p.purpose}</div>`:''}
function renderPlan(){
 const ast=athleteState(state.weekView||currentWeek());if($('fitnessEvidence')){
  const evidence=ast.fitnessEvidence,fitnessTarget=ast.fitnessDelta,fitnessFactor=1+fitnessTarget/100,recoveryImpact=Math.round((ast.hrv.factor-1)*100);
  const painAction=!ast.pain.count?'Log pain after runs so injury restrictions can be evidence based.':ast.pain.max>=5?'Stop demanding running and reassess before the next session.':ast.pain.max>=3?'Keep running easy; do not add load or intensity.':'No pain-based restriction is currently applied.';
  const completionText=!Number.isFinite(ast.completion)?'No planned distance available':ast.weekComplete?`${Math.round(ast.completion*100)}% of the completed week’s planned km`:`${Math.round(ast.completion*100)}% completed so far; the week remains in progress`;
  const calc=ast.weekComplete&&ast.nextAfd.status==='calculated'?ast.nextAfd:ast.preview;
  const calcTitle=ast.weekComplete&&ast.nextAfd.status==='calculated'?`Final Week ${ast.nextWeek} load calculation`:`Provisional next-review calculation`;
  const appliedTitle=`Applied throughout Week ${ast.currentWeek}`;
  const calcRows=[{name:'Starting factor',adjustment:0,detail:'Every weekly load calculation starts at 1.00.'},...(calc.items||[])];
  const evidenceRows=(evidence.events||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  const confidenceMeaning=evidence.confidence<20?'Very limited evidence; pace and power targets are held stable.':evidence.confidence<50?'Early evidence; only small accumulated changes can affect targets.':evidence.confidence<80?'Moderate evidence; recent execution can meaningfully calibrate targets.':'Strong evidence; pace and power calibration is well supported by recent training and tests.';
  const paceDecision=fitnessTarget>0?`Increase pace & power ${fitnessTarget.toFixed(1)}%`:fitnessTarget<0?`Reduce pace & power ${Math.abs(fitnessTarget).toFixed(1)}%`:'Maintain pace & power';
  const paceAction=fitnessTarget>0?`Future pace and power targets are increased by ${fitnessTarget.toFixed(1)}%. Heart-rate targets remain unchanged.`:fitnessTarget<0?`Future pace and power targets are reduced by ${Math.abs(fitnessTarget).toFixed(1)}%. Heart-rate targets remain unchanged.`:`Keep future pace and power targets unchanged. ${confidenceMeaning}`;
  $('fitnessEvidence').innerHTML=`<div class="adaptationPathways"><section class="adaptationPath pacePath"><div class="pathHeader"><span>PACE & POWER PATHWAY</span><strong>${fitnessFactor.toFixed(3)}</strong></div><div class="pathDecision"><h3>${esc(paceDecision)}</h3><small>Fitness calibration</small></div><p>Completed-run execution, assessments and races determine whether future pace and power targets should change.</p><div class="pathStats"><span>Applied factor <b>${fitnessFactor.toFixed(3)}</b></span><span>Evidence confidence <b>${ast.evidenceConfidence}%</b></span><span>Status <b>${esc(ast.fitnessTrend)}</b></span></div><p class="pathAction">${esc(paceAction)}</p><details class="stateDetails"><summary>Show pace and power calculation</summary><p>${esc(confidenceMeaning)}</p><div class="confidenceBands"><span><b>0–19%</b> Very limited</span><span><b>20–49%</b> Early</span><span><b>50–79%</b> Moderate</span><span><b>80–100%</b> Strong</span></div><p class="muted compact">Confidence is the amount of weighted evidence accumulated since the ${esc(evidence.anchorType.toLowerCase())} on ${fmtDate(evidence.anchorDate)}. It is not a fitness score. Targets change only when the accumulated fitness signal produces at least a 0.5% calibration step.</p><div class="evidenceEventList">${evidenceRows.length?evidenceRows.map(e=>`<div><span>${fmtDate(e.date)} · ${esc(e.type)}</span><b>Execution ${Math.round(e.score)}/100</b><small>${(e.confidence/4*100).toFixed(1)} confidence points · fitness signal ${e.delta>=0?'+':''}${e.delta.toFixed(2)}</small></div>`).join(''):'<p class="muted">No qualifying completed-run evidence has accumulated since the current baseline.</p>'}</div><div class="adjustmentCalcTotal"><span>Applied pace & power factor</span><b>${fitnessFactor.toFixed(3)}</b><small>1.000 means no change. Applied to future pace and power targets; heart-rate targets remain stable.</small></div></details></section><section class="adaptationPath loadPath"><div class="pathHeader"><span>DISTANCE & LOAD PATHWAY</span><strong>${ast.adjustment.toFixed(3)}</strong></div><div class="pathDecision"><h3>${ast.direction}${ast.pct?` ${ast.pct}%`:''} this week</h3><small>Load calibration</small></div><p>Recovery, pain, completed load, efficiency and cardiac drift determine future distance and session load.</p><div class="pathStats"><span>Applied factor <b>${ast.adjustment.toFixed(3)}</b></span><span>Provisional next review <b>${calc.factor.toFixed(3)}</b></span><span>HRV <b>${recoveryImpact?`${recoveryImpact}%`:'0%'}</b></span><span>Training tolerance <b>${esc(ast.tolerance)}</b></span><span>Pain <b>${ast.pain.count?`${ast.pain.max}/10`:'No data'}</b></span></div><p class="pathAction">${esc(painAction)} ${esc(completionText)}.</p><details class="stateDetails"><summary>Show distance and load calculation</summary><div class="adjustmentCalcHeader appliedCalc"><b>${appliedTitle}</b><span>${ast.applied.factor.toFixed(3)}</span></div><p class="muted compact">This finalised factor remains fixed for the whole current week.</p><div class="adjustmentCalcHeader"><b>${calcTitle}</b><span>Current estimate ${calc.factor.toFixed(3)}</span></div><div class="adjustmentCalcTable">${calcRows.map((i,idx)=>`<div class="adjustmentCalcRow"><span>${esc(i.name)}</span><b>${idx===0?'1.000':`${i.adjustment>=0?'+':''}${(i.adjustment*100).toFixed(0)}%`}</b><small>${esc(i.detail)}</small></div>`).join('')}<div class="adjustmentCalcTotal"><span>${ast.weekComplete?'Bounded final factor':'Provisional bounded factor'}</span><b>${calc.factor.toFixed(3)}</b><small>${ast.weekComplete?'Finalised for the next week.':'Visible during the week for transparency; completed-load scoring is added only when the week closes.'} Limited to ${Number(state.setup.minFactor).toFixed(3)}–${Number(state.setup.maxFactor).toFixed(3)}.</small></div></div></details></section></div><div class="adjustmentSchedule"><b>When changes apply</b><p>Week ${ast.currentWeek} keeps factor ${ast.applied.factor.toFixed(3)} for the entire week. The next distance-and-load review is finalised after ${fmtDate(ast.reviewDate)} and applies from ${fmtDate(ast.nextStart)}. Pace and power calibration updates independently whenever enough execution evidence crosses the 0.5% threshold.</p></div>`;
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
 const health=planHealthAssessment(),report=health.validation;state.lastPlanHealth=report;
 const cls=health.score>=80?'good':health.score>=65?'warn':'bad';
 box.innerHTML=`<div class="planHealthSummary ${cls}"><div class="planHealthScore"><strong>${Math.round(health.score)}</strong><span>/100</span></div><div><b>${esc(health.label)} plan structure</b><p>${report.valid?'The generated plan is structurally valid.':'Validation found issues that reduce the health score.'} This score evaluates plan design, not programme completion.</p></div></div><details class="planHealthDetails"><summary>How the score is calculated</summary><div class="planHealthComponents">${health.components.map(x=>`<div><span>${esc(x.name)} <small>${Math.round(x.weight*100)}% weight</small></span><b>${Math.round(x.score)}/100</b><i><em style="width:${clamp(x.score,0,100)}%"></em></i><p>${esc(x.detail)}</p></div>`).join('')}</div><p class="muted compact">Structural validation deductions: ${report.errors} errors × 8 points and ${report.warnings} warnings × 2 points.</p></details><div class="planHealthRecommendations"><h4>Improvement recommendations</h4>${health.recommendations.map((x,i)=>`<div><strong>${i+1}</strong><p>${esc(x)}</p></div>`).join('')}</div>`;
}
function renderMigrationReport(){const box=$('migrationReport');if(!box)return;const m=state.migration||migrationReport;box.innerHTML=`<div class="migrationStatus good"><b>Upgrade status: ${esc(m.status||'ready')}</b><span>Schema ${esc(m.from??'new')} → ${SCHEMA}</span><span>${Number(m.runs)||0} runs · ${Number(m.assessments)||0} assessments preserved</span><span>${Number(m.fieldsRecovered)||0} invalid or missing fields repaired</span><small>Storage source: ${esc(m.source||migrationReport.source||STORAGE_KEY)}</small></div>`;}

const INJURY_STAGES=[
 {name:'Protect & settle',goal:'Calm symptoms and restore comfortable daily movement.',criteria:['Symptoms stable or improving','No new swelling or bruising','Walking pain ≤3/10']},
 {name:'Restore movement',goal:'Recover comfortable range of motion and basic muscle control.',criteria:['Walking pain ≤1/10','Current pain ≤3/10','Gentle double-leg loading tolerated']},
 {name:'Build capacity',goal:'Progress strength, control and tolerance to repeated loading.',criteria:['Current pain ≤2/10','Repeated bridge or hinge controlled','No worse the next morning']},
 {name:'Return to run',goal:'Reintroduce impact with controlled walk–run intervals.',criteria:['Walking pain 0/10','Gentle hopping tolerated','Pain remains ≤2/10','No next-morning flare']},
 {name:'Rebuild running',goal:'Increase easy continuous running before speed, hills or hard sessions.',criteria:['At least 10 minutes running tolerated','No altered gait','No next-morning flare']},
 {name:'Return to performance',goal:'Restore normal running volume, faster running and hills.',criteria:['At least 30 minutes easy running tolerated','Pain ≤1/10','No next-morning flare','Strength and impact confidence restored']}
];
const INJURY_EXERCISES={
 hamstring:[
  {stage:0,name:'Pain-limited walking',dose:'5–10 minutes, 2–4 times today',purpose:'Maintain circulation and normal gait without provoking the injured tissue.',steps:['Walk on level ground at an easy pace.','Keep stride length short enough to avoid pulling or limping.','Stop before pain rises above 2/10 or gait changes.'],why:'Selected while symptoms still need settling and normal walking is the first functional target.',progress:'Increase total walking only when symptoms are no worse later or the next morning.'},
  {stage:1,name:'Double-leg bridge',dose:'3 sets of 8–12 controlled repetitions',purpose:'Restore early hamstring and glute loading with both feet supported.',steps:['Lie on your back with knees bent and feet hip-width apart.','Brace gently, press through both heels and lift the pelvis.','Stop when shoulders, hips and knees form a comfortable line.','Hold 2 seconds, then lower slowly over 3 seconds.'],why:'Builds basic posterior-chain control before demanding single-leg strength.',progress:'Progress when all sets are controlled with pain ≤2/10 and no next-morning increase.'},
  {stage:2,name:'Long-lever bridge hold',dose:'4 holds of 20–30 seconds',purpose:'Increase hamstring load tolerance at a longer muscle length.',steps:['Lie on your back with heels farther from the hips than in a normal bridge.','Press the heels down and lift the pelvis only as high as can be controlled.','Keep the pelvis level and breathe normally.','Lower slowly and rest 45–60 seconds.'],why:'Targets the remaining strength deficit that commonly limits progression from walking to impact.',progress:'Progress when four holds are completed without cramping, shaking or next-day worsening.'},
  {stage:2,name:'Supported hip hinge',dose:'3 sets of 8–10 repetitions',purpose:'Restore controlled hip flexion and hamstring loading in standing.',steps:['Stand tall with one hand lightly supported on a wall or chair.','Soften the knees and push the hips backward while keeping the spine neutral.','Stop before pain, pulling or loss of control.','Drive the hips forward and return to standing slowly.'],why:'Prepares the hamstring for the stance and loading pattern needed in running.',progress:'Increase range before adding external load.'},
  {stage:3,name:'Walk–run intervals',dose:'6 × 1 minute easy run / 2 minutes walk',purpose:'Reintroduce impact in small, measurable doses.',steps:['Warm up with 8–10 minutes brisk walking.','Run at an easy, relaxed pace with short steps.','Walk for two minutes between repetitions.','Stop for pain above 2/10, limping or increasing tightness.'],why:'Impact criteria are met, but continuous running capacity has not yet been demonstrated.',progress:'Add running time only when symptoms return to baseline by the next morning.'},
  {stage:4,name:'Easy continuous run',dose:'10–30 minutes at conversational effort',purpose:'Build continuous running tolerance before speed or hills.',steps:['Begin slower than normal easy pace.','Keep cadence natural and avoid deliberate stride lengthening.','Finish while movement still feels symmetrical.','Record pain during, after and the next morning.'],why:'The priority is restoring duration without a symptom flare, not improving fitness.',progress:'Increase one variable at a time: duration first, then frequency, then pace.'},
  {stage:5,name:'Controlled strides',dose:'4–6 × 15 seconds at 70–80% speed',purpose:'Restore faster force production before unrestricted training.',steps:['Complete after an easy warm-up.','Accelerate smoothly rather than sprinting.','Stay relaxed and stop well before maximal speed.','Walk fully between repetitions.'],why:'Easy running is tolerated; faster loading is the final limitation before unrestricted training.',progress:'Progress speed gradually only when the same-day and next-morning response remain stable.'}
 ],
 muscle:[
  {stage:0,name:'Comfortable range and walking',dose:'5–10 minutes, several times daily',purpose:'Maintain comfortable movement while the irritated muscle settles.',steps:['Move only through a comfortable range.','Walk without limping or compensating.','Stop for sharp pain or increasing tightness.'],why:'Early muscle rehabilitation starts with normal daily movement.',progress:'Increase duration only after a stable next-morning response.'},
  {stage:1,name:'Low-load isometric hold',dose:'5 × 20–30 seconds',purpose:'Reintroduce muscle tension without fast movement.',steps:['Choose a position that gently activates the affected muscle.','Build tension gradually to a comfortable moderate effort.','Hold while breathing normally.','Release slowly and rest 30–45 seconds.'],why:'Isometric loading provides a controlled first strength exposure.',progress:'Progress when pain stays ≤2/10 and no flare occurs later or next morning.'},
  {stage:2,name:'Slow controlled strengthening',dose:'3 × 8–12 repetitions',purpose:'Restore strength through a comfortable range.',steps:['Use body weight or light resistance.','Lift in 2 seconds and lower in 3 seconds.','Keep movement smooth and symmetrical.','Stop before technique changes.'],why:'Muscle capacity must recover before impact and running.',progress:'Increase range, then resistance, one step at a time.'},
  {stage:3,name:'Walk–run intervals',dose:'6 × 1 minute easy run / 2 minutes walk',purpose:'Reintroduce impact in measured doses.',steps:['Warm up by walking.','Run easily with relaxed short steps.','Walk between repetitions.','Stop for pain above 2/10 or altered gait.'],why:'Strength is emerging but continuous impact tolerance is unproven.',progress:'Increase running time only after two stable exposures.'},
  {stage:4,name:'Easy continuous run',dose:'10–30 minutes conversational',purpose:'Rebuild continuous running tolerance.',steps:['Start slower than normal.','Use flat predictable terrain.','Finish before symptoms increase.','Check the next-morning response.'],why:'Duration is restored before speed, hills or maximal force.',progress:'Increase one variable at a time.'},
  {stage:5,name:'Controlled faster running',dose:'4–6 × 15 seconds at 70–80%',purpose:'Restore faster force production.',steps:['Warm up fully.','Accelerate smoothly.','Avoid maximal sprinting.','Walk to full recovery.'],why:'Faster loading is the last step after easy running is stable.',progress:'Increase speed gradually across several symptom-stable sessions.'}
 ],
 tendon:[
  {stage:0,name:'Load modification and comfortable walking',dose:'Short comfortable bouts through the day',purpose:'Reduce provocative load without complete rest.',steps:['Avoid the activity that clearly increases symptoms.','Keep walking within a comfortable range.','Use even, controlled steps.'],why:'Tendon symptoms usually respond better to adjusted loading than abrupt complete rest.',progress:'Increase daily activity only when symptoms remain stable the next morning.'},
  {stage:1,name:'Tendon isometric hold',dose:'5 × 30–45 seconds at moderate effort',purpose:'Introduce controlled tendon loading.',steps:['Choose a stable position that loads the affected tendon.','Build effort gradually.','Hold without bouncing.','Rest 45–60 seconds.'],why:'A sustained hold is a measurable first loading step.',progress:'Progress when pain remains mild and returns to baseline by the next morning.'},
  {stage:2,name:'Slow resistance exercise',dose:'3 × 8–12 repetitions',purpose:'Build tendon and muscle capacity.',steps:['Use a controlled full comfortable range.','Take 3 seconds through the lowering phase.','Avoid sudden rebounds.','Keep the final repetitions challenging but controlled.'],why:'Progressive resistance is the core capacity-building step for a tendon pathway.',progress:'Add resistance before adding speed.'},
  {stage:3,name:'Impact preparation',dose:'3 × 20–30 seconds',purpose:'Test low-level elastic loading.',steps:['Begin with quiet marching, heel raises or gentle jogging in place.','Keep rhythm even and contacts quiet.','Stop for increasing pain or guarding.'],why:'Impact tolerance must be established before running.',progress:'Require two stable next-morning responses before walk–run.'},
  {stage:4,name:'Easy run exposure',dose:'10–30 minutes easy',purpose:'Rebuild running-specific tendon tolerance.',steps:['Use flat terrain.','Keep pace conversational.','Avoid hills and speed initially.','Record next-morning stiffness and pain.'],why:'Running load is added only after strength and impact are stable.',progress:'Increase duration, then frequency, then pace.'},
  {stage:5,name:'Elastic and hill reintroduction',dose:'4–6 short controlled efforts',purpose:'Restore higher tendon loading demands.',steps:['Warm up fully.','Start with gentle strides or mild inclines.','Keep efforts submaximal.','Allow full recovery.'],why:'Speed and hills create higher tendon load and belong last.',progress:'Progress only after repeated stable easy runs.'}
 ],
 knee:[
  {stage:0,name:'Comfortable knee motion and walking',dose:'5–10 minutes, several times daily',purpose:'Maintain knee movement without provoking symptoms.',steps:['Bend and straighten the knee in a comfortable range.','Walk with an even stride.','Avoid deep painful positions.'],why:'The first goal is normal daily function and symptom stability.',progress:'Increase movement when pain and swelling do not rise.'},
  {stage:1,name:'Supported sit-to-stand',dose:'3 × 8 repetitions',purpose:'Restore basic knee and hip control.',steps:['Use a chair high enough to remain comfortable.','Keep knees tracking over the feet.','Stand smoothly and sit over 3 seconds.','Use hand support if needed.'],why:'This tests a functional double-leg loading pattern.',progress:'Lower the chair height gradually when pain remains ≤2/10.'},
  {stage:2,name:'Step-down control',dose:'3 × 6–10 each side',purpose:'Build single-leg control needed for running.',steps:['Stand on a low step with support nearby.','Lower the opposite heel slowly toward the floor.','Keep pelvis level and knee aligned.','Return smoothly.'],why:'Running requires repeated single-leg knee control.',progress:'Increase step height only after controlled symptom-stable sets.'},
  {stage:3,name:'Low-level impact and walk–run',dose:'3 × 20 seconds then 6 × 1 minute run',purpose:'Reintroduce impact progressively.',steps:['Begin with quiet jogging in place.','Progress to easy flat walk–run intervals.','Stop for swelling, limp or increasing pain.'],why:'Impact is tested after daily and strength tasks are controlled.',progress:'Require two stable exposures before continuous running.'},
  {stage:4,name:'Easy continuous run',dose:'10–30 minutes flat and easy',purpose:'Rebuild running tolerance.',steps:['Use flat terrain.','Keep effort conversational.','Avoid downhill and speed initially.','Monitor the next morning.'],why:'Duration returns before more demanding knee loads.',progress:'Add duration before hills or pace.'},
  {stage:5,name:'Controlled hills or pace',dose:'4–6 short submaximal efforts',purpose:'Restore higher knee load.',steps:['Choose either gentle hills or short strides, not both.','Warm up fully.','Keep technique controlled.','Stop before fatigue changes form.'],why:'Higher-load running is reintroduced last.',progress:'Increase one demand at a time across stable sessions.'}
 ],
 ankle:[
  {stage:0,name:'Ankle pumps and comfortable walking',dose:'2–3 minutes, several times daily',purpose:'Maintain motion and reduce guarding.',steps:['Move the ankle slowly up and down.','Make small comfortable circles.','Walk only without marked limp.'],why:'Early ankle recovery starts with motion and protected weight bearing.',progress:'Increase walking as swelling and pain remain stable.'},
  {stage:1,name:'Supported calf raise',dose:'3 × 8–12 repetitions',purpose:'Restore basic ankle loading.',steps:['Hold a stable support.','Rise through both feet slowly.','Pause briefly at the top.','Lower over 3 seconds.'],why:'Calf and ankle control are essential before balance and impact.',progress:'Shift gradually toward the affected side.'},
  {stage:2,name:'Single-leg balance',dose:'4 × 20–30 seconds',purpose:'Restore ankle control and confidence.',steps:['Stand near support.','Keep foot tripod contact.','Maintain a level pelvis.','Progress by reducing hand support.'],why:'Balance and joint control reduce the gap to running.',progress:'Progress to gentle reaches when stable.'},
  {stage:3,name:'Low-level hops and walk–run',dose:'3 × 10 gentle hops then 6 × 1 minute run',purpose:'Reintroduce impact and direction control.',steps:['Begin with quiet double-leg hops.','Progress only if contacts are symmetrical.','Use flat walk–run intervals.','Stop for swelling or instability.'],why:'Impact and confidence must be demonstrated before continuous running.',progress:'Require two stable exposures.'},
  {stage:4,name:'Easy continuous run',dose:'10–30 minutes flat and easy',purpose:'Rebuild running tolerance.',steps:['Use a predictable surface.','Avoid trails and sharp turns initially.','Keep effort easy.','Check swelling and pain later and next morning.'],why:'Continuous straight-line running precedes uneven ground.',progress:'Increase duration before terrain complexity.'},
  {stage:5,name:'Direction and terrain progression',dose:'4–6 short controlled drills',purpose:'Restore trail, cornering and faster-running demands.',steps:['Begin with gentle direction changes.','Progress to mild uneven terrain.','Keep speed submaximal.','Stop for instability.'],why:'Complexity and speed are final ankle demands.',progress:'Increase one challenge at a time.'}
 ],
 foot:[
  {stage:0,name:'Comfortable foot loading',dose:'Short level walks through the day',purpose:'Maintain daily function without provoking focal foot symptoms.',steps:['Use supportive footwear.','Keep walking bouts short.','Avoid barefoot impact if it increases pain.'],why:'Foot symptoms need controlled weight-bearing before strengthening.',progress:'Increase only when walking and next-morning pain remain stable.'},
  {stage:1,name:'Foot tripod and toe control',dose:'3 × 8–12 repetitions',purpose:'Restore intrinsic foot control.',steps:['Keep heel, base of big toe and base of little toe in contact.','Gently shorten the foot without curling toes.','Hold 3 seconds.','Relax fully.'],why:'Basic foot control supports later calf and impact loading.',progress:'Perform in standing once seated control is easy.'},
  {stage:2,name:'Slow calf raise',dose:'3 × 8–12 repetitions',purpose:'Build foot and calf load tolerance.',steps:['Use support.','Rise slowly through the forefoot.','Keep pressure even across the toes.','Lower over 3 seconds.'],why:'Running requires repeated forefoot and arch loading.',progress:'Progress from double- to single-leg when symptom stable.'},
  {stage:3,name:'Impact preparation',dose:'3 × 20 seconds',purpose:'Test low-level foot impact tolerance.',steps:['Begin with marching or gentle jogging in place.','Keep contacts quiet.','Stop for focal bone pain or increasing symptoms.'],why:'Impact must be demonstrated before running.',progress:'Two stable next-morning responses are required.'},
  {stage:4,name:'Easy run exposure',dose:'10–30 minutes easy',purpose:'Rebuild running-specific foot tolerance.',steps:['Use flat predictable terrain.','Wear familiar supportive shoes.','Keep effort easy.','Stop for focal or escalating pain.'],why:'Easy running returns after walking, strength and impact are stable.',progress:'Increase duration before speed or hills.'},
  {stage:5,name:'Terrain and pace progression',dose:'4–6 short controlled efforts',purpose:'Restore higher forefoot and arch demand.',steps:['Add either mild hills or short strides.','Keep efforts submaximal.','Allow full recovery.','Monitor the following morning.'],why:'Higher-load foot demands are the final progression.',progress:'Increase only one variable at a time.'}
 ],
 bone:[
  {stage:0,name:'Protected daily activity only',dose:'No impact exercise until professionally assessed',purpose:'Avoid adding load to a possible bone-stress injury.',steps:['Do not run, hop or perform impact tests.','Limit walking if it produces focal pain.','Arrange clinical assessment when focal bone pain, night pain or walking pain is present.'],why:'A possible bone-stress injury requires a different pathway and should not be progressed from app check-ins alone.',progress:'Progress only after professional guidance or clear exclusion of bone stress.'}
 ],
 neural:[
  {stage:0,name:'Comfortable movement only',dose:'Short symptom-neutral bouts',purpose:'Maintain movement without aggravating neurological symptoms.',steps:['Avoid positions that increase numbness, weakness or radiating pain.','Use short comfortable walks.','Stop for worsening neurological symptoms.'],why:'Nerve-related or exertional symptoms need assessment before a loading progression is assumed.',progress:'Seek clinical review if numbness, weakness or recurrent exertional symptoms persist.'}
 ]
};
const RUNNER_INJURY_LIBRARY=[
 {key:'prox_ham_strain',name:'Proximal hamstring strain',region:'Hip / posterior thigh',days:49,terms:['upper hamstring','proximal hamstring','ischial','sit bone','lower buttock','posterior thigh'],mechanisms:['sprint','accelerat','kick','sudden'],features:['bruis','pop','sharp','pull'],alternatives:['Proximal hamstring tendon injury','Lumbar or sciatic referred pain']},
 {key:'ham_strain',name:'Hamstring muscle strain',region:'Posterior thigh',days:42,terms:['hamstring','back of thigh','posterior thigh'],mechanisms:['sprint','accelerat','speed','sudden','stretch'],features:['bruis','pop','sharp','pull'],alternatives:['Proximal hamstring tendinopathy','Referred neural pain']},
 {key:'prox_ham_tend',name:'Proximal hamstring tendinopathy',region:'Hip / buttock',days:84,terms:['sit bone','ischial','deep buttock','upper hamstring','proximal hamstring'],mechanisms:['gradual','overuse','increased mileage'],features:['sitting','after running','hill','long stride'],alternatives:['Proximal hamstring strain','Ischiogluteal bursitis']},
 {key:'gtps',name:'Greater trochanteric pain syndrome / gluteal tendinopathy',region:'Lateral hip',days:70,terms:['outer hip','lateral hip','side of hip','greater trochanter','hip'],mechanisms:['gradual','overuse','increased mileage'],features:['lying on side','stairs','single leg','side sleeping','tender'],alternatives:['Hip joint irritation','Lumbar referred pain']},
 {key:'hip_flexor',name:'Hip flexor strain or iliopsoas overload',region:'Anterior hip / groin',days:35,terms:['front of hip','anterior hip','hip flexor','iliopsoas','groin'],mechanisms:['sprint','hill','kick','sudden','overstride'],features:['lifting knee','stairs','resisted hip flexion'],alternatives:['Adductor strain','Hip joint pathology']},
 {key:'adductor_strain',name:'Adductor strain',region:'Groin / inner thigh',days:42,terms:['groin','inner thigh','adductor'],mechanisms:['sudden','slip','change direction','sprint'],features:['squeeze','side step','bruis'],alternatives:['Adductor tendinopathy','Hip joint pathology']},
 {key:'adductor_tend',name:'Adductor tendinopathy',region:'Groin',days:84,terms:['groin','adductor','pubic'],mechanisms:['gradual','overuse'],features:['squeeze','after running','morning stiffness'],alternatives:['Adductor strain','Athletic pubalgia']},
 {key:'piriformis',name:'Deep gluteal / piriformis syndrome pattern',region:'Buttock',days:56,terms:['deep buttock','piriformis','glute','buttock'],mechanisms:['gradual','overuse'],features:['sitting','radiat','tingling','sciatic'],alternatives:['Lumbar radiculopathy','Proximal hamstring disorder']},
 {key:'quad_strain',name:'Quadriceps or rectus femoris strain',region:'Front thigh',days:35,terms:['front thigh','quadriceps','rectus femoris','quad'],mechanisms:['sprint','kick','sudden','hill'],features:['bruis','stretch','knee extension'],alternatives:['Hip flexor strain','Femoral bone stress injury']},
 {key:'tfl',name:'Tensor fascia lata overload',region:'Anterolateral hip',days:35,terms:['tfl','front side hip','anterolateral hip'],mechanisms:['gradual','overuse'],features:['downhill','single leg','tight'],alternatives:['Greater trochanteric pain syndrome','Iliotibial band syndrome']},
 {key:'pfp',name:'Patellofemoral pain',region:'Front of knee',days:56,terms:['front knee','around kneecap','behind kneecap','patella','anterior knee'],mechanisms:['gradual','overuse','increased mileage'],features:['stairs','squat','sitting','downhill'],alternatives:['Patellar tendinopathy','Meniscal or joint-line irritation']},
 {key:'patellar_tend',name:'Patellar tendinopathy',region:'Below kneecap',days:84,terms:['below kneecap','patellar tendon','inferior patella'],mechanisms:['gradual','jump','speed','hill'],features:['first steps','warm up','squat','jump'],alternatives:['Patellofemoral pain','Infrapatellar fat-pad irritation']},
 {key:'itbs',name:'Iliotibial band syndrome',region:'Outer knee',days:42,terms:['outer knee','lateral knee','it band','iliotibial'],mechanisms:['gradual','downhill','increased mileage'],features:['after a few km','downhill','sharp lateral'],alternatives:['Lateral meniscal irritation','Biceps femoris tendinopathy']},
 {key:'pes',name:'Pes anserine irritation',region:'Inner knee',days:35,terms:['inner knee','medial knee','pes anserine'],mechanisms:['gradual','overuse'],features:['stairs','tender below joint'],alternatives:['Medial meniscal irritation','MCL sprain']},
 {key:'meniscus',name:'Meniscal irritation pattern',region:'Knee joint line',days:56,terms:['joint line','meniscus','inside knee','outside knee'],mechanisms:['twist','turn','squat','sudden'],features:['locking','catching','swelling','click'],alternatives:['Patellofemoral pain','Ligament sprain']},
 {key:'mcl',name:'Medial collateral ligament sprain',region:'Inner knee',days:42,terms:['mcl','medial collateral','inner knee'],mechanisms:['twist','valgus','impact','sudden'],features:['instability','swelling','tender'],alternatives:['Medial meniscal injury','Pes anserine irritation']},
 {key:'mtss',name:'Medial tibial stress syndrome',region:'Inner shin',days:42,terms:['shin splints','inner shin','medial tibia','shin'],mechanisms:['gradual','increased mileage','hard surface'],features:['diffuse','along bone','warm up'],alternatives:['Tibial bone stress injury','Soleus overload']},
 {key:'tibial_bsi',name:'Tibial bone stress injury',region:'Shin',days:84,terms:['tibia','shin','bone pain'],mechanisms:['gradual','increased mileage','impact'],features:['focal','point tender','hop pain','night pain','walking pain'],alternatives:['Medial tibial stress syndrome','Chronic exertional compartment syndrome']},
 {key:'cecs',name:'Chronic exertional compartment syndrome pattern',region:'Lower leg',days:70,terms:['compartment','tight lower leg','pressure','shin'],mechanisms:['running only','reproducible'],features:['numb','weak','resolves after stopping','same distance'],alternatives:['Tibial stress injury','Vascular or nerve entrapment']},
 {key:'gastroc',name:'Gastrocnemius strain',region:'Upper calf',days:42,terms:['upper calf','gastrocnemius','calf'],mechanisms:['sudden','push off','sprint','jump'],features:['pop','bruis','tennis leg'],alternatives:['Soleus strain','Achilles rupture']},
 {key:'soleus',name:'Soleus strain',region:'Deep / lower calf',days:49,terms:['deep calf','lower calf','soleus','calf'],mechanisms:['running','hill','gradual','sudden'],features:['bent knee','deep ache','push off'],alternatives:['Gastrocnemius strain','Tibial stress injury']},
 {key:'achilles_mid',name:'Mid-portion Achilles tendinopathy',region:'Achilles',days:84,terms:['achilles','back of ankle'],mechanisms:['gradual','overuse','increased mileage'],features:['morning stiffness','2-6 cm','warm up','thickening'],alternatives:['Insertional Achilles tendinopathy','Partial Achilles tear']},
 {key:'achilles_ins',name:'Insertional Achilles tendinopathy',region:'Heel insertion',days:98,terms:['heel insertion','bottom achilles','back of heel','insertional'],mechanisms:['gradual','overuse'],features:['shoe pressure','uphill','deep dorsiflexion'],alternatives:['Retrocalcaneal bursitis','Mid-portion Achilles tendinopathy']},
 {key:'achilles_rupture',name:'Possible Achilles rupture or major tear',region:'Achilles',days:140,terms:['achilles','back of ankle','calf'],mechanisms:['sudden','push off','jump'],features:['pop','kicked','cannot tiptoe','weak push off'],alternatives:['Severe calf strain','Partial Achilles tear'],urgent:true},
 {key:'lateral_plantar_overload',name:'Lateral plantar muscle overload / footwear compression pattern',region:'Outer plantar foot',days:7,terms:['bottom outer foot','outer sole','lateral plantar','outside bottom foot','from front to back','little toe side','lateral arch'],mechanisms:['progressive during run','long run','tight shoe','narrow shoe','cambered road','fatigue'],features:['cramp','cramp like','worse after taking shoes off','resolves within a day','resolves within two days','better in 24 hours','better in 48 hours','no morning first step pain'],alternatives:['Peroneus longus overload','Lateral plantar nerve irritation','Cuboid-region overload'],family:'foot',tier:'Special presentation',rank:37,selfManage:true},
 {key:'plantar',name:'Plantar fasciopathy',region:'Heel / arch',days:84,terms:['heel bottom','plantar','arch','sole'],mechanisms:['gradual','overuse'],features:['first steps','morning','after rest'],alternatives:['Calcaneal stress injury','Fat-pad irritation']},
 {key:'peroneal',name:'Peroneal tendinopathy',region:'Outer ankle / foot',days:56,terms:['outer ankle','outside foot','peroneal','fibularis'],mechanisms:['gradual','uneven surface','ankle roll'],features:['eversion','behind ankle bone'],alternatives:['Lateral ankle sprain','Fifth metatarsal stress injury']},
 {key:'post_tib',name:'Posterior tibial tendinopathy',region:'Inner ankle / arch',days:84,terms:['inner ankle','posterior tibial','inside arch'],mechanisms:['gradual','overuse'],features:['single leg heel raise','arch fatigue'],alternatives:['Medial ankle sprain','Navicular stress injury']},
 {key:'ankle_sprain',name:'Lateral ankle sprain',region:'Outer ankle',days:35,terms:['ankle sprain','rolled ankle','outer ankle','lateral ankle'],mechanisms:['roll','twist','uneven','sudden'],features:['swelling','bruis','instability'],alternatives:['Peroneal tendon injury','Fracture']},
 {key:'met_bsi',name:'Metatarsal bone stress injury',region:'Forefoot',days:70,terms:['metatarsal','forefoot','top of foot'],mechanisms:['gradual','increased mileage','impact'],features:['focal','point tender','hop pain','walking pain'],alternatives:['Extensor tendinopathy','Morton neuroma']},
 {key:'navicular_bsi',name:'Navicular bone stress injury',region:'Midfoot',days:98,terms:['navicular','midfoot','top inner foot'],mechanisms:['gradual','impact','increased mileage'],features:['focal','hop pain','night pain'],alternatives:['Posterior tibial tendinopathy','Midfoot joint irritation'],urgent:true},
 {key:'sesamoid',name:'Sesamoid irritation or stress injury',region:'Under big toe',days:70,terms:['sesamoid','under big toe','ball of foot'],mechanisms:['gradual','forefoot running','hill'],features:['push off','tiptoe','focal'],alternatives:['First MTP joint irritation','Flexor hallucis tendinopathy']},
 {key:'mortons',name:'Morton neuroma pattern',region:'Forefoot',days:42,terms:['between toes','forefoot','mortons','neuroma'],mechanisms:['gradual','tight shoes'],features:['burning','tingling','pebble','numb toes'],alternatives:['Metatarsal stress injury','MTP synovitis']},
 {key:'hip_joint',name:'Hip joint irritation / femoroacetabular impingement pattern',region:'Deep anterior hip / groin',days:70,terms:['deep groin','deep hip','front hip','hip joint'],mechanisms:['gradual','twist','deep squat'],features:['clicking','catching','deep flexion','getting out of car'],alternatives:['Hip flexor overload','Labral injury'],family:'hip'},
 {key:'hip_labral',name:'Possible hip labral injury pattern',region:'Deep groin / hip joint',days:84,terms:['deep groin','labrum','hip joint'],mechanisms:['twist','pivot','sudden','gradual'],features:['catching','locking','clicking','giving way'],alternatives:['Femoroacetabular impingement','Hip flexor overload'],family:'hip'},
 {key:'femoral_neck_bsi',name:'Femoral neck bone stress injury',region:'Deep groin / hip',days:112,terms:['deep groin','femoral neck','deep hip','bone pain'],mechanisms:['gradual','increased mileage','impact'],features:['walking pain','night pain','hop pain','focal'],alternatives:['Hip joint irritation','Hip flexor overload'],urgent:true,family:'bone'},
 {key:'sacral_bsi',name:'Sacral bone stress injury',region:'Low back / buttock',days:98,terms:['sacrum','sacral','low back','deep buttock'],mechanisms:['gradual','increased mileage','impact'],features:['focal','walking pain','night pain','hop pain'],alternatives:['Lumbar referred pain','Deep gluteal syndrome'],urgent:true,family:'bone'},
 {key:'ischial_bursa',name:'Ischiogluteal bursitis pattern',region:'Sit bone / buttock',days:56,terms:['sit bone','ischial','lower buttock'],mechanisms:['gradual','prolonged sitting'],features:['sitting','direct pressure','tender'],alternatives:['Proximal hamstring tendinopathy','Referred neural pain'],family:'tendon'},
 {key:'athletic_pubalgia',name:'Athletic pubalgia / abdominal–adductor pain pattern',region:'Groin / pubic region',days:84,terms:['pubic','lower abdomen','groin','sports hernia'],mechanisms:['gradual','twist','sprint'],features:['cough','sit up','change direction','adductor squeeze'],alternatives:['Adductor tendinopathy','Inguinal hernia'],family:'muscle'},
 {key:'snapping_hip',name:'Snapping hip / iliopsoas irritation pattern',region:'Front hip',days:42,terms:['snapping hip','front hip','iliopsoas'],mechanisms:['gradual','repetitive hip flexion'],features:['snap','click','lifting knee'],alternatives:['Hip flexor strain','Hip joint irritation'],family:'hip'},
 {key:'quad_tend',name:'Quadriceps tendinopathy',region:'Above kneecap',days:84,terms:['above kneecap','quadriceps tendon','top of patella'],mechanisms:['gradual','hill','speed','jump'],features:['squat','stairs','jump','warm up'],alternatives:['Patellofemoral pain','Quadriceps strain'],family:'knee'},
 {key:'fat_pad',name:'Infrapatellar fat-pad irritation',region:'Front of knee below kneecap',days:42,terms:['fat pad','below kneecap','front knee'],mechanisms:['gradual','hyperextension','downhill'],features:['pinching','standing locked knee','tender beside tendon'],alternatives:['Patellar tendinopathy','Patellofemoral pain'],family:'knee'},
 {key:'popliteus',name:'Popliteus / posterolateral knee overload',region:'Back / outer knee',days:42,terms:['back of knee','posterolateral knee','popliteus'],mechanisms:['gradual','downhill','twist'],features:['downhill','bent knee','outer back knee'],alternatives:['Lateral meniscal irritation','Distal hamstring tendinopathy'],family:'knee'},
 {key:'fibular_bsi',name:'Fibular bone stress injury',region:'Outer lower leg',days:70,terms:['fibula','outer shin','outer lower leg','bone pain'],mechanisms:['gradual','increased mileage','impact'],features:['focal','point tender','hop pain','walking pain'],alternatives:['Peroneal muscle overload','Lateral compartment syndrome'],urgent:true,family:'bone'},
 {key:'ant_tib_tend',name:'Anterior tibialis tendinopathy',region:'Front shin / inner ankle',days:56,terms:['front shin','anterior tibialis','front ankle'],mechanisms:['gradual','hill','increased mileage'],features:['toe lift','heel walking','shoe pressure'],alternatives:['Tibial bone stress injury','Extensor tendinopathy'],family:'tendon'},
 {key:'calcaneal_bsi',name:'Calcaneal bone stress injury',region:'Heel',days:84,terms:['heel bone','calcaneus','deep heel'],mechanisms:['gradual','increased mileage','impact'],features:['heel squeeze','walking pain','night pain','focal'],alternatives:['Plantar fasciopathy','Heel fat-pad irritation'],urgent:true,family:'bone'},
 {key:'extensor_tend',name:'Foot extensor tendinopathy',region:'Top of foot',days:42,terms:['top of foot','extensor tendon','laces'],mechanisms:['gradual','tight shoes','hill'],features:['toe lift','shoe pressure','tender tendon'],alternatives:['Metatarsal bone stress injury','Midfoot joint irritation'],family:'foot'},
 {key:'fhl_tend',name:'Flexor hallucis longus tendinopathy',region:'Inner ankle / big toe',days:70,terms:['flexor hallucis','inner ankle','big toe tendon'],mechanisms:['gradual','hill','forefoot running'],features:['big toe push off','tiptoe','behind inner ankle'],alternatives:['Posterior tibial tendinopathy','Sesamoid injury'],family:'foot'},
 {key:'mtp_synovitis',name:'First MTP joint irritation / hallux rigidus pattern',region:'Big-toe joint',days:56,terms:['big toe joint','first mtp','hallux'],mechanisms:['gradual','forefoot running','hill'],features:['toe bend','push off','joint stiffness'],alternatives:['Sesamoid injury','Flexor hallucis tendinopathy'],family:'foot'},
 {key:'fifth_met_bsi',name:'Fifth metatarsal bone stress injury',region:'Outer midfoot',days:84,terms:['fifth metatarsal','outer midfoot','outside foot bone'],mechanisms:['gradual','ankle roll','increased mileage'],features:['focal','point tender','walking pain','hop pain'],alternatives:['Peroneal tendinopathy','Lateral ankle sprain'],urgent:true,family:'bone'},
 {key:'lumbar_radicular',name:'Lumbar radicular / referred nerve pain pattern',region:'Back / buttock / leg',days:70,terms:['low back','radiating','sciatic','below knee'],mechanisms:['gradual','lifting','sitting'],features:['tingling','numbness','weakness','radiating'],alternatives:['Deep gluteal syndrome','Hamstring injury'],urgent:true,family:'neural'},
 {key:'cuboid_overload',name:'Cuboid-region joint or soft-tissue overload pattern',region:'Outer midfoot',days:21,terms:['cuboid','outer midfoot','outside middle foot','lateral midfoot'],mechanisms:['gradual','uneven surface','ankle roll','long run'],features:['push off','localized ache','barefoot','midfoot'],alternatives:['Peroneus longus overload','Fifth metatarsal stress injury'],family:'foot',tier:'Special presentation',rank:38},
 {key:'peroneus_longus_overload',name:'Peroneus longus overload beneath the foot',region:'Outer ankle to plantar foot',days:28,terms:['peroneus longus','outer ankle to sole','under cuboid','outer plantar foot'],mechanisms:['cambered road','uneven surface','long run','fatigue'],features:['push off','eversion','cramp','outer arch'],alternatives:['Lateral plantar muscle overload','Cuboid-region overload'],family:'foot',tier:'Special presentation',rank:39},
 {key:'lateral_plantar_nerve',name:'Lateral plantar nerve irritation pattern',region:'Outer plantar foot',days:42,terms:['lateral plantar nerve','outer sole burning','little toe tingling','outer plantar numbness'],mechanisms:['tight shoe','long run','repetitive pressure'],features:['burning','tingling','numbness','electric'],alternatives:['Lateral plantar muscle overload','Morton neuroma pattern'],family:'neural',tier:'Special presentation',rank:51},
 {key:'baxter_nerve',name:'Baxter nerve / inferior calcaneal nerve irritation pattern',region:'Inner plantar heel',days:56,terms:['baxter nerve','inner heel burning','medial plantar heel','inferior calcaneal nerve'],mechanisms:['gradual','overuse','tight footwear'],features:['burning','tingling','worse after activity','not first step'],alternatives:['Plantar fasciopathy','Calcaneal stress injury'],family:'neural',tier:'Special presentation',rank:52},
 {key:'heel_fat_pad',name:'Heel fat-pad irritation pattern',region:'Central heel',days:28,terms:['heel fat pad','central heel','bruised heel','middle of heel'],mechanisms:['hard surface','minimal shoes','downhill','impact'],features:['bruised feeling','direct pressure','hard floor'],alternatives:['Plantar fasciopathy','Calcaneal stress injury'],family:'foot',tier:'Special presentation',rank:31},
 {key:'retrocalc_bursa',name:'Retrocalcaneal bursitis pattern',region:'Back of heel',days:42,terms:['retrocalcaneal','bursa','back of heel swelling','between achilles and heel'],mechanisms:['shoe pressure','uphill','new shoes','gradual'],features:['swelling','shoe rubbing','deep heel pain'],alternatives:['Insertional Achilles tendinopathy','Haglund-related irritation'],family:'tendon',tier:'Special presentation',rank:42},
 {key:'achilles_paratenon',name:'Achilles paratenon irritation pattern',region:'Achilles',days:42,terms:['paratenon','creaking achilles','squeaking tendon','achilles sheath'],mechanisms:['rapid load increase','hill','speed','gradual'],features:['crepitus','warmth','diffuse tendon pain'],alternatives:['Mid-portion Achilles tendinopathy','Partial Achilles tear'],family:'tendon',tier:'Special presentation',rank:43},
 {key:'dorsal_lace_compression',name:'Dorsal foot lace-pressure / extensor compression pattern',region:'Top of foot',days:7,terms:['lace bite','laces too tight','top foot pressure','dorsal foot compression'],mechanisms:['tight laces','new shoes','high instep','long run'],features:['worse in shoe','relief after loosening','surface pressure'],alternatives:['Foot extensor tendinopathy','Metatarsal bone stress injury'],family:'foot',tier:'Special presentation',rank:35,selfManage:true},
 {key:'toe_flexor_fatigue',name:'Toe-flexor and intrinsic-foot fatigue / cramp pattern',region:'Plantar forefoot / toes',days:7,terms:['toes cramp','toe curling cramp','ball of foot cramp','intrinsic foot fatigue'],mechanisms:['long run','fatigue','new shoes','forefoot loading'],features:['cramp','toe clawing','settles quickly','after run'],alternatives:['Flexor hallucis tendinopathy','Morton neuroma pattern'],family:'foot',tier:'Special presentation',rank:40,selfManage:true},
 {key:'second_mtp_capsulitis',name:'Second MTP capsulitis / plantar-plate overload pattern',region:'Ball of foot',days:56,terms:['second toe joint','second mtp','plantar plate','ball of foot under second toe'],mechanisms:['forefoot loading','hill','speed','tight shoes'],features:['toe drift','pebble feeling','push off','joint swelling'],alternatives:['Morton neuroma pattern','Metatarsal stress injury'],family:'foot',tier:'Special presentation',rank:44},
 {key:'turf_toe',name:'First MTP sprain / turf-toe pattern',region:'Big-toe joint',days:42,terms:['turf toe','big toe sprain','big toe bent back','first mtp sprain'],mechanisms:['sudden push off','toe hyperextension','trip'],features:['swelling','bruising','painful push off'],alternatives:['First MTP irritation','Sesamoid injury'],family:'foot',tier:'Special presentation',rank:49},
 {key:'medial_ankle_sprain',name:'Medial ankle / deltoid-ligament sprain pattern',region:'Inner ankle',days:42,terms:['medial ankle sprain','inner ankle sprain','deltoid ligament'],mechanisms:['eversion','twist','sudden'],features:['inner ankle swelling','bruising','instability'],alternatives:['Posterior tibial tendon injury','Fracture'],family:'ankle',tier:'Special presentation',rank:55},
 {key:'syndesmosis_sprain',name:'High ankle / syndesmosis sprain pattern',region:'Front / upper ankle',days:70,terms:['high ankle sprain','syndesmosis','above ankle','front upper ankle'],mechanisms:['external rotation','twist','sudden'],features:['pain above ankle','squeeze pain','difficulty push off'],alternatives:['Lateral ankle sprain','Fibular injury'],family:'ankle',tier:'Special presentation',rank:54},
 {key:'peroneal_subluxation',name:'Peroneal tendon subluxation pattern',region:'Outer ankle',days:84,terms:['peroneal snapping','tendon flicks behind ankle','outer ankle snap','peroneal subluxation'],mechanisms:['ankle roll','sudden','repetitive'],features:['snapping','instability','behind lateral malleolus'],alternatives:['Peroneal tendinopathy','Lateral ankle sprain'],family:'ankle',tier:'Special presentation',rank:67},
 {key:'distal_ham_tend',name:'Distal hamstring tendinopathy pattern',region:'Back / side of knee',days:70,terms:['distal hamstring','biceps femoris tendon','semimembranosus tendon','back of knee tendon'],mechanisms:['gradual','speed','hill','overuse'],features:['resisted knee flexion','tendon tenderness','fast running'],alternatives:['Popliteus overload','Meniscal irritation'],family:'hamstring',tier:'Special presentation',rank:53},
 {key:'sartorius_gracilis_overload',name:'Sartorius / gracilis overload pattern',region:'Inner thigh to inner knee',days:28,terms:['sartorius','gracilis','inside thigh to knee','diagonal inner thigh'],mechanisms:['hill','change direction','fatigue','gradual'],features:['cross leg','hip flexion','inner knee'],alternatives:['Adductor strain','Pes anserine irritation'],family:'muscle',tier:'Special presentation',rank:64},
 {key:'bakers_cyst',name:'Popliteal or Baker cyst irritation pattern',region:'Back of knee',days:42,terms:['baker cyst','popliteal cyst','fullness behind knee','lump behind knee'],mechanisms:['gradual','joint irritation'],features:['fullness','tight bending','swelling behind knee'],alternatives:['Meniscal irritation','Deep-vein thrombosis'],family:'knee',tier:'Special presentation',rank:61},
 {key:'downhill_quad_overload',name:'Downhill eccentric quadriceps overload / DOMS pattern',region:'Front thigh',days:5,terms:['downhill quadriceps','front thighs sore after downhill','quad doms','eccentric soreness'],mechanisms:['downhill run','new descent','long downhill'],features:['delayed soreness','both thighs','stairs next day','resolves in days'],alternatives:['Quadriceps strain','Femoral bone stress injury'],family:'muscle',tier:'Special presentation',rank:33,selfManage:true},
 {key:'exercise_cramp',name:'Exercise-associated muscle cramp / fatigue pattern',region:'Muscle group',days:3,terms:['muscle cramp','cramping during run','charley horse','spasm'],mechanisms:['fatigue','heat','long run','high intensity'],features:['sudden tightening','resolves after stopping','recurrent cramp'],alternatives:['Muscle strain','Electrolyte or medical contributor'],family:'muscle',tier:'Special presentation',rank:24,selfManage:true},
 {key:'carbon_shoe_transition',name:'Carbon-plated or highly stiff shoe transition overload pattern',region:'Foot / calf / Achilles',days:14,terms:['carbon plate','carbon shoe','super shoe','stiff shoe transition'],mechanisms:['new shoes','abrupt footwear change','race shoes'],features:['forefoot ache','calf tightness','arch fatigue','only in those shoes'],alternatives:['Metatarsal stress injury','Achilles tendinopathy'],family:'foot',tier:'Special presentation',rank:60,selfManage:true},
 {key:'camber_lateral_chain',name:'Road-camber lateral-chain overload pattern',region:'Outer hip / knee / foot',days:14,terms:['cambered road','road camber','one side of road','sloped road'],mechanisms:['cambered road','same route direction','long run'],features:['one sided','outer hip','outer knee','outer foot'],alternatives:['Iliotibial band syndrome','Peroneal overload'],family:'generic',tier:'Special presentation',rank:58,selfManage:true},
 {key:'shoe_toebox_compression',name:'Toe-box compression / forefoot pressure pattern',region:'Forefoot / toes',days:7,terms:['toe box too narrow','forefoot squeezed','shoe compression','toes cramped in shoe'],mechanisms:['tight shoe','new shoes','long run','swelling during run'],features:['relief after shoe removal','numb toes','cramp','pressure'],alternatives:['Morton neuroma pattern','Toe-flexor fatigue'],family:'foot',tier:'Special presentation',rank:41,selfManage:true},
 {key:'metatarsalgia_load',name:'Mechanical metatarsalgia / forefoot-load pattern',region:'Ball of foot',days:28,terms:['metatarsalgia','ball of foot ache','forefoot pressure','under metatarsal heads'],mechanisms:['long run','forefoot loading','thin shoes','hill'],features:['diffuse forefoot ache','worse barefoot hard floor','push off'],alternatives:['Metatarsal bone stress injury','MTP capsulitis'],family:'foot',tier:'Special presentation',rank:32},
 {key:'calf_fatigue_tightness',name:'Calf fatigue / transient tightness pattern',region:'Calf',days:7,terms:['calf tightness','calves feel loaded','calf fatigue','tight calves after run'],mechanisms:['hill','speed','new shoes','long run'],features:['bilateral','settles in 24 hours','no focal tenderness','no bruising'],alternatives:['Soleus strain','Achilles tendinopathy'],family:'muscle',tier:'Special presentation',rank:27,selfManage:true},
 {key:'runner_toe_nail',name:'Runner toe / nail-bed trauma pattern',region:'Toe / nail',days:14,terms:['black toenail','runner toe','toenail pain','nail bruising'],mechanisms:['downhill','shoe too short','long run'],features:['nail discoloration','toe hits shoe','pressure'],alternatives:['Toe fracture','Infection'],family:'foot',tier:'Special presentation',rank:36,selfManage:true}
];

// Broad educational recovery windows for return to unrestricted running.
// These are deliberately ranges rather than clearance dates; symptoms, grade, imaging,
// treatment and functional milestones remain more important than elapsed time.
const INJURY_RECOVERY_WINDOWS={
 prox_ham_strain:[28,49,84],ham_strain:[21,42,70],prox_ham_tend:[84,120,240],gtps:[42,84,180],
 hip_flexor:[14,35,56],adductor_strain:[21,42,70],adductor_tend:[84,120,240],piriformis:[28,56,120],
 quad_strain:[14,35,56],tfl:[21,35,70],pfp:[42,56,84],patellar_tend:[84,120,240],itbs:[21,42,70],
 pes:[21,35,70],meniscus:[28,56,120],mcl:[21,42,84],mtss:[28,56,84],tibial_bsi:[70,112,180],
 cecs:[42,84,180],gastroc:[21,42,70],soleus:[28,49,84],achilles_mid:[84,180,365],achilles_ins:[112,210,420],
 achilles_rupture:[140,210,365],plantar:[84,180,365],peroneal:[42,70,120],post_tib:[84,140,280],
 ankle_sprain:[14,35,84],met_bsi:[56,84,140],navicular_bsi:[98,180,270],sesamoid:[56,98,180],mortons:[28,56,120],
 hip_joint:[42,84,180],hip_labral:[56,112,210],femoral_neck_bsi:[112,180,270],sacral_bsi:[84,140,210],
 ischial_bursa:[42,70,140],athletic_pubalgia:[56,112,210],snapping_hip:[28,56,112],quad_tend:[84,140,280],
 fat_pad:[21,42,84],popliteus:[21,42,84],fibular_bsi:[56,84,140],ant_tib_tend:[42,70,140],
 calcaneal_bsi:[70,112,180],extensor_tend:[28,56,112],fhl_tend:[56,98,180],mtp_synovitis:[42,84,180],
 fifth_met_bsi:[84,168,270],lumbar_radicular:[28,84,180],lateral_plantar_overload:[2,7,21],
 cuboid_overload:[14,21,56],peroneus_longus_overload:[14,28,70],lateral_plantar_nerve:[28,56,120],baxter_nerve:[42,84,180],
 heel_fat_pad:[14,28,84],retrocalc_bursa:[28,56,120],achilles_paratenon:[28,56,120],dorsal_lace_compression:[2,7,21],
 toe_flexor_fatigue:[2,7,21],second_mtp_capsulitis:[42,84,180],turf_toe:[21,42,84],medial_ankle_sprain:[21,42,84],
 syndesmosis_sprain:[42,70,140],peroneal_subluxation:[56,84,180],distal_ham_tend:[56,84,180],sartorius_gracilis_overload:[14,28,56],
 bakers_cyst:[21,42,84],downhill_quad_overload:[2,5,10],exercise_cramp:[1,3,7],carbon_shoe_transition:[7,14,42],
 camber_lateral_chain:[7,14,42],shoe_toebox_compression:[2,7,21],metatarsalgia_load:[14,28,84],calf_fatigue_tightness:[2,7,21],runner_toe_nail:[7,14,42]
};
RUNNER_INJURY_LIBRARY.forEach(x=>{const w=INJURY_RECOVERY_WINDOWS[x.key];if(w){x.minDays=w[0];x.days=w[1];x.maxDays=w[2];}});
function injuryText(i){return [i.bodyRegion,i.location,i.mechanism,i.onset,i.initialSymptoms,i.currentSymptoms,i.painTriggers,i.symptomQuality,i.painDistribution,i.timingPattern,i.shoeEffect,i.surfaceContext,i.loadChange,i.recurrencePattern,i.freeTextClinical].filter(Boolean).join(' ').toLowerCase()}
function injuryMatchText(i){return [i.location,i.mechanism,i.onset,i.initialSymptoms,i.currentSymptoms,i.painTriggers,i.symptomQuality,i.painDistribution,i.timingPattern,i.shoeEffect,i.surfaceContext,i.loadChange,i.recurrencePattern,i.freeTextClinical].filter(Boolean).join(' ').toLowerCase()}
function nullableNumber(v){return v===''||v===null||v===undefined?null:(Number.isFinite(Number(v))?Number(v):null)}
function valueText(v,suffix='/10'){return Number.isFinite(v)?`${v}${suffix}`:'Not assessed'}
function normaliseInjuryLanguage(v){return String(v||'').toLowerCase().replace(/[–—-]/g,' ').replace(/[^a-z0-9\s/]/g,' ').replace(/\s+/g,' ').trim()}
function injuryPhraseMatch(text,phrase){
 const t=normaliseInjuryLanguage(text),p=normaliseInjuryLanguage(phrase);if(!t||!p)return false;if(t.includes(p))return true;
 const words=p.split(' ').filter(w=>w.length>2&&!['pain','injury','running','pattern','possible'].includes(w));
 return words.length>1&&words.every(w=>t.includes(w));
}
function termHits(text,terms=[]){return terms.filter(x=>injuryPhraseMatch(text,x))}
function contextualInjuryBonus(i,key){
 const location=normaliseInjuryLanguage(i.location),triggers=normaliseInjuryLanguage(i.painTriggers),symptoms=normaliseInjuryLanguage(`${i.initialSymptoms||''} ${i.currentSymptoms||''}`),all=`${location} ${triggers} ${symptoms}`;
 const hit=(rx,points)=>rx.test(all)?points:0;
 const rules={
  pfp:()=>hit(/front|around|behind.*(knee ?cap|patella)|knee ?cap|stairs|squat|downhill|after sitting|theater sign/,8),
  patellar_tend:()=>hit(/below.*(knee ?cap|patella)|patellar tendon|jump|hop|accelerat/,9),
  itbs:()=>hit(/outside|outer|lateral.*knee|downhill|after.*(run|kilomet|mile)/,8),
  pes:()=>hit(/inside.*below.*knee|medial.*below|pes anserine/,9),
  meniscus:()=>hit(/joint line|locking|catching|twist|deep squat|giving way|swelling/,8),
  mcl:()=>hit(/inside|inner|medial.*knee|valgus|side impact/,6),
  quad_tend:()=>hit(/above.*(knee ?cap|patella)|quadriceps tendon/,9),
  fat_pad:()=>hit(/under.*(knee ?cap|patella)|fully straighten|extension|pinch.*front/,8),
  popliteus:()=>hit(/back|behind|posterior.*knee|downhill|unlock/,7),
  prox_ham_strain:()=>hit(/sit bone|lower buttock|upper hamstring|sprint|sudden|pop|bruis/,8),
  ham_strain:()=>hit(/back.*thigh|posterior thigh|hamstring|sprint|sudden|pop|bruis/,7),
  prox_ham_tend:()=>hit(/sit bone|lower buttock|sitting|gradual|uphill|fast running/,8),
  gtps:()=>hit(/outside|side|lateral.*hip|lying.*side|single leg|stairs/,8),
  hip_flexor:()=>hit(/front.*hip|lifting.*knee|hip flex|sprint/,8),
  adductor_strain:()=>hit(/inner thigh|groin|adductor|side step|change direction|sudden/,7),
  adductor_tend:()=>hit(/inner thigh|groin|adductor|squeeze|gradual/,7),
  pfp_unused:()=>0,
  mtss:()=>hit(/inside.*shin|medial.*shin|diffuse|long area|warm.*up/,8),
  tibial_bsi:()=>hit(/focal|one spot|point tender|bone|hop|night pain/,10),
  fibular_bsi:()=>hit(/outside.*lower leg|fibula|focal|one spot|hop/,9),
  cecs:()=>hit(/tight|pressure|same distance|resolves.*stop|numb|weak/,9),
  gastroc:()=>hit(/upper calf|back.*calf|push off|sudden|pop/,8),
  soleus:()=>hit(/deep calf|lower calf|bent knee|slow running|gradual/,8),
  achilles_mid:()=>hit(/mid.*achilles|2.*6.*cm|morning stiffness|first steps|tendon/,9),
  achilles_ins:()=>hit(/heel insertion|back.*heel|insertion|shoe pressure|uphill/,9),
  achilles_rupture:()=>hit(/pop|kicked.*calf|cannot.*toe|unable.*push|gap/,13),
  ankle_sprain:()=>hit(/rolled|inversion|twist|outside.*ankle|swelling|bruis/,9),
  lateral_plantar_overload:()=>hit(/bottom.*outer|outer.*sole|lateral.*plantar|little toe side|cramp|after taking.*shoe|tight shoe|narrow shoe|resolv.*(24|48|day|two days)/,12),
  plantar:()=>hit(/under.*heel|bottom.*heel|arch|first steps|morning/,9),
  peroneal:()=>hit(/outside.*ankle|outer.*ankle|peroneal|eversion/,8),
  post_tib:()=>hit(/inside.*ankle|medial.*ankle|arch collapse|single leg heel raise/,9),
  met_bsi:()=>hit(/top.*foot|forefoot|metatarsal|focal|hop/,8),
  fifth_met_bsi:()=>hit(/outside.*foot|base.*fifth|fifth metatarsal|focal/,10),
  navicular_bsi:()=>hit(/top.*midfoot|navicular|n spot|focal/,10),
  sesamoid:()=>hit(/under.*big toe|ball.*foot|sesamoid|push off/,9),
  mortons:()=>hit(/between.*toes|pebble|burning|numb.*toes|tight shoes/,9),
  lumbar_radicular:()=>hit(/low back|radiat|below knee|tingl|numb|electric/,10),
  cuboid_overload:()=>hit(/cuboid|outer.*midfoot|outside.*middle.*foot|push off|uneven surface/,10),
  peroneus_longus_overload:()=>hit(/peroneus longus|under.*cuboid|outer.*arch|camber|eversion/,10),
  lateral_plantar_nerve:()=>hit(/outer.*sole.*(burn|tingl|numb)|little toe.*(tingl|numb)|electric/,11),
  baxter_nerve:()=>hit(/inner.*heel.*burn|medial.*heel.*burn|baxter|not.*first step/,10),
  heel_fat_pad:()=>hit(/central.*heel|bruised.*heel|hard floor|direct pressure/,10),
  retrocalc_bursa:()=>hit(/back.*heel.*swelling|shoe.*rub|retrocalc|between.*achilles.*heel/,10),
  achilles_paratenon:()=>hit(/creak|squeak|crepitus|paratenon|warmth.*achilles/,10),
  dorsal_lace_compression:()=>hit(/lace bite|laces.*tight|top.*foot.*pressure|relief.*loosening/,12),
  toe_flexor_fatigue:()=>hit(/toe.*cramp|toe.*curl|ball.*foot.*cramp|after.*run/,10),
  second_mtp_capsulitis:()=>hit(/second.*toe|second.*mtp|plantar plate|toe drift|ball.*foot/,10),
  turf_toe:()=>hit(/turf toe|big toe.*bent back|hyperextension|big toe.*sprain/,11),
  medial_ankle_sprain:()=>hit(/inner.*ankle.*sprain|medial.*ankle.*swelling|eversion/,10),
  syndesmosis_sprain:()=>hit(/high ankle|syndesmosis|above.*ankle|external rotation/,11),
  peroneal_subluxation:()=>hit(/snapp.*behind.*ankle|peroneal.*snap|tendon.*flick/,11),
  distal_ham_tend:()=>hit(/distal.*hamstring|back.*knee.*tendon|biceps femoris.*tendon|resisted.*knee flex/,10),
  sartorius_gracilis_overload:()=>hit(/sartorius|gracilis|diagonal.*inner thigh|inside.*thigh.*knee/,9),
  bakers_cyst:()=>hit(/baker|popliteal cyst|fullness.*behind.*knee|lump.*behind.*knee/,11),
  downhill_quad_overload:()=>hit(/downhill.*quad|front.*thigh.*sore|doms|stairs.*next day/,11),
  exercise_cramp:()=>hit(/cramp|spasm|charley horse|sudden tightening/,8),
  carbon_shoe_transition:()=>hit(/carbon|super shoe|stiff shoe|only.*those shoes/,11),
  camber_lateral_chain:()=>hit(/cambered|road camber|same side.*road|one sided.*outer/,10),
  shoe_toebox_compression:()=>hit(/toe box|forefoot.*squeez|relief.*shoe removal|toes.*cramped.*shoe/,11),
  metatarsalgia_load:()=>hit(/metatarsalgia|ball.*foot.*ache|under.*metatarsal|diffuse.*forefoot/,10),
  calf_fatigue_tightness:()=>hit(/calf.*tight|calves.*loaded|bilateral.*calf|settles.*24/,9),
  runner_toe_nail:()=>hit(/black toenail|runner toe|nail.*bruis|toe.*hits.*shoe/,11)
 };
 return rules[key]?rules[key]():0;
}
function diagnosisFamily(key=''){
 const d=RUNNER_INJURY_LIBRARY.find(x=>x.key===key);if(d?.family)return d.family;
 if(/bsi|sesamoid/.test(key))return'bone';
 if(/cecs|mortons|radicular|piriformis|plantar_nerve|baxter_nerve/.test(key))return'neural';
 if(/pfp|itbs|menisc|mcl|pes|patellar|quad_tend|fat_pad|popliteus/.test(key))return'knee';
 if(/ankle_sprain|peroneal|medial_ankle|syndesmosis/.test(key))return'ankle';
 if(/post_tib|navicular|met_|mortons|fhl|mtp|extensor|plantar|lateral_plantar|cuboid|peroneus_longus|heel_fat|retrocalc|lace_compression|toe_flexor|turf_toe|toebox|runner_toe/.test(key))return'foot';
 if(/ham/.test(key))return'hamstring';
 if(/hip|labral|snapping|gtps/.test(key))return'hip';
 if(/strain|flexor|adductor|quad|sartorius|tfl|gastroc|soleus|pubalgia|exercise_cramp|calf_fatigue|downhill_quad/.test(key))return'muscle';
 if(/tend|bursa|achilles|ant_tib|paratenon/.test(key))return'tendon';
 return'generic';
}
const INJURY_REGION_KEYS={
 'Hip / pelvis':/prox_ham|gtps|hip_|piriformis|tfl|femoral_neck|sacral|ischial|snapping|lumbar_radicular/,
 'Groin / inner thigh':/adductor|hip_flexor|hip_joint|hip_labral|femoral_neck|athletic_pubalgia|snapping/,
 'Front thigh':/quad_strain|hip_flexor|femoral_neck|downhill_quad_overload/,
 'Back of thigh / hamstring':/ham_strain|prox_ham|distal_ham|piriformis|lumbar_radicular/,
 'Knee':/pfp|patellar_tend|itbs|pes|meniscus|mcl|quad_tend|fat_pad|popliteus|distal_ham|bakers_cyst|sartorius_gracilis/,
 'Shin / lower leg':/mtss|tibial_bsi|cecs|fibular_bsi|ant_tib_tend|soleus/,
 'Calf':/gastroc|soleus|achilles|cecs|fibular_bsi|exercise_cramp|calf_fatigue|carbon_shoe/,
 'Achilles / back of ankle':/achilles|paratenon|retrocalc|gastroc|soleus|post_tib|peroneal/,
 'Ankle':/ankle_sprain|medial_ankle|syndesmosis|peroneal|post_tib|ant_tib_tend|achilles|fhl_tend/,
 'Heel / arch':/lateral_plantar|plantar|baxter|heel_fat|retrocalc|post_tib|calcaneal_bsi|achilles_ins|fhl_tend|cuboid|peroneus_longus/,
 'Forefoot / toes':/lateral_plantar|met_bsi|navicular_bsi|sesamoid|mortons|extensor_tend|fhl_tend|mtp_synovitis|fifth_met_bsi|lace_compression|toe_flexor|second_mtp|turf_toe|toebox|metatarsalgia|runner_toe|carbon_shoe/
};
function regionCompatible(bodyRegion,key){const rx=INJURY_REGION_KEYS[bodyRegion];return !rx||rx.test(key)}
function matchStrength(score,margin){return score>=18&&margin>=5?'Strong':score>=9?'Moderate':'Limited'}
function clinicianLibraryMatch(name){let t=String(name||'').toLowerCase();return RUNNER_INJURY_LIBRARY.map(d=>({...d,hits:[d.name,...d.terms].filter(x=>t.includes(String(x).toLowerCase())).length})).sort((a,b)=>b.hits-a.hits)[0]}
function explicitRedFlags(i,ranked=[]){const t=injuryText(i);let reasons=[];if(ranked.some(x=>x.urgent||diagnosisFamily(x.key)==='bone'))reasons.push('a higher-risk bone, tendon or neurological pattern is among the leading possibilities');if(/night pain|focal bone|point tender|unable to bear|cannot bear|marked weakness|deform|numb|breathless|calf swelling|fever|loss of bladder|loss of bowel/.test(t))reasons.push('a recorded symptom matches a clinical red flag');if(i.pop&&i.bruising&&nullableNumber(i.initialWalkPain)>=5)reasons.push('pop, bruising and major walking limitation were reported together');return[...new Set(reasons)]}
function structuredClinicalEvidence(i){
 const yes=k=>i[k]===true,no=k=>i[k]===false,val=k=>String(i[k]||'').toLowerCase();
 return{yes,no,val,
  morningFirstStep:yes('morningFirstStep'),focalTenderness:yes('focalTenderness'),hopPain:yes('hopPain'),
  numbTingle:yes('numbTingle'),shoeRelated:yes('shoeRelated'),barefootBetter:yes('barefootBetter'),
  resolves48h:yes('resolves48h'),nightPain:yes('nightPain'),lockingCatching:yes('lockingCatching'),
  instability:yes('instability'),loadIncrease:yes('recentLoadIncrease'),newShoes:yes('newShoes'),cambered:yes('camberedSurface')};
}
function contradictionPenalty(i,key){
 const e=structuredClinicalEvidence(i);let n=0;
 if(key==='plantar'&&e.no('morningFirstStep'))n+=7;
 if(/bsi/.test(key)&&e.resolves48h)n+=9;
 if(/bsi/.test(key)&&e.no('focalTenderness')&&e.no('hopPain'))n+=5;
 if(key==='lateral_plantar_overload'&&(e.morningFirstStep||e.focalTenderness||e.nightPain))n+=7;
 if(key==='mortons'&&e.no('numbTingle'))n+=4;
 if(key==='meniscus'&&e.no('lockingCatching'))n+=3;
 if(/sprain|mcl/.test(key)&&String(i.onset||'').toLowerCase()==='gradual')n+=4;
 if(/strain|rupture/.test(key)&&String(i.onset||'').toLowerCase()==='gradual')n+=3;
 return n;
}
function structuredBonus(i,key){
 const e=structuredClinicalEvidence(i);let n=0;
 if(key==='lateral_plantar_overload')n+=(e.shoeRelated?6:0)+(e.resolves48h?7:0)+(e.barefootBetter?3:0)+(e.cambered?2:0)+(e.newShoes?2:0);
 if(key==='plantar')n+=(e.morningFirstStep?8:0);
 if(/bsi/.test(key))n+=(e.focalTenderness?7:0)+(e.hopPain?5:0)+(e.nightPain?6:0);
 if(key==='mortons')n+=(e.numbTingle?6:0)+(e.shoeRelated?4:0);
 if(key==='meniscus')n+=(e.lockingCatching?7:0);
 if(key==='prox_ham_tend')n+=(i.sittingPain===true?5:0)+(i.resistedPain===true?3:0);
 if(key==='cecs')n+=(i.exertionalResolution===true?6:0);
 if(/ankle_sprain|mcl/.test(key))n+=(e.instability?4:0);
 if(e.loadIncrease&&/tend|pfp|itbs|mtss|plantar|overload/.test(key))n+=2;
 return n;
}
function appPatternDiagnosis(i){
 const text=injuryMatchText(i),initialPain=nullableNumber(i.initialPain),walk=nullableNumber(i.initialWalkPain),bodyRegion=i.bodyRegion||'';
 let ranked=RUNNER_INJURY_LIBRARY.filter(d=>regionCompatible(bodyRegion,d.key)).map(d=>{const location=termHits(text,d.terms),mechanism=termHits(text,d.mechanisms),features=termHits(text,d.features),contextBonus=contextualInjuryBonus(i,d.key),structured=structuredBonus(i,d.key),contradiction=contradictionPenalty(i,d.key);let score=location.length*5+mechanism.length*2.5+features.length*3+contextBonus+structured-contradiction;if(i.onset&&d.mechanisms.some(x=>injuryPhraseMatch(i.onset,x)))score+=2;if(i.pop&&/strain|rupture|tear|sprain/.test(d.name.toLowerCase()))score+=3;if(i.bruising&&/strain|rupture|tear|sprain|stress injury/.test(d.name.toLowerCase()))score+=2;if(Number.isFinite(initialPain)&&initialPain>=7&&/strain|rupture|stress injury|sprain/.test(d.name.toLowerCase()))score+=1.5;if(Number.isFinite(walk)&&walk>=5&&/stress injury|rupture|strain|sprain/.test(d.name.toLowerCase()))score+=1;return{...d,score,location,mechanism,features,contextBonus,structured,contradiction};}).filter(x=>x.score>=5&&(x.location.length||x.features.length||x.contextBonus>=6||x.structured>=6)).sort((a,b)=>b.score-a.score);
 if(!ranked.length){const region=(bodyRegion||i.location||'lower limb').trim();return{name:`Undifferentiated ${region.toLowerCase()} running-injury pattern`,source:'App clinical reasoning',strength:'Limited',evidence:['the selected region is known, but the current answers do not yet separate the compatible patterns'],alternatives:RUNNER_INJURY_LIBRARY.filter(d=>regionCompatible(bodyRegion,d.key)).slice(0,4).map(d=>d.name),nominalDays:56,minDays:28,maxDays:112,key:'',family:bodyRegion==='Knee'?'knee':'generic',ranked:[],missing:adaptiveFollowUpQuestions(i,[]),urgent:false,safetyReasons:explicitRedFlags(i,[]),score:0};}
 const top=ranked[0],second=ranked[1],margin=top.score-(second?.score||0),evidence=[...top.location.map(x=>`location: ${x}`),...top.mechanism.map(x=>`mechanism: ${x}`),...top.features.map(x=>`feature: ${x}`)];if(top.contextBonus>=6)evidence.push('the pain location and aggravating activities fit this pattern');if(top.structured>=3)evidence.push('structured symptom answers strengthen this pattern');if(top.contradiction>0)evidence.push('some answers conflict with the pattern and reduce confidence');if(i.pop)evidence.push('pop/snap reported');if(i.bruising)evidence.push('bruising/swelling reported');if(Number.isFinite(initialPain))evidence.push(`initial pain ${initialPain}/10`);if(Number.isFinite(walk))evidence.push(`initial walking pain ${walk}/10`);
 const displayRanked=ranked.slice(0,4).map((x,n)=>({name:x.name,region:x.region,strength:matchStrength(x.score,n===0?margin:0),urgent:!!x.urgent,key:x.key,score:Math.max(0,Math.round(x.score))}));const safetyReasons=explicitRedFlags(i,ranked.slice(0,4));return{name:top.name,source:'App clinical reasoning',strength:matchStrength(top.score,margin),evidence:evidence.length?evidence:['location and symptom pattern'],alternatives:[...(top.alternatives||[]),...displayRanked.slice(1).map(x=>x.name)].filter((x,n,a)=>a.indexOf(x)===n).slice(0,5),nominalDays:top.days,minDays:top.minDays||Math.round(top.days*.7),maxDays:top.maxDays||Math.round(top.days*1.5),key:top.key,family:diagnosisFamily(top.key),coverageTier:top.tier||'Core injury',coverageRank:top.rank||null,ranked:displayRanked,missing:adaptiveFollowUpQuestions(i,ranked),urgent:safetyReasons.length>0,safetyReasons,score:top.score};
}
function adaptiveFollowUpQuestions(i,ranked=[]){
 const region=i.bodyRegion||'',q=[];const add=(field,text)=>{if(!known(i[field]))q.push(text)};
 add('focalTenderness','Is there one precise point that is markedly tender?');add('hopPain','Does single-leg hopping reproduce the symptom?');add('nightPain','Is pain present at night or at rest?');
 if(/Heel|Forefoot|Ankle/.test(region)){add('morningFirstStep','Are the first steps in the morning painful?');add('shoeRelated','Do tighter shoes or lacing make it worse?');add('barefootBetter','Does removing the shoe or walking barefoot improve it?');add('numbTingle','Is there burning, numbness or tingling?');add('resolves48h','Does it reliably settle within 24–48 hours?');}
 if(region==='Knee'){add('lockingCatching','Does the knee lock, catch or swell?');add('instability','Does it give way or feel unstable?');}
 if(/Hip|Groin|thigh|hamstring/.test(region)){add('sittingPain','Does prolonged sitting reproduce it?');add('resistedPain','Does resisted contraction reproduce it?');}
 if(/Shin|Calf/.test(region)){add('exertionalResolution','Does tightness reliably stop within minutes after ending the run?');add('numbTingle','Is numbness or weakness present?');}
 add('recentLoadIncrease','Was there a recent increase in distance, speed, hills or frequency?');add('newShoes','Did shoes, insoles or lacing change recently?');return q.slice(0,6);
}
function clinicianVerification(i,app){
 const entered=String(i.clinicalDiagnosis||'').trim();if(!entered)return null;
 const mapped=clinicianLibraryMatch(entered),hasMap=!!mapped?.hits,appKey=app?.key||'',agrees=hasMap&&mapped.key===appKey;
 const inDifferential=hasMap&&app?.ranked?.some(x=>x.key===mapped.key);
 const verdict=agrees?'confirms':inDifferential?'partly_agrees':'contradicts';
 const status=verdict==='confirms'?'App assessment confirms the clinician diagnosis':verdict==='partly_agrees'?'App assessment partly agrees: the clinician diagnosis remains plausible but is not the leading pattern':'App assessment contradicts the clinician diagnosis based on the current answers';
 let reasons=[];
 if(agrees)reasons.push('the independently ranked symptom pattern matches the clinician-entered diagnosis');
 else if(inDifferential)reasons.push('the clinician diagnosis remains in the differential, but another pattern fits the current answers better');
 else reasons.push('the recorded symptoms and functional findings do not currently reproduce the clinician-entered diagnosis');
 if(!hasMap)reasons.push('the clinician wording could not be mapped confidently to the app injury library');
 return{entered,mapped:hasMap?mapped:null,status,verdict,agrees,inDifferential,reasons};
}
function workingDiagnosis(i){
 const app=appPatternDiagnosis(i),verification=clinicianVerification(i,app),enteredDays=nullableNumber(i.clinicianExpectedDays);if(!verification)return{...app,verification:null};
 const useMapped=verification.mapped&&verification.agrees,base=useMapped?verification.mapped:RUNNER_INJURY_LIBRARY.find(x=>x.key===app.key);return{...app,verification,clinicianEntered:verification.entered,nominalDays:enteredDays??(base?.days||app.nominalDays),minDays:enteredDays??(base?.minDays||app.minDays),maxDays:enteredDays??(base?.maxDays||app.maxDays),source:'App clinical reasoning with clinician cross-check'};
}
function injuryCausePrevention(i,diag){
 const e=structuredClinicalEvidence(i),causes=[],prevention=[];if(e.loadIncrease)causes.push('Recent training-load increase may have exceeded current tissue capacity.');if(e.newShoes||e.shoeRelated)causes.push('Footwear fit, lacing, stiffness or pressure may be contributing.');if(e.cambered)causes.push('Cambered or uneven surfaces may be repeatedly loading one side.');
 if(diag.key==='lateral_plantar_overload'){causes.push('The lateral plantar muscles may be fatiguing or being compressed during running.');prevention.push('Use a shoe with adequate forefoot width and avoid overtight lacing.','Progress long-run duration gradually and alternate cambered-road direction.','Add short-foot control and controlled calf raises 2–3 times weekly.','Stop before the cramp-like symptom escalates rather than running through it.');}
 else if(diag.key==='dorsal_lace_compression'){causes.push('Lacing pressure or a low-volume shoe upper may be compressing the extensor tendons and superficial tissues.');prevention.push('Use window lacing over the tender area.','Reduce lace tension and check shoe volume over the instep.','Do not use the provoking shoe for long runs until symptom-free.');}
 else if(diag.key==='shoe_toebox_compression'){causes.push('The toe box may be too narrow once the foot swells during longer running.');prevention.push('Use adequate toe-box width and thumb-width length.','Test shoes late in the day when feet are larger.','Loosen forefoot lacing before longer runs.');}
 else if(diag.key==='carbon_shoe_transition'){causes.push('A sudden change in shoe stiffness and rocker geometry may have shifted load to the calf, Achilles, arch or forefoot.');prevention.push('Introduce stiff or plated shoes in short easy runs first.','Alternate with familiar shoes.','Increase duration before using them for speed or long runs.');}
 else if(diag.key==='camber_lateral_chain'){causes.push('Repeated road camber may be loading the downhill-side hip, knee, peroneals and outer foot asymmetrically.');prevention.push('Alternate road side or route direction where safe.','Prefer flatter surfaces while symptoms settle.','Avoid combining camber, hills and long duration in one progression step.');}
 else if(diag.key==='exercise_cramp'){causes.push('Neuromuscular fatigue is the commonest immediate contributor; heat, pacing and individual fluid or sodium losses may also contribute.');prevention.push('Build event-specific endurance and avoid abrupt pace surges.','Start long or hot runs conservatively.','Use an individual hydration and sodium plan rather than assuming all cramps are electrolyte deficiency.');}
 else if(diag.key==='downhill_quad_overload'){causes.push('Unaccustomed eccentric braking on descents can produce delayed quadriceps soreness without a structural tear.');prevention.push('Introduce downhill volume gradually.','Use short controlled descents before long technical downhill running.','Maintain quadriceps strength and avoid hard downhill sessions when already fatigued.');}
 else if(diag.family==='tendon'){causes.push('Repeated load may currently exceed tendon capacity.');prevention.push('Build volume and speed progressively.','Continue progressive strength after symptoms settle.','Avoid abrupt changes in hills, speed or footwear.');}
 else if(diag.family==='bone'){causes.push('Repeated impact load and insufficient recovery may be contributing.');prevention.push('Do not progress impact until clinically assessed.','Review recent load, energy availability and recovery.');}
 else if(diag.family==='muscle'||diag.family==='hamstring'){causes.push('High-speed or fatigue-related muscle load may have exceeded capacity.');prevention.push('Reintroduce speed progressively.','Maintain strength through full range and include warm-up accelerations.');}
 else{causes.push('The pattern is usually influenced by the interaction of training load, tissue capacity, biomechanics and recovery.');prevention.push('Change one training variable at a time.','Maintain strength and monitor recurrence after harder sessions.');}
 const libraryEntry=RUNNER_INJURY_LIBRARY.find(x=>x.key===diag.key),transient=!!libraryEntry?.selfManage&&e.resolves48h&&!e.focalTenderness&&!e.hopPain&&!e.nightPain&&!e.numbTingle; if(!causes.length)causes.push('No single cause can be established from the current information.');return{causes:[...new Set(causes)],prevention:[...new Set(prevention)],needsRehab:!transient,selfManagement:transient};
}
function known(v){return v!==null&&v!==undefined}
function sortedChecks(i){return(i.checkIns||[]).slice().sort((a,b)=>a.date.localeCompare(b.date))}
function lastObserved(checks,field,predicate=v=>known(v)){
 for(let n=checks.length-1;n>=0;n--){const v=checks[n]?.[field];if(predicate(v))return{value:v,date:checks[n].date,check:checks[n],index:n};}
 return{value:null,date:null,check:null,index:-1};
}
function observedValue(checks,field,fallback=null,predicate=v=>known(v)){const x=lastObserved(checks,field,predicate);return x.index>=0?x.value:fallback}
function daysSinceObserved(obs){return obs?.date?Math.max(0,Math.round((today()-dte(obs.date))/DAY)):null}
function latestAdverse(checks,field){const x=lastObserved(checks,field);return x.index>=0&&x.value===true&&daysSinceObserved(x)<=2}
function recentChecks(checks,days=14){const cut=today().getTime()-days*DAY;return checks.filter(c=>dte(c.date).getTime()>=cut)}
function runEvidence(checks){
 const normalized=checks.map(c=>Number(c.runMinutes)>0&&['not_assessed','not_planned',null,undefined,''].includes(c.runStatus)?{...c,runStatus:'completed'}:c);
 // A completed exposure is historical evidence even when gait or next-day tolerance
 // was not assessed. Those response fields determine whether it was tolerated, not
 // whether the run happened.
 const completed=normalized.filter(c=>c.runStatus==='completed'&&Number(c.runMinutes)>0);
 const tolerated=completed.filter(c=>c.nextDayWorse===false&&c.alteredGait===false);
 const provisionallyTolerated=completed.filter(c=>c.nextDayWorse!==true&&c.alteredGait!==true);
 const lastCompleted=completed.at(-1)||null;
 const lastTolerated=tolerated.at(-1)||null;
 const lastAttempt=normalized.slice().reverse().find(c=>['completed','stopped','unable'].includes(c.runStatus)||Number(c.runMinutes)>0)||null;
 const latest=normalized.at(-1)||{};
 const latestNeutral=['not_planned','rest_day','not_assessed',undefined,null,''].includes(latest.runStatus);
 return{
  completed,tolerated,successful:provisionallyTolerated,lastCompleted,lastTolerated,lastSuccess:lastTolerated,lastAttempt,
  preserved:!!lastCompleted&&latestNeutral,
  bestCompletedMinutes:completed.length?Math.max(...completed.map(c=>Number(c.runMinutes)||0)):0,
  bestMinutes:provisionallyTolerated.length?Math.max(...provisionallyTolerated.map(c=>Number(c.runMinutes)||0)):0,
  lastCompletedMinutes:lastCompleted?Number(lastCompleted.runMinutes)||0:null,
  lastMinutes:lastTolerated?Number(lastTolerated.runMinutes)||0:null
 };
}
function longitudinalSnapshot(i,checks){
 const latest=checks.at(-1)||{},run=runEvidence(checks),recent=recentChecks(checks,14);
 const painObs=lastObserved(checks,'pain',Number.isFinite),walkObs=lastObserved(checks,'walkPain',Number.isFinite),confidenceObs=lastObserved(checks,'confidence',Number.isFinite),stiffObs=lastObserved(checks,'morningStiffness',Number.isFinite),walkMinObs=lastObserved(checks,'walkMinutes',Number.isFinite),stairsObs=lastObserved(checks,'stairs'),strengthObs=lastObserved(checks,'bridge'),impactObs=lastObserved(checks,'hop');
 const trendVals=recent.filter(c=>Number.isFinite(c.pain)).map(c=>c.pain),painTrend=trendVals.length>=2?trendVals.at(-1)-trendVals[0]:null;
 return{latest,run,recent,painObs,walkObs,confidenceObs,stiffObs,walkMinObs,stairsObs,strengthObs,impactObs,painTrend,
  currentPain:painObs.index>=0?Number(painObs.value):nullableNumber(i.currentPain),walkPain:walkObs.index>=0?Number(walkObs.value):nullableNumber(i.currentWalkPain),
  strength:strengthObs.value,impact:impactObs.value,confidence:confidenceObs.value,morningStiffness:stiffObs.value,walkMinutes:walkMinObs.value,stairs:stairsObs.value};
}
function checkStatus(checks,test){const assessed=checks.filter(test.assessed),met=assessed.length?test.pass(assessed):null;return met===null?'unknown':met?'met':'notMet'}
function criterionState(i,p,stageIndex){const checks=sortedChecks(i),snap=longitudinalSnapshot(i,checks),stable=checks.filter(c=>c.nextDayWorse===false&&c.newSwelling===false),run=runEvidence(checks),tests={
 'Symptoms stable or improving':{assessed:c=>known(c.symptomTrend)||known(c.nextDayWorse)||Number.isFinite(c.pain),pass:()=>{const last=checks.slice(-3);return !last.some(c=>c.symptomTrend==='worse'||c.nextDayWorse===true)&&!(Number.isFinite(snap.painTrend)&&snap.painTrend>=2)}},
 'No new swelling or bruising':{assessed:c=>known(c.newSwelling),pass:a=>a.slice(-2).every(c=>c.newSwelling===false)},
 'Walking pain ≤3/10':{assessed:c=>Number.isFinite(c.walkPain),pass:()=>Number.isFinite(snap.walkPain)&&snap.walkPain<=3},
 'Walking pain ≤1/10':{assessed:c=>Number.isFinite(c.walkPain),pass:()=>Number.isFinite(snap.walkPain)&&snap.walkPain<=1},
 'Current pain ≤3/10':{assessed:c=>Number.isFinite(c.pain),pass:()=>Number.isFinite(snap.currentPain)&&snap.currentPain<=3},
 'Gentle double-leg loading tolerated':{assessed:c=>known(c.bridge),pass:()=>snap.strength===true},
 'Current pain ≤2/10':{assessed:c=>Number.isFinite(c.pain),pass:()=>Number.isFinite(snap.currentPain)&&snap.currentPain<=2},
 'Repeated bridge or hinge controlled':{assessed:c=>known(c.bridge),pass:()=>checks.filter(c=>c.bridge===true).length>=2},
 'No worse the next morning':{assessed:c=>known(c.nextDayWorse),pass:()=>stable.slice(-2).length>=2},
 'Walking pain 0/10':{assessed:c=>Number.isFinite(c.walkPain),pass:()=>snap.walkPain===0},
 'Gentle hopping tolerated':{assessed:c=>known(c.hop),pass:()=>checks.filter(c=>c.hop===true).length>=2},
 'Pain remains ≤2/10':{assessed:c=>Number.isFinite(c.pain),pass:()=>checks.filter(c=>Number.isFinite(c.pain)).slice(-2).every(c=>c.pain<=2)&&checks.filter(c=>Number.isFinite(c.pain)).slice(-2).length>=2},
 'No next-morning flare':{assessed:c=>known(c.nextDayWorse),pass:()=>stable.slice(-2).length>=2},
 'At least 10 minutes running tolerated':{assessed:c=>['completed','stopped','unable'].includes(c.runStatus)||Number.isFinite(c.runMinutes),pass:()=>run.successful.filter(c=>Number(c.runMinutes)>=10).length>=2},
 'No altered gait':{assessed:c=>known(c.alteredGait),pass:()=>run.successful.slice(-2).length>=2&&run.successful.slice(-2).every(c=>c.alteredGait===false)},
 'At least 30 minutes easy running tolerated':{assessed:c=>['completed','stopped','unable'].includes(c.runStatus)||Number.isFinite(c.runMinutes),pass:()=>run.successful.filter(c=>Number(c.runMinutes)>=30).length>=2},
 'Pain ≤1/10':{assessed:c=>Number.isFinite(c.pain),pass:()=>checks.filter(c=>Number.isFinite(c.pain)).slice(-2).length>=2&&checks.filter(c=>Number.isFinite(c.pain)).slice(-2).every(c=>c.pain<=1)},
 'Strength and impact confidence restored':{assessed:c=>known(c.bridge)||known(c.hop)||Number.isFinite(c.confidence),pass:()=>checks.filter(c=>c.bridge===true&&c.hop===true&&Number(c.confidence)>=8).length>=2}
 };return INJURY_STAGES[stageIndex].criteria.map(label=>{let t=tests[label],status=t?checkStatus(checks,t):'unknown';return{label,status,met:status==='met'};});}
function injuryPrediction(i){
 const checks=sortedChecks(i),latest=checks.at(-1)||{},diag=workingDiagnosis(i),initialPain=nullableNumber(i.initialPain),walkInitially=nullableNumber(i.initialWalkPain);let nominalTotal=Number(diag.nominalDays)||56;const severityKnown=Number.isFinite(initialPain)||Number.isFinite(walkInitially)||i.pop||i.bruising;const severityFactor=!severityKnown?1:(initialPain>=8||i.pop||walkInitially>=8?1.18:initialPain>=6||i.bruising||walkInitially>=5?1.08:initialPain<=2&&walkInitially<=1?.88:1);nominalTotal=Math.round(nominalTotal*severityFactor);const baselineMin=Math.max(7,Math.round((Number(diag.minDays)||nominalTotal*.7)*severityFactor)),baselineMax=Math.max(baselineMin+7,Math.round((Number(diag.maxDays)||nominalTotal*1.5)*severityFactor));
 const snap=longitudinalSnapshot(i,checks),currentPain=Number.isFinite(snap.currentPain)?snap.currentPain:initialPain,walkPain=Number.isFinite(snap.walkPain)?snap.walkPain:walkInitially,elapsed=Math.max(0,Math.floor((today()-dte(i.date))/DAY));
 let stage=0;for(let target=1;target<INJURY_STAGES.length;target++){const c=criterionState(i,{currentPain,walkPain},target);if(c.length&&c.every(x=>x.status==='met'))stage=target;else break;}if(diag.urgent)stage=Math.min(stage,1);
 const completion=injuryCompletionForChecks(i,checks,diag,initialPain,walkInitially),nominal=Math.round(clamp(elapsed/nominalTotal*100,0,100)),delta=completion===null?null:completion-nominal;
 const nominalRemaining=Math.max(7,nominalTotal-elapsed),stageRemaining=Math.max(7,Math.round(nominalTotal*[.94,.78,.60,.42,.25,.10][stage]));
 let trendRemaining=null,trendRate=null;if(checks.length>=2){const points=checks.map((c,idx)=>({day:Math.max(0,Math.round((dte(c.date)-dte(i.date))/DAY)),score:injuryCompletionForChecks(i,checks.slice(0,idx+1),diag,initialPain,walkInitially)})).filter(x=>Number.isFinite(x.score));if(points.length>=2){const first=points[0],last=points.at(-1),span=Math.max(1,last.day-first.day),gain=last.score-first.score;trendRate=gain/span;if(trendRate>.15)trendRemaining=Math.round((100-last.score)/trendRate);}}
 let remaining=trendRemaining!==null?Math.round(nominalRemaining*.35+stageRemaining*.35+clamp(trendRemaining,7,baselineMax)*.30):Math.round(nominalRemaining*.55+stageRemaining*.45);
 if(Number.isFinite(delta))remaining+=Math.round(clamp(-delta*.20,-14,21));if(latestAdverse(checks,'nextDayWorse'))remaining+=7;if(latestAdverse(checks,'newSwelling'))remaining+=7;if(latestAdverse(checks,'alteredGait'))remaining+=4;if(snap.run.lastAttempt?.runStatus==='unable'||snap.run.lastAttempt?.runStatus==='stopped')remaining+=4;if(diag.urgent)remaining=Math.max(remaining,Math.max(14,baselineMin-elapsed));
 remaining=Math.max(7,Math.min(Math.max(14,Math.round(baselineMax*1.25)),remaining));const total=elapsed+remaining,central=new Date(today().getTime()+remaining*DAY),uncertainty=checks.length>=7?Math.max(7,Math.round(nominalTotal*.12)):checks.length>=3?Math.max(10,Math.round(nominalTotal*.18)):Math.max(14,Math.round(nominalTotal*.25)),rangeStartTotal=Math.max(elapsed+7,Math.max(baselineMin,total-uncertainty)),rangeEndTotal=Math.max(rangeStartTotal+7,Math.min(Math.round(baselineMax*1.25),total+uncertainty)),windowStart=iso(new Date(dte(i.date).getTime()+rangeStartTotal*DAY)),windowEnd=iso(new Date(dte(i.date).getTime()+rangeEndTotal*DAY)),confidence=checks.length>=7?'Moderate':checks.length>=3?'Developing':'Low';return{nominalTotal,baselineMin,baselineMax,total,elapsed,remaining,stage,fullDate:iso(central),windowStart,windowEnd,confidence,currentPain,walkPain,completion,nominal,delta,latest,checks,diag,safetyHold:diag.urgent,trendRate,snapshot:snap};
}
function injuryCompletionForChecks(i,checks,diag,initialPain,walkInitially){
 if(!checks.length)return null;const snap=longitudinalSnapshot(i,checks),currentPain=Number.isFinite(snap.currentPain)?snap.currentPain:initialPain,walkPain=Number.isFinite(snap.walkPain)?snap.walkPain:walkInitially;let stage=0;for(let target=1;target<INJURY_STAGES.length;target++){const c=criterionState({...i,checkIns:checks},{currentPain,walkPain},target);if(c.length&&c.every(x=>x.status==='met'))stage=target;else break;}if(diag.urgent)stage=Math.min(stage,1);
 const stageBase=[5,18,36,56,74,90][stage];let within=0;
 if(Number.isFinite(currentPain))within+=(3-currentPain)*1.6;
 if(Number.isFinite(walkPain))within+=(1-walkPain)*1.6;
 if(snap.strength===true)within+=2;if(snap.strength===false)within-=2;
 if(snap.impact===true)within+=2;if(snap.impact===false)within-=2;
 if(snap.run.bestMinutes>=10)within+=2;if(snap.run.bestMinutes>=30)within+=2;
 if(Number.isFinite(snap.confidence))within+=(snap.confidence-5)*.45;
 if(Number.isFinite(snap.morningStiffness))within+=snap.morningStiffness<=10?1:snap.morningStiffness>=45?-2:0;
 const recent=snap.recent;
 if(recent.some(c=>c.nextDayWorse===true))within-=3;
 if(recent.some(c=>c.newSwelling===true))within-=3;
 if(recent.some(c=>c.alteredGait===true))within-=2;
 if(snap.painTrend!==null)within+=snap.painTrend<=-2?2:snap.painTrend>=2?-3:0;
 // A rest day or an unassessed activity does not erase a previously demonstrated capability.
 return Math.round(clamp(stageBase+Math.max(-10,Math.min(12,within)),0,98));
}
function milestoneStatus(p){const checks=p.checks,stable=checks.filter(c=>c.nextDayWorse===false),twoRun=stable.filter(c=>Number(c.runMinutes)>=10&&!c.alteredGait).length>=2,twoLong=stable.filter(c=>Number(c.runMinutes)>=30&&!c.alteredGait).length>=2;return[
 {name:'Comfortable walking',status:Number.isFinite(p.walkPain)?(p.walkPain===0?'met':'notMet'):'unknown'},
 {name:'Strength loading',status:checks.filter(c=>c.bridge===true).length>=2?'met':checks.some(c=>known(c.bridge))?'notMet':'unknown'},
 {name:'Impact tolerance',status:checks.filter(c=>c.hop===true).length>=2?'met':checks.some(c=>known(c.hop))?'notMet':'unknown'},
 {name:'Walk–run',status:twoRun?'met':checks.some(c=>known(c.runMinutes))?'notMet':'unknown'},
 {name:'Continuous easy run',status:twoLong?'met':checks.some(c=>Number(c.runMinutes)>0)?'notMet':'unknown'},
 {name:'Full training',status:p.stage>=5&&twoLong?'met':'unknown'}];}
function comparisonFactors(i,p){let s=p.snapshot||longitudinalSnapshot(i,p.checks),f=[],add=(name,actual,nominal,status,reason)=>f.push({name,actual,nominal,status,reason}),unknown='unknown';
 add('Pain',valueText(p.currentPain),p.elapsed<14?'3–5/10':'0–3/10',!Number.isFinite(p.currentPain)?unknown:p.currentPain<=2?'ahead':p.currentPain>=5?'behind':'on',!Number.isFinite(p.currentPain)?'Pain has not been assessed.':p.currentPain<=2?'Latest reported pain supports progressive loading.':p.currentPain>=5?'Latest reported pain remains higher than expected.':'Latest reported pain is within the broad expected range.');
 add('Walking',Number.isFinite(p.walkPain)?`${p.walkPain}/10 pain`:'Not assessed',p.elapsed<10?'Some limitation':'Comfortable',!Number.isFinite(p.walkPain)?unknown:p.walkPain===0?'ahead':p.walkPain>=3?'behind':'on',!Number.isFinite(p.walkPain)?'Walking pain has not been assessed.':p.walkPain===0?'Comfortable walking has been demonstrated.':'Walking symptoms still limit progression.');
 add('Strength',s.strength===true?'Controlled':s.strength===false?'Not tolerated':'Not assessed',p.elapsed<21?'Beginning':'Controlled repeated loading',!known(s.strength)?unknown:s.strength?'ahead':'behind',!known(s.strength)?'No recent strength assessment is available.':s.strength?'The most recent assessed strength task was controlled.':'The most recent assessed strength task was not tolerated.');
 add('Impact',s.impact===true?'Tolerated':s.impact===false?'Not tolerated':'Not assessed',p.elapsed<28?'Usually not required':'Expected to be emerging',!known(s.impact)?unknown:s.impact?'ahead':p.elapsed>=28?'behind':'on',!known(s.impact)?'No impact assessment is available.':s.impact?'The latest assessed low-level impact was tolerated.':'The latest assessed impact task was not tolerated.');
 const lastRun=s.run.lastCompleted;
 const runActual=lastRun?`${s.run.lastCompletedMinutes} min on ${fmtDate(lastRun.date)}`:(s.run.lastAttempt?.runStatus==='unable'?'Unable on last attempt':s.run.lastAttempt?.runStatus==='stopped'?'Stopped due to symptoms':'Not assessed');
 const confirmedTolerance=!!lastRun&&lastRun.nextDayWorse===false&&lastRun.alteredGait===false;
 const adverseRun=!!lastRun&&(lastRun.nextDayWorse===true||lastRun.alteredGait===true);
 const runStatus=!lastRun?(s.run.lastAttempt?.runStatus==='unable'||s.run.lastAttempt?.runStatus==='stopped'?'behind':unknown):adverseRun?'behind':s.run.bestCompletedMinutes>=10?'ahead':'on';
 let runReason;
 if(lastRun){
  const neutralToday=s.latest.date!==lastRun.date&&['not_planned','rest_day','not_assessed',undefined,null,''].includes(s.latest.runStatus);
  if(adverseRun)runReason=`A ${s.run.lastCompletedMinutes}-minute run was completed on ${fmtDate(lastRun.date)}, but gait or delayed symptoms indicate it was not yet fully tolerated.`;
  else if(confirmedTolerance)runReason=neutralToday?'No run was planned or assessed today; the last confirmed running capacity is retained.':'The latest completed run was followed by normal gait and a stable next-day response.';
  else runReason=neutralToday?'No run was planned or assessed today; yesterday’s completed running duration remains recorded, while tolerance awaits gait and next-day-response evidence.':'The running exposure is recorded, but full tolerance is not yet confirmed because gait or next-day response was not assessed.';
 }else runReason=runStatus==='behind'?'The last attempted run was limited by symptoms.':'Running ability has not yet been assessed.';
 add('Running',runActual,p.elapsed<28?'Often 0 min':'Some easy exposure',runStatus,runReason);
 const resp=lastObserved(p.checks,'nextDayWorse');add('Load response',resp.index<0?'Not assessed':resp.value?'Worse':'Stable','Stable',resp.index<0?unknown:resp.value?'behind':'ahead',resp.index<0?'No next-day load response has been recorded.':resp.value?'The most recently assessed load caused a delayed flare.':'The most recently assessed load did not worsen symptoms the next day.');
 return f;}
function recoveryScoreExplanation(i,p,factors=comparisonFactors(i,p)){
 if(p.completion===null)return{status:'unknown',label:'Not enough evidence',text:'Complete daily check-ins to compare observed recovery with the nominal pathway. Calendar time alone does not create a recovery score.'};
 const ahead=factors.filter(x=>x.status==='ahead'),behind=factors.filter(x=>x.status==='behind');
 const status=p.delta>=8?'ahead':p.delta<=-8?'behind':'on';
 const label=status==='ahead'?'Ahead of nominal':status==='behind'?'Behind nominal':'Close to nominal';
 const lead=status==='ahead'?`${Math.abs(p.delta)} percentage points ahead of the nominal pathway.`:status==='behind'?`${Math.abs(p.delta)} percentage points behind the nominal pathway.`:`Within ${Math.abs(p.delta)} percentage points of the nominal pathway.`;
 const positives=ahead.slice(0,3).map(x=>x.name.toLowerCase());const limits=behind.slice(0,3).map(x=>x.name.toLowerCase());
 let why='The score reflects the current stage, symptoms, walking, strength, impact, running exposure and next-morning response.';
 if(status==='ahead'&&positives.length)why=`Main positive evidence: ${positives.join(', ')}.`;
 if(status==='behind'&&limits.length)why=`Main limiting evidence: ${limits.join(', ')}.`;
 if(status==='on'){const parts=[];if(positives.length)parts.push(`positive: ${positives.join(', ')}`);if(limits.length)parts.push(`limiting: ${limits.join(', ')}`);if(parts.length)why=`The evidence is balanced (${parts.join('; ')}).`;}
 return{status,label,text:`${lead} ${why}`};
}
function exerciseList(i,p){if(p.safetyHold)return INJURY_EXERCISES.bone;let family=p.diag.family||'generic',list=INJURY_EXERCISES[family]||INJURY_EXERCISES.muscle,exact=list.filter(x=>x.stage===p.stage);if(!exact.length)exact=list.filter(x=>x.stage<=p.stage).slice(-1);return exact;}

function rehabCalendarSignature(day){return JSON.stringify({type:day.type,title:day.title,items:day.items,running:day.running,rationale:day.rationale,rule:day.rule,stage:day.stage,walkingTarget:day.walkingTarget,stretchGoal:day.stretchGoal});}
function walkingPrescription(i,p,offset,type){
 const snap=p.snapshot||longitudinalSnapshot(i,p.checks),last=Number.isFinite(snap.walkMinutes)?snap.walkMinutes:null,stage=p.stage;
 const defaults=[5,10,15,20,30,40],caps=[15,25,40,60,75,90];
 let target=last!==null?last:defaults[stage];
 // Recovery days consolidate rather than advance; load/run days retain demonstrated walking capacity.
 if(type==='recovery')target=Math.max(defaults[stage],Math.round(target*.8));
 if(type==='assessment'||type==='run')target=Math.max(defaults[stage],Math.round(target*.75));
 const recent=(p.checks||[]).slice(-3),flare=recent.some(c=>c.nextDayWorse===true||c.newSwelling===true||c.alteredGait===true),walkPain=Number.isFinite(p.walkPain)?p.walkPain:null;
 if(flare||walkPain>=4)target=Math.max(5,Math.round(target*.65));
 else if(walkPain===3)target=Math.max(5,Math.round(target*.8));
 target=Math.min(caps[stage],Math.max(5,Math.round(target/5)*5));
 const favourable=!p.safetyHold&&!flare&&(walkPain===null||walkPain<=2)&&(Number.isFinite(p.currentPain)?p.currentPain<=2:true);
 let stretch;
 if(p.safetyHold)stretch='No stretch goal today—keep activity comfortable and await clinical guidance.';
 else if(!favourable)stretch=`Repeat the ${target}-minute target only; do not extend it until pain, gait and delayed response are stable.`;
 else {
  const extra=target<20?5:Math.max(5,Math.round(target*.2/5)*5),stretchTarget=Math.min(caps[stage],target+extra);
  stretch=stretchTarget>target?`If the target feels easier than expected and pain remains ≤2/10 with normal gait, extend to ${stretchTarget} minutes. Stop rather than complete the stretch goal if symptoms rise or movement changes.`:`If this feels easier than expected, keep the same ${target}-minute duration but use a slightly more natural pace; do not add hills or speed.`;
 }
 return{target,walkingTarget:`Walk ${target} minutes at a comfortable, even pace`,stretchGoal:stretch};
}
function rehabCalendarDay(i,p,date,offset){
 const exercises=exerciseList(i,p),stage=p.stage,safety=p.safetyHold,weekday=dte(date).toLocaleDateString(undefined,{weekday:'long'}),loadDay=offset%2===0;
 let type='recovery',title='Recovery and symptom response',items=[],running='No running planned',rationale='A lower-load day allows the response to the previous rehabilitation dose to become clear.',rule='Keep normal daily activity comfortable and record any delayed response.';
 if(safety){title='Protect and arrange assessment';items=['No running, hopping or impact testing','Follow professional guidance for loading'];rationale='The leading pattern or differential contains a higher-risk feature, so app-directed progression is paused.';rule='Do not progress until clinically assessed.';}
 else if(stage<=2){
  if(loadDay){type='load';title=stage===0?'Settle symptoms and preserve movement':'Rehabilitation strength';items=exercises.map(x=>`${x.name} — ${x.dose}`);rationale=stage===0?'Comfortable movement is the current priority before meaningful strengthening.':'This dose targets the current stage criteria without increasing more than one loading variable at once.';rule='Pain should stay at 0–2/10 and be no worse later or the next morning.';}
  else {items=['Gentle mobility through a comfortable range','No progression test today'];}
 } else if(stage===3){
  if([0,3,6].includes(offset)){type='assessment';title='Walk–run exposure';items=exercises.map(x=>`${x.name} — ${x.dose}`);running='Planned only if walking, pain and impact criteria remain stable';rationale='A spaced running exposure tests impact tolerance while preserving recovery days between attempts.';rule='Stop for pain above 2/10, altered gait or increasing tightness; progression depends on the next-morning response.';}
  else if([1,4].includes(offset)){type='load';title='Strength between running exposures';items=(INJURY_EXERCISES[p.diag.family]||INJURY_EXERCISES.muscle).filter(x=>x.stage<=2).slice(-2).map(x=>`${x.name} — ${x.dose}`);rationale='Strength is maintained between impact exposures without repeating running on consecutive days.';rule='Use the last tolerated dose; do not increase load after a flare.';}
  else {items=['Mobility or light isometrics if symptom-neutral','Review response to the previous running exposure'];}
 } else if(stage===4){
  if([0,3,6].includes(offset)){type='run';title='Easy running progression';items=exercises.map(x=>`${x.name} — ${x.dose}`);running='Easy continuous running planned';rationale='Running duration is rebuilt with at least one lower-load day between key exposures.';rule='Increase duration only after a stable same-day and next-morning response.';}
  else if([1,4].includes(offset)){type='load';title='Supporting strength';items=(INJURY_EXERCISES[p.diag.family]||INJURY_EXERCISES.muscle).filter(x=>x.stage===2).slice(0,2).map(x=>`${x.name} — ${x.dose}`);rationale='Strength work supports running capacity without adding another impact session.';rule='Keep the dose controlled and symptom-neutral.';}
  else {items=['Easy cross-training if comfortable','No speed, hills or hard running','Record delayed symptoms'];}
 } else {
  if([0,2,4,6].includes(offset)){type='run';title=offset===4?'Controlled faster running':'Easy running';items=exercises.map(x=>`${x.name} — ${x.dose}`);running=offset===4?'Faster running only if easy running remains stable':'Easy run planned';rationale='The final phase alternates running exposure with recovery while restoring speed and normal training tolerance.';rule='Change one variable at a time and stop before maximal effort.';}
  else {type='load';title='Strength or recovery support';items=['Stage-appropriate strength maintenance','Comfortable mobility','No additional hard running'];rationale='A non-running day protects adaptation between running exposures.';rule='Use symptoms and the next-morning response to decide whether the next run progresses or repeats.';}
 }
 const walk=walkingPrescription(i,p,offset,type);
 items.unshift(walk.walkingTarget);
 if(!items.length)items=['Follow the current exercise prescription',walk.walkingTarget];
 return{date,weekday,type,title,items,running,rationale,rule,stage,walkingTarget:walk.walkingTarget,stretchGoal:walk.stretchGoal};
}
function rehabExecutionMeta(check){
 const legacy=check?.rehabStatus||null;
 let exercise=check?.rehabExerciseStatus||null, locomotion=check?.locomotionStatus||null, stretch=check?.stretchGoalStatus||null;
 // Backwards compatibility for check-ins saved before build 10120.
 if(!exercise){
  if(['completed','stretch'].includes(legacy))exercise='all';
  else if(legacy==='reduced')exercise='some';
  else if(legacy==='walking_only')exercise='none';
  else if(legacy==='stopped')exercise='stopped';
  else if(legacy==='not_completed')exercise='none';
  else if(legacy==='not_planned')exercise='not_planned';
 }
 if(!locomotion){
  if(legacy==='walking_only'||['completed','stretch'].includes(legacy))locomotion='completed';
  else if(legacy==='reduced')locomotion='partial';
  else if(legacy==='stopped')locomotion='stopped';
  else if(legacy==='not_completed')locomotion='none';
  else if(legacy==='not_planned')locomotion='not_planned';
  else if(Number(check?.runMinutes)>0||Number(check?.walkMinutes)>0)locomotion='completed';
 }
 if(!stretch&&legacy==='stretch')stretch='achieved';
 const exerciseMap={
  all:{label:'All prescribed rehab exercises completed',short:'Rehab exercises completed',className:'completed',score:100,assessed:true},
  some:{label:'Some prescribed rehab exercises completed',short:'Rehab exercises partially completed',className:'partial',score:60,assessed:true},
  stopped:{label:'Rehab exercises started but stopped because of symptoms',short:'Exercises stopped',className:'stopped',score:25,assessed:true},
  none:{label:'Prescribed rehab exercises not completed',short:'Rehab exercises not completed',className:'missed',score:0,assessed:true},
  not_planned:{label:'No rehab exercises were planned',short:'No exercises planned',className:'rest',score:null,assessed:false}
 };
 const locomotionMap={
  completed:{label:'Walking or running target completed',short:'Walk/run target completed',className:'completed',score:100,assessed:true},
  partial:{label:'Part of the prescribed walking or running target was completed; symptoms did not force the stop',short:'Part of walk/run target completed',className:'partial',score:60,assessed:true},
  stopped:{label:'Walking or running was started but stopped because symptoms increased or movement changed',short:'Stopped due to symptoms',className:'stopped',score:25,assessed:true},
  none:{label:'The planned walking or running target was not started',short:'Walk/run not started',className:'missed',score:0,assessed:true},
  not_planned:{label:'No walking or running target was planned',short:'No walk/run planned',className:'rest',score:null,assessed:false}
 };
 const ex=exerciseMap[exercise]||{label:'Rehab exercise completion was not answered',short:'Exercises not reported',className:'unknown',score:null,assessed:false};
 const lo=locomotionMap[locomotion]||{label:'Walking/running target completion was not answered',short:'Walk/run not reported',className:'unknown',score:null,assessed:false};
 const assessedParts=[ex,lo].filter(x=>x.assessed&&Number.isFinite(x.score));
 let score=assessedParts.length?Math.round(avg(assessedParts.map(x=>x.score))):null;
 if(stretch==='achieved'&&Number.isFinite(score))score=Math.min(100,score+10);
 const assessed=Number.isFinite(score);
 const label=!assessed?'Overall rehabilitation execution cannot yet be scored':score>=90?'Excellent rehabilitation execution':score>=75?'Good rehabilitation execution':score>=50?'Partial rehabilitation execution':score>=25?'Limited rehabilitation execution':'Minimal rehabilitation execution';
 const className=!assessed?'unknown':score>=75?'completed':score>=50?'partial':score>=25?'stopped':'missed';
 return{exercise:ex,locomotion:lo,stretch,score,assessed,label,short:assessed?`${score}% overall execution`:'Overall not scored',className};
}
function rehabAdherenceSummary(i,days=7){
 const cutoff=new Date(today().getTime()-(days-1)*DAY),checks=sortedChecks(i).filter(c=>dte(c.date)>=cutoff&&dte(c.date)<=today());
 const assessed=checks.map(rehabExecutionMeta).filter(x=>x.assessed&&Number.isFinite(x.score));
 if(!assessed.length)return{score:null,assessed:0,label:'Not enough execution data'};
 const score=Math.round(avg(assessed.map(x=>x.score)));
 return{score,assessed:assessed.length,label:score>=85?'Strong adherence':score>=60?'Mixed adherence':'Low adherence'};
}
function buildRehabCalendar(i,p){
 const start=iso(today()),old=Array.isArray(i.rehabCalendar)?i.rehabCalendar:[],oldMap=new Map(old.map(x=>[x.date,x])),checks=new Map(sortedChecks(i).map(x=>[x.date,x])),days=[];
 for(let offset=0;offset<7;offset++){
  const date=iso(new Date(today().getTime()+offset*DAY)),fresh=rehabCalendarDay(i,p,date,offset),previous=oldMap.get(date),check=checks.get(date),checkInCompleted=!!check;let execution=rehabExecutionMeta(check);if(!check){const pending=offset===0?'Rehab report pending':'Future rehab day';execution={label:offset===0?'Today’s rehabilitation completion has not been reported yet':'Rehabilitation completion will be reported after this day',short:pending,className:'unknown',score:null,assessed:false,exercise:{label:offset===0?'Rehab exercise completion has not been reported yet':'Future rehabilitation exercise day',short:pending,className:'unknown',score:null,assessed:false},locomotion:{label:offset===0?'Walking/running target completion has not been reported yet':'Future walking/running target day',short:pending,className:'unknown',score:null,assessed:false}};}else if(!check.rehabExerciseStatus&&!check.locomotionStatus&&!check.rehabStatus){execution={label:'The questionnaire was completed, but rehabilitation completion was not answered',short:'Rehab not answered',className:'unknown',score:null,assessed:false,exercise:{label:'Rehab exercise completion was not answered',short:'Exercises not reported',className:'unknown',score:null,assessed:false},locomotion:{label:'Walking/running target completion was not answered',short:'Walk/run not reported',className:'unknown',score:null,assessed:false}};}
  const changed=!!previous&&rehabCalendarSignature(previous)!==rehabCalendarSignature(fresh);
  days.push({...fresh,checkInCompleted,execution,updated:changed});
 }
 i.rehabCalendar=days;i.rehabCalendarGenerated=start;return days;
}
function rehabCalendarHtml(i,p){
 const days=buildRehabCalendar(i,p);
 return `<section class="injuryTopicCard rehabCalendarSection"><div class="injurySectionHead"><div><h4>Next 7 days</h4><p class="muted compact">The questionnaire and rehabilitation execution are tracked separately. A completed check-in does not mean the exercises were completed.</p></div><strong>${fmtDate(days[0].date)}–${fmtDate(days.at(-1).date)}</strong></div><div class="rehabCalendar">${days.map((d,n)=>`<details class="rehabDay ${d.type} rehab-${d.execution.className}"><summary><div class="rehabDate"><b>${esc(d.weekday.slice(0,3))}</b><span>${dte(d.date).getDate()}</span></div><div class="rehabDayTitle"><strong>${esc(d.title)}</strong><small>${esc(d.walkingTarget)}</small><div class="rehabStatusPair"><span class="checkinBadge ${d.checkInCompleted?'done':'pending'}">${d.checkInCompleted?'✓ Check-in completed':'Check-in pending'}</span><span class="executionBadge ${(d.execution.exercise||{className:'unknown'}).className}">${esc((d.execution.exercise||{short:'Exercises not reported'}).short)}</span><span class="executionBadge ${(d.execution.locomotion||{className:'unknown'}).className}">${esc((d.execution.locomotion||{short:'Walk/run not reported'}).short)}</span>${Number.isFinite(d.execution.score)?`<span class="executionBadge ${d.execution.className}">${d.execution.score}% overall</span>`:''}</div></div><div class="rehabDayStatus">${d.updated?'Updated':''}</div></summary><div class="rehabDayBody"><div><b>Prescription</b><ul>${d.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="rehabStretchGoal"><b>Optional stretch goal</b><p>${esc(d.stretchGoal)}</p></div><div class="rehabDayWhy"><b>Why this day?</b><p>${esc(d.rationale)}</p></div><div class="rehabDayRule"><b>Adjustment rule</b><p>${esc(d.rule)}</p></div><div class="rehabCompletionClarifier"><b>Recorded status</b><p><strong>Questionnaire:</strong> ${d.checkInCompleted?'completed':'not completed'}<br><strong>Rehab exercises:</strong> ${esc((d.execution.exercise||{label:'Rehab exercise completion was not answered'}).label)}<br><strong>Walking/running target:</strong> ${esc((d.execution.locomotion||{label:'Walking/running target completion was not answered'}).label)}<br><strong>Overall execution:</strong> ${esc(d.execution.label)}${Number.isFinite(d.execution.score)?` (${d.execution.score}%)`:''}</p></div>${d.updated?'<p class="rehabUpdatedNote">Updated after new check-in evidence.</p>':''}</div></details>`).join('')}</div><p class="muted compact rehabCalendarFoot">Rehabilitation status describes whether the prescribed plan was performed. Check-in status only confirms that the daily questionnaire was submitted. Future days remain pending until their date. ‘Part completed’ means some planned duration was done without symptom-limited stopping; ‘not started’ means none was done.</p></section>`;
}

function rehabTodayFocusHtml(i,p,exercises){
 const todayPlan=buildRehabCalendar(i,p)[0];
 const prescription=todayPlan.items.map(x=>`<li>${esc(x)}</li>`).join('');
 const guides=(exercises||[]).map(x=>`<details class="exerciseDetail"><summary><span><b>${esc(x.name)}</b><small>${esc(x.dose)} · ${esc(x.purpose)}</small></span><em>Technique</em></summary><div class="exerciseGuide"><div class="exerciseWhy"><b>Why this is prescribed today</b><p>${esc(x.why)}</p></div><div><b>How to perform</b><ol>${x.steps.map(y=>`<li>${esc(y)}</li>`).join('')}</ol></div><div class="exerciseRules"><div><b>Pain rule</b><p>${p.safetyHold?'Do not test impact or progress loading until assessed.':'Keep pain at 0–2/10. Stop for sharp pain, altered movement, or symptoms that worsen later or next morning.'}</p></div><div><b>Progress when</b><p>${esc(x.progress)}</p></div></div></div></details>`).join('');
 return `<section class="injuryTopicCard rehabTodayFocus"><div class="injurySectionHead"><div><h4>Today’s rehabilitation plan</h4><p class="muted compact">This is the same prescription shown for today in the seven-day calendar.</p></div><span class="status today">${esc(todayPlan.title)}</span></div><div class="todayFocus"><strong>${esc(todayPlan.title)}</strong><p>${esc(todayPlan.rationale)}</p></div><div class="todayPlanGrid"><div><b>Today’s prescription</b><ul>${prescription}</ul></div><div class="rehabStretchGoal"><b>Optional stretch goal</b><p>${esc(todayPlan.stretchGoal)}</p></div><div class="rehabDayRule"><b>Adjustment rule</b><p>${esc(todayPlan.rule)}</p></div></div><div class="rehabStatusPair"><span class="checkinBadge ${todayPlan.checkInCompleted?'done':'pending'}">${todayPlan.checkInCompleted?'✓ Check-in completed':'Check-in pending'}</span><span class="executionBadge ${(todayPlan.execution.exercise||{className:'unknown'}).className}">${esc((todayPlan.execution.exercise||{short:'Exercises not reported'}).short)}</span><span class="executionBadge ${(todayPlan.execution.locomotion||{className:'unknown'}).className}">${esc((todayPlan.execution.locomotion||{short:'Walk/run not reported'}).short)}</span>${Number.isFinite(todayPlan.execution.score)?`<span class="executionBadge ${todayPlan.execution.className}">${todayPlan.execution.score}% overall</span>`:''}</div>${guides?`<div class="todayExerciseGuides"><h5>Exercise technique</h5>${guides}</div>`:''}</section>`;
}

function injuryTrajectorySvg(i,p){
 const W=720,H=285,left=48,right=18,top=30,bottom=58,cw=W-left-right,ch=H-top-bottom,horizon=Math.max(7,p.nominalTotal,p.elapsed+p.remaining),x=d=>left+clamp(d/horizon,0,1)*cw,y=v=>top+(100-clamp(v,0,100))/100*ch,nominalPath=`M ${x(0)} ${y(0)} L ${x(p.nominalTotal)} ${y(100)}`;
 const phaseFractions=[0,.12,.28,.46,.64,.82,1],phaseRects=INJURY_STAGES.map((st,n)=>{const start=phaseFractions[n]*p.nominalTotal,end=phaseFractions[n+1]*p.nominalTotal,w=Math.max(0,x(end)-x(start));return`<rect class="phaseBand phase${n}" x="${x(start)}" y="${top}" width="${w}" height="${ch}"/><text class="phaseLabel" x="${x(start)+w/2}" y="${top+14}" text-anchor="middle">${esc(st.name)}</text>`;}).join(''),phaseLines=phaseFractions.slice(1,-1).map(f=>`<line class="phaseBoundary" x1="${x(f*p.nominalTotal)}" y1="${top}" x2="${x(f*p.nominalTotal)}" y2="${top+ch}"/>`).join('');
 const pts=(p.checks||[]).map((c,idx)=>{const score=injuryCompletionForChecks(i,p.checks.slice(0,idx+1),p.diag,nullableNumber(i.initialPain),nullableNumber(i.initialWalkPain));return{day:Math.max(0,Math.round((dte(c.date)-dte(i.date))/DAY)),score,date:c.date};}).filter(q=>Number.isFinite(q.score));if(!pts.length&&Number.isFinite(p.completion))pts.push({day:p.elapsed,score:p.completion,date:iso(today())});const observed=pts.map((q,n)=>`${n?'L':'M'} ${x(q.day)} ${y(q.score)}`).join(' '),currentMarker=`<line class="currentDateLine" x1="${x(p.elapsed)}" y1="${top}" x2="${x(p.elapsed)}" y2="${top+ch}"/><text class="currentDateLabel" x="${x(p.elapsed)}" y="${H-36}" text-anchor="middle">Today</text>`;
 return `<div class="injuryTrajectoryWrap"><svg class="injuryTrajectory" viewBox="0 0 ${W} ${H}" role="img" aria-label="Observed rehabilitation completion, nominal recovery and rehabilitation phases">${phaseRects}${phaseLines}<line x1="${left}" y1="${y(25)}" x2="${W-right}" y2="${y(25)}"/><line x1="${left}" y1="${y(50)}" x2="${W-right}" y2="${y(50)}"/><line x1="${left}" y1="${y(75)}" x2="${W-right}" y2="${y(75)}"/>${currentMarker}<path class="nominalLine" d="${nominalPath}"/><path class="actualLine" d="${observed}"/>${pts.map(q=>`<circle cx="${x(q.day)}" cy="${y(q.score)}" r="5"><title>${fmtDate(q.date)} · ${q.score}%</title></circle>`).join('')}<text x="${left}" y="${H-12}">Injury</text><text x="${W-right}" y="${H-12}" text-anchor="end">Full unrestricted training</text><text x="${left+4}" y="${top+28}">Completion %</text></svg><div class="injuryTrajectoryLegend"><span class="actual">Observed completion</span><span class="nominal">Nominal recovery</span><span class="phase">Recovery phases</span></div></div>`;
}

function clinicianAgreementBanner(diag){
 if(!diag?.verification)return'';
 const v=diag.verification,status=v.agrees?'Confirms clinician assessment':v.inDifferential?'Partly agrees with clinician assessment':'Contradicts clinician assessment',cls=v.agrees?'confirmed':v.inDifferential?'partial':'contradicted';
 return `<section class="injuryTopicCard clinicianAgreementCard ${cls}"><div><small>Clinician cross-check</small><strong>${esc(status)}</strong><p><b>Clinician entered:</b> ${esc(v.entered)}<br><b>Independent app conclusion:</b> ${esc(diag.name)}</p><span>${esc(v.reasons.join(' · '))}</span></div></section>`;
}

function renderInjury(){
 const box=$('injuryList');if(!box)return;
 const injuries=state.injuries||[],add=$('addInjuryBtn');$('injuryIntro').innerHTML='';
 if(add){add.classList.remove('hidden');add.textContent=injuries.length?'+ Assess another injury':'+ Add injury';}
 if(!injuries.length){state.activeInjuryPlanId=null;box.innerHTML='<article class="panel injuryEmpty"><h3>No injury assessments</h3><p class="muted">Assess an injury to receive a working diagnosis and prognosis. You can later choose whether to follow its recovery plan.</p></article>';return;}
 if(state.activeInjuryPlanId&&!injuries.some(x=>x.id===state.activeInjuryPlanId))state.activeInjuryPlanId=null;
 if(!state.activeInjuryPlanId)$('injuryIntro').innerHTML='<div class="note warn"><b>No active recovery plan</b><p>Review the diagnosis and prognosis for each assessed injury, then choose one recovery plan to follow.</p></div>';
 const ordered=injuries.slice().sort((a,b)=>(a.id===state.activeInjuryPlanId?-1:b.id===state.activeInjuryPlanId?1:b.date.localeCompare(a.date)));
 box.innerHTML=ordered.map(i=>{
  const isActive=i.id===state.activeInjuryPlanId,p=injuryPrediction(i),st=INJURY_STAGES[p.stage],diag=p.diag,next=Math.min(5,p.stage+1),criteria=criterionState(i,p,next),met=criteria.filter(x=>x.status==='met').length,unknown=criteria.filter(x=>x.status==='unknown').length,factors=comparisonFactors(i,p),scoreInfo=recoveryScoreExplanation(i,p,factors),adherence7=rehabAdherenceSummary(i,7),adherence14=rehabAdherenceSummary(i,14),exercises=exerciseList(i,p),milestones=milestoneStatus(p),clinicalPlan=injuryCausePrevention(i,diag),timelineText=p.safetyHold?'Progression paused pending assessment':`${fmtDate(p.windowStart)}–${fmtDate(p.windowEnd)}`;
  const clinician=diag.verification;
  const clinicianCard='';const clinicianFoldout=clinician?`<details class="diagnosisAgreementInline ${clinician.verdict}"><summary><b>${clinician.verdict==='confirms'?'App confirms clinician assessment':clinician.verdict==='partly_agrees'?'App partly agrees with clinician assessment':'App contradicts clinician assessment'}</b><span>${esc(clinician.status)}</span></summary><div class="clinicianCompareGrid"><div><small>Clinician entered</small><b>${esc(clinician.entered)}</b></div><div><small>Independent app assessment</small><b>${esc(diag.name)}</b></div></div><p>The app independently checks the entered clinical assessment against the recorded location, mechanism, symptoms, aggravating factors and contradictory findings.</p><small>${clinician.reasons.map(esc).join(' · ')}</small></details>`:'';
  const header=`<article class="panel injuryCard ${isActive?'activeRecoveryPlan':'assessmentOnly'}"><div class="panelHead injuryCardHeader"><div><div class="injuryPlanLabel ${isActive?'active':'inactive'}">${isActive?'ACTIVE RECOVERY PLAN':'PARALLEL ASSESSMENT'}</div><h3>${esc(i.location||'Injury')} · ${fmtDate(i.date)}</h3><p class="muted compact">${esc(i.mechanism||'Mechanism not entered')}</p></div><span class="status today">Stage ${p.stage+1}</span></div>`;
  const diagnosis=`<section class="injuryTopicCard diagnosisOverview"><div class="injuryPatternSummary injuryPatternTop"><div><span>Most likely working symptom pattern</span><strong>${esc(diag.name)}</strong><small>${esc(diag.strength)} match · ${esc(i.bodyRegion||'recorded region')}</small></div><span class="injuryFamilyPill">${esc((diag.family||'generic').replace('_',' '))}</span></div><div class="prognosisStrip"><div><small>Estimated unrestricted-running window</small><b>${timelineText}</b></div><div><small>Central estimate</small><b>${p.safetyHold?'On hold':fmtDate(p.fullDate)}</b></div><div><small>Confidence</small><b>${esc(p.confidence)}</b></div></div>${clinicianFoldout}</section>`;
  const planChoice=`<section class="injuryTopicCard planChoiceCard"><div><h4>${isActive?'Recovery plan being followed':'Recovery plan available'}</h4><p>${isActive?'This injury currently controls the daily rehabilitation plan, calendar, adherence and check-ins.':'This injury is assessed in parallel. Its diagnosis and prognosis are available, but its rehabilitation plan is not currently active.'}</p></div>${isActive?'<span class="activePlanBadge">Active</span>':`<button class="primary" data-activate-injury-plan="${i.id}">Follow this recovery plan</button>`}</section>`;
  if(!isActive){return `${header}${diagnosis}<details class="injuryDisclosure clinicalReasoningSummary"><summary>Clinical reasoning, likely causes and prevention</summary><div class="clinicalReasoningBody"><div class="clinicalReasoningGrid"><div><b>Why this pattern?</b><p>${diag.evidence.slice(0,5).map(esc).join(' · ')||'More detail is needed.'}</p></div><div><b>Likely contributors</b><ul>${clinicalPlan.causes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><b>Prevention</b><ul>${clinicalPlan.prevention.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><b>Plan decision</b><p>${clinicalPlan.needsRehab?'A staged rehabilitation plan is available if you choose to switch to it.':'Self-management and prevention may be sufficient if symptoms resolve and no warning features emerge.'}</p></div></div></div></details>${planChoice}<div class="buttonRow"><button data-injury-edit="${i.id}">Edit assessment</button><button data-injury-delete="${i.id}" class="danger">Delete</button></div></article>`;}
  return `${header}${diagnosis}<details class="injuryDisclosure clinicalReasoningSummary"><summary>Clinical reasoning, likely causes and prevention</summary><div class="clinicalReasoningBody"><div class="clinicalReasoningGrid"><div><b>Why this pattern?</b><p>${diag.evidence.slice(0,5).map(esc).join(' · ')||'More detail is needed.'}</p></div><div><b>Likely contributors</b><ul>${clinicalPlan.causes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><b>Prevention</b><ul>${clinicalPlan.prevention.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><b>Plan decision</b><p>${clinicalPlan.needsRehab?'A staged rehabilitation plan is appropriate because current function requires monitored progression.':'A formal pathway may not be necessary if symptoms settle fully and no warning features remain.'}</p></div></div></div></details>${p.safetyHold?`<div class="note bad injurySafetyHold"><b>Rehabilitation progression paused</b><p>${diag.safetyReasons.map(esc).join(' · ')}. Seek appropriate clinical assessment before progressing.</p></div>`:''}${planChoice}<button data-injury-check="${i.id}" class="primary full injuryPrimaryAction">Complete today’s check-in</button><section class="injuryTopicCard recoveryOverview"><h4>Recovery overview</h4><div class="injuryKpiGrid"><div class="metric-card recoveryScoreCard ${scoreInfo.status}"><span>Recovery score</span><strong class="viz-stat-value">${p.completion===null?'—':p.completion+'%'}</strong><small>${esc(scoreInfo.label)}</small></div><div class="metric-card"><span>Current stage</span><strong class="viz-stat-value injuryStageValue">${esc(st.name)}</strong><small>${esc(st.goal)}</small></div><div class="metric-card"><span>Current pain</span><strong class="viz-stat-value">${valueText(p.currentPain)}</strong><small>Walking ${valueText(p.walkPain)}</small></div><div class="metric-card"><span>Evidence</span><strong class="viz-stat-value">${p.checks.length}</strong><small>daily check-ins</small></div></div><div class="recoveryScoreWhy ${scoreInfo.status}"><b>${esc(scoreInfo.label)}</b><p>${esc(scoreInfo.text)}</p></div></section><section class="injuryTopicCard adherenceSummary"><div class="injurySectionHead"><div><h4>Rehabilitation adherence</h4><p class="muted compact">Plan execution is separate from recovery ability and questionnaire completion.</p></div><strong>${adherence7.score===null?'—':adherence7.score+'%'}</strong></div><div class="adherencePeriods"><span>7 days <b>${adherence7.score===null?'—':adherence7.score+'%'}</b></span><span>14 days <b>${adherence14.score===null?'—':adherence14.score+'%'}</b></span></div></section>${rehabTodayFocusHtml(i,p,exercises)}<section class="injuryTopicCard calendarCard">${rehabCalendarHtml(i,p)}</section><section class="injuryTopicCard"><h4>Recovery milestones</h4><div class="injuryMilestones">${milestones.map(m=>`<div class="milestone ${m.status}"><i>${m.status==='met'?'✓':m.status==='notMet'?'○':'?'}</i><span>${esc(m.name)}</span><b>${m.status==='met'?'Met':m.status==='notMet'?'Not met':'Not assessed'}</b></div>`).join('')}</div></section><section class="injuryTopicCard"><div class="injurySectionHead"><div><h4>Next-stage requirements</h4><p class="muted compact">Stage ${next+1}: ${esc(INJURY_STAGES[next].name)} · repeated evidence required</p></div><strong>${met}/${criteria.length} met${unknown?` · ${unknown} unknown`:''}</strong></div><div class="criteriaList">${criteria.map(c=>`<div class="criterion ${c.status}"><i>${c.status==='met'?'✓':c.status==='notMet'?'○':'?'}</i><span>${esc(c.label)}</span><b>${c.status==='met'?'Met':c.status==='notMet'?'Not met':'Not assessed'}</b></div>`).join('')}</div></section><section class="injuryTopicCard"><div class="injurySectionHead"><div><h4>Daily check-ins</h4><p class="muted compact">Review or correct any current or previous entry.</p></div><strong>${p.checks.length}</strong></div><div class="checkInHistory">${p.checks.length?p.checks.slice().reverse().map(c=>`<button type="button" class="checkInHistoryRow" data-injury-check-edit="${i.id}" data-check-date="${c.date}"><span><b>${fmtDate(c.date)}</b><small>${Number.isFinite(c.pain)?`Pain ${c.pain}/10`:''}${Number.isFinite(c.walkPain)?` · walking ${c.walkPain}/10`:''}${Number.isFinite(c.runMinutes)?` · run ${c.runMinutes} min`:c.runStatus==='not_planned'?' · rest/no run planned':c.runStatus==='not_assessed'?' · running not assessed':''}<br>Check-in completed · Rehab: ${esc(rehabExecutionMeta(c).short)}</small></span><em>Edit</em></button>`).join(''):'<p class="muted">No check-ins yet.</p>'}</div></section><details class="injuryDisclosure"><summary>Recovery rationale and comparison</summary><div class="timelineReason"><p>The ${esc(diag.name.toLowerCase())} pathway uses a baseline window of ${p.baselineMin}–${p.baselineMax} days, with ${p.nominalTotal} days as the central comparison point.</p><p>You are ${p.elapsed} days after injury and currently in Stage ${p.stage+1}: ${esc(st.name)}.</p><p><b>${esc(scoreInfo.label)}:</b> ${esc(scoreInfo.text)}</p></div><div class="comparisonList">${factors.map(f=>`<div class="comparisonRow ${f.status}"><div><b>${esc(f.name)}</b><small>${esc(f.reason)}</small></div><span>${esc(f.actual)}</span><em>Nominal: ${esc(f.nominal)}</em></div>`).join('')}</div></details><details class="injuryDisclosure"><summary>Detailed recovery progress</summary>${p.completion===null?'<p class="muted">Add daily check-ins to build an observed trajectory.</p>':injuryTrajectorySvg(i,p)}</details><details class="injuryTimelineDetails"><summary>View all rehabilitation stages</summary><div class="injuryTimeline">${INJURY_STAGES.map((x,n)=>`<div class="injuryStage ${n<p.stage?'done':n===p.stage?'active':''}"><i>${n+1}</i><div><b>${esc(x.name)}</b><small>${esc(x.goal)}</small></div></div>`).join('')}</div></details><details class="injuryDisclosure"><summary>Initial and current symptoms</summary><div class="guideGrid"><div><b>At injury</b><p>Pain ${valueText(nullableNumber(i.initialPain))} · walking pain ${valueText(nullableNumber(i.initialWalkPain))}<br>${esc(i.initialSymptoms||'No symptom description')}</p></div><div><b>Latest</b><p>Pain ${valueText(p.currentPain)} · walking pain ${valueText(p.walkPain)}<br>${esc(p.latest.symptoms||i.currentSymptoms||'No current symptom description')}</p></div></div></details><div class="buttonRow"><button data-injury-edit="${i.id}">Edit injury</button><button data-injury-delete="${i.id}" class="danger">Delete</button></div></article>`;
 }).join('');
}
function injuryForm(i={}){const regions=['','Hip / pelvis','Groin / inner thigh','Front thigh','Back of thigh / hamstring','Knee','Shin / lower leg','Calf','Achilles / back of ankle','Ankle','Heel / arch','Forefoot / toes'];return`<div class="injuryFormHeader"><h3>${i.id?'Edit':'Record'} injury</h3><p>Start with where the pain is. The app only compares patterns compatible with the selected body region.</p></div>
<div class="injuryFormSteps">
<section class="injuryFormStep"><header><i>1</i><div><b>Where and when?</b><small>This prevents unrelated body regions from being ranked.</small></div></header><div class="formGrid"><div class="field"><label>Injury date</label><input id="injDate" type="date" value="${i.date||iso(today())}"></div><div class="field"><label>Body region</label><select id="injRegion">${regions.map(x=>`<option value="${esc(x)}" ${i.bodyRegion===x?'selected':''}>${esc(x||'Select region')}</option>`).join('')}</select></div><div class="field fieldWide"><label>Exact pain location</label><input id="injLocation" value="${esc(i.location||'')}" placeholder="e.g. front of right knee, below kneecap"></div><div class="field"><label>Onset</label><select id="injOnset"><option value="">Select onset</option><option value="Sudden" ${i.onset==='Sudden'?'selected':''}>Sudden</option><option value="Gradual" ${i.onset==='Gradual'?'selected':''}>Gradual</option><option value="Unclear" ${i.onset==='Unclear'?'selected':''}>Unclear</option></select></div><div class="field"><label>How did it start?</label><input id="injMechanism" value="${esc(i.mechanism||'')}" placeholder="e.g. sprint, downhill run, mileage increase"></div></div></section>
<section class="injuryFormStep"><header><i>2</i><div><b>What does it feel like?</b><small>Describe triggers and distinguishing symptoms.</small></div></header><div class="formGrid"><div class="field fieldWide"><label>What reproduces the pain?</label><textarea id="injTriggers" placeholder="e.g. stairs, squatting, downhill running, sitting, hopping">${esc(i.painTriggers||'')}</textarea></div><div class="field"><label>Pain at onset 0–10</label><input id="injInitialPain" type="number" min="0" max="10" value="${i.initialPain??''}"></div><div class="field"><label>Walking pain at onset 0–10</label><input id="injInitialWalk" type="number" min="0" max="10" value="${i.initialWalkPain??''}"></div><div class="field injurySigns"><label>Signs at onset</label><label><input id="injPop" type="checkbox" ${i.pop?'checked':''}> Pop / snap</label><label><input id="injBruise" type="checkbox" ${i.bruising?'checked':''}> Bruising or swelling</label></div><div class="field fieldWide"><label>Symptoms at onset</label><textarea id="injInitialSymptoms" placeholder="e.g. sharp pain, swelling, locking, tingling, focal tenderness">${esc(i.initialSymptoms||'')}</textarea></div></div></section>
<section class="injuryFormStep"><header><i>3</i><div><b>How is it now?</b><small>This establishes the current rehabilitation baseline.</small></div></header><div class="formGrid"><div class="field"><label>Pain now 0–10</label><input id="injCurrentPain" type="number" min="0" max="10" value="${i.currentPain??''}"></div><div class="field"><label>Walking pain now 0–10</label><input id="injCurrentWalk" type="number" min="0" max="10" value="${i.currentWalkPain??''}"></div><div class="field fieldWide"><label>Current symptoms</label><textarea id="injCurrentSymptoms" placeholder="What has improved, remained, or worsened?">${esc(i.currentSymptoms||'')}</textarea></div></div></section>
<section class="injuryFormStep clinicalReasoningStep"><header><i>4</i><div><b>Clinical reasoning questions</b><small>These answers help separate similar injuries and identify when self-management may be enough.</small></div></header><div class="formGrid">${selectField('injQuality','Symptom quality',i.symptomQuality,[['','Select'],['aching','Aching'],['sharp','Sharp'],['burning','Burning'],['cramp_like','Cramp-like / tight'],['pressure','Pressure / fullness'],['stiff','Stiffness'],['unstable','Instability']])}${selectField('injTiming','When is it worst?',i.timingPattern,[['','Select'],['during_early','Early during running'],['during_late','Later as fatigue builds'],['immediately_after','Immediately after running'],['after_shoes_off','After taking shoes off'],['next_morning','The next morning'],['constant','Also present at rest']])}<div class="field fieldWide"><label>Path or distribution of symptoms</label><input id="injDistribution" value="${esc(i.painDistribution||'')}" placeholder="e.g. bottom outer foot, little-toe side, front to back"></div>${triSelect('injMorning','Pain on the first steps in the morning?',i.morningFirstStep)}${triSelect('injFocal','One precise point is markedly tender?',i.focalTenderness)}${triSelect('injHopPain','Single-leg hopping reproduces it?',i.hopPain)}${triSelect('injNumb','Burning, numbness or tingling?',i.numbTingle)}${triSelect('injShoes','Tighter shoes or lacing make it worse?',i.shoeRelated)}${triSelect('injBarefoot','Removing shoes or walking barefoot improves it?',i.barefootBetter)}${triSelect('inj48h','Usually settles within 24–48 hours?',i.resolves48h)}${triSelect('injNight','Pain at night or while resting?',i.nightPain)}${triSelect('injLock','Locking, catching or joint swelling?',i.lockingCatching)}${triSelect('injInstability','Giving way or instability?',i.instability)}${triSelect('injSitting','Prolonged sitting reproduces it?',i.sittingPain)}${triSelect('injResisted','Resisted muscle contraction reproduces it?',i.resistedPain)}${triSelect('injExertional','Does it reliably settle within minutes after stopping the run?',i.exertionalResolution)}${triSelect('injLoadIncrease','Recent increase in distance, speed, hills or frequency?',i.recentLoadIncrease)}${triSelect('injNewShoes','Recent change in shoes, insoles or lacing?',i.newShoes)}${triSelect('injCamber','Often runs on cambered or uneven surfaces?',i.camberedSurface)}<div class="field fieldWide"><label>Other clinically relevant detail</label><textarea id="injClinicalFree" placeholder="Recurrence, exact duration, what relieves it, or anything that does not fit above">${esc(i.freeTextClinical||'')}</textarea></div></div></section>
<details class="injuryClinicianStep"><summary>Clinician information (optional — independently cross-checked)</summary><div class="formGrid"><div class="field"><label>Clinician diagnosis</label><input id="injDiagnosis" value="${esc(i.clinicalDiagnosis||'')}" placeholder="The app will independently compare this with your symptoms"></div><div class="field"><label>Expected recovery days</label><input id="injClinicianDays" type="number" min="1" value="${i.clinicianExpectedDays??''}" placeholder="Use clinician estimate when supplied"></div></div></details>
</div><div class="note bad"><b>Stop and seek assessment</b> for major trauma, inability to bear weight, marked weakness or deformity, rapidly increasing swelling, numbness, fever, severe night pain, focal bone pain, or calf swelling/breathlessness.</div><button id="saveInjury" class="primary full">Save injury assessment</button>`}
function openInjuryForm(i){$('modalContent').innerHTML=injuryForm(i);$('modal').className='modal';$('saveInjury').onclick=()=>{let obj={...(i||{}),id:i?.id||'inj-'+Date.now(),date:$('injDate').value,bodyRegion:$('injRegion').value,location:$('injLocation').value.trim(),onset:$('injOnset').value,mechanism:$('injMechanism').value.trim(),painTriggers:$('injTriggers').value.trim(),clinicalDiagnosis:$('injDiagnosis').value.trim(),clinicianExpectedDays:nullableNumber($('injClinicianDays').value),initialPain:nullableNumber($('injInitialPain').value),initialWalkPain:nullableNumber($('injInitialWalk').value),pop:$('injPop').checked,bruising:$('injBruise').checked,initialSymptoms:$('injInitialSymptoms').value.trim(),currentSymptoms:$('injCurrentSymptoms').value.trim(),currentPain:nullableNumber($('injCurrentPain').value),currentWalkPain:nullableNumber($('injCurrentWalk').value),symptomQuality:$('injQuality').value||null,timingPattern:$('injTiming').value||null,painDistribution:$('injDistribution').value.trim(),morningFirstStep:readTri('injMorning'),focalTenderness:readTri('injFocal'),hopPain:readTri('injHopPain'),numbTingle:readTri('injNumb'),shoeRelated:readTri('injShoes'),barefootBetter:readTri('injBarefoot'),resolves48h:readTri('inj48h'),nightPain:readTri('injNight'),lockingCatching:readTri('injLock'),instability:readTri('injInstability'),sittingPain:readTri('injSitting'),resistedPain:readTri('injResisted'),exertionalResolution:readTri('injExertional'),recentLoadIncrease:readTri('injLoadIncrease'),newShoes:readTri('injNewShoes'),camberedSurface:readTri('injCamber'),freeTextClinical:$('injClinicalFree').value.trim(),checkIns:i?.checkIns||[]};if(!obj.date||!obj.bodyRegion||!obj.location)return toast('Enter the injury date, body region and exact location.',true);state.injuries=state.injuries||[];let n=state.injuries.findIndex(x=>x.id===obj.id);n>=0?state.injuries[n]=obj:state.injuries.push(obj);save();$('modal').className='modal hidden';renderInjury();toast(n>=0?'Injury assessment updated.':'Injury assessed. Choose whether to follow its recovery plan.')}}
function triSelect(id,label,value,yes='Yes',no='No'){return`<div class="field"><label>${label}</label><select id="${id}"><option value="" ${!known(value)?'selected':''}>Not assessed</option><option value="true" ${value===true?'selected':''}>${yes}</option><option value="false" ${value===false?'selected':''}>${no}</option></select></div>`}
function readTri(id){let v=$(id).value;return v===''?null:v==='true'}
function selectField(id,label,value,options){return`<div class="field"><label>${label}</label><select id="${id}">${options.map(([v,t])=>`<option value="${v}" ${String(value??'')===String(v)?'selected':''}>${t}</option>`).join('')}</select></div>`}
function openInjuryCheck(i,existing=null){
 const checks=sortedChecks(i),latest=checks.at(-1)||{},editing=!!existing,originalDate=existing?.date||null;
 // New daily entries start blank for observations that were not actually assessed; stable history is preserved by the longitudinal model.
 const prev=existing||{};
 $('modalContent').innerHTML=`<div class="injuryCheckHeader"><h3>${editing?'Edit':'Daily'} injury check-in</h3><p>Record what was observed today. A rest day or “not assessed” does not erase capacity demonstrated on an earlier day.</p></div>
 <section class="injuryCheckSection"><h4>1. Symptoms today</h4><div class="formGrid"><div class="field"><label>Date</label><input id="icDate" type="date" value="${existing?.date||iso(today())}"></div><div class="field"><label>Pain at rest now 0–10</label><input id="icPain" type="number" min="0" max="10" value="${prev.pain??''}"></div><div class="field"><label>Pain during normal walking 0–10</label><input id="icWalk" type="number" min="0" max="10" value="${prev.walkPain??''}"></div><div class="field"><label>Morning stiffness (minutes)</label><input id="icStiff" type="number" min="0" value="${prev.morningStiffness??''}" placeholder="Leave blank if not relevant"></div>${selectField('icTrend','Compared with yesterday',prev.symptomTrend,[['','Not assessed'],['better','Better'],['same','About the same'],['worse','Worse']])}${triSelect('icSwelling','Any new swelling or bruising?',prev.newSwelling)}</div></section>
 <section class="injuryCheckSection"><h4>2. Daily function</h4><div class="formGrid"><div class="field"><label>Comfortable walking completed (minutes)</label><input id="icWalkMinutes" type="number" min="0" value="${prev.walkMinutes??''}"></div>${triSelect('icStairs','Stairs tolerated with normal movement?',prev.stairs)}<div class="field"><label>Confidence in injured area 0–10</label><input id="icConfidence" type="number" min="0" max="10" value="${prev.confidence??''}"></div></div></section>
 <section class="injuryCheckSection"><h4>3. Rehabilitation execution</h4><p class="muted compact">Report exercises and the walking/running target separately. ‘Part completed’ means you started and completed some of the prescribed amount without symptoms forcing you to stop. ‘Not started’ means you did none of the planned target. Symptom-limited stopping is recorded separately.</p><div class="formGrid">${selectField('icRehabExercises','Prescribed rehab exercises',prev.rehabExerciseStatus||'', [['','Not assessed'],['not_planned','No rehab exercises planned'],['all','All prescribed rehab exercises completed'],['some','Some prescribed rehab exercises completed'],['stopped','Started but stopped because of symptoms'],['none','Rehab exercises not completed']])}${selectField('icLocomotion','Walking or running target',prev.locomotionStatus||'', [['','Not assessed'],['not_planned','No walking/running target planned'],['completed','Walking/running target completed'],['partial','Part of target completed — not stopped by symptoms'],['stopped','Started but stopped because of symptoms'],['none','Planned target not started']])}${selectField('icStretchGoal','Optional stretch goal',prev.stretchGoalStatus||'', [['','Not assessed / not attempted'],['achieved','Stretch goal achieved'],['not_achieved','Stretch goal not achieved']])}${triSelect('icBridge','Strength exercise tolerated with control?',prev.bridge,'Tolerated','Not tolerated')}${triSelect('icHop','Impact test or jog-in-place tolerated?',prev.hop,'Tolerated','Not tolerated')}</div></section>
 <section class="injuryCheckSection"><h4>4. Running exposure</h4><div class="formGrid">${selectField('icRunStatus','Running today',prev.runStatus,[['not_assessed','Not assessed'],['not_planned','Not planned / rest day'],['completed','Run completed'],['stopped','Started but stopped due to symptoms'],['unable','Unable to start because of symptoms']])}<div class="field"><label>Running completed (minutes)</label><input id="icRun" type="number" min="0" value="${prev.runMinutes??''}" placeholder="Only when attempted"></div><div class="field"><label>Highest pain during run 0–10</label><input id="icRunPain" type="number" min="0" max="10" value="${prev.runPain??''}"></div>${triSelect('icGait','Was gait or running technique altered?',prev.alteredGait)}</div></section>
 <section class="injuryCheckSection"><h4>5. Response to the previous load</h4><div class="formGrid">${triSelect('icWorse','Were symptoms worse later or the next morning?',prev.nextDayWorse)}${selectField('icResponse','Overall response to previous load',prev.loadResponse,[['','Not assessed'],['better','Better than before load'],['stable','Returned to baseline'],['mild_flare','Mild temporary flare'],['sustained_flare','Still worse after 24 hours']])}<div class="field fieldWide"><label>Symptoms / notes</label><textarea id="icSymptoms" placeholder="What changed, what activity caused it, and how long did the response last?">${esc(prev.symptoms||'')}</textarea></div></div></section>
 <div id="icConsistency" class="note"><b>Consistency check</b><p>The form will automatically align related answers.</p></div><button id="saveCheck" class="primary full">${editing?'Update check-in':'Save and recalculate timeline'}</button>${editing?'<button id="deleteCheck" class="danger full">Delete this check-in</button>':''}`;
 $('modal').className='modal';
 const runStatusField=$('icRunStatus'),runMinutesField=$('icRun'),runPainField=$('icRunPain'),gaitField=$('icGait'),locomotionField=$('icLocomotion'),exerciseField=$('icRehabExercises'),stretchField=$('icStretchGoal'),consistencyBox=$('icConsistency');
 let syncing=false;
 const clearRunDetail=()=>{runMinutesField.value='';runPainField.value='';gaitField.value='';};
 const setConsistencyMessage=()=>{const rs=runStatusField.value,mins=nullableNumber(runMinutesField.value),lo=locomotionField.value,ex=exerciseField.value,sg=stretchField.value;let parts=[];
  if(rs==='completed')parts.push(`${Number.isFinite(mins)?mins:0} min run recorded as completed; tolerance is judged separately from pain and gait.`);
  else if(rs==='stopped')parts.push(`Running exposure was started but stopped because of symptoms.`);
  else if(rs==='unable')parts.push(`The planned walk/run target was not started because symptoms prevented it.`);
  else if(rs==='not_planned')parts.push(`No run was planned; this is neutral and does not remove earlier running capacity.`);
  else parts.push(`Running was not assessed; this is neutral and does not remove earlier running capacity.`);
  if(lo==='partial')parts.push('Only part of the prescribed walk/run target was completed, without symptoms forcing the stop.');
  if(ex==='some')parts.push('Some, but not all, prescribed rehab exercises were completed.');
  if(sg==='achieved')parts.push('The optional stretch goal is recorded only after the planned components were completed.');
  consistencyBox.innerHTML=`<b>Current interpretation</b><p>${esc(parts.join(' '))}</p>`;
 };
 const normalizeCheckIn=source=>{if(syncing)return;syncing=true;let rs=runStatusField.value,mins=nullableNumber(runMinutesField.value),lo=locomotionField.value,ex=exerciseField.value,sg=stretchField.value;
  if(source==='minutes'&&Number.isFinite(mins)&&mins>0&&['not_assessed','not_planned','unable'].includes(rs))rs='completed';
  if(source==='runStatus'){
   if(rs==='not_assessed'||rs==='not_planned'){clearRunDetail();mins=null;if(rs==='not_assessed'&&lo==='stopped')lo='';}
   else if(rs==='completed'){if(!Number.isFinite(mins)||mins<=0)runMinutesField.value='';if(['','not_planned','none','stopped'].includes(lo))lo='completed';}
   else if(rs==='stopped'){lo='stopped';}
   else if(rs==='unable'){clearRunDetail();mins=null;lo='none';}
  }
  if(Number.isFinite(mins)&&mins>0){if(rs!=='stopped')rs='completed';if(['','not_planned','none'].includes(lo))lo='completed';}else if(rs==='completed'){rs='not_assessed';}
  if(source==='locomotion'){
   if(lo==='not_planned'){rs='not_planned';clearRunDetail();mins=null;}
   else if(lo==='none'&&['completed','stopped'].includes(rs)){rs='unable';clearRunDetail();mins=null;}
   else if(lo==='stopped'&&rs==='completed')rs='stopped';
   else if((lo==='completed'||lo==='partial')&&rs==='unable')rs='not_assessed';
  }
  if(rs==='stopped')lo='stopped';
  if(rs==='unable')lo='none';
  if(rs==='completed'&&['','not_planned','none','stopped'].includes(lo))lo='completed';
  if(sg==='achieved'){
   if(ex==='some'||ex==='none'||ex==='stopped'||ex==='')ex='all';
   if(lo==='partial'||lo==='none'||lo==='stopped'||lo==='')lo='completed';
   if(lo==='not_planned'&&ex==='not_planned')sg='not_achieved';
  }
  if((ex==='stopped'||lo==='stopped')&&sg==='achieved')sg='not_achieved';
  runStatusField.value=rs;locomotionField.value=lo;exerciseField.value=ex;stretchField.value=sg;syncing=false;setConsistencyMessage();
 };
 runMinutesField.addEventListener('input',()=>normalizeCheckIn('minutes'));
 runStatusField.addEventListener('change',()=>normalizeCheckIn('runStatus'));
 locomotionField.addEventListener('change',()=>normalizeCheckIn('locomotion'));
 exerciseField.addEventListener('change',()=>normalizeCheckIn('exercise'));
 stretchField.addEventListener('change',()=>normalizeCheckIn('stretch'));
 normalizeCheckIn('initial');
 $('saveCheck').onclick=()=>{normalizeCheckIn('save');let runStatus=runStatusField.value,runMinutes=nullableNumber(runMinutesField.value),rehabExerciseStatus=exerciseField.value||null,locomotionStatus=locomotionField.value||null,stretchGoalStatus=stretchField.value||null;
 if(['not_planned','not_assessed','unable'].includes(runStatus))runMinutes=null;
 let legacyRehabStatus=rehabExerciseStatus==='not_planned'&&locomotionStatus==='not_planned'?'not_planned':stretchGoalStatus==='achieved'&&rehabExerciseStatus==='all'&&locomotionStatus==='completed'?'stretch':rehabExerciseStatus==='all'&&locomotionStatus==='completed'?'completed':rehabExerciseStatus==='some'||locomotionStatus==='partial'?'reduced':rehabExerciseStatus==='none'&&locomotionStatus==='completed'?'walking_only':rehabExerciseStatus==='stopped'||locomotionStatus==='stopped'?'stopped':rehabExerciseStatus==='none'&&locomotionStatus==='none'?'not_completed':null;let c={date:$('icDate').value,pain:nullableNumber($('icPain').value),walkPain:nullableNumber($('icWalk').value),morningStiffness:nullableNumber($('icStiff').value),symptomTrend:$('icTrend').value||null,newSwelling:readTri('icSwelling'),walkMinutes:nullableNumber($('icWalkMinutes').value),stairs:readTri('icStairs'),confidence:nullableNumber($('icConfidence').value),rehabExerciseStatus,locomotionStatus,stretchGoalStatus,rehabStatus:legacyRehabStatus,bridge:readTri('icBridge'),hop:readTri('icHop'),runStatus,runMinutes,runPain:nullableNumber($('icRunPain').value),alteredGait:readTri('icGait'),nextDayWorse:readTri('icWorse'),loadResponse:$('icResponse').value||null,symptoms:$('icSymptoms').value.trim()};if(!c.date)return toast('Enter the check-in date.',true);const hasObs=Object.entries(c).some(([k,v])=>k!=='date'&&k!=='symptoms'&&v!==null&&v!==''&&v!==undefined);if(!hasObs&&!c.symptoms)return toast('Record at least one observation.',true);if(runStatus==='completed'&&(!Number.isFinite(runMinutes)||runMinutes<=0))return toast('Enter the completed running minutes.',true);if(['stopped','unable'].includes(runStatus)&&Number.isFinite(runMinutes)&&runMinutes<0)return toast('Running minutes cannot be negative.',true);i.checkIns=i.checkIns||[];if(editing&&originalDate!==c.date&&i.checkIns.some(x=>x.date===c.date))return toast('A check-in already exists for that date.',true);let n=i.checkIns.findIndex(x=>x.date===(editing?originalDate:c.date));n>=0?i.checkIns[n]=c:i.checkIns.push(c);save();$('modal').className='modal hidden';renderInjury();toast(editing?'Check-in updated and full trajectory recalculated.':'Check-in saved. The full history—not this day alone—was used.');};if(editing)$('deleteCheck').onclick=()=>{if(confirm('Delete this check-in?')){i.checkIns=i.checkIns.filter(x=>x.date!==originalDate);save();$('modal').className='modal hidden';renderInjury();toast('Check-in deleted and trajectory recalculated.')}};
}
function renderAll(){[renderDashboard,renderToday,renderPlan,renderRuns,renderMetrics,renderAssessments,renderCoach,renderInjury,renderRecovery,renderRace,renderSettings,renderPlanHealth,renderMigrationReport].forEach(fn=>{try{fn()}catch(err){recordDiagnostic('Render failure in '+fn.name,err)}});renderDiagnostics()}
const pages=[['dashboard','Dashboard'],['today','Today'],['plan','Plan'],['runs','Runs'],['assessments','Assessments'],['recovery','Recovery'],['injury','Injury'],['race','Race day'],['settings','Settings']];
$('nav').innerHTML=pages.map((p,i)=>`<button data-page="${p[0]}" class="${i?'':'active'}">${p[1]}</button>`).join('');$('nav').onclick=e=>{let p=e.target.dataset.page;if(!p)return;document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===p));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===p));renderAll();scrollTo(0,0)};document.body.onclick=e=>{if(e.target.id==='addInjuryBtn'){openInjuryForm();return}let activate=e.target.closest('[data-activate-injury-plan]');if(activate){let id=activate.dataset.activateInjuryPlan,current=state.injuries.find(x=>x.id===state.activeInjuryPlanId),next=state.injuries.find(x=>x.id===id);if(next&&confirm(`Switch the active recovery plan from ${current?.location||'the current injury'} to ${next.location||'this injury'}? Only one plan can be followed at a time.`)){state.activeInjuryPlanId=id;save();renderInjury();toast('Active recovery plan switched.')}return;}let ib=e.target.closest('[data-injury-check]');if(ib){openInjuryCheck(state.injuries.find(x=>x.id===ib.dataset.injuryCheck));return}let ice=e.target.closest('[data-injury-check-edit]');if(ice){let injury=state.injuries.find(x=>x.id===ice.dataset.injuryCheckEdit),check=injury?.checkIns?.find(x=>x.date===ice.dataset.checkDate);if(injury&&check)openInjuryCheck(injury,check);return}let ie=e.target.closest('[data-injury-edit]');if(ie){openInjuryForm(state.injuries.find(x=>x.id===ie.dataset.injuryEdit));return}let idel=e.target.closest('[data-injury-delete]');if(idel){if(confirm('Delete this injury and its check-ins?')){state.injuries=state.injuries.filter(x=>x.id!==idel.dataset.injuryDelete);if(state.activeInjuryPlanId===idel.dataset.injuryDelete)state.activeInjuryPlanId=state.injuries[0]?.id||null;save();renderInjury()}return}if(e.target.dataset.go){document.querySelector(`[data-page="${e.target.dataset.go}"]`).click()}const planRunBtn=e.target.closest('[data-plan-run]');if(planRunBtn){openRunDetails(planRunBtn.dataset.planRun);return}let factorToggle=e.target.closest('.factorToggle');if(factorToggle){let tile=factorToggle.closest('.factorKpi'),open=tile.classList.toggle('open');factorToggle.setAttribute('aria-expanded',String(open));return}let w=e.target.closest('.workout');if(w&&!e.target.closest('button'))w.classList.toggle('open')};
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
function openRunDetails(runId){
 let r=state.runs.find(x=>x.id===runId);if(!r)return;
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
}
$('runList').onclick=e=>{const card=e.target.closest('[data-run]');if(card)openRunDetails(card.dataset.run)};
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
const brandVersion=document.querySelector('.brand-copy p');if(brandVersion)brandVersion.textContent=`Race-specific adaptive planning • v10.0.12 · build ${BUILD}`;
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register(`service-worker.js?v=${BUILD}`,{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
migrateAssessmentRuns();
migrateImportedPower();
if(reconcilePredictionHistory())save();
renderAll();
console.info('AI Running Coach v10.0.12 stable build 10120');
})();