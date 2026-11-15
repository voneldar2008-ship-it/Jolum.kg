import React, { useEffect } from 'react';
import {
  Settings,
  Sun,
  Moon,
  X,
  Globe,
  Play,
  Pause,
  FastForward,
  Check,
} from 'lucide-react';
import { Language } from '../types/transit';
import { createTranslator, SUPPORTED_LANGUAGES } from '../i18n';
import { ThemeMode } from '../utils/theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  lang: Language;
  onChangeLang: (lang: Language) => void;
  isSimulating: boolean;
  onToggleSimulating: () => void;
  simSpeed: number;
  onChangeSimSpeed: (speed: number) => void;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  ru: 'Русский',
  kg: 'Кыргызча',
  en: 'English',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onChangeTheme,
  lang,
  onChangeLang,
  isSimulating,
  onToggleSimulating,
  simSpeed,
  onChangeSimSpeed,
}) => {
  const { t } = createTranslator(lang);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 dark:bg-slate-950/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="settings-modal-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100 truncate"
              >
                {t('settings.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {t('settings.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Theme Switcher Section */}
          <div>
            <div className="mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('settings.themeSectionTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('settings.themeSectionHint')}
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label={t('settings.themeSectionTitle')}
              className="grid grid-cols-2 gap-3"
            >
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
                onClick={() => onChangeTheme('light')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-2.5 ${
                  theme === 'light'
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                    <Sun className="w-5 h-5" />
                  </span>
                  {theme === 'light' && (
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t('settings.lightTheme')}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('settings.lightThemeDesc')}
                  </div>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
                onClick={() => onChangeTheme('dark')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-2.5 ${
                  theme === 'dark'
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/50 ring-2 ring-sky-500/25'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-700 text-sky-400 flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                  </span>
                  {theme === 'dark' && (
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t('settings.darkTheme')}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('settings.darkThemeDesc')}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Language Selection */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>{t('settings.languageSectionTitle')}</span>
            </div>

            <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1">
              {SUPPORTED_LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeLang(code)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center ${
                    lang === code
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {LANGUAGE_LABELS[code]}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('settings.simulationSectionTitle')}
            </div>
            <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5">
              <button
                type="button"
                onClick={onToggleSimulating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:border-sky-400 transition-colors"
              >
                {isSimulating ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>{t('map.pause')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t('map.play')}</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-1">
                {[1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onChangeSimSpeed(spd)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors ${
                      simSpeed === spd
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <FastForward className="w-3 h-3" />
                    <span>{spd}x</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
