'use strict';

// Run with: node weekly-review-regression-tests.js
// An optional --source path permits the same behavioural checks against an old
// app.js. No browser, dependencies, user data, or application writes are needed.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const sourceFlag = process.argv.indexOf('--source');
const sourcePath = sourceFlag >= 0 ? process.argv[sourceFlag + 1] : path.join(__dirname, 'app.js');
if (!sourcePath) throw new Error('--source requires an app.js path');
const source = fs.readFileSync(sourcePath, 'utf8');
process.env.TZ = 'Europe/Amsterdam';

// Use the real function bodies without starting the complete browser app. Let
// JavaScript's parser find the function end, including nested template strings.
function extractFunction(name, optional = false) {
  const match = new RegExp('\\bfunction\\s+' + name + '\\s*\\(').exec(source);
  if (!match) {
    if (optional) return '';
    throw new Error('Application function missing: ' + name);
  }
  for (let end = source.indexOf('}', match.index); end >= 0; end = source.indexOf('}', end + 1)) {
    const candidate = source.slice(match.index, end + 1);
    try {
      new vm.Script('(' + candidate + '\n)');
      return candidate;
    } catch (_) { /* The function body is not complete yet. */ }
  }
  throw new Error('Could not extract ' + name);
}

const coreEnd = source.indexOf('let preview=null;');
const datesStart = source.indexOf('const DAY=');
const datesEnd = source.indexOf('const dec=', datesStart);
assert(coreEnd > 0 && datesStart > coreEnd && datesEnd > datesStart, 'Core/date source boundaries are available');
const dateSource = source.slice(datesStart, datesEnd);
const functionNames = [
  'weeks', 'weekStart', 'weekEnd', 'currentWeek', 'trainingWeekForDate', 'reviewWeekForDate',
  'completedRuns', 'trainingWeekRuns', 'weekData',
  'workoutFamily', 'effectiveRunType', 'loadDecisionSignalForRun', 'loadAcceptedContribution', 'paceAcceptedContribution',
  'weeklyLoadEvidence', 'weeklyPaceEvidence', 'adaptiveFactorDetails', 'adaptiveFactor',
  'pathwayEvidenceTrace',
  'provisionalWeeklyAdjustment', 'pacePowerCommittedFactor', 'pacePowerProvisionalFactor', 'pacePowerReviewState',
  'pathwayFactorHistory', 'pathwayFactorSummary', 'pathwayHistorySvg', 'signedFactorDelta', 'athleteState',
  'painAdjustment', 'compatibleRunType', 'matchingRun', 'fmtTime', 'pace',
  'weeklyReviewData', 'planAdaptationLabels', 'planAdaptPercent', 'planAdaptFactor', 'planAdaptAmountClass',
  'loadReviewBreakdownHtml', 'planAdaptationAmountHtml', 'planProjectedChangeRows', 'weeklyReviewHtml',
  'planSelectedWeekHeaderHtml', 'todayWeekCard', 'progressAdaptationHomeHtml', 'renderPlan',
  'programmePauseDays', 'programmePauseReasonLabel', 'programmePauseReentryProfile', 'programmePauseHasEvidence',
  'programmePauseRestItem', 'programmePauseReentryItem', 'programmePauseReentryBelongsTo', 'applyProgrammePausesToPlan'
];
const addedHelpers = new Set(['weekEnd', 'trainingWeekRuns', 'loadReviewBreakdownHtml', 'programmePauseReentryBelongsTo']);
const functions = functionNames.map(name => extractFunction(name, addedHelpers.has(name))).join('\n');
const learningRates = source.match(/const PATHWAY_LEARNING_RATE=[^;]+;/);
assert(learningRates, 'Real pathway learning rates are available');
const pauseConstants = ['PROGRAMME_PAUSE_REASON', 'PROGRAMME_PAUSE_KEY_TYPES'].map(name => {
  const match = source.match(new RegExp('const ' + name + '=[^;]+;'));
  assert(match, 'Real programme pause constant ' + name + ' is available');
  return match[0];
}).join('\n');

