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

/* ── 4. 牆飾 / 擺飾 / 地飾：敬請期待 ── */
await page.click('.btab[data-tab="wall"]'); await ms(300);
check('牆飾 tab 顯示敬請期待', (await G(() => document.querySelector('#build-items').textContent)).includes('敬請期待'));
await shot('tab-wall-empty');
await page.click('.btab[data-tab="decor"]'); await ms(300);
check('擺飾 tab 顯示敬請期待', (await G(() => document.querySelector('#build-items').textContent)).includes('敬請期待'));

/* ── 5. 裝潢換色 ── */
await page.click('.btab[data-tab="renovate"]'); await ms(300);
await shot('tab-renovate');
await page.locator('.tint-row').nth(0).locator('.tint-chip').nth(1).click(); /* 牆→粉嫩 */
await ms(300);
await page.locator('.tint-row').nth(1).locator('.tint-chip').nth(2).click(); /* 地板→薄荷 */
await ms(400);
check('tints = {wall:1, floor:2}', (await G(() => JSON.stringify(Game.tints))) === '{"wall":1,"floor":2}');
await G(() => closeBuildPanel());
await ms(300);
await shot('tinted-room', '牆粉嫩+地板薄荷');

/* ── 6. 移除模式 ── */
await page.click('#build-btn'); await ms(400);
await page.click('.btab[data-tab="remove"]'); await ms(300);
await page.click('#build-items .build-item'); await ms(400);
check('移除模式 sub=placing', (await G(() => Game.sub)) === 'placing');
const chairPt = await tilePt(3.5, 6.5);
await page.mouse.move(chairPt.x, chairPt.y); await ms(400);
check('椅子被標記', (await G(() => Game.placement.target))?.type === 'floor');
await shot('remove-hover', '椅子紅色標記');
await page.mouse.click(chairPt.x, chairPt.y); await ms(500);
check('移除椅子 → 3 件家具', (await G(() => Game.furniture.length)) === 3);
/* 床不可移除 */
const bedPt = await tilePt(6.5, 3.5);
await page.mouse.move(bedPt.x, bedPt.y); await ms(400);
await page.mouse.click(bedPt.x, bedPt.y); await ms(400);
check('床不可移除 → 仍 3 件', (await G(() => Game.furniture.length)) === 3);
await shot('remove-bed-toast');
await page.keyboard.press('Escape'); await ms(400);
check('Esc 離開移除模式', (await G(() => Game.sub)) === 'free');

/* ── 7. 重新載入 → 持久化 ── */
await page.reload(); await ms(800);
await page.click('#cover-enter'); await ms(500);
await page.click('#btn-start'); await ms(1200);
check('reload 後 3 件家具', (await G(() => Game.furniture.length)) === 3);
check('reload 後 tints 保留', (await G(() => JSON.stringify(Game.tints))) === '{"wall":1,"floor":2}');
await shot('after-reload', '換色+家具保留');

console.log(fails === 0 ? '\n✅ 建造系統測試全過' : `\n❌ ${fails} 項失敗`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);
