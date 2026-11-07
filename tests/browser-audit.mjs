// Real-browser audit of Home 1 and Home 2 (+ shared header/footer).
// Usage: node tests/browser-audit.mjs [--shots]
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';

const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const pages = [['home-1', 'index.html'], ['home-2', 'home-2.html'], ['about', 'about.html'], ['contact', 'contact.html']];
const sizes = [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 780]];
const shots = process.argv.includes('--shots');
const out = 'tests/screenshots/v2';
fs.mkdirSync(out, { recursive: true });

const chrome = await launch();
const results = [];
const problems = [];

for (const [name, file] of pages) {
  for (const [w, h] of sizes) {
    const p = await newPage(chrome.port);
    const errors = [];
    p.on((d) => {
      if (d.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
      if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push(`log: ${d.params.entry.text} ${d.params.entry.url || ''}`);
      if (d.method === 'Network.loadingFailed' && !/fonts\.g/.test(d.params.requestId)) errors.push('netfail: ' + d.params.errorText + ' ' + (d.params.blockedReason || ''));
    });
    await p.viewport(w, h, w < 768);
    await p.goto(ROOT + file);
    await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`);
    await sleep(1200);
    const m = await p.eval(`(() => {
      const de = document.documentElement;
      const offenders = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.mobile-drawer,.site-dropdown'); }).slice(0,5).map(e => e.tagName + '.' + String(e.className).slice(0,60));
      const imgs = [...document.images];
      const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
      const hero = document.querySelector('.hero-viewport-section, .page-hero');
      const cont = [...document.querySelectorAll('.atelier-container')].map(c => { const r = c.getBoundingClientRect(); return Math.round(r.left) + ':' + Math.round(r.width); });
      const hdr = document.getElementById('main-header').getBoundingClientRect();
      return { sw: de.scrollWidth, iw: innerWidth, offenders, imgCount: imgs.length, broken, heroH: Math.round(hero.getBoundingClientRect().height), heroTop: Math.round(hero.getBoundingClientRect().top), hdrH: Math.round(hdr.height), containers: [...new Set(cont)], sections: document.querySelectorAll('main > section').length, lang: de.lang, dir: de.dir };
    })()`);
    const overflow = m.sw > m.iw;
    results.push({ name, w, ...m, overflow, errors });
    if (overflow) problems.push(`${name}@${w}: horizontal overflow sw=${m.sw} iw=${m.iw} ${m.offenders}`);
    if (m.broken.length) problems.push(`${name}@${w}: broken images ${m.broken}`);
    if (errors.length) problems.push(`${name}@${w}: console ${errors.join(' | ')}`);
    if (shots) {
      await p.shot(`${out}/${name}_${w}.png`, true);
      await p.eval('window.scrollTo(0,0)');
    }
    p.close();
  }
}
chrome.close();

for (const r of results) console.log(`${r.name} @${String(r.w).padEnd(4)} sections=${r.sections} imgs=${r.imgCount} broken=${r.broken.length} overflow=${r.overflow} heroH=${r.heroH} headerH=${r.hdrH} containers=${JSON.stringify(r.containers)} errors=${r.errors.length}`);
console.log(problems.length ? '\nPROBLEMS:\n' + problems.join('\n') : '\nNo problems detected.');
