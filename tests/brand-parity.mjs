// Brand parity: the header lockup is the master; footer, mobile drawer, Login Portal and Student Dashboard must
// reuse exactly the same emblem drawing, typography and proportions (only size and background-dependent colours differ).
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';

const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
let fails = 0, total = 0;
const check = (name, ok, info = '') => { total++; if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
const c = await launch(9877);

const HELPERS = `
  const rgba = (css) => { const x = document.createElement('canvas').getContext('2d'); x.clearRect(0,0,1,1); x.fillStyle = '#000'; x.fillStyle = css; x.fillRect(0,0,1,1); const d = x.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
  const over = (f, b) => [0,1,2].map(i => f[i]*f[3] + b[i]*(1-f[3]));
  const lum = (c) => { const [r,g,b] = c.map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*r+0.7152*g+0.0722*b; };
  const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };
  const bgOf = (el) => { const st = []; while (el) { const c = rgba(getComputedStyle(el).backgroundColor); if (c[3] > 0) st.push(c); if (c[3] >= 1) break; el = el.parentElement; } let base = [255,255,255]; for (let i = st.length-1; i >= 0; i--) base = over(st[i], base); return base; };
  const textContrast = (el) => { const bg = bgOf(el); return ratio(over(rgba(getComputedStyle(el).color), bg), bg); };
`;
const MEASURE = `(() => { ${HELPERS}
  const where = (el) => el.closest('.site-header') ? 'header' : el.closest('.mobile-drawer') ? 'drawer' : el.closest('.site-footer') ? 'footer' : el.closest('.tb') ? 'dash-topbar' : el.closest('.sb, aside, nav') ? 'dash-sidebar' : 'page';
  return [...document.querySelectorAll('.brand-lockup')].map(l => {
    const name = l.querySelector('.brand-lockup__name'), em = name.querySelector('em'), sub = l.querySelector('.brand-lockup__sub'), emb = l.querySelector('.brand-lockup__emblem');
    const txt = l.querySelector('.brand-lockup__text');
    const fz = parseFloat(getComputedStyle(name).fontSize); const eb = emb.getBoundingClientRect(); const nb = name.getBoundingClientRect();
    const subOn = sub && getComputedStyle(sub).display !== 'none';
    const edge = rgba(getComputedStyle(emb).getPropertyValue('--emblem-edge').trim() || '#C28E98');
    const bg = bgOf(l);
    return { where: where(l), compact: l.classList.contains('brand-lockup--compact'), visible: eb.width > 0 && nb.width > 0,
      label: l.getAttribute('aria-label'), text: name.textContent.replace(/\\s+/g,' ').trim(), href: emb.querySelector('use')?.getAttribute('href'),
      family: getComputedStyle(name).fontFamily, weight: getComputedStyle(name).fontWeight, trackEm: parseFloat(getComputedStyle(name).letterSpacing) / fz,
      emStyle: getComputedStyle(em).fontStyle, emTrackEm: parseFloat(getComputedStyle(em).letterSpacing) / fz, emWeight: getComputedStyle(em).fontWeight,
      aspect: eb.width / eb.height, emblemToText: eb.height / fz, gapEm: Math.max(txt.getBoundingClientRect().left - eb.right, eb.left - txt.getBoundingClientRect().right) / fz,
      subOn, subRel: subOn ? parseFloat(getComputedStyle(sub).fontSize) / fz : null, subTrack: subOn ? parseFloat(getComputedStyle(sub).letterSpacing) / parseFloat(getComputedStyle(sub).fontSize) : null, subUpper: subOn ? getComputedStyle(sub).textTransform : null,
      nameContrast: textContrast(name), accentContrast: textContrast(em), subContrast: subOn ? textContrast(sub) : null, edgeContrast: Math.max(ratio(edge, bg), ratio(rgba(getComputedStyle(emb).getPropertyValue('--emblem-bg').trim() || '#691829'), bg)),
      fillColor: getComputedStyle(emb).color, size: Math.round(fz * 10) / 10, rtl: document.documentElement.dir };
  });
})()`;

const PLACES = [['index.html', 'public'], ['login.html', 'login'], ['dashboard/index.html', 'dashboard']];
const COMBOS = [];
for (const w of [1440, 768, 390]) for (const dark of [false, true]) for (const rtl of [false, true]) COMBOS.push([w, dark, rtl]);

const shotsDir = 'tests/screenshots/v6'; fs.mkdirSync(shotsDir, { recursive: true });
const near = (a, b, t) => Math.abs(a - b) <= t;
let ref;
for (const [w, dark, rtl] of COMBOS) {
  const tag = `@${w} ${dark ? 'dark' : 'light'} ${rtl ? 'RTL' : 'LTR'}`;
  const all = {};
  for (const [file, key] of PLACES) {
    const p = await newPage(c.port); await p.viewport(w, 900, false);
    await p.goto(ROOT + 'about.html');
    await p.eval(`localStorage.setItem('atelier_elan_theme','${dark ? 'dark' : 'light'}');localStorage.setItem('atelier_elan_dir_mode','${rtl ? 'rtl' : 'ltr'}')`);
    await p.goto(ROOT + file); await sleep(900);
    all[key] = await p.eval(MEASURE);
    p.close();
  }
  const header = all.public.find((l) => l.where === 'header');
  const others = [...all.public.filter((l) => l.where !== 'header'), ...all.login.map((l) => ({ ...l, where: 'login' })), ...all.dashboard];
  const shown = others.filter((l) => l.visible);
  // 1. same design, every placement
  const sameDesign = shown.every((l) => l.href === header.href && l.text === header.text && l.label === header.label && l.family === header.family && l.weight === header.weight && l.emStyle === header.emStyle && l.emWeight === header.emWeight && near(l.trackEm, header.trackEm, 0.01) && near(l.emTrackEm, header.emTrackEm, 0.01));
  check(`${tag}: same emblem drawing, brand name text, font, weight, italic accent, tracking in ${shown.map((l) => l.where).join('/')}`, sameDesign && shown.length >= 3,
    sameDesign ? `"${header.text}" · ${header.family.split(',')[0]} ${header.weight} · tracking ${header.trackEm.toFixed(3)}em · ${header.href}` : JSON.stringify(shown.filter((l) => l.href !== header.href || l.text !== header.text || l.family !== header.family || l.weight !== header.weight).map((l) => [l.where, l.href, l.text, l.family.split(',')[0], l.weight])));
  // 2. same proportions (compact variants only change size / hide the subtitle)
  const prop = shown.every((l) => near(l.aspect, header.aspect, 0.01) && near(l.emblemToText, header.emblemToText, 0.08) && near(l.gapEm, header.gapEm, 0.08));
  check(`${tag}: identical proportions (emblem aspect ${header.aspect.toFixed(3)}, emblem:text ${header.emblemToText.toFixed(2)}, gap ${header.gapEm.toFixed(2)}em)`, prop, prop ? '' : JSON.stringify(shown.map((l) => [l.where, +l.aspect.toFixed(3), +l.emblemToText.toFixed(2), +l.gapEm.toFixed(2)])));
  const subs = shown.filter((l) => l.subOn && header.subOn);
  check(`${tag}: subtitle styling matches wherever it is shown`, subs.every((l) => near(l.subRel, header.subRel, 0.01) && near(l.subTrack, header.subTrack, 0.02) && l.subUpper === header.subUpper));
  // 3. contrast everywhere (header included)
  const everyone = [header, ...shown];
  const bad = everyone.filter((l) => l.nameContrast < 4.5 || l.accentContrast < 4.5 || (l.subContrast !== null && l.subContrast < 4.5) || l.edgeContrast < 3);
  check(`${tag}: contrast OK in all ${everyone.length} placements (name/accent/subtitle ≥ 4.5:1, emblem fill or edge ≥ 3:1)`, bad.length === 0,
    bad.length ? JSON.stringify(bad.map((l) => [l.where, +l.nameContrast.toFixed(1), +l.accentContrast.toFixed(1), l.subContrast && +l.subContrast.toFixed(1), +l.edgeContrast.toFixed(1)])) : `min name ${Math.min(...everyone.map((l) => l.nameContrast)).toFixed(1)}, accent ${Math.min(...everyone.map((l) => l.accentContrast)).toFixed(1)}, emblem ${Math.min(...everyone.map((l) => l.edgeContrast)).toFixed(1)}`);
  if (w === 1440 && !rtl) ref = ref || {};
}

// Static guarantees: one emblem drawing exists, in one sprite; favicon is that drawing.
console.log('\n== One emblem, one source ==');
const sprite = fs.readFileSync('src/partials/brand-sprite.html', 'utf8');
check('Sprite defines exactly one emblem symbol (no simplified/alternative mark)', (sprite.match(/<symbol /g) || []).length === 1 && sprite.includes('id="ae-emblem"'));
const pages = ['index.html', 'home-2.html', 'about.html', 'courses.html', 'gallery.html', 'contact.html', 'login.html', 'dashboard/index.html'];
const refsBad = pages.filter((f) => { const h = fs.readFileSync(f, 'utf8'); return /href="#ae-(?!emblem)/.test(h) || /brand-emblem\.svg|pt-brand|site-brand|mark\.svg/.test(h); });
check('No page references any other emblem, the retired mark, or the old brand classes', refsBad.length === 0, refsBad.join(', '));
const inlineLogos = pages.filter((f) => /<img[^>]+(logo|emblem|brand)[^>]*>/i.test(fs.readFileSync(f, 'utf8')));
check('No page uses a separate image file as its logo', inlineLogos.length === 0, inlineLogos.join(', '));
const fav = fs.readFileSync('assets/brand/favicon.svg', 'utf8'), emb = fs.readFileSync('assets/brand/emblem.svg', 'utf8');
const body = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
check('Favicon is the same emblem drawing as emblem.svg', body(fav) === body(emb));
check('Every page links the same favicon', pages.every((f) => /rel="icon" href="(\.\/|\.\.\/)assets\/brand\/favicon\.svg"/.test(fs.readFileSync(f, 'utf8'))));
check('assets/brand has no leftover alternative logo files', fs.readdirSync('assets/brand').sort().join(',') === 'README.md,emblem.svg,favicon.svg', fs.readdirSync('assets/brand').join(','));
const names = pages.map((f) => [f, (fs.readFileSync(f, 'utf8').match(/brand-lockup__name">([^<]*(?:<em>[^<]*<\/em>)?)/) || [])[1]]);
check('Every page renders the same brand name markup', new Set(names.map((n) => n[1])).size === 1, names.map((n) => n[1]).join(' | ').slice(0, 120));
c.close();
console.log(`\n${total - fails}/${total} checks passed`);
process.exit(fails ? 1 : 0);
