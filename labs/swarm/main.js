/*
 * Agent Swarm: page wiring. Loop, controls, keyboard, stats, shared-memory log, announcer.
 */
import { Swarm } from "./swarm.js";
import { Renderer } from "./render.js";

const lab = window.lab;
const $ = (id) => document.getElementById(id);

const stage = $("stage");
const canvas = $("swarm-canvas");
const ui = {
  play: $("btn-play"),
  playLabel: $("btn-play-label"),
  drop: $("btn-drop"),
  burst: $("btn-burst"),
  msgs: $("btn-msgs"),
  reset: $("btn-reset"),
  gate: $("gate"),
  gatePlay: $("gate-play"),
  statusText: $("status-text"),
  statusAgents: $("status-agents"),
  agents: $("in-agents"),
  radius: $("in-radius"),
  chaos: $("in-chaos"),
  outAgents: $("out-agents"),
  outRadius: $("out-radius"),
  outChaos: $("out-chaos"),
  done: $("stat-done"),
  mps: $("stat-mps"),
  hops: $("stat-hops"),
  time: $("stat-time"),
  timeUnit: $("stat-time-unit"),
  count: $("stat-agents"),
  flight: $("stat-flight"),
  sparkLine: $("spark-line"),
  sparkArea: $("spark-area"),
  memory: $("memory-list"),
  live: $("live"),
};

/* ---------- Simulation + renderer ---------- */
const swarm = new Swarm(onSimEvent);
const renderer = new Renderer(canvas, swarm, lab);
swarm.halfWidthOf = (label) => renderer.chipHalf(label);

let reduced = lab.reducedMotion;
let userPaused = reduced;
let pageVisible = !document.hidden;
let onScreen = true;
let rafId = 0;
let last = 0;

function applyMotion() {
  swarm.timeScale = reduced ? 0.45 : 1;
  swarm.fx = !reduced;
  renderer.fx = !reduced;
}
applyMotion();

const running = () => !userPaused && pageVisible && onScreen;

function frame(now) {
  rafId = 0;
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (running()) swarm.update(dt);
  renderer.draw(now);
  tickStats(now);
  if (running() || now < renderer.previewUntil) rafId = requestAnimationFrame(frame);
}

function requestRender() {
  if (rafId) return;
  last = performance.now();
  rafId = requestAnimationFrame(frame);
}

/* ---------- Sizing ---------- */
function measure() {
  // The canvas fills the stage inside its hairline border.
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  swarm.resize(w, h);
  renderer.setSize(w, h, dpr);
  requestRender();
}

function defaultCount() {
  const vw = window.innerWidth;
  if (vw < 520) return 80;
  if (vw < 900) return 140;
  return 220;
}

/* ---------- Announcer (polite, throttled) ---------- */
let lastSay = 0;
let sayTimer = 0;
let pendingNote = "";
let delivered = [];

function say(note) {
  if (note) pendingNote = note;
  if (sayTimer) return;
  const wait = Math.max(0, lastSay + 3200 - performance.now());
  sayTimer = setTimeout(flushSay, wait);
}

function flushSay() {
  sayTimer = 0;
  const parts = [];
  if (pendingNote) parts.push(pendingNote);
  if (delivered.length === 1) {
    const d = delivered[0];
    parts.push(`Task delivered: ${d.label}, ${hopsText(d.hops)} in ${d.secs.toFixed(1)} seconds.`);
  } else if (delivered.length > 1) {
    parts.push(`${delivered.length} tasks delivered.`);
  }
  if (delivered.length) parts.push(`${swarm.stats.done} done in total.`);
  pendingNote = "";
  delivered = [];
  if (!parts.length) return;
  lastSay = performance.now();
  ui.live.textContent = "";
  setTimeout(() => {
    ui.live.textContent = parts.join(" ");
  }, 60);
}

const hopsText = (n) => `${n} ${n === 1 ? "hop" : "hops"}`;

/* ---------- Shared memory (blackboard) ---------- */
const memory = [];
let memoryTimer = 0;
let memorySeq = 0;
const GLYPH = { drop: "+", pickup: "↑", handoff: "→", deliver: "✓", info: "·" };

function log(type, text, key) {
  // One live handoff line per task: a relay updates its line instead of flooding the board.
  if (key) {
    const at = memory.findIndex((e) => e.key === key);
    if (at >= 0) memory.splice(at, 1);
  }
  memory.unshift({ type, text, key, id: ++memorySeq });
  if (memory.length > 6) memory.length = 6;
  if (!memoryTimer) memoryTimer = setTimeout(renderMemory, 120);
}

function renderMemory() {
  memoryTimer = 0;
  const frag = document.createDocumentFragment();
  for (const e of memory) {
    const li = document.createElement("li");
    li.className = `ev ev--${e.type}`;
    if (e.id > renderMemory.lastId) li.classList.add("is-new");
    const g = document.createElement("span");
    g.className = "ev__glyph";
    g.setAttribute("aria-hidden", "true");
    g.textContent = GLYPH[e.type] || "•";
    const t = document.createElement("span");
    t.className = "ev__text";
    t.textContent = e.text;
    t.title = e.text;
    li.append(g, t);
    frag.append(li);
  }
  renderMemory.lastId = memory.length ? memory[0].id : 0;
  ui.memory.replaceChildren(frag);
}
renderMemory.lastId = 0;

