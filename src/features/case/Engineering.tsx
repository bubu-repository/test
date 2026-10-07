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
            </tr>
          </thead>
          <tbody>
            {e.models.map((m) => (
              <tr key={m.task}>
                <th scope="row">{m.task}</th>
                <td className={m.model.startsWith("No model") ? "font-semibold" : undefined}>{m.model}</td>
                <td className="case-table__wrap">{m.why}</td>
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

      <Sub>When it goes wrong</Sub>
      <dl className="eng-failures">
        {e.failures.map((f) => (
          <div key={f.when}>
            <dt>{f.when}</dt>
            <dd>{f.then}</dd>
          </div>
        ))}
      </dl>

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
