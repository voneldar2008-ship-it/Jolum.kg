import React from 'react';
import {
  Star,
  X,
  Bus as BusIcon,
  MapPin,
  Trash2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Language, Route, Stop } from '../types/transit';
import { createTranslator } from '../i18n';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  routes: Route[];
  stops: Stop[];
  onSelectRoute: (routeId: string) => void;
  onSelectStop: (stopId: string) => void;
  lang: Language;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  isOpen,
  onClose,
  favorites,
  onToggleFavorite,
  routes,
  stops,
  onSelectRoute,
  onSelectStop,
  lang,
}) => {
  if (!isOpen) return null;

  const { t, tp, l } = createTranslator(lang);

  const favRoutes = routes.filter((r) => favorites.includes(r.id));
  const favStops = stops.filter((s) => favorites.includes(s.id));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/45 dark:bg-slate-950/75 flex justify-end">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-current" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('favorites.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Favorite Routes */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
              {t('nav.routes')} ({favRoutes.length})
            </span>

            {favRoutes.length > 0 ? (
              <div className="space-y-2.5">
                {favRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div
                      onClick={() => {
                        onSelectRoute(route.id);
                        onClose();
                      }}
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0"
                        style={{ backgroundColor: route.color }}
                      >
                        {route.number}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors leading-snug">
                          {l(route.name)}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {tp('minutesShort', route.durationMinutes)} · {route.fareKgs} {t('routes.som')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleFavorite(route.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      title={t('routes.removeFromFav')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t('favorites.emptyRoutes')}
              </p>
            )}
          </div>

          {favStops.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                {t('nav.stops')} ({favStops.length})
              </span>
              <div className="space-y-2">
                {favStops.map((stop) => (
                  <div
                    key={stop.id}
                    onClick={() => {
                      onSelectStop(stop.id);
                      onClose();
                    }}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2.5"
                  >
                    <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {l(stop.name)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty hint */}
          {favorites.length === 0 && (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <Star className="w-8 h-8 mx-auto text-amber-400/60 mb-2" />
              <p className="text-xs leading-relaxed">{t('favorites.empty')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
