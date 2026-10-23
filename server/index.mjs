#!/usr/bin/env node
/* ==========================================================================
   Adelia's Room — production server (zero dependencies, Node ≥ 18, ESM).

   • Serves the Vite build in dist/ (SPA fallback, compression, caching),
     including the generated CV at /cv.pdf (scripts/build-cv.mjs).
   • JSON API used by src/lib/api.ts (bookings, forms, guestbook, Moci,
     leaderboard, analytics, CMS, admin). Data lives in one JSON file per
     collection in DATA_DIR.

   Env:
     PORT              default 8787
     HOST              default all interfaces
     DATA_DIR          default server/data
     DIST_DIR          default dist
     ADMIN_PASSWORD    default "adelia-room-local" (warns) — SET IT IN PRODUCTION
     ADMIN_SECRET      HMAC key for admin tokens (default: random per boot)
     ANTHROPIC_API_KEY read by server/agent.mjs (Moci's online brain); without it
                       /api/agent answers 503 and the browser uses the offline brain
     TRUST_PROXY=1     use X-Forwarded-For / -Proto (behind a load balancer)
     CSP=off           disable the Content-Security-Policy header (or set a custom policy string)
     QUIET=1           no per-request API log lines
   ========================================================================== */
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, COLLECTIONS } from './store.mjs';
import { createAuth, tokenFrom } from './auth.mjs';
import { createStatic } from './static.mjs';
import { validateNote, publicNote, latestNotes, ipHash, LIST_MAX } from './guestbook.mjs';
import { clean, isEmail, rid, toCSV, createLimiter, HttpError, readJSON, pickEncoding, compress, clientIp } from './util.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || undefined;
const DATA_DIR = path.resolve(root, process.env.DATA_DIR || path.join('server', 'data'));
const DIST_DIR = path.resolve(root, process.env.DIST_DIR || 'dist');
const TRUST_PROXY = /^(1|true|yes)$/i.test(process.env.TRUST_PROXY || '');
const QUIET = /^(1|true|yes)$/i.test(process.env.QUIET || '');

const TAG = '[adelia-room]';
const log = {
  info: (...a) => console.log(new Date().toISOString(), TAG, ...a),
  warn: (...a) => console.warn(new Date().toISOString(), TAG, '⚠', ...a),
  error: (...a) => console.error(new Date().toISOString(), TAG, '✖', ...a),
};

const store = createStore(DATA_DIR, log);
const auth = createAuth({ password: process.env.ADMIN_PASSWORD, secret: process.env.ADMIN_SECRET, log });
const serveStatic = createStatic(DIST_DIR, log);
/** Salt for the guestbook's IP hashes (admin-only; raw IPs are never stored). */
const IP_SALT = process.env.ADMIN_SECRET || crypto.randomBytes(16).toString('hex');

/* Moci's online brain lives in server/agent.mjs (owned by the Moci engineer).
   Loaded lazily and defensively: a broken agent module must never take the
   rest of the API down — /api/agent then answers 503 and the browser falls
   back to the offline brain. */
let agentModule = null;
function loadAgent() {
  if (!agentModule)
    agentModule = import('./agent.mjs').catch((e) => {
      log.error('[agent] server/agent.mjs failed to load — /api/agent answers 503:', e?.message || e);
      return null;
    });
  return agentModule;
}
const AGENT_TIMEOUT_MS = 40_000;

/* ------------------------------------------------------------ limits */
const LIMITS = {
  form: createLimiter({ windowMs: 60_000, max: 30 }), // POST /api/<collection> (incl. guestbook, questions)
  guestbook: createLimiter({ windowMs: 10 * 60_000, max: 5 }), // creatures per IP per 10 minutes
  agent: createLimiter({ windowMs: 60_000, max: 20 }), // POST /api/agent
  write: createLimiter({ windowMs: 60_000, max: 150 }), // events + profile sync
  login: createLimiter({ windowMs: 15 * 60_000, max: 10 }),
  admin: createLimiter({ windowMs: 60_000, max: 300 }),
};
const BODY = { form: 32 * 1024, agent: 32 * 1024, profile: 64 * 1024, events: 256 * 1024, content: 2 * 1024 * 1024, small: 4 * 1024 };
const EVENT_BATCH_MAX = 100;

