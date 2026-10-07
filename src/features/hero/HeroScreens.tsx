import Link from "next/link";
import { projects } from "@/content/projects";
import { KEY_SCREEN } from "../screens/registry";
import { Screen } from "../screens/Screen";

const PLACES = ["hero-shot--a", "hero-shot--b", "hero-shot--c"];

/**
 * The work, already in the first screen: each product's key screen floats in the sky beside the
 * device, with its name and one number. Wide screens only; each one opens its case study.
 */
export function HeroScreens() {
  return (
    <ul className="hero-shots" aria-label="Selected work">
      {projects.map((p, i) => (
        <li key={p.slug} className={`hero-shot ${PLACES[i]}`}>
          <Link href={`/work/${p.slug}`} className="hero-shot__link" data-cursor="Open">
            <Screen id={KEY_SCREEN[p.slug]} className="hero-shot__phone" />
            <span className="hero-shot__tag">
              <b>{p.name}</b>
              <span>
                {p.stats[0].label} {p.stats[0].value}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
