import React, { useState } from 'react';
import {
  Bus as BusIcon,
  Search,
  Clock,
  Coins,
  MapPin,
  ArrowRightLeft,
  Star,
  Map,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Bus, Language, Route, Stop } from '../types/transit';
import { createTranslator } from '../i18n';
import { calculateETAForStop } from '../utils/transit';

interface RouteExplorerProps {
  routes: Route[];
  stops: Stop[];
  buses: Bus[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onSelectStop: (stopId: string) => void;
  onViewOnMap: (routeId: string) => void;
  favorites: string[];
  onToggleFavorite: (routeId: string) => void;
  lang: Language;
}

export const RouteExplorer: React.FC<RouteExplorerProps> = ({
  routes,
  stops,
  buses,
  selectedRouteId,
  onSelectRoute,
  onSelectStop,
  onViewOnMap,
  favorites,
  onToggleFavorite,
  lang,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'bus' | 'minibus' | 'express'>('all');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const { t, tp, l } = createTranslator(lang);

  // Filter routes across all available languages
  const filteredRoutes = routes.filter((r) => {
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesNumber = r.number.toLowerCase().includes(q);
    const matchesName =
      r.name.ru.toLowerCase().includes(q) ||
      r.name.kg.toLowerCase().includes(q) ||
      Boolean(r.name.en && r.name.en.toLowerCase().includes(q));
    const matchesStops = r.stops.some((sid) => {
      const s = stops.find((st) => st.id === sid);
      return (
        s?.name.ru.toLowerCase().includes(q) ||
        s?.name.kg.toLowerCase().includes(q) ||
        Boolean(s?.name.en && s.name.en.toLowerCase().includes(q))
      );
    });

    return matchesCategory && (matchesNumber || matchesName || matchesStops);
  });

  const activeRoute =
    routes.find((r) => r.id === selectedRouteId) || filteredRoutes[0] || routes[0];

  const activeRouteBuses = buses.filter((b) => b.routeId === activeRoute?.id);

  // Get ordered stops based on direction
  const routeStopsList =
    direction === 'forward'
      ? activeRoute?.stops || []
      : [...(activeRoute?.stops || [])].reverse();

  const startStop = stops.find((s) => s.id === activeRoute?.startStopId);
  const endStop = stops.find((s) => s.id === activeRoute?.endStopId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header & Search */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('routes.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('routes.subtitlePrefix')} {tp('routes', filteredRoutes.length)} · {t('cityBadge')}
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('routes.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {(['all', 'bus', 'minibus', 'express'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {cat === 'all'
                  ? t('routes.allCategories')
                  : cat === 'bus'
                  ? t('routes.bus')
                  : cat === 'minibus'
                  ? t('routes.minibus')
                  : t('routes.express')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Routes Catalog + Route Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Routes */}
        <div className="lg:col-span-5 space-y-3">
          {filteredRoutes.map((route) => {
            const isSelected = activeRoute?.id === route.id;
            const isFav = favorites.includes(route.id);
            const routeBuses = buses.filter((b) => b.routeId === route.id);

            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative bg-white dark:bg-slate-900 ${
                  isSelected
                    ? 'border-sky-500 ring-2 ring-sky-500/15 dark:ring-sky-400/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-xs shrink-0"
                      style={{ backgroundColor: route.color }}
                    >
                      {route.number}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {l(route.name)}
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        {route.category === 'bus'
                          ? t('routes.bus')
                          : route.category === 'minibus'
                          ? t('routes.minibus')
                          : t('routes.express')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(route.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isFav
                        ? 'text-amber-500 dark:text-amber-400 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/60'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={isFav ? t('routes.removeFromFav') : t('routes.addToFav')}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Route Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {t('routes.tripTime')}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      ~{tp('minutesShort', route.durationMinutes)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {t('routes.interval')}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {tp('minutesShort', route.frequencyMinutes)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {t('routes.fare')}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono">
                      {route.fareKgs} {t('routes.som')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {t('routes.activeBuses')}
                    </span>
                    <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                      {tp('units', routeBuses.length)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredRoutes.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <BusIcon className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
              <p className="text-sm">{t('routes.noRoutesFound')}</p>
            </div>
          )}
        </div>

        {/* Right Column: Route Details & Stops Timeline */}
        {activeRoute && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs sticky top-24">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1.5 rounded-xl text-white font-extrabold text-xl shadow-xs"
                  style={{ backgroundColor: activeRoute.color }}
                >
                  №{activeRoute.number}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {l(activeRoute.name)}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {tp('stops', activeRoute.stops.length)} ·{' '}
                    {activeRoute.firstDeparture} — {activeRoute.lastDeparture}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onViewOnMap(activeRoute.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs"
              >
                <Map className="w-4 h-4" />
                <span>{t('routes.viewOnMap')}</span>
              </button>
            </div>

            {/* Description if any */}
            {activeRoute.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl my-4 border border-slate-100 dark:border-slate-800">
                {l(activeRoute.description)}
              </p>
            )}

            {/* Direction Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 my-4">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('routes.stopsOnRoute')}:
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setDirection('forward')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    direction === 'forward'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {l(startStop?.name)} → {l(endStop?.name)}
                </button>
                <button
                  onClick={() => setDirection('backward')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    direction === 'backward'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {l(endStop?.name)} → {l(startStop?.name)}
                </button>
              </div>
            </div>

            {/* Stops Timeline */}
            <div className="relative pl-6 space-y-4 max-h-[460px] overflow-y-auto pr-2">
              {/* Vertical Route Line */}
              <div
                className="absolute left-2.5 top-3 bottom-3 w-1 rounded-full"
                style={{ backgroundColor: activeRoute.color, opacity: 0.45 }}
              />

              {routeStopsList.map((stopId, index) => {
                const stop = stops.find((s) => s.id === stopId);
                if (!stop) return null;

                const isTerminal = index === 0 || index === routeStopsList.length - 1;

                // Check approaching buses for this stop
                const approachingBuses = activeRouteBuses
                  .map((b) => {
                    const eta = calculateETAForStop(b, stop.id, activeRoute, stops);
                    return { bus: b, eta };
                  })
                  .filter((item) => item.eta !== null)
                  .sort((a, b) => (a.eta || 0) - (b.eta || 0));

                return (
                  <div
                    key={stop.id}
                    className="relative flex items-start justify-between gap-3 group"
                  >
                    {/* Bullet marker */}
                    <div
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 transition-transform group-hover:scale-125 ${
                        isTerminal ? 'w-4 h-4 -left-[26px]' : ''
                      }`}
                      style={
                        isTerminal
                          ? { borderColor: activeRoute.color, backgroundColor: activeRoute.color }
                          : { borderColor: activeRoute.color }
                      }
                    />

                    {/* Stop Details */}
                    <div>
                      <button
                        onClick={() => onSelectStop(stop.id)}
                        className="text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        {l(stop.name)}
                      </button>
                      {stop.address && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{l(stop.address)}</p>
                      )}

                      {/* Other connections at this stop */}
                      <div className="flex items-center gap-1 mt-1">
                        {stop.routes
                          .filter((rid) => rid !== activeRoute.id)
                          .map((rid) => {
                            const r = routes.find((rt) => rt.id === rid);
                            if (!r) return null;
                            return (
                              <button
                                key={r.id}
                                onClick={() => onSelectRoute(r.id)}
                                className="px-1.5 py-0.2 text-[10px] font-bold text-white rounded"
                                style={{ backgroundColor: r.color }}
                                title={`${t('routes.bus')} №${r.number}`}
                              >
                                №{r.number}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Approaching Bus ETA Badge */}
                    {approachingBuses.length > 0 && (
                      <div className="shrink-0">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <BusIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>~{tp('minutesShort', approachingBuses[0].eta ?? 1)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
