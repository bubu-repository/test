"use client";

import { useEffect, useRef, useState } from "react";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { notifyStorage, useStoredString } from "@/lib/hooks";

const COLS = 24;
const ROWS = 16;
const LIMIT = 28; // the context window, in segments
const WORDS = ["the", "ing", "AI", "ship", "eval", "user", "agent", "Bekasi", "tool", "ok", "data", "UX", "warung", "PDF", "KRL", "yes", "wait", "cite"];
const BEST_KEY = "adelia:context-best";

type Cell = { x: number; y: number };
type Item = Cell & { kind: "token" | "summary"; word: string };
type Phase = "ready" | "playing" | "paused" | "over";

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;


/**
 * Context Window: snake, but you're an LLM. In the "handheld" variant it runs on a PSP-style
 * console: the board is the screen, and the D-pad and face buttons are real controls. Eat tokens to grow your context. The window holds
 * 28; past that you overflow, so grab a summary to compact yourself to half. Don't run into
 * yourself (that's a hallucination) or off the edge of the page.
 */
export function ContextWindow({ variant = "page" }: { variant?: "page" | "handheld" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [length, setLength] = useState(3);
  const [message, setMessage] = useState("Press Space or Start. Arrow keys or WASD to steer; swipe on a phone.");
  const best = Number(useStoredString(BEST_KEY) ?? 0) || 0;
  const game = useRef({
    snake: [] as Cell[],
    dir: { x: 1, y: 0 },
    queue: [] as Cell[],
    items: [] as Item[],
    score: 0,
    tick: 0,
    phase: "ready" as Phase,
    last: 0,
    raf: 0,
  });

  const reset = () => {
    const g = game.current;
    g.snake = [
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 },
    ];
    g.dir = { x: 1, y: 0 };
    g.queue = [];
    g.items = [];
    g.score = 0;
    g.tick = 0;
    spawn("token");
    spawn("token");
    setScore(0);
    setLength(3);
  };

  const spawn = (kind: Item["kind"]) => {
    const g = game.current;
    for (let tries = 0; tries < 200; tries++) {
      const c = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
      if (g.snake.some((s) => same(s, c)) || g.items.some((i) => same(i, c))) continue;
      g.items.push({
        ...c,
        kind,
        word: kind === "summary" ? "TL;DR" : WORDS[Math.floor(Math.random() * WORDS.length)],
      });
      return;
    }
  };

  const end = (why: string) => {
    const g = game.current;
    g.phase = "over";
    setPhase("over");
    sfx.bump();
    const b = Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
    if (g.score > b) {
      try {
        window.localStorage.setItem(BEST_KEY, String(g.score));
        notifyStorage();
      } catch {
        // storage blocked: the best score just won't persist
      }
    }
    setMessage(`${why} You read ${g.score} tokens.${g.score > b ? " New best!" : ""} Press Space to try again.`);
  };

  const start = () => {
    reset();
    game.current.phase = "playing";
    setPhase("playing");
    setMessage("Playing. Space pauses.");
    canvasRef.current?.focus();
  };

  const turn = (x: number, y: number) => {
    const g = game.current;
    const lastDir = g.queue.at(-1) ?? g.dir;
    if (lastDir.x === -x && lastDir.y === -y) return; // no reversing into yourself
    if (lastDir.x === x && lastDir.y === y) return;
    if (g.queue.length < 3) g.queue.push({ x, y });
  };

  // The game loop: fixed steps that speed up as you read more.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const g = game.current;
    if (!g.snake.length) {
      g.snake = [
        { x: 6, y: 8 },
        { x: 5, y: 8 },
        { x: 4, y: 8 },
      ];
    }

    const draw = () => {
      // Colours come from the canvas, so a screen (the PSP) can re-theme the board with variables.
      const styles = getComputedStyle(canvas);
      const css = (name: string) => styles.getPropertyValue(name).trim() || "#111";
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cw = w / COLS;
      const ch = h / ROWS;
      ctx.clearRect(0, 0, w, h);
      // grid dots
      ctx.fillStyle = css("--line");
      for (let x = 1; x < COLS; x++) for (let y = 1; y < ROWS; y++) ctx.fillRect(x * cw - 1, y * ch - 1, 2, 2);
      // items
      ctx.font = `600 ${Math.max(9, ch * 0.42)}px ${css("--font-body")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const it of g.items) {
        const x = it.x * cw + cw / 2;
        const y = it.y * ch + ch / 2;
        ctx.fillStyle = it.kind === "summary" ? css("--accent") : css("--surface");
        ctx.strokeStyle = it.kind === "summary" ? "transparent" : css("--line");
        ctx.beginPath();
        ctx.roundRect(it.x * cw + 2, it.y * ch + 3, cw - 4, ch - 6, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = it.kind === "summary" ? "#fff" : css("--ink");
        ctx.fillText(it.word.length > 4 ? it.word.slice(0, 4) : it.word, x, y + 0.5);
      }
      // snake: the context
      const over = g.snake.length > LIMIT * 0.8;
      g.snake.forEach((s, i) => {
        const head = i === 0;
        ctx.fillStyle = head ? css("--accent") : over ? css("--orange") : css("--ink");
        ctx.globalAlpha = head ? 1 : Math.max(0.35, 1 - i / (g.snake.length + 6));
        ctx.beginPath();
        ctx.roundRect(s.x * cw + 2, s.y * ch + 2, cw - 4, ch - 4, head ? 7 : 5);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const step = () => {
      if (g.queue.length) g.dir = g.queue.shift()!;
      const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return end("You ran off the end of the prompt.");
      if (g.snake.slice(0, -1).some((s) => same(s, head))) return end("You hallucinated into yourself.");
      g.snake.unshift(head);
      const hit = g.items.findIndex((it) => same(it, head));
      if (hit >= 0) {
        const it = g.items.splice(hit, 1)[0];
        if (it.kind === "summary") {
          g.snake = g.snake.slice(0, Math.max(3, Math.ceil(g.snake.length / 2)));
          sfx.whoosh();
        } else {
          g.score += 1;
          sfx.pop();
          if (g.score === 20) unlock("context");
          spawn("token");
          if (g.score % 6 === 0 && !g.items.some((i) => i.kind === "summary")) spawn("summary");
        }
        setScore(g.score);
      } else {
        g.snake.pop();
      }
      setLength(g.snake.length);
      if (g.snake.length > LIMIT) end("Context window exceeded. Should have summarised.");
    };

    const frame = (now: number) => {
      const speed = Math.max(70, 150 - g.score * 3);
      if (g.phase === "playing" && now - g.last >= speed) {
        g.last = now;
        step();
      }
      draw();
      g.raf = requestAnimationFrame(frame);
    };
    g.raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      if (document.activeElement !== canvas && !canvas.closest("[data-game]")?.contains(document.activeElement)) return;
      const k = e.key.toLowerCase();
      const map: Record<string, [number, number]> = {
        arrowup: [0, -1],
        w: [0, -1],
        arrowdown: [0, 1],
        s: [0, 1],
        arrowleft: [-1, 0],
        a: [-1, 0],
        arrowright: [1, 0],
        d: [1, 0],
      };
      if (map[k]) {
        e.preventDefault();
        e.stopPropagation();
        if (g.phase === "playing") turn(...map[k]);
      } else if (k === " ") {
        e.preventDefault();
        e.stopPropagation();
        if (g.phase === "playing") {
          g.phase = "paused";
          setPhase("paused");
          setMessage("Paused. Space to continue.");
        } else if (g.phase === "paused") {
          g.phase = "playing";
          setPhase("playing");
          setMessage("Playing. Space pauses.");
        } else start();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });

    let touch: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x;
      const dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
      else turn(0, dy > 0 ? 1 : -1);
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(g.raf);
      window.removeEventListener("keydown", onKey, { capture: true });
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
    // The loop reads everything through the ref; it starts once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const used = Math.min(100, Math.round((length / LIMIT) * 100));

  /** ✕ / START: start, continue or play again. */
  const primary = () => {
    sfx.tick();
    if (phase === "paused") {
      game.current.phase = "playing";
      setPhase("playing");
      setMessage("Playing. Space pauses.");
      canvasRef.current?.focus();
    } else if (phase !== "playing") start();
  };
  /** ○: pause and continue. */
  const pause = () => {
    const g = game.current;
    if (g.phase === "playing") {
      g.phase = "paused";
      setPhase("paused");
      setMessage("Paused. Press ✕ to continue.");
    } else if (g.phase === "paused") primary();
  };

  const board = (
    <div className={variant === "handheld" ? "relative" : "widget relative overflow-hidden p-2"}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`Context Window game board. ${message}`}
        className={cn("block aspect-[3/2] w-full touch-none bg-surface outline-none focus-visible:ring-2 focus-visible:ring-accent", variant === "handheld" ? "rounded-[6px]" : "rounded-[16px]")}
      />
      {phase !== "playing" && (
        <div className={cn("absolute grid place-items-center bg-surface/80 backdrop-blur-[2px]", variant === "handheld" ? "inset-0 rounded-[6px]" : "inset-2 rounded-[16px]")}>
          <div className="max-w-[40ch] px-6 text-center">
            <p className={cn("font-bold tracking-[-0.02em]", variant === "handheld" ? "text-18 sm:text-24" : "text-24")}>{phase === "over" ? "Game over" : phase === "paused" ? "Paused" : "Context Window"}</p>
            <p className={cn("mt-2 text-muted", variant === "handheld" ? "hidden text-14 sm:block" : "text-16")}>
              {phase === "ready" ? "Eat tokens to grow your context. Past 28 you overflow, so grab a TL;DR to compact. Don't hallucinate into yourself." : message}
            </p>
            <button type="button" className="pill mt-4" data-variant="magenta" data-size={variant === "handheld" ? "sm" : undefined} onClick={primary}>
              {phase === "over" ? "Play again" : phase === "paused" ? "Continue" : "Start"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "handheld") {
    return (
      <div data-game className="psp" data-xr="ContextWindow · a PSP: canvas screen, real D-pad and buttons">
        <div className="psp__brand" aria-hidden="true">
          <span>adelia</span>
          <span className="led" data-off={phase !== "playing"} />
        </div>
        <div className="psp__left">
          <div className="psp-dpad" role="group" aria-label="Direction pad">
            <button type="button" className="psp-dpad__up" aria-label="Up" onClick={() => turn(0, -1)} />
            <button type="button" className="psp-dpad__left" aria-label="Left" onClick={() => turn(-1, 0)} />
            <span className="psp-dpad__hub" aria-hidden="true" />
            <button type="button" className="psp-dpad__right" aria-label="Right" onClick={() => turn(1, 0)} />
            <button type="button" className="psp-dpad__down" aria-label="Down" onClick={() => turn(0, 1)} />
          </div>
          <span className="grille psp__grille" aria-hidden="true" />
        </div>
        <div className="psp__screen screen">
          <div className="psp__hud" aria-hidden="true">
            <span>
              Tokens <b>{score}</b>
            </span>
            <span>
              Best <b>{Math.max(best, phase === "over" ? score : 0)}</b>
            </span>
            <span className="psp__ctx">
              Ctx
              <span className="psp__bar">
                <span style={{ width: `${used}%`, background: used > 80 ? "var(--orange)" : "var(--screen-accent)" }} />
              </span>
              {length}/{LIMIT}
            </span>
          </div>
          {board}
        </div>
        <div className="psp__right">
          <div className="psp-face" role="group" aria-label="Buttons">
            <button type="button" className="psp-face__btn psp-face__tri" aria-label="Sound on or off" onClick={() => dispatch({ type: "sound" })}>
              △
            </button>
            <button type="button" className="psp-face__btn psp-face__sq" aria-label="Restart" onClick={start}>
              □
            </button>
            <button type="button" className="psp-face__btn psp-face__circle" aria-label="Pause" onClick={pause}>
              ○
            </button>
            <button type="button" className="psp-face__btn psp-face__cross" aria-label={phase === "paused" ? "Continue" : "Start"} onClick={primary}>
              ✕
            </button>
          </div>
          <span className="grille psp__grille" aria-hidden="true" />
        </div>
        <div className="psp__bottom" aria-hidden="true">
          <span className="psp__small">Select</span>
          <span className="psp__logo">Context Window</span>
          <span className="psp__small">Start</span>
        </div>
        <p className="sr-only" aria-live="polite">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div data-game className="mx-auto w-full max-w-[880px]" data-xr="ContextWindow · canvas game, fixed-step loop">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <dl className="flex gap-6">
          <div>
            <dt className="type-pixel text-muted">Tokens read</dt>
            <dd className="text-32 leading-none font-bold tracking-[-0.03em] tabular-nums">{score}</dd>
          </div>
          <div>
            <dt className="type-pixel text-muted">Best</dt>
            <dd className="text-32 leading-none font-bold tracking-[-0.03em] text-muted tabular-nums">{Math.max(best, phase === "over" ? score : 0)}</dd>
          </div>
        </dl>
        <div className="min-w-[200px] flex-1 sm:max-w-[320px]">
          <p className="type-pixel flex justify-between text-muted">
            <span>Context used</span>
            <span className="tabular-nums">
              {length}/{LIMIT}
            </span>
          </p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-2" aria-hidden="true">
            <div
              className="h-full rounded-pill transition-[width,background-color] duration-200"
              style={{
                width: `${used}%`,
                background: used > 80 ? "var(--orange)" : "var(--ink)",
              }}
            />
          </div>
        </div>
      </div>

      {board}

      {/* On-screen pad for touch screens */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:hidden" aria-label="Direction pad">
        <span />
        <button type="button" className="pill" aria-label="Up" onClick={() => turn(0, -1)}>
          ↑
        </button>
        <span />
        <button type="button" className="pill" aria-label="Left" onClick={() => turn(-1, 0)}>
          ←
        </button>
        <button type="button" className="pill" aria-label="Down" onClick={() => turn(0, 1)}>
          ↓
        </button>
        <button type="button" className="pill" aria-label="Right" onClick={() => turn(1, 0)}>
          →
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
