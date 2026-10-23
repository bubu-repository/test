/* ==========================================================================
   jelly-sh — the shell in Adelia OS (ported in spirit from the legacy
   adelia.cc terminal: a tiny shell over a virtual filesystem of her work).
   Pure-ish command implementations; the Terminal component supplies an IO
   context (print, clear, root, matrix, exit).
   ========================================================================== */
import { CHAPTERS, COMPANY, ECOSYSTEM, EDGE, PRODUCTS, TIMELINE, TRACKS, WORK } from '@/lib/content';
import { bio, modelCard, practical, skills } from '@/content/profile';
import { projects } from '@/content/projects';
import { ACHIEVEMENTS, nextTier, tierFor } from '@/state/achievements';
import { game } from '@/state/game';
import { useUI } from '@/state/ui';
import { formatDate, formatTime, TZ, useWeather } from '@/lib/weather';
import { audio, sfx } from '@/audio/engine';
import { music } from '@/audio/music';
import { apiMode, track } from '@/lib/api';
import { focus } from '@/stage/director';
import type { PanelId, StationId } from '@/stage/stations';
import { os, type AppId } from '../../wm';
import { hasOnce, once } from '../../util';
import { TRASH_BODY, TRASH_FILE } from '../Trash';

export type Kind = 'in' | 'out' | 'err' | 'ok' | 'acc' | 'dim' | 'pre' | 'kv' | 'link';

export interface IO {
  print: (text: string | string[], kind?: Kind) => void;
  clear: () => void;
  history: () => string[];
  root: () => boolean;
  setRoot: (r: boolean) => void;
  matrix: (ms: number) => Promise<void>;
  calm: () => boolean;
  exit: () => void;
  wait: (ms: number) => Promise<void>;
}

/** Moci, the jelly drop (legacy neofetch art). */
export const MOCI = [
  "     .-''''-.     ",
  "   .'  ●  ●  '.   ",
  '  /     ▾      \\  ',
  ' |  ˘        ˘  | ',
  '  \\            /  ',
  "   '-.______.-'   ",
];

const LOGO = [' ▄▀▀▄ █▀▀▄ █▀▀▀ █    ▀█▀ ▄▀▀▄', ' █▄▄█ █  █ █▀▀  █     █  █▄▄█', ' █  █ █▄▄▀ █▄▄▄ █▄▄▄ ▄█▄ █  █'];

export const COMMANDS: { name: string; help: string; hidden?: boolean }[] = [
  { name: 'help', help: 'list commands' },
  { name: 'whoami', help: 'her, and you' },
  { name: 'ls', help: 'list files  ·  ls projects' },
  { name: 'cat', help: 'print a file  ·  cat evals' },
  { name: 'open', help: 'open an app, a case or a file  ·  open cv' },
  { name: 'hire-me', help: 'the short version, for hiring teams' },
  { name: 'book', help: 'book a chat at the ticket printer' },
  { name: 'email', help: 'copy her email address' },
  { name: 'ask', help: 'ask Moci  ·  ask is she available?' },
  { name: 'now', help: 'what she is doing right now' },
  { name: 'skills', help: 'what she works with' },
  { name: 'weather', help: 'live weather in Bekasi' },
  { name: 'date', help: 'the time in Bekasi, and yours' },
  { name: 'hearts', help: 'your hearts and tier' },
  { name: 'stickers', help: 'your sticker book' },
  { name: 'fit', help: 'the 60-second fit check' },
  { name: 'play', help: 'pick up the cloud handheld' },
  { name: 'music', help: 'play / pause the record' },
  { name: 'neofetch', help: 'system info, with feeling' },
  { name: 'history', help: 'what you typed' },
  { name: 'echo', help: 'say something back' },
  { name: 'clear', help: 'clear the screen' },
  { name: 'sudo', help: 'try your luck' },
  { name: 'hack', help: 'definitely not hacking' },
  { name: 'exit', help: 'close the terminal' },
  // undocumented
  { name: 'cv', help: '', hidden: true },
  { name: 'hire', help: '', hidden: true },
  { name: 'rsvp', help: '', hidden: true },
  { name: 'quiz', help: '', hidden: true },
  { name: 'points', help: '', hidden: true },
  { name: 'achievements', help: '', hidden: true },
  { name: 'moci', help: '', hidden: true },
  { name: 'rules', help: '', hidden: true },
  { name: 'adelia', help: '', hidden: true },
  { name: 'please', help: '', hidden: true },
  { name: 'cd', help: '', hidden: true },
  { name: 'pwd', help: '', hidden: true },
  { name: 'rm', help: '', hidden: true },
  { name: 'coffee', help: '', hidden: true },
  { name: 'ping', help: '', hidden: true },
  { name: 'man', help: '', hidden: true },
  { name: 'vim', help: '', hidden: true },
  { name: 'konami', help: '', hidden: true },
];

