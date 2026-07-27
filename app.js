let preview=null;
(()=>{'use strict';
const DAY=86400000, $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const iso=d=>{let x=new Date(d),y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),q=String(x.getDate()).padStart(2,'0');return `${y}-${m}-${q}`},
dte=s=>{let [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d,12,0,0,0)},
fmtDate=s=>dte(s).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
const sum=a=>a.reduce((x,y)=>x+(Number.isFinite(y)?y:0),0), avg=a=>{let v=a.filter(Number.isFinite);return v.length?sum(v)/v.length:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dec=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):'—';
function fmtTime(s){if(!Number.isFinite(s))return'—';let h=Math.floor(s/3600),m=Math.floor(s%3600/60),q=Math.round(s%60);if(q===60){q=0;m++}if(m===60){m=0;h++}return h?`${h}:${String(m).padStart(2,'0')}:${String(q).padStart(2,'0')}`:`${m}:${String(q).padStart(2,'0')}`}
function parseTime(v){let p=String(v||'').split(':').map(Number);if(p.some(x=>!Number.isFinite(x)))return null;return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1]}
function pace(s){return Number.isFinite(s)?fmtTime(s)+'/km':'—'} function toast(t,bad=false){$('toast').textContent=t;$('toast').className='toast'+(bad?' bad':'');setTimeout(()=>$('toast').className='toast hidden',3500)}
const defaults=()=>({schemaVersion:6305,setup:{planStart:'2026-07-26',raceDate:'2026-12-13',raceName:'Goal Race',raceDistance:42.195,targetTime:15300,currentWeekly:35,currentLongest:18,testDistance:5,testTime:1515,thresholdHr:168,criticalPower:300,bodyWeight:93,maxWeekly:70,growth:.08,peakLong:35,taperDays:21,minFactor:.85,maxFactor:1.05,adaptive:true},days:[['Monday',false,'Easy'],['Tuesday',true,'Intervals'],['Wednesday',true,'Easy'],['Thursday',false,'Easy'],['Friday',true,'Tempo'],['Saturday',true,'Easy'],['Sunday',true,'Long run']],runs:[],assessments:[],plan:[],weekView:null});
let state;try{state=JSON.parse(localStorage.getItem('arc_v62_web'))}catch{}if(!state)state=defaults();
const save=()=>localStorage.setItem('arc_v62_web',JSON.stringify(state)), today=()=>dte(iso(new Date()));
function baselineOn(date){let valid=state.assessments.filter(a=>a.valid&&a.date<=date).sort((a,b)=>a.date.localeCompare(b.date));let a=valid.at(-1);return a?{pace:a.time/a.distance,hr:a.thresholdHr||state.setup.thresholdHr,cp:a.criticalPower||state.setup.criticalPower}:{pace:state.setup.testTime/state.setup.testDistance,hr:state.setup.thresholdHr,cp:state.setup.criticalPower}}
const zoneDef={Recovery:[1.42,.78,.72,'RPE 2–3 · relaxed and restorative'],Easy:[1.30,.84,.78,'RPE 3–4 · conversational aerobic running'],Steady:[1.20,.89,.84,'RPE 5 · controlled moderate work'],Marathon:[1.15,.92,.88,'RPE 5–6 · race-specific control'],Tempo:[1.08,1,.95,'RPE 7–8 · strong but sustainable'],Intervals:[.98,1.04,1.05,'RPE 8–9 · quality repetitions'],Repetition:[.92,1.08,1.15,'RPE 9 · short fast work'],['Fitness assessment']:[1,1,1,'Even maximal benchmark'],['Race Day']:[1.15,.92,.88,'Controlled race execution']};
function zone(type,date){let b=baselineOn(date),z=zoneDef[type]||zoneDef.Easy;return{pace:b.pace*z[0],hr:Math.round(b.hr*z[1]),power:Math.round(b.cp*z[2]),guide:z[3]}}
function weeks(){return Math.max(1,Math.floor((dte(state.setup.raceDate)-dte(state.setup.planStart))/(7*DAY))+1)}function weekStart(w){return new Date(dte(state.setup.planStart).getTime()+(w-1)*7*DAY)}
function phase(w){let t=weeks(),tw=Math.ceil(state.setup.taperDays/7);if(w>t-tw)return'Taper';if(w>t-tw-3)return'Peak';if(w<=3)return'Base';return'Build'}
function currentWeek(){return clamp(Math.floor((today()-dte(state.setup.planStart))/(7*DAY))+1,1,weeks())}
function recentRuns(days=28){return state.runs.filter(r=>today()-dte(r.date)<=days*DAY&&today()>=dte(r.date))}
function metrics(r){let dur=Number(r.durationSec),km=Number(r.distanceKm),hr=Number(r.avgHr),pw=Number(r.avgPower),kg=Number(state.setup.bodyWeight);
let validRun=dur>0&&km>0,validHr=validRun&&hr>0,validPw=validRun&&pw>0&&kg>0;
return{pace:validRun?dur/km:null,dph:validHr?km*1000/(dur/60*hr):null,wpb:validHr&&pw>0?pw/hr:null,effect:validPw?(km*1000/dur)/(pw/kg):null,wkg:pw>0&&kg>0?pw/kg:null}}
function weekData(w){let st=weekStart(w),en=new Date(st.getTime()+7*DAY),p=state.plan.filter(x=>x.week===w&&x.type!=='Rest'),r=state.runs.filter(x=>dte(x.date)>=st&&dte(x.date)<en);return{planned:sum(p.map(x=>x.distance)),actual:sum(r.map(x=>x.distanceKm)),runs:r,plan:p}}
function adaptiveFactor(w){if(!state.setup.adaptive||w<=1)return 1;let prev=weekData(w-1),ad=prev.planned?prev.actual/prev.planned:1,recovery=avg(prev.runs.map(x=>x.recovery)),pain=avg(prev.runs.map(x=>x.pain));let f=1;if(ad<.7)f-=.08;else if(ad<.85)f-=.04;else if(ad>1.05)f+=.02;if(Number.isFinite(recovery)&&recovery<3)f-=.05;if(Number.isFinite(pain)&&pain>=4)f-=.07;return clamp(f,state.setup.minFactor,state.setup.maxFactor)}
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
     let item={id,week:w,date,day:dayName,type,distance:Math.round(dist*10)/10,phase:ph,factor,zone:z,...detail};
     out.push(old.get(id)||item);
   });
 }
 state.plan=out;state.schemaVersion=6305;save()
}
function prescription(type,km,w,ph,z){
 if(type==='Rest')return{warmup:'—',main:'Rest day',cooldown:'—',purpose:'Absorb training and restore freshness.',coach:'Walking and light mobility are fine. Avoid turning recovery into another workout.',fuel:'Normal daily hydration.'};
 if(type==='Easy')return{warmup:'5–10 min very easy',main:`${km.toFixed(1)} km easy, continuous`,cooldown:'5 min easy walk or jog',purpose:'Develop aerobic capacity while keeping fatigue low.',coach:'Keep the effort conversational. Slow down for heat, hills or poor recovery rather than forcing the displayed pace.',fuel:km>=12?'Carry fluids; use carbohydrate if running longer than 75–90 min.':'Water according to thirst.'};
 if(type==='Long run')return{warmup:'First 2 km deliberately easy',main:`${km.toFixed(1)} km controlled endurance`,cooldown:'Walk 5–10 min and refuel',purpose:'Build marathon durability and practise fuelling.',coach:'The goal is successful completion, not proving fitness. Keep the first half restrained and finish with stable form. Do not add fast kilometres after a missed week.',fuel:'Practise 60–90 g carbohydrate/hour and approximately 400–800 ml fluid/hour, adjusted for conditions.'};
 if(type==='Tempo')return{warmup:`${Math.max(2,km*.25).toFixed(1)} km easy + 4 strides`,main:`${Math.max(2,km*.5).toFixed(1)} km tempo, continuous or 2 blocks`,cooldown:`${Math.max(1.5,km*.25).toFixed(1)} km easy`,purpose:'Raise sustainable threshold speed and power.',coach:'The final minutes should feel strong but controlled. Stop the quality portion if pain changes your stride.',fuel:'Small carbohydrate intake beforehand if training fasted or after a long workday.'};
 if(type==='Intervals')return{warmup:`${Math.max(2,km*.3).toFixed(1)} km easy + drills + strides`,main:`${Math.max(4,Math.round((km*.45)/.8))} × 800 m at interval effort with 2 min easy jog`,cooldown:`${Math.max(1.5,km*.25).toFixed(1)} km easy`,purpose:'Improve VO₂max and running economy.',coach:'Run repeatable efforts, not an opening sprint. The last repetition should resemble the first.',fuel:'Arrive hydrated; carbohydrate is useful when the total session exceeds 60 min.'};
 if(type==='Fitness assessment')return{warmup:'15–20 min easy + drills + 4 strides',main:'5 km even maximal assessment',cooldown:'10–15 min very easy',purpose:'Create a repeatable benchmark that can update future targets.',coach:'Use even pacing and mark the result valid only when course, weather, health and execution make the result representative.',fuel:'Normal pre-run meal; avoid starting depleted.'};
 return{warmup:'10–15 min easy',main:`${km.toFixed(1)} km race execution`,cooldown:'Walk and begin recovery nutrition',purpose:'Execute the race plan.',coach:'Start controlled, protect the first 10 km and only progress after halfway if effort remains stable.',fuel:'60–90 g carbohydrate/hour and 400–800 ml fluid/hour.'}
}
if(state.schemaVersion!==6305){state.plan=[];buildPlan()}else if(!state.plan?.length)buildPlan();
function status(p){let done=state.runs.some(r=>r.planId===p.id||r.date===p.date);if(done)return'completed';if(p.type==='Rest')return'rest';let d=dte(p.date);if(d<today())return'missed';if(d.getTime()===today().getTime())return'today';return'upcoming'}
function confidence(){
 let raceDate=dte(state.setup.raceDate);
 let daysRemaining=Math.max(0,(raceDate-today())/DAY);
 let weeksRemaining=daysRemaining/7;
 let taperWeeks=Math.max(1,state.setup.taperDays/7);
 let usableBuildWeeks=Math.max(0,weeksRemaining-taperWeeks);

 let due=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&dte(p.date)<=today()&&today()-dte(p.date)<=28*DAY);
 let windowStart=due.length?dte(due[0].date):new Date(today().getTime()-28*DAY);
 let recent=state.runs.filter(r=>dte(r.date)>=windowStart&&dte(r.date)<=today());
 let plannedKm=sum(due.map(p=>p.distance)),actual=sum(recent.map(r=>r.distanceKm));

 let latest=state.assessments.filter(a=>a.valid).sort((a,b)=>b.date.localeCompare(a.date))[0];
 let testTime=latest?latest.time:state.setup.testTime,testDist=latest?latest.distance:state.setup.testDistance;
 let riegel=testTime*Math.pow(state.setup.raceDistance/testDist,1.06);
 let fitness=clamp(100-(riegel/state.setup.targetTime-1)*300,0,100);

 let completedLongest=state.runs.length?Math.max(...state.runs.map(r=>Number(r.distanceKm)||0)):0;
 let longest=Math.max(Number(state.setup.currentLongest)||0,completedLongest);
 let endurance=clamp(longest/state.setup.peakLong*100,0,100);

 let completedDates=new Set(recent.map(r=>r.date));
 let matched=due.filter(p=>completedDates.has(p.date)).length;
 let opportunities=due.length;
 let consistency=opportunities?clamp(matched/opportunities*100,0,100):null;
 let adherence=plannedKm?clamp(actual/plannedKm*100,0,100):null;

 let recoveryValues=recent.map(r=>Number(r.recovery)).filter(v=>Number.isFinite(v)&&v>0);
 let painValues=recent.map(r=>Number(r.pain)).filter(Number.isFinite);
 let recoveryScore=recoveryValues.length?clamp(avg(recoveryValues)/5*100,0,100):null;
 let painScore=painValues.length?clamp((10-avg(painValues))/10*100,0,100):null;

 let comparable=recent.filter(r=>['Easy','Recovery','Long run'].includes(r.type)&&r.avgHr&&r.avgPower&&r.durationSec>=1800)
   .sort((a,b)=>a.date.localeCompare(b.date))
   .map(r=>metrics(r).effect).filter(Number.isFinite);
 let economy=null;
 if(comparable.length>=4){
   let cut=Math.floor(comparable.length/2),early=avg(comparable.slice(0,cut)),late=avg(comparable.slice(cut));
   economy=clamp(70+(late/early-1)*400,0,100);
 }

 let longGap=Math.max(0,state.setup.peakLong-longest);
 let safeLongStep=Math.max(1.5,longest*.10);
 let longWeeksNeeded=longGap/safeLongStep;
 let currentWeekly=Math.max(1,Number(state.setup.currentWeekly)||1);
 let targetWeekly=Math.max(currentWeekly,Number(state.setup.maxWeekly)||currentWeekly);
 let growth=Math.max(.01,Number(state.setup.growth)||.05);
 let volumeWeeksNeeded=targetWeekly<=currentWeekly?0:Math.log(targetWeekly/currentWeekly)/Math.log(1+growth);
 let requiredBuildWeeks=Math.max(longWeeksNeeded,volumeWeeksNeeded)+1.5;
 let preparationTime=daysRemaining<=0?0:clamp((usableBuildWeeks/Math.max(1,requiredBuildWeeks))*100,0,100);

 let completedLongs=state.runs.filter(r=>r.type==='Long run'&&dte(r.date)>=new Date(today().getTime()-84*DAY));
 let dueLongs=state.plan.filter(p=>p.type==='Long run'&&dte(p.date)<=today()&&today()-dte(p.date)<=84*DAY);
 let longRunExecution=dueLongs.length?clamp(completedLongs.length/dueLongs.length*100,0,100):null;

 let specificDue=state.plan.filter(p=>['Tempo','Intervals','Fitness assessment'].includes(p.type)&&dte(p.date)<=today()&&today()-dte(p.date)<=56*DAY);
 let specificDone=specificDue.filter(p=>completedDates.has(p.date)).length;
 let specificity=specificDue.length?clamp(specificDone/specificDue.length*100,0,100):null;

 const weighted=(items)=>{
   let totalWeight=sum(items.map(x=>x.weight));
   let availableWeight=sum(items.filter(x=>Number.isFinite(x.score)).map(x=>x.weight));
   return{
     score:totalWeight?sum(items.map(x=>(Number.isFinite(x.score)?x.score:50)*x.weight))/totalWeight:null,
     coverage:totalWeight?availableWeight/totalWeight:0,
     items
   }
 };

 let pillars=[
   {name:'Physiological readiness',weight:.35,color:'#2d82c7',description:'Current performance, endurance capacity and running economy.',
    ...weighted([{name:'Fitness',score:fitness,weight:.45},{name:'Endurance',score:endurance,weight:.40},{name:'Economy',score:economy,weight:.15}])},
   {name:'Training execution',weight:.25,color:'#159487',description:'How reliably the planned work and key long runs are being completed.',
    ...weighted([{name:'Adherence',score:adherence,weight:.45},{name:'Consistency',score:consistency,weight:.30},{name:'Long-run execution',score:longRunExecution,weight:.25}])},
   {name:'Recovery & health',weight:.20,color:'#7457c8',description:'Whether recovery and pain evidence support absorbing the programme.',
    ...weighted([{name:'Recovery',score:recoveryScore,weight:.60},{name:'Pain status',score:painScore,weight:.40}])},
   {name:'Race readiness',weight:.20,color:'#e49b35',description:'Whether enough time remains and marathon-specific work is being completed.',
    ...weighted([{name:'Preparation time',score:preparationTime,weight:.25},{name:'Endurance',score:endurance,weight:.30},{name:'Long-run execution',score:longRunExecution,weight:.25},{name:'Specificity',score:specificity,weight:.20}])}
 ];

 let availablePillars=pillars.filter(p=>Number.isFinite(p.score));
 let availableWeight=sum(availablePillars.map(p=>p.weight));
 let rawOverall=availableWeight?sum(availablePillars.map(p=>p.score*p.weight))/availableWeight:0;
 let evidenceCoverage=sum(pillars.map(p=>p.weight*p.coverage));
 // Missing evidence pulls the displayed readiness modestly toward neutral without
 // pretending that unavailable data proves poor readiness.
 let overall=rawOverall*evidenceCoverage+50*(1-evidenceCoverage);

 let components=pillars.flatMap(p=>p.items.map(i=>({...i,pillar:p.name,pillarColor:p.color})));
 return{
   pillars,components,overall,rawOverall,evidenceCoverage,riegel,plannedKm,actual,longest,
   completedLongest,matched,opportunities,weeksRemaining,usableBuildWeeks,requiredBuildWeeks,
   preparationTime,longWeeksNeeded,volumeWeeksNeeded
 }
}
function prediction(){
 let c=confidence();
 let penalty=Math.max(0,(75-c.overall)/500);
 return c.riegel*(1+penalty)
}
const interpretations={
 'Fitness':s=>s>=85?'Recent assessment performance strongly supports the target.':s>=65?'Performance is credible but not yet comfortably above the target requirement.':'Current assessment evidence does not support the target.',
 'Endurance':s=>s>=85?'Longest-run evidence is close to the planned peak.':s>=65?'Endurance is progressing but key long runs remain.':'Long-run preparation is still limited.',
 'Economy':s=>s==null?'At least four comparable aerobic runs with HR and power are required.':s>=75?'Aerobic efficiency is stable or improving.':'Aerobic efficiency has weakened in recent comparable runs.',
 'Adherence':s=>s==null?'No planned distance is due yet.':s>=85?'Completed distance closely matches due distance.':'There is a meaningful completed-volume gap.',
 'Consistency':s=>s==null?'No scheduled sessions are due yet.':s>=80?'Scheduled training frequency is reliable.':'Recent session completion is inconsistent.',
 'Long-run execution':s=>s==null?'No long runs are due yet.':s>=80?'Key long runs are being completed reliably.':'Several due long runs remain incomplete.',
 'Recovery':s=>s==null?'Add recovery ratings after runs to create evidence.':s>=75?'Recovery ratings support normal training.':'Recovery ratings suggest fatigue management is needed.',
 'Pain status':s=>s==null?'Add pain ratings after runs to create evidence.':s>=80?'Pain evidence is reassuring.':'Pain evidence warrants caution and possible load reduction.',
 'Preparation time':s=>s>=80?'Sufficient build time remains.':s>=60?'The timeline is workable but has little disruption margin.':s>=40?'The required progression is aggressive.':'Too little build time remains for the current peak targets.',
 'Specificity':s=>s==null?'No marathon-specific sessions are due yet.':s>=80?'Specific sessions are being completed reliably.':'Marathon-specific execution is incomplete.'
};
const actions={
 'Fitness':'Complete a valid evenly paced assessment before making the race goal more aggressive.',
 'Endurance':'Prioritise controlled long runs and practise race fuelling.',
 'Economy':'Collect comparable aerobic runs; interpret efficiency only with similar terrain and conditions.',
 'Adherence':'Close the volume gap gradually and never recover missed kilometres in one week.',
 'Consistency':'Protect the core weekly sessions before adding optional work.',
 'Long-run execution':'Complete the next suitable long run rather than adding intensity.',
 'Recovery':'Log recovery and reduce load when ratings trend downward.',
 'Pain status':'Do not progress load while pain changes stride or rises across runs.',
 'Preparation time':'Extend the timeline, reduce peak requirements or keep the target conservative.',
 'Specificity':'Complete the next marathon-specific session at controlled, repeatable effort.'
};
const componentDefinitions={
 'Fitness':'Projection from the latest valid performance assessment relative to the target race time.',
 'Endurance':'Longest credible completed run relative to the planned peak long run.',
 'Economy':'Change in running effectiveness across comparable aerobic runs with HR and power.',
 'Adherence':'Completed distance compared with planned distance that was actually due.',
 'Consistency':'Percentage of due planned sessions with a completed run on the same date.',
 'Long-run execution':'Percentage of due long runs completed during the recent preparation block.',
 'Recovery':'Average self-reported post-run recovery score.',
 'Pain status':'Average pain score transformed so lower pain produces a higher readiness value.',
 'Preparation time':'Usable build weeks before taper compared with the weeks needed for safe progression.',
 'Specificity':'Completion of due tempo, interval and assessment sessions.'
};

