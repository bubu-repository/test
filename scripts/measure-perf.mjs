/**
 * The site's weight and speed on a cheap phone: each page loaded in Chromium with the network and
 * CPU throttled the way Lighthouse emulates a mid-range Android. Prints the numbers that go into
 * src/content/perf.ts. Needs Playwright (npm i -D playwright) and a running production build:
 *   node scripts/measure-perf.mjs http://localhost:3000
 */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const PAGES = ["/", "/work/tenderlens", "/colophon"];
const RUNS = 3;

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const path of PAGES) {
  const samples = [];
  for (let run = 0; run < RUNS; run++) {
    const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      window.__lcp = 0;
      window.__blocking = 0;
      new PerformanceObserver((list) => list.getEntries().forEach((e) => (window.__lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => list.getEntries().forEach((e) => (window.__blocking += Math.max(0, e.duration - 50)))).observe({ type: "longtask", buffered: true });
    });
    await page.goto(base + path, { waitUntil: "load", timeout: 120_000 });
    await page.waitForTimeout(4000);
    const { lcp, blocking, js } = await page.evaluate(() => ({
      lcp: window.__lcp,
      blocking: window.__blocking,
      // Bytes over the wire for scripts, compressed, as a phone would download them.
      js: performance
        .getEntriesByType("resource")
        .filter((r) => r.initiatorType === "script")
        .reduce((sum, r) => sum + r.transferSize, 0),
    }));
    samples.push({ js, lcp, blocking });
    await context.close();
  }
  const median = (k) => samples.map((s) => s[k]).sort((a, b) => a - b)[Math.floor(RUNS / 2)];
  console.log(`${path}\tJS ${(median("js") / 1024).toFixed(0)} kB (compressed)\tLCP ${(median("lcp") / 1000).toFixed(1)} s\tblocking ${Math.round(median("blocking"))} ms`);
}
await browser.close();
