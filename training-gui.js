/* Additive interface: does not replace or intercept core renderers. */
(function(){'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const minutes=s=>(Number(s||0)/60).toFixed(1);
const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
let selectedWindow=28,busy=false,oldData='',editing=false;
function bars(summary,key){
 const x=summary[key],total=summary.totalSeconds||0,names={low:'Low',moderate:'Moderate',high:'High',unknown:'Unknown'};
 return `<h4>${key==='hr'?'Heart-rate threshold zones':'Relative-CP power bands'}</h4><div class="arcDoseBar" role="img" aria-label="${escape(key)} training time including unknown time">${Object.keys(names).map(k=>`<span class="arcDose-${k}" style="flex:${total?x.seconds[k]/total:0}" title="${names[k]}: ${minutes(x.seconds[k])} min"></span>`).join('')}</div><div class="arcDoseLegend">${Object.keys(names).map(k=>`<span><i class="arcDose-${k}"></i>${names[k]} <b>${minutes(x.seconds[k])} min</b> ${total?Math.round(x.seconds[k]/total*100):0}%</span>`).join('')}</div>`;
}
function changes(report){return (report?.changes||[]).map(c=>`<li><small>${escape(c.date||c.id)}</small><br><b>${escape(c.type)}</b> · ${Number(c.distance).toFixed(1)} km<br>${escape(c.reason)}</li>`).join('');}
function feedback(text,bad=false){const e=document.getElementById('arcTrainingMessage');if(e){e.textContent=text;e.setAttribute('role',bad?'alert':'status');}}
function populate(){
 if(busy||editing||!window.ARCTrainingBridge)return;
 busy=true;
 try{
  const data=window.ARCTrainingBridge.snapshot(),signature=JSON.stringify([data,selectedWindow]);
  const progress=document.getElementById('arcTrainingDoseMount'),plan=document.getElementById('arcTrainingOptimizerMount');
  if(!progress||!plan)return;
  if(signature===oldData&&progress.childElementCount&&plan.childElementCount)return;
  oldData=signature;
  const s=data.reports.find(x=>x.days===selectedWindow),r=data.report||{selected:'Preview available',reason:'No coordinated review saved yet',alternatives:[]};
  progress.innerHTML=`<article class="arcTrainingCard"><div class="arcTrainingHead"><div><small>ACTUAL TRAINING STIMULUS</small><h3>What your recordings show</h3></div><span class="arcTrainingBadge">Recorded training dose</span></div><label>Reporting window <select id="arcDoseWindow">${[7,28,84].map(n=>`<option value="${n}" ${n===selectedWindow?'selected':''}>Last ${n} days</option>`).join('')}</select></label><p><b>${minutes(s.totalSeconds)} minutes</b> across ${s.runs} runs. ${s.measuredRuns} contain detailed dose evidence; ${s.missingRuns} ${s.missingRuns===1?'has':'have'} unavailable detail.</p>${bars(s,'hr')}${bars(s,'power')}<p class="arcTrainingNote">Heart-rate zones and relative-power bands are different measurements. Power boundaries are policy bands at 80% and 100% of dated CP, not measured LT1/LT2. Unknown time is never assumed easy. Missing historical streams are not reconstructed.</p><details><summary>Recent activity evidence and limitations</summary>${data.recent.map(a=>`<section class="arcEvidenceRun"><b>${escape(a.date)} · ${escape(a.type)}</b><p>${escape(window.ARCTrainingDose?.doseMatchesActivity(a,a.trainingDose)?a.trainingDose.confidence:'Detailed recording unavailable or activity edited')}</p><p>${escape(a.trainingDose?.flags?.join(' · ')||'New detailed imports create measurement evidence.')}</p></section>`).join('')||'<p>No recorded activities.</p>'}</details></article>`;
  plan.innerHTML=`<article class="arcTrainingCard"><div class="arcTrainingHead"><div><small>COORDINATED TRAINING</small><h3>One plan, existing load and target authorities</h3></div><span class="arcTrainingBadge">${escape(data.config.mode)}</span></div><p><b>${r.applied?'Applied to unlocked future workouts':data.config.mode==='shadow'?'Preview only — original plan unchanged':'No new optimizer changes applied'}</b></p><p>${escape(r.selected||r.status||'Existing programme')}</p><p>${escape(r.reason||'')}</p><p class="arcTrainingNote">Volume and targets still come from the existing engines. Optimizer reviews freeze the current training week and use completed-week evidence. No finish-time gain or success probability is claimed.</p>${r.changes?.length?`<h4>${r.applied?'Applied changes':'Proposed changes — not applied'}</h4><ul class="arcChangeList">${changes(r)}</ul>`:''}<details><summary>Compared alternatives</summary>${(r.alternatives||[]).map(a=>`<p><b>${escape(a.name)}</b> · ${a.accepted?'Feasible':'Rejected'}<br>${escape(a.rejection||a.reason||'')}</p>`).join('')||'<p>Run a read-only preview below.</p>'}</details><details id="arcTrainingControls"><summary>Controls, LT1 evidence and other sports</summary><form id="arcTrainingForm"><label>Mode<select name="mode">${['off','shadow','active'].map(m=>`<option value="${m}" ${data.config.mode===m?'selected':''}>${m==='off'?'Off — original planner':m==='shadow'?'Shadow — compare, do not change':'Active — apply feasible weekly changes'}</option>`).join('')}</select></label><p>Active mode uses conservative rules; marathon-performance benefits are not yet independently validated. It changes only unlocked future workouts, never raises session/weekly volume, and retains the original generator when evidence is insufficient or an error occurs.</p><div class="arcTrainingFields"><label>LT1 HR (optional)<input name="lt1Hr" type="number" min="60" max="210" value="${data.config.lt1Hr??''}" placeholder="Unknown"></label><label>LT1 evidence date<input name="lt1Date" type="date" value="${escape(data.config.lt1Date||'')}" max="${data.now}"></label></div><label>LT1 source<input name="lt1Source" maxlength="150" value="${escape(data.config.lt1Hr===null?'':data.config.lt1Source)}" placeholder="For example, an assessed ventilatory threshold"></label><p>Leave LT1 blank when unknown. Saving an LT1 value does not rewrite old completed dose records.</p><label>Other exercise (one per line)<textarea name="activities" rows="3" placeholder="Thursday | Tennis | 60 | 7">${escape(data.config.activities.map(a=>`${a.day} | ${a.name} | ${a.minutes} | ${a.rpe}`).join('\n'))}</textarea></label><p>Format: English weekday | activity | minutes | perceived exertion 1–10. This contributes to spacing decisions, not invented running kilometres.</p><div class="arcTrainingActions"><button type="submit">Save settings and rebuild future plan</button><button type="button" id="arcPreviewTraining">Read-only preview</button><button type="button" id="arcDisableTraining">Disable optimizer</button></div></form></details><p id="arcTrainingMessage" role="status" aria-live="polite"></p><p class="arcTrainingNote">Training extension ${escape(data.version)} · core ${escape(data.coreVersion)}. Turning off restores the legacy generator for unlocked future sessions. Completed prescriptions remain unchanged.</p></article>`;
  document.getElementById('arcDoseWindow').onchange=e=>{selectedWindow=Number(e.target.value);oldData='';populate();};
  const controls=document.getElementById('arcTrainingControls');controls.ontoggle=()=>{editing=controls.open;};
  document.getElementById('arcTrainingForm').onsubmit=e=>{
   e.preventDefault();const f=new FormData(e.target);
   try{
    const activities=String(f.get('activities')).split('\n').filter(x=>x.trim()).map(line=>{const p=line.split('|').map(s=>s.trim());if(p.length!==4||!DAY_NAMES.includes(p[0]))throw Error('Each activity needs: weekday | name | minutes | RPE');return{day:p[0],name:p[1],minutes:Number(p[2]),rpe:Number(p[3])};});
    const mode=f.get('mode');if(mode==='active'&&data.config.mode!=='active'&&!window.confirm('Enable candidate training changes? Current week and completed workouts stay frozen; unlocked future sessions may change.'))return;
    window.ARCTrainingBridge.updateConfig({mode,activities,lt1Hr:f.get('lt1Hr')||null,lt1Date:f.get('lt1Date')||null,lt1Source:f.get('lt1Source')});
    editing=false;oldData='';populate();feedback('Settings saved. Only unlocked future prescriptions can change.');
   }catch(error){feedback(error.message||error,true);}
  };
  document.getElementById('arcPreviewTraining').onclick=()=>{try{const p=window.ARCTrainingBridge.preview();feedback(`${p.selected}: ${p.reason}${p.changes?.length?' — '+p.changes.length+' proposed changes':''}`);}catch(e){feedback(e.message,true);}};
  document.getElementById('arcDisableTraining').onclick=()=>{try{window.ARCTrainingBridge.updateConfig({...data.config,mode:'off'});editing=false;oldData='';populate();feedback('Optimizer disabled. Original future-plan generator restored.');}catch(e){feedback(e.message,true);}};
 }catch(e){const m=document.getElementById('arcTrainingOptimizerMount');if(m&&!m.childElementCount){m.textContent='Training extension unavailable. The original application remains available.';}console.warn('Training extension view unavailable',e);}
 finally{busy=false;}
}
function mounts(){
 for(const [selector,id]of [['#dashboard','arcTrainingDoseMount'],['#plan','arcTrainingOptimizerMount']]){
  const parent=document.querySelector(selector);if(parent&&!document.getElementById(id)){const div=document.createElement('div');div.id=id;div.className='arcTrainingMount';const anchor=selector==='#plan'?document.getElementById('planProgrammeHeader'):parent.querySelector('.progressReviewSlot');if(anchor)anchor.after(div);else parent.appendChild(div);}
 }
}
function refresh(){if(editing&&!document.getElementById('arcTrainingControls')?.open)editing=false;mounts();populate();}
function start(){
 refresh();
 let timer;
 const observer=new MutationObserver(events=>{
  if(events.every(e=>e.target.nodeType===1&&e.target.closest?.('.arcTrainingMount')))return;
  clearTimeout(timer);timer=setTimeout(refresh,180);
 });
 observer.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('arc-training-updated',()=>{oldData='';setTimeout(refresh,0);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){oldData='';refresh();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
