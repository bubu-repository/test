/*
 * Magenta Machine: UI wiring.
 * Colour math lives in color.js, harmony recipes and pairing rules in palette.js.
 */
import { contrast, floorRatio, formatOklch, grade, hexToOklch, normalizeHex } from "./color.js";
import {
  BLACK,
  INK,
  MAGENTA,
  MODES,
  allPairs,
  deriveSwatch,
  extremes,
  modeName,
  passesAA,
  planWidget,
  textOn,
} from "./palette.js";

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const lab = window.lab || { token: () => "", reducedMotion: false, onThemeChange() {} };
const tok = (name, fallback) => normalizeHex(lab.token(name) || "") || fallback;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (ratio) => floorRatio(ratio).toFixed(2);
const SITE = "https://palette.adelia.cc";

/* The site's own colours, straight from the design tokens. */
const anchorDefault = tok("--accent", MAGENTA);
const brand = {
  sky: tok("--sky", "#8CC8FF"),
  sun: tok("--sun", "#FFD23F"),
  lime: tok("--lime", "#CDF23C"),
  midnight: tok("--on-fill", INK),
};

/* ---------- State ---------- */
const state = {
  mode: "sky",
  colors: [anchorDefault, brand.sky, brand.sun, brand.lime, brand.midnight],
  roles: ["Anchor", "Sky", "Sun", "Lime", "Midnight"],
  locked: [true, false, false, false, false],
  /** Whether a slot follows the anchor (false after a shared link restored an exact colour). */
  derived: [false, true, true, true, true],
  seeds: Array.from({ length: 5 }, () => [0.5, 0.5, 0.5]),
  global: 0.5,
  hideFailing: false,
  tab: "css",
};

/* ---------- Elements ---------- */
const els = {
  modes: $("#modes"),
  swatches: $("#swatches"),
  picker: $("#anchor-picker"),
  hex: $("#anchor-hex"),
  anchorMsg: $("#anchor-msg"),
  reset: $("#reset-anchor"),
  generate: $("#generate"),
  matrix: $("#matrix"),
  matrixScroll: $("#matrix-scroll"),
  matrixCard: $(".matrix-card"),
  summary: $("#matrix-summary"),
  hideFailing: $("#hide-failing"),
  stage: $("#stage"),
  code: $("#code"),
  panel: $("#panel-code"),
  tabs: $$('[role="tab"]'),
  copyCode: $("#copy-code"),
  copyLink: $("#copy-link"),
  shareUrl: $("#share-url"),
  toast: $("#toast"),
  announcer: $("#announcer"),
  strip: $$(".strip__chip"),
};

/* ---------- Announcements and feedback ---------- */
let announceTimer;
function announce(message) {
  clearTimeout(announceTimer);
  els.announcer.textContent = "";
  // A fresh text node makes screen readers repeat identical messages.
  announceTimer = setTimeout(() => (els.announcer.textContent = message), 40);
}

let toastTimer;
function toast(message) {
  $("span", els.toast).textContent = message;
  els.toast.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-on"), 1700);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    /* fall through to the legacy path */
  }
  const active = document.activeElement;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.append(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {
    ok = false;
  }
  ta.remove();
  if (active && typeof active.focus === "function") active.focus({ preventScroll: true });
  return ok;
}

function flashCopied(button) {
  const label = $("span", button);
  if (!button.dataset.label) button.dataset.label = label.textContent;
  label.textContent = "Copied";
  button.classList.add("is-copied");
  clearTimeout(button._t);
  button._t = setTimeout(() => {
    label.textContent = button.dataset.label;
    button.classList.remove("is-copied");
  }, 1400);
}

async function copyWithFeedback(text, message, button) {
  const ok = await copyText(text);
  if (ok) {
    if (button) flashCopied(button);
    toast(message);
    announce(message);
  } else {
    announce("Copy failed. Select the text and copy it manually.");
    toast("Copy failed");
  }
}

/* ---------- Generation ---------- */
const rand = () => Math.random();

function deriveSlot(i) {
  const A = hexToOklch(state.colors[0]);
  const { hex, role } = deriveSwatch(state.mode, i, A, state.seeds[i], state.global, brand);
  state.colors[i] = hex;
  state.roles[i] = role;
  state.derived[i] = true;
}

