"use client";

import { SiteAvatar } from "@/components/SiteAvatar";
import { dispatch } from "@/lib/actions";
import { useUI } from "@/lib/ui";

/**
 * Bottom right on every page: the agent, and a question mark for anyone who isn't sure what to do
 * here (it starts the guided walk). Hidden while the agent's panel is open.
 */
export function FloatingActions() {
  const agentOpen = useUI((s) => s.agentOpen);
  if (agentOpen) return null;
  return (
    <div className="float-actions js-only">
      <button type="button" className="float-button float-button--help" data-tour="help" aria-label="How this site works" onClick={() => void dispatch({ type: "tour" })}>
        ?
      </button>
      <button type="button" className="float-button" data-tour="agent" aria-label="Ask Moci, her AI agent" onClick={() => void dispatch({ type: "open", panel: "agent" })}>
        <SiteAvatar size={44} />
      </button>
    </div>
  );
}
