"use client";

import { playlist } from "@/content/playlist";
import { unlock } from "@/lib/stickers";
import { createStore, useStore } from "@/lib/store";

/**
 * The DAC on the desk plays the playlist through the YouTube IFrame Player API. Nothing is loaded
 * from YouTube until someone presses play: then the API script loads, and the player appears on the
 * monitor (youtube-nocookie.com, at least 200 × 200 px as YouTube requires). The DAC's buttons, the
 * volume knob and the little display drive the player and read its state.
 */

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(id: string): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
};

type YTEvent = { target: YTPlayer; data: number };

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: (e: YTEvent) => void; onStateChange?: (e: YTEvent) => void; onError?: (e: YTEvent) => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** YouTube's player states. */
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
const CUED = 5;

export type DacStatus = "idle" | "loading" | "playing" | "paused" | "error";
/**
 * `live` is true once the YouTube player is on the monitor. `errorCode` is YouTube's: 101 and 150
 * mean the song's owner doesn't let it play outside YouTube.
 */
type DacState = { status: DacStatus; live: boolean; errorCode: number | null; index: number; volume: number; time: number; duration: number };

export const dac = createStore<DacState>({ status: "idle", live: false, errorCode: null, index: 0, volume: 70, time: 0, duration: 0 });

/** True when YouTube says the song may only be played on YouTube itself. */
export function youtubeOnly(code: number | null): boolean {
  return code === 101 || code === 150;
}

export function useDac<S>(selector: (state: DacState) => S): S {
  return useStore(dac, selector);
}

let screen: HTMLElement | null = null;
let player: YTPlayer | null = null;
let ready = false;
let api: Promise<YTNamespace> | null = null;
let ticker = 0;

function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  api ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      api = null;
      reject(new Error("The YouTube player could not load."));
    };
    document.head.appendChild(script);
  });
  return api;
}

function startTicker() {
  window.clearInterval(ticker);
  ticker = window.setInterval(() => {
    if (!player || !ready) return;
    dac.set({ time: player.getCurrentTime() || 0, duration: player.getDuration() || 0 });
  }, 500);
}

function stopTicker() {
  window.clearInterval(ticker);
}

function teardown() {
  stopTicker();
  player?.destroy();
  player = null;
  ready = false;
}

/** The monitor hands over its screen when it mounts, and takes it back (stopping the song) when it goes. */
export function setScreen(el: HTMLElement | null) {
  screen = el;
  if (!el) {
    teardown();
    dac.set({ status: "idle", live: false, time: 0, duration: 0 });
  }
}

export async function play() {
  if (player && ready) {
    player.playVideo();
    return;
  }
  if (!screen || dac.get().status === "loading") return;
  dac.set({ status: "loading", errorCode: null });
  try {
    const YT = await loadApi();
    if (!screen) return;
    const song = playlist[dac.get().index];
    const mount = document.createElement("div");
    screen.replaceChildren(mount);
    player = new YT.Player(mount, {
      host: "https://www.youtube-nocookie.com",
      videoId: song.youtubeId,
      width: "100%",
      height: "100%",
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: (e) => {
          ready = true;
          dac.set({ live: true });
          e.target.getIframe().title = `YouTube player: ${song.title} by ${song.artist}`;
          e.target.setVolume(dac.get().volume);
          e.target.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === PLAYING) {
            dac.set({ status: "playing" });
            unlock("dj");
            startTicker();
          } else if (e.data === PAUSED || e.data === CUED) {
            dac.set({ status: "paused" });
            stopTicker();
          } else if (e.data === BUFFERING) {
            dac.set({ status: "loading" });
          } else if (e.data === ENDED) {
            stopTicker();
            if (playlist.length > 1) next();
            else dac.set({ status: "paused", time: 0 });
          }
        },
        onError: (e) => {
          stopTicker();
          dac.set({ status: "error", errorCode: e.data });
        },
      },
    });
  } catch {
    teardown();
    dac.set({ status: "error", live: false, errorCode: null });
  }
}

export function pause() {
  player?.pauseVideo();
}

export function toggle() {
  if (dac.get().status === "playing") pause();
  else void play();
}

function load(index: number) {
  const live = !!player && ready;
  dac.set({ index, time: 0, duration: 0, errorCode: null, status: live ? "loading" : "idle" });
  if (live) player!.loadVideoById(playlist[index].youtubeId);
}

export function next() {
  load((dac.get().index + 1) % playlist.length);
}

/** Back to the start of the song, or to the one before if it has only just begun. */
export function previous() {
  if (player && ready && player.getCurrentTime() > 3) {
    player.seekTo(0, true);
    return;
  }
  load((dac.get().index - 1 + playlist.length) % playlist.length);
}

export function setVolume(volume: number) {
  const v = Math.max(0, Math.min(100, Math.round(volume)));
  dac.set({ volume: v });
  player?.setVolume(v);
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
