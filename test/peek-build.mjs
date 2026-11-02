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
check('心形框確在 A 槽 1', (await G(() => JSON.stringify(Game.wallItems[0]))) === '{"id":"heartFrame","wall":"A","pos":1,"h":170}');
await placeWallByName('時鐘', 'B', 2, 185);
check('牆 B 槽 2 掛時鐘', (await G(() => Game.wallItems.length)) === 2);
check('時鐘確在 B 槽 2', (await G(() => JSON.stringify(Game.wallItems[1]))) === '{"id":"clock","wall":"B","pos":2,"h":185}');
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

/* ── 9½. 家具轉向（第十輪c）── */
/* （面板已因 Esc 取消移除而自動重開，不需再按 #build-btn） */
await page.click('.btab[data-tab="furniture"]'); await ms(300);
await page.click('#build-items .build-item:has-text("書桌")'); await ms(400);
check('放置提示含 R 旋轉', (await G(() => document.querySelector('#hint-bar').textContent)).includes('R 旋轉'));
await page.keyboard.press('r'); await ms(200);
check('按 R → rot=1（1×2）', (await G(() => Game.placement.rot)) === 1);
const rotDeskPt = await tilePt(2.5, 7.5);
await page.mouse.move(rotDeskPt.x, rotDeskPt.y); await ms(400);
check('旋轉書桌 ghost 有效（1×2 空格）', (await G(() => Game.placement.valid)) === true);
await shot('rot-ghost', '旋轉 1×2 書桌 ghost');
await page.mouse.click(rotDeskPt.x, rotDeskPt.y); await ms(500);
check('旋轉書桌放下 (rot=1)', (await G(() => Game.furniture.some(f => f.id === 'desk' && f.rot === 1))) === true);
check('blocked 跟隨旋轉後 1×2 足跡', await G(() => Game.blocked.has('2,7') && Game.blocked.has('2,8') && !Game.blocked.has('3,7')));
await page.click('#build-items .build-item:has-text("鋼琴")'); await ms(400);
await page.keyboard.press('r'); await ms(150);
await page.keyboard.press('r'); await ms(150);
check('再按 R×2 → 回 rot=0（2×1）', (await G(() => Game.placement.rot)) === 0);
await page.keyboard.press('Escape'); await ms(300);
await G(() => closeBuildPanel()); await ms(300);
await shot('rot-placed', '旋轉書桌 1×2 入駐');

/* ── 9¾. 擺飾放家具上（第十一輪b：高度觀念）── */
/* 書桌在 (6,6) 2×1 → 盆栽放 (6,6) 格：舊版會因 blocked 拒絕，新版允許且抬高到桌面 */
await page.click('#build-btn'); await ms(400);
await page.click('.btab[data-tab="decor"]'); await ms(300);
await page.click('#build-items .build-item:has-text("盆栽")'); await ms(400);
const deskTilePt = await tilePt(6.5, 6.5);
await page.mouse.move(deskTilePt.x, deskTilePt.y); await ms(400);
check('盆栽可放書桌格（11b 擺飾上家具）', (await G(() => Game.placement?.valid)) === true);
check('surfaceHAt 書桌格 = 書桌 h(34)', (await G(() => surfaceHAt(6, 6))) === 34);
await shot('decor-on-furniture-ghost', '盆栽 ghost 站在書桌上');
await page.mouse.click(deskTilePt.x, deskTilePt.y); await ms(500);
check('盆栽放上書桌 → 9 件', (await G(() => Game.furniture.length)) === 9);
check('盆栽確實落在 (6,6)', (await G(() => Game.furniture.some(f => f.id === 'plant' && f.tx === 6 && f.ty === 6))) === true);
/* 移除：家具上的擺飾也能點到並移除 */
await page.click('.btab[data-tab="remove"]'); await ms(300);
await page.click('#build-items .build-item'); await ms(400);
await page.mouse.move(deskTilePt.x, deskTilePt.y); await ms(400);
check('書桌上的盆栽被標記（不是書桌）', (await G(() => Game.placement.target ? Game.furniture[Game.placement.target.idx]?.id : null)) === 'plant');
await shot('decor-on-furniture-remove', '家具上擺飾的移除標記');
await page.mouse.click(deskTilePt.x, deskTilePt.y); await ms(500);
check('移除書桌上的盆栽 → 8 件', (await G(() => Game.furniture.length)) === 8);
check('書桌仍在（只拆了擺飾）', (await G(() => Game.furniture.some(f => f.id === 'desk' && f.tx === 6 && f.ty === 6))) === true);
await page.keyboard.press('Escape'); await ms(300);

