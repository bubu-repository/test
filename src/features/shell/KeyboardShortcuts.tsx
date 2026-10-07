"use client";

import { useEffect } from "react";
import { dispatch, type SiteAction } from "@/lib/actions";
import { readJSON, writeJSON } from "@/lib/storage";
import { ui } from "@/lib/ui";
import { stopTour } from "../tour/tour-store";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

const GO: Record<string, string> = { h: "/", w: "/work", l: "/lab", a: "/about", g: "/guestbook", p: "/play" };

const SINGLE: Record<string, SiteAction> = {
  "/": { type: "open", panel: "agent" },
  "`": { type: "open", panel: "terminal" },
  "?": { type: "open", panel: "shortcuts" },
  t: { type: "tour" },
  b: { type: "open", panel: "brief" },
  s: { type: "open", panel: "stickers" },
  d: { type: "theme" },
  x: { type: "xray" },
};

export function isEditable(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest("[role='application']") !== null;
}

export function KeyboardShortcuts() {
  useEffect(() => {
    ui.set({ keys: readJSON("adelia:keys", true) });
    return ui.subscribe(() => writeJSON("adelia:keys", ui.get().keys));
  }, []);

  useEffect(() => {
    let konami = 0;
    let goPending = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      // Konami works everywhere except while typing.
      if (!isEditable(event.target)) {
        const expected = KONAMI[konami];
        konami = event.key.toLowerCase() === expected.toLowerCase() ? konami + 1 : event.key === KONAMI[0] ? 1 : 0;
        if (konami === KONAMI.length) {
          konami = 0;
          void dispatch({ type: "rave" });
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
