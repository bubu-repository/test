"use client";

import { ViewTransition, useRef, useState, type ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";
import type { Project } from "@/content/projects";
import { sfx } from "@/lib/sound";
import { PageHeader } from "@/components/PageHeader";
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
      <PageHeader
        id="case-title"
        label={`Case study ${pad(index)} of ${pad(total)}`}
        top={
          <ViewTransition name={`card-${project.slug}`} share="card-morph" default="none">
            <div className="mx-auto mb-6 w-fit">
              <ProjectIcon project={project} size={84} />
            </div>
          </ViewTransition>
        }
        title={
          <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {project.name}
            <span className="chip min-h-7 translate-y-1 px-3 text-12 font-semibold tracking-normal text-ink">Shipped · {project.year}</span>
          </span>
        }
        lead={project.tagline}
      >
        <p className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-16">
          <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="link-arrow">
            Visit the live site<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href={project.links.repo} target="_blank" rel="noopener noreferrer" className="link-arrow">
            View the repo<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>

        {/* The console: one box to ask anything, and two keys for how to take it in. */}
        <div className="js-only device mx-auto mt-12 max-w-[760px] text-left text-ink" data-xr="CaseStudyShell · ask box + two ways in, as a console">
          <div className="flex items-center gap-3 px-2 pb-3">
            <span className="led" aria-hidden="true" />
            <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">Ask anything · or pick a way in</span>
            <span className="grille ml-auto hidden h-4 w-14 sm:block" aria-hidden="true" />
          </div>
          <form
            className="well flex items-center gap-2 rounded-pill py-2 pr-2 pl-6 focus-within:shadow-[var(--recess),0_0_0_3px_color-mix(in_srgb,var(--accent)_30%,transparent)]"
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
            <button type="submit" aria-label="Ask" disabled={!draft.trim()} className="pill size-11 shrink-0 p-0" data-variant="magenta" data-shape="icon">
              <ArrowRightIcon width={20} height={20} className="-rotate-90" />
            </button>
          </form>
          <p className="mt-3 px-2 text-12 text-muted">The scripted part of the conversation carries the verified numbers. Live answers only use facts from this site.</p>

          <div role="group" aria-label="How do you want to read it?" className="mt-5 grid gap-3 sm:grid-cols-2">
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
                  className="mode-key rounded-[20px] p-5 text-left"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-18 font-semibold tracking-[-0.015em]">{m.title}</span>
                    <span aria-hidden="true" className="led" data-off={!on} style={on ? { ["--led-color" as string]: "var(--accent)" } : undefined} />
                  </span>
                  <span className="mt-1.5 block text-14 leading-relaxed text-muted">{m.body}</span>
                </button>
              );
            })}
          </div>
        </div>
      </PageHeader>

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
