#!/usr/bin/env node
/* ==========================================================================
   build:cv — writes public/cv.pdf from the same content as the site
   (src/content/profile.ts + src/content/projects.ts), so the CV never drifts
   out of date. Runs before `vite build`; Vite copies public/ into dist/, and
   the Node server (or any static host) serves it at /cv.pdf.

   Plain and ATS-friendly on purpose: one column, real text (no images),
   standard section names, Helvetica, reading order = drawing order, and
   deterministic output (no creation date), so an unchanged CV is byte-identical.

   Usage:  npm run build:cv
   Env:    CV_CONTENT_DIR  read profile.ts / projects.ts from another folder
           CV_OUT          write somewhere other than public/cv.pdf
   ========================================================================== */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.resolve(root, process.env.CV_CONTENT_DIR || 'src/content');
const outFile = path.resolve(root, process.env.CV_OUT || 'public/cv.pdf');

/* ------------------------------------------------------------ content */
/** Bundle the TypeScript content modules with esbuild (ships with Vite) and import the result. */
async function loadContent() {
  const files = { profile: path.join(contentDir, 'profile.ts'), projects: path.join(contentDir, 'projects.ts') };
  for (const f of Object.values(files)) {
    try {
      await fs.access(f);
    } catch {
      throw new Error(`build:cv needs ${path.relative(root, f)} (set CV_CONTENT_DIR to read it from elsewhere)`);
    }
  }
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    throw new Error('build:cv needs esbuild (installed with Vite). Run npm install.');
  }
  const entry = `export * from ${JSON.stringify(files.profile)};\nexport { projects } from ${JSON.stringify(files.projects)};\n`;
  const out = await esbuild.build({
    stdin: { contents: entry, resolveDir: contentDir, loader: 'ts', sourcefile: 'cv-content.ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    logLevel: 'silent',
    alias: { '@': path.join(root, 'src') },
    // content modules may import styles or assets for the site; the CV only needs the data
    loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.webp': 'empty', '.jpg': 'empty' },
  });
  const code = out.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

/* ------------------------------------------------------------ layout */
// Ink and accents from the room's palette, dark enough to print and photocopy.
const INK = rgb(0x18 / 255, 0x26 / 255, 0x3a / 255); // --ink #18263A
const MUTED = rgb(0x4a / 255, 0x5b / 255, 0x72 / 255); // --ink-2 #4A5B72
const ACCENT = rgb(0x1f / 255, 0x5f / 255, 0x96 / 255); // --blue-ink #1F5F96
const PINK = rgb(0xff / 255, 0x7e / 255, 0xb6 / 255); // --pink #FF7EB6 (the top edge only)
const LINE = rgb(0.86, 0.89, 0.93);

const A4 = { w: 595.28, h: 841.89 };
const M = 48;
const COL = 92; // left column for dates and skill-group names
const FOOT = M + 24; // keep body text above the footer

/** Helvetica only speaks WinAnsi: swap the few characters the content uses that it can't draw. */
function clean(text) {
  return String(text ?? '')
    .replace(/\u2192/g, '->')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2248/g, '~')
    .replace(/\u00D7/g, 'x')
    .replace(/\u03BA/g, 'kappa')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2022\u2026]/g, '');
}

