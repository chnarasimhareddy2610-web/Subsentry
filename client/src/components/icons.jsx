/* Inline, stroke-based icons. No emoji, no icon dependency. */

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function IconLedger(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.5.5H6a2 2 0 0 1-2-2Z" />
      <path d="M8 8.5h7M8 12h7M8 15.5h4" />
    </svg>
  );
}

export function IconList(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6.5h10M9 12h10M9 17.5h10" />
      <circle cx="4.8" cy="6.5" r="1" />
      <circle cx="4.8" cy="12" r="1" />
      <circle cx="4.8" cy="17.5" r="1" />
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

export function IconInsights(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19.5V5" />
      <path d="M4 19.5h16" />
      <path d="M8 16v-4.5M12 16V8M16 16v-6.5" />
    </svg>
  );
}

export function IconPlus(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  );
}

export function IconClose(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconArrowRight(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevronLeft(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 6l6 6-6 6" />
    </svg>
  );
}

export function IconWarning(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.5 21 19.5H3L12 4.5Z" />
      <path d="M12 10v4M12 16.6v.1" />
    </svg>
  );
}

export function IconCheck(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconSearch(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l4.5 4.5" />
    </svg>
  );
}

export function IconTrash(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2h9.4L17.5 7" />
      <path d="M10.5 10.5v6M13.5 10.5v6" />
    </svg>
  );
}

export function IconEdit(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10Z" />
      <path d="M14 7.5l2.5 2.5" />
    </svg>
  );
}

export function IconHistory(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 4.5V9h4.5" />
      <path d="M12 8v4.2l2.8 1.7" />
    </svg>
  );
}

export function IconReset(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 1 2.4 5.5" />
      <path d="M4.5 19v-5h5" />
    </svg>
  );
}

export function IconStop(props) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function IconDatabase(props) {
  return (
    <svg {...base} {...props}>
      <ellipse cx="12" cy="6" rx="7.5" ry="2.8" />
      <path d="M4.5 6v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6" />
      <path d="M4.5 12v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6" />
    </svg>
  );
}

export function IconLayers(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 20.5 8 12 12.5 3.5 8 12 3.5Z" />
      <path d="M4 12.5 12 17l8-4.5" />
      <path d="M4 16.8 12 21.3l8-4.5" />
    </svg>
  );
}

export function IconArrowUpRight(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export function IconInfo(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.9v.1" />
    </svg>
  );
}
