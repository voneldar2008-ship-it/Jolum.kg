import test from 'node:test';
import assert from 'node:assert/strict';
import { applyThemeToDocument, parseStoredTheme, toggleThemeMode } from './theme';

test('parseStoredTheme parses dark and falls back to light', () => {
  assert.equal(parseStoredTheme('dark'), 'dark');
  assert.equal(parseStoredTheme('light'), 'light');
  assert.equal(parseStoredTheme(null), 'light');
  assert.equal(parseStoredTheme('invalid'), 'light');
});

test('toggleThemeMode alternates between light and dark', () => {
  assert.equal(toggleThemeMode('light'), 'dark');
  assert.equal(toggleThemeMode('dark'), 'light');
});

test('applyThemeToDocument updates root classList and colorScheme', () => {
  const classes = new Set<string>();
  const mockRoot = {
    classList: {
      add: (c: string) => {
        classes.add(c);
      },
      remove: (c: string) => {
        classes.delete(c);
      },
    },
    style: { colorScheme: '' },
  };

  applyThemeToDocument('dark', mockRoot);
  assert.equal(classes.has('dark'), true);
  assert.equal(mockRoot.style.colorScheme, 'dark');

  applyThemeToDocument('light', mockRoot);
  assert.equal(classes.has('dark'), false);
  assert.equal(mockRoot.style.colorScheme, 'light');
});
