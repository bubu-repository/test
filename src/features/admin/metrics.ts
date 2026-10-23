/* ==========================================================================
   Admin metrics — everything the Overview shows, derived from AdminData.
   Works the same for the live API and local demo mode (where analytics
   events have no id/createdAt, only `t`).

   The funnel follows Adelia's goals for the site:
     visits → stations explored → case studies read → reached out
     (booked a chat · emailed her · downloaded the CV).
   Panels report those moments with track(); the event names this file
   understands are listed in SIGNALS below (it also reads a few generic
   shapes, e.g. a redirect to a mailto: link or to /cv.pdf).
   ========================================================================== */
import type { AdminData, Record_ } from '@/lib/api';
import { projects } from '@/content/projects';
import { ACHIEVEMENTS } from '@/state/achievements';
import { STATION_LIST } from '@/stage/stations';

export type RangeId = '7d' | '30d' | '90d' | 'all';
export const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
];

const DAY = 86_400_000;

/** A session counts as "explored" once it has found this many stations (the door not included). */
export const EXPLORED_MIN = 3;

/**
 * Event types the dashboard reads. Panels: track() one of these at the moment it happens.
 *   caseStudy  a case study was opened/read             data: { id | slug }
 *   booking    a chat was booked (the record also lands in `rsvps`)
 *   email      an email link was clicked or a message was sent from the room
 *   cv         the CV was opened or downloaded           data: { from }
 * Also recognised: any event whose `path` is /work/<slug>, and redirect/cta/big_button/link
 * events whose data.to | url | href is a mailto: link (email) or points at /cv.pdf (cv).
 */
export const SIGNALS = {
  caseStudy: ['work_view', 'work_read', 'case_study', 'case_open', 'case_read'],
  booking: ['rsvp', 'booking', 'book'],
  email: ['email', 'email_click', 'mailto', 'contact_email', 'os_mail_sent', 'phone_mail'],
  cv: ['cv_download', 'cv_open', 'cv'],
} as const;
const LINK_TYPES = new Set(['redirect', 'cta', 'big_button', 'link', 'social', 'outbound']);
const CASE = new Set<string>(SIGNALS.caseStudy);
const BOOK = new Set<string>(SIGNALS.booking);
const MAIL = new Set<string>(SIGNALS.email);
const CV = new Set<string>(SIGNALS.cv);

