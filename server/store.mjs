/* ==========================================================================
   Tiny JSON document store — one file per collection in DATA_DIR.
   • Loaded synchronously at boot (a corrupt file is moved aside, not lost).
   • Writes are debounced and atomic (write tmp → fsync → rename), serialised
     per collection, and flushed on shutdown.
   ========================================================================== */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

/** `rsvps` keeps its id for old data; in the room it holds bookings (intro calls, coffee chats). */
export const COLLECTIONS = ['rsvps', 'leads', 'waitlist', 'quiz', 'scores', 'profiles', 'redemptions', 'guestbook', 'questions', 'analytics'];

/** Maximum records kept per collection (oldest are dropped first). */
export const CAPS = {
  rsvps: 20000,
  leads: 20000,
  waitlist: 50000,
  quiz: 50000,
  scores: 50000,
  profiles: 100000,
  redemptions: 20000,
  guestbook: 5000,
  questions: 20000,
  analytics: 50000,
};

const DEBOUNCE_MS = 400;
const MAX_WAIT_MS = 2500;

export function createStore(dir, log = console) {
  fs.mkdirSync(dir, { recursive: true });

  /** @type {Record<string, any[]>} records kept oldest → newest */
  const data = {};
  /** @type {Record<string, any>} */
  let content = {};
  const timers = {};
  const firstDirty = {};
  const chains = {};

  const file = (name) => path.join(dir, `${name}.json`);

  function readJSON(name, fallback) {
    const f = file(name);
    if (!fs.existsSync(f)) return fallback;
    try {
      const raw = fs.readFileSync(f, 'utf8');
      return raw.trim() ? JSON.parse(raw) : fallback;
    } catch (e) {
      const aside = `${f}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(f, aside);
      } catch {}
      log.warn(`[store] ${name}.json could not be parsed (${e.message}); moved to ${path.basename(aside)}`);
      return fallback;
    }
  }

  for (const c of COLLECTIONS) {
    const v = readJSON(c, []);
    data[c] = Array.isArray(v) ? v : [];
  }
  {
    const v = readJSON('content', {});
    content = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  }

  async function writeNow(name) {
    clearTimeout(timers[name]);
    timers[name] = null;
    firstDirty[name] = 0;
    const value = name === 'content' ? content : data[name];
    const json = JSON.stringify(value);
    const target = file(name);
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    // serialise writes per collection so renames never race
    chains[name] = (chains[name] || Promise.resolve()).then(async () => {
      try {
        const fh = await fsp.open(tmp, 'w');
        try {
          await fh.writeFile(json, 'utf8');
          await fh.sync();
        } finally {
          await fh.close();
        }
        await fsp.rename(tmp, target);
      } catch (e) {
        log.error(`[store] failed to write ${name}: ${e.message}`);
        fsp.rm(tmp, { force: true }).catch(() => {});
      }
    });
    return chains[name];
  }

  function schedule(name) {
    const now = Date.now();
    if (!firstDirty[name]) firstDirty[name] = now;
    clearTimeout(timers[name]);
    const wait = Math.max(0, Math.min(DEBOUNCE_MS, firstDirty[name] + MAX_WAIT_MS - now));
    timers[name] = setTimeout(() => void writeNow(name), wait);
  }

  return {
    dir,
    all(name) {
      return data[name] || [];
    },
    /** newest first (copy) */
    newestFirst(name) {
      return (data[name] || []).slice().reverse();
    },
    insert(name, rec) {
      const list = data[name];
      list.push(rec);
      const cap = CAPS[name] ?? 20000;
      if (list.length > cap) list.splice(0, list.length - cap);
      schedule(name);
      return rec;
    },
    insertMany(name, recs) {
      const list = data[name];
      for (const r of recs) list.push(r);
      const cap = CAPS[name] ?? 20000;
      if (list.length > cap) list.splice(0, list.length - cap);
      schedule(name);
      return recs.length;
    },
    get(name, id) {
      return (data[name] || []).find((r) => r.id === id) || null;
    },
    /** merge into an existing record (or create it). */
    upsert(name, id, patch, now = Date.now()) {
      const list = data[name];
      const i = list.findIndex((r) => r.id === id);
      let rec;
      if (i >= 0) {
        rec = { ...list[i], ...patch, id, createdAt: list[i].createdAt ?? now, updatedAt: now };
        list[i] = rec;
      } else {
        rec = { ...patch, id, createdAt: now, updatedAt: now };
        list.push(rec);
        const cap = CAPS[name] ?? 20000;
        if (list.length > cap) list.splice(0, list.length - cap);
      }
      schedule(name);
      return rec;
    },
    remove(name, id) {
      const list = data[name];
      const i = list.findIndex((r) => r.id === id);
      if (i < 0) return false;
      list.splice(i, 1);
      schedule(name);
      return true;
    },
    getContent() {
      return content;
    },
    setContent(v) {
      content = v;
      schedule('content');
      return content;
    },
    counts() {
      return Object.fromEntries(COLLECTIONS.map((c) => [c, data[c].length]));
    },
    /** write everything that is pending right now */
    async flush() {
      const pending = Object.keys(timers).filter((k) => timers[k]);
      await Promise.all(pending.map((k) => writeNow(k)));
      await Promise.all(Object.values(chains));
    },
  };
}
