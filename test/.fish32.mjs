/* 第三十二輪 32-6 測試：釣魚豐富化——蓄力拋竿/分區難度/魚群AI/大小大獲/假咬（本地 serve + playwright） */
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
/* 開釣魚（有課） */
await page.evaluate(() => {
  Game.school.selected = ['fishing'];
  const cx = POND.x * Game.ws + Game.offX, cy = POND.y * Game.ws + Game.offY;
  Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
});
await sleep(150);

/* R1 蓄力→滿力→放開→cast→wait（滿力=遠區） */
const r1 = await page.evaluate(async () => {
  const open = Game.sub === 'fish' && Fish && Fish.state === 'ready';
  const btnReady = $('#fish-act').textContent;
  fishAction();
  const charging = Fish.state === 'charge' && Fish.power === 0;
  for (let i = 0; i < 80 && Fish.power < 1; i++) await new Promise(r => setTimeout(r, 50)); /* 1.2s 滿力 */
  const full = Fish.power;
  releaseCast();
  const casting = Fish.state === 'cast' && !!Fish.castFrom && !!Fish.castLand;
  for (let i = 0; i < 80 && Fish.state === 'cast'; i++) await new Promise(r => setTimeout(r, 50));
  return {
    open, btnReady, charging, full, casting,
    wait: Fish.state === 'wait', zone: FISH_ZONES[Fish.zoneIdx].id,
    landX: Fish.castLand.x, fish: Fish.fish.id, win: Fish.fish.win, size: Fish.size,
    school: Fish.school.length,
  };
});
ok(r1.open, 'R1 有課點湖開釣魚');
ok(/長按蓄力/.test(r1.btnReady), 'R1 按鈕=長按蓄力（' + r1.btnReady + '）');
ok(r1.charging, 'R1 按下→charge（power=0 起步）');
ok(r1.full === 1, 'R1 1.2s 後 power 滿（' + r1.full + '）');
ok(r1.casting, 'R1 放開→cast（有 castFrom/castLand）');
ok(r1.wait && r1.zone === 'far', 'R1 0.9s 飛行落地→wait（滿力=遠區，x=' + r1.landX + '）');
ok(['color', 'crab', 'puffer'].includes(r1.fish), 'R1 遠區抽到遠區魚（' + r1.fish + '）');
ok(r1.win <= 0.7, 'R1 咬餌窗口隨稀有度縮短（win=' + r1.win + 's）');
ok(r1.size >= 0.6 && r1.size <= 4.0, 'R1 魚 size 0.6~4.0（33-3，' + r1.size.toFixed(2) + '）');
ok(r1.school === 12, 'R1 魚群 12 條（' + r1.school + '）');

/* R2 假咬（小抖）→真咬 */
const r2 = await page.evaluate(async () => {
  Fish.nibbles = [0.3, 0.5, 0.7]; Fish.biteAt = 2.0; Fish.t = 0;
  let sawDip = false;
  for (let i = 0; i < 120 && Fish.state === 'wait'; i++) {
    if (Fish.dipT !== null) sawDip = true;
    await new Promise(r => setTimeout(r, 30));
  }
  return { sawDip, bite: Fish.state === 'bite', btn: $('#fish-act').textContent };
});
ok(r2.sawDip, 'R2 假咬小抖（dipT 觸發）');
ok(r2.bite, 'R2 到時→bite');
ok(/撈/.test(r2.btn), 'R2 按鈕=撈（' + r2.btn + '）');

/* R3 大獲（size 2.5）＋搏鬥上陸（33-2）＋自動 rewait（33-1） */
const r3 = await page.evaluate(async () => {
  Fish.size = 2.5;
  const money0 = Game.money;
  fishAction(); /* 33-2：bite→reel */
  const reeling = Fish.state === 'reel';
  for (let i = 0; i < 80 && Fish.state === 'reel'; i++) { fishAction(); await new Promise(r => setTimeout(r, 40)); }
  const caught = Fish.state === 'caught';
  const msg = $('#fish-msg').textContent;
  const gained = Game.money - money0;
  await new Promise(r => setTimeout(r, 300));
  const fleeing = Fish.school.filter(f => f.st === 'flee').length;
  for (let i = 0; i < 50 && Fish.state === 'caught'; i++) await new Promise(r => setTimeout(r, 60));
  return { reeling, caught, msg, gained, coins: Fish.coins, expected: Math.round(Math.round(15 * 2.5) * 1.5), fleeing, rewait: Fish.state === 'wait' };
});
ok(r3.reeling, 'R3 bite 撈→reel 搏鬥（33-2）');
ok(r3.caught, 'R3 猛按→上陸 caught');
ok(r3.gained === r3.coins && /大獲/.test(r3.msg), 'R3 大獲訊息+加錢（' + r3.msg + '，+' + r3.gained + '）');
ok(r3.fleeing >= 5, 'R3 上陸→魚群逃散（flee ' + r3.fleeing + ' 條）');
ok(r3.rewait, 'R3 不換竿：自動 rewait 換新魚（33-1）');

