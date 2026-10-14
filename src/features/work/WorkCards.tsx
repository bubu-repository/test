import Link from "next/link";
import type { Project } from "@/content/projects";
import { KEY_SCREEN } from "../screens/registry";
import { Screen } from "../screens/Screen";
import { ReadCta, ReadStamp } from "./ReadMark";

/**
 * The work, readable in five seconds: each project as a card with its real key screen, its name,
 * what it is, three numbers and my role. The first two cards are wide (the second mirrored); the
 * whole card is the link.
 */
export function WorkCards({ projects, headingLevel = 3 }: { projects: Project[]; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul className="work-cards">
      {projects.map((p, i) => (
        <li key={p.slug} className={i === 0 ? "work-card work-card--wide" : i === 1 ? "work-card work-card--wide work-card--flip" : "work-card"}>
          <Link href={`/work/${p.slug}`} className="work-card__link" data-tour={i === 0 ? "work-card" : undefined}>
            <div className={`work-card__stage case-stage--${p.slug}`} aria-hidden="true">
              <Screen id={KEY_SCREEN[p.slug]} className="work-card__phone" />
            </div>
            <div className="work-card__body">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="type-pixel text-muted">
                  {p.index}
                  <span className="hidden min-[30rem]:inline"> · {p.kind}</span> · {p.year}
                </span>
                <span className="chip min-h-6 px-2.5 text-12 font-semibold">{p.context}</span>
                <ReadStamp slug={p.slug} />
              </p>
              <H className="type-title-2 mt-3">{p.name}</H>
              <p className="mt-3 max-w-[46ch] text-18 leading-snug">{p.tagline}</p>
              <dl className="work-card__stats">
                {p.stats.map((s) => (
                  <div key={s.label}>
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-14 text-muted">
                <span className="font-semibold text-ink">Role:</span> {p.role.title} · {p.timeline}
              </p>
              <span className="link-arrow mt-5 text-16">
                <ReadCta slug={p.slug} />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
