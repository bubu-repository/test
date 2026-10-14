"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { SearchIcon, SendIcon } from "@/components/icons";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { fuzzyScore } from "@/lib/fuzzy";
import { sfx } from "@/lib/sound";
import { ui, useUI } from "@/lib/ui";
import { projects } from "@/content/projects";
import { think, type BrainAnswer } from "../agent/brain";
import { BoxArt, CvArt, FishArt, HelpArt, IdCardArt, MociArt, SparkleArt, TILE } from "../shell/DockIcons";
import { ProjectIcon } from "../work/ProjectIcon";
import { commands, type Command, type CommandGroup } from "./commands";
import { paletteStore, usePalette } from "./palette-store";

const GROUP_ORDER: (CommandGroup | "Ask")[] = ["Ask", "Navigate", "Projects", "Actions", "Lens", "Lab", "Settings"];

type Item = { kind: "command"; command: Command; score: number } | { kind: "ask"; question: string };

const ART = { work: BoxArt, lab: SparkleArt, about: IdCardArt, guestbook: FishArt, moci: MociArt, cv: CvArt, help: HelpArt };

/** The row's icon: the project's own app icon, the dock's icon for the same place, or a small printed key. */
function CommandIcon({ command, selected }: { command: Command; selected: boolean }) {
  const project = command.project ? projects.find((p) => p.slug === command.project) : undefined;
  if (project) return <ProjectIcon project={project} size={32} />;
  if (command.art) {
    const Art = ART[command.art];
    return (
      <span aria-hidden="true" className="palette-art" style={{ background: command.art === "lab" ? TILE.azure : TILE.white }}>
        <Art />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="palette-key" data-on={selected}>
      {command.icon}
    </span>
  );
}

function looksLikeQuestion(q: string) {
  return /\?\s*$/.test(q) || /^(who|what|what's|whats|where|when|why|how|is|are|can|could|does|do|did|tell|which|should|would|will|has|have)\b/i.test(q.trim());
}

function rank(query: string): Item[] {
  const q = query.trim();
  const scored = commands
    .map((command) => {
      const title = fuzzyScore(q, command.title);
      const rest = fuzzyScore(q, `${command.subtitle ?? ""} ${command.keywords ?? ""} ${command.group}`);
      return { kind: "command" as const, command, score: Math.max(title * 1.4, rest * 0.8) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => (q ? b.score - a.score : GROUP_ORDER.indexOf(a.command.group) - GROUP_ORDER.indexOf(b.command.group)));

  if (!q) return scored;
  const items: Item[] = scored.slice(0, 12);
  const ask: Item = { kind: "ask", question: q };
  if (looksLikeQuestion(q) || items.length === 0 || (items[0].kind === "command" && items[0].score < 60)) items.unshift(ask);
  else items.push(ask);
  return items;
}

export function CommandPalette() {
  const open = useUI((s) => s.overlay === "palette");
  const query = usePalette((s) => s.query);
  const active = usePalette((s) => s.active);
  const submitNonce = usePalette((s) => s.submitNonce);
  const [answer, setAnswer] = useState<{ question: string; result: BrainAnswer } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const titleId = `${baseId}-title`;

  const items = useMemo(() => rank(query), [query]);
  const headers = useMemo(() => {
    if (query.trim()) return items.map(() => null);
    return items.map((item, i) => {
      const group = item.kind === "ask" ? "Ask" : item.command.group;
      const prev = items[i - 1];
      const prevGroup = prev ? (prev.kind === "ask" ? "Ask" : prev.command.group) : null;
      return group !== prevGroup ? group : null;
    });
  }, [items, query]);
  const activeIndex = Math.min(active, Math.max(0, items.length - 1));

  // Mounted fresh on every open: clear the query and focus the input.
  useEffect(() => {
    paletteStore.set({ query: "", active: 0 });
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const close = () => ui.set({ overlay: null });

  const run = (item: Item | undefined) => {
    if (!item) return;
    sfx.pop();
    if (item.kind === "ask") {
      const result = think(item.question);
      setAnswer({ question: item.question, result });
      for (const action of result.actions) {
        if (action.type === "navigate" || action.type === "tour") close();
        void dispatch(action);
      }
      return;
    }
    const { command } = item;
    close();
    if ("external" in command) window.open(command.external, "_blank", "noopener");
    else void dispatch(command.action);
  };

  // The tour (or anything else) can press Enter programmatically.
  const lastNonce = useRef(submitNonce);
  useEffect(() => {
    if (submitNonce !== lastNonce.current) {
      lastNonce.current = submitNonce;
      run(items[activeIndex]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitNonce]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const move = (delta: number) => {
      event.preventDefault();
      paletteStore.set({ active: (activeIndex + delta + items.length) % Math.max(1, items.length) });
      sfx.tick();
    };
    if (event.key === "ArrowDown") move(1);
    else if (event.key === "ArrowUp") move(-1);
    else if (event.key === "Home") {
      event.preventDefault();
      paletteStore.set({ active: 0 });
    } else if (event.key === "End") {
      event.preventDefault();
      paletteStore.set({ active: items.length - 1 });
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(items[activeIndex]);
    }
  };

  return (
    <Dialog open={open} onClose={close} labelledBy={titleId} placement="top" className="max-w-[min(680px,calc(100vw-24px))]">
      <div className="widget overflow-hidden">
        <h2 id={titleId} className="sr-only">
          Command palette
        </h2>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-5">
          <SearchIcon className="shrink-0 text-accent-ink" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              paletteStore.set({ query: e.target.value, active: 0 });
              setAnswer(null);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[activeIndex] ? `${baseId}-opt-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-label="Search pages and actions, or ask a question"
            placeholder="Search or ask"
            className="min-w-0 flex-1 bg-transparent py-1 text-18 outline-none placeholder:text-muted"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-grid">esc</kbd>
        </div>

        {answer && (
          <section aria-live="polite" className="border-b border-line bg-surface-2 px-4 py-4 md:px-5">
            <p className="type-pixel text-accent-ink">Moci · offline brain</p>
            <p className="mt-2 text-16 leading-relaxed">{answer.result.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="pill"
                data-variant="primary"
                data-size="sm"
                onClick={() => {
                  close();
                  void dispatch({ type: "ask", question: answer.question });
                }}
              >
                Continue with Moci <SendIcon width={16} height={16} />
              </button>
              {answer.result.href && (
                <button
                  type="button"
                  className="pill"
                  data-size="sm"
                  onClick={() => {
                    close();
                    void dispatch({ type: "navigate", href: answer.result.href! });
                  }}
                >
                  Open the page
                </button>
              )}
            </div>
          </section>
        )}

        <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-[min(56vh,460px)] overflow-y-auto overscroll-contain p-2">
          {items.length === 0 && <p className="px-3 py-6 text-center text-muted">Nothing here. Try “work”, “dark”, or ask a question.</p>}
          {items.map((item, index) => {
            const header = headers[index];
            const selected = index === activeIndex;
            return (
              <div key={item.kind === "ask" ? "ask" : item.command.id}>
                {header && <p className="type-pixel px-3 pt-3 pb-1.5 text-muted" aria-hidden="true">{header}</p>}
                <div
                  id={`${baseId}-opt-${index}`}
                  role="option"
                  aria-selected={selected}
                  data-index={index}
                  onMouseMove={() => !selected && paletteStore.set({ active: index })}
                  onClick={() => run(item)}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-3 py-2 transition-colors",
                    selected ? "bg-accent/10 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_28%,transparent)]" : "hover:bg-ink/5",
                  )}
                >
                  {item.kind === "ask" ? (
                    <>
                      <span aria-hidden="true" className="palette-key" data-on={selected}>
                        ?
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">Ask Moci: “{item.question}”</span>
                        <span className="block truncate text-14 text-muted">Instant answer from what Moci knows</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <CommandIcon command={item.command} selected={selected} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {item.command.title}
                          {"external" in item.command && <span className="sr-only"> (opens in a new tab)</span>}
                        </span>
                        {item.command.subtitle && (
                          <span className="block truncate text-14 text-muted">{item.command.subtitle}</span>
                        )}
                      </span>
                      {item.command.keys && selected && (
                        <span className="palette-keys hidden shrink-0 gap-1 sm:flex" aria-hidden="true">
                          {item.command.keys.map((k, i) => (
                            <kbd key={i}>
                              {k}
                            </kbd>
                          ))}
                        </span>
                      )}
                      {"external" in item.command && <span aria-hidden="true">↗</span>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-12 text-muted md:px-5">
          <span className="flex items-center gap-2 [@media(pointer:coarse)]:invisible">
            <kbd>↑</kbd>
            <kbd>↓</kbd> to move <kbd>↵</kbd> to run
          </span>
          <span className="type-pixel hidden sm:inline">adelia.cc ⌘K</span>
        </div>
      </div>
    </Dialog>
  );
}
