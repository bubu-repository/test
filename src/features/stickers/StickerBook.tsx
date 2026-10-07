"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId } from "react";
import { Dialog } from "@/components/Dialog";
import { Sticker } from "@/components/Sticker";
import { sfx } from "@/lib/sound";
import { hydrateStickers, placeSticker, STICKERS, useStickers } from "@/lib/stickers";
import { toast, ui, useUI } from "@/lib/ui";

/** Somewhere near the middle of the current viewport, slightly tilted. */
function randomPlacement(id: string) {
  const width = document.documentElement.scrollWidth;
  return {
    id,
    x: ((window.innerWidth / 2 + (Math.random() - 0.5) * 160) / width) * 100,
    y: window.scrollY + window.innerHeight * 0.45 + (Math.random() - 0.5) * 120,
    r: Math.round((Math.random() - 0.5) * 24),
  };
}

export function StickerBook() {
  const open = useUI((s) => s.overlay === "stickers");
  const unlocked = useStickers((s) => s.unlocked);
  const pathname = usePathname();
  const titleId = useId();

  useEffect(() => {
    if (open) hydrateStickers();
  }, [open]);

  const close = () => ui.set({ overlay: null });
  const visible = STICKERS.filter((s) => !s.secret || unlocked.includes(s.id));
  const count = unlocked.length;

  const stick = (id: string) => {
    placeSticker(pathname, randomPlacement(id));
    sfx.pop();
    close();
    toast({ title: "Stuck!", body: "Drag it anywhere. Focus it and use arrow keys to move, Delete to peel it off.", tone: "sun", icon: "📌" });
  };

  return (
    <Dialog open={open} onClose={close} labelledBy={titleId} className="max-w-[min(880px,calc(100vw-24px))]">
      <div className="widget max-h-[calc(100dvh-24px)] overflow-y-auto" data-xr="StickerBook · achievements in localStorage">
        <header className="flex flex-wrap items-end gap-4 rounded-t-card border-b border-line px-5 pt-6 pb-5 md:px-7">
          <div className="min-w-0 flex-1">
            <p className="type-pixel">Collect them all</p>
            <h2 id={titleId} className="font-display text-48 leading-none font-bold tracking-tight">
              Sticker book
            </h2>
            <p className="mt-2 max-w-[52ch] text-16">Explore the site to unlock stickers. Then peel them off and stick them anywhere: they stay where you put them.</p>
          </div>
          <div className="w-full sm:w-56">
            <p className="type-pixel flex justify-between">
              <span>Collected</span>
              <span>
                {count}/{STICKERS.length}
              </span>
            </p>
            <div className="mt-2 h-4 overflow-hidden rounded-pill bg-surface p-0.5" role="progressbar" aria-valuemin={0} aria-valuemax={STICKERS.length} aria-valuenow={count} aria-label="Stickers collected">
              <div className="h-full rounded-pill bar-fill transition-[width] duration-700" style={{ width: `${(count / STICKERS.length) * 100}%` }} />
            </div>
          </div>
        </header>
        <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 md:p-6">
          {visible.map((s) => {
            const has = unlocked.includes(s.id);
            return (
              <li key={s.id} className="stitched flex flex-col items-center gap-2 rounded-card bg-surface-2 px-3 pt-5 pb-4 text-center">
                <Sticker shape={s.shape} tone={s.tone} emoji={s.emoji} locked={!has} size={76} className={has ? "rotate-[-6deg]" : undefined} />
                <p className="font-display text-18 leading-tight font-bold">{has ? s.name : "Locked"}</p>
                <p className="text-12 text-muted">{s.hint}</p>
                {has && (
                  <button type="button" className="pill mt-auto" data-variant="sun" data-size="sm" onClick={() => stick(s.id)}>
                    Stick it here<span className="sr-only">: {s.name}</span>
                  </button>
                )}
              </li>
            );
          })}
          {STICKERS.some((s) => s.secret && !unlocked.includes(s.id)) && (
            <li className="stitched flex flex-col items-center justify-center gap-2 rounded-card bg-surface-2 px-3 py-5 text-center">
              <Sticker shape="star" tone="magenta" emoji="" locked size={76} />
              <p className="font-display text-18 font-bold">???</p>
              <p className="text-12 text-muted">A secret. Try the terminal: <code>ls -a</code></p>
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
