import {
  Fragment,
  memo,
  useMemo,
  useState,
  type CSSProperties,
  type JSX,
} from 'react';
import { useDevToolbarContext } from '../DevToolbarContext';
import { DevToolFloating } from '../DevToolFloating';
import { useDevTool } from '../useDevTool';
import {
  PERFORMANCE_THRESHOLDS,
  clearPerformanceEntries,
  usePerformanceState,
  type PerformanceEntryRecord,
} from '../performance/monitor';

interface GroupedEntry {
  key: string;
  label: string;
  operation: string;
  count: number;
  totalDuration: number;
  maxDuration: number;
  avgDuration: number;
  entries: PerformanceEntryRecord[];
  hasSlow: boolean;
}

const colors = {
  bg: 'var(--ndt-bg, #020617)',
  bg2: 'var(--ndt-bg2, #0f172a)',
  bg3: 'var(--ndt-bg3, #1e293b)',
  border: 'var(--ndt-border, #334155)',
  text: 'var(--ndt-text, #f8fafc)',
  muted: 'var(--ndt-muted, #94a3b8)',
  dim: 'var(--ndt-dim, #64748b)',
  blue: 'var(--ndt-blue, #93c5fd)',
  green: 'var(--ndt-green, #34d399)',
  amber: 'var(--ndt-amber, #fbbf24)',
  red: 'var(--ndt-red, #f87171)',
};

function groupEntries(entries: PerformanceEntryRecord[]): GroupedEntry[] {
  const map = new Map<string, GroupedEntry>();
  entries.forEach((entry) => {
    const key = `${entry.label}::${entry.operation}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalDuration += entry.duration;
      existing.maxDuration = Math.max(existing.maxDuration, entry.duration);
      existing.avgDuration = existing.totalDuration / existing.count;
      existing.entries.push(entry);
      existing.hasSlow ||= entry.duration > PERFORMANCE_THRESHOLDS.slowFrameMs;
      return;
    }

    map.set(key, {
      key,
      label: entry.label,
      operation: entry.operation,
      count: 1,
      totalDuration: entry.duration,
      maxDuration: entry.duration,
      avgDuration: entry.duration,
      entries: [entry],
      hasSlow: entry.duration > PERFORMANCE_THRESHOLDS.slowFrameMs,
    });
  });
  return Array.from(map.values()).reverse();
}

function durationColor(duration: number): string {
  if (duration > PERFORMANCE_THRESHOLDS.verySlowMs) return colors.red;
  if (duration > PERFORMANCE_THRESHOLDS.slowFrameMs) return colors.amber;
  return colors.green;
}

const buttonStyle: CSSProperties = {
  cursor: 'pointer',
  border: 0,
  borderRadius: 4,
  background: 'transparent',
  color: colors.blue,
  padding: '2px 6px',
  fontSize: 11,
};

const EntryDetail = ({ entry, maxDuration }: { entry: PerformanceEntryRecord; maxDuration: number }): JSX.Element => {
  const width = maxDuration > 0 ? Math.max(2, (entry.duration / maxDuration) * 100) : 100;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '2px 12px', padding: '6px 8px', borderBottom: `1px solid ${colors.border}`, fontSize: 11 }}>
      <span style={{ color: colors.dim, fontWeight: 600 }}>Time</span>
      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
      <span style={{ color: colors.dim, fontWeight: 600 }}>Duration</span>
      <span style={{ color: durationColor(entry.duration), fontWeight: 600 }}>{entry.duration.toFixed(2)}ms</span>
      {entry.detail && (
        <>
          <span style={{ color: colors.dim, fontWeight: 600 }}>Detail</span>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(entry.detail, null, 2)}</pre>
        </>
      )}
      <div style={{ gridColumn: '1 / -1', height: 4, overflow: 'hidden', borderRadius: 4, background: colors.bg3 }}>
        <div style={{ width: `${width}%`, height: '100%', background: durationColor(entry.duration) }} />
      </div>
    </div>
  );
};

export const PerformanceTool = memo((): null => {
  const { closePanel } = useDevToolbarContext();
  const { entries, activeProfilers } = usePerformanceState();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [slowOnly, setSlowOnly] = useState(false);

  const groups = useMemo(() => groupEntries(entries), [entries]);
  const filtered = useMemo(() => groups.filter((group) => {
    const term = filter.toLowerCase();
    const matches = !term || `${group.label} ${group.operation}`.toLowerCase().includes(term);
    return matches && (!slowOnly || group.hasSlow);
  }), [filter, groups, slowOnly]);
  const maxDuration = useMemo(() => Math.max(1, ...entries.map((entry) => entry.duration)), [entries]);
  const slowCount = useMemo(() => entries.filter((entry) => entry.duration > PERFORMANCE_THRESHOLDS.slowFrameMs).length, [entries]);

  useDevTool({
    id: 'performance',
    icon: 'PF',
    label: activeProfilers > 0 ? 'Performance (profiling)' : 'Performance',
    scope: 'global',
    panelType: 'floating',
    order: 30,
    alert: slowCount > 0,
    panel: (
      <DevToolFloating id="performance" title="Performance" onClose={() => closePanel('performance')} width={560}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${colors.border}`, padding: '6px 10px', fontSize: 11, color: colors.muted }}>
          <span>{entries.length} measurement{entries.length === 1 ? '' : 's'}</span>
          <span>{groups.length} group{groups.length === 1 ? '' : 's'}</span>
          {slowCount > 0 && (
            <button type="button" style={{ ...buttonStyle, color: colors.amber }} onClick={() => setSlowOnly((value) => !value)}>
              {slowCount} slow{slowOnly ? ' x' : ''}
            </button>
          )}
          <button type="button" style={{ ...buttonStyle, marginLeft: 'auto' }} onClick={clearPerformanceEntries}>Clear</button>
        </div>
        <div style={{ borderBottom: `1px solid ${colors.border}`, padding: 8 }}>
          <input
            type="text"
            placeholder="Filter by label or operation..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', height: 28, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg2, color: colors.text, padding: '0 8px', outline: 'none' }}
          />
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 11 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: colors.dim }}>No performance entries match.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                  {['Label', 'Operation', 'Count', 'Avg', 'Max'].map((label, index) => (
                    <th key={label} style={{ padding: '4px 8px', color: colors.muted, textAlign: index >= 2 ? 'right' : 'left' }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((group) => (
                  <Fragment key={group.key}>
                    <tr
                      style={{ cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, background: group.hasSlow ? 'rgba(120,53,15,0.28)' : 'transparent' }}
                      onClick={() => setExpandedKey((key) => (key === group.key ? null : group.key))}
                    >
                      <td style={{ padding: '4px 8px', color: colors.blue, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</td>
                      <td style={{ padding: '4px 8px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.operation}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: colors.muted }}>{group.count}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: durationColor(group.avgDuration) }}>{group.avgDuration.toFixed(1)}ms</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: durationColor(group.maxDuration) }}>{group.maxDuration.toFixed(1)}ms</td>
                    </tr>
                    {expandedKey === group.key && (
                      <tr style={{ background: colors.bg2 }}>
                        <td colSpan={5} style={{ padding: 0 }}>
                          {group.entries.map((entry) => <EntryDetail key={entry.id} entry={entry} maxDuration={maxDuration} />)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DevToolFloating>
    ),
  });

  return null;
});

PerformanceTool.displayName = 'PerformanceTool';
