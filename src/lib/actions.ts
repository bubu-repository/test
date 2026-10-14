import type { Lens, Overlay } from "./ui";

/**
 * Every interactive surface speaks the same small language: the ⌘K palette, the terminal,
 * the agent's tool calls, the autopilot tour and the Lab's "try it" buttons all dispatch
 * these actions. One handler (ActionHost, mounted in the layout) executes them.
 */
export type SiteAction =
  | { type: "navigate"; href: string }
  | { type: "open"; panel: Overlay | "agent" }
  | { type: "close" }
  | { type: "sound"; value?: boolean }
  | { type: "tour" }
  | { type: "copyEmail" }
  | { type: "download"; href: string; filename?: string }
  | { type: "lens"; value: Lens | null }
  | { type: "liveCursors"; value?: boolean }
  | { type: "ask"; question: string }
  | { type: "toast"; message: string }
  | { type: "highlight"; target: string };

type Handler = (action: SiteAction) => void | Promise<void>;

let handler: Handler | null = null;
const queue: SiteAction[] = [];

export function registerActionHandler(next: Handler | null) {
  handler = next;
  if (handler) {
    while (queue.length) void handler(queue.shift()!);
  }
}

export function dispatch(action: SiteAction) {
  if (handler) return handler(action);
  queue.push(action);
}

/** Human-readable label, used in agent tool-call chips and the terminal. */
export function describeAction(action: SiteAction): string {
  switch (action.type) {
    case "navigate":
      return `navigate("${action.href}")`;
    case "open":
      return `open("${action.panel}")`;
    case "close":
      return "close()";
    case "sound":
      return `sound(${action.value ?? "toggle"})`;
    case "tour":
      return "start_tour()";
    case "copyEmail":
      return "copy_email()";
    case "download":
      return `download("${action.href}")`;
    case "lens":
      return `set_lens("${action.value ?? "none"}")`;
    case "liveCursors":
      return `live_cursors(${action.value ?? "toggle"})`;
    case "ask":
      return `ask("${action.question}")`;
    case "toast":
      return "toast()";
    case "highlight":
      return `highlight("${action.target}")`;
  }
}
