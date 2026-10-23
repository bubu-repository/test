/* ==========================================================================
   The gacha machine (RM-02) — Tenderlens, module by module, in 3D.
   HTML chrome around the R3F canvas (the room's only 3D object): a status
   LCD, the module list + captions, crank / unfold / put-back controls, a
   loader, and a still-photo fallback when WebGL is not available.
   ========================================================================== */
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { useUI } from '@/state/ui';
import { game } from '@/state/game';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { focus as walkTo } from '@/stage/director';
import { MODULES, MODULE_MAP, VAULT_PRODUCT as PRODUCT, useVault, type VaultStatus } from './vaultData';
import './vault.css';

/** three.js + R3F load only when the machine is actually rendered */
const Vault3D = lazy(() => import('./Vault3D'));

const STATUS_LABEL: Record<VaultStatus, string> = {
  locked: 'READY',
  unlocking: 'TURNING',
  open: 'CAPSULE',
  exploded: 'UNFOLDED',
  closing: 'CLOSING',
};

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Canvas textures use Doto / JetBrains Mono: load them before the scene mounts. */
function useFontsReady() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setOk(true);
    };
    const t = setTimeout(finish, 2500);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) finish();
    else Promise.all(['800 32px Doto', '700 14px "JetBrains Mono"', '500 14px "JetBrains Mono"'].map((f) => fonts.load(f))).then(finish, finish);
    return () => clearTimeout(t);
  }, []);
  return ok;
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: () => void }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

/** A crank: a round boss with a bar and a knob. */
function CrankGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="14" r="6" />
      <path d="M9 14l8-6" />
      <circle cx="18.5" cy="7" r="2.2" />
      <path d="M3.2 9.2A7.5 7.5 0 0 1 6 5.6" />
    </svg>
  );
}

function RecenterGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      <path d="M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

function Fallback() {
  return (
    <div className="vt-fallback">
      <img src="/assets/room/cut/gacha.webp" alt="Her pink gacha machine: a clear acrylic dome full of pastel capsules, with a chrome crank" />
      <p className="t-label">3D isn’t available on this device. The five modules are listed here.</p>
    </div>
  );
}

