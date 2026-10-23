/* ==========================================================================
   RM-20 · The window — a live Bekasi weather station. The LCD reads the
   real sky over her room (Open-Meteo); the keycaps let the visitor overrule
   the window outside (rain, storm, fog, clear) and hand it back to live.
   The window is also where House Rule V lives: go to the field first.
   ========================================================================== */
import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '@/ui/Panel';
import { game } from '@/state/game';
import { sfx } from '@/audio/engine';
import { CHAPTERS } from '@/lib/content';
import { STATIONS } from '@/stage/stations';
import { HOME, TZ, formatTime, hourIn, startWeather, useWeather, type WeatherKind } from '@/lib/weather';
import { DotIcon, glyphFor, glyphForKind, type Glyph } from './DotIcon';
import { SkyPreview } from './SkyPreview';
import './weather.css';

const RULE = CHAPTERS.find((c) => c.id === 'hello')!;

const TOGGLES: { kind: WeatherKind | null; label: string; glyph: Glyph }[] = [
  { kind: 'rain', label: 'Make it rain', glyph: 'rain' },
  { kind: 'storm', label: 'Storm', glyph: 'storm' },
  { kind: 'fog', label: 'Fog', glyph: 'fog' },
  { kind: 'clear', label: 'Clear', glyph: 'sun' },
  { kind: null, label: 'Back to live', glyph: 'partly' },
];

const KIND_LABEL: Record<WeatherKind, string> = {
  clear: 'Clear',
  cloudy: 'Overcast',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  storm: 'Storm',
  snow: 'Snow',
};

/** Her field research, from the Toolkit's cassette recorder (content.ts PRODUCTS → field-research specs). */
const FIELD = ['27 warung counters', '12 commuter ride-alongs', '9 bid teams', 'WhatsApp diary studies'];

const hhmm = (iso?: string) => (iso && iso.length >= 16 ? iso.slice(11, 16) : undefined);
const toH = (s: string) => Number(s.slice(0, 2)) + Number(s.slice(3, 5)) / 60;

/** A plausible diurnal curve when the live feed is unreachable. */
function estimateHours(temp: number, from: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const h = (Math.floor(from) + i) % 24;
    const curve = Math.sin(((h - 9) / 24) * Math.PI * 2); // warmest mid-afternoon
    return { h, temp: Math.round(28.5 + curve * 3.5 + (temp - 30) * 0.3), code: h >= 13 && h <= 17 ? 80 : 2 };
  });
}

