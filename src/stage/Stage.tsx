/* ==========================================================================
   Stage — the single 2D room.
   • One photoreal plate in a "world" div that a camera pans and zooms.
   • Scroll / drag / swipe glide continuously along the room (scrollytelling).
   • Objects are discovered by hover: their own cut-out lifts and glows and a
     small label follows the cursor. No markers on the image.
   • Click → camera frames the object → director opens the panel.
   ========================================================================== */
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { sfx } from '@/audio/engine';
import { CHAPTERS } from '@/lib/content';
import { STATIONS, VIEWPOINTS, type StationId } from './stations';
import { FOCUS, HITS, PLATE, VIEW_BOXES, type Hit } from './plate';
import { OVERSCAN, clampCam, camDistance, easeInOut, fitBox, lerpCam, smooth, type Cam } from './camera';
import { focusFrame, layoutOf } from './frame';
import { back, onCameraArrive } from './director';
import { FocusLayer } from './FocusLayer';
import { HandheldScreen, LedBoard, MonitorScreen, MugSteam, PrinterTicket, RoomLights, TimeGrade, Vinyl, WallClock, WindowView } from './overlays/Live';
import { TankLive } from '@/features/sea/TankLive';
import { IdCardLive } from '@/features/about/IdCardLive';
import './stage.css';

// the earned stickers on the gingham board carry the sticker art: keep it out of the first load
const LazyBoardStickers = lazy(() => import('@/features/pass/BoardStickers').then((m) => ({ default: m.BoardStickers })));
function BoardStickers(p: { ox: number; oy: number }) {
  return (
    <Suspense fallback={null}>
      <LazyBoardStickers {...p} />
    </Suspense>
  );
}

/* shared, non-reactive story position (0 … VIEWPOINTS.length-1) */
export const story: { pos: number; vel: number; anchor: number; hudView: number; dragging: boolean; lastInput: number; tw: { from: number; to: number; t0: number; dur: number } | null } = {
  pos: 0,
  vel: 0,
  anchor: 0,
  hudView: 0,
  dragging: false,
  lastInput: 0,
  tw: null,
};

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

/**
 * Where the visitor is looking, 0…1 across the screen. On desktop it follows
 * the cursor: point left and the camera turns to the shelf, point right and it
 * turns to the window. Touch keeps it centred (swipes walk instead).
 */
export const look = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
/** cursor → look target; the outer 6% of the screen is "all the way" */
const toLook = (u: number) => Math.max(0, Math.min(1, (u - 0.06) / 0.88));

/** Camera for one story stop, turned toward where the visitor is looking. */
function stopCam(i: number, vw: number, vh: number): Cam {
  const c = fitBox(VIEW_BOXES[i], vw, vh, undefined, i === 0 ? 0 : 0.08);
  const hw = vw / (2 * c.s);
  const hh = vh / (2 * c.s);
  // the overview is a panorama: the cursor sweeps the whole room
  if (i === 0) return clampCam({ s: c.s, x: hw + (PLATE.w - 2 * hw) * look.x, y: hh + (PLATE.h - 2 * hh) * look.y }, vw, vh);
  // inside a chapter you can peek a little way around it
  return clampCam({ s: c.s, x: c.x + (look.x - 0.5) * 0.32 * 2 * hw, y: c.y + (look.y - 0.5) * 0.12 * 2 * hh }, vw, vh);
}

function storyCam(pos: number, vw: number, vh: number): Cam {
  const i = Math.max(0, Math.min(VIEW_BOXES.length - 1, pos));
  const a = Math.floor(i);
  const b = Math.min(VIEW_BOXES.length - 1, a + 1);
  const ca = stopCam(a, vw, vh);
  if (a === b) return ca;
  return lerpCam(ca, stopCam(b, vw, vh), smooth(i - a));
}

/** Which chapter a point of the room belongs to (1…5): nearest chapter centre. */
function chapterAt(px: number) {
  let best = 1;
  let d = Infinity;
  for (let i = 1; i < VIEW_BOXES.length; i++) {
    const c = VIEW_BOXES[i].x + VIEW_BOXES[i].w / 2;
    if (Math.abs(px - c) < d) {
      d = Math.abs(px - c);
      best = i;
    }
  }
  return best;
}

/** The world's current screen transform (for turning a click into a room point). */
const screen = { tx: 0, ty: 0, k: 1 };