/** New seeds for every unlocked swatch. Returns the indexes that changed. */
function regenerate() {
  state.global = rand();
  const changed = [];
  for (let i = 1; i < 5; i++) {
    if (state.locked[i]) continue;
    state.seeds[i] = [rand(), rand(), rand()];
    deriveSlot(i);
    changed.push(i);
  }
  return changed;
}

function generate(reason = "Generated") {
  const free = state.locked.filter((l) => !l).length;
  if (!free) {
    announce("Every swatch is locked. Unlock one to generate.");
    toast("Every swatch is locked");
    wobble(els.generate);
    return;
  }
  const changed = regenerate();
  render({ animate: changed });
  const locked = state.locked.slice(1).filter(Boolean).length;
  announce(
    `${reason} a ${modeName(state.mode)} palette: ${state.colors.join(", ")}.` +
      (locked ? ` ${locked} locked swatch${locked > 1 ? "es" : ""} kept.` : "")
  );
}

function wobble(el) {
  el.classList.remove("is-wobble");
  void el.offsetWidth;
  el.classList.add("is-wobble");
}

function setAnchor(hex, { animate = false, announceIt = false } = {}) {
  const next = normalizeHex(hex);
  if (!next) return;
  state.colors[0] = next;
  // The anchor drives every unlocked, derived swatch with the same seeds, so dragging the
  // picker morphs the palette instead of reshuffling it.
  for (let i = 1; i < 5; i++) if (!state.locked[i] && state.derived[i]) deriveSlot(i);
  syncAnchorInputs();
  render({ animate: animate ? [0, 1, 2, 3, 4] : [] });
  if (announceIt) announce(`Anchor set to ${next}. Unlocked swatches follow it.`);
}

function syncAnchorInputs() {
  const hex = state.colors[0];
  if (els.picker.value.toLowerCase() !== hex.toLowerCase()) els.picker.value = hex.toLowerCase();
  if (document.activeElement !== els.hex) els.hex.value = hex;
  els.hex.removeAttribute("aria-invalid");
  els.anchorMsg.textContent = "";
}

function toggleLock(i) {
  if (i === 0) {
    announce("Swatch 1 is the anchor and always stays locked. Change it with the anchor picker.");
    toast("The anchor is always locked");
    wobble($(`.swatch[data-i="0"] [data-act="lock"]`));
    return;
  }
  state.locked[i] = !state.locked[i];
  renderSwatch(i);
  renderExport();
  announce(`Swatch ${i + 1}, ${state.colors[i]}, ${state.locked[i] ? "locked" : "unlocked"}.`);
}

/* ---------- Building the UI ---------- */
function buildModes() {
  els.modes.innerHTML = MODES.map(
    (m) => `
    <label class="pill">
      <input type="radio" name="mode" value="${m.id}"${m.id === state.mode ? " checked" : ""} />
      <span>${esc(m.name)}</span>
    </label>`
  ).join("");
}

function buildSwatches() {
  els.swatches.innerHTML = state.colors
    .map(
      (_, i) => `
    <li class="swatch${i === 0 ? " swatch--anchor" : ""}" data-i="${i}" style="--i:${i}">
      <div class="swatch__card">
      <div class="swatch__tile">
        <span class="swatch__tag"><span class="lab-label">0${i + 1}</span><span class="swatch__role lab-label"></span></span>
        <svg class="swatch__lockmark" width="18" height="18" aria-hidden="true"><use href="#i-lock"/></svg>
        <span class="swatch__hex"></span>
      </div>
      <div class="swatch__meta">
        <dl class="swatch__lch">
          <div><dt class="lab-label">L</dt><dd data-k="l"></dd></div>
          <div><dt class="lab-label">C</dt><dd data-k="c"></dd></div>
          <div><dt class="lab-label">H</dt><dd data-k="h"></dd></div>
        </dl>
        <p class="swatch__sub lab-label" id="txt-${i}">Text on it</p>
        <ul class="swatch__text" aria-labelledby="txt-${i}"></ul>
        <div class="swatch__actions">
          <button type="button" class="sw-btn sw-btn--lock" data-act="lock" aria-pressed="false" aria-label="Lock swatch ${i + 1}" aria-keyshortcuts="${i + 1}"${i === 0 ? ' aria-disabled="true"' : ""}>
            <svg class="i-on" width="16" height="16" aria-hidden="true"><use href="#i-lock"/></svg>
            <svg class="i-off" width="16" height="16" aria-hidden="true"><use href="#i-unlock"/></svg>
            <span>${i === 0 ? "Anchor" : "Lock"}</span>
          </button>
          <button type="button" class="sw-btn" data-act="copy">
            <svg width="16" height="16" aria-hidden="true"><use href="#i-copy"/></svg>
            <span>Copy</span>
          </button>
        </div>
      </div>
      </div>
    </li>`
    )
    .join("");
  // The anchor's toggle is pressed for good; its name says why.
  $(`.swatch[data-i="0"] [data-act="lock"]`).setAttribute("aria-label", "Anchor lock, swatch 1, always locked");
}

