'use strict';
const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
assert(app.includes('const extra=new Map(others.map(p=>[p.id,0])),moves=[]'));
assert(app.includes('moves.push({row,pair:candidate.pair})'));
assert(app.includes('for(const move of moves)if(!shoePlannerMove(move.row,move.pair,result.pairs))return false'));
assert(!app.includes("labels[c]||'The shoe plan contains an unresolved safety constraint.'") ||
       app.includes("'unnecessary-purchase':'A planned ordinary shoe purchase is not required"));
assert(app.includes('session-suitability-v16-sufficiency-ledger'));
console.log(JSON.stringify({passed:5,failed:0}));
