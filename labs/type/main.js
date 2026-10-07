/*
 * Loud Type: variable type that listens.
 * Every letter is a span whose weight (200 to 800) and width (75% to 100%) follow one input:
 * a log-spaced frequency band of the microphone, the pointer's distance, or a generated wave.
 */
import { MicInput, micErrorMessage } from "./audio.js";
import { Meter } from "./meter.js";

const lab = window.lab || { isTouch: matchMedia("(pointer: coarse)").matches, onThemeChange() {} };

/* ---------- Constants ---------- */
const MAX_CHARS = 24;
const DEFAULT_PHRASE = "Hello, Bekasi";
const WGHT = [200, 800];
const WDTH = [75, 100];
const REST = 0.14; // resting value: legible, but with room to swell
const LINE_HEIGHT = 1.08; // layout line height used for fitting (CSS uses 1.02)
const SPACE_EM = 0.26;
const EDGE_EM = 0.06; // a little side room per word, so the widest glyphs never touch the stage
const MAX_FONT = 300;
const FIT = 0.92; // horizontal room kept for the loudness squash
const PEAK_MIN = 0.32; // how far above rest the loudest letter must be before it turns magenta

/* ---------- Elements ---------- */
const $ = (s) => document.querySelector(s);
const els = {
  stage: $("#stage"),
  box: $("#wordbox"),
  word: $("#word"),
  fill: $("#word-fill"),
  empty: $("#word-empty"),
  wordText: $("#word-text"),
  hint: $("#stage-hint"),
  badgeText: $("#mode-badge-text"),
  frozenBadge: $("#frozen-badge"),
  listen: $("#listen-badge"),
  stopStage: $("#stop-stage"),
  stopCard: $("#stop-card"),
  status: $("#mic-status"),
  phrase: $("#phrase"),
  count: $("#phrase-count"),
  sens: $("#sens"),
  sensOut: $("#sens-out"),
  freeze: $("#freeze"),
  copy: $("#copy"),
  copyLabel: $("#copy-label"),
  copyStatus: $("#copy-status"),
  axes: $("#axes"),
  freezeHint: $("#freeze-hint"),
  cssDetails: $("#css-details"),
  cssOut: $("#css-out"),
  meter: $("#meter"),
  meterMode: $("#meter-mode"),
  meterLevel: $("#meter-level"),
  lens: $("#lens"),
  kb: $("#kb-cursor"),
  burst: $("#burst"),
};
const modeBtns = Array.from(document.querySelectorAll("[data-mode]"));
const demoBtn = modeBtns.find((b) => b.dataset.mode === "demo");
const micBtn = modeBtns.find((b) => b.dataset.mode === "mic");

/* ---------- Media queries ---------- */
const reducedMQ = matchMedia("(prefers-reduced-motion: reduce)");
let reduced = reducedMQ.matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

/* ---------- State ---------- */
const state = {
  phrase: DEFAULT_PHRASE,
  glyphs: [],
  labels: [],
  fills: [],
  values: new Float32Array(0),
  targets: new Float32Array(0),
  input: new Float32Array(0),
  display: new Float32Array(0),
  written: new Float32Array(0),
  centers: new Float32Array(0),
  fontSize: 120,
  peak: -1,
  mode: "cursor",
  autoDemo: false,
  frozen: false,
  sens: 0.6,
  micState: "off", // off | pending | on
  pointer: { x: -1e4, y: -1e4, t: 0, inside: false, down: false, leftAt: -1e9, speed: 0, type: "mouse" },
  kbIndex: -1,
  pulses: [],
  level: 0,
  spring: { x: 0, v: 0 },
  readoutAt: 0,
  tilesAt: 0,
  tiles: [],
  pointerKind: "fine",
};

const mic = new MicInput();
const meter = new Meter(els.meter);
let micToken = 0;

/* ---------- Text helpers ---------- */
const segmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;
const splitGlyphs = (text) => (segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text));
const isSpace = (ch) => /^\s+$/.test(ch);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function cleanPhrase(text) {
  let out = String(text || "").replace(/[\r\n\t]+/g, " ");
  if (out.length > MAX_CHARS) out = Array.from(out).slice(0, MAX_CHARS).join("").slice(0, MAX_CHARS);
  return out;
}

/* ---------- Measuring and fitting ---------- */
const measurer = document.createElement("span");
measurer.className = "lt-measure";
measurer.setAttribute("aria-hidden", "true");
document.body.append(measurer);
const widthCache = new Map();

