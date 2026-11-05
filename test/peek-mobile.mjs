/* ══════════ 14a+14b — 手機觸控完整流程測試 ══════════
 * 用法：node test/peek-mobile.mjs
 * 390×844 直式手機視口 + 真實觸控（hasTouch），對標 flow.mjs 32 步的 touch 版：
 * 封面→標題→建角→睜眼→對話→wakeup→放床（拖曳 ghost）→誇獎→出門→地圖走路→回家
 * →牆飾放置（拖曳上牆）→牆飾調高度（wallAdj ▲）→移除模式→商店（買制服+帽子）
 * →打工 L1（tap 關卡卡→依食譜 tap 食材卡）→回房→重新整理續玩存檔
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
/* 已掛牆飾的 hit 中心（wallAdj 入口 tap 用） */
async function wallItemCenter(idx) {
  return page.evaluate((i) => {
    const w = Game.wallItems[i];
    const it = WALL_ITEMS[w.id];
    const hMid = w.h != null ? w.h : (it ? (it.hMid ?? 110) : 110);
    const span = it ? (it.span || 1) : 1;
    const [cx, cy] = P(w.wall === 'A' ? w.pos + 0.5 * span : 0, w.wall === 'A' ? 0 : w.pos + 0.5 * span, -hMid);
    return { x: Game.offX + cx * Game.ws, y: Game.offY + cy * Game.ws };
  }, idx);
}
/* 牆 B（左牆）pos≈2 的牆面點（forbid 6-8 是門，避開） */
async function wallBPoint() {
  return page.evaluate(() => {
    const [ax, ay] = P(0, 0);
    const [cx] = P(0, N);
    const mx = ax - (ax - cx) * 0.25;          /* u=2.5 → pos 2 */
    const my = ay + (ax - mx) * 0.5 - 90;     /* 地板線以上＝牆面 */
    return { x: Game.offX + mx * Game.ws, y: Game.offY + my * Game.ws };
  });
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

/* ══════ 14b：牆飾／移除／商店／打工／存檔 ══════ */
console.log('1️⃣4️⃣ 建造面板：tap 牆飾 tab → 心形框 → 拖曳上牆 B pos2 → tap 掛上');
await tapEl('#build-btn');
await waitMs(400);
await tapEl('.btab[data-tab="wall"]');
await waitMs(400);
check('牆飾 tab 可用（家具已放過床）', (await page.locator('#build-items .build-item').count()) >= 4);
await tapEl('#build-items .build-item');
await waitMs(500);
check('牆飾卡 tap → 牆飾放置', (await sub()) === 'placing/game'
  && (await page.evaluate(() => Game.placement && Game.placement.mode === 'wall')));
const wStart = await tilePt(4, 7);
const wEnd = await wallBPoint();
await touchDrag(wStart, wEnd);
await waitMs(300);
const wGhost = await page.evaluate(() => ({ wall: Game.placement.wall, pos: Game.placement.pos, valid: Game.placement.valid }));
check('拖曳上牆 → ghost 對準牆 B pos2', wGhost.wall === 'B' && wGhost.pos === 2 && wGhost.valid === true);
await shot('wall-ghost');
await page.touchscreen.tap(wEnd.x, wEnd.y);
await waitMs(700);
check('tap 掛上牆飾', (await page.evaluate(() => Game.wallItems.length)) === 1);
check('掛完 → 回 free＋面板重開', (await sub()) === 'free/game');
await tapEl('#build-btn'); /* 關面板，下面要直接 tap 牆飾 */
await waitMs(300);
await shot('wall-placed');

console.log('1️⃣5️⃣ tap 已掛牆飾 → wallAdj → tap ▲ 調高 → tap 確認');
const wpt1 = await wallItemCenter(0);
await page.touchscreen.tap(wpt1.x, wpt1.y);
await waitMs(400);
check('tap 牆飾 → wallAdj', (await sub()) === 'placing/game'
  && (await page.evaluate(() => Game.placement && Game.placement.mode === 'wallAdj')));
const h0 = await page.evaluate(() => Game.placement.h);
await tapEl('#pa-up');
await waitMs(300);
check('tap ▲ → 高度調高', (await page.evaluate(() => Game.placement.h)) > h0);
await shot('wall-adj');
await page.touchscreen.tap(wEnd.x, wEnd.y); /* wallAdj 下再 tap 一次＝確認（不需再 hit） */
await waitMs(500);
check('tap 確認 → 回 free、高度寫入', (await sub()) === 'free/game'
  && (await page.evaluate(() => Game.wallItems[0].h)) > h0);

console.log('1️⃣6️⃣ 移除模式：🧹 卡 → tap 牆飾移除 → ✖️ 退出');
await tapEl('#build-btn');
await waitMs(400);
await tapEl('.btab[data-tab="remove"]');
await waitMs(400);
await tapEl('#build-items .build-item');
await waitMs(400);
check('🧹 卡 → 移除模式', await page.evaluate(() => Game.placement && Game.placement.mode === 'remove'));
const wpt2 = await wallItemCenter(0);
await page.touchscreen.tap(wpt2.x, wpt2.y);
await waitMs(600);
if ((await page.evaluate(() => Game.wallItems.length)) !== 0) { /* 偶發：touch→mouse 更新競態，補一拍（牆飾在手機上 hit 寬僅 ~12px） */
  await page.touchscreen.tap(wpt2.x, wpt2.y);
  await waitMs(600);
}
check('tap 牆飾 → 移除成功', (await page.evaluate(() => Game.wallItems.length)) === 0);
await tapEl('#pa-cancel');
await waitMs(400);
check('✖️ 退出移除 → free', (await sub()) === 'free/game');
await shot('removed');

console.log('1️⃣7️⃣ tap 出門 → 地圖 → tap 麥當勞 → 商店');
await tapEl('#out-btn');
await page.waitForFunction(() => Game.sub === 'map', null, { timeout: 20000 });
await waitMs(800);
await tapWorld(490, 432);
await waitMs(700);
check('tap 麥當勞 → 商店', !(await page.evaluate(() => document.getElementById('screen-shop').classList.contains('hidd' + 'en'))));
await shot('shop');

console.log('1️⃣8️⃣ 商店：tap 買制服（50）＋帽子（30）');
const money0 = await page.evaluate(() => Game.money);
await tapEl('#buy-uniform');
await waitMs(400);
await tapEl('#buy-hat');
await waitMs(400);
check('制服+帽子 → 錢 -80', (await page.evaluate(() => Game.money)) === money0 - 80);
check('已購買標記（制服+帽子）', await page.evaluate(() => !!(Game.gear && Game.gear.uniform && Game.gear.hat)));
await shot('shop-gear');

console.log('1️⃣9️⃣ tap 關卡卡 L1 → 倒數 → 依訂單 tap 食材卡上菜 → 快轉結算存檔');
await tapEl('.level-card[data-lv="1"]');
await waitMs(700);
check('關卡卡 tap → 打工', (await sub()) === 'work/game');
await shot('work-count');
await waitMs(3000);
const recipe = await page.evaluate(() => Work.customer ? Work.customer.item.recipe.slice() : []);
check('客人已就緒（有訂單）', recipe.length > 0);
const cards = await page.evaluate(() => WORK_CARDS.map(c => ({ id: c.id, x: c.x, y: c.y + CARD_H / 2 })));
for (const id of recipe) {
  const c = cards.find(k => k.id === id);
  const p = await worldPt(c.x, c.y);
  await page.touchscreen.tap(p.x, p.y);
  await waitMs(300);
}
await waitMs(1100);
const wk = await page.evaluate(() => ({ money: Game.money, count: Work.count }));
check('依食譜 tap 完 → 上菜成功（count=1）', wk.count === 1);
check('工資入帳（錢 > 買裝備後）', wk.money > money0 - 80);
await shot('work-delivered');
/* 快轉班末：Work.left→0 觸發結算（4.2s）→ endWork 存檔回商店（不等 60 秒班） */
await page.evaluate(() => { Work.left = 0.4; });
await waitMs(700);
check('班末 → 結算畫面', (await page.evaluate(() => Work.phase)) === 'end');
await shot('work-settle');
await waitMs(4500);
check('結算完 → endWork 回商店（已存檔）', !(await page.evaluate(() => document.getElementById('screen-shop').classList.contains('hidd' + 'en')))
  && (await sub()) === 'map/game');
await tapEl('#shop-x');
await waitMs(600);
check('商店關閉 → 地圖（Work 已清）', (await sub()) === 'map/game' && (await page.evaluate(() => Work == null)));
await shot('back-map');

console.log('2️⃣0️⃣ tap 回家 → 房間');
await tapEl('#map-home');
await waitMs(900);
check('回家 → free', (await sub()) === 'free/game');
await shot('home-2');

console.log('2️⃣1️⃣ 重新整理 → 續玩（存檔：床/錢/裝備）');
const moneyFinal = await page.evaluate(() => Game.money);
await page.reload();
await waitMs(900);
await tapEl('#cover-enter');
await waitMs(600);
await tapEl('#btn-start');
await waitMs(2800);
check('續玩 → 床還在', await page.evaluate(() => Game.furniture.some(f => f.id === 'bed')));
check('續玩 → 錢持久（含工資）', (await page.evaluate(() => Game.money)) === moneyFinal);
check('續玩 → 子狀態合法', ['free', 'map', 'goOut'].includes(await page.evaluate(() => Game.sub)));
await shot('resume');

check('全程 0 pageerror', errors.length === 0);
console.log(fails === 0 ? '✅ 14b 手機完整流程測試完成' : `❌ 14b 完成（${fails} 項失敗）`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);
