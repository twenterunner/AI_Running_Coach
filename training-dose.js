/* AI Running Coach training-dose 1.0.0. Local, deterministic measurement only. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ARCTrainingDose = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.0', MAX_SECONDS = 172800, MAX_RECORDS = 400000;
  const finite = v => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v));
  const num = v => finite(v) ? Number(v) : null;
  const validDate = v => { if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false; const t=Date.parse(v+'T12:00:00Z'); return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===v; };
  const sum = a => a.reduce((s,v) => s+v,0);
  function blank(total, model, boundaries) {
    return {model, boundaries, seconds:{low:0,moderate:0,high:0,unknown:total}, validSeconds:0, coverage:0, histogram:[]};
  }
  function failure(run, reason, totalOverride) {
    const total = num(totalOverride) ?? num(run && run.durationSec) ?? 0;
    const sec = total>0 && total<=MAX_SECONDS ? total : 0;
    return {version:1,engineVersion:VERSION,status:'unavailable',reason,timerSeconds:sec,pausedSeconds:0,
      hr:blank(sec,'HR threshold zones',null),power:blank(sec,'Relative-CP bands (not physiological zones)',null),
      calibration:null,flags:[reason],confidence:'insufficient',sourceRecords:0};
  }
  function calibration(input) {
    const c = input && typeof input==='object' ? input : {};
    const lt1=num(c.lt1Hr),lt2=num(c.lt2Hr),cp=num(c.criticalPower);
    return {lt1Hr:lt1>=60&&lt1<=210?lt1:null,lt2Hr:lt2>=80&&lt2<=230?lt2:null,
      criticalPower:cp>=50&&cp<=1500?cp:null,
      lt1Source:String(c.lt1Source||'not supplied').slice(0,180),lt2Source:String(c.lt2Source||'not supplied').slice(0,180),
      powerSource:String(c.powerSource||'not supplied').slice(0,180),asOf:validDate(c.asOf)?c.asOf:null,
      measuredOn:validDate(c.measuredOn)?c.measuredOn:null,powerUsable:c.powerUsable!==false};
  }
  function timerIntervals(start,end,events) {
    if(!Array.isArray(events)||!events.length)return {ranges:[[start,end]],known:false};
    const e=events.filter(x=>x&&finite(x.t)&&['start','stop'].includes(x.type))
      .map((x,i)=>({t:Number(x.t),type:x.type,i})).sort((a,b)=>a.t-b.t||a.i-b.i);
    if(!e.length)return {ranges:[[start,end]],known:false};
    let on=true,last=start; const ranges=[];
    for(const x of e){
      if(x.t<=start){on=x.type==='start';continue;}
      if(x.t>=end)break;
      if(on&&x.t>last)ranges.push([last,x.t]);
      on=x.type==='start';last=x.t;
    }
    if(on&&end>last)ranges.push([last,end]);
    return {ranges,known:true};
  }
  function measureUnsafe(run,records,calibrationInput) {
    if(!run||typeof run!=='object')return failure(run,'Missing activity');
    if(!validDate(run.date))return failure(run,'Invalid activity date');
    if(!Array.isArray(records)||records.length<2)return failure(run,'Detailed recording unavailable; history was not reconstructed');
    if(records.length>MAX_RECORDS)return failure(run,'Recording exceeds processing limit');
    const declared=num(run.durationSec);
    if(!(declared>0&&declared<=MAX_SECONDS))return failure(run,'Invalid activity timer duration');
    const cal=calibration(calibrationInput), flags=[];
    if(cal.lt1Hr!==null&&cal.lt2Hr!==null&&cal.lt1Hr>=cal.lt2Hr)return failure(run,'LT1 must be below LT2');
    if(validDate(run.date)&&((cal.asOf&&cal.asOf>run.date)||(cal.measuredOn&&cal.measuredOn>run.date)))return failure(run,'Future calibration cannot classify a past activity');
    const raw=records.filter(r=>r&&finite(r.t)).map((r,i)=>({t:Number(r.t),hr:num(r.hr),power:num(r.power),i})).sort((a,b)=>a.t-b.t||a.i-b.i);
    const rows=[];
    for(const r of raw){
      if(rows.length&&rows.at(-1).t===r.t){
        const prev=rows.at(-1);
        // Conflicting duplicates are unknown, never additional exposure.
        if(prev.hr!==r.hr)prev.hr=null;
        if(prev.power!==r.power)prev.power=null;
        flags.push('Duplicate timestamps collapsed');
      }else rows.push(r);
    }
    if(rows.length<2)return failure(run,'Insufficient distinct timestamps');
    const start=rows[0].t,end=rows.at(-1).t,span=end-start;
    if(!(span>0&&span<=MAX_SECONDS))return failure(run,'Invalid recording time span');
    const timers=timerIntervals(start,end,run.trainingTimerEvents);
    const active=sum(timers.ranges.map(x=>x[1]-x[0]));
    if(active-declared>1.01||declared-active>Math.max(5,declared*.01))return failure(run,timers.known?'Timer events disagree with activity duration':'Paused or incomplete timeline cannot be assigned accurately');
    const total=declared; // the session timer remains authoritative
    if(active>declared){let excess=active-declared;for(let i=timers.ranges.length-1;i>=0&&excess>0;i--){const r=timers.ranges[i],cut=Math.min(excess,r[1]-r[0]);r[1]-=cut;excess-=cut;}flags.push('Rounded recording endpoint clipped to the activity timer');}
    if(declared>active)flags.push('Trailing unrecorded timer seconds remain unknown');
    const h=blank(total,'HR threshold zones (LT estimates, not laboratory measurement)',{lt1:cal.lt1Hr,lt2:cal.lt2Hr}),
      p=blank(total,'Relative-CP bands (80% / 100%; NOT LT1 / LT2)',{lowBoundary:cal.criticalPower===null?null:cal.criticalPower*.8,highBoundary:cal.criticalPower});
    const hh=new Map(),ph=new Map();let validHr=0,validPower=0,gap=0,rangeIndex=0;
    function credit(dst,key,seconds){dst.seconds[key]+=seconds;dst.seconds.unknown-=seconds;}
    for(let i=0;i<rows.length-1;i++){
      const a=rows[i],b=rows[i+1],dt=b.t-a.t;
      while(rangeIndex<timers.ranges.length&&timers.ranges[rangeIndex][1]<=a.t)rangeIndex++;
      let activeDt=0;
      for(let j=rangeIndex;j<timers.ranges.length&&timers.ranges[j][0]<b.t;j++){
        const [lo,hi]=timers.ranges[j];activeDt+=Math.max(0,Math.min(b.t,hi)-Math.max(a.t,lo));
      }
      if(!activeDt)continue;
      if(dt>10){gap+=activeDt;continue;} // no carrying a sensor value over long gaps
      if(a.hr!==null&&a.hr>=35&&a.hr<=230){
        validHr+=activeDt;const bin=Math.round(a.hr);hh.set(bin,(hh.get(bin)||0)+activeDt);
        let band=null;
        if(cal.lt2Hr!==null&&a.hr>=cal.lt2Hr)band='high';
        else if(cal.lt1Hr!==null&&a.hr<cal.lt1Hr)band='low';
        else if(cal.lt1Hr!==null&&cal.lt2Hr!==null)band='moderate';
        if(band)credit(h,band,activeDt);
      }
      if(cal.powerUsable&&a.power!==null&&a.power>=20&&a.power<=2000){
        validPower+=activeDt;const bin=Math.round(a.power/5)*5;ph.set(bin,(ph.get(bin)||0)+activeDt);
        if(cal.criticalPower!==null)credit(p,a.power<cal.criticalPower*.8?'low':a.power<cal.criticalPower?'moderate':'high',activeDt);
      }
    }
    for(const [dst,hist,valid] of [[h,hh,validHr],[p,ph,validPower]]){
      dst.seconds.unknown=Math.max(0,dst.seconds.unknown);dst.validSeconds=valid;dst.coverage=total?valid/total:0;
      dst.classifiedCoverage=total?(total-dst.seconds.unknown)/total:0;
      dst.histogram=[...hist.entries()].sort((a,b)=>a[0]-b[0]);
    }
    if(cal.lt1Hr===null)flags.push('LT1 unavailable: below-LT2 time is not automatically called easy');
    if(cal.lt2Hr===null)flags.push('LT2 unavailable');
    if(cal.criticalPower===null)flags.push('Critical power unavailable');
    if(!cal.powerUsable)flags.push('Unreliable power mapping excluded');
    if(gap)flags.push('Recording gaps remain unknown');
    if(!timers.known)flags.push('Timer continuity inferred from matching duration, not verified timer events');
    flags.push('HR time and external-power work are different measurements; HR lags short intervals');
    const coverage=Math.max(h.classifiedCoverage,p.classifiedCoverage);
    return {version:1,engineVersion:VERSION,status:coverage>=.8?'measured':'partial',reason:'Elapsed-time-weighted recorded samples',
      timerSeconds:total,pausedSeconds:Math.max(0,span-active),hr:h,power:p,calibration:cal,
      confidence:coverage>=.9?'good recording coverage':coverage>=.8?'usable recording coverage':'limited recording coverage',
      activity:{date:run.date,durationSec:declared,distanceKm:num(run.distanceKm)},sourceRecords:rows.length,gapSeconds:gap,flags:[...new Set(flags)],method:'Left sample held for at most 10 seconds; known timer stops excluded'};
  }
  function measure(run,records,input){try{return measureUnsafe(run,records,input);}catch(e){return failure(null,'Measurement fault; no exposure inferred');}}
  function isUsableDose(d) {
    if(!d||d.version!==1||typeof d.timerSeconds!=='number'||!Number.isFinite(d.timerSeconds)||d.timerSeconds<=0||d.timerSeconds>MAX_SECONDS)return false;
    if(!['measured','partial','unavailable'].includes(d.status))return false;
    return ['hr','power'].every(k=>{
      if(typeof d[k]?.validSeconds!=='number'||!Number.isFinite(d[k].validSeconds)||d[k].validSeconds<0||d[k].validSeconds>d.timerSeconds+.001)return false;
      const s=d[k]&&d[k].seconds;
      return s&&['low','moderate','high','unknown'].every(b=>typeof s[b]==='number'&&Number.isFinite(s[b])&&s[b]>=0)&&Math.abs(sum(['low','moderate','high','unknown'].map(k=>Number(s[k])))-d.timerSeconds)<.05;
    });
  }
  function doseMatchesActivity(run,dose) {
    if(!isUsableDose(dose)||!run)return false;
    const duration=num(run.durationSec);
    if(duration===null||Math.abs(duration-dose.timerSeconds)>.05)return false;
    if(dose.activity){
      if(dose.activity.date!==run.date)return false;
      const distance=num(run.distanceKm),saved=num(dose.activity.distanceKm);
      if(distance!==saved)return false;
    }
    return true;
  }
  function aggregate(runs,asOf,days=28) {
    if(!validDate(asOf)||![7,28,84].includes(days))throw new Error('Invalid reporting window');
    const cutoff=Date.parse(asOf+'T12:00:00Z'),min=cutoff-(days-1)*86400000;
    const output={asOf,days,totalSeconds:0,runs:0,measuredRuns:0,distinctMeasuredDays:0,
      hr:blank(0,'HR threshold zones',null),power:blank(0,'Relative-CP bands',null),missingRuns:0};
    const seen=new Set(),dates=new Set();
    for(const r of Array.isArray(runs)?runs:[]){
      if(!r||!validDate(r.date))continue;
      const day=Date.parse(r.date+'T12:00:00Z');if(day<min||day>cutoff)continue;
      const id=String(r.id||r.date+'|'+r.durationSec+'|'+r.distanceKm);if(seen.has(id))continue;seen.add(id);
      const d=doseMatchesActivity(r,r.trainingDose)?r.trainingDose:failure(r,'Detailed history unavailable or activity was edited');
      if(!d.timerSeconds)continue;
      output.totalSeconds+=d.timerSeconds;output.runs++;
      if(d.status==='measured'||d.status==='partial'){output.measuredRuns++;dates.add(r.date);}else output.missingRuns++;
      for(const key of ['hr','power']){
        for(const band of ['low','moderate','high','unknown'])output[key].seconds[band]+=d[key].seconds[band];
        output[key].validSeconds+=Number(d[key].validSeconds)||0;
      }
    }
    output.distinctMeasuredDays=dates.size;
    for(const key of ['hr','power']){
      output[key].coverage=output.totalSeconds?output[key].validSeconds/output.totalSeconds:0;
      output[key].classifiedCoverage=output.totalSeconds?(output.totalSeconds-output[key].seconds.unknown)/output.totalSeconds:0;
    }
    return output;
  }
  return Object.freeze({VERSION,measure,aggregate,failure,isUsableDose,doseMatchesActivity,calibration,validDate});
});
