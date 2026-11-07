// Inner pages (About, Courses, Gallery, Contact): hero consistency, overflow, images, console errors,
// theme x direction x viewport matrix, plus Courses and Gallery functional checks.
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';
const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const PAGES = ['about.html', 'courses.html', 'gallery.html', 'contact.html'];
const SIZES = [[1440, 900, 'desktop'], [1280, 720, 'laptop'], [1024, 768, 'laptop-s'], [768, 1024, 'tablet'], [390, 844, 'mobile'], [360, 740, 'mobile-s']];
const c = await launch(9777);
let fails = 0; const log = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const shots = process.argv.includes('--shots');
if (shots) fs.mkdirSync('tests/screenshots/inner', { recursive: true });

const probe = `(()=>{
  const de=document.documentElement, h=document.querySelector('.page-hero');
  const r=(e)=>e&&e.getBoundingClientRect();
  const hr=r(h), cont=r(h.querySelector('.atelier-container')), bc=r(h.querySelector('.breadcrumb')), t=r(h.querySelector('h1')), im=h.querySelector('.page-hero__media img');
  const cs=(e,p)=>getComputedStyle(e)[p];
  const rightH=[...document.querySelectorAll('main h1,main h2,main h3')].filter(x=>{const a=cs(x,'textAlign');return a==='right'||(a==='end'&&cs(x,'direction')==='ltr')||(a==='start'&&cs(x,'direction')==='rtl')}).map(x=>x.textContent.trim().slice(0,24));
  const outside=[...document.querySelectorAll('main section *')].filter(e=>{if(e.closest('.g-strip,.lb'))return false;const b=e.getBoundingClientRect();return b.width>0&&(b.left<-2||b.right>innerWidth+2)}).map(e=>e.className||e.tagName).slice(0,3);
  return {sections:document.querySelectorAll('main > section').length, dark:de.classList.contains('dark'), dir:de.dir,
    overflow:de.scrollWidth>innerWidth, broken:[...document.images].filter(i=>i.id!=='lb-img'&&i.complete&&i.naturalWidth===0).length, rightH, outside,
    hero:{h:Math.round(hr.height),w:Math.round(hr.width),top:Math.round(hr.top+scrollY),contW:Math.round(cont.width),bcTop:Math.round(bc.top-hr.top),bcLeft:Math.round(bc.left-cont.left),titleTop:Math.round(t.top-hr.top),titleFs:cs(h.querySelector('h1'),'fontSize'),introFs:cs(h.querySelector('.page-hero__intro'),'fontSize'),imgH:Math.round(r(im).height),imgW:Math.round(r(im).width),copyFits:t.bottom<=hr.bottom&&r(h.querySelector('.page-hero__intro')).bottom<=hr.bottom,
      nat:im.naturalWidth/im.naturalHeight}};
})()`;

const heroSig = {};
for (const [w, hgt, name] of SIZES) for (const theme of ['light', 'dark']) for (const dir of ['ltr', 'rtl']) {
  const key = `${w}-${theme}-${dir}`; heroSig[key] = {};
  for (const file of PAGES) {
    const p = await newPage(c.port); const errs = [];
    p.on((d) => { if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.text + ' ' + (d.params.exceptionDetails.exception?.description || '')); if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errs.push(d.params.entry.text + ' ' + (d.params.entry.url || '')); });
    await p.viewport(w, hgt, w < 768);
    await p.goto(ROOT + 'about.html');
    await p.eval(`localStorage.setItem('atelier_elan_theme','${theme}');localStorage.setItem('atelier_elan_dir_mode','${dir}')`);
    await p.goto(ROOT + file);
    await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(900);
    const r = await p.eval(probe);
    heroSig[key][file] = r.hero;
    const expectSections = 6;
    const ok = r.dark === (theme === 'dark') && r.dir === dir && !r.overflow && !r.rightH.length && !r.broken && !r.outside.length && !errs.length && r.sections === expectSections && r.hero.copyFits;
    if (!ok) log(false, `${file} ${key}: ${JSON.stringify({ ...r, hero: undefined })} ${errs.join('|')} fits=${r.hero.copyFits}`);
    if (shots && theme === 'light' && dir === 'ltr' && (w === 1440 || w === 390)) await p.shot(`tests/screenshots/inner/${file.replace('.html', '')}_${w}.png`);
    if (shots && w === 1440 && (theme === 'dark' || dir === 'rtl') && !(theme === 'dark' && dir === 'rtl')) await p.shot(`tests/screenshots/inner/${file.replace('.html', '')}_${theme}_${dir}_${w}.png`);
    p.close();
  }
  // Hero comparison across the four pages for this viewport/theme/direction.
  const hs = Object.values(heroSig[key]);
  const same = (f) => new Set(hs.map(f)).size === 1;
  const ok = same((h) => h.h) && same((h) => h.top) && same((h) => h.contW) && same((h) => h.bcTop) && same((h) => h.bcLeft) && same((h) => h.titleFs) && same((h) => h.introFs) && same((h) => `${h.imgW}x${h.imgH}`);
  if (!ok) log(false, `hero mismatch ${key}: ${JSON.stringify(heroSig[key])}`);
}
const k = heroSig['1440-light-ltr'];
log(fails === 0, `matrix ${SIZES.length} sizes x 2 themes x 2 dirs x ${PAGES.length} pages clean (heroes identical)`);
console.log('hero heights per viewport:', SIZES.map(([w]) => `${w}px=${[...new Set(Object.values(heroSig[`${w}-light-ltr`]).map((h) => h.h))].join('/')}`).join('  '));
console.log('hero detail @1440:', JSON.stringify(k));

