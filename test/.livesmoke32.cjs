/** 32-8 live smoke：GitHub Pages 上驗證釣魚豐富化（分區/蓄力拋竿/魚群AI/新音效/字型 v23）已部署 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('https://unclejerry20050727-code.github.io/cute-kingdom/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => typeof FISH_ZONES !== 'undefined', null, { timeout: 15000 });
  const r = await p.evaluate(() => {
    const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(x => x.cssText); } catch { return []; } });
    const school = initFishSchool();
    return {
      zones3: FISH_ZONES.length === 3 && FISH_ZONES[2].id === 'far' && FISH_ZONES[2].x === 770,
      tableWin: FISH_TABLE.puffer.win === 0.5 && FISH_TABLE.minnow.win === 1.1,
      releaseCast: typeof releaseCast === 'function' && releaseCast.toString().includes('castFrom'),
      school12: school.length === 12 && school.some(f => f.kind === 'turtle') && school.some(f => f.kind === 'crab'),
      rodFns: typeof rodAngle === 'function' && typeof fishBobPos === 'function' && typeof drawFishChargeUI === 'function',
      splashSfx: sfx.toString().includes('splash'),
      fontV23: css.some(t => t.includes('rhr-500.woff2') && t.includes('v=23')),
      fishBtnTouchAction: css.some(t => t.includes('.fish-btn') && t.includes('touch-action: none')),
    };
  });
  console.log('LIVE32:', JSON.stringify(r), 'pageErr:', errs.length, errs.slice(0, 2));
  await b.close();
  const pass = Object.values(r).every(Boolean) && errs.length === 0;
  console.log(pass ? 'PASS: livesmoke32' : 'FAIL: livesmoke32');
  process.exit(pass ? 0 : 1);
})();
