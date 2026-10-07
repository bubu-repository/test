"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";
import { sfx } from "@/lib/sound";
import { matchJD, SAMPLE_JD, type MatchResult } from "./jd";

function Ring({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="size-32 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke="url(#jd-iris)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
        className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
      />
      <defs>
        <linearGradient id="jd-iris" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F41B8D" />
          <stop offset="55%" stopColor="#B86BFF" />
          <stop offset="100%" stopColor="#39C6E6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Paste a job description: the matcher finds the skill areas it asks for, shows which ones
 * Adelia has (with evidence and the project that proves it), and names the honest gaps.
 */
export function JdMatcher() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [shownScore, setShownScore] = useState(0);
  const id = useId();
  const calm = useReducedMotion();

  const run = (value = text) => {
    const r = matchJD(value);
    setResult(r);
    setShownScore(0);
    sfx.pop();
    // Let the ring draw from zero.
    window.setTimeout(() => setShownScore(r.score), calm ? 0 : 60);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-xr="JdMatcher · keyword taxonomy, no API needed">
      <form
        className="widget flex flex-col p-5 md:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label htmlFor={id} className="text-16 font-semibold">
          Job description
        </label>
        <textarea
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={11}
          placeholder="Paste the role here. Nothing leaves your browser."
          className="mt-3 w-full flex-1 resize-y rounded-[18px] border border-line bg-surface-2 p-4 text-16 leading-relaxed outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="pill" data-variant="magenta" disabled={!text.trim()}>
            Match it
          </button>
          <button
            type="button"
            className="link-arrow text-16"
            onClick={() => {
              setText(SAMPLE_JD);
              run(SAMPLE_JD);
            }}
          >
            Try a sample JD
          </button>
        </div>
      </form>

      <div aria-live="polite" className="min-w-0">
        {result ? (
          <div className="widget p-5 md:p-6">
            {result.matched.length + result.gaps.length === 0 ? (
              <p className="text-muted">I couldn&apos;t find any skills I recognise in that text. Try pasting the requirements section, or ask Moci instead.</p>
            ) : (
              <>
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <Ring score={shownScore} />
                    <span className="absolute inset-0 grid place-items-center text-32 font-bold tracking-[-0.04em] tabular-nums">{result.score}%</span>
                  </div>
                  <div>
                    <p className="text-20 font-bold tracking-[-0.02em]">
                      {result.score >= 80 ? "Strong match" : result.score >= 55 ? "Good match" : "Partial match"}
                    </p>
                    <p className="mt-1 text-14 text-muted">
                      {result.matched.length} of {result.matched.length + result.gaps.length} skill areas in this JD, weighted by how central they are.
                    </p>
                  </div>
                </div>

                <h3 className="type-pixel mt-6 text-muted">What it asks for, and the proof</h3>
                <ul className="mt-3 space-y-2">
                  {result.matched.map((s) => (
                    <li key={s.id} className="flex items-start gap-3 rounded-[14px] bg-surface-2 px-3.5 py-2.5 text-14">
                      <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint text-[11px] font-bold text-on-fill">
                        ✓
                      </span>
                      <span className="min-w-0">
                        <span className="font-semibold">{s.label}</span>
                        <span className="text-muted"> · {s.evidence}</span>
                        {s.project && (
                          <Link href={`/work/${s.project}`} className="link ml-1.5 whitespace-nowrap">
                            see {s.project}
                          </Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {result.gaps.length > 0 && (
                  <>
                    <h3 className="type-pixel mt-6 text-muted">Honest gaps</h3>
                    <ul className="mt-3 space-y-2">
                      {result.gaps.map((s) => (
                        <li key={s.id} className={cn("flex items-start gap-3 rounded-[14px] border border-dashed border-line px-3.5 py-2.5 text-14")}>
                          <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-bold">
                            –
                          </span>
                          <span>
                            <span className="font-semibold">{s.label}</span>
                            <span className="text-muted"> · {s.evidence}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="pill"
                    data-size="sm"
                    onClick={() =>
                      dispatch({
                        type: "ask",
                        question: `Is Adelia a good fit for this role? ${text.slice(0, 700)}`,
                      })
                    }
                  >
                    Second opinion from Moci
                  </button>
                  <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="pill" data-size="sm" data-variant="ghost">
                    Download the CV
                  </a>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid h-full min-h-[280px] place-items-center rounded-[28px] border border-dashed border-line p-8 text-center text-muted">
            <p className="max-w-[34ch]">Paste a job description and I&apos;ll show what matches, with the project that proves it, and where the gaps are.</p>
          </div>
        )}
      </div>
    </div>
  );
}
