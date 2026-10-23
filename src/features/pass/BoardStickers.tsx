/* ==========================================================================
   The gingham board, live: every sticker you've earned is stuck on the felt
   (plate coordinates, LIVE.felt in src/stage/plate.ts). A sticker earned
   while you were somewhere else waits until the board is in view, then
   lands with a small slap (a fade under reduced motion). Mounted by the
   stage inside the board's hit box: <BoardStickers ox={hit.x} oy={hit.y} />.
   Bitmaps come from the sticker rasteriser, so the room never repaints an
   SVG filter while the camera moves.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { ACHIEVEMENTS, type AchievementId } from '@/state/achievements';
import { LIVE } from '@/stage/plate';
import { sfx } from '@/audio/engine';
import { stickerURL } from './Sticker';
import { artOf } from './stickers';
import { hash32, reducedMotion } from './lib';
import './board.css';

const COLS = 6;
const ROWS = 4;
const SIZE = 104; // plate px
const RASTER = 224; // bitmap px (sharp at the board's close-up on a 2x screen)
const BLEED = 1.14; // the bitmap bleeds 7% past the sticker box (see Sticker.tsx)

/** A scattered but stable spot on the felt for each sticker. */
function useSpots() {
  return useMemo(() => {
    const { w, h } = LIVE.felt;
    const cw = w / COLS;
    const ch = h / ROWS;
    // seeded shuffle of the 24 cells so neighbours in the book don't line up on the board
    const cells = Array.from({ length: COLS * ROWS }, (_, i) => i);
    let seed = 0x5eed;
    for (let i = cells.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      const j = seed % (i + 1);
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const spots = {} as Record<AchievementId, { x: number; y: number; r: number }>;
    ACHIEVEMENTS.forEach((a, i) => {
      const c = cells[i % cells.length];
      const hsh = hash32(a.id);
      const jx = ((hsh % 1000) / 1000 - 0.5) * (cw - SIZE) * 0.9;
      const jy = ((((hsh >>> 10) % 1000) / 1000) - 0.5) * (ch - SIZE) * 0.9;
      const r = ((((hsh >>> 20) % 1000) / 1000) - 0.5) * 26;
      spots[a.id] = { x: (c % COLS) * cw + cw / 2 + jx, y: Math.floor(c / COLS) * ch + ch / 2 + jy, r };
    });
    return spots;
  }, []);
}

function BoardSticker({ id, spot, landing, delay }: { id: AchievementId; spot: { x: number; y: number; r: number }; landing: boolean; delay: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    stickerURL(artOf(id), 'holo', RASTER).then((u) => alive && setUrl(u), () => {});
    return () => {
      alive = false;
    };
  }, [id]);
  if (!url) return null;
  const box = SIZE * BLEED;
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className={`bs-stk ${landing ? 'is-landing' : ''}`}
      style={{ left: spot.x - box / 2, top: spot.y - box / 2, width: box, height: box, '--r': `${spot.r.toFixed(1)}deg`, '--delay': `${delay}ms` } as CSSProperties}
    />
  );
}

export function BoardStickers({ ox, oy }: { ox: number; oy: number }) {
  const { x, y, w, h } = LIVE.felt;
  const got = useGame((s) => s.achievements);
  const seenAt = useGame((s) => s.boardSeenAt);
  const focus = useUI((s) => s.focus);
  const panel = useUI((s) => s.panel);
  const phase = useUI((s) => s.phase);
  const spots = useSpots();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  /** ids slapping right now (they stay "landing" until the animation ends) */
  const [landing, setLanding] = useState<AchievementId[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setInView(true);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting && e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const mine = ACHIEVEMENTS.filter((a) => got[a.id]);
  const waiting = mine.filter((a) => got[a.id]! > seenAt && !landing.includes(a.id));
  // the board is "seen" when it's on screen and the room isn't blurred behind some other panel
  const watching = phase === 'room' && inView && (focus === 'badges' || (!focus && !panel));

  const flight = useRef<number[]>([]);
  useEffect(() => () => flight.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!watching || !waiting.length || flight.current.length) return;
    const ids = waiting.map((a) => a.id);
    const latest = Math.max(...waiting.map((a) => got[a.id]!));
    const calm = reducedMotion();
    const step = calm ? 0 : 380;
    const t = flight.current;
    // a beat after the camera settles, then one slap per sticker
    t.push(window.setTimeout(() => setLanding((l) => [...l, ...ids]), calm ? 0 : 450));
    if (!calm) ids.forEach((_, i) => t.push(window.setTimeout(() => sfx('pop', { pitch: i % 3 }), 450 + i * step + 260)));
    t.push(
      window.setTimeout(() => {
        flight.current = [];
        useGame.getState().markBoardSeen(latest);
        setLanding((l) => l.filter((x) => !ids.includes(x)));
      }, 450 + ids.length * step + 1100),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watching, waiting.map((a) => a.id).join()]);

  return (
    <div ref={ref} className="bs" style={{ position: 'absolute', left: x - ox, top: y - oy, width: w, height: h }} aria-hidden>
      {mine.map((a) => {
        const fresh = got[a.id]! > seenAt;
        const i = landing.indexOf(a.id);
        if (fresh && i < 0) return null; // waits off the board until you look at it
        return <BoardSticker key={a.id} id={a.id} spot={spots[a.id]} landing={i >= 0} delay={i >= 0 ? i * 380 : 0} />;
      })}
    </div>
  );
}

export default BoardStickers;
