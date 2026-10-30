/* ══════════ 深度診斷：mp3-test.html 四層逐一測 RMS + 遊戲 BGM 量測 ══════════
 * 目的：找出為什麼 2️⃣MediaElementSource 與遊戲 BGM 只在 Safari 有聲
 * 用法：node test/peek-mp3-deep.mjs
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

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
});
console.log('chromium version:', browser.version());
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleMsgs = [];
page.on('pageerror', e => consoleMsgs.push('PAGEERROR: ' + e.message));
page.on('console', m => consoleMsgs.push(`console[${m.type()}]: ` + m.text()));

const sleep = (ms) => page.waitForTimeout(ms);

/* 量 master 輸出 RMS：讀音量計 meterbar 的寬度（多次取平均），並回傳 */
async function meterAvg(label, ms = 800) {
  const vals = [];
  for (let i = 0; i < 8; i++) {
    vals.push(await page.evaluate(() => {
      const w = parseFloat(document.getElementById('meterbar').style.width);
      return isNaN(w) ? 0 : w;
    }));
    await sleep(ms / 8);
  }
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
  console.log(`  📊 ${label} meter 平均 = ${avg}%（>5% 才算有聲音波進 master）`);
  return avg;
}

console.log('\n═══════ Part 1：mp3-test.html 四層逐一測試 ═══════');
await page.goto(`http://127.0.0.1:${PORT}/mp3-test.html`, { waitUntil: 'networkidle' });
await sleep(500);

for (const k of ['a', 'b', 'c', 'd']) {
  console.log(`\n── 測試 ${k.toUpperCase()} ──`);
  await page.click('#b-none'); await sleep(400);
  consoleMsgs.length = 0;
  await page.click('#b-' + k);
  await sleep(k === 'c' ? 3000 : 2000);
  const info = await page.evaluate((kk) => ({
    res: document.getElementById('res-' + kk).textContent.trim(),
    st: (kk === 'a' || kk === 'b') ? document.getElementById('st-' + kk).textContent.trim() : '',
    ctx: document.getElementById('ctxstate').textContent.trim(),
  }), k);
  console.log(`  res=${info.res}  st=${info.st}  ctx=${info.ctx}`);
  await meterAvg(`${k.toUpperCase()} 單獨播`);
  for (const m of consoleMsgs) console.log('  ', m);
  const logTail = await page.evaluate(() =>
    document.getElementById('log').textContent.trim().split('\n').slice(-3).join(' | '));
  console.log(`  log 尾: ${logTail}`);
}

/* 組合測試：A+B 一起（同檔案兩元素）*/
console.log('\n── 組合 A+B 同時播 ──');
await page.click('#b-none'); await sleep(400);
consoleMsgs.length = 0;
await page.click('#b-a'); await sleep(300);
await page.click('#b-b'); await sleep(2000);
console.log('  A/B res:', await page.evaluate(() =>
  document.getElementById('res-a').textContent + ' / ' + document.getElementById('res-b').textContent));
await meterAvg('A+B 同時');
for (const m of consoleMsgs) console.log('  ', m);
await page.click('#b-none');

/* 解碼測試：decodeAudioData 能不能解 sugar-cookie.mp3 */
console.log('\n── decodeAudioData 直接測（不透過頁面）──');
const dec = await page.evaluate(async () => {
  const out = {};
  const ac2 = new (window.AudioContext || window.webkitAudioContext)();
  for (const f of ['music/sugar-cookie.mp3', 'music/marshmallow.mp3', 'music/sunset.mp3']) {
    try {
      const ab = await (await fetch(f, { cache: 'no-store' })).arrayBuffer();
      const buf = await ac2.decodeAudioData(ab);
      out[f] = `OK ${buf.duration.toFixed(1)}s rate=${buf.sampleRate} ch=${buf.numberOfChannels}`;
    } catch (e) {
      out[f] = 'FAIL ' + (e && (e.message || e.name));
    }
  }
  ac2.close();
  return out;
});
for (const [f, r] of Object.entries(dec)) console.log(`  ${f}: ${r}`);

console.log('\n═══════ Part 2：遊戲 index.html 的 BGM ═══════');
const page2 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const gmsgs = [];
page2.on('pageerror', e => gmsgs.push('PAGEERROR: ' + e.message));
page2.on('console', m => gmsgs.push(`console[${m.type()}]: ` + m.text()));
await page2.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
await page2.evaluate(() => localStorage.clear());
await page2.reload({ waitUntil: 'networkidle' });
await sleep(600);
console.log('點封面進入…');
await page2.click('#cover-enter');
await sleep(3000);
const g1 = await page2.evaluate(() => {
  const A = AudioSys;
  const el = A.bgmEl;
  const an = A.ctx.createAnalyser();
  an.fftSize = 2048;
  A._master.connect(an);
  window.__an = an;
  return {
    ctxState: A.ctx.state,
    sampleRate: A.ctx.sampleRate,
    muted: A.muted,
    masterGain: A._master.gain.value,
    bgmPlaying: A.bgmPlaying,
    src: el ? el.currentSrc.split('/').pop() : '(無元素)',
    paused: el ? el.paused : null,
    currentTime: el ? el.currentTime.toFixed(2) : null,
    volume: el ? el.volume : null,
    mutedEl: el ? el.muted : null,
    readyState: el ? el.readyState : null,
    networkState: el ? el.networkState : null,
    error: el && el.error ? el.error.code : null,
  };
});
console.log('  狀態:', JSON.stringify(g1, null, 2));
/* 量 RMS（接在 masterGain 上）*/
async function grms(label, ms = 1000) {
  const r = await page2.evaluate((ms) => new Promise((res) => {
    const an = window.__an;
    const d = new Float32Array(an.fftSize);
    let peak = 0, n = 0;
    const t0 = performance.now();
    (function loop() {
      an.getFloatTimeDomainData(d);
      let s = 0;
      for (let i = 0; i < d.length; i++) s += d[i] * d[i];
      peak = Math.max(peak, Math.sqrt(s / d.length));
      n++;
      if (performance.now() - t0 < ms) requestAnimationFrame(loop);
      else res(peak);
    })();
  }), ms);
  console.log(`  🎵 ${label} RMS(peak of 30ms frames) = ${r.toFixed(4)}（>0.01 算有聲音波）`);
  return r;
}
const rms1 = await grms('進入後 3 秒');
const ct1 = await page2.evaluate(() => AudioSys.bgmEl.currentTime);
await sleep(1200);
const ct2 = await page2.evaluate(() => AudioSys.bgmEl.currentTime);
console.log(`  元素進度: ${ct1.toFixed(2)}s → ${ct2.toFixed(2)}s（在走＝元素在播）`);
for (const m of gmsgs) console.log('  ', m);

/* 靜音→取消靜音 之後再量 */
console.log('\n  靜音→取消靜音：');
await page2.click('#btn-mute'); await sleep(400);
await page2.click('#btn-mute'); await sleep(1500);
console.log('  master gain:', await page2.evaluate(() => AudioSys._master.gain.value),
  'paused:', await page2.evaluate(() => AudioSys.bgmEl.paused));
await grms('unmute 後');
for (const m of gmsgs) if (!gmsgs.slice(0, -1).includes(m)) console.log('  ', m);

await browser.close();
server.close();
console.log('\n✅ 診斷完成');
