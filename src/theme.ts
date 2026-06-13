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

export const defaultDevToolbarTheme: DevToolbarTheme = {
  bg: '#020617',
  bg2: '#0f172a',
  bg3: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  dim: '#64748b',
  blue: '#93c5fd',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  shadow: '0 25px 50px -12px rgba(0,0,0,0.55)',
};

export function resolveDevToolbarTheme(theme?: DevToolbarThemeInput): DevToolbarTheme {
  return { ...defaultDevToolbarTheme, ...theme };
}
