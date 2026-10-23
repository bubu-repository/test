/* ==========================================================================
   RM-23 · The big pink button — Press to reach Adelia.
   Lift the clear safety cover, press the button, 3-2-1, and her inbox
   opens (content.redirect; the admin can point it elsewhere). Below: her
   direct lines as a bank of switches: Email (copy), CV (PDF), LinkedIn,
   GitHub. Only links that exist in her content are shown.
   Tracking: big_button / redirect, plus `email` and `cv_download`
   ({ from: 'button' }) that the admin dashboard counts.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { Sheet } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { sfx } from '@/audio/engine';
import { getContent, track } from '@/lib/api';
import { COMPANY, ECOSYSTEM, REDIRECT_DEFAULT } from '@/lib/content';
import { game } from '@/state/game';
import { useUI } from '@/state/ui';
import { STATIONS } from '@/stage/stations';
import './redirect.css';

type Phase = 'locked' | 'armed' | 'counting' | 'connected' | 'cancelled';

const isCv = (url: string) => /(^|\/)cv\.pdf(\?|#|$)/i.test(url);

function destination(url: string): { kind: 'mail' | 'cv' | 'web'; label: string } {
  if (/^mailto:/i.test(url)) return { kind: 'mail', label: decodeURIComponent(url.slice(7).split('?')[0]) || 'email' };
  if (isCv(url)) return { kind: 'cv', label: 'her CV (PDF)' };
  try {
    return { kind: 'web', label: new URL(url, location.origin).host.replace(/^www\./, '') };
  } catch {
    return { kind: 'web', label: url };
  }
}

/** Open a URL: mailto in place, everything else in a new tab. Returns false when a popup blocker ate it. */
function go(url: string): boolean {
  if (/^mailto:/i.test(url)) {
    window.location.href = url;
    return true;
  }
  // no "noopener" feature here: with it, window.open always returns null and a popup blocker
  // can't be detected. Sever the opener by hand instead.
  const w = window.open(url, '_blank');
  if (!w) return false;
  try {
    w.opener = null;
  } catch {}
  return true;
}

/** Track what a press reached, in the event names the admin dashboard counts. */
function trackReach(url: string, via: string) {
  const d = destination(url);
  if (d.kind === 'mail') track('email', { from: 'button', via });
  if (d.kind === 'cv') track('cv_download', { from: 'button', via });
}

