/* Settings — sound, master volume, motion, graphics, reset progress, about this machine. */
import { useEffect, useRef, useState } from 'react';
import { audio, sfx } from '@/audio/engine';
import { useUI } from '@/state/ui';
import { game, useGame } from '@/state/game';
import { ACHIEVEMENTS, tierFor } from '@/state/achievements';
import { apiMode } from '@/lib/api';
import { COMPANY } from '@/lib/content';
import { applyVolume, getMotionPref, getVolume, setMotionPref, setVolume, systemReducedMotion, type MotionPref } from '../util';
import { useOS } from '../wm';

export function MachineSpecs() {
  const session = useGame((s) => s.sessionId);
  const rows: [string, string][] = [
    ['Model', 'AT-26 personal workstation'],
    ['System', `Adelia OS 26.10 (${COMPANY.city})`],
    ['Processor', `${COMPANY.role}, ${COMPANY.cohort.toLowerCase()}`],
    ['Memory', '2,100+ eval cases, labelled by hand'],
    ['Display', 'Clear acrylic · dot-matrix ready'],
    ['Network', apiMode() === 'remote' ? `Online · ${COMPANY.domain}` : 'Local demo mode'],
    ['Serial', session.slice(0, 12).toUpperCase()],
    ['Made in', `${COMPANY.hq} · since ${COMPANY.founded}`],
  ];
  return (
    <dl className="os-specs">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Settings({ section }: { section?: string }) {
  const muted = useUI((s) => s.muted);
  const quality = useUI((s) => s.quality);
  const points = useGame((s) => s.points);
  const stickers = useGame((s) => Object.keys(s.achievements).length);
  const [vol, setVol] = useState(() => Math.round(getVolume() * 100));
  const [motion, setMotion] = useState<MotionPref>(getMotionPref);
  const [confirm, setConfirm] = useState(false);
  const [wiped, setWiped] = useState(false);
  const machineRef = useRef<HTMLElement>(null);
  const system = systemReducedMotion();

  useEffect(() => {
    if (section === 'machine') machineRef.current?.scrollIntoView({ block: 'start', behavior: useOS.getState().calm ? 'auto' : 'smooth' });
  }, [section]);

  const toggleSound = () => {
    const m = !muted;
    useUI.getState().setMuted(m);
    audio.setMuted(m);
    if (!m) {
      applyVolume();
      setTimeout(() => sfx('success'), 60);
    }
  };

  const pickMotion = (m: MotionPref) => {
    if (m === motion) return;
    setMotion(m);
    setMotionPref(m);
    useOS.getState().setCalm(system || m === 'reduced');
    sfx('switch');
  };

  return (
    <div className="os-set scroll">
      <section className="os-set__group" aria-labelledby="set-sound">
        <h4 className="rule" id="set-sound">
          Sound
        </h4>
        <div className="os-set__row">
          <div>
            <b id="set-sound-label">Sound effects &amp; music</b>
            <small>Every click in this room is synthesised live. Nothing is recorded.</small>
          </div>
          <button className={`os-switch ${!muted ? 'is-on' : ''}`} role="switch" aria-checked={!muted} aria-labelledby="set-sound-label" onClick={toggleSound}>
            <i />
          </button>
        </div>
        <div className={`os-set__row ${muted ? 'is-dim' : ''}`}>
          <label htmlFor="os-vol">
            <b>Master volume</b>
            <small className="readout readout--blue">{String(vol).padStart(3, '0')}</small>
          </label>
          <input
            id="os-vol"
            className="os-range"
            type="range"
            min={0}
            max={100}
            value={vol}
            disabled={muted}
            style={{ ['--v' as string]: `${vol}%` }}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVol(v);
              setVolume(v / 100);
            }}
            onPointerUp={() => sfx('beep')}
            onKeyUp={() => sfx('tick')}
          />
        </div>
      </section>

      <section className="os-set__group" aria-labelledby="set-motion">
        <h4 className="rule" id="set-motion">
          Motion
        </h4>
        <div className="os-set__row">
          <div>
            <b>Animation in Adelia OS</b>
            <small>{system ? 'Your system asks for reduced motion, so the boot, windows and terminal stay calm.' : 'Reduced: a quick boot, no window zooms, no falling glyphs.'}</small>
          </div>
          <div className="os-seg" role="radiogroup" aria-label="Animation in Adelia OS">
            {(['full', 'reduced'] as const).map((m) => {
              const on = system ? m === 'reduced' : motion === m;
              return (
                <button key={m} role="radio" aria-checked={on} className={on ? 'is-on' : ''} disabled={system} onClick={() => pickMotion(m)}>
                  {m === 'full' ? 'Full' : 'Reduced'}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="os-set__group" aria-labelledby="set-gfx">
        <h4 className="rule" id="set-gfx">
          Graphics
        </h4>
        <div className="os-set__row">
          <div>
            <b>Quality</b>
            <small>Light mode trims effects in the room on slower phones.</small>
          </div>
          <div className="os-seg" role="radiogroup" aria-label="Graphics quality">
            {(['high', 'low'] as const).map((q) => (
              <button
                key={q}
                role="radio"
                aria-checked={quality === q}
                className={quality === q ? 'is-on' : ''}
                onClick={() => {
                  if (quality === q) return;
                  useUI.getState().setQuality(q);
                  sfx('switch');
                }}
              >
                {q === 'high' ? 'High' : 'Light'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="os-set__group" aria-labelledby="set-progress">
        <h4 className="rule" id="set-progress">
          Progress
        </h4>
        <div className="os-set__row">
          <div>
            <b>
              <span className="t-heart">{points}</span> hearts · {tierFor(points).name}
            </b>
            <small aria-live="polite">
              {stickers}/{ACHIEVEMENTS.length} stickers collected{wiped ? ' · progress reset' : ''}
            </small>
          </div>
          {!confirm ? (
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => {
                sfx('click');
                setConfirm(true);
              }}
            >
              Reset progress…
            </button>
          ) : (
            <span className="os-set__confirm">
              <button
                className="btn btn--sm"
                onClick={() => {
                  sfx('back');
                  setConfirm(false);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn--sm btn--dark"
                onClick={() => {
                  game().reset();
                  sfx('error');
                  setConfirm(false);
                  setWiped(true);
                  useOS.getState().setTrashFull(true);
                }}
              >
                Wipe it
              </button>
            </span>
          )}
        </div>
        {confirm && (
          <p className="os-set__warn" role="alert">
            This wipes your hearts, stickers, stamps and House Rules on this device. No undo.
          </p>
        )}
      </section>

      <section className="os-set__group" ref={machineRef} aria-labelledby="set-machine">
        <h4 className="rule" id="set-machine">
          About this machine
        </h4>
        <MachineSpecs />
      </section>
    </div>
  );
}
