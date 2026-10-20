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
function lt1Card(e){
 const has=e?.status==='provisional'&&Number.isFinite(e.hr);
 const number=has?`${Math.round(e.hr)} bpm`:'Not established';
 const interval=has&&e.range?` · working range ${e.range[0]}–${e.range[1]} bpm`:'';
 return `<section class="arcAutoLt1" aria-label="Automatic LT1 assessment"><div class="arcAutoLt1Head"><div><small>AUTOMATIC AEROBIC BREAKPOINT</small><h4>LT1 estimate: ${escape(number)}</h4></div><span class="arcTrainingBadge">${has?'Provisional · low confidence':'Learning from runs'}</span></div><p>${escape(e?.reason||'Waiting for suitable run measurements.')}${interval}</p><div class="arcLt1Stats"><div><small>Suitable days</small><b>${Number(e?.days)||0}</b></div><div><small>Second-by-second HR</small><b>${Number(e?.streamDays)||0} days</b></div><div><small>Archived laps</small><b>${Number(e?.archivedDays)||0} days</b></div></div><p class="arcTrainingNote">Automatically processes every recorded HR sample during FIT/CSV import. Older lap averages are weaker evidence. Cardiac drift is not a direct lactate/ventilatory threshold test; this is an exploratory HR-based proxy, never a laboratory LT1 measurement. No manual LT1 or speech test needed.</p><details><summary>Observation details and estimation safeguards</summary>${(e?.observations||[]).slice(-14).map(o=>`<p><b>${escape(o.date)} · ${Number(o.hr).toFixed(0)} bpm</b> · HR/effort drift ${Number(o.driftPct).toFixed(1)}% · ${escape(o.method)}</p>`).join('')||'<p>No suitable observations yet.</p>'}<p>Requires at least six different days spanning 14 days, stable and elevated-drift observations at different HR levels, a compatible threshold-HR reference and no confounding red flags. The estimate stays unavailable if those conditions are absent. Heat, fatigue and hills can affect drift.</p></details></section>`;
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
  progress.innerHTML=`<article class="arcTrainingCard"><div class="arcTrainingHead"><div><small>ACTUAL TRAINING STIMULUS</small><h3>What your recordings show</h3></div><span class="arcTrainingBadge">Recorded training dose</span></div>${lt1Card(data.lt1)}<label>Reporting window <select id="arcDoseWindow">${[7,28,84].map(n=>`<option value="${n}" ${n===selectedWindow?'selected':''}>Last ${n} days</option>`).join('')}</select></label><p><b>${minutes(s.totalSeconds)} minutes</b> across ${s.runs} runs. ${s.measuredRuns} contain detailed dose evidence; ${s.missingRuns} ${s.missingRuns===1?'has':'have'} unavailable detail.</p>${bars(s,'hr')}${bars(s,'power')}<p class="arcTrainingNote">Where a provisional automatic LT1 proxy is supported, saved HR histograms can be classified against it without recreating old raw records. Otherwise below-LT2 time stays unknown. Relative-CP power bands are not LT1/LT2. Recorded HR lags short intervals.</p><details><summary>Recent activity evidence</summary>${data.recent.map(a=>`<section class="arcEvidenceRun"><b>${escape(a.date)} · ${escape(a.type)}</b><p>${escape(window.ARCTrainingDose?.doseMatchesActivity(a,a.trainingDose)?a.trainingDose.confidence:'Detailed recording unavailable or activity edited')}</p><p>${escape(a.trainingDose?.flags?.join(' · ')||'New detailed imports create measurement evidence.')}</p></section>`).join('')||'<p>No recorded activities.</p>'}</details></article>`;
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
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
