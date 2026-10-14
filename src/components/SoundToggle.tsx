"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { applySound, getSound, subscribePreferences } from "@/lib/preferences";
import { sfx } from "@/lib/sound";
import { SoundOffIcon, SoundOnIcon } from "./icons";

const serverSound = () => false;

/** Sound on/off. Off by default; every sound is synthesised on demand (lib/sound.ts). */
export function SoundToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribePreferences, getSound, serverSound);

  return (
    <button
      type="button"
      aria-label="Sound effects"
      aria-pressed={on}
      onClick={() => {
        applySound(!on, { persist: true });
        if (!on) sfx.success();
      }}
      className={cn("pill js-only", className)}
      data-variant="ghost"
      data-shape="icon"
      data-size="sm"
    >
      <SoundOffIcon className="icon-when-sound-off" />
      <SoundOnIcon className="icon-when-sound-on" />
    </button>
  );
}
