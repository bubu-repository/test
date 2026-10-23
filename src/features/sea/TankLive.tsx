/* ==========================================================================
   The live tank: 3–6 of the newest guestbook creatures swimming inside the
   cube aquarium lamp on the nightstand (LIVE.tank, plate px). Mounted by
   the stage on hit 'aquarium' (box origin = ox, oy).
   Cheap on purpose: a handful of small SVGs moved by CSS transform
   animations (compositor only, no JS per frame), paused while the tab is
   hidden or the Aquarium close-up covers the room, and still under
   prefers-reduced-motion or the light graphics setting. A creature you
   release in the close-up joins the tank straight away (shared store).
   ========================================================================== */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { LIVE } from '@/stage/plate';
import { useUI } from '@/state/ui';
import { Creature, SPECIES_SCALE } from './Creature';
import { SIZE_SCALE, rand, useSea, type SeaNote } from './sea';
import './tank-live.css';

/** How many swim in the room's tank. */
const IN_TANK = 5;
/** Look for new creatures this often while the tab is visible (one small GET). */
const REFRESH_MS = 5 * 60_000;

function useHidden() {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return hidden;
}

export function TankLive({ ox, oy }: { ox: number; oy: number }) {
  const { x, y, w, h } = LIVE.tank;
  const notes = useSea((s) => s.notes);
  const mine = useSea((s) => s.mine);
  const covered = useUI((s) => s.panel === 'sea');
  const light = useUI((s) => s.quality === 'low');
  const hidden = useHidden();

  useEffect(() => {
    // after the room has loaded, not competing with it
    const first = window.setTimeout(() => {
      const { notes: have, load } = useSea.getState();
      if (!have) void load();
    }, 1500);
    const t = window.setInterval(() => {
      if (!document.hidden && !useUI.getState().panel) void useSea.getState().load();
    }, REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);

  const swimmers = useMemo(() => {
    const all = notes ?? [];
    // visitors first; the house examples only fill an empty tank
    const visitors = all.filter((n) => !n.house);
    const pool = visitors.length >= 3 ? visitors : [...visitors, ...all.filter((n) => n.house)];
    let pick = pool.slice(0, IN_TANK);
    const yours = all.find((n) => mine.includes(n.id));
    if (yours && !pick.includes(yours)) pick = [yours, ...pick.slice(0, IN_TANK - 1)];
    return pick;
  }, [notes, mine]);

  if (!swimmers.length) return null;
  return (
    <div
      className="tank-live"
      style={{ left: x - ox, top: y - oy, width: w, height: h }}
      data-paused={hidden || covered || undefined}
      data-still={light || undefined}
      aria-hidden="true"
    >
      {swimmers.map((n, i) => (
        <span key={n.id} className="tank-live__swim" data-species={n.species} data-mine={mine.includes(n.id) || undefined} style={lane(n, i, swimmers.length, w, h)}>
          <span className="tank-live__bob">
            <Creature species={n.species} color={n.color} seed={n.seed} face={n.face} />
          </span>
        </span>
      ))}
    </div>
  );
}

/** A lane per creature (spread top to bottom), a size, a speed and a phase from its id. */
function lane(n: SeaNote, i: number, count: number, w: number, h: number): CSSProperties {
  const r = (k: number) => rand(n.seed, k);
  const size = Math.round(48 * SPECIES_SCALE[n.species] * SIZE_SCALE[n.size] * (0.9 + r(19) * 0.2));
  const band = (h * 0.56) / count;
  const top = n.species === 'crab' ? h * 0.6 : 10 + i * band + r(3) * band * 0.5;
  const run = Math.max(0, w - size - 16);
  const slow = n.species === 'whale' || n.species === 'turtle' || n.species === 'jellyfish' ? 1.35 : 1;
  const dur = (16 + r(7) * 10) * slow;
  return {
    top,
    width: size,
    ['--run' as string]: `${run}px`,
    ['--x0' as string]: `${Math.round(8 + ((i + 0.5) / count) * run * 0.9)}px`,
    ['--dur' as string]: `${dur.toFixed(1)}s`,
    ['--delay' as string]: `${(-r(11) * dur).toFixed(1)}s`,
    ['--bob' as string]: `${(2.2 + r(15) * 1.4).toFixed(2)}s`,
  };
}
