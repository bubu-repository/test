/**
 * Sound preference and the first-paint attributes on <html>.
 * The site is light only (docs/revamp-plan.md), so there is no theme to choose. The source of truth
 * is the set of attributes on <html>, set before first paint by `preferencesInitScript`.
 */

const SOUND_KEY = "sound";
const LOADER_KEY = "adelia:loaded";

/**
 * Runs in <head> before paint:
 * - sound: off unless the visitor turned it on
 * - daypart: dawn / day / dusk / late from the visitor's local clock
 * - opened: which of the booster packs are open; they reseal on every visit
 * - loader: the loading screen plays once per session, never for reduced motion, and never when
 *   someone lands straight on a case study (a recruiter following a link wants the case, now)
 */
export const preferencesInitScript = `(function(){var d=document.documentElement,s=null,seen=false;try{s=localStorage.getItem("${SOUND_KEY}")}catch(e){}d.setAttribute("data-sound",s==="on"?"on":"off");var h=new Date().getHours();d.setAttribute("data-daypart",h>=5&&h<8?"dawn":h>=8&&h<16?"day":h>=16&&h<19?"dusk":"late");var p="";try{p=sessionStorage.getItem("adelia:packs")||"";seen=sessionStorage.getItem("${LOADER_KEY}")==="1"}catch(e){seen=true}d.setAttribute("data-opened",location.search.indexOf("pack=fresh")<0?p:"");var calm=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;d.setAttribute("data-loader",seen||calm||location.pathname.indexOf("/work/")===0?"off":"run");})()`;

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

/* ---------- Loading screen ---------- */

/** Marks the loading screen as seen for this session and hides it. */
export function finishLoader(): void {
  try {
    window.sessionStorage.setItem(LOADER_KEY, "1");
  } catch {
    // Storage blocked: the screen may show again next page load, which is harmless.
  }
  document.documentElement.setAttribute("data-loader", "off");
}

/* ---------- Sync ---------- */

/** Re-applies stored values to <html>. Needed after React's dev-only remount clears them. */
export function applyStoredPreferences(): void {
  applySound(getStoredSound(), { persist: false });
}

export { SOUND_KEY };
