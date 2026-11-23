/* 第三十輪 30-1：跳舞課音符（無課不冒/有課冒+音/淡出清除/0 pageErr） */
import { chromium } from 'playwright';
import http from 'http';
import { readFile } from 'fs/promises';
import { writeFileSync } from 'fs';
import path from 'path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try { const d = await readFile(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + msg); if (!cond) fail++; };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 150)));
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => typeof beginGame === 'function' && typeof defaultConfig === 'function', null, { timeout: 20000 });

await page.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
  Game.player.getup = 1;
  setSub('free');
});
await page.waitForTimeout(300);

/* 幫手：直接設跳舞姿勢 */
const startDance = () => page.evaluate(() => {
  Game.player.poseIdx = 2; /* startPose 會 +1 → POSE_ORDER[3] = dance */
  startPose();
});

/* R1 無跳舞課：跳舞不冒音符 */
await startDance();
await page.waitForTimeout(1100);
const r1 = await page.evaluate(() => ({ n: danceNotes.length, pose: Game.player.pose?.id }));
ok(r1.pose === 'dance', 'R1 姿勢=dance 生效');
ok(r1.n === 0, 'R1 無課不冒音符（' + r1.n + '）');

/* R2 有跳舞課：冒音符＋sfx('note') 有被呼叫 */
const r2 = await page.evaluate(() => {
  Game.school.selected = ['dance'];
  danceNotes.length = 0; danceNoteT = 0;
  let noteCalls = 0;
  const orig = window.sfx;
  window.sfx = (n) => { if (n === 'note') noteCalls++; };
  return new Promise(res => {
    Game.player.poseIdx = 2;
    startPose();
    setTimeout(() => {
      window.sfx = orig;
      res({ n: danceNotes.length, noteCalls, sample: danceNotes[0] ? { ch: danceNotes[0].ch, col: typeof danceNotes[0].col } : null });
    }, 1300);
  });
});
ok(r2.n > 0, 'R2 有課冒音符（' + r2.n + '）');
ok(r2.noteCalls > 0, 'R2 sfx(note) 被呼叫 ' + r2.noteCalls + ' 次');
ok(r2.sample && typeof r2.sample.ch === 'string' && r2.sample.col === 'string', 'R2 音符物件有 ch/col');

/* R3 音符 1.2s 後淡出清除（停姿勢、等 1.5s） */
await page.evaluate(() => { Game.player.pose = null; });
await page.waitForTimeout(1600);
const r3 = await page.evaluate(() => danceNotes.length);
ok(r3 === 0, 'R3 音符淡出清除（剩 ' + r3 + '）');

ok(errs.length === 0, '0 pageerror' + (errs.length ? '：' + errs[0] : ''));
console.log(fail === 0 ? '\n.q301 ALL PASS' : `\n.q301 ${fail} FAIL`);
await browser.close(); server.close();
process.exit(fail === 0 ? 0 : 1);
