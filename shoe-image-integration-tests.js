const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const tests=[
 ['Local image catalogue exists',/const SHOE_IMAGE_CATALOGUE=\{/.test(app)],
 ['NOVABLAST 4 uses bundled transparent asset',/NOVABLAST\|4.*novablast-4-transparent\.png/.test(app)],
 ['GEL-NIMBUS 25 uses bundled transparent asset',/GEL-NIMBUS\|25.*gel-nimbus-transparent\.png/.test(app)],
 ['SUPERBLAST 2 uses bundled transparent asset',/SUPERBLAST\|2.*superblast-transparent\.png/.test(app)],
 ['MEGABLAST uses bundled transparent asset',/MEGABLAST\|1.*megablast-transparent\.png/.test(app)],
 ['Family-level image catalogue exists',/const SHOE_FAMILY_IMAGE_CATALOGUE=\{/.test(app)],
 ['Every built-in shoe family has an image mapping',(()=>{const fam=[...app.matchAll(/addAsicsSeries\('([^']+)'/g)].map(m=>m[1]);const current=[...app.matchAll(/upsertCurrentAsicsProfile\('([^']+)'/g)].map(m=>m[1]);const all=[...new Set([...fam,...current])];const block=(app.match(/const SHOE_FAMILY_IMAGE_CATALOGUE=\{([\s\S]*?)\n\};/)||[])[1]||'';return all.every(f=>block.includes(`'${f}'`))})()],
 ['All family mappings point to transparent PNG assets',(()=>{const block=(app.match(/const SHOE_FAMILY_IMAGE_CATALOGUE=\{([\s\S]*?)\n\};/)||[])[1]||'';const vals=[...block.matchAll(/:'([^']+)'/g)].map(m=>m[1]);return vals.length>=18&&vals.every(v=>/\.\/shoe-images\/.*-transparent\.png$/.test(v))})()],
 ['Generation fallback resolves to family photography',/SHOE_IMAGE_CATALOGUE\[shoeImageKey\(brand,model,version\)\]\|\|SHOE_FAMILY_IMAGE_CATALOGUE\[family\]/.test(app)],
 ['Images lazy load by default',/loading="\$\{eager\?'eager':'lazy'\}"/.test(app)],
 ['Unknown shoes retain pictogram fallback',/shoePhotoFallback/.test(app)&&/todayPictogram\('shoe'\)/.test(app)],
 ['Today recommendation uses shoe image',/todayShoeRow.*shoeImageHtml\(rec\.best\.shoe/.test(app)],
 ['Plan summary uses shoe image',/planShoeSummary.*shoeImageHtml\(rec\.best\.shoe/.test(app)],
 ['Rotation card uses shoe image',/shoeRotationCard.*shoeImageHtml\(shoe/.test(app)],
 ['Log equipment uses shoe image',/logEquipmentCard.*shoeImageHtml\(shoe/.test(app)],
 ['Shoe detail uses shoe image',/shoeDetailHead.*shoeImageHtml\(shoe/.test(app)],
 ['Photo styling exists',/\.shoeCardPhoto/.test(css)&&/object-fit:contain/.test(css)],
 ['Shoe image containers are transparent',/shoeMiniPhoto\{[^}]*background:transparent[^}]*border:0[^}]*box-shadow:none/.test(css)],
 ['Specific card-head teal tile is explicitly overridden',/\.shoeCardHead>\.shoeCardPhoto[^{]*\{[^}]*background:transparent!important[^}]*border:0!important/.test(css)],
 ['Shoe photo layer sits above card surfaces',/shoeMiniPhoto\{[^}]*z-index:20!important/.test(css)&&/shoeMiniPhoto img\{[^}]*z-index:21!important/.test(css)],
 ['Mobile shoe card photography is not collapsed to legacy 42px tile',/@media\(max-width:600px\)[\s\S]*?\.shoeCardHead>\.shoeCardPhoto\{width:88px!important;height:62px!important/.test(css)],
 ['Transparent assets render with normal compositing',/shoeMiniPhoto img\{[^}]*mix-blend-mode:normal!important[^}]*filter:none!important/.test(css)],
 ['Shoe assets are precached for offline use',/shoe-images\/novablast-4-transparent\.png\?v=50605/.test(sw)&&/shoe-images\/gt-2000-transparent\.png\?v=50605/.test(sw)]
];
let fail=0;for(const [name,ok] of tests){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)fail++}console.log(`\n${tests.length-fail} passed, ${fail} failed`);process.exitCode=fail?1:0;
