// Branding parity + contrast, Dashboard navigation, heading alignment on every page, section spacing limits.
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';

const DIR = 'D:/Nov/Nov slot 1/Fashion Designing Institute/';
const ROOT = 'file:///' + DIR.replace(/ /g, '%20');
let fails = 0, total = 0;
const check = (name, ok, info = '') => { total++; if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
const c = await launch(9811);

const open = async (file, w = 1440, { dark = false, rtl = false, h = 900 } = {}) => {
  const p = await newPage(c.port); p.errors = [];
  p.on((d) => { if (d.method === 'Runtime.exceptionThrown') p.errors.push(d.params.exceptionDetails.text); if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error' && !/fonts\.g/.test(d.params.entry.url || '') && !/fonts\.g/.test(d.params.entry.text)) p.errors.push(d.params.entry.text); });
  await p.viewport(w, h, w < 768);
  await p.goto(ROOT + 'about.html');
  await p.eval(`localStorage.setItem('atelier_elan_theme','${dark ? 'dark' : 'light'}');localStorage.setItem('atelier_elan_dir_mode','${rtl ? 'rtl' : 'ltr'}')`);
  await p.goto(ROOT + file);
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(1000);
  return p;
};

// Colour helpers run in the page: any CSS colour -> rgba via canvas; WCAG contrast; effective background compositing.
const HELPERS = `
  const rgba = (css) => { const x = document.createElement('canvas').getContext('2d'); x.clearRect(0,0,1,1); x.fillStyle = '#000'; x.fillStyle = css; x.fillRect(0,0,1,1); const d = x.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
  const over = (f, b) => [0,1,2].map(i => f[i]*f[3] + b[i]*(1-f[3]));
  const lum = (c) => { const [r,g,b] = c.map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*r+0.7152*g+0.0722*b; };
  const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };
  const bgOf = (el) => { const stack = []; while (el) { const c = rgba(getComputedStyle(el).backgroundColor); if (c[3] > 0) stack.push(c); if (c[3] >= 1) break; el = el.parentElement; } let base = [255,255,255]; for (let i = stack.length-1; i >= 0; i--) base = over(stack[i], base); return base; };
  const textContrast = (el) => { const bg = bgOf(el); const fg = rgba(getComputedStyle(el).color); return ratio(over(fg, bg), bg); };
`;

console.log('== Header / footer branding parity ==');
for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) for (const dark of [false, true]) {
  const p = await open('index.html', w, { dark, h });
  await p.eval('window.scrollTo(0, 99999)'); await sleep(300);
  const r = await p.eval(`(() => { ${HELPERS}
    const q = (s) => document.querySelector(s);
    const hn = q('.site-header .brand-lockup__name'), fn = q('.site-footer .brand-lockup__name');
    const hs = q('.site-header .brand-lockup__sub'), fs = q('.site-footer .brand-lockup__sub');
    const he = q('.site-header .brand-lockup__emblem').getBoundingClientRect(), fe = q('.site-footer .brand-lockup__emblem').getBoundingClientRect();
    const fz = (e) => parseFloat(getComputedStyle(e).fontSize);
    const useHref = (s) => q(s + ' use').getAttribute('href');
    const cs = (e, p) => getComputedStyle(e)[p];
    const edge = rgba(getComputedStyle(q('.site-header .brand-lockup__emblem')).getPropertyValue('--emblem-edge').trim());
    const fill = rgba(getComputedStyle(q('.site-header .brand-lockup__emblem')).getPropertyValue('--emblem-bg').trim());
    const hdrBg = bgOf(q('.site-header')), ftrBg = bgOf(q('.site-footer'));
    return {
      names: [hn.textContent.trim().replace(/\\s+/g,' '), fn.textContent.trim().replace(/\\s+/g,' ')],
      sym: [useHref('.site-header .brand-lockup__emblem'), useHref('.site-footer .brand-lockup__emblem')],
      emblemAspect: [he.width/he.height, fe.width/fe.height],
      emblemToText: [he.height/fz(hn), fe.height/fz(fn)],
      font: [cs(hn,'fontFamily'), cs(fn,'fontFamily')], track: [cs(hn,'letterSpacing')+'/'+fz(hn), cs(fn,'letterSpacing')+'/'+fz(fn)],
      gapRatio: [(q('.site-header .brand-lockup__text').getBoundingClientRect().left - he.right)/fz(hn), (q('.site-footer .brand-lockup__text').getBoundingClientRect().left - fe.right)/fz(fn)],
      centred: [Math.abs((he.top+he.height/2) - q('.site-header .brand-lockup').getBoundingClientRect().top - q('.site-header .brand-lockup').getBoundingClientRect().height/2), Math.abs((fe.top+fe.height/2) - q('.site-footer .brand-lockup').getBoundingClientRect().top - q('.site-footer .brand-lockup').getBoundingClientRect().height/2)],
      hName: textContrast(hn), fName: textContrast(fn), hSub: hs && cs(hs,'display') !== 'none' ? textContrast(hs) : null, fSub: fs ? textContrast(fs) : 99,
      hEdge: ratio(edge, hdrBg), fEdge: ratio(edge, ftrBg), hFill: ratio(fill, hdrBg), fFill: ratio(fill, ftrBg),
      hAccent: textContrast(q('.site-header .brand-lockup__name em')), fAccent: textContrast(q('.site-footer .brand-lockup__name em')),
      emblemFill: [cs(q('.site-header .brand-lockup__emblem'),'color'), cs(q('.site-footer .brand-lockup__emblem'),'color')],
      hdrBg: hdrBg.map(Math.round), ftrBg: ftrBg.map(Math.round) }; })()`);
  const tag = `@${w} ${dark ? 'dark' : 'light'}`;
  const near = (a, b, t = 0.04) => Math.abs(a / b - 1) <= t;
  check(`${tag}: footer uses exactly the header's brand name`, r.names[0] === r.names[1], `"${r.names[0]}"`);
  check(`${tag}: same emblem symbol and same fill colour`, r.sym[0] === r.sym[1] && r.emblemFill[0] === r.emblemFill[1], `${r.sym[0]}, ${r.emblemFill[0]}`);
  check(`${tag}: identical proportions (emblem aspect, emblem:text size, gap, typography)`, near(r.emblemAspect[0], r.emblemAspect[1]) && near(r.emblemToText[0], r.emblemToText[1], 0.06) && Math.abs(r.gapRatio[0] - r.gapRatio[1]) < 0.06 && r.font[0] === r.font[1] && r.track[0].split('/')[0] !== undefined, `aspect ${r.emblemAspect.map((x) => x.toFixed(3))}, emblem/text ${r.emblemToText.map((x) => x.toFixed(2))}, gap ${r.gapRatio.map((x) => x.toFixed(2))}em`);
  check(`${tag}: emblem vertically centred with its text`, r.centred[0] < 1.5 && r.centred[1] < 1.5, `${r.centred.map((x) => x.toFixed(1))}px off`);
  check(`${tag}: brand text contrast ≥ 4.5:1 (name, italic accent, subtitle)`, [r.hName, r.fName, r.hAccent, r.fAccent, r.hSub ?? 99, r.fSub].every((x) => x >= 4.5), `header ${r.hName.toFixed(1)}/${r.hAccent.toFixed(1)}/${r.hSub?.toFixed?.(1) ?? 'n/a'}, footer ${r.fName.toFixed(1)}/${r.fAccent.toFixed(1)}/${r.fSub.toFixed(1)}`);
  check(`${tag}: emblem never disappears (edge or fill ≥ 3:1 against its background)`, Math.max(r.hEdge, r.hFill) >= 3 && Math.max(r.fEdge, r.fFill) >= 3, `header edge ${r.hEdge.toFixed(1)} fill ${r.hFill.toFixed(1)}; footer edge ${r.fEdge.toFixed(1)} fill ${r.fFill.toFixed(1)}`);
  p.close();
}

console.log('\n== Dashboard navigation ==');
{
  const route = fs.existsSync(DIR + 'dashboard/index.html') ? './dashboard/index.html' : null;
  check('Existing dashboard route is dashboard/index.html', !!route);
  for (const [file, label] of [['index.html', 'Home 1'], ['home-2.html', 'Home 2'], ['about.html', 'About'], ['courses.html', 'Courses'], ['gallery.html', 'Gallery'], ['contact.html', 'Contact']]) {
    const p = await open(file, 1440);
    const r = await p.eval(`({ desktop: [...document.querySelectorAll('.site-nav a')].filter(a => a.textContent.trim()==='Dashboard').map(a => a.getAttribute('href')), drawer: [...document.querySelectorAll('.mobile-drawer a')].filter(a => a.textContent.trim()==='Dashboard').map(a => a.getAttribute('href')), order: [...document.querySelectorAll('.site-nav__list > li')].map(l => l.textContent.trim().replace(/\\s+/g,' ').split(' ')[0]), cur: document.querySelector('.site-nav a[aria-current=page]')?.textContent.trim() || '' })`);
    check(`${label}: exactly one Dashboard item in the nav and one in the drawer, both → ${route}`, r.desktop.length === 1 && r.drawer.length === 1 && r.desktop[0] === route && r.drawer[0] === route && r.order.at(-1) === 'Dashboard', `order: ${r.order.join(' · ')}`);
    check(`${label}: Dashboard is not wrongly marked current`, r.cur !== 'Dashboard');
    p.close();
  }
  // Click through from desktop
  let p = await open('index.html', 1440);
  const href = await p.eval(`(()=>{const a=[...document.querySelectorAll('.site-nav a')].find(a=>a.textContent.trim()==='Dashboard');const r=a.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,hov:null}})()`);
  await p.mouse(href.x, href.y); await sleep(250);
  const hover = await p.eval(`(()=>{const a=[...document.querySelectorAll('.site-nav a')].find(a=>a.textContent.trim()==='Dashboard');return getComputedStyle(a).color+'|'+getComputedStyle(a,'::after').transform})()`);
  const base = await p.eval(`(()=>{const a=[...document.querySelectorAll('.site-nav a')].find(a=>a.textContent.trim()==='About');return getComputedStyle(a).color+'|'+getComputedStyle(a,'::after').transform})()`);
  check('Dashboard has a hover state (colour/underline change)', hover !== base, `${hover} vs ${base}`);
  for (const t of ['mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type: t, x: href.x, y: href.y, button: 'left', clickCount: 1, pointerType: 'mouse' });
  await sleep(1200);
  let url = await p.eval('location.pathname');
  check('Desktop click opens the existing Student Dashboard', /\/dashboard\/index\.html$/.test(url), url);
  const dashOk = await p.eval(`({h1: document.querySelector('h1')?.textContent.trim(), broken: [...document.images].filter(i=>i.complete&&!i.naturalWidth).length})`);
  check('Dashboard page renders (heading present, no broken images)', !!dashOk.h1 && dashOk.broken === 0, dashOk.h1);
  p.close();
  // Mobile + tablet: drawer
  for (const w of [390, 768, 1024]) {
    p = await open('index.html', w, { h: 900 });
    const vis = await p.eval(`getComputedStyle(document.querySelector('.site-nav')).display`);
    await p.eval(`document.getElementById('mobile-menu-btn').click()`); await sleep(500);
    const link = await p.eval(`(()=>{const a=[...document.querySelectorAll('#mobile-menu-drawer a')].find(a=>a.textContent.trim()==='Dashboard');const r=a.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,visible:r.width>0&&r.bottom<=innerHeight&&r.top>=0}})()`);
    check(`@${w}: drawer open, Dashboard link visible and inside the viewport`, vis === 'none' && link.visible);
    for (const t of ['mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type: t, x: link.x, y: link.y, button: 'left', clickCount: 1 });
    await sleep(1200); url = await p.eval('location.pathname');
    check(`@${w}: tapping Dashboard opens the Student Dashboard`, /\/dashboard\/index\.html$/.test(url), url);
    p.close();
  }
  // RTL desktop
  p = await open('index.html', 1440, { rtl: true });
  const rtl = await p.eval(`(()=>{const l=[...document.querySelectorAll('.site-nav__list > li')];const first=l[0].getBoundingClientRect().left, last=l.at(-1).getBoundingClientRect().left;return {dash:l.at(-1).textContent.trim(), mirrored: last < first, fits: document.documentElement.scrollWidth<=innerWidth}})()`);
  check('RTL: Dashboard sits at the end of the mirrored nav, no overflow', rtl.dash === 'Dashboard' && rtl.mirrored && rtl.fits);
  p.close();
  // Header fits at every width (no brand/nav overlap, no overflow)
  for (const w of [1200, 1280, 1366, 1440, 1920]) {
    p = await open('contact.html', w);
    const r = await p.eval(`(()=>{const b=document.querySelector('.site-header .brand-lockup').getBoundingClientRect(), n=document.querySelector('.site-nav').getBoundingClientRect(), a=document.querySelector('.site-header__actions').getBoundingClientRect();return {gapBN:n.left-b.right, gapNA:a.left-n.right, over:document.documentElement.scrollWidth>innerWidth}})()`);
    check(`@${w}: header brand / nav / actions do not collide`, r.gapBN >= 8 && r.gapNA >= 8 && !r.over, `gaps ${Math.round(r.gapBN)}px / ${Math.round(r.gapNA)}px`);
    p.close();
  }
}

console.log('\n== Heading alignment (never right-aligned) ==');
const PAGES = ['index.html', 'home-2.html', 'about.html', 'courses.html', 'gallery.html', 'contact.html', 'login.html', 'dashboard/index.html'];
for (const pg of PAGES) {
  const bad = [];
  for (const w of [1440, 390]) for (const rtl of [false, true]) {
    const p = await open(pg, w, { rtl });
    const r = await p.eval(`[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h=>h.getBoundingClientRect().width>0).map(h=>{const cs=getComputedStyle(h);let a=cs.textAlign;if(a==='start')a=cs.direction==='rtl'?'right':'left';if(a==='end')a=cs.direction==='rtl'?'left':'right';return {a,t:h.textContent.trim().slice(0,24)}}).filter(x=>x.a==='right')`);
    if (r.length) bad.push(`${w}${rtl ? ' rtl' : ''}: ${r.map((x) => x.t).join(', ')}`);
    p.close();
  }
  check(`${pg}: no right-aligned headings (LTR + RTL, desktop + mobile)`, bad.length === 0, bad.join(' | '));
}

console.log('\n== Section spacing (Home 1, Courses) ==');
for (const pg of ['index.html', 'courses.html']) for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
  const p = await open(pg, w, { h });
  const r = await p.eval(`[...document.querySelectorAll('main > section')].slice(1).map(s=>{const cs=getComputedStyle(s);return {id:s.getAttribute('aria-labelledby'),pt:parseFloat(cs.paddingTop),pb:parseFloat(cs.paddingBottom),h:Math.round(s.getBoundingClientRect().height)}})`);
  const limit = w >= 1280 ? 82 : w >= 768 ? 72 : 60;
  check(`${pg} @${w}: every section's vertical padding ≤ ${limit}px`, r.every((s) => s.pt <= limit && s.pb <= limit), r.map((s) => s.pt + '/' + s.pb).join(' '));
  check(`${pg} @${w}: no horizontal overflow`, await p.eval('document.documentElement.scrollWidth<=innerWidth'));
  p.close();
}
console.log('\n== No horizontal overflow on any page (non-emulated, so the layout viewport cannot grow) ==');
for (const pg of PAGES) {
  const bad = [];
  for (const w of [360, 390, 768, 1024, 1280, 1440]) for (const dark of [false, true]) {
    const p = await newPage(c.port); await p.viewport(w, 844, false);
    await p.goto(ROOT + 'about.html'); await p.eval(`localStorage.setItem('atelier_elan_theme','${dark ? 'dark' : 'light'}')`);
    await p.goto(ROOT + pg); await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(700);
    const r = await p.eval(`({sw:document.documentElement.scrollWidth, iw:innerWidth})`);
    if (r.sw > r.iw) bad.push(`${w}${dark ? ' dark' : ''}: ${r.sw}>${r.iw}`);
    p.close();
  }
  check(`${pg}: no horizontal overflow at 360/390/768/1024/1280/1440 (light + dark)`, bad.length === 0, bad.join(' | '));
}
c.close();
console.log(`\n${total - fails}/${total} checks passed`);
process.exit(fails ? 1 : 0);
