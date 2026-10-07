"use client";

import { ViewTransition, useRef, useState, type ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { ProjectIcon } from "../work/ProjectIcon";
import { CaseChat, type CaseChatHandle } from "./CaseChat";

type Mode = "read" | "chat";

/**
 * The case study's front door: a quiet centred intro, one box to ask anything about the project,
 * and a choice of how to take it in. "Chat through it" tells the story message by message;
 * "Read the full case study" is the article, server-rendered underneath (so it works without JS).
 */
export function CaseStudyShell({ project, next, index, total, children }: { project: Project; next: Project; index: number; total: number; children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("read");
  const [opened, setOpened] = useState(false);
  const [firstQuestion, setFirstQuestion] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const chatRef = useRef<CaseChatHandle>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const go = (next: Mode, question?: string) => {
    sfx.tick();
    if (next === "chat" && !opened) {
      setFirstQuestion(question);
      setOpened(true);
    } else if (question) chatRef.current?.ask(question);
    setMode(next);
    requestAnimationFrame(() => bodyRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <header className="container-page pt-36 text-center md:pt-44" data-xr="CaseStudyShell · ask box + two ways in">
        <ViewTransition name={`card-${project.slug}`} share="card-morph" default="none">
          <div className="mx-auto w-fit">
            <ProjectIcon project={project} size={84} />
          </div>
        </ViewTransition>
        <p className="mt-8 text-12 font-semibold tracking-[0.2em] text-muted uppercase">
          Case study {pad(index)} of {pad(total)}
        </p>
        <h1 className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[clamp(44px,6.4vw,80px)] leading-none font-bold tracking-[-0.045em]">
          {project.name}
          <span className="chip min-h-7 translate-y-1 px-3 text-12 font-semibold tracking-normal">
            Shipped · {project.year}
          </span>
        </h1>
        <p className="type-lead mx-auto mt-5 max-w-[38ch] text-muted">{project.tagline}</p>
        <p className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-16">
          <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="link-arrow">
            Visit the live site<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href={project.links.repo} target="_blank" rel="noopener noreferrer" className="link-arrow">
            View the repo<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>

        <div className="js-only mx-auto mt-12 max-w-[760px]">
          <form
            className="flex items-center gap-2 rounded-pill border border-line bg-glass-strong py-2 pr-2 pl-6 shadow-[0_10px_30px_rgba(16,18,40,0.08)] backdrop-blur-xl focus-within:border-accent"
            onSubmit={(e) => {
              e.preventDefault();
              const q = draft.trim();
              if (!q) return;
              setDraft("");
              go("chat", q);
            }}
          >
            <label htmlFor={`ask-${project.slug}`} className="sr-only">
              Ask anything about {project.name}
            </label>
            <input
              id={`ask-${project.slug}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything about this project"
              className="min-w-0 flex-1 bg-transparent py-2 text-18 outline-none placeholder:text-muted"
              autoComplete="off"
            />
            <button type="submit" aria-label="Ask" disabled={!draft.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-bg transition-opacity disabled:opacity-35">
              <ArrowRightIcon width={20} height={20} className="-rotate-90" />
            </button>
          </form>
          <p className="mt-3 text-12 text-muted">The scripted part of the conversation carries the verified numbers. Live answers only use facts from this site.</p>

          <div role="group" aria-label="How do you want to read it?" className="mt-10 grid gap-4 text-left sm:grid-cols-2">
            {(
              [
                { id: "chat", title: "Chat through it", body: "The story unfolds message by message. You decide when to continue, and you can ask your own questions anytime." },
                { id: "read", title: "Read the full case study", body: "Everything on one page: problem, role, process, architecture and results. Scroll it like an article." },
              ] as const
            ).map((m) => {
              const on = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  data-tour={m.id === "chat" ? "case-chat" : undefined}
                  aria-pressed={on}
                  onClick={() => go(m.id)}
                  className={cn(
                    "rounded-[22px] border p-5 text-left transition-[background-color,border-color,box-shadow] duration-300 md:p-6",
                    on ? "border-cobalt/35 bg-cobalt/[0.06] shadow-[0_0_0_4px_color-mix(in_srgb,var(--cobalt)_8%,transparent)]" : "border-line bg-glass hover:border-ink/15",
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-18 font-semibold tracking-[-0.015em]">{m.title}</span>
                    <span aria-hidden="true" className={cn("grid size-5 place-items-center rounded-full border-2", on ? "border-cobalt bg-cobalt" : "border-line")}>
                      {on && <span className="size-1.5 rounded-full bg-white" />}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-14 leading-relaxed text-muted">{m.body}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div ref={bodyRef} className="scroll-mt-24 pt-16 md:pt-24">
        {opened && (
          <div className="container-page pb-8" hidden={mode !== "chat"}>
            <CaseChat ref={chatRef} project={project} next={next} firstQuestion={firstQuestion} onReadAll={() => go("read")} />
          </div>
        )}
        <div hidden={mode === "chat"}>{children}</div>
      </div>
    </>
  );
}
