const fs=require('fs');
const src=fs.readFileSync('app.js','utf8');
const idx=fs.readFileSync('index.html','utf8');
let pass=0, fail=0;
function test(name, cond){ if(cond){console.log('PASS',name);pass++;} else {console.error('FAIL',name);fail++;} }
const renderProgress=(src.match(/function renderProgress\(\)[\s\S]*?\n}\nfunction /)||[''])[0];
const renderPlan=(src.match(/function renderPlan\(\)[\s\S]*?\n}\nfunction /)||[''])[0];
test('Plan contains the single raceTimeline mount', (idx.match(/id="raceTimeline"/g)||[]).length===1);
test('renderPlan owns and writes raceTimeline', /\$\('raceTimeline'\)\.innerHTML=planTimelineHtml\(w\)/.test(renderPlan));
test('renderProgress does not write raceTimeline', !/\$\('raceTimeline'\)\.innerHTML/.test(renderProgress));
test('proportional Plan timeline renderer remains present', /function planTimelineHtml\(/.test(src) && /proportionalPhaseRail/.test(src));
test('phase timeline still includes current-week marker', /currentWeekMarker/.test(src));
console.log(`RESULT ${pass}/${pass+fail}`); process.exit(fail?1:0);
