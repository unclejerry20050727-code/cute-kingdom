/* 快速健檢：mp3-test.html 能載入、按鈕能點、無 pageerror */
import { chromium } from 'playwright';

const url = process.env.URL || 'http://localhost:8137/mp3-test.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'networkidle' });
console.log('標題:', await page.title());
console.log('靜音記憶顯示:', (await page.locator('#lsval').textContent()).trim());

// 點「全部一起播」（C 要 fetch+解碼，headless 可能要幾秒，最多等 6 秒）
await page.click('#b-all');
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(500);
  if ((await page.locator('#res-c').textContent()).trim() !== '-') break;
}
const res = {};
for (const k of ['a', 'b', 'c', 'd']) res[k] = (await page.locator('#res-' + k).textContent()).trim();
console.log('狀態:', JSON.stringify(res));
console.log('音量計寬度:', await page.locator('#meterbar').evaluate((el) => el.style.width));
console.log('ctx state:', (await page.locator('#ctxstate').textContent()).trim());

await page.screenshot({ path: 'shots/mp3-testpage.png' });
await page.click('#b-none');
await browser.close();

if (errors.length) { console.error('❌ 錯誤:'); errors.forEach((e) => console.error(' ', e)); process.exit(1); }
console.log('✅ 健檢通過（headless 無聲卡，只驗 JS 流程）');
