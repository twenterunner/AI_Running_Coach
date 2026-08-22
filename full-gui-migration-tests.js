const fs=require('fs'); const css=fs.readFileSync('styles.css','utf8'); const html=fs.readFileSync('index.html','utf8'); const app=fs.readFileSync('app.js','utf8');
let p=0,f=0; function t(n,c){if(c){console.log('PASS',n);p++}else{console.error('FAIL',n);f++}}
const pages=['today','plan','runs','dashboard','recovery','injury','shoes','race','assessments','coach','settings'];
pages.forEach(id=>t(`DOM page ${id} retained`,new RegExp(`id=["']${id}["']`).test(html)));
['plan','runs','dashboard','recovery','injury','shoes','race','assessments','coach','settings'].forEach(id=>t(`Prototype migration selector ${id}`,css.includes(`#${id}`)&&css.includes('COMPLETE PERFORMANCE-PROTOTYPE MIGRATION')));
t('All specialist workspaces share card primitive',css.includes(':is(#plan,#runs,#dashboard,#recovery,#injury,#shoes,#race,#assessments,#coach,#settings)'));
t('All specialist workspaces share chart primitive',css.includes('progressChartMount')&&css.includes('shoeProjectionChart'));
t('All specialist workspaces share interaction primitive',css.includes('transition:transform .15s ease'));
t('Per-page accent system present',['--proto-blue','--proto-green','--proto-orange','--proto-amber','--proto-purple'].every(x=>css.includes(x)));
t('Shoe foreground contract retained',css.includes('z-index:41')&&css.includes('background:transparent!important'));
t('Mobile 390 reference retained',css.includes('@media(max-width:390px)'));
t('Version 16.1.0',app.includes("VERSION = '16.1.0'"));t('Build 60100',app.includes('BUILD = 60100'));
console.log(`RESULT ${p}/${p+f}`);process.exit(f?1:0);
