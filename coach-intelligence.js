/* Coach Intelligence v2: read-only interpretation of existing coach engines.
   Does not learn, estimate thresholds, score workouts, save state or modify plans. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ARCCoachIntelligence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '2.0.0';
  const number = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) ? Number(value) : null;
  const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
  const dayNumber = value => dateValid(value) ? Date.parse(value+'T12:00:00Z')/86400000 : null;
  const shift = (value, days) => { const d = dayNumber(value); return d === null ? null : new Date((d+days)*86400000).toISOString().slice(0,10); };
  const round = (value, digits = 2) => Math.round(value*10**digits)/10**digits;
  const acceptableConfidence = value => /^(high|moderate|strong|good)$/i.test(String(value||''));
  function distanceWindow(runs, asOf, days, offset = 0) {
    if(!dateValid(asOf)||!Number.isInteger(days)||days<1||!Number.isInteger(offset)||offset<0) return {km:null,count:0,days:0};
    const end = dayNumber(asOf)-offset, start = end-days+1;
    const seen = new Set(); let km=0,count=0;
    for(const run of Array.isArray(runs)?runs:[]) {
      const d = dayNumber(run?.date),dist = number(run?.distanceKm);
      const key = run?.id?`id:${run.id}@${run.date}`: `sample:${run?.date}|${run?.type}|${run?.distanceKm}|${run?.durationSec}|${run?.createdAt||''}`;
      if(d===null||d<start||d>end||dist===null||dist<=0||dist>200||seen.has(key)||run?.source==='assessment')continue;
      seen.add(key);km+=dist;count++;
    }
    return {km:round(km,2),count,days};
  }
  function loadSummary(runs, asOf) {
    const last7 = distanceWindow(runs,asOf,7), previous7 = distanceWindow(runs,asOf,7,7), last28 = distanceWindow(runs,asOf,28);
    const earlier28 = distanceWindow(runs,asOf,28,28);
    return {last7,previous7,last28,earlier28,delta7:round(last7.km-previous7.km,2),
      delta28:round(last28.km-earlier28.km,2),
      // A ratio is displayed only when the prior observation exists. A zero previous window is not 0% change.
      percent7:previous7.km>0?round((last7.km/previous7.km-1)*100,1):null};
  }
  function seriesDelta(points,asOf,days) {
    if(!dateValid(asOf))return {current:null,previous:null,priorDate:null,at7:null,at28:null,delta7:null,delta28:null,changedToday:false,observedToday:false};
    const byDay = new Map();
    for(const entry of Array.isArray(points)?points:[]) {
      const value=number(entry?.value);
      if(dateValid(entry?.date)&&entry.date<=asOf&&value!==null)byDay.set(entry.date,{date:entry.date,value});
    }
    const rows=[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
    const current=rows.at(-1)||null,prev=current?rows.filter(x=>x.date<current.date).at(-1)||null:null;
    const lookup=daysAgo=>rows.filter(x=>x.date<=shift(asOf,-daysAgo)).at(-1)||null;
    const p7=lookup(7),p28=lookup(28);
    const changedToday=!!(current&&prev&&current.date===asOf&&Math.abs(current.value-prev.value)>1e-9);
    return {current:current?.value??null,observedAt:current?.date??null,previous:prev?.value??null,priorDate:prev?.date??null,
      priorDelta:current&&prev?current.value-prev.value:null,
      at7:p7?.value??null,at28:p28?.value??null,
      delta7:current&&p7&&current.date>p7.date&&current.date>=shift(asOf,-7)?current.value-p7.value:null,
      delta28:current&&p28&&current.date>p28.date&&current.date>=shift(asOf,-28)?current.value-p28.value:null,
      changedToday,observedToday:current?.date===asOf};
  }
  function runAssessment({run,plan,scoreDetails,comparison,pathways} = {}) {
    if(!run)return null;
    const score=number(scoreDetails?.score),actual=number(run.distanceKm),planned=number(plan?.distance),pain=number(run.pain),rpe=number(run.rpe);
    const ratio=actual!==null&&planned!==null&&planned>0?actual/planned:null;
    const over=ratio!==null&&ratio>1.08,under=ratio!==null&&ratio<.92;
    const efficiency=number(comparison?.efficiencyDelta),measuredDrift=number(run.powerDrift),drift=measuredDrift!==null&&measuredDrift>0?measuredDrift:null;
    const comparable=acceptableConfidence(comparison?.confidence)&&number(comparison?.count)>=3;
    const drivers=[];
    if(ratio!==null)drivers.push({tone:over||under?'caution':'good',label:'Prescription',value:`${Math.round(ratio*100)}% of planned distance`,detail:over?'Extra distance adds unplanned load; it is not bonus credit.':under?'Distance below the assigned stimulus.':'Distance close to prescription.',source:'Saved plan + run distance'});
    else drivers.push({tone:'neutral',label:'Prescription',value:'No linked distance target',detail:'A valid session can be analysed, but plan compliance cannot be scored.',source:'Plan matching'});
    if(efficiency!==null&&comparable)drivers.push({tone:efficiency>=2?'good':efficiency<=-3?'caution':'neutral',label:'Aerobic efficiency',value:`${efficiency>=0?'+':''}${efficiency.toFixed(1)}%`,detail:`Against ${comparison.count} comparable earlier runs (${comparison.confidence.toLowerCase()} confidence). This is association, not proof of adaptation.`,source:'Existing comparable-run model'});
    else drivers.push({tone:'neutral',label:'Aerobic efficiency',value:'Comparison pending',detail:'A sufficiently similar, confident baseline is needed before declaring improvement.',source:'Existing comparable-run model'});
    if(drift!==null)drivers.push({tone:drift<=3?'good':drift>6?'caution':'neutral',label:'Cardiac drift',value:(drift<.1?drift.toPrecision(2):drift.toFixed(1))+'%',detail:'Power-based drift, interpreted in workout context. Low drift does not by itself demonstrate improved fitness.',source:'Imported run physiology'});
     else if(measuredDrift!==null)drivers.push({tone:'neutral',label:'Cardiac drift',value:'Excluded · not used',detail:'Zero or negative drift is excluded from aerobic durability analysis.',source:'Imported run physiology'});
    if(pain!==null)drivers.push({tone:pain>=3?'caution':'neutral',label:'Pain',value:`${pain}/10`,detail:pain>=3?'Limits positive training conclusions.':'Recorded pain score.',source:'Post-run entry'});
    const caution=pain!==null&&pain>=5;
    let verdict,tone;
    if(caution){verdict='Pain overrides the performance result';tone='bad';}
    else if(score!==null&&score<70){verdict='Execution fell short of the intended session';tone='caution';}
    else if(over){verdict='Useful evidence, but too much unplanned distance';tone='caution';}
    else if(under){verdict='Session incomplete against its prescription';tone='caution';}
    else if(score!==null&&score>=85&&(pain===null||rpe===null||number(run.avgHr)===null)){verdict='Execution strong; recovery evidence incomplete';tone='neutral';}
    else if(score!==null&&score>=85){verdict='Well-executed session; check recovery cost';tone='good';}
    else if(score!==null){verdict='Completed with execution trade-offs';tone='neutral';}
    else{verdict='Logged, but evidence is too limited for a score';tone='neutral';}
    const components=(Array.isArray(scoreDetails?.components)?scoreDetails.components:[]).filter(c=>c&&number(c.score)!==null&&number(c.effectiveWeight)!==null&&number(c.effectiveWeight)>=0)
      .map(c=>({name:String(c.name||c.key||'Component'),score:number(c.score),weight:number(c.effectiveWeight)*100,detail:String(c.detail||''),scope:String(c.scope||''),key:String(c.key||'')})).sort((a,b)=>a.score-b.score);
    const dose=run.trainingDose;
    const gaps=[];
    if(number(run.avgHr)===null||number(run.avgHr)<=0)gaps.push('average HR');
    if(number(run.avgPower)===null||number(run.avgPower)<=0)gaps.push('power');
    if(rpe===null)gaps.push('RPE');
    if(pain===null)gaps.push('pain');
    if(number(run.hrv)===null)gaps.push('previous-night HRV');
    if(!plan)gaps.push('linked prescription');
    if(dose&&dose.status==='unavailable')gaps.push('usable second-by-second training dose');
    const path=(name,value)=>({name,signal:number(value?.finalSignal),confidence:value?.confidence||'not established',interpretation:String(value?.interpretation||'')});
    const result={verdict,tone,score,scoreEvidence:scoreDetails?.evidenceQuality||'not established',drivers,components,
      hasPainStop:caution,ratio,over,under,comparisonReliable:comparable,limitations:gaps,
      pathways:[path('Pace & Power',pathways?.pace),path('Distance & Load',pathways?.load)],
      dose: dose&&['measured','partial'].includes(dose.status)?{
        status:dose.status,coverage:number(dose.power?.classifiedCoverage),
        hrCoverage:number(dose.hr?.classifiedCoverage),lowHr:number(dose.hr?.seconds?.low),
        moderateHr:number(dose.hr?.seconds?.moderate),highHr:number(dose.hr?.seconds?.high),
        unknownHr:number(dose.hr?.seconds?.unknown),seconds:number(dose.timerSeconds)}:null};
    return result;
  }
  return Object.freeze({VERSION,number,dateValid,shift,distanceWindow,loadSummary,seriesDelta,runAssessment});
});
