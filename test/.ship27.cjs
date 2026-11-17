/* 27-2：海盜船 ride 核心測試（上船/慢擺/泵對/泵錯減速/第一人稱/cleanup） */
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
    Park3D.nearStation = Park3D.stations.find((s) => s.kind === 'ship');
    Park3D.action();
  });
  await p.waitForFunction(() => ParkShip.active, null, { timeout: 60000 });

  /* R1：上船狀態 */
  const r1 = await p.evaluate(() => ({
    active: ParkShip.active,
    omega0: +ParkShip.omega.toFixed(3),
    playerVis: Park3D.player.visible,
    fov: Park3D.camera.fov,
  }));
  console.log('R1 board:', JSON.stringify(r1));

  /* R2：起點就是最低點且 |ω|>0.12 → 泵對（ω +0.38） */
  await p.evaluate(() => { ParkShip.action(); });
  const r2 = await p.evaluate(() => ({
    omega: +ParkShip.omega.toFixed(3),
    flash: ParkShip.pumpFlash ? ParkShip.pumpFlash.text : null,
  }));
  console.log('R2 pumpOk:', JSON.stringify(r2));

  /* R3：強制中擺狀態（θ=0.5, ω=0.5）按錯 → decayT=1.8、能量明顯衰減 */
  const r3a = await p.evaluate(() => {
    ParkShip.theta = 0.5; ParkShip.omega = 0.5;
    ParkShip.decayT = 0;
    ParkShip.action();
    const E0 = 0.5 * ParkShip.omega ** 2 + (ParkShip.G / ParkShip.L) * (1 - Math.cos(ParkShip.theta));
    ParkShip._E0 = E0;
    return { omegaAtPress: ParkShip.omega, decayT: +ParkShip.decayT.toFixed(2), flash: ParkShip.pumpFlash ? ParkShip.pumpFlash.text : null };
  });
  await p.waitForFunction(() => {
    const E = 0.5 * ParkShip.omega ** 2 + (ParkShip.G / ParkShip.L) * (1 - Math.cos(ParkShip.theta));
    return E < ParkShip._E0 * 0.8 && ParkShip.decayT <= 0;
  }, null, { timeout: 30000 });
  const r3b = await p.evaluate(() => {
    const E = 0.5 * ParkShip.omega ** 2 + (ParkShip.G / ParkShip.L) * (1 - Math.cos(ParkShip.theta));
    return { E: +E.toFixed(3), E0: +ParkShip._E0.toFixed(3) };
  });
  console.log('R3 wrongPress:', JSON.stringify({ ...r3a, after: r3b }));

  /* R4：下次過最低點泵對；順手截圖第一人稱甩動中 */
  await p.waitForFunction(() => {
    const w = ParkShip._wrap(ParkShip.theta);
    return Math.abs(w) < 0.12 && Math.abs(ParkShip.omega) > 0.15 && Math.abs(ParkShip.theta) < 3;
  }, null, { timeout: 60000 });
  await p.evaluate(() => { ParkShip.action(); });
  const r4 = await p.evaluate(() => +ParkShip.omega.toFixed(3));
  console.log('R4 pumpOk2:', JSON.stringify({ omega: r4 }));
  await p.waitForFunction(() => {
    const w = ParkShip._wrap(ParkShip.theta);
    return Math.abs(w) > 0.5 && Math.abs(w) < 1.2;
  }, null, { timeout: 30000 });
  const r4sync = await p.evaluate(() => ({ rot: Park3D.pirate.ship.rotation.z, th: ParkShip.theta }));
  console.log('R4 sync: ship.rotation.z =', r4sync.rot.toFixed(3), 'theta =', r4sync.th.toFixed(3));
  await p.screenshot({ path: '/tmp/s27-04-ride.png' });

  /* R5：強制到 40s → 結算 3s → cleanup */
  await p.evaluate(() => { ParkShip.t = ParkShip.DURATION; });
  await p.waitForFunction(() => !ParkShip.active, null, { timeout: 30000 });
  const r5 = await p.evaluate(() => ({
    prompt: document.querySelector('#park-prompt').textContent,
    rideTmp: !!Park3D.ride,
  }));
  console.log('R5 finish:', JSON.stringify(r5));
  await p.waitForFunction(() => Park3D.ride === null, null, { timeout: 30000 });
  const r6 = await p.evaluate(() => ({
    pp: Park3D.player.position.x.toFixed(1) + ',' + Park3D.player.position.z.toFixed(1),
    vis: Park3D.player.visible,
    fov: Park3D.camera.fov,
    cam: Park3D.camera.position.x.toFixed(1) + ',' + Park3D.camera.position.y.toFixed(1) + ',' + Park3D.camera.position.z.toFixed(1),
    camUp: Park3D.camera.up.y.toFixed(2),
    shipRot: +Park3D.pirate.ship.rotation.z.toFixed(3),
  }));
  console.log('R6 cleanup:', JSON.stringify(r6));
  console.log('pageErr:', errs.length, errs.slice(0, 3));
  await b.close();
  const pass = errs.length === 0
    && r1.active === true && r1.playerVis === false && r1.fov === 60
    && Math.abs(r2.omega - 0.73) < 0.05
    && r3a.flash && r3a.flash.includes('按錯') && r3b.E < r3b.E0 * 0.8
    && Math.abs(r4sync.rot - r4sync.th) < 0.02
    && r5.rideTmp === true
    && r6.pp === '12.5,10.5' && r6.vis === true && r6.fov === 52
    && r6.cam === '0.0,19.0,34.0' && Math.abs(r6.camUp - 1) < 0.01
    && Math.abs(r6.shipRot) < 0.01;
  console.log(pass ? 'PASS: ship27' : 'FAIL: ship27');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
