/** 34-8 live smoke：GitHub Pages 上驗證釣魚修正（魚群≤3/hover 誘咬/耐心換魚/reel dash/caught→ready/主角手/字型 v25）已部署 */
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
    const uf = updateFish.toString(), ra = releaseCast.toString(), fa = fishAction.toString(), ds = drawFisher.toString(), us = updateFishSchool.toString(), ini = initFishSchool.toString(), rc = recast.toString();
    return {
      hoverLogic: uf.includes('hover') && uf.includes('patienceAt'),           /* 34-2 */
      hoverGuard: uf.includes("st === 'in'"),                                   /* 34-2b：魚影到位才猶豫 */
      leaveSwap: uf.includes('leave = true') && uf.includes('rollWaitFish'),    /* 34-2：耐心換魚 */
      jigBite: ra.includes('hover') && ra.includes("'bite'"),                   /* 34-2：輕拉→咬 */
      scareNoSwap: ra.includes('scatterSchool'),                                /* 34-2：嚇跑不換魚 */
      dashNoGain: fa.includes('dashT > 0'),                                     /* 34-3：dash 按壓無效 */
      drainTune: uf.includes('8 + 3 * Fish.size') && uf.includes('6 + 2 * Fish.size'), /* 34-3 */
      caughtReady: uf.includes("Fish.state = 'ready'"),                         /* 34-4 */
      recastList: rc.includes("'wait'") && rc.includes("'bite'") && rc.includes("'reel'"), /* 34-4 */
      schoolCap: us.includes('nearN < 3') && us.includes('170'),                /* 34-1 */
      orbit: ini.includes('orbSp') && us.includes('f.orb'),                     /* 34-1：個別軌道 */
      hand: ds.includes('skinColor') && ds.includes('resolveConfig'),           /* 34-5 */
      fontV25: css.some(t => t.includes('rhr-500.woff2') && t.includes('v=25')), /* 34-7 */
    };
  });
  console.log('LIVE34:', JSON.stringify(r), 'pageErr:', errs.length, errs.slice(0, 2));
  await b.close();
  const pass = Object.values(r).every(Boolean) && errs.length === 0;
  console.log(pass ? 'PASS: livesmoke34' : 'FAIL: livesmoke34');
  process.exit(pass ? 0 : 1);
})();