function fixture() {
  const p = (id, date, distance, week = 1) => ({id, date, distance, week, type: 'Easy'});
  const r = (id, date, distanceKm, planId, fixtureScore) => ({
    id, date, distanceKm, planId, fixtureScore, type: 'Easy', durationSec: distanceKm * 480,
    avgHr: 145, avgPower: 200, powerDrift: 0, pain: 0, rpe: 4
  });
  return {
    setup: {planStart: '2026-10-10', raceDate: '2026-11-07', adaptive: true, minFactor: .75, maxFactor: 1.2},
    weekView: 1,
    plan: [p('p1', '2026-10-10', 1), p('p2', '2026-10-11', 1.2), p('p3', '2026-10-12', 1.3),
      p('p4', '2026-10-13', 1.5), p('p5', '2026-10-15', 2.1), p('p6', '2026-10-18', 8, 2),
      p('p7', '2026-10-25', 9, 3)],
    runs: [r('r1', '2026-10-10', .95, 'p1', 88), r('r2', '2026-10-11', 2.85, 'p2', 71),
      r('r3', '2026-10-13', 4.8, 'p4', 71)],
    assessments: [], injuries: [], days: [], activeInjuryPlanId: null
  };
}

function harness(options = {}) {
  const context = vm.createContext({console});
  vm.runInContext(source.slice(0, coreEnd), context, {filename: 'app-core.js'});
  vm.runInContext(`
    const window = globalThis;
    const CORE = ARC_CORE;
    const elements = new Map();
    const document = {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, {innerHTML: '', textContent: ''});
        return elements.get(id);
      },
      querySelectorAll() { return []; }
    };
    ${dateSource}
    let state = ${JSON.stringify(options.state || fixture())};
    MODEL_DATE_OVERRIDE = ${JSON.stringify(options.today || '2026-10-18')};
    const runtimeDomainRevisions = {runs: 0};
    let completedRunsCache = {revision: null, values: new Map()};
    let simulatedReadiness = ${Number(options.readiness || 1)};
    let simulatedPaceFrom = ${JSON.stringify(options.paceFrom || '')};
    let simulatedPace = ${Number(options.pace || 1)};
    ${learningRates[0]}
    ${pauseConstants}

    // Isolate scoring/history inputs and decorative UI. The load-completion,
    // tolerance, confidence, learning, weekly aggregation and commitment code
    // below all come from app.js unchanged.
    function workoutScoreDetails(run) { return {score: run.fixtureScore}; }
    function workoutScore(run) { return run.fixtureScore; }
    function personalResponseModel() { return {}; }
    function personalPathwaySignal() { return {value: 0}; }
    function runLateEfficiencyDelta() { return null; }
    function hrvModel() { return {ready: true, factor: simulatedReadiness, detail: 'Controlled HRV context.'}; }
    function recoveryPainState() { return {max: 0, count: 0}; }
    function readinessModel() { return {modifier: simulatedReadiness}; }
    function trainingEvidence(asOf = iso(today())) {
      const value = simulatedPaceFrom && asOf >= simulatedPaceFrom ? simulatedPace : 1;
      return {adjustment: value, rawIndex: value * 100, index: value * 100, confidence: 100, events: []};
    }
    function decisionSignalForRun() { return {finalSignal: 0, confidenceWeight: 0}; }
    function zone() { return {pace: 480, power: 200, hr: 145}; }
    function phase() { return 'Foundation'; }
    function detailedPhase() { return 'Foundation'; }
    function planPhasePriority() { return 'Durable easy running'; }
    function uiIcon() { return ''; }
    function todayPictogram() { return ''; }
    function todayMiniValueClass() { return 'neutral'; }
    function miniSparkline() { return ''; }
    function planProgrammeHeaderHtml() { return ''; }
    function programmePausePanelHtml() { return ''; }
    function bindProgrammePauseControls() {}
    function workoutHtml() { return ''; }
    function planTimelineHtml() { return ''; }
    function planIntensityDistributionHtml() { return ''; }
    // Pause tests retain the actual re-entry factors and selection logic, while
    // omitting unrelated workout-description and interval-structure generation.
    function prescription(type, km) { return {totalDistance: km}; }
    ${functions}
  `, context, {filename: 'weekly-review-isolated.js'});
  return code => vm.runInContext(code, context, {timeout: 3000});
}

