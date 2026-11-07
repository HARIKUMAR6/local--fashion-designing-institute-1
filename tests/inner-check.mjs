// About + Contact verification in real Chrome: structure, hero consistency, address/map, form behaviour, links.
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, sleep } from './cdp.mjs';
import { SITE, fullAddress } from '../src/js/site-config.js';

const DIR = 'D:/Nov/Nov slot 1/Fashion Designing Institute/';
const ROOT = 'file:///' + DIR.replace(/ /g, '%20');
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
const norm = (s) => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();

const c = await launch(9999);
const open = async (file, w = 1440, h = 900) => {
  const p = await newPage(c.port); p.errors = []; p.requests = [];
  p.on((d) => {
    if (d.method === 'Runtime.exceptionThrown') p.errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') p.errors.push(d.params.entry.text);
    if (d.method === 'Network.requestWillBeSent') p.requests.push(d.params.request);
  });
  await p.viewport(w, h, w < 768); await p.goto(ROOT + file);
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(700);
  return p;
};

// ---- 1. Structure ----
console.log('== Structure ==');
for (const f of ['about.html', 'contact.html']) {
  const p = await open(f);
  const n = await p.eval(`document.querySelectorAll('main > section').length`);
  const hs = await p.eval(`document.querySelectorAll('main h1').length`);
  const labelled = await p.eval(`[...document.querySelectorAll('main > section')].every(s=>s.getAttribute('aria-labelledby')&&document.getElementById(s.getAttribute('aria-labelledby')))`);
  check(`${f}: exactly 6 main sections`, n === 6, `found ${n}`);
  check(`${f}: one h1, every section labelled by a heading`, hs === 1 && labelled);
  check(`${f}: nav marks current page`, (await p.eval(`document.querySelector('.site-nav__link[aria-current=page]')?.textContent.trim()`)) === (f === 'about.html' ? 'About' : 'Contact') && (await p.eval(`document.getElementById('home-dropdown-trigger').dataset.current||'no'`)) === 'no');
  check(`${f}: no console errors`, p.errors.length === 0, p.errors.join(' | '));
  p.close();
}

// ---- 2. Hero consistency ----
console.log('\n== Hero consistency (About vs Contact) ==');
const HERO = `(() => { const h=document.querySelector('main > section.page-hero'); const r=h.getBoundingClientRect(); const bc=h.querySelector('.breadcrumb').getBoundingClientRect(); const t=h.querySelector('h1'); const cp=h.querySelector('.page-hero__copy').getBoundingClientRect(); const inner=h.querySelector('.atelier-container').getBoundingClientRect(); const img=h.querySelector('img'); const cs=getComputedStyle(t);
 return { h: Math.round(r.height), w: Math.round(r.width), bcTop: Math.round(bc.top-r.top), copyBottom: Math.round(r.bottom-cp.bottom), innerL: Math.round(inner.left), innerW: Math.round(inner.width), fs: cs.fontSize, lh: cs.lineHeight, ff: cs.fontFamily.slice(0,20), imgW: Math.round(img.getBoundingClientRect().width), imgH: Math.round(img.getBoundingClientRect().height), imgLoaded: img.complete&&img.naturalWidth>0, fits: h.scrollHeight<=h.clientHeight+1 && bc.bottom < t.getBoundingClientRect().top && cp.bottom <= r.bottom, topGap: Math.round(t.getBoundingClientRect().top - bc.bottom), vh: innerHeight, scrollW: document.documentElement.scrollWidth, iw: innerWidth }; })()`;
for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 780]]) {
  const a = await open('about.html', w, h), b = await open('contact.html', w, h);
  const A = await a.eval(HERO), B = await b.eval(HERO);
  const same = ['h', 'w', 'bcTop', 'copyBottom', 'innerL', 'innerW', 'fs', 'lh', 'ff', 'imgW', 'imgH'].every((k) => A[k] === B[k]);
  check(`@${w}x${h}: identical hero geometry/typography`, same, `About h=${A.h} Contact h=${B.h}, ${A.fs}, breadcrumb@${A.bcTop}px, ${Math.round(A.h / A.vh * 100)}% of viewport`);
  check(`@${w}: hero content fits (no clipping/overlap) on both`, A.fits && B.fits, `gaps ${A.topGap}/${B.topGap}`);
  check(`@${w}: hero images loaded, no horizontal overflow`, A.imgLoaded && B.imgLoaded && A.scrollW <= A.iw && B.scrollW <= B.iw);
  a.close(); b.close();
}
{
  const missing = ['courses.html', 'gallery.html', 'login.html'].filter((f) => !/page-hero/.test(fs.readFileSync(DIR + f, 'utf8')));
  console.log(`      NOTE: ${missing.join(', ')} are still unbuilt placeholders without .page-hero (out of scope); they should adopt the shared hero when built.`);
}

