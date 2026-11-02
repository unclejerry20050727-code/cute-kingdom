/* 快速驗證：地圖 → 麥當勞商店 → 打工（3-2-1、組漢堡、+20、回地圖、回家） */
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
await page.waitForTimeout(600);

/* 直接進到地圖 */
await page.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
  Game.mapP = { x: 490, y: 190, facing: 'down', walkT: 0, walking: false };
  setSub('map');
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/peek-map-1.png' });
console.log('📸 map');

/* 世界座標 → 螢幕座標 */
const toScreen = (wx, wy) => page.evaluate(([x, y]) => ({
  x: Game.offX + x * Game.ws,
  y: Game.offY + y * Game.ws,
}), [wx, wy]);

/* 點麥當勞的點 → 商店 */
let pt = await toScreen(490, 432);
await page.mouse.click(pt.x, pt.y);
await page.waitForTimeout(500);
console.log('shop visible:', await page.evaluate(() => !document.getElementById('screen-shop').classList.contains('hidden')));
console.log('level cards:', await page.evaluate(() => [...document.querySelectorAll('.level-card')].map(d => `${d.dataset.lv}:${d.classList.contains('locked') ? '🔒' : '✅'}`).join(' ')));
await page.screenshot({ path: 'shots/peek-map-2-shop.png' });

/* 買制服 50 + 帽子 30 */
await page.click('#buy-uniform');
await page.waitForTimeout(250);
await page.click('#buy-hat');
await page.waitForTimeout(250);
console.log('money after buy:', await page.evaluate(() => Game.money), 'gear:', await page.evaluate(() => JSON.stringify(Game.gear)));
console.log('level cards after gear:', await page.evaluate(() => [...document.querySelectorAll('.level-card')].map(d => `${d.dataset.lv}:${d.classList.contains('locked') ? '🔒' : '✅'}`).join(' ')));
await page.screenshot({ path: 'shots/peek-map-3-gear.png' });

/* 開始打工（第十三輪b：點第一關卡） */
await page.click('.level-card[data-lv="1"]');
await page.waitForTimeout(700);
console.log('📸 countdown, level:', await page.evaluate(() => Work && `${Work.level.id} ${Work.level.name}`));
await page.screenshot({ path: 'shots/peek-map-4-count.png' });

/* 等 3-2-1 結束 */
await page.waitForTimeout(2600);

/* 依當前訂單食譜點卡（第十三輪b：品項隨機，讀 recipe 逐張點） */
const cards = await page.evaluate(() => WORK_CARDS.map(c => ({ id: c.id, x: c.x, y: c.y + CARD_H / 2 })));
const order = await page.evaluate(() => ({
  recipe: Work.customer.item.recipe.slice(),
  pay: Math.round(Work.customer.item.price * Work.level.payMul),
}));
console.log('order:', order.recipe.join(' > '), 'pay:', order.pay);
for (const id of order.recipe) {
  const c = cards.find(k => k.id === id);
  const p = await toScreen(c.x, c.y);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(300);
}
console.log('stack after recipe:', await page.evaluate(() => (Work && Work.stack.length) ?? 'flying/done'));
await page.screenshot({ path: 'shots/peek-map-5-delivered.png' });
await page.waitForTimeout(700);
const moneyAfter = await page.evaluate(() => Game.money);
console.log((moneyAfter === 20 + order.pay ? '✅' : '❌'), 'money after item:', moneyAfter, '(expect', 20 + order.pay + ') count:', await page.evaluate(() => (Work && Work.count)));

/* 點錯卡測試（此時 stack 已重開，第一張該是麵包；點番茄 → 抖） */
const wrong = cards.find(k => k.id === 'tomato');
const wp = await toScreen(wrong.x, wrong.y);
await page.mouse.click(wp.x, wp.y);
await page.waitForTimeout(150);
console.log('shake after wrong:', await page.evaluate(() => Work && Work.shake > 0));
await page.screenshot({ path: 'shots/peek-map-6-work.png' });

/* work-x 回地圖 */
await page.click('#work-x');
await page.waitForTimeout(400);
console.log('back on map:', await page.evaluate(() => Game.sub), 'work hidden:', await page.evaluate(() => document.getElementById('screen-work').classList.contains('hidden')));
await page.screenshot({ path: 'shots/peek-map-7-backmap.png' });

/* 點地面走路 */
const walk = await toScreen(490, 560);
await page.mouse.click(walk.x, walk.y);
await page.waitForTimeout(1200);
console.log('walked to y≈', await page.evaluate(() => Math.round(Game.mapP.y)));

/* 回家 */
await page.click('#map-home');
await page.waitForTimeout(500);
console.log('home sub:', await page.evaluate(() => Game.sub));
await page.screenshot({ path: 'shots/peek-map-8-home.png' });

await browser.close();
server.close();
