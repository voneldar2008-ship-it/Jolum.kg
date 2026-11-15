/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { TransitMap } from './components/TransitMap';
import { RouteExplorer } from './components/RouteExplorer';
import { TripPlanner } from './components/TripPlanner';
import { StopViewer } from './components/StopViewer';
import { AdminPanel } from './components/AdminPanel';
import { NewsModal } from './components/NewsModal';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { ShareQrModal } from './components/ShareQrModal';
import { SettingsModal } from './components/SettingsModal';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_BUSES,
  INITIAL_DELAYS,
  INITIAL_ROUTES,
  INITIAL_STATS,
  INITIAL_STOPS,
} from './data/initialData';
import {
  Announcement,
  Bus,
  DelayIncident,
  Language,
  Route,
  Stop,
  TransitStats,
  TripPlanOption,
} from './types/transit';
import { resolveSiteShareUrl } from './utils/share';
import {
  THEME_STORAGE_KEY,
  ThemeMode,
  applyThemeToDocument,
  parseStoredTheme,
} from './utils/theme';
import { LANG_STORAGE_KEY, parseStoredLanguage } from './i18n';
import { BusSimulationEngine } from './simulation/BusSimulationEngine';

export default function App() {
  // Navigation & Localization State
  const [currentTab, setCurrentTab] = useState<
    'map' | 'routes' | 'planner' | 'stops' | 'news' | 'admin'
  >('map');
  const [lang, setLang] = useState<Language>(() =>
    parseStoredLanguage(typeof window !== 'undefined' ? localStorage.getItem(LANG_STORAGE_KEY) : null)
  );

  // Core Transit Network State
  const [routes, setRoutes] = useState<Route[]>(() => {
    const saved = localStorage.getItem('jolum_manas_v2_routes');
    return saved ? JSON.parse(saved) : INITIAL_ROUTES;
  });

  const [stops, setStops] = useState<Stop[]>(() => {
    const saved = localStorage.getItem('jolum_manas_v2_stops');
    return saved ? JSON.parse(saved) : INITIAL_STOPS;
  });

  const [buses, setBuses] = useState<Bus[]>(INITIAL_BUSES);

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('jolum_manas_v2_announcements');
    return saved ? JSON.parse(saved) : INITIAL_ANNOUNCEMENTS;
  });

  const [delays, setDelays] = useState<DelayIncident[]>(() => {
    const saved = localStorage.getItem('jolum_manas_v2_delays');
    return saved ? JSON.parse(saved) : INITIAL_DELAYS;
  });

  const [stats, setStats] = useState<TransitStats>(INITIAL_STATS);

  // Selected entities for drill-down & map focus
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  // Trip planner initial stops transfer
  const [plannerFromStopId, setPlannerFromStopId] = useState<string | null>('s1');
  const [plannerToStopId, setPlannerToStopId] = useState<string | null>('s8');

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('jolum_favorites');
    return saved ? JSON.parse(saved) : ['r1', 'r3'];
  });
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  // Share QR Modal & URL Resolution
  const [isShareQrOpen, setIsShareQrOpen] = useState(false);
  const [customShareUrl, setCustomShareUrl] = useState('');

  // Settings Modal & Light/Dark Theme
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() =>
    parseStoredTheme(typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null)
  );

  useEffect(() => {
    applyThemeToDocument(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'kg' ? 'ky' : lang;
    }
  }, [lang]);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const envAppUrl = typeof __JOLUM_APP_URL__ !== 'undefined' ? __JOLUM_APP_URL__ : '';
  const shareResolution = resolveSiteShareUrl({
    currentOrigin,
    envAppUrl,
    customUrl: customShareUrl,
  });

  // Simulation Controls
  const [isSimulating, setIsSimulating] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1);

  // Decoupled Physics Simulation Engine (calculation loop separated from 60 FPS Canvas rAF)
  const simulationEngineRef = useRef<BusSimulationEngine | null>(null);
  if (!simulationEngineRef.current) {
    simulationEngineRef.current = new BusSimulationEngine(routes, buses, {
      tickIntervalMs: 1000,
      baseSpeedScale: 4,
    });
  }

  // Persist routes & stops & announcements to localStorage
  useEffect(() => {
    localStorage.setItem('jolum_manas_v2_routes', JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    localStorage.setItem('jolum_manas_v2_stops', JSON.stringify(stops));
  }, [stops]);

  useEffect(() => {
    localStorage.setItem('jolum_manas_v2_announcements', JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem('jolum_manas_v2_delays', JSON.stringify(delays));
  }, [delays]);

  useEffect(() => {
    localStorage.setItem('jolum_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Start simulation engine & subscribe throttled UI state updates (1 Hz)
  useEffect(() => {
    const engine = simulationEngineRef.current!;
    const unsubscribe = engine.subscribeUi((updatedBuses) => {
      setBuses(updatedBuses);
    });
    engine.start();

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, []);

  // Sync structural changes from routes/buses into the engine
  useEffect(() => {
    simulationEngineRef.current?.syncRoutes(routes);
  }, [routes]);

  useEffect(() => {
    simulationEngineRef.current?.syncBuses(buses);
  }, [buses]);

  useEffect(() => {
    simulationEngineRef.current?.setSimulating(isSimulating);
  }, [isSimulating]);

  useEffect(() => {
    simulationEngineRef.current?.setSpeed(simSpeed);
  }, [simSpeed]);

  // Favorites Toggle
  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Reset to original Demo Seed
  const handleResetDemoData = () => {
    localStorage.removeItem('jolum_manas_v2_routes');
    localStorage.removeItem('jolum_manas_v2_stops');
    localStorage.removeItem('jolum_manas_v2_announcements');
    localStorage.removeItem('jolum_manas_v2_delays');
    setRoutes(INITIAL_ROUTES);
    setStops(INITIAL_STOPS);
    setBuses(INITIAL_BUSES);
    simulationEngineRef.current?.syncRoutes(INITIAL_ROUTES);
    simulationEngineRef.current?.replaceFleet(INITIAL_BUSES);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setDelays(INITIAL_DELAYS);
    setStats(INITIAL_STATS);
    setSelectedRouteId(null);
    setSelectedStopId(null);
    setSelectedBusId(null);
  };

  // Handler for "Show on Map" from Route Explorer
  const handleViewRouteOnMap = (routeId: string) => {
    setSelectedRouteId(routeId);
    setCurrentTab('map');
  };

  // Handler for "Show on Map" from Stop Viewer
  const handleViewStopOnMap = (stopId: string) => {
    setSelectedStopId(stopId);
    setCurrentTab('map');
  };

  // Handler for "Plan Route" from Stop Viewer or Map
  const handleOpenPlannerWithStop = (stopId: string, as: 'from' | 'to') => {
    if (as === 'from') {
      setPlannerFromStopId(stopId);
    } else {
      setPlannerToStopId(stopId);
    }
    setCurrentTab('planner');
  };

  // Handler for Plan visualization on map
  const handleViewPlanOnMap = (plan: TripPlanOption) => {
    if (plan.segments.length > 0) {
      setSelectedRouteId(plan.segments[0].route.id);
      setSelectedStopId(plan.segments[0].boardStop.id);
    }
    setCurrentTab('map');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-sky-500 selection:text-white transition-colors duration-200">
      {/* Primary Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lang={lang}
        setLang={setLang}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        favoritesCount={favorites.length}
        onOpenFavorites={() => {
          setIsShareQrOpen(false);
          setIsSettingsOpen(false);
          setIsFavoritesOpen(true);
        }}
        onOpenShareQr={() => {
          setIsFavoritesOpen(false);
          setIsSettingsOpen(false);
          setIsShareQrOpen(true);
        }}
        onOpenSettings={() => {
          setIsFavoritesOpen(false);
          setIsShareQrOpen(false);
          setIsSettingsOpen(true);
        }}
        unreadAnnouncementsCount={announcements.filter((a) => a.isImportant).length}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'map' && (
          <TransitMap
            routes={routes}
            stops={stops}
            buses={buses}
            simulationEngine={simulationEngineRef.current}
            selectedRouteId={selectedRouteId}
            setSelectedRouteId={setSelectedRouteId}
            selectedStopId={selectedStopId}
            setSelectedStopId={setSelectedStopId}
            selectedBusId={selectedBusId}
            setSelectedBusId={setSelectedBusId}
            lang={lang}
            theme={theme}
            onOpenPlannerWithStop={handleOpenPlannerWithStop}
            shareUrl={shareResolution.url}
            onOpenShareQr={() => {
              setIsFavoritesOpen(false);
              setIsSettingsOpen(false);
              setIsShareQrOpen(true);
            }}
          />
        )}

        {currentTab === 'routes' && (
          <RouteExplorer
            routes={routes}
            stops={stops}
            buses={buses}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(id) => setSelectedRouteId(id)}
            onSelectStop={(id) => handleViewStopOnMap(id)}
            onViewOnMap={handleViewRouteOnMap}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            lang={lang}
          />
        )}

        {currentTab === 'planner' && (
          <TripPlanner
            stops={stops}
            routes={routes}
            initialFromStopId={plannerFromStopId}
            initialToStopId={plannerToStopId}
            onViewPlanOnMap={handleViewPlanOnMap}
            lang={lang}
          />
        )}

        {currentTab === 'stops' && (
          <StopViewer
            stops={stops}
            routes={routes}
            buses={buses}
            selectedStopId={selectedStopId}
            onSelectStop={(id) => setSelectedStopId(id)}
            onViewOnMap={handleViewStopOnMap}
            onPlanTrip={handleOpenPlannerWithStop}
            lang={lang}
          />
        )}

        {currentTab === 'news' && (
          <NewsModal
            announcements={announcements}
            routes={routes}
            lang={lang}
            onClose={() => setCurrentTab('map')}
            onFilterRoute={(rid) => {
              setSelectedRouteId(rid);
              setCurrentTab('map');
            }}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPanel
            routes={routes}
            setRoutes={setRoutes}
            stops={stops}
            setStops={setStops}
            buses={buses}
            setBuses={setBuses}
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            delays={delays}
            setDelays={setDelays}
            stats={stats}
            onResetDemoData={handleResetDemoData}
            lang={lang}
            theme={theme}
          />
        )}
      </main>

      {/* Favorites Drawer Modal */}
      <FavoritesDrawer
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        routes={routes}
        stops={stops}
        onSelectRoute={(id) => {
          setSelectedRouteId(id);
          setCurrentTab('map');
        }}
        onSelectStop={(id) => {
          setSelectedStopId(id);
          setCurrentTab('map');
        }}
        lang={lang}
      />

      {/* Share QR Modal */}
      <ShareQrModal
        isOpen={isShareQrOpen}
        onClose={() => setIsShareQrOpen(false)}
        resolution={shareResolution}
        customUrl={customShareUrl}
        onSetCustomUrl={setCustomShareUrl}
        lang={lang}
      />

      {/* Settings Menu Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onChangeTheme={setTheme}
        lang={lang}
        onChangeLang={setLang}
        isSimulating={isSimulating}
        onToggleSimulating={() => setIsSimulating((prev) => !prev)}
        simSpeed={simSpeed}
        onChangeSimSpeed={setSimSpeed}
      />
    </div>
  );
}
