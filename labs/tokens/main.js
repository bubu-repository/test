import { tokenize, countWords, VOCAB_SIZE } from "./tokenizer.js";
import { buildModel } from "./predictor.js";
import { SAMPLES, CORPUS } from "./samples.js";

/* ---------- Setup ---------- */
const $ = (selector) => document.querySelector(selector);

const els = {
  text: $("#text"),
  chips: [...document.querySelectorAll(".tl-chip")],
  clear: $("#clear"),
  tokens: $("#tokens"),
  empty: $("#tokens-empty"),
  more: $("#tokens-more"),
  stage: $("#stage"),
  tip: $("#tip"),
  viewButtons: [...document.querySelectorAll("[data-view]")],
  copyJson: $("#copy-json"),
  copyIds: $("#copy-ids"),
  statTokens: $("#stat-tokens"),
  statTpw: $("#stat-tpw"),
  statChars: $("#stat-chars"),
  statWords: $("#stat-words"),
  statCpt: $("#stat-cpt"),
  ring: $("#ring"),
  statCost: $("#stat-cost"),
  statCost1k: $("#stat-cost-1k"),
  price: $("#price"),
  context: $("#context"),
  cands: $("#cands"),
  temp: $("#temp"),
  tempOut: $("#temp-out"),
  cont: $("#continue"),
  write: $("#write"),
  undo: $("#undo"),
  trail: $("#trail"),
  bars: $("#bars"),
  insight: $("#insight"),
  fineprint: $("#fineprint"),
  live: $("#live"),
};

const model = buildModel(CORPUS);
const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const reduced = () => (window.lab ? window.lab.reducedMotion : reducedQuery.matches);

const TONES = 6;
const RENDER_CAP = 6000;
const ORDER = ["en", "id", "code", "custom"];
const ORDER_META = {
  en: { label: SAMPLES.en.label, badge: SAMPLES.en.badge, tone: "accent" },
  id: { label: SAMPLES.id.label, badge: SAMPLES.id.badge, tone: "sun" },
  code: { label: SAMPLES.code.label, badge: SAMPLES.code.badge, tone: "violet" },
  custom: { label: "Your text", badge: "Aa", tone: "sky" },
};

const state = {
  sample: "en",
  custom: "",
  text: "",
  tokens: [],
  view: "text",
  price: 3,
  temperature: 0.8,
  marks: [], // generated runs: { start, end, q, text }
  tried: {}, // sample → { tokens, words }
  active: 0,
  cands: [],
  rendered: false,
};

const nf = new Intl.NumberFormat("en-US");

/* ---------- Helpers ---------- */
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/* Token text as pill HTML: spaces as a faint ·, new lines as ↵, tabs as →, all in one pass. */
const WS_GLYPH = { " ": "·", "\n": "↵", "\r": "", "\t": "→" };
function pillHTML(text) {
  return text.replace(/[ \t\r\n]+|[^ \t\r\n]+/g, (run) => {
    if (!/^[ \t\r\n]/.test(run)) return esc(run);
    const glyphs = run.replace(/\r\n/g, "\n").replace(/[ \t\r\n]/g, (c) => WS_GLYPH[c]);
    return glyphs ? `<span class="sp">${glyphs}</span>` : "";
  });
}

/* Token text for screen readers. */
function speak(text) {
  if (/^\s+$/.test(text)) {
    const nl = (text.match(/\n/g) || []).length;
    const tabs = (text.match(/\t/g) || []).length;
    const spaces = (text.match(/ /g) || []).length;
    const parts = [];
    if (nl) parts.push(nl === 1 ? "new line" : `${nl} new lines`);
    if (tabs) parts.push(tabs === 1 ? "tab" : `${tabs} tabs`);
    if (spaces) parts.push(spaces === 1 ? "space" : `${spaces} spaces`);
    return parts.join(" and ");
  }
  const lead = text.startsWith(" ") ? "space, then " : "";
  const core = text.replace(/^ /, "").replace(/\r?\n/g, " new line ").replace(/\t/g, " tab ");
  return `${lead}“${core.trim() || core}”`;
}

/* A generated word for screen readers, without the leading-space detail. */
const say = (text) => `“${text.trim()}”`;

const newlines = (text) => (text.match(/\n/g) || []).length;

function pct(q) {
  if (q >= 0.995) return "100%";
  if (q < 0.001) return "<0.1%";
  return (q * 100).toFixed(q < 0.1 ? 1 : 0) + "%";
}

