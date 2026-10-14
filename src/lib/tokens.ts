import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads packages/tokens/tokens.css at build time so the styleguide and metadata show the real
 * values without restating them. Server components only (uses node:fs).
 */

export type TokenDeclaration = { name: string; value: string; note?: string };
export type TokenGroups = { light: TokenDeclaration[]; dark: TokenDeclaration[]; shared: TokenDeclaration[] };

const source = readFileSync(join(process.cwd(), "packages/tokens/tokens.css"), "utf8");

function parseBlocks(css: string): TokenGroups {
  const groups: TokenGroups = { light: [], dark: [], shared: [] };
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const [, rawSelector, body] of css.matchAll(blockPattern)) {
    const selector = rawSelector.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const declarations = parseDeclarations(body);
    if (selector.includes("data-daypart")) continue; // day-part tints are variants, not base tokens
    if (selector.includes('[data-theme="dark"]')) groups.dark.push(...declarations);
    else if (selector.includes('[data-theme="light"]')) groups.light.push(...declarations);
    else if (selector === ":root") groups.shared.push(...declarations);
  }
  return groups;
}

function parseDeclarations(body: string): TokenDeclaration[] {
  const declarations: TokenDeclaration[] = [];
  const linePattern = /(--[\w-]+)\s*:\s*([^;]+);[ \t]*(?:\/\*\s*([\s\S]*?)\s*\*\/)?/g;
  for (const [, name, value, note] of body.matchAll(linePattern)) {
    declarations.push({ name, value: value.trim().replace(/\s+/g, " "), note });
  }
  return declarations;
}

export const tokens: TokenGroups = parseBlocks(source);

/** Resolves a token to its literal value for a theme, following var() aliases. */
export function resolveToken(theme: "light", name: string, depth = 0): string | undefined {
  const own = tokens[theme].find((token) => token.name === name)?.value;
  const value = own ?? tokens.light.find((token) => token.name === name)?.value;
  const alias = value?.match(/^var\((--[\w-]+)\)$/);
  if (alias && depth < 5) return resolveToken(theme, alias[1], depth + 1);
  return value;
}

/** Like resolveToken, but fails the build if the token is missing. */
export function requireToken(theme: "light", name: string): string {
  const value = resolveToken(theme, name);
  if (!value) throw new Error(`Token ${name} is not defined for the ${theme} theme.`);
  return value;
}
