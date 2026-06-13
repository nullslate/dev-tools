import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import type { DevToolRegistration, DevToolbarContextValue } from './types';
import {
  clearStoredDevToolbarTheme,
  readStoredDevToolbarTheme,
  resolveDevToolbarTheme,
  writeStoredDevToolbarTheme,
  type DevToolbarThemeInput,
} from './theme';
import { ThemeSettingsTool } from './tools/ThemeSettingsTool';

const DevToolbarContext = createContext<DevToolbarContextValue | null>(null);

export interface DevToolbarProviderProps {
  children: ReactNode;
  defaultVisible?: boolean;
  theme?: DevToolbarThemeInput;
}

export const DevToolbarProvider = ({
  children,
  defaultVisible = true,
  theme: themeInput,
}: DevToolbarProviderProps): JSX.Element => {
  const [tools, setTools] = useState<Map<string, DevToolRegistration>>(new Map());
  const [visible, setVisible] = useState(defaultVisible);
  const [activePanels, setActivePanels] = useState<Set<string>>(new Set());
  const [themeOverrides, setThemeOverrides] = useState<DevToolbarThemeInput>(readStoredDevToolbarTheme);
  const theme = useMemo(() => resolveDevToolbarTheme({
    ...themeInput,
    ...themeOverrides,
  }), [themeInput, themeOverrides]);

  const setTheme = useCallback((nextTheme: DevToolbarThemeInput): void => {
    setThemeOverrides((current) => {
      const next = { ...current, ...nextTheme };
      writeStoredDevToolbarTheme(next);
      return next;
    });
  }, []);

  const resetTheme = useCallback((): void => {
    clearStoredDevToolbarTheme();
    setThemeOverrides({});
  }, []);

  const registerTool = useCallback((tool: DevToolRegistration): void => {
    setTools((prev) => {
      const next = new Map(prev);
      next.set(tool.id, {
        scope: 'route',
        panelType: 'floating',
        ...tool,
      });
      return next;
    });
  }, []);

  const unregisterTool = useCallback((id: string): void => {
    setTools((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setActivePanels((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const togglePanel = useCallback((id: string): void => {
    setActivePanels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const closePanel = useCallback((id: string): void => {
    setActivePanels((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const closeAllPanels = useCallback((): void => setActivePanels(new Set()), []);

  const value = useMemo<DevToolbarContextValue>(() => ({
    tools,
    visible,
    theme,
    themeOverrides,
    setVisible,
    setTheme,
    resetTheme,
    activePanels,
    togglePanel,
    closePanel,
    closeAllPanels,
    registerTool,
    unregisterTool,
  }), [
    tools,
    visible,
    theme,
    themeOverrides,
    setTheme,
    resetTheme,
    activePanels,
    togglePanel,
    closePanel,
    closeAllPanels,
    registerTool,
    unregisterTool,
  ]);

  return (
    <DevToolbarContext.Provider value={value}>
      <ThemeSettingsTool />
      {children}
    </DevToolbarContext.Provider>
  );
};

export const useDevToolbarContext = (): DevToolbarContextValue => {
  const ctx = useContext(DevToolbarContext);
  if (!ctx) throw new Error('useDevToolbarContext must be used within DevToolbarProvider');
  return ctx;
};
