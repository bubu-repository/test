#!/usr/bin/env node
/**
 * npm run bake: bake the bento veil and the room-tile peek from the real room, per time of day.
 *
 * For each time (morning, dusk, night): open /room?time=X&bake=1 at 1600x900, DSF 1, wait until the
 * room has painted (data-room-ready on <html> if the app sets it, else .room + fonts + images + settled
 * animations), screenshot, then scripts/lib/veil.py writes
 *   public/veil/X.webp  heavy blur at full size, cool tint rgb(246 250 255 / .45) baked in, 96 px wide, q 70
 *   public/peek/X.webp  sharp 720 px wide crop of the room centre (4:3), q 80
 * Raw captures stay in scripts/.out/bake/ for review.
 *
 * Run it locally and commit the outputs: Playwright is not available in the Vercel build.
 * Flags: --no-build, --url <base>, --times morning,night, --tint 246,250,255,0.45, --peek-aspect 4:3, --allow-stale,
 *        --out <dir> (write veil/ and peek/ somewhere else, for a dry run)
 */
import { existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, OUT, ensureDir, loadPlaywright, server, settle, watch, fmtBytes } from './lib/serve.mjs';

const argv = process.argv.slice(2);
const opt = (name, def) => (argv.indexOf(name) > -1 ? argv[argv.indexOf(name) + 1] : def);
const TIMES = opt('--times', 'morning,dusk,night').split(',');
const rel = (p) => relative(ROOT, p) || p;
const TINT = opt('--tint', '246,250,255,0.45');
const ASPECT = opt('--peek-aspect', '4:3');

const BASE = opt('--out', join(ROOT, 'public')); // --out <dir> for a dry run
const RAW = ensureDir(join(OUT, 'bake'));
const VEIL = ensureDir(join(BASE, 'veil'));
const PEEK = ensureDir(join(BASE, 'peek'));

const py = spawnSync('python3', ['-I', '-c', 'import PIL; from PIL import features; print(features.check("webp"))'], { encoding: 'utf8' });
if (py.status !== 0 || !/True/.test(py.stdout)) {
  console.error('bake: needs python3 with Pillow and WebP support (python3 -I -c "import PIL").');
  process.exit(2);
}

const pw = loadPlaywright();
const srv = await server(argv);
console.log(`server: ${srv.url}  (${srv.build.note})`);
if (srv.build.stale && !argv.includes('--allow-stale')) {
  console.error('bake: the build failed, refusing to bake the veil from an old dist/ (--allow-stale to force).');
  srv.stop();
  process.exit(1);
}
const browser = await pw.chromium.launch();
const rows = [];
let failed = 0;

for (const time of TIMES) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const issues = watch(page);
  const row = { time, notes: [] };
  try {
    await page.goto(`${srv.url}/room?time=${time}&bake=1`, { waitUntil: 'load', timeout: 30000 });
    // Prefer an explicit signal from the app; fall back to the DOM.
    const ready = await page.waitForFunction(() => document.documentElement.dataset.roomReady === '1', null, { timeout: 6000 }).then(() => true, () => false);
    if (!ready) {
      row.notes.push('no data-room-ready signal: waited for .room instead');
      const hasRoom = await page.waitForSelector('.room', { state: 'attached', timeout: 8000 }).then(() => true, () => false);
      if (!hasRoom) row.notes.push('no .room element: the capture shows whatever is on /room');
    }
    const actual = await page.evaluate(() => document.documentElement.dataset.time).catch(() => null);
    if (actual !== time) row.notes.push(`<html data-time> is "${actual}", expected "${time}"`);
    await settle(page, 6000);
    // ?bake=1 should already hide the header and HUD; hide any fixed or sticky UI left outside the room anyway.
    const hidden = await page
      .evaluate(() => {
        const room = document.querySelector('.room');
        let n = 0;
        for (const el of document.querySelectorAll('body *')) {
          if (room && (room.contains(el) || el.contains(room))) continue;
          if (el.classList.contains('veil')) continue;
          const pos = getComputedStyle(el).position;
          if ((pos === 'fixed' || pos === 'sticky') && el.getBoundingClientRect().width > 0) {
            el.style.setProperty('visibility', 'hidden', 'important');
            n++;
          }
        }
        return n;
      })
      .catch(() => 0);
    if (hidden) row.notes.push(`hid ${hidden} fixed UI element(s) that ?bake=1 left on screen`);
    await page.waitForTimeout(300);
    const raw = join(RAW, `${time}.png`);
    await page.screenshot({ path: raw, type: 'png' });
    const veil = join(VEIL, `${time}.webp`);
    const peek = join(PEEK, `${time}.webp`);
    const r = spawnSync('python3', ['-I', join(ROOT, 'scripts', 'lib', 'veil.py'), raw, veil, peek, '--tint', TINT, '--peek-aspect', ASPECT], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('veil.py failed: ' + (r.stderr || r.stdout).trim().split('\n').pop());
    const info = JSON.parse(r.stdout.trim().split('\n').pop());
    row.veil = `${fmtBytes(info.veil_bytes)} (${info.veil_size.join('x')})`;
    row.peek = `${fmtBytes(info.peek_bytes)} (${info.peek_size.join('x')})`;
    if (info.luma_range < 24) row.notes.push(`capture is nearly flat (luma range ${info.luma_range}): the room probably did not paint`);
    if (issues.pageErrors.length) row.notes.push(`page errors: ${issues.pageErrors.join(' | ')}`);
    if (issues.http.length) row.notes.push(`http: ${[...new Set(issues.http)].join(' | ')}`);
  } catch (e) {
    failed++;
    row.error = String(e.message || e).split('\n')[0];
  }
  rows.push(row);
  await ctx.close();
}
await browser.close();
srv.stop();

console.log('\nbake');
for (const r of rows) {
  if (r.error) console.log(`  x ${r.time.padEnd(8)} ERROR ${r.error}`);
  else console.log(`  - ${r.time.padEnd(8)} ${rel(join(VEIL, r.time + '.webp'))} ${r.veil}  ·  ${rel(join(PEEK, r.time + '.webp'))} ${r.peek}`);
  for (const n of r.notes) console.log(`      note: ${n}`);
}
const total = ['veil', 'peek'].flatMap((d) => TIMES.map((t) => join(BASE, d, `${t}.webp`))).filter(existsSync).reduce((a, p) => a + statSync(p).size, 0);
console.log(`\ntotal baked: ${fmtBytes(total)}  ·  raw captures: scripts/.out/bake/`);
process.exit(failed ? 1 : 0);
