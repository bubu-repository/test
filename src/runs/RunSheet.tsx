import { useEffect, useState } from 'react';
import { isTodo, projects, type Project } from '@/content/site';
import { openOverlay } from '@/state';
import { Sheet } from '@/ui/Sheet';
import { Ring, useCountUp } from '@/ui/Ring';
import { criteria, firstView, verdict, type Criterion } from './evidence';
import './runs.css';

/**
 * A project run sheet (gak 17, 21, 22): the brief and criteria come first, then one dark verdict
 * card with the evidence ring, then the real phases, then links. White frost for reading, dark glass
 * only for the verdict (docs/concept.md, Materials). Every TODO_SEA field is shown as a hatched
 * placeholder, so nothing looks finished when it is not.
 */

const STATUS: Record<string, string> = { shipped: 'Shipped', 'in-progress': 'In progress', concept: 'Concept' };
const KIND_SHAPE: Record<Project['phases'][number]['kind'], string | undefined> = {
  design: 'circle',
  build: 'hex',
  ai: 'diamond',
  research: undefined, // the plain square mark
};

/** A visible placeholder for a missing fact. Shows the TODO_SEA note itself, never a made-up value. */
function Todo({ value, what }: { value?: string; what: string }) {
  const text = value && value.startsWith('TODO_SEA:') ? value : `TODO_SEA: ${what}`;
  return (
    <span className="chip" data-todo>
      {text}
    </span>
  );
}

function Fact({ value, what, format }: { value: string; what: string; format?: (v: string) => string }) {
  if (isTodo(value)) return <Todo value={value} what={what} />;
  return <span className="chip">{format ? format(value) : value}</span>;
}

export default function RunSheet({ id }: { id: 'p1' | 'p2' | 'p3' }) {
  const index = projects.findIndex((x) => x.id === id);
  const p = projects[index];
  const next = projects[(index + 1) % projects.length];
  const named = !isTodo(p.name);

  const footer = (
    <>
      {p.links.length ? (
        p.links.map((l) =>
          isTodo(l.href) ? (
            <span key={l.label} className="btn btn-sm" data-todo aria-disabled="true">
              {l.href}
            </span>
          ) : (
            <a key={l.label} className="btn btn-sm" href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ),
        )
      ) : (
        <span className="btn btn-sm" data-todo aria-disabled="true">
          TODO_SEA: project links
        </span>
      )}
      {next.id !== p.id && (
        <button className="btn btn-sm btn-ghost run-next" onClick={() => openOverlay({ kind: 'run', id: next.id })}>
          Next: {next.run}
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>
      )}
    </>
  );

  return (
    <Sheet tag={p.run} title={named ? p.name : 'Name pending'} wide footer={footer}>
      <div className="run">
        <ul className="run-meta" aria-label="Facts">
          {!named && (
            <li>
              <Todo value={p.name} what="project name" />
            </li>
          )}
          <li>
            <Fact value={p.year} what="year" />
          </li>
          <li>
            <Fact value={p.role} what="role" />
          </li>
          <li>
            <Fact value={p.status} what="status" format={(v) => STATUS[v] ?? v} />
          </li>
        </ul>

        {isTodo(p.visual) ? (
          <div className="run-visual run-hatch" role="img" aria-label="Project visual not added yet">
            <span className="run-hatch-note">{p.visual.startsWith('TODO_SEA:') ? p.visual : 'TODO_SEA: one visual'}</span>
            <span className="run-hatch-sub">16:10, cropped tight to the work</span>
          </div>
        ) : (
          <figure className="run-visual">
            <img src={p.visual} alt={named ? `${p.name}, project visual` : 'Project visual'} loading="lazy" decoding="async" />
          </figure>
        )}

        {isTodo(p.result) ? (
          <p className="run-result run-hatch run-hatch-line">{p.result}</p>
        ) : (
          <p className="run-result">{p.result}</p>
        )}

        <CriteriaCard p={p} />
        <VerdictCard p={p} />
        <Phases p={p} />
      </div>
    </Sheet>
  );
}

