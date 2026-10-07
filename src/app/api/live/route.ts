import { broadcast, join, leave, peerInfo, setPath, snapshot, touch } from "@/lib/live-hub";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * GET  /api/live?id=…&path=/   → Server-Sent Events stream: presence, move, wave, leave, note
 * POST /api/live {id, type, …}  → move | path | wave | bye
 */

const ID = /^[a-z0-9-]{8,40}$/i;

function cleanPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") ? value.slice(0, 120) : "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  if (!ID.test(id)) return new Response("bad id", { status: 400 });
  const path = cleanPath(url.searchParams.get("path"));
  const encoder = new TextEncoder();

  let send: ((event: string, data: unknown) => void) | null = null;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      send = (event, data) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const me = join(id, path, send);
      const peers = snapshot();
      send("hello", { me, count: peers.length, peers });
      keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
          touch(id);
        } catch {
          clearInterval(keepAlive);
        }
      }, 20_000);
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        if (send) leave(id, send);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      clearInterval(keepAlive);
      if (send) leave(id, send);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!ID.test(id)) return new Response(null, { status: 400 });
  const peer = touch(id);
  if (!peer) return new Response(null, { status: 404 });

  switch (body.type) {
    case "move": {
      if (!rateLimit(`move:${id}`, 40, 5_000).ok) return new Response(null, { status: 429 });
      const x = Number(body.x);
      const y = Number(body.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return new Response(null, { status: 400 });
      broadcast("move", { id, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(100_000, y)) }, id, peer.path);
      break;
    }
    case "path":
      setPath(id, cleanPath(body.path));
      break;
    case "wave": {
      if (!rateLimit(`wave:${clientKey(request)}`, 6, 30_000).ok) return new Response(null, { status: 429 });
      const info = peerInfo(id);
      broadcast("wave", { id, name: info?.name, color: info?.color, x: Number(body.x) || 0.5, y: Number(body.y) || 0 }, id);
      break;
    }
    case "bye":
      leave(id);
      break;
    default:
      return new Response(null, { status: 400 });
  }
  return new Response(null, { status: 204 });
}
