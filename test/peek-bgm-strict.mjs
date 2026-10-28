/* ══════════ BGM 嚴苛情境測試 ══════════
 * 用法：node test/peek-bgm-strict.mjs
 *   LAUNCH_ARGS 可用來模擬真實 Chrome 政策，例如：
 *   LAUNCH_ARGS="--autoplay-policy=document-user-activation" node test/peek-bgm-strict.mjs
 *
 * A) 非信任點擊（evaluate click，無 user activation）
 * B) 信任點擊進入 → 換成 0.4s 短音檔 → 連續觸發 ended handler 的「無 gesture play()」
 */
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://127.0.0.1:8137/index.html';
const LAUNCH = (process.env.LAUNCH_ARGS || '').split(' ').filter(Boolean);
console.log('chromium args:', JSON.stringify(LAUNCH));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: LAUNCH,
  /* 此 Chromium build 中 --disable-field-trial-config 與 --autoplay-policy 會衝突 crash */
  ignoreDefaultArgs: ['--disable-field-trial-config'],
});

const makeProbe = async (page) => {
  const consoleMsgs = [], pageErrors = [];
  page.on('console', m => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.addInitScript(() => {
    window.__playLog = [];
    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      const src = this.src;
      const p = origPlay.apply(this, args);
      Promise.resolve(p)
        .then(() => window.__playLog.push({ ok: true, src: src.split('/').pop(), t: Math.round(performance.now()) }))
        .catch(e => window.__playLog.push({ ok: false, name: e && e.name, msg: e && e.message, src: src.split('/').pop(), t: Math.round(performance.now()) }));
      return p;
    };
  });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const state = () => page.evaluate(() => {
    const el = AudioSys.bgmEl;
    return el ? { paused: el.paused, currentTime: +el.currentTime.toFixed(2), src: (el.src || '').split('/').pop(), rs: el.readyState } : null;
  });
  return { consoleMsgs, pageErrors, state, sleep };
};

/* ── A) 非信任點擊（無 user activation） ── */
{
  const page = await (await browser.newContext()).newPage();
  const { state, sleep } = await makeProbe(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.getElementById('cover-enter').click());
  await sleep(2500);
  const playLog = await page.evaluate(() => window.__playLog);
  const s = await state();
  console.log('\nA) 非信任點擊（無 user activation）:');
  console.log('   play():', JSON.stringify(playLog));
  console.log('   el:', JSON.stringify(s));
  await page.close();
}

/* ── B) 信任點擊進入 → 短音檔連觸發 ended（無 gesture play） ── */
{
  const page = await (await browser.newContext()).newPage();
  const { state, sleep } = await makeProbe(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.click('#cover-enter');
  await sleep(2000);
  const s1 = await state();
  console.log('\nB) 信任點擊進入後:', JSON.stringify(s1));
  /* 全部換成短音檔：ended 會連續觸發，每次都走「無 gesture play()」 */
  await page.evaluate(() => {
    BGM_TRACKS[0] = BGM_TRACKS[1] = BGM_TRACKS[2] = 'test/short.mp3';
    AudioSys.bgmEl.src = 'test/short.mp3';
    AudioSys.bgmEl.play().catch(() => {});
  });
  await sleep(9000);
  const playLog = await page.evaluate(() => window.__playLog);
  const fails = playLog.filter(p => !p.ok);
  const s2 = await state();
  console.log('   9 秒後 el:', JSON.stringify(s2));
  console.log('   play() 次數:', playLog.length, '失敗:', fails.length);
  if (fails.length) console.log('   失敗詳情:', JSON.stringify(fails.slice(0, 3), null, 1));
  await page.close();
}

await browser.close();
process.exit(0);
