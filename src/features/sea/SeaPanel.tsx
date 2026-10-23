/* ==========================================================================
   RM-21 · The Aquarium — the guestbook (ported from the legacy adelia.cc
   /guestbook "sea"). A close-up that rises out of the cube aquarium lamp on
   the nightstand: open water full of visitors' clear jelly creatures, each
   carrying a note (tap one to read it), and a release form (name, a note of
   up to 280 characters, pick and shape your creature) → it drops in from the
   surface. "The guestbook remembers your creature": yours keeps a tag, and it
   swims in the room's tank too (TankLive).
   ========================================================================== */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { sfx } from '@/audio/engine';
import { game } from '@/state/game';
import { ACHIEVEMENT_MAP, type AchievementId } from '@/state/achievements';
import { GUESTBOOK_LIMITS, guestbookProblem, track } from '@/lib/api';
import { focus } from '@/stage/director';
import { once } from '@/features/computer/util';
import { COLOR_LABEL, NOTE_COLORS, SPECIES, SPECIES_LABEL, type NoteColor, type Species } from '@/content/guestbook';
import { STATIONS } from '@/stage/stations';
import { Creature, EXPRESSIONS, JELLY, SPECIES_SCALE, type Expression } from './Creature';
import { FACE_LABEL, SIZES, SIZE_LABEL, SIZE_SCALE, ago, describe, rand, useSea, type SeaNote, type Size } from './sea';
import './sea.css';

/** How many creatures swim in the close-up at once (the newest); the list has them all. */
const IN_THE_WATER = 28;
const POLL_MS = 45_000;
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Award once per profile (+ a sticker, if the sticker book has one with this id). */
function reward(name: string, points: number, label: string) {
  if (once(`sea-${name}`)) game().addPoints(points, label);
}
function unlockIfExists(id: string) {
  if ((ACHIEVEMENT_MAP as Record<string, unknown>)[id]) game().unlock(id as AchievementId);
}

/* ---------------------------------------------------------------- motion */
/** Where and how a creature swims, picked from its id so it swims the same way on every visit. */
function motion(n: SeaNote, i: number): CSSProperties {
  const r = (k: number) => rand(n.seed, k);
  const slow = n.species === 'whale' || n.species === 'turtle' ? 1.4 : n.species === 'crab' ? 1.6 : 1;
  const lane = n.species === 'crab' ? 72 + r(3) * 6 : n.species === 'jellyfish' ? 4 + r(3) * 44 : 6 + r(3) * 56;
  const dur = (26 + r(7) * 24) * slow;
  return {
    ['--lane' as string]: `${lane.toFixed(1)}%`,
    ['--dur' as string]: `${dur.toFixed(1)}s`,
    ['--delay' as string]: `${(-r(11) * dur).toFixed(1)}s`,
    ['--bob' as string]: `${(2.4 + r(15) * 1.8).toFixed(2)}s`,
    ['--size' as string]: `${Math.round((64 + r(19) * 22) * SPECIES_SCALE[n.species] * SIZE_SCALE[n.size])}px`,
    // where it rests when nothing moves (reduced motion): spread by its place in the tank, not its id
    ['--rx' as string]: ((i * 0.618034 + r(23) * 0.2) % 1).toFixed(3),
  };
}

