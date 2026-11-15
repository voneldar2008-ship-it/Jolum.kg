import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { YMaps, Map as YMap, Polyline, ZoomControl } from '@iminside/react-yandex-maps';
import type ymaps from 'yandex-maps';
import {
  Crosshair,
  Bus as BusIcon,
  MapPin,
  Compass,
  Wifi,
  Wind,
  Accessibility,
  User,
  X,
  QrCode,
  Copy,
  Check,
  Maximize2,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { Bus, Language, Route, Stop } from '../types/transit';
import { BISHKEK_CENTER, BISHKEK_ZOOM } from '../data/initialData';
import { createTranslator } from '../i18n';
import { calculateETAForStop } from '../utils/transit';
import { ThemeMode } from '../utils/theme';
import { BusSimulationEngine } from '../simulation/BusSimulationEngine';
import { CanvasHoverTarget, TransitCanvasLayer } from './map/TransitCanvasLayer';
import { QrCodeGraphic } from './QrCodeGraphic';

interface TransitMapProps {
  routes: Route[];
  stops: Stop[];
  buses: Bus[];
  simulationEngine: BusSimulationEngine;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;
  selectedStopId: string | null;
  setSelectedStopId: (id: string | null) => void;
  selectedBusId: string | null;
  setSelectedBusId: (id: string | null) => void;
  lang: Language;
  theme?: ThemeMode;
  onOpenPlannerWithStop?: (stopId: string, as: 'from' | 'to') => void;
  shareUrl: string;
  onOpenShareQr: () => void;
}

const YANDEX_MAPS_API_KEY =
  (import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined)?.trim() || '';

export const TransitMap: React.FC<TransitMapProps> = ({
  routes,
  stops,
  buses,
  simulationEngine,
  selectedRouteId,
  setSelectedRouteId,
  selectedStopId,
  setSelectedStopId,
  selectedBusId,
  setSelectedBusId,
  lang,
  theme = 'light',
  onOpenPlannerWithStop,
  shareUrl,
  onOpenShareQr,
}) => {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ymaps.Map | null>(null);
  const canvasOverlayRef = useRef<TransitCanvasLayer | null>(null);

  const [showBuses, setShowBuses] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isQrCardCollapsed, setIsQrCardCollapsed] = useState(false);
  const [copiedQuickLink, setCopiedQuickLink] = useState(false);
  const [hoverTarget, setHoverTarget] = useState<CanvasHoverTarget | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);

  const { t, l } = useMemo(() => createTranslator(lang), [lang]);

  // Yandex Maps JS API supports ru_RU and en_US locales
  const ymapsLang = lang === 'en' ? 'en_US' : 'ru_RU';

  // Keep latest selection handlers in refs so Canvas overlay never re-mounts
  const selectBusRef = useRef((busId: string) => {
    setSelectedBusId(busId);
    setSelectedStopId(null);
  });
  const selectStopRef = useRef((stopId: string) => {
    setSelectedStopId(stopId);
    setSelectedBusId(null);
  });
  selectBusRef.current = (busId: string) => {
    setSelectedBusId(busId);
    setSelectedStopId(null);
  };
  selectStopRef.current = (stopId: string) => {
    setSelectedStopId(stopId);
    setSelectedBusId(null);
  };

  // Selected stop & bus objects
  const activeStop = stops.find((s) => s.id === selectedStopId) || null;
  const activeBus = buses.find((b) => b.id === selectedBusId) || null;

  // 1. Instantiate Hardware-Accelerated Canvas Overlay once per engine instance
  useEffect(() => {
    const overlay = new TransitCanvasLayer({
      engine: simulationEngine,
      onSelectBus: (busId) => selectBusRef.current(busId),
      onSelectStop: (stopId) => selectStopRef.current(stopId),
      onHoverChange: (target) => setHoverTarget(target),
    });
    canvasOverlayRef.current = overlay;

    if (mapInstanceRef.current && mapWrapperRef.current) {
      overlay.attach(mapInstanceRef.current, mapWrapperRef.current);
    }

    return () => {
      overlay.detach();
      canvasOverlayRef.current = null;
    };
  }, [simulationEngine]);

  // 2. Capture Yandex Map instance when mounted
  const handleMapInstance = useCallback((instance: ymaps.Map | null) => {
    if (!instance || mapInstanceRef.current === instance) return;
    mapInstanceRef.current = instance;
    setMapReady(true);
    setMapLoadError(false);

    if (canvasOverlayRef.current && mapWrapperRef.current) {
      canvasOverlayRef.current.attach(instance, mapWrapperRef.current);
    }
  }, []);

  // Cleanup map ref on unmount
  useEffect(() => {
    return () => {
      canvasOverlayRef.current?.detach();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Sync Canvas Overlay State & Accessibility Label
  useEffect(() => {
    const overlay = canvasOverlayRef.current;
    if (!overlay) return;
    overlay.setAriaLabel(t('map.canvasAria'));
    overlay.updateData({
      stops,
      routes,
      selectedRouteId,
      selectedStopId,
      selectedBusId,
      showBuses,
      showStops,
      userCoords,
      isDark: theme === 'dark',
    });
  }, [
    stops,
    routes,
    selectedRouteId,
    selectedStopId,
    selectedBusId,
    showBuses,
    showStops,
    userCoords,
    theme,
    t,
  ]);

  // 4. Center on selected stop or bus if changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeStop) return;
    map.setCenter([activeStop.lat, activeStop.lng], 15, { duration: 500 });
  }, [selectedStopId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeBus) return;
    map.setCenter([activeBus.currentLat, activeBus.currentLng], 15, { duration: 500 });
  }, [selectedBusId]);

  // Fit bounds to selected route when user picks a route chip or navigates from RouteExplorer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRouteId || activeStop || activeBus) return;
    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route || route.waypoints.length === 0) return;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const [lat, lng] of route.waypoints) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    map.setBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { checkZoomRange: true, zoomMargin: [60], duration: 500 }
    );
  }, [selectedRouteId]);

  // Geolocation Handler
  const handleLocateMe = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(t('map.locateError'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserCoords(coords);
        mapInstanceRef.current?.setCenter(coords, 14, { duration: 500 });
      },
      () => {
        setUserCoords(BISHKEK_CENTER);
        mapInstanceRef.current?.setCenter(BISHKEK_CENTER, 14, { duration: 500 });
      },
      { timeout: 7000 }
    );
  };

  const handleCenterCity = () => {
    mapInstanceRef.current?.setCenter(BISHKEK_CENTER, BISHKEK_ZOOM, { duration: 500 });
  };

  const handleQuickCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedQuickLink(true);
      setTimeout(() => setCopiedQuickLink(false), 2000);
    } catch {
      onOpenShareQr();
    }
  };

  // Find incoming buses to active stop
  const incomingBuses = activeStop
    ? buses
        .filter((b) => activeStop.routes.includes(b.routeId))
        .map((b) => {
          const r = routes.find((rt) => rt.id === b.routeId);
          const eta = r ? calculateETAForStop(b, activeStop.id, r, stops) : null;
          return { bus: b, route: r, eta };
        })
        .filter((item) => item.eta !== null)
        .sort((a, b) => (a.eta || 0) - (b.eta || 0))
    : [];

  // Hovered tooltip content
  const hoveredBus =
    hoverTarget?.type === 'bus' ? buses.find((b) => b.id === hoverTarget.id) : null;
  const hoveredStop =
    hoverTarget?.type === 'stop' ? stops.find((s) => s.id === hoverTarget.id) : null;

  const ymapsQuery = useMemo(
    () => ({
      ...(YANDEX_MAPS_API_KEY ? { apikey: YANDEX_MAPS_API_KEY } : {}),
      lang: ymapsLang as 'ru_RU' | 'en_US',
    }),
    [ymapsLang]
  );

  const defaultMapState = useMemo(
    () => ({
      center: BISHKEK_CENTER,
      zoom: BISHKEK_ZOOM,
      controls: [] as string[],
    }),
    []
  );

  return (
    <div className="relative w-full h-[calc(100vh-6.5rem)] min-h-[500px] overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Yandex Maps Container + Synchronized 60 FPS Canvas Overlay */}
      <div
        ref={mapWrapperRef}
        className="relative w-full h-full"
        data-testid="yandex-map-wrapper"
        data-map-center={`${BISHKEK_CENTER[0]},${BISHKEK_CENTER[1]}`}
        data-map-zoom={String(BISHKEK_ZOOM)}
      >
        <YMaps query={ymapsQuery}>
          <YMap
            defaultState={defaultMapState}
            width="100%"
            height="100%"
            className="jolum-ymap-container"
            modules={['geoObject.addon.hint']}
            instanceRef={(ref: unknown) => handleMapInstance(ref as ymaps.Map | null)}
            onLoad={() => {
              setMapReady(true);
              setMapLoadError(false);
            }}
            onError={() => {
              setMapLoadError(true);
            }}
          >
            <ZoomControl options={{ position: { right: 16, bottom: 32 } }} />

            {routes.map((route) => {
              const strokeOpacity =
                selectedRouteId === null ? 0.78 : selectedRouteId === route.id ? 0.96 : 0.22;
              const strokeWidth = selectedRouteId === route.id ? 6 : 4;

              return (
                <Polyline
                  key={route.id}
                  geometry={route.waypoints}
                  options={{
                    strokeColor: route.color,
                    strokeWidth,
                    strokeOpacity,
                  }}
                  properties={{
                    hintContent: `${t('routes.bus')} №${route.number}: ${l(route.name)}`,
                  }}
                  onClick={(e: ymaps.IEvent) => {
                    const host = mapWrapperRef.current;
                    const pagePixels = e.get('pagePixels') as [number, number] | undefined;
                    if (host && pagePixels && canvasOverlayRef.current) {
                      const rect = host.getBoundingClientRect();
                      const hit = canvasOverlayRef.current.hitTest(
                        pagePixels[0] - (rect.left + window.scrollX),
                        pagePixels[1] - (rect.top + window.scrollY)
                      );
                      if (hit) return;
                    }
                    setSelectedRouteId(route.id);
                  }}
                />
              );
            })}
          </YMap>
        </YMaps>

        {/* Loading / API Error Fallback Banner */}
        {!mapReady && !mapLoadError && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/75 dark:bg-slate-950/75 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 shadow-md text-xs font-semibold text-slate-700 dark:text-slate-200">
              {t('map.loadingMap')}
            </div>
          </div>
        )}

        {mapLoadError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-slate-100/90 dark:bg-slate-950/90">
            <div className="max-w-sm bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 shadow-lg flex items-start gap-3 text-xs text-slate-700 dark:text-slate-200">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{t('map.mapLoadError')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Lightweight Floating Hover Tooltip for Canvas Markers */}
      {hoverTarget && (hoveredBus || hoveredStop) && (
        <div
          className="pointer-events-none absolute z-25 -translate-x-1/2 -translate-y-full pb-3"
          style={{ left: hoverTarget.x, top: hoverTarget.y }}
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-lg text-xs whitespace-nowrap">
            {hoveredBus &&
              (() => {
                const r = routes.find((rt) => rt.id === hoveredBus.routeId);
                return (
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {t('routes.bus')} №{r?.number ?? '?'} ({hoveredBus.plateNumber})
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {hoveredBus.speedKmh} {t('busCard.kmh')}
                    </div>
                  </div>
                );
              })()}
            {hoveredStop && (
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {l(hoveredStop.name)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {hoveredStop.routes
                    .map((rid) => {
                      const r = routes.find((rt) => rt.id === rid);
                      return r ? `№${r.number}` : '';
                    })
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Error Toast if Geolocation Blocked */}
      {locationError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
          {locationError}
        </div>
      )}

      {/* Coordinated Top Map Controls */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        {/* Route Filter Bar */}
        <div className="pointer-events-auto min-w-0 max-w-full sm:max-w-[calc(100%-10.5rem)]">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 rounded-xl p-1.5 shadow-md flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedRouteId(null)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedRouteId === null
                  ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t('map.allRoutes')}
            </button>
            {routes.map((r) => {
              const isSelected = selectedRouteId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteId(isSelected ? null : r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 border ${
                    isSelected
                      ? 'border-transparent text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  style={{
                    backgroundColor: isSelected ? r.color : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#ffffff' : r.color }}
                  />
                  <span>№{r.number}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Control Buttons (Locate / Center on Bishkek / Layers) */}
        <div className="pointer-events-auto self-end sm:self-auto flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 rounded-xl p-1.5 shadow-md flex flex-row sm:flex-col gap-1">
            <button
              onClick={handleCenterCity}
              className="p-2 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={t('map.centerMap')}
              aria-label={t('map.centerMap')}
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              onClick={handleLocateMe}
              className="p-2 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={t('map.myLocation')}
              aria-label={t('map.myLocation')}
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Layer Visibility Toggles */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 rounded-xl px-2.5 py-2 shadow-md flex flex-row sm:flex-col gap-3 sm:gap-1.5 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white whitespace-nowrap">
              <input
                type="checkbox"
                checked={showBuses}
                onChange={(e) => setShowBuses(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
              />
              <BusIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span className="font-medium">{t('map.showBuses')}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white whitespace-nowrap">
              <input
                type="checkbox"
                checked={showStops}
                onChange={(e) => setShowStops(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
              />
              <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="font-medium">{t('map.showStops')}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Selected Stop Drawer / Popup Card */}
      {activeStop && (
        <div className="absolute bottom-12 left-3 right-16 sm:bottom-12 sm:left-4 sm:right-auto sm:w-96 max-h-[54vh] overflow-y-auto z-30 bg-white/98 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-semibold mb-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{t('stops.allStops')}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {l(activeStop.name)}
              </h3>
              {activeStop.address && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {l(activeStop.address)}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedStopId(null)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Passing Routes */}
          <div className="mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              {t('stops.passingRoutes')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeStop.routes.map((rid) => {
                const r = routes.find((rt) => rt.id === rid);
                if (!r) return null;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRouteId(r.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white rounded-md shadow-2xs hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: r.color }}
                  >
                    <span>№{r.number}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Approaching Buses */}
          <div className="mb-3 border-t border-slate-100 dark:border-slate-800 pt-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{t('stops.arrivalBoard')}</span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-normal lowercase">
                {t('demoNoticeShort')}
              </span>
            </span>

            {incomingBuses.length > 0 ? (
              <div className="space-y-1.5">
                {incomingBuses.slice(0, 3).map(({ bus, route, eta }) => (
                  <button
                    key={bus.id}
                    type="button"
                    onClick={() => setSelectedBusId(bus.id)}
                    className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50/60 dark:hover:bg-sky-950/50 border border-slate-100 dark:border-slate-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 text-xs font-bold text-white rounded"
                        style={{ backgroundColor: route?.color || '#0284c7' }}
                      >
                        №{route?.number}
                      </span>
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {bus.plateNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {t(`busCard.occupancy.${bus.occupancy}`)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/70 px-2 py-0.5 rounded-full">
                        ~{eta} {t('routes.min')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-1">{t('stops.noUpcomingBuses')}</p>
            )}
          </div>

          {/* Quick Route Planner Buttons from this stop */}
          {onOpenPlannerWithStop && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => onOpenPlannerWithStop(activeStop.id, 'from')}
                className="py-1.5 px-2 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/70 text-sky-700 dark:text-sky-300 text-xs font-semibold rounded-lg transition-colors"
              >
                {t('stops.planFromHere')}
              </button>
              <button
                onClick={() => onOpenPlannerWithStop(activeStop.id, 'to')}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                {t('stops.planToHere')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected Bus Drawer / Popup Card */}
      {activeBus && (
        <div className="absolute bottom-12 left-3 right-16 sm:bottom-12 sm:left-4 sm:right-auto sm:w-96 max-h-[54vh] overflow-y-auto z-30 bg-white/98 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {(() => {
            const busRoute = routes.find((r) => r.id === activeBus.routeId);
            const nextStop = stops.find((s) => s.id === activeBus.nextStopId);
            return (
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 text-sm font-extrabold text-white rounded-lg shadow-xs"
                      style={{ backgroundColor: busRoute?.color || '#0284c7' }}
                    >
                      №{busRoute?.number}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {activeBus.plateNumber}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {activeBus.model}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBusId(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label={t('common.close')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Key Telemetry */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">
                      {t('busCard.speed')}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                      {activeBus.speedKmh} {t('busCard.kmh')}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">
                      {t('busCard.occupancy.title')}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        activeBus.occupancy === 'low'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : activeBus.occupancy === 'medium'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {t(`busCard.occupancy.${activeBus.occupancy}`)}
                    </span>
                  </div>
                </div>

                {/* Next Stop */}
                {nextStop && (
                  <div className="bg-sky-50/70 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900 rounded-lg p-2.5 mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 block">
                        {t('busCard.nextStop')}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {l(nextStop.name)}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStopId(nextStop.id);
                        setSelectedBusId(null);
                      }}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                    >
                      {t('stops.allStops')}
                    </button>
                  </div>
                )}

                {/* Amenities Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mb-3 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  {activeBus.isAccessible && (
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px] font-medium">
                      <Accessibility className="w-3.5 h-3.5" />
                      <span>{t('busCard.features.accessible')}</span>
                    </span>
                  )}
                  {activeBus.hasAC && (
                    <span className="flex items-center gap-1 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded text-[11px] font-medium">
                      <Wind className="w-3.5 h-3.5" />
                      <span>{t('busCard.features.ac')}</span>
                    </span>
                  )}
                  {activeBus.hasWifi && (
                    <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded text-[11px] font-medium">
                      <Wifi className="w-3.5 h-3.5" />
                      <span>Wi-Fi</span>
                    </span>
                  )}
                </div>

                {/* Driver & GPS Info */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{activeBus.driverName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400">
                    {t('busCard.gpsSimulatedValue')}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Main-Page QR Access Dock */}
      {!activeStop && !activeBus && (
        <div className="pointer-events-none absolute bottom-12 left-3 right-16 sm:bottom-12 sm:left-4 sm:right-auto z-20">
          <div className="sm:hidden pointer-events-auto inline-flex">
            <button
              type="button"
              onClick={onOpenShareQr}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 hover:border-sky-300 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl shadow-md transition-colors whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{t('shareQr.openCardButton')}</span>
            </button>
          </div>

          <div className="hidden sm:block pointer-events-auto">
            {isQrCardCollapsed ? (
              <button
                type="button"
                onClick={() => setIsQrCardCollapsed(false)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 hover:border-sky-300 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl shadow-md transition-colors whitespace-nowrap"
              >
                <QrCode className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>{t('shareQr.openCardButton')}</span>
              </button>
            ) : (
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 rounded-2xl shadow-lg p-3 w-[280px]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <QrCode className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {t('shareQr.title')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQrCardCollapsed(true)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                    title={t('shareQr.collapseAria')}
                    aria-label={t('shareQr.collapseAria')}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenShareQr}
                    className="p-1.5 bg-white border border-slate-200 dark:border-slate-700 rounded-xl shrink-0 hover:border-sky-400 transition-colors"
                    aria-label={t('shareQr.expandBtn')}
                  >
                    <QrCodeGraphic
                      value={shareUrl}
                      size={68}
                      label={t('shareQr.qrAlt', { url: shareUrl })}
                    />
                  </button>

                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      {t('shareQr.cardHint')}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={onOpenShareQr}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Maximize2 className="w-3 h-3 shrink-0" />
                        <span>{t('shareQr.expandBtn')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickCopyLink}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap"
                      >
                        {copiedQuickLink ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-300">
                              {t('shareQr.copiedBtn')}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 shrink-0" />
                            <span>{t('shareQr.copyBtn')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
