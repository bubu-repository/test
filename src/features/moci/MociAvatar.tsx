/* ==========================================================================
   Moci — the clear jelly drop plush at the right end of Adelia's desk, as
   SVG. Ported from the old site's MociDropShape (SiteAvatar.tsx) and
   re-drawn to match the plush in the room: a soft drop with a small nub on
   top, colour pooled low, a white rim, light from the window on the right,
   two dark eyes and a pink blush. Never a sparkle: Moci is a jelly drop.

   Reuse it anywhere:
     <MociAvatar size={40} mood="think" />          a standalone picture
     <svg viewBox="0 0 100 100"><MociDropShape /></svg>   inside your own SVG
   ========================================================================== */
import { useId } from 'react';
import './moci-avatar.css';

export type MociMood = 'happy' | 'think' | 'oops';

/** Moci's outline in a 100 × 100 box: round where the jelly pools, a little nub on top. */
export const MOCI_DROP = 'M50 8C46.5 8 45 11.5 44.6 16.5C28 24 10 42 10 64C10 82 28 92 50 92C72 92 90 82 90 64C90 42 72 24 55.4 16.5C55 11.5 53.5 8 50 8Z';

/**
 * Moci as SVG content in a 100 × 100 box. `face={false}` for sizes where a face would turn to
 * mush (under ~18px). Moods: happy (smile), think (looks up, small "o"), oops (wobbly mouth and a
 * drop of sweat).
 */
export function MociDropShape({ mood = 'happy', face = true }: { mood?: MociMood; face?: boolean }) {
  const id = useId().replace(/:/g, '');
  const body = `${id}-body`;
  const haze = `${id}-haze`;
  const eyeDx = mood === 'think' ? 1.6 : 0;
  const eyeDy = mood === 'think' ? -1.8 : 0;
  return (
    <>
      <defs>
        <radialGradient id={body} cx="50%" cy="80%" r="74%">
          <stop offset="0" stopColor="#7CC0EA" stopOpacity=".8" />
          <stop offset=".52" stopColor="#D2EAF8" stopOpacity=".74" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".92" />
        </radialGradient>
        <linearGradient id={haze} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".75" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={MOCI_DROP} fill={`url(#${body})`} stroke="#FFFFFF" strokeOpacity=".95" strokeWidth="2.4" />
      <path d={MOCI_DROP} fill={`url(#${haze})`} />
      {/* light pooled at the base, and the window's reflection on the right shoulder */}
      <ellipse cx="50" cy="85" rx="24" ry="4.2" fill="#3F93D6" opacity=".18" />
      <ellipse cx="66" cy="38" rx="8" ry="4.2" transform="rotate(-40 66 38)" fill="#FFFFFF" opacity=".92" />
      <circle cx="71.5" cy="30" r="2.2" fill="#FFFFFF" />
      <path d="M22 70c1.5 6 6 10.5 12 12.5" fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
      {face && (
        <g className="moci-face">
          <ellipse cx="28.5" cy="70" rx="6.2" ry="3.5" fill="#FF8FB8" opacity=".62" />
          <ellipse cx="71.5" cy="70" rx="6.2" ry="3.5" fill="#FF8FB8" opacity=".62" />
          <g className="moci-eyes">
            <circle cx="37" cy="61.5" r={mood === 'oops' ? 3.8 : 4.4} fill="#14233A" />
            <circle cx="63" cy="61.5" r={mood === 'oops' ? 3.8 : 4.4} fill="#14233A" />
            <circle cx={38.4 + eyeDx} cy={59.8 + eyeDy} r="1.45" fill="#FFFFFF" />
            <circle cx={64.4 + eyeDx} cy={59.8 + eyeDy} r="1.45" fill="#FFFFFF" />
          </g>
          {mood === 'happy' && <path d="M45 67.5q5 4.6 10 0" fill="none" stroke="#14233A" strokeWidth="2.4" strokeLinecap="round" />}
          {mood === 'think' && <circle cx="50" cy="69" r="2.3" fill="none" stroke="#14233A" strokeWidth="2.1" />}
          {mood === 'oops' && (
            <>
              <path d="M44.5 69.5q2.75-2.4 5.5 0t5.5 0" fill="none" stroke="#14233A" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M80 44c-2.6 3.4-3.9 5.6-3.9 7.2a3.9 3.9 0 0 0 7.8 0c0-1.6-1.3-3.8-3.9-7.2Z" fill="#BFE3FA" stroke="#FFFFFF" strokeWidth="1.2" />
            </>
          )}
        </g>
      )}
    </>
  );
}

interface MociAvatarProps {
  size?: number;
  mood?: MociMood;
  className?: string;
  /** a soft shadow under the plush (for Moci standing on something) */
  shadow?: boolean;
  /** blink now and then (stays still under prefers-reduced-motion) */
  blink?: boolean;
  /** give it an accessible name; otherwise it's decorative */
  title?: string;
}

/** Moci as a standalone picture. Wobbles while it thinks (unless reduced motion is on). */
export function MociAvatar({ size = 48, mood = 'happy', className = '', shadow = false, blink = false, title }: MociAvatarProps) {
  return (
    <svg
      viewBox={shadow ? '0 0 100 104' : '0 0 100 100'}
      width={size}
      height={shadow ? size * 1.04 : size}
      focusable="false"
      className={`moci-avatar moci-avatar--${mood} ${blink ? 'moci-avatar--blink' : ''} ${className}`}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      {shadow && <ellipse cx="50" cy="96.5" rx="31" ry="3.6" fill="#18263A" opacity=".12" />}
      <g className="moci-avatar__body">
        <MociDropShape mood={mood} face={size >= 18} />
      </g>
    </svg>
  );
}

export default MociAvatar;
