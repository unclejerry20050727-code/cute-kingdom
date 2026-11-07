/* ══════════ 可愛國 — 擺拍系統專測（第十五輪）══════════
 * 注入 stage=done 存檔 → P 鍵/📷 鈕 10 姿勢循環、1.8s 自動恢復、
 * 移動取消、建造面板互斥、C 鍵/📸 鈕拍照下載、0 pageerror
 * 用法：node test/peek-pose.mjs
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.log('  ⚠️ pageerror:', e.message); });
const ms = (m) => page.waitForTimeout(m);
let step = 0, fails = 0;
async function shot(name, note = '') {
  step++;
  const f = path.join(SHOTS, `pp${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  console.log(`  📸 ${path.basename(f)}  ${note}`);
}
function check(label, ok) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) fails++;
}
const G = (fn, args) => page.evaluate(fn, args);

/* ── 1. 注入 done 存檔（男角、床已放）→ 載入 ── */
console.log('── 1. 載入 done 存檔 ──');
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
await page.click('#cover-enter');
await ms(300);
await page.click('#btn-start');
await page.waitForFunction(() => Game && Game.sub === 'free', { timeout: 15000 });
check('進入房間自由狀態', (await G(() => Game.sub)) === 'free');
check('📷 擺拍鈕顯示', await G(() => !$('#pose-btn').classList.contains('hidden')));
check('📸 拍照鈕顯示', await G(() => !$('#photo-btn').classList.contains('hidden')));
check('POSE_ORDER 共 10 姿勢', await G(() => POSE_ORDER.length === 10));
await shot('free-start', '自由狀態（兩鈕顯示）');

/* ── 2. P 鍵循環 10 姿勢 ── */
console.log('── 2. P 鍵循環 10 姿勢 ──');
const ORDER = await G(() => POSE_ORDER);
const got = [];
for (let i = 0; i < 10; i++) {
  await page.keyboard.press('p');
  await ms(120);
  got.push(await G(() => Game.player.pose && Game.player.pose.id));
}
ORDER.forEach((id, i) => check(`P${i + 1} → ${id}`, got[i] === id));
check('P 時朝向轉正面', (await G(() => Game.player.facing)) === 'down');
check('P 時停止行走', (await G(() => Game.player.walking)) === false);
check('toast 顯示姿勢名', (await G(() => $('#toast').textContent)).includes('啾咪'));
/* 第 11 次按回第一姿勢（循環） */
await page.keyboard.press('p');
await ms(120);
check('P11 循環回 peace', (await G(() => Game.player.pose && Game.player.pose.id)) === ORDER[0]);
check('poseIdx 歸 0', (await G(() => Game.player.poseIdx)) === 0);

/* ── 3. 1.8s 自動恢復 ── */
console.log('── 3. 自動恢復 ──');
await page.keyboard.press('p');
await ms(200);
check('按 P 後有姿勢', !!(await G(() => Game.player.pose)));
await page.waitForFunction(() => Game.player.pose === null, undefined, { timeout: 4000 });
check('1.8s 後自動回 idle（pose=null）', (await G(() => Game.player.pose)) === null);

/* ── 4. 移動取消 ── */
console.log('── 4. 移動取消 ──');
await page.keyboard.press('p');
await ms(150);
await page.keyboard.down('w');
await ms(200);
await page.keyboard.up('w');
check('按移動鍵立即取消姿勢', (await G(() => Game.player.pose)) === null);

/* ── 5. 建造面板互斥 ── */
console.log('── 5. 建造面板互斥 ──');
await G(() => openBuildPanel('furniture'));
await ms(300);
await page.keyboard.press('p');
await ms(150);
check('面板開啟時 P 不擺拍', (await G(() => Game.player.pose)) === null);
check('面板開啟時 📷 鈕隱藏', await G(() => $('#pose-btn').classList.contains('hidden')));
check('面板開啟時 📸 鈕隱藏', await G(() => $('#photo-btn').classList.contains('hidden')));
await G(() => closeBuildPanel());
await ms(200);
check('面板關閉後 📷 鈕恢復', await G(() => !$('#pose-btn').classList.contains('hidden')));
check('面板關閉後 📸 鈕恢復', await G(() => !$('#photo-btn').classList.contains('hidden')));

/* ── 6. 拍照下載 ── */
console.log('── 6. 拍照下載 ──');
check('canvas toDataURL 有效（>10KB）', await G(() => Game.canvas.toDataURL('image/png').length) > 10000);
const [dl1] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.keyboard.press('c'),
]);
check('C 鍵下載 PNG（檔名格式）', /^cute-kingdom-\d+\.png$/.test(dl1.suggestedFilename()));
check('拍照 toast', (await G(() => $('#toast').textContent)).includes('拍照完成'));
/* 擺姿中點 📸 鈕 */
await page.keyboard.press('p');
await ms(300);
const dl2Promise = page.waitForEvent('download', { timeout: 10000 });
await page.click('#photo-btn');
await ms(50); /* e3：toBlob 是異步，download 事件會延遲；pose 檢查要點完立即做（takePhoto 同步段不該碰 pose） */
check('拍照不中斷姿勢', !!(await G(() => Game.player.pose)));
const dl2 = await dl2Promise;
check('📸 鈕下載 PNG（擺姿中）', /^cute-kingdom-\d+\.png$/.test(dl2.suggestedFilename()));
await G(() => { Game.player.pose = null; });

/* ── 7. 十姿勢遊戲內截圖（目視 QA）── */
console.log('── 7. 十姿勢截圖 ──');
for (const id of ORDER) {
  await G((pid) => { Game.player.pose = { id: pid, t: 0.9 }; Game.player.facing = 'down'; Game.player.walking = false; }, id);
  await ms(150);
  await shot(`pose-${id}`, id);
}
await G(() => { Game.player.pose = null; });
await ms(100);

/* ── 8. 地圖擺拍（16a）── */
console.log('── 8. 地圖擺拍 ──');
await page.click('#out-btn');
await page.waitForFunction(() => Game.sub === 'map', undefined, { timeout: 8000 }); /* 含 3.2s loading 過場 */
check('地圖 📷 擺拍鈕顯示', await G(() => !$('#pose-btn').classList.contains('hidden')));
check('地圖 📸 拍照鈕顯示', await G(() => !$('#photo-btn').classList.contains('hidden')));
await page.keyboard.press('p');
await ms(150);
check('P 在地圖可擺拍（mapP.pose）', (await G(() => Game.mapP.pose && Game.mapP.pose.id)) === 'peace');
check('地圖擺拍朝向轉正面', (await G(() => Game.mapP.facing)) === 'down');
await shot('map-pose-peace', '地圖擺拍 peace');
await page.keyboard.down('w');
await ms(200);
await page.keyboard.up('w');
check('地圖移動取消擺拍', (await G(() => Game.mapP.pose)) === null);
const [dl3] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.keyboard.press('c'),
]);
check('地圖 C 鍵拍照下載', /^cute-kingdom-\d+\.png$/.test(dl3.suggestedFilename()));

/* ── 結果 ── */
check('全程 0 pageerror', pageErrors === 0);
console.log(fails === 0 ? '\n✅ 擺拍系統測試全過' : `\n❌ ${fails} 項失敗`);
await browser.close();
server.close();
process.exit(fails === 0 ? 0 : 1);
