#!/usr/bin/env node
/**
 * adelia.cc QA (npm run qa). No dependencies beyond Node and the project's own TypeScript.
 *
 *   (a) copy lint: em and en dashes, banned words and contrasts (scripts/slop-words.json),
 *       exclamation marks and emoji in UI strings. Scans src/** (string literals, template text,
 *       JSX text, comments), index.html, README.md and docs/*.md.            -> errors
 *   (b) TODO_SEA: count and list. Errors only with --strict.
 *   (c) CSS: raw colours outside src/styles/tokens.css (warn), `transition: all`, keyframes named
 *       glow/float/pulse, files with animations but no prefers-reduced-motion guard. -> errors
 *   (d) motion audit: hardcoded ms/s durations in src css/ts/tsx that skip the --duration-* tokens. -> warnings
 *   (e) CSP: inline <script> in index.html that vercel.json's Content-Security-Policy would block. -> errors
 *
 * Flags: --strict (TODO_SEA fails), --no-docs (skip README and docs), --quiet (errors only),
 *        --root <dir> (lint another checkout; used for the self-test fixture).
 * Escape hatches: "qa-ignore" on a line skips that line; "qa-ignore-file" anywhere skips the file.
 * Exit code 1 when any error is found.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const rootArg = process.argv.indexOf('--root');
const ROOT = rootArg > -1 ? process.argv[rootArg + 1] : fileURLToPath(new URL('..', import.meta.url));
const argv = new Set(process.argv.slice(2));
const STRICT = argv.has('--strict');
const NO_DOCS = argv.has('--no-docs');
const QUIET = argv.has('--quiet');
const require = createRequire(import.meta.url);

let ts = null;
try {
  ts = require(fileURLToPath(new URL('../node_modules/typescript', import.meta.url)));
} catch {
  console.warn('qa: TypeScript not found in node_modules, falling back to a simple scanner for .ts/.tsx');
}

const slop = JSON.parse(readFileSync(fileURLToPath(new URL('./slop-words.json', import.meta.url)), 'utf8'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]").replace(/\s+/g, '\\s+');
// whole words; a file or module name (journey.ts, @/journey) is code, not copy
const WORDS_RE = new RegExp(`(?<![\\w/@.-])(?:${[...slop.words, ...slop.phrases].map(esc).join('|')})(?![\\w-]|\\.(?:tsx?|jsx?|mjs|cjs|css|md|json|html)\\b)`, 'gi');
const PATTERNS = slop.patterns.map((p) => ({ ...p, re: new RegExp(p.regex, 'gi') }));
const DASH_RE = /[\u2014\u2013]/g;
const EMOJI_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/gu;
const BANG_RE = /!(?!important\b|=)/g;

// ---------------------------------------------------------------------------------------------
// files

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const rel = (p) => relative(ROOT, p).split('\\').join('/');
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const srcFiles = walk(join(ROOT, 'src'));
const docFiles = NO_DOCS
  ? []
  : [join(ROOT, 'README.md'), ...(existsSync(join(ROOT, 'docs')) ? readdirSync(join(ROOT, 'docs')).filter((f) => f.endsWith('.md')).map((f) => join(ROOT, 'docs', f)) : [])].filter(existsSync);
const htmlFiles = [join(ROOT, 'index.html')].filter(existsSync);

// ---------------------------------------------------------------------------------------------
// findings

const findings = []; // { level, section, rule, file, line, msg, excerpt }
function add(level, section, rule, file, line, msg, excerpt = '') {
  findings.push({ level, section, rule, file: rel(file), line, msg, excerpt: excerpt.replace(/\s+/g, ' ').trim().slice(0, 110) });
}
function lineStarts(text) {
  const a = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) a.push(i + 1);
  return a;
}
function lineAt(starts, off) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= off) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}
const excerptAt = (text, i, len) => text.slice(Math.max(0, i - 40), i + len + 40);

/**
 * A segment of human text inside a file. kind: comment | jsx | string | text | md
 * `code` marks a string literal that has no whitespace (a key, a class name, a path): only dashes apply.
 */