/** Advance width in em at the widest axes (wght 800, wdth 100%). */
function emOf(ch) {
  let w = widthCache.get(ch);
  if (w === undefined) {
    measurer.textContent = ch;
    w = measurer.getBoundingClientRect().width / 100;
    widthCache.set(ch, w);
  }
  return w;
}

const chunkEm = (glyphs, chunk) => chunk.reduce((a, gi) => a + emOf(glyphs[gi]), 0) + EDGE_EM;

/**
 * Picks a font size and explicit line breaks so the phrase fits even when every letter is at
 * full weight and width. Explicit lines keep words from jumping between lines as they swell.
 * Returns { size, lines } where lines = [[chunk, chunk], ...] and chunk = [glyphIndex, ...].
 */
function planLayout(glyphs, W, H) {
  const words = [];
  let cur = [];
  glyphs.forEach((ch, gi) => {
    if (isSpace(ch)) {
      if (cur.length) words.push(cur);
      cur = [];
    } else cur.push(gi);
  });
  if (cur.length) words.push(cur);
  if (!words.length) return { size: 0, lines: [] };

  const avail = W * FIT;
  const wordEm = words.map((w) => chunkEm(glyphs, w));
  const wrap = (lineEm) => {
    const lines = [];
    let line = [];
    let width = 0;
    for (let i = 0; i < words.length; i++) {
      const w = wordEm[i];
      if (w > lineEm + 1e-6) return null;
      if (line.length && width + SPACE_EM + w > lineEm) {
        lines.push(line);
        line = [words[i]];
        width = w;
      } else {
        width += (line.length ? SPACE_EM : 0) + w;
        line.push(words[i]);
      }
    }
    if (line.length) lines.push(line);
    return lines;
  };

  const totalEm = wordEm.reduce((a, b) => a + b, 0) + SPACE_EM * (words.length - 1);
  const single = { size: Math.min(avail / totalEm, H / LINE_HEIGHT, MAX_FONT), lines: [words] };

  let best = null;
  let lo = 8;
  let hi = MAX_FONT;
  for (let k = 0; k < 22; k++) {
    const mid = (lo + hi) / 2;
    const lines = wrap(avail / mid);
    if (lines && lines.length * mid * LINE_HEIGHT <= H) {
      best = { size: mid, lines };
      lo = mid;
    } else hi = mid;
  }

  // One line reads best as an equaliser, so keep it unless wrapping makes letters much bigger.
  let plan = !best || single.size >= best.size * 0.78 ? single : best;

  // A very long word on a narrow screen: allow breaking inside it.
  if (plan.size < 34) {
    const alt = splitPlan(glyphs, avail, H);
    if (alt && alt.size > plan.size * 1.3) plan = alt;
  }
  return plan;
}

function splitPlan(glyphs, avail, H) {
  const all = glyphs.map((_, i) => i);
  let best = null;
  for (let k = 2; k <= 4; k++) {
    const per = Math.ceil(all.length / k);
    const lines = [];
    for (let j = 0; j < all.length; j += per) {
      const chunks = [];
      let cur = [];
      for (const gi of all.slice(j, j + per)) {
        if (isSpace(glyphs[gi])) {
          if (cur.length) chunks.push(cur);
          cur = [];
        } else cur.push(gi);
      }
      if (cur.length) chunks.push(cur);
      if (chunks.length) lines.push(chunks);
    }
    const lineEm = lines.map((l) => l.reduce((a, c) => a + chunkEm(glyphs, c), 0) + SPACE_EM * (l.length - 1));
    const size = Math.min(avail / Math.max(...lineEm), H / (lines.length * LINE_HEIGHT), MAX_FONT);
    if (!best || size > best.size) best = { size, lines };
  }
  return best;
}

/* ---------- Building the word ---------- */
function letterSpan(ch, li) {
  const span = document.createElement("span");
  span.className = "ch";
  span.style.cssText = `font-weight:var(--w${li});font-stretch:var(--s${li});translate:0 var(--y${li})`;
  span.textContent = ch;
  return span;
}

function renderLayer(layer, plan) {
  const frag = document.createDocumentFragment();
  for (const line of plan.lines) {
    const ln = document.createElement("span");
    ln.className = "ln";
    line.forEach((chunk, k) => {
      if (k) {
        const sp = document.createElement("span");
        sp.className = "sp";
        ln.append(sp);
      }
      const wd = document.createElement("span");
      wd.className = "wd";
      for (const gi of chunk) {
        const li = state.letterOf[gi];
        const span = letterSpan(state.glyphs[gi], li);
        state.fills[li] = span;
        wd.append(span);
      }
      ln.append(wd);
    });
    frag.append(ln);
  }
  layer.replaceChildren(frag);
}

