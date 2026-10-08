/**
 * The site's own weight and speed on a cheap phone, measured with scripts/measure-perf.mjs
 * (Chromium, throttled the way Lighthouse emulates a mid-range Android). Updated after each run.
 */
export const perf = {
  measuredOn: "8 October 2026",
  setup: "Chromium at 412 × 915, network throttled to 1.6 Mbps down with 150 ms latency, CPU slowed 4×",
  pages: [
    { page: "Home", js: "298 kB", lcp: "3.1 s", blocking: "0.98 s" },
    { page: "Tenderlens case", js: "309 kB", lcp: "2.2 s", blocking: "1.6 s" },
    { page: "Colophon", js: "301 kB", lcp: "1.2 s", blocking: "0.43 s" },
  ] as { page: string; js: string; lcp: string; blocking: string }[],
  /** What the numbers say, in one honest line. */
  note: "Two of three pages paint their main content under Google's 2.5-second 'good' line; the home page doesn't, and the case page keeps the main thread busy for 1.6 s drawing its coded phone screens. Next: render the phones as plain HTML until they scroll into view, and load the sky after the first paint.",
};
