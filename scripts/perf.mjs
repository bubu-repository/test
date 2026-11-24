#!/usr/bin/env node
/**
 * npm run perf: lab performance of the bento on a phone, with Playwright and the Chrome DevTools Protocol.
 *
 * Emulation: 390x844, DSF 3, touch, CPU 4x slower. Two passes, each a median of --runs (default 3) cold loads:
 *   cpu4x         CPU throttle only (localhost network)
 *   cpu4x+slow4g  plus Lighthouse's applied slow-4G profile (562.5 ms latency, 1474.6 kbps down, 675 kbps up)
 * Reports LCP (and its element), CLS (largest session window), FCP, time to interactive bento
 * (bento tiles on screen, then the first 500 ms window without long tasks), total blocking time to that
 * point, and bytes transferred (JS, CSS, fonts, images, total) with the JS files listed.
 * Targets (docs/research/trends.md §8.3): LCP <= 2.0 s, CLS <= 0.05, judged on the slow-4G pass.
 *
 * Flags: --no-build, --url <base>, --runs N, --path /room, --judge cpu4x
 */
import { loadPlaywright, server, fmtBytes } from './lib/serve.mjs';

const argv = process.argv.slice(2);
const opt = (name, def) => (argv.indexOf(name) > -1 ? argv[argv.indexOf(name) + 1] : def);
const RUNS = Number(opt('--runs', '3'));
const PATH = opt('--path', '/');
const JUDGE = opt('--judge', 'cpu4x+slow4g');
const TARGET = { lcp: 2000, cls: 0.05 };
const PASSES = [
  { name: 'cpu4x', net: null },
  { name: 'cpu4x+slow4g', net: { offline: false, latency: 562.5, downloadThroughput: (1474.56 * 1024) / 8, uploadThroughput: (675 * 1024) / 8 } },
];

