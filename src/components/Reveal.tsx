"use client";

import { Children, useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

type RevealProps = {
  /** Wrapper element, e.g. "ul" for a list. */
  as?: ElementType;
  /** Element wrapping each child, e.g. "li". */
  itemAs?: ElementType;
  className?: string;
  itemClassName?: string;
  children: ReactNode;
};

/**
 * Entrance wrapper (spec §5, §8.14): each child fades up 12px the first time it is seen,
 * staggered 50ms within the batch that enters together. CSS lives in globals.css.
 *
 * - No JS: everything is visible (the hidden state needs `scripting: enabled`).
 * - Reduced motion: a 150ms fade, no transform, no stagger.
 * - Do not wrap LCP / above-the-fold hero content: it would wait for hydration.
 */
export function Reveal({ as: Tag = "div", itemAs: Item = "div", className, itemClassName, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.setAttribute("data-reveal-ready", "");

    const items = Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-reveal-item]:not([data-revealed])"));
    if (items.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      for (const item of items) item.setAttribute("data-revealed", "");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target as HTMLElement)
          .sort((a, b) => items.indexOf(a) - items.indexOf(b));
        entering.forEach((item, batchIndex) => {
          item.style.setProperty("--reveal-i", String(batchIndex));
          item.setAttribute("data-revealed", "");
          observer.unobserve(item);
        });
      },
      { rootMargin: "0px 0px 15% 0px", threshold: 0 },
    );

    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} data-reveal="" className={className}>
      {Children.toArray(children).map((child, index) => (
        <Item
          key={(child as { key?: string | null }).key ?? index}
          data-reveal-item=""
          className={itemClassName}
          style={{ "--reveal-i": 0 } as CSSProperties}
        >
          {child}
        </Item>
      ))}
    </Tag>
  );
}
