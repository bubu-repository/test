"use client";

import { useEffect, useState } from "react";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { toast } from "@/lib/ui";
import { Creature } from "../guestbook/Creature";

/**
 * The cheat code from the terminal's .secret (↑ ↑ ↓ ↓ ← → ← → B A, see KeyboardShortcuts): a little
 * whale swims across the bottom of the screen, blowing bubbles into the world, and the secret
 * sticker is yours.
 */
export function CheatWhale() {
  const [run, setRun] = useState(0);

  useEffect(() => {
    const onCode = () => {
      const isNew = unlock("konami", { silent: true });
      sfx.success();
      toast({ title: "Cheat code accepted", body: isNew ? "The sea sent a whale to say hi, and the secret sticker is yours." : "The sea sent a whale to say hi.", tone: "sky", sticker: "konami" }, 5200);
      setRun((n) => n + 1);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      for (let i = 0; i < 5; i++) {
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("world:bubbles", { detail: { x: window.innerWidth * (0.15 + i * 0.17), y: window.innerHeight * 0.92 } }));
        }, 600 + i * 700);
      }
    };
    window.addEventListener("site:konami", onCode);
    return () => window.removeEventListener("site:konami", onCode);
  }, []);

  useEffect(() => {
    if (!run) return;
    const t = window.setTimeout(() => setRun(0), 7000);
    return () => window.clearTimeout(t);
  }, [run]);

  if (!run) return null;
  return (
    <div key={run} className="cheat-whale" aria-hidden="true">
      <Creature species="whale" color="sky" seed={0} className="cheat-whale__body" />
    </div>
  );
}
