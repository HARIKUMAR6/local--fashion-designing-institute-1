// Header regression: Home dropdown (click-only) and header CTA visibility per breakpoint.
import { launch, newPage, sleep } from './cdp.mjs';
const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const c = await launch(9961);
let fails = 0;
const log = (ok, m) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); };

const mk = async (w, theme = 'light', dir = 'ltr', touch = false, page = 'index.html') => {
  const p = await newPage(c.port); p.errs = [];
  p.on((d) => { if (d.method === 'Runtime.exceptionThrown') p.errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); });
  await p.viewport(w, 900, w < 768);
  if (touch) await p.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await p.goto(ROOT + 'about.html');
  await p.eval(`localStorage.clear();localStorage.setItem('atelier_elan_theme','${theme}');localStorage.setItem('atelier_elan_dir_mode','${dir}')`);
  await p.goto(ROOT + page); await sleep(500);
  return p;
};
const state = (p) => p.eval(`(()=>{const i=document.getElementById('home-dropdown-wrapper'),t=document.getElementById('home-dropdown-trigger'),m=document.getElementById('home-dropdown-menu'),r=m.getBoundingClientRect();return {open:i.dataset.open||'unset',exp:t.getAttribute('aria-expanded'),vis:getComputedStyle(m).visibility,op:+getComputedStyle(m).opacity,inView:r.left>=0&&r.right<=innerWidth}})()`);
const centre = (p, sel) => p.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:e.left+e.width/2,y:e.top+e.height/2}})()`);
const mouseClick = async (p, x, y) => { await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'mouse' }); await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); await sleep(450); };
const isClosed = (s) => s.open === 'false' && s.exp === 'false' && s.vis === 'hidden' && s.op === 0;
const isOpen = (s) => s.open === 'true' && s.exp === 'true' && s.vis === 'visible' && s.op === 1 && s.inView;

// ---------- Home dropdown (desktop widths where the primary nav is shown) ----------
for (const [w, theme, dir] of [[1920, 'light', 'ltr'], [1440, 'light', 'ltr'], [1366, 'light', 'ltr'], [1440, 'dark', 'rtl'], [1366, 'dark', 'rtl'], [1200, 'light', 'ltr']]) {
  const tag = `${w}px ${theme}/${dir}`;
  const p = await mk(w, theme, dir);
  const T = await centre(p, '#home-dropdown-trigger');
  log(isClosed(await state(p)), `${tag}: closed on initial load`);

  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: T.x, y: T.y, pointerType: 'mouse' }); await sleep(450);
  log(isClosed(await state(p)), `${tag}: hovering Home does NOT open it`);

  await mouseClick(p, T.x, T.y);
  log(isOpen(await state(p)), `${tag}: click on Home opens it (visible, inside viewport)`);
  await mouseClick(p, T.x, T.y);
  log(isClosed(await state(p)), `${tag}: clicking Home again closes it`);

  await mouseClick(p, T.x, T.y);
  await mouseClick(p, 10, 600);
  log(isClosed(await state(p)), `${tag}: click outside closes it`);

  await mouseClick(p, T.x, T.y);
  await p.eval(`document.querySelector('.site-nav a[href="./about.html"]').addEventListener('click',e=>e.preventDefault())`);
  const A = await centre(p, '.site-nav a[href="./about.html"]');
  await mouseClick(p, A.x, A.y);
  log(isClosed(await state(p)), `${tag}: clicking another menu item closes it`);

  // keyboard
  await p.eval(`document.getElementById('home-dropdown-trigger').focus()`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(400);
  log(isOpen(await state(p)), `${tag}: keyboard Enter on Home opens it`);
  await p.key('Escape', 'Escape'); await sleep(400);
  const afterEsc = await state(p);
  log(isClosed(afterEsc) && (await p.eval(`document.activeElement.id`)) === 'home-dropdown-trigger', `${tag}: Escape closes it and returns focus to Home`);
  await p.key('ArrowDown', 'ArrowDown'); await sleep(400);
  log(isOpen(await state(p)) && (await p.eval(`document.activeElement.textContent.trim()`)) === 'Home 1', `${tag}: ArrowDown opens and focuses "Home 1"`);
  await p.eval(`document.querySelector('.site-nav a[href="./about.html"]').focus()`); await sleep(400);
  log(isClosed(await state(p)), `${tag}: moving focus to another item closes it`);

  // reload while the cursor rests over Home (the real-world "opens by itself" case)
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: T.x, y: T.y, pointerType: 'mouse' });
  await p.send('Page.reload'); await sleep(1500);
  log(isClosed(await state(p)), `${tag}: stays closed after refresh with the cursor resting on Home`);
  log(p.errs.length === 0, `${tag}: no JS errors ${p.errs.join('|')}`);
  p.close();
}

// touch
{
  const p = await mk(1366, 'light', 'ltr', true);
  const T = await centre(p, '#home-dropdown-trigger');
  const tap = async (x, y) => { await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(500); };
  log(isClosed(await state(p)), 'touch 1366px: closed on load');
  await tap(T.x, T.y); log(isOpen(await state(p)), 'touch 1366px: tap on Home opens it');
  await tap(T.x, T.y); log(isClosed(await state(p)), 'touch 1366px: second tap closes it');
  await tap(T.x, T.y); await tap(10, 600); log(isClosed(await state(p)), 'touch 1366px: tap outside closes it');
  p.close();
}

// ---------- Header CTA + layout per breakpoint ----------
const layout = (p) => p.eval(`(()=>{const q=(s)=>document.querySelector(s);const vis=(e)=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;const R=(e)=>{const r=e.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,cy:(r.top+r.bottom)/2}};const cta=q('.site-header__actions .site-cta'),brand=q('.site-header .brand-lockup'),nav=q('.site-nav'),burger=q('#mobile-menu-btn'),act=q('.site-header__actions');const items=[brand,nav,act].filter(vis).map(R).sort((a,b)=>a.l-b.l);let overlap=false;for(let i=1;i<items.length;i++)if(items[i].l<items[i-1].r-0.5)overlap=true;const navItems=[...document.querySelectorAll('.site-nav__item')].map((e)=>R(e));const gaps=navItems.slice(1).map((r,i)=>Math.round(r.l-navItems[i].r));return {ctaInDom:!!cta,ctaVisible:vis(cta),navVisible:vis(nav),burgerVisible:vis(burger),overlap,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,brandCy:brand?R(brand).cy:null,burgerCy:vis(burger)?R(burger).cy:null,actCy:R(act).cy,gaps,headerH:Math.round(q('#main-header').getBoundingClientRect().height),brandEdge:Math.round(document.dir==='rtl'?document.documentElement.clientWidth-R(brand).r:R(brand).l),rightEdge:Math.round(document.dir==='rtl'?R(act).l:document.documentElement.clientWidth-R(act).r),ctaInDrawer:!!q('#mobile-menu-drawer .site-cta--block')}})()`);
for (const [w, kind] of [[1920, 'desktop'], [1440, 'desktop'], [1366, 'desktop'], [1200, 'desktop'], [1199, 'tablet'], [1024, 'tablet'], [900, 'tablet'], [768, 'tablet'], [430, 'mobile'], [390, 'mobile'], [360, 'mobile'], [320, 'mobile']]) {
  for (const [theme, dir] of [['light', 'ltr'], ['dark', 'rtl']]) {
    const p = await mk(w, theme, dir); const L = await layout(p); const tag = `${w}px ${kind} ${theme}/${dir}`;
    const ctaOk = kind === 'desktop' ? L.ctaVisible : !L.ctaVisible;
    log(ctaOk && L.ctaInDom, `${tag}: header CTA ${kind === 'desktop' ? 'visible' : 'hidden'} (still in DOM)`);
    if (kind === 'desktop') log(L.navVisible && !L.burgerVisible && !L.overlap && L.overflow <= 0, `${tag}: nav shown, burger hidden, no overlap/overflow`);
    else {
      const aligned = Math.abs(L.brandCy - L.burgerCy) <= 1.5 && L.brandEdge >= 0 && Math.abs(L.brandEdge - L.rightEdge) <= 1.5;
      log(!L.navVisible && L.burgerVisible && !L.overlap && L.overflow <= 0 && aligned, `${tag}: brand + burger only, centred on one line, symmetric edges (${L.brandEdge}/${L.rightEdge}px), no overflow`);
      // drawer still works and keeps its own Student Login
      await p.eval(`document.getElementById('mobile-menu-btn').click()`); await sleep(500);
      const d = await p.eval(`(()=>{const d=document.getElementById('mobile-menu-drawer'),c=d.querySelector('.site-cta--block'),r=c.getBoundingClientRect();return {open:d.dataset.open,cta:getComputedStyle(c).display!=='none'&&r.width>0&&r.right<=innerWidth+0.5&&r.left>=-0.5}})()`);
      log(d.open === 'true' && d.cta && L.ctaInDrawer, `${tag}: mobile drawer opens and its Student Login CTA is visible`);
      await p.eval(`document.getElementById('mobile-menu-close-btn').click()`); await sleep(400);
      log((await p.eval(`document.getElementById('mobile-menu-drawer').dataset.open`)) === 'false', `${tag}: drawer closes`);
    }
    log(p.errs.length === 0, `${tag}: no JS errors`);
    p.close();
  }
}
// ---------- Home submenu: the 8-step flow at EVERY viewport (drawer below 1200px, dropdown from 1200px) ----------
const stopped = (p, sel) => p.eval(`document.querySelector(${JSON.stringify(sel)}).addEventListener('click',e=>e.preventDefault())`);
const drawerHome = (p) => p.eval(`(()=>{const w=document.getElementById('mobile-home-sub'),b=document.getElementById('mobile-home-trigger'),d=document.getElementById('mobile-menu-drawer'),links=[...w.querySelectorAll('a')];const vis=(a)=>{const r=a.getBoundingClientRect(),dr=d.getBoundingClientRect();return getComputedStyle(a).visibility!=='hidden'&&r.height>5&&r.width>5&&r.left>=dr.left-1&&r.right<=dr.right+1};return {open:w.dataset.open,exp:b.getAttribute('aria-expanded'),linksVisible:links.map(vis),drawer:d.dataset.open,tabbable:links.map((a)=>getComputedStyle(a).visibility!=='hidden')}})()`);
const homeClosed = (s) => s.open === 'false' && s.exp === 'false' && s.linksVisible.every((v) => !v) && s.tabbable.every((v) => !v);
const homeOpen = (s) => s.open === 'true' && s.exp === 'true' && s.linksVisible.length === 2 && s.linksVisible.every(Boolean);
for (const [w, kind] of [[1920, 'desktop'], [1440, 'desktop'], [1366, 'desktop'], [1024, 'tablet'], [900, 'tablet'], [768, 'tablet'], [430, 'mobile'], [390, 'mobile'], [360, 'mobile'], [320, 'mobile']]) {
  for (const [theme, dir] of [['light', 'ltr'], ['dark', 'rtl']]) {
    const tag = `${w}px ${kind} ${theme}/${dir}`;
    if (kind === 'desktop') {
      const p = await mk(w, theme, dir); const T = await centre(p, '#home-dropdown-trigger');
      const ok = [];
      ok.push(['1 initial load closed', isClosed(await state(p))]);
      ok.push(['2 (no drawer on desktop) burger hidden', !(await layout(p)).burgerVisible]);
      await mouseClick(p, T.x, T.y); ok.push(['3 click Home opens', isOpen(await state(p))]);
      await mouseClick(p, T.x, T.y); ok.push(['4 click Home again closes', isClosed(await state(p))]);
      await mouseClick(p, T.x, T.y); await mouseClick(p, 10, 600); ok.push(['5 click outside closes', isClosed(await state(p))]);
      await mouseClick(p, T.x, T.y); await stopped(p, '.site-nav a[href="./about.html"]');
      const A = await centre(p, '.site-nav a[href="./about.html"]'); await mouseClick(p, A.x, A.y); ok.push(['6 click another item closes', isClosed(await state(p))]);
      await mouseClick(p, T.x, T.y); const H2 = await centre(p, '#home-dropdown-menu a[href="./home-2.html"]'); await mouseClick(p, H2.x, H2.y); await sleep(1500);
      ok.push(['7 navigated to Home 2 and closed', (await p.eval('location.pathname')).endsWith('home-2.html') && isClosed(await state(p))]);
      await p.send('Page.reload'); await sleep(1500); ok.push(['8 refresh stays closed', isClosed(await state(p))]);
      for (const [n, v] of ok) log(v, `${tag}: ${n}`);
      p.close();
    } else {
      const p = await mk(w, theme, dir); const ok = [];
      ok.push(['1 initial load closed', homeClosed(await drawerHome(p))]);
      await p.eval(`document.getElementById('mobile-menu-btn').click()`); await sleep(600);
      const s2 = await drawerHome(p); ok.push(['2 drawer opened, Home still closed', s2.drawer === 'true' && homeClosed(s2)]);
      const click = async (sel) => { const r = await centre(p, sel); await mouseClick(p, r.x, r.y); };
      await click('#mobile-home-trigger'); await sleep(250); ok.push(['3 click Home opens', homeOpen(await drawerHome(p))]);
      await click('#mobile-home-trigger'); await sleep(250); ok.push(['4 click Home again closes', homeClosed(await drawerHome(p))]);
      await click('#mobile-home-trigger'); await sleep(250);
      const dr = await p.eval(`(()=>{const d=document.getElementById('mobile-menu-drawer').getBoundingClientRect(),h=document.querySelector('.mobile-drawer__head').getBoundingClientRect();return {x:d.left+4,y:h.bottom+6}})()`);
      await mouseClick(p, dr.x, dr.y); await sleep(250); const s5 = await drawerHome(p); ok.push(['5 click outside the Home group closes it', homeClosed(s5)]);
      await click('#mobile-home-trigger'); await sleep(250); await stopped(p, '#mobile-menu-drawer a[href="./about.html"]'); await click('#mobile-menu-drawer a[href="./about.html"]'); await sleep(500);
      const s6 = await drawerHome(p); ok.push(['6 click another item closes it', homeClosed(s6)]);
      await p.eval(`document.getElementById('mobile-menu-btn').click()`); await sleep(600); ok.push(['6b reopening the drawer: Home still closed', homeClosed(await drawerHome(p))]);
      await click('#mobile-home-trigger'); await sleep(250); await click('#mobile-home-sub a[href="./home-2.html"]'); await sleep(1500);
      const onHome2 = (await p.eval('location.pathname')).endsWith('home-2.html');
      ok.push(['7 navigated to Home 2 and closed', onHome2 && homeClosed(await drawerHome(p))]);
      await p.eval(`document.getElementById('mobile-menu-btn').click()`); await sleep(600); ok.push(['7b drawer reopened on Home 2: Home closed', homeClosed(await drawerHome(p))]);
      await click('#mobile-home-trigger'); await sleep(250); await p.send('Page.reload'); await sleep(1500);
      ok.push(['8 refresh with Home open: closed again', homeClosed(await drawerHome(p))]);
      await p.eval(`document.getElementById('mobile-menu-btn').click()`); await sleep(600); ok.push(['8b ...and still closed after opening the drawer', homeClosed(await drawerHome(p))]);
      if (w === 390 && theme === 'light') { await click('#mobile-home-trigger'); await sleep(500); await p.shot('tests/screenshots/brand-map/drawer-home-open-390.png', false); }
      ok.push(['no JS errors', p.errs.length === 0]);
      for (const [n, v] of ok) log(v, `${tag}: ${n}`);
      p.close();
    }
  }
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
