/* ══════════ 快速截圖工具（開發用）══════════
 * 用法：node test/peek.mjs <screen-name> [waitMs]
 * 例：node test/peek.mjs loading 1000
 * 支援的特殊值：
 *   loading  → 直接顯示 loading 畫面
 *   其他值   → 若遊戲已 init，嘗試 showScreen(值)
 */
import { chromium } from 'playwright';
import http from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const name = process.argv[2] || 'loading';
const waitMs = Number(process.argv[3] || 800);

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log('⚠️ pageerror:', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('⚠️ console:', m.text()); });

await page.goto(`http://127.0.0.1:${PORT}/`);
await page.waitForTimeout(400);

if (name === 'loading') {
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('screen-loading').classList.remove('hidden');
    setLoadingQuote();
  });
} else {
  await page.evaluate((n) => showScreen(n), name);
}
await page.waitForTimeout(waitMs);
await page.screenshot({ path: `shots/peek-${name}.png` });
console.log(`📸 shots/peek-${name}.png`);
await browser.close();
server.close();
