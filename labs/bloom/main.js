/*
 * Bloom — a reaction–diffusion garden.
 * Page wiring: engine choice (GPU, CPU fallback), the loop, painting, controls, keyboard, a11y.
 */
import { createGLEngine } from "./engine-gl.js";
import { createCPUEngine } from "./engine-cpu.js";
import { readPalette, tokenString } from "./palette.js";

const PRESETS = [
  {
    id: "coral",
    name: "Coral",
    feed: 0.0545,
    kill: 0.062,
    shape: "branching coral",
    blurb: "Fronts that keep splitting and wandering until the whole garden turns into reef.",
  },
  {
    id: "mitosis",
    name: "Mitosis",
    feed: 0.0367,
    kill: 0.0649,
    shape: "dividing cells",
    blurb: "Round cells swell, pinch in the middle and split in two, slowly, like cells under a microscope.",
  },
  {
    id: "fingerprints",
    name: "Fingerprints",
    feed: 0.037,
    kill: 0.06,
    shape: "looping stripes",
    blurb: "Ridges curl into looping stripes, like the whorls on the tip of your finger.",
  },
  {
    id: "spots",
    name: "Spots",
    feed: 0.03,
    kill: 0.062,
    shape: "polka dots",
    blurb: "Dots copy themselves and settle into a tidy, honeycomb-like grid of polka dots.",
  },
  {
    id: "worms",
    name: "Worms",
    feed: 0.058,
    kill: 0.065,
    shape: "long wriggling worms",
    blurb: "Short worms stretch into long, wavy strands that politely keep their distance.",
  },
  {
    id: "bubbles",
    name: "Bubbles",
    feed: 0.098,
    kill: 0.0555,
    shape: "packed jelly bubbles",
    blurb: "Blobs swell until they press together like soap-bubble foam, split by thin seams of sky.",
  },
];

const lab = window.lab || {
  theme: "light",
  reducedMotion: false,
  isTouch: false,
  onThemeChange() {},
  token: () => "",
};

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const reduced = !!lab.reducedMotion;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = (n) => n.toFixed(4);

const els = {
  wrap: $("canvas-wrap"),
  ring: $("brush-ring"),
  hint: $("stage-hint"),
  hintText: $("hint-text"),
  chipState: $("chip-state"),
  chipStateText: $("chip-state-text"),
  chipGen: $("chip-gen"),
  chipRecipe: $("chip-recipe"),
  notice: $("stage-notice"),
  noticeText: $("stage-notice-text"),
  presets: $("presets"),
  brush: $("brush"),
  brushOut: $("brush-out"),
  speed: $("speed"),
  speedOut: $("speed-out"),
  play: $("play"),
  playLabel: $("play-label"),
  seeds: $("seeds"),
  eraser: $("eraser"),
  clear: $("clear"),
  snapshot: $("snapshot"),
  recipeName: $("recipe-name"),
  recipeValues: $("recipe-values"),
  recipeBlurb: $("recipe-blurb"),
  map: $("recipe-map"),
  engineLabel: $("engine-label"),
  announcer: $("announcer"),
};

let canvas = $("bloom-canvas");

const startIndex = Math.max(
  0,
  PRESETS.findIndex((p) => p.id === (params.get("preset") || "").toLowerCase()),
);

const state = {
  preset: startIndex,
  playing: !reduced,
  speed: clamp(Number(params.get("speed")) || (reduced ? 4 : 12), 1, 32),
  brush: 18,
  erase: false,
  generation: 0,
  time: 0,
  painted: false,
  ready: false,
};

/* ---------------------------------------------------------------- announcements */

let announceTimer = 0;
function announce(message) {
  clearTimeout(announceTimer);
  els.announcer.textContent = "";
  announceTimer = setTimeout(() => {
    els.announcer.textContent = message;
  }, 80);
}

/* ---------------------------------------------------------------- engine */

let engine = null;
let palette = readPalette();

function freshCanvas() {
  const next = canvas.cloneNode(false);
  canvas.replaceWith(next);
  canvas = next;
}

function createEngine() {
  let e = null;
  if (params.get("renderer") !== "cpu") {
    try {
      e = createGLEngine(canvas);
    } catch (err) {
      console.warn("[bloom] WebGL2 failed to start.", err);
      e = null;
    }
  }
  if (!e) {
    // The canvas may already hold a WebGL context, so the CPU garden gets a clean one.
    freshCanvas();
    try {
      e = createCPUEngine(canvas);
    } catch (err) {
      e = null;
    }
  }
  return e;
}

