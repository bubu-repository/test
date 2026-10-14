"use client";

import { useEffect, useRef } from "react";
import { SiteAvatar } from "@/components/SiteAvatar";
import { dispatch } from "@/lib/actions";
import { useUI } from "@/lib/ui";

/**
 * Bottom right on every page: the agent, and a question mark for anyone who isn't sure what to do
 * here (it starts the guided walk). Hidden while the agent's panel is open. On phones the question
 * mark stays in More (it would sit on the content), and both slide away while you scroll down, the
 * way the dock does, and come back when you scroll up or reach the end of the page.
 */
export function FloatingActions() {
  const agentOpen = useUI((s) => s.agentOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const y = window.scrollY;
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 80;
      if (y > last + 6 && y > 120 && !atEnd) el.dataset.hidden = "";
      else if (y < last - 6 || atEnd) delete el.dataset.hidden;
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (agentOpen) return null;
  return (
    <div ref={ref} className="float-actions js-only">
      <button type="button" className="float-button float-button--help" data-tour="help" aria-label="How this site works" onClick={() => void dispatch({ type: "tour" })}>
        ?
      </button>
      <button type="button" className="float-button" data-tour="agent" aria-label="Ask Moci, her AI agent" onClick={() => void dispatch({ type: "open", panel: "agent" })}>
        <SiteAvatar size={44} />
      </button>
    </div>
  );
}
