import type { CSSProperties, ReactNode } from 'react';
import type { DevToolbarTheme } from './theme';

export type PanelType = 'dropdown' | 'floating' | 'inline';
export type ToolScope = 'global' | 'route';

export interface DevToolRegistration {
  id: string;
  icon?: ReactNode;
  label: string;
  scope?: ToolScope;
  panelType?: PanelType;
  panel?: ReactNode;
  inlineContent?: ReactNode;
  onClick?: () => void;
  order?: number;
  style?: CSSProperties;
  alert?: boolean;
}

export interface DevToolbarContextValue {
  tools: Map<string, DevToolRegistration>;
  visible: boolean;
  theme: DevToolbarTheme;
  setVisible: (visible: boolean) => void;
  activePanels: Set<string>;
  togglePanel: (id: string) => void;
  closePanel: (id: string) => void;
  closeAllPanels: () => void;
  registerTool: (tool: DevToolRegistration) => void;
  unregisterTool: (id: string) => void;
}