function lintSegment(file, fileText, starts, ignored, seg) {
  const { start, text, kind } = seg;
  const prose = kind !== 'string' || /\s/.test(text.trim());
  const uiString = kind === 'string' || kind === 'jsx';
  const report = (level, rule, re, msg) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const off = start + m.index;
      const line = lineAt(starts, off);
      if (!ignored.has(line)) add(level, 'copy', rule, file, line, typeof msg === 'function' ? msg(m) : msg, excerptAt(fileText, off, m[0].length));
      if (m[0].length === 0) re.lastIndex++;
    }
  };
  report('error', 'dash', DASH_RE, (m) => (m[0] === '\u2014' ? 'em dash' : 'en dash'));
  if (!prose) return;
  const scrubbed = seg.scrub ? seg.scrub(text) : text;
  const t2 = { ...seg, text: scrubbed };
  const report2 = (level, rule, re, msg) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t2.text))) {
      const off = start + m.index;
      const line = lineAt(starts, off);
      if (!ignored.has(line)) add(level, 'copy', rule, file, line, typeof msg === 'function' ? msg(m) : msg, excerptAt(fileText, off, m[0].length));
      if (m[0].length === 0) re.lastIndex++;
    }
  };
  report2('error', 'banned-word', WORDS_RE, (m) => `banned word "${m[0].toLowerCase()}"`);
  for (const p of PATTERNS) report2(p.level, p.id, p.re, p.message);
  if (uiString && seg.inSrc) {
    if (/[a-z]/i.test(text)) report2('error', 'exclamation', BANG_RE, 'exclamation mark in UI copy');
    report2('error', 'emoji', EMOJI_RE, (m) => `emoji ${m[0]} in UI copy`);
  }
}

function ignoredLines(text) {
  const s = new Set();
  text.split('\n').forEach((l, i) => l.includes('qa-ignore') && s.add(i + 1));
  return s;
}

// ---------------------------------------------------------------------------------------------
// extractors

/** TS/TSX/JS: string literals, template text, JSX text and comments, via the TypeScript AST. */
function segmentsFromCode(file, text, baseOffset = 0, scriptKind) {
  const segs = [];
  const timing = []; // motion audit hits: { off, msg, excerpt }
  if (!ts) {
    // fallback: comments and quoted strings by regex
    const re = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;
    let m;
    while ((m = re.exec(text))) {
      const s = m[0];
      const kind = s.startsWith('/') ? 'comment' : 'string';
      segs.push({ start: baseOffset + m.index, text: kind === 'string' ? s.slice(1, -1) : s, kind, inSrc: true });
    }
    return { segs, timing };
  }
  const kind = scriptKind ?? (file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.jsx') ? ts.ScriptKind.JSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const seenComments = new Set();
  const addComments = (ranges) => {
    for (const r of ranges ?? []) {
      if (seenComments.has(r.pos)) continue;
      seenComments.add(r.pos);
      segs.push({ start: baseOffset + r.pos, text: text.slice(r.pos, r.end), kind: 'comment', inSrc: true });
    }
  };
  const isModuleSpecifier = (n) => {
    const p = n.parent;
    if (!p) return false;
    if ((ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) && p.moduleSpecifier === n) return true;
    if (ts.isCallExpression(p) && (p.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(p.expression) && p.expression.text === 'require'))) return true;
    if (ts.isLiteralTypeNode(p) || ts.isImportTypeNode?.(p)) return true;
    return false;
  };
  const TIMING_PROPS = /^(duration|delay|endDelay|transitionDuration|transitionDelay|animationDuration|animationDelay)$/;
  const TIMING_CALLS = /^(fade|animate|wait|sleep)$/i;
  const hasNumber = (n) => {
    let found = null;
    const visit = (x) => {
      if (found) return;
      if (ts.isNumericLiteral(x) && Number(x.text) >= 1) found = x;
      else ts.forEachChild(x, visit);
    };
    visit(n);
    return found;
  };
  const visit = (node) => {
    addComments(ts.getLeadingCommentRanges(text, node.pos));
    addComments(ts.getTrailingCommentRanges(text, node.end));
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isModuleSpecifier(node)) {
      segs.push({ start: baseOffset + node.getStart(sf) + 1, text: node.text, kind: 'string', inSrc: true });
      const tm = /(?<![\w.$-])(\d*\.?\d+)(ms|s)\b/g;
      let m;
      while ((m = tm.exec(node.text))) if (Number(m[1]) > 0) timing.push({ off: baseOffset + node.getStart(sf), msg: `"${m[0]}" in a string`, ms: m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]) });
    } else if (ts.isTemplateExpression(node)) {
      const parts = [node.head, ...node.templateSpans.map((s) => s.literal)];
      for (const p of parts) segs.push({ start: baseOffset + p.getStart(sf) + 1, text: p.text, kind: 'string', inSrc: true });
    } else if (ts.isJsxText(node)) {
      if (node.text.trim()) segs.push({ start: baseOffset + node.getStart(sf), text: node.getText(sf), kind: 'jsx', inSrc: true });
    } else if (ts.isJsxExpression(node) && !node.expression) {
      const inner = node.getText(sf);
      const at = node.getStart(sf);
      const re = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
      let m;
      while ((m = re.exec(inner))) segs.push({ start: baseOffset + at + m.index, text: m[0], kind: 'comment', inSrc: true });
    } else if (ts.isPropertyAssignment(node) && TIMING_PROPS.test(node.name.getText(sf))) {
      const n = hasNumber(node.initializer);
      if (n) timing.push({ off: baseOffset + node.getStart(sf), msg: `${node.name.getText(sf)}: ${node.initializer.getText(sf)}`, ms: Number(n.text) });
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
      if (TIMING_CALLS.test(name)) {
        for (const a of node.arguments) if (ts.isNumericLiteral(a) && Number(a.text) >= 16) timing.push({ off: baseOffset + a.getStart(sf), msg: `${name}(..., ${a.text})`, ms: Number(a.text) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  addComments(ts.getLeadingCommentRanges(text, sf.endOfFileToken.pos));
  return { segs, timing };
}

/** Markdown: everything is prose; code fences and inline code are blanked for words and patterns. */
function scrubMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

/** HTML: comments, text nodes, a few attributes, and inline scripts (as JS). */
function segmentsFromHtml(file, text) {
  const segs = [];
  let timing = [];
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  let rest = text;
  rest = rest.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, body, off) => {
    const bodyOff = off + m.indexOf(body);
    const r = segmentsFromCode(file + '.js', body, bodyOff, ts ? ts.ScriptKind.JS : undefined);
    segs.push(...r.segs);
    timing = timing.concat(r.timing);
    return blank(m);
  });
  rest = rest.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, blank);
  let m;
  const com = /<!--([\s\S]*?)-->/g;
  while ((m = com.exec(rest))) segs.push({ start: m.index, text: m[0], kind: 'comment' });
  const attr = /\b(content|title|alt|aria-label|placeholder)\s*=\s*"([^"]*)"/gi;
  while ((m = attr.exec(rest))) segs.push({ start: m.index + m[0].indexOf(m[2]), text: m[2], kind: 'text' });
  const textNodes = />([^<>]+)</g;
  while ((m = textNodes.exec(rest))) if (m[1].trim()) segs.push({ start: m.index + 1, text: m[1], kind: 'text' });
  return { segs, timing };
}