/* ── 9⅞. 牆飾高度（第十一輪c）── */
/* 放置：心形框掛牆 A 槽 9（A8 已被海報佔），先 ↑↑ 調高再掛（hMid 170 → 182） */
await page.click('.btab[data-tab="wall"]'); await ms(300);
await page.click('#build-items .build-item:has-text("心形框")'); await ms(400);
check('牆飾放置初始 h = hMid(170)', (await G(() => Game.placement.h)) === 170);
await page.keyboard.press('ArrowUp'); await ms(150);
await page.keyboard.press('ArrowUp'); await ms(150);
check('↑↑ → h=182', (await G(() => Game.placement.h)) === 182);
const wallHPt = await wallPt('A', 9, 182);
await page.mouse.move(wallHPt.x, wallHPt.y); await ms(400);
check('牆 A 槽 9 有效', (await G(() => Game.placement.valid)) === true);
await shot('wall-h-ghost', '心形框 ghost 調高位置');
await page.mouse.click(wallHPt.x, wallHPt.y); await ms(500);
check('心形框掛 A9 → 5 件牆飾', (await G(() => Game.wallItems.length)) === 5);
check('心形框帶 h=182', (await G(() => Game.wallItems.find(w => w.id === 'heartFrame' && w.wall === 'A' && w.pos === 9)?.h)) === 182);
check('掛完 sub 回 free', (await G(() => Game.sub)) === 'free');
await shot('wall-h-placed', '心形框掛在調過的高度');
/* 調整：點時鐘（B2，hMid 185）→ wallAdj → ↓ 一步 → 點確認 */
const clockPt = await wallPt('B', 2, 185);
await page.mouse.click(clockPt.x, clockPt.y); await ms(400);
check('點時鐘 → wallAdj', (await G(() => Game.placement?.mode)) === 'wallAdj');
check('wallAdj 初始 h=185', (await G(() => Game.placement?.h)) === 185);
await page.keyboard.press('ArrowDown'); await ms(200);
check('↓ → h=179', (await G(() => Game.placement?.h)) === 179);
await shot('wall-h-adj-ghost', '時鐘 ghost 下移');
await page.mouse.click(clockPt.x, clockPt.y); await ms(500);
check('點確認 → 時鐘 h=179', (await G(() => Game.wallItems.find(w => w.id === 'clock')?.h)) === 179);
check('調完 sub 回 free', (await G(() => Game.sub)) === 'free');
await shot('wall-h-adjusted', '時鐘下移後的房間');

/* ── 9⅞d. 觸控按鈕（第十一輪d）── */
await page.click('.btab[data-tab="furniture"]'); await ms(300);
await page.click('#build-items .build-item:has-text("鋼琴")'); await ms(400);
check('放置中 #place-actions 顯示', (await G(() => !document.querySelector('#place-actions').classList.contains('hidden'))) === true);
check('🔄 顯示（非正方形鋼琴）', (await G(() => !document.querySelector('#pa-rot').classList.contains('hidden'))) === true);
check('▲▼ 隱藏（非牆飾）', (await G(() => document.querySelector('#pa-up').classList.contains('hidden'))) === true);
await page.click('#pa-rot'); await ms(200);
check('🔄 點一下 → rot=1', (await G(() => Game.placement.rot)) === 1);
await page.click('#pa-cancel'); await ms(300);
check('✖️ 點一下 → 取消（sub free）', (await G(() => Game.sub)) === 'free');
check('取消後 #place-actions 隱藏', (await G(() => document.querySelector('#place-actions').classList.contains('hidden'))) === true);
/* 牆飾：▲▼ 顯示、🔄 隱藏 */
await page.click('.btab[data-tab="wall"]'); await ms(300);
await page.click('#build-items .build-item:has-text("星星框")'); await ms(400);
check('牆飾放置：▲▼ 顯示', (await G(() => !document.querySelector('#pa-up').classList.contains('hidden') && !document.querySelector('#pa-down').classList.contains('hidden'))) === true);
check('牆飾放置：🔄 隱藏', (await G(() => document.querySelector('#pa-rot').classList.contains('hidden'))) === true);
await page.click('#pa-up'); await ms(150);
await page.click('#pa-up'); await ms(150);
check('▲▲ → h=177', (await G(() => Game.placement.h)) === 177);
await shot('touch-actions', '牆飾放置中的觸控操作鈕');
await page.click('#pa-cancel'); await ms(300);
check('✖️ 取消牆飾放置', (await G(() => Game.sub)) === 'free');

