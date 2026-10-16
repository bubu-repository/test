"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { COLOR_LABEL, NAME_MAX, NOTE_COLORS, NOTE_MAX, SPECIES, SPECIES_LABEL, type Note, type NoteColor, type Species } from "@/content/guestbook";
import { sfx } from "@/lib/sound";
import { readJSON, writeJSON } from "@/lib/storage";
import { unlock } from "@/lib/stickers";
import { toast } from "@/lib/ui";
import { useLive } from "../live/live-store";
import { Creature, JELLY, SPECIES_SCALE } from "./Creature";

/** How many creatures swim at once (the newest); the list shows them all. */
const IN_THE_SEA = 40;
const MINE_KEY = "adelia:my-notes";
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function ago(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Where and how a creature swims, picked from its id so it swims the same way on every visit. */
function motion(note: Note): CSSProperties {
  const h = hash(note.id);
  const r = (n: number) => ((h >>> n) % 1000) / 1000;
  const slow = note.species === "whale" || note.species === "turtle" ? 1.4 : note.species === "crab" ? 1.6 : 1;
  const lane = note.species === "crab" ? 80 + r(3) * 6 : note.species === "jellyfish" ? 6 + r(3) * 50 : 6 + r(3) * 62;
  const dur = (28 + r(7) * 26) * slow;
  return {
    ["--lane" as string]: `${lane.toFixed(1)}%`,
    ["--dur" as string]: `${dur.toFixed(1)}s`,
    ["--delay" as string]: `${(-r(11) * dur).toFixed(1)}s`,
    ["--bob" as string]: `${(2.4 + r(15) * 1.8).toFixed(2)}s`,
    ["--size" as string]: `${Math.round((72 + r(19) * 26) * SPECIES_SCALE[note.species])}px`,
    ["--rx" as string]: r(23).toFixed(3),
  };
}

function SeaCreature({ note, open, fresh, mine, justNow, onOpen }: { note: Note; open: boolean; fresh: boolean; mine: boolean; justNow: boolean; onOpen: (note: Note, el: HTMLButtonElement) => void }) {
  const h = hash(note.id);
  const dir = note.species === "crab" ? (h & 2 ? "left" : "right") : h & 1 ? "left" : "right";
  return (
    <button
      type="button"
      className="gb-creature"
      data-species={note.species}
      data-dir={dir}
      data-open={open || undefined}
      data-fresh={fresh || undefined}
      data-mine={mine || undefined}
      data-just-now={justNow || undefined}
      data-note={note.id}
      style={motion(note)}
      aria-label={`${mine ? "Your" : `${note.name}'s`} ${COLOR_LABEL[note.color].toLowerCase()} ${SPECIES_LABEL[note.species].toLowerCase()}: read the note`}
      aria-expanded={open}
      onClick={(e) => onOpen(note, e.currentTarget)}
    >
      <span className="gb-creature__bob">
        <span className="gb-creature__body">
          <Creature species={note.species} color={note.color} seed={h} />
        </span>
        <span className="gb-creature__name" aria-hidden="true">
          {mine ? `You · ${justNow ? "just now" : note.name}` : note.name}
        </span>
      </span>
    </button>
  );
}

/** A soft coral branch: a round base of `r1` and a round tip of `r2`, joined along their tangents. */
function twig([x1, y1, r1, x2, y2, r2]: number[]): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = Math.acos((r1 - r2) / Math.hypot(x2 - x1, y2 - y1));
  const at = (x: number, y: number, r: number, t: number) => `${(x + r * Math.cos(t)).toFixed(1)} ${(y + r * Math.sin(t)).toFixed(1)}`;
  const fat = p > Math.PI / 2 ? 1 : 0;
  return `M${at(x1, y1, r1, a + p)}L${at(x2, y2, r2, a + p)}A${r2} ${r2} 0 ${fat} 0 ${at(x2, y2, r2, a - p)}L${at(x1, y1, r1, a - p)}A${r1} ${r1} 0 ${1 - fat} 0 ${at(x1, y1, r1, a + p)}Z`;
}

// Each coral's branches, as [x1, y1, r1, x2, y2, r2]: wide at the base, rounded at the tips.
const PINK_CORAL = [
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
const LILAC_CORAL = [
  [42, 114, 12, 38, 62, 10],
  [62, 114, 13, 66, 36, 11],
  [84, 114, 11, 90, 70, 9],
].map(twig);

/**
 * A coral in the jelly hand: a translucent gradient body with its white rim drawn once under the
 * whole shape (so the branches join without seams), and the surface's light on its tips.
 */
function Coral({ fill, branches, tips, children }: { fill: string; branches: string[]; tips: [number, number][]; children?: ReactNode }) {
  return (
    <>
      <g opacity=".78">
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

/** Three ribbons of sea-glass kelp; each sways on its own. */
function Kelp() {
  return (
    <g fill="url(#gb-kelp)" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="1" opacity=".55">
      <path className="gb-kelp__blade" d="M14 160c-6-26 8-42 2-66s-10-46 4-74c3-4 8-3 8 2-1 24 2 46 6 70s0 42-8 68Z" />
      <path className="gb-kelp__blade" d="M30 160c-4-20 10-30 6-50s-8-34 4-52c3-3 7-2 7 2 0 20 2 34 4 50s-6 32-13 50Z" />
      <path className="gb-kelp__blade" d="M42 160c-2-14 8-22 6-36s-4-22 4-32c3-2 6-1 6 2-1 12 0 22-1 32s-5 22-9 34Z" />
    </g>
  );
}

/** A peach scallop shell, ridged, with the light on its lip. */
function Shell() {
  return (
    <>
      <g opacity=".85">
        <path d="M24 37C11 37 3 27 5 16 8 7 15 3 24 3s16 4 19 13c2 11-6 21-19 21Z" fill="url(#gb-shell)" stroke="#FFFFFF" strokeWidth="1.5" paintOrder="stroke" />
        <path d="M24 35V6M24 35 14 8M24 35 34 8M24 35 7 16M24 35 41 16" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>
      <ellipse cx="24" cy="8.5" rx="8" ry="2.4" fill="#FFFFFF" opacity=".6" />
      <circle cx="30" cy="8" r="1.3" fill="#FFFFFF" />
    </>
  );
}

/** A pearl resting on the sand. */
function Pearl({ x, r }: { x: number; r: number }) {
  return (
    <>
      <circle cx={x} cy={19 - r} r={r} fill="url(#gb-pearl)" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx={x - r * 0.3} cy={19 - r * 1.45} r={r * 0.22} fill="#FFFFFF" />
    </>
  );
}

// The sandbar's crest, in a 1200×100 box stretched to the seabed.
const CREST = "M0 12C160 2 300 16 470 10S800 0 960 8s180 6 240 2";
const SAND = `${CREST}v90H0Z`;

/**
 * The seabed: one sandbar of light that dissolves into the deep water below it, and a reef in the
 * creatures' own jelly hand: pink and lilac coral, sea-glass kelp that sways, a shell and pearls.
 * It sits under the water's bottom edge and the list row, so the row rests on the sand.
 */
function Seabed() {
  return (
    <div className="gb-seabed" aria-hidden="true">
      <svg viewBox="0 0 1200 100" preserveAspectRatio="none" className="gb-seabed__sand">
        {/* The reef's paints, shared by the little drawings below. */}
        <defs>
          <linearGradient id="gb-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF4DA" stopOpacity=".66" />
            <stop offset=".45" stopColor="#E9F7EA" stopOpacity=".4" />
            <stop offset="1" stopColor="#9FE3F2" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gb-coral-pink" x1="0" y1="20" x2="0" y2="118" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--pink-soft)" }} />
            <stop offset="1" style={{ stopColor: "var(--pink)" }} />
          </linearGradient>
          <linearGradient id="gb-coral-lilac" x1="0" y1="20" x2="0" y2="118" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F1ECFF" />
            <stop offset="1" stopColor="#C9B8FF" />
          </linearGradient>
          <linearGradient id="gb-kelp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#93ECDC" />
            <stop offset="1" stopColor="#22CDB0" />
          </linearGradient>
          <linearGradient id="gb-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF1EA" />
            <stop offset="1" stopColor="#FFB08A" />
          </linearGradient>
          <clipPath id="gb-sand-clip">
            <path d={SAND} />
          </clipPath>
          <radialGradient id="gb-pearl" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset=".6" stopColor="#EEF3FF" />
            <stop offset="1" stopColor="#BFD0F2" />
          </radialGradient>
        </defs>
        <path d={SAND} fill="url(#gb-sand)" />
        {/* Its crest catches the light: a soft glow just inside it, and a thin white rim. */}
        <g clipPath="url(#gb-sand-clip)" fill="none" stroke="#FFFFFF">
          <path d={CREST} strokeOpacity=".28" strokeWidth="18" vectorEffect="non-scaling-stroke" />
          <path d={CREST} strokeOpacity=".75" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      <svg viewBox="0 0 120 120" className="gb-reef" style={{ left: "2%", ["--w" as string]: "88px" }}>
        <Coral fill="gb-coral-pink" branches={PINK_CORAL} tips={[[38, 29], [15, 43], [91, 34], [59, 46], [104, 50]]} />
      </svg>
      <svg viewBox="0 0 60 160" className="gb-reef gb-kelp" style={{ left: "20%", ["--w" as string]: "44px" }}>
        <Kelp />
      </svg>
      <svg viewBox="0 0 48 40" className="gb-reef gb-reef--wide" style={{ left: "27%", ["--w" as string]: "40px" }}>
        <Shell />
      </svg>
      <svg viewBox="0 0 40 20" className="gb-reef gb-reef--wide" style={{ left: "31%", ["--w" as string]: "34px" }}>
        <Pearl x={12} r={7} />
        <Pearl x={27} r={5} />
      </svg>
      <svg viewBox="0 0 120 120" className="gb-reef" style={{ left: "40%", ["--w" as string]: "84px" }}>
        <Coral fill="gb-coral-lilac" branches={LILAC_CORAL} tips={[[38, 54], [66, 27], [90, 62]]}>
          {/* The mouths of the tubes, a shade deeper. */}
          <g fill="#A58BF5" opacity=".45">
            <ellipse cx="38" cy="58" rx="6" ry="2.6" />
            <ellipse cx="66" cy="32" rx="6.6" ry="2.8" />
            <ellipse cx="90" cy="66" rx="5.2" ry="2.4" />
          </g>
        </Coral>
      </svg>
      <svg viewBox="0 0 60 160" className="gb-reef gb-kelp" style={{ left: "58%", ["--w" as string]: "40px" }}>
        <Kelp />
      </svg>
      <svg viewBox="0 0 48 40" className="gb-reef" style={{ left: "70%", ["--w" as string]: "36px" }}>
        <Shell />
      </svg>
      <svg viewBox="0 0 120 120" className="gb-reef gb-reef--wide" style={{ left: "78%", ["--w" as string]: "64px" }}>
        <Coral fill="gb-coral-pink" branches={PINK_CORAL} tips={[[38, 29], [15, 43], [91, 34], [59, 46], [104, 50]]} />
      </svg>
      <svg viewBox="0 0 60 160" className="gb-reef gb-kelp" style={{ left: "90%", ["--w" as string]: "42px" }}>
        <Kelp />
      </svg>
    </div>
  );
}

function NoteCard({ note, pos, onClose }: { note: Note; pos: { x: number; y: number; below: boolean }; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [note.id]);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby="gb-note-title"
      tabIndex={-1}
      className="gb-note widget"
      data-below={pos.below || undefined}
      style={{ left: pos.x, top: pos.y }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <Creature species={note.species} color={note.color} seed={hash(note.id)} className="gb-note__creature" />
        <div className="min-w-0 flex-1">
          <p id="gb-note-title" className="text-16 leading-tight font-bold">
            {note.name}
          </p>
          <p className="text-12 text-muted">
            {COLOR_LABEL[note.color]} {SPECIES_LABEL[note.species].toLowerCase()} · {ago(note.createdAt)}
          </p>
        </div>
        <button type="button" className="gb-note__close" aria-label="Close the note" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="mt-3 text-16 leading-snug break-words">{note.message}</p>
    </div>
  );
}

function ReleaseForm({ onReleased }: { onReleased: (note: Note, from: DOMRect | null) => void }) {
  const [species, setSpecies] = useState<Species>("fish");
  const [color, setColor] = useState<NoteColor>("magenta");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (message.trim().length < 2) {
      setError("Write a little something first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const website = new FormData(e.currentTarget).get("website");
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, message, color, species, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { note?: Note; error?: string };
      if (!res.ok || !data.note) {
        setError(data.error ?? "The sea is resting. Try again in a minute.");
        return;
      }
      onReleased(data.note, previewRef.current?.getBoundingClientRect() ?? null);
      setMessage("");
    } catch {
      setError("Couldn't reach the sea. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="gb-form widget" onSubmit={submit} aria-labelledby="gb-form-title" data-no-splash>
      <h2 id="gb-form-title" className="text-20 leading-tight font-bold tracking-[-0.02em]">
        Release a creature
      </h2>
      <p className="mt-1 text-14 text-muted">Pick one, give it a colour and a line to carry.</p>

      <div ref={previewRef} className="gb-preview" aria-hidden="true">
        <Creature species={species} color={color} seed={hash(name || "you")} className="gb-preview__creature" />
        <p className="gb-preview__bubble">{message.trim() || "Say hello…"}</p>
      </div>

      <fieldset className="mt-4">
        <legend className="text-14 font-semibold">Creature</legend>
        <div className="gb-pick gb-pick--species mt-2">
          {SPECIES.map((s) => (
            <label key={s} className="gb-option" title={SPECIES_LABEL[s]}>
              <input type="radio" name="species" value={s} checked={species === s} onChange={() => setSpecies(s)} className="sr-only" />
              <Creature species={s} color={color} seed={0} className="gb-option__art" />
              <span className="sr-only">{SPECIES_LABEL[s]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-3">
        <legend className="text-14 font-semibold">Colour</legend>
        <div className="gb-pick gb-pick--color mt-2">
          {NOTE_COLORS.map((c) => (
            <label key={c} className="gb-swatch" title={COLOR_LABEL[c]} style={{ ["--core" as string]: JELLY[c].core, ["--mid" as string]: JELLY[c].mid }}>
              <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} className="sr-only" />
              <span aria-hidden="true" />
              <span className="sr-only">{COLOR_LABEL[c]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-14 font-semibold" htmlFor="gb-name">
        Your name <span className="font-normal text-muted">(optional)</span>
      </label>
      <input id="gb-name" className="gb-input mt-1.5" value={name} maxLength={NAME_MAX} autoComplete="nickname" onChange={(e) => setName(e.target.value)} placeholder="Anonymous visitor" />

      <label className="mt-3 block text-14 font-semibold" htmlFor="gb-message">
        The note
      </label>
      <textarea
        id="gb-message"
        className="gb-input mt-1.5 min-h-[88px] resize-none"
        value={message}
        maxLength={NOTE_MAX}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Hi from Jakarta! Loved the Tenderlens case."
        aria-describedby="gb-count gb-error"
        required
      />
      <p id="gb-count" className="mt-1 text-right text-12 text-muted tabular-nums">
        {message.length}/{NOTE_MAX}
      </p>
      {/* Real people never see or fill this. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <p id="gb-error" className="text-14 font-semibold text-red" role="alert">
        {error}
      </p>
      <button type="submit" className="pill mt-3 w-full" data-variant="primary" aria-disabled={busy || undefined}>
        {busy ? "Releasing…" : "Release into the sea"}
      </button>
      <p className="mt-3 text-12 text-muted">Links are removed and rude words masked. Everyone here can see it.</p>
    </form>
  );
}

/**
 * The guestbook is the open sea under the page's header: every visitor's creature swims in it
 * (the newest forty; the list has them all). Tap one to read its note. Release your own with the
 * form: it drops in from the surface with a burst of bubbles. New creatures from other visitors
 * arrive live.
 */
export function GuestbookSea() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [justNow, setJustNow] = useState<string | null>(null);
  // The creatures this browser released, so yours is still yours after a reload. Creatures only
  // render once the notes have loaded, so reading this on the first client render is safe.
  const [mine, setMine] = useState<string[]>(() => (typeof window === "undefined" ? [] : readJSON<string[]>(MINE_KEY, [])));
  const [open, setOpen] = useState<{ note: Note; x: number; y: number; below: boolean } | null>(null);
  const [list, setList] = useState(false);
  const nonce = useLive((s) => s.noteNonce);
  const seaRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/guestbook?limit=60")
      .then((r) => r.json())
      .then((d: { notes: Note[] }) => alive && setNotes(d.notes))
      .catch(() => alive && setNotes([]));
    return () => {
      alive = false;
    };
  }, [nonce]);

  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus({ preventScroll: true });
  }, []);

  // A press anywhere else in the sea closes the note.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest(".gb-note, .gb-creature")) return;
      setOpen(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onOpen = (note: Note, el: HTMLButtonElement) => {
    const sea = seaRef.current;
    if (!sea) return;
    if (open?.note.id === note.id) return close();
    opener.current = el;
    sfx.plop();
    const s = sea.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const width = Math.min(320, s.width - 24);
    const x = Math.min(Math.max(r.left - s.left + r.width / 2 - width / 2, 12), s.width - width - 12);
    const below = r.top - s.top < 220;
    const y = below ? r.bottom - s.top + 10 : r.top - s.top - 10;
    setOpen({ note, x, y, below });
  };

  const swimming = (notes ?? []).slice(0, IN_THE_SEA);

  const onReleased = (note: Note, from: DOMRect | null) => {
    setNotes((n) => [note, ...(n ?? []).filter((x) => x.id !== note.id)]);
    setFreshId(note.id);
    setJustNow(note.id);
    window.setTimeout(() => setJustNow((id) => (id === note.id ? null : id)), 6000);
    const nextMine = [note.id, ...mine.filter((id) => id !== note.id)].slice(0, 10);
    setMine(nextMine);
    writeJSON(MINE_KEY, nextMine);
    sfx.success();
    const isNew = unlock("signed", { silent: true });
    toast({ title: "Released into the sea", body: isNew ? "Everyone here can see it swim. The Signed sticker is yours." : "Everyone here right now can see it swim.", tone: "mint", sticker: isNew ? "signed" : undefined });
    seaRef.current?.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
    // Once it's in the water: a splash where it is, and focus on it, so you can open its note.
    window.setTimeout(() => {
      const el = seaRef.current?.querySelector<HTMLButtonElement>(`[data-note="${note.id}"]`);
      const r = el?.getBoundingClientRect() ?? from;
      if (r) window.dispatchEvent(new CustomEvent("world:bubbles", { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
      el?.focus({ preventScroll: true });
    }, calm() ? 0 : 700);
  };

  const findMine = () => {
    const el = [...(seaRef.current?.querySelectorAll<HTMLButtonElement>("[data-mine]") ?? [])][0];
    const note = el && swimming.find((n) => n.id === el.dataset.note);
    if (!el || !note) return;
    el.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
    onOpen(note, el);
  };

  return (
    <section aria-labelledby="gb-sea-title" className="gb">
      <h2 id="gb-sea-title" className="sr-only">
        The sea of visitors
      </h2>
      <div className="gb-sea">
        <Seabed />
        {/* The water the creatures swim in; on wide screens the form floats over its right side. */}
        <div ref={seaRef} className="gb-water" data-waterline="3">
          {notes === null && <p className="gb-sea__status">Looking into the water…</p>}
          {swimming.map((n) => (
            <SeaCreature key={n.id} note={n} open={open?.note.id === n.id} fresh={n.id === freshId} mine={mine.includes(n.id)} justNow={n.id === justNow} onOpen={onOpen} />
          ))}
          {open && <NoteCard note={open.note} pos={open} onClose={close} />}
        </div>
        <div className="gb-sea__form">
          <ReleaseForm onReleased={onReleased} />
        </div>
      </div>

      {/* On the sandbar, under the creatures. */}
      <div className="gb-more container-page flex flex-wrap items-center gap-3">
        <button type="button" className="pill" aria-expanded={list} aria-controls="gb-list" onClick={() => setList((v) => !v)}>
          {list ? "Hide the list" : `Read them all as a list (${notes?.length ?? 0})`}
        </button>
        {swimming.some((n) => mine.includes(n.id)) && (
          <button type="button" className="pill" data-variant="ghost" onClick={findMine}>
            Find my creature
          </button>
        )}
        <p className="text-14 text-muted">Tap a creature to read what it carries.</p>
      </div>
      {list && (
        <ul id="gb-list" className="container-page mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(notes ?? []).map((n) => (
            <li key={n.id} className="widget flex gap-3 p-5">
              <Creature species={n.species} color={n.color} seed={hash(n.id)} className="gb-list__creature" />
              <div className="min-w-0">
                <p className="text-16 leading-snug break-words">{n.message}</p>
                <p className="mt-2 text-12 text-muted">
                  <span className="font-semibold text-ink">{n.name}</span> · {COLOR_LABEL[n.color]} {SPECIES_LABEL[n.species].toLowerCase()} · {ago(n.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
