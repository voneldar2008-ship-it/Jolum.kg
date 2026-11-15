import { Bus, Language, Route, Stop, TripPlanOption, WeeklyLoadDay } from '../types/transit';
import { resolveLocalizedText } from '../i18n';

/**
 * Calculates Haversine distance between two coordinates in meters.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates compass bearing from point A to point B in degrees (0 - 360).
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Interpolates coordinate and bearing along waypoints given progress [0.0, 1.0].
 */
export function interpolatePolyline(
  waypoints: [number, number][],
  progress: number
): { lat: number; lng: number; bearing: number } {
  if (waypoints.length === 0) {
    return { lat: 0, lng: 0, bearing: 0 };
  }
  if (waypoints.length === 1) {
    return { lat: waypoints[0][0], lng: waypoints[0][1], bearing: 0 };
  }

  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Compute total polyline length in meters
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const len = calculateDistance(
      waypoints[i][0],
      waypoints[i][1],
      waypoints[i + 1][0],
      waypoints[i + 1][1]
    );
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) {
    return { lat: waypoints[0][0], lng: waypoints[0][1], bearing: 0 };
  }

  const targetDistance = clampedProgress * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDistance || i === segmentLengths.length - 1) {
      const segProgress = segLen > 0 ? (targetDistance - accumulated) / segLen : 0;
      const start = waypoints[i];
      const end = waypoints[i + 1];

      const lat = start[0] + (end[0] - start[0]) * segProgress;
      const lng = start[1] + (end[1] - start[1]) * segProgress;
      const bearing = calculateBearing(start[0], start[1], end[0], end[1]);

      return { lat, lng, bearing };
    }
    accumulated += segLen;
  }

  const last = waypoints[waypoints.length - 1];
  return { lat: last[0], lng: last[1], bearing: 0 };
}

/**
 * Updates bus state by advancing along route by deltaSeconds * speed.
 */
export function advanceBus(
  bus: Bus,
  route: Route,
  deltaSeconds: number,
  speedMultiplier = 1
): Bus {
  // Total cycle time based on route.durationMinutes
  const cycleSeconds = Math.max(60, route.durationMinutes * 60);
  const progressIncrement = (deltaSeconds * speedMultiplier) / cycleSeconds;

  let newProgress = bus.progress;
  let newDirection = bus.direction;

  if (bus.direction === 'forward') {
    newProgress += progressIncrement;
    if (newProgress >= 1.0) {
      newProgress = 1.0;
      newDirection = 'backward';
    }
  } else {
    newProgress -= progressIncrement;
    if (newProgress <= 0.0) {
      newProgress = 0.0;
      newDirection = 'forward';
    }
  }

  const { lat, lng, bearing } = interpolatePolyline(route.waypoints, newProgress);

  // Determine next stop
  const stopsList = bus.direction === 'forward' ? route.stops : [...route.stops].reverse();
  const stopIndex = Math.min(
    stopsList.length - 1,
    Math.floor(
      (bus.direction === 'forward' ? newProgress : 1 - newProgress) * stopsList.length
    )
  );
  const nextStopId = stopsList[Math.min(stopsList.length - 1, stopIndex + 1)] || stopsList[stopsList.length - 1];

  // Fluctuate speed realistically
  const baseSpeed = bus.direction === 'forward' ? 32 : 34;
  const speedVariation = Math.sin(newProgress * Math.PI * 4) * 6;
  const speedKmh = Math.max(18, Math.min(48, Math.round(baseSpeed + speedVariation)));

  return {
    ...bus,
    direction: newDirection,
    progress: newProgress,
    currentLat: lat,
    currentLng: lng,
    bearing: bus.direction === 'forward' ? bearing : (bearing + 180) % 360,
    nextStopId,
    speedKmh,
    lastPingTime: new Date().toISOString(),
  };
}

/**
 * Calculates ETA in minutes from a bus to a target stop.
 * Returns null if the bus is heading away from this stop in its current cycle.
 */
