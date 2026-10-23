/* ==========================================================================
   Admin login — a clear-acrylic access panel with chrome standoffs, an LCD
   readout and a keypad. Type with the keyboard (any password) or tap the
   keys (PIN-style).
   ========================================================================== */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adminLogin, apiMode, getContent } from '@/lib/api';
import { audio, sfx } from '@/audio/engine';
import { Icon } from '@/ui/Icon';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'ent'] as const;

export function Login({ onAuth, notice }: { onAuth: (a: { token: string; mode: 'remote' | 'local' }) => void; notice?: string }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'denied' | 'granted'>('idle');
  const [mode, setMode] = useState<'unknown' | 'remote' | 'local'>(apiMode());
  const [pressed, setPressed] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    getContent()
      .catch(() => {})
      .finally(() => setMode(apiMode()));
    inputRef.current?.focus();
  }, []);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!pw || state === 'busy') return;
    setState('busy');
    try {
      const a = await adminLogin(pw);
      setState('granted');
      sfx('success');
      setTimeout(() => onAuth(a), 450);
    } catch {
      setState('denied');
      sfx('error');
      const el = panelRef.current;
      if (el) {
        el.classList.remove('is-shake');
        void el.offsetWidth;
        el.classList.add('is-shake');
      }
      setTimeout(() => setState('idle'), 1600);
      setPw('');
      inputRef.current?.focus();
    }
  }

  function key(k: (typeof KEYS)[number]) {
    void audio.unlock();
    setPressed(k);
    setTimeout(() => setPressed(null), 120);
    if (k === 'clr') {
      sfx('back');
      setPw('');
    } else if (k === 'ent') {
      sfx('key', { pitch: 5 });
      void submit();
    } else {
      sfx('key', { pitch: Number(k) });
      setPw((p) => (p + k).slice(0, 64));
    }
    inputRef.current?.focus();
  }

  const lcd =
    state === 'denied' ? 'ACCESS DENIED' : state === 'granted' ? 'ACCESS GRANTED' : state === 'busy' ? 'CHECKING…' : pw ? (show ? pw : '•'.repeat(Math.min(pw.length, 16))) : 'ENTER CODE';

  return (
    <div className="adm-login">
      <form ref={panelRef} className="adm-login__panel surface" onSubmit={submit} aria-label="Admin sign in">
        <div className="screws">
          <i />
          <i />
          <i />
          <i />
        </div>
        <header className="adm-login__head">
          <div>
            <span className="t-label">
              <span className="nameplate">RM-99</span> Back office
            </span>
            <h1>Adelia’s Room</h1>
          </div>
          <span className={`adm-mode adm-mode--${mode}`}>
            <span className={`led ${mode === 'remote' ? 'led--green' : mode === 'local' ? '' : 'led--off'}`} />
            {mode === 'remote' ? 'Live API' : mode === 'local' ? 'Local demo' : 'Probing…'}
          </span>
        </header>

        <div className={`adm-login__lcd lcd adm-login__lcd--${state}`} aria-live="polite">
          <span className="t-label">Access code</span>
          <span className={`t-dot adm-login__readout ${pw && state === 'idle' && !show ? 'is-dots' : ''}`}>{lcd}</span>
          <span className={`led ${state === 'granted' ? 'led--green' : state === 'denied' ? '' : 'led--off'} ${state === 'denied' ? 'led--blink' : ''}`} />
        </div>

        <label className="field adm-login__field">
          <span>Password</span>
          <div className="adm-login__inputrow">
            <input
              ref={inputRef}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                if (state === 'denied') setState('idle');
              }}
              onKeyDown={() => void audio.unlock()}
              placeholder="Type or use the keypad"
              aria-invalid={state === 'denied'}
            />
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setShow((s) => !s)} aria-pressed={show}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <div className="adm-keypad" role="group" aria-label="Keypad">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className={`btn adm-key-btn ${k === 'ent' ? 'btn--primary' : k === 'clr' ? 'btn--dark' : ''} ${pressed === k ? 'is-pressed' : ''}`}
              onClick={() => key(k)}
              aria-label={k === 'clr' ? 'Clear' : k === 'ent' ? 'Enter' : k}
              disabled={state === 'busy'}
            >
              {k === 'ent' ? <Icon name="arrow-right" size={18} /> : k === 'clr' ? 'CLR' : <span className="t-dot">{k}</span>}
            </button>
          ))}
        </div>

        {state === 'denied' && (
          <p className="adm-login__err" role="alert">
            That code didn’t open anything. Try again.
          </p>
        )}
        {notice && state !== 'denied' && <p className="adm-login__note">{notice}</p>}

        <footer className="adm-login__foot t-label">
          {mode === 'local' ? 'API offline · data from this browser only' : 'Sign-ins last 12 hours'}
          <a href="/">← Back to the site</a>
        </footer>
      </form>
    </div>
  );
}
