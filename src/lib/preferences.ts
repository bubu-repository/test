/**
 * Theme, sound and cursor preferences.
 * The source of truth is the set of attributes on <html> (data-theme, data-sound, data-cursor,
 * data-daypart), set before first paint by `preferencesInitScript`. Explicit choices are stored.
 */

export type Theme = "light" | "dark";

const THEME_KEY = "theme";
const SOUND_KEY = "sound";
const CURSOR_KEY = "cursor";
const SYSTEM_DARK = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before paint:
 * - theme: stored choice, else the OS preference
 * - sound: off unless the visitor turned it on
 * - cursor: the custom cursor is on for fine pointers unless turned off or motion is reduced
 * - daypart: dawn / day / dusk / late from the visitor's local clock (tints the day sky)
 * - pack: the /work booster pack stays sealed until the visitor opens it once
 */
export const preferencesInitScript = `(function(){var d=document.documentElement,t=null,s=null,c=null;try{t=localStorage.getItem("${THEME_KEY}");s=localStorage.getItem("${SOUND_KEY}");c=localStorage.getItem("${CURSOR_KEY}")}catch(e){}if(t!=="light"&&t!=="dark")t=window.matchMedia&&matchMedia("${SYSTEM_DARK}").matches?"dark":"light";d.setAttribute("data-theme",t);d.setAttribute("data-sound",s==="on"?"on":"off");var fine=window.matchMedia&&matchMedia("(pointer: fine)").matches,calm=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;d.setAttribute("data-cursor",c==="off"||!fine||calm&&c!=="on"?"off":"on");var h=new Date().getHours();d.setAttribute("data-daypart",h>=5&&h<8?"dawn":h>=8&&h<16?"day":h>=16&&h<19?"dusk":"late");var p=null;try{p=localStorage.getItem("adelia:pack")}catch(e){}d.setAttribute("data-pack",p==="open"&&location.search.indexOf("pack=fresh")<0?"open":"sealed")})()`;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode, policy). The choice still applies for this page view.
  }
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ---------- Theme ---------- */

export function getStoredTheme(): Theme | null {
  const value = readStorage(THEME_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function getSystemTheme(): Theme {
  return window.matchMedia(SYSTEM_DARK).matches ? "dark" : "light";
}

export function getTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme, { persist }: { persist: boolean }): void {
  const root = document.documentElement;
  const swap = () => {
    root.setAttribute("data-theme", theme);
    if (persist) writeStorage(THEME_KEY, theme);
    emit();
  };
  // A circular reveal from the toggle when the browser supports view transitions.
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (persist && doc.startViewTransition && !calm && root.getAttribute("data-theme") !== theme) {
    root.setAttribute("data-theme-swap", "");
    const transition = doc.startViewTransition(swap) as { finished?: Promise<void> };
    transition.finished?.finally(() => root.removeAttribute("data-theme-swap"));
  } else {
    swap();
  }
}

/* ---------- Sound (default off) ---------- */

export function getStoredSound(): boolean {
  return readStorage(SOUND_KEY) === "on";
}

export function getSound(): boolean {
  return document.documentElement.getAttribute("data-sound") === "on";
}

export function applySound(on: boolean, { persist }: { persist: boolean }): void {
  document.documentElement.setAttribute("data-sound", on ? "on" : "off");
  if (persist) writeStorage(SOUND_KEY, on ? "on" : "off");
  emit();
}

/* ---------- Custom cursor ---------- */

export function getCursor(): boolean {
  return document.documentElement.getAttribute("data-cursor") === "on";
}

export function applyCursor(on: boolean, { persist }: { persist: boolean }): void {
  document.documentElement.setAttribute("data-cursor", on ? "on" : "off");
  if (persist) writeStorage(CURSOR_KEY, on ? "on" : "off");
  emit();
}

/* ---------- Sync ---------- */

/** Re-applies stored values to <html>. Needed after React's dev-only remount clears them. */
export function applyStoredPreferences(): void {
  applyTheme(getStoredTheme() ?? getSystemTheme(), { persist: false });
  applySound(getStoredSound(), { persist: false });
}

export { THEME_KEY, SOUND_KEY, CURSOR_KEY, SYSTEM_DARK };
