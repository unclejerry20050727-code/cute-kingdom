/* ══════════ BGM 診斷：模擬真實 Chrome 自動播放政策 ══════════
 * 用法：
 *   python3 -m http.server 8137 &  (專案根目錄)
 *   node test/peek-bgm-diag.mjs [extra chromium args...]
 *
 * 會做的事：
 *   1. addInitScript hook HTMLMediaElement.play()，抓到被 .catch(()=>{}) 吞掉的
 *      NotAllowedError / 其他拒絕原因
 *   2. 真實點擊「點擊進入 ✨」（playwright click = 真 user activation）
 *   3. 監聽 mp3 回應狀態、console、pageerror
 *   4. 把 AnalyserNode 接到 master gain，量 RMS 驗證「真的有聲波輸出」
 *   5. 測試靜音鈕切換前後 gain 與 BGM 狀態
 */
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://127.0.0.1:8137/index.html';
const extraArgs = process.argv.slice(2);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--use-fake-ui-for-media-stream', ...extraArgs],
});
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleMsgs = [];
const pageErrors = [];
const mp3Responses = [];
page.on('console', m => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('response', r => {
  if (/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(r.url())) mp3Responses.push(`${r.status()} ${r.url()}`);
});

await page.addInitScript(() => {
  window.__playLog = [];
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    const src = this.src;
    const p = origPlay.apply(this, args);
    Promise.resolve(p)
      .then(() => window.__playLog.push({ ok: true, src, t: performance.now() }))
      .catch(e => window.__playLog.push({ ok: false, name: e && e.name, msg: e && e.message, src, t: performance.now() }));
    return p;
  };
  window.__audioCtxLog = [];
  const OrigAC = window.AudioContext;
  window.AudioContext = class extends OrigAC {
    constructor(...a) { super(...a); window.__audioCtxLog.push({ created: true, state: this.state, t: performance.now() }); }
    resume() {
      window.__audioCtxLog.push({ resume: true, from: this.state, t: performance.now() });
      return super.resume();
    }
  };
});

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);

/* ── 點擊封面進入（真 user gesture） ── */
await page.click('#cover-enter');

/* 接 analyser 量 master gain 輸出能量 */
const rmsProbe = () => page.evaluate(() => {
  if (!AudioSys.ctx || !AudioSys._master) return { noCtx: true };
  let an = window.__an;
  if (!an) {
    an = AudioSys.ctx.createAnalyser();
    an.fftSize = 2048;
    AudioSys._master.connect(an);
    window.__an = an;
  }
  const buf = new Float32Array(an.fftSize);
  an.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return { rms: Math.sqrt(sum / buf.length), ctxState: AudioSys.ctx.state, masterGain: AudioSys._master.gain.value };
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { playLog: null, bgmEl: null, ctxLog: null, rms: [], mp3Responses: null, consoleMsgs: null, pageErrors: null };

/* 連續採樣 4 秒 */
for (let i = 0; i < 8; i++) {
  await sleep(500);
  results.rms.push(await rmsProbe());
}

results.playLog = await page.evaluate(() => window.__playLog);
results.ctxLog = await page.evaluate(() => window.__audioCtxLog);
results.bgmEl = await page.evaluate(() => {
  const el = AudioSys.bgmEl;
  if (!el) return null;
  return {
    src: el.src, paused: el.paused, readyState: el.readyState, networkState: el.networkState,
    currentTime: el.currentTime, duration: el.duration, volume: el.volume, muted: el.muted,
    error: el.error ? el.error.code : null,
    bgmPlaying: AudioSys.bgmPlaying, sysMuted: AudioSys.muted,
  };
});
results.mp3Responses = mp3Responses;
results.consoleMsgs = consoleMsgs;
results.pageErrors = pageErrors;

console.log('════ 點擊進入後 4 秒 ════');
console.log('play() 結果:', JSON.stringify(results.playLog, null, 2));
console.log('AudioContext log:', JSON.stringify(results.ctxLog));
console.log('BGM element:', JSON.stringify(results.bgmEl, null, 2));
console.log('RMS 採樣 (master gain 輸出):');
for (const r of results.rms) console.log('  ', JSON.stringify(r));
console.log('mp3 回應:', JSON.stringify(results.mp3Responses));
console.log('pageerror:', JSON.stringify(results.pageErrors));
console.log('console:', JSON.stringify(results.consoleMsgs.slice(0, 10)));

/* ── 靜音鈕測試 ── */
const before = await page.evaluate(() => ({ muted: AudioSys.muted, gain: AudioSys._master ? AudioSys._master.gain.value : null }));
await page.click('#btn-mute');
await page.click('#btn-mute');
await sleep(300);
const after = await page.evaluate(() => ({ muted: AudioSys.muted, gain: AudioSys._master ? AudioSys._master.gain.value : null }));
console.log('\n靜音切換: before', JSON.stringify(before), '→ after', JSON.stringify(after));

await browser.close();
process.exit(0);