// ---- 3. Address + map ----
console.log('\n== Address & map ==');
const footer = fs.readFileSync(DIR + 'src/partials/footer.html', 'utf8');
const footerAddr = norm(footer.match(/<svg[^>]*><path d="M20 10c[\s\S]*?<\/svg><span>([\s\S]*?)<\/span>/)[1]);
const html = fs.readFileSync(DIR + 'contact.html', 'utf8');
const contactAddrs = [...html.matchAll(/<address[^>]*data-site-address[^>]*>([\s\S]*?)<\/address>/g)].map((m) => norm(m[1]));
check('Footer address equals site-config address', footerAddr === fullAddress(), `"${footerAddr}"`);
check('Contact Information + Visit sections both use the footer address', contactAddrs.length === 2 && contactAddrs.every((a) => a === footerAddr), contactAddrs.join(' | '));
check('Footer/Contact email, phone, hours match site-config',
  footer.includes(SITE.email) && html.includes(SITE.email) && html.includes(SITE.phone) && footer.includes(SITE.phone) && html.includes(SITE.hours.replace(/ /g, ' ')) , `${SITE.email} | ${SITE.phone}`);
{
  const p = await open('contact.html');
  const st = await p.eval(`({state:document.getElementById('map-slot').dataset.state, iframes:document.querySelectorAll('#map-slot iframe').length, pendingVisible:getComputedStyle(document.getElementById('map-pending')).display!=='none', txt:document.getElementById('map-pending').textContent.replace(/\\s+/g,' ').trim()})`);
  check('Map section: address unconfirmed → pending state, no random map', SITE.address.confirmed === false && st.state === 'pending' && st.iframes === 0 && st.pendingVisible, st.txt);
  const mapReq = p.requests.filter((r) => /google\.com\/maps/.test(r.url)).length;
  check('No Google Maps request is made while location is pending', mapReq === 0);
  p.close();
}

// ---- 4. Form ----
console.log('\n== Enquiry form ==');
{
  const p = await open('contact.html');
  const E = (expr) => p.eval(expr);
  const click = async (sel) => { const r = await E(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`); for (const t of ['mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type: t, x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(250); };
  const labels = await E(`[...document.querySelectorAll('#enquiry-form label')].map(l=>l.textContent.replace('*','').trim())`);
  check('Form has the six required controls with labels', JSON.stringify(labels) === JSON.stringify(['Full Name', 'Email Address', 'Phone Number', 'Course of Interest', 'Message']) && (await E(`document.querySelector('#enquiry-form button[type=submit]').textContent.trim()`)) === 'Submit Enquiry', labels.join(', '));
  check('Every control is associated with its label', await E(`[...document.querySelectorAll('#enquiry-form .field__control')].every(c=>document.querySelector('label[for="'+c.id+'"]'))`));

  await E(`document.getElementById('enquiry-form').scrollIntoView({behavior:'instant'})`); await sleep(300);
  await click('#enquiry-form button[type=submit]');
  let s = await E(`({inv:[...document.querySelectorAll('#enquiry-form [aria-invalid=true]')].map(e=>e.name), errs:[...document.querySelectorAll('.field__error[data-visible=true]')].length, focus:document.activeElement.name, status:document.getElementById('form-status').dataset.state, txt:document.getElementById('form-status-text').textContent, action:document.getElementById('form-status-action').hidden})`);
  check('Empty submit: all 5 fields flagged, first invalid focused, error status shown', s.inv.length === 5 && s.errs === 5 && s.focus === 'name' && s.status === 'error' && s.action === true, s.txt);

  const fill = (n, v) => E(`(()=>{const f=document.getElementById('enquiry-form').elements.${n};f.value=${JSON.stringify(v)};f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));f.dispatchEvent(new Event('blur'));})()`);
  await fill('name', 'A'); await fill('email', 'not-an-email'); await fill('phone', 'abc'); await fill('message', 'short');
  await click('#enquiry-form button[type=submit]');
  s = await E(`({msgs:Object.fromEntries([...document.querySelectorAll('.field__error[data-visible=true]')].map(e=>[e.id,e.textContent.trim()])), status:document.getElementById('form-status').dataset.state})`);
  check('Invalid values give specific messages (name, email, phone, course, message)', ['name-error', 'email-error', 'phone-error', 'course-error', 'message-error'].every((k) => s.msgs[k]) && /valid email/.test(s.msgs['email-error']) && /digits/.test(s.msgs['phone-error']), JSON.stringify(s.msgs).slice(0, 200));

  const before = p.requests.length;
  await fill('name', 'Marie Dupont'); await fill('email', 'marie@example.com'); await fill('phone', '+33 1 23 45 67 89'); await fill('course', 'Fashion Illustration'); await fill('message', 'I would like to know about the next intake and portfolio requirements.');
  s = await E(`({inv:document.querySelectorAll('#enquiry-form [aria-invalid=true]').length, errs:document.querySelectorAll('.field__error[data-visible=true]').length})`);
  check('Correcting fields clears their errors live', s.inv === 0 && s.errs === 0);
  await click('#enquiry-form button[type=submit]');
  s = await E(`({status:document.getElementById('form-status').dataset.state, txt:document.getElementById('form-status-text').textContent, href:document.getElementById('form-status-action').href, hidden:document.getElementById('form-status-action').hidden})`);
  const posts = p.requests.slice(before).filter((r) => r.method !== 'GET' || /mailto|formspree|submit/.test(r.url));
  check('Valid submit: "ready" state offering a mailto, NOT claiming delivery', s.status === 'ready' && !s.hidden && s.href.startsWith('mailto:' + SITE.email) && /not been sent/i.test(s.txt) && !/thank you|successfully sent|we have received/i.test(s.txt), s.txt.slice(0, 90));
  check('mailto carries the entered details', decodeURIComponent(s.href).includes('Marie Dupont') && decodeURIComponent(s.href).includes('Fashion Illustration') && decodeURIComponent(s.href).includes('marie@example.com'));
  check('No network submission was made', posts.length === 0, `${posts.length} non-GET requests`);
  check('Form has no action/method (no fake backend)', await E(`!document.getElementById('enquiry-form').getAttribute('action')`));
  check('Form: no console errors', p.errors.length === 0, p.errors.join(' | '));

  // Mobile usability
  p.close();
  const m = await open('contact.html', 390, 844);
  const u = await m.eval(`[...document.querySelectorAll('#enquiry-form .field__control, #enquiry-form button[type=submit]')].map(e=>{const r=e.getBoundingClientRect();return {h:Math.round(r.height),w:Math.round(r.width),fs:parseFloat(getComputedStyle(e).fontSize),in:r.left>=0&&r.right<=innerWidth}})`);
  check('Mobile form: controls ≥44px tall, ≥16px text (no iOS zoom), fully on screen', u.every((x) => x.h >= 44 && x.in) && u.filter((x, i) => i < 5).every((x) => x.fs >= 16), JSON.stringify(u.map((x) => x.h)));
  const cta = await m.eval(`[...document.querySelectorAll('main > section:last-of-type a')].map(a=>{const r=a.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),cx:Math.round(r.left+r.width/2)}})`);
  check('Mobile CTA buttons: identical size, centred', cta.length === 2 && cta[0].w === cta[1].w && cta[0].h === cta[1].h && Math.abs(cta[0].cx - 195) <= 2 && Math.abs(cta[1].cx - 195) <= 2, JSON.stringify(cta));
  m.close();
}

// ---- 5. Links ----
console.log('\n== Links ==');
for (const f of ['about.html', 'contact.html']) {
  const h = fs.readFileSync(DIR + f, 'utf8'); const bad = []; let n = 0;
  for (const m of h.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1]; if (/^(https?:|mailto:|tel:|data:)/.test(u)) continue;
    if (u.startsWith('#')) { if (u.length > 1 && !h.includes(`id="${u.slice(1)}"`)) bad.push(u); continue; }
    n++; const [file, frag] = u.split('#'); const full = path.join(DIR, file.split('?')[0]);
    if (!fs.existsSync(full)) bad.push(u); else if (frag && !fs.readFileSync(full, 'utf8').includes(`id="${frag}"`)) bad.push(u + ' (missing anchor)');
  }
  check(`${f}: ${n} local links/images resolve (incl. #anchors)`, bad.length === 0, bad.join(', '));
  check(`${f}: no dead "#" links`, !/href="#"/.test(h));
}
c.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(0);
