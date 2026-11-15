import ruLocale from '../locales/ru.json';
import kgLocale from '../locales/kg.json';
import enLocale from '../locales/en.json';
import { Language, LocalizedString } from '../types/transit';

export type LocaleSchema = typeof ruLocale;
export type PluralKey = keyof LocaleSchema['plurals'];
export type PluralCategory = 'one' | 'few' | 'many' | 'other';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

export const LANG_STORAGE_KEY = 'jolum_lang';
export const SUPPORTED_LANGUAGES: readonly Language[] = ['ru', 'kg', 'en'] as const;

/**
 * Fallback chains ensure missing or empty keys degrade gracefully across languages
 * without exposing raw key paths or broken UI strings.
 */
export const LOCALE_FALLBACK_CHAINS: Record<Language, readonly Language[]> = {
  ru: ['ru', 'en', 'kg'],
  kg: ['kg', 'ru', 'en'],
  en: ['en', 'ru', 'kg'],
};

// Compile-time validation that kg.json and en.json match the master schema structure
const _validateKg: DeepPartial<LocaleSchema> = kgLocale;
const _validateEn: DeepPartial<LocaleSchema> = enLocale;
void _validateKg;
void _validateEn;

export const LOCALE_DICTIONARIES: Record<Language, DeepPartial<LocaleSchema>> = {
  ru: ruLocale,
  kg: kgLocale,
  en: enLocale,
};

export function parseStoredLanguage(raw: string | null | undefined): Language {
  if (raw === 'kg' || raw === 'en' || raw === 'ru') return raw;
  return 'ru';
}

/**
 * Computes CLDR plural category for a numeric count in Russian, Kyrgyz, or English.
 * Handles Russian Slavic declension (one/few/many), English (one/other), and Kyrgyz (invariant/other).
 */
export function getPluralCategory(lang: Language, count: number): PluralCategory {
  const abs = Math.abs(count);

  if (lang === 'ru') {
    if (!Number.isInteger(abs)) {
      return 'other';
    }
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return 'one';
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 'few';
    }
    return 'many';
  }

  if (lang === 'en') {
    return abs === 1 ? 'one' : 'other';
  }

  // Kyrgyz numerals are followed by singular/invariant noun forms (e.g., "1 аялдама", "5 аялдама").
  return abs === 1 ? 'one' : 'other';
}

function getNestedValue(obj: unknown, keyPath: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export function interpolateTemplate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      return String(params[token]);
    }
    return match;
  });
}

/**
 * Resolves a translation key using the configured fallback chain and interpolates {{params}}.
 */
export function translate(
  lang: Language,
  keyPath: string,
  params?: Record<string, string | number>,
  dictionaries: Partial<Record<Language, unknown>> = LOCALE_DICTIONARIES
): string {
  const chain = LOCALE_FALLBACK_CHAINS[lang] || LOCALE_FALLBACK_CHAINS.ru;

  for (const candidateLang of chain) {
    const dict = dictionaries[candidateLang];
    const value = getNestedValue(dict, keyPath);
    if (typeof value === 'string' && value.trim().length > 0) {
      return interpolateTemplate(value, params);
    }
  }

  return keyPath;
}

/**
 * Resolves a pluralized/declined noun phrase for a given count with full locale fallback.
 */
export function translatePlural(
  lang: Language,
  pluralKey: PluralKey,
  count: number,
  params?: Record<string, string | number>,
  dictionaries: Partial<Record<Language, unknown>> = LOCALE_DICTIONARIES
): string {
  const chain = LOCALE_FALLBACK_CHAINS[lang] || LOCALE_FALLBACK_CHAINS.ru;

  for (const candidateLang of chain) {
    const dict = dictionaries[candidateLang];
    const entry = getNestedValue(dict, `plurals.${String(pluralKey)}`);
    if (entry && typeof entry === 'object') {
      const record = entry as Partial<Record<PluralCategory, string>>;
      const category = getPluralCategory(candidateLang, count);
      const template =
        record[category] ||
        record.other ||
        record.many ||
        record.few ||
        record.one;

      if (typeof template === 'string' && template.trim().length > 0) {
        return interpolateTemplate(template, { count, ...params });
      }
    }
  }

  return `${count} ${String(pluralKey)}`;
}

/**
 * Resolves dynamic entity localized strings (stops, routes, announcements) with fallback rules.
 */
export function resolveLocalizedText(
  value: LocalizedString | Partial<Record<Language, string>> | string | undefined | null,
  lang: Language
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  const chain = LOCALE_FALLBACK_CHAINS[lang] || LOCALE_FALLBACK_CHAINS.ru;
  for (const candidateLang of chain) {
    const text = value[candidateLang];
    if (typeof text === 'string' && text.trim().length > 0) {
      return text;
    }
  }

  return '';
}

export interface Translator {
  lang: Language;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  tp: (pluralKey: PluralKey, count: number, params?: Record<string, string | number>) => string;
  l: (value: LocalizedString | Partial<Record<Language, string>> | string | undefined | null) => string;
}

export function createTranslator(lang: Language): Translator {
  return {
    lang,
    t: (keyPath, params) => translate(lang, keyPath, params),
    tp: (pluralKey, count, params) => translatePlural(lang, pluralKey, count, params),
    l: (value) => resolveLocalizedText(value, lang),
  };
}
