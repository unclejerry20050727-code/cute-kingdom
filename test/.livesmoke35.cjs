/** 35-6 live smoke：GitHub Pages 上驗證烹飪課（狀態機/3食譜/兩停火/加錢存檔/HTML/CSS/字型 v26）已部署＋真實行為 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('https://unclejerry20050727-code.github.io/cute-kingdom/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => typeof COOK_RECIPES !== 'undefined', null, { timeout: 15000 });
  /* 行為測試：擺爐子→點爐子→選食譜→兩停火→+20元 */
  const behavior = await p.evaluate(async () => {
    Game.playerCfg = defaultConfig('female');
    beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
    setSub('free');
    Game.school.selected = ['cooking'];
    Game.furniture.push({ id: 'stove', tx: 6, ty: 4, rot: 0 });
    rebuildBlocked();
    const [nx, ny] = tileScreen(6.5, 4.5);
    Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: nx * Game.ws + Game.offX, clientY: ny * Game.ws + Game.offY, bubbles: true }));
    const entered = Game.sub === 'cook' && Cook && Cook.state === 'menu';
    cookPick('rice');
    const money0 = Game.money;
    Cook.mark = (Cook.zone.z0 + Cook.zone.z1) / 2; cookAction();
    Cook.mark = (Cook.zone.z0 + Cook.zone.z1) / 2; cookAction();
    const done = Cook.state === 'result' && Game.money === money0 + 20 && Game.cook.n === 1;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const exited = Game.sub === 'free' && !Cook;
    return { entered, done, exited, save: !!(fullSave(Game.stage).cook) };
  });
  const r = await p.evaluate(() => {
    const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(x => x.cssText); } catch { return []; } });
    const sc = startCooking.toString(), ca = cookAction.toString(), uc = updateCook.toString(), rc = renderCook.toString();
    return {
      gate: sc.includes("hasCourse('cooking')") && sc.includes("setSub('cook')"), /* 35-1 */
      recipes: COOK_RECIPES.length === 3 && COOK_RECIPES.find(x => x.id === 'grill').coins === 55, /* 35-1 */
      twoStop: ca.includes('Cook.round += 1') && ca.includes('Game.cook.n += 1'), /* 35-1 */
      autoMenu: uc.includes('result') && uc.includes('1.6'), /* 35-1 */
      kitchen: rc.includes('drawCharacter') && rc.includes('今日菜單'), /* 35-2 */
      html: !!document.getElementById('cook-act') && document.querySelectorAll('#cook-recipes .cook-r').length === 3, /* 35-3 */
      css: css.some(t => t.includes('#screen-cook')) && css.some(t => t.includes('.cook-r')), /* 35-3 */
      fontV26: css.some(t => t.includes('rhr-700.woff2') && t.includes('v=26')), /* 35-5 */
    };
  });
  console.log('LIVE35 behavior:', JSON.stringify(behavior), 'src:', JSON.stringify(r), 'pageErr:', errs.length, errs.slice(0, 2));
  await b.close();
  const pass = behavior.entered && behavior.done && behavior.exited && behavior.save && Object.values(r).every(Boolean) && errs.length === 0;
  console.log(pass ? 'PASS: livesmoke35' : 'FAIL: livesmoke35');
  process.exit(pass ? 0 : 1);
})();