function heatOf(q) {
  if (q >= 0.5) return 0;
  if (q >= 0.25) return 1;
  if (q >= 0.1) return 2;
  return 3;
}

function money(v) {
  if (!Number.isFinite(v) || v <= 0) return "$0.00";
  if (v >= 1) return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 0.01) return "$" + v.toFixed(v >= 0.1 ? 3 : 4);
  const digits = Math.min(10, Math.ceil(-Math.log10(v)) + 1);
  return "$" + v.toFixed(digits);
}

function tween(el, to, format) {
  const from = Number(el.dataset.v || 0);
  el.dataset.v = String(to);
  cancelAnimationFrame(el._raf || 0);
  if (reduced() || from === to || !state.rendered) {
    el.textContent = format(to);
    return;
  }
  const t0 = performance.now();
  const dur = 280;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = format(from + (to - from) * e);
    if (k < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

let liveTimer = 0;
function announce(message, delay = 0) {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    els.live.textContent = "";
    requestAnimationFrame(() => {
      els.live.textContent = message;
    });
  }, delay);
}

/* ---------- Tokens view ---------- */
let prevTexts = [];

function heatForTokens(tokens) {
  const heat = new Int8Array(tokens.length).fill(-1);
  if (!state.marks.length) return heat;
  let j = 0;
  const marks = state.marks;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    while (j < marks.length && marks[j].end <= t.start) j++;
    if (j >= marks.length) break;
    const m = marks[j];
    if (t.start < m.end && t.end > m.start) heat[i] = heatOf(m.q);
  }
  return heat;
}

function markFor(token) {
  return state.marks.find((m) => token.start < m.end && token.end > m.start);
}

let prevHeat = new Int8Array(0);
let prevView = "";
let prevShown = 0;

function tokenHTML(t, i, heat, isNew, delay) {
  let cls = "tok t" + (i % TONES);
  if (t.kind === "byte") cls += " tok--byte";
  if (heat >= 0) cls += " is-gen h" + heat;
  const style = isNew ? ` style="--d:${delay}"` : "";
  if (isNew) cls += " is-new";
  const label = `Token ${i + 1}: ${speak(t.text)}, id ${t.id}`;
  const inner = state.view === "ids" ? String(t.id) : t.kind === "byte" ? esc(t.text) : pillHTML(t.text);
  const br = newlines(t.text);
  return (
    `<span class="${cls}" role="listitem" tabindex="${i === state.active ? 0 : -1}" data-i="${i}" aria-label="${esc(label)}"${style}>${inner}</span>` +
    (br ? "<br>".repeat(br) : "")
  );
}

function renderTokens({ animate = true } = {}) {
  const tokens = state.tokens;
  const n = tokens.length;
  const hadFocus = els.tokens.contains(document.activeElement);
  hideTip();
  els.tokens.classList.toggle("is-ids", state.view === "ids");

  // Diff against the last render: only the changed run pops, and a change at the tail
  // (typing at the end, Continue) patches just the tail instead of rebuilding every pill.
  let pre = 0;
  const m = prevTexts.length;
  while (pre < n && pre < m && tokens[pre].text === prevTexts[pre]) pre++;
  let suf = 0;
  while (suf < n - pre && suf < m - pre && tokens[n - 1 - suf].text === prevTexts[m - 1 - suf]) suf++;
  const from = pre;
  const to = n - suf;
  const pop = animate && state.rendered && to - from <= 120;
  prevTexts = tokens.map((t) => t.text);

  const heat = heatForTokens(tokens);
  const shown = Math.min(n, RENDER_CAP);
  if (state.active >= shown) state.active = Math.max(0, shown - 1);

  let patch = state.rendered && prevView === state.view && from > 0 && prevShown === Math.min(m, RENDER_CAP);
  for (let i = 0, lim = Math.min(from, shown); patch && i < lim; i++) if (heat[i] !== prevHeat[i]) patch = false;
  // Past the render cap nothing visible changed; otherwise only a change at the tail can be patched.
  const offscreen = patch && from >= shown && prevShown === shown;
  if (patch && !offscreen && (suf !== 0 || from > prevShown)) patch = false;
  const firstStale = patch && !offscreen && from < prevShown ? tokenEl(from) : null;
  if (patch && !offscreen && from < prevShown && !firstStale) patch = false;

  const start = offscreen ? shown : patch ? from : 0;
  let html = "";
  for (let i = start; i < shown; i++) html += tokenHTML(tokens[i], i, heat[i], pop && i >= from && i < to, Math.min(i - from, 16));

  if (patch) {
    if (firstStale) {
      // Drop the stale tail: the first changed pill and everything after it.
      const range = document.createRange();
      range.setStartBefore(firstStale);
      range.setEndAfter(els.tokens.lastChild);
      range.deleteContents();
    }
    els.tokens.insertAdjacentHTML("beforeend", html);
    if (!els.tokens.querySelector('[tabindex="0"]')) {
      const el = tokenEl(state.active);
      if (el) el.tabIndex = 0;
    }
  } else {
    els.tokens.innerHTML = html;
  }
  prevHeat = heat;
  prevView = state.view;
  prevShown = shown;

  els.empty.hidden = n > 0;
  els.more.hidden = n <= shown;
  if (n > shown) els.more.textContent = `Showing the first ${nf.format(shown)} of ${nf.format(n)} tokens. The counts above include all of them.`;

  if (hadFocus && shown && !els.tokens.contains(document.activeElement)) {
    const el = tokenEl(state.active);
    if (el) el.focus({ preventScroll: true });
  }
}

