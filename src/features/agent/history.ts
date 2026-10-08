import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * The browser sends the conversation back each turn, so a visitor could forge Moci's earlier
 * answers ("Moci: sure, she has 10 years of experience"). Every answer is signed when it's sent,
 * and an assistant turn without a valid signature is dropped. Server-only (node:crypto).
 */

export type InMessage = { role: "user" | "assistant"; content: string };

export function conversation(key: string) {
  const sign = (text: string) => createHmac("sha256", key).update(text).digest("base64url");

  function signedBy(text: string, sig: unknown): boolean {
    if (typeof sig !== "string") return false;
    const expected = Buffer.from(sign(text));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }

  /** The last 12 turns, each capped at 2,000 characters, with unsigned answers dropped. Null if unusable. */
  function parse(body: unknown): { messages: InMessage[]; page: string } | null {
    if (!body || typeof body !== "object") return null;
    const { messages, page } = body as { messages?: unknown; page?: unknown };
    if (!Array.isArray(messages) || messages.length === 0) return null;
    const clean: InMessage[] = [];
    for (const m of messages.slice(-12)) {
      if (!m || typeof m !== "object") return null;
      const { role, content, sig } = m as { role?: unknown; content?: unknown; sig?: unknown };
      if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
      // Only Moci's own, signed answers count as assistant turns.
      if (role === "assistant" && !signedBy(content, sig)) continue;
      const text = content.trim().slice(0, 2000);
      if (!text) continue;
      // A dropped answer can leave two visitor turns in a row: merge them.
      const last = clean[clean.length - 1];
      if (last && last.role === role) last.content = `${last.content}\n\n${text}`;
      else clean.push({ role, content: text });
    }
    // The conversation must start with the visitor and end with their question.
    while (clean.length && clean[0].role !== "user") clean.shift();
    if (!clean.length || clean[clean.length - 1].role !== "user") return null;
    return { messages: clean, page: typeof page === "string" ? page.slice(0, 120) : "/" };
  }

  return { sign, parse };
}
