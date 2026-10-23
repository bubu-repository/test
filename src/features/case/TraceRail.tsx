import { useEffect, useState, type MouseEvent, type RefObject } from 'react';
import { offsetWithin, scrollToEl, useCase } from './env';
import { sectionId } from './data';

export type TraceStep = { id: string; label: string };

/**
 * The case's contents: which section you're reading, how far along you are, and how many minutes
 * are left at a calm reading pace (230 words a minute). On narrow layouts it folds into a thin
 * progress bar at the top.
 */
export function TraceRail({ steps, bodyRef }: { steps: TraceStep[]; bodyRef: RefObject<HTMLElement | null> }) {
  const { scrollRoot, mode, tick } = useCase();
  const [active, setActive] = useState(steps[0]?.id);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const words = body.innerText.split(/\s+/).length;
    setTotal(Math.max(1, Math.round(words / 230)));
    const sections = steps.map((s) => document.getElementById(sectionId(s.id))).filter(Boolean) as HTMLElement[];

    // Where things are, in the scroller's own coordinates (layout offsets inside the room's panel,
    // which may still be tipping in with a 3D transform; page coordinates on the plain page).
    const topOf = (el: HTMLElement) => (scrollRoot ? offsetWithin(el, scrollRoot) : el.getBoundingClientRect().top + window.scrollY);
    let raf = 0;
    const measure = () => {
      raf = 0;
      const y = scrollRoot ? scrollRoot.scrollTop : window.scrollY;
      const h = scrollRoot ? scrollRoot.clientHeight : window.innerHeight;
      const top = topOf(body);
      setProgress(Math.min(1, Math.max(0, (y + h * 0.5 - top) / body.offsetHeight)));
      // the active step: the last section whose top has passed 30% of the view
      let on = steps[0]?.id;
      for (const el of sections) if (topOf(el) <= y + h * 0.3) on = el.id.replace(/^case-/, '');
      setActive(on);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const target: HTMLElement | Window = scrollRoot ?? window;
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();
    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [steps, scrollRoot, bodyRef]);

  const jump = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    tick?.();
    const el = document.getElementById(sectionId(id));
    scrollToEl(el, scrollRoot, mode === 'page' ? 84 : 12);
    if (mode === 'page') history.replaceState(history.state, '', `#${id}`);
    // move focus to the section heading so keyboard and screen-reader users land there too
    const h = el?.querySelector<HTMLElement>('h2, h3');
    if (h) {
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
  };

  const left = Math.max(0, Math.round((1 - progress) * total));

  return (
    <>
      <div className="cf-progress" aria-hidden>
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
      <nav className="cf-rail" aria-label="Case study contents">
        <p className="t-label">Contents</p>
        <ol className="cf-rail__list">
          <span className="cf-rail__fill" aria-hidden style={{ height: `${progress * 100}%` }} />
          {steps.map((step, i) => {
            const on = step.id === active;
            return (
              <li key={step.id}>
                <a href={`#${step.id}`} onClick={jump(step.id)} aria-current={on ? 'step' : undefined} className={on ? 'is-on' : ''}>
                  <span className="cf-rail__n">{String(i + 1).padStart(2, '0')}</span>
                  {step.label}
                </a>
              </li>
            );
          })}
        </ol>
        <div className="cf-rail__time lcd">
          <span className="t-label">Reading time</span>
          <b className="t-dot">
            {left}
            <small> min</small>
          </b>
          <span className="cf-rail__of">left of {total}</span>
        </div>
      </nav>
    </>
  );
}
