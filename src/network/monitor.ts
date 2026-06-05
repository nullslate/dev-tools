import { useSyncExternalStore } from 'react';

const MAX_ENTRIES = 200;
const MAX_PAYLOAD_CHARS = 20000;

export interface NetworkEntry {
  id: number;
  method: string;
  url: string;
  fullUrl: string;
  queryParams: Record<string, string[]> | null;
  requestHeaders: Record<string, string> | null;
  status: number | null;
  startTime: number;
  endTime: number;
  duration: number;
  responseSize: number | null;
  requestBody: string | null;
  responseBody: string | null;
  responseContentType: string | null;
  ok: boolean;
  error?: string;
  timestamp: string;
  count: number;
}

export interface RecordRequestInput {
  method: string;
  url: string;
  startTime: number;
  response?: Response | null;
  error?: Error;
  requestBody?: BodyInit | null;
  requestHeaders?: HeadersInit | null;
}

let nextId = 0;
let entries: NetworkEntry[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): NetworkEntry[] {
  return entries;
}

export function useNetworkEntries(): NetworkEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function clearNetworkEntries(): void {
  entries = [];
  emit();
}

function truncatePayload(value: string): string {
  if (value.length <= MAX_PAYLOAD_CHARS) return value;
  return `${value.slice(0, MAX_PAYLOAD_CHARS)}\n\n... truncated ${value.length - MAX_PAYLOAD_CHARS} chars`;
}

function serializeRequestBody(body: BodyInit | null | undefined): string | null {
  if (body == null) return null;
  if (typeof body === 'string') return truncatePayload(body);
  if (body instanceof URLSearchParams) return truncatePayload(body.toString());
  if (body instanceof FormData) {
    const formEntries = Array.from(body.entries()).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : `[File ${value.name || 'unnamed'} ${value.size}B]`,
    ]);
    return truncatePayload(JSON.stringify(Object.fromEntries(formEntries), null, 2));
  }
  if (body instanceof Blob) return `[Blob ${body.type || 'unknown'} ${body.size}B]`;
  if (body instanceof ArrayBuffer) return `[ArrayBuffer ${body.byteLength}B]`;
  return '[Unserializable request body]';
}

function serializeRequestHeaders(headers: HeadersInit | null | undefined): Record<string, string> | null {
  if (!headers) return null;
  const result: Record<string, string> = {};
  const addHeader = (key: string, value: string): void => {
    const lowerKey = key.toLowerCase();
    result[key] = lowerKey.includes('authorization') || lowerKey.includes('token')
      ? '[redacted]'
      : value;
  };

  if (headers instanceof Headers) {
    headers.forEach((value, key) => addHeader(key, value));
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => addHeader(key, value));
  } else {
    Object.entries(headers).forEach(([key, value]) => addHeader(key, value));
  }

  return Object.keys(result).length > 0 ? result : null;
}

async function readResponseBody(response: Response | null | undefined): Promise<string | null> {
  if (!response || response.status === 204) return null;
  try {
    const text = await response.clone().text();
    return text ? truncatePayload(text) : null;
  } catch {
    return '[Unable to read response body]';
  }
}

function parseUrl(url: string): { path: string; queryParams: Record<string, string[]> | null } {
  try {
    const parsed = new URL(url);
    const params: Record<string, string[]> = {};
    parsed.searchParams.forEach((value, key) => {
      (params[key] ??= []).push(value);
    });
    return {
      path: parsed.pathname,
      queryParams: Object.keys(params).length > 0 ? params : null,
    };
  } catch {
    return { path: url, queryParams: null };
  }
}

export function addNetworkEntry(entry: NetworkEntry): void {
  const existingIndex = entries.findIndex((existing) => (
    existing.method === entry.method && existing.url === entry.url
  ));

  if (existingIndex !== -1) {
    const existing = entries[existingIndex];
    const updated = { ...entry, id: existing.id, count: existing.count + 1 };
    const withoutExisting = [...entries];
    withoutExisting.splice(existingIndex, 1);
    entries = [...withoutExisting.slice(-(MAX_ENTRIES - 1)), updated];
  } else {
    entries = [...entries.slice(-(MAX_ENTRIES - 1)), entry];
  }

  emit();
}

export function recordRequest(input: RecordRequestInput): void {
  const endTime = performance.now();
  const duration = Math.round(endTime - input.startTime);
  const { path, queryParams } = parseUrl(input.url);
  const requestBody = serializeRequestBody(input.requestBody);
  const requestHeaders = serializeRequestHeaders(input.requestHeaders);
  const responseContentType = input.response?.headers.get('content-type') ?? null;
  const status = input.response?.status ?? null;
  const contentLength = input.response?.headers.get('content-length');
  const responseSize = contentLength ? Number.parseInt(contentLength, 10) : null;

  void readResponseBody(input.response).then((responseBody) => {
    addNetworkEntry({
      id: nextId++,
      method: input.method,
      url: path,
      fullUrl: input.url,
      queryParams,
      requestHeaders,
      status,
      startTime: input.startTime,
      endTime,
      duration,
      responseSize,
      requestBody,
      responseBody,
      responseContentType,
      ok: input.response?.ok ?? false,
      error: input.error?.message,
      timestamp: new Date().toISOString(),
      count: 1,
    });
  });
}

export function createMonitoredFetch(fetchImpl: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const startTime = performance.now();
    const request = new Request(input, init);

    try {
      const response = await fetchImpl(request);
      recordRequest({
        method: request.method,
        url: request.url,
        startTime,
        response,
        requestBody: init?.body ?? null,
        requestHeaders: request.headers,
      });
      return response;
    } catch (error) {
      recordRequest({
        method: request.method,
        url: request.url,
        startTime,
        error: error instanceof Error ? error : new Error(String(error)),
        requestBody: init?.body ?? null,
        requestHeaders: request.headers,
      });
      throw error;
    }
  };
}
