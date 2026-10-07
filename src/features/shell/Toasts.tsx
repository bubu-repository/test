"use client";

import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { dismissToast, useUI } from "@/lib/ui";

const TONE: Record<string, string> = {
  magenta: "bg-accent",
  lime: "bg-lime",
  sun: "bg-sun",
  sky: "bg-sky",
  violet: "bg-violet",
  mint: "bg-mint",
};

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed bottom-3 left-3 z-[80] flex w-[min(380px,calc(100vw-24px))] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="widget pop-in pointer-events-auto flex items-start gap-3 rounded-[22px] p-3 pr-2" role="status">
          {t.icon && (
            <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-full text-20 shadow-[0_0_0_3px_#fff]", TONE[t.tone ?? "magenta"])}>
              {t.icon}
            </span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-semibold leading-snug">{t.title}</p>
            {t.body && <p className="mt-0.5 text-14 text-muted">{t.body}</p>}
          </div>
          <button type="button" onClick={() => dismissToast(t.id)} className="pill" data-variant="ghost" data-shape="icon" data-size="sm" aria-label="Dismiss">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
