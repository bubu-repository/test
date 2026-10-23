/* ==========================================================================
   RM-11 · The Studio — the white-and-pink instant camera on the floating
   shelf, brought up close. Words or a photo → one of 15 materials → one of
   5 layouts → stickers, words and pen → saved as a PNG or a GIF. Each new
   print ejects from the camera's slot and develops.
   Everything is drawn in this tab: materials, photo filters and GIF
   encoding run in a worker (renderer.ts), lettering and layouts on the
   page; photos and camera frames never leave the device.
   ========================================================================== */
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { sfx } from '@/audio/engine';
import { game } from '@/state/game';
import { toast } from '@/state/toasts';
import { ACHIEVEMENT_MAP, type AchievementId } from '@/state/achievements';
import { track } from '@/lib/api';
import { STICKERS, drawDecor, stampText, stickerSrc, type Decor, type Stroke } from './decor';
import { FONTS, domFont, fontById, loadFont, loadLayoutFonts } from './fonts';
import { BACKDROPS, LAYOUTS, compose, photoAspect, takes, type Art, type BackdropId, type LayoutId } from './layouts';
import { renderLettering } from './lettering';
import { MATERIALS } from './materials/info';
import type { ArtRecipe, MaterialChoice } from './pipeline';
import { Superseded, cancel, renderArt, renderGif, renderThumb } from './renderer';
import { FILTERS, canvas, cover, loadImage, plain, renderPhoto, type FilterId } from './source';
import { CameraFront, Group, LayoutGlyph, LockGlyph, Seg, ShotThumb } from './parts';
import './studio.css';

type Mode = 'words' | 'photo';
type Step = 'start' | 'material' | 'layout' | 'decorate' | 'save';
/** A photo: the still (at most 1600 px), and a short burst of small frames for a boomerang. */
type Shot = { still: HTMLCanvasElement; burst: HTMLCanvasElement[] };

type Config = {
  mode: Mode;
  text: string;
  font: string;
  wobble: number;
  seed: number;
  shots: Shot[];
  filter: FilterId;
  material: MaterialChoice;
  color: string;
  layout: LayoutId;
  backdrop: BackdropId;
  caption: string;
  idColor: 'red' | 'blue';
};

const STEPS: { id: Step; name: string }[] = [
  { id: 'start', name: 'Start' },
  { id: 'material', name: 'Material' },
  { id: 'layout', name: 'Layout' },
  { id: 'decorate', name: 'Decorate' },
  { id: 'save', name: 'Save' },
];

/** Material colours: the room's pastels plus a few brights (the materials can be as colourful as they are). */
const COLORS: { hex: string; name: string }[] = [
  { hex: '#FF7EB6', name: 'Pink' },
  { hex: '#FFD6E8', name: 'Blush' },
  { hex: '#5AA9E6', name: 'Baby blue' },
  { hex: '#A9D6F5', name: 'Sky' },
  { hex: '#22CDB0', name: 'Mint' },
  { hex: '#C9B8FF', name: 'Lilac' },
  { hex: '#FFBE1F', name: 'Sunshine' },
  { hex: '#C8F560', name: 'Lime' },
  { hex: '#18263A', name: 'Navy' },
  { hex: '#FFFFFF', name: 'White' },
];
const PEN: { hex: string; name: string }[] = [
  { hex: '#FF7EB6', name: 'Pink' },
  { hex: '#1A8FE8', name: 'Blue' },
  { hex: '#FFBE1F', name: 'Yellow' },
  { hex: '#22CDB0', name: 'Mint' },
  { hex: '#18263A', name: 'Navy' },
  { hex: '#FFFFFF', name: 'White' },
];
/** The house light: up and to the right, where the room's window is. */
const LIGHT = { x: 0.5, y: 0.5 };
/** GIF frames are scaled to this on their longer side. */
const GIF_LONG = 640;

/** Live preview of a filter on the camera, close to what the CPU filter does to the still. */
const CSS_FILTER: Record<FilterId, string> = {
  natural: 'none',
  aqua: 'saturate(1.05) hue-rotate(-6deg) brightness(1.04)',
  pink: 'saturate(1.15) contrast(1.06) brightness(1.05) sepia(.08) hue-rotate(-12deg)',
  dreamy: 'brightness(1.08) contrast(.88) saturate(.95)',
  film: 'sepia(.18) contrast(.92) saturate(.85) brightness(1.03)',
  disposable: 'contrast(1.15) saturate(1.12) sepia(.12)',
  mono: 'grayscale(1) contrast(1.12)',
};

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Lets the page paint and answer input between pieces of work. */
const breathe = () =>
  new Promise<void>((resolve) => {
    const t = window.setTimeout(resolve, 60);
    requestAnimationFrame(() => {
      window.clearTimeout(t);
      window.setTimeout(resolve, 0);
    });
  });
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const materialName = (m: MaterialChoice, mode: Mode = 'words') => (m === 'none' ? (mode === 'words' ? 'Ink' : 'Just the photo') : (MATERIALS.find((x) => x.id === m)?.name ?? m));
const colorable = (m: MaterialChoice) => m === 'none' || (MATERIALS.find((x) => x.id === m)?.colorable ?? true);
const animated = (m: MaterialChoice) => m !== 'none' && (MATERIALS.find((x) => x.id === m)?.animated ?? false);
const layoutName = (l: LayoutId) => LAYOUTS.find((x) => x.id === l)?.name ?? l;
/** A boomerang: forwards, then backwards without repeating the ends. */
const boomerang = <T,>(frames: T[]): T[] => (frames.length < 3 ? frames : [...frames, ...frames.slice(1, -1).reverse()]);

/** A stable number for a photo, so its swatches are only redrawn when the photo changes. */
const shotIds = new WeakMap<HTMLCanvasElement, number>();
let shotSeq = 0;
const shotId = (c?: HTMLCanvasElement) => {
  if (!c) return 0;
  let id = shotIds.get(c);
  if (!id) shotIds.set(c, (id = ++shotSeq));
  return id;
};

