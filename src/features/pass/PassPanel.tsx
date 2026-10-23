/* ==========================================================================
   RM-12 · Her Guest Pass — the holo card next to the instant camera: your
   name on a pass, hearts (♥) and tiers (Visitor → Guest → Friend → Regular
   → Bestie), room stamps, the perks each tier unlocks, and the hearts
   ledger. The card downloads as a PNG. Nothing on the hiring path is ever
   behind a tier: perks are small, free and real.
   ========================================================================== */
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Sheet } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { useGame, game } from '@/state/game';
import { useUI } from '@/state/ui';
import { toast } from '@/state/toasts';
import { ACHIEVEMENTS, TIERS, tierFor, nextTier, type Tier } from '@/state/achievements';
import { EXPLORABLE } from '@/stage/stations';
import { focus } from '@/stage/director';
import { sfx } from '@/audio/engine';
import { submit, track } from '@/lib/api';
import { CHAPTERS } from '@/lib/content';
import { identity } from '@/content/profile';
import { PassCard } from './PassCard';
import { renderCardPNG, downloadBlob } from './cardImage';
import { renderStickerSheet } from './stickerSheet';
import { ago, copyText, jitter, memberNo as toMemberNo, reducedMotion, since as toSince, stampDate, useCountUp, voucherCode } from './lib';
import './pass.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SEGMENTS = 24;
/** the Friend tier's perk is the holo finish */
const HOLO_AT = TIERS.find((t) => t.id === 'build')?.min ?? Infinity;

