"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { COLOR_LABEL, NAME_MAX, NOTE_COLORS, NOTE_MAX, SPECIES, SPECIES_LABEL, type Note, type NoteColor, type Species } from "@/content/guestbook";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { toast } from "@/lib/ui";
import { useLive } from "../live/live-store";
import { Creature, JELLY, SPECIES_SCALE } from "./Creature";

/** How many creatures swim at once (the newest); the list shows them all. */
const IN_THE_SEA = 40;

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

function SeaCreature({ note, open, fresh, onOpen }: { note: Note; open: boolean; fresh: boolean; onOpen: (note: Note, el: HTMLButtonElement) => void }) {
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
      style={motion(note)}
      aria-label={`${note.name}'s ${COLOR_LABEL[note.color].toLowerCase()} ${SPECIES_LABEL[note.species].toLowerCase()}: read the note`}
      aria-expanded={open}
      onClick={(e) => onOpen(note, e.currentTarget)}
    >
      <span className="gb-creature__bob">
        <span className="gb-creature__body">
          <Creature species={note.species} color={note.color} seed={h} />
        </span>
        <span className="gb-creature__name" aria-hidden="true">
          {note.name}
        </span>
      </span>
    </button>
  );
}

/** The seabed: soft sand dunes, pink and lilac coral, and weed that sways. */
function Seabed() {
  return (
    <div className="gb-seabed" aria-hidden="true">
      <svg viewBox="0 0 1200 140" preserveAspectRatio="none" className="gb-seabed__sand">
        <defs>
          <linearGradient id="gb-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF4DA" stopOpacity=".95" />
            <stop offset="1" stopColor="#EBD3A2" />
          </linearGradient>
        </defs>
        <path d="M0 70C150 40 260 92 420 74s250-46 400-26 260 40 380 20v72H0Z" fill="url(#gb-sand)" opacity=".75" />
        <path d="M0 96c180-30 320 12 500 0s300-34 460-10 180 18 240 10v54H0Z" fill="url(#gb-sand)" />
      </svg>
      <svg viewBox="0 0 120 120" className="gb-coral" style={{ left: "6%" }}>
        <path d="M60 118V70M60 86 36 60M36 60V36M36 60 18 46M60 78l26-28M86 50V28M86 50l16-12" stroke="#FF8FC3" strokeWidth="11" strokeLinecap="round" fill="none" opacity=".85" />
      </svg>
      <svg viewBox="0 0 120 120" className="gb-coral gb-coral--sway" style={{ left: "24%", width: "72px" }}>
        <path d="M30 118c-10-30 14-40 0-70M60 118c10-34-12-44 4-84M90 118c-8-24 10-32-2-56" stroke="#3DBE4A" strokeWidth="8" strokeLinecap="round" fill="none" opacity=".8" />
      </svg>
      <svg viewBox="0 0 120 120" className="gb-coral" style={{ left: "64%", width: "96px" }}>
        <path d="M60 118V64M60 80 40 56M40 56V40M60 72l22-24M82 48V30" stroke="#B49CFF" strokeWidth="10" strokeLinecap="round" fill="none" opacity=".85" />
      </svg>
      <svg viewBox="0 0 120 120" className="gb-coral gb-coral--sway" style={{ left: "86%", width: "64px" }}>
        <path d="M40 118c-10-30 12-40-2-74M74 118c8-28-10-40 6-70" stroke="#2FA14A" strokeWidth="8" strokeLinecap="round" fill="none" opacity=".75" />
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
      <button type="submit" className="pill mt-3 w-full" data-variant="magenta" disabled={busy}>
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

  const onReleased = (note: Note, from: DOMRect | null) => {
    setNotes((n) => [note, ...(n ?? []).filter((x) => x.id !== note.id)]);
    setFreshId(note.id);
    sfx.success();
    unlock("signed");
    toast({ title: "Released into the sea", body: "Everyone here right now can see it swim.", tone: "mint" });
    // A splash where it went in.
    const sea = seaRef.current?.getBoundingClientRect();
    const x = sea ? sea.left + sea.width * 0.5 : from ? from.left + from.width / 2 : window.innerWidth / 2;
    const y = sea ? sea.top + 40 : from?.top ?? 200;
    window.dispatchEvent(new CustomEvent("world:bubbles", { detail: { x, y } }));
    seaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const swimming = useMemo(() => (notes ?? []).slice(0, IN_THE_SEA), [notes]);

  return (
    <section aria-labelledby="gb-sea-title" className="gb" data-xr="GuestbookSea · jelly creatures in the open sea">
      <h2 id="gb-sea-title" className="sr-only">
        The sea of visitors
      </h2>
      <div className="gb-sea">
        {/* The water the creatures swim in; on wide screens the form floats over its right side. */}
        <div ref={seaRef} className="gb-water">
          {notes === null && <p className="gb-sea__status">Looking into the water…</p>}
          {swimming.map((n) => (
            <SeaCreature key={n.id} note={n} open={open?.note.id === n.id} fresh={n.id === freshId} onOpen={onOpen} />
          ))}
          <Seabed />
          {open && <NoteCard note={open.note} pos={open} onClose={close} />}
        </div>
        <div className="gb-sea__form">
          <ReleaseForm onReleased={onReleased} />
        </div>
      </div>

      <div className="container-page mt-10 flex flex-wrap items-center gap-3">
        <button type="button" className="pill" aria-expanded={list} aria-controls="gb-list" onClick={() => setList((v) => !v)}>
          {list ? "Hide the list" : `Read them all as a list (${notes?.length ?? 0})`}
        </button>
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
