// ATELIER ÉLAN brand system – single source of truth for the emblem geometry and the brand name.
//
//   node scripts/brand.mjs build              (re)generate assets/brand/*.svg and src/partials/brand-sprite.html
//   node scripts/brand.mjs set "NEW NAME" ["Subtitle"]   rename the brand everywhere (see warning below), then rebuild
//
// The wordmark is live text (src/brand/brand.json) so the name stays configurable. The emblem's AE monogram is
// custom-drawn geometry: if the approved name has different initials, the monogram must be redrawn here.
import fs from 'node:fs';
import path from 'node:path';

const BRAND = JSON.parse(fs.readFileSync('src/brand/brand.json', 'utf8'));

/* ---------- Emblem geometry (viewBox 0 0 60 72) ------------------------------------------------ */
// Pointed couture-label arch.
const ARCH = 'M30 2C38 10 54 14 54 32V66Q54 70 50 70H10Q6 70 6 66V32C6 14 22 10 30 2Z';
const KEYLINE = 'M30 6.4C37 13.4 50.6 17 50.6 33V65.4Q50.6 66.8 49.2 66.8H10.8Q9.4 66.8 9.4 65.4V33C9.4 17 23 13.4 30 6.4Z';
// AE monogram: high-contrast strokes (thick right leg of A and stem of E, hairline everything else).
// The A's crossbar continues as a "thread" into the E's middle arm; one hairline baseline ties A and E together.
const MONOGRAM = (ink) => `
  <g fill="none" stroke="${ink}" stroke-linecap="butt" transform="translate(30 42) scale(1.1) translate(-30 -42)">
    <path d="M24 28.6L14.6 56" stroke-width="1.2"/>
    <path d="M23.4 27.6L33.4 56" stroke-width="3.4"/>
    <path d="M37.2 27.4V56" stroke-width="3.4"/>
    <path d="M36 28.6H47.6" stroke-width="1.2"/>
    <path d="M19.4 42H45" stroke-width="1.2"/>
    <path d="M13.2 56.6H47.6" stroke-width="1.2"/>
  </g>`;
const DIAMOND = (ink) => `<path d="M30 14.2l2.2 3.1-2.2 3.1-2.2-3.1z" fill="${ink}"/>`;
const STITCHES = (ink) => `<path d="M18.5 63.4H41.5" fill="none" stroke="${ink}" stroke-width="0.9" stroke-dasharray="1.7 2.4" stroke-linecap="round"/>`;
const INK = 'var(--emblem-ink,#FAF8F5)';

const EDGE = 'var(--emblem-edge,#C28E98)';
const arch = (bg, edge) => `<path d="${ARCH}" fill="${bg}" stroke="${edge}" stroke-width="1.3"/>`;
const fullBody = (bg, ink, edge = EDGE) => `${arch(bg, edge)}<path d="${KEYLINE}" fill="none" stroke="${ink}" stroke-width="0.7" opacity="0.55"/>${DIAMOND(ink)}${MONOGRAM(ink)}${STITCHES(ink)}`;
const markBody = (bg, ink, edge = EDGE) => `${arch(bg, edge)}${MONOGRAM(ink)}`;

/* ---------- Files --------------------------------------------------------------------------------- */
const svg = (vb, inner, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${BRAND.name} emblem"${extra}>${inner}</svg>\n`;
const clean = (s) => s.replace(/\s*\n\s*/g, '');

export function build() {
  fs.mkdirSync('assets/brand', { recursive: true });
  // One emblem treatment for every background: burgundy badge, ivory monogram, thin rose edge (keeps it visible on charcoal).
  fs.writeFileSync('assets/brand/emblem.svg', svg('0 0 60 72', clean(fullBody('#691829', '#FAF8F5', '#C28E98'))));
  // Simplified mark for small sizes.
  fs.writeFileSync('assets/brand/mark.svg', svg('0 0 60 72', clean(markBody('#691829', '#FAF8F5', '#C28E98'))));
  // Favicon: the mark centred on a square canvas.
  fs.writeFileSync('assets/brand/favicon.svg', svg('-2 0 64 72', clean(markBody('#691829', '#FAF8F5')), ' width="64" height="64"').replace(' role="img" aria-label="' + BRAND.name + ' emblem"', ''));
  // Inline sprite used by the shared header/footer (inherits --emblem-bg / --emblem-ink so it follows light/dark).
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="ae-emblem" viewBox="0 0 60 72">${clean(fullBody('var(--emblem-bg,#691829)', INK))}</symbol>
  <symbol id="ae-mark" viewBox="0 0 60 72">${clean(markBody('var(--emblem-bg,#691829)', INK))}</symbol>
</svg>`;
  fs.writeFileSync('src/partials/brand-sprite.html', sprite + '\n');
  console.log('brand assets built');
}

/* ---------- Rename --------------------------------------------------------------------------------- */
function rename(newName, newSub) {
  const old = BRAND.name; const oldSub = BRAND.subtitle;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return ['node_modules', '.git', 'dist', 'screenshots'].includes(e.name) ? [] : walk(p);
    return /\.(html|css|js|mjs|json|md|svg)$/.test(e.name) && !/package-lock/.test(e.name) ? [p] : [];
  });
  const variants = [[old, newName], [old.replace(/(\S+)\s+(\S+)/, (m, a, b) => `${a[0]}${a.slice(1).toLowerCase()} ${b[0]}${b.slice(1).toLowerCase()}`), newName.replace(/(\S+)\s+(\S+)/, (m, a, b) => `${a[0]}${a.slice(1).toLowerCase()} ${b[0]}${b.slice(1).toLowerCase()}`)]];
  if (newSub) variants.push([oldSub, newSub], [oldSub.replace(/&/g, '&amp;'), newSub.replace(/&/g, '&amp;')]);
  let n = 0;
  for (const f of walk('.')) {
    if (f.includes('scripts' + path.sep + 'brand.mjs')) continue;
    let s = fs.readFileSync(f, 'utf8'); const before = s;
    for (const [a, b] of variants) s = s.split(a).join(b);
    if (s !== before) { fs.writeFileSync(f, s); n++; }
  }
  BRAND.name = newName; if (newSub) BRAND.subtitle = newSub;
  fs.writeFileSync('src/brand/brand.json', JSON.stringify(BRAND, null, 2) + '\n');
  console.log(`renamed in ${n} files. WARNING: the AE monogram geometry in scripts/brand.mjs still draws "AE" – redraw it for the new initials.`);
}

const cmd = process.argv[2];
if (cmd === 'build') build();
if (cmd === 'set') { rename(process.argv[3], process.argv[4]); build(); }
