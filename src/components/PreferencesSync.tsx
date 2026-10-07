"use client";

import { useEffect, useLayoutEffect } from "react";
import {
  SOUND_KEY,
  SYSTEM_DARK,
  THEME_KEY,
  applyStoredPreferences,
  applyTheme,
  getStoredTheme,
} from "@/lib/preferences";

/**
 * Keeps <html data-theme / data-sound> in sync. Rendered once in the site layout.
 * - Re-applies stored values after React's dev-only remount clears the attributes.
 * - Follows the OS theme until the visitor makes an explicit choice.
 * - Mirrors changes made in another tab.
 */
export function PreferencesSync() {
  useLayoutEffect(() => {
    applyStoredPreferences();
  }, []);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK);
    const onSystemChange = () => {
      if (getStoredTheme() === null) applyTheme(media.matches ? "dark" : "light", { persist: false });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === SOUND_KEY || event.key === null) applyStoredPreferences();
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