function wrap(text, font, size, width) {
  // split on ordinary spaces only: a no-break space keeps "item ·" together at a line end
  const words = clean(text).split(/[ \t\r\n]+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

class Writer {
  constructor(pdf, regular, bold) {
    this.pdf = pdf;
    this.regular = regular;
    this.bold = bold;
    this.pages = [];
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage([A4.w, A4.h]);
    this.pages.push(this.page);
    this.y = A4.h - M;
  }

  /** Start a new page when fewer than `h` points are left above the footer. */
  ensure(h) {
    if (this.y - h < FOOT) this.newPage();
  }

  lines(text, { size = 10, bold = false, width = A4.w - M * 2 } = {}) {
    return wrap(text, bold ? this.bold : this.regular, size, width);
  }

  text(text, { size = 10, bold = false, color = INK, x = M, width = A4.w - M * 2, leading = 1.4, after = 0 } = {}) {
    const font = bold ? this.bold : this.regular;
    for (const line of wrap(text, font, size, width)) {
      this.ensure(size * leading);
      this.page.drawText(line, { x, y: this.y - size, size, font, color });
      this.y -= size * leading;
    }
    this.y -= after;
  }

  /** A clickable line of text (mailto:, https:) — still plain text for parsers. */
  link(label, uri, { size = 10, color = ACCENT, x = M } = {}) {
    const t = clean(label);
    const w = this.regular.widthOfTextAtSize(t, size);
    this.page.drawText(t, { x, y: this.y - size, size, font: this.regular, color });
    const annot = this.pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, this.y - size - 2, x + w, this.y + 1],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(uri) },
    });
    const ref = this.pdf.context.register(annot);
    const annots = this.page.node.lookup(PDFName.of('Annots'));
    if (annots) annots.push(ref);
    else this.page.node.set(PDFName.of('Annots'), this.pdf.context.obj([ref]));
    return w;
  }

  /** Section heading: plain words (ATS-friendly), a small square in the accent colour. */
  label(text) {
    this.ensure(14 + 18 + 40); // never strand a heading at the bottom of a page
    this.y -= 14;
    this.page.drawRectangle({ x: M, y: this.y - 8, width: 6, height: 6, color: ACCENT });
    this.page.drawText(clean(text.toUpperCase()), { x: M + 12, y: this.y - 8, size: 8.5, font: this.bold, color: MUTED });
    this.y -= 18;
  }

  rule(y = this.y) {
    this.page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.6, color: LINE });
  }
}

