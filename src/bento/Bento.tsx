import { useState } from 'react';
import { person, projects, skills, skillKinds, links, isTodo, type Project, type SkillKind } from '@/content/site';
import { useApp, openOverlay, ALL_OBJECTS } from '@/state';
import { enterRoom } from '@/journey';
import { PhoneTile } from '@/phone/PhoneTile';
import './bento.css';

/**
 * Screen 1. The 5-second read (docs/concept.md): who she is, 3 projects, skills, Contact.
 * Built from Yan's anatomy (docs/research/yan.md): the first tile is the CV in one sentence, every
 * project tile is visual, name, result. Tiles are frosted acrylic slabs over her blurred room.
 */
export function Bento() {
  const screen = useApp((s) => s.screen);
  const inert = screen === 'room';
  return (
    <main className="bento" id="top" aria-hidden={inert || undefined} inert={inert || undefined}>
      <h1 className="sr-only">
        {person.name}, {person.role}
      </h1>
      <div className="bento-grid">
        <IdTile />
        <section className="bento-work" id="work" aria-label="Three best projects">
          {projects.map((p, i) => (
            <ProjectTile key={p.id} p={p} lead={i === 0} />
          ))}
        </section>
        <SkillsTile />
        <div className="tile tile-phone" data-vt="phone-tile">
          <PhoneTile />
        </div>
        <RoomTile />
      </div>
      <footer className="bento-foot">
        <span className="label">© 2026 {person.name}</span>
        <span className="label">
          {person.city}, {person.country} · {person.timeZoneLabel}
        </span>
      </footer>
    </main>
  );
}

function Todo({ children }: { children: string }) {
  return (
    <span className="chip" data-todo>
      {children}
    </span>
  );
}

function IdTile() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(person.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      location.href = `mailto:${person.email}`;
    }
  };
  return (
    <section className="tile tile-id" aria-label="About Adelia">
      <div className="id-spec" aria-hidden="true">
        <span className="label">Fig. 00</span>
        <span className="label">adelia.cc</span>
      </div>
      <p className="id-role">{person.role}</p>
      <p className="id-name" aria-hidden="true">
        <span>Adelia</span> <span>Tiara</span>
      </p>
      <p className="id-intro">{person.intro}</p>
      <ul className="id-facts">
        <li className="chip">
          <span className="chip-dot" aria-hidden="true" />
          {person.status}
        </li>
        <li className="chip">
          {person.city}, {person.country} · {person.timeZoneLabel}
        </li>
        <li className="chip">{person.degree}</li>
      </ul>
      <div className="id-actions">
        <button className="btn btn-sm" onClick={copy} aria-live="polite">
          {copied ? 'Copied' : person.email}
        </button>
        {links
          .filter((l) => l.label !== 'Email')
          .map((l) =>
            isTodo(l.href) ? (
              <span key={l.label} className="btn btn-sm" data-todo title={l.href} aria-label={`${l.label}: not added yet`}>
                {l.label} · TODO_SEA
              </span>
            ) : (
              <a key={l.label} className="btn btn-sm" href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ),
          )}
      </div>
    </section>
  );
}

function ProjectTile({ p, lead }: { p: Project; lead: boolean }) {
  const open = () => openOverlay({ kind: 'run', id: p.id });
  const todoName = isTodo(p.name);
  return (
    <article className="tile tile-project" data-lead={lead || undefined} data-vt={`frame-${p.id}`}>
      <button className="project-hit" onClick={open} aria-label={`Open ${p.run}: ${todoName ? 'project not added yet' : p.name}`} />
      <div className="project-visual" aria-hidden="true">
        {isTodo(p.visual) ? (
          <div className="visual-slot">
            <span className="visual-run">{p.run.replace('Run ', '')}</span>
            <span className="label">Visual · TODO_SEA</span>
          </div>
        ) : (
          <img src={p.visual} alt="" loading="lazy" decoding="async" />
        )}
      </div>
      <div className="project-text">
        <p className="label project-run">{p.run}</p>
        <h2 className="project-name" data-todo={todoName || undefined}>
          {p.name}
        </h2>
        <p className="project-result" data-todo={isTodo(p.result) || undefined}>
          {p.result}
        </p>
        <ul className="project-chips">
          {[p.role, p.year, p.status].map((v, i) =>
            isTodo(v) ? (
              <li key={i}>
                <Todo>{['Role', 'Year', 'Status'][i] + ' · TODO_SEA'}</Todo>
              </li>
            ) : (
              <li key={i} className="chip">
                {v}
              </li>
            ),
          )}
        </ul>
      </div>
    </article>
  );
}

function SkillsTile() {
  const kinds = Object.keys(skillKinds) as SkillKind[];
  return (
    <section className="tile tile-skills" aria-labelledby="skills-h" data-vt="desk">
      <div className="tile-head">
        <h2 id="skills-h" className="tile-title">
          Skills
        </h2>
        <span className="label">Where to check each one: the desk in the room</span>
      </div>
      <div className="skills-rows">
        {kinds.map((k) => (
          <div key={k} className="skills-row">
            <p className="skills-kind">
              <span className="mark" data-shape={skillKinds[k].shape} aria-hidden="true" />
              {skillKinds[k].label}
            </p>
            <ul className="skills-chips">
              {skills
                .filter((s) => s.kind === k)
                .map((s) => (
                  <li key={s.name} className="chip">
                    {s.name}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoomTile() {
  const found = useApp((s) => s.found.length);
  return (
    <section className="tile tile-room" aria-labelledby="room-h">
      <div className="room-peek" aria-hidden="true" />
      <div className="room-copy">
        <p className="label">Screen 2</p>
        <h2 id="room-h" className="tile-title">
          My room
        </h2>
        <p className="room-line">A phone that works, my sky in the window, and {ALL_OBJECTS.length} things to open.</p>
        <button className="btn room-enter" onClick={(e) => enterRoom({ from: e.currentTarget.closest('.tile') as HTMLElement })}>
          Open the room
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5" />
          </svg>
        </button>
        {found > 0 && (
          <p className="label room-found">
            {found} of {ALL_OBJECTS.length} found
          </p>
        )}
      </div>
    </section>
  );
}
