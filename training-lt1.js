/* AI Running Coach LT1 evidence v1.0 — offline, observational, NOT laboratory VT1. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ARCTrainingLT1=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='1.0.0';
const finite=x=>x!==null&&x!==undefined&&x!==''&&typeof x!=='boolean'&&Number.isFinite(Number(x));
const n=x=>finite(x)?Number(x):null;
const date=x=>{if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;const d=new Date(x+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;};
const day=x=>Date.parse(x+'T12:00:00Z')/86400000;
const mean=x=>x.reduce((s,v)=>s+v,0)/Math.max(1,x.length);
const avg=(rows,key)=>{const vals=rows.map(x=>n(x[key])).filter(Number.isFinite);return vals.length?mean(vals):null;};
const sd=x=>{const m=mean(x);return Math.sqrt(mean(x.map(v=>(v-m)**2)));};
const acceptedTypes=new Set(['Easy','Recovery','Long run','Steady aerobic','Medium-long','Progression','Specific long run']);
const validRun=run=>run&&date(run.date)&&acceptedTypes.has(run.type)&&!(finite(run.pain)&&Number(run.pain)>=3)&&!(finite(run.rpe)&&Number(run.rpe)>6);
const empty=(method,reason)=>({version:1,method,status:'unavailable',reason,hr:null,driftPct:null,seconds:0,coverage:0,terrainVerified:false});
function summarize(run,records){
 try{
  if(!validRun(run))return empty('second-by-second HR','Workout type, pain or exertion excludes an LT1 proxy observation');
  if(!Array.isArray(records)||records.length<200||records.length>400000)return empty('second-by-second HR','Insufficient recorded samples');
  const raw=records.filter(r=>r&&finite(r.t)).map(r=>({t:n(r.t),hr:n(r.hr),power:n(r.power),speed:n(r.speed),altitude:n(r.altitude)})).sort((a,b)=>a.t-b.t);
  const rows=[];
  for(const p of raw){if(rows.length&&p.t===rows.at(-1).t){const q=rows.at(-1);for(const k of ['hr','power','speed','altitude'])if(q[k]!==p[k])q[k]=null;}else rows.push(p);}
  if(rows.length<200)return empty('second-by-second HR','Too few distinct timestamps');
  // Preserve *actual* timestamps: large gaps, pauses and stop-start activity cannot be interpreted as continuous effort.
  const chunks=[];let start=0;
  for(let i=1;i<=rows.length;i++){
   if(i===rows.length||rows[i].t-rows[i-1].t>6||rows[i].t<=rows[i-1].t){if(i-start>=200)chunks.push(rows.slice(start,i));start=i;}
  }
  const longest=chunks.sort((a,b)=>(b.at(-1).t-b[0].t)-(a.at(-1).t-a[0].t))[0];
  if(!longest||longest.at(-1).t-longest[0].t<1200)return empty('second-by-second HR','Need at least 20 continuous minutes of recorded running');
  const elapsed=longest.at(-1).t-longest[0].t;
  const work=longest.filter(r=>r.t>=longest[0].t+Math.min(480,elapsed*.18));
  const span=work.at(-1).t-work[0].t;
  if(span<850)return empty('second-by-second HR','Insufficient steady duration after warm-up');
  // Time coverage must be high; do not rely on one implausible or sparsely recorded second.
  let covered=0,hrCovered=0,powerCovered=0,speedCovered=0,altCovered=0,altMin=Infinity,altMax=-Infinity;
  for(let i=0;i<work.length-1;i++){
   const a=work[i],b=work[i+1],dt=b.t-a.t;if(dt<=0||dt>6)continue;covered+=dt;
   if(a.hr>=80&&a.hr<=210)hrCovered+=dt;
   if(a.power>=60&&a.power<=650)powerCovered+=dt;
   if(a.speed>=1.5&&a.speed<=6.5)speedCovered+=dt;
   if(a.altitude!==null&&a.altitude>-500&&a.altitude<6000){altCovered+=dt;altMin=Math.min(altMin,a.altitude);altMax=Math.max(altMax,a.altitude);}
  }
  const coverage=hrCovered/Math.max(1,span);
  if(coverage<.90||covered/span<.96)return empty('second-by-second HR','HR sample gaps or insufficient coverage');
  const terrainVerified=altCovered/span>=.85;
  const speedVals=work.map(r=>r.speed).filter(x=>x>=1.5&&x<=6.5),powerVals=work.map(r=>r.power).filter(x=>x>=60&&x<=650);
  const speedOk=speedCovered/span>=.90&&speedVals.length>100&&sd(speedVals)/mean(speedVals)<.14;
  const powerOk=powerCovered/span>=.90&&powerVals.length>100&&sd(powerVals)/mean(powerVals)<.16&& !/proportional alignment/i.test(run.powerDiagnostics?.mapping||'');
  if(!speedOk&&!powerOk)return empty('second-by-second HR','No reliable, suitably steady speed/power reference');
  if(terrainVerified&&altMax-altMin>Math.max(20,Number(run.distanceKm||0)*3))return empty('second-by-second HR','Terrain variation makes aerobic drift ambiguous');
  const mid=work[0].t+span/2,first=work.filter(r=>r.t<mid),second=work.filter(r=>r.t>=mid);
  const h1=avg(first.filter(r=>r.hr>=80&&r.hr<=210),'hr'),h2=avg(second.filter(r=>r.hr>=80&&r.hr<=210),'hr');
  if(!(h1>80&&h2>80))return empty('second-by-second HR','Invalid HR halves');
  const key=powerOk?'power':'speed',e1=avg(first.filter(r=>r[key]>0),key),e2=avg(second.filter(r=>r[key]>0),key);
  if(!(e1>0&&e2>0)||Math.abs(e2/e1-1)>.07)return empty('second-by-second HR','External intensity was not stable across halves');
  const drift=100*((h2/e2)/(h1/e1)-1),hr=mean([h1,h2]);
  if(!Number.isFinite(drift)||drift< -6||drift>22)return empty('second-by-second HR','Confounded or implausible aerobic drift');
  return {version:1,method:'second-by-second HR',status:'observed',hr:Math.round(hr*10)/10,
   driftPct:Math.round(drift*100)/100,seconds:Math.round(span),coverage:Math.round(coverage*1000)/1000,
   terrainVerified,effortSource:key,confidence:terrainVerified?'supporting':'limited',
   reason:'Stable external intensity with measured cardiac response; decoupling is NOT a direct LT1 test',
   activity:{date:run.date,durationSec:n(run.durationSec),distanceKm:n(run.distanceKm)}};
 }catch(_){return empty('second-by-second HR','Analysis failed; no threshold inferred');}
}
function fromLaps(run){
 try{
  if(!validRun(run))return empty('archived lap HR','Not an aerobic low-cost run');
  const rows=(Array.isArray(run.fitLaps)?run.fitLaps:[]).filter(l=>l&&n(l.durationSec)>=90&&n(l.avgHr)>=80&&n(l.avgHr)<=210&&n(l.distanceKm)>.1).map(l=>({t:n(l.durationSec),hr:n(l.avgHr),power:n(l.avgPower),speed:n(l.distanceKm)*1000/n(l.durationSec)}));
  if(rows.length<5||rows.reduce((s,r)=>s+r.t,0)<1800)return empty('archived lap HR','Not enough steady lap summaries for an observation');
  // Skip warm-up lap. Lap averages cannot be mistaken for second-by-second data.
  const work=rows.slice(1),duration=work.reduce((s,r)=>s+r.t,0);
  if(duration<1200)return empty('archived lap HR','Lap summaries too short');
  const weighted=(arr,k)=>arr.reduce((s,r)=>s+r.t*r[k],0)/arr.reduce((s,r)=>s+r.t,0);
  const half=Math.floor(work.length/2),a=work.slice(0,half),b=work.slice(half);
  const key=work.every(r=>r.power>=60&&r.power<=650)?'power':'speed';
  const eff=work.map(r=>r[key]),cv=sd(eff)/mean(eff);
  if(cv>.12||Math.abs(weighted(b,key)/weighted(a,key)-1)>.07)return empty('archived lap HR','Lap-average effort is not steady');
  const drift=100*((weighted(b,'hr')/weighted(b,key))/(weighted(a,'hr')/weighted(a,key))-1);
  if(drift< -6||drift>22)return empty('archived lap HR','Unstable lap-averaged drift');
  return {version:1,method:'archived lap HR',status:'observed',hr:Math.round(weighted(work,'hr')*10)/10,
   driftPct:Math.round(drift*100)/100,seconds:Math.round(duration),coverage:1,terrainVerified:false,
   effortSource:key,confidence:'limited',reason:'Archived lap averages only; cannot establish the physiological LT1 boundary',
   activity:{date:run.date,durationSec:n(run.durationSec),distanceKm:n(run.distanceKm)}};
 }catch(_){return empty('archived lap HR','Lap observation failed');}
}
function evidence(run){
 if(!run||!validRun(run))return empty('unknown','Not a suitable aerobic session');
 const e=run.lt1Evidence;
 if(e?.version===1&&e.status==='observed'&&e.activity?.date===run.date&&e.activity?.durationSec===n(run.durationSec)&&e.activity?.distanceKm===n(run.distanceKm)&&n(e.hr)>=80&&n(e.hr)<=210&&n(e.driftPct)>-6&&n(e.driftPct)<22)return e;
 return fromLaps(run);
}
function estimate(runs,asOf,lt2){
 const out={version:1,engineVersion:VERSION,status:'building',hr:null,range:null,confidence:'insufficient',method:'aerobic HR-decoupling proxy',days:0,streamDays:0,archivedDays:0,stableDays:0,elevatedDays:0,spanDays:0,reason:'',source:'Recorded steady HR plus pace/power response; NOT laboratory LT1',observations:[]};
 try{
  if(!date(asOf))return {...out,reason:'Valid observation cutoff unavailable'};
  const lookback=day(asOf)-91,seen=new Set();
  for(const r of Array.isArray(runs)?runs:[]){
   if(!r||!date(r.date)||r.date>asOf||day(r.date)<lookback||seen.has(r.date))continue;
   const e=evidence(r);if(e.status!=='observed')continue;
   seen.add(r.date);out.observations.push({date:r.date,hr:e.hr,driftPct:e.driftPct,method:e.method,confidence:e.confidence});
  }
  out.observations.sort((a,b)=>a.date.localeCompare(b.date));
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