// ---------------- Gallery + Courses functional tests ----------------
{
  const p = await newPage(c.port); const errs = [];
  p.on((d) => { if (d.method === 'Runtime.exceptionThrown') errs.push('exception ' + d.params.exceptionDetails.text); if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errs.push(d.params.entry.text); });
  await p.viewport(1440, 900); await p.goto(ROOT + 'about.html'); await p.eval(`localStorage.clear()`);
  await p.goto(ROOT + 'gallery.html');
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(800);
  const total = await p.eval(`document.querySelectorAll('.g-item').length`);
  log(total === 23, `gallery archive has ${total} items`);
  for (const cat of ['projects', 'illustration', 'construction', 'textile', 'studio', 'showcase']) {
    await p.eval(`document.querySelector('.g-chip[data-filter=${cat}]').click()`);
    const r = await p.eval(`(()=>{const v=[...document.querySelectorAll('.g-item:not([hidden])')];return {n:v.length,allMatch:v.every(e=>e.dataset.cat==='${cat}'),pressed:document.querySelector('.g-chip[aria-pressed=true]').dataset.filter,status:document.getElementById('g-status').textContent,overflow:document.documentElement.scrollWidth>innerWidth,emptyShown:[...document.querySelectorAll('.g-empty[data-visible=true]')].length}})()`);
    const exp = await p.eval(`document.querySelectorAll('.g-item[data-cat=${cat}]').length`);
    log(r.n === exp && r.allMatch && r.pressed === cat && !r.overflow && exp > 0, `filter ${cat}: ${r.n}/${exp} shown, empty-notes=${r.emptyShown} | ${r.status}`);
  }
  await p.eval(`document.querySelector('.g-chip[data-filter=textile]').click()`);
  // lightbox on filtered set
  await p.eval(`document.querySelector('.g-item:not([hidden]) .g-open').click()`);
  let s = await p.eval(`({open:document.getElementById('lightbox').dataset.open,count:document.getElementById('lb-count').textContent,alt:document.getElementById('lb-img').alt,nat:document.getElementById('lb-img').naturalWidth,focus:document.activeElement.id,lock:document.body.classList.contains('lb-lock')})`);
  log(s.open === 'true' && s.count.startsWith('1 /') && s.nat > 0 && s.focus === 'lb-close' && s.lock, `lightbox opens on filtered set ${JSON.stringify(s)}`);
  const n = parseInt(s.count.split('/')[1]);
  log(n === 4, `lightbox set limited to filtered images (${n})`);
  await p.eval(`document.getElementById('lb-next').click()`); s = await p.eval(`document.getElementById('lb-count').textContent`); log(s.startsWith('2 /'), `Next -> ${s}`);
  await p.eval(`document.getElementById('lb-prev').click()`); await p.eval(`document.getElementById('lb-prev').click()`); s = await p.eval(`document.getElementById('lb-count').textContent`); log(s.startsWith(`${n} /`), `Previous wraps -> ${s}`);
  await p.key('ArrowRight'); s = await p.eval(`document.getElementById('lb-count').textContent`); log(s.startsWith('1 /'), `ArrowRight key -> ${s}`);
  await p.key('ArrowLeft'); s = await p.eval(`document.getElementById('lb-count').textContent`); log(s.startsWith(`${n} /`), `ArrowLeft key -> ${s}`);
  const ratio = await p.eval(`(()=>{const i=document.getElementById('lb-img');const b=i.getBoundingClientRect();return Math.abs(b.width/b.height-i.naturalWidth/i.naturalHeight)<0.02})()`);
  log(ratio, 'lightbox image keeps natural aspect ratio');
  await p.key('Escape'); s = await p.eval(`({open:document.getElementById('lightbox').dataset.open,lock:document.body.classList.contains('lb-lock'),focusIsOpener:document.activeElement.classList.contains('g-open')})`);
  log(s.open === 'false' && !s.lock && s.focusIsOpener, `Escape closes, returns focus ${JSON.stringify(s)}`);
  await p.eval(`document.querySelector('.g-item:not([hidden]) .g-open').click()`); await p.eval(`document.getElementById('lb-close').click()`);
  log((await p.eval(`document.getElementById('lightbox').dataset.open`)) === 'false', 'Close button closes');
  // RTL: arrow keys flip, nav buttons mirrored
  await p.eval(`document.getElementById('dir-toggle-btn').click()`);
  await p.eval(`document.querySelector('.g-item:not([hidden]) .g-open').click()`); await p.key('ArrowLeft');
  log((await p.eval(`document.getElementById('lb-count').textContent`)).startsWith('2 /'), 'RTL: ArrowLeft advances');
  await p.key('Escape');
  await p.eval(`document.getElementById('dir-toggle-btn').click()`);
  // gallery image aspect check: rendered ratio ~ natural ratio for every non-cropped gallery image
  await p.eval(`document.querySelector('.g-chip[data-filter=all]').click()`); await sleep(200);
  const bad = await p.eval(`[...document.querySelectorAll('.g-item img')].map(i=>{const b=i.getBoundingClientRect();return {f:i.src.split('/').pop(),d:Math.abs(b.width/b.height-i.naturalWidth/i.naturalHeight)}}).filter(x=>x.d>0.03)`);
  log(bad.length === 0, `gallery images render at natural aspect ratio ${JSON.stringify(bad.slice(0, 4))}`);
  const dupes = await p.eval(`(()=>{const s=[...document.querySelectorAll('main img')].map(i=>i.src);return s.length-new Set(s).size})()`);
  log(dupes === 0, `no repeated images on gallery (${dupes} duplicates)`);
  log(errs.length === 0, `gallery console errors: ${errs.join('|') || 'none'}`);
  p.close();
}
{
  const p = await newPage(c.port); const errs = [];
  p.on((d) => { if (d.method === 'Runtime.exceptionThrown') errs.push('exception ' + d.params.exceptionDetails.text); if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errs.push(d.params.entry.text); });
  await p.viewport(1440, 900); await p.goto(ROOT + 'courses.html');
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(800);
  const r = await p.eval(`(()=>{const arts=[...document.querySelectorAll('article.course')];return arts.map(a=>({name:a.querySelector('.course__title').textContent,imgs:[...a.querySelectorAll('img')].map(i=>i.src.split('/').pop()),ok:[...a.querySelectorAll('img')].every(i=>i.naturalWidth>0&&i.alt.length>5),dur:!!a.querySelector('.duration'),short:!!a.querySelector('.course__short'),overview:a.querySelector('.course__facts').textContent.includes('Course overview'),skills:a.querySelectorAll('.skills li').length,cta:a.querySelector('a[href*="contact.html?course="]')?.getAttribute('href')}))})()`);
  log(r.length === 4 && r.every((a) => a.ok && a.dur && a.short && a.overview && a.skills >= 4 && a.cta), `4 course articles complete: ${r.map((a) => `${a.name} [${a.imgs.join(',')}] skills=${a.skills}`).join(' ; ')}`);
  const imgs = await p.eval(`[...document.querySelectorAll('main img')].map(i=>i.src)`);
  log(new Set(imgs).size === imgs.length, `no repeated images on courses (${imgs.length} images, ${new Set(imgs).size} unique)`);
  // Enquire CTA -> contact form preselects course
  const hrefs = await p.eval(`[...document.querySelectorAll('a[href*="contact.html?course="]')].map(a=>a.getAttribute('href'))`);
  let okSel = 0;
  for (const href of [...new Set(hrefs)]) {
    await p.goto(ROOT + href.replace('./', '')); await sleep(150);
    const sel = await p.eval(`document.getElementById('f-course').value`);
    if (decodeURIComponent(href.split('course=')[1].split('#')[0]) === sel) okSel++;
  }
  log(okSel === new Set(hrefs).size, `enquiry CTAs preselect course on contact form (${okSel}/${new Set(hrefs).size})`);
  // form validation + mailto ready state
  await p.eval(`document.querySelector('#enquiry-form button[type=submit]').click()`);
  log((await p.eval(`document.getElementById('form-status').dataset.state`)) === 'error', 'contact form: empty submit shows errors');
  await p.eval(`(()=>{const f=document.getElementById('enquiry-form');f.name.value='Test Person';f.email.value='a@b.co';f.phone.value='+33142685500';f.message.value='Please send the prospectus for this course.';document.querySelector('#enquiry-form button[type=submit]').click()})()`);
  log((await p.eval(`document.getElementById('form-status').dataset.state`)) === 'ready', 'contact form: valid submit offers mailto');
  // internal links
  for (const file of PAGES) {
    await p.goto(ROOT + file);
    const links = await p.eval(`[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h.startsWith('./')||h.startsWith('#')))]`);
    const bad = [];
    for (const h of links) { const [path, hash] = h.split('#'); const f = path.replace('./', '').split('?')[0]; if (f && !fs.existsSync(f)) bad.push(h); if (hash && !f) { if (!(await p.eval(`!!document.getElementById('${hash}')`))) bad.push(h); } }
    log(bad.length === 0, `${file}: ${links.length} internal links resolve ${bad.join(',')}`);
  }
  log(errs.length === 0, `courses console errors: ${errs.join('|') || 'none'}`);
  p.close();
}
c.close();
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(fails ? 1 : 0);
