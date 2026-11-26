/** 33-8 live smoke：GitHub Pages 上驗證釣魚手感再進化（不換竿/逗引/搏鬥/魚影/主角外觀/字型 v24）已部署 */
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
    return {
      rollWaitFish: typeof rollWaitFish === 'function' && rollWaitFish.toString().includes('shade'),
      recastFn: typeof recast === 'function' && recast.toString().includes('ready'),
      landFish: typeof landFish === 'function' && landFish.toString().includes('2.0'),
      reelState: updateFish.toString().includes("'reel'") && fishAction.toString().includes('reel'),
      rewait: updateFish.toString().includes('rollWaitFish'),
      rodBase370: FISH_ROD_BASE.x === 370,
      playerFisher: drawFisher.toString().includes('drawCharacter') && drawFisher.toString().includes('playerCfg'),
      recastBtn: !!document.querySelector('#fish-recast'),
      setFishUIRecast: setFishUI.toString().includes('fish-recast'),
      cssRecast: css.some(t => t.includes('.fish-recast')),
      fontV24: css.some(t => t.includes('rhr-500.woff2') && t.includes('v=24')),
    };
  });
  console.log('LIVE33:', JSON.stringify(r), 'pageErr:', errs.length, errs.slice(0, 2));
  await b.close();
  const pass = Object.values(r).every(Boolean) && errs.length === 0;
  console.log(pass ? 'PASS: livesmoke33' : 'FAIL: livesmoke33');
  process.exit(pass ? 0 : 1);
})();
