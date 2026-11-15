import { Bus, Route } from '../types/transit';
import { calculateBearing, calculateDistance } from '../utils/transit';

export interface PrecomputedPolyline {
  waypoints: [number, number][];
  segmentLengths: number[];
  cumulativeDistances: number[];
  segmentBearings: number[];
  totalLength: number;
}

export interface InterpolatedBusPose {
  id: string;
  routeId: string;
  plateNumber: string;
  routeNumber: string;
  color: string;
  lat: number;
  lng: number;
  bearing: number;
  direction: 'forward' | 'backward';
  progress: number;
  speedKmh: number;
  nextStopId: string;
  occupancy: Bus['occupancy'];
}

interface BusKeyframeState {
  bus: Bus;
  prevCycleProgress: number;
  targetCycleProgress: number;
  prevLat: number;
  prevLng: number;
  targetLat: number;
  targetLng: number;
  prevBearing: number;
  targetBearing: number;
  tickStartMs: number;
  tickDurationMs: number;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Shortest-arc angular interpolation in degrees [0, 360).
 */
export function interpolateBearing(fromDeg: number, toDeg: number, alpha: number): number {
  const t = clamp(alpha, 0, 1);
  const start = ((fromDeg % 360) + 360) % 360;
  const end = ((toDeg % 360) + 360) % 360;
  let delta = end - start;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return (((start + delta * t) % 360) + 360) % 360;
}

/**
 * Converts directional progress into monotonic [0, 2) cycle progress so terminal
 * turnarounds interpolate smoothly without teleporting.
 */
export function toCycleProgress(progress: number, direction: 'forward' | 'backward'): number {
  const p = clamp(progress, 0, 1);
  return direction === 'forward' ? p : 2 - p;
}

export function fromCycleProgress(cycleProgress: number): {
  progress: number;
  direction: 'forward' | 'backward';
} {
  const wrapped = ((cycleProgress % 2) + 2) % 2;
  if (wrapped <= 1) {
    return { progress: wrapped, direction: 'forward' };
  }
  return { progress: 2 - wrapped, direction: 'backward' };
}

/**
 * Precomputes cumulative polyline distances and bearings once per route change.
 */
export function precomputePolyline(waypoints: [number, number][]): PrecomputedPolyline {
  if (waypoints.length === 0) {
    return {
      waypoints: [],
      segmentLengths: [],
      cumulativeDistances: [],
      segmentBearings: [],
      totalLength: 0,
    };
  }

  if (waypoints.length === 1) {
    return {
      waypoints,
      segmentLengths: [],
      cumulativeDistances: [0],
      segmentBearings: [0],
      totalLength: 0,
    };
  }

  const segmentLengths: number[] = [];
  const cumulativeDistances: number[] = [0];
  const segmentBearings: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const len = calculateDistance(a[0], a[1], b[0], b[1]);
    segmentLengths.push(len);
    totalLength += len;
    cumulativeDistances.push(totalLength);
    segmentBearings.push(calculateBearing(a[0], a[1], b[0], b[1]));
  }

  return {
    waypoints,
    segmentLengths,
    cumulativeDistances,
    segmentBearings,
    totalLength,
  };
}

/**
 * Samples position and bearing at progress [0, 1] using precomputed cumulative distances (O(log N)).
 */
export function samplePrecomputedPolyline(
  geom: PrecomputedPolyline,
  progress: number
): { lat: number; lng: number; bearing: number } {
  const { waypoints, segmentLengths, cumulativeDistances, segmentBearings, totalLength } = geom;

  if (waypoints.length === 0) return { lat: 0, lng: 0, bearing: 0 };
  if (waypoints.length === 1 || totalLength === 0) {
    return { lat: waypoints[0][0], lng: waypoints[0][1], bearing: 0 };
  }

  const clamped = clamp(progress, 0, 1);
  const targetDistance = clamped * totalLength;

  // Binary search over cumulativeDistances to find segment index
  let lo = 0;
  let hi = segmentLengths.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulativeDistances[mid + 1] < targetDistance) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const segIndex = lo;
  const segLen = segmentLengths[segIndex];
  const startDist = cumulativeDistances[segIndex];
  const segProgress = segLen > 0 ? clamp((targetDistance - startDist) / segLen, 0, 1) : 0;

  const start = waypoints[segIndex];
  const end = waypoints[segIndex + 1];

  return {
    lat: start[0] + (end[0] - start[0]) * segProgress,
    lng: start[1] + (end[1] - start[1]) * segProgress,
    bearing: segmentBearings[segIndex] ?? 0,
  };
}