function resizeArrays(n) {
  const grow = (arr, fill) => {
    const next = new Float32Array(n).fill(fill);
    next.set(arr.subarray(0, Math.min(arr.length, n)));
    return next;
  };
  state.values = grow(state.values, REST);
  state.targets = grow(state.targets, REST);
  state.input = new Float32Array(n);
  state.display = new Float32Array(n);
  state.written = new Float32Array(n).fill(-1);
  state.centers = new Float32Array(n * 2);
  if (mic.running) mic.configure(n);
}

/** Splits the phrase into glyphs and letters, then lays it out. */
function build() {
  const glyphs = splitGlyphs(state.phrase);
  state.glyphs = glyphs;
  state.letterOf = new Int16Array(glyphs.length).fill(-1);
  const labels = [];
  glyphs.forEach((ch, gi) => {
    if (!isSpace(ch)) {
      state.letterOf[gi] = labels.length;
      labels.push(ch);
    }
  });
  state.labels = labels;
  if (state.kbIndex >= labels.length) state.kbIndex = labels.length - 1;
  resizeArrays(labels.length);
  relayout();
  renderAxes();
}

function relayout() {
  const W = els.box.clientWidth;
  const H = els.box.clientHeight;
  if (W < 10 || H < 10) return;
  const plan = planLayout(state.glyphs, W, H);
  const size = Math.max(10, Math.floor(plan.size * 10) / 10);
  state.fontSize = size;
  els.word.style.setProperty("--fs", `${size}px`);
  state.fills = new Array(state.labels.length);
  state.peak = -1;
  renderLayer(els.fill, plan);
  els.empty.hidden = state.labels.length > 0;
  write(true);
  if (state.frozen) meter.draw(normalised(), state.labels, 0);
}

let buildQueued = false;
function queueBuild() {
  if (buildQueued) return;
  buildQueued = true;
  requestAnimationFrame(() => {
    buildQueued = false;
    build();
  });
}

let layoutQueued = false;
function queueRelayout() {
  if (layoutQueued) return;
  layoutQueued = true;
  requestAnimationFrame(() => {
    layoutQueued = false;
    relayout();
  });
}

/* ---------- Writing styles ---------- */
const toWght = (v) => WGHT[0] + (WGHT[1] - WGHT[0]) * v;
const toWdth = (v) => WDTH[0] + (WDTH[1] - WDTH[0]) * v;

function write(force = false) {
  const ws = els.word.style;
  const vals = state.values;
  const written = state.written;
  const lift = reduced ? 0.015 : 0.05;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (!force && Math.abs(v - written[i]) < 0.0008) continue;
    written[i] = v;
    ws.setProperty(`--w${i}`, toWght(v).toFixed(1));
    ws.setProperty(`--s${i}`, `${toWdth(v).toFixed(2)}%`);
    ws.setProperty(`--y${i}`, `${(-lift * Math.max(0, v - REST)).toFixed(4)}em`);
  }
  const amt = reduced ? 0.015 : 0.045;
  const s = state.spring.x;
  ws.transform = `scale(${(1 + amt * 0.65 * s).toFixed(4)}, ${(1 - amt * s).toFixed(4)})`;
  markPeak();
}

/** The one magenta accent: the loudest letter, once it is clearly above rest. */
function markPeak() {
  const vals = state.values;
  const n = vals.length;
  let best = -1;
  for (let i = 0; i < n; i++) if (best < 0 || vals[i] > vals[best]) best = i;
  const cur = state.peak;
  // A little hysteresis, so two equally loud letters don't flicker.
  if (cur >= 0 && cur < n && best >= 0 && vals[cur] >= vals[best] - 0.03) best = cur;
  if (best >= 0 && vals[best] < REST + PEAK_MIN * (1 - REST)) best = -1;
  if (best === cur) return;
  if (cur >= 0 && state.fills[cur]) state.fills[cur].classList.remove("is-peak");
  if (best >= 0 && state.fills[best]) state.fills[best].classList.add("is-peak");
  state.peak = best;
}

function normalised() {
  const d = state.display;
  for (let i = 0; i < d.length; i++) d[i] = clamp((state.values[i] - REST) / (1 - REST), 0, 1);
  return d;
}

/* ---------- The loop ---------- */
function readCenters() {
  const c = state.centers;
  const fills = state.fills;
  for (let i = 0; i < fills.length; i++) {
    const el = fills[i];
    if (!el) continue;
    const r = el.getBoundingClientRect();
    c[2 * i] = r.left + r.width / 2;
    c[2 * i + 1] = r.top + r.height / 2;
  }
}

