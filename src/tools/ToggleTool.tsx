import { memo, useMemo, type JSX } from 'react';
import { DevToolIcon } from '../icons';
import { useDevTool } from '../useDevTool';
import type { DevToolRegistration } from '../types';

export interface ToggleToolProps {
  id: string;
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  order?: number;
  scope?: DevToolRegistration['scope'];
  iconOn?: DevToolRegistration['icon'];
  iconOff?: DevToolRegistration['icon'];
}

export const ToggleTool = memo(({
  id,
  label,
  value,
  onChange,
  order = 50,
  scope = 'global',
  iconOn = <DevToolIcon name="toggle-on" />,
  iconOff = <DevToolIcon name="toggle-off" />,
}: ToggleToolProps): null => {
  useDevTool(useMemo(() => ({
    id,
    icon: value ? iconOn : iconOff,
    label: `${label} (${value ? 'ON' : 'OFF'})`,
    scope,
    panelType: 'dropdown',
    order,
    alert: value,
    onClick: () => onChange(!value),
  }), [id, iconOff, iconOn, label, onChange, order, scope, value]));

  return null;
});

ToggleTool.displayName = 'ToggleTool';

export function createToggleTool(defaults: Omit<ToggleToolProps, 'value' | 'onChange'>): (props: Pick<ToggleToolProps, 'value' | 'onChange'>) => JSX.Element {
  const CreatedToggleTool = ({ value, onChange }: Pick<ToggleToolProps, 'value' | 'onChange'>): JSX.Element => (
    <ToggleTool {...defaults} value={value} onChange={onChange} />
  );
  CreatedToggleTool.displayName = `${defaults.label.replace(/\s+/g, '')}ToggleTool`;
  return CreatedToggleTool;
}
