"use client";

import { useEffect, useId, useState } from "react";
import { NAME_MAX, NOTE_COLORS, NOTE_MAX, NOTE_STICKERS, type Note, type NoteColor } from "@/content/guestbook";
import { cn } from "@/lib/cn";
import { useNow } from "@/lib/hooks";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { toast } from "@/lib/ui";
import { useLive } from "../live/live-store";

const TINT: Record<NoteColor, string> = {
  magenta: "var(--accent)",
  sun: "var(--sun)",
  lime: "var(--lime)",
  sky: "var(--sky)",
  violet: "var(--violet)",
  mint: "var(--mint)",
};

function ago(iso: string, now: number) {
  if (!now) return "";
  const s = Math.max(0, now - Date.parse(iso) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function NoteCard({ note, index, now, fresh }: { note: Note; index: number; now: number; fresh: boolean }) {
  return (
    <li
      className={cn("mb-4 break-inside-avoid rounded-[20px] border border-line p-5 transition-transform hover:rotate-0", fresh && "pop-in")}
      style={{
        background: `color-mix(in srgb, ${TINT[note.color]} 12%, var(--surface))`,
        rotate: `${[-1.2, 0.8, -0.5, 1.1, 0.3][index % 5]}deg`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span aria-hidden="true" className="text-32 leading-none">
          {note.sticker}
        </span>
        <span className="text-12 text-muted">{ago(note.createdAt, now)}</span>
      </div>
      <p className="mt-3 text-18 leading-snug">{note.message}</p>
      <p className="mt-3 text-14 font-semibold">— {note.name}</p>
    </li>
  );
}

/** The guestbook: a form and a wall of notes that updates for everyone, live. */
export function GuestbookWall() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState<NoteColor>("magenta");
  const [sticker, setSticker] = useState(NOTE_STICKERS[0]);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  const nonce = useLive((s) => s.noteNonce);
  const now = useNow();
  const id = useId();

  // Load the wall, and reload whenever a note arrives live from another visitor.
  useEffect(() => {
    let alive = true;
    fetch("/api/guestbook?limit=60")
      .then((r) => r.json() as Promise<{ notes: Note[] }>)
      .then((d) => alive && setNotes(d.notes))
      .catch(() => alive && setNotes([]));
    return () => {
      alive = false;
    };
  }, [nonce]);

  const submit = async () => {
    if (message.trim().length < 2 || state === "sending") return;
    setState("sending");
    setError("");
    try {
      const form = document.getElementById(`${id}-website`) as HTMLInputElement | null;
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, message, color, sticker, website: form?.value ?? "" }),
      });
      const data = (await res.json()) as { note?: Note; error?: string };
      if (!res.ok || !data.note) throw new Error(data.error ?? "Something went wrong.");
      const note = data.note;
      setNotes((list) => [note, ...(list ?? []).filter((n) => n.id !== note.id)]);
      setFresh(note.id);
      setMessage("");
      setState("idle");
      sfx.success();
      unlock("signed");
      toast({ title: "Pinned to the wall", body: "Everyone here right now can see it.", tone: "mint", icon: note.sticker });
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Something went wrong.");
      sfx.bump();
    }
  };

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-16">
      <form
        className="widget p-6 lg:sticky lg:top-28 md:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        data-xr="Guestbook form · moderated, rate-limited, broadcast over SSE"
      >
        <h2 className="text-20 font-bold tracking-[-0.02em]">Leave a note</h2>
        <label htmlFor={`${id}-name`} className="mt-5 block text-14 font-semibold">
          Your name <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id={`${id}-name`}
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Anonymous visitor"
          className="mt-2 w-full rounded-[14px] border border-line bg-surface px-4 py-3 outline-none focus:border-ink/40"
          autoComplete="nickname"
        />
        <label htmlFor={`${id}-msg`} className="mt-4 block text-14 font-semibold">
          Message
        </label>
        <textarea
          id={`${id}-msg`}
          value={message}
          maxLength={NOTE_MAX}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          placeholder="Say hi, leave a tip, or tell her what you're hiring for."
          className="mt-2 w-full resize-none rounded-[14px] border border-line bg-surface px-4 py-3 leading-relaxed outline-none focus:border-ink/40"
          aria-describedby={`${id}-count`}
        />
        <p id={`${id}-count`} className="mt-1 text-right text-12 text-muted tabular-nums">
          {message.length}/{NOTE_MAX}
        </p>

        <fieldset className="mt-3">
          <legend className="text-14 font-semibold">Paper</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {NOTE_COLORS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name={`${id}-color`} value={c} checked={color === c} onChange={() => setColor(c)} className="peer sr-only" />
                <span
                  aria-hidden="true"
                  className="block size-8 rounded-full border border-line ring-offset-2 ring-offset-surface-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                  style={{ background: `color-mix(in srgb, ${TINT[c]} 30%, var(--surface))` }}
                />
                <span className="sr-only">{c}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-14 font-semibold">Sticker</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {NOTE_STICKERS.map((s) => (
              <label key={s} className="cursor-pointer">
                <input type="radio" name={`${id}-sticker`} value={s} checked={sticker === s} onChange={() => setSticker(s)} className="peer sr-only" />
                <span
                  aria-hidden="true"
                  className="grid size-10 place-items-center rounded-[12px] border border-line bg-surface text-20 peer-checked:border-ink peer-checked:bg-surface-2 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                >
                  {s}
                </span>
                <span className="sr-only">Sticker {s}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Honeypot: hidden from people, irresistible to bots. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`${id}-website`}>Website</label>
          <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <button type="submit" className="pill mt-6 w-full" data-variant="magenta" disabled={message.trim().length < 2 || state === "sending"}>
          {state === "sending" ? "Pinning…" : "Pin it to the wall"}
        </button>
        <p role="status" aria-live="polite" className={cn("mt-3 text-14", state === "error" ? "text-accent-ink" : "text-muted")}>
          {state === "error" ? error : "Links are removed and three notes per ten minutes, to keep it friendly."}
        </p>
      </form>

      <section aria-label="Notes" className="min-w-0">
        {notes === null ? (
          <p className="text-muted">Loading the wall…</p>
        ) : (
          <ul className="columns-1 gap-4 sm:columns-2 xl:columns-3" aria-live="polite" aria-relevant="additions">
            {notes.map((n, i) => (
              <NoteCard key={n.id} note={n} index={i} now={now} fresh={n.id === fresh} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
