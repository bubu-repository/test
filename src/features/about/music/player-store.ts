"use client";

import { applySound, getSound } from "@/lib/preferences";
import { createStore } from "@/lib/store";
import { music } from "./engine";
import { tracks, type Track } from "./tracks";

export type PlayerState = {
  /** Index into the playlist (tracks, then the visitor's own song if they dropped one). */
  index: number;
  playing: boolean;
  view: "now" | "menu";
  /** Highlighted row in the menu. */
  sel: number;
  custom: { name: string; url: string } | null;
  volume: number;
  /** The volume bar shows for a moment after the volume changes. */
  volumeShown: boolean;
  /** The game whose mood is playing, if any (the CD shelf spins that disc faster). */
  game: string | null;
};

export const player = createStore<PlayerState>({ index: 0, playing: false, view: "now", sel: 0, custom: null, volume: 0.7, volumeShown: false, game: null });

let resumeAt = 0;

/** The playlist as the menu shows it: the synth tracks, then the dropped song. */
export function playlist(): { title: string; artist: string; glyph: string; art: string; track: Track | null }[] {
  const custom = player.get().custom;
  return [
    ...tracks.map((t) => ({ title: t.title, artist: t.artist, glyph: t.glyph, art: t.art, track: t as Track | null })),
    ...(custom ? [{ title: custom.name, artist: "Your file, playing locally", glyph: "💿", art: "linear-gradient(160deg, #f4faff, #cfe8ff 50%, #ffd9ec)", track: null }] : []),
  ];
}

function ensureSound() {
  if (!getSound()) applySound(true, { persist: true });
}

export function playIndex(index: number, from = 0, game: string | null = null) {
  ensureSound();
  const list = playlist();
  const i = ((index % list.length) + list.length) % list.length;
  const item = list[i];
  const ended = () => next();
  const ok = item.track ? music.play(item.track, from, ended) : player.get().custom ? music.playFile(player.get().custom!.url, ended) : false;
  resumeAt = 0;
  player.set({ index: i, sel: i, playing: ok, view: "now", game });
}

export function toggle() {
  const s = player.get();
  if (s.playing) {
    resumeAt = music.pause();
    player.set({ playing: false });
  } else {
    playIndex(s.index, resumeAt, s.game);
  }
}

export function next() {
  playIndex(player.get().index + 1);
}

export function prev() {
  // Like a real player: back to the start first, then the previous track.
  if (music.position() > 3) playIndex(player.get().index);
  else playIndex(player.get().index - 1);
}

export function pause() {
  if (!player.get().playing) return;
  resumeAt = music.pause();
  player.set({ playing: false });
}

let volumeTimer = 0;

export function setVolume(v: number) {
  music.setVolume(v);
  player.set({ volume: music.volume(), volumeShown: true });
  window.clearTimeout(volumeTimer);
  volumeTimer = window.setTimeout(() => player.set({ volumeShown: false }), 1400);
}

/** Play the mood track of a game from the CD shelf. */
export function playMood(trackId: string, game: string) {
  const i = tracks.findIndex((t) => t.id === trackId);
  if (i >= 0) playIndex(i, 0, game);
}

/** A song the visitor dropped on the player: plays from an object URL, never leaves the browser. */
export function loadFile(file: File) {
  const old = player.get().custom;
  if (old) URL.revokeObjectURL(old.url);
  player.set({ custom: { name: file.name.replace(/\.[a-z0-9]+$/i, ""), url: URL.createObjectURL(file) } });
  playIndex(tracks.length);
}
