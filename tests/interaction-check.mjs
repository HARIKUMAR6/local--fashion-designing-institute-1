// Interaction + integrity checks for Home 1 / Home 2 shared header & footer, in real Chrome.
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, sleep } from './cdp.mjs';

const DIR = 'D:/Nov/Nov slot 1/Fashion Designing Institute/';
const ROOT = 'file:///' + DIR.replace(/ /g, '%20');
const results = [];
const check = (name, ok, info = '') => { results.push([ok, name, info]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

const c = await launch(9555);
const open = async (file, w = 1440, h = 900) => {
  const p = await newPage(c.port);
  p.errors = [];
  p.on((d) => {
    if (d.method === 'Runtime.exceptionThrown') p.errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') p.errors.push(d.params.entry.text);
  });
  await p.viewport(w, h, w < 768);
  await p.goto(ROOT + file);
  return p;
};
const rect = (p, sel) => p.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}})()`);
const click = async (p, sel) => { const r = await rect(p, sel); for (const t of ['mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type: t, x: r.x, y: r.y, button: 'left', clickCount: 1, pointerType: 'mouse' }); await sleep(250); };

for (const [label, file] of [['Home 1', 'index.html'], ['Home 2', 'home-2.html']]) {
  console.log(`\n== ${label} ==`);
  let p = await open(file);

  // Dropdown
  const items = await p.eval(`[...document.querySelectorAll('#home-dropdown-menu a')].map(a=>a.textContent.trim()+'>'+a.getAttribute('href'))`);
  check(`${label}: dropdown has exactly Home 1 + Home 2`, JSON.stringify(items) === JSON.stringify(['Home 1>./index.html', 'Home 2>./home-2.html']), items.join(', '));
  check(`${label}: only Home has a dropdown`, (await p.eval(`document.querySelectorAll('.site-nav__item--dropdown').length`)) === 1);
  const r = await rect(p, '#home-dropdown-trigger');
  await p.mouse(r.x, r.y); await sleep(350);
  // Click-only (hover must NOT open it; a cursor resting on "Home" at page load used to open it by itself).
  check(`${label}: dropdown stays closed on hover`, (await p.eval(`document.getElementById('home-dropdown-wrapper').dataset.open`)) === 'false' && (await p.eval(`getComputedStyle(document.getElementById('home-dropdown-menu')).visibility`)) === 'hidden');
  await click(p, '#home-dropdown-trigger');
  check(`${label}: dropdown opens on click`, (await p.eval(`document.getElementById('home-dropdown-wrapper').dataset.open`)) === 'true' && (await p.eval(`getComputedStyle(document.getElementById('home-dropdown-menu')).visibility`)) === 'visible');
  await p.mouse(700, 600); await sleep(500);
  check(`${label}: dropdown stays open when the pointer leaves`, (await p.eval(`document.getElementById('home-dropdown-wrapper').dataset.open`)) === 'true');
  await click(p, '#home-dropdown-trigger');
  check(`${label}: second click closes the dropdown`, (await p.eval(`document.getElementById('home-dropdown-wrapper').dataset.open`)) === 'false');
  await p.eval(`document.getElementById('home-dropdown-wrapper').dataset.open='false';document.getElementById('home-dropdown-trigger').focus()`);
  await p.key('ArrowDown'); await sleep(200);
  check(`${label}: ArrowDown opens dropdown and focuses first link`, (await p.eval(`document.activeElement.textContent.trim()`)) === 'Home 1');
  await p.key('Escape'); await sleep(200);
  check(`${label}: Escape closes dropdown, focus returns to trigger`, (await p.eval(`document.getElementById('home-dropdown-wrapper').dataset.open`)) === 'false' && (await p.eval(`document.activeElement.id`)) === 'home-dropdown-trigger');
  check(`${label}: current page marked in dropdown`, (await p.eval(`document.querySelector('#home-dropdown-menu [aria-current=page]')?.textContent.trim()`)) === (file === 'index.html' ? 'Home 1' : 'Home 2'));

  // Theme
  await click(p, '#theme-toggle-btn');
  check(`${label}: theme toggle → dark + persisted`, (await p.eval(`document.documentElement.classList.contains('dark')`)) && (await p.eval(`localStorage.getItem('atelier_elan_theme')`)) === 'dark');
  const bgDark = await p.eval(`getComputedStyle(document.body).backgroundColor`);
  await p.goto(ROOT + file);
  check(`${label}: dark persists after reload (no flash script)`, await p.eval(`document.documentElement.classList.contains('dark')`), bgDark);
  const hasTip = await p.eval(`!!document.getElementById('theme-toggle-btn').getAttribute('title')`);
  check(`${label}: theme button has no title/tooltip`, !hasTip);
  await click(p, '#theme-toggle-btn');
  check(`${label}: theme toggle → light`, !(await p.eval(`document.documentElement.classList.contains('dark')`)) && (await p.eval(`localStorage.getItem('atelier_elan_theme')`)) === 'light');

  // RTL / LTR
  check(`${label}: dir button label is exactly "RTL" (no icon)`, (await p.eval(`document.getElementById('dir-toggle-btn').textContent`)) === 'RTL' && (await p.eval(`document.getElementById('dir-toggle-btn').children.length`)) === 0);
  await click(p, '#dir-toggle-btn');
  check(`${label}: RTL applied, label → "LTR", persisted`, (await p.eval(`document.documentElement.dir`)) === 'rtl' && (await p.eval(`document.getElementById('dir-toggle-btn').textContent`)) === 'LTR' && (await p.eval(`localStorage.getItem('atelier_elan_dir_mode')`)) === 'rtl');
  const ov = await p.eval(`document.documentElement.scrollWidth <= innerWidth`);
  check(`${label}: no overflow in RTL @1440`, ov);
  const hAlign = await p.eval(`[...document.querySelectorAll('main h1, main h2')].filter(h=>getComputedStyle(h).textAlign==='right'||getComputedStyle(h).textAlign==='end').length`);
  check(`${label}: no right-aligned headings in RTL`, hAlign === 0, `${hAlign} offenders`);
  await p.goto(ROOT + file);
  check(`${label}: RTL persists after reload`, (await p.eval(`document.documentElement.dir`)) === 'rtl');
  await click(p, '#dir-toggle-btn');
  check(`${label}: back to LTR`, (await p.eval(`document.documentElement.dir`)) === 'ltr' && (await p.eval(`document.getElementById('dir-toggle-btn').textContent`)) === 'RTL');

  // Scroll to top
  await p.eval('window.scrollTo(0,0)'); await sleep(300);
  const hiddenAtTop = await p.eval(`getComputedStyle(document.getElementById('scroll-to-top-btn')).opacity`);
  await p.eval('window.scrollTo(0,1800)'); await sleep(600);
  check(`${label}: header gets scrolled state after scrolling`, await p.eval(`document.getElementById('main-header').classList.contains('header-scrolled')`));
  const shown = await p.eval(`getComputedStyle(document.getElementById('scroll-to-top-btn')).opacity`);
  check(`${label}: scroll-to-top hidden at top, visible after scroll`, hiddenAtTop === '0' && shown === '1', `${hiddenAtTop} → ${shown}`);
  await click(p, '#scroll-to-top-btn'); await sleep(1500);
  check(`${label}: scroll-to-top returns to top`, (await p.eval('window.scrollY')) < 5, 'scrollY=' + (await p.eval('window.scrollY')));

  check(`${label}: no console errors`, p.errors.length === 0, p.errors.join(' | '));
  p.close();

  // Mobile
  p = await open(file, 390, 844);
  const ctl = await p.eval(`['theme-toggle-btn','dir-toggle-btn'].map(id=>getComputedStyle(document.getElementById(id)).display)`);
  check(`${label}: theme + RTL controls hidden on mobile`, ctl.every((d) => d === 'none'), ctl.join());
  check(`${label}: desktop nav hidden, burger visible on mobile`, (await p.eval(`getComputedStyle(document.querySelector('.site-nav')).display`)) === 'none' && (await p.eval(`getComputedStyle(document.getElementById('mobile-menu-btn')).display`)) !== 'none');
  await click(p, '#mobile-menu-btn'); await sleep(500);
  check(`${label}: burger opens drawer (aria-expanded, visible, scroll locked)`, (await p.eval(`document.getElementById('mobile-menu-btn').getAttribute('aria-expanded')`)) === 'true' && (await p.eval(`getComputedStyle(document.getElementById('mobile-menu-drawer')).visibility`)) === 'visible' && (await p.eval(`document.documentElement.style.overflow`)) === 'hidden');
  const dr = await rect(p, '#mobile-menu-drawer');
  check(`${label}: drawer fits viewport`, dr.w <= 390 && dr.x + dr.w / 2 <= 391 && dr.x - dr.w / 2 >= -1, `w=${Math.round(dr.w)}`);
  const dl = await p.eval(`[...document.querySelectorAll('#mobile-menu-drawer a')].map(a=>a.textContent.trim()+'>'+a.getAttribute('href'))`);
  console.log('      drawer links:', dl.join(' | '));
  check(`${label}: drawer links complete`, ['Home 1>./index.html', 'Home 2>./home-2.html', 'About>./about.html', 'Courses>./courses.html', 'Gallery>./gallery.html', 'Contact>./contact.html', 'Student Login>./login.html'].every((x) => dl.includes(x)));
  await p.key('Escape'); await sleep(500);
  check(`${label}: Escape closes drawer`, (await p.eval(`document.getElementById('mobile-menu-btn').getAttribute('aria-expanded')`)) === 'false' && (await p.eval(`getComputedStyle(document.getElementById('mobile-menu-drawer')).visibility`)) === 'hidden');
  await click(p, '#mobile-menu-btn'); await sleep(450);
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 20, y: 400, button: 'left', clickCount: 1 }); await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 20, y: 400, button: 'left', clickCount: 1 }); await sleep(500);
  check(`${label}: backdrop click closes drawer`, (await p.eval(`document.getElementById('mobile-menu-btn').getAttribute('aria-expanded')`)) === 'false');
  // RTL drawer comes from the left
  await p.eval(`localStorage.setItem('atelier_elan_dir_mode','rtl')`); await p.goto(ROOT + file);
  await click(p, '#mobile-menu-btn'); await sleep(500);
  const rr = await rect(p, '#mobile-menu-drawer');
  check(`${label}: RTL mobile drawer opens from the left`, rr.x - rr.w / 2 <= 1, `left=${Math.round(rr.x - rr.w / 2)}`);
  await p.eval(`localStorage.removeItem('atelier_elan_dir_mode')`);
  check(`${label}: no console errors (mobile)`, p.errors.length === 0, p.errors.join(' | '));
  p.close();
}

// Shared header/footer consistency
console.log('\n== Shared layout ==');
const norm = (h, tag) => { const m = h.match(new RegExp(`<!-- @layout:${tag}:start -->([\\s\\S]*?)<!-- @layout:${tag}:end -->`)); return m && m[1].trim(); };
const h1 = fs.readFileSync('index.html', 'utf8'), h2 = fs.readFileSync('home-2.html', 'utf8');
check('Header markup identical in Home 1 and Home 2', norm(h1, 'header') && norm(h1, 'header') === norm(h2, 'header'));
check('Footer markup identical in Home 1 and Home 2', norm(h1, 'footer') && norm(h1, 'footer') === norm(h2, 'footer'));
check('Header/footer rendered from partials: no unresolved {{tokens}}, emblem sprite present, new lockup used', !/{{[^}]+}}/.test(h1) && !/{{[^}]+}}/.test(h2) && h1.includes('id="ae-emblem"') && h1.includes('brand-lockup--footer') && !/brand-emblem.svg/.test(h1 + h2));
check('Footer has exactly 4 social links', (norm(h1, 'footer').match(/class="site-footer__social"[\s\S]*?<\/ul>/)[0].match(/<a /g) || []).length === 4);
check('Footer has no image credits', !/credit|photo by|unsplash|pexels/i.test(norm(h1, 'footer')));

// Link integrity
for (const [label, html] of [['Home 1', h1], ['Home 2', h2]]) {
  const bad = []; let n = 0;
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(u)) { if (u === '#') bad.push('dead # link'); continue; }
    n++;
    if (!fs.existsSync(path.join(DIR, u.split('#')[0].split('?')[0]))) bad.push(u);
  }
  check(`${label}: all ${n} local hrefs/srcs resolve to files`, bad.length === 0, bad.join(', '));
}
const unresolvedPages = ['about.html', 'courses.html', 'gallery.html', 'contact.html', 'login.html'].filter((f) => !fs.existsSync(DIR + f));
check('Nav target pages exist', unresolvedPages.length === 0, unresolvedPages.join(','));

c.close();
const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(0);
