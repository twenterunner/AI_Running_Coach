'use strict';
// Execute the integrated app's calibration UI and engine with a small DOM stand-in.
// This verifies interaction/data behaviour and CSS structure, not browser rendering.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
process.env.TZ='Europe/Amsterdam';
const dir=__dirname;
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
function integratedBlock(text,name){
 const startMarker='/* BEGIN '+name+' */',endMarker='/* END '+name+' */';
 const start=text.indexOf(startMarker),end=text.indexOf(endMarker,start);
 assert(start>=0&&end>start,'Integrated '+name+' block exists');
 return text.slice(start+startMarker.length,end);
}
const ui=integratedBlock(app,'calibration-ui');
const engine=integratedBlock(app,'calibration-core');
const css=integratedBlock(fs.readFileSync(path.join(dir,'styles.css'),'utf8'),'calibration-ui');
const initialization=app.match(/ensureCalibrationState\(\);\s*snapshotHistoricalRunWeights\(\);\s*bindCalibrationControls\(document\);/)?.[0];
assert(initialization,'Actual startup initializes calibration state and delegated controls');
const coreEnd=app.indexOf('let preview=null;');
assert(coreEnd>0,'Actual core utility boundary is present');
const decode=s=>String(s??'').replace(/&(amp|lt|gt|quot|#39);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[key]));
class Element{
 constructor(tag,attributes={},parent=null){this.tag=tag;this.attributes=attributes;this.parent=parent;this.children=[];this.listeners={};this.hidden='hidden'in attributes;this.disabled=false;this._value=null}
 get id(){return this.attributes.id||''}get min(){return this.attributes.min||''}get max(){return this.attributes.max||''}
 get dataset(){return Object.fromEntries(Object.entries(this.attributes).filter(([key])=>key.startsWith('data-')).map(([key,value])=>[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),value]))}
 get className(){return this.attributes.class||''}set className(value){this.attributes.class=value}
 get value(){if(this._value!==null)return this._value;if(this.tag==='select'){const option=this.querySelectorAll('option').find(x=>'selected'in x.attributes)||this.querySelector('option');return option?.attributes.value||''}return this.attributes.value||''}
 set value(value){this._value=String(value)}
 setAttribute(key,value){this.attributes[key]=String(value)}removeAttribute(key){delete this.attributes[key]}
 get innerHTML(){return this._html||''}
 set innerHTML(html){
  this._html=String(html);this.children=[];const stack=[this],voidTags=new Set(['input','br','hr','img','meta','link']);
  for(const token of this._html.match(/<[^>]+>|[^<]+/g)||[]){
   if(token.startsWith('</')){if(stack.length>1)stack.pop();continue}
   if(!token.startsWith('<')||token.startsWith('<!'))continue;
   const match=token.match(/^<([\w-]+)([\s\S]*?)\/?\s*>$/);if(!match)continue;
   const attributes={};for(const m of match[2].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attributes[m[1]]=decode(m[2]??m[3]??m[4]??'');
   const parent=stack.at(-1),child=new Element(match[1],attributes,parent);parent.children.push(child);
   if(!voidTags.has(child.tag)&&!token.endsWith('/>'))stack.push(child);
  }
 }
 matches(selector){
  if(selector.startsWith('#'))return this.id===selector.slice(1);
  const m=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
  if(m)return m[1]in this.attributes&&(m[2]===undefined||this.attributes[m[1]]===m[2]);
  return this.tag===selector;
 }
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)])}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 closest(selector){for(let current=this;current;current=current.parent)if(current.matches(selector))return current;return null}
 contains(element){for(let current=element;current;current=current.parent)if(current===this)return true;return false}
 addEventListener(type,handler){(this.listeners[type]??=[]).push(handler)}
 focus(){this.focused=true}
}
function harness(){
 const document=new Element('document');document.innerHTML='<body><div id="modal"><div id="modalContent"></div></div><div id="cardHost"></div></body>';
 document.getElementById=id=>document.querySelector('#'+id);
 const events={dialogs:0,closed:0,saved:0,built:0,rendered:0,invalidations:[],toasts:[],failSave:false,failBuild:false};
 const context=vm.createContext({console,window:{},document,events});
 vm.runInContext(app.slice(0,coreEnd),context);
 vm.runInContext(`
 const CORE=globalThis.ARC_CORE;
 const $=id=>document.getElementById(id);
 const dte=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d,12)};
 const iso=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
 let clock='2026-10-18',rawFactor=1.02;
 const today=()=>dte(clock),calendarDayNumber=d=>{const x=d instanceof Date?d:dte(d);return Date.UTC(x.getFullYear(),x.getMonth(),x.getDate())/86400000};
 const addCalendarDays=(value,days)=>{const d=value instanceof Date?new Date(value):dte(value);d.setDate(d.getDate()+days);return d};
 const fmtDate=s=>s,fmtTime=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0'),pace=s=>fmtTime(s)+'/km';
 const parseTime=v=>CORE.strictParseTime(v),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={setup:{planStart:'2026-10-10',testDistance:5,testTime:1800,criticalPower:294,thresholdHr:179,bodyWeight:75},assessments:[],runs:[],plan:[]};
 function pacePowerCommittedFactor(){return rawFactor}
 function showDialog(html){events.dialogs++;$('modalContent').innerHTML=html}
 function closeDialog(){events.closed++}
 function save(){events.saved++;return !events.failSave}
 function buildPlan(){events.built++;return !events.failBuild}
 function renderAll(){events.rendered++}
 function invalidatePageRenderCache(pages){events.invalidations.push(pages)}
 function toast(message,bad=false){events.toasts.push({message,bad})}
 function withPlanLoader(label,work){try{return work()}catch(e){toast(e.message,true)}}
 function ensureAccessibleForms(){}
 `+engine+'\n'+ui+'\n'+initialization,context);
 const evaluate=code=>vm.runInContext(code,context);
 return{document,events,evaluate,form:()=>document.getElementById('calibrationReviewForm'),open:()=>evaluate('openCalibrationReview()'),submit(){this.form().onsubmit({preventDefault(){}})},choose(kind,value){const control=document.getElementById('calibrationAction-'+kind);control.value=value;control.onchange()},set(id,value){document.getElementById(id).value=value},click(button){for(const handler of document.listeners.click||[])handler({target:button,preventDefault(){}})}};
}
let passed=0,failed=0;
function test(name,work){try{work();passed++;console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+'\n'+e.stack)}}
test('Unknown input dates suggest a review without opening a modal',()=>{
 const h=harness(),html=h.evaluate('calibrationReviewCardHtml()');
 assert.match(html,/Weight review suggested/);assert.match(html,/294 W/);assert.match(html,/measurement date not recorded/);assert.equal(h.events.dialogs,0);
 assert.equal(h.evaluate('calibrationUiReviewState().due.length'),1);
 assert.match(h.evaluate("calibrationReviewCardHtml('settings')"),/data-go="assessments">Record a timed assessment/);
});
test('Modal defaults leave all four independent inputs untouched',()=>{
 const h=harness();h.open();assert.equal(h.form().querySelectorAll('[data-calibration-kind]').length,4);
 for(const choice of h.form().querySelectorAll('[data-calibration-choice]'))assert.equal(choice.value,'leave');
 for(const editor of h.form().querySelectorAll('[data-calibration-editor]'))assert.equal(editor.hidden,true);
 h.submit();assert.equal(h.events.saved,0);assert.match(h.document.getElementById('calibrationReviewErrors').innerHTML,/at least one input/);
});
test('A Garmin Race Predictor time is saved explicitly as a prediction, not an actual completed test',()=>{
 const h=harness();h.open();h.choose('pace','update');
 h.set('calibrationPaceDistance','5');h.set('calibrationPaceTime','27:51');
 h.set('calibrationPaceKind','predicted');h.set('calibrationSource-pace','Garmin Race Predictor');
 h.set('calibrationMeasured-pace','2026-10-18');h.submit();
 assert.equal(h.evaluate('state.setup.testTime'),1671);
 assert.equal(h.evaluate("calibrationFor('pace').performanceKind"),'predicted');
 assert.equal(h.evaluate("calibrationFor('pace').source"),'Garmin Race Predictor');
 assert.equal(h.events.built,1);assert.equal(h.events.closed,1);
});
test('A user-attested completed 5 km time is stored as observed, not a device prediction',()=>{
 const h=harness();h.open();h.choose('pace','update');
 h.set('calibrationPaceDistance','5');h.set('calibrationPaceTime','25:15');
 h.set('calibrationPaceKind','observed');h.set('calibrationSource-pace','Actual timed 5 km race');
 h.set('calibrationMeasured-pace','2026-10-18');h.submit();
 assert.equal(h.evaluate("calibrationFor('pace').performanceKind"),'observed');
 assert.equal(h.evaluate('state.setup.testTime'),1515);
});
test('Power-only update records 254 W, its source/date and its own new anchor',()=>{
 const h=harness();h.open();const paceBefore=h.evaluate("calibrationAdjustedFactor('pace')");
 h.choose('power','update');h.set('calibrationValue-power','254');h.set('calibrationSource-power','Stryd current CP');h.set('calibrationMeasured-power','2026-10-17');h.submit();
 assert.equal(h.evaluate('state.setup.criticalPower'),254);assert.equal(h.evaluate('state.setup.testTime'),1800);assert.equal(h.evaluate('state.setup.thresholdHr'),179);assert.equal(h.evaluate('state.setup.bodyWeight'),75);
 assert.equal(h.evaluate("calibrationFor('power').source"),'Stryd current CP');assert.equal(h.evaluate("calibrationFor('power').measuredOn"),'2026-10-17');
 assert.equal(h.evaluate("calibrationAdjustedFactor('power')"),1);assert.equal(h.evaluate("calibrationAdjustedFactor('pace')"),paceBefore);
 assert.equal(Math.round(h.evaluate("calibrationFor('power').value*calibrationAdjustedFactor('power')*.78")),198);
 assert.equal(h.events.built,1);assert.equal(h.events.closed,1);assert(h.events.invalidations[0].includes('plan'));
});
test('An unchanged confirmation preserves source/date/factor and needs no plan rebuild',()=>{
 const h=harness();h.evaluate("applyCalibrationReview({...state.setup,criticalPower:254},{kinds:['power'],measuredOn:{power:'2026-10-15'},sources:{power:'Stryd current CP'},remeasuredKinds:['power']})");
 const anchor=h.evaluate("calibrationFor('power').anchorFactor"),source=h.evaluate("calibrationFor('power').source");
 h.open();h.choose('power','confirm');h.submit();
 assert.equal(h.evaluate("calibrationFor('power').source"),source);assert.equal(h.evaluate("calibrationFor('power').measuredOn"),'2026-10-15');assert.equal(h.evaluate("calibrationFor('power').anchorFactor"),anchor);
 assert.equal(h.events.built,0);assert.equal(h.events.saved,1);assert.equal(h.events.closed,1);
});
test('Confirming an active assessment baseline does not restore stale raw Settings',()=>{
 const h=harness();h.evaluate("state.assessments=[{id:'a1',valid:true,date:'2026-10-12',time:1750,distance:5,criticalPower:280}]");
 h.open();h.choose('power','confirm');h.submit();assert.equal(h.evaluate("calibrationFor('power').value"),280);assert.equal(h.evaluate('state.setup.criticalPower'),280);assert.equal(h.events.built,0);
});
test('Invalid dates, source and values are rejected before any write',()=>{
 for(const [field,value,pattern]of[['calibrationMeasured-power','2026-10-19',/date on or before today/],['calibrationSource-power','',/source/],['calibrationValue-power','0',/between 50 and 1500/]]){
  const h=harness();h.open();h.choose('power','update');h.set('calibrationSource-power','Stryd current CP');h.set(field,value);h.submit();
  assert.equal(h.events.saved,0);assert.equal(h.events.built,0);assert.equal(h.evaluate('state.setup.criticalPower'),294);assert.match(h.document.getElementById('calibrationReviewErrors').innerHTML,pattern);
 }
});
test('Malformed benchmark time and fractional threshold HR are rejected',()=>{
 const h=harness();h.open();h.choose('pace','update');h.set('calibrationSource-pace','Timed benchmark');h.set('calibrationPaceTime','30:99');h.choose('hr','update');h.set('calibrationSource-hr','Threshold assessment');h.set('calibrationValue-hr','179.5');h.submit();
 assert.equal(h.events.saved,0);assert.match(h.document.getElementById('calibrationReviewErrors').innerHTML,/valid benchmark time/);assert.match(h.document.getElementById('calibrationReviewErrors').innerHTML,/whole bpm/);
});
test('Only measured body weight needs 14-day manual reminder; fitness estimates are automatic',()=>{
 const h=harness();h.evaluate("recordCalibrationReview(['pace','power','hr','weight'])");
 h.evaluate("clock='2026-11-01'");assert.equal(h.evaluate('calibrationUiReviewState().due.map(row=>row.kind).join()'),'weight');
 h.evaluate("clock='2026-11-15'");assert.equal(h.evaluate('calibrationUiReviewState().due.length'),1);
});
test('Startup delegation survives new buttons and a reminder lasts seven calendar days across DST',()=>{
 const h=harness();h.evaluate("clock='2026-10-23';bindCalibrationControls(document);bindCalibrationControls(document)");
 assert.equal(h.document.listeners.click.length,1);
 const host=h.document.getElementById('cardHost');host.innerHTML=h.evaluate("calibrationReviewCardHtml('settings')");h.click(host.querySelector('[data-calibration-action="review"]'));
 assert.equal(h.events.dialogs,1);
 host.innerHTML=h.evaluate("calibrationReviewCardHtml('settings')");h.click(host.querySelector('[data-calibration-action="review"]'));assert.equal(h.events.dialogs,2);
 h.click(h.form().querySelector('[data-calibration-action="defer"]'));
 assert.equal(h.evaluate('state.calibration.deferredUntil'),'2026-10-30');assert.equal(h.evaluate('calibrationReviewCardHtml()'),'');assert.match(h.evaluate("calibrationReviewCardHtml('settings')"),/Reminder/);
 h.evaluate("clock='2026-10-30'");assert.match(h.evaluate('calibrationReviewCardHtml()'),/Weight review suggested/);
});
test('False save returns never report a successful confirmation or reminder',()=>{
 const h=harness();h.open();h.choose('power','confirm');h.events.failSave=true;h.submit();
 assert.equal(h.events.closed,0);assert.equal(h.events.toasts.some(t=>!t.bad),false);assert.match(h.document.getElementById('calibrationReviewErrors').innerHTML,/could not be saved/);
 const r=harness();r.evaluate('bindCalibrationControls(document)');r.open();r.events.failSave=true;r.click(r.form().querySelector('[data-calibration-action="defer"]'));
 assert.equal(r.evaluate('state.calibration.deferredUntil'),null);assert.equal(r.events.closed,0);assert(r.events.toasts.at(-1).bad);
});
test('A failed rebuilt-plan save leaves the modal open and the submit control usable',()=>{
 const h=harness();h.open();h.choose('power','update');h.set('calibrationValue-power','254');h.set('calibrationSource-power','Stryd current CP');h.events.failBuild=true;h.submit();
 assert.equal(h.events.closed,0);assert.equal(h.form().querySelector('[type="submit"]').disabled,false);assert(h.events.toasts.at(-1).bad);
});
test('Workout explanation uses the saved raw CP, percentage, factor and measured source',()=>{
 const h=harness();h.evaluate("ensureCalibrationState();var p={type:'Long run',targetScope:'Controlled endurance section',zone:{pace:491,power:229,hr:150,calibration:{version:1,pace:{...calibrationFor('pace')},power:{...calibrationFor('power')},hr:{...calibrationFor('hr')},paceFactor:1,powerFactor:1,multipliers:{pace:1.30,power:.78,hr:.84}}}};");
 const html=h.evaluate('calibrationTargetDetailsHtml(p)');assert.match(html,/294 W CP × 78% × 1\.000/);assert.match(html,/229 W/);assert.match(html,/Legacy setup/);assert.match(html,/controlled endurance section/);
 h.evaluate('state.setup.criticalPower=254');assert.match(h.evaluate('calibrationTargetDetailsHtml(p)'),/294 W CP/);
});
test('Older workouts explicitly disclose absent provenance and input sources are escaped',()=>{
 const h=harness();const html=h.evaluate("calibrationTargetDetailsHtml({type:'Long run',zone:{pace:491,power:229,hr:150}})");assert.match(html,/original input sources were not saved/);assert.doesNotMatch(html,/294 W CP/);
 h.evaluate("ensureCalibrationState().records.find(r=>r.kind==='power').source='<img src=x onerror=alert(1)>'");assert.doesNotMatch(h.evaluate("calibrationReviewCardHtml('settings')"),/<img/);assert.match(h.evaluate("calibrationReviewCardHtml('settings')"),/&lt;img/);
});
test('Mobile CSS cancels inherited Today columns, limits form width and stacks fields',()=>{
 assert.match(css,/#today\s+\.calibrationReviewCard\s*\{\s*display:block/);
 assert.match(css,/@media\(max-width:480px\)\{\.calibrationInputCard \.formGrid\{grid-template-columns:1fr/);
 assert.match(css,/\.calibrationInputCard input,\.calibrationInputCard select\{[^}]*min-width:0[^}]*min-height:46px/);
 assert.match(css,/\.calibrationInputCard \[hidden\]\{display:none!important/);
 assert.match(ui,/Stryd’s configured mass is a separate device setting/);
});
console.log(`Calibration UI regression result: ${passed}/${passed+failed} passed`);
process.exitCode=failed?1:0;
