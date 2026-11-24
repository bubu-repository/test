import { isTodo, type Project } from '@/content/site';

/**
 * The evidence rules for a project run (docs/concept.md, "Project runs"; docs/research/gakumas.md §8).
 * The game states its criteria before the run (gak 17, 25) and grades in two tiers (gak 09):
 * CLEAR = shipped + role stated. PERFECT = CLEAR + a measured outcome with its source.
 * "Work you can open" is listed so a reader can check the run, but it is not part of a tier.
 * An item counts only when the data is there. Nothing is ever estimated.
 */

export type Tier = 'clear' | 'perfect';
export type CriterionId = 'shipped' | 'role' | 'outcome' | 'artefacts';

export type Criterion = {
  id: CriterionId;
  title: string;
  /** What makes it count, in plain words. */
  counts: string;
  /** The tier it belongs to; null = listed for checking, not graded. */
  tier: Tier | null;
  met: boolean;
};

const has = (v?: string) => !!v && !isTodo(v);

export function criteria(p: Project): Criterion[] {
  const e = p.evidence;
  return [
    { id: 'shipped', title: 'Shipped', counts: 'A link to the live product or a release note', tier: 'clear', met: has(e.shipped) },
    { id: 'role', title: 'Role stated', counts: 'Her part in it, in her own words', tier: 'clear', met: has(e.role) },
    {
      id: 'outcome',
      title: 'Outcome measured',
      counts: 'A measured result and where it comes from',
      tier: 'perfect',
      met: !!e.outcome && has(e.outcome.metric) && has(e.outcome.source),
    },
    { id: 'artefacts', title: 'Work you can open', counts: 'A case study, prototype or repo', tier: null, met: has(e.artefacts) },
  ];
}

export type Verdict = {
  /** The tier reached, or null while the result is pending. */
  tier: Tier | null;
  /** The tier the ring is counting towards (gak 10: after CLEAR the ring counts on to PERFECT). */
  target: Tier;
  /** Items met for the target, and how many the target needs. */
  met: number;
  need: number;
  left: number;
  /** true when not a single criterion has data yet */
  empty: boolean;
};

export function verdict(p: Project): Verdict {
  const list = criteria(p);
  const forClear = list.filter((c) => c.tier === 'clear');
  const forPerfect = list.filter((c) => c.tier !== null);
  const clearMet = forClear.filter((c) => c.met).length;
  const perfectMet = forPerfect.filter((c) => c.met).length;
  const tier: Tier | null = perfectMet === forPerfect.length ? 'perfect' : clearMet === forClear.length ? 'clear' : null;
  const target: Tier = tier === null ? 'clear' : 'perfect';
  const met = target === 'clear' ? clearMet : perfectMet;
  const need = target === 'clear' ? forClear.length : forPerfect.length;
  return { tier, target, met, need, left: need - met, empty: !list.some((c) => c.met) };
}

/** The stamp plays once per run and tier, the first time a run with real evidence is viewed. */
const SEEN_KEY = 'adelia.cc/run-stamps';

export function firstView(id: string, tier: Tier): boolean {
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]');
    const key = `${id}:${tier}`;
    if (seen.includes(key)) return false;
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, key]));
    return true;
  } catch {
    return false; // private mode: no stamp is better than a stamp on every open
  }
}
