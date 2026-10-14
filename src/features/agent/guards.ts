import { siteMap } from "@/content/knowledge";
import { experience, identity } from "@/content/profile";
import { projects } from "@/content/projects";

/*
 * Moci's guardrails, in code: what a tool call may do, the employer check the offline brain uses,
 * and the daily budget. The server runs them on every online answer (app/api/agent/route.ts), and
 * /colophon runs the checks in guard-checks.ts against them at build time.
 */

export const PATHS: string[] = siteMap.map((s) => s.path);

/** A tool call only reaches the visitor's screen if its input passes this check. */
export function validToolInput(name: string, input: unknown): input is Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  switch (name) {
    case "navigate":
      return typeof value.path === "string" && PATHS.includes(value.path);
    case "set_sound":
      return typeof value.on === "boolean";
    case "open_panel":
      return value.panel === "brief" || value.panel === "terminal" || value.panel === "stickers";
    case "set_lens":
      return ["recruiter", "engineer", "designer", "curious"].includes(value.lens as string);
    case "start_tour":
    case "copy_email":
    case "download_cv":
      return true;
    default:
      return false; // an unknown tool never reaches the browser
  }
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Everywhere she has worked or built something, as one normalised string to search in. */
const RECORD = ` ${normalise([...experience.flatMap((e) => [e.org, e.title]), ...projects.flatMap((p) => [p.name, p.company ?? "", p.status, p.role.summary]), identity.domain].join(" "))} `;

/** "Did she work at Google?" → "Google". The organisation a question says she worked at, if any. */
export function namedEmployer(text: string): string | null {
  const m = text.match(/\b(?:work(?:ed|s|ing)?|intern(?:ed|ing)?|employed|job)\s+(?:at|for|by)\s+(?:the\s+|a\s+|an\s+)?([\w&.' -]{2,40}?)\s*(?:[?.!,]|$)/i);
  return m ? m[1].trim() : null;
}

/** Is this organisation anywhere in her experience or her projects? ("an HR startup" is; "Google" isn't.) */
export function onRecord(org: string): boolean {
  const words = normalise(org)
    .split(" ")
    .filter((w) => w.length > 1 && !GENERIC.has(w));
  return words.length > 0 && words.every((w) => RECORD.includes(` ${w} `));
}

const GENERIC = new Set(["the", "company", "inc", "ltd", "pt", "tbk", "corp", "group"]);

/**
 * A global ceiling on model calls per day, on top of the per-visitor rate limit, so a busy day
 * (or a script) can't run up the bill. Past it, everyone gets the offline brain until midnight UTC.
 */
export function dailyCap(limit: number, now = () => new Date()) {
  let day = "";
  let used = 0;
  return () => {
    const today = now().toISOString().slice(0, 10);
    if (today !== day) [day, used] = [today, 0];
    if (used >= limit) return false;
    used += 1;
    return true;
  };
}
