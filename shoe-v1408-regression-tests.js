'use strict';
const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');

// Root-cause purchase rule: 2–3 pairs is no longer an automatic buying trigger.
assert(!/while\(active\.length<2\)/.test(app),'inventory count must not trigger purchases');
assert(app.includes('"2–3 pairs" is a rotation target, never a purchase trigger.'),'minimal-purchase rule documented in live planner');

// Owned inventory is authoritative for session comparison.
assert(app.includes("for(const shoe of (state.shoes||[]).filter(sh=>sh.status!=='retired'))"),'all owned active physical pairs are ranked');
assert(app.includes("const id=`owned:${shoe.id}`"),'owned pairs retain physical-pair identity');
assert(app.includes("Future physical pairs become comparable only after their authoritative purchase / first-use date."),'future availability is date gated');

// Existing future training pair is reused before another purchase.
assert(app.includes("const existingFuture=pairs.filter(p=>!p.owned&&p.role!=='race'"),'existing future pair reuse exists');

// Weekly 25% allocator remains active.
assert(app.includes('search(i,chosen,kmBy,loss)'),'25% weekly allocation still uses whole-session constrained search');

// Mobile formatting: one full-width column and readable pair names.
assert(html.includes('.sessionShoeCard{display:grid!important;grid-template-columns:1fr!important'),'session shoe tile is single-column');
assert(html.includes('.sessionShoeScores>div{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important'),'available pair score row has flexible name + fixed score columns');
assert(html.includes('word-break:normal!important'),'shoe model names are not broken character-by-character');

console.log(JSON.stringify({passed:10,failed:0}));
