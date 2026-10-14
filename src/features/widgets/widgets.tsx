"use client";

import { useState, type ReactNode } from "react";
import { SendIcon } from "@/components/icons";
import { MociAvatar } from "@/components/MociAvatar";
import { dispatch } from "@/lib/actions";
import { OverlapRing } from "./OverlapRing";

export function WidgetTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-14 leading-snug font-semibold text-muted">{children}</h3>
      {aside}
    </div>
  );
}

/* ---------- Overlap ---------- */
export function OverlapWidget() {
  return (
    <div data-tour="overlap">
      <WidgetTitle>Our working hours</WidgetTitle>
      <div className="mt-3">
        <OverlapRing />
      </div>
    </div>
  );
}

/* ---------- Ask Moci ---------- */
export function AskWidget() {
  const [q, setQ] = useState("");
  const ask = (text: string) => text.trim() && dispatch({ type: "ask", question: text.trim() });
  return (
    <>
      <div className="flex items-start gap-3">
        <MociAvatar size={44} />
        <div className="rounded-[6px_20px_20px_20px] bg-surface-2 px-4 py-2.5 text-16">Ask me anything about Adelia&apos;s work. I can also open pages for you.</div>
      </div>
      <form
        className="mt-4 flex items-center gap-2 rounded-pill border border-line bg-surface-2 py-1 pr-1 pl-4 focus-within:border-accent"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
          setQ("");
        }}
      >
        <label className="sr-only" htmlFor="ask-widget">
          Your question for Moci
        </label>
        <input id="ask-widget" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Is she open to work?" className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-muted" />
        <button type="submit" className="pill" data-variant="magenta" data-shape="icon" data-size="sm" aria-label="Ask">
          <SendIcon width={16} height={16} />
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {["Strongest project?", "What's her stack?", "Show me Catat"].map((s, i) => (
          <button key={s} type="button" onClick={() => ask(s)} className="pill" data-variant={i === 0 ? "sun" : undefined} data-size="sm">
            {s}
          </button>
        ))}
      </div>
    </>
  );
}