function step(now, dt) {
  const n = state.values.length;
  const targets = state.targets;
  const centers = state.centers;
  const sens = state.sens;
  const t = now / 1000;
  let energy = 0;

  const kbActive = state.kbIndex >= 0 && state.kbIndex < n;
  if (n && (state.mode === "cursor" || state.pulses.length || kbActive)) readCenters();

  if (state.mode === "demo") {
    const amp = 0.55 + 0.45 * sens;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const env = 0.62 + 0.38 * Math.sin(t * 0.43 + i * 0.09);
      let w = 0.5 + 0.5 * Math.sin(t * 1.9 - i * 0.58);
      w = w * w * (3 - 2 * w);
      const v = amp * w * env;
      targets[i] = REST + (1 - REST) * v;
      sum += v;
    }
    energy = n ? (sum / n) * 0.9 : 0;
  } else if (state.mode === "mic") {
    if (state.micState === "on") {
      energy = mic.read(state.input, sens);
      for (let i = 0; i < n; i++) targets[i] = REST + (1 - REST) * state.input[i];
    } else targets.fill(REST);
  } else {
    const p = state.pointer;
    let px = p.x;
    let py = p.y;
    let presence;
    if (kbActive) {
      px = centers[2 * state.kbIndex];
      py = centers[2 * state.kbIndex + 1];
      presence = 1;
    } else {
      presence = p.inside || p.down ? 1 : Math.max(0, 1 - (now - p.leftAt) / 500);
    }
    const reach = state.fontSize * (0.5 + 0.9 * sens);
    const inv = 1 / (2 * reach * reach);
    for (let i = 0; i < n; i++) {
      if (presence <= 0) {
        targets[i] = REST;
        continue;
      }
      const dx = centers[2 * i] - px;
      const dy = (centers[2 * i + 1] - py) * 0.55;
      targets[i] = REST + (1 - REST) * Math.exp(-(dx * dx + dy * dy) * inv) * presence;
    }
    p.speed *= Math.exp(-dt / 0.18);
    energy = Math.min(1, p.speed / 2600) * presence;
  }

  // Claps: clicks, taps and Space send a ripple through the letters.
  if (state.pulses.length) {
    const fs = state.fontSize;
    for (let k = state.pulses.length - 1; k >= 0; k--) {
      const pu = state.pulses[k];
      const age = (now - pu.t) / 1000;
      if (age > 1.4) {
        state.pulses.splice(k, 1);
        continue;
      }
      if (reduced) {
        const c = 0.28 * Math.exp(-age / 0.3);
        for (let i = 0; i < n; i++) targets[i] = Math.min(1, targets[i] + c);
        energy += c * 0.5;
      } else {
        const r = age * fs * 6.5;
        const w = fs * 0.85;
        const amp = 0.95 * Math.exp(-age / 0.5);
        const inv = 1 / (2 * w * w);
        for (let i = 0; i < n; i++) {
          const d = Math.hypot(centers[2 * i] - pu.x, centers[2 * i + 1] - pu.y);
          targets[i] = Math.min(1, targets[i] + amp * Math.exp(-((d - r) * (d - r)) * inv));
        }
        energy += amp * 0.6;
      }
    }
  }

  // Attack and release smoothing, frame-rate independent.
  const micMode = state.mode === "mic";
  const atk = reduced ? 0.16 : micMode ? 0.035 : 0.07;
  const rel = reduced ? 0.45 : micMode ? 0.2 : 0.32;
  const ka = 1 - Math.exp(-dt / atk);
  const kr = 1 - Math.exp(-dt / rel);
  const values = state.values;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    const tg = targets[i];
    values[i] = v + (tg - v) * (tg > v ? ka : kr);
  }

  // Overall loudness drives a small squash of the whole word (critically damped: no wobble).
  energy = Math.min(1, energy);
  state.level += (energy - state.level) * (1 - Math.exp(-dt / (energy > state.level ? 0.04 : 0.22)));

  const sp = state.spring;
  const K = reduced ? 40 : 160;
  const C = 2 * Math.sqrt(K);
  sp.v += (K * (state.level - sp.x) - C * sp.v) * dt;
  sp.x += sp.v * dt;

  write();
  meter.draw(normalised(), state.labels, dt);

  if (now - state.readoutAt > 110) {
    state.readoutAt = now;
    els.meterLevel.textContent = String(Math.round(state.level * 100)).padStart(3, "0");
    updateTiles();
  }

  if (kbActive && document.activeElement === els.stage) {
    const sr = els.stage.getBoundingClientRect();
    const x = centers[2 * state.kbIndex] - sr.left;
    const y = centers[2 * state.kbIndex + 1] - sr.top + state.fontSize * 0.34;
    els.kb.style.transform = `translate(${x.toFixed(1)}px, ${Math.min(y, sr.height - 70).toFixed(1)}px)`;
    els.kb.classList.add("is-on");
  } else els.kb.classList.remove("is-on");
}

