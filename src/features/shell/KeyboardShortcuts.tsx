"use client";

import { useEffect } from "react";
import { dispatch, type SiteAction } from "@/lib/actions";
import { readJSON, writeJSON } from "@/lib/storage";
import { ui } from "@/lib/ui";
import { stopTour } from "../tour/tour-store";

const GO: Record<string, string> = { h: "/", w: "/work", l: "/lab", a: "/about", g: "/guestbook" };

const SINGLE: Record<string, SiteAction> = {
  "/": { type: "open", panel: "agent" },
  "`": { type: "open", panel: "terminal" },
  "?": { type: "open", panel: "shortcuts" },
  t: { type: "tour" },
  b: { type: "open", panel: "brief" },
  s: { type: "open", panel: "stickers" },
};

export function isEditable(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest("[role='application']") !== null;
}

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

export function KeyboardShortcuts() {
  useEffect(() => {
    ui.set({ keys: readJSON("adelia:keys", true) });
    return ui.subscribe(() => writeJSON("adelia:keys", ui.get().keys));
  }, []);

  useEffect(() => {
    let goPending = 0;
    let konami = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      // The cheat code from the terminal's .secret. Its B and A don't open anything on the way.
      if (!isEditable(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const k = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        konami = k === KONAMI[konami] ? konami + 1 : k === "ArrowUp" ? (konami === 2 ? 2 : 1) : 0;
        if (konami >= KONAMI.length - 1) {
          event.preventDefault();
          if (konami === KONAMI.length) {
            konami = 0;
            window.dispatchEvent(new Event("site:konami"));
          }
          return;
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        ui.set((s) => ({ overlay: s.overlay === "palette" ? null : "palette" }));
        return;
      }

      if (event.key === "Escape") {
        stopTour();
        if (ui.get().agentOpen && !ui.get().overlay) ui.set({ agentOpen: false });
        return;
      }

      const state = ui.get();
      if (!state.keys || state.overlay || state.touring || event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (goPending && performance.now() - goPending < 1000 && GO[key]) {
        event.preventDefault();
        goPending = 0;
        void dispatch({ type: "navigate", href: GO[key] });
        return;
      }
      goPending = 0;
      if (key === "g") {
        goPending = performance.now();
        return;
      }
      const action = SINGLE[event.key] ?? SINGLE[key];
      if (action) {
        event.preventDefault();
        void dispatch(action);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
