// Prints / writes true pixel dimensions of every local image: node scripts/image-dims.mjs [--write]
import fs from 'node:fs';
const out = {};
for (const f of fs.readdirSync('assets/images').filter((x) => x.endsWith('.jpg'))) {
  const b = fs.readFileSync(`assets/images/${f}`); let i = 2;
  while (i < b.length) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1]; if (m >= 0xC0 && m <= 0xC3) { out[f.replace('.jpg', '')] = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; break; } i += 2 + b.readUInt16BE(i + 2); }
}
if (process.argv.includes('--write')) fs.writeFileSync('assets/images/dimensions.json', JSON.stringify(out, null, 1));
else console.log(JSON.stringify(out));
