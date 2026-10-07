"use client";

import { dispatch } from "@/lib/actions";
import { getTheme } from "@/lib/preferences";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { ui } from "@/lib/ui";
import { agentStore } from "../agent/agent-store";
import { paletteStore, submitPalette } from "../palette/palette-store";
import { findVisible } from "../shell/ActionHost";
import { TourAborted, tourStore } from "./tour-store";

/** Ghost cursor state, read every frame by the Tour component. */
export const ghost = { x: -100, y: -100, tx: -100, ty: -100, visible: false, pressed: false, teleport: false };

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new TourAborted());
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new TourAborted());
      },
      { once: true },
    );
  });
}

async function until(test: () => boolean, signal: AbortSignal, timeout = 6000) {
  const start = performance.now();
  while (!test()) {
    if (performance.now() - start > timeout) return false;
    await sleep(60, signal);
  }
  return true;
}

async function waitFor(selector: string, signal: AbortSignal, timeout = 6000) {
  let el: HTMLElement | null = null;
  await until(() => (el = findVisible(selector)) !== null, signal, timeout);
  return el as HTMLElement | null;
}

let stepCount = 0;
async function say(text: string, signal: AbortSignal, hold = 0) {
  stepCount += 1;
  tourStore.set({ caption: text, step: stepCount });
  if (hold) await sleep(hold, signal);
}

async function glideTo(x: number, y: number, signal: AbortSignal) {
  ghost.tx = x;
  ghost.ty = y;
  ghost.teleport = calm();
  await until(() => Math.hypot(ghost.x - x, ghost.y - y) < 3, signal, 1600);
}

async function moveTo(el: HTMLElement, signal: AbortSignal, where: "center" | "left" = "center") {
  let rect = el.getBoundingClientRect();
  const margin = 120;
  if (rect.top < margin || rect.bottom > window.innerHeight - margin) {
    el.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "center" });
    await sleep(calm() ? 50 : 650, signal);
    rect = el.getBoundingClientRect();
  }
  const x = where === "left" ? rect.left + Math.min(28, rect.width / 2) : rect.left + rect.width / 2;
  await glideTo(x, rect.top + rect.height / 2, signal);
}

async function press(el: HTMLElement, signal: AbortSignal) {
  ghost.pressed = true;
  sfx.pop();
  await sleep(140, signal);
  el.click();
  ghost.pressed = false;
  await sleep(160, signal);
}

async function goto(href: string, signal: AbortSignal) {
  if (window.location.pathname === href) return;
  void dispatch({ type: "navigate", href });
  await until(() => window.location.pathname === href, signal, 8000);
  window.scrollTo({ top: 0 });
  await sleep(500, signal);
}

async function scrollPage(by: number, signal: AbortSignal, ms = 1200) {
  window.scrollBy({ top: by, behavior: calm() ? "auto" : "smooth" });
  await sleep(calm() ? 100 : ms, signal);
}

/** The 40-second tour. Every step checks the signal, so any visitor input stops it cleanly. */
export async function runTour(signal: AbortSignal) {
  stepCount = 0;
  tourStore.set({ total: 12 });
  const startTheme = getTheme();

  ghost.x = window.innerWidth - 80;
  ghost.y = window.innerHeight - 80;
  ghost.tx = ghost.x;
  ghost.ty = ghost.y;
  ghost.visible = true;
  ui.set({ agentOpen: false, overlay: null });

  try {
    await say("Hi! I'm Moci. I'll drive for about 40 seconds. Move your mouse or press any key to take the wheel.", signal, 1700);

    // 1. Home: who she is
    await goto("/", signal);
    window.scrollTo({ top: 0, behavior: calm() ? "auto" : "smooth" });
    const name = await waitFor('[data-tour="name"]', signal);
    if (name) {
      await moveTo(name, signal, "left");
      await say("This is Adelia Tiara, an AI product engineer and 2026 graduate, in Bekasi, Indonesia.", signal, 1700);
    }

    // 2. The headline is sampled
    const token = await waitFor('[data-tour="token"]', signal, 2000);
    if (token) {
      await moveTo(token, signal);
      await say("Even the headline is a model output. Watch me resample a word.", signal, 900);
      await press(token, signal);
      await sleep(700, signal);
      const option = findVisible('[data-tour="token-option"]');
      if (option) {
        await moveTo(option, signal);
        await press(option, signal);
      }
      await sleep(600, signal);
    }

    // 3. The work, right under the hero
    const work = await waitFor('[data-tour="work-card"]', signal, 2000);
    if (work) {
      await moveTo(work, signal);
      await say("Her work: three AI products, each with the real screens, the decisions and the numbers.", signal, 1600);
      await press(work, signal);
    }
    await goto("/work/tenderlens", signal);

    // 6. Case study as a conversation
    const chat = await waitFor('[data-tour="case-chat"]', signal, 2000);
    if (chat) {
      await moveTo(chat, signal);
      await say("Every case study can be read as an article, or told as a chat. Let's chat.", signal, 400);
      await press(chat, signal);
      await sleep(1600, signal);
    } else {
      await scrollPage(window.innerHeight * 0.9, signal, 1300);
    }

    // 7. Night sky
    const theme = findVisible('[data-tour="theme"]');
    if (theme) {
      await moveTo(theme, signal);
      await say("Night sky, for the night owls.", signal, 300);
      await press(theme, signal);
      await sleep(700, signal);
    }

    // 8. ⌘K palette → Lab
    await say("⌘K opens a palette for everything. Let me type.", signal, 300);
    void dispatch({ type: "open", panel: "palette" });
    await sleep(450, signal);
    for (const ch of "lab") {
      paletteStore.set((s) => ({ query: s.query + ch, active: 0 }));
      sfx.key();
      await sleep(calm() ? 30 : 190, signal);
    }
    await sleep(500, signal);
    submitPalette();
    await until(() => window.location.pathname === "/lab", signal, 6000);
    await sleep(500, signal);

    // 9. Gumball machine
    const gacha = await waitFor('[data-tour="gacha"]', signal, 3000);
    if (gacha) {
      await moveTo(gacha, signal);
      await say("Can't choose an experiment? The gumball machine picks for you.", signal, 400);
      await press(gacha, signal);
      await sleep(1300, signal);
    }

    // 10. Ask me
    await say("You can ask me anything about her work.", signal, 300);
    void dispatch({ type: "ask", question: "What's her strongest project?" });
    await sleep(600, signal);
    await until(() => !agentStore.get().busy, signal, 15000);
    await sleep(1300, signal);

    // 11. Contact
    ui.set({ agentOpen: false });
    if (getTheme() !== startTheme) void dispatch({ type: "theme", value: startTheme });
    const email = await waitFor('[data-tour="email"]', signal, 2000);
    if (email) {
      await moveTo(email, signal);
      await press(email, signal);
      await say("Her email is on your clipboard now. Your move!", signal, 1700);
    } else {
      await say("That's the tour. Your move!", signal, 2000);
    }
    unlock("passenger");
  } finally {
    ghost.visible = false;
  }
}
