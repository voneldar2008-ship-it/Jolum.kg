import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BusSimulationEngine,
  fromCycleProgress,
  interpolateBearing,
  precomputePolyline,
  samplePrecomputedPolyline,
  toCycleProgress,
} from './BusSimulationEngine';
import { INITIAL_BUSES, INITIAL_ROUTES } from '../data/initialData';

test('precomputePolyline and samplePrecomputedPolyline accurately interpolate midpoints', () => {
  const geom = precomputePolyline([
    [40.92, 72.97],
    [40.94, 72.99],
    [40.96, 73.01],
  ]);

  assert.ok(geom.totalLength > 0);
  const start = samplePrecomputedPolyline(geom, 0);
  assert.ok(Math.abs(start.lat - 40.92) < 1e-6);

  const mid = samplePrecomputedPolyline(geom, 0.5);
  assert.ok(Math.abs(mid.lat - 40.94) < 0.001);
  assert.ok(Math.abs(mid.lng - 72.99) < 0.001);

  const end = samplePrecomputedPolyline(geom, 1);
  assert.ok(Math.abs(end.lat - 40.96) < 1e-6);
});

test('interpolateBearing takes shortest arc across 0/360 boundary', () => {
  const midCrossing = interpolateBearing(350, 10, 0.5);
  assert.ok(Math.abs(midCrossing - 0) < 0.01 || Math.abs(midCrossing - 360) < 0.01);

  const reverseCrossing = interpolateBearing(10, 350, 0.5);
  assert.ok(Math.abs(reverseCrossing - 0) < 0.01 || Math.abs(reverseCrossing - 360) < 0.01);
});

test('cycle progress roundtrips forward and backward directions smoothly', () => {
  const cpForward = toCycleProgress(0.35, 'forward');
  const fwd = fromCycleProgress(cpForward);
  assert.equal(fwd.direction, 'forward');
  assert.ok(Math.abs(fwd.progress - 0.35) < 1e-9);

  const cpBackward = toCycleProgress(0.75, 'backward');
  assert.equal(cpBackward, 1.25);
  const back = fromCycleProgress(cpBackward);
  assert.equal(back.direction, 'backward');
  assert.ok(Math.abs(back.progress - 0.75) < 1e-9);
});

test('BusSimulationEngine provides smooth 60 FPS sub-tick coordinate interpolation', () => {
  const engine = new BusSimulationEngine(INITIAL_ROUTES, [INITIAL_BUSES[0]], {
    tickIntervalMs: 1000,
    baseSpeedScale: 4,
  });

  const t0 = 10000;
  engine.syncBuses([INITIAL_BUSES[0]], t0);
  engine.step(t0, 1.0);

  const poseAtStart = engine.getInterpolatedSnapshot(t0)[0];
  const poseAtMidFrame = engine.getInterpolatedSnapshot(t0 + 500)[0];
  const poseAtEndFrame = engine.getInterpolatedSnapshot(t0 + 1000)[0];

  assert.ok(poseAtMidFrame.progress > poseAtStart.progress);
  assert.ok(poseAtEndFrame.progress > poseAtMidFrame.progress);

  // Midpoint coordinate lies smoothly between start and end
  const latBetween =
    (poseAtMidFrame.lat >= Math.min(poseAtStart.lat, poseAtEndFrame.lat) - 1e-6) &&
    (poseAtMidFrame.lat <= Math.max(poseAtStart.lat, poseAtEndFrame.lat) + 1e-6);
  assert.ok(latBetween, 'Interpolated latitude must lie smoothly between tick endpoints');
});

test('BusSimulationEngine freezes at exact interpolated pose when paused', () => {
  const engine = new BusSimulationEngine(INITIAL_ROUTES, [INITIAL_BUSES[0]], {
    tickIntervalMs: 1000,
    baseSpeedScale: 4,
  });

  const t0 = 20000;
  engine.syncBuses([INITIAL_BUSES[0]], t0);
  engine.step(t0, 1.0);

  const midPose = engine.getInterpolatedSnapshot(t0 + 400)[0];
  engine.setSimulating(false, t0 + 400);

  // Querying later while paused must remain frozen at midPose
  const pausedLater = engine.getInterpolatedSnapshot(t0 + 5000)[0];
  assert.ok(Math.abs(pausedLater.lat - midPose.lat) < 1e-7);
  assert.ok(Math.abs(pausedLater.lng - midPose.lng) < 1e-7);
  assert.ok(Math.abs(pausedLater.progress - midPose.progress) < 1e-7);
});
