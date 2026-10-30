/* ══════════ 第八輪回歸：BGM 純 <audio> 化後，http 與 file:// 兩情境都驗 ══════════
 * 背景：file:// 下 createMediaElementSource 被 CORS 零輸出 → BGM 只在 Safari 有聲。
 *       改成純 <audio> + el.muted 後，兩種開法都要能播、靜音要有效、SFX 不受影響。
 * 用法：node test/peek-bgm-filefix.mjs
 */
import { chromium } from 'playwright';
import http from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.woff2': 'font/woff2',
};
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const fileUrl = 'file://' + path.join(ROOT, 'index.html');

let fail = 0;
function check(label, ok, extra = '') {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail++;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
});

async function runScenario(name, url) {
  console.log(`\n═══════ ${name}：${url} ═══════`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  const warns = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.type() === 'warning') warns.push(m.text());
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  /* SFX 先驗：封面按鍵會 sfx('confirm') — 量 master gain 輸出 */
  await page.click('#cover-enter');
  await page.waitForTimeout(300);
  const sfxOk = await page.evaluate(() => new Promise((res) => {
    const A = AudioSys;
    if (!A.ctx || !A._master) return res('no-ctx');
    sfx('click');
    const an = A.ctx.createAnalyser();
    an.fftSize = 1024;
    A._master.connect(an);
    const d = new Float32Array(an.fftSize);
    let peak = 0;
    const t0 = performance.now();
    (function loop() {
      an.getFloatTimeDomainData(d);
      let s = 0;
      for (let i = 0; i < d.length; i++) s += d[i] * d[i];
      peak = Math.max(peak, Math.sqrt(s / d.length));
      if (performance.now() - t0 < 400) requestAnimationFrame(loop);
      else res(peak);
    })();
  }));
  const sfxPeak = typeof sfxOk === 'number' ? sfxOk : 0;
  check('SFX（Web Audio 震盪器）有聲波', sfxPeak > 0.001, `peak=${sfxPeak.toFixed(4)}（${sfxOk === 'no-ctx' ? 'ctx 未建立' : ''}）`);

  /* BGM：元素要真的在播（file:// 下這代表有聲；舊 bug 是元素在播但 Web Audio 端零輸出） */
  await page.waitForTimeout(2000);
  const g1 = await page.evaluate(() => {
    const el = AudioSys.bgmEl;
    return {
      playing: AudioSys.bgmPlaying,
      src: el ? el.currentSrc.split('/').pop() : null,
      paused: el ? el.paused : null,
      ct: el ? el.currentTime : null,
      volume: el ? el.volume : null,
      muted: el ? el.muted : null,
      ready: el ? el.readyState : null,
      err: el && el.error ? el.error.code : null,
    };
  });
  await page.waitForTimeout(1200);
  const ct2 = await page.evaluate(() => AudioSys.bgmEl.currentTime);
  check('BGM 元素在播（未 paused）', g1.playing === true && g1.paused === false, `src=${g1.src} readyState=${g1.ready} err=${g1.err}`);
  check('BGM 進度在走（file:// 下＝真有聲音）', (ct2 - g1.ct) > 0.8, `${g1.ct.toFixed(2)}s → ${ct2.toFixed(2)}s`);
  check('BGM 音量 0.5、預設未靜音', g1.volume === 0.5 && g1.muted === false, `volume=${g1.volume} muted=${g1.muted}`);
  check('play() 未被拒（無 NotAllowedError warn）', !warns.some(w => /NotAllowedError|被拒絕/.test(w)), warns.filter(w => /NotAllowedError|被拒絕/.test(w)).join(' | ') || 'clean');

  /* 靜音鈕：要真正 silencing BGM（el.muted）+ SFX（master gain） */
  await page.click('#btn-mute');
  await page.waitForTimeout(300);
  const m1 = await page.evaluate(() => ({
    elMuted: AudioSys.bgmEl.muted,
    gain: AudioSys._master.gain.value,
    ls: localStorage.getItem('cute-kingdom-muted'),
  }));
  check('靜音：el.muted=true + master gain≈0 + localStorage=1', m1.elMuted === true && m1.gain < 0.01 && m1.ls === '1', `elMuted=${m1.elMuted} gain=${m1.gain} ls=${m1.ls}`);
  const stillPlaying = await page.evaluate(() => !AudioSys.bgmEl.paused);
  check('靜音期間元素持續播（unmute 不會斷）', stillPlaying);

  await page.click('#btn-mute');
  await page.waitForTimeout(300);
  const m2 = await page.evaluate(() => ({
    elMuted: AudioSys.bgmEl.muted,
    ls: localStorage.getItem('cute-kingdom-muted'),
    paused: AudioSys.bgmEl.paused,
  }));
  check('取消靜音：el.muted=false + localStorage=0', m2.elMuted === false && m2.ls === '0', `elMuted=${m2.elMuted} ls=${m2.ls} paused=${m2.paused}`);

  /* 靜音中重新載入：載入後 BGM 要在首次點擊後開且預設靜音 */
  await page.evaluate(() => localStorage.setItem('cute-kingdom-muted', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.click('#cover-enter');
  await page.waitForTimeout(800);
  const m3 = await page.evaluate(() => ({
    elMuted: AudioSys.bgmEl ? AudioSys.bgmEl.muted : null,
    playing: AudioSys.bgmPlaying,
  }));
  check('靜音記憶載入：BGM 播但 el.muted=true', m3.playing === true && m3.elMuted === true, `playing=${m3.playing} elMuted=${m3.elMuted}`);
  await page.click('#btn-mute'); /* 還原 */

  check('無 pageerror / console error', errors.length === 0, errors.slice(0, 3).join(' | ') || 'clean');
  await page.close();
}

await runScenario('情境 1（http）', `http://127.0.0.1:${PORT}/`);
await runScenario('情境 2（file://，舊 bug 重現環境）', fileUrl);

await browser.close();
server.close();
console.log(fail === 0 ? '\n🎉 全部通過' : `\n💥 ${fail} 項失敗`);
process.exit(fail === 0 ? 0 : 1);
