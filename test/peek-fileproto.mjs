/* ══════════ file:// 情境驗證：MediaElementSource 是否被當跨域而靜音 ══════════
 * 假說：Chrome/FF 對 file:// 媒體資源視為 opaque origin →
 *        createMediaElementSource 輸出靜音（canvas tainting 同款機制）、fetch 被 CORS 擋
 *        Safari(WebKit) 對同目錄 file:// 寬容 → 全通
 * 用法：node test/peek-fileproto.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const msgs = [];
page.on('pageerror', e => msgs.push('PAGEERROR: ' + e.message));
page.on('console', m => msgs.push(`console[${m.type()}]: ` + m.text()));

const fileUrl = 'file://' + path.join(ROOT, 'mp3-test.html');
console.log('載入:', fileUrl);
await page.goto(fileUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

async function meterAvg(label, ms = 800) {
  const vals = [];
  for (let i = 0; i < 8; i++) {
    vals.push(await page.evaluate(() => {
      const w = parseFloat(document.getElementById('meterbar').style.width);
      return isNaN(w) ? 0 : w;
    }));
    await page.waitForTimeout(ms / 8);
  }
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
  console.log(`  📊 ${label} meter 平均 = ${avg}%`);
  return avg;
}

for (const k of ['a', 'b', 'c']) {
  console.log(`\n── 測試 ${k.toUpperCase()}（file://）──`);
  await page.click('#b-none'); await page.waitForTimeout(400);
  msgs.length = 0;
  await page.click('#b-' + k);
  await page.waitForTimeout(k === 'c' ? 3000 : 2000);
  const info = await page.evaluate((kk) => ({
    res: document.getElementById('res-' + kk).textContent.trim(),
    st: document.getElementById('st-' + kk).textContent.trim(),
    proto: document.getElementById('proto').textContent.trim(),
  }), k);
  console.log(`  res=${info.res}  st=${info.st}`);
  console.log(`  proto 欄位: ${info.proto}`);
  await meterAvg(`${k.toUpperCase()} 單獨`);
  for (const m of msgs) console.log('  ', m);
}
await page.click('#b-none');
await browser.close();
console.log('\n✅ file:// 驗證完成');
