// Per-section screenshots: node tests/section-shots.mjs <page> <width> <outDir> [scale]
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';
const [page, w = '1440', out = 'tests/screenshots/v5', scale = '0.5'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const c = await launch(9622); const p = await newPage(c.port); await p.viewport(+w, 900, +w < 768);
await p.goto('file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/' + page);
await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(800); await p.eval(`Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))`); await sleep(400);
const rects = await p.eval(`[...document.querySelectorAll('main > section')].map(s=>{const r=s.getBoundingClientRect();return {id:s.getAttribute('aria-labelledby'),y:r.top+scrollY,h:r.height}})`);
const tag = page.replace(/\W+/g, '_').replace('_html', '');
for (const [i, r] of rects.entries()) {
  const res = await p.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: r.y, width: +w, height: Math.min(r.h, 6000), scale: +scale } });
  fs.writeFileSync(`${out}/${tag}_${w}_s${i + 1}.png`, Buffer.from(res.data, 'base64'));
}
console.log(rects.map((r, i) => `s${i + 1} ${r.id} ${Math.round(r.h)}px`).join(' | ')); c.close(); process.exit(0);
