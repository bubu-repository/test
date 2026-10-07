/*
 * Microphone input for Loud Type.
 * The stream goes into an AnalyserNode and nowhere else: nothing is recorded, stored or sent.
 */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class MicInput {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.freq = null;
    this.time = null;
    this.ranges = [];
    this.onended = null;
  }

  static isSupported() {
    return Boolean(
      typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        (window.AudioContext || window.webkitAudioContext),
    );
  }

  get running() {
    return Boolean(this.analyser);
  }

  /** Call from a click handler: the AudioContext is created inside the user gesture. */
  async start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    const resumed = ctx.state === "suspended" ? ctx.resume().catch(() => {}) : Promise.resolve();

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
    } catch (err) {
      if (this.ctx === ctx) this.ctx = null;
      if (ctx.state !== "closed") ctx.close().catch(() => {});
      throw err;
    }

    await resumed;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    if (this.ctx !== ctx) {
      // stop() ran while the permission prompt was open.
      stream.getTracks().forEach((t) => t.stop());
      throw Object.assign(new Error("Cancelled"), { name: "AbortError", cancelled: true });
    }

    this.stream = stream;
    this.source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.5;
    analyser.minDecibels = -100;
    analyser.maxDecibels = -25;
    this.source.connect(analyser); // never connected to the speakers
    this.analyser = analyser;
    this.freq = new Uint8Array(analyser.frequencyBinCount);
    this.time = new Float32Array(analyser.fftSize);

    stream.getAudioTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        if (this.stream === stream && typeof this.onended === "function") this.onended();
      });
    });
  }

  /** Splits 80 Hz to 6 kHz into n log-spaced bands, one per letter. */
  configure(n) {
    this.ranges = [];
    if (!this.analyser || n < 1) return;
    const bins = this.analyser.frequencyBinCount;
    const hzPerBin = this.ctx.sampleRate / 2 / bins;
    const fMin = 80;
    const fMax = Math.min(6000, (this.ctx.sampleRate / 2) * 0.9);
    for (let i = 0; i < n; i++) {
      const lo = fMin * Math.pow(fMax / fMin, i / n);
      const hi = fMin * Math.pow(fMax / fMin, (i + 1) / n);
      let a = Math.floor(lo / hzPerBin);
      let b = Math.ceil(hi / hzPerBin);
      if (b <= a) b = a + 1;
      a = Math.min(a, bins - 1);
      b = Math.min(Math.max(b, a + 1), bins);
      this.ranges.push([a, b]);
    }
  }

  /**
   * Fills `out` with one 0..1 value per band and returns the overall loudness 0..1.
   * `sensitivity` is 0..1: it lowers the noise floor and raises the gain.
   */
  read(out, sensitivity) {
    if (!this.analyser) {
      out.fill(0);
      return 0;
    }
    if (this.ranges.length !== out.length) this.configure(out.length);
    const freq = this.freq;
    this.analyser.getByteFrequencyData(freq);

    const n = out.length;
    const floor = 0.44 - 0.3 * sensitivity;
    const gain = 1.5 + 2.2 * sensitivity;
    for (let i = 0; i < n; i++) {
      const [a, b] = this.ranges[i];
      let sum = 0;
      let max = 0;
      for (let k = a; k < b; k++) {
        const v = freq[k] / 255;
        sum += v;
        if (v > max) max = v;
      }
      const avg = sum / (b - a);
      // A gentle tilt: high bands carry less energy in voices and hums.
      const tilt = n > 1 ? 0.1 * (i / (n - 1)) : 0;
      const raw = avg * 0.5 + max * 0.5 + tilt;
      out[i] = clamp01((raw - floor) * gain);
    }

    let rms = 0;
    const time = this.time;
    if (typeof this.analyser.getFloatTimeDomainData === "function") {
      this.analyser.getFloatTimeDomainData(time);
      for (let i = 0; i < time.length; i++) rms += time[i] * time[i];
    } else {
      const bytes = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(bytes);
      for (let i = 0; i < bytes.length; i++) {
        const s = (bytes[i] - 128) / 128;
        rms += s * s;
      }
    }
    rms = Math.sqrt(rms / time.length);
    const db = 20 * Math.log10(rms + 1e-8);
    const dbFloor = -62 - 20 * sensitivity;
    return clamp01((db - dbFloor) / 46);
  }

  stop() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
    }
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.ranges = [];
    this.#closeContext();
  }

  #closeContext() {
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx && ctx.state !== "closed") ctx.close().catch(() => {});
  }
}

/** A short, friendly sentence for a getUserMedia failure. */
export function micErrorMessage(err) {
  const name = (err && err.name) || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return "Microphone permission was denied. You can allow it in your browser's site settings.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return "No microphone was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return "The microphone is busy or unavailable right now.";
  }
  return "The microphone could not start.";
}
