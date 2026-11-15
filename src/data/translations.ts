import { Language } from '../types/transit';
import {
  LOCALE_DICTIONARIES,
  PluralKey,
  resolveLocalizedText,
  translate,
  translatePlural,
} from '../i18n';

export const translations = LOCALE_DICTIONARIES;

export function getTranslation(
  lang: Language,
  keyPath: string,
  params?: Record<string, string | number>
): string {
  return translate(lang, keyPath, params);
}

export function getPluralTranslation(
  lang: Language,
  pluralKey: PluralKey,
  count: number,
  params?: Record<string, string | number>
): string {
  return translatePlural(lang, pluralKey, count, params);
}

export { resolveLocalizedText };
