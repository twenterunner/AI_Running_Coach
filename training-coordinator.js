/* AI Running Coach coordinated optimizer 1.0.0. Bounded rules, not outcome-validated predictions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ARCTrainingCoordinator=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='1.1.0';
const QUALITY=new Set(['Tempo','Intervals','Threshold','Threshold intervals','VO₂max intervals','Race-pace intervals','Hills','Fartlek','Marathon-specific','Half-marathon-specific','Specific long run','Race rehearsal','Fitness assessment','Repetition']);
const LONG=new Set(['Long run','Specific long run','Race rehearsal','Progression']);
const clone=x=>JSON.parse(JSON.stringify(x));
const num=x=>typeof x!=='boolean'&&x!==null&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const t=Date.parse(v+'T12:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===v;};
const day=v=>Date.parse(v+'T12:00:00Z')/86400000;
const round=x=>Math.round(x*10)/10;
function config(value={}){
 if(!value||typeof value!=='object')throw Error('Invalid coordinator settings');
 const mode=value.mode===undefined?'shadow':value.mode;
 if(!['off','shadow','active'].includes(mode))throw Error('Invalid coordinator mode');
 // Only the optimizer mode is user configured. Previous stored sports/talk-test/LT1 inputs are deliberately ignored.
 return{version:2,mode};
}
function locked(p,c){return p.date<c.now||p.date<=c.freezeThrough||(c.lockedIds||[]).includes(p.id)||p.type==='Race Day'||p.programPauseId||p.pauseReentry;}
function weekTotals(plan){const m=new Map();for(const p of plan)if(p.type!=='Race Day')m.set(p.week,(m.get(p.week)||0)+(Number(p.distance)||0));return m;}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function invariantErrors(base,candidate,c){
 const errors=[];
 if(!Array.isArray(candidate)||candidate.length!==base.length)return ['Session count changed'];
 const byId=new Map(base.map(x=>[x.id,x])),seen=new Set(),limits=weekTotals(base),totals=weekTotals(candidate);
 for(const p of candidate){
  if(!p||typeof p!=='object'||!byId.has(p.id)){errors.push('Unknown session');continue;}
  const original=byId.get(p.id);
  if(seen.has(p.id))errors.push('Duplicate session');seen.add(p.id);
  if(locked(original,c)&&!same(original,p))errors.push('Locked history, race, pause or override changed');
  if(p.date!==original.date||p.week!==original.week||p.day!==original.day)errors.push('Calendar assignment changed');
  if(p.factor!==original.factor)errors.push('Existing load factor changed');
  if(!date(p.date)||num(p.distance)===null||p.distance<0||p.distance>300)errors.push('Invalid distance');
  if(original.type==='Rest'&&p.type!=='Rest')errors.push('Rest day populated');
  if(p.type==='Rest'&&p.distance!==0)errors.push('Rest must have zero distance');
  if(LONG.has(original.type)&&p.distance>original.distance+.001)errors.push('Long-run ceiling exceeded');
  if(p.distance>original.distance+.001)errors.push('Single-session load authority exceeded');
  if(!same(original,p)&&p.type!=='Rest'){
   const z=p.zone,parts=['warmDistance','mainDistance','coolDistance'].map(k=>num(p[k]));
   if(!z||![z.pace,z.hr,z.power].every(x=>num(x)>0))errors.push('Missing calibrated targets');
   if(typeof c.targetsFor==='function'){const expected=c.targetsFor(p.type,p.date);if(!z||['pace','hr','power'].some(k=>z[k]!==expected[k]))errors.push('Pace / Power authority changed');}
   if(parts.some(x=>x===null||x<0)||Math.abs(parts.reduce((s,x)=>s+x,0)-p.distance)>.11)errors.push('Prescription components do not match total');
   if(p.distance>0&&p.distance<1)errors.push('Sub-minimum running session');
   if(QUALITY.has(p.type)&&p.type!==original.type){
    const otherHard=candidate.some(x=>x.id!==p.id&&QUALITY.has(x.type)&&Math.abs(day(x.date)-day(p.date))<2);
    if(otherHard)errors.push('New hard session conflicts with another hard session');
    if(c.recovery!=='Normal'||c.activeInjury)errors.push('New quality prohibited by recovery constraints');
   }
  }
 }
 for(const [w,km]of totals)if(km>(limits.get(w)||0)+.11)errors.push('Existing weekly load budget exceeded');
 return [...new Set(errors)];
}
function eligible(p,c){return !locked(p,c)&&p.date>c.freezeThrough&&p.date>=c.now&&day(p.date)-day(c.now)<=28&&p.type!=='Rest'&&p.phase!=='Taper';}
function materialize(base,replacements,c){
 const out=base.map(p=>{
  const change=replacements.find(x=>x.id===p.id);if(!change)return p;
  if(typeof c.materialize!=='function')throw Error('Prescription adapter is unavailable');
  const q=c.materialize(clone(p),change.type,change.distance);
  if(!q||typeof q!=='object')throw Error('Prescription adapter returned no session');
  q.id=p.id;q.week=p.week;q.date=p.date;q.day=p.day;
  // Stable IDs preserve existing plan links and explicitly chosen shoes.
  q.trainingCoordinator={version:1,baselineType:p.type,baselineDistance:p.distance,
   reduced:change.type==='Rest'||(!QUALITY.has(change.type)&&(QUALITY.has(p.type)||['Medium-long','Steady aerobic','Progression'].includes(p.type)))||q.distance<p.distance-.05,
   reason:change.reason,evidenceThrough:c.evidenceThrough,baselineId:p.id};
  return q;
 });
 const errors=invariantErrors(base,out,c);if(errors.length)throw Error(errors.join('; '));return out;
}
function coordinate(base,context={}){
 const report={version:1,engineVersion:VERSION,status:'fallback',mode:'off',applied:false,selected:'Keep existing programme',changes:[],alternatives:[],reason:'',modelNote:'Transparent policy ranking; not a causal model, predicted fitness gain, or calibrated probability.'};
 try{
  const cfg=config(context.config),c={...context,config:cfg};report.mode=cfg.mode;
  if(!Array.isArray(base)||base.some(p=>!p||!date(p.date)||!p.id||num(p.distance)===null))throw Error('Malformed baseline plan');
  if(!date(c.now)||!date(c.evidenceThrough)||!date(c.freezeThrough)||c.evidenceThrough>=c.now||c.freezeThrough<c.now)throw Error('Decision dates must exclude future or same-day training evidence');
  if(new Set(base.map(p=>p.id)).size!==base.length)throw Error('Duplicate baseline session IDs');
  report.evidenceThrough=c.evidenceThrough;
  if(cfg.mode==='off'||c.adaptiveEnabled===false){report.status='off';report.reason='Legacy planning is authoritative; optimizer disabled';return{plan:base,report};}
  if(base.some(p=>p.trainingCoordinator&&p.trainingCoordinator.evidenceThrough===c.evidenceThrough&&!locked(p,c))){report.status='held';report.reason='This decision was already materialized; no repeated adjustment';return{plan:base,report};}
  if(c.activeInjury){report.status='held';report.reason='Active rehabilitation remains authoritative; no optimizer changes';return{plan:base,report};}
  const candidates=[{name:'Keep existing programme',score:0,changes:[],reason:'Reference plan'}];
  const next=base.filter(p=>eligible(p,c));
  const guard=next.filter(p=>(QUALITY.has(p.type)||['Medium-long','Steady aerobic','Progression'].includes(p.type))&&((c.recovery!=='Normal'&&day(p.date)-day(c.now)<=7))).map(p=>({id:p.id,type:LONG.has(p.type)?'Long run':'Easy',distance:p.distance,reason:'Replace quality while recovery is reduced; existing volume modifier is not applied twice'}));
  if(guard.length)candidates.push({name:'Protect recovery',score:100,changes:guard,reason:'Safety takes precedence; no additional HRV or pain multiplier'});
  const evidence=c.dose;
  const coverage=evidence&&evidence.hr&&evidence.hr.classifiedCoverage;
  const measured=!!evidence&&evidence.distinctMeasuredDays>=6&&coverage>=.8&&evidence.totalSeconds>0;
  const moderateShare=measured?evidence.hr.seconds.moderate/evidence.totalSeconds:null;
  const response=c.response||{};
  const adequateResponse=response.qualifyingDays>=6&&response.spanDays>=28&&response.comparable===true;
  if(measured&&adequateResponse&&moderateShare>.35&&response.efficiencyChange<=.01){
   const changes=next.filter(p=>['Steady aerobic','Medium-long'].includes(p.type)).map(p=>({id:p.id,type:'Easy',distance:p.distance,reason:'High measured moderate exposure with no clear comparable-run efficiency improvement; preserve volume and the key marathon session'}));
   if(changes.length)candidates.push({name:'Emphasize easy aerobic work',score:40,changes,reason:'Conservative redistribution, not a universal intensity ratio target'});
  }
  // A development alternative is deliberately gated behind repeated comparable evidence.
  if((measured||evidence&&evidence.distinctMeasuredDays>=6&&evidence.power.classifiedCoverage>=.9)&&adequateResponse&&response.spanDays>=56&&Math.abs(response.efficiencyChange)<=.01&&c.recovery==='Normal'&&num(c.recentMaxPain)===0){
   const first=next.find(p=>['Threshold','Threshold intervals'].includes(p.type)&&['Aerobic','Endurance','Development'].includes(p.detailedPhase));
   if(first)candidates.push({name:'Controlled aerobic-power development',score:20,changes:[{id:first.id,type:'VO₂max intervals',distance:first.distance,reason:'One quality-session substitution within the existing distance and calibrated power envelope; no extra hard day'}],reason:'Rule-based development option; benefit remains uncertain'});
  }
  for(const x of candidates){
   try{x.plan=x.changes.length?materialize(base,x.changes,c):base;x.accepted=true;}
   catch(e){x.accepted=false;x.rejection=String(e.message||e).slice(0,250);}
   report.alternatives.push({name:x.name,accepted:x.accepted,reason:x.reason,rejection:x.rejection||null});
  }
  const winner=candidates.filter(x=>x.accepted).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name))[0];
  if(!winner)throw Error('No feasible plan');
  report.status=winner.changes.length?'recommended':'held';report.selected=winner.name;report.changes=winner.changes.map(change=>({...change,date:base.find(p=>p.id===change.id)?.date,baselineType:base.find(p=>p.id===change.id)?.type}));
  report.reason=winner.changes.length?winner.reason:measured?'No sufficiently supported change; keep the established plan':'Insufficient trustworthy three-zone evidence; no performance-based escalation';
  report.evidenceThrough=c.evidenceThrough;report.weeklyBudgets=Object.fromEntries(weekTotals(base));
  report.applied=cfg.mode==='active'&&winner.changes.length>0;
  return{plan:report.applied?winner.plan:base,report};
 }catch(e){report.reason=String(e.message||e).slice(0,250);return{plan:base,report};}
}
function compareResponse(runs,asOf){
 if(!date(asOf))return{qualifyingDays:0,spanDays:0,comparable:false};
 const rows=(Array.isArray(runs)?runs:[]).filter(r=>r&&date(r.date)&&r.date<=asOf&&day(asOf)-day(r.date)<=84&&r.aerobicFitnessEvidence&&r.aerobicFitnessEvidence.terrainVerified===true&&num(r.pain)===0&&
   ['Easy','Recovery','Steady aerobic','Medium-long','Long run'].includes(r.type)&&
   num(r.aerobicFitnessEvidence.durationSec)>=600&&num(r.aerobicFitnessEvidence.hrCoverage)>=.92&&
   num(r.aerobicFitnessEvidence.quality)>=.55&&num(r.aerobicFitnessEvidence.speedVariation)!==null&&
   r.aerobicFitnessEvidence.speedVariation<=.125&&num(r.aerobicFitnessEvidence.hrDrift)!==null&&Math.abs(r.aerobicFitnessEvidence.hrDrift)<=12)
  .map(r=>({date:r.date,hr:num(r.aerobicFitnessEvidence.avgHr),speed:num(r.aerobicFitnessEvidence.speedMps)}))
  .filter(r=>r.hr>=100&&r.hr<=190&&r.speed>0).sort((a,b)=>a.date.localeCompare(b.date));
 const byDay=[...new Map(rows.map(r=>[r.date,r])).values()];
 if(byDay.length<6)return{qualifyingDays:byDay.length,spanDays:0,comparable:false};
 const first=byDay.slice(0,3),last=byDay.slice(-3),mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
 const h1=mean(first.map(r=>r.hr)),h2=mean(last.map(r=>r.hr));
 const span=day(last.at(-1).date)-day(first[0].date);
 return{qualifyingDays:byDay.length,spanDays:span,comparable:Math.abs(h1-h2)<=5&&span>=28,
  efficiencyChange:mean(last.map(r=>r.speed/r.hr))/mean(first.map(r=>r.speed/r.hr))-1,
  note:'Within-runner association from matched HR and verified terrain, not proof of treatment effect'};
}
return Object.freeze({VERSION,config,coordinate,invariantErrors,compareResponse,QUALITY,LONG});
});
