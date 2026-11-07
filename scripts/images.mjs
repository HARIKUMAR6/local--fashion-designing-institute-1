// Usage:
//   node scripts/images.mjs fetch      download every manifest image into assets/images/<name>.jpg (skips existing)
//   node scripts/images.mjs register   regenerate assets/images/LICENSES.md (usage is read from the HTML pages)
import fs from 'node:fs';
import { IMAGES, LICENSES } from './images-manifest.mjs';

const PAGES = { 'index.html': 'Home 1', 'home-2.html': 'Home 2', 'about.html': 'About', 'courses.html': 'Courses', 'gallery.html': 'Gallery', 'contact.html': 'Contact', 'login.html': 'Login', 'dashboard/index.html': 'Dashboard' };
const cmd = process.argv[2];

if (cmd === 'fetch') {
  for (const [file, , id, , , , w] of IMAGES) {
    const out = `assets/images/${file}.jpg`;
    if (fs.existsSync(out)) continue;
    const r = await fetch(`https://images.unsplash.com/${id}?auto=format&fit=max&w=${w}&q=82`);
    if (!r.ok) { console.error('FAIL', r.status, file); process.exitCode = 1; continue; }
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    console.log('ok', file);
  }
}

if (cmd === 'register') {
  // Where is each image used? Find the enclosing <section aria-labelledby> for every reference.
  const usage = {};
  for (const [page, label] of Object.entries(PAGES)) {
    const html = fs.readFileSync(page, 'utf8');
    for (const m of html.matchAll(/assets\/images\/([a-z0-9-]+)\.jpg/g)) {
      const before = html.slice(0, m.index);
      const sec = [...before.matchAll(/<section[^>]*aria-labelledby="([^"]+)"/g)].pop();
      const key = `${label} – ${sec ? sec[1].replace(/-title$/, '') : 'page'}`;
      (usage[m[1]] ||= new Set()).add(key);
    }
  }
  const missing = [];
  const rows = IMAGES.map(([file, slug, id, creator, handle, lic]) => {
    const used = usage[file] ? [...usage[file]].join('; ') : 'UNUSED';
    if (!usage[file]) missing.push(file);
    const L = LICENSES[lic];
    return `| ${file}.jpg | ${creator} ([@${handle}](https://unsplash.com/@${handle})) | [unsplash.com/photos/${slug.length > 28 ? slug.slice(-11) : slug}](https://unsplash.com/photos/${slug}) | ${L.name} | [${L.url.replace('https://', '')}](${L.url}) | ${used} | \`${id}\` | VERIFIED |`;
  });
  const extra = fs.readdirSync('assets/images').filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !IMAGES.some(([n]) => `${n}.jpg` === f));
  const md = `# Image Source & License Register

Last verified: 2026-11-07

Every photograph on the site is listed here. **${IMAGES.length} images, all VERIFIED**, none from Unsplash+.

## How each image was verified
For every image, the individual Unsplash photo page was opened (normal page read, no scraping of private APIs, no bot-check workarounds) and these facts were read from the page itself:
- the creator name and profile,
- the license line ("Free to use under the Unsplash License", or the "Dual License: Public Domain & Unsplash License" shown for Europeana and Smithsonian archive material),
- that the photo is **not** an Unsplash+ asset (image served from images.unsplash.com, no paywall, no "For Unsplash+" label; the site-wide "Get Unsplash+" navigation link is not a property of the photo),
- that the image is not marked "flagged",
- the CDN photo ID printed on that page, which is the ID the local file was downloaded from.

The Unsplash License permits commercial use without permission or attribution. It does **not** grant model, property or trademark releases: photographs of identifiable people are used here as editorial/illustrative website imagery, and the people shown are not presented as real students, staff or alumni of ATELIER ÉLAN. The names and quotes on the site are fictional.

Files are stored locally in \`assets/images/\`. Source of truth: \`scripts/images-manifest.mjs\` (regenerate with \`node scripts/images.mjs register\`).

| File | Creator | Source page | License | License reference | Used in (page – section) | CDN ID | Status |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}
${extra.length ? `\n## Files in assets/images not in the manifest\n${extra.map((f) => `- ${f} – NOT VERIFIED, remove or verify`).join('\n')}\n` : ''}${missing.length ? `\n## Verified but currently unused\n${missing.map((f) => `- ${f}.jpg`).join('\n')}\n` : ''}`;
  fs.writeFileSync('assets/images/LICENSES.md', md);
  console.log(`register written: ${IMAGES.length} images, ${missing.length} unused, ${extra.length} unlisted files`);
}
