(()=>{'use strict';
const PAGE={
 today:{k:'TODAY',title:'Execute today',sub:'One decision first: what to do, how to do it, and what could change it.',verb:'EXECUTE',icon:'M6 19l4-8 3 3 5-9M4 19h16'},
 plan:{k:'PROGRAMME',title:'Build the race',sub:'Programme architecture, this week’s purpose, key sessions and adaptive changes.',verb:'BUILD',icon:'M4 6h16M7 3v6m10-6v6M5 10h14v10H5z'},
 runs:{k:'TRAINING LOG',title:'Turn training into evidence',sub:'Log the work, inspect execution, and understand what the model learned.',verb:'LEARN',icon:'M4 19h16M6 16l4-4 3 2 5-7'},
 dashboard:{k:'PERFORMANCE',title:'Is the training working?',sub:'Race trajectory first. Fitness, durability, consistency and execution explain why.',verb:'PROGRESS',icon:'M4 18V9m5 9V5m5 13v-7m5 7V3'},
 recovery:{k:'RECOVERY',title:'Can you absorb the work?',sub:'Readiness decision first. HRV, pain, load and history sit underneath as evidence.',verb:'ABSORB',icon:'M4 13h4l2-6 4 12 2-6h4'},
 shoes:{k:'ROTATION',title:'Manage the shoe system',sub:'Next-run choice, active rotation, lifecycle, replacement and race-day readiness.',verb:'ROTATE',icon:'M5 17c4 0 6-7 8-10 1 5 3 7 6 8v3H5z'},
 injury:{k:'RETURN TO RUN',title:'Recover with direction',sub:'Restriction, today’s rehab, progression gates and return-to-running trajectory.',verb:'RETURN',icon:'M12 3v18M3 12h18'},
 race:{k:'RACE DAY',title:'Convert fitness into execution',sub:'Current capability, pacing, physiological targets and race-day decisions.',verb:'EXECUTE',icon:'M5 20V4m0 1h10l-2 3 2 3H5'},
 coach:{k:'COACH',title:'Priorities, not noise',sub:'Evidence-backed conclusions, what matters next and why the model says so.',verb:'DECIDE',icon:'M4 5h16v11H8l-4 4z'},
 assessments:{k:'ASSESSMENTS',title:'Calibrate with evidence',sub:'Verified performances that improve future targets without rewriting history.',verb:'CALIBRATE',icon:'M12 3v18M3 12h18M7 7l10 10M17 7L7 17'},
 settings:{k:'ATHLETE MODEL',title:'Control the system',sub:'Configuration, data integrity and model settings with transparent consequences.',verb:'CONTROL',icon:'M12 8a4 4 0 100 8 4 4 0 000-8zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6L7 7m10 10l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4'}
};
const CALC_WORDS=/calcul|technical|score|evidence|prediction|confidence|factor|modifier|why|interpret|driver|source|details/i;
function svg(path){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`}
function q(sel,root=document){return root.querySelector(sel)}
function qa(sel,root=document){return [...root.querySelectorAll(sel)]}
function txt(sel,root=document){return (q(sel,root)?.textContent||'').trim().replace(/\s+/g,' ')}
function move(nodes,target){nodes.filter(Boolean).forEach(n=>target.appendChild(n))}
function mk(cls,tag='div'){let e=document.createElement(tag);e.className=cls;return e}
function header(page){if(q(':scope > .runnerHeader',page))return;const p=PAGE[page.id];if(!p)return;const h=mk('runnerHeader');h.innerHTML=`<div class="runnerHeaderIcon">${svg(p.icon)}</div><div class="runnerHeaderCopy"><small>${p.k}</small><h1>${p.title}</h1><p>${p.sub}</p></div><div class="runnerHeaderVerb">${p.verb}</div>`;page.prepend(h)}
function contextualStrip(page){if(q(':scope > .runnerContextStrip',page))return;let strip=mk('runnerContextStrip');strip.innerHTML='<span class="runnerContextLabel">ATHLETE CONTEXT</span><div class="runnerContextChips"></div>';page.insertBefore(strip,page.children[1]||null);refreshStrip(page)}
function refreshStrip(page){const host=q(':scope > .runnerContextStrip .runnerContextChips',page);if(!host)return;let candidates=[];
 const add=(label,value)=>{value=String(value||'').trim().replace(/\s+/g,' ');if(value&&value!=='—'&&value.length<70)candidates.push([label,value])};
 add('Phase',txt('#phaseBadge'));
 add('Race',txt('#raceTitle'));
 add('Today',txt('#todayDate'));
 add('Week',txt('#weekHeader'));
 if(page.id==='recovery')add('Status',txt('#recoveryStatus strong'));
 if(page.id==='shoes')add('Next pair',txt('#shoesContent strong'));
 const seen=new Set();candidates=candidates.filter(x=>{let k=x.join('|');if(seen.has(k))return false;seen.add(k);return true}).slice(0,4);
 host.innerHTML=candidates.length?candidates.map(([l,v])=>`<span><small>${l}</small><b>${v}</b></span>`).join(''):'<span><small>STATE</small><b>Live athlete data</b></span>';
}
function wrapOnce(page,key,cls,nodes){if(q(`[data-runner-wrap="${key}"]`,page))return q(`[data-runner-wrap="${key}"]`,page);const list=nodes.filter(n=>n&&n.parentElement===page);if(!list.length)return null;const w=mk(cls);w.dataset.runnerWrap=key;page.insertBefore(w,list[0]);move(list,w);return w}
function restructure(page){
 if(page.dataset.runnerStructured)return;
 page.dataset.runnerStructured='1';
 const oldTitles=qa(':scope > .sectionTitle,:scope > .progressPageTitle,:scope > .recoveryPageTitle,:scope > .raceDayPageTitle',page);oldTitles.forEach(x=>x.classList.add('runnerLegacyTitle'));
 if(page.id==='today'){
  wrapOnce(page,'today-main','runnerTodayLayout',[q('#todayCard',page),q('#todayCoach',page)]);
 }
 if(page.id==='plan'){
  wrapOnce(page,'plan-overview','runnerPlanOverview',[q('#planProgrammeHeader',page),q('.promotedTimelinePanel',page)]);
  wrapOnce(page,'plan-week','runnerWeekWorkspace',[q('.planWeekNavWrap',page),q('.planWeekSection',page)]);
  const rest=qa(':scope > .planSection',page);wrapOnce(page,'plan-adapt','runnerPlanAdaptation',rest);
 }
 if(page.id==='runs'){
  wrapOnce(page,'log-entry','runnerLogEntry',[q('#logHero',page),q('.logActionCard',page),q('#importPreview',page),q('#manualRun',page)]);
  wrapOnce(page,'log-history','runnerLogHistory',[q('.logSectionHead',page),q('#runList',page),q('.logDataGuide',page)]);
 }
 if(page.id==='dashboard'){
  wrapOnce(page,'progress-decision','runnerProgressDecision',[q('.outlookHero',page),q('.progressSection.level1',page),q('.progressReviewSlot',page)]);
  const rest=qa(':scope > .progressSection',page);wrapOnce(page,'progress-evidence','runnerEvidenceGrid',rest);
 }
 if(page.id==='recovery'){
  const sections=qa(':scope > .recoverySection',page);wrapOnce(page,'recovery-decision','runnerRecoveryDecision',sections.slice(0,2));
  wrapOnce(page,'recovery-evidence','runnerEvidenceGrid',sections.slice(2));
 }
 if(page.id==='race'){
  const sections=qa(':scope > .raceDaySection',page);wrapOnce(page,'race-decision','runnerRaceDecision',sections.slice(0,2));
  wrapOnce(page,'race-evidence','runnerEvidenceGrid',sections.slice(2));
 }
 if(page.id==='coach'){
  wrapOnce(page,'coach-main','runnerCoachLayout',[q('#coachTop',page),...qa(':scope > article.panel',page)]);
 }
 if(page.id==='assessments'){
  wrapOnce(page,'assessment-main','runnerAssessmentLayout',[q('#assessmentForm',page),q('#assessmentList',page)]);
 }
 if(page.id==='injury'){
  wrapOnce(page,'injury-main','runnerInjuryLayout',[q('#injuryIntro',page),q('#injuryList',page)]);
 }
 if(page.id==='shoes'){
  q('#shoesContent',page)?.classList.add('runnerShoesWorkspace');
 }
 if(page.id==='settings'){
  const kids=qa(':scope > *',page).filter(n=>!n.classList.contains('runnerHeader')&&!n.classList.contains('runnerContextStrip')&&!n.classList.contains('runnerLegacyTitle'));
  wrapOnce(page,'settings-main','runnerSettingsWorkspace',kids);
 }
}
function metricSnapshot(scope){let out=[];const nodes=qa('strong,b',scope).filter(el=>!el.closest('summary')&&!el.closest('.runnerCalcDisclosure'));for(const el of nodes){let value=(el.textContent||'').trim().replace(/\s+/g,' ');if(!value||value.length>38)continue;let p=el.parentElement;let label='';for(const cand of [...(p?.querySelectorAll('small,label,span')||[])]){if(cand===el||cand.contains(el))continue;let s=(cand.textContent||'').trim().replace(/\s+/g,' ');if(s&&s!==value&&s.length<60){label=s;break}}if(!label)continue;out.push([label,value]);if(out.length>=8)break}return out}
function calcDisclosure(scope,i){if(q(':scope > .runnerCalcDisclosure',scope))return;const builtins=qa('details',scope).filter(d=>!d.classList.contains('runnerCalcDisclosure')&&CALC_WORDS.test(txt('summary',d))).slice(0,8);const vals=metricSnapshot(scope);if(!builtins.length&&!vals.length)return;const d=mk('runnerCalcDisclosure','details');const title=txt('h2,h3,h4',scope)||`Section ${i+1}`;d.innerHTML=`<summary><span><small>TRANSPARENCY</small><b>How ${title.slice(0,52)} is derived</b></span></summary><div class="runnerCalcBody">${vals.length?`<div class="runnerCalcValues">${vals.map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>`:''}<p>The values above are the live outputs already produced by the existing application engine. The underlying calculation is not duplicated or replaced by this interface.</p>${builtins.length?`<div class="runnerCalcLinks">${builtins.map((x,j)=>{if(!x.id)x.id=`runner-calc-${scope.closest('.page')?.id||'page'}-${i}-${j}`;return `<button type="button" data-calc-open="${x.id}">${txt('summary',x).slice(0,72)}</button>`}).join('')}</div>`:'<p class="runnerCalcNote">No separate technical formula disclosure exists inside this rendered component; the displayed result remains the direct engine output.</p>'}</div>`;scope.appendChild(d)}
function transparency(page){const zones=qa(':scope > [data-runner-wrap],:scope > .runnerShoesWorkspace',page);(zones.length?zones:[page]).forEach((z,i)=>calcDisclosure(z,i));qa('[data-calc-open]',page).forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.onclick=()=>{let d=document.getElementById(b.dataset.calcOpen);if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'})}}})}
function enhance(){qa('section.page').forEach(p=>{header(p);contextualStrip(p);restructure(p);transparency(p);refreshStrip(p)});document.body.classList.add('runnerExperience')}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
