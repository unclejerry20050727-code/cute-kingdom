/* ══════════ 可愛國 — 建造系統專測（第九輪b）══════════
 * 注入 stage=done 存檔 → 放家具 / 換色 / 移除 / 重新載入驗證
 * 用法：node test/peek-build.mjs
 */
import { chromium } from 'playwright';
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
await mkdir(SHOTS, { recursive: true });
const SAVE_KEY = 'cute-kingdom-save-v1';
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
let step = 0, fails = 0;
async function shot(name, note = '') {
  step++;
  const f = path.join(SHOTS, `b${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  console.log(`  📸 ${path.basename(f)}  ${note}`);
}
function check(label, ok) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) fails++;
}
const G = (fn, args) => page.evaluate(fn, args);
const tilePt = (tx, ty) => G(([a, b]) => {
  const [sx, sy] = P(a, b);
  return { x: Game.offX + sx * Game.ws, y: Game.offY + sy * Game.ws };
}, [tx, ty]);
async function placeItemByName(name, tx, ty) {
  await page.click(`#build-items .build-item:has-text("${name}")`);
  await ms(400);
  const pt = await tilePt(tx, ty);
  await page.mouse.move(pt.x, pt.y);
  await ms(350);
  await page.mouse.click(pt.x, pt.y);
  await ms(500);
}
const wallPt = (wall, pos, h) => G(([w, p, hh]) => {
  const [x, y] = P(w === 'A' ? p + 0.5 : 0, w === 'A' ? 0 : p + 0.5, -hh);
  return { x: Game.offX + x * Game.ws, y: Game.offY + y * Game.ws };
}, [wall, pos, h]);
async function placeWallByName(name, wall, pos, h) {
  await page.click(`#build-items .build-item:has-text("${name}")`);
  await ms(400);
  const pt = await wallPt(wall, pos, h);
  await page.mouse.move(pt.x, pt.y);
  await ms(350);
  await page.mouse.click(pt.x, pt.y);
  await ms(500);
}

/* ── 1. 注入 done 存檔（男角、床已放）→ 載入 ── */
await page.goto(`http://127.0.0.1:${PORT}/`);
await page.evaluate((KEY) => {
  localStorage.setItem(KEY, JSON.stringify({
    cfg: defaultConfig('male'),
    furniture: [{ id: 'bed', tx: 6, ty: 3 }],
    wallItems: [],
    tints: { wall: 0, floor: 0 },
    stage: 'done',
    money: 100,
    gear: { uniform: false, hat: false },
  }));
}, SAVE_KEY);
await page.reload();
await ms(800);
await page.click('#cover-enter'); await ms(500);
await page.click('#btn-start'); await ms(1200);
check('載入存檔 → sub=free', (await G(() => Game.sub)) === 'free');
check('床在存檔中', (await G(() => Game.furniture.length)) === 1);
await shot('free-start', `sub=${await G(() => Game.sub)}`);

/* ── 2. 建造面板：家具 8 張卡 ── */
await page.click('#build-btn'); await ms(500);
const nCards = await G(() => document.querySelectorAll('#build-items .build-item').length);
check(`家具卡 8 張（實際 ${nCards}）`, nCards === 8);
await shot('panel-furniture');

/* ── 3. 放書桌 / 椅子 / 沙發 ── */
await placeItemByName('書桌', 6.5, 6.5);
check('放書桌 → 2 件家具', (await G(() => Game.furniture.length)) === 2);
await shot('placed-desk');
await placeItemByName('椅子', 3.5, 6.5);
check('放椅子 → 3 件家具', (await G(() => Game.furniture.length)) === 3);
await placeItemByName('沙發', 8.5, 6.5);
check('放沙發 → 4 件家具', (await G(() => Game.furniture.length)) === 4);
check('放完後 sub 回 free', (await G(() => Game.sub)) === 'free');
await shot('room-furniture', '床+書桌+椅子+沙發');

/* ── 4. 牆飾 tab：6 張卡（第九輪d） ── */
await page.click('.btab[data-tab="wall"]'); await ms(400);
const nWall = await G(() => document.querySelectorAll('#build-items .build-item').length);
check(`牆飾卡 6 張（實際 ${nWall}）`, nWall === 6);
await shot('wall-cards');

/* ── 5. 擺飾 tab：4 張卡，放盆栽 + 氣球 ── */
await page.click('.btab[data-tab="decor"]'); await ms(300);
const nDeco = await G(() => document.querySelectorAll('#build-items .build-item').length);
check(`擺飾卡 4 張（實際 ${nDeco}）`, nDeco === 4);
await shot('panel-decor');
await placeItemByName('盆栽', 1.5, 3.5);
check('放盆栽 → 5 件', (await G(() => Game.furniture.length)) === 5);
await placeItemByName('氣球', 8.5, 4.5);
check('放氣球 → 6 件', (await G(() => Game.furniture.length)) === 6);

/* ── 6. 地飾 tab：4 張卡，放地毯/地板貼/門墊/小花叢 ── */
await page.click('.btab[data-tab="floor"]'); await ms(300);
const nFloor = await G(() => document.querySelectorAll('#build-items .build-item').length);
check(`地飾卡 4 張（實際 ${nFloor}）`, nFloor === 4);
await shot('panel-floor');
await placeItemByName('地毯', 6.5, 4.5);
check('放地毯(2x2) → 7 件', (await G(() => Game.furniture.length)) === 7);
await placeItemByName('地板貼', 4.5, 3.5);
check('放地板貼 → 8 件', (await G(() => Game.furniture.length)) === 8);
await placeItemByName('門墊', 1.5, 8.5);
check('放門墊 → 9 件', (await G(() => Game.furniture.length)) === 9);
await placeItemByName('小花叢', 2.5, 4.5);
check('放小花叢 → 10 件', (await G(() => Game.furniture.length)) === 10);
check('放完後 sub 回 free', (await G(() => Game.sub)) === 'free');
await shot('room-decor', '地毯+貼紙+門墊+小花+盆栽+氣球');
/* 同層重疊：第二張地毯壓第一張 → 拒絕 */
await placeItemByName('地毯', 7.5, 5.5);
check('地毯重疊被拒 → 仍 10 件', (await G(() => Game.furniture.length)) === 10);
await page.keyboard.press('Escape'); await ms(300);

/* ── 7. 牆飾放置：心形框(牆A槽1)＋時鐘(牆B槽2)＋窗戶槽拒絕 ── */
await page.click('.btab[data-tab="wall"]'); await ms(400);
await placeWallByName('心形框', 'A', 1, 170);
check('牆 A 槽 1 掛心形框', (await G(() => Game.wallItems.length)) === 1);
check('心形框確在 A 槽 1', (await G(() => JSON.stringify(Game.wallItems[0]))) === '{"id":"heartFrame","wall":"A","pos":1}');
await placeWallByName('時鐘', 'B', 2, 185);
check('牆 B 槽 2 掛時鐘', (await G(() => Game.wallItems.length)) === 2);
check('時鐘確在 B 槽 2', (await G(() => JSON.stringify(Game.wallItems[1]))) === '{"id":"clock","wall":"B","pos":2}');
await placeWallByName('海報', 'A', 8, 150);
check('牆 A 槽 8 掛海報', (await G(() => Game.wallItems.length)) === 3);
await placeWallByName('牆架', 'A', 6, 105);
check('牆 A 槽 6 掛牆架', (await G(() => Game.wallItems.length)) === 4);
await placeWallByName('彩旗', 'B', 0, 232);
check('牆 B 槽 0 掛彩旗(span 2) → 5 件牆飾', (await G(() => Game.wallItems.length)) === 5);
check('彩旗佔 B 槽 0', (await G(() => Game.wallItems.some(w => w.id === 'garland' && w.wall === 'B' && w.pos === 0))) === true);
/* 彩旗 max 1：再點被拒 */
await page.click('#build-items .build-item:has-text("彩旗")'); await ms(400);
check('再掛彩旗被拒', (await G(() => Game.placement)) === null);
await shot('room-wall', '5 件牆飾：心形框/時鐘/海報/牆架/彩旗');
/* 窗戶槽（牆 A 槽 3）應判無效 */
await page.click('#build-items .build-item:has-text("星星框")'); await ms(400);
const badPt = await wallPt('A', 3, 170);
await page.mouse.move(badPt.x, badPt.y); await ms(400);
check('窗戶槽判無效', (await G(() => Game.placement.valid)) === false);
await page.keyboard.press('Escape'); await ms(400);
check('Esc 取消放置', (await G(() => Game.placement)) === null);

/* ── 8. 裝潢換色 ── */
await page.click('.btab[data-tab="renovate"]'); await ms(300);
check('標籤顯示目前色（原色）', (await G(() => document.querySelector('.tint-label').textContent)) === '牆面色：原色');
await shot('tab-renovate');
await page.locator('.tint-row').nth(0).locator('.tint-chip').nth(1).click(); /* 牆→粉嫩 */
await ms(300);
await page.locator('.tint-row').nth(1).locator('.tint-chip').nth(2).click(); /* 地板→薄荷 */
await ms(400);
check('tints = {wall:1, floor:2}', (await G(() => JSON.stringify(Game.tints))) === '{"wall":1,"floor":2}');
/* 第 5 色（檸檬）要可點——舊布局被「出門」鈕蓋住 */
await page.locator('.tint-row').nth(0).locator('.tint-chip').nth(4).click(); /* 牆→檸檬 */
await ms(300);
check('牆面換成檸檬（第 5 格可點）', (await G(() => Game.tints.wall)) === 4);
check('標籤跟隨目前色', (await G(() => document.querySelector('.tint-label').textContent)) === '牆面色：檸檬');
check('toast 帶色名', (await G(() => document.querySelector('#toast').textContent)) === '牆面換成「檸檬」囉～');
check('混搭提示在', (await G(() => document.querySelector('#build-items .build-empty').textContent)) === '點色塊即換色，牆面、地板可自由混搭～');
await G(() => closeBuildPanel());
await ms(300);
await shot('tinted-room', '牆檸檬+地板薄荷');

/* ── 9. 移除模式 ── */
await page.click('#build-btn'); await ms(400);
await page.click('.btab[data-tab="remove"]'); await ms(300);
await page.click('#build-items .build-item'); await ms(400);
check('移除模式 sub=placing', (await G(() => Game.sub)) === 'placing');
const chairPt = await tilePt(3.5, 6.5);
await page.mouse.move(chairPt.x, chairPt.y); await ms(400);
check('椅子被標記', (await G(() => Game.placement.target))?.type === 'floor');
await shot('remove-hover', '椅子紅色標記');
await page.mouse.click(chairPt.x, chairPt.y); await ms(500);
check('移除椅子 → 9 件家具', (await G(() => Game.furniture.length)) === 9);
/* 床不可移除 */
const bedPt = await tilePt(6.5, 3.5);
await page.mouse.move(bedPt.x, bedPt.y); await ms(400);
await page.mouse.click(bedPt.x, bedPt.y); await ms(400);
check('床不可移除 → 仍 9 件', (await G(() => Game.furniture.length)) === 9);
await shot('remove-bed-toast');
/* 再移除盆栽＋氣球（不擋路的擺飾也可移除） */
const plantPt = await tilePt(1.5, 3.5);
await page.mouse.move(plantPt.x, plantPt.y); await ms(400);
await page.mouse.click(plantPt.x, plantPt.y); await ms(500);
check('移除盆栽 → 8 件', (await G(() => Game.furniture.length)) === 8);
const balloonPt = await tilePt(8.5, 4.5);
await page.mouse.move(balloonPt.x, balloonPt.y); await ms(400);
await page.mouse.click(balloonPt.x, balloonPt.y); await ms(500);
check('移除氣球 → 7 件', (await G(() => Game.furniture.length)) === 7);
/* 牆飾移除：心形框（牆 A 槽 1） */
const heartPt = await wallPt('A', 1, 170);
await page.mouse.move(heartPt.x, heartPt.y); await ms(400);
check('心形框被標記', (await G(() => Game.placement.target))?.type === 'wall');
await page.mouse.click(heartPt.x, heartPt.y); await ms(500);
check('移除心形框 → 牆飾剩 4', (await G(() => Game.wallItems.length)) === 4);
check('時鐘仍在（B 槽 2）', (await G(() => Game.wallItems.some(w => w.id === 'clock' && w.wall === 'B' && w.pos === 2))) === true);
await shot('remove-wall');
await page.keyboard.press('Escape'); await ms(400);
check('Esc 離開移除模式', (await G(() => Game.sub)) === 'free');

/* ── 10. 重新載入 → 持久化 ── */
await page.reload(); await ms(800);
await page.click('#cover-enter'); await ms(500);
await page.click('#btn-start'); await ms(1200);
check('reload 後 7 件家具', (await G(() => Game.furniture.length)) === 7);
check('reload 後牆飾 4 件', (await G(() => Game.wallItems.length)) === 4);
check('reload 後 tints 保留', (await G(() => JSON.stringify(Game.tints))) === '{"wall":4,"floor":2}');
await shot('after-reload', '換色+家具+牆飾保留');

console.log(fails === 0 ? '\n✅ 建造系統測試全過' : `\n❌ ${fails} 項失敗`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);