export class BusSimulationEngine {
  private routeMap = new Map<string, Route>();
  private geometryCache = new Map<string, PrecomputedPolyline>();
  private keyframes = new Map<string, BusKeyframeState>();
  private busOrder: string[] = [];

  private isSimulating = true;
  private simSpeed = 1;
  private baseSpeedScale = 4; // Matches standard simulation speed multiplier
  private tickIntervalMs = 1000;
  private physicsTimer: ReturnType<typeof setInterval> | null = null;
  private uiTimer: ReturnType<typeof setInterval> | null = null;
  private uiListeners = new Set<(buses: Bus[]) => void>();
  private lastStepMs = 0;

  constructor(
    initialRoutes: Route[] = [],
    initialBuses: Bus[] = [],
    options?: { tickIntervalMs?: number; baseSpeedScale?: number }
  ) {
    if (options?.tickIntervalMs) this.tickIntervalMs = options.tickIntervalMs;
    if (options?.baseSpeedScale) this.baseSpeedScale = options.baseSpeedScale;
    this.syncRoutes(initialRoutes);
    this.syncBuses(initialBuses);
  }

  public syncRoutes(routes: Route[]): void {
    this.routeMap.clear();
    this.geometryCache.clear();
    for (const route of routes) {
      this.routeMap.set(route.id, route);
      this.geometryCache.set(route.id, precomputePolyline(route.waypoints));
    }
  }

  public syncBuses(buses: Bus[], nowMs = performance.now()): void {
    const nextIds = new Set(buses.map((b) => b.id));
    this.busOrder = buses.map((b) => b.id);

    // Remove deleted buses
    for (const id of Array.from(this.keyframes.keys())) {
      if (!nextIds.has(id)) {
        this.keyframes.delete(id);
      }
    }

    for (const bus of buses) {
      const existing = this.keyframes.get(bus.id);
      if (existing) {
        // Preserve active interpolation keyframes while updating metadata
        existing.bus = {
          ...existing.bus,
          plateNumber: bus.plateNumber,
          routeId: bus.routeId,
          model: bus.model,
          driverName: bus.driverName,
          occupancy: bus.occupancy,
          isAccessible: bus.isAccessible,
          hasWifi: bus.hasWifi,
          hasAC: bus.hasAC,
        };
      } else {
        const cp = toCycleProgress(bus.progress, bus.direction);
        this.keyframes.set(bus.id, {
          bus: { ...bus },
          prevCycleProgress: cp,
          targetCycleProgress: cp,
          prevLat: bus.currentLat,
          prevLng: bus.currentLng,
          targetLat: bus.currentLat,
          targetLng: bus.currentLng,
          prevBearing: bus.bearing,
          targetBearing: bus.bearing,
          tickStartMs: nowMs,
          tickDurationMs: this.tickIntervalMs,
        });
      }
    }
  }

  public replaceFleet(buses: Bus[], nowMs = performance.now()): void {
    this.keyframes.clear();
    this.syncBuses(buses, nowMs);
    this.emitUiUpdate();
  }

  public setSimulating(running: boolean, nowMs = performance.now()): void {
    if (this.isSimulating === running) return;

    if (!running) {
      // Freeze smoothly at the exact current interpolated position
      for (const kf of this.keyframes.values()) {
        const pose = this.interpolateKeyframe(kf, nowMs);
        const cp = toCycleProgress(pose.progress, pose.direction);
        kf.prevCycleProgress = cp;
        kf.targetCycleProgress = cp;
        kf.prevLat = pose.lat;
        kf.targetLat = pose.lat;
        kf.prevLng = pose.lng;
        kf.targetLng = pose.lng;
        kf.prevBearing = pose.bearing;
        kf.targetBearing = pose.bearing;
        kf.tickStartMs = nowMs;
        kf.bus = {
          ...kf.bus,
          currentLat: pose.lat,
          currentLng: pose.lng,
          bearing: pose.bearing,
          progress: pose.progress,
          direction: pose.direction,
        };
      }
    } else {
      this.lastStepMs = nowMs;
      for (const kf of this.keyframes.values()) {
        kf.tickStartMs = nowMs;
      }
    }

    this.isSimulating = running;
    this.emitUiUpdate();
  }

