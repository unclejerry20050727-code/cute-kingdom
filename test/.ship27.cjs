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

  /* R4b：頂端星（90°）未轉圈不可拿（先歸零星星狀態，排除自由擺動順手拿到的） */
  await p.evaluate(() => {
    for (const s of ParkShip.stars) { if (!s.top) { s.got = false; s.mesh.visible = true; } }
    ParkShip.collected = 0;
    Park3D.stars = 0;
    document.querySelector('#park-star').textContent = '🌟 0';
    ParkShip.theta = Math.PI / 2; ParkShip.omega = 0; ParkShip.decayT = 0; /* 靜止在頂端 */
  });
  await p.waitForTimeout(300);
  const rTop = await p.evaluate(() => {
    const top = ParkShip.stars.find((s) => s.top);
    return { topGot: top.got, topVis: top.mesh.visible, collected: ParkShip.collected, flags: ParkShip.stars.map((s) => s.got ? 1 : 0), theta: +ParkShip.theta.toFixed(2) };
  });
  console.log('R4b topStarNoLoop:', JSON.stringify(rTop));

  /* R4c：三顆擺幅星依序拿到（+50°/−50°/+115°） */
  for (const [deg, need] of [[50, 1], [-50, 2], [115, 3]]) {
    await p.evaluate((d) => { ParkShip.theta = d * Math.PI / 180; ParkShip.omega = 0.3; ParkShip.decayT = 0; }, deg);
    await p.waitForFunction((n) => ParkShip.collected >= n, need, { timeout: 30000 });
  }
  const rStars = await p.evaluate(() => ({
    collected: ParkShip.collected,
    parkStars: Park3D.stars,
    hud: document.querySelector('#park-star').textContent,
    meshes: ParkShip.stars.filter((s) => s.got && s.mesh.visible).length,
  }));
  console.log('R4c stars:', JSON.stringify(rStars));

  /* R4d：加速線——超速（|ω|>1.2）泵對閃 0.7s；低速泵不閃 */
  await p.evaluate(() => {
    ParkShip.theta = 0; ParkShip.omega = 0.95; ParkShip.decayT = 0;
    ParkShip.action(); /* 泵後 1.33 > 1.2 閃線；E=0.885 < 1.25 不會翻圈 */
  });
  const sl1 = await p.evaluate(() => document.querySelector('#park-speedlines').classList.contains('on'));
  await p.waitForFunction(() => !document.querySelector('#park-speedlines').classList.contains('on'), null, { timeout: 30000 });
  const sl2 = await p.evaluate(() => ({
    on: document.querySelector('#park-speedlines').classList.contains('on'),
    t: ParkShip.speedlineT,
  }));
  const sl3 = await p.evaluate(() => {
    ParkShip.theta = 0; ParkShip.omega = 0.8; ParkShip.decayT = 0;
    ParkShip.action(); /* 0.8+0.38=1.18 < 1.2，不該閃 */
    return document.querySelector('#park-speedlines').classList.contains('on');
  });
  console.log('R4d speedlines:', JSON.stringify({ fast: sl1, after: sl2, low: sl3 }));

  /* R4e：完整一圈——E=1.57>1.43 上膛、船頭過 90° 拿頂端星（第 4 顆）、跨 ±π 嘔吐 gag、
     累 360° → settle → 自然結束（傳奇一圈） */
  await p.evaluate(() => {
    ParkShip.theta = 1.0; ParkShip.omega = 1.6; ParkShip.decayT = 0;
  });
  await p.waitForFunction(() => ParkShip.vomitT > 0, null, { timeout: 60000 });
  const rGag = await p.evaluate(() => ({
    vomitT: +ParkShip.vomitT.toFixed(2),
    loopActive: ParkShip.loopActive,
    overlay: document.querySelector('#park-vomit').classList.contains('on'),
    face: !!document.querySelector('#park-vomit-face'),
    parts: ParkShip.vomitParts.length,
    collected: ParkShip.collected,
    topGot: ParkShip.stars.find((s) => s.top).got,
  }));
  await p.screenshot({ path: '/tmp/s27-07-gag.png' });
  console.log('R4e gag:', JSON.stringify(rGag));
  /* 360° → settle 收斂 → 結算 3s → cleanup（自然收尾） */
  await p.waitForFunction(() => !ParkShip.active, null, { timeout: 90000 });

  /* R5：自然結束——應為「傳奇一圈 ★ 4/4」 */
  const r5 = await p.evaluate(() => ({
    prompt: document.querySelector('#park-prompt').textContent,
    collected: ParkShip.collected,
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
    starsLeft: ParkShip.stars.length,
    vomitOn: document.querySelector('#park-vomit').classList.contains('on'),
    parts: ParkShip.vomitParts.length,
  }));
  console.log('R6 cleanup:', JSON.stringify(r6));
  console.log('pageErr:', errs.length, errs.slice(0, 3));
  await b.close();
  const pass = errs.length === 0
    && r1.active === true && r1.playerVis === false && r1.fov === 60
    && Math.abs(r2.omega - 0.73) < 0.05
    && r3a.flash && r3a.flash.includes('按錯') && r3b.E < r3b.E0 * 0.8
    && Math.abs(r4sync.rot - r4sync.th) < 0.02
    && rTop.topGot === false && rTop.topVis === true && rTop.collected === 0
    && rStars.collected === 3 && rStars.parkStars === 3 && rStars.hud.includes('3') && rStars.meshes === 0
    && sl1 === true && sl2.on === false && sl2.t <= 0 && sl3 === false
    && rGag.vomitT > 0 && rGag.loopActive === true && rGag.overlay === true
    && rGag.face === true && rGag.parts > 0 && rGag.collected === 4 && rGag.topGot === true
    && r5.collected === 4 && r5.prompt.includes('傳奇一圈')
    && r6.pp === '12.5,10.5' && r6.vis === true && r6.fov === 52
    && r6.cam === '0.0,19.0,34.0' && Math.abs(r6.camUp - 1) < 0.01
    && Math.abs(r6.shipRot) < 0.01 && r6.starsLeft === 0
    && r6.vomitOn === false && r6.parts === 0;
  console.log(pass ? 'PASS: ship27' : 'FAIL: ship27');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