function CriteriaCard({ p }: { p: Project }) {
  const list = criteria(p);
  return (
    <section className="run-card run-criteria" aria-labelledby={`${p.id}-crit`}>
      <header className="run-card-head">
        <h3 className="label" id={`${p.id}-crit`}>
          Criteria
        </h3>
        <p className="run-card-aside">Each item counts only with a link or a source.</p>
      </header>
      <ul className="crit-list">
        {list.map((c) => (
          <li key={c.id} className="crit" data-met={c.met || undefined}>
            <span className="crit-tick" aria-hidden="true">
              {c.met && (
                <svg viewBox="0 0 16 16">
                  <path d="M4 8.5l2.5 2.5L12 5.5" />
                </svg>
              )}
            </span>
            <div className="crit-text">
              <p className="crit-title">
                {c.title}
                <span className="sr-only">{c.met ? ', met' : ', not met yet'}</span>
              </p>
              <p className="crit-counts">{c.counts}</p>
              <div className="crit-value">
                <CriterionValue p={p} c={c} />
              </div>
            </div>
            <span className="label crit-tier">{c.tier === 'clear' ? 'Clear' : c.tier === 'perfect' ? 'Perfect' : 'Not graded'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CriterionValue({ p, c }: { p: Project; c: Criterion }) {
  const e = p.evidence;
  if (!c.met) {
    const what = { shipped: 'live link', role: 'role in your words', outcome: 'metric and its source', artefacts: 'case study or repo link' }[c.id];
    return <Todo what={what} />;
  }
  switch (c.id) {
    case 'shipped':
      return (
        <a href={e.shipped} target="_blank" rel="noreferrer">
          Open the live product
        </a>
      );
    case 'role':
      return <q className="crit-quote">{e.role}</q>;
    case 'outcome':
      return (
        <span>
          {e.outcome!.metric}.{' '}
          {/^https?:\/\//.test(e.outcome!.source) ? (
            <a href={e.outcome!.source} target="_blank" rel="noreferrer">
              Source
            </a>
          ) : (
            <span className="crit-source">Source: {e.outcome!.source}</span>
          )}
        </span>
      );
    case 'artefacts':
      return (
        <a href={e.artefacts} target="_blank" rel="noreferrer">
          Open the case study
        </a>
      );
  }
}

const TIER_WORD = { clear: 'Clear', perfect: 'Perfect' } as const;

function VerdictCard({ p }: { p: Project }) {
  const v = verdict(p);
  // Gakumas stamps the result once (gak 20). Here: only the first time a run with real evidence is seen.
  // Checked in an effect (not a state initializer) so StrictMode's double call cannot eat the stamp.
  const [stamp, setStamp] = useState(false);
  useEffect(() => {
    if (v.tier && firstView(p.id, v.tier)) setStamp(true);
  }, [p.id, v.tier]);
  const left = useCountUp(v.left, v.need);
  const word = v.tier ? TIER_WORD[v.tier] : 'Result pending';
  const target = TIER_WORD[v.target];
  const done = v.tier === 'perfect';

  const detail =
    v.tier === 'perfect'
      ? 'Shipped, role stated, and a measured outcome with its source.'
      : v.tier === 'clear'
        ? 'Shipped and role stated. A measured outcome with its source makes it Perfect.'
        : v.empty
          ? 'No evidence linked yet. The ring fills as links and sources come in.'
          : `${v.met} of ${v.need} Clear criteria met so far.`;

  const ringLabel = done ? 'Evidence: Perfect, every criterion met' : `Evidence: ${v.left} to ${target}, ${v.met} of ${v.need} met`;

  return (
    <section className="run-card run-verdict" data-pending={v.tier ? undefined : true} aria-labelledby={`${p.id}-verdict`}>
      <Ring value={v.met} max={v.need} size={92} stroke={5} tone="dark" label={ringLabel}>
        {done ? (
          <span className="verdict-count">
            <span className="verdict-small">All met</span>
          </span>
        ) : (
          <span className="verdict-count" aria-hidden="true">
            <span className="verdict-num">{left}</span>
            <span className="verdict-small">to {target}</span>
          </span>
        )}
      </Ring>
      <div className="verdict-text">
        <p className="label verdict-kicker">Verdict</p>
        <h3 className="verdict-word" id={`${p.id}-verdict`} data-stamp={stamp || undefined}>
          {word}
        </h3>
        <p className="verdict-detail">{detail}</p>
      </div>
    </section>
  );
}

function Phases({ p }: { p: Project }) {
  const n = p.phases.length;
  const size = 64;
  const c = size / 2;
  const r = c - 4;
  // One segment per real phase, like the exam turn dial (gak 15). Gaps of 14 degrees.
  const seg = (i: number) => {
    const gap = n > 1 ? 14 : 0;
    const a0 = ((i * 360) / n + gap / 2 - 90) * (Math.PI / 180);
    const a1 = (((i + 1) * 360) / n - gap / 2 - 90) * (Math.PI / 180);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    if (n === 1) return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r}`;
    return `M ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
  };

  return (
    <section className="run-phases" aria-labelledby={`${p.id}-phases`}>
      <h3 className="label" id={`${p.id}-phases`}>
        Phases
      </h3>
      <div className="phases-row">
        <svg className="phases-dial" viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" data-empty={n === 0 || undefined}>
          {n === 0 ? <circle cx={c} cy={c} r={r} /> : p.phases.map((_, i) => <path key={i} d={seg(i)} />)}
          <text x={c} y={c} dominantBaseline="central" textAnchor="middle">
            {n}
          </text>
        </svg>
        {n === 0 ? (
          <div className="phases-empty">
            <Todo what="the real phases, in order" />
            <p className="phases-note">Only phases that happened: brief, research, design, build, launch.</p>
          </div>
        ) : (
          <ol className="phases-list">
            {p.phases.map((ph, i) => (
              <li key={`${ph.name}-${i}`}>
                <span className="phases-i">{String(i + 1).padStart(2, '0')}</span>
                <span className="mark" data-shape={KIND_SHAPE[ph.kind]} aria-hidden="true" />
                <span className="phases-name">{ph.name}</span>
                <span className="label phases-kind">{ph.kind}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