export default function WeatherPanel() {
  const jkt = useWeather((s) => s.home); // Bekasi (legacy key name)
  const override = useWeather((s) => s.override);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    startWeather();
    game().unlock('weather-watcher');
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const hour = hourIn(TZ, new Date(now));
  const sunrise = hhmm(jkt.sunrise) ?? '05:35';
  const sunset = hhmm(jkt.sunset) ?? '17:50';
  const estimated = !jkt.sunrise;
  const dayFrac = (hour - toH(sunrise)) / (toH(sunset) - toH(sunrise));

  const hours = useMemo(() => {
    if (jkt.hourly.length) return jkt.hourly.slice(0, 12).map((x) => ({ h: Number(x.time.slice(11, 13)), temp: Math.round(x.temp), code: x.code }));
    return estimateHours(jkt.temp, hourIn());
  }, [jkt]);

  const shown: WeatherKind = override ?? jkt.kind;
  const choose = (kind: WeatherKind | null) => {
    if (kind === override) return;
    sfx(kind ? 'switch' : 'release');
    if (kind === 'storm') setTimeout(() => sfx('whoosh', { gain: 0.6, pitch: -7 }), 120);
    useWeather.getState().setOverride(kind);
  };

  return (
    <Sheet
      code={STATIONS.window.code}
      title="The window"
      kicker="Live · Bekasi"
      className="wx"
      actions={
        <div className="wx-peek" title="The view from her window, right now">
          <SkyPreview className="wx-peek__sky" />
          <i className="wx-peek__mullion" aria-hidden="true" />
        </div>
      }
    >
      {/* LCD hero ----------------------------------------------------------- */}
      <section className="wx-hero lcd" aria-label={`Current weather in Bekasi: ${Math.round(jkt.temp)}°C, ${jkt.label}`}>
        <div className="wx-hero__top">
          <span className="t-label">
            {HOME.city} · {Math.abs(HOME.lat).toFixed(2)}°S {HOME.lon.toFixed(2)}°E
          </span>
          <span className={`wx-chip ${jkt.live ? 'is-live' : ''}`}>
            <i className={`led ${jkt.live ? 'led--green led--blink' : 'led--off'}`} />
            {jkt.live ? 'Live' : 'Offline estimate'}
          </span>
        </div>
        <div className="wx-hero__main">
          <div className="wx-temp">
            <span className="wx-temp__n t-dot">{Math.round(jkt.temp)}</span>
            <span className="wx-temp__u t-dot">°C</span>
          </div>
          <DotIcon glyph={glyphFor(jkt.code, jkt.isDay)} size={78} ghost className="wx-hero__icon" />
        </div>
        <div className="wx-cond">
          <strong>{jkt.label}</strong>
          <span>Feels like {Math.round(jkt.feels)}°</span>
        </div>
        <dl className="wx-stats">
          <div>
            <dt>Humidity</dt>
            <dd className="t-dot">{Math.round(jkt.humidity)}%</dd>
          </div>
          <div>
            <dt>Wind</dt>
            <dd className="t-dot">
              {Math.round(jkt.wind)}
              <small>km/h</small>
            </dd>
          </div>
          <div>
            <dt>Sunrise</dt>
            <dd className="t-dot">
              {estimated ? '≈' : ''}
              {sunrise}
            </dd>
          </div>
          <div>
            <dt>Sunset</dt>
            <dd className="t-dot">
              {estimated ? '≈' : ''}
              {sunset}
            </dd>
          </div>
        </dl>
        <div className="wx-daylight" aria-hidden="true">
          {Array.from({ length: 32 }, (_, i) => {
            const u = i / 31;
            const on = dayFrac >= 0 && dayFrac <= 1;
            const cur = on && Math.abs(u - dayFrac) < 0.5 / 31;
            return <i key={i} className={cur ? 'is-sun' : on && u < dayFrac ? 'is-past' : ''} style={{ transform: `translateY(${-Math.sin(u * Math.PI) * 9}px)` }} />;
          })}
        </div>
        <div className="wx-hero__foot t-label">
          <span>{jkt.live ? `Updated ${formatTime(TZ, new Date(jkt.updatedAt))} WIB` : 'Live feed unreachable · showing a typical Bekasi day'}</span>
          {override && <span className="wx-override">Window: {KIND_LABEL[override]}</span>}
        </div>
      </section>

      {/* next 12 hours ---------------------------------------------------- */}
      <section className="wx-block">
        <div className="rule">Next 12 hours{jkt.hourly.length ? '' : ' · estimate'}</div>
        <ol className="wx-hours scroll" aria-label="Hourly forecast">
          {hours.map((x, i) => (
            <li key={`${x.h}-${i}`} className={`wx-hour ${i === 0 ? 'is-now' : ''}`}>
              <span className="wx-hour__t">{i === 0 ? 'Now' : String(x.h).padStart(2, '0')}</span>
              <DotIcon glyph={glyphFor(x.code, x.h >= 6 && x.h < 18)} size={26} />
              <span className="wx-hour__v t-dot">{x.temp}°</span>
            </li>
          ))}
        </ol>
      </section>

      {/* condition toggles ------------------------------------------------- */}
      <section className="wx-block">
        <div className="rule">Play with the window</div>
        <div className="wx-toggles" role="group" aria-label="Change the weather outside the window">
          {TOGGLES.map((t) => {
            const active = t.kind !== null && t.kind === override;
            return (
              <button
                key={t.label}
                className={`btn wx-toggle ${t.kind ? '' : 'wx-toggle--live'} ${active ? 'is-pressed is-active' : ''}`}
                aria-pressed={active}
                disabled={!t.kind && !override}
                onClick={() => choose(t.kind)}
                onMouseEnter={() => sfx('hover')}
              >
                <DotIcon glyph={t.kind ? t.glyph : glyphForKind(jkt.kind, jkt.isDay)} size={18} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
        <p className="wx-note" aria-live="polite">
          {override ? (
            <>
              The window shows <b>{KIND_LABEL[shown].toLowerCase()}</b>. The real Bekasi sky says <b>{jkt.label.toLowerCase()}</b>.
            </>
          ) : (
            <>The window outside is live: it follows Bekasi’s sky and clock.</>
          )}
        </p>
      </section>

      {/* House Rule V --------------------------------------------------- */}
      <section className="wx-legacy" aria-labelledby="wx-rule-h">
        <span className="t-label">
          <b className="t-primary">House Rule {RULE.roman}</b> · {RULE.title}
        </span>
        <h3 id="wx-rule-h">The forecast shows up in the field first.</h3>
        <p>
          Before she writes code, she goes where the product will be used: behind warung counters for Catat, on morning commutes for Lintas, beside bid teams for
          Tenderlens. What she hears there becomes the brief, the eval cases and the words on the screen.
        </p>
        <ul className="wx-signals" aria-label="Where she did her field research">
          {FIELD.map((s, i) => (
            <li key={s} className="chip">
              <i className="led led--blue led--blink" style={{ animationDelay: `${i * 0.3}s` }} aria-hidden />
              {s}
            </li>
          ))}
        </ul>
        <blockquote className="wx-line">
          <p>“{RULE.line}”</p>
          <cite className="t-label">House Rule {RULE.roman} of five</cite>
        </blockquote>
        <p className="wx-rule-body">{RULE.body}</p>
      </section>
    </Sheet>
  );
}
