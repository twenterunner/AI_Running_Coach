(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ARC_CORE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '12.2.2';
  const BUILD = 20202;
  const SCHEMA = 10330;
  const PRIMARY_STORAGE_KEY = 'arc_v10330_web';
  const MIRROR_STORAGE_KEY = 'arc_v10330_mirror';
  const LEGACY_STORAGE_KEYS = ['arc_v62_web', 'arc_v8500_web', 'arc_v84_web', 'arc_v83_web', 'arc_v8_web'];

  const cleanText = (value, maxLength = 2000) => String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .slice(0, maxLength);

  function safeId(value, fallback = 'item') {
    const cleaned = cleanText(value, 160).trim().replace(/[^a-zA-Z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || fallback;
  }

  function strictParseTime(value) {
    const text = String(value == null ? '' : value).trim();
    let match = /^(\d+):([0-5]\d)$/.exec(text);
    if (match) return Number(match[1]) * 60 + Number(match[2]);
    match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(text);
    if (match) return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    return null;
  }

  function isIsoDate(value) {
    const text = String(value || '');
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return false;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function todayIso(now = new Date()) {
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const present = value => value !== null && value !== undefined && value !== '';

  function numberError(errors, field, label, value, min, max, options = {}) {
    if (!present(value)) {
      if (options.required) errors.push({ field, message: `${label} is required.` });
      return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < min || numeric > max || (options.integer && !Number.isInteger(numeric))) {
      errors.push({ field, message: `${label} must be ${options.integer ? 'a whole number ' : ''}between ${min} and ${max}.` });
      return null;
    }
    return numeric;
  }

  function dateError(errors, field, label, value, options = {}) {
    if (!isIsoDate(value)) {
      errors.push({ field, message: `${label} must be a valid date.` });
      return;
    }
    if (!options.allowFuture && value > (options.today || todayIso())) errors.push({ field, message: `${label} cannot be in the future.` });
  }

  function validateSetup(setup) {
    const errors = [];
    if (!setup || typeof setup !== 'object') return [{ field: 'setup', message: 'Settings are missing.' }];
    dateError(errors, 'planStart', 'Plan start', setup.planStart, { allowFuture: true });
    dateError(errors, 'raceDate', 'Race date', setup.raceDate, { allowFuture: true });
    if (isIsoDate(setup.planStart) && isIsoDate(setup.raceDate) && setup.raceDate <= setup.planStart) errors.push({ field: 'raceDate', message: 'Race date must be after the plan start date.' });
    if (!cleanText(setup.raceName, 100).trim()) errors.push({ field: 'raceName', message: 'Race name is required.' });
    numberError(errors, 'raceDistance', 'Race distance', setup.raceDistance, 0.1, 200, { required: true });
    numberError(errors, 'targetTime', 'Target time', setup.targetTime, 60, 172800, { required: true });
    numberError(errors, 'currentWeekly', 'Current weekly distance', setup.currentWeekly, 0, 250, { required: true });
    numberError(errors, 'currentLongest', 'Current longest run', setup.currentLongest, 0, 200, { required: true });
    numberError(errors, 'testDistance', 'Recent test distance', setup.testDistance, 0.1, 200, { required: true });
    numberError(errors, 'testTime', 'Recent test time', setup.testTime, 30, 172800, { required: true });
    numberError(errors, 'thresholdHr', 'Threshold heart rate', setup.thresholdHr, 60, 240, { required: true, integer: true });
    numberError(errors, 'criticalPower', 'Critical power', setup.criticalPower, 50, 1500, { required: true });
    numberError(errors, 'bodyWeight', 'Body weight', setup.bodyWeight, 25, 250, { required: true });
    numberError(errors, 'maxWeekly', 'Maximum weekly distance', setup.maxWeekly, 1, 250, { required: true });
    numberError(errors, 'growth', 'Maximum weekly growth', setup.growth, 0.01, 0.25, { required: true });
    numberError(errors, 'peakLong', 'Peak long run', setup.peakLong, 0.1, 100, { required: true });
    numberError(errors, 'taperDays', 'Taper days', setup.taperDays, 0, 42, { required: true, integer: true });
    numberError(errors, 'minFactor', 'Minimum adaptive factor', setup.minFactor, 0.5, 1.25, { required: true });
    numberError(errors, 'maxFactor', 'Maximum adaptive factor', setup.maxFactor, 0.5, 1.25, { required: true });
    if (Number(setup.maxFactor) < Number(setup.minFactor)) errors.push({ field: 'maxFactor', message: 'Maximum adaptive factor must be at least the minimum factor.' });
    if (Number(setup.currentLongest) > Number(setup.raceDistance) * 1.25) errors.push({ field: 'currentLongest', message: 'Current longest run is implausibly high for the configured race distance.' });
    return errors;
  }

  function validateRun(run, options = {}) {
    const errors = [];
    if (!run || typeof run !== 'object') return [{ field: 'run', message: 'Run data are missing.' }];
    dateError(errors, 'date', 'Run date', run.date, { allowFuture: Boolean(options.allowFuture), today: options.today });
    if (!cleanText(run.type, 80).trim()) errors.push({ field: 'type', message: 'Run type is required.' });
    numberError(errors, 'distanceKm', 'Distance', run.distanceKm, 0.01, 300, { required: true });
    numberError(errors, 'durationSec', 'Duration', run.durationSec, 1, 172800, { required: true });
    numberError(errors, 'avgHr', 'Average heart rate', run.avgHr, 30, 250);
    numberError(errors, 'avgPower', 'Average power', run.avgPower, 1, 2000);
    numberError(errors, 'rpe', 'RPE', run.rpe, 1, 10);
    numberError(errors, 'pain', 'Pain', run.pain, 0, 10);
    numberError(errors, 'hrv', 'HRV', run.hrv, 1, 300);
    numberError(errors, 'powerDrift', 'Power-based cardiac drift', run.powerDrift, -100, 100);
    if (cleanText(run.notes, 5001).length > 5000) errors.push({ field: 'notes', message: 'Notes must be 5,000 characters or fewer.' });
    return errors;
  }

  function validateAssessment(assessment, options = {}) {
    const errors = [];
    if (!assessment || typeof assessment !== 'object') return [{ field: 'assessment', message: 'Assessment data are missing.' }];
    dateError(errors, 'date', 'Assessment date', assessment.date, { allowFuture: Boolean(options.allowFuture), today: options.today });
    numberError(errors, 'distance', 'Assessment distance', assessment.distance, 0.1, 200, { required: true });
    numberError(errors, 'time', 'Assessment time', assessment.time, 30, 172800, { required: true });
    numberError(errors, 'thresholdHr', 'Assessment heart rate', assessment.thresholdHr, 30, 250);
    numberError(errors, 'criticalPower', 'Assessment power', assessment.criticalPower, 1, 2000);
    return errors;
  }

  function validateInjury(injury, options = {}) {
    const errors = [];
    if (!injury || typeof injury !== 'object') return [{ field: 'injury', message: 'Injury data are missing.' }];
    dateError(errors, 'date', 'Injury date', injury.date, { allowFuture: false, today: options.today });
    dateError(errors, 'rehabStartDate', 'Rehabilitation start date', injury.rehabStartDate, { allowFuture: true, today: options.today });
    if (isIsoDate(injury.date) && isIsoDate(injury.rehabStartDate) && injury.rehabStartDate < injury.date) errors.push({ field: 'rehabStartDate', message: 'Rehabilitation start cannot be before the injury date.' });
    if (!cleanText(injury.bodyRegion, 100).trim()) errors.push({ field: 'bodyRegion', message: 'Body region is required.' });
    if (!cleanText(injury.location, 300).trim()) errors.push({ field: 'location', message: 'Exact injury location is required.' });
    ['initialPain', 'initialWalkPain', 'currentPain', 'currentWalkPain'].forEach(field => numberError(errors, field, field.replace(/([A-Z])/g, ' $1'), injury[field], 0, 10));
    numberError(errors, 'clinicianExpectedDays', 'Clinician expected days', injury.clinicianExpectedDays, 1, 730);
    (Array.isArray(injury.checkIns) ? injury.checkIns : []).forEach((check, index) => {
      dateError(errors, `checkIns.${index}.date`, `Check-in ${index + 1} date`, check?.date, { allowFuture: false, today: options.today });
      if (isIsoDate(check?.date) && isIsoDate(injury.date) && check.date < injury.date) errors.push({ field: `checkIns.${index}.date`, message: `Check-in ${index + 1} cannot be before the injury date.` });
      ['pain', 'walkPain', 'runPain', 'confidence'].forEach(field => numberError(errors, `checkIns.${index}.${field}`, `Check-in ${index + 1} ${field}`, check?.[field], 0, 10));
      numberError(errors, `checkIns.${index}.morningStiffness`, `Check-in ${index + 1} morning stiffness`, check?.morningStiffness, 0, 1440);
      ['walkMinutes', 'runMinutes'].forEach(field => numberError(errors, `checkIns.${index}.${field}`, `Check-in ${index + 1} ${field}`, check?.[field], 0, 1440));
    });
    return errors;
  }

  function validateDays(days) {
    if (!Array.isArray(days) || days.length !== 7) return [{ field: 'days', message: 'Training days must contain exactly seven entries.' }];
    const errors = [];
    days.forEach((day, index) => {
      if (!Array.isArray(day) || day.length < 3 || !cleanText(day[0], 20).trim() || typeof day[1] !== 'boolean') errors.push({ field: `days.${index}`, message: `Training day ${index + 1} is invalid.` });
    });
    if (!days.some(day => Array.isArray(day) && day[1])) errors.push({ field: 'days', message: 'At least one training day must be enabled.' });
    if (days.filter(day => Array.isArray(day) && day[1] && day[2] === 'Long run').length !== 1) errors.push({ field: 'days', message: 'Exactly one enabled training day must be the long-run day.' });
    return errors;
  }

  function validateBackup(backup, options = {}) {
    const errors = [];
    if (!backup || typeof backup !== 'object' || Array.isArray(backup)) return { valid: false, errors: [{ field: 'backup', message: 'Backup must be a JSON object.' }] };
    errors.push(...validateSetup(backup.setup));
    errors.push(...validateDays(backup.days));
    if (!Array.isArray(backup.runs)) errors.push({ field: 'runs', message: 'Run history is missing.' });
    else backup.runs.forEach((run, index) => validateRun(run, { allowFuture: false, today: options.today }).forEach(error => errors.push({ ...error, field: `runs.${index}.${error.field}` })));
    if (!Array.isArray(backup.assessments)) errors.push({ field: 'assessments', message: 'Assessment history is missing.' });
    else backup.assessments.forEach((assessment, index) => validateAssessment(assessment, { allowFuture: false, today: options.today }).forEach(error => errors.push({ ...error, field: `assessments.${index}.${error.field}` })));
    if (backup.injuries != null && !Array.isArray(backup.injuries)) errors.push({ field: 'injuries', message: 'Injury history must be an array.' });
    else (backup.injuries || []).forEach((injury, index) => validateInjury(injury, { today: options.today }).forEach(error => errors.push({ ...error, field: `injuries.${index}.${error.field}` })));
    ['runs', 'assessments', 'injuries'].forEach(group => {
      const seen = new Set();
      (backup[group] || []).forEach((item, index) => {
        if (!item?.id) return;
        const id = safeId(item.id, '');
        if (!id || seen.has(id)) errors.push({ field: `${group}.${index}.id`, message: `${group} contains a missing or duplicate identifier.` });
        seen.add(id);
      });
    });
    return { valid: errors.length === 0, errors };
  }

  function isStateShape(value) {
    return Boolean(value && typeof value === 'object' && value.setup && Array.isArray(value.runs) && Array.isArray(value.assessments) && Array.isArray(value.days));
  }

  function selectStoredCandidate(candidates, primaryKey = PRIMARY_STORAGE_KEY, mirrorKey = MIRROR_STORAGE_KEY, legacyOrder = LEGACY_STORAGE_KEYS, options = {}) {
    const valid = (Array.isArray(candidates) ? candidates : []).filter(candidate => candidate && isStateShape(candidate.value));
    const current = valid.filter(candidate => candidate.key === primaryKey || candidate.key === mirrorKey);
    if (current.length) {
      return current.sort((a, b) => {
        const revision = (Number(b.value.storageRevision) || 0) - (Number(a.value.storageRevision) || 0);
        if (revision) return revision;
        const updated = String(b.value.updatedAt || '').localeCompare(String(a.value.updatedAt || ''));
        if (updated) return updated;
        return a.key === primaryKey ? -1 : 1;
      })[0];
    }
    if (options.migrationComplete) return null;
    for (const key of legacyOrder) {
      const candidate = valid.find(item => item.key === key);
      if (candidate) return candidate;
    }
    return null;
  }

  function efficiencyScore(efficiencyTrendScore, driftScore) {
    const components = [];
    if (Number.isFinite(efficiencyTrendScore)) components.push({ score: efficiencyTrendScore, weight: 0.6 });
    if (Number.isFinite(driftScore)) components.push({ score: driftScore, weight: 0.4 });
    const weight = components.reduce((sum, component) => sum + component.weight, 0);
    return weight ? components.reduce((sum, component) => sum + component.score * component.weight, 0) / weight : null;
  }

  function isCurrentEvidence(record, asOf = todayIso()) {
    return Boolean(record && isIsoDate(record.date) && record.date <= asOf);
  }

  function predictionMode(evidenceCoverage) {
    const coverage = Number(evidenceCoverage);
    return { provisional: !Number.isFinite(coverage) || coverage < 0.25, coverage: Number.isFinite(coverage) ? Math.max(0, Math.min(1, coverage)) : 0 };
  }

  function validatePlanInvariants(plan, setup) {
    const errors = [];
    if (!Array.isArray(plan) || !plan.length) return [{ field: 'plan', message: 'Plan must contain at least one workout.' }];
    const ids = new Set();
    plan.forEach((workout, index) => {
      if (!workout || typeof workout !== 'object') return errors.push({ field: `plan.${index}`, message: 'Workout must be an object.' });
      if (!workout.id || ids.has(workout.id)) errors.push({ field: `plan.${index}.id`, message: 'Workout identifiers must be present and unique.' });
      ids.add(workout.id);
      if (!isIsoDate(workout.date)) errors.push({ field: `plan.${index}.date`, message: 'Workout date must be valid.' });
      if (setup && isIsoDate(setup.planStart) && isIsoDate(workout.date) && workout.date < setup.planStart) errors.push({ field: `plan.${index}.date`, message: 'Workout cannot precede the plan start.' });
      if (setup && isIsoDate(setup.raceDate) && isIsoDate(workout.date) && workout.date > setup.raceDate) errors.push({ field: `plan.${index}.date`, message: 'Workout cannot follow race day.' });
      const distance = Number(workout.distance);
      if (!Number.isFinite(distance) || distance < 0 || distance > 300) errors.push({ field: `plan.${index}.distance`, message: 'Workout distance is outside safe boundaries.' });
      const parts = ['warmDistance', 'mainDistance', 'coolDistance'].map(field => Number(workout[field])).filter(Number.isFinite);
      if (parts.length === 3 && Math.abs(parts.reduce((sum, value) => sum + value, 0) - distance) > 0.11) errors.push({ field: `plan.${index}.components`, message: 'Workout components do not equal its distance.' });
    });
    return errors;
  }

  function firstErrorMessage(errors, fallback = 'Please correct the highlighted fields.') {
    return Array.isArray(errors) && errors.length ? errors[0].message : fallback;
  }

  return Object.freeze({
    VERSION,
    BUILD,
    SCHEMA,
    PRIMARY_STORAGE_KEY,
    MIRROR_STORAGE_KEY,
    LEGACY_STORAGE_KEYS,
    cleanText,
    safeId,
    strictParseTime,
    isIsoDate,
    todayIso,
    validateSetup,
    validateRun,
    validateAssessment,
    validateInjury,
    validateDays,
    validateBackup,
    selectStoredCandidate,
    efficiencyScore,
    isCurrentEvidence,
    predictionMode,
    validatePlanInvariants,
    firstErrorMessage
  });
});

let preview=null;
(()=>{'use strict';
const CORE=window.ARC_CORE;if(!CORE)throw new Error('Core utilities failed to load.');
const DAY=86400000, $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function today(){return dte(iso(new Date()))}
const iso=d=>{let x=new Date(d),y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),q=String(x.getDate()).padStart(2,'0');return `${y}-${m}-${q}`},
dte=s=>{let [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d,12,0,0,0)},
fmtDate=s=>dte(s).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
const sum=a=>a.reduce((x,y)=>x+(Number.isFinite(y)?y:0),0), avg=a=>{let v=a.filter(Number.isFinite);return v.length?sum(v)/v.length:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dec=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):'—';
function fmtTime(s){if(!Number.isFinite(s))return'—';let h=Math.floor(s/3600),m=Math.floor(s%3600/60),q=Math.round(s%60);if(q===60){q=0;m++}if(m===60){m=0;h++}return h?`${h}:${String(m).padStart(2,'0')}:${String(q).padStart(2,'0')}`:`${m}:${String(q).padStart(2,'0')}`}
function parseTime(v){return CORE.strictParseTime(v)}
function refineTimeErrors(errors,specs){let output=[...(errors||[])];for(const spec of specs||[]){if(String(spec.value??'').trim()&&parseTime(spec.value)===null){output=output.filter(error=>error.field!==spec.field);output.unshift({field:spec.field,message:`${spec.label} must use M:SS or H:MM:SS with seconds from 00 to 59.`})}}return output}
function pace(s){return Number.isFinite(s)?fmtTime(s)+'/km':'—'} function toast(t,bad=false){$('toast').textContent=t;$('toast').className='toast'+(bad?' bad':'');setTimeout(()=>$('toast').className='toast hidden',3500)}
function fmtEstimate(seconds,provisional=false){return provisional?fmtTime(Math.round(Number(seconds)/60)*60):fmtTime(seconds)}
function paceEstimate(seconds,provisional=false){const paceSeconds=Number(seconds)/Math.max(.1,Number(state?.setup?.raceDistance)||1);return pace(provisional?Math.round(paceSeconds/10)*10:paceSeconds)}
let toastTimer=null;
toast=function(t,bad=false){const el=$('toast');clearTimeout(toastTimer);el.textContent=t;el.className='toast'+(bad?' bad':'');el.setAttribute('role',bad?'alert':'status');el.setAttribute('aria-live',bad?'assertive':'polite');toastTimer=setTimeout(()=>{el.className='toast hidden'},bad?6000:4500)};
const optionalBounded=(value,min,max)=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null};
function ensureAccessibleForms(root=document){root.querySelectorAll('.field').forEach((field,index)=>{const control=field.querySelector('input,select,textarea'),label=field.querySelector('label');if(!control||!label)return;if(!control.id)control.id=`field-${Date.now()}-${index}`;label.htmlFor=control.id});document.querySelectorAll('[data-day]').forEach(control=>{const day=state?.days?.[Number(control.dataset.day)]?.[0]||'Day';control.setAttribute('aria-label',`${day}: available to run`)});document.querySelectorAll('[data-long-day]').forEach(control=>{const day=state?.days?.[Number(control.dataset.longDay)]?.[0]||'Day';control.setAttribute('aria-label',`${day}: use as long-run day`)})}
function clearFieldErrors(root=document){root.querySelectorAll('[aria-invalid="true"]').forEach(el=>{el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby')});root.querySelectorAll('.fieldError').forEach(el=>el.remove())}
function showFieldErrors(errors,mapping={},root=document){clearFieldErrors(root);(errors||[]).forEach((error,index)=>{const selector=mapping[error.field]||`[data-setting="${error.field}"]`||null,control=selector?root.querySelector(selector):null;if(!control)return;const id=`error-${control.id||error.field}-${index}`,message=document.createElement('small');message.id=id;message.className='fieldError';message.textContent=error.message;control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby',id);control.closest('.field')?.append(message)});const first=root.querySelector('[aria-invalid="true"]');first?.focus();return first}
const diagnostics=[];
function recordDiagnostic(source,error){const message=error?.stack||error?.message||String(error);diagnostics.unshift({time:new Date().toLocaleString(),source,message});if(diagnostics.length>20)diagnostics.length=20;console.error(source,error);renderDiagnostics();}
function renderDiagnostics(){const box=$('diagnosticsContent');if(!box)return;box.innerHTML=diagnostics.length?diagnostics.map(x=>`<div class="diagnosticItem"><b>${esc(x.time)} · ${esc(x.source)}</b><pre>${esc(x.message)}</pre></div>`).join(''):'<p class="muted">No JavaScript errors have been recorded in this session.</p>';}
window.addEventListener('error',e=>recordDiagnostic('Window error',e.error||e.message));window.addEventListener('unhandledrejection',e=>recordDiagnostic('Unhandled promise rejection',e.reason));
const FIVE_DAY_TEMPLATE=[['Monday',false,'Easy'],['Tuesday',true,'Intervals'],['Wednesday',true,'Easy'],['Thursday',true,'Tempo'],['Friday',false,'Easy'],['Saturday',true,'Easy'],['Sunday',true,'Long run']];
const RACE_PROFILES=[
 {key:'5k',label:'5K',maxDistance:7.5,currentWeekly:18,peakLong:12,maxWeekly:32,growth:.07,taperDays:7,days:[['Monday',false,'Easy'],['Tuesday',true,'Intervals'],['Wednesday',true,'Easy'],['Thursday',false,'Easy'],['Friday',false,'Easy'],['Saturday',true,'Tempo'],['Sunday',true,'Long run']]},
 {key:'10k',label:'10K',maxDistance:15.55,currentWeekly:24,peakLong:16,maxWeekly:42,growth:.07,taperDays:7,days:[['Monday',false,'Easy'],['Tuesday',true,'Intervals'],['Wednesday',true,'Easy'],['Thursday',false,'Easy'],['Friday',false,'Easy'],['Saturday',true,'Tempo'],['Sunday',true,'Long run']]},
 {key:'half',label:'Half marathon',maxDistance:31.65,currentWeekly:30,peakLong:24,maxWeekly:52,growth:.07,taperDays:14,days:FIVE_DAY_TEMPLATE.map(d=>[...d])},
 {key:'marathon',label:'Marathon',maxDistance:47.5,currentWeekly:35,peakLong:32,maxWeekly:65,growth:.07,taperDays:14,days:FIVE_DAY_TEMPLATE.map(d=>[...d])},
 {key:'50k',label:'50 km ultra',maxDistance:62.5,currentWeekly:40,peakLong:38,maxWeekly:72,growth:.06,taperDays:14,days:FIVE_DAY_TEMPLATE.map(d=>[...d])},
 {key:'75k',label:'75 km ultra',maxDistance:87.5,currentWeekly:45,peakLong:45,maxWeekly:82,growth:.06,taperDays:18,days:FIVE_DAY_TEMPLATE.map(d=>[...d])},
 {key:'100k',label:'100 km ultra',maxDistance:Infinity,currentWeekly:50,peakLong:50,maxWeekly:92,growth:.05,taperDays:21,days:FIVE_DAY_TEMPLATE.map(d=>[...d])}
];
function raceProfile(distance=state?.setup?.raceDistance){let d=Number(distance);return RACE_PROFILES.find(p=>d<=p.maxDistance)||RACE_PROFILES.at(-1)}
function raceProfileValues(distance){let p=raceProfile(distance);return{currentWeekly:p.currentWeekly,peakLong:p.peakLong,maxWeekly:p.maxWeekly,growth:p.growth,taperDays:p.taperDays}}
const TYPE_ALIASES={'Easy + strides':'Easy','Hills':'Intervals','Fartlek':'Intervals','Threshold':'Tempo','Threshold intervals':'Tempo','VO₂max intervals':'Intervals','Race-pace intervals':'Intervals','Steady aerobic':'Steady','Medium-long':'Steady','Progression':'Steady','Marathon-specific':'Marathon','Half-marathon-specific':'Tempo','Specific long run':'Long run','Race rehearsal':'Long run','Shakeout':'Recovery','Repetition':'Intervals'};
function baseType(type){return TYPE_ALIASES[type]||type}
function detailedPhase(w){const total=weeks(),tw=Math.max(1,Math.ceil(state.setup.taperDays/7)),pre=Math.max(1,total-tw),p=raceProfile();if(w>pre)return'Taper';const x=w/pre;if(x<=.20)return'Foundation';if(x<=.45)return'Aerobic';if(x<=.68)return p.key==='marathon'||['50k','75k','100k'].includes(p.key)?'Endurance':'Development';if(x<=.88)return'Specific';return'Peak'}
function displayPhaseFromDetailed(dp){return dp==='Foundation'||dp==='Aerobic'?'Base':dp==='Development'||dp==='Endurance'||dp==='Specific'?'Build':dp}
function phase(w){return displayPhaseFromDetailed(detailedPhase(w))}
function assessmentWeeks(total=weeks(),profile=raceProfile()){const taper=Math.max(1,Math.ceil(state.setup.taperDays/7)),last=Math.max(2,total-taper-2),fractions=profile.key==='5k'||profile.key==='10k'?[.38,.72]:profile.key==='half'||profile.key==='marathon'?[.48]:[.42];return[...new Set(fractions.map(f=>clamp(Math.round(last*f),3,last)).filter(w=>w>1))]}
const RACE_PHASE_MATRIX={
 '5k':{Foundation:['Hills','Easy','Easy + strides','Recovery','Long run'],Aerobic:['Threshold','Easy','Easy + strides','Recovery','Long run'],Development:['VO₂max intervals','Easy','Threshold','Recovery','Long run'],Specific:['Race-pace intervals','Easy','Repetition','Recovery','Long run'],Peak:['Race-pace intervals','Easy','Easy + strides','Recovery','Long run'],Taper:['Race-pace intervals','Easy','Shakeout','Recovery','Long run']},
 '10k':{Foundation:['Fartlek','Easy','Easy + strides','Recovery','Long run'],Aerobic:['Threshold','Easy','Steady aerobic','Recovery','Long run'],Development:['Threshold intervals','Easy','VO₂max intervals','Recovery','Long run'],Specific:['Race-pace intervals','Easy','Threshold','Easy + strides','Long run'],Peak:['Race-pace intervals','Easy','Easy + strides','Recovery','Long run'],Taper:['Race-pace intervals','Easy','Shakeout','Recovery','Long run']},
 'half':{Foundation:['Threshold','Easy','Easy + strides','Recovery','Long run'],Aerobic:['Threshold','Easy','Medium-long','Recovery','Long run'],Development:['Threshold intervals','Easy','Medium-long','Recovery','Progression'],Specific:['Half-marathon-specific','Easy','Medium-long','Recovery','Specific long run'],Peak:['Half-marathon-specific','Easy','Medium-long','Recovery','Specific long run'],Taper:['Half-marathon-specific','Easy','Shakeout','Recovery','Long run']},
 'marathon':{Foundation:['Hills','Easy','Easy + strides','Recovery','Long run'],Aerobic:['Threshold','Easy','Medium-long','Recovery','Long run'],Endurance:['Threshold','Easy','Medium-long','Recovery','Progression'],Specific:['Marathon-specific','Easy','Medium-long','Recovery','Specific long run'],Peak:['Marathon-specific','Easy','Medium-long','Recovery','Race rehearsal'],Taper:['Marathon-specific','Easy','Shakeout','Recovery','Long run']},
 'ultra':{Foundation:['Hills','Easy','Easy','Recovery','Long run'],Aerobic:['Steady aerobic','Easy','Medium-long','Recovery','Long run'],Endurance:['Hills','Easy','Medium-long','Recovery','Specific long run'],Specific:['Steady aerobic','Easy','Medium-long','Recovery','Race rehearsal'],Peak:['Easy','Recovery','Medium-long','Recovery','Race rehearsal'],Taper:['Steady aerobic','Easy','Shakeout','Recovery','Long run']}};
function profileMatrixKey(profile=raceProfile()){return['50k','75k','100k'].includes(profile.key)?'ultra':profile.key}
function weekTypeAssignments(w,weekDates){const profile=raceProfile(),dp=detailedPhase(w),key=profileMatrixKey(profile),matrix=RACE_PHASE_MATRIX[key]||RACE_PHASE_MATRIX.marathon,types=matrix[dp]||matrix.Specific;const enabled=weekDates.filter(x=>x.cfg[1]&&x.date!==state.setup.raceDate),longCandidate=enabled.find(x=>x.cfg[2]==='Long run')||enabled.at(-1),nonLong=enabled.filter(x=>x!==longCandidate),assigned=new Map();nonLong.forEach((x,i)=>assigned.set(x.date,types[Math.min(i,3)]||'Easy'));if(longCandidate)assigned.set(longCandidate.date,types[4]||'Long run');if(assessmentWeeks().includes(w)&&nonLong.length&&dp!=='Taper')assigned.set(nonLong[0].date,'Fitness assessment');return assigned}
function applyRaceProfileDays(profile){if(!profile?.days)return;state.days=profile.days.map(d=>[...d])}
function trainingOpportunityModel(setup=state.setup,enabledDays=state.days.filter(d=>d[1]).length,currentPhase=phase(currentWeek())){
 const profile=raceProfile(setup.raceDistance);
 // Minimum effective frequencies are intended for performance-oriented preparation,
 // not merely completing the distance. Above the minimum, frequency is not awarded
 // bonus confidence because additional days mainly improve load distribution.
 const minimumEffectiveDays={"5k":3,"10k":3,"half":4,"marathon":4,"50k":4,"75k":5,"100k":5}[profile.key]||4;
 const idealDays={"5k":5,"10k":5,"half":5,"marathon":5,"50k":5,"75k":6,"100k":6}[profile.key]||5;
 const baseOpportunity=clamp(Math.pow(enabledDays/Math.max(1,minimumEffectiveDays),1.6),0,1);
 const raceImportance={"5k":5,"10k":8,"half":12,"marathon":18,"50k":20,"75k":24,"100k":28}[profile.key]||12;
 const phaseMultiplier={Base:.7,Build:1,Peak:1.3,Taper:.3}[currentPhase]??1;
 const peakWeekly=Math.max(0,Number(setup.maxWeekly)||0);
 const ambitionMultiplier=peakWeekly<30?.6:peakWeekly<45?.8:peakWeekly<60?1:peakWeekly<75?1.2:1.5;
 const deficit=1-baseOpportunity;
 // raceImportance is the maximum percentage-point deduction at normal Build-phase
 // sensitivity; phase and ambition make the consequence context-specific.
 const confidencePenalty=clamp(deficit*raceImportance*phaseMultiplier*ambitionMultiplier,0,60);
 // The component score uses the same non-linear deficit, normalized to marathon
 // sensitivity so that fewer days matter progressively more as race distance rises.
 const distanceSensitivity=raceImportance/18;
 const opportunityScore=clamp(100-deficit*100*distanceSensitivity*phaseMultiplier*ambitionMultiplier,0,100);
 const averagePeakKmPerRun=enabledDays>0?peakWeekly/enabledDays:null;
 return{profileKey:profile.key,enabledDays,minimumEffectiveDays,idealDays,baseOpportunity,opportunityScore,confidencePenalty,raceImportance,phaseMultiplier,ambitionMultiplier,averagePeakKmPerRun,currentPhase};
}
function buildRequirementEstimate(setup=state.setup){
 let longest=Math.max(Number(setup.currentLongest)||0,...((state?.runs||[]).filter(r=>CORE.isIsoDate(r.date)&&r.date<=iso(today())).map(r=>Number(r.distanceKm)||0)));
 let currentWeekly=Math.max(1,Number(setup.currentWeekly)||1),targetWeekly=Math.max(1,Number(setup.maxWeekly)||currentWeekly),growth=Math.max(.01,Number(setup.growth)||.05);
 let longGap=Math.max(0,(Number(setup.peakLong)||0)-longest),safeLongStep=Math.max(1.5,longest*.10),longRun=longGap/safeLongStep;
 let weeklyVolume=targetWeekly<=currentWeekly?0:Math.log(targetWeekly/currentWeekly)/Math.log(1+growth);
 let latest=(state?.assessments||[]).filter(a=>a.valid&&a.date<=iso(today())).sort((a,b)=>b.date.localeCompare(a.date))[0];
 let testTime=latest?latest.time:Number(setup.testTime),testDist=latest?latest.distance:Number(setup.testDistance);
 let projected=testTime>0&&testDist>0?testTime*Math.pow(Number(setup.raceDistance)/testDist,1.06):Number(setup.targetTime);
 let fitnessScore=projected>0&&setup.targetTime>0?clamp(100-(projected/setup.targetTime-1)*300,0,100):70;
 let fitness=Math.max(0,(85-fitnessScore)/7);
 let cutoff=new Date(today().getTime()-84*DAY),recent=(state?.runs||[]).filter(r=>dte(r.date)>=cutoff&&dte(r.date)<=today());
 let longEvidence=recent.filter(r=>['Long run','Race'].includes(r.type)&&Number(r.distanceKm)>=Math.min(Number(setup.peakLong)*.65,Number(setup.raceDistance)*.75)).length;
 let enduranceEvidence=Math.max(0,3-longEvidence);
 let specificEvidence=recent.filter(r=>['Tempo','Intervals','Fitness assessment','Marathon'].includes(r.type)).length;
 let specificity=Math.max(0,4-specificEvidence)/1.5;
 let components={longRun,weeklyVolume,fitness,enduranceEvidence,specificity};
 let limiting=Math.max(...Object.values(components));
 return{components,consolidation:1.5,requiredBuildWeeks:limiting+1.5,longest,fitnessScore};
}
function recommendedRaceDate(setup){
 let p=raceProfile(setup.raceDistance),minimumTotal={"5k":6,"10k":8,"half":12,"marathon":20,"50k":22,"75k":24,"100k":26}[p.key]||12;
 let req=buildRequirementEstimate(setup),taperWeeks=Math.max(1,Number(setup.taperDays||p.taperDays)/7);
 let totalWeeks=Math.ceil(Math.max(minimumTotal,req.requiredBuildWeeks+taperWeeks+2));
 return{date:iso(new Date(dte(setup.planStart).getTime()+totalWeeks*7*DAY)),totalWeeks,requiredBuildWeeks:req.requiredBuildWeeks,taperWeeks};
}
const BUILD=CORE.BUILD, SCHEMA=CORE.SCHEMA, STORAGE_KEY=CORE.PRIMARY_STORAGE_KEY, MIRROR_KEY=CORE.MIRROR_STORAGE_KEY, MIGRATION_MARKER='arc_v10330_migration_complete', BACKUP_KEY='arc_v10330_restore_rollback', UNDO_KEY='arc_v10330_settings_undo';
const defaults=()=>{let start=iso(new Date()),setup={planStart:start,raceDate:start,raceName:'Goal Race',raceDistance:42.195,targetTime:15300,currentWeekly:35,currentLongest:18,testDistance:5,testTime:1515,thresholdHr:168,criticalPower:300,bodyWeight:70,maxWeekly:65,growth:.07,peakLong:32,taperDays:14,minFactor:.85,maxFactor:1.05,adaptive:true};setup.raceDate=recommendedRaceDate(setup).date;return({schemaVersion:SCHEMA,setup,days:FIVE_DAY_TEMPLATE.map(d=>[...d]),runs:[],assessments:[],injuries:[],activeInjuryPlanId:null,plan:[],predictionHistory:[],weekView:null,onboardingComplete:false,storageRevision:0,updatedAt:new Date().toISOString(),migration:{to:SCHEMA,status:'new',time:new Date().toISOString()}})};
let migrationReport={from:null,to:SCHEMA,status:'new install',source:'defaults',runs:0,assessments:0,fieldsRecovered:0,warning:''};
function parseStored(raw){if(!raw)return null;try{const x=JSON.parse(raw);return x&&typeof x==='object'?x:null}catch(err){recordDiagnostic('Storage parse',err);return null}}
function storageCandidates(){const keys=[STORAGE_KEY,MIRROR_KEY,...CORE.LEGACY_STORAGE_KEYS];return keys.map(key=>({key,value:parseStored(localStorage.getItem(key))})).filter(x=>x.value)}
function loadStoredState(){let candidates=[],migrationComplete=false;try{candidates=storageCandidates();migrationComplete=localStorage.getItem(MIGRATION_MARKER)==='true'}catch(err){recordDiagnostic('Storage access',err)}const selected=CORE.selectStoredCandidate(candidates,STORAGE_KEY,MIRROR_KEY,CORE.LEGACY_STORAGE_KEYS,{migrationComplete});if(!selected)return null;migrationReport.source=selected.key;return selected.value}
function normaliseState(input){
 const base=defaults(),src=input&&typeof input==='object'?input:{};
 const numericSetup=['raceDistance','targetTime','currentWeekly','currentLongest','testDistance','testTime','thresholdHr','criticalPower','bodyWeight','maxWeekly','growth','peakLong','taperDays','minFactor','maxFactor'];
 const setup={...base.setup,...(src.setup&&typeof src.setup==='object'?src.setup:{})};
 const ranges={raceDistance:[.1,200],targetTime:[60,172800],currentWeekly:[0,250],currentLongest:[0,200],testDistance:[.1,200],testTime:[30,172800],thresholdHr:[60,240],criticalPower:[50,1500],bodyWeight:[25,250],maxWeekly:[1,250],growth:[.01,.25],peakLong:[.1,100],taperDays:[0,42],minFactor:[.5,1.25],maxFactor:[.5,1.25]};
 let recovered=0;numericSetup.forEach(k=>{const n=Number(setup[k]),range=ranges[k];if(Number.isFinite(n)&&n>=range[0]&&n<=range[1]){setup[k]=n}else{setup[k]=base.setup[k];recovered++}});
 ['planStart','raceDate'].forEach(k=>{if(!CORE.isIsoDate(setup[k])){setup[k]=base.setup[k];recovered++}});setup.raceName=CORE.cleanText(setup.raceName,100).trim()||base.setup.raceName;
 setup.adaptive=setup.adaptive!==false;
 const runs=Array.isArray(src.runs)?src.runs.filter(Boolean).map((r,index)=>({...r,id:CORE.safeId(r.id,`run-${index}`),assessmentId:r.assessmentId?CORE.safeId(r.assessmentId,''):null,planId:r.planId?CORE.safeId(r.planId,''):null,type:CORE.cleanText(r.type||'Easy',80),notes:CORE.cleanText(r.notes,5000),distanceKm:optionalBounded(r.distanceKm,.01,300)??0,durationSec:optionalBounded(r.durationSec,1,172800)??0,avgHr:optionalBounded(r.avgHr,30,250),avgPower:optionalBounded(r.avgPower,1,2000),rpe:optionalBounded(r.rpe,1,10),pain:optionalBounded(r.pain,0,10),recovery:null,hrv:optionalBounded(r.hrv,1,300),powerDrift:optionalBounded(r.powerDrift,-100,100)})):[];
 const assessments=Array.isArray(src.assessments)?src.assessments.filter(Boolean).map((a,index)=>({...a,id:CORE.safeId(a.id,`assessment-${index}`),distance:optionalBounded(a.distance,.1,200)??0,time:optionalBounded(a.time,30,172800)??0,thresholdHr:optionalBounded(a.thresholdHr,30,250),criticalPower:optionalBounded(a.criticalPower,1,2000),valid:Boolean(a.valid)})):[];
 const injuries=Array.isArray(src.injuries)?src.injuries.filter(Boolean).map((i,index)=>({...i,id:CORE.safeId(i.id,`injury-${index}`),location:CORE.cleanText(i.location,300),mechanism:CORE.cleanText(i.mechanism,1000),painTriggers:CORE.cleanText(i.painTriggers,1000),clinicalDiagnosis:CORE.cleanText(i.clinicalDiagnosis,500),rehabStartDate:i.rehabStartDate||i.date||base.setup.planStart,initialPain:optionalBounded(i.initialPain,0,10),initialWalkPain:optionalBounded(i.initialWalkPain,0,10),currentPain:optionalBounded(i.currentPain,0,10),currentWalkPain:optionalBounded(i.currentWalkPain,0,10),clinicianExpectedDays:optionalBounded(i.clinicianExpectedDays,1,730),checkIns:Array.isArray(i.checkIns)?i.checkIns.filter(Boolean).map(c=>({...c,pain:optionalBounded(c.pain,0,10),walkPain:optionalBounded(c.walkPain,0,10),morningStiffness:optionalBounded(c.morningStiffness,0,10),runPain:optionalBounded(c.runPain,0,10),confidence:optionalBounded(c.confidence,0,10),walkMinutes:optionalBounded(c.walkMinutes,0,1440),runMinutes:optionalBounded(c.runMinutes,0,1440),symptoms:CORE.cleanText(c.symptoms,2000)})):[]})):[];
 injuries.forEach((injury,index)=>{injury.checkIns.forEach((check,checkIndex)=>{check.morningStiffness=optionalBounded(src.injuries?.[index]?.checkIns?.[checkIndex]?.morningStiffness,0,1440)});injury.checkIns=injury.checkIns.filter(check=>CORE.validateInjury({...injury,checkIns:[check]},{today:iso(today())}).filter(error=>error.field.startsWith('checkIns.')).length===0)});
 runs.splice(0,runs.length,...runs.filter(run=>CORE.validateRun(run,{allowFuture:true,today:iso(today())}).length===0));
 assessments.splice(0,assessments.length,...assessments.filter(assessment=>CORE.validateAssessment(assessment,{allowFuture:true,today:iso(today())}).length===0));
 injuries.splice(0,injuries.length,...injuries.filter(injury=>CORE.validateInjury(injury,{today:iso(today())}).length===0));
 const plan=Array.isArray(src.plan)?src.plan.filter(Boolean).map((x,index)=>({...x,id:CORE.safeId(x.id,`plan-${index}`),week:Number(x.week)||1,distance:Number(x.distance)||0,factor:Number(x.factor)||1,zone:{...(x.zone||{}),pace:Number(x.zone?.pace)||0,hr:Number(x.zone?.hr)||0,power:Number(x.zone?.power)||0}})):[];
 migrationReport={...migrationReport,from:Number(src.schemaVersion)||'legacy',to:SCHEMA,status:'success',runs:runs.length,assessments:assessments.length,fieldsRecovered:recovered};
 let predictionHistory=Array.isArray(src.predictionHistory)?src.predictionHistory.filter(x=>x&&x.date&&Number.isFinite(Number(x.seconds))).map(x=>({...x,seconds:Number(x.seconds)})):[];
 const standaloneRuns=runs.filter(r=>r.source!=='assessment').length,maxTrendEvents=standaloneRuns+assessments.length;
 if(maxTrendEvents===0)predictionHistory=[];else if(predictionHistory.every(x=>!x.entityId)&&predictionHistory.length>maxTrendEvents)predictionHistory=predictionHistory.slice(-maxTrendEvents);
 const storedStart=Number(src.programStartPrediction);const programStartPrediction=Number.isFinite(storedStart)?storedStart:initialProgrammePrediction(setup);
 const candidateDays=Array.isArray(src.days)?src.days.map(d=>Array.isArray(d)?[CORE.cleanText(d[0],20),Boolean(d[1]),CORE.cleanText(d[2],40)]:d):base.days,days=CORE.validateDays(candidateDays).length?base.days:candidateDays;
 const onboardingComplete=src.onboardingComplete===true||Boolean(input?.setup&&Number(src.schemaVersion||0)<SCHEMA);
 return{...base,...src,schemaVersion:SCHEMA,setup,days,runs,assessments,injuries,plan,predictionHistory,programStartPrediction,weekView:Number(src.weekView)||null,onboardingComplete,storageRevision:Math.max(0,Number(src.storageRevision)||0),updatedAt:src.updatedAt||new Date().toISOString(),migration:{...migrationReport,time:new Date().toISOString()}};
}
let rawState=loadStoredState();
try{if(rawState&&CORE.LEGACY_STORAGE_KEYS.includes(migrationReport.source))localStorage.setItem('arc_v10330_migration_backup',JSON.stringify(rawState))}catch(err){recordDiagnostic('Pre-migration backup',err)}
let state;try{state=normaliseState(rawState||defaults())}catch(err){recordDiagnostic('Migration failure',err);migrationReport.status='recovered defaults';migrationReport.warning=err.message;state=defaults()}
function save(){state.storageRevision=Math.max(0,Number(state.storageRevision)||0)+1;state.updatedAt=new Date().toISOString();const text=JSON.stringify(state);try{localStorage.setItem(STORAGE_KEY,text);localStorage.setItem(MIRROR_KEY,text);localStorage.setItem(MIGRATION_MARKER,'true');return true}catch(err){recordDiagnostic('Save failure',err);toast('Data could not be saved on this device.',true);return false}}
save();
let lastModalFocus=null,modalWasOpen=false;
function closeDialog(){const modal=$('modal');if(!modal||modal.classList.contains('hidden'))return;modal.className='modal hidden'}
function showDialog(html,label='AI Running Coach dialog'){if(html!==undefined)$('modalContent').innerHTML=html;const modal=$('modal');modal.setAttribute('aria-label',label);modal.className='modal'}
function syncModalAccessibility(){const modal=$('modal'),open=!modal.classList.contains('hidden');document.body.classList.toggle('modalOpen',open);$('mainContent').inert=open||!$('onboarding').classList.contains('hidden');$('nav').inert=open||!$('onboarding').classList.contains('hidden');if(open&&!modalWasOpen){lastModalFocus=document.activeElement;const heading=modal.querySelector('#modalContent h1,#modalContent h2,#modalContent h3');if(heading){heading.id=heading.id||'modalHeading';modal.setAttribute('aria-labelledby',heading.id);modal.removeAttribute('aria-label')}ensureAccessibleForms(modal);requestAnimationFrame(()=>{const first=modal.querySelector('#modalContent input:not([disabled]),#modalContent select:not([disabled]),#modalContent textarea:not([disabled]),#modalContent button:not([disabled]),#closeModal');(first||modal).focus()})}if(!open&&modalWasOpen){modal.removeAttribute('aria-labelledby');modal.setAttribute('aria-label','AI Running Coach dialog');if(lastModalFocus&&document.contains(lastModalFocus))lastModalFocus.focus();lastModalFocus=null}modalWasOpen=open}
new MutationObserver(syncModalAccessibility).observe($('modal'),{attributes:true,attributeFilter:['class']});
document.addEventListener('keydown',event=>{const modal=$('modal');if(modal.classList.contains('hidden'))return;if(event.key==='Escape'){event.preventDefault();closeDialog();return}if(event.key!=='Tab')return;const focusable=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);if(!focusable.length){event.preventDefault();modal.focus();return}const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}});
const EVIDENCE_WEIGHT={Recovery:.10,Easy:.16,'Easy + strides':.20,'Steady aerobic':.26,'Medium-long':.34,Progression:.34,'Long run':.34,'Specific long run':.48,'Race rehearsal':.52,Hills:.30,Fartlek:.30,Threshold:.48,'Threshold intervals':.55,'Half-marathon-specific':.55,'Marathon-specific':.55,'VO₂max intervals':.52,'Race-pace intervals':.58,Intervals:.48,Tempo:.48,'Fitness assessment':.90,Race:.95};
const EXECUTION_PROFILES={
 Recovery:{distance:.18,pace:.08,power:.08,hr:.32,drift:.24,rpe:.10,objective:'Promote recovery while keeping effort genuinely easy.'},
 Easy:{distance:.24,pace:.12,power:.12,hr:.24,drift:.18,rpe:.10,objective:'Build aerobic fitness with controlled, conversational effort.'},
 Steady:{distance:.25,pace:.18,power:.18,hr:.18,drift:.13,rpe:.08,objective:'Deliver a controlled moderate aerobic stimulus below threshold.'},
 Marathon:{distance:.24,pace:.24,power:.26,hr:.12,drift:.08,rpe:.06,objective:'Hold race-specific effort economically and under control.'},
 Tempo:{distance:.23,pace:.25,power:.28,hr:.10,drift:.07,rpe:.07,objective:'Accumulate sustainable threshold work without turning it into a race.'},
 Intervals:{distance:.22,pace:.24,power:.30,hr:.08,drift:.04,rpe:.12,objective:'Complete repeatable high-quality repetitions at the intended intensity.'},
 Repetition:{distance:.20,pace:.27,power:.27,hr:.05,drift:.03,rpe:.18,objective:'Develop relaxed speed and economy while preserving form.'},
 'Long run':{distance:.34,pace:.08,power:.08,hr:.18,drift:.24,rpe:.08,objective:'Build endurance, durability and late-run control without excess strain.'},
 'Fitness assessment':{distance:.20,pace:.28,power:.26,hr:.12,drift:.02,rpe:.12,objective:'Produce a valid, evenly paced benchmark that reflects current fitness.'},
 Race:{distance:.18,pace:.28,power:.22,hr:.12,drift:.05,rpe:.15,objective:'Execute the goal race with controlled pacing and sustainable effort.'}
};
function executionProfile(type){const b=baseType(type);if(['Specific long run','Race rehearsal','Progression'].includes(type))return EXECUTION_PROFILES['Long run'];return EXECUTION_PROFILES[b]||EXECUTION_PROFILES.Easy}
function expectedRpe(type){const b=baseType(type);return({Recovery:[1,3],Easy:[2,4],Steady:[4,6],Marathon:[5,7],Tempo:[7,8.5],Intervals:[7.5,9.5],Repetition:[8,10],'Long run':[3,6],'Fitness assessment':[9,10],Race:[8,10]})[b]||[2,6]}
function scoreBand(score){return score>=95?'Excellent execution':score>=85?'Good execution':score>=70?'Useful session; improve control':score>=50?'Limited training benefit':'Session objective largely missed'}
function targetMetricReliability(plan){if(!plan)return 0;const t=plan.type,b=baseType(t);if(['Recovery','Easy','Steady','Long run','Race'].includes(b)&&!['Progression','Specific long run','Race rehearsal'].includes(t))return .85;return .35}
function workoutScoreDetails(run,plan=run?.planId?state.plan.find(p=>p.id===run.planId):null){
 if(!run)return null;
 const actualKm=Number(run.distanceKm)||0,dur=Number(run.durationSec)||0;
 if(!(actualKm>0&&dur>0))return null;
 const type=plan?.type||run.type||'Easy',b=baseType(type),family=workoutFamily(type),profile=executionProfile(type),plannedKm=plan?Math.max(.1,Number(plan.distance)||0):null,actualPace=dur/actualKm;
 const isShortIntervals=family==='interval'||b==='Repetition',isThreshold=family==='threshold',isTargetedLong=['Specific long run','Race rehearsal','Progression'].includes(type);
 const ia=run.intervalAnalysis?.structured&&run.intervalAnalysis?.usableForScore&&run.intervalAnalysis?.scoredWork?.length?run.intervalAnalysis:null;
 const components=[],add=(key,name,score,baseWeight,detail,reliability=1,scope='whole session')=>{if(Number.isFinite(score)&&baseWeight>0&&reliability>0)components.push({key,name,score:clamp(score,0,100),baseWeight,weight:baseWeight*reliability,detail,reliability,scope})};
 let completionRatio=null;
 if(plan){
  completionRatio=actualKm/plannedKm;
  const diff=Math.abs(completionRatio-1),score=diff<=.05?100:completionRatio<1?clamp(100-(diff-.05)*125,0,100):clamp(100-(diff-.05)*95,0,100);
  const direction=completionRatio>1.05?'Over-completion is not rewarded because it adds unplanned load.':completionRatio<.95?'The intended volume was not fully completed.':'Completed within the intended distance range.';
  add('distance','Distance execution',score,profile.distance,`${actualKm.toFixed(2)} km completed versus ${plannedKm.toFixed(2)} km planned. ${direction}`,1,'entire run');
 }

 const workPace=ia?ia.scoredWork.map(x=>x.paceScore).filter(Number.isFinite):[];
 const workPower=ia?ia.scoredWork.map(x=>x.powerScore).filter(Number.isFinite):[];
 const useWorkTargets=!!ia&&(isShortIntervals||isThreshold||isTargetedLong);

 // Pace/power scope is workout-specific.
 // Short intervals/repetitions are never scored from a whole-run average because warm-up/recoveries/cooldown dominate it.
 if(plan?.zone?.pace>0){
   if(useWorkTargets&&workPace.length>=2)add('pace',isShortIntervals?'Interval pace execution':'Work-segment pace execution',avg(workPace),profile.pace,`${workPace.length} detected work repetitions/segments compared directly with ${pace(plan.zone.pace)} target.`,1,'detected work sections');
   else if(!isShortIntervals){
     const exactTarget=isThreshold||['Marathon','Fitness assessment','Race'].includes(b)||isTargetedLong;
     let score,reliability,scope;
     if(!exactTarget){
       const fastRatio=plan.zone.pace/actualPace; // >1 means faster than guide
       score=fastRatio<=1.03?100:clamp(100-(fastRatio-1.03)*220,0,100);
       reliability=family==='recovery'||family==='aerobic'||family==='long'?.9:.75;scope='entire run · intensity ceiling';
     }else{
       const ratio=plan.zone.pace/actualPace;score=clamp(100-Math.abs(1-ratio)*145,0,100);
       reliability=isThreshold||isTargetedLong?.35:b==='Marathon'?.6:.65;scope='entire run · supporting target estimate';
     }
     add('pace',exactTarget?'Pace execution':'Pace control',score,profile.pace,`${pace(actualPace)} whole-run average versus ${pace(plan.zone.pace)} ${exactTarget?'target':'intensity guide'}.${exactTarget&&reliability<.5?' Warm-up/cooldown make the whole-run value supporting evidence only.':' Slower-than-guide running is not penalised for this session type.'}`,reliability,scope);
   }
 }
 if(Number(run.avgPower)>0&&plan?.zone?.power>0){
   if(useWorkTargets&&workPower.length>=2)add('power',isShortIntervals?'Interval power execution':'Work-segment power execution',avg(workPower),profile.power,`${workPower.length} detected work repetitions/segments compared directly with ${Math.round(plan.zone.power)} W target.`,1,'detected work sections');
   else if(!isShortIntervals){
     const exactTarget=isThreshold||['Marathon','Fitness assessment','Race'].includes(b)||isTargetedLong;
     let score,reliability,scope;
     if(!exactTarget){
       const ratio=Number(run.avgPower)/plan.zone.power;score=ratio<=1.05?100:clamp(100-(ratio-1.05)*200,0,100);
       reliability=family==='recovery'||family==='aerobic'||family==='long'?.9:.75;scope='entire run · intensity ceiling';
     }else{
       const ratio=Number(run.avgPower)/plan.zone.power;score=clamp(100-Math.abs(1-ratio)*140,0,100);
       reliability=isThreshold||isTargetedLong?.35:b==='Marathon'?.6:.65;scope='entire run · supporting target estimate';
     }
     add('power',exactTarget?'Power execution':'Power control',score,profile.power,`${Math.round(Number(run.avgPower))} W whole-run average versus ${Math.round(plan.zone.power)} W ${exactTarget?'target':'intensity guide'}.${exactTarget&&reliability<.5?' Warm-up/cooldown make the whole-run value supporting evidence only.':' Lower-than-guide power is not penalised for this session type.'}`,reliability,scope);
   }
 }
 if(ia&&Number(ia.adherencePenalty)>0){
   const adherenceScore=clamp(100-ia.adherencePenalty*5,0,100);
   add('repAdherence','Repetition prescription adherence',adherenceScore,.12,`${ia.detectedReps} detected versus ${ia.expectedReps} prescribed. ${ia.extraReps?`${ia.extraReps} extra rep${ia.extraReps===1?'':'s'} added unplanned load.`:''}${ia.missingReps?`${ia.missingReps} prescribed rep${ia.missingReps===1?' was':'s were'} not detected.`:''}`,1,'workout structure');
 }

 // Heart rate: continuous aerobic sessions use the whole run; quality sessions use detected work sections when available.
 if(Number(run.avgHr)>0&&plan?.zone?.hr>0){
   let hr=Number(run.avgHr),reliability=1,scope='entire run',label='Heart-rate control';
   if(ia&&(isShortIntervals||isThreshold)){
     const hrRows=ia.scoredWork.map(x=>Number(x.avgHr)).filter(v=>Number.isFinite(v)&&v>0);
     if(hrRows.length>=2){
       const later=hrRows.slice(Math.floor(hrRows.length/2));hr=avg(later.length?later:hrRows);
       reliability=isShortIntervals?(b==='Repetition'?.25:.45):.7;scope='later detected work sections';label='Work-section heart-rate control';
     }else reliability=isShortIntervals?.2:.3;
   }else if(isTargetedLong){reliability=.55;scope='entire run · mixed-session support'}
   else if(['Fitness assessment','Race'].includes(b)){reliability=.5;scope='entire run · supporting only'}
   const guide=plan.zone.hr,delta=(hr-guide)/Math.max(1,guide),score=hr<=guide?100:clamp(100-delta*180,0,100);
   add('hr',label,score,profile.hr,`${Math.round(hr)} bpm ${scope.includes('work')?'work-section':'whole-run'} value versus ${Math.round(guide)} bpm guide. Heart rate is treated as an upper control guide; lower HR receives full, not extra, credit.${isShortIntervals?' HR lags short repetitions, so its execution weight is deliberately low.':''}`,reliability,scope);
 }

 // Power-based cardiac drift is a continuous-aerobic metric. It is not an execution score for short intervals/repetitions.
 if(Number.isFinite(Number(run.powerDrift))){
   const drift=Number(run.powerDrift),score=clamp(100-Math.max(0,drift-2)*6,0,100);
   let relevance=1,scope='entire run';
   if(isShortIntervals)relevance=0;
   else if(isThreshold)relevance=.35;
   else if(['Fitness assessment','Race'].includes(b))relevance=0;
   else if(isTargetedLong)relevance=.6;
   if(relevance>0)add('drift','Cardiac drift',score,profile.drift,`${drift.toFixed(1)}% power-based drift; values up to about 2% receive full credit.${relevance<1?' This mixed/intense session makes drift supporting rather than primary evidence.':''}`,relevance,scope);
 }

 // RPE is always a whole-session measure. For a substantially incomplete quality workout its reliability is reduced to avoid double-penalising incompletion.
 const rpe=Number(run.rpe),range=expectedRpe(type);
 if(Number.isFinite(rpe)&&rpe>0){
   const dist=rpe<range[0]?range[0]-rpe:rpe>range[1]?rpe-range[1]:0,score=clamp(100-dist*14,0,100);
   const rpeReliability=Number.isFinite(completionRatio)&&completionRatio<.7&&(isShortIntervals||isThreshold)?.65:1;
   add('rpe','Session effort appropriateness',score,profile.rpe,`Session RPE ${rpe}/10 versus expected ${range[0]}–${range[1]} for this workout objective.${rpeReliability<1?' Reliability is reduced because less than 70% of planned distance was completed.':''}`,rpeReliability,'entire session');
 }

 const weightTotal=sum(components.map(c=>c.weight));components.forEach(c=>c.effectiveWeight=weightTotal?c.weight/weightTotal:0);
 let raw=weightTotal?sum(components.map(c=>c.score*c.weight))/weightTotal:null,cap=null,capReason='';
 if(Number(run.pain)>=7){cap=50;capReason=`Pain ${Number(run.pain)}/10 substantially reduced the training value and caps the final score at 50.`}
 else if(Number(run.pain)>=5){cap=70;capReason=`Although observable execution may have been sound, pain ${Number(run.pain)}/10 limits the training value and caps the final score at 70.`}
 else if(Number(run.pain)>=3){cap=82;capReason=`Although the workout may have been executed well, pain ${Number(run.pain)}/10 limits progression and caps the final score at 82.`}
 const final=Number.isFinite(raw)?Math.round(clamp(cap==null?raw:Math.min(raw,cap),0,100)):null;
 const baseWeightTotal=sum(components.map(c=>c.baseWeight)),weightedReliability=baseWeightTotal?sum(components.map(c=>c.baseWeight*c.reliability))/baseWeightTotal:0;
 const evidenceQuality=plan?(weightedReliability>=.8?'high':weightedReliability>=.55?'moderate':'limited'):(components.length>=2?'low':'very low');
 return{score:final,rawScore:Number.isFinite(raw)?raw:null,components,cap,capReason,plan,objective:plan?.purpose||profile.objective,interpretation:scoreBand(final),evidenceQuality,weightedReliability};
}
function workoutScore(run,plan=run?.planId?state.plan.find(p=>p.id===run.planId):null){return workoutScoreDetails(run,plan)?.score??null}

function personalModelConfidence(n,consistency=.75){
 const rank=n>=10&&consistency>=.7?4:n>=6&&consistency>=.6?3:n>=3?2:n>=1?1:0;
 return{rank,label:rank===4?'Strong':rank===3?'Moderate':rank===2?'Emerging':rank===1?'Very limited':'Insufficient',
   maturity:rank===4?'Established personal pattern':rank===3?'Moderate personal evidence':rank===2?'Emerging personal pattern':rank===1?'Early observation':'Insufficient evidence'};
}
function runLateEfficiencyDelta(run){
 const thirds=streamThirds(run);if(!thirds)return null;
 const e=thirds.early?.efficiency,l=thirds.late?.efficiency;
 return Number.isFinite(e)&&Number.isFinite(l)&&e>0?(l/e-1)*100:null;
}
function personalRuns(asOf=iso(today()),excludeId=null){
 return completedRuns(asOf).filter(r=>r.id!==excludeId&&r.date<=asOf).slice().sort((a,b)=>a.date.localeCompare(b.date));
}
function personalWeeklyObservations(asOf=iso(today()),excludeId=null){
 const runs=personalRuns(asOf,excludeId),groups=new Map();
 runs.forEach(r=>{
   const w=trainingWeekForDate(r.date);
   if(!groups.has(w))groups.set(w,[]);
   groups.get(w).push(r);
 });
 const weeks=[...groups.keys()].sort((a,b)=>a-b),rows=[];
 weeks.forEach((w,idx)=>{
   const wr=groups.get(w),actual=sum(wr.map(r=>Number(r.distanceKm)||0)),scores=wr.map(r=>workoutScore(r)).filter(Number.isFinite),pain=wr.map(r=>Number(r.pain)).filter(Number.isFinite),hrv=wr.map(r=>Number(r.hrv)).filter(v=>Number.isFinite(v)&&v>0);
   const prev=idx?groups.get(weeks[idx-1]):null,prevKm=prev?sum(prev.map(r=>Number(r.distanceKm)||0)):null,growth=prevKm>0?(actual/prevKm-1)*100:null;
   const next=groups.get(w+1)||[],nextScores=next.map(r=>workoutScore(r)).filter(Number.isFinite),nextPain=next.map(r=>Number(r.pain)).filter(Number.isFinite);
   rows.push({week:w,actual,growth,score:avg(scores),maxPain:pain.length?Math.max(...pain):0,hrv:avg(hrv),nextScore:avg(nextScores),nextMaxPain:nextPain.length?Math.max(...nextPain):null});
 });
 return rows;
}
function effectiveRunType(run){
 const plan=run?.planId?state.plan.find(p=>p.id===run.planId):null;
 return plan?.type||run?.type||'Easy';
}
function effectiveWorkoutFamily(run){return workoutFamily(effectiveRunType(run));}

function personalResponseModel(asOf=iso(today()),excludeId=null){
 const runs=personalRuns(asOf,excludeId),weeks=personalWeeklyObservations(asOf,excludeId);
 const dimensions=[];

 // Volume tolerance: observe weekly growth vs following-week execution/pain.
 const volumeObs=weeks.filter(w=>Number.isFinite(w.growth)&&Number.isFinite(w.nextScore));
 const gentle=volumeObs.filter(w=>w.growth>=0&&w.growth<=7),aggressive=volumeObs.filter(w=>w.growth>7);
 const gentleScore=avg(gentle.map(w=>w.nextScore)),aggressiveScore=avg(aggressive.map(w=>w.nextScore));
 const gentlePain=avg(gentle.map(w=>Number(w.nextMaxPain)).filter(Number.isFinite)),aggressivePain=avg(aggressive.map(w=>Number(w.nextMaxPain)).filter(Number.isFinite));
 let volumeStatus='Building',volumeSummary='Needs at least two completed training weeks to learn how weekly volume changes affect the following week.';
 if(volumeObs.length>=3){
   if(gentle.length>=2&&aggressive.length>=2&&Number.isFinite(gentleScore)&&Number.isFinite(aggressiveScore)){
     if(gentleScore>=aggressiveScore+5||Number.isFinite(aggressivePain)&&Number.isFinite(gentlePain)&&aggressivePain>=gentlePain+2){
       volumeStatus='Gradual progression preferred';volumeSummary=`Weeks increasing by 0–7% were followed by stronger or lower-cost training than >7% increases in the available observations.`;
     }else if(aggressiveScore>=gentleScore-2){
       volumeStatus='Higher progression tolerated';volumeSummary='The available observations do not show a clear execution penalty from weeks increasing by more than 7%.';
     }else{volumeStatus='Moderate tolerance';volumeSummary='Volume response is mixed; neither gradual nor larger weekly increases clearly dominate yet.'}
   }else{volumeStatus='Emerging';volumeSummary='A personal volume-response pattern is forming, but there are not yet enough contrasting progression weeks.'}
 }
 const volConf=personalModelConfidence(volumeObs.length,volumeObs.length?Math.min(1,.55+volumeObs.length*.04):0);
 dimensions.push({key:'volume',name:'Volume tolerance',status:volumeStatus,confidence:volConf,count:volumeObs.length,summary:volumeSummary,
   evidence:[gentle.length?`${gentle.length} gradual-growth week${gentle.length===1?'':'s'} · next-week execution ${Number.isFinite(gentleScore)?Math.round(gentleScore)+'/100':'—'}`:null,aggressive.length?`${aggressive.length} >7% growth week${aggressive.length===1?'':'s'} · next-week execution ${Number.isFinite(aggressiveScore)?Math.round(aggressiveScore)+'/100':'—'}`:null].filter(Boolean)});

 // Intensity tolerance: quality sessions and next-session response.
 const quality=runs.filter(r=>['interval','threshold'].includes(effectiveWorkoutFamily(r)));
 const intensityObs=quality.map(r=>{
   const idx=runs.findIndex(x=>x.id===r.id),next=runs.slice(idx+1).find(x=>dte(x.date)-dte(r.date)<=3*DAY),score=workoutScore(r),nextScore=next?workoutScore(next):null;
   return{run:r,score,nextScore,rpe:Number(r.rpe),drift:Number(r.powerDrift),pain:Number(r.pain)};
 }).filter(x=>Number.isFinite(x.score));
 const goodQuality=intensityObs.filter(x=>x.score>=82&&(!Number.isFinite(x.rpe)||x.rpe<=9)&&(!Number.isFinite(x.pain)||x.pain<3));
 const costlyQuality=intensityObs.filter(x=>(Number.isFinite(x.rpe)&&x.rpe>=9)||(Number.isFinite(x.pain)&&x.pain>=3)||(Number.isFinite(x.drift)&&x.drift>9));
 const nextExec=avg(intensityObs.map(x=>x.nextScore).filter(Number.isFinite));
 let intStatus='Building',intSummary='Needs repeated interval/threshold sessions; a linked quality workout counts immediately as an observation.';
 if(intensityObs.length>=3){
   const goodRate=goodQuality.length/intensityObs.length,costRate=costlyQuality.length/intensityObs.length;
   if(goodRate>=.7&&costRate<=.25){intStatus='Good';intSummary='Most recent quality sessions have been executed well without repeated high-cost or pain signals.'}
   else if(costRate>=.45){intStatus='Cautious';intSummary='A sizeable share of quality sessions have produced high RPE, pain, drift or other elevated-cost signals.'}
   else{intStatus='Moderate';intSummary='Quality work is generally tolerated, but the response is not consistently low-cost yet.'}
 }
 const intConf=personalModelConfidence(intensityObs.length, intensityObs.length?1-costlyQuality.length/intensityObs.length*.6:0);
 dimensions.push({key:'intensity',name:'Intensity tolerance',status:intStatus,confidence:intConf,count:intensityObs.length,summary:intSummary,
   evidence:[`${goodQuality.length}/${intensityObs.length||0} quality sessions met the low-cost execution definition`,Number.isFinite(nextExec)?`Average next-session execution ${Math.round(nextExec)}/100`:null].filter(Boolean)});

 // Long-run tolerance and durability.
 const longs=runs.filter(r=>effectiveWorkoutFamily(r)==='long');
 const longObs=longs.map(r=>({run:r,score:workoutScore(r),drift:Number(r.powerDrift),late:runLateEfficiencyDelta(r),pain:Number(r.pain)}));
 const stableLong=longObs.filter(x=>(!Number.isFinite(x.drift)||x.drift<=5)&&(!Number.isFinite(x.late)||x.late>=-6)&&(!Number.isFinite(x.pain)||x.pain<3));
 const longest=longs.length?Math.max(...longs.map(r=>Number(r.distanceKm)||0)):null,lateAvg=avg(longObs.map(x=>x.late).filter(Number.isFinite)),driftAvg=avg(longObs.map(x=>x.drift).filter(Number.isFinite));
 let longStatus='Building',longSummary='Only long-run sessions count here; repeated long-run evidence is needed to assess durability.';
 if(longObs.length>=3){
   const stableRate=stableLong.length/longObs.length;
   if(stableRate>=.7){longStatus='Good';longSummary='Long runs have usually maintained power/efficiency without repeated adverse pain or drift signals.'}
   else if(stableRate<.4){longStatus='Developing';longSummary='Late-run stability is not yet consistent across the available long-run evidence.'}
   else{longStatus='Moderate';longSummary='Long-run tolerance is mixed: some sessions are stable while others show meaningful late-session cost.'}
 }
 const longConf=personalModelConfidence(longObs.length,longObs.length?stableLong.length/longObs.length:.5);
 dimensions.push({key:'long',name:'Long-run tolerance',status:longStatus,confidence:longConf,count:longObs.length,summary:longSummary,
   evidence:[Number.isFinite(longest)?`Longest completed run ${longest.toFixed(1)} km`:null,Number.isFinite(driftAvg)?`Average long-run drift ${driftAvg.toFixed(1)}%`:null,Number.isFinite(lateAvg)?`Average late-run efficiency change ${lateAvg>=0?'+':''}${lateAvg.toFixed(1)}%`:null].filter(Boolean)});

 // Recovery speed: quality/long session followed by normal next-session response within 72h.
 const demanding=runs.filter(r=>['interval','threshold','long'].includes(effectiveWorkoutFamily(r)));
 const recoveryObs=demanding.map(r=>{
   const idx=runs.findIndex(x=>x.id===r.id),next=runs.slice(idx+1).find(x=>dte(x.date)-dte(r.date)<=3*DAY);
   if(!next)return null;
   const nextScore=workoutScore(next),hrv=Number(next.hrv),pain=Number(next.pain),stable=(Number.isFinite(nextScore)?nextScore>=75:true)&&(!Number.isFinite(pain)||pain<3);
   return{run:r,next,nextScore,hrv,pain,stable,days:(dte(next.date)-dte(r.date))/DAY};
 }).filter(Boolean);
 const recovered=recoveryObs.filter(x=>x.stable),recRate=recoveryObs.length?recovered.length/recoveryObs.length:null,avgDays=avg(recovered.map(x=>x.days));
 let recStatus='Building',recSummary='Needs a demanding interval/threshold/long run plus a later recorded session within 72 hours.';
 if(recoveryObs.length>=3){
   if(recRate>=.75){recStatus='Good';recSummary='Most demanding sessions have been followed by a stable next recorded session within 72 hours.'}
   else if(recRate<.5){recStatus='Slow / variable';recSummary='Recovery after demanding sessions has often remained incomplete by the next recorded session.'}
   else{recStatus='Moderate';recSummary='Recovery is usually adequate but not consistently stable across demanding sessions.'}
 }
 const recConf=personalModelConfidence(recoveryObs.length,recRate??.5);
 dimensions.push({key:'recovery',name:'Recovery speed',status:recStatus,confidence:recConf,count:recoveryObs.length,summary:recSummary,
   evidence:[recoveryObs.length?`${recovered.length}/${recoveryObs.length} demanding sessions followed by stable next-session response`:null,Number.isFinite(avgDays)?`Stable response observed after ${avgDays.toFixed(1)} days on average`:null].filter(Boolean)});

 // Performance responsiveness from comparable-run deltas.
 const compObs=runs.map(r=>({run:r,comp:comparableRunAnalysis(r)})).filter(x=>x.comp&&x.comp.confidence!=='Low'&&Number.isFinite(x.comp.efficiencyDelta));
 const positiveComp=compObs.filter(x=>x.comp.efficiencyDelta>=2),negativeComp=compObs.filter(x=>x.comp.efficiencyDelta<=-2),compAvg=avg(compObs.map(x=>x.comp.efficiencyDelta));
 let perfStatus='Building',perfSummary='Needs enough similar historical runs to create a Moderate/High-confidence comparable-run baseline.';
 if(compObs.length>=3){
   if(Number.isFinite(compAvg)&&compAvg>=2){perfStatus='Improving';perfSummary='Recent comparable sessions are generally being completed at lower physiological cost than the personal baseline.'}
   else if(Number.isFinite(compAvg)&&compAvg<=-2){perfStatus='Under pressure';perfSummary='Comparable-run efficiency has recently been below the personal baseline often enough to warrant caution.'}
   else{perfStatus='Stable';perfSummary='Comparable-run physiology is broadly stable rather than showing a clear upward or downward response.'}
 }
 const perfConsistency=compObs.length?Math.max(positiveComp.length,negativeComp.length,compObs.length-positiveComp.length-negativeComp.length)/compObs.length:.5;
 const perfConf=personalModelConfidence(compObs.length,perfConsistency);
 dimensions.push({key:'performance',name:'Performance responsiveness',status:perfStatus,confidence:perfConf,count:compObs.length,summary:perfSummary,
   evidence:[Number.isFinite(compAvg)?`Mean comparable-run efficiency difference ${compAvg>=0?'+':''}${compAvg.toFixed(1)}%`:null,`${positiveComp.length} clearly positive · ${negativeComp.length} clearly negative comparable sessions`].filter(Boolean)});

 const overallEvidence=sum(dimensions.map(d=>Math.min(10,d.count))),overallConfidence=personalModelConfidence(Math.round(overallEvidence/Math.max(1,dimensions.length)),.75);
 const limiter=dimensions.filter(d=>d.confidence.rank>=2).sort((a,b)=>{
   const risk=s=>/cautious|developing|slow|pressure/i.test(s)?2:/moderate|building/i.test(s)?1:0;
   return risk(b.status)-risk(a.status)||b.confidence.rank-a.confidence.rank;
 })[0]||null;
 const strength=dimensions.filter(d=>d.confidence.rank>=2&&/good|improving|tolerated|preferred/i.test(d.status)).sort((a,b)=>b.confidence.rank-a.confidence.rank)[0]||null;
 return{asOf,dimensions,overallConfidence,limiter,strength,totalRuns:runs.length,totalWeeks:weeks.length,
   note:'These are athlete-specific observational patterns, not proof that one training variable caused another outcome.'};
}
function personalResponseSignal(run,model=personalResponseModel(run?.date||iso(today()),run?.id)){
 if(!run||!model)return{value:0,confidence:'Insufficient',detail:'No mature personal-response pattern available.'};
 const family=workoutFamily(run.type);
 const key=family==='interval'||family==='threshold'?'intensity':family==='long'?'long':family==='recovery'||family==='aerobic'?'volume':'performance';
 const d=model.dimensions.find(x=>x.key===key),perf=model.dimensions.find(x=>x.key==='performance');
 if(!d||d.confidence.rank<2)return{value:0,confidence:d?.confidence.label||'Insufficient',detail:`${d?.name||'Relevant personal pattern'} is not mature enough to influence a decision.`};
 let value=0;
 if(/good|improving|tolerated|preferred/i.test(d.status))value=.12;
 else if(/cautious|developing|slow|pressure/i.test(d.status))value=-.12;
 if(perf&&perf.confidence.rank>=3){
   if(/improving/i.test(perf.status))value+=.04;
   else if(/pressure/i.test(perf.status))value-=.04;
 }
 value=clamp(value,-.15,.15);
 return{value,confidence:d.confidence.label,detail:`${d.name}: ${d.status} · ${d.confidence.label.toLowerCase()} confidence from ${d.count} observation${d.count===1?'':'s'}.`,dimension:d};
}
function personalResponseModelHtml(){
 const m=personalResponseModel(),cards=m.dimensions.map(d=>`<article class="personalDimension ${d.confidence.rank<2?'immature':''}"><div class="personalDimHead"><div><small>${esc(d.name.toUpperCase())}</small><h4>${esc(d.status)}</h4></div><span>${esc(d.confidence.label)}</span></div><p>${esc(d.summary)}</p><div class="personalEvidenceCount">${d.count} observation${d.count===1?'':'s'} · ${esc(d.confidence.maturity)}</div><details><summary>Supporting observations</summary>${d.evidence.length?d.evidence.map(x=>`<p>${esc(x)}</p>`).join(''):'<p>Not enough evidence yet.</p>'}<p class="muted compact">This is an observed association in your own training history, not a causal claim.</p></details></article>`).join('');
 return`<section class="personalModelPanel"><div class="personalModelHead"><div><small>PERSONAL RESPONSE MODEL</small><h3>How your training response is being learned</h3></div><span>${esc(m.overallConfidence.label)} overall confidence</span></div><p>The model learns from repeated relationships between training load, workout execution, comparable-run physiology, long-run stability, pain and subsequent sessions. It deliberately learns slowly.</p>${m.strength||m.limiter?`<div class="personalModelSummary">${m.strength?`<div class="strength"><small>CURRENT STRENGTH</small><b>${esc(m.strength.name)} · ${esc(m.strength.status)}</b></div>`:''}${m.limiter?`<div class="limiter"><small>CURRENT LIMITER / WATCH</small><b>${esc(m.limiter.name)} · ${esc(m.limiter.status)}</b></div>`:''}</div>`:''}<div class="personalDimensionGrid">${cards}</div><div class="personalModelNote"><b>How it is used</b><p>Only Emerging-or-better personal patterns can add a small signal to the Training Decision Engine. The personal signal is capped at ±0.15 and cannot override pain/safety logic or Readiness.</p><p>${esc(m.note)}</p></div></section>`;
}

function personalPathwaySignal(run,model,pathway){
 if(!run||!model)return{value:0,confidence:'Insufficient',detail:'No mature personal-response pattern available.'};
 const family=effectiveWorkoutFamily(run);
 let key;
 if(pathway==='pace')key=(family==='interval'||family==='threshold')?'intensity':'performance';
 else key=family==='long'?'long':family==='interval'||family==='threshold'?'intensity':'volume';
 const d=model.dimensions.find(x=>x.key===key);
 if(!d||d.confidence.rank<2)return{value:0,confidence:d?.confidence.label||'Insufficient',detail:`${d?.name||'Relevant personal pattern'} is not mature enough to influence this pathway.`};
 let value=0;
 if(/good|improving|tolerated|preferred/i.test(d.status))value=.10;
 else if(/cautious|developing|slow|pressure/i.test(d.status))value=-.10;
 return{value:clamp(value,-.12,.12),confidence:d.confidence.label,detail:`${d.name}: ${d.status} · ${d.confidence.label.toLowerCase()} confidence from ${d.count} observation${d.count===1?'':'s'}.`,dimension:d};
}

const PATHWAY_LEARNING_RATE={pace:.0065,loadPositive:.012,loadNegative:.025};
function paceAcceptedContribution(decision){
 if(!decision||!Number.isFinite(decision.finalSignal)||!Number.isFinite(decision.confidenceWeight))return 0;
 return decision.finalSignal*decision.confidenceWeight*PATHWAY_LEARNING_RATE.pace;
}
function loadAcceptedContribution(decision){
 if(!decision||!Number.isFinite(decision.finalSignal)||!Number.isFinite(decision.confidenceWeight))return 0;
 const rate=decision.finalSignal>=0?PATHWAY_LEARNING_RATE.loadPositive:PATHWAY_LEARNING_RATE.loadNegative;
 return decision.finalSignal*decision.confidenceWeight*rate;
}
function weeklyPaceEvidence(w=trainingWeekForDate(iso(today())),asOf=iso(today())){
 const runs=(state.runs||[]).filter(r=>trainingWeekForDate(r.date)===w&&r.date<=asOf&&r.source!=='assessment').sort((a,b)=>a.date.localeCompare(b.date));
 const rows=runs.map(r=>{const p=r.planId?state.plan.find(x=>x.id===r.planId):null,d=decisionSignalForRun(r,p),contribution=paceAcceptedContribution(d);return{run:r,decision:d,contribution}});
 const bucket=sum(rows.map(x=>x.contribution));
 return{week:w,rows,bucket,positive:rows.filter(x=>x.contribution>.00005).length,negative:rows.filter(x=>x.contribution<-.00005).length};
}
function pathwayEvidenceTrace(run,pathway){
 const plan=run?.planId?state.plan.find(p=>p.id===run.planId):null,w=trainingWeekForDate(run?.date||iso(today()));
 if(pathway==='pace'){
   const d=decisionSignalForRun(run,plan),accepted=paceAcceptedContribution(d),weekly=weeklyPaceEvidence(w,run.date);
   const analysedRows=weekly.rows;
   const acceptedRows=analysedRows.filter(x=>Math.abs(x.contribution)>=.00005);
   const bucket=sum(acceptedRows.map(x=>x.contribution));
   const applied=pacePowerCommittedFactor(run.date),rawProjected=clamp(applied+bucket,state.setup.minFactor,state.setup.maxFactor);
   const roundedIndex=Math.round(rawProjected*100*2)/2,projected=Math.abs(roundedIndex-100)<.75?1:roundedIndex/100;
   const thresholdBlocked=Math.abs(rawProjected-applied)>=.00005&&Math.abs(projected-applied)<.0005;
   return{pathway:'pace',rawSignal:Number.isFinite(d.rawIntegratedSignal)?d.rawIntegratedSignal:d.finalSignal,acceptedSignal:d.finalSignal,confidenceWeight:d.confidenceWeight,learningRate:PATHWAY_LEARNING_RATE.pace,acceptedContribution:accepted,weeklyBucket:bucket,analysedCount:analysedRows.length,analysedCount:analysedRows.length,weeklyRows:acceptedRows.map(x=>({date:x.run.date,type:x.run.type,contribution:x.contribution})),applied,rawProjected,projected,thresholdBlocked,safeguard:d.safeguardNote||'No additional safeguard changed the integrated signal.',status:thresholdBlocked?'Accepted evidence is accumulating, but the Pace & Power stability threshold has not yet been crossed.':Math.abs(projected-applied)>=.0005?'Projected change pending weekly review.':'No accepted factor change from current evidence.'};
 }
 const d=loadDecisionSignalForRun(run,plan),accepted=loadAcceptedContribution(d),weekly=weeklyLoadEvidence(w,false,run.date);
 const analysedRows=weekly.decisions;
 const acceptedRows=analysedRows.filter(x=>Math.abs(x.contribution)>=.00005);
 const bucket=sum(acceptedRows.map(x=>x.contribution));
 const applied=adaptiveFactorDetails(w).cumulativeFactor,rawProjected=clamp(applied+bucket,state.setup.minFactor,state.setup.maxFactor);
 return{pathway:'load',rawSignal:Number.isFinite(d.rawIntegratedSignal)?d.rawIntegratedSignal:d.finalSignal,acceptedSignal:d.finalSignal,confidenceWeight:d.confidenceWeight,learningRate:d.finalSignal>=0?PATHWAY_LEARNING_RATE.loadPositive:PATHWAY_LEARNING_RATE.loadNegative,acceptedContribution:accepted,weeklyBucket:bucket,weeklyRows:acceptedRows.map(x=>({date:x.run.date,type:x.run.type,contribution:x.contribution})),applied,rawProjected,projected:rawProjected,thresholdBlocked:false,safeguard:d.safeguardNote||'No additional safeguard changed the integrated signal.',status:Math.abs(rawProjected-applied)>=.0005?'Projected change pending weekly review.':'No accepted factor change from current evidence.'};
}
function decisionSignalForRun(run,plan=run?.planId?state.plan.find(p=>p.id===run.planId):null){
 const details=workoutScoreDetails(run,plan),score=details?.score??null,family=workoutFamily(plan?.type||run.type),type=plan?.type||run.type;
 const baseWeight=EVIDENCE_WEIGHT[run.type]??EVIDENCE_WEIGHT[baseType(run.type)]??.15;
 let confidenceWeight=baseWeight,confidenceReasons=[],signals=[],confidenceMultipliers=[];
 if(!plan&&run.type!=='Race'){confidenceWeight*=.35;confidenceReasons.push('not matched to a planned workout');confidenceMultipliers.push({label:'Unlinked workout',factor:.35})}
 const completion=plan&&Number(plan.distance)>0?Number(run.distanceKm)/Number(plan.distance):null;
 if(Number.isFinite(completion)&&completion<.7){confidenceWeight*=.35;confidenceReasons.push('less than 70% of prescribed distance completed');confidenceMultipliers.push({label:'Less than 70% of prescribed distance',factor:.35})}

 const qualitySession=family==='interval'||family==='threshold'||family==='assessment'||['Marathon-specific','Half-marathon-specific','Race rehearsal'].includes(type);
 const capabilityComponents=(details?.components||[]).filter(c=>['pace','power','repAdherence'].includes(c.key));
 const capabilityWeight=sum(capabilityComponents.map(c=>c.effectiveWeight||0));
 const capabilityScore=capabilityComponents.length&&capabilityWeight>0?sum(capabilityComponents.map(c=>c.score*(c.effectiveWeight||0)))/capabilityWeight:null;
 const capabilityExecutionComponents=capabilityComponents.map(c=>({name:c.name,score:c.score,effectiveWeight:capabilityWeight>0?(c.effectiveWeight||0)/capabilityWeight:0,scope:c.scope,detail:c.detail}));
 let performanceSignal=0;
 if(qualitySession&&Number.isFinite(capabilityScore))performanceSignal=clamp((capabilityScore-82)/18,-1,1);
 else if(Number.isFinite(score)&&score<65)performanceSignal=clamp((score-70)/30,-.35,0); // poor execution can weaken confidence, easy running cannot manufacture speed gains
 signals.push({name:'Performance capability',value:performanceSignal,detail:Number.isFinite(capabilityScore)?`${Math.round(capabilityScore)}/100 from pace/power/work-repetition evidence`:qualitySession?'No reliable target-section capability score':'Easy/long execution is not treated as direct evidence of faster capability'});

 const comparison=comparableRunAnalysis(run);
 if(comparison?.confidence==='High'){confidenceWeight=Math.min(.95,confidenceWeight*1.15);confidenceMultipliers.push({label:'High-confidence comparable-run support',factor:1.15})}
 else if(comparison?.confidence==='Moderate'){confidenceWeight=Math.min(.95,confidenceWeight*1.05);confidenceMultipliers.push({label:'Moderate-confidence comparable-run support',factor:1.05})}
 let comparableSignal=0;
 if(comparison&&comparison.confidence!=='Low'&&Number.isFinite(comparison.efficiencyDelta)){
   comparableSignal=clamp(comparison.efficiencyDelta/5,-1,1);
   signals.push({name:'Comparable-run efficiency',value:comparableSignal,detail:`Efficiency ${comparison.efficiencyDelta>=0?'+':''}${comparison.efficiencyDelta.toFixed(1)}% vs ${comparison.count} comparable runs`});
 }

 let costSignal=0,costDetails=[];
 const drift=Number(run.powerDrift);
 if(Number.isFinite(drift)&&!['interval'].includes(family)){
   const good=family==='long'?4:family==='recovery'||family==='aerobic'?3:5,bad=family==='long'?8:family==='recovery'||family==='aerobic'?7:9;
   if(drift<=good)costSignal+=.10;
   else if(drift>=bad){costSignal-=.40;costDetails.push(`drift ${drift.toFixed(1)}%`)}
 }
 const rpe=Number(run.rpe),expectedMax=family==='recovery'?3:family==='aerobic'?4:family==='long'?6:family==='threshold'?8:family==='interval'?9:9;
 if(Number.isFinite(rpe)&&rpe>expectedMax+1){costSignal-=.35;costDetails.push(`RPE ${rpe}/10 above expected cost`)}
 costSignal=clamp(costSignal,-1,.20);
 signals.push({name:'Physiological cost',value:costSignal,detail:costDetails.length?costDetails.join(' · '):'No excessive cost signal'});

 const personalModel=personalResponseModel(run.date,run.id),personal=personalPathwaySignal(run,personalModel,'pace'),personalSignal=personal.value;
 if(personalSignal!==0)signals.push({name:'Personal pace response',value:personalSignal,detail:personal.detail});

 const signalComponents=[
   {key:'performance',label:'Performance capability',value:performanceSignal,weight:.58},
   {key:'comparable',label:'Comparable-run efficiency',value:comparableSignal,weight:.24},
   {key:'cost',label:'Physiological cost',value:costSignal,weight:.12},
   {key:'personal',label:'Personal pace response',value:personalSignal,weight:.06}
 ];
 let combined=sum(signalComponents.map(x=>x.value*x.weight));
 const initialIntegratedSignal=combined;
 let conflict=false,interpretation='',safeguardNote='';
 if(performanceSignal>.25&&costSignal<-.25){conflict=true;combined=Math.min(combined*.25,.15);safeguardNote='Conflicting evidence safeguard: positive performance was damped because physiological cost was unusually high.';interpretation='Performance capability was positive, but physiological cost was unusually high. Pace progression is deliberately held back.'}
 else if(performanceSignal<-.25&&comparableSignal>.35){conflict=true;combined=Math.max(combined*.4,-.15);safeguardNote='Mixed-evidence safeguard: negative target execution was moderated because comparable-run physiology remained positive.';interpretation='Target execution underperformed, but comparable-run physiology remained positive. Pace evidence is mixed rather than clearly negative.'}
 else if(combined>.25)interpretation='The session provides positive evidence that Pace & Power capability is improving.'
 else if(combined<-.25)interpretation='The session provides evidence for a more conservative Pace & Power calibration.'
 else interpretation='The session mainly supports holding the current Pace & Power calibration.';

 const pain=Number(run.pain);
 if(Number.isFinite(pain)&&pain>=5){combined=Math.min(0,combined);confidenceWeight*=.45;confidenceMultipliers.push({label:`Pain ${pain}/10`,factor:.45});safeguardNote=`Pain safety override: pain ${pain}/10 prevents positive capability progression.`;interpretation=`Pain ${pain}/10 overrides positive Pace & Power evidence.`;confidenceReasons.push('pain safety override')}
 else if(Number.isFinite(pain)&&pain>=3){if(combined>0)combined*=.25;confidenceWeight*=.55;confidenceMultipliers.push({label:`Pain ${pain}/10`,factor:.55});safeguardNote=`Pain safeguard: pain ${pain}/10 strongly reduces positive capability evidence.`;confidenceReasons.push('pain reduced positive evidence')}
 const preProtectionSignal=combined;
 if(combined<0&&confidenceWeight<.35){combined=0;safeguardNote=`Developing-confidence protection: the negative signal ${preProtectionSignal.toFixed(2)} is recorded, but is not accepted as a capability downgrade until evidence confidence increases.`;}
 const confidencePct=clamp(Math.round(confidenceWeight/.65*100),0,100),confidence=confidencePct>=75?'High':confidencePct>=45?'Moderate':'Developing';
 const action=combined>.25?'Positive Pace & Power evidence':combined<-.25?'Conservative Pace & Power evidence':'Hold Pace & Power';
 return{pathway:'pace',family,score,capabilityScore,capabilityExecutionComponents,signals,signalComponents,performanceSignal,comparableSignal,costSignal,personalSignal,personalResponse:personal,rawIntegratedSignal:initialIntegratedSignal,preProtectionSignal,finalSignal:clamp(combined,-1,1),baseConfidenceWeight:baseWeight,confidenceWeight,confidencePct,confidence,confidenceMultipliers,conflict,confidenceReasons,safeguardNote,interpretation,action,completion,comparison,componentDerivation:{performance:Number.isFinite(capabilityScore)?`(${capabilityScore.toFixed(1)} − 82) ÷ 18, bounded to −1…+1`:(Number.isFinite(score)&&score<65?`(${score} − 70) ÷ 30, bounded to −0.35…0`:'No direct capability signal'),comparable:comparison&&comparison.confidence!=='Low'&&Number.isFinite(comparison.efficiencyDelta)?`${comparison.efficiencyDelta.toFixed(1)}% ÷ 5, bounded to −1…+1`:'No Moderate/High-confidence comparable-run signal',cost:'Rules from RPE and, where relevant, cardiac drift',personal:personalSignal!==0?personal.detail:'No mature personal-response contribution'}};
}

function loadDecisionSignalForRun(run,plan=run?.planId?state.plan.find(p=>p.id===run.planId):null){
 const details=workoutScoreDetails(run,plan),score=details?.score??null,family=workoutFamily(plan?.type||run.type);
 const loadWeight={long:.70,aerobic:.45,recovery:.25,threshold:.30,interval:.25,assessment:.18}[family]??.25;
 let confidenceWeight=loadWeight,confidenceReasons=[],signals=[],confidenceMultipliers=[];
 const completion=plan&&Number(plan.distance)>0?Number(run.distanceKm)/Number(plan.distance):null;
 let completionSignal=0;
 if(Number.isFinite(completion)){
   if(completion<.70)completionSignal=-.75;
   else if(completion<.85)completionSignal=-.35;
   else if(completion<=1.05)completionSignal=.15;
   else if(completion<=1.12)completionSignal=0;
   else completionSignal=-.20;
   signals.push({name:'Prescribed load completion',value:completionSignal,detail:`${Math.round(completion*100)}% of planned distance completed`});
 }else{confidenceWeight*=.5;confidenceReasons.push('no matched planned load');confidenceMultipliers.push({label:'No matched planned load',factor:.50})}

 let toleranceSignal=0,toleranceDetails=[];
 const drift=Number(run.powerDrift);
 if(Number.isFinite(drift)&&(family==='aerobic'||family==='recovery'||family==='long')){
   if(drift<=3){toleranceSignal+=.25;toleranceDetails.push(`drift ${drift.toFixed(1)}%`)}
   else if(drift>7){toleranceSignal-=.55;toleranceDetails.push(`high drift ${drift.toFixed(1)}%`)}
   else if(drift>5){toleranceSignal-=.25;toleranceDetails.push(`elevated drift ${drift.toFixed(1)}%`)}
 }
 if(family==='long'){
   const late=runLateEfficiencyDelta(run);
   if(Number.isFinite(late)){
     if(late>=-4){toleranceSignal+=.30;toleranceDetails.push(`late-run efficiency ${late>=0?'+':''}${late.toFixed(1)}%`)}
     else if(late<=-8){toleranceSignal-=.45;toleranceDetails.push(`late-run efficiency ${late.toFixed(1)}%`)}
   }
 }
 if(family==='interval'&&run.intervalAnalysis?.structured){
   const ia=run.intervalAnalysis;
   if(ia.expectedReps>0&&ia.detectedReps===ia.expectedReps)toleranceSignal+=.10;
   if(ia.extraReps>0)toleranceSignal-=Math.min(.25,ia.extraReps*.06);
 }
 toleranceSignal=clamp(toleranceSignal,-1,.5);
 signals.push({name:'Load-tolerance response',value:toleranceSignal,detail:toleranceDetails.length?toleranceDetails.join(' · '):'No strong run-specific tolerance signal'});

 let executionSignal=0;
 if(Number.isFinite(score)){if(score>=88)executionSignal=.15;else if(score<65)executionSignal=-.20}
 signals.push({name:'Execution support',value:executionSignal,detail:Number.isFinite(score)?`${score}/100 workout execution`:'No execution score'});

 const personalModel=personalResponseModel(run.date,run.id),personal=personalPathwaySignal(run,personalModel,'load'),personalSignal=personal.value;
 if(personalSignal!==0)signals.push({name:'Personal load response',value:personalSignal,detail:personal.detail});

 const signalComponents=[
   {key:'completion',label:'Prescribed load completion',value:completionSignal,weight:.40},
   {key:'tolerance',label:'Load-tolerance response',value:toleranceSignal,weight:.38},
   {key:'execution',label:'Execution support',value:executionSignal,weight:.14},
   {key:'personal',label:'Personal load response',value:personalSignal,weight:.08}
 ];
 let combined=sum(signalComponents.map(x=>x.value*x.weight));
 const rawIntegratedSignal=combined;
 let safeguardNote='';
 const pain=Number(run.pain);
 if(Number.isFinite(pain)&&pain>=5){combined=Math.min(combined,-.65);confidenceWeight=Math.max(confidenceWeight,.45);safeguardNote=`Pain safety override: pain ${pain}/10 is treated as strong conservative load-tolerance evidence.`;confidenceReasons.push('pain safety/tolerance signal')}
 else if(Number.isFinite(pain)&&pain>=3){combined=Math.min(combined,-.25);safeguardNote=`Pain safeguard: pain ${pain}/10 prevents positive load progression from this run.`;confidenceReasons.push('pain limited load-tolerance evidence')}
 if(Number.isFinite(run.rpe)&&Number(run.rpe)>=9&&(family==='long'||family==='aerobic')){combined=Math.min(combined,-.20);safeguardNote=safeguardNote||`High-cost safeguard: RPE ${Number(run.rpe)}/10 limits positive load-tolerance interpretation.`;}
 const confidencePct=clamp(Math.round(confidenceWeight/.70*100),0,100),confidence=confidencePct>=75?'High':confidencePct>=45?'Moderate':'Developing';
 const action=combined>.18?'Positive Distance & Load evidence':combined<-.18?'Conservative Distance & Load evidence':'Hold Distance & Load';
 const interpretation=combined>.18?'The run provides positive evidence that this load was tolerated well.':combined<-.18?'The run provides evidence that load progression should be more conservative.':'The run does not materially change the current Distance & Load calibration.';
 return{pathway:'load',family,score,signals,signalComponents,completionSignal,toleranceSignal,executionSignal,personalSignal,personalResponse:personal,rawIntegratedSignal,finalSignal:clamp(combined,-1,1),baseConfidenceWeight:loadWeight,confidenceWeight,confidencePct,confidence,confidenceMultipliers,confidenceReasons,safeguardNote,interpretation,action,completion,componentDerivation:{completion:Number.isFinite(completion)?`${Math.round(completion*100)}% completion → ${completionSignal>=0?'+':''}${completionSignal.toFixed(2)} by the completion rule`:'No matched planned distance',tolerance:toleranceDetails.length?toleranceDetails.join(' · '):'No strong run-specific tolerance observation',execution:Number.isFinite(score)?`${score}/100 execution → ${executionSignal>=0?'+':''}${executionSignal.toFixed(2)} support signal`:'No execution score',personal:personalSignal!==0?personal.detail:'No mature personal-response contribution'}};
}
function twoPathwayDecisionForRun(run,plan=run?.planId?state.plan.find(p=>p.id===run.planId):null){
 return{pace:decisionSignalForRun(run,plan),load:loadDecisionSignalForRun(run,plan)};
}
function trainingEvidence(asOf=iso(today())){
 let valid=state.assessments.filter(a=>a.valid&&a.date<=asOf).sort((a,b)=>a.date.localeCompare(b.date)),anchor=valid.at(-1),anchorDate=anchor?.date||state.setup.planStart,runs=state.runs.filter(r=>r.date>=anchorDate&&r.date<=asOf&&r.source!=='assessment').sort((a,b)=>a.date.localeCompare(b.date)),raw=100,evidence=0,events=[];
 runs.forEach(r=>{
   const p=r.planId?state.plan.find(x=>x.id===r.planId):null,decision=twoPathwayDecisionForRun(r,p).pace;
   if(decision.score==null)return;
   const confidence=decision.confidenceWeight,signal=decision.finalSignal,acceptedContribution=paceAcceptedContribution(decision),delta=acceptedContribution*100;
   raw=clamp(raw+delta,95,105);evidence+=confidence;
   events.push({date:r.date,type:r.type,score:decision.score,delta,acceptedContribution,confidence,signal,decision});
 });
 let applied=Math.round((raw-100)*2)/2+100;if(Math.abs(applied-100)<.75)applied=100;
 let confidence=clamp(Math.round(evidence/4*100),0,100);
 return{rawIndex:raw,index:applied,adjustment:applied/100,confidence,events,anchorDate,anchorType:anchor?'Fitness assessment':'Setup baseline'};
}
function trainingWeekForDate(date=iso(today())){
 const d=dte(date);
 if(!(d instanceof Date)||Number.isNaN(d.getTime()))return currentWeek();
 return clamp(Math.floor((d-dte(state.setup.planStart))/(7*DAY))+1,1,weeks());
}
function reviewWeekForDate(date=iso(today())){
 const w=Math.max(1,Math.min(weeks(),trainingWeekForDate(date)));
 return w;
}
function pacePowerCommittedFactor(date=iso(today())){
 const w=reviewWeekForDate(date);
 if(w<=1)return 1;
 const priorWeekEnd=new Date(weekStart(w).getTime()-DAY);
 return trainingEvidence(iso(priorWeekEnd)).adjustment;
}
function pacePowerProvisionalFactor(date=iso(today())){
 return trainingEvidence(date).adjustment;
}
function pacePowerReviewState(date=iso(today())){
 const applied=pacePowerCommittedFactor(date),provisional=pacePowerProvisionalFactor(date);
 return{applied,provisional,delta:provisional-applied};
}
function baselineOn(date){let valid=state.assessments.filter(a=>a.valid&&a.date<=date).sort((a,b)=>a.date.localeCompare(b.date)),a=valid.at(-1),base=a?{pace:a.time/a.distance,hr:a.thresholdHr||state.setup.thresholdHr,cp:a.criticalPower||state.setup.criticalPower}:{pace:state.setup.testTime/state.setup.testDistance,hr:state.setup.thresholdHr,cp:state.setup.criticalPower},ev=trainingEvidence(date),applied=pacePowerCommittedFactor(date);return{pace:base.pace/applied,hr:base.hr,cp:base.cp*applied,evidence:{...ev,appliedAdjustment:applied,provisionalAdjustment:ev.adjustment}}}
const zoneDef={Recovery:[1.42,.78,.72,'RPE 2–3 · relaxed and restorative'],Easy:[1.30,.84,.78,'RPE 3–4 · conversational aerobic running'],Steady:[1.20,.89,.84,'RPE 5 · controlled moderate work'],Marathon:[1.15,.92,.88,'RPE 5–6 · race-specific control'],Tempo:[1.08,1,.95,'RPE 7–8 · strong but sustainable'],Intervals:[.98,1.04,1.05,'RPE 8–9 · quality repetitions'],Repetition:[.92,1.08,1.15,'RPE 9 · short fast work'],['Fitness assessment']:[1,1,1,'Even maximal benchmark'],['Race Day']:[1.15,.92,.88,'Controlled race execution']};
function zone(type,date){let b=baselineOn(date),z=zoneDef[baseType(type)]||zoneDef.Easy;return{pace:b.pace*z[0],hr:Math.round(b.hr*z[1]),power:Math.round(b.cp*z[2]),guide:z[3],fitnessIndex:b.evidence?.index||100}}
function weeks(){return Math.max(1,Math.floor((dte(state.setup.raceDate)-dte(state.setup.planStart))/(7*DAY))+1)}function weekStart(w){return new Date(dte(state.setup.planStart).getTime()+(w-1)*7*DAY)}
function currentWeek(){return clamp(Math.floor((today()-dte(state.setup.planStart))/(7*DAY))+1,1,weeks())}
function raceTimeRemaining(){const days=Math.max(0,Math.ceil((dte(state.setup.raceDate)-today())/DAY));return{days,weeks:Math.ceil(days/7),label:days<14?`${days} ${days===1?'day':'days'}`:`${Math.ceil(days/7)} weeks`}}
function completedRuns(asOf=iso(today())){return(state.runs||[]).filter(r=>CORE.isCurrentEvidence(r,asOf))}
function recentRuns(days=28){return completedRuns().filter(r=>today()-dte(r.date)<=days*DAY)}
function metrics(r){let dur=Number(r.durationSec),km=Number(r.distanceKm),hr=Number(r.avgHr),pw=Number(r.avgPower),kg=Number(state.setup.bodyWeight);
let validRun=dur>0&&km>0,validHr=validRun&&hr>0,validPw=validRun&&pw>0&&kg>0;
return{pace:validRun?dur/km:null,dph:validHr?km*1000/(dur/60*hr):null,wpb:validHr&&pw>0?pw/hr:null,
 efficiencyJ:validHr&&pw>0?pw*60/hr:null,effect:validPw?(km*1000/dur)/(pw/kg):null,wkg:pw>0&&kg>0?pw/kg:null}}
const metricRunTypes=['Recovery','Easy','Easy + strides','Steady aerobic','Medium-long','Long run','Specific long run','Race rehearsal','Marathon-specific','Half-marathon-specific','Threshold','Threshold intervals','Hills','Fartlek','VO₂max intervals','Race-pace intervals','Fitness assessment','Race'];
const runTypeColors={'Recovery':'#3B82F6','Shakeout':'#3B82F6','Easy':'#4CC9F0','Easy + strides':'#4CC9F0','Steady aerobic':'#4CC9F0','Medium-long':'#4CC9F0','Long run':'#4CC9F0','Specific long run':'#4CC9F0','Race rehearsal':'#3B82F6','Marathon':'#F6B94A','Marathon-specific':'#F6B94A','Half-marathon-specific':'#F6B94A','Tempo':'#F47777','Threshold':'#F47777','Threshold intervals':'#F47777','Intervals':'#F6B94A','Hills':'#F6B94A','Fartlek':'#F6B94A','VO₂max intervals':'#F6B94A','Race-pace intervals':'#F6B94A','Fitness assessment':'#DDF6FF','Race':'#07111D'};
function metricSeries(runs,valueFn,labelSuffix=''){return metricRunTypes.map(type=>({
 label:type+labelSuffix,data:runs.map(r=>r.type===type?valueFn(r):null),color:runTypeColors[type]
})).filter(s=>s.data.some(Number.isFinite))}
function typeMetricSummary(runs){return metricRunTypes.map(type=>{
 let group=runs.filter(r=>r.type===type),eff=group.map(r=>metrics(r).efficiencyJ).filter(Number.isFinite),drift=group.map(r=>r.powerDrift).filter(Number.isFinite);
 return{type,count:group.length,effAvg:avg(eff),effBest:eff.length?Math.max(...eff):null,driftAvg:avg(drift),driftBest:drift.length?Math.min(...drift):null};
}).filter(x=>x.effAvg!==null||x.driftAvg!==null)}
function weekData(w){let st=weekStart(w),en=new Date(st.getTime()+7*DAY),p=state.plan.filter(x=>x.week===w&&x.type!=='Rest'),r=completedRuns().filter(x=>dte(x.date)>=st&&dte(x.date)<en);return{planned:sum(p.map(x=>x.distance)),actual:sum(r.map(x=>x.distanceKm)),runs:r,plan:p}}

function hrvHistory(excludeRunId=null){
 return completedRuns().filter(r=>r.id!==excludeRunId&&Number.isFinite(Number(r.hrv))&&Number(r.hrv)>0)
  .map(r=>({date:r.date,value:Number(r.hrv),id:r.id})).sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));
}
function median(values){let a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;let m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function hrvModel(){
 const hist=hrvHistory(), values=hist.map(x=>x.value), n=values.length;
 if(!n)return{count:0,status:'not available',factor:1,baseline:null,rolling:null,deviation:null,ready:false,confidence:'none',detail:'No previous-night Garmin HRV values have been logged.'};

 // HRV is used from the first logged value. Early estimates are deliberately
 // low influence because the personal baseline is still provisional.
 let stage,rollingValues,baselinePool,maxPenalty;
 if(n===1){
  stage='provisional';rollingValues=values.slice(-1);baselinePool=values.slice(0,1);maxPenalty=0;
 }else if(n<=3){
  stage='early baseline';rollingValues=values.slice();baselinePool=values.slice();maxPenalty=.01;
 }else if(n<=6){
  stage='early baseline';rollingValues=values.slice(-3);baselinePool=values.slice();maxPenalty=.03;
 }else if(n<=20){
  stage='developing baseline';rollingValues=values.slice(-7);baselinePool=values.slice(-Math.min(21,n));maxPenalty=.06;
 }else{
  stage='established baseline';rollingValues=values.slice(-7);
  // Compare the recent seven values with up to 21 earlier values so the
  // mature baseline changes slowly and is not pulled down by the same dip.
  baselinePool=values.slice(Math.max(0,n-28),n-7);maxPenalty=.10;
 }
 const rolling=avg(rollingValues);
 const baseline=median(baselinePool)||median(values)||rolling;
 const deviation=baseline>0?(rolling/baseline-1):0;

 // Wide trend bands. The stage-specific cap prevents early values from
 // making large plan changes before enough personal evidence exists.
 let status='within normal range',rawFactor=1;
 if(deviation<=-.35){status='strongly suppressed';rawFactor=.90}
 else if(deviation<=-.25){status='suppressed';rawFactor=.94}
 else if(deviation<=-.15){status='below normal range';rawFactor=.98}
 else if(deviation>=.25){status='above normal range';rawFactor=1}
 const factor=Math.max(1-maxPenalty,rawFactor);
 const windowLabel=rollingValues.length===1?'latest value':`latest ${rollingValues.length}-value average`;
 const confidence=n===1?'very low':n<=6?'low':n<=20?'developing':'established';
 const capText=maxPenalty?`Maximum plan moderation at this stage is ${(maxPenalty*100).toFixed(0)}%.`:'No plan penalty is applied from a single value.';
 return{count:n,status,factor,baseline,rolling,deviation,ready:true,confidence,stage,maxPenalty,
  detail:`${stage[0].toUpperCase()+stage.slice(1)} (${n} logged value${n===1?'':'s'}): ${windowLabel} ${rolling.toFixed(0)} ms versus personal baseline ${baseline.toFixed(0)} ms (${deviation>=0?'+':''}${(deviation*100).toFixed(0)}%). ${capText}`};
}
function painAdjustment(pain=recoveryPainState()){
 const max=Number(pain?.max)||0;
 if(!pain?.count)return{adjustment:0,detail:'No recent pain ratings; no pain adjustment applied.'};
 if(max>=7)return{adjustment:-.10,detail:`Recent maximum pain ${max}/10 requires a major load reduction.`};
 if(max>=5)return{adjustment:-.06,detail:`Recent maximum pain ${max}/10 restricts demanding training.`};
 if(max>=3)return{adjustment:-.03,detail:`Recent maximum pain ${max}/10 limits progression and intensity.`};
 return{adjustment:0,detail:`Recent maximum pain ${max}/10 adds no load reduction.`};
}
function weeklyLoadEvidence(w,finalised=true,asOf=null){
 const allRuns=(state.runs||[]).filter(r=>trainingWeekForDate(r.date)===w&&r.source!=='assessment'&&(!asOf||r.date<=asOf)).sort((a,b)=>a.date.localeCompare(b.date));
 const wd=weekData(w),decisions=allRuns.map(r=>{const decision=loadDecisionSignalForRun(r,r.planId?state.plan.find(p=>p.id===r.planId):null);return{run:r,decision,contribution:loadAcceptedContribution(decision)}});
 const usable=decisions.filter(x=>Number.isFinite(x.decision.finalSignal)&&x.decision.confidenceWeight>0);
 const plannedSessions=(state.plan||[]).filter(p=>p.week===w&&!['Rest','Race Day'].includes(p.type));
 const linkedIds=new Set(allRuns.map(r=>r.planId).filter(Boolean));
 const missedSessions=plannedSessions.filter(p=>!linkedIds.has(p.id)&&(!asOf||p.date<=asOf));
 const missedKm=sum(missedSessions.map(p=>Number(p.distance)||0)),plannedKm=sum(plannedSessions.map(p=>Number(p.distance)||0)),missedRatio=plannedKm>0?missedKm/plannedKm:0;
 let completionDelta=0,completionDetail='Week-level adherence is evaluated only when the week closes. Shortened completed runs are already handled by their run-level completion signal and are not penalised twice.';
 if(finalised&&plannedKm>0){
   if(missedRatio>=.30)completionDelta=-.025;else if(missedRatio>=.15)completionDelta=-.012;else if(missedRatio>0)completionDelta=-.005;
   completionDetail=missedSessions.length?`${missedSessions.length} planned session${missedSessions.length===1?' was':'s were'} not recorded (${missedKm.toFixed(1)} km; ${Math.round(missedRatio*100)}% of planned week). This week-level penalty covers missed sessions only.`:'Every planned session has a linked run. No additional week-level completion penalty is applied; shortened runs were already assessed at run level.';
 }
 const rawRunBucket=sum(usable.map(x=>x.contribution)),runDelta=clamp(rawRunBucket,-.035,.015),learningDelta=clamp(completionDelta+runDelta,-.05,.015);
 return{week:w,planned:wd.planned,actual:wd.actual,completion:wd.planned>0?wd.actual/wd.planned:null,decisions,completionDelta,rawRunBucket,runDelta,learningDelta,missedSessions,missedKm,missedRatio,
 items:[{name:'Missed-session adherence',adjustment:completionDelta,detail:completionDetail,status:finalised?'available':'pending'},{name:'Accepted run evidence',adjustment:runDelta,detail:usable.length?`${usable.length} analysed run${usable.length===1?'':'s'} currently contribute ${signedFactorDelta(rawRunBucket)} before the weekly bound.`:'No qualifying run-level load evidence yet.',status:usable.length?'available':'insufficient'}]};
}
function adaptiveFactorDetails(w){
 if(!state.setup.adaptive||w<=1)return{factor:1,rawFactor:1,baseFactor:1,cumulativeFactor:1,weeklyLearningDelta:0,temporaryAdjustment:0,items:[{name:'Baseline',adjustment:0,detail:w<=1?'No previous training week is available.':'Adaptive planning is disabled.'}],previousWeek:w-1,plannedKm:null,completedKm:null,status:w<=1?'baseline':'disabled'};
 const previousWeek=w-1,previousEnd=new Date(weekStart(previousWeek).getTime()+7*DAY);
 if(previousEnd>today()){const prior=w>1?adaptiveFactorDetails(w-1).cumulativeFactor:1;return{factor:prior,rawFactor:prior,baseFactor:prior,cumulativeFactor:prior,weeklyLearningDelta:0,temporaryAdjustment:0,items:[{name:'Pending evidence',adjustment:0,detail:`Week ${previousWeek} is not complete. Distance & Load remains ${prior.toFixed(3)} until the weekly review.`}],previousWeek,plannedKm:null,completedKm:null,status:'pending'};}
 const review=weeklyLoadEvidence(previousWeek,true),previousCumulative=w>1?adaptiveFactorDetails(w-1).cumulativeFactor:1,weeklyLearningDelta=review.learningDelta;
 const cumulativeFactor=clamp(previousCumulative*(1+weeklyLearningDelta),state.setup.minFactor,state.setup.maxFactor);
 const hrv=hrvModel(),painAdj=painAdjustment(),temporaryAdjustment=(hrv.ready?hrv.factor-1:0)+painAdj.adjustment;
 const rawFactor=cumulativeFactor*(1+temporaryAdjustment),factor=clamp(rawFactor,state.setup.minFactor,state.setup.maxFactor);
 const items=[...review.items,{name:'Readiness overlay',adjustment:temporaryAdjustment,detail:`Temporary only: ${hrv.detail} ${painAdj.detail}`}];
 return{factor,rawFactor,baseFactor:previousCumulative,cumulativeFactor,weeklyLearningDelta,temporaryAdjustment,trainingResponse:1+weeklyLearningDelta,hrvFactor:hrv.factor,hrv,items,previousWeek,plannedKm:review.planned,completedKm:review.actual,status:'calculated',loadReview:review};
}
function adaptiveFactor(w){return adaptiveFactorDetails(w).factor}

function pathwayFactorHistory(asOfWeek=currentWeek()){
 const endWeek=Math.max(1,Math.min(weeks(),Number(asOfWeek)||1));
 const rows=[];
 for(let w=1;w<=endWeek;w++){
  const endDate=new Date(Math.min(today().getTime(),new Date(weekStart(w).getTime()+7*DAY-1).getTime()));
  const pace=trainingEvidence(iso(endDate)).adjustment;
  const load=adaptiveFactorDetails(w).cumulativeFactor;
  rows.push({week:w,date:iso(endDate),pace,load});
 }
 return rows;
}
function pathwayFactorSummary(asOfWeek=currentWeek()){
 const history=pathwayFactorHistory(asOfWeek),current=history.at(-1)||{pace:1,load:1},previous=history.at(-2)||{pace:1,load:1};
 return{
  history,
  pace:{current:current.pace,weekChange:current.pace-previous.pace,sinceStart:current.pace-1},
  load:{current:current.load,weekChange:current.load-previous.load,sinceStart:current.load-1}
 };
}
function signedFactorDelta(v){
 const n=Number(v)||0;
 return `${n>=0?'+':''}${n.toFixed(3)}`;
}
function pathwayHistorySvg(history){
 if(!history?.length)return '<p class="muted">No pathway history available.</p>';
 const W=760,H=250,pad={l:54,r:24,t:24,b:42};
 const vals=history.flatMap(x=>[x.pace,x.load]).filter(Number.isFinite);
 let min=Math.min(.94,...vals),max=Math.max(1.06,...vals);if(max-min<.04){min-=.02;max+=.02}
 const x=i=>pad.l+(history.length===1?(W-pad.l-pad.r)/2:i*(W-pad.l-pad.r)/(history.length-1));
 const y=v=>pad.t+(max-v)*(H-pad.t-pad.b)/(max-min);
 const path=key=>history.map((r,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ');
 const ticks=4,grid=Array.from({length:ticks+1},(_,i)=>{const v=min+(max-min)*i/ticks,yy=y(v);return `<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}"/><text x="${pad.l-8}" y="${yy+4}" text-anchor="end">${v.toFixed(2)}</text>`}).join('');
 const labels=history.map((r,i)=>`<text x="${x(i)}" y="${H-15}" text-anchor="middle">W${r.week}</text>`).join('');
 const dots=key=>history.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r[key])}" r="3.5"><title>Week ${r.week}: ${r[key].toFixed(3)}</title></circle>`).join('');
 return `<div class="pathwayHistoryChart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly pace and power and distance and load pathway factors"><g class="factorGrid">${grid}</g><line class="factorBaseline" x1="${pad.l}" y1="${y(1)}" x2="${W-pad.r}" y2="${y(1)}"/><g class="factorAxisLabels">${labels}</g><path class="paceFactorLine" d="${path('pace')}"/><g class="paceFactorDots">${dots('pace')}</g><path class="loadFactorLine" d="${path('load')}"/><g class="loadFactorDots">${dots('load')}</g></svg><div class="pathwayLegend"><span class="paceLegend">Pace & power</span><span class="loadLegend">Distance & load</span><span class="baselineLegend">Baseline 1.000</span></div></div>`;
}

function provisionalWeeklyAdjustment(w=currentWeek()){
 const current=Math.max(1,Math.min(weeks(),w)),review=weeklyLoadEvidence(current,false),baseFactor=adaptiveFactorDetails(current).cumulativeFactor;
 const cumulativeFactor=clamp(baseFactor*(1+review.runDelta),state.setup.minFactor,state.setup.maxFactor);
 const hrv=hrvModel(),painAdj=painAdjustment(),temporaryAdjustment=(hrv.ready?hrv.factor-1:0)+painAdj.adjustment,rawFactor=cumulativeFactor*(1+temporaryAdjustment),factor=clamp(rawFactor,state.setup.minFactor,state.setup.maxFactor);
 const items=[...review.items,{name:'Readiness overlay',adjustment:temporaryAdjustment,detail:`Temporary only and not learned: ${hrv.detail} ${painAdj.detail}`}];
 return{factor,rawFactor,baseFactor,cumulativeFactor,weeklyLearningDelta:review.runDelta,temporaryAdjustment,items,status:'provisional',week:current,loadReview:review};
}
function athleteState(w=currentWeek()){
 const current=Math.max(1,Math.min(weeks(),w)),next=Math.min(weeks(),current+1),ev=trainingEvidence(),applied=adaptiveFactorDetails(current),nextAfd=adaptiveFactorDetails(next),preview=provisionalWeeklyAdjustment(current),pain=recoveryPainState(),hrv=hrvModel(),pathways=pathwayFactorSummary(current);
 const fitnessDelta=ev.index-100,fitnessTrend=fitnessDelta>.5?'Improving':fitnessDelta<-.5?'Declining':'Stable';
 const wd=weekData(current),completion=wd.planned>0?wd.actual/wd.planned:null;
 const currentWeekEnd=new Date(weekStart(current).getTime()+7*DAY),weekComplete=currentWeekEnd<=today();
 let readiness='Normal';
 if((pain.max??0)>=5||hrv.factor<=.94)readiness='Restricted';else if((pain.max??0)>=3||hrv.factor<1)readiness='Reduced';
 let tolerance=weekComplete?'Normal':'In progress';
 if(weekComplete&&Number.isFinite(completion)){if(completion<.70)tolerance='Low';else if(completion<.85)tolerance='Reduced';else if(completion<=1.05)tolerance='Normal';else tolerance='Excess load';}
 const adjustment=applied.cumulativeFactor,isPending=nextAfd.status==='pending',direction=adjustment<.995?'Reduce':adjustment>1.005?'Increase':'Maintain',pct=Math.round(Math.abs(adjustment-1)*100),reasons=[];
 (applied.items||[]).forEach(i=>{if(Math.abs(Number(i.adjustment)||0)>.0001)reasons.push(`${i.name.toLowerCase()} ${i.adjustment>0?'+':''}${Math.round(i.adjustment*100)}%`)});
 if(!reasons.length)reasons.push(current<=1?'baseline factor for the opening week':'all finalised inputs were neutral');
 const nextStart=weekStart(next),reviewDate=iso(new Date(nextStart.getTime()-DAY));
 return{currentWeek:current,nextWeek:next,pathways,fitnessTrend,fitnessIndex:ev.index,fitnessDelta,evidenceConfidence:ev.confidence,fitnessEvidence:ev,readiness,tolerance,completion,weekComplete,adjustment,direction,pct,reasons,applied,nextAfd,preview,isPending,pain,hrv,reviewDate,nextStart:iso(nextStart)};
}
function validateWorkout(workout){
 const errors=[];
 if(!workout||typeof workout!=='object')return{valid:false,errors:['Workout is missing.']};
 const total=Number(workout.distance),warm=Number(workout.warmDistance||0),main=Number(workout.mainDistance||0),cool=Number(workout.coolDistance||0);
 if(workout.type!=='Rest'&&workout.type!=='Race Day'){
  if(![total,warm,main,cool].every(Number.isFinite))errors.push('A distance component is not numeric.');
  if([total,warm,main,cool].some(x=>x<0))errors.push('A distance component is negative.');
  if(Math.abs((warm+main+cool)-total)>.051)errors.push(`Components total ${(warm+main+cool).toFixed(1)} km but session shows ${total.toFixed(1)} km.`);
  if(total<1)errors.push('Running session is implausibly short.');
  if(!workout.targetScope)errors.push('Target scope is missing.');
  if(!workout.purpose||!workout.coach)errors.push('Coaching explanation is incomplete.');
 }
 if(baseType(workout.type)==='Intervals'){
  const reps=Number(workout.repetitions),recs=Number(workout.recoveryCount);
  if(!(reps>=2))errors.push('Interval repetition count is invalid.');
  if(recs!==reps-1)errors.push('Interval recovery count must equal repetitions minus one.');
 }
 if(baseType(workout.type)==='Fitness assessment'&&Number(workout.assessmentDistance)<=0)errors.push('Assessment distance is missing.');
 return{valid:errors.length===0,errors};
}
function validatePlan(plan=state.plan){
 const issues=[],ids=new Set();
 (plan||[]).forEach((p,i)=>{
  if(ids.has(p.id))issues.push({severity:'error',id:p.id,message:'Duplicate workout ID.'});
  ids.add(p.id);
  const check=validateWorkout(p);
  check.errors.forEach(message=>issues.push({severity:'error',id:p.id,index:i,message}));
  const cfg=state.days.find(d=>d[0]===p.day);
  if(p.type!=='Rest'&&p.type!=='Race Day'&&cfg&&!cfg[1])issues.push({severity:'error',id:p.id,message:`Workout scheduled on disabled day ${p.day}.`});
  if(p.phase==='Taper'&&p.type==='Fitness assessment')issues.push({severity:'warning',id:p.id,message:'Maximal assessment appears during taper.'});
  if(p.type!=='Rest'&&p.type!=='Race Day'&&(!p.zone||![p.zone.pace,p.zone.hr,p.zone.power].every(Number.isFinite)))issues.push({severity:'error',id:p.id,message:'Training targets are missing or invalid.'});
 });
 CORE.validatePlanInvariants(plan,state.setup).forEach(error=>issues.push({severity:'error',id:error.field,message:error.message}));
 const errors=issues.filter(x=>x.severity==='error').length,warnings=issues.length-errors;
 const score=Math.max(0,100-errors*8-warnings*2);
 return{checked:(plan||[]).length,issues,errors,warnings,score,valid:errors===0};
}
function safeWorkoutFallback(item){
 const total=Math.max(3,Number(item.distance)||3),warm=Math.min(1,Math.max(.5,total*.15)),cool=Math.min(1,Math.max(.5,total*.15)),main=Math.max(.5,total-warm-cool);
 return{...item,type:'Easy',distance:Math.round((warm+main+cool)*10)/10,warmDistance:Math.round(warm*10)/10,mainDistance:Math.round(main*10)/10,coolDistance:Math.round(cool*10)/10,
  warmup:`${warm.toFixed(1)} km very easy`,main:`${main.toFixed(1)} km conversational easy running`,cooldown:`${cool.toFixed(1)} km very easy`,distanceCheck:`${warm.toFixed(1)} + ${main.toFixed(1)} + ${cool.toFixed(1)} = ${(warm+main+cool).toFixed(1)} km`,purpose:'Preserve aerobic continuity with a safe fallback session.',coach:'The original workout failed internal validation and was replaced with an easy run. Review Plan Health for details.',fuel:'Water according to thirst.',targetScope:'Entire easy run',whyThis:'A safe aerobic session preserves consistency without relying on an invalid prescription.',whyAmount:'The distance is limited to the planned session allowance.',skipImpact:'Skipping one fallback easy run has little fitness impact; do not compensate later.'};
}
function buildPlan(){
 let old=new Map((state.plan||[]).filter(p=>dte(p.date)<today()).map(p=>[p.id,p])),out=[],total=weeks(),taper=Math.ceil(state.setup.taperDays/7);
 for(let w=1;w<=total;w++){
   let dp=detailedPhase(w),ph=phase(w),factor=adaptiveFactor(w),base=Math.min(state.setup.maxWeekly,state.setup.currentWeekly*Math.pow(1+state.setup.growth,w-1));
   if(w%4===0&&ph==='Build')base*=.9;
   if(ph==='Taper'){let left=total-w;base*=left===0?.42:left===1?.62:.78}
   base*=factor;

   let prog=clamp((w-1)/Math.max(1,total-taper-2),0,1);
   let long=state.setup.currentLongest+(state.setup.peakLong-state.setup.currentLongest)*prog;
   if(w%4===0&&ph==='Build')long*=.85;
   if(ph==='Taper'){let left=total-w;long=Math.min(long,left===0?0:left===1?18:24)}

   let weekDates=[];
   for(let offset=0;offset<7;offset++){
     let dateObj=new Date(weekStart(w).getTime()+offset*DAY),date=iso(dateObj);
     if(dte(date)>dte(state.setup.raceDate))continue;
     let dayName=dateObj.toLocaleDateString('en-US',{weekday:'long'});
     let cfg=state.days.find(x=>x[0]===dayName)||[dayName,false,'Easy'];
     weekDates.push({dateObj,date,dayName,cfg});
   }

   let isRaceWeek=weekDates.some(x=>x.date===state.setup.raceDate),assignments=weekTypeAssignments(w,weekDates);
   let training=weekDates.filter(x=>x.cfg[1]&&x.date!==state.setup.raceDate);
   let assignedTypes=training.map(x=>assignments.get(x.date)||'Easy');
   let hasLong=assignedTypes.some(x=>['Long run','Specific long run','Race rehearsal','Progression'].includes(x));
   let qualityTypes=['Intervals','Tempo','Fitness assessment','Hills','Fartlek','Threshold','Threshold intervals','VO₂max intervals','Race-pace intervals','Marathon-specific','Half-marathon-specific'];
   let quality=training.filter(x=>qualityTypes.includes(assignments.get(x.date)));
   let aerobic=training.filter(x=>!qualityTypes.includes(assignments.get(x.date))&&!['Long run','Specific long run','Race rehearsal','Progression'].includes(assignments.get(x.date)));

   // In race week the race itself is not counted as ordinary training volume.
   // Retain short taper sessions before race day instead of assigning zero km.
   let trainingBudget=isRaceWeek?Math.min(18,Math.max(8,base*.32)):base;
   let longDistance=hasLong?Math.min(long,trainingBudget*.62):0;
   let remaining=Math.max(0,trainingBudget-longDistance);
   let qualityBudget=quality.length?remaining*(isRaceWeek?.32:.48):0;
   let aerobicBudget=Math.max(0,remaining-qualityBudget);
   let qualityShare=quality.length?qualityBudget/quality.length:0;
   let aerobicShare=aerobic.length?aerobicBudget/aerobic.length:0;

   weekDates.forEach(({dateObj,date,dayName,cfg})=>{
     let type=date===state.setup.raceDate?'Race Day':(cfg[1]?(assignments.get(date)||'Easy'):'Rest');
     if(isRaceWeek&&type==='Fitness assessment')type='Easy';
     if(isRaceWeek&&['Long run','Specific long run','Race rehearsal','Progression'].includes(type))type='Easy';

     let dist=0;
     if(type==='Race Day')dist=state.setup.raceDistance;
     else if(['Long run','Specific long run','Race rehearsal','Progression'].includes(type))dist=longDistance;
     else if(qualityTypes.includes(type))dist=qualityShare;
     else if(type!=='Rest')dist=aerobicShare;

     let z=zone(type,date),id=`${date}-${type}`,detail=prescription(type,dist,w,ph,z);
     let prescribedDistance=Number.isFinite(detail.totalDistance)?detail.totalDistance:Math.round(dist*10)/10;
     let item={id,week:w,date,day:dayName,type,distance:prescribedDistance,phase:ph,detailedPhase:dp,factor,zone:z,...detail};
     let selected=old.get(id)||item;
     let check=validateWorkout(selected);
     if(!check.valid){recordDiagnostic(`Invalid generated workout ${id}`,new Error(check.errors.join(' ')));selected=safeWorkoutFallback(item)}
     out.push(selected);
   });
 }
 state.plan=out;state.schemaVersion=SCHEMA;state.lastPlanHealth=validatePlan(out);save()
}
function prescription(type,km,w,ph,z){
 const r1=v=>Math.round((Number(v)||0)*10)/10;
 const fmt=v=>r1(v).toFixed(1);
 const result=(warm,main,cool,extra={})=>{
  warm=r1(warm);main=r1(main);cool=r1(cool);
  const total=r1(warm+main+cool);
  return{totalDistance:total,warmDistance:warm,mainDistance:main,coolDistance:cool,
   distanceCheck:`${fmt(warm)} + ${fmt(main)} + ${fmt(cool)} = ${fmt(total)} km`,accounting:extra.accounting||[{label:'Warm-up',km:warm},{label:'Main set',km:main},{label:'Cooldown',km:cool}],...extra};
 };
 km=r1(Math.max(0,Number(km)||0));
 const originalType=type,bt=baseType(type);
 if(type==='Rest')return{totalDistance:0,warmup:'—',main:'Rest day',cooldown:'—',purpose:'Absorb training and restore freshness.',coach:'Walking and light mobility are fine. Avoid turning recovery into another workout.',fuel:'Normal daily hydration.',targetScope:'No running targets'};
 if(bt==='Recovery'){
  const total=Math.max(3,km),warm=r1(Math.max(.5,Math.min(1,total*.15))),cool=r1(Math.max(.5,Math.min(1,total*.15))),main=r1(total-warm-cool);
  return result(warm,main,cool,{warmup:`${fmt(warm)} km very easy`,main:originalType==='Shakeout'?`${fmt(main)} km relaxed shakeout with 3–4 short strides only if feeling fresh`:`${fmt(main)} km relaxed recovery running`,cooldown:`${fmt(cool)} km very easy`,purpose:originalType==='Shakeout'?'Maintain rhythm and freshness close to race day.':'Promote recovery while preserving low-intensity consistency.',coach:'Keep this genuinely easy. Stop when pain changes your stride or worsens as you continue.',fuel:'Water according to thirst.',targetScope:'Entire relaxed run',whyThis:'Low-intensity running supports recovery and maintains routine with minimal fatigue.',whyAmount:'The session is deliberately short relative to the surrounding training load.',skipImpact:'This is low priority; skip it rather than compromising recovery.'});
 }
 if(originalType==='Easy + strides'){const total=Math.max(4,km),warm=r1(Math.max(.8,Math.min(1.5,total*.15))),cool=r1(Math.max(.8,Math.min(1.2,total*.12))),main=r1(total-warm-cool);return result(warm,main,cool,{warmup:`${fmt(warm)} km very easy`,main:`${fmt(main)} km easy, including 6 × 20-second relaxed strides with full easy recovery`,cooldown:`${fmt(cool)} km very easy`,purpose:'Build aerobic fitness while maintaining relaxed speed and running economy.',coach:'Strides are smooth accelerations, not sprints. Stop if form or hamstring comfort deteriorates.',fuel:'Water according to thirst.',targetScope:'Easy running; strides by relaxed feel',whyThis:'Easy running develops aerobic capacity while strides preserve neuromuscular coordination.',whyAmount:'A small stride dose adds speed economy without creating a hard session.',skipImpact:'Skip the strides when sore or fatigued; keep the easy running relaxed.'})}
 if(originalType==='Medium-long'||originalType==='Steady aerobic'){const total=Math.max(7,km),warm=r1(Math.min(1.5,Math.max(1,total*.1))),cool=r1(Math.min(1.2,Math.max(.8,total*.08))),main=r1(total-warm-cool);return result(warm,main,cool,{warmup:`${fmt(warm)} km easy`,main:`${fmt(main)} km controlled aerobic running`,cooldown:`${fmt(cool)} km very easy`,purpose:originalType==='Medium-long'?'Develop midweek aerobic durability and distribute endurance load.':'Provide a moderate aerobic stimulus below threshold.',coach:'Keep this controlled. It is more purposeful than recovery running but should not become a race effort.',fuel:total>=12?'Carry fluids and consider carbohydrate for sessions beyond 75–90 minutes.':'Water according to thirst.',targetScope:'Controlled aerobic main section',whyThis:'Sustained aerobic work improves durability without the recovery cost of threshold training.',whyAmount:'The distance supports race-specific endurance while protecting the long run.',skipImpact:'Do not add missed distance to the next quality or long session.'})}
 if(originalType==='Progression'){const total=Math.max(8,km),warm=r1(Math.min(2,Math.max(1,total*.12))),cool=r1(Math.min(1.5,Math.max(1,total*.08))),main=r1(total-warm-cool),steady=r1(Math.min(5,Math.max(2,main*.25)));return result(warm,main,cool,{warmup:`${fmt(warm)} km easy`,main:`${fmt(main-steady)} km controlled aerobic, then ${fmt(steady)} km steady`,cooldown:`${fmt(cool)} km very easy`,purpose:'Develop controlled fatigue resistance without a full race-specific long run.',coach:'Progress gradually; the final steady section remains below threshold.',fuel:'Practise normal long-run hydration and carbohydrate when duration exceeds 75–90 minutes.',targetScope:'Final steady section',whyThis:'A controlled finish develops durability while keeping most of the run aerobic.',whyAmount:'Only the final portion progresses, limiting recovery cost.',skipImpact:'Convert to an easy long run when recovery or pain is questionable.'})}
 if(originalType==='Specific long run'||originalType==='Race rehearsal'){const total=Math.max(14,km),warm=r1(Math.min(2,Math.max(1,total*.08))),cool=r1(Math.min(1.5,Math.max(1,total*.05))),main=r1(total-warm-cool),specific=r1(Math.min(originalType==='Race rehearsal'?12:8,Math.max(3,main*.28)));return result(warm,main,cool,{warmup:`${fmt(warm)} km deliberately easy`,main:`${fmt(main-specific)} km controlled aerobic plus ${fmt(specific)} km at race-specific effort in controlled blocks`,cooldown:`${fmt(cool)} km very easy`,purpose:originalType==='Race rehearsal'?'Rehearse pacing, fuelling, equipment and late-run control.':'Develop race-specific durability within a predominantly aerobic long run.',coach:'This counts as a quality session. Do not combine it with two other hard sessions in the same week.',fuel:'Practise the intended race carbohydrate, fluid and equipment strategy.',targetScope:'Race-specific blocks only',whyThis:'Specific work under fatigue prepares pacing and economy for race demands.',whyAmount:'The race-specific portion is deliberately limited so the full long run remains sustainable.',skipImpact:'Replace with an easy long run when recovery is poor; never catch up later.'})}

 if(bt==='Easy'){
  const total=Math.max(3,km),warm=r1(Math.max(.5,Math.min(1,total*.15))),cool=r1(Math.max(.5,Math.min(1,total*.15))),main=r1(total-warm-cool);
  return result(warm,main,cool,{warmup:`${fmt(warm)} km very easy to settle into relaxed running`,main:`${fmt(main)} km conversational easy running`,cooldown:`${fmt(cool)} km very easy`,purpose:'Develop aerobic capacity while keeping fatigue low.',coach:'The entire run remains easy. Pace, HR and power describe the central easy section; the opening and closing sections should feel even gentler. Slow down for heat, hills, illness or poor recovery.',fuel:total>=12?'Carry fluids; use carbohydrate if running longer than 75–90 min.':'Water according to thirst.',targetScope:'Entire easy run',whyThis:'Easy running builds aerobic capacity and supports recovery from harder sessions.',whyAmount:'The distance fills the aerobic share of the week while keeping intensity low.',skipImpact:'Missing one easy run has little effect. Do not compensate by extending a hard or long session.'});
 }
 if(bt==='Long run'){
  const total=Math.max(6,km),warm=r1(Math.min(2,Math.max(1,total*.1))),cool=r1(Math.min(1.5,Math.max(1,total*.07))),main=r1(total-warm-cool);
  let mainText=`${fmt(main)} km controlled aerobic endurance`;
  if(ph==='Peak'&&total>=22)mainText=`${fmt(main-3)} km controlled aerobic endurance, then 3.0 km at controlled marathon effort`;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km deliberately easy`,main:mainText,cooldown:`${fmt(cool)} km very easy`,purpose:'Build aerobic durability, musculoskeletal resilience and race-specific fuelling skill.',coach:`The displayed ${fmt(total)} km is the complete long run. The opening, main section and final easy running are all included. Keep effort controlled; a marathon-effort finish is prescribed only where explicitly stated.`,fuel:'Practise 60–90 g carbohydrate/hour and approximately 400–800 ml fluid/hour, adjusted for conditions.',targetScope:ph==='Peak'&&total>=22?'Controlled endurance; marathon target only for final 3 km':'Controlled endurance section',whyThis:'The long run is the main endurance stimulus and develops durability, fuelling skill and fatigue resistance.',whyAmount:`${fmt(total)} km follows the planned long-run progression and current weekly-volume limit.`,skipImpact:'Missing a long run matters more than missing an easy run, but it should not be squeezed into the next few days. Resume safely and let the plan rebuild progression.'});
 }
 if(bt==='Intervals'){
  let rep=ph==='Build'||ph==='Peak'?.8:.4, rec=rep===.8?.4:.2;if(originalType==='Hills'||originalType==='Fartlek'){rep=.4;rec=.2}if(originalType==='Race-pace intervals'&&raceProfile().key==='10k'){rep=1;rec=.4}if(originalType==='VO₂max intervals'){rep=.8;rec=.4}
  let minReps=rep===.8?4:5,maxReps=rep===.8?6:8;
  let suggested=Math.round((Math.max(km,5)-3.5+rec)/(rep+rec));
  let reps=clamp(suggested,minReps,maxReps);
  if(ph==='Taper'){rep=.4;rec=.2;reps=4;}
  const warm=2.0,cool=1.5,fast=r1(reps*rep),recoveries=Math.max(0,reps-1),recoveryTotal=r1(recoveries*rec),main=r1(fast+recoveryTotal);
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy, with drills and 3–4 strides within the final 0.5 km`,main:`${reps} × ${Math.round(rep*1000)} m fast (${fmt(fast)} km) with ${recoveries} × ${Math.round(rec*1000)} m easy-jog recovery (${fmt(recoveryTotal)} km) between repetitions; main set ${fmt(main)} km total`,cooldown:`${fmt(cool)} km very easy`,purpose:rep>=.8?'Improve aerobic power and the ability to sustain strong repeatable efforts.':'Improve VO₂max, leg speed and running economy with controlled repeatable efforts.',coach:'Pace, HR and power targets apply only to the fast repetitions. Each recovery is completed between repetitions; there is no recovery after the final repetition. The total session distance is derived from the prescribed warm-up, repetitions, recoveries and cooldown.',fuel:'Arrive hydrated; carbohydrate is useful when the total session exceeds 60 minutes.',targetScope:'Fast repetitions only',repetitions:reps,recoveryCount:recoveries,fastDistance:fast,recoveryDistance:recoveryTotal,accounting:[{label:'Warm-up',km:warm},{label:'Fast running',km:fast},{label:'Recoveries',km:recoveryTotal},{label:'Cooldown',km:cool}],whyThis:'This session develops aerobic power and running economy through repeatable high-quality efforts.',whyAmount:`${reps} repetitions provide a meaningful stimulus while keeping the hard volume appropriate for the current phase.`,skipImpact:'Missing one interval session has limited effect. Do not add it to another day; resume the plan and protect the next long run.'});
 }
 if(bt==='Tempo'){
  const warm=2.0,cool=1.5;
  let blocks,blockDistance,recoveryDistance;
  if(ph==='Base'){blocks=1;blockDistance=3;recoveryDistance=0;}
  else if(ph==='Build'){blocks=2;blockDistance=2;recoveryDistance=.5;}
  else if(ph==='Peak'){blocks=2;blockDistance=3;recoveryDistance=.5;}
  else {blocks=1;blockDistance=2.5;recoveryDistance=0;}
  // Let available weekly volume scale the work, but preserve a meaningful scientific session.
  if(km>=10&&ph==='Build'){blocks=2;blockDistance=2.5;}
  const quality=r1(blocks*blockDistance),recoveries=Math.max(0,blocks-1),recoveryTotal=r1(recoveries*recoveryDistance),main=r1(quality+recoveryTotal);
  const mainText=blocks===1?`${fmt(quality)} km continuous at controlled tempo/threshold effort`:`${blocks} × ${fmt(blockDistance)} km at controlled tempo/threshold effort (${fmt(quality)} km quality) with ${recoveries} × ${fmt(recoveryDistance)} km easy jog (${fmt(recoveryTotal)} km); main set ${fmt(main)} km total`;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy, including 3–4 short strides`,main:mainText,cooldown:`${fmt(cool)} km very easy`,purpose:'Raise sustainable threshold speed while preserving controlled, repeatable execution.',coach:'Pace, HR and power targets apply to the tempo/threshold work only. Recoveries, when prescribed, are easy and are included in the main-set and total-session distance.',fuel:'Take a small carbohydrate intake beforehand when training fasted or after a long workday.',targetScope:'Tempo/threshold work only',qualityDistance:quality,recoveryCount:recoveries,recoveryDistance:recoveryTotal,accounting:[{label:'Warm-up',km:warm},{label:'Tempo work',km:quality},{label:'Recoveries',km:recoveryTotal},{label:'Cooldown',km:cool}],whyThis:'Threshold work raises the fastest pace you can sustain without rapidly accumulating fatigue.',whyAmount:`${fmt(quality)} km of quality work matches the current training phase and available weekly load.`,skipImpact:'A single missed tempo run is not critical. Continue with the next planned session rather than trying to catch up.'});
 }
 if(bt==='Fitness assessment'){
  const test=Math.max(1,r1(Number(state.setup.testDistance)||5)),warm=2.0,cool=1.5,main=test;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy, with drills and 3–4 strides within the final 0.5 km`,main:`${fmt(test)} km evenly paced maximal assessment`,cooldown:`${fmt(cool)} km very easy`,purpose:'Create a repeatable benchmark that can update future training targets.',coach:'The assessment distance is the hard test itself, not the complete outing. Pace, HR and power targets apply to the assessment only; the displayed total includes warm-up and cooldown.',fuel:'Use a normal pre-run meal and avoid starting depleted.',targetScope:'Assessment effort only',assessmentDistance:test,accounting:[{label:'Warm-up',km:warm},{label:'Assessment',km:test},{label:'Cooldown',km:cool}],whyThis:'A repeatable benchmark updates training zones and race prediction using completed evidence.',whyAmount:`The ${fmt(test)} km test is long enough to measure current fitness while remaining repeatable.`,skipImpact:'Postpone the assessment when ill, injured or poorly recovered; normal training can continue without compensating.'});
 }
 if(bt==='Marathon'){
  const warm=2.0,cool=1.5,quality=Math.max(3,r1(Math.max(km,7)-warm-cool)),main=quality;
  return result(warm,main,cool,{warmup:`${fmt(warm)} km easy`,main:`${fmt(quality)} km at controlled marathon effort`,cooldown:`${fmt(cool)} km very easy`,purpose:'Develop race-specific pace control, economy and durability.',coach:'Pace, HR and power targets apply only to the marathon-effort block. The displayed total is derived from all three sections.',fuel:'Practise the carbohydrate and fluid routine intended for race day.',targetScope:'Marathon-effort section',whyThis:'Marathon-effort running develops race-specific economy and pacing control.',whyAmount:`${fmt(quality)} km provides specific work without turning the whole session into a race effort.`,skipImpact:'Do not move this session next to another hard workout. Resume the plan and preserve the next long run.'});
 }
 return{totalDistance:km,warmup:'Pre-race mobility and easy jogging as needed (outside the official race distance)',main:`${fmt(km)} km race`,cooldown:'Walk and begin recovery nutrition after finishing (outside the official race distance)',purpose:'Execute the race plan.',coach:'The displayed distance is the official race distance. Pace, HR and power refer to the race itself; pre-race warm-up and post-race walking are additional.',fuel:'60–90 g carbohydrate/hour and 400–800 ml fluid/hour.',targetScope:'Race effort'};
}
if(state.schemaVersion!==SCHEMA){state.plan=[];buildPlan()}else if(!state.plan?.length)buildPlan();
state.runs.forEach(r=>{if(r.planId&&!state.plan.some(p=>p.id===r.planId)){delete r.planId;delete r.plannedDate;delete r.dayOffset;r.matchStatus='adHoc';r.matchMethod='schema-remap'}if(r.planId){r.matchStatus='matched';r.matchMethod=r.matchMethod||'legacy';let p=state.plan.find(x=>x.id===r.planId);if(p){r.plannedDate=p.date;r.dayOffset=Math.round((dte(r.date)-dte(p.date))/DAY)}}else if(!r.matchStatus)r.matchStatus='adHoc'});save();
reconcileExactDateMatches();
function compatibleRunType(planType,runType){
 const groups={
  'Long run':['Long run','Specific long run','Race rehearsal','Progression'],'Specific long run':['Long run','Specific long run','Race rehearsal'],'Race rehearsal':['Long run','Specific long run','Race rehearsal'],'Progression':['Long run','Easy','Steady aerobic','Medium-long'],
  'Tempo':['Tempo','Marathon','Threshold','Threshold intervals','Half-marathon-specific'],'Threshold':['Tempo','Threshold','Threshold intervals'],'Threshold intervals':['Tempo','Threshold','Threshold intervals'],'Half-marathon-specific':['Tempo','Half-marathon-specific','Race'],'Marathon-specific':['Marathon','Tempo','Marathon-specific'],
  'Intervals':['Intervals','Fitness assessment','Hills','Fartlek','VO₂max intervals','Race-pace intervals'],'Hills':['Intervals','Hills','Fartlek'],'Fartlek':['Intervals','Fartlek','Hills'],'VO₂max intervals':['Intervals','VO₂max intervals'],'Race-pace intervals':['Intervals','Race-pace intervals','Race'],
  'Fitness assessment':['Fitness assessment','Race'],'Easy':['Easy','Recovery','Easy + strides','Shakeout'],'Easy + strides':['Easy','Recovery','Easy + strides'],'Steady aerobic':['Easy','Steady aerobic','Medium-long'],'Medium-long':['Easy','Steady aerobic','Medium-long'],'Recovery':['Recovery','Easy','Shakeout'],'Shakeout':['Recovery','Easy','Shakeout'],'Marathon':['Marathon','Tempo','Marathon-specific'],'Race Day':['Race']
 };
 return (groups[planType]||[planType]).includes(runType);
}
function matchingRun(p,runs=completedRuns()){
 const linked=runs.find(r=>r.planId===p.id);if(linked)return linked;
 // Fallback for imported runs saved before automatic exact-date matching was added.
 // Only use a unique same-day candidate, so an unrelated run is never silently counted.
 const candidates=runs.filter(r=>r.date===p.date&&!r.planId&&r.matchStatus!=='unresolved');
 const compatible=candidates.filter(r=>compatibleRunType(p.type,r.type));
 const pool=compatible.length===1?compatible:(candidates.length===1?candidates:[]);
 if(pool.length!==1)return null;
 const r=pool[0],planned=Math.max(.1,Number(p.distance)||0),actual=Math.max(.1,Number(r.distanceKm)||0);
 return Math.abs(actual-planned)/planned<=.35?r:null;
}
function reconcileExactDateMatches(){
 let changed=false;
 state.runs.forEach(run=>{
  if(run.planId||run.matchStatus==='unresolved')return;
  const candidates=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&p.date===run.date&&!state.runs.some(r=>r.id!==run.id&&r.planId===p.id));
  if(!candidates.length)return;
  candidates.sort((a,b)=>{
   const ac=compatibleRunType(a.type,run.type)?0:1,bc=compatibleRunType(b.type,run.type)?0:1;
   const ad=Math.abs((Number(run.distanceKm)||0)-(Number(a.distance)||0))/Math.max(1,Number(a.distance)||1);
   const bd=Math.abs((Number(run.distanceKm)||0)-(Number(b.distance)||0))/Math.max(1,Number(b.distance)||1);
   return ac-bc||ad-bd;
  });
  const best=candidates[0],distanceGap=Math.abs((Number(run.distanceKm)||0)-(Number(best.distance)||0))/Math.max(1,Number(best.distance)||1);
  if((compatibleRunType(best.type,run.type)&&distanceGap<=.45)||distanceGap<=.20){applyRunMatch(run,best.id,'auto-exact-date');changed=true}
 });
 if(changed)save();
 return changed;
}
function matchTimingCredit(run,plan){
 if(!run||!plan)return 0;
 let offset=Math.round((dte(run.date)-dte(plan.date))/DAY),a=Math.abs(offset);
 return a===0?100:a===1?90:a===2?75:50;
}
function applyRunMatch(run,selection,method='user'){
 delete run.planId;delete run.plannedDate;delete run.dayOffset;
 run.matchMethod=method;
 if(selection&&selection!=='adhoc'&&selection!=='unresolved'){
  let p=state.plan.find(x=>x.id===selection);
  if(!p)throw Error('The selected planned workout no longer exists.');
  let occupied=state.runs.find(x=>x.id!==run.id&&x.planId===p.id);
  if(occupied)throw Error('That planned workout is already linked to another run.');
  run.planId=p.id;run.matchStatus='matched';run.plannedDate=p.date;
  run.dayOffset=Math.round((dte(run.date)-dte(p.date))/DAY);
 }else run.matchStatus=selection==='unresolved'?'unresolved':'adHoc';
 return run;
}
function suggestedPlanId(run){
 let candidates=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&!state.runs.some(r=>r.id!==run.id&&r.planId===p.id));
 candidates.sort((a,b)=>{
  let ad=Math.abs(dte(a.date)-dte(run.date)),bd=Math.abs(dte(b.date)-dte(run.date));
  let as=ad===0?0:1,bs=bd===0?0:1;
  let ac=compatibleRunType(a.type,run.type)?0:1,bc=compatibleRunType(b.type,run.type)?0:1;
  let ag=Math.abs((Number(a.distance)||0)-(Number(run.distanceKm)||0))/Math.max(1,Number(a.distance)||1);
  let bg=Math.abs((Number(b.distance)||0)-(Number(run.distanceKm)||0))/Math.max(1,Number(b.distance)||1);
  return as-bs||ac-bc||ad-bd||ag-bg;
 });
 let best=candidates[0];
 return best&&Math.abs(dte(best.date)-dte(run.date))<=14*DAY?best.id:null;
}
function planMatchOptions(run,selected){
 const actual=dte(run.date),actualTime=actual.getTime();
 const validActual=Number.isFinite(actualTime);
 let plans=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day');
 const details=p=>{
  const planned=dte(p.date),plannedTime=planned.getTime();
  const validPlanned=Number.isFinite(plannedTime);
  const offset=validActual&&validPlanned?Math.round((actualTime-plannedTime)/DAY):null;
  const linked=state.runs.find(r=>r.id!==run.id&&r.planId===p.id);
  return {p,offset,linked,distance:offset===null?Number.MAX_SAFE_INTEGER:Math.abs(offset)};
 };
 let rows=plans.map(details).sort((a,b)=>a.distance-b.distance||a.p.date.localeCompare(b.p.date));
 const option=x=>{
  let {p,offset,linked}=x;
  let timing=offset===null?'date unavailable':offset===0?'same day':offset>0?`${offset} day${offset===1?'':'s'} late`:`${Math.abs(offset)} day${offset===-1?'':'s'} early`;
  let type=compatibleRunType(p.type,run.type)?'type compatible':'different type';
  return `<option value="${esc(p.id)}" ${selected===p.id?'selected':''} ${linked?'disabled':''}>${fmtDate(p.date)} · ${esc(p.type)} · ${p.distance.toFixed(1)} km · ${timing} · ${type}${linked?' · already linked':''}</option>`;
 };
 const suggestedId=suggestedPlanId(run),suggested=rows.find(x=>x.p.id===suggestedId&&!x.linked);
 const sameWeek=rows.filter(x=>x.offset!==null&&Math.floor((actualTime-dte(state.setup.planStart).getTime())/(7*DAY))===Math.floor((dte(x.p.date).getTime()-dte(state.setup.planStart).getTime())/(7*DAY))&&x.p.id!==suggestedId);
 const nearby=rows.filter(x=>!sameWeek.includes(x)&&x.p.id!==suggestedId).slice(0,24);
 let html='';
 if(suggested)html+=`<optgroup label="Suggested match">${option(suggested)}</optgroup>`;
 if(sameWeek.length)html+=`<optgroup label="This training week">${sameWeek.map(option).join('')}</optgroup>`;
 if(nearby.length)html+=`<optgroup label="Other planned workouts">${nearby.map(option).join('')}</optgroup>`;
 html+=`<optgroup label="Other actions"><option value="adhoc" ${selected==='adhoc'?'selected':''}>Ad hoc — not linked to the plan</option><option value="unresolved" ${selected==='unresolved'?'selected':''}>Decide later — leave unresolved</option></optgroup>`;
 return html;
}
function matchSummary(run){
 if(run.planId){let p=state.plan.find(x=>x.id===run.planId);if(p){let o=Math.round((dte(run.date)-dte(p.date))/DAY),timing=o===0?'same day':o>0?`${o} day${o===1?'':'s'} late`:`${Math.abs(o)} day${o===-1?'':'s'} early`;return `${p.type} · ${timing}${compatibleRunType(p.type,run.type)?'':' · different type'}`}}
 return run.matchStatus==='unresolved'?'Needs matching review':'Ad hoc';
}
function status(p){let done=matchingRun(p);if(done)return'completed';if(p.type==='Rest')return'rest';let d=dte(p.date);if(d<today())return'missed';if(d.getTime()===today().getTime())return'today';return'upcoming'}
function confidence(){
 let raceDate=dte(state.setup.raceDate);
 let daysRemaining=Math.max(0,(raceDate-today())/DAY),weeksRemaining=daysRemaining/7;
 let taperWeeks=Math.max(1,state.setup.taperDays/7),usableBuildWeeks=Math.max(0,weeksRemaining-taperWeeks);
 const hasElapsedOrCompleted=p=>dte(p.date)<today()||Boolean(matchingRun(p));
 let due=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&hasElapsedOrCompleted(p)&&today()-dte(p.date)<=28*DAY);
 let windowStart=due.length?dte(due[0].date):new Date(today().getTime()-28*DAY);
 let recent=state.runs.filter(r=>dte(r.date)>=windowStart&&dte(r.date)<=today());
 let plannedKm=sum(due.map(p=>p.distance)),actual=sum(recent.map(r=>r.distanceKm));
 let latest=state.assessments.filter(a=>a.valid&&a.date<=iso(today())).sort((a,b)=>b.date.localeCompare(a.date))[0];
 let testTime=latest?latest.time:state.setup.testTime,testDist=latest?latest.distance:state.setup.testDistance;
 let riegel=testTime*Math.pow(state.setup.raceDistance/testDist,1.06);
 let fitness=clamp(100-(riegel/state.setup.targetTime-1)*300,0,100);
 let completedRunsToDate=state.runs.filter(r=>r.date<=iso(today())),completedLongest=completedRunsToDate.length?Math.max(...completedRunsToDate.map(r=>Number(r.distanceKm)||0)):0;
 let endurance=clamp(completedLongest/Math.max(1,state.setup.peakLong)*100,0,100);
 let recentWeekVolumes=[];for(let w=Math.max(1,currentWeek()-3);w<=currentWeek();w++)recentWeekVolumes.push(weekData(w).actual);
 let bestRecentWeek=recentWeekVolumes.length?Math.max(0,...recentWeekVolumes):0;
 let volumeProgression=clamp(bestRecentWeek/Math.max(1,state.setup.maxWeekly)*100,0,100);
 let matchedRuns=due.map(p=>({p,r:matchingRun(p,recent)})).filter(x=>x.r),matched=matchedRuns.length,opportunities=due.length;
 let executionEvidence=opportunities>0;
 let consistency=executionEvidence?clamp(matched/opportunities*100,0,100):null;
 let adherence=executionEvidence&&plannedKm>0?clamp(actual/plannedKm*100,0,100):null;
 let scheduleAdherence=matchedRuns.length?avg(matchedRuns.map(x=>matchTimingCredit(x.r,x.p))):null;
 let painValues=state.runs.filter(r=>dte(r.date)>=new Date(today().getTime()-28*DAY)&&dte(r.date)<=today()&&r.pain!==null&&r.pain!==undefined&&r.pain!=='').map(r=>Number(r.pain)).filter(Number.isFinite);
 let hrvState=hrvModel();
 let recoveryScore=hrvState.ready?clamp(100+(hrvState.deviation||0)*100,0,100):null;
 let painScore=painValues.length?clamp((10-avg(painValues))/10*100,0,100):null;
 let typeTrends=[];
 ['Easy','Recovery','Long run'].forEach(type=>{
   let vals=recent.filter(r=>r.type===type&&r.durationSec>=1800).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>metrics(r).efficiencyJ).filter(Number.isFinite);
   if(vals.length>=4){let cut=Math.floor(vals.length/2),early=avg(vals.slice(0,cut)),late=avg(vals.slice(cut));if(early>0)typeTrends.push((late/early-1)*100)}
 });
 let effTrend=avg(typeTrends),effTrendScore=Number.isFinite(effTrend)?clamp(70+effTrend*5,0,100):null;
 let driftRecent=recent.filter(r=>['Easy','Recovery','Long run'].includes(r.type)).map(r=>Number(r.powerDrift)).filter(Number.isFinite);
 let driftAvg=driftRecent.length?avg(driftRecent):null;
 let driftScore=Number.isFinite(driftAvg)?clamp(100-(Math.max(0,driftAvg-2)/8)*100,0,100):null;
 let efficiency=CORE.efficiencyScore(effTrendScore,driftScore);
 let buildModel=buildRequirementEstimate(state.setup),requiredBuildWeeks=buildModel.requiredBuildWeeks;
 let preparationTime=daysRemaining<=0?0:clamp((usableBuildWeeks/Math.max(1,requiredBuildWeeks))*100,0,100);
 let enabledTrainingDays=state.days.filter(d=>d[1]).length;
 let opportunityModel=trainingOpportunityModel(state.setup,enabledTrainingDays,phase(currentWeek()));
 let trainingOpportunity=opportunityModel.opportunityScore;
 let dueLongs=state.plan.filter(p=>p.type==='Long run'&&hasElapsedOrCompleted(p)&&today()-dte(p.date)<=84*DAY);
 let completedLongs=dueLongs.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)});
 let longRunExecution=dueLongs.length?clamp(completedLongs.length/dueLongs.length*100,0,100):null;
 let specificDue=state.plan.filter(p=>['Tempo','Intervals','Fitness assessment'].includes(p.type)&&hasElapsedOrCompleted(p)&&today()-dte(p.date)<=56*DAY);
 let specificDone=specificDue.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)}).length;
 let specificity=specificDue.length?clamp(specificDone/specificDue.length*100,0,100):null;
 const weighted=(items)=>{
  let enriched=items.map(x=>{let evidenceFraction=Number.isFinite(x.evidenceFraction)?clamp(x.evidenceFraction,0,1):(typeof x.hasEvidence==='boolean'?(x.hasEvidence?1:0):(Number.isFinite(x.score)?1:0));return{...x,hasEvidence:evidenceFraction>0,evidenceFraction,displayScore:evidenceFraction>0&&Number.isFinite(x.score)?x.score:null}});
  let totalWeight=sum(enriched.map(x=>x.weight)),availableWeight=sum(enriched.map(x=>x.weight*x.evidenceFraction));
  let measured=sum(enriched.filter(x=>x.hasEvidence&&Number.isFinite(x.displayScore)).map(x=>x.displayScore*x.weight*x.evidenceFraction));
  let coverage=totalWeight?availableWeight/totalWeight:0;
  let rawScore=availableWeight?measured/availableWeight:null;
  // No evidence is displayed as not scored. Internally, uncertainty is handled by
  // evidence coverage rather than inventing a visible neutral score.
  let score=Number.isFinite(rawScore)?50+(rawScore-50)*coverage:null;
  return{score:Number.isFinite(score)?clamp(score,0,100):null,rawScore,coverage,items:enriched};
 };
 let physiological=weighted([{name:'Fitness',score:fitness,weight:.55,hasEvidence:Number.isFinite(testTime)&&testTime>0&&testDist>0},{name:'Endurance',score:endurance,weight:.30,hasEvidence:completedRunsToDate.some(r=>(Number(r.distanceKm)||0)>0)},{name:'Efficiency',score:efficiency,weight:.15,evidenceFraction:(Number.isFinite(effTrendScore)?.60:0)+(Number.isFinite(driftScore)?.40:0)}]);
 let marathonPreparation=weighted([{name:'Long-run execution',score:longRunExecution,weight:.45,hasEvidence:dueLongs.length>0},{name:'Volume progression',score:volumeProgression,weight:.30,hasEvidence:completedRunsToDate.some(r=>(Number(r.distanceKm)||0)>0)},{name:'Specificity',score:specificity,weight:.25,hasEvidence:specificDue.length>0}]);
 let planExecution=weighted([{name:'Adherence',score:adherence,weight:.45,hasEvidence:executionEvidence},{name:'Consistency',score:consistency,weight:.35,hasEvidence:executionEvidence},{name:'Schedule adherence',score:scheduleAdherence,weight:.20,hasEvidence:matchedRuns.length>0}]);
 let recoveryHealth=weighted([{name:'Garmin HRV trend',score:recoveryScore,weight:.60,hasEvidence:hrvState.ready},{name:'Pain status',score:painScore,weight:.40,hasEvidence:painValues.length>0}]);
 let performancePillar={name:'Physiological fitness',weight:1,color:'#4CC9F0',description:'Demonstrated capability used to centre the marathon-time prediction.',...physiological};
 let pillars=[
  {name:'Marathon preparation',weight:.50,color:'#F6B94A',description:'How much marathon-specific evidence supports sustaining the predicted pace for 42.2 km.',...marathonPreparation},
  {name:'Plan execution',weight:.30,color:'#4CC9F0',description:'How reliably completed volume, sessions and timing match the programme.',...planExecution},
  {name:'HRV & health',weight:.20,color:'#4CC9F0',description:'Whether the recent Garmin HRV pattern and pain evidence support absorbing training.',...recoveryHealth}
 ];
 let scoredPillars=pillars.filter(p=>Number.isFinite(p.score));
 let overall=scoredPillars.length?clamp(sum(scoredPillars.map(p=>p.score*p.weight))/sum(scoredPillars.map(p=>p.weight)),0,100):null;
 let evidenceCoverage=sum(pillars.map(p=>p.weight*p.coverage));
 let measuredPillars=pillars.map(p=>{let available=p.items.filter(i=>i.hasEvidence),aw=sum(available.map(i=>i.weight));return{weight:p.weight*p.coverage,score:aw?sum(available.map(i=>i.displayScore*i.weight))/aw:null}}).filter(p=>Number.isFinite(p.score)&&p.weight>0);
 let measuredOverall=measuredPillars.length?sum(measuredPillars.map(p=>p.score*p.weight))/sum(measuredPillars.map(p=>p.weight)):null;
 let components=pillars.flatMap(p=>p.items.map(i=>({...i,pillar:p.name,pillarColor:p.color})));
 const expectedWholeRunPace=p=>{
   const easyPace=Number(zone('Easy',p.date)?.pace)||Number(p.zone?.pace)||360;
   const mainPace=Number(p.zone?.pace)||easyPace;
   const warm=Number(p.warmDistance)||0,cool=Number(p.coolDistance)||0,total=Math.max(.1,Number(p.distance)||0);
   const main=Math.max(0,total-warm-cool);
   return (warm+cool+main)>0?((warm+cool)*easyPace+main*mainPace)/(warm+cool+main):mainPace;
 };
 const paceScoreFor=(p,r)=>{
   const actual=Number(r?.durationSec)/Math.max(.1,Number(r?.distanceKm));
   const expected=expectedWholeRunPace(p);
   if(!Number.isFinite(actual)||!Number.isFinite(expected)||expected<=0)return null;
   const deviation=Math.abs(actual-expected)/expected;
   return clamp(100-(Math.max(0,deviation-.05)/.15)*100,0,100);
 };
 const executionCategories=[
  {key:'all',label:'All scheduled runs',types:null},
  {key:'distance',label:'Distance completed',types:null,distance:true},
  {key:'paceAll',label:'Pace adherence',types:null,pace:true},
  {key:'easy',label:'Easy / recovery',types:['Easy','Recovery']},
  {key:'quality',label:'Tempo / intervals',types:['Tempo','Intervals','Fitness assessment']},
  {key:'long',label:'Long runs',types:['Long run']}
 ].map(cat=>{
   const planned=due.filter(p=>!cat.types||cat.types.includes(p.type));
   const matchedPairs=planned.map(p=>({p,r:matchingRun(p,recent)})).filter(x=>Boolean(x.r));
   const completed=matchedPairs.map(x=>x.p);
   const plannedDistance=sum(planned.map(p=>p.distance));
   const completedDistance=sum(matchedPairs.map(x=>Number(x.r?.distanceKm)||0));
   const paceScores=cat.pace?matchedPairs.map(x=>paceScoreFor(x.p,x.r)).filter(Number.isFinite):[];
   const score=cat.pace?(paceScores.length?avg(paceScores):null):cat.distance?(plannedDistance>0?Math.max(0,completedDistance/plannedDistance*100):null):(planned.length?Math.max(0,completed.length/planned.length*100):null);
   return{...cat,plannedCount:planned.length,completedCount:completed.length,plannedDistance,completedDistance,paceCount:paceScores.length,score,barScore:Number.isFinite(score)?clamp(score,0,100):null};
 });
 return{pillars,performancePillar,components,overall,evidenceCoverage,riegel,plannedKm,actual,completedLongest,matched,opportunities,weeksRemaining,usableBuildWeeks,requiredBuildWeeks,buildRequirements:buildModel.components,preparationTime,trainingOpportunity,enabledTrainingDays,recommendedTrainingDays:opportunityModel.idealDays,minimumTrainingDays:opportunityModel.minimumEffectiveDays,opportunityModel,effTrend,driftAvg,measuredOverall,executionCategories};
}
function initialProgrammePrediction(setup=state.setup){
 const testTime=Number(setup.testTime),testDist=Math.max(.1,Number(setup.testDistance)),raceDist=Math.max(.1,Number(setup.raceDistance));
 if(!(testTime>0&&testDist>0&&raceDist>0))return null;
 const longRatio=clamp((Number(setup.currentLongest)||0)/Math.max(1,Number(setup.peakLong)||1),0,1);
 const volumeRatio=clamp((Number(setup.currentWeekly)||0)/Math.max(1,Number(setup.maxWeekly)||1),0,1);
 const initialDurability=clamp(longRatio*.55+volumeRatio*.45,0,1);
 const extrapolation=clamp(Math.log(Math.max(1,raceDist/testDist))/Math.log(42.195/5),0,1);
 const exponent=1.06+.055*(1-initialDurability)*extrapolation;
 return testTime*Math.pow(raceDist/testDist,exponent);
}
function rawPrediction(){
 // Raw model signal. This is not applied in full after every activity because
 // ordinary training runs provide much weaker fitness evidence than assessments.
 const c=confidence();
 const latest=state.assessments.filter(a=>a.valid&&a.date<=iso(today())).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const testTime=latest?latest.time:state.setup.testTime,testDist=Math.max(.1,latest?latest.distance:state.setup.testDistance);
 const prep=c.pillars.find(p=>p.name==='Marathon preparation');
 const prepEvidence=prep?.coverage||0,prepScore=Number.isFinite(prep?.score)?prep.score:0;
 const durability=clamp((prepScore/100)*prepEvidence,0,1);
 const extrapolation=clamp(Math.log(Math.max(1,state.setup.raceDistance/testDist))/Math.log(42.195/5),0,1);
 const exponent=1.06+.055*(1-durability)*extrapolation;
 return testTime*Math.pow(state.setup.raceDistance/testDist,exponent);
}
function prediction(){
 const history=(state.predictionHistory||[]).filter(x=>Number.isFinite(Number(x.seconds))&&CORE.isIsoDate(x.date)&&x.date<=iso(today())).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.updatedAt||'').localeCompare(b.updatedAt||''));
 const saved=history.at(-1);
 return saved?Number(saved.seconds):(Number(state.programStartPrediction)||initialProgrammePrediction(state.setup)||rawPrediction());
}
function predictionEvidencePolicy(source,entityId){
 const run=(state.runs||[]).find(r=>r.id===entityId);
 const assessment=(state.assessments||[]).find(a=>a.id===entityId);
 const type=assessment?'Fitness assessment':(run?.type||source||'Training update');
 const policies={
  'Recovery':{weight:.04,cap:12,benefit:3,quality:'Low',reason:'Recovery running earns a small non-negative training benefit; it does not reduce established capability.'},
  'Easy':{weight:.06,cap:20,benefit:8,quality:'Low',reason:'Easy running builds aerobic fitness and consistency. A completed easy run maintains or slightly improves the estimate; it does not make it slower.'},
  'Long run':{weight:.28,cap:120,benefit:25,quality:'Medium',reason:'Long runs build marathon durability. Appropriate completion earns a meaningful non-negative benefit.'},
  'Tempo':{weight:.18,cap:75,benefit:15,quality:'Medium',reason:'Tempo running builds sustained aerobic capability. Appropriate completion maintains or improves the estimate.'},
  'Intervals':{weight:.20,cap:75,benefit:18,quality:'Medium',reason:'Intervals build speed and aerobic power. Appropriate completion maintains or improves the estimate.'},
  'Fitness assessment':{weight:.70,cap:480,benefit:0,quality:'High',reason:'A valid assessment directly measures current performance and may move the capability estimate faster or slower.'},
  'Race':{weight:.90,cap:900,benefit:0,quality:'Very high',reason:'A race result is high-quality direct performance evidence and may move the capability estimate in either direction.'}
 };
 return{type,run,assessment,...(policies[type]||{weight:.08,cap:30,benefit:5,quality:'Low',reason:'Completed training earns a small non-negative benefit; weak evidence affects confidence before capability.'})};
}
function trainingUpdateAssessment(policy){
 const run=policy.run;
 if(!run)return{successful:true,completionRatio:1,benefit:policy.benefit||0,status:'Completed training'};
 const planned=run.planId?(state.plan||[]).find(p=>p.id===run.planId):null;
 const actualDuration=Number(run.durationSec)||0;
 const actualDistance=Number(run.distanceKm)||0;
 let plannedDuration=0;
 if(planned){
  const paceSec=Number(planned.zone?.pace)||0;
  plannedDuration=paceSec>0?(Number(planned.distance)||0)*paceSec:0;
 }
 const durationRatio=plannedDuration>0&&actualDuration>0?actualDuration/plannedDuration:null;
 const distanceRatio=planned&&Number(planned.distance)>0&&actualDistance>0?actualDistance/Number(planned.distance):null;
 const completionRatio=Number.isFinite(durationRatio)?durationRatio:(Number.isFinite(distanceRatio)?distanceRatio:1);
 const pain=run.pain===null||run.pain===undefined?null:Number(run.pain);
 const unsafe=Number.isFinite(pain)&&pain>=5;
 const substantiallyShort=completionRatio<.70;
 const successful=!unsafe&&!substantiallyShort;
 const cappedRatio=clamp(completionRatio,.50,1.15);
 const benefit=successful?(policy.benefit||0)*cappedRatio:0;
 const status=unsafe?'Maintained: pain signal prevents a fitness reward':substantiallyShort?'Maintained: partial session provides insufficient evidence for a fitness gain':completionRatio>1.15?'Improved: planned stimulus completed; extra duration is capped to avoid rewarding unnecessary load':'Improved: planned training stimulus completed';
 return{successful,completionRatio,benefit,status,plannedDuration,actualDuration,pain};
}
function scoreStatus(score,hasEvidence=true){if(!hasEvidence||!Number.isFinite(score))return'noEvidence';if(score>=80)return'good';if(score>=60)return'watch';return'action'}
function reconcilePredictionHistory(){
 const history=Array.isArray(state.predictionHistory)?state.predictionHistory:[];
 const invalid=history.some(x=>Number(x.predictionModelVersion)!==2||!Number.isFinite(Number(x.updateDelta)));
 if(!invalid)return false;
 state.predictionHistory=[];
 const events=[];
 (state.runs||[]).filter(r=>r&&r.id&&r.date<=iso(today())&&r.source!=='assessment').forEach(r=>events.push({date:r.date,source:r.source==='stryd'?'Stryd import':'Run update',entityId:r.id,order:r.updatedAt||r.date}));
 (state.assessments||[]).filter(a=>a&&a.valid&&a.id&&a.date<=iso(today())).forEach(a=>events.push({date:a.date,source:'Fitness assessment',entityId:a.id,order:a.updatedAt||a.date}));
 events.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.order).localeCompare(String(b.order)));
 events.forEach(e=>recordPredictionSnapshot(e.date,e.source,e.entityId));
 return true;
}
function recordPredictionSnapshot(date=iso(today()),source='Training update',entityId=null){
 const raw=rawPrediction();if(!Number.isFinite(raw))return;
 state.predictionHistory=Array.isArray(state.predictionHistory)?state.predictionHistory:[];
 let existing=entityId?state.predictionHistory.find(x=>x.entityId===entityId):state.predictionHistory.find(x=>x.date===date&&x.source===source&&!x.entityId);
 if(entityId&&!existing){const sameDateLegacy=state.predictionHistory.filter(x=>!x.entityId&&x.date===date);if(sameDateLegacy.length===1)existing=sameDateLegacy[0];}
 const other=state.predictionHistory.filter(x=>x!==existing&&Number.isFinite(Number(x.seconds))).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.updatedAt||'').localeCompare(b.updatedAt||''));
 const previous=other.at(-1)?.seconds??Number(state.programStartPrediction)??initialProgrammePrediction(state.setup)??raw;
 const policy=predictionEvidencePolicy(source,entityId);
 let applied=0,updateMode='maintained',trainingAssessment=null;
 if(policy.assessment||policy.type==='Race'){
  const requested=(raw-Number(previous))*policy.weight;
  applied=clamp(requested,-policy.cap,policy.cap);
  updateMode=applied<-.5?'improved':applied>.5?'slower':'maintained';
 }else{
  trainingAssessment=trainingUpdateAssessment(policy);
  const modelImprovement=Math.max(0,Number(previous)-raw)*policy.weight;
  const earnedBenefit=Math.max(0,trainingAssessment.benefit||0);
  applied=-Math.min(policy.cap,earnedBenefit+modelImprovement);
  updateMode=applied<-.5?'improved':'maintained';
 }
 const seconds=Number(previous)+applied;
 const reason=trainingAssessment?`${policy.reason} ${trainingAssessment.status}.`:policy.reason;
 const metadata={rawSeconds:raw,previousSeconds:Number(previous),updateDelta:applied,evidenceWeight:policy.weight,evidenceQuality:policy.quality,evidenceType:policy.type,evidenceReason:reason,maxChange:policy.cap,predictionModelVersion:2,updateMode,completionRatio:trainingAssessment?.completionRatio??null,earnedBenefit:trainingAssessment?.benefit??null};
 if(existing){Object.assign(existing,{date,seconds,source,entityId:entityId||existing.entityId,updatedAt:new Date().toISOString(),...metadata})}
 else state.predictionHistory.push({id:'pred-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),date,seconds,source,entityId,updatedAt:new Date().toISOString(),...metadata});
 const seen=new Set();state.predictionHistory=state.predictionHistory.sort((a,b)=>(a.updatedAt||'').localeCompare(b.updatedAt||'')).filter(x=>{let k=x.entityId?'e:'+x.entityId:`l:${x.date}|${x.source}`;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.updatedAt||'').localeCompare(b.updatedAt||'')).slice(-60);
}
const interpretations={
 'Fitness':s=>s>=85?'Recent assessment performance strongly supports the target.':s>=65?'Performance is credible but not yet comfortably above the target requirement.':'Current assessment evidence does not support the target.',
 'Endurance':s=>s>=85?'Longest-run evidence is close to the planned peak.':s>=65?'Endurance is progressing but key long runs remain.':'Long-run preparation is still limited.',
 'Efficiency':s=>s==null?'Comparable same-type runs with power and heart rate are required.':s>=75?'Efficiency and durability evidence is stable or improving.':'Efficiency or durability evidence needs improvement.',
 'Adherence':s=>s==null?'No planned distance is due yet.':s>=85?'Completed distance closely matches due distance.':'There is a meaningful completed-volume gap.',
 'Consistency':s=>s==null?'No scheduled sessions are due yet.':s>=80?'Scheduled training frequency is reliable.':'Recent session completion is inconsistent.',
 'Schedule adherence':s=>s==null?'No plan-linked completed sessions are available yet.':s>=85?'Completed sessions are usually close to their planned dates.':'Completed sessions are often shifted away from their planned dates.',
 'Volume progression':s=>s==null?'Log completed runs to establish weekly-volume evidence.':s>=80?'Recent weekly volume is close to the planned peak.':'Weekly volume progression remains incomplete.',
 'Long-run execution':s=>s==null?'No long runs are due yet.':s>=80?'Key long runs are being completed reliably.':'Several due long runs remain incomplete.',
 'Recovery':s=>s==null?'Add recovery ratings after runs to create evidence.':s>=75?'Recovery ratings support normal training.':'Recovery ratings suggest fatigue management is needed.',
 'Pain status':s=>s==null?'Add pain ratings after runs to create evidence.':s>=80?'Pain evidence is reassuring.':'Pain evidence warrants caution and possible load reduction.',
 'Preparation time':s=>s>=80?'Sufficient build time remains.':s>=60?'The timeline is workable but has little disruption margin.':s>=40?'The required progression is aggressive.':'Too little build time remains for the current peak targets.',
 'Training opportunity':s=>s>=95?'Weekly training frequency supports the race profile and planned load.':s>=75?'The selected frequency is workable but offers less load-distribution flexibility.':s>=55?'Training opportunities are materially limited for this race distance, phase and ambition.':'Too few weekly training opportunities support the current race goal and planned peak load.',
 'Specificity':s=>s==null?'No marathon-specific sessions are due yet.':s>=80?'Specific sessions are being completed reliably.':'Marathon-specific execution is incomplete.'
};
const actions={
 'Fitness':'Complete a valid evenly paced assessment before making the race goal more aggressive.',
 'Endurance':'Prioritise controlled long runs and practise race fuelling.',
 'Efficiency':'Collect comparable same-type aerobic runs and review both J/heartbeat and power-based drift.',
 'Adherence':'Close the volume gap gradually and never recover missed kilometres in one week.',
 'Consistency':'Protect the core weekly sessions before adding optional work.',
 'Schedule adherence':'Complete sessions near their planned dates; do not stack displaced workouts to catch up.',
 'Volume progression':'Build weekly volume gradually within the programmed progression limits.',
 'Long-run execution':'Complete the next suitable long run rather than adding intensity.',
 'Recovery':'Log recovery and reduce load when ratings trend downward.',
 'Pain status':'Do not progress load while pain changes stride or rises across runs.',
 'Preparation time':'Extend the timeline, reduce peak requirements or keep the target conservative.',
 'Training opportunity':'Enable another suitable training day, reduce the weekly-volume target or adopt a more conservative race goal.',
 'Specificity':'Complete the next marathon-specific session at controlled, repeatable effort.'
};
const componentDefinitions={
 'Fitness':'Score = 100 − 300 × (Riegel-predicted race time ÷ target time − 1), limited to 0–100. The latest valid assessment is used.',
 'Endurance':'Score = longest credible completed run ÷ planned peak long run × 100, limited to 0–100.',
 'Efficiency':'60% same-run-type J/heartbeat trend and 40% recent power-based cardiac-drift score. Missing sub-evidence contributes zero; comparisons require similar run types.',
 'Adherence':'Score = completed distance ÷ due planned distance over the recent 28-day window × 100, limited to 0–100.',
 'Consistency':'Score = completed due sessions ÷ all due sessions over the recent window × 100.',
 'Schedule adherence':'Average timing credit for plan-linked completed sessions: full credit on the planned day, with progressively less credit as the session moves further away.',
 'Volume progression':'Score = best completed weekly distance during the latest four training weeks ÷ planned peak weekly distance × 100, limited to 0–100.',
 'Long-run execution':'Score = completed due long runs ÷ due long runs during the last 84 days × 100.',
 'Garmin HRV trend':'Uses Garmin overnight HRV from the first logged value. Influence is staged from provisional to established as more values accumulate, with a slowly moving personal baseline.',
 'Pain status':'Score = (10 − average logged pain rating) ÷ 10 × 100, so lower pain scores higher.',
 'Garmin HRV trend':'Starts on day 1. One value is provisional with no penalty; 2–3 values can moderate by at most 1%, 4–6 by 3%, 7–20 by 6%, and 21+ by 10%.',
 'Preparation time':'Score compares usable build weeks before taper with estimated weeks needed to reach weekly-volume and peak-long-run targets safely.',
 'Training opportunity':'Base opportunity = (enabled days ÷ minimum effective days)^1.6, capped at 100%. Its consequence is scaled by race distance (5/8/12/18 points), phase (Base 0.7, Build 1.0, Peak 1.3, Taper 0.3) and peak-week ambition (0.6–1.5).',
 'Specificity':'Score = completed due tempo, interval and fitness-assessment sessions ÷ all such due sessions during the last 56 days × 100.'
};

function assessmentText(c){let weak=[...c.components].sort((a,b)=>a.score-b.score)[0];if(c.overall>=85)return'Your current fitness, endurance and training execution strongly support the goal. Preserve consistency and avoid adding unnecessary fatigue.';if(c.overall>=70)return`The goal is realistic, but readiness still depends on completing the remaining key sessions and maintaining recovery. The weakest component is ${weak.name}.`;if(c.overall>=55)return`Some indicators support the goal, but overall readiness is not yet secure. The largest current limiter is ${weak.name}. Focus there before making the target more aggressive.`;return'The available training evidence does not yet support the target with readiness. Rebuild the weakest foundations, log completed sessions consistently and use the next assessment to review the goal.'}
function kpi(l,v,s=''){return`<div class="kpi"><label>${esc(l)}</label><strong>${esc(v)}</strong><small>${esc(s)}</small></div>`}
function factorKpi(afd){
 const change=Math.round((afd.factor-1)*100),direction=change<0?'Reduce':change>0?'Increase':'Maintain';
 const when=afd.status==='calculated'?`Applies to future plan load after the weekly review`:'Current plan baseline';
 return`<div class="kpi factorKpi factorSummaryOnly"><label>Weekly plan adjustment</label><strong>${afd.factor.toFixed(2)} · ${direction}${change?` ${Math.abs(change)}%`:''}</strong><small>${when} · full calculation on Plan</small></div>`
}
function coachLabel(name,score){
 const labels={
  'Fitness':score>=85?'Current fitness supports the race target':'Fitness evidence needs strengthening',
  'Preparation time':score>=80?'The preparation timeline is sufficient':'The preparation timeline is tight',
  'Training opportunity':score>=95?'Weekly training frequency supports the goal':'Training frequency limits the preparation plan',
  'Endurance':score>=75?'Long-run endurance is progressing well':'Long-run endurance remains a limiter',
  'Adherence':score>=80?'Training volume is being completed reliably':'Completed volume is below plan',
  'Consistency':score>=80?'Weekly training frequency is consistent':'Session consistency needs attention',
  'Schedule adherence':score>=85?'Planned sessions are usually completed close to schedule':'Workout timing is frequently shifted',
  'Volume progression':score>=80?'Weekly volume is approaching the planned peak':'Weekly volume progression remains incomplete',
  'Long-run execution':score>=80?'Key long runs are being completed':'Long-run execution needs attention',
  'Recovery':score>=75?'Recovery supports normal training':'Recovery evidence suggests caution',
  'Pain status':score>=80?'Pain evidence is reassuring':'Pain requires closer monitoring',
  'Specificity':score>=80?'Specific sessions are on track':'Race-specific work is incomplete',
  'Efficiency':score>=75?'Aerobic efficiency is improving':'Aerobic efficiency needs more evidence'
 };
 return labels[name]||`${name}: ${Math.round(score)}`;
}

function uniqueComponents(components){let seen=new Set();return components.filter(x=>{if(seen.has(x.name))return false;seen.add(x.name);return true})}

function normalCdf(z){
 const sign=z<0?-1:1,x=Math.abs(z)/Math.sqrt(2),t=1/(1+.3275911*x);
 const erf=1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-x*x);
 return .5*(1+sign*erf);
}
function probabilityLabel(probability){return probability>=80?'Very likely':probability>=60?'Good chance':probability>=40?'Possible':'Unlikely'}
function predictionUncertainty(c,pred,confidenceScore,projected=false){
 const latest=state.assessments.filter(a=>a.valid&&a.date<=iso(today())).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const testDistance=Math.max(.1,Number(latest?.distance||state.setup.testDistance)||5);
 const extrapolation=clamp(Math.log(Math.max(1,state.setup.raceDistance/testDistance))/Math.log(42.195/5),0,1);
 const evidence=projected?Math.max(c.evidenceCoverage,.45):clamp(c.evidenceCoverage,0,1);
 const execution=clamp(Number.isFinite(confidenceScore)?confidenceScore/100:.50,0,1);
 // Calibrated practical uncertainty: short-race extrapolation and sparse marathon
 // evidence widen the range; a fully completed programme narrows it but never to zero.
 // Percentages are intentionally conservative and bounded to avoid unusably broad ranges.
 const pct=projected
   ?(.014+.004*extrapolation+.005*(1-evidence)+.006*(1-execution))
   :(.018+.008*extrapolation+.012*(1-evidence)+.010*(1-execution));
 const baseSigma=clamp(pred*pct,projected?150:180,projected?480:720);
 const fastSigma=baseSigma*(projected?.72:.70);
 const slowSigma=baseSigma*(projected?1.18:1.28);
 return{baseSigma,fastSigma,slowSigma};
}
function splitNormalCdf(x,mu,leftSigma,rightSigma){
 // Keep the central prediction as the median: 50% of outcomes are faster and
 // 50% slower. Different side scales create realistic asymmetry without shifting
 // the stated prediction toward the slower tail.
 if(x<=mu)return normalCdf((x-mu)/leftSigma);
 return normalCdf((x-mu)/rightSigma);
}
function splitNormalQuantile(p,mu,leftSigma,rightSigma){
 const leftMass=leftSigma/(leftSigma+rightSigma);
 let lo=mu-8*leftSigma,hi=mu+8*rightSigma;
 for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(splitNormalCdf(mid,mu,leftSigma,rightSigma)<p)lo=mid;else hi=mid}
 return(lo+hi)/2;
}
function probabilityFromScenario(c,pred,confidenceScore,projected=false){
 const uncertainty=predictionUncertainty(c,pred,confidenceScore,projected);
 const target=Number(state.setup.targetTime);
 const probability=clamp(splitNormalCdf(target,pred,uncertainty.fastSigma,uncertainty.slowSigma)*100,5,95);
 const rangeLow=Math.max(0,splitNormalQuantile(.15,pred,uncertainty.fastSigma,uncertainty.slowSigma));
 const rangeHigh=splitNormalQuantile(.85,pred,uncertainty.fastSigma,uncertainty.slowSigma);
 const provisional=CORE.predictionMode(c.evidenceCoverage).provisional;
 return{probability,label:provisional?'Provisional':probabilityLabel(probability),provisional,sigma:uncertainty.baseSigma,fastSigma:uncertainty.fastSigma,slowSigma:uncertainty.slowSigma,rangeLow,rangeHigh};
}
function planSettingsProfile(c){
 const future=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&dte(p.date)>=today()&&dte(p.date)<=dte(state.setup.raceDate));
 const enabledDays=Math.max(1,state.days.filter(d=>d[1]).length);
 const futureWeeks=Math.max(1,c.weeksRemaining);
 const weekTotals=[];for(let w=currentWeek();w<=weeks();w++){const km=sum(state.plan.filter(p=>p.week===w&&p.type!=='Rest').map(p=>Number(p.distance)||0));if(km>0)weekTotals.push(km)}
 const plannedPeak=weekTotals.length?Math.max(...weekTotals):Number(state.setup.maxWeekly)||0;
 const currentWeekly=Math.max(1,Number(state.setup.currentWeekly)||1);
 const peakLong=Math.max(0,Number(state.setup.peakLong)||0);
 const volumeScore=clamp((plannedPeak-30)/35*100,0,100); // <30 limited; ~65 km strongly supportive in recreational cohorts
 const longScore=clamp((peakLong-22)/10*100,0,100);      // <25 km weak; 30–32+ km strongly supportive
 const frequencyScore=clamp((enabledDays-3)/2*100,0,100); // 3 days workable, 5+ distributes load better
 const growth=clamp(Number(state.setup.growth)||.08,.01,.25);
 const progressionScore=growth<=.10?100:growth<=.13?75:growth<=.16?45:20;
 const taperDays=Math.max(0,Number(state.setup.taperDays)||0);
 const taperScore=taperDays>=10&&taperDays<=21?100:taperDays>=7&&taperDays<=28?70:35;
 const totalKm=sum(future.map(p=>Number(p.distance)||0));
 const qualityKm=sum(future.filter(p=>['Tempo','Intervals','Fitness assessment','Threshold','Threshold intervals','Marathon-specific','Half-marathon-specific','Hills','Fartlek','VO₂max intervals','Race-pace intervals','Specific long run','Race rehearsal'].includes(p.type)).map(p=>Number(p.mainDistance)||Number(p.distance)||0));
 const easyLongKm=sum(future.filter(p=>['Easy','Recovery','Easy + strides','Shakeout','Steady aerobic','Medium-long','Progression','Long run'].includes(p.type)).map(p=>Number(p.distance)||0));
 const qualityShare=totalKm?qualityKm/totalKm:0;
 const easyShare=totalKm?easyLongKm/totalKm:0;
 const intensityScore=qualityShare>=.10&&qualityShare<=.28&&easyShare>=.65?100:qualityShare<=.35&&easyShare>=.55?75:45;
 const reachRatio=plannedPeak/currentWeekly;
 const availableBuild=Math.max(1,c.usableBuildWeeks);
 const requiredAtGrowth=Math.log(Math.max(1,reachRatio))/Math.log(1+growth);
 const reachabilityScore=clamp((availableBuild/Math.max(1,requiredAtGrowth))*100,0,100);
 const score=.25*volumeScore+.25*longScore+.12*frequencyScore+.12*progressionScore+.12*taperScore+.09*intensityScore+.05*reachabilityScore;
 return{score:clamp(score,0,100),plannedPeak,peakLong,enabledDays,growth,taperDays,qualityShare,easyShare,volumeScore,longScore,frequencyScore,progressionScore,taperScore,intensityScore,reachabilityScore,futureWeeks,totalKm};
}
function projectedPreparationModel(c){
 const profile=planSettingsProfile(c);
 const weeks=Math.max(0,c.usableBuildWeeks),timePotential=1-Math.exp(-.16*weeks);
 const healthPillar=c.pillars.find(p=>p.name==='HRV & health');
 const executionPillar=c.pillars.find(p=>p.name==='Plan execution');
 const health=healthPillar&&healthPillar.coverage>0?healthPillar.score:75;
 const observedExecution=executionPillar&&Number.isFinite(executionPillar.score)?executionPillar.score:85;
 const completionAssumption=clamp((observedExecution/100)*.55+.40,.75,.93);
 const tolerance=clamp((health/100)*(.82+Math.min(1,c.trainingOpportunity/100)*.18),.45,1);
 const projectedPillars=c.pillars.map(p=>{
  let score=Number.isFinite(p.score)?p.score:50;
  if(p.name==='Marathon preparation')score=clamp(score+(profile.score-score)*timePotential*tolerance*completionAssumption,0,100);
  if(p.name==='Plan execution')score=completionAssumption*100;
  if(p.name==='HRV & health')score=health;
  return{...p,currentScore:p.score,projectedScore:score};
 });
 const overall=clamp(sum(projectedPillars.map(p=>p.projectedScore*p.weight))/sum(projectedPillars.map(p=>p.weight)),0,100);
 return{pillars:projectedPillars,overall,timePotential,tolerance,health,profile,completionAssumption};
}
function fitnessProjectionModel(c,projectedPreparation,planHealthScore){
 const profile=projectedPreparation.profile,weeks=Math.max(0,c.usableBuildWeeks),timePotential=1-Math.exp(-.14*weeks);
 const completion=clamp(Number(projectedPreparation.completionAssumption)||.85,.75,.93),health=clamp(projectedPreparation.health/100,.45,1),opportunity=clamp(c.trainingOpportunity/100,.45,1),planQuality=clamp((Number(planHealthScore)||0)/100,.25,1);
 const currentFitness=trainingEvidence().adjustment,currentWeekly=Math.max(1,Number(state.setup.currentWeekly)||1),plannedPeak=Math.max(currentWeekly,profile.plannedPeak);
 const volumeRise=clamp(plannedPeak/currentWeekly-1,0,1.5),volumePotential=2.25*(1-Math.exp(-1.25*volumeRise))*timePotential;
 const qualityFit=clamp(1-Math.abs(profile.qualityShare-.20)/.20,0,1),qualityPotential=1.35*qualityFit*timePotential;
 const frequencyPotential=.75*clamp((profile.enabledDays-2)/3,0,1)*timePotential;
 const durationPotential=1.10*timePotential;
 const specificityPotential=.85*clamp((profile.longScore+profile.intensityScore)/200,0,1)*timePotential;
 const common=planQuality*health*opportunity*completion;
 const diminishing=clamp(1-(currentFitness-1)*4,.55,1.10);
 const contributions=[
  {name:'Weekly-volume progression',potential:volumePotential},
  {name:'Quality-session stimulus',potential:qualityPotential},
  {name:'Training frequency',potential:frequencyPotential},
  {name:'Time available to adapt',potential:durationPotential},
  {name:'Race-specific stimulus',potential:specificityPotential}
 ].map(x=>({...x,realised:x.potential*common*diminishing}));
 const rawPercent=sum(contributions.map(x=>x.realised));
 const expectedGain=clamp(rawPercent/100,0,.08);
 return{expectedGain,projectedFitness:clamp(currentFitness*(1+expectedGain),.90,1.15),contributions,common,diminishing,timePotential,currentFitness,rawPercent};
}
function taperProjectionModel(profile,completion){
 const total=weeks(),taperWeeks=Math.max(1,Math.ceil((Number(state.setup.taperDays)||0)/7)),start=Math.max(1,total-taperWeeks+1);
 const weekly=[];for(let w=1;w<=total;w++)weekly.push({week:w,km:sum(state.plan.filter(p=>p.week===w&&p.type!=='Rest'&&p.type!=='Race Day').map(p=>Number(p.distance)||0)),quality:state.plan.filter(p=>p.week===w&&['Tempo','Intervals','Threshold','Threshold intervals','Marathon-specific','Half-marathon-specific','Hills','Fartlek','VO₂max intervals','Race-pace intervals','Specific long run','Race rehearsal'].includes(p.type)).length});
 const pre=weekly.filter(x=>x.week<start&&x.km>0).slice(-4),taper=weekly.filter(x=>x.week>=start&&x.km>0);
 const baseline=pre.length?sum(pre.map(x=>x.km))/pre.length:Math.max(1,Number(state.setup.currentWeekly)||1);
 const ratios=taper.map(x=>x.km/Math.max(1,baseline));
 const avgRatio=ratios.length?sum(ratios)/ratios.length:1,averageReduction=clamp(1-avgRatio,0,1);
 const durationScore=profile.taperDays>=10&&profile.taperDays<=21?100:profile.taperDays>=7&&profile.taperDays<=28?70:35;
 const reductionScore=clamp(100-Math.abs(averageReduction-.48)*220,0,100);
 const progressive=ratios.length<2?70:sum(ratios.slice(1).map((r,i)=>r<=ratios[i]+.08?1:0))/Math.max(1,ratios.length-1)*100;
 const intensityScore=taper.length?clamp(sum(taper.map(x=>x.quality))/Math.max(1,taper.length)*85,25,100):35;
 const score=.30*durationScore+.35*reductionScore+.20*progressive+.15*intensityScore;
 const preLoad=clamp(baseline/Math.max(20,Number(state.setup.currentWeekly)||20),.55,1.35);
 const gain=clamp(.022*(score/100)*clamp(Number(completion)||.85,.75,.93)*preLoad,0,.025);
 return{gain,score,durationScore,reductionScore,progressiveScore:progressive,intensityScore,averageReduction,baseline,taperWeeks,ratios};
}
function planHealthAssessment(c=confidence()){
 const profile=planSettingsProfile(c),validation=validatePlan(state.plan);
 const components=[
  {name:'Weekly-volume design',score:profile.volumeScore,weight:.18,detail:`Peak ${profile.plannedPeak.toFixed(1)} km/week compared with the configured starting load and race profile.`},
  {name:'Long-run progression',score:profile.longScore,weight:.18,detail:`Peak long run ${profile.peakLong.toFixed(1)} km compared with the target-distance requirement.`},
  {name:'Progression safety',score:profile.progressionScore,weight:.16,detail:`Configured maximum weekly growth ${(profile.growth*100).toFixed(1)}%.`},
  {name:'Intensity distribution',score:profile.intensityScore,weight:.14,detail:`${Math.round(profile.qualityShare*100)}% quality and ${Math.round(profile.easyShare*100)}% easy/long-run distance.`},
  {name:'Taper structure',score:profile.taperScore,weight:.14,detail:`${profile.taperDays} taper days with generated volume reduction.`},
  {name:'Training frequency',score:profile.frequencyScore,weight:.10,detail:`${profile.enabledDays} enabled running days per week.`},
  {name:'Target reachability',score:profile.reachabilityScore,weight:.10,detail:'Available build time compared with the progression needed to reach the planned peak safely.'}
 ];
 let score=sum(components.map(x=>x.score*x.weight));
 score=clamp(score-validation.errors*8-validation.warnings*2,0,100);
 const recommendations=[];
 if(profile.volumeScore<70)recommendations.push(`Align peak weekly distance more closely with the ${raceProfile().label} requirement while respecting your current ${Number(state.setup.currentWeekly).toFixed(0)} km/week baseline.`);
 if(profile.longScore<70)recommendations.push(`Increase the peak long run gradually toward a race-appropriate level, provided pain and recovery remain acceptable.`);
 if(profile.progressionScore<75)recommendations.push(`Reduce maximum weekly growth from ${(profile.growth*100).toFixed(0)}% to approximately 5–10% and use recovery weeks.`);
 if(profile.intensityScore<75)recommendations.push('Keep most distance easy and limit demanding quality work to a sustainable share of total volume.');
 if(profile.taperScore<75)recommendations.push('Use a progressive 10–21 day taper with reduced volume while retaining small doses of intensity.');
 if(profile.frequencyScore<60)recommendations.push('Distribute the planned load across an additional running day if your schedule and injury history allow.');
 if(profile.reachabilityScore<75)recommendations.push('Extend the preparation period or reduce peak targets so the plan does not require rushed progression.');
 if(validation.errors)recommendations.unshift(`Resolve ${validation.errors} structural validation error${validation.errors===1?'':'s'} before following the plan.`);
 if(!recommendations.length)recommendations.push('No material structural change is recommended. Continue to let recovery and execution govern weekly adaptation.');
 const label=score>=90?'Excellent':score>=80?'Strong':score>=70?'Good':score>=60?'Needs refinement':'High risk';
 return{score,label,components,recommendations,validation,profile};
}
function programmeProjection(c,currentPred,projectedPreparation){
 const latest=state.assessments.filter(a=>a.valid&&a.date<=iso(today())).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const testTime=latest?latest.time:state.setup.testTime,testDist=Math.max(.1,latest?latest.distance:state.setup.testDistance);
 const profile=projectedPreparation.profile,healthAssessment=planHealthAssessment(c),planHealthScore=healthAssessment.score;
 const weeksRemaining=Math.max(0,c.usableBuildWeeks),saturation=1-Math.exp(-.12*weeksRemaining);
 const health=clamp(projectedPreparation.health/100,.45,1),planQuality=clamp(planHealthScore/100,.25,1);
 const extrapolation=clamp(Math.log(Math.max(1,state.setup.raceDistance/testDist))/Math.log(42.195/5),0,1);
 const projectedDurability=clamp(.35+.65*planQuality*saturation*health*projectedPreparation.completionAssumption,0,1);
 const projectedExponent=1.06+.055*(1-projectedDurability)*extrapolation;
 const durabilityTime=testTime*Math.pow(state.setup.raceDistance/testDist,projectedExponent);
 const fitness=fitnessProjectionModel(c,projectedPreparation,planHealthScore);
 const taper=taperProjectionModel(profile,projectedPreparation.completionAssumption);
 const predictedTime=durabilityTime/Math.max(.90,fitness.projectedFitness)*(1-taper.gain);
 const improvementSec=Math.max(0,currentPred-predictedTime);
 return{predictedTime,improvementSec,improvementPct:currentPred>0?improvementSec/currentPred:0,projectedExponent,fitnessGainPct:fitness.expectedGain,taperGain:taper.gain,planQuality:planHealthScore,planHealthScore,profile,projectedFitnessIndex:fitness.projectedFitness*100,projectedDurabilityIndex:Math.round(projectedDurability*100),completionAssumption:projectedPreparation.completionAssumption,fitnessProjection:fitness,taperProjection:taper};
}
function coachEngine(){
 let c=confidence(),pred=prediction(),cw=currentWeek(),wd=weekData(cw);
 let projectedPreparation=projectedPreparationModel(c);
 let projection=programmeProjection(c,pred,projectedPreparation);
 let currentSupport=Number.isFinite(c.overall)?c.overall:50;
 let projectedSupport=projectedPreparation.overall;
 let currentModel=probabilityFromScenario(c,pred,currentSupport,false);
 let projectedModel=probabilityFromScenario(c,projection.predictedTime,projectedSupport,true);
 let scored=uniqueComponents(c.components.filter(x=>x.hasEvidence).map(x=>({...x,score:x.displayScore}))).sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name));
 let strongest=[...scored].sort((a,b)=>b.score-a.score)[0],weakest=scored[0];
 let limiterCard=!weakest?{label:'Current limiter',name:'More evidence needed',text:'Log completed training to identify meaningful constraints.',severity:'neutral'}:weakest.score<70?{label:'Biggest limiter',name:weakest.name,text:interpretations[weakest.name](weakest.score),severity:'warn'}:weakest.score<85?{label:'Primary watch item',name:weakest.name,text:`${interpretations[weakest.name](weakest.score)} This is the smallest current margin.`,severity:'watch'}:{label:'Current limiter',name:'No significant limiter identified',text:`${weakest.name} is the lowest measured area, but it remains strong.`,severity:'good'};
 let coachConfidencePct=Math.round(clamp(c.evidenceCoverage*100,0,100));
 let status=currentModel.probability>=80?'Target strongly supported today':currentModel.probability>=60?'Target currently supported':currentModel.probability>=40?'Target remains possible':'Target not yet supported today';
 let completedRuns=state.runs.filter(r=>dte(r.date)<=today()&&Number(r.distanceKm)>0);
 let completedLongs=completedRuns.filter(r=>['Long run','Race'].includes(r.type)).length;
 let completedSpecific=completedRuns.filter(r=>['Tempo','Intervals','Marathon','Fitness assessment'].includes(r.type)).length;
 let matched=completedRuns.filter(r=>r.planId).length;
 let completedWeekVolumes=[];for(let w=1;w<=currentWeek();w++)completedWeekVolumes.push(weekData(w).actual);
 let bestCompletedWeek=completedWeekVolumes.length?Math.max(0,...completedWeekVolumes):0;
 let dueWorkouts=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&dte(p.date)<=today()).length;
 let progress=[
  {label:'Longest verified run',value:c.completedLongest,target:Number(state.setup.peakLong)||1,unit:'km'},
  {label:'Best completed week',value:bestCompletedWeek,target:Number(state.setup.maxWeekly)||1,unit:'km'},
  {label:'Long-run evidence',value:completedLongs,target:Math.max(3,Math.ceil(weeks()*.22)),unit:'runs'},
  {label:'Race-specific sessions',value:completedSpecific,target:Math.max(4,Math.ceil(weeks()*.30)),unit:'sessions'},
  {label:'Plan-linked workouts',value:matched,target:Math.max(1,dueWorkouts),unit:'workouts'}
 ];
 let next=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&dte(p.date)>=today()&&!matchingRun(p)).sort((a,b)=>a.date.localeCompare(b.date))[0];
 return{c,pred,cw,wd,projectedPreparation,projection,currentSupport,projectedSupport,currentModel,projectedModel,scored,strongest,weakest,limiterCard,coachConfidencePct,status,progress,next};
}

function evidenceConfidence(fraction,count=0){
 const f=clamp(Number(fraction)||0,0,1);
 if(f>=.8&&count!==1)return{label:'High',rank:3};
 if(f>=.45||count>=3)return{label:'Medium',rank:2};
 return{label:'Low',rank:1};
}
function impactForComponent(name){
 return ({'Long-run execution':3,'Volume progression':3,'Endurance':3,'Adherence':3,'Fitness':3,'Specificity':2,'Consistency':2,'Schedule adherence':2,'Garmin HRV trend':2,'Pain status':3,'Efficiency':2,'Training opportunity':2,'Preparation time':3}[name]||1);
}
function impactLabel(rank){return rank>=3?'High':rank===2?'Medium':'Low'}
function componentEvidence(c,item){
 const name=item.name,score=Number(item.displayScore),window=name==='Long-run execution'?'Last 84 days':name==='Specificity'?'Last 56 days':name==='Volume progression'?'Latest 4 training weeks':name==='Fitness'?'Latest valid assessment or configured test':'Recent 28-day training window';
 let facts=[];
 if(name==='Fitness'){
  const latest=state.assessments.filter(a=>a.valid&&a.date<=iso(today())).sort((a,b)=>b.date.localeCompare(a.date))[0];
  facts.push(latest?`Latest valid assessment: ${latest.distance.toFixed(1)} km in ${fmtTime(latest.time)} on ${fmtDate(latest.date)}`:`Configured benchmark: ${Number(state.setup.testDistance).toFixed(1)} km in ${fmtTime(state.setup.testTime)}`);
  facts.push(`Assessment-only Riegel estimate: ${fmtTime(c.riegel)} versus target ${fmtTime(state.setup.targetTime)}`);
 }else if(name==='Endurance')facts.push(`Longest verified completed run: ${c.completedLongest.toFixed(1)} km`,`Planned peak long run: ${Number(state.setup.peakLong).toFixed(1)} km`);
 else if(name==='Adherence')facts.push(`Completed distance: ${c.actual.toFixed(1)} km`,`Due planned distance: ${c.plannedKm.toFixed(1)} km`);
 else if(name==='Consistency')facts.push(`Completed due sessions: ${c.matched}`,`Due sessions: ${c.opportunities}`);
 else if(name==='Volume progression'){
  let vols=[];for(let w=Math.max(1,currentWeek()-3);w<=currentWeek();w++)vols.push(weekData(w).actual);
  facts.push(`Best completed week in window: ${Math.max(0,...vols).toFixed(1)} km`,`Configured peak weekly distance: ${Number(state.setup.maxWeekly).toFixed(1)} km`);
 }else if(name==='Long-run execution'){
  const due=state.plan.filter(p=>p.type==='Long run'&&(dte(p.date)<today()||matchingRun(p))&&today()-dte(p.date)<=84*DAY);
  const done=due.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)});
  facts.push(`Completed due long runs: ${done.length}`,`Due long runs: ${due.length}`);
 }else if(name==='Specificity'){
  const due=state.plan.filter(p=>['Tempo','Intervals','Fitness assessment'].includes(p.type)&&(dte(p.date)<today()||matchingRun(p))&&today()-dte(p.date)<=56*DAY);
  const done=due.filter(p=>{let r=matchingRun(p);return r&&compatibleRunType(p.type,r.type)});
  facts.push(`Completed due specific sessions: ${done.length}`,`Due specific sessions: ${due.length}`);
 }else if(name==='Schedule adherence')facts.push(`${c.matched} plan-linked completed session${c.matched===1?'':'s'} available for timing comparison`);
 else if(name==='Efficiency'){
  if(Number.isFinite(c.effTrend))facts.push(`Comparable aerobic efficiency trend: ${c.effTrend>=0?'+':''}${c.effTrend.toFixed(1)}%`);
  if(Number.isFinite(c.driftAvg))facts.push(`Recent average power-based cardiac drift: ${c.driftAvg.toFixed(1)}%`);
 }else if(name==='Garmin HRV trend'){
  const h=hrvModel();facts.push(`${h.count} Garmin HRV value${h.count===1?'':'s'} logged`);if(h.rolling!=null)facts.push(`Current HRV trend value: ${h.rolling.toFixed(0)} ms`);if(h.baseline!=null)facts.push(`Personal baseline: ${h.baseline.toFixed(1)} ms`);facts.push(`Applied HRV factor: ${h.factor.toFixed(2)}`);
 }else if(name==='Pain status'){
  const p=recoveryPainState();facts.push(`${p.count} recent pain rating${p.count===1?'':'s'}`);if(p.average!=null)facts.push(`Average pain: ${p.average.toFixed(1)} / 10`,`Highest recent pain: ${p.max.toFixed(0)} / 10`);
 }
 return{facts,window};
}
function executionScoreSummary(days=42){
 const cutoff=new Date(today().getTime()-days*DAY);
 const rows=(state.runs||[]).filter(r=>dte(r.date)>=cutoff&&dte(r.date)<=today()).map(r=>{
  const plan=r.planId?state.plan.find(p=>p.id===r.planId):null,details=workoutScoreDetails(r,plan),score=details?.score;
  return score==null?null:{run:r,plan,details,score,date:r.date,type:plan?.type||r.type,pain:Number(r.pain),drift:Number(r.powerDrift)};
 }).filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date));
 const recent=rows.slice(0,8),scores=recent.map(x=>x.score),average=avg(scores);
 const key=recent.filter(x=>x.plan&&['Tempo','Intervals','Threshold','Threshold intervals','VO₂max intervals','Race-pace intervals','Marathon-specific','Half-marathon-specific','Long run','Specific long run','Race rehearsal','Fitness assessment'].includes(x.plan.type));
 const keyAverage=avg(key.map(x=>x.score)),strong=recent.filter(x=>x.score>=90),limited=recent.filter(x=>x.score<75);
 const trend=recent.length>=4?avg(recent.slice(0,Math.ceil(recent.length/2)).map(x=>x.score))-avg(recent.slice(Math.ceil(recent.length/2)).map(x=>x.score)):null;
 const objectiveMisses={};recent.forEach(x=>x.details.components.filter(c=>c.score<75).forEach(c=>objectiveMisses[c.key]=(objectiveMisses[c.key]||0)+1));
 const recurringWeakness=Object.entries(objectiveMisses).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
 return{rows,recent,average,keyAverage,strong,limited,trend,count:recent.length,recurringWeakness};
}
function raceSpecificPriority(){
 const p=raceProfile(),dp=detailedPhase(currentWeek()),remaining=raceTimeRemaining(),weeksLeft=remaining.weeks;
 const map={
  '5k':{Foundation:'easy consistency, hills and relaxed strides',Aerobic:'threshold development and aerobic support',Development:'VO₂max and repeatable speed',Specific:'5 km-pace execution and economy',Peak:'sharpness without excess fatigue',Taper:'freshness and short race-pace reminders'},
  '10k':{Foundation:'aerobic consistency and relaxed speed',Aerobic:'threshold development',Development:'threshold durability with selective VO₂max work',Specific:'10 km-pace control',Peak:'race-specific sharpness',Taper:'freshness and pace confidence'},
  half:{Foundation:'aerobic consistency',Aerobic:'threshold endurance and medium-long running',Development:'sustained threshold durability',Specific:'half-marathon-effort control under fatigue',Peak:'specific endurance with controlled recovery cost',Taper:'freshness while retaining race rhythm'},
  marathon:{Foundation:'durable easy running and safe consistency',Aerobic:'aerobic volume and medium-long endurance',Endurance:'weekly-volume tolerance and long-run durability',Specific:'marathon-effort economy, fuelling and fatigue resistance',Peak:'race rehearsal and controlled peak endurance',Taper:'fatigue reduction while preserving marathon rhythm'},
  ultra:{Foundation:'time-on-feet tolerance',Aerobic:'aerobic durability and terrain strength',Endurance:'long-run resilience and fuelling tolerance',Specific:'terrain, run-walk and race-execution rehearsal',Peak:'final durability rehearsal without overload',Taper:'freshness and logistical readiness'}
 };
 const key=profileMatrixKey(p);return{priority:(map[key]||map.marathon)[dp]||'consistent race-specific preparation',phase:dp,weeksLeft,remainingLabel:remaining.label,profile:p};
}
function evidenceBasedCoach(engine){
 const c=engine.c,ast=athleteState(engine.cw),execution=executionScoreSummary(),components=uniqueComponents(c.components.filter(i=>i.hasEvidence&&Number.isFinite(i.displayScore))),race=raceSpecificPriority();
 let findings=components.map(item=>{const evidence=componentEvidence(c,item),confidence=evidenceConfidence(item.evidenceFraction??1,evidence.facts.length),impact=impactForComponent(item.name),score=Number(item.displayScore);return{...item,score,confidence,impact,evidence,status:score>=80?'strength':score<70?'opportunity':'watch',priority:(100-score)*impact*confidence.rank}});
 const pain=findings.find(x=>x.name==='Pain status'),hrv=findings.find(x=>x.name==='Garmin HRV trend'),recoveryConstraint=(pain&&pain.score<60)||(hrv&&hrv.score<60);
 let strengths=findings.filter(x=>x.status==='strength').sort((a,b)=>b.score-a.score||b.confidence.rank-a.confidence.rank).slice(0,3),opportunities=findings.filter(x=>x.status==='opportunity').sort((a,b)=>b.priority-a.priority).slice(0,3);if(!opportunities.length)opportunities=findings.filter(x=>x.status==='watch').sort((a,b)=>b.priority-a.priority).slice(0,2);
 const targetGap=engine.pred-state.setup.targetTime,targetPosition=targetGap<=0?`${fmtTime(Math.abs(targetGap))} inside target`:`${fmtTime(targetGap)} outside target`,planDecision=`factor ${ast.adjustment.toFixed(3)} (${ast.direction}${ast.pct?` ${ast.pct}%`:''})`;
 const executionSentence=Number.isFinite(execution.average)?`Recent execution is ${Math.round(execution.average)}/100 (${scoreBand(Math.round(execution.average)).toLowerCase()})${Number.isFinite(execution.keyAverage)?`; key sessions average ${Math.round(execution.keyAverage)}/100`:''}.`:'There is not yet enough completed-run detail to judge workout execution.';
 const probabilitySentence=engine.currentModel.provisional?'Target probability is not scored yet because completed-training evidence is sparse.':`Estimated target probability is ${Math.round(engine.currentModel.probability)}%.`;
 let conclusion=`You are in the ${race.phase.toLowerCase()} phase with ${race.remainingLabel} remaining before ${state.setup.raceName}. The present priority is ${race.priority}. Current race estimate is ${fmtEstimate(engine.pred,engine.currentModel.provisional)} (${targetPosition}). ${probabilitySentence} ${executionSentence} This week uses ${planDecision}.`;
 if(recoveryConstraint)conclusion+=` Recovery or pain currently takes priority over progression.`;else if(execution.limited.length)conclusion+=` Improve execution consistency before adding training load or faster targets.`;else if(engine.currentModel.probability<50)conclusion+=` The goal is not yet well supported, so the next block should build the weakest race-relevant evidence rather than force the target pace.`;else conclusion+=` Continue building the phase-specific stimulus without exceeding the planned load.`;
 const projected=engine.projectedModel.provisional?`Following the current programme produces a provisional scenario near ${fmtEstimate(engine.projection.predictedTime,true)}; probability remains unscored until completed-training evidence improves.`:`Following the current programme with realistic expected execution projects ${fmtTime(engine.projection.predictedTime)} and ${Math.round(engine.projectedModel.probability)}% estimated target probability; this remains conditional on healthy, consistent execution.`;
 let actionsList=[];
 if(recoveryConstraint){if(pain&&pain.score<60)actionsList.push({title:'Protect the injury first',text:actions['Pain status'],source:'Recent pain and athlete state'});else actionsList.push({title:'Let recovery govern intensity',text:'Keep the next demanding session easy or postpone it until the recorded recovery signal returns toward baseline.',source:'Garmin HRV trend'});}
 if(execution.limited.length){const x=execution.limited[0],weak=x.details.components.filter(c=>c.score<80).sort((a,b)=>a.score-b.score)[0];actionsList.push({title:`Improve ${weak?.name?.toLowerCase()||'session execution'}`,text:`The ${fmtDate(x.date)} ${x.type} scored ${x.score}/100. ${weak?weak.detail:''} Repeat the intended stimulus with control; do not compensate through extra distance.`,source:'Session-specific execution breakdown'});}
 else if(execution.recurringWeakness){const labels={distance:'distance discipline',pace:'pace control',power:'power control',hr:'heart-rate control',drift:'aerobic durability',rpe:'effort selection'};actionsList.push({title:`Strengthen ${labels[execution.recurringWeakness]||'execution'}`,text:'This component has been the most repeated weak point across recent scored sessions. Focus on the prescribed objective rather than the headline pace alone.',source:'Repeated workout-execution pattern'});}
 else if(Number.isFinite(execution.trend)&&execution.trend>=5)actionsList.push({title:'Preserve improving execution',text:`Execution has improved by about ${execution.trend.toFixed(0)} points. Keep the same pacing and recovery discipline; allow fitness calibration to move targets only after sufficient evidence accumulates.`,source:'Workout execution trend'});
 const raceOpportunity=opportunities.find(f=>['Endurance','Long-run execution','Specificity','Volume progression','Adherence','Fitness'].includes(f.name))||opportunities[0];
 if(actionsList.length<3&&raceOpportunity&&!(recoveryConstraint&&['Adherence','Volume progression','Long-run execution','Specificity'].includes(raceOpportunity.name)))actionsList.push({title:`Build ${raceOpportunity.name.toLowerCase()}`,text:actions[raceOpportunity.name]||interpretations[raceOpportunity.name]?.(raceOpportunity.score)||'Improve this verified limiter through the planned progression.',source:`${raceOpportunity.name} · ${raceOpportunity.confidence.label.toLowerCase()}-confidence evidence`});
 if(actionsList.length<3&&engine.next)actionsList.push({title:'Execute the next purposeful session',text:`${fmtDate(engine.next.date)} · ${engine.next.type} · ${engine.next.distance.toFixed(1)} km. Objective: ${engine.next.purpose}`,source:`${race.phase} phase plan`});
 if(actionsList.length<3)actionsList.push({title:'Improve evidence quality',text:'Keep plan links, distance, duration, power, HR, RPE, pain and HRV complete. Better evidence improves both target calibration and prediction certainty.',source:'Current data coverage'});
 actionsList=actionsList.filter((x,i,a)=>a.findIndex(y=>y.title===x.title)===i).slice(0,3);
 return{conclusion,current:`Current estimate: ${fmtTime(engine.pred)} (${targetPosition}).`,projected,strengths,opportunities,actions:actionsList,evidenceCoverage:Math.round(c.evidenceCoverage*100),recoveryConstraint,athleteState:ast,execution,race};
}
function evidenceFindingHtml(f,positive=false){
 const cls=positive?'evidenceStrength':'evidenceOpportunity';
 const n=String(f.name||'').toLowerCase();
 const icon=/pain|recovery|hrv/.test(n)?'heart':/volume|load|adherence/.test(n)?'load':/pace|fitness|execution|efficien/.test(n)?'pace':'compare';
 return `<details class="evidenceFinding ${cls}"><summary><span class="evidenceFindingIcon">${uiIcon(icon)}</span><span class="evidenceFindingCopy"><b>${esc(f.name)}</b><small>${esc(interpretations[f.name]?.(f.score)||'Measured from logged training evidence.')}</small><span class="findingScoreBar"><i style="width:${clamp(Number(f.score)||0,0,100)}%"></i></span></span><span class="evidenceTags"><i>${impactLabel(f.impact)} impact</i><i>${f.confidence.label} confidence</i></span></summary><div class="evidenceDetail"><div class="evidenceFacts">${f.evidence.facts.map(x=>`<p>${esc(x)}</p>`).join('')}</div><div class="evidenceMeta"><span>Score <b>${Math.round(f.score)} / 100</b></span><span>Window <b>${esc(f.evidence.window)}</b></span><span>Verification <b>${f.confidence.label==='Low'?'Partial':'Supported'}</b></span></div><p class="muted compact">Calculation: ${esc(componentDefinitions[f.name]||'Derived directly from the displayed user-entered and plan-linked values.')}</p></div></details>`;
}
function coachReportHtml(report,compact=false){
 const strengths=report.strengths.length?report.strengths.map(x=>evidenceFindingHtml(x,true)).join(''):'<p class="muted">No strength is labelled yet because the available evidence does not reach the required threshold.</p>';
 const opportunities=report.opportunities.length?report.opportunities.map(x=>evidenceFindingHtml(x,false)).join(''):'<p class="muted">No material evidence-backed opportunity is currently identified.</p>';
 const ast=report.athleteState,ex=report.execution;
 const paceEvidence=ast.fitnessEvidence||{},paceCurrentFactor=Number(paceEvidence.index??100)/100,paceInProgressFactor=Number(paceEvidence.rawIndex??paceEvidence.index??100)/100;
 const loadCurrentFactor=Number(ast.adjustment??1);
 const loadCandidate=ast.weekComplete&&ast.nextAfd?.status==='calculated'?ast.nextAfd:ast.preview;
 const loadInProgressFactor=Number(loadCandidate?.factor??loadCurrentFactor);
 const paceDecision=ast.fitnessDelta>.05?'Increase targets':ast.fitnessDelta<-.05?'Reduce targets':'Maintain targets';
 const loadDecision=`${ast.direction}${ast.pct?` ${ast.pct}%`:''}`;
 const recoverySummary=ast.readiness==='Normal'?'Recovery supports normal progression':ast.readiness==='Reduced'?'Recovery suggests caution':'Recovery currently restricts progression';
 const painSummary=ast.pain.count?`Latest recent maximum ${ast.pain.max}/10`:'No pain data logged';
 const executionHtml=ex&&ex.count?`<section class="executionAssessment"><div class="executionHead"><div><h4>Workout execution</h4><p class="muted compact">How well recent completed sessions delivered their intended stimulus.</p></div><strong>${Number.isFinite(ex.average)?Math.round(ex.average):'—'}/100</strong></div><div class="executionKpis"><span>Recent average <b>${Number.isFinite(ex.average)?Math.round(ex.average):'—'}</b>${Number.isFinite(ex.average)?`<i><em style="width:${clamp(ex.average,0,100)}%"></em></i>`:''}</span><span>Key sessions <b>${Number.isFinite(ex.keyAverage)?Math.round(ex.keyAverage):'—'}</b>${Number.isFinite(ex.keyAverage)?`<i><em style="width:${clamp(ex.keyAverage,0,100)}%"></em></i>`:''}</span><span>Trend <b>${Number.isFinite(ex.trend)?`${ex.trend>=0?'+':''}${ex.trend.toFixed(0)} pts`:'Insufficient data'}</b></span></div><details class="executionDetails"><summary>Session-by-session evidence</summary>${ex.recent.map(x=>`<div class="executionRow"><span>${fmtDate(x.date)} · ${esc(x.type)}</span><b>${x.score}/100</b><small>${x.plan?`Planned ${x.plan.distance.toFixed(1)} km · actual ${Number(x.run.distanceKm).toFixed(1)} km`:'Ad hoc run'}${Number.isFinite(x.pain)?` · pain ${x.pain}/10`:''}${Number.isFinite(x.drift)?` · drift ${x.drift.toFixed(1)}%`:''}</small></div>`).join('')}</details></section>`:'<section class="executionAssessment"><h4>Workout execution</h4><p class="muted">No completed run has enough information for an execution score yet.</p></section>';
 return `<div class="coachReport ${compact?'compactReport':''}"><div class="coachVerdict"><span>LONGITUDINAL TRAINING REVIEW</span><p class="coachConclusion">${esc(report.conclusion)}</p><p class="coachProjection">${esc(report.projected)}</p><small>Evidence coverage ${report.evidenceCoverage}% · Coaching uses logged, configured, plan-linked and execution-score evidence.</small></div><div class="coachAdaptationReference"><b>Adaptation status</b><p>Numeric Pace & Power and Distance & Load factors are shown once in the Adaptation section above. This longitudinal review focuses on the coaching interpretation, strengths, limiters and next actions.</p></div><div class="coachRecoverySummary"><div><span>Recovery</span><b>${esc(ast.readiness)}</b><small>${esc(recoverySummary)}</small></div><div><span>Pain</span><b>${ast.pain.count?`${ast.pain.max}/10`:'No data'}</b><small>${esc(painSummary)}</small></div></div>${executionHtml}<div class="coachEvidenceGrid"><section><h4>Verified strengths</h4>${strengths}</section><section><h4>Priority opportunities</h4>${opportunities}</section></div><section class="coachActions"><h4>Next actions</h4>${report.actions.map((a,i)=>`<div class="coachAction"><strong>${i+1}</strong><div><b>${esc(a.title)}</b><p>${esc(a.text)}</p><small>Based on: ${esc(a.source)}</small></div></div>`).join('')}</section></div>`;
}
function progressCard(x){let pct=clamp(x.value/Math.max(.01,x.target)*100,0,100);let value=x.unit==='km'?`${x.value.toFixed(1)} / ${x.target.toFixed(1)} km`:`${Math.round(x.value)} / ${Math.round(x.target)} ${x.unit}`;return `<div class="progressCard"><div><b>${x.label}</b><span>${value}</span></div><strong>${Math.round(pct)}%</strong><div class="progressTrack"><i style="width:${pct}%"></i></div></div>`}
function decisionHistoryHtml(){
 const rows=completedRuns().slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(r=>{
   const two=r.coachUpdate?.twoPathway||twoPathwayDecisionForRun(r,r.planId?state.plan.find(p=>p.id===r.planId):null),pd=two.pace,ld=two.load;
   return`<div class="decisionHistoryRow two"><div><b>${fmtDate(r.date)} · ${esc(r.type)}</b><small>${esc(pd.interpretation)} ${esc(ld.interpretation)}</small></div><span class="hold">P ${pd.finalSignal>=0?'+':''}${pd.finalSignal.toFixed(2)} · L ${ld.finalSignal>=0?'+':''}${ld.finalSignal.toFixed(2)}</span><em>${pd.confidence}/${ld.confidence} confidence</em></div>`;
 });
 return rows.length?`<details class="decisionHistoryPanel"><summary><span>Adaptation decision history</span><b>${rows.length} recent decisions</b></summary><p class="muted compact">A persistent audit trail of how uploaded runs were interpreted before pathway evidence was updated.</p><div>${rows.join('')}</div></details>`:'';
}

function modelValidationSummary(){
 const runs=(state.runs||[]).filter(r=>Number(r.distanceKm)>0).slice().sort((a,b)=>a.date.localeCompare(b.date)),paceCases=[],loadCases=[];
 runs.forEach((r,i)=>{
  const plan=r.planId?state.plan.find(p=>p.id===r.planId):null,two=twoPathwayDecisionForRun(r,plan),pc=paceAcceptedContribution(two.pace),lc=loadAcceptedContribution(two.load),family=effectiveWorkoutFamily(r);
  if(Math.abs(pc)>=.00005){const next=runs.slice(i+1).find(n=>effectiveWorkoutFamily(n)===family&&dte(n.date)-dte(r.date)<=28*DAY);if(next){const comp=comparableRunAnalysis(next);if(comp&&comp.confidence!=='Low'&&Number.isFinite(comp.efficiencyDelta))paceCases.push({date:r.date,nextDate:next.date,contribution:pc,outcome:comp.efficiencyDelta,confirmed:pc>0?comp.efficiencyDelta>=0:comp.efficiencyDelta<=0,confidence:comp.confidence});}}
  if(Math.abs(lc)>=.00005){const next=runs.slice(i+1).find(n=>dte(n.date)-dte(r.date)<=7*DAY);if(next){const nextScore=workoutScore(next),pain=Number(next.pain),stable=(!Number.isFinite(nextScore)||nextScore>=75)&&(!Number.isFinite(pain)||pain<3);loadCases.push({date:r.date,nextDate:next.date,contribution:lc,stable,confirmed:lc>0?stable:!stable,nextScore,pain});}}
 });
 const pct=a=>a.length?Math.round(a.filter(x=>x.confirmed).length/a.length*100):null,pacePct=pct(paceCases),loadPct=pct(loadCases),n=paceCases.length+loadCases.length,confirmed=paceCases.filter(x=>x.confirmed).length+loadCases.filter(x=>x.confirmed).length;
 return{paceCases,loadCases,pacePct,loadPct,overall:n?Math.round(confirmed/n*100):null,maturity:n>=20?'Moderate':n>=8?'Emerging':n>=3?'Early':'Insufficient',n,note:'These are internal follow-up checks, not external scientific validation or proof that a pathway caused the later outcome.'};
}
function modelValidationHtml(){
 const v=modelValidationSummary(),metric=(label,pct,n,desc)=>`<article><div class="metricHeadLine"><small>${label}</small><strong>${pct==null?'—':pct+'%'}</strong></div><div class="brandProgress slim"><i style="width:${pct==null?0:clamp(pct,0,100)}%"></i></div><span>${n} evaluable follow-up${n===1?'':'s'}</span><p>${desc}</p></article>`;
 const cases=[...v.paceCases.map(x=>`<div class="validationCase"><span>${fmtDate(x.date)} → ${fmtDate(x.nextDate)} · Pace & Power</span><b>${x.confirmed?'Direction confirmed':'Not confirmed'}</b><small>Contribution ${signedFactorDelta(x.contribution)} · later comparable efficiency ${x.outcome>=0?'+':''}${x.outcome.toFixed(1)}% · ${x.confidence} comparison confidence</small></div>`),...v.loadCases.map(x=>`<div class="validationCase"><span>${fmtDate(x.date)} → ${fmtDate(x.nextDate)} · Distance & Load</span><b>${x.confirmed?'Direction confirmed':'Not confirmed'}</b><small>Contribution ${signedFactorDelta(x.contribution)} · next-session ${x.stable?'stable':'adverse/low-execution'} response</small></div>`)].join('');
 return`<section class="modelValidationPanel uiLevel2"><div class="modelValidationHead"><div><small>MODEL VALIDATION</small><h3>Are adaptive decisions being confirmed by later runs?</h3></div><span>${esc(v.maturity)} evidence</span></div><p>This checks whether accepted pathway decisions are followed by outcomes in the expected direction. It does not claim causal or external validation.</p><div class="modelValidationGrid">${metric('PACE & POWER',v.pacePct,v.paceCases.length,'Later same-family comparable run with Moderate/High comparison confidence.')}${metric('DISTANCE & LOAD',v.loadPct,v.loadCases.length,'Next recorded run within 7 days checks subsequent tolerance.')}${metric('OVERALL FOLLOW-UP',v.overall,v.n,'Directional confirmation across evaluable pathway decisions.')}</div><div class="scienceProvenance"><div><small>EVIDENCE-BACKED CONCEPTS</small><b>Individualised progression · internal/external load · HRV as recovery context · power-based intensity</b></div><div><small>APP-SPECIFIC HEURISTICS</small><b>Pathway weights · learning rates · safeguard thresholds · race-probability mapping</b></div></div><div class="validationCaution"><b>Interpretation</b><p>${esc(v.note)}</p>${v.n<8?'<p>Automatic coefficient self-calibration remains disabled. At least 8 evaluable follow-ups are required before even an Emerging internal validation signal.</p>':''}</div><details><summary>Show validation cases</summary>${cases||'<p class="muted compact">No pathway decision has enough subsequent evidence to validate yet.</p>'}</details></section>`;
}

function progressAdaptationHomeHtml(){
 const w=Math.max(1,currentWeek()),ast=athleteState(w),paceReview=pacePowerReviewState(),loadApplied=adaptiveFactorDetails(w),loadPreview=provisionalWeeklyAdjustment(w);
 const paceWeek=weeklyPaceEvidence(w),loadWeek=weeklyLoadEvidence(w,false,iso(today()));
 const paceProjected=paceReview.provisional,loadProjected=Number(loadPreview.cumulativeFactor||loadApplied.cumulativeFactor||1);
 const paceRows=paceWeek.rows.filter(x=>Math.abs(x.contribution)>=.00005).slice().reverse().map(x=>`<div class="canonicalContribution"><span>${fmtDate(x.run.date)} · ${esc(effectiveRunType(x.run))}</span><b>${signedFactorDelta(x.contribution)}</b></div>`).join('');
 const loadRows=loadWeek.decisions.filter(x=>Math.abs(x.contribution)>=.00005).slice().reverse().map(x=>`<div class="canonicalContribution"><span>${fmtDate(x.run.date)} · ${esc(effectiveRunType(x.run))}</span><b>${signedFactorDelta(x.contribution)}</b></div>`).join('');
 const status=(delta)=>delta>.0005?{label:'Improving',arrow:'↑',cls:'up'}:delta<-.0005?{label:'More conservative',arrow:'↓',cls:'down'}:{label:'Holding',arrow:'→',cls:'flat'};
 const ps=status(paceProjected-paceReview.applied),ls=status(loadProjected-Number(loadApplied.cumulativeFactor||1));
 const hist=ast.pathways.history||[],paceHist=hist.map(x=>Number(x.paceFactor??x.pace)).filter(Number.isFinite),loadHist=hist.map(x=>Number(x.loadFactor??x.load)).filter(Number.isFinite);
 const card=(kind,title,stateObj,applied,weekDelta,projected,sinceStart,spark,rows,desc)=>`<article class="adaptationVisualCard ${stateObj.cls} uiLevel2"><div class="canonicalPathHead"><div class="pathTitle">${uiIcon(kind)}<div><small>${title}</small><h4>${stateObj.arrow} ${stateObj.label}</h4></div></div><strong>${applied.toFixed(3)}</strong></div><div class="pathSpark">${miniSparkline(spark)}</div><div class="canonicalPathMetrics compact"><div><small>This week</small><b>${signedFactorDelta(weekDelta)}</b></div><div><small>Projected</small><b>${projected.toFixed(3)}</b></div><div><small>Since start</small><b>${signedFactorDelta(sinceStart)}</b></div></div><details><summary>Evidence</summary><p class="muted compact">${desc}</p>${rows||'<p class="muted compact">No non-zero accepted contribution this week.</p>'}</details></article>`;
 return`<section class="canonicalAdaptationHome uiLevel1"><div class="canonicalAdaptationHead"><div><small>ADAPTATION</small><h3>Learned training calibration</h3></div><span>Week ${w}</span></div><div class="canonicalPathwayGrid">${card('pace','PACE & POWER',ps,paceReview.applied,paceProjected-paceReview.applied,paceProjected,ast.pathways.pace.sinceStart,paceHist,paceRows,'Capability evidence from target execution, comparable physiology and personal response.')}${card('load','DISTANCE & LOAD',ls,Number(loadApplied.cumulativeFactor||1),loadProjected-Number(loadApplied.cumulativeFactor||1),loadProjected,ast.pathways.load.sinceStart,loadHist,loadRows,'Tolerance evidence from completed exposure, load response, pain and personal history.')}</div><details class="canonicalHistory"><summary>Full pathway history</summary>${pathwayHistorySvg(ast.pathways.history)}<p class="muted compact">Readiness is temporary recovery context and does not alter learned capability.</p></details></section>`;
}

function renderDashboard(){
 let engine=coachEngine(),{c,pred,cw,wd}=engine;
 $('phaseBadge').textContent=phase(cw);
 $('raceTitle').textContent=state.setup.raceName;
 $('raceSubtitle').textContent=`${dte(state.setup.raceDate).toLocaleDateString()} • ${state.setup.raceDistance.toFixed(1)} km • target ${fmtTime(state.setup.targetTime)} (${pace(state.setup.targetTime/state.setup.raceDistance)})`;
 document.querySelector('.currentOutlook>span').textContent='Current race capability';
 document.querySelector('.projectedOutlook>span').textContent='Expected programme outcome';
 $('currentProbability').textContent=fmtEstimate(pred,engine.currentModel.provisional);
 $('currentProbabilityLabel').textContent=`Today · ${paceEstimate(pred,engine.currentModel.provisional)}`;
 $('currentPrediction').textContent=engine.currentModel.provisional?'Provisional estimate · log completed training before target probability is scored':`${Math.round(engine.currentModel.probability)}% chance of ${fmtTime(state.setup.targetTime)} · ${engine.currentModel.label}`;
 $('currentRange').textContent=`Likely 70% range ${fmtEstimate(engine.currentModel.rangeLow,engine.currentModel.provisional)}–${fmtEstimate(engine.currentModel.rangeHigh,engine.currentModel.provisional)} · ${paceEstimate(engine.currentModel.rangeLow,engine.currentModel.provisional)}–${paceEstimate(engine.currentModel.rangeHigh,engine.currentModel.provisional)}`;
 $('projectedProbability').textContent=fmtEstimate(engine.projection.predictedTime,engine.projectedModel.provisional);
 $('projectedProbabilityLabel').textContent=`Race-day scenario · ${paceEstimate(engine.projection.predictedTime,engine.projectedModel.provisional)}`;
 $('projectedPrediction').textContent=engine.projectedModel.provisional?'Provisional plan scenario · outcome depends on future execution evidence':`${Math.round(engine.projectedModel.probability)}% chance of target · ${engine.projectedModel.label}`;
 $('projectedRange').textContent=`Likely 70% range ${fmtEstimate(engine.projectedModel.rangeLow,engine.projectedModel.provisional)}–${fmtEstimate(engine.projectedModel.rangeHigh,engine.projectedModel.provisional)} · ${paceEstimate(engine.projectedModel.rangeLow,engine.projectedModel.provisional)}–${paceEstimate(engine.projectedModel.rangeHigh,engine.projectedModel.provisional)}`;
 const gain=engine.projectedModel.probability-engine.currentModel.probability,targetMargin=state.setup.targetTime-engine.projection.predictedTime;
 const health=planHealthAssessment(c)||{score:0};
 const projectedFitness=Number(engine.projection?.projectedFitnessIndex);
 const projectedFitnessSafe=Number.isFinite(projectedFitness)?projectedFitness:100;
 const fitnessGainPct=Number(engine.projection?.fitnessGainPct);
 const fitnessGainSafe=Number.isFinite(fitnessGainPct)?fitnessGainPct:Math.max(0,(projectedFitnessSafe-100)/100);
 const fitnessContributions=Array.isArray(engine.projection?.fitnessProjection?.contributions)?engine.projection.fitnessProjection.contributions:[];
 const contributionRows=fitnessContributions.length?fitnessContributions.map(x=>{const potential=Number(x?.potential),realised=Number(x?.realised);return `<div class="calcRow"><span>${esc(x?.name||'Plan stimulus')}</span><span>${Number.isFinite(potential)?potential.toFixed(2):'—'}% potential</span><span>${Number.isFinite(realised)?realised.toFixed(2):'—'}%</span></div>`}).join(''):`<div class="calcRow"><span>Plan-derived projection</span><span>Calculated from the current plan</span><span>${(fitnessGainSafe*100).toFixed(2)}%</span></div>`;
 $('outlookGain').innerHTML=`<div class="outlookMiniMetric"><span>Expected improvement</span><b>${fmtTime(engine.projection.improvementSec)}</b><div class="metricRail"><i style="width:${clamp(Math.abs(Number(engine.projection.improvementSec)||0)/3600*100,4,100)}%"></i></div></div><div class="outlookMiniMetric"><span>Target margin</span><b>${targetMargin>=0?fmtTime(targetMargin)+' faster':fmtTime(-targetMargin)+' slower'}</b><div class="metricRail"><i style="width:${clamp(Math.abs(Number(targetMargin)||0)/1800*100,4,100)}%"></i></div></div><details class="outlookMetricDetail"><summary><span class="outlookMetricLabel">Projected fitness</span><b>${projectedFitnessSafe.toFixed(1)}</b><small>How this is calculated</small></summary><div class="outlookMetricCalc"><p><b>${projectedFitnessSafe.toFixed(1)}</b> means the model expects general race capability to be ${(projectedFitnessSafe-100).toFixed(1)}% above the latest assessment baseline of 100, before the separate durability and taper adjustments.</p><div class="calcTable">${contributionRows}<div class="calcRow total"><span>Projected Fitness gain</span><span></span><span>+${(fitnessGainSafe*100).toFixed(2)}%</span></div></div><p class="muted compact">Realisation reflects plan health, expected completion, recovery, training opportunity and diminishing returns. Marathon durability and taper are calculated separately.</p></div></details><div class="outlookMiniMetric"><span>Plan health</span><b>${Math.round(Number(health.score)||0)}/100</b><div class="metricRail"><i style="width:${clamp(Number(health.score)||0,0,100)}%"></i></div></div>`;
 const assumption=document.querySelector('.outlookAssumption');if(assumption)assumption.textContent=`Expected scenario uses ${Math.round(clamp(Number(engine.projection.completionAssumption)||.85,.75,.93)*100)}% plan completion, plan-derived fitness and durability gains, and a taper benefit calculated from the actual taper structure.`;
 $('trackStatus').innerHTML=`<span class="statusDot"></span><b>${engine.currentModel.provisional?'Provisional outlook — add completed training evidence':engine.status}</b>`;
 const hero=$('trackStatus').closest('.outlookHero');
 if(hero)hero.classList.remove('outlook-good','outlook-watch','outlook-action');
 if(hero)hero.classList.add(engine.currentModel.probability>=70?'outlook-good':engine.currentModel.probability>=45?'outlook-watch':'outlook-action');
 const currentCard=document.querySelector('.currentOutlook'),projectedCard=document.querySelector('.projectedOutlook');
 [currentCard,projectedCard].forEach(card=>card&&card.classList.remove('metric-good','metric-watch','metric-action'));
 if(currentCard)currentCard.classList.add(engine.currentModel.probability>=70?'metric-good':engine.currentModel.probability>=45?'metric-watch':'metric-action');
 if(projectedCard)projectedCard.classList.add(engine.projectedModel.probability>=70?'metric-good':engine.projectedModel.probability>=45?'metric-watch':'metric-action');
 const coachReport=evidenceBasedCoach(engine);
 $('assessmentText').innerHTML=coachReportHtml(coachReport,true);
 const adaptationHome=$('progressAdaptationHome');if(adaptationHome)adaptationHome.innerHTML=progressAdaptationHomeHtml();
 const validationEl=$('modelValidation');if(validationEl)validationEl.innerHTML=modelValidationHtml();
 const decisionHistory=$('decisionHistory');if(decisionHistory)decisionHistory.innerHTML=decisionHistoryHtml();
 const personalModelEl=$('personalResponseModel');if(personalModelEl)personalModelEl.innerHTML=personalResponseModelHtml();
 const pf=engine.projection.profile;
 const predictionModelContent=$('predictionModelContent');
 if(predictionModelContent)predictionModelContent.innerHTML=`<div class="modelSteps"><section><b>Race today — central time</b><p>Latest valid assessment is extrapolated to ${state.setup.raceDistance.toFixed(1)} km. Marathon durability changes the distance exponent from 1.06 toward 1.115 when long-run, weekly-volume and specific-session evidence is incomplete.</p><code>${fmtTime(engine.pred)} at ${pace(engine.pred/state.setup.raceDistance)}</code></section><section><b>Follow programme — central time</b><p>The programme scenario recalculates durability and plan-derived fitness from the actual settings. Plan Health is ${Math.round(engine.projection.planHealthScore)}/100: peak ${pf.plannedPeak.toFixed(1)} km/week, longest run ${pf.peakLong.toFixed(1)} km, ${pf.enabledDays} running days/week, ${(pf.growth*100).toFixed(1)}% growth, ${pf.taperDays} taper days and ${Math.round(pf.qualityShare*100)}% quality distance.</p><code>${fmtTime(engine.projection.predictedTime)} at ${pace(engine.projection.predictedTime/state.setup.raceDistance)} · durability exponent ${engine.projection.projectedExponent.toFixed(3)} · projected fitness ${engine.projection.projectedFitnessIndex.toFixed(1)} · taper ${(engine.projection.taperGain*100).toFixed(1)}% · completion ${Math.round(clamp(Number(engine.projection.completionAssumption)||.85,.75,.93)*100)}%</code></section><section><b>Target probability</b><p>The central time is treated as the median of an asymmetric finish-time distribution. The faster tail is narrower and the slower tail wider. Current evidence and execution confidence control the width. Probability is the area finishing at or before ${fmtTime(state.setup.targetTime)}.</p><code>Today ${Math.round(engine.currentModel.probability)}% · programme ${Math.round(engine.projectedModel.probability)}% · displayed as central 70% ranges</code></section></div><p class="muted compact">The relationships are evidence-informed but the exact coefficients are app calibration assumptions, not a clinically or externally validated prediction equation.</p>`;
 $('currentPreparationScore').textContent=Number.isFinite(c.overall)?Math.round(c.overall)+' / 100':'Not scored';
  $('evidenceBadge').textContent=`Evidence ${Math.round(c.evidenceCoverage*100)}%`;
 const evidenceContributions=engine.projectedPreparation.pillars.map(p=>({name:p.name,points:p.weight*p.coverage*100,weight:p.weight,coverage:p.coverage}));
 $('pillarCards').innerHTML=`<details class="evidenceCoverageExplain"><summary>How ${Math.round(c.evidenceCoverage*100)}% evidence is used</summary><p><b>Evidence coverage controls prediction uncertainty, not the central predicted time.</b> Lower coverage widens the likely finish-time range and makes the target probability less certain.</p><div class="calcTable">${evidenceContributions.map(x=>`<div class="calcRow"><span>${esc(x.name)}</span><span>${Math.round(x.coverage*100)}% available</span><span>${x.points.toFixed(0)} points</span></div>`).join('')}<div class="calcRow total"><span>Total evidence coverage</span><span></span><span>${Math.round(c.evidenceCoverage*100)}%</span></div></div><p class="muted compact">Each contribution equals model weight × available evidence. Component scores affect whether the available evidence is favourable; missing evidence widens the range instead of being assigned a neutral score.</p></details>`+engine.projectedPreparation.pillars.map((p,pi)=>`
   <div class="pillarCard status-${scoreStatus(p.currentScore,p.coverage>0)}" data-pillar-index="${pi}" role="button" tabindex="0" aria-expanded="false" style="--pillar:${p.color}">
    <div class="pillarTop"><b>${p.name}</b><span class="pillarScore">${Number.isFinite(p.currentScore)?Math.round(p.currentScore):'N/A'}</span></div>
    <div class="pillarBar"><i style="width:${Number.isFinite(p.currentScore)?p.currentScore:0}%"></i></div>
    <p>${p.description}</p>
    <div class="pillarMeta"><span>Model weight ${Math.round(p.weight*100)}%</span><span>Evidence ${Math.round(p.coverage*100)}%</span></div>
    <details class="pillarExplain"><summary>How this is calculated</summary><div class="calcTable">${p.items.map(i=>`<div class="calcRow"><span>${i.name}</span><span>${i.hasEvidence?Math.round(i.displayScore):'No evidence'}</span><span>${Math.round(i.weight*100)}%</span></div>`).join('')}</div><p class="muted">Only current completed evidence is scored. Missing evidence is shown as missing and widens the prediction range; it does not receive a neutral or projected score.</p></details>
   </div>`).join('');
 let total=Math.max(1,weeks()),pos=clamp((engine.cw-1)/(Math.max(1,total-1))*100,0,100);
 const blockNames=[];for(let w=1;w<=total;w++){const name=detailedPhase(w),last=blockNames.at(-1);if(!last||last.name!==name)blockNames.push({name,startWeek:w,endWeek:w});else last.endWeek=w}
 const phaseClass=name=>({'Foundation':'foundation','Aerobic':'aerobic','Development':'development','Endurance':'endurance','Specific':'specific','Peak':'peak','Taper':'taper'}[name]||'build');
 const pctStart=w=>(w-1)/total*100,pctEnd=w=>w/total*100;
 const timelineLabel=name=>({'Foundation':'Foundation','Aerobic':'Aerobic','Development':'Development','Endurance':'Endurance','Specific':'Specific','Peak':'Peak','Taper':'Taper'}[name]||esc(name));
 const blocks=blockNames.map(b=>({name:b.name,label:timelineLabel(b.name),start:pctStart(b.startWeek),end:pctEnd(b.endWeek),cls:phaseClass(b.name)}));
 const programmeStart=state.plan.length?dte(state.plan.map(x=>x.date).sort()[0]):today();
 const programmeEnd=dte(state.setup.raceDate);
 const remaining=raceTimeRemaining();
 const programmeSpan=Math.max(DAY,programmeEnd-programmeStart);
 const programmeCompletion=clamp((today()-programmeStart)/programmeSpan*100,0,100);
 $('raceTimeline').innerHTML=(()=>{
 const blocks=programmeBlocks(),pct=clamp((currentWeek-1)/Math.max(1,planWeeks.length-1)*100,0,100);
 return `<div class="programmeTimelineVisual">
   <div class="timelineRailWrap">
     <div class="timelineLabels">${blocks.map(b=>`<span style="width:${b.pct}%">${esc(b.label)}</span>`).join('')}</div>
     <div class="timelineRail">${blocks.map((b,i)=>`<i class="block b${i+1}" style="width:${b.pct}%"></i>`).join('')}<b class="timelineMarker" style="left:${pct}%"></b></div>
     <div class="timelineEnds"><span>Plan start</span><span>Race day</span></div>
   </div>
   <div class="timelineSummary"><strong>${esc(currentBlockName())} phase · week ${currentWeek} of ${planWeeks.length}</strong><span>${Math.round(pct)}% complete · ${Math.max(0,planWeeks.length-currentWeek)} weeks until race</span></div>
 </div>`;
})();
 let afd=adaptiveFactorDetails(cw);
 $('kpis').innerHTML=kpi('Time until race',remaining.label,'Remaining')+kpi('Programme completion',`${Math.round(programmeCompletion)}%`,'Elapsed on timeline');
 $('weeklyDistanceSummary').innerHTML=`<span class="chartSummaryLabel">This week</span><strong>${wd.actual.toFixed(1)} / ${wd.planned.toFixed(1)} km</strong>`;
 $('longRunSummary').innerHTML=`<span class="chartSummaryLabel">Longest verified</span><strong>${c.completedLongest.toFixed(1)} / ${Number(state.setup.peakLong).toFixed(1)} km</strong>`;
 const trendHistory=(state.predictionHistory||[]).filter(x=>Number.isFinite(Number(x.seconds))&&x.date<=iso(today())).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const startPrediction=Number(state.programStartPrediction)||initialProgrammePrediction(state.setup)||pred;
 const targetTime=Number(state.setup.targetTime);
 const currentSaved=trendHistory.at(-1);
 const currentEstimate=currentSaved?Number(currentSaved.seconds):null;
 const vsStart=Number.isFinite(currentEstimate)?currentEstimate-startPrediction:null;
 const vsTarget=Number.isFinite(currentEstimate)?currentEstimate-targetTime:null;
 const eventCount=trendHistory.length;
 const deltaText=(v,betterLabel='faster',worseLabel='slower')=>!Number.isFinite(v)?'—':Math.abs(v)<30?'No material change':`${v<0?betterLabel:worseLabel} by ${fmtTime(Math.abs(v))}`;
 $('predictionSummary').innerHTML=`<div class="predictionReferences"><div><span>Target time</span><strong>${fmtTime(targetTime)}</strong><small>Fixed race goal</small></div><div><span>Predicted at programme start</span><strong>${fmtTime(startPrediction)}</strong><small>Fixed baseline from the plan-start inputs</small></div></div>${eventCount?`<div class="predictionCurrent" data-update-mode="${esc(currentSaved.updateMode||'maintained')}"><span>Current prediction after ${eventCount} uploaded update${eventCount===1?'':'s'}</span><strong>${fmtTime(currentEstimate)}</strong><div class="predictionDeltas"><span><b>${deltaText(vsStart)}</b><small>versus programme start</small></span><span><b>${deltaText(vsTarget,'inside target','outside target')}</b><small>versus target</small></span></div><small>Latest update: ${esc(currentSaved.source||'Run update')} · ${fmtDate(currentSaved.date)}</small>${currentSaved.evidenceReason?`<div class="predictionUpdateEvidence"><b>${esc(currentSaved.evidenceQuality||'Low')} evidence · ${Math.round((Number(currentSaved.evidenceWeight)||0)*100)}% update weight</b><span>${esc(currentSaved.evidenceReason)}</span><small>${Number(currentSaved.updateDelta)<-.5?`Earned improvement ${fmtTime(Math.abs(Number(currentSaved.updateDelta)||0))}`:'Prediction maintained'}${Number.isFinite(Number(currentSaved.completionRatio))?` · ${Math.round(Number(currentSaved.completionRatio)*100)}% of expected stimulus`:''}. Negative training evidence affects confidence and recovery before established capability.</small></div>`:''}</div>`:`<div class="predictionAwaiting"><strong>No run-based prediction updates yet</strong><p>Upload or log a run, or save a valid assessment, to add the first progression point. The two horizontal lines below are the fixed programme-start prediction and target.</p></div>`}`;
 if($('componentGuide'))$('componentGuide').innerHTML=c.components.map(x=>`<div><b>${x.name}</b><p>${componentDefinitions[x.name]}</p><small class="${x.hasEvidence?'muted':'metricMissing'}">${x.hasEvidence?`Current score: ${Math.round(x.displayScore)} / 100 · evidence ${Math.round((x.evidenceFraction??1)*100)}%`:'No evidence yet'} · within-component weight ${Math.round(x.weight*100)}%</small></div>`).join('');
 let missing=uniqueComponents(c.components.filter(x=>!x.hasEvidence));
 $('dataNeeded').innerHTML=missing.length?missing.map(x=>`<div class="note"><b>${x.name}</b><br>${componentDefinitions[x.name]}</div>`).join(''):'<p class="muted">All preparation-model components currently have evidence.</p>';
 drawDashboardCharts();
}
function updateChartTable(canvas,summary,headers,rows){if(!canvas)return;const id=`${canvas.id}-data`;let details=canvas.parentElement?.querySelector(`:scope > #${id}`);if(!details){details=document.createElement('details');details.id=id;details.className='chartDataTable';canvas.insertAdjacentElement('afterend',details)}details.innerHTML=`<summary>${esc(summary)}</summary><div class="tableScroll"><table><caption>${esc(canvas.getAttribute('aria-label')||summary)}</caption><thead><tr>${headers.map(header=>`<th scope="col">${esc(header)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map((cell,index)=>index===0?`<th scope="row">${esc(cell)}</th>`:`<td>${esc(cell)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">No completed data yet.</td></tr>`}</tbody></table></div>`;canvas.setAttribute('aria-describedby',id)}
function drawLine(canvas,series,options={}){
 let ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
 let top=series.some(s=>s.label)?70:28,left=options.left||78,bottom=66,right=24;
 ctx.clearRect(0,0,W,H);
 const tableLength=Math.max(options.labels?.length||0,...series.map(item=>item.data.length));const tableHeaders=['Point',...series.map(item=>item.label||'Value')];const tableRows=Array.from({length:tableLength},(_,index)=>[options.labels?.[index]||String(index+1),...series.map(item=>{const value=item.horizontal?item.data[0]:item.data[index];return Number.isFinite(value)?(options.formatY?options.formatY(value):Number(value).toFixed(1)):'—'})]);updateChartTable(canvas,'View chart summary and data',tableHeaders,tableRows);

 if(series.some(s=>s.label)){
   ctx.font='600 22px system-ui';ctx.textAlign='left';let x=left;
   series.forEach(s=>{
     if(!s.label)return;
     ctx.save();ctx.strokeStyle=s.color;ctx.lineWidth=6;ctx.lineCap='round';
     if(s.dashed)ctx.setLineDash([16,10]);
     ctx.beginPath();ctx.moveTo(x,30);ctx.lineTo(x+30,30);ctx.stroke();ctx.restore();
     ctx.fillStyle='#DDF6FF';ctx.fillText(s.label,x+42,38);
     x+=52+ctx.measureText(s.label).width+34;
   });
 }

 let vals=series.flatMap(s=>s.data).filter(Number.isFinite);
 if(!vals.length){
   ctx.fillStyle='#DDF6FF';ctx.font='600 27px system-ui';ctx.textAlign='center';
   ctx.fillText(options.empty||'More completed data is needed',W/2,H/2);return;
 }
 let min=Number.isFinite(options.min)?options.min:(options.zero===false?Math.min(...vals):0);
 let max=Number.isFinite(options.max)?options.max:Math.max(...vals);
 if(max<=min){max=min+1}
 if(!Number.isFinite(options.min)&&!Number.isFinite(options.max)){
   let pad=(max-min)*.10||1;max+=pad;if(options.zero===false)min-=pad;
 }
 let chartH=H-bottom-top,chartW=W-left-right;
 ctx.font='20px system-ui';ctx.textAlign='right';
 let ticks=options.ticks||5;
 for(let i=0;i<ticks;i++){
   let fraction=i/(ticks-1),v=min+(max-min)*fraction,y=H-bottom-chartH*fraction;
   ctx.strokeStyle=i===0?'#DDF6FF':'#3B82F6';ctx.lineWidth=i===0?2:1;
   ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(W-right,y);ctx.stroke();
   ctx.fillStyle='#DDF6FF';
   ctx.fillText(options.formatY?options.formatY(v):v.toFixed(v<10?1:0),left-12,y+7);
 }
 let n=Math.max(1,...series.map(s=>s.data.length));
 const px=i=>n===1?left+chartW/2:left+i*chartW/(n-1);
 const py=v=>H-bottom-(v-min)/(max-min)*chartH;

 series.forEach((s,si)=>{
   let good=s.data.map((v,i)=>({v,i})).filter(x=>Number.isFinite(x.v));if(!good.length)return;
   if(options.area&&si===0&&good.length>1){
     let g=ctx.createLinearGradient(0,top,0,H-bottom);
     g.addColorStop(0,s.color+'35');g.addColorStop(1,s.color+'00');
     ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(px(good[0].i),H-bottom);
     good.forEach(o=>ctx.lineTo(px(o.i),py(o.v)));
     ctx.lineTo(px(good.at(-1).i),H-bottom);ctx.closePath();ctx.fill();
   }
   ctx.save();ctx.strokeStyle=s.color;ctx.lineWidth=s.width||5;ctx.lineJoin='round';ctx.lineCap='round';
   if(s.dashed)ctx.setLineDash([16,10]);
   ctx.beginPath();
   if(s.horizontal){
     const y=py(good[0].v);ctx.moveTo(left,y);ctx.lineTo(W-right,y);ctx.stroke();
   }else{
     good.forEach((o,j)=>j?ctx.lineTo(px(o.i),py(o.v)):ctx.moveTo(px(o.i),py(o.v)));
     if(good.length>1)ctx.stroke();
   }
   ctx.restore();
   if(s.points!==false)good.forEach(o=>{
     ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(px(o.i),py(o.v),7,0,Math.PI*2);ctx.fill();
     ctx.strokeStyle=s.color;ctx.lineWidth=4;ctx.stroke();
   });
 });
 if(options.labels?.length){
   let positions=options.allLabels?options.labels.map((_,i)=>i):
     [0,Math.floor((options.labels.length-1)/2),options.labels.length-1].filter((v,i,a)=>a.indexOf(v)===i);
   ctx.font='19px system-ui';ctx.fillStyle='#DDF6FF';ctx.textAlign='center';
   positions.forEach(i=>ctx.fillText(options.labels[i]||'',px(i),H-18));
 }
 const interactive=[];series.forEach(s=>s.data.forEach((v,i)=>{if(Number.isFinite(v)&&s.points!==false)interactive.push({x:px(i),y:py(v),label:s.label||'Value',value:v,index:i})}));
 canvas._chartPoints=interactive;canvas._chartOptions=options;
 if(!canvas.dataset.chartInteractive){canvas.dataset.chartInteractive='1';canvas.style.cursor='pointer';canvas.addEventListener('click',ev=>{const rect=canvas.getBoundingClientRect(),sx=canvas.width/rect.width,sy=canvas.height/rect.height,x=(ev.clientX-rect.left)*sx,y=(ev.clientY-rect.top)*sy;let nearest=(canvas._chartPoints||[]).map(p=>({...p,d:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.d-b.d)[0];if(!nearest||nearest.d>55)return;let detail=canvas._chartOptions?.pointDetails?.[nearest.index];let formatted=canvas._chartOptions?.formatY?canvas._chartOptions.formatY(nearest.value):Number(nearest.value).toFixed(1);toast(detail||`${nearest.label}: ${formatted}`)});}
}
function completedWeekSeries(){
 return Array.from({length:weeks()},(_,i)=>{
  const w=i+1,data=weekData(w),start=weekStart(w),end=new Date(start.getTime()+7*DAY),raceDate=dte(state.setup.raceDate);
  const race=state.plan.find(p=>p.week===w&&p.type==='Race Day'),isRaceWeek=Boolean(race)||(raceDate>=start&&raceDate<end);
  const plannedForChart=data.planned>0?data.planned:(isRaceWeek?Number(state.setup.raceDistance)||0:0);
  return{...data,plannedForChart,isRaceWeek};
 });
}
function drawDonut(canvas,segments,centerLabel='planned',emptyText='No training volume'){
 if(!canvas)return;
 const ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,cssW=Math.max(320,canvas.clientWidth||500);
 const rows=(segments||[]).filter(x=>Number(x.value)>0),cssH=Math.max(138,44+(rows.length||1)*54);
 canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,cssW,cssH);
 if(!rows.length){ctx.fillStyle='#DDF6FF';ctx.font='600 14px system-ui';ctx.fillText(emptyText,18,38);appendChartDataDisclosure(canvas,[],emptyText);return;}
 const total=rows.reduce((a,b)=>a+Number(b.value||0),0),max=Math.max(...rows.map(x=>Number(x.value)||0),1);
 const palette=['#4CC9F0','#4CC9F0','#4CC9F0','#DDF6FF','#4CC9F0'];
 ctx.font='700 13px system-ui';ctx.textBaseline='middle';
 rows.forEach((seg,i)=>{
   const y=24+i*54,label=String(seg.label||'').replace(/\s+/g,' ').trim(),val=Number(seg.value)||0,pct=total?Math.round(val/total*100):0;
   ctx.fillStyle='#FFFFFF';ctx.fillText(label,18,y);
   const valueText=`${val.toFixed(1)} km · ${pct}%`;ctx.fillStyle='#DDF6FF';ctx.font='600 12px system-ui';
   const tw=ctx.measureText(valueText).width;ctx.fillText(valueText,cssW-18-tw,y);ctx.font='700 13px system-ui';
   const x=18,barY=y+18,w=cssW-36,h=10;
   ctx.fillStyle='rgba(125,183,226,.16)';roundRect(ctx,x,barY,w,h,5);ctx.fill();
   ctx.fillStyle=palette[i%palette.length];roundRect(ctx,x,barY,Math.max(5,w*(val/max)),h,5);ctx.fill();
 });
 appendChartDataDisclosure(canvas,rows.map(x=>({label:x.label,value:Number(x.value)})),`${centerLabel} intensity distribution`);
}
function roundRect(ctx,x,y,w,h,r){if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);return;}ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function intensityGroups(items,distanceKey){
 const dist=x=>Math.max(0,Number(x[distanceKey]??x.distance??x.distanceKm)||0);
 return[
  {label:'Easy / recovery',value:sum(items.filter(x=>['Easy','Recovery','Easy + strides','Shakeout'].includes(x.type)).map(dist))},
  {label:'Aerobic endurance',value:sum(items.filter(x=>['Steady aerobic','Medium-long','Progression'].includes(x.type)).map(dist))},
  {label:'Long / specific long',value:sum(items.filter(x=>['Long run','Specific long run','Race rehearsal','Race'].includes(x.type)).map(dist))},
  {label:'Threshold / race specific',value:sum(items.filter(x=>['Tempo','Marathon','Threshold','Threshold intervals','Marathon-specific','Half-marathon-specific'].includes(x.type)).map(dist))},
  {label:'Speed / tests',value:sum(items.filter(x=>['Intervals','Hills','Fartlek','VO₂max intervals','Race-pace intervals','Fitness assessment'].includes(x.type)).map(dist))}
 ].filter(x=>x.value>0);
}

function intensityMixHtml(items,distanceKey,emptyText='No training volume'){
 const rows=intensityGroups(items,distanceKey),total=sum(rows.map(x=>Number(x.value)||0));
 if(!rows.length||total<=0)return `<div class="intensityEmpty">${esc(emptyText)}</div>`;
 const shades=['tone1','tone2','tone3','tone2','tone1'];
 return `<div class="intensityBarList">${rows.map((row,i)=>{
   const pct=total?Number(row.value)/total*100:0;
   return `<div class="intensityBarRow"><div class="intensityBarHead"><b>${esc(row.label)}</b><span>${Number(row.value).toFixed(1)} km · ${Math.round(pct)}%</span></div><div class="intensityBarTrack"><i class="${shades[i%shades.length]}" style="width:${clamp(pct,0,100)}%"></i></div></div>`;
 }).join('')}</div>`;
}
function roundRect(ctx,x,y,w,h,r){w=Math.max(0,w);r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function drawDashboardCharts(){
 let c=confidence(),arr=completedWeekSeries(),weekLabels=arr.map((x,i)=>x.isRaceWeek?'Race':('W'+(i+1)));
 drawLine($('volumeChart'),[
   {label:'Planned km',data:arr.map(x=>x.plannedForChart),color:'#4CC9F0',dashed:true,points:false},
   {label:'Completed km',data:arr.map(x=>x.actual),color:'#4CC9F0'}
 ],{empty:'No weekly distance data yet',labels:weekLabels,area:false});
 let plannedLong=Array.from({length:weeks()},(_,i)=>state.plan.find(x=>x.week===i+1&&['Long run','Specific long run','Race rehearsal','Progression'].includes(x.type))?.distance??null);
 let completedLong=Array.from({length:weeks()},(_,i)=>{
   let st=weekStart(i+1),en=new Date(st.getTime()+7*DAY);
   let r=completedRuns().filter(x=>['Long run','Specific long run','Race rehearsal'].includes(x.type)&&dte(x.date)>=st&&dte(x.date)<en);
   return r.length?Math.max(...r.map(x=>x.distanceKm)):null;
 });
 drawLine($('longRunChart'),[
   {label:'Planned long run',data:plannedLong,color:'#4CC9F0',dashed:true,points:false},
   {label:'Completed long run',data:completedLong,color:'#4CC9F0'}
 ],{min:0,max:Math.max(state.setup.peakLong*1.12,10),empty:'Log a long run to show completed progression',labels:weekLabels});

 let history=(state.predictionHistory||[]).filter(x=>Number.isFinite(Number(x.seconds))&&x.date<=iso(today())).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const startPrediction=Number(state.programStartPrediction)||initialProgrammePrediction(state.setup)||prediction();
 const targetTime=Number(state.setup.targetTime);
 const predSec=history.map(x=>Number(x.seconds));
 const labels=history.map(x=>dte(x.date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));
 const pointDetails=history.map(x=>`${fmtDate(x.date)} · ${x.source||'Run update'} · ${fmtTime(Number(x.seconds))}`);
 let allSec=[...predSec,startPrediction,targetTime],low=Math.min(...allSec),high=Math.max(...allSec);
 let minSec=Math.max(2*3600,Math.floor((low-1800)/1800)*1800);
 let maxSec=Math.min(7*3600,Math.ceil((high+1800)/1800)*1800);
 if(maxSec-minSec<3600)maxSec=minSec+3600;
 drawLine($('predictionChart'),[
   {label:`Prediction updates${predSec.length?` (${predSec.length})`:''}`,data:predSec,color:'#4CC9F0'},
   {label:`Programme start ${fmtTime(startPrediction)}`,data:[startPrediction],color:'#DDF6FF',dashed:true,points:false,horizontal:true},
   {label:`Target ${fmtTime(targetTime)}`,data:[targetTime],color:'#F47777',dashed:true,points:false,horizontal:true}
 ],{min:minSec,max:maxSec,ticks:5,formatY:v=>fmtTime(v),labels,left:98,pointDetails,empty:'No uploaded prediction updates yet'});

}
function coachIntelligenceHtml(p){
 if(p.type==='Rest'||p.type==='Race Day')return'';
 return `<div class="coachWhy"><h4>Coach intelligence</h4><p><b>Why this workout:</b> ${esc(p.whyThis||p.purpose)}</p><p><b>Why this amount:</b> ${esc(p.whyAmount||'The prescribed amount reflects the current phase, weekly load and Weekly Plan Adjustment.')}</p><p><b>If you skip it:</b> ${esc(p.skipImpact||'Do not catch up by stacking sessions. Continue with the next appropriate workout.')}</p></div>`;
}
function workoutHtml(p){
 let st=status(p),dt=new Date(p.date+'T00:00:00'),day=dt.toLocaleDateString(undefined,{weekday:'short'}),month=dt.toLocaleDateString(undefined,{month:'short'}),typeCls=workoutTypeClass(p.type);
 return`<details class="workout workout-${typeCls} uiLevel2" data-id="${p.id}"><summary class="workoutHead"><div class="dateBox"><small>${day}</small><b>${dt.getDate()}</b><span>${month}</span></div><div class="workoutTypeIcon ${typeCls}">${uiIcon(typeCls==='quality'?'quality':typeCls)}</div><div class="workoutTitle"><h3>${esc(p.type)}</h3><p>${p.type==='Rest'?esc(p.purpose):`${Number(p.distance).toFixed(1)} km · ${esc(p.phase)}`}</p></div><span class="status ${st}">${esc(st)}</span><span class="workoutChevron" aria-hidden="true">⌄</span></summary><div class="workoutDetails"><div class="targets">${p.type==='Rest'?'':`<div class="target"><small>Main-set pace</small><b>${pace(p.zone.pace)}</b></div><div class="target"><small>Main-set HR</small><b>${p.zone.hr} bpm</b></div><div class="target"><small>Main-set power</small><b>${p.zone.power} W</b></div>`}</div>${p.type==='Rest'?'':`<p class="targetScope">Targets apply to: <b>${esc(p.targetScope||'main set')}</b></p>`}<div class="prescription"><p><b>Warm-up</b><span>${p.warmup}</span></p><p><b>Main set</b><span>${p.main}</span></p><p><b>Cooldown</b><span>${p.cooldown}</span></p>${p.distanceCheck?`<p class="distanceCheck"><b>Distance check</b><span>${esc(p.distanceCheck)} ✓</span></p>`:''}<p><b>Purpose</b><span>${p.purpose}</span></p><p><b>Coach guidance</b><span>${p.coach}</span></p><p><b>Fuel / hydration</b><span>${p.fuel}</span></p></div>${coachIntelligenceHtml(p)}${(()=>{const linked=matchingRun(p);return linked?`<button class="viewPlanRun primary full" data-plan-run="${linked.id}">View entered run details</button>`:''})()}</div></details>`;
}

function coachVisualIcon(kind){
 const icons={
  coach:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a7 7 0 0 0-4 12.7V20l4-2 4 2v-4.3A7 7 0 0 0 12 3z"/><path d="M9 10h.01M15 10h.01M9.5 13c1.7 1.3 3.3 1.3 5 0"/></svg>',
  briefing:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8l-5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/><path d="M8 10h5M8 13h8"/><path d="M17.5 3.5v3M16 5h3"/></svg>',
  race:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3M5 4h12l-3 4 3 4H5"/></svg>',
  recovery:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2-5"/><path d="M5 4v5h5"/></svg>',
  trend:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/></svg>',
  injury:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>',
  plan:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M8 13h3M13 13h3M8 16h3"/></svg>',
  load:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M6 18v-5M11 18V8M16 18V4"/></svg>'
 };
 return icons[kind]||icons.coach;
}
function workoutTypeIcon(type){
 const t=String(type||'').toLowerCase();
 if(/race/.test(t))return'⚑';
 if(/hill/.test(t))return'⌁';
 if(/interval|vo2|vo₂|fartlek|repetition/.test(t))return'⚡';
 if(/threshold|tempo/.test(t))return'◆';
 if(/long/.test(t))return'◒';
 if(/recovery/.test(t))return'↻';
 if(/rest/.test(t))return'○';
 return'↗';
}
function workoutTypeClass(type){
 const t=String(type||'').toLowerCase();
 if(/race/.test(t))return'race';if(/hill|interval|vo2|vo₂|fartlek|repetition/.test(t))return'quality';
 if(/threshold|tempo/.test(t))return'threshold';if(/long/.test(t))return'long';if(/recovery/.test(t))return'recovery';if(/rest/.test(t))return'rest';return'easy';
}
function uiIcon(kind){
 const paths={
  easy:'<path d="M5 17c4-7 7-8 14-10"/><path d="M14 5l5 2-2 5"/>',
  quality:'<path d="M13 2L5 13h6l-1 9 9-13h-6z"/>',
  threshold:'<path d="M12 3l7 7-7 11-7-11z"/>',
  long:'<path d="M4 13a8 8 0 1 0 8-8"/><path d="M12 5v8l5 3"/>',
  recovery:'<path d="M5 12a7 7 0 1 0 2-5"/><path d="M5 4v5h5"/>',
  race:'<path d="M5 21V3"/><path d="M5 4h12l-3 4 3 4H5"/>',
  rest:'<path d="M7 7h10M7 12h10M9 17h6"/>',
  pace:'<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
  load:'<path d="M4 18h16M6 18v-5M11 18V8M16 18V4"/>',
  heart:'<path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.7-7 10-7 10z"/>',
  pain:'<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v6M12 17h.01"/>',
  compare:'<path d="M4 7h12M13 4l3 3-3 3M20 17H8M11 14l-3 3 3 3"/>',
  rehab:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>'
 };
 return`<svg class="uiIcon" viewBox="0 0 24 24" aria-hidden="true">${paths[kind]||paths.easy}</svg>`;
}
function circularGauge(value,label=''){
 const v=clamp(Number(value)||0,0,100);
 return`<div class="circularGauge" style="--gauge:${v}"><div><strong>${Math.round(v)}</strong><small>${esc(label)}</small></div></div>`;
}
function miniSparkline(values){
 const vals=(values||[]).map(Number).filter(Number.isFinite);
 if(vals.length<2)return'<div class="miniSparkline empty">Not enough history</div>';
 const w=140,h=34,min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
 const pts=vals.map((v,i)=>`${(i/(vals.length-1)*w).toFixed(1)},${(h-4-(v-min)/span*(h-8)).toFixed(1)}`).join(' ');
 return`<svg class="miniSparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}
function deltaVisual(current,baseline,betterHigh=true,unit=''){
 if(!Number.isFinite(current)||!Number.isFinite(baseline))return'';
 const delta=betterHigh?(current/baseline-1)*100:current-baseline;
 const good=betterHigh?delta>=0:delta<=0;
 const pct=betterHigh?Math.min(100,Math.abs(delta)*12):Math.min(100,Math.abs(delta)*18);
 return`<div class="deltaVisual ${good?'good':'caution'}"><span class="deltaArrow">${delta===0?'→':good?'↑':'↓'}</span><div class="deltaTrack"><i style="width:${pct}%"></i></div><b>${delta>=0?'+':''}${delta.toFixed(1)}${unit}</b></div>`;
}
function visualStatusIcon(kind){
 return kind==='good'?'✓':kind==='caution'?'!':kind==='bad'?'×':'•';
}

function todayPictogram(kind){
 const svg={
  training:`<svg class="todayPic" viewBox="0 0 64 64" aria-hidden="true"><circle class="picSkin" cx="38" cy="10" r="6"/><path class="picBase" d="M31 19l-8 13 8 5 7-10 6 8 10-4"/><path class="picBase" d="M30 36l-7 14H11M32 37l11 10 10-2"/><path class="picAccent" d="M19 31l7-11 11-2"/><path class="picWarm" d="M16 48h12"/></svg>`,
  readiness:`<svg class="todayPic" viewBox="0 0 64 64" aria-hidden="true"><path class="picBase" d="M32 53S11 40 11 23c0-8 6-13 13-13 4 0 7 2 8 5 2-3 5-5 9-5 7 0 13 5 13 13 0 17-22 30-22 30z"/><path class="picGood" d="M8 34h13l5-10 7 20 6-13 4 3h13"/></svg>`,
  pain:`<svg class="todayPic" viewBox="0 0 64 64" aria-hidden="true"><circle class="picSkin" cx="28" cy="9" r="5"/><path class="picBase" d="M28 15l4 17"/><path class="picBase" d="M30 20l-11 10M31 21l12 7"/><path class="picBase" d="M32 32l-10 19M32 32l11 18"/><path class="picWarn" d="M39 29l7 4-5 5 5 3-9 8 2-7-5-3z"/></svg>`,
  shoe:`<svg class="todayPic" viewBox="0 0 64 64" aria-hidden="true"><path class="picBase" d="M10 41c8-2 13-9 17-20l8 4c2 7 7 11 17 13 4 1 6 4 5 8-1 4-4 6-9 6H18c-7 0-11-4-8-11z"/><path class="picAccent" d="M27 25l8 5M23 31l9 5M18 37l9 5"/><path class="picWarm" d="M12 46h43"/></svg>`,
  week:`<svg class="todayPic" viewBox="0 0 64 64" aria-hidden="true"><rect class="picBase" x="10" y="14" width="44" height="38" rx="5"/><path class="picAccent" d="M10 24h44M20 9v10M44 9v10"/><path class="picGood" d="M18 35h8M30 35h8M42 35h5M18 43h8M30 43h8"/></svg>`,
  signal:`<svg class="todayPic" viewBox="0 0 64 64" aria-hidden="true"><path class="picBase" d="M9 48h46M13 44l10-10 9 6 17-22"/><path class="picAccent" d="M43 18h8v8"/><circle class="picGood" cx="23" cy="34" r="3"/><circle class="picGood" cx="32" cy="40" r="3"/></svg>`,
  race:`<svg class="todayPic" viewBox="0 0 64 64" aria-hidden="true"><path class="picBase" d="M17 55V9M18 12h28l-7 9 7 9H18"/><path class="picAccent" d="M20 14h8v8h-8zM28 22h8v8h-8zM36 14h8v8h-8z"/></svg>`,
  rehab:`<svg class="todayPic rehabCrossPic" viewBox="0 0 64 64" aria-hidden="true">
    <path class="picGood rehabCross" d="M27 14h10v13h13v10H37v13H27V37H14V27h13z"/>
    <path class="picAccent rehabArc" d="M14 18a24 24 0 0 1 33-3M50 46a24 24 0 0 1-34 2"/>
  </svg>`,
  recovery:`<svg class="todayPic" viewBox="0 0 64 64" aria-hidden="true"><path class="picBase" d="M43 45A20 20 0 1 1 31 9a17 17 0 0 0 12 36z"/><path class="picAccent" d="M45 12v8M41 16h8M52 26v6M49 29h6"/></svg>`,
  action:`<svg class="todayPic" viewBox="0 0 64 64" aria-hidden="true"><rect class="picBase" x="17" y="10" width="30" height="44" rx="4"/><path class="picGood" d="M25 23l3 3 6-7M25 35l3 3 6-7M25 47l3 3 6-7"/><path class="picBase" d="M37 24h5M37 36h5M37 48h5M26 10V7h12v3"/></svg>`
 };
 return svg[kind]||svg.training;
}
function todayWorkoutStructure(p){
 if(!p||p.type==='Rest')return'';
 const warm=Math.max(0,Number(p.warmDistance)||0),main=Math.max(0,Number(p.mainDistance)||0),cool=Math.max(0,Number(p.coolDistance)||0);
 const reps=clamp(Number(p.repetitions)||Number((String(p.main||'').match(/(\d+)\s*[x×]/i)||[])[1])||1,1,12);
 const recoveries=clamp(Number(p.recoveryCount)||0,0,Math.max(0,reps-1));
 const fastDistance=Math.max(0,Number(p.fastDistance)||Number(p.qualityDistance)||0),recoveryDistance=Math.max(0,Number(p.recoveryDistance)||0);
 const total=Math.max(.1,warm+main+cool),plotX=18,plotW=564;
 let warmW=Math.max(68,plotW*(warm/total)),coolW=Math.max(68,plotW*(cool/total));
 if(warmW+coolW>plotW*.48){const scale=(plotW*.48)/(warmW+coolW);warmW*=scale;coolW*=scale}
 const mainW=plotW-warmW-coolW,mainX=plotX+warmW;
 let shapes=`<rect class="profileWarm" x="${plotX}" y="48" width="${warmW.toFixed(1)}" height="28" rx="4"/>`;
 if(reps>1){
  const recoveryRatio=fastDistance>0&&recoveryDistance>0?recoveryDistance/(fastDistance+recoveryDistance):Math.min(.30,recoveries*.07),gapTotal=Math.min(mainW*.36,mainW*recoveryRatio),workTotal=mainW-gapTotal,workW=workTotal/reps,gapW=recoveries?gapTotal/recoveries:0;let x=mainX;
  for(let i=0;i<reps;i++){shapes+=`<rect class="profileWork" x="${x.toFixed(1)}" y="22" width="${Math.max(5,workW-2).toFixed(1)}" height="54" rx="4"/>`;x+=workW;if(i<recoveries){shapes+=`<rect class="profileRecovery" x="${x.toFixed(1)}" y="56" width="${Math.max(3,gapW-2).toFixed(1)}" height="20" rx="3"/>`;x+=gapW}}
 }else shapes+=`<rect class="profileWork" x="${mainX.toFixed(1)}" y="31" width="${mainW.toFixed(1)}" height="45" rx="5"/>`;
 const coolX=plotX+warmW+mainW;shapes+=`<rect class="profileCool" x="${coolX.toFixed(1)}" y="48" width="${coolW.toFixed(1)}" height="28" rx="4"/>`;
 const repLabel=reps>1?`${reps} repetitions`:String(p.targetScope||'Main set');
 return`<div class="todayWorkoutViz"><div class="workoutVizHeader"><span>WORKOUT STRUCTURE</span><b>${esc(p.distanceCheck||`${Number(p.distance).toFixed(1)} km total`)}</b></div><svg class="workoutProfile" viewBox="0 0 600 104" preserveAspectRatio="none" role="img" aria-label="Workout structure with ${warm.toFixed(1)} kilometre warm-up, ${esc(repLabel)}, and ${cool.toFixed(1)} kilometre cooldown"><line class="profileBaseline" x1="18" y1="77" x2="582" y2="77"/>${shapes}<text x="${(plotX+warmW/2).toFixed(1)}" y="94">WU ${warm.toFixed(1)} km</text><text class="mainLabel" x="${(mainX+mainW/2).toFixed(1)}" y="14">${esc(repLabel)}</text><text x="${(coolX+coolW/2).toFixed(1)}" y="94">CD ${cool.toFixed(1)} km</text></svg><div class="workoutVizLegend"><span><i class="warmKey"></i>Warm-up</span><span><i class="workKey"></i>Work</span>${recoveries?'<span><i class="recoveryKey"></i>Recovery</span>':''}<span><i class="coolKey"></i>Cooldown</span></div></div>`;
}
function todayActiveInjury(){
 const injury=(state.injuries||[]).find(x=>x.id===state.activeInjuryPlanId);if(!injury)return{injury:null,progress:null,day:null};
 const progress=injuryPrediction(injury),day=rehabCalendarDay(injury,progress,iso(today()),rehabPlanDayIndex(injury,iso(today())));return{injury,progress,day};
}
function todayBulletList(items,className='runnerBullets'){
 const rows=(items||[]).filter(Boolean).slice(0,5);
 return rows.length?`<ul class="${className}">${rows.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
}
function todayWorkoutCard(p,injuryDay){
 if(!p||p.type==='Rest')return`<section class="todayRunnerCard todayWorkoutCard recoveryDay">
   <div class="runnerSectionHead"><span class="runnerCardIcon">${todayPictogram('recovery')}</span><div><small>TODAY'S RUNNING PLAN</small><h3>Recovery day</h3></div><span class="runnerStatus">No run</span></div>
   ${todayBulletList(['No purposeful running session is scheduled.','Do not add catch-up mileage.','Use the day to absorb the previous training load.'])}
 </section>`;
 const z=p.zone||{},targetScope=esc(p.targetScope||'main set');
 const caution=injuryDay?['Active rehabilitation takes priority over this running prescription.','Only run if today’s rehabilitation criteria and safety rule allow it.']:null;
 return`<section class="todayRunnerCard todayWorkoutCard">
   <div class="runnerSectionHead"><span class="runnerCardIcon">${todayPictogram('shoe')}</span><div><small>${injuryDay?'RUNNING PLAN — SECONDARY':'TODAY’S RUNNING PLAN'}</small><h3>${esc(p.type)}</h3><p>${esc(p.phase||phase(currentWeek()))} · ${Number(p.distance).toFixed(1)} km</p></div></div>
   ${caution?todayBulletList(caution,'runnerBullets cautionBullets'):''}
   <div class="todayTargetGrid"><div><small>PACE</small><strong>${pace(z.pace)}</strong><span>${targetScope}</span></div><div><small>POWER</small><strong>${Number.isFinite(Number(z.power))?Math.round(z.power)+' W':'—'}</strong><span>${targetScope}</span></div><div><small>HEART RATE</small><strong>${Number.isFinite(Number(z.hr))?Math.round(z.hr)+' bpm':'—'}</strong><span>${targetScope}</span></div></div>
   <button type="button" class="workoutVizDisclosure" data-workout-toggle="${esc(p.date)}" aria-expanded="false" aria-controls="workout-details-${esc(p.date)}">
     ${todayWorkoutStructure(p)}
     <span class="workoutVizTapHint">Tap workout structure for full details</span>
   </button>
   <div class="todayWorkoutDetails" id="workout-details-${esc(p.date)}" hidden>
     <div class="todayPrescription"><div><small>WARM-UP</small><p>${esc(p.warmup||'—')}</p></div><div class="main"><small>MAIN SET / INTERVALS</small><p>${esc(p.main||'—')}</p></div><div><small>COOLDOWN</small><p>${esc(p.cooldown||'—')}</p></div></div>
     <div class="todayWorkoutNotes">${todayBulletList([p.purpose?`Why today: ${p.purpose}`:null,p.fuel?`Fuel / hydration: ${p.fuel}`:null],'runnerBullets compactBullets')}</div>
   </div>
 </section>`;
}
function todayRehabCard(active){
 const injuryDay=active?.day,injury=active?.injury,progress=active?.progress;
 if(!injuryDay||!injury)return'';
 const stage=progress?.stage!=null&&INJURY_STAGES[progress.stage]?INJURY_STAGES[progress.stage].name:'Active rehabilitation';
 const items=(injuryDay.items||[]).slice(0,4);
 const pain=Number.isFinite(Number(progress?.currentPain))?`${Number(progress.currentPain).toFixed(0)}/10 pain`:null;
 return`<section class="todayRunnerCard todayRehabCard rehabPriorityHero">
   <div class="runnerSectionHead"><span class="runnerCardIcon">${todayPictogram('rehab')}</span><div><small>ACTIVE REHABILITATION</small><h3>Rehab comes first today</h3><p>${esc(injury.bodyRegion||'Injury')} · ${esc(stage)}</p></div></div>
   <div class="rehabPrioritySummary"><strong>${esc(injuryDay.title)}</strong>${pain?`<span>${esc(pain)}</span>`:''}</div>
   ${todayBulletList(items.length?items:[injuryDay.rule],'runnerBullets rehabBullets')}
   <div class="runnerCallout"><b>Safety rule</b><span>${esc(injuryDay.rule)}</span></div>
   <button type="button" class="runnerTextButton rehabPrimaryButton" data-rehab-checkin="today">Open daily rehab check-in</button>
 </section>`;
}
function todayMiniValueClass(kind,value,context={}){
 if(kind==='score'){
   const n=Number(value); return !Number.isFinite(n)?'neutral':n>=80?'good':n>=65?'warn':'bad';
 }
 if(kind==='week'){
   const n=Number(value), expected=Number(context.expected);
   if(!Number.isFinite(n)||!Number.isFinite(expected))return'neutral';
   return n>=expected-5?'good':n>=expected-20?'warn':'bad';
 }
 if(kind==='raceTime'){
   const days=Number(value),taper=Number(state.setup.taperDays)||14;
   if(!Number.isFinite(days))return'neutral';
   return days>=taper+56?'good':days>=taper+21?'warn':'bad';
 }
 return'neutral';
}
function todayWeekCard(ast){
 const w=currentWeek(),wd=weekData(w),planned=Number(wd.planned)||0,actual=Number(wd.actual)||0,pct=planned>0?clamp(actual/planned*100,0,130):0;
 const sessions=wd.plan.filter(p=>p.type!=='Rest').length,completed=wd.plan.filter(p=>p.type!=='Rest'&&matchingRun(p)).length;
 const pathways=ast.pathways||pathwayFactorSummary(w);
 const elapsedDays=clamp(Math.floor((today()-weekStart(w))/DAY)+1,1,7),expectedPct=elapsedDays/7*100,weekClass=todayMiniValueClass('week',pct,{expected:expectedPct});
 return`<section class="todayRunnerCard todayWeekCard">
   <div class="runnerSectionHead"><span class="runnerCardIcon">${todayPictogram('week')}</span><div><small>THIS TRAINING WEEK</small><h3>Week ${w} · ${esc(detailedPhase(w))}</h3></div><span class="runnerStatus miniValue ${weekClass}">${Math.round(pct)}%</span></div>
   <div class="weekDistanceLine"><strong>${actual.toFixed(1)} km</strong><span>of ${planned.toFixed(1)} km planned</span></div>
   <div class="weekProgress"><i style="width:${Math.min(100,pct)}%"></i></div>
   <div class="weekMetrics"><span><b>${completed}/${sessions}</b><small>sessions completed</small></span><span><b>${pathways.pace.current.toFixed(3)}</b><small>Pace & Power</small></span><span><b>${pathways.load.current.toFixed(3)}</b><small>Distance & Load</small></span></div>
 </section>`;
}
function todayLatestSignalCard(){
 const ex=executionScoreSummary(),latest=ex.recent[0];
 if(!latest)return`<section class="todayRunnerCard todaySignalCard"><div class="runnerSectionHead"><span class="runnerCardIcon">${todayPictogram('signal')}</span><div><small>LATEST TRAINING SIGNAL</small><h3>Evidence building</h3></div></div>${todayBulletList(['Log or import a completed run to populate execution and training-response signals.'])}</section>`;
 const trend=Number.isFinite(ex.trend)?`${ex.trend>=0?'↑':'↓'} ${Math.abs(ex.trend).toFixed(0)} pts`:'Building';
 const m=metrics(latest.run),eff=Number.isFinite(m.efficiencyJ)?`${m.efficiencyJ.toFixed(1)} J/beat`:'—',drift=Number.isFinite(latest.drift)?`${latest.drift.toFixed(1)}%`:'—';
 return`<section class="todayRunnerCard todaySignalCard">
   <div class="runnerSectionHead"><span class="runnerCardIcon">${todayPictogram('signal')}</span><div><small>LATEST TRAINING SIGNAL</small><h3>${esc(latest.type)}</h3><p>${fmtDate(latest.date)}</p></div><span class="scoreBadge miniValue ${todayMiniValueClass('score',latest.score)}">${Math.round(latest.score)}/100</span></div>
   <div class="signalMetrics"><span><small>EXECUTION TREND</small><b>${trend}</b></span><span><small>EFFICIENCY</small><b>${eff}</b></span><span><small>CARDIAC DRIFT</small><b>${drift}</b></span></div>
 </section>`;
}
function todayRaceCard(engine,report){
 const remaining=raceTimeRemaining(),prob=engine.currentModel.provisional?null:Math.round(engine.currentModel.probability),gap=engine.pred-state.setup.targetTime;
 const rangeLow=engine.currentModel.rangeLow,rangeHigh=engine.currentModel.rangeHigh,provisional=engine.currentModel.provisional;
 const timeRange=`${fmtEstimate(rangeLow,provisional)}–${fmtEstimate(rangeHigh,provisional)}`;
 const paceRange=`${paceEstimate(rangeLow,provisional)}–${paceEstimate(rangeHigh,provisional)}`;
 return`<section class="todayRunnerCard todayRaceCard">
   <div class="runnerSectionHead"><span class="runnerCardIcon">${todayPictogram('race')}</span><div><small>RACE CONTEXT</small><h3>${esc(state.setup.raceName)}</h3><p>${Number(state.setup.raceDistance).toFixed(1)} km · ${esc(report.race.phase)} phase</p></div><span class="runnerStatus miniValue ${todayMiniValueClass('raceTime',remaining.days)}">${remaining.label}</span></div>
   <div class="raceMetrics"><span><small>TARGET</small><b>${fmtTime(state.setup.targetTime)}</b></span><span><small>CURRENT ESTIMATE</small><b>${fmtEstimate(engine.pred,provisional)}</b></span><span><small>TARGET CHANCE</small><b>${prob===null?'Building':prob+'%'}</b></span></div>
   <div class="raceRangeStrip"><div><small>LIKELY 70% TIME RANGE</small><b>${timeRange}</b></div><div><small>LIKELY 70% PACE RANGE</small><b>${paceRange}</b></div></div>
   ${todayBulletList([gap<=0?`${fmtTime(Math.abs(gap))} inside current target estimate`:`${fmtTime(gap)} outside current target estimate`,report.race.priority],'runnerBullets compactBullets')}
 </section>`;
}
function todayRehabStatusSummary(active){
 const progress=active?.progress;
 if(!progress||!progress.fullDate)return null;
 const remaining=Number(progress.remaining);
 const confidence=progress.confidence||'';
 return{
   date:fmtDate(progress.fullDate),
   detail:Number.isFinite(remaining)
     ?`${Math.round(remaining)} day${Math.round(remaining)===1?'':'s'} estimated${confidence?` · ${confidence} confidence`:''}`
     :(confidence?`${confidence} confidence`:'Current rehabilitation estimate')
 };
}

function todayReadinessExplanation(ready){
 const reasons=[];
 const hrvDelta=Math.round((Number(ready.hrvAdj)||0)*100);
 const painDelta=Math.round((Number(ready.painAdj?.adjustment)||0)*100);
 const painMax=Number(ready.pain?.max);
 if(hrvDelta<0){
   const h=ready.hrv;
   if(Number.isFinite(h?.rolling)&&Number.isFinite(h?.baseline))
     reasons.push(`HRV ${Math.round(h.rolling)} vs ${Math.round(h.baseline)} ms`);
   else reasons.push('HRV below personal baseline');
 }
 if(painDelta<0||painMax>=3){
   reasons.push(Number.isFinite(painMax)?`Pain ${painMax.toFixed(0)}/10`:'Pain signal elevated');
 }
 const reduction=Math.round((1-ready.modifier)*100);
 if(reasons.length){
   return `${reasons.join(' + ')}${reduction>0?` · load reduced ${reduction}%`:''}`;
 }
 if(ready.hrv?.ready&&Number.isFinite(ready.hrv?.rolling)&&Number.isFinite(ready.hrv?.baseline)){
   return `HRV ${Math.round(ready.hrv.rolling)} / ${Math.round(ready.hrv.baseline)} ms · no recovery reduction`;
 }
 return `No recovery restriction · load ×${ready.modifier.toFixed(3)}`;
}
function consolidatedTodayCoachBriefing(p){
 const engine=coachEngine(),report=evidenceBasedCoach(engine),ast=report.athleteState,ready=readinessModel(),active=todayActiveInjury(),injuryDay=active.day,rehabSummary=todayRehabStatusSummary(active);
 const evidence=Math.round(clamp(Number(report.evidenceCoverage)||0,0,100)),remaining=raceTimeRemaining(),hrv=ready.hrv,pain=ready.pain;
 const readinessDetail=todayReadinessExplanation(ready);
 const painValue=Number.isFinite(Number(pain.max))?`${Number(pain.max).toFixed(0)}/10`:'—';
 const painText=active.injury?`${active.injury.bodyRegion||'Active injury'} · ${pain.status}${Number.isFinite(Number(pain.max))?' · highest recent pain':''}`:`${pain.status}${Number.isFinite(Number(pain.max))?' · highest recent pain':''}`;
 const modeTitle=injuryDay&&rehabSummary?rehabSummary.date:p&&p.type!=='Rest'?p.type:'Recovery';
 const modeText=injuryDay&&rehabSummary?`Normal running estimate · ${rehabSummary.detail}`:p&&p.type!=='Rest'?`${Number(p.distance).toFixed(1)} km · ${p.purpose||'Complete as prescribed'}`:'No run scheduled · recovery is today’s training';
 let priorityTitle,priorityBullets;
 if(injuryDay){
   priorityTitle='Complete rehabilitation before considering the run plan';
   priorityBullets=[
     `${injuryDay.title} is today’s primary training task.`,
     injuryDay.rule,
     p&&p.type!=='Rest'?`${p.type} should only be completed if rehabilitation criteria allow it.`:null
   ];
 }else if(p&&p.type!=='Rest'){
   priorityTitle=`Execute ${p.type} as prescribed`;
   priorityBullets=[
     p.purpose||'Deliver the intended training stimulus without adding unplanned load.',
     `Target ${Number(p.distance).toFixed(1)} km and stay inside the prescribed pace/power/HR guidance.`,
     ready.label!=='Normal'?`Readiness is ${ready.label.toLowerCase()}; respect the temporary recovery modifier.`:null
   ];
 }else{
   priorityTitle='Recover deliberately';
   priorityBullets=[
     'No purposeful running session is scheduled today.',
     'Do not add catch-up mileage.',
     'Protect the next scheduled training exposure.'
   ];
 }
 return`<section class="todayBriefingCard seriousBriefing runnerFullWidth">
   <div class="briefingHeaderRow">
     <div class="briefingTitle">
       <span class="briefingIcon">${coachVisualIcon('briefing')}</span>
       <div>
         <small>DAILY DECISION</small>
         <h3>Coach Briefing</h3>
         <p class="briefingPhase"><b>${esc(report.race.phase)} phase · ${esc(report.race.priority)}</b><span>${remaining.label} to ${esc(state.setup.raceName)}</span></p>
       </div>
     </div>
     <div class="briefingGauges">
       <div class="evidenceCompleteness" style="--evidence:${evidence}">
         <div class="evidenceRing"><strong>${evidence}</strong><span>%</span></div>
         <small>Evidence completeness</small>
       </div>
     </div>
   </div>
   <div class="briefingDecision">
     <small>TODAY'S PRIORITY</small>
     <strong>${esc(priorityTitle)}</strong>
     ${todayBulletList(priorityBullets,'runnerBullets priorityBullets')}
   </div>
 </section>
 <div class="todayStatusGrid seriousStatusGrid">
   <article class="todayStatusCard training"><h4>${injuryDay?'ACTIVE REHAB':'TODAY’S FOCUS'}</h4><div class="statusRing">${todayPictogram(injuryDay?'rehab':p&&p.type!=='Rest'?'training':'recovery')}</div><div class="statusCopy"><strong>${esc(modeTitle)}</strong><p>${esc(modeText)}</p></div></article>
   <article class="todayStatusCard ${ready.label==='Normal'?'good':ready.label==='Restricted'?'caution':'neutral'}"><h4>READINESS</h4><div class="statusRing">${todayPictogram('readiness')}</div><div class="statusCopy"><strong>${esc(ready.label)}</strong><p>${esc(readinessDetail)}</p></div></article>
   <article class="todayStatusCard ${Number(pain.max)>=3?'caution':'good'}"><h4>PAIN / INJURY</h4><div class="statusRing">${todayPictogram('pain')}</div><div class="statusCopy"><strong>${painValue}</strong><p>${esc(painText)}</p></div></article>
 </div>
 ${todayRehabCard(active)}
 ${todayWorkoutCard(p,injuryDay)}
 ${todayWeekCard(ast)}
 ${todayLatestSignalCard()}
 ${todayRaceCard(engine,report)}`;
}
function dailyCoachFocus(){return''}
function renderToday(){
 const p=state.plan.find(x=>x.date===iso(today()));
 $('todayDate').textContent=today().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 $('todayCard').innerHTML=consolidatedTodayCoachBriefing(p);$('todayCoach').innerHTML='';
 document.querySelectorAll('#today [data-workout-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
   const details=document.getElementById(`workout-details-${btn.dataset.workoutToggle}`);
   if(!details)return;
   const opening=details.hidden;details.hidden=!opening;
   btn.setAttribute('aria-expanded',opening?'true':'false');
 }));
 document.querySelectorAll('#today [data-rehab-checkin]').forEach(btn=>btn.addEventListener('click',()=>{
   const injury=(state.injuries||[]).find(x=>x.id===state.activeInjuryPlanId);
   if(injury)openInjuryCheck(injury);
   else showPage('injury');
 }));
 document.querySelectorAll('#today [data-go]').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.go)));
}

function weeklyReviewData(w=currentWeek()){
 w=clamp(Number(w)||currentWeek(),1,weeks());
 const start=weekStart(w),end=new Date(start.getTime()+7*DAY-1),closed=end<today(),wd=weekData(w);
 const appliedPace=pacePowerCommittedFactor(iso(start)),provisionalPace=trainingEvidence(iso(Math.min(end,today()))).adjustment;
 const appliedLoad=adaptiveFactorDetails(w),previewLoad=provisionalWeeklyAdjustment(w);
 const scores=wd.runs.map(r=>workoutScore(r)).filter(Number.isFinite),avgScore=avg(scores),drift=avg(wd.runs.map(r=>Number(r.powerDrift)).filter(Number.isFinite));
 const painVals=wd.runs.map(r=>Number(r.pain)).filter(Number.isFinite),maxPain=painVals.length?Math.max(...painVals):null,completion=wd.planned>0?wd.actual/wd.planned:null;
 const nextWeek=Math.min(weeks(),w+1),nextPlan=state.plan.filter(p=>p.week===nextWeek&&!['Rest','Race Day'].includes(p.type)).slice(0,6);
 const paceRatio=appliedPace>0?provisionalPace/appliedPace:1,loadApplied=Number(appliedLoad.cumulativeFactor||1),loadProjected=Number(previewLoad.cumulativeFactor||loadApplied),loadRatio=loadApplied>0?loadProjected/loadApplied:1;
 const changes=nextPlan.map(p=>{const z=zone(p.type,p.date);return{date:p.date,type:p.type,distance:Number(p.distance),nextDistance:Number(p.distance)*loadRatio,pace:z.pace,nextPace:z.pace/Math.max(.8,paceRatio),power:z.power,nextPower:z.power*paceRatio}});
 const reasons=[];
 if(Number.isFinite(completion))reasons.push(`${Math.round(completion*100)}% of planned weekly distance completed.`);
 if(Number.isFinite(avgScore))reasons.push(`Workout execution averaged ${Math.round(avgScore)}/100 across ${scores.length} scored session${scores.length===1?'':'s'}.`);
 if(Number.isFinite(drift))reasons.push(`Average power-based cardiac drift was ${drift.toFixed(1)}%.`);
 if(Number.isFinite(maxPain))reasons.push(`Highest recorded run pain was ${maxPain}/10.`);
 return{week:w,closed,completion,avgScore,drift,maxPain,reasons,changes,paceChange:paceRatio-1,loadChange:loadRatio-1,readiness:readinessModel().modifier};
}
function weeklyReviewHtml(w=currentWeek()){
 const r=weeklyReviewData(w),status=r.closed?'WEEKLY REVIEW COMPLETE':'PROVISIONAL WEEKLY REVIEW';
 const paceLabel=Math.abs(r.paceChange)<.001?'Targets currently held':r.paceChange>0?'Slight performance progression':'Slightly more conservative targets';
 const loadLabel=Math.abs(r.loadChange)<.001?'Volume currently held':r.loadChange>0?'Slight load progression':'Slight load reduction';
 const rows=r.changes.map(x=>{const dc=Math.abs(x.nextDistance-x.distance)>=.05,pc=Math.abs(x.nextPace-x.pace)>=.5,pw=Math.abs(x.nextPower-x.power)>=1;if(!dc&&!pc&&!pw)return'';return`<div class="weeklyReviewChange"><div><b>${fmtDate(x.date)} · ${esc(x.type)}</b></div><span>${dc?`${x.distance.toFixed(1)} → ${x.nextDistance.toFixed(1)} km`:`${x.distance.toFixed(1)} km · held`}</span><span>${pc?`${pace(x.pace)} → ${pace(x.nextPace)}`:`${pace(x.pace)} · held`}</span><span>${pw?`${Math.round(x.power)} → ${Math.round(x.nextPower)} W`:`${Math.round(x.power)} W · held`}</span></div>`}).filter(Boolean).join('');
 const readyLabel=r.readiness>=.995?'Normal readiness':r.readiness>=.96?'Slightly reduced readiness':'Reduced readiness';
 return`<section class="weeklyReviewCard ${r.closed?'complete':'provisional'} planEffectReview uiLevel1"><div class="weeklyReviewHead"><div><small>${status}</small><h3>Week ${r.week} plan adaptation</h3></div><span>${r.closed?'Applied':'Building'}</span></div>
 <div class="planEffectSummary"><article><small>PERFORMANCE PRESCRIPTION</small><strong>${paceLabel}</strong><p>${Math.abs(r.paceChange)<.001?'No meaningful pace/power change is projected.':`Future quality targets are projected to change by about ${Math.abs(r.paceChange*100).toFixed(1)}%.`}</p></article><article><small>TRAINING LOAD</small><strong>${loadLabel}</strong><p>${Math.abs(r.loadChange)<.001?'No meaningful distance/load change is projected.':`Future session distance is projected to change by about ${Math.abs(r.loadChange*100).toFixed(1)}%.`}</p></article><article><small>RECOVERY CONTEXT</small><strong>${readyLabel}</strong><p>Temporary recovery context can moderate exposure without changing learned capability.</p></article></div>

 <details><summary>Show projected workout changes</summary><div class="weeklyReviewChanges">${rows||'<p class="muted">No material prescription changes are currently projected.</p>'}</div></details></section>`;
}
function renderPlan(){
 
 if(!state.weekView)state.weekView=currentWeek();let arr=state.plan.filter(p=>p.week===state.weekView),wd=weekData(state.weekView),weekPct=wd.planned>0?clamp(wd.actual/wd.planned*100,0,100):0;$('weekHeader').innerHTML=`<div class="weekHeroLine"><div><small>WEEK ${state.weekView}</small><b>${detailedPhase(state.weekView)}</b><span>${fmtDate(iso(weekStart(state.weekView)))}</span></div><strong>${Math.round(weekPct)}%</strong></div><div class="weekMetricRow"><span><b>${wd.planned.toFixed(1)} km</b><small>Planned</small></span><span><b>${wd.actual.toFixed(1)} km</b><small>Completed</small></span><span><b>${Math.max(0,wd.planned-wd.actual).toFixed(1)} km</b><small>Remaining</small></span></div><div class="brandProgress"><i style="width:${weekPct}%"></i></div>`;
 if($('weeklyReview'))$('weeklyReview').innerHTML=weeklyReviewHtml(state.weekView);
$('planCards').innerHTML=arr.map(workoutHtml).join('');
 const nextWeek=Math.min(weeks(),currentWeek()+1);
 const nextWeekPlan=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day'&&p.week===nextWeek);
 const completedRuns=state.runs.filter(r=>Number(r.distanceKm)>0&&dte(r.date)<=today());
 const entirePlan=state.plan.filter(p=>p.type!=='Rest'&&p.type!=='Race Day');
 if($('nextWeekMixChart'))$('nextWeekMixChart').innerHTML=intensityMixHtml(nextWeekPlan,'distance','No sessions planned next week');
 if($('completedMixChart'))$('completedMixChart').innerHTML=intensityMixHtml(completedRuns,'distanceKm','No completed runs yet');
 if($('overallMixChart'))$('overallMixChart').innerHTML=intensityMixHtml(entirePlan,'distance','No plan volume');
}
function streamAnalysis(records){
 let valid=records.filter(r=>Number.isFinite(r.t)&&r.hr>40&&(r.power>0||r.speed>0)).sort((a,b)=>a.t-b.t);
 if(valid.length<180)return null;
 // Remove obvious pauses and implausible samples.
 valid=valid.filter(r=>(!r.speed||r.speed>.5)&&(!r.power||r.power<1000)&&r.hr<230);
 if(valid.length<180)return null;
 let start=valid[0].t,end=valid.at(-1).t,total=end-start;
 if(total<1800)return null;
 let warmup=Math.min(900,Math.max(300,total*.15));
 valid=valid.filter(r=>r.t>=start+warmup);
 if(valid.length<150)return null;
 let mid=(valid[0].t+valid.at(-1).t)/2,a=valid.filter(r=>r.t<=mid),b=valid.filter(r=>r.t>mid);
 if(a.length<60||b.length<60)return null;
 const mean=(arr,key)=>avg(arr.map(x=>x[key]).filter(v=>Number.isFinite(v)&&v>0));
 let h1=mean(a,'hr'),h2=mean(b,'hr'),p1=mean(a,'power'),p2=mean(b,'power'),v1=mean(a,'speed'),v2=mean(b,'speed');
 let powerDrift=p1&&p2&&h1&&h2?((h2/p2)/(h1/p1)-1)*100:null;
 let paceDrift=v1&&v2&&h1&&h2?(1-(v2/h2)/(v1/h1))*100:null;
 let drift=powerDrift;
 if(!Number.isFinite(drift))return null;
 return{
   drift,powerDrift,paceDrift,firstHr:h1,secondHr:h2,firstPower:p1,secondPower:p2,
   firstSpeed:v1,secondSpeed:v2,recordCount:valid.length,analysisDuration:valid.at(-1).t-valid[0].t,
   reliability:valid.length>=1200?'High':valid.length>=600?'Medium':'Low'
 };
}
function parseCSV(t){let rows=[],r=[],f='',q=false;for(let i=0;i<t.length;i++){let c=t[i],n=t[i+1];if(c=='"'&&q&&n=='"'){f+='"';i++}else if(c=='"')q=!q;else if(c==','&&!q){r.push(f);f=''}else if((c=='\n'||c=='\r')&&!q){if(c=='\r'&&n=='\n')i++;r.push(f);if(r.some(x=>x))rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows}
function summariseCSV(rows){
 let rawHeaders=rows[0].map(x=>String(x).trim()),norm=x=>String(x).trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');
 let headers=rawHeaders.map(norm),data=rows.slice(1).filter(r=>r.some(x=>String(x).trim()!==''));
 const findExact=(names)=>{
   let variants=names.map(norm);
   for(let n of variants){let exact=headers.indexOf(n);if(exact>=0)return exact}
   return -1;
 };
 const find=(names)=>{
   let exact=findExact(names);if(exact>=0)return exact;
   let variants=names.map(norm);
   for(let n of variants){let fuzzy=headers.findIndex(h=>h.includes(n)||n.includes(h));if(fuzzy>=0)return fuzzy}
   return -1;
 };
 const indexMap={
   timestamp:find(['Timestamp','Time','Date Time','datetime']),
   hr:find(['Heart Rate (bpm)','Heart Rate','heartrate']),
   watchSpeed:find(['Watch Speed (m/s)','Speed (m/s)','speed']),
   strydSpeed:find(['Stryd Speed (m/s)']),
   powerW:findExact(['Power (W)','Power (Watts)','Watts','Average Power (W)']),
   powerKg:findExact(['Power (w/kg)','Power W/kg','W/kg']),
   watchDistance:find(['Watch Distance (meters)','Distance (meters)','distance']),
   strydDistance:find(['Stryd Distance (meters)']),
   cadence:find(['Cadence (spm)','Cadence']),
   gct:find(['Ground Time (ms)','Ground Contact Time (ms)']),
   vo:find(['Vertical Oscillation (cm)','Vertical Oscillation'])
 };
 const number=(r,i)=>{
   if(i<0)return null;
   let x=String(r[i]??'').trim().replace(',','.');
   let v=Number(x);return Number.isFinite(v)?v:null;
 };
 const timestamp=(r)=>{
   let raw=r[indexMap.timestamp];
   let numeric=Number(raw);
   if(Number.isFinite(numeric))return numeric;
   let parsed=Date.parse(raw);
   return Number.isFinite(parsed)?parsed:null;
 };
 if(indexMap.timestamp<0)throw Error('No timestamp column was found in this CSV.');
 let records=data.map(r=>{
   let watts=number(r,indexMap.powerW),wkg=number(r,indexMap.powerKg);
   // Stryd exports may contain either watts or W/kg. Values below 20 in a
   // purported watts column are almost certainly W/kg and are converted.
   if(Number.isFinite(watts)&&watts>0&&watts<20&&!Number.isFinite(wkg))wkg=watts,watts=null;
   let resolvedPower=Number.isFinite(watts)&&watts>0?watts:(Number.isFinite(wkg)&&wkg>0?wkg*state.setup.bodyWeight:null);
   return{
     t:timestamp(r),
     hr:number(r,indexMap.hr),
     speed:number(r,indexMap.watchSpeed)||number(r,indexMap.strydSpeed),
     power:resolvedPower,
     distance:number(r,indexMap.watchDistance)||number(r,indexMap.strydDistance)
   }
 }).filter(r=>Number.isFinite(r.t));
 if(records.length<2)throw Error('Too few valid timestamped records were found in the CSV.');
 let maxTs=Math.max(...records.map(r=>r.t)),scale=maxTs>1e12?1000:1;
 records.forEach(r=>r.t/=scale);
 let distanceRecords=records.map(r=>r.distance).filter(Number.isFinite);
 let dist=distanceRecords.length?Math.max(...distanceRecords)/1000:null;
 let duration=records.at(-1).t-records[0].t;
 if(!Number.isFinite(dist)||dist<=0||!Number.isFinite(duration)||duration<=0)throw Error('The CSV does not contain valid cumulative distance and duration.');
 const positive=key=>avg(records.map(r=>r[key]).filter(v=>Number.isFinite(v)&&v>0));
 let analysis=streamAnalysis(records);
 let originalStart=records[0].t;
 return{
   id:'stryd-'+Math.round(originalStart)+'-'+Math.round(dist*1000),
   date:iso(new Date(originalStart*1000)),type:'Easy',distanceKm:dist,durationSec:duration,
   avgHr:Number.isFinite(positive('hr'))?Math.round(positive('hr')):null,
   avgPower:Number.isFinite(positive('power'))?Math.round(positive('power')):null,
   cadence:indexMap.cadence>=0?Math.round(avg(data.map(r=>number(r,indexMap.cadence)).filter(v=>Number.isFinite(v)&&v>0))||0)||null:null,
   gct:indexMap.gct>=0?Math.round(avg(data.map(r=>number(r,indexMap.gct)).filter(v=>Number.isFinite(v)&&v>0))||0)||null:null,
   vo:indexMap.vo>=0?Number((avg(data.map(r=>number(r,indexMap.vo)).filter(v=>Number.isFinite(v)&&v>0))||0).toFixed(1))||null:null,
   rpe:null,pain:null,recovery:null,temperature:null,notes:'Imported from Stryd CSV',
   drift:null,powerDrift:null,paceDrift:null,
   candidateDrift:analysis?.drift??null,candidatePowerDrift:analysis?.powerDrift??null,candidatePaceDrift:analysis?.paceDrift??null,
   candidateStreamEvidence:analysis,streamEvidence:null,sourceFormat:'csv-timeseries'
 };
}


const FIT_SDK_URL='https://cdn.jsdelivr.net/npm/@garmin/fitsdk@21.208.0/src/index.js';
let fitSdkPromise=null;
async function loadFitSdk(){
 if(!fitSdkPromise)fitSdkPromise=import(FIT_SDK_URL).catch(err=>{fitSdkPromise=null;throw new Error('The Garmin FIT decoder could not be loaded. Check your internet connection and try again.');});
 return fitSdkPromise;
}
function fitArray(messages,names){
 for(const name of names){const value=messages?.[name];if(Array.isArray(value))return value;if(value&&typeof value==='object')return [value]}
 return [];
}
function fitDateValue(value){
 if(value instanceof Date)return value;
 if(typeof value==='string'||typeof value==='number'){const d=new Date(value);if(!Number.isNaN(d.getTime()))return d}
 return null;
}
function fitNumber(obj,names){
 for(const name of names){const value=obj?.[name];const n=Number(value);if(Number.isFinite(n))return n}
 return null;
}
function fitNumericValues(value,depth=0){
 if(depth>4||value==null)return[];
 if(typeof value==='number')return Number.isFinite(value)?[value]:[];
 if(typeof value==='string'){const n=Number(value);return Number.isFinite(n)?[n]:[]}
 if(Array.isArray(value))return value.flatMap(v=>fitNumericValues(v,depth+1));
 if(typeof value==='object'){
   const preferred=['value','values','fieldValue','rawValue','scaledValue','data'];
   let out=[];
   for(const key of preferred)if(Object.prototype.hasOwnProperty.call(value,key))out.push(...fitNumericValues(value[key],depth+1));
   if(out.length)return out;
   for(const v of Object.values(value))out.push(...fitNumericValues(v,depth+1));
   return out;
 }
 return[];
}
function fitPowerCandidates(obj,path='',depth=0,out=[]){
 if(depth>5||obj==null)return out;
 if(Array.isArray(obj)){obj.forEach((v,i)=>fitPowerCandidates(v,`${path}[${i}]`,depth+1,out));return out}
 if(typeof obj!=='object')return out;
 for(const [key,value] of Object.entries(obj)){
   const next=path?`${path}.${key}`:key;
   const descriptor=typeof value==='object'&&value?`${next} ${value.name||value.fieldName||value.field_name||''} ${value.units||value.unit||''}`:next;
   const norm=descriptor.toLowerCase().replace(/[_-]+/g,' ');
   if(/power|watt/.test(norm)&&!/balance|phase|zone|form power|air power|leg spring|stiffness|ratio|percent|platform center offset|left right/.test(norm)){
     for(const n of fitNumericValues(value))if(n>0&&n<3000){
       let score=30;
       if(/(^|[. ])power($|[. ])/i.test(norm))score=100;
       if(/running power|stryd power|power watts|watts power/i.test(norm))score=120;
       if(/avg power|average power/i.test(norm))score=90;
       if(/developer|field/i.test(norm))score+=5;
       out.push({value:n,path:next,label:descriptor.trim(),score});
     }
   }
   if(typeof value==='object')fitPowerCandidates(value,next,depth+1,out);
 }
 return out;
}
function fitDeveloperFieldMap(messages){
 const descriptions=fitArray(messages,['fieldDescriptionMesgs','fieldDescriptionMesg','fieldDescriptions']);
 const map=new Map();
 for(const d of descriptions){
   const dev=fitNumber(d,['developerDataIndex','developer_data_index']);
   const num=fitNumber(d,['fieldDefinitionNumber','field_definition_number','fieldDefNumber','fieldNumber']);
   if(!Number.isFinite(dev)||!Number.isFinite(num))continue;
   const name=String(d.fieldName||d.field_name||d.name||'').trim();
   const units=String(d.units||d.unit||'').trim();
   const scale=fitNumber(d,['scale']);
   const offset=fitNumber(d,['offset']);
   map.set(`${dev}:${num}`,{name,units,scale:Number.isFinite(scale)&&scale!==0?scale:null,offset:Number.isFinite(offset)?offset:0});
 }
 return map;
}
function fitDeveloperEntries(value,path='',depth=0,out=[]){
 if(depth>7||value==null)return out;
 if(Array.isArray(value)){value.forEach((v,i)=>fitDeveloperEntries(v,`${path}[${i}]`,depth+1,out));return out}
 if(typeof value!=='object')return out;
 const dev=fitNumber(value,['developerDataIndex','developer_data_index','developerIndex','developer_index']);
 const num=fitNumber(value,['fieldDefinitionNumber','field_definition_number','fieldDefNumber','fieldNumber','field_number']);
 if(Number.isFinite(dev)&&Number.isFinite(num)){
   const rawCandidates=['value','fieldValue','field_value','rawValue','raw_value','scaledValue','scaled_value','data'];
   for(const key of rawCandidates){
     if(Object.prototype.hasOwnProperty.call(value,key)){
       const vals=fitNumericValues(value[key]);
       if(vals.length)out.push({dev,num,value:vals[0],path});
     }
   }
 }
 for(const [k,v] of Object.entries(value))if(typeof v==='object')fitDeveloperEntries(v,path?`${path}.${k}`:k,depth+1,out);
 return out;
}
function normalizeDeveloperValue(raw,description){
 let value=Number(raw);
 if(!Number.isFinite(value))return null;
 if(description?.scale)value=value/description.scale;
 if(description?.offset)value-=description.offset||0;
 return value;
}
function findFitPower(record,developerMap=null,diagnostics=null){
 const directNames=['power','Power','enhancedPower','enhanced_power','nativePower','runningPower','running_power','avgPower','averagePower'];
 const direct=fitNumber(record,directNames);
 if(Number.isFinite(direct)&&direct>0){if(diagnostics)diagnostics.add('native power');return direct}
 const candidates=fitPowerCandidates(record).sort((a,b)=>b.score-a.score);
 if(candidates.length){if(diagnostics)diagnostics.add(candidates[0].label||candidates[0].path);return candidates[0].value}
 if(developerMap?.size){
   const matches=[];
   for(const entry of fitDeveloperEntries(record)){
     const description=developerMap.get(`${entry.dev}:${entry.num}`);
     if(!description)continue;
     const name=String(description.name||'').trim().toLowerCase().replace(/[_-]+/g,' ');
     const units=String(description.units||'').trim().toLowerCase();
     if(name!=='power'&&!/^(running|stryd) power$/.test(name))continue;
     if(/form|air|lap|balance|phase|ratio|spring|stiffness/.test(name))continue;
     const value=normalizeDeveloperValue(entry.value,description);
     if(Number.isFinite(value)&&value>0&&value<3000)matches.push({value,name,units,path:entry.path});
   }
   if(matches.length){if(diagnostics)diagnostics.add(matches[0].name||'Stryd Power');return matches[0].value}
 }
 return null;
}
function fitDistanceMeters(value){
 const n=Number(value);if(!Number.isFinite(n)||n<=0)return null;
 return n;
}
function rawFitStrydRunningPower(bytes){
 try{
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||[]);
  if(data.length<12||String.fromCharCode(...data.slice(8,12))!=='.FIT')return null;
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  const headerSize=data[0],dataSize=view.getUint32(4,true),end=Math.min(data.length,headerSize+dataSize);
  const definitions=new Map(),descriptions=new Map(),recordSamples=[];
  const baseSize={0:1,1:1,2:1,3:2,4:2,5:4,6:4,7:1,8:4,9:8,10:1,11:2,12:4,13:1,14:8,15:8,16:8};
  const typeId=t=>Number(t)&31;
  const numeric=(pos,size,type,little)=>{
   const t=typeId(type);if(pos<0||pos+size>data.length)return null;
   try{
    if(t===0||t===2||t===10||t===13)return view.getUint8(pos);
    if(t===1)return view.getInt8(pos);
    if(t===3)return view.getInt16(pos,little);
    if(t===4||t===11)return view.getUint16(pos,little);
    if(t===5)return view.getInt32(pos,little);
    if(t===6||t===12)return view.getUint32(pos,little);
    if(t===8)return view.getFloat32(pos,little);
    if(t===9)return view.getFloat64(pos,little);
   }catch(e){}return null;
  };
  const fieldValue=(pos,size,type,little)=>{
   const t=typeId(type);
   if(t===7){let out='';for(let i=0;i<size&&pos+i<data.length;i++){const c=data[pos+i];if(!c)break;out+=String.fromCharCode(c)}return out.trim()}
   const unit=baseSize[t]||size;if(size===unit)return numeric(pos,size,type,little);
   const out=[];for(let off=0;off+unit<=size;off+=unit)out.push(numeric(pos+off,unit,type,little));return out;
  };
  let pos=headerSize;
  while(pos<end){
   const header=data[pos++];let local,isDefinition=false,hasDeveloper=false;
   if(header&128)local=(header>>5)&3;
   else{local=header&15;isDefinition=!!(header&64);hasDeveloper=!!(header&32)}
   if(isDefinition){
    if(pos+5>end)break;pos++;const little=data[pos++]===0;const global=view.getUint16(pos,little);pos+=2;
    const count=data[pos++],fields=[];for(let i=0;i<count;i++){if(pos+3>end)return null;fields.push({number:data[pos],size:data[pos+1],type:data[pos+2]});pos+=3}
    const developer=[];if(hasDeveloper){if(pos>=end)return null;const n=data[pos++];for(let i=0;i<n;i++){if(pos+3>end)return null;developer.push({number:data[pos],size:data[pos+1],index:data[pos+2]});pos+=3}}
    definitions.set(local,{global,little,fields,developer});continue;
   }
   const def=definitions.get(local);if(!def)break;
   const values={};
   for(const f of def.fields){if(pos+f.size>end)return null;values[f.number]=fieldValue(pos,f.size,f.type,def.little);pos+=f.size}
   const developerValues=[];
   for(const f of def.developer){if(pos+f.size>end)return null;developerValues.push({...f,pos,little:def.little});pos+=f.size}
   if(def.global===206){
    const idx=Number(values[0]),number=Number(values[1]);
    if(Number.isFinite(idx)&&Number.isFinite(number))descriptions.set(`${idx}:${number}`,{
     name:String(values[3]||'').trim(),baseType:Number(values[2]),scale:Number(values[6])||1,offset:Number(values[7])||0,units:String(values[8]||'').trim()
    });
   }
   if(def.global===20){
    // FIT Record native field 7 = Power in watts.
    let recordPower=Number(values[7]);
    if(!(recordPower>0&&recordPower<3000))recordPower=null;
    let source=recordPower?'native Record.power':null;
    // Developer Stryd Power overrides native only when it is valid and explicitly identified.
    for(const f of developerValues){
     const description=descriptions.get(`${f.index}:${f.number}`);if(!description)continue;
     const name=String(description.name||'').toLowerCase().replace(/[_-]+/g,' ').trim(),units=String(description.units||'').toLowerCase();
     const looksPower=(/power|watt/.test(name)||/watt/.test(units))&&!/form|air|lap|balance|phase|ratio|spring|stiffness|percent/.test(name);
     if(!looksPower)continue;
     let raw=fieldValue(f.pos,f.size,description.baseType,f.little);if(Array.isArray(raw))raw=raw[0];
     let value=Number(raw);if(!Number.isFinite(value))continue;value=value/(description.scale||1)-(description.offset||0);
     if(value>0&&value<3000){recordPower=value;source=`developer ${description.name||'Power'}`;break}
    }
    recordSamples.push({power:recordPower,source});
   }
  }
  const valid=recordSamples.map(x=>Number(x.power)).filter(v=>Number.isFinite(v)&&v>0);
  if(!valid.length)return{average:null,count:0,min:null,max:null,samples:[],recordSamples,recordCount:recordSamples.length,source:'FIT record power'};
  const sources=[...new Set(recordSamples.map(x=>x.source).filter(Boolean))];
  return{average:valid.reduce((sum,v)=>sum+v,0)/valid.length,count:valid.length,min:Math.min(...valid),max:Math.max(...valid),samples:valid.slice(),recordSamples,recordCount:recordSamples.length,source:sources.join(' + ')||'FIT record power'};
 }catch(e){return null}
}
function attachRawStrydPowerToRecords(records,raw){
 if(!Array.isArray(records)||!records.length||!raw)return{records,mapped:0,method:null,coverage:0};
 const existing=records.filter(r=>Number(r.power)>0).length;
 // Exact low-level FIT record alignment is preferred because it preserves timing.
 if(Array.isArray(raw.recordSamples)&&raw.recordSamples.length===records.length){
   let mapped=0;
   records.forEach((r,i)=>{
     if(Number(r.power)>0){mapped++;return}
     const v=Number(raw.recordSamples[i]?.power);
     if(Number.isFinite(v)&&v>0){r.power=v;mapped++}
   });
   return{records,mapped,method:`raw FIT record alignment (${raw.count}/${raw.recordCount} records contain power)`,coverage:mapped/records.length};
 }
 if(existing>=Math.max(3,records.length*.5))return{records,mapped:existing,method:'decoded FIT record power',coverage:existing/records.length};
 const samples=(raw.samples||[]).filter(v=>Number.isFinite(Number(v))&&Number(v)>0).map(Number);
 if(!samples.length)return{records,mapped:existing,method:null,coverage:existing/records.length};
 let mapped=existing;
 records.forEach((r,i)=>{
   if(Number(r.power)>0)return;
   const j=records.length===1?0:Math.round(i*(samples.length-1)/(records.length-1)),v=samples[clamp(j,0,samples.length-1)];
   if(Number.isFinite(v)&&v>0){r.power=v;mapped++}
 });
 return{records,mapped,method:`fallback proportional alignment (${samples.length} power samples / ${records.length} records)`,coverage:mapped/records.length};
}
function fitLapSummary(lap,index,developerFieldMap,records){
 const start=fitDateValue(lap.startTime||lap.timestamp),elapsed=fitNumber(lap,['totalTimerTime','totalElapsedTime']),distanceM=fitNumber(lap,['totalDistance','distance']);
 const startSec=start?start.getTime()/1000:null,endSec=Number.isFinite(startSec)&&elapsed>0?startSec+elapsed:null;
 const segment=Number.isFinite(startSec)&&Number.isFinite(endSec)?records.filter(r=>r.t>=startSec-.5&&r.t<=endSec+.5):[];
 const vals=k=>segment.map(r=>Number(r[k])).filter(v=>Number.isFinite(v)&&v>0);
 const lapPower=findFitPower(lap,developerFieldMap)??avg(vals('power'));
 const lapHr=fitNumber(lap,['avgHeartRate','averageHeartRate'])??avg(vals('hr'));
 let speed=fitNumber(lap,['enhancedAvgSpeed','avgSpeed','averageSpeed']);
 if(!(speed>0)&&distanceM>0&&elapsed>0)speed=distanceM/elapsed;
 const paceSecPerKm=speed>0?1000/speed:(distanceM>0&&elapsed>0?elapsed/(distanceM/1000):null);
 return{index:index+1,durationSec:elapsed>0?elapsed:null,distanceKm:distanceM>0?distanceM/1000:null,paceSecPerKm:Number.isFinite(paceSecPerKm)?paceSecPerKm:null,avgPower:Number.isFinite(lapPower)?lapPower:null,avgHr:Number.isFinite(lapHr)?lapHr:null};
}
function recordSegmentSummary(records,start,end,index){
 const seg=records.slice(start,end+1),first=seg[0],last=seg.at(-1),duration=Math.max(0,(last?.t||0)-(first?.t||0));
 const ds=seg.map(x=>Number(x.distance)).filter(Number.isFinite),distanceM=ds.length>1?Math.max(...ds)-Math.min(...ds):null;
 const speeds=seg.map(x=>Number(x.speed)).filter(v=>Number.isFinite(v)&&v>0),powers=seg.map(x=>Number(x.power)).filter(v=>Number.isFinite(v)&&v>0),hrs=seg.map(x=>Number(x.hr)).filter(v=>Number.isFinite(v)&&v>0);
 const speed=avg(speeds),paceSecPerKm=speed>0?1000/speed:null;
 return{index:index+1,startSec:first?.t,endSec:last?.t,durationSec:duration,distanceKm:distanceM>0?distanceM/1000:(speed>0?speed*duration/1000:null),paceSecPerKm,avgPower:avg(powers),avgHr:avg(hrs)};
}
function detectWorkSegments(records,plan){
 if(!Array.isArray(records)||records.length<20)return[];
 const smooth=[];
 for(let i=0;i<records.length;i++){const a=Math.max(0,i-3),b=Math.min(records.length,i+4),vals=records.slice(a,b).map(r=>Number(r.speed)).filter(v=>Number.isFinite(v)&&v>0);smooth.push(avg(vals))}
 const valid=smooth.filter(Number.isFinite);if(valid.length<15)return[];
 const sorted=valid.slice().sort((a,b)=>a-b),q=p=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))],low=q(.25),high=q(.78);
 // Require a meaningful pace contrast; threshold sits between recovery/easy and fast running.
 const threshold=low+(high-low)*.58;
 if(!(high>low*1.12))return[];
 let raw=[],on=false,start=0,above=0,below=0;
 for(let i=0;i<smooth.length;i++){
   const v=smooth[i];
   if(!on){above=Number.isFinite(v)&&v>=threshold?above+1:0;if(above>=5){on=true;start=Math.max(0,i-above+1);below=0}}
   else{below=!Number.isFinite(v)||v<threshold?below+1:0;if(below>=5){raw.push([start,Math.max(start,i-below)]);on=false;above=0}}
 }
 if(on)raw.push([start,smooth.length-1]);
 // Merge brief false dips, then keep plausible work bouts.
 const merged=[];for(const seg of raw){if(merged.length&&records[seg[0]].t-records[merged.at(-1)[1]].t<12)merged.at(-1)[1]=seg[1];else merged.push(seg)}
 let out=merged.map((x,i)=>recordSegmentSummary(records,x[0],x[1],i)).filter(x=>x.durationSec>=15&&x.durationSec<=900&&Number(x.distanceKm)>.04);
 // Remove long warm-up/cool-down-like chunks when shorter repeated bouts are present.
 const durations=out.map(x=>x.durationSec).sort((a,b)=>a-b),med=median(durations);
 if(out.length>=3&&Number.isFinite(med))out=out.filter(x=>x.durationSec<=Math.max(180,med*2.4));
 return out.map((x,i)=>({...x,index:i+1}));
}
function scoreDetectedIntervals(work,plan,source='record stream'){
 const expected=Math.max(0,Number(plan?.repetitions)||0),targetPace=Number(plan?.zone?.pace),targetPower=Number(plan?.zone?.power);
 const allRows=work.map((l,i)=>({...l,rep:i+1,paceScore:Number.isFinite(l.paceSecPerKm)&&targetPace>0?clamp(100-Math.abs(1-targetPace/l.paceSecPerKm)*145,0,100):null,powerScore:Number.isFinite(l.avgPower)&&targetPower>0?clamp(100-Math.abs(1-l.avgPower/targetPower)*140,0,100):null}));
 const scoredRows=expected>0?allRows.slice(0,expected):allRows;
 const paceScores=scoredRows.map(x=>x.paceScore).filter(Number.isFinite),powerScores=scoredRows.map(x=>x.powerScore).filter(Number.isFinite);
 const paceComponent=paceScores.length?avg(paceScores):null,powerComponent=powerScores.length?avg(powerScores):null;
 const available=[paceComponent,powerComponent].filter(Number.isFinite);
 const baseRepScore=available.length?avg(available):null;
 const extraReps=expected>0?Math.max(0,allRows.length-expected):0;
 const missingReps=expected>0?Math.max(0,expected-allRows.length):0;
 // Extra work can never improve prescription execution. Apply a small adherence penalty;
 // missing prescribed reps have a stronger completion penalty.
 const extraPenalty=Math.min(10,extraReps*2),missingPenalty=expected>0?Math.min(30,missingReps*(30/expected)):0;
 const adherencePenalty=extraPenalty+missingPenalty;
 const finalRepScore=Number.isFinite(baseRepScore)?Math.round(clamp(baseRepScore-adherencePenalty,0,100)):null;
 const cut=Math.max(1,Math.floor(scoredRows.length/2)),first=scoredRows.slice(0,cut),last=scoredRows.slice(cut),mean=(a,k)=>avg(a.map(x=>Number(x[k])).filter(Number.isFinite));
 const p1=mean(first,'avgPower'),p2=mean(last,'avgPower'),t1=mean(first,'paceSecPerKm'),t2=mean(last,'paceSecPerKm');
 const ratios=scoredRows.map(x=>Number.isFinite(x.avgPower)&&targetPower>0?x.avgPower/targetPower:Number.isFinite(x.paceSecPerKm)&&targetPace>0?targetPace/x.paceSecPerKm:null).filter(Number.isFinite),mr=avg(ratios),variance=mr&&ratios.length>1?avg(ratios.map(v=>(v-mr)**2)):null;
 const coverage=expected>0?allRows.length/expected:1,quality=allRows.length>=3&&coverage>=.75&&coverage<=1.5?'high':allRows.length>=3&&coverage>=.5?'moderate':'limited';
 return{available:true,structured:true,work:allRows,scoredWork:scoredRows,expectedReps:expected,detectedReps:allRows.length,extraReps,missingReps,paceComponent,powerComponent,baseRepScore,extraPenalty,missingPenalty,adherencePenalty,repScore:finalRepScore,fadePower:Number.isFinite(p1)&&p1>0&&Number.isFinite(p2)?(p2/p1-1)*100:null,fadePace:Number.isFinite(t1)&&t1>0&&Number.isFinite(t2)?(t2/t1-1)*100:null,consistencyCv:variance!=null?Math.sqrt(variance)/mr*100:null,quality,source,usableForScore:quality==='high'&&scoredRows.length>=Math.max(2,Math.min(expected||2,2)),reason:`${allRows.length}${expected?` detected versus ${expected} prescribed`:''} using the ${source}. Only the first ${expected||allRows.length} prescribed repetition${(expected||allRows.length)===1?'':'s'} contribute to execution scoring.`};
}
function intervalFitAnalysis(laps,records,plan){
 const structured=plan&&['Intervals','Repetition','Threshold','Tempo','Marathon','Fitness assessment'].includes(baseType(plan.type));
 if(!structured)return{available:true,structured:false,quality:'not applicable',reason:'The run is not matched to a structured workout.'};
 const detected=detectWorkSegments(records,plan);
 if(detected.length>=3)return scoreDetectedIntervals(detected,plan,'second-by-second FIT pace stream');
 // Lap fallback is display-only unless confidence is genuinely high.
 const lapCandidates=(laps||[]).filter(l=>Number(l.durationSec)>15&&Number(l.distanceKm)>.04);
 if(lapCandidates.length>=3){const result=scoreDetectedIntervals(lapCandidates,plan,'FIT lap boundaries');result.usableForScore=false;result.quality='limited';result.reason+=` Record-stream detection found only ${detected.length}; lap boundaries are shown for inspection but are not trusted for execution scoring.`;return result}
 return{available:true,structured:true,work:[],expectedReps:Math.max(0,Number(plan?.repetitions)||0),detectedReps:detected.length,quality:'limited',usableForScore:false,source:'record stream',reason:'The FIT stream did not contain enough clearly separated work/recovery transitions for reliable interval scoring.'};
}
function refreshIntervalAnalysis(run,plan){
 if(!run)return null;
 const records=run.fitRecords||[],laps=run.fitLaps||[];
 if(!records.length&&!laps.length)return null;
 return run.intervalAnalysis=intervalFitAnalysis(laps,records,plan);
}

async function summariseFIT(file){
 const {Decoder,Stream}=await loadFitSdk();
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length<12||String.fromCharCode(...bytes.slice(8,12))!=='.FIT')throw Error('The selected file is not a valid FIT file.');
 const stream=Stream.fromByteArray(Array.from(bytes));
 const decoder=new Decoder(stream);
 if(!decoder.isFIT())throw Error('The selected file is not a valid FIT file.');
 const {messages,errors}=decoder.read({applyScaleAndOffset:true,expandSubFields:true,expandComponents:true,convertTypesToStrings:true,convertDateTimesToDates:true,includeUnknownData:true,mergeHeartRates:true});
 const fileIds=fitArray(messages,['fileIdMesgs','fileIdMesg','fileId']);
 const fileType=String(fileIds[0]?.type||'').toLowerCase();
 if(fileType&&fileType!=='activity')throw Error(`This FIT file is a ${fileType} file, not a recorded activity.`);
 const sessions=fitArray(messages,['sessionMesgs','sessionMesg','sessions']);
 const recordsRaw=fitArray(messages,['recordMesgs','recordMesg','records']);
 const laps=fitArray(messages,['lapMesgs','lapMesg','laps']);
 const session=sessions.find(x=>String(x?.sport||'').toLowerCase()==='running')||sessions[0]||{};
 const sport=String(session.sport||'').toLowerCase();
 if(sport&&sport!=='running')throw Error(`This FIT activity is recorded as ${sport}, not running.`);
 const powerFieldDiagnostics=new Set();
 const developerFieldMap=fitDeveloperFieldMap(messages);
 let records=recordsRaw.map(r=>{
   const d=fitDateValue(r.timestamp);
   return{t:d?d.getTime()/1000:null,hr:fitNumber(r,['heartRate','heart_rate']),speed:fitNumber(r,['enhancedSpeed','speed']),power:findFitPower(r,developerFieldMap,powerFieldDiagnostics),distance:fitDistanceMeters(fitNumber(r,['distance'])),cadence:fitNumber(r,['cadence','fractionalCadence'])};
 }).filter(r=>Number.isFinite(r.t)).sort((a,b)=>a.t-b.t);
 const startDate=fitDateValue(session.startTime||session.timestamp)||fitDateValue(recordsRaw[0]?.timestamp);
 if(!startDate)throw Error('The FIT file does not contain a valid activity start time.');
 let duration=fitNumber(session,['totalTimerTime','totalElapsedTime']);
 if(!(duration>0)&&records.length>1)duration=records.at(-1).t-records[0].t;
 let distanceM=fitNumber(session,['totalDistance','distance']);
 if(!(distanceM>0)){const ds=records.map(r=>r.distance).filter(Number.isFinite);if(ds.length)distanceM=Math.max(...ds)}
 if(!(duration>0)||!(distanceM>0))throw Error('The FIT activity does not contain valid duration and distance data.');
 const positive=(key)=>records.map(r=>r[key]).filter(v=>Number.isFinite(v)&&v>0);
 const mean=(arr)=>arr.length?avg(arr):null;
 const avgHr=fitNumber(session,['avgHeartRate','averageHeartRate'])??mean(positive('hr'));
 const decodedPower=findFitPower(session,developerFieldMap,powerFieldDiagnostics)??mean(positive('power'));
 const rawStrydPower=rawFitStrydRunningPower(bytes);
 const rawMap=attachRawStrydPowerToRecords(records,rawStrydPower);
 records=rawMap.records;
 const recordPowerMean=mean(records.map(r=>Number(r.power)).filter(v=>Number.isFinite(v)&&v>0));
 const avgPower=decodedPower??recordPowerMean??rawStrydPower?.average??null;
 if(rawStrydPower)powerFieldDiagnostics.add(`${rawStrydPower.source} (${rawStrydPower.count} samples${rawMap.method?`; ${rawMap.method}`:''})`);
 const avgCadence=fitNumber(session,['avgRunningCadence','avgCadence','averageCadence'])??mean(positive('cadence'));
 const analysis=streamAnalysis(records);
 const fitLaps=laps.map((lap,i)=>fitLapSummary(lap,i,developerFieldMap,records)).filter(l=>Number(l.durationSec)>0||Number(l.distanceKm)>0);
 const sourceHint=/stryd/i.test(file.name)||recordsRaw.some(r=>Object.keys(r||{}).some(k=>/stryd|formPower|legSpring/i.test(k)))?'Stryd FIT':'Garmin FIT';
 const startSeconds=Math.round(startDate.getTime()/1000);
 return{
   id:'fit-'+startSeconds+'-'+Math.round(distanceM),date:iso(startDate),type:'Easy',distanceKm:distanceM/1000,durationSec:duration,
   avgHr:Number.isFinite(avgHr)?Math.round(avgHr):null,avgPower:Number.isFinite(avgPower)?Math.round(avgPower):null,
   cadence:Number.isFinite(avgCadence)?Math.round(avgCadence):null,gct:null,vo:null,rpe:null,pain:null,recovery:null,temperature:null,
   notes:`Imported from ${sourceHint}`,
   drift:null,powerDrift:null,paceDrift:null,candidateDrift:analysis?.drift??null,candidatePowerDrift:analysis?.powerDrift??null,candidatePaceDrift:analysis?.paceDrift??null,
   candidateStreamEvidence:analysis,streamEvidence:null,sourceFormat:'fit-activity',sourceDevice:sourceHint,powerDiagnostics:{recordCount:records.length,poweredRecords:records.filter(r=>Number(r.power)>0).length,coverage:records.length?records.filter(r=>Number(r.power)>0).length/records.length:0,mapping:rawMap.method||null,rawSource:rawStrydPower?.source||null,rawCount:rawStrydPower?.count||0},fitWarnings:[...(errors||[]).map(String).slice(0,5),...(rawStrydPower?[`Running power read from Stryd developer Power (${rawStrydPower.count} samples).${rawMap.method?' '+rawMap.method+'.':''}`]:[]),...(avgPower?[]:['No usable native or developer running-power field was found.'])],lapCount:laps.length,fitLaps,fitRecords:records.map(r=>({t:r.t,hr:r.hr,speed:r.speed,power:r.power,distance:r.distance}))
 };
}
async function parseRunImportFile(file){
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 if(ext==='csv'){
   const text=await file.text();if(!text.trim())throw Error('The selected CSV file is empty.');
   const rows=parseCSV(text);if(!rows?.length||rows.length<2)throw Error('The CSV does not contain activity rows.');
   return summariseCSV(rows);
 }
 if(ext==='fit')return summariseFIT(file);
 throw Error('Unsupported file type. Choose a Garmin/Stryd FIT activity or detailed Stryd CSV file.');
}


function nextTrainingSessionAfter(date=iso(today())){
 return (state.plan||[]).filter(p=>p.date>=date&&!['Rest','Race Day'].includes(p.type)).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
}
function postRunCoachSnapshot(date=iso(today())){
 const paceState=trainingEvidence(date),current=Math.max(1,currentWeek()),appliedLoad=adaptiveFactorDetails(current),loadPreview=provisionalWeeklyAdjustment(current);
 const upcoming=(state.plan||[]).filter(p=>p.date>=date&&!['Rest','Race Day'].includes(p.type)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6).map(p=>{let z=null;try{z=zone(p.type,p.date)}catch{}return{id:p.id,date:p.date,type:p.type,distance:Number(p.distance),pace:Number(z?.pace),power:Number(z?.power),week:trainingWeekForDate(p.date)}});
 const next=upcoming[0]||null,paceReview=pacePowerReviewState(date);
 return{paceFactor:Number(paceReview.applied)||1,paceProvisional:Number(paceReview.provisional)||1,paceConfidence:Number(paceState.confidence)||0,
   loadFactor:Number(appliedLoad.cumulativeFactor)||1,loadProvisional:Number(loadPreview.cumulativeFactor)||Number(appliedLoad.cumulativeFactor)||1,
   readiness:Number(1+(Number(loadPreview.temporaryAdjustment)||0)),effectiveLoad:Number(loadPreview.factor)||1,predictionSec:Number(prediction())||null,reviewWeek:current,next,upcoming};
}
function signedFactorDelta(v){if(!Number.isFinite(v)||Math.abs(v)<.0005)return '↔ 0.000';return `${v>0?'+':''}${v.toFixed(3)}`;}
function postRunCoachUpdate(run,before,after){
 const plan=run.planId?state.plan.find(p=>p.id===run.planId):null,details=workoutScoreDetails(run,plan),score=details?.score??null,two=twoPathwayDecisionForRun(run,plan),paceDecision=two.pace,loadDecision=two.load;
 const paceProvisionalDelta=(after.paceProvisional||after.paceFactor)-(before.paceProvisional||before.paceFactor),loadProvisionalDelta=(after.loadProvisional||after.loadFactor)-(before.loadProvisional||before.loadFactor),readyDelta=after.readiness-before.readiness,predDelta=(Number.isFinite(after.predictionSec)&&Number.isFinite(before.predictionSec))?after.predictionSec-before.predictionSec:null;
 const reasons=[
   `Pace & Power — ${paceDecision.interpretation}`,
   `Distance & Load — ${loadDecision.interpretation}`,
   ...paceDecision.signals.slice(0,2).map(s=>`${s.name}: ${s.detail}.`),
   ...loadDecision.signals.slice(0,2).map(s=>`${s.name}: ${s.detail}.`)
 ];
 let impact=[
   `Pace & Power applied ${after.paceFactor.toFixed(3)} · provisional next-review ${(after.paceProvisional||after.paceFactor).toFixed(3)} (${signedFactorDelta(paceProvisionalDelta)} from the updated evidence set).`,
   `Distance & Load applied ${after.loadFactor.toFixed(3)} · provisional next-review ${(after.loadProvisional||after.loadFactor).toFixed(3)} (${signedFactorDelta(loadProvisionalDelta)} from current run-level tolerance evidence).`
 ];
 if(Math.abs(readyDelta)>=.0005)impact.push(`Readiness ${before.readiness.toFixed(3)} → ${after.readiness.toFixed(3)}. This remains a temporary overlay.`);
 if(predDelta!=null&&Math.abs(predDelta)>=1)impact.push(`Central race estimate ${predDelta<0?'improved':'moved slower'} by ${fmtTime(Math.abs(predDelta))}.`);

 const paceRatio=(after.paceProvisional||after.paceFactor)/Math.max(.8,after.paceFactor||1),loadRatio=(after.loadProvisional||after.loadFactor)/Math.max(.8,after.loadFactor||1);
 const prescriptionChanges=(after.upcoming||[]).map(a=>{
   const hypotheticalPace=Number(a.pace)/Math.max(.8,paceRatio),hypotheticalPower=Number(a.power)*paceRatio,hypotheticalDistance=Number(a.distance)*loadRatio;
   return{id:a.id,date:a.date,type:a.type,beforeDistance:a.distance,afterDistance:hypotheticalDistance,distanceDeltaKm:hypotheticalDistance-Number(a.distance),beforePace:a.pace,afterPace:hypotheticalPace,paceDeltaSec:hypotheticalPace-Number(a.pace),beforePower:a.power,afterPower:hypotheticalPower,powerDeltaW:hypotheticalPower-Number(a.power),week:a.week};
 }).filter(Boolean);
 const changed=prescriptionChanges.filter(x=>Math.abs(x.distanceDeltaKm)>=.05||Math.abs(x.paceDeltaSec)>=.5||Math.abs(x.powerDeltaW)>=1);
 let nextChange='No immediate prescription change; both learned pathways commit at the weekly review.';
 if(changed.length){const c=changed[0],bits=[];if(Math.abs(c.distanceDeltaKm)>=.05)bits.push(`distance ${c.beforeDistance.toFixed(1)} → ${c.afterDistance.toFixed(1)} km`);if(Math.abs(c.paceDeltaSec)>=.5)bits.push(`pace ${pace(c.beforePace)} → ${pace(c.afterPace)}`);if(Math.abs(c.powerDeltaW)>=1)bits.push(`power ${Math.round(c.beforePower)} → ${Math.round(c.afterPower)} W`);nextChange=`If the provisional pathway evidence is confirmed at weekly review, ${c.type} on ${fmtDate(c.date)} would change to ${bits.join(' · ')}.`}
 const distancePolicyNote='Distance & Load is learned separately from Pace & Power and commits at the weekly review. Readiness can still temporarily moderate an upcoming session without changing either learned pathway.';
 const decision=paceDecision.finalSignal>.18||loadDecision.finalSignal>.18?'This run added positive evidence to at least one pathway.':paceDecision.finalSignal<-.18||loadDecision.finalSignal<-.18?'This run added conservative evidence to at least one pathway.':'This run mainly reinforced the current two-pathway calibration.';
 const confidence=[paceDecision.confidence,loadDecision.confidence].includes('Developing')?'Developing':[paceDecision.confidence,loadDecision.confidence].includes('Moderate')?'Moderate':'High';
 return{createdAt:new Date().toISOString(),score,evidenceQuality:details?.evidenceQuality||'limited',before,after,paceProvisionalDelta,loadProvisionalDelta,readinessDelta:readyDelta,predictionDeltaSec:predDelta,nextChange,prescriptionChanges:prescriptionChanges.slice(0,6),distancePolicyNote,confidence,decision,decisionSummary:{pace:{action:paceDecision.action,confidence:paceDecision.confidence},load:{action:loadDecision.action,confidence:loadDecision.confidence}}};
}
function pathwayExecutionBridgeHtml(d){
 const details=d?.score!=null?null:null;
 const path=d.pathway;
 const source=(d.signals||[]);
 const executionRows=[];
 if(path==='pace'){
   const cap=Number(d.capabilityScore);
   const perf=d.signalComponents?.find(x=>x.key==='performance');
   if(Number.isFinite(cap)){
     const capRows=(d.capabilityExecutionComponents||[]).map(c=>`<div class="executionBridgeComponent"><div><b>${esc(c.name)}</b><small>${esc(c.scope||'')}</small></div><span>${c.score.toFixed(0)}/100 × ${(c.effectiveWeight*100).toFixed(0)}%</span><strong>${(c.score*c.effectiveWeight).toFixed(1)}</strong></div>`).join('');
     executionRows.push(`<div class="executionBridgeComponents">${capRows}</div><div class="executionBridgeResult"><span>Weighted capability score</span><b>${cap.toFixed(1)}/100</b></div>`);
     executionRows.push(`<div class="executionBridgeEquation"><span>Convert capability score to pathway signal</span><code>(${cap.toFixed(1)} − 82) ÷ 18</code><b>= ${perf?`${perf.value>=0?'+':''}${perf.value.toFixed(2)}`:'—'}</b></div>`);
   }else{
     executionRows.push(`<div class="executionBridgeResult"><span>Relevant Execution Breakdown</span><b>No direct capability score</b></div>`);
   }
   return`<section class="executionToPathwayBridge"><h5>1. Execution Breakdown → pathway evidence</h5><p>The Pace & Power pathway does not use the overall execution score directly. It takes the execution components that measure target capability: <b>pace, power and repetition adherence</b>, using their effective Execution Breakdown weights.</p>${executionRows.join('')}<p class="bridgeNote">Heart-rate control, cardiac drift and RPE can affect physiological-cost evidence where relevant, but they are not silently folded into the capability score.</p></section>`;
 }
 const completion=d.signalComponents?.find(x=>x.key==='completion'),execution=d.signalComponents?.find(x=>x.key==='execution'),tolerance=d.signalComponents?.find(x=>x.key==='tolerance');
 return`<section class="executionToPathwayBridge"><h5>1. Execution Breakdown → pathway evidence</h5><p>Distance & Load uses the run differently. <b>Planned-load completion</b> creates the completion signal, the <b>overall Execution Breakdown score</b> provides limited execution support, and run-specific tolerance evidence is evaluated separately.</p>
 <div class="executionBridgeResult"><span>Overall Execution Breakdown → execution-support signal</span><b>${Number.isFinite(d.score)?`${Math.round(d.score)}/100 → ${execution?`${execution.value>=0?'+':''}${execution.value.toFixed(2)}`:'—'}`:'No score'}</b></div>
 <div class="executionBridgeResult"><span>Planned-load completion → completion signal</span><b>${Number.isFinite(d.completion)?`${Math.round(d.completion*100)}% → ${completion?`${completion.value>=0?'+':''}${completion.value.toFixed(2)}`:'—'}`:'No matched plan'}</b></div>
 <div class="executionBridgeResult"><span>Run-specific tolerance evidence</span><b>${tolerance?`${tolerance.value>=0?'+':''}${tolerance.value.toFixed(2)}`:'0.00'}</b></div>
 <p class="bridgeNote">This separation prevents the same execution metric from automatically dominating both capability and load-tolerance learning.</p></section>`;
}

function pathwayCalculationDetailsHtml(d,t){
 const comps=d.signalComponents||[];
 const fmtSigned=(v,digits=2)=>`${Number(v)>=0?'+':''}${Number(v).toFixed(digits)}`;
 const weightedRows=comps.map(c=>{
   const product=c.value*c.weight,derivation=d.componentDerivation?.[c.key]||'';
   return`<div class="pathCalcComponent"><div><b>${esc(c.label)}</b><small>${esc(derivation)}</small></div><span>${fmtSigned(c.value)} × ${(c.weight*100).toFixed(0)}%</span><strong>${fmtSigned(product,3)}</strong></div>`;
 }).join('');
 const sumExpr=comps.map(c=>`(${fmtSigned(c.value)} × ${(c.weight*100).toFixed(0)}%)`).join(' + ');
 const raw=t.rawSignal;
 const accepted=t.acceptedSignal;
 const safeguardChanged=Math.abs(raw-accepted)>=.005;
 const confidenceBase=d.baseConfidenceWeight??t.confidenceWeight;
 const multiplierText=(d.confidenceMultipliers||[]).length?(d.confidenceMultipliers||[]).map(m=>` × ${m.factor.toFixed(2)} (${esc(m.label)})`).join(''):'';
 const contributionCalc=accepted*t.confidenceWeight*t.learningRate;
 return`<div class="pathCalcAudit">
   ${pathwayExecutionBridgeHtml(d)}
   <section>
     <h5>2. Pathway evidence → Run signal</h5>
     <div class="pathCalcComponents">${weightedRows}</div>
     <div class="pathCalcEquation"><span>Weighted sum</span><code>${sumExpr}</code><b>= ${fmtSigned(raw)}</b></div>
     <p class="pathCalcNote">The component values are normalized evidence signals, not percentages. The pathway weights sum to 100%.</p>
   </section>
   <section>
     <h5>3. Safeguard / accepted signal</h5>
     <div class="pathCalcStep"><span>Run signal</span><b>${fmtSigned(raw)}</b></div>
     <div class="pathCalcStep"><span>Accepted signal</span><b>${fmtSigned(accepted)}</b></div>
     <p>${safeguardChanged?esc(t.safeguard):'No safeguard changed the Run signal.'}</p>
   </section>
   <section>
     <h5>4. Learning confidence</h5>
     <div class="pathCalcEquation"><span>Confidence calculation</span><code>${Math.round(confidenceBase*100)}%${multiplierText}</code><b>= ${Math.round(t.confidenceWeight*100)}%</b></div>
     <p>${d.confidenceReasons?.length?esc(d.confidenceReasons.join(' · ')):'No confidence reduction applied.'}</p>
   </section>
   <section>
     <h5>5. Accepted signal → factor contribution</h5>
     <div class="pathCalcEquation contribution"><span>Factor contribution</span><code>${fmtSigned(accepted)} × ${t.confidenceWeight.toFixed(2)} × ${(t.learningRate*100).toFixed(2)}%</code><b>= ${signedFactorDelta(contributionCalc)}</b></div>
     <p>This is the amount this run contributes to the learned pathway. It is not the new factor itself.</p>
   </section>
 </div>`;
}

function qualitativePathwaySignal(v){
 v=Number(v)||0;
 if(v>=.65)return'Strong progression signal';
 if(v>=.35)return'Progression signal';
 if(v>=.12)return'Slight progression signal';
 if(v<=-.65)return'Strong caution signal';
 if(v<=-.35)return'Caution signal';
 if(v<=-.12)return'Slight caution signal';
 return'Supports current level';
}
function pathwayEvidenceSummaryHtml(d,t){
 const rows=[];
 const add=(name,detail,observed,role)=>rows.push(`<div class="evidenceDriver consistent"><div><b>${esc(name)}</b><small>${esc(detail||'')}</small></div><span>${esc(observed)}</span><em>${esc(role)}</em></div>`);
 if(d.pathway==='pace'){
   const comps=d.capabilityExecutionComponents||[];
   comps.forEach(c=>{
     const role=c.effectiveWeight>=.35?'Primary':c.effectiveWeight>=.15?'Secondary':'Supporting';
     add(c.name,c.scope||'',`${Math.round(c.score)}/100`,role);
   });
   const cost=(d.signalComponents||[]).find(x=>x.key==='cost');
   const comp=(d.signalComponents||[]).find(x=>x.key==='comparable');
   const personal=(d.signalComponents||[]).find(x=>x.key==='personal');
   if(cost&&Math.abs(cost.value)>=.01)add('Physiological cost',d.componentDerivation?.cost||'',`${cost.value>=0?'+':''}${cost.value.toFixed(2)}`,'Supporting');
   if(comp&&Math.abs(comp.value)>=.01)add('Comparable-run response',d.componentDerivation?.comparable||'',`${comp.value>=0?'+':''}${comp.value.toFixed(2)}`,'Supporting');
   if(personal&&Math.abs(personal.value)>=.01)add('Personal response',d.componentDerivation?.personal||'',`${personal.value>=0?'+':''}${personal.value.toFixed(2)}`,'Supporting');
 }else{
   const tolerance=(d.signalComponents||[]).find(x=>x.key==='tolerance');
   const completion=(d.signalComponents||[]).find(x=>x.key==='completion');
   if(completion)add('Planned distance completed',d.componentDerivation?.completion||'',Number.isFinite(d.completion)?`${Math.round(d.completion*100)}%`:`${completion.value>=0?'+':''}${completion.value.toFixed(2)}`,'Primary');
   if(tolerance)add('Load-tolerance response',d.componentDerivation?.tolerance||'',`${tolerance.value>=0?'+':''}${tolerance.value.toFixed(2)}`,'Primary');
   if(Number.isFinite(d.score))add('Overall workout execution','From the Execution Breakdown',`${Math.round(d.score)}/100`,'Secondary');
   const personal=(d.signalComponents||[]).find(x=>x.key==='personal');
   if(personal&&Math.abs(personal.value)>=.01)add('Personal response',d.componentDerivation?.personal||'',`${personal.value>=0?'+':''}${personal.value.toFixed(2)}`,'Supporting');
 }
 return rows.join('');
}

function pathwayCoachLanguage(d,t){
 const q=qualitativePathwaySignal(t.rawSignal),accepted=Math.abs(t.acceptedContribution)>=.00005;
 let runMeaning='',response='';
 if(d.pathway==='pace'){
   if(t.rawSignal>=.35)runMeaning='This run supports a higher pace/power capability.';
   else if(t.rawSignal>=.12)runMeaning='This run gives a small indication of improving pace/power capability.';
   else if(t.rawSignal<=-.35)runMeaning='This run suggests the current pace/power calibration may be demanding.';
   else if(t.rawSignal<=-.12)runMeaning='This run gives a small caution signal for pace/power capability.';
   else runMeaning='This run is broadly consistent with the current pace/power calibration.';
 }else{
   if(t.rawSignal>=.35)runMeaning='This run supports progressing training distance/load.';
   else if(t.rawSignal>=.12)runMeaning='This run gives a small indication that the current training load is being tolerated well.';
   else if(t.rawSignal<=-.35)runMeaning='This run suggests training distance/load should be progressed more cautiously.';
   else if(t.rawSignal<=-.12)runMeaning='This run gives a small caution signal for training-load tolerance.';
   else runMeaning='This run is broadly consistent with the current distance/load calibration.';
 }
 if(accepted)response=`The run contributes ${signedFactorDelta(t.acceptedContribution)} to this pathway's weekly learning.`;
 else if(t.safeguard)response='The signal is recorded, but the model is not changing this pathway from this run alone.';
 else response='The evidence is not strong enough to change this pathway.';
 return{q,runMeaning,response};
}
function postRunCoachUpdateHtml(r){
 const u=r?.coachUpdate;if(!u)return '';
 const plan=r.planId?state.plan.find(p=>p.id===r.planId):null,two=twoPathwayDecisionForRun(r,plan),pd=two.pace,ld=two.load,pt=pathwayEvidenceTrace(r,'pace'),lt=pathwayEvidenceTrace(r,'load');
 const branch=(title,d,t)=>{
   const accepted=Math.abs(t.acceptedContribution)>=.00005,lang=pathwayCoachLanguage(d,t);
   return`<section class="pathwayDecisionBranch progressivePathway consistentPathway uiLevel3">
     <div class="progressiveHead pathwayHeadline"><div><small>${title}</small><h4>${lang.q}</h4></div><span>${accepted?'Learning update accepted':'No pathway change'}</span></div>
     <div class="coachDecisionSummary singleContribution"><div><small>LEARNING CONTRIBUTION</small><strong>${accepted?signedFactorDelta(t.acceptedContribution):'0.000'}</strong></div></div>
     <div class="coachPlainLanguage"><p><b>Run interpretation.</b> ${esc(lang.runMeaning)}</p><p><b>Model response.</b> ${esc(lang.response)}</p></div>
     ${!accepted&&t.safeguard?`<div class="coachDecisionSafeguard">${esc(t.safeguard)}</div>`:''}
     <details class="whyDecision"><summary>Why?</summary>
       <div class="whyDecisionIntro"><b>Evidence used from this run</b><p>These are the workout measures that matter for this pathway. Primary evidence carries the largest role, while secondary and supporting evidence refine the interpretation.</p></div>
       <div class="evidenceDriverHeader"><span>Evidence</span><span>Observed</span><span>Role</span></div>
       <div class="evidenceDriverList">${pathwayEvidenceSummaryHtml(d,t)}</div>
       <div class="whyDecisionResult"><span>Overall interpretation</span><b>${lang.q}</b><small>Run signal ${t.rawSignal>=0?'+':''}${t.rawSignal.toFixed(2)}</small></div>
       <details class="technicalCalculation"><summary>Technical calculation</summary>${pathwayCalculationDetailsHtml(d,t)}<details class="componentEvidenceDetails"><summary>Source signal details</summary>${(d.signals||[]).map(s=>`<div class="decisionSignalRow"><span>${esc(s.name)}</span><b>${s.value>=0?'+':''}${Number(s.value).toFixed(2)}</b><small>${esc(s.detail)}</small></div>`).join('')}</details></details>
     </details>
   </section>`;
 };
 return`<section class="postRunCoachUpdate progressiveCoachUpdate uiLevel2"><div class="postRunCoachHead simplified"><div><span>WHAT THIS RUN CHANGES</span><h3>${esc(u.decision)}</h3></div></div><div class="pathwayDecisionGrid">${branch('PACE & POWER',pd,pt)}${branch('DISTANCE & LOAD',ld,lt)}</div><button type="button" class="logProgressLink" data-go="dashboard" data-anchor="progressAdaptationHome">View accumulated adaptation in Progress</button></section>`;
}

function intervalAnalysisHtml(r){
 const a=r?.intervalAnalysis;if(!a?.structured)return'';
 if(!a.work?.length)return`<section class="intervalAnalysisCard uiLevel2"><div class="intervalAnalysisHead"><div><span>INTERVAL ANALYSIS</span><h3>Detection confidence too low</h3></div><b>Not scored</b></div><p>${esc(a.reason)}</p><p class="muted compact">Uncertain interval detection cannot change the execution score.</p></section>`;
 const rows=a.work.map(x=>{const extra=a.expectedReps>0&&x.rep>a.expectedReps;return`<div class="intervalRepRow ${extra?'extraRep':''}"><strong>Rep ${x.rep}${extra?' · extra':''}</strong><span>${Number.isFinite(x.distanceKm)?x.distanceKm.toFixed(2)+' km':'—'}</span><span>${Number.isFinite(x.paceSecPerKm)?pace(x.paceSecPerKm):'—'}</span><span>${Number.isFinite(x.avgPower)?Math.round(x.avgPower)+' W':'—'}</span><span>${Number.isFinite(x.avgHr)?Math.round(x.avgHr)+' bpm':'—'}</span></div>`}).join('');
 const paceChange=Number.isFinite(a.fadePace)?`${Math.abs(a.fadePace).toFixed(1)}% ${a.fadePace<0?'faster':'slower'}`:null,powerChange=Number.isFinite(a.fadePower)?`${Math.abs(a.fadePower).toFixed(1)}% ${a.fadePower>=0?'higher':'lower'}`:null;
 const late=powerChange?`Power ${powerChange}`:paceChange?`Pace ${paceChange}`:'—';
 const countText=a.expectedReps?`${a.detectedReps} detected / ${a.expectedReps} prescribed`:`${a.detectedReps} detected`;
 const prescribed=Math.max(0,Number(a.expectedReps)||0),detected=Math.max(0,Number(a.detectedReps)||0),shown=Math.min(Math.max(prescribed,detected),20);
 const repDots=shown?Array.from({length:shown},(_,i)=>`<i class="${i<prescribed?'prescribed':''} ${i>=prescribed&&i<detected?'extra':''} ${i>=detected?'missing':''}"></i>`).join(''):'';
 const cv=Number(a.consistencyCv),consistencyScore=Number.isFinite(cv)?clamp(100-cv*8,0,100):null;
 const fade=Number.isFinite(a.fadePower)?a.fadePower:Number.isFinite(a.fadePace)?-a.fadePace:null;
 const fadeScore=Number.isFinite(fade)?clamp(100-Math.abs(Math.min(0,fade))*8,0,100):null;
 const pd=r.powerDiagnostics,powerDiag=pd?`<div class="powerCoverage ${pd.coverage>=.8?'good':pd.coverage>0?'partial':'missing'}"><b>Power stream</b><span>${Math.round(pd.coverage*100)}% FIT coverage</span><small>${esc(pd.rawSource||pd.mapping||'No record-level running power recovered')}</small></div>`:'';
 const calc=`<details class="intervalScoreCalc"><summary>Score calculation</summary><div class="intervalCalcRows">${Number.isFinite(a.paceComponent)?`<div><span>Prescribed-rep pace</span><b>${Math.round(a.paceComponent)}/100</b></div>`:''}${Number.isFinite(a.powerComponent)?`<div><span>Prescribed-rep power</span><b>${Math.round(a.powerComponent)}/100</b></div>`:''}<div><span>Base rep execution</span><b>${Number.isFinite(a.baseRepScore)?Math.round(a.baseRepScore)+'/100':'—'}</b></div>${a.extraPenalty?`<div class="penalty"><span>${a.extraReps} extra rep${a.extraReps===1?'':'s'}</span><b>−${a.extraPenalty.toFixed(0)}</b></div>`:''}${a.missingPenalty?`<div class="penalty"><span>${a.missingReps} missing rep${a.missingReps===1?'':'s'}</span><b>−${a.missingPenalty.toFixed(0)}</b></div>`:''}<div class="total"><span>Interval execution</span><b>${Number.isFinite(a.repScore)?a.repScore+'/100':'Not scored'}</b></div></div></details>`;
 return`<section class="intervalAnalysisCard visualInterval uiLevel2"><div class="intervalAnalysisHead"><div><span>INTERVAL ANALYSIS</span><h3>${countText}</h3></div><b>${a.usableForScore&&Number.isFinite(a.repScore)?a.repScore+'/100':esc(a.quality)}</b></div>${repDots?`<div class="repDotBlock"><div class="repDots">${repDots}</div><div><span><i class="legendDot prescribed"></i>${prescribed} prescribed</span>${detected>prescribed?`<span><i class="legendDot extra"></i>${detected-prescribed} extra</span>`:''}${detected<prescribed?`<span><i class="legendDot missing"></i>${prescribed-detected} missing</span>`:''}</div></div>`:''}<div class="intervalVisualMetrics"><div><small>Execution</small>${Number.isFinite(a.repScore)?`<b>${Math.round(a.repScore)}</b><i><em style="width:${clamp(a.repScore,0,100)}%"></em></i>`:'<b>—</b>'}</div><div><small>Consistency</small><b>${Number.isFinite(cv)?cv.toFixed(1)+'%':'—'}</b>${Number.isFinite(consistencyScore)?`<i><em style="width:${consistencyScore}%"></em></i>`:''}</div><div><small>Late change</small><b>${late}</b>${Number.isFinite(fadeScore)?`<i><em style="width:${fadeScore}%"></em></i>`:''}</div></div>${powerDiag}${calc}<details class="intervalRepDetails"><summary>Repetition details · ${a.detectedReps} detected</summary><div class="intervalRepTable"><div class="intervalRepHeader"><b>Rep</b><b>Distance</b><b>Pace</b><b>Power</b><b>HR</b></div>${rows}</div></details><p class="muted compact">${a.usableForScore?'Prescribed work repetitions drive interval pace/power scoring; extra repetitions add load but cannot improve execution.':'Detection is shown for inspection only.'}</p></section>`;
}

function workoutFamily(type){
 const t=String(type||'').toLowerCase();
 if(/recovery|shakeout/.test(t))return'recovery';
 if(/long run|specific long|race rehearsal/.test(t))return'long';
 if(/interval|vo₂|vo2|fartlek|hill|repetition/.test(t))return'interval';
 if(/threshold|tempo|marathon-specific|half-marathon-specific/.test(t))return'threshold';
 if(/assessment|race/.test(t))return'assessment';
 return'aerobic';
}
function runIntensityRatio(r){
 const cp=Number(state.setup.criticalPower)||0,pw=Number(r.avgPower)||0;
 if(cp>0&&pw>0)return pw/cp;
 const hr=Number(r.avgHr)||0,thr=Number(state.setup.thresholdHr)||0;
 return thr>0&&hr>0?hr/thr:null;
}
function injuryContextForRun(r){
 const d=dte(r.date);
 return(state.injuries||[]).some(i=>{
   const start=dte(i.date),end=i.fullDate?dte(i.fullDate):new Date(start.getTime()+42*DAY);
   return d>=start&&d<=end;
 });
}
function comparableRunAnalysis(run){
 if(!run)return null;
 const family=effectiveWorkoutFamily(run),dur=Number(run.durationSec)||0,dist=Number(run.distanceKm)||0,intensity=runIntensityRatio(run),paceNow=metrics(run).pace;
 const constrained=injuryContextForRun(run);
 const pool=completedRuns(run.date).filter(r=>r.id!==run.id&&r.date<run.date&&effectiveWorkoutFamily(r)===family&&injuryContextForRun(r)===constrained);
 const scored=pool.map(r=>{
   const rd=Number(r.durationSec)||0,rk=Number(r.distanceKm)||0,ri=runIntensityRatio(r),rp=metrics(r).pace;
   const simDur=dur&&rd?Math.max(0,1-Math.abs(rd-dur)/Math.max(dur,rd)):0;
   const simDist=dist&&rk?Math.max(0,1-Math.abs(rk-dist)/Math.max(dist,rk)):0;
   const simIntensity=Number.isFinite(intensity)&&Number.isFinite(ri)?Math.max(0,1-Math.abs(ri-intensity)/.22):.55;
   const simPace=Number.isFinite(paceNow)&&Number.isFinite(rp)?Math.max(0,1-Math.abs(rp-paceNow)/Math.max(paceNow,rp)/.22):.55;
   const exactType=r.type===run.type?1:.82;
   const similarity=(simDur*.27+simDist*.18+simIntensity*.32+simPace*.13+exactType*.10)*100;
   return{run:r,similarity};
 }).filter(x=>x.similarity>=55).sort((a,b)=>b.similarity-a.similarity).slice(0,8);
 const matches=scored.map(x=>x.run),sims=scored.map(x=>x.similarity);
 const vals=(fn)=>matches.map(fn).filter(Number.isFinite);
 const eff=vals(r=>metrics(r).efficiencyJ),drift=vals(r=>Number(r.powerDrift)),hr=vals(r=>Number(r.avgHr)),rpe=vals(r=>Number(r.rpe));
 const current={efficiency:metrics(run).efficiencyJ,drift:Number(run.powerDrift),hr:Number(run.avgHr),rpe:Number(run.rpe)};
 const baseline={efficiency:avg(eff),drift:avg(drift),hr:avg(hr),rpe:avg(rpe)};
 const deltaPct=(v,b)=>Number.isFinite(v)&&Number.isFinite(b)&&b!==0?(v/b-1)*100:null;
 const confidence=scored.length>=6&&avg(sims)>=80?'High':scored.length>=3&&avg(sims)>=68?'Moderate':'Low';
 return{family,matches:scored,count:scored.length,medianSimilarity:scored.length?median(sims):null,confidence,current,baseline,
   efficiencyDelta:deltaPct(current.efficiency,baseline.efficiency),
   driftDelta:Number.isFinite(current.drift)&&Number.isFinite(baseline.drift)?current.drift-baseline.drift:null,
   hrDelta:deltaPct(current.hr,baseline.hr),rpeDelta:Number.isFinite(current.rpe)&&Number.isFinite(baseline.rpe)?current.rpe-baseline.rpe:null};
}
function streamThirds(run){
 const records=(run.fitRecords||[]).filter(r=>Number.isFinite(Number(r.t)));
 if(records.length<30)return null;
 const start=records[0].t,end=records.at(-1).t,total=end-start;if(!(total>0))return null;
 const segment=(lo,hi)=>{
   const rows=records.filter(r=>r.t>=start+total*lo&&r.t<=start+total*hi),powers=rows.map(r=>Number(r.power)).filter(v=>v>0),hrs=rows.map(r=>Number(r.hr)).filter(v=>v>0),speeds=rows.map(r=>Number(r.speed)).filter(v=>v>0);
   const pw=avg(powers),hr=avg(hrs),speed=avg(speeds);
   return{power:pw,hr,pace:speed>0?1000/speed:null,efficiency:Number.isFinite(pw)&&Number.isFinite(hr)&&hr>0?pw*60/hr:null};
 };
 return{early:segment(0,.333),middle:segment(.333,.667),late:segment(.667,1)};
}
function workoutIntelligence(run){
 const plan=run.planId?state.plan.find(p=>p.id===run.planId):null,family=workoutFamily(plan?.type||run.type),details=workoutScoreDetails(run,plan),comp=comparableRunAnalysis(run),thirds=streamThirds(run),m=metrics(run);
 const findings=[],positives=[],cautions=[];
 const add=(kind,text)=>{findings.push({kind,text});(kind==='positive'?positives:cautions).push(text)};
 if(family==='interval'){
   const ia=run.intervalAnalysis;
   if(ia?.usableForScore&&ia.scoredWork?.length){
     if(ia.detectedReps===ia.expectedReps)add('positive',`All ${ia.expectedReps} prescribed repetitions were detected.`);
     else if(ia.extraReps>0)add('caution',`${ia.extraReps} extra repetition${ia.extraReps===1?'':'s'} added load beyond the prescription.`);
     else if(ia.missingReps>0)add('caution',`${ia.missingReps} prescribed repetition${ia.missingReps===1?' was':'s were'} not detected.`);
     if(Number.isFinite(ia.consistencyCv))add(ia.consistencyCv<=3?'positive':ia.consistencyCv>7?'caution':'neutral',`Rep variation was ${ia.consistencyCv.toFixed(1)}%.`);
     if(Number.isFinite(ia.fadePower))add(Math.abs(ia.fadePower)<=3?'positive':ia.fadePower<-6?'caution':'neutral',`Late-rep power was ${Math.abs(ia.fadePower).toFixed(1)}% ${ia.fadePower>=0?'higher':'lower'} than early-rep power.`);
   } else add('caution','Interval structure could not be scored with high confidence; whole-run evidence remains secondary.');
 } else if(family==='recovery'){
   if(Number.isFinite(run.rpe))add(run.rpe<=3?'positive':run.rpe>=5?'caution':'neutral',`RPE was ${run.rpe}/10 for a recovery-focused session.`);
   if(Number.isFinite(run.powerDrift))add(run.powerDrift<=3?'positive':run.powerDrift>6?'caution':'neutral',`Power-based cardiac drift was ${run.powerDrift.toFixed(1)}%.`);
   if(plan&&Number(run.distanceKm)>Number(plan.distance)*1.08)add('caution','Extra distance reduced recovery specificity; faster or longer is not rewarded on a recovery day.');
 } else if(family==='aerobic'){
   if(Number.isFinite(run.powerDrift))add(run.powerDrift<=3?'positive':run.powerDrift>6?'caution':'neutral',`Aerobic cardiac drift was ${run.powerDrift.toFixed(1)}%.`);
   if(comp&&Number.isFinite(comp.efficiencyDelta))add(comp.efficiencyDelta>=2?'positive':comp.efficiencyDelta<=-3?'caution':'neutral',`Efficiency was ${Math.abs(comp.efficiencyDelta).toFixed(1)}% ${comp.efficiencyDelta>=0?'above':'below'} the comparable-run baseline.`);
 } else if(family==='long'){
   if(thirds){
     const e=thirds.early,l=thirds.late;
     const effDelta=Number.isFinite(e.efficiency)&&Number.isFinite(l.efficiency)&&e.efficiency>0?(l.efficiency/e.efficiency-1)*100:null;
     const powerDelta=Number.isFinite(e.power)&&Number.isFinite(l.power)&&e.power>0?(l.power/e.power-1)*100:null;
     if(Number.isFinite(effDelta))add(effDelta>=-4?'positive':effDelta<=-8?'caution':'neutral',`Late-run efficiency was ${Math.abs(effDelta).toFixed(1)}% ${effDelta>=0?'higher':'lower'} than the opening third.`);
     if(Number.isFinite(powerDelta))add(Math.abs(powerDelta)<=4?'positive':powerDelta<-7?'caution':'neutral',`Late-run power was ${Math.abs(powerDelta).toFixed(1)}% ${powerDelta>=0?'higher':'lower'} than the opening third.`);
   }
   if(Number.isFinite(run.powerDrift))add(run.powerDrift<=4?'positive':run.powerDrift>7?'caution':'neutral',`Whole-run power-based drift was ${run.powerDrift.toFixed(1)}%.`);
 } else if(family==='threshold'){
   if(thirds){
     const e=thirds.early,l=thirds.late,pd=Number.isFinite(e.power)&&Number.isFinite(l.power)&&e.power>0?(l.power/e.power-1)*100:null;
     if(Number.isFinite(pd))add(Math.abs(pd)<=3?'positive':Math.abs(pd)>=7?'caution':'neutral',`Power changed ${pd>=0?'+':''}${pd.toFixed(1)}% from early to late.`);
     if(Number.isFinite(e.hr)&&Number.isFinite(l.hr))add('neutral',`Heart rate developed from ${Math.round(e.hr)} to ${Math.round(l.hr)} bpm.`);
   }
 } else if(family==='assessment'){
   add('neutral','This session is treated primarily as benchmark evidence rather than a normal training-response session.');
 }
 if(Number(run.pain)>=3)add('caution',`Pain was ${Number(run.pain)}/10 and limits positive interpretation.`);
 let verdict='Solid execution';
 if(details?.score>=90&&cautions.length===0)verdict='Excellent execution';
 else if(details?.score<70||cautions.length>=2)verdict='Execution needs attention';
 else if(positives.length>=2)verdict='Strong session';
 let interpretation='';
 if(family==='recovery')interpretation=cautions.length?'The session may have been too demanding for a recovery objective.':'The session stayed appropriately restorative.';
 else if(family==='long')interpretation=cautions.length?'Durability or late-run stability deserves attention.':'The long-run response was stable enough to support durability development.';
 else if(family==='interval')interpretation=cautions.length?'Quality work was completed, but prescription adherence or repetition stability limits progression confidence.':'The quality-session structure and repetition response were well controlled.';
 else if(family==='threshold')interpretation=cautions.length?'The target may be sustainable, but physiological or late-session cost argues against automatic progression.':'The sustained-quality stimulus was delivered with good control.';
 else if(family==='aerobic')interpretation=comp?.confidence!=='Low'&&Number.isFinite(comp.efficiencyDelta)?`Aerobic cost was ${comp.efficiencyDelta>=0?'better':'worse'} than the recent comparable baseline.`:'The session is interpreted mainly from intensity control and aerobic stability.';
 else interpretation='This session provides useful benchmark evidence.';
 return{family,verdict,interpretation,findings,details,comp,thirds};
}
function workoutIntelligenceHtml(run){
 const w=workoutIntelligence(run),familyIcon=w.family==='long'?'long':w.family==='interval'?'quality':w.family==='recovery'?'recovery':w.family==='threshold'?'threshold':'easy';
 const findings=w.findings.slice(0,5).map(f=>`<div class="wiFinding ${f.kind}"><i>${visualStatusIcon(f.kind)}</i><span>${esc(f.text)}</span></div>`).join('');
 const score=w.details?.score;
 return`<section class="workoutIntelligence uiLevel1"><div class="wiHead visual"><span class="wiIcon">${uiIcon(familyIcon)}</span><div><small>WORKOUT INTELLIGENCE</small><h3>${esc(w.verdict)}</h3></div><a class="wiGaugeLink" href="#executionBreakdownFoldout" aria-label="Open execution breakdown">${Number.isFinite(score)?circularGauge(score,'execution'):'<span class="analysedBadge">Analysed</span>'}</a></div><p class="wiInterpretation">${esc(w.interpretation)}</p><div class="wiFindings">${findings||'<p class="muted">Not enough detailed evidence for session-specific findings.</p>'}</div></section>`;
}
function comparableRunHtml(run){
 const c=comparableRunAnalysis(run);if(!c)return'';
 if(!c.count)return`<section class="comparableRuns visualComparable uiLevel2"><div class="comparableHead"><div><small>PERSONAL COMPARISON</small><h3>Baseline building</h3></div><span>Low confidence</span></div><div class="baselineEmpty">${uiIcon('compare')}<p>No sufficiently similar historical ${esc(c.family)} runs yet. This run becomes part of your future personal baseline.</p></div></section>`;
 const metric=(label,current,baseline,format,betterHigh=true,unit='')=>{
  if(!Number.isFinite(current)||!Number.isFinite(baseline))return'';
  return`<div class="comparisonMetric"><small>${label}</small><div class="comparisonValues"><strong>${format(current)}</strong><span>baseline ${format(baseline)}</span></div>${deltaVisual(current,baseline,betterHigh,unit)}</div>`;
 };
 const matches=c.matches.slice(0,5).map(x=>`<div class="comparableMatch"><span>${fmtDate(x.run.date)} · ${esc(x.run.type)}</span><b>${Math.round(x.similarity)}% similar</b></div>`).join('');
 return`<section class="comparableRuns visualComparable uiLevel2"><div class="comparableHead"><div><small>PERSONAL COMPARISON</small><h3>${c.count} comparable run${c.count===1?'':'s'}</h3></div><span>${c.confidence} confidence</span></div><div class="comparableMetrics visual">${metric('Efficiency',c.current.efficiency,c.baseline.efficiency,v=>v.toFixed(1)+' J/beat',true,'%')}${metric('Cardiac drift',c.current.drift,c.baseline.drift,v=>v.toFixed(1)+'%',false,' pp')}${metric('Heart rate',c.current.hr,c.baseline.hr,v=>Math.round(v)+' bpm',false,'%')}${metric('RPE',c.current.rpe,c.baseline.rpe,v=>v.toFixed(1)+'/10',false,'')}</div><details><summary>Comparison details</summary><div class="comparableMatchList">${matches}</div><p class="muted compact">Median similarity ${Math.round(c.medianSimilarity)}%. Similarity considers intensity, duration, distance, pace and workout type.</p></details></section>`;
}

function runExecutionBreakdownBodyHtml(r){
 const plan=r.planId?state.plan.find(p=>p.id===r.planId):null,d=workoutScoreDetails(r,plan);
 if(!d)return'<p class="muted">Not enough distance and duration information to calculate a score.</p>';
 const rows=d.components.map(c=>`<div class="executionCalcRow"><span>${esc(c.name)}</span><b>${Math.round(c.score)}/100</b><small><b>Scope: ${esc(c.scope||'whole session')}</b> · Effective weight ${Math.round(c.effectiveWeight*100)}%${c.reliability<1?` · ${Math.round(c.reliability*100)}% metric reliability`:''} · ${esc(c.detail)}</small></div>`).join('');
 const paceComp=d.components.find(c=>c.key==='pace'),powerComp=d.components.find(c=>c.key==='power');
 const conflict=paceComp&&powerComp&&Math.abs(paceComp.score-powerComp.score)>=12?`<div class="executionNotice"><b>Pace and power disagree</b><p>Terrain, wind, GPS or whole-run averaging may explain the difference. The coach treats this as mixed evidence rather than assuming either metric is correct on its own.</p></div>`:'';
 return`<div class="executionObjective"><small>WORKOUT OBJECTIVE</small><b>${esc(d.objective)}</b><span>${esc(d.interpretation)} · ${esc(d.evidenceQuality)} evidence</span></div>${plan?`<p class="muted compact">Matched to ${fmtDate(plan.date)} · ${esc(plan.type)} · ${plan.distance.toFixed(1)} km.</p>`:'<p class="muted compact">Ad hoc run: only directly observable components are scored. Missing targets reduce evidence quality rather than being awarded neutral points.</p>'}${conflict}<div class="executionCalcRows">${rows}</div><p class="muted compact"><b>Overall score:</b> weighted mean of available components after metric reliability is applied. Missing or low-confidence metrics lose weight rather than receiving an invented neutral score.</p>`;
}
function runExecutionBreakdownHtml(r){
 const plan=r.planId?state.plan.find(p=>p.id===r.planId):null,d=workoutScoreDetails(r,plan),score=d?.score;
 return`<details id="executionBreakdownFoldout" class="runExecutionBreakdown executionFoldout uiLevel3"><summary><span>Execution breakdown</span><b>${Number.isFinite(score)?score+'/100':'Not scored'}</b></summary><div class="executionFoldoutBody">${runExecutionBreakdownBodyHtml(r)}</div></details>`;
}
function renderRuns(){$('runList').innerHTML=state.runs.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=>{let m=metrics(r),ws=workoutScore(r),cr=comparableRunAnalysis(r),typeCls=workoutTypeClass(r.type),compareBadge=cr&&cr.confidence!=='Low'&&Number.isFinite(cr.efficiencyDelta)?`<span class="runCompareBadge ${cr.efficiencyDelta>=0?'better':'worse'}">${cr.efficiencyDelta>=0?'↑':'↓'} ${Math.abs(cr.efficiencyDelta).toFixed(1)}% vs similar</span>`:'';return`<article class="runCard clickable" role="button" tabindex="0" aria-label="Open ${esc(fmtDate(r.date))} ${esc(r.type)} run details" data-run="${r.id}"><div class="runCardTop"><span class="workoutTypeIcon ${typeCls}">${uiIcon(typeCls==='quality'?'quality':typeCls)}</span><div class="runIdentity"><small>${fmtDate(r.date)}</small><h3>${esc(r.type)}</h3><p>${r.distanceKm.toFixed(2)} km · ${fmtTime(r.durationSec)} · ${pace(m.pace)}</p></div>${ws!=null?circularGauge(ws,'score'):'<span class="runOpen">›</span>'}</div><div class="runMetricStrip"><span><small>Heart rate</small><b>${r.avgHr?Math.round(r.avgHr)+' bpm':'—'}</b></span><span><small>Power</small><b>${r.avgPower?Math.round(r.avgPower)+' W':'—'}</b></span><span><small>Efficiency</small><b>${dec(m.efficiencyJ,1)} J/beat</b></span></div><div class="runCardFoot"><span>${esc(matchSummary(r))}</span>${compareBadge}<span class="runOpen">Open intelligence ›</span></div></article>`}).join('')||`<div class="emptyState">${uiIcon('easy')}<h3>No runs yet</h3><p>Import a FIT/CSV file or add a manual run to start Workout Intelligence.</p></div>`}
function migrateImportedPower(){
 let changed=false,weight=Number(state.setup.bodyWeight)||0;
 if(!weight)return;
 state.runs.forEach(r=>{
   if((r.sourceFormat==='csv-timeseries'||String(r.id||'').startsWith('stryd-'))&&Number.isFinite(Number(r.avgPower))&&Number(r.avgPower)>0&&Number(r.avgPower)<20){
     r.avgPower=Math.round(Number(r.avgPower)*weight);
     r.powerUnit='W';
     changed=true;
   }
 });
 if(changed)save();
}
function ensureRunStreamMetrics(run){
 if(!run)return false;
 if(Number.isFinite(run.powerDrift)&&run.streamEvidence)return false;
 const records=Array.isArray(run.fitRecords)?run.fitRecords:null;
 if(records?.length){
   const analysis=streamAnalysis(records);
   if(analysis&&Number.isFinite(analysis.powerDrift)){
     run.drift=analysis.powerDrift;
     run.powerDrift=analysis.powerDrift;
     run.paceDrift=analysis.paceDrift;
     run.streamEvidence=analysis;
     return true;
   }
 }
 return false;
}
function refreshSavedStreamMetrics(){
 let changed=false;
 for(const run of state.runs||[])if(ensureRunStreamMetrics(run))changed=true;
 if(changed)save();
 return changed;
}

function renderMetrics(){
 refreshSavedStreamMetrics();
 let rs=completedRuns().slice().sort((a,b)=>a.date.localeCompare(b.date));
 let efficiencyRuns=rs.filter(r=>Number.isFinite(metrics(r).efficiencyJ));
 let driftRuns=rs.filter(r=>Number.isFinite(r.powerDrift));
 let latestEff=efficiencyRuns.at(-1),latestDrift=driftRuns.at(-1);
 let recentEff=efficiencyRuns.slice(-3).map(r=>metrics(r).efficiencyJ);
 let recentDrift=driftRuns.slice(-3).map(r=>r.powerDrift);

 $('metricKpis').innerHTML=
   kpi('Latest efficiency factor',latestEff?dec(metrics(latestEff).efficiencyJ,1)+' J/beat':'—','Average running power converted to joules of external work per heartbeat. Higher is better.')+
   kpi('3-run efficiency average',recentEff.length?dec(avg(recentEff),1)+' J/beat':'—')+
   kpi('Latest power cardiac drift',latestDrift?latestDrift.powerDrift.toFixed(1)+'%':'—','Change in the power-to-heart-rate relationship between run halves. Lower is better.')+
   kpi('3-run drift average',recentDrift.length?dec(avg(recentDrift),1)+'%':'—');

 let effValues=efficiencyRuns.map(r=>metrics(r).efficiencyJ).filter(Number.isFinite);
 let effLabels=efficiencyRuns.map(r=>dte(r.date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));
 drawLine($('efficiencyChart'),metricSeries(efficiencyRuns,r=>metrics(r).efficiencyJ),{
   min:effValues.length?Math.floor(Math.min(...effValues)-5):80,
   max:effValues.length?Math.ceil(Math.max(...effValues)+5):140,zero:false,ticks:6,
   formatY:v=>Math.round(v)+' J',labels:effLabels,allLabels:efficiencyRuns.length<=8,
   empty:'Log or import a run with average power and heart rate'});

 let driftValues=driftRuns.map(r=>r.powerDrift).filter(Number.isFinite);
 let driftLabels=driftRuns.map(r=>dte(r.date).toLocaleDateString(undefined,{day:'numeric',month:'short'}));
 let driftSeries=metricSeries(driftRuns,r=>r.powerDrift);
 drawLine($('driftChart'),driftSeries,{
   min:driftValues.length?Math.min(0,Math.floor(Math.min(...driftValues)-2)):0,
   max:driftValues.length?Math.max(10,Math.ceil(Math.max(...driftValues)+2)):10,ticks:6,
   formatY:v=>Math.round(v)+'%',labels:driftLabels,allLabels:driftRuns.length<=8,
   empty:'No valid power-based drift point yet. Import a FIT or detailed CSV with sufficient timestamped heart rate and running power.'});

 let summary=typeMetricSummary(rs);
 $('metricTypeSummary').innerHTML=summary.length?`<div class="metricTypeTable"><div class="metricTypeHead"><b>Run type</b><b>Efficiency avg</b><b>Efficiency best</b><b>Drift avg</b><b>Drift best</b></div>${summary.map(x=>`<div class="metricTypeRow"><span><i style="--runColor:${runTypeColors[x.type]}"></i>${esc(x.type)}</span><span>${Number.isFinite(x.effAvg)?x.effAvg.toFixed(1)+' J/beat':'—'}</span><span>${Number.isFinite(x.effBest)?x.effBest.toFixed(1)+' J/beat':'—'}</span><span>${Number.isFinite(x.driftAvg)?x.driftAvg.toFixed(1)+'%':'—'}</span><span>${Number.isFinite(x.driftBest)?x.driftBest.toFixed(1)+'%':'—'}</span></div>`).join('')}</div>`:'<span class="muted">No qualifying run metrics yet.</span>';
}
function assessmentRunId(a){return a.runId||`assessment-run-${a.id}`}
function syncAssessmentRun(a){
 let id=assessmentRunId(a),i=state.runs.findIndex(r=>r.id===id||r.assessmentId===a.id);
 let previous=i>=0?state.runs[i]:{};
 let planned=state.plan.find(p=>p.date===a.date&&p.type==='Fitness assessment');
 let run={...previous,id,assessmentId:a.id,source:'assessment',date:a.date,type:'Fitness assessment',
   distanceKm:Number(a.distance),durationSec:Number(a.time),
   avgHr:Number(a.thresholdHr)||previous.avgHr||null,
   avgPower:Number(a.criticalPower)||previous.avgPower||null,
   cadence:previous.cadence??null,rpe:previous.rpe??null,pain:previous.pain??null,
   recovery:previous.recovery??null,temperature:previous.temperature??null,
   notes:previous.notes||'Fitness assessment',planId:planned?.id||previous.planId};
 if(i>=0)state.runs[i]=run;else state.runs.push(run);
 a.runId=id;
}
function deleteAssessmentAndRun(a){
 state.runs=state.runs.filter(r=>r.id!==assessmentRunId(a)&&r.assessmentId!==a.id);
 state.assessments=state.assessments.filter(x=>x.id!==a.id);
}
function migrateAssessmentRuns(){
 state.assessments.forEach(syncAssessmentRun);
 save();
}
function renderAssessments(){$('assessmentList').innerHTML=state.assessments.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(a=>`<div class="panel clickable" data-assessment="${a.id}"><div class="panelHead"><div><b>${fmtDate(a.date)} · ${a.distance.toFixed(1)} km</b><p class="muted">${fmtTime(a.time)} · ${pace(a.time/a.distance)} · ${a.valid?'Valid and applied to future targets':'Not applied'}<br>Also included in run history and training metrics</p></div><span class="status ${a.valid?'completed':'rest'}">${a.valid?'valid':'invalid'}</span></div></div>`).join('')||'<div class="panel">No fitness assessment results entered.</div>'}
function renderCoach(){
 const engine=coachEngine(),c=engine.c,pred=engine.pred,gap=pred-state.setup.targetTime,report=evidenceBasedCoach(engine);
 $('coachTop').innerHTML=kpi('Evidence coverage',report.evidenceCoverage+'%','Available verified inputs')+kpi(engine.currentModel.provisional?'Provisional estimate':'Predicted time',fmtEstimate(pred,engine.currentModel.provisional),paceEstimate(pred,engine.currentModel.provisional))+kpi('Target gap',(gap>=0?'+':'−')+fmtEstimate(Math.abs(gap),engine.currentModel.provisional),gap<=0?'Inside target':'Outside target')+kpi('Current phase',phase(currentWeek()));
 $('fullAssessment').innerHTML=coachReportHtml(report,false);
}

function renderRace(){let engine=coachEngine(),c=engine.c,pred=engine.pred,provisional=engine.currentModel.provisional,targetPace=state.setup.targetTime/state.setup.raceDistance;$('raceKpis').innerHTML=kpi('Target time',fmtTime(state.setup.targetTime))+kpi('Target pace',pace(targetPace))+kpi(provisional?'Provisional finish':'Predicted finish',fmtEstimate(pred,provisional),provisional?'Sparse evidence':'Current evidence')+kpi('Predicted pace',paceEstimate(pred,provisional))+kpi('Target HR',Math.round(state.setup.thresholdHr*.92)+' bpm')+kpi('Target power',Math.round(state.setup.criticalPower*.88)+' W')+kpi('Evidence',provisional?'Provisional':Math.round(c.overall)+'%');let rd=state.setup.raceDistance,first=Math.max(1,Math.round(rd*.20)),final=Math.max(first+1,Math.round(rd*.75));$('racePacing').innerHTML=`<div class="note"><b>0–${first} km:</b> Start controlled, slightly slower than target pace. Let heart rate rise gradually.</div><div class="note"><b>${first}–${final} km:</b> Settle at target effort and protect fuelling. Avoid reacting to short pace fluctuations.</div><div class="note good"><b>After ${final} km:</b> Progress only when breathing, form and stomach remain stable. Otherwise preserve target effort.</div>`;$('raceFuel').innerHTML='<p><b>Carbohydrate:</b> 60–90 g/hour, practised in long runs.</p><p><b>Fluids:</b> approximately 400–800 ml/hour, adjusted for temperature and sweat rate.</p><p><b>Sodium:</b> use the same product and concentration tested in training.</p>';$('raceRules').innerHTML='<p>Slow down early if heart rate is unusually high at normal power.</p><p>Do not chase lost seconds on hills or crowded sections.</p><p>Use effort rather than pace when conditions are hot, windy or technical.</p>'}
function renderTrainingDays(){
 const box=$('daysGrid');if(!box)return;const enabled=state.days.filter(d=>d[1]),longDay=(enabled.find(d=>d[2]==='Long run')||enabled.at(-1))?.[0];
 box.innerHTML=`<div class="note trainingDayNote"><b>Set availability only</b><p class="muted compact">Tick the days you can run and select exactly one of those as the long-run day. The plan engine assigns every run type automatically according to race distance, phase and recovery.</p></div><div class="trainingDayHeader"><span>Day</span><span>Run</span><span>Long run</span></div>`+state.days.map((d,i)=>`<div class="trainingDayRow"><b>${d[0]}</b><label class="dayChoice"><input data-day="${i}" type="checkbox" ${d[1]?'checked':''}><span>Run</span></label><label class="dayChoice longChoice"><input data-long-day="${i}" name="longRunDay" type="radio" ${d[0]===longDay?'checked':''} ${d[1]?'':'disabled'}><span>Long</span></label></div>`).join('');
 box.querySelectorAll('[data-day]').forEach(cb=>cb.addEventListener('change',()=>{const i=Number(cb.dataset.day),radio=box.querySelector(`[data-long-day="${i}"]`);radio.disabled=!cb.checked;if(!cb.checked&&radio.checked){const replacement=[...box.querySelectorAll('[data-day]')].find(x=>x.checked);if(replacement)box.querySelector(`[data-long-day="${replacement.dataset.day}"]`).checked=true;}if(cb.checked&&![...box.querySelectorAll('[data-long-day]')].some(x=>x.checked))radio.checked=true;}));
}
function renderSettings(){let defs=[['planStart','Plan start','date'],['raceDate','Race date','date'],['raceName','Race name','text'],['raceDistance','Race distance km','number',1,200],['targetTime','Target time','time'],['currentWeekly','Current weekly km','number',0,300],['currentLongest','Current longest run km','number',0,200],['testDistance','Recent test distance km','number',.1,200],['testTime','Recent test time','time'],['thresholdHr','Threshold HR','number',60,240],['criticalPower','Critical power W','number',50,1000],['bodyWeight','Body weight kg','number',25,300],['maxWeekly','Max weekly km','number',1,400],['growth','Max weekly growth %','percent',1,30],['peakLong','Peak long run km','number',1,200],['taperDays','Taper days','number',0,42]];$('settingsGrid').innerHTML=defs.map(d=>{let v=state.setup[d[0]];if(d[2]=='time')v=fmtTime(v);if(d[2]=='percent')v=Math.round(v*100);const type=d[2]==='date'?'date':d[2]==='number'||d[2]==='percent'?'number':'text';const bounds=d[3]!==undefined?`min="${d[3]}" max="${d[4]}" step="${d[3]<1?'.1':'1'}"`:'';return`<div class="field"><label>${d[1]}</label><input data-setting="${d[0]}" data-type="${d[2]}" type="${type}" ${bounds} value="${esc(v)}"></div>`}).join('');
 let raceDistanceInput=document.querySelector('[data-setting="raceDistance"]');
 const inputSetup=()=>{let x={...state.setup};document.querySelectorAll('[data-setting]').forEach(el=>{let v=el.value,t=el.dataset.type;if(t==='number')v=Number(v);if(t==='time')v=parseTime(v);if(t==='percent')v=Number(v)/100;x[el.dataset.setting]=v});return x};
 const showRecommendedDate=()=>{let r=recommendedRaceDate(inputSetup()),box=$('raceDateRecommendation');if(box)box.innerHTML=`<b>Model-recommended race date: ${fmtDate(r.date)}</b><p class="muted compact">${r.totalWeeks} weeks total: ${r.requiredBuildWeeks.toFixed(1)} estimated build weeks, ${r.taperWeeks.toFixed(1)} taper weeks and an ideal-scenario buffer.</p><button id="recommendRaceDate" type="button" class="secondary">Use this date</button>`;let btn=$('recommendRaceDate');if(btn)btn.onclick=()=>{let dateInput=document.querySelector('[data-setting="raceDate"]');if(dateInput)dateInput.value=r.date;toast(`Recommended race date applied: ${fmtDate(r.date)}.`)};return r};
 $('raceDateRecommendation')?.remove();$('raceDefaultsNote')?.remove();$('settingsGrid').insertAdjacentHTML('afterend',`<div id="raceDefaultsNote" class="note"><b>${raceProfile(state.setup.raceDistance).label} training defaults</b><p class="muted compact">Changing race distance from 5 km through 100 km applies conservative recreational defaults for weekly distance, long run, growth, taper, training frequency and session types. Adjust them for injury history, experience and available time.</p></div>`);
 if(!$('raceDateRecommendation'))if(!$('raceDateRecommendation'))$('settingsGrid').insertAdjacentHTML('afterend','<div id="raceDateRecommendation" class="note"></div>');
 raceDistanceInput?.addEventListener('change',()=>{let d=Number(raceDistanceInput.value);if(!(d>0))return;let profile=raceProfile(d),values=raceProfileValues(d);Object.entries(values).forEach(([key,value])=>{let input=document.querySelector(`[data-setting="${key}"]`);if(input)input.value=key==='growth'?Math.round(value*100):value});applyRaceProfileDays(profile);renderTrainingDays();let r=showRecommendedDate(),dateInput=document.querySelector('[data-setting="raceDate"]');if(dateInput)dateInput.value=r.date;toast(`${profile.label} defaults and recommended race date ${fmtDate(r.date)} applied.`)});
 ['planStart','currentWeekly','currentLongest','maxWeekly','growth','peakLong','taperDays','testDistance','testTime','targetTime'].forEach(key=>document.querySelector(`[data-setting="${key}"]`)?.addEventListener('change',showRecommendedDate));
 showRecommendedDate();
 renderTrainingDays()}
function weeklyCompletedLongs(){
 return Array.from({length:weeks()},(_,i)=>{
   let st=weekStart(i+1),en=new Date(st.getTime()+7*DAY);
   let r=completedRuns().filter(x=>dte(x.date)>=st&&dte(x.date)<en);
   return r.length?Math.max(...r.map(x=>Number(x.distanceKm)||0)):null;
 });
}

function recoveryPainState(){
 const recent=completedRuns().filter(r=>Number.isFinite(Number(r.pain))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 if(!recent.length)return{count:0,average:null,max:null,status:'No pain data'};
 const vals=recent.map(r=>Number(r.pain));const average=avg(vals),max=Math.max(...vals);
 const status=max>=5?'Pain needs attention':max>=3?'Monitor pain':'No significant pain signal';
 return{count:vals.length,average,max,status};
}
function hrvDirection(hist){
 const vals=hist.map(x=>x.value);if(vals.length<2)return{symbol:'→',label:'Building',delta:null};
 const short=avg(vals.slice(-Math.min(3,vals.length))),prior=avg(vals.slice(-Math.min(6,vals.length),-Math.min(3,vals.length)));
 if(!Number.isFinite(prior))return{symbol:'→',label:'Building',delta:null};
 const delta=prior?short/prior-1:0;
 return Math.abs(delta)<.03?{symbol:'→',label:'Stable',delta}:{symbol:delta>0?'▲':'▼',label:delta>0?'Improving':'Declining',delta};
}
function recoveryConclusion(hrv,pain){
 if((pain.max??0)>=5||hrv.factor<=.94)return{label:'Recovery compromised',cls:'bad',recommendation:'Reduce intensity and reassess symptoms before the next demanding session.'};
 if((pain.max??0)>=3||hrv.factor<1)return{label:'Monitor',cls:'warn',recommendation:'Continue cautiously. Keep easy running easy and avoid adding unplanned load.'};
 return{label:'Recovered',cls:'good',recommendation:'Recovery evidence supports the planned training load.'};
}
function readinessModel(){
 const hrv=hrvModel(),pain=recoveryPainState(),painAdj=painAdjustment(pain);
 const hrvAdj=hrv.ready?hrv.factor-1:0;
 const totalAdj=clamp(hrvAdj+painAdj.adjustment,-.20,0);
 const modifier=1+totalAdj;
 let label='Normal',cls='normal';
 if(modifier<=.94||(pain.max??0)>=5){label='Restricted';cls='restricted'}
 else if(modifier<.995||(pain.max??0)>=3){label='Reduced';cls='reduced'}
 const learned=adaptiveFactorDetails(currentWeek()).cumulativeFactor||1;
 const effective=clamp(learned*modifier,state.setup.minFactor,state.setup.maxFactor);
 const next=nextTrainingSessionAfter(iso(today()));
 const nominalDistance=next?Number(next.distance):null;
 const moderatedDistance=Number.isFinite(nominalDistance)?Math.max(0,nominalDistance*modifier):null;
 return{label,cls,modifier,totalAdj,hrv,hrvAdj,pain,painAdj,learned,effective,next,nominalDistance,moderatedDistance};
}
function readinessHistoryData(days=14){
 const hist=hrvHistory().slice().sort((a,b)=>a.date.localeCompare(b.date)),end=today(),rows=[];
 for(let i=days-1;i>=0;i--){
   const d=new Date(end.getTime()-i*DAY),date=iso(d),prior=hist.filter(x=>x.date<=date),vals=prior.map(x=>x.value),n=vals.length;
   let hrvFactor=1;
   if(n>1){
     let rollingValues,baselinePool,maxPenalty;
     if(n<=3){rollingValues=vals.slice();baselinePool=vals.slice();maxPenalty=.01}
     else if(n<=6){rollingValues=vals.slice(-3);baselinePool=vals.slice();maxPenalty=.03}
     else if(n<=20){rollingValues=vals.slice(-7);baselinePool=vals.slice(-Math.min(21,n));maxPenalty=.06}
     else{rollingValues=vals.slice(-7);baselinePool=vals.slice(Math.max(0,n-28),n-7);maxPenalty=.10}
     const rolling=avg(rollingValues),baseline=median(baselinePool)||median(vals)||rolling,deviation=baseline>0?rolling/baseline-1:0;
     let raw=1;if(deviation<=-.35)raw=.90;else if(deviation<=-.25)raw=.94;else if(deviation<=-.15)raw=.98;
     hrvFactor=Math.max(1-maxPenalty,raw);
   }
   const recentPain=(state.runs||[]).filter(r=>r.date<=date&&r.date>=iso(new Date(d.getTime()-7*DAY))).map(r=>Number(r.pain)).filter(Number.isFinite);
   const maxPain=recentPain.length?Math.max(...recentPain):0;
   const painAdj=maxPain>=7?-.10:maxPain>=5?-.06:maxPain>=3?-.03:0;
   const modifier=clamp(1+(hrvFactor-1)+painAdj,.80,1);
   rows.push({date,modifier,hrvFactor,painAdj});
 }
 return rows;
}
function readinessHistoryHtml(rows){
 if(!rows?.length)return'<p class="muted">No readiness history available.</p>';
 const W=760,H=190,pad={l:52,r:20,t:18,b:38},min=.80,max=1.01,cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;
 const px=i=>rows.length===1?pad.l+cw/2:pad.l+i*cw/(rows.length-1),py=v=>pad.t+(max-v)/(max-min)*ch;
 const points=rows.map((r,i)=>`${px(i).toFixed(1)},${py(r.modifier).toFixed(1)}`).join(' ');
 const labels=rows.filter((_,i)=>i===0||i===rows.length-1||i%4===0).map((r,i)=>`<text x="${px(rows.indexOf(r))}" y="${H-12}" text-anchor="middle">${fmtDate(r.date).replace(/ .*$/,'')}</text>`).join('');
 return`<svg class="readinessSvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Recent readiness modifier history"><line x1="${pad.l}" y1="${py(1)}" x2="${W-pad.r}" y2="${py(1)}" class="readinessBaseline"/><polyline points="${points}" class="readinessLine"/>${rows.map((r,i)=>`<circle cx="${px(i)}" cy="${py(r.modifier)}" r="4" class="readinessPoint"><title>${fmtDate(r.date)} · ${r.modifier.toFixed(3)}</title></circle>`).join('')}<g class="readinessAxis"><text x="${pad.l-8}" y="${py(1)+5}" text-anchor="end">1.000</text><text x="${pad.l-8}" y="${py(.9)+5}" text-anchor="end">0.900</text>${labels}</g></svg>`;
}

function renderRecovery(){
 const statusBox=$('recoveryStatus');if(!statusBox)return;
 const hrv=hrvModel(),pain=recoveryPainState(),hist=hrvHistory(),dir=hrvDirection(hist),conclusion=recoveryConclusion(hrv,pain);
 const afd=adaptiveFactorDetails(Math.max(1,currentWeek()));
 const maturity=hrv.count===0?'No profile':hrv.count===1?'Provisional':hrv.count<=6?'Early':hrv.count<=20?'Developing':'Established';
 const confidence=hrv.count===0?'No HRV evidence':`${maturity} · ${hrv.count} value${hrv.count===1?'':'s'}`;
 const ready=readinessModel();
 statusBox.innerHTML=`<article class="panel recoveryConclusion ${conclusion.cls} visualRecovery uiLevel1"><div class="recoveryMain"><span>${uiIcon('recovery')}</span><div><small>RECOVERY</small><strong>${conclusion.label}</strong></div><span class="recoveryConfidence">${confidence}</span></div><div class="recoveryQuickGrid"><div><small>HRV</small><b>${Number.isFinite(hrv.rolling)?Math.round(hrv.rolling)+' ms':'—'}</b><span>${dir.symbol} ${dir.label}</span></div><div><small>Baseline</small><b>${Number.isFinite(hrv.baseline)?Math.round(hrv.baseline)+' ms':'—'}</b><span>${hrv.count?`${hrv.deviation>=0?'+':''}${Math.round(hrv.deviation*100)}%`:'Building'}</span></div><div><small>Pain</small><b>${pain.count?pain.average.toFixed(1)+'/10':'—'}</b><span>${pain.status}</span></div></div><p class="recoveryRecommendation">${conclusion.recommendation}</p></article>`;
 $('readinessBadge').textContent=`${ready.label} · temporary ${ready.modifier.toFixed(3)}`;
 const nextImpact=ready.next&&Number.isFinite(ready.nominalDistance)?(Math.abs(ready.modifier-1)<.005
   ?`No temporary moderation is indicated. ${ready.next.type} remains ${ready.nominalDistance.toFixed(1)} km.`
   :`If applied to load, ${ready.next.type} ${ready.nominalDistance.toFixed(1)} km corresponds to ${ready.moderatedDistance.toFixed(1)} km at the current readiness modifier.`)
   :'No upcoming running session is available for an impact example.';
 $('readinessDetail').innerHTML=`<div class="readinessHero ${ready.cls} uiLevel2"><div><small>CURRENT READINESS</small><strong>${ready.label}</strong><span>Temporary modifier ${ready.modifier.toFixed(3)}</span></div><div class="readinessFormula"><div><span>HRV contribution</span><b>${ready.hrvAdj?`${ready.hrvAdj>0?'+':''}${(ready.hrvAdj*100).toFixed(0)}%`:'0%'}</b></div><div><span>Pain contribution</span><b>${ready.painAdj.adjustment?`${(ready.painAdj.adjustment*100).toFixed(0)}%`:'0%'}</b></div><div class="total"><span>Temporary readiness</span><b>${ready.modifier.toFixed(3)}</b></div></div></div>
 <details class="readinessCalc"><summary>How readiness is calculated</summary><div class="readinessEvidenceRow"><b>Garmin HRV</b><span>${ready.hrvAdj?`${(ready.hrvAdj*100).toFixed(0)}%`:'0%'}</span><p>${esc(ready.hrv.detail)}</p></div><div class="readinessEvidenceRow"><b>Recent pain</b><span>${ready.painAdj.adjustment?`${(ready.painAdj.adjustment*100).toFixed(0)}%`:'0%'}</span><p>${esc(ready.painAdj.detail)}</p></div><div class="readinessRule"><b>Combination</b><p>Readiness = 1.000 + HRV adjustment + pain adjustment. Favorable recovery does not create a bonus above 1.000.</p></div><div class="readinessRule"><b>Separation from adaptation</b><p>Readiness is temporary recovery context. Numeric Pace & Power and Distance & Load calibration factors are shown only in Progress.</p></div></details>
 <div class="readinessImpact"><small>CURRENT PRESCRIPTION IMPACT</small><b>${esc(nextImpact)}</b><p>Readiness primarily moderates exposure. It does not automatically multiply Pace & Power targets.</p></div>`;
 $('readinessHistory').innerHTML=readinessHistoryHtml(readinessHistoryData(14));
 $('hrvTrendBadge').textContent=confidence;
 $('hrvLegend').innerHTML='<span><i class="legendNightly"></i>Nightly HRV</span><span><i class="legendAverage"></i>Recent average</span><span><i class="legendBaseline"></i>Personal baseline</span>';
 const painAdj=painAdjustment(pain),recoveryChange=Math.round(((hrv.factor-1)+painAdj.adjustment)*100);
 $('recoveryAdaptive').innerHTML=`<div class="recoveryContribution"><span>Current recovery modifier contribution</span><strong class="${recoveryChange<0?'negative':''}">${recoveryChange?`${recoveryChange}%`:'0%'}</strong><p>${esc(hrv.detail)} ${esc(painAdj.detail)}</p><small>Numeric learned calibration lives in Progress; this tab only explains temporary recovery state.</small></div>`;
 $('hrvExplanation').innerHTML=`<div><b>Starts on day 1</b><p>The first Garmin value creates a provisional baseline. It is shown immediately, but one value cannot reduce the plan.</p></div><div><b>Influence grows with evidence</b><p>2–3 values can reduce future load by at most 1%; 4–6 by 3%; 7–20 by 6%; and 21+ by 10%.</p></div><div><b>Trend, not one night</b><p>The model compares a recent average with your personal median baseline. Wider bands prevent normal nightly variation from causing unnecessary changes.</p></div><div><b>One recovery location</b><p>This tab is the primary home for Readiness. Progress is the single home for the two learned calibration pathways.</p></div>`;
 drawHrvChart();
}
function drawHrvChart(){
 const canvas=$('hrvChart');if(!canvas)return;const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,hist=hrvHistory(),model=hrvModel();ctx.clearRect(0,0,W,H);updateChartTable(canvas,'View HRV chart data',['Date','Previous-night HRV'],hist.map(item=>[fmtDate(item.date),`${Math.round(item.value)} ms`]));
 if(!hist.length){ctx.fillStyle='#DDF6FF';ctx.font='600 27px system-ui';ctx.textAlign='center';ctx.fillText('Log previous-night Garmin HRV to start the trend',W/2,H/2);return}
 const shown=hist.slice(-28),vals=shown.map(x=>x.value),base=Number.isFinite(model.baseline)?model.baseline:median(vals),recentN=model.count<=3?model.count:model.count<=6?3:7;
 const rolling=shown.map((x,i)=>avg(shown.slice(Math.max(0,i-recentN+1),i+1).map(y=>y.value)));
 let min=Math.min(...vals,base*.62),max=Math.max(...vals,base*1.18),pad=Math.max(3,(max-min)*.08);min=Math.max(0,min-pad);max+=pad;
 const left=78,right=24,top=34,bottom=70,cw=W-left-right,ch=H-top-bottom,px=i=>shown.length===1?left+cw/2:left+i*cw/(shown.length-1),py=v=>top+(max-v)/(max-min)*ch;
 const bands=[{from:min,to:base*.65,fill:'rgba(197,73,63,.10)'},{from:base*.65,to:base*.75,fill:'rgba(224,157,42,.10)'},{from:base*.75,to:max,fill:'rgba(55,151,91,.08)'}];
 bands.forEach(b=>{const y1=py(Math.min(max,b.to)),y2=py(Math.max(min,b.from));ctx.fillStyle=b.fill;ctx.fillRect(left,y1,cw,Math.max(0,y2-y1))});
 ctx.font='20px system-ui';ctx.textAlign='right';for(let i=0;i<5;i++){const v=min+(max-min)*i/4,y=py(v);ctx.strokeStyle='#4CC9F0';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(W-right,y);ctx.stroke();ctx.fillStyle='#DDF6FF';ctx.fillText(Math.round(v),left-12,y+7)}
 ctx.save();ctx.strokeStyle='#4CC9F0';ctx.setLineDash([14,10]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(left,py(base));ctx.lineTo(W-right,py(base));ctx.stroke();ctx.restore();
 ctx.strokeStyle='#3B82F6';ctx.lineWidth=4;ctx.beginPath();rolling.forEach((v,i)=>i?ctx.lineTo(px(i),py(v)):ctx.moveTo(px(i),py(v)));ctx.stroke();
 ctx.strokeStyle='#4CC9F0';ctx.lineWidth=4;ctx.beginPath();vals.forEach((v,i)=>i?ctx.lineTo(px(i),py(v)):ctx.moveTo(px(i),py(v)));ctx.stroke();vals.forEach((v,i)=>{ctx.fillStyle='#4CC9F0';ctx.beginPath();ctx.arc(px(i),py(v),6,0,Math.PI*2);ctx.fill()});
 ctx.font='18px system-ui';ctx.fillStyle='#DDF6FF';ctx.textAlign='center';const step=Math.max(1,Math.ceil(shown.length/6));shown.forEach((x,i)=>{if(i%step&&i!==shown.length-1)return;const d=dte(x.date);ctx.fillText(`${d.toLocaleDateString(undefined,{weekday:'short'})} ${d.getDate()}/${d.getMonth()+1}`,px(i),H-32)});ctx.save();ctx.translate(24,H/2);ctx.rotate(-Math.PI/2);ctx.fillText('HRV (ms)',0,0);ctx.restore();
}
function renderPlanHealth(){
 const box=$('planHealthContent');if(!box)return;
 const health=planHealthAssessment(),report=health.validation;state.lastPlanHealth=report;
 const cls=health.score>=80?'good':health.score>=65?'warn':'bad';
 box.innerHTML=`<div class="planHealthSummary ${cls}"><div class="planHealthScore"><strong>${Math.round(health.score)}</strong><span>/100</span></div><div><b>${esc(health.label)} plan structure</b><p>${report.valid?'The generated plan is structurally valid.':'Validation found issues that reduce the health score.'} This score evaluates plan design, not programme completion.</p></div></div><details class="planHealthDetails"><summary>How the score is calculated</summary><div class="planHealthComponents">${health.components.map(x=>`<div><span>${esc(x.name)} <small>${Math.round(x.weight*100)}% weight</small></span><b>${Math.round(x.score)}/100</b><i><em style="width:${clamp(x.score,0,100)}%"></em></i><p>${esc(x.detail)}</p></div>`).join('')}</div><p class="muted compact">Structural validation deductions: ${report.errors} errors × 8 points and ${report.warnings} warnings × 2 points.</p></details><div class="planHealthRecommendations"><h4>Improvement recommendations</h4>${health.recommendations.map((x,i)=>`<div><strong>${i+1}</strong><p>${esc(x)}</p></div>`).join('')}</div>`;
}
function renderMigrationReport(){const box=$('migrationReport');if(!box)return;const m=state.migration||migrationReport;box.innerHTML=`<div class="migrationStatus good"><b>Upgrade status: ${esc(m.status||'ready')}</b><span>Schema ${esc(m.from??'new')} → ${SCHEMA}</span><span>${Number(m.runs)||0} runs · ${Number(m.assessments)||0} assessments preserved</span><span>${Number(m.fieldsRecovered)||0} invalid or missing fields repaired</span><small>Storage source: ${esc(m.source||migrationReport.source||STORAGE_KEY)}</small></div>`;}

const INJURY_STAGES=[
 {name:'Protect & settle',goal:'Calm symptoms and restore comfortable daily movement.',criteria:['Symptoms stable or improving','No new swelling or bruising','Walking pain ≤3/10']},
 {name:'Restore movement',goal:'Recover comfortable range of motion and basic muscle control.',criteria:['Walking pain ≤1/10','Current pain ≤3/10','Gentle double-leg loading tolerated']},
 {name:'Build capacity',goal:'Progress strength, control and tolerance to repeated loading.',criteria:['Current pain ≤2/10','Repeated bridge or hinge controlled','No worse the next morning']},
 {name:'Return to run',goal:'Reintroduce impact with controlled walk–run intervals.',criteria:['Walking pain 0/10','Gentle hopping tolerated','Pain remains ≤2/10','No next-morning flare']},
 {name:'Rebuild running',goal:'Increase easy continuous running before speed, hills or hard sessions.',criteria:['At least 10 minutes running tolerated','No altered gait','No next-morning flare']},
 {name:'Return to performance',goal:'Restore normal running volume, faster running and hills.',criteria:['At least 30 minutes easy running tolerated','Pain ≤1/10','No next-morning flare','Strength and impact confidence restored']}
];
const INJURY_EXERCISES={
 hamstring:[
  {stage:0,name:'Pain-limited walking',dose:'5–10 minutes, 2–4 times today',purpose:'Maintain circulation and normal gait without provoking the injured tissue.',steps:['Walk on level ground at an easy pace.','Keep stride length short enough to avoid pulling or limping.','Stop before pain rises above 2/10 or gait changes.'],why:'Selected while symptoms still need settling and normal walking is the first functional target.',progress:'Increase total walking only when symptoms are no worse later or the next morning.'},
  {stage:1,name:'Double-leg bridge',dose:'3 sets of 8–12 controlled repetitions',purpose:'Restore early hamstring and glute loading with both feet supported.',steps:['Lie on your back with knees bent and feet hip-width apart.','Brace gently, press through both heels and lift the pelvis.','Stop when shoulders, hips and knees form a comfortable line.','Hold 2 seconds, then lower slowly over 3 seconds.'],why:'Builds basic posterior-chain control before demanding single-leg strength.',progress:'Progress when all sets are controlled with pain ≤2/10 and no next-morning increase.'},
  {stage:2,name:'Long-lever bridge hold',dose:'4 holds of 20–30 seconds',purpose:'Increase hamstring load tolerance at a longer muscle length.',steps:['Lie on your back with heels farther from the hips than in a normal bridge.','Press the heels down and lift the pelvis only as high as can be controlled.','Keep the pelvis level and breathe normally.','Lower slowly and rest 45–60 seconds.'],why:'Targets the remaining strength deficit that commonly limits progression from walking to impact.',progress:'Progress when four holds are completed without cramping, shaking or next-day worsening.'},
  {stage:2,name:'Supported hip hinge',dose:'3 sets of 8–10 repetitions',purpose:'Restore controlled hip flexion and hamstring loading in standing.',steps:['Stand tall with one hand lightly supported on a wall or chair.','Soften the knees and push the hips backward while keeping the spine neutral.','Stop before pain, pulling or loss of control.','Drive the hips forward and return to standing slowly.'],why:'Prepares the hamstring for the stance and loading pattern needed in running.',progress:'Increase range before adding external load.'},
  {stage:3,name:'Walk–run intervals',dose:'6 × 1 minute easy run / 2 minutes walk',purpose:'Reintroduce impact in small, measurable doses.',steps:['Warm up with 8–10 minutes brisk walking.','Run at an easy, relaxed pace with short steps.','Walk for two minutes between repetitions.','Stop for pain above 2/10, limping or increasing tightness.'],why:'Impact criteria are met, but continuous running capacity has not yet been demonstrated.',progress:'Add running time only when symptoms return to baseline by the next morning.'},
  {stage:4,name:'Easy continuous run',dose:'10–30 minutes at conversational effort',purpose:'Build continuous running tolerance before speed or hills.',steps:['Begin slower than normal easy pace.','Keep cadence natural and avoid deliberate stride lengthening.','Finish while movement still feels symmetrical.','Record pain during, after and the next morning.'],why:'The priority is restoring duration without a symptom flare, not improving fitness.',progress:'Increase one variable at a time: duration first, then frequency, then pace.'},
  {stage:5,name:'Controlled strides',dose:'4–6 × 15 seconds at 70–80% speed',purpose:'Restore faster force production before unrestricted training.',steps:['Complete after an easy warm-up.','Accelerate smoothly rather than sprinting.','Stay relaxed and stop well before maximal speed.','Walk fully between repetitions.'],why:'Easy running is tolerated; faster loading is the final limitation before unrestricted training.',progress:'Progress speed gradually only when the same-day and next-morning response remain stable.'}
 ],
 muscle:[
  {stage:0,name:'Comfortable range and walking',dose:'5–10 minutes, several times daily',purpose:'Maintain comfortable movement while the irritated muscle settles.',steps:['Move only through a comfortable range.','Walk without limping or compensating.','Stop for sharp pain or increasing tightness.'],why:'Early muscle rehabilitation starts with normal daily movement.',progress:'Increase duration only after a stable next-morning response.'},
  {stage:1,name:'Low-load isometric hold',dose:'5 × 20–30 seconds',purpose:'Reintroduce muscle tension without fast movement.',steps:['Choose a position that gently activates the affected muscle.','Build tension gradually to a comfortable moderate effort.','Hold while breathing normally.','Release slowly and rest 30–45 seconds.'],why:'Isometric loading provides a controlled first strength exposure.',progress:'Progress when pain stays ≤2/10 and no flare occurs later or next morning.'},
  {stage:2,name:'Slow controlled strengthening',dose:'3 × 8–12 repetitions',purpose:'Restore strength through a comfortable range.',steps:['Use body weight or light resistance.','Lift in 2 seconds and lower in 3 seconds.','Keep movement smooth and symmetrical.','Stop before technique changes.'],why:'Muscle capacity must recover before impact and running.',progress:'Increase range, then resistance, one step at a time.'},
  {stage:3,name:'Walk–run intervals',dose:'6 × 1 minute easy run / 2 minutes walk',purpose:'Reintroduce impact in measured doses.',steps:['Warm up by walking.','Run easily with relaxed short steps.','Walk between repetitions.','Stop for pain above 2/10 or altered gait.'],why:'Strength is emerging but continuous impact tolerance is unproven.',progress:'Increase running time only after two stable exposures.'},
  {stage:4,name:'Easy continuous run',dose:'10–30 minutes conversational',purpose:'Rebuild continuous running tolerance.',steps:['Start slower than normal.','Use flat predictable terrain.','Finish before symptoms increase.','Check the next-morning response.'],why:'Duration is restored before speed, hills or maximal force.',progress:'Increase one variable at a time.'},
  {stage:5,name:'Controlled faster running',dose:'4–6 × 15 seconds at 70–80%',purpose:'Restore faster force production.',steps:['Warm up fully.','Accelerate smoothly.','Avoid maximal sprinting.','Walk to full recovery.'],why:'Faster loading is the last step after easy running is stable.',progress:'Increase speed gradually across several symptom-stable sessions.'}
 ],
 tendon:[
  {stage:0,name:'Load modification and comfortable walking',dose:'Short comfortable bouts through the day',purpose:'Reduce provocative load without complete rest.',steps:['Avoid the activity that clearly increases symptoms.','Keep walking within a comfortable range.','Use even, controlled steps.'],why:'Tendon symptoms usually respond better to adjusted loading than abrupt complete rest.',progress:'Increase daily activity only when symptoms remain stable the next morning.'},
  {stage:1,name:'Tendon isometric hold',dose:'5 × 30–45 seconds at moderate effort',purpose:'Introduce controlled tendon loading.',steps:['Choose a stable position that loads the affected tendon.','Build effort gradually.','Hold without bouncing.','Rest 45–60 seconds.'],why:'A sustained hold is a measurable first loading step.',progress:'Progress when pain remains mild and returns to baseline by the next morning.'},
  {stage:2,name:'Slow resistance exercise',dose:'3 × 8–12 repetitions',purpose:'Build tendon and muscle capacity.',steps:['Use a controlled full comfortable range.','Take 3 seconds through the lowering phase.','Avoid sudden rebounds.','Keep the final repetitions challenging but controlled.'],why:'Progressive resistance is the core capacity-building step for a tendon pathway.',progress:'Add resistance before adding speed.'},
  {stage:3,name:'Impact preparation',dose:'3 × 20–30 seconds',purpose:'Test low-level elastic loading.',steps:['Begin with quiet marching, heel raises or gentle jogging in place.','Keep rhythm even and contacts quiet.','Stop for increasing pain or guarding.'],why:'Impact tolerance must be established before running.',progress:'Require two stable next-morning responses before walk–run.'},
  {stage:4,name:'Easy run exposure',dose:'10–30 minutes easy',purpose:'Rebuild running-specific tendon tolerance.',steps:['Use flat terrain.','Keep pace conversational.','Avoid hills and speed initially.','Record next-morning stiffness and pain.'],why:'Running load is added only after strength and impact are stable.',progress:'Increase duration, then frequency, then pace.'},
  {stage:5,name:'Elastic and hill reintroduction',dose:'4–6 short controlled efforts',purpose:'Restore higher tendon loading demands.',steps:['Warm up fully.','Start with gentle strides or mild inclines.','Keep efforts submaximal.','Allow full recovery.'],why:'Speed and hills create higher tendon load and belong last.',progress:'Progress only after repeated stable easy runs.'}
 ],
 knee:[
  {stage:0,name:'Comfortable knee motion and walking',dose:'5–10 minutes, several times daily',purpose:'Maintain knee movement without provoking symptoms.',steps:['Bend and straighten the knee in a comfortable range.','Walk with an even stride.','Avoid deep painful positions.'],why:'The first goal is normal daily function and symptom stability.',progress:'Increase movement when pain and swelling do not rise.'},
  {stage:1,name:'Supported sit-to-stand',dose:'3 × 8 repetitions',purpose:'Restore basic knee and hip control.',steps:['Use a chair high enough to remain comfortable.','Keep knees tracking over the feet.','Stand smoothly and sit over 3 seconds.','Use hand support if needed.'],why:'This tests a functional double-leg loading pattern.',progress:'Lower the chair height gradually when pain remains ≤2/10.'},
  {stage:2,name:'Step-down control',dose:'3 × 6–10 each side',purpose:'Build single-leg control needed for running.',steps:['Stand on a low step with support nearby.','Lower the opposite heel slowly toward the floor.','Keep pelvis level and knee aligned.','Return smoothly.'],why:'Running requires repeated single-leg knee control.',progress:'Increase step height only after controlled symptom-stable sets.'},
  {stage:3,name:'Low-level impact and walk–run',dose:'3 × 20 seconds then 6 × 1 minute run',purpose:'Reintroduce impact progressively.',steps:['Begin with quiet jogging in place.','Progress to easy flat walk–run intervals.','Stop for swelling, limp or increasing pain.'],why:'Impact is tested after daily and strength tasks are controlled.',progress:'Require two stable exposures before continuous running.'},
  {stage:4,name:'Easy continuous run',dose:'10–30 minutes flat and easy',purpose:'Rebuild running tolerance.',steps:['Use flat terrain.','Keep effort conversational.','Avoid downhill and speed initially.','Monitor the next morning.'],why:'Duration returns before more demanding knee loads.',progress:'Add duration before hills or pace.'},
  {stage:5,name:'Controlled hills or pace',dose:'4–6 short submaximal efforts',purpose:'Restore higher knee load.',steps:['Choose either gentle hills or short strides, not both.','Warm up fully.','Keep technique controlled.','Stop before fatigue changes form.'],why:'Higher-load running is reintroduced last.',progress:'Increase one demand at a time across stable sessions.'}
 ],
 ankle:[
  {stage:0,name:'Ankle pumps and comfortable walking',dose:'2–3 minutes, several times daily',purpose:'Maintain motion and reduce guarding.',steps:['Move the ankle slowly up and down.','Make small comfortable circles.','Walk only without marked limp.'],why:'Early ankle recovery starts with motion and protected weight bearing.',progress:'Increase walking as swelling and pain remain stable.'},
  {stage:1,name:'Supported calf raise',dose:'3 × 8–12 repetitions',purpose:'Restore basic ankle loading.',steps:['Hold a stable support.','Rise through both feet slowly.','Pause briefly at the top.','Lower over 3 seconds.'],why:'Calf and ankle control are essential before balance and impact.',progress:'Shift gradually toward the affected side.'},
  {stage:2,name:'Single-leg balance',dose:'4 × 20–30 seconds',purpose:'Restore ankle control and confidence.',steps:['Stand near support.','Keep foot tripod contact.','Maintain a level pelvis.','Progress by reducing hand support.'],why:'Balance and joint control reduce the gap to running.',progress:'Progress to gentle reaches when stable.'},
  {stage:3,name:'Low-level hops and walk–run',dose:'3 × 10 gentle hops then 6 × 1 minute run',purpose:'Reintroduce impact and direction control.',steps:['Begin with quiet double-leg hops.','Progress only if contacts are symmetrical.','Use flat walk–run intervals.','Stop for swelling or instability.'],why:'Impact and confidence must be demonstrated before continuous running.',progress:'Require two stable exposures.'},
  {stage:4,name:'Easy continuous run',dose:'10–30 minutes flat and easy',purpose:'Rebuild running tolerance.',steps:['Use a predictable surface.','Avoid trails and sharp turns initially.','Keep effort easy.','Check swelling and pain later and next morning.'],why:'Continuous straight-line running precedes uneven ground.',progress:'Increase duration before terrain complexity.'},
  {stage:5,name:'Direction and terrain progression',dose:'4–6 short controlled drills',purpose:'Restore trail, cornering and faster-running demands.',steps:['Begin with gentle direction changes.','Progress to mild uneven terrain.','Keep speed submaximal.','Stop for instability.'],why:'Complexity and speed are final ankle demands.',progress:'Increase one challenge at a time.'}
 ],
 foot:[
  {stage:0,name:'Comfortable foot loading',dose:'Short level walks through the day',purpose:'Maintain daily function without provoking focal foot symptoms.',steps:['Use supportive footwear.','Keep walking bouts short.','Avoid barefoot impact if it increases pain.'],why:'Foot symptoms need controlled weight-bearing before strengthening.',progress:'Increase only when walking and next-morning pain remain stable.'},
  {stage:1,name:'Foot tripod and toe control',dose:'3 × 8–12 repetitions',purpose:'Restore intrinsic foot control.',steps:['Keep heel, base of big toe and base of little toe in contact.','Gently shorten the foot without curling toes.','Hold 3 seconds.','Relax fully.'],why:'Basic foot control supports later calf and impact loading.',progress:'Perform in standing once seated control is easy.'},
  {stage:2,name:'Slow calf raise',dose:'3 × 8–12 repetitions',purpose:'Build foot and calf load tolerance.',steps:['Use support.','Rise slowly through the forefoot.','Keep pressure even across the toes.','Lower over 3 seconds.'],why:'Running requires repeated forefoot and arch loading.',progress:'Progress from double- to single-leg when symptom stable.'},
  {stage:3,name:'Impact preparation',dose:'3 × 20 seconds',purpose:'Test low-level foot impact tolerance.',steps:['Begin with marching or gentle jogging in place.','Keep contacts quiet.','Stop for focal bone pain or increasing symptoms.'],why:'Impact must be demonstrated before running.',progress:'Two stable next-morning responses are required.'},
  {stage:4,name:'Easy run exposure',dose:'10–30 minutes easy',purpose:'Rebuild running-specific foot tolerance.',steps:['Use flat predictable terrain.','Wear familiar supportive shoes.','Keep effort easy.','Stop for focal or escalating pain.'],why:'Easy running returns after walking, strength and impact are stable.',progress:'Increase duration before speed or hills.'},
  {stage:5,name:'Terrain and pace progression',dose:'4–6 short controlled efforts',purpose:'Restore higher forefoot and arch demand.',steps:['Add either mild hills or short strides.','Keep efforts submaximal.','Allow full recovery.','Monitor the following morning.'],why:'Higher-load foot demands are the final progression.',progress:'Increase only one variable at a time.'}
 ],
 bone:[
  {stage:0,name:'Protected daily activity only',dose:'No impact exercise until professionally assessed',purpose:'Avoid adding load to a possible bone-stress injury.',steps:['Do not run, hop or perform impact tests.','Limit walking if it produces focal pain.','Arrange clinical assessment when focal bone pain, night pain or walking pain is present.'],why:'A possible bone-stress injury requires a different pathway and should not be progressed from app check-ins alone.',progress:'Progress only after professional guidance or clear exclusion of bone stress.'}
 ],
 neural:[
  {stage:0,name:'Comfortable movement only',dose:'Short symptom-neutral bouts',purpose:'Maintain movement without aggravating neurological symptoms.',steps:['Avoid positions that increase numbness, weakness or radiating pain.','Use short comfortable walks.','Stop for worsening neurological symptoms.'],why:'Nerve-related or exertional symptoms need assessment before a loading progression is assumed.',progress:'Seek clinical review if numbness, weakness or recurrent exertional symptoms persist.'}
 ]
};
const RUNNER_INJURY_LIBRARY=[
 {key:'prox_ham_strain',name:'Proximal hamstring strain',region:'Hip / posterior thigh',days:49,terms:['upper hamstring','proximal hamstring','ischial','sit bone','lower buttock','posterior thigh'],mechanisms:['sprint','accelerat','kick','sudden'],features:['bruis','pop','sharp','pull'],alternatives:['Proximal hamstring tendon injury','Lumbar or sciatic referred pain']},
 {key:'ham_strain',name:'Hamstring muscle strain',region:'Posterior thigh',days:42,terms:['hamstring','back of thigh','posterior thigh'],mechanisms:['sprint','accelerat','speed','sudden','stretch'],features:['bruis','pop','sharp','pull'],alternatives:['Proximal hamstring tendinopathy','Referred neural pain']},
 {key:'prox_ham_tend',name:'Proximal hamstring tendinopathy',region:'Hip / buttock',days:84,terms:['sit bone','ischial','deep buttock','upper hamstring','proximal hamstring'],mechanisms:['gradual','overuse','increased mileage'],features:['sitting','after running','hill','long stride'],alternatives:['Proximal hamstring strain','Ischiogluteal bursitis']},
 {key:'gtps',name:'Greater trochanteric pain syndrome / gluteal tendinopathy',region:'Lateral hip',days:70,terms:['outer hip','lateral hip','side of hip','greater trochanter','hip'],mechanisms:['gradual','overuse','increased mileage'],features:['lying on side','stairs','single leg','side sleeping','tender'],alternatives:['Hip joint irritation','Lumbar referred pain']},
 {key:'hip_flexor',name:'Hip flexor strain or iliopsoas overload',region:'Anterior hip / groin',days:35,terms:['front of hip','anterior hip','hip flexor','iliopsoas','groin'],mechanisms:['sprint','hill','kick','sudden','overstride'],features:['lifting knee','stairs','resisted hip flexion'],alternatives:['Adductor strain','Hip joint pathology']},
 {key:'adductor_strain',name:'Adductor strain',region:'Groin / inner thigh',days:42,terms:['groin','inner thigh','adductor'],mechanisms:['sudden','slip','change direction','sprint'],features:['squeeze','side step','bruis'],alternatives:['Adductor tendinopathy','Hip joint pathology']},
 {key:'adductor_tend',name:'Adductor tendinopathy',region:'Groin',days:84,terms:['groin','adductor','pubic'],mechanisms:['gradual','overuse'],features:['squeeze','after running','morning stiffness'],alternatives:['Adductor strain','Athletic pubalgia']},
 {key:'piriformis',name:'Deep gluteal / piriformis syndrome pattern',region:'Buttock',days:56,terms:['deep buttock','piriformis','glute','buttock'],mechanisms:['gradual','overuse'],features:['sitting','radiat','tingling','sciatic'],alternatives:['Lumbar radiculopathy','Proximal hamstring disorder']},
 {key:'quad_strain',name:'Quadriceps or rectus femoris strain',region:'Front thigh',days:35,terms:['front thigh','quadriceps','rectus femoris','quad'],mechanisms:['sprint','kick','sudden','hill'],features:['bruis','stretch','knee extension'],alternatives:['Hip flexor strain','Femoral bone stress injury']},
 {key:'tfl',name:'Tensor fascia lata overload',region:'Anterolateral hip',days:35,terms:['tfl','front side hip','anterolateral hip'],mechanisms:['gradual','overuse'],features:['downhill','single leg','tight'],alternatives:['Greater trochanteric pain syndrome','Iliotibial band syndrome']},
 {key:'pfp',name:'Patellofemoral pain',region:'Front of knee',days:56,terms:['front knee','around kneecap','behind kneecap','patella','anterior knee'],mechanisms:['gradual','overuse','increased mileage'],features:['stairs','squat','sitting','downhill'],alternatives:['Patellar tendinopathy','Meniscal or joint-line irritation']},
 {key:'patellar_tend',name:'Patellar tendinopathy',region:'Below kneecap',days:84,terms:['below kneecap','patellar tendon','inferior patella'],mechanisms:['gradual','jump','speed','hill'],features:['first steps','warm up','squat','jump'],alternatives:['Patellofemoral pain','Infrapatellar fat-pad irritation']},
 {key:'itbs',name:'Iliotibial band syndrome',region:'Outer knee',days:42,terms:['outer knee','lateral knee','it band','iliotibial'],mechanisms:['gradual','downhill','increased mileage'],features:['after a few km','downhill','sharp lateral'],alternatives:['Lateral meniscal irritation','Biceps femoris tendinopathy']},
 {key:'pes',name:'Pes anserine irritation',region:'Inner knee',days:35,terms:['inner knee','medial knee','pes anserine'],mechanisms:['gradual','overuse'],features:['stairs','tender below joint'],alternatives:['Medial meniscal irritation','MCL sprain']},
 {key:'meniscus',name:'Meniscal irritation pattern',region:'Knee joint line',days:56,terms:['joint line','meniscus','inside knee','outside knee'],mechanisms:['twist','turn','squat','sudden'],features:['locking','catching','swelling','click'],alternatives:['Patellofemoral pain','Ligament sprain']},
 {key:'mcl',name:'Medial collateral ligament sprain',region:'Inner knee',days:42,terms:['mcl','medial collateral','inner knee'],mechanisms:['twist','valgus','impact','sudden'],features:['instability','swelling','tender'],alternatives:['Medial meniscal injury','Pes anserine irritation']},
 {key:'mtss',name:'Medial tibial stress syndrome',region:'Inner shin',days:42,terms:['shin splints','inner shin','medial tibia','shin'],mechanisms:['gradual','increased mileage','hard surface'],features:['diffuse','along bone','warm up'],alternatives:['Tibial bone stress injury','Soleus overload']},
 {key:'tibial_bsi',name:'Tibial bone stress injury',region:'Shin',days:84,terms:['tibia','shin','bone pain'],mechanisms:['gradual','increased mileage','impact'],features:['focal','point tender','hop pain','night pain','walking pain'],alternatives:['Medial tibial stress syndrome','Chronic exertional compartment syndrome']},
 {key:'cecs',name:'Chronic exertional compartment syndrome pattern',region:'Lower leg',days:70,terms:['compartment','tight lower leg','pressure','shin'],mechanisms:['running only','reproducible'],features:['numb','weak','resolves after stopping','same distance'],alternatives:['Tibial stress injury','Vascular or nerve entrapment']},
 {key:'gastroc',name:'Gastrocnemius strain',region:'Upper calf',days:42,terms:['upper calf','gastrocnemius','calf'],mechanisms:['sudden','push off','sprint','jump'],features:['pop','bruis','tennis leg'],alternatives:['Soleus strain','Achilles rupture']},
 {key:'soleus',name:'Soleus strain',region:'Deep / lower calf',days:49,terms:['deep calf','lower calf','soleus','calf'],mechanisms:['running','hill','gradual','sudden'],features:['bent knee','deep ache','push off'],alternatives:['Gastrocnemius strain','Tibial stress injury']},
 {key:'achilles_mid',name:'Mid-portion Achilles tendinopathy',region:'Achilles',days:84,terms:['achilles','back of ankle'],mechanisms:['gradual','overuse','increased mileage'],features:['morning stiffness','2-6 cm','warm up','thickening'],alternatives:['Insertional Achilles tendinopathy','Partial Achilles tear']},
 {key:'achilles_ins',name:'Insertional Achilles tendinopathy',region:'Heel insertion',days:98,terms:['heel insertion','bottom achilles','back of heel','insertional'],mechanisms:['gradual','overuse'],features:['shoe pressure','uphill','deep dorsiflexion'],alternatives:['Retrocalcaneal bursitis','Mid-portion Achilles tendinopathy']},
 {key:'achilles_rupture',name:'Possible Achilles rupture or major tear',region:'Achilles',days:140,terms:['achilles','back of ankle','calf'],mechanisms:['sudden','push off','jump'],features:['pop','kicked','cannot tiptoe','weak push off'],alternatives:['Severe calf strain','Partial Achilles tear'],urgent:true},
 {key:'lateral_plantar_overload',name:'Lateral plantar muscle overload / footwear compression pattern',region:'Outer plantar foot',days:7,terms:['bottom outer foot','outer sole','lateral plantar','outside bottom foot','from front to back','little toe side','lateral arch'],mechanisms:['progressive during run','long run','tight shoe','narrow shoe','cambered road','fatigue'],features:['cramp','cramp like','worse after taking shoes off','resolves within a day','resolves within two days','better in 24 hours','better in 48 hours','no morning first step pain'],alternatives:['Peroneus longus overload','Lateral plantar nerve irritation','Cuboid-region overload'],family:'foot',tier:'Special presentation',rank:37,selfManage:true},
 {key:'plantar',name:'Plantar fasciopathy',region:'Heel / arch',days:84,terms:['heel bottom','plantar','arch','sole'],mechanisms:['gradual','overuse'],features:['first steps','morning','after rest'],alternatives:['Calcaneal stress injury','Fat-pad irritation']},
 {key:'peroneal',name:'Peroneal tendinopathy',region:'Outer ankle / foot',days:56,terms:['outer ankle','outside foot','peroneal','fibularis'],mechanisms:['gradual','uneven surface','ankle roll'],features:['eversion','behind ankle bone'],alternatives:['Lateral ankle sprain','Fifth metatarsal stress injury']},
 {key:'post_tib',name:'Posterior tibial tendinopathy',region:'Inner ankle / arch',days:84,terms:['inner ankle','posterior tibial','inside arch'],mechanisms:['gradual','overuse'],features:['single leg heel raise','arch fatigue'],alternatives:['Medial ankle sprain','Navicular stress injury']},
 {key:'ankle_sprain',name:'Lateral ankle sprain',region:'Outer ankle',days:35,terms:['ankle sprain','rolled ankle','outer ankle','lateral ankle'],mechanisms:['roll','twist','uneven','sudden'],features:['swelling','bruis','instability'],alternatives:['Peroneal tendon injury','Fracture']},
 {key:'met_bsi',name:'Metatarsal bone stress injury',region:'Forefoot',days:70,terms:['metatarsal','forefoot','top of foot'],mechanisms:['gradual','increased mileage','impact'],features:['focal','point tender','hop pain','walking pain'],alternatives:['Extensor tendinopathy','Morton neuroma']},
 {key:'navicular_bsi',name:'Navicular bone stress injury',region:'Midfoot',days:98,terms:['navicular','midfoot','top inner foot'],mechanisms:['gradual','impact','increased mileage'],features:['focal','hop pain','night pain'],alternatives:['Posterior tibial tendinopathy','Midfoot joint irritation'],urgent:true},
 {key:'sesamoid',name:'Sesamoid irritation or stress injury',region:'Under big toe',days:70,terms:['sesamoid','under big toe','ball of foot'],mechanisms:['gradual','forefoot running','hill'],features:['push off','tiptoe','focal'],alternatives:['First MTP joint irritation','Flexor hallucis tendinopathy']},
 {key:'mortons',name:'Morton neuroma pattern',region:'Forefoot',days:42,terms:['between toes','forefoot','mortons','neuroma'],mechanisms:['gradual','tight shoes'],features:['burning','tingling','pebble','numb toes'],alternatives:['Metatarsal stress injury','MTP synovitis']},
 {key:'hip_joint',name:'Hip joint irritation / femoroacetabular impingement pattern',region:'Deep anterior hip / groin',days:70,terms:['deep groin','deep hip','front hip','hip joint'],mechanisms:['gradual','twist','deep squat'],features:['clicking','catching','deep flexion','getting out of car'],alternatives:['Hip flexor overload','Labral injury'],family:'hip'},
 {key:'hip_labral',name:'Possible hip labral injury pattern',region:'Deep groin / hip joint',days:84,terms:['deep groin','labrum','hip joint'],mechanisms:['twist','pivot','sudden','gradual'],features:['catching','locking','clicking','giving way'],alternatives:['Femoroacetabular impingement','Hip flexor overload'],family:'hip'},
 {key:'femoral_neck_bsi',name:'Femoral neck bone stress injury',region:'Deep groin / hip',days:112,terms:['deep groin','femoral neck','deep hip','bone pain'],mechanisms:['gradual','increased mileage','impact'],features:['walking pain','night pain','hop pain','focal'],alternatives:['Hip joint irritation','Hip flexor overload'],urgent:true,family:'bone'},
 {key:'sacral_bsi',name:'Sacral bone stress injury',region:'Low back / buttock',days:98,terms:['sacrum','sacral','low back','deep buttock'],mechanisms:['gradual','increased mileage','impact'],features:['focal','walking pain','night pain','hop pain'],alternatives:['Lumbar referred pain','Deep gluteal syndrome'],urgent:true,family:'bone'},
 {key:'ischial_bursa',name:'Ischiogluteal bursitis pattern',region:'Sit bone / buttock',days:56,terms:['sit bone','ischial','lower buttock'],mechanisms:['gradual','prolonged sitting'],features:['sitting','direct pressure','tender'],alternatives:['Proximal hamstring tendinopathy','Referred neural pain'],family:'tendon'},
 {key:'athletic_pubalgia',name:'Athletic pubalgia / abdominal–adductor pain pattern',region:'Groin / pubic region',days:84,terms:['pubic','lower abdomen','groin','sports hernia'],mechanisms:['gradual','twist','sprint'],features:['cough','sit up','change direction','adductor squeeze'],alternatives:['Adductor tendinopathy','Inguinal hernia'],family:'muscle'},
 {key:'snapping_hip',name:'Snapping hip / iliopsoas irritation pattern',region:'Front hip',days:42,terms:['snapping hip','front hip','iliopsoas'],mechanisms:['gradual','repetitive hip flexion'],features:['snap','click','lifting knee'],alternatives:['Hip flexor strain','Hip joint irritation'],family:'hip'},
 {key:'quad_tend',name:'Quadriceps tendinopathy',region:'Above kneecap',days:84,terms:['above kneecap','quadriceps tendon','top of patella'],mechanisms:['gradual','hill','speed','jump'],features:['squat','stairs','jump','warm up'],alternatives:['Patellofemoral pain','Quadriceps strain'],family:'knee'},
 {key:'fat_pad',name:'Infrapatellar fat-pad irritation',region:'Front of knee below kneecap',days:42,terms:['fat pad','below kneecap','front knee'],mechanisms:['gradual','hyperextension','downhill'],features:['pinching','standing locked knee','tender beside tendon'],alternatives:['Patellar tendinopathy','Patellofemoral pain'],family:'knee'},
 {key:'popliteus',name:'Popliteus / posterolateral knee overload',region:'Back / outer knee',days:42,terms:['back of knee','posterolateral knee','popliteus'],mechanisms:['gradual','downhill','twist'],features:['downhill','bent knee','outer back knee'],alternatives:['Lateral meniscal irritation','Distal hamstring tendinopathy'],family:'knee'},
 {key:'fibular_bsi',name:'Fibular bone stress injury',region:'Outer lower leg',days:70,terms:['fibula','outer shin','outer lower leg','bone pain'],mechanisms:['gradual','increased mileage','impact'],features:['focal','point tender','hop pain','walking pain'],alternatives:['Peroneal muscle overload','Lateral compartment syndrome'],urgent:true,family:'bone'},
 {key:'ant_tib_tend',name:'Anterior tibialis tendinopathy',region:'Front shin / inner ankle',days:56,terms:['front shin','anterior tibialis','front ankle'],mechanisms:['gradual','hill','increased mileage'],features:['toe lift','heel walking','shoe pressure'],alternatives:['Tibial bone stress injury','Extensor tendinopathy'],family:'tendon'},
 {key:'calcaneal_bsi',name:'Calcaneal bone stress injury',region:'Heel',days:84,terms:['heel bone','calcaneus','deep heel'],mechanisms:['gradual','increased mileage','impact'],features:['heel squeeze','walking pain','night pain','focal'],alternatives:['Plantar fasciopathy','Heel fat-pad irritation'],urgent:true,family:'bone'},
 {key:'extensor_tend',name:'Foot extensor tendinopathy',region:'Top of foot',days:42,terms:['top of foot','extensor tendon','laces'],mechanisms:['gradual','tight shoes','hill'],features:['toe lift','shoe pressure','tender tendon'],alternatives:['Metatarsal bone stress injury','Midfoot joint irritation'],family:'foot'},
 {key:'fhl_tend',name:'Flexor hallucis longus tendinopathy',region:'Inner ankle / big toe',days:70,terms:['flexor hallucis','inner ankle','big toe tendon'],mechanisms:['gradual','hill','forefoot running'],features:['big toe push off','tiptoe','behind inner ankle'],alternatives:['Posterior tibial tendinopathy','Sesamoid injury'],family:'foot'},
 {key:'mtp_synovitis',name:'First MTP joint irritation / hallux rigidus pattern',region:'Big-toe joint',days:56,terms:['big toe joint','first mtp','hallux'],mechanisms:['gradual','forefoot running','hill'],features:['toe bend','push off','joint stiffness'],alternatives:['Sesamoid injury','Flexor hallucis tendinopathy'],family:'foot'},
 {key:'fifth_met_bsi',name:'Fifth metatarsal bone stress injury',region:'Outer midfoot',days:84,terms:['fifth metatarsal','outer midfoot','outside foot bone'],mechanisms:['gradual','ankle roll','increased mileage'],features:['focal','point tender','walking pain','hop pain'],alternatives:['Peroneal tendinopathy','Lateral ankle sprain'],urgent:true,family:'bone'},
 {key:'lumbar_radicular',name:'Lumbar radicular / referred nerve pain pattern',region:'Back / buttock / leg',days:70,terms:['low back','radiating','sciatic','below knee'],mechanisms:['gradual','lifting','sitting'],features:['tingling','numbness','weakness','radiating'],alternatives:['Deep gluteal syndrome','Hamstring injury'],urgent:true,family:'neural'},
 {key:'cuboid_overload',name:'Cuboid-region joint or soft-tissue overload pattern',region:'Outer midfoot',days:21,terms:['cuboid','outer midfoot','outside middle foot','lateral midfoot'],mechanisms:['gradual','uneven surface','ankle roll','long run'],features:['push off','localized ache','barefoot','midfoot'],alternatives:['Peroneus longus overload','Fifth metatarsal stress injury'],family:'foot',tier:'Special presentation',rank:38},
 {key:'peroneus_longus_overload',name:'Peroneus longus overload beneath the foot',region:'Outer ankle to plantar foot',days:28,terms:['peroneus longus','outer ankle to sole','under cuboid','outer plantar foot'],mechanisms:['cambered road','uneven surface','long run','fatigue'],features:['push off','eversion','cramp','outer arch'],alternatives:['Lateral plantar muscle overload','Cuboid-region overload'],family:'foot',tier:'Special presentation',rank:39},
 {key:'lateral_plantar_nerve',name:'Lateral plantar nerve irritation pattern',region:'Outer plantar foot',days:42,terms:['lateral plantar nerve','outer sole burning','little toe tingling','outer plantar numbness'],mechanisms:['tight shoe','long run','repetitive pressure'],features:['burning','tingling','numbness','electric'],alternatives:['Lateral plantar muscle overload','Morton neuroma pattern'],family:'neural',tier:'Special presentation',rank:51},
 {key:'baxter_nerve',name:'Baxter nerve / inferior calcaneal nerve irritation pattern',region:'Inner plantar heel',days:56,terms:['baxter nerve','inner heel burning','medial plantar heel','inferior calcaneal nerve'],mechanisms:['gradual','overuse','tight footwear'],features:['burning','tingling','worse after activity','not first step'],alternatives:['Plantar fasciopathy','Calcaneal stress injury'],family:'neural',tier:'Special presentation',rank:52},
 {key:'heel_fat_pad',name:'Heel fat-pad irritation pattern',region:'Central heel',days:28,terms:['heel fat pad','central heel','bruised heel','middle of heel'],mechanisms:['hard surface','minimal shoes','downhill','impact'],features:['bruised feeling','direct pressure','hard floor'],alternatives:['Plantar fasciopathy','Calcaneal stress injury'],family:'foot',tier:'Special presentation',rank:31},
 {key:'retrocalc_bursa',name:'Retrocalcaneal bursitis pattern',region:'Back of heel',days:42,terms:['retrocalcaneal','bursa','back of heel swelling','between achilles and heel'],mechanisms:['shoe pressure','uphill','new shoes','gradual'],features:['swelling','shoe rubbing','deep heel pain'],alternatives:['Insertional Achilles tendinopathy','Haglund-related irritation'],family:'tendon',tier:'Special presentation',rank:42},
 {key:'achilles_paratenon',name:'Achilles paratenon irritation pattern',region:'Achilles',days:42,terms:['paratenon','creaking achilles','squeaking tendon','achilles sheath'],mechanisms:['rapid load increase','hill','speed','gradual'],features:['crepitus','warmth','diffuse tendon pain'],alternatives:['Mid-portion Achilles tendinopathy','Partial Achilles tear'],family:'tendon',tier:'Special presentation',rank:43},
 {key:'dorsal_lace_compression',name:'Dorsal foot lace-pressure / extensor compression pattern',region:'Top of foot',days:7,terms:['lace bite','laces too tight','top foot pressure','dorsal foot compression'],mechanisms:['tight laces','new shoes','high instep','long run'],features:['worse in shoe','relief after loosening','surface pressure'],alternatives:['Foot extensor tendinopathy','Metatarsal bone stress injury'],family:'foot',tier:'Special presentation',rank:35,selfManage:true},
 {key:'toe_flexor_fatigue',name:'Toe-flexor and intrinsic-foot fatigue / cramp pattern',region:'Plantar forefoot / toes',days:7,terms:['toes cramp','toe curling cramp','ball of foot cramp','intrinsic foot fatigue'],mechanisms:['long run','fatigue','new shoes','forefoot loading'],features:['cramp','toe clawing','settles quickly','after run'],alternatives:['Flexor hallucis tendinopathy','Morton neuroma pattern'],family:'foot',tier:'Special presentation',rank:40,selfManage:true},
 {key:'second_mtp_capsulitis',name:'Second MTP capsulitis / plantar-plate overload pattern',region:'Ball of foot',days:56,terms:['second toe joint','second mtp','plantar plate','ball of foot under second toe'],mechanisms:['forefoot loading','hill','speed','tight shoes'],features:['toe drift','pebble feeling','push off','joint swelling'],alternatives:['Morton neuroma pattern','Metatarsal stress injury'],family:'foot',tier:'Special presentation',rank:44},
 {key:'turf_toe',name:'First MTP sprain / turf-toe pattern',region:'Big-toe joint',days:42,terms:['turf toe','big toe sprain','big toe bent back','first mtp sprain'],mechanisms:['sudden push off','toe hyperextension','trip'],features:['swelling','bruising','painful push off'],alternatives:['First MTP irritation','Sesamoid injury'],family:'foot',tier:'Special presentation',rank:49},
 {key:'medial_ankle_sprain',name:'Medial ankle / deltoid-ligament sprain pattern',region:'Inner ankle',days:42,terms:['medial ankle sprain','inner ankle sprain','deltoid ligament'],mechanisms:['eversion','twist','sudden'],features:['inner ankle swelling','bruising','instability'],alternatives:['Posterior tibial tendon injury','Fracture'],family:'ankle',tier:'Special presentation',rank:55},
 {key:'syndesmosis_sprain',name:'High ankle / syndesmosis sprain pattern',region:'Front / upper ankle',days:70,terms:['high ankle sprain','syndesmosis','above ankle','front upper ankle'],mechanisms:['external rotation','twist','sudden'],features:['pain above ankle','squeeze pain','difficulty push off'],alternatives:['Lateral ankle sprain','Fibular injury'],family:'ankle',tier:'Special presentation',rank:54},
 {key:'peroneal_subluxation',name:'Peroneal tendon subluxation pattern',region:'Outer ankle',days:84,terms:['peroneal snapping','tendon flicks behind ankle','outer ankle snap','peroneal subluxation'],mechanisms:['ankle roll','sudden','repetitive'],features:['snapping','instability','behind lateral malleolus'],alternatives:['Peroneal tendinopathy','Lateral ankle sprain'],family:'ankle',tier:'Special presentation',rank:67},
 {key:'distal_ham_tend',name:'Distal hamstring tendinopathy pattern',region:'Back / side of knee',days:70,terms:['distal hamstring','biceps femoris tendon','semimembranosus tendon','back of knee tendon'],mechanisms:['gradual','speed','hill','overuse'],features:['resisted knee flexion','tendon tenderness','fast running'],alternatives:['Popliteus overload','Meniscal irritation'],family:'hamstring',tier:'Special presentation',rank:53},
 {key:'sartorius_gracilis_overload',name:'Sartorius / gracilis overload pattern',region:'Inner thigh to inner knee',days:28,terms:['sartorius','gracilis','inside thigh to knee','diagonal inner thigh'],mechanisms:['hill','change direction','fatigue','gradual'],features:['cross leg','hip flexion','inner knee'],alternatives:['Adductor strain','Pes anserine irritation'],family:'muscle',tier:'Special presentation',rank:64},
 {key:'bakers_cyst',name:'Popliteal or Baker cyst irritation pattern',region:'Back of knee',days:42,terms:['baker cyst','popliteal cyst','fullness behind knee','lump behind knee'],mechanisms:['gradual','joint irritation'],features:['fullness','tight bending','swelling behind knee'],alternatives:['Meniscal irritation','Deep-vein thrombosis'],family:'knee',tier:'Special presentation',rank:61},
 {key:'downhill_quad_overload',name:'Downhill eccentric quadriceps overload / DOMS pattern',region:'Front thigh',days:5,terms:['downhill quadriceps','front thighs sore after downhill','quad doms','eccentric soreness'],mechanisms:['downhill run','new descent','long downhill'],features:['delayed soreness','both thighs','stairs next day','resolves in days'],alternatives:['Quadriceps strain','Femoral bone stress injury'],family:'muscle',tier:'Special presentation',rank:33,selfManage:true},
 {key:'exercise_cramp',name:'Exercise-associated muscle cramp / fatigue pattern',region:'Muscle group',days:3,terms:['muscle cramp','cramping during run','charley horse','spasm'],mechanisms:['fatigue','heat','long run','high intensity'],features:['sudden tightening','resolves after stopping','recurrent cramp'],alternatives:['Muscle strain','Electrolyte or medical contributor'],family:'muscle',tier:'Special presentation',rank:24,selfManage:true},
 {key:'carbon_shoe_transition',name:'Carbon-plated or highly stiff shoe transition overload pattern',region:'Foot / calf / Achilles',days:14,terms:['carbon plate','carbon shoe','super shoe','stiff shoe transition'],mechanisms:['new shoes','abrupt footwear change','race shoes'],features:['forefoot ache','calf tightness','arch fatigue','only in those shoes'],alternatives:['Metatarsal stress injury','Achilles tendinopathy'],family:'foot',tier:'Special presentation',rank:60,selfManage:true},
 {key:'camber_lateral_chain',name:'Road-camber lateral-chain overload pattern',region:'Outer hip / knee / foot',days:14,terms:['cambered road','road camber','one side of road','sloped road'],mechanisms:['cambered road','same route direction','long run'],features:['one sided','outer hip','outer knee','outer foot'],alternatives:['Iliotibial band syndrome','Peroneal overload'],family:'generic',tier:'Special presentation',rank:58,selfManage:true},
 {key:'shoe_toebox_compression',name:'Toe-box compression / forefoot pressure pattern',region:'Forefoot / toes',days:7,terms:['toe box too narrow','forefoot squeezed','shoe compression','toes cramped in shoe'],mechanisms:['tight shoe','new shoes','long run','swelling during run'],features:['relief after shoe removal','numb toes','cramp','pressure'],alternatives:['Morton neuroma pattern','Toe-flexor fatigue'],family:'foot',tier:'Special presentation',rank:41,selfManage:true},
 {key:'metatarsalgia_load',name:'Mechanical metatarsalgia / forefoot-load pattern',region:'Ball of foot',days:28,terms:['metatarsalgia','ball of foot ache','forefoot pressure','under metatarsal heads'],mechanisms:['long run','forefoot loading','thin shoes','hill'],features:['diffuse forefoot ache','worse barefoot hard floor','push off'],alternatives:['Metatarsal bone stress injury','MTP capsulitis'],family:'foot',tier:'Special presentation',rank:32},
 {key:'calf_fatigue_tightness',name:'Calf fatigue / transient tightness pattern',region:'Calf',days:7,terms:['calf tightness','calves feel loaded','calf fatigue','tight calves after run'],mechanisms:['hill','speed','new shoes','long run'],features:['bilateral','settles in 24 hours','no focal tenderness','no bruising'],alternatives:['Soleus strain','Achilles tendinopathy'],family:'muscle',tier:'Special presentation',rank:27,selfManage:true},
 {key:'runner_toe_nail',name:'Runner toe / nail-bed trauma pattern',region:'Toe / nail',days:14,terms:['black toenail','runner toe','toenail pain','nail bruising'],mechanisms:['downhill','shoe too short','long run'],features:['nail discoloration','toe hits shoe','pressure'],alternatives:['Toe fracture','Infection'],family:'foot',tier:'Special presentation',rank:36,selfManage:true}
];

// Broad educational recovery windows for return to unrestricted running.
// These are deliberately ranges rather than clearance dates; symptoms, grade, imaging,
// treatment and functional milestones remain more important than elapsed time.
const INJURY_RECOVERY_WINDOWS={
 prox_ham_strain:[28,49,84],ham_strain:[21,42,70],prox_ham_tend:[84,120,240],gtps:[42,84,180],
 hip_flexor:[14,35,56],adductor_strain:[21,42,70],adductor_tend:[84,120,240],piriformis:[28,56,120],
 quad_strain:[14,35,56],tfl:[21,35,70],pfp:[42,56,84],patellar_tend:[84,120,240],itbs:[21,42,70],
 pes:[21,35,70],meniscus:[28,56,120],mcl:[21,42,84],mtss:[28,56,84],tibial_bsi:[70,112,180],
 cecs:[42,84,180],gastroc:[21,42,70],soleus:[28,49,84],achilles_mid:[84,180,365],achilles_ins:[112,210,420],
 achilles_rupture:[140,210,365],plantar:[84,180,365],peroneal:[42,70,120],post_tib:[84,140,280],
 ankle_sprain:[14,35,84],met_bsi:[56,84,140],navicular_bsi:[98,180,270],sesamoid:[56,98,180],mortons:[28,56,120],
 hip_joint:[42,84,180],hip_labral:[56,112,210],femoral_neck_bsi:[112,180,270],sacral_bsi:[84,140,210],
 ischial_bursa:[42,70,140],athletic_pubalgia:[56,112,210],snapping_hip:[28,56,112],quad_tend:[84,140,280],
 fat_pad:[21,42,84],popliteus:[21,42,84],fibular_bsi:[56,84,140],ant_tib_tend:[42,70,140],
 calcaneal_bsi:[70,112,180],extensor_tend:[28,56,112],fhl_tend:[56,98,180],mtp_synovitis:[42,84,180],
 fifth_met_bsi:[84,168,270],lumbar_radicular:[28,84,180],lateral_plantar_overload:[2,7,21],
 cuboid_overload:[14,21,56],peroneus_longus_overload:[14,28,70],lateral_plantar_nerve:[28,56,120],baxter_nerve:[42,84,180],
 heel_fat_pad:[14,28,84],retrocalc_bursa:[28,56,120],achilles_paratenon:[28,56,120],dorsal_lace_compression:[2,7,21],
 toe_flexor_fatigue:[2,7,21],second_mtp_capsulitis:[42,84,180],turf_toe:[21,42,84],medial_ankle_sprain:[21,42,84],
 syndesmosis_sprain:[42,70,140],peroneal_subluxation:[56,84,180],distal_ham_tend:[56,84,180],sartorius_gracilis_overload:[14,28,56],
 bakers_cyst:[21,42,84],downhill_quad_overload:[2,5,10],exercise_cramp:[1,3,7],carbon_shoe_transition:[7,14,42],
 camber_lateral_chain:[7,14,42],shoe_toebox_compression:[2,7,21],metatarsalgia_load:[14,28,84],calf_fatigue_tightness:[2,7,21],runner_toe_nail:[7,14,42]
};
RUNNER_INJURY_LIBRARY.forEach(x=>{const w=INJURY_RECOVERY_WINDOWS[x.key];if(w){x.minDays=w[0];x.days=w[1];x.maxDays=w[2];}});
function injuryText(i){return [i.bodyRegion,i.location,i.mechanism,i.onset,i.initialSymptoms,i.currentSymptoms,i.painTriggers,i.symptomQuality,i.painDistribution,i.timingPattern,i.shoeEffect,i.surfaceContext,i.loadChange,i.recurrencePattern,i.freeTextClinical].filter(Boolean).join(' ').toLowerCase()}
function injuryMatchText(i){return [i.location,i.mechanism,i.onset,i.initialSymptoms,i.currentSymptoms,i.painTriggers,i.symptomQuality,i.painDistribution,i.timingPattern,i.shoeEffect,i.surfaceContext,i.loadChange,i.recurrencePattern,i.freeTextClinical].filter(Boolean).join(' ').toLowerCase()}
function nullableNumber(v){return v===''||v===null||v===undefined?null:(Number.isFinite(Number(v))?Number(v):null)}
function valueText(v,suffix='/10'){return Number.isFinite(v)?`${v}${suffix}`:'Not assessed'}
function normaliseInjuryLanguage(v){return String(v||'').toLowerCase().replace(/[–—-]/g,' ').replace(/[^a-z0-9\s/]/g,' ').replace(/\s+/g,' ').trim()}
function injuryPhraseMatch(text,phrase){
 const t=normaliseInjuryLanguage(text),p=normaliseInjuryLanguage(phrase);if(!t||!p)return false;if(t.includes(p))return true;
 const words=p.split(' ').filter(w=>w.length>2&&!['pain','injury','running','pattern','possible'].includes(w));
 return words.length>1&&words.every(w=>t.includes(w));
}
function termHits(text,terms=[]){return terms.filter(x=>injuryPhraseMatch(text,x))}
function contextualInjuryBonus(i,key){
 const location=normaliseInjuryLanguage(i.location),triggers=normaliseInjuryLanguage(i.painTriggers),symptoms=normaliseInjuryLanguage(`${i.initialSymptoms||''} ${i.currentSymptoms||''}`),all=`${location} ${triggers} ${symptoms}`;
 const hit=(rx,points)=>rx.test(all)?points:0;
 const rules={
  pfp:()=>hit(/front|around|behind.*(knee ?cap|patella)|knee ?cap|stairs|squat|downhill|after sitting|theater sign/,8),
  patellar_tend:()=>hit(/below.*(knee ?cap|patella)|patellar tendon|jump|hop|accelerat/,9),
  itbs:()=>hit(/outside|outer|lateral.*knee|downhill|after.*(run|kilomet|mile)/,8),
  pes:()=>hit(/inside.*below.*knee|medial.*below|pes anserine/,9),
  meniscus:()=>hit(/joint line|locking|catching|twist|deep squat|giving way|swelling/,8),
  mcl:()=>hit(/inside|inner|medial.*knee|valgus|side impact/,6),
  quad_tend:()=>hit(/above.*(knee ?cap|patella)|quadriceps tendon/,9),
  fat_pad:()=>hit(/under.*(knee ?cap|patella)|fully straighten|extension|pinch.*front/,8),
  popliteus:()=>hit(/back|behind|posterior.*knee|downhill|unlock/,7),
  prox_ham_strain:()=>hit(/sit bone|lower buttock|upper hamstring|sprint|sudden|pop|bruis/,8),
  ham_strain:()=>hit(/back.*thigh|posterior thigh|hamstring|sprint|sudden|pop|bruis/,7),
  prox_ham_tend:()=>hit(/sit bone|lower buttock|sitting|gradual|uphill|fast running/,8),
  gtps:()=>hit(/outside|side|lateral.*hip|lying.*side|single leg|stairs/,8),
  hip_flexor:()=>hit(/front.*hip|lifting.*knee|hip flex|sprint/,8),
  adductor_strain:()=>hit(/inner thigh|groin|adductor|side step|change direction|sudden/,7),
  adductor_tend:()=>hit(/inner thigh|groin|adductor|squeeze|gradual/,7),
  pfp_unused:()=>0,
  mtss:()=>hit(/inside.*shin|medial.*shin|diffuse|long area|warm.*up/,8),
  tibial_bsi:()=>hit(/focal|one spot|point tender|bone|hop|night pain/,10),
  fibular_bsi:()=>hit(/outside.*lower leg|fibula|focal|one spot|hop/,9),
  cecs:()=>hit(/tight|pressure|same distance|resolves.*stop|numb|weak/,9),
  gastroc:()=>hit(/upper calf|back.*calf|push off|sudden|pop/,8),
  soleus:()=>hit(/deep calf|lower calf|bent knee|slow running|gradual/,8),
  achilles_mid:()=>hit(/mid.*achilles|2.*6.*cm|morning stiffness|first steps|tendon/,9),
  achilles_ins:()=>hit(/heel insertion|back.*heel|insertion|shoe pressure|uphill/,9),
  achilles_rupture:()=>hit(/pop|kicked.*calf|cannot.*toe|unable.*push|gap/,13),
  ankle_sprain:()=>hit(/rolled|inversion|twist|outside.*ankle|swelling|bruis/,9),
  lateral_plantar_overload:()=>hit(/bottom.*outer|outer.*sole|lateral.*plantar|little toe side|cramp|after taking.*shoe|tight shoe|narrow shoe|resolv.*(24|48|day|two days)/,12),
  plantar:()=>hit(/under.*heel|bottom.*heel|arch|first steps|morning/,9),
  peroneal:()=>hit(/outside.*ankle|outer.*ankle|peroneal|eversion/,8),
  post_tib:()=>hit(/inside.*ankle|medial.*ankle|arch collapse|single leg heel raise/,9),
  met_bsi:()=>hit(/top.*foot|forefoot|metatarsal|focal|hop/,8),
  fifth_met_bsi:()=>hit(/outside.*foot|base.*fifth|fifth metatarsal|focal/,10),
  navicular_bsi:()=>hit(/top.*midfoot|navicular|n spot|focal/,10),
  sesamoid:()=>hit(/under.*big toe|ball.*foot|sesamoid|push off/,9),
  mortons:()=>hit(/between.*toes|pebble|burning|numb.*toes|tight shoes/,9),
  lumbar_radicular:()=>hit(/low back|radiat|below knee|tingl|numb|electric/,10),
  cuboid_overload:()=>hit(/cuboid|outer.*midfoot|outside.*middle.*foot|push off|uneven surface/,10),
  peroneus_longus_overload:()=>hit(/peroneus longus|under.*cuboid|outer.*arch|camber|eversion/,10),
  lateral_plantar_nerve:()=>hit(/outer.*sole.*(burn|tingl|numb)|little toe.*(tingl|numb)|electric/,11),
  baxter_nerve:()=>hit(/inner.*heel.*burn|medial.*heel.*burn|baxter|not.*first step/,10),
  heel_fat_pad:()=>hit(/central.*heel|bruised.*heel|hard floor|direct pressure/,10),
  retrocalc_bursa:()=>hit(/back.*heel.*swelling|shoe.*rub|retrocalc|between.*achilles.*heel/,10),
  achilles_paratenon:()=>hit(/creak|squeak|crepitus|paratenon|warmth.*achilles/,10),
  dorsal_lace_compression:()=>hit(/lace bite|laces.*tight|top.*foot.*pressure|relief.*loosening/,12),
  toe_flexor_fatigue:()=>hit(/toe.*cramp|toe.*curl|ball.*foot.*cramp|after.*run/,10),
  second_mtp_capsulitis:()=>hit(/second.*toe|second.*mtp|plantar plate|toe drift|ball.*foot/,10),
  turf_toe:()=>hit(/turf toe|big toe.*bent back|hyperextension|big toe.*sprain/,11),
  medial_ankle_sprain:()=>hit(/inner.*ankle.*sprain|medial.*ankle.*swelling|eversion/,10),
  syndesmosis_sprain:()=>hit(/high ankle|syndesmosis|above.*ankle|external rotation/,11),
  peroneal_subluxation:()=>hit(/snapp.*behind.*ankle|peroneal.*snap|tendon.*flick/,11),
  distal_ham_tend:()=>hit(/distal.*hamstring|back.*knee.*tendon|biceps femoris.*tendon|resisted.*knee flex/,10),
  sartorius_gracilis_overload:()=>hit(/sartorius|gracilis|diagonal.*inner thigh|inside.*thigh.*knee/,9),
  bakers_cyst:()=>hit(/baker|popliteal cyst|fullness.*behind.*knee|lump.*behind.*knee/,11),
  downhill_quad_overload:()=>hit(/downhill.*quad|front.*thigh.*sore|doms|stairs.*next day/,11),
  exercise_cramp:()=>hit(/cramp|spasm|charley horse|sudden tightening/,8),
  carbon_shoe_transition:()=>hit(/carbon|super shoe|stiff shoe|only.*those shoes/,11),
  camber_lateral_chain:()=>hit(/cambered|road camber|same side.*road|one sided.*outer/,10),
  shoe_toebox_compression:()=>hit(/toe box|forefoot.*squeez|relief.*shoe removal|toes.*cramped.*shoe/,11),
  metatarsalgia_load:()=>hit(/metatarsalgia|ball.*foot.*ache|under.*metatarsal|diffuse.*forefoot/,10),
  calf_fatigue_tightness:()=>hit(/calf.*tight|calves.*loaded|bilateral.*calf|settles.*24/,9),
  runner_toe_nail:()=>hit(/black toenail|runner toe|nail.*bruis|toe.*hits.*shoe/,11)
 };
 return rules[key]?rules[key]():0;
}
function diagnosisFamily(key=''){
 const d=RUNNER_INJURY_LIBRARY.find(x=>x.key===key);if(d?.family)return d.family;
 if(/bsi|sesamoid/.test(key))return'bone';
 if(/cecs|mortons|radicular|piriformis|plantar_nerve|baxter_nerve/.test(key))return'neural';
 if(/pfp|itbs|menisc|mcl|pes|patellar|quad_tend|fat_pad|popliteus/.test(key))return'knee';
 if(/ankle_sprain|peroneal|medial_ankle|syndesmosis/.test(key))return'ankle';
 if(/post_tib|navicular|met_|mortons|fhl|mtp|extensor|plantar|lateral_plantar|cuboid|peroneus_longus|heel_fat|retrocalc|lace_compression|toe_flexor|turf_toe|toebox|runner_toe/.test(key))return'foot';
 if(/ham/.test(key))return'hamstring';
 if(/hip|labral|snapping|gtps/.test(key))return'hip';
 if(/strain|flexor|adductor|quad|sartorius|tfl|gastroc|soleus|pubalgia|exercise_cramp|calf_fatigue|downhill_quad/.test(key))return'muscle';
 if(/tend|bursa|achilles|ant_tib|paratenon/.test(key))return'tendon';
 return'generic';
}
const INJURY_REGION_KEYS={
 'Hip / pelvis':/prox_ham|gtps|hip_|piriformis|tfl|femoral_neck|sacral|ischial|snapping|lumbar_radicular/,
 'Groin / inner thigh':/adductor|hip_flexor|hip_joint|hip_labral|femoral_neck|athletic_pubalgia|snapping/,
 'Front thigh':/quad_strain|hip_flexor|femoral_neck|downhill_quad_overload/,
 'Back of thigh / hamstring':/ham_strain|prox_ham|distal_ham|piriformis|lumbar_radicular/,
 'Knee':/pfp|patellar_tend|itbs|pes|meniscus|mcl|quad_tend|fat_pad|popliteus|distal_ham|bakers_cyst|sartorius_gracilis/,
 'Shin / lower leg':/mtss|tibial_bsi|cecs|fibular_bsi|ant_tib_tend|soleus/,
 'Calf':/gastroc|soleus|achilles|cecs|fibular_bsi|exercise_cramp|calf_fatigue|carbon_shoe/,
 'Achilles / back of ankle':/achilles|paratenon|retrocalc|gastroc|soleus|post_tib|peroneal/,
 'Ankle':/ankle_sprain|medial_ankle|syndesmosis|peroneal|post_tib|ant_tib_tend|achilles|fhl_tend/,
 'Heel / arch':/lateral_plantar|plantar|baxter|heel_fat|retrocalc|post_tib|calcaneal_bsi|achilles_ins|fhl_tend|cuboid|peroneus_longus/,
 'Forefoot / toes':/lateral_plantar|met_bsi|navicular_bsi|sesamoid|mortons|extensor_tend|fhl_tend|mtp_synovitis|fifth_met_bsi|lace_compression|toe_flexor|second_mtp|turf_toe|toebox|metatarsalgia|runner_toe|carbon_shoe/
};
function regionCompatible(bodyRegion,key){const rx=INJURY_REGION_KEYS[bodyRegion];return !rx||rx.test(key)}
function matchStrength(score,margin){return score>=18&&margin>=5?'Strong':score>=9?'Moderate':'Limited'}
function clinicianLibraryMatch(name){let t=String(name||'').toLowerCase();return RUNNER_INJURY_LIBRARY.map(d=>({...d,hits:[d.name,...d.terms].filter(x=>t.includes(String(x).toLowerCase())).length})).sort((a,b)=>b.hits-a.hits)[0]}
function explicitRedFlags(i,ranked=[]){const t=injuryText(i);let reasons=[];if(ranked.some(x=>x.urgent||diagnosisFamily(x.key)==='bone'))reasons.push('a higher-risk bone, tendon or neurological pattern is among the leading possibilities');if(/night pain|focal bone|point tender|unable to bear|cannot bear|marked weakness|deform|numb|breathless|calf swelling|fever|loss of bladder|loss of bowel/.test(t))reasons.push('a recorded symptom matches a clinical red flag');if(i.pop&&i.bruising&&nullableNumber(i.initialWalkPain)>=5)reasons.push('pop, bruising and major walking limitation were reported together');return[...new Set(reasons)]}
function structuredClinicalEvidence(i){
 const yes=k=>i[k]===true,no=k=>i[k]===false,val=k=>String(i[k]||'').toLowerCase();
 return{yes,no,val,
  morningFirstStep:yes('morningFirstStep'),focalTenderness:yes('focalTenderness'),hopPain:yes('hopPain'),
  numbTingle:yes('numbTingle'),shoeRelated:yes('shoeRelated'),barefootBetter:yes('barefootBetter'),
  resolves48h:yes('resolves48h'),nightPain:yes('nightPain'),lockingCatching:yes('lockingCatching'),
  instability:yes('instability'),loadIncrease:yes('recentLoadIncrease'),newShoes:yes('newShoes'),cambered:yes('camberedSurface')};
}
function contradictionPenalty(i,key){
 const e=structuredClinicalEvidence(i);let n=0;
 if(key==='plantar'&&e.no('morningFirstStep'))n+=7;
 if(/bsi/.test(key)&&e.resolves48h)n+=9;
 if(/bsi/.test(key)&&e.no('focalTenderness')&&e.no('hopPain'))n+=5;
 if(key==='lateral_plantar_overload'&&(e.morningFirstStep||e.focalTenderness||e.nightPain))n+=7;
 if(key==='mortons'&&e.no('numbTingle'))n+=4;
 if(key==='meniscus'&&e.no('lockingCatching'))n+=3;
 if(/sprain|mcl/.test(key)&&String(i.onset||'').toLowerCase()==='gradual')n+=4;
 if(/strain|rupture/.test(key)&&String(i.onset||'').toLowerCase()==='gradual')n+=3;
 return n;
}
function structuredBonus(i,key){
 const e=structuredClinicalEvidence(i);let n=0;
 if(key==='lateral_plantar_overload')n+=(e.shoeRelated?6:0)+(e.resolves48h?7:0)+(e.barefootBetter?3:0)+(e.cambered?2:0)+(e.newShoes?2:0);
 if(key==='plantar')n+=(e.morningFirstStep?8:0);
 if(/bsi/.test(key))n+=(e.focalTenderness?7:0)+(e.hopPain?5:0)+(e.nightPain?6:0);
 if(key==='mortons')n+=(e.numbTingle?6:0)+(e.shoeRelated?4:0);
 if(key==='meniscus')n+=(e.lockingCatching?7:0);
 if(key==='prox_ham_tend')n+=(i.sittingPain===true?5:0)+(i.resistedPain===true?3:0);
 if(key==='cecs')n+=(i.exertionalResolution===true?6:0);
 if(/ankle_sprain|mcl/.test(key))n+=(e.instability?4:0);
 if(e.loadIncrease&&/tend|pfp|itbs|mtss|plantar|overload/.test(key))n+=2;
 return n;
}
function appPatternDiagnosis(i){
 const text=injuryMatchText(i),initialPain=nullableNumber(i.initialPain),walk=nullableNumber(i.initialWalkPain),bodyRegion=i.bodyRegion||'';
 let ranked=RUNNER_INJURY_LIBRARY.filter(d=>regionCompatible(bodyRegion,d.key)).map(d=>{const location=termHits(text,d.terms),mechanism=termHits(text,d.mechanisms),features=termHits(text,d.features),contextBonus=contextualInjuryBonus(i,d.key),structured=structuredBonus(i,d.key),contradiction=contradictionPenalty(i,d.key);let score=location.length*5+mechanism.length*2.5+features.length*3+contextBonus+structured-contradiction;if(i.onset&&d.mechanisms.some(x=>injuryPhraseMatch(i.onset,x)))score+=2;if(i.pop&&/strain|rupture|tear|sprain/.test(d.name.toLowerCase()))score+=3;if(i.bruising&&/strain|rupture|tear|sprain|stress injury/.test(d.name.toLowerCase()))score+=2;if(Number.isFinite(initialPain)&&initialPain>=7&&/strain|rupture|stress injury|sprain/.test(d.name.toLowerCase()))score+=1.5;if(Number.isFinite(walk)&&walk>=5&&/stress injury|rupture|strain|sprain/.test(d.name.toLowerCase()))score+=1;return{...d,score,location,mechanism,features,contextBonus,structured,contradiction};}).filter(x=>x.score>=5&&(x.location.length||x.features.length||x.contextBonus>=6||x.structured>=6)).sort((a,b)=>b.score-a.score);
 if(!ranked.length){const region=(bodyRegion||i.location||'lower limb').trim();return{name:`Undifferentiated ${region.toLowerCase()} running-injury pattern`,source:'App clinical reasoning',strength:'Limited',evidence:['the selected region is known, but the current answers do not yet separate the compatible patterns'],alternatives:RUNNER_INJURY_LIBRARY.filter(d=>regionCompatible(bodyRegion,d.key)).slice(0,4).map(d=>d.name),nominalDays:56,minDays:28,maxDays:112,key:'',family:bodyRegion==='Knee'?'knee':'generic',ranked:[],missing:adaptiveFollowUpQuestions(i,[]),urgent:false,safetyReasons:explicitRedFlags(i,[]),score:0};}
 const top=ranked[0],second=ranked[1],margin=top.score-(second?.score||0),evidence=[...top.location.map(x=>`location: ${x}`),...top.mechanism.map(x=>`mechanism: ${x}`),...top.features.map(x=>`feature: ${x}`)];if(top.contextBonus>=6)evidence.push('the pain location and aggravating activities fit this pattern');if(top.structured>=3)evidence.push('structured symptom answers strengthen this pattern');if(top.contradiction>0)evidence.push('some answers conflict with the pattern and reduce confidence');if(i.pop)evidence.push('pop/snap reported');if(i.bruising)evidence.push('bruising/swelling reported');if(Number.isFinite(initialPain))evidence.push(`initial pain ${initialPain}/10`);if(Number.isFinite(walk))evidence.push(`initial walking pain ${walk}/10`);
 const displayRanked=ranked.slice(0,4).map((x,n)=>({name:x.name,region:x.region,strength:matchStrength(x.score,n===0?margin:0),urgent:!!x.urgent,key:x.key,score:Math.max(0,Math.round(x.score))}));const safetyReasons=explicitRedFlags(i,ranked.slice(0,4));return{name:top.name,source:'App clinical reasoning',strength:matchStrength(top.score,margin),evidence:evidence.length?evidence:['location and symptom pattern'],alternatives:[...(top.alternatives||[]),...displayRanked.slice(1).map(x=>x.name)].filter((x,n,a)=>a.indexOf(x)===n).slice(0,5),nominalDays:top.days,minDays:top.minDays||Math.round(top.days*.7),maxDays:top.maxDays||Math.round(top.days*1.5),key:top.key,family:diagnosisFamily(top.key),coverageTier:top.tier||'Core injury',coverageRank:top.rank||null,ranked:displayRanked,missing:adaptiveFollowUpQuestions(i,ranked),urgent:safetyReasons.length>0,safetyReasons,score:top.score};
}
function adaptiveFollowUpQuestions(i,ranked=[]){
 const region=i.bodyRegion||'',q=[];const add=(field,text)=>{if(!known(i[field]))q.push(text)};
 add('focalTenderness','Is there one precise point that is markedly tender?');add('hopPain','Does single-leg hopping reproduce the symptom?');add('nightPain','Is pain present at night or at rest?');
 if(/Heel|Forefoot|Ankle/.test(region)){add('morningFirstStep','Are the first steps in the morning painful?');add('shoeRelated','Do tighter shoes or lacing make it worse?');add('barefootBetter','Does removing the shoe or walking barefoot improve it?');add('numbTingle','Is there burning, numbness or tingling?');add('resolves48h','Does it reliably settle within 24–48 hours?');}
 if(region==='Knee'){add('lockingCatching','Does the knee lock, catch or swell?');add('instability','Does it give way or feel unstable?');}
 if(/Hip|Groin|thigh|hamstring/.test(region)){add('sittingPain','Does prolonged sitting reproduce it?');add('resistedPain','Does resisted contraction reproduce it?');}
 if(/Shin|Calf/.test(region)){add('exertionalResolution','Does tightness reliably stop within minutes after ending the run?');add('numbTingle','Is numbness or weakness present?');}
 add('recentLoadIncrease','Was there a recent increase in distance, speed, hills or frequency?');add('newShoes','Did shoes, insoles or lacing change recently?');return q.slice(0,6);
}
function clinicianVerification(i,app){
 const entered=String(i.clinicalDiagnosis||'').trim();if(!entered)return null;
 const mapped=clinicianLibraryMatch(entered),hasMap=!!mapped?.hits,appKey=app?.key||'',agrees=hasMap&&mapped.key===appKey;
 const inDifferential=hasMap&&app?.ranked?.some(x=>x.key===mapped.key);
 const verdict=agrees?'confirms':inDifferential?'partly_agrees':'contradicts';
 const status=verdict==='confirms'?'App assessment confirms the clinician diagnosis':verdict==='partly_agrees'?'App assessment partly agrees: the clinician diagnosis remains plausible but is not the leading pattern':'App assessment contradicts the clinician diagnosis based on the current answers';
 let reasons=[];
 if(agrees)reasons.push('the independently ranked symptom pattern matches the clinician-entered diagnosis');
 else if(inDifferential)reasons.push('the clinician diagnosis remains in the differential, but another pattern fits the current answers better');
 else reasons.push('the recorded symptoms and functional findings do not currently reproduce the clinician-entered diagnosis');
 if(!hasMap)reasons.push('the clinician wording could not be mapped confidently to the app injury library');
 return{entered,mapped:hasMap?mapped:null,status,verdict,agrees,inDifferential,reasons};
}
function workingDiagnosis(i){
 const app=appPatternDiagnosis(i),verification=clinicianVerification(i,app),enteredDays=nullableNumber(i.clinicianExpectedDays);if(!verification)return{...app,verification:null};
 const useMapped=verification.mapped&&verification.agrees,base=useMapped?verification.mapped:RUNNER_INJURY_LIBRARY.find(x=>x.key===app.key);return{...app,verification,clinicianEntered:verification.entered,nominalDays:enteredDays??(base?.days||app.nominalDays),minDays:enteredDays??(base?.minDays||app.minDays),maxDays:enteredDays??(base?.maxDays||app.maxDays),source:'App clinical reasoning with clinician cross-check'};
}
function injuryCausePrevention(i,diag){
 const e=structuredClinicalEvidence(i),causes=[],prevention=[];if(e.loadIncrease)causes.push('Recent training-load increase may have exceeded current tissue capacity.');if(e.newShoes||e.shoeRelated)causes.push('Footwear fit, lacing, stiffness or pressure may be contributing.');if(e.cambered)causes.push('Cambered or uneven surfaces may be repeatedly loading one side.');
 if(diag.key==='lateral_plantar_overload'){causes.push('The lateral plantar muscles may be fatiguing or being compressed during running.');prevention.push('Use a shoe with adequate forefoot width and avoid overtight lacing.','Progress long-run duration gradually and alternate cambered-road direction.','Add short-foot control and controlled calf raises 2–3 times weekly.','Stop before the cramp-like symptom escalates rather than running through it.');}
 else if(diag.key==='dorsal_lace_compression'){causes.push('Lacing pressure or a low-volume shoe upper may be compressing the extensor tendons and superficial tissues.');prevention.push('Use window lacing over the tender area.','Reduce lace tension and check shoe volume over the instep.','Do not use the provoking shoe for long runs until symptom-free.');}
 else if(diag.key==='shoe_toebox_compression'){causes.push('The toe box may be too narrow once the foot swells during longer running.');prevention.push('Use adequate toe-box width and thumb-width length.','Test shoes late in the day when feet are larger.','Loosen forefoot lacing before longer runs.');}
 else if(diag.key==='carbon_shoe_transition'){causes.push('A sudden change in shoe stiffness and rocker geometry may have shifted load to the calf, Achilles, arch or forefoot.');prevention.push('Introduce stiff or plated shoes in short easy runs first.','Alternate with familiar shoes.','Increase duration before using them for speed or long runs.');}
 else if(diag.key==='camber_lateral_chain'){causes.push('Repeated road camber may be loading the downhill-side hip, knee, peroneals and outer foot asymmetrically.');prevention.push('Alternate road side or route direction where safe.','Prefer flatter surfaces while symptoms settle.','Avoid combining camber, hills and long duration in one progression step.');}
 else if(diag.key==='exercise_cramp'){causes.push('Neuromuscular fatigue is the commonest immediate contributor; heat, pacing and individual fluid or sodium losses may also contribute.');prevention.push('Build event-specific endurance and avoid abrupt pace surges.','Start long or hot runs conservatively.','Use an individual hydration and sodium plan rather than assuming all cramps are electrolyte deficiency.');}
 else if(diag.key==='downhill_quad_overload'){causes.push('Unaccustomed eccentric braking on descents can produce delayed quadriceps soreness without a structural tear.');prevention.push('Introduce downhill volume gradually.','Use short controlled descents before long technical downhill running.','Maintain quadriceps strength and avoid hard downhill sessions when already fatigued.');}
 else if(diag.family==='tendon'){causes.push('Repeated load may currently exceed tendon capacity.');prevention.push('Build volume and speed progressively.','Continue progressive strength after symptoms settle.','Avoid abrupt changes in hills, speed or footwear.');}
 else if(diag.family==='bone'){causes.push('Repeated impact load and insufficient recovery may be contributing.');prevention.push('Do not progress impact until clinically assessed.','Review recent load, energy availability and recovery.');}
 else if(diag.family==='muscle'||diag.family==='hamstring'){causes.push('High-speed or fatigue-related muscle load may have exceeded capacity.');prevention.push('Reintroduce speed progressively.','Maintain strength through full range and include warm-up accelerations.');}
 else{causes.push('The pattern is usually influenced by the interaction of training load, tissue capacity, biomechanics and recovery.');prevention.push('Change one training variable at a time.','Maintain strength and monitor recurrence after harder sessions.');}
 const libraryEntry=RUNNER_INJURY_LIBRARY.find(x=>x.key===diag.key),transient=!!libraryEntry?.selfManage&&e.resolves48h&&!e.focalTenderness&&!e.hopPain&&!e.nightPain&&!e.numbTingle; if(!causes.length)causes.push('No single cause can be established from the current information.');return{causes:[...new Set(causes)],prevention:[...new Set(prevention)],needsRehab:!transient,selfManagement:transient};
}
function known(v){return v!==null&&v!==undefined}
function sortedChecks(i){return(i.checkIns||[]).filter(check=>CORE.isIsoDate(check.date)&&check.date<=iso(today())).slice().sort((a,b)=>a.date.localeCompare(b.date))}
function rehabPlanStart(i){const raw=i?.rehabStartDate||i?.date||iso(today());try{return iso(dte(raw))}catch{return i?.date||iso(today())}}
function rehabPlanDayIndex(i,date){return Math.max(0,Math.round((dte(date)-dte(rehabPlanStart(i)))/DAY))}
function lastObserved(checks,field,predicate=v=>known(v)){
 for(let n=checks.length-1;n>=0;n--){const v=checks[n]?.[field];if(predicate(v))return{value:v,date:checks[n].date,check:checks[n],index:n};}
 return{value:null,date:null,check:null,index:-1};
}
function observedValue(checks,field,fallback=null,predicate=v=>known(v)){const x=lastObserved(checks,field,predicate);return x.index>=0?x.value:fallback}
function daysSinceObserved(obs){return obs?.date?Math.max(0,Math.round((today()-dte(obs.date))/DAY)):null}
function latestAdverse(checks,field){const x=lastObserved(checks,field);return x.index>=0&&x.value===true&&daysSinceObserved(x)<=2}
function recentChecks(checks,days=14){const cut=today().getTime()-days*DAY;return checks.filter(c=>dte(c.date).getTime()>=cut)}
function runEvidence(checks){
 const normalized=checks.map(c=>Number(c.runMinutes)>0&&['not_assessed','not_planned',null,undefined,''].includes(c.runStatus)?{...c,runStatus:'completed'}:c);
 // A completed exposure is historical evidence even when gait or next-day tolerance
 // was not assessed. Those response fields determine whether it was tolerated, not
 // whether the run happened.
 const completed=normalized.filter(c=>c.runStatus==='completed'&&Number(c.runMinutes)>0);
 const tolerated=completed.filter(c=>c.nextDayWorse===false&&c.alteredGait===false);
 const provisionallyTolerated=completed.filter(c=>c.nextDayWorse!==true&&c.alteredGait!==true);
 const lastCompleted=completed.at(-1)||null;
 const lastTolerated=tolerated.at(-1)||null;
 const lastAttempt=normalized.slice().reverse().find(c=>['completed','stopped','unable'].includes(c.runStatus)||Number(c.runMinutes)>0)||null;
 const latest=normalized.at(-1)||{};
 const latestNeutral=['not_planned','rest_day','not_assessed',undefined,null,''].includes(latest.runStatus);
 return{
  completed,tolerated,successful:provisionallyTolerated,lastCompleted,lastTolerated,lastSuccess:lastTolerated,lastAttempt,
  preserved:!!lastCompleted&&latestNeutral,
  bestCompletedMinutes:completed.length?Math.max(...completed.map(c=>Number(c.runMinutes)||0)):0,
  bestMinutes:provisionallyTolerated.length?Math.max(...provisionallyTolerated.map(c=>Number(c.runMinutes)||0)):0,
  lastCompletedMinutes:lastCompleted?Number(lastCompleted.runMinutes)||0:null,
  lastMinutes:lastTolerated?Number(lastTolerated.runMinutes)||0:null
 };
}
function longitudinalSnapshot(i,checks){
 const latest=checks.at(-1)||{},run=runEvidence(checks),recent=recentChecks(checks,14);
 const painObs=lastObserved(checks,'pain',Number.isFinite),walkObs=lastObserved(checks,'walkPain',Number.isFinite),confidenceObs=lastObserved(checks,'confidence',Number.isFinite),stiffObs=lastObserved(checks,'morningStiffness',Number.isFinite),walkMinObs=lastObserved(checks,'walkMinutes',Number.isFinite),stairsObs=lastObserved(checks,'stairs'),strengthObs=lastObserved(checks,'bridge'),impactObs=lastObserved(checks,'hop');
 const trendVals=recent.filter(c=>Number.isFinite(c.pain)).map(c=>c.pain),painTrend=trendVals.length>=2?trendVals.at(-1)-trendVals[0]:null;
 return{latest,run,recent,painObs,walkObs,confidenceObs,stiffObs,walkMinObs,stairsObs,strengthObs,impactObs,painTrend,
  currentPain:painObs.index>=0?Number(painObs.value):nullableNumber(i.currentPain),walkPain:walkObs.index>=0?Number(walkObs.value):nullableNumber(i.currentWalkPain),
  strength:strengthObs.value,impact:impactObs.value,confidence:confidenceObs.value,morningStiffness:stiffObs.value,walkMinutes:walkMinObs.value,stairs:stairsObs.value};
}
function checkStatus(checks,test){const assessed=checks.filter(test.assessed),met=assessed.length?test.pass(assessed):null;return met===null?'unknown':met?'met':'notMet'}
function criterionState(i,p,stageIndex){const checks=sortedChecks(i),snap=longitudinalSnapshot(i,checks),stable=checks.filter(c=>c.nextDayWorse===false&&c.newSwelling===false),run=runEvidence(checks),tests={
 'Symptoms stable or improving':{assessed:c=>known(c.symptomTrend)||known(c.nextDayWorse)||Number.isFinite(c.pain),pass:()=>{const last=checks.slice(-3);return !last.some(c=>c.symptomTrend==='worse'||c.nextDayWorse===true)&&!(Number.isFinite(snap.painTrend)&&snap.painTrend>=2)}},
 'No new swelling or bruising':{assessed:c=>known(c.newSwelling),pass:a=>a.slice(-2).every(c=>c.newSwelling===false)},
 'Walking pain ≤3/10':{assessed:c=>Number.isFinite(c.walkPain),pass:()=>Number.isFinite(snap.walkPain)&&snap.walkPain<=3},
 'Walking pain ≤1/10':{assessed:c=>Number.isFinite(c.walkPain),pass:()=>Number.isFinite(snap.walkPain)&&snap.walkPain<=1},
 'Current pain ≤3/10':{assessed:c=>Number.isFinite(c.pain),pass:()=>Number.isFinite(snap.currentPain)&&snap.currentPain<=3},
 'Gentle double-leg loading tolerated':{assessed:c=>known(c.bridge),pass:()=>snap.strength===true},
 'Current pain ≤2/10':{assessed:c=>Number.isFinite(c.pain),pass:()=>Number.isFinite(snap.currentPain)&&snap.currentPain<=2},
 'Repeated bridge or hinge controlled':{assessed:c=>known(c.bridge),pass:()=>checks.filter(c=>c.bridge===true).length>=2},
 'No worse the next morning':{assessed:c=>known(c.nextDayWorse),pass:()=>stable.slice(-2).length>=2},
 'Walking pain 0/10':{assessed:c=>Number.isFinite(c.walkPain),pass:()=>snap.walkPain===0},
 'Gentle hopping tolerated':{assessed:c=>known(c.hop),pass:()=>checks.filter(c=>c.hop===true).length>=2},
 'Pain remains ≤2/10':{assessed:c=>Number.isFinite(c.pain),pass:()=>checks.filter(c=>Number.isFinite(c.pain)).slice(-2).every(c=>c.pain<=2)&&checks.filter(c=>Number.isFinite(c.pain)).slice(-2).length>=2},
 'No next-morning flare':{assessed:c=>known(c.nextDayWorse),pass:()=>stable.slice(-2).length>=2},
 'At least 10 minutes running tolerated':{assessed:c=>['completed','stopped','unable'].includes(c.runStatus)||Number.isFinite(c.runMinutes),pass:()=>run.successful.filter(c=>Number(c.runMinutes)>=10).length>=2},
 'No altered gait':{assessed:c=>known(c.alteredGait),pass:()=>run.successful.slice(-2).length>=2&&run.successful.slice(-2).every(c=>c.alteredGait===false)},
 'At least 30 minutes easy running tolerated':{assessed:c=>['completed','stopped','unable'].includes(c.runStatus)||Number.isFinite(c.runMinutes),pass:()=>run.successful.filter(c=>Number(c.runMinutes)>=30).length>=2},
 'Pain ≤1/10':{assessed:c=>Number.isFinite(c.pain),pass:()=>checks.filter(c=>Number.isFinite(c.pain)).slice(-2).length>=2&&checks.filter(c=>Number.isFinite(c.pain)).slice(-2).every(c=>c.pain<=1)},
 'Strength and impact confidence restored':{assessed:c=>known(c.bridge)||known(c.hop)||Number.isFinite(c.confidence),pass:()=>checks.filter(c=>c.bridge===true&&c.hop===true&&Number(c.confidence)>=8).length>=2}
 };
 const progressFor=label=>{
  if(label==='Gentle hopping tolerated'){
   const count=checks.filter(c=>c.hop===true).length;
   return{count,target:2,text:`${Math.min(count,2)} of 2 stable assessments`};
  }
  if(label==='Repeated bridge or hinge controlled'){
   const count=checks.filter(c=>c.bridge===true).length;
   return{count,target:2,text:`${Math.min(count,2)} of 2 controlled assessments`};
  }
  if(label==='No worse the next morning'||label==='No next-morning flare'){
   const count=stable.slice(-2).length;
   return{count,target:2,text:`${Math.min(count,2)} of 2 stable next-morning responses`};
  }
  if(label==='Pain remains ≤2/10'){
   const count=checks.filter(c=>Number.isFinite(c.pain)).slice(-2).filter(c=>c.pain<=2).length;
   return{count,target:2,text:`${Math.min(count,2)} of 2 recent pain checks`};
  }
  if(label==='At least 10 minutes running tolerated'){
   const count=run.successful.filter(c=>Number(c.runMinutes)>=10).length;
   return{count,target:2,text:`${Math.min(count,2)} of 2 tolerated runs`};
  }
  if(label==='At least 30 minutes easy running tolerated'){
   const count=run.successful.filter(c=>Number(c.runMinutes)>=30).length;
   return{count,target:2,text:`${Math.min(count,2)} of 2 tolerated runs`};
  }
  if(label==='No altered gait'){
   const count=run.successful.slice(-2).filter(c=>c.alteredGait===false).length;
   return{count,target:2,text:`${Math.min(count,2)} of 2 normal-gait runs`};
  }
  if(label==='Pain ≤1/10'){
   const count=checks.filter(c=>Number.isFinite(c.pain)).slice(-2).filter(c=>c.pain<=1).length;
   return{count,target:2,text:`${Math.min(count,2)} of 2 recent pain checks`};
  }
  if(label==='Strength and impact confidence restored'){
   const count=checks.filter(c=>c.bridge===true&&c.hop===true&&Number(c.confidence)>=8).length;
   return{count,target:2,text:`${Math.min(count,2)} of 2 combined assessments`};
  }
  return null;
 };
 return INJURY_STAGES[stageIndex].criteria.map(label=>{let t=tests[label],status=t?checkStatus(checks,t):'unknown',progress=progressFor(label);return{label,status,met:status==='met',progress};});}
function injuryPrediction(i){
 const checks=sortedChecks(i),latest=checks.at(-1)||{},diag=workingDiagnosis(i),initialPain=nullableNumber(i.initialPain),walkInitially=nullableNumber(i.initialWalkPain);let nominalTotal=Number(diag.nominalDays)||56;const severityKnown=Number.isFinite(initialPain)||Number.isFinite(walkInitially)||i.pop||i.bruising;const severityFactor=!severityKnown?1:(initialPain>=8||i.pop||walkInitially>=8?1.18:initialPain>=6||i.bruising||walkInitially>=5?1.08:initialPain<=2&&walkInitially<=1?.88:1);nominalTotal=Math.round(nominalTotal*severityFactor);const baselineMin=Math.max(7,Math.round((Number(diag.minDays)||nominalTotal*.7)*severityFactor)),baselineMax=Math.max(baselineMin+7,Math.round((Number(diag.maxDays)||nominalTotal*1.5)*severityFactor));
 const snap=longitudinalSnapshot(i,checks),currentPain=Number.isFinite(snap.currentPain)?snap.currentPain:initialPain,walkPain=Number.isFinite(snap.walkPain)?snap.walkPain:walkInitially,elapsed=Math.max(0,Math.floor((today()-dte(i.date))/DAY));
 let stage=0;for(let target=1;target<INJURY_STAGES.length;target++){const c=criterionState(i,{currentPain,walkPain},target);if(c.length&&c.every(x=>x.status==='met'))stage=target;else break;}if(diag.urgent)stage=Math.min(stage,1);
 const completion=injuryCompletionForChecks(i,checks,diag,initialPain,walkInitially),nominal=Math.round(clamp(elapsed/nominalTotal*100,0,100)),delta=completion===null?null:completion-nominal;
 const nominalRemaining=Math.max(7,nominalTotal-elapsed),stageRemaining=Math.max(7,Math.round(nominalTotal*[.94,.78,.60,.42,.25,.10][stage]));
 let trendRemaining=null,trendRate=null;if(checks.length>=2){const points=checks.map((c,idx)=>({day:Math.max(0,Math.round((dte(c.date)-dte(i.date))/DAY)),score:injuryCompletionForChecks(i,checks.slice(0,idx+1),diag,initialPain,walkInitially)})).filter(x=>Number.isFinite(x.score));if(points.length>=2){const first=points[0],last=points.at(-1),span=Math.max(1,last.day-first.day),gain=last.score-first.score;trendRate=gain/span;if(trendRate>.15)trendRemaining=Math.round((100-last.score)/trendRate);}}
 let remaining=trendRemaining!==null?Math.round(nominalRemaining*.35+stageRemaining*.35+clamp(trendRemaining,7,baselineMax)*.30):Math.round(nominalRemaining*.55+stageRemaining*.45);
 if(Number.isFinite(delta))remaining+=Math.round(clamp(-delta*.20,-14,21));if(latestAdverse(checks,'nextDayWorse'))remaining+=7;if(latestAdverse(checks,'newSwelling'))remaining+=7;if(latestAdverse(checks,'alteredGait'))remaining+=4;if(snap.run.lastAttempt?.runStatus==='unable'||snap.run.lastAttempt?.runStatus==='stopped')remaining+=4;if(diag.urgent)remaining=Math.max(remaining,Math.max(14,baselineMin-elapsed));
 remaining=Math.max(7,Math.min(Math.max(14,Math.round(baselineMax*1.25)),remaining));const total=elapsed+remaining,central=new Date(today().getTime()+remaining*DAY),uncertainty=checks.length>=7?Math.max(7,Math.round(nominalTotal*.12)):checks.length>=3?Math.max(10,Math.round(nominalTotal*.18)):Math.max(14,Math.round(nominalTotal*.25)),rangeStartTotal=Math.max(elapsed+7,Math.max(baselineMin,total-uncertainty)),rangeEndTotal=Math.max(rangeStartTotal+7,Math.min(Math.round(baselineMax*1.25),total+uncertainty)),windowStart=iso(new Date(dte(i.date).getTime()+rangeStartTotal*DAY)),windowEnd=iso(new Date(dte(i.date).getTime()+rangeEndTotal*DAY)),confidence=checks.length>=7?'Moderate':checks.length>=3?'Developing':'Low';return{nominalTotal,baselineMin,baselineMax,total,elapsed,remaining,stage,fullDate:iso(central),windowStart,windowEnd,confidence,currentPain,walkPain,completion,nominal,delta,latest,checks,diag,safetyHold:diag.urgent,trendRate,snapshot:snap};
}
function injuryCompletionForChecks(i,checks,diag,initialPain,walkInitially){
 if(!checks.length)return null;const snap=longitudinalSnapshot(i,checks),currentPain=Number.isFinite(snap.currentPain)?snap.currentPain:initialPain,walkPain=Number.isFinite(snap.walkPain)?snap.walkPain:walkInitially;let stage=0;for(let target=1;target<INJURY_STAGES.length;target++){const c=criterionState({...i,checkIns:checks},{currentPain,walkPain},target);if(c.length&&c.every(x=>x.status==='met'))stage=target;else break;}if(diag.urgent)stage=Math.min(stage,1);
 const stageBase=[5,18,36,56,74,90][stage];let within=0;
 if(Number.isFinite(currentPain))within+=(3-currentPain)*1.6;
 if(Number.isFinite(walkPain))within+=(1-walkPain)*1.6;
 if(snap.strength===true)within+=2;if(snap.strength===false)within-=2;
 if(snap.impact===true)within+=2;if(snap.impact===false)within-=2;
 if(snap.run.bestMinutes>=10)within+=2;if(snap.run.bestMinutes>=30)within+=2;
 if(Number.isFinite(snap.confidence))within+=(snap.confidence-5)*.45;
 if(Number.isFinite(snap.morningStiffness))within+=snap.morningStiffness<=10?1:snap.morningStiffness>=45?-2:0;
 const recent=snap.recent;
 if(recent.some(c=>c.nextDayWorse===true))within-=3;
 if(recent.some(c=>c.newSwelling===true))within-=3;
 if(recent.some(c=>c.alteredGait===true))within-=2;
 if(snap.painTrend!==null)within+=snap.painTrend<=-2?2:snap.painTrend>=2?-3:0;
 // A rest day or an unassessed activity does not erase a previously demonstrated capability.
 return Math.round(clamp(stageBase+Math.max(-10,Math.min(12,within)),0,98));
}
function milestoneStatus(p){const checks=p.checks,stable=checks.filter(c=>c.nextDayWorse===false),twoRun=stable.filter(c=>Number(c.runMinutes)>=10&&!c.alteredGait).length>=2,twoLong=stable.filter(c=>Number(c.runMinutes)>=30&&!c.alteredGait).length>=2;return[
 {name:'Comfortable walking',status:Number.isFinite(p.walkPain)?(p.walkPain===0?'met':'notMet'):'unknown'},
 {name:'Strength loading',status:checks.filter(c=>c.bridge===true).length>=2?'met':checks.some(c=>known(c.bridge))?'notMet':'unknown'},
 {name:'Impact tolerance',status:checks.filter(c=>c.hop===true).length>=2?'met':checks.some(c=>known(c.hop))?'notMet':'unknown',detail:`${Math.min(checks.filter(c=>c.hop===true).length,2)} of 2 stable assessments`},
 {name:'Walk–run',status:twoRun?'met':checks.some(c=>known(c.runMinutes))?'notMet':'unknown'},
 {name:'Continuous easy run',status:twoLong?'met':checks.some(c=>Number(c.runMinutes)>0)?'notMet':'unknown'},
 {name:'Full training',status:p.stage>=5&&twoLong?'met':'unknown'}];}
function comparisonFactors(i,p){let s=p.snapshot||longitudinalSnapshot(i,p.checks),f=[],add=(name,actual,nominal,status,reason)=>f.push({name,actual,nominal,status,reason}),unknown='unknown';
 add('Pain',valueText(p.currentPain),p.elapsed<14?'3–5/10':'0–3/10',!Number.isFinite(p.currentPain)?unknown:p.currentPain<=2?'ahead':p.currentPain>=5?'behind':'on',!Number.isFinite(p.currentPain)?'Pain has not been assessed.':p.currentPain<=2?'Latest reported pain supports progressive loading.':p.currentPain>=5?'Latest reported pain remains higher than expected.':'Latest reported pain is within the broad expected range.');
 add('Walking',Number.isFinite(p.walkPain)?`${p.walkPain}/10 pain`:'Not assessed',p.elapsed<10?'Some limitation':'Comfortable',!Number.isFinite(p.walkPain)?unknown:p.walkPain===0?'ahead':p.walkPain>=3?'behind':'on',!Number.isFinite(p.walkPain)?'Walking pain has not been assessed.':p.walkPain===0?'Comfortable walking has been demonstrated.':'Walking symptoms still limit progression.');
 add('Strength',s.strength===true?'Controlled':s.strength===false?'Not tolerated':'Not assessed',p.elapsed<21?'Beginning':'Controlled repeated loading',!known(s.strength)?unknown:s.strength?'ahead':'behind',!known(s.strength)?'No recent strength assessment is available.':s.strength?'The most recent assessed strength task was controlled.':'The most recent assessed strength task was not tolerated.');
 add('Impact',s.impact===true?'Tolerated':s.impact===false?'Not tolerated':'Not assessed',p.elapsed<28?'Usually not required':'Expected to be emerging',!known(s.impact)?unknown:s.impact?'ahead':p.elapsed>=28?'behind':'on',!known(s.impact)?'No impact assessment is available.':s.impact?'The latest assessed low-level impact was tolerated.':'The latest assessed impact task was not tolerated.');
 const lastRun=s.run.lastCompleted;
 const runActual=lastRun?`${s.run.lastCompletedMinutes} min on ${fmtDate(lastRun.date)}`:(s.run.lastAttempt?.runStatus==='unable'?'Unable on last attempt':s.run.lastAttempt?.runStatus==='stopped'?'Stopped due to symptoms':'Not assessed');
 const confirmedTolerance=!!lastRun&&lastRun.nextDayWorse===false&&lastRun.alteredGait===false;
 const adverseRun=!!lastRun&&(lastRun.nextDayWorse===true||lastRun.alteredGait===true);
 const runStatus=!lastRun?(s.run.lastAttempt?.runStatus==='unable'||s.run.lastAttempt?.runStatus==='stopped'?'behind':unknown):adverseRun?'behind':s.run.bestCompletedMinutes>=10?'ahead':'on';
 let runReason;
 if(lastRun){
  const neutralToday=s.latest.date!==lastRun.date&&['not_planned','rest_day','not_assessed',undefined,null,''].includes(s.latest.runStatus);
  if(adverseRun)runReason=`A ${s.run.lastCompletedMinutes}-minute run was completed on ${fmtDate(lastRun.date)}, but gait or delayed symptoms indicate it was not yet fully tolerated.`;
  else if(confirmedTolerance)runReason=neutralToday?'No run was planned or assessed today; the last confirmed running capacity is retained.':'The latest completed run was followed by normal gait and a stable next-day response.';
  else runReason=neutralToday?'No run was planned or assessed today; yesterday’s completed running duration remains recorded, while tolerance awaits gait and next-day-response evidence.':'The running exposure is recorded, but full tolerance is not yet confirmed because gait or next-day response was not assessed.';
 }else runReason=runStatus==='behind'?'The last attempted run was limited by symptoms.':'Running ability has not yet been assessed.';
 add('Running',runActual,p.elapsed<28?'Often 0 min':'Some easy exposure',runStatus,runReason);
 const resp=lastObserved(p.checks,'nextDayWorse');add('Load response',resp.index<0?'Not assessed':resp.value?'Worse':'Stable','Stable',resp.index<0?unknown:resp.value?'behind':'ahead',resp.index<0?'No next-day load response has been recorded.':resp.value?'The most recently assessed load caused a delayed flare.':'The most recently assessed load did not worsen symptoms the next day.');
 return f;}
function recoveryScoreExplanation(i,p,factors=comparisonFactors(i,p)){
 if(p.completion===null)return{status:'unknown',label:'Not enough evidence',text:'Complete daily check-ins to compare observed recovery with the nominal pathway. Calendar time alone does not create a recovery score.'};
 const ahead=factors.filter(x=>x.status==='ahead'),behind=factors.filter(x=>x.status==='behind');
 const status=p.delta>=8?'ahead':p.delta<=-8?'behind':'on';
 const label=status==='ahead'?'Ahead of nominal':status==='behind'?'Behind nominal':'Close to nominal';
 const lead=status==='ahead'?`${Math.abs(p.delta)} percentage points ahead of the nominal pathway.`:status==='behind'?`${Math.abs(p.delta)} percentage points behind the nominal pathway.`:`Within ${Math.abs(p.delta)} percentage points of the nominal pathway.`;
 const positives=ahead.slice(0,3).map(x=>x.name.toLowerCase());const limits=behind.slice(0,3).map(x=>x.name.toLowerCase());
 let why='The score reflects the current stage, symptoms, walking, strength, impact, running exposure and next-morning response.';
 if(status==='ahead'&&positives.length)why=`Main positive evidence: ${positives.join(', ')}.`;
 if(status==='behind'&&limits.length)why=`Main limiting evidence: ${limits.join(', ')}.`;
 if(status==='on'){const parts=[];if(positives.length)parts.push(`positive: ${positives.join(', ')}`);if(limits.length)parts.push(`limiting: ${limits.join(', ')}`);if(parts.length)why=`The evidence is balanced (${parts.join('; ')}).`;}
 return{status,label,text:`${lead} ${why}`};
}
function exerciseList(i,p){if(p.safetyHold)return INJURY_EXERCISES.bone;let family=p.diag.family||'generic',list=INJURY_EXERCISES[family]||INJURY_EXERCISES.muscle,exact=list.filter(x=>x.stage===p.stage);if(!exact.length)exact=list.filter(x=>x.stage<=p.stage).slice(-1);return exact;}

function rehabCalendarSignature(day){return JSON.stringify({type:day.type,title:day.title,items:day.items,running:day.running,rationale:day.rationale,rule:day.rule,stage:day.stage,walkingTarget:day.walkingTarget,stretchGoal:day.stretchGoal,stretchGoalWhy:day.stretchGoalWhy,bestOutcome:day.bestOutcome,evidence:day.evidence});}
function walkingPrescription(i,p,offset,type){
 const snap=p.snapshot||longitudinalSnapshot(i,p.checks),last=Number.isFinite(snap.walkMinutes)?snap.walkMinutes:null,stage=p.stage;
 const defaults=[5,10,15,20,30,40],caps=[15,25,40,60,75,90];
 let target=last!==null?last:defaults[stage];
 if(type==='recovery')target=Math.max(defaults[stage],Math.round(target*.8));
 if(type==='assessment'||type==='impact'||type==='run')target=Math.max(defaults[stage],Math.round(target*.75));
 const recent=(p.checks||[]).slice(-3),flare=recent.some(c=>c.nextDayWorse===true||c.newSwelling===true||c.alteredGait===true),walkPain=Number.isFinite(p.walkPain)?p.walkPain:null;
 if(flare||walkPain>=4)target=Math.max(5,Math.round(target*.65));
 else if(walkPain===3)target=Math.max(5,Math.round(target*.8));
 target=Math.min(caps[stage],Math.max(5,Math.round(target/5)*5));
 return{target,walkingTarget:`Walk ${target} minutes at a comfortable, even pace`};
}
function rehabRecommendationEvidence(i,p,type){
 const checks=p.checks||[],snap=p.snapshot||longitudinalSnapshot(i,checks),knownPain=Number.isFinite(p.currentPain),knownWalk=Number.isFinite(p.walkPain),hasResponse=checks.some(c=>known(c.nextDayWorse)),hasExecution=checks.some(c=>rehabExecutionMeta(c).assessed);
 let points=(checks.length>=3?2:checks.length?1:0)+(knownPain?1:0)+(knownWalk?1:0)+(hasResponse?1:0)+(hasExecution?1:0);
 if(type==='impact')points+=known(snap.impact)?2:0;
 if(['assessment','run'].includes(type))points+=snap.run?.lastCompleted?2:0;
 const level=points>=7?'High':points>=4?'Moderate':'Low',className=level.toLowerCase();
 const reasons=[];if(checks.length)reasons.push(`${checks.length} check-in${checks.length===1?'':'s'}`);if(knownPain)reasons.push('current pain recorded');if(knownWalk)reasons.push('walking response recorded');if(hasResponse)reasons.push('delayed response recorded');if(type==='impact'&&known(snap.impact))reasons.push('impact tolerance recorded');if(['assessment','run'].includes(type)&&snap.run?.lastCompleted)reasons.push('running exposure recorded');
 const gaps=[];if(!knownPain)gaps.push('current pain');if(!knownWalk)gaps.push('walking response');if(!hasResponse)gaps.push('next-morning response');if(type==='impact'&&!known(snap.impact))gaps.push('impact tolerance');if(['assessment','run'].includes(type)&&!snap.run?.lastCompleted)gaps.push('running exposure');
 return{level,className,reasons,gaps,text:`${level} evidence${reasons.length?` based on ${reasons.join(', ')}`:''}.${gaps.length?` More certainty needs ${gaps.join(', ')}.`:''}`};
}
function stageSpecificStretchGoal(i,p,type,walk,items){
 const stage=p.stage,family=p.diag?.family||'generic',recent=(p.checks||[]).slice(-3),flare=recent.some(c=>c.nextDayWorse===true||c.newSwelling===true||c.alteredGait===true),pain=Number.isFinite(p.currentPain)?p.currentPain:null,walkPain=Number.isFinite(p.walkPain)?p.walkPain:null;
 const unavailable=p.safetyHold||flare||(pain!==null&&pain>2)||(walkPain!==null&&walkPain>2);
 if(p.safetyHold||family==='bone')return{offered:false,title:'No optional progression today',text:'Do not increase loading. Follow the protective plan and obtain the recommended clinical assessment.',why:'Higher-risk patterns should not use optional progression before clearance.'};
 if(unavailable)return{offered:false,title:'Optional progression unavailable today',text:'Complete only today’s prescribed rehabilitation. Do not add volume while pain, gait, swelling or delayed response is unfavourable.',why:'Current evidence does not support extra loading.'};
 if(stage===0)return{offered:false,title:'No optional progression today',text:'Recovery and comfortable movement are the goal. Do not increase loading today.',why:'The first phase prioritises settling symptoms rather than exceeding the prescription.'};

 // The progression must extend an activity that is actually prescribed TODAY.
 // Never infer running simply because the overall rehabilitation stage includes running.
 if(type==='impact')return{offered:true,title:'Optional progression',text:`Complete the impact assessment exactly as prescribed. If every repetition is controlled and pain remains ≤2/10, add 5 minutes of comfortable walking (${walk.target+5} minutes total). Do not add hops or jogging.`,why:'Today is an assessment day. Extra walking adds a small low-risk dose without contaminating the impact test.'};

 if(type==='load'){
  let text='If all prescribed strength work is controlled and pain remains ≤2/10, add one extra set to ONE prescribed strength exercise only. Do not add running, hopping or another exercise.';
  if(family==='tendon')text='If all prescribed strength work is controlled and symptoms remain ≤2/10, add one extra controlled set to the primary loading exercise only. Do not add speed, hopping or running.';
  return{offered:true,title:'Optional progression',text,why:'Today is a strength day, so the optional progression increases only the strength dose that is already scheduled.'};
 }

 if(type==='recovery'){
  return{offered:true,title:'Optional progression',text:`If today’s walking and mobility remain symptom-neutral with normal gait, add 5 minutes of comfortable walking (${walk.target+5} minutes total). Do not add running, hopping or strength volume.`,why:'Today is a lower-load recovery day, so only comfortable walking is progressed.'};
 }

 if(type==='assessment'){
  return{offered:true,title:'Optional progression',text:'If every PLANNED walk–run interval is completed with pain ≤2/10, normal gait and no increasing tightness, add one additional walk–run interval only. Do not lengthen every running interval.',why:'Running is explicitly scheduled today; one additional interval changes only one exposure variable.'};
 }

 if(type==='run'){
  return{offered:true,title:'Optional progression',text:'If the full prescribed easy run is completed with pain ≤2/10 and normal gait, increase total running time by no more than 5–10%. Confirm that symptoms remain stable later and the next morning before retaining the increase.',why:'Running is explicitly scheduled today, so a small running-volume progression is appropriate only after stable completion.'};
 }

 // Defensive fallback for any future day type.
 return{offered:false,title:'No optional progression today',text:'Complete the prescribed rehabilitation only. No additional activity is recommended for this day.',why:'No safe progression rule is defined for the activities scheduled today.'};
}
function bestPossibleOutcomeToday(i,p,type,stretch){
 if(p.safetyHold)return'Best outcome today: remain symptom-stable and complete the protective plan without adding load.';
 if(type==='impact')return'Best outcome today: a controlled, symptom-stable assessment adds evidence toward impact clearance. The forecast is recalculated after the later and next-morning response.';
 if(type==='assessment')return'Best outcome today: a well-tolerated walk–run exposure strengthens the case for progression; the estimated unrestricted-running window may move earlier after a stable next-morning response.';
 if(type==='run')return'Best outcome today: completing the planned run with normal gait and no delayed flare can improve the unrestricted-running estimate by about one day.';
 if(type==='load')return'Best outcome today: controlled completion with no delayed flare can satisfy a strength criterion and support an earlier progression decision.';
 return'Best outcome today: symptoms remain stable or improve, preserving the current progression trajectory.';
}
function rehabSyntheticGuide(name,dose,purpose,steps,why,progress){
 return{stage:null,name,dose,purpose,steps,why,progress};
}
function validateRehabDayPrescription(day){
 const prescribed=(day.items||[]).map(x=>String(x));
 const guides=(day.guideExercises||[]).filter(g=>prescribed.some(item=>item.startsWith(`${g.name} —`)||item===g.name));
 return{...day,guideExercises:guides,prescriptionConsistent:guides.length===(day.guideExercises||[]).length};
}
function rehabCalendarDay(i,p,date,offset){
 const planStart=rehabPlanStart(i),beforePlan=dte(date)<dte(planStart),planDay=beforePlan?-1:rehabPlanDayIndex(i,date);
 const exercises=exerciseList(i,p),stage=p.stage,safety=p.safetyHold,weekday=dte(date).toLocaleDateString(undefined,{weekday:'long'}),loadDay=planDay>=0?planDay%2===0:false;
 if(beforePlan)return{date,weekday,type:'preplan',title:'Rehabilitation plan not started',items:[],running:'No rehabilitation plan yet',rationale:`The rehabilitation plan starts on ${fmtDate(planStart)}. This date can be used for symptom tracking only.`,rule:'No rehabilitation activity is prescribed before the selected plan start date.',stage,walkingTarget:'No walking target planned',stretchGoal:'No stretch goal planned',stretchGoalWhy:'The rehabilitation plan has not started.',bestOutcome:'No rehabilitation outcome is expected before the selected plan start date.',guideExercises:[],evidence:{level:'Low',className:'low',text:'Low evidence because the rehabilitation plan has not started.'}};
 offset=planDay;const cycleDay=((planDay%7)+7)%7;
 let type='recovery',title='Recovery and symptom response',items=[],guideExercises=[],running='No running planned',rationale='A lower-load day allows the response to the previous rehabilitation dose to become clear.',rule='Keep normal daily activity comfortable and record any delayed response.';
 if(safety){title='Protect and arrange assessment';items=['No running, hopping or impact testing','Follow professional guidance for loading'];rationale='The leading pattern or differential contains a higher-risk feature, so app-directed progression is paused.';rule='Do not progress until clinically assessed.';}
 else if(stage<=2){
  if(stage===2&&[2,5].includes(cycleDay)){type='impact';title='Impact assessment';guideExercises=[rehabSyntheticGuide('Quiet jogging in place','2 × 20 seconds','Assess low-level impact tolerance with a controlled running-like movement.',['Stand tall with feet hip-width apart near a stable support.','Begin with a quiet, low bounce and alternate the feet as if jogging slowly.','Keep the steps short, land softly and keep the pelvis level.','Complete 20 seconds, rest 40–60 seconds, then repeat once.'],'Provides the first controlled impact exposure before walk–run training.','Progress only when both sets are controlled, pain stays at 0–2/10 and there is no later or next-morning worsening.'),rehabSyntheticGuide('Controlled double-leg hops','2 × 10 repetitions','Assess landing control and tolerance to repeated impact.',['Stand with feet hip-width apart and knees softly bent.','Perform a small vertical hop using both legs.','Land quietly on both feet with knees tracking over the toes.','Pause briefly between repetitions and stop if landing becomes guarded or uneven.'],'Confirms whether the injured area can tolerate repeated impact before running progression.','Progress when all repetitions are quiet and symmetrical, pain stays at 0–2/10 and symptoms are stable the next morning.')];items=guideExercises.map(x=>`${x.name} — ${x.dose}`);running='No running distance planned';rationale='This creates an explicit opportunity to assess low-level impact tolerance before walk–run progression. Two stable assessments are required for progression.';rule='Stop for pain above 2/10, altered landing, guarding or increasing tightness. Record the later and next-morning response.';}
  else if(loadDay){type='load';title=stage===0?'Settle symptoms and preserve movement':'Rehabilitation strength';guideExercises=exercises.slice();items=guideExercises.map(x=>`${x.name} — ${x.dose}`);rationale=stage===0?'Comfortable movement is the current priority before meaningful strengthening.':'This dose targets the current stage criteria without increasing more than one loading variable at once.';rule='Pain should stay at 0–2/10 and be no worse later or the next morning.';}
  else {guideExercises=[rehabSyntheticGuide('Gentle mobility','5–8 minutes through a comfortable range','Maintain comfortable movement without adding meaningful load.',['Move the affected area slowly through a comfortable range.','Avoid forcing end range or reproducing sharp pain.','Use smooth repetitions and relaxed breathing.','Stop if symptoms increase rather than settle.'],'Keeps movement available on a lower-load day while allowing the previous rehabilitation response to become clear.','Continue when movement remains comfortable and symptoms are no worse later or the next morning.')];items=[`${guideExercises[0].name} — ${guideExercises[0].dose}`,'No progression test today'];}
 } else if(stage===3){
  if([0,3,6].includes(cycleDay)){type='assessment';title='Walk–run exposure';guideExercises=exercises.slice();items=guideExercises.map(x=>`${x.name} — ${x.dose}`);running='Planned only if walking, pain and impact criteria remain stable';rationale='A spaced running exposure tests impact tolerance while preserving recovery days between attempts.';rule='Stop for pain above 2/10, altered gait or increasing tightness; progression depends on the next-morning response.';}
  else if([1,4].includes(cycleDay)){type='load';title='Strength & recovery day';guideExercises=(INJURY_EXERCISES[p.diag.family]||INJURY_EXERCISES.muscle).filter(x=>x.stage<=2).slice(-2);items=guideExercises.map(x=>`${x.name} — ${x.dose}`);rationale='Build strength and recovery between running days without adding extra impact.';rule='Use the last tolerated dose; do not increase load after a flare.';}
  else {guideExercises=[rehabSyntheticGuide('Mobility or light isometrics','5–10 minutes if symptom-neutral','Maintain movement or gentle muscle activation between running exposures.',['Choose comfortable mobility or a low-effort isometric used earlier in the plan.','Keep effort light and avoid fatigue.','Hold or move only within a symptom-neutral range.','Stop if symptoms increase during or after the activity.'],'Supports recovery between running exposures without adding another impact session.','Continue when the activity remains symptom-neutral and the next-morning response is stable.')];items=[`${guideExercises[0].name} — ${guideExercises[0].dose}`,'Review response to the previous running exposure'];}
 } else if(stage===4){
  if([0,3,6].includes(cycleDay)){type='run';title='Easy running progression';guideExercises=exercises.slice();items=guideExercises.map(x=>`${x.name} — ${x.dose}`);running='Easy continuous running planned';rationale='Running duration is rebuilt with at least one lower-load day between key exposures.';rule='Increase duration only after a stable same-day and next-morning response.';}
  else if([1,4].includes(cycleDay)){type='load';title='Supporting strength';guideExercises=(INJURY_EXERCISES[p.diag.family]||INJURY_EXERCISES.muscle).filter(x=>x.stage===2).slice(0,2);items=guideExercises.map(x=>`${x.name} — ${x.dose}`);rationale='Strength work supports running capacity without adding another impact session.';rule='Keep the dose controlled and symptom-neutral.';}
  else {items=['Easy cross-training if comfortable','No speed, hills or hard running','Record delayed symptoms'];}
 } else {
  if([0,2,4,6].includes(cycleDay)){type='run';title=cycleDay===4?'Controlled faster running':'Easy running';guideExercises=exercises.slice();items=guideExercises.map(x=>`${x.name} — ${x.dose}`);running=cycleDay===4?'Faster running only if easy running remains stable':'Easy run planned';rationale='The final phase alternates running exposure with recovery while restoring speed and normal training tolerance.';rule='Change one variable at a time and stop before maximal effort.';}
  else {type='load';title='Strength or recovery support';items=['Stage-appropriate strength maintenance','Comfortable mobility','No additional hard running'];rationale='A non-running day protects adaptation between running exposures.';rule='Use symptoms and the next-morning response to decide whether the next run progresses or repeats.';}
 }
 const walk=walkingPrescription(i,p,offset,type);
 items.unshift(walk.walkingTarget);
 if(!items.length)items=['Follow the current exercise prescription',walk.walkingTarget];
 const stretch=stageSpecificStretchGoal(i,p,type,walk,items),evidence=rehabRecommendationEvidence(i,p,type),bestOutcome=bestPossibleOutcomeToday(i,p,type,stretch);
 return validateRehabDayPrescription({date,weekday,type,title,items,running,rationale,rule,stage,walkingTarget:walk.walkingTarget,stretchGoal:stretch.text,stretchGoalTitle:stretch.title,stretchGoalWhy:stretch.why,stretchGoalOffered:stretch.offered,bestOutcome,evidence,guideExercises});
}
function rehabExecutionMeta(check){
 const legacy=check?.rehabStatus||null;
 let exercise=check?.rehabExerciseStatus||null, walking=check?.locomotionStatus||null, stretch=check?.stretchGoalStatus||null;
 let runStatus=check?.runStatus||'not_assessed', runMinutes=nullableNumber(check?.runMinutes);
 // Backwards compatibility for check-ins saved before build 10140.
 if(!exercise){
  if(['completed','stretch'].includes(legacy))exercise='all';
  else if(legacy==='reduced')exercise='some';
  else if(legacy==='walking_only')exercise='none';
  else if(legacy==='stopped')exercise='stopped';
  else if(legacy==='not_completed')exercise='none';
  else if(legacy==='not_planned')exercise='not_planned';
 }
 if(!walking){
  if(legacy==='walking_only'||['completed','stretch'].includes(legacy))walking='completed';
  else if(legacy==='reduced')walking='partial';
  else if(legacy==='stopped')walking='stopped';
  else if(legacy==='not_completed')walking='none';
  else if(legacy==='not_planned')walking='not_planned';
  else if(Number(check?.walkMinutes)>0)walking='completed';
 }
 if(!stretch&&legacy==='stretch')stretch='achieved';
 if(stretch==='not_planned')stretch=null;
 if(Number.isFinite(runMinutes)&&runMinutes>0&&['not_assessed','not_planned'].includes(runStatus))runStatus='completed';
 const exerciseMap={
  all:{label:'All prescribed rehab exercises completed',short:'Rehab exercises completed',className:'completed',score:100,answered:true,planned:true},
  some:{label:'Some prescribed rehab exercises completed',short:'Rehab exercises partially completed',className:'partial',score:60,answered:true,planned:true},
  stopped:{label:'Rehab exercises started but stopped because of symptoms',short:'Exercises stopped due to symptoms',className:'stopped',score:25,answered:true,planned:true},
  none:{label:'Prescribed rehab exercises were not started',short:'Rehab exercises not started',className:'missed',score:0,answered:true,planned:true},
  not_planned:{label:'No rehab exercises were planned',short:'No exercises planned',className:'rest',score:null,answered:true,planned:false}
 };
 const walkingMap={
  completed:{label:'The full prescribed walking target was completed',short:'Walking target completed',className:'completed',score:100,answered:true,planned:true},
  partial:{label:'Part of the prescribed walking target was completed without symptoms forcing the stop',short:'Walking target partially completed',className:'partial',score:60,answered:true,planned:true},
  stopped:{label:'Walking was started but stopped because symptoms increased or movement changed',short:'Walking stopped due to symptoms',className:'stopped',score:25,answered:true,planned:true},
  none:{label:'The prescribed walking target was not started',short:'Walking target not started',className:'missed',score:0,answered:true,planned:true},
  not_planned:{label:'No walking target was planned',short:'No walking target planned',className:'rest',score:null,answered:true,planned:false}
 };
 const runMap={
  completed:{label:`Run completed${Number.isFinite(runMinutes)?` (${runMinutes} min)`:''}; tolerance is assessed separately`,short:Number.isFinite(runMinutes)?`Run completed · ${runMinutes} min`:'Run completed',className:'completed',score:100,answered:true,planned:true},
  stopped:{label:`Running was started but stopped because of symptoms${Number.isFinite(runMinutes)?` after ${runMinutes} min`:''}`,short:'Run stopped due to symptoms',className:'stopped',score:25,answered:true,planned:true},
  unable:{label:'A planned run could not be started because of symptoms',short:'Run not started due to symptoms',className:'missed',score:0,answered:true,planned:true},
  not_planned:{label:'No run was planned for this day',short:'No run planned',className:'rest',score:null,answered:true,planned:false},
  not_assessed:{label:'Running was not assessed or reported for this day',short:'Running not assessed',className:'unknown',score:null,answered:false,planned:null}
 };
 const ex=exerciseMap[exercise]||{label:'Rehab exercise completion was not answered',short:'Exercises not assessed',className:'unknown',score:null,answered:false,planned:null};
 const walk=walkingMap[walking]||{label:'Walking-target completion was not answered',short:'Walking not assessed',className:'unknown',score:null,answered:false,planned:null};
 const run=runMap[runStatus]||runMap.not_assessed;
 // An overall percentage is shown only when every component has an explicit answer.
 // “Not planned” is an answer but is excluded from the weighted average.
 const allAnswered=[ex,walk,run].every(x=>x.answered);
 const scoredParts=[ex,walk,run].filter(x=>x.planned===true&&Number.isFinite(x.score));
 let score=allAnswered&&scoredParts.length?Math.round(avg(scoredParts.map(x=>x.score))):null;
 if(stretch==='achieved'&&Number.isFinite(score))score=Math.min(100,score+10);
 const assessed=Number.isFinite(score);
 const missing=[!ex.answered?'rehab exercises':null,!walk.answered?'walking target':null,!run.answered?'running exposure':null].filter(Boolean);
 const label=!assessed
  ?(missing.length?`Overall execution not scored: ${missing.join(', ')} ${missing.length===1?'is':'are'} not assessed`:'No planned rehabilitation components were available to score')
  :score>=90?'Excellent rehabilitation execution':score>=75?'Good rehabilitation execution':score>=50?'Partial rehabilitation execution':score>=25?'Limited rehabilitation execution':'Minimal rehabilitation execution';
 const className=!assessed?'unknown':score>=75?'completed':score>=50?'partial':score>=25?'stopped':'missed';
 return{exercise:ex,locomotion:walk,walking:walk,running:run,stretch,score,assessed,label,short:assessed?`${score}% overall execution`:'Overall not scored',className,missing};
}
function rehabAdherenceSummary(i,days=null){
 const planStart=dte(rehabPlanStart(i)),yesterday=new Date(today().getTime()-DAY);
 if(planStart>yesterday)return{score:null,scheduled:0,reported:0,full:0,partial:0,missed:0,label:'No completed rehab days yet',rows:[]};
 const windowStart=days?new Date(today().getTime()-(days-1)*DAY):planStart;
 const start=windowStart>planStart?windowStart:planStart;
 const checks=new Map(sortedChecks(i).map(c=>[c.date,c])),p=injuryPrediction(i),rows=[];
 for(let d=new Date(start);d<=yesterday;d=new Date(d.getTime()+DAY)){
   const date=iso(d),day=rehabCalendarDay(i,p,date,rehabPlanDayIndex(i,date));
   const scheduled=day.type!=='preplan'&&((day.items||[]).length>0||!/^No rehabilitation plan/i.test(day.running||''));
   if(!scheduled)continue;
   const check=checks.get(date),meta=check?rehabExecutionMeta(check):null;
   const assessed=!!meta?.assessed&&Number.isFinite(meta?.score);
   const score=assessed?clamp(Number(meta.score),0,100):0;
   rows.push({date,title:day.title,score,reported:assessed,missing:!assessed});
 }
 const scheduled=rows.length,reported=rows.filter(x=>x.reported).length,full=rows.filter(x=>x.score>=99.5).length,partial=rows.filter(x=>x.reported&&x.score>0&&x.score<99.5).length,missed=scheduled-reported;
 if(!scheduled)return{score:null,scheduled:0,reported:0,full:0,partial:0,missed:0,label:'No completed rehab days yet',rows};
 const score=Math.round(sum(rows.map(x=>x.score))/scheduled);
 return{score,scheduled,reported,full,partial,missed,rows,label:score>=85?'Strong adherence':score>=60?'Mixed adherence':'Low adherence'};
}
function buildRehabCalendar(i,p){
 const planStart=rehabPlanStart(i),calendarBase=dte(planStart)>today()?dte(planStart):today(),start=iso(calendarBase),old=Array.isArray(i.rehabCalendar)?i.rehabCalendar:[],oldMap=new Map(old.map(x=>[x.date,x])),checks=new Map(sortedChecks(i).map(x=>[x.date,x])),days=[];
 for(let offset=0;offset<7;offset++){
  const date=iso(new Date(calendarBase.getTime()+offset*DAY)),fresh=rehabCalendarDay(i,p,date,rehabPlanDayIndex(i,date)),previous=oldMap.get(date),check=checks.get(date),checkInCompleted=!!check;let execution=rehabExecutionMeta(check);if(!check){const pending=offset===0?'Rehab report pending':'Future rehab day';execution={label:offset===0?'Today’s rehabilitation completion has not been reported yet':'Rehabilitation completion will be reported after this day',short:pending,className:'unknown',score:null,assessed:false,exercise:{label:offset===0?'Rehab exercise completion has not been reported yet':'Future rehabilitation exercise day',short:pending,className:'unknown',score:null,assessed:false},locomotion:{label:offset===0?'Walking-target completion has not been reported yet':'Future walking-target day',short:pending,className:'unknown',score:null,assessed:false},walking:{label:offset===0?'Walking-target completion has not been reported yet':'Future walking-target day',short:pending,className:'unknown',score:null,assessed:false},running:{label:offset===0?'Running exposure has not been reported yet':'Future running-exposure day',short:pending,className:'unknown',score:null,assessed:false}};}else if(!check.rehabExerciseStatus&&!check.locomotionStatus&&!check.rehabStatus){execution={label:'The questionnaire was completed, but rehabilitation completion was not answered',short:'Rehab not answered',className:'unknown',score:null,assessed:false,exercise:{label:'Rehab exercise completion was not answered',short:'Exercises not reported',className:'unknown',score:null,assessed:false},locomotion:{label:'Walking-target completion was not answered',short:'Walking not assessed',className:'unknown',score:null,assessed:false},walking:{label:'Walking-target completion was not answered',short:'Walking not assessed',className:'unknown',score:null,assessed:false},running:{label:'Running exposure was not assessed',short:'Running not assessed',className:'unknown',score:null,assessed:false}};}
  const changed=!!previous&&rehabCalendarSignature(previous)!==rehabCalendarSignature(fresh);
  days.push({...fresh,checkInCompleted,execution,executionImpact:check?.hop,executionStrength:check?.bridge,updated:changed});
 }
 i.rehabCalendar=days;i.rehabCalendarGenerated=start;return days;
}
function rehabCalendarHtml(i,p){
 const days=buildRehabCalendar(i,p);
 return `<section class="injuryTopicCard rehabCalendarSection"><div class="injurySectionHead"><div><h4>Next 7 days</h4><p class="muted compact">The questionnaire and rehabilitation execution are tracked separately. A completed check-in does not mean the exercises were completed.</p></div><strong>${fmtDate(days[0].date)}–${fmtDate(days.at(-1).date)}</strong></div><div class="rehabCalendar">${days.map((d,n)=>`<details class="rehabDay ${d.type} rehab-${d.execution.className}"><summary><div class="rehabDate"><b>${esc(d.weekday.slice(0,3))}</b><span>${dte(d.date).getDate()}</span></div><div class="rehabDayTitle"><strong>${esc(d.title)}</strong><small>${esc(d.walkingTarget)}</small><div class="rehabStatusPair">${d.checkInCompleted?`<span class="executionBadge ${d.execution.className}">✓ Check-in · ${Number.isFinite(d.execution.score)?`${d.execution.score}% execution${d.type==='impact'&&d.executionImpact===false?' · impact not tolerated':''}`:'execution unavailable'}</span>`:`<span class="checkinBadge pending">${d.date>iso(today())?'Planned':'Check-in pending'}</span>`}</div></div><div class="rehabDayStatus">${d.updated?'Updated':''}</div></summary><div class="rehabDayBody"><div><b>Prescription</b><ul>${d.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>${d.stretchGoalOffered?`<div class="rehabStretchGoal"><b>Optional progression</b><p>${esc(d.stretchGoal)}</p></div>`:''}<div class="rehabBestOutcome"><b>Today’s objective</b><p>${esc(d.bestOutcome||d.rationale||'')}</p></div><details class="rehabDayDetails"><summary>Why this plan and safety rules</summary><div class="rehabDayWhy"><p>${esc(d.rationale)}</p></div><div class="rehabDayRule"><b>Adjustment rule</b><p>${esc(d.rule)}</p></div><div class="rehabEvidenceMeter ${esc(d.evidence?.className||'low')}"><b>Evidence: ${esc(d.evidence?.level||'Low')}</b><p>${esc(d.evidence?.text||'More check-in evidence is needed.')}</p></div></details>${d.checkInCompleted?`<div class="rehabCompletionClarifier"><b>Recorded result</b><p>${esc(d.execution.label)}${Number.isFinite(d.execution.score)?` · ${d.execution.score}%`:''}</p></div>`:''}${d.updated?'<p class="rehabUpdatedNote">Updated after new check-in evidence.</p>':''}</div></details>`).join('')}</div><p class="muted compact rehabCalendarFoot">Rehabilitation status describes whether the prescribed plan was performed. Check-in status only confirms that the daily questionnaire was submitted. Future days remain pending until their date. Every saved check-in is scored from the activities scheduled for that date. Component details remain inside the expanded day; the collapsed tile shows one concise execution result.</p></section>`;
}

function rehabExerciseImage(name){
 const map={
  'Slow calf raise':'01_slow_calf_raise.png',
  'Foot tripod and toe control':'02_foot_tripod_toe_control.png',
  'Slow controlled strengthening':'03_slow_controlled_strengthening.png',
  'Low-load isometric hold':'04_low_load_isometric_hold.png',
  'Slow resistance exercise':'05_slow_resistance_exercise.png',
  'Tendon isometric hold':'06_tendon_isometric_hold.png',
  'Step-down control':'07_step_down_control.png',
  'Supported sit-to-stand':'08_supported_sit_to_stand.png',
  'Supported calf raise':'09_supported_calf_raise.png',
  'Single-leg balance':'10_single_leg_balance.png',
  'Long-lever bridge hold':'11_long_lever_bridge_hold.png',
  'Supported hip hinge':'12_supported_hip_hinge.png',
  'Double-leg bridge':'13_double_leg_bridge.png'
 };
 return map[name]||null;
}
function rehabExerciseMuscles(name,family='generic'){
 const map={
  'Slow calf raise':['Calves','Achilles'],
  'Supported calf raise':['Calves','Achilles'],
  'Foot tripod and toe control':['Foot intrinsics','Arch control'],
  'Slow controlled strengthening':['Target muscle','Stabilisers'],
  'Low-load isometric hold':['Target muscle','Stabilisers'],
  'Slow resistance exercise':['Target tendon','Target muscle'],
  'Tendon isometric hold':['Target tendon','Target muscle'],
  'Step-down control':['Quadriceps','Glutes','Hip stabilisers'],
  'Supported sit-to-stand':['Quadriceps','Glutes','Core'],
  'Single-leg balance':['Foot/ankle','Glute medius','Core'],
  'Long-lever bridge hold':['Hamstrings','Glutes','Core'],
  'Supported hip hinge':['Hamstrings','Glutes','Back extensors'],
  'Double-leg bridge':['Hamstrings','Glutes','Core']
 };
 if(map[name])return map[name];
 if(family==='hamstring')return['Hamstrings','Glutes','Core'];
 if(family==='knee')return['Quadriceps','Glutes','Hip stabilisers'];
 if(family==='tendon')return['Target tendon','Target muscle'];
 if(family==='foot'||family==='ankle')return['Foot/ankle','Calves','Stabilisers'];
 return['Target tissue','Supporting muscles'];
}
function exerciseImageMarkup(x,family){
 const img=rehabExerciseImage(x.name),muscles=rehabExerciseMuscles(x.name,family);
 const muscleChips=`<span class="exerciseMuscles">${muscles.map(m=>`<i>${esc(m)}</i>`).join('')}</span>`;
 const visual=img?`<button type="button" class="exerciseImageButton" data-exercise-image="${img}" data-exercise-name="${esc(x.name)}" aria-label="View ${esc(x.name)} image"><img src="${img}" alt="${esc(x.name)} exercise illustration" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="exerciseFallback" style="display:none">${uiIcon('rehab')}</span><em>View image</em></button>`:`<span class="exerciseImageButton noImage"><span class="exerciseFallback">${uiIcon('rehab')}</span></span>`;
 return{visual,muscleChips,img,muscles};
}
function openExerciseImage(name,img,muscles=[]){
 if(!img)return;
 $('modalContent').innerHTML=`<div class="exerciseImageViewer"><div class="exerciseViewerHeading"><small>EXERCISE TECHNIQUE</small><h3>${esc(name)}</h3>${muscles.length?`<div class="exerciseMuscles viewer">${muscles.map(m=>`<i>${esc(m)}</i>`).join('')}</div>`:''}</div><img src="${img}" alt="${esc(name)} exercise technique image"><p>Use the image together with the written cues in the exercise card. The written pain and progression rules remain authoritative for the rehabilitation plan.</p></div>`;
 $('modal').className='modal exerciseViewerModal';
}
function rehabTodayFocusHtml(i,p){
 const todayPlan=buildRehabCalendar(i,p)[0],prescription=todayPlan.items.map(x=>`<li>${esc(x)}</li>`).join(''),family=p.diag.family||'generic';
 const guides=(todayPlan.guideExercises||[]).map(x=>{const media=exerciseImageMarkup(x,family);return`<details class="exerciseDetail visualExercise uiLevel2"><summary>${media.visual}<span class="exerciseSummaryCopy"><b>${esc(x.name)}</b><small>${esc(x.dose)}</small>${media.muscleChips}</span><em class="exerciseChevron">Details</em></summary><div class="exerciseGuide"><p class="exercisePurpose">${esc(x.purpose)}</p><div class="exerciseInstructionBlock"><b>How to do it</b><ol>${x.steps.map(y=>`<li>${esc(y)}</li>`).join('')}</ol></div><div class="exerciseRules"><div><b>Pain rule</b><p>${p.safetyHold?'Do not test impact or progress loading until assessed.':'Keep pain at 0–2/10. Stop for sharp pain, altered movement, or symptoms that worsen later or next morning.'}</p></div><div><b>Progress when</b><p>${esc(x.progress)}</p></div></div></div></details>`}).join('');
 return`<section class="injuryTopicCard rehabTodayFocus uiLevel1"><div class="injurySectionHead"><div><small class="eyebrow">TODAY’S FOCUS</small><h4>${esc(todayPlan.title)}</h4><p class="muted compact">${todayPlan.weekday||dte(todayPlan.date).toLocaleDateString(undefined,{weekday:'long'})} · ${fmtDate(todayPlan.date)}</p></div><span class="status today">Stage ${p.stage+1}</span></div><div class="todayFocus"><strong>${esc(todayPlan.rationale)}</strong></div><div class="todayPlanGrid"><div><b>Today’s dose</b><ul>${prescription}</ul></div>${todayPlan.stretchGoalOffered?`<div class="rehabStretchGoal"><b>Optional progression</b><p>${esc(todayPlan.stretchGoal)}</p></div>`:''}<details class="rehabDayDetails uiLevel3"><summary>Safety & progression</summary><div class="rehabDayRule"><b>Adjustment rule</b><p>${esc(todayPlan.rule)}</p></div><div class="rehabEvidenceMeter ${esc(todayPlan.evidence?.className||'low')}"><b>Evidence: ${esc(todayPlan.evidence?.level||'Low')}</b><p>${esc(todayPlan.evidence?.text||'More check-in evidence is needed.')}</p></div></details></div><div class="rehabStatusPair">${todayPlan.checkInCompleted?`<span class="executionBadge ${todayPlan.execution.className}">✓ ${Number.isFinite(todayPlan.execution.score)?`${todayPlan.execution.score}% execution`:'Check-in complete'}</span>`:'<span class="checkinBadge pending">Check-in pending</span>'}</div>${guides?`<div class="todayExerciseGuides"><h5>${uiIcon('rehab')} Exercise cards</h5>${guides}</div>`:''}</section>`;
}

function injuryTrajectorySvg(i,p){
 const W=720,H=285,left=48,right=18,top=30,bottom=58,cw=W-left-right,ch=H-top-bottom,horizon=Math.max(7,p.nominalTotal,p.elapsed+p.remaining),x=d=>left+clamp(d/horizon,0,1)*cw,y=v=>top+(100-clamp(v,0,100))/100*ch,nominalPath=`M ${x(0)} ${y(0)} L ${x(p.nominalTotal)} ${y(100)}`;
 const phaseFractions=[0,.12,.28,.46,.64,.82,1],phaseRects=INJURY_STAGES.map((st,n)=>{const start=phaseFractions[n]*p.nominalTotal,end=phaseFractions[n+1]*p.nominalTotal,w=Math.max(0,x(end)-x(start));return`<rect class="phaseBand phase${n}" x="${x(start)}" y="${top}" width="${w}" height="${ch}"/><text class="phaseLabel" x="${x(start)+w/2}" y="${top+14}" text-anchor="middle">${esc(st.name)}</text>`;}).join(''),phaseLines=phaseFractions.slice(1,-1).map(f=>`<line class="phaseBoundary" x1="${x(f*p.nominalTotal)}" y1="${top}" x2="${x(f*p.nominalTotal)}" y2="${top+ch}"/>`).join('');
 const pts=(p.checks||[]).map((c,idx)=>{const score=injuryCompletionForChecks(i,p.checks.slice(0,idx+1),p.diag,nullableNumber(i.initialPain),nullableNumber(i.initialWalkPain));return{day:Math.max(0,Math.round((dte(c.date)-dte(i.date))/DAY)),score,date:c.date};}).filter(q=>Number.isFinite(q.score));if(!pts.length&&Number.isFinite(p.completion))pts.push({day:p.elapsed,score:p.completion,date:iso(today())});const observed=pts.map((q,n)=>`${n?'L':'M'} ${x(q.day)} ${y(q.score)}`).join(' '),currentMarker=`<line class="currentDateLine" x1="${x(p.elapsed)}" y1="${top}" x2="${x(p.elapsed)}" y2="${top+ch}"/><text class="currentDateLabel" x="${x(p.elapsed)}" y="${H-36}" text-anchor="middle">Today</text>`;
 return `<div class="injuryTrajectoryWrap"><svg class="injuryTrajectory" viewBox="0 0 ${W} ${H}" role="img" aria-label="Observed rehabilitation completion, nominal recovery and rehabilitation phases">${phaseRects}${phaseLines}<line x1="${left}" y1="${y(25)}" x2="${W-right}" y2="${y(25)}"/><line x1="${left}" y1="${y(50)}" x2="${W-right}" y2="${y(50)}"/><line x1="${left}" y1="${y(75)}" x2="${W-right}" y2="${y(75)}"/>${currentMarker}<path class="nominalLine" d="${nominalPath}"/><path class="actualLine" d="${observed}"/>${pts.map(q=>`<circle cx="${x(q.day)}" cy="${y(q.score)}" r="5"><title>${fmtDate(q.date)} · ${q.score}%</title></circle>`).join('')}<text x="${left}" y="${H-12}">Injury</text><text x="${W-right}" y="${H-12}" text-anchor="end">Full unrestricted training</text><text x="${left+4}" y="${top+28}">Completion %</text></svg><div class="injuryTrajectoryLegend"><span class="actual">Observed completion</span><span class="nominal">Nominal recovery</span><span class="phase">Recovery phases</span></div></div>`;
}

function clinicianAgreementBanner(diag){
 if(!diag?.verification)return'';
 const v=diag.verification,status=v.agrees?'Confirms clinician assessment':v.inDifferential?'Partly agrees with clinician assessment':'Contradicts clinician assessment',cls=v.agrees?'confirmed':v.inDifferential?'partial':'contradicted';
 return `<section class="injuryTopicCard clinicianAgreementCard ${cls}"><div><small>Clinician cross-check</small><strong>${esc(status)}</strong><p><b>Clinician entered:</b> ${esc(v.entered)}<br><b>Independent app conclusion:</b> ${esc(diag.name)}</p><span>${esc(v.reasons.join(' · '))}</span></div></section>`;
}

function renderInjury(){
 const box=$('injuryList');if(!box)return;
 const injuries=state.injuries||[],add=$('addInjuryBtn');$('injuryIntro').innerHTML='';
 if(add){add.classList.remove('hidden');add.textContent=injuries.length?'+ Assess another injury':'+ Add injury';}
 if(!injuries.length){state.activeInjuryPlanId=null;box.innerHTML='<article class="panel injuryEmpty"><h3>No injury assessments</h3><p class="muted">Assess an injury to receive a working diagnosis and prognosis. You can later choose whether to follow its recovery plan.</p></article>';return;}
 if(state.activeInjuryPlanId&&!injuries.some(x=>x.id===state.activeInjuryPlanId))state.activeInjuryPlanId=null;
 if(!state.activeInjuryPlanId)$('injuryIntro').innerHTML='<div class="note warn"><b>No active recovery plan</b><p>Review the diagnosis and prognosis for each assessed injury, then choose one recovery plan to follow.</p></div>';
 const ordered=injuries.slice().sort((a,b)=>(a.id===state.activeInjuryPlanId?-1:b.id===state.activeInjuryPlanId?1:b.date.localeCompare(a.date)));
 box.innerHTML=ordered.map(i=>{
  const isActive=i.id===state.activeInjuryPlanId,p=injuryPrediction(i),st=INJURY_STAGES[p.stage],diag=p.diag,next=Math.min(5,p.stage+1),criteria=criterionState(i,p,next),met=criteria.filter(x=>x.status==='met').length,unknown=criteria.filter(x=>x.status==='unknown').length,factors=comparisonFactors(i,p),scoreInfo=recoveryScoreExplanation(i,p,factors),adherence7=rehabAdherenceSummary(i,7),adherence14=rehabAdherenceSummary(i,14),adherenceOverall=rehabAdherenceSummary(i,null),exercises=exerciseList(i,p),milestones=milestoneStatus(p),clinicalPlan=injuryCausePrevention(i,diag),timelineText=p.safetyHold?'Progression paused pending assessment':`${fmtDate(p.windowStart)}–${fmtDate(p.windowEnd)}`;
  const clinician=diag.verification;
  const clinicianCard='';const clinicianFoldout=clinician?`<details class="diagnosisAgreementInline ${clinician.verdict}"><summary><b>${clinician.verdict==='confirms'?'App confirms clinician assessment':clinician.verdict==='partly_agrees'?'App partly agrees with clinician assessment':'App contradicts clinician assessment'}</b><span>${esc(clinician.status)}</span></summary><div class="clinicianCompareGrid"><div><small>Clinician entered</small><b>${esc(clinician.entered)}</b></div><div><small>Independent app assessment</small><b>${esc(diag.name)}</b></div></div><p>The app independently checks the entered clinical assessment against the recorded location, mechanism, symptoms, aggravating factors and contradictory findings.</p><small>${clinician.reasons.map(esc).join(' · ')}</small></details>`:'';
  const header=`<article class="panel injuryCard ${isActive?'activeRecoveryPlan':'assessmentOnly'}"><div class="panelHead injuryCardHeader"><div><div class="injuryPlanLabel ${isActive?'active':'inactive'}">${isActive?'ACTIVE RECOVERY PLAN':'PARALLEL ASSESSMENT'}</div><h3>${esc(i.location||'Injury')} · ${fmtDate(i.date)}</h3><p class="muted compact">Injury date: ${fmtDate(i.date)} · Rehab plan starts: ${fmtDate(rehabPlanStart(i))}<br>${esc(i.mechanism||'Mechanism not entered')}</p></div><span class="status today">Stage ${p.stage+1}</span></div>`;
  const diagnosis=`<section class="injuryTopicCard diagnosisOverview"><div class="injuryPatternSummary injuryPatternTop"><div><span>Most likely working symptom pattern</span><strong>${esc(diag.name)}</strong><small>${esc(diag.strength)} match · ${esc(i.bodyRegion||'recorded region')}</small></div><span class="injuryFamilyPill">${esc((diag.family||'generic').replace('_',' '))}</span></div><div class="recoveryTimelineVisual"><div class="timelineRail"><i style="width:${clamp((p.stage+1)/INJURY_STAGES.length*100,8,100)}%"></i>${INJURY_STAGES.map((x,n)=>`<span class="${n<p.stage?'done':n===p.stage?'active':''}" style="left:${INJURY_STAGES.length===1?0:n/(INJURY_STAGES.length-1)*100}%"><b>${n+1}</b><small>${esc(x.name)}</small></span>`).join('')}</div><div class="timelineDates"><span>${fmtDate(i.date)}<small>Injury</small></span><span>${p.safetyHold?'On hold':fmtDate(p.fullDate)}<small>Central estimate</small></span></div></div><div class="prognosisStrip"><div><small>Unrestricted-running window</small><b>${timelineText}</b></div><div><small>Central estimate</small><b>${p.safetyHold?'On hold':fmtDate(p.fullDate)}</b></div><div><small>Confidence</small><b>${esc(p.confidence)}</b><div class="confidenceDots"><i></i><i class="${['Moderate','High'].includes(p.confidence)?'on':''}"></i><i class="${p.confidence==='High'?'on':''}"></i></div></div></div>${clinicianFoldout}</section>`;
  const planChoice=`<section class="injuryTopicCard planChoiceCard"><div><h4>${isActive?'Recovery plan being followed':'Recovery plan available'}</h4><p>${isActive?'This injury currently controls the daily rehabilitation plan, calendar, adherence and check-ins.':'This injury is assessed in parallel. Its diagnosis and prognosis are available, but its rehabilitation plan is not currently active.'}</p></div>${isActive?'<span class="activePlanBadge">Active</span>':`<button class="primary" data-activate-injury-plan="${i.id}">Follow this recovery plan</button>`}</section>`;
  if(!isActive){return `${header}${diagnosis}<details class="injuryDisclosure clinicalReasoningSummary"><summary>Clinical reasoning, likely causes and prevention</summary><div class="clinicalReasoningBody"><div class="clinicalReasoningGrid"><div><b>Why this pattern?</b><p>${diag.evidence.slice(0,5).map(esc).join(' · ')||'More detail is needed.'}</p></div><div><b>Likely contributors</b><ul>${clinicalPlan.causes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><b>Prevention</b><ul>${clinicalPlan.prevention.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><b>Plan decision</b><p>${clinicalPlan.needsRehab?'A staged rehabilitation plan is available if you choose to switch to it.':'Self-management and prevention may be sufficient if symptoms resolve and no warning features emerge.'}</p></div></div></div></details>${planChoice}<div class="buttonRow"><button data-injury-edit="${i.id}">Edit assessment</button><button data-injury-delete="${i.id}" class="danger">Delete</button></div></article>`;}
  return `${header}${diagnosis}<details class="injuryDisclosure clinicalReasoningSummary"><summary>Clinical reasoning, likely causes and prevention</summary><div class="clinicalReasoningBody"><div class="clinicalReasoningGrid"><div><b>Why this pattern?</b><p>${diag.evidence.slice(0,5).map(esc).join(' · ')||'More detail is needed.'}</p></div><div><b>Likely contributors</b><ul>${clinicalPlan.causes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><b>Prevention</b><ul>${clinicalPlan.prevention.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><b>Plan decision</b><p>${clinicalPlan.needsRehab?'A staged rehabilitation plan is appropriate because current function requires monitored progression.':'A formal pathway may not be necessary if symptoms settle fully and no warning features remain.'}</p></div></div></div></details>${p.safetyHold?`<div class="note bad injurySafetyHold"><b>Rehabilitation progression paused</b><p>${diag.safetyReasons.map(esc).join(' · ')}. Seek appropriate clinical assessment before progressing.</p></div>`:''}${planChoice}${rehabTodayFocusHtml(i,p)}<button data-injury-check="${i.id}" class="primary full injuryPrimaryAction">Complete today’s check-in</button><section class="injuryTopicCard recoveryOverview"><h4>Recovery overview</h4><div class="injuryKpiGrid"><div class="metric-card recoveryScoreCard ${scoreInfo.status}"><span>Recovery score</span><strong class="viz-stat-value">${p.completion===null?'—':p.completion+'%'}</strong><div class="metricRail"><i style="width:${clamp(Number(p.completion)||0,0,100)}%"></i></div><small>${esc(scoreInfo.label)}</small></div><div class="metric-card"><span>Current stage</span><strong class="viz-stat-value injuryStageValue">${esc(st.name)}</strong><small>${esc(st.goal)}</small></div><div class="metric-card"><span>Current pain</span><strong class="viz-stat-value">${valueText(p.currentPain)}</strong><div class="metricRail inverse"><i style="width:${clamp((Number(p.currentPain)||0)*10,0,100)}%"></i></div><small>Walking ${valueText(p.walkPain)}</small></div><div class="metric-card"><span>Evidence</span><strong class="viz-stat-value">${p.checks.length}</strong><small>daily check-ins</small></div></div><div class="recoveryScoreWhy ${scoreInfo.status}"><b>${esc(scoreInfo.label)}</b><p>${esc(scoreInfo.text)}</p></div></section><section class="injuryTopicCard adherenceSummary"><div class="injurySectionHead"><div><h4>Rehabilitation adherence</h4><p class="muted compact">Past scheduled rehab days without a completed execution report count as missed. Today remains pending and future days are excluded.</p></div></div><div class="adherencePeriods threeTiles"><div class="adherenceTile"><small>7 DAYS</small><strong>${adherence7.score===null?'—':adherence7.score+'%'}</strong><span>${adherence7.reported}/${adherence7.scheduled} days reported${adherence7.missed?` · ${adherence7.missed} missed`:''}</span></div><div class="adherenceTile"><small>14 DAYS</small><strong>${adherence14.score===null?'—':adherence14.score+'%'}</strong><span>${adherence14.reported}/${adherence14.scheduled} days reported${adherence14.missed?` · ${adherence14.missed} missed`:''}</span></div><div class="adherenceTile"><small>OVERALL</small><strong>${adherenceOverall.score===null?'—':adherenceOverall.score+'%'}</strong><span>${adherenceOverall.reported}/${adherenceOverall.scheduled} days reported${adherenceOverall.missed?` · ${adherenceOverall.missed} missed`:''}</span></div></div><details class="adherenceBreakdown"><summary>How adherence is calculated</summary><p>Each past scheduled rehabilitation day contributes its actual execution score. A scheduled day with no completed execution report contributes 0%. Partial execution contributes its recorded percentage. Today is pending until the day has passed.</p><div class="adherenceLegend"><span><i class="done"></i>Fully completed</span><span><i class="partial"></i>Partial</span><span><i class="missed"></i>Missed / unreported</span></div>${adherenceOverall.rows.length?`<div class="adherenceHistory">${adherenceOverall.rows.slice().reverse().map(r=>`<div class="${r.missing?'missed':r.score>=99.5?'done':'partial'}"><span>${fmtDate(r.date)} · ${esc(r.title)}</span><b>${r.missing?'Missed / unreported':r.score+'%'}</b></div>`).join('')}</div>`:'<p class="muted">No past scheduled rehabilitation days yet.</p>'}</details></section><section class="injuryTopicCard calendarCard">${rehabCalendarHtml(i,p)}</section><section class="injuryTopicCard"><h4>Recovery milestones</h4><div class="injuryMilestones">${milestones.map(m=>`<div class="milestone ${m.status}"><i>${m.status==='met'?'✓':m.status==='notMet'?'○':'?'}</i><span class="criterionCopy"><span class="criterionLabel">${esc(m.name)}</span>${m.detail?`<small class="criterionProgress">${esc(m.detail)}</small>`:''}</span><b>${m.status==='met'?'Met':m.status==='notMet'?(m.detail&&m.detail.startsWith('1 of')?'In progress':'Not met'):'Not assessed'}</b></div>`).join('')}</div></section><section class="injuryTopicCard"><div class="injurySectionHead"><div><h4>Next-stage requirements</h4><p class="muted compact">Stage ${next+1}: ${esc(INJURY_STAGES[next].name)} · repeated evidence required</p></div><strong>${met}/${criteria.length} met${unknown?` · ${unknown} unknown`:''}</strong></div><div class="criteriaList">${criteria.map(c=>`<div class="criterion ${c.status}"><i>${c.status==='met'?'✓':c.status==='notMet'?'○':'?'}</i><span class="criterionCopy"><span class="criterionLabel">${esc(c.label)}</span>${c.progress?`<small class="criterionProgress">${esc(c.progress.text)}</small>`:''}</span><b>${c.status==='met'?'Met':c.status==='notMet'?(c.progress&&c.progress.count>0?'In progress':'Not met'):'Not assessed'}</b></div>`).join('')}</div></section><section class="injuryTopicCard"><div class="injurySectionHead"><div><h4>Daily check-ins</h4><p class="muted compact">Review or correct any current or previous entry.</p></div><strong>${p.checks.length}</strong></div><div class="checkInHistory">${p.checks.length?p.checks.slice().reverse().map(c=>`<button type="button" class="checkInHistoryRow" data-injury-check-edit="${i.id}" data-check-date="${c.date}"><span><b>${fmtDate(c.date)}</b><small>${Number.isFinite(c.pain)?`Pain ${c.pain}/10`:''}${Number.isFinite(c.walkPain)?` · walking ${c.walkPain}/10`:''}${Number.isFinite(c.runMinutes)?` · run ${c.runMinutes} min`:c.runStatus==='not_planned'?' · rest/no run planned':c.runStatus==='not_assessed'?' · running not assessed':''}<br>Check-in completed · Rehab: ${esc(rehabExecutionMeta(c).short)}</small></span><em>Edit</em></button>`).join(''):'<p class="muted">No check-ins yet.</p>'}</div></section><details class="injuryDisclosure"><summary>Recovery rationale and comparison</summary><div class="timelineReason"><p>The ${esc(diag.name.toLowerCase())} pathway uses a baseline window of ${p.baselineMin}–${p.baselineMax} days, with ${p.nominalTotal} days as the central comparison point.</p><p>You are ${p.elapsed} days after injury and currently in Stage ${p.stage+1}: ${esc(st.name)}.</p><p><b>${esc(scoreInfo.label)}:</b> ${esc(scoreInfo.text)}</p></div><div class="comparisonList">${factors.map(f=>`<div class="comparisonRow ${f.status}"><div><b>${esc(f.name)}</b><small>${esc(f.reason)}</small></div><span>${esc(f.actual)}</span><em>Nominal: ${esc(f.nominal)}</em></div>`).join('')}</div></details><details class="injuryDisclosure"><summary>Detailed recovery progress</summary>${p.completion===null?'<p class="muted">Add daily check-ins to build an observed trajectory.</p>':injuryTrajectorySvg(i,p)}</details><details class="injuryTimelineDetails"><summary>View all rehabilitation stages</summary><div class="injuryTimeline">${INJURY_STAGES.map((x,n)=>`<div class="injuryStage ${n<p.stage?'done':n===p.stage?'active':''}"><i>${n+1}</i><div><b>${esc(x.name)}</b><small>${esc(x.goal)}</small></div></div>`).join('')}</div></details><details class="injuryDisclosure"><summary>Initial and current symptoms</summary><div class="guideGrid"><div><b>At injury</b><p>Pain ${valueText(nullableNumber(i.initialPain))} · walking pain ${valueText(nullableNumber(i.initialWalkPain))}<br>${esc(i.initialSymptoms||'No symptom description')}</p></div><div><b>Latest</b><p>Pain ${valueText(p.currentPain)} · walking pain ${valueText(p.walkPain)}<br>${esc(p.latest.symptoms||i.currentSymptoms||'No current symptom description')}</p></div></div></details><div class="buttonRow"><button data-injury-edit="${i.id}">Edit injury</button><button data-injury-delete="${i.id}" class="danger">Delete</button></div></article>`;
 }).join('');
}
function injuryForm(i={}){const regions=['','Hip / pelvis','Groin / inner thigh','Front thigh','Back of thigh / hamstring','Knee','Shin / lower leg','Calf','Achilles / back of ankle','Ankle','Heel / arch','Forefoot / toes'];return`<div class="injuryFormHeader"><h3>${i.id?'Edit':'Record'} injury</h3><p>Start with where the pain is. The app only compares patterns compatible with the selected body region.</p></div>
<div class="injuryFormSteps">
<section class="injuryFormStep"><header><i>1</i><div><b>Where and when?</b><small>This prevents unrelated body regions from being ranked.</small></div></header><div class="formGrid"><div class="field"><label>Injury date</label><input id="injDate" type="date" value="${i.date||iso(today())}"></div><div class="field"><label>Rehabilitation-plan start date</label><input id="injRehabStart" type="date" value="${i.rehabStartDate||i.date||iso(today())}"><small class="muted">This controls the daily calendar and adherence period; it may be later than the injury date.</small></div><div class="field"><label>Body region</label><select id="injRegion">${regions.map(x=>`<option value="${esc(x)}" ${i.bodyRegion===x?'selected':''}>${esc(x||'Select region')}</option>`).join('')}</select></div><div class="field fieldWide"><label>Exact pain location</label><input id="injLocation" value="${esc(i.location||'')}" placeholder="e.g. front of right knee, below kneecap"></div><div class="field"><label>Onset</label><select id="injOnset"><option value="">Select onset</option><option value="Sudden" ${i.onset==='Sudden'?'selected':''}>Sudden</option><option value="Gradual" ${i.onset==='Gradual'?'selected':''}>Gradual</option><option value="Unclear" ${i.onset==='Unclear'?'selected':''}>Unclear</option></select></div><div class="field"><label>How did it start?</label><input id="injMechanism" value="${esc(i.mechanism||'')}" placeholder="e.g. sprint, downhill run, mileage increase"></div></div></section>
<section class="injuryFormStep"><header><i>2</i><div><b>What does it feel like?</b><small>Describe triggers and distinguishing symptoms.</small></div></header><div class="formGrid"><div class="field fieldWide"><label>What reproduces the pain?</label><textarea id="injTriggers" placeholder="e.g. stairs, squatting, downhill running, sitting, hopping">${esc(i.painTriggers||'')}</textarea></div><div class="field"><label>Pain at onset 0–10</label><input id="injInitialPain" type="number" min="0" max="10" value="${i.initialPain??''}"></div><div class="field"><label>Walking pain at onset 0–10</label><input id="injInitialWalk" type="number" min="0" max="10" value="${i.initialWalkPain??''}"></div><div class="field injurySigns"><label>Signs at onset</label><label><input id="injPop" type="checkbox" ${i.pop?'checked':''}> Pop / snap</label><label><input id="injBruise" type="checkbox" ${i.bruising?'checked':''}> Bruising or swelling</label></div><div class="field fieldWide"><label>Symptoms at onset</label><textarea id="injInitialSymptoms" placeholder="e.g. sharp pain, swelling, locking, tingling, focal tenderness">${esc(i.initialSymptoms||'')}</textarea></div></div></section>
<section class="injuryFormStep"><header><i>3</i><div><b>How is it now?</b><small>This establishes the current rehabilitation baseline.</small></div></header><div class="formGrid"><div class="field"><label>Pain now 0–10</label><input id="injCurrentPain" type="number" min="0" max="10" value="${i.currentPain??''}"></div><div class="field"><label>Walking pain now 0–10</label><input id="injCurrentWalk" type="number" min="0" max="10" value="${i.currentWalkPain??''}"></div><div class="field fieldWide"><label>Current symptoms</label><textarea id="injCurrentSymptoms" placeholder="What has improved, remained, or worsened?">${esc(i.currentSymptoms||'')}</textarea></div></div></section>
<section class="injuryFormStep clinicalReasoningStep"><header><i>4</i><div><b>Clinical reasoning questions</b><small>These answers help separate similar injuries and identify when self-management may be enough.</small></div></header><div class="formGrid">${selectField('injQuality','Symptom quality',i.symptomQuality,[['','Select'],['aching','Aching'],['sharp','Sharp'],['burning','Burning'],['cramp_like','Cramp-like / tight'],['pressure','Pressure / fullness'],['stiff','Stiffness'],['unstable','Instability']])}${selectField('injTiming','When is it worst?',i.timingPattern,[['','Select'],['during_early','Early during running'],['during_late','Later as fatigue builds'],['immediately_after','Immediately after running'],['after_shoes_off','After taking shoes off'],['next_morning','The next morning'],['constant','Also present at rest']])}<div class="field fieldWide"><label>Path or distribution of symptoms</label><input id="injDistribution" value="${esc(i.painDistribution||'')}" placeholder="e.g. bottom outer foot, little-toe side, front to back"></div>${triSelect('injMorning','Pain on the first steps in the morning?',i.morningFirstStep)}${triSelect('injFocal','One precise point is markedly tender?',i.focalTenderness)}${triSelect('injHopPain','Single-leg hopping reproduces it?',i.hopPain)}${triSelect('injNumb','Burning, numbness or tingling?',i.numbTingle)}${triSelect('injShoes','Tighter shoes or lacing make it worse?',i.shoeRelated)}${triSelect('injBarefoot','Removing shoes or walking barefoot improves it?',i.barefootBetter)}${triSelect('inj48h','Usually settles within 24–48 hours?',i.resolves48h)}${triSelect('injNight','Pain at night or while resting?',i.nightPain)}${triSelect('injLock','Locking, catching or joint swelling?',i.lockingCatching)}${triSelect('injInstability','Giving way or instability?',i.instability)}${triSelect('injSitting','Prolonged sitting reproduces it?',i.sittingPain)}${triSelect('injResisted','Resisted muscle contraction reproduces it?',i.resistedPain)}${triSelect('injExertional','Does it reliably settle within minutes after stopping the run?',i.exertionalResolution)}${triSelect('injLoadIncrease','Recent increase in distance, speed, hills or frequency?',i.recentLoadIncrease)}${triSelect('injNewShoes','Recent change in shoes, insoles or lacing?',i.newShoes)}${triSelect('injCamber','Often runs on cambered or uneven surfaces?',i.camberedSurface)}<div class="field fieldWide"><label>Other clinically relevant detail</label><textarea id="injClinicalFree" placeholder="Recurrence, exact duration, what relieves it, or anything that does not fit above">${esc(i.freeTextClinical||'')}</textarea></div></div></section>
<details class="injuryClinicianStep"><summary>Clinician information (optional — independently cross-checked)</summary><div class="formGrid"><div class="field"><label>Clinician diagnosis</label><input id="injDiagnosis" value="${esc(i.clinicalDiagnosis||'')}" placeholder="The app will independently compare this with your symptoms"></div><div class="field"><label>Expected recovery days</label><input id="injClinicianDays" type="number" min="1" value="${i.clinicianExpectedDays??''}" placeholder="Use clinician estimate when supplied"></div></div></details>
</div><div class="note bad"><b>Stop and seek assessment</b> for major trauma, inability to bear weight, marked weakness or deformity, rapidly increasing swelling, numbness, fever, severe night pain, focal bone pain, or calf swelling/breathlessness.</div><button id="saveInjury" class="primary full">Save injury assessment</button>`}
function openInjuryForm(i){$('modalContent').innerHTML=injuryForm(i);$('modal').className='modal';$('saveInjury').onclick=()=>{let obj={...(i||{}),id:i?.id||'inj-'+Date.now(),date:$('injDate').value,rehabStartDate:$('injRehabStart').value,bodyRegion:$('injRegion').value,location:$('injLocation').value.trim(),onset:$('injOnset').value,mechanism:$('injMechanism').value.trim(),painTriggers:$('injTriggers').value.trim(),clinicalDiagnosis:$('injDiagnosis').value.trim(),clinicianExpectedDays:nullableNumber($('injClinicianDays').value),initialPain:nullableNumber($('injInitialPain').value),initialWalkPain:nullableNumber($('injInitialWalk').value),pop:$('injPop').checked,bruising:$('injBruise').checked,initialSymptoms:$('injInitialSymptoms').value.trim(),currentSymptoms:$('injCurrentSymptoms').value.trim(),currentPain:nullableNumber($('injCurrentPain').value),currentWalkPain:nullableNumber($('injCurrentWalk').value),symptomQuality:$('injQuality').value||null,timingPattern:$('injTiming').value||null,painDistribution:$('injDistribution').value.trim(),morningFirstStep:readTri('injMorning'),focalTenderness:readTri('injFocal'),hopPain:readTri('injHopPain'),numbTingle:readTri('injNumb'),shoeRelated:readTri('injShoes'),barefootBetter:readTri('injBarefoot'),resolves48h:readTri('inj48h'),nightPain:readTri('injNight'),lockingCatching:readTri('injLock'),instability:readTri('injInstability'),sittingPain:readTri('injSitting'),resistedPain:readTri('injResisted'),exertionalResolution:readTri('injExertional'),recentLoadIncrease:readTri('injLoadIncrease'),newShoes:readTri('injNewShoes'),camberedSurface:readTri('injCamber'),freeTextClinical:$('injClinicalFree').value.trim(),checkIns:i?.checkIns||[]};if(!obj.date||!obj.rehabStartDate||!obj.bodyRegion||!obj.location)return toast('Enter the injury date, rehabilitation-plan start date, body region and exact location.',true);if(dte(obj.rehabStartDate)<dte(obj.date))return toast('The rehabilitation-plan start date cannot be before the injury date.',true);state.injuries=state.injuries||[];let n=state.injuries.findIndex(x=>x.id===obj.id);n>=0?state.injuries[n]=obj:state.injuries.push(obj);save();$('modal').className='modal hidden';renderInjury();toast(n>=0?'Injury assessment updated.':'Injury assessed. Choose whether to follow its recovery plan.')}}
const openInjuryFormUnvalidated=openInjuryForm;
openInjuryForm=function(i){
 openInjuryFormUnvalidated(i);ensureAccessibleForms($('modalContent'));
 $('injDate').max=iso(today());const unsafeSave=$('saveInjury').onclick;
 $('saveInjury').onclick=()=>{const candidate={date:$('injDate').value,rehabStartDate:$('injRehabStart').value,bodyRegion:$('injRegion').value,location:$('injLocation').value,initialPain:nullableNumber($('injInitialPain').value),initialWalkPain:nullableNumber($('injInitialWalk').value),currentPain:nullableNumber($('injCurrentPain').value),currentWalkPain:nullableNumber($('injCurrentWalk').value),clinicianExpectedDays:nullableNumber($('injClinicianDays').value),checkIns:i?.checkIns||[]};const errors=CORE.validateInjury(candidate,{today:iso(today())});if(errors.length){showFieldErrors(errors,{date:'#injDate',rehabStartDate:'#injRehabStart',bodyRegion:'#injRegion',location:'#injLocation',initialPain:'#injInitialPain',initialWalkPain:'#injInitialWalk',currentPain:'#injCurrentPain',currentWalkPain:'#injCurrentWalk',clinicianExpectedDays:'#injClinicianDays'},$('modalContent'));return toast(CORE.firstErrorMessage(errors),true)}unsafeSave()};
};
function triSelect(id,label,value,yes='Yes',no='No'){return`<div class="field"><label>${label}</label><select id="${id}"><option value="" ${!known(value)?'selected':''}>Not assessed</option><option value="true" ${value===true?'selected':''}>${yes}</option><option value="false" ${value===false?'selected':''}>${no}</option></select></div>`}
function readTri(id){let v=$(id).value;return v===''?null:v==='true'}
function selectField(id,label,value,options){return`<div class="field"><label>${label}</label><select id="${id}">${options.map(([v,t])=>`<option value="${v}" ${String(value??'')===String(v)?'selected':''}>${t}</option>`).join('')}</select></div>`}
function openInjuryCheck(i,existing=null){
 const checks=sortedChecks(i),latest=checks.at(-1)||{},editing=!!existing,originalDate=existing?.date||null;
 // New daily entries start blank for observations that were not actually assessed; stable history is preserved by the longitudinal model.
 const prev=existing||{};
 const progress=injuryPrediction(i);
 const planForDate=date=>{
  // The current and future plan shown in the app is authoritative. Historical dates keep
  // their saved prescription snapshot so earlier check-ins remain auditable.
  const todayIso=iso(today());
  const displayed=(Array.isArray(i.rehabCalendar)?i.rehabCalendar:[]).find(day=>day.date===date);
  if(date>=todayIso){
   if(displayed)return displayed;
   return rehabCalendarDay(i,progress,date,rehabPlanDayIndex(i,date));
  }
  if(existing?.planSnapshot&&existing.date===date)return existing.planSnapshot;
  if(displayed)return displayed;
  return rehabCalendarDay(i,progress,date,rehabPlanDayIndex(i,date));
 };
 const scheduledMeta=plan=>{const walkingItem=(plan.items||[]).find(x=>/^Walk \d+ minutes/i.test(x))||plan.walkingTarget||'';const walkingMatch=String(walkingItem).match(/Walk (\d+) minutes/i);const walkingTargetMinutes=walkingMatch?Number(walkingMatch[1]):null;const exerciseItems=(plan.items||[]).filter(x=>x!==walkingItem&&!/^Walk \d+ minutes/i.test(x));const runningPlanned=['assessment','run'].includes(plan.type);const strengthPlanned=exerciseItems.some(x=>/bridge|strength|hinge|raise|curl|squat|isometric|loading/i.test(x));const impactPlanned=plan.type==='impact'||exerciseItems.some(x=>/hop|jog|impact/i.test(x));const stretchPlanned=plan.stretchGoalOffered===true;return{walkingPlanned:!!walkingItem,walkingItem,walkingTargetMinutes,exercisePlanned:exerciseItems.length>0,exerciseItems,runningPlanned,strengthPlanned,impactPlanned,stretchPlanned}};
 const initialPlan=planForDate(existing?.date||iso(today())),initialScheduled=scheduledMeta(initialPlan);
 $('modalContent').innerHTML=`<div class="injuryCheckHeader"><h3>${editing?'Edit':'Daily'} injury check-in</h3><p>Questions are generated from the rehabilitation activities scheduled for the selected date. Unscheduled components are hidden and recorded as not planned.</p></div>
 <div id="icScheduledPlan" class="note good"></div>
 <section class="injuryCheckSection"><h4>1. Symptoms today</h4><div class="formGrid"><div class="field"><label>Date</label><input id="icDate" type="date" value="${existing?.date||iso(today())}"></div><div class="field"><label>Pain at rest now 0–10</label><input id="icPain" type="number" min="0" max="10" value="${prev.pain??''}"></div><div class="field"><label>Pain during normal walking 0–10</label><input id="icWalk" type="number" min="0" max="10" value="${prev.walkPain??''}"></div><div class="field"><label>Morning stiffness (minutes)</label><input id="icStiff" type="number" min="0" value="${prev.morningStiffness??''}" placeholder="Leave blank if not relevant"></div>${selectField('icTrend','Compared with yesterday',prev.symptomTrend,[['','Not assessed'],['better','Better'],['same','About the same'],['worse','Worse']])}${triSelect('icSwelling','Any new swelling or bruising?',prev.newSwelling)}</div></section>
 <section class="injuryCheckSection"><h4>2. Daily function</h4><div class="formGrid"><div class="field"><label>Comfortable walking completed (minutes)</label><input id="icWalkMinutes" type="number" min="0" value="${prev.walkMinutes??''}"></div>${triSelect('icStairs','Stairs tolerated with normal movement?',prev.stairs)}<div class="field"><label>Confidence in injured area 0–10</label><input id="icConfidence" type="number" min="0" max="10" value="${prev.confidence??''}"></div></div></section>
 <section class="injuryCheckSection"><h4>3. Scheduled rehabilitation execution</h4><p class="muted compact">Only activities scheduled for this date are shown. Report completion separately from symptom tolerance.</p><div class="formGrid"><div id="icExerciseExecutionBlock">${selectField('icRehabExercises','Scheduled rehab exercises',prev.rehabExerciseStatus||'', [['','Not assessed'],['all','All scheduled rehab exercises completed'],['some','Some scheduled rehab exercises completed'],['stopped','Started but stopped because of symptoms'],['none','Scheduled rehab exercises not started']])}</div><div id="icWalkingExecutionBlock">${selectField('icLocomotion','Scheduled walking target',prev.locomotionStatus||'', [['','Not assessed'],['completed','Full walking target completed'],['partial','Part of walking target completed — not stopped by symptoms'],['stopped','Started but stopped because of symptoms'],['none','Walking target not started']])}</div><div id="icStretchExecutionBlock">${selectField('icStretchGoal','Optional progression',prev.stretchGoalStatus||'', [['','Not assessed / not attempted'],['achieved','Optional progression completed'],['not_achieved','Optional progression not completed']])}</div><div id="icStrengthToleranceBlock">${triSelect('icBridge','Scheduled strength work tolerated with control?',prev.bridge,'Tolerated','Not tolerated')}</div><div id="icImpactToleranceBlock">${triSelect('icHop','Scheduled impact assessment completed and tolerated?',prev.hop,'Tolerated','Not tolerated')}</div></div></section>
 <section id="icRunningSection" class="injuryCheckSection"><h4>4. Scheduled running exposure</h4><div class="formGrid">${selectField('icRunStatus','Scheduled run',prev.runStatus,[['not_assessed','Not assessed'],['completed','Run completed'],['stopped','Started but stopped due to symptoms'],['unable','Unable to start because of symptoms']])}<div class="field"><label>Running completed (minutes)</label><input id="icRun" type="number" min="0" value="${prev.runMinutes??''}" placeholder="Enter actual minutes"></div><div class="field"><label>Highest pain during run 0–10</label><input id="icRunPain" type="number" min="0" max="10" value="${prev.runPain??''}"></div>${triSelect('icGait','Was gait or running technique altered?',prev.alteredGait)}</div></section>
 <section class="injuryCheckSection"><h4>5. Response to the previous load</h4><div class="formGrid">${triSelect('icWorse','Were symptoms worse later or the next morning?',prev.nextDayWorse)}${selectField('icResponse','Overall response to previous load',prev.loadResponse,[['','Not assessed'],['better','Better than before the previous load'],['stable','No meaningful worsening after the previous load'],['mild_flare','Temporary worsening, back to baseline within 24 hours'],['sustained_flare','Still worse more than 24 hours later']])}<div class="field fieldWide"><label>Symptoms / notes</label><textarea id="icSymptoms" placeholder="What changed, what activity caused it, and how long did the response last?">${esc(prev.symptoms||'')}</textarea></div></div></section>
 <div id="icConsistency" class="note"><b>Consistency check</b><p>The form will automatically align related answers.</p></div><button id="saveCheck" class="primary full">${editing?'Update check-in':'Save and recalculate timeline'}</button>${editing?'<button id="deleteCheck" class="danger full">Delete this check-in</button>':''}`;
 $('modal').className='modal';
 const runStatusField=$('icRunStatus'),runMinutesField=$('icRun'),runPainField=$('icRunPain'),gaitField=$('icGait'),walkMinutesField=$('icWalkMinutes'),locomotionField=$('icLocomotion'),exerciseField=$('icRehabExercises'),stretchField=$('icStretchGoal'),strengthField=$('icBridge'),impactField=$('icHop'),worseField=$('icWorse'),responseField=$('icResponse'),consistencyBox=$('icConsistency'),dateField=$('icDate');
 let activePlan=initialPlan,activeScheduled=initialScheduled,syncing=false;
 const showBlock=(id,show)=>{const el=$(id);if(el)el.classList.toggle('hidden',!show)};
 const applyScheduledQuestions=(date,preserve=true)=>{activePlan=planForDate(date);activeScheduled=scheduledMeta(activePlan);const planItems=(activePlan.items||[]).map(x=>`<li>${esc(x)}</li>`).join('');$('icScheduledPlan').innerHTML=`<b>Plan for ${esc(fmtDate(date))}: ${esc(activePlan.title)}</b>${planItems?`<ul>${planItems}</ul>`:'<p>No rehabilitation activity is scheduled.</p>'}${activePlan.stretchGoalOffered===true?`<p><b>Optional progression:</b> ${esc(activePlan.stretchGoal||'')}</p>`:''}<p class="muted compact">This is the exact prescription shown on this date's seven-day plan card.</p>`;
  showBlock('icExerciseExecutionBlock',activeScheduled.exercisePlanned);showBlock('icWalkingExecutionBlock',activeScheduled.walkingPlanned);showBlock('icStretchExecutionBlock',activeScheduled.stretchPlanned);showBlock('icStrengthToleranceBlock',activeScheduled.strengthPlanned);showBlock('icImpactToleranceBlock',activeScheduled.impactPlanned);showBlock('icRunningSection',activeScheduled.runningPlanned);
  if(!activeScheduled.exercisePlanned)exerciseField.value='not_planned';else if(exerciseField.value==='not_planned')exerciseField.value='';
  if(!activeScheduled.walkingPlanned)locomotionField.value='not_planned';else if(locomotionField.value==='not_planned')locomotionField.value='';
  if(!activeScheduled.stretchPlanned)stretchField.value='';
  if(!activeScheduled.strengthPlanned){strengthField.value='';strengthField.disabled=true;}else strengthField.disabled=false;
  if(!activeScheduled.impactPlanned){impactField.value='';impactField.disabled=true;}else impactField.disabled=false;
  if(!activeScheduled.runningPlanned){runStatusField.value='not_planned';clearRunDetail();}else if(runStatusField.value==='not_planned')runStatusField.value='not_assessed';
 };
 const clearRunDetail=()=>{runMinutesField.value='';runPainField.value='';gaitField.value='';};
 const setConsistencyMessage=()=>{const rs=runStatusField.value,mins=nullableNumber(runMinutesField.value),walkMins=nullableNumber(walkMinutesField.value),target=activeScheduled.walkingTargetMinutes,lo=locomotionField.value,ex=exerciseField.value,sg=stretchField.value;let parts=[];
  if(activeScheduled.exercisePlanned)parts.push(ex==='all'?'All scheduled exercises completed.':ex==='some'?'Some scheduled exercises completed.':ex==='stopped'?'Exercises were stopped because of symptoms.':ex==='none'?'Scheduled exercises were not started.':'Exercise completion still needs an answer.');
  if(activeScheduled.walkingPlanned)parts.push(lo==='completed'?`Walking target completed (${Number.isFinite(walkMins)?walkMins:0}/${target||'—'} min).`:lo==='partial'?`Part of the walking target completed (${Number.isFinite(walkMins)?walkMins:0}/${target||'—'} min), without symptoms forcing the stop.`:lo==='stopped'?`Walking stopped because of symptoms after ${Number.isFinite(walkMins)?walkMins:0} min.`:lo==='none'?'Walking target was not started.':'Walking completion still needs an answer.');
  if(activeScheduled.runningPlanned)parts.push(rs==='completed'?`${Number.isFinite(mins)?mins:0} min run completed; tolerance is judged separately from pain and gait.`:rs==='stopped'?`Run stopped because of symptoms after ${Number.isFinite(mins)?mins:0} min.`:rs==='unable'?'Planned run could not be started because of symptoms.':'Running completion still needs an answer.');
  if(sg==='achieved')parts.push('Optional progression achieved.');
  consistencyBox.innerHTML=`<b>Current interpretation</b><p>${esc(parts.join(' '))}</p>`;
 };
 const normalizeCheckIn=source=>{if(syncing)return;syncing=true;let rs=runStatusField.value,mins=nullableNumber(runMinutesField.value),walkMins=nullableNumber(walkMinutesField.value),target=activeScheduled.walkingTargetMinutes,lo=locomotionField.value,ex=exerciseField.value,sg=stretchField.value,bridge=readTri('icBridge'),hop=readTri('icHop'),worse=readTri('icWorse'),response=responseField.value;
  // Walking status and actual minutes are one coherent record.
  if(activeScheduled.walkingPlanned){
   if(source==='locomotion'){
    if(lo==='completed'&&(!Number.isFinite(walkMins)||walkMins<=0)){walkMins=target||1;walkMinutesField.value=walkMins;}
    else if(lo==='none'){walkMins=0;walkMinutesField.value='0';}
    else if((lo==='partial'||lo==='stopped')&&Number.isFinite(target)&&Number.isFinite(walkMins)&&walkMins>=target){walkMins=Math.max(1,target-1);walkMinutesField.value=walkMins;}
   }
   if(source==='walkMinutes'){
    if(Number.isFinite(walkMins)&&walkMins<=0)lo='none';
    else if(Number.isFinite(walkMins)&&walkMins>0){if(Number.isFinite(target)&&walkMins>=target)lo='completed';else if(lo!=='stopped')lo='partial';}
   }
  }else{lo='not_planned';walkMinutesField.value='';walkMins=null;}

  // Exercise execution controls whether strength and impact tolerance can be assessed.
  if(!activeScheduled.exercisePlanned)ex='not_planned';
  const performedExercises=ex==='all'||ex==='some';
  if(activeScheduled.strengthPlanned){
   if(ex==='stopped'){strengthField.value='false';strengthField.disabled=true;bridge=false;}
   else if(ex==='none'||ex==='not_planned'||!ex){strengthField.value='';strengthField.disabled=true;bridge=null;}
   else{strengthField.disabled=false;}
  }else{strengthField.value='';strengthField.disabled=true;bridge=null;}
  if(activeScheduled.impactPlanned){
   if(ex==='stopped'){impactField.value='false';impactField.disabled=true;hop=false;}
   else if(ex==='none'||ex==='not_planned'||!ex){impactField.value='';impactField.disabled=true;hop=null;}
   else{impactField.disabled=false;}
  }else{impactField.value='';impactField.disabled=true;hop=null;}

  // Running status and details are one coherent record. Completion and tolerance remain separate.
  if(activeScheduled.runningPlanned){
   if(source==='runStatus'){
    if(rs==='not_assessed'||rs==='unable'){clearRunDetail();mins=null;}
    else if(rs==='completed'&&(!Number.isFinite(mins)||mins<=0)){runMinutesField.value='';mins=null;}
    else if(rs==='stopped'&&(!Number.isFinite(mins)||mins<=0)){rs='unable';clearRunDetail();mins=null;}
   }
   if(source==='minutes'){
    if(Number.isFinite(mins)&&mins>0&&rs!=='stopped')rs='completed';
    else if(Number.isFinite(mins)&&mins<=0){rs=rs==='stopped'?'unable':'not_assessed';clearRunDetail();mins=null;}
   }
   if(Number.isFinite(mins)&&mins>0&&rs!=='stopped')rs='completed';
   if(rs==='unable'||rs==='not_assessed'){runPainField.value='';gaitField.value='';}
  }else{rs='not_planned';clearRunDetail();mins=null;}

  // Stretch goal can only be achieved after all mandatory scheduled components were fully completed.
  const mandatoryComplete=(!activeScheduled.exercisePlanned||ex==='all')&&(!activeScheduled.walkingPlanned||lo==='completed')&&(!activeScheduled.runningPlanned||rs==='completed');
  if(sg==='achieved'&&!mandatoryComplete)sg='not_achieved';
  if(ex==='stopped'||lo==='stopped'||rs==='stopped'||rs==='unable')sg='not_achieved';

  // Previous-load fields describe one response and cannot contradict each other.
  if(source==='response'){
   if(response==='better'||response==='stable')worse=false;
   else if(response==='mild_flare'||response==='sustained_flare')worse=true;
  }else if(source==='worse'){
   if(worse===false&&(response==='mild_flare'||response==='sustained_flare'))response='stable';
   if(worse===true&&(response==='better'||response==='stable'||!response))response='mild_flare';
  }
  worseField.value=known(worse)?String(worse):'';responseField.value=response;
  runStatusField.value=rs;locomotionField.value=lo;exerciseField.value=ex;stretchField.value=sg;syncing=false;setConsistencyMessage();
 };
 runMinutesField.addEventListener('input',()=>normalizeCheckIn('minutes'));
 walkMinutesField.addEventListener('input',()=>normalizeCheckIn('walkMinutes'));
 walkMinutesField.addEventListener('change',()=>normalizeCheckIn('walkMinutes'));
 runStatusField.addEventListener('change',()=>normalizeCheckIn('runStatus'));
 locomotionField.addEventListener('change',()=>normalizeCheckIn('locomotion'));
 exerciseField.addEventListener('change',()=>normalizeCheckIn('exercise'));
 strengthField.addEventListener('change',()=>normalizeCheckIn('strength'));
 impactField.addEventListener('change',()=>normalizeCheckIn('impact'));
 stretchField.addEventListener('change',()=>normalizeCheckIn('stretch'));
 worseField.addEventListener('change',()=>normalizeCheckIn('worse'));
 responseField.addEventListener('change',()=>normalizeCheckIn('response'));
 dateField.addEventListener('change',()=>{applyScheduledQuestions(dateField.value);normalizeCheckIn('date')});
 applyScheduledQuestions(dateField.value);
 normalizeCheckIn('initial');
 $('saveCheck').onclick=()=>{applyScheduledQuestions(dateField.value);normalizeCheckIn('save');let runStatus=activeScheduled.runningPlanned?runStatusField.value:'not_planned',runMinutes=nullableNumber(runMinutesField.value),rehabExerciseStatus=activeScheduled.exercisePlanned?(exerciseField.value||null):'not_planned',locomotionStatus=activeScheduled.walkingPlanned?(locomotionField.value||null):'not_planned',stretchGoalStatus=activeScheduled.stretchPlanned?(stretchField.value||null):'not_planned';
 if(['not_planned','not_assessed','unable'].includes(runStatus))runMinutes=null;
 const walkMinutes=nullableNumber(walkMinutesField.value),walkTarget=activeScheduled.walkingTargetMinutes;
 if(activeScheduled.exercisePlanned&&!rehabExerciseStatus)return toast('Answer whether the scheduled rehab exercises were completed.',true);
 if(activeScheduled.walkingPlanned&&!locomotionStatus)return toast('Answer whether the scheduled walking target was completed.',true);
 if(activeScheduled.runningPlanned&&runStatus==='not_assessed')return toast('Answer the scheduled running-exposure question.',true);
 if(activeScheduled.strengthPlanned&&['all','some'].includes(rehabExerciseStatus)&&!known(readTri('icBridge')))return toast('Because strength work was performed, state whether it was tolerated with control.',true);
 if(activeScheduled.impactPlanned&&['all','some'].includes(rehabExerciseStatus)&&!known(readTri('icHop')))return toast('Because the impact assessment was performed, state whether it was tolerated.',true);
 if(activeScheduled.strengthPlanned&&['none','not_planned'].includes(rehabExerciseStatus)&&known(readTri('icBridge')))return toast('Strength tolerance cannot be recorded when the strength exercises were not performed.',true);
 if(activeScheduled.impactPlanned&&['none','not_planned'].includes(rehabExerciseStatus)&&known(readTri('icHop')))return toast('Impact tolerance cannot be recorded when the impact assessment was not performed.',true);
 if(!activeScheduled.stretchPlanned&&stretchGoalStatus!=='not_planned')return toast('No optional progression was planned for this date. The optional-progression result has been cleared.',true);
 if(activeScheduled.stretchPlanned&&stretchGoalStatus==='not_planned')return toast('Answer the optional stretch-goal question for this date.',true);
 if(locomotionStatus==='completed'&&(!Number.isFinite(walkMinutes)||walkMinutes<=0))return toast('A completed walking target requires positive walking minutes.',true);
 if(locomotionStatus==='completed'&&Number.isFinite(walkTarget)&&walkMinutes<walkTarget)return toast(`The full walking target is ${walkTarget} minutes. Choose partial completion or enter at least ${walkTarget} minutes.`,true);
 if(['partial','stopped'].includes(locomotionStatus)&&(!Number.isFinite(walkMinutes)||walkMinutes<=0))return toast('Enter the walking minutes completed before selecting partial or stopped.',true);
 if(locomotionStatus==='none'&&Number.isFinite(walkMinutes)&&walkMinutes>0)return toast('Walking minutes must be zero when the walking target was not started.',true);
 if(runStatus==='completed'&&(!Number.isFinite(runMinutes)||runMinutes<=0))return toast('A completed run requires positive running minutes.',true);
 if(runStatus==='stopped'&&(!Number.isFinite(runMinutes)||runMinutes<=0))return toast('Enter the minutes completed before the run was stopped.',true);
 let legacyRehabStatus=rehabExerciseStatus==='not_planned'&&locomotionStatus==='not_planned'?'not_planned':stretchGoalStatus==='achieved'&&rehabExerciseStatus==='all'&&locomotionStatus==='completed'?'stretch':rehabExerciseStatus==='all'&&locomotionStatus==='completed'?'completed':rehabExerciseStatus==='some'||locomotionStatus==='partial'?'reduced':rehabExerciseStatus==='none'&&locomotionStatus==='completed'?'walking_only':rehabExerciseStatus==='stopped'||locomotionStatus==='stopped'?'stopped':rehabExerciseStatus==='none'&&locomotionStatus==='none'?'not_completed':null;let c={date:$('icDate').value,pain:nullableNumber($('icPain').value),walkPain:nullableNumber($('icWalk').value),morningStiffness:nullableNumber($('icStiff').value),symptomTrend:$('icTrend').value||null,newSwelling:readTri('icSwelling'),walkMinutes,stairs:readTri('icStairs'),confidence:nullableNumber($('icConfidence').value),rehabExerciseStatus,locomotionStatus,stretchGoalStatus,rehabStatus:legacyRehabStatus,bridge:activeScheduled.strengthPlanned?(rehabExerciseStatus==='stopped'?false:['all','some'].includes(rehabExerciseStatus)?readTri('icBridge'):null):null,hop:activeScheduled.impactPlanned?(rehabExerciseStatus==='stopped'?false:['all','some'].includes(rehabExerciseStatus)?readTri('icHop'):null):null,runStatus,runMinutes,runPain:activeScheduled.runningPlanned?nullableNumber($('icRunPain').value):null,alteredGait:activeScheduled.runningPlanned?readTri('icGait'):null,planSnapshot:{date:activePlan.date,type:activePlan.type,title:activePlan.title,items:[...(activePlan.items||[])],walkingTarget:activePlan.walkingTarget,stretchGoal:activePlan.stretchGoal,stretchGoalTitle:activePlan.stretchGoalTitle,stretchGoalWhy:activePlan.stretchGoalWhy,stretchGoalOffered:activePlan.stretchGoalOffered,bestOutcome:activePlan.bestOutcome,evidence:activePlan.evidence,running:activePlan.running,rationale:activePlan.rationale,rule:activePlan.rule,stage:activePlan.stage},nextDayWorse:readTri('icWorse'),loadResponse:$('icResponse').value||null,symptoms:$('icSymptoms').value.trim()};const executionCheck=rehabExecutionMeta(c);if((activeScheduled.exercisePlanned||activeScheduled.walkingPlanned||activeScheduled.runningPlanned)&&!executionCheck.assessed)return toast('Complete all scheduled execution questions so this check-in can be scored.',true);if(!c.date)return toast('Enter the check-in date.',true);if(dte(c.date)<dte(i.date))return toast('A check-in cannot be dated before the injury date.',true);const hasObs=Object.entries(c).some(([k,v])=>k!=='date'&&k!=='symptoms'&&v!==null&&v!==''&&v!==undefined);if(!hasObs&&!c.symptoms)return toast('Record at least one observation.',true);if(['stopped','unable'].includes(runStatus)&&Number.isFinite(runMinutes)&&runMinutes<0)return toast('Running minutes cannot be negative.',true);i.checkIns=i.checkIns||[];if(editing&&originalDate!==c.date&&i.checkIns.some(x=>x.date===c.date))return toast('A check-in already exists for that date.',true);let n=i.checkIns.findIndex(x=>x.date===(editing?originalDate:c.date));n>=0?i.checkIns[n]=c:i.checkIns.push(c);save();$('modal').className='modal hidden';renderInjury();toast(editing?'Check-in updated and full trajectory recalculated.':'Check-in saved. The full history—not this day alone—was used.');};if(editing)$('deleteCheck').onclick=()=>{if(confirm('Delete this check-in?')){i.checkIns=i.checkIns.filter(x=>x.date!==originalDate);save();$('modal').className='modal hidden';renderInjury();toast('Check-in deleted and trajectory recalculated.')}};
}
const openInjuryCheckUnvalidated=openInjuryCheck;
openInjuryCheck=function(injury,existing=null){
 openInjuryCheckUnvalidated(injury,existing);ensureAccessibleForms($('modalContent'));$('icDate').max=iso(today());const unsafeSave=$('saveCheck').onclick;
 $('saveCheck').onclick=()=>{const check={date:$('icDate').value,pain:nullableNumber($('icPain').value),walkPain:nullableNumber($('icWalk').value),morningStiffness:nullableNumber($('icStiff').value),confidence:nullableNumber($('icConfidence').value),walkMinutes:nullableNumber($('icWalkMinutes').value),runMinutes:nullableNumber($('icRun').value),runPain:nullableNumber($('icRunPain').value)};const errors=CORE.validateInjury({...injury,checkIns:[check]},{today:iso(today())}).filter(error=>error.field.startsWith('checkIns.'));if(errors.length){showFieldErrors(errors,{['checkIns.0.date']:'#icDate',['checkIns.0.pain']:'#icPain',['checkIns.0.walkPain']:'#icWalk',['checkIns.0.morningStiffness']:'#icStiff',['checkIns.0.confidence']:'#icConfidence',['checkIns.0.walkMinutes']:'#icWalkMinutes',['checkIns.0.runMinutes']:'#icRun',['checkIns.0.runPain']:'#icRunPain'},$('modalContent'));return toast(CORE.firstErrorMessage(errors),true)}unsafeSave()};
};
function renderUndoButtons(){try{$('undoSettingsBtn')?.classList.toggle('hidden',!localStorage.getItem(UNDO_KEY));$('undoRestoreBtn')?.classList.toggle('hidden',!localStorage.getItem(BACKUP_KEY))}catch{}}
function renderAll(){[renderDashboard,renderToday,renderPlan,renderRuns,renderMetrics,renderAssessments,renderCoach,renderInjury,renderRecovery,renderRace,renderSettings,renderPlanHealth,renderMigrationReport].forEach(fn=>{try{fn()}catch(err){recordDiagnostic('Render failure in '+fn.name,err)}});renderDiagnostics();ensureAccessibleForms();renderUndoButtons()}
const pages=[['today','Today'],['plan','Plan'],['runs','Log'],['dashboard','Progress'],['assessments','Assessments'],['recovery','Recovery'],['injury','Injury'],['race','Race day'],['settings','Settings']];
$('nav').innerHTML=pages.map((p,i)=>`<button data-page="${p[0]}" class="${i?'':'active'}">${p[1]}</button>`).join('');$('nav').onclick=e=>{let p=e.target.dataset.page;if(!p)return;document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===p));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===p));renderAll();scrollTo(0,0)};document.body.onclick=e=>{let exImg=e.target.closest('[data-exercise-image]');if(exImg){const name=exImg.dataset.exerciseName||'Exercise',img=exImg.dataset.exerciseImage,muscles=rehabExerciseMuscles(name);openExerciseImage(name,img,muscles);return}if(e.target.id==='addInjuryBtn'){openInjuryForm();return}let activate=e.target.closest('[data-activate-injury-plan]');if(activate){let id=activate.dataset.activateInjuryPlan,current=state.injuries.find(x=>x.id===state.activeInjuryPlanId),next=state.injuries.find(x=>x.id===id);if(next&&confirm(`Switch the active recovery plan from ${current?.location||'the current injury'} to ${next.location||'this injury'}? Only one plan can be followed at a time.`)){state.activeInjuryPlanId=id;save();renderInjury();toast('Active recovery plan switched.')}return;}let ib=e.target.closest('[data-injury-check]');if(ib){openInjuryCheck(state.injuries.find(x=>x.id===ib.dataset.injuryCheck));return}let ice=e.target.closest('[data-injury-check-edit]');if(ice){let injury=state.injuries.find(x=>x.id===ice.dataset.injuryCheckEdit),check=injury?.checkIns?.find(x=>x.date===ice.dataset.checkDate);if(injury&&check)openInjuryCheck(injury,check);return}let ie=e.target.closest('[data-injury-edit]');if(ie){openInjuryForm(state.injuries.find(x=>x.id===ie.dataset.injuryEdit));return}let idel=e.target.closest('[data-injury-delete]');if(idel){if(confirm('Delete this injury and its check-ins?')){state.injuries=state.injuries.filter(x=>x.id!==idel.dataset.injuryDelete);if(state.activeInjuryPlanId===idel.dataset.injuryDelete)state.activeInjuryPlanId=state.injuries[0]?.id||null;save();renderInjury()}return}const go=e.target.closest('[data-go]');if(go){closeDialog();activatePage(go.dataset.go,go.dataset.anchor||null);return}const scoreLink=e.target.closest('.wiScoreLink');if(scoreLink){setTimeout(()=>{const d=document.getElementById('executionBreakdownFoldout');if(d)d.open=true},0)}const planRunBtn=e.target.closest('[data-plan-run]');if(planRunBtn){openRunDetails(planRunBtn.dataset.planRun);return}let factorToggle=e.target.closest('.factorToggle');if(factorToggle){let tile=factorToggle.closest('.factorKpi'),open=tile.classList.toggle('open');factorToggle.setAttribute('aria-expanded',String(open));return}let w=e.target.closest('.workout');if(w&&!e.target.closest('button')){document.querySelectorAll('.workout[open]').forEach(x=>{if(x!==w)x.removeAttribute('open')});}};
const primaryPages=pages.slice(0,4),secondaryPages=pages.slice(4);
function navIcon(page){
 const icons={
  today:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h4l2-6 4 12 2-6h4"/><path d="M5 4h14v16H5z" opacity=".15"/></svg>',
  plan:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7 3v4M17 3v4M4 9h16M8 13h3M13 13h3M8 16h3"/></svg>',
  runs:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 4l-2 4 3 2 2-3 3 2"/><path d="M10 10l-3 4-3 1M14 11l-1 5 4 4M9 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>',
  dashboard:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V10M10 19V5M16 19v-7M22 19H2"/><path d="M4 8l6-4 6 6 5-5"/></svg>',
  more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
  assessments:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h5M8 16h7"/></svg>',
  recovery:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2-5.3"/><path d="M4 4v6h6"/></svg>',
  injury:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></svg>',
  race:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3M5 4h12l-3 4 3 4H5"/></svg>',
  settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>'
 };
 return icons[page]||icons.more;
}
function navButtonHtml(page,label,extra=''){return`<button ${extra} data-page="${page}"><span class="navIcon">${navIcon(page)}</span><span class="navLabel">${label}</span></button>`}
function renderNavigation(){const current=document.querySelector('.page.active')?.id||'today';$('nav').innerHTML=primaryPages.map(p=>navButtonHtml(p[0],p[1])).join('')+secondaryPages.map(p=>navButtonHtml(p[0],p[1],'class="desktopSecondary"')).join('')+`<button id="moreNavBtn" class="moreToggle" type="button" aria-expanded="false" aria-controls="moreNav"><span class="navIcon">${navIcon('more')}</span><span class="navLabel">More</span></button>`;$('moreNav').innerHTML=secondaryPages.map(p=>`<button data-page="${p[0]}"><span class="navIcon">${navIcon(p[0])}</span><span>${p[1]}</span></button>`).join('');setActiveNavigation(current)}
function setActiveNavigation(page){document.querySelectorAll('#nav [data-page],#moreNav [data-page]').forEach(button=>{const active=button.dataset.page===page;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});const more=$('moreNavBtn'),secondary=secondaryPages.some(item=>item[0]===page);more?.classList.toggle('active',secondary);if(secondary)more?.setAttribute('aria-current','page');else more?.removeAttribute('aria-current')}
function activatePage(page,anchor=null){if(!pages.some(p=>p[0]===page))return;document.querySelectorAll('.page').forEach(section=>section.classList.toggle('active',section.id===page));setActiveNavigation(page);$('moreNav').className='moreNav hidden';$('moreNavBtn')?.setAttribute('aria-expanded','false');renderAll();if(anchor){requestAnimationFrame(()=>document.getElementById(anchor)?.scrollIntoView({behavior:'smooth',block:'start'}))}else scrollTo(0,0);$('mainContent')?.focus({preventScroll:true})}
renderNavigation();
$('nav').onclick=event=>{
 const button=event.target.closest('button');
 if(!button||!$('nav').contains(button))return;
 if(button.id==='moreNavBtn'){
  const open=$('moreNav').classList.toggle('hidden')===false;
  button.setAttribute('aria-expanded',String(open));
  return;
 }
 if(button.dataset.page)activatePage(button.dataset.page);
};
$('moreNav').onclick=event=>{
 const button=event.target.closest('button[data-page]');
 if(button&&$('moreNav').contains(button))activatePage(button.dataset.page);
};
$('prevWeek').onclick=()=>{state.weekView=clamp((state.weekView||currentWeek())-1,1,weeks());renderPlan()};$('nextWeek').onclick=()=>{state.weekView=clamp((state.weekView||currentWeek())+1,1,weeks());renderPlan()};$('thisWeek').onclick=()=>{state.weekView=currentWeek();renderPlan()};

function runEditorHtml(r){
 if((r.sourceFormat==='csv-timeseries'||String(r.id||'').startsWith('stryd-'))&&Number(r.avgPower)>0&&Number(r.avgPower)<20){
   r.avgPower=Math.round(Number(r.avgPower)*(Number(state.setup.bodyWeight)||1));
 }
 return `<h2>Edit run</h2><form id="runEditorForm" novalidate><div class="formGrid">
  <div class="field"><label>Date</label><input id="erDate" type="date" max="${iso(today())}" required value="${r.date}"></div>
  <div class="field"><label>Run type</label><select id="erType">${['Easy','Easy + strides','Recovery','Shakeout','Steady aerobic','Medium-long','Progression','Long run','Specific long run','Race rehearsal','Hills','Fartlek','Threshold','Threshold intervals','VO₂max intervals','Race-pace intervals','Half-marathon-specific','Marathon-specific','Fitness assessment','Race'].map(x=>`<option ${r.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Distance km</label><input id="erDistance" type="number" inputmode="decimal" min="0.01" max="300" step="0.01" required value="${Number(r.distanceKm).toFixed(2)}"></div>
  <div class="field"><label>Duration (M:SS or H:MM:SS)</label><input id="erDuration" inputmode="numeric" required value="${fmtTime(r.durationSec)}"></div>
  <div class="field"><label>Average HR</label><input id="erHr" type="number" min="30" max="250" value="${Number.isFinite(r.avgHr)?Math.round(r.avgHr):''}"></div>
  <div class="field"><label>Average power</label><input id="erPower" type="number" min="1" max="2000" value="${Number.isFinite(r.avgPower)?Math.round(r.avgPower):''}"></div>
  <div class="field"><label>RPE 1–10 <small class="muted">1 easy · 10 maximal</small></label><input id="erRpe" type="number" min="1" max="10" value="${r.rpe??''}"></div>
  <div class="field"><label>Pain 0–10 <small class="muted">0 none · 5 affects form</small></label><input id="erPain" type="number" min="0" max="10" value="${r.pain??''}"></div>
  <div class="field"><label>Previous-night Garmin HRV (ms)</label><input id="erHrv" type="number" min="1" max="300" value="${r.hrv??''}"><small class="muted">Enter Garmin's Overnight Average from the night before this run.</small></div>
  <div class="field"><label>Link to planned workout</label><select id="erPlanMatch">${planMatchOptions(r,r.planId||(r.matchStatus==='unresolved'?'unresolved':'adhoc'))}</select><small class="muted">You control the link. Timing and workout-type differences are scored automatically.</small></div>
  <div class="field"><label>Notes</label><textarea id="erNotes" maxlength="5000">${esc(r.notes||'')}</textarea></div>
 </div>
 ${Number.isFinite(r.drift)?`<div class="dataStatus"><b>Imported cardiac drift: ${r.drift.toFixed(1)}%</b><br><span class="muted">Time-series analysis is preserved when summary fields are edited.</span></div>`:''}
 <button id="saveRunEdit" class="primary full" type="button">Save changes</button></form>`;
}
function refreshEditorPlanOptions(r){
 let date=$('erDate')?.value||r.date,type=$('erType')?.value||r.type,select=$('erPlanMatch');if(!select)return;
 let current=select.value||r.planId||(r.matchStatus==='unresolved'?'unresolved':'adhoc');
 select.innerHTML=planMatchOptions({...r,date,type},current);
 if([...select.options].some(o=>o.value===current&&!o.disabled))select.value=current;
}
function bindEditorPlanRefresh(r){
 refreshEditorPlanOptions(r);
 $('erDate').onchange=()=>refreshEditorPlanOptions(r);
 $('erType').onchange=()=>refreshEditorPlanOptions(r);
}
function updatedRunFromForm(r){
 let distance=Number($('erDistance').value),duration=parseTime($('erDuration').value);
 let updated={...r,date:$('erDate').value,type:$('erType').value,distanceKm:distance,durationSec:duration,
  avgHr:$('erHr').value===''?null:Number($('erHr').value),avgPower:$('erPower').value===''?null:Number($('erPower').value),
  rpe:$('erRpe').value===''?null:Number($('erRpe').value),pain:$('erPain').value===''?null:Number($('erPain').value),
  hrv:$('erHrv').value===''?null:Number($('erHrv').value),recovery:null,notes:CORE.cleanText($('erNotes').value,5000)};
 const errors=refineTimeErrors(CORE.validateRun(updated,{today:iso(today())}),[{field:'durationSec',label:'Duration',value:$('erDuration').value}]);if(errors.length){showFieldErrors(errors,{date:'#erDate',type:'#erType',distanceKm:'#erDistance',durationSec:'#erDuration',avgHr:'#erHr',avgPower:'#erPower',rpe:'#erRpe',pain:'#erPain',hrv:'#erHrv',notes:'#erNotes'},$('modal'));throw Error(CORE.firstErrorMessage(errors))}
 applyRunMatch(updated,$('erPlanMatch').value,'user');
 refreshIntervalAnalysis(updated,updated.planId?state.plan.find(p=>p.id===updated.planId):null);
 return updated;
}
function runAnalysisStackHtml(r,includeEditor=false){
 const intelligence=workoutIntelligenceHtml(r);
 const comparable=comparableRunHtml(r);
 const pathways=postRunCoachUpdateHtml(r);
 const execution=runExecutionBreakdownHtml(r);
 const editor=includeEditor?runEditorHtml(r):'';
 const interval=intervalAnalysisHtml(r);
 return`${intelligence}${interval}${comparable}${pathways}${execution}${editor}`;
}

function openRunDetails(runId){
 let r=state.runs.find(x=>x.id===runId);if(!r)return;
 if(r.source==='assessment'&&r.assessmentId){
   $('modalContent').innerHTML=workoutIntelligenceHtml(r)+comparableRunHtml(r)+runExecutionBreakdownHtml(r)+`<div class="note">This run was created from a fitness assessment. Edit it from the Assessments tab so both records remain synchronized.</div>`;
   $('modal').className='modal';
   return;
 }
 $('modalContent').innerHTML=runAnalysisStackHtml(r,true)+`<button id="deleteEditedRun" class="danger buttonLike full">Delete run</button>`;
 $('modal').className='modal';
 bindEditorPlanRefresh(r);
 $('saveRunEdit').onclick=()=>{
   try{
    let updated=updatedRunFromForm(r),i=state.runs.findIndex(x=>x.id===r.id);
    if(i<0)throw Error('Run not found.');
    state.runs.splice(i,1);const before=postRunCoachSnapshot(updated.date);state.runs.splice(i,0,updated);recordPredictionSnapshot(updated.date,'Run update',updated.id);const after=postRunCoachSnapshot(updated.date);updated.coachUpdate=postRunCoachUpdate(updated,before,after);save();renderAll();$('modalContent').innerHTML=runAnalysisStackHtml(updated,false)+`<button id="closeCoachUpdate" class="primary full" type="button">Done</button>`;$('modal').className='modal';$('closeCoachUpdate').onclick=closeDialog;toast('Run updated and coaching update recalculated.');
   }catch(err){toast(err.message,true)}
 };
 $('deleteEditedRun').onclick=()=>{
   if(!confirm('Delete this run?'))return;
   state.runs=state.runs.filter(x=>x.id!==r.id);state.predictionHistory=(state.predictionHistory||[]).filter(x=>x.entityId!==r.id);save();$('modal').className='modal hidden';renderAll();toast('Run deleted.');
 };
}
$('runList').onclick=e=>{const card=e.target.closest('[data-run]');if(card)openRunDetails(card.dataset.run)};
$('runList').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-run]')){e.preventDefault();openRunDetails(e.target.dataset.run)}};
$('manualRunBtn').onclick=()=>{
 let r={id:'manual-'+Date.now(),date:iso(today()),type:'Easy',distanceKm:'',durationSec:null,avgHr:null,avgPower:null,rpe:null,pain:null,recovery:null,hrv:null,notes:''};
 $('modalContent').innerHTML=runEditorHtml(r);
 $('modal').className='modal';
 bindEditorPlanRefresh(r);
 $('saveRunEdit').onclick=()=>{
   try{let created=updatedRunFromForm(r),before=postRunCoachSnapshot(created.date);state.runs.push(created);recordPredictionSnapshot(created.date,'Run saved',created.id);let after=postRunCoachSnapshot(created.date);created.coachUpdate=postRunCoachUpdate(created,before,after);save();renderAll();$('modalContent').innerHTML=runAnalysisStackHtml(created,false)+`<button id="closeCoachUpdate" class="primary full" type="button">Done</button>`;$('modal').className='modal';$('closeCoachUpdate').onclick=closeDialog;toast('Run saved and coaching update calculated.')}catch(err){toast(err.message,true)}
 };
};
$('closeModal').onclick=closeDialog;
$('modal').onclick=e=>{if(e.target===$('modal'))closeDialog()};

$('activityFile').onchange=async e=>{
 const input=e.target;
 const f=input.files?.[0];
 if(!f)return;
 preview=null;
 $('importPreview').className='hidden';
 try{
   preview=await parseRunImportFile(f);
   if(!preview||!preview.distanceKm||!preview.durationSec)throw Error('The activity could not be summarised from this file.');
   if(state.runs.some(r=>r.id===preview.id||(
     r.date===preview.date&&Math.abs(Number(r.distanceKm)-Number(preview.distanceKm))<.02&&Math.abs(Number(r.durationSec)-Number(preview.durationSec))<5
   )))throw Error('This activity appears to have already been imported.');

   let m=metrics(preview),format=preview.sourceFormat==='fit-activity'?(preview.sourceDevice||'FIT activity'):'Stryd CSV';
   $('importPreview').className='panel';
   $('importPreview').innerHTML=`<h3>${esc(format)} analysis preview</h3>
   <div class="metricGrid">
    ${kpi('Date',preview.date)}
    ${kpi('Distance',preview.distanceKm.toFixed(2)+' km')}
    ${kpi('Duration',fmtTime(preview.durationSec))}
    ${kpi('Pace',pace(m.pace))}
    ${kpi('Heart rate',preview.avgHr?Math.round(preview.avgHr)+' bpm':'—')}
    ${kpi('Power',preview.avgPower?Math.round(preview.avgPower)+' W':'—',preview.avgPower?'Parsed from native or developer FIT/CSV power data':'No usable power field found')}
    ${kpi('Cadence',preview.cadence?Math.round(preview.cadence)+' spm':'—')}
    ${kpi('Power cardiac drift',Number.isFinite(preview.candidatePowerDrift)?preview.candidatePowerDrift.toFixed(1)+'% candidate':'Not available',preview.candidateStreamEvidence?.reliability?preview.candidateStreamEvidence.reliability+' reliability · timestamped HR + running power':'Needs sufficient timestamped HR and running power')}
    ${kpi('Efficiency factor',dec(m.efficiencyJ,1)+' J/beat')}
   </div>
   ${preview.fitWarnings?.length?`<div class="note"><b>FIT decoder notes</b><p class="muted compact">${esc(preview.fitWarnings.join(' · '))}</p></div>`:''}
   <div class="formGrid">
    <div class="field"><label>Run type</label><select id="iType"><option>Easy</option><option>Easy + strides</option><option>Recovery</option><option>Shakeout</option><option>Steady aerobic</option><option>Medium-long</option><option>Progression</option><option>Long run</option><option>Specific long run</option><option>Race rehearsal</option><option>Hills</option><option>Fartlek</option><option>Threshold</option><option>Threshold intervals</option><option>VO₂max intervals</option><option>Race-pace intervals</option><option>Half-marathon-specific</option><option>Marathon-specific</option><option>Fitness assessment</option><option>Race</option></select></div>
    <div class="field"><label>Link to planned workout</label><select id="iPlanMatch"></select><small class="muted">Confirm a planned workout, choose ad hoc, or leave unresolved.</small></div>
    <div class="field"><label>RPE 1–10 <small class="muted">1 very easy · 10 maximal</small></label><input id="iRpe" type="number" min="1" max="10"></div>
    <div class="field"><label>Pain 0–10 <small class="muted">0 none · 5 affects form · 10 extreme</small></label><input id="iPain" type="number" min="0" max="10"></div>
    <div class="field"><label>Previous-night Garmin HRV (ms)</label><input id="iHrv" type="number" min="1" max="250"></div>
    <div class="field"><label>Notes</label><input id="iNotes" value="${esc(preview.notes||'')}"></div>
   </div>
   <button id="saveImport" class="primary full">Save analysed run</button>`;
   const sameDayPlan=state.plan.find(p=>p.type!=='Rest'&&p.type!=='Race Day'&&p.date===preview.date&&!state.runs.some(r=>r.planId===p.id));
   if(sameDayPlan)$('iType').value=sameDayPlan.type==='Fitness assessment'?'Fitness assessment':sameDayPlan.type;
   const refreshImportMatches=()=>{let draft={...preview,type:$('iType').value};let suggested=preview.planId||suggestedPlanId(draft)||'adhoc';$('iPlanMatch').innerHTML=planMatchOptions(draft,suggested)};
   refreshImportMatches();$('iType').onchange=refreshImportMatches;

   $('saveImport').onclick=()=>{
    try{
      if(!preview)throw Error('The import preview has expired. Choose the file again.');
      if(state.runs.some(r=>r.id===preview.id))throw Error('This run was already imported.');
      Object.assign(preview,{type:$('iType').value,rpe:Number($('iRpe').value)||null,pain:$('iPain').value===''?null:Number($('iPain').value),hrv:$('iHrv').value===''?null:Number($('iHrv').value),recovery:null,notes:$('iNotes').value});
      preview.drift=preview.candidatePowerDrift;preview.powerDrift=preview.candidatePowerDrift;preview.paceDrift=null;preview.streamEvidence=preview.candidateStreamEvidence;
      delete preview.candidateDrift;delete preview.candidatePowerDrift;delete preview.candidatePaceDrift;delete preview.candidateStreamEvidence;
      const errors=CORE.validateRun(preview,{today:iso(today())});
      if(errors.length){showFieldErrors(errors,{type:'#iType',rpe:'#iRpe',pain:'#iPain',hrv:'#iHrv',notes:'#iNotes'},$('importPreview'));throw Error(CORE.firstErrorMessage(errors))}
      applyRunMatch(preview,$('iPlanMatch').value,'user');
      refreshIntervalAnalysis(preview,preview.planId?state.plan.find(p=>p.id===preview.planId):null);
      let before=null;try{before=postRunCoachSnapshot(preview.date)}catch(e){console.warn('Coach pre-snapshot failed',e)}
      const savedRun={...preview};state.runs.push(savedRun);reconcileExactDateMatches();
      recordPredictionSnapshot(savedRun.date,savedRun.sourceFormat==='fit-activity'?'FIT import':'Stryd import',savedRun.id);
      let coachHtml='',coachWarning='';
      try{const after=postRunCoachSnapshot(savedRun.date);if(before){savedRun.coachUpdate=postRunCoachUpdate(savedRun,before,after);coachHtml=postRunCoachUpdateHtml(savedRun)}}catch(e){console.warn('Coach update failed',e);coachWarning=' Run saved; Coach Update unavailable for this import.'}
      save();$('importPreview').className='hidden';preview=null;input.value='';renderAll();
      if(coachHtml){$('modalContent').innerHTML=coachHtml+`<button id="closeCoachUpdate" class="primary full" type="button">Done</button>`;$('modal').className='modal';$('closeCoachUpdate').onclick=closeDialog}
      toast(`Activity analysed and run saved.${coachWarning}`,!!coachWarning);
    }catch(err){toast(err?.message||'The run could not be saved.',true)}
   };
 }catch(err){preview=null;input.value='';$('importPreview').className='hidden';toast(err?.message||'The activity file could not be imported.',true)}
};
$('addAssessmentBtn').onclick=()=>{
 const form=$('assessmentForm');form.className='panel';form.innerHTML=`<h3>Fitness assessment result</h3><form id="assessmentEntryForm" novalidate><div class="formGrid"><div class="field"><label>Date</label><input id="aDate" type="date" max="${iso(today())}" required value="${iso(today())}"></div><div class="field"><label>Distance km</label><input id="aDist" type="number" inputmode="decimal" min="0.1" max="200" step="0.01" required value="5"></div><div class="field"><label>Time (M:SS or H:MM:SS)</label><input id="aTime" inputmode="numeric" required placeholder="25:15"></div><div class="field"><label>Average / threshold HR</label><input id="aHr" type="number" min="60" max="240" value="${state.setup.thresholdHr}"></div><div class="field"><label>Average / critical power W</label><input id="aCp" type="number" min="50" max="1000" value="${state.setup.criticalPower}"></div><div class="field"><label>Valid result</label><select id="aValid"><option value="true">Yes</option><option value="false">No</option></select></div></div><button id="saveAssessment" type="submit" class="primary full">Save assessment and completed run</button></form>`;
 ensureAccessibleForms(form);
 $('assessmentEntryForm').onsubmit=event=>{event.preventDefault();const a={id:'a-'+Date.now(),date:$('aDate').value,distance:Number($('aDist').value),time:parseTime($('aTime').value),thresholdHr:optionalBounded($('aHr').value,60,240),criticalPower:optionalBounded($('aCp').value,50,1000),valid:$('aValid').value==='true'};const errors=refineTimeErrors(CORE.validateAssessment(a,{today:iso(today())}),[{field:'time',label:'Assessment time',value:$('aTime').value}]);if(errors.length){showFieldErrors(errors,{date:'#aDate',distance:'#aDist',time:'#aTime',thresholdHr:'#aHr',criticalPower:'#aCp'},form);return toast(CORE.firstErrorMessage(errors),true)}state.assessments.push(a);syncAssessmentRun(a);buildPlan();syncAssessmentRun(a);recordPredictionSnapshot(a.date,'Fitness assessment',a.id);save();renderAll();form.className='hidden';toast(a.valid?'Assessment saved, added to run history and applied to future targets.':'Assessment saved and added to run history, but not applied to prediction.')};
};

function validateSetup(candidate){return CORE.validateSetup(candidate).map(error=>error.message)}
function validateBackup(obj){return obj&&typeof obj==='object'&&obj.setup&&Array.isArray(obj.runs)&&Array.isArray(obj.assessments)&&Array.isArray(obj.days)}
$('saveSettings').onclick=()=>{let candidate={...state.setup};document.querySelectorAll('[data-setting]').forEach(el=>{let k=el.dataset.setting,t=el.dataset.type,v=el.value;if(t==='number')v=Number(v);if(t==='time')v=parseTime(v);if(t==='percent')v=Number(v)/100;candidate[k]=v});let errors=validateSetup(candidate);if(errors.length)return toast(errors[0],true);let selectedDays=[...document.querySelectorAll('[data-day]')].filter(el=>el.checked).length;if(selectedDays<1)return toast('Select at least one training day.',true);const baselineKeys=['planStart','raceDistance','targetTime','testDistance','testTime','currentWeekly','currentLongest','maxWeekly','peakLong'];const baselineChanged=baselineKeys.some(k=>String(candidate[k])!==String(state.setup[k]));state.setup=candidate;if(baselineChanged){state.programStartPrediction=initialProgrammePrediction(candidate);state.predictionHistory=[];}document.querySelectorAll('[data-day]').forEach(el=>state.days[Number(el.dataset.day)][1]=el.checked);let longRadio=document.querySelector('[data-long-day]:checked'),longIdx=longRadio?Number(longRadio.dataset.longDay):null;if(longIdx==null||!state.days[longIdx]?.[1])return toast('Select one enabled running day as the long-run day.',true);state.days.forEach((d,i)=>d[2]=i===longIdx?'Long run':'Adaptive');buildPlan();state.weekView=currentWeek();save();renderAll();toast('Settings saved. Training frequency and race outlook and preparation model were recalculated; future workouts rebuilt.')};
function readSettingsDraft(){const candidate={...state.setup};document.querySelectorAll('[data-setting]').forEach(el=>{let value=el.value;const type=el.dataset.type;if(type==='number')value=el.value.trim()===''?null:Number(value);if(type==='time')value=parseTime(value);if(type==='percent')value=el.value.trim()===''?null:Number(value)/100;candidate[el.dataset.setting]=value});const longRadio=document.querySelector('[data-long-day]:checked'),longIdx=longRadio?Number(longRadio.dataset.longDay):null;const days=state.days.map((day,index)=>[day[0],Boolean(document.querySelector(`[data-day="${index}"]`)?.checked),index===longIdx?'Long run':day[2]==='Long run'?'Adaptive':day[2]]);return{candidate,days}}
function applySettingsDraft(candidate,days){localStorage.setItem(UNDO_KEY,JSON.stringify(state));const baselineKeys=['planStart','raceDistance','targetTime','testDistance','testTime','currentWeekly','currentLongest','maxWeekly','peakLong'];const baselineChanged=baselineKeys.some(key=>String(candidate[key])!==String(state.setup[key]));state.setup={...candidate,raceName:CORE.cleanText(candidate.raceName,100).trim()||'Goal race'};state.days=days;if(baselineChanged){state.programStartPrediction=initialProgrammePrediction(state.setup);state.predictionHistory=[]}buildPlan();state.weekView=currentWeek();save();closeDialog();renderAll();toast('Settings saved. Future workouts were rebuilt; Undo is available in Settings.')}
$('saveSettings').onclick=()=>{const{candidate,days}=readSettingsDraft(),errors=refineTimeErrors([...CORE.validateSetup(candidate),...CORE.validateDays(days)],[{field:'targetTime',label:'Target time',value:document.querySelector('[data-setting="targetTime"]')?.value},{field:'testTime',label:'Recent test time',value:document.querySelector('[data-setting="testTime"]')?.value}]);if(errors.length){showFieldErrors(errors,{},$('settings'));return toast(CORE.firstErrorMessage(errors),true)}const setupLabels={planStart:'Plan start',raceDate:'Race date',raceName:'Race name',raceDistance:'Race distance',targetTime:'Target time',currentWeekly:'Current weekly distance',currentLongest:'Current longest run',testDistance:'Test distance',testTime:'Test time',thresholdHr:'Threshold HR',criticalPower:'Critical power',bodyWeight:'Body weight',maxWeekly:'Maximum weekly distance',growth:'Weekly growth limit',peakLong:'Peak long run',taperDays:'Taper days'};const changes=Object.keys(setupLabels).filter(key=>String(candidate[key])!==String(state.setup[key])).map(key=>`<li><b>${esc(setupLabels[key])}</b>: ${esc(state.setup[key])} → ${esc(candidate[key])}</li>`);if(JSON.stringify(days)!==JSON.stringify(state.days))changes.push('<li><b>Training days</b>: availability or long-run day changed</li>');if(!changes.length)return toast('No settings changed.');showDialog(`<h2>Preview plan rebuild</h2><p>These changes will rebuild future workouts. Completed history is preserved.</p><ul class="changePreview">${changes.join('')}</ul><div class="buttonRow"><button id="confirmSettings" class="primary" type="button">Apply and rebuild</button><button id="cancelSettings" class="secondary" type="button">Cancel</button></div>`,'Preview plan rebuild');$('confirmSettings').onclick=()=>applySettingsDraft(candidate,days);$('cancelSettings').onclick=closeDialog};
$('undoSettingsBtn').onclick=()=>{try{const prior=JSON.parse(localStorage.getItem(UNDO_KEY)||'null');if(!prior)throw Error('No plan rebuild is available to undo.');const restored=normaliseState(prior),check=CORE.validateBackup(restored,{today:iso(today())});if(!check.valid)throw Error(CORE.firstErrorMessage(check.errors));state=restored;buildPlan();save();localStorage.removeItem(UNDO_KEY);renderAll();toast('The previous settings and plan have been restored.')}catch(err){toast(err.message||'Undo failed.',true)}};
function download(n,t,m){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('planHealthBtn').onclick=()=>{renderPlanHealth();const ok=validatePlan(state.plan).valid;toast(ok?'Plan validation passed.':'Plan validation found issues.',!ok)};
$('backupBtn').onclick=()=>download('ai-running-coach-backup.json',JSON.stringify(state,null,2),'application/json');$('restoreFile').onchange=e=>e.target.files[0]?.text().then(t=>{let candidate=JSON.parse(t);if(!validateBackup(candidate))throw new Error('Backup structure is incomplete.');let errors=validateSetup(candidate.setup);if(errors.length)throw new Error(errors[0]);candidate.schemaVersion=SCHEMA;candidate.plan=Array.isArray(candidate.plan)?candidate.plan:[];state=candidate;buildPlan();save();renderAll();toast('Backup restored and migrated.')}).catch(err=>toast(err?.message||'Invalid backup.',true));$('exportBtn').onclick=()=>download('run-log.csv',['Date,Type,Distance km,Duration sec,HR,Power,RPE,Pain,Previous-night Garmin HRV,Match status,Plan ID,Day offset,Notes',...state.runs.map(r=>[r.date,r.type,r.distanceKm,r.durationSec,r.avgHr,r.avgPower,r.rpe,r.pain,r.hrv??'',r.matchStatus||'',r.planId||'',r.dayOffset??'',`"${String(r.notes||'').replaceAll('"','""')}"`].join(','))].join('\n'),'text/csv');$('resetBtn').onclick=()=>{if(confirm('Delete all app data?')){state=defaults();buildPlan();save();renderAll();initOnboarding();toast('App reset. Enter your own details to start again.')}};
$('restoreFile').onchange=async event=>{const input=event.target,file=input.files?.[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('Backup files must be 5 MB or smaller.');const raw=JSON.parse(await file.text());const rawCheck=CORE.validateBackup(raw,{today:iso(today())});if(!rawCheck.valid)throw Error(`Backup rejected: ${CORE.firstErrorMessage(rawCheck.errors)}`);const candidate=normaliseState(raw),normalizedCheck=CORE.validateBackup(candidate,{today:iso(today())});if(!normalizedCheck.valid)throw Error(`Backup rejected after normalization: ${CORE.firstErrorMessage(normalizedCheck.errors)}`);showDialog(`<h2>Preview backup restore</h2><p>Review the validated data before replacing the current local data.</p><dl class="restorePreview"><div><dt>Runs</dt><dd>${candidate.runs.length}</dd></div><div><dt>Assessments</dt><dd>${candidate.assessments.length}</dd></div><div><dt>Injuries</dt><dd>${candidate.injuries.length}</dd></div><div><dt>Race</dt><dd>${esc(candidate.setup.raceName)} · ${esc(candidate.setup.raceDate)}</dd></div></dl><p class="note">A rollback copy of the current data will be kept on this device until the next restore.</p><div class="buttonRow"><button id="confirmRestore" class="primary" type="button">Restore this backup</button><button id="cancelRestore" class="secondary" type="button">Cancel</button></div>`,'Preview backup restore');$('confirmRestore').onclick=()=>{try{localStorage.setItem(BACKUP_KEY,JSON.stringify(state));state=candidate;state.onboardingComplete=true;buildPlan();save();closeDialog();input.value='';renderAll();toast('Backup restored. Undo is available in Settings.')}catch(err){toast(err.message||'The backup could not be restored.',true)}};$('cancelRestore').onclick=()=>{input.value='';closeDialog()}}catch(err){input.value='';toast(err.message||'Invalid backup.',true)}};
$('undoRestoreBtn').onclick=()=>{try{const prior=JSON.parse(localStorage.getItem(BACKUP_KEY)||'null');if(!prior)throw Error('No backup restore is available to undo.');const candidate=normaliseState(prior),check=CORE.validateBackup(candidate,{today:iso(today())});if(!check.valid)throw Error(CORE.firstErrorMessage(check.errors));state=candidate;buildPlan();save();localStorage.removeItem(BACKUP_KEY);renderAll();toast('The data from before the restore have been recovered.')}catch(err){toast(err.message||'Restore rollback failed.',true)}};
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('installBtn').className='install'});$('installBtn').onclick=()=>deferred?.prompt();
$('pillarCards')?.addEventListener('click',e=>{const card=e.target.closest('.pillarCard');if(!card||e.target.closest('summary'))return;const detail=card.querySelector('.pillarExplain');if(!detail)return;card.classList.toggle('open');detail.open=card.classList.contains('open');card.setAttribute('aria-expanded',String(detail.open))});
$('pillarCards')?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('pillarCard')){e.preventDefault();e.target.click()}});
function setOnboardingOpen(open){const overlay=$('onboarding');overlay.classList.toggle('hidden',!open);document.body.classList.toggle('onboardingOpen',open);$('mainContent').inert=open;$('nav').inert=open;$('moreNav').inert=open;if(open)requestAnimationFrame(()=>$('obRaceName').focus())}
function onboardingDraft(){const profile=raceProfile(Number($('obRaceDistance').value));const setup={...state.setup,planStart:iso(today()),raceName:CORE.cleanText($('obRaceName').value,100).trim(),raceDate:$('obRaceDate').value,raceDistance:Number($('obRaceDistance').value),targetTime:parseTime($('obTargetTime').value),currentWeekly:Number($('obCurrentWeekly').value),currentLongest:Number($('obCurrentLongest').value),bodyWeight:Number($('obBodyWeight').value),testDistance:Number($('obTestDistance').value),testTime:parseTime($('obTestTime').value),thresholdHr:Number($('obThresholdHr').value),criticalPower:Number($('obCriticalPower').value),maxWeekly:Math.max(Number($('obCurrentWeekly').value),profile.maxWeekly),growth:profile.growth,peakLong:profile.peakLong,taperDays:profile.taperDays};return{setup,days:profile.days.map(day=>[...day])}}
function initOnboarding(){if(state.onboardingComplete)return setOnboardingOpen(false);$('obRaceDate').value=state.setup.raceDate;const form=$('onboardingForm'),submit=form.querySelector('[type="submit"]'),summary=$('onboardingErrors');form.addEventListener('input',()=>{form.dataset.reviewed='';submit.textContent='Review and create my plan';summary.className='formErrors hidden';summary.textContent=''});form.onsubmit=event=>{event.preventDefault();const{setup,days}=onboardingDraft(),errors=refineTimeErrors([...CORE.validateSetup(setup),...CORE.validateDays(days)],[{field:'targetTime',label:'Target time',value:$('obTargetTime').value},{field:'testTime',label:'Recent test time',value:$('obTestTime').value}]);if(!$('obConfirm').checked)errors.push({field:'confirm',message:'Confirm that the values are yours before creating the plan.'});const mapping={raceName:'#obRaceName',raceDate:'#obRaceDate',raceDistance:'#obRaceDistance',targetTime:'#obTargetTime',currentWeekly:'#obCurrentWeekly',currentLongest:'#obCurrentLongest',bodyWeight:'#obBodyWeight',testDistance:'#obTestDistance',testTime:'#obTestTime',thresholdHr:'#obThresholdHr',criticalPower:'#obCriticalPower',confirm:'#obConfirm'};if(errors.length){showFieldErrors(errors,mapping,form);summary.className='formErrors';summary.setAttribute('role','alert');summary.textContent=CORE.firstErrorMessage(errors);return toast(CORE.firstErrorMessage(errors),true)}if(form.dataset.reviewed!=='true'){form.dataset.reviewed='true';summary.className='onboardingReview';summary.setAttribute('role','status');summary.innerHTML=`<b>Review your plan inputs</b><p>${esc(setup.raceName)} · ${esc(setup.raceDistance)} km on ${esc(fmtDate(setup.raceDate))}</p><p>Target ${esc(fmtTime(setup.targetTime))}; recent ${esc(setup.testDistance)} km in ${esc(fmtTime(setup.testTime))}; ${esc(setup.currentWeekly)} km/week.</p>`;submit.textContent='Create my plan';submit.focus();return}state.setup=setup;state.days=days;state.onboardingComplete=true;state.programStartPrediction=initialProgrammePrediction(setup);state.predictionHistory=[];buildPlan();save();setOnboardingOpen(false);renderAll();toast('Your personal plan is ready. Today is your starting view.')};setOnboardingOpen(true)}
$('onboarding').addEventListener('keydown',event=>{if($('onboarding').classList.contains('hidden'))return;if(event.key==='Escape'){event.preventDefault();toast('Complete first-time setup before using the coach.',true);$('onboardingTitle').focus?.();return}if(event.key!=='Tab')return;const focusable=[...$('onboarding').querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&el.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}});
const brandVersion=document.querySelector('.brand-copy p');if(brandVersion)brandVersion.textContent=`Race-specific adaptive planning • v${CORE.VERSION} · build ${BUILD}`;
if('serviceWorker'in navigator&&(location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname)))navigator.serviceWorker.register(`service-worker.js?v=${BUILD}-ui3`,{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
migrateAssessmentRuns();
migrateImportedPower();
if(reconcilePredictionHistory())save();
renderAll();
initOnboarding();
console.info(`AI Running Coach v${CORE.VERSION} stable build ${BUILD}`);
})();
