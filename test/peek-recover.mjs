/* ══════════ 可愛國 — 異常存檔自愈專測（第九輪）══════════
 * 1. stage=created 但已有床（id）→ 應進 goOut，不卡放床教學
 * 2. 舊格式 bed 無 id → 自動補 id，進 goOut
 * 3. stage=bed 但沒有床 → 回到放床教學
 * 用法：node test/peek-recover.mjs
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
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };

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
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.log('  ⚠️ pageerror:', e.message); });
page.on('console', m => { if (m.type() === 'error') console.log('  ⚠️ console:', m.text()); });
const ms = (m) => page.waitForTimeout(m);
let step = 0, fails = 0;
async function shot(name, note = '') {
  step++;
  const f = path.join(SHOTS, `r${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  console.log(`  📸 ${path.basename(f)}  ${note}`);
}
function check(label, ok) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) fails++;
}
const G = (fn) => page.evaluate(fn);

/* 先在無存檔狀態載入頁面，再注入指定存檔並開始遊戲 */
async function bootWith(label) {
  await page.evaluate(({ KEY, label }) => {
    let furniture, stage;
    if (label === 'anomaly') { furniture = [{ id: 'bed', tx: 6, ty: 3 }]; stage = 'created'; }
    else if (label === 'legacy') { furniture = [{ tx: 6, ty: 3 }]; stage = 'created'; }
    else { furniture = []; stage = 'bed'; }
    localStorage.setItem(KEY, JSON.stringify({
      cfg: defaultConfig('male'),
      furniture,
      wallItems: [],
      tints: { wall: 0, floor: 0 },
      stage,
      money: 100,
      gear: { uniform: false, hat: false },
    }));
  }, { KEY: SAVE_KEY, label });
  await page.reload(); await ms(800);
  await page.click('#cover-enter'); await ms(500);
  await page.click('#btn-start'); await ms(1400);
}

await page.goto(`http://127.0.0.1:${PORT}/`);
await ms(800);

/* ── 1. 異常存檔：stage=created 但已有床（卡死重現） ── */
console.log('1️⃣ stage=created＋已有床 → 應自愈進 goOut');
await bootWith('anomaly');
check('stage 已修正為 bed', (await G(() => Game.stage)) === 'bed');
check('sub 為 goOut（非 tutBuild）', (await G(() => Game.sub)) === 'goOut');
check('出門按鈕可見', await G(() => !$('#out-btn').classList.contains('hidden')));
await shot('recover-goout', `sub=${await G(() => Game.sub)}`);
await page.click('#out-btn'); await ms(800);
check('點出門 → loading（不卡住）', (await G(() => Game.sub)) === 'loading');

/* ── 2. 舊格式：bed 無 id ── */
console.log('2️⃣ 舊格式 bed（無 id）→ 自動補 id＋goOut');
await bootWith('legacy');
check('bed 已補 id', (await G(() => (Game.furniture.length === 1 ? Game.furniture[0].id : null))) === 'bed');
check('stage 修正為 bed', (await G(() => Game.stage)) === 'bed');
check('sub 為 goOut', (await G(() => Game.sub)) === 'goOut');
await shot('recover-legacy', `sub=${await G(() => Game.sub)}`);

/* ── 3. 反向：stage=bed 但沒有床 → 回教學 ── */
console.log('3️⃣ stage=bed 但沒床 → 回放床教學');
await bootWith('reteach');
check('stage 修正為 created', (await G(() => Game.stage)) === 'created');
check('sub 為 tutBuild（重播教學）', (await G(() => Game.sub)) === 'tutBuild');
await shot('recover-reteach', `sub=${await G(() => Game.sub)}`);

console.log(`pageerrors=${pageErrors}`);
console.log(fails || pageErrors ? `❌ ${fails} 項失敗` : '✅ 異常存檔自愈測試全過');
await browser.close();
server.close();
process.exit(fails || pageErrors ? 1 : 0);
