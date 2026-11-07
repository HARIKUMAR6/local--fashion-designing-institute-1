// Full QA audit: every page x every viewport (+ RTL / dark variants, Dashboard views, Login views).
// Measures rendered geometry: overflow, heading alignment, text clipping/overlap, card rows, buttons.
//   node tests/qa-audit.mjs [--quick] [--out file.json] [--pages a,b] [--only-ltr]
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';

const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const OUT = arg('--out') || 'tests/qa-results.json';
const VIEWPORTS = [[1920, 1080], [1440, 900], [1366, 768], [1024, 768], [768, 1024], [430, 932], [390, 844], [360, 800], [320, 720]];
const PAGES = (arg('--pages') ? arg('--pages').split(',') : ['index.html', 'home-2.html', 'about.html', 'courses.html', 'gallery.html', 'contact.html', 'login.html', 'dashboard/index.html']);
const DASH_VIEWS = ['dashboard', 'courses', 'learning', 'assignments', 'schedule', 'announcements', 'certificates', 'profile', 'settings'];
const LOGIN_VIEWS = ['signin', 'create', 'forgot'];

const AUDIT = `(() => {
  const issues = [];
  const add = (type, el, info) => issues.push({ type, sel: describe(el), info: info || '' });
  const describe = (el) => { if (!el || !el.tagName) return '?'; const c = String(el.className || '').split(/\\s+/).filter(Boolean).slice(0, 3).join('.'); const t = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 28); return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : '') + (t ? ' "' + t + '"' : ''); };
  const hidden = (e) => !!e.closest('[hidden], .g-store, .lb, template, noscript, dialog:not([open]), .sr-only');
  const vis = (e) => { if (hidden(e)) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return true; };
  const inFixed = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; };
  const iw = innerWidth;

  // 1. page overflow
  const sw = document.documentElement.scrollWidth;
  if (sw > iw) { issues.push({ type: 'page-overflow-x', sel: 'html', info: sw + ' > ' + iw }); [...document.querySelectorAll('body *')].filter(e => vis(e) && !inFixed(e) && e.getBoundingClientRect().right > iw + 1).slice(0, 4).forEach(e => add('overflow-source', e, Math.round(e.getBoundingClientRect().right) + 'px')); }

  // 2. headings never right-aligned
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => { if (!vis(h)) return; const cs = getComputedStyle(h); let a = cs.textAlign; if (a === 'start') a = cs.direction === 'rtl' ? 'right' : 'left'; if (a === 'end') a = cs.direction === 'rtl' ? 'left' : 'right'; if (a === 'right') add('heading-right-aligned', h); });

  // 3. text clipping / overflow / overlap
  const TEXT = 'h1,h2,h3,h4,h5,h6,p,li,a,button,label,span,small,strong,em,dt,dd,figcaption,td,th,legend,summary,blockquote,address,div';
  const hasOwnText = (e) => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
  const leaves = [];
  document.querySelectorAll(TEXT).forEach(e => {
    if (!hasOwnText(e) || !vis(e)) return;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) { /* intentional truncation (gallery captions) */ }
    else if ((cs.overflowX !== 'visible' || cs.overflow === 'hidden') && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0) add('text-clipped-x', e, e.scrollWidth + '>' + e.clientWidth);
    if ((cs.overflowY === 'hidden' || cs.overflowY === 'clip') && e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 0) add('text-clipped-y', e, e.scrollHeight + '>' + e.clientHeight);
    if (!inFixed(e) && (r.right > iw + 1 || r.left < -1)) add('text-outside-viewport', e, Math.round(r.left) + '..' + Math.round(r.right));
    // text wider than its parent's box
    const p = e.parentElement; if (p && !inFixed(e)) { const pr = p.getBoundingClientRect(), pcs = getComputedStyle(p); if (pcs.overflow === 'visible' && cs.display !== 'inline' && (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) && pr.width > 0 && getComputedStyle(p).display !== 'contents') add('text-exceeds-parent', e, Math.round(r.left - pr.left) + ' / ' + Math.round(r.right - pr.right)); }
    // single-word break (mid-word wrapping)
    if (cs.overflowWrap === 'anywhere' || cs.wordBreak === 'break-all') { /* explicit */ } else { const words = e.textContent.trim().split(/\\s+/); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3; if (r.height > lh * 1.5 && words.length === 1 && e.textContent.trim().length > 6 && r.width > 0 && e.scrollWidth <= e.clientWidth + 1 && r.height > lh * 1.9) add('word-broken', e, words[0]); }
    if (cs.display !== 'inline') leaves.push({ e, r });
  });
  // overlap between text blocks in the same section
  const bySection = new Map(); leaves.forEach(l => { const s = l.e.closest('section, header, footer, aside, nav, main') || document.body; (bySection.get(s) || bySection.set(s, []).get(s)).push(l); });
  const seen = new Set();
  bySection.forEach(list => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], b = list[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue; if (inFixed(a.e) !== inFixed(b.e)) continue; const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top); if (w > 4 && h > 4 && w * h > 40) { const key = describe(a.e) + '|' + describe(b.e); if (!seen.has(key)) { seen.add(key); issues.push({ type: 'text-overlap', sel: describe(a.e), info: 'with ' + describe(b.e) + ' (' + Math.round(w) + 'x' + Math.round(h) + 'px)' }); } } } });

  // 4. paragraph measure
  document.querySelectorAll('p').forEach(p => { if (!vis(p) || p.textContent.trim().length < 90) return; const cs = getComputedStyle(p); const ch = p.getBoundingClientRect().width / (parseFloat(cs.fontSize) * 0.5); if (ch > 105) add('long-line-length', p, Math.round(ch) + 'ch'); });

  // 5. buttons
  const BTN = 'a[class*="btn"], button[class*="btn"], .site-cta, .pf-btn, .pt-ctl, .g-chip, button[type="submit"], .link-arrow';
  const btns = [...document.querySelectorAll(BTN)].filter(vis);
  const groups = {};
  btns.forEach(b => {
    const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    if (b.scrollWidth > b.clientWidth + 1 && cs.overflow !== 'visible') add('button-text-clipped', b, b.scrollWidth + '>' + b.clientWidth);
    const t = b.textContent.trim(); if (t) { const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3; if (r.height > lh * 2.6 && !b.matches('.g-chip,.link-arrow')) add('button-wraps-3+-lines', b, Math.round(r.height) + 'px'); }
    const svg = b.querySelector('svg'); if (svg && t) { const sr = svg.getBoundingClientRect(); const range = document.createRange(); const tn = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()) || b.querySelector('span'); if (tn) { range.selectNodeContents(tn); const tr = range.getBoundingClientRect(); const w = Math.min(sr.right, tr.right) - Math.max(sr.left, tr.left); const h = Math.min(sr.bottom, tr.bottom) - Math.max(sr.top, tr.top); if (w > 1 && h > 1) add('button-icon-overlaps-text', b, Math.round(w) + 'px'); } }
    if (innerWidth <= 768 && b.matches('a[class*="btn"], button[class*="btn"], .site-cta, .pf-btn') && r.height < 40) add('button-too-short-for-touch', b, Math.round(r.height) + 'px');
    const key = (String(b.className).split(/\\s+/).find(c => /^(btn|site-cta|pf-btn|g-chip|pt-ctl)/.test(c)) || 'other');
    (groups[key] ||= []).push({ b, h: r.height, w: r.width });
  });
  Object.entries(groups).forEach(([k, arr]) => { if (k === 'other' || arr.length < 2) return; const hs = arr.map(a => Math.round(a.h)); const min = Math.min(...hs), max = Math.max(...hs); if (max - min > 2 && !/g-chip|pt-ctl/.test(k)) issues.push({ type: 'button-height-inconsistent', sel: k, info: hs.join(',') + ' | ' + arr.slice(0, 3).map(a => describe(a.b)).join(' ; ') }); });
  // adjacent stacked buttons: same width
  const parents = new Set(btns.map(b => b.parentElement)); parents.forEach(p => { const sib = btns.filter(b => b.parentElement === p && /btn|site-cta/.test(b.className)); if (sib.length > 1) { const rs = sib.map(s => s.getBoundingClientRect()); const stacked = rs.every((r, i) => i === 0 || r.top >= rs[i - 1].bottom - 2); if (stacked && Math.max(...rs.map(r => r.width)) - Math.min(...rs.map(r => r.width)) > 2) issues.push({ type: 'stacked-buttons-unequal-width', sel: describe(p), info: rs.map(r => Math.round(r.width)).join('/') }); } });

  // 6. card rows
  const CARD = 'article, figure, li, .card-paper, .course-card, .polaroid, .work, .plate, .g-item, .stage, .pl__card, .panel';
  const cardParents = new Map();
  document.querySelectorAll(CARD).forEach(c => { if (!vis(c)) return; const r = c.getBoundingClientRect(); if (r.width < 140 || r.height < 120) return; const key = c.parentElement; (cardParents.get(key) || cardParents.set(key, []).get(key)).push(c); });
  const rowsReport = [];
  cardParents.forEach((list, parent) => {
    const byTag = {}; list.forEach(c => (byTag[c.tagName] ||= []).push(c));
    Object.values(byTag).forEach(items => { if (items.length < 2) return; const rows = []; items.forEach(c => { const t = c.getBoundingClientRect().top; const row = rows.find(r => Math.abs(r.top - t) <= 40); if (row) row.items.push(c); else rows.push({ top: t, items: [c] }); });
      rows.forEach(row => { if (row.items.length < 2) return; const rs = row.items.map(c => c.getBoundingClientRect()); const sameTop = Math.max(...rs.map(r => r.top)) - Math.min(...rs.map(r => r.top)) <= 3; const bottoms = rs.map(r => r.bottom); const hs = rs.map(r => r.height);
        const bottomSpread = Math.max(...bottoms) - Math.min(...bottoms);
        const rec = { parent: describe(parent), n: row.items.length, heights: hs.map(Math.round), sameTop, bottomSpread: Math.round(bottomSpread) };
        const kids = row.items.map(c => { const h = c.querySelector('h2,h3,h4'); const cta = [...c.querySelectorAll('a,button')].filter(vis).pop(); const im = c.querySelector('img'); const cr = c.getBoundingClientRect(); return { head: h ? Math.round(h.getBoundingClientRect().top - cr.top) : null, cta: cta ? Math.round(cr.bottom - cta.getBoundingClientRect().bottom) : null, ratio: im ? +(im.getBoundingClientRect().width / im.getBoundingClientRect().height).toFixed(2) : null, pad: Math.round(parseFloat(getComputedStyle(c).paddingLeft)) }; });
        rec.headOff = kids.map(k => k.head); rec.ctaOff = kids.map(k => k.cta); rec.ratios = kids.map(k => k.ratio); rec.pads = kids.map(k => k.pad);
        const spread = (a) => { const v = a.filter(x => x !== null); return v.length > 1 ? Math.max(...v) - Math.min(...v) : 0; };
        rec.headSpread = spread(rec.headOff); rec.ctaSpread = spread(rec.ctaOff); rec.ratioSpread = (() => { const v = rec.ratios.filter(x => x !== null); return v.length > 1 ? +(Math.max(...v) / Math.min(...v)).toFixed(2) : 1; })();
        rowsReport.push(rec); }); }); });

  return { issues, cardRows: rowsReport, doc: { sw, iw, h: document.documentElement.scrollHeight } };
})()`;

