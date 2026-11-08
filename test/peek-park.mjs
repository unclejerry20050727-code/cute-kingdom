/* 第十八輪18i：遊樂園 3D 回歸測試（進園/全景/移動/雲霄飛車/甜甜圈/摩天輪/獎勵/存檔/離開）
   截圖（/tmp/，3D 渲染有幟計時抖動不進 shots/ 基線，同 18d~18h 慣例）：pk01 全景、pk02 接接樂、pk03 摩天輪 */
import { chromium } from 'playwright';

const b = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
const fail = (m) => { console.error('FAIL:', m); b.close(); process.exit(1); };
const ok = (cond, m) => { if (!cond) fail(m); console.log('ok:', m); };
const fastForward = () => p.evaluate(() => {
  const r = Park3D.ride;
  if (r && r._t !== undefined) r._t = 0.01;
  if (window.ParkCoaster && ParkCoaster.finished) ParkCoaster.finishTimer = 0.01;
});

await p.goto('http://127.0.0.1:8742/index.html');
await p.waitForSelector('#cover-enter');
await p.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
  setSub('map');
});
const money0 = await p.evaluate(() => Game.money);

/* ── 1. 進園 ── */
await p.evaluate(() => enterPark());
await p.waitForFunction(() => Park3D.running, null, { timeout: 30000 });
await p.waitForTimeout(2000);
const s1 = await p.evaluate(() => ({ three: THREE ? THREE.REVISION : null, running: Park3D.running, player: !!Park3D.player, sub: Game.sub, inited: Park3D.inited }));
console.log('s1:', JSON.stringify(s1));
ok(String(s1.three) === '128' && s1.running && s1.player, `3D 場景初始化（THREE r${s1.three}＋玩家）`);

/* ── 2. 全景截圖（凍結輪角/時間） ── */
await p.evaluate(() => { Park3D.wheelAngle = 0; Park3D.t = 0; });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/pk01-park3d-pano.png', timeout: 60000 });
console.log('shot: pk01 全景');

/* ── 3. 移動 ── */
await p.keyboard.down('KeyD');
await p.waitForTimeout(400);
await p.keyboard.up('KeyD');
const px = await p.evaluate(() => Park3D.player.position.x);
ok(px > 0.5, `D 鍵往右移動（px=${px.toFixed(2)}）`);

/* ── 4. 雲霄飛車（含 ⚡ 觸控鈕＋星星＋結算） ── */
await p.evaluate(() => { Park3D.player.position.set(5, 1.5, 6); });
await p.waitForTimeout(400);
await p.evaluate(() => Park3D.action());
ok(await p.evaluate(() => ParkCoaster.active), '雲霄飛車上車');
/* ⚡ 觸控動作鈕：先讓車停住（陡坡起步會自然停），tap ⚡ 應重新踩到 v=7 再緩衰 */
await p.evaluate(() => { ParkCoaster.v = 0; ParkCoaster.stopped = true; });
await p.tap('#park-action');
await p.waitForTimeout(300);
const v1 = await p.evaluate(() => ParkCoaster.v);
ok(v1 > 4, `⚡ 觸控動作鈕踩踏板再啟動（停住後 v=${v1.toFixed(1)}）`);
/* 收集 1 號星（19c：星 t 動態讀——新 113u 軌道 1 號星在俯衝中 t=0.27；v=12 避免中途停住） */
await p.evaluate(() => { ParkCoaster.t = ParkCoaster.stars[0].t; ParkCoaster.v = 12; ParkCoaster.stopped = false; });
await p.waitForFunction(() => ParkCoaster.collected >= 1, null, { timeout: 30000 });
console.log('ok: 雲霄飛車收集星星');
/* 到站（跳 t≈1） */
await p.evaluate(() => { ParkCoaster.t = 0.995; ParkCoaster.v = 12; });
await p.waitForFunction(() => ParkCoaster.finished === true, null, { timeout: 30000 });
await fastForward();
await p.waitForFunction(() => !Park3D.ride, null, { timeout: 30000 });
const cs = await p.evaluate(() => ({ money: Game.money, best: Game.park.best.coaster }));
ok(cs.best === 1 && cs.money === money0 + 2, `雲霄飛車結算（1★→🪙+2、best.coaster=1）`);

