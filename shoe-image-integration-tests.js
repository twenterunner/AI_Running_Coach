const fs=require('fs'),path=require('path');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'styles.css'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'service-worker.js'),'utf8');
const dir=path.join(__dirname,'shoe-images');
const assets=fs.readdirSync(dir).filter(x=>x.endsWith('.webp'));
const tests=[
 ['Version updated',/VERSION = '15\.6\.7'/.test(app)&&/BUILD = 50607/.test(app)],
 ['No embedded image payloads',!app.includes('data:image/webp;base64,')&&!app.includes('EMBEDDED_SHOE_IMAGES')],
 ['At least 19 external shoe assets',assets.length>=19],
 ['Deployment-safe URL uses document.baseURI',/new URL\(`shoe-images\/\$\{file\}`,document\.baseURI\)/.test(app)],
 ['Exact Novablast 4 asset mapped',/NOVABLAST\|4':SHOE_ASSET_FILES\['NOVABLAST-4'\]/.test(app)],
 ['Family mappings external',/GEL-NIMBUS':SHOE_ASSET_FILES/.test(app)&&/GT-1000':SHOE_ASSET_FILES/.test(app)],
 ['Service worker precaches shoe assets',assets.every(f=>sw.includes(`./shoe-images/${f}`))],
 ['Transparent UI retained',/background:transparent!important/.test(css)],
 ['Images stacked above cards',/z-index:21!important/.test(css)],
 ['Fallback retained',/shoePhotoFallback/.test(app)&&/todayPictogram\('shoe'\)/.test(app)],
 ['Image renderer retained',/function shoeImageHtml/.test(app)&&/const src=shoeImageUrl/.test(app)],
 ['No forced CSS horizontal mirroring',!css.includes('scaleX(-1)')&&!app.includes('scaleX(-1)')]
];
let pass=0; for(const [n,ok] of tests){console.log((ok?'PASS':'FAIL')+' '+n);if(ok)pass++;} console.log(`RESULT ${pass}/${tests.length}`); if(pass!==tests.length)process.exit(1);
