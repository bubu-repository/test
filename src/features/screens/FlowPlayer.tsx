"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sound";
import { FLOWS } from "./flows";
import { Screen } from "./Screen";

type Box = { left: number; top: number; width: number; height: number };

/**
 * The main flow as a click-through prototype: tap the pulsing spot on the phone (or pick a step)
 * and the next screen comes in. The spot is placed on the real element inside the screen, so it
 * follows the layout at any size. Steps are buttons too, so it all works from the keyboard.
 */
export function FlowPlayer({ slug, name }: { slug: string; name: string }) {
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
        const p = phone.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        setBox({ left: r.left - p.left, top: r.top - p.top, width: r.width, height: r.height });
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
    sfx.tick();
    setBox(null);
    setI(n);
  };
  const next = () => go(last ? 0 : i + 1);

  return (
    <div className="flow">
      <div className={`flow__stage case-stage--${slug}`}>
        <div ref={phoneRef} className="flow__phone">
          <div key={step.key} className="flow__screen" data-flow-screen="">
            <Screen id={step.key} label={`${name}, step ${i + 1} of ${steps.length}: ${step.title}. ${step.note}`} />
          </div>
          {step.tap?.target && box && (
            <button
              type="button"
              className="flow__hot"
              style={{ left: box.left - 6, top: box.top - 6, width: box.width + 12, height: box.height + 12 }}
              onClick={next}
              aria-label={`${step.tap.label} (go to step ${i + 2})`}
              data-cursor="Tap"
            />
          )}
        </div>
      </div>

      <div className="flow__side">
        <p className="type-pixel text-muted">Try the main flow</p>
        <p className="mt-2 text-24 leading-tight font-bold tracking-[-0.025em]">Tap the pulsing spot on the phone, or use the steps.</p>
        <ol className="flow__steps">
          {steps.map((s, k) => (
            <li key={s.key}>
              <button type="button" className="flow__step" aria-current={k === i ? "step" : undefined} onClick={() => go(k)}>
                <span className="flow__num" aria-hidden="true">
                  {k + 1}
                </span>
                <span>
                  <span className="block text-16 font-semibold">{s.title}</span>
                  {k === i && <span className="mt-1 block text-14 text-muted">{s.note}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="pill mt-5" onClick={next}>
          {last ? "Start again" : `Next: ${step.tap?.label ?? "continue"}`}
        </button>
        <p className="sr-only" aria-live="polite">
          Step {i + 1} of {steps.length}: {step.title}
        </p>
      </div>
    </div>
  );
}
