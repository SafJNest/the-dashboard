const ICONS = {
  back: <path d="m15 6-6 6 6 6" />,
  chevrons: <path d="m8 9 4-4 4 4M8 15l4 4 4-4" />,
  servers: <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />,
  sounds: <path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" />,
  playlists: (
    <>
      <path d="M3 6h12M3 12h12M3 18h7" />
      <circle cx="18" cy="17" r="3" />
      <path d="M21 17V6l-3 1" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  leaderboard: <path d="M8 21V11M16 21V7M12 21V3M4 21v-5M20 21v-8" />,
  soundboards: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  welcome: <path d="M15 12H3M10 7l5 5-5 5M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />,
  leave: <path d="M21 12H9M16 7l5 5-5 5M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />,
  boost: <path d="M12 2 4 8l8 14 8-14zM4 8h16M12 2v20" />,
  experience: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  levelUp: <path d="M12 19V5M5 12l7-7 7 7" />,
  rewards: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />,
  moderation: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  blacklist: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  twitch: <path d="M4 3h16v11l-4 4h-4l-3 3H7v-3H4zM11 8v4M16 8v4" />,
  general: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  warning: <path d="M12 3 2 20h20zM12 10v4M12 17v.01" />,
  check: <path d="m5 12 5 5 9-10" />,
  message: <path d="M4 4h16v12H8l-4 4z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  hash: <path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18" />,
  none: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m6.5 6.5 11 11" />
    </>
  ),
  play: <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  dislike: <path d="M17 3h3v11h-3zM17 14l-4 7a2.5 2.5 0 0 1-2.5-3l.7-3H5.6a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 7 3h10" />,
  greet: <path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />,
  download: <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />,
  edit: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  sort: <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}
