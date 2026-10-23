/* ==========================================================================
   RM-10 · The LED strip — what's next, up close.
   A countdown to her availability (content.launch, editable in the admin;
   the default is "Day one", her earliest start), the plain facts behind
   it, "tell me when she's available" (waitlist), a shortcut to booking a
   chat before then, and a share row.
   ========================================================================== */
import { useEffect } from 'react';
import { Sheet } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { COMPANY } from '@/lib/content';
import { practical } from '@/content/profile';
import { focus } from '@/stage/director';
import { STATIONS } from '@/stage/stations';
import { Countdown, ShareRow, WaitlistForm, formatLaunchDate, useCountdown, useLaunch } from './shared';
import './launch.css';

const fact = (label: string) => practical.find((p) => p.label === label)?.value ?? '';

export default function LaunchPanel() {
  const { launch } = useLaunch();
  const r = useCountdown(launch.date);
  const st = STATIONS.launch;
  const done = r.valid && r.done;

  useEffect(() => {
    track('launch_panel');
  }, []);

  const date = new Date(launch.date);
  const valid = !Number.isNaN(date.getTime());
  const day = valid ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date) : 'To be announced';
  const time = valid ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(date) + ' WIB' : '—';
  const start = fact('Start');

  return (
    <Sheet code={st.code} kicker={st.name} title="What’s next">
      <div className="lpn">
        <div className="lcd lpn-lcd">
          <div className="lpn-lcd__top t-label">
            <span>{done ? 'It’s here' : 'T-minus'}</span>
            <span>
              <span className="led led--blink" style={{ marginRight: 6 }} aria-hidden />
              Bekasi · WIB
            </span>
          </div>
          <Countdown r={r} />
        </div>

        <div className="lpn-head">
          <span className="t-label">
            <b className="t-primary">Counting down to</b> · {formatLaunchDate(launch.date, { short: true })}
          </span>
          <h3 className="t-title lpn-title">{launch.title}</h3>
          <p className="lpn-sub">{launch.subtitle}</p>
          <p className="lpn-body">{launch.body}</p>
        </div>

        <dl className="lpn-specs well">
          <div>
            <dt className="t-label">Date</dt>
            <dd>{day}</dd>
          </div>
          <div>
            <dt className="t-label">Time</dt>
            <dd>{time}</dd>
          </div>
          {start && (
            <div>
              <dt className="t-label">Start</dt>
              <dd>Within 2 weeks of an offer</dd>
            </div>
          )}
          <div>
            <dt className="t-label">Where</dt>
            <dd>Jakarta area or remote</dd>
          </div>
        </dl>
        <p className="lpn-note">
          <span className="led led--green" aria-hidden /> {COMPANY.availability}
        </p>

        <div className="surface--flat lpn-box">
          <span className="t-label lpn-box__k">
            <span className="led led--blue" aria-hidden /> Tell me when she’s available
          </span>
          <WaitlistForm source="room-countdown" compact launchTitle={launch.title} />
        </div>

        <div className="lpn-hire">
          <p>
            <b>Hiring now?</b> No need to wait for the countdown.
          </p>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              track('launch_cta', { cta: 'book' });
              focus('printer', { tab: 'hiring' });
            }}
          >
            <Icon name="ticket" size={14} /> Book an intro call
          </button>
        </div>

        <div className="lpn-box" style={{ padding: 0 }}>
          <div className="rule">Pass it on</div>
          <ShareRow title={launch.title} />
        </div>

        <div className="lpn-foot">
          <a className="btn btn--sm btn--ghost" href="/launch" target="_blank" rel="noopener" onClick={() => sfx('click')}>
            Open the coming-soon page <Icon name="arrow-up-right" size={14} />
          </a>
        </div>
      </div>
    </Sheet>
  );
}
