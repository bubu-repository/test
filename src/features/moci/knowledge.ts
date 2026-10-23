/* ==========================================================================
   What Moci knows, built from her content (src/content/*) and the room
   (src/stage/stations.ts). Pure data, no browser APIs: the offline brain
   uses it in the visitor's browser, scripts/eval-moci.mjs runs it in Node,
   and scripts/build-knowledge.mjs writes it to server/knowledge.json for the
   online brain (server/agent.mjs can't import TypeScript).

   Sources: every answer about her points at the object in the room the
   facts come from. A source key ("wall/tenderlens") maps to a station and
   the props its panel opens with; tapping the chip walks the camera there.
   ========================================================================== */
import { bio, experience, identity, modelCard, practical, principles, skills, socials, tagline } from '@/content/profile';
import { projects } from '@/content/projects';
import { STATIONS, type StationId } from '@/stage/stations';

export interface MociSource {
  key: string;
  /** what the chip says ("Tenderlens case study") */
  label: string;
  station: StationId;
  props?: Record<string, unknown>;
}

export interface Doc {
  id: string;
  title: string;
  text: string;
  /** extra words that should match this doc even if they aren't in the text */
  keywords: string[];
  /** a key of SOURCES */
  source?: string;
}

/** The objects on the toolkit shelf and the capability each one stands for. */
export const TOOLKIT = [
  { focus: 'field-research', label: 'Field research · the cassette' },
  { focus: 'retrieval', label: 'Retrieval · the CD' },
  { focus: 'evals', label: 'Evals · the jar of marbles' },
  { focus: 'agents', label: 'Tool use and agents · the robot' },
  { focus: 'design', label: 'UX writing and design · the zines' },
  { focus: 'full-stack', label: 'Full-stack · the USB stick' },
];

/** Stations Moci can walk you to (everything but the door). */
export const ROOM_STATIONS: StationId[] = (Object.keys(STATIONS) as StationId[]).filter((id) => id !== 'door');

/** Case studies on the Wall of Work, by slug (= the gallery's `work` prop). */
export const WORK_SLUGS = projects.map((p) => p.slug);

