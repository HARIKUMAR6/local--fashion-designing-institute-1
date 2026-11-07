// Theme x direction audit for both homepages at desktop and mobile widths.
import { launch, newPage, sleep } from './cdp.mjs';
const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const c = await launch(9666);
let fails = 0, runs = 0;
for (const file of ['index.html', 'home-2.html', 'about.html', 'contact.html']) for (const w of [1440, 768, 390]) for (const theme of ['light', 'dark']) for (const dir of ['ltr', 'rtl']) {
  const p = await newPage(c.port); const errs = [];
  p.on((d) => { if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.text); if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errs.push(d.params.entry.text); });
  await p.viewport(w, 900, w < 768);
  await p.goto(ROOT + 'about.html'); // same origin storage
  await p.eval(`localStorage.setItem('atelier_elan_theme','${theme}');localStorage.setItem('atelier_elan_dir_mode','${dir}')`);
  await p.goto(ROOT + file);
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(1200);
  const r = await p.eval(`(()=>{
    const de=document.documentElement;
    const rightH=[...document.querySelectorAll('main h1,main h2,main h3')].filter(h=>{const a=getComputedStyle(h).textAlign;return a==='right'||(a==='end'&&getComputedStyle(h).direction==='ltr')||(a==='start'&&getComputedStyle(h).direction==='rtl')}).map(h=>h.textContent.trim().slice(0,30));
    const broken=[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length;
    const outside=[...document.querySelectorAll('main section *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left<-2||r.right>innerWidth+2)&&!e.closest('.mobile-drawer')}).length;
    const bg=getComputedStyle(document.body).backgroundColor;
    return {dark:de.classList.contains('dark'),dir:de.dir,overflow:de.scrollWidth>innerWidth,rightH,broken,outside,bg,btn:document.getElementById('dir-toggle-btn').textContent};
  })()`);
  runs++;
  const ok = r.dark === (theme === 'dark') && r.dir === dir && !r.overflow && r.rightH.length === 0 && r.broken === 0 && r.outside === 0 && errs.length === 0 && r.btn === (dir === 'ltr' ? 'RTL' : 'LTR');
  if (!ok) { fails++; console.log('FAIL', file, w, theme, dir, JSON.stringify(r), errs.join('|')); }
  p.close();
}
c.close();
console.log(`${runs - fails}/${runs} theme×direction×width combinations clean`);
process.exit(0);
