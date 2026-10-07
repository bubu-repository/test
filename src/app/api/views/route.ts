import { connection } from "next/server";
import { getNumber, incr } from "@/lib/kv";

/** "N views today", the little live counter on the About profile card. One count per session. */

function todayKey() {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return `views:${day}`;
}

export async function GET() {
  await connection();
  try {
    return Response.json({ today: await getNumber(todayKey()) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ today: null });
  }
}

export async function POST() {
  try {
    return Response.json({ today: await incr(todayKey(), 60 * 60 * 48) });
  } catch {
    return Response.json({ today: null });
  }
}
