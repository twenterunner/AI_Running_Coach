
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('app.js','utf8');
assert(src.includes("const VERSION = '14.9.46'"));
assert(src.includes("function shoeCoachRequiredRole"));
assert(src.includes("function shoeCoachRoleTier"));
assert(src.includes("return rows.sort((a,b)=>b.roleTier-a.roleTier||b.score-a.score)"));
assert(src.includes("Final planned rotation use; no unused inventory tail is forecast."));
assert(src.includes("pair!==life.racePair&&pair.role!=='race'&&pair.finalPlannedUseDate"));
assert(src.includes("if(compact.length&&Math.abs(Number(compact.at(-1).km)-Number(pt.km))<1e-9)continue"));
assert(src.includes("const exit=pair?.rotationExitCanonical?null:(pair?.plannedRetireDate||null)"));
console.log('PASS role-first source invariants');
