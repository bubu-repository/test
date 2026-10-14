"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import { flushStickers, hydrateStickers, unlock } from "@/lib/stickers";
import { toast, ui, useUI } from "@/lib/ui";
import { LiveLayer } from "../live/LiveLayer";
import { StickerLayer } from "../stickers/StickerLayer";
import { Tour } from "../tour/Tour";
import { WorldHost } from "../world/WorldHost";
import { ActionHost } from "./ActionHost";
import { CheatWhale } from "./CheatWhale";
import { FloatingActions } from "./FloatingActions";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Toasts } from "./Toasts";

// Overlays are split out and prefetched when the browser is idle.
const loadPalette = () => import("../palette/CommandPalette").then((m) => m.CommandPalette);
const loadTerminal = () => import("../terminal/Terminal").then((m) => m.Terminal);
const loadAgent = () => import("../agent/AgentPanel").then((m) => m.AgentPanel);
const loadBrief = () => import("../brief/Brief").then((m) => m.Brief);
const loadStickers = () => import("../stickers/StickerBook").then((m) => m.StickerBook);
const loadShortcuts = () => import("./ShortcutSheet").then((m) => m.ShortcutSheet);

const CommandPalette = dynamic(loadPalette, { ssr: false });
const Terminal = dynamic(loadTerminal, { ssr: false });
const AgentPanel = dynamic(loadAgent, { ssr: false });
const Brief = dynamic(loadBrief, { ssr: false });
const StickerBook = dynamic(loadStickers, { ssr: false });
const ShortcutSheet = dynamic(loadShortcuts, { ssr: false });

type Visits = { count: number; last: number; lastPath: string };

function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    hydrateStickers();
    const visits = readJSON<Visits>("adelia:visits", { count: 0, last: 0, lastPath: "/" });
    let greeted = false;
    try {
      greeted = sessionStorage.getItem("adelia:greeted") === "1";
      sessionStorage.setItem("adelia:greeted", "1");
    } catch {
      greeted = true;
    }
    if (!greeted) {
      const away = Date.now() - visits.last;
      if (visits.count > 0 && away > 6 * 3600_000) {
        const days = Math.round(away / 86_400_000);
        const where = visits.lastPath.startsWith("/work/") ? visits.lastPath.split("/")[2] : null;
        window.setTimeout(
          () =>
            toast(
              {
                title: "Welcome back",
                body: `${days > 1 ? `It's been ${days} days.` : "Good to see you again."}${where ? ` Last time you were reading ${where[0].toUpperCase()}${where.slice(1)}.` : ""}`,
                tone: "sky",
                icon: "👋",
              },
              6000,
            ),
          1500,
        );
      }
      writeJSON("adelia:visits", { count: visits.count + 1, last: Date.now(), lastPath: pathname });
    }

    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => {
      void loadPalette();
      void loadAgent();
      void loadBrief();
      void loadTerminal();
      void loadStickers();
      void loadShortcuts();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const visits = readJSON<Visits>("adelia:visits", { count: 1, last: Date.now(), lastPath: pathname });
    writeJSON("adelia:visits", { ...visits, last: Date.now(), lastPath: pathname });
    if (pathname === "/") unlock("hello", { silent: true });
    // Stickers earned while reading are announced when the visitor leaves the case study.
    const t = window.setTimeout(flushStickers, 1200);
    return () => window.clearTimeout(t);
  }, [pathname]);

  // …or when they close the panel they earned it in.
  useEffect(() => {
    let was = ui.get().overlay;
    return ui.subscribe(() => {
      const now = ui.get().overlay;
      if (was && !now) window.setTimeout(flushStickers, 400);
      was = now;
    });
  }, []);

  return null;
}

/** Everything interactive that lives above the pages: one instance for the whole site. */
export function SiteChrome() {
  const overlay = useUI((s) => s.overlay);
  const agentOpen = useUI((s) => s.agentOpen);

  return (
    <>
      <ActionHost />
      <WorldHost />
      <KeyboardShortcuts />
      <VisitTracker />
      <LiveLayer />
      <StickerLayer />
      {overlay === "palette" && <CommandPalette />}
      {overlay === "terminal" && <Terminal />}
      {overlay === "brief" && <Brief />}
      {overlay === "stickers" && <StickerBook />}
      {overlay === "shortcuts" && <ShortcutSheet />}
      {agentOpen && <AgentPanel />}
      <CheatWhale />
      <Toasts />
      <FloatingActions />
      <Tour />
    </>
  );
}
