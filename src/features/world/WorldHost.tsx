"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getSound, subscribePreferences } from "@/lib/preferences";
import { ambience, sfx } from "@/lib/sound";

/** Anything you can press or pick. */
const PRESSABLE = 'a[href], button, [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="option"], summary, label[for], input[type="checkbox"], input[type="radio"], select';
/** Glass that catches the light under the pointer. */
const GLASS = ".widget, .work-card__link, .device, .spec-plate, [data-glass-light]";

/**
 * The layer that makes every page feel alive, without each page wiring it up:
 * - sound: a faint tick when you hover something pressable, a glass tap when you press something
 *   that has no sound of its own, and a small wave when you change page (all silent unless sound
 *   is on). Turning sound off also stops the sea.
 * - light: glass panels catch a soft light where the pointer is (--gx/--gy).
 * (Headings and panels fading up into view is pure CSS now: see "Motion on every page".)
 */
export function WorldHost() {
  const pathname = usePathname();
  const firstPath = useRef(true);

  // Sound: hover and press, delegated once for the whole site.
  useEffect(() => {
    let hovered: Element | null = null;
    let hoverAt = 0;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = (e.target as Element | null)?.closest?.(PRESSABLE) ?? null;
      if (el === hovered) return;
      hovered = el;
      if (!el || el.closest('[data-sfx="off"]') || (el as HTMLButtonElement).disabled) return;
      const now = performance.now();
      if (now - hoverAt < 60) return;
      hoverAt = now;
      sfx.hover();
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(PRESSABLE);
      if (!el || el.closest('[data-sfx="off"]')) return;
      const at = performance.now();
      // After the component's own handlers: if it already made a sound, stay quiet.
      window.setTimeout(() => {
        if (sfx.lastAt() >= at - 1) return;
        sfx.tap();
      }, 0);
    };
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("click", onClick);
    const unsubscribe = subscribePreferences(() => {
      if (!getSound()) ambience.stop();
    });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick);
      unsubscribe();
    };
  }, []);

  // Sound: a wave washes in on every page change.
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    sfx.wave();
  }, [pathname]);

  // Light: the glass under the pointer brightens where the pointer is. Tilt: in a tilt zone (the
  // hero), the object leans a few degrees toward the pointer.
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lit: HTMLElement | null = null;
    let tilted: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const zone = still ? null : ((e.target as Element | null)?.closest?.<HTMLElement>("[data-tilt-zone]") ?? null);
      const tilt = zone?.querySelector<HTMLElement>("[data-tilt]") ?? null;
      if (tilted && tilted !== tilt) {
        tilted.style.setProperty("--tilt-x", "0deg");
        tilted.style.setProperty("--tilt-y", "0deg");
      }
      tilted = tilt;
      if (zone && tilt) {
        const z = zone.getBoundingClientRect();
        const px = (e.clientX - z.left) / z.width - 0.5;
        const py = (e.clientY - z.top) / z.height - 0.5;
        tilt.style.setProperty("--tilt-x", `${(-py * 5).toFixed(2)}deg`);
        tilt.style.setProperty("--tilt-y", `${(px * 6).toFixed(2)}deg`);
      }
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(GLASS) ?? null;
      if (lit && lit !== el) {
        lit.style.removeProperty("--gx");
        lit.style.removeProperty("--gy");
      }
      lit = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gx", `${Math.round(e.clientX - r.left)}px`);
      el.style.setProperty("--gy", `${Math.round(e.clientY - r.top)}px`);
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);

  return null;
}