function assessmentText(c){let weak=[...c.components].sort((a,b)=>a.score-b.score)[0];if(c.overall>=85)return'Your current fitness, endurance and training execution strongly support the goal. Preserve consistency and avoid adding unnecessary fatigue.';if(c.overall>=70)return`The goal is realistic, but readiness still depends on completing the remaining key sessions and maintaining recovery. The weakest component is ${weak.name}.`;if(c.overall>=55)return`Some indicators support the goal, but overall readiness is not yet secure. The largest current limiter is ${weak.name}. Focus there before making the target more aggressive.`;return'The available training evidence does not yet support the target with readiness. Rebuild the weakest foundations, log completed sessions consistently and use the next assessment to review the goal.'}
function kpi(l,v,s=''){return`<div class="kpi"><label>${esc(l)}</label><strong>${esc(v)}</strong><small>${esc(s)}</small></div>`}
function coachLabel(name,score){
 const labels={
  'Fitness':score>=85?'Current fitness supports the race target':'Fitness evidence needs strengthening',
  'Preparation time':score>=80?'The preparation timeline is sufficient':'The preparation timeline is tight',
  'Endurance':score>=75?'Long-run endurance is progressing well':'Long-run endurance remains a limiter',
  'Adherence':score>=80?'Training volume is being completed reliably':'Completed volume is below plan',
  'Consistency':score>=80?'Weekly training frequency is consistent':'Session consistency needs attention',
  'Long-run execution':score>=80?'Key long runs are being completed':'Long-run execution needs attention',
  'Recovery':score>=75?'Recovery supports normal training':'Recovery evidence suggests caution',
  'Pain status':score>=80?'Pain evidence is reassuring':'Pain requires closer monitoring',
  'Specificity':score>=80?'Specific sessions are on track':'Race-specific work is incomplete',
  'Economy':score>=75?'Aerobic efficiency is improving':'Aerobic efficiency needs more evidence'
 };
 return labels[name]||`${name}: ${Math.round(score)}`;
}
function renderDashboard(){
 let c=confidence(),pred=prediction(),cw=currentWeek(),wd=weekData(cw);
 $('phaseBadge').textContent=phase(cw);
 $('raceTitle').textContent=state.setup.raceName;
 $('raceSubtitle').textContent=`${dte(state.setup.raceDate).toLocaleDateString()} • ${state.setup.raceDistance.toFixed(1)} km`;
 $('confidenceValue').textContent=Math.round(c.overall)+'%';
 document.querySelector('.confidenceRing').style.setProperty('--pct',Math.round(c.overall)+'%');

 $('kpis').innerHTML=
   kpi('Target time',fmtTime(state.setup.targetTime))+
   kpi('Predicted time',fmtTime(pred),pred<=state.setup.targetTime?'Ahead of target':'Behind target')+
   kpi('Evidence coverage',Math.round(c.evidenceCoverage*100)+'%','Missing data shown separately')+
   kpi('Weeks remaining',Math.max(0,Math.ceil(c.weeksRemaining)))+
   kpi('Build weeks needed',c.requiredBuildWeeks.toFixed(1),c.usableBuildWeeks.toFixed(1)+' available before taper')+
   kpi('This week',wd.planned.toFixed(1)+' km',wd.actual.toFixed(1)+' km completed')+
   kpi('Longest evidence',c.longest.toFixed(1)+' km')+
   kpi('Adaptive factor',state.plan.find(p=>p.week===cw)?.factor.toFixed(2)||'1.00');

 $('assessmentText').textContent=assessmentText(c);
 $('evidenceBadge').textContent=`Evidence ${Math.round(c.evidenceCoverage*100)}% complete`;

 $('pillarCards').innerHTML=c.pillars.map(p=>`
   <div class="pillarCard" style="--pillar:${p.color}">
    <div class="pillarTop"><b>${p.name}</b><span class="pillarScore">${Number.isFinite(p.score)?Math.round(p.score):'—'}</span></div>
    <div class="pillarBar"><i style="width:${Number.isFinite(p.score)?p.score:0}%"></i></div>
    <p>${p.description}</p>
    <div class="pillarMeta"><span>Model weight ${Math.round(p.weight*100)}%</span><span>Evidence ${Math.round(p.coverage*100)}%</span></div>
    <details class="pillarExplain"><summary>How this is calculated</summary>
      <div class="calcTable">${p.items.map(i=>`<div class="calcRow"><span>${i.name}</span><span>${Number.isFinite(i.score)?Math.round(i.score):'N/A'}</span><span>${Math.round(i.weight*100)}%</span></div>`).join('')}</div>
      <p class="muted">Missing contributors are held at a neutral 50, while evidence coverage shows how much real data supports the score.</p>
    </details>
   </div>`).join('');

 $('componentGuide').innerHTML=c.components.map(x=>`
   <div><b>${x.name}</b><p>${componentDefinitions[x.name]}</p>
   <small class="${Number.isFinite(x.score)?'muted':'metricMissing'}">${Number.isFinite(x.score)?`Current score: ${Math.round(x.score)} / 100`:'Not enough data yet'} · within-pillar weight ${Math.round(x.weight*100)}%</small></div>`).join('');

 let scored=c.components.filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);
 $('strengths').innerHTML=scored.slice(0,3).map(x=>`<div class="note good"><b>✓ ${coachLabel(x.name,x.score)}</b><br>${interpretations[x.name](x.score)}</div>`).join('')||'<p class="muted">More training data is needed.</p>';
 $('risks').innerHTML=[...scored].reverse().slice(0,3).map(x=>`<div class="note warn"><b>⚠ ${coachLabel(x.name,x.score)}</b><br>${interpretations[x.name](x.score)}</div>`).join('')||'<p class="muted">More training data is needed.</p>';
 $('dashboardActions').innerHTML=[...scored].sort((a,b)=>a.score-b.score).slice(0,3).map((x,i)=>`<div class="actionRow"><strong>${i+1}</strong><b>${x.name}</b><span>${Math.round(x.score)}%</span><div>${actions[x.name]}<br><small class="muted">${interpretations[x.name](x.score)}</small></div></div>`).join('');

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
function renderReadinessProfile(pillars){
 $('readinessProfile').innerHTML=pillars.map(p=>`<div class="readinessRow">
   <div class="readinessName">${p.name}</div>
   <div class="readinessTrack"><div class="readinessFill" style="--bar:${p.color};width:${Number.isFinite(p.score)?p.score:0}%"></div></div>
   <div class="readinessNumber">${Number.isFinite(p.score)?Math.round(p.score):'—'}</div>
 </div>`).join('');
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
 let allSec=[...predSec,state.setup.targetTime],low=Math.min(...allSec),high=Math.max(...allSec);
 let minSec=Math.max(2*3600,Math.floor((low-1800)/1800)*1800);
 let maxSec=Math.min(7*3600,Math.ceil((high+1800)/1800)*1800);
 if(maxSec-minSec<3600)maxSec=minSec+3600;
 drawLine($('predictionChart'),[
   {label:'Assessment projection',data:predSec,color:'#7457c8'},
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
 renderReadinessProfile(c.pillars);
}
function workoutHtml(p){let st=status(p);return`<div class="workout" data-id="${p.id}"><div class="workoutHead"><div class="dateBox"><b>${new Date(p.date+'T00:00:00').getDate()}</b><span>${new Date(p.date+'T00:00:00').toLocaleDateString(undefined,{month:'short'})}</span></div><div class="workoutTitle"><h3>${p.type}</h3><p>${p.type==='Rest'?p.purpose:`${p.distance.toFixed(1)} km · ${p.phase}`}</p></div><span class="status ${st}">${st}</span></div><div class="workoutDetails"><div class="targets">${p.type==='Rest'?'':`<div class="target"><small>Pace</small><b>${pace(p.zone.pace)}</b></div><div class="target"><small>HR</small><b>${p.zone.hr} bpm</b></div><div class="target"><small>Power</small><b>${p.zone.power} W</b></div>`}</div><div class="prescription"><p><b>Warm-up:</b> ${p.warmup}</p><p><b>Main set:</b> ${p.main}</p><p><b>Cooldown:</b> ${p.cooldown}</p><p><b>Purpose:</b> ${p.purpose}</p><p><b>Coach guidance:</b> ${p.coach}</p><p><b>Fuel / hydration:</b> ${p.fuel}</p></div></div></div>`}
function renderToday(){let p=state.plan.find(x=>x.date===iso(today()));$('todayDate').textContent=today().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});$('todayCard').innerHTML=p?workoutHtml(p):'<div class="panel">No workout scheduled.</div>';$('todayCoach').innerHTML=p?`<div class="note">${p.coach}</div><div class="note good">${p.purpose}</div>`:''}
function renderPlan(){if(!state.weekView)state.weekView=currentWeek();let arr=state.plan.filter(p=>p.week===state.weekView),wd=weekData(state.weekView),factor=arr[0]?.factor||1;$('weekHeader').innerHTML=`<b>Week ${state.weekView} · ${phase(state.weekView)}</b><br><span class="muted">${fmtDate(iso(weekStart(state.weekView)))} · ${wd.planned.toFixed(1)} km planned · ${wd.actual.toFixed(1)} km completed · adaptive factor ${factor.toFixed(2)}</span>`;$('planCards').innerHTML=arr.map(workoutHtml).join('')}

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
 let powerDrift=p1&&p2&&h1&&h2?(1-(p2/h2)/(p1/h1))*100:null;
 let paceDrift=v1&&v2&&h1&&h2?(1-(v2/h2)/(v1/h1))*100:null;
 let drift=Number.isFinite(powerDrift)?powerDrift:paceDrift;
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
 const find=(names)=>{
   let variants=names.map(norm);
   for(let n of variants){let exact=headers.indexOf(n);if(exact>=0)return exact}
   for(let n of variants){let fuzzy=headers.findIndex(h=>h.includes(n)||n.includes(h));if(fuzzy>=0)return fuzzy}
   return -1;
 };
 const indexMap={
   timestamp:find(['Timestamp','Time','Date Time','datetime']),
   hr:find(['Heart Rate (bpm)','Heart Rate','heartrate']),
   watchSpeed:find(['Watch Speed (m/s)','Speed (m/s)','speed']),
   strydSpeed:find(['Stryd Speed (m/s)']),
   powerW:find(['Power (W)','Power (Watts)','power']),
   powerKg:find(['Power (w/kg)','Power W/kg']),
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
   let wkg=number(r,indexMap.powerKg);
   return{
     t:timestamp(r),
     hr:number(r,indexMap.hr),
     speed:number(r,indexMap.watchSpeed)||number(r,indexMap.strydSpeed),
     power:number(r,indexMap.powerW)||(wkg? wkg*state.setup.bodyWeight:null),
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
   avgHr:positive('hr'),avgPower:positive('power'),
   cadence:indexMap.cadence>=0?avg(data.map(r=>number(r,indexMap.cadence)).filter(v=>Number.isFinite(v)&&v>0)):null,
   gct:indexMap.gct>=0?avg(data.map(r=>number(r,indexMap.gct)).filter(v=>Number.isFinite(v)&&v>0)):null,
   vo:indexMap.vo>=0?avg(data.map(r=>number(r,indexMap.vo)).filter(v=>Number.isFinite(v)&&v>0)):null,
   rpe:null,pain:null,recovery:null,temperature:null,notes:'Imported from Stryd CSV',
   drift:null,powerDrift:null,paceDrift:null,
   candidateDrift:analysis?.drift??null,candidatePowerDrift:analysis?.powerDrift??null,candidatePaceDrift:analysis?.paceDrift??null,
   candidateStreamEvidence:analysis,streamEvidence:null,sourceFormat:'csv-timeseries'
 };
}