/* ── 5. 甜甜圈接接樂（含截圖） ── */
await p.evaluate(() => { Park3D.player.position.set(0, 1.5, -6); });
await p.waitForTimeout(400);
await p.evaluate(() => Park3D.action());
ok(await p.evaluate(() => ParkCatch.active), '甜甜圈開始');
await p.waitForFunction(() => ParkCatch.donuts.length > 0, null, { timeout: 30000 });
/* 凍結場景截圖（甜甜圈定點/輪角/時間） */
await p.evaluate(() => {
  ParkCatch.donuts[0].mesh.position.set(1.5, 8.5, -6);
  ParkCatch.donuts[0].vy = 0.5; /* 放慢落下，截圖期間不會掉出界 */
  Park3D.wheelAngle = 0.8; Park3D.wheelSpeed = 0;
  ParkCatch.timeLeft = 25;
});
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/pk02-park3d-catch.png', timeout: 60000 });
console.log('shot: pk02 接接樂');
await p.evaluate(() => { Park3D.wheelSpeed = 0.25; });
/* 強接第一個甜甜圈 */
await p.evaluate(() => {
  const d = ParkCatch.donuts[0];
  d.mesh.position.set(ParkCatch.px, 1.2, ParkCatch.Z);
});
await p.waitForFunction(() => ParkCatch.score >= 1, null, { timeout: 30000 });
console.log('ok: 甜甜圈接住（score 1）');
await p.evaluate(() => { ParkCatch.timeLeft = 0.01; });
await p.waitForFunction(() => Park3D.ride && Park3D.ride._t !== undefined && !ParkCatch.active, null, { timeout: 30000 });
await fastForward();
await p.waitForFunction(() => !Park3D.ride, null, { timeout: 30000 });
ok(await p.evaluate((m) => Game.money === m + 4, money0), '接接樂結算（1★→🪙+2）');

/* ── 6. 摩天輪（含截圖） ── */
await p.evaluate(() => { Park3D.player.position.set(-16, 1.5, -2); });
await p.waitForTimeout(400);
await p.evaluate(() => Park3D.action());
ok(await p.evaluate(() => ParkWheel.active), '摩天輪上座艙');
/* 凍結截圖（輪角定 1.2、等相機收斂） */
await p.evaluate(() => { Park3D.wheelSpeed = 0; Park3D.wheelAngle = 1.2; });
await p.waitForTimeout(3000);
await p.screenshot({ path: '/tmp/pk03-park3d-wheel.png', timeout: 60000 });
console.log('shot: pk03 摩天輪');
/* 轉一圈 */
await p.evaluate(() => { Park3D.wheelSpeed = 4; });
await p.waitForFunction(() => Park3D.ride && Park3D.ride._t !== undefined && !ParkWheel.active, null, { timeout: 60000 });
await fastForward();
await p.waitForFunction(() => !Park3D.ride, null, { timeout: 30000 });
const ws = await p.evaluate(() => ({ money: Game.money, best: Game.park.best.wheel, stars: Park3D.stars }));
ok(ws.best === 4 && ws.money === money0 + 12, `摩天輪一圈 4★（🪙+8、best.wheel=4）`);
ok(ws.stars === 6, `本次遊玩星星累計 ${ws.stars}（雲霄 1＋接接 1＋摩天輪 4）`);

/* ── 7. 離開＋存檔 ── */
await p.evaluate(() => Park3D.exit());
await p.waitForTimeout(800);
const ex = await p.evaluate(() => {
  const save = JSON.parse(localStorage.getItem('cute-kingdom-save-v1') || '{}');
  return { sub: Game.sub, mapP: [Game.mapP.x, Game.mapP.y], career: Game.park.stars, parkInSave: save.park || null };
});
ok(ex.sub === 'map' && ex.mapP[0] === 490 && ex.mapP[1] === 330, '離開回地圖（玩家站回 PK 下方）');
ok(ex.career === 6 && ex.parkInSave && ex.parkInSave.stars === 6, `生涯星星存檔（${ex.career}★）`);

ok(errs.length === 0, `0 pageerror${errs.length ? '：' + errs.join('; ') : ''}`);
console.log('PASS: peek-park（第十八輪18i）');
await b.close();