/* ---------------------------------------------------------------- files */
const ROOT_FILES = ['README.md', 'now.txt', 'contact.txt', 'evals.txt', 'model-card.md', 'house-rules.txt', 'cv.pdf', 'projects/', 'toolkit/', 'archive/', 'links/', 'trash/'];
const DIRS: Record<string, string[]> = {
  projects: WORK.map((w) => `${w.id}.md`),
  toolkit: PRODUCTS.map((p) => `${p.id}.spec`),
  archive: TIMELINE.map((t) => `${t.year}.txt`),
  links: ECOSYSTEM.map((e) => `${e.id}.url`),
  trash: [TRASH_FILE],
};
export function allPaths(): string[] {
  const out = ROOT_FILES.filter((f) => !f.endsWith('/'));
  for (const [d, fs] of Object.entries(DIRS)) {
    out.push(d + '/');
    fs.forEach((f) => out.push(`${d}/${f}`));
  }
  return out;
}

type Target = AppId | 'cv' | 'wall' | 'printer' | 'moci' | 'paper' | 'shelf' | 'quiz';
const APP_ALIASES: Record<string, Target> = {
  cases: 'cases',
  'case-files': 'cases',
  work: 'cases',
  mail: 'mail',
  archive: 'archive',
  links: 'links',
  settings: 'settings',
  trash: 'trash',
  terminal: 'terminal',
  about: 'about',
  'model-card': 'about',
  'model-card.md': 'about',
  sysinfo: 'sysinfo',
  cv: 'cv',
  'cv.pdf': 'cv',
  wall: 'wall',
  gallery: 'wall',
  printer: 'printer',
  book: 'printer',
  moci: 'moci',
  paper: 'paper',
  news: 'paper',
  toolkit: 'shelf',
  shelf: 'shelf',
  fit: 'quiz',
  quiz: 'quiz',
};
export const OPENABLE = [...Object.keys(APP_ALIASES), ...WORK.map((w) => w.id), ...ECOSYSTEM.filter((e) => /^https?:/.test(e.url)).map((e) => e.id)];

const pad = (s: string, n: number) => (s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length));
const practicalOf = (label: string) => practical.find((p) => p.label === label)?.value ?? '';
const firstSentence = (s: string) => s.split(/(?<=\.)\s/)[0].replace(/\.$/, '');
const visitorZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your time zone';
  } catch {
    return 'your time zone';
  }
};

function evalsReport(): string[] {
  const out = ['EVALS · from her model card', ...modelCard.evals.map((e) => `  ${pad(e.name, 50)}${e.score}`), '', 'PER PROJECT · the latest version, on its own eval set'];
  for (const p of projects) {
    const e = p.engineering.evals;
    const last = e.history[e.history.length - 1];
    if (!last) continue;
    out.push(`  ${p.name} ${last.version} · ${last.change}`);
    e.series.forEach((s, i) => {
      const v = last.values[i];
      if (v === undefined) return;
      const c = last.counts?.[i];
      out.push(`    ${pad(s.name, 34)}${v}${s.unit}${c ? `  (${c})` : ''}`);
    });
  }
  return out;
}

