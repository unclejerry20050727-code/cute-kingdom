/* 24-2c：甜甜圈接接樂驗證（(a)接住舉手 (b)飛撲接 (c)炸彈）
 * 需 8742 本地 server。headless ~3fps → 全用 waitForFunction 輪詢（遊戲時間≈真實時間）。
 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:8742/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForSelector('#cover-enter', { timeout: 30000 });
  await p.evaluate(() => {
    Game.playerCfg = defaultConfig('female');
    beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
    setSub('map');
    enterPark();
  });
  await p.waitForFunction(() => Park3D.running, null, { timeout: 90000 });
  await p.waitForTimeout(2000);
  /* 用真實站點流程啟動（Park3D.action 會設 park.ride = ParkCatch） */
  await p.evaluate(() => {
    Park3D.nearStation = Park3D.stations.find((s) => s.kind === 'catch');
    Park3D.action();
  });
  await p.waitForFunction(() => ParkCatch.active === true, null, { timeout: 30000 });

  const clearDonuts = (expr) => `
    (() => {
      const c = ParkCatch;
      for (const d of [...c.donuts]) { Park3D.scene.remove(d.mesh); c.donuts.splice(c.donuts.indexOf(d), 1); }
      c.spawnTimer = 5; /* 暫停自然生成（確定性） */
      ${expr || ''}
      return c.score;
    })()`;

  const s0 = await p.evaluate(clearDonuts());
  await p.screenshot({ path: '/tmp/c24-01-start.png' });

  /* (a) 接住 → 舉手 pose */
  await p.evaluate(clearDonuts(`
    ParkCatch._spawn(THREE, false);
    ParkCatch.donuts[ParkCatch.donuts.length - 1].mesh.position.set(ParkCatch.px, 3.2, ParkCatch.Z);
  `));
  await p.waitForFunction((s) => ParkCatch.score > s, s0, { timeout: 30000 });
  await p.waitForFunction(() => ParkCatch.poseT > 0.2 && ParkCatch.poseAge > 0.18, null, { timeout: 10000 });
  await p.screenshot({ path: '/tmp/c24-02-catch-pose.png' });
  const s1 = await p.evaluate(() => ParkCatch.score);

  /* (b) 飛撲接：甜甜圈在右 2.0u（超出常規 1.7 盒）→ 右撲接到 */
  await p.evaluate(clearDonuts(`
    ParkCatch._spawn(THREE, false);
    ParkCatch.donuts[ParkCatch.donuts.length - 1].mesh.position.set(ParkCatch.px + 2.0, 3.0, ParkCatch.Z);
  `));
  await p.evaluate(() => { Game.keys.add('right'); ParkCatch.action(); });
  await p.waitForFunction(() => ParkCatch.dive && Math.abs(Park3D.player.rotation.z) > 0.3, null, { timeout: 15000 });
  await p.screenshot({ path: '/tmp/c24-03-dive.png' });
  await p.waitForFunction((s) => ParkCatch.score > s, s1, { timeout: 30000 });
  await p.waitForFunction(() => ParkCatch.dive === null, null, { timeout: 15000 });
  const s2 = await p.evaluate(() => {
    const r = { score: ParkCatch.score, cd: +ParkCatch.diveCd.toFixed(2), lean: +Park3D.player.rotation.z.toFixed(3) };
    Game.keys.delete('right');
    return r;
  });

  /* (c) 炸彈：頭頂丟下，故意接到 → -2★＋爆炸 */
  const s2b = await p.evaluate(clearDonuts(`
    ParkCatch._spawn(THREE, true);
    ParkCatch.donuts[ParkCatch.donuts.length - 1].mesh.position.set(ParkCatch.px, 2.8, ParkCatch.Z);
  `));
  await p.waitForFunction(() => ParkCatch.fx.length > 0, null, { timeout: 30000 });
  await p.screenshot({ path: '/tmp/c24-04-bomb.png' });
  const s3 = await p.evaluate(() => ({ score: ParkCatch.score, flash: ParkCatch.flash && ParkCatch.flash.text }));

  /* cleanup 驗證 */
  await p.evaluate(() => ParkCatch.abort());
  await p.waitForFunction(() => ParkCatch.active === false, null, { timeout: 10000 });
  const s4 = await p.evaluate(() => ({
    active: ParkCatch.active, donuts: ParkCatch.donuts.length, fx: ParkCatch.fx.length,
    lean: +Park3D.player.rotation.z.toFixed(3), ride: !Park3D.ride,
  }));

  console.log('CATCH24:', JSON.stringify({ s0, s1, s2, s2b, s3, s4, pageErr: errs.length, pageErrList: errs.slice(0, 5) }));
  const pass = s1 === s0 + 1 && s2.score === s1 + 1 && s3.score === Math.max(0, s2b - 2)
    && s4.active === false && s4.donuts === 0 && s4.fx === 0 && Math.abs(s4.lean) < 0.01 && s4.ride === true && errs.length === 0;
  console.log(pass ? 'PASS: catch24' : 'FAIL: catch24');
  await b.close();
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
