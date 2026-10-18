'use strict';

// Run with: node calibration-regression-tests.js
// Every calibration, target, metric and save function below is extracted from
// app.js. Browser UI, storage and the already-tested weekly learning input are
// controlled dependencies; this suite never loads or modifies athlete data.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const sourceFlag = process.argv.indexOf('--source');
const sourcePath = sourceFlag < 0 ? path.join(__dirname, 'app.js') : process.argv[sourceFlag + 1];
if (!sourcePath) throw Error('--source requires an app.js path');
const source = fs.readFileSync(sourcePath, 'utf8');
process.env.TZ = 'Europe/Amsterdam';

function extractFunction(name) {
  const match = new RegExp('\\bfunction\\s+' + name + '\\s*\\(').exec(source);
  assert(match, 'Application function exists: ' + name);
  for (let end = source.indexOf('}', match.index); end >= 0; end = source.indexOf('}', end + 1)) {
    const candidate = source.slice(match.index, end + 1);
    try { new vm.Script('(' + candidate + '\n)'); return candidate; }
    catch (_) { /* Ask the parser again at the next possible function end. */ }
  }
  throw Error('Could not extract ' + name);
}
function extractConstant(name) {
  const match = source.match(new RegExp('const ' + name + '=[^;]+;'));
  assert(match, 'Application constant exists: ' + name);
  return match[0];
}
const coreEnd = source.indexOf('let preview=null;');
const calibrationStart = source.indexOf('/* BEGIN calibration-core */');
const calibrationEnd = source.indexOf('/* END calibration-core */');
const datesStart = source.indexOf('const DAY=');
const datesEnd = source.indexOf('const dec=', datesStart);
assert(coreEnd > 0 && calibrationEnd > calibrationStart && calibrationStart > coreEnd);
assert(datesEnd > datesStart && datesStart > coreEnd);
const calibrationSource = source.slice(calibrationStart, calibrationEnd);
const dateSource = source.slice(datesStart, datesEnd);
const functionSource = [
  'baselineOn', 'zone', 'metrics', 'assessmentRunId', 'syncAssessmentRun',
  'calibrationBenchmarkOn', 'baseType', 'runIntensityRatio', 'save',
  'applySettingsDraft', 'weeks', 'weekStart', 'currentWeek', 'reviewWeekForDate', 'trainingWeekForDate'
].map(extractFunction).join('\n');
const constants = ['zoneDef', 'TYPE_ALIASES'].map(extractConstant).join('\n');
const coreContext = vm.createContext({});
vm.runInContext(source.slice(0, coreEnd), coreContext, {filename: 'app-core.js'});
const CORE = coreContext.ARC_CORE;