/** `rsvps` = bookings (intro calls, interview slots, coffee chats). */
const PUBLIC_COLLECTIONS = new Set(['rsvps', 'leads', 'waitlist', 'quiz', 'scores', 'redemptions', 'questions']);
const REQUIRE_EMAIL = new Set(['rsvps', 'leads', 'waitlist']);
const QUESTION_MAX = 500;

/* ------------------------------------------------------------ headers */
const DEFAULT_CSP = [
  "default-src 'self'",
  // blob: lets the gacha's 3D text worker (troika) importScripts its own code
  "script-src 'self' blob:",
  // React style props + the panels' inline CSS variables
  "style-src 'self' 'unsafe-inline'",
  // data:/blob: = the Studio's canvases, stickers and exports, tickets, pass cards, posters
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // the API, and live Bekasi weather from Open-Meteo (no key)
  "connect-src 'self' https://api.open-meteo.com",
  // Web Audio needs no source; this covers any <audio>/<video> made from a blob
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self' mailto:",
  "frame-ancestors 'self'",
].join('; ');
const CSP = process.env.CSP === 'off' ? '' : process.env.CSP || DEFAULT_CSP;

function securityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  // camera=(self): the Studio can take a photo with the visitor's camera (opt-in, on-device)
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  if (CSP) res.setHeader('Content-Security-Policy', CSP);
  const https = req.socket.encrypted || (TRUST_PROXY && String(req.headers['x-forwarded-proto'] || '').startsWith('https'));
  if (https) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function sendJSON(req, res, status, body, extraHeaders = {}) {
  let buf = Buffer.from(JSON.stringify(body));
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Accept-Encoding, Authorization');
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  const enc = buf.length > 2048 ? pickEncoding(req) : null;
  if (enc) {
    buf = compress(buf, enc);
    res.setHeader('Content-Encoding', enc);
  }
  res.setHeader('Content-Length', buf.length);
  res.end(req.method === 'HEAD' ? undefined : buf);
}

/* ------------------------------------------------------------ helpers */
function limit(bucket, req) {
  const r = LIMITS[bucket].hit(`${bucket}:${clientIp(req, TRUST_PROXY)}`);
  if (!r.ok) throw new HttpError(429, 'Too many requests — slow down a little.', { 'Retry-After': String(r.retryAfter) });
}

function requireAdmin(req, url, allowQuery = false) {
  limit('admin', req);
  if (!auth.verify(tokenFrom(req, url, allowQuery))) throw new HttpError(401, 'Unauthorized');
}

function stripMeta(o) {
  // server owns identity + timestamps
  const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = o;
  return rest;
}

function normaliseEmail(rec, required) {
  if (typeof rec.email === 'string' && rec.email) {
    rec.email = rec.email.toLowerCase();
    if (!isEmail(rec.email)) throw new HttpError(422, 'Please use a valid email address.');
  } else if (required) {
    throw new HttpError(422, 'An email address is required.');
  } else if ('email' in rec && !rec.email) {
    rec.email = '';
  }
}

function validateRecord(collection, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Expected a JSON object');
  const rec = stripMeta(clean(input) || {});
  normaliseEmail(rec, REQUIRE_EMAIL.has(collection));
  if (collection === 'rsvps' && !rec.name) throw new HttpError(422, 'Please tell Adelia your name.');
  if (collection === 'questions') return questionRecord(rec, 'offline');
  if (collection === 'scores') {
    const score = Number(rec.score);
    if (!Number.isFinite(score) || score < 0 || score > 1e9) throw new HttpError(422, 'Score must be a number between 0 and 1e9.');
    if (typeof rec.game !== 'string' || !rec.game) throw new HttpError(422, 'Missing game.');
    rec.score = Math.round(score);
    rec.game = rec.game.slice(0, 40);
    rec.name = (typeof rec.name === 'string' && rec.name ? rec.name : 'Guest').slice(0, 24);
  }
  return rec;
}

