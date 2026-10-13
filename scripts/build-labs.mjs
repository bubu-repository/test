#!/usr/bin/env node
/**
 * Builds the *.adelia.cc experiments in labs/<slug>/.
 *
 * Each experiment is plain HTML/CSS/JS with no build step of its own. This script adds the
 * shared chrome (labs/_shared), the design tokens (packages/tokens) and the fonts, and writes:
 *
 *   dist-labs/<slug>/   → a self-contained static site, deploy it on <slug>.adelia.cc
 *   public/labs/<slug>/ → the same files, so the main site can preview them at /labs/<slug>/
 *
 * Usage:
 *   node scripts/build-labs.mjs            # every experiment
 *   node scripts/build-labs.mjs bloom      # one experiment
 */
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const labsDir = join(root, "labs");
const only = process.argv.slice(2);

const fonts = {
  "mona-sans.woff2": "node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-wdth-normal.woff2",
  "jetbrains-mono.woff2": "node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  "silkscreen.woff2": "node_modules/@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2",
};

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function writeShared(target) {
  const shared = join(target, "_shared");
  await mkdir(join(shared, "fonts"), { recursive: true });
  await cp(join(labsDir, "_shared"), shared, { recursive: true });
  await cp(join(root, "packages/tokens/tokens.css"), join(shared, "tokens.css"));
  for (const [name, source] of Object.entries(fonts)) {
    await cp(join(root, source), join(shared, "fonts", name));
  }
}

async function build(slug) {
  const source = join(labsDir, slug);
  if (!(await exists(join(source, "index.html")))) {
    console.warn(`skip ${slug}: no index.html`);
    return;
  }
  for (const outRoot of ["dist-labs", "public/labs"]) {
    const target = join(root, outRoot, slug);
    await rm(target, { recursive: true, force: true });
    await mkdir(target, { recursive: true });
    await cp(source, target, { recursive: true });
    await writeShared(target);
  }
  console.log(`built ${slug} → dist-labs/${slug}, public/labs/${slug}`);
}

const entries = (await readdir(labsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .filter((name) => only.length === 0 || only.includes(name));

for (const slug of entries) await build(slug);
