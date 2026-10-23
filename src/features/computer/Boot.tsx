/* Adelia OS — Adelia BIOS power-on self test + startup screen. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/audio/engine';
import { CHAPTERS, COMPANY } from '@/lib/content';
import { DropMark } from './icons';

interface Line {
  text: string;
  hi?: boolean;
  /** count-up number inserted after `text` (memory test) */
  count?: { to: number; suffix: string };
}

const LINES: Line[] = [
  { text: 'Adelia BIOS v26.10 · AT-26 personal workstation', hi: true },
  { text: `(C) ${COMPANY.founded}–2026 ${COMPANY.name} · Made in ${COMPANY.city}` },
  { text: '' },
  { text: `Processor  : ${COMPANY.role}, ${COMPANY.cohort.toLowerCase()}` },
  { text: 'Eval cases : ', count: { to: 2100, suffix: '+ labelled by hand OK' } },
  { text: 'Detecting tools… retrieval · evals · agents · design · full-stack' },
  { text: `Mounting /archive ${COMPANY.founded} → 2026… OK` },
  { text: 'Writing the eval before the prompt… OK' },
];

export default function Boot({ fast, onDone }: { fast: boolean; onDone: () => void }) {
  const cps = fast ? 560 : 150; // characters per second
  const pause = fast ? 25 : 110;
  const countMs = fast ? 160 : 600;
  const logoMs = fast ? 650 : 1400;

  // timeline: [start, typeEnd, countEnd, end] per line
  const plan = useMemo(() => {
    let t = fast ? 120 : 300;
    return LINES.map((l) => {
      const start = t;
      const typeEnd = start + (l.text.length / cps) * 1000;
      const countEnd = l.count ? typeEnd + countMs : typeEnd;
      const end = countEnd + (l.count ? (l.count.suffix.length / cps) * 1000 : 0);
      t = end + pause;
      return { start, typeEnd, countEnd, end };
    });
  }, [fast, cps, pause, countMs]);
  const biosEnd = plan[plan.length - 1].end + (fast ? 120 : 520);
  const total = biosEnd + logoMs;

  const [t, setT] = useState(0);
  const doneRef = useRef(false);
  const beeped = useRef(new Set<number>());

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const el = now - t0;
      setT(el);
      if (el >= total) return finish();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab' || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      sfx('click');
      finish();
    };
    window.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // little POST beeps on the OK lines
  useEffect(() => {
    plan.forEach((p, i) => {
      const l = LINES[i];
      if ((l.text.endsWith('OK') || l.count) && t >= p.end && !beeped.current.has(i)) {
        beeped.current.add(i);
        sfx('beep', { gain: 0.35, pitch: i % 2 ? 0 : -5 });
      }
    });
  }, [t, plan]);

  const inLogo = t >= biosEnd;
  const progress = Math.min(1, Math.max(0, (t - biosEnd) / logoMs));

  return (
    <div className={`os-boot ${inLogo ? 'is-logo' : ''}`} onPointerDown={finish} role="status" aria-live="polite" aria-label={inLogo ? 'Adelia OS is starting' : 'Adelia BIOS self test'}>
      {!inLogo ? (
        <div className="os-bios">
          <div className="os-bios__badge" aria-hidden>
            <DropMark size={30} />
            <span>
              {COMPANY.cohort.split(' ').slice(0, 2).join(' ')}
              <br />
              {COMPANY.cohort.split(' ').slice(2).join(' ')}
            </span>
          </div>
          {LINES.map((l, i) => {
            const p = plan[i];
            if (t < p.start) return null;
            const typed = l.text.slice(0, Math.floor(((Math.min(t, p.typeEnd) - p.start) / 1000) * cps));
            let count = '';
            let suffix = '';
            if (l.count && t >= p.typeEnd) {
              const k = Math.min(1, (t - p.typeEnd) / countMs);
              count = Math.round(l.count.to * k)
                .toLocaleString('en-US')
                .padStart(5, ' ');
              if (t >= p.countEnd) suffix = l.count.suffix.slice(0, Math.floor(((t - p.countEnd) / 1000) * cps));
            }
            const full = typed + count + suffix;
            const active = t < p.end + pause;
            return (
              <p key={i} className={`os-bios__line ${l.hi ? 'is-hi' : ''}`}>
                {renderOk(full)}
                {active && <i className="os-caret" />}
              </p>
            );
          })}
          <p className="os-bios__foot">AT-26 · ROM 26.10 · {COMPANY.city}</p>
        </div>
      ) : (
        <div className="os-hello">
          <div className="os-hello__mark" aria-hidden>
            <DropMark size={46} />
            <span>adelia</span>
            <b>OS</b>
          </div>
          <p className="os-hello__sub t-label">Welcome to Adelia OS 26.10</p>
          <div className="os-hello__bar" aria-hidden>
            <i style={{ transform: `scaleX(${progress})` }} />
          </div>
          <p className="os-hello__note">Starting up · {CHAPTERS[0].line}</p>
        </div>
      )}
      <button
        className="os-boot__skip"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          sfx('click');
          finish();
        }}
      >
        Press any key to skip ›
      </button>
    </div>
  );
}

function renderOk(s: string) {
  const i = s.lastIndexOf('OK');
  if (i < 0 || i !== s.length - 2) return s;
  return (
    <>
      {s.slice(0, i)}
      <b className="os-ok">OK</b>
    </>
  );
}