function tokenEl(i) {
  return els.tokens.querySelector(`[data-i="${i}"]`);
}

function focusToken(i) {
  const count = Math.min(state.tokens.length, RENDER_CAP);
  if (!count) return;
  const next = Math.max(0, Math.min(count - 1, i));
  const old = els.tokens.querySelector('[tabindex="0"]');
  if (old) old.tabIndex = -1;
  const el = tokenEl(next);
  if (!el) return;
  el.tabIndex = 0;
  state.active = next;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
  showTip(el);
}

function verticalNeighbor(el, dir) {
  const step = dir > 0 ? (n) => n.nextElementSibling : (n) => n.previousElementSibling;
  const top = el.offsetTop;
  const cx = el.offsetLeft + el.offsetWidth / 2;
  let rowTop = null;
  let best = null;
  let bestDist = Infinity;
  for (let n = step(el); n; n = step(n)) {
    if (!n.classList.contains("tok")) continue;
    if (Math.abs(n.offsetTop - top) < 6) continue;
    if (rowTop === null) rowTop = n.offsetTop;
    if (Math.abs(n.offsetTop - rowTop) >= 6) break;
    const d = Math.abs(n.offsetLeft + n.offsetWidth / 2 - cx);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return best;
}

/* Tooltip */
const encoder = new TextEncoder();
const KIND = { vocab: "in vocabulary", number: "number group", rare: "rare character", byte: "byte fallback" };

let tipFor = null;

function showTip(el) {
  tipFor = el;
  const i = Number(el.dataset.i);
  const t = state.tokens[i];
  if (!t) return;
  const bytes = t.bytes ? t.bytes.length : encoder.encode(t.text).length;
  const chars = t.kind === "byte" ? "part of 1 char" : `${[...t.text].length} char${[...t.text].length === 1 ? "" : "s"}`;
  const mark = markFor(t);
  els.tip.innerHTML =
    `<div class="tl-tip__row"><span class="tl-tip__idx">#${nf.format(i + 1)}</span><span class="tl-tip__id">id ${nf.format(t.id)}</span></div>` +
    `<div class="tl-tip__text t${i % TONES}">${t.kind === "byte" ? esc(t.text) : pillHTML(t.text)}</div>` +
    `<div class="tl-tip__meta">${chars} · ${bytes} byte${bytes === 1 ? "" : "s"} · ${KIND[t.kind]}</div>` +
    (mark ? `<div class="tl-tip__gen h${heatOf(mark.q)}"><i></i>generated · ${pct(mark.q)} chance</div>` : "");

  const tip = els.tip;
  tip.style.left = "0px";
  tip.style.top = "0px";
  tip.classList.add("is-on");
  const sr = els.stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const center = r.left - sr.left + r.width / 2;
  const x = Math.max(4, Math.min(sr.width - tw - 4, center - tw / 2));
  let y = r.top - sr.top - th - 12;
  let side = "above";
  if (r.top - th - 12 < 72) {
    y = r.bottom - sr.top + 12;
    side = "below";
  }
  tip.dataset.side = side;
  tip.style.setProperty("--ax", `${Math.max(14, Math.min(tw - 14, center - x))}px`);
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function hideTip() {
  tipFor = null;
  els.tip.classList.remove("is-on");
}

/* While the list scrolls, the tooltip follows its token, and hides once the token leaves view. */
let tipFrame = 0;
function followTip() {
  cancelAnimationFrame(tipFrame);
  tipFrame = requestAnimationFrame(() => {
    if (!tipFor || !tipFor.isConnected) return hideTip();
    const box = els.tokens.getBoundingClientRect();
    const r = tipFor.getBoundingClientRect();
    if (r.bottom < box.top + 4 || r.top > box.bottom - 4) hideTip();
    else showTip(tipFor);
  });
}

/* ---------- Stats ---------- */
function renderStats() {
  const text = state.text;
  const n = state.tokens.length;
  const chars = [...text].length;
  const words = countWords(text);
  const cpt = n ? chars / n : 0;
  const tpw = words ? n / words : 0;
  const cost = (n / 1_000_000) * state.price;

  tween(els.statTokens, n, (v) => nf.format(Math.round(v)));
  els.statTpw.textContent = words ? `${tpw.toFixed(2)} per word` : "Type a few words";
  tween(els.statChars, chars, (v) => nf.format(Math.round(v)));
  els.statWords.textContent = `${nf.format(words)} word${words === 1 ? "" : "s"}`;
  tween(els.statCpt, cpt, (v) => v.toFixed(1));
  els.ring.setAttribute("stroke-dasharray", `${Math.min(cpt / 8, 1) * 100} 100`);
  els.statCost.textContent = money(cost);
  els.statCost1k.textContent = `${money(cost * 1000)} per 1,000 calls`;

  announce(
    `${nf.format(n)} tokens, ${nf.format(chars)} characters, ${cpt.toFixed(1)} characters per token, estimated cost ${money(cost)}.`,
    900,
  );
}

/* ---------- What it almost said ---------- */
function renderPredictions() {
  const text = state.text;
  const { list } = model.predict(text);
  state.cands = model.withTemperature(list, state.temperature);
  const top = state.cands.slice(0, 5);

  // Context line: the tail of the text with the last word highlighted, then a ghost guess.
  const trimmed = text.replace(/\s+$/, "");
  let ctx;
  if (!trimmed) {
    ctx = `<span>Start of text</span>`;
  } else {
    const words = trimmed.split(/\s+/);
    const last = words.pop();
    const before = words.slice(-6).join(" ");
    const lead = words.length > 6 ? "…" : "";
    ctx = `${lead}${esc(before)}${before ? " " : ""}<mark>${esc(last)}</mark>`;
  }
  const ghost = top[0] ? model.textFor(top[0].key, text) : "";
  els.context.innerHTML =
    ctx +
    (ghost ? `<span class="tl-ghost" title="Most likely next token">${esc(ghost.replace(/^ /, ""))}</span>` : "") +
    '<span class="tl-caret" aria-hidden="true"></span>';

  const focusedK = document.activeElement && document.activeElement.closest ? document.activeElement.closest(".tl-cand") : null;
  const keepK = focusedK ? Number(focusedK.dataset.k) : -1;

  els.cands.innerHTML = top
    .map((c, k) => {
      const add = model.textFor(c.key, text);
      return (
        `<li><button type="button" class="tl-cand" data-k="${k}" aria-label="Add ${esc(say(add))}, ${pct(c.q)} chance">` +
        `<span class="tok t${k % TONES}">${pillHTML(add)}</span>` +
        `<span class="tl-cand__bar" aria-hidden="true"><span class="tl-cand__fill" style="--p:${c.q.toFixed(4)}"></span></span>` +
        `<span class="tl-cand__pct" aria-hidden="true">${pct(c.q)}</span></button></li>`
      );
    })
    .join("");

  if (keepK >= 0) {
    const again = els.cands.querySelector(`[data-k="${keepK}"]`);
    if (again) again.focus();
  }
}

function renderTrail() {
  const marks = state.marks;
  if (!marks.length) {
    els.trail.innerHTML = '<p class="tl-trail__empty">Nothing yet. Press Continue and the toy model writes one token at a time.</p>';
  } else {
    const shown = marks.slice(-24);
    els.trail.innerHTML =
      (marks.length > shown.length ? `<span class="tl-bar__note">+${marks.length - shown.length} earlier</span>` : "") +
      shown
        .map((m) => `<span class="tl-gen" data-heat="${heatOf(m.q)}">${esc(m.text.trim() || "·")}<small>${pct(m.q)}</small></span>`)
        .join("");
  }
  const last = marks[marks.length - 1];
  els.undo.disabled = !(last && last.end === state.text.length && state.text.slice(last.start) === last.text);
}

function append(cand, { silent = false } = {}) {
  if (!cand) return;
  const text = els.text.value;
  const add = model.textFor(cand.key, text);
  const start = text.length;
  els.text.value = text + add;
  state.marks.push({ start, end: start + add.length, q: cand.q, text: add });
  onTextChanged();
  requestAnimationFrame(() => {
    els.text.scrollTop = els.text.scrollHeight;
  });
  if (!silent) announce(`Added ${say(add)}, ${pct(cand.q)} chance. ${nf.format(state.tokens.length)} tokens.`);
}

function continueOnce(opts) {
  append(model.sample(state.cands), opts);
}

let writing = null;
async function writeMany(count) {
  if (writing) {
    writing.stop = true;
    return;
  }
  const job = (writing = { stop: false });
  els.write.textContent = "Stop";
  let added = 0;
  for (let i = 0; i < count && !job.stop; i++) {
    continueOnce({ silent: true });
    added++;
    await new Promise((resolve) => setTimeout(resolve, reduced() ? 40 : 150));
  }
  writing = null;
  els.write.textContent = "Write 10";
  announce(`Added ${added} tokens. ${nf.format(state.tokens.length)} tokens in total.`);
}

function undo() {
  const last = state.marks[state.marks.length - 1];
  const text = els.text.value;
  if (!last || last.end !== text.length || text.slice(last.start) !== last.text) return;
  els.text.value = text.slice(0, last.start);
  state.marks.pop();
  onTextChanged();
  announce(`Removed ${say(last.text)}.`);
}

/* ---------- Compare ---------- */
function renderCompare() {
  const tried = state.tried;
  const values = ORDER.filter((k) => tried[k]).map((k) => tried[k].tokens / tried[k].words);
  const max = Math.max(2.5, ...values);
  els.bars.innerHTML = ORDER.map((key) => {
    const meta = ORDER_META[key];
    const t = tried[key];
    const badge = `<span class="tl-chip__badge" data-tone="${meta.tone}" aria-hidden="true">${esc(meta.badge)}</span>`;
    if (!t) {
      const action =
        key === "custom" ? "<span></span>" : `<button type="button" class="tl-bar__try" data-try="${key}">Try ${esc(key === "id" ? "Indonesian" : meta.label)}</button>`;
      const note = key === "custom" ? "Edit the text above to add yours" : "Not tried yet";
      return (
        `<li class="tl-bar tl-bar--empty"><span class="tl-bar__label">${badge}${esc(meta.label)}</span>${action}` +
        `<span class="tl-bar__track" aria-hidden="true"></span><span class="tl-bar__meta">${note}</span></li>`
      );
    }
    const tpw = t.tokens / t.words;
    return (
      `<li class="tl-bar${key === state.sample ? " is-current" : ""}"><span class="tl-bar__label">${badge}${esc(meta.label)}</span>` +
      `<span class="tl-bar__val">${tpw.toFixed(2)} <small>tokens/word</small></span>` +
      `<span class="tl-bar__track" aria-hidden="true"><span class="tl-bar__fill" data-tone="${meta.tone}" style="--w:${(tpw / max).toFixed(4)}"></span></span>` +
      `<span class="tl-bar__meta">${nf.format(t.tokens)} tokens · ${nf.format(t.words)} words · ${money((t.tokens / 1_000_000) * state.price)}</span></li>`
    );
  }).join("");

  const en = tried.en && tried.en.tokens / tried.en.words;
  const id = tried.id && tried.id.tokens / tried.id.words;
  const code = tried.code && tried.code.tokens / tried.code.words;
  const lines = [];
  if (en && id) {
    const perMillion = (key) => money((tried[key].tokens / 1_000_000) * state.price * 1_000_000);
    lines.push(
      `Bahasa Indonesia needs <strong>${(id / en).toFixed(1)}×</strong> the tokens per word of English here. Tokenizers learn their pieces mostly from English text, so other languages get chopped finer and cost more.`,
      `Sent a million times, the same paragraph costs <strong>${perMillion("en")}</strong> in English and <strong>${perMillion("id")}</strong> in Indonesian.`,
    );
  }
  if (code && en) {
    lines.push(`Code uses <strong>${(code / en).toFixed(1)}×</strong> as many: every bracket, dot and indent is a token.`);
  }
  if (!lines.length) {
    lines.push("Switch samples to compare. Indonesian and code usually need more tokens per word than English, so the same idea costs more.");
  }
  els.insight.innerHTML = lines.join(" ");
}

/* ---------- Samples ---------- */
function syncChips() {
  for (const chip of els.chips) {
    const key = chip.dataset.sample;
    chip.setAttribute("aria-pressed", String(key === state.sample));
    if (key === "custom") chip.hidden = !state.custom && state.sample !== "custom";
  }
  const isCode = state.sample === "code" || (state.sample === "custom" && looksLikeCode(state.text));
  els.text.classList.toggle("is-code", isCode);
  els.tokens.classList.toggle("is-code", isCode);
}

function looksLikeCode(text) {
  return /[{};]\s*\n|=>|function\s|const\s|import\s/.test(text.slice(0, 2000));
}

function useSample(key) {
  if (writing) writing.stop = true;
  state.sample = key;
  els.text.value = key === "custom" ? state.custom : SAMPLES[key].text;
  state.marks = [];
  state.active = 0;
  onTextChanged({ fromSample: true });
  announce(`${ORDER_META[key].label} loaded. ${nf.format(state.tokens.length)} tokens.`, 300);
}

/* ---------- Main update ---------- */
function onTextChanged({ fromSample = false } = {}) {
  const text = els.text.value;
  const old = state.text;

  // Generated marks stay valid only up to the first edited character.
  if (state.marks.length && !fromSample) {
    let d = 0;
    const lim = Math.min(old.length, text.length);
    while (d < lim && old.charCodeAt(d) === text.charCodeAt(d)) d++;
    // Marks that start at the old end were just appended, so they are always fresh.
    if (d < old.length || d < text.length) state.marks = state.marks.filter((m) => m.end <= d || m.start >= old.length);
  }
  state.text = text;

  if (!fromSample && state.sample !== "custom" && text !== SAMPLES[state.sample].text) state.sample = "custom";
  if (state.sample === "custom") state.custom = text;

  state.tokens = tokenize(text);
  const words = countWords(text);
  if (words) state.tried[state.sample] = { tokens: state.tokens.length, words };
  else delete state.tried[state.sample];

  syncChips();
  renderTokens();
  renderStats();
  renderPredictions();
  renderTrail();
  renderCompare();
  state.rendered = true;
}

/* ---------- Copy ---------- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const active = document.activeElement;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.inset = "0 auto auto 0";
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    if (active && active.focus) active.focus();
    return ok;
  }
}

function flash(button, label) {
  const span = button.querySelector("span");
  const original = button.dataset.label || span.textContent;
  button.dataset.label = original;
  span.textContent = label;
  clearTimeout(button._t);
  button._t = setTimeout(() => {
    span.textContent = original;
  }, 1600);
}

async function copyTokens(kind) {
  const tokens = state.tokens;
  const payload =
    kind === "ids"
      ? JSON.stringify(tokens.map((t) => t.id))
      : JSON.stringify(
          tokens.map((t, i) => ({ index: i, text: t.text, id: t.id })),
          null,
          2,
        );
  const ok = await copyText(payload);
  const button = kind === "ids" ? els.copyIds : els.copyJson;
  if (ok) {
    flash(button, "Copied ✓");
    announce(`Copied ${nf.format(tokens.length)} ${kind === "ids" ? "token ids" : "tokens as JSON"}.`);
  } else {
    flash(button, "Copy blocked");
    announce("Copying was blocked by the browser.");
  }
}

/* ---------- Events ---------- */
let inputTimer = 0;
els.text.addEventListener("input", () => {
  clearTimeout(inputTimer);
  const len = els.text.value.length;
  const delay = len > 20_000 ? 200 : len > 5_000 ? 110 : 70;
  inputTimer = setTimeout(onTextChanged, delay);
});

els.text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    clearTimeout(inputTimer);
    if (els.text.value !== state.text) onTextChanged();
    continueOnce();
  }
});

