"use client";

import { useEffect, useRef, useState } from "react";
import { MociAvatar } from "@/components/MociAvatar";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";

const KEY = "adelia:pack";
const RESEAL = "adelia:reseal";

/**
 * The booster pack, on the home page and on /work. It is sealed again on every visit (session
 * storage, read before paint by the preferences script, so the cards never flash). Drag across the
 * crimped strip and it peels off from the left; let go early and it springs back. Opening deals the
 * cards out of the pack face down (a FLIP animation), then flips them over, rarest last.
 */
export function BoosterPack({ count }: { count: number }) {
  const [tear, setTear] = useState(0);
  const drag = useRef<{ x: number; w: number } | null>(null);
  const packRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    // Client-side navigations skip the pre-paint script: honour ?pack=fresh here too.
    if (new URLSearchParams(window.location.search).get("pack") === "fresh") document.documentElement.setAttribute("data-pack", "sealed");
    const reset = () => {
      busy.current = false;
      setTear(0);
    };
    window.addEventListener(RESEAL, reset);
    return () => window.removeEventListener(RESEAL, reset);
  }, []);

  const deal = (from: DOMRect) => {
    const root = document.documentElement;
    root.setAttribute("data-pack", "open");
    root.setAttribute("data-dealing", "");
    window.setTimeout(() => root.removeAttribute("data-dealing"), 3600);

    // Every card flies out of the pack to its slot, face down, one after another.
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-card]")).filter((c) => c.getClientRects().length);
    cards.forEach((card, i) => {
      const to = card.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      card.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.5) rotate(${(i - 1) * 14}deg)`, opacity: 0 },
          { transform: `translate(${dx * 0.3}px, ${dy * 0.3 - 80}px) scale(0.9) rotate(${(i - 1) * -6}deg)`, opacity: 1, offset: 0.55 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 900, delay: 80 + i * 160, easing: "cubic-bezier(.34,1.3,.64,1)", fill: "backwards" },
      ).onfinish = () => sfx.pop();
    });
    window.setTimeout(() => cards[0]?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
  };

  const open = () => {
    const root = document.documentElement;
    if (root.getAttribute("data-pack") !== "sealed" || busy.current) return;
    busy.current = true;
    drag.current = null;
    sfx.tear();
    try {
      window.sessionStorage.setItem(KEY, "open");
    } catch {
      // Private mode: the pack simply reseals on the next page load.
    }
    unlock("pack");
    setTear(1);
    const pack = packRef.current;
    if (!pack || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.setAttribute("data-pack", "open");
      return;
    }
    // The strip flies off first, then the cards come out.
    root.setAttribute("data-pack", "tearing");
    window.setTimeout(() => deal(pack.getBoundingClientRect()), 520);
  };

  const onSheen = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--px", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--py", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--prx", `${((0.5 - py) * 10).toFixed(2)}deg`);
    el.style.setProperty("--pry", `${((px - 0.5) * 14).toFixed(2)}deg`);
  };

  return (
    <div className="pack relative z-10 place-items-center py-6" role="group" aria-label={`Sealed booster pack, ${count} cards inside`}>
      <div
        ref={packRef}
        className="pack__body"
        style={{ ["--tear" as string]: tear }}
        onPointerMove={onSheen}
        onPointerLeave={(e) => {
          e.currentTarget.style.setProperty("--prx", "0deg");
          e.currentTarget.style.setProperty("--pry", "0deg");
        }}
      >
        {/* Inside the pack: the tops of the cards, seen once the strip lifts. */}
        <div className="pack__mouth" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        {/* The crimped strip you tear off. */}
        <div
          className="pack__strip touch-none select-none"
          data-cursor="Tear"
          onPointerDown={(e) => {
            if (busy.current) return;
            const r = e.currentTarget.getBoundingClientRect();
            drag.current = { x: e.clientX - r.left, w: r.width };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const r = e.currentTarget.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (e.clientX - r.left - drag.current.x) / (drag.current.w * 0.6)));
            if (Math.floor(p * 8) > Math.floor(tear * 8)) sfx.tick();
            setTear(p);
            if (p >= 1) open();
          }}
          onPointerUp={() => {
            drag.current = null;
            if (!busy.current) setTear(0);
          }}
          onPointerCancel={() => {
            drag.current = null;
            if (!busy.current) setTear(0);
          }}
        >
          <span className="pack__strip-foil" aria-hidden="true" />
          <span className="pack__strip-label type-pixel" aria-hidden="true">
            ✂ tear here →
          </span>
        </div>
        <span className="pack__perf" aria-hidden="true">
          <span className="pack__perf-done" />
        </span>

        <div className="pack__foil">
          <span className="pack__sheen" aria-hidden="true" />
          <div className="pack__print">
            <p className="pack__brand">
              Adelia <b>TCG</b>
            </p>
            <span className="pack__mascot">
              <MociAvatar size={88} />
            </span>
            <p className="pack__title">
              Selected
              <br />
              Work
            </p>
            <p className="pack__meta">
              <span>Booster pack</span>
              <span>Series 2026</span>
            </p>
            <p className="pack__count">
              {count} cards inside · 1 holo guaranteed
            </p>
          </div>
          <span className="pack__seal" aria-hidden="true">
            AT
            <br />
            26
          </span>
        </div>
      </div>

      <button type="button" className="pill mt-8" data-variant="magenta" data-size="lg" data-tour="pack" data-magnetic="0.25" onClick={open}>
        Open the pack
      </button>
      <p className="pack-hint mt-2 text-14 text-muted">Or drag across the top of the pack to tear it.</p>
    </div>
  );
}

/** Puts the cards back in a fresh pack (the reseal button, and the tour). */
export function resealPack() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(RESEAL));
  document.documentElement.setAttribute("data-pack", "sealed");
}

export function ResealPack() {
  return (
    <button
      type="button"
      className="pill js-only"
      data-size="sm"
      data-variant="ghost"
      onClick={() => {
        resealPack();
        sfx.whoosh();
        const pack = Array.from(document.querySelectorAll<HTMLElement>(".pack")).find((p) => p.getClientRects().length);
        pack?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    >
      ↺ Reseal the pack
    </button>
  );
}
