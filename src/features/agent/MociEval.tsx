"use client";

import { useState } from "react";
import { sfx } from "@/lib/sound";
import { think, type BrainAnswer } from "./brain";
import { MOCI_CASES } from "./evals";

type Row = { pass: boolean; answer: BrainAnswer; ms: number };

function describe(a: BrainAnswer): string {
  const action = a.actions[0];
  if (action) return action.type === "navigate" ? `navigate → ${action.href}` : `action: ${action.type}`;
  if (a.confidence <= 0.2) return `abstained: "${a.text}"`;
  return a.href ? `${a.text} [source: ${a.href}]` : a.text;
}

/**
 * Runs Moci's eval in the visitor's browser: every case through the offline brain, timed, with
 * what it answered and whether that passes. Known failures stay in the table, marked as known.
 */
export function MociEval() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);

  const run = () => {
    sfx.tick();
    const t0 = performance.now();
    const out = MOCI_CASES.map((c) => {
      const s = performance.now();
      const answer = think(c.q);
      return { pass: c.check(answer), answer, ms: performance.now() - s };
    });
    setTotal(performance.now() - t0);
    setRows(out);
  };

  const passed = rows?.filter((r) => r.pass).length ?? 0;
  const known = rows ? MOCI_CASES.filter((c, i) => c.known && !rows[i].pass).length : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className="pill" data-variant="magenta" onClick={run}>
          {rows ? "Run it again" : `Run ${MOCI_CASES.length} checks in your browser`}
        </button>
        <p className="text-16" role="status" aria-live="polite">
          {rows ? (
            <>
              <span className="font-bold">
                {passed} of {MOCI_CASES.length} passed
              </span>{" "}
              in {total.toFixed(1)} ms{known ? `, ${known} known failure${known > 1 ? "s" : ""} (explained below)` : ""}.
            </>
          ) : (
            <span className="text-muted">Nothing is sent anywhere: it runs the offline brain right here.</span>
          )}
        </p>
      </div>

      <div className="case-table mt-5">
        <table>
          <caption>Moci&apos;s eval cases: what a good answer must do{rows ? ", and what it actually did" : ""}</caption>
          <thead>
            <tr>
              <th scope="col">Question</th>
              <th scope="col">Kind</th>
              <th scope="col">A good answer</th>
              {rows && <th scope="col">What it did</th>}
              {rows && <th scope="col">Result</th>}
            </tr>
          </thead>
          <tbody>
            {MOCI_CASES.map((c, i) => {
              const r = rows?.[i];
              return (
                <tr key={c.q}>
                  <th scope="row" className="case-table__wrap">
                    {c.q}
                  </th>
                  <td>{c.kind}</td>
                  <td className="case-table__wrap">{c.expect}</td>
                  {r && <td className="case-table__wrap font-mono text-12">{describe(r.answer)}</td>}
                  {r && (
                    <td className="case-table__wrap">
                      <span className="chip font-semibold" data-tone={r.pass ? "lime" : "red"}>
                        {r.pass ? "✓ Pass" : c.known ? "✗ Known failure" : "✗ Fail"}
                      </span>
                      {!r.pass && c.known && <span className="mt-1 block text-12 text-muted">{c.known}</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
