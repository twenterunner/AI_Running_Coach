/* Running Coach: dose, automatic LT1 and coordinated optimizer UI. No talk test or other-activity settings. */
(function(){'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const minutes=s=>(Number(s||0)/60).toFixed(1);
let selectedWindow=28,busy=false,signatureOld='',editing=false,previewReport=null,feedbackText='';
function bars(summary,key){
 const x=summary[key],total=summary.totalSeconds||0,names={low:'Low',moderate:'Moderate',high:'High',unknown:'Unknown'};
 return `<h4>${key==='hr'?'Recorded HR intensity zones':'Recorded relative-power bands'}</h4><div class="arcDoseBar" role="img" aria-label="${escape(key)} training time including unknown time">${Object.keys(names).map(k=>`<span class="arcDose-${k}" style="flex:${total?x.seconds[k]/total:0}" title="${names[k]}: ${minutes(x.seconds[k])} min"></span>`).join('')}</div><div class="arcDoseLegend">${Object.keys(names).map(k=>`<span><i class="arcDose-${k}"></i>${names[k]} <b>${minutes(x.seconds[k])} min</b> ${total?Math.round(x.seconds[k]/total*100):0}%</span>`).join('')}</div>`;
}
function changes(report){return (report?.changes||[]).map(c=>`<li><small>${escape(c.date||c.id)}</small><br><b>${escape(c.type)}</b> · ${Number(c.distance).toFixed(1)} km<br>${escape(c.reason)}</li>`).join('');}
function notify(text,bad=false){feedbackText=text;const e=document.getElementById('arcTrainingMessage');if(e){e.textContent=text;e.setAttribute('role',bad?'alert':'status');}}
function clock(seconds){
 if(!Number.isFinite(Number(seconds))||Number(seconds)<0)return '—';
 const s=Math.round(Number(seconds));return `${Math.floor(s/3600)?Math.floor(s/3600)+':':''}${String(Math.floor(s/60)%60).padStart(Math.floor(s/3600)?2:1,'0')}:${String(s%60).padStart(2,'0')}`;
}
const percent=(part,total)=>total>0?`${(Math.max(0,Number(part)||0)/total*100).toFixed(2)}%`:'—';
function lt1Card(e){
 const has=e?.status==='provisional'&&Number.isFinite(e.hr);
 const number=has?`${Math.round(e.hr)} bpm`:'Not established';
 const interval=has&&e.range?` · working range ${e.range[0]}–${e.range[1]} bpm`:'';
 const reviewed=Array.isArray(e?.reviewed)?e.reviewed:[],excluded=reviewed.filter(x=>x.status==='excluded').length;
 const history=reviewed.slice(-18).reverse().map(o=>{
  const accepted=o.status!=='excluded',partial=o.status==='partial';
  const verdict=!accepted?'Excluded':!o.counted?'Suitable · same day already counted':partial?'Partially accepted':'Accepted';
  const details=accepted?`${Math.round(Number(o.hr))} bpm · HR/effort drift ${Number(o.driftPct).toFixed(1)}% · steady evidence ${clock(o.seconds)} · ${escape(o.method||'unknown source')}`:escape(o.reason||'No usable observation');
  const note=accepted?`${o.counted?'Counts as one suitable day':'Does not add another day'}${partial?' · steady section only':''}${o.terrainVerified?' · terrain checked':''}`:escape(o.method||'No retained detailed evidence');
  return `<section class="arcLt1Observation ${accepted?'arcLt1ObservationValid':'arcLt1ObservationExcluded'}"><div class="arcObservationHeader"><b>${escape(o.date)} · ${escape(o.type)}</b><span class="arcObservationStatus">${escape(verdict)}</span></div><p>${details}</p><small>${note}</small></section>`;
 }).join('')||'<p>No runs in the 92-day LT1 evidence window.</p>';
 return `<section class="arcAutoLt1" aria-label="Automatic LT1 assessment"><div class="arcAutoLt1Head"><div><small>AUTOMATIC AEROBIC BREAKPOINT</small><h4>LT1 estimate: ${escape(number)}</h4></div><span class="arcTrainingBadge">${has?'Provisional · low confidence':'Learning from runs'}</span></div><p>${escape(e?.reason||'Waiting for suitable run measurements.')}${interval}</p><div class="arcLt1Stats"><div><small>Suitable days</small><b>${Number(e?.days)||0} / 6</b></div><div><small>Stable / elevated drift</small><b>${Number(e?.stableDays)||0} / ${Number(e?.elevatedDays)||0}</b></div><div><small>Second-by-second / laps</small><b>${Number(e?.streamDays)||0} / ${Number(e?.archivedDays)||0}</b></div></div><p class="arcTrainingNote">All imported runs are reviewed, including Hills and Easy + strides. Only sufficiently long, steady, trustworthy portions contribute. Older lap averages carry weaker evidence; raw FIT samples are not reconstructed. HR drift is an exploratory proxy, never a laboratory LT1 measurement. No manual LT1 or speech test is required.</p><details><summary>Observation details and estimation safeguards · ${reviewed.length} reviewed, ${excluded} excluded</summary>${history}<p class="arcTrainingNote">Only one suitable observation per calendar day counts. LT1 requires at least six different days spanning 14 days, three stable and three elevated-drift observations at different HR levels, and a compatible dated LT2 reference. Missing HR, unstable effort, major hills, fatigue, high RPE or pain can rule out a run. Already compacted sessions without sufficient saved evidence cannot be retroactively re-analysed; the original FIT is needed.</p></details></section>`;
}
function doseEvidenceHtml(a){
 const dose=a?.trainingDose,matched=window.ARCTrainingDose?.doseMatchesActivity(a,dose);
 if(!matched)return `<section class="arcEvidenceRun"><b>${escape(a.date)} · ${escape(a.type)}</b><p>Detailed recording unavailable or activity was edited. No sample coverage can be claimed.</p></section>`;
 const total=dose.timerSeconds,hr=dose.hr||{},power=dose.power||{},timing=dose.timing;
 const sensor=(title,d)=>`${title}: ${clock(d.validSeconds)}/${clock(total)} (${percent(d.validSeconds,total)})`;
 const warnings=(dose.flags||[]).filter(f=>!/^Trailing unrecorded timer seconds|^Timer continuity inferred|^HR time and external-power work|^LT1 unavailable:|^Recording gaps remain unknown/.test(f));
 const timingText=timing&&Number.isFinite(Number(timing.unassignedTimerSeconds))?
  (Number(timing.unassignedTimerSeconds)>.05?`${Number(timing.unassignedTimerSeconds).toFixed(1)} s of timer time is outside the measured timestamp intervals${timing.materialUnassigned?' · review recording continuity':' · normal-size FIT boundary difference'}; kept unknown.`:'FIT timer and timestamp interval align.'):
  'Historical analysis: precise timer-to-sample boundary offset not stored; sensor coverage below is still available.';
 const gaps=Number(dose.gapSeconds)||0;
 if(gaps>.05)warnings.push(`${gaps.toFixed(1)} s of gaps over 10 s were not interpolated`);
 return `<section class="arcEvidenceRun"><b>${escape(a.date)} · ${escape(a.type)}</b><p><strong>${escape(dose.confidence||'Coverage unknown')}</strong> · timer ${clock(total)}</p><p>${escape(sensor('HR samples',hr))} · ${escape(sensor('Power samples',power))}</p><p>${escape(timingText)}</p>${warnings.length?`<p class="arcEvidenceCaution">${escape([...new Set(warnings)].join(' · '))}</p>`:''}</section>`;
}
function populate(){
 if(busy||editing||!window.ARCTrainingBridge)return;
 busy=true;
 try{
  const data=window.ARCTrainingBridge.snapshot(),signature=JSON.stringify([data,selectedWindow,previewReport]);
  const progress=document.getElementById('arcTrainingDoseMount'),plan=document.getElementById('arcTrainingOptimizerMount');
  if(!progress||!plan)return;
  if(signature===signatureOld&&progress.childElementCount&&plan.childElementCount)return;
  signatureOld=signature;
  const s=data.reports.find(x=>x.days===selectedWindow),r=previewReport||data.report||{selected:'Existing training programme',reason:'No training optimization has been assessed yet',alternatives:[]};
  const last=data.reviewAt?new Date(data.reviewAt).toLocaleString():'No completed review recorded';
  const next=data.nextReview||'Next training week';
  progress.innerHTML=`<article class="arcTrainingCard"><div class="arcTrainingHead"><div><small>ACTUAL TRAINING STIMULUS</small><h3>What your recordings show</h3></div><span class="arcTrainingBadge">Recorded training dose</span></div>${lt1Card(data.lt1)}<label>Reporting window <select id="arcDoseWindow">${[7,28,84].map(n=>`<option value="${n}" ${n===selectedWindow?'selected':''}>Last ${n} days</option>`).join('')}</select></label><p><b>${minutes(s.totalSeconds)} minutes</b> across ${s.runs} runs. ${s.measuredRuns} contain detailed dose evidence; ${s.missingRuns} ${s.missingRuns===1?'has':'have'} unavailable detail.</p>${bars(s,'hr')}${bars(s,'power')}<p class="arcTrainingNote">Where a provisional automatic LT1 proxy is supported, saved HR histograms can be classified against it without recreating old raw records. Otherwise below-LT2 time stays unknown. Relative-CP power bands are not LT1/LT2. Recorded HR lags short intervals.</p><details><summary>Recent activity evidence · actual sensor coverage</summary>${data.recent.map(doseEvidenceHtml).join('')||'<p>No recorded activities.</p>'}</details></article>`;
  plan.innerHTML=`<article class="arcTrainingCard"><div class="arcTrainingHead"><div><small>COORDINATED TRAINING</small><h3>One plan, existing load and target authorities</h3></div><span class="arcTrainingBadge">${escape(data.config.mode)}</span></div><div class="arcLt1Stats arcReviewStats"><div><small>Last review</small><b>${escape(last)}</b></div><div><small>Evidence through</small><b>${escape(data.reviewThrough||'Not reviewed')}</b></div><div><small>Next week starts</small><b>${escape(next)}</b></div></div><p><b>${previewReport?'Read-only preview — no workout changes':r.applied?'Applied to eligible future workouts':data.config.mode==='shadow'?'Shadow: programme unchanged':'No optimizer changes applied'}</b></p><p><b>${escape(r.selected||r.status||'Existing programme')}</b></p><p>${escape(r.reason||'')}</p><p class="arcTrainingNote">A completed-week review may keep your programme unchanged. Activity import measures intensity immediately. Active mode decides workout mix during due weekly reviews; the existing Distance & Load and Pace & Power engines remain authoritative. No clinical LT1 or guaranteed performance gain is claimed.</p>${r.changes?.length?`<h4>${r.applied&&!previewReport?'Applied changes':'Proposed changes — not applied'}</h4><ul class="arcChangeList">${changes(r)}</ul>`:''}<details><summary>Alternatives considered</summary>${(r.alternatives||[]).map(a=>`<p><b>${escape(a.name)}</b> · ${a.accepted?'Feasible':'Rejected'}<br>${escape(a.rejection||a.reason||'')}</p>`).join('')||'<p>No comparisons recorded yet.</p>'}</details><details id="arcTrainingControls"><summary>Optimization controls</summary><form id="arcTrainingForm"><label>Mode<select name="mode">${['off','shadow','active'].map(m=>`<option value="${m}" ${data.config.mode===m?'selected':''}>${m==='off'?'Off — original planner':m==='shadow'?'Shadow — compare only':'Active — apply feasible weekly changes'}</option>`).join('')}</select></label><p>All LT1 estimation happens automatically using recorded run data. No other-activity or talk-test fields are needed. The optimizer never raises weekly or session distance budgets and never rewrites completed workouts.</p><div class="arcTrainingActions"><button type="submit">Save optimizer mode</button><button type="button" id="arcPreviewTraining">Read-only preview</button><button type="button" id="arcDisableTraining">Disable optimizer</button></div></form></details><p id="arcTrainingMessage" role="status" aria-live="polite">${escape(feedbackText)}</p><p class="arcTrainingNote">Module ${escape(data.version)} · core ${escape(data.coreVersion)}. If measurements are insufficient, the original training plan remains in place. You can disable optimization at any time.</p></article>`;
  document.getElementById('arcDoseWindow').onchange=e=>{selectedWindow=Number(e.target.value);signatureOld='';populate();};
  const controls=document.getElementById('arcTrainingControls');controls.ontoggle=()=>{editing=controls.open;};
  document.getElementById('arcTrainingForm').onsubmit=e=>{
   e.preventDefault();const f=new FormData(e.target);const mode=f.get('mode');
   try{
    if(mode==='active'&&data.config.mode!=='active'&&!window.confirm('Enable automatic eligible future workout adjustments after weekly review? The current week and completed workouts remain frozen.'))return;
    window.ARCTrainingBridge.updateConfig({mode});editing=false;previewReport=null;signatureOld='';populate();notify('Optimizer mode saved. No LT1 input required.');
   }catch(error){notify(error.message||error,true);}
  };
  document.getElementById('arcPreviewTraining').onclick=()=>{try{previewReport=window.ARCTrainingBridge.preview();editing=false;signatureOld='';populate();notify('Read-only comparison evaluated. The plan was not changed.');}catch(e){notify(e.message,true);}};
  document.getElementById('arcDisableTraining').onclick=()=>{try{window.ARCTrainingBridge.updateConfig({mode:'off'});editing=false;previewReport=null;signatureOld='';populate();notify('Original future-plan generator restored.');}catch(e){notify(e.message,true);}};
 }catch(e){const m=document.getElementById('arcTrainingOptimizerMount');if(m&&!m.childElementCount)m.textContent='Training extension unavailable. The original application remains available.';console.warn('Training extension view unavailable',e);}
 finally{busy=false;}
}
function mounts(){
 for(const [selector,id]of [['#dashboard','arcTrainingDoseMount'],['#plan','arcTrainingOptimizerMount']]){
  const parent=document.querySelector(selector);if(parent&&!document.getElementById(id)){const div=document.createElement('div');div.id=id;div.className='arcTrainingMount';const anchor=selector==='#plan'?document.getElementById('planProgrammeHeader'):parent.querySelector('.progressReviewSlot');if(anchor)anchor.after(div);else parent.appendChild(div);}
 }
}
function refresh(){if(editing&&!document.getElementById('arcTrainingControls')?.open)editing=false;mounts();populate();}
function start(){
 refresh();let timer;
 const observer=new MutationObserver(events=>{if(events.every(e=>e.target.nodeType===1&&e.target.closest?.('.arcTrainingMount')))return;clearTimeout(timer);timer=setTimeout(refresh,180);});
 observer.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('arc-training-updated',()=>{previewReport=null;signatureOld='';setTimeout(refresh,0);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){signatureOld='';refresh();}});
}
if(typeof module==='object'&&module.exports)module.exports=Object.freeze({lt1Card,doseEvidenceHtml});
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
})();
