import { launch, newPage, sleep } from './cdp.mjs';
const [file, out, rtl] = process.argv.slice(2);
const c = await launch(9888); const p = await newPage(c.port); await p.viewport(390, 844, true);
const R = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
if (rtl === '1') { await p.goto(R + 'about.html'); await p.eval("localStorage.setItem('atelier_elan_dir_mode','rtl')"); }
await p.goto(R + file); await p.eval("document.getElementById('mobile-menu-btn').click()"); await sleep(700);
await p.shot(out, false); c.close(); process.exit(0);
