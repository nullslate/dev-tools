import type { CSSProperties, JSX, ReactNode, RefObject } from 'react';
import { useDevToolbarContext } from './DevToolbarContext';
import { DevToolIcon } from './icons';

export interface DevToolDropdownProps {
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  onClose: () => void;
}

export const DevToolDropdown = ({
  anchorRef,
  children,
  onClose,
}: DevToolDropdownProps): JSX.Element => {
  const { theme } = useDevToolbarContext();
  const rect = anchorRef.current?.getBoundingClientRect();

  const containerStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 99999,
    minWidth: 256,
    overflow: 'hidden',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: `linear-gradient(180deg, ${theme.bg2}, ${theme.bg})`,
    color: theme.text,
    boxShadow: theme.shadow,
    top: rect ? rect.bottom + 8 : 48,
    left: rect ? rect.left : 16,
  };

  return (
    <div style={containerStyle}>
      <button
        type="button"
        style={{
          position: 'absolute',
          right: 8,
          top: 8,
          cursor: 'pointer',
          border: 0,
          background: 'transparent',
          padding: 4,
          color: theme.muted,
        }}
        onClick={onClose}
        aria-label="Close dev tool dropdown"
        title="Close dev tool dropdown"
      >
        <DevToolIcon name="close" size={14} />
      </button>
      <div style={{ paddingTop: 28 }}>{children}</div>
    </div>
  );
};