function SeaCreature({ n, i, open, fresh, mine, onOpen }: { n: SeaNote; i: number; open: boolean; fresh: boolean; mine: boolean; onOpen: (n: SeaNote, el: HTMLButtonElement) => void }) {
  const dir = n.species === 'crab' ? (n.seed & 2 ? 'left' : 'right') : n.seed & 1 ? 'left' : 'right';
  return (
    <button
      type="button"
      className="sea-creature"
      data-species={n.species}
      data-dir={dir}
      data-open={open || undefined}
      data-fresh={fresh || undefined}
      data-mine={mine || undefined}
      data-note={n.id}
      style={motion(n, i)}
      aria-label={`${mine ? 'Your' : `${n.name}’s`} ${describe(n).toLowerCase()}: read the note`}
      aria-expanded={open}
      onClick={(e) => onOpen(n, e.currentTarget)}
    >
      <span className="sea-creature__bob">
        <span className="sea-creature__body">
          <Creature species={n.species} color={n.color} seed={n.seed} face={n.face} />
        </span>
        <span className="sea-creature__name" aria-hidden="true">
          {mine ? `You · ${fresh ? 'just now' : n.name}` : n.name}
        </span>
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- the seabed (ported reef) */
/** A soft coral branch: a round base of `r1` and a round tip of `r2`, joined along their tangents. */
function twig([x1, y1, r1, x2, y2, r2]: number[]): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = Math.acos((r1 - r2) / Math.hypot(x2 - x1, y2 - y1));
  const at = (x: number, y: number, r: number, t: number) => `${(x + r * Math.cos(t)).toFixed(1)} ${(y + r * Math.sin(t)).toFixed(1)}`;
  const fat = p > Math.PI / 2 ? 1 : 0;
  return `M${at(x1, y1, r1, a + p)}L${at(x2, y2, r2, a + p)}A${r2} ${r2} 0 ${fat} 0 ${at(x2, y2, r2, a - p)}L${at(x1, y1, r1, a - p)}A${r1} ${r1} 0 ${1 - fat} 0 ${at(x1, y1, r1, a + p)}Z`;
}
const BRANCH_CORAL = [
  [58, 114, 12, 55, 92, 10],
  [55, 94, 10, 41, 75, 8.5],
  [41, 77, 8.5, 34, 54, 7],
  [34, 56, 7, 38, 31, 6],
  [39, 73, 7, 22, 63, 6],
  [22, 65, 6, 15, 45, 5.5],
  [56, 94, 9.5, 74, 79, 8],
  [74, 81, 8, 87, 59, 7],
  [87, 61, 7, 91, 36, 6],
  [86, 64, 6, 104, 52, 5.5],
  [58, 90, 8, 62, 68, 7],
  [62, 70, 7, 59, 48, 6],
].map(twig);
const TUBE_CORAL = [
  [42, 114, 12, 38, 62, 10],
  [62, 114, 13, 66, 36, 11],
  [84, 114, 11, 90, 70, 9],
].map(twig);
const BRANCH_TIPS: [number, number][] = [
  [38, 29],
  [15, 43],
  [91, 34],
  [59, 46],
  [104, 50],
];

function Coral({ fill, branches, tips, children }: { fill: string; branches: string[]; tips: [number, number][]; children?: ReactNode }) {
  return (
    <>
      <g opacity=".8">
        <g fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round">
          {branches.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g fill={`url(#${fill})`}>
          {branches.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {children}
      </g>
      {tips.map(([x, y]) => (
        <g key={`${x} ${y}`} fill="#FFFFFF">
          <ellipse cx={x} cy={y + 1} rx="4" ry="2.2" opacity=".55" />
          <circle cx={x + 2.4} cy={y - 0.6} r="1.4" />
        </g>
      ))}
    </>
  );
}

function Kelp() {
  return (
    <g fill="url(#sea-kelp)" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="1" opacity=".6">
      <path className="sea-kelp__blade" d="M14 160c-6-26 8-42 2-66s-10-46 4-74c3-4 8-3 8 2-1 24 2 46 6 70s0 42-8 68Z" />
      <path className="sea-kelp__blade" d="M30 160c-4-20 10-30 6-50s-8-34 4-52c3-3 7-2 7 2 0 20 2 34 4 50s-6 32-13 50Z" />
      <path className="sea-kelp__blade" d="M42 160c-2-14 8-22 6-36s-4-22 4-32c3-2 6-1 6 2-1 12 0 22-1 32s-5 22-9 34Z" />
    </g>
  );
}

function Pearl({ x, r }: { x: number; r: number }) {
  return (
    <>
      <circle cx={x} cy={19 - r} r={r} fill="url(#sea-pearl)" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx={x - r * 0.3} cy={19 - r * 1.45} r={r * 0.22} fill="#FFFFFF" />
    </>
  );
}

/** The tank floor: pale sand, a reef in the creatures' own jelly hand (pink and baby-blue coral, sea-glass kelp, pearls). */
function Seabed() {
  return (
    <div className="sea-bed" aria-hidden="true">
      <svg width="0" height="0" className="sea-defs">
        <defs>
          <linearGradient id="sea-coral-pink" x1="0" y1="20" x2="0" y2="118" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE3EF" />
            <stop offset="1" stopColor="#FF7EB6" />
          </linearGradient>
          <linearGradient id="sea-coral-blue" x1="0" y1="20" x2="0" y2="118" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#EEF7FE" />
            <stop offset="1" stopColor="#7DBCEB" />
          </linearGradient>
          <linearGradient id="sea-kelp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#B8F0E4" />
            <stop offset="1" stopColor="#3CC9A8" />
          </linearGradient>
          <radialGradient id="sea-pearl" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset=".6" stopColor="#EEF3FF" />
            <stop offset="1" stopColor="#BFD0F2" />
          </radialGradient>
        </defs>
      </svg>
      <div className="sea-bed__sand" />
      <svg viewBox="0 0 120 120" className="sea-reef" style={{ left: '3%', ['--w' as string]: '84px' }}>
        <Coral fill="sea-coral-pink" branches={BRANCH_CORAL} tips={BRANCH_TIPS} />
      </svg>
      <svg viewBox="0 0 60 160" className="sea-reef sea-kelp" style={{ left: '19%', ['--w' as string]: '40px' }}>
        <Kelp />
      </svg>
      <svg viewBox="0 0 40 20" className="sea-reef sea-reef--wide" style={{ left: '30%', ['--w' as string]: '32px' }}>
        <Pearl x={12} r={7} />
        <Pearl x={27} r={5} />
      </svg>
      <svg viewBox="0 0 120 120" className="sea-reef" style={{ left: '44%', ['--w' as string]: '76px' }}>
        <Coral fill="sea-coral-blue" branches={TUBE_CORAL} tips={[[38, 54], [66, 27], [90, 62]]}>
          <g fill="#5AA9E6" opacity=".35">
            <ellipse cx="38" cy="58" rx="6" ry="2.6" />
            <ellipse cx="66" cy="32" rx="6.6" ry="2.8" />
            <ellipse cx="90" cy="66" rx="5.2" ry="2.4" />
          </g>
        </Coral>
      </svg>
      <svg viewBox="0 0 60 160" className="sea-reef sea-kelp" style={{ left: '66%', ['--w' as string]: '36px' }}>
        <Kelp />
      </svg>
      <svg viewBox="0 0 120 120" className="sea-reef sea-reef--wide" style={{ left: '80%', ['--w' as string]: '60px' }}>
        <Coral fill="sea-coral-pink" branches={BRANCH_CORAL} tips={BRANCH_TIPS} />
      </svg>
    </div>
  );
}

/** A column of bubbles from the lamp's air stone (decorative). */
function Bubbles() {
  return (
    <div className="sea-bubbles" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <i key={i} style={{ ['--i' as string]: i }} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- a note, read */
function NoteCard({ n, mine, pos, onClose }: { n: SeaNote; mine: boolean; pos: { x: number; y: number; below: boolean }; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [n.id]);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby="sea-note-title"
      tabIndex={-1}
      className="sea-note"
      data-below={pos.below || undefined}
      style={{ left: pos.x, top: pos.y }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          // close the note, not the whole aquarium
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="sea-note__head">
        <Creature species={n.species} color={n.color} seed={n.seed} face={n.face} className="sea-note__creature" />
        <div className="sea-note__who">
          <p id="sea-note-title" className="sea-note__name">
            <span>{n.name}</span>
            {mine && <span className="chip chip--pink">Yours</span>}
            {n.house && <span className="chip">Example</span>}
          </p>
          <p className="t-label">
            {describe(n)} · {ago(n.createdAt)}
          </p>
        </div>
        <button type="button" className="btn btn--icon btn--sm btn--ghost" aria-label="Close the note" onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <p className="sea-note__text">{n.note}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- the release form */
function ReleaseForm({ onReleased }: { onReleased: (n: SeaNote) => void }) {
  const release = useSea((s) => s.release);
  const [species, setSpecies] = useState<Species>('jellyfish');
  const [color, setColor] = useState<NoteColor>('magenta');
  const [face, setFace] = useState<Expression>('smile');
  const [size, setSize] = useState<Size>('medium');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const { name: NAME_MAX, note: NOTE_MAX } = GUESTBOOK_LIMITS;
  const left = NOTE_MAX - note.length;

  const pick = <T,>(set: (v: T) => void, v: T) => {
    sfx('tick');
    set(v);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const website = String(new FormData(e.currentTarget).get('website') ?? '');
    const problem = guestbookProblem({ name, note, creature: { shape: species, colour: color } });
    if (problem) {
      setError(problem);
      sfx('error');
      noteRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const n = await release({ name, note, species, color, face, size, sessionId: game().sessionId, website });
      setLeaving(true);
      window.setTimeout(() => setLeaving(false), calm() ? 0 : 1100);
      setNote('');
      onReleased(n);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Couldn’t reach the aquarium. Check your connection and try again.');
      sfx('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="sea-form" onSubmit={submit} aria-labelledby="sea-form-title" noValidate>
      <div className="sea-form__head">
        <span className="t-label">Sign the guestbook</span>
        <h3 id="sea-form-title">Release a creature</h3>
        <p>Pick one, shape it, and give it a line for Adelia and whoever visits next.</p>
      </div>

      <div className="sea-preview" data-leaving={leaving || undefined} aria-hidden="true">
        <span className="sea-preview__creature" style={{ ['--s' as string]: SIZE_SCALE[size] }}>
          <Creature species={species} color={color} seed={0} face={face} />
        </span>
        <p className="sea-preview__bubble">{note.trim() || 'Say hello…'}</p>
        <span className="sea-preview__spec t-mono">
          {SPECIES_LABEL[species]} · {COLOR_LABEL[color]} · {SIZE_LABEL[size]}
        </span>
      </div>

      <fieldset className="sea-field">
        <legend className="t-label">Creature</legend>
        <div className="sea-pick sea-pick--species">
          {SPECIES.map((s) => (
            <label key={s} className="sea-option" title={SPECIES_LABEL[s]}>
              <input type="radio" name="species" value={s} checked={species === s} onChange={() => pick(setSpecies, s)} />
              <Creature species={s} color={color} seed={0} face={face} className="sea-option__art" />
              <span className="sr-only">{SPECIES_LABEL[s]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="sea-field">
        <legend className="t-label">Colour</legend>
        <div className="sea-pick sea-pick--color">
          {NOTE_COLORS.map((c) => (
            <label key={c} className="sea-swatch" title={COLOR_LABEL[c]} style={{ ['--core' as string]: JELLY[c].core, ['--mid' as string]: JELLY[c].mid }}>
              <input type="radio" name="color" value={c} checked={color === c} onChange={() => pick(setColor, c)} />
              <span aria-hidden="true" />
              <span className="sr-only">{COLOR_LABEL[c]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sea-shape">
        <fieldset className="sea-field">
          <legend className="t-label">Face</legend>
          <div className="sea-seg">
            {EXPRESSIONS.map((f) => (
              <label key={f}>
                <input type="radio" name="face" value={f} checked={face === f} onChange={() => pick(setFace, f)} />
                <span>{FACE_LABEL[f]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="sea-field">
          <legend className="t-label">Size</legend>
          <div className="sea-seg">
            {SIZES.map((z) => (
              <label key={z}>
                <input type="radio" name="size" value={z} checked={size === z} onChange={() => pick(setSize, z)} aria-label={SIZE_LABEL[z]} />
                <span aria-hidden="true">{SIZE_LABEL[z].slice(0, 1)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="field">
        <span>Your name (optional)</span>
        <input value={name} maxLength={NAME_MAX} autoComplete="nickname" onChange={(e) => setName(e.target.value)} placeholder="Anonymous visitor" />
      </label>

      <label className="field sea-note-field">
        <span>The note</span>
        <textarea
          ref={noteRef}
          value={note}
          maxLength={NOTE_MAX}
          rows={3}
          onChange={(e) => {
            setNote(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Hi from Jakarta! Loved the Tenderlens case."
          aria-describedby="sea-count sea-error sea-fine"
          aria-invalid={error ? true : undefined}
          required
        />
      </label>
      <p id="sea-count" className={`sea-count t-mono ${left < 20 ? 'is-low' : ''}`}>
        {note.length}/{NOTE_MAX}
      </p>
      {/* Real people never see or fill this. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sea-hp" aria-hidden="true" />

      <p id="sea-error" className="sea-error" role="alert">
        {error}
      </p>
      <button type="submit" className="btn btn--primary btn--block" aria-disabled={busy || undefined}>
        {busy ? 'Releasing…' : 'Release into the tank'}
      </button>
      <p id="sea-fine" className="sea-fine">
        Everyone who visits can read it. Notes can’t carry links or email addresses; to reach Adelia,{' '}
        <button
          type="button"
          className="link sea-fine__link"
          onClick={() => {
            track('guestbook', { action: 'book' });
            focus('printer');
          }}
        >
          book a chat
        </button>
        .
      </p>
    </form>
  );
}

/* ---------------------------------------------------------------- the panel */
export default function SeaPanel() {
  const st = STATIONS.sea;
  const notes = useSea((s) => s.notes);
  const mine = useSea((s) => s.mine);
  const fresh = useSea((s) => s.fresh);
  const load = useSea((s) => s.load);
  const [open, setOpen] = useState<{ n: SeaNote; x: number; y: number; below: boolean } | null>(null);
  const [list, setList] = useState(false);
  const [status, setStatus] = useState('');
  const waterRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  // load now, then look again every so often while the panel is open and the tab is visible
  useEffect(() => {
    track('guestbook', { action: 'open' });
    void load();
    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  // the drop-in flag only lasts for the swim down
  useEffect(() => {
    if (!fresh) return;
    const t = window.setTimeout(() => useSea.setState({ fresh: null }), 6000);
    return () => window.clearTimeout(t);
  }, [fresh]);

  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus({ preventScroll: true });
  }, []);

  // a press anywhere else in the tank closes the note
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('.sea-note, .sea-creature')) return;
      setOpen(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onOpen = (n: SeaNote, el: HTMLButtonElement) => {
    const water = waterRef.current;
    if (!water) return;
    if (open?.n.id === n.id) return close();
    opener.current = el;
    sfx('pop');
    // in the water's own pixels, so a panel still scaling into place doesn't throw the note off
    const s = water.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = s.width / (water.offsetWidth || s.width) || 1;
    const W = water.offsetWidth;
    const H = water.offsetHeight;
    const top = (r.top - s.top) / k;
    const bottom = (r.bottom - s.top) / k;
    const mid = (r.left - s.left + r.width / 2) / k;
    const width = Math.min(300, W - 24);
    const x = Math.min(Math.max(mid - width / 2, 12), W - width - 12);
    const below = top < 190;
    const y = below ? Math.min(bottom + 8, H - 150) : top - 8;
    setOpen({ n, x, y, below });
    track('guestbook', { action: 'read', house: n.house });
    reward('read', 15, 'Read a note in the aquarium');
  };

  const swimming = useMemo(() => {
    const all = notes ?? [];
    const top = all.slice(0, IN_THE_WATER);
    // your newest creature always swims, even when the tank is busy
    const yours = all.find((n) => mine.includes(n.id));
    return yours && !top.includes(yours) ? [...top.slice(0, IN_THE_WATER - 1), yours] : top;
  }, [notes, mine]);
  const visitors = (notes ?? []).filter((n) => !n.house).length;
  const newest = (notes ?? []).find((n) => !n.house);

  const onReleased = (n: SeaNote) => {
    setOpen(null);
    sfx('success');
    track('guestbook', { action: 'release', species: n.species, colour: n.color, face: n.face, size: n.size });
    reward('release', 60, 'Released a creature into the aquarium');
    unlockIfExists('signed');
    setStatus(`Released. Your ${describe(n).toLowerCase()} is swimming in the tank, and the guestbook remembers it.`);
    waterRef.current?.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'nearest' });
    // once it's in the water, move focus to it so its note is one key away
    window.setTimeout(() => waterRef.current?.querySelector<HTMLButtonElement>(`[data-note="${n.id}"]`)?.focus({ preventScroll: true }), calm() ? 50 : 1500);
  };

  const findMine = () => {
    const el = waterRef.current?.querySelector<HTMLButtonElement>('[data-mine]');
    const n = el && swimming.find((x) => x.id === el.dataset.note);
    if (!el || !n) return;
    el.focus({ preventScroll: true });
    onOpen(n, el);
  };

  const readout =
    notes === null
      ? 'LOOKING INTO THE WATER'
      : !visitors
        ? 'NO VISITORS YET · BE THE FIRST'
        : `${String(visitors).padStart(3, '0')} ${visitors === 1 ? 'VISITOR' : 'VISITORS'}${newest ? ` · NEWEST ${ago(newest.createdAt).toUpperCase()}` : ''}`;

  return (
    <Stage code={st.code} kicker="Guestbook" title="The Aquarium" className="sea-stage" bleed>
      <div className="sea">
        <section className="sea-main" aria-labelledby="sea-water-title">
          <h3 id="sea-water-title" className="sr-only">
            The tank: visitors’ creatures and their notes
          </h3>
          <div className="sea-tank">
            <div className="sea-tank__cap" aria-hidden="true">
              <i className="led led--blue" />
              <span className="t-label">Aquarium lamp</span>
              <span className="t-label sea-tank__spec">Guestbook · notes ≤ {GUESTBOOK_LIMITS.note}</span>
            </div>
            <div ref={waterRef} className="sea-water">
              <span className="sea-water__light" aria-hidden="true" />
              <span className="sea-water__grid" aria-hidden="true" />
              <Seabed />
              <Bubbles />
              {notes === null && <p className="sea-status">Looking into the water…</p>}
              {swimming.map((n, i) => (
                <SeaCreature key={n.id} n={n} i={i} open={open?.n.id === n.id} fresh={n.id === fresh} mine={mine.includes(n.id)} onOpen={onOpen} />
              ))}
              {open && <NoteCard n={open.n} mine={mine.includes(open.n.id)} pos={open} onClose={close} />}
            </div>
            <div className="sea-tank__base">
              <span className="sea-lcd lcd t-dot" aria-hidden="true">
                <i className={`led ${notes === null ? 'led--off' : 'led--green'}`} />
                <span>{readout}</span>
              </span>
            </div>
          </div>

          <div className="sea-more">
            <button type="button" className="btn btn--sm" aria-expanded={list} aria-controls="sea-list" onClick={() => setList((v) => !v)}>
              <Icon name="notebook" size={15} /> {list ? 'Hide the list' : `Read them all as a list (${notes?.length ?? 0})`}
            </button>
            {swimming.some((n) => mine.includes(n.id)) && (
              <button type="button" className="btn btn--sm btn--ghost" onClick={findMine}>
                <Icon name="eye" size={15} /> Find my creature
              </button>
            )}
            <p className="sea-hint">Tap a creature to read what it carries.</p>
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {status}
          </p>
          {status && (
            <p className="sea-released" aria-hidden="true">
              <i className="led" /> {status}
            </p>
          )}

          {list && (
            <ul id="sea-list" className="sea-list">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="sea-list__item">
                  <Creature species={n.species} color={n.color} seed={n.seed} face={n.face} className="sea-list__creature" />
                  <div>
                    <p className="sea-list__text">{n.note}</p>
                    <p className="t-label">
                      <b>{n.name}</b>
                      {mine.includes(n.id) ? ' (you)' : n.house ? ' (example)' : ''} · {describe(n)} · {ago(n.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="sea-side" aria-label="Release a creature">
          <ReleaseForm onReleased={onReleased} />
        </aside>
      </div>
    </Stage>
  );
}
