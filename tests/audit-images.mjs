import fs from 'node:fs';
import https from 'node:https';

async function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = https.request(parsed, { method: 'HEAD', timeout: 8000 }, (res) => {
        resolve({ url, status: res.statusCode });
      });
      req.on('error', (err) => resolve({ url, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ url, error: 'TIMEOUT' }); });
      req.end();
    } catch (e) {
      resolve({ url, error: e.message });
    }
  });
}

async function run() {
  const h1 = fs.readFileSync('index.html', 'utf8');
  const h2 = fs.readFileSync('home-2.html', 'utf8');
  
  const h1Urls = Array.from(h1.matchAll(/src="([^"]+)"/g)).map(m => m[1]);
  const h2Urls = Array.from(h2.matchAll(/src="([^"]+)"/g)).map(m => m[1]);
  
  console.log('=== HOME 1 IMAGE SOURCES (' + h1Urls.length + ') ===');
  for (const u of [...new Set(h1Urls)]) {
    if (u.startsWith('http')) {
      const res = await checkUrl(u);
      console.log(`H1 [${res.status || res.error}] ${u}`);
    } else {
      console.log(`H1 [LOCAL: ${fs.existsSync(u) ? 'EXISTS' : 'MISSING'}] ${u}`);
    }
  }
  
  console.log('\n=== HOME 2 IMAGE SOURCES (' + h2Urls.length + ') ===');
  for (const u of [...new Set(h2Urls)]) {
    if (u.startsWith('http')) {
      const res = await checkUrl(u);
      console.log(`H2 [${res.status || res.error}] ${u}`);
    } else {
      console.log(`H2 [LOCAL: ${fs.existsSync(u) ? 'EXISTS' : 'MISSING'}] ${u}`);
    }
  }
}
run();

