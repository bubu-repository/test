/* ==========================================================================
   Voicemail playback: Web Speech API (one utterance per sentence) with
   captions kept in sync via boundary events, and a timed fallback so the
   captions always play — even without speechSynthesis, voices or sound.
   ========================================================================== */

export interface Line {
  /** caption text */
  cap: string;
  /** what the voice says (defaults to cap) */
  say?: string;
}

export interface Playback {
  cancel: () => void;
}

interface Callbacks {
  onLine: (i: number) => void;
  onProgress: (i: number, chars: number) => void;
  onDone: () => void;
}

const CPS = 15.5; // caption chars/second ≈ English at rate 1
const GAP = 380; // ms between sentences

export const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

let cachedVoice: SpeechSynthesisVoice | null | undefined;

/** warm the voice list (Chrome loads it asynchronously) */
export function primeVoices() {
  const s = synth();
  if (!s) return;
  s.getVoices();
  s.addEventListener?.('voiceschanged', () => (cachedVoice = undefined), { once: true });
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const s = synth();
  const vs = s ? s.getVoices() : [];
  const en = vs.filter((v) => /^en([-_]|$)/i.test(v.lang));
  const prefer = ['Google UK English Female', 'Samantha', 'Serena', 'Karen', 'Moira', 'Microsoft Sonia', 'Microsoft Libby', 'Microsoft Aria', 'Microsoft Jenny', 'Google US English', 'Daniel'];
  let v: SpeechSynthesisVoice | null = null;
  for (const p of prefer) {
    v = en.find((x) => x.name.includes(p)) ?? null;
    if (v) break;
  }
  cachedVoice = v ?? en.find((x) => /GB|US|AU/i.test(x.lang)) ?? en[0] ?? null;
  return cachedVoice;
}

export function play(lines: Line[], cb: Callbacks, withVoice: boolean): Playback {
  const s = synth();
  let voice = withVoice && !!s;
  let cancelled = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!cancelled) fn();
    }, ms);
    timers.add(t);
    return t;
  };
  if (s) s.cancel();

  const runLine = (i: number) => {
    if (cancelled) return;
    if (i >= lines.length) {
      cb.onDone();
      return;
    }
    const line = lines[i];
    const len = line.cap.length;
    cb.onLine(i);
    let finished = false;
    let started = false;
    let boundary = -1;
    const t0 = performance.now();

    const next = () => {
      if (finished || cancelled) return;
      finished = true;
      clearInterval(ticker);
      cb.onProgress(i, len);
      later(() => runLine(i + 1), GAP);
    };

    // time-based caption typing (also drives the voice-less mode)
    const ticker = setInterval(() => {
      if (cancelled || finished) return clearInterval(ticker);
      const el = (performance.now() - t0) / 1000;
      const timed = Math.floor(el * CPS);
      if (!voice) {
        cb.onProgress(i, Math.min(len, timed));
        if (timed >= len) next();
      } else if (started) {
        // follow word boundaries when the engine reports them, else estimate (never finish early)
        const est = boundary >= 0 ? Math.max(boundary, Math.min(timed, boundary + 12)) : timed;
        cb.onProgress(i, Math.min(len - 1, est));
      }
    }, 40);
    timers.add(ticker as unknown as ReturnType<typeof setTimeout>);

    if (!voice || !s) return;

    const u = new SpeechSynthesisUtterance(line.say ?? line.cap);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'en-GB';
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    u.onstart = () => (started = true);
    u.onboundary = (e) => {
      // map spoken-text index to caption index proportionally (say ≠ cap for some lines)
      const sayLen = (line.say ?? line.cap).length || 1;
      boundary = Math.round(((e.charIndex + (e.charLength || 0)) / sayLen) * len);
    };
    u.onend = () => next();
    u.onerror = () => {
      // fall back to captions only for the rest of the call
      voice = false;
      if (!finished) cb.onProgress(i, 0);
    };
    s.speak(u);

    // watchdogs: speech that never starts, or an `end` that never fires
    later(() => {
      if (!started && !finished) {
        voice = false;
        s.cancel();
      }
    }, 1600);
    later(() => next(), 2500 + (len / 9) * 1000);
  };

  runLine(0);

  return {
    cancel: () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
      timers.forEach((t) => clearInterval(t as unknown as ReturnType<typeof setInterval>));
      timers.clear();
      if (s && withVoice) s.cancel();
    },
  };
}
