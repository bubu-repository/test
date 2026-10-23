/* ==========================================================================
   Admin · Overview — how the room works for Adelia's goals.
   KPI tiles (hiring first, then the community layer), visits per day, the
   funnel (visits → stations explored → case studies read → reached out),
   station heatmap, case-study reads, recent activity, stickers, fit-check
   results and Moci.
   ========================================================================== */
import { useMemo, useState, type ReactNode } from 'react';
import type { AdminData } from '@/lib/api';
import { CHAPTERS } from '@/lib/content';
import { HBars, Funnel, Heatmap, SessionsChart, Spark } from './charts';
import { RANGES, EXPLORED_MIN, computeOverview, compact, fmtAgo, fmtTime, quizLabel, ts, type Count, type RangeId } from './metrics';
import { cell } from './DataTable';

const COLL_LABEL: Record<string, string> = {
  rsvps: 'Booking',
  leads: 'Enquiry',
  guestbook: 'Guestbook',
  questions: 'Moci',
  quiz: 'Fit check',
  waitlist: 'Launch list',
  redemptions: 'Redemption',
};
/** Hiring outcomes wear the blue chip; the community layer the pink one. */
const COLL_CHIP: Record<string, string> = { rsvps: 'chip--primary', leads: 'chip--primary', guestbook: 'chip--accent', questions: 'chip--accent' };
const COLL_SECTION: Record<string, string> = { redemptions: 'leaderboard' };

const CHAPTER_NAME: Record<string, string> = { toolkit: 'Toolkit', proof: 'Proof', build: 'Build', play: 'Play', hello: 'Hello' };

function Delta({ c, range }: { c: Count; range: string }) {
  if (c.prev == null) return <span className="adm-kpi__sub">all time</span>;
  const d = c.n - c.prev;
  const cls = d > 0 ? 'is-up' : d < 0 ? 'is-down' : '';
  return (
    <span className={`adm-kpi__sub adm-delta ${cls}`}>
      <span aria-hidden>{d > 0 ? '▲' : d < 0 ? '▼' : '■'}</span> {d > 0 ? '+' : ''}
      {d.toLocaleString('en-US')} <span>vs prev {range}</span>
    </span>
  );
}

interface Kpi {
  id: string;
  label: string;
  value: string;
  sub: ReactNode;
  go?: string;
  hero?: boolean;
  spark?: boolean;
  layer?: 'hire' | 'community';
}

function recentLine(collection: string, rec: Record<string, unknown>) {
  switch (collection) {
    case 'rsvps':
      return cell(rec.eventName) || cell(rec.kind) || cell(rec.eventId) || 'Booked a chat';
    case 'leads':
      return cell(rec.subject) || cell(rec.interestLabel) || cell(rec.interest) || cell(rec.company) || 'New enquiry';
    case 'guestbook':
      return cell(rec.note) || 'Released a creature';
    case 'questions':
      return cell(rec.question);
    case 'quiz':
      return quizLabel(rec) || 'Finished the fit check';
    case 'waitlist':
      return cell(rec.company) || cell(rec.source) || 'Joined the launch list';
    default:
      return cell(rec.perk) || cell(rec.code);
  }
}