function fixture(overrides = {}) {
  const setup = {
    planStart: '2026-10-10', raceDate: '2026-11-07', raceName: 'Regression fixture',
    raceDistance: 42.195, targetTime: 15300, currentWeekly: 35, currentLongest: 18,
    testDistance: 5, testTime: 491 * 5 / 1.3, criticalPower: 294, thresholdHr: 160,
    bodyWeight: 90, maxWeekly: 65, growth: .07, peakLong: 32, taperDays: 14,
    minFactor: .85, maxFactor: 1.05, adaptive: true
  };
  const state = {
    setup, assessments: [], runs: [], plan: [], injuries: [], storageRevision: 0,
    days: [['Monday', false, 'Easy'], ['Tuesday', true, 'Intervals'],
      ['Wednesday', true, 'Easy'], ['Thursday', true, 'Tempo'],
      ['Friday', false, 'Easy'], ['Saturday', true, 'Easy'], ['Sunday', true, 'Long run']],
    ...overrides
  };
  state.setup = {...setup, ...overrides.setup};
  const context = vm.createContext({
    state, CORE, mockDate: '2026-10-18', mockFactor: 1, factorReads: 0,
    mockStorageFailure: false, persistedText: null, events: [], console
  });
  vm.runInContext(`
    const document = {getElementById() { return {}; }};
    ${dateSource}
    today = function () { return dte(mockDate); };
    ${constants}
    function pacePowerCommittedFactor() { factorReads++; return mockFactor; }
    function trainingEvidence() {
      return {index: 100 * mockFactor, adjustment: mockFactor, events: []};
    }
    const UNDO_KEY = 'fixture-undo', MIGRATION_MARKER = 'fixture-migration';
    const localStorage = {
      setItem(key, value) { events.push(['localStorage', key, value]); },
      removeItem(key) { events.push(['removeItem', key]); }
    };
    let appStartupInProgress = false, startupStorageFailure = null;
    let raceReadinessHistoryDirty = false;
    function reconcileShoeUsage() {}
    function prunePlannedShoeAssignments() {}
    function compactHistoricalActivityStreams() {}
    function updateRuntimeDomainRevisions() { return ['setup', 'runs']; }
    function recordDiagnostic(label, error) { events.push(['diagnostic', label, error.message]); }
    function writePrimaryWithQuotaRecovery(text) {
      if (mockStorageFailure) throw Error('Controlled storage failure');
      persistedText = text;
    }
    function writeMirrorBestEffort() { return true; }
    function reclaimObsoleteStorage() {}
    function scheduleAuthoritativeShoeSnapshotRefresh() {}
    function withPlanLoader(label, callback) { return callback(); }
    function buildPlan() { events.push(['buildPlan', state.setup.criticalPower]); return true; }
    function invalidateShoeDerivedPlanningCaches() {}
    function closeDialog() {}
    function renderAll() {}
    function toast(message, bad) { events.push(['toast', message, Boolean(bad)]); }
    function initialProgrammePrediction() { return 15300; }
    ${calibrationSource}
    ${functionSource}
  `, context, {filename: 'app-calibration-isolated.js'});
  return context;
}

let passed = 0, failed = 0;
function test(name, run) {
  try { run(); passed++; console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.stack); }
}
function approx(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}
const candidate = (context, changes) => ({...context.state.setup, ...changes});
const serial = value => JSON.stringify(value);
const realRun = (changes = {}) => ({
  id: 'run-old', date: '2026-10-17', type: 'Easy', distanceKm: 5,
  durationSec: 2400, avgPower: 270, avgHr: 145, ...changes
});

test('Migration is idempotent and leaves unknown measurement and confirmation dates unknown', () => {
  const c = fixture(), calibration = c.ensureCalibrationState();
  assert.equal(calibration.version, 1); assert.equal(calibration.records.length, 4);
  assert.ok(calibration.records.every(r => r.measuredOn === null && r.confirmedOn === null && r.source === 'Legacy setup'));
  const before = serial(calibration); c.ensureCalibrationState();
  assert.equal(serial(calibration), before); assert.equal(c.factorReads, 0);
});

test('Dated pre-programme assessment wins in baselineOn; earlier history uses legacy fallback', () => {
  const c = fixture({assessments: [{id: 'a1', date: '2026-10-01', valid: true, time: 1600, distance: 5, criticalPower: 280, thresholdHr: 158}]});
  const current = c.baselineOn(), earlier = c.baselineOn('2026-09-01');
  assert.equal(current.cp, 280); assert.equal(current.pace, 320); assert.equal(current.hr, 158);
  assert.equal(earlier.cp, 294); assert.equal(current.calibration.power.assessmentId, 'a1');
});

test('Future assessments, explicit values and measurements are excluded even for future workouts', () => {
  const c = fixture({assessments: [{id: 'future', date: '2026-10-20', valid: true, time: 1500, distance: 5, criticalPower: 999}]});
  c.ensureCalibrationState().records.push(
    {id: 'bad1', kind: 'power', value: 888, effectiveOn: '2026-10-19', source: 'test'},
    {id: 'bad2', kind: 'power', value: 777, effectiveOn: '2026-10-18', measuredOn: '2026-10-19', source: 'test'}
  );
  assert.equal(c.calibrationFor('power', '2026-11-01').value, 294);
  assert.equal(c.zone('Easy', '2026-11-01').power, 229);
});

