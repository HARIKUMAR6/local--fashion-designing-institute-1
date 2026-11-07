// Vendors Lucide icons (ISC licence, https://lucide.dev) as local SVG files: node scripts/icons.mjs
import fs from 'node:fs';
const VERSION = '0.468.0';
const NAMES = ['map-pin','mail','phone','clock','send','circle-check','circle-alert','scissors','pencil-ruler','briefcase-business','users','award','sparkles','eye','target','compass','graduation-cap','shirt','palette','handshake','calendar-check','arrow-right','chevron-right','accessibility','message-square','info','map-pinned','external-link','ruler','shield-check','footprints','id-card'];
fs.mkdirSync('src/icons/lucide', { recursive: true });
for (const n of NAMES) {
  const out = `src/icons/lucide/${n}.svg`;
  if (fs.existsSync(out)) continue;
  const r = await fetch(`https://cdn.jsdelivr.net/npm/lucide-static@${VERSION}/icons/${n}.svg`);
  if (!r.ok) { console.error('MISSING', n, r.status); process.exitCode = 1; continue; }
  fs.writeFileSync(out, await r.text());
}
fs.writeFileSync('src/icons/lucide/LICENSE.txt', `Lucide icons v${VERSION}, ISC License. Copyright (c) Lucide Contributors. https://lucide.dev/license\n`);
console.log('icons ready');
