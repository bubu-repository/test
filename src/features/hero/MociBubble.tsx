"use client";

import { useState } from "react";
import { MociAvatar } from "@/components/MociAvatar";
import { dispatch } from "@/lib/actions";
import { sfx } from "@/lib/sound";

/** Moci in a bubble on the corner of the hero device. Press it: it wobbles, plops, and opens the chat. */
export function MociBubble() {
  const [boop, setBoop] = useState(0);
  return (
    <button
      type="button"
      className="moci-sticker absolute -top-7 -right-7 hidden size-[84px] rotate-[8deg] place-items-center rounded-full sm:grid"
      aria-label="Ask Moci, Adelia's agent"
      data-cursor="Hi!"
      data-sfx="off"
      data-boop={boop % 2 ? "a" : boop ? "b" : undefined}
      onClick={() => {
        setBoop((b) => b + 1);
        sfx.plop();
        window.setTimeout(() => void dispatch({ type: "open", panel: "agent" }), 260);
      }}
    >
      <MociAvatar size={46} />
    </button>
  );
}
