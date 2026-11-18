/* 28-2/28-3：學校測試（地圖點擊進校/第一次教學4段→大字選課/8課程/選4上限/確認存檔/重進無教學/換課） */
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

  /* R1：地圖上有學校脈衝點（SC 位置）+ 點擊脈衝點進校 */
  const r1 = await p.evaluate(() => {
    const cx = SC.x * Game.ws + Game.offX, cy = SC.y * Game.ws + Game.offY;
    Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
    return { sub: Game.sub, screen: !document.querySelector('#screen-school').classList.contains('hidden') };
  });
  console.log('R1 mapClick:', JSON.stringify(r1));

  /* R2：第一次進校→教學（小宥4段），逐段點擊 */
  const r2 = [];
  const tutVisible0 = await p.evaluate(() => !document.querySelector('#school-tut').classList.contains('hidden'));
  for (let i = 0; i < 4; i++) {
    const t = await p.evaluate(() => {
      document.querySelector('#school-tut').click();
      return document.querySelector('#school-tut').classList.contains('hidden')
        ? null
        : document.querySelector('#school-tut-text').textContent;
    });
    r2.push(t);
  }
  const r2out = await p.evaluate(() => ({
    tutVis0: null,
    big: document.querySelector('#school-big').textContent,
    bigVis: !document.querySelector('#school-big').classList.contains('hidden'),
    courses: document.querySelectorAll('.school-course').length,
    coursesVis: !document.querySelector('#school-courses').classList.contains('hidden'),
    names: [...document.querySelectorAll('.school-course-name')].map(e => e.textContent),
    count: document.querySelector('#school-count').textContent,
    confirmDisabled: document.querySelector('#school-confirm').disabled,
  }));
  console.log('R2 tutorial:', JSON.stringify({ tutVisible0, lines: r2, ...r2out }));

  /* R3：選 4 堂（第 5 堂被擋） */
  const r3 = await p.evaluate(() => {
    const ids = ['furniture', 'cooking', 'fishing', 'flower', 'coffee'];
    for (const id of ids) {
      document.querySelector(`.school-course[data-id="${id}"]`).click();
    }
    const on = [...document.querySelectorAll('.school-course.on')].map(e => e.dataset.id);
    return { on, count: document.querySelector('#school-count').textContent, disabled: document.querySelector('#school-confirm').disabled };
  });
  console.log('R3 select4:', JSON.stringify(r3));

  /* R4：確認→visited/confirmed/課表、存檔帶 school */
  const r4 = await p.evaluate(() => {
    document.querySelector('#school-confirm').click();
    const s = fullSave('done');
    return {
      count: document.querySelector('#school-count').textContent,
      btn: document.querySelector('#school-confirm').textContent,
      school: { visited: Game.school.visited, confirmed: Game.school.confirmed, selected: Game.school.selected },
      saveHasSchool: !!(s.school && s.school.selected && s.school.selected.length === 4),
    };
  });
  console.log('R4 confirm:', JSON.stringify(r4));

  /* R5：離開→地圖；重進→無教學、4 門已選、按鈕=換課 */
  const r5 = await p.evaluate(() => {
    document.querySelector('#school-x').click();
    const sub = Game.sub;
    enterSchool();
    return {
      sub,
      tutHidden: document.querySelector('#school-tut').classList.contains('hidden'),
      onCount: document.querySelectorAll('.school-course.on').length,
      btn: document.querySelector('#school-confirm').textContent,
      count: document.querySelector('#school-count').textContent,
    };
  });
  console.log('R5 reenter:', JSON.stringify(r5));

  /* R6：換課→取消 1 門（3 門、按鈕=確認！）再選回 4 門 */
  const r6 = await p.evaluate(() => {
    document.querySelector('#school-confirm').click(); /* 換課 */
    const afterChange = document.querySelector('#school-confirm').textContent;
    document.querySelector('.school-course[data-id="cooking"]').click(); /* 取消烹飪課（已選） */
    const afterUnsel = {
      n: document.querySelectorAll('.school-course.on').length,
      btn: document.querySelector('#school-confirm').textContent,
      disabled: document.querySelector('#school-confirm').disabled,
      sel: Game.school.selected,
    };
    document.querySelector('.school-course[data-id="sport"]').click(); /* 選體育課（未選） */
    const afterResel = {
      n: document.querySelectorAll('.school-course.on').length,
      btn: document.querySelector('#school-confirm').textContent,
      sel: Game.school.selected,
    };
    document.querySelector('#school-confirm').click(); /* 再確認 */
    return { afterChange, afterUnsel, afterResel, confirmed: Game.school.confirmed, selected: Game.school.selected };
  });
  console.log('R6 changeClass:', JSON.stringify(r6));

  const pass = r1.sub === 'school' && r1.screen === true
    && tutVisible0 === true
    && r2.slice(0, 3).every(t => t && t.length > 0) && r2[3] === null
    && r2out.bigVis && r2out.big === '你想要選哪一堂課上？' && r2out.courses === 8
    && r2out.names.length === 8 && r2out.confirmDisabled === true
    && r3.on.length === 4 && r3.disabled === false
    && r4.school.visited === true && r4.school.confirmed === true
    && r4.saveHasSchool === true && r4.btn === '換課'
    && r5.sub === 'map' && r5.tutHidden === true && r5.onCount === 4 && r5.btn === '換課'
    && r6.afterChange === '確認！' && r6.afterUnsel.n === 3 && r6.afterUnsel.disabled === true
    && !r6.afterUnsel.sel.includes('cooking')
    && r6.afterResel.n === 4 && r6.afterResel.btn === '確認！'
    && r6.afterResel.sel.includes('sport') && !r6.afterResel.sel.includes('cooking')
    && r6.confirmed === true && r6.selected.length === 4
    && errs.length === 0;
  console.log('pageErr:', errs.length, JSON.stringify(errs));
  console.log(pass ? 'PASS: school28' : 'FAIL: school28');
  await b.close();
  process.exit(pass ? 0 : 1);
})();
