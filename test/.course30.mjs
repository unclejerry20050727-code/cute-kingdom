/* 第三十輪 30-7 整合測試：跳舞課音符 / 烹飪課爐子 / 咖啡課咖啡機 / 釣魚課小遊戲 / 寵物課小貓 ＋ 存檔重載持久化（本地 serve + playwright） */
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 150)));
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => typeof beginGame === 'function' && typeof defaultConfig === 'function', null, { timeout: 20000 });

/* 新遊戲（無課） */
await page.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
  setSub('free');
});
await page.waitForTimeout(300);

/* R1 跳舞課：pose=dance 時有課才冒音符（startPose 先 ++poseIdx，要 poseIdx=2 才到 dance） */
await page.evaluate(() => { Game.player.poseIdx = 2; startPose(); });
await page.waitForTimeout(900);
const r1a = await page.evaluate(() => danceNotes.length);
ok(r1a === 0, 'R1 無跳舞課：跳舞無音符（' + r1a + '）');
await page.evaluate(() => { Game.school.selected = ['dance']; Game.player.poseIdx = 2; startPose(); });
await page.waitForTimeout(900);
const r1b = await page.evaluate(() => danceNotes.length);
ok(r1b > 0, 'R1 有跳舞課：跳舞冒音符（' + r1b + ' 個）');

/* R2 烹飪課：爐子卡門控＋解鎖＋放置 */
const r2 = await page.evaluate(() => {
  Game.school.selected = [];
  openBuildPanel('decor');
  const find = () => [...document.querySelectorAll('.build-item')].find(el => (el.querySelector('.bi-name')?.textContent || '').startsWith('爐子'));
  const locked = { locked: find().classList.contains('locked'), dis: find().classList.contains('dis'), hint: find().querySelector('.bi-lock')?.textContent || null };
  Game.school.selected = ['dance', 'cooking'];
  closeBuildPanel(); openBuildPanel('decor');
  const unlocked = !find().classList.contains('locked');
  closeBuildPanel();
  Game.furniture.push({ id: 'stove', tx: 4, ty: 4, rot: 0 });
  rebuildBlocked();
  return { locked, unlocked };
});
ok(r2.locked.locked && r2.locked.dis, 'R2 無烹飪課：爐子卡 dis+locked');
ok(r2.locked.hint === '上烹飪課解鎖', 'R2 提示文字（' + r2.locked.hint + '）');
ok(r2.unlocked, 'R2 選課後爐子卡解鎖');

/* R3 咖啡課：咖啡機卡門控（抽一：鎖/解） */
const r3 = await page.evaluate(() => {
  openBuildPanel('decor');
  const find = () => [...document.querySelectorAll('.build-item')].find(el => (el.querySelector('.bi-name')?.textContent || '').startsWith('咖啡機'));
  const locked = { locked: find().classList.contains('locked'), hint: find().querySelector('.bi-lock')?.textContent || null };
  Game.school.selected = ['dance', 'cooking', 'coffee'];
  closeBuildPanel(); openBuildPanel('decor');
  const unlocked = !find().classList.contains('locked');
  closeBuildPanel();
  return { locked, unlocked };
});
ok(r3.locked.locked && r3.locked.hint === '上咖啡課解鎖', 'R3 無咖啡課：咖啡機卡鎖＋提示（' + r3.locked.hint + '）');
ok(r3.unlocked, 'R3 選課後咖啡機卡解鎖');

