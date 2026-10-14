"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { toast } from "@/lib/ui";
import { STICKERS as DECOR, drawDecor, stampText, stickerSrc, type Decor, type Stroke } from "./decor";
import { FONTS, domFont, familyOf, fontById, loadFont } from "./fonts";
import { boomerang, encodeGif } from "./gif";
import { BACKDROPS, LAYOUTS, compose, photoAspect, takes, type Art, type BackdropId, type LayoutId } from "./layouts";
import { MATERIALS, renderMaterial, type MaterialId } from "./materials";
import { FILTERS, applyFilter, canvas, cover, loadImage, renderLettering, renderPhoto, tight, type FilterId } from "./source";

/*
 * The Studio: words or a photo, made out of a material, laid out, decorated and saved. Everything
 * is drawn on canvases in this tab; photos and camera frames never leave the device.
 */

type Mode = "words" | "photo";
type Step = "start" | "material" | "layout" | "decorate" | "save";
type MaterialChoice = MaterialId | "none";
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
  idColor: "red" | "blue";
};

const STEPS: { id: Step; name: string }[] = [
  { id: "start", name: "Start" },
  { id: "material", name: "Material" },
  { id: "layout", name: "Layout" },
  { id: "decorate", name: "Decorate" },
  { id: "save", name: "Save" },
];

const COLORS = ["#FF7EB6", "#FFD6E8", "#1FB0F0", "#93DCFB", "#22CDB0", "#9474FF", "#FFBE1F", "#4FD566", "#0B1F33", "#FFFFFF"];
const PEN = ["#FF7EB6", "#1A8FE8", "#FFBE1F", "#22CDB0", "#0B1F33", "#FFFFFF"];
const LIGHT = { x: 0.3, y: 0.2 };

/** Live preview of a filter on the camera, close to what the CPU filter does to the still. */
const CSS_FILTER: Record<FilterId, string> = {
  natural: "none",
  aqua: "saturate(1.05) hue-rotate(-6deg) brightness(1.04)",
  pink: "saturate(1.15) contrast(1.06) brightness(1.05) sepia(.08) hue-rotate(-12deg)",
  dreamy: "brightness(1.08) contrast(.88) saturate(.95)",
  film: "sepia(.18) contrast(.92) saturate(.85) brightness(1.03)",
  disposable: "contrast(1.15) saturate(1.12) sepia(.12)",
  mono: "grayscale(1) contrast(1.12)",
};

const noop = () => () => {};
const yieldFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const materialName = (m: MaterialChoice) => (m === "none" ? "Ink" : (MATERIALS.find((x) => x.id === m)?.name ?? m));
const colorable = (m: MaterialChoice) => m === "none" || (MATERIALS.find((x) => x.id === m)?.colorable ?? true);
const animated = (m: MaterialChoice) => m !== "none" && (MATERIALS.find((x) => x.id === m)?.animated ?? false);

/** Lettering or a photo with nothing done to it but a soft shadow: the "Ink" / "Just the photo" choice. */
function plain(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = canvas(src.width, src.height);
  const ctx = out.getContext("2d")!;
  ctx.shadowColor = "rgba(8,40,80,.22)";
  ctx.shadowBlur = Math.min(src.width, src.height) * 0.025;
  ctx.shadowOffsetY = Math.min(src.width, src.height) * 0.012;
  ctx.drawImage(src, 0, 0);
  return out;
}

/** The art for every frame of a layout. `phase` animates the material, `frame` picks a burst frame, `boil` re-wobbles the letters. */
async function buildArts(c: Config, { phase = 0, frame, boil = 0 }: { phase?: number; frame?: number; boil?: number } = {}): Promise<Art[]> {
  const n = takes(c.layout);
  const font = fontById(c.font);
  await loadFont(font, c.text);
  // ASCII types with the page's mono face, which isn't preloaded: wait for it, or the first render falls back.
  if (c.material === "ascii") await document.fonts.load(`16px ${getComputedStyle(document.body).getPropertyValue("--font-mono") || "monospace"}`).catch(() => {});
  const arts: Art[] = [];
  for (let i = 0; i < n; i++) {
    let src: HTMLCanvasElement;
    if (c.mode === "words") {
      src = renderLettering({ text: c.text, font, ink: c.color, wobble: c.wobble, seed: c.seed + i * 101 + boil * 17 });
    } else {
      const shot = c.shots[i % c.shots.length];
      const base = frame !== undefined && shot.burst.length ? shot.burst[frame % shot.burst.length] : shot.still;
      const filtered = applyFilter(cover(base, photoAspect(c.layout), c.layout === "strip" ? 720 : 900), c.filter, c.seed);
      if (c.material === "none") {
        arts.push({ canvas: c.layout === "sticker" ? plain(renderPhoto(filtered)) : filtered, fill: c.layout !== "sticker" });
        continue;
      }
      src = renderPhoto(filtered);
    }
    const kind = c.mode === "words" ? "text" : "photo";
    const out = c.material === "none" ? plain(src) : renderMaterial(c.material, { source: src, kind, color: c.color, light: LIGHT, phase, seed: c.seed + i });
    // The sticker layout needs the room around the piece for its die-cut edge; the others show it big.
    arts.push({ canvas: c.layout === "sticker" ? out : tight(out), fill: false });
    if (n > 1) await yieldFrame();
  }
  return arts;
}

