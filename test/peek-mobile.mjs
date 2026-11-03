/* ══════════ 14a — 手機觸控基礎測試 ══════════
 * 用法：node test/peek-mobile.mjs
 * 390×844 直式手機視口 + 真實觸控（hasTouch）：
 * 封面→標題→建角→睜眼→對話→wakeup→建角→建造教學放床（含拖曳 ghost）→出門→地圖走路→回家
 * 斷言：全程 0 pageerror、各階段 sub/state 正確
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
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.log('  ⚠️ pageerror:', e.message); });

let step = 0, fails = 0;
function check(label, ok) { console.log(`  ${ok ? '✅' : '❌'} ${label}`); if (!ok) fails++; }
async function shot(name) {
  step++;
  const f = path.join(SHOTS, `m${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  console.log(`  📸 ${path.basename(f)}`);
}
const waitMs = (ms) => page.waitForTimeout(ms);

/* ── 觸控 helper ── */
async function tapEl(sel) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  if (!b) throw new Error(`找不到元素: ${sel}`);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}
async function tilePt(tx, ty) {
  return page.evaluate(([a, b]) => {
    const [sx, sy] = P(a, b);
    return { x: Game.offX + sx * Game.ws, y: Game.offY + sy * Game.ws };
  }, [tx, ty]);
}
async function worldPt(x, y) {
  return page.evaluate(([a, b]) => ({ x: Game.offX + a * Game.ws, y: Game.offY + b * Game.ws }), [x, y]);
}
const tapTile = async (tx, ty) => { const p = await tilePt(tx, ty); await page.touchscreen.tap(p.x, p.y); };
const tapWorld = async (x, y) => { const p = await worldPt(x, y); await page.touchscreen.tap(p.x, p.y); };
const sub = () => page.evaluate(() => Game.sub + '/' + Game.state);
const dlgActive = () => page.evaluate(() => !document.getElementById('dialogue').classList.contains('hidden'));
/* tap 對話框推進（第一下補完打字，若仍顯示則再 tap 換行） */
async function dlgTap() {
  const b = await page.locator('#dialogue').boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await waitMs(260);
  if (await dlgActive()) {
    const b2 = await page.locator('#dialogue').boundingBox();
    await page.touchscreen.tap(b2.x + b2.width / 2, b2.y + b2.height / 2);
    await waitMs(260);
  }
}
async function tapDialogueUntilDone(max = 15) {
  for (let i = 0; i < max && (await dlgActive()); i++) await dlgTap();
}
/* CDP 觸控拖曳（tap 之後瀏覽器不會 fire click＝只移 ghost 不放置） */
const cdp = await ctx.newCDPSession(page);
async function touchDrag(a, b) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y, id: 1 }] });
  await waitMs(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, id: 1 }] });
  await waitMs(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x, y: b.y, id: 1 }] });
  await waitMs(400);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

console.log('🌐 開啟頁面（390×844 hasTouch）');
await page.goto(`http://127.0.0.1:${PORT}/`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await waitMs(800);

console.log('1️⃣ 封面 → tap 進入');
await shot('cover');
await tapEl('#cover-enter');
await waitMs(500);
check('封面 tap → 標題', (await page.evaluate(() => Game.state)) === 'title');

console.log('2️⃣ 標題 → tap 新遊戲 → 建角');
await tapEl('#btn-new');
await waitMs(600);
check('標題 tap → 建角', (await page.evaluate(() => Game.state)) === 'create');

console.log('3️⃣ 建角 → tap 確定（預設女生）');
await shot('create');
await tapEl('#create-confirm');
await waitMs(900);
check('建角 tap → 剛醒(fp 閉眼)', (await sub()) === 'fp/game');

console.log('4️⃣ tap 畫面 → 睜眼 → 全景平移 → 對話');
await page.touchscreen.tap(195, 422);
await page.waitForSelector('#dialogue:not(.hidden)', { timeout: 20000 });
check('tap 睜眼 → 第一人稱對話起來', true);
await shot('fp-dialogue');

console.log('5️⃣ tap 推進對話 → wakeup（躺著等點擊）');
await tapDialogueUntilDone();
check('對話 tap 完 → wakeup', (await sub()) === 'wakeup/game');
await shot('wakeup');

console.log('6️⃣ tap 起來 → meet 小宥自介對話（tap 完）');
await page.touchscreen.tap(195, 422);
await page.waitForSelector('#dialogue:not(.hidden)', { timeout: 10000 });
await waitMs(400);
await shot('meet');
await tapDialogueUntilDone(15);
check('meet 對話 tap 完 → 建造教學', (await sub()) === 'tutBuild/game');

console.log('7️⃣ 建造教學：tap 家具 tab → tap 床卡');
await tapEl('.btab[data-tab="furniture"]');
await waitMs(500);
await tapEl('#build-items .build-item');
await waitMs(500);
check('床卡 tap → 進入放置', (await sub()) === 'placing/game'
  && (await page.evaluate(() => Game.placement && Game.placement.mode === 'floor')));

console.log('8️⃣ 手指拖曳 ghost（不放置）');
const a = await tilePt(3, 7);
const b = await tilePt(6.5, 3.5);
await touchDrag(a, b);
const afterDrag = await page.evaluate(() => ({
  tx: Game.placement.tx, ty: Game.placement.ty,
  beds: Game.furniture.length,
}));
check('拖曳後 ghost 跟手（tx/ty 更新）', afterDrag.tx >= 4 && afterDrag.tx <= 7 && afterDrag.ty >= 1 && afterDrag.ty <= 5);
check('拖曳不誤觸放置（床還沒放）', afterDrag.beds === 0);
await shot('drag-ghost');

console.log('9️⃣ tap 放置床');
await tapTile(6.5, 3.5);
await waitMs(900);
check('tap 放床成功', await page.evaluate(() => Game.furniture.some(f => f.id === 'bed')));
await shot('bed-placed');

console.log('🔟 誇獎對話 tap 完 → goOut');
await page.waitForSelector('#dialogue:not(.hidden)', { timeout: 10000 });
await waitMs(400);
await tapDialogueUntilDone();
await waitMs(600);
check('誇獎完 → goOut', (await sub()) === 'goOut/game');
await shot('goout');

console.log('1️⃣1️⃣ tap 出門 → 地圖');
await tapEl('#out-btn');
await page.waitForFunction(() => Game.sub === 'map', null, { timeout: 20000 });
await waitMs(800);
check('出門 → 地圖', (await sub()) === 'map/game');
await shot('map');

console.log('1️⃣2️⃣ tap 道路 → 走路');
await tapWorld(490, 560);
await waitMs(400);
check('tap 道路 → 設定行走目標', await page.evaluate(() => Game.mapTarget != null));
await waitMs(1500);
await shot('map-walk');

console.log('1️⃣3️⃣ tap 回家 → 房間');
await tapEl('#map-home');
await waitMs(900);
check('回家 → 房間 free', (await sub()) === 'free/game');
await shot('home');

check('全程 0 pageerror', errors.length === 0);
console.log(fails === 0 ? '✅ 14a 手機基礎測試完成' : `❌ 14a 完成（${fails} 項失敗）`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);
