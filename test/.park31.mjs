/** 第三十一輪 31-4：iPhone 遊樂園觸控操作全測（D-pad 左右/上下、prompt 不重疊、lr-hint 脈動、0 pageErr） */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => srv.listen(8374, r));
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
await page.goto('http://localhost:8374/', { waitUntil: 'load' });
await page.waitForFunction(() => typeof beginGame === 'function', null, { timeout: 20000 });
await page.evaluate(() => { Game.playerCfg = defaultConfig('female'); beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true); setSub('map'); });
await page.evaluate(async () => await enterPark());
await page.waitForTimeout(1000);

let pass = 0; const fails = [];
const check = (name, ok) => { ok ? pass++ : fails.push(name); console.log((ok ? '✅' : '❌') + ' ' + name); };

/* ── 1. D-pad 可見、4 鍵都在螢幕內 ── */
const dpad = await page.evaluate(() => {
  const d = document.getElementById('dpad').getBoundingClientRect();
  const btns = [...document.querySelectorAll('.dpad button')].map(b => { const r = b.getBoundingClientRect(); return { d: b.dataset.d, in: r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  return { hidden: document.getElementById('dpad').classList.contains('hidden'), in: d.x >= 0 && d.y >= 0 && d.right <= innerWidth && d.bottom <= innerHeight, btns };
});
check('D-pad 顯示', !dpad.hidden && dpad.in);
check('4 鍵都在螢幕內', dpad.btns.length === 4 && dpad.btns.every(b => b.in));

const tapHold = async (d, ms) => {
  const box = await page.locator(`.dpad button[data-d="${d}"]`).boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
};

/* ── 2. 自由行走：→=純右、↑=純遠（remap 後不斜走）── */
const f0 = await page.evaluate(() => ({ x: Park3D.player.position.x, z: Park3D.player.position.z }));
await tapHold('1,-1', 900);
const f1 = await page.evaluate(() => ({ x: Park3D.player.position.x, z: Park3D.player.position.z }));
check('→ 純右移 (dx>0.3, |dz|<0.15)', f1.x - f0.x > 0.3 && Math.abs(f1.z - f0.z) < 0.15);
await tapHold('-1,-1', 900); /* ↑ */
const f2 = await page.evaluate(() => ({ x: Park3D.player.position.x, z: Park3D.player.position.z }));
check('↑ 純遠移 (dz<-0.3, |dx|<0.15)', f2.z - f1.z < -0.3 && Math.abs(f2.x - f1.x) < 0.15);

/* ── 3. 甜甜圈接接樂：←/→ 動 px＋prompt 文字＋lr-hint＋版面不重疊 ── */
await page.evaluate(() => { Park3D.player.position.set(0, 1.5, -6); });
await page.waitForTimeout(250);
await page.evaluate(() => Park3D.action());
await page.waitForTimeout(700);
check('接接樂開局', await page.evaluate(() => ParkCatch.active));
const hintOn = await page.evaluate(() => document.querySelectorAll('.dpad button.lr-hint').length);
check('←/→ 脈動提示 (2 顆)', hintOn === 2);
const promptGeo = await page.evaluate(() => {
  const p = document.querySelector('.park-prompt').getBoundingClientRect();
  const d = document.getElementById('dpad').getBoundingClientRect();
  const a = document.getElementById('park-action').getBoundingClientRect();
  return { pBottom: p.bottom, dTop: d.y, aTop: a.y, pRight: p.right, vw: innerWidth };
});
check('prompt 完整在螢幕內', promptGeo.pRight <= promptGeo.vw + 1);
check('prompt 不蓋 D-pad/⚡', promptGeo.pBottom <= promptGeo.dTop && promptGeo.pBottom <= promptGeo.aTop);
const pTxt = await page.evaluate(() => document.getElementById('park-prompt').textContent);
check('prompt 用「← → 移動」', pTxt.includes('← → 移動'));
const px0 = await page.evaluate(() => ParkCatch.px);
await tapHold('-1,1', 800);
const pxL = await page.evaluate(() => ParkCatch.px);
await tapHold('1,-1', 800);
const pxR = await page.evaluate(() => ParkCatch.px);
check('← 左移 (px 降)', pxL < px0 - 0.2);
check('→ 右移 (px 升回)', pxR > pxL + 0.2);

/* ── 4. 摩天輪：←/→ 側閃 pOff＋prompt＋退場清 lr-hint ── */
await page.evaluate(() => ParkCatch._cleanup(false));
await page.waitForTimeout(300);
await page.evaluate(() => { Park3D.player.position.set(-16, 1.5, -2); });
await page.waitForTimeout(250);
await page.evaluate(() => Park3D.action());
await page.waitForTimeout(700);
check('摩天輪開局', await page.evaluate(() => ParkWheel.active));
const wTxt = await page.evaluate(() => document.getElementById('park-prompt').textContent);
check('prompt 用「← → 躲＋⚡ 跳」', wTxt.includes('← → 躲＋⚡ 跳'));
const wo0 = await page.evaluate(() => ParkWheel.pOff);
await tapHold('-1,1', 700);
const woL = await page.evaluate(() => ParkWheel.pOff);
await tapHold('1,-1', 700);
const woR = await page.evaluate(() => ParkWheel.pOff);
check('← 左閃 (pOff 降)', woL < wo0 - 0.15);
check('→ 右閃 (pOff 升回)', woR > woL + 0.15);
await page.evaluate(() => ParkWheel._cleanup(false));
await page.waitForTimeout(200);
check('退場後 lr-hint 清除', (await page.evaluate(() => document.querySelectorAll('.dpad button.lr-hint').length)) === 0);

/* ── 5. ⚡ 按鈕在螢幕內 ── */
const act = await page.evaluate(() => { const r = document.getElementById('park-action').getBoundingClientRect(); return r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; });
check('⚡ 按鈕在螢幕內', act);

check('0 pageerror', errs.length === 0);
console.log(`\n${fails.length === 0 ? '✅ PARK31 全過' : '❌ FAIL: ' + fails.join('、')}（${pass} 過 / ${errs.length} pageErr）`);
if (errs.length) console.log(errs.slice(0, 3));
await page.screenshot({ path: '/tmp/park31-final.png' });
await browser.close(); srv.close();
process.exit(fails.length || errs.length ? 1 : 0);
