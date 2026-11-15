import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Language, Route, WeeklyLoadDay } from '../types/transit';
import { createTranslator } from '../i18n';
import { buildWeeklyLoadSeries, summarizeWeeklyLoad } from '../utils/transit';

import { ThemeMode } from '../utils/theme';

interface WeeklyLoadChartProps {
  weeklyData: WeeklyLoadDay[];
  routes: Route[];
  lang: Language;
  theme?: ThemeMode;
}

export const WeeklyLoadChart: React.FC<WeeklyLoadChartProps> = ({
  weeklyData,
  routes,
  lang,
  theme = 'light',
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const { t } = createTranslator(lang);
  const isDark = theme === 'dark';

  // Routes that have explicit breakdown metrics in weeklyData
  const filterableRoutes = useMemo(
    () =>
      routes.filter((r) =>
        weeklyData.some((d) => Object.prototype.hasOwnProperty.call(d.byRoute, r.id))
      ),
    [routes, weeklyData]
  );

  const series = useMemo(
    () => buildWeeklyLoadSeries(weeklyData, lang, selectedRouteId),
    [weeklyData, lang, selectedRouteId]
  );

  const summary = useMemo(() => summarizeWeeklyLoad(series), [series]);

  const activeRoute = filterableRoutes.find((r) => r.id === selectedRouteId) || null;
  const avgStrokeColor = activeRoute ? activeRoute.color : isDark ? '#38bdf8' : '#0284c7';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisLineColor = isDark ? '#334155' : '#cbd5e1';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const dotFillColor = isDark ? '#0f172a' : '#ffffff';

  return (
    <section
      data-testid="weekly-load-chart-section"
      className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs"
    >
      {/* Header & Route Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('admin.stats.demoDatasetLabel')}</span>
            <span aria-hidden="true">·</span>
            <span>
              {t('admin.stats.weeklyAvgSummary')}:{' '}
              <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {summary.weeklyAveragePct}%
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t('admin.stats.peakDaySummary')}:{' '}
              <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {summary.peakDayLabel} ({summary.peakDayPct}%)
              </strong>
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('admin.stats.weeklyLoadTitle')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('admin.stats.weeklyLoadSubtitle')}</p>
        </div>

        {/* Route Segmented Filter */}
        <div
          role="group"
          aria-label={t('admin.stats.allRoutesFilter')}
          className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs shrink-0"
        >
          <button
            type="button"
            onClick={() => setSelectedRouteId(null)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedRouteId === null
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('admin.stats.allRoutesFilter')}
          </button>
          {filterableRoutes.map((route) => {
            const isSelected = selectedRouteId === route.id;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedRouteId(route.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                №{route.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recharts Line Chart Container */}
      <div className="w-full h-72" data-testid="weekly-load-recharts-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 10, right: 16, left: -12, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 12, fill: tickColor }}
              axisLine={{ stroke: axisLineColor }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(val: number) => `${val}%`}
              tick={{ fontSize: 12, fill: tickColor }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0]?.payload;
                return (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-3.5 py-2.5 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white mb-1.5">
                      {label}
                      {activeRoute ? ` · ${t('admin.stats.routePrefix')}${activeRoute.number}` : ''}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-600 dark:text-slate-300">{t('admin.stats.avgLoad')}</span>
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {point?.avgOccupancyPct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-600 dark:text-slate-300">{t('admin.stats.peakLoad')}</span>
                        <span className="font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                          {point?.peakOccupancyPct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">{t('admin.stats.dailyPassengers')}</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                          {point?.passengersCount?.toLocaleString()} {t('admin.stats.passengersUnit')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: tickColor }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="avgOccupancyPct"
              name={t('admin.stats.avgLoad')}
              stroke={avgStrokeColor}
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 2, fill: dotFillColor }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="peakOccupancyPct"
              name={t('admin.stats.peakLoad')}
              stroke={isDark ? '#f59e0b' : '#d97706'}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3.5, strokeWidth: 2, strokeDasharray: '0', fill: dotFillColor }}
              activeDot={{ r: 5.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
