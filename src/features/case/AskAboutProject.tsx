"use client";

import { ChatIcon } from "@/components/icons";
import { dispatch } from "@/lib/actions";

export function AskAboutProject({ name }: { name: string }) {
  return (
    <button
      type="button"
      className="pill js-only"
      data-variant="magenta"
      data-magnetic="0.2"
      onClick={() => dispatch({ type: "ask", question: `What was the hardest part of ${name}?` })}
    >
      <ChatIcon width={18} height={18} /> Ask Moci about {name}
    </button>
  );
}
