"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { applyTheme, getTheme, subscribePreferences, type Theme } from "@/lib/preferences";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { MoonIcon, SunIcon } from "./icons";

const serverTheme = (): Theme => "light";

/** Switches between the day sky and the night sky. The new theme grows out of the button. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribePreferences, getTheme, serverTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label="Night sky"
      aria-pressed={isDark}
      data-tour="theme"
      data-cursor={isDark ? "Day" : "Night"}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const root = document.documentElement;
        root.style.setProperty("--swap-x", `${rect.left + rect.width / 2}px`);
        root.style.setProperty("--swap-y", `${rect.top + rect.height / 2}px`);
        sfx.pop();
        applyTheme(isDark ? "light" : "dark", { persist: true });
        if (!isDark) unlock("night");
      }}
      className={cn("pill js-only", className)}
      data-variant="ghost"
      data-shape="icon"
      data-size="sm"
    >
      <SunIcon className="icon-when-light" />
      <MoonIcon className="icon-when-dark" />
    </button>
  );
}