let last = performance.now();
function tick(now) {
  const dt = clamp((now - last) / 1000, 0.001, 0.05);
  last = now;
  if (!state.frozen) step(now, dt);
  requestAnimationFrame(tick);
}

/* ---------- Clap ripple ---------- */
// One thin ring that travels at the same speed as the swell it sends through the letters.
const RIPPLE_SPEED = 6.5; // font sizes per second, as in step()
const RIPPLE_MS = 900;
function ripple(clientX, clientY) {
  if (reduced || els.burst.childElementCount > 6) return;
  const r = els.stage.getBoundingClientRect();
  const x = clientX - r.left;
  const y = clientY - r.top;
  const d = 2 * RIPPLE_SPEED * state.fontSize * (RIPPLE_MS / 1000);
  const ring = document.createElement("span");
  ring.className = "lt-ring";
  ring.style.width = ring.style.height = `${d.toFixed(0)}px`;
  els.burst.append(ring);
  const anim = ring.animate(
    [
      { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(0.02)`, opacity: 0.55 },
      { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(1)`, opacity: 0 },
    ],
    { duration: RIPPLE_MS, easing: "linear" },
  );
  anim.onfinish = () => ring.remove();
  anim.oncancel = () => ring.remove();
}

function clap(x, y) {
  if (state.frozen || !state.labels.length) return;
  state.pulses.push({ x, y, t: performance.now() });
  if (state.pulses.length > 6) state.pulses.shift();
  if (!reduced) {
    state.spring.v += 1.6;
    ripple(x, y);
  }
}

/* ---------- Status, badges and hints ---------- */
function setStatus(text, tone = "") {
  els.status.textContent = text;
  if (tone) els.status.dataset.tone = tone;
  else delete els.status.dataset.tone;
}

function updateBadge() {
  const m = state.mode;
  els.badgeText.textContent = m === "mic" ? (state.micState === "on" ? "Mic" : "Mic · waiting") : m === "demo" ? "Demo" : "Cursor";
  els.meterMode.textContent = m === "mic" ? "Mic" : m === "demo" ? "Demo" : "Cur";
}

function updateHint() {
  const fine = state.pointerKind === "fine";
  let text;
  if (state.frozen) text = "Frozen. Press Freeze again to bring it back to life.";
  else if (state.mode === "mic") {
    text =
      state.micState === "on"
        ? "Speak, hum or clap. Low sounds swell the first letters, high sounds the last."
        : "Waiting for the microphone. Your browser will ask first.";
  } else if (state.mode === "demo") {
    text = state.autoDemo
      ? fine
        ? "Demo wave. Move your cursor over the letters to take over."
        : "Demo wave. Drag across the letters to take over."
      : "Demo wave. A gentle generated swell.";
  } else text = fine ? "Move your cursor across the letters. Click to clap." : "Drag across the letters. Tap to clap.";
  els.hint.textContent = text;
}

function syncMicUI() {
  const on = state.micState === "on";
  els.listen.hidden = !on;
  els.stopCard.hidden = !on;
  micBtn.setAttribute("aria-busy", String(state.micState === "pending"));
  els.stage.dataset.mic = state.micState;
  updateBadge();
}

function syncDemoAvailability() {
  demoBtn.setAttribute("aria-disabled", String(reduced));
  demoBtn.title = reduced ? "Demo is off because your device asks for reduced motion." : "";
}

/* ---------- Modes ---------- */
function setMode(mode, { auto = false } = {}) {
  const prev = state.mode;
  if (state.frozen) setFrozen(false);
  if (prev === "mic" && mode !== "mic") stopMic();
  state.mode = mode;
  state.autoDemo = mode === "demo" && auto;
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  els.stage.dataset.mode = mode;
  if (mode !== "cursor") els.lens.classList.remove("is-on");
  updateBadge();
  updateHint();
  if (mode === "mic" && prev !== "mic") startMic();
}

function takeOverDemo() {
  if (state.mode === "demo" && state.autoDemo) setMode("cursor");
}

