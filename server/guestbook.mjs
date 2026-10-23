/* ==========================================================================
   Guestbook (the aquarium): validation, light moderation and the public
   shape of a note. A note is { name, note, creature } where the creature is
   a small object such as { shape: 'jelly', colour: 'pink', size: 0.8 }.
   ========================================================================== */
import crypto from 'node:crypto';
import { HttpError } from './util.mjs';

export const NAME_MAX = 40;
export const NOTE_MAX = 280;
export const LIST_MAX = 120;
const CREATURE_KEYS_MAX = 8;

// control characters (incl. newlines) and invisible / bidi-override characters
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u001F\u007F-\u009F]/g;
const INVISIBLE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Links, bare domains, markup links and email addresses. Notes carry words, not links. */
const LINKISH = new RegExp(
  [
    String.raw`\b(?:https?|ftp)://`,
    String.raw`\bwww\.`,
    String.raw`\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|id|cc|ly|app|dev|xyz|info|biz|ru|cn|tk|gg|link|site|online|shop|top|ai|sg|club|live|store|tech|click|vip|page)(?:/|\b)`,
    String.raw`<\s*a\b`,
    String.raw`\[(?:url|link)\b`,
    String.raw`[^\s@]+@[^\s@]+\.[a-z]{2,}`,
  ].join('|'),
  'i',
);

/** A short blocklist (English and Indonesian). Matching notes are refused, not masked. */
const PROFANITY =
  /\b(?:fuck\w*|motherfuck\w*|shit\w*|bullshit|bitch\w*|cunt\w*|asshole\w*|dickhead\w*|nigg\w*|fag(?:got)?s?|retard\w*|whore\w*|slut\w*|rape\w*|bangsat|bajingan|anjing|kontol|memek|ngentot|entot|goblok|tolol|jancok|jancuk|pepek|lonte|perek)\b/i;

function text(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(CTRL, ' ').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().slice(0, max + 1);
}

/** Refuse links and the blocklist; returns a human error message or ''. */
export function guard(s) {
  if (LINKISH.test(s)) return 'Notes can’t carry links or email addresses. To get in touch, book a chat at the receipt printer.';
  if (PROFANITY.test(s)) return 'Let’s keep the aquarium friendly. Try different words?';
  return '';
}

function creatureOf(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(422, 'Pick a creature for your note.');
  const out = {};
  let n = 0;
  for (const [rawKey, raw] of Object.entries(v)) {
    if (n >= CREATURE_KEYS_MAX) break;
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,15}$/.test(rawKey)) continue;
    const key = rawKey === 'color' ? 'colour' : rawKey === 'species' && !('shape' in v) ? 'shape' : rawKey;
    if (key in out) continue;
    let val;
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!/^[#a-zA-Z0-9 _-]{1,24}$/.test(s)) continue;
      val = s;
    } else if (typeof raw === 'number' && Number.isFinite(raw)) val = Math.round(Math.max(-1e4, Math.min(1e4, raw)) * 1000) / 1000;
    else if (typeof raw === 'boolean') val = raw;
    else continue;
    out[key] = val;
    n++;
  }
  if (typeof out.shape !== 'string') throw new HttpError(422, 'Pick a shape for your creature.');
  if (typeof out.colour !== 'string') throw new HttpError(422, 'Pick a colour for your creature.');
  return out;
}

/**
 * Validate a public POST body. Returns the record to store (without id/createdAt),
 * or null for a honeypot hit (the caller pretends it worked).
 */
export function validateNote(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a JSON object');
  // Honeypot: people never fill this field; bots do.
  if (typeof body.website === 'string' && body.website.trim()) return null;

  const name = text(body.name, NAME_MAX);
  const note = text(body.note ?? body.message, NOTE_MAX);
  if (name.length > NAME_MAX) throw new HttpError(422, `Names can be up to ${NAME_MAX} characters.`);
  if (note.length > NOTE_MAX) throw new HttpError(422, `Notes can be up to ${NOTE_MAX} characters.`);
  if (note.length < 2) throw new HttpError(422, 'Write a little something first.');
  const bad = guard(`${name} ${note}`);
  if (bad) throw new HttpError(422, bad);

  const rec = { name: name || 'Anonymous visitor', note, creature: creatureOf(body.creature), approved: true };
  if (typeof body.sessionId === 'string' && /^[\w.-]{1,64}$/.test(body.sessionId)) rec.sessionId = body.sessionId;
  return rec;
}

/** What visitors may see: never the IP hash, the session id or the moderation flag. */
export function publicNote(r) {
  return { id: r.id, createdAt: r.createdAt, name: r.name, note: r.note, creature: r.creature };
}

/** Newest approved notes first. */
export function latestNotes(all, limit = LIST_MAX) {
  const out = [];
  for (let i = all.length - 1; i >= 0 && out.length < limit; i--) {
    const r = all[i];
    if (r && r.approved !== false && typeof r.note === 'string') out.push(publicNote(r));
  }
  return out;
}

/** A short, salted hash of the IP so the admin can spot repeat posters without storing IPs. */
export function ipHash(ip, salt) {
  return crypto.createHash('sha256').update(`${salt}|${ip}`).digest('base64url').slice(0, 12);
}
