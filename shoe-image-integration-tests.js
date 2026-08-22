const fs=require('fs'),path=require('path');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'styles.css'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'service-worker.js'),'utf8');
const tests=[
 ['Version updated',/VERSION = '15\.6\.6'/.test(app)&&/BUILD = 50606/.test(app)],
 ['Embedded image catalogue exists',/const EMBEDDED_SHOE_IMAGES=\{/.test(app)],
 ['At least 19 embedded WebP assets',(app.match(/data:image\/webp;base64,/g)||[]).length>=19],
 ['Exact Novablast 4 embedded',/NOVABLAST\|4':EMBEDDED_SHOE_IMAGES\['novablast-4-transparent\.png'\]/.test(app)],
 ['Family mappings embedded',/GEL-NIMBUS':EMBEDDED_SHOE_IMAGES/.test(app)&&/GT-1000':EMBEDDED_SHOE_IMAGES/.test(app)],
 ['No runtime shoe path dependency',!/\.\/shoe-images\//.test(app)],
 ['No SW shoe path dependency',!/shoe-images\//.test(sw)],
 ['Transparent UI retained',/background:transparent!important/.test(css)],
 ['Images stacked above cards',/z-index:21!important/.test(css)],
 ['Fallback retained',/shoePhotoFallback/.test(app)&&/todayPictogram\('shoe'\)/.test(app)],
 ['Image renderer retained',/function shoeImageHtml/.test(app)&&/const src=shoeImageUrl/.test(app)]
];
let pass=0; for(const [n,ok] of tests){console.log((ok?'PASS':'FAIL')+' '+n);if(ok)pass++;} console.log(`RESULT ${pass}/${tests.length}`); if(pass!==tests.length)process.exit(1);
