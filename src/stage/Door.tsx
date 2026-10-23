/* ==========================================================================
   The opening: Adelia's door in a quiet, cool-white corridor.
   Knock (click) → the keypad takes the code (2026), the lock releases, the
   door swings in, the lights inside flicker on, and you walk into her room.
   Sign: raised chrome letters on the blank acrylic plate above the door,
   with a small engraved spec line. A label-maker strip by the keypad
   carries the code (her class year).
   ========================================================================== */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useUI } from '@/state/ui';
import { audio, sfx } from '@/audio/engine';
import { ambience } from '@/audio/ambience';
import { startWeather } from '@/lib/weather';
import { track } from '@/lib/api';
import { DOOR, PLATE, pickWidth } from './plate';
import { OVERSCAN } from './camera';
import { Icon } from '@/ui/Icon';
import './door.css';

type Step = 'idle' | 'unlock' | 'open' | 'lights' | 'walk' | 'done';

const DOORWAY = { cx: DOOR.leaf.x + DOOR.leaf.w / 2, cy: DOOR.leaf.y + DOOR.leaf.h / 2 };
// what of the room shows through the doorway: a floor-to-ceiling slice centred on the desk
const INSIDE = { cx: 3168, cy: PLATE.h / 2, w: Math.round((DOOR.leaf.w / DOOR.leaf.h) * PLATE.h * 1.04) };
const WALK_ZOOM = 4.4;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const KEYPAD_CODE = '2026';

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