/* ── 9⁞. 移除優先序：家具上的擺飾先拆（第十二輪）── */
/* 盆栽放床上（床不可移除）→ 驗證上面的擺飾可先拆、床之後受保護 */
await page.click('.btab[data-tab="decor"]'); await ms(300);
await page.click('#build-items .build-item:has-text("盆栽")'); await ms(400);
const bedTopPt = await tilePt(6.5, 3.5);
await page.mouse.move(bedTopPt.x, bedTopPt.y); await ms(400);
check('盆栽可放床格', (await G(() => Game.placement?.valid)) === true);
await page.mouse.click(bedTopPt.x, bedTopPt.y); await ms(500);
check('盆栽放上床 → 9 件', (await G(() => Game.furniture.length)) === 9);
check('盆栽確在床上 (6,3)', (await G(() => Game.furniture.some(f => f.id === 'plant' && f.tx === 6 && f.ty === 3))) === true);
/* 移除模式：床格上應標最上面的盆栽（舊 bug：床先被標→盆栽永遠拆不到） */
await page.click('.btab[data-tab="remove"]'); await ms(300);
await page.click('#build-items .build-item'); await ms(400);
await page.mouse.move(bedTopPt.x, bedTopPt.y); await ms(400);
check('床格標記上面的盆栽（非床）', (await G(() => Game.placement.target ? Game.furniture[Game.placement.target.idx]?.id : null)) === 'plant');
await shot('remove-top-decor', '移除模式：床上的盆栽被標記');
await page.mouse.click(bedTopPt.x, bedTopPt.y); await ms(500);
check('移除床上的盆栽 → 8 件', (await G(() => Game.furniture.length)) === 8);
check('床仍在', (await G(() => Game.furniture.some(f => f.id === 'bed'))) === true);
/* 再 hover → 這次標床；點 → 床拆不掉 */
await page.mouse.move(bedTopPt.x, bedTopPt.y); await ms(400);
check('再 hover 標到床', (await G(() => Game.placement.target ? Game.furniture[Game.placement.target.idx]?.id : null)) === 'bed');
await page.mouse.click(bedTopPt.x, bedTopPt.y); await ms(400);
check('床拆不掉（仍 8 件）', (await G(() => Game.furniture.length)) === 8);
await page.keyboard.press('Escape'); await ms(300);

/* ── 10. 重新載入 → 持久化 ── */
await page.reload(); await ms(800);
await page.click('#cover-enter'); await ms(500);
await page.click('#btn-start'); await ms(1200);
check('reload 後 8 件家具（含旋轉書桌）', (await G(() => Game.furniture.length)) === 8);
check('reload 後旋轉狀態保留 (rot=1)', (await G(() => Game.furniture.some(f => f.id === 'desk' && f.rot === 1))) === true);
check('reload 後旋轉足跡 blocked 正確', await G(() => Game.blocked.has('2,7') && Game.blocked.has('2,8') && !Game.blocked.has('3,7')));
check('reload 後牆飾 5 件', (await G(() => Game.wallItems.length)) === 5);
check('reload 後牆飾 h 保留（時鐘 179 / 心形框 182）', (await G(() => {
  const c = Game.wallItems.find(w => w.id === 'clock');
  const hf = Game.wallItems.find(w => w.id === 'heartFrame');
  return c?.h === 179 && hf?.h === 182;
})) === true);
check('reload 後 tints 保留', (await G(() => JSON.stringify(Game.tints))) === '{"wall":4,"floor":2}');
await shot('after-reload', '換色+家具+牆飾保留');

console.log(fails === 0 ? '\n✅ 建造系統測試全過' : `\n❌ ${fails} 項失敗`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);
