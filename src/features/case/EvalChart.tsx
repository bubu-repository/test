import type { Engineering } from "@/content/projects";

/*
 * How each version of the system scored on the frozen eval set: one small line chart per metric
 * (different units never share an axis), every point labelled with its value so nothing depends
 * on hover or colour, and a table underneath with what changed in each version.
 */

const W = 360;
const H = 168;
const PAD = { top: 26, right: 18, bottom: 30, left: 18 };

function Multiple({
  name,
  unit,
  better,
  values,
  versions,
  reverted,
}: {
  name: string;
  unit: string;
  better: "up" | "down";
  values: number[];
  versions: string[];
  reverted: boolean[];
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  // "Up is good" metrics start near their lowest value; error rates start at zero.
  const lo = better === "up" ? Math.max(0, Math.floor((min - 6) / 10) * 10) : 0;
  const hi = better === "up" ? Math.min(100, Math.ceil((max + 2) / 10) * 10) : Math.ceil((max * 1.25) / 2) * 2 || 1;
  const x = (i: number) => PAD.left + (i / Math.max(1, values.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  // The line joins the versions that shipped; a reverted experiment hangs off the one before it.
  const kept = values.map((v, i) => ({ v, i })).filter((p) => !reverted[p.i]);
  const d = kept.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const branches = values
    .map((v, i) => ({ v, i }))
    .filter((p) => reverted[p.i] && p.i > 0)
    .map((p) => `M${x(p.i - 1).toFixed(1)} ${y(values[p.i - 1]).toFixed(1)} L${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`)
    .join(" ");
  const first = values[0];
  const last = values[values.length - 1];
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`;
  const summary = `${name}: from ${fmt(first)} in ${versions[0]} to ${fmt(last)} in ${versions[versions.length - 1]}. ${better === "up" ? "Higher" : "Lower"} is better.`;

  return (
    <figure className="evalchart">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-14 font-semibold">{name}</span>
        <span className="text-12 text-muted">{better === "up" ? "higher is better" : "lower is better"}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="mt-2 w-full">
        <line x1={PAD.left} x2={W - PAD.right} y1={y(lo)} y2={y(lo)} className="evalchart__axis" />
        <path d={d} className={better === "up" ? "evalchart__line" : "evalchart__line evalchart__line--down"} />
        {branches && <path d={branches} className="evalchart__branch" />}
        {values.map((v, i) => {
          const isLast = i === values.length - 1;
          return (
            <g key={versions[i]}>
              <circle
                cx={x(i)}
                cy={y(v)}
                r={isLast ? 5.5 : 3.5}
                className={isLast ? "evalchart__dot evalchart__dot--last" : reverted[i] ? "evalchart__dot evalchart__dot--reverted" : "evalchart__dot"}
              />
              <text x={x(i)} y={y(v) - 10} textAnchor="middle" className={isLast ? "evalchart__value evalchart__value--last" : "evalchart__value"}>
                {fmt(v)}
              </text>
              <text x={x(i)} y={H - 8} textAnchor="middle" className="evalchart__tick">
                {versions[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function EvalChart({ evals }: { evals: Engineering["evals"] }) {
  const versions = evals.history.map((h) => h.version);
  const reverted = evals.history.map((h) => Boolean(h.reverted));
  return (
    <div>
      <div className={evals.series.length > 2 ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3 md:grid-cols-2"}>
        {evals.series.map((s, i) => (
          <Multiple
            key={s.name}
            name={s.name}
            unit={s.unit}
            better={s.better}
            values={evals.history.map((h) => h.values[i])}
            versions={versions}
            reverted={reverted}
          />
        ))}
      </div>
      <div className="case-table mt-3">
        <table>
          <caption>{evals.caption ?? "What changed in each version, scored on the same set"}</caption>
          <thead>
            <tr>
              <th scope="col">Version</th>
              <th scope="col">What changed</th>
              {evals.series.map((s) => (
                <th key={s.name} scope="col">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evals.history.map((h, k) => (
              <tr key={h.version} data-chosen={k === evals.history.length - 1 || undefined}>
                <th scope="row">{h.version}</th>
                <td className="case-table__wrap">
                  {h.change}
                  {h.reverted && <span className="ml-1.5 text-muted">(reverted, off the line)</span>}
                </td>
                {h.values.map((v, i) => (
                  <td key={evals.series[i].name}>
                    {Number.isInteger(v) ? v : v.toFixed(1)}
                    {evals.series[i].unit}
                    {h.counts?.[i] && <span className="ml-1.5 text-12 font-normal text-muted">({h.counts[i]})</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
