// Captures the real brand lockup from Header, Footer, Login and Dashboard and lays them out side by side.
// node tests/brand-side-by-side.mjs <width> <light|dark> <ltr|rtl> <out.png>
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';
const [w = '1440', theme = 'light', dir = 'ltr', out = 'tests/screenshots/v6/brand_side_by_side.png'] = process.argv.slice(2);
const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const c = await launch(9888);
const shots = [];
const grab = async (file, label, selector, index = 0) => {
  const p = await newPage(c.port); await p.viewport(+w, 900, false);
  await p.goto(ROOT + 'about.html');
  await p.eval(`localStorage.setItem('atelier_elan_theme','${theme}');localStorage.setItem('atelier_elan_dir_mode','${dir}')`);
  await p.goto(ROOT + file); await sleep(900);
  if (selector.includes('footer')) await p.eval('window.scrollTo(0, 99999)');
  await sleep(300);
  const r = await p.eval(`(()=>{const all=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(e=>e.getBoundingClientRect().width>0);const e=all[${index}];if(!e)return null;const host=e.closest('header,footer,aside,.sb,.tb,.pl__head,.pl,body')||e.parentElement;const b=e.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,w:b.width,h:b.height}})()`);
  if (!r) { console.log('not visible:', label); p.close(); return; }
  const pad = 18;
  const res = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + pad * 2, height: r.h + pad * 2, scale: 2 } });
  shots.push([label, res.data, Math.round(r.w), Math.round(r.h)]); p.close();
};
await grab('index.html', 'Header', '.site-header .brand-lockup');
await grab('index.html', 'Footer', '.site-footer .brand-lockup');
await grab('login.html', 'Login Portal', '.brand-lockup');
await grab('dashboard/index.html', 'Dashboard sidebar', '.brand-lockup', 0);
await grab('dashboard/index.html', 'Dashboard topbar', '.tb .brand-lockup');
c.close();
const html = `<body style="margin:0;padding:28px;background:#d8d4cc;font:13px system-ui;color:#333"><h3 style="margin:0 0 18px">${theme} · ${dir.toUpperCase()} · ${w}px</h3><div style="display:flex;flex-wrap:wrap;gap:22px;align-items:flex-start">${shots.map(([l, d, ww, hh]) => `<figure style="margin:0"><img src="data:image/png;base64,${d}" style="display:block;border:1px solid #999;image-rendering:auto;height:${(hh + 36) * 1}px"><figcaption style="margin-top:6px">${l} (${ww}×${hh}px)</figcaption></figure>`).join('')}</div></body>`;
const tmp = out.replace('.png', '.html'); fs.writeFileSync(tmp, html);
const c2 = await launch(9889); const p2 = await newPage(c2.port); await p2.viewport(1500, 420, false);
await p2.goto(ROOT + out.split('/').slice(-4).join('/').replace('.png', '.html')); await sleep(600);
await p2.shot(out, false); c2.close(); fs.unlinkSync(tmp); console.log('wrote', out, shots.map((s) => s[0]).join(', ')); process.exit(0);
