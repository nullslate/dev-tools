import type { CSSProperties, ReactNode } from 'react';

export interface DevToolFloatingProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
  maxHeight?: string;
}

export const DevToolFloating = ({
  title,
  children,
  onClose,
  width = 420,
  maxHeight = 'calc(100vh - 40px)',
}: DevToolFloatingProps): JSX.Element => {
  const shellStyle: CSSProperties = {
    position: 'fixed',
    right: 16,
    top: 56,
    zIndex: 99999,
    display: 'flex',
    overflow: 'hidden',
    borderRadius: 12,
    border: '1px solid #334155',
    background: '#020617',
    color: '#f8fafc',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.55)',
    width,
    maxHeight,
  };

  return (
    <section style={shellStyle}>
      <div style={{ display: 'flex', minHeight: 0, width: '100%', flexDirection: 'column' }}>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1e293b',
          padding: '8px 12px',
        }}
      >
          <h2 style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            color: '#f8fafc',
          }}
        >
            {title}
          </h2>
          <button
            type="button"
            style={{
              cursor: 'pointer',
              borderRadius: 4,
              border: 0,
              background: 'transparent',
              padding: '2px 6px',
              fontSize: 12,
              color: '#94a3b8',
            }}
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            Close
          </button>
        </header>
        <div style={{ minHeight: 0, overflow: 'auto' }}>{children}</div>
      </div>
    </section>
  );
};
