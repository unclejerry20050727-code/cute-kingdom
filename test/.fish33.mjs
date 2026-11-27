/* 第三十三輪 33-6 測試：不換竿/魚影接近/逗引/搏鬥/掙脫/rewait/recast/主角外觀（本地 serve + playwright） */
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
/* 拋竿到 wait（mid 區，等待時間長，方便測） */
await page.evaluate(async () => {
  fishAction();
  Fish.power = 0.5;
  releaseCast();
  for (let i = 0; i < 80 && Fish.state === 'cast'; i++) await new Promise(r => setTimeout(r, 50));
});

/* R1 魚影慢慢接近（33-3） */
const r1 = await page.evaluate(async () => {
  if (Fish.state !== 'wait' || !Fish.shade) return { bad: 1 };
  const dist = () => {
    const z = Fish.castLand, sh = Fish.shade;
    const k = Math.min(1, Fish.t / Math.max(0.1, Fish.biteAt - 0.4));
    const sx = sh.x0 + (z.x - sh.x0) * k;
    return Math.abs(z.x - sx);
  };
  const d1 = dist();
  await new Promise(r => setTimeout(r, 900));
  const d2 = dist();
  return { d1, d2, st: Fish.shade.st, size: Fish.size };
});
ok(r1.d1 > 60, 'R1 魚影起始在 140~220px 外（d1=' + Math.round(r1.d1) + '）');
ok(r1.d2 < r1.d1, 'R1 魚影慢慢接近浮標（' + Math.round(r1.d1) + '→' + Math.round(r1.d2) + '）');
ok(r1.st === 'in', 'R1 魚影狀態=in（' + r1.st + '）');

/* 截圖：魚影+主角 */
await page.screenshot({ path: '/tmp/33-shade.png' });

/* R2 輕拉逗引（0.25~1.0s）→ 咬餌 sooner（33-1） */
const r2 = await page.evaluate(async () => {
  Fish.biteAt = Fish.t + 3; /* 拉遠一點確保可縮短 */
  const before = Fish.biteAt;
  const jl = Fish.jigglesLeft;
  fishAction(); /* 開始逗引 */
  const jigOn = !!Fish.jig;
  await new Promise(r => setTimeout(r, 500));
  releaseCast(); /* 放開=輕拉 */
  const jl2 = Fish.jigglesLeft;
  return { before, after: Fish.biteAt, jl, jl2, jigOn };
});
ok(r2.jigOn, 'R2 wait 長按→逗引中（jig）');
ok(r2.jl2 === r2.jl - 1, 'R2 輕拉成功→逗引次數 -1（' + r2.jl + '→' + r2.jl2 + '）');
ok(r2.after < r2.before - 0.5, 'R2 輕拉→咬餌縮短（' + r2.before.toFixed(2) + '→' + r2.after.toFixed(2) + '）');

/* R3 拉太猛（>1.0s）→ 嚇跑（33-1） */
const r3 = await page.evaluate(async () => {
  Fish.biteAt = Fish.t + 5;
  fishAction();
  await new Promise(r => setTimeout(r, 1400));
  const tRel = Fish.t;
  releaseCast();
  await new Promise(r => setTimeout(r, 80));
  return {
    tRel,
    biteAt: Fish.biteAt,
    shade: Fish.shade ? Fish.shade.st : null,
    flee: Fish.school.filter(f => f.st === 'flee').length,
    msg: $('#fish-msg').textContent,
  };
});
ok(r3.shade === 'flee', 'R3 拉太猛→魚影逃（' + r3.shade + '）');
ok(r3.flee >= 5, 'R3 拉太猛→魚群嚇跑（' + r3.flee + ' 條）');
ok(r3.biteAt >= r3.tRel + 1.1 && r3.biteAt <= r3.tRel + 3.2, 'R3 嚇跑後重新排程咬餌（+' + (r3.biteAt - r3.tRel).toFixed(2) + 's）');
ok(/嚇跑/.test(r3.msg), 'R3 訊息=嚇跑（' + r3.msg + '）');

