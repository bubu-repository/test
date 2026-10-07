"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name. Use labelledBy when a visible heading exists. */
  label?: string;
  labelledBy?: string;
  className?: string;
  /** Where the panel sits: centred card, top (palette), or bottom drawer (terminal). */
  placement?: "center" | "top" | "bottom";
  children: ReactNode;
};

/**
 * Modal built on the native <dialog>: focus is trapped, the page behind is inert, Esc closes,
 * and focus returns to the opener. Clicking the backdrop closes it too.
 */
export function Dialog({ open, onClose, label, labelledBy, className, placement = "center", children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
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
        if (open) onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}