/* ------------------------------------------------------------ build */
async function buildCv({ identity, bio, experience, skills, projects }) {
  // updateMetadata: false keeps the file deterministic (no creation or modification date).
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.setTitle(`${identity.name} — CV`);
  pdf.setAuthor(identity.name);
  pdf.setSubject(`${identity.role}, ${identity.location}`);
  pdf.setKeywords([identity.role, identity.focus, ...skills.flatMap((g) => g.items)].filter(Boolean).map(clean));
  pdf.setCreator(identity.domain);
  pdf.setProducer('pdf-lib (scripts/build-cv.mjs)');
  if (typeof pdf.setLanguage === 'function') pdf.setLanguage('en');
  else pdf.catalog.set(PDFName.of('Lang'), PDFString.of('en'));

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(pdf, regular, bold);
  const page0 = w.page;

  // a thin pink edge, the only decoration
  page0.drawRectangle({ x: 0, y: A4.h - 5, width: A4.w, height: 5, color: PINK });

  w.text(identity.name, { size: 26, bold: true, leading: 1.15 });
  const facts = [identity.role, identity.degree && identity.cohort ? `${identity.degree}, ${identity.cohort}` : null, identity.location, identity.timeZoneLabel].filter(Boolean);
  w.text(facts.join(' · '), { size: 11, color: MUTED, after: 2 });

  // contact line: real links, plain text
  const site = identity.url.replace(/^https?:\/\//, '');
  const sep = '   ·   ';
  let x = M;
  x += w.link(identity.email, `mailto:${identity.email}`, { x });
  w.page.drawText(sep, { x, y: w.y - 10, size: 10, font: regular, color: MUTED });
  x += regular.widthOfTextAtSize(sep, 10);
  w.link(site, identity.url, { x });
  w.y -= 10 * 1.4 + 8;

  w.text(bio.short, { size: 10.5, leading: 1.5, after: 2 });
  w.text(bio.availability, { size: 10, color: MUTED });

  // A new grad's CV: experience and education first, then the work.
  w.label('Experience and education');
  for (const e of experience) {
    const titleLines = w.lines(`${e.title}, ${e.org}`, { size: 10.5, bold: true, width: A4.w - M * 2 - COL });
    const bodyLines = w.lines(e.summary, { size: 9.5, width: A4.w - M * 2 - COL });
    w.ensure(titleLines.length * 10.5 * 1.35 + Math.min(2, bodyLines.length) * 9.5 * 1.45);
    w.page.drawText(clean(e.period), { x: M, y: w.y - 10, size: 9, font: regular, color: MUTED });
    const startY = w.y;
    w.text(`${e.title}, ${e.org}`, { size: 10.5, bold: true, x: M + COL, width: A4.w - M * 2 - COL, leading: 1.35 });
    w.text(e.summary, { size: 9.5, x: M + COL, width: A4.w - M * 2 - COL, leading: 1.45, after: 6 });
    if (w.y > startY - 20) w.y = startY - 20;
  }

  w.label(`Selected work · case studies at ${identity.domain}/work`);
  for (const p of projects) {
    w.ensure(10.5 * 1.3 + 9 * 1.4 * 2);
    const kind = String(p.kind || '').replace(/\s*\(.*\)$/, '');
    w.text(`${p.name} — ${kind} (${String(p.context || '').toLowerCase()}), ${p.year}`, { size: 10.5, bold: true, leading: 1.3 });
    const metric = p.results?.metrics?.[0];
    const stack = Array.isArray(p.stack) ? p.stack.slice(0, 5).join(', ') : '';
    const detail = [p.role?.title ? `${p.role.title}.` : '', stack ? `Built with ${stack}.` : '', metric ? `${metric.value} ${metric.label}.` : ''].filter(Boolean).join(' ');
    w.text(detail, { size: 9, color: MUTED, leading: 1.4, after: 4 });
  }

  w.label('Skills');
  for (const g of skills) {
    const items = g.items.join('\u00A0\u00B7 ');
    const lines = w.lines(items, { size: 9.5, width: A4.w - M * 2 - COL });
    w.ensure(lines.length * 9.5 * 1.45);
    w.page.drawText(clean(g.name), { x: M, y: w.y - 9.5, size: 9.5, font: bold, color: INK });
    w.text(items, { size: 9.5, x: M + COL, width: A4.w - M * 2 - COL, leading: 1.45, after: 3 });
  }

  // footer on every page (and page numbers when the CV runs long)
  const footer = clean(`Generated from ${identity.domain}. The interactive version, with case studies, Moci and a room to walk through, is at ${identity.url}.`);
  w.pages.forEach((pg, i) => {
    const fy = M - 4;
    pg.drawLine({ start: { x: M, y: fy + 14 }, end: { x: A4.w - M, y: fy + 14 }, thickness: 0.6, color: LINE });
    const lines = wrap(footer, regular, 8, A4.w - M * 2 - (w.pages.length > 1 ? 40 : 0));
    lines.slice(0, 2).forEach((l, j) => pg.drawText(l, { x: M, y: fy + 4 - j * 10, size: 8, font: regular, color: MUTED }));
    if (w.pages.length > 1) {
      const n = `${i + 1} / ${w.pages.length}`;
      pg.drawText(n, { x: A4.w - M - regular.widthOfTextAtSize(n, 8), y: fy + 4, size: 8, font: regular, color: MUTED });
    }
  });

  return { bytes: await pdf.save(), pages: w.pages.length };
}

/* ------------------------------------------------------------ main */
try {
  const c = await loadContent();
  const missing = ['identity', 'bio', 'experience', 'skills', 'projects'].filter((k) => !c[k]);
  if (missing.length) throw new Error(`build:cv: ${path.relative(root, contentDir)} doesn't export ${missing.join(', ')}`);
  const { bytes, pages } = await buildCv(c);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  let same = false;
  try {
    same = Buffer.compare(await fs.readFile(outFile), Buffer.from(bytes)) === 0;
  } catch {}
  if (!same) await fs.writeFile(outFile, bytes);
  console.log(`build:cv → ${path.relative(root, outFile)} (${(bytes.length / 1024).toFixed(1)} KB, ${pages} page${pages > 1 ? 's' : ''}${same ? ', unchanged' : ''})`);
} catch (e) {
  console.error(`✖ ${e?.message || e}`);
  process.exit(1);
}
