#!/usr/bin/env node
/**
 * npm run shots: build, start `vite preview` on a free port, capture the bento, the room and three
 * deep links with Playwright, then audit every capture.
 *
 *   Delivery set (deviceScaleFactor 2, JPEG q 82) -> docs/screenshots/
 *     landing-mobile, landing-desktop, room-mobile, room-desktop, phone-mobile, phone-desktop,
 *     run-mobile, run-desktop
 *   Audit-only captures (360x740, the today panel)  -> scripts/.out/shots/
 *
 * Per capture: violet pixels (hue 250-310, saturation > 0.4) must stay <= 0.5 % (fails the run),
 * orange share (Contact should be the only orange), console errors, page errors, failed requests and
 * HTTP errors (404s), broken images, horizontal overflow, and for the bento the 5-second read: which of
 * ID, the 3 projects, skills and Contact are fully above the fold (740 px, and 640 px with browser bars).
 *
 * Flags: --no-build (use dist/), --url <base> (use a running server), --only <id,id>,
 *        --allow-stale (write the delivery set even when the build failed and dist/ is old).
 * Missing parts of the site are reported, never fatal.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, OUT, ensureDir, loadPlaywright, server, settle, watch, brokenImages } from './lib/serve.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.indexOf('--only') > -1 ? argv[argv.indexOf('--only') + 1].split(',') : null;
const DELIVERY = join(ROOT, 'docs', 'screenshots');
const AUDIT = ensureDir(join(OUT, 'shots'));

const VP = {
  m360: { width: 360, height: 740, mobile: true },
  m390: { width: 390, height: 844, mobile: true },
  d1440: { width: 1440, height: 900, mobile: false },
};
const SHOTS = [
  { id: 'landing-360', path: '/', vp: 'm360' },
  { id: 'landing-mobile', path: '/', vp: 'm390', delivery: true },
  { id: 'landing-desktop', path: '/', vp: 'd1440', delivery: true },
  { id: 'room-360', path: '/room', vp: 'm360' },
  { id: 'room-mobile', path: '/room', vp: 'm390', delivery: true },
  { id: 'room-desktop', path: '/room', vp: 'd1440', delivery: true },
  { id: 'phone-mobile', path: '/room?open=phone', vp: 'm390', delivery: true },
  { id: 'phone-desktop', path: '/room?open=phone', vp: 'd1440', delivery: true },
  { id: 'run-mobile', path: '/room?open=run:p1', vp: 'm390', delivery: true },
  { id: 'run-desktop', path: '/room?open=run:p1', vp: 'd1440', delivery: true },
  { id: 'panel-today-mobile', path: '/room?open=panel:today', vp: 'm390' },
  { id: 'panel-today-desktop', path: '/room?open=panel:today', vp: 'd1440' },
].filter((s) => !onlyArg || onlyArg.includes(s.id));

const VIOLET_MAX = 0.5; // % of pixels

/** Pixel audit in the browser (no image library needed): violet share and orange share, in %. */
async function pixelAudit(page, buf) {
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64;
    await img.decode();
    const k = Math.min(1, 1440 / img.width);
    const w = Math.round(img.width * k);
    const h = Math.round(img.height * k);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    let violet = 0;
    let orange = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), del = mx - mn;
      if (!del || mx < 0.12) continue; // grey, or near-black JPEG noise
      const s = del / mx;
      let hue = mx === r ? ((g - b) / del) % 6 : mx === g ? (b - r) / del + 2 : (r - g) / del + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
      if (hue >= 250 && hue <= 310 && s > 0.4) violet++;
      if (hue >= 12 && hue <= 45 && s > 0.5 && mx > 0.6) orange++;
    }
    const n = w * h;
    return { violet: (violet / n) * 100, orange: (orange / n) * 100 };
  }, buf.toString('base64'));
}

/** The 5-second read on the bento: is each essential fully on screen without scrolling? */
function foldCheck(page) {
  return page
    .evaluate(() => {
      const vh = innerHeight;
      const box = (el) => (el ? el.getBoundingClientRect() : null);
      const item = (name, el) => {
        const r = box(el);
        if (!r || (!r.width && !r.height)) return { name, found: false };
        return { name, found: true, top: Math.round(r.top), bottom: Math.round(r.bottom), full: r.top >= 0 && r.bottom <= vh, full640: r.top >= 0 && r.bottom <= 640 };
      };
      const projects = [...document.querySelectorAll('.tile-project')];
      const contact =
        document.querySelector('.hdr-contact, [data-contact]') ??
        [...document.querySelectorAll('a, button')].find((e) => /^mailto:/.test(e.getAttribute('href') || '') || /\b(contact|email)\b/i.test(e.textContent || e.getAttribute('aria-label') || ''));
      return [
        item('ID tile', document.querySelector('.tile-id')),
        item('Project 1', projects[0]),
        item('Project 2', projects[1]),
        item('Project 3', projects[2]),
        item('Skills', document.querySelector('.tile-skills')),
        item('Contact', contact),
      ];
    })
    .catch(() => []);
}

