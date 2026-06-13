import { memo, useMemo, type CSSProperties } from 'react';
import { DevToolFloating } from '../DevToolFloating';
import { useDevToolbarContext } from '../DevToolbarContext';
import { DevToolIcon } from '../icons';
import {
  defaultDevToolbarTheme,
  type DevToolbarTheme,
} from '../theme';
import { useDevTool } from '../useDevTool';

const colors = {
  bg: 'var(--ndt-bg, #000000)',
  bg2: 'var(--ndt-bg2, #050805)',
  bg3: 'var(--ndt-bg3, #0d160f)',
  border: 'var(--ndt-border, #18351f)',
  text: 'var(--ndt-text, #f3fff5)',
  muted: 'var(--ndt-muted, #a4b8a8)',
  dim: 'var(--ndt-dim, #647568)',
  green: 'var(--ndt-green, #00ff66)',
};

const themeFields: Array<{
  key: keyof DevToolbarTheme;
  label: string;
  type: 'color' | 'text';
}> = [
  { key: 'bg', label: 'Background', type: 'color' },
  { key: 'bg2', label: 'Surface', type: 'color' },
  { key: 'bg3', label: 'Raised', type: 'color' },
  { key: 'border', label: 'Border', type: 'color' },
  { key: 'text', label: 'Text', type: 'color' },
  { key: 'muted', label: 'Muted', type: 'color' },
  { key: 'dim', label: 'Dim', type: 'color' },
  { key: 'blue', label: 'Active', type: 'color' },
  { key: 'green', label: 'Accent', type: 'color' },
  { key: 'amber', label: 'Warning', type: 'color' },
  { key: 'red', label: 'Error', type: 'color' },
  { key: 'shadow', label: 'Shadow', type: 'text' },
];

const buttonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
  border: 0,
  borderRadius: 4,
  background: 'transparent',
  color: colors.green,
  padding: '2px 6px',
  fontSize: 11,
};

function safeColorInputValue(value: string): string {
  return /^#[\da-f]{6}$/i.test(value) ? value : '#000000';
}

export const ThemeSettingsTool = memo((): null => {
  const {
    closePanel,
    resetTheme,
    setTheme,
    theme,
    themeOverrides,
  } = useDevToolbarContext();

  const changedCount = useMemo(() => Object.keys(themeOverrides).length, [themeOverrides]);

  useDevTool({
    id: 'theme-settings',
    icon: <DevToolIcon name="settings" />,
    label: `Theme Settings${changedCount ? ` (${changedCount})` : ''}`,
    scope: 'global',
    panelType: 'floating',
    order: 5,
    alert: changedCount > 0,
    panel: (
      <DevToolFloating id="theme-settings" title="Theme Settings" onClose={() => closePanel('theme-settings')} width={420}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          borderBottom: `1px solid ${colors.border}`,
          padding: '6px 10px',
          color: colors.muted,
          fontSize: 11,
        }}
        >
          <span>{changedCount} customized token{changedCount === 1 ? '' : 's'}</span>
          <button type="button" style={buttonStyle} onClick={resetTheme}>
            <DevToolIcon name="trash" size={12} />
            Reset
          </button>
        </div>

        <div style={{ display: 'grid', gap: 1, background: colors.border }}>
          {themeFields.map((field) => {
            const customized = themeOverrides[field.key] != null;
            const value = theme[field.key];

            return (
              <label
                key={field.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '112px minmax(0, 1fr)',
                  alignItems: 'center',
                  gap: 10,
                  background: colors.bg,
                  padding: '8px 10px',
                  fontSize: 11,
                }}
              >
                <span style={{ color: customized ? colors.green : colors.muted, fontWeight: 700 }}>{field.label}</span>
                <span style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 8 }}>
                  {field.type === 'color' && (
                    <input
                      type="color"
                      value={safeColorInputValue(value)}
                      onChange={(event) => setTheme({ [field.key]: event.target.value })}
                      style={{
                        width: 28,
                        height: 24,
                        flexShrink: 0,
                        cursor: 'pointer',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 5,
                        background: colors.bg2,
                        padding: 1,
                      }}
                    />
                  )}
                  <input
                    type="text"
                    value={value}
                    onChange={(event) => setTheme({ [field.key]: event.target.value })}
                    placeholder={defaultDevToolbarTheme[field.key]}
                    style={{
                      width: '100%',
                      minWidth: 0,
                      height: 26,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 5,
                      background: colors.bg2,
                      color: colors.text,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: 10,
                      outline: 'none',
                      padding: '0 7px',
                    }}
                  />
                </span>
              </label>
            );
          })}
        </div>
      </DevToolFloating>
    ),
  });

  return null;
});

ThemeSettingsTool.displayName = 'ThemeSettingsTool';
