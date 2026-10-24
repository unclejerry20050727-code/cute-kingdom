/* 快速驗證：第一人稱剛醒流程（閉眼→睜眼→平移→對話→第三人稱） */
import { chromium } from 'playwright';
import http from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
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

/* 直接進到新遊戲的 fp 子狀態 */
await page.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'created' }, false);
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/peek-fp-1-closed.png' });
console.log('📸 closed');

/* 點擊睜眼 */
await page.mouse.click(640, 360);
await page.waitForTimeout(450);
await page.screenshot({ path: 'shots/peek-fp-2-opening.png' });
console.log('📸 opening (t≈0.5s 中間)');

/* 平移到左邊 */
await page.waitForTimeout(1100); // t≈1.6
await page.screenshot({ path: 'shots/peek-fp-3-left.png' });
console.log('📸 panned left');

/* 平移到右邊 */
await page.waitForTimeout(1400); // t≈3.0
await page.screenshot({ path: 'shots/peek-fp-4-right.png' });
console.log('📸 panning right');

/* 平移結束 → talk（第一人稱對話） */
await page.waitForTimeout(2400); // t≈5.4+
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/peek-fp-5-talk.png' });
console.log('📸 talk (fp, 對話中)');

/* 推進對話 → meet（第三人稱） */
await page.keyboard.press('Space'); await page.waitForTimeout(900);
await page.keyboard.press('Space'); await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/peek-fp-6-meet.png' });
console.log('📸 meet (third person)');

const sub = await page.evaluate(() => Game.sub);
console.log('最終 sub:', sub);
await browser.close();
server.close();
