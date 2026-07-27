(function(){
'use strict';

var DAY = 86400000;
var pages = [
  ['dashboard','Dashboard'],['today','Today'],['plan','Plan'],['import','Import'],
  ['runs','Run log'],['coach','Coach'],['settings','Settings']
];
var importedRun = null;
var deferredInstall = null;

function byId(id){ return document.getElementById(id); }
function numberOrNull(v){ var n=Number(v); return isFinite(n)?n:null; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function sum(arr){ return arr.reduce(function(a,b){ return a+(isFinite(b)?b:0); },0); }
function average(arr){ var valid=arr.filter(function(x){return isFinite(x);}); return valid.length?sum(valid)/valid.length:null; }
function isoDate(d){ return new Date(d).toISOString().slice(0,10); }
function dateFromIso(s){ return new Date(s+'T00:00:00'); }
function today(){ return dateFromIso(isoDate(new Date())); }
function escapeHtml(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function formatDuration(sec){
  if(!isFinite(sec)) return '—';
  var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.round(sec%60);
  if(s===60){s=0;m++;} if(m===60){m=0;h++;}
  return h? h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0') : m+':'+String(s).padStart(2,'0');
}
function parseDuration(text){
  if(!text) return null;
  var parts=String(text).trim().split(':').map(Number);
  if(parts.some(function(x){return !isFinite(x);})){return null;}
  return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts[0]*60+parts[1];
}
function formatPace(sec){
  if(!isFinite(sec)) return '—';
  var m=Math.floor(sec/60),s=Math.round(sec%60);
  if(s===60){m++;s=0;}
  return m+':'+String(s).padStart(2,'0')+'/km';
}
function showMessage(text,type){
  var el=byId('message'); el.textContent=text; el.className='message '+(type||'ok');
  setTimeout(function(){el.className='message hidden';},4500);
}
function defaultState(){
  return {
    setup:{
      raceName:'Veluwe Trail Marathon',raceDate:'2026-09-05',raceDistance:42.195,targetTime:15300,
      planStart:'2026-06-26',bodyWeight:93,currentWeeklyKm:35,currentLongestKm:18,
      fiveKmTime:1515,thresholdHr:168,criticalPower:300,maxWeeklyKm:70,peakLongRunKm:35,
      growthRate:0.08,taperDays:21
    },
    runs:[], plan:[], weekView:null
  };
}
var state;
try{ state=JSON.parse(localStorage.getItem('arc_pwa_state')); }catch(e){ state=null; }
if(!state){ state=defaultState(); }

function saveState(){ localStorage.setItem('arc_pwa_state',JSON.stringify(state)); }

function weeksTotal(){
  return Math.max(1,Math.ceil((dateFromIso(state.setup.raceDate)-dateFromIso(state.setup.planStart))/(7*DAY)));
}
function weekStart(week){
  return new Date(dateFromIso(state.setup.planStart).getTime()+(week-1)*7*DAY);
}
function currentWeek(){
  return clamp(Math.floor((today()-dateFromIso(state.setup.planStart))/(7*DAY))+1,1,weeksTotal());
}
function phaseFor(week){
  var total=weeksTotal(), taper=Math.ceil(state.setup.taperDays/7);
  if(week>total-taper){return 'Taper';}
  if(week>total-taper-3){return 'Peak';}
  if(week<=2){return 'Base';}
  return 'Build';
}
function paceTarget(type){
  var p=state.setup.fiveKmTime/5;
  if(type==='Intervals')return p*0.98;
  if(type==='Tempo')return p*1.08;
  if(type==='Long run')return p*1.30;
  if(type==='Recovery')return p*1.42;
  return p*1.30;
}
function hrTarget(type){
  var hr=state.setup.thresholdHr;
  if(type==='Intervals')return hr*1.04;
  if(type==='Tempo')return hr;
  if(type==='Long run')return hr*0.84;
  return hr*0.84;
}
function powerTarget(type){
  var cp=state.setup.criticalPower;
  if(type==='Intervals')return cp*1.05;
  if(type==='Tempo')return cp*0.95;
  if(type==='Long run')return cp*0.78;
  return cp*0.78;
}
function buildPlan(){
  var days=[
    ['Monday','Rest'],['Tuesday','Intervals'],['Wednesday','Easy'],['Thursday','Rest'],
    ['Friday','Tempo'],['Saturday','Easy'],['Sunday','Long run']
  ];
  var total=weeksTotal(), plan=[];
  for(var w=1;w<=total;w++){
    var phase=phaseFor(w);
    var volume=Math.min(state.setup.maxWeeklyKm,state.setup.currentWeeklyKm*Math.pow(1+state.setup.growthRate,w-1));
    if(w%4===0 && phase==='Build')volume*=0.90;
    if(phase==='Taper'){
      var remaining=total-w;
      volume*=remaining===0?0.45:(remaining===1?0.62:0.78);
    }
    var progression=Math.min(1,(w-1)/Math.max(1,total-Math.ceil(state.setup.taperDays/7)-2));
    var longKm=state.setup.currentLongestKm+(state.setup.peakLongRunKm-state.setup.currentLongestKm)*progression;
    if(w%4===0 && phase==='Build')longKm*=0.85;
    if(phase==='Taper'){ longKm=Math.min(longKm,(total-w===0?12:(total-w===1?18:24))); }
    var balance=Math.max(0,volume-longKm);
    var shares={'Intervals':0.25,'Tempo':0.28,'Easy':0.235};
    days.forEach(function(item,idx){
      var date=new Date(weekStart(w).getTime()+idx*DAY);
      var type=item[1], km=0;
      if(type==='Long run')km=longKm;
      else if(type==='Intervals')km=balance*shares.Intervals;
      else if(type==='Tempo')km=balance*shares.Tempo;
      else if(type==='Easy')km=balance*shares.Easy;
      plan.push({
        id:'p-'+w+'-'+idx,week:w,date:isoDate(date),day:item[0],type:type,
        distanceKm:Math.round(km*10)/10,pace:paceTarget(type),hr:hrTarget(type),
        power:powerTarget(type),phase:phase
      });
    });
  }
  state.plan=plan; saveState();
}
if(!state.plan || !state.plan.length){buildPlan();}

function weekSummaries(){
  var out=[];
  for(var w=1;w<=weeksTotal();w++){
    var start=weekStart(w),end=new Date(start.getTime()+7*DAY);
    var planned=state.plan.filter(function(p){return p.week===w && p.type!=='Rest';});
    var runs=state.runs.filter(function(r){var d=dateFromIso(r.date);return d>=start&&d<end;});
    out.push({
      week:w,start:isoDate(start),phase:phaseFor(w),
      planned:sum(planned.map(function(p){return p.distanceKm;})),
      actual:sum(runs.map(function(r){return r.distanceKm;})),
      longRun:Math.max.apply(Math,[0].concat(planned.filter(function(p){return p.type==='Long run';}).map(function(p){return p.distanceKm;})))
    });
  }
  return out;
}
function confidence(){
  var recent=state.runs.filter(function(r){return today()-dateFromIso(r.date)<=28*DAY;});
  var opportunities=state.plan.filter(function(p){
    var d=dateFromIso(p.date);return p.type!=='Rest'&&d<=today()&&today()-d<=28*DAY;
  });
  var dueKm=sum(opportunities.map(function(p){return p.distanceKm;}));
  var actual=sum(recent.map(function(r){return r.distanceKm;}));
  var consistency=opportunities.length?clamp(recent.length/opportunities.length*100,0,100):50;
  var adherence=dueKm?clamp(actual/dueKm*100,0,100):50;
  var longest=Math.max.apply(Math,[state.setup.currentLongestKm].concat(state.runs.map(function(r){return r.distanceKm;})));
  var endurance=clamp(longest/state.setup.peakLongRunKm*100,0,100);
  var marathonPrediction=state.setup.fiveKmTime*Math.pow(state.setup.raceDistance/5,1.06);
  var fitness=clamp(100-(marathonPrediction/state.setup.targetTime-1)*320,0,100);
  var rec=average(recent.map(function(r){return r.recovery;}));
  var pain=average(recent.map(function(r){return r.pain;}));
  var recovery=isFinite(rec)?clamp(rec/5*70+(10-(pain||0))/10*30,0,100):50;
  var components=[['Fitness',fitness,0.30],['Endurance',endurance,0.25],['Consistency',consistency,0.20],['Adherence',adherence,0.15],['Recovery',recovery,0.10]];
  return {components:components,overall:sum(components.map(function(c){return c[1]*c[2];}))};
}
function predictedTime(){
  var c=confidence();
  var base=state.setup.fiveKmTime*Math.pow(state.setup.raceDistance/5,1.06);
  var adjustment=1+(70-c.overall)/500;
  return base*clamp(adjustment,0.94,1.12);
}
function card(label,value,sub){
  return '<div class="card"><small>'+escapeHtml(label)+'</small><strong>'+escapeHtml(value)+'</strong>'+(sub?'<span>'+escapeHtml(sub)+'</span>':'')+'</div>';
}
function initTabs(){
  byId('tabs').innerHTML=pages.map(function(p,i){return '<button data-page="'+p[0]+'" class="'+(i===0?'active':'')+'">'+p[1]+'</button>';}).join('');
  byId('tabs').addEventListener('click',function(e){
    var page=e.target.getAttribute('data-page'); if(!page)return;
    Array.prototype.forEach.call(document.querySelectorAll('#tabs button'),function(b){b.classList.toggle('active',b.getAttribute('data-page')===page);});
    Array.prototype.forEach.call(document.querySelectorAll('.page'),function(s){s.classList.toggle('active',s.id===page);});
    renderAll(); window.scrollTo(0,0);
  });
}
function renderDashboard(){
  var c=confidence(),ws=weekSummaries(),cw=currentWeek(),w=ws[cw-1],pred=predictedTime();
  byId('dashboardCards').innerHTML=
    card('Race date',new Date(state.setup.raceDate).toLocaleDateString())+
    card('Weeks to race',String(Math.max(0,weeksTotal()-cw+1)))+
    card('Target time',formatDuration(state.setup.targetTime))+
    card('Predicted time',formatDuration(pred))+
    card('Confidence',Math.round(c.overall)+'%')+
    card('Current week',w.planned.toFixed(1)+' km')+
    card('Peak long run',state.setup.peakLongRunKm.toFixed(1)+' km')+
    card('Body weight',state.setup.bodyWeight.toFixed(1)+' kg');
  byId('currentStatus').innerHTML='<p><b>'+escapeHtml(state.setup.raceName)+'</b> · '+state.setup.raceDistance.toFixed(1)+' km</p>'+
    '<p>Current phase: <b>'+w.phase+'</b></p><p>This week: '+w.actual.toFixed(1)+' of '+w.planned.toFixed(1)+' km completed.</p>';
  byId('confidenceList').innerHTML=c.components.map(function(x){
    return '<div class="progress"><b style="width:90px">'+x[0]+'</b><div class="bar"><i style="width:'+x[1]+'%"></i></div><span>'+Math.round(x[1])+'</span></div>';
  }).join('');
  drawChart(ws);
}
function drawChart(data){
  var canvas=byId('weeklyChart'),ctx=canvas.getContext('2d'),pad=42;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  var max=Math.max.apply(Math,[10].concat(data.map(function(x){return Math.max(x.planned,x.actual);})));
  ctx.strokeStyle='#d8e0ea';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad,15);ctx.lineTo(pad,canvas.height-pad);ctx.lineTo(canvas.width-15,canvas.height-pad);ctx.stroke();
  function line(key,color){
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();
    data.forEach(function(d,i){
      var x=pad+i*(canvas.width-pad-20)/Math.max(1,data.length-1);
      var y=canvas.height-pad-d[key]/max*(canvas.height-pad-25);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });ctx.stroke();
  }
  line('planned','#2f75b5');line('actual','#2b8c8c');
}
function renderToday(){
  var p=state.plan.find(function(x){return x.date===isoDate(today());});
  if(!p){byId('todayWorkout').innerHTML='<h3>No workout found</h3>';return;}
  byId('todayWorkout').innerHTML='<h3>'+p.type+'</h3><p><b>'+p.distanceKm.toFixed(1)+' km</b></p>'+
    (p.type==='Rest'?'<p>Rest, walking or mobility.</p>':'<p>Target pace: '+formatPace(p.pace)+' · HR '+Math.round(p.hr)+' · '+Math.round(p.power)+' W</p>');
  var future=state.plan.filter(function(x){return x.type!=='Rest'&&dateFromIso(x.date)>=today();}).slice(0,4);
  byId('nextKeySessions').innerHTML=future.map(function(x){return '<p><b>'+new Date(x.date).toLocaleDateString()+' · '+x.type+'</b><br>'+x.distanceKm.toFixed(1)+' km at '+formatPace(x.pace)+'</p>';}).join('');
}
function renderPlan(){
  if(state.weekView==null)state.weekView=currentWeek();
  var rows=state.plan.filter(function(p){return p.week===state.weekView;});
  byId('weekSummary').innerHTML='<b>Week '+state.weekView+'</b> · '+new Date(weekStart(state.weekView)).toLocaleDateString()+' · '+phaseFor(state.weekView)+' · '+sum(rows.map(function(r){return r.distanceKm;})).toFixed(1)+' km';
  byId('planRows').innerHTML=rows.map(function(p){
    var completed=state.runs.some(function(r){return r.planId===p.id;});
    return '<tr><td>'+new Date(p.date).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})+'</td><td>'+p.type+'</td><td>'+(p.type==='Rest'?'—':p.distanceKm.toFixed(1))+'</td><td>'+(p.type==='Rest'?'—':formatPace(p.pace))+'</td><td>'+(p.type==='Rest'?'—':Math.round(p.hr))+'</td><td>'+(p.type==='Rest'?'—':Math.round(p.power))+'</td><td>'+(completed?'Completed':(dateFromIso(p.date)<today()&&p.type!=='Rest'?'Due':'Planned'))+'</td></tr>';
  }).join('');
}
function parseCSV(text){
  var rows=[],row=[],field='',quoted=false,i,c,n;
  for(i=0;i<text.length;i++){c=text[i];n=text[i+1];
    if(c==='"'&&quoted&&n==='"'){field+='"';i++;}
    else if(c==='"'){quoted=!quoted;}
    else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(field);field='';if(row.some(function(v){return v!=='';}))rows.push(row);row=[];}
    else field+=c;
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows;
}
function positiveAverage(values){return average(values.map(Number).filter(function(v){return isFinite(v)&&v>0;}));}
function summarizeCSV(rows){
  var headers=rows[0].map(function(x){return x.trim();});
  function idx(name){return headers.indexOf(name);}
  var required=['Timestamp','Power (w/kg)','Watch Distance (meters)','Heart Rate (bpm)','Cadence (spm)'];
  var missing=required.filter(function(n){return idx(n)<0;});
  if(missing.length)throw new Error('Missing columns: '+missing.join(', '));
  var data=rows.slice(1).filter(function(r){return r.length>1;});
  function col(name){var k=idx(name);return data.map(function(r){return r[k];});}
  var ts=col('Timestamp').map(Number).filter(isFinite),start=Math.min.apply(Math,ts),end=Math.max.apply(Math,ts);
  var dist=Math.max.apply(Math,col('Watch Distance (meters)').map(Number).filter(isFinite))/1000;
  var wkg=positiveAverage(col('Power (w/kg)'));
  return {
    id:'stryd-'+start+'-'+Math.round(dist*1000),date:isoDate(new Date(start*1000)),distanceKm:dist,durationSec:end-start,
    avgHr:positiveAverage(col('Heart Rate (bpm)')),avgPowerW:wkg*state.setup.bodyWeight,
    avgPowerWkg:wkg,cadence:positiveAverage(col('Cadence (spm)')),
    gct:idx('Ground Time (ms)')>=0?positiveAverage(col('Ground Time (ms)')):null,
    vo:idx('Vertical Oscillation (cm)')>=0?positiveAverage(col('Vertical Oscillation (cm)')):null
  };
}
function renderImport(){
  var types=['Easy','Recovery','Long run','Tempo','Intervals','Race','Other'];
  byId('runType').innerHTML=types.map(function(x){return '<option>'+x+'</option>';}).join('');
  if(!importedRun)return;
  byId('importArea').classList.remove('hidden');
  byId('importCards').innerHTML=
    card('Distance',importedRun.distanceKm.toFixed(2)+' km')+
    card('Duration',formatDuration(importedRun.durationSec))+
    card('Pace',formatPace(importedRun.durationSec/importedRun.distanceKm))+
    card('Average HR',Math.round(importedRun.avgHr)+' bpm')+
    card('Power',Math.round(importedRun.avgPowerW)+' W')+
    card('Cadence',Math.round(importedRun.cadence)+' spm');
  var candidates=state.plan.filter(function(p){return p.type!=='Rest'&&Math.abs(dateFromIso(p.date)-dateFromIso(importedRun.date))<=2*DAY;});
  byId('planMatch').innerHTML='<option value="">Do not match</option>'+candidates.map(function(p){return '<option value="'+p.id+'">'+p.date+' · '+p.type+' · '+p.distanceKm.toFixed(1)+' km</option>';}).join('');
}
function renderRuns(){
  var rows=state.runs.slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  byId('runRows').innerHTML=rows.length?rows.map(function(r){return '<tr><td>'+new Date(r.date).toLocaleDateString()+'</td><td>'+escapeHtml(r.type)+'</td><td>'+r.distanceKm.toFixed(2)+' km</td><td>'+formatDuration(r.durationSec)+'</td><td>'+formatPace(r.durationSec/r.distanceKm)+'</td><td>'+(r.avgHr?Math.round(r.avgHr):'—')+'</td><td>'+(r.avgPowerW?Math.round(r.avgPowerW):'—')+'</td><td>'+(r.rpe||'—')+'</td><td><button class="danger" data-delete-run="'+r.id+'">Delete</button></td></tr>';}).join(''):'<tr><td colspan="9">No runs saved yet.</td></tr>';
}
function renderCoach(){
  var c=confidence(),pred=predictedTime(),gap=pred-state.setup.targetTime;
  byId('coachCards').innerHTML=card('Confidence',Math.round(c.overall)+'%')+card('Prediction',formatDuration(pred))+card('Target gap',(gap>=0?'+':'−')+formatDuration(Math.abs(gap)))+card('Current phase',phaseFor(currentWeek()));
  byId('coachAssessment').innerHTML='<p>'+(c.overall>=75?'The target is well supported by the available evidence.':c.overall>=55?'The target remains plausible, but key foundations still need improvement.':'The target is not yet strongly supported. Focus on consistency, endurance and recovery before adding extra intensity.')+'</p>';
  var sorted=c.components.slice().sort(function(a,b){return a[1]-b[1];}).slice(0,3);
  var advice={Fitness:'Complete a valid 5 km assessment and update your baseline.',Endurance:'Build the long run gradually and practise fuelling.',Consistency:'Protect the five core weekly sessions.',Adherence:'Avoid cramming missed kilometres; resume the plan.',Recovery:'Reduce load when pain rises or recovery falls.'};
  byId('coachPriorities').innerHTML=sorted.map(function(x,i){return '<div class="priority"><b>'+(i+1)+'. '+x[0]+'</b><br>'+advice[x[0]]+'</div>';}).join('');
}
function renderSettings(){
  var defs=[
    ['raceName','Race name','text'],['raceDate','Race date','date'],['raceDistance','Race distance km','number'],
    ['targetTime','Target time','duration'],['planStart','Plan start','date'],['bodyWeight','Body weight kg','number'],
    ['currentWeeklyKm','Current weekly km','number'],['currentLongestKm','Current longest run km','number'],
    ['fiveKmTime','5 km test time','duration'],['thresholdHr','Threshold HR','number'],['criticalPower','Critical power W','number'],
    ['maxWeeklyKm','Max weekly km','number'],['peakLongRunKm','Peak long run km','number'],['growthRate','Weekly growth %','percent'],
    ['taperDays','Taper days','number']
  ];
  byId('settingsFields').innerHTML=defs.map(function(d){
    var val=state.setup[d[0]];
    if(d[2]==='duration')val=formatDuration(val);
    if(d[2]==='percent')val=Math.round(val*100);
    return '<div><label>'+d[1]+'</label><input data-setting="'+d[0]+'" data-type="'+d[2]+'" type="'+(d[2]==='date'?'date':'text')+'" value="'+escapeHtml(val)+'"></div>';
  }).join('');
}
function renderAll(){renderDashboard();renderToday();renderPlan();renderImport();renderRuns();renderCoach();renderSettings();}

byId('previousWeek').onclick=function(){state.weekView=clamp((state.weekView||currentWeek())-1,1,weeksTotal());renderPlan();};
byId('nextWeek').onclick=function(){state.weekView=clamp((state.weekView||currentWeek())+1,1,weeksTotal());renderPlan();};
byId('currentWeek').onclick=function(){state.weekView=currentWeek();renderPlan();};

byId('csvInput').addEventListener('change',function(e){
  var file=e.target.files[0]; if(!file)return;
  byId('selectedFile').textContent=file.name;
  file.text().then(function(text){importedRun=summarizeCSV(parseCSV(text));renderImport();showMessage('CSV read successfully.','ok');}).catch(function(err){showMessage(err.message,'bad');});
});
byId('saveImported').onclick=function(){
  if(!importedRun)return;
  if(state.runs.some(function(r){return r.id===importedRun.id;})){showMessage('This run was already imported.','bad');return;}
  importedRun.type=byId('runType').value; importedRun.planId=byId('planMatch').value||null;
  importedRun.rpe=numberOrNull(byId('rpe').value); importedRun.pain=numberOrNull(byId('pain').value);
  importedRun.recovery=numberOrNull(byId('recovery').value); importedRun.temperature=numberOrNull(byId('temperature').value);
  importedRun.notes=byId('runNotes').value;
  state.runs.push(importedRun); importedRun=null; byId('importArea').classList.add('hidden'); saveState(); renderAll(); showMessage('Run saved.','ok');
};
byId('runRows').addEventListener('click',function(e){
  var id=e.target.getAttribute('data-delete-run'); if(!id)return;
  state.runs=state.runs.filter(function(r){return r.id!==id;});saveState();renderAll();showMessage('Run deleted.','ok');
});
byId('manualButton').onclick=function(){
  var box=byId('manualForm');box.classList.toggle('hidden');
  box.innerHTML='<h3>Add run manually</h3><div class="formGrid"><div><label>Date</label><input id="mDate" type="date" value="'+isoDate(today())+'"></div><div><label>Type</label><select id="mType"><option>Easy</option><option>Recovery</option><option>Long run</option><option>Tempo</option><option>Intervals</option><option>Race</option></select></div><div><label>Distance km</label><input id="mDistance" type="number" step="0.01"></div><div><label>Duration</label><input id="mDuration" placeholder="51:35"></div><div><label>Average HR</label><input id="mHr" type="number"></div><div><label>Average power W</label><input id="mPower" type="number"></div><div><label>RPE</label><input id="mRpe" type="number"></div><div><label>Pain</label><input id="mPain" type="number"></div><div><label>Recovery</label><input id="mRecovery" type="number"></div></div><button id="saveManual" class="primary full">Save run</button>';
  byId('saveManual').onclick=function(){
    var km=Number(byId('mDistance').value),seconds=parseDuration(byId('mDuration').value);
    if(!km||!seconds){showMessage('Enter a valid distance and duration.','bad');return;}
    state.runs.push({id:'manual-'+Date.now(),date:byId('mDate').value,type:byId('mType').value,distanceKm:km,durationSec:seconds,avgHr:numberOrNull(byId('mHr').value),avgPowerW:numberOrNull(byId('mPower').value),rpe:numberOrNull(byId('mRpe').value),pain:numberOrNull(byId('mPain').value),recovery:numberOrNull(byId('mRecovery').value)});
    saveState();box.classList.add('hidden');renderAll();showMessage('Run saved.','ok');
  };
};
function download(name,text,type){
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type}));a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
}
byId('exportRuns').onclick=function(){
  var header=['Date','Type','Distance km','Duration sec','Average HR','Average power W','RPE','Pain','Recovery','Notes'];
  var rows=state.runs.map(function(r){return [r.date,r.type,r.distanceKm,r.durationSec,r.avgHr,r.avgPowerW,r.rpe,r.pain,r.recovery,r.notes];});
  var csv=[header].concat(rows).map(function(row){return row.map(function(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  download('adaptive-running-coach-runs.csv',csv,'text/csv');
};
byId('saveSettings').onclick=function(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-setting]'),function(el){
    var key=el.getAttribute('data-setting'),type=el.getAttribute('data-type'),v=el.value;
    if(type==='number')v=Number(v); if(type==='duration')v=parseDuration(v); if(type==='percent')v=Number(v)/100;
    state.setup[key]=v;
  });
  buildPlan();state.weekView=currentWeek();renderAll();showMessage('Settings saved and plan rebuilt.','ok');
};
byId('downloadBackup').onclick=function(){download('adaptive-running-coach-backup.json',JSON.stringify(state,null,2),'application/json');};
byId('restoreInput').addEventListener('change',function(e){
  var file=e.target.files[0];if(!file)return;
  file.text().then(function(text){var restored=JSON.parse(text);if(!restored.setup||!Array.isArray(restored.runs))throw new Error('Invalid backup');state=restored;saveState();buildPlan();renderAll();showMessage('Backup restored.','ok');}).catch(function(err){showMessage(err.message,'bad');});
});
byId('resetButton').onclick=function(){if(confirm('Delete all app data?')){state=defaultState();buildPlan();renderAll();showMessage('App reset.','ok');}};

window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e;byId('installButton').classList.remove('hidden');});
byId('installButton').onclick=function(){if(!deferredInstall)return;deferredInstall.prompt();deferredInstall.userChoice.then(function(){deferredInstall=null;byId('installButton').classList.add('hidden');});};
if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){navigator.serviceWorker.register('service-worker.js');}

initTabs();renderAll();
})();