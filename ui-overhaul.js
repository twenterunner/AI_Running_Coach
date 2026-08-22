(()=>{'use strict';
const purpose={
 today:['TODAY','Execute the right session','Your prescription, readiness context and the one coaching decision that matters now.','EXECUTE'],
 plan:['PROGRAMME','Build toward race day','See the training architecture, this week’s purpose and only the adaptations that change execution.','BUILD'],
 runs:['TRAINING LOG','Turn sessions into evidence','Record the work, inspect execution quality and see what the model learned from it.','LEARN'],
 dashboard:['PROGRESS','Is the training working?','Race trajectory first, then fitness, durability, consistency and execution evidence.','PROGRESS'],
 recovery:['RECOVERY','Can you absorb today’s work?','Readiness first; HRV, pain, load and recovery history explain the decision underneath.','ABSORB'],
 shoes:['SHOE ROTATION','Use the right shoe at the right time','Next-run choice, active rotation, lifecycle and replacement actions in runner priority order.','ROTATE'],
 injury:['RETURN TO RUN','Protect recovery without losing direction','Current restriction, today’s rehab action and the gates back to unrestricted running.','RETURN'],
 race:['RACE DAY','Convert fitness into execution','Current capability, pacing and race-day actions using the existing race model.','EXECUTE'],
 coach:['COACH','Turn evidence into priorities','The highest-value conclusions and actions from the data the app can actually verify.','DECIDE'],
 assessments:['ASSESSMENTS','Calibrate with valid evidence','Add verified performances that can improve future targets without rewriting history.','CALIBRATE'],
 settings:['SETTINGS','Control the athlete model','Configuration, data integrity and model diagnostics without hiding how the app is configured.','CONTROL']};
function hero(page){if(page.querySelector(':scope > .uiPurposeHero'))return;let p=purpose[page.id];if(!p)return;let el=document.createElement('div');el.className='uiPurposeHero';el.innerHTML=`<div><small>${p[0]}</small><h2>${p[1]}</h2><p>${p[2]}</p></div><div class="uiHeroCue">${p[3]} → EVIDENCE → DETAIL</div>`;page.prepend(el)}
function calcIndex(page){if(page.querySelector(':scope > .uiCalcIndex'))return;let details=[...page.querySelectorAll('details')].filter(d=>!d.classList.contains('uiCalcIndex'));let el=document.createElement('details');el.className='uiCalcIndex';let links=details.slice(0,12).map((d,i)=>{if(!d.id)d.id=`ui-detail-${page.id}-${i}`;let t=(d.querySelector('summary')?.innerText||`Detail ${i+1}`).trim().replace(/\s+/g,' ');return `<button type="button" class="secondary" data-open-detail="${d.id}">${t.slice(0,52)}</button>`}).join('');el.innerHTML=`<summary><span><b>Calculation & evidence transparency</b><br><small>Open the existing model evidence and calculation detail</small></span></summary><div class="uiCalcBody"><b>No calculation engine is duplicated here.</b> This index opens the app’s existing calculation, evidence and model-detail foldouts on this screen, so the displayed result stays tied to the same underlying engine.${links?`<div class="uiCalcLinks">${links}</div>`:'<p>No additional calculation foldout is rendered in this state.</p>'}</div>`;page.append(el)}
function enhance(){document.querySelectorAll('section.page').forEach(p=>{hero(p);calcIndex(p)});document.querySelectorAll('[data-open-detail]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.addEventListener('click',()=>{let d=document.getElementById(b.dataset.openDetail);if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'})}})})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});
})();
