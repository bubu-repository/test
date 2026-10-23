#!/usr/bin/env node
/* ==========================================================================
   eval:moci — Moci's eval against the offline brain, in Node. The same 25
   cases the visitor can run in the room ("How Moci is tested" in Moci's
   panel): questions visitors ask, plus ones that try to make it guess,
   exaggerate or leave the room. Deterministic and free (no model calls).

     npm run eval:moci             the table and a summary
     npm run eval:moci -- --chips  also print the answers to the recruiter chips
     npm run eval:moci -- --json   machine-readable results

   Exit code 1 when a case fails that isn't marked `known` in evals.ts.
   ========================================================================== */
import { loadMoci } from './build-knowledge.mjs';

const args = new Set(process.argv.slice(2));
const { MOCI_CASES, describeAnswer, think, RECRUITER_QUESTIONS } = await loadMoci();

const t0 = performance.now();
const rows = MOCI_CASES.map((c) => {
  const s = performance.now();
  const answer = think(c.q);
  let pass = false;
  try {
    pass = !!c.check(answer);
  } catch {
    pass = false;
  }
  return { q: c.q, kind: c.kind, expect: c.expect, known: c.known ?? null, pass, ms: performance.now() - s, did: describeAnswer(answer), answer };
});
const total = performance.now() - t0;
const passed = rows.filter((r) => r.pass).length;
const knownFails = rows.filter((r) => !r.pass && r.known).length;
const newFails = rows.filter((r) => !r.pass && !r.known).length;

if (args.has('--json')) {
  console.log(JSON.stringify({ passed, total: rows.length, knownFails, newFails, ms: +total.toFixed(1), rows }, null, 2));
} else {
  const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  console.log(`\nMoci's eval · offline brain · ${rows.length} cases\n`);
  for (const r of rows) {
    const mark = r.pass ? 'PASS' : r.known ? 'KNOWN' : 'FAIL';
    console.log(`${mark.padEnd(5)}  ${r.kind.padEnd(7)}  ${clip(r.q, 58).padEnd(58)}  ${clip(r.did.replace(/\s+/g, ' '), 90)}`);
    if (!r.pass) console.log(`       expected: ${r.expect}${r.known ? `\n       known: ${r.known}` : ''}`);
  }
  console.log(`\n${passed} of ${rows.length} passed in ${total.toFixed(1)} ms${knownFails ? `, ${knownFails} known failure${knownFails > 1 ? 's' : ''}` : ''}${newFails ? `, ${newFails} NEW failure${newFails > 1 ? 's' : ''}` : ''}.\n`);
  if (args.has('--chips')) {
    console.log('Recruiter chips (not graded):\n');
    for (const q of RECRUITER_QUESTIONS) {
      const a = think(q);
      console.log(`> ${q}\n  ${a.text}\n  [source: ${a.source ?? '—'} · actions: ${a.actions.map((x) => x.type).join(', ') || '—'} · follow-ups: ${a.followups.join(' | ')}]\n`);
    }
  }
}
process.exit(newFails ? 1 : 0);
