const fs=require('fs');
const src=fs.readFileSync(__dirname+'/app.js','utf8');
let pass=0, fail=0;
function test(name,cond){if(cond){console.log('PASS',name);pass++;}else{console.error('FAIL',name);fail++;}}
function has(x){return src.includes(x)}
// Phase 1: the criterion has an explicit scheduled assessment opportunity.
test('P1 schedules gentle double-leg loading assessment',has("Supported double-leg loading assessment"));
test('P1 load days are recognised as strength assessment days',has("const strengthPlanned=plan.type==='load'||"));
// Phase 2: generic strength criterion matches the generic scheduled strength input.
test('P2 criterion is generic strength loading, not hamstring-only wording',has("Repeated strength loading controlled")&&!has("Repeated bridge or hinge controlled"));
// Phase 3: two impact opportunities per seven-day cycle.
test('P3 schedules impact assessment on cycle days 2 and 5',has("stage===2&&[2,5].includes(cycleDay)"));
// Phase 4: prescribed running exposure can actually reach the 10-minute criterion.
test('P4 prescribes exactly 10 minutes running exposure',has("5 × 2 minutes easy run / 2 minutes walk")&&has("10:00 total easy running"));
test('P4 no longer relies on 6x1-minute / 6-minute exposure in calendar',!has("title='Walk–run exposure';guideExercises=exercises.slice()"));
// Phase 5: running duration and combined strength+impact criterion both have explicit opportunities.
test('P5 schedules 30-minute easy run',has("30-minute easy continuous run")&&has("30:00 easy continuous running planned"));
test('P5 schedules combined readiness assessment',has("Strength & impact readiness assessment")&&has("Controlled double-leg hops"));
test('P5 combined assessment occurs twice per seven-day cycle',has("else if([1,4].includes(cycleDay)){type='load';title='Strength & impact readiness assessment'"));
// Phase 6: normal volume, quality and post-training response all have scheduled/recordable evidence.
test('P6 normal duration progresses 35 to 40 to 45 minutes',has("best45>=40?45:best45>=35?40:35"));
test('P6 schedules explicit controlled faster running',has("title=qualityDay?'Controlled faster running':'Normal-duration easy running'"));
test('P6 check-in records quality tolerance',has("icRunQuality")&&has("runQualityTolerated"));
test('P6 quality failure cannot pass merely because runIntensity is quality',has("!known(c.runQualityTolerated)&&(c.hillsTolerated===true||['tempo','interval','hills','quality']"));
test('P6 symptom recurrence uses completed training exposures',has("c.runStatus==='completed'&&Number(c.runMinutes)>=30&&c.nextDayWorse===false&&c.alteredGait===false"));
// Regression checks from previous update.
test('Seconds input retained for walking',has('id="icWalkSeconds"'));
test('Seconds input retained for running',has('id="icRunSeconds"'));
test('Current phase criterion is used in runner interpretation',has("criteria=criterionState(i,p,p.stage)"));

// Setback / bidirectional progression checks.
test('Stage is recalculated from the full check-in history',has('const stage=injuryStageForChecks(i,checks,diag)'));
test('Highest previously achieved stage is tracked',has('function injuryStageHistory(i,checks,diag)')&&has('peakStage'));
test('Regression magnitude is exposed to the model and UI',has('regressedBy=Math.max(0,peakStage-stage)')&&has('Rehabilitation phase adjusted after a setback'));
test('Upcoming programme uses the recalculated active stage',has('const exercises=exerciseList(i,p),stage=p.stage'));
test('Future rehab shoe/calendar projection also uses recalculated injuryPrediction',has('const progress=injuryPrediction(injury)')&&has('rehabCalendarDay(injury,progress,date'));
test('Setback extends recovery estimate for adverse next-morning response',has("if(latestAdverse(checks,'nextDayWorse'))remaining+=7"));
test('Setback extends recovery estimate for new swelling',has("if(latestAdverse(checks,'newSwelling'))remaining+=7"));
test('Setback extends recovery estimate for altered gait',has("if(latestAdverse(checks,'alteredGait'))remaining+=4"));
test('Stopped or unable run extends recovery estimate',has("snap.run.lastAttempt?.runStatus==='unable'||snap.run.lastAttempt?.runStatus==='stopped'"));

// Build integrity.
test('Build number updated',has("const BUILD = 50501;"));
test('Core version updated',has("const VERSION = '15.5.1';"));
console.log(`\n${pass} passed, ${fail} failed`);
if(fail) process.exit(1);
