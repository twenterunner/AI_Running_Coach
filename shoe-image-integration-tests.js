const fs=require('fs'),path=require('path');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'styles.css'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'service-worker.js'),'utf8');
const assets=fs.readdirSync(__dirname).filter(x=>x.endsWith('-transparent.webp'));
const tests=[
 ['Version updated',/VERSION = '16\.1\.0'/.test(app)&&/BUILD = 60100/.test(app)],
 ['No embedded image payloads',!app.includes('data:image/webp;base64,')&&!app.includes('EMBEDDED_SHOE_IMAGES')],
 ['At least 19 root shoe assets',assets.length>=19],
 ['Flat deployment has no shoe-images directory',!fs.existsSync(path.join(__dirname,'shoe-images'))],
 ['Deployment-safe root URL uses document.baseURI',/new URL\(file,document\.baseURI\)/.test(app)],
 ['Exact Novablast 4 asset mapped',/NOVABLAST\|4':SHOE_ASSET_FILES\['NOVABLAST-4'\]/.test(app)],
 ['Family mappings external',/GEL-NIMBUS':SHOE_ASSET_FILES/.test(app)&&/GT-1000':SHOE_ASSET_FILES/.test(app)],
 ['Service worker precaches root shoe assets',assets.every(f=>sw.includes(`./${f}`))],
 ['Transparent UI retained',/background:transparent!important/.test(css)],
 ['Images stacked above cards',/z-index:21!important/.test(css)],
 ['Fallback retained',/shoePhotoFallback/.test(app)&&/todayPictogram\('shoe'\)/.test(app)],
 ['Image renderer retained',/function shoeImageHtml/.test(app)&&/const src=shoeImageUrl/.test(app)],
 ['No forced CSS horizontal mirroring',!css.includes('scaleX(-1)')&&!app.includes('scaleX(-1)')]
];
let pass=0; for(const [n,ok] of tests){console.log((ok?'PASS':'FAIL')+' '+n);if(ok)pass++;} console.log(`RESULT ${pass}/${tests.length}`); if(pass!==tests.length)process.exit(1);
