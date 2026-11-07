// Diagnostic: per-section height/padding/internal gaps, brand contrast, heading alignment. node tests/measure.mjs <page> [w] [dark] [rtl]
import { launch, newPage, sleep } from './cdp.mjs';
const [page, w = '1440', dark, rtl] = process.argv.slice(2);
const R = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const c = await launch(9611); const p = await newPage(c.port); await p.viewport(+w, 900, +w < 768);
await p.goto(R + 'about.html'); await p.eval(`localStorage.setItem('atelier_elan_theme','${dark === '1' ? 'dark' : 'light'}');localStorage.setItem('atelier_elan_dir_mode','${rtl === '1' ? 'rtl' : 'ltr'}')`);
await p.goto(R + page); await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`); await sleep(1200);
const out = await p.eval(`(() => {
  const lum = (rgb) => { const f = rgb.startsWith('color(') ? 255 : 1; const m = rgb.match(/-?[\d.]+(?:e-?\d+)?/g); if (!m) return 1; const [r,g,b] = m.slice(0,3).map(Number).map(v => { v*=f; v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*r+0.7152*g+0.0722*b; };
  const cr = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((m,n)=>n-m); return ((x+0.05)/(y+0.05)).toFixed(2); };
  const isClear = (c) => !c || c === 'transparent' || c.indexOf('rgba(0, 0, 0, 0)') === 0 || c.endsWith('/ 0)');
  const bgOf = (el) => { while (el) { const c = getComputedStyle(el).backgroundColor; if (!isClear(c)) return c; el = el.parentElement; } return 'rgb(255,255,255)'; };
  const secs = [...document.querySelectorAll('main > section')].map((s,i) => { const cs = getComputedStyle(s); const r = s.getBoundingClientRect();
    const kids = [...s.querySelectorAll('h1,h2,h3,p,img,a.btn-editorial-primary,figure,article,li')].filter(e=>e.getBoundingClientRect().height>0); 
    const top = Math.min(...kids.map(e=>e.getBoundingClientRect().top)), bot = Math.max(...kids.map(e=>e.getBoundingClientRect().bottom));
    return { i: i+1, id: s.getAttribute('aria-labelledby'), h: Math.round(r.height), padT: cs.paddingTop, padB: cs.paddingBottom, contentH: Math.round(bot-top), slack: Math.round(r.height-(bot-top)) }; });
  const brand = ['.site-header .brand-lockup__name','.site-header .brand-lockup__sub','.site-footer .brand-lockup__name','.site-footer .brand-lockup__sub'].map(sel => { const e=document.querySelector(sel); if(!e) return null; const cs=getComputedStyle(e); return { sel, color: cs.color, bg: bgOf(e), ratio: cr(cs.color, bgOf(e)), display: cs.display }; });
  const em = ['.site-header .brand-lockup__emblem','.site-footer .brand-lockup__emblem'].map(sel => { const e=document.querySelector(sel); if(!e) return null; const cs=getComputedStyle(e); const r=e.getBoundingClientRect(); return { sel, fill: cs.color, ink: cs.getPropertyValue('--emblem-ink'), bg: bgOf(e), ratio: cr(cs.color, bgOf(e)), w: Math.round(r.width), h: Math.round(r.height) }; });
  const align = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h=>h.getBoundingClientRect().width>0).map(h => { const cs = getComputedStyle(h); let a = cs.textAlign; if (a==='start') a = cs.direction==='rtl'?'right':'left'; if (a==='end') a = cs.direction==='rtl'?'left':'right'; return { t: h.textContent.trim().slice(0,28), a, tag: h.tagName }; }).filter(x=>x.a==='right');
  const nav = [...document.querySelectorAll('.site-nav__list > li')].map(l=>l.textContent.trim().replace(/\s+/g,' '));
  return { secs, brand, em, rightAligned: align, nav };
})()`);
console.log(JSON.stringify(out, null, 1)); c.close(); process.exit(0);
