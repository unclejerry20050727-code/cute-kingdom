/* ══════════ 抓 freetouse 音訊直連 URL ══════════
 * 用法：node test/peek-audio.mjs
 * 輸出：所有 .mp3/audio 相關回應 + <audio> 元素 src
 */
import { chromium } from 'playwright';

const pages = process.argv.slice(2);
if (!pages.length) {
  console.error('usage: node test/peek-audio.mjs <url> [url...]');
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
const page = await browser.newPage();
const hits = new Set();
page.on('response', r => {
  const u = r.url();
  if (/\.(mp3|m4a|ogg|wav|flac)(\?|$)/i.test(u) || /\/audio\//i.test(u)) hits.add(`${r.status()} ${u}`);
});

for (const url of pages) {
  console.log(`\n=== ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    /* 試著點播放，觸發音訊載入 */
    const btn = page.locator('button').first();
    try { await btn.click({ timeout: 1500 }); } catch {}
    await page.waitForTimeout(3000);
    const srcs = await page.evaluate(() =>
      [...document.querySelectorAll('audio')].map(a => a.src || a.currentSrc).filter(Boolean)
    );
    console.log('audio elements:', JSON.stringify(srcs));
  } catch (e) {
    console.log('ERR', e.message);
  }
}
console.log('\n--- 抓到的音訊相關 URL ---');
for (const h of hits) console.log(h);
await browser.close();
process.exit(0);
