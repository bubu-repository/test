"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, RefreshIcon, SendIcon } from "@/components/icons";
import { MociAvatar } from "@/components/MociAvatar";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { ui, useUI } from "@/lib/ui";
import { defaultFollowups } from "./brain";
import { askAgent, resetAgent, useAgent } from "./agent-store";

/**
 * Moci's chat. A non-modal panel: the page stays usable, because Moci can act on it
 * (navigate, switch theme, start the tour) while you watch.
 */
export function AgentPanel() {
  const open = useUI((s) => s.agentOpen);
  const messages = useAgent((s) => s.messages);
  const busy = useAgent((s) => s.busy);
  const mode = useAgent((s) => s.mode);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    } else if (openerRef.current instanceof HTMLElement) {
      openerRef.current.focus({ preventScroll: true });
      openerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  const close = () => ui.set({ agentOpen: false });
  const send = (text: string) => {
    if (!text.trim() || busy) return;
    setDraft("");
    void askAgent(text);
  };

  const status =
    mode === "online" ? { label: "Claude · online", tone: "bg-lime" } : mode === "offline" ? { label: "Offline brain", tone: "bg-sun" } : { label: "Ready", tone: "bg-sky" };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
      data-xr="AgentPanel · Claude tool use + offline fallback"
      className="widget pop-in fixed inset-x-2 bottom-2 z-[70] flex max-h-[min(86dvh,680px)] flex-col overflow-hidden md:inset-x-auto md:right-5 md:bottom-5 md:w-[420px]"
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <MociAvatar size={40} mood={busy ? "think" : "happy"} />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-20 leading-none font-bold">
            Moci
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-12 text-muted">
            <span className={cn("size-2 rounded-full", status.tone)} aria-hidden="true" />
            Adelia&apos;s agent · <span>{status.label}</span>
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="pill" data-variant="ghost" data-shape="icon" data-size="sm" onClick={resetAgent} aria-label="New conversation">
            <RefreshIcon width={18} height={18} />
          </button>
        )}
        <button type="button" className="pill" data-variant="ghost" data-shape="icon" data-size="sm" onClick={close} aria-label="Close Moci">
          <CloseIcon width={18} height={18} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite" aria-busy={busy}>
        {messages.length === 0 && (
          <div className="rounded-[18px] border border-line bg-surface-2 p-4">
            <p className="font-display text-24 leading-tight font-bold">Hi! I&apos;m Moci.</p>
            <p className="mt-2 text-14 text-ink">
              I know Adelia&apos;s projects, skills and this whole site. I can also open pages, switch the sky or give you a tour.
            </p>
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-[20px_20px_6px_20px] bg-accent-strong px-4 py-2.5 text-16 text-on-accent">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2.5">
              <MociAvatar size={28} mood={m.pending && !m.text ? "think" : "happy"} className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="rounded-[6px_20px_20px_20px] bg-surface-2 px-4 py-2.5 text-16 leading-relaxed">
                  {m.text || (
                    <span className="inline-flex gap-1" aria-label="Moci is thinking">
                      <span className="size-1.5 motion-safe:animate-[float-y_0.8s_ease-in-out_infinite] rounded-full bg-accent" />
                      <span className="size-1.5 motion-safe:animate-[float-y_0.8s_0.15s_ease-in-out_infinite] rounded-full bg-accent" />
                      <span className="size-1.5 motion-safe:animate-[float-y_0.8s_0.3s_ease-in-out_infinite] rounded-full bg-accent" />
                    </span>
                  )}
                </div>
                {m.tools.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Actions Moci took">
                    {m.tools.map((t, i) => (
                      <li key={i} className="chip font-mono" data-tone={t.done ? "sky" : undefined}>
                        {t.done ? "✓" : "…"} {t.label}
                      </li>
                    ))}
                  </ul>
                )}
                {!m.pending && m.source && (
                  <p className="type-pixel mt-1.5 text-muted">{m.source === "claude" ? "Answered by Claude" : "Answered offline"}</p>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="border-t border-line px-3 pt-2.5 pb-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(messages.at(-1)?.followups.length ? messages.at(-1)!.followups : messages.length ? [] : defaultFollowups).map((f) => (
            <button
              key={f}
              type="button"
              disabled={busy}
              onClick={() => (f === "Give me the tour" ? dispatch({ type: "tour" }) : send(f))}
              className="pill"
              data-variant={f.startsWith("Open") || f === "Give me the tour" ? "sun" : undefined}
              data-size="sm"
            >
              {f}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2 rounded-pill border border-line bg-surface-2 py-1 pr-1 pl-4 focus-within:border-accent"
        >
          <label htmlFor={`${titleId}-q`} className="sr-only">
            Ask Moci about Adelia&apos;s work
          </label>
          <input
            id={`${titleId}-q`}
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about projects, skills, availability…"
            maxLength={600}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 text-16 outline-none placeholder:text-muted"
          />
          <button type="submit" disabled={busy || !draft.trim()} className="pill" data-variant="magenta" data-shape="icon" data-size="sm" aria-label="Send">
            <SendIcon width={18} height={18} />
          </button>
        </form>
        <p className="mt-2 px-1 text-12 text-muted">Moci can act on this page: open projects, switch the sky, start the tour.</p>
      </div>
    </section>
  );
}