/* ---------- Rendering ---------- */
function badge(g) {
  return `<span class="badge" data-grade="${g}">${g}</span>`;
}

function renderSwatch(i) {
  const li = $(`.swatch[data-i="${i}"]`);
  const hex = state.colors[i];
  const on = textOn(hex);
  const lch = hexToOklch(hex);
  li.style.setProperty("--sw", hex);
  li.style.setProperty("--sw-on", on.hex);
  li.classList.toggle("is-locked", state.locked[i]);
  $(".swatch__hex", li).textContent = hex;
  $(".swatch__role", li).textContent = state.roles[i] || "Custom";
  $('[data-k="l"]', li).textContent = `${(lch.l * 100).toFixed(1)}%`;
  $('[data-k="c"]', li).textContent = lch.c.toFixed(3);
  $('[data-k="h"]', li).textContent = `${lch.h.toFixed(0)}°`;

  const rows = [on.ink, on.white];
  if (on.fallback) rows.push({ name: "Black", hex: BLACK, ratio: on.ratio });
  $(".swatch__text", li).innerHTML = rows
    .map((r) => {
      const g = grade(r.ratio);
      const pass = passesAA(r.ratio);
      const best = r.hex === on.hex;
      return `<li class="txt${pass ? " is-pass" : " is-fail"}${best ? " is-best" : ""}">
        <span class="txt__sample" style="background:${hex};color:${r.hex}" aria-hidden="true">Aa</span>
        <span class="txt__name">${r.name}</span>
        <span class="txt__ratio">${fmt(r.ratio)}</span>
        ${badge(g)}${best ? '<span class="sr-only">, suggested</span>' : ""}
      </li>`;
    })
    .join("");

  const lock = $('[data-act="lock"]', li);
  lock.setAttribute("aria-pressed", String(state.locked[i]));
  const copy = $('[data-act="copy"]', li);
  copy.setAttribute("aria-label", `Copy ${hex}`);
}

function popTiles(indexes) {
  indexes.forEach((i) => {
    const tile = $(`.swatch[data-i="${i}"] .swatch__tile`);
    if (!tile) return;
    tile.classList.remove("is-pop");
    void tile.offsetWidth;
    tile.classList.add("is-pop");
  });
}

/** The header strip: the live palette, flat. */
function renderStrip() {
  els.strip.forEach((t, i) => t.style.setProperty("--sw", state.colors[i]));
}

function renderMatrix() {
  const { colors } = state;
  const pairs = allPairs(colors);
  const counts = { AAA: 0, AA: 0, "AA Large": 0, Fail: 0 };
  pairs.forEach((p) => counts[p.grade]++);
  const textPass = counts.AAA + counts.AA;
  els.summary.innerHTML =
    `<b>${textPass}</b> of ${pairs.length} pairs pass AA for body text.` +
    ` <span class="summary-chips">${Object.entries(counts)
      .map(([g, n]) => `<span class="summary-chip">${badge(g)}<b>${n}</b></span>`)
      .join("")}</span>`;

  const head = `<thead><tr>
    <td class="matrix__corner"><span class="lab-label">Text →</span><span class="lab-label">On ↓</span></td>
    ${colors
      .map(
        (hex, i) => `<th scope="col"><span class="hdr"><span class="hdr__chip" style="background:${hex}"></span><span class="hdr__hex"><span class="sr-only">Text </span>${hex}</span></span></th>`
      )
      .join("")}
  </tr></thead>`;

  const body = colors
    .map((bg, b) => {
      const cells = colors
        .map((fg, t) => {
          if (b === t) return `<td class="cell cell--same"><span class="cell__same" aria-hidden="true"></span><span class="sr-only">Same colour</span></td>`;
          const ratio = contrast(fg, bg);
          const g = grade(ratio);
          const fail = g === "Fail";
          if (fail && state.hideFailing) {
            return `<td class="cell is-hidden" data-grade="Fail"><span class="cell__ghost" aria-hidden="true"></span><span class="sr-only">Fails, hidden</span></td>`;
          }
          return `<td class="cell${fail ? " is-fail" : ""}" data-grade="${g}">
            <span class="cell__tile" style="background:${bg};color:${fg}" aria-hidden="true"><span>Aa</span></span>
            <span class="cell__info"><span class="cell__ratio">${fmt(ratio)}</span>${badge(g)}</span>
          </td>`;
        })
        .join("");
      return `<tr><th scope="row"><span class="hdr hdr--row"><span class="hdr__chip" style="background:${bg}"></span><span class="hdr__hex"><span class="sr-only">Background </span>${bg}</span></span></th>${cells}</tr>`;
    })
    .join("");

  els.matrix.innerHTML = `<caption class="sr-only">Contrast ratio of each text colour (columns) on each background colour (rows), with its WCAG 2.x level.</caption>${head}<tbody>${body}</tbody>`;
  els.matrix.classList.toggle("hide-failing", state.hideFailing);
  checkOverflow();
  return { pairs, counts };
}

