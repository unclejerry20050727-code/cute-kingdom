/* 第三十輪 live smoke：確認 GitHub Pages 已部署 30-1~30-6（音符/爐子/咖啡機/釣魚/小貓/字型 v22）且 0 pageErr */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await p.goto('https://unclejerry20050727-code.github.io/cute-kingdom/', { waitUntil: 'load' });
  await p.waitForFunction(() => typeof beginGame === 'function' && typeof defaultConfig === 'function', null, { timeout: 60000 });
  const info = await p.evaluate(() => {
    const r = {
      danceNotes: typeof danceNotes !== 'undefined',
      drawStove: typeof drawStove,
      drawCoffeeMaker: typeof drawCoffeeMaker,
      drawCat: typeof drawCat,
      startFishing: typeof startFishing,
      POND: typeof POND !== 'undefined' && POND.x === 770,
      stoveCard: BUILD_ITEMS.stove && BUILD_ITEMS.stove.needsCourse === 'cooking',
      coffeeCard: BUILD_ITEMS.coffee && BUILD_ITEMS.coffee.needsCourse === 'coffee',
      fontV22: [...document.querySelectorAll('style,link')].length >= 0, // 下方用 css 驗證
    };
    r.fontV22 = [...document.styleSheets].some(ss => { try { return [...ss.cssRules].some(rr => (rr.cssText || '').includes('rhr-500.woff2?v=22')); } catch { return false; } });
    return r;
  });
  console.log('LIVE30:', JSON.stringify(info), 'pageErr:', errs.length, errs.slice(0, 3));
  await b.close();
  process.exit(errs.length === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); process.exit(2); });