/** The art for every frame of a layout. `phase` animates the material, `frame` picks a burst frame, `boil` re-wobbles the letters. */
async function buildArts(c: Config, o: { phase?: number; frame?: number; boil?: number }, key: string, priority: number, stale: () => boolean): Promise<Art[]> {
  const n = takes(c.layout);
  const font = fontById(c.font);
  if (c.mode === 'words') await loadFont(font, c.text || 'hello');
  const arts: Art[] = [];
  for (let i = 0; i < n; i++) {
    if (stale()) throw new Superseded();
    let src: HTMLCanvasElement;
    if (c.mode === 'words') {
      src = renderLettering({ text: c.text, font, ink: c.color, wobble: c.wobble, seed: c.seed + i * 101 + (o.boil ?? 0) * 17 });
    } else {
      const shot = c.shots[i % c.shots.length];
      const pic = o.frame !== undefined && shot.burst.length ? shot.burst[o.frame % shot.burst.length] : shot.still;
      src = cover(pic, photoAspect(c.layout), c.layout === 'strip' ? 720 : 900);
    }
    const recipe: ArtRecipe = {
      kind: c.mode === 'words' ? 'text' : 'photo',
      filter: c.mode === 'photo' ? c.filter : undefined,
      material: c.material,
      color: c.color,
      light: LIGHT,
      phase: o.phase ?? 0,
      seed: c.seed + i,
      sticker: c.layout === 'sticker',
    };
    arts.push(await renderArt(src, recipe, `${key}-${i}`, priority));
    if (n > 1) await breathe();
  }
  return arts;
}

