import type { Project } from "@/content/projects";
import { cn } from "@/lib/cn";

/**
 * Tiny product mockups drawn in CSS, one per project: no images to load, crisp at any size,
 * and they follow the theme. CONTOH — swap for real screenshots when the products are live.
 */
export function ProjectMockup({ project, size = "card", className }: { project: Project; size?: "card" | "hero"; className?: string }) {
  const big = size === "hero";
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden rounded-[18px]", className)}
      style={{ background: `color-mix(in srgb, var(--${project.tone}) 9%, var(--surface-2))` }}
      aria-hidden="true"
    >
      <div className={cn("absolute inset-x-[8%] top-[10%] bottom-[-6%] overflow-hidden rounded-t-[14px] bg-surface shadow-lg", big && "inset-x-[10%] top-[12%]")}>
        <div className="flex items-center gap-1 border-b border-line px-2.5 py-1.5">
          <span className="size-1.5 rounded-full bg-accent" />
          <span className="size-1.5 rounded-full bg-sun" />
          <span className="size-1.5 rounded-full bg-lime" />
          <span className={cn("ml-2 truncate font-mono text-muted", big ? "text-12" : "text-[8px]")}>{project.slug}.app</span>
        </div>
        {project.slug === "tenderlens" && <Tenderlens big={big} />}
        {project.slug === "catat" && <Catat big={big} />}
        {project.slug === "lintas" && <Lintas big={big} />}
      </div>
    </div>
  );
}

function Line({ w, tone = "bg-ink/10" }: { w: string; tone?: string }) {
  return <span className={cn("block h-[0.45em] rounded-pill", tone)} style={{ width: w }} />;
}

function Tenderlens({ big }: { big: boolean }) {
  return (
    <div className={cn("grid grid-cols-[1.3fr_1fr] gap-2 p-2.5", big ? "text-16" : "text-[9px]")}>
      <div className="space-y-[0.6em] rounded-[8px] bg-surface-2 p-[0.8em]">
        <Line w="80%" tone="bg-ink/25" />
        <Line w="95%" />
        <Line w="70%" tone="bg-sun" />
        <Line w="90%" />
        <Line w="60%" tone="bg-accent/60" />
        <Line w="85%" />
        <Line w="75%" />
        <span className="mt-[0.4em] inline-block rounded-pill bg-sky px-[0.6em] py-[0.1em] font-mono text-on-fill">p.87</span>
      </div>
      <div className="flex flex-col gap-[0.5em]">
        <div className="rounded-[8px] bg-accent-soft p-[0.6em] text-on-fill">
          <span className="block font-pixel text-[0.8em]">Bid score</span>
          <span className="block font-display text-[2.4em] leading-none font-bold">82</span>
        </div>
        <div className="space-y-[0.4em] rounded-[8px] border border-line p-[0.6em]">
          {["Eligible", "Scope fits", "Deadline ok"].map((t) => (
            <span key={t} className="flex items-center gap-[0.4em]">
              <span className="grid size-[1.1em] place-items-center rounded-full bg-lime text-[0.7em] text-on-fill">✓</span>
              <span className="truncate">{t}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Catat({ big }: { big: boolean }) {
  return (
    <div className={cn("flex flex-col gap-[0.6em] bg-[color-mix(in_srgb,var(--mint)_18%,var(--surface))] p-2.5", big ? "text-16" : "text-[9px]")}>
      <div className="ml-auto flex w-[72%] items-center gap-[0.5em] rounded-[10px] bg-surface p-[0.6em] shadow-sm">
        <span className="grid size-[1.6em] shrink-0 place-items-center rounded-full bg-cobalt text-on-cobalt">▶</span>
        <span className="flex h-[1.4em] flex-1 items-center gap-[2px]">
          {[4, 8, 5, 10, 7, 12, 6, 9, 4, 11, 6, 8, 5, 7].map((h, i) => (
            <span key={i} className="w-[2px] flex-1 rounded-full bg-cobalt" style={{ height: `${h * 8}%` }} />
          ))}
        </span>
        <span className="font-mono text-muted">0:06</span>
      </div>
      <div className="w-[78%] rounded-[10px] bg-surface p-[0.6em] shadow-sm">
        <span className="block font-semibold">✓ Sold 3× Indomie goreng</span>
        <span className="block text-muted">Rp10.500 · &quot;ceban gopek&quot;</span>
      </div>
      <div className="w-[60%] rounded-[10px] bg-surface p-[0.6em] shadow-sm">
        <span className="block font-semibold">📒 Bu Sri owes Rp25.000</span>
      </div>
      <div className="mt-auto grid grid-cols-3 gap-[0.4em]">
        {["Today", "Week", "Owed"].map((t, i) => (
          <span key={t} className={cn("rounded-[8px] p-[0.5em] text-on-fill", ["bg-lime", "bg-sun", "bg-sky"][i])}>
            <span className="block font-pixel text-[0.75em]">{t}</span>
            <span className="block font-display text-[1.3em] font-bold">{["412k", "2.9m", "180k"][i]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Lintas({ big }: { big: boolean }) {
  return (
    <div className={cn("relative h-full p-2.5", big ? "text-16" : "text-[9px]")}>
      <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full opacity-90">
        <path d="M-10 90 C 40 80, 60 40, 110 50 S 180 20, 210 30" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" />
        <path d="M-10 30 C 50 40, 90 90, 140 80 S 190 100, 210 95" fill="none" stroke="var(--cobalt)" strokeWidth="6" strokeLinecap="round" />
        <path d="M60 -10 C 70 40, 50 80, 80 130" fill="none" stroke="var(--sun)" strokeWidth="6" strokeLinecap="round" />
        {[
          [40, 79],
          [110, 50],
          [140, 80],
          [70, 45],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#fff" stroke="var(--ink)" strokeWidth="2" />
        ))}
      </svg>
      <div className="relative w-[58%] rounded-[10px] bg-surface p-[0.7em] shadow-lg">
        <span className="block font-pixel text-[0.8em] text-muted">Leave by</span>
        <span className="block font-display text-[2.6em] leading-none font-bold">07:12</span>
        <span className="mt-[0.4em] flex items-end gap-[3px]" aria-hidden="true">
          {[3, 5, 8, 6, 4, 2].map((h, i) => (
            <span key={i} className={cn("w-[0.7em] rounded-[2px]", i === 2 ? "bg-accent" : "bg-ink/20")} style={{ height: `${h * 0.25}em` }} />
          ))}
        </span>
        <span className="mt-[0.3em] block text-muted">Back carriages: seats likely</span>
      </div>
    </div>
  );
}