export function Overview({ data, onGo }: { data: AdminData; onGo: (section: string) => void }) {
  const [range, setRange] = useState<RangeId>('30d');
  const [allStickers, setAllStickers] = useState(false);
  const o = useMemo(() => computeOverview(data, range), [data, range]);
  const rangeLabel = RANGES.find((r) => r.id === range)!.label;
  const groups = [{ id: 'prologue', label: 'Door' }, ...CHAPTERS.map((c) => ({ id: c.id, label: `${c.roman} · ${CHAPTER_NAME[c.id] ?? c.title}` }))];
  const spark = o.series.slice(-14).map((s) => s.v);
  const pct = (x: number) => `${(x * 100).toFixed(x && x < 0.1 ? 1 : 0)}%`;
  const visits: Count = { n: o.sessions, prev: o.prevSessions };

  const kpis: Kpi[] = [
    { id: 'visits', label: 'Visits', value: compact(o.sessions), sub: <Delta c={visits} range={rangeLabel} />, spark: true, hero: true, layer: 'hire' },
    {
      id: 'cases',
      label: 'Read a case study',
      value: compact(o.caseReaders.n),
      sub: (
        <span className="adm-kpi__sub">
          {o.caseReads.toLocaleString('en-US')} reads · {o.sessions ? pct(o.caseReaders.n / o.sessions) : '0%'} of visits
        </span>
      ),
      layer: 'hire',
    },
    { id: 'rsvps', label: 'Chats booked', value: compact(o.counts.rsvps.n), sub: <Delta c={o.counts.rsvps} range={rangeLabel} />, go: 'rsvps', layer: 'hire' },
    { id: 'emails', label: 'Emails', value: compact(o.emails.n), sub: <Delta c={o.emails} range={rangeLabel} />, layer: 'hire' },
    { id: 'cv', label: 'CV downloads', value: compact(o.cvs.n), sub: <Delta c={o.cvs} range={rangeLabel} />, layer: 'hire' },
    {
      id: 'reach',
      label: 'Reach-out rate',
      value: pct(o.reachRate),
      sub: (
        <span className="adm-kpi__sub">
          {o.reached.toLocaleString('en-US')} of {o.sessions.toLocaleString('en-US')} visits
        </span>
      ),
      layer: 'hire',
    },
    { id: 'guestbook', label: 'Guestbook notes', value: compact(o.counts.guestbook.n), sub: <Delta c={o.counts.guestbook} range={rangeLabel} />, go: 'guestbook', layer: 'community' },
    {
      id: 'moci',
      label: 'Moci questions',
      value: compact(o.moci.asked),
      sub: <span className="adm-kpi__sub">{o.moci.abstained ? `${o.moci.abstained.toLocaleString('en-US')} answered “not sure”` : <Delta c={o.counts.questions} range={rangeLabel} />}</span>,
      go: 'questions',
      layer: 'community',
    },
  ];

  return (
    <div className="adm-ov">
      <div className="adm-filters">
        <div className="adm-seg" role="radiogroup" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.id} role="radio" aria-checked={range === r.id} className={range === r.id ? 'is-on' : ''} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <span className="t-label adm-filters__note">
          Bekasi time (WIB) · {o.eventsInRange.toLocaleString('en-US')} events · {data.collections.analytics.length.toLocaleString('en-US')} stored
        </span>
      </div>

      <div className="adm-kpis">
        {kpis.map((k) => {
          const inner = (
            <>
              <span className="t-label">
                <i className={`adm-kpi__layer adm-kpi__layer--${k.layer}`} aria-hidden />
                {k.label}
              </span>
              <span className="adm-kpi__row">
                <b className="adm-kpi__v">{k.value}</b>
                {k.spark && <Spark values={spark} />}
              </span>
              {k.sub}
            </>
          );
          return k.go ? (
            <button key={k.id} className="adm-kpi adm-kpi--link" onClick={() => onGo(k.go!)} aria-label={`${k.label}: ${k.value}. Open the list`}>
              {inner}
            </button>
          ) : (
            <div key={k.id} className={`adm-kpi ${k.hero ? 'adm-kpi--hero lcd' : ''}`}>
              {inner}
            </div>
          );
        })}
      </div>
      <p className="adm-kpis__key t-label">
        <i className="adm-kpi__layer adm-kpi__layer--hire" aria-hidden /> Hiring · <i className="adm-kpi__layer adm-kpi__layer--community" aria-hidden /> Community
      </p>

      <div className="adm-grid">
        <section className="adm-card adm-col-8">
          <header className="adm-card__head">
            <div>
              <span className="t-label">Unique visits per day · {rangeLabel}</span>
              <h3>Visits</h3>
            </div>
          </header>
          <SessionsChart data={o.series} label="Visits" />
        </section>

        <section className="adm-card adm-col-4">
          <header className="adm-card__head">
            <div>
              <span className="t-label">Visits that did each step and every step before it</span>
              <h3>Hiring funnel</h3>
            </div>
          </header>
          <Funnel steps={o.funnel} />
          <p className="adm-card__foot t-label">
            Explored = found {EXPLORED_MIN}+ objects · avg {o.avgStations.toFixed(1)} per visit
          </p>
        </section>

        <section className="adm-card adm-col-8">
          <header className="adm-card__head">
            <div>
              <span className="t-label">Visits that found each object · left → right through the room</span>
              <h3>Station heatmap</h3>
            </div>
          </header>
          <Heatmap cells={o.stations} groups={groups} base={Math.max(1, o.sessions)} />
        </section>

        <section className="adm-card adm-col-4">
          <header className="adm-card__head">
            <div>
              <span className="t-label">Wall of Work · opens in {rangeLabel.toLowerCase()}</span>
              <h3>Case studies read</h3>
            </div>
          </header>
          <HBars stacked items={o.cases.map((c) => ({ id: c.id, key: c.name, label: c.name, value: c.n }))} total={Math.max(1, o.caseReads)} empty="No case study opened in this range." />
        </section>

        <section className="adm-card adm-col-6">
          <header className="adm-card__head">
            <div>
              <span className="t-label">Latest bookings, enquiries, notes and questions · all time</span>
              <h3>Recent activity</h3>
            </div>
          </header>
          {o.recent.length ? (
            <ul className="adm-feed">
              {o.recent.map(({ collection, rec }) => (
                <li key={collection + rec.id}>
                  <button onClick={() => onGo(COLL_SECTION[collection] ?? collection)}>
                    <span className={`chip ${COLL_CHIP[collection] ?? ''}`}>{COLL_LABEL[collection]}</span>
                    <span className="adm-feed__main">
                      <b>{collection === 'questions' ? 'A visitor asked' : cell(rec.name) || cell(rec.email) || 'Guest'}</b>
                      <span>{recentLine(collection, rec)}</span>
                    </span>
                    <time className="t-label" title={fmtTime(ts(rec))}>
                      {fmtAgo(ts(rec))}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">Nothing yet. Bookings, enquiries, guestbook notes and Moci questions land here.</p>
          )}
        </section>

        <section className="adm-card adm-col-6">
          <header className="adm-card__head">
            <div>
              <span className="t-label">Visits holding each sticker · {o.achievements.length} stickers</span>
              <h3>Sticker book</h3>
            </div>
          </header>
          <HBars
            items={o.achievements.map((a) => ({
              id: a.id,
              key: a.name,
              label: (
                <>
                  <i className="adm-glyph" aria-hidden>
                    {a.glyph}
                  </i>
                  {a.name}
                </>
              ),
              value: a.n,
            }))}
            total={Math.max(1, o.sessions)}
            limit={allStickers ? undefined : 8}
            empty="No stickers collected in this range."
          />
          {o.achievements.length > 8 && (
            <button className="btn btn--sm btn--ghost adm-more" onClick={() => setAllStickers((v) => !v)}>
              {allStickers ? 'Show top 8' : `Show all ${o.achievements.length}`}
            </button>
          )}
        </section>

        <section className="adm-card adm-col-6">
          <header className="adm-card__head">
            <div>
              <span className="t-label">The pink mug · 60-second role-fit check</span>
              <h3>Fit-check results</h3>
            </div>
            <button className="btn btn--sm btn--ghost" onClick={() => onGo('quiz')}>
              All
            </button>
          </header>
          <HBars items={o.quiz.map((q) => ({ id: q.id, key: q.name, label: q.name, value: q.n }))} total={o.quiz.reduce((a, b) => a + b.n, 0)} empty="No fit checks finished in this range." />
        </section>

        <section className="adm-card adm-col-6">
          <header className="adm-card__head">
            <div>
              <span className="t-label">Her AI agent · questions in {rangeLabel.toLowerCase()}</span>
              <h3>Moci</h3>
            </div>
            <button className="btn btn--sm btn--ghost" onClick={() => onGo('questions')}>
              All
            </button>
          </header>
          <HBars
            items={[
              { id: 'online', key: 'Answered by the online brain', label: 'Online brain', value: o.moci.online },
              { id: 'offline', key: 'Answered by the offline brain', label: 'Offline brain', value: o.moci.offline },
              { id: 'abstained', key: 'Said it was not sure', label: 'Said “not sure”', value: o.moci.abstained },
            ]}
            total={Math.max(1, o.moci.asked)}
            empty="Nobody asked Moci anything in this range."
          />
        </section>
      </div>
    </div>
  );
}