function layoutOptions(c: Config, date: Date) {
  return {
    backdrop: c.backdrop,
    caption: c.caption.trim(),
    title: c.mode === "words" ? c.text.trim() || "Visitor" : c.caption.trim() || "Visitor",
    material: materialName(c.material),
    idColor: c.idColor,
    date,
    seed: c.seed,
  };
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image."))), "image/png"));

/** A still from a video or image, at most `long` px on its longer side. */
function snap(src: HTMLVideoElement | HTMLImageElement, long: number, mirror: boolean): HTMLCanvasElement {
  const w = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth;
  const h = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight;
  const s = Math.min(1, long / Math.max(w, h));
  const out = canvas(w * s, h * s);
  const ctx = out.getContext("2d")!;
  if (mirror) {
    ctx.translate(out.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

export function Studio() {
  const uid = useId();
  const [step, setStep] = useState<Step>("start");
  const [cfg, setCfg] = useState<Config>({
    mode: "words",
    text: "sea you!",
    font: "bagel",
    wobble: 0.55,
    seed: 7,
    shots: [],
    filter: "natural",
    material: "jelly",
    color: "#FF7EB6",
    layout: "card",
    backdrop: "sky",
    caption: "",
    idColor: "blue",
  });
  const set = (patch: Partial<Config>) => setCfg((c) => ({ ...c, ...patch }));

  const [size, setSize] = useState<[number, number]>([1080, 1350]);
  const [busy, setBusy] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const display = useRef<HTMLCanvasElement>(null);
  const base = useRef<HTMLCanvasElement | null>(null);
  const token = useRef(0);

  // Decoration.
  const [decor, setDecor] = useState<Decor[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [stamp, setStamp] = useState(false);
  const [tool, setTool] = useState<"move" | "pen">("move");
  const [penColor, setPenColor] = useState(PEN[0]);
  const [penWidth, setPenWidth] = useState(0.008);
  const [selected, setSelected] = useState<string | null>(null);
  const [words, setWords] = useState("");
  const piece = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLCanvasElement>(null);
  /** The sticker in your hand: moved by writing its style directly, committed to state when you let go. */
  const drag = useRef<{ id: string; dx: number; dy: number; el: HTMLElement; x: number; y: number } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const drawing = useRef<Stroke | null>(null);
  const serial = useRef(0);

  // Camera.
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(0);
  const [burstOn, setBurstOn] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Material thumbnails.
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  /* ---------- Render the piece whenever its recipe changes ---------- */
  useEffect(() => {
    // No photo yet: the stage shows the camera and file buttons instead.
    if (cfg.mode === "photo" && !cfg.shots.length) return;
    const mine = ++token.current;
    const t = window.setTimeout(async () => {
      setBusy("Making it…");
      await yieldFrame();
      try {
        const arts = await buildArts(cfg);
        if (mine !== token.current) return;
        const out = compose(cfg.layout, arts, layoutOptions(cfg, new Date()));
        base.current = out;
        setSize([out.width, out.height]);
        const d = display.current;
        if (d) {
          d.width = out.width;
          d.height = out.height;
          const ctx = d.getContext("2d")!;
          ctx.clearRect(0, 0, d.width, d.height);
          ctx.drawImage(out, 0, 0);
          // A little stamp, so a remake reads as a new print rather than a flicker.
          const box = d.parentElement;
          if (box) {
            delete box.dataset.stamped;
            void box.offsetWidth;
            box.dataset.stamped = "";
          }
        }
        setReady(true);
      } finally {
        if (mine === token.current) setBusy(null);
      }
    }, 140);
    return () => window.clearTimeout(t);
  }, [cfg]);

  /* ---------- The display canvas remounts when the camera closes: put the piece back on it ---------- */
  useEffect(() => {
    const d = display.current;
    const b = base.current;
    if (!d || !b || camera !== "off") return;
    if (d.width !== b.width || d.height !== b.height) {
      d.width = b.width;
      d.height = b.height;
    }
    d.getContext("2d")!.drawImage(b, 0, 0);
  }, [camera, ready, size]);

  /* ---------- Thumbnails for the material picker, from the current words or photo ---------- */
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      const font = fontById(cfg.font);
      await loadFont(font, "Aa");
      let src: HTMLCanvasElement;
      if (cfg.mode === "photo" && cfg.shots[0]) src = renderPhoto(cover(cfg.shots[0].still, 1, 150));
      else if (cfg.mode === "photo") return;
      else src = renderLettering({ text: "Aa", font, ink: cfg.color, wobble: cfg.wobble * 0.6, seed: cfg.seed, size: 96 });
      const next: Record<string, string> = {};
      for (const m of MATERIALS) {
        if (!alive) return;
        try {
          next[m.id] = renderMaterial(m.id, { source: src, kind: cfg.mode === "words" ? "text" : "photo", color: m.colorable ? cfg.color : m.defaultColor, light: LIGHT, phase: 0, seed: cfg.seed }).toDataURL();
        } catch {
          // A thumbnail that fails just shows the name.
        }
        await yieldFrame();
      }
      next.none = plain(src).toDataURL();
      if (alive) setThumbs(next);
    }, 600);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [cfg.mode, cfg.font, cfg.color, cfg.wobble, cfg.seed, cfg.shots]);

  /* ---------- Pen strokes, redrawn on the overlay at screen resolution ---------- */
  useEffect(() => {
    const c = ink.current;
    const box = piece.current;
    if (!c || !box) return;
    const paint = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const s of strokes) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width * c.width;
        ctx.beginPath();
        s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * c.width, y * c.height) : ctx.moveTo(x * c.width, y * c.height)));
        ctx.stroke();
      }
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(box);
    return () => ro.disconnect();
  }, [strokes, size]);

  /* ---------- Camera ---------- */
  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera("off");
  };
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);
  useEffect(() => {
    const v = video.current;
    if (camera !== "on" || !v || !stream.current) return;
    v.srcObject = stream.current;
    void v.play().catch(() => {});
  }, [camera]);

  const startCamera = async () => {
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("This browser can't use a camera here. Choose photos instead.");
      return;
    }
    setCamera("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      stream.current = s;
      setCamera("on");
    } catch {
      setCamera("off");
      setCamError("The camera didn't open (no permission, or no camera). You can choose photos instead.");
    }
  };

  const takeShots = async () => {
    const v = video.current;
    if (!v || count) return;
    const n = takes(cfg.layout);
    const shots: Shot[] = [];
    for (let i = 0; i < n; i++) {
      for (let k = 3; k > 0; k--) {
        setCount(k);
        sfx.tick();
        await new Promise((r) => window.setTimeout(r, calm() ? 500 : 800));
      }
      setCount(0);
      const still = snap(v, 1600, true);
      sfx.pop();
      setFlash((f) => f + 1);
      const burst: HTMLCanvasElement[] = [];
      if (burstOn) {
        for (let f = 0; f < 8; f++) {
          burst.push(snap(v, 480, true));
          await new Promise((r) => window.setTimeout(r, 90));
        }
      }
      shots.push({ still, burst });
      if (i < n - 1) await new Promise((r) => window.setTimeout(r, 500));
    }
    stopCamera();
    set({ shots, mode: "photo" });
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
      set({ shots, mode: "photo" });
    } catch (e) {
      toast({ title: "Couldn't open that photo", body: e instanceof Error ? e.message : "Try another file.", tone: "magenta" });
    }
  };

  /* ---------- Decoration ---------- */
  const addSticker = (art: string) => {
    const id = `${art}-${++serial.current}`;
    const n = decor.length;
    setDecor((d) => [...d, { kind: "sticker", id, art, x: 0.5 + ((n % 3) - 1) * 0.12, y: 0.5 + ((Math.floor(n / 3) % 3) - 1) * 0.1, size: 0.2, rot: ((n * 37) % 30) - 15 }]);
    setSelected(id);
    setFresh(id);
    setTool("move");
    sfx.pop();
  };
  const addWords = () => {
    const text = words.trim();
    if (!text) return;
    const id = `text-${++serial.current}`;
    setDecor((d) => [...d, { kind: "text", id, text, color: penColor === "#FFFFFF" ? "#0B1F33" : penColor, x: 0.5, y: 0.82, size: 0.07, rot: -4 }]);
    setWords("");
    setSelected(id);
    setTool("move");
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

  const onItemDown = (e: ReactPointerEvent<HTMLElement>, d: Decor) => {
    if (tool !== "move") return;
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    el.dataset.dragging = "";
    const [x, y] = local(e);
    drag.current = { id: d.id, dx: x - d.x, dy: y - d.y, el, x: d.x, y: d.y };
    setSelected(d.id);
  };
  const onItemMove = (e: ReactPointerEvent<HTMLElement>) => {
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
  const onItemKey = (e: ReactKeyboardEvent<HTMLElement>, d: Decor) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, Partial<Decor>> = {
      ArrowLeft: { x: Math.max(0, d.x - step) },
      ArrowRight: { x: Math.min(1, d.x + step) },
      ArrowUp: { y: Math.max(0, d.y - step) },
      ArrowDown: { y: Math.min(1, d.y + step) },
      "+": { size: Math.min(0.6, d.size * 1.1) },
      "=": { size: Math.min(0.6, d.size * 1.1) },
      "-": { size: Math.max(0.03, d.size / 1.1) },
      "[": { rot: d.rot - 5 },
      "]": { rot: d.rot + 5 },
    };
    if (moves[e.key]) {
      e.preventDefault();
      patch(d.id, moves[e.key]);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(d.id);
    }
  };

  const onPenDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (tool !== "pen") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = { color: penColor, width: penWidth, points: [local(e)] };
    setStrokes((s) => [...s, drawing.current!]);
  };
  const onPenMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
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
    out.getContext("2d")!.drawImage(frameBase, 0, 0);
    await drawDecor(out, decor, strokes, stamp ? stampText() : null, familyOf(fontById("gochi")));
    return out;
  };

  const saved = (what: string) => {
    const isNew = unlock("studio", { silent: true });
    sfx.success();
    toast({ title: `${what} saved`, body: isNew ? "It's in your downloads (nothing was uploaded), and the Maker sticker is yours." : "It's in your downloads. Nothing was uploaded.", tone: "sky", sticker: isNew ? "studio" : undefined });
  };

  const failed = (what: string) => {
    sfx.bump();
    toast({ title: `Couldn't save the ${what}`, body: what === "GIF" ? "This device ran short of memory for it. Try the PNG, or a smaller layout." : "Try again in a moment.", tone: "magenta" });
  };

  const savePng = async () => {
    if (!base.current) return;
    setBusy("Saving…");
    try {
      const out = await finished(base.current);
      download(await toBlob(out), `adelia-studio-${cfg.layout}.png`);
      saved("PNG");
    } catch {
      failed("PNG");
    } finally {
      setBusy(null);
    }
  };

  const hasBurst = cfg.mode === "photo" && cfg.shots.some((s) => s.burst.length);
  const moves = cfg.mode === "words" ? cfg.wobble > 0.05 || animated(cfg.material) : hasBurst || animated(cfg.material);

  const saveGif = async () => {
    if (!base.current) return;
    const date = new Date();
    const frames: HTMLCanvasElement[] = [];
    const n = hasBurst ? 8 : 10;
    try {
      for (let i = 0; i < n; i++) {
        setBusy(`Drawing frame ${i + 1} of ${n}…`);
        await yieldFrame();
        const arts = await buildArts(cfg, { phase: i / n, frame: hasBurst ? i : undefined, boil: cfg.mode === "words" && cfg.wobble > 0.05 ? i % 3 : 0 });
        frames.push(await finished(compose(cfg.layout, arts, layoutOptions(cfg, date))));
      }
      setBusy("Encoding the GIF…");
      await yieldFrame();
      const blob = encodeGif(hasBurst ? boomerang(frames) : frames, hasBurst ? 80 : 110);
      download(blob, `adelia-studio-${cfg.layout}.gif`);
      saved(hasBurst ? "Boomerang" : "GIF");
    } catch {
      failed("GIF");
    } finally {
      setBusy(null);
    }
  };

  const canShare = useSyncExternalStore(
    noop,
    () => "share" in navigator,
    () => false,
  );
  const share = async () => {
    if (!base.current) return;
    const out = await finished(base.current);
    const file = new File([await toBlob(out)], `adelia-studio-${cfg.layout}.png`, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Made in the Studio at adelia.cc" });
        unlock("studio");
      } else download(file, file.name);
    } catch {
      // Cancelled.
    }
  };

  const restart = () => {
    setDecor([]);
    setStrokes([]);
    setStamp(false);
    setSelected(null);
    set({ shots: [], caption: "", seed: (cfg.seed * 31 + 7) % 997 });
    setStep("start");
  };

  /* ---------- UI ---------- */
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const goStep = (s: Step) => {
    setStep(s);
    sfx.tick();
  };
  const aspect = `${size[0]} / ${size[1]}`;
  const tilt = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--lx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty("--ly", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };
  const needPhoto = cfg.mode === "photo" && !cfg.shots.length && camera === "off";
  const canSave = ready && !(cfg.mode === "photo" && !cfg.shots.length);

  return (
    <div className="studio">
      {/* ---------- The stage: a cutting mat, and the piece on it ---------- */}
      <div className="studio__stage">
        <div className="studio__mat" onPointerMove={tilt}>
          <span className="studio__ruler studio__ruler--top" aria-hidden="true" />
          <span className="studio__ruler studio__ruler--left" aria-hidden="true" />
          {camera !== "off" ? (
            <div className="studio__viewfinder" style={{ aspectRatio: String(photoAspect(cfg.layout)), ["--ar" as string]: photoAspect(cfg.layout) } as CSSProperties}>
              <video ref={video} className="studio__video" playsInline muted style={{ filter: CSS_FILTER[cfg.filter] }} aria-label="Camera preview" />
              {count > 0 && (
                <span className="studio__count" aria-live="assertive">
                  {count}
                </span>
              )}
              {flash > 0 && <span key={flash} className="studio__flash" aria-hidden="true" />}
              {camera === "starting" && <span className="studio__hint">Opening the camera…</span>}
            </div>
          ) : needPhoto ? (
            <div className="studio__empty">
              <p className="text-18 font-semibold">Take a photo, or choose up to four.</p>
              <p className="mt-1 text-14 text-muted">They stay on this device.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" className="pill" data-variant="magenta" onClick={startCamera}>
                  Take a photo
                </button>
                <button type="button" className="pill" onClick={() => fileInput.current?.click()}>
                  Choose photos
                </button>
              </div>
            </div>
          ) : (
            <div ref={piece} className="studio__piece" data-layout={cfg.layout} data-ready={ready || undefined} style={{ aspectRatio: aspect, ["--ar" as string]: size[0] / size[1] } as CSSProperties} onPointerDown={() => tool === "move" && setSelected(null)}>
              <canvas ref={display} className="studio__canvas" role="img" aria-label={`${materialName(cfg.material)} ${cfg.mode === "words" ? `lettering “${cfg.text}”` : "photo"}, laid out as a ${LAYOUTS.find((l) => l.id === cfg.layout)?.name.toLowerCase()}`} />
              <span className="studio__sheen" aria-hidden="true" />
              <canvas
                ref={ink}
                className="studio__ink"
                data-tool={tool}
                aria-hidden="true"
                onPointerDown={onPenDown}
                onPointerMove={onPenMove}
                onPointerUp={onPenUp}
                onPointerCancel={onPenUp}
              />
              {decor.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="studio__item"
                  data-selected={d.id === selected || undefined}
                  data-tool={tool}
                  aria-label={d.kind === "sticker" ? `${DECOR.find((s) => s.id === d.art)?.name ?? "Sticker"} sticker: drag, or use the arrow keys, + and −, [ and ]` : `Words “${d.text}”: drag, or use the arrow keys`}
                  style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: d.kind === "sticker" ? `${d.size * 100}%` : undefined, rotate: `${d.rot}deg`, ["--fs" as string]: d.kind === "text" ? `${d.size * 100}cqi` : undefined } as CSSProperties}
                  data-new={d.id === fresh || undefined}
                  onPointerDown={(e) => onItemDown(e, d)}
                  onPointerMove={onItemMove}
                  onPointerUp={onItemDrop}
                  onPointerCancel={onItemDrop}
                  onLostPointerCapture={onItemDrop}
                  onFocus={() => setSelected(d.id)}
                  onKeyDown={(e) => onItemKey(e, d)}
                >
                  {d.kind === "sticker" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stickerSrc(d.art)} alt="" draggable={false} />
                  ) : (
                    <span className="studio__words" style={{ color: d.color }}>
                      {d.text}
                    </span>
                  )}
                </button>
              ))}
              {stamp && (
                <span className="studio__stamp" aria-hidden="true">
                  {stampText()}
                </span>
              )}
            </div>
          )}
          {busy && (
            <span className="studio__busy" role="status">
              {busy}
            </span>
          )}
        </div>
        <p className="studio__privacy">
          <LockGlyph /> Made in this tab. Photos and camera frames never leave your device.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const input = e.currentTarget;
            void pickFiles(input.files).finally(() => (input.value = ""));
          }}
        />
      </div>

      {/* ---------- The panel: five steps ---------- */}
      <div className="studio__panel widget">
        <div className="studio__tabs" role="tablist" aria-label="Studio steps">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${s.id}`}
              aria-controls={`${uid}-panel`}
              aria-selected={step === s.id}
              tabIndex={step === s.id ? 0 : -1}
              className="studio__tab"
              onClick={() => goStep(s.id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const next = STEPS[(i + (e.key === "ArrowRight" ? 1 : STEPS.length - 1)) % STEPS.length];
                goStep(next.id);
                document.getElementById(`${uid}-tab-${next.id}`)?.focus();
              }}
            >
              <span className="studio__tab-n">{i + 1}</span>
              {s.name}
            </button>
          ))}
        </div>

        <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${step}`} className="studio__body">
          {step === "start" && (
            <>
              <Group label="Start with">
                <div className="seg" role="radiogroup" aria-label="Start with">
                  {(["words", "photo"] as Mode[]).map((m) => (
                    <label key={m} className="seg__opt">
                      <input
                        type="radio"
                        name={`${uid}-mode`}
                        checked={cfg.mode === m}
                        onChange={() => {
                          if (m === "words") stopCamera();
                          set({ mode: m });
                        }}
                      />
                      <span>{m === "words" ? "Words" : "A photo"}</span>
                    </label>
                  ))}
                </div>
              </Group>

              {cfg.mode === "words" ? (
                <>
                  <Group label="Your words" htmlFor={`${uid}-text`}>
                    <input id={`${uid}-text`} className="gb-input" value={cfg.text} maxLength={24} onChange={(e) => set({ text: e.target.value })} placeholder="sea you!" autoComplete="off" />
                  </Group>
                  <Group label="Lettering">
                    <div className="studio__fonts" role="radiogroup" aria-label="Lettering">
                      {FONTS.map((f) => (
                        <label key={f.id} className="studio__font" title={f.note}>
                          <input type="radio" name={`${uid}-font`} checked={cfg.font === f.id} onChange={() => set({ font: f.id })} />
                          <span className="studio__font-aa" style={{ font: domFont(f, 26) }} aria-hidden="true">
                            Aa
                          </span>
                          <span className="studio__font-name">{f.name}</span>
                        </label>
                      ))}
                    </div>
                  </Group>
                  <Group label="Hand-made wobble" htmlFor={`${uid}-wobble`}>
                    <div className="flex items-center gap-3">
                      <span className="text-12 text-muted">Neat</span>
                      <input id={`${uid}-wobble`} type="range" min={0} max={1} step={0.05} value={cfg.wobble} onChange={(e) => set({ wobble: Number(e.target.value) })} className="studio__range" />
                      <span className="text-12 text-muted">Loose</span>
                      <button type="button" className="pill" data-size="sm" onClick={() => set({ seed: (cfg.seed * 48271 + 11) % 9973 })}>
                        Shuffle
                      </button>
                    </div>
                  </Group>
                </>
              ) : (
                <>
                  <Group label={takes(cfg.layout) > 1 ? "Photos (the strip takes four)" : "Photo"}>
                    <div className="flex flex-wrap gap-2">
                      {camera === "on" ? (
                        <>
                          <button type="button" className="pill" data-variant="magenta" onClick={() => void takeShots()} disabled={count > 0}>
                            {takes(cfg.layout) > 1 ? "Take four" : "Take it"}
                          </button>
                          <button type="button" className="pill" onClick={stopCamera}>
                            Close camera
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="pill" data-variant="magenta" onClick={() => void startCamera()}>
                            {cfg.shots.length ? "Retake" : "Take a photo"}
                          </button>
                          <button type="button" className="pill" onClick={() => fileInput.current?.click()}>
                            Choose {takes(cfg.layout) > 1 ? "up to four" : "a photo"}
                          </button>
                        </>
                      )}
                    </div>
                    <label className="studio__check mt-3">
                      <input type="checkbox" checked={burstOn} onChange={(e) => setBurstOn(e.target.checked)} />
                      <span>Boomerang: catch a second of movement with each photo</span>
                    </label>
                    {camError && (
                      <p className="mt-2 text-14 text-[var(--accent-ink)]" role="alert">
                        {camError}
                      </p>
                    )}
                    {cfg.shots.length > 0 && (
                      <ul className="studio__shots" aria-label="Your photos">
                        {cfg.shots.map((s, i) => (
                          <li key={i}>
                            <ShotThumb shot={s} />
                            <button type="button" className="studio__shot-x" aria-label={`Remove photo ${i + 1}`} onClick={() => set({ shots: cfg.shots.filter((_, k) => k !== i) })}>
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Group>
                  <Group label="Filter">
                    <div className="studio__chips" role="radiogroup" aria-label="Filter">
                      {FILTERS.map((f) => (
                        <label key={f.id} className="chip-opt">
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

          {step === "material" && (
            <>
              <Group label="Make it out of">
                <div className="studio__materials" role="radiogroup" aria-label="Material">
                  {[{ id: "none" as const, name: cfg.mode === "words" ? "Ink" : "Just the photo", note: "As it is" }, ...MATERIALS].map((m) => (
                    <label key={m.id} className="studio__material" title={m.note}>
                      <input type="radio" name={`${uid}-material`} checked={cfg.material === m.id} onChange={() => set({ material: m.id })} />
                      <span className="studio__swatch" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {thumbs[m.id] ? <img src={thumbs[m.id]} alt="" /> : <span className="studio__swatch-wait" />}
                      </span>
                      <span className="studio__material-name">{m.name}</span>
                    </label>
                  ))}
                </div>
              </Group>
              {colorable(cfg.material) && (
                <Group label="Colour">
                  <div className="studio__colors" role="radiogroup" aria-label="Colour">
                    {COLORS.map((c) => (
                      <label key={c} className="gb-swatch" style={{ ["--mid" as string]: c, ["--core" as string]: c } as CSSProperties}>
                        <input type="radio" className="sr-only" name={`${uid}-color`} checked={cfg.color.toLowerCase() === c.toLowerCase()} onChange={() => set({ color: c })} />
                        <span aria-hidden="true" />
                        <span className="sr-only">{c}</span>
                      </label>
                    ))}
                    <label className="studio__custom" title="Any colour">
                      <input type="color" value={cfg.color} onChange={(e) => set({ color: e.target.value })} aria-label="Any colour" />
                    </label>
                  </div>
                </Group>
              )}
            </>
          )}

          {step === "layout" && (
            <>
              <Group label="Lay it out as">
                <div className="studio__layouts" role="radiogroup" aria-label="Layout">
                  {LAYOUTS.map((l) => (
                    <label key={l.id} className="studio__layout">
                      <input type="radio" name={`${uid}-layout`} checked={cfg.layout === l.id} onChange={() => set({ layout: l.id })} />
                      <span className="studio__layout-icon" data-layout={l.id} aria-hidden="true" />
                      <span>
                        <span className="block font-semibold">{l.name}</span>
                        <span className="block text-12 text-muted">{l.note}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </Group>
              {cfg.layout === "id" ? (
                <Group label="Background">
                  <div className="seg" role="radiogroup" aria-label="ID photo background">
                    {(["red", "blue"] as const).map((c) => (
                      <label key={c} className="seg__opt">
                        <input type="radio" name={`${uid}-id`} checked={cfg.idColor === c} onChange={() => set({ idColor: c })} />
                        <span>{c === "red" ? "Red" : "Blue"}</span>
                      </label>
                    ))}
                  </div>
                </Group>
              ) : (
                cfg.layout !== "sticker" && (
                  <Group label="Backdrop">
                    <div className="studio__chips" role="radiogroup" aria-label="Backdrop">
                      {BACKDROPS.map((b) => (
                        <label key={b.id} className="chip-opt" data-backdrop={b.id}>
                          <input type="radio" name={`${uid}-bg`} checked={cfg.backdrop === b.id} onChange={() => set({ backdrop: b.id })} />
                          <span>{b.name}</span>
                        </label>
                      ))}
                    </div>
                  </Group>
                )
              )}
              {(cfg.layout === "card" || cfg.layout === "strip" || cfg.layout === "tcg") && (
                <Group label={cfg.layout === "tcg" ? (cfg.mode === "photo" ? "Name on the card" : "Flavour text") : "Caption"} htmlFor={`${uid}-caption`} optional>
                  <input id={`${uid}-caption`} className="gb-input" value={cfg.caption} maxLength={60} onChange={(e) => set({ caption: e.target.value })} placeholder={cfg.layout === "strip" ? "sea you soon" : "Say something"} autoComplete="off" />
                </Group>
              )}
            </>
          )}

          {step === "decorate" && (
            <>
              <Group label="Tool">
                <div className="seg" role="radiogroup" aria-label="Tool">
                  {(["move", "pen"] as const).map((t) => (
                    <label key={t} className="seg__opt">
                      <input type="radio" name={`${uid}-tool`} checked={tool === t} onChange={() => setTool(t)} />
                      <span>{t === "move" ? "Move" : "Pen"}</span>
                    </label>
                  ))}
                </div>
              </Group>
              <Group label="Stickers">
                <div className="studio__tray">
                  {DECOR.map((s) => (
                    <button key={s.id} type="button" className="studio__tray-item" onClick={() => addSticker(s.id)} aria-label={`Add a ${s.name.toLowerCase()} sticker`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={stickerSrc(s.id)} alt="" />
                    </button>
                  ))}
                </div>
              </Group>
              <Group label="Words" htmlFor={`${uid}-words`}>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addWords();
                  }}
                >
                  <input id={`${uid}-words`} className="gb-input" value={words} maxLength={30} onChange={(e) => setWords(e.target.value)} placeholder="cute!" autoComplete="off" />
                  <button type="submit" className="pill shrink-0" disabled={!words.trim()}>
                    Add
                  </button>
                </form>
              </Group>
              <Group label="Pen and word colour">
                <div className="flex flex-wrap items-center gap-1">
                  {PEN.map((c) => (
                    <button key={c} type="button" className="gb-swatch" style={{ ["--mid" as string]: c, ["--core" as string]: c } as CSSProperties} aria-pressed={penColor === c} aria-label={`Pen colour ${c}`} onClick={() => setPenColor(c)} data-on={penColor === c || undefined}>
                      <span aria-hidden="true" />
                    </button>
                  ))}
                  <div className="seg ml-2" role="radiogroup" aria-label="Pen size">
                    {[0.006, 0.012].map((w) => (
                      <label key={w} className="seg__opt">
                        <input type="radio" name={`${uid}-pen`} checked={penWidth === w} onChange={() => setPenWidth(w)} />
                        <span>{w < 0.01 ? "Fine" : "Bold"}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {strokes.length > 0 && (
                  <button type="button" className="pill mt-3" data-size="sm" onClick={() => setStrokes((s) => s.slice(0, -1))}>
                    Undo the last line
                  </button>
                )}
              </Group>
              <label className="studio__check">
                <input type="checkbox" checked={stamp} onChange={(e) => setStamp(e.target.checked)} />
                <span>Date stamp, like a disposable camera</span>
              </label>
              {sel && (
                <Group label={sel.kind === "sticker" ? "This sticker" : "These words"}>
                  <div className="grid gap-2">
                    <label className="studio__slider">
                      <span>Size</span>
                      <input type="range" min={0.03} max={0.6} step={0.01} value={sel.size} onChange={(e) => patch(sel.id, { size: Number(e.target.value) })} className="studio__range" />
                    </label>
                    <label className="studio__slider">
                      <span>Turn</span>
                      <input type="range" min={-180} max={180} step={1} value={sel.rot} onChange={(e) => patch(sel.id, { rot: Number(e.target.value) })} className="studio__range" />
                    </label>
                    <button type="button" className="pill justify-self-start" data-size="sm" onClick={() => remove(sel.id)}>
                      Remove it
                    </button>
                  </div>
                </Group>
              )}
            </>
          )}

          {step === "save" && (
            <div className="grid gap-3">
              <button type="button" className="pill" data-variant="magenta" onClick={() => void savePng()} disabled={!canSave || !!busy}>
                Save as PNG{cfg.layout === "sticker" ? " (transparent)" : ""}
              </button>
              <button type="button" className="pill" onClick={() => void saveGif()} disabled={!canSave || !!busy}>
                {hasBurst ? "Save the boomerang (GIF)" : "Save as a GIF"}
              </button>
              <p className="text-14 text-muted">
                {hasBurst
                  ? "The GIF plays your second of movement forwards and back."
                  : moves
                    ? `In the GIF ${cfg.mode === "words" && cfg.wobble > 0.05 ? "the letters wobble like hand-drawn animation" : ""}${cfg.mode === "words" && cfg.wobble > 0.05 && animated(cfg.material) ? " and " : ""}${animated(cfg.material) ? `the ${materialName(cfg.material).toLowerCase()} catches the light` : ""}.`
                    : "This one holds still in a GIF: try more wobble, or a shiny material."}
              </p>
              {canShare && (
                <button type="button" className="pill" onClick={() => void share()} disabled={!canSave}>
                  Share…
                </button>
              )}
              <button type="button" className="link-arrow mt-2 justify-self-start text-14" onClick={restart}>
                Start something new
              </button>
            </div>
          )}
        </div>

        <div className="studio__nav">
          <button type="button" className="pill" data-size="sm" onClick={() => goStep(STEPS[Math.max(0, stepIndex - 1)].id)} disabled={stepIndex === 0}>
            Back
          </button>
          {stepIndex < STEPS.length - 1 && (
            <button type="button" className="pill" data-variant="magenta" data-size="sm" onClick={() => goStep(STEPS[stepIndex + 1].id)}>
              Next: {STEPS[stepIndex + 1].name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ label, htmlFor, optional, children }: { label: string; htmlFor?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="studio__group">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="studio__label">
          {label} {optional && <span className="font-normal text-muted">(optional)</span>}
        </label>
      ) : (
        <p className="studio__label">{label}</p>
      )}
      {children}
    </div>
  );
}

function ShotThumb({ shot }: { shot: Shot }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const t = cover(shot.still, 1, 120);
    c.width = t.width;
    c.height = t.height;
    c.getContext("2d")!.drawImage(t, 0, 0);
  }, [shot]);
  return <canvas ref={ref} className="studio__shot" aria-hidden="true" />;
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="inline-block -translate-y-px">
      <rect x="3" y="7" width="10" height="7" rx="2" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