function legendRow(label, fg, bg, ratio, note = "") {
  return `<li>
    <span class="pair" style="background:${bg.hex};color:${fg.hex}" aria-hidden="true">Aa</span>
    <span class="pair__label">${label}</span>
    <span class="pair__ratio">${fmt(ratio)}</span>${badge(grade(ratio))}${note ? `<span class="pair__note">${note}</span>` : ""}
    <span class="sr-only">: ${fg.hex} on ${bg.hex}</span>
  </li>`;
}

function renderPreview(pairs) {
  const { colors } = state;
  const { light, dark } = extremes(colors);
  const textPass = pairs.filter((p) => passesAA(p.ratio)).length;
  const best = pairs.reduce((m, p) => (p.ratio > m.ratio ? p : m), pairs[0]);
  const bestRatio = floorRatio(best.ratio);

  const widgets = [
    {
      idx: light,
      kicker: "Lightest swatch",
      title: "Palette health",
      body: `${textPass} of ${pairs.length} pairs pass AA. Only those ship.`,
      tag: "WCAG",
      ring: textPass / pairs.length,
      ringLabel: `${Math.round((textPass / pairs.length) * 100)}%`,
      ringName: "Share of passing pairs",
      cta: "Export",
    },
    {
      idx: dark,
      kicker: "Darkest swatch",
      title: "Night shift",
      body: `Best pair reaches ${bestRatio.toFixed(1)}:1. Easy on tired eyes.`,
      tag: grade(best.ratio),
      ring: Math.min(1, best.ratio / 21),
      ringLabel: bestRatio.toFixed(1),
      ringName: "Best ratio out of 21",
      cta: "Keep going",
    },
  ];

  els.stage.innerHTML = widgets
    .map((w, n) => {
      const p = planWidget(colors, w.idx);
      const C = 2 * Math.PI * 25;
      const fb = (x) => (x.fallback ? `Fallback: ${x.label} ${x.hex}` : "");
      return `<figure class="preview">
        <div class="widget" style="--w-bg:${p.bg.hex};--w-title:${p.title.hex};--w-body:${p.body.hex};--w-btn:${p.button.fill.hex};--w-btn-on:${p.button.label.hex};--w-tag:${p.tag.fill.hex};--w-tag-on:${p.tag.label.hex};--w-ring:${p.ring.hex};--w-icon:${p.icon.fill.hex};--w-icon-on:${p.icon.on.hex}">
          <div class="widget__top">
            <span class="widget__icon" aria-hidden="true"><svg width="18" height="18"><use href="#i-grid"/></svg></span>
            <span class="widget__tag">${esc(w.tag)}</span>
          </div>
          <p class="widget__title" role="heading" aria-level="3">${esc(w.title)}</p>
          <p class="widget__body">${esc(w.body)}</p>
          <div class="widget__foot">
            <span class="ring" role="img" aria-label="${esc(w.ringName)}: ${esc(w.ringLabel)}">
              <svg viewBox="0 0 60 60" aria-hidden="true">
                <circle class="ring__track" cx="30" cy="30" r="25" />
                <circle class="ring__bar" cx="30" cy="30" r="25" stroke-dasharray="${(w.ring * C).toFixed(2)} ${C.toFixed(2)}" />
              </svg>
              <span class="ring__label" aria-hidden="true">${esc(w.ringLabel)}</span>
            </span>
            <span class="widget__btn">${esc(w.cta)}</span>
          </div>
        </div>
        <figcaption>
          <p class="preview__cap lab-label">${w.kicker} <span class="preview__hex">${p.bg.hex}</span></p>
          <ul class="pairs" aria-label="Pairs used in the ${n ? "dark" : "light"} widget">
            ${legendRow("Title", p.title, p.bg, p.title.ratio, fb(p.title))}
            ${legendRow("Body", p.body, p.bg, p.body.ratio, fb(p.body))}
            ${legendRow("Button", p.button.label, p.button.fill, p.button.label.ratio, fb(p.button.label))}
            ${legendRow("Tag", p.tag.label, p.tag.fill, p.tag.label.ratio, fb(p.tag.label))}
            ${legendRow("Ring", p.ring, p.bg, contrast(p.ring.hex, p.bg.hex), "shape, 3:1")}
          </ul>
        </figcaption>
      </figure>`;
    })
    .join("");
}