/* R4 釣魚課：無課點湖 toast / 有課開屏 / 拋竿→bite→撈（加錢+計數）/ 退出 */
const r4 = await page.evaluate(async () => {
  setSub('map');
  await new Promise(res => setTimeout(res, 100));
  Game.school.selected = ['dance', 'cooking', 'coffee'];
  const cx = POND.x * Game.ws + Game.offX, cy = POND.y * Game.ws + Game.offY;
  Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
  await new Promise(res => setTimeout(res, 150));
  const noCourse = { hidden: $('#screen-fish').classList.contains('hidden'), toast: $('#toast').textContent, sub: Game.sub };
  /* 有課 */
  Game.school.selected = ['dance', 'cooking', 'coffee', 'fishing'];
  Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
  await new Promise(res => setTimeout(res, 150));
  const open = !$('#screen-fish').classList.contains('hidden') && Game.sub === 'fish' && Fish && Fish.state === 'ready';
  /* 32-1：長按蓄力→放開拋竿→wait→bite→撈 */
  const money0 = Game.money;
  fishAction(); /* 開始蓄力 */
  Fish.power = 1; /* 滿力 */
  releaseCast(); /* 放開拋竿 */
  for (let i = 0; i < 80 && Fish.state === 'cast'; i++) await new Promise(res => setTimeout(res, 50)); /* 等 0.9s 飛行落地 */
  Fish.size = 1; /* 固定大小→代幣=基礎值（大獲路徑由 .fish32 測） */
  Fish.biteAt = Fish.t + 0.05;
  for (let i = 0; i < 40 && !Fish.hover; i++) await new Promise(res => setTimeout(res, 50)); /* 34-2：等魚來猶豫 */
  fishAction(); await new Promise(res => setTimeout(res, 300)); releaseCast(); /* 34-2：輕輕拉→誘它咬 */
  const st = Fish.state;
  fishAction(); /* 33-2：中魚→搏鬥 */
  for (let i = 0; i < 60 && Fish.state === 'reel'; i++) { fishAction(); await new Promise(res => setTimeout(res, 50)); } /* 猛按收線 */
  const f = Fish.fish;
  const caught = { money: Game.money, coins: Fish.coins, count: Game.fish.caught, msg: $('#fish-msg').textContent, zone: FISH_ZONES[Fish.zoneIdx].id, reelDone: Fish.state === 'caught' };
  exitFishing();
  await new Promise(res => setTimeout(res, 100));
  return { noCourse, open, st, caught, back: Game.sub, money0 };
});
ok(r4.noCourse.hidden && r4.noCourse.sub === 'map' && /釣魚課/.test(r4.noCourse.toast), 'R4 無釣魚課點湖：toast 門控（' + r4.noCourse.toast + '）');
ok(r4.open, 'R4 有釣魚課點湖：開釣魚畫面');
ok(r4.st === 'bite', 'R4 拋竿→輕輕拉→bite（34-2）');
ok(r4.caught.reelDone, 'R4 中魚後猛按→搏鬥上陸（33-2）');
ok(r4.caught.money === r4.money0 + r4.caught.coins, 'R4 撈到加錢（+' + r4.caught.coins + '）');
ok(r4.caught.count === 1 && /撈到/.test(r4.caught.msg), 'R4 累計+1＋訊息（' + r4.caught.msg + '）');
ok(r4.caught.zone === 'far', 'R4 滿力拋竿→遠區（32-1 分區）');
ok(r4.back === 'map', 'R4 退出回地圖');

/* R5 寵物課：無課無貓 / 確認課後小貓出現並追隨 */
const r5 = await page.evaluate(async () => {
  setSub('free');
  const noPet = Game.pet === null;
  Game.school.selected = ['pet', 'cooking', 'coffee', 'fishing'];
  confirmOrChangeSchool();
  await new Promise(res => setTimeout(res, 150));
  const appeared = !!Game.pet;
  Game.player.x = 8.2; Game.player.y = 2.4;
  await new Promise(res => setTimeout(res, 2200));
  const d = Math.hypot(Game.player.x - Game.pet.x, Game.player.y - Game.pet.y);
  return { noPet, appeared, d };
});
ok(r5.noPet, 'R5 無寵物課：無小貓');
ok(r5.appeared, 'R5 確認寵物課：小貓出現');
ok(r5.d < 0.5, 'R5 小貓 2.2s 內追到玩家 0.5 tile 內（d=' + r5.d.toFixed(2) + '）');

/* 存檔＋重載 → 持久化 */
await page.evaluate(() => saveGame(fullSave('done')));
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof startGame === 'function', null, { timeout: 20000 });
await page.evaluate(() => startGame());
await page.waitForTimeout(500);
const s6 = await page.evaluate(() => ({
  stove: Game.furniture.some(f => f.id === 'stove'),
  fish: Game.fish.caught,
  pet: !!Game.pet,
  school: JSON.stringify(Game.school.selected),
  coffeeLocked: (() => {
    openBuildPanel('decor');
    const c = [...document.querySelectorAll('.build-item')].find(el => (el.querySelector('.bi-name')?.textContent || '').startsWith('咖啡機'));
    const v = c.classList.contains('locked');
    closeBuildPanel();
    return v;
  })(),
}));
ok(s6.stove, '重載後爐子還在');
ok(s6.fish === 1, '重載後釣魚計數=1（' + s6.fish + '）');
ok(s6.pet, '重載後小貓還在');
ok(s6.coffeeLocked === false, '重載後咖啡機卡仍解鎖（選課持久）');
await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/307-reload.png' });

ok(errs.length === 0, '無 pageerror（' + errs.length + '）' + (errs.length ? ' ' + errs.join(' | ') : ''));
console.log(fail === 0 ? 'ALL PASS' : fail + ' FAILED');
await browser.close(); server.close();
process.exit(fail === 0 ? 0 : 1);
