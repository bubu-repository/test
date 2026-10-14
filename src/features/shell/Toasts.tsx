"use client";

import { Sticker } from "@/components/Sticker";
import { CloseIcon } from "@/components/icons";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { dismissToast, holdToast, releaseToast, useUI } from "@/lib/ui";

/** One quiet dot in the toast's tone; a sticker toast shows the sticker itself, peeling in. */
const TONE: Record<string, string> = {
  accent: "bg-accent text-accent",
  lime: "bg-green text-green",
  sun: "bg-sun text-sun",
  sky: "bg-sky text-sky",
  violet: "bg-violet text-violet",
  mint: "bg-mint text-mint",
};

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed bottom-3 left-3 z-[80] flex w-[min(380px,calc(100vw-24px))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast widget pop-in pointer-events-auto flex items-start gap-3 rounded-[22px] p-3 pr-2"
          role="status"
          data-holo={t.holo || undefined}
          data-leaving={t.leaving || undefined}
          onPointerEnter={() => holdToast(t.id)}
          onPointerLeave={() => releaseToast(t.id)}
          onFocus={() => holdToast(t.id)}
          onBlur={() => releaseToast(t.id)}
        >
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center">
            {t.sticker ? <Sticker id={t.sticker} size={48} className="toast__sticker" /> : <span className={cn("size-3 rounded-full shadow-[0_0_0_4px_color-mix(in_srgb,currentColor_14%,transparent)]", TONE[t.tone ?? "accent"])} />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="leading-snug font-semibold">{t.title}</p>
            {t.body && <p className="mt-0.5 text-14 text-muted">{t.body}</p>}
            {t.action && (
              <button
                type="button"
                className="link-arrow mt-1 text-14"
                onClick={() => {
                  void dispatch(t.action!.run);
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
          <button type="button" onClick={() => dismissToast(t.id)} className="pill" data-variant="ghost" data-shape="icon" data-size="sm" aria-label="Dismiss">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