export default function RedirectPanel() {
  const st = STATIONS.button;
  const [redirect, setRedirect] = useState(REDIRECT_DEFAULT);
  const [phase, setPhase] = useState<Phase>('locked');
  const [count, setCount] = useState(3);
  const [pressed, setPressed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dest = destination(redirect.url);
  const coverOpen = phase !== 'locked';

  useEffect(() => {
    getContent()
      .then((c) => c.redirect?.url && setRedirect(c.redirect))
      .catch(() => {});
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function toggleCover() {
    if (phase === 'counting') return;
    if (phase === 'locked') {
      sfx('release', { pitch: -3 });
      setTimeout(() => sfx('switch'), 160);
      setPhase('armed');
      track('button_cover', { open: true });
    } else {
      sfx('press', { pitch: -6, gain: 0.6 });
      setPhase('locked');
      setBlocked(false);
    }
  }

  function press() {
    if (phase !== 'armed' && phase !== 'cancelled' && phase !== 'connected') return;
    useUI.getState().setFlag('buttonPressed', Date.now());
    sfx('press');
    game().unlock('connected');
    track('big_button', { to: redirect.url });
    setBlocked(false);
    setPhase('counting');
    setCount(3);
    sfx('beep', { pitch: 0 });
    let n = 3;
    const step = () => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        sfx('beep', { pitch: 3 - n });
        timer.current = setTimeout(step, 1000);
      } else {
        timer.current = null;
        setCount(0);
        sfx('success');
        setPhase('connected');
        track('redirect', { to: redirect.url, via: 'big-button' });
        trackReach(redirect.url, 'big-button');
        let ok = true;
        try {
          ok = go(redirect.url);
        } catch {
          ok = false;
        }
        if (!ok) setBlocked(true);
      }
    };
    timer.current = setTimeout(step, 1000);
  }

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    sfx('back');
    setPhase('cancelled');
    track('big_button_cancel');
  }

  const opened = dest.kind === 'mail' ? `Mail app open · ${dest.label}` : `Opened ${dest.label}`;
  const lcd =
    phase === 'locked'
      ? { k: 'Safety cover closed', v: 'LOCKED' }
      : phase === 'armed'
        ? { k: 'Cover up · ready', v: 'ARMED' }
        : phase === 'counting'
          ? { k: `Reaching ${dest.label}`, v: String(count) }
          : phase === 'connected'
            ? { k: opened, v: 'HELLO' }
            : { k: 'Stopped · press again any time', v: 'PAUSED' };

  return (
    <Sheet code={st.code} kicker={st.name} title="Press to reach Adelia" className="rd-sheet">
      <div className="rd">
        <div className={`rd-console surface--flat rd--${phase}`}>
          <div className="screws">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="rd-lcd lcd">
            <span className="t-label rd-lcd__k">
              <span className={`led ${phase === 'locked' ? 'led--off' : phase === 'counting' ? 'led--blink' : phase === 'connected' ? 'led--green' : ''}`} /> {lcd.k}
            </span>
            <span className={`rd-lcd__v t-dot ${phase === 'counting' ? 'is-count' : ''}`} key={lcd.v} aria-live="assertive">
              {lcd.v}
            </span>
          </div>

          <div className="rd-housing">
            <div className="rd-hazard" aria-hidden />
            <div className="rd-bezel" aria-hidden />
            <button
              type="button"
              className={`rd-btn ${pressed ? 'is-down' : ''}`}
              disabled={!coverOpen || phase === 'counting'}
              onPointerDown={() => coverOpen && phase !== 'counting' && setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerLeave={() => setPressed(false)}
              onClick={press}
              aria-label={`Press to reach Adelia: opens ${dest.label} in 3 seconds`}
            >
              <span className="rd-btn__cap">
                <span className="rd-btn__txt">
                  Press to
                  <br />
                  reach Adelia
                </span>
              </span>
            </button>
            <button type="button" className={`rd-cover ${coverOpen ? 'is-open' : ''}`} onClick={toggleCover} aria-pressed={coverOpen} aria-label={coverOpen ? 'Close the safety cover' : 'Lift the safety cover'} disabled={phase === 'counting'}>
              <span className="rd-cover__hinge" aria-hidden />
              <span className="rd-cover__tab" aria-hidden>
                {coverOpen ? 'Close' : 'Lift'}
              </span>
            </button>
          </div>

          <div className="rd-plate">
            <span className="t-label">{st.code} · Reach</span>
            <span className="t-label">→ {dest.label}</span>
          </div>

          <div className="rd-controls">
            {phase === 'counting' ? (
              <button type="button" className="btn btn--dark btn--block" onClick={cancel} autoFocus>
                <Icon name="close" size={14} /> Stop
              </button>
            ) : phase === 'locked' ? (
              <button type="button" className="btn btn--block" onClick={toggleCover}>
                Lift the safety cover
              </button>
            ) : (
              <p className="rd-help">
                <span>
                  {phase === 'connected'
                    ? blocked
                      ? 'Your browser blocked the new tab.'
                      : dest.kind === 'mail'
                        ? 'No mail app? Copy her email from the switches below.'
                        : 'Didn’t open? Use the link below.'
                    : dest.kind === 'mail'
                      ? 'Cover’s up. One press, three seconds, one email to Adelia.'
                      : `Cover’s up. One press, three seconds: ${dest.label}.`}
                </span>
                <button type="button" className="rd-mini" onClick={toggleCover}>
                  Close the cover
                </button>
              </p>
            )}
            {(phase === 'connected' || blocked) && (
              <a
                className="btn btn--primary btn--block"
                href={redirect.url}
                target={dest.kind === 'mail' ? undefined : '_blank'}
                rel="noopener noreferrer"
                onClick={() => trackReach(redirect.url, 'big-button-link')}
              >
                <Icon name={dest.kind === 'mail' ? 'mail' : dest.kind === 'cv' ? 'file' : 'arrow-up-right'} size={16} /> Open {dest.label}
              </a>
            )}
          </div>
        </div>

        <div className="rule">Her direct lines</div>
        <p className="rd-note">
          <span className="led led--green" aria-hidden /> {COMPANY.replyTime}, from {COMPANY.city} (WIB, UTC+7).
        </p>
        <Switchboard />
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ switches */

interface Line {
  id: string;
  name: string;
  body: string;
  /** what the switch does when it goes on */
  run: () => Promise<string | null> | string | null;
  icon: 'mail' | 'file' | 'arrow-up-right';
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function downloadCv() {
  const a = document.createElement('a');
  a.href = COMPANY.cv;
  a.download = 'Adelia-Tiara-CV.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const ecoBody = (id: string, fallback: string) => ECOSYSTEM.find((e) => e.id === id)?.body ?? fallback;
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

function lines(): Line[] {
  const out: Line[] = [
    {
      id: 'email',
      name: 'Email',
      body: COMPANY.email,
      icon: 'mail',
      run: async () => {
        const ok = await copyText(COMPANY.email);
        track('email', { from: 'button', action: ok ? 'copy' : 'mailto' });
        if (!ok) window.location.href = `mailto:${COMPANY.email}`;
        return ok ? 'Copied her email' : 'Opening your mail app';
      },
    },
    {
      id: 'cv',
      name: 'CV (PDF)',
      body: ecoBody('cv', 'One page: roles, dates, tools and education.'),
      icon: 'file',
      run: () => {
        downloadCv();
        track('cv_download', { from: 'button' });
        return 'Downloading her CV';
      },
    },
  ];
  // only links her content actually has (profile.ts socials with an href)
  for (const id of ['linkedin', 'github']) {
    const s = COMPANY.socials.find((x) => x.id === id);
    if (!s) continue;
    out.push({
      id: s.id,
      name: s.label,
      body: ecoBody(s.id, bare(s.url)),
      icon: 'arrow-up-right',
      run: () => {
        track('redirect', { to: s.id, url: s.url, via: 'switchboard' });
        window.open(s.url, '_blank', 'noopener,noreferrer');
        return `${s.label} opened in a new tab`;
      },
    });
  }
  return out;
}

function Switchboard() {
  const [on, setOn] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('adelia.switchboard') || '{}');
    } catch {
      return {};
    }
  });
  const [msg, setMsg] = useState('');
  const all = useRef(lines()).current;
  useEffect(() => {
    try {
      sessionStorage.setItem('adelia.switchboard', JSON.stringify(on));
    } catch {}
  }, [on]);

  return (
    <>
      <div className="rd-switches">
        {all.map((l, i) => {
          const active = !!on[l.id];
          return (
            <button
              key={l.id}
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={`${l.name}: ${l.id === 'email' ? `copy ${COMPANY.email}` : l.id === 'cv' ? 'download the PDF' : `open ${l.body}`}`}
              className={`rd-sw ${active ? 'is-on' : ''}`}
              onClick={async () => {
                const next = !active;
                setOn((s) => ({ ...s, [l.id]: next }));
                sfx('switch', { pitch: next ? 2 : -2 });
                if (next) {
                  const m = await l.run();
                  if (m) setMsg(m);
                }
              }}
            >
              <span className="rd-sw__top">
                <span className="t-label rd-sw__n">CH-{String(i + 1).padStart(2, '0')}</span>
                <span className={`led ${l.id === 'email' || l.id === 'cv' ? 'led--blue' : ''} ${active ? '' : 'led--off'}`} />
              </span>
              <span className="rd-sw__name">
                {l.name} <Icon name={l.icon} size={13} />
              </span>
              <span className={`rd-sw__body ${l.id === 'email' ? 'is-mono' : ''}`}>{l.body}</span>
              <span className="rd-sw__track" aria-hidden>
                <span className="rd-sw__knob" />
                <span className="rd-sw__lbl rd-sw__lbl--off">Off</span>
                <span className="rd-sw__lbl rd-sw__lbl--on">On</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="rd-msg" role="status" aria-live="polite">
        {msg}
      </p>
    </>
  );
}
