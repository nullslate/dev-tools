# @thesandybridge/dev-tools

Reusable React dev toolbar with pluggable panels and a network inspector.

## Install

```bash
npm install @thesandybridge/dev-tools
```

## Usage

```tsx
import {
  DevToolbarProvider,
  DevToolbarPill,
  NetworkTool,
  createMonitoredFetch,
} from '@thesandybridge/dev-tools';

const fetchWithDevTools = createMonitoredFetch(fetch);

export function App() {
  return (
    <DevToolbarProvider>
      <NetworkTool />
      <YourApp />
      <DevToolbarPill />
    </DevToolbarProvider>
  );
}
```

Use `fetchWithDevTools(url, init)` anywhere you want requests recorded, or call
`recordRequest()` manually from an existing HTTP wrapper.
