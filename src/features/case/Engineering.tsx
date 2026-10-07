import type { Project } from "@/content/projects";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { CodeBlock } from "./CodeBlock";
import { EvalChart } from "./EvalChart";

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-14 mb-5 text-24 leading-tight font-bold tracking-[-0.025em]">{children}</h3>;
}

/**
 * The engineering half of a case study: the pipeline and its map, which steps are a model and
 * which are code (and why), the evals and how they gate releases, the budgets, what happens when
 * things fail, real mistakes from the error log, and an excerpt of the code that matters most.
 */
export function Engineering({ project }: { project: Project }) {
  const e = project.engineering;
  return (
    <div>
      <ArchitectureDiagram project={project} />
      <ol className="eng-pipeline mt-8 md:grid-cols-2 md:gap-x-10" aria-label="The pipeline, step by step">
        {e.pipeline.map((s, i) => (
          <li key={s.step}>
            <span className="eng-pipeline__n" aria-hidden="true">
              {i + 1}
            </span>
            <span>
              <span className="font-semibold">{s.step}. </span>
              {s.detail}
            </span>
          </li>
        ))}
      </ol>

      <Sub>Which steps are a model, and why</Sub>
      <div className="case-table">
        <table>
          <caption>Model choices. Where a rule in code is safer or clearer, there is no model.</caption>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Model</th>
              <th scope="col">Why</th>
              {e.models.some((m) => m.tried) && <th scope="col">Tried instead</th>}
            </tr>
          </thead>
          <tbody>
            {e.models.map((m) => (
              <tr key={m.task}>
                <th scope="row">{m.task}</th>
                <td className={m.model.startsWith("No model") ? "font-semibold" : undefined}>{m.model}</td>
                <td className="case-table__wrap">{m.why}</td>
                {e.models.some((x) => x.tried) && <td className="case-table__wrap text-muted">{m.tried ?? "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sub>Evals</Sub>
      <div className="grid gap-4 text-16 md:grid-cols-2">
        <p>
          <span className="font-semibold">The set. </span>
          {e.evals.set}
        </p>
        <p>
          <span className="font-semibold">How it gates a release. </span>
          {e.evals.gate}
        </p>
      </div>
      <div className="mt-6">
        <EvalChart evals={e.evals} />
      </div>
      {e.confusion && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-center">
          <div className="case-table">
            <table>
              <caption>{e.confusion.caption}</caption>
              <thead>
                <tr>
                  {e.confusion.head.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.confusion.rows.map((r) => (
                  <tr key={r[0]}>
                    {r.map((cell, j) =>
                      j === 0 ? (
                        <th key={j} scope="row">
                          {cell}
                        </th>
                      ) : (
                        <td key={j}>{cell}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-16">{e.confusion.note}</p>
        </div>
      )}

      <Sub>Budgets</Sub>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {e.budgets.map((b) => (
          <div key={b.label} className="widget p-5">
            <dt className="text-12 text-muted">{b.label}</dt>
            <dd className="mt-1">
              <span className="block text-24 font-bold tracking-[-0.03em] tabular-nums">{b.value}</span>
              <span className="mt-1 block text-12 text-muted">{b.note}</span>
            </dd>
          </div>
        ))}
      </dl>

      {e.scale && (
        <p className="mt-4 flex max-w-[80ch] gap-3 rounded-[20px] border border-line px-5 py-4 text-16">
          <span className="type-pixel shrink-0 pt-1 text-ink">At 100×</span>
          <span>{e.scale}</span>
        </p>
      )}

      <Sub>When it goes wrong</Sub>
      <dl className="eng-failures">
        {e.failures.map((f) => (
          <div key={f.when}>
            <dt>{f.when}</dt>
            <dd>{f.then}</dd>
          </div>
        ))}
      </dl>

      {e.monitoring && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="widget p-6">
            <p className="type-pixel text-muted">How I&apos;d know at 3 a.m.</p>
            <ul className="mt-3 space-y-2 text-16">
              {e.monitoring.watch.map((w) => (
                <li key={w} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-ink" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="widget p-6">
            <p className="type-pixel text-muted">One time it fired</p>
            <p className="mt-3 text-16">{e.monitoring.fired}</p>
          </div>
        </div>
      )}

      {e.incident && (
        <section className="eng-incident" aria-labelledby={`incident-${project.slug}`}>
          <p className="type-pixel">Incident</p>
          <h4 id={`incident-${project.slug}`} className="mt-2 text-24 leading-tight font-bold tracking-[-0.025em]">
            {e.incident.title}
          </h4>
          <dl className="mt-4 grid gap-4 text-16 md:grid-cols-3">
            <div>
              <dt className="font-semibold">What happened</dt>
              <dd className="mt-1">{e.incident.what}</dd>
            </div>
            <div>
              <dt className="font-semibold">Impact</dt>
              <dd className="mt-1">{e.incident.impact}</dd>
            </div>
            <div>
              <dt className="font-semibold">What changed</dt>
              <dd className="mt-1">
                <ul className="space-y-1.5">
                  {e.incident.changed.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span aria-hidden="true">→</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </section>
      )}

      <Sub>From the error log</Sub>
      <div className="case-table">
        <table>
          <caption>Real mistakes the system made, and what each one changed</caption>
          <thead>
            <tr>
              <th scope="col">It said</th>
              <th scope="col">The truth</th>
              <th scope="col">Why</th>
              <th scope="col">The fix</th>
            </tr>
          </thead>
          <tbody>
            {e.errorLog.map((r) => (
              <tr key={r.said}>
                <th scope="row" className="case-table__wrap">
                  {r.said}
                </th>
                <td className="case-table__wrap">{r.truth}</td>
                <td className="case-table__wrap">{r.why}</td>
                <td className="case-table__wrap">{r.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sub>The code that matters most</Sub>
      <CodeBlock file={e.code.file} lang={e.code.lang} caption={e.code.caption} source={e.code.source} repo={project.links.repo} />
    </div>
  );
}
