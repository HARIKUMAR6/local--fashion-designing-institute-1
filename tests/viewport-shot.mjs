// Usage: node tests/viewport-shot.mjs file w h out [scrollY] [dark] [rtl]
import { launch, newPage, sleep } from './cdp.mjs';
const [file, w, h, out, y = '0', dark, rtl] = process.argv.slice(2);
const c = await launch(9444); const p = await newPage(c.port);
await p.viewport(+w, +h, +w < 768);
await p.goto('file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/' + file);
if (dark === '1') await p.eval("localStorage.setItem('atelier_elan_theme','dark')");
if (rtl === '1') await p.eval("localStorage.setItem('atelier_elan_dir_mode','rtl')");
if (dark === '1' || rtl === '1') await p.goto('file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/' + file);
await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')`);
await sleep(800); await p.eval(y.startsWith('#') ? `window.scrollTo(0, document.querySelector('${y}').getBoundingClientRect().top + scrollY - 96)` : `window.scrollTo(0,${y})`); await sleep(500);
await p.shot(out, false); c.close(); process.exit(0);