const c = await launch(+(arg('--port') || 9921));
const results = [];
const tag = (page, vp, view, v) => `${page}${view ? '#' + view : ''} @${vp[0]}x${vp[1]}${v.rtl ? ' RTL' : ''}${v.dark ? ' dark' : ''}`;
async function run(page, vp, v, view) {
  const p = await newPage(c.port); p.errs = [];
  p.on((d) => { if (d.method === 'Runtime.exceptionThrown') p.errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); });
  await p.viewport(vp[0], vp[1], false);
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('atelier_elan_theme','${v.dark ? 'dark' : 'light'}');localStorage.setItem('atelier_elan_dir_mode','${v.rtl ? 'rtl' : 'ltr'}')}catch(e){}` });
  await p.goto(ROOT + page);
  if (view) {
    if (page.startsWith('dashboard')) await p.eval(`(()=>{const a=document.querySelector('[data-nav="${view}"]');if(a)a.click();else location.hash='#${view}'})()`);
    else await p.eval(`(()=>{const m={signin:null,create:'[data-go="create"],[data-view-btn="create"],a[href="#create"],button[data-to="create"]',forgot:'[data-go="forgot"],a[href="#forgot"],button[data-to="forgot"]'};const s=m['${view}'];if(s){const e=document.querySelector(s);if(e)e.click()}})()`);
  }
  await sleep(250);
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`);
  await sleep(450);
  await p.eval(`Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))`); await sleep(150);
  const r = await p.eval(AUDIT);
  results.push({ tag: tag(page, vp, view, v), page, view, vp, v, ...r, jsErrors: p.errs });
  p.close();
}

const jobs = [];
for (const page of PAGES) {
  const views = page.startsWith('dashboard') ? DASH_VIEWS : page === 'login.html' ? LOGIN_VIEWS : [null];
  for (const vp of VIEWPORTS) for (const view of views) {
    jobs.push([page, vp, { rtl: false, dark: false }, view]);
    if (!args.includes('--only-ltr') && (view === null || view === 'dashboard' || view === 'signin')) {
      if ([1920, 1366, 768, 390, 320].some((w) => w === vp[0])) jobs.push([page, vp, { rtl: true, dark: true }, view]);
    }
  }
}
console.log(`running ${jobs.length} page/viewport states…`);
let n = 0;
for (const j of jobs) { try { await run(...j); } catch (e) { results.push({ tag: tag(j[0], j[1], j[3], j[2]), error: String(e).slice(0, 200), issues: [], cardRows: [] }); } if (++n % 20 === 0) console.log(` ${n}/${jobs.length}`); }
c.close();
fs.writeFileSync(OUT, JSON.stringify(results));
console.log('saved', OUT, results.length, 'states');
