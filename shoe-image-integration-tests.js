const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const tests=[
 ['Official image catalogue exists',/const SHOE_IMAGE_CATALOGUE=\{/.test(app)],
 ['NOVABLAST 4 official CDN mapping',/NOVABLAST\|4.*images\.asics\.com/.test(app)],
 ['GEL-NIMBUS 25 official CDN mapping',/GEL-NIMBUS\|25.*images\.asics\.com/.test(app)],
 ['SUPERBLAST 2 official CDN mapping',/SUPERBLAST\|2.*images\.asics\.com/.test(app)],
 ['MEGABLAST official CDN mapping',/MEGABLAST\|1.*images\.asics\.com/.test(app)],
 ['Images lazy load by default',/loading="\$\{eager\?'eager':'lazy'\}"/.test(app)],
 ['Unknown shoes retain pictogram fallback',/shoePhotoFallback/.test(app)&&/todayPictogram\('shoe'\)/.test(app)],
 ['Today recommendation uses shoe image',/todayShoeRow.*shoeImageHtml\(rec\.best\.shoe/.test(app)],
 ['Plan summary uses shoe image',/planShoeSummary.*shoeImageHtml\(rec\.best\.shoe/.test(app)],
 ['Rotation card uses shoe image',/shoeRotationCard.*shoeImageHtml\(shoe/.test(app)],
 ['Log equipment uses shoe image',/logEquipmentCard.*shoeImageHtml\(shoe/.test(app)],
 ['Shoe detail uses shoe image',/shoeDetailHead.*shoeImageHtml\(shoe/.test(app)],
 ['Photo styling exists',/\.shoeCardPhoto/.test(css)&&/object-fit:contain/.test(css)]
];
let fail=0;for(const [name,ok] of tests){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)fail++}console.log(`\n${tests.length-fail} passed, ${fail} failed`);process.exitCode=fail?1:0;