function onSimEvent(type, d) {
  if (type === "drop") log("drop", `dropped '${d.label}'`);
  else if (type === "pickup") log("pickup", `${d.agent} picked up '${d.label}'`);
  else if (type === "handoff") log("handoff", `handoff ${d.from} → ${d.to} · hop ${d.hops}`, `h${d.id}`);
  else if (type === "deliver") {
    log("deliver", `'${d.label}' delivered in ${hopsText(d.hops)}`);
    delivered.push(d);
    say();
    statsDirty = true;
  }
}

/* ---------- Stats tiles ---------- */
let statsDirty = true;
let lastStats = 0;
let lastSample = 0;
let mps = 0;
const sparkData = new Array(30).fill(0);

function setText(el, value) {
  const s = String(value);
  if (el.textContent !== s) el.textContent = s;
}

function tickStats(now) {
  if (running() && now - lastSample >= 500) {
    const elapsed = lastSample ? (now - lastSample) / 1000 : 0.5;
    lastSample = now;
    const rate = swarm.msgCount / Math.max(0.25, elapsed);
    swarm.msgCount = 0;
    mps = mps * 0.4 + rate * 0.6;
    sparkData.push(mps);
    sparkData.shift();
    drawSparkline();
    statsDirty = true;
  }
  if (!statsDirty && now - lastStats < 250) return;
  statsDirty = false;
  lastStats = now;
  const st = swarm.stats;
  setText(ui.done, st.done);
  setText(ui.mps, Math.round(mps));
  setText(ui.hops, st.done ? (st.hops / st.done).toFixed(1) : "–");
  setText(ui.time, st.done ? (st.secs / st.done).toFixed(1) : "–");
  setText(ui.timeUnit, st.done ? "s" : "");
  setText(ui.count, swarm.agents.length);
  setText(ui.flight, swarm.openCount());
}

function drawSparkline() {
  const max = Math.max(10, ...sparkData);
  const n = sparkData.length;
  const pts = sparkData.map((v, i) => `${((i / (n - 1)) * 100).toFixed(1)},${(28 - (v / max) * 24).toFixed(1)}`);
  ui.sparkLine.setAttribute("points", pts.join(" "));
  ui.sparkArea.setAttribute("d", `M0,30 L${pts.join(" L")} L100,30 Z`);
}

/* ---------- Status + play state ---------- */
function syncState() {
  const isRunning = running();
  stage.dataset.state = userPaused ? "paused" : isRunning ? "running" : "idle";
  ui.playLabel.textContent = userPaused ? "Play" : "Pause";
  ui.play.dataset.state = userPaused ? "paused" : "playing";
  ui.statusText.textContent = userPaused ? "Paused" : "Live";
  ui.statusAgents.textContent = `· ${swarm.agents.length} agents`;
  if (isRunning) {
    lastSample = performance.now();
    swarm.msgCount = 0;
    requestRender();
  }
}

function setPaused(p) {
  userPaused = p;
  if (!p) ui.gate.hidden = true;
  syncState();
  requestRender();
}

function flash(btn) {
  btn.classList.remove("is-flash");
  void btn.offsetWidth;
  btn.classList.add("is-flash");
}

/* ---------- Actions ---------- */
function drop(x, y, announce = true) {
  const task = swarm.dropTask(x, y);
  if (!task) {
    log("info", "board full: wait for a delivery");
    say("The board is full. Wait for a delivery.");
    return null;
  }
  if (announce) say(`Task dropped: ${task.label}.`);
  statsDirty = true;
  requestRender();
  return task;
}

function dropRandom() {
  const p = swarm.randomPoint();
  return drop(p.x, p.y);
}

let burstTimers = [];
function burst() {
  burstTimers.forEach(clearTimeout);
  burstTimers = [];
  let dropped = 0;
  for (let i = 0; i < 5; i++) {
    burstTimers.push(
      setTimeout(() => {
        const p = swarm.randomPoint();
        if (drop(p.x, p.y, false)) dropped++;
        if (i === 4 && dropped) say(`${dropped} tasks dropped.`);
      }, i * (reduced ? 160 : 110))
    );
  }
}

function reset() {
  burstTimers.forEach(clearTimeout);
  burstTimers = [];
  swarm.reset(Number(ui.agents.value));
  memory.length = 0;
  log("info", "memory cleared, swarm respawned");
  sparkData.fill(0);
  mps = 0;
  drawSparkline();
  statsDirty = true;
  say("Swarm reset.");
  syncState();
  requestRender();
}

/* ---------- Controls ---------- */
function setRangeFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const p = ((Number(input.value) - min) / (max - min)) * 100;
  input.style.setProperty("--p", `${p}%`);
}

