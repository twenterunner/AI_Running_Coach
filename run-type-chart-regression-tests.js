/* v15.8.5: independent, isolated chart style regression checks (no data writes). */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/app.js','utf8');
const css=fs.readFileSync(__dirname+'/styles.css','utf8');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const start=src.indexOf('const metricRunTypes=');
const end=src.indexOf('function typeMetricSummary(',start);
assert(start!==-1&&end>start);
const defs=src.slice(start,end);
const autoStart=src.indexOf('function progressAutoScale('),autoEnd=src.indexOf('function progressSvgIntoMount(',autoStart);
const renderEnd=src.indexOf('function renderProgressChartsStandalone(',autoEnd);
assert(autoStart>0&&autoEnd>autoStart&&renderEnd>autoEnd);
const chartDefs=src.slice(autoStart,autoEnd)+src.slice(autoEnd,renderEnd);
const mount={innerHTML:'',attrs:{},setAttribute(k,v){this.attrs[k]=v}};
const errors=[];
const ctx={
 $:()=>mount,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 recordDiagnostic:(...args)=>errors.push(args),
};
vm.runInNewContext(defs+chartDefs+`globalThis.visuals={metricRunTypes,runTypeColors,runTypeMarkers,metricSeries,runTypeMarkerSvg,runTypeLegendGlyph,progressSvgIntoMount};`,ctx);
const v=ctx.visuals;
function test(name,fn){try{fn();console.log('PASS',name)}catch(e){console.error('FAIL',name,e.stack);process.exitCode=1}}
const expected={'Easy':['#45CDF5','circle'],'Easy + strides':['#EF86FA','diamond'],'Long run':['#8BE77C','square'],'Hills':['#FFBD4B','triangle']};
test('Each recognized run type has a valid visible colour and marker',()=>{
 assert.equal(v.metricRunTypes.length,18);
 for(const type of v.metricRunTypes){assert.match(v.runTypeColors[type],/^#[0-9A-Fa-f]{6}$/);assert(v.runTypeMarkers[type]);assert.match(v.runTypeMarkerSvg(v.runTypeMarkers[type],14,10,v.runTypeColors[type]),/^<(?:circle|rect|polygon|path)\b/)}
});
test('All 18 main plot run types have distinguishable (non-identical) colors',()=>{
 const used=v.metricRunTypes.map(type=>v.runTypeColors[type].toUpperCase());assert.equal(new Set(used).size,used.length);
});
test('Screenshot categories have four distinct colours and four marker shapes',()=>{
 for(const [type,style] of Object.entries(expected))assert.deepEqual([v.runTypeColors[type],v.runTypeMarkers[type]],style);
 assert.equal(new Set(Object.values(expected).map(x=>x[0])).size,4);
 assert.equal(new Set(Object.values(expected).map(x=>x[1])).size,4);
});
test('Two metrics reuse one stable run-type encoding and preserve data',()=>{
 const runs=Object.keys(expected).map((type,i)=>({type,eff:80+i,drift:8-i}));
 const series1=v.metricSeries(runs,r=>r.eff);
 const series2=v.metricSeries(runs,r=>r.drift);
 assert.equal(series1.length,4);assert.equal(series2.length,4);
 for(let i=0;i<4;i++){
  assert.equal(series1[i].label,series2[i].label);
  assert.equal(series1[i].color,series2[i].color);
  assert.equal(series1[i].marker,series2[i].marker);
  assert.equal(series1[i].data.filter(Number.isFinite).length,1);
  assert.equal(series2[i].data.filter(Number.isFinite).length,1);
 }
});
test('The live chart includes matching symbols in legend and individual points',()=>{
 const runs=Object.keys(expected).map((type,i)=>({type,value:i+1}));
 v.progressSvgIntoMount('test',v.metricSeries(runs,r=>r.value),{labels:['1','2','3','4'],ticks:5,aria:'Test efficiency chart'});
 assert.equal(errors.length,0);
 assert.equal(mount.attrs['aria-hidden'],'false');
 const markup=mount.innerHTML;
 for(const [type,[color]] of Object.entries(expected)){assert(markup.includes(type));assert(markup.includes(color));}
 assert.equal((markup.match(/class="runTypeLegendGlyph"/g)||[]).length,4);
 assert((markup.match(/<polygon /g)||[]).length>=4); // diamond and triangle, each repeated in legend and plot
 assert((markup.match(/<rect /g)||[]).length>=2);
 assert((markup.match(/<circle /g)||[]).length>=2);
 assert(markup.includes('role="img"'));
});
test('The legacy SVG renderer and comparable card reuse symbols too',()=>{
 const legacy=src.slice(src.indexOf('function renderProgressSvgChart('),src.indexOf('function programmePauseBaselineType('));
 assert(legacy.includes('runTypeMarkerSvg(s.marker'));
 assert(legacy.includes('runTypeLegendGlyph(s)'));
 assert(src.includes('runTypeLegendGlyph({color:runTypeColors[x.type],marker:runTypeMarkers[x.type]})'));
 assert(css.includes('.progressChartLegend .runTypeLegendGlyph'));
});
test('No schema change or accidental save/plan edit in marker helper',()=>{
 assert(src.includes('const BUILD = 51850;'));
 assert(src.includes('SCHEMA = 10400'));
 assert(html.includes('v15.8.5 · build 51850'));
 assert(!/\b(?:state\.|save\(|localStorage|indexedDB|recalibrate)/.test(defs));
});
if(process.exitCode)process.exit(process.exitCode);
console.log('RUN-TYPE CHART MARKERS: 7 / 7 passed');
