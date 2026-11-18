/* probe2：完整重現 school28 R1-R6 序列，逐步檢查卡片點擊 */
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

  const step = (label, fn) => p.evaluate(fn).then(r => console.log(label, JSON.stringify(r)));

  /* R1 進校 */
  await step('R1 ', () => {
    const cx = SC.x * Game.ws + Game.offX, cy = SC.y * Game.ws + Game.offY;
    Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
    return { sub: Game.sub };
  });
  /* R2 教學 4 段 */
  for (let i = 0; i < 4; i++) await p.evaluate(() => document.querySelector('#school-tut').click());
  /* R3 選 4 */
  await step('R3 ', () => {
    for (const id of ['furniture', 'cooking', 'fishing', 'flower']) document.querySelector(`.school-course[data-id="${id}"]`).click();
    return { n: document.querySelectorAll('.school-course.on').length };
  });
  /* 安裝追蹤 */
  await p.evaluate(() => {
    window.__calls = [];
    const orig = toggleSchoolCourse;
    window.toggleSchoolCourse = (id) => { window.__calls.push(id); return orig(id); };
    window.__clicks = [];
    document.querySelector('#school-courses').addEventListener('click', (e) => {
      window.__clicks.push({ target: e.target.className, closest: !!(e.target.closest && e.target.closest('.school-course')) });
    }, true);
  });
  /* R4 確認 */
  await step('R4 ', () => { document.querySelector('#school-confirm').click(); return { confirmed: Game.school.confirmed }; });
  /* R4b：確認後直接點咖啡（不離開） */
  await step('R4b', () => {
    const c0 = window.__calls.length;
    document.querySelector('.school-course[data-id="coffee"]').click();
    return { deltaCalls: window.__calls.length - c0, deltaClicks: window.__clicks.length, n: document.querySelectorAll('.school-course.on').length };
  });
  /* R5 離開→重進 */
  await step('R5 ', () => {
    document.querySelector('#school-x').click();
    const sub = Game.sub;
    enterSchool();
    return { sub, coursesHTML: document.querySelector('#school-courses').children.length };
  });
  /* R5b：重進後點咖啡（未換課） */
  await step('R5b', () => {
    const c0 = window.__calls.length;
    document.querySelector('.school-course[data-id="coffee"]').click();
    return { deltaCalls: window.__calls.length - c0, deltaClicks: window.__clicks.length, n: document.querySelectorAll('.school-course.on').length, sel: Game.school.selected };
  });
  /* R6 換課→點咖啡 */
  await step('R6 ', () => {
    document.querySelector('#school-confirm').click();
    const c0 = window.__calls.length;
    document.querySelector('.school-course[data-id="coffee"]').click();
    return { btn: document.querySelector('#school-confirm').textContent, deltaCalls: window.__calls.length - c0, deltaClicks: window.__clicks.length, n: document.querySelectorAll('.school-course.on').length, sel: Game.school.selected, calls: window.__calls };
  });
  console.log('pageErr:', errs.length, JSON.stringify(errs));
  await b.close();
})();
