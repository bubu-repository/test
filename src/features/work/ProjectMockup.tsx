import type { Project } from "@/content/projects";
import { cn } from "@/lib/cn";
import { KEY_SCREEN } from "../screens/registry";
import { Screen } from "../screens/Screen";

/**
 * A project's key screen rising out of its tinted stage: the art on the trading cards and the
 * polaroids. The same coded screens as the case study, so every picture of the work is the work.
 */
export function ProjectMockup({ project, className }: { project: Project; size?: "card" | "hero"; className?: string }) {
  return (
    <div className={cn(`mockup-stage case-stage--${project.slug} relative h-full w-full overflow-hidden rounded-[18px]`, className)} aria-hidden="true">
      <Screen id={KEY_SCREEN[project.slug]} className="mockup-stage__phone" />
    </div>
  );
}