function renderRuns(){$('runList').innerHTML=state.runs.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=>{let m=metrics(r);return`<div class="runCard clickable" data-run="${r.id}"><div class="runSummary"><div><h3>${fmtDate(r.date)} · ${esc(r.type)}</h3><p>${r.distanceKm.toFixed(2)} km · ${fmtTime(r.durationSec)} · ${pace(m.pace)}</p><div class="runStats"><span>HR ${r.avgHr?Math.round(r.avgHr):'—'}</span><span>${r.avgPower?Math.round(r.avgPower):'—'} W</span><span>RE ${dec(m.effect,3)}</span><span>${dec(m.wkg,2)} W/kg</span></div></div><span>›</span></div></div>`}).join('')||'<div class="panel">No completed runs saved yet.</div>'}
function renderMetrics(){
 let rs=state.runs.slice().sort((a,b)=>a.date.localeCompare(b.date)),last=rs.at(-1),m=last?metrics(last):null;
 $('metricKpis').innerHTML=kpi('Latest pace',m?pace(m.pace):'—')+kpi('Distance / heartbeat',m?dec(m.dph,3):'—')+kpi('W / bpm',m?dec(m.wpb,3):'—')+kpi('Running effectiveness',m?dec(m.effect,3):'—')+kpi('W / kg',m?dec(m.wkg,2):'—')+kpi('Runs logged',rs.length);

 let comparable=rs.filter(r=>['Easy','Recovery','Long run','Fitness assessment'].includes(r.type)&&r.avgHr&&r.avgPower&&r.durationSec>=1800);
 let labels=comparable.map(r=>dte(r.date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));
 let eff=comparable.map(r=>metrics(r).effect),dph=comparable.map(r=>metrics(r).dph);
 let firstEff=eff.find(Number.isFinite),firstDph=dph.find(Number.isFinite);
 let effIndex=eff.map(v=>Number.isFinite(v)&&firstEff?v/firstEff*100:null);
 let dphIndex=dph.map(v=>Number.isFinite(v)&&firstDph?v/firstDph*100:null);

 drawLine($('effectivenessChart'),[
  {label:'Effectiveness index',data:effIndex,color:'#2d82c7'}
 ],{min:Math.min(90,...effIndex.filter(Number.isFinite))-3,max:Math.max(110,...effIndex.filter(Number.isFinite))+3,zero:false,empty:'Log a ≥30 min aerobic run with HR and power',formatY:v=>Math.round(v),labels,area:true});
 drawLine($('heartbeatChart'),[
  {label:'Distance/heartbeat index',data:dphIndex,color:'#159487'}
 ],{min:Math.min(90,...dphIndex.filter(Number.isFinite))-3,max:Math.max(110,...dphIndex.filter(Number.isFinite))+3,zero:false,empty:'Log a ≥30 min aerobic run with HR',formatY:v=>Math.round(v),labels,area:true});

 let driftRuns=rs.filter(r=>r.type==='Long run'&&Number.isFinite(r.drift)).slice().sort((a,b)=>a.date.localeCompare(b.date));
 if(driftRuns.length){
   let d=driftRuns.at(-1),cls=d.drift<5?'driftGood':d.drift<8?'driftWarn':'driftHigh';
   $('driftStatus').className='dataStatus '+cls;
   $('driftStatus').innerHTML=`<b>Latest cardiac drift: ${d.drift.toFixed(1)}%</b><br>
   ${Number.isFinite(d.powerDrift)?`Power–HR decoupling ${d.powerDrift.toFixed(1)}%. `:''}${Number.isFinite(d.paceDrift)?`Pace–HR decoupling ${d.paceDrift.toFixed(1)}%.`:''}
   <br><span class="muted">Reliability: ${d.streamEvidence?.reliability||'Unknown'}. ${d.drift<5?'Good aerobic stability.':d.drift<8?'Noticeable drift; compare conditions and fuelling.':'High drift; review pacing, heat, hydration and fatigue.'}</span>`;
 }else{
   $('driftStatus').closest('.panel').style.display='';
   $('driftStatus').className='dataStatus';
   $('driftStatus').innerHTML=`<div class="importNotice"><b>No Long run with time-series drift evidence is stored yet.</b><br>
   Import a detailed Stryd CSV and save it as a Long run. Runs saved in build 6211 or earlier contain averages only and cannot be retroactively analysed.</div>`;
 }
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
function renderCoach(){let c=confidence(),pred=prediction(),gap=pred-state.setup.targetTime;$('coachTop').innerHTML=kpi('Overall readiness',Math.round(c.overall)+'%')+kpi('Predicted time',fmtTime(pred))+kpi('Target gap',(gap>=0?'+':'−')+fmtTime(Math.abs(gap)))+kpi('Current phase',phase(currentWeek()));$('fullAssessment').textContent=assessmentText(c);let sorted=[...c.components].sort((a,b)=>b.score-a.score);$('coachStrengths').innerHTML=sorted.slice(0,3).map(x=>`<div class="note good"><b>✓ ${x.name} · ${Math.round(x.score)}</b><br>${interpretations[x.name](x.score)}</div>`).join('');$('coachRisks').innerHTML=[...sorted].reverse().slice(0,3).map(x=>`<div class="note warn"><b>⚠ ${x.name} · ${Math.round(x.score)}</b><br>${interpretations[x.name](x.score)}</div>`).join('');$('actionsTable').innerHTML=[...c.components].sort((a,b)=>a.score-b.score).slice(0,3).map((x,i)=>`<div class="actionRow"><strong>${i+1}</strong><b>${x.name}</b><span>${Math.round(x.score)}%</span><div>${actions[x.name]}<br><small class="muted">${interpretations[x.name](x.score)}</small></div></div>`).join('')}
function renderRace(){let c=confidence(),pred=prediction(),targetPace=state.setup.targetTime/state.setup.raceDistance;$('raceKpis').innerHTML=kpi('Target time',fmtTime(state.setup.targetTime))+kpi('Target pace',pace(targetPace))+kpi('Target HR',Math.round(state.setup.thresholdHr*.92)+' bpm')+kpi('Target power',Math.round(state.setup.criticalPower*.88)+' W')+kpi('Current prediction',fmtTime(pred))+kpi('Confidence',Math.round(c.overall)+'%');$('racePacing').innerHTML='<div class="note"><b>0–10 km:</b> Start controlled, slightly slower than target pace. Let heart rate rise gradually.</div><div class="note"><b>10–30 km:</b> Settle at target effort and protect fuelling. Avoid reacting to short pace fluctuations.</div><div class="note good"><b>After 30 km:</b> Progress only when breathing, form and stomach remain stable. Otherwise preserve target effort.</div>';$('raceFuel').innerHTML='<p><b>Carbohydrate:</b> 60–90 g/hour, practised in long runs.</p><p><b>Fluids:</b> approximately 400–800 ml/hour, adjusted for temperature and sweat rate.</p><p><b>Sodium:</b> use the same product and concentration tested in training.</p>';$('raceRules').innerHTML='<p>Slow down early if heart rate is unusually high at normal power.</p><p>Do not chase lost seconds on hills or crowded sections.</p><p>Use effort rather than pace when conditions are hot, windy or technical.</p>'}
function renderSettings(){let defs=[['planStart','Plan start','date'],['raceDate','Race date','date'],['raceName','Race name','text'],['raceDistance','Race distance km','number'],['targetTime','Target time','time'],['currentWeekly','Current weekly km','number'],['currentLongest','Current longest run km','number'],['testDistance','Recent test distance km','number'],['testTime','Recent test time','time'],['thresholdHr','Threshold HR','number'],['criticalPower','Critical power W','number'],['bodyWeight','Body weight kg','number'],['maxWeekly','Max weekly km','number'],['growth','Max weekly growth %','percent'],['peakLong','Peak long run km','number'],['taperDays','Taper days','number']];$('settingsGrid').innerHTML=defs.map(d=>{let v=state.setup[d[0]];if(d[2]=='time')v=fmtTime(v);if(d[2]=='percent')v=Math.round(v*100);return`<div class="field"><label>${d[1]}</label><input data-setting="${d[0]}" data-type="${d[2]}" type="${d[2]=='date'?'date':'text'}" value="${esc(v)}"></div>`}).join('');$('daysGrid').innerHTML=state.days.map((d,i)=>`<div class="panelHead" style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${d[0]}</b><label><input data-day="${i}" type="checkbox" ${d[1]?'checked':''}> Train</label><select data-session="${i}"><option ${d[2]=='Easy'?'selected':''}>Easy</option><option ${d[2]=='Intervals'?'selected':''}>Intervals</option><option ${d[2]=='Tempo'?'selected':''}>Tempo</option><option ${d[2]=='Long run'?'selected':''}>Long run</option></select></div>`).join('')}
function weeklyCompletedLongs(){
 return Array.from({length:weeks()},(_,i)=>{
   let st=weekStart(i+1),en=new Date(st.getTime()+7*DAY);
   let r=state.runs.filter(x=>dte(x.date)>=st&&dte(x.date)<en);
   return r.length?Math.max(...r.map(x=>Number(x.distanceKm)||0)):null;
 });
}
function renderProgress(){
 let c=confidence(),tests=state.assessments.filter(a=>a.valid).sort((a,b)=>a.date.localeCompare(b.date));
 let arr=completedWeekSeries(),labels=arr.map((_,i)=>'W'+(i+1));
 let projected=tests.map(a=>a.time*Math.pow(state.setup.raceDistance/a.distance,1.06));
 let testLabels=tests.map(a=>dte(a.date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));
 if(!projected.length){projected=[c.riegel];testLabels=['Baseline']}
 let range=[...projected,state.setup.targetTime],min=Math.max(2*3600,Math.floor((Math.min(...range)-1800)/1800)*1800),max=Math.min(7*3600,Math.ceil((Math.max(...range)+1800)/1800)*1800);
 if(max-min<3600)max=min+3600;

 $('progressKpis').innerHTML=
   kpi('Current projection',fmtTime(prediction()))+
   kpi('Target',fmtTime(state.setup.targetTime))+
   kpi('Readiness',Math.round(c.overall)+'%')+
   kpi('Evidence coverage',Math.round(c.evidenceCoverage*100)+'%')+
   kpi('Longest run evidence',c.longest.toFixed(1)+' km')+
   kpi('Assessments',tests.length);

 drawLine($('progressPredictionChart'),[
  {label:'Projection',data:projected,color:'#7457c8'},
  {label:'Target',data:projected.map(()=>state.setup.targetTime),color:'#d75b67',dashed:true,points:false}
 ],{min,max,formatY:v=>fmtTime(v),labels:testLabels,left:98});
 drawLine($('progressLongChart'),[
  {label:'Weekly longest completed',data:weeklyCompletedLongs(),color:'#159487'},
  {label:'Planned peak',data:labels.map(()=>state.setup.peakLong),color:'#e49b35',dashed:true,points:false}
 ],{min:0,max:Math.max(10,state.setup.peakLong*1.12),labels});

 let comp=state.runs.filter(r=>['Easy','Recovery','Long run','Fitness assessment'].includes(r.type)&&r.avgHr&&r.avgPower&&r.durationSec>=1800).sort((a,b)=>a.date.localeCompare(b.date));
 let eff=comp.map(r=>metrics(r).effect),base=eff.find(Number.isFinite);
 let idx=eff.map(v=>Number.isFinite(v)&&base?v/base*100:null);
 let eLabels=comp.map(r=>dte(r.date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));
 drawLine($('progressEconomyChart'),[
  {label:'Effectiveness index',data:idx,color:'#2d82c7'}
 ],{min:Math.min(90,...idx.filter(Number.isFinite))-3,max:Math.max(110,...idx.filter(Number.isFinite))+3,zero:false,labels:eLabels,area:true,empty:'More comparable powered runs are needed'});

 let statements=[];
 if(tests.length>=2){
   let delta=projected.at(-1)-projected[0];
   statements.push(delta<0?`Your assessment-based marathon projection improved by ${fmtTime(Math.abs(delta))}.`:`Your assessment-based projection slowed by ${fmtTime(delta)}; review conditions and recovery before changing the goal.`);
 }else statements.push('A second valid assessment is needed before a performance trend can be established.');
 let completed=sum(arr.slice(0,currentWeek()).map(x=>x.actual)),planned=sum(arr.slice(0,currentWeek()).map(x=>x.planned));
 statements.push(planned?`You have completed ${Math.round(completed/planned*100)}% of planned distance due so far.`:'No planned distance is due yet.');
 statements.push(c.longest>=state.setup.peakLong*.8?'Long-run endurance is close to the planned peak.':`The current endurance gap to the peak long run is ${(state.setup.peakLong-c.longest).toFixed(1)} km.`);
 statements.push(c.evidenceCoverage<.7?'Readiness evidence remains incomplete; consistently add recovery, pain, HR and power where available.':'The readiness score is supported by reasonably complete evidence.');
 $('progressNarrative').innerHTML=statements.map(x=>`<div class="coachSentence">${x}</div>`).join('');
}
function renderAll(){renderDashboard();renderToday();renderPlan();renderRuns();renderMetrics();renderProgress();renderAssessments();renderCoach();renderRace();renderSettings()}
const pages=[['dashboard','Dashboard'],['today','Today'],['plan','Plan'],['runs','Runs'],['assessments','Assessments'],['race','Race day'],['settings','Settings']];
$('nav').innerHTML=pages.map((p,i)=>`<button data-page="${p[0]}" class="${i?'':'active'}">${p[1]}</button>`).join('');$('nav').onclick=e=>{let p=e.target.dataset.page;if(!p)return;document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===p));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===p));renderAll();scrollTo(0,0)};document.body.onclick=e=>{if(e.target.dataset.go){document.querySelector(`[data-page="${e.target.dataset.go}"]`).click()}let w=e.target.closest('.workout');if(w&&!e.target.closest('button'))w.classList.toggle('open')};
$('prevWeek').onclick=()=>{state.weekView=clamp((state.weekView||currentWeek())-1,1,weeks());renderPlan()};$('nextWeek').onclick=()=>{state.weekView=clamp((state.weekView||currentWeek())+1,1,weeks());renderPlan()};$('thisWeek').onclick=()=>{state.weekView=currentWeek();renderPlan()};