function readFile(raw: string): string[] | null {
  const p = raw.replace(/^~\//, '').replace(/^\.\//, '').replace(/^\//, '').toLowerCase();
  const g = game();
  switch (p) {
    case 'readme.md':
    case 'readme':
      return [
        '# Adelia OS 26.10',
        `You are at ${COMPANY.name}'s desk: ${COMPANY.role}, ${COMPANY.degree} (${COMPANY.cohort.toLowerCase()}), ${COMPANY.city}.`,
        'Everything in here is real: the case files, the evals, the links.',
        'Try: ls projects · cat evals · open cv · hire-me · help',
      ];
    case 'now.txt':
    case 'now':
      return [bio.now, '', bio.availability];
    case 'contact.txt':
    case 'contact':
      return [
        `email     ${COMPANY.email}`,
        `hours     ${String(COMPANY.workingHours.start).padStart(2, '0')}:00–${COMPANY.workingHours.end}:00 ${COMPANY.timeZoneLabel}`,
        `replies   ${COMPANY.replyTime.toLowerCase()}`,
        `site      ${COMPANY.site}`,
        ...COMPANY.socials.map((s) => `${pad(s.label.toLowerCase(), 10)}${s.url}`),
      ];
    case 'evals.txt':
    case 'evals':
      return evalsReport();
    case 'model-card.md':
    case 'model-card':
      return [
        `# Model card · ${COMPANY.name} · ${modelCard.version}`,
        `architecture   ${modelCard.architecture}`,
        '',
        'training data',
        ...modelCard.trainingData.map((t) => `  · ${t}`),
        'intended use',
        ...modelCard.intendedUse.map((t) => `  · ${t}`),
        'out of scope',
        ...modelCard.outOfScope.map((t) => `  × ${t}`),
        'limitations',
        ...modelCard.limitations.map((t) => `  ! ${t}`),
        '',
        "Scores: cat evals",
      ];
    case 'house-rules.txt':
    case 'house-rules':
      return [
        'THE HOUSE RULES',
        ...CHAPTERS.map((c) => `  ${pad(c.roman + '.', 5)}${pad(c.title, 9)}${g.manifesto[c.id] ? c.line : '▒▒▒▒▒▒▒▒▒▒▒▒▒▒  (find it in the room)'}`),
        '',
        `${Object.keys(g.manifesto).length}/${CHAPTERS.length} rules collected.`,
      ];
    case 'cv.pdf':
      return ["Binary file (PDF, one page). Run 'open cv' to download it."];
    case '.secret':
      return ['There is a sticker for asking this terminal nicely.', "Try 'please', or 'sudo' anything."];
  }
  if (p === `trash/${TRASH_FILE.toLowerCase()}` || p === TRASH_FILE.toLowerCase()) return hasOnce('trash-emptied') ? null : TRASH_BODY;
  const pr = p.match(/^projects\/([\w-]+?)(\.md)?$/);
  if (pr) {
    const x = projects.find((y) => y.slug === pr[1]);
    if (!x) return null;
    return [
      `# ${x.name} (${x.year})`,
      x.tagline,
      '',
      `role      ${x.role.title}`,
      `team      ${x.team}`,
      `timeline  ${x.timeline}`,
      `stack     ${x.stack.join(', ')}`,
      '',
      ...x.results.metrics.map((m) => `  ${pad(m.value, 9)}${m.label}`),
      '',
      `→ open ${x.slug}`,
    ];
  }
  const a = p.match(/^archive\/(\d{4})(\.txt)?$/);
  if (a) {
    const t = TIMELINE.find((x) => String(x.year) === a[1]);
    return t ? [`${t.year} — ${t.title}`, t.body] : null;
  }
  const tk = p.match(/^toolkit\/([\w-]+?)(\.spec)?$/);
  if (tk) {
    const x = PRODUCTS.find((y) => y.id === tk[1]);
    return x
      ? [`${x.model}  ${x.name} · ${x.object}`, x.tagline, '', ...x.specs.map((s) => `  ${pad(s.k, 22)}${s.v}`), '', ...x.evidence.map((e) => `  ${pad(e.value, 10)}${e.label}`)]
      : null;
  }
  const l = p.match(/^links\/([\w-]+?)(\.url)?$/);
  if (l) {
    const x = ECOSYSTEM.find((y) => y.id === l[1]);
    return x ? ['[InternetShortcut]', `URL=${x.url.startsWith('/') ? COMPANY.site + x.url : x.url}`, `; ${x.name} — ${x.body}`] : null;
  }
  return null;
}

/* ---------------------------------------------------------------- side effects */
const later = (fn: () => void, ms = 520) => setTimeout(fn, ms);
const walk = (id: StationId, props?: Record<string, unknown>) => later(() => focus(id, props));
const panel = (id: PanelId, props?: Record<string, unknown>) => later(() => useUI.getState().openPanel(id, props));

function downloadCv() {
  track('cv_download', { from: 'terminal' });
  try {
    const a = document.createElement('a');
    a.href = COMPANY.cv;
    a.download = 'Adelia-Tiara-CV.pdf';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {}
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function bar(frac: number, n = 20) {
  const k = Math.round(Math.max(0, Math.min(1, frac)) * n);
  return '█'.repeat(k) + '░'.repeat(n - k);
}

const spark = (vals: number[]) => {
  const ch = '▁▂▃▄▅▆▇█';
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  return vals.map((v) => ch[hi === lo ? 3 : Math.round(((v - lo) / (hi - lo)) * 7)]).join('');
};

/** The logged-in user: it's her computer. */
export const USER = 'adelia';
export const HOST = 'room';

/* ---------------------------------------------------------------- run */
export async function run(line: string, io: IO): Promise<void> {
  const [cmd0, ...args] = line.trim().split(/\s+/);
  const cmd = (cmd0 || '').toLowerCase();
  const arg = args.join(' ').replace(/^["']|["']$/g, '');
  const g = game();
  const P = io.print;

  switch (cmd) {
    case 'help': {
      P('jelly-sh 1.0 · Adelia OS — commands:', 'dim');
      P(COMMANDS.filter((c) => !c.hidden).map((c) => `${c.name}\t${c.help}`), 'kv');
      P('Tip: ↑/↓ for history, Tab to complete, Ctrl+L clears. Some commands are not listed.', 'dim');
      return;
    }
    case 'whoami': {
      const t = tierFor(g.points);
      const stickers = Object.keys(g.achievements).length;
      const d = new Date();
      const zone = visitorZone();
      P(
        [
          `adelia\t${COMPANY.role} · ${COMPANY.degree}, ${COMPANY.cohort.toLowerCase()}`,
          `\t${COMPANY.hq} · ${COMPANY.timeZoneLabel}`,
          `you\ta curious human, probably${g.name ? ` (${g.name})` : ''}`,
          `tier\t${t.name} · ♥ ${g.points}`,
          `stickers\t${stickers}/${ACHIEVEMENTS.length} · ${Object.keys(g.stamps).length} objects found`,
          `local\t${formatTime(zone === 'your time zone' ? undefined : zone, d)} in ${zone} · ${formatTime(TZ, d)} in ${COMPANY.city}`,
          ...(io.root() ? ['groups\troot, evals, wheel'] : []),
        ],
        'kv',
      );
      return;
    }
    case 'ls': {
      const a = args.filter((x) => !x.startsWith('-'));
      const all = args.some((x) => x.startsWith('-') && x.includes('a'));
      const dir = (a[0] || '').replace(/\/$/, '').replace(/^~\/?/, '').toLowerCase();
      if (!dir) {
        P((all ? ['./', '../', '.secret', ...ROOT_FILES] : ROOT_FILES).join('   '));
        return;
      }
      if (DIRS[dir]) {
        if (dir === 'trash' && hasOnce('trash-emptied')) P('(empty)', 'dim');
        else P(DIRS[dir].join('   '));
        if (dir === 'projects') P("Read one: cat projects/tenderlens.md · open the full case: open tenderlens", 'dim');
        return;
      }
      P(`ls: ${a[0]}: No such file or directory`, 'err');
      sfx('error');
      return;
    }
    case 'cat': {
      if (!arg) {
        P('usage: cat <file>   ·   try: cat evals', 'dim');
        return;
      }
      const out = readFile(arg);
      if (!out) {
        if (DIRS[arg.replace(/\/$/, '').toLowerCase()]) P(`cat: ${arg}: Is a directory. Try 'ls ${arg.replace(/\/$/, '')}'.`, 'err');
        else P(`cat: ${arg}: No such file or directory`, 'err');
        sfx('error');
        return;
      }
      P(out);
      return;
    }
    case 'cv':
      return run('open cv', io);
    case 'open': {
      const key = arg.toLowerCase().replace(/^projects\//, '').replace(/\.(md|url|case)$/, '').replace(/\/$/, '');
      if (!key) {
        P(`usage: open <name>   ·   ${['cv', 'mail', 'cases', 'tenderlens', 'archive', 'links', 'wall', 'printer'].join(' · ')}`, 'dim');
        return;
      }
      const work = WORK.find((w) => w.id === key || w.client.toLowerCase() === key);
      if (work) {
        P(`Opening the ${work.client} case on the Wall of Work…`, 'ok');
        track('cta', { from: 'terminal', to: 'gallery', work: work.id });
        walk('gallery', { work: work.id });
        return;
      }
      const link = ECOSYSTEM.find((e) => e.id === key && /^https?:/.test(e.url));
      if (link) {
        P(`Opening ${link.name}…`, 'ok');
        P(`${link.url}\t${link.url}`, 'link');
        track('ecosystem_visit', { id: link.id, url: link.url, from: 'terminal' });
        window.open(link.url, '_blank', 'noopener,noreferrer');
        return;
      }
      const target = APP_ALIASES[key];
      if (!target) {
        P(`open: nothing called “${arg}”. Try 'ls projects' or 'ls links'.`, 'err');
        sfx('error');
        return;
      }
      switch (target) {
        case 'cv':
          P('Downloading Adelia-Tiara-CV.pdf…', 'ok');
          P(`${COMPANY.site}${COMPANY.cv}\t${COMPANY.cv}`, 'link');
          downloadCv();
          return;
        case 'wall':
          P('Walking over to the Wall of Work…', 'ok');
          walk('gallery');
          return;
        case 'printer':
          return run('book', io);
        case 'moci':
          P('Waking Moci…', 'ok');
          panel('moci');
          return;
        case 'paper':
          P('Picking up her paper…', 'ok');
          walk('news');
          return;
        case 'shelf':
          P('Walking over to the toolkit shelf…', 'ok');
          walk('shelf');
          return;
        case 'quiz':
          return run('fit', io);
        default:
          P(`Opening ${target === 'about' ? 'her model card' : target}…`, 'ok');
          setTimeout(() => os().open(target), 180);
      }
      return;
    }
    case 'hire':
    case 'hire-me':
    case 'hireme': {
      track('cta', { from: 'terminal', to: 'hire-me' });
      const shipped = EDGE.find((e) => e.id === 'shipped')?.body ?? '';
      P('HIRE-ME · the short version', 'acc');
      P(
        [
          `role\t${COMPANY.role}, new grad or junior, full-time`,
          `degree\t${COMPANY.degree}, AI and HCI track, 2026`,
          `where\t${firstSentence(practicalOf('Where'))}`,
          `start\t${firstSentence(practicalOf('Start'))}`,
          `shipped\t${shipped}`,
          `evals\t2,100+ cases labelled by hand; a CI gate that has already blocked a release`,
        ],
        'kv',
      );
      P('next', 'dim');
      P(
        [
          'book\tbook a 30-minute intro call at the ticket printer',
          'open mail\twrite to her from this computer',
          'open cv\tdownload the one-page CV',
          `email\tcopy her address: ${COMPANY.email}`,
        ],
        'kv',
      );
      return;
    }
    case 'book':
    case 'rsvp':
      P('Walking over to the ticket printer… intro call, interview or coffee.', 'ok');
      track('cta', { from: 'terminal', to: 'printer' });
      walk('printer');
      return;
    case 'email': {
      const ok = await copyText(COMPANY.email);
      track('email', { from: 'terminal' });
      P(ok ? `${COMPANY.email} (copied to your clipboard)` : COMPANY.email, 'ok');
      P(`mailto:${COMPANY.email}\tmailto:${COMPANY.email}`, 'link');
      return;
    }
    case 'ask':
    case 'moci': {
      if (cmd === 'ask' && !arg) {
        P('usage: ask <question>   ·   ask is she available?', 'dim');
        return;
      }
      P(arg ? `Asking Moci: “${arg}”… (it cites its sources, and says when it can’t tell)` : 'Waking Moci…', 'ok');
      panel('moci', arg ? { ask: arg, nonce: Date.now() } : {});
      return;
    }
    case 'now':
      P(readFile('now.txt')!);
      return;
    case 'skills':
      P(skills.flatMap((s) => [s.name.toUpperCase(), `  ${s.items.join(' · ')}`]));
      return;
    case 'date': {
      const d = new Date();
      const zone = visitorZone();
      P(`${formatDate(TZ, d)} · ${formatTime(TZ, d, true)} WIB (UTC+7) · ${COMPANY.city}`);
      if (zone !== TZ && zone !== 'your time zone') P(`your time: ${formatTime(zone, d)} (${zone})`, 'dim');
      P(`Her usual hours: ${String(COMPANY.workingHours.start).padStart(2, '0')}:00–${COMPANY.workingHours.end}:00 WIB.`, 'dim');
      return;
    }
    case 'weather': {
      const ws = useWeather.getState();
      if (!ws.home.live || Date.now() - ws.home.updatedAt > 15 * 60 * 1000) {
        P(`Reading the sky over ${COMPANY.city}…`, 'dim');
        await Promise.race([ws.refresh(), io.wait(3500)]);
      }
      const w = useWeather.getState().home;
      P([
        `${COMPANY.city.toUpperCase()}   ${Math.round(w.temp)}°C · ${w.label}${w.isDay ? '' : ' · night'}`,
        `feels ${Math.round(w.feels)}°C · humidity ${Math.round(w.humidity)}% · wind ${Math.round(w.wind)} km/h`,
        ...(w.hourly.length >= 6 ? [`next 12h  ${spark(w.hourly.map((h) => h.temp))}  ${Math.round(Math.min(...w.hourly.map((h) => h.temp)))}–${Math.round(Math.max(...w.hourly.map((h) => h.temp)))}°C`] : []),
      ]);
      P(w.live ? 'live · open-meteo.com' : 'offline estimate (the window has the live view)', 'dim');
      return;
    }
    case 'hearts':
    case 'points': {
      const t = tierFor(g.points);
      const n = nextTier(g.points);
      const frac = n ? (g.points - t.min) / (n.min - t.min) : 1;
      P([`HEARTS   ♥ ${String(g.points).padStart(4, '0')}`, `TIER     ${t.name}${n ? `  →  ${n.name} at ♥ ${n.min}` : '  (top tier)'}`, `[${bar(frac)}] ${Math.round(frac * 100)}%`]);
      if (g.ledger.length) {
        P('recent:', 'dim');
        P(g.ledger.slice(0, 5).map((l) => `  ${pad(`+${l.pts}`, 6)}${l.label}`));
      }
      return;
    }
    case 'stickers':
    case 'achievements': {
      const got = ACHIEVEMENTS.filter((a) => g.achievements[a.id]).length;
      P(`${got}/${ACHIEVEMENTS.length} stickers collected`, 'acc');
      P(
        ACHIEVEMENTS.map((a) => {
          const on = !!g.achievements[a.id];
          if (!on && a.secret) return `[ ] ${pad('???', 16)}secret`;
          return `${on ? '[♥]' : '[ ]'} ${pad(a.name, 16)}${on ? a.body : a.hint}`;
        }),
      );
      return;
    }
    case 'fit':
    case 'quiz':
      P('Pouring a coffee… opening the 60-second fit check at the pink mug.', 'ok');
      walk('quiz');
      return;
    case 'play':
      P('Insert coin… picking up the cloud handheld.', 'ok');
      walk('console');
      return;
    case 'music': {
      if (!audio.ready) {
        P('The speakers are asleep. Click anywhere in the room to wake them.', 'err');
        return;
      }
      music.toggle();
      const t = TRACKS.find((x) => x.id === music.current);
      P(music.playing ? `▶ Now playing: ${t?.title ?? 'Soft Focus'} — ${t?.artist ?? 'Adelia’s Room'}` : '■ Music paused.', 'ok');
      return;
    }
    case 'neofetch': {
      const info = [
        `${io.root() ? 'root' : USER}@${HOST}`,
        '──────────────',
        `OS        Adelia OS 26.10 (${COMPANY.city})`,
        'Host      AT-26 personal workstation',
        `Role      ${COMPANY.role}`,
        `Uptime    since ${COMPANY.founded} (Informatics, day one)`,
        'Shell     jelly-sh 1.0',
        `Projects  ${WORK.map((w) => w.client).join(', ')}`,
        'Evals     2,100+ cases, labelled by hand',
        'Theme     clear acrylic · ♥ #FF7EB6 · #5AA9E6',
        `API       ${apiMode() === 'remote' ? 'online' : 'local demo mode'}`,
      ];
      P(
        info.map((r, i) => `${MOCI[i] ?? ' '.repeat(MOCI[0].length)}\t${r}`),
        'pre',
      );
      return;
    }
    case 'adelia':
      P(LOGO, 'pre');
      P(['', `${COMPANY.role} · ${COMPANY.hq}`, COMPANY.tagline]);
      return;
    case 'rules':
    case 'manifesto':
      P(readFile('house-rules.txt')!);
      return;
    case 'history':
      P(io.history().map((h, i) => `${String(i + 1).padStart(4, ' ')}  ${h}`));
      return;
    case 'echo':
      P(arg || '');
      return;
    case 'clear':
      io.clear();
      return;
    case 'cd':
      P(arg ? "There's only one room, and you're already in it. Try 'ls projects'." : '~', arg ? 'out' : 'dim');
      return;
    case 'pwd':
      P('/home/adelia/room');
      return;
    case 'rm':
      P('rm: Moci is jelly, not reckless. Nothing was deleted.', 'err');
      return;
    case 'coffee':
      P("The pink mug on the desk hides a 60-second fit check. Type 'fit'.");
      return;
    case 'ping':
      P([`PING ${arg || COMPANY.domain}: 56 data bytes`, `64 bytes from ${COMPANY.city.toLowerCase()}: icmp_seq=0 time=24 ms`, `64 bytes from ${COMPANY.city.toLowerCase()}: icmp_seq=1 time=26 ms`, `--- ${COMPANY.replyTime.toLowerCase()} ---`]);
      return;
    case 'man':
      P(arg ? `No manual entry for ${arg}. She learned it by shipping it.` : "What manual page do you want? Try 'help'.");
      return;
    case 'vim':
    case 'vi':
    case 'nano':
    case 'emacs':
      P(`${cmd}: this computer only has one editor, and it's the guestbook in the aquarium.`, 'dim');
      return;
    case 'konami':
    case 'uuddlrlrba': {
      P('↑ ↑ ↓ ↓ ← → ← → B A. Close enough.', 'acc');
      if (once('konami')) {
        g.addPoints(10, 'Typed the Konami code');
        P('+10 ♥', 'ok');
      }
      return;
    }
    case 'please': {
      if (io.root()) {
        P("You're already root. Manners noted, though.", 'dim');
        return;
      }
      P('Since you asked nicely…', 'dim');
      await io.wait(600);
      grant(io, arg);
      return;
    }
    case 'sudo': {
      if (!arg) {
        P("usage: sudo <command>   ·   go on, ask for something (try 'sudo hire adelia')", 'dim');
        return;
      }
      if (/^hire(-me|\s+adelia)?$/i.test(arg)) {
        P(`[sudo] password for ${io.root() ? 'root' : USER}: ********`, 'dim');
        await io.wait(700);
        P('Permission granted. Excellent decision.', 'ok');
        const ok = await copyText(COMPANY.email);
        track('email', { from: 'terminal-sudo' });
        P(ok ? `Her email is on your clipboard: ${COMPANY.email}` : `Her email: ${COMPANY.email}`, 'acc');
        P("Or type 'book' for a 30-minute intro call.", 'dim');
        if (!io.root()) grant(io, arg, true);
        return;
      }
      if (io.root()) {
        P("You're already root. It suits you.", 'ok');
        if (arg.split(/\s+/)[0] !== 'sudo') await run(arg, io);
        return;
      }
      P(`[sudo] password for ${USER}: ********`, 'dim');
      await io.wait(850);
      P(`${USER} is not in the sudoers file. This incident will be reported… to Moci.`, 'err');
      sfx('error');
      await io.wait(1300);
      P('…', 'dim');
      await io.wait(900);
      P('Moci read the report. It liked your curiosity.', 'acc');
      await io.wait(900);
      grant(io, arg);
      return;
    }
    case 'hack': {
      P('Initiating extremely legitimate hack…', 'acc');
      if (io.calm()) await io.wait(600);
      else await io.matrix(3200);
      P(['ACCESS GRANTED', '…to absolutely nothing. Everything here is already public: show the receipts.', "Want the real thing? Type 'hire-me'."], 'ok');
      return;
    }
    case 'exit':
    case 'logout':
      P('logout', 'dim');
      setTimeout(io.exit, 280);
      return;
    case '':
      return;
    default:
      P(`jelly-sh: command not found: ${cmd0}. Type 'help'.`, 'err');
      sfx('error');
  }
}

function grant(io: IO, arg: string, quiet = false) {
  io.setRoot(true);
  if (!quiet) io.print('Root access granted, politely. ✓', 'ok');
  if (/sandwich/i.test(arg)) io.print('Okay. One sandwich. Moci will make it.', 'acc');
  sfx('success');
  game().unlock('hacker');
}

/* ---------------------------------------------------------------- completion */
export function complete(input: string): { value: string; options: string[] } {
  const hasSpace = /\s/.test(input);
  if (!hasSpace) {
    const opts = COMMANDS.filter((c) => c.name.startsWith(input.toLowerCase())).map((c) => c.name);
    return finish(input, '', opts);
  }
  const [cmd, ...rest] = input.split(/\s+/);
  const partial = rest[rest.length - 1] ?? '';
  const head = input.slice(0, input.length - partial.length);
  let pool: string[] = [];
  const c = cmd.toLowerCase();
  if (c === 'cat') pool = [...allPaths(), 'evals'];
  else if (c === 'ls') pool = Object.keys(DIRS).map((d) => d + '/');
  else if (c === 'open') pool = OPENABLE;
  else if (c === 'sudo' || c === 'please') pool = COMMANDS.map((x) => x.name);
  const opts = [...new Set(pool.filter((p) => p.toLowerCase().startsWith(partial.toLowerCase())))];
  return finish(partial, head, opts);
}

function finish(partial: string, head: string, opts: string[]) {
  if (!opts.length) return { value: head + partial, options: [] };
  if (opts.length === 1) {
    const o = opts[0];
    return { value: head + o + (o.endsWith('/') ? '' : ' '), options: [] };
  }
  // longest common prefix
  let pre = opts[0];
  for (const o of opts) while (!o.toLowerCase().startsWith(pre.toLowerCase())) pre = pre.slice(0, -1);
  return { value: head + (pre.length > partial.length ? pre : partial), options: opts };
}
