/** Kleine Stroke-Icons (16×16) für die Editor-Toolbar. */

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const

export function IconToc(): React.JSX.Element {
  return (
    <svg {...base}>
      <line x1="2.5" y1="3.5" x2="10.5" y2="3.5" />
      <line x1="4.5" y1="6.5" x2="12.5" y2="6.5" />
      <line x1="6.5" y1="9.5" x2="13.5" y2="9.5" />
      <line x1="2.5" y1="12.5" x2="9" y2="12.5" />
    </svg>
  )
}

export function IconBack(): React.JSX.Element {
  return (
    <svg {...base}>
      <polyline points="9.5 3.5 5 8 9.5 12.5" />
    </svg>
  )
}

export function IconForward(): React.JSX.Element {
  return (
    <svg {...base}>
      <polyline points="6.5 3.5 11 8 6.5 12.5" />
    </svg>
  )
}

export function IconHeading(): React.JSX.Element {
  return (
    <svg {...base} stroke="none" fill="currentColor">
      <text x="1" y="12" fontSize="11" fontWeight="600">
        Aa
      </text>
    </svg>
  )
}

export function IconCaret(): React.JSX.Element {
  return (
    <svg {...base} width={8} height={8} viewBox="0 0 16 16" strokeWidth={2}>
      <polyline points="3 6 8 11 13 6" />
    </svg>
  )
}

export function IconBold(): React.JSX.Element {
  return (
    <svg {...base} strokeWidth={1.7}>
      <path d="M5 2.8h3.6a2.6 2.6 0 0 1 0 5.2H5zM5 8h4.2a2.6 2.6 0 0 1 0 5.2H5z" />
    </svg>
  )
}

export function IconItalic(): React.JSX.Element {
  return (
    <svg {...base}>
      <line x1="6.5" y1="3" x2="11" y2="3" />
      <line x1="5" y1="13" x2="9.5" y2="13" />
      <line x1="8.75" y1="3" x2="7.25" y2="13" />
    </svg>
  )
}

export function IconStrike(): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M11 4.7C10.5 3.7 9.4 3 8 3 6.3 3 5.1 3.9 5.1 5.2c0 .8.5 1.4 1.5 1.8" />
      <path d="M5 11.3c.5 1 1.6 1.7 3 1.7 1.7 0 2.9-.9 2.9-2.2 0-.8-.5-1.4-1.5-1.8" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  )
}

export function IconInlineCode(): React.JSX.Element {
  return (
    <svg {...base}>
      <polyline points="5.5 4.5 2.5 8 5.5 11.5" />
      <polyline points="10.5 4.5 13.5 8 10.5 11.5" />
    </svg>
  )
}

export function IconBulletList(): React.JSX.Element {
  return (
    <svg {...base}>
      <circle cx="3.2" cy="4" r="0.4" fill="currentColor" />
      <circle cx="3.2" cy="8" r="0.4" fill="currentColor" />
      <circle cx="3.2" cy="12" r="0.4" fill="currentColor" />
      <line x1="6.5" y1="4" x2="13.5" y2="4" />
      <line x1="6.5" y1="8" x2="13.5" y2="8" />
      <line x1="6.5" y1="12" x2="13.5" y2="12" />
    </svg>
  )
}

export function IconOrderedList(): React.JSX.Element {
  return (
    <svg {...base}>
      <text x="1.5" y="5.7" fontSize="5.5" stroke="none" fill="currentColor">
        1
      </text>
      <text x="1.5" y="14" fontSize="5.5" stroke="none" fill="currentColor">
        2
      </text>
      <line x1="6.5" y1="4" x2="13.5" y2="4" />
      <line x1="6.5" y1="12" x2="13.5" y2="12" />
    </svg>
  )
}

export function IconQuote(): React.JSX.Element {
  return (
    <svg {...base}>
      <line x1="3.5" y1="3" x2="3.5" y2="13" strokeWidth={2} />
      <line x1="7" y1="5.5" x2="13" y2="5.5" />
      <line x1="7" y1="10.5" x2="11.5" y2="10.5" />
    </svg>
  )
}

