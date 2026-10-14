"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RefreshIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";
import { sfx } from "@/lib/sound";
import { bump } from "@/lib/stickers";
import { heroStore, useHero } from "./hero-store";

type Option = { text: string; p: number };
type Slot = { id: string; options: Option[] };

/** The tagline, as a sampled model output. Option 0 of every slot is the canonical sentence. */
const SLOTS: Slot[] = [
  {
    id: "verb",
    options: [
      { text: "design and build", p: 0.62 },
      { text: "prototype", p: 0.14 },
      { text: "ship", p: 0.12 },
      { text: "eval", p: 0.08 },
      { text: "sweat over", p: 0.04 },
    ],
  },
  {
    id: "what",
    options: [
      { text: "AI products", p: 0.6 },
      { text: "agents", p: 0.16 },
      { text: "tools", p: 0.12 },
      { text: "interfaces", p: 0.08 },
      { text: "tiny robots", p: 0.04 },
    ],
  },
  {
    id: "feel",
    options: [
      { text: "trust", p: 0.58 },
      { text: "check", p: 0.17 },
      { text: "understand", p: 0.13 },
      { text: "fix", p: 0.08 },
      { text: "love", p: 0.04 },
    ],
  },
  {
    id: "from",
    options: [
      { text: "first interview", p: 0.56 },
      { text: "shop counter", p: 0.18 },
      { text: "messy notes", p: 0.12 },
      { text: "first sketch", p: 0.09 },
      { text: "6 a.m. train", p: 0.05 },
    ],
  },
  {
    id: "to",
    options: [
      { text: "shipped code", p: 0.56 },
      { text: "eval suite", p: 0.18 },
      { text: "last pixel", p: 0.12 },
      { text: "error message", p: 0.09 },
      { text: "undo button", p: 0.05 },
    ],
  },
];

