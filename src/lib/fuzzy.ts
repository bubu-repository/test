/**
 * Small fuzzy matcher for the palette and terminal.
 * Scores contiguous matches, word starts and early matches higher. 0 means no match.
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct !== -1) return 1000 - direct * 2 + (direct === 0 || /\W/.test(t[direct - 1] ?? " ") ? 200 : 0);

  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    if (ch === " ") continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    const wordStart = found === 0 || /\W/.test(t[found - 1]);
    streak = found === ti ? streak + 1 : 0;
    score += 10 + streak * 6 + (wordStart ? 12 : 0) - Math.min(found - ti, 8);
    ti = found + 1;
  }
  return Math.max(1, score);
}

/** Levenshtein distance, used by the 404 page to suggest the closest real route. */
export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}
