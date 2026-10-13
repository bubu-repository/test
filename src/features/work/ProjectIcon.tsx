import type { CSSProperties } from "react";
import { TONE_GRADIENT } from "@/components/AppIcon";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/cn";

/** CONTOH — ganti dengan data asli: each project's glyph, drawn white on its tone. */
function Glyph({ slug }: { slug: string }) {
  switch (slug) {
    case "tenderlens":
      return (
        <>
          <path d="M6 3.5h7.5L18 8v12.5H6Z" fill="currentColor" opacity="0.95" />
          <circle cx="12.5" cy="14" r="3.2" stroke="var(--glyph-ink)" strokeWidth="1.8" fill="none" />
          <path d="m14.8 16.3 2.4 2.4" stroke="var(--glyph-ink)" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "ask-hr":
      return (
        <>
          <path d="M5.5 5h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6.2L8 20.5V17H5.5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="#1D2A4D" />
          <path d="M10 9.4a2 2 0 1 1 2.8 1.9c-.5.2-.8.6-.8 1.1v.5" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" fill="none" />
          <circle cx="12" cy="14.7" r="0.95" fill="#FFFFFF" />
        </>
      );
    case "catat":
      return (
        <>
          <rect x="9" y="3.5" width="6" height="11" rx="3" fill="currentColor" />
          <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      );
    case "lintas":
      return (
        <>
          <rect x="6" y="3.5" width="12" height="13" rx="3.5" fill="currentColor" />
          <rect x="8.2" y="6" width="7.6" height="4.2" rx="1" fill="var(--glyph-ink)" />
          <circle cx="9.3" cy="13.4" r="1.1" fill="var(--glyph-ink)" />
          <circle cx="14.7" cy="13.4" r="1.1" fill="var(--glyph-ink)" />
          <path d="m8.5 20.5 1.6-3M15.5 20.5l-1.6-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

/** The project as an iOS-style app icon. On the case study it is the target of the card morph. */
export function ProjectIcon({ project, size = 76, className }: { project: Project; size?: number; className?: string }) {
  const glyph = <Glyph slug={project.slug} />;
  return (
    <span
      aria-hidden="true"
      className={cn("app-icon", className)}
      style={{ "--app-bg": TONE_GRADIENT[project.tone], "--size": `${size}px`, "--glyph-ink": project.tone === "violet" ? "#5C44B8" : project.tone === "cobalt" ? "#2F5FC2" : "#BA3A71", borderRadius: "23%" } as CSSProperties}
    >
      {glyph ? (
        <svg viewBox="0 0 24 24" focusable="false">
          {glyph}
        </svg>
      ) : (
        <span className="font-bold" style={{ fontSize: size * 0.45 }}>
          {project.name[0]}
        </span>
      )}
    </span>
  );
}