/** CSS comments and `content:` strings. */
function segmentsFromCss(text) {
  const segs = [];
  let m;
  const com = /\/\*[\s\S]*?\*\//g;
  while ((m = com.exec(text))) segs.push({ start: m.index, text: m[0], kind: 'comment' });
  const content = /\bcontent\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/g;
  while ((m = content.exec(text))) segs.push({ start: m.index + m[0].indexOf(m[2]), text: m[2], kind: 'string', inSrc: true });
  return segs;
}

// ---------------------------------------------------------------------------------------------
// (a) copy lint + (d) motion audit for code

const TOKENS = (() => {
  const p = join(ROOT, 'src', 'styles', 'tokens.css');
  if (!existsSync(p)) return [];
  const out = [];
  const re = /(--duration-[\w-]+)\s*:\s*(\d*\.?\d+)(ms|s)/g;
  let m;
  const t = readFileSync(p, 'utf8');
  while ((m = re.exec(t))) out.push({ name: m[1], ms: m[3] === 's' ? Number(m[2]) * 1000 : Number(m[2]) });
  return out;
})();
const nearestToken = (ms) => {
  if (!TOKENS.length || !Number.isFinite(ms)) return '';
  const best = TOKENS.reduce((a, b) => (Math.abs(b.ms - ms) < Math.abs(a.ms - ms) ? b : a));
  return ` (nearest: ${best.name} ${best.ms}ms${best.ms === ms ? ', exact' : ''})`;
};

const todos = [];
function scanTodos(file, text) {
  text.split('\n').forEach((l, i) => {
    if (/TODO_SEA/.test(l)) todos.push({ file: rel(file), line: i + 1, excerpt: l.trim().slice(0, 100) });
  });
}

