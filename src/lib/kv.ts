import "server-only";

/**
 * Tiny key-value layer.
 * - With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or Vercel KV's KV_REST_API_URL +
 *   KV_REST_API_TOKEN) it uses Redis over REST: persistent and shared by every instance.
 * - Without them it keeps data in memory: fine for local dev and single-process hosting,
 *   reset on restart.
 */

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const kvMode: "redis" | "memory" = url && token ? "redis" : "memory";

type Memory = { lists: Map<string, string[]>; counters: Map<string, number> };
const g = globalThis as unknown as { __adeliaKv?: Memory };
const memory: Memory = (g.__adeliaKv ??= { lists: new Map(), counters: new Map() });

async function redis<T>(command: (string | number)[]): Promise<T> {
  const res = await fetch(url!, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  const data = (await res.json()) as { result: T; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result;
}

/** Prepends to a capped list. */
export async function listPush(key: string, value: string, cap = 500): Promise<void> {
  if (kvMode === "redis") {
    await redis(["LPUSH", key, value]);
    await redis(["LTRIM", key, 0, cap - 1]);
    return;
  }
  const list = memory.lists.get(key) ?? [];
  list.unshift(value);
  memory.lists.set(key, list.slice(0, cap));
}

export async function listRange(key: string, count: number): Promise<string[]> {
  if (kvMode === "redis") return (await redis<string[]>(["LRANGE", key, 0, count - 1])) ?? [];
  return (memory.lists.get(key) ?? []).slice(0, count);
}

export async function incr(key: string, ttlSeconds?: number): Promise<number> {
  if (kvMode === "redis") {
    const value = await redis<number>(["INCR", key]);
    if (ttlSeconds && value === 1) await redis(["EXPIRE", key, ttlSeconds]);
    return value;
  }
  const value = (memory.counters.get(key) ?? 0) + 1;
  memory.counters.set(key, value);
  return value;
}

export async function getNumber(key: string): Promise<number> {
  if (kvMode === "redis") return Number((await redis<string | null>(["GET", key])) ?? 0);
  return memory.counters.get(key) ?? 0;
}