async function startMic() {
  if (!MicInput.isSupported()) {
    const why = window.isSecureContext === false ? "The microphone needs a secure (https) page." : "This browser can't use the microphone.";
    setMode("cursor");
    setStatus(`${why} Cursor mode is back on.`, "error");
    return;
  }
  const token = ++micToken;
  state.micState = "pending";
  syncMicUI();
  updateHint();
  setStatus("Waiting for microphone permission…");
  try {
    await mic.start();
  } catch (err) {
    if (token !== micToken) return;
    state.micState = "off";
    syncMicUI();
    setMode("cursor");
    setStatus(`${micErrorMessage(err)} Cursor mode is back on.`, "error");
    return;
  }
  if (token !== micToken) {
    mic.stop();
    return;
  }
  state.micState = "on";
  mic.configure(state.values.length);
  mic.onended = () => {
    if (state.micState !== "on") return;
    stopMic(null);
    setMode("cursor");
    setStatus("The microphone was disconnected. Cursor mode is back on.", "error");
  };
  syncMicUI();
  updateHint();
  setStatus("Listening. Audio never leaves your device.", "live");
}

function stopMic(message = "Microphone off. Nothing was recorded.") {
  micToken++;
  const was = state.micState;
  mic.stop();
  state.micState = "off";
  syncMicUI();
  if (was !== "off" && message) setStatus(message);
}

function stopListening() {
  const hadFocus = els.stage.contains(document.activeElement) || document.activeElement === els.stopCard;
  stopMic();
  setMode("cursor");
  if (hadFocus) modeBtns[0].focus();
}

/* ---------- Freeze and Copy CSS ---------- */
function axisValues() {
  return Array.from(state.values, (v) => ({
    wght: Math.round(toWght(v)),
    wdth: Math.round(toWdth(v) * 10) / 10,
  }));
}

function setFrozen(on) {
  if (on === state.frozen) return;
  state.frozen = on;
  els.freeze.setAttribute("aria-pressed", String(on));
  els.stage.toggleAttribute("data-frozen", on);
  els.frozenBadge.hidden = !on;
  els.copy.disabled = !on;
  if (on) els.lens.classList.remove("is-on");
  if (!on) {
    last = performance.now();
    els.cssDetails.open = false;
  }
  renderAxes();
  updateHint();
}

/** Axis tiles: a live readout while running, locked and announced once frozen. */
function renderAxes() {
  const n = state.labels.length;
  const frozen = state.frozen;
  els.axes.classList.toggle("is-frozen", frozen);
  if (frozen) els.axes.removeAttribute("aria-hidden");
  else els.axes.setAttribute("aria-hidden", "true");
  els.cssDetails.hidden = !(frozen && n);

  const frag = document.createDocumentFragment();
  state.tiles = state.labels.map((label) => {
    const li = document.createElement("li");
    li.className = "lt-axis";
    const ch = document.createElement("span");
    ch.className = "lt-axis__ch";
    ch.setAttribute("aria-hidden", "true");
    ch.textContent = label;
    const row = (name) => {
      const v = document.createElement("span");
      v.className = "lt-axis__v";
      v.setAttribute("aria-hidden", "true");
      const b = document.createElement("b");
      b.textContent = name;
      const num = document.createElement("span");
      v.append(b, " ", num);
      li.append(v);
      return num;
    };
    li.append(ch);
    const w = row("wght");
    const d = row("wdth");
    const sr = document.createElement("span");
    sr.className = "sr-only";
    li.append(sr);
    frag.append(li);
    return { label, ch, w, d, sr };
  });
  els.axes.replaceChildren(frag);
  updateTiles();

  if (!n) els.freezeHint.textContent = "Nothing to read yet. Type a phrase first.";
  else if (frozen) {
    els.freezeHint.textContent = `Frozen: ${n} ${n === 1 ? "letter" : "letters"}. Copy the CSS to reuse these exact shapes.`;
    els.cssOut.textContent = buildCss();
  } else els.freezeHint.textContent = "Live values for every letter. Freeze to hold them, then copy them as CSS.";
}

function updateTiles() {
  const tiles = state.tiles;
  if (!tiles.length) return;
  const vals = axisValues();
  for (let i = 0; i < tiles.length; i++) {
    const a = vals[i];
    const t = tiles[i];
    if (!a) continue;
    t.ch.style.fontWeight = String(a.wght);
    t.ch.style.fontStretch = `${a.wdth}%`;
    t.w.textContent = String(a.wght);
    t.d.textContent = String(Math.round(a.wdth));
    t.sr.textContent = state.frozen ? `${t.label}: weight ${a.wght}, width ${a.wdth}%` : "";
  }
}