const PROPER = new Set(['Moci', 'Adelia', 'Adelia’s', 'Bekasi', 'OS', 'ID', 'LED']);
/** An object's name inside a sentence: "The Ticket Printer" → "the ticket printer", "Her ID Card" → "her ID card". */
export function spokenName(id: StationId): string {
  const name = STATIONS[id].name;
  if (!/^(The|Her|Today’s|Today's) /.test(name)) return name;
  return name
    .split(' ')
    .map((w) => (PROPER.has(w) || /^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase()))
    .join(' ');
}

let sourceCache: Record<string, MociSource> | null = null;

/** Every source Moci may cite. Anything else in a "Source:" line is ignored. */
export function sources(): Record<string, MociSource> {
  if (sourceCache) return sourceCache;
  const list: MociSource[] = [
    { key: 'id-card', label: 'Her ID card', station: 'about' },
    { key: 'wall', label: 'Wall of Work', station: 'gallery' },
    ...projects.flatMap((p) => [
      { key: `wall/${p.slug}`, label: `${p.name} case study`, station: 'gallery' as StationId, props: { work: p.slug } },
      { key: `wall/${p.slug}#engineering`, label: `${p.name} · how it's built`, station: 'gallery' as StationId, props: { work: p.slug, section: 'engineering' } },
    ]),
    // the toolkit shelf: one object per capability (props.focus picks the object, see plate.ts HITS)
    ...TOOLKIT.map((t) => ({ key: `shelf/${t.focus}`, label: t.label, station: 'shelf' as StationId, props: { focus: t.focus } })),
    { key: 'printer', label: 'Book a chat', station: 'printer' },
    { key: 'moci-evals', label: 'How Moci is tested', station: 'moci', props: { view: 'evals' } },
    ...ROOM_STATIONS.map((id) => ({ key: `room/${id}`, label: STATIONS[id].name.replace(/^The /, ''), station: id })),
  ];
  sourceCache = Object.fromEntries(list.map((s) => [s.key, s]));
  return sourceCache;
}

export function sourceFor(key: string | undefined): MociSource | undefined {
  return key ? sources()[key.trim()] : undefined;
}

/* ------------------------------------------------------------ her record */

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const GENERIC = new Set(['the', 'company', 'inc', 'ltd', 'pt', 'tbk', 'corp', 'group', 'a', 'an']);

let recordCache: string | null = null;
/** Everywhere she has worked or built something, as one normalised string to search in. */
function record(): string {
  if (recordCache == null) {
    recordCache = ` ${normalise(
      [...experience.flatMap((e) => [e.org, e.title]), ...projects.flatMap((p) => [p.name, p.company ?? '', p.status, p.role.summary]), identity.domain].join(' '),
    )} `;
  }
  return recordCache;
}

/** "Did she work at Google?" → "Google". The organisation a question says she worked at, if any. */
export function namedEmployer(text: string): string | null {
  const m = text.match(/\b(?:work(?:ed|s|ing)?|intern(?:ed|ing)?|employed|job)\s+(?:at|for|by|with)\s+(?:the\s+|a\s+|an\s+)?([\w&.' -]{2,40}?)\s*(?:[?.!,]|$)/i);
  return m ? m[1].trim() : null;
}

const orgWords = (org: string) =>
  normalise(org)
    .split(' ')
    .filter((w) => w.length > 1 && !GENERIC.has(w));

/** Is this organisation anywhere in her experience or her projects? ("an HR startup" is; "Google" isn't.) */
export function onRecord(org: string): boolean {
  const words = orgWords(org);
  return words.length > 0 && words.every((w) => record().includes(` ${w} `));
}

/** Does this text name the organisation? (every meaningful word of it appears) */
export function names(text: string, org: string): boolean {
  const words = orgWords(org);
  const hay = ` ${normalise(text)} `;
  return words.length > 0 && words.every((w) => hay.includes(` ${w} `));
}

/** The experience entry an organisation on her record belongs to (by title and org). */
export function experienceFor(org: string) {
  const words = orgWords(org);
  if (!words.length) return undefined;
  return experience.find((e) => {
    const hay = ` ${normalise(`${e.title} ${e.org}`)} `;
    return words.every((w) => hay.includes(` ${w} `));
  });
}

/* ------------------------------------------------------------ retrieval docs */

/**
 * Her content is often written in her own voice ("I build…"). Moci talks about her in the third
 * person, so first-person text is quoted as hers rather than said as Moci's.
 */
export function voice(text: string): string {
  const t = text.trim();
  return /\b(I|I'm|I've|I'll|I'd)\b/.test(t) || /\b(my|me|mine)\b/i.test(t) ? `In her words: “${t}”` : t;
}

/** Retrieval documents for the offline brain, written as answer-ready sentences. */
export function buildDocs(): Doc[] {
  const docs: Doc[] = [
    {
      id: 'who',
      title: 'Who is Adelia',
      text: `${identity.name} is a fresh graduate and an ${identity.role}, Informatics class of 2026, based in ${identity.location}. ${voice(bio.short)}`,
      keywords: ['who', 'adelia', 'about', 'introduce', 'summary', 'background', 'tiara', 'graduate', 'new', 'grad', 'junior', 'fresh', 'level', 'experience', 'senior'],
      source: 'id-card',
    },
    {
      id: 'what',
      title: 'What she does',
      text: voice(`${tagline} ${bio.long[0]}`),
      keywords: ['do', 'does', 'role', 'job', 'work', 'end', 'product', 'designer', 'design', 'ux', 'ui', 'engineer', 'code'],
      source: 'id-card',
    },
    {
      id: 'approach',
      title: 'How she works',
      text: voice(bio.long[2]),
      keywords: ['vibe', 'coding', 'approach', 'process', 'prototype', 'method', 'workflow', 'ai', 'pair'],
      source: 'id-card',
    },
    {
      id: 'team',
      title: 'On a team',
      text: voice(bio.team),
      keywords: ['team', 'teamwork', 'collaborate', 'collaboration', 'pm', 'designer', 'squad', 'colleague'],
      source: 'id-card',
    },
    {
      id: 'principles',
      title: 'Her working principles',
      text: voice(principles.map((p) => `${p.title}: ${p.body}`).join(' ')),
      keywords: ['principles', 'values', 'believe', 'rules', 'house', 'philosophy', 'trust'],
      source: 'id-card',
    },
    {
      id: 'problems',
      title: 'Favourite problems',
      text: voice(bio.long[1]),
      keywords: ['favourite', 'favorite', 'problems', 'interest', 'passion', 'like', 'enjoy', 'agents', 'learned', 'shipping'],
      source: 'id-card',
    },
    {
      id: 'contact',
      title: 'Contact',
      text: `The fastest way to reach Adelia is email: ${identity.email}. She replies within a day. You can also book a chat at the pink ticket printer in this room.`,
      keywords: ['contact', 'email', 'mail', 'reach', 'hire', 'message', 'talk', 'call', 'connect', 'touch', 'book', 'chat', 'interview'],
      source: 'printer',
    },
    {
      id: 'availability',
      title: 'Availability',
      text: `${bio.availability} She works ${identity.workingHours.start}:00–${identity.workingHours.end}:00 ${identity.timeZoneLabel} and is happy to overlap with other time zones for calls.`,
      keywords: ['available', 'availability', 'hire', 'hiring', 'open', 'remote', 'relocate', 'job', 'role', 'full-time', 'freelance', 'start'],
      source: 'id-card',
    },
    {
      id: 'location',
      title: 'Location and time zone',
      text: `Adelia lives in ${identity.location}, just east of Jakarta. Her time zone is ${identity.timeZoneLabel}.`,
      keywords: ['where', 'location', 'based', 'city', 'country', 'timezone', 'time', 'zone', 'bekasi', 'jakarta', 'indonesia', 'live', 'lives'],
      source: 'room/clock',
    },
    {
      id: 'cv',
      title: 'CV',
      text: 'Her CV is with her ID card, the lanyard hanging on its hook in this room, next to the practical details for hiring teams.',
      keywords: ['cv', 'resume', 'résumé', 'download', 'pdf'],
      source: 'id-card',
    },
    {
      id: 'skills',
      title: 'Skills',
      text: skills.map((g) => `${g.name}: ${g.items.join(', ')}.`).join(' '),
      keywords: ['skills', 'stack', 'tech', 'technologies', 'tools', 'languages', 'know', 'frameworks', 'react', 'next', 'python', 'typescript', 'claude', 'llm'],
      source: 'id-card',
    },
    // one doc per line of her record, so "what's her GPA?" finds the degree, not the whole list
    ...experience.map((e, i) => ({
      id: `experience-${i}`,
      title: e.title,
      text: `${e.period}: ${e.title}, ${e.org}. ${voice(e.summary)}`,
      keywords: ['experience', 'career', 'history', 'previous', 'worked', ...experienceKeywords(`${e.title} ${e.org}`)],
      source: 'id-card',
    })),
    {
      id: 'limits',
      title: 'Honest limitations',
      text: `From her model card: ${modelCard.limitations.join('; ')}. Out of scope: ${modelCard.outOfScope.join('; ')}.`,
      keywords: ['weakness', 'weaknesses', 'limitations', 'bad', 'not', 'scope', 'gaps'],
      source: 'id-card',
    },
    {
      id: 'projects',
      title: 'Projects overview',
      text: `Four case studies hang on the Wall of Work: ${projects.map((p) => `${p.name} (${p.year}, ${p.kind}): ${p.tagline}`).join(' ')}`,
      keywords: ['projects', 'work', 'portfolio', 'built', 'shipped', 'products', 'case', 'studies', 'best', 'wall', 'posters'],
      source: 'wall',
    },
    {
      id: 'agents',
      title: 'Designing AI products',
      text: `She designs and builds how AI shows its work: sources, abstaining, evals, and a cheap way to fix mistakes. ${projects.map((p) => `${p.name}: ${p.decisions[0].title}. ${p.decisions[0].why}`).join(' ')}`,
      keywords: ['agent', 'agents', 'agentic', 'tool', 'tools', 'llm', 'ai', 'evals', 'eval', 'trust', 'uncertainty', 'design', 'claude'],
      source: 'wall',
    },
    {
      id: 'room',
      title: 'This room',
      text: "This room is Adelia's portfolio: you walk in, and every object opens part of her work. The posters are her case studies, the pink ticket printer books a chat, the lanyard ID card is her CV and practical details, the mug checks whether she fits your role, and the computer runs Adelia OS.",
      keywords: ['room', 'site', 'website', 'portfolio', 'objects', 'here', 'this', 'navigate', 'around', 'where', 'find'],
      source: 'room/gallery',
    },
    {
      id: 'moci',
      title: 'Moci',
      text: "I'm Moci, Adelia's agent: the clear jelly drop at the right end of her desk. I answer questions about her work and show where each answer comes from, and I can walk you to the right object in the room, copy her email, turn the sound on or off, or take you to the ticket printer to book a chat. I'm an AI agent, not Adelia. When the API is down I answer from an offline brain in your browser, and I say so.",
      keywords: ['moci', 'you', 'bot', 'agent', 'assistant', 'mascot', 'character', 'name', 'jelly', 'drop', 'plush', 'tested', 'eval'],
      source: 'moci-evals',
    },
  ];

  // The practical details a hiring team needs, one per line on her ID card.
  for (const p of practical) {
    docs.push({
      id: `practical-${normalise(p.label).replace(/ /g, '-')}`,
      title: p.label,
      text: `${p.label}: ${voice(p.value.replace(/\.?$/, '.'))}`,
      keywords: [...normalise(p.label).split(' '), ...(PRACTICAL_KEYWORDS[p.label] ?? [])],
      source: 'id-card',
    });
  }

  for (const p of projects) {
    const wall = `wall/${p.slug}`;
    const eng = `wall/${p.slug}#engineering`;
    const base = [p.slug, p.name.toLowerCase()];
    docs.push({
      id: `project-${p.slug}`,
      title: p.name,
      text: `${p.name}, ${p.year}: ${p.kind}. ${p.summary} Her role: ${p.role.title}. ${voice(p.role.summary)} Stack: ${p.stack.join(', ')}. Results: ${p.results.metrics.map((m) => `${m.value} ${m.label}`).join('; ')}.`,
      keywords: [
        ...base,
        ...p.stack.map((s) => s.toLowerCase()),
        p.kind.toLowerCase(),
        p.context.toLowerCase(),
        ...(p.company ? ['company', 'startup', 'in-house', 'intern', 'internship'] : []),
      ],
      source: wall,
    });
    // The engineering, split by question so retrieval finds the right part.
    const e = p.engineering;
    docs.push({
      id: `project-${p.slug}-engineering`,
      title: `${p.name}: how it's built`,
      text: voice(`${e.summary} The pipeline: ${e.pipeline.map((x) => `${x.step}: ${x.detail}`).join(' ')}`),
      keywords: [...base, 'built', 'build', 'engineering', 'architecture', 'pipeline', 'works', 'system', 'stack'],
      source: eng,
    });
    docs.push({
      id: `project-${p.slug}-evals`,
      title: `${p.name}: evals`,
      text: voice(`${e.evals.set} ${e.evals.gate}`),
      keywords: [...base, 'eval', 'evals', 'evaluate', 'evaluated', 'evaluation', 'test', 'tested', 'accuracy', 'measure', 'measured', 'frozen', 'labelled', 'quality'],
      source: eng,
    });
    docs.push({
      id: `project-${p.slug}-models`,
      title: `${p.name}: models`,
      text: voice(e.models.map((m) => `For ${m.task.toLowerCase()}, ${p.name} uses ${m.model}: ${m.why}`).join(' ')),
      keywords: [...base, 'model', 'models', 'llm', 'claude', 'use', 'uses', 'why', 'which', 'choose', 'chose'],
      source: eng,
    });
    docs.push({
      id: `project-${p.slug}-budgets`,
      title: `${p.name}: cost and latency`,
      text: voice(e.budgets.map((b) => `${b.label}: ${b.value} (${b.note.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase()).replace(/\.$/, '')}).`).join(' ')),
      keywords: [...base, 'cost', 'costs', 'latency', 'fast', 'slow', 'budget', 'budgets', 'price', 'run', 'money', 'expensive', 'cheap'],
      source: eng,
    });
    docs.push({
      id: `project-${p.slug}-lesson`,
      title: `${p.name}: lesson`,
      text: `On ${p.name}, the problem was: ${p.problem.body[0]} The key lesson, in her words: “${p.reflection}”`,
      keywords: [...base, 'lesson', 'learned', 'learn', 'challenge', 'hard', 'problem', 'difficult'],
      source: wall,
    });
  }

  // Every object in the room, so "where do I sign the guestbook?" walks you to the aquarium.
  for (const id of ROOM_STATIONS) {
    const st = STATIONS[id];
    docs.push({
      id: `station-${id}`,
      title: st.name,
      text: `${st.verb}${/[?!.]$/.test(st.verb) ? ' That' : ': that'}'s ${spokenName(id)}, here in the room.`,
      keywords: [id, ...normalise(`${st.name} ${st.verb}`).split(' '), ...(STATION_KEYWORDS[id] ?? [])],
      source: `room/${id}`,
    });
  }

  return docs;
}

/** Words people use for a line of her record that it doesn't contain. */
function experienceKeywords(titleAndOrg: string): string[] {
  const t = titleAndOrg.toLowerCase();
  if (/\b(b\.?sc|degree|university|informatics)\b/.test(t)) return ['education', 'degree', 'university', 'gpa', 'thesis', 'study', 'studied', 'graduate', 'graduated', 'school', 'college', 'major'];
  if (/\bintern/.test(t)) return ['intern', 'internship', 'startup', 'squad', 'mentor'];
  if (/\bcontract|part-time|freelance/.test(t)) return ['contract', 'current', 'currently', 'now', 'job', 'consultancy', 'maintain'];
  return [];
}

/** Words people use for a practical detail that its label doesn't contain. */
const PRACTICAL_KEYWORDS: Record<string, string[]> = {
  'Looking for': ['looking', 'want', 'role', 'position', 'job', 'seeking'],
  Graduated: ['graduate', 'graduated', 'degree', 'university', 'study'],
  Where: ['where', 'office', 'onsite', 'hybrid', 'remote', 'relocate', 'jakarta'],
  'Time zones': ['time', 'zone', 'timezone', 'overlap', 'hours', 'europe', 'us', 'cet', 'async'],
  'Work setup': ['visa', 'sponsorship', 'relocation', 'relocate', 'contractor', 'eor', 'citizen', 'abroad'],
  Start: ['start', 'notice', 'soon', 'join', 'begin', 'when'],
  Salary: ['salary', 'pay', 'compensation', 'rate', 'expectation'],
  Languages: ['language', 'languages', 'english', 'indonesian', 'speak', 'bahasa'],
  'AI in my work': ['claude', 'code', 'copilot', 'cursor', 'ai', 'tools', 'assistant', 'generated'],
  References: ['references', 'referees', 'reference', 'mentor', 'supervisor', 'vouch'],
  'Why a team now': ['why', 'team', 'now', 'company', 'motivation'],
};

/** Words people use for objects in the room that the station's name and verb don't contain. */
const STATION_KEYWORDS: Partial<Record<StationId, string[]>> = {
  printer: ['book', 'booking', 'chat', 'interview', 'call', 'meeting', 'schedule', 'ticket'],
  about: ['cv', 'resume', 'id', 'lanyard', 'practical', 'details'],
  gallery: ['posters', 'case', 'studies', 'work', 'projects'],
  quiz: ['fit', 'jd', 'job', 'description', 'match', 'matcher', 'mug'],
  sea: ['guestbook', 'aquarium', 'note', 'jelly', 'leave'],
  record: ['music', 'song', 'turntable', 'vinyl'],
  console: ['games', 'arcade', 'play', 'leaderboard'],
  pass: ['loyalty', 'points', 'hearts', 'tier'],
  book: ['stickers', 'achievements', 'binder'],
  badges: ['stickers', 'board'],
  button: ['email', 'linkedin', 'contact', 'reach'],
  computer: ['os', 'terminal', 'mail', 'desktop'],
  shelf: ['toolkit', 'capabilities', 'skills', 'tools', 'cassette', 'cd', 'jar', 'marbles', 'robot', 'zines', 'usb'],
  vault: ['gacha', 'capsule', 'tenderlens', 'pipeline', '3d'],
  window: ['weather', 'bekasi', 'outside', 'rain'],
  clock: ['time', 'clock', 'wib', 'timezone'],
  news: ['newspaper', 'news', 'updates', 'now'],
  launch: ['next', 'countdown', 'launch'],
  studio: ['camera', 'make', 'sticker', 'photo'],
  pack: ['booster', 'pack', 'cards', 'daily'],
  phone: ['phone', 'voice', 'dial', 'message'],
};

/* ------------------------------------------------------------ the online brain's knowledge */

/** The full knowledge base as text, for the server agent's system prompt (via server/knowledge.json). */
export function buildKnowledgeText(): string {
  const lines: string[] = [];
  lines.push(`# ${identity.name}`);
  lines.push(`Role: ${identity.role}. Location: ${identity.location}. Time zone: ${identity.timeZoneLabel}.`);
  lines.push(`Email: ${identity.email}. Website: ${identity.url}.`);
  lines.push(`Tagline: ${tagline}`);
  lines.push(`Availability: ${bio.availability}`);
  lines.push(`Currently: ${bio.now}`);
  lines.push('', '## Bio', ...bio.long, bio.team);
  lines.push('', '## Working principles', ...principles.map((p) => `- ${p.title}: ${p.body}`));
  lines.push('', '## Practical details for hiring teams (on her ID card)', ...practical.map((p) => `- ${p.label}: ${p.value}`));
  lines.push('', '## Skills', ...skills.map((g) => `- ${g.name}: ${g.items.join(', ')}`));
  lines.push('', '## Experience', ...experience.map((e) => `- ${e.period} · ${e.title} · ${e.org}: ${e.summary}${e.highlights?.length ? ` Highlights: ${e.highlights.join('; ')}.` : ''}`));
  lines.push('', '## Model card (playful self-description)');
  lines.push(`Intended use: ${modelCard.intendedUse.join('; ')}`);
  lines.push(`Out of scope: ${modelCard.outOfScope.join('; ')}`);
  lines.push(`Limitations: ${modelCard.limitations.join('; ')}`);
  lines.push(`Evals: ${modelCard.evals.map((e) => `${e.name}: ${e.score}`).join('; ')}`);
  const socialLinks = socials.filter((s) => s.href);
  if (socialLinks.length) lines.push(`Socials: ${socialLinks.map((s) => `${s.label} ${s.href}`).join(', ')}`);

  lines.push('', '## Projects (the four posters on the Wall of Work)');
  for (const p of projects) {
    lines.push('', `### ${p.name} (${p.year}) — ${p.kind}`, `Source keys: wall/${p.slug} (the case study), wall/${p.slug}#engineering (how it's built)`);
    lines.push(`Tagline: ${p.tagline}`);
    lines.push(`Summary: ${p.summary}`);
    lines.push(`Role: ${p.role.title}. ${p.role.summary} Team: ${p.team}. Timeline: ${p.timeline}.`);
    lines.push(`Stack: ${p.stack.join(', ')}`);
    lines.push(`Problem: ${p.problem.body.join(' ')} Constraints: ${p.problem.constraints.join('; ')}`);
    lines.push(`Process: ${p.process.map((s) => `${s.title} (${s.duration}): ${s.body}`).join(' ')}`);
    const e = p.engineering;
    lines.push(`Engineering: ${e.summary} Pipeline: ${e.pipeline.map((x) => `${x.step}: ${x.detail}`).join(' ')}`);
    lines.push(`Models: ${e.models.map((m) => `${m.task}: ${m.model} (${m.why})`).join('; ')}`);
    const last = e.evals.history.at(-1);
    lines.push(`Evals: ${e.evals.set} ${e.evals.gate}${last ? ` Latest (${last.version}): ${e.evals.series.map((x, i) => `${x.name} ${last.values[i]}${x.unit}`).join(', ')}.` : ''}`);
    lines.push(`Budgets: ${e.budgets.map((b) => `${b.label} ${b.value} (${b.note})`).join('; ')}`);
    lines.push(`Failure handling: ${e.failures.map((f) => `${f.when}: ${f.then}`).join(' ')}`);
    lines.push(`Results: ${p.results.metrics.map((m) => `${m.value} ${m.label} (${m.how})`).join('; ')}. ${p.results.body.join(' ')} Business: ${p.results.business}`);
    lines.push(`Reflection: ${p.reflection}`);
    lines.push(p.links.live ? `Links: live ${p.links.live}${p.links.repo ? `, repo ${p.links.repo}` : ''}` : `Where: ${p.company ?? 'in-house'}`);
    lines.push(`Status: ${p.status}`);
  }

  lines.push('', '## The room (stations you can walk the visitor to with walk_to)');
  for (const id of ROOM_STATIONS) lines.push(`- ${id}: ${STATIONS[id].name}. ${STATIONS[id].verb}.`);

  lines.push('', '## Source keys (for the "Source:" line)');
  for (const s of Object.values(sources())) lines.push(`- ${s.key}: ${s.label}`);
  return lines.join('\n');
}

/** Everything server/agent.mjs needs, as plain JSON (written by scripts/build-knowledge.mjs). */
export function knowledgeForServer() {
  return {
    identity: { name: identity.name, firstName: identity.firstName, email: identity.email, domain: identity.domain, url: identity.url },
    stations: ROOM_STATIONS.map((id) => ({ id, name: STATIONS[id].name, spoken: spokenName(id), verb: STATIONS[id].verb })),
    works: projects.map((p) => ({ slug: p.slug, name: p.name })),
    sources: Object.keys(sources()),
    text: buildKnowledgeText(),
  };
}
