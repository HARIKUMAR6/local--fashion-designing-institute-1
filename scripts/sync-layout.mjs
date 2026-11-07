// Injects shared markup into the static pages. No dependencies.  Usage: node scripts/sync-layout.mjs [page.html ...]
//  1. Header/footer partials (src/partials) between <!-- @layout:NAME:start --> ... <!-- @layout:NAME:end -->
//  2. Lucide icons (src/icons/lucide/*.svg) between <!--icon:NAME--> ... <!--/icon-->
//  3. Brand: favicon/theme-color in <head> (@brand:head), and on pages without the shared header the lockup + emblem
//     sprite (@brand:lockup). The brand name/subtitle come from src/brand/brand.json (tokens {{brand.*}}).
import fs from 'node:fs';
import path from 'node:path';

const pages = process.argv.slice(2).length ? process.argv.slice(2)
  : ['index.html', 'home-2.html', 'about.html', 'courses.html', 'gallery.html', 'contact.html', 'login.html', 'dashboard/index.html'];

const BRAND = JSON.parse(fs.readFileSync('src/brand/brand.json', 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const nameHtml = (() => { const i = BRAND.name.lastIndexOf(' '); return i < 0 ? esc(BRAND.name) : `${esc(BRAND.name.slice(0, i))} <em>${esc(BRAND.name.slice(i + 1))}</em>`; })();
const sprite = fs.readFileSync('src/partials/brand-sprite.html', 'utf8').trim();

const lockup = (root, variant = '') => {
  const full = variant === 'footer';
  // One emblem drawing everywhere (header, drawer, footer): never a different logo per placement.
  const [w, h, sym] = full ? [64, 77, 'ae-emblem'] : [variant === 'compact' ? 36 : 40, variant === 'compact' ? 43 : 48, 'ae-emblem'];
  return `<a href="${root}index.html" class="brand-lockup${variant ? ' brand-lockup--' + variant : ''}" aria-label="${esc(BRAND.name)} – Homepage">
      <svg class="brand-lockup__emblem" width="${w}" height="${h}" viewBox="0 0 60 72" aria-hidden="true" focusable="false"><use href="#${sym}"/></svg>
      <span class="brand-lockup__text"><span class="brand-lockup__name">${nameHtml}</span>${variant === 'compact' ? '' : `<span class="brand-lockup__sub">${esc(BRAND.subtitle)}</span>`}</span>
    </a>`;
};
const tokens = (root) => ({
  '{{root}}': root,
  '{{brand.name}}': esc(BRAND.name),
  '{{brand.subtitle}}': esc(BRAND.subtitle),
  '{{brand.sprite}}': sprite,
  '{{brand.lockup}}': lockup(root),
  '{{brand.lockup.compact}}': lockup(root, 'compact'),
  '{{brand.lockup.footer}}': lockup(root, 'footer'),
});
const fill = (text, root) => Object.entries(tokens(root)).reduce((t, [k, v]) => t.split(k).join(v), text);

const iconMarkup = (name) => {
  const file = `src/icons/lucide/${name}.svg`;
  if (!fs.existsSync(file)) throw new Error(`Unknown icon "${name}" (add it to scripts/icons.mjs and run it)`);
  const svg = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '').trim();
  // Only the root <svg> tag is rewritten; inner shapes (e.g. <rect width height>) keep their attributes.
  const root = svg.match(/^<svg[^>]*>/)[0];
  const newRoot = root.replace(/\sclass="[^"]*"/, ' class="icon"').replace(/\s(width|height)="[^"]*"/g, '').replace('<svg', '<svg aria-hidden="true" focusable="false"');
  return (newRoot + svg.slice(root.length)).replace(/\s*\n\s*/g, ' ');
};

const partial = (n) => fs.readFileSync(`src/partials/${n}.html`, 'utf8').trim();

for (const page of pages) {
  if (!fs.existsSync(page)) { console.warn(`${page}: missing, skipped`); continue; }
  const root = path.dirname(page) === '.' ? './' : '../';
  const original = fs.readFileSync(page, 'utf8');
  let html = original;

  // 1. header/footer
  for (const name of ['header', 'footer']) {
    const re = new RegExp(`(<!-- @layout:${name}:start -->)[\\s\\S]*?(<!-- @layout:${name}:end -->)`);
    if (re.test(html)) html = html.replace(re, (_, a, b) => `${a}\n${fill(partial(name), root)}\n${b}`);
  }
  // 2. icons
  html = html.replace(/<!--icon:([a-z0-9-]+)-->[\s\S]*?<!--\/icon-->/g, (_, n) => `<!--icon:${n}-->${iconMarkup(n)}<!--/icon-->`);
  // 3a. brand head block (inserted once, then kept in sync)
  const head = `<!-- @brand:head:start -->\n  <link rel="icon" href="${root}assets/brand/favicon.svg" type="image/svg+xml">\n  <meta name="theme-color" content="#691829">\n  <!-- @brand:head:end -->`;
  if (/<!-- @brand:head:start -->/.test(html)) html = html.replace(/<!-- @brand:head:start -->[\s\S]*?<!-- @brand:head:end -->/, head);
  else html = html.replace(/(<meta name="viewport"[^>]*>)/, `$1\n  ${head}`);
  // 3b. standalone lockup on pages without the shared header (login, dashboard)
  html = html.replace(/(<!-- @brand:lockup:start -->)[\s\S]*?(<!-- @brand:lockup:end -->)/, (_, a, b) => `${a}\n${sprite}\n    ${lockup(root)}\n    ${b}`);

  if (html === original) { console.log(`unchanged ${page}`); continue; }
  fs.writeFileSync(page, html);
  console.log(`synced ${page}`);
}
