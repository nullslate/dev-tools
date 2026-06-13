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
  bg: '#080b12',
  bg2: '#101623',
  bg3: '#1b2535',
  border: '#263348',
  text: '#f5f8ff',
  muted: '#9aa8bd',
  dim: '#65758f',
  blue: '#67e8f9',
  green: '#5eead4',
  amber: '#facc15',
  red: '#fb7185',
  shadow: '0 24px 70px rgba(0,0,0,0.48), 0 0 0 1px rgba(103,232,249,0.06)',
};

export function resolveDevToolbarTheme(theme?: DevToolbarThemeInput): DevToolbarTheme {
  return { ...defaultDevToolbarTheme, ...theme };
}