test('Settings value wins over older and same-day assessments, independent of import order', () => {
  const c = fixture({assessments: [{id: 'old', date: '2026-10-01', valid: true, time: 1600, distance: 5, criticalPower: 280}]});
  const previous = {...c.state.setup}, next = candidate(c, {criticalPower: 254});
  c.recordCalibrationSettingChanges(previous, next, {source: 'Stryd'}); c.state.setup = next;
  assert.equal(c.baselineOn().cp, 254);
  c.state.assessments.push({id: 'same-day', date: '2026-10-18', valid: true, time: 1600, distance: 5, criticalPower: 290});
  assert.equal(c.baselineOn().cp, 254);
  c.applyCalibrationReview(candidate(c, {criticalPower: 255}), {kinds: ['power'], sources: {power: 'Manual correction'}});
  assert.equal(c.baselineOn().cp, 255);
});

test('Real Easy zone changes 229 W to 198 W after CP 294 to 254; pace stays 491 s/km', () => {
  const c = fixture(), previous = c.zone('Easy', '2026-10-17');
  const past = {date: '2026-10-17', zone: previous}; c.state.plan = [past];
  assert.equal(previous.power, 229); approx(previous.pace, 491);
  const historical = serial(past), benchmark = serial(c.calibrationBenchmarkOn());
  const result = c.applyCalibrationReview(candidate(c, {criticalPower: 254}), {
    kinds: ['power'], sources: {power: 'Stryd CP'}, measuredOn: {power: '2026-10-18'}, remeasuredKinds: ['power']
  });
  const next = c.zone('Easy', '2026-10-25');
  assert.equal(next.power, 198); approx(next.pace, 491); assert.equal(next.hr, previous.hr);
  assert.equal(serial(past), historical); assert.equal(c.zone('Easy', '2026-10-17').power, 229);
  assert.equal(serial(c.calibrationBenchmarkOn()), benchmark);
  assert.equal(next.calibration.power.value, 254); assert.equal(previous.calibration.power.value, 294);
  assert.equal(next.calibration.power.source, 'Stryd CP');
  assert.deepEqual(Array.from(result.changedKinds), ['power']); assert.equal(result.rebuildRequired, true);
});

test('New CP anchor removes prior learning multiplication only from power', () => {
  const c = fixture(); c.mockFactor = 1.04; c.ensureCalibrationState();
  c.applyCalibrationReview(candidate(c, {criticalPower: 254}), {kinds: ['power'], sources: {power: 'Stryd'}});
  approx(c.calibrationAdjustedFactor('power'), 1); approx(c.calibrationAdjustedFactor('pace'), 1.04);
  assert.equal(c.zone('Easy', '2026-10-25').power, 198); approx(c.zone('Easy').pace, 491 / 1.04);
  c.mockFactor = 1.06;
  approx(c.calibrationAdjustedFactor('power'), 1.06 / 1.04); approx(c.calibrationAdjustedFactor('pace'), 1.06);
});

test('Confirmation refreshes review date while retaining source, measurement and adaptive anchor', () => {
  const c = fixture(); c.mockFactor = 1.04;
  c.applyCalibrationReview(candidate(c, {criticalPower: 254}), {
    kinds: ['power'], sources: {power: 'Stryd CP'}, measuredOn: {power: '2026-10-15'}, remeasuredKinds: ['power']
  });
  const old = c.calibrationFor('power'); c.mockDate = '2026-10-19'; c.mockFactor = 1.06;
  const result = c.applyCalibrationReview(candidate(c, {criticalPower: 254}), {kinds: ['power'], sources: {power: 'Ignored confirmation source'}});
  const record = c.calibrationFor('power');
  assert.equal(record.source, 'Stryd CP'); assert.equal(record.measuredOn, '2026-10-15');
  assert.equal(record.confirmedOn, '2026-10-19'); assert.equal(record.anchorFactor, old.anchorFactor);
  assert.equal(result.rebuildRequired, false); approx(c.calibrationAdjustedFactor('power'), 1.06 / 1.04);
});

