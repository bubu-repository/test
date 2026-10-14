"use client";

import { useEffect, useState } from "react";
import { identity } from "@/content/profile";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { toast } from "@/lib/ui";
import { CheckIcon, CopyIcon } from "./icons";

/**
 * One-click email copy with feedback: the label flips to "Copied", a toast confirms it, and a
 * polite live region announces it. Without JS the mailto link next to it still works.
 */
export function CopyEmail({ className, variant = "primary", size, label = "Copy email", tour = false }: { className?: string; variant?: string; size?: "sm" | "lg"; label?: string; tour?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState("idle"), 2200);
    return () => window.clearTimeout(t);
  }, [state]);

  return (
    <>
      <button
        type="button"
        data-tour={tour ? "email" : undefined}
        className={cn("pill js-only", className)}
        data-variant={state === "copied" ? "lime" : variant}
        data-size={size}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(identity.email);
            setState("copied");
            sfx.success();
            toast({ title: "Email copied", body: identity.email, tone: "lime", icon: "✉️" });
          } catch {
            setState("failed");
            sfx.bump();
          }
        }}
      >
        {state === "copied" ? <CheckIcon width={18} height={18} /> : <CopyIcon width={18} height={18} />}
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed, use the link" : label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? `Email address copied: ${identity.email}` : state === "failed" ? "Couldn't copy. Use the email link instead." : ""}
      </span>
    </>
  );
}
