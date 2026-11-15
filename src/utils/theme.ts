export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'jolum_theme';

/**
 * Parses a persisted theme string from localStorage, defaulting safely to 'light'.
 */
export function parseStoredTheme(raw: string | null | undefined): ThemeMode {
  return raw === 'dark' ? 'dark' : 'light';
}

/**
 * Switches between light and dark theme modes.
 */
export function toggleThemeMode(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

/**
 * Applies the selected theme mode to the root HTML element without touching unrelated styles.
 */
export function applyThemeToDocument(
  theme: ThemeMode,
  rootEl: { classList: { add: (c: string) => void; remove: (c: string) => void }; style: { colorScheme: string } } | null | undefined =
    typeof document !== 'undefined' ? document.documentElement : null
): void {
  if (!rootEl) return;
  if (theme === 'dark') {
    rootEl.classList.add('dark');
    rootEl.style.colorScheme = 'dark';
  } else {
    rootEl.classList.remove('dark');
    rootEl.style.colorScheme = 'light';
  }
}
