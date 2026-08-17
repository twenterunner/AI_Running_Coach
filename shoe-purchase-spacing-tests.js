'use strict';
const assert=require('assert');
const DAY=86400000;
const iso=d=>d.toISOString().slice(0,10);
const dte=s=>new Date(`${s}T00:00:00`);
function schedule(rows,weeks,now,anchor=null){
 const gapDays=weeks*7,out=rows.map(x=>({...x,naturalPurchaseDate:x.firstUseDate,purchaseDate:x.firstUseDate,spacingStatus:weeks?'targeted':'off'}));
 if(!weeks||!out.length)return out;
 const today=dte(now);let next=null;
 for(let i=out.length-1;i>=0;i--){let chosen=dte(out[i].firstUseDate);if(next){const spaced=new Date(next.getTime()-gapDays*DAY);if(spaced<chosen)chosen=spaced}if(chosen<today){chosen=today;out[i].spacingStatus='constrained'}out[i].purchaseDate=iso(chosen);next=chosen}
 if(anchor){let previous=dte(anchor);for(let i=0;i<out.length;i++){const desired=new Date(previous.getTime()+gapDays*DAY),limit=dte(out[i].firstUseDate);if(desired<=limit&&desired>=today)out[i].purchaseDate=iso(desired);else if(desired>limit)out[i].spacingStatus='overridden';previous=dte(out[i].purchaseDate)}}
 for(let i=1;i<out.length;i++){const actual=(dte(out[i].purchaseDate)-dte(out[i-1].purchaseDate))/DAY;if(actual+1e-6<gapDays)out[i].spacingStatus='overridden'}
 return out;
}
let x=schedule([{firstUseDate:'2027-01-19'},{firstUseDate:'2027-03-14'}],12,'2026-08-17');
assert.equal(x[1].purchaseDate,'2027-03-14');
assert.equal(x[0].purchaseDate,'2026-12-20');
assert((dte(x[1].purchaseDate)-dte(x[0].purchaseDate))/DAY>=84);
x=schedule([{firstUseDate:'2026-09-01'},{firstUseDate:'2026-09-20'}],8,'2026-08-17');
assert.equal(x[0].purchaseDate,'2026-08-17');
assert.equal(x[1].spacingStatus,'overridden');
assert(x.every((r)=>r.purchaseDate<=r.firstUseDate));
x=schedule([{firstUseDate:'2026-12-01'}],8,'2026-08-17','2026-08-01');
assert.equal(x[0].purchaseDate,'2026-09-26');
x=schedule([{firstUseDate:'2027-01-19'},{firstUseDate:'2027-03-14'}],0,'2026-08-17');
assert.deepEqual(x.map(r=>r.purchaseDate),['2027-01-19','2027-03-14']);
console.log(JSON.stringify({suite:'SHOE PURCHASE SPACING',passed:8,failed:0},null,2));