/* ---------------------------------------------------------------- sizing */

let cssW = 0;
let cssH = 0;
let lastDpr = 0;

function measure(force) {
  if (!engine) return false;
  const rect = els.wrap.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (!w || !h) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!force && w === cssW && h === cssH && dpr === lastDpr) return false;
  cssW = w;
  cssH = h;
  lastDpr = dpr;
  engine.resize(w, h, dpr);
  updateEngineLabel();
  placeRing();
  return true;
}

function updateEngineLabel() {
  if (!engine) return;
  const [w, h] = engine.simSize;
  els.engineLabel.textContent = `${engine.label} · ${w} × ${h} cells`;
}

/* ---------------------------------------------------------------- loop */

let raf = 0;
let pageVisible = !document.hidden;
let onscreen = true;
let dirty = true;
let lastFrame = 0;
let lastGenPaint = 0;
const queue = [];

function schedule() {
  if (raf || !engine || !state.ready || !pageVisible || !onscreen) return;
  raf = requestAnimationFrame(frame);
}

function stopLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastFrame = 0;
}

function requestRender() {
  dirty = true;
  schedule();
}

function stepsPerFrame() {
  return engine.kind === "gpu" ? state.speed : Math.max(1, Math.round(state.speed / 3));
}

function frame(now) {
  raf = 0;
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 1 / 60;
  lastFrame = now;
  let changed = dirty;

  if (queue.length) {
    for (const s of queue.splice(0, 48)) engine.paint(s.u0, s.v0, s.u1, s.v1, s.r, s.erase);
    changed = true;
  }
  if (state.playing) {
    const n = stepsPerFrame();
    engine.step(n);
    state.generation += n;
    if (!reduced) state.time += dt;
    changed = true;
  }
  if (changed) engine.render(state.time);
  dirty = false;

  if (!state.playing || now - lastGenPaint > 120) {
    lastGenPaint = now;
    els.chipGen.textContent = state.generation.toLocaleString("en-US");
  }

  if (state.playing || queue.length) schedule();
  else lastFrame = 0;
}

document.addEventListener("visibilitychange", () => {
  pageVisible = !document.hidden;
  if (pageVisible) requestRender();
  else stopLoop();
});

if ("IntersectionObserver" in window) {
  new IntersectionObserver((entries) => {
    onscreen = entries[entries.length - 1].isIntersecting;
    if (onscreen) requestRender();
    else stopLoop();
  }).observe(els.wrap);
}

/* ---------------------------------------------------------------- painting */

function stroke(a, b, radius = state.brush, erase = state.erase) {
  queue.push({ u0: a.u, v0: a.v, u1: b.u, v1: b.v, r: radius, erase });
  if (!state.painted) {
    state.painted = true;
    els.hint.classList.add("is-hidden");
  }
  schedule();
}

function seedFlower() {
  const m = Math.min(cssW, cssH);
  const R = m * 0.13;
  const petal = Math.max(7, m * 0.034);
  const at = (x, y) => ({ u: x / cssW, v: y / cssH });
  const c = at(cssW / 2, cssH / 2);
  engine.paint(c.u, c.v, c.u, c.v, petal * 1.15, false);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
    const p = at(cssW / 2 + Math.cos(a) * R, cssH / 2 + Math.sin(a) * R);
    engine.paint(p.u, p.v, p.u, p.v, petal, false);
  }
  // a few stray seeds so the corners join in, too
  for (let i = 0; i < 7; i++) {
    let u;
    let v;
    do {
      u = 0.08 + Math.random() * 0.84;
      v = 0.08 + Math.random() * 0.84;
    } while (Math.hypot((u - 0.5) * cssW, (v - 0.5) * cssH) < R * 2);
    engine.paint(u, v, u, v, Math.max(5, m * 0.016), false);
  }
}

function dropSeeds(count = 12) {
  const m = Math.min(cssW, cssH) || 400;
  for (let i = 0; i < count; i++) {
    const p = { u: 0.05 + Math.random() * 0.9, v: 0.05 + Math.random() * 0.9 };
    stroke(p, p, Math.max(5, m * (0.012 + Math.random() * 0.016)), false);
  }
  announce(`Dropped ${count} seeds.`);
}

/* ---------------------------------------------------------------- brush ring */

const kb = { u: 0.5, v: 0.5 };
let hovering = false;
let keyboardRing = false;
let enterHeld = false;
let pointerId = null;
let lastPoint = null;
let strokeErase = false;

