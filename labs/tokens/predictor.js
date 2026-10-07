/*
 * A toy next-token predictor: trigram → bigram → unigram counts over a tiny embedded corpus,
 * mixed by simple interpolation. It knows a few hundred word-tokens and nothing else, which is
 * exactly the point: you can watch it guess, repeat itself and get weird at high temperature.
 */
import { pretokenize } from "./tokenizer.js";

const SEP = "\u0001";
const SENTENCE_END = new Set([".", "!", "?"]);
const NO_SPACE_BEFORE = /^(?:[.,;:!?)\]}%…”’]|['’](?:s|t|re|ve|m|ll|d)$)/i;
const NO_SPACE_AFTER = /[\s(\["“‘/-]$/;

const keyOf = (unit) => unit.trim().toLowerCase();

function units(text) {
  return pretokenize(text)
    .map((unit) => unit.trim())
    .filter(Boolean);
}

function bump(map, key, next) {
  let row = map.get(key);
  if (!row) map.set(key, (row = new Map()));
  row.set(next, (row.get(next) || 0) + 1);
}

export function buildModel(corpus) {
  const uni = new Map();
  const bi = new Map();
  const tri = new Map();
  const casing = new Map(); // key → Map(surface form → count), sentence-initial forms excluded

  for (const paragraph of corpus) {
    // Every paragraph starts like a sentence, so "." is the context for sentence starters.
    const seq = [".", "."];
    let sentenceStart = true;
    for (const unit of units(paragraph)) {
      const key = keyOf(unit);
      if (!sentenceStart || unit === unit.toUpperCase()) {
        let forms = casing.get(key);
        if (!forms) casing.set(key, (forms = new Map()));
        forms.set(unit, (forms.get(unit) || 0) + 1);
      }
      sentenceStart = SENTENCE_END.has(key);
      seq.push(key);
    }
    for (let i = 2; i < seq.length; i++) {
      uni.set(seq[i], (uni.get(seq[i]) || 0) + 1);
      bump(bi, seq[i - 1], seq[i]);
      bump(tri, seq[i - 2] + SEP + seq[i - 1], seq[i]);
    }
  }

  let uniTotal = 0;
  for (const c of uni.values()) uniTotal += c;

  function surface(key) {
    const forms = casing.get(key);
    if (!forms) return key;
    let best = key;
    let bestCount = -1;
    for (const [form, count] of forms) {
      if (count > bestCount) {
        best = form;
        bestCount = count;
      }
    }
    return best;
  }

  /* Context keys (last two units) from free text. */
  function context(text) {
    const tail = units(text.slice(-240));
    const keys = tail.map(keyOf);
    while (keys.length < 2) keys.unshift(".");
    return { prev: keys[keys.length - 2], last: keys[keys.length - 1], lastSurface: tail[tail.length - 1] || "" };
  }

  /* Raw model probabilities for the next unit, sorted high → low. */
  function predict(text) {
    const { prev, last } = context(text);
    const t = tri.get(prev + SEP + last);
    const b = bi.get(last);
    const weights = t ? [0.62, 0.28, 0.1] : b ? [0, 0.85, 0.15] : [0, 0, 1];
    const scores = new Map();
    const mix = (row, weight) => {
      if (!row || !weight) return;
      let total = 0;
      for (const c of row.values()) total += c;
      for (const [k, c] of row) scores.set(k, (scores.get(k) || 0) + (weight * c) / total);
    };
    mix(t, weights[0]);
    mix(b, weights[1]);
    mix(uni, weights[2]);
    const list = [];
    for (const [key, p] of scores) list.push({ key, p });
    list.sort((a, b2) => b2.p - a.p || (a.key < b2.key ? -1 : 1));
    return { list, source: t ? "trigram" : b ? "bigram" : "unigram", context: context(text) };
  }

  /* Applies temperature: q ∝ p^(1/T). T = 0 is greedy. */
  function withTemperature(list, temperature) {
    if (!list.length) return [];
    if (temperature < 0.05) return list.map((c, i) => ({ ...c, q: i === 0 ? 1 : 0 }));
    const logs = list.map((c) => Math.log(c.p) / temperature);
    const max = Math.max(...logs);
    const exps = logs.map((l) => Math.exp(l - max));
    const z = exps.reduce((a, b2) => a + b2, 0);
    return list.map((c, i) => ({ ...c, q: exps[i] / z }));
  }

  function sample(list, random = Math.random) {
    let r = random();
    for (const c of list) {
      r -= c.q;
      if (r <= 0) return c;
    }
    return list[0];
  }

  /* The exact text to append for a unit, with spacing and sentence casing. */
  function textFor(key, text) {
    let word = surface(key);
    const trimmed = text.replace(/\s+$/, "");
    const lastChar = trimmed.slice(-1);
    const startsSentence = !trimmed || SENTENCE_END.has(lastChar) || /\n\s*$/.test(text);
    if (startsSentence && /^\p{Ll}/u.test(word)) word = word[0].toUpperCase() + word.slice(1);
    if (!text) return word;
    if (NO_SPACE_BEFORE.test(word)) return word;
    if (NO_SPACE_AFTER.test(text)) return word;
    return " " + word;
  }

  return {
    predict,
    withTemperature,
    sample,
    textFor,
    vocabularySize: uni.size,
    corpusTokens: uniTotal,
  };
}
