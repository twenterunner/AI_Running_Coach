const fs=require('fs');
const app=fs.readFileSync('app.js','utf8'), css=fs.readFileSync('styles.css','utf8'), html=fs.readFileSync('index.html','utf8');
function ok(x,m){if(!x)throw new Error(m); console.log('PASS '+m)}
ok(/preferredPurchaseGapDays:84/.test(app),'12-week purchase-spacing target');
ok(/purchaseGapIsSoftTarget:true/.test(app),'purchase spacing remains soft');
ok(/freshLifecycleAssignmentForPlan\(planId\).*return life\.assignments/.test(app),'session shoe plan is always exposed');
ok(/v14\.5\.2 — FINAL authoritative mobile navigation/.test(css),'final nav override present');
ok(/left:0!important;right:0!important;bottom:0!important/.test(css),'nav docked to bottom edge');
ok(/width:100vw!important;max-width:100vw!important/.test(css),'nav constrained to viewport');
ok(html.includes('v14.5.2') && html.includes('40502'),'version/build aligned');
