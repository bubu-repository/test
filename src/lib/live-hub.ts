import "server-only";

/**
 * In-memory realtime hub for presence, cursors, waves and guestbook notes, fanned out over
 * Server-Sent Events. It lives on globalThis so dev hot reloads keep it.
 *
 * Scope: one Node process (next start, Docker, a VPS, Fly, Railway…). On serverless platforms
 * with many instances, visitors only see others on the same instance; swap this module for a
 * hosted pub/sub (Redis, Ably, PartyKit) to go wider. Nothing here is persisted.
 */

export type PeerInfo = { id: string; name: string; color: string; path: string };

type Peer = PeerInfo & { send: (event: string, data: unknown) => void; seen: number };

type Hub = { peers: Map<string, Peer> };

const g = globalThis as unknown as { __adeliaLiveHub?: Hub };
const hub: Hub = (g.__adeliaLiveHub ??= { peers: new Map() });

const ADJECTIVES = ["curious", "sleepy", "brave", "sparkly", "jolly", "cosmic", "gentle", "speedy", "fuzzy", "lucky", "sunny", "witty", "bouncy", "quiet", "bold"];
const ANIMALS = ["capybara", "otter", "gecko", "mochi", "panda", "axolotl", "kitten", "orca", "koala", "lemur", "puffin", "tapir", "quokka", "shrimp", "owl"];
const COLORS = ["accent", "cobalt", "lime", "sun", "violet", "mint", "sky"];

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

export function join(id: string, path: string, send: Peer["send"]): PeerInfo {
  const existing = hub.peers.get(id);
  const info: PeerInfo = existing
    ? { id, name: existing.name, color: existing.color, path }
    : { id, name: `${pick(ADJECTIVES)}-${pick(ANIMALS)}`, color: pick(COLORS), path };
  hub.peers.set(id, { ...info, send, seen: Date.now() });
  broadcastPresence();
  return info;
}

export function leave(id: string, send?: Peer["send"]) {
  const peer = hub.peers.get(id);
  // A reconnect may have replaced the stream already; only remove the matching one.
  if (!peer || (send && peer.send !== send)) return;
  hub.peers.delete(id);
  broadcast("leave", { id });
  broadcastPresence();
}

export function touch(id: string) {
  const peer = hub.peers.get(id);
  if (peer) peer.seen = Date.now();
  return peer;
}

export function setPath(id: string, path: string) {
  const peer = touch(id);
  if (!peer) return;
  peer.path = path;
  broadcastPresence();
}

export function broadcast(event: string, data: unknown, exceptId?: string, onlyPath?: string) {
  for (const peer of hub.peers.values()) {
    if (peer.id === exceptId) continue;
    if (onlyPath && peer.path !== onlyPath) continue;
    try {
      peer.send(event, data);
    } catch {
      hub.peers.delete(peer.id);
    }
  }
}

export function snapshot(): PeerInfo[] {
  const now = Date.now();
  for (const peer of hub.peers.values()) if (now - peer.seen > 90_000) hub.peers.delete(peer.id);
  return Array.from(hub.peers.values(), ({ id, name, color, path }) => ({ id, name, color, path }));
}

export function broadcastPresence() {
  const peers = snapshot();
  broadcast("presence", { count: peers.length, peers });
}

export function peerInfo(id: string): PeerInfo | undefined {
  const peer = hub.peers.get(id);
  return peer ? { id: peer.id, name: peer.name, color: peer.color, path: peer.path } : undefined;
}
