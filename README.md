# Nullslate Dev Tools

Reusable React dev toolbar with pluggable panels and a network inspector.

## Install

```bash
npm install @nullslate/dev-tools
```

## Usage

```tsx
import { useEffect } from 'react';
import {
  DevToolbarProvider,
  DevToolbarPill,
  NetworkTool,
  installMonitoredFetch,
} from '@nullslate/dev-tools';

export function App() {
  useEffect(() => installMonitoredFetch(), []);

  return (
    <DevToolbarProvider>
      <NetworkTool />
      <YourApp />
      <DevToolbarPill />
    </DevToolbarProvider>
  );
}
```

Use `installMonitoredFetch()` to patch `window.fetch` while your app is mounted,
`createMonitoredFetch(fetch)` for explicit wrappers, or call `recordRequest()`
manually from an existing HTTP client.

## Included Tools

- Draggable, resizable floating panels with saved positions.
- Network inspector with filtering, search, response/request payload previews, cURL copy/export, and HAR export.
- Feature flag, performance, error, toggle, and tree adapter tools.
- AMOLED black theme by default, with a built-in settings panel for live color changes saved to localStorage.

## Example

```bash
cd examples/basic
npm install
npm run dev
```

## GitHub Pages

The Vite example can be deployed as the repository's GitHub Pages app. The
workflow in `.github/workflows/deploy-pages.yml` builds `examples/basic` and
publishes `examples/basic/dist`.

In GitHub, set **Settings → Pages → Build and deployment → Source** to
**GitHub Actions**. Push to `main` or run the workflow manually.
