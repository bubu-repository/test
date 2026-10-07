"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { MociAvatar } from "@/components/MociAvatar";
import type { Project } from "@/content/projects";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { bump, collect } from "@/lib/stickers";
import { think } from "../agent/brain";
import { streamFromApi, streamOfflineText } from "../agent/agent-store";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { BeforeAfter } from "./BeforeAfter";
import { CountUp } from "./CountUp";

type Beat = { ask: string; reply: ReactNode };

/** The scripted story: every number comes straight from the case study data. */
function buildBeats(project: Project, next: Project): Beat[] {
  return [
    {
      ask: `Tell me about ${project.name}.`,
      reply: (
        <>
          <p>{project.summary}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ["Role", project.role.title],
              ["Team", project.team],
              ["Timeline", project.timeline],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[14px] bg-surface-2 px-3 py-2">
                <dt className="text-12 text-muted">{k}</dt>
                <dd className="text-14 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      ),
    },
    {
      ask: "What problem were you solving?",
      reply: (
        <>
          <p>It arrived as a message, more or less word for word:</p>
          <blockquote className="mt-3 rounded-[16px] border-l-[3px] border-accent bg-surface-2 px-4 py-3 text-18 leading-snug font-semibold tracking-[-0.01em]">
            “{project.prompt}”<span className="mt-1 block text-12 font-normal text-muted">— {project.promptBy}</span>
          </blockquote>
          {project.problem.body.map((p) => (
            <p key={p} className="mt-3">
              {p}
            </p>
          ))}
          <p className="mt-3 text-14 text-muted">The constraints I had to design around:</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {project.problem.constraints.map((c) => (
              <li key={c} className="chip h-auto min-h-8 px-3 py-1 text-12 font-medium whitespace-normal">
                {c}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      ask: "What was your role?",
      reply: (
        <>
          <p className="font-semibold">{project.role.title}.</p>
          <p className="mt-2">{project.role.summary}</p>
          <p className="mt-4 text-14 font-semibold text-muted">The calls that were mine</p>
          <ul className="mt-2 space-y-2">
            {project.role.decisions.map((d) => (
              <li key={d} className="rounded-[16px] bg-surface-2 px-4 py-3 text-14">
                {d}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      ask: "How did it go, step by step?",
      reply: (
        <>
          <p>In {project.process.length} stages, from the first visit to the release:</p>
          <ol className="mt-4 space-y-2.5">
            {project.process.map((step, n) => (
              <li key={step.title} className="rounded-[16px] bg-surface-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="type-pixel text-accent-ink">
                    {n + 1}. {step.stage}
                  </span>
                  <span className="text-12 text-muted">{step.duration}</span>
                </div>
                <p className="mt-1.5 font-semibold">{step.title}</p>
                <p className="mt-0.5 text-14 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </>
      ),
    },
    {
      ask: "How does it all fit together?",
      reply: (
        <>
          <p>Here&apos;s the system. The moving dots are requests travelling through it.</p>
          <div className="mt-4">
            <ArchitectureDiagram project={project} />
          </div>
        </>
      ),
    },
    {
      ask: "What changed for the people using it?",
      reply: (
        <>
          <p>Drag the divider to compare their week before and after.</p>
          <div className="mt-4">
            <BeforeAfter data={project.beforeAfter} />
          </div>
        </>
      ),
    },
    {
      ask: "Did it work?",
      reply: (
        <>
          <p>The numbers, measured with the people using it:</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {project.results.metrics.map((m, n) => (
              <div key={m.label} className="rounded-[16px] bg-surface-2 px-4 py-3">
                <dt className="sr-only">{m.label}</dt>
                <dd>
                  <CountUp value={m.value} className={cn("block text-32 leading-none font-bold tracking-[-0.04em]", n === 0 && "iris-text w-fit")} />
                  <span className="mt-1 block text-14 text-muted" aria-hidden="true">
                    {m.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          {project.results.body.map((p) => (
            <p key={p} className="mt-3">
              {p}
            </p>
          ))}
          <blockquote className="mt-3 rounded-[16px] border-l-[3px] border-cobalt bg-surface-2 px-4 py-3 font-semibold">
            “{project.results.quote.text}”<span className="mt-1 block text-12 font-normal text-muted">— {project.results.quote.who}</span>
          </blockquote>
        </>
      ),
    },
    {
      ask: "What would you do differently?",
      reply: (
        <>
          <p className="text-18 leading-snug font-semibold tracking-[-0.01em]">{project.reflection}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.links.live && (
              <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="pill" data-size="sm" data-variant="magenta">
                Visit the live site ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            {project.links.repo && (
              <a href={project.links.repo} target="_blank" rel="noopener noreferrer" className="pill" data-size="sm">
                View the repo ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            <Link href={`/work/${next.slug}`} className="pill" data-size="sm" data-variant="ghost">
              Next: {next.name} <ArrowRightIcon width={14} height={14} />
            </Link>
          </div>
        </>
      ),
    },
  ];
}

/** Offline answers for the questions people ask most about a single project, straight from its data. */
function localAnswer(question: string, p: Project): string | null {
  const q = question.toLowerCase();
  if (/(how long|timeline|week|month|duration|deadline)/.test(q))
    return `${p.timeline}. The build ran in ${p.process.length} steps: ${p.process.map((st) => `${st.title.toLowerCase()} (${st.duration.toLowerCase()})`).join(", ")}.`;
  if (/(team|who else|alone|solo|by yourself|collaborat)/.test(q)) return `${p.team}. My part: ${p.role.title.toLowerCase()}. ${p.role.summary}`;
  if (/(stack|tech|built with|framework|language|database|model|llm)/.test(q)) return `The stack: ${p.stack.join(", ")}.`;
  if (/(result|impact|metric|number|did it work|outcome|success|users?)/.test(q)) return `${p.results.metrics.map((m) => `${m.value} ${m.label}`).join("; ")}. ${p.results.body[0] ?? ""}`;
  if (/(role|owned|responsib|what did you do)/.test(q)) return `${p.role.title}. ${p.role.summary}`;
  if (/(live|link|demo|repo|code|github|source|try it)/.test(q))
    return p.links.live
      ? `You can try it at ${p.links.live}${p.links.repo ? `, and the code is at ${p.links.repo}` : ""}.`
      : `It's in-house work under NDA, so there's no public link: ${p.company ?? ""}`;
  if (/(hard|difficult|challenge|lesson|learn|differently|mistake)/.test(q)) return p.reflection;
  if (/(problem|why|pain|before)/.test(q)) return p.problem.body.join(" ");
  return null;
}

type Entry =
  | { id: string; kind: "beat"; index: number }
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "live"; text: string; source: "claude" | "offline"; pending: boolean; href?: string };

export type CaseChatHandle = { ask: (question: string) => void };

let seq = 0;
const uid = () => `c${(seq++).toString(36)}`;

function Bubble({ who, children, tag }: { who: "adelia" | "moci" | "you"; children: ReactNode; tag?: string }) {
  if (who === "you") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-[22px_22px_6px_22px] bg-accent-strong px-4 py-2.5 text-16 text-on-accent">{children}</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      {who === "moci" ? (
        <MociAvatar size={34} className="mt-1" />
      ) : (
        <span aria-hidden="true" className="mt-1 grid size-[34px] shrink-0 place-items-center rounded-full bg-ink text-14 font-bold text-bg">
          A
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="mb-1 flex items-center gap-2 text-12 font-semibold text-muted">
          {who === "moci" ? "Moci" : "Adelia"}
          {tag && <span className="chip min-h-5 px-2 text-[11px]">{tag}</span>}
        </p>
        <div className="widget rounded-[6px_22px_22px_22px] px-4 py-3.5 text-16 leading-relaxed md:px-5 md:py-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * The case study as a conversation: the story unfolds one message at a time, the visitor decides
 * when to continue, and can ask their own questions anytime (answered live by Moci, or by the
 * offline brain when the API is down).
 */
export function CaseChat({
  project,
  next,
  firstQuestion,
  onReadAll,
  ref,
}: {
  project: Project;
  next: Project;
  /** When the visitor opened the chat by asking something, answer that first. */
  firstQuestion?: string;
  onReadAll: () => void;
  ref?: Ref<CaseChatHandle>;
}) {
  const [beats] = useState(() => buildBeats(project, next));
  const [initial] = useState(() => {
    if (firstQuestion) {
      const id = uid();
      return {
        liveId: id,
        typing: false,
        busy: true,
        entries: [
          { id: uid(), kind: "user", text: firstQuestion },
          { id, kind: "live", text: "", source: "claude", pending: true },
        ] as Entry[],
      };
    }
    return { liveId: null, typing: true, busy: false, entries: [{ id: uid(), kind: "user", text: beats[0].ask }] as Entry[] };
  });
  const [entries, setEntries] = useState<Entry[]>(initial.entries);
  const [typing, setTyping] = useState(initial.typing);
  const [busy, setBusy] = useState(initial.busy);
  const [draft, setDraft] = useState("");
  const shown = entries.filter((e) => e.kind === "beat").length;
  const done = shown >= beats.length;
  const logRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollToLast = () =>
    requestAnimationFrame(() => {
      const last = logRef.current?.lastElementChild as HTMLElement | null;
      last?.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "nearest" });
    });

  const finishBeat = (index: number) => {
    setTyping(false);
    setEntries((list) => [...list, { id: uid(), kind: "beat", index }]);
    sfx.pop();
    scrollToLast();
    if (index === beats.length - 1) collect("cases", project.slug, 3, "collector");
  };

  const reveal = (index: number) => {
    setEntries((list) => [...list, { id: uid(), kind: "user", text: beats[index].ask }]);
    setTyping(true);
    scrollToLast();
    window.setTimeout(() => finishBeat(index), calm() ? 60 : 650);
  };

  const runAsk = async (id: string, q: string) => {
    const patch = (fn: (e: Extract<Entry, { kind: "live" }>) => Partial<Extract<Entry, { kind: "live" }>>) =>
      setEntries((list) => list.map((e) => (e.id === id && e.kind === "live" ? { ...e, ...fn(e) } : e)));
    try {
      await streamFromApi([{ role: "user", content: `${q}\n\n(Asked on the ${project.name} case study.)` }], window.location.pathname, {
        onText: (v) => patch((e) => ({ text: e.text + v })),
        onTool: (action) => void dispatch(action),
      });
    } catch {
      // The API is unavailable: the offline brain answers from the same facts.
      const local = localAnswer(q, project);
      const answer = local ? { text: local, href: undefined } : think(`${q} ${project.name}`);
      const href = answer.href && answer.href !== window.location.pathname ? answer.href : undefined;
      patch(() => ({ text: "", source: "offline", href }));
      await streamOfflineText(answer.text, (v) => patch((e) => ({ text: e.text + v })));
    } finally {
      patch(() => ({ pending: false }));
      setBusy(false);
      scrollToLast();
    }
  };

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    bump("questions", 9999, "curious");
    setBusy(true);
    const id = uid();
    setEntries((list) => [...list, { id: uid(), kind: "user", text: q }, { id, kind: "live", text: "", source: "claude", pending: true }]);
    scrollToLast();
    void runAsk(id, q);
  };

  // The conversation starts on its own: the first scripted message, or the visitor's question.
  const start = useEffectEvent(() => {
    if (started.current) return;
    started.current = true;
    if (initial.liveId && firstQuestion) void runAsk(initial.liveId, firstQuestion);
    else window.setTimeout(() => finishBeat(0), calm() ? 60 : 650);
  });
  useEffect(() => start(), []);

  useImperativeHandle(ref, () => ({ ask }));

  return (
    <section aria-label={`${project.name}, told as a conversation`} className="mx-auto w-full max-w-[760px]" data-xr="CaseChat · scripted story + live answers">
      <div className="mb-6 flex items-center gap-3" aria-hidden="true">
        <div className="h-1 flex-1 overflow-hidden rounded-pill bg-surface-2">
          <div className="h-full rounded-pill bar-fill transition-[width] duration-500" style={{ width: `${(shown / beats.length) * 100}%` }} />
        </div>
        <span className="text-12 font-semibold text-muted tabular-nums">
          {shown}/{beats.length}
        </span>
      </div>

      <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" className="space-y-5">
        {entries.map((e) =>
          e.kind === "user" ? (
            <div key={e.id} className="scroll-mt-28">
              <Bubble who="you">{e.text}</Bubble>
            </div>
          ) : e.kind === "beat" ? (
            <div key={e.id} className="scroll-mt-28">
              <Bubble who="adelia" tag="Verified">
                {beats[e.index].reply}
              </Bubble>
            </div>
          ) : (
            <div key={e.id} className="scroll-mt-28">
              <Bubble who="moci" tag={e.pending ? "Thinking…" : e.source === "claude" ? "Live" : "Offline brain"}>
                <p className="whitespace-pre-line">{e.text || "…"}</p>
                {e.href && !e.pending && (
                  <Link href={e.href} className="link-arrow mt-2 text-14">
                    Open the page
                  </Link>
                )}
              </Bubble>
            </div>
          ),
        )}
        {typing && (
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="grid size-[34px] place-items-center rounded-full bg-ink text-14 font-bold text-bg">A</span>
            <span className="widget flex gap-1 rounded-pill px-4 py-3">
              {[0, 0.15, 0.3].map((d) => (
                <span key={d} className="size-1.5 rounded-full bg-muted motion-safe:animate-[float-y_0.8s_ease-in-out_infinite]" style={{ animationDelay: `${d}s` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {!done ? (
          <button
            type="button"
            className="pill"
            data-variant="ink"
            data-tour="case-next"
            disabled={typing}
            onClick={() => {
              sfx.tick();
              reveal(shown);
            }}
          >
            {beats[shown]?.ask} <ArrowRightIcon width={16} height={16} />
          </button>
        ) : (
          <p className="text-14 text-muted">That&apos;s the whole story. Ask anything else below.</p>
        )}
        <button type="button" className="link-arrow ml-2 text-14" onClick={onReadAll}>
          Read it all as an article
        </button>
      </div>

      <form
        className="mt-6 flex items-center gap-2 rounded-pill border border-line bg-glass-strong py-1.5 pr-1.5 pl-5 shadow-sm focus-within:border-accent"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
          setDraft("");
        }}
      >
        <label htmlFor={`chat-${project.slug}`} className="sr-only">
          Ask your own question about {project.name}
        </label>
        <input
          id={`chat-${project.slug}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Ask your own question about ${project.name}`}
          className="min-w-0 flex-1 bg-transparent py-2 text-16 outline-none placeholder:text-muted"
          autoComplete="off"
        />
        <button type="submit" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-bg disabled:opacity-40" aria-label="Send" disabled={!draft.trim() || busy}>
          <ArrowRightIcon width={18} height={18} className="-rotate-90" />
        </button>
      </form>
    </section>
  );
}
