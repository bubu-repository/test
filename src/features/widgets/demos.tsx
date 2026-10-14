"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRightIcon } from "@/components/icons";
import { AppIcon } from "@/components/AppIcon";
import type { Tone } from "@/content/projects";
import { identity } from "@/content/profile";
import { projects } from "@/content/projects";
import { dispatch, type SiteAction } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { useVisitorZone } from "@/lib/hooks";
import { sfx } from "@/lib/sound";
import { formatHour, workingOverlap, zoneCity } from "@/lib/time";
import { toast } from "@/lib/ui";
import { Phone } from "../objects/Phone";
import { WidgetTitle } from "./widgets";

/** The round ↗ in the corner of a tile (after marco.fyi): where this demo leads. */
function Corner({ href, label, onClick }: { href?: string; label: string; onClick?: () => void }) {
  const cls = "demo-corner";
  return href ? (
    <Link href={href} className={cls} aria-label={label} data-cursor="Open">
      <ArrowUpRightIcon width={16} height={16} />
    </Link>
  ) : (
    <button type="button" className={cls} aria-label={label} onClick={onClick} data-cursor="Open">
      <ArrowUpRightIcon width={16} height={16} />
    </button>
  );
}

/* ---------- Find a time: a command bar for scheduling with Adelia ---------- */

type Command = { id: string; label: string; hint: string; run: () => void | Promise<void> };

export function FindTimeWidget() {
  const zone = useVisitorZone();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const listId = useId();

  const yours = useMemo(() => {
    if (!zone) return null;
    const o = workingOverlap(zone);
    return { start: formatHour(o.hersInYours.start), end: formatHour(o.hersInYours.end), hours: o.hours, ranges: o.ranges, city: zoneCity(zone) };
  }, [zone]);

  const availability = yours
    ? `Adelia Tiara (${identity.role}) is free for calls Mon–Fri, 09:00–18:00 ${identity.timeZoneLabel} in Bekasi. That's ${yours.start}–${yours.end} for you in ${yours.city}. Email: ${identity.email}`
    : `Adelia Tiara (${identity.role}) is free for calls Mon–Fri, 09:00–18:00 ${identity.timeZoneLabel} in Bekasi. Email: ${identity.email}`;

  const commands: Command[] = [
    {
      id: "share",
      label: "Share her availability",
      hint: "copy",
      run: async () => {
        try {
          await navigator.clipboard.writeText(availability);
          toast({ title: "Availability copied", body: "Paste it into your scheduling thread.", tone: "magenta" });
        } catch {
          setResult(availability);
        }
      },
    },
    {
      id: "yours",
      label: "Find time in your time zone",
      hint: yours ? yours.city : "your clock",
      run: () =>
        setResult(
          yours
            ? yours.ranges.length
              ? `Best overlap with your 9–18: ${yours.ranges.map((r) => `${formatHour(r.start)}–${formatHour(r.end)}`).join(" and ")} your time (${yours.hours} h).`
              : `Her day is ${yours.start}–${yours.end} your time. No overlap with your 9–18, so early or late calls work best.`
            : "Checking your clock…",
        ),
    },
    {
      id: "book",
      label: "Book a 20-minute intro",
      hint: "email",
      run: () => {
        window.location.assign(`mailto:${identity.email}?subject=${encodeURIComponent("20-minute intro")}&body=${encodeURIComponent(`Hi Adelia,\n\nCould we find 20 minutes this week? ${yours ? `I'm in ${yours.city}; ${yours.start}–${yours.end} my time works on your side.` : ""}\n\n`)}`);
      },
    },
    { id: "email", label: "Copy her email", hint: "copy", run: () => void dispatch({ type: "copyEmail" }) },
    { id: "brief", label: "Read the 40-second brief", hint: "B", run: () => void dispatch({ type: "open", panel: "brief" }) },
  ];

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = commands.filter((c) => words.every((w) => `${c.label} ${c.hint}`.toLowerCase().includes(w)));
  const current = Math.min(active, Math.max(0, shown.length - 1));

  const run = (c: Command) => {
    sfx.pop();
    void c.run();
  };

  return (
    <div className="flex h-full flex-col">
      <WidgetTitle>Find a time</WidgetTitle>
      <div className="demo-bar mt-4">
        <span aria-hidden="true" className="demo-bar__mark">
          ⌘
        </span>
        <input
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={shown[current] ? `${listId}-${shown[current].id}` : undefined}
          aria-label="Find a time with Adelia"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((current + 1) % Math.max(1, shown.length));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((current - 1 + shown.length) % Math.max(1, shown.length));
            } else if (e.key === "Enter" && shown[current]) {
              e.preventDefault();
              run(shown[current]);
            }
          }}
          placeholder="Type something to get started…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-14 outline-none placeholder:text-muted"
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Scheduling actions" className="mt-2 space-y-0.5">
        {shown.map((c, i) => (
          <li
            key={c.id}
            id={`${listId}-${c.id}`}
            role="option"
            aria-selected={i === current}
            onMouseEnter={() => setActive(i)}
            onClick={() => run(c)}
            className={cn("demo-option", i === current && "demo-option--on")}
          >
            <span className="min-w-0 flex-1 truncate">{c.label}</span>
            <span className="max-w-[40%] shrink-0 truncate pl-3 font-mono text-[10px] tracking-[0.06em] opacity-70">{c.hint}</span>
          </li>
        ))}
        {!shown.length && <li className="px-3 py-2 text-14 text-muted">Nothing like that. Try “time” or “email”.</li>}
      </ul>
      <p className="mt-3 min-h-[2.6em] text-12 leading-snug text-muted" aria-live="polite">
        {result ?? "Arrow keys to move, Enter to run."}
      </p>
    </div>
  );
}