export default function PassPanel() {
  const name = useGame((s) => s.name);
  const email = useGame((s) => s.email);
  const sessionId = useGame((s) => s.sessionId);
  const createdAt = useGame((s) => s.createdAt);
  const points = useGame((s) => s.points);
  const stamps = useGame((s) => s.stamps);
  const ledger = useGame((s) => s.ledger);
  const stickers = useGame((s) => s.achievements);
  const lines = useGame((s) => Object.keys(s.manifesto).length);
  const redeemed = useGame((s) => s.stats.redeemed);

  const tier = tierFor(points);
  const next = nextTier(points);
  const no = toMemberNo(sessionId);
  const count = useCountUp(points);
  const holo = points >= HOLO_AT;
  const nStickers = Object.keys(stickers).length;

  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(!name);
  const [draft, setDraft] = useState({ name, email });
  const [error, setError] = useState('');
  const [emboss, setEmboss] = useState(0);
  const [issued, setIssued] = useState(false);
  const [exporting, setExporting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const flip = () => {
    sfx('switch');
    setFlipped((f) => !f);
  };

  const claim = (e: FormEvent) => {
    e.preventDefault();
    const n = draft.name.trim().replace(/\s+/g, ' ');
    const m = draft.email.trim();
    if (n.length < 2) return setError('Your name needs at least two letters.'), sfx('error');
    if (m && !EMAIL_RE.test(m)) return setError('That email doesn’t look right.'), sfx('error');
    setError('');
    const first = !name;
    game().setProfile({ name: n, email: m });
    setEditing(false);
    setFlipped(false);
    setEmboss((k) => k + 1);
    track('pass_claim', { first });
    sfx('press');
    heroRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    // letters press in, then the issuing stamp lands
    later(() => {
      sfx('stamp');
      setIssued(true);
    }, Math.min(1400, 300 + n.length * 55));
    later(() => {
      if (first) game().unlock('card-holder');
      else sfx('success');
    }, Math.min(1900, 800 + n.length * 55));
    later(() => setIssued(false), 4600);
  };

  const cardData = () => ({ name, memberNo: no, tier, points, since: toSince(createdAt), holo });

  const exportPNG = async () => {
    setExporting(true);
    sfx('print');
    try {
      const blob = await renderCardPNG(cardData());
      downloadBlob(blob, `adelia-guest-pass-${no}.png`);
      track('pass_download', { holo });
    } catch {
      sfx('error');
      toast({ kind: 'info', title: 'Download failed', body: 'Your browser blocked the image. Try again?' });
    } finally {
      setExporting(false);
    }
  };

  const share = async () => {
    sfx('click');
    const text = `${name ? `${name} is` : 'I’m'} a ${tier.name} on Adelia’s Guest Pass · ♥ ${points.toLocaleString('en-US')} hearts · ${no}`;
    const url = location.origin;
    track('pass_share');
    if (navigator.share) {
      try {
        let files: File[] | undefined;
        try {
          const blob = await renderCardPNG(cardData());
          const f = new File([blob], `adelia-guest-pass-${no}.png`, { type: 'image/png' });
          if (navigator.canShare?.({ files: [f] })) files = [f];
        } catch {}
        await navigator.share({ title: 'Adelia’s Guest Pass', text, url, ...(files ? { files } : {}) });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    const ok = await copyText(`${text} — ${url}`);
    toast({ kind: 'info', title: ok ? 'Copied to clipboard' : 'Couldn’t copy', body: ok ? 'Paste it anywhere.' : text });
  };

  const editProfile = () => {
    setDraft({ name, email });
    setEditing(true);
    sfx('click');
    later(() => formRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' }), 50);
  };

  const stamped = EXPLORABLE.filter((s) => stamps[s.id]).length;
  const pct = next ? (points - tier.min) / (next.min - tier.min) : 1;
  const lit = Math.round(Math.min(1, Math.max(0, pct)) * SEGMENTS);
  const digits = String(count);
  const pad = '0'.repeat(Math.max(0, 5 - digits.length));
  const openPanel = useUI.getState().openPanel;

  return (
    <Sheet code="RM-12" kicker={`Guest Pass · ${tier.name}`} title="Her Guest Pass" className="gp-sheet">
      {/* ---------------------------------------------------------- card */}
      <section className="gp-hero" ref={heroRef}>
        <PassCard
          name={editing ? draft.name || name : name}
          memberNo={no}
          sessionId={sessionId}
          tier={tier}
          points={points}
          since={toSince(createdAt)}
          holo={holo}
          flipped={flipped}
          onFlip={flip}
          emboss={emboss}
        />
        {issued && (
          <span className="gp-issued" aria-hidden>
            <b>Issued</b>
            <span>{stampDate(Date.now())} · WIB</span>
          </span>
        )}
        <div className="gp-cardbar">
          <button className="btn btn--sm btn--ghost" onClick={flip}>
            <Icon name="arrow-right" size={14} style={{ transform: flipped ? 'scaleX(-1)' : undefined }} /> {flipped ? 'Front' : 'Flip'}
          </button>
          <span className="gp-cardbar__finish t-label">{holo ? 'Holo foil' : `Clear · holo at ${HOLO_AT.toLocaleString('en-US')} ♥`}</span>
          <button className="btn btn--sm btn--icon" onClick={exportPNG} disabled={exporting} aria-label="Download your pass as a PNG" title="Download (PNG)">
            <Icon name="download" size={16} />
          </button>
          <button className="btn btn--sm btn--icon" onClick={share} aria-label="Share your pass" title="Share">
            <Icon name="share" size={16} />
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------- claim */}
      {editing ? (
        <form ref={formRef} className="gp-claim well" onSubmit={claim} noValidate>
          <div className="gp-claim__head">
            <span className="t-label">{name ? 'Edit your pass' : 'Claim your pass · +60 ♥'}</span>
            <h3>{name ? 'New name, same pass.' : 'Put your name on it.'}</h3>
          </div>
          <label className="field">
            <span>Name on the pass</span>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => {
                setDraft((d) => ({ ...d, name: e.target.value.slice(0, 22) }));
                sfx('type', { gain: 0.5 });
              }}
              placeholder="Your name"
              autoComplete="name"
              maxLength={22}
              required
              aria-invalid={!!error && draft.name.trim().length < 2}
            />
          </label>
          <label className="field">
            <span>Email · optional, only for the Bestie note</span>
            <input
              className="input"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="you@company.com"
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!error && !!draft.email.trim() && !EMAIL_RE.test(draft.email.trim())}
            />
          </label>
          {error && (
            <p className="gp-error" role="alert">
              {error}
            </p>
          )}
          <div className="gp-claim__actions">
            <button type="submit" className="btn btn--primary btn--block">
              <Icon name="card" size={16} /> {name ? 'Re-emboss my pass' : 'Emboss my pass'}
            </button>
            {name && (
              <button type="button" className="btn btn--ghost" onClick={() => (setEditing(false), setDraft({ name, email }), sfx('back'))}>
                Cancel
              </button>
            )}
          </div>
          <p className="gp-small">Your name stays on this device. The email is only used if you ask for the Bestie note.</p>
        </form>
      ) : (
        <div className="gp-holder">
          <span className="t-label">
            Guest · <b>{name}</b>
            {email ? ` · ${email}` : ''}
          </span>
          <button className="gp-link" onClick={editProfile}>
            Edit
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------- hearts */}
      <section className="gp-lcd lcd" aria-label={`${points} hearts, ${tier.name} tier`}>
        <div className="gp-lcd__row">
          <span>Hearts</span>
          <span className="gp-lcd__tier">
            <i style={{ background: tier.color }} /> {tier.name}
          </span>
        </div>
        <div className="gp-lcd__num t-dot">
          <span className="gp-lcd__heart" aria-hidden>
            ♥
          </span>
          <span className="gp-lcd__pad">{pad}</span>
          {digits}
        </div>
        <div className="gp-seg" aria-hidden>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <i key={i} className={i < lit ? 'is-on' : ''} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>
        <div className="gp-lcd__row">
          <span>{next ? `${(next.min - points).toLocaleString('en-US')} to ${next.name}` : 'Top tier. Thank you.'}</span>
          <span>{next ? `${tier.min.toLocaleString('en-US')} → ${next.min.toLocaleString('en-US')}` : `${tier.min.toLocaleString('en-US')}+`}</span>
        </div>
      </section>

      <div className="gp-links">
        <button className="gp-tile" onClick={() => (sfx('paper'), openPanel('manifesto'))}>
          <Icon name="notebook" size={20} />
          <span>
            <b>House Rules</b>
            <small>
              {lines}/{CHAPTERS.length} collected
            </small>
          </span>
          <Icon name="arrow-right" size={16} />
        </button>
        <button className="gp-tile" onClick={() => (sfx('open'), openPanel('achievements'))}>
          <Icon name="star" size={20} />
          <span>
            <b>Sticker book</b>
            <small>
              {nStickers}/{ACHIEVEMENTS.length} stuck in
            </small>
          </span>
          <Icon name="arrow-right" size={16} />
        </button>
      </div>

      {/* ---------------------------------------------------------- tiers + perks */}
      <section className="gp-section">
        <div className="rule">Tiers & perks</div>
        <ol className="gp-tiers">
          {TIERS.map((t) => (
            <TierRow
              key={t.id}
              t={t}
              points={points}
              current={t.id === tier.id}
              sessionId={sessionId}
              name={name}
              email={email}
              redeemed={redeemed}
              onShowCard={() => {
                setFlipped(false);
                heroRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
              }}
              onNeedName={editProfile}
            />
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------- stamps */}
      <section className="gp-section">
        <div className="rule">
          Room stamps · {stamped}/{EXPLORABLE.length}
        </div>
        <ul className="gp-stamps">
          {EXPLORABLE.map((s, i) => {
            const at = stamps[s.id];
            return (
              <li key={s.id} className={`gp-stamp ${at ? 'is-on' : ''}`} style={{ '--d': `${i * 30}ms` } as CSSProperties}>
                {at ? (
                  <span className={`gp-ink ${i % 3 === 1 ? 'gp-ink--blue' : ''}`} style={{ '--rot': `${(jitter(s.id) * 14).toFixed(1)}deg` } as CSSProperties} title={`${s.name} · stamped ${stampDate(at)}`}>
                    <svg viewBox="0 0 100 100" aria-hidden>
                      <defs>
                        <path id={`gp-arc-${s.id}`} d="M 16 50 A 34 34 0 1 1 84 50" />
                        <path id={`gp-arcb-${s.id}`} d="M 14 50 A 36 36 0 0 0 86 50" />
                      </defs>
                      <circle cx="50" cy="50" r="47" fill="none" strokeWidth="3" />
                      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="1.2" strokeDasharray="2 3" />
                      <text className="gp-ink__arc">
                        <textPath href={`#gp-arc-${s.id}`} startOffset="50%" textAnchor="middle">
                          {s.code} · ADELIA
                        </textPath>
                      </text>
                      <text className="gp-ink__arc">
                        <textPath href={`#gp-arcb-${s.id}`} startOffset="50%" textAnchor="middle">
                          {stampDate(at)}
                        </textPath>
                      </text>
                    </svg>
                    <Icon name={s.icon} size={24} stroke={2} />
                  </span>
                ) : (
                  <span className="gp-slot" aria-hidden>
                    <Icon name={s.icon} size={20} />
                    <small>{s.code}</small>
                  </span>
                )}
                <span className="gp-stamp__name">{s.name.replace(/^The /, '')}</span>
                {at ? (
                  <span className="sr-only">stamped {stampDate(at)}</span>
                ) : (
                  <button className="gp-goto" onClick={() => focus(s.id)} aria-label={`Take me to ${s.name}`}>
                    Go <Icon name="arrow-right" size={12} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------------------------------------------------- ledger */}
      <section className="gp-section">
        <div className="rule">Recent hearts</div>
        {ledger.length === 0 ? (
          <div className="gp-empty">
            <Icon name="heart" size={22} />
            <p>No hearts yet. Every object you find in the room gives some.</p>
          </div>
        ) : (
          <ul className="gp-ledger">
            {ledger.slice(0, 8).map((l, i) => (
              <li key={`${l.t}-${i}`}>
                <span className="gp-ledger__label">{l.label}</span>
                <span className="t-label">{ago(l.t)}</span>
                <b className="t-dot">+{l.pts}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="gp-foot">
        <button className="btn btn--block" onClick={exportPNG} disabled={exporting}>
          <Icon name="download" size={16} /> {exporting ? 'Rendering…' : 'Download pass (PNG)'}
        </button>
        <button className="btn btn--dark btn--block" onClick={share}>
          <Icon name="share" size={16} /> Share
        </button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------- a tier and what it gives */
function TierRow({
  t,
  points,
  current,
  sessionId,
  name,
  email,
  redeemed,
  onShowCard,
  onNeedName,
}: {
  t: Tier;
  points: number;
  current: boolean;
  sessionId: string;
  name: string;
  email: string;
  redeemed: string[];
  onShowCard: () => void;
  onNeedName: () => void;
}) {
  const on = points >= t.min;
  return (
    <li className={`gp-tier ${on ? 'is-on' : ''} ${current ? 'is-current' : ''}`} style={{ '--tier': t.color } as CSSProperties}>
      <span className="gp-tier__dot" aria-hidden />
      <div className="gp-tier__body">
        <div className="gp-tier__name">
          <b>{t.name}</b>
          <span className="t-label">{t.min.toLocaleString('en-US')} ♥</span>
          {current && <span className="chip chip--accent gp-tier__here">You’re here</span>}
        </div>
        <p>{t.perk}</p>
        {on && <Perk t={t} sessionId={sessionId} name={name} email={email} redeemed={redeemed} onShowCard={onShowCard} onNeedName={onNeedName} />}
      </div>
      <Icon name={on ? 'check' : 'lock'} size={16} className="gp-tier__state" />
    </li>
  );
}

function Perk({
  t,
  sessionId,
  name,
  email,
  redeemed,
  onShowCard,
  onNeedName,
}: {
  t: Tier;
  sessionId: string;
  name: string;
  email: string;
  redeemed: string[];
  onShowCard: () => void;
  onNeedName: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [mail, setMail] = useState(email);
  const [credits, setCredits] = useState(true);
  const [err, setErr] = useState('');
  useEffect(() => setMail(email), [email]);
  const ui = useUI.getState();
  const code = voucherCode(sessionId, t.id);

  switch (t.id) {
    case 'proof':
      return (
        <div className="gp-perk">
          <button className="btn btn--sm" onClick={() => (sfx('open'), track('perk', { tier: t.id }), ui.openPanel('records'))}>
            <Icon name="vinyl" size={15} /> Play the B-side
          </button>
        </div>
      );
    case 'build':
      return (
        <div className="gp-perk">
          <span className="chip chip--accent">On your pass now</span>
          <button className="gp-link" onClick={onShowCard}>
            See it
          </button>
        </div>
      );
    case 'play': {
      const sheet = async () => {
        setBusy(true);
        sfx('print');
        try {
          const blob = await renderStickerSheet({ name, achievements: useGame.getState().achievements });
          downloadBlob(blob, 'adelia-sticker-sheet.png');
          track('perk', { tier: t.id, action: 'sticker_sheet' });
        } catch {
          sfx('error');
          toast({ kind: 'info', title: 'Couldn’t draw the sheet', body: 'Your browser blocked the image. Try again?' });
        } finally {
          setBusy(false);
        }
      };
      return (
        <div className="gp-perk">
          <button className="btn btn--sm btn--accent" onClick={sheet} disabled={busy}>
            <Icon name="download" size={15} /> {busy ? 'Drawing…' : 'Download my sticker sheet'}
          </button>
        </div>
      );
    }
    case 'hello': {
      if (redeemed.includes(code)) {
        return (
          <div className="gp-perk gp-perk--done">
            <span className="chip chip--accent">
              <Icon name="check" size={13} /> Asked
            </span>
            <span className="t-label">{code}</span>
          </div>
        );
      }
      const ask = async (e: FormEvent) => {
        e.preventDefault();
        if (!name) {
          sfx('error');
          toast({ kind: 'info', title: 'Put your name on the pass first', body: 'The note goes to the name on the card.' });
          return onNeedName();
        }
        const m = mail.trim();
        if (!EMAIL_RE.test(m)) {
          sfx('error');
          return setErr('Add an email so the note can reach you.');
        }
        setErr('');
        setBusy(true);
        try {
          await submit('redemptions', { code, tier: t.id, name, email: m, sessionId, perk: t.perk, credits });
          game().setProfile({ email: m });
          game().updateStats((s) => ({ redeemed: s.redeemed.includes(code) ? s.redeemed : [...s.redeemed, code] }));
          track('perk', { tier: t.id, credits });
          sfx('stamp');
          toast({ kind: 'info', title: 'Asked for your note', body: `${identity.firstName} writes to ${m}.` });
        } catch {
          sfx('error');
          setErr('Couldn’t send. Check your connection and try again.');
        } finally {
          setBusy(false);
        }
      };
      return (
        <form className="gp-perk gp-perk--form" onSubmit={ask} noValidate>
          <label className="field">
            <span>Where should the note go?</span>
            <input className="input" type="email" value={mail} onChange={(e) => setMail(e.target.value)} placeholder="you@company.com" autoComplete="email" inputMode="email" aria-invalid={!!err} />
          </label>
          <label className="gp-check">
            <input type="checkbox" checked={credits} onChange={(e) => setCredits(e.target.checked)} />
            <span>Put my name in the room’s credits</span>
          </label>
          {err && (
            <p className="gp-error" role="alert">
              {err}
            </p>
          )}
          <button type="submit" className="btn btn--sm btn--accent" disabled={busy}>
            {busy ? 'Sending…' : 'Ask for my note'}
          </button>
        </form>
      );
    }
    default:
      return null;
  }
}