function sample(options: Option[], temperature: number): number {
  if (temperature <= 0.02) return 0;
  const weights = options.map((o) => Math.exp(Math.log(o.p) / temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

const SCRAMBLE = "abcdefghijklmnopqrstuvwxyz";

function Token({ slot, choice, onChoose, first, color }: { slot: Slot; choice: number; onChoose: (i: number) => void; first: boolean; color: string }) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(slot.options[choice].text);
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const option = slot.options[choice];
  const calm = useReducedMotion();
  const shownChoice = useRef(choice);

  // Scramble into the new word, like tokens arriving (only when the choice changes).
  useEffect(() => {
    const target = slot.options[choice].text;
    if (calm || shownChoice.current === choice) return;
    shownChoice.current = choice;
    let frame = 0;
    const timer = window.setInterval(() => {
      frame++;
      const settled = Math.floor(frame / 2);
      setDisplay(
        Array.from(target)
          .map((ch, i) => (i < settled || ch === " " ? ch : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]))
          .join(""),
      );
      if (settled >= target.length) window.clearInterval(timer);
    }, 28);
    return () => window.clearInterval(timer);
  }, [choice, slot.options, calm]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => wrapRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')?.focus({ preventScroll: true }));
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        data-tour={first ? "token" : undefined}
        data-cursor="Resample"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${option.text}. Choose another word, ${slot.options.length} options`}
        onClick={() => {
          setOpen((o) => !o);
          sfx.tick();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="resample-token"
        style={{ ["--tok" as string]: color }}
      >
        {calm ? option.text : display}
      </button>
      {open && (
        <span
          id={`${id}-list`}
          role="listbox"
          aria-label="Alternatives with their probabilities"
          className="glass-strong pop-in absolute top-full left-1/2 z-30 mt-2 block w-64 -translate-x-1/2 rounded-[18px] border border-line p-2 text-left text-16 font-normal tracking-normal shadow-lg"
          onKeyDown={(e) => {
            const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[role=option]"));
            const i = items.indexOf(document.activeElement as HTMLElement);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              items[(i + 1) % items.length]?.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              items[(i - 1 + items.length) % items.length]?.focus();
            } else if (e.key === "Escape") {
              setOpen(false);
              wrapRef.current?.querySelector("button")?.focus();
            }
          }}
        >
          <span className="type-pixel block px-2 pt-1 pb-2 text-muted">Other words she might use · odds are illustrative</span>
          {slot.options.map((o, i) => (
            <span
              key={o.text}
              role="option"
              tabIndex={0}
              aria-selected={i === choice}
              data-tour={i === 1 ? "token-option" : undefined}
              onClick={() => {
                onChoose(i);
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChoose(i);
                  setOpen(false);
                  wrapRef.current?.querySelector("button")?.focus();
                }
              }}
              className={cn("flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 outline-none hover:bg-surface-2 focus-visible:bg-surface-2", i === choice && "font-semibold")}
            >
              <span className="min-w-0 flex-1 truncate">{o.text}</span>
              <span aria-hidden="true" className="h-2 w-16 overflow-hidden rounded-pill bg-surface-2">
                <span className="block h-full rounded-pill bar-fill" style={{ width: `${o.p * 100}%` }} />
              </span>
              <span className="w-10 text-right font-mono text-12 tabular-nums">{o.p.toFixed(2)}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

export function ResampleSentence({ controls = true, className }: { controls?: boolean | "screen"; className?: string }) {
  const [choices, setChoices] = useState<number[]>(() => SLOTS.map(() => 0));
  const temperature = useHero((s) => s.temperature);
  const [announce, setAnnounce] = useState("");
  const sliderId = useId();

  const set = (next: number[]) => {
    setChoices(next);
    bump("resamples", 5, "sampler");
    const words = next.map((c, i) => SLOTS[i].options[c].text);
    setAnnounce(`I ${words[0]} ${words[1]} people can ${words[2]}, from the ${words[3]} to the ${words[4]}.`);
  };

  const choose = (slotIndex: number, option: number) => {
    sfx.pop();
    set(choices.map((c, i) => (i === slotIndex ? option : c)));
  };

  const resampleAll = () => {
    sfx.pop();
    set(SLOTS.map((slot) => sample(slot.options, temperature)));
  };

  const isCanonical = choices.every((c) => c === 0);
  // Each resample-able token gets one accent colour, shown only as a soft underline.
  const COLORS = ["var(--accent)", "var(--violet)", "var(--cobalt)", "var(--cyan)", "var(--orange)"];
  const T = (i: number) => <Token slot={SLOTS[i]} choice={choices[i]} onChoose={(o) => choose(i, o)} first={i === 0} color={COLORS[i]} />;

  return (
    <div>
      <p className={cn("resample-sentence text-muted", className)}>
        I {T(0)} {T(1)} people can <span className="whitespace-nowrap">{T(2)},</span> from the {T(3)} to the {T(4)}.
      </p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {controls === "screen" && (
        <div className="js-only mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[10px] tracking-[0.12em] text-screen-muted uppercase max-sm:hidden">
          <button type="button" onClick={resampleAll} className="screen-key">
            <RefreshIcon width={11} height={11} /> Resample
          </button>
          <label htmlFor={sliderId} className="flex h-7 items-center gap-2 rounded-[6px] border border-[color:var(--screen-line)] px-2">
            Temp
            <input
              id={sliderId}
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => heroStore.set({ temperature: Number(e.target.value) })}
              className="w-16 accent-[var(--screen-accent)]"
              aria-valuetext={`Temperature ${temperature.toFixed(1)}`}
            />
            <span className="w-6 text-screen-ink tabular-nums">{temperature.toFixed(1)}</span>
          </label>
          {!isCanonical && (
            <button type="button" onClick={() => set(SLOTS.map(() => 0))} className="screen-key">
              Greedy
            </button>
          )}
        </div>
      )}
      {controls === true && (
        <div className="js-only mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
          <button type="button" onClick={resampleAll} className="pill" data-size="sm">
            <RefreshIcon width={15} height={15} /> Resample
          </button>
          <label htmlFor={sliderId} className="glass flex h-9 items-center gap-2 rounded-pill px-3.5 text-14">
            <span className="type-pixel text-muted">Temp</span>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => heroStore.set({ temperature: Number(e.target.value) })}
              className="w-20 accent-[var(--accent)]"
              aria-valuetext={`Temperature ${temperature.toFixed(1)}`}
            />
            <span className="w-7 font-mono text-12 tabular-nums">{temperature.toFixed(1)}</span>
          </label>
          {!isCanonical && (
            <button type="button" onClick={() => set(SLOTS.map(() => 0))} className="pill" data-size="sm" data-variant="ghost">
              Back to greedy
            </button>
          )}
        </div>
      )}
    </div>
  );
}
