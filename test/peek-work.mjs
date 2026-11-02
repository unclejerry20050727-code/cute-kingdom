/* 第十三輪d：打工系統專測（關卡解鎖、連擊小費、耐心氣走、L5 隊列深度、星星結算、存檔持久） */
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

let fails = 0;
const check = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg);
  if (!cond) fails++;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.log('⚠️ pageerror:', e.message); });

await page.goto(`http://127.0.0.1:${PORT}/`);
await page.waitForTimeout(600);

const toScreen = (wx, wy) => page.evaluate(([x, y]) => ({
  x: Game.offX + x * Game.ws,
  y: Game.offY + y * Game.ws,
}), [wx, wy]);
const cards = () => page.evaluate(() => WORK_CARDS.map(c => ({ id: c.id, x: c.x, y: c.y + CARD_H / 2 })));
/* 服務一單：讀訂單食譜逐張點，等飛完 */
async function serveOne() {
  await page.waitForFunction(() => Work && Work.phase === 'play' && Work.customer, null, { timeout: 5000 });
  const info = await page.evaluate(() => ({
    recipe: Work.customer.item.recipe.slice(),
    pay: Math.round(Work.customer.item.price * Work.level.payMul * (Work.customer.rush ? 1.5 : 1)),
  }));
  const cs = await cards();
  for (const id of info.recipe) {
    const c = cs.find(k => k.id === id);
    const p = await toScreen(c.x, c.y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(700); /* 等餐點飛完 */
  return info.pay;
}

/* ── 建立遊戲狀態（直接設裝備、不扣錢） ── */
await page.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
  Game.gear = { uniform: true, hat: true };
  Game.work = { unlocked: 1, best: {} };
  setSub('map');
  fillShopUI();
  document.getElementById('screen-shop').classList.remove('hidden');
});
await page.waitForTimeout(400);

/* ① 關卡選擇：只有第 1 關開 */
let lv = await page.evaluate(() => [...document.querySelectorAll('.level-card')].map(d => ({ lv: +d.dataset.lv, locked: d.classList.contains('locked') })));
check(lv.length === 5, '關卡卡有 5 張');
check(lv[0].locked === false && lv.slice(1).every(l => l.locked), '初始只有第 1 關解鎖');
await page.screenshot({ path: 'shots/peek-work-1-shop.png' });

/* ② 點第 1 關 → 排隊 1 人 */
await page.click('.level-card[data-lv="1"]');
await page.waitForFunction(() => Work && Work.phase === 'play', null, { timeout: 5000 });
await page.waitForTimeout(300);
check(await page.evaluate(() => Work.level.id) === 1, '進入第 1 關');
check(await page.evaluate(() => Work.queue.filter(c => c.state === 'queue').length) === 1, 'L1 排隊 1 人');

/* ③ 連擊小費：連續完成 3 單 → +10 */
let money = await page.evaluate(() => Game.money);
let sum = 0;
for (let i = 0; i < 3; i++) sum += await serveOne();
money = await page.evaluate(() => Game.money);
check(money === 100 + sum + 10, `3 連完成：money=${money}（預期 100+${sum}+10 小費）`);
check(await page.evaluate(() => Work.count) === 3, '完成數 = 3');
await page.screenshot({ path: 'shots/peek-work-2-combo.png' });

/* ④ 耐心氣走 → miss＋補新客 */
await page.evaluate(() => { Work.customer.patience = 0.4; });
await page.waitForTimeout(2100);
const miss = await page.evaluate(() => ({ m: Work.misses, q: Work.queue.filter(c => c.state === 'queue').length }));
check(miss.m === 1 && miss.q === 1, `氣走計數 miss=${miss.m}、排隊補回 ${miss.q} 人`);

/* ⑤ L5 隊列深度：5 人、由近到遠遞減 */
await page.evaluate(() => { exitWork(); startWork(5); });
await page.waitForTimeout(4200);
const q5 = await page.evaluate(() => Work.queue.filter(c => c.state === 'queue').map(c => Math.round(c.scale * 100)));
check(q5.length === 5, `L5 排隊 5 人（${q5.join(',')}）`);
check(q5.every((s, i) => i === 0 || s < q5[i - 1]), 'L5 排隊由近到遠遞減（透視深度）');
check(await page.evaluate(() => Work.level.goals.join(',')) === '5,9,12', 'L5 星星門檻 5/9/12');
await page.screenshot({ path: 'shots/peek-work-3-queue5.png' });

/* ⑥ 星星結算：L1 完成 4 單 → ★1、解鎖第 2 關 */
await page.evaluate(() => { exitWork(); startWork(1); });
await page.waitForFunction(() => Work && Work.phase === 'play', null, { timeout: 5000 });
await page.waitForTimeout(300);
for (let i = 0; i < 4; i++) await serveOne();
await page.evaluate(() => { Work.left = 0.3; });
await page.waitForTimeout(1600); /* 結算畫面（星星彈出） */
await page.screenshot({ path: 'shots/peek-work-4-stars.png' });
await page.waitForTimeout(3200); /* 等自動回商店 */
const prog = await page.evaluate(() => ({ best: Game.work.best[1], unlocked: Game.work.unlocked, shop: !document.getElementById('screen-shop').classList.contains('hidden') }));
check(prog.shop, '下工自動回商店');
check(prog.best === 1, `最佳星數 = ${prog.best}（4 單 = ★1）`);
check(prog.unlocked === 2, `解鎖到第 ${prog.unlocked} 關`);
lv = await page.evaluate(() => [...document.querySelectorAll('.level-card')].map(d => ({ lv: +d.dataset.lv, locked: d.classList.contains('locked') })));
check(lv[0].locked === false && lv[1].locked === false && lv.slice(2).every(l => l.locked), '商店卡列：1、2 關解鎖，3~5 關鎖住');
check(await page.evaluate(() => document.querySelector('.level-card[data-lv="1"] .level-stars').textContent.trim()) === '★☆☆', '第 1 關顯示 ★☆☆');
await page.screenshot({ path: 'shots/peek-work-5-shop2.png' });

/* ⑦ 存檔持久：reload 後 work 進度還在 */
await page.reload();
await page.waitForTimeout(800);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cute-kingdom-save-v1') || '{}').work);
check(!!saved && saved.unlocked >= 2 && (saved.best[1] || 0) >= 1, `reload 後存檔 work 進度保留（unlocked=${saved && saved.unlocked}, best1=${saved && saved.best[1]}）`);

check(pageErrors === 0, `全程 pageerror = ${pageErrors}`);
console.log(fails === 0 ? '✅ 打工系統測試全過' : `❌ ${fails} 項失敗`);
await browser.close();
server.close();
process.exit(fails > 0 ? 1 : 0);
