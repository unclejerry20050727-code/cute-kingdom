/* ══════════ 可愛國 — 擺拍姿勢視覺 QA（第十五輪 e1，throwaway）══════════
 * 直接呼叫 drawCharacter 把 10 姿勢畫到獨立 canvas 截圖目視
 * 用法：node test/peek-pose-qa.mjs
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
const page = await browser.newPage({ viewport: { width: 500, height: 500 } });
let errs = 0;
page.on('pageerror', e => { errs++; console.log('  ⚠️ pageerror:', e.message); });

await page.goto(`http://127.0.0.1:${PORT}/`);
await page.waitForTimeout(600);

const POSE_IDS = ['peace','wave','cheer','dance','hug','pray','salute','flex','meditate','wink'];

async function drawPose(id, t, tag) {
  const ok = await page.evaluate(([id2, t2, cfgName]) => {
    let cv = document.getElementById('qa-canvas');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'qa-canvas';
      cv.width = 440; cv.height = 440;
      cv.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:#FDF6EC;border-radius:12px';
      document.body.appendChild(cv);
    }
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 440, 440);
    /* 地面參考線 */
    ctx.strokeStyle = 'rgba(150,120,90,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, 380); ctx.lineTo(380, 380); ctx.stroke();
    drawCharacter(ctx, defaultConfig(cfgName), {
      x: 220, y: 370, scale: 2.6, t: 1.2, facing: 'down',
      pose: id2 ? { id: id2, t: t2 } : undefined,
    });
    return true;
  }, [id, t, 'male']);
  if (!ok) { console.log('  ❌ draw fail', id); return; }
  const f = path.join(SHOTS, `p1-${tag}.png`);
  await page.locator('#qa-canvas').screenshot({ path: f });
  console.log(`  📸 ${path.basename(f)}`);
}

await drawPose(null, 0, 'idle');
for (const id of POSE_IDS) {
  const t = id === 'wink' ? 0.9 : 0.9; /* 0.9：wink 眨眼窗口內、wave/dance 動到一半 */
  await drawPose(id, t, id);
}

await browser.close();
server.close();
console.log(errs === 0 ? '✅ 無 pageerror' : `❌ ${errs} pageerrors`);
process.exit(errs === 0 ? 0 : 1);