export function IconCodeBlock(): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M6 2.5c-1.5 0-1.5 1.2-1.5 2.2v.9c0 1-.5 1.7-1.7 2.4 1.2.7 1.7 1.4 1.7 2.4v.9c0 1 0 2.2 1.5 2.2" />
      <path d="M10 2.5c1.5 0 1.5 1.2 1.5 2.2v.9c0 1 .5 1.7 1.7 2.4-1.2.7-1.7 1.4-1.7 2.4v.9c0 1 0 2.2-1.5 2.2" />
    </svg>
  )
}

export function IconLink(): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M9.5 4.5l1-1a2.47 2.47 0 0 1 3.5 3.5l-2 2a2.47 2.47 0 0 1-3.5 0" />
      <path d="M6.5 11.5l-1 1a2.47 2.47 0 0 1-3.5-3.5l2-2a2.47 2.47 0 0 1 3.5 0" />
    </svg>
  )
}

export function IconImage(): React.JSX.Element {
  return (
    <svg {...base}>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.2" />
      <circle cx="5.7" cy="6.5" r="0.9" />
      <path d="M3.5 11.5l3-3 2.3 2.3 2-2 2.7 2.7" />
    </svg>
  )
}

export function IconTable(): React.JSX.Element {
  return (
    <svg {...base}>
      <rect x="2.5" y="3" width="11" height="10" rx="1" />
      <line x1="2.5" y1="6.3" x2="13.5" y2="6.3" />
      <line x1="6.2" y1="3" x2="6.2" y2="13" />
      <line x1="9.9" y1="3" x2="9.9" y2="13" />
    </svg>
  )
}

export function IconHr(): React.JSX.Element {
  return (
    <svg {...base}>
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  )
}

export function IconNewNote(): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M12.5 7.5v4a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 11.5V4.5A1.5 1.5 0 0 1 4.5 3h4" />
      <path d="M12.9 2.7l.4.4a1 1 0 0 1 0 1.4L9 8.8l-2.2.6.6-2.2 4.1-4.1a1 1 0 0 1 1.4-.4z" />
    </svg>
  )
}

export function IconNewFolder(): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M2.5 4.5a1 1 0 0 1 1-1h2.6l1.4 1.5h4.5a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1z" />
      <line x1="8" y1="7.3" x2="8" y2="10.3" />
      <line x1="6.5" y1="8.8" x2="9.5" y2="8.8" />
    </svg>
  )
}

export function IconReload(): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M13 8A5 5 0 1 1 11.5 4.4" />
      <polyline points="11.7 1.9 11.7 4.6 9 4.6" />
    </svg>
  )
}

export function IconEye({ open }: { open: boolean }): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M1.8 8s2.3-4 6.2-4 6.2 4 6.2 4-2.3 4-6.2 4S1.8 8 1.8 8z" />
      <circle cx="8" cy="8" r="1.8" fill={open ? 'currentColor' : 'none'} />
      {!open && <line x1="3.2" y1="12.8" x2="12.8" y2="3.2" />}
    </svg>
  )
}

export function IconHelp(): React.JSX.Element {
  return (
    <svg {...base}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M6.1 6.2a1.9 1.9 0 1 1 2.7 1.7c-.55.28-.8.6-.8 1.2" />
      <line x1="8" y1="11.3" x2="8" y2="11.4" />
    </svg>
  )
}

export function IconBook({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <svg {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M8 4.3C6.9 3.4 5.2 3 3 3v9.4c2.2 0 3.9.4 5 1.3 1.1-.9 2.8-1.3 5-1.3V3c-2.2 0-3.9.4-5 1.3z" />
      <line x1="8" y1="4.3" x2="8" y2="13.7" stroke={filled ? 'var(--bg, #fff)' : 'currentColor'} />
    </svg>
  )
}

export function IconMeetingNote(): React.JSX.Element {
  return (
    <svg {...base}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
      <line x1="5.5" y1="2" x2="5.5" y2="4.5" />
      <line x1="10.5" y1="2" x2="10.5" y2="4.5" />
      <line x1="2.5" y1="6.5" x2="13.5" y2="6.5" />
      <line x1="8" y1="8.3" x2="8" y2="11.7" />
      <line x1="6.3" y1="10" x2="9.7" y2="10" />
    </svg>
  )
}
