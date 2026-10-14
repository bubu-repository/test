"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SiteAvatar } from "@/components/SiteAvatar";
import { CloseIcon } from "@/components/icons";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { stopTour, useTour } from "./tour-store";

type Step = { target: string; title: string; body: string };

/** The walk, in reading order. Steps whose target isn't on this page are skipped. */
const STEPS: Step[] = [
  {
    target: '[data-tour="dock"]',
    title: "This is the dock",
    body: "Work, About and Lab are the three rooms. CV downloads her CV, Email copies her address, and More has the guestbook, search and sound.",
  },
  {
    target: '[data-tour="go"]',
    title: "Start with the work",
    body: "Four case studies, each answering one hiring question: the problem, her role, the design, the engineering, the evals and what happened.",
  },
  {
    target: '[data-tour="agent"]',
    title: "Ask her agent",
    body: "An AI agent that answers from this site and names the page it used. When it doesn't know, it says so. It's her agent, not her.",
  },
  {
    target: '[data-tour="lab-tools"]',
    title: "Tools you can use",
    body: "The Lab has a craft studio for lettering and photos, and one card pack a day.",
  },
  {
    target: "#contact",
    title: "CV and email, on every page",
    body: "Every page ends with her email, a copy button and the CV.",
  },
  {
    target: '[data-tour="help"]',
    title: "Lost again? Press here",
    body: "This walk lives behind the question mark. Press ⌘K (Ctrl+K) any time to search everything.",
  },
];

type Rect = { x: number; y: number; w: number; h: number };

function visible(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

/**
 * "How this site works": a spotlight on one part of the page at a time, with a short note on
 * each. Back, Next, Esc to leave; arrow keys work too. Nothing moves on its own.
 */
export function Tour() {
  const running = useTour((s) => s.running);
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  // Pick the steps that exist on this page when the walk starts.
  useLayoutEffect(() => {
    if (!running) return;
    opener.current = document.activeElement;
    // Which steps apply depends on the DOM of the page the visitor is on.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSteps(STEPS.filter((s) => visible(s.target)));
    setIndex(0);
    return () => {
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [running]);

  const step = steps[index];

  // Follow the target as the page scrolls or resizes.
  useEffect(() => {
    if (!running || !step) return;
    const el = visible(step.target);
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fixed = getComputedStyle(el).position === "fixed" || el.closest(".site-header, .float-actions") !== null;
    if (!fixed) el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    const settle = window.setInterval(queue, 120);
    const stop = window.setTimeout(() => window.clearInterval(settle), 900);
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(settle);
      window.clearTimeout(stop);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [running, step]);

  // Focus the card once it's on screen, and again on every step, so the arrow keys work.
  const shown = running && !!step && !!rect;
  useEffect(() => {
    if (shown) cardRef.current?.focus({ preventScroll: true });
  }, [shown, index]);

  if (!running || !step || !rect) return null;

  const last = index === steps.length - 1;
  const go = (delta: number) => {
    sfx.tick();
    const next = index + delta;
    if (next < 0) return;
    if (next >= steps.length) {
      unlock("passenger");
      stopTour();
    } else setIndex(next);
  };

  // The card sits below the target, or above it when there's no room.
  const pad = 10;
  const cardW = Math.min(360, window.innerWidth - 24);
  const below = rect.y + rect.h + pad + 220 < window.innerHeight;
  const left = Math.max(12, Math.min(window.innerWidth - cardW - 12, rect.x + rect.w / 2 - cardW / 2));
  const top = below ? rect.y + rect.h + pad + 8 : undefined;
  const bottom = below ? undefined : window.innerHeight - rect.y + pad + 8;

  return (
    <div className="coach" role="presentation">
      <div className="coach__spot" style={{ left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2 }} aria-hidden="true" />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="coach-title"
        aria-describedby="coach-body"
        tabIndex={-1}
        className="coach__card"
        style={{ left, top, bottom, width: cardW }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <div className="flex items-start gap-3">
          <SiteAvatar size={44} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-12 font-semibold text-accent-ink">
              {index + 1} of {steps.length}
            </p>
            <h2 id="coach-title" className="mt-0.5 text-18 leading-tight font-bold tracking-[-0.01em]">
              {step.title}
            </h2>
          </div>
          <button type="button" className="pill" data-variant="ghost" data-shape="icon" data-size="sm" onClick={() => stopTour()} aria-label="Leave the walk">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        <p id="coach-body" className="mt-2 text-14 leading-relaxed text-muted">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          {index > 0 && (
            <button type="button" className="pill" data-size="sm" data-variant="ghost" onClick={() => go(-1)}>
              Back
            </button>
          )}
          <button type="button" className="pill" data-size="sm" data-variant="magenta" onClick={() => go(1)}>
            {last ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
