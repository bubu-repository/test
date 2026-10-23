import { useId, useState } from 'react';
import type { Project } from '@/content/projects';

function Side({ side, data }: { side: 'before' | 'after'; data: Project['beforeAfter'] }) {
  const d = data[side];
  return (
    <div className={`ba__side ba__side--${side}`}>
      <span className="t-label">{side === 'before' ? 'Before' : 'After'}</span>
      <p className="ba__title">{d.title.replace(/^(Before|After): /, '')}</p>
      <ul className="ba__points">
        {d.points.map((p) => (
          <li key={p}>
            <span aria-hidden className="ba__mark">
              {side === 'before' ? '✗' : '✓'}
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Before / after, side by side under a draggable divider. The control is a native range input
 * stretched over the panels, so it works with mouse, touch and keyboard for free.
 */
export function BeforeAfter({ data }: { data: Project['beforeAfter'] }) {
  const [split, setSplit] = useState(50);
  const id = useId();
  return (
    <figure className="ba">
      <div className="ba__stage">
        <div className="ba__layer">
          <Side side="after" data={data} />
        </div>
        <div className="ba__layer" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} aria-hidden>
          <Side side="before" data={data} />
        </div>
        <div aria-hidden className="ba__divider" style={{ left: `${split}%` }}>
          <span className="ba__knob">⇆</span>
        </div>
        <label htmlFor={id} className="sr-only">
          Compare before and after. Left shows before, right shows after.
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          className="ba__range"
          aria-valuetext={`${split}% before`}
        />
      </div>
      <figcaption className="sr-only">
        Before: {data.before.title}. {data.before.points.join('. ')}. After: {data.after.title}. {data.after.points.join('. ')}.
      </figcaption>
    </figure>
  );
}