/* ---------- Workspaces: switch projects, see their stack light up ---------- */

const STACK_TONES: Tone[] = ["ink", "cobalt", "violet", "mint", "sun", "sky", "red", "lime", "pink", "magenta"];

const MONOGRAM: Record<string, string> = {
  "Next.js": "NX",
  TypeScript: "TS",
  PostgreSQL: "PG",
  pgvector: "PV",
  "Claude API": "CL",
  Python: "PY",
  Playwright: "PW",
  "Node.js": "ND",
  "WhatsApp Business API": "WA",
  "Speech-to-text": "ST",
  "Claude tool use": "CT",
  Redis: "RD",
  MapLibre: "ML",
  "Web Push": "WP",
};

const monogram = (name: string) => MONOGRAM[name] ?? name.slice(0, 2).toUpperCase();

export function WorkspaceWidget() {
  const [slug, setSlug] = useState(projects[0].slug);
  const project = projects.find((p) => p.slug === slug)!;
  const stack = useMemo(() => {
    const all: string[] = [];
    for (const p of projects) for (const s of p.stack) if (!all.includes(s.replace(/ \(.*\)/, ""))) all.push(s.replace(/ \(.*\)/, ""));
    return all.slice(0, 14);
  }, []);
  const mine = new Set(project.stack.map((s) => s.replace(/ \(.*\)/, "")));
  const metric = project.results.metrics[0];

  return (
    <div className="flex h-full flex-col">
      <WidgetTitle>Workspaces</WidgetTitle>
      <div role="tablist" aria-label="Projects" className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {projects.map((p) => (
          <button
            key={p.slug}
            type="button"
            role="tab"
            aria-selected={p.slug === slug}
            onClick={() => {
              sfx.tick();
              setSlug(p.slug);
            }}
            className={cn("demo-tab", p.slug === slug && "demo-tab--on")}
          >
            <span className="block truncate text-14 font-semibold">{p.name}</span>
            <span className="block truncate text-[11px] text-muted">Adelia&apos;s workspace</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={`${project.name} stack`} className="well mt-3 rounded-[18px] p-3">
        <ul className="grid grid-cols-7 gap-1.5">
          {stack.map((s, i) => {
            const on = mine.has(s);
            return (
              <li key={s} className="grid place-items-center" title={s}>
                <AppIcon tone={STACK_TONES[i % STACK_TONES.length]} size={34} className={cn("transition-[opacity,filter,scale] duration-300", on ? "" : "scale-90 opacity-30 grayscale")}>
                  <span className="relative z-[1] font-mono text-[10px] font-bold text-white">{monogram(s)}</span>
                </AppIcon>
                <span className="sr-only">
                  {s}
                  {on ? " (used)" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-3 text-14">
        <span className="font-semibold">{metric.value}</span> <span className="text-muted">{metric.label}</span>
      </p>
      <div className="mt-auto pt-3">
        <Corner href={`/work/${project.slug}`} label={`Open the ${project.name} case study`} />
      </div>
    </div>
  );
}

/* ---------- Keycaps: real keys that press when you press them ---------- */

const CAPS: { keys: string[]; label: string; action: SiteAction; match: (e: KeyboardEvent) => boolean; wide?: boolean }[] = [
  { keys: ["⌘", "K"], label: "Palette", action: { type: "open", panel: "palette" }, match: (e) => e.key === "Meta" || e.key === "Control" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") },
  { keys: ["T"], label: "Tour", action: { type: "tour" }, match: (e) => e.key.toLowerCase() === "t" },
  { keys: ["B"], label: "Brief", action: { type: "open", panel: "brief" }, match: (e) => e.key.toLowerCase() === "b" },
  { keys: ["S"], label: "Stickers", action: { type: "open", panel: "stickers" }, match: (e) => e.key.toLowerCase() === "s" },
  { keys: ["?"], label: "Keys", action: { type: "open", panel: "shortcuts" }, match: (e) => e.key === "?" },
];

export function KeycapsWidget() {
  const [down, setDown] = useState<Set<number>>(() => new Set());
  const spaceDown = down.has(-1);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const i = e.key === "/" ? -1 : CAPS.findIndex((c) => c.match(e));
      if (i < 0 && e.key !== "/") return;
      setDown((d) => (d.has(i) ? d : new Set(d).add(i)));
    };
    const off = (e: KeyboardEvent) => {
      const i = e.key === "/" ? -1 : CAPS.findIndex((c) => c.match(e));
      setDown((d) => {
        if (i < 0 && e.key !== "/" && !d.size) return d;
        const n = new Set(d);
        if (i >= 0 || e.key === "/") n.delete(i);
        if (e.key === "Meta" || e.key === "Control") n.delete(0);
        return n;
      });
    };
    const clear = () => setDown(new Set());
    window.addEventListener("keydown", on);
    window.addEventListener("keyup", off);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", on);
      window.removeEventListener("keyup", off);
      window.removeEventListener("blur", clear);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <WidgetTitle>Keyboard</WidgetTitle>
      <div className="mt-5 flex flex-wrap gap-x-2.5 gap-y-4">
        {CAPS.map((c, i) => (
          <div key={c.label} className="flex flex-col items-center gap-1.5">
            <div className="flex gap-1.5">
              {c.keys.map((k) => (
                <Keycap
                  key={k}
                  down={down.has(i)}
                  onPress={() => {
                    sfx.key();
                    void dispatch(c.action);
                  }}
                  label={`${c.label} (${c.keys.join(" ")})`}
                  first={k === c.keys[0]}
                >
                  {k}
                </Keycap>
              ))}
            </div>
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-muted uppercase">{c.label}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="keycap keycap--space mt-5 w-full"
        data-down={spaceDown}
        onClick={() => {
          sfx.key();
          void dispatch({ type: "open", panel: "agent" });
        }}
      >
        <span className="font-mono text-12 tracking-[0.12em] uppercase">/ &nbsp;Ask Moci</span>
      </button>
      <p className="mt-auto pt-4 text-12 text-muted">Press them on your keyboard. They&apos;re wired to the real shortcuts.</p>
    </div>
  );
}

function Keycap({ children, down, onPress, label, first }: { children: ReactNode; down: boolean; onPress: () => void; label: string; first: boolean }) {
  return (
    <button type="button" className="keycap" data-down={down} onClick={onPress} aria-label={first ? label : undefined} aria-hidden={first ? undefined : true} tabIndex={first ? 0 : -1}>
      {children}
    </button>
  );
}

/* ---------- Bekasi now: her phone, lying on the table, showing the live sky ---------- */

export function PhoneWidget() {
  return (
    <div data-tour="sky" className="flex h-full flex-col">
      <WidgetTitle>Bekasi, right now</WidgetTitle>
      <div className="grid flex-1 place-items-center py-4">
        <div className="rotate-[-3deg]">
          <Phone />
        </div>
      </div>
      <p className="text-12 text-muted">A live shader: the clouds follow Bekasi&apos;s real weather, and your cursor parts them.</p>
    </div>
  );
}
