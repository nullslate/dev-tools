import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type JSX,
} from 'react';
import { DevToolFloating } from '../DevToolFloating';
import { useDevToolbarContext } from '../DevToolbarContext';
import { DevToolIcon } from '../icons';
import { useDevTool } from '../useDevTool';
import {
  clearNetworkEntries,
  exportNetworkCurl,
  exportNetworkHar,
  useNetworkEntries,
  type NetworkEntry,
} from '../network/monitor';

const SLOW_THRESHOLD_MS = 1000;
type NetworkFilter = 'all' | 'failed' | 'slow' | 'mutations' | 'reviews';
type ContextMenuState = { x: number; y: number; entryId: number } | null;

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

const buttonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
  border: 0,
  borderRadius: 4,
  background: 'transparent',
  color: colors.blue,
  padding: '2px 6px',
  fontSize: 11,
};

function isBadRequest(entry: NetworkEntry): boolean {
  return !!entry.error || !!(entry.status && entry.status >= 400);
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1048576).toFixed(1)}M`;
}

function formatPayload(payload: string | null): string | null {
  if (!payload) return null;
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function buildCurl(entry: NetworkEntry): string {
  const lines = [`curl ${shellQuote(entry.fullUrl)}`];
  if (entry.method !== 'GET') lines.push(`  -X ${entry.method}`);
  Object.entries(entry.requestHeaders ?? {}).forEach(([key, value]) => {
    lines.push(`  -H ${shellQuote(`${key}: ${value}`)}`);
  });
  if (entry.requestBody) lines.push(`  --data-raw ${shellQuote(entry.requestBody)}`);
  return lines.join(' \\\n');
}

function matchesFilter(entry: NetworkEntry, filter: NetworkFilter): boolean {
  switch (filter) {
    case 'failed':
      return isBadRequest(entry);
    case 'slow':
      return entry.duration > SLOW_THRESHOLD_MS;
    case 'mutations':
      return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(entry.method);
    case 'reviews':
      return entry.url.includes('/review');
    case 'all':
    default:
      return true;
  }
}

function matchesSearch(entry: NetworkEntry, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [
    entry.method,
    entry.url,
    entry.fullUrl,
    String(entry.status ?? ''),
    entry.error ?? '',
    entry.requestBody ?? '',
    entry.responseBody ?? '',
  ].some((value) => value.toLowerCase().includes(term));
}

function copyText(value: string): void {
  void navigator.clipboard?.writeText(value);
}

function downloadText(filename: string, contentType: string, value: string): void {
  const blob = new Blob([value], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const CopyButton = ({ value, label }: { value: string; label: string }): JSX.Element => (
  <button
    type="button"
    style={{ ...buttonStyle, fontSize: 10 }}
    onClick={(event) => {
      event.stopPropagation();
      copyText(value);
    }}
  >
    <DevToolIcon name="copy" size={12} />
    {label}
  </button>
);

const PayloadBlock = ({ title, payload }: { title: string; payload: string | null }): JSX.Element | null => {
  const formatted = formatPayload(payload);
  if (!formatted) return null;

  return (
    <div style={{
      gridColumn: '1 / -1',
      marginTop: 4,
      overflow: 'hidden',
      borderRadius: 6,
      border: `1px solid ${colors.border}`,
      background: colors.bg,
    }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        borderBottom: `1px solid ${colors.border}`,
        padding: '4px 8px',
      }}
      >
        <span style={{ color: colors.muted, fontWeight: 600 }}>{title}</span>
        <CopyButton value={formatted} label="Copy" />
      </div>
      <pre style={{
        margin: 0,
        maxHeight: 176,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        padding: '6px 8px',
        fontSize: 10,
        lineHeight: '16px',
        color: colors.text,
      }}
      >
        {formatted}
      </pre>
    </div>
  );
};

const DetailRow = ({ entry }: { entry: NetworkEntry }): JSX.Element => (
  <tr style={{ borderBottom: `1px solid ${colors.border}`, background: colors.bg2 }}>
    <td colSpan={5} style={{ padding: 8 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        columnGap: 12,
        rowGap: 4,
        fontSize: 11,
      }}
      >
        <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: colors.dim }}>URL</span>
        <span style={{ display: 'flex', minWidth: 0, alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, color: colors.text }}>
          <span style={{ minWidth: 0, wordBreak: 'break-all' }}>{entry.fullUrl}</span>
          <span style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 4 }}>
            <CopyButton value={entry.fullUrl} label="Copy URL" />
            <CopyButton value={buildCurl(entry)} label="Copy cURL" />
          </span>
        </span>
        <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: colors.dim }}>Status</span>
        <span style={{ wordBreak: 'break-all', color: colors.text }}>{entry.error ? `Error: ${entry.error}` : entry.status ?? '-'}</span>
        <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: colors.dim }}>Duration</span>
        <span style={{ color: colors.text }}>{entry.duration}ms</span>
        <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: colors.dim }}>Size</span>
        <span style={{ color: colors.text }}>{formatSize(entry.responseSize)}</span>
        <PayloadBlock title="Request Body" payload={entry.requestBody} />
        <PayloadBlock
          title={`Response Body${entry.responseContentType ? ` · ${entry.responseContentType}` : ''}`}
          payload={entry.responseBody}
        />
      </div>
    </td>
  </tr>
);

const RowContextMenu = ({
  entry,
  position,
  onClose,
}: {
  entry: NetworkEntry;
  position: NonNullable<ContextMenuState>;
  onClose: () => void;
}): JSX.Element => {
  const responseBody = formatPayload(entry.responseBody);
  const items = [
    { label: 'Copy URL', value: entry.fullUrl },
    { label: 'Copy as cURL', value: buildCurl(entry) },
    ...(entry.requestBody ? [{ label: 'Copy Request Body', value: formatPayload(entry.requestBody) ?? entry.requestBody }] : []),
    ...(responseBody ? [{ label: 'Copy Response Body', value: responseBody }] : []),
  ];

  return (
    <div style={{
      position: 'fixed',
      zIndex: 100000,
      minWidth: 176,
      overflow: 'hidden',
      borderRadius: 6,
      border: `1px solid ${colors.border}`,
      background: colors.bg,
      padding: '4px 0',
      boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
      left: position.x,
      top: position.y,
    }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          style={{
            display: 'block',
            width: '100%',
            cursor: 'pointer',
            border: 0,
            background: 'transparent',
            padding: '6px 12px',
            textAlign: 'left',
            fontSize: 11,
            color: colors.text,
          }}
          onClick={() => {
            copyText(item.value);
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

const NetworkPanel = (): JSX.Element => {
  const { closePanel } = useDevToolbarContext();
  const entries = useNetworkEntries();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<NetworkFilter>('all');
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const failedCount = useMemo(() => entries.filter(isBadRequest).length, [entries]);
  const slowCount = useMemo(() => entries.filter((entry) => entry.duration > SLOW_THRESHOLD_MS).length, [entries]);
  const filteredEntries = useMemo(() => entries
    .filter((entry) => matchesFilter(entry, filter))
    .filter((entry) => matchesSearch(entry, search)), [entries, filter, search]);
  const reversed = useMemo(() => [...filteredEntries].reverse(), [filteredEntries]);
  const contextEntry = contextMenu ? entries.find((entry) => entry.id === contextMenu.entryId) : undefined;
  const curlExport = useMemo(() => exportNetworkCurl(filteredEntries), [filteredEntries]);
  const harExport = useMemo(() => exportNetworkHar(filteredEntries), [filteredEntries]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return undefined;
    window.addEventListener('click', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('scroll', closeContextMenu, true);
    };
  }, [closeContextMenu, contextMenu]);

  const filterOptions = useMemo<Array<{ value: NetworkFilter; label: string; count?: number }>>(() => [
    { value: 'all', label: 'All', count: entries.length },
    { value: 'failed', label: 'Failed', count: failedCount },
    { value: 'slow', label: 'Slow', count: slowCount },
    { value: 'mutations', label: 'Mutations' },
    { value: 'reviews', label: 'Reviews' },
  ], [entries.length, failedCount, slowCount]);

  return (
    <DevToolFloating id="network" title="Network" onClose={() => closePanel('network')} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderBottom: `1px solid ${colors.border}`, padding: '4px 8px', fontSize: 11, color: colors.muted }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            {entries.length} request{entries.length !== 1 ? 's' : ''}
            {failedCount > 0 && <span style={{ marginLeft: 4, color: colors.red }}>· {failedCount} failed</span>}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" style={buttonStyle} disabled={filteredEntries.length === 0} onClick={() => copyText(curlExport)}>
              <DevToolIcon name="copy" size={12} />
              Copy cURL
            </button>
            <button type="button" style={buttonStyle} disabled={filteredEntries.length === 0} onClick={() => downloadText('nullslate-network.curl', 'text/plain', curlExport)}>
              <DevToolIcon name="download" size={12} />
              cURL
            </button>
            <button type="button" style={buttonStyle} disabled={filteredEntries.length === 0} onClick={() => downloadText('nullslate-network.har', 'application/json', harExport)}>
              <DevToolIcon name="download" size={12} />
              HAR
            </button>
            <button type="button" style={buttonStyle} onClick={clearNetworkEntries}>
              <DevToolIcon name="trash" size={12} />
              Clear
            </button>
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
          {filterOptions.map((option) => {
            const selected = option.value === filter;
            return (
              <button
                key={option.value}
                type="button"
                style={{
                  cursor: 'pointer',
                  borderRadius: 999,
                  border: `1px solid ${selected ? colors.blue : colors.border}`,
                  background: selected ? 'rgba(147,197,253,0.16)' : 'transparent',
                  color: selected ? colors.blue : colors.muted,
                  padding: '2px 8px',
                  fontSize: 10,
                }}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
                {option.count != null && <span style={{ marginLeft: 4, color: colors.dim }}>{option.count}</span>}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Search method, URL, status, or payload..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', height: 28, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg2, color: colors.text, padding: '0 8px', outline: 'none' }}
        />
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 11 }}>
        {reversed.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: colors.dim }}>
            {entries.length === 0 ? 'No requests recorded yet' : 'No requests match this filter'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
                {['Method', 'URL', 'Status', 'Time', 'Size'].map((header, index) => (
                  <th key={header} style={{ padding: '4px 8px', textAlign: index >= 3 ? 'right' : 'left', fontWeight: 600, color: colors.muted, whiteSpace: 'nowrap' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reversed.map((entry) => {
                const failed = isBadRequest(entry);
                const slow = entry.duration > SLOW_THRESHOLD_MS;
                return (
                  <Fragment key={entry.id}>
                    <tr
                      style={{
                        cursor: 'pointer',
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.text,
                        background: failed ? 'rgba(127,29,29,0.32)' : slow ? 'rgba(120,53,15,0.28)' : 'transparent',
                      }}
                      onClick={() => setExpandedId((prev) => (prev === entry.id ? null : entry.id))}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setContextMenu({ x: event.clientX, y: event.clientY, entryId: entry.id });
                      }}
                    >
                      <td style={{ width: 56, padding: '4px 8px', fontWeight: 600, color: colors.blue, whiteSpace: 'nowrap' }}>
                        {entry.method}
                        {entry.count > 1 && <span style={{ marginLeft: 4, borderRadius: 4, background: colors.bg3, padding: '1px 4px', fontSize: 9, color: colors.muted }}>{entry.count}</span>}
                      </td>
                      <td style={{ maxWidth: 256, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '4px 8px' }} title={entry.url}>{entry.url}</td>
                      <td style={{ padding: '4px 8px', color: failed ? colors.red : colors.green, fontWeight: 600 }}>{entry.error ? 'ERR' : entry.status ?? '-'}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: slow ? colors.amber : colors.text, fontVariantNumeric: 'tabular-nums' }}>{entry.duration}ms</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: colors.dim, fontVariantNumeric: 'tabular-nums' }}>{formatSize(entry.responseSize)}</td>
                    </tr>
                    {expandedId === entry.id && <DetailRow entry={entry} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {contextMenu && contextEntry && (
        <RowContextMenu entry={contextEntry} position={contextMenu} onClose={closeContextMenu} />
      )}
    </DevToolFloating>
  );
};

export const NetworkTool = memo((): null => {
  const entries = useNetworkEntries();
  const hasBadRequest = entries.some(isBadRequest);

  useDevTool({
    id: 'network',
    icon: <DevToolIcon name="network" />,
    label: 'Network',
    scope: 'global',
    panelType: 'floating',
    order: 20,
    panel: <NetworkPanel />,
    alert: hasBadRequest,
  });

  return null;
});

NetworkTool.displayName = 'NetworkTool';
