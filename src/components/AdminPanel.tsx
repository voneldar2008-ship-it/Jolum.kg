import React, { useState } from 'react';
import {
  Shield,
  BarChart3,
  Bus as BusIcon,
  MapPin,
  Clock,
  Bell,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Radio,
  Download,
  RotateCcw,
  Save,
  X,
  Server,
  Zap,
} from 'lucide-react';
import {
  Announcement,
  Bus,
  DelayIncident,
  Language,
  Route,
  Stop,
  TransitStats,
} from '../types/transit';
import { createTranslator } from '../i18n';
import { INITIAL_WEEKLY_LOAD } from '../data/initialData';
import { WeeklyLoadChart } from './WeeklyLoadChart';
import { ThemeMode } from '../utils/theme';

interface AdminPanelProps {
  routes: Route[];
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>;
  stops: Stop[];
  setStops: React.Dispatch<React.SetStateAction<Stop[]>>;
  buses: Bus[];
  setBuses: React.Dispatch<React.SetStateAction<Bus[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  delays: DelayIncident[];
  setDelays: React.Dispatch<React.SetStateAction<DelayIncident[]>>;
  stats: TransitStats;
  onResetDemoData: () => void;
  lang: Language;
  theme?: ThemeMode;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  routes,
  setRoutes,
  stops,
  setStops,
  buses,
  setBuses,
  announcements,
  setAnnouncements,
  delays,
  setDelays,
  stats,
  onResetDemoData,
  lang,
  theme = 'light',
}) => {
  const [activeTab, setActiveTab] = useState<
    'stats' | 'routes' | 'stops' | 'buses' | 'delays' | 'announcements' | 'integration'
  >('stats');

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Forms states
  // 1. Add Route Form
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [newRouteNumber, setNewRouteNumber] = useState('');
  const [newRouteNameRu, setNewRouteNameRu] = useState('');
  const [newRouteNameKg, setNewRouteNameKg] = useState('');
  const [newRouteNameEn, setNewRouteNameEn] = useState('');
  const [newRouteColor, setNewRouteColor] = useState('#0284c7');
  const [newRouteDuration, setNewRouteDuration] = useState('20');
  const [newRouteInterval, setNewRouteInterval] = useState('10');
  const [newRouteFare, setNewRouteFare] = useState('15');
  const [newRouteCategory] = useState<'bus' | 'minibus' | 'express'>('bus');
  const [selectedStopsForNewRoute, setSelectedStopsForNewRoute] = useState<string[]>([]);

  // 2. Add Stop Form
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [newStopNameRu, setNewStopNameRu] = useState('');
  const [newStopNameKg, setNewStopNameKg] = useState('');
  const [newStopNameEn, setNewStopNameEn] = useState('');
  const [newStopLat, setNewStopLat] = useState('40.9331');
  const [newStopLng, setNewStopLng] = useState('72.9845');
  const [newStopAddressRu, setNewStopAddressRu] = useState('');

  // 3. Add Bus Form
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newBusPlate, setNewBusPlate] = useState('04KG 999AA');
  const [newBusRouteId, setNewBusRouteId] = useState(routes[0]?.id || 'r1');
  const [newBusModel, setNewBusModel] = useState('Yutong E12 Citybus');
  const [newBusDriver, setNewBusDriver] = useState('Адилет Касымов');

  // 4. Add Announcement Form
  const [newNoticeTitleRu, setNewNoticeTitleRu] = useState('');
  const [newNoticeTitleKg, setNewNoticeTitleKg] = useState('');
  const [newNoticeContentRu, setNewNoticeContentRu] = useState('');
  const [newNoticeContentKg, setNewNoticeContentKg] = useState('');
  const [newNoticeType] = useState<'info' | 'warning' | 'alert' | 'service'>('info');

  const { t, tp, l } = createTranslator(lang);

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Handler: Add Route
  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteNumber || !newRouteNameRu || selectedStopsForNewRoute.length < 2) {
      showToast(t('admin.toasts.routeValidation'));
      return;
    }

    const startStop = selectedStopsForNewRoute[0];
    const endStop = selectedStopsForNewRoute[selectedStopsForNewRoute.length - 1];

    const waypoints: [number, number][] = selectedStopsForNewRoute
      .map((sid) => {
        const s = stops.find((stop) => stop.id === sid);
        return s ? ([s.lat, s.lng] as [number, number]) : null;
      })
      .filter((wp): wp is [number, number] => wp !== null);

    const newRoute: Route = {
      id: `r-${Date.now()}`,
      number: newRouteNumber.trim(),
      name: {
        ru: newRouteNameRu.trim(),
        kg: newRouteNameKg.trim() || newRouteNameRu.trim(),
        ...(newRouteNameEn.trim() ? { en: newRouteNameEn.trim() } : {}),
      },
      startStopId: startStop,
      endStopId: endStop,
      color: newRouteColor,
      category: newRouteCategory,
      stops: selectedStopsForNewRoute,
      waypoints: waypoints.length > 0 ? waypoints : [[40.9331, 72.9845], [40.9355, 72.9905]],
      durationMinutes: parseInt(newRouteDuration) || 20,
      frequencyMinutes: parseInt(newRouteInterval) || 10,
      fareKgs: parseInt(newRouteFare) || 15,
      firstDeparture: '06:00',
      lastDeparture: '22:00',
    };

    setRoutes((prev) => [...prev, newRoute]);
    setShowAddRouteModal(false);
    showToast(t('admin.toasts.routeAdded', { number: newRoute.number }));
    setNewRouteNumber('');
    setNewRouteNameRu('');
    setNewRouteNameKg('');
    setNewRouteNameEn('');
    setSelectedStopsForNewRoute([]);
  };

  // Handler: Delete Route
  const handleDeleteRoute = (routeId: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
    setBuses((prev) => prev.filter((b) => b.routeId !== routeId));
    showToast(t('admin.toasts.routeDeleted'));
  };

  // Handler: Add Stop
  const handleAddStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStopNameRu) {
      showToast(t('admin.toasts.stopValidation'));
      return;
    }

    const newStop: Stop = {
      id: `s-${Date.now()}`,
      name: {
        ru: newStopNameRu.trim(),
        kg: newStopNameKg.trim() || newStopNameRu.trim(),
        ...(newStopNameEn.trim() ? { en: newStopNameEn.trim() } : {}),
      },
      lat: parseFloat(newStopLat) || 40.9331,
      lng: parseFloat(newStopLng) || 72.9845,
      routes: [],
      address: {
        ru: newStopAddressRu.trim() || 'г. Манас',
        kg: newStopAddressRu.trim() || 'Манас ш.',
        en: newStopAddressRu.trim() || 'Manas City',
      },
      amenities: ['shelter', 'bench'],
    };

    setStops((prev) => [...prev, newStop]);
    setShowAddStopModal(false);
    showToast(t('admin.toasts.stopAdded', { name: l(newStop.name) }));
    setNewStopNameRu('');
    setNewStopNameKg('');
    setNewStopNameEn('');
    setNewStopAddressRu('');
  };

  // Handler: Delete Stop
  const handleDeleteStop = (stopId: string) => {
    setStops((prev) => prev.filter((s) => s.id !== stopId));
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        stops: r.stops.filter((id) => id !== stopId),
      }))
    );
    showToast(t('admin.toasts.stopDeleted'));
  };

  // Handler: Add Bus
  const handleAddBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusPlate) {
      showToast(t('admin.toasts.busValidation'));
      return;
    }

    const route = routes.find((r) => r.id === newBusRouteId) || routes[0];
    const firstStopId = route ? route.stops[0] : stops[0].id;
    const firstStop = stops.find((s) => s.id === firstStopId);

    const newBus: Bus = {
      id: `b-${Date.now()}`,
      plateNumber: newBusPlate.trim().toUpperCase(),
      routeId: route?.id || 'r1',
      direction: 'forward',
      currentLat: firstStop?.lat || 40.9331,
      currentLng: firstStop?.lng || 72.9845,
      speedKmh: 30,
      bearing: 90,
      nextStopId: route?.stops[1] || firstStopId,
      progress: 0.05,
      occupancy: 'low',
      model: newBusModel,
      isAccessible: true,
      hasWifi: true,
      hasAC: true,
      driverName: newBusDriver.trim() || t('busCard.driver'),
      isGpsSimulated: true,
      lastPingTime: new Date().toISOString(),
    };

    setBuses((prev) => [...prev, newBus]);
    setShowAddBusModal(false);
    showToast(
      t('admin.toasts.busAdded', {
        plate: newBus.plateNumber,
        number: route?.number || '?',
      })
    );
  };

  // Handler: Delete Bus
  const handleDeleteBus = (busId: string) => {
    setBuses((prev) => prev.filter((b) => b.id !== busId));
    showToast(t('admin.toasts.busDeleted'));
  };

  // Handler: Add Announcement
  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitleRu || !newNoticeContentRu) {
      showToast(t('admin.toasts.noticeValidation'));
      return;
    }

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: {
        ru: newNoticeTitleRu.trim(),
        kg: newNoticeTitleKg.trim() || newNoticeTitleRu.trim(),
      },
      content: {
        ru: newNoticeContentRu.trim(),
        kg: newNoticeContentKg.trim() || newNoticeContentRu.trim(),
      },
      type: newNoticeType,
      date: new Date().toISOString().slice(0, 10),
      isImportant: true,
    };

    setAnnouncements((prev) => [newAnn, ...prev]);
    setNewNoticeTitleRu('');
    setNewNoticeTitleKg('');
    setNewNoticeContentRu('');
    setNewNoticeContentKg('');
    showToast(t('admin.toasts.noticePublished'));
  };

  // Handler: Delete Announcement
  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    showToast(t('admin.toasts.noticeDeleted'));
  };

  // Handler: Resolve Delay
  const handleResolveDelay = (id: string) => {
    setDelays((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'resolved' as const } : d))
    );
    showToast(t('admin.toasts.delayResolved'));
  };

  // Export JSON Config
  const handleExportJson = () => {
    const payload = {
      system: 'Jolum Smart Transit System',
      city: 'Manas, Kyrgyzstan',
      exportedAt: new Date().toISOString(),
      routes,
      stops,
      buses,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jolum-manas-transit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('admin.toasts.jsonExported'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700/70 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
            <Shield className="w-4 h-4" />
            <span>{t('municipalityBadge')}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('admin.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('admin.subtitle')}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors shadow-2xs"
            title={t('admin.exportJsonTitle')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('admin.exportJson')}</span>
          </button>

          {confirmingReset ? (
            <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-200">
                {t('admin.confirmReset')}
              </span>
              <button
                type="button"
                onClick={() => {
                  onResetDemoData();
                  setConfirmingReset(false);
                  showToast(t('admin.toasts.resetSuccess'));
                }}
                className="px-2 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                {t('admin.actions.save')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg"
              >
                {t('admin.actions.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingReset(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors shadow-2xs"
              title={t('admin.actions.resetDemo')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('admin.actions.resetDemo')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto text-xs">
        {[
          { id: 'stats' as const, label: t('admin.tabs.stats'), icon: BarChart3 },
          { id: 'routes' as const, label: t('admin.tabs.routes'), icon: BusIcon },
          { id: 'stops' as const, label: t('admin.tabs.stops'), icon: MapPin },
          { id: 'buses' as const, label: t('admin.tabs.buses'), icon: Radio },
          { id: 'delays' as const, label: t('admin.tabs.delays'), icon: Clock },
          { id: 'announcements' as const, label: t('admin.tabs.announcements'), icon: Bell },
          { id: 'integration' as const, label: t('admin.tabs.integration'), icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Statistics & KPIs */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">
                {t('admin.stats.activeFleet')}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {buses.length}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  {t('admin.stats.fleetOnline')}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">
                {t('admin.stats.punctuality')}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {stats.onTimePercentage}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('admin.stats.punctualityTarget')}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">
                {t('admin.stats.dailyPassengers')}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {stats.dailyRidershipEstimated.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  +8.4%
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">
                {t('admin.stats.ecoBonus')}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {stats.co2SavedTons} {t('admin.stats.tons')}
                </span>
                <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
                  {t('admin.stats.ecoFleet')}
                </span>
              </div>
            </div>
          </div>

          {/* Hourly Traffic Chart Simulation */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('admin.stats.hourlyTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('admin.stats.hourlySubtitle')}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                {t('admin.stats.workdayBadge')}
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2 h-44 items-end pt-6 border-b border-slate-100 dark:border-slate-800 pb-2">
              {[
                { hour: '06:00', val: 25 },
                { hour: '07:00', val: 75 },
                { hour: '08:00', val: 95 },
                { hour: '09:00', val: 68 },
                { hour: '11:00', val: 45 },
                { hour: '13:00', val: 55 },
                { hour: '15:00', val: 50 },
                { hour: '17:00', val: 82 },
                { hour: '18:00', val: 98 },
                { hour: '19:00', val: 70 },
                { hour: '20:00', val: 40 },
                { hour: '22:00', val: 20 },
              ].map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div
                    className="w-full bg-sky-500 dark:bg-sky-500/90 group-hover:bg-sky-600 dark:group-hover:bg-sky-400 rounded-t-lg transition-all"
                    style={{ height: `${bar.val}%` }}
                    title={`${bar.hour}: ${tp('passengers', Math.round(bar.val * 12))}`}
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {bar.hour.slice(0, 2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Occupancy Line Chart (Recharts) */}
          <WeeklyLoadChart
            weeklyData={INITIAL_WEEKLY_LOAD}
            routes={routes}
            lang={lang}
            theme={theme}
          />
        </div>
      )}

      {/* Tab 2: Routes CRUD */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('admin.tables.routesListTitle')}
            </h2>
            <button
              onClick={() => setShowAddRouteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('admin.actions.addRoute')}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t('admin.tables.colNumber')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colRouteName')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colStops')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colInterval')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colFare')}</th>
                  <th className="py-3 px-4 text-right">{t('admin.tables.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {routes.map((route) => (
                  <tr key={route.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className="px-2.5 py-1 text-xs font-extrabold text-white rounded-lg inline-block"
                        style={{ backgroundColor: route.color }}
                      >
                        {route.number}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                      {l(route.name)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {tp('stops', route.stops.length)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {tp('minutesShort', route.frequencyMinutes)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                      {route.fareKgs} {t('routes.som')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteRoute(route.id)}
                        className="p-1.5 text-rose-500 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                        title={t('admin.actions.delete')}
                        aria-label={t('admin.actions.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Stops CRUD */}
      {activeTab === 'stops' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('admin.tables.stopsListTitle')}
            </h2>
            <button
              onClick={() => setShowAddStopModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('admin.actions.addStop')}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t('admin.tables.colStopName')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colCoords')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colRoutes')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colAddress')}</th>
                  <th className="py-3 px-4 text-right">{t('admin.tables.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stops.map((stop) => (
                  <tr key={stop.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{l(stop.name)}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {stop.name.ru} · {stop.name.kg}{stop.name.en ? ` · ${stop.name.en}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {stop.routes.map((rid) => {
                          const r = routes.find((rt) => rt.id === rid);
                          return r ? (
                            <span
                              key={r.id}
                              className="px-1.5 py-0.2 text-[10px] font-bold text-white rounded"
                              style={{ backgroundColor: r.color }}
                            >
                              №{r.number}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {l(stop.address) || t('cityShort')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteStop(stop.id)}
                        className="p-1.5 text-rose-500 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                        title={t('admin.actions.delete')}
                        aria-label={t('admin.actions.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Buses Fleet */}
      {activeTab === 'buses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('admin.tables.fleetListTitle')}
            </h2>
            <button
              onClick={() => setShowAddBusModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('admin.actions.addBus')}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t('admin.tables.colPlate')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colRoute')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colModel')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colDriver')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colSpeed')}</th>
                  <th className="py-3 px-4">{t('admin.tables.colGpsStatus')}</th>
                  <th className="py-3 px-4 text-right">{t('admin.tables.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {buses.map((bus) => {
                  const r = routes.find((rt) => rt.id === bus.routeId);
                  return (
                    <tr key={bus.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {bus.plateNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 text-xs font-bold text-white rounded"
                          style={{ backgroundColor: r?.color || '#0284c7' }}
                        >
                          №{r?.number || '?'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{bus.model}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{bus.driverName}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-200">
                        {bus.speedKmh} {t('busCard.kmh')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/70 px-2 py-0.5 rounded-full">
                          {t('admin.tables.demoSimBadge')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteBus(bus.id)}
                          className="p-1.5 text-rose-500 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                          title={t('admin.actions.delete')}
                          aria-label={t('admin.actions.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Delays */}
      {activeTab === 'delays' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('admin.delays.title')}
            </h2>
          </div>

          <div className="space-y-3">
            {delays.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
                {t('admin.delays.noDelays')}
              </div>
            ) : (
              delays.map((delay) => (
                <div
                  key={delay.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        delay.status === 'active'
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {t('admin.delays.routeLabel', {
                            number: delay.routeNumber,
                            plate: delay.busPlate,
                          })}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            delay.status === 'active'
                              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          +{tp('minutesShort', delay.delayMinutes)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {l(delay.reason)}
                      </p>
                    </div>
                  </div>

                  <div>
                    {delay.status === 'active' ? (
                      <button
                        onClick={() => handleResolveDelay(delay.id)}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl transition-colors"
                      >
                        {t('admin.delays.resolve')}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>{t('admin.delays.resolved')}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Announcements */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Create Announcement Form */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
                {t('admin.actions.publishAnnouncement')}
              </h3>
              <form onSubmit={handleAddAnnouncement} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.noticeTitleRu')}
                  </label>
                  <input
                    type="text"
                    required
                    value={newNoticeTitleRu}
                    onChange={(e) => setNewNoticeTitleRu(e.target.value)}
                    placeholder="№1..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.noticeTitleKg')}
                  </label>
                  <input
                    type="text"
                    value={newNoticeTitleKg}
                    onChange={(e) => setNewNoticeTitleKg(e.target.value)}
                    placeholder="№1..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.noticeContentRu')}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newNoticeContentRu}
                    onChange={(e) => setNewNoticeContentRu(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.noticeContentKg')}
                  </label>
                  <textarea
                    rows={3}
                    value={newNoticeContentKg}
                    onChange={(e) => setNewNoticeContentKg(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors"
                >
                  {t('admin.forms.publishToCitizens')}
                </button>
              </form>
            </div>

            {/* Existing Announcements List */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('admin.forms.activeAnnouncements')}
              </h3>
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/70 px-2 py-0.5 rounded-full mb-1 inline-block">
                        {ann.date}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {l(ann.title)}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        {l(ann.content)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                      title={t('admin.actions.delete')}
                      aria-label={t('admin.actions.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Integration with Real GPS */}
      {activeTab === 'integration' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('admin.integration.title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('admin.integration.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>{t('admin.integration.card1Title')}</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('admin.integration.card1Desc')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-sky-500" />
                <span>{t('admin.integration.card2Title')}</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('admin.integration.card2Desc')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-emerald-500" />
                <span>{t('admin.integration.card3Title')}</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('admin.integration.card3Desc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Route */}
      {showAddRouteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 dark:bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('admin.actions.addRoute')}
              </h3>
              <button
                onClick={() => setShowAddRouteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoute} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.routeNumber')}
                  </label>
                  <input
                    type="text"
                    required
                    value={newRouteNumber}
                    onChange={(e) => setNewRouteNumber(e.target.value)}
                    placeholder={t('admin.forms.routeNumberPlaceholder')}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.routeColor')}
                  </label>
                  <input
                    type="color"
                    value={newRouteColor}
                    onChange={(e) => setNewRouteColor(e.target.value)}
                    className="w-full h-9 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.routeNameRu')}
                </label>
                <input
                  type="text"
                  required
                  value={newRouteNameRu}
                  onChange={(e) => setNewRouteNameRu(e.target.value)}
                  placeholder="Мэрия ⇄ Студгородок"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.routeNameKg')}
                </label>
                <input
                  type="text"
                  value={newRouteNameKg}
                  onChange={(e) => setNewRouteNameKg(e.target.value)}
                  placeholder="Мэрия ⇄ Студенттер шаарчасы"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.routeNameEn')}
                </label>
                <input
                  type="text"
                  value={newRouteNameEn}
                  onChange={(e) => setNewRouteNameEn(e.target.value)}
                  placeholder="City Hall ⇄ University Campus"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.durationMin')}
                  </label>
                  <input
                    type="number"
                    value={newRouteDuration}
                    onChange={(e) => setNewRouteDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.intervalMin')}
                  </label>
                  <input
                    type="number"
                    value={newRouteInterval}
                    onChange={(e) => setNewRouteInterval(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.fareKgs')}
                  </label>
                  <input
                    type="number"
                    value={newRouteFare}
                    onChange={(e) => setNewRouteFare(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                  />
                </div>
              </div>

              {/* Stop Selector for route */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1.5">
                  {t('admin.forms.selectStopsOrder')}
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-2 space-y-1">
                  {stops.map((stop) => {
                    const isSelected = selectedStopsForNewRoute.includes(stop.id);
                    return (
                      <label
                        key={stop.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStopsForNewRoute((prev) => [...prev, stop.id]);
                            } else {
                              setSelectedStopsForNewRoute((prev) =>
                                prev.filter((id) => id !== stop.id)
                              );
                            }
                          }}
                          className="rounded text-sky-600"
                        />
                        <span className="text-slate-800 dark:text-slate-200">{l(stop.name)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddRouteModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t('admin.actions.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold"
                >
                  {t('admin.actions.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Stop */}
      {showAddStopModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 dark:bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('admin.actions.addStop')}
              </h3>
              <button
                onClick={() => setShowAddStopModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStop} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.stopNameRu')}
                </label>
                <input
                  type="text"
                  required
                  value={newStopNameRu}
                  onChange={(e) => setNewStopNameRu(e.target.value)}
                  placeholder="Кинотеатр «Семетей»"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.stopNameKg')}
                </label>
                <input
                  type="text"
                  value={newStopNameKg}
                  onChange={(e) => setNewStopNameKg(e.target.value)}
                  placeholder="«Семетей» кинотеатры"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.stopNameEn')}
                </label>
                <input
                  type="text"
                  value={newStopNameEn}
                  onChange={(e) => setNewStopNameEn(e.target.value)}
                  placeholder="Semetey Cinema"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.lat')}
                  </label>
                  <input
                    type="text"
                    value={newStopLat}
                    onChange={(e) => setNewStopLat(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    {t('admin.forms.lng')}
                  </label>
                  <input
                    type="text"
                    value={newStopLng}
                    onChange={(e) => setNewStopLng(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.address')}
                </label>
                <input
                  type="text"
                  value={newStopAddressRu}
                  onChange={(e) => setNewStopAddressRu(e.target.value)}
                  placeholder="ул. Манаса, 10"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddStopModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t('admin.actions.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold"
                >
                  {t('admin.actions.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Bus */}
      {showAddBusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 dark:bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('admin.actions.addBus')}
              </h3>
              <button
                onClick={() => setShowAddBusModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBus} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.busPlate')}
                </label>
                <input
                  type="text"
                  required
                  value={newBusPlate}
                  onChange={(e) => setNewBusPlate(e.target.value)}
                  placeholder="04KG 742AB"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.assignedRoute')}
                </label>
                <select
                  value={newBusRouteId}
                  onChange={(e) => setNewBusRouteId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {t('admin.stats.routePrefix')}{r.number} ({l(r.name)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.busModel')}
                </label>
                <input
                  type="text"
                  value={newBusModel}
                  onChange={(e) => setNewBusModel(e.target.value)}
                  placeholder="Yutong ZK6108H"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  {t('admin.forms.driverFullName')}
                </label>
                <input
                  type="text"
                  value={newBusDriver}
                  onChange={(e) => setNewBusDriver(e.target.value)}
                  placeholder={t('busCard.driver')}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBusModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t('admin.actions.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold"
                >
                  {t('admin.actions.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
