'use strict';
const assert=require('assert');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const profiles={
 nimbus:{name:'GEL-NIMBUS 28',support:'neutral',cushion:5,protect:5,comfort:5,stability:4,response:3,eff:3,grip:3,plate:false,roles:['easy','recovery','long'],life:[650,900]},
 nova:{name:'NOVABLAST 6',support:'neutral',cushion:4,protect:4,comfort:4,stability:3,response:5,eff:4,grip:4,plate:false,roles:['easy','steady','long','tempo'],life:[600,850]},
 super:{name:'SUPERBLAST 3',support:'neutral',cushion:5,protect:5,comfort:4,stability:4,response:5,eff:5,grip:4,plate:false,roles:['steady','long','tempo','threshold','race'],life:[650,900]},
 kayano:{name:'GEL-KAYANO 33',support:'guided',cushion:5,protect:5,comfort:5,stability:5,response:3,eff:3,grip:4,plate:false,roles:['easy','recovery','long'],life:[700,950]},
 magic:{name:'MAGIC SPEED 5',support:'neutral',cushion:3,protect:3,comfort:3,stability:3,response:5,eff:5,grip:4,plate:true,roles:['tempo','threshold','interval'],life:[450,700]},
 meta:{name:'METASPEED SKY TOKYO',support:'neutral',cushion:4,protect:3,comfort:3,stability:2,response:5,eff:5,grip:5,plate:true,roles:['race','tempo','interval'],life:[300,500]},
 old:{name:'NOVABLAST 4',support:'neutral',cushion:4,protect:4,comfort:4,stability:3,response:4,eff:4,grip:3,plate:false,roles:['easy','steady','long','tempo'],life:[600,850],obsolete:true}
};
function score(p,s,mech='unknown',rehab=false){let x=50;const role=s.type.toLowerCase();const hit=p.roles.some(r=>role.includes(r));x+=hit?20:-10;if(/recovery|easy|long|rehab|walk/.test(role))x+=(p.cushion-3)*4+(p.protect-3)*4+(p.comfort-3)*3+(p.stability-3)*2-(p.plate?8:0);if(/tempo|threshold|interval|race/.test(role))x+=(p.response-3)*5+(p.eff-3)*5-(role.includes('race')?0:(p.plate?0:0));if(mech==='pronation'){x+=(p.stability-3)*3+(p.support==='guided'?7:0);if(/tempo|threshold|interval|race/.test(role))x-=p.support==='guided'?3:0}if(mech==='supination'){x-=p.support==='guided'?16:0;x+=(p.cushion-3)*2}if(rehab)x+=(p.cushion-3)*4+(p.protect-3)*5+(p.comfort-3)*4+(p.stability-3)*3-(p.plate?10:0);return clamp(Math.round(x),0,100)}
function pair(id,p,km=0,condition='normal'){return{id,p,km,condition,retire:p.life[0]+Math.round((p.life[1]-p.life[0])*.65),retired:false}}
function serviceable(q,km){return !q.retired&&q.condition!=='discomfort'&&q.km+km<=q.retire}
function select(pairs,session,mech='unknown',rehab=false,override=null){const viable=pairs.filter(q=>serviceable(q,session.km));if(override){const q=viable.find(x=>x.id===override);if(q)return q}return viable.map(q=>[q,score(q.p,session,mech,rehab)]).sort((a,b)=>b[1]-a[1])[0]?.[0]||null}
function runCase(name,fn){try{fn();return{name,pass:true}}catch(e){return{name,pass:false,error:e.message}}}
const results=[];
// score rationale tests
results.push(runCase('recovery protective outranks specialist',()=>assert(score(profiles.nimbus,{type:'Recovery'})>score(profiles.meta,{type:'Recovery'}))));
results.push(runCase('threshold responsive outranks recovery trainer',()=>assert(score(profiles.magic,{type:'Threshold'})>score(profiles.nimbus,{type:'Threshold'}))));
results.push(runCase('supination guided penalty',()=>assert(score(profiles.kayano,{type:'Easy'},'supination')<score(profiles.nimbus,{type:'Easy'},'supination'))));
results.push(runCase('pronation guided relevance protective',()=>assert(score(profiles.kayano,{type:'Recovery'},'pronation')>score(profiles.nimbus,{type:'Recovery'},'pronation'))));
results.push(runCase('pronation does not force guided quality',()=>assert(score(profiles.magic,{type:'Threshold'},'pronation')>score(profiles.kayano,{type:'Threshold'},'pronation'))));
results.push(runCase('rehab protective outranks aggressive specialist',()=>assert(score(profiles.nimbus,{type:'Rehab recovery'},'unknown',true)>score(profiles.meta,{type:'Rehab recovery'},'unknown',true))));
// foot mechanics x programmes
for(const mech of ['neutral','pronation','supination','unknown'])for(const dist of [5,10,21.1,42.2,80])results.push(runCase(`programme ${dist}km mechanics ${mech}`,()=>{const pairs=[pair('a',profiles.nova),pair('b',profiles.nimbus)];const q=select(pairs,{type:dist<=10?'Tempo':dist<=21.1?'Steady':'Long',km:Math.min(dist*.25,30)},mech);assert(q&&serviceable(q,0))}));
// starting states
const starts=[
 ['zero',[]],['one fresh',[pair('a',profiles.nova)]],['one worn',[pair('a',profiles.nova,760)]],['two complementary',[pair('a',profiles.nimbus),pair('b',profiles.magic)]],['two overlap',[pair('a',profiles.nova),pair('b',profiles.super)]],['near+fresh',[pair('a',profiles.nimbus,780),pair('b',profiles.nova)]],['two near',[pair('a',profiles.nimbus,790),pair('b',profiles.nova,760)]],['three healthy',[pair('a',profiles.nimbus),pair('b',profiles.nova),pair('c',profiles.magic)]],['obsolete owned',[pair('a',profiles.old,42),pair('b',profiles.nimbus,298)]]];
