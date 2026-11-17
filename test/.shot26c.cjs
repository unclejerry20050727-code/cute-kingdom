const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8742/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#cover-enter', { timeout: 30000 });
  await p.evaluate(() => {
    Game.playerCfg = defaultConfig('female');
    beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
    setSub('map');
  });
  await p.evaluate(() => enterPark());
  await p.evaluate(() => {
    Park3D.nearStation = Park3D.stations.find((s) => s.kind === 'wheel');
    Park3D.action();
  });
  await p.waitForFunction(() => ParkWheel.active, null, { timeout: 60000 });
  await p.evaluate(() => { ParkWheel.diveTimer = 9999; });

  const dispatchDive = (idx) => p.evaluate((i) => {
    const w = ParkWheel;
    const pred = w._predictPlayer(0.9);
    const b2 = w.birds[i];
    const BZ = w.HUB.z + w.BIRD_Z;
    b2.group.position.set(pred.x, pred.y + 5, BZ);
    b2.from = { x: pred.x, y: pred.y + 5 };
    b2.to = { x: pred.x, y: pred.y };
    b2.state = 'dive'; b2.t = 0.9;
    return true;
  }, idx);

  /* 截圖 1：A/D 右閃中（pOff→1.2，玩家偏離座艙中線） */
  await p.evaluate(() => { ParkWheel.pOff = 0; });
  await dispatchDive(0);
  await p.evaluate(() => Game.keys.add('right'));
  await p.waitForFunction(() => Math.abs(ParkWheel.pOff) > 1.0 && ParkWheel.birds[0].state === 'dive', null, { timeout: 10000 });
  await p.screenshot({ path: '/tmp/w26-03-ad.png' });
  console.log('ad shot: pOff=' + await p.evaluate(() => ParkWheel.pOff.toFixed(2)));
  await p.waitForFunction(() => ParkWheel.invuln <= 0, null, { timeout: 10000 });
  await p.evaluate(() => Game.keys.delete('right'));
  await p.waitForFunction(() => Math.abs(ParkWheel.pOff) < 0.1, null, { timeout: 10000 });

  /* 截圖 2：跳躲空中（jumpH 高峰） */
  await dispatchDive(1);
  await p.waitForFunction(() => { const b2 = ParkWheel.birds[1]; return b2.state === 'dive' && b2.t < 0.7; }, null, { timeout: 10000 });
  await p.evaluate(() => ParkWheel.action());
  await p.waitForFunction(() => {
    const j = ParkWheel.jump;
    return j > 0;
  }, null, { timeout: 5000 });
  /* 等 jumpH 接近高峰（tau≈0.5） */
  await p.waitForFunction(() => {
    const j = ParkWheel.jump;
    if (j <= 0) return false;
    const tau = 1 - j / ParkWheel.JUMP_T;
    return tau > 0.4 && tau < 0.62;
  }, null, { timeout: 5000 });
  await p.screenshot({ path: '/tmp/w26-04-jump.png' });
  console.log('jump shot: jump=' + await p.evaluate(() => ParkWheel.jump.toFixed(2)));

  console.log('pageErr:', errs.length, errs.slice(0, 3));
  await b.close();
})();
