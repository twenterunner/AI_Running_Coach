'use strict';
const assert=require('assert');
function sync(pair,purchase){
 const rows=(pair.assignments||[]).filter(a=>Number(a.km)>0).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
 const first=rows[0]; if(!first)return;
 pair.availableDate=first.date;pair.purchaseDate=first.date;
 purchase.purchaseDate=first.date;purchase.firstUseDate=first.date;
}
const pair={id:'future:1',owned:false,availableDate:'2026-08-30',purchaseDate:'2026-08-30',assignments:[
 {date:'2026-08-18',km:8},{date:'2026-08-22',km:0},{date:'2026-08-25',km:12},{date:'2026-08-30',km:10}
]};
const purchase={pairId:'future:1',purchaseDate:'2026-08-30',firstUseDate:'2026-08-30'};
sync(pair,purchase);
assert.equal(pair.availableDate,'2026-08-18');
assert.equal(pair.purchaseDate,'2026-08-18');
assert.equal(purchase.firstUseDate,'2026-08-18');
assert.equal(pair.assignments.filter(a=>a.km>0&&a.date<pair.availableDate).length,0);
console.log(JSON.stringify({passed:4,failed:0,authoritativeFirstUse:pair.availableDate}));
