import type { ReactNode } from 'react';
import type { Project } from '@/content/projects';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { CodeBlock } from './CodeBlock';
import { EvalChart } from './EvalChart';
import { Table } from './Table';
import { H } from './env';

function Sub({ children, code }: { children: ReactNode; code: string }) {
  return (
    <div className="cf-sub">
      <span className="cf-sub__code t-label" aria-hidden>
        {code}
      </span>
      <H depth={2} className="cf-h3">
        {children}
      </H>
    </div>
  );
}

/**
 * The engineering half of a case study: the pipeline and its map, which steps are a model and
 * which are code (and why), the evals and how they gate releases, the budgets, what happens when
 * things fail, real mistakes from the error log, and an excerpt of the code that matters most.
 */
export function Engineering({ project }: { project: Project }) {
  const e = project.engineering;
  const tried = e.models.some((m) => m.tried);
  return (
    <div className="cf-eng">
      <ArchitectureDiagram project={project} />
      <ol className="eng-pipeline" aria-label="The pipeline, step by step">
        {e.pipeline.map((s, i) => (
          <li key={s.step}>
            <span className="eng-pipeline__n" aria-hidden>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>
              <b>{s.step}. </b>
              {s.detail}
            </span>
          </li>
        ))}
      </ol>

      <Sub code="E.1">Which steps are a model, and why</Sub>
      <Table
        caption="Model choices. Where a rule in code is safer or clearer, there is no model."
        head={['Task', 'Model', 'Why', ...(tried ? ['Tried instead'] : [])]}
        wrap={[1, 2, 3]}
        muted={[3]}
        rows={e.models.map((m) => [m.task, m.model.startsWith('No model') ? <b>{m.model}</b> : m.model, m.why, ...(tried ? [m.tried ?? '—'] : [])])}
      />

      <Sub code="E.2">Evals</Sub>
      <div className="cf-cols cf-prose">
        <p>
          <b>The set. </b>
          {e.evals.set}
        </p>
        <p>
          <b>How it gates a release. </b>
          {e.evals.gate}
        </p>
      </div>
      <EvalChart evals={e.evals} />
      {e.confusion && (
        <div className="cf-confusion">
          <Table compact caption={e.confusion.caption} head={e.confusion.head} rows={e.confusion.rows} />
          <p>{e.confusion.note}</p>
        </div>
      )}

      <Sub code="E.3">Budgets</Sub>
      <dl className="cf-budgets">
        {e.budgets.map((b) => (
          <div key={b.label} className="cf-budget">
            <dt className="t-label">{b.label}</dt>
            <dd>
              <span className="cf-budget__v">{b.value}</span>
              <span className="cf-budget__note">{b.note}</span>
            </dd>
          </div>
        ))}
      </dl>
      {e.scale && (
        <p className="cf-note">
          <span className="t-label">At 100×</span>
          <span>{e.scale}</span>
        </p>
      )}

      <Sub code="E.4">When it goes wrong</Sub>
      <dl className="eng-failures">
        {e.failures.map((f) => (
          <div key={f.when}>
            <dt>{f.when}</dt>
            <dd>{f.then}</dd>
          </div>
        ))}
      </dl>

      {e.monitoring && (
        <div className="cf-cols cf-monitor">
          <div className="cf-card">
            <p className="t-label">How I’d know at 3 a.m.</p>
            <ul className="cf-dots">
              {e.monitoring.watch.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
          <div className="cf-card cf-card--lcd lcd">
            <p className="t-label">
              <span className="led led--blink" aria-hidden /> One time it fired
            </p>
            <p>{e.monitoring.fired}</p>
          </div>
        </div>
      )}

      {e.incident && (
        <section className="eng-incident" aria-labelledby={`incident-${project.slug}`}>
          <p className="t-label">Incident report</p>
          <H depth={3} id={`incident-${project.slug}`} className="cf-h4">
            {e.incident.title}
          </H>
          <dl className="eng-incident__grid">
            <div>
              <dt>What happened</dt>
              <dd>{e.incident.what}</dd>
            </div>
            <div>
              <dt>Impact</dt>
              <dd>{e.incident.impact}</dd>
            </div>
            <div>
              <dt>What changed</dt>
              <dd>
                <ul className="cf-arrows">
                  {e.incident.changed.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </section>
      )}

      <Sub code="E.5">From the error log</Sub>
      <Table
        caption="Real mistakes the system made, and what each one changed"
        head={['It said', 'The truth', 'Why', 'The fix']}
        wrap={[0, 1, 2, 3]}
        rows={e.errorLog.map((r) => [r.said, r.truth, r.why, r.fix])}
      />

      <Sub code="E.6">The code that matters most</Sub>
      <CodeBlock file={e.code.file} lang={e.code.lang} caption={e.code.caption} source={e.code.source} repo={project.links.repo} />
    </div>
  );
}
