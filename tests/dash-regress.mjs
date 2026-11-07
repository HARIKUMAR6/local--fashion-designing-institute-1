// Dashboard regression: persistent sidebar, layout balance, no overflow, disclaimer absent, across viewports/themes/dirs.
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';
const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const c = await launch(9911);
let fails = 0; const log = (ok, m) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); };
const shots = process.argv.includes('--shots'); if (shots) fs.mkdirSync('tests/screenshots/dash', { recursive: true });
const views = ['dashboard','courses','learning','assignments','schedule','announcements','certificates','profile','settings'];
for (const [w, h] of [[1440, 900], [1100, 800], [1024, 768], [768, 1024], [390, 844]]) for (const [theme, dir] of [['light','ltr'],['dark','rtl']]) {
  const p = await newPage(c.port); p.errs = [];
  p.on((d) => { if (d.method === 'Runtime.exceptionThrown') p.errs.push(d.params.exceptionDetails.text); });
  await p.viewport(w, h, w < 768);
  await p.goto(ROOT + 'about.html');
  await p.eval(`localStorage.clear();localStorage.setItem('atelier_elan_theme','${theme}');localStorage.setItem('atelier_elan_dir_mode','${dir}')`);
  await p.goto(ROOT + 'dashboard/index.html'); await sleep(500);
  const tag = `${w}px ${theme}/${dir}`;
  const desktop = w >= 1024;
  const sbRect = `(()=>{const r=document.getElementById('sidebar').getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height),t:Math.round(r.top)}})()`;
  const first = await p.eval(sbRect);
  log(!(await p.eval(`document.body.innerText.includes('Prototype with sample student data')||!!document.querySelector('.proto-banner')`)), `${tag}: disclaimer absent on load`);
  let ok = true, why = '';
  const sbEl = await p.eval(`window.__sb=document.getElementById('sidebar'),1`);
  for (const v of views) {
    if (!desktop) { await p.eval(`document.getElementById('sb-open').click()`); await sleep(350); }
    await p.eval(`document.querySelector('[data-nav=${v}]').click()`); await sleep(350);
    const s = await p.eval(`(()=>{const sb=document.getElementById('sidebar'),r=sb.getBoundingClientRect(),cs=getComputedStyle(sb);const act=[...document.querySelectorAll('.sb__link[aria-current=page]')].map(a=>a.dataset.nav);const vis=[...document.querySelectorAll('[data-view]')].filter(e=>!e.hidden).map(e=>e.dataset.view);const de=document.documentElement;return {same:sb===window.__sb,disp:cs.display,vis:cs.visibility,l:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height),act,vis2:vis,ovf:de.scrollWidth-de.clientWidth,crumb:document.getElementById('crumb-page').textContent,proto:document.body.innerText.includes('Prototype with sample student data'),hash:location.hash}})()`);
    if (!s.same || s.disp === 'none' || s.vis === 'hidden') { ok = false; why += ` ${v}: sidebar removed/hidden;`; }
    if (desktop && (s.l !== first.l || s.w !== first.w || s.h !== first.h)) { ok = false; why += ` ${v}: sidebar geometry changed ${JSON.stringify(first)}→${JSON.stringify(s)};`; }
    if (s.act.length !== 1 || s.act[0] !== v) { ok = false; why += ` ${v}: active=${s.act};`; }
    if (s.vis2.length !== 1 || s.vis2[0] !== v) { ok = false; why += ` ${v}: visible views=${s.vis2};`; }
    await p.eval('window.scrollTo(0,document.documentElement.scrollHeight)'); await sleep(150);
    const sc = await p.eval(`(()=>{const r=document.getElementById('sidebar').getBoundingClientRect();const hit=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+60));return {t:Math.round(r.top),h:Math.round(r.height),inSb:!!(hit&&hit.closest('#sidebar')),y:Math.round(scrollY)}})()`);
    await p.eval('window.scrollTo(0,0)');
    if (desktop && (sc.t !== 0 || !sc.inSb)) { ok = false; why += ` ${v}: sidebar not pinned when scrolled ${JSON.stringify(sc)};`; }
    if (s.ovf > 0) { ok = false; why += ` ${v}: overflow ${s.ovf}px;`; }
    if (s.proto) { ok = false; why += ` ${v}: disclaimer text present;`; }
    if (shots && theme === 'light' && dir === 'ltr' && [1440, 768, 390].includes(w)) await p.shot(`tests/screenshots/dash/${w}-${v}.png`, false);
  }
  log(ok, `${tag}: sidebar persistent + active state + no overflow across all 9 views${why}`);
  if (desktop) {
    const lay = await p.eval(`(()=>{const sb=document.getElementById('sidebar').getBoundingClientRect(),m=document.querySelector('.app__main').getBoundingClientRect(),v=document.querySelector('[data-view]:not([hidden])').getBoundingClientRect();return {sbw:sb.width,mainL:m.left,mainR:m.right,mainW:m.width,vw:document.querySelector('.app').getBoundingClientRect().width,vL:v.left,vR:v.right,x:0}})()`);
    log(Math.abs(lay.mainW + lay.sbw - lay.vw) <= 1, `${tag}: sidebar + main fill viewport (${Math.round(lay.sbw)}+${Math.round(lay.mainW)}=${lay.vw})`);
  }
  log(p.errs.length === 0, `${tag}: no JS errors ${p.errs.join('|')}`);
  p.close();
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); await c.close?.(); process.exit(fails ? 1 : 0);
