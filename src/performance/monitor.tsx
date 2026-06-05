import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const MAX_ENTRIES = 500;
const SLOW_FRAME_MS = 16;
const VERY_SLOW_MS = 100;

export interface PerformanceEntryRecord {
  id: number;
  label: string;
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  timestamp: string;
  detail?: Record<string, unknown>;
}

interface PerformanceState {
  entries: PerformanceEntryRecord[];
  activeProfilers: number;
}

let nextId = 0;
let state: PerformanceState = { entries: [], activeProfilers: 0 };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PerformanceState {
  return state;
}

export function usePerformanceState(): PerformanceState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function clearPerformanceEntries(): void {
  state = { ...state, entries: [] };
  emit();
}

export function recordPerformance(
  label: string,
  operation: string,
  startTime: number,
  endTime: number = performance.now(),
  detail?: Record<string, unknown>,
): PerformanceEntryRecord {
  const entry: PerformanceEntryRecord = {
    id: nextId++,
    label,
    operation,
    startTime,
    endTime,
    duration: endTime - startTime,
    timestamp: new Date().toISOString(),
    detail,
  };

  state = {
    ...state,
    entries: [...state.entries.slice(-(MAX_ENTRIES - 1)), entry],
  };
  emit();
  return entry;
}

export function measurePerformance<T>(
  label: string,
  operation: string,
  fn: () => T,
  detail?: Record<string, unknown>,
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    recordPerformance(label, operation, start, performance.now(), detail);
  }
}

export async function measurePerformanceAsync<T>(
  label: string,
  operation: string,
  fn: () => Promise<T>,
  detail?: Record<string, unknown>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordPerformance(label, operation, start, performance.now(), detail);
  }
}

export function usePerfMark(label: string): (operation: string, detail?: Record<string, unknown>) => void {
  const startRef = useRef(performance.now());

  return (operation, detail) => {
    const end = performance.now();
    recordPerformance(label, operation, startRef.current, end, detail);
    startRef.current = end;
  };
}

export interface PerfProfilerProps {
  label: string;
  operation?: string;
  detail?: Record<string, unknown>;
  children?: ReactNode;
}

export function PerfProfiler({
  label,
  operation = 'mount',
  detail,
  children,
}: PerfProfilerProps): JSX.Element {
  const startRef = useRef(performance.now());

  useEffect(() => {
    recordPerformance(label, operation, startRef.current, performance.now(), detail);
    state = { ...state, activeProfilers: state.activeProfilers + 1 };
    emit();
    return () => {
      state = { ...state, activeProfilers: Math.max(0, state.activeProfilers - 1) };
      emit();
    };
    // Intentionally records initial mount timing only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

export const PERFORMANCE_THRESHOLDS = {
  slowFrameMs: SLOW_FRAME_MS,
  verySlowMs: VERY_SLOW_MS,
} as const;
