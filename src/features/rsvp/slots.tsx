/* ==========================================================================
   Preferred times for a chat, shown in WIB (Bekasi) and in the visitor's
   own time zone. These are preferences, not a live calendar: Adelia
   confirms one by email within a day. Times follow her working hours and
   her own time-zone notes (profile.ts → practical → "Time zones"):
   09:00–18:00 WIB, plus an early 07:30 WIB slot for teams in the Americas
   and a 19:00 WIB slot for teams in Europe and Africa.
   ========================================================================== */
import { useId, useMemo, useState } from 'react';
import { sfx } from '@/audio/engine';
import { Icon } from '@/ui/Icon';
import { HOME_TZ, fmtIn, formatOffset, hourIn, offsetHours, sameAsHome, visitorTimeZone, zoneCity } from '@/features/clock/tz';

export interface Slot {
  iso: string;
  t: number;
  dayKey: string;
  /** "10:00" in WIB */
  wib: string;
  /** "Tue 27 Oct" in WIB */
  day: string;
  /** "04:00" (or "Mon 21:00" when the visitor's date differs) in the visitor's zone */
  local: string;
  inYourDay: boolean;
}

interface Day {
  key: string;
  wd: string;
  dd: string;
  mon: string;
  label: string;
  slots: Slot[];
}

const WIB_MS = 7 * 3600_000;
export const MAX_PICKS = 3;

export function visitorZone() {
  const tz = visitorTimeZone();
  const now = new Date();
  return { tz, city: zoneCity(tz), offset: formatOffset(offsetHours(tz, now)), same: sameAsHome(tz, now) };
}

/** The next working days in Bekasi with the hours she offers (at least a day from now). */
export function buildDays(tz: string, now = Date.now(), n = 5): Day[] {
  const v = offsetHours(tz, new Date(now));
  const times = [10, 13, 15, 17];
  if (v <= -3) times.unshift(7.5); // the Americas: her 07:00–09:00 WIB call window
  if (v >= -1 && v <= 3) times.push(19); // Europe / Africa: her 12:00–21:00 WIB window
  const same = sameAsHome(tz, new Date(now));
  const days: Day[] = [];
  const base = new Date(now + WIB_MS); // WIB wall clock, read with getUTC*
  for (let i = 1; i <= 16 && days.length < n; i++) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + i));
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const slots: Slot[] = [];
    for (const h of times) {
      const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(h), Math.round((h % 1) * 60)) - WIB_MS;
      if (t < now + 24 * 3600_000) continue;
      const at = new Date(t);
      const localDate = fmtIn(tz, at, { day: '2-digit', month: '2-digit' });
      const homeDate = fmtIn(HOME_TZ, at, { day: '2-digit', month: '2-digit' });
      const lt = fmtIn(tz, at, { hour: '2-digit', minute: '2-digit' });
      const lh = hourIn(tz, at);
      slots.push({
        iso: at.toISOString(),
        t,
        dayKey: d.toISOString().slice(0, 10),
        wib: fmtIn(HOME_TZ, at, { hour: '2-digit', minute: '2-digit' }),
        day: fmtIn(HOME_TZ, at, { weekday: 'short', day: 'numeric', month: 'short' }),
        local: same ? '' : localDate === homeDate ? lt : `${fmtIn(tz, at, { weekday: 'short' })} ${lt}`,
        inYourDay: lh >= 8 && lh < 19,
      });
    }
    if (!slots.length) continue;
    days.push({
      key: d.toISOString().slice(0, 10),
      wd: fmtIn(HOME_TZ, new Date(d.getTime() + 5 * 3600_000), { weekday: 'short' }),
      dd: String(d.getUTCDate()),
      mon: fmtIn(HOME_TZ, new Date(d.getTime() + 5 * 3600_000), { month: 'short' }),
      label: fmtIn(HOME_TZ, new Date(d.getTime() + 5 * 3600_000), { weekday: 'long', day: 'numeric', month: 'long' }),
      slots,
    });
  }
  return days;
}

/** "Tue 27 Oct · 10:00 WIB (04:00 London)" */
export function slotLabel(s: Slot, city: string) {
  return `${s.day} · ${s.wib} WIB${s.local ? ` (${s.local} ${city})` : ''}`;
}