/* ---------- Export ---------- */
function shareHash() {
  return state.colors.map((c) => c.slice(1).toLowerCase()).join("-");
}

function shareLink() {
  const base = /(^|\.)adelia\.cc$/.test(location.hostname) || location.protocol === "file:" ? SITE + "/" : location.origin + location.pathname;
  return `${base}#${shareHash()}`;
}

function exportData() {
  const { colors, roles } = state;
  const swatches = colors.map((hex, i) => {
    const on = textOn(hex);
    const lch = hexToOklch(hex);
    return {
      token: `--palette-${i + 1}`,
      hex,
      role: i === 0 ? "Anchor" : roles[i] || "Custom",
      oklch: [+lch.l.toFixed(4), +lch.c.toFixed(4), +lch.h.toFixed(2)],
      on: on.hex,
      onRatio: floorRatio(on.ratio),
      onLevel: grade(on.ratio),
    };
  });
  const pairs = allPairs(colors)
    .filter((p) => passesAA(p.ratio))
    .sort((a, b) => b.ratio - a.ratio)
    .map((p) => ({ text: `--palette-${p.text + 1}`, background: `--palette-${p.bg + 1}`, ratio: floorRatio(p.ratio), level: p.grade }));
  return { swatches, pairs };
}

function cssText() {
  const { swatches, pairs } = exportData();
  const pad = (s, n) => s + " ".repeat(Math.max(1, n - s.length));
  const lines = [
    `/* Magenta Machine · ${modeName(state.mode)}`,
    ` * ${SITE}/#${shareHash()} */`,
    `:root {`,
  ];
  swatches.forEach((s, i) => {
    const lch = { l: s.oklch[0], c: s.oklch[1], h: s.oklch[2] };
    lines.push(`  ${pad(`--palette-${i + 1}:`, 18)}${s.hex}; /* ${s.role.toLowerCase()} · ${formatOklch(lch)} */`);
    lines.push(`  ${pad(`--on-palette-${i + 1}:`, 18)}${s.on}; /* ${s.onRatio.toFixed(2)}:1 ${s.onLevel} */`);
  });
  lines.push(`}`);
  lines.push(``);
  if (pairs.length) {
    lines.push(`/* Text pairs that pass AA (4.5:1+), text on background.`);
    pairs.forEach((p) => lines.push(` * ${pad(`${p.text} on ${p.background}`, 30)}${p.ratio.toFixed(2)}:1 ${p.level}`));
    lines.push(` * Pairs below 4.5:1 are left out on purpose. */`);
  } else {
    lines.push(`/* No palette pair reaches 4.5:1. Use the --on-palette-* colours for text. */`);
  }
  return lines.join("\n");
}

