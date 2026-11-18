const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8742/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#cover-enter', { timeout: 30000 });
  const r = await p.evaluate(() => {
    Game.playerCfg = defaultConfig('female');
    beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
    setSub('map');
    const base = speedMul();
    Game.school.selected = ['sport'];
    const withSport = speedMul();
    /* 實測：地圖 WASD 走 1 秒的位移 */
    const y0 = Game.mapP.y;
    Game.keys.add('down');
    for (let i = 0; i < 60; i++) updateGame(1 / 60);
    Game.keys.delete('down');
    const moved = Game.mapP.y - y0;
    Game.school.selected = [];
    return { base, withSport, moved };
  });
  const ok = r.base === 1 && r.withSport === 1.25 && r.moved > 290 && r.moved < 300 && errs.length === 0;
  console.log(JSON.stringify(r), 'pageErr:', errs.length, ok ? 'PASS: 29-1 quick' : 'FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
