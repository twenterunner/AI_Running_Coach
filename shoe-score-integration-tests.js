'use strict';
const assert=require('assert');
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lifecycleIsQuality(t){return /Threshold|interval|VO|Fartlek|Progression|Specific|Race/.test(t)}
function shoeProfileWorkoutSuitability(p,t){return (p.workoutSuitability&&p.workoutSuitability[t])||p.workout||70}
function shoeDistanceScore(p,d){const min=p.preferredDistanceMinKm||0,max=p.preferredDistanceMaxKm||999;if(d>=min&&d<=max)return 100;return d>max?Math.max(20,100-(d-max)*5):Math.max(55,100-(min-d)*8)}
function shoeSurfaceScore(p,plan){return 100}
function runnerFootMechanics(){return 'neutral'}
function footMechanicsSessionAdjustment(p,t,r){return p.supportType==='guided'?-5:7}
function lifecycleInjuryFootwearAdjustment(p){return 0}
function shoeMileage(s){return s.km||0}
function shoeSuitabilityAssessment(profile,plan,{rehab=false,shoe=null,projectedKm=null,retireKm=null}={}){
 if(!profile||!plan)return{score:0,components:[],weights:{}};
 const type=String(plan.type||'Easy'),d=Math.max(0,Number(plan.distance)||0),isRecovery=rehab||/Rehab|Recovery|Walk/i.test(type),isQuality=lifecycleIsQuality(type),isLong=/Long|Medium-long/i.test(type)||d>=18,isHills=/Hills|trail|mixed/i.test(`${type} ${plan.surface||''}`);
 const workout=clamp(Math.round(profile.workoutSuitability?.[type]??shoeProfileWorkoutSuitability(profile,type)),0,100);
 const distance=clamp(Math.round(shoeDistanceScore(profile,d)),0,100);
 const cushioning=clamp(Math.round(((Number(profile.cushioning||3)*.36+Number(profile.protection||3)*.36+Number(profile.comfort||3)*.28)/5)*100),0,100);
 const response=clamp(Math.round(((Number(profile.responsiveness||3)*.55+Number(profile.efficiency||3)*.45)/5)*100),0,100);
 const stability=clamp(Math.round(((Number(profile.stability||3)*.68+Number(profile.guidance||profile.stability||3)*.32)/5)*100),0,100);
 const surfaceBase=shoeSurfaceScore(profile,plan),surface=clamp(Math.round(surfaceBase*.65+(Number(profile.grip||3)/5*100)*.35),0,100);
 const gait=runnerFootMechanics(),footAdj=footMechanicsSessionAdjustment(profile,type,rehab);
 // 100 means no meaningful mechanics mismatch; penalties/bonuses are expressed within this component.
 let foot=clamp(Math.round(88+footAdj*.5),0,100);
 if(gait==='unknown'||gait==='not-sure'||gait==='not sure')foot=90;
 let rehabContext=null;
 if(rehab)rehabContext=clamp(Math.round(82+lifecycleInjuryFootwearAdjustment(profile)*.6),0,100);
 let lifecycle=100;
 const limit=Number(retireKm)||Number(profile.typicalReplacementHighKm)||850;
 const km=Number.isFinite(Number(projectedKm))?Number(projectedKm):(shoe?shoeMileage(shoe):0);
 if(limit>0){
  const ratio=km/limit;
  lifecycle=ratio<=.55?100:ratio<=.75?Math.round(100-(ratio-.55)*80):ratio<=.9?Math.round(84-(ratio-.75)*160):Math.round(60-(ratio-.9)*300);
 }
 if(shoe){
  const condition=shoe.condition||shoe.conditionFeedback||'Feels normal';
  if(condition==='Slightly worn')lifecycle=Math.min(lifecycle,82);
  if(condition==='Noticeably flat'||condition==='Grip deteriorating')lifecycle=Math.min(lifecycle,55);
  if(condition==='Upper damaged'||condition==='Causing discomfort')lifecycle=Math.min(lifecycle,20);
 }
 lifecycle=clamp(lifecycle,0,100);
 let weights={workout:22,distance:10,cushioning:14,response:14,stability:10,surface:8,foot:8,lifecycle:14};
 if(isRecovery)weights={workout:18,distance:8,cushioning:22,response:5,stability:15,surface:7,foot:10,lifecycle:10,rehab:5};
 else if(isQuality)weights={workout:24,distance:10,cushioning:8,response:25,stability:8,surface:8,foot:5,lifecycle:12};
 else if(isLong)weights={workout:20,distance:12,cushioning:20,response:10,stability:10,surface:8,foot:8,lifecycle:12};
 if(isHills&&!isRecovery){weights.surface+=6;weights.stability+=4;weights.workout=Math.max(10,weights.workout-5);weights.response=Math.max(5,weights.response-3);weights.lifecycle=Math.max(6,weights.lifecycle-2)}
 const values={workout,distance,cushioning,response,stability,surface,foot,lifecycle,rehab:rehabContext};
 let weighted=0,total=0;
 Object.entries(weights).forEach(([key,weight])=>{if(values[key]==null||weight<=0)return;weighted+=values[key]*weight;total+=weight});
 let score=clamp(Math.round(weighted/Math.max(1,total)),0,100);
 // Never show a perfect total unless every positively weighted visible component is also perfect.
 if(score===100&&Object.entries(weights).some(([k,w])=>w>0&&values[k]!=null&&values[k]<100))score=99;
 const components=[
  {key:'workout',label:'Workout match',value:workout,weight:weights.workout||0},
  {key:'distance',label:'Distance match',value:distance,weight:weights.distance||0},
  {key:'cushioning',label:'Cushioning / protection',value:cushioning,weight:weights.cushioning||0},
  {key:'response',label:'Responsiveness / efficiency',value:response,weight:weights.response||0},
  {key:'stability',label:'Stability / support',value:stability,weight:weights.stability||0},
  {key:'surface',label:'Surface / grip',value:surface,weight:weights.surface||0},
  {key:'foot',label:'Foot-mechanics context',value:foot,weight:weights.foot||0},
  ...(rehab?[{key:'rehab',label:'Rehabilitation context',value:rehabContext,weight:weights.rehab||0}]:[]),
  {key:'lifecycle',label:'Lifecycle / condition',value:lifecycle,weight:weights.lifecycle||0}
 ].filter(x=>x.weight>0);
 return{score,components,weights,totalWeight:total}
}
const superblast={family:'SUPERBLAST',workoutSuitability:{Hills:70,'Long run':96,'Race Day':88},cushioning:5,protection:5,comfort:4,responsiveness:5,efficiency:5,stability:4,guidance:4,grip:4,preferredDistanceMinKm:5,preferredDistanceMaxKm:50,typicalReplacementHighKm:900,supportType:'neutral'};
const nova4={family:'NOVABLAST',workoutSuitability:{Hills:55,'Long run':88,'Race Day':76},cushioning:4,protection:4,comfort:4,responsiveness:4,efficiency:4,stability:3,guidance:3,grip:3,preferredDistanceMinKm:3,preferredDistanceMaxKm:42.2,typicalReplacementHighKm:850,supportType:'neutral'};

