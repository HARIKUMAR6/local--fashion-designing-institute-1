// Minimal Chrome DevTools Protocol driver (no dependencies; uses Node's built-in WebSocket/fetch).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export async function launch(port = 9333, extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', ...extra, 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(200); }
  }
  return { port, proc, dir, close() { proc.kill(); } };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function newPage(port) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); }
    else listeners.forEach((l) => l(d));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const page = {
    send,
    on: (fn) => listeners.push(fn),
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async goto(url) {
      const loaded = new Promise((r) => { const l = (d) => { if (d.method === 'Page.loadEventFired') r(); }; listeners.push(l); });
      await send('Page.navigate', { url }); await loaded; await sleep(300);
    },
    async viewport(w, h, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
    },
    async shot(file, full = true) {
      let params = { format: 'png' };
      if (full) {
        const m = await send('Page.getLayoutMetrics');
        params = { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: m.cssContentSize.width, height: Math.min(m.cssContentSize.height, 16000), scale: 1 } };
      }
      const r = await send('Page.captureScreenshot', params);
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    async key(key, code) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: code || key });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: code || key });
    },
    async mouse(x, y) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'mouse' }); },
    close() { ws.close(); },
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  return page;
}
