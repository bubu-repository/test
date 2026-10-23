import { useSyncExternalStore } from 'react';
import { music } from '@/audio/music';
import { audio } from '@/audio/engine';

let version = 0;
const bump = () => {
  version++;
};
music.subscribe(bump);
audio.subscribe(bump);

const sub = (fn: () => void) => {
  const a = music.subscribe(fn);
  const b = audio.subscribe(fn);
  return () => {
    a();
    b();
  };
};

/** Re-render on music/audio engine changes; read fields straight off `music`. */
export function useMusic() {
  useSyncExternalStore(sub, () => version);
  return { current: music.current, playing: music.playing, volume: music.volume, muted: audio.isMuted(), ready: audio.ready };
}

/** requestAnimationFrame loop helper (stops when the component unmounts). */
export function raf(fn: (t: number) => void) {
  let id = 0;
  const loop = (t: number) => {
    fn(t);
    id = requestAnimationFrame(loop);
  };
  id = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(id);
}
