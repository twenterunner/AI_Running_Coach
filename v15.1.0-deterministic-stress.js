'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),performance=require('perf_hooks').performance;
const app=fs.readFileSync(__dirname+'/app.js','utf8');
function extract(name){const start=app.indexOf('function '+name);if(start<0)throw Error(name);let par=0,b=-1;for(let i=app.indexOf('(',start);i<app.length;i++){if(app[i]==='(')par++;else if(app[i]===')'&&--par===0){b=app.indexOf('{',i);break}}let d=0;for(let i=b;i<app.length;i++){if(app[i]==='{')d++;else if(app[i]==='}'&&--d===0)return app.slice(start,i+1)}throw Error('brace')}
const ctx={
 console,Map,Set,Math,Number,String,Boolean,Object,Array,Date,
 SESSION_SHOE_RULES:{safeWorkoutFitFloor:50,safeSuitabilityFloor:50,weeklyMinimumShare:.25},
 shoeEngineWeekKey:d=>d.slice(0,7)+'-'+Math.floor((Number(d.slice(8,10))-1)/7),
 shoeEngineIsAvailable:(p,d)=>d>=p.availableDate,
 lifecycleWorkoutFit:(profile,plan)=>profile.fit[plan.kind]||60,
 shoeSuitabilityAssessment:(profile,plan)=>({score:profile.score[plan.kind]||60}),
 shoeEngineSessionImportance:p=>p.importance||50,
 iso:d=>d.toISOString().slice(0,10),dte:s=>new Date(s+'T00:00:00Z'),DAY:86400000,
 shoeEngineMoveAssignment:()=>true,lifecyclePairLabel:p=>p.id
};
vm.createContext(ctx);
vm.runInContext(app.match(/const SHOE_BEAM_CONFIG=Object\.freeze\(\{[^;]+;/)[0],ctx);
for(const n of ['shoeEngineBeamLexCompare','shoeEngineBeamWindowObjective','shoeEngineBeamOptimizeRows'])vm.runInContext(extract(n),ctx);
let seed=15100;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function scenario(k){
 const kinds=['easy','quality','long'],pairs=[];
 for(let i=0;i<2+Math.floor(rnd()*4);i++){const score={},fit={};for(const kind of kinds){score[kind]=55+Math.floor(rnd()*45);fit[kind]=55+Math.floor(rnd()*45)}pairs.push({id:'p'+i,owned:true,currentKm:Math.floor(rnd()*300),retireKm:650+Math.floor(rnd()*350),availableDate:'2026-08-01',role:'owned',profile:{score,fit},assignments:[]})}
 const allSessions=[],assignments=[];let day=1;
 for(let i=0;i<15+Math.floor(rnd()*35);i++){day+=1+Math.floor(rnd()*3);const dt=new Date(Date.UTC(2026,7,day)),date=dt.toISOString().slice(0,10),kind=kinds[Math.floor(rnd()*kinds.length)],km=4+Math.floor(rnd()*20),plan={id:'s'+i,date,type:kind,distance:km,kind,importance:kind==='quality'?92:kind==='long'?86:46};allSessions.push(plan);assignments.push({planId:plan.id,date,type:kind,km,pairId:pairs[0].id,rehab:false})}
 return {pairs,allSessions,assignments,racePair:null};
}
const t0=performance.now();let feasible=0,deterministic=0,overflow=0,crash=0,totalStates=0;
for(let k=0;k<500;k++){try{const r=scenario(k),rows=r.assignments;const a=ctx.shoeEngineBeamOptimizeRows(r,rows,{apply:false}),b=ctx.shoeEngineBeamOptimizeRows(r,rows,{apply:false});if(a.feasible){feasible++;assert.deepStrictEqual([...a.choices],[...b.choices]);assert.deepStrictEqual(a.objective,b.objective);deterministic++;totalStates+=a.statesExplored;const used=new Map();for(const [sid,pid] of a.choices){const row=rows.find(x=>x.planId===sid);used.set(pid,(used.get(pid)||0)+row.km)}for(const p of r.pairs)if((p.currentKm||0)+(used.get(p.id)||0)>p.retireKm+1e-6)overflow++}}catch(e){crash++}}
const ms=performance.now()-t0;
console.log(JSON.stringify({seed:15100,scenarios:500,feasible,deterministic,overflow,crash,elapsedMs:+ms.toFixed(1),avgStates:feasible?Math.round(totalStates/feasible):0}));
if(overflow||crash||deterministic!==feasible)process.exit(1);