function placeRing() {
  const r = state.brush;
  const x = kb.u * cssW;
  const y = kb.v * cssH;
  els.ring.style.width = els.ring.style.height = `${r * 2}px`;
  els.ring.style.transform = `translate3d(${x - r}px, ${y - r}px, 0)`;
  els.ring.classList.toggle("is-visible", hovering || keyboardRing || pointerId !== null);
  els.ring.classList.toggle("is-erase", state.erase || strokeErase);
}

function pointFrom(e) {
  const rect = els.wrap.getBoundingClientRect();
  return {
    u: clamp((e.clientX - rect.left) / rect.width, 0, 1),
    v: clamp((e.clientY - rect.top) / rect.height, 0, 1),
  };
}

els.wrap.addEventListener("pointerdown", (e) => {
  if (!state.ready) return;
  if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
  try {
    els.wrap.setPointerCapture(e.pointerId);
  } catch (err) {
    /* capture is a nicety */
  }
  pointerId = e.pointerId;
  strokeErase = state.erase || e.button === 2;
  keyboardRing = false;
  const p = pointFrom(e);
  kb.u = p.u;
  kb.v = p.v;
  lastPoint = p;
  stroke(p, p, state.brush, strokeErase);
  placeRing();
});

els.wrap.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse") hovering = true;
  const events = pointerId === e.pointerId && e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of events.length ? events : [e]) {
    const p = pointFrom(ev);
    if (pointerId === e.pointerId && lastPoint) {
      stroke(lastPoint, p, state.brush, strokeErase);
      lastPoint = p;
    }
    kb.u = p.u;
    kb.v = p.v;
  }
  placeRing();
});

function endPointer(e) {
  if (pointerId !== e.pointerId) return;
  pointerId = null;
  lastPoint = null;
  strokeErase = false;
  placeRing();
}
els.wrap.addEventListener("pointerup", endPointer);
els.wrap.addEventListener("pointercancel", endPointer);
els.wrap.addEventListener("lostpointercapture", endPointer);
els.wrap.addEventListener("pointerenter", (e) => {
  if (e.pointerType === "mouse") {
    hovering = true;
    placeRing();
  }
});
els.wrap.addEventListener("pointerleave", (e) => {
  if (e.pointerType === "mouse") {
    hovering = false;
    placeRing();
  }
});
els.wrap.addEventListener("contextmenu", (e) => e.preventDefault());

/* ---------------------------------------------------------------- canvas keyboard */

els.wrap.addEventListener("focus", () => {
  if (els.wrap.matches(":focus-visible")) {
    keyboardRing = true;
    els.hintText.textContent = "Arrows move · Enter paints";
    els.hint.classList.remove("is-hidden");
    placeRing();
  }
});

els.wrap.addEventListener("blur", () => {
  keyboardRing = false;
  enterHeld = false;
  els.hintText.textContent = hintCopy();
  if (state.painted) els.hint.classList.add("is-hidden");
  placeRing();
});

els.wrap.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || !state.ready) return;
  const stepPx = Math.min(cssW, cssH) * (e.shiftKey ? 0.07 : 0.025);
  let dx = 0;
  let dy = 0;
  switch (e.key) {
    case "ArrowLeft":
      dx = -stepPx;
      break;
    case "ArrowRight":
      dx = stepPx;
      break;
    case "ArrowUp":
      dy = -stepPx;
      break;
    case "ArrowDown":
      dy = stepPx;
      break;
    case "Enter":
      e.preventDefault();
      if (!e.repeat) {
        enterHeld = true;
        stroke({ ...kb }, { ...kb });
      }
      keyboardRing = true;
      placeRing();
      return;
    case "[":
      e.preventDefault();
      setBrush(state.brush - 4, true);
      return;
    case "]":
      e.preventDefault();
      setBrush(state.brush + 4, true);
      return;
    case "e":
    case "E":
      e.preventDefault();
      toggleEraser();
      return;
    case "s":
    case "S":
      e.preventDefault();
      dropSeeds();
      return;
    default:
      return;
  }
  e.preventDefault();
  const from = { ...kb };
  kb.u = clamp(kb.u + dx / cssW, 0, 1);
  kb.v = clamp(kb.v + dy / cssH, 0, 1);
  keyboardRing = true;
  if (enterHeld) stroke(from, { ...kb });
  placeRing();
});

els.wrap.addEventListener("keyup", (e) => {
  if (e.key === "Enter") enterHeld = false;
});

