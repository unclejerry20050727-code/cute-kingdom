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

  /* 關閉自然排程，改手動控制每隻鳥（確定性） */
  await p.evaluate(() => { ParkWheel.diveTimer = 9999; });

  /* 輔助：讓 idx 號鳥從玩家預測點上方 5u 直線向下撲（0.9s） */
  const dispatchDive = (idx) => p.evaluate((i) => {
    const w = ParkWheel;
    const pred = w._predictPlayer(0.9);
    const b = w.birds[i];
    const BZ = w.HUB.z + w.BIRD_Z;
    b.group.position.set(pred.x, pred.y + 5, BZ);
    b.from = { x: pred.x, y: pred.y + 5 };
    b.to = { x: pred.x, y: pred.y };
    b.state = 'dive'; b.t = 0.9;
    return { pred: { x: +pred.x.toFixed(2), y: +pred.y.toFixed(2) } };
  }, idx);

  /* R1：bird0 向下撲、不躲 → 被啄 */
  console.log('R1 dispatch:', JSON.stringify(await dispatchDive(0)));
  const hit = await p.waitForFunction(() => {
    const f = ParkWheel.hitFlash;
    return f && f.text.includes('被啄') ? f.text : null;
  }, null, { timeout: 30000 });
  console.log('R1 hit:', (await hit.jsonValue()));
  await p.waitForFunction(() => ParkWheel.invuln <= 0, null, { timeout: 10000 });

  /* R2：bird1 向下撲、進撲同時 A/D 右閃（pOff→1.2）→ 閃過 */
  await p.evaluate(() => { ParkWheel.pOff = 0; });
  console.log('R2 dispatch:', JSON.stringify(await dispatchDive(1)));
  await p.evaluate(() => Game.keys.add('right'));
  const d1 = await p.waitForFunction(() => {
    const f = ParkWheel.hitFlash;
    return f && f.text.includes('閃過') && ParkWheel.dodges >= 1
      ? { dodges: ParkWheel.dodges, pOff: +ParkWheel.pOff.toFixed(2) } : null;
  }, null, { timeout: 30000 });
  await p.evaluate(() => Game.keys.delete('right'));
  console.log('R2 adDodge:', JSON.stringify(await d1.jsonValue()));
  await p.waitForFunction(() => ParkWheel.invuln <= 0 && Math.abs(ParkWheel.pOff) < 0.1, null, { timeout: 10000 });

  /* R3：bird2 向下撲、俯衝 0.2s 後 ⚡ 跳 → 閃過（jumpH>0.95） */
  console.log('R3 dispatch:', JSON.stringify(await dispatchDive(2)));
  await p.waitForFunction(() => {
    const b = ParkWheel.birds[2];
    return b.state === 'dive' && b.t < 0.7;
  }, null, { timeout: 30000 });
  const j = await p.evaluate(() => {
    ParkWheel.action();
    const j1 = ParkWheel.jump;
    ParkWheel.action(); /* 冷卻中第二次應無效 */
    return { j1, cd: +ParkWheel.jumpCd.toFixed(2) };
  });
  console.log('R3 jump:', JSON.stringify(j));
  const d2 = await p.waitForFunction(() => {
    const f = ParkWheel.hitFlash;
    return f && f.text.includes('閃過') && ParkWheel.dodges >= 2
      ? { dodges: ParkWheel.dodges } : null;
  }, null, { timeout: 30000 });
  console.log('R3 jumpDodge:', JSON.stringify(await d2.jsonValue()));

  /* R4：強製一圈完成 → 結算 → cleanup */
  await p.evaluate(() => { Park3D.wheelAngle = ParkWheel.startAngle + Math.PI * 2 - 0.01; });
  await p.waitForFunction(() => !ParkWheel.active, null, { timeout: 30000 });
  const end = await p.evaluate(() => ({
    birds: ParkWheel.birds.length,
    playerPos: Park3D.player.position.x.toFixed(1) + ',' + Park3D.player.position.z.toFixed(1),
    prompt: document.querySelector('#park-prompt').textContent,
  }));
  console.log('R4 end:', JSON.stringify(end));
  await p.waitForFunction(() => ParkWheel.birds.length === 0, null, { timeout: 30000 });
  const end2 = await p.evaluate(() => ({
    pp: Park3D.player.position.x.toFixed(1) + ',' + Park3D.player.position.z.toFixed(1),
    wheelSpeed: Park3D.wheelSpeed,
    jump: ParkWheel.jump, jumpCd: ParkWheel.jumpCd, pOff: ParkWheel.pOff,
  }));
  console.log('R5 cleanup:', JSON.stringify(end2));
  console.log('pageErr:', errs.length, errs.slice(0, 3));
  await b.close();
  const pass = errs.length === 0 && end2.pp === '-16.0,-2.0' && end2.wheelSpeed === 0.25
    && end2.jump === 0 && end2.jumpCd === 0 && Math.abs(end2.pOff) < 0.01;
  console.log(pass ? 'PASS: wheel26' : 'FAIL: wheel26');
  process.exit(pass ? 0 : 1);
})();
