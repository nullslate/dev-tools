export interface DevToolbarTheme {
  bg: string;
  bg2: string;
  bg3: string;
  border: string;
  text: string;
  muted: string;
  dim: string;
  blue: string;
  green: string;
  amber: string;
  red: string;
  shadow: string;
}

export type DevToolbarThemeInput = Partial<DevToolbarTheme>;

export const DEV_TOOLBAR_THEME_STORAGE_KEY = 'nullslate.devToolbar.theme';

export const defaultDevToolbarTheme: DevToolbarTheme = {
  bg: '#000000',
  bg2: '#050805',
  bg3: '#0d160f',
  border: '#18351f',
  text: '#f3fff5',
  muted: '#a4b8a8',
  dim: '#647568',
  blue: '#22c55e',
  green: '#00ff66',
  amber: '#facc15',
  red: '#fb7185',
  shadow: '0 24px 70px rgba(0,0,0,0.72), 0 0 0 1px rgba(0,255,102,0.08), 0 0 34px rgba(0,255,102,0.06)',
};

export function resolveDevToolbarTheme(theme?: DevToolbarThemeInput): DevToolbarTheme {
  return { ...defaultDevToolbarTheme, ...theme };
}

export function readStoredDevToolbarTheme(): DevToolbarThemeInput {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(DEV_TOOLBAR_THEME_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed)
      .filter((entry): entry is [keyof DevToolbarTheme, string] => (
        entry[0] in defaultDevToolbarTheme && typeof entry[1] === 'string'
      ));
    return Object.fromEntries(entries) as DevToolbarThemeInput;
  } catch {
    return {};
  }
}

export function writeStoredDevToolbarTheme(theme: DevToolbarThemeInput): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(DEV_TOOLBAR_THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // Storage can be unavailable in private browsing or sandboxed embeds.
  }
}

export function clearStoredDevToolbarTheme(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(DEV_TOOLBAR_THEME_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing or sandboxed embeds.
  }
}
