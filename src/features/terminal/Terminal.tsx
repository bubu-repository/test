"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { bump } from "@/lib/stickers";
import { ui, useUI } from "@/lib/ui";
import { complete, routeToCwd, run, type Line } from "./shell";

type Entry = { id: number; prompt?: string; input?: string; lines: Line[] };

let entryId = 0;

/** The session survives closing and reopening the terminal. */
const session: { entries: Entry[]; history: string[] } = { entries: [], history: [] };

const WELCOME: Line[] = [
  { kind: "out", text: "moci-sh 1.0 · adelia.cc", tone: "accent" },
  { kind: "out", text: "Type `help` to see what you can do. Try `ls`, `cd work`, `cat README.md`.", tone: "muted" },
];

/** The terminal overlay (backtick): the same shell, on a laptop that slides up from the bottom. */
export function Terminal() {
  const open = useUI((s) => s.overlay === "terminal");
  const titleId = useId();
  const close = () => ui.set({ overlay: null });
  return (
    <Dialog open={open} onClose={close} labelledBy={titleId} placement="bottom">
      <Laptop>
        <TerminalScreen titleId={titleId} onClose={close} autoFocus heightClass="h-[min(48vh,400px)]" />
      </Laptop>
    </Dialog>
  );
}

/**
 * The shell itself: a window with a title bar, the log and a prompt. Used in the overlay and
 * inline on the home page's laptop. The session (history and output) is shared between them.
 */
export function TerminalScreen({ titleId: givenId, onClose, autoFocus = false, heightClass = "h-[320px]" }: { titleId?: string; onClose?: () => void; autoFocus?: boolean; heightClass?: string }) {
  const pathname = usePathname();
  // Mounted fresh on every open: start in the directory of the current page.
  const [cwd, setCwd] = useState(() => routeToCwd(pathname));
  const [entries, setEntriesState] = useState<Entry[]>(() => (session.entries.length ? session.entries : [{ id: entryId++, lines: WELCOME }]));
  const [input, setInput] = useState("");
  const [history, setHistoryState] = useState<string[]>(() => session.history);
  const setEntries = (update: Entry[] | ((e: Entry[]) => Entry[])) =>
    setEntriesState((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      session.entries = next.slice(-200);
      return next;
    });
  const setHistory = (next: string[]) => {
    session.history = next;
    setHistoryState(next);
  };
  const [cursor, setCursor] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ownId = useId();
  const titleId = givenId ?? ownId;

  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => inputRef.current?.focus());
  }, [autoFocus]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  const prompt = `visitor@adelia.cc:~${cwd === "/" ? "" : cwd}$`;
  const close = () => onClose?.();

  const submit = () => {
    const value = input;
    setInput("");
    setCursor(null);
    if (!value.trim()) {
      setEntries((e) => [...e, { id: entryId++, prompt, input: "", lines: [] }]);
      return;
    }
    const nextHistory = [...history, value];
    setHistory(nextHistory);
    const result = run(value, cwd, nextHistory);
    bump("terminal", 5, "shell");
    sfx.pop();
    if (result.clear) setEntries([]);
    else setEntries((e) => [...e, { id: entryId++, prompt, input: value, lines: result.lines }]);
    if (result.cwd) setCwd(result.cwd);
    if (result.close) close();
    for (const action of result.actions ?? []) void dispatch(action);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Tab") {
      const completed = complete(input, cwd);
      if (completed) {
        event.preventDefault();
        setInput(completed);
      } else if (input) {
        event.preventDefault();
        sfx.bump();
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setInput(history[next]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (cursor === null) return;
      const next = cursor + 1;
      if (next >= history.length) {
        setCursor(null);
        setInput("");
      } else {
        setCursor(next);
        setInput(history[next]);
      }
    } else if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      setEntries([]);
    } else if (event.key === "c" && event.ctrlKey && !window.getSelection()?.toString()) {
      event.preventDefault();
      setEntries((e) => [...e, { id: entryId++, prompt, input: `${input}^C`, lines: [] }]);
      setInput("");
    } else if (event.key.length === 1) {
      sfx.key();
    }
  };

  return (
    <div className="bg-term-bg text-left text-term-ink" data-xr="Terminal · virtual filesystem mapped to routes" onClick={() => inputRef.current?.focus()}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-3 rounded-full bg-accent" />
            <span className="size-3 rounded-full bg-sun" />
            <span className="size-3 rounded-full bg-lime" />
          </span>
          <h2 id={titleId} className="type-pixel ml-2 flex-1 truncate text-term-ink">
            moci-sh — {cwd === "/" ? "~" : `~${cwd}`}
          </h2>
          {onClose && (
            <button type="button" onClick={close} className="rounded-pill px-2.5 py-1 text-12 text-term-muted hover:bg-white/10">
              Close <span className="sr-only">terminal</span>
              <kbd className="ml-1 border-white/20 bg-transparent text-term-muted">esc</kbd>
            </button>
          )}
        </div>
        <div ref={scrollRef} role="log" aria-live="polite" aria-label="Terminal output" className={cn("type-code overflow-y-auto px-4 py-3 text-14", heightClass)}>
          {entries.map((entry) => (
            <div key={entry.id} className="mb-1.5">
              {entry.prompt !== undefined && (
                <p className="break-all">
                  <span className="text-term-accent">{entry.prompt}</span> <span>{entry.input}</span>
                </p>
              )}
              {entry.lines.map((line, i) =>
                line.kind === "link" ? (
                  <p key={i}>
                    {line.external ? (
                      <a href={line.href} target="_blank" rel="noopener noreferrer" className="text-term-link underline underline-offset-2">
                        {line.text}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <Link href={line.href} onClick={close} className="text-term-link underline underline-offset-2">
                        {line.text}
                      </Link>
                    )}
                  </p>
                ) : line.kind === "art" ? (
                  <pre key={i} aria-hidden="true" className="leading-tight text-term-accent">
                    {line.text}
                  </pre>
                ) : (
                  <p
                    key={i}
                    className={cn(
                      "break-words whitespace-pre-wrap",
                      line.tone === "muted" && "text-term-muted",
                      line.tone === "accent" && "text-term-accent",
                      line.tone === "ok" && "text-term-ok",
                      line.tone === "warn" && "text-term-warn",
                    )}
                  >
                    {line.text}
                  </p>
                ),
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <label htmlFor={`${titleId}-input`} className="shrink-0 text-term-accent">
              {prompt}
            </label>
            <input
              id={`${titleId}-input`}
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent caret-term-accent outline-none"
              aria-describedby={`${titleId}-hint`}
            />
          </div>
          <p id={`${titleId}-hint`} className="sr-only">
            Type a command and press Enter. Type help for the list of commands.
          </p>
        </div>
    </div>
  );
}

/** A laptop: dark bezel with a camera, aluminium edge and base. Whatever you pass is the screen. */
export function Laptop({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("laptop", className)} data-xr="Laptop · CSS hardware around the terminal">
      <div className="laptop__lid">
        <span className="laptop__camera" aria-hidden="true" />
        <div className="laptop__screen">{children}</div>
      </div>
      <div className="laptop__base" aria-hidden="true">
        <span className="laptop__notch" />
      </div>
    </div>
  );
}
