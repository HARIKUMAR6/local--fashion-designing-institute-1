// Student portal audit: login flows, dashboard views/interactions, brand links, theme x direction x viewport matrix.
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';
const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const c = await launch(9888);
let fails = 0; const log = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const shots = process.argv.includes('--shots');
if (shots) fs.mkdirSync('tests/screenshots/portal', { recursive: true });
const mk = async (w = 1440, h = 900, theme = 'light', dir = 'ltr') => {
  const p = await newPage(c.port); p.errs = [];
  p.on((d) => { if (d.method === 'Runtime.exceptionThrown') p.errs.push(d.params.exceptionDetails.text + ' ' + (d.params.exceptionDetails.exception?.description || '')); if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') if (!/fonts.(googleapis|gstatic).com/.test(d.params.entry.text + (d.params.entry.url || ''))) p.errs.push(d.params.entry.text + ' ' + (d.params.entry.url || '')); });
  await p.viewport(w, h, w < 768);
  await p.goto(ROOT + 'about.html');
  await p.eval(`localStorage.clear();localStorage.setItem('atelier_elan_theme','${theme}');localStorage.setItem('atelier_elan_dir_mode','${dir}')`);
  return p;
};
const val = (p, id, v) => p.eval(`(()=>{const e=document.getElementById('${id}');e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const click = (p, sel) => p.eval(`document.querySelector(${JSON.stringify(sel)}).click()`);
const q = (p, expr) => p.eval(expr);

// ===================== LOGIN =====================
{
  const p = await mk(); await p.goto(ROOT + 'login.html');
  log(await q(p, `document.title.includes('Student Login')`), 'login loads');
  await click(p, '#form-signin button[type=submit]');
  log(await q(p, `document.getElementById('si-email-err').dataset.visible==='true'&&document.getElementById('si-pw-err').dataset.visible==='true'`), 'sign-in: empty fields show email + password errors');
  await val(p, 'si-email', 'not-an-email'); await val(p, 'si-pw', 'short');
  await click(p, '#form-signin button[type=submit]');
  log((await q(p, `document.querySelector('#si-email-err span').textContent`)).includes('valid email') && (await q(p, `document.querySelector('#si-pw-err span').textContent`)).includes('8 characters'), 'sign-in: invalid email + short password messages');
  // show/hide
  await click(p, '[data-toggle-pw=si-pw]');
  log((await q(p, `document.getElementById('si-pw').type`)) === 'text' && (await q(p, `document.querySelector('[data-toggle-pw=si-pw]').getAttribute('aria-label')`)) === 'Hide password', 'password show works');
  await click(p, '[data-toggle-pw=si-pw]');
  log((await q(p, `document.getElementById('si-pw').type`)) === 'password', 'password hide works');
  // social
  await click(p, '[data-social=Google]');
  let t = await q(p, `document.querySelector('#al-signin p').textContent`);
  log(t.includes('Google') && t.includes('not connected') && t.includes('not been signed in') && (await q(p, `location.pathname.endsWith('login.html')`)), 'Google: not-connected message, no navigation');
  await click(p, '[data-social=Apple]'); t = await q(p, `document.querySelector('#al-signin p').textContent`);
  log(t.includes('Apple') && t.includes('not connected'), 'Apple: not-connected message');
  log(await q(p, `!!document.querySelector('[data-social=Google] svg path[fill="#4285F4"]')&&!!document.querySelector('[data-social=Apple] svg path')`), 'Google multicolour G + Apple logo present');
  // remember me + valid sign in
  await val(p, 'si-email', 'student@example.com'); await val(p, 'si-pw', 'Secret123'); await click(p, '#si-remember');
  await click(p, '#form-signin button[type=submit]');
  log((await q(p, `document.getElementById('al-signin').dataset.state`)) === 'success' && (await q(p, `document.querySelector('#al-signin p').textContent`)).includes('nothing was verified'), 'valid sign-in: honest prototype message');
  log((await q(p, `localStorage.getItem('atelier_portal_remember_email')`)) === 'student@example.com', 'Remember me stores email only');
  const leaked = await q(p, `JSON.stringify(Object.entries(localStorage)).includes('Secret123')||JSON.stringify(Object.entries(sessionStorage)).includes('Secret123')`);
  log(!leaked, 'password is never stored');
  await sleep(1900);
  log(await q(p, `location.pathname.endsWith('/dashboard/index.html')`), 'valid sign-in navigates to dashboard prototype');
  p.close();
}
{
  const p = await mk(); await p.goto(ROOT + 'login.html');
  await p.eval(`localStorage.setItem('atelier_portal_remember_email','saved@example.com')`); await p.goto(ROOT + 'login.html');
  log((await q(p, `document.getElementById('si-email').value`)) === 'saved@example.com' && await q(p, `document.getElementById('si-remember').checked`), 'Remember me pre-fills email on return');
  // create account
  await click(p, '[data-go=create]');
  log(await q(p, `!document.querySelector('[data-view=create]').hidden&&document.querySelector('[data-view=signin]').hidden&&location.hash==='#create'`), 'Create Account view opens');
  await click(p, '#form-create button[type=submit]');
  log(await q(p, `['ca-name','ca-email','ca-phone','ca-pw','ca-pw2','ca-terms'].every(i=>document.getElementById(i+'-err').dataset.visible==='true')`), 'create: all 6 required-field errors');
  await val(p, 'ca-name', 'Test Student'); await val(p, 'ca-email', 'bad@'); await val(p, 'ca-phone', 'abc'); await val(p, 'ca-pw', 'weakpass'); await val(p, 'ca-pw2', 'different');
  await click(p, '#form-create button[type=submit]');
  const m = await q(p, `['ca-email','ca-phone','ca-pw','ca-pw2'].map(i=>document.querySelector('#'+i+'-err span').textContent)`);
  log(m[0].includes('valid email') && m[1].includes('digits') && m[2].includes('requirements') && m[3].includes('do not match'), `create: email/phone/password/confirm messages ${JSON.stringify(m)}`);
  log(await q(p, `document.querySelector('[data-rule=len]').dataset.ok==='true'&&document.querySelector('[data-rule=up]').dataset.ok==='false'`), 'password rule checklist is live');
  await val(p, 'ca-email', 'test@example.com'); await val(p, 'ca-phone', '+33 1 23 45 67 89'); await val(p, 'ca-pw', 'Strong123'); await val(p, 'ca-pw2', 'Strong123');
  await click(p, '#form-create button[type=submit]');
  log(await q(p, `document.getElementById('ca-terms-err').dataset.visible==='true'`), 'create: terms required');
  await click(p, '#open-terms'); log(await q(p, `document.getElementById('terms-dlg').open`), 'terms dialog opens'); await click(p, '#terms-dlg [data-close]');
  await click(p, '#ca-terms'); await click(p, '#form-create button[type=submit]');
  const done = await q(p, `({vis:!document.getElementById('create-done').hidden,txt:document.getElementById('create-done-text').textContent,stored:JSON.stringify(Object.entries(localStorage)).includes('Strong123')})`);
  log(done.vis && done.txt.includes('no account was created') && !done.stored, `create success feedback is honest: "${done.txt.slice(0, 70)}…"`);
  await click(p, '[data-view=create] [data-go=signin]');
  log(await q(p, `!document.querySelector('[data-view=signin]').hidden&&document.getElementById('si-email').value==='test@example.com'`), 'Return to Sign In works');
  // forgot
  await click(p, '[data-go=forgot]');
  log(await q(p, `!document.querySelector('[data-view=forgot]').hidden`), 'Forgot Password view opens');
  await click(p, '#form-forgot button[type=submit]'); log(await q(p, `document.getElementById('al-forgot').dataset.state==='error'`), 'forgot: empty email error');
  await val(p, 'fp-email', 'x@y'); await click(p, '#form-forgot button[type=submit]'); log(await q(p, `document.getElementById('fp-email-err').dataset.visible==='true'`), 'forgot: invalid email error');
  await val(p, 'fp-email', 'me@example.com'); await click(p, '#form-forgot button[type=submit]');
  const t = await q(p, `document.querySelector('#al-forgot p').textContent`);
  log(t.includes('no password reset email has been sent') && !/has been sent to .*\. (Check|Please)/.test(t), 'forgot: success does not claim an email was sent');
  log(p.errs.length === 0, `login console errors: ${p.errs.join('|') || 'none'}`);
  p.close();
}

// ===================== BRAND + "BACK TO WEBSITE" =====================
for (const [file, rel] of [['login.html', './'], ['dashboard/index.html', '../']]) {
  const p = await mk(); await p.goto(ROOT + file);
  const r = await q(p, `(()=>{const links=[...document.querySelectorAll('a.brand-lockup')];return {n:links.length,hrefs:[...new Set(links.map(a=>a.getAttribute('href')))],hasName:links.every(a=>a.querySelector('.brand-lockup__name')&&a.querySelector('svg')),back:/back to (the )?(main )?(web|home)|return to (the )?(web|home)/i.test(document.body.innerText),backLinks:[...document.querySelectorAll('a')].filter(a=>/back to|return to/i.test(a.textContent+a.getAttribute('aria-label'))).length}})()`);
  log(r.hrefs.length === 1 && r.hrefs[0] === `${rel}index.html` && r.hasName && !r.back && r.backLinks === 0, `${file}: logo+name are one link to ${rel}index.html (${r.n} brand links), no "back to website" text/link`);
  p.close();
}
{
  const p = await mk(); await p.goto(ROOT + 'login.html');
  await click(p, '.brand-lockup'); await sleep(400);
  log(await q(p, `location.pathname.endsWith('/index.html')&&!location.pathname.includes('login')`), 'login brand click -> public Home');
  for (const v of ['#create', '#forgot']) { await p.goto(ROOT + 'login.html' + v); await click(p, '.brand-lockup__name'); await sleep(300); if (!(await q(p, `location.pathname.endsWith('/index.html')`))) log(false, `brand name from ${v}`); }
  log(true, 'brand name click from Create/Forgot views -> Home');
  await p.goto(ROOT + 'dashboard/index.html'); await click(p, '.sb .brand-lockup'); await sleep(400);
  log(await q(p, `location.pathname.endsWith('/index.html')&&!location.pathname.includes('dashboard')`), 'dashboard sidebar brand -> public Home');
  await p.viewport(390, 844, true); await p.goto(ROOT + 'dashboard/index.html'); await click(p, '.tb__brand .brand-lockup__name'); await sleep(400);
  log(await q(p, `location.pathname.endsWith('/index.html')&&!location.pathname.includes('dashboard')`), 'dashboard mobile brand name -> public Home');
  p.close();
}

// ===================== DASHBOARD =====================
{
  const p = await mk(); await p.goto(ROOT + 'dashboard/index.html');
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(500);
  const NAVS = ['dashboard', 'courses', 'learning', 'assignments', 'schedule', 'announcements', 'certificates', 'profile', 'settings'];
  const links = await q(p, `[...document.querySelectorAll('#sb-links a')].map(a=>a.textContent.trim().replace(/\\d+$/,''))`);
  log(links.join('|') === 'Dashboard|My Courses|My Learning|Assignments|Class Schedule|Announcements|Certificates|My Profile|Settings', `sidebar items ${links.join(', ')}`);
  log((await q(p, `document.querySelector('.sb__foot a').textContent.trim()`)) === 'Logout', 'Logout item present');
  for (const v of NAVS) {
    await click(p, `[data-nav=${v}]`); await sleep(120);
    const r = await q(p, `({vis:[...document.querySelectorAll('[data-view]')].filter(s=>!s.hidden).map(s=>s.dataset.view),cur:document.querySelector('[data-nav][aria-current=page]')?.dataset.nav,crumb:document.getElementById('crumb-page').textContent,h1:document.activeElement.tagName})`);
    log(r.vis.length === 1 && r.vis[0] === v && r.cur === v && r.h1 === 'H1', `nav ${v}: single view shown, active state, breadcrumb "${r.crumb}"`);
  }
  await click(p, '[data-nav=dashboard]');
  const o = await q(p, `({en:st_enrolled.textContent,co:st_completed.textContent,pe:st_pending.textContent,cl:st_classes.textContent,ring:ring_pct.textContent,first:document.querySelector('[data-first]').textContent})`.replace(/st_enrolled|st_completed|st_pending|st_classes|ring_pct/g, (m) => `document.getElementById('${m.replace('_', m.startsWith('ring') ? '-' : '-')}')`));
  log(o.en === '3' && o.co === '1' && o.pe === '4' && o.cl === '7' && o.ring === '57%', `overview stats ${JSON.stringify(o)}`);
  // courses
  await click(p, '[data-nav=courses]');
  const cs = await q(p, `[...document.querySelectorAll('#course-list .course')].map(a=>({n:a.querySelector('.course__name').textContent,img:a.querySelector('img').naturalWidth>0,pct:a.querySelector('.course__pct span:last-child').textContent,btn:a.querySelector('button').textContent}))`);
  log(cs.length === 3 && cs.every((x) => x.img) && cs[0].pct === '41%' && cs[0].btn === 'Continue Learning' && cs[2].pct === '100%', `my courses ${JSON.stringify(cs.map((x) => `${x.n} ${x.pct}`))}`);
  const uniq = await q(p, `new Set([...document.querySelectorAll('#course-list img')].map(i=>i.src)).size`); log(uniq === 3, 'each course has its own image');
  // learning: continue
  await click(p, '#course-list [data-learn=dip]'); await sleep(150);
  log((await q(p, `location.hash`)) === '#learning' && (await q(p, `document.getElementById('learn-pct').textContent`)) === '41%', 'Continue Learning opens My Learning for that course');
  await click(p, '#learn-continue'); log((await q(p, `document.getElementById('learn-pct').textContent`)) === '44%', 'lesson completion updates progress 41%->44%');
  await click(p, '[data-lc=tex]'); log((await q(p, `document.getElementById('learn-continue').disabled`)) === true, 'completed course: continue disabled');
  await click(p, '[data-nav=dashboard]'); log((await q(p, `document.getElementById('ring-pct').textContent`)) === '59%', 'overview ring updates after learning (59%)');
  // assignments
  await click(p, '[data-nav=assignments]');
  log((await q(p, `document.querySelectorAll('#assign-list > li').length`)) === 7, 'assignments list 7');
  await click(p, '[data-f=pending]'); log((await q(p, `document.querySelectorAll('#assign-list > li').length`)) === 4, 'filter pending = 4');
  await click(p, '[data-f=submitted]'); log((await q(p, `document.querySelectorAll('#assign-list > li').length`)) === 3, 'filter submitted = 3');
  await click(p, '[data-f=pending]'); await click(p, '[data-view-assign=a1]');
  log(await q(p, `document.getElementById('assign-dlg').open&&document.getElementById('ad-title').textContent==='Design development sketchbook'`), 'View Assignment dialog opens');
  await click(p, '#ad-submit'); await sleep(100);
  log((await q(p, `document.querySelectorAll('#assign-list > li').length`)) === 3 && (await q(p, `document.querySelector('[data-badge=assignments]').textContent`)) === '3', 'mark submitted updates list + sidebar badge');
  log((await q(p, `document.getElementById('assign-list').textContent.includes('Overdue')`)), 'overdue state shown');
  // schedule
  await click(p, '[data-nav=schedule]');
  log((await q(p, `document.querySelectorAll('#week .day').length`)) === 7 && (await q(p, `document.querySelectorAll('#sched-list .cls').length`)) === 8, 'schedule: 7-day strip + 8 classes');
  await click(p, '#week [data-day="2"]'); log((await q(p, `document.querySelectorAll('#sched-list .cls').length`)) === 1 && (await q(p, `document.getElementById('sched-list').textContent.includes('Portfolio critique')`)), 'schedule: day filter');
  await click(p, '#sched-all'); log((await q(p, `document.querySelectorAll('#sched-list .cls').length`)) === 8, 'schedule: all classes');
  log(await q(p, `['Studio','Critique','Lecture','Workshop','Completed','Today','Upcoming'].every(w=>document.getElementById('sched-list').textContent.includes(w))`), 'class types + statuses shown');
  // announcements
  await click(p, '[data-nav=announcements]');
  log((await q(p, `document.querySelector('[data-badge=announcements]').textContent`)) === '4', 'announcements: 4 unread badge');
  await click(p, '[data-ann=n2]'); log((await q(p, `document.querySelector('[data-ann=n2]').closest('.ann').dataset.open`)) === 'true' && (await q(p, `document.querySelector('[data-badge=announcements]').textContent`)) === '3', 'Read more expands and marks read');
  // notifications
  await click(p, '#notif-btn'); log(await q(p, `document.getElementById('notif-panel').dataset.open==='true'&&document.querySelectorAll('#notif-list [data-notif]').length===3`), 'notification dropdown lists 3 unread');
  await p.key('Escape'); log(await q(p, `document.getElementById('notif-panel').dataset.open==='false'`), 'Escape closes dropdown');
  await click(p, '#notif-btn'); await click(p, '#notif-readall'); log(await q(p, `document.getElementById('notif-dot').hidden`), 'mark all read clears notification dot');
  // certificates
  await click(p, '[data-nav=certificates]');
  const ct = await q(p, `document.getElementById('cert-list').textContent`);
  log(ct.includes('Course completed') && ct.includes('Nothing has been issued') && ct.includes('Not enrolled') && !/certified|awarded|earned/i.test(ct), 'certificates: honest states, nothing issued');
  // profile
  await click(p, '[data-nav=profile]');
  await val(p, 'pr-name', ''); await click(p, '#form-profile button[type=submit]'); log(await q(p, `document.getElementById('pr-name-err').dataset.visible==='true'`), 'profile: validation');
  await val(p, 'pr-name', 'Sam Rivera'); await click(p, '#form-profile button[type=submit]');
  log((await q(p, `document.querySelector('.tb__user-name').textContent`)) === 'Sam Rivera' && (await q(p, `JSON.parse(localStorage.getItem('atelier_portal_state')).profile.name`)) === 'Sam Rivera', 'profile save updates top bar + local storage');
  // settings
  await click(p, '[data-nav=settings]');
  await click(p, '[data-theme-set=dark]'); log(await q(p, `document.documentElement.classList.contains('dark')&&document.querySelector('[data-theme-set=dark]').getAttribute('aria-pressed')==='true'`), 'settings: theme -> dark synced');
  await click(p, '[data-dir-set=rtl]'); log(await q(p, `document.documentElement.dir==='rtl'&&document.querySelector('[data-dir-set=rtl]').getAttribute('aria-pressed')==='true'&&document.getElementById('dir-toggle-btn').textContent==='LTR'`), 'settings: direction -> RTL synced');
  await click(p, '[data-dir-set=ltr]'); await click(p, '[data-theme-set=light]');
  await click(p, '[data-pref=alerts]'); log(await q(p, `document.getElementById('notif-dot').hidden`), 'preference switch works (alerts off hides dot)');
  await click(p, '#reset-data'); log((await q(p, `document.querySelector('.tb__user-name').textContent`)) === 'Alex Moreau', 'Reset sample data restores defaults');
  // top bar menu + logout
  await click(p, '#user-btn'); log(await q(p, `document.getElementById('user-panel').dataset.open==='true'`), 'profile dropdown opens');
  log((await q(p, `document.querySelector('#user-panel [data-logout]').getAttribute('href')`)) === '../login.html' && (await q(p, `document.querySelector('#logout-link').getAttribute('href')`)) === '../login.html', 'logout links -> login page');
  await click(p, '#logout-link'); await sleep(400); log(await q(p, `location.pathname.endsWith('/login.html')`), 'Logout navigates to Login Portal');
  log(p.errs.length === 0, `dashboard console errors: ${p.errs.join('|') || 'none'}`);
  p.close();
}
// drawer
{
  const p = await mk(390, 844); await p.goto(ROOT + 'dashboard/index.html');
  const s0 = await q(p, `({inert:document.getElementById('sidebar').inert,burger:getComputedStyle(document.getElementById('sb-open')).display,ctlsInDrawer:!!document.querySelector('#sb-ctl-slot #theme-toggle-btn')})`);
  log(s0.inert && s0.burger !== 'none' && s0.ctlsInDrawer, `mobile: sidebar is an inert drawer, burger visible, theme/dir controls moved into drawer ${JSON.stringify(s0)}`);
  await click(p, '#sb-open'); await sleep(350);
  log(await q(p, `document.getElementById('sidebar').dataset.open==='true'&&!document.getElementById('sidebar').inert&&document.getElementById('sb-backdrop').dataset.open==='true'`), 'drawer opens with backdrop');
  await click(p, '[data-nav=assignments]'); await sleep(350);
  log(await q(p, `document.getElementById('sidebar').dataset.open==='false'&&location.hash==='#assignments'`), 'drawer closes after navigation');
  await click(p, '#sb-open'); await p.key('Escape'); log(await q(p, `document.getElementById('sidebar').dataset.open==='false'`), 'Escape closes drawer');
  p.close();
}

// ===================== MATRIX: theme x dir x viewport =====================
const SIZES = [[1440, 900], [1280, 720], [1024, 768], [768, 1024], [390, 844], [360, 740]];
const probe = (kind) => `(()=>{const de=document.documentElement;
  const outside=[...document.querySelectorAll('body *')].filter(e=>{if(e.closest('.sb,.dd__panel,dialog,.toast,svg'))return false;const b=e.getBoundingClientRect();return b.width>0&&(b.right>innerWidth+2||b.left<-2)}).map(e=>e.className||e.tagName).slice(0,3);
  const sb=document.getElementById('sidebar');const sbr=sb?sb.getBoundingClientRect():null;
  const bg=getComputedStyle(document.body).backgroundColor, fg=getComputedStyle(document.body).color;
  return {dark:de.classList.contains('dark'),dir:de.dir,overflow:de.scrollWidth>innerWidth,broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length,outside,bg,fg,sbSide:sbr?(sbr.left<innerWidth/2?'start-left':'start-right'):null,sbVisible:sbr?(sbr.right>0&&sbr.left<innerWidth):null,
    artSide:document.querySelector('.pl__art')?((()=>{const b=document.querySelector('.pl__art').getBoundingClientRect();return b.left+b.width/2>innerWidth/2})()?'right':'left'):null}})()`;
for (const file of ['login.html', 'dashboard/index.html']) for (const [w, h] of SIZES) for (const theme of ['light', 'dark']) for (const dir of ['ltr', 'rtl']) {
  const p = await mk(w, h, theme, dir); await p.goto(ROOT + file);
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(500);
  const views = file.startsWith('dash') ? ['dashboard', 'courses', 'learning', 'assignments', 'schedule', 'announcements', 'certificates', 'profile', 'settings'] : ['signin', 'create', 'forgot'];
  let bad = [];
  for (const v of views) {
    if (file.startsWith('dash')) await p.eval(`location.hash='#${v}'`); else await p.eval(`location.hash='${v === 'signin' ? '' : '#' + v}';window.dispatchEvent(new HashChangeEvent('hashchange'))`);
    await sleep(120);
    const r = await q(p, probe());
    const lightBg = r.bg === 'rgb(250, 248, 245)', darkBg = r.bg === 'rgb(18, 17, 16)';
    const ok = r.dark === (theme === 'dark') && r.dir === dir && !r.overflow && !r.broken && !r.outside.length && (theme === 'dark' ? darkBg : lightBg);
    if (!ok) bad.push(`${v}:${JSON.stringify(r)}`);
    if (file.startsWith('dash') && w >= 1024 && r.sbVisible !== true) bad.push(`${v}: sidebar not visible`);
    if (file.startsWith('dash') && w >= 1024 && r.sbSide !== (dir === 'ltr' ? 'start-left' : 'start-right')) bad.push(`${v}: sidebar side ${r.sbSide} in ${dir}`);
    if (!file.startsWith('dash') && w >= 1024 && v === 'signin' && r.artSide !== (dir === 'ltr' ? 'right' : 'left')) bad.push(`art side ${r.artSide} in ${dir}`);
    if (shots && ((w === 1440 && dir === 'ltr' && theme === 'light') || (w === 390 && theme === 'light' && dir === 'ltr' && (v === 'dashboard' || v === 'signin')) || (w === 1440 && theme === 'dark' && dir === 'rtl' && (v === 'dashboard' || v === 'signin')) || (w === 768 && theme === 'light' && dir === 'ltr' && (v === 'dashboard' || v === 'signin')))) await p.shot(`tests/screenshots/portal/${file.startsWith('dash') ? 'dash' : 'login'}_${v}_${w}_${theme}_${dir}.png`, !(file.startsWith('dash') && w < 1024 ? false : false));
  }
  if (p.errs.length) bad.push('console: ' + p.errs.join('|'));
  if (bad.length) log(false, `${file} ${w} ${theme} ${dir}: ${bad.join(' || ').slice(0, 600)}`);
  p.close();
}
log(fails === 0, 'matrix: login + dashboard × 6 viewports × 2 themes × 2 directions × every view');

// ===================== links + no backend =====================
for (const [file, rel] of [['login.html', './'], ['dashboard/index.html', '../']]) {
  const p = await mk(); await p.goto(ROOT + file);
  const hrefs = await q(p, `[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')))]`);
  const bad = hrefs.filter((h) => !h.startsWith('#') && !fs.existsSync((file.startsWith('dash') ? 'dashboard/' : '') + h.split('#')[0]));
  log(bad.length === 0, `${file}: ${hrefs.length} links resolve ${bad.join(',')}`);
  p.close();
}
const src = ['login.html', 'dashboard/index.html', 'src/js/portal.js', 'src/js/portal-login.js', 'src/js/portal-dashboard.js', 'src/js/portal-data.js'].map((f) => fs.readFileSync(f, 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<p[^>]*>[^<]*<\/p>/g, '');
log(!/\bfetch\(|XMLHttpRequest|WebSocket|accounts\.google|appleid|firebase|oauth|\.post\(|axios/i.test(src), 'no network calls / OAuth / backend references in portal code');
c.close();
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(fails ? 1 : 0);
