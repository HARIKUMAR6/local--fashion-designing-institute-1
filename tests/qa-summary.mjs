// Summarises tests/qa-results.json: node tests/qa-summary.mjs [file] [--cards]
import fs from 'node:fs';
const files = process.argv.slice(2).filter((a) => !a.startsWith('--')); const R = (files.length ? files : ['tests/qa-results.json']).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const showCards = process.argv.includes('--cards');
console.log(`${R.length} states audited; ${R.filter((r) => r.error).length} errored; ${R.filter((r) => r.jsErrors?.length).length} with JS exceptions`);
const byType = {};
for (const r of R) for (const i of r.issues || []) { const k = i.type; ((byType[k] ||= {})[i.sel] ||= { n: 0, states: new Set(), info: i.info }).n++; byType[k][i.sel].states.add(r.tag); }
for (const [type, sels] of Object.entries(byType)) {
  const total = Object.values(sels).reduce((a, b) => a + b.n, 0);
  console.log(`\n## ${type}: ${total} occurrences, ${Object.keys(sels).length} distinct`);
  for (const [sel, v] of Object.entries(sels).sort((a, b) => b[1].n - a[1].n).slice(0, 14)) console.log(`  ${v.n}× ${sel.slice(0, 80)} | ${String(v.info).slice(0, 70)} | e.g. ${[...v.states].slice(0, 2).join(' ; ')}`);
}
if (!Object.keys(byType).length) console.log('\nNo issues detected by the automated checks.');
if (showCards) {
  console.log('\n## card rows (same-row cards with misaligned tops/heights/heads/CTAs/ratios)');
  const seen = new Set();
  for (const r of R) for (const c of r.cardRows || []) {
    const bad = !c.sameTop || c.headSpread > 4 || c.ctaSpread > 4 || c.ratioSpread > 1.04;
    if (!bad) continue; const key = r.page + '|' + c.parent + '|' + c.heights.join(',');
    if (seen.has(key)) continue; seen.add(key);
    console.log(`  ${r.tag} ${c.parent.slice(0, 50)} n=${c.n} h=${c.heights.join('/')} top=${c.sameTop} head±${c.headSpread} cta±${c.ctaSpread} ratio×${c.ratioSpread}`);
  }
}
