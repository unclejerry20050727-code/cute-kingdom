/* 28-1：時間系統 smoke（1/1 08:00 起、1 秒＝1 遊戲分鐘、左下角 badge、跨時/跨日/跨年無年循環） */
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
    setSub('free');
  });

  /* R1：badge 顯示、起始 1/1 08:00 */
  const r1 = await p.evaluate(() => {
    const el = document.querySelector('#clock-badge');
    return {
      vis: !el.classList.contains('hidden'),
      text: el.textContent,
      clock: { ...Game.clock },
    };
  });
  console.log('R1 start:', JSON.stringify(r1));

  /* R2：真實等待 ~3.4s → 應推進 3 分鐘（容許 ±1 分） */
  await p.waitForTimeout(3400);
  const r2 = await p.evaluate(() => ({
    min: Game.clock.min, hour: Game.clock.hour,
    text: document.querySelector('#clock-badge').textContent,
  }));
  console.log('R2 after3s:', JSON.stringify(r2));

  /* R3：直接調 advanceClockMinute 驗證溢出（23:59→次日 00:00；12/31 23:59→1/1 00:00 無年循環） */
  const r3 = await p.evaluate(() => {
    const out = {};
    Game.clock = { month: 1, day: 2, hour: 23, min: 59 };
    advanceClockMinute();
    out.dayRoll = { ...Game.clock };
    Game.clock = { month: 12, day: 31, hour: 23, min: 59 };
    advanceClockMinute();
    out.yearWrap = { ...Game.clock };
    Game.clock = { month: 2, day: 28, hour: 23, min: 59 };
    advanceClockMinute();
    out.feb = { ...Game.clock };
    Game.clock = { month: 1, day: 1, hour: 8, min: 0 };
    return out;
  });
  console.log('R3 overflow:', JSON.stringify(r3));

  /* R4：存檔帶 clock */
  const r4 = await p.evaluate(() => {
    const s = fullSave('done');
    return { hasClock: !!s.clock, clock: s.clock };
  });
  console.log('R4 save:', JSON.stringify(r4));

  const pass = r1.vis && r1.text === '🕐 1/1 08:00'
    && r1.clock.month === 1 && r1.clock.day === 1 && r1.clock.hour === 8 && r1.clock.min === 0
    && r2.min >= 2 && r2.min <= 4 && r2.hour === 8
    && r3.dayRoll.day === 3 && r3.dayRoll.hour === 0 && r3.dayRoll.min === 0
    && r3.yearWrap.month === 1 && r3.yearWrap.day === 1 && r3.yearWrap.hour === 0
    && r3.feb.month === 3 && r3.feb.day === 1 && r3.feb.hour === 0
    && r4.hasClock && errs.length === 0;
  console.log('pageErr:', errs.length, JSON.stringify(errs));
  console.log(pass ? 'PASS: clock28' : 'FAIL: clock28');
  await b.close();
  process.exit(pass ? 0 : 1);
})();
