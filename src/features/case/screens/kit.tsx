/* ==========================================================================
   The heavy half of a case study, loaded on demand: every product screen
   (coded mockups of Tenderlens, Ask HR, Catat and Lintas), the wireframes
   of each round, and the click-through flow player. CaseFile reaches these
   through lazy() wrappers in ../Lazy.tsx, so the reader's text paints first.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { Phone } from './Phone';
import { SCREENS, WIRES } from './registry';
import { FLOWS } from './flows';
import './screens.css';

/** One product screen in its phone, by key. `label` makes it an image for screen readers. */
export function Screen({ id, label, className }: { id: string; label?: string; className?: string }) {
  const s = SCREENS[id];
  if (!s) return null;
  const { Component } = s;
  return (
    <Phone time={s.time} dark={s.dark} android={s.android} label={label} className={className}>
      <Component />
    </Phone>
  );
}

/** Round `n` of a project's key screen, as a low-fidelity wireframe. */
export function Wire({ slug, n, label }: { slug: string; n: number; label: string }) {
  const W = WIRES[slug]?.[n];
  if (!W) return null;
  return (
    <Phone className="dp--wire" android={slug === 'catat'} label={label}>
      <W />
    </Phone>
  );
}

type Box = { left: number; top: number; width: number; height: number };

/** The tap ring: 6px around the target, never smaller than a 44px touch target (centred on it). */
function hotStyle(b: Box) {
  const w = Math.max(44, b.width + 12);
  const h = Math.max(44, b.height + 12);
  return { left: b.left + b.width / 2 - w / 2, top: b.top + b.height / 2 - h / 2, width: w, height: h };
}

/**
 * The main flow as a click-through prototype: tap the pulsing spot on the phone (or pick a step)
 * and the next screen comes in. The spot sits on the real element inside the screen, so it
 * follows the layout at any size. Steps are buttons too, so it all works from the keyboard.
 */
export function FlowPlayer({ slug, name, onTick }: { slug: string; name: string; onTick?: () => void }) {
  const steps = FLOWS[slug];
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const step = steps?.[i];
  const last = steps ? i === steps.length - 1 : true;

  // Put the hotspot on the element the step points at, and keep it there when the phone resizes.
  useEffect(() => {
    const phone = phoneRef.current;
    const target = step?.tap?.target;
    if (!phone || !target) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = phone.querySelector<HTMLElement>(`[data-flow-screen] ${target}`);
        if (!el) return setBox(null);
        // offset* is immune to the panel's emerge transform; walk up to the phone
        let left = 0;
        let top = 0;
        let n: HTMLElement | null = el;
        while (n && n !== phone) {
          left += n.offsetLeft;
          top += n.offsetTop;
          n = n.offsetParent as HTMLElement | null;
        }
        if (n !== phone) {
          const p = phone.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          return setBox({ left: r.left - p.left, top: r.top - p.top, width: r.width, height: r.height });
        }
        setBox({ left, top, width: el.offsetWidth, height: el.offsetHeight });
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(phone);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [step]);

  if (!steps || !step) return null;

  const go = (n: number) => {
    onTick?.();
    setBox(null);
    setI(n);
  };
  const next = () => go(last ? 0 : i + 1);

  return (
    <div className="flow">
      <div className={`flow__stage case-stage--${slug}`}>
        <span className="flow__fig t-label" aria-hidden>
          Prototype · step {i + 1}/{steps.length}
        </span>
        <div ref={phoneRef} className="flow__phone">
          <div key={step.key} className="flow__screen" data-flow-screen="">
            <Screen id={step.key} label={`${name}, step ${i + 1} of ${steps.length}: ${step.title}. ${step.note}`} />
          </div>
          {step.tap?.target && box && (
            <button
              type="button"
              className="flow__hot"
              style={hotStyle(box)}
              onClick={next}
              aria-label={`${step.tap.label} (go to step ${i + 2})`}
            />
          )}
        </div>
      </div>

      <div className="flow__side">
        <p className="t-label">Try the main flow</p>
        <p className="flow__lead">Tap the pulsing spot on the phone, or use the steps.</p>
        <ol className="flow__steps">
          {steps.map((s, k) => (
            <li key={s.key}>
              <button type="button" className="flow__step" aria-current={k === i ? 'step' : undefined} onClick={() => go(k)}>
                <span className="flow__num" aria-hidden>
                  {k + 1}
                </span>
                <span>
                  <span className="flow__title">{s.title}</span>
                  {k === i && <span className="flow__note">{s.note}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn--sm flow__next" onClick={next}>
          {last ? 'Start again' : `Next: ${step.tap?.label ?? 'continue'}`}
        </button>
        <p className="sr-only" aria-live="polite">
          Step {i + 1} of {steps.length}: {step.title}
        </p>
      </div>
    </div>
  );
}
