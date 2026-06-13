import type { CSSProperties, JSX, SVGProps } from 'react';

export type DevToolIconName =
  | 'bug'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'copy'
  | 'download'
  | 'error'
  | 'flag'
  | 'gauge'
  | 'network'
  | 'panel'
  | 'spark'
  | 'toggle-off'
  | 'toggle-on'
  | 'trash'
  | 'tree';

export interface DevToolIconProps extends SVGProps<SVGSVGElement> {
  name: DevToolIconName;
  size?: number;
}

const defaultStyle: CSSProperties = {
  display: 'block',
  flexShrink: 0,
};

export function DevToolIcon({
  name,
  size = 16,
  style,
  ...props
}: DevToolIconProps): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      style={{ ...defaultStyle, ...style }}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

const paths: Record<DevToolIconName, JSX.Element> = {
  bug: (
    <>
      <path d="M8 8.5h8" />
      <path d="M9 4.5 10.5 7" />
      <path d="M15 4.5 13.5 7" />
      <path d="M7 12H4.5" />
      <path d="M19.5 12H17" />
      <path d="M7.5 16H5" />
      <path d="M19 16h-2.5" />
      <path d="M8 9.5c0-1.38 1.8-2.5 4-2.5s4 1.12 4 2.5V16c0 2.2-1.8 4-4 4s-4-1.8-4-4Z" />
      <path d="M12 7v13" />
    </>
  ),
  'chevron-down': <path d="m7 10 5 5 5-5" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  copy: (
    <>
      <rect height="12" rx="2" width="12" x="8" y="8" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 20h14" />
    </>
  ),
  error: (
    <>
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
      <path d="M10.3 4.4 2.8 17.5A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.5L13.7 4.4a2 2 0 0 0-3.4 0Z" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 5h11l-1.5 4L16 13H5" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 14a8 8 0 1 1 16 0" />
      <path d="M12 14l4-5" />
      <path d="M7 18h10" />
    </>
  ),
  network: (
    <>
      <rect height="6" rx="1.5" width="6" x="3" y="3" />
      <rect height="6" rx="1.5" width="6" x="15" y="3" />
      <rect height="6" rx="1.5" width="6" x="9" y="15" />
      <path d="M9 6h6" />
      <path d="M6 9v2.5A3.5 3.5 0 0 0 9.5 15H12" />
      <path d="M18 9v2.5a3.5 3.5 0 0 1-3.5 3.5H12" />
    </>
  ),
  panel: (
    <>
      <rect height="14" rx="3" width="18" x="3" y="5" />
      <path d="M7 9h.01" />
      <path d="M11 9h6" />
      <path d="M7 13h10" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3 10.2 8.2 5 10l5.2 1.8L12 17l1.8-5.2L19 10l-5.2-1.8Z" />
      <path d="m18 15 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
    </>
  ),
  'toggle-off': (
    <>
      <rect height="10" rx="5" width="18" x="3" y="7" />
      <circle cx="8" cy="12" r="3" />
    </>
  ),
  'toggle-on': (
    <>
      <rect height="10" rx="5" width="18" x="3" y="7" />
      <circle cx="16" cy="12" r="3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </>
  ),
  tree: (
    <>
      <path d="M6 5h6" />
      <path d="M6 12h12" />
      <path d="M6 19h9" />
      <path d="M6 5v14" />
      <path d="M6 12H4" />
      <path d="M6 19H4" />
    </>
  ),
};
