/* 第三十四輪 34-6 測試：魚群擴散/hover誘咬/耐心離開/嚇跑/reel dash/caught→ready/主角手（本地 serve + playwright） */
import { chromium } from 'playwright';
import http from 'http';
import { readFile } from 'fs/promises';
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 150)));
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => typeof beginGame === 'function' && typeof defaultConfig === 'function', null, { timeout: 20000 });

await page.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
  setSub('map');
});
await sleep(150);
await page.evaluate(() => {
  Game.school.selected = ['fishing'];
  const cx = POND.x * Game.ws + Game.offX, cy = POND.y * Game.ws + Game.offY;
  Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
});
await sleep(150);
/* 拋竿到 wait（mid 區） */
await page.evaluate(async () => {
  fishAction();
  Fish.power = 0.5;
  releaseCast();
  for (let i = 0; i < 80 && Fish.state === 'cast'; i++) await new Promise(r => setTimeout(r, 50));
});

/* R1 魚群：接近上限≤3＋個別軌道（34-1） */
const r1 = await page.evaluate(async () => {
  const z = Fish.castLand, s = Fish.school;
  for (let i = 0; i < 8; i++) { s[i].st = 'swim'; s[i].x = z.x - 60 - i * 5; s[i].y = z.y + 30; s[i].dir = 1; } /* 8 條擠在浮標旁測上限 */
  for (let i = 0; i < 80; i++) {
    if (s.filter(f => f.st === 'approach' || f.st === 'circle').length >= 3) break;
    await new Promise(r => setTimeout(r, 100));
  }
  const near = s.filter(f => f.st === 'approach' || f.st === 'circle').length;
  const circ = s.slice(0, 3);
  circ.forEach((f, i) => { f.st = 'circle'; f.ang = i * 2.1; f.x = z.x; f.y = z.y; f.t = 0; }); /* 強制 3 條 circle 測軌道 */
  const orbs = circ.map(f => Math.round(f.orb)), sps = circ.map(f => f.orbSp.toFixed(2));
  await new Promise(r => setTimeout(r, 1200));
  const spread = circ.filter(f => Math.abs(f.x - circ[0].x) > 4).length;
  return { near, orbs, sps, distinctOrb: new Set(orbs).size >= 2, spread, xs: circ.map(f => Math.round(f.x)) };
});
ok(r1.near <= 3, 'R1 接近浮標的魚≤3（34-1 上限，實際 ' + r1.near + '）');
ok(r1.distinctOrb, 'R1 每條魚個別軌道半徑（34-1，' + r1.orbs.join('/') + 'px）');
ok(r1.spread >= 2, 'R1 circle 的魚不會全擠同一點（34-1，x=' + r1.xs.join(',') + '）');

/* R2 到時→hover（state 仍是 wait）＋耐心視窗（34-2） */
const r2 = await page.evaluate(async () => {
  Fish.biteAt = Fish.t + 0.5; Fish.hover = false;
  for (let i = 0; i < 100 && !Fish.hover; i++) await new Promise(r => setTimeout(r, 30));
  return { hover: Fish.hover, state: Fish.state, patience: +(Fish.patienceAt - Fish.t).toFixed(2), msg: $('#fish-msg').textContent, btn: $('#fish-act').textContent };
});
ok(r2.hover && r2.state === 'wait', 'R2 到時→hover 猶豫，state 仍 wait（34-2，' + r2.state + '）');
ok(r2.patience > 1.4 && r2.patience < 5, 'R2 耐心視窗已設（34-2，' + r2.patience + 's）');
ok(/輕輕拉/.test(r2.msg) && /輕輕拉/.test(r2.btn), 'R2 訊息+按鈕=輕輕拉（34-2，' + r2.btn + '）');

/* R3 hover 中輕拉 0.4s → bite（34-2） */
const r3 = await page.evaluate(async () => {
  fishAction();
  await new Promise(r => setTimeout(r, 400));
  releaseCast();
  return { bite: Fish.state === 'bite', msg: $('#fish-msg').textContent };
});
ok(r3.bite, 'R3 hover＋輕拉 0.4s→bite（34-2）');
ok(/咬餌/.test(r3.msg), 'R3 訊息=咬餌了（' + r3.msg + '）');

/* R4 耐心超時→魚離開→換新魚（34-2） */
const r4 = await page.evaluate(async () => {
  recast();
  fishAction(); Fish.power = 0.5; releaseCast();
  for (let i = 0; i < 80 && Fish.state === 'cast'; i++) await new Promise(r => setTimeout(r, 50));
  Fish.biteAt = Fish.t + 0.3;
  for (let i = 0; i < 100 && !Fish.hover; i++) await new Promise(r => setTimeout(r, 30));
  Fish.patienceAt = Fish.t + 0.4; /* 強制快點超時 */
  let left = false, returned = false, msg0 = '';
  for (let i = 0; i < 100 && !returned; i++) {
    if (Fish.shade && Fish.shade.st === 'flee' && Fish.shade.leave && !left) { left = true; msg0 = $('#fish-msg').textContent; }
    if (left && Fish.shade && Fish.shade.st === 'in' && !Fish.hover) returned = true;
    await new Promise(r => setTimeout(r, 50));
  }
  return { left, returned, msg0, state: Fish.state };
});
ok(r4.left, 'R4 耐心超時→魚影離開（34-2）');
ok(/不耐煩/.test(r4.msg0), 'R4 訊息=不耐煩走了（34-2，' + r4.msg0 + '）');
ok(r4.returned, 'R4 離開 0.8s→新魚影游來（34-2）');

