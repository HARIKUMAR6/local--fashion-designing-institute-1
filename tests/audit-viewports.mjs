import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'tests', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Find Chrome or Edge binary
let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(browserPath)) {
  browserPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}
console.log('Using browser binary:', browserPath);

// Start local HTTP server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const localFile = path.join(ROOT_DIR, reqPath);
  if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
    let contentType = 'text/html';
    if (localFile.endsWith('.css')) contentType = 'text/css';
    if (localFile.endsWith('.js')) contentType = 'text/javascript';
    if (localFile.endsWith('.svg')) contentType = 'image/svg+xml';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(localFile));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log(`Server listening on http://127.0.0.1:${port}`);

  const viewports = [
    { name: '1440px_Large_Desktop', width: 1440, height: 900 },
    { name: '1280px_Desktop', width: 1280, height: 800 },
    { name: '1024px_Laptop', width: 1024, height: 768 },
    { name: '768px_Tablet', width: 768, height: 1024 },
    { name: '390px_Mobile', width: 390, height: 844 },
    { name: '360px_Small_Mobile', width: 360, height: 780 }
  ];

  const pages = [
    { file: 'index.html', title: 'Home 1' },
    { file: 'home-2.html', title: 'Home 2' }
  ];

  console.log('\n--- CAPTURING VIEWPORT SCREENSHOTS ---');
  for (const vp of viewports) {
    for (const pg of pages) {
      const outImg = path.join(SCREENSHOT_DIR, `${pg.file.replace('.html','')}_${vp.name}.png`);
      const url = `http://127.0.0.1:${port}/${pg.file}`;
      const cmd = `"${browserPath}" --headless=new --disable-gpu --window-size=${vp.width},${vp.height} --screenshot="${outImg}" "${url}"`;
      try {
        execSync(cmd, { stdio: 'ignore', timeout: 15000 });
        if (fs.existsSync(outImg)) {
          const stat = fs.statSync(outImg);
          console.log(`✓ ${pg.title} @ ${vp.name} (${vp.width}x${vp.height}): ${stat.size} bytes`);
        }
      } catch (err) {
        console.error(`Error capturing ${pg.title} @ ${vp.name}:`, err.message);
      }
    }
  }

  server.close(() => {
    console.log('\nAll viewport captures complete!');
  });
});

