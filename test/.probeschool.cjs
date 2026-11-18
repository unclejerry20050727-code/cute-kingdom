/* probe：學校卡片點擊追蹤 */
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
    enterSchool();
    /* 直接進選課（跳教學） */
    Game.school.visited = true;
    $('#school-tut').classList.add('hidden');
    $('#school-big').classList.remove('hidden');
    $('#school-courses').classList.remove('hidden');
    $('#school-foot').classList.remove('hidden');
    updateSchoolFoot();
  });
  const out = await p.evaluate(() => {
    const r = {};
    /* 包一層 toggleSchoolCourse 追蹤 */
    let calls = [];
    const orig = toggleSchoolCourse;
    window.toggleSchoolCourse = (id) => { calls.push(id); return orig(id); };
    r.hasWindowFn = typeof window.toggleSchoolCourse === 'function';

    const card = document.querySelector('.school-course[data-id="coffee"]');
    r.cardExists = !!card;
    r.cardVisible = card && card.offsetParent !== null;
    r.cardRect = card ? { x: Math.round(card.getBoundingClientRect().x), y: Math.round(card.getBoundingClientRect().y), w: Math.round(card.getBoundingClientRect().width) } : null;
    /* 點卡片中心坐標的 elementFromPoint */
    if (card) {
      const rc = card.getBoundingClientRect();
      const el = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2);
      r.hitTest = el ? (el.id || el.className || el.tagName) : null;
    }
    /* .click() 方式 */
    card.click();
    r.afterDotClick = { calls, n: document.querySelectorAll('.school-course.on').length, sel: Game.school.selected };
    /* 再用 bubbles MouseEvent */
    const card2 = document.querySelector('.school-course[data-id="sport"]');
    const rc2 = card2.getBoundingClientRect();
    card2.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rc2.x + 5, clientY: rc2.y + 5 }));
    r.afterBubble = { calls, n: document.querySelectorAll('.school-course.on').length, sel: Game.school.selected };
    /* 監聽器數量偵測：#school-courses 上是否有 click listener（getEventListeners 只在 console；改用 dispatch 觀察） */
    return r;
  });
  console.log(JSON.stringify(out, null, 1));
  console.log('pageErr:', errs.length, JSON.stringify(errs));
  await b.close();
})();
