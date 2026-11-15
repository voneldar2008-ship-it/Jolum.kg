import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPluralCategory,
  LOCALE_DICTIONARIES,
  parseStoredLanguage,
  resolveLocalizedText,
  translate,
  translatePlural,
} from './index';
import ruLocale from '../locales/ru.json';
import kgLocale from '../locales/kg.json';
import enLocale from '../locales/en.json';

function collectLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

test('all JSON locale files contain complete parity for non-plural keys', () => {
  const ruKeys = collectLeafKeys(ruLocale).filter((k) => !k.startsWith('plurals.'));
  for (const key of ruKeys) {
    assert.notEqual(translate('ru', key), key, `Missing RU key: ${key}`);
    assert.notEqual(translate('kg', key), key, `Missing KG key: ${key}`);
    assert.notEqual(translate('en', key), key, `Missing EN key: ${key}`);
  }
  assert.ok(Object.keys(kgLocale.plurals).length >= 9);
  assert.ok(Object.keys(enLocale.plurals).length >= 9);
  assert.ok(Object.keys(LOCALE_DICTIONARIES).length === 3);
});

test('getPluralCategory implements Russian Slavic declension rules accurately', () => {
  assert.equal(getPluralCategory('ru', 1), 'one');
  assert.equal(getPluralCategory('ru', 21), 'one');
  assert.equal(getPluralCategory('ru', 2), 'few');
  assert.equal(getPluralCategory('ru', 4), 'few');
  assert.equal(getPluralCategory('ru', 23), 'few');
  assert.equal(getPluralCategory('ru', 0), 'many');
  assert.equal(getPluralCategory('ru', 5), 'many');
  assert.equal(getPluralCategory('ru', 11), 'many');
  assert.equal(getPluralCategory('ru', 12), 'many');
  assert.equal(getPluralCategory('ru', 14), 'many');
  assert.equal(getPluralCategory('ru', 25), 'many');
});

test('translatePlural formats declined forms for RU, KG, and EN', () => {
  assert.equal(translatePlural('ru', 'stops', 1), '1 остановка');
  assert.equal(translatePlural('ru', 'stops', 3), '3 остановки');
  assert.equal(translatePlural('ru', 'stops', 5), '5 остановок');
  assert.equal(translatePlural('ru', 'stops', 11), '11 остановок');

  assert.equal(translatePlural('ru', 'buses', 1), '1 автобус');
  assert.equal(translatePlural('ru', 'buses', 2), '2 автобуса');
  assert.equal(translatePlural('ru', 'buses', 7), '7 автобусов');

  assert.equal(translatePlural('en', 'stops', 1), '1 stop');
  assert.equal(translatePlural('en', 'stops', 4), '4 stops');
  assert.equal(translatePlural('en', 'buses', 1), '1 bus');
  assert.equal(translatePlural('en', 'buses', 7), '7 buses');

  assert.equal(translatePlural('kg', 'stops', 1), '1 аялдама');
  assert.equal(translatePlural('kg', 'stops', 7), '7 аялдама');
});

test('translate falls back along LOCALE_FALLBACK_CHAINS when key or string is missing', () => {
  const customDicts = {
    ru: { greeting: { hello: 'Привет, {{name}}' }, onlyRu: 'Только RU' },
    kg: { greeting: { hello: '' } },
    en: { greeting: { hello: 'Hello, {{name}}' } },
  };

  // Empty string in KG should fall back to RU ('Привет, Азамат')
  assert.equal(translate('kg', 'greeting.hello', { name: 'Азамат' }, customDicts), 'Привет, Азамат');
  // Missing key in EN should fall back to RU ('Только RU')
  assert.equal(translate('en', 'onlyRu', undefined, customDicts), 'Только RU');
  // Totally missing key returns keyPath
  assert.equal(translate('en', 'non.existent.key', undefined, customDicts), 'non.existent.key');
});

test('resolveLocalizedText applies fallback chain for partial entity translations', () => {
  const partialEntity = { ru: 'Автовокзал', kg: 'Автобекет' };
  assert.equal(resolveLocalizedText(partialEntity, 'en'), 'Автовокзал');
  assert.equal(resolveLocalizedText(partialEntity, 'kg'), 'Автобекет');

  const fullEntity = { ru: 'Мэрия', kg: 'Мэрия', en: 'City Hall' };
  assert.equal(resolveLocalizedText(fullEntity, 'en'), 'City Hall');
  assert.equal(resolveLocalizedText({ ru: 'Парк', kg: '' }, 'kg'), 'Парк');
});

test('parseStoredLanguage safely validates persisted language codes', () => {
  assert.equal(parseStoredLanguage('en'), 'en');
  assert.equal(parseStoredLanguage('kg'), 'kg');
  assert.equal(parseStoredLanguage('ru'), 'ru');
  assert.equal(parseStoredLanguage('fr'), 'ru');
  assert.equal(parseStoredLanguage(null), 'ru');
});