function buildCss() {
  const vals = axisValues();
  const safe = state.phrase.replace(/\*\//g, "* /");
  const markup = state.glyphs.map((ch) => `<span>${ch.replace(/</g, "&lt;")}</span>`).join("");
  const out = [
    `/* Loud Type: "${safe}", frozen on type.adelia.cc */`,
    `/* <p class="loud-type">${markup.replace(/\*\//g, "* /")}</p> */`,
    ".loud-type {",
    '  font-family: "Bricolage Grotesque", sans-serif;',
    "}",
    ".loud-type > span {",
    "  display: inline-block;",
    "  white-space: pre;",
    "}",
  ];
  let li = 0;
  state.glyphs.forEach((ch, gi) => {
    if (isSpace(ch)) return;
    const a = vals[li++];
    out.push(`.loud-type > span:nth-child(${gi + 1}) { font-variation-settings: "wght" ${a.wght}, "wdth" ${a.wdth}; } /* ${ch === "*" ? "asterisk" : ch} */`);
  });
  return out.join("\n");
}

function legacyCopy(text) {
  const active = document.activeElement;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (active && active.focus) active.focus();
    return ok;
  } catch {
    if (active && active.focus) active.focus();
    return false;
  }
}

function announceCopy(text) {
  els.copyStatus.textContent = "";
  setTimeout(() => {
    els.copyStatus.textContent = text;
  }, 60);
}

let copyTimer = 0;
async function copyCss() {
  if (!state.frozen || !state.labels.length) return;
  const css = buildCss();
  els.cssOut.textContent = css;
  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(css);
      ok = true;
    }
  } catch {}
  if (!ok) ok = legacyCopy(css);
  clearTimeout(copyTimer);
  if (ok) {
    els.copyLabel.textContent = "Copied ✓";
    announceCopy("CSS copied to the clipboard.");
    copyTimer = setTimeout(() => (els.copyLabel.textContent = "Copy CSS"), 1800);
  } else {
    els.cssDetails.open = true;
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(els.cssOut);
    sel.removeAllRanges();
    sel.addRange(range);
    announceCopy("Copying is blocked here. The CSS is shown and selected below, so you can copy it yourself.");
  }
}

/* ---------- Events ---------- */
function updateCount() {
  els.count.textContent = `${els.phrase.value.length}/${MAX_CHARS}`;
}

els.phrase.addEventListener("input", () => {
  const v = cleanPhrase(els.phrase.value);
  if (v !== els.phrase.value) els.phrase.value = v;
  state.phrase = v;
  els.wordText.textContent = v.trim() ? v : "empty, type a phrase";
  updateCount();
  queueBuild();
});

els.phrase.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.phrase.blur();
});

function syncSens() {
  state.sens = els.sens.valueAsNumber / 100;
  els.sensOut.textContent = `${els.sens.value}%`;
  els.sens.style.setProperty("--pct", `${els.sens.value}%`);
}
els.sens.addEventListener("input", syncSens);

document.querySelectorAll('input[name="colourway"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) els.stage.dataset.colourway = radio.value;
  });
});

modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const m = btn.dataset.mode;
    if (m === "demo" && reduced) {
      setStatus("Demo is off because your device asks for reduced motion. Cursor and Microphone still work.");
      return;
    }
    if (m === state.mode) {
      if (m === "mic") stopListening();
      else if (m === "demo") {
        state.autoDemo = false;
        updateHint();
      }
      return;
    }
    setMode(m);
  });
});

els.stopStage.addEventListener("click", stopListening);
els.stopCard.addEventListener("click", stopListening);
els.freeze.addEventListener("click", () => setFrozen(!state.frozen));
els.copy.addEventListener("click", copyCss);

// Pointer: cursor proximity, touch drags, and click or tap to clap.
const stage = els.stage;
function trackPointer(e) {
  const p = state.pointer;
  const now = performance.now();
  if (p.t && p.inside) {
    const dtp = Math.max(8, now - p.t);
    const inst = (Math.hypot(e.clientX - p.x, e.clientY - p.y) / dtp) * 1000;
    p.speed = p.speed * 0.6 + inst * 0.4;
  }
  p.x = e.clientX;
  p.y = e.clientY;
  p.t = now;
  p.inside = true;
  p.type = e.pointerType || "mouse";
  state.kbIndex = -1;
  const kind = p.type === "touch" ? "touch" : "fine";
  if (kind !== state.pointerKind) {
    state.pointerKind = kind;
    updateHint();
  }

  const showLens = state.mode === "cursor" && p.type !== "touch" && !state.frozen;
  els.lens.classList.toggle("is-on", showLens);
  if (showLens) {
    const r = stage.getBoundingClientRect();
    const size = Math.round(state.fontSize * (0.5 + 0.9 * state.sens) * 2.2);
    els.lens.style.width = `${size}px`;
    els.lens.style.height = `${size}px`;
    els.lens.style.transform = `translate(${(e.clientX - r.left - size / 2).toFixed(1)}px, ${(e.clientY - r.top - size / 2).toFixed(1)}px)`;
  }
}

