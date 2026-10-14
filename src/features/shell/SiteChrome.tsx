"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import { projects } from "@/content/projects";
import type { SiteAction } from "@/lib/actions";
import { flushStickers, hydrateStickers, stickerStore, unlock } from "@/lib/stickers";
import { toast, ui, useUI, type Overlay } from "@/lib/ui";
import { LiveLayer } from "../live/LiveLayer";
import { today } from "../pack/pack-store";
import { StickerLayer } from "../stickers/StickerLayer";
import { Tour } from "../tour/Tour";
import { WorldHost } from "../world/WorldHost";
import { ActionHost } from "./ActionHost";
import { CheatWhale } from "./CheatWhale";
import { CursorHint } from "./CursorHint";
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
    // Once per session, after six hours away, and never in the middle of a case study: the one
    // thing worth coming back for.
    if (!greeted) {
      const away = Date.now() - visits.last;
      if (visits.count > 0 && away > 6 * 3600_000 && !pathname.startsWith("/work/")) {
        const days = Math.round(away / 86_400_000);
        const counters = stickerStore.get().counters;
        const read = counters.cases ?? 0;
        const unread = projects.find((p) => !counters[`cases:${p.slug}`]);
        const packWaiting = readJSON<{ day?: string }>("adelia:pack", {}).day !== today();
        const hello = days > 1 ? `It's been ${days} days.` : "Good to see you again.";
        let body = hello;
        let action: { label: string; run: SiteAction } | undefined;
        if (read > 0 && unread) {
          body = `${hello} You've read ${read} of ${projects.length} case studies; next is ${unread.name}.`;
          action = { label: `Read ${unread.name}`, run: { type: "navigate", href: `/work/${unread.slug}` } };
        } else if (packWaiting) {
          body = `${hello} Today's pack is sealed and waiting in the Lab.`;
          action = { label: "Open it", run: { type: "navigate", href: "/lab#pack" } };
        }
        window.setTimeout(() => toast({ title: "Welcome back", body, tone: "sky", action }, 6000), 1500);
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

/** The overlay that just closed, kept mounted for a moment so its dialog can animate out. */
function useLeaving() {
  const [leaving, setLeaving] = useState<Overlay | null>(null);
  useEffect(() => {
    let was = ui.get().overlay;
    let timer = 0;
    const unsubscribe = ui.subscribe(() => {
      const now = ui.get().overlay;
      if (now === was) return;
      window.clearTimeout(timer);
      setLeaving(now ? null : was);
      if (!now) timer = window.setTimeout(() => setLeaving(null), 220);
      was = now;
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);
  return leaving;
}

/** Everything interactive that lives above the pages: one instance for the whole site. */
export function SiteChrome() {
  const overlay = useUI((s) => s.overlay);
  const agentOpen = useUI((s) => s.agentOpen);
  const leaving = useLeaving();
  const on = (o: Overlay) => overlay === o || leaving === o;

  return (
    <>
      <ActionHost />
      <WorldHost />
      <KeyboardShortcuts />
      <VisitTracker />
      <LiveLayer />
      <StickerLayer />
      {on("palette") && <CommandPalette />}
      {on("terminal") && <Terminal />}
      {on("brief") && <Brief />}
      {on("stickers") && <StickerBook />}
      {on("shortcuts") && <ShortcutSheet />}
      {agentOpen && <AgentPanel />}
      <CheatWhale />
      <CursorHint />
      <Toasts />
      <FloatingActions />
      <Tour />
    </>
  );
}