for (const chip of els.chips) {
  chip.addEventListener("click", () => {
    if (chip.dataset.sample !== state.sample) useSample(chip.dataset.sample);
  });
}

els.clear.addEventListener("click", () => {
  els.text.value = "";
  onTextChanged();
  els.text.focus();
  announce("Text cleared.");
});

for (const button of els.viewButtons) {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    for (const b of els.viewButtons) b.setAttribute("aria-pressed", String(b === button));
    renderTokens({ animate: false });
    announce(state.view === "ids" ? "Showing token ids." : "Showing token text.");
  });
}

els.copyJson.addEventListener("click", () => copyTokens("json"));
els.copyIds.addEventListener("click", () => copyTokens("ids"));

els.tokens.addEventListener("pointerover", (e) => {
  const el = e.target.closest(".tok");
  if (el) showTip(el);
});
els.tokens.addEventListener("pointerleave", () => {
  if (!els.tokens.contains(document.activeElement)) hideTip();
});
els.tokens.addEventListener("focusin", (e) => {
  const el = e.target.closest(".tok");
  if (!el) return;
  const i = Number(el.dataset.i);
  if (i !== state.active) {
    const old = els.tokens.querySelector('[tabindex="0"]');
    if (old) old.tabIndex = -1;
    el.tabIndex = 0;
    state.active = i;
  }
  showTip(el);
});
els.tokens.addEventListener("focusout", (e) => {
  if (!els.tokens.contains(e.relatedTarget)) hideTip();
});
els.tokens.addEventListener("scroll", followTip, { passive: true });
els.tokens.addEventListener("keydown", (e) => {
  const el = e.target.closest(".tok");
  if (!el) return;
  const i = Number(el.dataset.i);
  let next = null;
  switch (e.key) {
    case "ArrowRight":
      next = i + 1;
      break;
    case "ArrowLeft":
      next = i - 1;
      break;
    case "ArrowDown":
    case "ArrowUp": {
      const n = verticalNeighbor(el, e.key === "ArrowDown" ? 1 : -1);
      next = n ? Number(n.dataset.i) : e.key === "ArrowDown" ? Infinity : 0;
      break;
    }
    case "PageDown":
      next = i + 40;
      break;
    case "PageUp":
      next = i - 40;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = Infinity;
      break;
    case "Escape":
      hideTip();
      return;
    default:
      return;
  }
  e.preventDefault();
  focusToken(next === Infinity ? state.tokens.length - 1 : next);
});