export function calculateETAForStop(
  bus: Bus,
  targetStopId: string,
  route: Route,
  allStops: Stop[]
): number | null {
  const stopMap = new Map(allStops.map((s) => [s.id, s]));
  const targetStop = stopMap.get(targetStopId);
  if (!targetStop) return null;

  const stops = bus.direction === 'forward' ? route.stops : [...route.stops].reverse();
  const targetIdx = stops.indexOf(targetStopId);
  if (targetIdx === -1) return null;

  const currentIdx = Math.floor(
    (bus.direction === 'forward' ? bus.progress : 1 - bus.progress) * stops.length
  );

  if (targetIdx <= currentIdx) {
    // Bus has already passed target stop in this direction
    return null;
  }

  // Calculate remaining stops and distance
  const stopsRemaining = targetIdx - currentIdx;
  const avgMinutesPerStop = route.durationMinutes / stops.length;
  const estimated = Math.max(1, Math.round(stopsRemaining * avgMinutesPerStop));

  return estimated;
}

/**
 * Finds direct and 1-transfer trip options between two stops.
 */
export function findTripOptions(
  startStopId: string,
  endStopId: string,
  routes: Route[],
  allStops: Stop[]
): TripPlanOption[] {
  if (!startStopId || !endStopId || startStopId === endStopId) {
    return [];
  }

  const stopMap = new Map(allStops.map((s) => [s.id, s]));
  const startStop = stopMap.get(startStopId);
  const endStop = stopMap.get(endStopId);
  if (!startStop || !endStop) return [];

  const results: TripPlanOption[] = [];

  // 1. Direct Routes
  for (const route of routes) {
    const forwardIdxStart = route.stops.indexOf(startStopId);
    const forwardIdxEnd = route.stops.indexOf(endStopId);

    if (forwardIdxStart !== -1 && forwardIdxEnd !== -1 && forwardIdxStart < forwardIdxEnd) {
      const stopsCount = forwardIdxEnd - forwardIdxStart;
      const duration = Math.max(
        5,
        Math.round((stopsCount / route.stops.length) * route.durationMinutes)
      );

      results.push({
        id: `direct-${route.id}`,
        type: 'direct',
        transfersCount: 0,
        totalDurationMinutes: duration,
        segments: [
          {
            route,
            boardStop: startStop,
            alightStop: endStop,
            stopsCount,
            durationMinutes: duration,
          },
        ],
      });
    }

    // Also check reverse direction if line operates both ways
    const reverseStops = [...route.stops].reverse();
    const revIdxStart = reverseStops.indexOf(startStopId);
    const revIdxEnd = reverseStops.indexOf(endStopId);

    if (revIdxStart !== -1 && revIdxEnd !== -1 && revIdxStart < revIdxEnd) {
      const stopsCount = revIdxEnd - revIdxStart;
      const duration = Math.max(
        5,
        Math.round((stopsCount / reverseStops.length) * route.durationMinutes)
      );

      // Avoid duplicate direct if already added
      if (!results.some((r) => r.segments[0]?.route.id === route.id)) {
        results.push({
          id: `direct-rev-${route.id}`,
          type: 'direct',
          transfersCount: 0,
          totalDurationMinutes: duration,
          segments: [
            {
              route,
              boardStop: startStop,
              alightStop: endStop,
              stopsCount,
              durationMinutes: duration,
            },
          ],
        });
      }
    }
  }

  // 2. Transfer Routes (1 transfer)
  for (const r1 of routes) {
    const r1Stops = r1.stops;
    const startIdx = r1Stops.indexOf(startStopId);
    if (startIdx === -1) continue;

    // Potential transfer stops along r1 after startStopId
    for (let i = startIdx + 1; i < r1Stops.length; i++) {
      const transferStopId = r1Stops[i];
      const transferStop = stopMap.get(transferStopId);
      if (!transferStop) continue;

      for (const r2 of routes) {
        if (r2.id === r1.id) continue;

        const r2Stops = r2.stops;
        const transferIdx = r2Stops.indexOf(transferStopId);
        const endIdx = r2Stops.indexOf(endStopId);

        if (transferIdx !== -1 && endIdx !== -1 && transferIdx < endIdx) {
          const seg1Stops = i - startIdx;
          const seg1Duration = Math.max(
            3,
            Math.round((seg1Stops / r1Stops.length) * r1.durationMinutes)
          );

          const seg2Stops = endIdx - transferIdx;
          const seg2Duration = Math.max(
            3,
            Math.round((seg2Stops / r2Stops.length) * r2.durationMinutes)
          );

          const transferWait = Math.round(r2.frequencyMinutes / 2);
          const totalDuration = seg1Duration + transferWait + seg2Duration;

          const planId = `transfer-${r1.id}-${transferStopId}-${r2.id}`;
          if (!results.some((r) => r.id === planId)) {
            results.push({
              id: planId,
              type: 'transfer',
              transfersCount: 1,
              totalDurationMinutes: totalDuration,
              segments: [
                {
                  route: r1,
                  boardStop: startStop,
                  alightStop: transferStop,
                  stopsCount: seg1Stops,
                  durationMinutes: seg1Duration,
                },
                {
                  route: r2,
                  boardStop: transferStop,
                  alightStop: endStop,
                  stopsCount: seg2Stops,
                  durationMinutes: seg2Duration,
                },
              ],
            });
          }
        }
      }
    }
  }

  // Sort by total duration ascending
  return results.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
}

