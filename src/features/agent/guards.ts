import { siteMap } from "@/content/knowledge";
import { experience, identity } from "@/content/profile";
import { projects } from "@/content/projects";

/*
 * Moci's guardrails, in code: what a tool call may do, and what an answer may claim. The server
 * runs them on every online answer (app/api/agent/route.ts), the offline brain uses the same
 * employer check, and /colophon runs the checks below against them at build time.
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

const NEGATED = /\b(not|no|never|isn't|wasn't|hasn't|doesn't|didn't|nor|without)\b|n't\b/i;

/** "Did she work at Google?" → "Google". The organisation a sentence says she worked at, if any. */
export function namedEmployer(text: string, { capitalised = false } = {}): string | null {
  const pattern = capitalised
    ? /\b(?:work(?:ed|s|ing)?|intern(?:ed|ing)?|employed|job|engineer|developer|designer|scientist)\s+(?:at|for|by)\s+((?:[A-Z][\w&.'-]*\s?){1,3})/
    : /\b(?:work(?:ed|s|ing)?|intern(?:ed|ing)?|employed|job)\s+(?:at|for|by)\s+(?:the\s+|a\s+|an\s+)?([\w&.' -]{2,40}?)\s*(?:[?.!,]|$)/i;
  const m = text.match(pattern);
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

const SENIOR = /\b(senior|staff|principal|lead|seasoned|veteran)\s+(\w+\s+)?(engineer|developer|designer|scientist)\b/i;
const YEARS = /\b(\d+|two|three|four|five|six|seven|eight|nine|ten|many)\+?\s+years?\s+(of|at|in|as)\b/i;
const EXTERNAL_LINK = /\bhttps?:\/\/(?!(www\.)?adelia\.cc\b)\S+/i;

/**
 * Clauses, not sentences: a denial only covers its own clause, so "She isn't junior; she's a senior
 * engineer" is two claims, and the second one is checked on its own.
 */
const clauses = (text: string) => text.split(/(?<=[.!?;:])\s+|\s*[,—–]\s+(?=(?:but|yet|and|so|she|she's|her|in fact)\b)|\s+(?:but|yet)\s+/i);

/** Figures worth checking: percentages, decimals, and whole numbers of 10 or more that aren't years. */
const FIGURE = /\d+(?:[.,]\d+)*/g;
const figures = (text: string) =>
  (text.match(FIGURE) ?? []).map((n) => n.replace(/,(?=\d{3}\b)/g, "")).filter((n) => n.includes(".") || (Number(n) >= 10 && !(Number(n) >= 1990 && Number(n) <= 2035)));

/**
 * What's wrong with an answer before it reaches a visitor: calling her senior, giving her years she
 * doesn't have, naming an employer that isn't on record, linking off the site, or (when the
 * knowledge base is given) quoting a figure that isn't in it. A clause that denies the claim ("she
 * isn't senior") is fine. An empty list means it can go out. It catches the patterns it knows; it
 * can't prove an answer true.
 */
export function claimProblems(answer: string, knowledge?: string): string[] {
  const problems: string[] = [];
  for (const clause of clauses(answer)) {
    const denied = NEGATED.test(clause);
    if (SENIOR.test(clause) && !denied) problems.push("calls_her_senior");
    if (YEARS.test(clause) && !denied) problems.push("years_of_experience");
    const org = namedEmployer(clause, { capitalised: true });
    if (org && !denied && !onRecord(org)) problems.push(`employer_not_on_record:${org}`);
  }
  if (EXTERNAL_LINK.test(answer)) problems.push("external_link");
  if (knowledge) {
    const known = new Set(figures(knowledge));
    for (const n of figures(answer)) if (!known.has(n)) problems.push(`figure_not_on_record:${n}`);
  }
  return [...new Set(problems)];
}

/** What a visitor sees instead of an answer that failed the claim check. */
export const SAFE_ANSWER = `I started to say something I can't back up, so I've stopped. On record: she's a fresh graduate (class of 2026) with a six-month internship and a part-time contract. Ask me about her projects, or email ${identity.email}.`;

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
