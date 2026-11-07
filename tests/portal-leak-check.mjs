// Proves portal-specific CSS does not change any public page: compares computed styles of every element with the
// real stylesheet vs. a build without portal.css (dist/output.noportal.css, created by the caller).
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';
const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const PAGES = ['index.html', 'home-2.html', 'about.html', 'courses.html', 'gallery.html', 'contact.html'];
const PROPS = ['display','position','width','height','marginTop','marginBottom','marginLeft','marginRight','paddingTop','paddingBottom','paddingLeft','paddingRight','color','backgroundColor','backgroundImage','fontSize','fontFamily','fontWeight','lineHeight','letterSpacing','textAlign','textTransform','textDecorationLine','borderTopWidth','borderBottomWidth','borderTopColor','borderRadius','gridTemplateColumns','gridTemplateRows','gridColumnStart','gridColumnEnd','flexDirection','flexWrap','justifyContent','alignItems','gap','opacity','visibility','transform','boxShadow','overflow','zIndex','objectFit','aspectRatio','top','left'];
if (!fs.existsSync('dist/output.noportal.css')) throw new Error('dist/output.noportal.css missing');
const SIG = `(() => { const P = ${JSON.stringify(PROPS)}; const out = []; for (const el of document.querySelectorAll('html, body, body *')) { if (el.closest('.lb')) continue; const cs = getComputedStyle(el); out.push(el.tagName + '.' + String(el.className).slice(0,40) + '|' + P.map(p => cs[p]).join('~')); } return out; })()`;
const c = await launch(9866);
let combos = 0, bad = 0, elements = 0; const report = [];
for (const pg of PAGES) for (const w of [1440, 390]) for (const dark of [false, true]) for (const rtl of [false, true]) {
  if (rtl && w === 1440 && dark) continue; // keep the matrix to a sensible size
  const p = await newPage(c.port); await p.viewport(w, 900, false);
  await p.goto(ROOT + 'about.html');
  await p.eval(`localStorage.setItem('atelier_elan_theme','${dark ? 'dark' : 'light'}');localStorage.setItem('atelier_elan_dir_mode','${rtl ? 'rtl' : 'ltr'}')`);
  await p.goto(ROOT + pg);
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(900);
  await p.eval(`Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))`);
  await p.eval(`(()=>{const s=document.createElement('style');s.textContent='*{transition:none!important;animation:none!important}';document.head.appendChild(s)})()`);
  await sleep(300);
  const a = await p.eval(SIG);
  await p.eval(`new Promise(res=>{const l=document.querySelector('link[rel=stylesheet][href*="output.css"]');l.addEventListener('load',res,{once:true});l.href=l.href.replace('output.css','output.noportal.css')})`);
  await sleep(500);
  const b = await p.eval(SIG);
  combos++; elements += a.length;
  const diffs = []; const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) { const pa = a[i].split('|')[1].split('~'), pb = b[i].split('|')[1].split('~'); diffs.push(a[i].split('|')[0] + ': ' + PROPS.filter((_, k) => pa[k] !== pb[k]).map((k) => k).join(',')); }
  if (a.length !== b.length || diffs.length) { bad++; report.push(`${pg} @${w}${dark ? ' dark' : ''}${rtl ? ' rtl' : ''}: ${a.length} vs ${b.length} elements, ${diffs.length} differ -> ${diffs.slice(0, 4).join(' | ')}`); }
  p.close();
}
c.close();
console.log(report.join('\n') || 'no differences');
console.log(`${combos - bad}/${combos} page/width/theme/direction combinations identical with and without portal.css (${elements} element comparisons)`);
process.exit(bad ? 1 : 0);