const INIT = () => {
  const P = (window.__perf = { lcp: 0, lcpEl: '', lcpSize: 0, cls: 0, fcp: 0, longtasks: [], bentoAt: null });
  const po = (type, cb) => {
    try {
      new PerformanceObserver((l) => l.getEntries().forEach(cb)).observe({ type, buffered: true });
    } catch {}
  };
  po('largest-contentful-paint', (e) => {
    P.lcp = e.startTime;
    P.lcpSize = e.size;
    const el = e.element;
    if (el) {
      const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      P.lcpEl = `${el.tagName.toLowerCase()}${cls} "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
    } else P.lcpEl = e.url || '(unknown)';
  });
  let cur = 0, first = 0, last = 0;
  po('layout-shift', (e) => {
    if (e.hadRecentInput) return;
    if (cur && e.startTime - last < 1000 && e.startTime - first < 5000) cur += e.value;
    else {
      cur = e.value;
      first = e.startTime;
    }
    last = e.startTime;
    P.cls = Math.max(P.cls, cur);
  });
  po('longtask', (e) => P.longtasks.push([e.startTime, e.duration]));
  po('paint', (e) => e.name === 'first-contentful-paint' && (P.fcp = e.startTime));
  const look = () => {
    if (document.querySelector('.bento .tile')) requestAnimationFrame(() => (P.bentoAt = performance.now()));
    else requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
};

function tti(p) {
  if (p.bentoAt == null) return null;
  let t = p.bentoAt;
  for (const [s, d] of [...p.longtasks].sort((a, b) => a[0] - b[0])) {
    if (s + d <= t) continue;
    if (s - t >= 500) break;
    t = Math.max(t, s + d);
  }
  return t;
}
const tbt = (p, end) => p.longtasks.filter(([s]) => s >= p.fcp && s < (end ?? Infinity)).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
const median = (xs) => {
  const v = xs.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
};

const pw = loadPlaywright();
const srv = await server(argv);
console.log(`server: ${srv.url}  (${srv.build.note})  ·  path ${PATH}  ·  ${RUNS} runs per pass\n`);
const browser = await pw.chromium.launch();
const report = [];

for (const pass of PASSES) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript(INIT);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (pass.net) await cdp.send('Network.emulateNetworkConditions', pass.net);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const reqs = new Map();
    const bytes = { Script: 0, Stylesheet: 0, Font: 0, Image: 0, total: 0 };
    const jsFiles = [];
    cdp.on('Network.responseReceived', (e) => reqs.set(e.requestId, { type: e.type, url: e.response.url, status: e.response.status }));
    cdp.on('Network.loadingFinished', (e) => {
      const r = reqs.get(e.requestId);
      bytes.total += e.encodedDataLength;
      if (r && bytes[r.type] != null) bytes[r.type] += e.encodedDataLength;
      if (r?.type === 'Script') jsFiles.push([r.url.replace(srv.url, ''), e.encodedDataLength]);
    });
    const run = { errors: [] };
    page.on('pageerror', (e) => run.errors.push(String(e.message).slice(0, 120)));
    try {
      await page.goto(srv.url + PATH, { waitUntil: 'load', timeout: 90000 });
      // let the page go quiet: at least 5 s after start and 2 s after the last long task, max 25 s
      await page
        .waitForFunction(() => {
          const p = window.__perf;
          const lastLt = p.longtasks.reduce((a, [s, d]) => Math.max(a, s + d), 0);
          return performance.now() > 5000 && performance.now() - lastLt > 2000;
        }, null, { timeout: 25000, polling: 250 })
        .catch(() => run.errors.push('page never went quiet within 25 s'));
      const p = await page.evaluate(() => window.__perf);
      const t = tti(p);
      Object.assign(run, { lcp: p.lcp || null, lcpEl: p.lcpEl, cls: p.cls, fcp: p.fcp || null, tti: t, tbt: tbt(p, t), bento: p.bentoAt != null, bytes, jsFiles });
    } catch (e) {
      run.errors.push(String(e.message || e).split('\n')[0]);
    }
    runs.push(run);
    await ctx.close();
  }
  const ok = runs.filter((r) => r.lcp != null);
  const pick = ok.length ? ok.reduce((a, b) => (Math.abs(b.lcp - median(ok.map((r) => r.lcp))) < Math.abs(a.lcp - median(ok.map((r) => r.lcp))) ? b : a)) : runs[0];
  report.push({
    pass: pass.name,
    lcp: median(runs.map((r) => r.lcp)),
    lcpEl: pick?.lcpEl,
    cls: median(runs.map((r) => r.cls)),
    clsMax: Math.max(...runs.map((r) => r.cls ?? 0)),
    fcp: median(runs.map((r) => r.fcp)),
    tti: median(runs.map((r) => r.tti)),
    tbt: median(runs.map((r) => r.tbt)),
    bento: runs.every((r) => r.bento),
    bytes: pick?.bytes,
    jsFiles: pick?.jsFiles ?? [],
    errors: [...new Set(runs.flatMap((r) => r.errors))],
  });
}
await browser.close();
srv.stop();

const ms = (x) => (x == null ? 'n/a' : `${(x / 1000).toFixed(2)} s`);
let fail = false;
for (const r of report) {
  const judged = r.pass === JUDGE;
  const lcpOk = r.lcp != null && r.lcp <= TARGET.lcp;
  const clsOk = r.cls != null && r.cls <= TARGET.cls;
  if (judged && (!lcpOk || !clsOk)) fail = true;
  console.log(`${r.pass}${judged ? '  (judged)' : ''}`);
  console.log(`  LCP   ${ms(r.lcp).padEnd(8)} ${lcpOk ? 'ok' : 'OVER'} (target <= ${TARGET.lcp / 1000} s)  ·  element: ${r.lcpEl || 'n/a'}`);
  console.log(`  CLS   ${(r.cls ?? 0).toFixed(3).padEnd(8)} ${clsOk ? 'ok' : 'OVER'} (target <= ${TARGET.cls}; worst run ${r.clsMax.toFixed(3)})`);
  console.log(`  FCP   ${ms(r.fcp)}  ·  interactive bento ${ms(r.tti)}${r.bento ? '' : ' (no .bento .tile found)'}  ·  blocking ${Math.round(r.tbt ?? 0)} ms`);
  if (r.bytes) console.log(`  bytes JS ${fmtBytes(r.bytes.Script)} (${r.jsFiles.length} files) · CSS ${fmtBytes(r.bytes.Stylesheet)} · fonts ${fmtBytes(r.bytes.Font)} · images ${fmtBytes(r.bytes.Image)} · total ${fmtBytes(r.bytes.total)}`);
  for (const [u, b] of r.jsFiles.sort((a, b) => b[1] - a[1])) console.log(`        ${fmtBytes(b).padStart(9)}  ${u}`);
  for (const e of r.errors) console.log(`  note: ${e}`);
  console.log('');
}
if (srv.build.stale) console.log('perf: STALE BUILD, numbers describe the old dist/, not the current source');
console.log(fail ? `perf: FAIL (${JUDGE} misses a target)\n` : srv.build.stale ? 'perf: INCONCLUSIVE\n' : 'perf: PASS\n');
process.exit(fail || srv.build.stale ? 1 : 0);
