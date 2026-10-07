"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getSound, subscribePreferences } from "@/lib/preferences";
import { sfx } from "@/lib/sound";
import { useStore } from "@/lib/store";
import { music } from "./engine";
import { loadFile, next, pause, player, playIndex, playlist, prev, setVolume, toggle } from "./player-store";
import { tracks } from "./tracks";

const BARS = 14;
const DETENT = 24; // degrees of wheel turn per click

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * The MP3 player on /about: a pearl-glass player with a click wheel. Turn the wheel to scroll the
 * menu (or change the volume while a song plays); MENU, ⏮, ⏭ and ⏯ sit on the ring; the centre
 * button selects. The songs are original loops synthesised live; drop your own audio file on it and
 * it plays that too, locally. A visualizer reads the real output.
 */
export function MusicPlayer() {
  const s = useStore(player, (x) => x);
  const list = playlist();
  const item = list[s.index] ?? list[0];
  const [, frame] = useState(0);
  const barsRef = useRef<HTMLSpanElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wheel = useRef<{ angle: number; acc: number; moved: boolean } | null>(null);
  const swallow = useRef(false);
  const [dragging, setDragging] = useState(false);
  const showVolume = s.volumeShown;

  // Muting the site stops the music.
  useEffect(
    () =>
      subscribePreferences(() => {
        if (!getSound()) pause();
      }),
    [],
  );

  // While playing: redraw the progress and the visualizer every frame.
  useEffect(() => {
    if (!s.playing) return;
    let raf = 0;
    const data = new Uint8Array(128);
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const analyser = music.analyser();
      const bars = barsRef.current?.children;
      if (analyser && bars) {
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < bars.length; i++) {
          // Log-spaced bins (the synths live low), lifted a little so quiet parts still dance.
          const bin = 1 + Math.floor((i / bars.length) ** 1.7 * 44);
          const v = Math.min(1, (data[bin] / 255) * (1.1 + i * 0.06));
          (bars[i] as HTMLElement).style.transform = `scaleY(${Math.max(0.06, v).toFixed(3)})`;
        }
      }
      if (t - last > 250) {
        last = t;
        frame((n) => n + 1);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s.playing]);

  const position = music.position();
  const duration = music.duration(item.track) || 1;
  const rows = [...list.map((r) => r.title), "Load your own song…"];

  const select = () => {
    if (s.view === "menu") {
      if (s.sel === rows.length - 1) fileRef.current?.click();
      else playIndex(s.sel);
    } else toggle();
  };

  const turn = (dir: 1 | -1) => {
    sfx.tick();
    if (s.view === "menu") player.set({ sel: Math.max(0, Math.min(rows.length - 1, s.sel + dir)) });
    else setVolume(s.volume + dir * 0.05);
  };

  const angleOf = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  /** Ring buttons ignore the click that ends a turn of the wheel. */
  const press = (fn: () => void) => {
    if (swallow.current) {
      swallow.current = false;
      return;
    }
    fn();
  };

  return (
    <div
      className="ipod"
      data-dragging={dragging || undefined}
      data-playing={s.playing || undefined}
      tabIndex={0}
      aria-label="MP3 player. Arrow keys scroll or change volume, Space plays or pauses, Escape opens the menu."
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          turn(e.key === "ArrowDown" ? 1 : -1);
        } else if (e.key === "ArrowRight") next();
        else if (e.key === "ArrowLeft") prev();
        else if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          select();
        } else if (e.key === "Escape") player.set({ view: s.view === "menu" ? "now" : "menu" });
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("audio/"));
        if (file) loadFile(file);
      }}
      data-xr="MusicPlayer · Web Audio sequencer + AnalyserNode visualizer"
    >
      <span className="ipod__jack" aria-hidden="true" />
      <div className="ipod__screen screen" aria-live="polite">
        <div className="ipod__status">
          <span>{s.playing ? "▶" : "❚❚"}</span>
          <span>{s.view === "menu" ? "On repeat" : "Now playing"}</span>
          <span className="ipod__battery" aria-hidden="true" />
        </div>

        {s.view === "now" ? (
          <div key={`now-${s.index}`} className="ipod__now">
            <div className="ipod__track">
              <span className="ipod__art" style={{ background: item.art } as CSSProperties} aria-hidden="true">
                {item.glyph}
              </span>
              <span className="min-w-0">
                <span className="ipod__title">{item.title}</span>
                <span className="ipod__artist">{item.artist}</span>
                <span className="ipod__count">
                  {s.index + 1} of {list.length}
                </span>
              </span>
            </div>
            <span ref={barsRef} className="ipod__bars" aria-hidden="true">
              {Array.from({ length: BARS }, (_, i) => (
                <i key={i} />
              ))}
            </span>
            {showVolume ? (
              <div className="ipod__progress" aria-label={`Volume ${Math.round(s.volume * 100)}%`}>
                <span>🔈</span>
                <span className="ipod__rail">
                  <span style={{ width: `${s.volume * 100}%` }} />
                </span>
                <span>🔊</span>
              </div>
            ) : (
              <div className="ipod__progress">
                <span>{clock(position)}</span>
                <span className="ipod__rail">
                  <span style={{ width: `${Math.min(100, (position / duration) * 100)}%` }} />
                </span>
                <span>-{clock(Math.max(0, duration - position))}</span>
              </div>
            )}
          </div>
        ) : (
          <ul key="menu" className="ipod__menu" role="listbox" aria-label="Playlist" aria-activedescendant={`ipod-row-${s.sel}`}>
            {rows.map((title, i) => (
              <li
                key={title + i}
                id={`ipod-row-${i}`}
                role="option"
                aria-selected={s.sel === i}
                data-now={i === s.index && s.playing ? "" : undefined}
                onClick={() => {
                  player.set({ sel: i });
                  if (i === rows.length - 1) fileRef.current?.click();
                  else playIndex(i);
                }}
              >
                <span className="truncate">{title}</span>
                <span aria-hidden="true">{i === s.index && s.playing ? "♪" : "›"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="ipod__wheel"
        onPointerDown={(e) => {
          wheel.current = { angle: angleOf(e), acc: 0, moved: false };
        }}
        onPointerMove={(e) => {
          const w = wheel.current;
          if (!w) return;
          const a = angleOf(e);
          let d = a - w.angle;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          w.angle = a;
          w.acc += d;
          if (!w.moved && Math.abs(w.acc) > 8) {
            w.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          while (Math.abs(w.acc) >= DETENT) {
            turn(w.acc > 0 ? 1 : -1);
            w.acc -= Math.sign(w.acc) * DETENT;
          }
        }}
        onPointerUp={() => {
          if (wheel.current?.moved) swallow.current = true;
          wheel.current = null;
        }}
        onPointerCancel={() => {
          wheel.current = null;
        }}
        data-cursor="Turn"
      >
        <button type="button" className="ipod__key ipod__key--menu" onClick={() => press(() => player.set({ view: s.view === "menu" ? "now" : "menu", sel: s.index }))} data-sfx="off" aria-label="Menu">
          Menu
        </button>
        <button type="button" className="ipod__key ipod__key--prev" onClick={() => press(prev)} aria-label="Previous track">
          ⏮
        </button>
        <button type="button" className="ipod__key ipod__key--next" onClick={() => press(next)} aria-label="Next track">
          ⏭
        </button>
        <button type="button" className="ipod__key ipod__key--play" onClick={() => press(toggle)} aria-label={s.playing ? "Pause" : "Play"}>
          ⏯
        </button>
        <button type="button" className="ipod__center" onClick={() => press(select)} aria-label={s.view === "menu" ? "Play the highlighted song" : s.playing ? "Pause" : "Play"} />
      </div>

      <p className="ipod__drop" aria-hidden={!dragging}>
        Drop it. It plays here, it never leaves your browser.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Load your own song"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = "";
        }}
      />
      <span className="sr-only">{`${tracks.length} original songs, synthesised live.`}</span>
    </div>
  );
}
