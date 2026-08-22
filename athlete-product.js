(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const txt = (id) => ($(id)?.innerText || '').replace(/\s+/g, ' ').trim();
  const qtxt = (sel) => (document.querySelector(sel)?.textContent || '').replace(/\s+/g,' ').trim();
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (s, re, fallback='—') => { const m=String(s||'').match(re); return m ? (m[1]||m[0]).trim() : fallback; };
  const icon = (name) => ({
    today:'<svg viewBox="0 0 24 24"><path d="M4 13h4l2-6 4 12 2-6h4"/><circle cx="12" cy="12" r="9"/></svg>',
    training:'<svg viewBox="0 0 24 24"><path d="M4 18V8m5 10V4m5 14v-7m5 7V6"/><path d="M2 20h20"/></svg>',
    performance:'<svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 3 7-8"/><path d="M15 7h4v4"/><path d="M3 21h18"/></svg>',
    recovery:'<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 0 2-5"/><path d="M5 4v5h5"/><path d="M12 8v4l3 2"/></svg>',
    log:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8m-8 4h8m-8 4h5"/></svg>',
    shoes:'<svg viewBox="0 0 24 24"><path d="M3 14c3 0 5-1 7-4l2 2c2 2 4 3 8 3h1v3H6c-2 0-3-1-3-4z"/><path d="M10 11l3 2M7 13l3 2"/></svg>',
    injury:'<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></svg>',
    race:'<svg viewBox="0 0 24 24"><path d="M5 21V3M5 4h12l-3 4 3 4H5"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/></svg>',
    chevron:'<svg viewBox="0 0 24 24"><path d="M8 10l4 4 4-4"/></svg>'
  }[name] || '');

  function metric(label, value, meta='', tone='') {
    return `<div class="v20-metric ${tone}"><span>${esc(label)}</span><strong>${esc(value || '—')}</strong>${meta?`<small>${esc(meta)}</small>`:''}</div>`;
  }
  function sectionHead(kicker,title,sub='') {
    return `<div class="v20-section-head"><div><span>${esc(kicker)}</span><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div></div>`;
  }
  function pageHero(iconName,kicker,title,sub='') {
    return `<header class="v20-page-hero"><div class="v20-hero-icon">${icon(iconName)}</div><div><span>${esc(kicker)}</span><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div></header>`;
  }
  function detailsShell(legacy) {
    const d=document.createElement('details'); d.className='v20-deep';
    const s=document.createElement('summary'); s.innerHTML=`<span><b>All data, calculations & model evidence</b><small>Every underlying value, rule, explanation and technical control</small></span>${icon('chevron')}`;
    d.append(s, legacy); return d;
  }
  function take(id){ const n=$(id); if(n) n.classList.add('v20-taken'); return n; }
  function move(parent, ...nodes){ nodes.filter(Boolean).forEach(n=>parent.appendChild(n)); }

  function makeLegacy(page){
    const legacy=document.createElement('div'); legacy.className='v20-legacy';
    [...page.childNodes].forEach(n=>legacy.appendChild(n));
    page.appendChild(legacy); // keep engine output IDs queryable while the new view is composed
    return legacy;
  }

  function buildToday(page, legacy){
    const s=txt('todayCard');
    const priority=read(s,/TODAY'S PRIORITY\s+(.+?)(?=TODAY’S FOCUS|TODAY'S FOCUS)/i,'Today');
    const focus=read(s,/TODAY[’']S FOCUS\s+([^\d]+?)(?=\d|READINESS)/i,'Training');
    const dist=read(s,/(\d+(?:\.\d+)?\s*km)\s*·/i,'— km');
    const pace=read(s,/PACE\s+([^\s]+\/km)/i,'—');
    const power=read(s,/POWER\s+(\d+\s*W)/i,'—');
    const hr=read(s,/HEART RATE\s+(\d+\s*bpm)/i,'—');
    const ready=read(s,/READINESS\s+(Normal|Restricted|Reduced|High|Low|Recovered)/i,'Normal');
    const pain=read(s,/PAIN \/ INJURY\s+([^\s]+)/i,'—');
    const shoe='Automatic';
    const view=document.createElement('div'); view.className='v20-view v20-today';
    view.innerHTML=`${pageHero('today','EXECUTE','Today','One decision. One session. Everything else stays out of the way.')}
      <section class="v20-workout-hero">
        <div class="v20-workout-copy"><span class="v20-kicker">TODAY'S SESSION</span><h2>${esc(focus)}</h2><p>${esc(priority)}</p></div>
        <div class="v20-workout-distance">${esc(dist)}</div>
        <div class="v20-target-grid">${metric('Pace',pace,'prescribed target')}${metric('Power',power,'prescribed target')}${metric('Heart rate',hr,'ceiling / target')}</div>
        <div class="v20-session-strip" aria-label="Workout structure"><i class="wu"></i><i class="main"></i><i class="rec"></i><i class="main"></i><i class="rec"></i><i class="main"></i><i class="cd"></i><span>WU</span><span>WORK</span><span>CD</span></div>
      </section>
      <section class="v20-decision-row"><div class="v20-decision ${/normal|recovered/i.test(ready)?'good':'warn'}"><span>READINESS</span><strong>${esc(ready)}</strong><small>Training decision from current recovery evidence</small></div>${metric('Pain / restriction',pain,'current constraint')}${metric('Shoe',shoe,'engine recommendation below')}</section>
      ${sectionHead('COACHING','What matters today','The detailed prescription, recovery rationale and shoe logic remain one tap away.')}`;
    const todayCard=take('todayCard'); if(todayCard){todayCard.classList.add('v20-coach-source'); view.appendChild(todayCard)}
    view.appendChild(detailsShell(legacy)); page.appendChild(view);
  }

  function buildPlan(page, legacy){
    const p=txt('planProgrammeHeader');
    const phase=read(qtxt('#planProgrammeHeader .planRaceHead p'),/km\s*·\s*([^·]+?)\s*·/i,'Current phase');
    const weeks=qtxt('#planProgrammeHeader .planRaceCountdown')||read(p,/(\d+)\s*weeks/i,'—');
    const target=qtxt('#planProgrammeHeader .planRaceMetrics span:nth-child(1) b')||'—';
    const current=qtxt('#planProgrammeHeader .planRaceMetrics span:nth-child(2) b')||'—';
    const weekly=qtxt('#weekHeader .weekOverviewMetrics span:nth-child(1) b')||'—';
    const sessions=qtxt('#weekHeader .weekOverviewMetrics span:nth-child(2) b')||'—';
    const longrun=qtxt('#weekHeader .weekOverviewMetrics span:nth-child(3) b')||'—';
    const view=document.createElement('div');view.className='v20-view v20-plan';
    view.innerHTML=`${pageHero('training','TRAIN','Training','Periodised structure first. Individual sessions second.')}
      <section class="v20-programme-hero"><div><span>PROGRAMME POSITION</span><h2>${esc(phase)}</h2><p>${esc(weeks)} to race day</p></div><div class="v20-race-pair">${metric('Target',target)}${metric('Current estimate',current)}</div></section>
      <section class="v20-week-summary">${sectionHead('THIS WEEK','Training objective','See the week as one coordinated stimulus, not seven unrelated cards.')}<div class="v20-inline-metrics">${metric('Planned',weekly)}${metric('Runs',sessions)}${metric('Longest',longrun)}</div></section>`;
    const timeline=take('raceTimeline'); if(timeline){const wrap=document.createElement('section');wrap.className='v20-timeline';wrap.innerHTML=sectionHead('PROGRAMME','Build to race day');wrap.appendChild(timeline);view.appendChild(wrap)}
    const planCards=take('planCards'); if(planCards){const wrap=document.createElement('section');wrap.className='v20-week-workbench';wrap.innerHTML=sectionHead('SESSIONS','This week','Select a session for the full prescription.');wrap.appendChild(planCards);view.appendChild(wrap)}
    const review=take('weeklyReview');if(review){const d=document.createElement('details');d.className='v20-analysis';d.innerHTML='<summary><span><b>Plan adaptation</b><small>What the model is changing and why</small></span></summary>';d.appendChild(review);view.appendChild(d)}
    view.appendChild(detailsShell(legacy)); page.appendChild(view);
  }

  function buildLog(page,legacy){
    const h=txt('logHero');
    const runs=read(h,/RUNS LOGGED\s*(\d+)/i,'0'), matched=read(h,/MATCHED TO PLAN\s*(\d+)/i,'0');
    const view=document.createElement('div');view.className='v20-view v20-log';
    view.innerHTML=`${pageHero('log','REVIEW','Training log','Every run should answer: what happened, what did it prove, what changes next?')}
      <section class="v20-log-top"><div class="v20-log-stats">${metric('Runs logged',runs)}${metric('Matched to plan',matched)}</div></section>`;
    const action=legacy.querySelector('.logActionCard'); if(action){action.classList.add('v20-capture');view.appendChild(action)}
    const preview=take('importPreview'), manual=take('manualRun'); move(view,preview,manual);
    const list=take('runList'); if(list){const wrap=document.createElement('section');wrap.className='v20-feed';wrap.innerHTML=sectionHead('ACTIVITY FEED','Recent training','Execution, physiology and model learning in chronological order.');wrap.appendChild(list);view.appendChild(wrap)}
    view.appendChild(detailsShell(legacy));page.appendChild(view);
  }

  function buildPerformance(page,legacy){
    const curRaw=txt('currentProbability')||'—', projRaw=txt('projectedProbability')||'—';
    const currentT=/:/.test(curRaw)?curRaw:(read(txt('currentPrediction'),/(\d+:\d{2}:\d{2})/,'—'));
    const projectedT=/:/.test(projRaw)?projRaw:(read(txt('projectedPrediction'),/(\d+:\d{2}:\d{2})/,'—'));
    const curDesc=txt('currentPrediction'), projDesc=txt('projectedPrediction');
    const currentP=/%/.test(curDesc)?read(curDesc,/(\d+%)/,'—'):'Building';
    const projectedP=/%/.test(projDesc)?read(projDesc,/(\d+%)/,'—'):'Building';
    const eff=qtxt('#metricKpis .kpi:nth-child(1) strong')||'—';
    const drift=qtxt('#metricKpis .kpi:nth-child(3) strong')||'—';
    const lr=qtxt('#longRunSummary strong')||'—', weekly=qtxt('#weeklyDistanceSummary strong')||'—';
    const view=document.createElement('div');view.className='v20-view v20-performance';
    view.innerHTML=`${pageHero('performance','IMPROVE','Performance','One story: race trajectory → fitness → durability → training response.')}
      <section class="v20-race-outlook"><div class="v20-outlook-main"><span>RACE OUTLOOK</span><strong>${esc(currentT)}</strong><small>current capability</small></div><div class="v20-prob-flow ${currentP==='Building'?'building':''}"><div><b>${esc(currentP)}</b><span>target chance today</span></div><i>→</i><div><b>${esc(projectedP)}</b><span>programme scenario</span></div></div><div class="v20-projected-time"><span>Projected outcome</span><b>${esc(projectedT)}</b></div></section>
      <section class="v20-signal-strip">${metric('Efficiency',eff,'J/beat · higher is better')}${metric('Durability',drift,'cardiac drift · lower is better')}${metric('Long run',lr,'endurance exposure')}${metric('Weekly load',weekly,'planned vs completed')}</section>`;
    const chart=take('predictionChartMount'), canvas=take('predictionChart'); if(chart||canvas){const w=document.createElement('section');w.className='v20-primary-chart';w.innerHTML=sectionHead('TRAJECTORY','Race readiness over time','Current estimate, target and programme direction.');move(w,chart,canvas);view.appendChild(w)}
    const duo=document.createElement('section');duo.className='v20-chart-grid';duo.innerHTML=sectionHead('PHYSIOLOGY','Fitness & durability','Comparable evidence, not isolated pace.');
    const e=take('efficiencyChartMount'),ec=take('efficiencyChart'),d=take('driftChartMount'),dc=take('driftChart');
    if(e||ec){const x=document.createElement('article');x.className='v20-chart-card';x.innerHTML='<h3>Running efficiency</h3><p>External work per heartbeat</p>';move(x,e,ec);duo.appendChild(x)}
    if(d||dc){const x=document.createElement('article');x.className='v20-chart-card';x.innerHTML='<h3>Aerobic durability</h3><p>Power-to-heart-rate drift</p>';move(x,d,dc);duo.appendChild(x)}
    view.appendChild(duo);
    const lrC=take('longRunChartMount')||take('longRunChart'), vol=take('volumeChartMount')||take('volumeChart');
    const load=document.createElement('section');load.className='v20-chart-grid v20-load-grid';load.innerHTML=sectionHead('TRAINING RESPONSE','Durability & load','What the programme is building and what you are actually completing.');
    if(lrC){const x=document.createElement('article');x.className='v20-chart-card';x.innerHTML='<h3>Long-run progression</h3>';x.appendChild(lrC);load.appendChild(x)}
    if(vol){const x=document.createElement('article');x.className='v20-chart-card';x.innerHTML='<h3>Weekly distance</h3>';x.appendChild(vol);load.appendChild(x)}
    view.appendChild(load);
    const execution=take('progressExecution');if(execution){const w=document.createElement('section');w.className='v20-analysis-block';w.innerHTML=sectionHead('EXECUTION','Are sessions delivering the intended stimulus?');w.appendChild(execution);view.appendChild(w)}
    const adaptation=take('progressAdaptationHome'), personal=take('personalResponseModel');if(adaptation||personal){const d=document.createElement('details');d.className='v20-analysis';d.innerHTML='<summary><span><b>What the model is learning</b><small>Pace & Power, Distance & Load and personal response</small></span></summary>';move(d,adaptation,personal);view.appendChild(d)}
    view.appendChild(detailsShell(legacy));page.appendChild(view);
  }

  function buildRecovery(page,legacy){
    const s=txt('recoveryStatus');
    const status=read(s,/CURRENT STATUS\s*([^\n]+?)(?=Recovery evidence|No HRV|READINESS)/i,'Recovery status');
    const mod=read(s,/READINESS\s*([\d.]+)/i,'—');
    const hrv=read(s,/HRV\s*([^\s]+(?:\s*ms)?)/i,'—');
    const pain=read(s,/PAIN\s*([^\s]+)/i,'—');
    const view=document.createElement('div');view.className='v20-view v20-recovery';
    view.innerHTML=`${pageHero('recovery','ABSORB','Recovery','Start with the training decision, then inspect the evidence.')}
      <section class="v20-readiness-hero"><div class="v20-readiness-ring"><span></span><b>${esc(mod)}</b></div><div><span>CURRENT DECISION</span><h2>${esc(status)}</h2><p>${esc(read(s,/WHAT THIS MEANS NOW\s*(.+)$/i,'Recovery evidence is interpreted against your own baseline.'))}</p></div></section>
      <section class="v20-signal-strip">${metric('HRV',hrv,'personal baseline signal')}${metric('Pain',pain,'physical restriction')}${metric('Modifier',mod,'temporary training adjustment')}</section>`;
    const statusNode=take('recoveryStatus');if(statusNode){statusNode.classList.add('v20-detail-source');}
    const driverGrid=document.createElement('section');driverGrid.className='v20-recovery-grid';driverGrid.innerHTML=sectionHead('DRIVERS','Why the engine reached this decision');
    ['recoveryDrivers','recoveryHrv','recoveryPain','recoveryAbsorption'].forEach(id=>{const n=take(id);if(n){const a=document.createElement('article');a.className='v20-recovery-panel';a.appendChild(n);driverGrid.appendChild(a)}});view.appendChild(driverGrid);
    const history=take('recoveryHistory'), load=take('recoveryLoad');if(history||load){const w=document.createElement('section');w.className='v20-analysis-block';w.innerHTML=sectionHead('TREND','Recovery in training context','Recent readiness and training exposure together.');move(w,history,load);view.appendChild(w)}
    if(statusNode) legacy.prepend(statusNode);
    view.appendChild(detailsShell(legacy));page.appendChild(view);
  }

  function buildShoes(page,legacy){
    const view=document.createElement('div');view.className='v20-view v20-shoes';
    view.innerHTML=`${pageHero('shoes','EQUIP','Shoes','Rotation coverage, next-run choice and replacement horizon in one workspace.')}`;
    const content=take('shoesContent'); if(content){content.classList.add('v20-shoe-workspace');view.appendChild(content)}
    view.appendChild(detailsShell(legacy));page.appendChild(view);
  }

  function buildInjury(page,legacy){
    const view=document.createElement('div');view.className='v20-view v20-injury';
    view.innerHTML=`${pageHero('injury','PROGRESS','Injury & rehab','Restriction → today’s rehabilitation → return-to-run gate → full training.')}`;
    const intro=take('injuryIntro'), list=take('injuryList');move(view,intro,list);
    view.appendChild(detailsShell(legacy));page.appendChild(view);
  }

  function buildRace(page,legacy){
    const s=txt('raceStatus');
    const target=read(s,/TARGET\s+([\d:]+)/i,'—'), current=read(s,/CURRENT ESTIMATE\s+([\d:]+)/i,'—'), chance=read(s,/TARGET CHANCE\s+([^\s]+)/i,'—');
    const view=document.createElement('div');view.className='v20-view v20-race';
    view.innerHTML=`${pageHero('race','RACE','Race day','Turn fitness into an execution plan you can use on the start line.')}
      <section class="v20-race-card"><div>${metric('Target',target,'goal time')}${metric('Current model',current,'current capability')}</div><div class="v20-race-chance"><span>TARGET CHANCE</span><strong>${esc(chance)}</strong></div></section>`;
    ['raceExecution','racePacing','racePower','raceEffort','raceFuel','raceEvidence','raceEndurance'].forEach((id,i)=>{const n=take(id);if(n){const w=document.createElement(i<3?'section':'details');w.className=i<3?'v20-race-section':'v20-analysis';if(i>=3)w.innerHTML=`<summary><span><b>${['Effort','Fuel & hydration','Why this strategy','Endurance context'][i-3]}</b><small>Open detailed race guidance</small></span></summary>`;w.appendChild(n);view.appendChild(w)}});
    view.appendChild(detailsShell(legacy));page.appendChild(view);
  }

  function buildSettings(page,legacy){
    const view=document.createElement('div');view.className='v20-view v20-settings';
    view.innerHTML=`${pageHero('settings','CONFIGURE','Settings','Athlete inputs, plan structure and data management—without mixing them into training decisions.')}`;
    const grid=take('settingsGrid'),days=take('daysGrid'); if(grid){const w=document.createElement('section');w.className='v20-settings-block';w.innerHTML=sectionHead('ATHLETE & RACE','Programme inputs');w.appendChild(grid);view.appendChild(w)} if(days){const w=document.createElement('section');w.className='v20-settings-block';w.innerHTML=sectionHead('AVAILABILITY','Training structure');w.appendChild(days);view.appendChild(w)}
    view.appendChild(detailsShell(legacy));page.appendChild(view);
  }

  function buildAssessments(page,legacy){
    const view=document.createElement('div');view.className='v20-view';view.innerHTML=pageHero('performance','CALIBRATE','Fitness assessments','Verified performances that update future targets.');
    const list=take('assessmentList'),form=take('assessmentForm');move(view,form,list);view.appendChild(detailsShell(legacy));page.appendChild(view);
  }

  const builders={today:buildToday,plan:buildPlan,runs:buildLog,dashboard:buildPerformance,recovery:buildRecovery,shoes:buildShoes,injury:buildInjury,race:buildRace,settings:buildSettings,assessments:buildAssessments};

  function relabelNav(){
    const map={today:'Today',plan:'Training',runs:'Log',dashboard:'Performance',recovery:'Recovery',injury:'Rehab',shoes:'Shoes',race:'Race',settings:'Settings',assessments:'Assess'};
    document.querySelectorAll('#nav [data-page],#moreNav [data-page]').forEach(b=>{const label=b.querySelector('.navLabel')||b.querySelector('span:last-child');if(label&&map[b.dataset.page])label.textContent=map[b.dataset.page]});
    // Mobile information architecture: Today · Training · Performance · Recovery · More.
    const more=$('moreNav');
    if(more && !more.querySelector('[data-page="runs"]')){
      const source=document.querySelector('#nav [data-page="runs"]');
      const log=document.createElement('button');log.dataset.page='runs';log.innerHTML=`<span class="navIcon">${source?.querySelector('.navIcon')?.innerHTML||icon('log')}</span><span>Log</span>`;more.prepend(log);
    }
  }

  function installShell(){
    document.body.classList.add('v20-product');
    const top=document.querySelector('.topbar');if(top){top.classList.add('v20-topbar');const copy=top.querySelector('.brand-copy p');if(copy)copy.textContent='Athlete OS · engine-locked';}
    Object.entries(builders).forEach(([id,builder])=>{const page=$(id);if(!page||page.dataset.v20)return;page.dataset.v20='1';const legacy=makeLegacy(page);builder(page,legacy)});
    relabelNav();
    const footer=document.querySelector('.appFooter');if(footer)footer.innerHTML='<span>AI Running Coach</span><small>Athlete OS · presentation layer</small>';
  }

  // App.js renders synchronously before this script. Defer one frame so SVG charts and navigation exist.
  requestAnimationFrame(()=>{installShell();setTimeout(relabelNav,80)});
})();