const hills={type:'Hills',distance:8.1,surface:'road'};
const a=shoeSuitabilityAssessment(superblast,hills,{projectedKm:54,retireKm:850});
const weighted=Math.round(a.components.reduce((n,c)=>n+c.value*c.weight,0)/a.components.reduce((n,c)=>n+c.weight,0));
assert.equal(a.score,weighted,'headline must equal visible weighted components');
assert(!(a.score===100&&a.components.some(c=>c.weight>0&&c.value<100)),'100 requires every weighted component to be 100');
assert(a.score<100,'the example hills score must not saturate at 100');

const b=shoeSuitabilityAssessment(nova4,hills,{projectedKm:306,retireKm:800});
assert(a.score>b.score,'the more suitable pair should rank higher for this hills context');

// Current-like 3-week programme: two owned pairs at 46 km and 298 km.
const pairs=[
 {name:'SUPERBLAST 3',p:superblast,km:46,retire:850},
 {name:'NOVABLAST 4',p:nova4,km:298,retire:800}
];
const sessions=[
 ['Hills',8.1],['Easy',7],['Long run',16],['Threshold',8],['Easy',7],
 ['Long run',18],['Hills',8],['Easy',6],['Race Day',42.2]
];
for(const [type,km] of sessions){
 const plan={type,distance:km,surface:'road'};
 const viable=pairs.filter(q=>q.km+km<=q.retire);
 assert(viable.length,'every session must have a feasible physical pair');
 const ranked=viable.map(q=>({q,a:shoeSuitabilityAssessment(q.p,plan,{projectedKm:q.km+km,retireKm:q.retire})})).sort((x,y)=>y.a.score-x.a.score);
 ranked[0].q.km+=km;
}
const racePair=pairs.map(q=>({q,a:shoeSuitabilityAssessment(q.p,{type:'Race Day',distance:42.2,surface:'road'},{projectedKm:q.km,retireKm:q.retire})})).filter(x=>x.q.km<250).sort((x,y)=>y.a.score-x.a.score)[0];
assert(racePair,'current-like state must finish with a sub-250 km race pair');
console.log(JSON.stringify({passed:4,failed:0,hillsSuperblast:a.score,hillsNovablast:b.score,finalKm:Object.fromEntries(pairs.map(q=>[q.name,Math.round(q.km*10)/10])),racePair:racePair.q.name},null,2));