function updateCanvasLabel() {
  canvas.setAttribute(
    "aria-label",
    `Agent Swarm simulation. ${swarm.agents.length} agents, drawn as small magenta dots, flock across the stage. ` +
      "Tasks you drop are spotted, gossiped about along blue message lines and carried, hand to hand, " +
      "to the magenta Done hub at the bottom."
  );
}

function onAgents() {
  const n = Number(ui.agents.value);
  ui.outAgents.textContent = String(n);
  ui.agents.setAttribute("aria-valuetext", `${n} agents`);
  setRangeFill(ui.agents);
  swarm.setAgentCount(n);
  ui.statusAgents.textContent = `· ${n} agents`;
  updateCanvasLabel();
  statsDirty = true;
  requestRender();
}

function onRadius() {
  const r = Number(ui.radius.value);
  ui.outRadius.textContent = `${r} px`;
  ui.radius.setAttribute("aria-valuetext", `${r} pixels`);
  setRangeFill(ui.radius);
  swarm.gossipRadius = r;
  renderer.previewUntil = performance.now() + 1600;
  requestRender();
}

function onChaos() {
  const c = Number(ui.chaos.value);
  ui.outChaos.textContent = `${c}%`;
  ui.chaos.setAttribute("aria-valuetext", `${c} percent`);
  setRangeFill(ui.chaos);
  swarm.chaos = c / 100;
}

ui.agents.addEventListener("input", onAgents);
ui.radius.addEventListener("input", onRadius);
ui.chaos.addEventListener("input", onChaos);

ui.play.addEventListener("click", () => setPaused(!userPaused));
ui.gatePlay.addEventListener("click", () => {
  setPaused(false);
  ui.play.focus();
});
ui.drop.addEventListener("click", dropRandom);
ui.burst.addEventListener("click", burst);
ui.reset.addEventListener("click", reset);
ui.msgs.addEventListener("click", () => {
  renderer.showMessages = !renderer.showMessages;
  ui.msgs.setAttribute("aria-pressed", String(renderer.showMessages));
  stage.dataset.messages = renderer.showMessages ? "on" : "off";
  requestRender();
});

/* ---------- Pointer: tap or click the stage to drop a task ---------- */
let down = null;
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
});
canvas.addEventListener("pointerup", (e) => {
  if (!down || e.pointerId !== down.id) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const held = performance.now() - down.t;
  down = null;
  if (moved > 12 || held > 700) return;
  const r = canvas.getBoundingClientRect();
  drop(e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener("pointercancel", () => {
  down = null;
});
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  const r = canvas.getBoundingClientRect();
  renderer.hover = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (!running()) requestRender();
});
canvas.addEventListener("pointerleave", () => {
  renderer.hover = null;
  if (!running()) requestRender();
});

/* ---------- Keyboard: Space, T, R ---------- */
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  const el = e.target;
  const tag = el && el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el && el.isContentEditable)) return;
  if (e.key === " " || e.code === "Space") {
    // Space on a focused button or link keeps its native meaning.
    if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return;
    e.preventDefault();
    setPaused(!userPaused);
    flash(ui.play);
  } else if (e.key === "t" || e.key === "T") {
    dropRandom();
    flash(ui.drop);
  } else if (e.key === "r" || e.key === "R") {
    reset();
    flash(ui.reset);
  }
});

/* ---------- Visibility: pause when hidden or scrolled away ---------- */
document.addEventListener("visibilitychange", () => {
  pageVisible = !document.hidden;
  syncState();
});
if ("IntersectionObserver" in window) {
  new IntersectionObserver(
    (entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      syncState();
    },
    { threshold: 0 }
  ).observe(stage);
}

/* ---------- Theme + motion preference ---------- */
// Canvas colours follow the tokens: re-read them whenever <html data-theme> changes, whether the
// lab bar's toggle or anything else set it.
let themeSeen = document.documentElement.getAttribute("data-theme");
new MutationObserver(() => {
  const next = document.documentElement.getAttribute("data-theme");
  if (next === themeSeen) return;
  themeSeen = next;
  renderer.readTheme();
  requestRender();
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
const rm = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
rm?.addEventListener?.("change", () => {
  reduced = rm.matches;
  applyMotion();
  requestRender();
});

/* ---------- Start ---------- */
document.documentElement.classList.toggle("is-touch", lab.isTouch);
ui.agents.value = String(defaultCount());
measure();
swarm.reset(Number(ui.agents.value));
onAgents();
onRadius();
renderer.previewUntil = 0;
onChaos();
stage.dataset.messages = "on";
if (userPaused) ui.gate.hidden = false;
log("info", "swarm online, waiting for tasks");
syncState();
new ResizeObserver(measure).observe(stage);

// Canvas text uses the body face; redraw once it is in.
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('600 12px "Bricolage Grotesque Variable"'),
    document.fonts.load('700 12px "Bricolage Grotesque Variable"'),
  ])
    .catch(() => {})
    .then(() => {
      renderer.fontsChanged();
      requestRender();
    });
}

// Debug and test hook (not used by the page itself).
window.__swarm = { swarm, renderer, drop, dropRandom, setPaused };
