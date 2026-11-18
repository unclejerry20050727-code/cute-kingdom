/* 28-2/28-3：學校截圖（地圖建築/教學/選課/課表） */
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

  /* 1：地圖（學校建築＋脈衝圈） */
  await p.screenshot({ path: '/tmp/s28-02-school-map.png' });
  console.log('map saved');

  /* 2：進校→教學 */
  await p.evaluate(() => {
    const cx = SC.x * Game.ws + Game.offX, cy = SC.y * Game.ws + Game.offY;
    Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
  });
  await p.waitForTimeout(700);
  await p.screenshot({ path: '/tmp/s28-03-school-tut.png' });
  console.log('tut saved, text:', await p.evaluate(() => document.querySelector('#school-tut-text').textContent));

  /* 3：選課畫面（選好 4 門） */
  await p.evaluate(() => {
    for (let i = 0; i < 4; i++) document.querySelector('#school-tut').click();
    for (const id of ['furniture', 'cooking', 'fishing', 'flower']) {
      document.querySelector(`.school-course[data-id="${id}"]`).click();
    }
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/s28-04-school-select.png' });
  console.log('select saved');

  /* 4：確認後課表 */
  await p.evaluate(() => document.querySelector('#school-confirm').click());
  await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/s28-05-school-schedule.png' });
  console.log('schedule saved, count:', await p.evaluate(() => document.querySelector('#school-count').textContent));

  console.log('pageErr:', errs.length, JSON.stringify(errs));
  await b.close();
})();
