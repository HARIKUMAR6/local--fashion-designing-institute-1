// Gallery: every filter at four widths (balance metrics), lightbox in all three groups, URL param, empty state.
import { launch, newPage, sleep } from './cdp.mjs';

const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/gallery.html';
let fails = 0, total = 0;
const check = (name, ok, info = '') => { total++; if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
const c = await launch(9451);

const open = async (w, h, qs = '', pre) => {
  const p = await newPage(c.port); p.errors = [];
  p.on((d) => { if (d.method === 'Runtime.exceptionThrown') p.errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error' && !/fonts.g/.test(d.params.entry.url || '') && !/fonts.g/.test(d.params.entry.text) && !/ERR_CONNECTION|ERR_TIMED_OUT|ERR_SOCKET/.test(d.params.entry.text)) p.errors.push(d.params.entry.text); });
  await p.viewport(w, h, w < 768);
  if (pre) { await p.goto(ROOT.replace('gallery.html', 'about.html')); await p.eval(pre); }
  await p.goto(ROOT + qs);
  await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(900);
  return p;
};
const clickSel = async (p, sel) => { const r = await p.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`); await sleep(120); const r2 = await p.eval(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`); for (const t of ['mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type: t, x: r2.x, y: r2.y, button: 'left', clickCount: 1 }); await sleep(450); };

const METRICS = `(() => {
  const grid = document.getElementById('g-grid'); const W = grid.getBoundingClientRect().width;
  const rows = [...grid.querySelectorAll('.g-row')].map(r => { const b = r.getBoundingClientRect(); const its = [...r.querySelectorAll('.g-item')].map(i => i.getBoundingClientRect()); const img = r.querySelector('.g-open').getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, left: Math.min(...its.map(x => x.left)), right: Math.max(...its.map(x => x.right)), n: its.length, imgH: img.height, capped: r.classList.contains('is-capped'), items: its.map(x => [x.left, x.right, x.top, x.bottom]) }; });
  const visible = [...document.querySelectorAll('.g-item:not([hidden])')];
  const aspectErr = visible.map(i => { const o = i.querySelector('.g-open').getBoundingClientRect(); return Math.abs(o.width / o.height / parseFloat(i.dataset.ar) - 1); });
  const gaps = rows.slice(1).map((r, i) => r.top - rows[i].bottom);
  let overlap = 0; const all = rows.flatMap(r => r.items); for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], b = all[j]; if (a[0] < b[1] - 0.5 && b[0] < a[1] - 0.5 && a[2] < b[3] - 0.5 && b[2] < a[3] - 0.5) overlap++; }
  return { W, rows: rows.map(r => ({ n: r.n, w: r.right - r.left, left: r.left, imgH: r.imgH, capped: r.capped })), aspectMax: Math.max(...aspectErr), gaps, overlap, visibleN: visible.length, sw: document.documentElement.scrollWidth, iw: innerWidth, status: document.getElementById('g-status').textContent, shownRows: rows.length, sections: [...document.querySelectorAll('[data-g-section]')].map(s => getComputedStyle(s).display !== 'none'), storeHidden: getComputedStyle(grid.querySelector('.g-store')).display === 'none' };
})()`;

const FILTERS = ['all', 'projects', 'illustration', 'construction', 'textile', 'studio', 'showcase'];
for (const [w, h] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  console.log(`\n== Filters @${w}px ==`);
  const p = await open(w, h);
  const counts = await p.eval(`Object.fromEntries([...document.querySelectorAll('.g-chip')].map(c=>[c.dataset.filter, +c.querySelector('.c').textContent]))`);
  for (const f of FILTERS) {
    await clickSel(p, `.g-chip[data-filter="${f}"]`);
    const m = await p.eval(METRICS);
    const fullRows = m.rows.filter((r) => !r.capped);
    const hs = fullRows.map((r) => r.imgH);
    const ratio = hs.length > 1 ? Math.max(...hs) / Math.min(...hs) : 1;
    const widthsOk = m.rows.every((r) => (r.capped ? r.w >= m.W * 0.55 && Math.abs(r.left + r.w / 2 - (m.W / 2 + m.rows[0].left - m.rows[0].left) ) >= 0 : Math.abs(r.w - m.W) <= 1.5));
    const lastFill = m.rows.length ? (m.rows[m.rows.length - 1].capped || m.rows[m.rows.length - 1].w >= m.W - 1.5) : true;
    const maxGap = m.gaps.length ? Math.max(...m.gaps) : 0, minGap = m.gaps.length ? Math.min(...m.gaps) : 0;
    const H0 = w < 480 ? 205 : w < 800 ? 235 : w < 1100 ? 265 : 300;
    const inBand = fullRows.every((r) => r.imgH >= H0 * 0.55 && r.imgH <= H0 * 1.5);
    const ok = m.visibleN === counts[f] && /Showing/.test(m.status) && widthsOk && lastFill && inBand && ratio <= 2.0 && m.overlap === 0 && m.aspectMax < 0.01 && maxGap <= 40 && minGap >= 0 && m.sw <= m.iw && m.storeHidden && m.sections.every(Boolean);
    check(`@${w} filter "${f}": ${m.visibleN}/${counts[f]} shown, ${m.rows.length} balanced rows`, ok, `rowH ${hs.map((x) => Math.round(x)).join('/')} (ratio ${ratio.toFixed(2)}), rows fill ${m.rows.map((r) => r.n + '×' + Math.round(r.w)).join(' ')}/${Math.round(m.W)}, gaps ${Math.round(minGap)}–${Math.round(maxGap)}px, aspect err ${(m.aspectMax * 100).toFixed(2)}%, overlaps ${m.overlap}`);
  }
  check(`@${w}: no console errors while filtering`, p.errors.length === 0, p.errors.join(' | '));
  p.close();
}

console.log('\n== Lightbox ==');
{
  const p = await open(1440, 900);
  const S = (e) => p.eval(e);
  const st = () => S(`({open:document.getElementById('lightbox').dataset.open, count:document.getElementById('lb-count').textContent, cap:document.getElementById('lb-cap').textContent, focus:document.activeElement.id, src:document.getElementById('lb-img').getAttribute('src')||''})`);
  for (const group of ['archive', 'studio', 'showcase']) {
    const total = await S(`document.querySelectorAll('[data-lb-group="${group}"]').length`);
    await clickSel(p, `[data-lb-group="${group}"] .g-open`);
    let s = await st();
    check(`${group}: lightbox opens on the first image, counter "1 / ${total}"`, s.open === 'true' && s.count === `1 / ${total}` && s.src.includes('assets/images'), `${s.count}, caption "${s.cap}"`);
    await p.key('ArrowRight', 'ArrowRight'); s = await st();
    check(`${group}: ArrowRight advances`, s.count === `2 / ${total}`);
    await clickSel(p, '#lb-prev'); s = await st();
    check(`${group}: Previous button returns`, s.count === `1 / ${total}`);
    await p.key('ArrowLeft', 'ArrowLeft'); s = await st();
    check(`${group}: wraps from first to last`, s.count === `${total} / ${total}`);
    await p.key('Escape', 'Escape'); await sleep(200); s = await st();
    check(`${group}: Escape closes and returns focus to the opener`, s.open === 'false' && (await S(`document.activeElement.classList.contains('g-open')`)));
  }
  // lightbox respects the active filter
  await clickSel(p, '.g-chip[data-filter="textile"]');
  await clickSel(p, '[data-lb-group="archive"]:not([hidden]) .g-open');
  const s = await st();
  check('Archive lightbox only cycles through the filtered images', s.count === '1 / 4', s.count);
  await p.key('Escape', 'Escape');
  check('Lightbox: no console errors', p.errors.length === 0, p.errors.join(' | '));
  p.close();
}
{
  const p = await open(1440, 900, '', "localStorage.setItem('atelier_elan_dir_mode','rtl')");
  await clickSel(p, '[data-lb-group="archive"] .g-open');
  const s0 = await p.eval(`document.getElementById('lb-count').textContent`);
  await p.key('ArrowLeft', 'ArrowLeft'); const s1 = await p.eval(`document.getElementById('lb-count').textContent`);
  check('RTL: ArrowLeft moves forward (mirrored)', s0 === '1 / 23' && s1 === '2 / 23', `${s0} → ${s1}`);
  const ov = await p.eval(`document.documentElement.scrollWidth<=innerWidth`);
  check('RTL: no horizontal overflow with lightbox open', ov);
  p.close();
}

console.log('\n== Misc ==');
{
  const p = await open(1440, 900, '?cat=textile');
  const m = await p.eval(METRICS);
  check('?cat=textile preselects the filter', m.visibleN === 4 && (await p.eval(`document.querySelector('.g-chip[aria-pressed=true]').dataset.filter`)) === 'textile');
  // Empty state
  await p.eval(`document.querySelectorAll('.g-item').forEach(i=>i.hidden=true); document.getElementById('g-grid').hidden=true; document.querySelector('[data-empty=archive]').dataset.visible='true'`);
  const e = await p.eval(`({shown:getComputedStyle(document.querySelector('[data-empty=archive]')).display!=='none', gridHidden:getComputedStyle(document.getElementById('g-grid')).display==='none'})`);
  check('Empty state displays (and the empty grid collapses) only when a category has no items', e.shown && e.gridHidden);
  await clickSel(p, '[data-filter-reset]');
  const back = await p.eval(METRICS);
  check('"Show all images" restores the full balanced grid', back.visibleN === 23 && back.rows.length > 2 && back.overlap === 0);
  const f = await p.eval(`(async()=>{await new Promise(r=>setTimeout(r,300));return {st:document.querySelector('[data-g-section=studio]')?.getBoundingClientRect().height, sh:document.querySelector('[data-g-section=showcase]')?.getBoundingClientRect().height}})()`);
  check('Behind the Studio and Fashion Showcase are independent of the filter', f.st > 1500 && f.sh > 1500, `studio ${Math.round(f.st)}px, showcase ${Math.round(f.sh)}px`);
  p.close();
}
c.close();
console.log(`\n${total - fails}/${total} checks passed`);
process.exit(fails ? 1 : 0);
