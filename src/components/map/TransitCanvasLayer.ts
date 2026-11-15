import type ymaps from 'yandex-maps';
import { Route, Stop } from '../../types/transit';
import { BusSimulationEngine, InterpolatedBusPose } from '../../simulation/BusSimulationEngine';

export interface CanvasHoverTarget {
  type: 'bus' | 'stop';
  id: string;
  x: number;
  y: number;
}

export interface TransitCanvasOverlayOptions {
  engine: BusSimulationEngine;
  onSelectBus: (busId: string) => void;
  onSelectStop: (stopId: string) => void;
  onHoverChange?: (target: CanvasHoverTarget | null) => void;
}

interface ProjectedBus {
  pose: InterpolatedBusPose;
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

interface ProjectedStop {
  stop: Stop;
  x: number;
  y: number;
  radius: number;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return `rgba(2, 132, 199, ${alpha})`;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Hardware-accelerated Canvas overlay synchronized with Yandex Maps JS API v2.1.
 * Renders stops, user GPS dot, and 60 FPS interpolated buses with directional
 * bearing chevrons and spatial hit-testing without DOM marker overhead.
 */
export class TransitCanvasLayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private engine: BusSimulationEngine;
  private onSelectBus: (busId: string) => void;
  private onSelectStop: (stopId: string) => void;
  private onHoverChange?: (target: CanvasHoverTarget | null) => void;

  private map: ymaps.Map | null = null;
  private hostElement: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private stops: Stop[] = [];
  private routes: Route[] = [];
  private selectedRouteId: string | null = null;
  private selectedStopId: string | null = null;
  private selectedBusId: string | null = null;
  private showBuses = true;
  private showStops = true;
  private userCoords: [number, number] | null = null;
  private isDark = false;

  private rafId: number | null = null;
  private hoveredTarget: CanvasHoverTarget | null = null;
  private projectedBuses: ProjectedBus[] = [];
  private projectedStops: ProjectedStop[] = [];
  private frameCounter = 0;

  constructor(options: TransitCanvasOverlayOptions) {
    this.engine = options.engine;
    this.onSelectBus = options.onSelectBus;
    this.onSelectStop = options.onSelectStop;
    this.onHoverChange = options.onHoverChange;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'jolum-transit-canvas';
    this.canvas.setAttribute('data-testid', 'transit-canvas-layer');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '5';

    this.ctx = this.canvas.getContext('2d', { alpha: true });
  }

  public updateData(params: {
    stops: Stop[];
    routes: Route[];
    selectedRouteId: string | null;
    selectedStopId: string | null;
    selectedBusId: string | null;
    showBuses: boolean;
    showStops: boolean;
    userCoords: [number, number] | null;
    isDark?: boolean;
  }): void {
    this.stops = params.stops;
    this.routes = params.routes;
    this.selectedRouteId = params.selectedRouteId;
    this.selectedStopId = params.selectedStopId;
    this.selectedBusId = params.selectedBusId;
    this.showBuses = params.showBuses;
    this.showStops = params.showStops;
    this.userCoords = params.userCoords;
    this.isDark = Boolean(params.isDark);
  }

  public setAriaLabel(label: string): void {
    this.canvas.setAttribute('aria-label', label);
  }

