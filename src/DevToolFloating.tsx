import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useDevToolbarContext } from './DevToolbarContext';
import { DevToolIcon } from './icons';

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
  initialHeight: number;
  next: FloatingPanelState;
  previousBodyCursor: string;
  previousBodyUserSelect: string;
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

function applyDragFrame(panel: HTMLElement, drag: DragState): void {
  if (drag.mode === 'move') {
    panel.style.transform = `translate3d(${drag.next.x - drag.initial.x}px, ${drag.next.y - drag.initial.y}px, 0)`;
    return;
  }

  panel.style.width = `${drag.next.width}px`;
  if (drag.next.height != null) panel.style.height = `${drag.next.height}px`;
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
  const frameRef = useRef<number | null>(null);
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

  const clearDragSideEffects = useCallback((drag: DragState): void => {
    if (typeof document === 'undefined') return;
    document.body.style.cursor = drag.previousBodyCursor;
    document.body.style.userSelect = drag.previousBodyUserSelect;
  }, []);

  function handlePointerMove(event: PointerEvent): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    drag.next = drag.mode === 'move'
      ? {
        ...drag.initial,
        x: clamp(drag.initial.x + dx, 8, Math.max(8, viewportWidth - 80)),
        y: clamp(drag.initial.y + dy, 8, Math.max(8, viewportHeight - 48)),
      }
      : {
        ...drag.initial,
        width: clamp(drag.initial.width + dx, minWidth, Math.max(minWidth, viewportWidth - drag.initial.x - 8)),
        height: clamp(drag.initialHeight + dy, minHeight, Math.max(minHeight, viewportHeight - drag.initial.y - 8)),
      };

    if (frameRef.current != null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const panel = panelRef.current;
      const currentDrag = dragRef.current;
      if (!panel || !currentDrag) return;
      applyDragFrame(panel, currentDrag);
    });
  }

  function endDrag(event: PointerEvent): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const panel = panelRef.current;
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (panel) {
      if (drag.mode === 'move') {
        panel.style.left = `${drag.next.x}px`;
        panel.style.top = `${drag.next.y}px`;
        panel.style.transform = '';
      } else {
        panel.style.width = `${drag.next.width}px`;
        if (drag.next.height != null) panel.style.height = `${drag.next.height}px`;
      }
    }
    clearDragSideEffects(drag);
    dragRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    commitPanelState(drag.next);
  }

  const startDrag = useCallback((event: ReactPointerEvent<HTMLElement>, mode: DragState['mode']): void => {
    if (event.button !== 0) return;
    const panel = panelRef.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    bringToFront();
    const previousBodyCursor = typeof document === 'undefined' ? '' : document.body.style.cursor;
    const previousBodyUserSelect = typeof document === 'undefined' ? '' : document.body.style.userSelect;
    if (typeof document !== 'undefined') {
      document.body.style.cursor = mode === 'move' ? 'grabbing' : 'nwse-resize';
      document.body.style.userSelect = 'none';
    }
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initial: panelState,
      initialHeight: panelState.height ?? panel?.getBoundingClientRect().height ?? minHeight,
      next: panelState,
      previousBodyCursor,
      previousBodyUserSelect,
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    event.stopPropagation();
    event.preventDefault();
  }, [bringToFront, minHeight, panelState]);

  useEffect(() => () => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    const drag = dragRef.current;
    if (drag) {
      clearDragSideEffects(drag);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    }
  }, [clearDragSideEffects]);

  const shellStyle = useMemo<CSSProperties>(() => ({
    position: 'fixed',
    left: panelState.x,
    top: panelState.y,
    zIndex: panelState.zIndex,
    display: 'flex',
    contain: 'layout paint style',
    overflow: 'hidden',
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    background: `linear-gradient(180deg, ${theme.bg2}, ${theme.bg})`,
    color: theme.text,
    boxShadow: theme.shadow,
    width: panelState.width,
    height: panelState.height ?? undefined,
    maxHeight,
    willChange: 'transform, width, height',
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
    >
      <div style={{ display: 'flex', minHeight: 0, width: '100%', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
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
              padding: 4,
              color: theme.muted,
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            aria-label={`Close ${title}`}
            title={`Close ${title}`}
          >
            <DevToolIcon name="close" size={14} />
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
          touchAction: 'none',
          background: `linear-gradient(135deg, transparent 45%, ${theme.border} 46%, ${theme.border} 55%, transparent 56%)`,
        }}
        onPointerDown={(event) => startDrag(event, 'resize')}
      />
    </section>
  );
};
