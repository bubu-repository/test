"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name. Use labelledBy when a visible heading exists. */
  label?: string;
  labelledBy?: string;
  className?: string;
  /** Where the panel sits: centred card, top (palette), bottom drawer (terminal), or glance (a window nearly as big as the viewport). */
  placement?: "center" | "top" | "bottom" | "glance";
  children: ReactNode;
};

/**
 * Modal built on the native <dialog>: focus is trapped, the page behind is inert, Esc closes,
 * and focus returns to the opener. Clicking the backdrop closes it too. It leaves the way it came:
 * the panel sinks and fades for 160ms before the dialog really closes (instantly under reduced motion).
 */
export function Dialog({ open, onClose, label, labelledBy, className, placement = "center", children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Whether the contents are on screen: true while open, and through the closing animation.
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      delete dialog.dataset.closing;
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.close();
      setTimeout(() => setShown(false));
      return;
    }
    dialog.dataset.closing = "";
    const timer = window.setTimeout(() => {
      delete dialog.dataset.closing;
      dialog.close();
      setShown(false);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Close if this component unmounts while open (navigation with Activity, HMR).
  useLayoutEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      data-placement={placement}
      className={cn("site-dialog", className)}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        // The close event arrives a task later. If the dialog has been shown again since (a
        // remount, or React re-running effects in development), that close is stale: ignore it.
        if (open && !ref.current?.open) onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open || shown ? children : null}
    </dialog>
  );
}
