/* 9×9 dot-matrix weather glyphs for the LCD station.
   '#' = ink (currentColor) · 'o' = accent (sun, lightning: --dot-accent, pink by default) · '+' = rain (--dot-rain, baby blue) */
import type { ReactNode } from 'react';
import type { WeatherKind } from '@/lib/weather';

export type Glyph = 'sun' | 'moon' | 'partly' | 'partly-night' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'storm' | 'snow';

const G: Record<Glyph, string[]> = {
  sun: ['....o....', '.o.....o.', '...ooo...', '..ooooo..', 'o.ooooo.o', '..ooooo..', '...ooo...', '.o.....o.', '....o....'],
  moon: ['...###...', '..##.....', '.##......', '.##......', '.##......', '.##.....#', '..##...##', '...####..', '.........'],
  partly: ['.....o..o', '...o.ooo.', '....ooooo', '..##ooooo', '.####ooo.', '#######..', '########.', '.#######.', '.........'],
  'partly-night': ['.....##..', '....##...', '....#....', '..###....', '.#####.#.', '#######..', '########.', '.#######.', '.........'],
  cloud: ['.........', '.........', '...###...', '..#####..', '.#######.', '#########', '#########', '.#######.', '.........'],
  fog: ['.........', '#######..', '.........', '..#######', '.........', '#######..', '.........', '..#######', '.........'],
  drizzle: ['...###...', '..#####..', '.#######.', '#########', '.#######.', '.........', '..+...+..', '.....+...', '.........'],
  rain: ['...###...', '..#####..', '.#######.', '#########', '.#######.', '.........', '.+..+..+.', '+..+..+..', '.........'],
  storm: ['...###...', '..#####..', '.#######.', '#########', '.###o###.', '...oo....', '....oo...', '....o....', '...o.....'],
  snow: ['...#.#...', '....#....', '...#.#...', '#.#...#.#', '.#.....#.', '#.#...#.#', '...#.#...', '....#....', '...#.#...'],
};

export function glyphFor(code: number, isDay = true): Glyph {
  if (code === 0) return isDay ? 'sun' : 'moon';
  if (code <= 2) return isDay ? 'partly' : 'partly-night';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloud';
}

export function glyphForKind(kind: WeatherKind, isDay = true): Glyph {
  if (kind === 'clear') return isDay ? 'sun' : 'moon';
  if (kind === 'cloudy') return 'cloud';
  return kind;
}

export function DotIcon({ glyph, size = 24, ghost = false, className = '' }: { glyph: Glyph; size?: number; ghost?: boolean; className?: string }) {
  const rows = G[glyph];
  const dots: ReactNode[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') {
        if (ghost) dots.push(<circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.3} fill="currentColor" opacity={0.1} />);
        return;
      }
      const fill = ch === 'o' ? 'var(--dot-accent, var(--accent))' : ch === '+' ? 'var(--dot-rain, var(--primary))' : 'currentColor';
      dots.push(<circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.38} style={{ fill }} />);
    }),
  );
  return (
    <svg className={`wx-dot ${className}`} width={size} height={size} viewBox="0 0 9 9" aria-hidden="true">
      {dots}
    </svg>
  );
}
