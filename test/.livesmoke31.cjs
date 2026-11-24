/** 31-5 live smoke：GitHub Pages 上驗證 touchDir 修復 + lr-hint CSS 已部署 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('https://unclejerry20050727-code.github.io/cute-kingdom/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => typeof Park3D !== 'undefined', null, { timeout: 15000 });
  const r = await p.evaluate(() => {
    const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(x => x.cssText); } catch { return []; } });
    return {
      park3dTouchDir: Park3D.update.toString().includes('touchDir'),
      catchTouchDir: ParkCatch.update.toString().includes('touchDir'),
      wheelTouchDir: ParkWheel.update.toString().includes('touchDir'),
      noOldBug: !ParkCatch.update.toString().includes('park.dpadDir)') && !ParkWheel.update.toString().includes('park.dpadDir)'),
      lrHintCss: css.some(t => t.includes('dpad-glow')),
      promptBottom176: css.some(t => t.includes('.park-prompt') && t.includes('176px')),
      parkCanvasTouchAction: css.some(t => t.includes('#park-canvas') && t.includes('touch-action: none')),
    };
  });
  console.log('LIVE31:', JSON.stringify(r), 'pageErr:', errs.length, errs.slice(0, 2));
  await b.close();
  const pass = r.park3dTouchDir && r.catchTouchDir && r.wheelTouchDir && r.noOldBug && r.lrHintCss && r.promptBottom176 && r.parkCanvasTouchAction && errs.length === 0;
  console.log(pass ? 'PASS: livesmoke31' : 'FAIL: livesmoke31');
  process.exit(pass ? 0 : 1);
})();