/* ---------------------------------------------------------------- global keyboard */

document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  const tag = t && t.tagName;
  if (t && (t.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")) return;
  if (e.key === " " || e.code === "Space") {
    // Buttons and links keep their native Space behaviour.
    if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return;
    e.preventDefault();
    if (!e.repeat) togglePlay();
    return;
  }
  if (/^[1-9]$/.test(e.key)) {
    const i = Number(e.key) - 1;
    if (i < PRESETS.length) {
      e.preventDefault();
      setPreset(i, true);
    }
  }
});

/* ---------------------------------------------------------------- controls */

function hintCopy() {
  return lab.isTouch ? "Drag to paint" : "Click and drag to paint";
}

function canvasLabel() {
  const p = PRESETS[state.preset];
  const ground = palette.dark ? "a plain near-black background" : "a plain light grey background";
  const mode = state.playing ? "growing" : "paused";
  return `Reaction–diffusion simulation, ${mode}. Magenta jelly grows into ${p.shape} on ${ground}. Recipe: ${p.name}, feed ${fmt(p.feed)}, kill ${fmt(p.kill)}.`;
}

function syncStatus() {
  els.play.dataset.playing = String(state.playing);
  els.playLabel.textContent = state.playing ? "Pause" : "Play";
  els.chipState.dataset.state = state.ready ? (state.playing ? "live" : "paused") : "warming";
  els.chipStateText.textContent = state.ready ? (state.playing ? "Growing" : "Paused") : "Warming up";
  canvas.setAttribute("aria-label", canvasLabel());
}

function togglePlay(force) {
  if (!engine || !state.ready) return;
  state.playing = typeof force === "boolean" ? force : !state.playing;
  els.chipGen.textContent = state.generation.toLocaleString("en-US");
  syncStatus();
  announce(state.playing ? "Playing. The garden is growing." : "Paused.");
  if (state.playing) schedule();
}

function setPreset(i, speak) {
  state.preset = i;
  const p = PRESETS[i];
  if (engine) engine.setRecipe(p.feed, p.kill);
  els.presets.querySelectorAll(".preset").forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
  els.recipeName.textContent = p.name;
  els.recipeValues.innerHTML = "";
  for (const text of [`feed ${fmt(p.feed)}`, `kill ${fmt(p.kill)}`]) {
    const span = document.createElement("span");
    span.textContent = text;
    els.recipeValues.appendChild(span);
  }
  els.recipeBlurb.textContent = p.blurb;
  els.chipRecipe.textContent = `F ${fmt(p.feed).slice(1)} · K ${fmt(p.kill).slice(1)}`;
  renderMap();
  syncStatus();
  if (speak) announce(`Recipe: ${p.name}. Feed ${fmt(p.feed)}, kill ${fmt(p.kill)}. ${p.blurb}`);
}

function rangeFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  input.style.setProperty("--fill", `${((Number(input.value) - min) / (max - min)) * 100}%`);
}

function setBrush(v, speak) {
  state.brush = clamp(Math.round(v), Number(els.brush.min), Number(els.brush.max));
  els.brush.value = String(state.brush);
  els.brushOut.textContent = `${state.brush} px`;
  els.brush.setAttribute("aria-valuetext", `${state.brush} pixels`);
  rangeFill(els.brush);
  placeRing();
  if (speak) announce(`Brush ${state.brush} pixels.`);
}

function setSpeed(v) {
  state.speed = clamp(Math.round(v), 1, 32);
  els.speed.value = String(state.speed);
  els.speedOut.textContent = `${state.speed} ${state.speed === 1 ? "step" : "steps"}`;
  els.speed.setAttribute("aria-valuetext", `${state.speed} simulation ${state.speed === 1 ? "step" : "steps"} per frame`);
  rangeFill(els.speed);
}

function toggleEraser() {
  state.erase = !state.erase;
  els.eraser.setAttribute("aria-pressed", String(state.erase));
  placeRing();
  announce(state.erase ? "Eraser on. Painting now removes chemicals." : "Eraser off. Painting adds chemicals.");
}

function clearGarden() {
  if (!engine) return;
  engine.clear();
  queue.length = 0;
  state.generation = 0;
  state.painted = false;
  els.chipGen.textContent = "0";
  els.hintText.textContent = hintCopy();
  els.hint.classList.remove("is-hidden");
  requestRender();
  announce("Garden cleared. Paint or drop seeds to start again.");
}

