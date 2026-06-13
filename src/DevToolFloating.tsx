import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useDevToolbarContext } from './DevToolbarContext';

export interface DevToolFloatingProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  id?: string;
  width?: number;
  maxHeight?: string;
  minWidth?: number;
  minHeight?: number;
}

interface FloatingPanelState {
  x: number;
  y: number;
  width: number;
  height: number | null;
  zIndex: number;
}

interface DragState {
  mode: 'move' | 'resize';
  pointerId: number;
  startX: number;
  startY: number;
  initial: FloatingPanelState;
}

type ThemeCssProperties = CSSProperties & Record<`--ndt-${string}`, string>;

const PANEL_STATE_KEY_PREFIX = 'nullslate.devToolbar.panel.';
let nextPanelZIndex = 99999;

function canUseStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function getPanelStorageKey(id: string): string {
  return `${PANEL_STATE_KEY_PREFIX}${id}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readPanelState(id: string | undefined): Partial<FloatingPanelState> | null {
  if (!id || !canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(getPanelStorageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FloatingPanelState>;
    return parsed;
  } catch {
    return null;
  }
}

function writePanelState(id: string | undefined, state: FloatingPanelState): void {
  if (!id || !canUseStorage()) return;

  const { x, y, width, height } = state;
  try {
    window.localStorage.setItem(getPanelStorageKey(id), JSON.stringify({ x, y, width, height }));
  } catch {
    // Storage can be unavailable in private browsing or sandboxed embeds.
  }
}

export const DevToolFloating = ({
  id,
  title,
  children,
  onClose,
  width = 420,
  maxHeight = 'calc(100vh - 40px)',
  minWidth = 320,
  minHeight = 220,
}: DevToolFloatingProps): JSX.Element => {
  const { theme } = useDevToolbarContext();
  const panelRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const panelStateRef = useRef<FloatingPanelState | null>(null);
  const [panelState, setPanelState] = useState<FloatingPanelState>(() => {
    const stored = readPanelState(id);
    const initial = {
      x: stored?.x ?? (typeof window === 'undefined' ? 16 : Math.max(16, window.innerWidth - width - 16)),
      y: stored?.y ?? 56,
      width: stored?.width ?? width,
      height: stored?.height ?? null,
      zIndex: nextPanelZIndex++,
    };
    panelStateRef.current = initial;
    return initial;
  });

  const updatePanelState = useCallback((next: FloatingPanelState | ((current: FloatingPanelState) => FloatingPanelState)): void => {
    setPanelState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      panelStateRef.current = resolved;
      return resolved;
    });
  }, []);

  const bringToFront = useCallback((): void => {
    updatePanelState((current) => {
      if (current.zIndex === nextPanelZIndex - 1) return current;
      return { ...current, zIndex: nextPanelZIndex++ };
    });
  }, [updatePanelState]);

  const commitPanelState = useCallback((next: FloatingPanelState): void => {
    updatePanelState(next);
    writePanelState(id, next);
  }, [id, updatePanelState]);

  const startDrag = useCallback((event: ReactPointerEvent<HTMLElement>, mode: DragState['mode']): void => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    bringToFront();
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initial: panelState,
    };
    event.preventDefault();
  }, [bringToFront, panelState]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    updatePanelState((current) => {
      const next = drag.mode === 'move'
        ? {
          ...current,
          x: clamp(drag.initial.x + dx, 8, Math.max(8, viewportWidth - 80)),
          y: clamp(drag.initial.y + dy, 8, Math.max(8, viewportHeight - 48)),
        }
        : {
          ...current,
          width: clamp(drag.initial.width + dx, minWidth, Math.max(minWidth, viewportWidth - drag.initial.x - 8)),
          height: clamp((drag.initial.height ?? panelRef.current?.getBoundingClientRect().height ?? minHeight) + dy, minHeight, Math.max(minHeight, viewportHeight - drag.initial.y - 8)),
        };
      return next;
    });
  }, [minHeight, minWidth, updatePanelState]);

  const endDrag = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    commitPanelState(panelStateRef.current ?? panelState);
  }, [commitPanelState, panelState]);

  const shellStyle = useMemo<CSSProperties>(() => ({
    position: 'fixed',
    left: panelState.x,
    top: panelState.y,
    zIndex: panelState.zIndex,
    display: 'flex',
    overflow: 'hidden',
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    background: theme.bg,
    color: theme.text,
    boxShadow: theme.shadow,
    width: panelState.width,
    height: panelState.height ?? undefined,
    maxHeight,
    '--ndt-bg': theme.bg,
    '--ndt-bg2': theme.bg2,
    '--ndt-bg3': theme.bg3,
    '--ndt-border': theme.border,
    '--ndt-text': theme.text,
    '--ndt-muted': theme.muted,
    '--ndt-dim': theme.dim,
    '--ndt-blue': theme.blue,
    '--ndt-green': theme.green,
    '--ndt-amber': theme.amber,
    '--ndt-red': theme.red,
  } satisfies ThemeCssProperties), [maxHeight, panelState.height, panelState.width, panelState.x, panelState.y, panelState.zIndex, theme]);

  return (
    <section
      ref={panelRef}
      style={shellStyle}
      onPointerDown={bringToFront}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div style={{ display: 'flex', minHeight: 0, width: '100%', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'grab',
            userSelect: 'none',
            borderBottom: `1px solid ${theme.bg3}`,
            padding: '8px 12px',
          }}
          onPointerDown={(event) => startDrag(event, 'move')}
        >
          <h2 style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            color: theme.text,
          }}
        >
            {title}
          </h2>
          <button
            type="button"
            style={{
              cursor: 'pointer',
              borderRadius: 4,
              border: 0,
              background: 'transparent',
              padding: '2px 6px',
              fontSize: 12,
              color: theme.muted,
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            Close
          </button>
        </header>
        <div style={{ minHeight: 0, overflow: 'auto' }}>{children}</div>
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 14,
          height: 14,
          cursor: 'nwse-resize',
          background: `linear-gradient(135deg, transparent 45%, ${theme.border} 46%, ${theme.border} 55%, transparent 56%)`,
        }}
        onPointerDown={(event) => startDrag(event, 'resize')}
      />
    </section>
  );
};
