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
  await p.waitForTimeout(1500);
  const fov = await p.evaluate(() => Park3D.camera.fov);
  const cam = await p.evaluate(() => {
    const c = Park3D.camera.position;
    return { x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1) };
  });
  console.log('wide cam:', JSON.stringify({ fov, cam }));
  await p.screenshot({ path: '/tmp/w26-05-wide.png' });

  /* 派一隻鳥俯衝，看鳥在大全景裡的可见性 */
  await p.evaluate(() => {
    const w = ParkWheel;
    const pred = w._predictPlayer(0.9);
    const b2 = w.birds[0];
    const BZ = w.HUB.z + w.BIRD_Z;
    b2.group.position.set(pred.x, pred.y + 5, BZ);
    b2.from = { x: pred.x, y: pred.y + 5 };
    b2.to = { x: pred.x, y: pred.y };
    b2.state = 'dive'; b2.t = 0.9;
  });
  await p.waitForFunction(() => { const b2 = ParkWheel.birds[0]; return b2.state === 'dive' && b2.t < 0.5 && b2.t > 0.2; }, null, { timeout: 10000 });
  await p.screenshot({ path: '/tmp/w26-06-wide-dive.png' });
  console.log('dive shot done');
  console.log('pageErr:', errs.length, errs.slice(0, 3));
  await b.close();
})();
