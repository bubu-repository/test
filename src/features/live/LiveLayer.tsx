"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { toast, useUI } from "@/lib/ui";
import { liveStore, setPoster, type Peer } from "./live-store";

type Remote = { id: string; x: number; y: number; t: number };

function sessionId() {
  try {
    let id = sessionStorage.getItem("adelia:live-id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("adelia:live-id", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const colorVar = (c: string) => `var(--${c})`;

/**
 * Presence and live cursors. Connects once per tab over SSE (/api/live). If the server can't
 * stream, it falls back to BroadcastChannel so your own tabs still see each other.
 */
export function LiveLayer() {
  const pathname = usePathname();
  const show = useUI((s) => s.liveCursors);
  const [remotes, setRemotes] = useState<Record<string, Remote>>({});
  const [peers, setPeers] = useState<Peer[]>([]);
  const idRef = useRef<string>("");
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const id = sessionId();
    idRef.current = id;
    let source: EventSource | null = null;
    let channel: BroadcastChannel | null = null;
    let failures = 0;
    let lastSent = 0;

    const onPresence = (data: { count: number; peers: Peer[] }) => {
      liveStore.set({ count: data.count, peers: data.peers });
      setPeers(data.peers);
    };
    const onMove = (data: Remote) => setRemotes((r) => ({ ...r, [data.id]: { ...data, t: Date.now() } }));
    const onLeave = (data: { id: string }) =>
      setRemotes((r) => {
        const next = { ...r };
        delete next[data.id];
        return next;
      });
    const onWave = (data: { id: string; name?: string }) => {
      sfx.success();
      toast({ title: `${data.name ?? "Someone"} waved at you`, body: "Wave back from the presence widget on the home page.", tone: "sky", icon: "👋" });
      unlock("wave");
    };

    const post = (body: Record<string, unknown>) => {
      const payload = { id, ...body };
      if (channel) channel.postMessage(payload);
      else void fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
    };
    setPoster(post);

    const startLocal = () => {
      source?.close();
      source = null;
      if (typeof BroadcastChannel === "undefined") {
        liveStore.set({ status: "off" });
        return;
      }
      channel = new BroadcastChannel("adelia-live");
      const me: Peer = { id, name: "you", color: "accent", path: pathRef.current };
      const tabs = new Map<string, Peer>([[id, me]]);
      const publish = () => onPresence({ count: tabs.size, peers: Array.from(tabs.values()) });
      channel.onmessage = (e: MessageEvent<Record<string, unknown>>) => {
        const msg = e.data;
        const from = String(msg.id);
        if (msg.type === "move") onMove({ id: from, x: Number(msg.x), y: Number(msg.y), t: Date.now() });
        else if (msg.type === "hello" || msg.type === "path") {
          tabs.set(from, { id: from, name: "another tab", color: "cobalt", path: String(msg.path ?? "/") });
          publish();
          if (msg.type === "hello") channel?.postMessage({ id, type: "path", path: pathRef.current });
        } else if (msg.type === "bye") {
          tabs.delete(from);
          onLeave({ id: from });
          publish();
        } else if (msg.type === "wave") onWave({ id: from, name: "Your other tab" });
      };
      channel.postMessage({ id, type: "hello", path: pathRef.current });
      liveStore.set({ status: "local", me });
      publish();
    };

    const connect = () => {
      source = new EventSource(`/api/live?id=${id}&path=${encodeURIComponent(pathRef.current)}`);
      source.addEventListener("hello", (e) => {
        failures = 0;
        const data = JSON.parse((e as MessageEvent).data) as { me: Peer; count: number; peers: Peer[] };
        liveStore.set({ status: "live", me: data.me });
        onPresence(data);
      });
      source.addEventListener("presence", (e) => onPresence(JSON.parse((e as MessageEvent).data)));
      source.addEventListener("move", (e) => onMove(JSON.parse((e as MessageEvent).data)));
      source.addEventListener("leave", (e) => onLeave(JSON.parse((e as MessageEvent).data)));
      source.addEventListener("wave", (e) => onWave(JSON.parse((e as MessageEvent).data)));
      source.addEventListener("note", () => liveStore.set((s) => ({ noteNonce: s.noteNonce + 1 })));
      source.onerror = () => {
        failures += 1;
        if (failures >= 3) startLocal();
      };
    };
    connect();

    const onPointer = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastSent < 120) return;
      lastSent = now;
      post({ type: "move", x: e.clientX / window.innerWidth, y: e.clientY + window.scrollY });
    };
    const bye = () => {
      if (channel) channel.postMessage({ id, type: "bye" });
      else navigator.sendBeacon?.("/api/live", new Blob([JSON.stringify({ id, type: "bye" })], { type: "application/json" }));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pagehide", bye);

    const sweep = window.setInterval(() => {
      const now = Date.now();
      setRemotes((r) => {
        const stale = Object.values(r).filter((x) => now - x.t > 12_000);
        if (!stale.length) return r;
        const next = { ...r };
        for (const s of stale) delete next[s.id];
        return next;
      });
    }, 3000);

    return () => {
      bye();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pagehide", bye);
      window.clearInterval(sweep);
      source?.close();
      channel?.close();
      setPoster(null);
    };
  }, []);

  useEffect(() => {
    if (!idRef.current) return;
    setRemotes({});
    const body = { id: idRef.current, type: "path", path: pathname };
    void fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  }, [pathname]);

  if (!show) return null;
  const onPage = new Set(peers.filter((p) => p.path === pathname).map((p) => p.id));

  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-[44] w-full">
      {Object.values(remotes)
        .filter((r) => onPage.has(r.id) || liveStore.get().status === "local")
        .map((r) => {
          const peer = peers.find((p) => p.id === r.id);
          const color = colorVar(peer?.color ?? "cobalt");
          return (
            <div
              key={r.id}
              className="absolute top-0 left-0 transition-transform duration-150 ease-out"
              style={{ transform: `translate(calc(${r.x * 100}vw - 4px), ${r.y - 4}px)` }}
            >
              <svg width="20" height="24" viewBox="0 0 34 40">
                <path d="M3 3 L3 31 L11 24 L16.5 36 L22 33.5 L16.5 22 L27 22 Z" fill={color} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
              </svg>
              <span className="type-pixel ml-4 inline-block rounded-[6px] px-1.5 py-0.5 text-on-fill shadow-[0_0_0_2px_#fff]" style={{ background: color }}>
                {peer?.name ?? "visitor"}
              </span>
            </div>
          );
        })}
    </div>
  );
}
