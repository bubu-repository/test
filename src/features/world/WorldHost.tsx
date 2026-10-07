"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getSound, subscribePreferences } from "@/lib/preferences";
import { ambience, sfx } from "@/lib/sound";

/** Anything you can press or pick. */
const PRESSABLE = 'a[href], button, [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="option"], summary, label[for], input[type="checkbox"], input[type="radio"], select';
/** Glass that catches the light under the pointer. */
const GLASS = ".widget, .device, .spec-plate, .ipod, [data-glass-light]";
/** What fades up into view as you scroll, on every page. */
const REVEAL = "main :is(h2, .type-eyebrow, .type-lead, .widget, .polaroid, .spec-plate, [data-rv-item]), footer :is(h2, .type-eyebrow, .spec-plate)";
/** Never animated in: the hero, the packs and their cards (they have their own entrance), dialogs. */
const SKIP = "#hero, .packs, dialog, [data-no-reveal]";

/**
 * The layer that makes every page feel alive, without each page wiring it up:
 * - sound: a faint tick when you hover something pressable, a glass tap when you press something
 *   that has no sound of its own, and a small wave when you change page (all silent unless sound
 *   is on). Turning sound off also stops the sea.
 * - light: glass panels catch a soft light where the pointer is (--gx/--gy).
 * - motion: headings, panels and prints below the fold fade up as they scroll into view.
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

  // Motion: everything below the fold fades up as it arrives, a few at a time.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let observer: IntersectionObserver | null = null;
    const frame = requestAnimationFrame(() => {
      const fold = window.innerHeight * 0.95;
      const all = Array.from(document.querySelectorAll<HTMLElement>(REVEAL)).filter((el) => !el.closest(SKIP) && !el.hasAttribute("data-rv"));
      const pending = all.filter((el) => el.getBoundingClientRect().top > fold);
      // A panel brings its own heading along: only the outermost element animates.
      const set = new Set(pending);
      const roots = pending.filter((el) => {
        for (let p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return false;
        return true;
      });
      for (const el of roots) el.setAttribute("data-rv", "");
      observer = new IntersectionObserver(
        (entries) => {
          const arriving = entries.filter((en) => en.isIntersecting).map((en) => en.target as HTMLElement);
          arriving.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          arriving.forEach((el, i) => {
            el.style.setProperty("--rv-i", String(Math.min(i, 6)));
            el.setAttribute("data-rv", "in");
            observer?.unobserve(el);
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
      );
      for (const el of roots) observer.observe(el);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      // Whatever never arrived is shown, so a quick navigation leaves nothing hidden.
      document.querySelectorAll('[data-rv=""]').forEach((el) => el.setAttribute("data-rv", "in"));
    };
  }, [pathname]);

  return null;
}