export function SlotPicker({ picks, onChange, optional = true }: { picks: Slot[]; onChange: (s: Slot[]) => void; optional?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const zone = useMemo(visitorZone, []);
  const days = useMemo(() => buildDays(zone.tz), [zone.tz]);
  const [dayKey, setDayKey] = useState(() => picks[0]?.dayKey ?? days[0]?.key ?? '');
  const day = days.find((d) => d.key === dayKey) ?? days[0];
  const full = picks.length >= MAX_PICKS;

  const toggle = (s: Slot) => {
    const on = picks.some((p) => p.iso === s.iso);
    if (!on && full) {
      sfx('error', { gain: 0.4 });
      return;
    }
    sfx('key', { pitch: on ? -2 : 2 });
    onChange(on ? picks.filter((p) => p.iso !== s.iso) : [...picks, s].sort((a, b) => a.t - b.t));
  };

  if (!days.length) return null;

  return (
    <fieldset className="rv-slots" aria-describedby={`${uid}-hint`}>
      <legend className="rule">Times that could work{optional ? ' · optional' : ''}</legend>
      <p className="rv-hint rv-slots__hint" id={`${uid}-hint`}>
        {zone.same ? (
          <>
            Times in <b>WIB</b>, the same clock as yours. Pick up to {MAX_PICKS}.
          </>
        ) : (
          <>
            Times in <b>WIB</b> (Bekasi, UTC+7) and in <b>your time</b> ({zone.city}, {zone.offset}). Pick up to {MAX_PICKS}.
          </>
        )}{' '}
        There’s no live calendar here: she confirms one by email within a day.
      </p>

      <div className="rv-days" role="radiogroup" aria-label="Day (Bekasi date)">
        {days.map((d) => {
          const n = picks.filter((p) => p.dayKey === d.key).length;
          return (
            <label key={d.key} className={`rv-day ${d.key === day?.key ? 'is-on' : ''}`}>
              <input
                type="radio"
                className="sr-only"
                name={`${uid}-day`}
                value={d.key}
                checked={d.key === day?.key}
                onChange={() => {
                  sfx('click');
                  setDayKey(d.key);
                }}
                aria-label={`${d.label}${n ? `, ${n} picked` : ''}`}
              />
              <span className="t-label" aria-hidden>
                {d.wd}
              </span>
              <b className="t-dot" aria-hidden>
                {d.dd}
              </b>
              <span className="t-label" aria-hidden>
                {d.mon}
              </span>
              {n > 0 && (
                <i className="rv-day__n" aria-hidden>
                  {n}
                </i>
              )}
            </label>
          );
        })}
      </div>

      {day && (
        <div className="rv-times" role="group" aria-label={`Times on ${day.label}`}>
          {day.slots.map((s) => {
            const on = picks.some((p) => p.iso === s.iso);
            const disabled = !on && full;
            return (
              <label key={s.iso} className={`rv-time ${on ? 'is-on' : ''} ${disabled ? 'is-off' : ''}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  disabled={disabled}
                  onChange={() => toggle(s)}
                  aria-label={`${s.day}, ${s.wib} WIB${s.local ? `, ${s.local} your time` : ''}${s.local && !s.inYourDay ? ' (outside a 08:00–19:00 day for you)' : ''}`}
                />
                <span className="rv-time__wib" aria-hidden>
                  <b className="t-mono">{s.wib}</b> <small>WIB</small>
                </span>
                {s.local && (
                  <span className="rv-time__you" aria-hidden>
                    <span className={`led ${s.inYourDay ? 'led--blue' : 'led--off'}`} /> {s.local} you
                  </span>
                )}
                <span className="rv-time__check" aria-hidden>
                  {on ? <Icon name="check" size={14} /> : null}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="rv-picks" aria-live="polite">
        {picks.length === 0 ? (
          <span className="rv-hint">{optional ? 'No times picked: she’ll suggest a few.' : 'Pick at least one time.'}</span>
        ) : (
          <>
            <span className="t-label">
              Your picks · {picks.length}/{MAX_PICKS}
            </span>
            <ul>
              {picks.map((p) => (
                <li key={p.iso} className="chip chip--primary rv-pick">
                  <span>{slotLabel(p, zone.city)}</span>
                  <button type="button" className="rv-pick__x" onClick={() => toggle(p)} aria-label={`Remove ${slotLabel(p, zone.city)}`}>
                    <Icon name="close" size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {!zone.same && <p className="rv-hint rv-legend"><span className="led led--blue" /> inside an 08:00–19:00 day for you</p>}
      </div>
    </fieldset>
  );
}