window.addEventListener("resize", hideTip, { passive: true });

els.price.addEventListener("input", () => {
  const v = Number.parseFloat(els.price.value);
  const valid = Number.isFinite(v) && v >= 0;
  els.price.setAttribute("aria-invalid", String(!valid && els.price.value !== ""));
  state.price = valid ? v : 0;
  renderStats();
  renderCompare();
});

function tempWord(t) {
  if (t < 0.05) return "greedy";
  if (t < 0.5) return "focused";
  if (t < 1.2) return "balanced";
  if (t < 1.6) return "adventurous";
  return "chaotic";
}

function syncTemp() {
  const t = Number(els.temp.value);
  state.temperature = t;
  const word = tempWord(t);
  els.tempOut.textContent = `${t.toFixed(1)} · ${word}`;
  els.temp.style.setProperty("--v", (t / Number(els.temp.max || 2)).toFixed(3));
  els.temp.setAttribute("aria-valuetext", `${t.toFixed(1)}, ${word}`);
}

els.temp.addEventListener("input", () => {
  syncTemp();
  renderPredictions();
});

els.cands.addEventListener("click", (e) => {
  const button = e.target.closest(".tl-cand");
  if (button) append(state.cands[Number(button.dataset.k)]);
});

els.cont.addEventListener("click", () => continueOnce());
els.write.addEventListener("click", () => writeMany(10));
els.undo.addEventListener("click", undo);

els.bars.addEventListener("click", (e) => {
  const button = e.target.closest("[data-try]");
  if (!button) return;
  useSample(button.dataset.try);
  const chip = els.chips.find((c) => c.dataset.sample === button.dataset.try);
  if (chip) chip.focus();
});

/* ---------- Start ---------- */
els.fineprint.textContent = `The toy model learned from ${nf.format(model.corpusTokens)} tokens of text about products, agents, Jakarta commutes and coffee, and knows ${nf.format(model.vocabularySize)} different ones.`;
document.querySelector("#vocab-size").textContent = `about ${nf.format(Math.round(VOCAB_SIZE / 1000) * 1000)}`;
els.text.value = SAMPLES.en.text;
syncTemp();
onTextChanged({ fromSample: true });