function jsonText() {
  const { swatches, pairs } = exportData();
  const one = (o) => JSON.stringify(o).replace(/,"/g, ', "').replace(/":/g, '": ').replace(/^\{/, "{ ").replace(/\}$/, " }");
  const lines = [
    "{",
    `  "name": "Magenta Machine",`,
    `  "mode": ${JSON.stringify(modeName(state.mode))},`,
    `  "url": ${JSON.stringify(`${SITE}/#${shareHash()}`)},`,
    `  "swatches": [`,
    swatches.map((s) => `    ${one(s)}`).join(",\n"),
    `  ],`,
    `  "passingPairs": [`,
    pairs.map((p) => `    ${one(p)}`).join(",\n"),
    `  ]`,
    "}",
  ];
  return lines.filter((l) => l !== "").join("\n");
}

/** Light highlighting: comments, custom properties, strings, and a chip before every hex. */
function highlight(src) {
  const re = /(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|(--[a-z0-9-]+)|(#[0-9A-F]{6})\b/g;
  let out = "";
  let last = 0;
  const chip = (hex) => `<span class="hx"><i style="background:${hex}"></i>${hex}</span>`;
  src.replace(re, (m, comment, str, prop, hex, offset) => {
    out += esc(src.slice(last, offset));
    if (comment) out += `<span class="c-comment">${esc(comment)}</span>`;
    else if (str) {
      const inner = str.slice(1, -1);
      if (/^#[0-9A-F]{6}$/.test(inner)) out += `<span class="c-str">"${chip(inner)}"</span>`;
      else if (/^--/.test(inner)) out += `<span class="c-prop">${esc(str)}</span>`;
      else out += `<span class="c-str">${esc(str)}</span>`;
    } else if (prop) out += `<span class="c-prop">${prop}</span>`;
    else if (hex) out += chip(hex);
    last = offset + m.length;
    return m;
  });
  out += esc(src.slice(last));
  return out;
}

function renderExport() {
  const text = state.tab === "css" ? cssText() : jsonText();
  els.code.innerHTML = highlight(text);
  els.code.dataset.raw = text;
  $("span", els.copyCode).textContent = state.tab === "css" ? "Copy CSS" : "Copy JSON";
  els.copyCode.dataset.label = $("span", els.copyCode).textContent;
  els.copyCode.classList.remove("is-copied");
  els.shareUrl.textContent = shareLink();
}

function writeHash() {
  const h = shareHash();
  if (location.hash.slice(1).toLowerCase() === h) return;
  try {
    history.replaceState(null, "", `${location.pathname}${location.search}#${h}`);
  } catch (e) {
    /* sandboxed previews may refuse; the share link still works */
  }
}

/** "#f41b8d-8cc8ff-ffd23f-cdf23c-0f1230" → colours, or null. One to five colours. */
function readHash() {
  const raw = decodeURIComponent(location.hash.slice(1)).trim();
  if (!raw) return null;
  const parts = raw.split(/[-,\s]+/).filter(Boolean);
  if (!parts.length || parts.length > 5) return null;
  const hexes = parts.map(normalizeHex);
  return hexes.every(Boolean) ? hexes : null;
}

function restoreFromHash() {
  const hexes = readHash();
  if (!hexes) return false;
  state.colors[0] = hexes[0];
  for (let i = 1; i < 5; i++) {
    state.locked[i] = false;
    if (hexes[i]) {
      state.colors[i] = hexes[i];
      state.roles[i] = "Shared";
      state.derived[i] = false;
    } else {
      state.seeds[i] = [rand(), rand(), rand()];
      deriveSlot(i);
    }
  }
  syncAnchorInputs();
  return true;
}

/* ---------- Render everything ---------- */
function render({ animate = [] } = {}) {
  for (let i = 0; i < 5; i++) renderSwatch(i);
  if (animate.length) popTiles(animate);
  renderStrip();
  const { pairs } = renderMatrix();
  renderPreview(pairs);
  renderExport();
  writeHash();
}

/* ---------- Matrix overflow hint ---------- */
function checkOverflow() {
  const s = els.matrixScroll;
  const over = s.scrollWidth > s.clientWidth + 2;
  els.matrixCard.classList.toggle("has-overflow", over);
  els.matrixCard.classList.toggle("at-end", !over || s.scrollLeft + s.clientWidth >= s.scrollWidth - 4);
}

/* ---------- Events ---------- */
function isTyping(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName === "INPUT") return !["radio", "checkbox", "color", "button", "submit", "range"].includes(el.type);
  return false;
}

function isControl(el) {
  return !!(el && el.closest && el.closest("input, textarea, select, button, a[href], summary, [role='tab'], [role='button'], [contenteditable='true']"));
}

function bind() {
  els.generate.addEventListener("click", () => generate());

  els.modes.addEventListener("change", (e) => {
    if (e.target.name !== "mode") return;
    state.mode = e.target.value;
    generate("Switched to");
  });

  els.swatches.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const i = Number(btn.closest(".swatch").dataset.i);
    if (btn.dataset.act === "lock") toggleLock(i);
    if (btn.dataset.act === "copy") copyWithFeedback(state.colors[i], `Copied ${state.colors[i]}`, btn);
  });

  els.picker.addEventListener("input", () => setAnchor(els.picker.value));
  els.picker.addEventListener("change", () => setAnchor(els.picker.value, { animate: true, announceIt: true }));

  els.hex.addEventListener("input", () => {
    const v = els.hex.value.trim();
    const hex = normalizeHex(v);
    if (hex && v.replace("#", "").length === 6) {
      els.hex.removeAttribute("aria-invalid");
      els.anchorMsg.textContent = "";
      setAnchor(hex);
    }
  });
  const commitHex = () => {
    const hex = normalizeHex(els.hex.value);
    if (hex) {
      els.hex.value = hex;
      if (hex !== state.colors[0]) setAnchor(hex, { animate: true, announceIt: true });
      els.hex.removeAttribute("aria-invalid");
      els.anchorMsg.textContent = "";
    } else {
      els.hex.setAttribute("aria-invalid", "true");
      els.anchorMsg.textContent = "Use a hex code like #F41B8D.";
    }
  };
  els.hex.addEventListener("change", commitHex);
  els.hex.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitHex();
    }
    if (e.key === "Escape") {
      els.hex.value = state.colors[0];
      els.hex.removeAttribute("aria-invalid");
      els.anchorMsg.textContent = "";
    }
  });

  els.reset.addEventListener("click", () => {
    setAnchor(anchorDefault, { animate: true });
    announce(`Anchor reset to magenta, ${anchorDefault}.`);
    toast(`Anchor reset to ${anchorDefault}`);
  });

  els.hideFailing.addEventListener("change", () => {
    state.hideFailing = els.hideFailing.checked;
    renderMatrix();
    announce(state.hideFailing ? "Failing pairs hidden." : "Failing pairs shown.");
  });

  const selectTab = (id, focus) => {
    state.tab = id;
    els.tabs.forEach((t) => {
      const on = t.id === `tab-${id}`;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    els.panel.setAttribute("aria-labelledby", `tab-${id}`);
    renderExport();
  };
  els.tabs.forEach((t) => {
    t.addEventListener("click", () => selectTab(t.id.replace("tab-", "")));
    t.addEventListener("keydown", (e) => {
      const ids = els.tabs.map((x) => x.id.replace("tab-", ""));
      const cur = ids.indexOf(t.id.replace("tab-", ""));
      let next = null;
      if (e.key === "ArrowRight") next = (cur + 1) % ids.length;
      if (e.key === "ArrowLeft") next = (cur - 1 + ids.length) % ids.length;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = ids.length - 1;
      if (next !== null) {
        e.preventDefault();
        selectTab(ids[next], true);
      }
    });
  });

  els.copyCode.addEventListener("click", () =>
    copyWithFeedback(els.code.dataset.raw, state.tab === "css" ? "Copied CSS tokens" : "Copied JSON", els.copyCode)
  );
  els.copyLink.addEventListener("click", () => copyWithFeedback(shareLink(), "Copied share link", els.copyLink));

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if ((e.key === " " || e.code === "Space") && !isControl(t)) {
      e.preventDefault();
      if (e.repeat) return;
      generate();
      return;
    }
    if (/^[1-5]$/.test(e.key) && !isTyping(t)) {
      e.preventDefault();
      toggleLock(Number(e.key) - 1);
    }
  });

  window.addEventListener("hashchange", () => {
    if (location.hash.slice(1).toLowerCase() === shareHash()) return;
    if (restoreFromHash()) {
      render({ animate: [0, 1, 2, 3, 4] });
      announce(`Palette loaded from the link: ${state.colors.join(", ")}.`);
    }
  });

  els.matrixScroll.addEventListener("scroll", checkOverflow, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(checkOverflow).observe(els.matrixScroll);
  else window.addEventListener("resize", checkOverflow);

  const syncThemeColor = () => {
    const c = lab.token("--bg");
    if (c) $$('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", c));
  };
  lab.onThemeChange(() => requestAnimationFrame(syncThemeColor));
  syncThemeColor();
}

/* ---------- Boot ---------- */
buildModes();
buildSwatches();
restoreFromHash();
syncAnchorInputs();
bind();
render({ animate: [0, 1, 2, 3, 4] });
document.documentElement.classList.add("is-ready");
