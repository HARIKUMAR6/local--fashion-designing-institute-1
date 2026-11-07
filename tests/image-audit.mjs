// Image audit for the inner pages: uniqueness (by filename, by file bytes, by source photo id), licence-manifest
// membership, existence, and – in a real browser – load success, resolution and distortion.
//   node tests/image-audit.mjs            exits non-zero on any failure
import fs from 'node:fs';
import crypto from 'node:crypto';
import { IMAGES } from '../scripts/images-manifest.mjs';
import { launch, newPage, sleep } from './cdp.mjs';

const INNER = ['about.html', 'courses.html', 'gallery.html', 'contact.html', 'login.html', 'dashboard/index.html'];
const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
let fails = 0;
const check = (name, ok, info = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

const manifest = new Map(IMAGES.map(([file, slug, id]) => [file, { slug, id }]));
const refs = []; // {page, file, via}
for (const page of INNER) {
  if (!fs.existsSync(page)) continue;
  const html = fs.readFileSync(page, 'utf8');
  for (const m of html.matchAll(/assets\/images\/([A-Za-z0-9._-]+)/g)) refs.push({ page, file: m[1], via: 'html' });
}
for (const f of fs.readdirSync('src/css')) for (const m of fs.readFileSync(`src/css/${f}`, 'utf8').matchAll(/assets\/images\/([A-Za-z0-9._-]+)/g)) refs.push({ page: 'css:' + f, file: m[1], via: 'css' });

console.log(`\n== Inventory: ${refs.length} references across ${new Set(refs.map((r) => r.page)).size} files ==`);
const names = refs.map((r) => r.file.replace(/\.jpg$/, ''));

// 1. Existence + licence manifest
const missing = refs.filter((r) => !fs.existsSync(`assets/images/${r.file}`)).map((r) => `${r.page}:${r.file}`);
check('Every referenced image file exists', missing.length === 0, missing.join(', '));
const unverified = [...new Set(names.filter((n) => !manifest.has(n)))];
check('Every referenced image is in the licence-verified manifest', unverified.length === 0, unverified.join(', '));

// 2. Uniqueness – by filename
const byName = {}; refs.filter((r) => r.via === 'html').forEach((r) => (byName[r.file] ||= []).push(r.page));
const dupName = Object.entries(byName).filter(([, p]) => p.length > 1);
check('No image file is used more than once across the inner pages', dupName.length === 0, dupName.map(([f, p]) => `${f} ×${p.length} (${[...new Set(p)].join(',')})`).join('; '));

// 3. Uniqueness – by content hash (same picture saved under different names)
const hash = (f) => crypto.createHash('sha1').update(fs.readFileSync(`assets/images/${f}`)).digest('hex');
const byHash = {}; for (const n of Object.keys(byName)) if (fs.existsSync(`assets/images/${n}`)) (byHash[hash(n)] ||= []).push(n);
const dupHash = Object.values(byHash).filter((v) => v.length > 1);
check('No two different files contain identical image data', dupHash.length === 0, dupHash.map((v) => v.join(' = ')).join('; '));

// 4. Uniqueness – by source photo id (same photo re-downloaded at another size / name)
const byId = {}; for (const n of new Set(names)) { const m = manifest.get(n.replace(/\.jpg$/, '')); if (m) (byId[m.id] ||= []).push(n); }
const dupId = Object.values(byId).filter((v) => v.length > 1);
check('No two files come from the same source photo', dupId.length === 0, dupId.map((v) => v.join(' / ')).join('; '));

// 5. Whole-site duplicates in the manifest itself
const idCount = {}; IMAGES.forEach(([f, , id]) => (idCount[id] ||= []).push(f));
const manifestDup = Object.values(idCount).filter((v) => v.length > 1);
check('Manifest has no two entries for the same photo', manifestDup.length === 0, manifestDup.map((v) => v.join(' / ')).join('; '));

// 6. Browser: loaded, resolution, distortion, empty containers
console.log('\n== Browser: load, resolution, distortion ==');
const c = await launch(9341);
const SIZES = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
for (const page of INNER.filter((p) => fs.existsSync(p))) {
  const issues = { broken: [], soft: [], squashed: [], emptyFrames: [] };
  for (const [w, h] of SIZES) {
    const p = await newPage(c.port); await p.viewport(w, h, w < 768); await p.goto(ROOT + page);
    await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(1500);
    const r = await p.eval(`(() => { const out={broken:[],soft:[],squashed:[],emptyFrames:0};
      for (const i of document.images) { const b=i.getBoundingClientRect(); if(!b.width||i.closest('[hidden],.g-store,.lb')) continue;
        if (!i.complete||!i.naturalWidth) { out.broken.push(i.getAttribute('src')); continue; }
        if (i.naturalWidth < b.width*0.9) out.soft.push(i.getAttribute('src').split('/').pop()+' '+i.naturalWidth+'<'+Math.round(b.width));
        const fit=getComputedStyle(i).objectFit; if ((fit==='fill'||fit==='') && Math.abs((b.width/b.height)/(i.naturalWidth/i.naturalHeight)-1)>0.03) out.squashed.push(i.getAttribute('src').split('/').pop());
      }
      document.querySelectorAll('.frame').forEach(f=>{ if(!f.querySelector('img')||f.getBoundingClientRect().height<20) out.emptyFrames++; });
      return out; })()`);
    p.close();
    issues.broken.push(...r.broken); issues.soft.push(...r.soft.map((s) => `${s}@${w}`)); issues.squashed.push(...r.squashed); issues.emptyFrames.push(r.emptyFrames);
  }
  check(`${page}: all images load`, issues.broken.length === 0, [...new Set(issues.broken)].join(', '));
  check(`${page}: no distorted (stretched/squashed) images`, issues.squashed.length === 0, [...new Set(issues.squashed)].join(', '));
  check(`${page}: no empty image containers`, issues.emptyFrames.every((n) => n === 0));
  if (issues.soft.length) console.log(`      note (rendered larger than source, soft at 1x): ${[...new Set(issues.soft)].slice(0, 6).join('; ')}${issues.soft.length > 6 ? ' …' : ''}`);
}
c.close();
console.log(`\n${fails ? fails + ' FAILED' : 'Image audit passed'}`);
process.exit(fails ? 1 : 0);
