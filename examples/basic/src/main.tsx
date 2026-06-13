import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DevToolbarPill,
  DevToolbarProvider,
  ErrorTool,
  FeatureFlagsTool,
  NetworkTool,
  PerformanceTool,
  ToggleTool,
  captureError,
  installGlobalErrorCapture,
  installMonitoredFetch,
  measurePerformance,
  type FeatureFlagValue,
} from '@nullslate/dev-tools';
import './styles.css';

function ExampleApp(): JSX.Element {
  const [flags, setFlags] = useState<Record<string, FeatureFlagValue>>({
    newCheckout: false,
    maxResults: 25,
    variant: 'control',
  });
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const uninstallFetch = installMonitoredFetch();
    const uninstallErrors = installGlobalErrorCapture();
    return () => {
      uninstallFetch();
      uninstallErrors();
    };
  }, []);

  const triggerRequest = (): void => {
    void fetch('https://jsonplaceholder.typicode.com/todos/1');
  };

  const triggerFailedRequest = (): void => {
    void fetch('https://jsonplaceholder.typicode.com/missing-resource');
  };

  const triggerPerformance = (): void => {
    measurePerformance('ExampleApp', 'expensive loop', () => {
      let total = 0;
      for (let index = 0; index < 1_000_000; index += 1) total += index;
      return total;
    });
  };

  return (
    <DevToolbarProvider>
      <FeatureFlagsTool
        flags={flags}
        overriddenFlags={flags}
        isOverriding
        onFlagChange={(name, value) => setFlags((current) => ({ ...current, [name]: value }))}
      />
      <NetworkTool />
      <PerformanceTool />
      <ErrorTool />
      <ToggleTool id="debug-mode" label="Debug Mode" value={debugMode} onChange={setDebugMode} />

      <main className="shell">
        <section className="panel">
          <div>
            <p className="eyebrow">Nullslate Dev Tools</p>
            <h1>Basic integration demo</h1>
            <p className="summary">
              Use the toolbar at the top to inspect requests, errors, feature flags, and performance measurements.
            </p>
          </div>
          <div className="actions">
            <button type="button" onClick={triggerRequest}>Record request</button>
            <button type="button" onClick={triggerFailedRequest}>Record failed request</button>
            <button type="button" onClick={triggerPerformance}>Measure work</button>
            <button type="button" onClick={() => captureError(new Error('Example captured error'), 'demo')}>Capture error</button>
          </div>
        </section>
      </main>
      <DevToolbarPill />
    </DevToolbarProvider>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ExampleApp />
  </StrictMode>,
);