for (const file of srcFiles) {
  const ext = extname(file);
  if (!['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html', '.md', '.json', '.svg'].includes(ext)) continue;
  const text = readFileSync(file, 'utf8');
  scanTodos(file, text);
  if (text.includes('qa-ignore-file')) continue;
  const starts = lineStarts(text);
  const ignored = ignoredLines(text);
  let segs = [];
  if (CODE_EXT.has(ext)) {
    const r = segmentsFromCode(file, text);
    segs = r.segs;
    for (const t of r.timing) {
      const line = lineAt(starts, t.off);
      if (!ignored.has(line)) add('warn', 'motion', 'hardcoded-duration', file, line, `${t.msg}${nearestToken(t.ms)}`);
    }
  } else if (ext === '.css') segs = segmentsFromCss(text);
  else if (ext === '.html' || ext === '.svg') segs = segmentsFromHtml(file, text).segs;
  else if (ext === '.md') segs = [{ start: 0, text, kind: 'md', scrub: scrubMarkdown }];
  else if (ext === '.json') {
    const re = /"((?:\\.|[^"\\])*)"/g;
    let m;
    while ((m = re.exec(text))) segs.push({ start: m.index + 1, text: m[1], kind: 'string', inSrc: true });
  }
  for (const s of segs) lintSegment(file, text, starts, ignored, s);
}

for (const file of htmlFiles) {
  const text = readFileSync(file, 'utf8');
  scanTodos(file, text);
  if (text.includes('qa-ignore-file')) continue;
  const starts = lineStarts(text);
  const ignored = ignoredLines(text);
  const { segs } = segmentsFromHtml(file, text);
  for (const s of segs) lintSegment(file, text, starts, ignored, { ...s, inSrc: s.kind === 'string' ? false : s.inSrc });
}

for (const file of docFiles) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('qa-ignore-file')) continue;
  const starts = lineStarts(text);
  const ignored = ignoredLines(text);
  lintSegment(file, text, starts, ignored, { start: 0, text, kind: 'md', scrub: scrubMarkdown });
}

// ---------------------------------------------------------------------------------------------
// (c) CSS rules + (d) motion audit for CSS

