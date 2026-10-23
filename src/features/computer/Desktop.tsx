/* Adelia OS desktop: menu bar, wallpaper, icons, windows, dock. */
import { useEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react';
import { sfx } from '@/audio/engine';
import { audio } from '@/audio/engine';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { nextTier, tierFor } from '@/state/achievements';
import { COMPANY } from '@/lib/content';
import { formatTime, TZ } from '@/lib/weather';
import { Icon } from '@/ui/Icon';
import { os, useOS, type AppId } from './wm';
import { APPS, DESKTOP_APPS, DOCK_APPS } from './apps';
import { AppIcon, DropMark, HeartGlyph } from './icons';
import { Window } from './Window';
import { applyVolume, isTap, pingKey } from './util';

export default function Desktop({ onShutdown, firstBoot, initialApp }: { onShutdown: () => void; firstBoot: boolean; initialApp?: AppId }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const wins = useOS((s) => s.wins);
  const focused = useOS((s) => s.focused);
  const compact = useOS((s) => s.compact);
  const [sel, setSel] = useState<AppId | null>(null);

  // measure the usable desktop
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => os().setArea(el.clientWidth, el.clientHeight));
    ro.observe(el);
    os().setArea(el.clientWidth, el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // deep link (e.g. from the phone) or first ever boot: open the case files so the screen isn't empty
  useEffect(() => {
    const id = initialApp && APPS[initialApp] ? initialApp : firstBoot ? 'cases' : null;
    if (!id) return;
    const t = setTimeout(() => !os().wins.length && os().open(id), os().calm ? 120 : 650);
    return () => clearTimeout(t);
  }, [firstBoot, initialApp]);

  // keyboard: Cmd/Ctrl+W closes; Esc closes an open menu first
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const s = os();
      if (e.key === 'Escape' && s.menu) {
        e.stopPropagation();
        e.preventDefault();
        s.setMenu(null);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key.toLowerCase() === 'w' && s.focused) {
          e.preventDefault();
          s.close(s.focused);
        }
        return;
      }
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') pingKey();
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);

  // let the room's monitor overlay know what's on screen
  useEffect(() => {
    useUI.getState().setFlag('osApp', focused);
  }, [focused]);
  useEffect(() => () => useUI.getState().setFlag('osApp', null), []);

  const openApp = (id: AppId) => {
    setSel(id);
    os().open(id);
  };

  return (
    <div className={`os-desk ${compact ? 'is-compact' : ''}`}>
      <MenuBar onShutdown={onShutdown} />
      <div
        className="os-desk__area"
        ref={areaRef}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.os-wall')) {
            setSel(null);
            os().setMenu(null);
          }
        }}
      >
        <Wallpaper />
        <ul className="os-icons" aria-label="Desktop">
          {DESKTOP_APPS.map((a) => (
            <li key={a.id}>
              <DeskIcon id={a.id} label={a.label} selected={sel === a.id} onSelect={() => setSel(a.id)} onOpen={() => openApp(a.id)} />
            </li>
          ))}
        </ul>
        <div className="os-icons os-icons--trash">
          <DeskIcon id="trash" label="Trash" selected={sel === 'trash'} onSelect={() => setSel('trash')} onOpen={() => openApp('trash')} />
        </div>
        {wins.map((w) => (
          <Window key={w.id} win={w} active={focused === w.id} compact={compact} />
        ))}
      </div>
      <Dock />
    </div>
  );
}

/* ---------------------------------------------------------------- icon */
function DeskIcon({ id, label, selected, onSelect, onOpen }: { id: AppId; label: string; selected: boolean; onSelect: () => void; onOpen: () => void }) {
  const full = useOS((s) => s.trashFull);
  return (
    <button
      className={`os-icon ${selected ? 'is-on' : ''}`}
      aria-label={`${label}${id === 'trash' && full ? ', 1 item' : ''}. Double-click or press Enter to open`}
      onClick={(e) => {
        if (isTap(e.nativeEvent)) return onOpen();
        sfx('click');
        onSelect();
      }}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onFocus={onSelect}
      onPointerEnter={() => sfx('hover')}
    >
      <span className="os-icon__img">
        <AppIcon id={id} size={44} full={id !== 'trash' || full} />
      </span>
      <span className="os-icon__label">{label}</span>
    </button>
  );
}

/* ---------------------------------------------------------------- wallpaper */
function Wallpaper() {
  return (
    <div className="os-wall" aria-hidden>
      <div className="os-wall__plate">
        <span className="os-wall__mark">
          adelia
          <HeartGlyph size={22} />
        </span>
        <span className="os-wall__ruler ruler" />
        <p className="os-wall__eng">
          <span>Adelia OS 26.10</span>
          <span>AT-26</span>
          <span>{COMPANY.city}</span>
          <span>{COMPANY.cohort}</span>
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- menu bar */
function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });

