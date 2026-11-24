/**
 * Shared helpers for the Playwright scripts: build, `vite preview` on a free port, Playwright loader,
 * and a "the page has settled" wait. No dependencies beyond Node, the project's Vite and Playwright.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const OUT = join(ROOT, 'scripts', '.out');
export const VITE = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const require = createRequire(import.meta.url);

export function ensureDir(p) {
  mkdirSync(p, { recursive: true });
  return p;
}

export function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    console.error('Playwright is not installed or not resolvable from this project. Install it globally or add it as a devDependency.');
    process.exit(2);
  }
}

export function run(cmd, args, { quiet = false, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, shell: process.platform === 'win32' });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
      if (!quiet) process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      out += d;
      if (!quiet) process.stderr.write(d);
    });
    child.on('close', (code) => resolve({ code, out }));
    child.on('error', (e) => resolve({ code: 1, out: String(e) }));
  });
}

/**
 * `npm run build` (typecheck + vite build). If the typecheck fails, report it and fall back to a plain
 * `vite build` so captures still happen. Returns { ok, typecheckOk, note }.
 */
export async function build({ skip = false } = {}) {
  if (skip) {
    if (!existsSync(join(ROOT, 'dist', 'index.html'))) return { ok: false, typecheckOk: null, note: 'no dist/ and --no-build given' };
    return { ok: true, typecheckOk: null, note: 'used the existing dist/ (--no-build)' };
  }
  console.log('build: npm run build');
  const full = await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { quiet: true });
  if (full.code === 0) return { ok: true, typecheckOk: true, note: 'npm run build ok' };
  const tsErrors = full.out.split('\n').filter((l) => /error TS\d+/.test(l)).slice(0, 12);
  const viteErr = full.out.split('\n').find((l) => /Could not resolve|error during build|\[vite\]/i.test(l));
  console.log(`build: npm run build failed (exit ${full.code}).${tsErrors.length ? ' Typecheck errors:\n  ' + tsErrors.join('\n  ') : viteErr ? ' ' + viteErr.trim() : '\n' + full.out.slice(-800)}`);
  console.log('build: falling back to vite build without the typecheck');
  const vite = await run(process.execPath, [VITE, 'build', '--logLevel', 'error'], { quiet: true });
  if (vite.code === 0) return { ok: true, typecheckOk: tsErrors.length ? false : null, note: 'vite build ok, npm run build failed (typecheck)' };
  const firstErr = vite.out.split('\n').find((l) => /error|Could not resolve/i.test(l)) ?? vite.out.slice(-400);
  console.log('build: vite build failed: ' + firstErr.trim());
  if (existsSync(join(ROOT, 'dist', 'index.html'))) return { ok: true, stale: true, typecheckOk: false, note: 'BUILD FAILED: serving the stale dist/' };
  return { ok: false, typecheckOk: false, note: 'build failed and there is no dist/' };
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/** Start `vite preview` on a free port and wait until it answers. Returns { url, stop }. */
export async function preview() {
  const port = await freePort();
  const child = spawn(process.execPath, [VITE, 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const url = `http://127.0.0.1:${port}`;
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    try {
      const r = await fetch(url + '/');
      if (r.ok) break;
    } catch {}
    if (child.exitCode !== null) throw new Error('vite preview exited:\n' + log);
    await new Promise((r) => setTimeout(r, 150));
  }
  const stop = () => {
    try {
      child.kill('SIGTERM');
    } catch {}
  };
  process.on('exit', stop);
  return { url, stop };
}

/** A running server for the scripts: --url <base> uses yours, otherwise build + preview. */
export async function server(argv) {
  const i = argv.indexOf('--url');
  if (i > -1) return { url: argv[i + 1].replace(/\/$/, ''), stop: () => {}, build: { ok: true, note: 'external server' } };
  const b = await build({ skip: argv.includes('--no-build') });
  if (!b.ok) {
    console.error('build failed: ' + b.note);
    process.exit(1);
  }
  if (b.stale) console.warn('\nWARNING: the build failed, so these results describe an OLD build (dist/). Fix the build and run again.\n');
  const p = await preview();
  return { ...p, build: b };
}

/**
 * Wait until the page has settled: fonts, images, finite animations finished, two frames.
 * Never throws: a timeout just moves on.
 */
export async function settle(page, timeout = 4000) {
  try {
    await page.evaluate(async (timeout) => {
      const t0 = performance.now();
      const until = (p) => Promise.race([p, new Promise((r) => setTimeout(r, Math.max(0, timeout - (performance.now() - t0))))]);
      try {
        await until(document.fonts.ready);
      } catch {}
      const pending = [...document.images].filter((i) => !i.complete);
      await until(Promise.all(pending.map((i) => new Promise((r) => (i.addEventListener('load', r, { once: true }), i.addEventListener('error', r, { once: true }))))));
      while (performance.now() - t0 < timeout) {
        const running = document.getAnimations().filter((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming?.().endTime ?? Infinity));
        if (!running.length) break;
        await new Promise((r) => setTimeout(r, 80));
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, timeout);
  } catch {}
}

/** Collect console errors, page errors, failed requests and HTTP errors for one page. */
export function watch(page) {
  const issues = { console: [], pageErrors: [], failed: [], http: [] };
  page.on('console', (m) => m.type() === 'error' && issues.console.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => issues.pageErrors.push(String(e.message || e).slice(0, 200)));
  page.on('requestfailed', (r) => issues.failed.push(`${r.failure()?.errorText ?? 'failed'} ${r.url()}`));
  page.on('response', (r) => {
    if (r.status() >= 400) return issues.http.push(`${r.status()} ${r.url()}`);
    // vite preview (and SPA rewrites on Vercel) answer a missing file with index.html and a 200:
    // an image, font, script or stylesheet that comes back as HTML is a missing asset.
    const type = r.request().resourceType();
    if (['image', 'font', 'script', 'stylesheet', 'media'].includes(type) && /text\/html/.test(r.headers()['content-type'] || '')) {
      issues.http.push(`missing (got index.html) ${r.url()}`);
    }
  });
  return issues;
}

/** Broken <img> elements (loaded with zero size) on the page. */
export function brokenImages(page) {
  return page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.currentSrc || i.src)).catch(() => []);
}

export const fmtBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(2)} MB` : n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);
