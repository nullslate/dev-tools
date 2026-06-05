import type { CSSProperties, ReactNode, RefObject } from 'react';

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
  const rect = anchorRef.current?.getBoundingClientRect();

  const containerStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 99999,
    minWidth: 256,
    overflow: 'hidden',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#020617',
    color: '#f8fafc',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.55)',
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
          fontSize: 12,
          color: '#94a3b8',
        }}
        onClick={onClose}
        aria-label="Close dev tool dropdown"
      >
        Close
      </button>
      <div style={{ paddingTop: 28 }}>{children}</div>
    </div>
  );
};