test('New measurement at unchanged CP re-anchors power and leaves pace adaptation intact', () => {
  const c = fixture(); c.ensureCalibrationState(); c.mockFactor = 1.04;
  const result = c.applyCalibrationReview(candidate(c, {criticalPower: 294}), {
    kinds: ['power'], sources: {power: 'Stryd CP'}, measuredOn: {power: '2026-10-18'}, remeasuredKinds: ['power']
  });
  assert.equal(result.changedKinds.length, 0); assert.equal(result.rebuildRequired, true);
  approx(c.calibrationAdjustedFactor('power'), 1); approx(c.calibrationAdjustedFactor('pace'), 1.04);
});

test('Equal-pace benchmark with a different distance is a new pace anchor and projection benchmark', () => {
  const c = fixture({setup: {testTime: 1500, testDistance: 5}}); c.mockFactor = 1.04;
  const result = c.applyCalibrationReview(candidate(c, {testTime: 3000, testDistance: 10}), {kinds: ['pace'], sources: {pace: 'Timed 10K'}});
  assert.deepEqual(Array.from(result.changedKinds), ['pace']); assert.equal(result.rebuildRequired, true);
  assert.equal(c.calibrationBenchmarkOn().distance, 5); approx(c.calibrationBenchmarkOn().time, 3000 * Math.pow(.5, 1.06)); assert.equal(c.calibrationBenchmarkOn().originalDistance, 10); assert.equal(c.calibrationBenchmarkOn().originalTime, 3000);
  approx(c.calibrationAdjustedFactor('pace'), 1); approx(c.calibrationAdjustedFactor('power'), 1.04);
});

test('Historical metrics retain W/kg and efficiency after body-weight update', () => {
  const run = realRun(), c = fixture({runs: [run]}), before = c.metrics(run);
  c.applyCalibrationReview(candidate(c, {bodyWeight: 80}), {
    kinds: ['weight'], measuredOn: {weight: '2026-10-18'}, sources: {weight: 'Scale'}, remeasuredKinds: ['weight']
  });
  assert.equal(run.calibrationWeight.value, 90); assert.equal(run.calibrationWeight.estimated, true);
  approx(c.metrics(run).wkg, 3); approx(c.metrics(run).effect, before.effect);
  assert.equal(c.calibrationWeightForRun({date: '2026-10-01'}), 90);
  assert.equal(c.calibrationWeightForRun({date: '2026-10-17'}), 90);
  assert.equal(c.calibrationWeightForRun({date: '2026-10-18'}), 80);
  approx(c.metrics(realRun({date: '2026-10-18'})).wkg, 270 / 80);
});

test('Imported W/kg conversion mass becomes a stable activity weight snapshot', () => {
  const c = fixture(), run = realRun({date: '2026-10-05', powerConversion: {
    from: 'W/kg', weightKg: 92, date: '2026-10-05', source: 'Athlete-confirmed historical weight', estimated: false
  }});
  c.snapshotRunCalibrationWeight(run);
  assert.equal(c.calibrationWeightForRun(run), 92); assert.equal(run.calibrationWeight.estimated, false);
  approx(c.metrics(run).wkg, 270 / 92);
  const legacy = realRun({powerConversion: {from: 'W/kg', weightKg: 90, source: 'Legacy weight estimate', estimated: true}});
  c.snapshotRunCalibrationWeight(legacy);
  assert.equal(legacy.calibrationWeight.estimated, true, 'Converting units does not turn an estimated weight into a measured weight');
});

test('Invalid or deleted assessments and their later confirmations stop contributing', () => {
  const a = {id: 'a1', date: '2026-10-15', valid: true, time: 1600, distance: 5, criticalPower: 280};
  const c = fixture({assessments: [a]}); c.recordCalibrationReview(['power']);
  assert.equal(c.calibrationFor('power').value, 280); a.valid = false;
  assert.equal(c.calibrationFor('power').value, 294); a.valid = true;
  assert.equal(c.calibrationFor('power').value, 280); c.state.assessments = [];
  assert.equal(c.calibrationFor('power').value, 294);
});

