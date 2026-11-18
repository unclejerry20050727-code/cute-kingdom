const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('http://127.0.0.1:8742/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#cover-enter', { timeout: 30000 });
  await p.evaluate(() => {
    Game.playerCfg = defaultConfig('female');
    beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
    setSub('map');
    Game.clock = { month: 1, day: 1, hour: 9, min: 25 };
  });
  await p.waitForTimeout(600);
  const box = await p.evaluate(() => {
    const el = document.querySelector('#clock-badge');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, text: el.textContent };
  });
  console.log('clockBadge:', JSON.stringify(box));
  await p.screenshot({ path: '/tmp/s28-01-clock-map.png' });
  await b.close();
})();