function close(actual, expected, message) {
  assert(Math.abs(actual - expected) < 1e-10, (message || 'Numeric result') + ': expected ' + expected + ', got ' + actual);
}
function plain(html) { return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function ids(evaluate, expression) { return JSON.parse(evaluate('JSON.stringify(' + expression + ')')); }

let passed = 0, failed = 0;
function test(name, run) {
  try { run(); console.log('PASS', name); passed++; }
  catch (error) { console.error('FAIL', name, '-', error.message); failed++; }
}

test('Real run-level evidence and missed prescriptions reproduce the rounded 1.001 to 0.976 case', () => {
  const e = harness();
  close(e('weekData(1).planned'), 7.1);
  close(e('weekData(1).actual'), 8.6);
  assert.equal(e('weeklyLoadEvidence(1,true).missedSessions.length'), 2);
  close(e('weeklyLoadEvidence(1,true).runDelta'), .0011124);
  close(e('weeklyLoadEvidence(1,true).completionDelta'), -.025);
  close(e('adaptiveFactorDetails(2).cumulativeFactor'), .9761124);
  assert.equal(e('provisionalWeeklyAdjustment(1).cumulativeFactor.toFixed(3)'), '1.001');
  assert.equal(e('adaptiveFactorDetails(2).cumulativeFactor.toFixed(3)'), '0.976');
});

test('Closed Week 1 Plan review uses exactly the factor committed into Week 2', () => {
  const e = harness();
  assert.equal(e('weeklyReviewData(1).closed'), true);
  close(e('weeklyReviewData(1).loadApplied'), 1);
  close(e('weeklyReviewData(1).loadProjected'), .9761124);
  close(e('weeklyReviewData(1).loadProjected'), e('adaptiveFactorDetails(2).cumulativeFactor'));
});

test('Plan navigation, Today and Progress agree on the committed 0.976 factor', () => {
  const e = harness();
  e('renderPlan()');
  assert.match(plain(e("elements.get('weeklyReview').innerHTML")), /0\.976/);
  assert.match(plain(e('todayWeekCard(athleteState())')), /0\.976/);
  assert.match(plain(e('progressAdaptationHomeHtml()')), /0\.976/);
  close(e('pathwayFactorSummary().load.current'), e('weeklyReviewData(1).loadProjected'));
});

test('A closed review labels the actual reduction, not the old positive projection', () => {
  const e = harness();
  assert.equal(e('planAdaptationLabels(1).loadState.label'), 'Load reduced');
  assert.doesNotMatch(plain(e('weeklyReviewHtml(1)')), /Load progressing/);
});

test('Historical review labels explicitly distinguish selected Week 1 from application in Week 2', () => {
  const e = harness(), text = plain(e('planAdaptationAmountHtml(weeklyReviewData(1))'));
  assert.match(text, /Week 1/i);
  assert.match(text, /Week 2/i);
  assert.match(text, /applied/i);
  assert.doesNotMatch(text, /THIS WEEK/i);
  assert.doesNotMatch(text, /NEXT REVIEW/i);
});

test('Closed-review evidence includes the run evidence, missed-session adjustment and final factor', () => {
  const e = harness(), text = plain(e('weeklyReviewHtml(1)'));
  assert.match(text, /accepted run|run evidence/i);
  assert.match(text, /missed.session/i);
  assert.match(text, /2\.5|0\.025/);
  assert.match(text, /0\.976/);
});

test('8.6 km against 7.1 km is displayed as 121%, not capped at 100%', () => {
  const e = harness(), text = plain(e('planSelectedWeekHeaderHtml(1)'));
  assert.match(text, /121% of plan/);
  assert.doesNotMatch(text, /100% of plan/);
});

test('An open week includes accepted runs but no premature missed-session penalty', () => {
  const e = harness({today: '2026-10-13'});
  assert.equal(e('weeklyReviewData(1).closed'), false);
  close(e('provisionalWeeklyAdjustment(1).loadReview.completionDelta'), 0);
  close(e('weeklyReviewData(1).loadProjected'), 1.0011124);
  close(e('adaptiveFactorDetails(1).cumulativeFactor'), 1);
  const text = plain(e('weeklyReviewHtml(1)'));
  assert.match(text, /projected|provisional/i);
  assert.match(text, /Week 2/i);
});

test('Future weeks await completed evidence instead of accepting future-dated runs', () => {
  const state = fixture();
  state.runs.push({...state.runs[0], id: 'future', date: '2026-10-25', planId: 'p7', distanceKm: 9});
  const e = harness({state});
  assert.equal(e('weeklyLoadEvidence(3,false).decisions.length'), 0);
  close(e('weeklyReviewData(3).loadApplied'), .9761124);
  close(e('weeklyReviewData(3).loadProjected'), .9761124);
  assert.match(plain(e('weeklyReviewHtml(3)')), /await|future|pending/i);
  assert.doesNotMatch(plain(e('weeklyReviewHtml(3)')), /Load progressing/);
});

test('Temporary readiness moderates effective load without rewriting learned or historical factors', () => {
  const e = harness({readiness: .94});
  close(e('adaptiveFactorDetails(2).cumulativeFactor'), .9761124);
  close(e('adaptiveFactorDetails(2).factor'), .917545656);
  close(e('weeklyReviewData(1).loadProjected'), .9761124);
  close(e('weeklyReviewData(2).loadApplied'), .9761124);
  close(e('weeklyReviewData(2).readiness'), .94);
  assert.match(plain(e('planAdaptationAmountHtml(weeklyReviewData(1))')), /temporary|recovery/i);
});

test('Pre-programme runs cannot enter Week 1 load or pace evidence', () => {
  const state = fixture();
  state.runs.push({...state.runs[0], id: 'before-start', date: '2026-10-09', planId: null, pain: 8});
  const e = harness({state});
  assert.deepEqual(ids(e, 'weeklyLoadEvidence(1,true).decisions.map(x=>x.run.id)'), ['r1', 'r2', 'r3']);
  assert.deepEqual(ids(e, 'weeklyPaceEvidence(1).rows.map(x=>x.run.id)'), ['r1', 'r2', 'r3']);
  close(e('weekData(1).actual'), 8.6);
  close(e('adaptiveFactorDetails(2).cumulativeFactor'), .9761124);
});

test('Future records are excluded even when an as-of date beyond today is requested', () => {
  const state = fixture();
  state.runs.push({...state.runs[0], id: 'future-in-week', date: '2026-10-15', planId: 'p5', distanceKm: 2.1});
  const e = harness({state, today: '2026-10-13'});
  assert.deepEqual(ids(e, "weeklyLoadEvidence(1,false,'2026-10-16').decisions.map(x=>x.run.id)"), ['r1', 'r2', 'r3']);
  assert.deepEqual(ids(e, "weeklyPaceEvidence(1,'2026-10-16').rows.map(x=>x.run.id)"), ['r1', 'r2', 'r3']);
  close(e("weekData(1,'2026-10-16').actual"), 8.6);
});

test('Historical as-of evidence and mileage stop at the same date', () => {
  const e = harness();
  assert.deepEqual(ids(e, "weeklyLoadEvidence(1,false,'2026-10-11').decisions.map(x=>x.run.id)"), ['r1', 'r2']);
  close(e("weekData(1,'2026-10-11').actual"), 3.8);
  close(e("weeklyLoadEvidence(1,false,'2026-10-11').actual"), 3.8);
});

test('Assessment mileage remains visible without becoming ordinary run-level load evidence', () => {
  const state = fixture();
  state.runs.push({...state.runs[0], id: 'assessment', date: '2026-10-14', source: 'assessment', planId: null, distanceKm: 1});
  const e = harness({state});
  close(e('weekData(1).actual'), 9.6);
  assert.equal(e('weeklyLoadEvidence(1,true).decisions.length'), 3);
  close(e('adaptiveFactorDetails(2).cumulativeFactor'), .9761124);
});

test('Exactly seven calendar days after programme start is Week 2 and closes Week 1', () => {
  const e = harness({today: '2026-10-17'});
  assert.equal(e('currentWeek()'), 2);
  assert.equal(e("trainingWeekForDate('2026-10-16')"), 1);
  assert.equal(e("trainingWeekForDate('2026-10-17')"), 2);
  assert.equal(e('weeklyReviewData(1).closed'), true);
  assert.equal(e('iso(weekStart(2))'), '2026-10-17');
  close(e('weeklyReviewData(1).loadProjected'), .9761124);
});

for (const boundary of [
  {name: 'spring forward', start: '2026-03-22', end: '2026-03-29', race: '2026-04-05', hours: 167},
  {name: 'fall back', start: '2026-10-18', end: '2026-10-25', race: '2026-11-01', hours: 169}
]) {
  test('Dutch DST ' + boundary.name + ' keeps local-date training weeks and week count correct', () => {
    const state = fixture();
    state.setup.planStart = boundary.start;
    state.setup.raceDate = boundary.race;
    state.plan = [];
    state.runs = [];
    const e = harness({state, today: boundary.end});
    assert.equal(e('currentWeek()'), 2);
    assert.equal(e('weeks()'), 3);
    assert.equal(e('iso(weekStart(2))'), boundary.end);
    assert.equal(e('weekStart(2).getHours()'), 12);
    assert.equal(e('(weekStart(2)-weekStart(1))/3600000'), boundary.hours);
    assert.equal(e('weeklyReviewData(1).closed'), true);
  });
}

test('A run on the next week boundary belongs to exactly one week', () => {
  const state = fixture();
  state.runs.push({...state.runs[0], id: 'boundary', date: '2026-10-17', planId: null, distanceKm: 2});
  const e = harness({state});
  assert.deepEqual(ids(e, 'weekData(1).runs.map(x=>x.id)'), ['r1', 'r2', 'r3']);
  assert.deepEqual(ids(e, 'weekData(2).runs.map(x=>x.id)'), ['boundary']);
  assert.equal(e("weeklyLoadEvidence(1,true).decisions.some(x=>x.run.id==='boundary')"), false);
  assert.equal(e("weeklyLoadEvidence(2,false).decisions.some(x=>x.run.id==='boundary')"), true);
});

test('A final programme week produces a final result without inventing another planned week', () => {
  const state = fixture();
  state.setup.raceDate = '2026-10-16';
  state.plan = state.plan.filter(p => p.week === 1);
  const e = harness({state});
  assert.equal(e('weeks()'), 1);
  assert.equal(e('weeklyReviewData(1).closed'), true);
  close(e('weeklyReviewData(1).loadProjected'), .9761124);
  assert.equal(e('weeklyReviewData(1).changes.length'), 0);
  const text = plain(e('weeklyReviewHtml(1)'));
  assert.match(text, /final|programme complete|after Week 1/i);
  assert.doesNotMatch(text, /applied in Week 2|projected Week 2/i);
});

test('Closed-review results respect the same factor bounds as the actual next-week prescription', () => {
  const state = fixture();
  state.setup.minFactor = .98;
  const e = harness({state});
  close(e('adaptiveFactorDetails(2).cumulativeFactor'), .98);
  close(e('weeklyReviewData(1).loadProjected'), .98);
});

test('Closed reviews show saved following-week distances without applying the adjustment twice', () => {
  const e = harness(), before = e('JSON.stringify(state.plan)');
  close(e('weeklyReviewData(1).followingPlan[0].distance'), 8);
  assert.equal(e('weeklyReviewData(1).changes.length'), 0);
  const text = plain(e('weeklyReviewHtml(1)'));
  assert.match(text, /Saved Week 2 workout 8\.0 km/);
  assert.doesNotMatch(text, /7\.8 km/);
  assert.equal(e('JSON.stringify(state.plan)'), before);
});

test('Disabling adaptive load holds both open and closed review factors at baseline', () => {
  const state = fixture();
  state.setup.adaptive = false;
  for (const today of ['2026-10-13', '2026-10-18']) {
    const e = harness({state, today});
    close(e('weeklyReviewData(1).loadApplied'), 1);
    close(e('weeklyReviewData(1).loadProjected'), 1);
    close(e('provisionalWeeklyAdjustment(1).cumulativeFactor'), 1);
    close(e('provisionalWeeklyAdjustment(1).weeklyLearningDelta'), 0);
    assert.doesNotMatch(plain(e('weeklyReviewHtml(1)')), /Load progressing|Load reduced/);
  }
});

test('The Log load trace also holds baseline when adaptive load is disabled', () => {
  const state = fixture();
  state.setup.adaptive = false;
  const e = harness({state});
  close(e("pathwayEvidenceTrace(state.runs[2],'load').projected"), 1);
  close(e("pathwayEvidenceTrace(state.runs[2],'load').projected"), e('weeklyReviewData(1).loadProjected'));
});

function reentryFixture(completedSteps) {
  const state = fixture();
  state.programPauses = [{id: 'illness', reason: 'illness', startDate: '2026-10-03', endDate: '2026-10-09'}];
  const dates = ['2026-10-10', '2026-10-11', '2026-10-13'];
  const distances = [4.8, 6, 7];
  state.plan = dates.slice(0, completedSteps).map((date, index) => ({
    id: date + '-Easy', date, week: 1, type: 'Easy', distance: distances[index],
    zone: {pace: 480, power: 200, hr: 145},
    pauseReentry: true, pauseReentryStep: index + 1, pauseReentryTotal: 3,
    pauseReentryReason: 'illness', pauseReentryOriginalDistance: 8
  }));
  state.runs = state.plan.map((p, index) => ({
    id: 'reentry-' + index, date: p.date, planId: p.id, type: p.type,
    distanceKm: p.distance, fixtureScore: 88, powerDrift: 0, rpe: 4, pain: 0
  }));
  state.plan.push(...['2026-10-18', '2026-10-25', '2026-11-01'].map((date, index) => ({
    id: date + '-Easy', date, week: index + 2, type: 'Easy', distance: 8,
    zone: {pace: 480, power: 200, hr: 145}
  })));
  return state;
}

test('Regenerating after all three illness re-entry sessions does not restart the sequence', () => {
  const e = harness({state: reentryFixture(3)});
  const beforePlan = e('JSON.stringify(state.plan)'), beforeRuns = e('JSON.stringify(state.runs)');
  e("var reentryResult=applyProgrammePausesToPlan(state.plan,state.programPauses,{nowIso:'2026-10-18'});");
  assert.deepEqual(ids(e, "reentryResult.filter(p=>p.date>='2026-10-18').map(p=>p.distance)"), [8, 8, 8]);
  assert.equal(e("reentryResult.filter(p=>p.date>='2026-10-18').some(p=>p.pauseReentry)"), false);
  assert.deepEqual(ids(e, "reentryResult.filter(p=>p.date<'2026-10-18')"), ids(e, "state.plan.filter(p=>p.date<'2026-10-18')"));
  assert.equal(e('JSON.stringify(state.plan)'), beforePlan);
  assert.equal(e('JSON.stringify(state.runs)'), beforeRuns);
});

test('Regenerating a partially completed illness return continues at steps 2 and 3', () => {
  const e = harness({state: reentryFixture(1)});
  e("var reentryResult=applyProgrammePausesToPlan(state.plan,state.programPauses,{nowIso:'2026-10-18'});");
  assert.deepEqual(ids(e, "reentryResult.filter(p=>p.date>='2026-10-18').map(p=>p.pauseReentryStep||null)"), [2, 3, null]);
  assert.deepEqual(ids(e, "reentryResult.filter(p=>p.date>='2026-10-18').map(p=>p.distance)"), [6, 7, 8]);
  assert.deepEqual(ids(e, 'reentryResult[0]'), ids(e, 'state.plan[0]'));
});

test('A completed re-entry session today is preserved and counted before later sessions', () => {
  const state = reentryFixture(1);
  const e = harness({state, today: '2026-10-10'});
  e("var reentryResult=applyProgrammePausesToPlan(state.plan,state.programPauses,{nowIso:'2026-10-10'});");
  assert.deepEqual(ids(e, 'reentryResult[0]'), ids(e, 'state.plan[0]'));
  assert.deepEqual(ids(e, "reentryResult.filter(p=>p.date>'2026-10-10').map(p=>p.pauseReentryStep||null)"), [2, 3, null]);
});

test('A later illness pause starts its own return and repeated application keeps original distances', () => {
  const state = reentryFixture(3);
  state.programPauses.push({id: 'second-illness', reason: 'illness', startDate: '2026-10-15', endDate: '2026-10-17'});
  const e = harness({state});
  e("var firstReentry=applyProgrammePausesToPlan(state.plan,state.programPauses,{nowIso:'2026-10-18'});");
  assert.deepEqual(ids(e, "firstReentry.filter(p=>p.date>='2026-10-18').map(p=>p.pauseReentryStep||null)"), [1, 2, null]);
  assert.deepEqual(ids(e, "firstReentry.filter(p=>p.date>='2026-10-18').map(p=>p.distance)"), [5.6, 6.8, 8]);
  assert.deepEqual(ids(e, "firstReentry.filter(p=>p.date>='2026-10-18').map(p=>p.pauseReentryPauseId||null)"), ['second-illness', 'second-illness', null]);
  e("var repeatedReentry=applyProgrammePausesToPlan(firstReentry,state.programPauses,{nowIso:'2026-10-18'});");
  assert.deepEqual(ids(e, 'repeatedReentry'), ids(e, 'firstReentry'));
});

test('Today and Progress keep applied pace separate from current-week pace evidence', () => {
  const e = harness({paceFrom: '2026-10-18', pace: 1.005});
  close(e('pacePowerCommittedFactor()'), 1);
  close(e('pacePowerProvisionalFactor()'), 1.005);
  close(e('pathwayFactorSummary().pace.current'), 1);
  assert.match(plain(e('todayWeekCard(athleteState())')), /1\.000 Pace & Power/);
});

test('Future planned dates cannot commit the current week\'s provisional pace evidence early', () => {
  const e = harness({paceFrom: '2026-10-18', pace: 1.005});
  close(e("pacePowerCommittedFactor('2026-10-25')"), 1);
  close(e('weeklyReviewData(3).appliedPace'), 1);
  close(e('weeklyReviewData(3).provisionalPace'), 1);
});

console.log(`Weekly review regression result: ${passed}/${passed + failed} passed`);
process.exitCode = failed ? 1 : 0;
