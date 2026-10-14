"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { playlist } from "@/content/playlist";
import { sfx } from "@/lib/sound";
import { dac, formatTime, next, play, previous, setScreen, setVolume, toggle, useDac, youtubeOnly, type DacStatus } from "./dac-store";

const STATUS: Record<DacStatus, string> = {
  idle: "Ready",
  loading: "Tuning in",
  playing: "Playing",
  paused: "Paused",
  error: "Offline",
};

function ExternalGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayGlyph({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /> : <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2Z" fill="currentColor" />}
    </svg>
  );
}

function SkipGlyph({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style={back ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M5 6.2v11.6a.7.7 0 0 0 1.1.6l8.4-5.8a.7.7 0 0 0 0-1.2L6.1 5.6a.7.7 0 0 0-1.1.6ZM16.5 6h2.5v12h-2.5z" fill="currentColor" />
    </svg>
  );
}

/**
 * The monitor. Its screen is where the YouTube player appears once someone presses play; before
 * that it shows what's on the DAC. Whatever you pass as children hangs off its top corner.
 */
export function Monitor({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const status = useDac((s) => s.status);
  const live = useDac((s) => s.live);
  const errorCode = useDac((s) => s.errorCode);
  const song = playlist[useDac((s) => s.index)];
  const watch = `https://www.youtube.com/watch?v=${song.youtubeId}`;

  useEffect(() => {
    setScreen(ref.current);
    return () => setScreen(null);
  }, []);

  return (
    <div className="monitor">
      <div className="monitor__bezel">
        <div className="monitor__screen">
          {/* The player is created in here by dac-store; React never renders inside it. */}
          <div ref={ref} className="monitor__player" />
          {/* Before the player is up, and over YouTube's own error screen if it can't play here. */}
          {(!live || status === "error") && (
            <div className="monitor__idle">
              <p className="monitor__label">On the DAC</p>
              <p className="monitor__song">{song.title}</p>
              {song.original && (
                <p className="monitor__original" lang="ja">
                  {song.original}
                </p>
              )}
              <p className="monitor__artist">{song.artist}</p>
              {status === "error" ? (
                <>
                  <p className="monitor__note">{youtubeOnly(errorCode) ? "Its label only lets this song play on YouTube itself." : "YouTube didn't load here."}</p>
                  <a href={watch} target="_blank" rel="noopener noreferrer" className="pill" data-variant="light">
                    Listen on YouTube <ExternalGlyph />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </>
              ) : (
                <button type="button" className="pill" data-variant="light" data-sfx="off" disabled={status === "loading"} onClick={() => void play()}>
                  <PlayGlyph playing={false} /> {status === "loading" ? "Tuning in…" : "Play"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <span className="monitor__neck" aria-hidden="true" />
      <span className="monitor__foot" aria-hidden="true" />
      {children}
    </div>
  );
}

/** The knob's rest position, and where a double-click puts it back. */
const DEFAULT_VOLUME = 70;

/**
 * The DAC: a small aluminium box with a display, three keys, a volume knob and a level meter. It
 * plays the playlist in full through the YouTube player on the monitor. (The level meter is a
 * flourish: the player is in another origin, so its real output can't be read.)
 *
 * The knob turns relative to where you press it: drag right or up to turn it up, left or down to
 * turn it down, in steps of 5, with a tick per step; double-click puts it back to 70. Keyboards and
 * screen readers use the range input underneath. Whichever way it turns, the display shows the
 * volume for a moment.
 */
export function Dac() {
  const status = useDac((s) => s.status);
  const errorCode = useDac((s) => s.errorCode);
  const index = useDac((s) => s.index);
  const volume = useDac((s) => s.volume);
  const time = useDac((s) => s.time);
  const duration = useDac((s) => s.duration);
  const song = playlist[index];
  const playing = status === "playing";
  const single = playlist.length < 2;
  const drag = useRef<{ id: number; v: number; x: number; y: number } | null>(null);
  // Counts volume changes; while it's set, the display shows the volume instead of the status.
  const [turned, setTurned] = useState(0);

  useEffect(() => {
    if (!turned) return;
    const timer = window.setTimeout(() => setTurned(0), 900);
    return () => window.clearTimeout(timer);
  }, [turned]);

  const turn = (v: number) => {
    if (v === dac.get().volume) return;
    setVolume(v);
    sfx.tick();
    setTurned((n) => n + 1);
  };

  const grab = (e: PointerEvent<HTMLLabelElement>) => {
    if (e.button !== 0 || drag.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, v: dac.get().volume, x: e.clientX, y: e.clientY };
  };

  const twist = (e: PointerEvent<HTMLLabelElement>) => {
    const s = drag.current;
    if (!s || s.id !== e.pointerId) return;
    const raw = s.v + (e.clientX - s.x - (e.clientY - s.y)) * 0.5;
    turn(Math.round(Math.max(0, Math.min(100, raw)) / 5) * 5);
  };

  const release = (e: PointerEvent<HTMLLabelElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  return (
    <div className="dac" role="group" aria-label="DAC: the songs on her desk" data-playing={playing || undefined}>
      <div className="dac__display">
        <p className="dac__title" aria-live="polite">
          {song.title}
        </p>
        <p className="dac__meta">
          <span>{song.artist}</span>
          <span className="dac__status tabular-nums">{turned ? `VOL ${volume}` : status === "error" && youtubeOnly(errorCode) ? "YouTube only" : STATUS[status]}</span>
        </p>
        <p className="dac__time" aria-hidden="true">
          <span className="tabular-nums">{formatTime(time)}</span>
          <span className="dac__bar">
            <span style={{ "--p": duration ? Math.min(1, time / duration) : 0 } as CSSProperties} />
          </span>
          <span className="tabular-nums">{duration ? formatTime(duration) : "--:--"}</span>
        </p>
        <span className="dac__vu" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </span>
      </div>

      <div className="dac__keys">
        <button type="button" className="dac__key" aria-label="Back to the start, or the song before" data-sfx="off" disabled={single && status === "idle"} onClick={previous}>
          <SkipGlyph back />
        </button>
        <button type="button" className="dac__key dac__key--play" aria-label={playing ? "Pause" : `Play ${song.title}`} data-sfx="off" disabled={status === "loading" || status === "error"} onClick={toggle}>
          <PlayGlyph playing={playing} />
        </button>
        <button type="button" className="dac__key" aria-label="Next song" data-sfx="off" disabled={single} onClick={next}>
          <SkipGlyph />
        </button>
      </div>

      <label
        className="dac__knob"
        data-cursor="Turn"
        style={{ "--v": volume } as CSSProperties}
        onPointerDown={grab}
        onPointerMove={twist}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onDoubleClick={() => turn(DEFAULT_VOLUME)}
      >
        <span className="sr-only">Volume</span>
        <input type="range" min={0} max={100} step={5} value={volume} onChange={(e) => turn(Number(e.target.value))} />
        <span className="dac__cap" aria-hidden="true" />
      </label>
      <span className="dac__led" aria-hidden="true" />
    </div>
  );
}
