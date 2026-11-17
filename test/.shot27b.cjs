/* 27-3：星星置入第一人稱視野截圖 */
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
  await p.evaluate(() => {
    Park3D.nearStation = Park3D.stations.find((s) => s.kind === 'ship');
    Park3D.action();
  });
  await p.waitForFunction(() => ParkShip.active, null, { timeout: 60000 });
  /* 固定在 30° 擺角截圖（4 顆星應在視野中：±50/115/90） */
  await p.evaluate(() => { ParkShip.theta = 30 * Math.PI / 180; ParkShip.omega = 0; });
  await p.waitForTimeout(300);
  const info = await p.evaluate(() => ({
    stars: ParkShip.stars.map((s) => [+(s.angle * 180 / Math.PI).toFixed(0), s.mesh.visible,
      [s.mesh.position.x.toFixed(1), s.mesh.position.y.toFixed(1), s.mesh.position.z.toFixed(1)]]),
  }));
  console.log('stars:', JSON.stringify(info));
  await p.screenshot({ path: '/tmp/s27-05-stars.png' });
  /* 全景（凍結 ride、還原鏡頭）確認四星佈局 */
  await p.evaluate(() => {
    ParkShip.active = false;
    const cam = Park3D.camera;
    cam.position.set(0, 19, 34);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 4, -5);
  });
  await p.waitForTimeout(200);
  await p.screenshot({ path: '/tmp/s27-06-stars-overview.png' });
  console.log('pageErr:', errs.length, errs.slice(0, 3));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
