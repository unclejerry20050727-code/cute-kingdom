/* ══════════ 可愛國 — 節慶裝飾專測（第十四輪c）══════════
 * Part A：全新遊戲 → 建角 → 教學中點 🎉 節慶 tab → 驗證教學鎖
 * Part B：注入 done 存檔 → 🎉 頁 7 張卡 → 放 7 件＋onFurn（禮盒上書桌）
 *         → 移除 → 重新載入驗證存檔
 * 用法：node test/peek-fest.mjs
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
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') console.log('  ⚠️ console:', m.text()); });

const ms = (m) => page.waitForTimeout(m);
let step = 0, fails = 0;
async function shot(name, note = '') {
  step++;
  const f = path.join(SHOTS, `f${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  console.log(`  📸 ${path.basename(f)}  ${note}`);
}
function check(label, ok) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) fails++;
}
const G = (fn, args) => page.evaluate(fn, args);
const sub = () => page.evaluate(() => (typeof Game !== 'undefined') ? Game.sub + '/' + Game.state : 'no-Game');
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
/* 對話（複製自 flow.mjs） */
async function dlgActive() {
  return page.evaluate(() => !document.getElementById('dialogue').classList.contains('hidden'));
}
async function dlgClick() {
  await page.keyboard.press('Space');
  await ms(180);
  if (await dlgActive()) { await page.keyboard.press('Space'); await ms(180); }
}
async function dlgWaitDone(timeout = 30000) {
  await page.waitForFunction(() => document.getElementById('dialogue').classList.contains('hidden'), { timeout });
}

/* ══════════ Part A：教學中 🎉 節慶 tab 被鎖 ══════════ */
console.log('\n══ Part A：全新遊戲 → 教學鎖 ══');
await page.goto(`http://127.0.0.1:${PORT}/`);
await page.evaluate(KEY => localStorage.removeItem(KEY), SAVE_KEY);
await page.reload();
await ms(800);
await page.click('#cover-enter'); await ms(500);
await page.click('#btn-new'); await ms(600);
await page.click('#create-confirm'); await ms(900);
/* 點擊醒來（左看右看）→ 對話 */
await page.mouse.click(640, 400); await ms(1400); await ms(1300);
await page.waitForSelector('#dialogue:not(.hidden)', { timeout: 10000 });
await ms(700);
await dlgClick(); await ms(500);
check('wakeup 子狀態', String(await sub()).startsWith('wakeup'));
await page.mouse.click(640, 400); await ms(1200); await ms(1200);
/* 小宥自介 → 進建造教學 */
for (let i = 0; i < 8; i++) { if (!(await dlgActive())) break; await dlgClick(); }
await dlgWaitDone(); await ms(900);
check('進入建造教學 sub=tutBuild', (await G(() => Game.sub)) === 'tutBuild');
/* 點 🎉 節慶 tab → 應顯示教學鎖 */
await page.click('.btab[data-tab="fest"]'); await ms(400);
const festLock = await page.locator('#build-items .build-empty').first().textContent();
check('教學中 🎉 節慶 tab 鎖住', (await page.locator('#build-items .build-empty').count()) === 1 && festLock.includes('先完成放床教學'));
await shot('a-tutorial-lock', `節慶頁文案：${festLock.trim()}`);

/* ══════════ Part B：done 存檔 → 7 件放置＋onFurn＋移除＋存檔 ══════════ */
console.log('\n══ Part B：done 存檔 → 節慶放置 ══');
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

/* 開建造面板 → 🎉 節慶頁：7 張卡 */
await page.click('#build-btn'); await ms(500);
await page.click('.btab[data-tab="fest"]'); await ms(500);
const nFest = await G(() => document.querySelectorAll('#build-items .build-item').length);
check(`🎉 節慶頁 7 張卡（實際 ${nFest}）`, nFest === 7);
await shot('b-fest-tab', '7 件節慶卡預覽');

/* 先放書桌（6,6）做 onFurn 承面 */
await page.click('.btab[data-tab="furniture"]'); await ms(400);
await placeItemByName('書桌', 6.5, 6.5);
check('放書桌 → 2 件家具', (await G(() => Game.furniture.length)) === 2);
await shot('b-desk');

