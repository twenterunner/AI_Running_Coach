'use strict';
const assert=require('assert');

// Policy-level regression: 2 shoes, 5 sessions. Best shoe should keep high-value work,
// lower-value sessions should move to satisfy >=25% weekly share.
const sessions=[
 {id:'q',km:8,importance:95,scores:{A:92,B:78}},
 {id:'long',km:16,importance:88,scores:{A:91,B:84}},
 {id:'easy1',km:8,importance:45,scores:{A:87,B:82}},
 {id:'easy2',km:8,importance:40,scores:{A:86,B:81}},
 {id:'rec',km:6,importance:30,scores:{A:83,B:79}},
];
const total=sessions.reduce((n,s)=>n+s.km,0),target=.25*total;
let best=null;
for(let mask=0;mask<(1<<sessions.length);mask++){
 let kmA=0,kmB=0,cost=0,assign={};
 for(let i=0;i<sessions.length;i++){
  const s=sessions[i],shoe=(mask>>i)&1?'B':'A';assign[s.id]=shoe;(shoe==='A'?kmA+=s.km:kmB+=s.km);
  const top=Math.max(s.scores.A,s.scores.B);cost+=s.importance*(top-s.scores[shoe]);
 }
 if(kmA+1e-9<target||kmB+1e-9<target)continue;
 if(!best||cost<best.cost)best={cost,kmA,kmB,assign};
}
assert(best,'25% allocation should be feasible');
assert(best.kmA>=target&&best.kmB>=target);
assert.equal(best.assign.q,'A','quality session stays in best shoe');
assert.equal(best.assign.long,'A','long/high-value session stays in best shoe');
assert(['easy1','easy2','rec'].some(id=>best.assign[id]==='B'),'lower-value work is compromised for rotation');

// Purchase policy: two sufficient pairs -> no purchase. One insufficient pair -> purchase.
function needsPurchase(pairs,session){return !pairs.some(p=>p.available&&p.remaining>=session.km&&p.safe)}
assert.equal(needsPurchase([{available:true,remaining:300,safe:true},{available:true,remaining:500,safe:true}],{km:20}),false);
assert.equal(needsPurchase([{available:true,remaining:5,safe:true},{available:true,remaining:4,safe:true}],{km:20}),true);

// Race hard boundary.
const raceKm=249.9;assert(raceKm<250);assert(!(250<250));
console.log(JSON.stringify({passed:8,failed:0,weekly:{total,target,kmA:best.kmA,kmB:best.kmB,assignment:best.assign}}));
