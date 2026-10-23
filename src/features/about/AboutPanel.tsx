/* ==========================================================================
   RM-14 · Her ID card — About (ported from the legacy adelia.cc /about,
   features/about/* and hero/IdBadge). A sheet that slides out of the
   lanyard on its chrome hook: the swinging ID card, who she is in two lines,
   the keys a hiring team needs (CV, email, book a chat, LinkedIn/GitHub),
   then the practical details as a spec sheet, the path so far, the toolbox
   and the short story. Facts come only from src/content/profile.ts.
   ========================================================================== */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Sheet } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { sfx } from '@/audio/engine';
import { game } from '@/state/game';
import { ACHIEVEMENT_MAP, type AchievementId } from '@/state/achievements';
import { track } from '@/lib/api';
import { focus } from '@/stage/director';
import { STATIONS } from '@/stage/stations';
import { once } from '@/features/computer/util';
import { bio, experience, identity, practical, skills, socials, type SkillGroup } from '@/content/profile';
import { IdCard } from './IdCard';
import './about.css';

const CV_HREF = '/cv.pdf';
const CV_NAME = 'Adelia-Tiara-CV.pdf';

/** Award once per profile (+ a sticker, if the sticker book has one with this id). */
function reward(name: string, points: number, label: string) {
  if (once(`about-${name}`)) game().addPoints(points, label);
}
function unlockIfExists(id: string) {
  if ((ACHIEVEMENT_MAP as Record<string, unknown>)[id]) game().unlock(id as AchievementId);
}