/* 回 🎉 頁逐件放置 */
await page.click('.btab[data-tab="fest"]'); await ms(400);
await placeItemByName('生日蛋糕', 2.5, 2.5);
check('放生日蛋糕 → 3 件', (await G(() => Game.furniture.length)) === 3);
await placeItemByName('聖誕樹', 1.5, 4.5);
check('放聖誕樹 → 4 件', (await G(() => Game.furniture.length)) === 4);
await placeItemByName('南瓜', 3.5, 8.5);
check('放南瓜 → 5 件', (await G(() => Game.furniture.length)) === 5);
await placeItemByName('紅燈籠', 8.5, 4.5);
check('放紅燈籠 → 6 件', (await G(() => Game.furniture.length)) === 6);
await placeItemByName('爆竹', 2.5, 5.5);
check('放爆竹 → 7 件', (await G(() => Game.furniture.length)) === 7);
await placeItemByName('氣球束', 5.5, 7.5);
check('放氣球束 → 8 件', (await G(() => Game.furniture.length)) === 8);

/* onFurn：禮盒放書桌上（驗證 valid＋surfaceHAt＋可放） */
await page.click(`#build-items .build-item:has-text("禮物盒")`); await ms(400);
const deskPt = await tilePt(6.5, 6.5);
await page.mouse.move(deskPt.x, deskPt.y); await ms(400);
const onFurnCheck = await G(() => {
  const p = Game.placement;
  return { valid: !!(p && p.valid), h: surfaceHAt(6, 6) };
});
check('禮盒 ghost 在書桌上 → valid=true（onFurn 放行 blocked 格）', onFurnCheck.valid === true);
check('surfaceHAt(6,6)=34（書桌高）', onFurnCheck.h === 34);
await shot('b-giftbox-ghost', '禮盒 ghost 浮在書桌頂面');
await page.mouse.click(deskPt.x, deskPt.y); await ms(500);
check('放禮盒上書桌 → 9 件', (await G(() => Game.furniture.length)) === 9);
/* 第二格（7,6）也可放（書桌 2 格寬） */
await placeItemByName('禮物盒', 7.5, 6.5);
check('第二格再放禮盒 → 10 件', (await G(() => Game.furniture.length)) === 10);
await shot('b-onfurn', '禮盒×2 上書桌（onFurn 抬高）');

/* 蛋糕 max=1 → 卡片應變 dis */
const cakeDis = await page.locator('#build-items .build-item:has-text("生日蛋糕").dis').count();
check('生日蛋糕 max=1 → 卡片 dis', cakeDis === 1);

/* 全家福 */
await shot('b-all', '7 件節慶裝飾全放完');

/* 移除：氣球束 */
await page.click('.btab[data-tab="remove"]'); await ms(300);
await page.click('#build-items .build-item'); await ms(400);
check('移除模式 sub=placing', (await G(() => Game.sub)) === 'placing');
const balPt = await tilePt(5.5, 7.5);
await page.mouse.move(balPt.x, balPt.y); await ms(400);
check('氣球束被標記（floor 目標）', (await G(() => Game.placement.target))?.type === 'floor');
await shot('b-remove-hover');
await page.mouse.click(balPt.x, balPt.y); await ms(500);
check('移除氣球束 → 9 件', (await G(() => Game.furniture.length)) === 9);

/* 重新載入 → 存檔驗證（含 onFurn 的禮盒） */
await page.reload();
await ms(800);
await page.click('#cover-enter'); await ms(500);
await page.click('#btn-start'); await ms(1200);
check('重載 → 9 件家具（含 2 禮盒，氣球束已移除）', (await G(() => Game.furniture.length)) === 9);
const ids = await G(() => Game.furniture.map(f => f.id).sort().join(','));
check('存檔內容正確', ids === 'bed,cake,desk,firecracker,giftBox,giftBox,lantern,pumpkin,xmasTree');
await shot('b-reload', '重載後節慶裝飾都在');

/* 收尾 */
check('無 pageerror（實際 ' + pageErrors.length + '）', pageErrors.length === 0);
console.log(`\n${fails === 0 ? '🎉 全數通過' : `❌ ${fails} 項失敗`}`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);