/* R4 大魚搏鬥失敗→掙脫→自動 rewait（33-2/33-1/34-2） */
const r4 = await page.evaluate(async () => {
  Fish.size = 4; /* 最大=舊 4× */
  Fish.biteAt = Fish.t + 0.05;
  for (let i = 0; i < 120 && !Fish.hover; i++) await new Promise(r => setTimeout(r, 30)); /* 等魚來猶豫 */
  fishAction(); await new Promise(r => setTimeout(r, 300)); releaseCast(); /* 34-2：輕輕拉→bite */
  const bite = Fish.state === 'bite';
  fishAction(); /* 中魚→reel */
  const reel = Fish.state === 'reel' && !!Fish.reel;
  for (let i = 0; i < 120 && Fish.state === 'reel'; i++) await new Promise(r => setTimeout(r, 50)); /* 不按→掙脫 */
  const missed = Fish.state === 'missed';
  const msg = $('#fish-msg').textContent;
  for (let i = 0; i < 40 && Fish.state === 'missed'; i++) await new Promise(r => setTimeout(r, 60));
  return { bite, reel, missed, msg, rewait: Fish.state === 'wait', newFish: Fish.fish && Fish.size !== undefined };
});
ok(r4.bite, 'R4 大魚來咬');
ok(r4.reel, 'R4 撈→reel 搏鬥（size=4）');
ok(r4.missed && /掙脫|跑掉/.test(r4.msg), 'R4 不按→掙脫跑掉（' + r4.msg + '）');
ok(r4.rewait, 'R4 不換竿：自動 rewait（33-1）');

/* R5 recast：rewait→ready→可再蓄力（33-1） */
const r5 = await page.evaluate(async () => {
  const recBtn = $('#fish-recast');
  const shown = recBtn && !recBtn.classList.contains('hidden');
  recast();
  const ready = Fish.state === 'ready';
  fishAction();
  const charge = Fish.state === 'charge';
  Fish.power = 1;
  releaseCast();
  for (let i = 0; i < 80 && Fish.state === 'cast'; i++) await new Promise(r => setTimeout(r, 50));
  return { shown, ready, charge, wait: Fish.state === 'wait', zone: FISH_ZONES[Fish.zoneIdx].id };
});
ok(r5.shown, 'R5 重新拋竿鈕在 wait 時顯示');
ok(r5.ready, 'R5 recast→ready');
ok(r5.charge, 'R5 ready→按下可再蓄力');
ok(r5.wait && r5.zone === 'far', 'R5 再拋竿成功（' + r5.zone + '）');

/* R6 搏鬥按壓→計條增加（33-2/34-3：dash 按壓無效，測時控 dashT=0） */
const r6 = await page.evaluate(async () => {
  Fish.size = 1;
  Fish.biteAt = Fish.t + 0.05;
  for (let i = 0; i < 120 && !Fish.hover; i++) await new Promise(r => setTimeout(r, 30));
  fishAction(); await new Promise(r => setTimeout(r, 300)); releaseCast(); /* 34-2：輕輕拉→bite */
  fishAction(); /* →reel */
  await new Promise(r => setTimeout(r, 60));
  Fish.reel.burstAt = Fish.t + 10; Fish.reel.dashT = 0; /* 34-3：避開 dash 視窗，按壓效果確定性 */
  const p0 = Fish.reel.prog;
  fishAction(); await new Promise(r => setTimeout(r, 40));
  fishAction(); await new Promise(r => setTimeout(r, 40));
  fishAction();
  const p1 = Fish.reel.prog;
  return { p0, p1, state: Fish.state };
});
ok(r6.p1 > r6.p0 + 20, 'R6 連按 3 次→計條明顯增加（' + Math.round(r6.p0) + '→' + Math.round(r6.p1) + '）');
await page.screenshot({ path: '/tmp/33-reel.png' });

/* R7 主角外觀：drawFisher 用 drawCharacter(Game.playerCfg)（33-4） */
const r7 = await page.evaluate(() => {
  const src = drawFisher.toString();
  return { usesChar: src.includes('drawCharacter'), usesCfg: src.includes('playerCfg'), rodBase: FISH_ROD_BASE.x === 370 };
});
ok(r7.usesChar && r7.usesCfg, 'R7 釣魚角色=主角外觀（drawCharacter+playerCfg）');
ok(r7.rodBase, 'R7 釣竿錨點隨主角手部（370）');
await page.evaluate(async () => {
  recast();
  fishAction();
  Fish.power = 0.5;
  await new Promise(r => setTimeout(r, 700));
});
await page.screenshot({ path: '/tmp/33-fisher.png' });

ok(errs.length === 0, '0 pageerror（' + errs.length + '）' + (errs.length ? ' ' + errs.join(' | ') : ''));
console.log(fail === 0 ? '\n✅ FISH33 全過' : `\n❌ FISH33 有 ${fail} 項失敗`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
