"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { dispatch } from "@/lib/actions";

/** One box to ask anything. The question goes straight to Moci, the site's agent. */
export function HeroAsk() {
  const [q, setQ] = useState("");
  return (
    <div className="js-only w-full">
      <form
        className="flex items-center gap-2 rounded-pill border border-line bg-surface py-2 pr-2 pl-6 shadow-[0_8px_30px_rgba(17,17,17,0.07)] transition-[border-color,box-shadow] focus-within:border-ink/30 focus-within:shadow-[0_8px_30px_rgba(17,17,17,0.1)]"
        onSubmit={(e) => {
          e.preventDefault();
          const text = q.trim();
          if (!text) return;
          setQ("");
          void dispatch({ type: "ask", question: text });
        }}
      >
        <label htmlFor="hero-ask" className="sr-only">
          Ask anything about Adelia&apos;s work
        </label>
        <input
          id="hero-ask"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything about my work"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-18 outline-none placeholder:text-muted"
        />
        <button type="submit" aria-label="Ask" disabled={!q.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-bg transition-opacity disabled:opacity-30" data-cursor="Ask">
          <ArrowRightIcon width={20} height={20} className="-rotate-90" />
        </button>
      </form>
      <p className="mt-3 text-12 text-muted">Answered by Moci, my agent, using only facts from this site. If the API is down, a small offline brain answers instead.</p>
    </div>
  );
}

/** Two ways in, as quiet cards: the work, or a 40-second guided tour. */
export function HeroPaths() {
  return (
    <div className="grid w-full gap-4 text-left sm:grid-cols-2">
      <Link
        href="/work"
        className="group rounded-[20px] border border-accent/25 bg-accent/[0.04] p-5 transition-colors hover:border-accent/45 md:p-6"
        data-cursor="Open"
      >
        <span className="flex items-center justify-between gap-3 text-18 font-semibold tracking-[-0.01em]">
          See the work
          <ArrowRightIcon width={18} height={18} className="text-accent-ink transition-transform group-hover:translate-x-0.5" />
        </span>
        <span className="mt-1.5 block text-14 leading-relaxed text-muted">Three AI products, shipped end to end. Each case study reads as an article or plays out as a chat.</span>
      </Link>
      <button type="button" onClick={() => dispatch({ type: "tour" })} className="group js-only rounded-[20px] border border-line bg-surface-2 p-5 text-left transition-colors hover:border-ink/20 md:p-6" data-cursor="Tour">
        <span className="flex items-center justify-between gap-3 text-18 font-semibold tracking-[-0.01em]">
          Take the 40-second tour
          <ArrowRightIcon width={18} height={18} className="text-muted transition-transform group-hover:translate-x-0.5" />
        </span>
        <span className="mt-1.5 block text-14 leading-relaxed text-muted">Moci takes the mouse and shows you around. Move yours anytime to take the wheel back.</span>
      </button>
    </div>
  );
}
