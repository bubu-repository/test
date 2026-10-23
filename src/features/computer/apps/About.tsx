/* About this computer — her model card (legacy /lab): architecture, training
   data, intended use, out of scope, limitations and evals. */
import { COMPANY } from '@/lib/content';
import { modelCard } from '@/content/profile';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { Icon } from '@/ui/Icon';
import { os } from '../wm';

const SECTIONS: { id: string; title: string; items: readonly string[]; tone?: 'x' | 'warn' }[] = [
  { id: 'training', title: 'Training data', items: modelCard.trainingData },
  { id: 'use', title: 'Intended use', items: modelCard.intendedUse },
  { id: 'scope', title: 'Out of scope', items: modelCard.outOfScope, tone: 'x' },
  { id: 'limits', title: 'Limitations', items: modelCard.limitations, tone: 'warn' },
];

export default function About() {
  return (
    <div className="os-doc scroll">
      <article className="os-doc__page os-mc">
        <p className="os-doc__meta">
          <span>model-card.md</span>
          <span>
            {modelCard.version} · {COMPANY.city}
          </span>
        </p>
        <h1 className="os-doc__h1">
          {COMPANY.name}
          <small>
            {COMPANY.role} · {COMPANY.holding}
          </small>
        </h1>
        <p className="os-doc__tagline">“{COMPANY.tagline}”</p>

        <dl className="os-mc__facts">
          <div>
            <dt>Version</dt>
            <dd>
              <span className="readout readout--blue">{modelCard.version}</span>
            </dd>
          </div>
          <div>
            <dt>Runs in</dt>
            <dd>
              {COMPANY.hq} · {COMPANY.timeZoneLabel}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className="os-mc__status">
              <i className="led led--blue" aria-hidden /> Open to a full-time role
            </dd>
          </div>
        </dl>

        <h2 className="os-doc__h2">
          <b>01</b> Architecture
        </h2>
        <p className="os-doc__p os-mc__arch">{modelCard.architecture}</p>

        {SECTIONS.map((s, i) => (
          <section key={s.id} aria-labelledby={`mc-${s.id}`}>
            <h2 className="os-doc__h2" id={`mc-${s.id}`}>
              <b>0{i + 2}</b> {s.title}
            </h2>
            <ul className={`os-mc__list ${s.tone ? `is-${s.tone}` : ''}`}>
              {s.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}

        <h2 className="os-doc__h2" id="mc-evals">
          <b>0{SECTIONS.length + 2}</b> Evals
        </h2>
        <dl className="os-mc__evals" aria-labelledby="mc-evals">
          {modelCard.evals.map((e) => (
            <div key={e.name}>
              <dt>{e.name}</dt>
              <dd>
                <span className="readout">{e.score}</span>
              </dd>
            </div>
          ))}
        </dl>

        <footer className="os-doc__foot">
          <span>{COMPANY.availability}</span>
          <span className="os-doc__actions">
            <a className="btn btn--sm" href={COMPANY.cv} download="Adelia-Tiara-CV.pdf" onClick={() => track('cv_download', { from: 'os-model-card' })}>
              <Icon name="download" size={14} /> CV (PDF)
            </a>
            <button
              className="btn btn--sm btn--primary"
              onClick={() => {
                sfx('click');
                os().open('mail');
              }}
            >
              Write to her
            </button>
          </span>
        </footer>
      </article>
    </div>
  );
}
