const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
let pass=0,fail=0;
function test(name,ok){if(ok){console.log('PASS',name);pass++}else{console.log('FAIL',name);fail++}}
function has(x){return app.includes(x)}
test('Page render cache exists',has('const pageRenderCache=new Map()'));
test('Cache signature includes storage revision',has('Number(state.storageRevision)||0'));
test('Cache signature includes current day',has('const day=iso(today())'));
test('Plan cache signature includes week view',has("page==='plan'?String(state.weekView??''):''"));
test('Repeat unchanged page can skip render',has("if(!force&&pageRenderCache.get(page)===sig)return false"));
test('Successful page render records signature',has('pageRenderCache.set(page,sig)'));
test('Global state refresh invalidates page cache',has('invalidatePageRenderCache();'));
test('Global refresh renders only active page immediately',has('renderPage(activePageId(),{force:true})'));
test('Legacy eager render-all renderer list removed',!has('function renderAll(){[renderDashboard,renderToday,renderPlan'));
test('Page renderer mapping still covers all navigation pages',['today','plan','runs','dashboard','assessments','recovery','injury','shoes','race','settings'].every(p=>has(p+':[')));
test('app.js no longer embeds shoe image payloads',!has('data:image/webp;base64,'));
test('No forced background tab pre-render jank',!has('function warmPrimaryTabs()')&&!has('setTimeout(warmPrimaryTabs'));
test('Tab activation yields a paint before first heavy render',has('requestAnimationFrame(()=>requestAnimationFrame(()=>')&&has('pendingPageRenderToken'));
test('Only one activatePage implementation remains',(app.match(/function activatePage\(/g)||[]).length===1);
test('Page transition animation removed from hot navigation path',!fs.readFileSync('styles.css','utf8').includes('animation:pageIn'));

test('Tab activation uses cached page nodes',has('const pageNodes=new Map')&&has('pageNodes.get(current)'));
test('Navigation buttons are cached after render',has('const navigationButtonMap=new Map()')&&has('refreshNavigationNodeCache'));

console.log(`\n${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