const cssFiles = srcFiles.filter((f) => f.endsWith('.css'));
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const stripUrls = (v) => v.replace(/url\((?:[^()]|\([^()]*\))*\)/gi, (m) => ' '.repeat(m.length));
const stripVars = (v) => {
  // blank var(...) including nested parentheses
  let out = v;
  for (let guard = 0; guard < 20 && /var\(/.test(out); guard++) {
    out = out.replace(/var\((?:[^()]|\([^()]*\))*\)/g, (m) => ' '.repeat(m.length));
  }
  return out;
};
const globalMotionGuard = (() => {
  const base = join(ROOT, 'src', 'styles', 'base.css');
  if (!existsSync(base)) return false;
  const t = stripComments(readFileSync(base, 'utf8'));
  const m = t.match(/@media[^{]*prefers-reduced-motion[^{]*\{([\s\S]*?)\n\}/);
  return !!(m && /animation(-duration|-name)?\s*:/.test(m[1]) && /\*/.test(m[1]));
})();

for (const file of cssFiles) {
  const raw = readFileSync(file, 'utf8');
  const text = stripComments(raw);
  const starts = lineStarts(text);
  const ignored = ignoredLines(raw);
  const isTokens = basename(file) === 'tokens.css';
  const decl = /([a-z-]+)\s*:\s*([^;{}]+)/gi;
  let m;
  while ((m = decl.exec(text))) {
    const prop = m[1].toLowerCase();
    const value = m[2];
    const valOff = m.index + m[0].indexOf(value);
    const line = lineAt(starts, m.index);
    if (ignored.has(line)) continue;
    if (prop.startsWith('--') && isTokens) continue;
    if (!isTokens && !/^(-webkit-)?mask/.test(prop)) {
      const v = stripUrls(value);
      const colours = [];
      const hex = /(^|[^\w&-])(#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4}))(?![\w-])/gi;
      let h;
      while ((h = hex.exec(v))) colours.push(h[2]);
      const fn = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*(?!var\()([^)]*)\)/gi;
      while ((h = fn.exec(v))) colours.push(h[0]);
      const named = /(^|[\s,(])(white|black)(?=[\s,;)]|$)/gi;
      while ((h = named.exec(v))) colours.push(h[2]);
      if (colours.length) add('warn', 'css', 'raw-colour', file, line, `${prop}: raw colour ${[...new Set(colours)].join(', ')} (use a token from tokens.css)`, `${prop}: ${value}`);
    }
    if (/^transition(-property)?$/.test(prop) && /(^|[\s,])all([\s,]|$)/.test(value)) add('error', 'css', 'transition-all', file, line, `${prop}: all`, `${prop}: ${value}`);
    if (/^(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)$/.test(prop) && !isTokens) {
      const v = stripVars(value);
      const tm = /(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g;
      let t;
      while ((t = tm.exec(v))) {
        const ms = t[2] === 's' ? Number(t[1]) * 1000 : Number(t[1]);
        if (ms > 0) add('warn', 'motion', 'hardcoded-duration', file, lineAt(starts, valOff + t.index), `${prop}: ${t[0]}${nearestToken(ms)}`, `${prop}: ${value}`);
      }
    }
  }
  const kf = /@keyframes\s+([\w-]+)/g;
  while ((m = kf.exec(text))) {
    const line = lineAt(starts, m.index);
    if (/(^|[-_])(glow|float|pulse)|^(glow|float|pulse)/i.test(m[1]) && !ignored.has(line)) add('error', 'css', 'banned-keyframes', file, line, `@keyframes ${m[1]} (glow/float/pulse are banned names and moves)`);
  }
  const animates = /@keyframes|\banimation(-name)?\s*:/.test(text);
  if (animates && !/prefers-reduced-motion/.test(text)) {
    add(globalMotionGuard ? 'warn' : 'error', 'css', 'no-reduced-motion-guard', file, 1, `animates but has no @media (prefers-reduced-motion) block${globalMotionGuard ? ' (base.css has a global guard)' : ''}`);
  }
}

// ---------------------------------------------------------------------------------------------
// (e) CSP: an inline <script> in index.html must be allowed by vercel.json's script-src (hash or 'unsafe-inline')

const cspFindings = [];
{
  const vercel = join(ROOT, 'vercel.json');
  const html = join(ROOT, 'index.html');
  if (existsSync(vercel) && existsSync(html)) {
    let csp = '';
    try {
      const cfg = JSON.parse(readFileSync(vercel, 'utf8'));
      for (const h of cfg.headers ?? []) for (const kv of h.headers ?? []) if (/^content-security-policy$/i.test(kv.key)) csp = kv.value;
    } catch {}
    const scriptSrc = (csp.match(/script-src([^;]*)/) || [, ''])[1];
    if (csp && !/'unsafe-inline'/.test(scriptSrc)) {
      const text = readFileSync(html, 'utf8');
      const starts = lineStarts(text);
      const { createHash } = await import('node:crypto');
      const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = re.exec(text))) {
        const hash = `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`;
        if (!scriptSrc.includes(hash)) {
          const f = { level: 'error', section: 'csp', rule: 'inline-script-blocked', file: 'index.html', line: lineAt(starts, m.index), msg: `inline script is blocked by vercel.json CSP script-src; add ${hash} or move it to a file`, excerpt: '' };
          findings.push(f);
          cspFindings.push(f);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// report

const errors = findings.filter((f) => f.level === 'error');
const warns = findings.filter((f) => f.level === 'warn');
const bySection = (sec, lvl) => findings.filter((f) => f.section === sec && (!lvl || f.level === lvl));
const print = (list) => {
  for (const f of list) console.log(`  ${f.level === 'error' ? 'x' : '!'} ${f.file}:${f.line}  [${f.rule}] ${f.msg}${f.excerpt && !QUIET ? `\n      ${f.excerpt}` : ''}`);
};

console.log(`\nadelia.cc qa  ·  ${srcFiles.length} src files, ${htmlFiles.length} html, ${docFiles.length} docs${ts ? '' : '  (no TypeScript: regex fallback)'}\n`);

console.log(`(a) copy lint: ${bySection('copy', 'error').length} errors, ${bySection('copy', 'warn').length} warnings`);
print(QUIET ? bySection('copy', 'error') : bySection('copy'));

console.log(`\n(b) TODO_SEA: ${todos.length}${STRICT ? ' (strict: each is an error)' : ' (listed, not failing; use --strict before launch)'}`);
if (!QUIET || STRICT) for (const t of todos) console.log(`  ${STRICT ? 'x' : '-'} ${t.file}:${t.line}  ${t.excerpt}`);

console.log(`\n(c) css: ${bySection('css', 'error').length} errors, ${bySection('css', 'warn').length} warnings`);
print(QUIET ? bySection('css', 'error') : bySection('css'));

console.log(`\n(d) motion audit: ${bySection('motion').length} hardcoded durations (warnings)`);
if (!QUIET) print(bySection('motion'));

console.log(`\n(e) csp: ${cspFindings.length} errors`);
print(cspFindings);

const fail = errors.length > 0 || (STRICT && todos.length > 0);
const counts = {};
for (const f of findings) counts[`${f.level}:${f.rule}`] = (counts[`${f.level}:${f.rule}`] ?? 0) + 1;
console.log(`\nsummary: ${errors.length} errors, ${warns.length} warnings, ${todos.length} TODO_SEA  ·  ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ') || 'clean'}`);
console.log(fail ? 'qa: FAIL\n' : 'qa: PASS\n');
process.exit(fail ? 1 : 0);
