import React, { useState } from 'react';
import {
  Map,
  Compass,
  Bus as BusIcon,
  MapPin,
  Bell,
  Shield,
  Star,
  Play,
  Pause,
  FastForward,
  Globe,
  Menu,
  X,
  QrCode,
  Settings,
} from 'lucide-react';
import { Language } from '../types/transit';
import { createTranslator, SUPPORTED_LANGUAGES } from '../i18n';

interface NavbarProps {
  currentTab: 'map' | 'routes' | 'planner' | 'stops' | 'news' | 'admin';
  setCurrentTab: (tab: 'map' | 'routes' | 'planner' | 'stops' | 'news' | 'admin') => void;
  lang: Language;
  setLang: (lang: Language) => void;
  isSimulating: boolean;
  setIsSimulating: (val: boolean) => void;
  simSpeed: number;
  setSimSpeed: (speed: number) => void;
  favoritesCount: number;
  onOpenFavorites: () => void;
  onOpenShareQr: () => void;
  onOpenSettings: () => void;
  unreadAnnouncementsCount: number;
}

const LANGUAGE_TITLES: Record<Language, string> = {
  ru: 'Русский язык',
  kg: 'Кыргыз тили',
  en: 'English',
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  isSimulating,
  setIsSimulating,
  simSpeed,
  setSimSpeed,
  favoritesCount,
  onOpenFavorites,
  onOpenShareQr,
  onOpenSettings,
  unreadAnnouncementsCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = createTranslator(lang);

  const navItems = [
    { id: 'map' as const, label: t('nav.map'), icon: Map },
    { id: 'routes' as const, label: t('nav.routes'), icon: BusIcon },
    { id: 'planner' as const, label: t('nav.planner'), icon: Compass },
    { id: 'stops' as const, label: t('nav.stops'), icon: MapPin },
    {
      id: 'news' as const,
      label: t('nav.news'),
      icon: Bell,
      badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined,
    },
    { id: 'admin' as const, label: t('nav.admin'), icon: Shield },
  ];

  const cycleSpeed = () => {
    if (simSpeed === 1) setSimSpeed(2);
    else if (simSpeed === 2) setSimSpeed(4);
    else setSimSpeed(1);
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      {/* Top Demo Simulation Banner */}
      <div className="bg-sky-50 dark:bg-sky-950/60 border-b border-sky-100 dark:border-sky-900/60 px-4 py-1.5 flex items-center justify-between text-xs text-sky-900 dark:text-sky-100">
        <div className="flex items-center gap-2 max-w-4xl truncate">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <span className="font-semibold">{t('demoNotice')}:</span>
          <span className="text-sky-700 dark:text-sky-300 truncate">{t('demoNoticeLong')}</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 shadow-2xs">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className="p-1 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 rounded transition-colors"
              title={isSimulating ? t('map.pause') : t('map.play')}
              aria-label={isSimulating ? t('map.pause') : t('map.play')}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <button
              onClick={cycleSpeed}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 rounded"
              title={t('map.simSpeed')}
            >
              <FastForward className="w-3 h-3" />
              <span>{simSpeed}x</span>
            </button>
          </div>
          <span className="text-[11px] font-medium text-sky-800 dark:text-sky-200 bg-sky-100/70 dark:bg-sky-900/60 px-2 py-0.5 rounded-full">
            {t('cityBadge')}
          </span>
        </div>
      </div>

      {/* Main Top Navigation Row */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3 lg:gap-4">
          {/* Brand Logo Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentTab('map')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-sky-600/30 group-hover:scale-105 transition-transform">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19L9 4h6l5 15" />
                  <path d="M6 14h12" />
                  <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {t('appName')}
                  </span>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded-sm bg-slate-900 dark:bg-sky-600 text-white">
                    {t('cityShort')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none hidden 2xl:block whitespace-nowrap">
                  {t('appTagline')}
                </p>
              </div>
            </button>
          </div>

          {/* Navigation Items (Desktop) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 text-[13px] xl:text-sm font-medium rounded-lg transition-colors relative whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="w-4 h-4 text-[10px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Utility Actions Zone */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Switcher */}
            <div
              className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700"
              role="group"
              aria-label={t('settings.languageSectionTitle')}
            >
              {SUPPORTED_LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  data-testid={`lang-btn-${code}`}
                  onClick={() => setLang(code)}
                  className={`px-2 py-1 text-xs font-semibold rounded-md transition-all uppercase ${
                    lang === code
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title={LANGUAGE_TITLES[code]}
                  aria-pressed={lang === code}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Share QR Button */}
            <button
              type="button"
              onClick={onOpenShareQr}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/70 border border-sky-200 dark:border-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title={t('shareQr.title')}
              aria-label={t('shareQr.title')}
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>{t('shareQr.buttonLabel')}</span>
            </button>

            {/* Favorites Button */}
            <button
              onClick={onOpenFavorites}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative shrink-0"
              title={t('nav.favorites')}
              aria-label={t('nav.favorites')}
            >
              <Star className="w-5 h-5" />
              {favoritesCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Settings Menu Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              title={t('settings.buttonLabel')}
              aria-label={t('settings.buttonLabel')}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0"
              aria-label={t('nav.toggleMenu')}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="w-5 h-5 text-xs font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onOpenShareQr();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/70"
            >
              <QrCode className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{t('shareQr.buttonLabel')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
              <span>{t('settings.buttonLabel')}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>{t('map.simSpeed')}:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-medium"
              >
                {isSimulating ? t('map.pause') : t('map.play')}
              </button>
              <button
                onClick={cycleSpeed}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-mono font-medium"
              >
                {simSpeed}x
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