export default function VaultPanel() {
  const quality = useUI((s) => s.quality);
  const status = useVault((s) => s.status);
  const active = useVault((s) => s.active);
  const hover = useVault((s) => s.hover);
  const ready = useVault((s) => s.ready);
  const exploded = useVault((s) => s.exploded);
  const unlocked = useVault((s) => s.unlocked);
  const fonts = useFontsReady();
  const [failed, setFailed] = useState(() => !hasWebGL());

  useEffect(() => {
    useVault.getState().reset();
    game().updateStats((s) => ({ productsViewed: [...new Set([...s.productsViewed, PRODUCT.id])] }));
    track('vault', { action: 'open' });
    if (import.meta.env.DEV || /[?&]qa\b/.test(location.search)) (window as unknown as { __vault: typeof useVault }).__vault = useVault;
    return () => {
      useVault.getState().reset();
      const ui = useUI.getState();
      ui.setFlag('vaultOpen', false);
      ui.setFlag('vaultModule', null);
    };
  }, []);

  // keyboard: C (or K) = crank, E = unfold, ←/→ = modules
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable]')) return;
      const v = useVault.getState();
      const k = e.key.toLowerCase();
      if (k === 'c' || k === 'k') v.turnKey();
      else if (k === 'e') v.toggleExploded();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const i = v.active ? MODULES.findIndex((m) => m.id === v.active) : -1;
        const n = MODULES.length;
        const next = e.key === 'ArrowRight' ? (i + 1) % n : (i - 1 + n) % n;
        v.select(MODULES[next].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const v = useVault.getState;
  const readCase = () => {
    track('cta', { from: 'vault', to: 'gallery', work: PRODUCT.work });
    walkTo('gallery', { work: PRODUCT.work });
  };
  const book = () => {
    sfx('click');
    track('cta', { from: 'vault', to: 'rsvp' });
    useUI.getState().openPanel('rsvp', { tab: 'session', interest: 'tenderlens' });
  };
  const toolkit = () => {
    sfx('back');
    useUI.getState().openPanel('products', {});
  };
  const m = active ? MODULE_MAP[active] : null;
  const locked = status === 'locked' && !unlocked;

  return (
    <Stage
      code="RM-02"
      title="The gacha machine"
      kicker={PRODUCT.family}
      bleed
      className="vt-stage"
      actions={
        <button className="btn btn--sm vt-only-wide" onClick={toolkit}>
          <Icon name="box" size={15} /> The toolkit
        </button>
      }
    >
      <div className="vt">
        <div className={`vt-view ${hover ? 'is-hover' : ''}`}>
          {failed ? (
            <Fallback />
          ) : (
            fonts && (
              <Boundary fallback={<Fallback />} onError={() => setFailed(true)}>
                <Suspense fallback={null}>
                  <Vault3D quality={quality} onError={() => setFailed(true)} />
                </Suspense>
              </Boundary>
            )
          )}

          <div className={`vt-loader ${ready || failed ? 'is-done' : ''}`} aria-hidden={ready || failed}>
            <div className="vt-loader__mark t-dot">{PRODUCT.model}</div>
            <div className="vt-loader__bar">
              <i />
            </div>
            <span className="t-label">{PRODUCT.copy.loader}</span>
          </div>

          <div className="vt-hud">
            <div className="vt-status readout" role="status" aria-label={`Machine: ${STATUS_LABEL[status].toLowerCase()}`}>
              <span className={`led ${status === 'locked' ? 'led--blink' : 'led--blue'}`} />
              <span>{STATUS_LABEL[status]}</span>
            </div>
            <span className="t-spec vt-hud__model">
              {PRODUCT.name} · {PRODUCT.model}
            </span>
          </div>

          {!failed && (
            <div className="vt-bar">
              {locked ? (
                <button
                  className="btn btn--primary vt-turn"
                  onClick={() => v().turnKey()}
                  onMouseEnter={() => {
                    sfx('hover');
                    v().setHover('key');
                  }}
                  onMouseLeave={() => v().hover === 'key' && v().setHover(null)}
                >
                  <CrankGlyph /> Turn the crank
                </button>
              ) : (
                <>
                  <button className={`btn btn--sm vt-toggle ${exploded ? 'is-on' : ''}`} aria-pressed={exploded} onClick={() => v().toggleExploded()}>
                    <span className={`led ${exploded ? 'led--blue' : 'led--off'}`} /> Unfold
                  </button>
                  <button className="btn btn--sm" onClick={() => v().closeVault()}>
                    <Icon name="close" size={14} /> Put it back
                  </button>
                </>
              )}
              <button className="btn btn--sm btn--icon" onClick={() => v().resetView()} aria-label="Reset view" title="Reset view">
                <RecenterGlyph />
              </button>
            </div>
          )}
          {!failed && (
            <div className="vt-hint t-spec" aria-hidden>
              Drag to rotate · Scroll or pinch to zoom<span className="vt-only-wide"> · C crank · E unfold · ←/→ modules</span>
            </div>
          )}
        </div>

        <aside className="vt-side scroll">
          <div className="vt-side__head">
            <span className="t-label">Inside the capsule</span>
            <span className="t-spec">{MODULES.length} modules</span>
          </div>
          <ol className="vt-list">
            {MODULES.map((mod) => (
              <li key={mod.id}>
                <button
                  className={`vt-mod ${active === mod.id ? 'is-active' : ''} ${hover === mod.id ? 'is-hover' : ''} ${mod.id === 'launch' ? 'vt-mod--slot' : ''}`}
                  aria-pressed={active === mod.id}
                  onClick={() => v().select(active === mod.id ? null : mod.id)}
                  onMouseEnter={() => {
                    sfx('hover');
                    v().setHover(mod.id);
                  }}
                  onMouseLeave={() => v().hover === mod.id && v().setHover(null)}
                >
                  <span className="vt-mod__code t-dot">{mod.code}</span>
                  <span className="vt-mod__txt">
                    <b>{mod.name}</b>
                    <small>{mod.spec}</small>
                  </span>
                  <span className={`led ${active === mod.id ? 'led--blue' : 'led--off'}`} />
                </button>
              </li>
            ))}
          </ol>

          <div className="vt-caption lcd" key={active ?? (locked ? 'locked' : 'open')} aria-live="polite">
            {m ? (
              <>
                <span className="t-label">
                  <b className="vt-caption__code">{m.code}</b> · {m.part}
                </span>
                <p>{m.caption}</p>
                <span className="t-spec vt-caption__spec">{m.spec}</span>
              </>
            ) : locked ? (
              <>
                <span className="t-label">
                  <b className="vt-caption__code">{PRODUCT.model}</b> · {PRODUCT.name}
                </span>
                <p className="vt-caption__tag">{PRODUCT.tagline}</p>
                <span className="t-spec vt-caption__spec">{PRODUCT.copy.locked}</span>
              </>
            ) : (
              <>
                <span className="t-label">
                  <b className="vt-caption__code">{PRODUCT.model}</b> · {status === 'exploded' ? 'Unfolded' : STATUS_LABEL[status].toLowerCase()}
                </span>
                <p>{PRODUCT.copy.open}</p>
                <dl className="vt-caption__specs">
                  {PRODUCT.specs.map((s) => (
                    <div key={s.k}>
                      <dt className="t-spec">{s.k}</dt>
                      <dd className="t-dot">{s.v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>

          <div className="vt-side__foot">
            <button className="btn btn--primary btn--block" onClick={readCase}>
              {PRODUCT.copy.cta} <Icon name="arrow-right" size={15} />
            </button>
            <div className="vt-side__row">
              <button className="btn btn--sm btn--block" onClick={book}>
                Book a chat
              </button>
              <button className="btn btn--sm btn--block vt-only-narrow" onClick={toolkit}>
                <Icon name="box" size={15} /> The toolkit
              </button>
            </div>
          </div>
        </aside>
      </div>
    </Stage>
  );
}
