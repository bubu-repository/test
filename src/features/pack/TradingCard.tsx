/* ==========================================================================
   One of her products as a trading card (ported from the old adelia.cc
   HoloCard): a metallic frame in the product's colour, an art window (its
   poster from the Wall of Work), a type line, the three numbers as moves,
   flavour text and a collector number. Holo pulls shine in the art window;
   the glare and tilt follow the pointer (on touch screens the foil drifts
   on its own). The printed back is shared with the daily cards.
   ========================================================================== */
import { useRef, type CSSProperties, type PointerEvent } from 'react';
import type { Project } from '@/content/projects';
import { identity } from '@/content/profile';
import { Mark } from '@/ui/Icon';
import { sfx } from '@/audio/engine';

/** One colour per product, from the room: pink, baby blue, mint, chrome-blue. */
const FRAME: Record<string, { frame: string; ink: string }> = {
  tenderlens: { frame: 'linear-gradient(140deg, #ffe3ef, #ff9cc8 40%, #a9d6f5 78%, #ffffff)', ink: '#c2286f' },
  'ask-hr': { frame: 'linear-gradient(140deg, #eaf5fe, #a9d6f5 42%, #5aa9e6 78%, #ffd6e8)', ink: '#1f5f96' },
  catat: { frame: 'linear-gradient(140deg, #e3f7ee, #9ee6c8 42%, #ffb3d3 82%, #ffffff)', ink: '#167357' },
  lintas: { frame: 'linear-gradient(140deg, #f4f7fa, #b3bfcd 40%, #5aa9e6 78%, #ffd6e8)', ink: '#1f5f96' },
};

/** The four posters on the Wall of Work, in the case studies' order. */
const POSTER: Record<string, string> = {
  tenderlens: '/assets/posters/poster-1.webp',
  'ask-hr': '/assets/posters/poster-2.webp',
  catat: '/assets/posters/poster-3.webp',
  lintas: '/assets/posters/poster-4.webp',
};

const pad3 = (n: number | string) => String(n).padStart(3, '0');

export function TradingCard({ project, number, total, holo, label }: { project: Project; number: number; total: number; holo: boolean; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const c = FRAME[project.slug] ?? FRAME.tenderlens;

  const onMove = (e: PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.dataset.live = 'true';
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    el.style.setProperty('--bgx', `${(30 + px * 40).toFixed(1)}%`);
    el.style.setProperty('--bgy', `${(30 + py * 40).toFixed(1)}%`);
    el.style.setProperty('--rx', `${((0.5 - py) * 16).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((px - 0.5) * 20).toFixed(2)}deg`);
    el.style.setProperty('--o', '1');
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.live;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--o', '0');
  };

  return (
    <div
      ref={ref}
      className="tcg"
      data-finish={holo ? 'holo' : 'etched'}
      style={{ '--frame': c.frame, '--tone-ink': c.ink } as CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerEnter={() => sfx('tick', { gain: 0.4 })}
      role="img"
      aria-label={`${project.name}, ${label ?? (holo ? 'holo rare' : 'product')} card: ${project.tagline}`}
    >
      <div className="tcg__tilt">
        <div className="tcg__face tcg__front">
          <div className="tcg__frame">
            <div className="tcg__top">
              <h3 className="tcg__name">{project.name}</h3>
              <span className="tcg__no">
                <small>No.</small>
                {project.index}
              </span>
            </div>
            <div className="tcg__art">
              <img src={POSTER[project.slug] ?? POSTER.tenderlens} alt="" draggable={false} loading="lazy" />
              <span className="tcg__art-foil" aria-hidden />
            </div>
            <div className="tcg__type">
              {project.kind} · {project.year}
            </div>
            <div className="tcg__moves">
              {project.stats.map((s, i) => (
                <span key={s.label} className="tcg__move">
                  <span className="tcg__energy" aria-hidden>
                    {Array.from({ length: i + 1 }, (_, k) => (
                      <i key={k} />
                    ))}
                  </span>
                  <span className="tcg__move-name">{s.label}</span>
                  <span className="tcg__move-value">{s.value}</span>
                </span>
              ))}
            </div>
            <div className="tcg__flavor">{project.tagline}</div>
            <div className="tcg__foot">
              <span>Illus. {identity.name}</span>
              <span>
                {holo ? '★' : '●'} AT·26 {pad3(number)}/{pad3(total)}
              </span>
            </div>
          </div>
          <span className="tcg__shine" aria-hidden />
          <span className="tcg__glare" aria-hidden />
        </div>
      </div>
    </div>
  );
}

/** The printed back of every card in the set. */
export function CardBack() {
  return (
    <span className="card-back" aria-hidden>
      <span className="card-back__inner">
        <span className="card-back__logo">
          <Mark size={40} />
        </span>
        <span className="card-back__text">Adelia TCG · Daily</span>
      </span>
    </span>
  );
}
