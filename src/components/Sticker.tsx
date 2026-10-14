"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { STICKER_ART } from "./StickerArt";

type StickerProps = {
  /** Which sticker (its id in the sticker book). */
  id: string;
  size?: number;
  locked?: boolean;
  /** A locked secret: a dashed outline and a question mark instead of its shape. */
  mystery?: boolean;
  className?: string;
};

/**
 * A die-cut vinyl sticker: the illustration, a thick white edge cut around its silhouette, a thin
 * grey edge underneath where the vinyl has thickness, and a soft shadow. The edge comes from an SVG
 * filter that grows the silhouette and rounds it off, so every drawing gets its own cut line.
 * A locked sticker is its own silhouette pressed into the page, so you can see the shape of what's
 * missing; a locked secret is a dashed outline with a question mark.
 */
export function Sticker({ id, size = 72, locked = false, mystery = false, className }: StickerProps) {
  const uid = useId();
  const filter = `${uid}cut`;
  const ghost = `${uid}ghost`;
  return (
    <span aria-hidden="true" className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0 overflow-visible">
        {locked && !mystery ? (
          <>
            <defs>
              <filter id={ghost} x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
                <feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="grown" />
                <feGaussianBlur in="grown" stdDeviation="1.6" result="soft" />
                <feComponentTransfer in="soft" result="cut">
                  <feFuncA type="linear" slope="6" intercept="-1.8" />
                </feComponentTransfer>
                <feFlood floodColor="#DCE6F1" result="paper" />
                <feComposite in="paper" in2="cut" operator="in" result="bed" />
                <feOffset in="cut" dy="-1.5" result="up" />
                <feComposite in="cut" in2="up" operator="out" result="lip" />
                <feFlood floodColor="#FFFFFF" result="white" />
                <feComposite in="white" in2="lip" operator="in" result="light" />
                <feFlood floodColor="#B8C9DE" result="slate" />
                <feComposite in="slate" in2="SourceAlpha" operator="in" result="shape" />
                <feMerge>
                  <feMergeNode in="bed" />
                  <feMergeNode in="light" />
                  <feMergeNode in="shape" />
                </feMerge>
              </filter>
            </defs>
            <g filter={`url(#${ghost})`} opacity=".85">
              {STICKER_ART[id] ?? STICKER_ART.hello}
            </g>
          </>
        ) : locked ? (
          <>
            <circle cx="50" cy="50" r="38" fill="none" stroke="color-mix(in srgb, var(--ink) 30%, transparent)" strokeWidth="3" strokeDasharray="6 6" />
            <text x="50" y="62" textAnchor="middle" fontSize="34" fontWeight="700" fill="var(--muted)" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
              ?
            </text>
          </>
        ) : (
          <>
            <defs>
              <filter id={filter} x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
                <feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="grown" />
                <feGaussianBlur in="grown" stdDeviation="1.6" result="soft" />
                <feComponentTransfer in="soft" result="cut">
                  <feFuncA type="linear" slope="6" intercept="-1.8" />
                </feComponentTransfer>
                <feFlood floodColor="#FFFFFF" result="white" />
                <feComposite in="white" in2="cut" operator="in" result="edge" />
                <feOffset in="cut" dy="2.2" result="cutDown" />
                <feFlood floodColor="#C7D0DE" result="grey" />
                <feComposite in="grey" in2="cutDown" operator="in" result="thickness" />
                <feGaussianBlur in="cutDown" stdDeviation="3.2" result="blur" />
                <feOffset in="blur" dy="2.5" result="blurDown" />
                <feFlood floodColor="#0F1230" floodOpacity="0.24" result="ink" />
                <feComposite in="ink" in2="blurDown" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="thickness" />
                  <feMergeNode in="edge" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g filter={`url(#${filter})`}>{STICKER_ART[id] ?? STICKER_ART.hello}</g>
          </>
        )}
      </svg>
    </span>
  );
}
