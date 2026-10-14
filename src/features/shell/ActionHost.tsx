"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { identity } from "@/content/profile";
import { registerActionHandler, type SiteAction } from "@/lib/actions";
import { applySound, getSound } from "@/lib/preferences";
import { sfx } from "@/lib/sound";
import { toast, ui } from "@/lib/ui";
import { askAgent } from "../agent/agent-store";
import { startTour } from "../tour/tour-store";

/** Finds the first *visible* element for a selector (hidden Activity pages stay in the DOM). */
export function findVisible(selector: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    if (el.getClientRects().length > 0 && !el.closest("[hidden]")) return el;
  }
  return null;
}

export async function copyEmail(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(identity.email);
    sfx.success();
    toast({ title: "Email copied", body: identity.email, tone: "lime", icon: "✉️" });
    return true;
  } catch {
    toast({ title: "Couldn't copy", body: `Write to ${identity.email}`, tone: "sun", icon: "✉️" });
    return false;
  }
}

/** Executes every SiteAction (see lib/actions.ts). Mounted once in the layout. */
export function ActionHost() {
  const router = useRouter();

  useEffect(() => {
    const run = async (action: SiteAction) => {
      switch (action.type) {
        case "navigate": {
          ui.set({ overlay: null });
          const [path, hash] = action.href.split("#");
          if (path === "" || path === window.location.pathname) {
            if (hash) findVisible(`#${CSS.escape(hash)}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            if (path === "" || !hash) router.push(action.href);
          } else {
            router.push(action.href);
          }
          return;
        }
        case "open":
          sfx.whoosh();
          if (action.panel === "agent") ui.set({ agentOpen: true, overlay: null });
          else ui.set({ overlay: action.panel });
          return;
        case "close":
          ui.set({ overlay: null, agentOpen: false });
          return;
        case "sound": {
          const next = action.value ?? !getSound();
          applySound(next, { persist: true });
          if (next) sfx.success();
          toast({ title: next ? "Sound on" : "Sound off", tone: "mint", icon: next ? "🔊" : "🔇" });
          return;
        }
        case "tour":
          ui.set({ overlay: null });
          startTour();
          return;
        case "copyEmail":
          await copyEmail();
          return;
        case "download": {
          const a = document.createElement("a");
          a.href = action.href;
          if (action.filename) a.download = action.filename;
          document.body.append(a);
          a.click();
          a.remove();
          toast({ title: "Downloading", body: action.filename ?? action.href, tone: "sky", icon: "📄" });
          return;
        }
        case "lens":
          ui.set({ lens: action.value });
          return;
        case "liveCursors": {
          const next = action.value ?? !ui.get().liveCursors;
          ui.set({ liveCursors: next });
          toast({ title: next ? "Live cursors on" : "Live cursors hidden", body: next ? "Other visitors show up as little heads." : undefined, tone: "sky", icon: "🫧" });
          return;
        }
        case "ask":
          ui.set({ agentOpen: true, overlay: null });
          askAgent(action.question);
          return;
        case "toast":
          toast({ title: action.message, tone: "magenta", icon: "💡" });
          return;
        case "highlight": {
          const el = findVisible(action.target);
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.animate(
            [{ boxShadow: "0 0 0 0 var(--accent)" }, { boxShadow: "0 0 0 10px transparent" }],
            { duration: 900, iterations: 2 },
          );
          return;
        }
      }
    };
    registerActionHandler(run);
    return () => registerActionHandler(null);
  }, [router]);

  return null;
}