function MenuBar({ onShutdown }: { onShutdown: () => void }) {
  const menu = useOS((s) => s.menu);
  const focused = useOS((s) => s.focused);
  const points = useGame((s) => s.points);
  const muted = useUI((s) => s.muted);
  const now = useNow();
  const barRef = useRef<HTMLDivElement>(null);
  const tier = tierFor(points);
  const nt = nextTier(points);

  // click outside closes menus
  useEffect(() => {
    if (!menu) return;
    const d = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) os().setMenu(null);
    };
    window.addEventListener('pointerdown', d, true);
    return () => window.removeEventListener('pointerdown', d, true);
  }, [menu]);

  // move focus into a menu when it opens (keyboard users)
  useEffect(() => {
    if (!menu) return;
    requestAnimationFrame(() => barRef.current?.querySelector<HTMLElement>('.os-menu__drop [role="menuitem"]')?.focus({ preventScroll: true }));
  }, [menu]);

  const toggle = (m: string) => {
    sfx('click');
    os().setMenu(menu === m ? null : m);
  };
  const item = (fn: () => void) => () => {
    sfx('click');
    os().setMenu(null);
    fn();
  };
  const menuKeys = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  const time = formatTime(TZ, now);
  return (
    <div className="os-bar" ref={barRef}>
      <div className="os-bar__l">
        <div className="os-menu">
          <button className={`os-bar__btn os-bar__logo ${menu === 'adelia' ? 'is-on' : ''}`} aria-haspopup="menu" aria-expanded={menu === 'adelia'} onClick={() => toggle('adelia')}>
            <DropMark size={16} />
            <b>Adelia</b>
          </button>
          {menu === 'adelia' && (
            <div className="os-menu__drop" role="menu" aria-label="Adelia menu" onKeyDown={menuKeys}>
              <button role="menuitem" onClick={item(() => os().open('about'))}>
                About this computer
              </button>
              <button role="menuitem" onClick={item(() => os().open('sysinfo'))}>
                About Adelia OS
              </button>
              <button role="menuitem" onClick={item(() => os().open('settings'))}>
                Settings…
              </button>
              <hr />
              <button role="menuitem" onClick={item(() => os().open('cases'))}>
                Case Files
              </button>
              <button role="menuitem" onClick={item(() => os().open('terminal'))}>
                Terminal <kbd>adelia@room</kbd>
              </button>
              <button role="menuitem" onClick={item(() => os().open('mail'))}>
                Write to Adelia
              </button>
              <hr />
              <button role="menuitem" className="is-danger" onClick={item(onShutdown)}>
                Shut down…
              </button>
            </div>
          )}
        </div>
        <span className="os-bar__app">{focused ? APPS[focused].label : 'Desktop'}</span>
      </div>
      <div className="os-bar__r">
        <button
          className="os-bar__btn os-bar__snd"
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          aria-pressed={!muted}
          onClick={() => {
            const m = !muted;
            useUI.getState().setMuted(m);
            audio.setMuted(m);
            if (!m) {
              applyVolume();
              sfx('click');
            }
          }}
        >
          <Icon name={muted ? 'mute' : 'sound'} size={15} />
        </button>
        <div className="os-menu">
          <button
            className={`os-bar__btn os-bar__hearts ${menu === 'hearts' ? 'is-on' : ''}`}
            aria-haspopup="menu"
            aria-expanded={menu === 'hearts'}
            aria-label={`${points} hearts, tier ${tier.name}`}
            onClick={() => toggle('hearts')}
          >
            <HeartGlyph size={12} />
            <span className="t-dot" key={points}>
              {String(points).padStart(4, '0')}
            </span>
          </button>
          {menu === 'hearts' && (
            <div className="os-menu__drop os-menu__drop--r os-hdrop" role="menu" aria-label="Hearts" onKeyDown={menuKeys}>
              <p className="t-label">Hearts</p>
              <p className="os-hdrop__big">
                <HeartGlyph size={22} />
                <span className="t-dot">{points}</span>
              </p>
              <p className="os-hdrop__tier">
                Tier <b>{tier.name}</b>
                {nt ? ` · ${nt.min - points} ♥ to ${nt.name}` : ' · top tier'}
              </p>
              <div className="os-hdrop__bar" role="progressbar" aria-label={`Progress to ${nt?.name ?? 'top tier'}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((nt ? (points - tier.min) / (nt.min - tier.min) : 1) * 100)}>
                <i style={{ transform: `scaleX(${nt ? (points - tier.min) / (nt.min - tier.min) : 1})` }} />
              </div>
              <hr />
              <button role="menuitem" onClick={item(() => useUI.getState().openPanel('achievements'))}>
                Open the sticker book ↗
              </button>
            </div>
          )}
        </div>
        <span className="os-bar__clock" aria-label={`${COMPANY.city} time ${time} WIB`}>
          <span className="os-bar__date">{WEEKDAY.format(now)}</span>
          <b>
            {time.slice(0, 2)}
            <i className={now.getSeconds() % 2 ? 'is-off' : ''}>:</i>
            {time.slice(3)}
          </b>
          <small>WIB</small>
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- dock */
function Dock() {
  const wins = useOS((s) => s.wins);
  const focused = useOS((s) => s.focused);
  const full = useOS((s) => s.trashFull);
  return (
    <nav className="os-dock" aria-label="Dock">
      <div className="os-dock__tray">
        {DOCK_APPS.map((a) => {
          const w = wins.find((x) => x.id === a.id && !x.closing);
          return (
            <span key={a.id} className={`os-dock__slot ${a.id === 'trash' ? 'is-trash' : ''}`}>
              <button
                className={`os-dock__btn ${w ? 'is-running' : ''} ${focused === a.id ? 'is-front' : ''}`}
                aria-label={`${a.label}${w ? ' (open)' : ''}`}
                data-label={a.label}
                onClick={() => {
                  sfx('key');
                  if (w && focused === a.id && !w.min) os().minimize(a.id);
                  else os().open(a.id);
                }}
                onPointerEnter={() => sfx('hover', { pitch: 3 })}
              >
                <AppIcon id={a.id} size={30} full={a.id !== 'trash' || full} />
              </button>
            </span>
          );
        })}
      </div>
    </nav>
  );
}