  public setSpeed(speed: number): void {
    this.simSpeed = Math.max(0.25, speed);
  }

  public getIsSimulating(): boolean {
    return this.isSimulating;
  }

  public getSpeed(): number {
    return this.simSpeed;
  }

  /**
   * Starts decoupled physics calculation loop + throttled UI telemetry loop.
   */
  public start(): void {
    this.stop();
    this.lastStepMs = performance.now();
    // Kick off first interpolation target immediately
    if (this.isSimulating) {
      this.step(this.lastStepMs, this.tickIntervalMs / 1000);
    }

    this.physicsTimer = setInterval(() => {
      if (!this.isSimulating) return;
      const now = performance.now();
      const rawDelta = (now - this.lastStepMs) / 1000;
      this.lastStepMs = now;
      // Clamp delta to avoid teleportation when tab resumes from background
      const deltaSeconds = clamp(rawDelta, 0.05, 2.5);
      this.step(now, deltaSeconds);
    }, this.tickIntervalMs);

    // UI state sync runs independently at 1 Hz so React never reconciles at 60 FPS
    this.uiTimer = setInterval(() => {
      if (this.isSimulating) {
        this.emitUiUpdate();
      }
    }, this.tickIntervalMs);
  }

  public stop(): void {
    if (this.physicsTimer !== null) {
      clearInterval(this.physicsTimer);
      this.physicsTimer = null;
    }
    if (this.uiTimer !== null) {
      clearInterval(this.uiTimer);
      this.uiTimer = null;
    }
  }

  public subscribeUi(listener: (buses: Bus[]) => void): () => void {
    this.uiListeners.add(listener);
    return () => {
      this.uiListeners.delete(listener);
    };
  }

  private emitUiUpdate(): void {
    if (this.uiListeners.size === 0) return;
    const snapshot = this.getUiBusesSnapshot();
    for (const listener of this.uiListeners) {
      listener(snapshot);
    }
  }

  /**
   * Advances physics keyframes by deltaSeconds. Purely updates simulation store without React renders.
   */
  public step(nowMs: number, deltaSeconds: number): void {
    const dt = Math.max(0, deltaSeconds);
    const isoNow = new Date().toISOString();

    for (const kf of this.keyframes.values()) {
      const route = this.routeMap.get(kf.bus.routeId);
      const geom = this.geometryCache.get(kf.bus.routeId);
      if (!route || !geom) continue;

      const cycleSeconds = Math.max(60, route.durationMinutes * 60);
      const increment = (dt * this.simSpeed * this.baseSpeedScale) / cycleSeconds;

      // Start smoothly from the current target so consecutive ticks chain continuously
      const currentCycle = kf.targetCycleProgress;
      const nextCycleUnwrapped = currentCycle + increment;
      const wrappedCycle = ((nextCycleUnwrapped % 2) + 2) % 2;

      const { progress: nextProgress, direction: nextDirection } = fromCycleProgress(wrappedCycle);
      const sampled = samplePrecomputedPolyline(geom, nextProgress);
      const nextBearing =
        nextDirection === 'forward' ? sampled.bearing : (sampled.bearing + 180) % 360;

      // Determine next stop
      const stopsList =
        nextDirection === 'forward' ? route.stops : [...route.stops].reverse();
      const directionalProgress = nextDirection === 'forward' ? nextProgress : 1 - nextProgress;
      const stopIdx = Math.min(
        Math.max(0, stopsList.length - 1),
        Math.floor(directionalProgress * stopsList.length)
      );
      const nextStopId =
        stopsList[Math.min(stopsList.length - 1, stopIdx + 1)] ||
        stopsList[stopsList.length - 1] ||
        kf.bus.nextStopId;

      const baseSpeed = nextDirection === 'forward' ? 32 : 34;
      const speedVariation = Math.sin(nextProgress * Math.PI * 4) * 6;
      const speedKmh = Math.max(18, Math.min(48, Math.round(baseSpeed + speedVariation)));

      kf.prevCycleProgress = currentCycle;
      // Keep unwrapped target if crossing 2->0 only by wrapping prev & target consistently
      kf.targetCycleProgress =
        nextCycleUnwrapped >= 2 ? nextCycleUnwrapped - 2 : nextCycleUnwrapped;
      if (nextCycleUnwrapped >= 2) {
        kf.prevCycleProgress = currentCycle - 2;
      }

      kf.prevLat = kf.targetLat;
      kf.prevLng = kf.targetLng;
      kf.prevBearing = kf.targetBearing;

      kf.targetLat = sampled.lat;
      kf.targetLng = sampled.lng;
      kf.targetBearing = nextBearing;

      kf.tickStartMs = nowMs;
      kf.tickDurationMs = Math.max(16, dt * 1000);

      kf.bus = {
        ...kf.bus,
        direction: nextDirection,
        progress: nextProgress,
        currentLat: sampled.lat,
        currentLng: sampled.lng,
        bearing: nextBearing,
        nextStopId,
        speedKmh,
        lastPingTime: isoNow,
      };
    }
  }