/* R4 低力=近區＋near 表無金魚＋漏咬→missed→自動 rewait（33-1） */
const r4 = await page.evaluate(async () => {
  recast(); /* 33-1：rewait 中→重新拋竿才能再蓄力 */
  fishAction();
  Fish.power = 0.15;
  releaseCast();
  for (let i = 0; i < 80 && Fish.state === 'cast'; i++) await new Promise(r => setTimeout(r, 50));
  const zone = FISH_ZONES[Fish.zoneIdx].id, fish = Fish.fish.id;
  for (let i = 0; i < 260 && (Fish.state === 'wait' || Fish.state === 'bite'); i++) await new Promise(r => setTimeout(r, 50)); /* 不撈→bite 超時→missed */
  const missed = Fish.state === 'missed';
  const msg = $('#fish-msg').textContent;
  for (let i = 0; i < 40 && Fish.state === 'missed'; i++) await new Promise(r => setTimeout(r, 60)); /* 0.9s→rewait */
  return { zone, fish, missed, msg, rewait: Fish.state === 'wait' };
});
ok(r4.zone === 'near', 'R4 低力→近區（' + r4.zone + '）');
ok(r4.fish !== 'puffer', 'R4 近區不出金魚（' + r4.fish + '）');
ok(r4.missed && /跑掉/.test(r4.msg), 'R4 不撈→missed（' + r4.msg + '）');
ok(r4.rewait, 'R4 不換竿：missed 後自動 rewait（33-1）');

/* R5 魚群 AI：跳魚+落水吸引 approach/circle */
const r5 = await page.evaluate(async () => {
  /* 強制跳魚 */
  Fish.jumpAt = 0.05;
  let jumped = false, splash = 0;
  for (let i = 0; i < 30 && !jumped; i++) {
    jumped = Fish.school.some(f => f.st === 'jump');
    splash = Fish.splashes.length;
    await new Promise(r => setTimeout(r, 40));
  }
  /* 重新拋竿後等魚被吸引（33-1：rewait 中要先 recast） */
  recast();
  fishAction(); Fish.power = 0.5; releaseCast();
  for (let i = 0; i < 80 && Fish.state === 'cast'; i++) await new Promise(r => setTimeout(r, 50));
  let attracted = 0;
  for (let i = 0; i < 100; i++) {
    attracted = Fish.school.filter(f => f.st === 'approach' || f.st === 'circle').length;
    if (attracted >= 2) break;
    await new Promise(r => setTimeout(r, 100));
  }
  return { jumped, splash, attracted };
});
ok(r5.jumped, 'R5 環境跳魚觸發');
ok(r5.splash > 0, 'R5 跳魚/落水水花（' + r5.splash + '）');
ok(r5.attracted >= 2, 'R5 浮標落水→魚 approach/circle（' + r5.attracted + ' 條）');

/* 截圖：蓄力/飛行/魚群（33-1：先 recast 才能重新蓄力） */
await page.evaluate(async () => {
  recast();
  fishAction(); Fish.power = 0.55;
  await new Promise(r => setTimeout(r, 100));
  releaseCast();
  await new Promise(r => setTimeout(r, 450));
  window.__shot1 = 1;
});
await sleep(100);
await page.screenshot({ path: '/tmp/32-cast-flight.png' });
await page.evaluate(async () => {
  for (let i = 0; i < 80 && Fish.state !== 'wait'; i++) await new Promise(r => setTimeout(r, 50));
  Fish.nibbles = [0.4, 0.6]; Fish.biteAt = Fish.t + 0.5;
  await new Promise(r => setTimeout(r, 600));
});
await page.screenshot({ path: '/tmp/32-bite-school.png' });

ok(errs.length === 0, '0 pageerror（' + errs.length + '）' + (errs.length ? ' ' + errs.join(' | ') : ''));
console.log(fail === 0 ? '\n✅ FISH32 全過' : `\n❌ FISH32 有 ${fail} 項失敗`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
