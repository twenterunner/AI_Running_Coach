/* AI Running Coach LT1 evidence v1.1 — offline, observational, NOT laboratory VT1. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ARCTrainingLT1=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='1.1.0';
const finite=x=>x!==null&&x!==undefined&&x!==''&&typeof x!=='boolean'&&Number.isFinite(Number(x));
const n=x=>finite(x)?Number(x):null;
const date=x=>{if(typeof x!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x))return false;const d=new Date(x+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;};
const day=x=>Date.parse(x+'T12:00:00Z')/86400000;
const mean=x=>x.reduce((s,v)=>s+v,0)/Math.max(1,x.length);
const avg=(rows,key)=>{const vals=rows.map(x=>n(x[key])).filter(Number.isFinite);return vals.length?mean(vals):null;};
const sd=x=>{const m=mean(x);return Math.sqrt(mean(x.map(v=>(v-m)**2)));};
const acceptedTypes=new Set(['Easy','Recovery','Long run','Steady aerobic','Medium-long','Progression','Specific long run']);
const mixedTypes=new Set(['Hills','Hill repeats','Easy + strides','Strides','Fartlek']);
const qualityTypes=new Set(['Intervals','Threshold intervals','Tempo','VO₂max intervals','Repetition']);
const quality=run=>qualityTypes.has(run?.type);
const hills=run=>['Hills','Hill repeats'].includes(run?.type);
const mixed=run=>mixedTypes.has(run?.type)||quality(run);
function invalidReason(run,opts={}){
 if(!run||!date(run.date))return 'Invalid or missing run date';
 if(finite(run.pain)&&Number(run.pain)>=3)return 'Pain at or above 3/10: unsuitable for automatic LT1 estimation';
 if(finite(run.rpe)&&Number(run.rpe)>6)return 'High perceived exertion: not a low-cost aerobic observation';
 if(!acceptedTypes.has(run.type)&&!mixed(run))return 'Workout type not supported for steady aerobic observations';
 if(quality(run)&&!(n(opts.lt2Hr)>=100&&n(opts.lt2Hr)<=225))return 'Quality workout: a dated LT2 reference is needed before using steady sections';
 return null;
}
const empty=(method,reason)=>({version:1,method,status:'unavailable',reason,hr:null,driftPct:null,seconds:0,coverage:0,terrainVerified:false});
function preparedRecords(run,records){
 const raw=records.filter(r=>r&&finite(r.t)).map(r=>({t:n(r.t),hr:n(r.hr),power:n(r.power),speed:n(r.speed),altitude:n(r.altitude)})).sort((a,b)=>a.t-b.t);
 const rows=[];
 for(const p of raw){if(rows.length&&p.t===rows.at(-1).t){const q=rows.at(-1);for(const k of ['hr','power','speed','altitude'])if(q[k]!==p[k])q[k]=null;}else rows.push(p);}
 // Explicit FIT timer stops may not be evident as timestamp gaps: never join across them.
 const events=(Array.isArray(run.trainingTimerEvents)?run.trainingTimerEvents:[]).filter(e=>e&&finite(e.t)&&['start','stop'].includes(e.type)).map(e=>({t:n(e.t),type:e.type})).sort((a,b)=>a.t-b.t);
 if(!events.length)return{rows,breaks:new Set()};
 const active=[];const breaks=new Set();let on=true,k=0,hadBreak=false;
 for(const p of rows){
  while(k<events.length&&events[k].t<=p.t){on=events[k].type==='start';hadBreak=true;k++;}
  if(!on)continue;
  if(hadBreak&&active.length)breaks.add(active.length);hadBreak=false;
  active.push(p);
 }
 return{rows:active,breaks};
}
function evaluateWindow(run,rows,wholeStart,wholeEnd,opts={}){
 const elapsed=rows.at(-1).t-rows[0].t;
 if(elapsed<1200||rows.length<200)return empty('second-by-second HR','Need at least 20 continuous minutes of recorded running');
 const warm=Math.min(480,elapsed*.18);
 const work=rows.filter(r=>r.t>=rows[0].t+warm);
 if(work.length<150)return empty('second-by-second HR','Insufficient recorded HR after warm-up');
 const span=work.at(-1).t-work[0].t;
 if(span<850)return empty('second-by-second HR','Insufficient steady duration after warm-up');
 let covered=0,hrCovered=0,powerCovered=0,speedCovered=0,altCovered=0,altMin=Infinity,altMax=-Infinity,ascent=0,descent=0,previousAltitude=null;
 for(let i=0;i<work.length-1;i++){
  const a=work[i],b=work[i+1],dt=b.t-a.t;if(dt<=0||dt>6)continue;covered+=dt;
  if(a.hr>=80&&a.hr<=210)hrCovered+=dt;
  if(a.power>=60&&a.power<=650)powerCovered+=dt;
  if(a.speed>=1.5&&a.speed<=6.5)speedCovered+=dt;
  if(a.altitude!==null&&a.altitude>-500&&a.altitude<6000){
   altCovered+=dt;altMin=Math.min(altMin,a.altitude);altMax=Math.max(altMax,a.altitude);
   if(previousAltitude!==null){const climb=a.altitude-previousAltitude;if(climb>0)ascent+=climb;else descent-=climb;}
   previousAltitude=a.altitude;
  }else previousAltitude=null;
 }
 const coverage=hrCovered/Math.max(1,span);
 if(coverage<.90||covered/span<.96)return empty('second-by-second HR','HR sample gaps or insufficient coverage in steady section');
 const terrainVerified=altCovered/span>=.85;
 const speedVals=work.map(r=>r.speed).filter(x=>x>=1.5&&x<=6.5),powerVals=work.map(r=>r.power).filter(x=>x>=60&&x<=650);
 const speedOk=speedCovered/span>=.90&&speedVals.length>100&&sd(speedVals)/mean(speedVals)<.14;
 const powerOk=powerCovered/span>=.90&&powerVals.length>100&&sd(powerVals)/mean(powerVals)<.16&&!/proportional alignment/i.test(run.powerDiagnostics?.mapping||'');
 if(!speedOk&&!powerOk)return empty('second-by-second HR','No reliable, suitably steady speed/power reference in this section');
 // A hills workout must have terrain evidence; do not misread climbs as HR drift.
 if(hills(run)&&!terrainVerified)return empty('second-by-second HR','Hill workout lacks enough recorded elevation to verify a level section');
 if(terrainVerified){
  const range=altMax-altMin,rangeLimit=hills(run)?12:Math.max(20,Number(run.distanceKm||0)*3);
  if(range>rangeLimit||(hills(run)&&(ascent>18||descent>18)))return empty('second-by-second HR','Terrain variation makes aerobic drift ambiguous in this section');
 }
 const mid=work[0].t+span/2,first=work.filter(r=>r.t<mid),second=work.filter(r=>r.t>=mid);
 const h1=avg(first.filter(r=>r.hr>=80&&r.hr<=210),'hr'),h2=avg(second.filter(r=>r.hr>=80&&r.hr<=210),'hr');
 if(!(h1>80&&h2>80))return empty('second-by-second HR','Invalid HR halves');
 const key=powerOk?'power':'speed',e1=avg(first.filter(r=>r[key]>0),key),e2=avg(second.filter(r=>r[key]>0),key);
 if(!(e1>0&&e2>0)||Math.abs(e2/e1-1)>.07)return empty('second-by-second HR','External intensity was not stable across halves');
 if(mixed(run)){
  const threshold=n(opts.lt2Hr),high=work.map(r=>r.hr).filter(x=>x>=80&&x<=210);
  // Short quality surges and threshold running must not become LT1 training evidence.
  if(quality(run)&&!(threshold>=100&&threshold<=225))return empty('second-by-second HR','Quality section needs dated LT2');
  if(threshold!==null&&!(mean(high)<threshold-10&&high.filter(x=>x>=threshold-5).length/high.length<.05))return empty('second-by-second HR','Steady section too close to LT2 to support an aerobic LT1 observation');
 }
 const drift=100*((h2/e2)/(h1/e1)-1),hr=mean([h1,h2]);
 if(!Number.isFinite(drift)||drift< -6||drift>22)return empty('second-by-second HR','Confounded or implausible aerobic drift');
 const partial=rows[0].t>wholeStart+30||rows.at(-1).t<wholeEnd-30;
 return {version:1,method:'second-by-second HR',status:'observed',hr:Math.round(hr*10)/10,
  driftPct:Math.round(drift*100)/100,seconds:Math.round(span),coverage:Math.round(coverage*1000)/1000,
  terrainVerified,effortSource:key,confidence:terrainVerified?'supporting':'limited',partial,
  observedSection:{startOffsetSec:Math.round(rows[0].t-wholeStart),endOffsetSec:Math.round(rows.at(-1).t-wholeStart),elapsedSec:Math.round(elapsed)},
  observedRunType:run.type,qualityVerified:quality(run)?true:false,lt2AtObservation:quality(run)?n(opts.lt2Hr):null,
  reason:partial?'Steady section selected; remaining workout is not used as LT1 evidence':'Stable external intensity with recorded cardiac response; NOT a direct LT1 test',
  activity:{date:run.date,durationSec:n(run.durationSec),distanceKm:n(run.distanceKm)} };
}
function summarize(run,records,opts={}){
 try{
  const wrong=invalidReason(run,opts);if(wrong)return empty('second-by-second HR',wrong);
  if(!Array.isArray(records)||records.length<200||records.length>400000)return empty('second-by-second HR','Insufficient recorded samples');
  const{rows,breaks}=preparedRecords(run,records);
  if(rows.length<200)return empty('second-by-second HR','Too few distinct active timestamps');
  const chunks=[];let start=0;
  for(let i=1;i<=rows.length;i++){
   if(i===rows.length||rows[i].t-rows[i-1].t>6||breaks.has(i)){
    if(i-start>=200&&rows[i-1].t-rows[start].t>=1200)chunks.push(rows.slice(start,i));start=i;
   }
  }
  if(!chunks.length)return empty('second-by-second HR','Need at least 20 continuous minutes of recorded running');
  chunks.sort((a,b)=>(b.at(-1).t-b[0].t)-(a.at(-1).t-a[0].t));
  const wholeStart=rows[0].t,wholeEnd=rows.at(-1).t;
  let bestReason='No reliable steady section';let best=null;let attempts=0;
  // Score the whole continuous block first, then fixed-time windows for hills/strides/intervals.
  // Never interpolate missing HR, infer gaps, or average together disconnected sections.
  for(const chunk of chunks){
   const duration=chunk.at(-1).t-chunk[0].t;
   const candidates=[[chunk[0].t,chunk.at(-1).t]];
   for(const length of (mixed(run)?[2400,1800,1320]:[])){
    if(duration<=length+120)continue;
    for(let at=chunk[0].t;at+length<=chunk.at(-1).t&&candidates.length<105;at+=300)candidates.push([at,at+length]);
    candidates.push([chunk.at(-1).t-length,chunk.at(-1).t]);
   }
   for(const[lo,hi]of candidates){
    if(++attempts>250)break;
    // The imported stream is already time-sorted. Restrict analysis to actual recorded windows.
    const section=lo===chunk[0].t&&hi===chunk.at(-1).t?chunk:chunk.filter(p=>p.t>=lo&&p.t<=hi);
    if(section.length<200||section.at(-1).t-section[0].t<1200)continue;
    const e=evaluateWindow(run,section,wholeStart,wholeEnd,opts);
    if(e.status==='observed'){
     if(!best||e.seconds>best.seconds||(e.seconds===best.seconds&&e.coverage>best.coverage))best=e;
     if(!e.partial)return e;
    }else if(e.reason&&bestReason==='No reliable steady section')bestReason=e.reason;
   }
   if(attempts>250)break;
  }
  if(best)return best;
  return empty('second-by-second HR',`No qualifying continuous steady section: ${bestReason}`);
 }catch(_){return empty('second-by-second HR','Analysis failed; no threshold inferred');}
}
function fromLaps(run){
 try{
  const reason=invalidReason(run);if(reason)return empty('archived lap HR',reason);
  if(hills(run))return empty('archived lap HR','Hills require recorded elevation to verify a level section; lap HR alone is insufficient');
  if(quality(run))return empty('archived lap HR','Quality-workout lap averages cannot verify a stable sub-LT2 section');
  const rows=(Array.isArray(run.fitLaps)?run.fitLaps:[]).filter(l=>l&&n(l.durationSec)>=90&&n(l.avgHr)>=80&&n(l.avgHr)<=210&&n(l.distanceKm)>.1).map(l=>({t:n(l.durationSec),hr:n(l.avgHr),power:n(l.avgPower),speed:n(l.distanceKm)*1000/n(l.durationSec)}));
  if(rows.length<5||rows.reduce((s,r)=>s+r.t,0)<1800)return empty('archived lap HR','Not enough usable archived laps for an observation');
  const weighted=(arr,k)=>arr.reduce((s,r)=>s+r.t*r[k],0)/arr.reduce((s,r)=>s+r.t,0);
  const windows=[rows.slice(1)];
  // Archived lap averages are weaker evidence; use only consecutive qualifying laps.
  if(rows.length>=7)for(let first=1;first<=rows.length-5;first++)for(let last=first+4;last<=rows.length;last++){
   if(last-first>=4)windows.push(rows.slice(first,last));
  }
  let best=null;
  for(const work of windows){
   const duration=work.reduce((s,r)=>s+r.t,0);if(duration<1200||work.length<4)continue;
   const half=Math.floor(work.length/2),a=work.slice(0,half),b=work.slice(half);
   const key=work.every(r=>r.power>=60&&r.power<=650)?'power':'speed';
   const eff=work.map(r=>r[key]),cv=sd(eff)/mean(eff);
   if(!(cv<=.12&&Math.abs(weighted(b,key)/weighted(a,key)-1)<=.07))continue;
   const drift=100*((weighted(b,'hr')/weighted(b,key))/(weighted(a,'hr')/weighted(a,key))-1);
   if(!(drift>=-6&&drift<=22))continue;
   const e={version:1,method:'archived lap HR',status:'observed',hr:Math.round(weighted(work,'hr')*10)/10,
    driftPct:Math.round(drift*100)/100,seconds:Math.round(duration),coverage:1,terrainVerified:false,
    effortSource:key,confidence:'limited',partial:work.length!==rows.length-1,
    reason:'Archived lap averages only; cannot establish the physiological LT1 boundary',
    activity:{date:run.date,durationSec:n(run.durationSec),distanceKm:n(run.distanceKm)}};
   if(!best||e.seconds>best.seconds)best=e;
  }
  return best||empty('archived lap HR','No consecutive stable, sufficiently long archived lap section');
 }catch(_){return empty('archived lap HR','Lap observation failed');}
}
function evidence(run,opts={}){
 const reason=invalidReason(run,opts);if(reason)return empty('unknown',reason);
 const e=run.lt1Evidence;
 const aligned=e?.version===1&&e.activity?.date===run.date&&e.activity?.durationSec===n(run.durationSec)&&e.activity?.distanceKm===n(run.distanceKm);
 if(aligned&&e.status==='observed'&&n(e.hr)>=80&&n(e.hr)<=210&&n(e.driftPct)>-6&&n(e.driftPct)<22){
  if(mixed(run)&&e.observedRunType!==run.type)return empty(e.method,'Workout type changed since this measurement was made; refresh evidence from the original FIT');
  if(hills(run)&&!e.terrainVerified)return empty(e.method,'Hills require terrain-verified steady HR evidence; stored evidence cannot verify this');
  if(quality(run)&&!(e.qualityVerified===true&&n(e.lt2AtObservation)>=100))return empty(e.method,'Quality session changed after import: re-import its FIT to verify a sub-LT2 steady section');
  if(mixed(run)&&n(opts.lt2Hr)>=100&&e.hr>=n(opts.lt2Hr)-10)return empty(e.method,'Stored steady-section HR is too close to LT2');
  return e;
 }
 const lap=fromLaps(run);
 if(lap.status==='observed')return lap;
 if(e?.status==='unavailable'&&(!e.activity||aligned)&&typeof e.reason==='string'){
  const legacyTypeOnly=mixed(run)&&/Workout type, pain or exertion excludes|Not an aerobic low-cost run/i.test(e.reason);
  return empty(e.method||'second-by-second HR',legacyTypeOnly?'Previous LT1 engine excluded this mixed workout by name before checking steady sections; refresh from the original FIT to analyse it.':e.reason);
 }
 if(!e&&!(run.fitLaps||[]).length)return empty('unavailable','No retained per-second LT1 analysis or usable FIT laps; re-import the original FIT to evaluate steady segments');
 return lap;
}
function estimate(runs,asOf,lt2){
 const out={version:1,engineVersion:VERSION,status:'building',hr:null,range:null,confidence:'insufficient',method:'aerobic HR-decoupling proxy',days:0,streamDays:0,archivedDays:0,stableDays:0,elevatedDays:0,spanDays:0,reason:'',source:'Recorded steady HR plus pace/power response; NOT laboratory LT1',observations:[],reviewed:[],reviewedCount:0};
 try{
  if(!date(asOf))return {...out,reason:'Valid observation cutoff unavailable'};
  const lookback=day(asOf)-91,byDay=new Map();
  const current=(Array.isArray(runs)?runs:[]).filter(r=>r&&date(r.date)&&r.date<=asOf&&day(r.date)>=lookback).slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.id||'').localeCompare(String(b.id||'')));
  for(const r of current){
   const e=evidence(r,{lt2Hr:lt2}),ok=e.status==='observed';
   const item={id:String(r.id||''),date:r.date,type:String(r.type||'Run'),status:ok?(e.partial?'partial':'accepted'):'excluded',
    reason:String(e.reason||''),hr:ok?e.hr:null,driftPct:ok?e.driftPct:null,method:e.method,seconds:ok?e.seconds:0,
    terrainVerified:e.terrainVerified===true,confidence:e.confidence||null,counted:false};
   out.reviewed.push(item);
   if(!ok)continue;
   const former=byDay.get(r.date);
   const rank=x=>(x.method==='second-by-second HR'?1000000:0)+(x.terrainVerified?500000:0)+x.seconds+(x.status==='accepted'?10000:0);
   if(!former||rank(item)>rank(former))byDay.set(r.date,item);
  }
  out.reviewedCount=out.reviewed.length;
  const chosen=[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
  for(const item of chosen)item.counted=true;
  out.observations=chosen.map(x=>({date:x.date,hr:x.hr,driftPct:x.driftPct,method:x.method,confidence:x.confidence,seconds:x.seconds,partial:x.status==='partial'}));
  out.days=out.observations.length;out.streamDays=out.observations.filter(x=>x.method==='second-by-second HR').length;
  out.archivedDays=out.days-out.streamDays;
  out.spanDays=out.days?day(out.observations.at(-1).date)-day(out.observations[0].date):0;
  const stable=out.observations.filter(x=>x.driftPct<=3.0),elevated=out.observations.filter(x=>x.driftPct>=6.0);
  out.stableDays=stable.length;out.elevatedDays=elevated.length;
  const highestStable=stable.length?Math.max(...stable.map(x=>x.hr)):null;
  const lowestElevated=elevated.length?Math.min(...elevated.map(x=>x.hr)):null;
  if(out.days<6||out.spanDays<14){out.reason=`Collect more steady running evidence: ${out.days}/6 suitable days over ${out.spanDays}/14 calendar days`;return out;}
  if(stable.length<3||elevated.length<3){out.reason=`LT1 breakpoint not bracketed: ${stable.length} stable and ${elevated.length} elevated-drift days (need 3 of each)`;return out;}
  if(!(lowestElevated-highestStable>=4&&lowestElevated-highestStable<=28)){
   out.reason='Steady HR and elevated-drift HR observations do not establish a coherent upward breakpoint; no LT1 inferred';return out;
  }
  if(!(n(lt2)>=100&&n(lt2)<=225&&lowestElevated<n(lt2)-3)){
   out.reason='Dated LT2 reference unavailable or observations too close to LT2';return out;
  }
  const hr=Math.round((highestStable+lowestElevated)/2);
  if(hr>=n(lt2)-5){out.reason='Inferred boundary too close to LT2; withheld';return out;}
  const band=Math.max(6,Math.ceil((lowestElevated-highestStable)/2)+4),low=Math.round(hr-band),high=Math.round(hr+band);
  out.status='provisional';out.hr=hr;out.range=[low,Math.min(high,n(lt2)-2)];out.confidence='low';
  out.reason=`Observed aerobic-drift transition between ${Math.round(highestStable)} and ${Math.round(lowestElevated)} bpm across ${out.days} runs. This is a non-validated proxy and may reflect heat, fatigue, hills or training state; do not treat it as a measured LT1.`;
  return out;
 }catch(_){return {...out,reason:'Estimation fault; no LT1 inferred'};}
}
return Object.freeze({VERSION,summarize,fromLaps,evidence,estimate});
});
