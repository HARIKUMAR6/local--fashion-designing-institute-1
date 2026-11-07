import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = process.cwd();
const outDir = path.join(root, 'tests', 'screenshots');

const h1Content = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
const h2Content = fs.readFileSync(path.join(root, 'home-2.html'), 'utf-8');

// 1. Dark Mode
const h1Dark = h1Content.replace('<html lang="en"', '<html lang="en" class="dark"');
const h2Dark = h2Content.replace('<html lang="en"', '<html lang="en" class="dark"');
fs.writeFileSync(path.join(root, 'tests', 'temp_h1_dark.html'), h1Dark);
fs.writeFileSync(path.join(root, 'tests', 'temp_h2_dark.html'), h2Dark);

// 2. RTL Mode
const h1Rtl = h1Content.replace('<html lang="en"', '<html lang="ar" dir="rtl"');
const h2Rtl = h2Content.replace('<html lang="en"', '<html lang="ar" dir="rtl"');
fs.writeFileSync(path.join(root, 'tests', 'temp_h1_rtl.html'), h1Rtl);
fs.writeFileSync(path.join(root, 'tests', 'temp_h2_rtl.html'), h2Rtl);

const modeTests = [
  { name: 'home-1_dark_1440px', file: 'temp_h1_dark.html', w: 1440, h: 900 },
  { name: 'home-2_dark_1440px', file: 'temp_h2_dark.html', w: 1440, h: 900 },
  { name: 'home-1_rtl_1440px',  file: 'temp_h1_rtl.html',  w: 1440, h: 900 },
  { name: 'home-2_rtl_1440px',  file: 'temp_h2_rtl.html',  w: 1440, h: 900 }
];

for (const t of modeTests) {
  const tempImg = path.join('C:\\Users\\acer\\AppData\\Local\\Temp', `${t.name}.png`);
  const destImg = path.join(outDir, `${t.name}.png`);
  const targetUrl = `file:///${path.join(root, 'tests', t.file).replace(/\\/g, '/').replace(/ /g, '%20')}`;

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${t.w},${t.h}`,
    `--screenshot=${tempImg}`,
    targetUrl
  ];

  try {
    execFileSync(chrome, args, { stdio: 'ignore', timeout: 15000 });
    if (fs.existsSync(tempImg)) {
      fs.copyFileSync(tempImg, destImg);
      fs.unlinkSync(tempImg);
      const stat = fs.statSync(destImg);
      console.log(`[PASS] Captured ${t.name} (${t.w}x${t.h}) - ${stat.size} bytes`);
    }
  } catch (err) {
    console.error(`[FAIL] ${t.name}:`, err.message);
  }
}

// Clean up temp html files
fs.unlinkSync(path.join(root, 'tests', 'temp_h1_dark.html'));
fs.unlinkSync(path.join(root, 'tests', 'temp_h2_dark.html'));
fs.unlinkSync(path.join(root, 'tests', 'temp_h1_rtl.html'));
fs.unlinkSync(path.join(root, 'tests', 'temp_h2_rtl.html'));

console.log('Dark and RTL mode captures complete!');

