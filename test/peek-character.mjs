/* ══════════ 角色造型對照 art/ 截圖 ══════════
 * 用法：node test/peek-character.mjs
 * 輸出 shots/char-lineup.png（全身）、shots/char-face.png（頭部特寫）
 */
import { chromium } from 'playwright';
import http from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
await mkdir(path.join(ROOT, 'shots'), { recursive: true });

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 980, height: 660 } });
page.on('pageerror', e => console.log('  ⚠️ pageerror:', e.message));
await page.goto(`http://127.0.0.1:${PORT}/`);
await page.waitForFunction(() => typeof drawCharacter === 'function');

/* ── 全身 lineup ── */
await page.evaluate(() => {
  const cv = document.createElement('canvas');
  cv.width = 980; cv.height = 660;
  cv.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#F6E7D2;';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  ctx.font = '16px "Long Cang", cursive';
  ctx.fillStyle = '#8A6A4F';
  const F = defaultConfig('female'), M = defaultConfig('male'), Y = XIAOYOU_CFG;
  const put = (cfg, x, y, facing, label, opt = {}) => {
    drawCharacter(ctx, cfg, { x, y, facing, t: 1.2, walking: opt.walking || false, blink: opt.blink || 0 });
    ctx.fillText(label, x - 34, y + 26);
  };
  /* 上排：正面 */
  put(F, 110, 300, 'down', '女・正面（中分長髮）');
  put(M, 300, 300, 'down', '男・正面（蓬蓬短髮）');
  put(Y, 490, 300, 'down', '小宥・正面（拉鍊外套）');
  put(F, 700, 300, 'down', '女・眨眼', { blink: 1 });
  put(M, 880, 300, 'left', '男・側視');
  /* 下排：側/背/走 */
  put(F, 110, 600, 'left', '女・側視');
  put(M, 300, 600, 'left', '男・側視');
  put(Y, 490, 600, 'left', '小宥・側視');
  put(F, 680, 600, 'up', '女・背面');
  put(M, 850, 600, 'up', '男・背面');
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(ROOT, 'shots/char-lineup.png') });
console.log('📸 shots/char-lineup.png');

/* ── 頭部特寫 ── */
await page.evaluate(() => {
  const old = document.querySelector('canvas');
  if (old) old.remove();
  const cv = document.createElement('canvas');
  cv.width = 980; cv.height = 660;
  cv.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#F6E7D2;';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  ctx.font = '18px "Long Cang", cursive';
  ctx.fillStyle = '#8A6A4F';
  const F = defaultConfig('female'), M = defaultConfig('male'), Y = XIAOYOU_CFG;
  const put = (cfg, x, y, label, blink = 0) => {
    drawCharacter(ctx, cfg, { x, y, facing: 'down', t: 1.2, scale: 2.6, blink });
    ctx.fillText(label, x - 40, y + 30);
  };
  put(F, 150, 560, '女（大眼＋中分＋側髮）');
  put(M, 460, 560, '男（大眼＋碎刺）');
  put(Y, 770, 560, '小宥（大眼＋外套領）');
  /* 頭像（對話框用） */
  const portraits = [[F, '女頭像'], [M, '男頭像'], [Y, '小宥頭像']];
  for (let i = 0; i < portraits.length; i++) {
    const [cfg, label] = portraits[i];
    const px = 120 + i * 300;
    ctx.save();
    ctx.translate(px, 40);
    drawPortrait(ctx, cfg, 130, { t: 1.2 });
    ctx.restore();
    ctx.fillText(label, px + 34, 200);
  }
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(ROOT, 'shots/char-face.png') });
console.log('📸 shots/char-face.png');

await browser.close();
server.close();
process.exit(0);
