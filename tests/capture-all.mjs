import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.join(process.cwd(), 'tests', 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [
  { name: '1440px_Large_Desktop', w: 1440, h: 900 },
  { name: '1280px_Desktop',       w: 1280, h: 800 },
  { name: '1024px_Laptop',        w: 1024, h: 768 },
  { name: '768px_Tablet',         w: 768,  h: 1024 },
  { name: '390px_Mobile',         w: 390,  h: 844 },
  { name: '360px_Small_Mobile',   w: 360,  h: 780 }
];

const pages = [
  { name: 'home-1', file: 'file:///d:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/index.html' },
  { name: 'home-2', file: 'file:///d:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/home-2.html' }
];

console.log('Capturing responsive viewport screenshots across all 6 viewports...');

for (const vp of viewports) {
  for (const pg of pages) {
    const tempFile = path.join('C:\\Users\\acer\\AppData\\Local\\Temp', `${pg.name}_${vp.name}.png`);
    const destFile = path.join(outDir, `${pg.name}_${vp.name}.png`);

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${vp.w},${vp.h}`,
      `--screenshot=${tempFile}`,
      pg.file
    ];

    try {
      execFileSync(chrome, args, { stdio: 'ignore', timeout: 15000 });
      if (fs.existsSync(tempFile)) {
        fs.copyFileSync(tempFile, destFile);
        fs.unlinkSync(tempFile);
        const stat = fs.statSync(destFile);
        console.log(`[PASS] Captured ${pg.name} @ ${vp.name} (${vp.w}x${vp.h}) - ${stat.size} bytes`);
      } else {
        console.error(`[FAIL] ${pg.name} @ ${vp.name} file not created`);
      }
    } catch (err) {
      console.error(`[ERROR] ${pg.name} @ ${vp.name}:`, err.message);
    }
  }
}

console.log('\nAll viewport captures completed successfully!');

