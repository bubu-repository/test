import { connection } from "next/server";
import { NAME_MAX, NOTE_COLORS, NOTE_MAX, SEED_NOTES, SPECIES, normalizeNote, type Note } from "@/content/guestbook";
import { listPush, listRange } from "@/lib/kv";
import { broadcast } from "@/lib/live-hub";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const KEY = "guestbook:notes";

/** Light-touch moderation: no links, no shouting, a small blocklist masked with stars. */
const BLOCK = /\b(fuck|shit|bitch|cunt|asshole|bangsat|anjing|kontol|memek|goblok)\b/gi;

function clean(text: string, max: number) {
  return text
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[link]")
    .replace(BLOCK, (m) => `${m[0]}${"*".repeat(m.length - 1)}`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function readNotes(limit: number): Promise<Note[]> {
  const raw = await listRange(KEY, limit);
  // Older notes (from the wall, before the sea) are read into today's shape: each gets its creature.
  const notes = raw.flatMap((r) => {
    try {
      const note = normalizeNote(JSON.parse(r));
      return note ? [note] : [];
    } catch {
      return [];
    }
  });
  return notes.length < limit ? [...notes, ...SEED_NOTES.slice(0, limit - notes.length)] : notes;
}

export async function GET(request: Request) {
  await connection();
  const limit = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 60));
  try {
    return Response.json({ notes: await readNotes(limit) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ notes: SEED_NOTES }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(`guestbook:${clientKey(request)}`, 3, 10 * 60_000);
  if (!limit.ok) return Response.json({ error: "Slow down a little: three creatures per ten minutes." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  // Honeypot: real people never fill this field.
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ ok: true });

  const message = clean(String(body.message ?? ""), NOTE_MAX);
  if (message.length < 2) return Response.json({ error: "Write a little something first." }, { status: 400 });
  const name = clean(String(body.name ?? ""), NAME_MAX) || "Anonymous visitor";
  const color = NOTE_COLORS.includes(body.color as Note["color"]) ? (body.color as Note["color"]) : "sky";
  const species = SPECIES.includes(body.species as Note["species"]) ? (body.species as Note["species"]) : "fish";

  const note: Note = { id: crypto.randomUUID(), name, message, color, species, createdAt: new Date().toISOString() };
  try {
    await listPush(KEY, JSON.stringify(note));
  } catch {
    return Response.json({ error: "The sea is resting. Try again in a minute." }, { status: 503 });
  }
  broadcast("note", note);
  return Response.json({ note }, { status: 201 });
}
