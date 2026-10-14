"use client";

import { useEffect, useLayoutEffect } from "react";
import { SOUND_KEY, applyStoredPreferences } from "@/lib/preferences";

/**
 * Keeps <html data-sound> in sync. Rendered once in the site layout.
 * - Re-applies the stored value after React's dev-only remount clears the attribute.
 * - Mirrors changes made in another tab.
 */
export function PreferencesSync() {
  useLayoutEffect(() => {
    applyStoredPreferences();
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SOUND_KEY || event.key === null) applyStoredPreferences();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