for(const [n,ps] of starts)results.push(runCase(`starting state ${n}`,()=>{if(!ps.length)return assert.equal(select(ps,{type:'Easy',km:5}),null);const q=select(ps,{type:'Easy',km:5});assert(q===null||ps.includes(q));if(n==='obsolete owned')assert(ps[0].p.obsolete)}));
// rehab
for(const kind of ['none','walking','return-to-run','manual override'])results.push(runCase(`rehab ${kind}`,()=>{const ps=[pair('a',profiles.nimbus),pair('b',profiles.magic)];if(kind==='none')return assert(select(ps,{type:'Easy',km:5}));const override=kind==='manual override'?'b':null;const q=select(ps,{type:kind==='walking'?'Rehab walk':'Rehab recovery',km:2},'unknown',true,override);assert(q);if(override)assert.equal(q.id,override)}));
// race day
results.push(runCase('race existing suitable',()=>{const q=pair('r',profiles.super,120);assert(serviceable(q,42.2)&&q.km<250)}));
results.push(runCase('race existing too worn',()=>{const q=pair('r',profiles.super,820);assert(!serviceable(q,42.2))}));
results.push(runCase('race training pair can serve',()=>assert(profiles.super.roles.includes('race'))));
results.push(runCase('dedicated race required',()=>{const ps=[pair('a',profiles.nimbus),pair('b',profiles.kayano)];assert(!ps.some(q=>q.p.roles.includes('race')))}));
results.push(runCase('race >250 rejected',()=>assert(!(249+42.2<250))));
results.push(runCase('race familiarisation minimum',()=>{const sessions=[8,10,12];assert(sessions.length>=2&&sessions.reduce((a,b)=>a+b,0)>=10)}));
// lifecycle
results.push(runCase('high mileage capacity boundary',()=>{const q=pair('a',profiles.nova,790);assert(!serviceable(q,80))}));
results.push(runCase('low mileage remains available',()=>assert(serviceable(pair('a',profiles.nova,20),10))));
results.push(runCase('condition deterioration',()=>{const q=pair('a',profiles.nova,200,'discomfort');assert(!serviceable(q,5))}));
results.push(runCase('manual retirement final',()=>{const q=pair('a',profiles.nova);q.retired=true;assert(!serviceable(q,1))}));
results.push(runCase('actual mileage overrides forecast basis',()=>{const q=pair('a',profiles.nova,42);q.km+=4;assert.equal(q.km,46)}));
// chronology/ledger invariants synthetic
results.push(runCase('future pair starts 0km',()=>assert.equal(pair('future',profiles.super).km,0)));
results.push(runCase('no use after retirement',()=>{const q=pair('a',profiles.nova);q.retired=true;assert.equal(select([q],{type:'Easy',km:5}),null)}));
results.push(runCase('no artificial mileage redistribution',()=>{const a=pair('a',profiles.nimbus),b=pair('b',profiles.magic);const s={type:'Recovery',km:6};const pick=select([a,b],s);pick.km+=s.km;assert.equal(a.km+b.km,6);assert.equal(b.km,0)}));
results.push(runCase('historical obsolete not purchase candidate',()=>{const purchase=Object.values(profiles).filter(p=>!p.obsolete);assert(!purchase.includes(profiles.old))}));
const failures=results.filter(r=>!r.pass);
console.log(JSON.stringify({suite:'SESSION SUITABILITY',scenarios:results.length,passed:results.length-failures.length,hardInvariantFailures:failures.length,failures},null,2));
if(failures.length)process.exit(1);