export default function Stage() {
  const { w: vw, h: vh } = useViewport();
  const world = useRef<HTMLDivElement>(null);
  const cam = useRef<Cam>(clampCam({ x: PLATE.w / 2, y: PLATE.h * 0.55, s: 0 }, vw, vh));
  const tween = useRef<{ from: Cam; start: number; dur: number; key: string } | null>(null);
  const keyRef = useRef('');
  const mouse = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const root = useRef<HTMLDivElement>(null);
  const refreshHint = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const phase = useUI((s) => s.phase);

  // preload the plate, report progress to the loader
  useEffect(() => {
    let cancelled = false;
    const big = new Image();
    big.decoding = 'async';
    big.src = PLATE.url(6336);
    const small = new Image();
    small.src = PLATE.url(1600);
    let p = 0.1;
    const tick = setInterval(() => {
      p = Math.min(0.9, p + 0.06);
      if (useUI.getState().phase === 'loading') useUI.getState().setProgress(Math.max(useUI.getState().progress, p));
    }, 120);
    big
      .decode()
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        clearInterval(tick);
        setReady(true);
        useUI.getState().setProgress(1);
      });
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, []);

  // input: wheel / drag / swipe → story glide; pointer → parallax
  useEffect(() => {
    const canGlide = () => {
      const s = useUI.getState();
      return s.phase === 'room' && !s.focus && !s.panel && !s.found && !s.menuOpen;
    };
    const onWheel = (e: WheelEvent) => {
      if (!canGlide()) return;
      if ((e.target as HTMLElement)?.closest?.('.panel, .menu, .stage-wrap')) return;
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      story.tw = null;
      story.vel += Math.sign(d) * Math.min(Math.abs(d), 120) * 0.0016;
      story.lastInput = performance.now();
    };
    let downX = 0;
    let lastX = 0;
    let lastT = 0;
    let active = false;
    const onDown = (e: PointerEvent) => {
      // on desktop the cursor already looks around; dragging is for touch
      if (e.pointerType === 'mouse') return;
      if (!canGlide() || (e.target as HTMLElement)?.closest?.('button, a, input, .panel, .hud > *')) return;
      active = true;
      downX = lastX = e.clientX;
      lastT = performance.now();
      story.dragging = false;
    };
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (e.pointerType !== 'touch') {
        look.tx = toLook(e.clientX / window.innerWidth);
        look.ty = toLook(e.clientY / window.innerHeight);
        walkHint(e);
      }
      if (!active) return;
      const dx = e.clientX - lastX;
      if (Math.abs(e.clientX - downX) > 8) story.dragging = true;
      if (story.dragging) {
        const now = performance.now();
        const k = 1 / (window.innerWidth * 0.55);
        story.pos = Math.max(-0.15, Math.min(VIEWPOINTS.length - 0.85, story.pos - dx * k));
        story.vel = (-dx * k) / Math.max(0.008, (now - lastT) / 1000) * 0.05;
        story.lastInput = now;
        lastT = now;
      }
      lastX = e.clientX;
    };
    const onUp = () => {
      active = false;
      setTimeout(() => (story.dragging = false), 0);
    };
    // empty room under the cursor: offer to walk to that part of the room
    let hint: number | undefined;
    const pointer = { x: 0, room: false };
    const zoneAt = (x: number) => {
      if (!canGlide()) return undefined;
      const z = chapterAt((x - screen.tx) / screen.k);
      return z === useUI.getState().view ? undefined : z;
    };
    const overRoom = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t?.closest?.('.stage') && !t.closest('.hit, .focus-layer');
    };
    // re-checked every frame too, because the room turns under a still cursor
    refreshHint.current = () => {
      const z = pointer.room && !useUI.getState().hovered ? zoneAt(pointer.x) : undefined;
      if (z === hint) return;
      hint = z;
      useUI.getState().setFlag('walkHint', z);
      root.current?.classList.toggle('is-walk', z != null);
    };
    const walkHint = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.room = overRoom(e);
      refreshHint.current();
    };
    const onClick = (e: MouseEvent) => {
      if (story.dragging || !overRoom(e)) return;
      // with a mouse, walk where the label says; a tap walks to the spot tapped
      const z = (e as PointerEvent).pointerType === 'mouse' ? hint : zoneAt(e.clientX);
      if (z == null) return;
      sfx('whoosh');
      useUI.getState().setView(z);
      refreshHint.current();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  // the camera loop
  useLayoutEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let lastTf = '';
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const s = useUI.getState();
      const W = window.innerWidth;
      const H = window.innerHeight;

      // --- story glide (only while free in the room)
      const N = VIEWPOINTS.length;
      const st = story;
      if ((s.phase === 'room' || s.phase === 'entering') && !s.focus) {
        if (s.view !== st.hudView) {
          // arrows / menu / logo changed the chapter → cinematic glide there
          st.hudView = s.view;
          st.tw = { from: st.pos, to: s.view, t0: now, dur: 900 + 380 * Math.abs(s.view - st.pos) };
          st.vel = 0;
        }
        if (st.tw && (st.dragging || Math.abs(st.vel) > 0.02)) st.tw = null; // user took over
        if (st.tw) {
          const k = Math.min(1, (now - st.tw.t0) / st.tw.dur);
          st.pos = st.tw.from + (st.tw.to - st.tw.from) * easeInOut(k);
          if (k >= 1) {
            st.anchor = st.tw.to;
            st.tw = null;
          }
        } else if (!st.dragging) {
          st.pos += st.vel * dt * 22;
          st.vel *= Math.pow(0.001, dt);
          if (now - st.lastInput > 260 && Math.abs(st.vel) < 0.01) {
            const d = st.pos - st.anchor;
            const target = Math.max(0, Math.min(N - 1, d > 0.12 ? Math.ceil(st.pos) : d < -0.12 ? Math.floor(st.pos) : Math.round(st.pos)));
            st.pos += (target - st.pos) * (1 - Math.pow(0.004, dt));
            if (Math.abs(target - st.pos) < 0.002) {
              st.pos = target;
              st.anchor = target;
            }
          }
        }
        st.pos = Math.max(-0.25, Math.min(N - 0.75, st.pos));
        const r = Math.round(Math.max(0, Math.min(N - 1, st.pos)));
        if (r !== st.hudView) {
          st.hudView = r;
          useUI.setState({ view: r });
        }
      }

      // --- look: ease toward the cursor while free in the room
      if (!s.focus) {
        const f = 1 - Math.pow(0.015, dt);
        look.x += (look.tx - look.x) * f;
        look.y += (look.ty - look.y) * f;
      }

      // --- target camera
      let target: Cam;
      let key: string;
      const entry = s.flags.entryCam as Cam | undefined;
      if (s.phase !== 'room' && s.phase !== 'entering') {
        target = entry ?? storyCam(0, W, H);
        key = 'pre';
      } else if (s.focus && FOCUS[s.focus]) {
        // fly straight to the final framing for the panel this object opens
        const layout = layoutOf(s.panel, s.pendingPanel, s.focus);
        const open = layout === 'stage' && !!s.panel;
        target = focusFrame(s.focus, layout, s.sheetSide, W, H, open).cam;
        key = `focus:${s.focus}:${layout}:${s.sheetSide}:${open ? 'in' : ''}`;
      } else {
        target = storyCam(story.pos, W, H);
        key = 'story';
      }

      // --- tween on discrete changes, smooth-follow for the story glide
      if (key !== keyRef.current) {
        const first = keyRef.current === '';
        keyRef.current = key;
        if (first || cam.current.s === 0) {
          cam.current = target;
          tween.current = null;
        } else {
          const dist = camDistance(cam.current, target);
          const dur = key === 'story' && s.phase === 'entering' ? 2.6 : Math.min(1.9, Math.max(0.9, 0.7 + dist / 1400));
          tween.current = { from: { ...cam.current }, start: now, dur: dur * 1000, key };
          useUI.getState().setCameraBusy(true);
        }
      }
      if (tween.current) {
        const k = Math.min(1, (now - tween.current.start) / tween.current.dur);
        cam.current = lerpCam(tween.current.from, target, easeInOut(k));
        if (k >= 1) {
          const done = tween.current.key;
          tween.current = null;
          useUI.getState().setCameraBusy(false);
          onCameraArrive(done.startsWith('focus:') ? 'focus' : s.phase === 'entering' ? 'enter' : 'story');
        }
      } else {
        const f = 1 - Math.pow(0.00002, dt);
        cam.current = lerpCam(cam.current, target, f);
      }

      // --- parallax (subtle drift with the pointer)
      const m = mouse.current;
      m.sx += (m.x - m.sx) * (1 - Math.pow(0.05, dt));
      m.sy += (m.y - m.sy) * (1 - Math.pow(0.05, dt));
      const amp = s.focus ? 4 : 6;
      const c = clampCam(cam.current, W, H);
      // slight overscan around the viewport centre so parallax never reveals an edge
      const k = c.s * OVERSCAN;
      const tx = W / 2 - c.x * k - m.sx * amp;
      const ty = H / 2 - c.y * k - m.sy * amp * 0.6;
      screen.tx = tx;
      screen.ty = ty;
      screen.k = k;
      refreshHint.current();
      const el = world.current;
      if (el) {
        const tf = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
        if (tf !== lastTf) {
          el.style.transform = tf;
          lastTf = tf;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // keep story in sync when entering the room
  useEffect(() => {
    if (phase === 'entering') {
      story.pos = story.anchor = story.hudView = 0;
      story.vel = 0;
      story.tw = null;
    }
  }, [phase]);

  return (
    <div ref={root} className={`stage ${ready ? 'is-ready' : ''} phase-${phase}`}>
      <div className="stage__world" ref={world} style={{ width: PLATE.w, height: PLATE.h }}>
        <img
          className="stage__plate"
          src={PLATE.url(6336)}
          srcSet={`${PLATE.url(1600)} 1600w, ${PLATE.url(2560)} 2560w, ${PLATE.url(3840)} 3840w, ${PLATE.url(6336)} 6336w`}
          sizes="6336px"
          width={PLATE.w}
          height={PLATE.h}
          alt="Adelia’s room in Bekasi: a chrome shelf of collectibles and a pink gacha machine, four posters, a pink retro computer on a long white desk with a printer, newspaper, mug, sticker binder, holo booster pack, synth, a cloud-shaped handheld, a heart phone and a jelly plush, a window with sheer pink curtains, an aquarium lamp, a record player and a big pink button."
          draggable={false}
        />
        <WindowView />
        <TimeGrade />
        <MugSteam />
        <PrinterTicket />
        <Hits />
        <RoomLights />
      </div>
      <FocusLayer onBack={back} />
      <HoverLabel />
    </div>
  );
}

/* ------------------------------------------------------------------ hits */
const LIVE_CHILD: Record<string, (p: { ox: number; oy: number }) => ReactElement | null> = {
  clock: WallClock,
  led: LedBoard,
  monitor: MonitorScreen,
  handheld: HandheldScreen,
  board: BoardStickers,
  turntable: Vinyl,
  aquarium: TankLive,
  lanyard: IdCardLive,
};

function Hits() {
  const hovered = useUI((s) => s.hovered);
  const hoverHit = useUI((s) => s.flags.hoverHit as string | undefined);
  const focus = useUI((s) => s.focus);
  const phase = useUI((s) => s.phase);
  const reveal = useUI((s) => !!s.flags.reveal);
  const stamps = useGame((s) => s.stamps);
  const shimmer = useShimmer();
  const interactive = phase === 'room';
  const sorted = [...HITS].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  return (
    <div className={`hits ${interactive ? 'is-live' : ''} ${reveal ? 'is-reveal' : ''}`}>
      {sorted.map((h) => {
        const Live = LIVE_CHILD[h.id];
        const isHover = interactive && hovered === h.station && (hoverHit === h.id || STATIONS[h.station] && hoverHit == null);
        const isFocus = focus === h.station;
        return (
          <HitEl
            key={h.id}
            hit={h}
            hover={isHover && !isFocus}
            focus={isFocus}
            shimmer={shimmer === h.id && !stamps[h.station]}
          >
            {Live ? <Live ox={h.x} oy={h.y} /> : null}
          </HitEl>
        );
      })}
    </div>
  );
}

function HitEl({ hit, hover, focus, shimmer, children }: { hit: Hit; hover: boolean; focus: boolean; shimmer: boolean; children: ReactNode }) {
  const st = STATIONS[hit.station];
  const imgStyle: CSSProperties =
    hit.kind === 'cut'
      ? { backgroundImage: `url(/assets/room/cut/${hit.id}.webp)`, backgroundSize: '100% 100%' }
      : { backgroundImage: `url(${PLATE.url(6336)})`, backgroundSize: `${PLATE.w}px ${PLATE.h}px`, backgroundPosition: `${-hit.x}px ${-hit.y}px` };
  const maskStyle: CSSProperties =
    hit.kind === 'cut' ? { WebkitMaskImage: `url(/assets/room/cut/${hit.id}.webp)`, maskImage: `url(/assets/room/cut/${hit.id}.webp)`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' } : {};
  return (
    <div
      className={`hit hit--${hit.kind} hit--${hit.id} ${hover ? 'is-hover' : ''} ${focus ? 'is-focus' : ''} ${shimmer ? 'is-shimmer' : ''}`}
      style={{ left: hit.x, top: hit.y, width: hit.w, height: hit.h, zIndex: 10 + (hit.z ?? 0) }}
      data-station={hit.station}
      onPointerEnter={(e) => {
        const s = useUI.getState();
        if (s.phase !== 'room' || s.focus === hit.station || e.pointerType === 'touch') return;
        s.setHovered(hit.station);
        s.setFlag('hoverHit', hit.id);
        sfx('hover');
      }}
      onPointerLeave={() => {
        const s = useUI.getState();
        if (s.flags.hoverHit === hit.id) {
          s.setHovered(null);
          s.setFlag('hoverHit', undefined);
        }
      }}
      onClick={(e) => {
        const s = useUI.getState();
        if (s.phase !== 'room' || story.dragging) return;
        e.stopPropagation();
        if (s.focus === hit.station && s.panel) return;
        s.setHovered(null);
        s.setFlag('hoverHit', undefined);
        sfx('click');
        s.setPendingProps(hit.props ?? {});
        s.focusStation(hit.station);
      }}
      role="button"
      tabIndex={-1}
      aria-label={`${hit.label ?? st.name}: ${st.verb}`}
    >
      <div className="hit__lift">
        {hit.id !== 'window' && <div className="hit__img" style={imgStyle} />}
        {children}
        <div className="hit__sheen" style={maskStyle} />
      </div>
    </div>
  );
}

/** Every few seconds, a soft light sweeps across one unvisited object — a hint, not a marker. */
function useShimmer() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => {
      const s = useUI.getState();
      if (s.phase !== 'room' || s.focus || s.panel || s.hovered) return setId(null);
      const stamps = useGame.getState().stamps;
      const vp = VIEWPOINTS[s.view];
      const pool = HITS.filter((h) => !stamps[h.station] && h.id !== 'window' && (vp.id === 'overview' || vp.stations.includes(h.station)));
      if (!pool.length) return setId(null);
      setId(pool[Math.floor(Math.random() * pool.length)].id);
      setTimeout(() => setId(null), 1600);
    }, 5200);
    return () => clearInterval(t);
  }, []);
  return id;
}

