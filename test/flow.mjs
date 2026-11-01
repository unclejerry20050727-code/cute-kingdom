/* ══════════ 可愛國 — 完整流程截圖測試 ══════════
 * 用法：node test/flow.mjs
 * 會起一個暫存 HTTP server，走完整遊戲流程並截圖到 shots/
 */
import { chromium } from 'playwright';
import http from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
await mkdir(SHOTS, { recursive: true });

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.woff2': 'font/woff2',
};

/* ── 簡易 static server ── */
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log('  ⚠️ pageerror:', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('  ⚠️ console:', m.text()); });

let step = 0;
let fails = 0;
function check(label, ok) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) fails++;
}
async function shot(name, note = '') {
  step++;
  const f = path.join(SHOTS, `${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  console.log(`  📸 ${path.basename(f)}  ${note}`);
}
async function waitMs(ms) { await page.waitForTimeout(ms); }

/* 房間磁磚 → 螢幕座標 */
async function tilePt(tx, ty) {
  return page.evaluate(([a, b]) => {
    const [sx, sy] = P(a, b);
    return { x: Game.offX + sx * Game.ws, y: Game.offY + sy * Game.ws };
  }, [tx, ty]);
}
/* 世界座標（地圖/打工場景）→ 螢幕座標 */
async function worldPt(x, y) {
  return page.evaluate(([a, b]) => ({
    x: Game.offX + a * Game.ws,
    y: Game.offY + b * Game.ws,
  }), [x, y]);
}

async function dlgActive() {
  return page.evaluate(() => !document.getElementById('dialogue').classList.contains('hidden'));
}
/* 按空白鍵推進對話（第一下補完打字，第二下換行） */
async function dlgClick() {
  await page.keyboard.press('Space');
  await waitMs(180);
  if (await dlgActive()) { await page.keyboard.press('Space'); await waitMs(180); }
}
async function dlgWaitDone(timeout = 30000) {
  await page.waitForFunction(() => document.getElementById('dialogue').classList.contains('hidden'), { timeout });
}
async function sub() { return page.evaluate(() => (typeof Game !== 'undefined') ? Game.sub + '/' + Game.state : 'no-Game'); }

console.log('🌐 開啟頁面');
await page.goto(`http://127.0.0.1:${PORT}/`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await waitMs(800);

console.log('1️⃣ 封面');
await shot('cover', `state=${await sub()}`);
await page.click('#cover-enter');
await waitMs(500);

console.log('2️⃣ 標題畫面');
await shot('title');
await page.click('#btn-new');
await waitMs(600);

console.log('3️⃣ 角色自定義（預設女生：可可長髮，參考 art/小島-女版.png）');
await shot('create-female');
await page.click('#opt-gender .chip[data-val="male"]');
await waitMs(400);
await shot('create-male', '預設男生：可可短髮+呆毛');
/* 測試色票可切換，再切回預設（可可/可可棕） */
await page.click('#group-hair .swatch:nth-child(3)');
await page.click('#group-eye .swatch:nth-child(2)');
await page.click('#opt-top .chip:nth-child(2)'); /* 黑外套看白T效果 */
await waitMs(300);
await shot('create-custom', '黑外套+白T內搭');
await page.click('#group-hair .swatch:nth-child(1)');
await page.click('#group-eye .swatch:nth-child(1)');
await page.click('#opt-top .chip:nth-child(3)'); /* 白短袖 */
await waitMs(300);

console.log('4️⃣ 確定 → 剛醒（閉眼躺著）');
await page.click('#create-confirm');
await waitMs(900);
await shot('wake', `sub=${await sub()}`);

console.log('5️⃣ 點擊 → 睜眼左看右看');
await page.mouse.click(640, 400);
await waitMs(1400);   /* 看到左邊 */
await shot('awake-left');
await waitMs(1300);   /* 轉到右邊 */
await shot('awake-right');
/* 等對話起來 */
await page.waitForSelector('#dialogue:not(.hidden)', { timeout: 10000 });
await waitMs(700);
console.log('6️⃣ 「這是哪裡？」');
await shot('dialogue-where', `sub=${await sub()}`);
const dlgGap = await page.evaluate(() => {
  const d = document.getElementById('dialogue').getBoundingClientRect();
  const n = document.getElementById('dlg-name').getBoundingClientRect();
  return Math.round((n.top - d.top) * 10) / 10; /* 含 4px 邊框（第十一輪：量名字框與框線距離） */
});
check('對話名字框與框線間距≈縮半（11a）', dlgGap >= 14 && dlgGap <= 20);

console.log('7️⃣ 推進對話 → 小島躺著等點擊，點一下才起來');
await dlgClick();
await waitMs(500);
check('wakeup 子狀態（點擊起來前）', String(await sub()).startsWith('wakeup'));
await shot('wakeup-wait', `sub=${await sub()}`);
await page.mouse.click(640, 400);
await waitMs(1200);
await shot('meet-pop', `sub=${await sub()}`);
await waitMs(1200);

console.log('8️⃣ 小宥自介對話');
for (let i = 0; i < 8; i++) {
  if (!(await dlgActive())) break;
  if (i === 1) await shot('intro-q', `sub=${await sub()}`);
  if (i === 2) await shot('intro-reveal');
  await dlgClick();
}
await dlgWaitDone();
await waitMs(900);

console.log('9️⃣ 建造教學：面板+提示');
await shot('tut-build-panel', `sub=${await sub()}`);
await page.click('.btab[data-tab="wall"]');
await waitMs(400);
check('教學中牆飾 tab 鎖住（第十輪修漏洞）', (await page.locator('#build-items .build-empty').count()) === 1 && (await page.locator('#build-items .build-empty').first().textContent()).includes('先完成放床教學'));

console.log('🔟 點家具 tab → 選床');
await page.click('.btab[data-tab="furniture"]');
await waitMs(700);
await shot('tut-furniture');
await page.click('#build-items .build-item');
await waitMs(500);

console.log('1️⃣1️⃣ 放置床（ghost）');
const bedPt = await tilePt(6.5, 3.5);
await page.mouse.move(bedPt.x, bedPt.y);
await waitMs(300);
await shot('bed-ghost', `sub=${await sub()}`);
await page.mouse.click(bedPt.x, bedPt.y);
await waitMs(900);
await shot('bed-placed');

console.log('1️⃣2️⃣ 小宥誇獎');
await page.waitForSelector('#dialogue:not(.hidden)', { timeout: 10000 });
await waitMs(800);
await shot('praise');
await dlgClick();
await dlgWaitDone();
await waitMs(900);

console.log('1️⃣3️⃣ 出門按鈕 + 提示（此處先存檔續玩測試）');
await shot('goout-hint', `sub=${await sub()}`);
await page.click('#build-btn');
await waitMs(500);
check('放床後家具 tab 全開（runtime stage 已推進）', (await page.locator('#build-items .build-item').count()) >= 5);
await page.click('.btab[data-tab="wall"]');
await waitMs(400);
check('放床後牆飾 tab 解鎖', (await page.locator('#build-items .build-item').count()) >= 6);
await page.click('#build-btn');
await waitMs(300);

console.log('1️⃣3️⃣½ 重新整理 → 續玩應回到 goOut 提示');
await page.reload();
await waitMs(900);
await page.click('#cover-enter');
await waitMs(500);
await page.click('#btn-start');
await waitMs(1800);
await shot('resume-bed', `sub=${await sub()}`);

await page.click('#out-btn');
await waitMs(1000);

console.log('1️⃣4️⃣ loading（手寫風）');
await shot('loading', `sub=${await sub()}`);
await page.waitForFunction(() => Game.sub === 'map', null, { timeout: 15000 });
await waitMs(600);

console.log('1️⃣5️⃣ 地圖（直直往下＋麥當勞）');
await shot('map');
check('地圖上有「回家」提示圈', await page.evaluate(() => !document.getElementById('hint').classList.contains('hidden')));

console.log('1️⃣5️⃣½ 點道路走路');
const roadPt = await worldPt(490, 560);
await page.mouse.click(roadPt.x, roadPt.y);
await waitMs(1500);
await shot('map-walk');

console.log('1️⃣6️⃣ 點麥當勞 → 打工小舖（買制服50+帽子30）');
const mcPt = await worldPt(490, 432);
await page.mouse.click(mcPt.x, mcPt.y);
await waitMs(500);
await shot('shop');
await page.click('#buy-uniform');
await waitMs(250);
await page.click('#buy-hat');
await waitMs(250);
await shot('shop-gear');

console.log('1️⃣7️⃣ 開始打工（3-2-1 → 固定食譜 → +20）');
await page.click('#btn-start-work');
await waitMs(600);
await shot('work-count');
await waitMs(2600);
const cards = await page.evaluate(() => WORK_CARDS.map(c => ({ id: c.id, x: c.x, y: c.y + CARD_H / 2 })));
for (const id of ['bun', 'meat', 'tomato', 'lettuce', 'bun']) {
  const c = cards.find(k => k.id === id);
  const p = await worldPt(c.x, c.y);
  await page.mouse.click(p.x, p.y);
  await waitMs(280);
}
await waitMs(900);
await shot('work-delivered');
console.log('  money=', await page.evaluate(() => Game.money), ' count=', await page.evaluate(() => Work && Work.count));
await page.click('#work-x');
await waitMs(400);
await shot('back-map');

console.log('1️⃣8️⃣ 點「回家」→ 房間');
await page.click('#map-home');
await waitMs(500);
await shot('home', `sub=${await sub()}`);
check('回房間後提示圈消失（第十輪修殘留）', await page.evaluate(() => document.getElementById('hint').classList.contains('hidden')));

console.log('1️⃣6️⃣ 自由移動（WASD + 點地板）');
await shot('free', `sub=${await sub()}`);
await page.keyboard.down('d');
await page.keyboard.down('w');
await waitMs(900);
await page.keyboard.up('d');
await page.keyboard.up('w');
await waitMs(300);
const freePt = await tilePt(6, 6);
await page.mouse.click(freePt.x, freePt.y);
await waitMs(1600);
await shot('free-moved');

console.log('1️⃣7️⃣ 再放一張床被拒絕（toast）');
await page.click('#build-btn');
await page.click('.btab[data-tab="furniture"]');
await waitMs(500);
await page.click('#build-items .build-item');
await waitMs(600);
await shot('toast-already-bed');

console.log(fails === 0 ? '✅ 流程測試完成' : `❌ 流程測試完成（${fails} 項失敗）`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);
