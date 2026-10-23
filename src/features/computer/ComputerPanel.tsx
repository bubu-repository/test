/* ==========================================================================
   RM-07 · Adelia OS — the pink computer on her desk. Boots (Adelia BIOS),
   runs a small clear-tech desktop OS (Case Files, Mail, Terminal, her model
   card, the Archive, Links, Settings, Trash) and shuts down. Drives the
   room's monitor overlay through ui.flags: computerOn, computerScreen,
   osApp, osKey.
   props (openPanel('computer', { app })): open that app right after boot
   ('cases' | 'mail' | 'terminal' | 'about' | 'archive' | 'links' | …).
   ========================================================================== */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { useUI } from '@/state/ui';
import { game } from '@/state/game';
import { sfx } from '@/audio/engine';
import { back } from '@/stage/director';
import { STATIONS } from '@/stage/stations';
import Boot from './Boot';
import Desktop from './Desktop';
import { appId, useOS } from './wm';
import { powerDown } from './util';
import './os.css';

type Screen = 'boot' | 'desktop' | 'off';
const BOOT_KEY = 'adelia.os.boots';
let sessionBoots = 0;

function bootCount() {
  try {
    return sessionBoots + Number(localStorage.getItem(BOOT_KEY) || 0);
  } catch {
    return sessionBoots;
  }
}

export default function ComputerPanel({ app }: { app?: string }) {
  const [screen, setScreen] = useState<Screen>('boot');
  const [fast] = useState(() => bootCount() > 0);
  const calm = useOS((s) => s.calm);
  const chimed = useRef(false);
  const screenRef = useRef<Screen>('boot');
  screenRef.current = screen;
  const initialApp = appId(app) ?? undefined;

  useEffect(() => {
    const ui = useUI.getState();
    ui.setFlag('computerOn', true);
    ui.setFlag('computerScreen', 'boot');
    useOS.getState().reset();
    if (!chimed.current) {
      chimed.current = true;
      sfx('boot');
    }
    return () => {
      const u = useUI.getState();
      u.setFlag('computerScreen', 'idle');
      u.setFlag('computerOn', false);
      useOS.getState().reset();
    };
  }, []);

  const booted = useCallback(() => {
    if (screenRef.current !== 'boot') return;
    sessionBoots++;
    try {
      localStorage.setItem(BOOT_KEY, String(Number(localStorage.getItem(BOOT_KEY) || 0) + 1));
    } catch {}
    setScreen('desktop');
    useUI.getState().setFlag('computerScreen', 'desktop');
    sfx('open', { pitch: -5 });
    game().unlock('power-user');
  }, []);

  const shutdown = useCallback(() => {
    if (screenRef.current === 'off') return;
    setScreen('off');
    useOS.getState().setMenu(null);
    powerDown();
    const ui = useUI.getState();
    ui.setFlag('computerScreen', 'off');
    ui.setFlag('computerOn', false);
    setTimeout(() => back(), useOS.getState().calm ? 200 : 780);
  }, []);

  return (
    <Stage
      code={STATIONS.computer.code}
      title="Adelia OS"
      kicker="AT-26 · Workstation"
      dark
      bleed
      className="os-panel"
      actions={
        <>
          <span className={`os-status t-label ${screen === 'off' ? 'is-off' : ''}`}>
            <i className={`led ${screen === 'off' ? 'led--off' : screen === 'boot' ? 'led--blue led--blink' : 'led--blue'}`} />
            {screen === 'boot' ? 'Booting' : screen === 'off' ? 'Off' : 'On'}
          </span>
          <button className="btn btn--sm btn--icon btn--dark os-power" aria-label="Shut down Adelia OS" title="Shut down" onClick={shutdown}>
            <Icon name="power" size={16} />
          </button>
        </>
      }
    >
      <div className="os-monitor">
        <span className="screws" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        <div className={`os-screen is-${screen} ${calm ? 'is-calm' : ''}`}>
          <div className="os-screen__inner">
            {screen === 'boot' ? <Boot fast={fast || calm} onDone={booted} /> : <Desktop onShutdown={shutdown} firstBoot={!fast} initialApp={initialApp} />}
          </div>
          <div className="os-screen__glass" aria-hidden />
        </div>
        <div className="os-chin" aria-hidden>
          <span className="t-spec">Adelia · AT-26</span>
          <span className="os-chin__slot">
            <i />
          </span>
          <span className="os-chin__led">
            <span className="t-spec">Rev 26.10</span>
            <i className={`led ${screen === 'off' ? 'led--off' : ''}`} />
          </span>
        </div>
      </div>
    </Stage>
  );
}
