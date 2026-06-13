import {
  memo,
  useMemo,
  useState,
  type CSSProperties,
  type JSX,
} from 'react';
import { DevToolFloating } from '../DevToolFloating';
import { useDevToolbarContext } from '../DevToolbarContext';
import { useDevTool } from '../useDevTool';

export type FeatureFlagValue = boolean | string | number | null | undefined;

export interface FeatureFlagsToolProps {
  flags: Record<string, FeatureFlagValue>;
  overriddenFlags?: Record<string, FeatureFlagValue>;
  isOverriding?: boolean;
  onOverrideEnabledChange?: (enabled: boolean) => void;
  onFlagChange?: (name: string, value: FeatureFlagValue) => void;
  onReset?: () => void;
  filterFlag?: (name: string, value: FeatureFlagValue) => boolean;
}

const colors = {
  bg: 'var(--ndt-bg, #020617)',
  bg2: 'var(--ndt-bg2, #0f172a)',
  border: 'var(--ndt-border, #334155)',
  text: 'var(--ndt-text, #f8fafc)',
  muted: 'var(--ndt-muted, #94a3b8)',
  dim: 'var(--ndt-dim, #64748b)',
  blue: 'var(--ndt-blue, #93c5fd)',
};

const buttonStyle: CSSProperties = {
  cursor: 'pointer',
  border: 0,
  borderRadius: 4,
  background: 'transparent',
  color: colors.blue,
  padding: '2px 6px',
  fontSize: 11,
};

export const FeatureFlagsTool = memo(({
  flags,
  overriddenFlags = {},
  isOverriding = false,
  onOverrideEnabledChange,
  onFlagChange,
  onReset,
  filterFlag,
}: FeatureFlagsToolProps): null => {
  const { closePanel } = useDevToolbarContext();
  const [search, setSearch] = useState('');
  const effectiveFlags = isOverriding ? { ...flags, ...overriddenFlags } : flags;

  const entries = useMemo(() => Object.entries(effectiveFlags)
    .filter(([name, value]) => (filterFlag ? filterFlag(name, value) : true))
    .filter(([name, value]) => `${name} ${String(value)}`.toLowerCase().includes(search.toLowerCase())), [effectiveFlags, filterFlag, search]);

  const changedCount = useMemo(() => Object.entries(overriddenFlags)
    .filter(([key, value]) => key in flags && flags[key] !== value).length, [flags, overriddenFlags]);

  useDevTool({
    id: 'feature-flags',
    icon: 'FF',
    label: `Feature Flags${changedCount ? ` (${changedCount})` : ''}`,
    scope: 'global',
    panelType: 'floating',
    order: 10,
    alert: isOverriding && changedCount > 0,
    panel: (
      <DevToolFloating id="feature-flags" title="Feature Flags" onClose={() => closePanel('feature-flags')} width={420}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${colors.border}`, padding: 8 }}>
          {onOverrideEnabledChange && (
            <button type="button" style={buttonStyle} onClick={() => onOverrideEnabledChange(!isOverriding)}>
              Override {isOverriding ? 'ON' : 'OFF'}
            </button>
          )}
          <input
            type="text"
            placeholder="Search flags..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ flex: 1, minWidth: 0, height: 28, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg2, color: colors.text, padding: '0 8px', outline: 'none' }}
          />
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: '4px 0' }}>
          {entries.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: colors.dim }}>No flags match.</div>
          ) : entries.map(([name, value]) => {
            const changed = isOverriding && name in overriddenFlags && flags[name] !== overriddenFlags[name];
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 10px', fontSize: 11 }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: changed ? colors.blue : colors.text }} title={name}>{name}</span>
                {typeof value === 'boolean' && onFlagChange ? (
                  <input
                    type="checkbox"
                    checked={value}
                    disabled={!isOverriding}
                    onChange={(event) => onFlagChange(name, event.target.checked)}
                  />
                ) : (
                  <span style={{ flexShrink: 0, color: colors.muted, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{String(value)}</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${colors.border}`, padding: '5px 10px', color: colors.dim, fontSize: 10 }}>
          <span>{entries.length} flag{entries.length === 1 ? '' : 's'}{changedCount > 0 ? ` · ${changedCount} changed` : ''}</span>
          {onReset && changedCount > 0 && <button type="button" style={buttonStyle} onClick={onReset}>Reset</button>}
        </div>
      </DevToolFloating>
    ),
  });

  return null;
});

FeatureFlagsTool.displayName = 'FeatureFlagsTool';