function runEditorHtml(r){
 return `<h2>Edit run</h2><div class="formGrid">
  <div class="field"><label>Date</label><input id="erDate" type="date" value="${r.date}"></div>
  <div class="field"><label>Run type</label><select id="erType">${['Easy','Recovery','Long run','Tempo','Intervals','Fitness assessment','Race'].map(x=>`<option ${r.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Distance km</label><input id="erDistance" type="number" step="0.01" value="${r.distanceKm}"></div>
  <div class="field"><label>Duration</label><input id="erDuration" value="${fmtTime(r.durationSec)}"></div>
  <div class="field"><label>Average HR</label><input id="erHr" type="number" value="${r.avgHr??''}"></div>
  <div class="field"><label>Average power</label><input id="erPower" type="number" value="${r.avgPower??''}"></div>
  <div class="field"><label>RPE</label><input id="erRpe" type="number" min="1" max="10" value="${r.rpe??''}"></div>
  <div class="field"><label>Pain 0–10</label><input id="erPain" type="number" min="0" max="10" value="${r.pain??''}"></div>
  <div class="field"><label>Recovery 1–5</label><input id="erRecovery" type="number" min="1" max="5" value="${r.recovery??''}"></div>
  <div class="field"><label>Notes</label><textarea id="erNotes">${esc(r.notes||'')}</textarea></div>
 </div>
 ${Number.isFinite(r.drift)?`<div class="dataStatus"><b>Imported cardiac drift: ${r.drift.toFixed(1)}%</b><br><span class="muted">Time-series analysis is preserved when summary fields are edited.</span></div>`:''}
 <button id="saveRunEdit" class="primary full">Save changes</button>`;
}
function updatedRunFromForm(r){
 let distance=Number($('erDistance').value),duration=parseTime($('erDuration').value);
 if(!$('erDate').value||!distance||!duration)throw Error('Enter a valid date, distance and duration.');
 let updated={...r,date:$('erDate').value,type:$('erType').value,distanceKm:distance,durationSec:duration,
  avgHr:Number($('erHr').value)||null,avgPower:Number($('erPower').value)||null,
  rpe:Number($('erRpe').value)||null,pain:$('erPain').value===''?null:Number($('erPain').value),
  recovery:Number($('erRecovery').value)||null,notes:$('erNotes').value};
 let match=state.plan.find(p=>p.date===updated.date&&p.type!=='Rest');
 if(match)updated.planId=match.id;else delete updated.planId;
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
 $('saveRunEdit').onclick=()=>{
   try{
    let updated=updatedRunFromForm(r),i=state.runs.findIndex(x=>x.id===r.id);
    if(i<0)throw Error('Run not found.');
    if(updated.type!=='Long run'){
      updated.drift=null;updated.powerDrift=null;updated.paceDrift=null;updated.streamEvidence=null;
    }
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
    ${kpi('Power',preview.avgPower?Math.round(preview.avgPower)+' W':'—')}
    ${kpi('Cardiac drift',Number.isFinite(preview.candidateDrift)?preview.candidateDrift.toFixed(1)+'% candidate':'Not available',
      preview.candidateStreamEvidence?.reliability?preview.candidateStreamEvidence.reliability+' reliability · saved only for Long runs':'Needs ≥30 min with HR plus speed or power')}
    ${kpi('Power–HR drift',Number.isFinite(preview.candidatePowerDrift)?preview.candidatePowerDrift.toFixed(1)+'% candidate':'—')}
    ${kpi('Pace–HR drift',Number.isFinite(preview.candidatePaceDrift)?preview.candidatePaceDrift.toFixed(1)+'% candidate':'—')}
    ${kpi('Running effectiveness',dec(m.effect,3))}
   </div>
   <div class="formGrid">
    <div class="field"><label>Run type</label><select id="iType"><option>Easy</option><option>Recovery</option><option>Long run</option><option>Tempo</option><option>Intervals</option><option>Fitness assessment</option><option>Race</option></select></div>
    <div class="field"><label>RPE</label><input id="iRpe" type="number" min="1" max="10"></div>
    <div class="field"><label>Pain 0–10</label><input id="iPain" type="number" min="0" max="10"></div>
    <div class="field"><label>Recovery 1–5</label><input id="iRecovery" type="number" min="1" max="5"></div>
    <div class="field"><label>Notes</label><input id="iNotes"></div>
   </div>
   <button id="saveImport" class="primary full">Save analysed run</button>`;

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
      if(preview.type==='Long run'){
        preview.drift=preview.candidateDrift;
        preview.powerDrift=preview.candidatePowerDrift;
        preview.paceDrift=preview.candidatePaceDrift;
        preview.streamEvidence=preview.candidateStreamEvidence;
      }else{
        preview.drift=null;
        preview.powerDrift=null;
        preview.paceDrift=null;
        preview.streamEvidence=null;
      }
      delete preview.candidateDrift;
      delete preview.candidatePowerDrift;
      delete preview.candidatePaceDrift;
      delete preview.candidateStreamEvidence;
      let match=state.plan.find(p=>p.date===preview.date&&p.type!=='Rest');
      if(match)preview.planId=match.id;
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
$('saveSettings').onclick=()=>{document.querySelectorAll('[data-setting]').forEach(el=>{let k=el.dataset.setting,t=el.dataset.type,v=el.value;if(t==='number')v=Number(v);if(t==='time')v=parseTime(v);if(t==='percent')v=Number(v)/100;state.setup[k]=v});document.querySelectorAll('[data-day]').forEach(el=>state.days[Number(el.dataset.day)][1]=el.checked);document.querySelectorAll('[data-session]').forEach(el=>state.days[Number(el.dataset.session)][2]=el.value);buildPlan();state.weekView=currentWeek();renderAll();toast('Settings saved. Past workouts were retained; future workouts rebuilt.')};
function download(n,t,m){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('backupBtn').onclick=()=>download('ai-running-coach-backup.json',JSON.stringify(state,null,2),'application/json');$('restoreFile').onchange=e=>e.target.files[0]?.text().then(t=>{state=JSON.parse(t);save();renderAll();toast('Backup restored.')}).catch(()=>toast('Invalid backup.',true));$('exportBtn').onclick=()=>download('run-log.csv',['Date,Type,Distance km,Duration sec,HR,Power,RPE,Pain,Recovery,Notes',...state.runs.map(r=>[r.date,r.type,r.distanceKm,r.durationSec,r.avgHr,r.avgPower,r.rpe,r.pain,r.recovery,`"${String(r.notes||'').replaceAll('"','""')}"`].join(','))].join('\n'),'text/csv');$('resetBtn').onclick=()=>{if(confirm('Delete all app data?')){state=defaults();buildPlan();renderAll();toast('App reset.')}};
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('installBtn').className='install'});$('installBtn').onclick=()=>deferred?.prompt();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('service-worker.js');
migrateAssessmentRuns();
renderAll();
console.info('AI Running Coach v6.3 web build 6305');
})();