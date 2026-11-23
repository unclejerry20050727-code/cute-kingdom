/* 30-5 小貓：門控/跟隨/存檔/撤課（临时測試，30-7 併入 .course30.mjs 後刪） */
import { chromium } from 'playwright';
import http from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
const ROOT = '/home/obot/Projects/20261023-3rd-game';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try { const d = await readFile(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
let fails = 0;
const check = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' ' + x : ''}`); if (!c) fails++; };

await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => typeof beginGame === 'function', null, { timeout: 20000 });
await page.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
});
await page.waitForTimeout(300);

/* R1：無寵物課 → 無貓 */
{
  const has = await page.evaluate(() => Game.pet === null);
  check('R1 無寵物課無貓', has);
}

/* R2：選課確認（含 pet）→ 小貓出現在玩家旁 */
await page.evaluate(() => {
  Game.school.selected = ['pet', 'fishing', 'cooking', 'dance'];
  confirmOrChangeSchool();
});
await page.waitForTimeout(200);
{
  const s = await page.evaluate(() => ({
    pet: !!Game.pet,
    d: Game.pet ? Math.hypot(Game.player.x - Game.pet.x, Game.player.y - Game.pet.y) : 99,
    toast: $('#toast').textContent,
  }));
  check('R2 確認後小貓出現', s.pet && s.d < 0.2, `d=${s.d.toFixed(2)} toast=${s.toast}`);
}

/* R3：玩家移動 → 2s 內小貓追到 0.5 tile 內 */
await page.evaluate(() => { Game.player.x = 8.2; Game.player.y = 2.4; });
await page.waitForTimeout(2200);
{
  const s = await page.evaluate(() => ({
    d: Math.hypot(Game.player.x - Game.pet.x, Game.player.y - Game.pet.y),
    pet: { x: +Game.pet.x.toFixed(2), y: +Game.pet.y.toFixed(2) },
  }));
  check('R3 小貓追隨', s.d < 0.5, `d=${s.d.toFixed(2)} pet=${JSON.stringify(s.pet)}`);
}

/* R4：存檔含 pet；重載 startGame → 保留 */
await page.evaluate(() => saveGame(fullSave('done')));
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof startGame === 'function', null, { timeout: 20000 });
await page.evaluate(() => startGame());
await page.waitForTimeout(500);
{
  const s = await page.evaluate(() => ({
    pet: !!Game.pet,
    saved: JSON.parse(localStorage.getItem('cute-kingdom-save-v1')).pet,
  }));
  check('R4 存檔含 pet', s.saved && typeof s.saved.x === 'number', JSON.stringify(s.saved));
  check('R4 重載小貓保留', s.pet);
}

/* R5：撤掉寵物課再確認 → 小貓消失 */
await page.evaluate(() => {
  confirmOrChangeSchool(); /* 換課模式 */
  Game.school.selected = ['fishing', 'cooking', 'dance', 'sport'];
  confirmOrChangeSchool(); /* 重新確認 */
});
await page.waitForTimeout(200);
{
  const s = await page.evaluate(() => ({ pet: Game.pet, toast: $('#toast').textContent }));
  check('R5 撤課小貓消失', s.pet === null, `toast=${s.toast}`);
}

/* R6：重新選回 pet → 再出現 */
await page.evaluate(() => {
  confirmOrChangeSchool();
  Game.school.selected = ['pet', 'fishing', 'cooking', 'dance'];
  confirmOrChangeSchool();
});
await page.waitForTimeout(200);
{
  const has = await page.evaluate(() => !!Game.pet);
  check('R6 選回 pet 小貓再出現', has);
}

check('0 pageerror', errs.length === 0, errs[0] ? String(errs[0]).slice(0, 160) : '');
console.log(fails === 0 ? '\n.q305 ALL PASS' : `\n${fails} FAILURES`);
await browser.close(); server.close();
process.exit(fails === 0 ? 0 : 1);
