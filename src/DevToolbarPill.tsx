import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type ReactNode,
} from 'react';
import { useDevToolbarContext } from './DevToolbarContext';
import { DevToolDropdown } from './DevToolDropdown';
import { DevToolIcon } from './icons';
import type { DevToolbarTheme } from './theme';
import type { DevToolRegistration } from './types';

const COLLAPSED_KEY = 'nullslate.devToolbar.collapsed';

function readCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsedPreference(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COLLAPSED_KEY, String(value));
  } catch {
    // Storage can be unavailable in private browsing or sandboxed embeds.
  }
}

function sortTools(tools: DevToolRegistration[]): DevToolRegistration[] {
  return [...tools].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function fallbackIcon(label: string): ReactNode {
  return <DevToolIcon name="spark" />;
}

function toolButtonStyle(tool: DevToolRegistration, isActive: boolean, theme: DevToolbarTheme): CSSProperties {
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
  if (tool.alert) return { ...base, background: 'rgba(251,113,133,0.14)', color: theme.red };
  if (isActive) return { ...base, background: 'rgba(103,232,249,0.14)', color: theme.blue };
  return { ...base, color: theme.muted };
}

const DevToolbarPill = memo((): JSX.Element | null => {
  const {
    tools,
    visible,
    theme,
    activePanels,
    togglePanel,
    closePanel,
    closeAllPanels,
  } = useDevToolbarContext();
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleCollapse = useCallback((): void => {
    setCollapsed(true);
    writeCollapsedPreference(true);
    closeAllPanels();
  }, [closeAllPanels]);

  const handleExpand = useCallback((): void => {
    setCollapsed(false);
    writeCollapsedPreference(false);
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
          border: `1px solid ${theme.border}`,
          background: `linear-gradient(180deg, ${theme.bg2}, ${theme.bg})`,
          color: theme.blue,
          boxShadow: theme.shadow,
          backdropFilter: 'blur(12px)',
        }}
        onClick={handleExpand}
        aria-label="Expand dev toolbar"
      >
        <DevToolIcon name="panel" />
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
        style={toolButtonStyle(tool, isActive, theme)}
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

  const separator = <div style={{ width: 1, height: 20, margin: '0 4px', background: theme.border }} />;

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
          border: `1px solid ${theme.border}`,
          background: `linear-gradient(180deg, ${theme.bg2}, ${theme.bg})`,
          padding: '0 5px',
          boxShadow: theme.shadow,
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
            color: theme.dim,
            padding: 0,
          }}
          aria-label="Collapse dev toolbar"
          title="Collapse dev toolbar"
          onClick={handleCollapse}
        >
          <DevToolIcon name="chevron-down" />
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
