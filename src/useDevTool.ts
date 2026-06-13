import { useEffect } from 'react';
import { useDevToolbarContext } from './DevToolbarContext';
import type { DevToolRegistration } from './types';

export function useDevTool(registration: DevToolRegistration): void {
  const { registerTool, unregisterTool } = useDevToolbarContext();

  useEffect(() => {
    registerTool(registration);
  }, [registration, registerTool]);

  useEffect(() => (
    () => unregisterTool(registration.id)
  ), [registration.id, unregisterTool]);
}
