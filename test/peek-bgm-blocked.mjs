/* ══════════ BGM 修復驗證：模擬 Chrome 擋掉 play()（NotAllowedError）══════════
 * 用法：node test/peek-bgm-blocked.mjs
 *
 * 原理：headless 無法開嚴格 autoplay 政策，所以直接 hook HTMLMediaElement.play，
 * 前 N 次呼叫強制 reject NotAllowedError —— 等同模擬「真實 Chrome 把 BGM 擋掉」。
 *
 * 情境 1（互動重試）：點進遊戲 → 首次 play 被擋 → 出現提示 toast →
 *                     點畫面任意處 → BGM 應自動恢復（RMS 有聲波）
 * 情境 2（音樂開關恢復）：首次 play 被擋 → 不點畫面 → 連按靜音鈕（mute→unmute）→
 *                     BGM 應恢復
 */
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://127.0.0.1:8137/index.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

function probe(page) {
  return {
    playLog: () => page.evaluate(() => window.__playLog),
    warnLog: () => page.evaluate(() => window.__warnLog),
    state: () => page.evaluate(() => {
      const el = AudioSys.bgmEl;
      return el
        ? { paused: el.paused, t: +el.currentTime.toFixed(2), src: (el.src || '').split('/').pop(), rs: el.readyState,
            muted: AudioSys.muted, gain: AudioSys._master ? +AudioSys._master.gain.value.toFixed(3) : null }
        : null;
    }),
    toast: () => page.evaluate(() => {
      const t = document.getElementById('toast');
      return { visible: !t.classList.contains('hidden'), text: t.textContent };
    }),
    rms: async () => page.evaluate(async () => {
      if (!AudioSys.ctx || !AudioSys._master) return null;
      let an = window.__an;
      if (!an) { an = AudioSys.ctx.createAnalyser(); an.fftSize = 2048; AudioSys._master.connect(an); window.__an = an; }
      /* analyser 剛接上時 buffer 是空的，等幾個渲染 cycle 再量 */
      await new Promise(r => setTimeout(r, 400));
      const buf = new Float32Array(an.fftSize);
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      return +Math.sqrt(s / buf.length).toFixed(4);
    }),
  };
}

async function newPage(blockCount) {
  const page = await (await browser.newContext()).newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.addInitScript((N) => {
    window.__playLog = [];
    window.__warnLog = [];
    const origWarn = console.warn;
    console.warn = (...a) => { window.__warnLog.push(a.map(String).join(' ')); origWarn(...a); };
    let left = N;
    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      const src = (this.src || '').split('/').pop();
      if (left > 0) {
        left--;
        window.__playLog.push({ ok: false, sim: true, src });
        return Promise.reject(new DOMException('simulated block', 'NotAllowedError'));
      }
      const p = origPlay.apply(this, args);
      Promise.resolve(p)
        .then(() => window.__playLog.push({ ok: true, src }))
        .catch(e => window.__playLog.push({ ok: false, real: true, name: e && e.name, src }));
      return p;
    };
  }, blockCount);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  return { page, pageErrors, p: probe(page) };
}

/* ── 情境 1：點畫面重試 ── */
{
  const { page, pageErrors, p } = await newPage(1);
  await page.click('#cover-enter');           /* 真 gesture；play 會被模擬擋掉 */
  await sleep(800);
  const s1 = await p.state();
  const toast1 = await p.toast();
  console.log('情境1) 首次 play 被擋後:');
  console.log('   el:', JSON.stringify(s1));
  console.log('   toast:', JSON.stringify(toast1));
  console.log('   console.warn:', JSON.stringify(await p.warnLog()));

  await page.mouse.click(400, 400);           /* 下一次互動 → 應自動恢復 */
  await sleep(2500);
  const s2 = await p.state();
  const rms = await p.rms();
  console.log('   → 點畫面 2.5s 後: el:', JSON.stringify(s2), 'RMS:', rms);
  console.log('   play 記錄:', JSON.stringify(await p.playLog()));
  const pass1 = !s2.paused && s2.t > 0.5 && rms > 0.005 && toast1.visible && (await p.playLog()).filter(x => x.ok).length >= 1;
  console.log('   結果:', pass1 ? '✅ PASS' : '❌ FAIL', '| pageerrors:', JSON.stringify(pageErrors));
  await page.close();
}

/* ── 情境 2：靜音鈕 mute→unmute 恢復 ── */
{
  const { page, pageErrors, p } = await newPage(1);
  await page.click('#cover-enter');
  await sleep(800);
  const s1 = await p.state();
  console.log('\n情境2) 首次 play 被擋後:', JSON.stringify(s1));
  /* 用 evaluate 直接調 toggleMute（繞過 pointerdown 重試，專測開關本身） */
  await page.evaluate(() => toggleMute());    /* mute */
  await sleep(300);
  const sm = await p.state();
  await page.evaluate(() => toggleMute());    /* unmute → 應重播 BGM */
  await sleep(2500);
  const s2 = await p.state();
  const rms = await p.rms();
  console.log('   mute 中:', JSON.stringify(sm));
  console.log('   → unmute 2.5s 後: el:', JSON.stringify(s2), 'RMS:', rms);
  const pass2 = !s2.paused && s2.t > 0.5 && rms > 0.005 && sm.gain < 0.01 && s2.gain > 0.9;
  console.log('   結果:', pass2 ? '✅ PASS' : '❌ FAIL', '| pageerrors:', JSON.stringify(pageErrors));
  await page.close();
}

await browser.close();
process.exit(0);
