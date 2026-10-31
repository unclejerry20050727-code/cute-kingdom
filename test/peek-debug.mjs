/* ══════════ 除錯：走教學流程，逐步 dump Game 狀態 ══════════
 * 用法：node test/peek-debug.mjs
 */
import { chromium } from 'playwright';
import http from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mp3':'audio/mpeg', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.jpg':'image/jpeg' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try { const d = await readFile(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log('  ⚠️ pageerror:', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('  ⚠️ console:', m.text()); });
const ms = (m) => page.waitForTimeout(m);
const st = (tag) => page.evaluate((t) => {
  const dlg = !document.getElementById('dialogue').classList.contains('hidden');
  console.log(`  [${t}]`, JSON.stringify({ stage: Game.stage, sub: Game.sub, place: Game.placement, furn: Game.furniture.length, dlg }));
}, tag).catch(e => console.log('  eval fail:', e.message));

await page.goto(`http://127.0.0.1:${PORT}/`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await ms(800);
await page.click('#cover-enter'); await ms(500);
await page.click('#btn-new'); await ms(600);
await page.click('#create-confirm'); await ms(900);
await page.mouse.click(640, 400); await ms(2900);
await page.waitForSelector('#dialogue:not(.hidden)', { timeout: 10000 });
await ms(700);
console.log('— 這是哪裡？');
const dlgClick = async () => {
  await page.keyboard.press('Space'); await ms(180);
  if (await page.evaluate(() => !document.getElementById('dialogue').classList.contains('hidden'))) {
    await page.keyboard.press('Space'); await ms(180);
  }
};
const dlgDone = () => page.waitForFunction(() => document.getElementById('dialogue').classList.contains('hidden'), { timeout: 30000 });
await dlgClick(); await ms(1200); await ms(1200);
for (let i = 0; i < 8; i++) {
  if (await page.evaluate(() => document.getElementById('dialogue').classList.contains('hidden'))) break;
  await dlgClick();
}
await dlgDone(); await ms(1200);
await st('intro done');
await page.click('.btab[data-tab="furniture"]'); await ms(700);
await st('furniture tab');
const cards = await page.evaluate(() => Array.from(document.querySelectorAll('#build-items .build-item .bi-name')).map(e => e.textContent));
console.log('  卡片:', cards.join(', '));
await page.click('#build-items .build-item'); await ms(600);
await st('bed card clicked');
const bedPt = await page.evaluate(() => {
  const [sx, sy] = P(6.5, 3.5);
  return { x: Game.offX + sx * Game.ws, y: Game.offY + sy * Game.ws };
});
await page.mouse.move(bedPt.x, bedPt.y); await ms(400);
await st('mouse at bed tile');
await page.screenshot({ path: 'shots/dbg-ghost.png' });
await page.mouse.click(bedPt.x, bedPt.y); await ms(1000);
await st('after place click');
await page.screenshot({ path: 'shots/dbg-placed.png' });
console.log('  furniture:', await page.evaluate(() => JSON.stringify(Game.furniture)));
await browser.close();
server.close();