/**
 * Finds nearest stops from user coordinates, sorted by distance.
 */
export function findNearestStops(
  userLat: number,
  userLng: number,
  allStops: Stop[],
  limit = 5
): { stop: Stop; distanceMeters: number }[] {
  return allStops
    .map((stop) => ({
      stop,
      distanceMeters: Math.round(calculateDistance(userLat, userLng, stop.lat, stop.lng)),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

export interface WeeklyLoadChartPoint {
  dayKey: string;
  dayLabel: string;
  avgOccupancyPct: number;
  peakOccupancyPct: number;
  passengersCount: number;
}

export interface WeeklyLoadSummary {
  weeklyAveragePct: number;
  peakDayLabel: string;
  peakDayPct: number;
  totalPassengers: number;
}

/**
 * Projects weekly load dataset for either the whole network or a specific routeId.
 */
export function buildWeeklyLoadSeries(
  weeklyData: WeeklyLoadDay[],
  lang: Language,
  routeId: string | null = null
): WeeklyLoadChartPoint[] {
  return weeklyData.map((day) => {
    const routeMetrics = routeId ? day.byRoute[routeId] : undefined;
    const dayLabel = resolveLocalizedText(day.dayLabel, lang);
    if (routeMetrics) {
      return {
        dayKey: day.dayKey,
        dayLabel,
        avgOccupancyPct: routeMetrics.avgPct,
        peakOccupancyPct: routeMetrics.peakPct,
        passengersCount: routeMetrics.passengers,
      };
    }

    return {
      dayKey: day.dayKey,
      dayLabel,
      avgOccupancyPct: day.avgOccupancyPct,
      peakOccupancyPct: day.peakOccupancyPct,
      passengersCount: day.passengersCount,
    };
  });
}

/**
 * Computes summary metrics (average occupancy %, peak day, total weekly ridership).
 */
export function summarizeWeeklyLoad(series: WeeklyLoadChartPoint[]): WeeklyLoadSummary {
  if (series.length === 0) {
    return {
      weeklyAveragePct: 0,
      peakDayLabel: '-',
      peakDayPct: 0,
      totalPassengers: 0,
    };
  }

  let sumAvg = 0;
  let totalPassengers = 0;
  let peakPoint = series[0];

  for (const point of series) {
    sumAvg += point.avgOccupancyPct;
    totalPassengers += point.passengersCount;
    if (point.peakOccupancyPct > peakPoint.peakOccupancyPct) {
      peakPoint = point;
    }
  }

  return {
    weeklyAveragePct: Math.round(sumAvg / series.length),
    peakDayLabel: peakPoint.dayLabel,
    peakDayPct: peakPoint.peakOccupancyPct,
    totalPassengers,
  };
}