stage.addEventListener("pointerenter", trackPointer);
stage.addEventListener("pointermove", (e) => {
  trackPointer(e);
  takeOverDemo();
});
stage.addEventListener("pointerleave", (e) => {
  if (e.pointerType === "touch" && state.pointer.down) return;
  state.pointer.inside = false;
  state.pointer.leftAt = performance.now();
  els.lens.classList.remove("is-on");
});
stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  trackPointer(e);
  state.pointer.down = true;
  takeOverDemo();
  clap(e.clientX, e.clientY);
});
function release(e) {
  const p = state.pointer;
  if (!p.down) return;
  p.down = false;
  if (e.pointerType === "touch") {
    p.inside = false;
    p.leftAt = performance.now();
  }
}
window.addEventListener("pointerup", release);
window.addEventListener("pointercancel", release);

// Keyboard: arrows move a virtual cursor, Space or Enter claps, F freezes.
stage.addEventListener("keydown", (e) => {
  if (e.target !== stage || e.altKey || e.ctrlKey || e.metaKey) return;
  const n = state.labels.length;
  const moveTo = (index) => {
    if (!n || state.mode === "mic") return;
    if (state.mode === "demo") setMode("cursor");
    state.kbIndex = clamp(index, 0, n - 1);
  };
  switch (e.key) {
    case "ArrowRight":
      moveTo(state.kbIndex < 0 ? 0 : state.kbIndex + 1);
      break;
    case "ArrowLeft":
      moveTo(state.kbIndex < 0 ? n - 1 : state.kbIndex - 1);
      break;
    case "Home":
      moveTo(0);
      break;
    case "End":
      moveTo(n - 1);
      break;
    case " ":
    case "Enter": {
      if (!n) return;
      readCenters();
      let x;
      let y;
      if (state.kbIndex >= 0) {
        x = state.centers[2 * state.kbIndex];
        y = state.centers[2 * state.kbIndex + 1];
      } else {
        const r = els.box.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
      clap(x, y);
      break;
    }
    case "f":
    case "F":
      setFrozen(!state.frozen);
      break;
    case "Escape":
      if (state.kbIndex < 0) return;
      state.kbIndex = -1;
      break;
    default:
      return;
  }
  e.preventDefault();
});
stage.addEventListener("blur", () => {
  state.kbIndex = -1;
});

// Layout, fonts, theme and motion preferences.
if ("ResizeObserver" in window) new ResizeObserver(queueRelayout).observe(els.box);
else window.addEventListener("resize", queueRelayout);

if (document.fonts) {
  const refit = () => {
    widthCache.clear();
    relayout();
    meter.draw(normalised(), state.labels, 0);
  };
  document.fonts
    .load('800 100px "Bricolage Grotesque Variable"', "Aa")
    .then(refit)
    .catch(() => {});
  document.fonts.addEventListener?.("loadingdone", refit);
}

// The meter is a canvas, so it re-reads the tokens whenever the theme flips (by the toggle or not).
const repaintMeter = () => {
  meter.readColors();
  meter.draw(normalised(), state.labels, 0);
};
lab.onThemeChange(repaintMeter);
if ("MutationObserver" in window) {
  new MutationObserver(repaintMeter).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

const onReducedChange = () => {
  reduced = reducedMQ.matches;
  syncDemoAvailability();
  if (reduced && state.mode === "demo") setMode("cursor");
};
if (reducedMQ.addEventListener) reducedMQ.addEventListener("change", onReducedChange);
finePointer.addEventListener?.("change", () => {
  state.pointerKind = finePointer.matches ? "fine" : "touch";
  updateHint();
});

// Stop the microphone when the page goes away.
window.addEventListener("pagehide", () => {
  if (state.micState !== "off") stopMic(null);
});

/* ---------- Start ---------- */
function init() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get("text");
  const initial = fromUrl != null ? cleanPhrase(fromUrl) : els.phrase.value ? cleanPhrase(els.phrase.value) : DEFAULT_PHRASE;
  state.phrase = initial;
  els.phrase.value = initial;
  els.wordText.textContent = initial.trim() ? initial : "empty, type a phrase";
  updateCount();

  syncSens();
  state.pointerKind = finePointer.matches ? "fine" : "touch";
  const checked = document.querySelector('input[name="colourway"]:checked');
  if (checked) els.stage.dataset.colourway = checked.value;

  build();
  syncDemoAvailability();
  syncMicUI();
  setMode(reduced ? "cursor" : "demo", { auto: true });
  requestAnimationFrame((now) => {
    last = now;
    tick(now);
  });
}

init();
