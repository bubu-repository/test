/* Line icons (24×24, 1.6 stroke) — one family for hotspots, HUD and panels.
   No sparkle/AI glyphs: 'sparkle' is kept only so older call sites compile and
   now draws a heart. Moci is a jelly drop with a face ('jelly'), never a star. */
import type { CSSProperties } from 'react';

export type IconName =
  | 'clock'
  | 'cloud'
  | 'paper'
  | 'monitor'
  | 'gamepad'
  | 'keys'
  | 'vinyl'
  | 'box'
  | 'frame'
  | 'trophy'
  | 'rocket'
  | 'ticket'
  | 'card'
  | 'power'
  | 'question'
  | 'phone'
  | 'door'
  | 'sound'
  | 'mute'
  | 'back'
  | 'close'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'menu'
  | 'notebook'
  | 'check'
  | 'lock'
  | 'star'
  | 'play'
  | 'pause'
  | 'download'
  | 'share'
  | 'mail'
  | 'map'
  | 'settings'
  | 'sparkle'
  | 'heart'
  | 'eye'
  | 'jelly'
  | 'file'
  | 'chat'
  | 'calendar'
  | 'cd'
  | 'plus'
  | 'minus';

const P: Record<IconName, string> = {
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2',
  cloud: 'M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.5 4.25 4.25 0 0 0 7 18Z',
  paper: 'M5 4h11l3 3v13H5z M8 9h8 M8 12h8 M8 15h5',
  monitor: 'M3 5h18v11H3z M9 20h6 M12 16v4',
  gamepad: 'M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6h-6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4Z M7 11v3 M5.5 12.5h3 M16 11.5h.01 M18 13.5h.01',
  keys: 'M3 6h18v12H3z M7 6v7 M11 6v7 M15 6v7 M5.5 13v5 M9 13v5 M13 13v5 M17 13v5',
  vinyl: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M12 7a5 5 0 0 0-5 5',
  box: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z M3 7.5 12 12l9-4.5 M12 12v9',
  frame: 'M4 4h16v16H4z M4 15l4.5-4.5L13 15l2.5-2.5L20 17 M15.5 8.5h.01',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8.5 20h7 M10 17h4',
  rocket: 'M12 3c3 2 5 5.5 5 9.5L15 16H9l-2-3.5C7 8.5 9 5 12 3Z M12 10.5h.01 M9 16l-2 4 3-1.5 M15 16l2 4-3-1.5',
  ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z M14 7v10',
  card: 'M3 6h18v12H3z M3 10h18 M6.5 14.5h4',
  power: 'M12 3v8 M7.05 6.05a7 7 0 1 0 9.9 0',
  question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7 M12 17h.01',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z',
  door: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17 M4 21h16 M14.5 12h.01',
  sound: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4z M15.5 9.5a3.5 3.5 0 0 1 0 5 M18 7a7 7 0 0 1 0 10',
  mute: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4z M16 10l4 4 M20 10l-4 4',
  back: 'M9 10 4 15l5 5 M4 15h10a6 6 0 0 0 0-12h-2',
  close: 'M6 6l12 12 M18 6 6 18',
  'arrow-left': 'M19 12H5 M11 6l-6 6 6 6',
  'arrow-right': 'M5 12h14 M13 6l6 6-6 6',
  'arrow-up-right': 'M7 17 17 7 M8 7h9v9',
  menu: 'M4 7h16 M4 12h16 M4 17h10',
  notebook: 'M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z M6 3v18 M9 3v18 M12 8h4 M12 11h4',
  check: 'M5 12.5 10 17l9-10',
  lock: 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  play: 'M7 5v14l12-7z',
  pause: 'M7 5h3.5v14H7z M13.5 5H17v14h-3.5z',
  download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  share: 'M12 15V4 M7 8l5-5 5 5 M5 13v7h14v-7',
  mail: 'M3 6h18v12H3z M3 7l9 6 9-6',
  map: 'M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z',
  /** @deprecated use 'heart' (kept so existing call sites compile; draws a heart) */
  sparkle: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z',
  eye: 'M2.5 12s3.4-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.4 6.2-9.5 6.2S2.5 12 2.5 12Z M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z',
  jelly: 'M12 3.5S5 10.6 5 14.6a7 7 0 0 0 14 0C19 10.6 12 3.5 12 3.5Z M9.6 14h.01 M14.4 14h.01 M10.6 16.6c.8.6 2 .6 2.8 0',
  file: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 15.5h6 M9 9h2',
  chat: 'M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z M8.5 10.5h.01 M12 10.5h.01 M15.5 10.5h.01',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3.5v4 M16 3.5v4 M8 14h3',
  cd: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 14.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z M16.5 7.5a6 6 0 0 1 1.5 2.5',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
};

export function Icon({ name, size = 20, stroke = 1.6, style, className }: { name: IconName; size?: number; stroke?: number; style?: CSSProperties; className?: string }) {
  const filled = name === 'play' || name === 'pause';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden
    >
      <path d={P[name]} />
    </svg>
  );
}

/** Adelia's mark: Moci, a clear jelly drop with a face, drawn with a crisp
 *  graphite line (same as the favicon). Clear acrylic body, a whisper of blue. */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="mark-jelly" x1="0.2" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#E4F1FB" />
          <stop offset="1" stopColor="#B9DCF5" />
        </linearGradient>
      </defs>
      <path d="M32 5.5S11.5 27.6 11.5 40.6a20.5 20.5 0 0 0 41 0C52.5 27.6 32 5.5 32 5.5Z" fill="url(#mark-jelly)" stroke="#161B26" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20.5 35c1.3-5.6 5.2-11 8-14" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="25" cy="42" r="2.9" fill="#161B26" />
      <circle cx="39" cy="42" r="2.9" fill="#161B26" />
      <ellipse cx="19.8" cy="48" rx="3.6" ry="2.3" fill="#FF7EB6" opacity="0.85" />
      <ellipse cx="44.2" cy="48" rx="3.6" ry="2.3" fill="#FF7EB6" opacity="0.85" />
      <path d="M29.2 47.4c1.7 1.5 3.9 1.5 5.6 0" stroke="#161B26" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