test('Edited assessment contributes only its current values and migration remains idempotent', () => {
  const a = {id: 'edited', date: '2026-10-15', valid: true, time: 1600, distance: 5, criticalPower: 280};
  const c = fixture({assessments: [a]}); c.ensureCalibrationState();
  a.criticalPower = 275; a.time = 3200; a.distance = 10;
  assert.equal(c.calibrationFor('power').value, 275); assert.equal(c.calibrationFor('pace').testDistance, 10);
  const before = serial(c.state.calibration); c.ensureCalibrationState();
  assert.equal(serial(c.state.calibration), before);
});

test('Confirmation uses an active assessment rather than stale Settings and does not rebuild targets', () => {
  const c = fixture({assessments: [{id: 'a1', date: '2026-10-15', valid: true, time: 1600, distance: 5, criticalPower: 280}]});
  const result = c.applyCalibrationReview(candidate(c, {criticalPower: 280}), {kinds: ['power']});
  assert.equal(result.rebuildRequired, false); assert.equal(c.calibrationFor('power').source, 'Fitness assessment');
  assert.equal(c.state.setup.criticalPower, 280);
});

test('Invalid multi-field candidate or future measurement fails before any state mutation', () => {
  const c = fixture({runs: [realRun()]}), before = serial(c.state);
  assert.throws(() => c.applyCalibrationReview(candidate(c, {criticalPower: 10, bodyWeight: 80}), {kinds: ['weight', 'power']}), /50 and 1500/);
  assert.equal(serial(c.state), before);
  assert.throws(() => c.applyCalibrationReview(candidate(c, {criticalPower: 254}), {kinds: ['power'], measuredOn: {power: '2026-10-19'}}), /Measurement dates/);
  assert.equal(serial(c.state), before);
});

test('Explicit HR review enforces the same whole-bpm bounds as Settings validation', () => {
  for (const thresholdHr of [50, 245, 160.5]) {
    const c = fixture(), before = serial(c.state);
    assert.throws(() => c.applyCalibrationReview(candidate(c, {thresholdHr}), {kinds: ['hr']}), /whole number between 60 and 240/);
    assert.equal(serial(c.state), before);
  }
});

test('Later confirmation is excluded from historical as-of provenance', () => {
  const c = fixture(); c.ensureCalibrationState(); const old = c.calibrationFor('power', '2026-10-17');
  c.recordCalibrationReview(['power']); assert.equal(c.calibrationFor('power').confirmedOn, '2026-10-18');
  assert.equal(c.calibrationFor('power', '2026-10-17').id, old.id);
});

test('User-entered source is bounded and strips control characters', () => {
  const c = fixture(); c.applyCalibrationReview(candidate(c, {criticalPower: 254}), {
    kinds: ['power'], sources: {power: 'Stryd\u0000' + 'x'.repeat(400)}
  });
  const value = c.calibrationFor('power').source;
  assert.ok(value.length <= 240); assert.ok(!value.includes('\u0000'));
});

test('Missing valid baseline returns a neutral adjustment', () => {
  const c = fixture({setup: {criticalPower: null}});
  assert.equal(c.calibrationFor('power'), null); assert.equal(c.calibrationAdjustedFactor('power'), 1);
});

test('runIntensityRatio uses dated raw anchors without entering learned-factor calculation', () => {
  const c = fixture();
  c.applyCalibrationReview(candidate(c, {criticalPower: 254}), {kinds: ['power'], sources: {power: 'Stryd'}});
  c.pacePowerCommittedFactor = () => { throw Error('Recursive factor dependency'); };
  approx(c.runIntensityRatio(realRun({avgPower: 237})), 237 / 294);
  approx(c.runIntensityRatio(realRun({date: '2026-10-18', avgPower: 237})), 237 / 254);
  approx(c.runIntensityRatio(realRun({date: '2026-10-18', avgPower: null, avgHr: 144})), 144 / 160);
});