/** Moci question log: the question and how it was answered. Never an IP or contact details. */
function questionRecord(input, defaultAnswered) {
  const rec = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (/^(ip|ips|iphash|email|e-?mail|phone|ua|useragent|user-agent|headers|address|sessionid|name)$/i.test(k)) continue;
    rec[k] = v;
  }
  const q = typeof rec.question === 'string' ? rec.question : typeof rec.q === 'string' ? rec.q : typeof rec.text === 'string' ? rec.text : '';
  delete rec.q;
  delete rec.text;
  const question = q.replace(/\s+/g, ' ').trim().slice(0, QUESTION_MAX);
  if (!question) throw new HttpError(422, 'Missing question.');
  const answered = rec.answered === 'online' || rec.answered === 'offline' ? rec.answered : defaultAnswered;
  return { ...rec, question, answered };
}

/** The narrow store Moci's handler gets: it may log (and read) questions, nothing else. */
const agentStore = Object.freeze({
  insert(name, rec) {
    if (name !== 'questions') throw new Error(`agent store: only "questions" can be written (got "${name}")`);
    const cleaned = questionRecord(stripMeta(clean(rec && typeof rec === 'object' ? rec : {}) || {}), 'online');
    return store.insert('questions', { id: rid(), createdAt: Date.now(), ...cleaned });
  },
  all(name) {
    if (name !== 'questions') throw new Error(`agent store: only "questions" can be read (got "${name}")`);
    return store.all('questions').map((r) => ({ ...r }));
  },
});

async function runAgent(body, ip) {
  const mod = await loadAgent();
  if (!mod || typeof mod.handleAgent !== 'function') return { status: 503, json: { error: 'offline' } };
  let timer;
  try {
    const out = await Promise.race([
      Promise.resolve(mod.handleAgent(body, { ip, store: agentStore })),
      new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error('agent timed out')), AGENT_TIMEOUT_MS);
      }),
    ]);
    const status = Number(out?.status);
    const json = out?.json;
    if (!Number.isInteger(status) || status < 200 || status > 599 || !json || typeof json !== 'object') {
      log.error('[agent] handleAgent returned an invalid result; expected { status, json }');
      return { status: 503, json: { error: 'offline' } };
    }
    return { status, json, retryAfter: out.headers?.['Retry-After'] ?? out.headers?.['retry-after'] };
  } catch (e) {
    log.error('[agent] handleAgent failed:', e?.message || e);
    return { status: 503, json: { error: 'offline' } };
  } finally {
    clearTimeout(timer);
  }
}

/** Leaderboard: best score per (case-insensitive) name, top 20. */
function topScores(game) {
  const best = new Map();
  for (const r of store.all('scores')) {
    if (game && r.game !== game) continue;
    const key = `${r.game}|${String(r.name || 'Guest').trim().toLowerCase()}`;
    const prev = best.get(key);
    if (!prev || r.score > prev.score || (r.score === prev.score && r.createdAt < prev.createdAt)) best.set(key, r);
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.createdAt - b.createdAt).slice(0, 20);
}