export function Door() {
  const phase = useUI((s) => s.phase);
  const progress = useUI((s) => s.progress);
  const muted = useUI((s) => s.muted);
  const [step, setStep] = useState<Step>('idle');
  const [loaded, setLoaded] = useState(false);
  const [gone, setGone] = useState(false);
  const { w: vw, h: vh } = useViewport();
  const busy = useRef(false);

  useEffect(() => {
    startWeather();
    const img = new Image();
    img.src = DOOR.url(pickWidth(DOOR.widths, Math.max(vw, (vh * DOOR.w) / DOOR.h)));
    img.decode().catch(() => {}).then(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // room plate + door both ready → the door becomes clickable
  useEffect(() => {
    if (loaded && progress >= 1 && phase === 'loading') useUI.getState().setPhase('gate');
  }, [loaded, progress, phase]);

  // cover-fit the corridor image, centred on the door
  const base = useMemo(() => {
    const s = Math.max(vw / DOOR.w, vh / DOOR.h) * (vw < vh ? 1.05 : 1);
    let tx = vw / 2 - DOORWAY.cx * s;
    let ty = vh / 2 - (DOORWAY.cy - 40) * s;
    tx = Math.min(0, Math.max(vw - DOOR.w * s, tx));
    ty = Math.min(0, Math.max(vh - DOOR.h * s, ty));
    return { s, tx, ty };
  }, [vw, vh]);

  // where the stage camera should start so the hand-off from doorway to room is seamless
  useEffect(() => {
    const k = DOOR.leaf.w / INSIDE.w; // door px per plate px
    useUI.getState().setFlag('entryCam', { x: INSIDE.cx, y: INSIDE.cy, s: (base.s * WALK_ZOOM * k) / OVERSCAN });
  }, [base]);

  if (gone || (phase === 'room' && step === 'idle')) return null;

  const imgUrl = DOOR.url(pickWidth(DOOR.widths, DOOR.w * base.s));
  const insideScale = DOOR.leaf.w / INSIDE.w;

  const open = async () => {
    if (busy.current || useUI.getState().phase !== 'gate') return;
    busy.current = true;
    await audio.unlock();
    audio.setMuted(useUI.getState().muted);
    track('door_open', { muted: useUI.getState().muted });
    setStep('unlock');
    sfx('beep', { pitch: 0 });
    await wait(140);
    sfx('beep', { pitch: 7 });
    await wait(260);
    sfx('door-unlock');
    useUI.getState().setFlag('doorUnlocked', true);
    await wait(520);
    setStep('open');
    sfx('door-open');
    useUI.getState().setFlag('doorOpen', true);
    await wait(1250);
    setStep('lights');
    sfx('lights-on');
    useUI.getState().setFlag('lights', true);
    ambience.start();
    await wait(1250);
    setStep('walk');
    await wait(1350);
    useUI.getState().setPhase('entering');
    await wait(900);
    setStep('done');
    await wait(700);
    setGone(true);
  };

  const sceneStyle: CSSProperties = {
    width: DOOR.w,
    height: DOOR.h,
    transform:
      step === 'walk' || step === 'done'
        ? `translate3d(${vw / 2 - DOORWAY.cx * base.s * WALK_ZOOM}px, ${vh / 2 - DOORWAY.cy * base.s * WALK_ZOOM}px, 0) scale(${base.s * WALK_ZOOM})`
        : `translate3d(${base.tx}px, ${base.ty}px, 0) scale(${base.s})`,
  };
  const leaf = DOOR.leaf;
  const hole = `polygon(evenodd, 0 0, ${DOOR.w}px 0, ${DOOR.w}px ${DOOR.h}px, 0 ${DOOR.h}px, 0 0, ${leaf.x}px ${leaf.y}px, ${leaf.x + leaf.w}px ${leaf.y}px, ${leaf.x + leaf.w}px ${leaf.y + leaf.h}px, ${leaf.x}px ${leaf.y + leaf.h}px, ${leaf.x}px ${leaf.y}px)`;

  return (
    <div className={`door door--${step} ${loaded ? 'is-loaded' : ''} ${phase === 'gate' ? 'is-ready' : ''}`} aria-label="The door to Adelia’s room">
      <div className="door__scene" style={sceneStyle}>
        {/* the room, seen through the doorway */}
        <div className="door__inside" style={{ left: leaf.x - 60, top: leaf.y - 40, width: leaf.w + 120, height: leaf.h + 80 }}>
          <img
            src={PLATE.url(2560)}
            alt=""
            style={{
              width: PLATE.w * insideScale,
              height: PLATE.h * insideScale,
              left: 60 + leaf.w / 2 - INSIDE.cx * insideScale,
              top: 40 + leaf.h / 2 - INSIDE.cy * insideScale,
            }}
          />
          <div className="door__inside-dark" />
        </div>

        {/* corridor wall with the doorway cut out */}
        <div className="door__wall" style={{ backgroundImage: `url(${imgUrl})`, clipPath: hole }} />

        {/* the leaf */}
        <button
          className="door__leaf"
          style={{ left: leaf.x, top: leaf.y, width: leaf.w, height: leaf.h, backgroundImage: `url(${imgUrl})`, backgroundSize: `${DOOR.w}px ${DOOR.h}px`, backgroundPosition: `${-leaf.x}px ${-leaf.y}px` }}
          onClick={open}
          onPointerEnter={() => phase === 'gate' && sfx('hover')}
          aria-label="Knock and come in"
          disabled={phase !== 'gate'}
        >
          <span className="door__leaf-shade" />
          <span className="door__handle-glint" style={{ left: DOOR.handle.x - leaf.x - 6, top: DOOR.handle.y - leaf.y, height: DOOR.handle.h }} />
        </button>

        {/* sign: chrome letters on the acrylic plate (between its two screws) */}
        <div className="door__sign" style={{ left: DOOR.sign.x, top: DOOR.sign.y, width: DOOR.sign.w, height: DOOR.sign.h }} role="img" aria-label="Adelia’s Room">
          <span className="door__sign-name" aria-hidden>
            Adelia’s Room
          </span>
          <span className="door__sign-spec" aria-hidden>
            RM-00 · Bekasi
          </span>
        </div>
        <i className="door__led" style={{ left: DOOR.led.x - 9, top: DOOR.led.y - 9 }} />
        <button className="door__keypad" style={{ left: DOOR.keypad.x, top: DOOR.keypad.y, width: DOOR.keypad.w, height: DOOR.keypad.h }} onClick={open} aria-label={`Key in the code ${KEYPAD_CODE}`} disabled={phase !== 'gate'} />
        {/* the code, on a label-maker strip beside the keypad (her class year) */}
        <div className="door__note" style={{ left: DOOR.keypad.x + DOOR.keypad.w + 40, top: DOOR.keypad.y + 18 }} aria-hidden>
          <small>Code</small>
          <b>{KEYPAD_CODE}</b>
        </div>
      </div>

      <div className="door__ui">
        {phase === 'loading' ? (
          <div className="door__loading" role="status" aria-label={`Loading Adelia’s Room, ${Math.round(progress * 100)}%`}>
            <span className="t-label">Adelia’s Room · Bekasi</span>
            <i>
              <b style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
            </i>
            <span className="t-spec">{Math.round(progress * 100)}%</span>
          </div>
        ) : step === 'idle' ? (
          <div className="door__hint">
            <span className="door__hint-text">
              <i className="led led--blink" aria-hidden />
              <span>
                <b>Knock to come in.</b> The code is <span className="door__code">{KEYPAD_CODE}</span>
              </span>
            </span>
            <button
              className="door__sound"
              aria-pressed={!muted}
              onClick={() => {
                const m = !useUI.getState().muted;
                useUI.getState().setMuted(m);
              }}
            >
              <Icon name={muted ? 'mute' : 'sound'} size={15} /> Sound {muted ? 'off' : 'on'}
            </button>
          </div>
        ) : step === 'unlock' || step === 'open' ? (
          <div className="door__hint door__hint--ok" role="status">
            <span className="door__hint-text">
              <i className="led led--green" aria-hidden />
              <span>
                <span className="door__code">{KEYPAD_CODE}</span> accepted. Come in.
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