async function snapshot() {
  if (!engine) return;
  try {
    if (document.fonts && document.fonts.load) await document.fonts.load('600 16px "Mona Sans Variable"');
  } catch (err) {
    /* the label falls back to the system sans */
  }
  engine.render(state.time); // fresh pixels in the same task, so WebGL hands them over
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext("2d");
  ctx.drawImage(canvas, 0, 0);
  drawWatermark(ctx, out.width, out.height, out.width / Math.max(1, cssW));
  const name = `bloom-${PRESETS[state.preset].id}-${state.generation}.png`;
  out.toBlob((blob) => {
    if (!blob) {
      announce("Sorry, the snapshot could not be created.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    announce(`Snapshot saved as ${name}.`);
  }, "image/png");
}

function drawWatermark(ctx, w, h, s) {
  // A quiet chip in the corner, like the ones on the stage: paper fill, hairline, a magenta dot.
  const text = "BLOOM.ADELIA.CC";
  const size = Math.round(11 * s);
  ctx.font = `600 ${size}px "Mona Sans Variable", "Mona Sans", ui-sans-serif, system-ui, sans-serif`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(size * 0.12).toFixed(2)}px`;
  const tw = ctx.measureText(text).width;
  const padX = 12 * s;
  const dot = 6 * s;
  const gap = 7 * s;
  const pillH = 28 * s;
  const pillW = padX * 2 + dot + gap + tw;
  const x = w - pillW - 16 * s;
  const y = h - pillH - 16 * s;
  const r = pillH / 2;
  const pill = () => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + pillW, y, x + pillW, y + pillH, r);
    ctx.arcTo(x + pillW, y + pillH, x, y + pillH, r);
    ctx.arcTo(x, y + pillH, x, y, r);
    ctx.arcTo(x, y, x + pillW, y, r);
    ctx.closePath();
  };
  ctx.save();
  pill();
  ctx.fillStyle = tokenString("--surface");
  ctx.fill();
  ctx.lineWidth = Math.max(1, s);
  ctx.strokeStyle = tokenString("--line");
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + padX + dot / 2, y + pillH / 2, dot / 2, 0, Math.PI * 2);
  ctx.fillStyle = tokenString("--accent");
  ctx.fill();
  ctx.fillStyle = tokenString("--ink");
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX + dot + gap, y + pillH / 2 + 0.5 * s);
  ctx.restore();
}

/* ---------------------------------------------------------------- feed / kill map */

const SVG_NS = "http://www.w3.org/2000/svg";
function svg(tag, attrs, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
}

function renderMap() {
  const root = els.map;
  const title = root.querySelector("title");
  [...root.childNodes].forEach((n) => n !== title && n.remove());
  const kMin = 0.053;
  const kMax = 0.068;
  const fMin = 0.018;
  const fMax = 0.108;
  const x0 = 24;
  const x1 = 122;
  const y0 = 10;
  const y1 = 90;
  const X = (k) => x0 + ((k - kMin) / (kMax - kMin)) * (x1 - x0);
  const Y = (f) => y1 - ((f - fMin) / (fMax - fMin)) * (y1 - y0);
  svg("rect", { class: "map__bg", x: 0, y: 0, width: 132, height: 112, rx: 10 }, root);
  for (let i = 0; i <= 4; i++) {
    const gx = x0 + (i * (x1 - x0)) / 4;
    const gy = y0 + (i * (y1 - y0)) / 4;
    svg("line", { class: "map__grid", x1: gx, y1: y0, x2: gx, y2: y1 }, root);
    svg("line", { class: "map__grid", x1: x0, y1: gy, x2: x1, y2: gy }, root);
  }
  const kx = svg("text", { class: "map__axis", x: x1, y: 103, "text-anchor": "end" }, root);
  kx.textContent = "KILL →";
  const fy = svg("text", { class: "map__axis", x: 0, y: 0, transform: `translate(15 ${y1}) rotate(-90)` }, root);
  fy.textContent = "FEED →";

  PRESETS.forEach((p, i) => {
    if (i === state.preset) return;
    svg("circle", { class: "map__dot", cx: X(p.kill), cy: Y(p.feed), r: 3.2 }, root);
  });
  const p = PRESETS[state.preset];
  const cx = X(p.kill);
  const cy = Y(p.feed);
  svg("circle", { class: "map__pulse", cx, cy, r: 9 }, root);
  svg("circle", { class: "map__edge", cx, cy, r: 7.5 }, root);
  svg("circle", { class: "map__active", cx, cy, r: 5.5 }, root);
  const right = cx > 78;
  const label = svg(
    "text",
    { class: "map__label", x: right ? cx - 11 : cx + 11, y: cy + 3, "text-anchor": right ? "end" : "start" },
    root,
  );
  label.textContent = p.name.toUpperCase();
  title.textContent = `Feed and kill map of the six recipes. ${p.name} sits at feed ${fmt(p.feed)} and kill ${fmt(p.kill)}.`;
}

/* ---------------------------------------------------------------- theme */

function syncTheme() {
  palette = readPalette();
  if (engine) engine.setPalette(palette);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tokenString("--bg"));
  canvas.setAttribute("aria-label", canvasLabel());
  requestRender();
}
lab.onThemeChange(syncTheme);

/* ---------------------------------------------------------------- boot */

function buildPresets() {
  PRESETS.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lab-btn preset";
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-keyshortcuts", String(i + 1));
    b.innerHTML = `<span class="preset__key" aria-hidden="true">${i + 1}</span><span class="preset__name"></span>`;
    b.querySelector(".preset__name").textContent = p.name;
    b.addEventListener("click", () => setPreset(i, true));
    els.presets.appendChild(b);
  });
}

function showNotice(text) {
  els.noticeText.textContent = text;
  els.notice.hidden = false;
}

function disableControls() {
  for (const b of [els.play, els.seeds, els.eraser, els.clear, els.snapshot, ...els.presets.querySelectorAll("button")]) {
    b.disabled = true;
  }
  els.brush.disabled = true;
  els.speed.disabled = true;
  els.wrap.setAttribute("tabindex", "-1");
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function warmUp(steps) {
  let done = 0;
  while (done < steps) {
    const n = Math.min(steps - done, engine.kind === "gpu" ? 80 : 20);
    engine.step(n);
    done += n;
    state.generation += n;
    await nextFrame();
  }
}

function wireContextLoss() {
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    if (engine && engine.markLost) engine.markLost();
    stopLoop();
    state.ready = false;
    syncStatus();
    showNotice("The graphics card took a break. Bloom will replant the garden as soon as it is back.");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    engine = createGLEngine(canvas);
    if (!engine) {
      showNotice("The graphics card did not come back. Reload the page to replant the garden.");
      return;
    }
    els.notice.hidden = true;
    engine.setPalette(palette);
    engine.setRecipe(PRESETS[state.preset].feed, PRESETS[state.preset].kill);
    measure(true);
    seedFlower();
    state.generation = 0;
    state.ready = true;
    syncStatus();
    requestRender();
  });
}

async function boot() {
  buildPresets();
  setBrush(state.brush);
  setSpeed(state.speed);
  els.hintText.textContent = hintCopy();

  engine = createEngine();
  setPreset(state.preset, false);
  syncStatus();

  if (!engine) {
    disableControls();
    els.engineLabel.textContent = "Unavailable";
    showNotice("Bloom needs WebGL2 or Canvas to grow its garden, and this browser offers neither. Try a recent Chrome, Edge, Firefox or Safari.");
    announce("Bloom cannot run in this browser.");
    return;
  }

  if (engine.kind === "gpu") wireContextLoss();
  engine.setPalette(palette);
  engine.setRecipe(PRESETS[state.preset].feed, PRESETS[state.preset].kill);
  measure(true);
  seedFlower();

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      if (measure(false)) requestRender();
    }).observe(els.wrap);
  }
  window.addEventListener("resize", () => {
    if (measure(false)) requestRender();
  });

  els.brush.addEventListener("input", () => setBrush(Number(els.brush.value)));
  els.speed.addEventListener("input", () => setSpeed(Number(els.speed.value)));
  els.play.addEventListener("click", () => togglePlay());
  els.seeds.addEventListener("click", () => dropSeeds());
  els.eraser.addEventListener("click", toggleEraser);
  els.clear.addEventListener("click", clearGarden);
  els.snapshot.addEventListener("click", snapshot);

  if (reduced) {
    // Reduced motion: grow a still garden off-screen, show it once, and wait for Play.
    await warmUp(engine.kind === "gpu" ? 1400 : 500);
  }

  state.ready = true;
  syncStatus();
  requestRender();

  if (engine.kind === "cpu") {
    $("chip-lowres").hidden = false;
    announce("WebGL2 is not available here, so Bloom is running a lighter, low-resolution garden on the CPU.");
  } else if (reduced) {
    announce("Reduced motion is on, so the garden starts paused. Press Play to let it grow.");
  }
}

boot();
