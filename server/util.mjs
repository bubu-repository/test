/* ==========================================================================
   Input hygiene, CSV, rate limiting, request helpers.
   ========================================================================== */
import crypto from 'node:crypto';
import zlib from 'node:zlib';

/* ------------------------------------------------------------- sanitise */

const MAX_KEYS = 40;
const MAX_ARRAY = 100;
const MAX_DEPTH = 4;
const MAX_KEY_LEN = 64;
/** per-field string caps (everything else: DEFAULT_STR) */
const STR_CAPS = { message: 4000, notes: 2000, body: 4000, email: 254, url: 2048, name: 120, company: 160, role: 120 };
const DEFAULT_STR = 1000;

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function isEmail(s) {
  return typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s);
}

// strip control characters except tab/newline
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanString(s, cap) {
  let v = String(s).replace(CTRL, '').trim();
  if (v.length > cap) v = v.slice(0, cap);
  return v;
}

/**
 * Deep-clean an arbitrary JSON value: trims strings, caps sizes, drops
 * functions/prototype keys, limits depth. Returns undefined for junk.
 */
export function clean(value, key = '', depth = 0) {
  if (value == null) return value === null ? null : undefined;
  const t = typeof value;
  if (t === 'string') return cleanString(value, STR_CAPS[key] ?? DEFAULT_STR);
  if (t === 'number') return Number.isFinite(value) ? value : undefined;
  if (t === 'boolean') return value;
  if (depth >= MAX_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY)
      .map((v) => clean(v, key, depth + 1))
      .filter((v) => v !== undefined);
  }
  if (t === 'object') {
    const out = {};
    let n = 0;
    for (const [k, v] of Object.entries(value)) {
      if (n >= MAX_KEYS) break;
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const kk = cleanString(k, MAX_KEY_LEN);
      if (!kk) continue;
      const cv = clean(v, kk, depth + 1);
      if (cv === undefined) continue;
      out[kk] = cv;
      n++;
    }
    return out;
  }
  return undefined;
}

export const rid = () => crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x') + Date.now().toString(36).slice(-4);

/* ------------------------------------------------------------------ CSV */

export function toCSV(rows) {
  if (!rows.length) return '';
  const keys = [];
  const seen = new Set();
  for (const r of rows)
    for (const k of Object.keys(r))
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
  const esc = (v) => {
    let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    // neutralise spreadsheet formula injection (keep plain numbers intact)
    if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\r\n');
}

/* ----------------------------------------------------------- rate limit */

/** Fixed-window counter per key. */
export function createLimiter({ windowMs, max }) {
  const hits = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, Math.max(10000, windowMs)).unref();
  return {
    /** @returns {{ok:boolean, retryAfter:number}} */
    hit(key) {
      const now = Date.now();
      let e = hits.get(key);
      if (!e || e.reset <= now) {
        e = { n: 0, reset: now + windowMs };
        hits.set(key, e);
      }
      e.n++;
      return { ok: e.n <= max, retryAfter: Math.ceil((e.reset - now) / 1000) };
    },
    stop() {
      clearInterval(sweep);
    },
  };
}

/* --------------------------------------------------------- HTTP helpers */

export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Read a JSON body with a hard byte limit. */
export function readJSON(req, limit) {
  return new Promise((resolve, reject) => {
    const len = Number(req.headers['content-length'] || 0);
    if (len > limit) {
      reject(new HttpError(413, 'Payload too large'));
      req.resume();
      return;
    }
    let size = 0;
    const chunks = [];
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > limit) {
        done = true;
        reject(new HttpError(413, 'Payload too large'));
        req.resume();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, 'Invalid JSON'));
      }
    });
    req.on('error', (e) => {
      if (done) return;
      done = true;
      reject(e);
    });
  });
}

/** Pick the best encoding the client accepts. */
export function pickEncoding(req) {
  const ae = String(req.headers['accept-encoding'] || '');
  if (/\bbr\b/.test(ae)) return 'br';
  if (/\bgzip\b/.test(ae)) return 'gzip';
  return null;
}

export function compress(buf, enc, level = 'dynamic') {
  if (enc === 'br')
    return zlib.brotliCompressSync(buf, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: level === 'static' ? 9 : 4,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
      },
    });
  return zlib.gzipSync(buf, { level: level === 'static' ? 9 : 6 });
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xff) return xff;
  }
  return req.socket.remoteAddress || 'unknown';
}
