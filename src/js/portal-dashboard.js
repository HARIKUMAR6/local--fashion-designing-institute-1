/**
 * ATELIER ÉLAN – Student dashboard (frontend prototype, sample data).
 * Hash-routed views, no backend. State that persists (lesson progress, assignment status, read
 * announcements, profile edits, preferences) lives in this browser's localStorage and contains no
 * credentials. Dark/light and LTR/RTL are handled by the shared theme.js / direction.js modules.
 */
import { STUDENT, COURSES, ASSIGNMENTS, CLASSES, ANNOUNCEMENTS } from './portal-data.js';

const STATE_KEY = 'atelier_portal_state';
const VIEWS = { dashboard: 'Dashboard', courses: 'My Courses', learning: 'My Learning', assignments: 'Assignments', schedule: 'Class Schedule', announcements: 'Announcements', certificates: 'Certificates', profile: 'My Profile', settings: 'Settings' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function initDashboard() {
  const app = document.querySelector('.app');
  if (!app) return;
  const $ = (id) => document.getElementById(id);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = (n, c = '') => `<svg class="i ${c}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;

  /* ----- state ----------------------------------------------------------- */
  const fresh = () => ({ done: {}, assign: {}, read: [], prefs: { reminders: true, alerts: true, summary: false }, profile: { name: STUDENT.name, email: STUDENT.email, phone: STUDENT.phone, city: STUDENT.city, bio: STUDENT.bio } });
  let S = fresh();
  try { const raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); if (raw) S = { ...fresh(), ...raw, prefs: { ...fresh().prefs, ...raw.prefs }, profile: { ...fresh().profile, ...raw.profile } }; } catch { /* storage blocked */ }
  const save = () => { try { localStorage.setItem(STATE_KEY, JSON.stringify(S)); } catch { /* ignore */ } };

  /* ----- derived data ---------------------------------------------------- */
  const modules = (c) => c.modules.map((m, i) => ({ ...m, done: Math.min(m.lessons, S.done[c.id]?.[i] ?? m.done) }));
  const progress = (c) => { const m = modules(c); const total = m.reduce((a, x) => a + x.lessons, 0); const done = m.reduce((a, x) => a + x.done, 0); return { total, done, pct: Math.round((done / total) * 100) }; };
  const assignments = () => ASSIGNMENTS.map((a) => { const status = S.assign[a.id] || a.status; return { ...a, status, overdue: status === 'pending' && a.due < 0 }; });
  const isRead = (id) => S.read.includes(id);
  const unread = () => ANNOUNCEMENTS.filter((n) => !isRead(n.id));
  const courseName = (id) => COURSES.find((c) => c.id === id)?.name || '';
  const date = (offset) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset); return d; };
  const fmt = (d, o) => d.toLocaleDateString('en-GB', o);
  const fDate = (off) => fmt(date(off), { weekday: 'short', day: 'numeric', month: 'short' });
  const rel = (off) => (off === 0 ? 'Today' : off === 1 ? 'Tomorrow' : off > 1 ? `In ${off} days` : off === -1 ? '1 day ago' : `${-off} days ago`);
  const endTime = (t, mins) => { const [h, m] = t.split(':').map(Number); const e = h * 60 + m + mins; return `${String(Math.floor(e / 60) % 24).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`; };
  const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.dataset.show = 'true'; clearTimeout(toast.id); toast.id = setTimeout(() => { t.dataset.show = 'false'; }, 2800); };

  /* ----- identity -------------------------------------------------------- */
  function renderIdentity() {
    const p = S.profile;
    $$('[data-name]').forEach((e) => { e.textContent = p.name; });
    $$('[data-email]').forEach((e) => { e.textContent = p.email; });
    $$('[data-first]').forEach((e) => { e.textContent = p.name.split(/\s+/)[0]; });
    $$('[data-programme]').forEach((e) => { e.textContent = STUDENT.programme; });
    $$('[data-sid]').forEach((e) => { e.textContent = STUDENT.id; });
    $$('[data-avatar]').forEach((e) => { if (!e.querySelector('img')) e.textContent = initials(p.name); });
  }

  /* ----- chips ----------------------------------------------------------- */
  const aChip = (a) => (a.status === 'submitted' ? '<span class="chip" data-tone="ok">Submitted</span>' : a.overdue ? '<span class="chip" data-tone="bad">Overdue</span>' : '<span class="chip" data-tone="warn">Pending</span>');
  const dueText = (a) => (a.status === 'submitted' ? `Due ${fDate(a.due)}` : a.overdue ? `Was due ${fDate(a.due)}` : `Due ${fDate(a.due)} · ${rel(a.due)}`);
  const cChip = (c) => (c.day < 0 ? '<span class="chip" data-tone="ok">Completed</span>' : c.day === 0 ? '<span class="chip" data-tone="accent">Today</span>' : '<span class="chip">Upcoming</span>');
  const classRow = (c) => `<div class="cls"><div class="cls__time">${c.time}<small>to ${endTime(c.time, c.mins)}</small></div><div class="cls__body"><div class="row-main"><div><p class="row-title">${esc(c.title)}</p><p class="row-sub">${esc(courseName(c.course))} · ${fDate(c.day)}</p></div><div style="display:flex;gap:0.4rem;flex-wrap:wrap"><span class="chip" data-tone="accent">${c.type}</span>${cChip(c)}</div></div><p class="row-sub" style="margin:0!important">In the studio · room details to be confirmed</p></div></div>`;

  /* ----- views ----------------------------------------------------------- */
  function renderDashboard() {
    const all = COURSES.map((c) => ({ c, p: progress(c) }));
    const asg = assignments();
    const upcoming = CLASSES.filter((c) => c.day >= 0).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    $('st-enrolled').textContent = COURSES.length;
    $('st-completed').textContent = all.filter((x) => x.p.pct === 100).length;
    $('st-pending').textContent = asg.filter((a) => a.status === 'pending').length;
    $('st-classes').textContent = upcoming.length;
    const tot = all.reduce((a, x) => a + x.p.total, 0), dn = all.reduce((a, x) => a + x.p.done, 0);
    const pct = Math.round((dn / tot) * 100);
    $('ring-pct').textContent = `${pct}%`;
    $('ring-val').style.strokeDashoffset = String(326.7 * (1 - pct / 100));
    $('dash-progress').innerHTML = all.map(({ c, p }) => `<li><div class="row-main"><span class="row-title">${esc(c.name)}</span><span class="row-sub" style="margin:0!important">${p.pct}% · ${p.done}/${p.total} lessons</span></div><div class="bar ${p.pct === 100 ? 'bar--done' : ''}" style="--p:${p.pct}%"><span></span></div></li>`).join('');
    $('dash-classes').innerHTML = upcoming.slice(0, 3).map(classRow).join('') || '<p class="panel__body row-sub">No upcoming classes.</p>';
    const due = asg.filter((a) => a.status === 'pending').sort((a, b) => a.due - b.due).slice(0, 3);
    $('dash-due').innerHTML = due.map((a) => `<li><div class="row-main"><span class="row-title">${esc(a.title)}</span>${aChip(a)}</div><p class="row-sub" style="margin:0!important">${esc(courseName(a.course))} · ${dueText(a)}</p></li>`).join('') || '<li><p class="row-sub">Nothing pending. Well done.</p></li>';
    const n = ANNOUNCEMENTS[0];
    $('dash-ann').innerHTML = `<div class="ann"><div class="row-main"><p class="row-title">${esc(n.title)}</p><span class="row-sub" style="margin:0!important">${fDate(n.day)}</span></div><p class="row-sub" style="margin:0!important">${esc(n.short)}</p><a class="pf-link" style="justify-self:start" href="#announcements">Read more</a></div>`;
  }

  function renderCourses() {
    $('course-list').innerHTML = COURSES.map((c) => {
      const p = progress(c);
      return `<article class="panel course"><div class="course__img"><img src="${c.image}" alt="${esc(c.alt)}" loading="lazy" style="object-position:${c.pos}"></div>
        <div class="course__body"><div><h2 class="course__name">${esc(c.name)}</h2><p class="row-sub">${esc(c.short)}</p></div>
        <div class="course__meta"><span>Instructor: to be assigned</span><span>Duration: ${c.duration}</span><span>${p.done} of ${p.total} lessons</span></div>
        <div class="course__prog"><div class="course__pct"><span>${p.pct === 100 ? 'Completed' : 'In progress'}</span><span>${p.pct}%</span></div><div class="bar ${p.pct === 100 ? 'bar--done' : ''}" style="--p:${p.pct}%"><span></span></div></div>
        <div><button type="button" class="pf-btn pf-btn--auto pf-btn--sm" data-learn="${c.id}">${p.pct === 100 ? 'Review course' : 'Continue Learning'}</button></div></div></article>`;
    }).join('');
  }

  let learnId = COURSES[0].id;
  function renderLearning() {
    $('learn-tabs').innerHTML = COURSES.map((c) => `<button type="button" class="tab" data-lc="${c.id}" aria-pressed="${c.id === learnId}">${esc(c.name)}</button>`).join('');
    const c = COURSES.find((x) => x.id === learnId), m = modules(c), p = progress(c);
    const cur = m.findIndex((x) => x.done < x.lessons);
    $('learn-mods').innerHTML = m.map((x, i) => {
      const st = x.done === x.lessons ? 'done' : i === cur ? 'current' : 'upcoming';
      return `<li data-state="${st}"><span class="mod__ic">${icon(st === 'done' ? 'check' : st === 'current' ? 'play' : 'clock', 'i--sm')}</span><div><p class="row-title">${esc(x.title)}</p><p class="row-sub">${x.done} of ${x.lessons} lessons</p></div><span class="chip" data-tone="${st === 'done' ? 'ok' : st === 'current' ? 'accent' : ''}">${st === 'done' ? 'Completed' : st === 'current' ? 'Current' : 'Upcoming'}</span></li>`;
    }).join('');
    $('learn-name').textContent = c.name; $('learn-pct').textContent = `${p.pct}%`;
    const bar = $('learn-bar'); bar.style.setProperty('--p', `${p.pct}%`); bar.classList.toggle('bar--done', p.pct === 100);
    const btn = $('learn-continue');
    const lessons = [];
    m.forEach((x) => { for (let k = x.done + 1; k <= x.lessons; k++) lessons.push(`${x.title} · Lesson ${k} of ${x.lessons}`); });
    $('learn-next').textContent = lessons.length ? `Next: ${lessons[0]}` : 'You have completed every lesson in this course.';
    btn.disabled = !lessons.length; btn.textContent = lessons.length ? 'Continue learning' : 'Course complete';
    $('learn-upcoming').innerHTML = lessons.slice(0, 3).map((l) => `<li><p class="row-title">${esc(l)}</p></li>`).join('') || '<li><p class="row-sub">No lessons left.</p></li>';
  }

  let aFilter = 'all';
  function renderAssignments() {
    $$('#assign-tabs .tab').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.f === aFilter)));
    const list = assignments().filter((a) => aFilter === 'all' || a.status === aFilter).sort((a, b) => a.due - b.due);
    $('assign-list').innerHTML = list.map((a) => `<li><div class="row-main"><div><p class="row-title">${esc(a.title)}</p><p class="row-sub">${esc(courseName(a.course))} · ${dueText(a)}</p></div><div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">${aChip(a)}<button type="button" class="pf-btn pf-btn--ghost pf-btn--auto pf-btn--sm" data-view-assign="${a.id}">View Assignment</button></div></div></li>`).join('') || '<li><p class="row-sub">No assignments in this filter.</p></li>';
  }

  let selDay = null;
  function renderSchedule() {
    $('week').innerHTML = Array.from({ length: 7 }, (_, i) => { const d = date(i); const has = CLASSES.some((c) => c.day === i); return `<button type="button" class="day" data-day="${i}" data-has="${has}" aria-pressed="${selDay === i}" aria-label="${fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}${has ? ', has classes' : ''}"><small>${fmt(d, { weekday: 'short' })}</small><b>${d.getDate()}</b><i></i></button>`; }).join('');
    $('sched-all').setAttribute('aria-pressed', String(selDay === null));
    const list = CLASSES.filter((c) => selDay === null || c.day === selDay).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    $('sched-list').innerHTML = list.map(classRow).join('') || '<p class="panel__body row-sub">No classes on this day.</p>';
  }

  const openAnn = new Set();
  function renderAnnouncements() {
    $('ann-list').innerHTML = ANNOUNCEMENTS.map((n) => `<article class="ann" data-open="${openAnn.has(n.id)}"><div class="row-main"><div style="display:flex;gap:0.6rem;align-items:center"><span class="dd__dot" data-read="${isRead(n.id)}" style="margin:0" aria-hidden="true"></span><h2 class="row-title">${esc(n.title)}</h2>${isRead(n.id) ? '' : '<span class="chip" data-tone="accent">New</span>'}</div><span class="row-sub" style="margin:0!important">${fDate(n.day)}</span></div><p class="row-sub" style="margin:0!important">${esc(n.short)}</p><p class="ann__more">${esc(n.more)}</p><button type="button" class="pf-link" style="justify-self:start" data-ann="${n.id}" aria-expanded="${openAnn.has(n.id)}">${openAnn.has(n.id) ? 'Show less' : 'Read more'}</button></article>`).join('');
  }

  function renderCertificates() {
    const enrolled = COURSES.map((c) => { const p = progress(c); const done = p.pct === 100; return `<article class="panel cert pcol-6"><span class="cert__seal">${icon('award', 'i--lg')}</span><div><h2 class="course__name" style="font-size:1.4rem">${esc(c.name)}</h2></div>${done ? '<span class="chip" data-tone="ok" style="justify-self:start">Course completed</span><p class="row-sub" style="margin:0!important">All sample lessons are complete. Certificate status is to be confirmed by the institute. Nothing has been issued in this prototype.</p>' : `<span class="chip" data-tone="warn" style="justify-self:start">In progress · ${p.pct}%</span><div class="bar" style="--p:${p.pct}%"><span></span></div><p class="row-sub" style="margin:0!important">Certificate status is shown once the course is complete.</p>`}</article>`; }).join('');
    $('cert-list').innerHTML = enrolled + `<article class="panel cert pcol-6"><span class="cert__seal">${icon('award', 'i--lg')}</span><h2 class="course__name" style="font-size:1.4rem">Advanced Fashion Designing</h2><span class="chip" style="justify-self:start">Not enrolled</span><p class="row-sub" style="margin:0!important">Enrol in this course to track its completion here.</p></article>`;
  }

  function renderProfile() {
    const f = $('form-profile'), p = S.profile;
    f.name.value = p.name; f.email.value = p.email; f.phone.value = p.phone; f.city.value = p.city || ''; f.bio.value = p.bio || '';
    ['pr-name', 'pr-email', 'pr-phone'].forEach((id) => setErr($(id), ''));
  }

  function renderSettings() {
    const dark = document.documentElement.classList.contains('dark'), dir = document.documentElement.dir || 'ltr';
    $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.themeSet === 'dark') === dark)));
    $$('[data-dir-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dirSet === dir)));
    $$('[data-pref]').forEach((i) => { i.checked = !!S.prefs[i.dataset.pref]; });
  }

  function renderChrome() {
    const pend = assignments().filter((a) => a.status === 'pending').length, un = unread().length;
    const setBadge = (k, n) => { const b = document.querySelector(`[data-badge="${k}"]`); b.textContent = n; b.hidden = !n; };
    setBadge('assignments', pend); setBadge('announcements', un);
    $('notif-dot').hidden = !(un && S.prefs.alerts);
    const list = S.prefs.alerts ? unread() : [];
    $('notif-list').innerHTML = list.map((n) => `<button type="button" class="dd__item" data-notif="${n.id}"><span class="dd__dot" aria-hidden="true"></span><span><strong>${esc(n.title)}</strong><span class="dd__note">${esc(n.short)}</span></span></button>`).join('') || `<p class="dd__item" style="cursor:default">${S.prefs.alerts ? 'You are all caught up.' : 'Announcement alerts are switched off in Settings.'}</p>`;
  }

  function renderAll() { renderIdentity(); renderDashboard(); renderCourses(); renderLearning(); renderAssignments(); renderSchedule(); renderAnnouncements(); renderCertificates(); renderSettings(); renderChrome(); }

  /* ----- router ---------------------------------------------------------- */
  const views = $$('[data-view]');
  function route(focus = true) {
    let name = location.hash.slice(1);
    if (!VIEWS[name]) name = 'dashboard';
    views.forEach((v) => { v.hidden = v.dataset.view !== name; });
    $$('[data-nav]').forEach((a) => (a.dataset.nav === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    $('crumb-page').textContent = VIEWS[name];
    document.title = `${VIEWS[name]} – ATELIER ÉLAN Student Portal`;
    if (name === 'profile') renderProfile();
    if (name === 'settings') renderSettings();
    closeDrawer(); closeMenus();
    window.scrollTo(0, 0);
    if (focus) document.querySelector(`[data-view="${name}"] h1`)?.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', () => route());

  /* ----- drawer (sidebar becomes a drawer below 1024px) ------------------- */
  const sb = $('sidebar'), backdrop = $('sb-backdrop'), openBtn = $('sb-open');
  const mq = window.matchMedia('(max-width: 1023.98px)');
  const syncInert = () => { sb.inert = mq.matches && sb.dataset.open !== 'true'; };
  function openDrawer() { sb.dataset.open = 'true'; backdrop.dataset.open = 'true'; openBtn.setAttribute('aria-expanded', 'true'); syncInert(); document.body.style.overflow = 'hidden'; $('sb-close').focus(); }
  function closeDrawer(restore = false) { if (sb.dataset.open !== 'true') return; sb.dataset.open = 'false'; backdrop.dataset.open = 'false'; openBtn.setAttribute('aria-expanded', 'false'); syncInert(); document.body.style.overflow = ''; if (restore) openBtn.focus(); }
  openBtn.addEventListener('click', openDrawer);
  $('sb-close').addEventListener('click', () => closeDrawer(true));
  backdrop.addEventListener('click', () => closeDrawer(true));

  // Theme + direction controls live in the top bar on large screens and in the drawer on small ones.
  const group = $('ctl-group');
  function placeControls() { (mq.matches ? $('sb-ctl-slot') : $('tb-ctl-slot')).appendChild(group); $('sb-ctl-slot').dataset.active = String(mq.matches); syncInert(); if (!mq.matches) closeDrawer(); }
  mq.addEventListener('change', placeControls);
  placeControls();

  /* ----- dropdowns ------------------------------------------------------- */
  const menus = [['notif-btn', 'notif-panel'], ['user-btn', 'user-panel']].map(([b, p]) => ({ btn: $(b), panel: $(p) }));
  function closeMenus(except) { menus.forEach((m) => { if (m !== except) { m.panel.dataset.open = 'false'; m.btn.setAttribute('aria-expanded', 'false'); } }); }
  menus.forEach((m) => m.btn.addEventListener('click', (e) => { e.stopPropagation(); const open = m.panel.dataset.open !== 'true'; closeMenus(m); m.panel.dataset.open = String(open); m.btn.setAttribute('aria-expanded', String(open)); }));
  document.addEventListener('click', (e) => { if (!e.target.closest('.dd')) closeMenus(); else if (e.target.closest('.dd__panel a, [data-notif]')) closeMenus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = menus.find((m) => m.panel.dataset.open === 'true');
    if (open) { closeMenus(); open.btn.focus(); } else if (sb.dataset.open === 'true') closeDrawer(true);
  });

  /* ----- interactions ---------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-learn]'))) { learnId = el.dataset.learn; renderLearning(); location.hash = '#learning'; if (location.hash === '#learning') route(); }
    else if ((el = t.closest('[data-lc]'))) { learnId = el.dataset.lc; renderLearning(); }
    else if (t.closest('#learn-continue')) {
      const c = COURSES.find((x) => x.id === learnId), m = modules(c), i = m.findIndex((x) => x.done < x.lessons);
      if (i > -1) { S.done[c.id] = m.map((x) => x.done); S.done[c.id][i] += 1; save(); renderAll(); toast(`Lesson marked complete in ${c.name} (prototype)`); }
    }
    else if ((el = t.closest('#assign-tabs .tab'))) { aFilter = el.dataset.f; renderAssignments(); }
    else if ((el = t.closest('[data-view-assign]'))) openAssignment(el.dataset.viewAssign, el);
    else if ((el = t.closest('[data-day]'))) { const d = Number(el.dataset.day); selDay = selDay === d ? null : d; renderSchedule(); }
    else if (t.closest('#sched-all')) { selDay = null; renderSchedule(); }
    else if ((el = t.closest('[data-ann]'))) { const id = el.dataset.ann; openAnn.has(id) ? openAnn.delete(id) : openAnn.add(id); if (!isRead(id)) S.read.push(id); save(); renderAnnouncements(); renderChrome(); }
    else if (t.closest('#ann-readall') || t.closest('#notif-readall')) { S.read = ANNOUNCEMENTS.map((n) => n.id); save(); renderAnnouncements(); renderChrome(); toast('All announcements marked as read'); }
    else if ((el = t.closest('[data-notif]'))) { if (!isRead(el.dataset.notif)) S.read.push(el.dataset.notif); openAnn.add(el.dataset.notif); save(); renderAnnouncements(); renderChrome(); location.hash = '#announcements'; }
    else if ((el = t.closest('[data-theme-set]'))) { if ((el.dataset.themeSet === 'dark') !== document.documentElement.classList.contains('dark')) $('theme-toggle-btn').click(); }
    else if ((el = t.closest('[data-dir-set]'))) { if (el.dataset.dirSet !== document.documentElement.dir) $('dir-toggle-btn').click(); }
    else if (t.closest('#reset-data')) { S = fresh(); try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ } openAnn.clear(); renderAll(); toast('Sample data reset'); }
  });
  $$('[data-pref]').forEach((i) => i.addEventListener('change', () => { S.prefs[i.dataset.pref] = i.checked; save(); renderChrome(); toast('Preference saved in this browser'); }));
  new MutationObserver(renderSettings).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'dir'] });

  // Assignment dialog
  const dlg = $('assign-dlg'); let curAssign = null, lastOpener = null;
  function openAssignment(id, opener) {
    const a = assignments().find((x) => x.id === id); curAssign = a; lastOpener = opener;
    $('ad-title').textContent = a.title; $('ad-course').textContent = courseName(a.course); $('ad-text').textContent = a.text;
    const chip = $('ad-status'); chip.textContent = a.status === 'submitted' ? 'Submitted' : a.overdue ? 'Overdue' : 'Pending'; chip.dataset.tone = a.status === 'submitted' ? 'ok' : a.overdue ? 'bad' : 'warn';
    $('ad-due').textContent = dueText(a);
    $('ad-submit').hidden = a.status === 'submitted';
    dlg.showModal();
  }
  $('ad-submit').addEventListener('click', () => { S.assign[curAssign.id] = 'submitted'; save(); dlg.close(); renderAll(); toast(`"${curAssign.title}" marked as submitted (prototype only, nothing was sent)`); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  dlg.addEventListener('close', () => lastOpener?.focus());

  /* ----- profile form ---------------------------------------------------- */
  function setErr(input, msg) { const err = $(`${input.id}-err`); input.setAttribute('aria-invalid', String(!!msg)); if (err) { err.dataset.visible = String(!!msg); err.querySelector('span').textContent = msg; } return !msg; }
  const R = {
    name: (v) => (v.length < 2 ? 'Please enter your full name.' : /[<>\d]/.test(v) ? 'Please use letters only in your name.' : ''),
    email: (v) => (!v ? 'Please enter your email address.' : !EMAIL_RE.test(v) ? 'Please enter a valid email address.' : ''),
    phone: (v) => { const n = v.replace(/\D/g, '').length; return !/^[+()\d\s.-]+$/.test(v) || n < 7 || n > 15 ? 'Please enter a valid phone number (7 to 15 digits).' : ''; },
  };
  const pf = $('form-profile');
  [['pr-name', 'name'], ['pr-email', 'email'], ['pr-phone', 'phone']].forEach(([id, k]) => { $(id).addEventListener('input', () => { if ($(id).getAttribute('aria-invalid') === 'true') setErr($(id), R[k]($(id).value.trim())); }); });
  pf.addEventListener('submit', (e) => {
    e.preventDefault();
    const rs = [setErr($('pr-name'), R.name(pf.name.value.trim())), setErr($('pr-email'), R.email(pf.email.value.trim())), setErr($('pr-phone'), R.phone(pf.phone.value.trim()))];
    if (rs.includes(false)) { [$('pr-name'), $('pr-email'), $('pr-phone')][rs.indexOf(false)].focus(); return; }
    S.profile = { name: pf.name.value.trim(), email: pf.email.value.trim(), phone: pf.phone.value.trim(), city: pf.city.value.trim(), bio: pf.bio.value.trim() };
    save(); renderIdentity(); toast('Profile saved in this browser (prototype)');
  });
  $('prof-reset').addEventListener('click', () => { renderProfile(); toast('Changes discarded'); });
  $('photo-input').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f || !f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f);
    $('prof-avatar').innerHTML = `<img src="${url}" alt="Selected profile photo preview">`;
    toast('Photo preview only. It is not uploaded or saved.');
  });

  /* ----- boot ------------------------------------------------------------ */
  renderAll();
  route(false);
}