function layoutOptions(c: Config, date: Date) {
  return {
    backdrop: c.backdrop,
    caption: c.caption.trim(),
    title: c.mode === 'words' ? c.text.trim() || 'Visitor' : c.caption.trim() || 'Visitor',
    material: materialName(c.material, c.mode),
    idColor: c.idColor,
    date,
    seed: c.seed,
  };
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image."))), 'image/png'));

/** A still from a video or image, at most `long` px on its longer side. */
function snap(src: HTMLVideoElement | HTMLImageElement, long: number, mirror: boolean): HTMLCanvasElement {
  const w = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth;
  const h = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight;
  const s = Math.min(1, long / Math.max(w, h));
  const out = canvas(w * s, h * s);
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  if (mirror) {
    ctx.translate(out.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

/* ---------- Hearts for the first print (once per device) ---------- */
const REWARD_KEY = 'adelia.studio.rewarded';
const rewardedHere = new Set<string>();
function rewardOnce(what: 'print' | 'gif'): boolean {
  let done: string[] = [];
  try {
    done = JSON.parse(localStorage.getItem(REWARD_KEY) || '[]') as string[];
  } catch {
    // Storage blocked: this visit's memory is enough.
  }
  if (done.includes(what) || rewardedHere.has(what)) return false;
  rewardedHere.add(what);
  try {
    localStorage.setItem(REWARD_KEY, JSON.stringify([...done, what]));
  } catch {
    // As above.
  }
  return true;
}
function reward(format: 'png' | 'gif' | 'share') {
  const g = game();
  if (rewardOnce('print')) g.addPoints(40, 'Your first print from the Studio');
  if (format === 'gif' && rewardOnce('gif')) g.addPoints(20, 'A print that moves');
  // The Maker sticker, once the sticker book has one.
  const maker = 'maker' as AchievementId;
  if (ACHIEVEMENT_MAP[maker]) g.unlock(maker);
}

export default function StudioPanel() {
  const uid = useId();
  const [step, setStep] = useState<Step>('start');
  const [cfg, setCfg] = useState<Config>({
    mode: 'words',
    text: 'sea you!',
    font: 'bagel',
    wobble: 0.55,
    seed: 7,
    shots: [],
    filter: 'natural',
    material: 'jelly',
    color: '#FF7EB6',
    layout: 'card',
    backdrop: 'sky',
    caption: '',
    idColor: 'blue',
  });
  const set = (patch: Partial<Config>) => setCfg((c) => ({ ...c, ...patch }));

  const [size, setSize] = useState<[number, number]>([1080, 1350]);
  const [busy, setBusy] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [printNo, setPrintNo] = useState(0);
  const display = useRef<HTMLCanvasElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLCanvasElement | null>(null);
  const token = useRef(0);
  /** What the last print was, to tell a new print (it slides out) from a touch-up (it just develops). */
  const lastSig = useRef('');
  const lastShots = useRef<Shot[] | null>(null);

  // Decoration.
  const [decor, setDecor] = useState<Decor[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [stamp, setStamp] = useState(false);
  const [tool, setTool] = useState<'move' | 'pen'>('move');
  const [penColor, setPenColor] = useState(PEN[0].hex);
  const [penWidth, setPenWidth] = useState(0.008);
  const [selected, setSelected] = useState<string | null>(null);
  const [words, setWords] = useState('');
  const piece = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLCanvasElement>(null);
  /** The sticker in your hand: moved by writing its style directly, committed to state when you let go. */
  const drag = useRef<{ id: string; dx: number; dy: number; el: HTMLElement; x: number; y: number } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const drawing = useRef<Stroke | null>(null);
  const serial = useRef(0);

  // Camera.
  const [camera, setCamera] = useState<'off' | 'starting' | 'on'>('off');
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(0);
  const [burstOn, setBurstOn] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const alive = useRef(true);

  // Material swatches (object URLs, revoked when replaced or when the Studio closes).
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const thumbsFor = useRef('');
  const thumbUrls = useRef(new Set<string>());

  useEffect(() => {
    alive.current = true;
    track('studio', { action: 'open' });
    const urls = thumbUrls.current;
    return () => {
      alive.current = false;
      cancel('thumb-');
      cancel('art-');
      stream.current?.getTracks().forEach((t) => t.stop());
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  /* ---------- The print: put it on the display canvas, then eject it ---------- */
  const paint = () => {
    const d = display.current;
    const b = base.current;
    if (!d || !b) return;
    if (d.width !== b.width || d.height !== b.height) {
      d.width = b.width;
      d.height = b.height;
    }
    const ctx = d.getContext('2d')!;
    ctx.clearRect(0, 0, d.width, d.height);
    ctx.drawImage(b, 0, 0);
  };

  const eject = (slide: boolean) => {
    const el = sheet.current;
    const cv = display.current;
    if (!el || !cv || typeof el.animate !== 'function') return;
    if (calm()) {
      cv.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      return;
    }
    if (slide) {
      sfx('print', { gain: 0.45 });
      el.animate([{ transform: 'translateY(calc(-100% - 28px))' }, { transform: 'translateY(0)' }], { duration: 860, easing: 'cubic-bezier(.25,.75,.2,1)' });
    }
    // Developing: milky and grey, then the colour comes up.
    cv.animate(
      [
        { filter: 'grayscale(1) brightness(1.32) contrast(.45)' },
        { filter: 'grayscale(.55) brightness(1.12) contrast(.78)', offset: 0.45 },
        { filter: 'grayscale(0) brightness(1) contrast(1)' },
      ],
      { duration: slide ? 1600 : 700, easing: 'ease-out' },
    );
  };

  /* ---------- Make the print whenever its recipe changes ---------- */
  useEffect(() => {
    // No photo yet: the tray shows the camera and file buttons instead.
    if (cfg.mode === 'photo' && !cfg.shots.length) return;
    const mine = ++token.current;
    const stale = () => mine !== token.current || !alive.current;
    const t = window.setTimeout(async () => {
      setBusy('Printing…');
      setFailed(false);
      try {
        const [arts] = await Promise.all([buildArts(cfg, {}, 'art', 0, stale), loadLayoutFonts()]);
        if (stale()) return;
        const out = compose(cfg.layout, arts, layoutOptions(cfg, new Date()));
        base.current = out;
        const sig = [cfg.layout, cfg.material, cfg.mode, cfg.filter, cfg.seed].join('|');
        const slide = sig !== lastSig.current || cfg.shots !== lastShots.current;
        lastSig.current = sig;
        lastShots.current = cfg.shots;
        setSize([out.width, out.height]);
        setPrintNo((n) => n + 1);
        setReady(true);
        // Painted after React has laid the piece out at its new shape.
        requestAnimationFrame(() => {
          if (stale()) return;
          paint();
          eject(slide);
        });
      } catch (e) {
        if (e instanceof Superseded || stale()) return;
        setFailed(true);
      } finally {
        if (mine === token.current) setBusy(null);
      }
    }, 180);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, retry]);

  /* ---------- The display canvas remounts when the camera closes: put the print back on it ---------- */
  useEffect(() => {
    if (camera === 'off') paint();
  }, [camera]);

  /* ---------- Swatches for the material picker, from the current words or photo (worker, low priority) ---------- */
  const shotForThumbs = cfg.shots[0]?.still;
  const thumbKey = `${cfg.mode}|${cfg.font}|${cfg.color}|${cfg.wobble}|${cfg.seed}|${cfg.mode === 'photo' ? shotId(shotForThumbs) : ''}`;
  useEffect(() => {
    if (step !== 'material' || thumbsFor.current === thumbKey) return;
    if (cfg.mode === 'photo' && !shotForThumbs) return;
    let live = true;
    cancel('thumb-');
    const t = window.setTimeout(async () => {
      const font = fontById(cfg.font);
      let src: HTMLCanvasElement;
      if (cfg.mode === 'photo') src = renderPhoto(cover(shotForThumbs!, 1, 150));
      else {
        await loadFont(font, 'Aa');
        src = renderLettering({ text: 'Aa', font, ink: cfg.color, wobble: cfg.wobble * 0.6, seed: cfg.seed, size: 96 });
      }
      if (!live) return;
      const ink0 = plain(src).toDataURL();
      setThumbs((prev) => ({ ...prev, none: ink0 }));
      for (const m of MATERIALS) {
        if (!live) return;
        try {
          const url = await renderThumb(
            src,
            { kind: cfg.mode === 'words' ? 'text' : 'photo', material: m.id, color: m.colorable ? cfg.color : m.defaultColor, light: LIGHT, phase: 0, seed: cfg.seed, sticker: false },
            `thumb-${m.id}`,
          );
          if (!live || !alive.current) {
            URL.revokeObjectURL(url);
            return;
          }
          thumbUrls.current.add(url);
          setThumbs((prev) => {
            const old = prev[m.id];
            if (old?.startsWith('blob:')) {
              URL.revokeObjectURL(old);
              thumbUrls.current.delete(old);
            }
            return { ...prev, [m.id]: url };
          });
        } catch {
          // Superseded, or a swatch that failed: the tile shows its name.
        }
      }
      if (live) thumbsFor.current = thumbKey;
    }, 350);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, thumbKey]);

  /* ---------- Pen strokes, redrawn on the overlay at screen resolution ---------- */
  useEffect(() => {
    const c = ink.current;
    const box = piece.current;
    if (!c || !box) return;
    const draw = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const s of strokes) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width * c.width;
        ctx.beginPath();
        s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * c.width, y * c.height) : ctx.moveTo(x * c.width, y * c.height)));
        ctx.stroke();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => ro.disconnect();
  }, [strokes, size, camera]);

  /* ---------- Camera ---------- */
  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera('off');
    setCount(0);
  };
  useEffect(() => {
    const v = video.current;
    if (camera !== 'on' || !v || !stream.current) return;
    v.srcObject = stream.current;
    void v.play().catch(() => {});
  }, [camera]);

  const startCamera = async () => {
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('This browser can’t use a camera here. Choose photos instead.');
      return;
    }
    setCamera('starting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      if (!alive.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      setCamera('on');
    } catch {
      setCamera('off');
      setCamError('The camera didn’t open (no permission, or no camera). You can choose photos instead.');
    }
  };

  const takeShots = async () => {
    const v = video.current;
    if (!v || count || camera !== 'on') return;
    const n = takes(cfg.layout);
    const shots: Shot[] = [];
    for (let i = 0; i < n; i++) {
      for (let k = 3; k > 0; k--) {
        setCount(k);
        sfx('tick');
        await wait(calm() ? 500 : 800);
        if (!alive.current || !stream.current) return;
      }
      setCount(0);
      const still = snap(v, 1600, true);
      sfx('click');
      setFlash((f) => f + 1);
      const burst: HTMLCanvasElement[] = [];
      if (burstOn) {
        for (let f = 0; f < 8; f++) {
          burst.push(snap(v, 480, true));
          await wait(90);
        }
      }
      shots.push({ still, burst });
      if (i < n - 1) await wait(500);
    }
    stopCamera();
    set({ shots, mode: 'photo' });
    track('studio', { action: 'photo', source: 'camera', count: shots.length });
  };

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const imgs = await Promise.all(Array.from(files).slice(0, 4).map(loadImage));
      const shots = imgs.map((img) => {
        const still = snap(img, 1600, false);
        URL.revokeObjectURL(img.src);
        return { still, burst: [] };
      });
      stopCamera();
      set({ shots, mode: 'photo' });
      track('studio', { action: 'photo', source: 'file', count: shots.length });
    } catch (e) {
      sfx('error');
      toast({ kind: 'info', title: 'Couldn’t open that photo', body: e instanceof Error ? e.message : 'Try another file.' });
    }
  };

  /* ---------- Decoration ---------- */
  const addSticker = (art: string) => {
    const id = `${art}-${++serial.current}`;
    const n = decor.length;
    setDecor((d) => [...d, { kind: 'sticker', id, art, x: 0.5 + ((n % 3) - 1) * 0.12, y: 0.5 + ((Math.floor(n / 3) % 3) - 1) * 0.1, size: 0.2, rot: ((n * 37) % 30) - 15 }]);
    setSelected(id);
    setFresh(id);
    setTool('move');
    sfx('pop');
  };
  const addWords = () => {
    const text = words.trim();
    if (!text) return;
    const id = `text-${++serial.current}`;
    setDecor((d) => [...d, { kind: 'text', id, text, color: penColor === '#FFFFFF' ? '#18263A' : penColor, x: 0.5, y: 0.82, size: 0.07, rot: -4 }]);
    setWords('');
    setSelected(id);
    setTool('move');
    sfx('pop');
  };
  const patch = (id: string, p: Partial<Decor>) => setDecor((d) => d.map((x) => (x.id === id ? ({ ...x, ...p } as Decor) : x)));
  const remove = (id: string) => {
    setDecor((d) => d.filter((x) => x.id !== id));
    setSelected(null);
  };
  const sel = decor.find((d) => d.id === selected) ?? null;

  const local = (e: { clientX: number; clientY: number }) => {
    const r = piece.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] as [number, number];
  };

  const onItemDown = (e: RPointerEvent<HTMLElement>, d: Decor) => {
    if (tool !== 'move') return;
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    el.dataset.dragging = '';
    const [x, y] = local(e);
    drag.current = { id: d.id, dx: x - d.x, dy: y - d.y, el, x: d.x, y: d.y };
    setSelected(d.id);
  };
  const onItemMove = (e: RPointerEvent<HTMLElement>) => {
    const g = drag.current;
    if (!g) return;
    const [x, y] = local(e);
    g.x = Math.min(1, Math.max(0, x - g.dx));
    g.y = Math.min(1, Math.max(0, y - g.dy));
    g.el.style.left = `${g.x * 100}%`;
    g.el.style.top = `${g.y * 100}%`;
  };
  const onItemDrop = () => {
    const g = drag.current;
    if (!g) return;
    drag.current = null;
    delete g.el.dataset.dragging;
    // Put down on top of the others (and drawn last in the saved image), where it was let go.
    setDecor((all) => {
      const it = all.find((v) => v.id === g.id);
      return it ? [...all.filter((v) => v.id !== g.id), { ...it, x: g.x, y: g.y } as Decor] : all;
    });
  };
  const onItemKey = (e: RKeyboardEvent<HTMLElement>, d: Decor) => {
    const by = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, Partial<Decor>> = {
      ArrowLeft: { x: Math.max(0, d.x - by) },
      ArrowRight: { x: Math.min(1, d.x + by) },
      ArrowUp: { y: Math.max(0, d.y - by) },
      ArrowDown: { y: Math.min(1, d.y + by) },
      '+': { size: Math.min(0.6, d.size * 1.1) },
      '=': { size: Math.min(0.6, d.size * 1.1) },
      '-': { size: Math.max(0.03, d.size / 1.1) },
      '[': { rot: d.rot - 5 },
      ']': { rot: d.rot + 5 },
    };
    if (moves[e.key]) {
      e.preventDefault();
      patch(d.id, moves[e.key]);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(d.id);
    }
  };

  const onPenDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'pen') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = { color: penColor, width: penWidth, points: [local(e)] };
    setStrokes((s) => [...s, drawing.current!]);
  };
  const onPenMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const s = drawing.current;
    if (!s) return;
    s.points.push(local(e));
    setStrokes((all) => [...all.slice(0, -1), { ...s, points: [...s.points] }]);
  };
  const onPenUp = () => {
    drawing.current = null;
  };

  /* ---------- Saving ---------- */
  const finished = async (frameBase: HTMLCanvasElement) => {
    const out = canvas(frameBase.width, frameBase.height);
    // CPU-backed, so encoding it never stalls the page on a GPU readback.
    out.getContext('2d', { willReadFrequently: true })!.drawImage(frameBase, 0, 0);
    await drawDecor(out, decor, strokes, stamp ? stampText() : null);
    return out;
  };

  const saved = (what: string, format: 'png' | 'gif') => {
    sfx('success');
    toast({ kind: 'info', title: `${what} saved`, body: 'It’s in your downloads. Nothing was uploaded.' });
    track('studio', { action: 'save', format, layout: cfg.layout, material: cfg.material, mode: cfg.mode, stickers: decor.length, pen: strokes.length > 0 });
    reward(format);
  };
  const couldNot = (what: string) => {
    sfx('error');
    toast({ kind: 'info', title: `Couldn’t save the ${what}`, body: what === 'GIF' ? 'This device ran short of memory for it. Try the PNG, or a smaller layout.' : 'Try again in a moment.' });
  };

  const savePng = async () => {
    if (!base.current) return;
    setBusy('Saving…');
    try {
      const out = await finished(base.current);
      download(await toBlob(out), `adelia-studio-${cfg.layout}.png`);
      saved('PNG', 'png');
    } catch {
      couldNot('PNG');
    } finally {
      setBusy(null);
    }
  };

  const hasBurst = cfg.mode === 'photo' && cfg.shots.some((s) => s.burst.length);
  const boils = cfg.mode === 'words' && cfg.wobble > 0.05;
  const moves = boils || hasBurst || animated(cfg.material);

  const saveGif = async () => {
    if (!base.current) return;
    const date = new Date();
    const n = !moves ? 1 : hasBurst ? 8 : 10;
    const frames: HTMLCanvasElement[] = [];
    try {
      for (let i = 0; i < n; i++) {
        setBusy(n > 1 ? `Drawing frame ${i + 1} of ${n}…` : 'Drawing…');
        const arts = await buildArts(cfg, { phase: i / n, frame: hasBurst ? i : undefined, boil: boils ? i % 3 : 0 }, `gif${i}`, 1, () => !alive.current);
        const full = await finished(compose(cfg.layout, arts, layoutOptions(cfg, date)));
        const s = Math.min(1, GIF_LONG / Math.max(full.width, full.height));
        const small = canvas(full.width * s, full.height * s);
        const sctx = small.getContext('2d', { willReadFrequently: true })!;
        sctx.imageSmoothingQuality = 'high';
        sctx.drawImage(full, 0, 0, small.width, small.height);
        frames.push(small);
        await breathe();
      }
      setBusy('Encoding the GIF…');
      const { width: w, height: h } = frames[0];
      const blob = await renderGif(hasBurst ? boomerang(frames) : frames, w, h, hasBurst ? 80 : 110);
      if (!alive.current) return;
      download(blob, `adelia-studio-${cfg.layout}.gif`);
      saved(hasBurst ? 'Boomerang' : 'GIF', 'gif');
    } catch (e) {
      if (alive.current && !(e instanceof Superseded)) couldNot('GIF');
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator;
  const share = async () => {
    if (!base.current) return;
    const out = await finished(base.current);
    const file = new File([await toBlob(out)], `adelia-studio-${cfg.layout}.png`, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Made in the Studio at adelia.cc' });
        track('studio', { action: 'share', layout: cfg.layout, material: cfg.material });
        reward('share');
      } else {
        download(file, file.name);
        saved('PNG', 'png');
      }
    } catch {
      // Cancelled.
    }
  };

  const restart = () => {
    setDecor([]);
    setStrokes([]);
    setStamp(false);
    setSelected(null);
    stopCamera();
    set({ shots: [], caption: '', seed: (cfg.seed * 31 + 7) % 997 });
    setStep('start');
    sfx('paper');
  };

  /* ---------- UI ---------- */
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const goStep = (s: Step) => {
    setStep(s);
    sfx('tick');
  };
  const needPhoto = cfg.mode === 'photo' && !cfg.shots.length && camera === 'off';
  const canSave = ready && !(cfg.mode === 'photo' && !cfg.shots.length) && !failed;
  const ar = size[0] / size[1];
  const aspect = photoAspect(cfg.layout);

  // The shutter: a new take of the words, or the camera.
  const shutter =
    cfg.mode === 'words'
      ? { label: 'New take: shuffle the hand-made wobble and print again', caption: 'New take', onPress: () => set({ seed: (cfg.seed * 48271 + 11) % 9973 }) }
      : camera === 'on'
        ? { label: takes(cfg.layout) > 1 ? 'Take four photos' : 'Take the photo', caption: 'Snap', onPress: () => void takeShots(), disabled: count > 0 }
        : { label: cfg.shots.length ? 'Open the camera to retake' : 'Open the camera', caption: 'Camera', onPress: () => void startCamera(), disabled: camera === 'starting' };
  const frameOf = busy?.match(/frame (\d+) of (\d+)/);
  const status = busy
    ? frameOf
      ? `GIF ${frameOf[1]}/${frameOf[2]}`
      : busy.startsWith('Encoding')
        ? 'ENCODE'
        : busy.startsWith('Saving') || busy.startsWith('Drawing')
          ? 'SAVING'
          : 'PRINT'
    : camera === 'on'
      ? count
        ? `${count}`
        : 'LIVE'
      : camera === 'starting'
        ? 'WAKE'
        : needPhoto
          ? 'NO FILM'
          : failed
            ? 'RETRY'
            : 'READY';
  const detail = `${materialName(cfg.material, cfg.mode)} · ${layoutName(cfg.layout)}`;

  return (
    <Stage
      code="RM-11"
      kicker="Instant camera · words or a photo"
      title="The Studio"
      className="st-stage"
      bleed
      actions={
        <span className="chip st-privacy-chip">
          <LockGlyph /> On this device
        </span>
      }
    >
      <div className="st">
        {/* ---------- The camera, and the print coming out of it ---------- */}
        <div className="st-left">
          <CameraFront status={status} detail={detail} printNo={printNo} live={busy ? 'busy' : camera === 'on' ? 'live' : 'idle'} shutter={shutter} />
          <div className="st-tray" data-layout={cfg.layout}>
            <span className="st-tray__grid" aria-hidden="true" />
            {camera !== 'off' ? (
              <div className="st-vf" style={{ '--ar': aspect } as CSSProperties}>
                <video ref={video} className="st-vf__video" playsInline muted style={{ filter: CSS_FILTER[cfg.filter] }} aria-label="Camera preview" />
                <span className="st-vf__frame" aria-hidden="true" />
                {count > 0 && (
                  <span className="st-vf__count t-dot" aria-live="assertive">
                    {count}
                  </span>
                )}
                {flash > 0 && <span key={flash} className="st-vf__flash" aria-hidden="true" />}
                {camera === 'starting' && <span className="st-vf__hint">Opening the camera…</span>}
              </div>
            ) : needPhoto ? (
              <div className="st-empty">
                <p className="st-empty__title">Take a photo, or choose up to four.</p>
                <p className="st-empty__note">They stay on this device.</p>
                <div className="st-row st-row--center">
                  <button type="button" className="btn btn--primary" onClick={() => void startCamera()}>
                    Take a photo
                  </button>
                  <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
                    Choose photos
                  </button>
                </div>
                {camError && (
                  <p className="st-error" role="alert">
                    {camError}
                  </p>
                )}
              </div>
            ) : (
              <div ref={sheet} className="st-sheet" data-ready={ready || undefined} style={{ '--ar': ar } as CSSProperties}>
                <div ref={piece} className="st-piece" data-layout={cfg.layout} style={{ aspectRatio: `${size[0]} / ${size[1]}` }} onPointerDown={() => tool === 'move' && setSelected(null)}>
                  <canvas
                    ref={display}
                    className="st-piece__canvas"
                    role="img"
                    aria-label={`${materialName(cfg.material, cfg.mode)} ${cfg.mode === 'words' ? `lettering “${cfg.text}”` : 'photo'}, laid out as a ${layoutName(cfg.layout).toLowerCase()}`}
                  />
                  <span className="st-piece__gloss" aria-hidden="true" />
                  <canvas ref={ink} className="st-piece__ink" data-tool={tool} aria-hidden="true" onPointerDown={onPenDown} onPointerMove={onPenMove} onPointerUp={onPenUp} onPointerCancel={onPenUp} />
                  {decor.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className="st-item"
                      data-selected={d.id === selected || undefined}
                      data-tool={tool}
                      data-new={d.id === fresh || undefined}
                      aria-label={
                        d.kind === 'sticker'
                          ? `${STICKERS.find((s) => s.id === d.art)?.name ?? 'Sticker'} sticker: drag it, or use the arrow keys; plus and minus resize, brackets turn, Delete removes`
                          : `Words “${d.text}”: drag them, or use the arrow keys; Delete removes`
                      }
                      style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: d.kind === 'sticker' ? `${d.size * 100}%` : undefined, rotate: `${d.rot}deg`, '--fs': d.kind === 'text' ? `${d.size * 100}cqi` : undefined } as CSSProperties}
                      onPointerDown={(e) => onItemDown(e, d)}
                      onPointerMove={onItemMove}
                      onPointerUp={onItemDrop}
                      onPointerCancel={onItemDrop}
                      onLostPointerCapture={onItemDrop}
                      onFocus={() => setSelected(d.id)}
                      onKeyDown={(e) => onItemKey(e, d)}
                    >
                      {d.kind === 'sticker' ? (
                        <img src={stickerSrc(d.art)} alt="" draggable={false} />
                      ) : (
                        <span className="st-words" style={{ color: d.color }}>
                          {d.text}
                        </span>
                      )}
                    </button>
                  ))}
                  {stamp && (
                    <span className="st-stamp" aria-hidden="true">
                      {stampText()}
                    </span>
                  )}
                </div>
              </div>
            )}
            {failed && !busy && camera === 'off' && !needPhoto && (
              <p className="st-tray__note" role="alert">
                That print didn’t come out.{' '}
                <button type="button" className="link st-tray__retry" onClick={() => setRetry((n) => n + 1)}>
                  Try again
                </button>
              </p>
            )}
          </div>
          <p className="st-foot">
            <LockGlyph /> Made in this tab. Photos and camera frames never leave your device.
          </p>
          <span className="sr-only" role="status" aria-live="polite">
            {busy ?? (failed ? 'That print didn’t come out.' : ready ? `Print ${printNo} is ready.` : '')}
          </span>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const input = e.currentTarget;
              void pickFiles(input.files).finally(() => (input.value = ''));
            }}
          />
        </div>

        {/* ---------- The controls: five steps ---------- */}
        <div className="st-deck">
          <div className="st-tabs" role="tablist" aria-label="Studio steps">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                id={`${uid}-tab-${s.id}`}
                aria-controls={`${uid}-panel`}
                aria-selected={step === s.id}
                tabIndex={step === s.id ? 0 : -1}
                className="st-tab"
                onClick={() => goStep(s.id)}
                onKeyDown={(e) => {
                  let next: number | null = null;
                  if (e.key === 'ArrowRight') next = (i + 1) % STEPS.length;
                  else if (e.key === 'ArrowLeft') next = (i + STEPS.length - 1) % STEPS.length;
                  else if (e.key === 'Home') next = 0;
                  else if (e.key === 'End') next = STEPS.length - 1;
                  if (next === null) return;
                  e.preventDefault();
                  goStep(STEPS[next].id);
                  document.getElementById(`${uid}-tab-${STEPS[next].id}`)?.focus();
                }}
              >
                <span className="st-tab__n" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="st-tab__name">{s.name}</span>
              </button>
            ))}
          </div>

          <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${step}`} className="st-body scroll">
            {step === 'start' && (
              <>
                <Group label="Start with">
                  <Seg
                    name={`${uid}-mode`}
                    label="Start with"
                    value={cfg.mode}
                    options={[
                      { id: 'words', name: 'Words' },
                      { id: 'photo', name: 'A photo' },
                    ]}
                    onChange={(m) => {
                      if (m === 'words') stopCamera();
                      set({ mode: m });
                    }}
                  />
                </Group>

                {cfg.mode === 'words' ? (
                  <>
                    <Group label="Your words" htmlFor={`${uid}-text`}>
                      <input id={`${uid}-text`} className="input" value={cfg.text} maxLength={24} onChange={(e) => set({ text: e.target.value })} placeholder="sea you!" autoComplete="off" spellCheck={false} />
                    </Group>
                    <Group label="Lettering" id={`${uid}-font-l`}>
                      <div className="st-fonts" role="radiogroup" aria-labelledby={`${uid}-font-l`}>
                        {FONTS.map((f) => (
                          <label key={f.id} className="st-tile st-font" title={f.note}>
                            <input type="radio" name={`${uid}-font`} checked={cfg.font === f.id} onChange={() => set({ font: f.id })} aria-label={`${f.name}: ${f.note}`} />
                            <span className="st-font__aa" style={{ font: domFont(f, 24) }} aria-hidden="true">
                              Aa
                            </span>
                            <span className="st-tile__name" aria-hidden="true">
                              {f.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </Group>
                    <Group label="Hand-made wobble" htmlFor={`${uid}-wobble`}>
                      <div className="st-row st-row--nowrap">
                        <span className="st-range-end">Neat</span>
                        <input id={`${uid}-wobble`} type="range" className="st-range" min={0} max={1} step={0.05} value={cfg.wobble} onChange={(e) => set({ wobble: Number(e.target.value) })} aria-valuetext={`${Math.round(cfg.wobble * 100)}% loose`} />
                        <span className="st-range-end">Loose</span>
                      </div>
                    </Group>
                  </>
                ) : (
                  <>
                    <Group label={takes(cfg.layout) > 1 ? 'Photos · the strip takes four' : 'Photo'}>
                      <div className="st-row">
                        {camera === 'on' ? (
                          <>
                            <button type="button" className="btn btn--primary" onClick={() => void takeShots()} disabled={count > 0}>
                              {takes(cfg.layout) > 1 ? 'Take four' : 'Take it'}
                            </button>
                            <button type="button" className="btn" onClick={stopCamera}>
                              Close camera
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn btn--primary" onClick={() => void startCamera()} disabled={camera === 'starting'}>
                              {cfg.shots.length ? 'Retake' : 'Take a photo'}
                            </button>
                            <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
                              Choose {takes(cfg.layout) > 1 ? 'up to four' : 'a photo'}
                            </button>
                          </>
                        )}
                      </div>
                      <label className="st-check">
                        <input type="checkbox" checked={burstOn} onChange={(e) => setBurstOn(e.target.checked)} />
                        <span>Boomerang: catch a second of movement with each photo</span>
                      </label>
                      {camError && !needPhoto && (
                        <p className="st-error" role="alert">
                          {camError}
                        </p>
                      )}
                      {cfg.shots.length > 0 && (
                        <ul className="st-shots" aria-label="Your photos">
                          {cfg.shots.map((s, i) => (
                            <li key={i}>
                              <ShotThumb still={s.still} />
                              <button type="button" className="st-shots__x" aria-label={`Remove photo ${i + 1}`} onClick={() => set({ shots: cfg.shots.filter((_, k) => k !== i) })}>
                                <Icon name="close" size={12} stroke={2.2} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Group>
                    <Group label="Filter" id={`${uid}-filter-l`}>
                      <div className="st-chips" role="radiogroup" aria-labelledby={`${uid}-filter-l`}>
                        {FILTERS.map((f) => (
                          <label key={f.id} className="st-chip">
                            <input type="radio" name={`${uid}-filter`} checked={cfg.filter === f.id} onChange={() => set({ filter: f.id })} />
                            <span>{f.name}</span>
                          </label>
                        ))}
                      </div>
                    </Group>
                  </>
                )}
              </>
            )}

            {step === 'material' && (
              <>
                <Group label={`Make it out of · ${MATERIALS.length} materials`} id={`${uid}-mat-l`}>
                  <div className="st-materials" role="radiogroup" aria-labelledby={`${uid}-mat-l`}>
                    {[{ id: 'none' as const, name: materialName('none', cfg.mode), note: 'As it is' }, ...MATERIALS].map((m) => (
                      <label key={m.id} className="st-tile st-material" title={m.note}>
                        <input type="radio" name={`${uid}-material`} checked={cfg.material === m.id} onChange={() => set({ material: m.id })} aria-label={`${m.name}: ${m.note}`} />
                        <span className="st-material__swatch" aria-hidden="true">
                          {thumbs[m.id] ? <img src={thumbs[m.id]} alt="" /> : <span className="st-material__wait" />}
                        </span>
                        <span className="st-tile__name" aria-hidden="true">
                          {m.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </Group>
                {colorable(cfg.material) && (
                  <Group label="Colour" id={`${uid}-col-l`}>
                    <div className="st-colors" role="radiogroup" aria-labelledby={`${uid}-col-l`}>
                      {COLORS.map((c) => (
                        <label key={c.hex} className="st-swatch" style={{ '--c': c.hex } as CSSProperties} title={c.name}>
                          <input type="radio" name={`${uid}-color`} checked={cfg.color.toLowerCase() === c.hex.toLowerCase()} onChange={() => set({ color: c.hex })} aria-label={c.name} />
                          <span aria-hidden="true" />
                        </label>
                      ))}
                      <label className="st-swatch st-swatch--any" title="Any colour" style={{ '--c': cfg.color } as CSSProperties}>
                        <input type="color" value={cfg.color} onChange={(e) => set({ color: e.target.value })} aria-label="Any colour" />
                        <span aria-hidden="true" />
                      </label>
                    </div>
                  </Group>
                )}
                <p className="st-note">{animated(cfg.material) ? 'This one moves in a GIF: it catches the light.' : cfg.material === 'none' ? 'Plain, with a soft shadow.' : 'Lit from the window, top right.'}</p>
              </>
            )}

            {step === 'layout' && (
              <>
                <Group label="Lay it out as" id={`${uid}-lay-l`}>
                  <div className="st-layouts" role="radiogroup" aria-labelledby={`${uid}-lay-l`}>
                    {LAYOUTS.map((l) => (
                      <label key={l.id} className="st-layout">
                        <input type="radio" name={`${uid}-layout`} checked={cfg.layout === l.id} onChange={() => set({ layout: l.id })} />
                        <LayoutGlyph id={l.id} />
                        <span className="st-layout__text">
                          <span className="st-layout__name">{l.name}</span>
                          <span className="st-layout__note">{l.note}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Group>
                {cfg.layout === 'id' ? (
                  <Group label="Background">
                    <Seg
                      name={`${uid}-id`}
                      label="ID photo background"
                      value={cfg.idColor}
                      options={[
                        { id: 'red', name: 'Red' },
                        { id: 'blue', name: 'Blue' },
                      ]}
                      onChange={(v) => set({ idColor: v })}
                    />
                  </Group>
                ) : (
                  cfg.layout !== 'sticker' && (
                    <Group label="Backdrop" id={`${uid}-bg-l`}>
                      <div className="st-chips" role="radiogroup" aria-labelledby={`${uid}-bg-l`}>
                        {BACKDROPS.map((b) => (
                          <label key={b.id} className="st-chip" data-backdrop={b.id}>
                            <input type="radio" name={`${uid}-bg`} checked={cfg.backdrop === b.id} onChange={() => set({ backdrop: b.id })} />
                            <span>
                              <i className="st-chip__dot" aria-hidden="true" />
                              {b.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </Group>
                  )
                )}
                {(cfg.layout === 'card' || cfg.layout === 'strip' || cfg.layout === 'tcg') && (
                  <Group label={cfg.layout === 'tcg' ? (cfg.mode === 'photo' ? 'Name on the card' : 'Flavour text') : 'Caption'} htmlFor={`${uid}-caption`} optional>
                    <input id={`${uid}-caption`} className="input" value={cfg.caption} maxLength={60} onChange={(e) => set({ caption: e.target.value })} placeholder={cfg.layout === 'strip' ? 'see you soon' : 'Say something'} autoComplete="off" />
                  </Group>
                )}
                {cfg.mode === 'photo' && takes(cfg.layout) > cfg.shots.length && cfg.shots.length > 0 && (
                  <p className="st-note">The strip has four frames: your {cfg.shots.length === 1 ? 'photo repeats' : 'photos repeat'}. Add more on the Start step.</p>
                )}
              </>
            )}

            {step === 'decorate' && (
              <>
                <Group label="Tool">
                  <Seg
                    name={`${uid}-tool`}
                    label="Tool"
                    value={tool}
                    options={[
                      { id: 'move', name: 'Move' },
                      { id: 'pen', name: 'Pen' },
                    ]}
                    onChange={setTool}
                  />
                </Group>
                <Group label="Stickers" id={`${uid}-stk-l`}>
                  <div className="st-stickers" role="group" aria-labelledby={`${uid}-stk-l`}>
                    {STICKERS.map((s) => (
                      <button key={s.id} type="button" className="st-sticker" onClick={() => addSticker(s.id)} aria-label={`Add a ${s.name.toLowerCase()} sticker`} title={s.name}>
                        <img src={stickerSrc(s.id)} alt="" />
                      </button>
                    ))}
                  </div>
                </Group>
                <Group label="Words" htmlFor={`${uid}-words`}>
                  <form
                    className="st-row st-row--nowrap"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addWords();
                    }}
                  >
                    <input id={`${uid}-words`} className="input" value={words} maxLength={30} onChange={(e) => setWords(e.target.value)} placeholder="cute!" autoComplete="off" />
                    <button type="submit" className="btn" disabled={!words.trim()}>
                      Add
                    </button>
                  </form>
                </Group>
                <Group label="Pen and word colour" id={`${uid}-pen-l`}>
                  <div className="st-row">
                    <div className="st-colors" role="group" aria-labelledby={`${uid}-pen-l`}>
                      {PEN.map((c) => (
                        <button key={c.hex} type="button" className="st-swatch" style={{ '--c': c.hex } as CSSProperties} aria-pressed={penColor === c.hex} aria-label={`${c.name} pen`} title={c.name} onClick={() => setPenColor(c.hex)}>
                          <span aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                    <Seg
                      name={`${uid}-pen`}
                      label="Pen size"
                      value={penWidth < 0.01 ? 'fine' : 'bold'}
                      options={[
                        { id: 'fine', name: 'Fine' },
                        { id: 'bold', name: 'Bold' },
                      ]}
                      onChange={(v) => setPenWidth(v === 'fine' ? 0.008 : 0.014)}
                    />
                  </div>
                  {strokes.length > 0 && (
                    <button type="button" className="btn btn--sm btn--ghost st-undo" onClick={() => setStrokes((s) => s.slice(0, -1))}>
                      Undo the last line
                    </button>
                  )}
                </Group>
                <label className="st-check">
                  <input type="checkbox" checked={stamp} onChange={(e) => setStamp(e.target.checked)} />
                  <span>Date stamp, like a disposable camera</span>
                </label>
                {sel && (
                  <Group label={sel.kind === 'sticker' ? 'This sticker' : 'These words'}>
                    <div className="st-sel">
                      <label className="st-slider">
                        <span className="t-label">Size</span>
                        <input type="range" className="st-range" min={0.03} max={0.6} step={0.01} value={sel.size} onChange={(e) => patch(sel.id, { size: Number(e.target.value) })} />
                      </label>
                      <label className="st-slider">
                        <span className="t-label">Turn</span>
                        <input type="range" className="st-range" min={-180} max={180} step={1} value={sel.rot} onChange={(e) => patch(sel.id, { rot: Number(e.target.value) })} aria-valuetext={`${Math.round(sel.rot)} degrees`} />
                      </label>
                      <button type="button" className="btn btn--sm btn--ghost" onClick={() => remove(sel.id)}>
                        Remove it
                      </button>
                    </div>
                  </Group>
                )}
                <p className="st-note">Drag stickers on the print, or focus one and use the arrow keys.</p>
              </>
            )}

            {step === 'save' && (
              <div className="st-save">
                <div className="st-save__keys">
                  <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => void savePng()} disabled={!canSave || !!busy}>
                    <Icon name="download" size={18} /> Save PNG{cfg.layout === 'sticker' ? ' · transparent' : ''}
                  </button>
                  <button type="button" className="btn btn--lg btn--block" onClick={() => void saveGif()} disabled={!canSave || !!busy}>
                    <Icon name="download" size={18} /> {hasBurst ? 'Save GIF · boomerang' : 'Save GIF'}
                  </button>
                </div>
                <p className="st-note">
                  {hasBurst
                    ? 'The GIF plays your second of movement forwards and back.'
                    : moves
                      ? `In the GIF ${boils ? 'the letters wobble like hand-drawn animation' : ''}${boils && animated(cfg.material) ? ' and ' : ''}${animated(cfg.material) ? `the ${materialName(cfg.material, cfg.mode).toLowerCase()} catches the light` : ''}.`
                      : 'This one holds still in a GIF: try more wobble, or a shiny material.'}
                </p>
                <dl className="st-spec">
                  <div>
                    <dt className="t-label">Size</dt>
                    <dd className="t-mono">
                      {size[0]} × {size[1]} px
                    </dd>
                  </div>
                  <div>
                    <dt className="t-label">Made of</dt>
                    <dd>{materialName(cfg.material, cfg.mode)}</dd>
                  </div>
                  <div>
                    <dt className="t-label">On top</dt>
                    <dd>{decor.length + strokes.length ? `${decor.length} ${decor.length === 1 ? 'piece' : 'pieces'}, ${strokes.length} pen ${strokes.length === 1 ? 'line' : 'lines'}` : 'Nothing yet'}</dd>
                  </div>
                </dl>
                {canShare && (
                  <button type="button" className="btn" onClick={() => void share()} disabled={!canSave || !!busy}>
                    <Icon name="share" size={16} /> Share…
                  </button>
                )}
                <button type="button" className="link st-restart" onClick={restart}>
                  Start something new
                </button>
              </div>
            )}
          </div>

          <div className="st-nav">
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => goStep(STEPS[Math.max(0, stepIndex - 1)].id)} disabled={stepIndex === 0}>
              <Icon name="arrow-left" size={14} /> Back
            </button>
            <span className="st-nav__dots" aria-hidden="true">
              {STEPS.map((s, i) => (
                <i key={s.id} data-on={i <= stepIndex || undefined} />
              ))}
            </span>
            {stepIndex < STEPS.length - 1 ? (
              <button type="button" className="btn btn--sm btn--primary" onClick={() => goStep(STEPS[stepIndex + 1].id)}>
                Next: {STEPS[stepIndex + 1].name} <Icon name="arrow-right" size={14} />
              </button>
            ) : (
              <span className="st-nav__end t-label">Step 5 of 5</span>
            )}
          </div>
        </div>
      </div>
    </Stage>
  );
}