/** Bekasi time, refreshed every 20 s (WIB has no daylight saving). */
function useBekasiTime() {
  const fmt = () => new Intl.DateTimeFormat('en-GB', { timeZone: identity.timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = window.setInterval(() => setT(fmt()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

const TONE: Record<SkillGroup['tone'], string> = { accent: 'led', cobalt: 'led led--blue', lime: 'led led--green', sun: 'led led--blue', violet: 'led led--blue' };

function Section({ id, label, title, children }: { id: string; label: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="ab-sec" aria-labelledby={`${id}-title`}>
      <p className="rule">{label}</p>
      <h3 id={`${id}-title`} tabIndex={-1}>
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function AboutPanel() {
  const st = STATIONS.about;
  const time = useBekasiTime();
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const bodyRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLElement | null>(null);
  const links = socials.filter((s): s is { label: string; href: string } => !!s.href);

  useEffect(() => {
    track('about', { action: 'open' });
  }, []);

  // the practical details seen (half of the block on screen) — the recruiter's part of the card
  useEffect(() => {
    const el = bodyRef.current?.querySelector<HTMLElement>('#ab-details');
    detailsRef.current = el ?? null;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        track('about', { action: 'details_seen' });
        reward('details', 25, 'Read the practical details');
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (copied === 'idle') return;
    const t = window.setTimeout(() => setCopied('idle'), 2400);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(identity.email);
      setCopied('copied');
      sfx('success');
      track('about', { action: 'email_copy' });
      reward('email', 20, 'Copied her email');
    } catch {
      setCopied('failed');
      sfx('error');
    }
  };

  const jump = (id: string) => {
    sfx('click');
    const el = bodyRef.current?.querySelector<HTMLElement>(`#${id}`);
    el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    el?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
  };

  return (
    <Sheet code={st.code} kicker="Her ID card" title={identity.name} className="ab-sheet">
      <div className="ab" ref={bodyRef}>
        {/* ---- the card on its lanyard, and who she is */}
        <div className="ab-top">
          <div className="ab-card">
            <IdCard
              onFlip={(back) => {
                track('about', { action: 'flip', side: back ? 'back' : 'front' });
                if (back) reward('flip', 20, 'Flipped her ID card');
              }}
            />
            <p className="ab-card__hint t-label" aria-hidden="true">
              Tap to flip · drag to swing
            </p>
          </div>
          <div className="ab-who">
            <span className="chip chip--primary ab-who__status">
              <i className="led led--green" aria-hidden="true" /> Open to work
            </span>
            <p className="ab-who__role">{identity.role}</p>
            <p className="ab-who__line">
              {identity.degree}
              <br />
              {identity.cohort}
            </p>
            <p className="ab-who__where">
              <span className="t-label">
                <Icon name="map" size={12} /> {identity.city}
              </span>
              <span className="readout readout--blue" aria-label={`${time} in ${identity.city} (WIB)`}>
                {time} <small>WIB</small>
              </span>
            </p>
          </div>
        </div>

        {/* CONTOH — bio.short is sample copy until the owner replaces it */}
        <p className="ab-lead">{bio.short}</p>

        {/* ---- the keys a hiring team needs */}
        <div className="ab-keys">
          <a
            className="btn btn--primary ab-keys__cv"
            href={CV_HREF}
            download={CV_NAME}
            onClick={() => {
              track('about', { action: 'cv' });
              track('cv_download', { from: 'about' });
              reward('cv', 40, 'Downloaded her CV');
              unlockIfExists('connected'); // "Straight to Adelia": the big button or her CV
            }}
          >
            <Icon name="download" size={17} /> Download CV <span className="ab-keys__meta">PDF</span>
          </a>
          <button
            type="button"
            className="btn ab-keys__book"
            onClick={() => {
              track('about', { action: 'book' });
              track('cta', { from: 'about', to: 'rsvp' });
              focus('printer');
            }}
          >
            <Icon name="calendar" size={16} /> Book a chat
          </button>
        </div>
        <div className="ab-mail well">
          <a
            className="ab-mail__addr t-mono"
            href={`mailto:${identity.email}`}
            onClick={() => track('about', { action: 'email' })}
            aria-label={`Email ${identity.firstName}: ${identity.email}`}
          >
            <Icon name="mail" size={15} /> {identity.email}
          </a>
          <button type="button" className={`btn btn--sm ${copied === 'copied' ? 'btn--pink' : 'btn--chrome'}`} onClick={copyEmail}>
            {copied === 'copied' ? <Icon name="check" size={14} /> : null}
            {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Use the link' : 'Copy'}
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {copied === 'copied' ? `Email address copied: ${identity.email}` : copied === 'failed' ? 'Couldn’t copy. Use the email link instead.' : ''}
          </span>
        </div>
        {links.length > 0 && (
          <div className="ab-socials">
            {/* CONTOH — profile links are placeholders until the owner fills them in */}
            {links.map((s) => (
              <a
                key={s.label}
                className="btn btn--sm btn--ghost"
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('about', { action: 'social', label: s.label })}
              >
                {s.label} <Icon name="arrow-up-right" size={13} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        )}

        <nav className="ab-jump" aria-label="On this card">
          {[
            ['ab-details', 'Details'],
            ['ab-path', 'Path'],
            ['ab-toolbox', 'Toolbox'],
            ['ab-story', 'Story'],
          ].map(([id, label]) => (
            <button key={id} type="button" className="chip ab-jump__chip" onClick={() => jump(id)}>
              {label}
            </button>
          ))}
        </nav>

        {/* ---- for hiring teams (CONTOH — sample values until the owner replaces them) */}
        <Section id="ab-details" label="For hiring teams" title="The practical details">
          <dl className="ab-spec">
            {practical.map((f, i) => (
              <div key={f.label} className="ab-spec__row">
                <dt>
                  <span className="ab-spec__no" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {f.label}
                </dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <p className="ab-avail">
            <i className="led led--green" aria-hidden="true" /> {bio.availability}
          </p>
        </Section>

        {/* ---- the path so far (CONTOH) */}
        <Section id="ab-path" label="Experience" title="Path so far">
          <ol className="ab-path">
            {experience.map((e) => (
              <li key={e.title} className="ab-path__item">
                <span className="ab-path__when t-mono">{e.period}</span>
                <p className="ab-path__title">{e.title}</p>
                <p className="ab-path__org">{e.org}</p>
                <p className="ab-path__sum">{e.summary}</p>
                {e.highlights && (
                  <ul className="ab-path__hi">
                    {e.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Section>

        {/* ---- what she works with (CONTOH) */}
        <Section id="ab-toolbox" label="Toolbox" title="What she works with">
          <div className="ab-skills">
            {skills.map((g) => (
              <div key={g.name} className="ab-skills__group surface--flat">
                <p className="ab-skills__name">
                  <i className={TONE[g.tone]} aria-hidden="true" /> {g.name}
                </p>
                <ul>
                  {g.items.map((s) => (
                    <li key={s} className="chip">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- the short story (CONTOH) */}
        <Section id="ab-story" label="Story" title="The short story">
          <div className="ab-story">
            {bio.long.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p>{bio.team}</p>
          </div>
          <p className="ab-now lcd lcd--blue">
            <span className="t-dot">NOW</span>
            <span>{bio.now}</span>
          </p>
        </Section>
      </div>
    </Sheet>
  );
}
