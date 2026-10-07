"use client";

import { useEffect, useRef } from "react";
import { MociAvatar } from "@/components/MociAvatar";
import { ghost, runTour } from "./script";
import { registerTourRunner, stopTour, useTour } from "./tour-store";

/**
 * The autopilot's ghost cursor, its speech bubble and the stop bar.
 * Rendered in the top layer (popover) so it stays visible above modal dialogs.
 */
export function Tour() {
  const running = useTour((s) => s.running);
  const caption = useTour((s) => s.caption);
  const step = useTour((s) => s.step);
  const total = useTour((s) => s.total);
  const layerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerTourRunner(runTour);
    return () => registerTourRunner(null);
  }, []);

  // Keep the layer on top: re-show it whenever a dialog opens during the tour.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !running) return;
    const raise = () => {
      try {
        if (layer.matches(":popover-open")) layer.hidePopover();
        layer.showPopover();
      } catch {
        // Popover API missing: the layer falls back to a high z-index.
      }
    };
    raise();
    const observer = new MutationObserver(() => raise());
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    return () => {
      observer.disconnect();
      try {
        layer.hidePopover();
      } catch {
        // ignore
      }
    };
  }, [running]);

  // Spring-follow the target.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let vx = 0;
    let vy = 0;
    const tick = () => {
      if (ghost.teleport) {
        ghost.x = ghost.tx;
        ghost.y = ghost.ty;
        vx = vy = 0;
      } else {
        const ax = (ghost.tx - ghost.x) * 0.075;
        const ay = (ghost.ty - ghost.y) * 0.075;
        vx = (vx + ax) * 0.72;
        vy = (vy + ay) * 0.72;
        ghost.x += vx;
        ghost.y += vy;
      }
      const cursor = cursorRef.current;
      const bubble = bubbleRef.current;
      if (cursor) {
        cursor.style.transform = `translate3d(${ghost.x}px, ${ghost.y}px, 0) scale(${ghost.pressed ? 0.82 : 1})`;
        cursor.style.opacity = ghost.visible ? "1" : "0";
      }
      if (bubble) {
        const w = bubble.offsetWidth;
        const h = bubble.offsetHeight;
        const flipX = ghost.x + 40 + w > window.innerWidth - 12;
        const flipY = ghost.y + 44 + h > window.innerHeight - 90;
        const bx = Math.max(12, flipX ? ghost.x - w - 24 : ghost.x + 40);
        const by = Math.max(12, flipY ? ghost.y - h - 20 : ghost.y + 44);
        bubble.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  if (!running) return null;

  return (
    <div ref={layerRef} popover="manual" className="tour-layer" data-xr="Autopilot · scripted agent driving the real UI">
      <div ref={cursorRef} className="tour-ghost" aria-hidden="true">
        <svg width="34" height="40" viewBox="0 0 34 40" className="drop-shadow-[0_6px_10px_rgba(15,18,48,0.3)]">
          <path d="M3 3 L3 31 L11 24 L16.5 36 L22 33.5 L16.5 22 L27 22 Z" fill="var(--accent)" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <span className="tour-ghost__moci">
          <MociAvatar size={30} mood="happy" />
        </span>
        <span className="tour-ghost__label type-pixel">moci</span>
      </div>
      {caption && (
        <div ref={bubbleRef} className="tour-bubble widget" aria-hidden="true">
          <p className="text-16 leading-snug font-medium">{caption}</p>
        </div>
      )}
      <div className="tour-bar widget" role="region" aria-label="Autopilot tour">
        <span className="live-dot" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-14">
          <span className="type-pixel mr-2 text-accent-ink">Autopilot</span>
          <span className="hidden sm:inline">Moci is driving · move your mouse or press any key to take over</span>
          <span className="sm:hidden">Tap anywhere to take over</span>
        </p>
        <span className="type-pixel hidden text-muted sm:inline" aria-hidden="true">
          {step}/{total}
        </span>
        <button type="button" className="pill" data-variant="ink" data-size="sm" onClick={() => stopTour("Tour stopped.")}>
          Stop
        </button>
      </div>
      <p className="sr-only" aria-live="assertive">
        {caption}
      </p>
    </div>
  );
}
