"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { Medal, medalMarks, medalTier, nextMedal } from "@/components/Medal";
import { Sticker } from "@/components/Sticker";
import { projects } from "@/content/projects";
import { dispatch, type SiteAction } from "@/lib/actions";
import { sfx } from "@/lib/sound";
import { clearFresh, hydrateStickers, placeSticker, STICKERS, stickerStore, useStickers, type StickerDef } from "@/lib/stickers";
import { toast, ui, useUI } from "@/lib/ui";

const BUSY = "p, h1, h2, h3, h4, li, a, button, input, textarea, select, img, canvas, video, iframe, label, [role='button']";

/**
 * Somewhere in the margins of what's on screen, so a new sticker never lands on a sentence: up to
 * twelve spots in the side gutters, the first one with nothing readable under it. Falls back to
 * near the middle when the page has no margins (a phone).
 */
function placement(id: string) {
  const width = document.documentElement.scrollWidth;
  const r = Math.round((Math.random() - 0.5) * 24);
  for (let i = 0; i < 12; i++) {
    const left = i % 2 === 0;
    const vx = window.innerWidth * (left ? 0.05 + Math.random() * 0.06 : 0.89 + Math.random() * 0.06);
    const vy = window.innerHeight * (0.3 + Math.random() * 0.4);
    const clear = [
      [0, 0],
      [-30, -30],
      [30, 30],
      [-30, 30],
      [30, -30],
    ].every(([dx, dy]) => !document.elementsFromPoint(vx + dx, vy + dy).some((el) => el.matches(BUSY)));
    if (clear) return { id, x: (vx / width) * 100, y: window.scrollY + vy, r };
  }
  return {
    id,
    x: ((window.innerWidth / 2 + (Math.random() - 0.5) * 160) / width) * 100,
    y: window.scrollY + window.innerHeight * 0.45 + (Math.random() - 0.5) * 120,
    r,
  };
}

/** "Show me" for the case studies goes to the first one you haven't opened. */
function goFor(s: StickerDef, counters: Record<string, number>): SiteAction | undefined {
  if (s.id !== "collector") return s.go;
  const unread = projects.find((p) => !counters[`cases:${p.slug}`]);
  return unread ? { type: "navigate", href: `/work/${unread.slug}` } : s.go;
}

export function StickerBook() {
  const open = useUI((s) => s.overlay === "stickers");
  const unlocked = useStickers((s) => s.unlocked);
  const counters = useStickers((s) => s.counters);
  // Mounted fresh each time the book opens: what was new when you opened it stays marked until you close it.
  const [fresh] = useState(() => stickerStore.get().fresh);
  const pathname = usePathname();
  const titleId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    hydrateStickers();
    // The newest sticker is the one you came to see.
    const first = fresh[0];
    const tile = first ? listRef.current?.querySelector<HTMLElement>(`[data-sticker="${first}"]`) : null;
    tile?.scrollIntoView({ block: "nearest" });
    clearFresh();
  }, [open, fresh]);

  const close = () => ui.set({ overlay: null });
  const visible = STICKERS.filter((s) => !s.secret || unlocked.includes(s.id));
  const total = STICKERS.length;
  const count = unlocked.length;
  const tier = medalTier(count, total);
  const next = nextMedal(count, total);

  const stick = (s: StickerDef) => {
    close();
    // After the dialog has gone, so the margins are measured on the page itself.
    requestAnimationFrame(() => {
      placeSticker(pathname, placement(s.id));
      sfx.pop();
      toast({ title: `${s.name}, stuck on`, body: "Drag it anywhere. Double-click it, or focus it and press Delete, to peel it off.", tone: "sun", sticker: s.id });
    });
  };

  const show = (go: SiteAction) => {
    close();
    void dispatch(go);
  };

  return (
    <Dialog open={open} onClose={close} labelledBy={titleId} className="max-w-[min(880px,calc(100vw-24px))]">
      <div className="widget sticker-book max-h-[calc(100dvh-24px)] overflow-y-auto">
        <header className="relative flex flex-wrap items-end gap-x-8 gap-y-5 border-b border-line px-5 pt-6 pb-5 md:px-7">
          <button type="button" className="pill absolute top-4 right-4" data-shape="icon" data-size="sm" aria-label="Close the sticker book" onClick={close}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1 basis-[22rem]">
            <h2 id={titleId} className="type-title-2">
              Sticker book
            </h2>
            <p className="mt-2 max-w-[48ch] text-muted">Each one is earned somewhere on the site. Peel off the ones you have and stick them on any page; they stay where you put them.</p>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-80">
            <Medal count={count} total={total} size={56} />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-3 text-14">
                <span className="font-semibold">{tier ? `${tier.name} medal` : "No medal yet"}</span>
                <span className="text-muted tabular-nums">
                  {count} of {total}
                </span>
              </p>
              <div
                className="sticker-book__bar mt-2"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={count}
                aria-label="Stickers collected"
                aria-valuetext={`${count} of ${total}${tier ? `, ${tier.name} medal` : ""}`}
              >
                <div className="sticker-book__fill bar-fill" style={{ width: `${(count / total) * 100}%` }} />
                {medalMarks(total).map((m) => (
                  <span key={m.name} className="sticker-book__tick" data-passed={count / total >= m.at || undefined} style={{ left: `${m.at * 100}%` }} title={m.name} />
                ))}
              </div>
              <p className="mt-1.5 text-12 text-muted">{next ? `${next.need} more for ${next.name}` : "The whole set. Thank you for looking around."}</p>
            </div>
          </div>
        </header>

        <ul ref={listRef} className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 md:p-6">
          {visible.map((s) => {
            const has = unlocked.includes(s.id);
            const isNew = has && fresh.includes(s.id);
            const go = has ? undefined : goFor(s, counters);
            const done = s.progress ? Math.min(s.progress.target, counters[s.progress.counter] ?? 0) : 0;
            return (
              <li key={s.id} data-sticker={s.id} data-has={has || undefined} className="sticker-slot">
                {isNew && <span className="sticker-slot__new">New</span>}
                <Sticker id={s.id} locked={!has} size={76} className={has ? "sticker-slot__art" : undefined} />
                <p className="text-16 leading-tight font-semibold">
                  {s.name}
                  {!has && <span className="sr-only"> (not yet)</span>}
                </p>
                <p className="text-12 leading-snug text-muted">{s.hint}</p>
                {!has && s.progress && done > 0 && (
                  <div className="w-full max-w-36">
                    <div className="sticker-slot__bar" aria-hidden="true">
                      <span style={{ width: `${(done / s.progress.target) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-12 text-muted tabular-nums">
                      {done} of {s.progress.target}
                    </p>
                  </div>
                )}
                {has ? (
                  <button type="button" className="pill mt-auto" data-size="sm" onClick={() => stick(s)}>
                    Stick it here<span className="sr-only">: {s.name}</span>
                  </button>
                ) : go ? (
                  <button type="button" className="pill mt-auto" data-variant="ghost" data-size="sm" onClick={() => show(go)}>
                    Show me<span className="sr-only">: {s.name}</span>
                  </button>
                ) : null}
              </li>
            );
          })}
          {STICKERS.some((s) => s.secret && !unlocked.includes(s.id)) && (
            <li className="sticker-slot" data-secret="">
              <Sticker id="konami" locked mystery size={76} />
              <p className="text-16 font-semibold">A secret</p>
              <p className="text-12 leading-snug text-muted">
                Ask the terminal: <code>ls -a</code>
              </p>
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
