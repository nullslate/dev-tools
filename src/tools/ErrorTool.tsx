import { Fragment, memo, useState, type JSX } from 'react';
import { DevToolFloating } from '../DevToolFloating';
import { useDevToolbarContext } from '../DevToolbarContext';
import { useDevTool } from '../useDevTool';
import {
  clearCapturedErrors,
  useCapturedErrors,
  type CapturedDevError,
} from '../errors/monitor';

const colors = {
  bg: 'var(--ndt-bg, #020617)',
  bg2: 'var(--ndt-bg2, #0f172a)',
  border: 'var(--ndt-border, #334155)',
  text: 'var(--ndt-text, #f8fafc)',
  muted: 'var(--ndt-muted, #94a3b8)',
  dim: 'var(--ndt-dim, #64748b)',
  red: 'var(--ndt-red, #f87171)',
  blue: 'var(--ndt-blue, #93c5fd)',
};

const ErrorDetails = ({ error }: { error: CapturedDevError }): JSX.Element => (
  <div style={{ borderBottom: `1px solid ${colors.border}`, background: colors.bg2, padding: 8, fontSize: 11 }}>
    {error.stack && (
      <pre style={{ maxHeight: 140, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: colors.muted }}>{error.stack}</pre>
    )}
    {error.context && (
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: colors.muted }}>{JSON.stringify(error.context, null, 2)}</pre>
    )}
    <div style={{ marginTop: 8, color: colors.muted, fontWeight: 700 }}>Breadcrumbs ({error.breadcrumbs.length})</div>
    {error.breadcrumbs.map((breadcrumb) => (
      <div key={`${breadcrumb.timestamp}-${breadcrumb.category}-${breadcrumb.message}`} style={{ display: 'grid', gridTemplateColumns: '70px 80px minmax(0, 1fr)', gap: 6, borderTop: `1px solid ${colors.border}`, padding: '2px 0', fontSize: 10 }}>
        <span style={{ color: colors.dim }}>{new Date(breadcrumb.timestamp).toLocaleTimeString()}</span>
        <span style={{ color: colors.blue, fontWeight: 600 }}>{breadcrumb.category}</span>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{breadcrumb.message}</span>
      </div>
    ))}
  </div>
);

export const ErrorTool = memo((): null => {
  const { closePanel } = useDevToolbarContext();
  const errors = useCapturedErrors();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useDevTool({
    id: 'errors',
    icon: 'ER',
    label: `Errors${errors.length ? ` (${errors.length})` : ''}`,
    scope: 'global',
    panelType: 'floating',
    order: 40,
    alert: errors.length > 0,
    panel: (
      <DevToolFloating id="errors" title="Errors" onClose={() => closePanel('errors')} width={520}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, padding: '6px 10px', color: colors.muted, fontSize: 11 }}>
          <span>{errors.length} captured error{errors.length === 1 ? '' : 's'}</span>
          {errors.length > 0 && (
            <button type="button" style={{ cursor: 'pointer', border: 0, background: 'transparent', color: colors.blue, fontSize: 11 }} onClick={clearCapturedErrors}>Clear</button>
          )}
        </div>
        <div style={{ maxHeight: 460, overflowY: 'auto' }}>
          {errors.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: colors.dim }}>No errors captured yet.</div>
          ) : [...errors].reverse().map((error) => (
            <Fragment key={error.id}>
              <button
                type="button"
                style={{ display: 'block', width: '100%', cursor: 'pointer', border: 0, borderBottom: `1px solid ${colors.border}`, background: 'transparent', padding: '7px 10px', textAlign: 'left', color: colors.text }}
                onClick={() => setExpandedId((id) => (id === error.id ? null : error.id))}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: colors.red, fontSize: 11, fontWeight: 700 }}>{error.name}: {error.message}</span>
                  <span style={{ color: colors.dim, fontSize: 10 }}>{new Date(error.timestamp).toLocaleTimeString()}</span>
                </div>
                {error.source && <div style={{ color: colors.muted, fontSize: 10 }}>{error.source}</div>}
              </button>
              {expandedId === error.id && <ErrorDetails error={error} />}
            </Fragment>
          ))}
        </div>
      </DevToolFloating>
    ),
  });

  return null;
});

ErrorTool.displayName = 'ErrorTool';
