/* ==========================================================================
   The four case studies, as the Wall of Work and the /work pages read them.
   Every fact comes from src/content/projects.ts (ported verbatim from the
   old adelia.cc); this file only adds the room's own bits: which poster on
   the wall is which case, and the reading guide from the old /work page.
   ========================================================================== */
import { projects, type Project } from '@/content/projects';

export type { Project };

/** The cases in wall order (left → right): tenderlens, ask-hr, catat, lintas. */
export const CASES: Project[] = projects;
export const CASE_SLUGS = CASES.map((p) => p.slug);

export const caseBySlug = (slug: string | null | undefined): Project | undefined => (slug ? CASES.find((p) => p.slug === slug) : undefined);
export const caseNumber = (p: Project) => CASES.findIndex((x) => x.slug === p.slug) + 1;
export const pad2 = (n: number) => String(n).padStart(2, '0');

export function neighbours(slug: string) {
  const i = Math.max(0, CASES.findIndex((p) => p.slug === slug));
  return { prev: CASES[(i - 1 + CASES.length) % CASES.length], next: CASES[(i + 1) % CASES.length] };
}

/** The photographed posters on her wall (cropped from the room plate), left → right. */
const POSTERS: Record<string, string> = {
  tenderlens: '/assets/posters/poster-1.webp',
  'ask-hr': '/assets/posters/poster-2.webp',
  catat: '/assets/posters/poster-3.webp',
  lintas: '/assets/posters/poster-4.webp',
};
export const posterFor = (slug: string) => POSTERS[slug] ?? POSTERS.tenderlens;

/** Reading time on the wall label: the full case is the long one. (Old /work lead: "Tenderlens is the full case, under 20 minutes; the others take 10 to 15.") */
export const readTime = (p: Project) => (p.depth === 'full' ? 'under 20 min' : '10–15 min');

/* A reading guide: which case answers which hiring question. CONTOH — ganti dengan data asli */
export const GUIDE: { q: string; slug: string; why: string }[] = [
  { q: 'Can she build AI that knows when not to answer?', slug: 'tenderlens', why: 'Her thesis: citations checked in code, abstaining, a frozen test set and a CI gate.' },
  { q: 'Has she shipped inside a real team?', slug: 'ask-hr', why: 'Six months as an intern in a squad: a lane router, retrieval, a review queue, a weekly audit.' },
  { q: 'Can she build an agent that writes data safely?', slug: 'catat', why: 'Tool calls that create pending entries, money parsed in code, one-tap undo, idempotent webhooks.' },
  { q: 'Where does she put the model, and where not?', slug: 'lintas', why: 'Her own transit router, and a model that writes one sentence that code checks before anyone sees it.' },
];

/** The steps of a case, in reading order (short cases skip the iterations). */
export const STEPS = [
  { id: 'problem', label: 'The problem' },
  { id: 'role', label: 'My role' },
  { id: 'research', label: 'Research' },
  { id: 'decisions', label: 'Design decisions' },
  { id: 'iterations', label: 'Iterations' },
  { id: 'design', label: 'The shipped design' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'results', label: 'Results' },
  { id: 'reflection', label: 'Reflection' },
] as const;
export type StepId = (typeof STEPS)[number]['id'];

export const stepsFor = (p: Project) => (p.depth === 'full' ? [...STEPS] : STEPS.filter((s) => s.id !== 'iterations'));

/** DOM id of a step's section (prefixed so it can't collide with anything else in the room). */
export const sectionId = (id: string) => `case-${id}`;

/** The canonical, shareable address of a case. */
export const caseUrl = (slug?: string) => `${location.origin}/work${slug ? `/${slug}` : ''}`;