/** Best timestamp for any record. */
export function ts(r: Record_ | Record<string, unknown>): number {
  const v = (r.createdAt ?? r.t ?? r.updatedAt) as number | undefined;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
const touched = (r: Record_) => Math.max(ts(r), typeof r.updatedAt === 'number' ? (r.updatedAt as number) : 0);

/** YYYY-MM-DD in Bekasi (WIB, UTC+7). */
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
export const wibDay = (t: number) => dayFmt.format(new Date(t));

export function rangeBounds(range: RangeId, data: AdminData, now = Date.now()): { from: number; to: number; prevFrom: number | null } {
  const days = RANGES.find((r) => r.id === range)?.days ?? null;
  if (days) {
    // start of the WIB day (days-1) ago
    const from = startOfWibDay(now - (days - 1) * DAY);
    return { from, to: now, prevFrom: from - days * DAY };
  }
  let min = now;
  for (const rows of Object.values(data.collections))
    for (const r of rows) {
      const t = ts(r);
      if (t && t < min) min = t;
    }
  return { from: startOfWibDay(min), to: now, prevFrom: null };
}

export function startOfWibDay(t: number) {
  // WIB is UTC+7 with no DST
  const off = 7 * 3600_000;
  return Math.floor((t + off) / DAY) * DAY - off;
}

/* ------------------------------------------------------------ names */
const PROJECT_NAME = new Map(projects.map((p) => [p.slug, p.name]));

/** "ask-hr" → "Ask HR" (the case study's own name when it is one of hers). */
export function caseName(id: string) {
  return PROJECT_NAME.get(id) ?? prettify(id);
}

/** kebab/snake ids → "Sentence case" for display. */
export function prettify(id: string) {
  const s = id.replace(/^[a-z]+:/, '').replace(/[-_]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : id;
}

/** The fit-check result of a quiz record (id), whatever the panel called the field. */
export function quizKey(r: Record<string, unknown>): string | null {
  for (const k of ['result', 'resultId', 'fit', 'level', 'stack', 'quizResult', 'winner', 'top']) {
    const v = r[k];
    if (typeof v === 'string' && v) return v;
    if (v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string') return (v as { id: string }).id;
  }
  return null;
}
/** Human label of a fit-check result: the label the panel stored, else the prettified id. */
export function quizLabel(r: Record<string, unknown>): string {
  for (const k of ['resultLabel', 'resultName', 'label', 'title']) {
    const v = r[k];
    if (typeof v === 'string' && v) return v;
  }
  const res = r.result;
  if (res && typeof res === 'object') {
    const o = res as { label?: unknown; name?: unknown; title?: unknown };
    for (const v of [o.label, o.name, o.title]) if (typeof v === 'string' && v) return v;
  }
  const k = quizKey(r);
  return k ? prettify(k) : '';
}

/** An example note the site seeds into the aquarium (signed by Moci), not a visitor's. */
export const isHouseNote = (r: Record<string, unknown>) => r.house === true || String(r.id ?? '').startsWith('house-');

/* ------------------------------------------------------------ classify events */
function linkTarget(d: Record<string, unknown>): string {
  for (const k of ['url', 'href', 'to']) {
    const v = d[k];
    if (typeof v === 'string' && v) return v.toLowerCase();
  }
  return '';
}
const isCvTarget = (s: string) => /(^|\/)cv\.pdf\b/.test(s) || s === 'cv' || s === 'resume';
const isMailTarget = (s: string) => s.startsWith('mailto:') || s === 'email' || s === 'mail';

/** What an analytics event says about the visitor's progress. */
export function classify(e: Record_): { caseStudy?: string; booking?: true; email?: true; cv?: true } {
  const type = String(e.type || '');
  const d = (e.data && typeof e.data === 'object' ? e.data : {}) as Record<string, unknown>;
  const out: ReturnType<typeof classify> = {};
  if (CASE.has(type)) out.caseStudy = String(d.id ?? d.slug ?? d.work ?? 'case');
  const path = typeof e.path === 'string' ? e.path : '';
  const m = /^\/work\/([\w-]+)/.exec(path);
  if (m && !out.caseStudy && (type === 'view' || type === 'station' || type === 'page' || type === 'route')) out.caseStudy = m[1];
  if (BOOK.has(type)) out.booking = true;
  if (MAIL.has(type)) out.email = true;
  if (CV.has(type)) out.cv = true;
  if (LINK_TYPES.has(type)) {
    const target = linkTarget(d);
    if (isMailTarget(target)) out.email = true;
    if (isCvTarget(target)) out.cv = true;
  }
  return out;
}

/* ------------------------------------------------------------ overview */
interface Session {
  id: string;
  first: number;
  last: number;
  days: Set<string>;
  stations: Set<string>;
  cases: Set<string>;
  booked: boolean;
  emailed: boolean;
  cv: boolean;
  enquired: boolean;
  achievements: Set<string>;
}

export interface Count {
  n: number;
  prev: number | null;
}

export interface FunnelStep {
  id: string;
  label: string;
  /** sessions that did this step and every step before it */
  n: number;
  /** sessions that did this step at all, in any order */
  any: number;
}

export interface Overview {
  sessions: number;
  prevSessions: number | null;
  avgHearts: number;
  profiles: number;
  counts: Record<'rsvps' | 'leads' | 'waitlist' | 'quiz' | 'guestbook' | 'questions', Count>;
  emails: Count;
  cvs: Count;
  caseReaders: Count;
  caseReads: number;
  reached: number;
  reachRate: number; // 0..1
  avgStations: number;
  series: { day: string; t: number; v: number }[];
  funnel: FunnelStep[];
  stations: { id: string; code: string; name: string; chapter: string; n: number }[];
  cases: { id: string; name: string; n: number }[];
  achievements: { id: string; name: string; glyph: string; n: number }[];
  quiz: { id: string; name: string; n: number }[];
  moci: { asked: number; online: number; offline: number; abstained: number };
  recent: { collection: string; rec: Record_ }[];
  eventsInRange: number;
}

export function computeOverview(data: AdminData, range: RangeId, now = Date.now()): Overview {
  const { from, to, prevFrom } = rangeBounds(range, data, now);
  const inR = (t: number) => t >= from && t <= to;
  const inPrev = (t: number) => prevFrom != null && t >= prevFrom && t < from;
  const c = data.collections;

  const sessions = new Map<string, Session>();
  const prevSessions = new Set<string>();
  const get = (id: string, t: number) => {
    let s = sessions.get(id);
    if (!s) {
      s = { id, first: t, last: t, days: new Set(), stations: new Set(), cases: new Set(), booked: false, emailed: false, cv: false, enquired: false, achievements: new Set() };
      sessions.set(id, s);
    }
    s.first = Math.min(s.first, t);
    s.last = Math.max(s.last, t);
    s.days.add(wibDay(t));
    return s;
  };

  let eventsInRange = 0;
  let emails = 0;
  let emailsPrev = 0;
  let cvs = 0;
  let cvsPrev = 0;
  let caseReads = 0;
  const caseReadersPrev = new Set<string>();
  const caseCount = new Map<string, number>();
  const moci = { asked: 0, online: 0, offline: 0, abstained: 0 };
  let mociAskEvents = 0;

  for (const e of c.analytics || []) {
    const t = ts(e);
    const sid = typeof e.sessionId === 'string' ? e.sessionId : '';
    const k = classify(e);
    if (inPrev(t)) {
      if (sid && sid !== 'anon') prevSessions.add(sid);
      if (k.email) emailsPrev++;
      if (k.cv) cvsPrev++;
      if (k.caseStudy && sid) caseReadersPrev.add(sid);
    }
    if (!inR(t)) continue;
    eventsInRange++;
    if (k.email) emails++;
    if (k.cv) cvs++;
    const type = String(e.type || '');
    const d = (e.data || {}) as Record<string, unknown>;
    if (type === 'moci' && d.action === 'ask') {
      mociAskEvents++;
      if (d.abstained === true) moci.abstained++;
    }
    if (k.caseStudy) {
      caseReads++;
      caseCount.set(k.caseStudy, (caseCount.get(k.caseStudy) || 0) + 1);
    }
    if (!sid || sid === 'anon') continue;
    const s = get(sid, t);
    if ((type === 'stamp' || type === 'station') && typeof d.station === 'string' && d.station !== 'door') s.stations.add(d.station);
    if (type === 'achievement' && typeof d.id === 'string') s.achievements.add(d.id);
    if (k.caseStudy) s.cases.add(k.caseStudy);
    if (k.booking) s.booked = true;
    if (k.email) s.emailed = true;
    if (k.cv) s.cv = true;
    if (type === 'lead') s.enquired = true;
  }

  const profilesInRange: Record_[] = [];
  for (const p of c.profiles || []) {
    const t = touched(p);
    if (inPrev(t)) prevSessions.add(p.id);
    if (!inR(t)) continue;
    profilesInRange.push(p);
    const s = get(p.id, t);
    const stamps = Array.isArray(p.stamps) ? (p.stamps as string[]) : [];
    for (const st of stamps) if (st !== 'door') s.stations.add(st);
    for (const a of Array.isArray(p.achievements) ? (p.achievements as string[]) : []) s.achievements.add(a);
  }

  const counts = {} as Overview['counts'];
  for (const k of ['rsvps', 'leads', 'waitlist', 'quiz', 'guestbook', 'questions'] as const) {
    let n = 0;
    let prev = 0;
    for (const r of c[k] || []) {
      if (k === 'guestbook' && isHouseNote(r)) continue; // the site's own example notes
      const t = ts(r);
      if (inR(t)) {
        n++;
        const sid = typeof r.sessionId === 'string' ? r.sessionId : '';
        if (sid && sid !== 'anon') {
          const s = sessions.get(sid) ?? get(sid, t);
          if (k === 'rsvps') s.booked = true;
          if (k === 'leads') s.enquired = true;
        }
        if (k === 'questions') {
          if (r.answered === 'online') moci.online++;
          else moci.offline++;
        }
      } else if (inPrev(t)) prev++;
    }
    counts[k] = { n, prev: prevFrom != null ? prev : null };
  }
  moci.asked = Math.max(counts.questions.n, mociAskEvents);

  const all = [...sessions.values()];
  const reachedOut = (s: Session) => s.booked || s.emailed || s.cv || s.enquired;
  const reached = all.filter(reachedOut).length;

  // unique sessions per WIB day
  const series: Overview['series'] = [];
  const perDay = new Map<string, number>();
  for (const s of all) for (const d of s.days) perDay.set(d, (perDay.get(d) || 0) + 1);
  for (let t = startOfWibDay(from) + 12 * 3600_000; t <= to + DAY / 2; t += DAY) {
    const d = wibDay(t);
    if (series.length && series[series.length - 1].day === d) continue;
    series.push({ day: d, t, v: perDay.get(d) || 0 });
  }

  const hearts = profilesInRange.map((p) => (typeof p.points === 'number' ? p.points : 0));
  const avgHearts = hearts.length ? hearts.reduce((a, b) => a + b, 0) / hearts.length : 0;

  // funnel: n = sessions that also did every earlier step; any = sessions that did the step at all
  const explored = (s: Session) => s.stations.size >= EXPLORED_MIN;
  const read = (s: Session) => s.cases.size > 0;
  const f2 = all.filter(explored);
  const f3 = f2.filter(read);
  const f4 = f3.filter(reachedOut);
  const funnel: FunnelStep[] = [
    { id: 'visits', label: 'Visited the room', n: all.length, any: all.length },
    { id: 'explored', label: `Explored ${EXPLORED_MIN}+ stations`, n: f2.length, any: f2.length },
    { id: 'read', label: 'Read a case study', n: f3.length, any: all.filter(read).length },
    { id: 'reached', label: 'Reached out (booked · emailed · CV)', n: f4.length, any: reached },
  ];

  const stationCount = new Map<string, number>();
  for (const s of all) for (const st of s.stations) stationCount.set(st, (stationCount.get(st) || 0) + 1);
  const stations = STATION_LIST.map((st) => ({ id: st.id, code: st.code, name: st.name, chapter: st.chapter, n: st.id === 'door' ? all.length : stationCount.get(st.id) || 0 }));
  const avgStations = all.length ? all.reduce((a, s) => a + s.stations.size, 0) / all.length : 0;

  const caseIds = new Set([...projects.map((p) => p.slug), ...caseCount.keys()]);
  const cases = [...caseIds].map((id) => ({ id, name: caseName(id), n: caseCount.get(id) || 0 })).sort((a, b) => b.n - a.n);

  const achCount = new Map<string, number>();
  for (const s of all) for (const a of s.achievements) achCount.set(a, (achCount.get(a) || 0) + 1);
  const achievements = ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name, glyph: a.glyph, n: achCount.get(a.id) || 0 })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

  const quizCount = new Map<string, { name: string; n: number }>();
  for (const r of c.quiz || []) {
    if (!inR(ts(r))) continue;
    const k = quizKey(r);
    if (!k) continue;
    const cur = quizCount.get(k) ?? { name: quizLabel(r), n: 0 };
    cur.n++;
    quizCount.set(k, cur);
  }
  const quiz = [...quizCount.entries()].map(([id, v]) => ({ id, name: v.name, n: v.n })).sort((a, b) => b.n - a.n);

  const recent: Overview['recent'] = [];
  for (const k of ['rsvps', 'leads', 'guestbook', 'questions', 'quiz', 'waitlist', 'redemptions'] as const)
    for (const rec of c[k] || []) if (!(k === 'guestbook' && isHouseNote(rec))) recent.push({ collection: k, rec });
  recent.sort((a, b) => ts(b.rec) - ts(a.rec));

  return {
    sessions: all.length,
    prevSessions: prevFrom != null ? prevSessions.size : null,
    avgHearts,
    profiles: profilesInRange.length,
    counts,
    emails: { n: emails, prev: prevFrom != null ? emailsPrev : null },
    cvs: { n: cvs, prev: prevFrom != null ? cvsPrev : null },
    caseReaders: { n: funnel[2].any, prev: prevFrom != null ? caseReadersPrev.size : null },
    caseReads,
    reached,
    reachRate: all.length ? reached / all.length : 0,
    avgStations,
    series,
    funnel,
    stations,
    cases,
    achievements,
    quiz,
    moci,
    recent: recent.slice(0, 10),
    eventsInRange,
  };
}

/** Most-asked Moci questions: grouped by their words (case, punctuation and spacing ignored). */
export function topQuestions(rows: Record_[], limit = 8) {
  const m = new Map<string, { text: string; n: number }>();
  for (const r of rows) {
    const q = typeof r.question === 'string' ? r.question.trim() : '';
    if (!q) continue;
    const key = q
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    const cur = m.get(key) ?? { text: q, n: 0 };
    // show the tidiest wording of the group (capitalised, ends with "?")
    const tidy = (s: string) => (/^\p{Lu}/u.test(s) ? 1 : 0) + (/\?$/.test(s) ? 1 : 0);
    if (tidy(q) > tidy(cur.text)) cur.text = q;
    cur.n++;
    m.set(key, cur);
  }
  return [...m.entries()]
    .map(([key, v]) => ({ id: key, text: v.text, n: v.n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit);
}

/** event type → count (analytics view) */
export function eventTypes(rows: Record_[]) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const t = String(r.type || 'unknown');
    m.set(t, (m.get(t) || 0) + 1);
  }
  return [...m.entries()].map(([type, n]) => ({ type, n })).sort((a, b) => b.n - a.n);
}

export const compact = (n: number) =>
  Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : Math.abs(n) >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K' : n.toLocaleString('en-US');

export function fmtTime(t: number) {
  if (!t) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t));
}
export function fmtAgo(t: number, now = Date.now()) {
  if (!t) return '—';
  const s = Math.round((now - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtTime(t);
}
