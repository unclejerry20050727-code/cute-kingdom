/* 27-1：海盜船幾何截圖（全景＋船尾第一人稱 θ=0/θ=90°） */
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
  await p.waitForFunction(() => window.Park3D && Park3D.running && Park3D.pirate, null, { timeout: 60000 });
  await p.waitForTimeout(2500);

  /* 全景 */
  await p.screenshot({ path: '/tmp/s27-01-overview.png' });
  const info = await p.evaluate(() => {
    const P = Park3D;
    return {
      station: P.stations.find(s => s.kind === 'ship') ? 'ok' : 'MISSING',
      pivot: P.pirate.pivot,
      shipPos: [P.pirate.ship.position.x, P.pirate.ship.position.y, P.pirate.ship.position.z].map(v => v.toFixed(1)),
      children: P.pirate.ship.children.length,
    };
  });
  console.log('info:', JSON.stringify(info));

  /* 第一人稱 θ=0（船尾看船頭；攝影機＝坐高 local(-3.3, 2.0)） */
  await p.evaluate(() => {
    const cam = Park3D.camera;
    cam.position.set(14.2, 13.5, 9.5);
    cam.up.set(0, 1, 0);
    cam.lookAt(24.2, 13.5, 9.5);
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/s27-02-fpv0.png' });

  /* 第一人稱 θ=90°（船頭朝上） */
  await p.evaluate(() => {
    const ship = Park3D.pirate.ship;
    ship.rotation.z = Math.PI / 2;
    const cam = Park3D.camera;
    cam.position.set(15.5, 8.2, 9.5);
    cam.up.set(-1, 0, 0);
    cam.lookAt(15.5, 18.2, 9.5);
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/s27-03-fpv90.png' });
  console.log('pageErr:', errs.length, JSON.stringify(errs.slice(0, 3)));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
