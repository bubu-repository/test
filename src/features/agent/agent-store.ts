"use client";

import { describeAction, dispatch, type SiteAction } from "@/lib/actions";
import { bump, unlock } from "@/lib/stickers";
import { createStore, useStore } from "@/lib/store";
import { think } from "./brain";

export type ToolChip = { label: string; done: boolean };

export type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: ToolChip[];
  followups: string[];
  source?: "claude" | "offline";
  /** The server's signature over an online answer, sent back with the history so it can't be forged. */
  sig?: string;
  href?: string;
  pending?: boolean;
};

type AgentState = {
  messages: AgentMessage[];
  busy: boolean;
  /** Which brain answered last: the API, or the offline fallback. */
  mode: "unknown" | "online" | "offline";
};

export const agentStore = createStore<AgentState>({ messages: [], busy: false, mode: "unknown" });

export function useAgent<S>(selector: (state: AgentState) => S): S {
  return useStore(agentStore, selector);
}

let seq = 0;
const uid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

function patchMessage(id: string, patch: Partial<AgentMessage> | ((m: AgentMessage) => Partial<AgentMessage>)) {
  agentStore.set((state) => ({
    messages: state.messages.map((m) => (m.id === id ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)),
  }));
}

/** Maps a model tool call to a site action. Unknown tools are ignored. */
export function toolToAction(name: string, input: Record<string, unknown>): SiteAction | null {
  switch (name) {
    case "navigate":
      return typeof input.path === "string" && input.path.startsWith("/") ? { type: "navigate", href: input.path } : null;
    case "open_project":
      return typeof input.slug === "string" ? { type: "navigate", href: `/work/${input.slug}` } : null;
    case "set_theme":
      return input.theme === "light" || input.theme === "dark" ? { type: "theme", value: input.theme } : null;
    case "start_tour":
      return { type: "tour" };
    case "copy_email":
      return { type: "copyEmail" };
    case "open_panel":
      return input.panel === "brief" || input.panel === "terminal" || input.panel === "stickers" ? { type: "open", panel: input.panel } : null;
    case "set_lens":
      return input.lens === "recruiter" || input.lens === "engineer" || input.lens === "designer" || input.lens === "curious" ? { type: "lens", value: input.lens } : null;
    case "download_cv":
      return { type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" };
    default:
      return null;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Streams a locally computed answer word by word so both brains feel the same. */
async function streamOffline(id: string, question: string) {
  const answer = think(question);
  const words = answer.text.split(/(\s+)/);
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  patchMessage(id, { source: "offline", href: answer.href });
  if (calm) {
    patchMessage(id, { text: answer.text });
  } else {
    let text = "";
    for (const w of words) {
      text += w;
      patchMessage(id, { text });
      await wait(w.trim() ? 14 + Math.random() * 22 : 0);
    }
  }
  for (const action of answer.actions) {
    const label = describeAction(action);
    patchMessage(id, (m) => ({ tools: [...m.tools, { label, done: false }] }));
    await wait(250);
    void dispatch(action);
    patchMessage(id, (m) => ({ tools: m.tools.map((t) => (t.label === label ? { ...t, done: true } : t)) }));
  }
  patchMessage(id, { followups: answer.followups, pending: false });
}

export type StreamEvents = {
  onText: (chunk: string) => void;
  onTool?: (action: SiteAction) => void;
  onFollowups?: (followups: string[]) => void;
  /** The server's claim check rejected the answer: show this text instead. */
  onReplace?: (text: string) => void;
  onDone?: (sig?: string) => void;
};

/**
 * Streams one answer from /api/agent (NDJSON). Throws on any failure (no key, rate limit,
 * network, empty answer) so the caller can fall back to the offline brain.
 */
export async function streamFromApi(messages: { role: "user" | "assistant"; content: string; sig?: string }[], page: string, events: StreamEvents) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, page }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`agent ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotText = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const event = JSON.parse(line) as
          | { t: "text"; v: string }
          | { t: "tool"; name: string; input: Record<string, unknown> }
          | { t: "followups"; v: string[] }
          | { t: "error"; message: string }
          | { t: "replace"; v: string }
          | { t: "done"; sig?: string };
        if (event.t === "text") {
          gotText = true;
          events.onText(event.v);
        } else if (event.t === "tool") {
          const action = toolToAction(event.name, event.input);
          if (action) events.onTool?.(action);
        } else if (event.t === "followups") {
          events.onFollowups?.(event.v);
        } else if (event.t === "replace") {
          events.onReplace?.(event.v);
        } else if (event.t === "error") {
          throw new Error(event.message);
        } else if (event.t === "done") {
          events.onDone?.(event.sig);
        }
      }
    }
    if (!gotText) throw new Error("empty answer");
  } finally {
    window.clearTimeout(timeout);
  }
}

/** The offline brain's answer, streamed word by word through a callback (or all at once when calm). */
export async function streamOfflineText(text: string, onText: (chunk: string) => void) {
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm) return onText(text);
  for (const w of text.split(/(\s+)/)) {
    onText(w);
    await wait(w.trim() ? 14 + Math.random() * 22 : 0);
  }
}

/** Ask Moci. Tries the API first; any failure falls back to the offline brain. */
export async function askAgent(question: string) {
  const q = question.trim();
  if (!q || agentStore.get().busy) return;
  unlock("curious");
  bump("questions", 9999, "curious");

  // Moci's own earlier answers go back with the server's signature; the server ignores any it didn't sign.
  const history = agentStore
    .get()
    .messages.filter((m) => !m.pending && m.text)
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.text, ...(m.role === "assistant" && m.sig ? { sig: m.sig } : {}) }));

  const userMsg: AgentMessage = { id: uid(), role: "user", text: q, tools: [], followups: [] };
  const botMsg: AgentMessage = { id: uid(), role: "assistant", text: "", tools: [], followups: [], pending: true };
  agentStore.set((state) => ({ messages: [...state.messages, userMsg, botMsg], busy: true }));

  try {
    patchMessage(botMsg.id, { source: "claude" });
    await streamFromApi([...history, { role: "user", content: q }], window.location.pathname, {
      onText: (v) => patchMessage(botMsg.id, (m) => ({ text: m.text + v })),
      onTool: (action) => {
        const label = describeAction(action);
        patchMessage(botMsg.id, (m) => ({ tools: [...m.tools, { label, done: false }] }));
        void Promise.resolve(dispatch(action)).then(() => patchMessage(botMsg.id, (m) => ({ tools: m.tools.map((t) => (t.label === label ? { ...t, done: true } : t)) })));
      },
      onFollowups: (v) => patchMessage(botMsg.id, { followups: v.slice(0, 3) }),
      onReplace: (text) => patchMessage(botMsg.id, { text }),
      onDone: (sig) => patchMessage(botMsg.id, { sig }),
    });
    agentStore.set({ mode: "online" });
    // Follow-up suggestions come from the offline brain's intent map: instant and on-topic.
    patchMessage(botMsg.id, (m) => ({ pending: false, followups: m.followups.length ? m.followups : think(q).followups }));
  } catch {
    // API unavailable (no key, rate limit, network). The offline brain answers instead.
    agentStore.set({ mode: "offline" });
    patchMessage(botMsg.id, { text: "", tools: [] });
    await streamOffline(botMsg.id, q);
  } finally {
    agentStore.set({ busy: false });
  }
}

export function resetAgent() {
  agentStore.set({ messages: [] });
}