  private interpolateKeyframe(kf: BusKeyframeState, nowMs: number): InterpolatedBusPose {
    const route = this.routeMap.get(kf.bus.routeId);
    const geom = this.geometryCache.get(kf.bus.routeId);

    if (!this.isSimulating || !route || !geom) {
      return {
        id: kf.bus.id,
        routeId: kf.bus.routeId,
        plateNumber: kf.bus.plateNumber,
        routeNumber: route?.number ?? '?',
        color: route?.color ?? '#0284c7',
        lat: kf.targetLat,
        lng: kf.targetLng,
        bearing: kf.targetBearing,
        direction: kf.bus.direction,
        progress: kf.bus.progress,
        speedKmh: kf.bus.speedKmh,
        nextStopId: kf.bus.nextStopId,
        occupancy: kf.bus.occupancy,
      };
    }

    const alpha = clamp((nowMs - kf.tickStartMs) / kf.tickDurationMs, 0, 1);
    const interpCycle =
      kf.prevCycleProgress + (kf.targetCycleProgress - kf.prevCycleProgress) * alpha;
    const { progress, direction } = fromCycleProgress(interpCycle);
    const sampled = samplePrecomputedPolyline(geom, progress);
    const rawBearing =
      direction === 'forward' ? sampled.bearing : (sampled.bearing + 180) % 360;

    return {
      id: kf.bus.id,
      routeId: kf.bus.routeId,
      plateNumber: kf.bus.plateNumber,
      routeNumber: route.number,
      color: route.color,
      lat: sampled.lat,
      lng: sampled.lng,
      bearing: interpolateBearing(kf.prevBearing, rawBearing, Math.min(1, alpha * 1.15)),
      direction,
      progress,
      speedKmh: kf.bus.speedKmh,
      nextStopId: kf.bus.nextStopId,
      occupancy: kf.bus.occupancy,
    };
  }

  /**
   * High-frequency 60 FPS read path used inside requestAnimationFrame by Canvas renderer.
   */
  public getInterpolatedSnapshot(nowMs = performance.now()): InterpolatedBusPose[] {
    const result: InterpolatedBusPose[] = [];
    for (const id of this.busOrder) {
      const kf = this.keyframes.get(id);
      if (!kf) continue;
      result.push(this.interpolateKeyframe(kf, nowMs));
    }
    return result;
  }

  /**
   * Low-frequency snapshot for React telemetry UI (AdminPanel, StopViewer, Bus detail card).
   */
  public getUiBusesSnapshot(): Bus[] {
    const result: Bus[] = [];
    for (const id of this.busOrder) {
      const kf = this.keyframes.get(id);
      if (kf) result.push(kf.bus);
    }
    return result;
  }
}