/* R5 hover 中拉太猛（>1.0s）→嚇跑（同一條回，不換魚）（34-2） */
const r5 = await page.evaluate(async () => {
  Fish.biteAt = Fish.t + 0.3;
  for (let i = 0; i < 100 && !Fish.hover; i++) await new Promise(r => setTimeout(r, 30));
  const hoverWas = Fish.hover;
  fishAction();
  await new Promise(r => setTimeout(r, 1150));
  releaseCast();
  await new Promise(r => setTimeout(r, 100));
  return {
    hoverWas, hoverNow: Fish.hover,
    shade: Fish.shade.st, leave: Fish.shade.leave,
    flee: Fish.school.filter(f => f.st === 'flee').length,
    resched: +(Fish.biteAt - Fish.t).toFixed(1),
    msg: $('#fish-msg').textContent,
  };
});
ok(r5.hoverWas && !r5.hoverNow, 'R5 拉太猛→hover 清除（34-2）');
ok(r5.shade === 'flee' && r5.leave === false, 'R5 魚影嚇跑但不換魚（leave=false，34-2）');
ok(r5.flee >= 5, 'R5 魚群嚇跑散開（' + r5.flee + ' 條）');
ok(r5.resched > 1.0 && r5.resched < 3.3, 'R5 重新排程咬餌（+' + r5.resched + 's）');

/* R6 reel：dash 中按壓無效＋正常按壓增加（34-3） */
const r6 = await page.evaluate(async () => {
  Fish.biteAt = Fish.t + 0.3;
  for (let i = 0; i < 100 && !Fish.hover; i++) await new Promise(r => setTimeout(r, 30));
  fishAction(); await new Promise(r => setTimeout(r, 300)); releaseCast();
  const bite = Fish.state === 'bite';
  fishAction(); /* →reel */
  const reel = Fish.state === 'reel';
  Fish.reel.dashT = 0.5; Fish.reel.burstAt = Fish.t + 10; /* 強制 dash */
  const q0 = Fish.reel.prog;
  fishAction();
  const q1 = Fish.reel.prog;
  Fish.reel.dashT = 0; /* 正常 */
  const r0 = Fish.reel.prog;
  fishAction();
  const r1 = Fish.reel.prog;
  return { bite, reel, q0, q1, r0, r1 };
});
ok(r6.bite && r6.reel, 'R6 誘咬→reel 開局');
ok(r6.q1 === r6.q0, 'R6 dash 中按壓→計條不加（34-3，' + Math.round(r6.q0) + '→' + Math.round(r6.q1) + '）');
ok(r6.r1 >= r6.r0 + 7, 'R6 正常按壓→計條增加（34-3，' + Math.round(r6.r0) + '→' + Math.round(r6.r1) + '）');

/* R7 上陸→caught→ready 重新拋竿（34-4） */
const r7 = await page.evaluate(async () => {
  Fish.size = 1;
  for (let i = 0; i < 200 && Fish.state === 'reel'; i++) { fishAction(); if (Fish.reel) Fish.reel.dashT = 0; await new Promise(r => setTimeout(r, 40)); }
  const caught = Fish.state === 'caught';
  for (let i = 0; i < 40 && Fish.state === 'caught'; i++) await new Promise(r => setTimeout(r, 60));
  return { caught, ready: Fish.state === 'ready', msg: $('#fish-msg').textContent };
});
ok(r7.caught, 'R7 收線到 100→caught');
ok(r7.ready, 'R7 上陸後→ready 可重新拋竿（34-4，' + r7.msg + '）');

/* R8 主角的手（34-5） */
const r8 = await page.evaluate(() => {
  const src = drawFisher.toString();
  return { skin: src.includes('skinColor') && src.includes('resolveConfig'), rodBase: FISH_ROD_BASE.x === 370 };
});
ok(r8.skin, 'R8 手=主角膚色（resolveConfig+skinColor，34-5）');
ok(r8.rodBase, 'R8 釣竿錨點 370 隨主角手部');

ok(errs.length === 0, '0 pageerror（' + errs.length + '）' + (errs.length ? ' ' + errs.join(' | ') : ''));
console.log(fail === 0 ? '\n✅ FISH34 全過' : `\n❌ FISH34 有 ${fail} 項失敗`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
