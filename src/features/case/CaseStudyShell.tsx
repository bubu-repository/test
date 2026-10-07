"use client";

import { ViewTransition, useRef, useState, type ReactNode } from "react";
import type { Project } from "@/content/projects";
import { sfx } from "@/lib/sound";
import { PageHeader } from "@/components/PageHeader";
import { ProjectIcon } from "../work/ProjectIcon";
import { CaseChat, type CaseChatHandle } from "./CaseChat";

type Mode = "read" | "chat";

/**
 * The case study's front door: a quiet centred intro and the cover (shipped screens and the short
 * version), then the article itself, server-rendered (so it works without JS). At the end, the
 * same story as a conversation: "Chat through it" tells it message by message and takes questions.
 */
export function CaseStudyShell({ project, next, index, total, cover, children }: { project: Project; next: Project; index: number; total: number; cover?: ReactNode; children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("read");
  const [opened, setOpened] = useState(false);
  const [firstQuestion, setFirstQuestion] = useState<string | undefined>();
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
          {project.links.live ? (
            <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="link-arrow">
              Try the live product<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="max-w-[60ch] text-14 text-muted">{project.company}</span>
          )}
        </p>
      </PageHeader>

      {cover}

      <div ref={bodyRef} className="scroll-mt-24 pt-16 md:pt-24">
        {opened && (
          <div className="container-page pb-8" hidden={mode !== "chat"}>
            <CaseChat ref={chatRef} project={project} next={next} firstQuestion={firstQuestion} onReadAll={() => go("read")} />
          </div>
        )}
        <div hidden={mode === "chat"}>{children}</div>
      </div>

      {/* After the article: the same story as a conversation, for people who'd rather ask. */}
      {mode === "read" && (
        <div className="js-only container-page pb-16">
          <div className="widget mx-auto flex max-w-[860px] flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-7">
            <div>
              <p className="text-18 font-bold tracking-[-0.02em]">Rather ask than read?</p>
              <p className="mt-1 text-14 text-muted">Moci tells this case as a conversation, with the same numbers, and takes your questions.</p>
            </div>
            <button type="button" className="pill shrink-0" data-tour="case-chat" onClick={() => go("chat")}>
              Chat through {project.name}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
