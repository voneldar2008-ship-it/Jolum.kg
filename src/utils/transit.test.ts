import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistance,
  calculateBearing,
  interpolatePolyline,
  advanceBus,
  findTripOptions,
  findNearestStops,
  calculateETAForStop,
  buildWeeklyLoadSeries,
  summarizeWeeklyLoad,
} from './transit';
import { INITIAL_ROUTES, INITIAL_STOPS, INITIAL_BUSES, INITIAL_WEEKLY_LOAD } from '../data/initialData';

test('calculateDistance computes realistic distance between Manas stops', () => {
  const dist = calculateDistance(40.9256, 72.9758, 40.9331, 72.9845);
  // Distance between terminal (Автовокзал) and center (Мэрия) should be around 1.1 km
  assert.ok(dist > 800 && dist < 2500, `Expected distance ~1100m, got ${dist}`);
});

test('calculateBearing returns valid angle between 0 and 360', () => {
  const bearing = calculateBearing(40.9256, 72.9758, 40.9331, 72.9845);
  assert.ok(bearing >= 0 && bearing <= 360, `Invalid bearing: ${bearing}`);
});

test('interpolatePolyline works at bounds and midpoint', () => {
  const waypoints: [number, number][] = [
    [42.5, 71.7],
    [42.6, 71.8],
  ];

  const start = interpolatePolyline(waypoints, 0);
  assert.equal(start.lat, 42.5);
  assert.equal(start.lng, 71.7);

  const end = interpolatePolyline(waypoints, 1);
  assert.equal(end.lat, 42.6);
  assert.equal(end.lng, 71.8);

  const mid = interpolatePolyline(waypoints, 0.5);
  assert.ok(Math.abs(mid.lat - 42.55) < 0.001);
  assert.ok(Math.abs(mid.lng - 71.75) < 0.001);
});

test('advanceBus moves bus forward along route', () => {
  const bus = INITIAL_BUSES[0];
  const route = INITIAL_ROUTES.find((r) => r.id === bus.routeId)!;

  const advanced = advanceBus(bus, route, 10, 1);
  assert.ok(advanced.progress > bus.progress, 'Bus progress should increase');
  assert.ok(advanced.speedKmh >= 15 && advanced.speedKmh <= 60, 'Speed should be reasonable');
  assert.ok(advanced.nextStopId, 'Next stop should be defined');
});

test('findTripOptions finds direct route for connected stops', () => {
  // s1 (Автовокзал) to s8 (Чыгыш) on route r1
  const options = findTripOptions('s1', 's8', INITIAL_ROUTES, INITIAL_STOPS);
  assert.ok(options.length > 0, 'Should find at least one route option');

  const direct = options.find((o) => o.type === 'direct');
  assert.ok(direct, 'Should find a direct route');
  assert.equal(direct?.segments[0].route.id, 'r1');
  assert.equal(direct?.transfersCount, 0);
});

test('findTripOptions finds transfer route between disconnected lines', () => {
  // s14 (Индустриальная) to s8 (Чыгыш)
  // s14 is on r3, s8 is on r1. Transfer can occur at s4 (Мэрия) or s5 or s7!
  const options = findTripOptions('s14', 's8', INITIAL_ROUTES, INITIAL_STOPS);
  assert.ok(options.length > 0, 'Should find transfer options');
  const transfer = options.find((o) => o.type === 'transfer');
  assert.ok(transfer, 'Should find at least one transfer option');
  assert.equal(transfer?.transfersCount, 1);
  assert.equal(transfer?.segments.length, 2);
});

test('findNearestStops correctly sorts by proximity', () => {
  // Coordinates right near s4 (Мэрия города Манас)
  const nearest = findNearestStops(40.9331, 72.9845, INITIAL_STOPS, 3);
  assert.equal(nearest.length, 3);
  assert.equal(nearest[0].stop.id, 's4', 'First stop should be s4 (Мэрия)');
  assert.ok(nearest[0].distanceMeters < 10, 'Distance should be under 10m');
  assert.ok(nearest[1].distanceMeters > nearest[0].distanceMeters);
});

test('calculateETAForStop computes ETA when bus is approaching', () => {
  const route = INITIAL_ROUTES[0];
  const bus = {
    ...INITIAL_BUSES[0],
    progress: 0.1, // at start of line
    direction: 'forward' as const,
  };
  // s8 is end stop
  const eta = calculateETAForStop(bus, 's8', route, INITIAL_STOPS);
  assert.ok(typeof eta === 'number' && eta > 0, 'ETA should be positive number');
});

test('buildWeeklyLoadSeries returns 7 days localized for RU, KG, and EN', () => {
  const ruSeries = buildWeeklyLoadSeries(INITIAL_WEEKLY_LOAD, 'ru', null);
  assert.equal(ruSeries.length, 7);
  assert.equal(ruSeries[0].dayLabel, 'Пн');
  assert.equal(ruSeries[6].dayLabel, 'Вс');

  const kgSeries = buildWeeklyLoadSeries(INITIAL_WEEKLY_LOAD, 'kg', 'r1');
  assert.equal(kgSeries.length, 7);
  assert.equal(kgSeries[0].dayLabel, 'Дш');
  assert.equal(kgSeries[0].avgOccupancyPct, INITIAL_WEEKLY_LOAD[0].byRoute.r1.avgPct);

  const enSeries = buildWeeklyLoadSeries(INITIAL_WEEKLY_LOAD, 'en', null);
  assert.equal(enSeries.length, 7);
  assert.equal(enSeries[0].dayLabel, 'Mon');
  assert.equal(enSeries[6].dayLabel, 'Sun');
});

test('summarizeWeeklyLoad computes average, peak day, and total ridership', () => {
  const series = buildWeeklyLoadSeries(INITIAL_WEEKLY_LOAD, 'ru', null);
  const summary = summarizeWeeklyLoad(series);
  assert.equal(summary.peakDayLabel, 'Пт');
  assert.equal(summary.peakDayPct, 98);
  assert.ok(summary.weeklyAveragePct > 50 && summary.weeklyAveragePct < 80);
  assert.equal(summary.totalPassengers, 55200);
});
