/* 35 測試：烹飪課——點爐子→3食譜→timing bar 兩停火→菜+錢（R1-R8） */
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
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
const ok = (b, m) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + m); if (!b) fails++; };
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => typeof beginGame === 'function', null, { timeout: 20000 });
const $ = (f) => page.evaluate(f);
let fails = 0;

/* 設定：完成存檔+擺爐子(6,4) */
await $(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
  setSub('free');
  Game.school.selected = ['cooking'];
  Game.furniture.push({ id: 'stove', tx: 6, ty: 4, rot: 0 });
  rebuildBlocked();
});

/* R1：無課不能煮 */
let r1 = await $(() => {
  Game.school.selected = [];
  startCooking();
  return { cook: !!Cook, sub: Game.sub, toast: !!document.querySelector('#toast') };
});
ok(!r1.cook && r1.sub === 'free', 'R1 無烹飪課→startCooking 不進入（sub=' + r1.sub + '）');
await $(() => { Game.school.selected = ['cooking']; });

/* R2：點爐子→進烹飪場景 */
let r2 = await $(() => {
  const [nx, ny] = tileScreen(6.5, 4.5); /* 格子中心（P 回角落座標，中心 +0.5） */
  const cx = nx * Game.ws + Game.offX, cy = ny * Game.ws + Game.offY;
  Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
  return { cook: !!Cook, sub: Game.sub, screen: !$('#screen-cook').classList.contains('hidden'), state: Cook && Cook.state };
});
ok(r2.cook && r2.sub === 'cook' && r2.screen && r2.state === 'menu', 'R2 點爐子→cook 場景+menu（sub=' + r2.sub + '）');

/* R3：menu 食譜鈕顯示 */
let r3 = await $(() => ({ recs: !$('#cook-recipes').classList.contains('hidden'), n: document.querySelectorAll('#cook-recipes .cook-r').length }));
ok(r3.recs && r3.n === 3, 'R3 menu 顯示 3 食譜鈕（n=' + r3.n + '）');

/* R4：選食譜→cook 狀態+zone 合法 */
let r4 = await $(() => {
  cookPick('soup');
  return { state: Cook.state, id: Cook.recipe.id, z0: +Cook.zone.z0.toFixed(2), z1: +Cook.zone.z1.toFixed(2), w: +(Cook.zone.z1 - Cook.zone.z0).toFixed(2) };
});
ok(r4.state === 'cook' && r4.id === 'soup' && r4.z0 >= 0.05 && r4.z1 <= 0.95 && Math.abs(r4.w - 0.22) < 0.01, 'R4 cookPick(soup)→cook+zone 0.22（z=' + r4.z0 + '~' + r4.z1 + '）');

/* R5：標記會移動＋兩下命中→result+加錢 */
let r5 = await $(async () => {
  const m0 = Cook.mark;
  await new Promise(r => setTimeout(r, 150));
  const moved = Math.abs(Cook.mark - m0) > 0.02;
  Cook.mark = (Cook.zone.z0 + Cook.zone.z1) / 2; cookAction();
  const round1 = Cook.round === 1 && Cook.state === 'cook';
  const money0 = Game.money, n0 = Game.cook ? Game.cook.n : 0;
  Cook.mark = (Cook.zone.z0 + Cook.zone.z1) / 2; cookAction();
  return { moved, round1, state: Cook.state, dMoney: Game.money - money0, dn: (Game.cook ? Game.cook.n : 0) - n0, speedUp: Cook.speed };
});
ok(r5.moved, 'R5 標記會移動（updateCook 跑）');
ok(r5.round1, 'R5 第一下命中→round 1（還再煮）');
ok(r5.state === 'result' && r5.dMoney === 35 && r5.dn === 1, 'R5 第二下命中→result+35元+1道菜（money+' + r5.dMoney + '）');

/* R6：result 自動回 menu；失手→燒焦回 menu */
let r6 = await $(async () => {
  await new Promise(r => setTimeout(r, 1700)); /* result 1.6s 自動回 menu */
  const auto = Cook.state === 'menu';
  cookPick('rice');
  Cook.mark = 0.01; /* zone z0>=0.06，必然區外 */
  cookAction();
  return { auto, state: Cook.state, msg: $('#cook-msg').textContent };
});
ok(r6.auto && r6.state === 'menu' && /燒焦/.test(r6.msg), 'R6 result 自動回 menu；失手→燒焦（' + r6.msg + '）');

/* R7：存檔有做菜數 */
let r7 = await $(() => {
  const sv = fullSave(Game.stage);
  return { cook: sv.cook };
});
ok(r7.cook && r7.cook.n === 1, 'R7 fullSave.cook.n=1（' + JSON.stringify(r7.cook) + '）');

/* R8：Esc 離開→free */
await page.keyboard.press('Escape');
let r8 = await $(() => ({ sub: Game.sub, cook: !!Cook, screen: $('#screen-cook').classList.contains('hidden') }));
ok(r8.sub === 'free' && !r8.cook && r8.screen, 'R8 Esc→回 free+Cook 清空');

ok(errs.length === 0, 'pageErr 0（' + errs.length + '）');
console.log(fails === 0 && errs.length === 0 ? '✅ COOK35 全過' : '❌ COOK35 有失敗（' + fails + '）');
await browser.close();
server.close();
process.exit(fails === 0 && errs.length === 0 ? 0 : 1);