/* ------------------------------------------------------------------ cursor label */
function HoverLabel() {
  const walk = useUI((s) => s.flags.walkHint as number | undefined);
  const hovered = useUI((s) => s.hovered);
  const hoverHit = useUI((s) => s.flags.hoverHit as string | undefined);
  const stamps = useGame((s) => s.stamps);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = (e: PointerEvent) => {
      if (!el.current) return;
      const x = Math.min(window.innerWidth - 20, e.clientX + 18);
      const y = e.clientY + 22;
      el.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    window.addEventListener('pointermove', on);
    return () => window.removeEventListener('pointermove', on);
  }, []);
  const hit = HITS.find((h) => h.id === hoverHit);
  const st = hovered ? STATIONS[hovered as StationId] : null;
  const chapter = !st && walk != null ? CHAPTERS.find((c) => c.id === VIEWPOINTS[walk]?.id) : undefined;
  return (
    <div ref={el} className={`hover-label ${st || chapter ? 'is-on' : ''} ${chapter ? 'hover-label--walk' : ''}`} aria-hidden>
      {chapter && (
        <>
          <span className="hover-label__code">{chapter.roman}</span>
          <span className="hover-label__text">
            <b>{chapter.title}</b>
            <small>Click to walk over</small>
          </span>
        </>
      )}
      {st && (
        <>
          <span className="hover-label__code">{stamps[st.id] ? '✓' : st.code}</span>
          <span className="hover-label__text">
            <b>{hit?.label ?? st.name}</b>
            <small>{st.verb}</small>
          </span>
        </>
      )}
    </div>
  );
}
