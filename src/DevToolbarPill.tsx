import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useDevToolbarContext } from './DevToolbarContext';
import { DevToolDropdown } from './DevToolDropdown';
import type { DevToolRegistration } from './types';

const COLLAPSED_KEY = 'sandybridge.devToolbar.collapsed';

function sortTools(tools: DevToolRegistration[]): DevToolRegistration[] {
  return [...tools].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function fallbackIcon(label: string): ReactNode {
  return <span style={{ fontSize: 10, fontWeight: 700 }}>{label.slice(0, 2).toUpperCase()}</span>;
}

function toolButtonStyle(tool: DevToolRegistration, isActive: boolean): CSSProperties {
  const base: CSSProperties = {
    display: 'flex',
    width: 32,
    height: 32,
    minWidth: 32,
    cursor: 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: 0,
    background: 'transparent',
    padding: 0,
    transition: 'background-color 120ms ease, color 120ms ease',
  };

  if (tool.style) return { ...base, ...tool.style };
  if (tool.alert) return { ...base, background: 'rgba(248,113,113,0.16)', color: '#f87171' };
  if (isActive) return { ...base, background: 'rgba(96,165,250,0.16)', color: '#60a5fa' };
  return { ...base, color: '#94a3b8' };
}

const DevToolbarPill = memo((): JSX.Element | null => {
  const {
    tools,
    visible,
    activePanels,
    togglePanel,
    closePanel,
    closeAllPanels,
  } = useDevToolbarContext();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleCollapse = useCallback((): void => {
    setCollapsed(true);
    localStorage.setItem(COLLAPSED_KEY, 'true');
    closeAllPanels();
  }, [closeAllPanels]);

  const handleExpand = useCallback((): void => {
    setCollapsed(false);
    localStorage.setItem(COLLAPSED_KEY, 'false');
  }, []);

  const handleToolClick = useCallback((tool: DevToolRegistration): void => {
    if (tool.panelType === 'inline') return;
    if (tool.onClick) {
      tool.onClick();
      return;
    }
    togglePanel(tool.id);
  }, [togglePanel]);

  const { globalTools, routeTools } = useMemo(() => {
    const all = Array.from(tools.values());
    return {
      globalTools: sortTools(all.filter((tool) => tool.scope === 'global')),
      routeTools: sortTools(all.filter((tool) => tool.scope !== 'global')),
    };
  }, [tools]);

  if (!visible) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        style={{
          position: 'fixed',
          left: '50%',
          top: 8,
          zIndex: 99998,
          display: 'flex',
          width: 32,
          height: 32,
          transform: 'translateX(-50%)',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          border: '1px solid #334155',
          background: 'rgba(2,6,23,0.96)',
          color: '#94a3b8',
          boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(12px)',
        }}
        onClick={handleExpand}
        aria-label="Expand dev toolbar"
      >
        DT
      </button>
    );
  }

  const renderToolButton = (tool: DevToolRegistration): JSX.Element => {
    const isActive = activePanels.has(tool.id);

    if (tool.panelType === 'inline') {
      return (
        <div key={tool.id} aria-label={tool.label}>
          {tool.inlineContent}
        </div>
      );
    }

    return (
      <button
        key={tool.id}
        ref={(el) => {
          if (el) buttonRefs.current.set(tool.id, el);
          else buttonRefs.current.delete(tool.id);
        }}
        type="button"
        style={toolButtonStyle(tool, isActive)}
        onClick={() => handleToolClick(tool)}
        aria-label={tool.label}
        title={tool.label}
      >
        {tool.icon ?? fallbackIcon(tool.label)}
      </button>
    );
  };

  const activeDropdowns = Array.from(activePanels)
    .map((id) => tools.get(id))
    .filter((tool): tool is DevToolRegistration => tool?.panelType === 'dropdown' && !!tool.panel);
  const activeFloating = Array.from(activePanels)
    .map((id) => tools.get(id))
    .filter((tool): tool is DevToolRegistration => tool?.panelType === 'floating' && !!tool.panel);

  const separator = <div style={{ width: 1, height: 20, margin: '0 4px', background: '#334155' }} />;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: 8,
          zIndex: 99998,
          display: 'flex',
          height: 40,
          transform: 'translateX(-50%)',
          alignItems: 'center',
          gap: 4,
          borderRadius: 999,
          border: '1px solid #334155',
          background: 'rgba(2,6,23,0.96)',
          padding: '0 4px',
          boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {globalTools.map(renderToolButton)}
        {routeTools.length > 0 && (
          <>
            {separator}
            {routeTools.map(renderToolButton)}
          </>
        )}
        {separator}
        <button
          type="button"
          style={{
            display: 'flex',
            width: 32,
            height: 32,
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            border: 0,
            background: 'transparent',
            color: '#64748b',
            padding: 0,
          }}
          onClick={handleCollapse}
          aria-label="Collapse dev toolbar"
        >
          -
        </button>
      </div>

      {activeDropdowns.map((tool) => (
        <DevToolDropdown
          key={tool.id}
          anchorRef={{ current: buttonRefs.current.get(tool.id) ?? null }}
          onClose={() => closePanel(tool.id)}
        >
          {tool.panel}
        </DevToolDropdown>
      ))}

      {activeFloating.map((tool) => (
        <div key={tool.id}>{tool.panel}</div>
      ))}
    </>
  );
});

DevToolbarPill.displayName = 'DevToolbarPill';

export default DevToolbarPill;