  public attach(map: ymaps.Map, hostElement: HTMLElement): void {
    if (this.map === map && this.hostElement === hostElement) return;
    this.detach();

    this.map = map;
    this.hostElement = hostElement;
    hostElement.appendChild(this.canvas);

    this.syncCanvasSize();
    this.updateMapAttributes();

    map.events.add('boundschange', this.handleMapBoundsChange);
    map.events.add('actiontick', this.handleMapActionTick);
    map.events.add('sizechange', this.handleMapBoundsChange);
    map.events.add('click', this.handleYMapClick);

    hostElement.addEventListener('mousemove', this.handleMouseMove);
    hostElement.addEventListener('mouseleave', this.handleMouseOut);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.syncCanvasSize();
        this.renderFrame(performance.now());
      });
      this.resizeObserver.observe(hostElement);
    }

    this.startRenderLoop();
  }

  public detach(): void {
    this.stopRenderLoop();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.hostElement) {
      this.hostElement.removeEventListener('mousemove', this.handleMouseMove);
      this.hostElement.removeEventListener('mouseleave', this.handleMouseOut);
      this.hostElement.style.cursor = '';
      this.hostElement = null;
    }

    if (this.map) {
      this.map.events.remove('boundschange', this.handleMapBoundsChange);
      this.map.events.remove('actiontick', this.handleMapActionTick);
      this.map.events.remove('sizechange', this.handleMapBoundsChange);
      this.map.events.remove('click', this.handleYMapClick);
      this.map = null;
    }

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  public hitTest(x: number, y: number): { type: 'bus' | 'stop'; id: string } | null {
    // Buses have higher visual priority (drawn on top)
    for (let i = this.projectedBuses.length - 1; i >= 0; i--) {
      const item = this.projectedBuses[i];
      if (
        Math.abs(x - item.x) <= item.halfW + 4 &&
        Math.abs(y - item.y) <= item.halfH + 4
      ) {
        return { type: 'bus', id: item.pose.id };
      }
    }

    for (let i = this.projectedStops.length - 1; i >= 0; i--) {
      const item = this.projectedStops[i];
      const dx = x - item.x;
      const dy = y - item.y;
      const hitR = item.radius + 5;
      if (dx * dx + dy * dy <= hitR * hitR) {
        return { type: 'stop', id: item.stop.id };
      }
    }

    return null;
  }

  private handleMapBoundsChange = (): void => {
    this.syncCanvasSize();
    this.updateMapAttributes();
    this.renderFrame(performance.now());
  };

  private handleMapActionTick = (): void => {
    this.renderFrame(performance.now());
  };

  private updateMapAttributes(): void {
    const map = this.map;
    if (!map) return;
    try {
      const center = map.getCenter();
      const zoom = map.getZoom();
      this.canvas.setAttribute(
        'data-map-center',
        `${center[0].toFixed(4)},${center[1].toFixed(4)}`
      );
      this.canvas.setAttribute('data-map-zoom', String(zoom));
    } catch {
      // Ignore transient states while map is tearing down
    }
  }

  private syncCanvasSize(): void {
    const host = this.hostElement;
    if (!host) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const targetWidth = Math.max(1, Math.round(width * dpr));
    const targetHeight = Math.max(1, Math.round(height * dpr));

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }
  }

  private projectLatLng(
    lat: number,
    lng: number,
    projection: ymaps.IProjection,
    zoom: number,
    pageOffsetX: number,
    pageOffsetY: number
  ): { x: number; y: number } | null {
    const map = this.map;
    if (!map) return null;
    const globalPixels = projection.toGlobalPixels([lat, lng], zoom);
    const pagePixels = map.converter.globalToPage(globalPixels);
    return {
      x: pagePixels[0] - pageOffsetX,
      y: pagePixels[1] - pageOffsetY,
    };
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const host = this.hostElement;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = this.hitTest(x, y);
    if (hit) {
      host.style.cursor = 'pointer';
      const nextHover: CanvasHoverTarget = {
        type: hit.type,
        id: hit.id,
        x,
        y,
      };
      this.hoveredTarget = nextHover;
      this.onHoverChange?.(nextHover);
    } else {
      host.style.cursor = '';
      if (this.hoveredTarget) {
        this.hoveredTarget = null;
        this.onHoverChange?.(null);
      }
    }
  };

  private handleMouseOut = (): void => {
    if (this.hostElement) {
      this.hostElement.style.cursor = '';
    }
    if (this.hoveredTarget) {
      this.hoveredTarget = null;
      this.onHoverChange?.(null);
    }
  };

  private handleYMapClick = (event: object | ymaps.IEvent): void => {
    const host = this.hostElement;
    if (!host) return;
    const e = event as ymaps.IEvent;
    if (typeof e?.get !== 'function') return;
    const pagePixels = e.get('pagePixels') as [number, number] | undefined;
    if (!pagePixels) return;

    const rect = host.getBoundingClientRect();
    const x = pagePixels[0] - (rect.left + window.scrollX);
    const y = pagePixels[1] - (rect.top + window.scrollY);

    const hit = this.hitTest(x, y);
    if (!hit) return;

    if (hit.type === 'bus') {
      this.onSelectBus(hit.id);
    } else {
      this.onSelectStop(hit.id);
    }
  };

  private startRenderLoop(): void {
    if (this.rafId !== null) return;
    const tick = (nowMs: number) => {
      this.renderFrame(nowMs);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopRenderLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private renderFrame(nowMs: number): void {
    const map = this.map;
    const host = this.hostElement;
    const ctx = this.ctx;
    if (!map || !host || !ctx) return;

    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width <= 0 || height <= 0) return;

    const projection = map.options.get('projection', {}) as
      | ymaps.IProjection
      | undefined;
    if (!projection || typeof projection.toGlobalPixels !== 'function') return;

    const zoom = map.getZoom();
    const rect = host.getBoundingClientRect();
    const pageOffsetX = rect.left + window.scrollX;
    const pageOffsetY = rect.top + window.scrollY;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 48;
    const nextProjectedStops: ProjectedStop[] = [];
    const nextProjectedBuses: ProjectedBus[] = [];

    // 1. User Location Marker
    if (this.userCoords) {
      const pt = this.projectLatLng(
        this.userCoords[0],
        this.userCoords[1],
        projection,
        zoom,
        pageOffsetX,
        pageOffsetY
      );
      if (pt && pt.x >= -margin && pt.x <= width + margin && pt.y >= -margin && pt.y <= height + margin) {
        const pulse = (nowMs * 0.0014) % 1;
        const haloR = 10 + pulse * 14;
        const haloAlpha = 0.35 * (1 - pulse);

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, haloR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${haloAlpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    }

    // 2. Bus Stop Markers
    if (this.showStops) {
      for (const stop of this.stops) {
        if (this.selectedRouteId && !stop.routes.includes(this.selectedRouteId)) {
          continue;
        }
        const pt = this.projectLatLng(
          stop.lat,
          stop.lng,
          projection,
          zoom,
          pageOffsetX,
          pageOffsetY
        );
        if (!pt || pt.x < -margin || pt.x > width + margin || pt.y < -margin || pt.y > height + margin) {
          continue;
        }

        const isSelected = this.selectedStopId === stop.id;
        const isHovered =
          this.hoveredTarget?.type === 'stop' && this.hoveredTarget.id === stop.id;
        const radius = isSelected ? 9 : isHovered ? 8.5 : 6.8;

        nextProjectedStops.push({ stop, x: pt.x, y: pt.y, radius });

        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isSelected
            ? 'rgba(234, 88, 12, 0.24)'
            : 'rgba(2, 132, 199, 0.2)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(pt.x, pt.y + 1.5, radius + 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#fff7ed' : this.isDark ? '#0f172a' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = isSelected ? 3.5 : 3;
        ctx.strokeStyle = isSelected ? '#ea580c' : '#0284c7';
        ctx.stroke();
      }
    }

    // 3. Interpolated Live Bus Markers (60 FPS)
    if (this.showBuses) {
      const poses = this.engine.getInterpolatedSnapshot(nowMs);
      ctx.font = '700 11px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      let idx = 0;
      for (const pose of poses) {
        if (this.selectedRouteId && pose.routeId !== this.selectedRouteId) {
          continue;
        }
        const pt = this.projectLatLng(
          pose.lat,
          pose.lng,
          projection,
          zoom,
          pageOffsetX,
          pageOffsetY
        );
        if (!pt || pt.x < -margin || pt.x > width + margin || pt.y < -margin || pt.y > height + margin) {
          continue;
        }

        const isSelected = this.selectedBusId === pose.id;
        const isHovered =
          this.hoveredTarget?.type === 'bus' && this.hoveredTarget.id === pose.id;

        const labelText = pose.routeNumber;
        const textWidth = ctx.measureText(labelText).width;
        const scale = isSelected ? 1.15 : isHovered ? 1.08 : 1;
        const pillW = Math.max(32, Math.round(textWidth + 22)) * scale;
        const pillH = 22 * scale;
        const halfW = pillW / 2;
        const halfH = pillH / 2;

        nextProjectedBuses.push({ pose, x: pt.x, y: pt.y, halfW, halfH });

        const pulsePhase = (nowMs * 0.0012 + idx * 0.27) % 1;
        const haloRadius = (16 + pulsePhase * 16) * scale;
        const haloAlpha = 0.36 * (1 - pulsePhase);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(pose.color, haloAlpha);
        ctx.fill();

        const rad = ((pose.bearing - 90) * Math.PI) / 180;
        const pointerDist = Math.max(halfW, halfH) + 5;
        const tipX = pt.x + Math.cos(rad) * (pointerDist + 5);
        const tipY = pt.y + Math.sin(rad) * (pointerDist + 5);
        const baseL = {
          x: pt.x + Math.cos(rad - 0.32) * (pointerDist - 1),
          y: pt.y + Math.sin(rad - 0.32) * (pointerDist - 1),
        };
        const baseR = {
          x: pt.x + Math.cos(rad + 0.32) * (pointerDist - 1),
          y: pt.y + Math.sin(rad + 0.32) * (pointerDist - 1),
        };

        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(baseL.x, baseL.y);
        ctx.lineTo(baseR.x, baseR.y);
        ctx.closePath();
        ctx.fillStyle = pose.color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        if (isSelected || isHovered) {
          drawRoundedRect(
            ctx,
            pt.x - halfW - 3.5,
            pt.y - halfH - 3.5,
            pillW + 7,
            pillH + 7,
            (pillH + 7) / 2
          );
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = isSelected ? '#0284c7' : '#38bdf8';
          ctx.stroke();
        }

        drawRoundedRect(ctx, pt.x - halfW, pt.y - halfH + 2, pillW, pillH, pillH / 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
        ctx.fill();

        drawRoundedRect(ctx, pt.x - halfW, pt.y - halfH, pillW, pillH, pillH / 2);
        ctx.fillStyle = pose.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        const iconX = pt.x - halfW + 9.5 * scale;
        const iconY = pt.y;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        drawRoundedRect(ctx, iconX - 4 * scale, iconY - 4 * scale, 8 * scale, 7.2 * scale, 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(iconX - 3.5 * scale, iconY - 0.5 * scale);
        ctx.lineTo(iconX + 3.5 * scale, iconY - 0.5 * scale);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, pt.x + 5.5 * scale, pt.y + 0.5);

        idx++;
      }
    }

    this.projectedStops = nextProjectedStops;
    this.projectedBuses = nextProjectedBuses;
    this.frameCounter++;

    this.canvas.setAttribute('data-stop-count', String(nextProjectedStops.length));
    this.canvas.setAttribute('data-bus-count', String(nextProjectedBuses.length));
    this.canvas.setAttribute('data-sim-running', String(this.engine.getIsSimulating()));
    if (this.frameCounter % 15 === 0) {
      this.canvas.setAttribute('data-render-frame', String(this.frameCounter));
    }
  }
}
