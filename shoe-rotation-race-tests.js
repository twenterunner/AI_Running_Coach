'use strict';
const assert=require('assert');
function shares(rows){const total=rows.reduce((n,r)=>n+r.km,0);return Object.fromEntries([...new Set(rows.map(r=>r.shoe))].map(s=>[s,rows.filter(r=>r.shoe===s).reduce((n,r)=>n+r.km,0)/total]))}
let rows=[{shoe:'A',km:12},{shoe:'A',km:8},{shoe:'B',km:10},{shoe:'B',km:10}];
let x=shares(rows);assert(x.A>=.25&&x.B>=.25);
rows=[{shoe:'A',km:20},{shoe:'B',km:10},{shoe:'C',km:10}];x=shares(rows);assert(Object.values(x).every(v=>v>=.25));
const raceDate=new Date('2026-09-05T00:00:00'),closeStart=new Date(raceDate.getTime()-42*86400000);
assert(new Date('2026-08-23')>=closeStart);
assert(new Date('2026-06-01')<closeStart);
console.log(JSON.stringify({passed:4,failed:0}));