/* ------------------------------------------------------------ router */
async function api(req, res, url) {
  const parts = url.pathname.replace(/\/+$/, '').split('/').slice(2); // after /api
  const [a, b, c] = parts.map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });
  const m = req.method;

  if (m === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    return res.end();
  }

  // GET /api/health
  if (a === 'health' && !b) {
    if (m !== 'GET' && m !== 'HEAD') throw new HttpError(405, 'Method not allowed');
    return sendJSON(req, res, 200, { ok: true, service: 'adelia-room', time: Date.now() });
  }

  // GET /api/guestbook  ·  POST /api/guestbook
  if (a === 'guestbook' && !b) {
    if (m === 'GET' || m === 'HEAD') {
      const n = Math.max(1, Math.min(LIST_MAX, Number(url.searchParams.get('limit')) || LIST_MAX));
      return sendJSON(req, res, 200, { notes: latestNotes(store.all('guestbook'), n) });
    }
    if (m !== 'POST') throw new HttpError(405, 'Method not allowed');
    limit('form', req);
    const ip = clientIp(req, TRUST_PROXY);
    const body = await readJSON(req, BODY.small);
    const rec = validateNote(body);
    // counted after validation, so a refused note doesn't use up the visitor's quota
    const r = LIMITS.guestbook.hit(`guestbook:${ip}`);
    if (!r.ok) throw new HttpError(429, 'The aquarium needs a minute: five creatures per ten minutes.', { 'Retry-After': String(r.retryAfter) });
    const now = Date.now();
    if (!rec) return sendJSON(req, res, 201, { note: publicNote({ id: rid(), createdAt: now, name: 'Anonymous visitor', note: '', creature: {} }) });
    const stored = store.insert('guestbook', { id: rid(), createdAt: now, ...rec, ipHash: ipHash(ip, IP_SALT) });
    return sendJSON(req, res, 201, { note: publicNote(stored) });
  }

  // POST /api/agent → server/agent.mjs (Moci's online brain)
  if (a === 'agent' && !b) {
    if (m !== 'POST') throw new HttpError(405, 'Method not allowed');
    limit('agent', req);
    const body = await readJSON(req, BODY.agent);
    const out = await runAgent(body, clientIp(req, TRUST_PROXY));
    return sendJSON(req, res, out.status, out.json, out.retryAfter != null ? { 'Retry-After': String(out.retryAfter) } : {});
  }

  // /api/content
  if (a === 'content' && !b) {
    if (m === 'GET' || m === 'HEAD') return sendJSON(req, res, 200, store.getContent() || {});
    if (m === 'PUT') {
      requireAdmin(req, url);
      const body = await readJSON(req, BODY.content);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a JSON object');
      const next = {};
      for (const k of ['news', 'launch', 'redirect', 'events', 'marquee']) {
        if (!(k in body)) continue;
        const v = body[k];
        if (k === 'news' || k === 'events') {
          if (!Array.isArray(v)) throw new HttpError(422, `${k} must be an array`);
          next[k] = v.slice(0, 200).map((x) => cleanContent(x)).filter(Boolean);
        } else if (k === 'marquee') next[k] = typeof v === 'string' ? v.trim().slice(0, 600) : '';
        else {
          if (!v || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(422, `${k} must be an object`);
          next[k] = cleanContent(v);
        }
      }
      if (next.redirect && next.redirect.url && !/^(https?:|mailto:|tel:)/i.test(next.redirect.url)) throw new HttpError(422, 'Redirect URL must start with https://, http://, mailto: or tel:');
      store.setContent({ ...(store.getContent() || {}), ...next, updatedAt: Date.now() });
      return sendJSON(req, res, 200, store.getContent());
    }
    throw new HttpError(405, 'Method not allowed');
  }

  // POST /api/events
  if (a === 'events' && !b) {
    if (m !== 'POST') throw new HttpError(405, 'Method not allowed');
    limit('write', req);
    const body = await readJSON(req, BODY.events);
    const list = Array.isArray(body?.events) ? body.events : Array.isArray(body) ? body : null;
    if (!list) throw new HttpError(400, 'Expected { events: [...] }');
    const now = Date.now();
    const recs = [];
    for (const raw of list.slice(0, EVENT_BATCH_MAX)) {
      if (!raw || typeof raw !== 'object') continue;
      const e = clean(raw) || {};
      if (typeof e.type !== 'string' || !e.type) continue;
      const t = Number(e.t);
      recs.push({
        id: rid(),
        createdAt: now,
        type: e.type.slice(0, 64),
        data: e.data && typeof e.data === 'object' && !Array.isArray(e.data) ? e.data : {},
        sessionId: typeof e.sessionId === 'string' ? e.sessionId.slice(0, 64) : 'anon',
        t: Number.isFinite(t) && Math.abs(t - now) < 7 * 864e5 ? t : now,
        path: typeof e.path === 'string' ? e.path.slice(0, 200) : '',
      });
    }
    if (recs.length) store.insertMany('analytics', recs);
    return sendJSON(req, res, 200, { ok: true, accepted: recs.length });
  }

  // GET /api/scores?game=x
  if (a === 'scores' && !b && (m === 'GET' || m === 'HEAD')) {
    const game = (url.searchParams.get('game') || '').slice(0, 40);
    return sendJSON(req, res, 200, topScores(game));
  }

  // PUT /api/profiles/:id
  if (a === 'profiles' && b && !c) {
    if (m !== 'PUT') throw new HttpError(405, 'Method not allowed');
    limit('write', req);
    if (!/^[\w.-]{1,64}$/.test(b)) throw new HttpError(400, 'Invalid profile id');
    const body = await readJSON(req, BODY.profile);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a JSON object');
    const patch = stripMeta(clean(body) || {});
    normaliseEmail(patch, false);
    if ('points' in patch) patch.points = Math.max(0, Math.min(1e7, Number(patch.points) || 0));
    const rec = store.upsert('profiles', b, patch);
    return sendJSON(req, res, 200, rec);
  }

  // POST /api/<collection>
  if (PUBLIC_COLLECTIONS.has(a) && !b) {
    if (m !== 'POST') throw new HttpError(405, 'Method not allowed');
    limit('form', req);
    const body = await readJSON(req, BODY.form);
    const rec = validateRecord(a, body);
    const now = Date.now();
    if (a === 'waitlist') {
      // one row per email: re-joining refreshes the row instead of duplicating it
      const existing = store.all('waitlist').find((r) => r.email === rec.email);
      if (existing) {
        const merged = store.upsert('waitlist', existing.id, Object.fromEntries(Object.entries(rec).filter(([, v]) => v !== '' && v != null)), now);
        return sendJSON(req, res, 200, merged);
      }
    }
    const stored = store.insert(a, { id: rid(), createdAt: now, ...rec });
    return sendJSON(req, res, 201, stored);
  }

  /* ---------------- admin ---------------- */
  if (a === 'admin') {
    // POST /api/admin/login
    if (b === 'login' && !c) {
      if (m !== 'POST') throw new HttpError(405, 'Method not allowed');
      limit('login', req);
      const body = await readJSON(req, BODY.small);
      if (!auth.checkPassword(body?.password)) {
        await new Promise((r) => setTimeout(r, 350)); // blunt brute force a little more
        throw new HttpError(401, 'Wrong password');
      }
      return sendJSON(req, res, 200, { token: auth.issue(), expiresIn: auth.ttl });
    }

    // GET /api/admin/data
    if (b === 'data' && !c) {
      if (m !== 'GET' && m !== 'HEAD') throw new HttpError(405, 'Method not allowed');
      requireAdmin(req, url);
      const collections = Object.fromEntries(COLLECTIONS.map((k) => [k, store.newestFirst(k)]));
      return sendJSON(req, res, 200, { collections, content: store.getContent() || {} });
    }

    // GET /api/admin/export/:collection.csv
    if (b === 'export' && c) {
      if (m !== 'GET' && m !== 'HEAD') throw new HttpError(405, 'Method not allowed');
      requireAdmin(req, url, true);
      const name = c.replace(/\.csv$/i, '');
      if (!COLLECTIONS.includes(name)) throw new HttpError(404, 'Unknown collection');
      const csv = toCSV(store.newestFirst(name));
      const day = new Date().toISOString().slice(0, 10);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="adelia-room-${name}-${day}.csv"`);
      res.setHeader('Cache-Control', 'no-store');
      const buf = Buffer.from(csv);
      res.setHeader('Content-Length', buf.length);
      return res.end(m === 'HEAD' ? undefined : buf);
    }

    // PATCH /api/admin/guestbook/:id { approved } — hide a note without deleting it
    if (b === 'guestbook' && c && m === 'PATCH') {
      requireAdmin(req, url);
      const body = await readJSON(req, BODY.small);
      if (typeof body?.approved !== 'boolean') throw new HttpError(422, 'Expected { approved: boolean }');
      if (!store.get('guestbook', c)) throw new HttpError(404, 'Not found');
      return sendJSON(req, res, 200, store.upsert('guestbook', c, { approved: body.approved }));
    }

    // DELETE /api/admin/:collection/:id
    if (COLLECTIONS.includes(b) && c) {
      if (m !== 'DELETE') throw new HttpError(405, 'Method not allowed');
      requireAdmin(req, url);
      if (!store.remove(b, c)) throw new HttpError(404, 'Not found');
      return sendJSON(req, res, 200, { ok: true });
    }
  }

  throw new HttpError(404, 'Not found');
}

/** CMS values: cleaned like any record but with roomier string caps. */
function cleanContent(v) {
  const walk = (x, depth) => {
    if (x == null) return x;
    if (typeof x === 'string') return x.replace(/\u0000/g, '').slice(0, 20000);
    if (typeof x === 'number') return Number.isFinite(x) ? x : 0;
    if (typeof x === 'boolean') return x;
    if (depth > 5) return undefined;
    if (Array.isArray(x)) return x.slice(0, 200).map((y) => walk(y, depth + 1)).filter((y) => y !== undefined);
    if (typeof x === 'object') {
      const o = {};
      for (const [k, y] of Object.entries(x).slice(0, 60)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        const w = walk(y, depth + 1);
        if (w !== undefined) o[k.slice(0, 64)] = w;
      }
      return o;
    }
    return undefined;
  };
  return walk(v, 0);
}

/* ------------------------------------------------------------ server */
const server = http.createServer(async (req, res) => {
  const t0 = performance.now();
  let url;
  try {
    url = new URL(req.url || '/', 'http://localhost');
  } catch {
    res.statusCode = 400;
    return res.end('Bad request');
  }
  const isApi = url.pathname === '/api' || url.pathname.startsWith('/api/');
  if (isApi && !QUIET) res.once('finish', () => log.info(`${req.method} ${url.pathname} ${res.statusCode} ${(performance.now() - t0).toFixed(1)}ms`));
  securityHeaders(req, res);
  try {
    if (isApi) await api(req, res, url);
    else {
      const handled = await serveStatic(req, res, url, () => {});
      if (!handled) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405;
          res.setHeader('Allow', 'GET, HEAD');
          return res.end();
        }
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end('Not found');
      }
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) log.error(req.method, url.pathname, e?.stack || e);
    if (!res.headersSent) sendJSON(req, res, status, { error: status === 500 ? 'Internal error' : e.message }, e.extra || {});
    else res.destroy();
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;

server.on('clientError', (err, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});

server.listen(PORT, HOST, () => {
  const counts = store.counts();
  log.info(`Adelia's Room server on http://${HOST || 'localhost'}:${PORT}`);
  log.info(`  data → ${DATA_DIR}  (${Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(' ')})`);
  log.info(`  dist → ${DIST_DIR}`);
  void loadAgent().then((mod) => log.info(`  agent → ${mod && typeof mod.handleAgent === 'function' ? 'server/agent.mjs' : 'unavailable (503, offline brain)'}`));
});

/* ------------------------------------------------------------ shutdown */
let closing = false;
async function shutdown(sig) {
  if (closing) return;
  closing = true;
  log.info(`${sig} received — closing…`);
  const force = setTimeout(() => {
    log.warn('forced exit');
    process.exit(1);
  }, 8000);
  force.unref();
  server.close();
  server.closeIdleConnections?.();
  try {
    await store.flush();
  } catch (e) {
    log.error('flush failed', e);
  }
  Object.values(LIMITS).forEach((l) => l.stop());
  log.info('bye');
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (e) => log.error('unhandledRejection', e));