const pw = loadPlaywright();
const srv = await server(argv);
console.log(`server: ${srv.url}  (${srv.build.note})`);
// Never overwrite the delivery set with pictures of a stale build.
const STALE = !!srv.build.stale && !argv.includes('--allow-stale');
if (STALE) console.log('stale build: every capture goes to scripts/.out/shots/, docs/screenshots/ is left alone (--allow-stale to override)');
const browser = await pw.chromium.launch();
const auditCtx = await browser.newContext();
const auditPage = await auditCtx.newPage();
await auditPage.setContent('<!doctype html><title>audit</title>');

const results = [];
for (const s of SHOTS) {
  const vp = VP[s.vp];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, isMobile: vp.mobile, hasTouch: vp.mobile });
  const page = await ctx.newPage();
  const issues = watch(page);
  const res = { id: s.id, vp: `${vp.width}x${vp.height}`, notes: [] };
  try {
    await page.goto(srv.url + s.path, { waitUntil: 'load', timeout: 30000 });
    if (s.path.startsWith('/room')) {
      const ok = await page.waitForSelector('.room', { state: 'attached', timeout: 8000 }).then(() => true, () => false);
      if (!ok) res.notes.push('no .room element after 8 s');
      else {
        const empty = await page.evaluate(() => (document.querySelector('.room')?.querySelectorAll('*').length ?? 0) < 6).catch(() => false);
        if (empty) res.notes.push('.room is nearly empty (still a stub?)');
      }
    }
    if (s.path.includes('open=')) await page.waitForTimeout(1200);
    await settle(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth).catch(() => 0);
    if (overflow > 1) res.notes.push(`horizontal overflow ${overflow}px`);
    if (s.path === '/') res.fold = await foldCheck(page);
    const buf = await page.screenshot({ type: 'jpeg', quality: 82 });
    const file = join(s.delivery && !STALE ? ensureDir(DELIVERY) : AUDIT, `${s.id}.jpg`);
    writeFileSync(file, buf);
    res.file = file.replace(ROOT, '');
    res.kb = Math.round(buf.length / 1024);
    res.pixels = await pixelAudit(auditPage, buf);
    res.broken = await brokenImages(page);
  } catch (e) {
    res.error = String(e.message || e).split('\n')[0];
  }
  res.issues = issues;
  results.push(res);
  await ctx.close();
}
await browser.close();
srv.stop();

// ---------------------------------------------------------------------------------------------
let fail = false;
console.log('\ncaptures');
for (const r of results) {
  if (r.error) {
    console.log(`  x ${r.id.padEnd(20)} ${r.vp.padEnd(9)} ERROR ${r.error}`);
    continue;
  }
  const v = r.pixels.violet;
  const bad = v > VIOLET_MAX;
  if (bad) fail = true;
  console.log(`  ${bad ? 'x' : '-'} ${r.id.padEnd(20)} ${r.vp.padEnd(9)} violet ${v.toFixed(2)}%${bad ? ` (> ${VIOLET_MAX}%)` : ''}  orange ${r.pixels.orange.toFixed(2)}%  ${r.kb} KB  ${r.file}`);
  for (const n of r.notes) console.log(`      note: ${n}`);
  const i = r.issues;
  for (const m of i.pageErrors) console.log(`      page error: ${m}`);
  for (const m of i.console) console.log(`      console error: ${m}`);
  for (const m of [...new Set(i.http)]) console.log(`      http: ${m.replace(/https?:\/\/[^/]+/, '')}`);
  for (const m of [...new Set(i.failed)]) console.log(`      request failed: ${m}`);
  for (const m of r.broken ?? []) console.log(`      broken image: ${m}`);
  if (r.fold?.length) {
    const line = r.fold.map((f) => (!f.found ? `${f.name} missing` : f.full640 ? `${f.name} yes` : f.full ? `${f.name} yes (not at 640)` : `${f.name} NO (bottom ${f.bottom})`)).join(' · ');
    console.log(`      5-second read (above ${r.vp.split('x')[1]} px): ${line}`);
  }
}
const allHttp = new Set(results.flatMap((r) => r.issues?.http ?? []).map((m) => m.replace(/https?:\/\/[^/]+/, '')));
console.log(`\nsummary: ${results.length} captures, ${results.filter((r) => r.error).length} errors, ${results.filter((r) => r.pixels?.violet > VIOLET_MAX).length} over the violet limit, ${allHttp.size} distinct HTTP errors`);
console.log(`delivery set: docs/screenshots/  ·  audit captures: scripts/.out/shots/`);
if (STALE) console.log('shots: STALE BUILD, results are not about the current source\n');
console.log(fail ? 'shots: FAIL (violet)\n' : STALE ? 'shots: INCONCLUSIVE\n' : 'shots: PASS\n');
process.exit(fail || STALE ? 1 : 0);
