import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  Calendar,
  Bus as BusIcon,
  X,
  CheckCircle,
} from 'lucide-react';
import { Announcement, Language, Route } from '../types/transit';
import { createTranslator } from '../i18n';

interface NewsModalProps {
  announcements: Announcement[];
  routes: Route[];
  lang: Language;
  onClose: () => void;
  onFilterRoute?: (routeId: string) => void;
}

export const NewsModal: React.FC<NewsModalProps> = ({
  announcements,
  routes,
  lang,
  onClose,
  onFilterRoute,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const { t, l } = createTranslator(lang);

  const filtered = announcements.filter((a) => {
    if (filterType === 'all') return true;
    return a.type === filterType;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>{t('news.officialBadge')}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('news.pageTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('news.pageSubtitle')}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs overflow-x-auto">
          {[
            { id: 'all', label: t('news.filters.all') },
            { id: 'info', label: t('news.filters.info') },
            { id: 'warning', label: t('news.filters.warning') },
            { id: 'service', label: t('news.filters.service') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterType === item.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filtered.map((ann) => (
          <div
            key={ann.id}
            className={`p-5 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-2xs ${
              ann.isImportant
                ? 'border-sky-300 dark:border-sky-700 ring-2 ring-sky-500/10'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`p-1.5 rounded-lg ${
                    ann.type === 'warning'
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                      : ann.type === 'service'
                      ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                      : 'bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300'
                  }`}
                >
                  {ann.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </span>
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{ann.date}</span>
                </span>
              </div>

              {ann.affectedRoutes && ann.affectedRoutes.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">
                    {t('news.affectedRoutes')}
                  </span>
                  {ann.affectedRoutes.map((rid) => {
                    const r = routes.find((rt) => rt.id === rid);
                    if (!r) return null;
                    return (
                      <span
                        key={r.id}
                        className="px-2 py-0.5 text-xs font-bold text-white rounded cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: r.color }}
                        onClick={() => onFilterRoute?.(r.id)}
                      >
                        №{r.number}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              {l(ann.title)}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {l(ann.content)}
            </p>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
            {t('news.emptyCategory')}
          </div>
        )}
      </div>
    </div>
  );
};
