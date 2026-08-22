const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const tests=[
 ['Official image catalogue exists',/const SHOE_IMAGE_CATALOGUE=\{/.test(app)],
 ['NOVABLAST 4 official CDN mapping',/NOVABLAST\|4.*images\.asics\.com/.test(app)],
 ['GEL-NIMBUS 25 official CDN mapping',/GEL-NIMBUS\|25.*images\.asics\.com/.test(app)],
 ['SUPERBLAST 2 official CDN mapping',/SUPERBLAST\|2.*images\.asics\.com/.test(app)],
 ['MEGABLAST official CDN mapping',/MEGABLAST\|1.*images\.asics\.com/.test(app)],

 ['Family-level image catalogue exists',/const SHOE_FAMILY_IMAGE_CATALOGUE=\{/.test(app)],
 ['Every built-in shoe family has an image mapping',(()=>{const fam=[...app.matchAll(/addAsicsSeries\('([^']+)'/g)].map(m=>m[1]);const current=[...app.matchAll(/upsertCurrentAsicsProfile\('([^']+)'/g)].map(m=>m[1]);const all=[...new Set([...fam,...current])];const block=(app.match(/const SHOE_FAMILY_IMAGE_CATALOGUE=\{([\s\S]*?)\n\};/)||[])[1]||'';return all.every(f=>block.includes(`'${f}'`))})()],
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
 ['Shoe photo layer sits above card surfaces',/\.shoeCardHead>\.shoeCardPhoto[^{]*\{[^}]*z-index:8!important/.test(css)&&/shoeMiniPhoto img\{[^}]*z-index:9/.test(css)],
 ['Mobile shoe card photography is not collapsed to legacy 42px tile',/@media\(max-width:600px\)[\s\S]*?\.shoeCardHead>\.shoeCardPhoto\{width:88px!important;height:62px!important/.test(css)],
 ['White product-image background blends away without multiply darkening',/shoeMiniPhoto img\{[^}]*mix-blend-mode:darken[^}]*background:transparent/.test(css)]
];
let fail=0;for(const [name,ok] of tests){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)fail++}console.log(`\n${tests.length-fail} passed, ${fail} failed`);process.exitCode=fail?1:0;
