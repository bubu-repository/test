"use client";

import { useEffect, useRef, useState } from "react";
import { MociAvatar } from "@/components/MociAvatar";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { writeJSON } from "@/lib/storage";

/**
 * The booster pack on /work. Sealed on the first visit (set before paint by the preferences
 * script, so the cards never flash). Tear the strip with a drag, or press the button.
 * Opening deals the cards out of the pack with a FLIP animation.
 */
export function BoosterPack({ count }: { count: number }) {
  const [tear, setTear] = useState(0);
  const drag = useRef<{ x: number; w: number } | null>(null);
  const packRef = useRef<HTMLDivElement>(null);

  // Client-side navigations skip the pre-paint script: honour ?pack=fresh here too.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pack") === "fresh") document.documentElement.setAttribute("data-pack", "sealed");
  }, []);

  const open = () => {
    const root = document.documentElement;
    if (root.getAttribute("data-pack") !== "sealed") return;
    sfx.tear();
    try {
      window.localStorage.setItem("adelia:pack", "open");
    } catch {
      writeJSON("adelia:pack", "open");
    }
    unlock("pack");
    const from = packRef.current?.getBoundingClientRect();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.setAttribute("data-pack", "open");
    if (!from || calm) return;

    // Deal: every card flies out of the pack to its slot, one after another.
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-card]")).filter((c) => c.getClientRects().length);
    cards.forEach((card, i) => {
      const to = card.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      card.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.55) rotate(${(i - 1) * 14}deg)`, opacity: 0 },
          { transform: `translate(${dx * 0.3}px, ${dy * 0.3 - 80}px) scale(0.9) rotate(${(i - 1) * -6}deg)`, opacity: 1, offset: 0.55 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 900, delay: 120 + i * 160, easing: "cubic-bezier(.34,1.3,.64,1)", fill: "backwards" },
      ).onfinish = () => sfx.pop();
    });
    window.setTimeout(() => cards[0]?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
  };

  return (
    <div className="pack relative z-10 place-items-center py-6" aria-label="Sealed booster pack">
      <div className="relative" ref={packRef}>
        <div className="pack__foil grid place-items-center">
          <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
            <MociAvatar size={84} />
            <p className="text-48 leading-[0.92] font-bold tracking-[-0.04em] text-on-fill">
              Selected
              <br />
              Work
            </p>
            <p className="type-pixel rounded-pill bg-white/80 px-3 py-1.5 text-on-fill">Series 2026 · {count} cards</p>
          </div>
          {/* Tear strip */}
          <div
            className="absolute inset-x-0 top-0 z-20 h-16 touch-none select-none"
            data-cursor="Tear"
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              drag.current = { x: e.clientX - r.left, w: r.width };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const r = e.currentTarget.getBoundingClientRect();
              const p = Math.max(0, Math.min(1, (e.clientX - r.left - drag.current.x) / (drag.current.w * 0.7)));
              if (p > tear + 0.08) sfx.tick();
              setTear(p);
              if (p >= 1) {
                drag.current = null;
                open();
              }
            }}
            onPointerUp={() => {
              drag.current = null;
              if (tear < 1) setTear(0);
            }}
          >
            <div className="absolute inset-x-3 top-9 border-t-2 border-dashed border-[#1D1D1F]/25" />
            <div className="absolute top-9 left-3 h-[2px] bg-accent" style={{ width: `calc((100% - 24px) * ${tear})` }} />
            <span className="type-pixel absolute top-3 left-1/2 -translate-x-1/2 text-on-fill">✂ tear here →</span>
          </div>
        </div>
      </div>
      <button type="button" className="pill mt-6" data-variant="magenta" data-size="lg" data-tour="pack" data-magnetic="0.25" onClick={open}>
        Open the pack
      </button>
      <p className="mt-2 text-14 text-muted">Or drag across the top of the pack to tear it.</p>
    </div>
  );
}

export function ResealPack() {
  return (
    <button
      type="button"
      className="pill js-only"
      data-size="sm"
      data-variant="ghost"
      onClick={() => {
        try {
          window.localStorage.removeItem("adelia:pack");
        } catch {
          // ignore
        }
        document.documentElement.setAttribute("data-pack", "sealed");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      ↺ Reseal the pack
    </button>
  );
}