test('syncAssessmentRun never manufactures average HR or power from physiological thresholds', () => {
  const a = {id: 'a1', date: '2026-10-15', valid: true, distance: 5, time: 1500, criticalPower: 294, thresholdHr: 160};
  const c = fixture({assessments: [a], plan: [{id: 'p1', date: a.date, type: 'Fitness assessment'}]});
  c.syncAssessmentRun(a); const run = c.state.runs[0];
  assert.equal(run.avgPower, null); assert.equal(run.avgHr, null); assert.equal(run.planId, 'p1');
  assert.equal(run.distanceKm, 5); assert.equal(run.durationSec, 1500); assert.equal(c.metrics(run).wkg, null);
});

test('Assessment sync preserves previously saved averages and accepts explicit new averages', () => {
  const a = {id: 'a1', date: '2026-10-15', valid: true, distance: 5, time: 1500, criticalPower: 294, thresholdHr: 160};
  const c = fixture({assessments: [a], runs: [realRun({id: 'assessment-run-a1', assessmentId: 'a1', avgPower: 237, avgHr: 144})]});
  c.syncAssessmentRun(a); assert.equal(c.state.runs.length, 1);
  assert.equal(c.state.runs[0].avgPower, 237); assert.equal(c.state.runs[0].avgHr, 144);
  a.avgPower = 239; a.avgHr = 146; c.syncAssessmentRun(a);
  assert.equal(c.state.runs[0].avgPower, 239); assert.equal(c.state.runs[0].avgHr, 146);
});

test('Real Settings apply records old baselines and activity weight before replacing setup', () => {
  const run = realRun(), c = fixture({runs: [run]});
  c.applySettingsDraft(candidate(c, {criticalPower: 254, bodyWeight: 80}), c.state.days);
  assert.equal(c.state.setup.criticalPower, 254); assert.equal(c.calibrationFor('power').source, 'Settings entry');
  assert.equal(c.zone('Easy').power, 198); assert.equal(run.calibrationWeight.value, 90);
  assert.equal(c.calibrationFor('weight', '2026-10-17').value, 90);
  assert.ok(c.events.some(event => event[0] === 'buildPlan' && event[1] === 254));
  assert.equal(JSON.parse(c.persistedText).calibration.records.some(record => record.kind === 'power' && record.value === 254), true);
});

test('Real save persists calibration and weight snapshots in a valid backup that round-trips', () => {
  const c = fixture({runs: [realRun()]});
  c.applyCalibrationReview(candidate(c, {criticalPower: 254, bodyWeight: 80}), {
    kinds: ['power', 'weight'], sources: {power: 'Stryd', weight: 'Scale'}
  });
  assert.equal(c.save(), true); const restored = JSON.parse(c.persistedText);
  assert.equal(CORE.validateSetup(restored.setup).length, 0);
  const result = CORE.validateBackup(restored, {today: '2026-10-18'});
  assert.equal(result.valid, true, serial(result.errors));
  const again = fixture(restored); assert.equal(again.zone('Easy').power, 198);
  approx(again.metrics(again.state.runs[0]).wkg, 3);
  assert.equal(again.calibrationFor('power').source, 'Stryd');
});

test('Real save reports storage failure without replacing the previously persisted snapshot', () => {
  const c = fixture(); assert.equal(c.save(), true); const persisted = c.persistedText;
  const previousRevision = c.state.storageRevision; c.mockStorageFailure = true;
  c.applyCalibrationReview(candidate(c, {criticalPower: 254}), {kinds: ['power']});
  assert.equal(c.save(), false); assert.equal(c.persistedText, persisted);
  assert.equal(c.state.storageRevision, previousRevision);
  assert.ok(c.events.some(event => event[0] === 'toast' && event[2] === true));
});

console.log(`${passed}/${passed + failed} calibration integration regression cases passed`);
process.exitCode = failed ? 1 : 0;
