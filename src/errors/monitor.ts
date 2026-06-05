import { useSyncExternalStore } from 'react';

const MAX_ERRORS = 100;

export interface DevToolBreadcrumb {
  timestamp: string;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface CapturedDevError {
  id: string;
  timestamp: string;
  name: string;
  message: string;
  stack?: string;
  source?: string;
  breadcrumbs: DevToolBreadcrumb[];
  context?: Record<string, unknown>;
}

let errors: CapturedDevError[] = [];
let breadcrumbs: DevToolBreadcrumb[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CapturedDevError[] {
  return errors;
}

export function useCapturedErrors(): CapturedDevError[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
  breadcrumbs = [...breadcrumbs.slice(-49), {
    timestamp: new Date().toISOString(),
    category,
    message,
    data,
  }];
}

export function captureError(error: unknown, source?: string, context?: Record<string, unknown>): CapturedDevError {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const captured: CapturedDevError = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
    source,
    context,
    breadcrumbs,
  };
  errors = [...errors.slice(-(MAX_ERRORS - 1)), captured];
  emit();
  return captured;
}

export function clearCapturedErrors(): void {
  errors = [];
  emit();
}

export function installGlobalErrorCapture(): () => void {
  const onError = (event: ErrorEvent): void => {
    captureError(event.error ?? event.message, 'window.error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    captureError(event.reason, 'unhandledrejection');
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
