/* 30-4 釣魚：門控/狀態機/存檔/ESC（临时測試，30-7 併入 .course30.mjs 後刪） */
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
const ok = (name, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`);
let fails = 0;
const check = (name, cond, extra = '') => { ok(name, cond, extra); if (!cond) fails++; };

await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => typeof beginGame === 'function' && typeof startFishing === 'function', null, { timeout: 20000 });
await page.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
  setSub('map');
});
await page.waitForTimeout(300);

/* R1：無課點湖 → toast + 不開釣魚 */
await page.evaluate(() => {
  Game.school.selected = [];
  const cx = POND.x * Game.ws + Game.offX, cy = POND.y * Game.ws + Game.offY;
  Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
});
await page.waitForTimeout(150);
{
  const s = await page.evaluate(() => ({
    hidden: $('#screen-fish').classList.contains('hidden'),
    toast: $('#toast').textContent, toastHidden: $('#toast').classList.contains('hidden'),
    sub: Game.sub,
  }));
  check('R1 無課不開釣魚畫面', s.hidden && s.sub === 'map');
  check('R1 門控 toast', /釣魚課/.test(s.toast) && !s.toastHidden, `toast=${s.toast}`);
}

/* R2：有課點湖 → 開釣魚 */
await page.evaluate(() => {
  Game.school.selected = ['fishing'];
  const cx = POND.x * Game.ws + Game.offX, cy = POND.y * Game.ws + Game.offY;
  Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
});
await page.waitForTimeout(150);
{
  const s = await page.evaluate(() => ({
    open: !$('#screen-fish').classList.contains('hidden'),
    sub: Game.sub, state: Fish ? Fish.state : null,
  }));
  check('R2 有課開釣魚畫面', s.open && s.sub === 'fish' && s.state === 'ready', JSON.stringify(s));
}

/* R3：拋竿 → wait → 強制咬餌 → 撈到（錢+數+1+存檔） */
{
  const r = await page.evaluate(async () => {
    const money0 = Game.money;
    fishAction();
    const st1 = Fish.state;
    Fish.biteAt = Fish.t + 0.05;
    await new Promise(res => setTimeout(res, 120)); /* 讓主迴圈 updateFish 推進 */
    const st2 = Fish.state;
    const f = Fish.fish;
    fishAction();
    const st3 = Fish.state;
    return { st1, st2, st3, coins: f.coins, name: f.name, money: Game.money, caught: Game.fish.caught, saved: JSON.parse(localStorage.getItem('cute-kingdom-save-v1')).fish.caught };
  });
  check('R3 拋竿→wait', r.st1 === 'wait');
  check('R3 到時→bite', r.st2 === 'bite');
  check('R3 撈→caught', r.st3 === 'caught');
  check('R3 錢增加', r.money === r.coins + 100, `+${r.coins}(${r.name})→${r.money}`);
  check('R3 累計+1', r.caught === 1);
  check('R3 存檔 fish.caught', r.saved === 1);
}

/* R4：等 caught 結束回 ready */
await page.waitForTimeout(1900);
{
  const s = await page.evaluate(() => Fish.state);
  check('R4 caught→ready', s === 'ready', `state=${s}`);
}

/* R5：咬餌不撈 → missed → ready */
{
  const r = await page.evaluate(async () => {
    fishAction();
    Fish.biteAt = Fish.t + 0.05;
    await new Promise(res => setTimeout(res, 1200));
    return { st: Fish.state, msg: $('#fish-msg').textContent };
  });
  check('R5 不撈→missed', r.st === 'missed', `msg=${r.msg}`);
}

/* R6：ESC → 回地圖 */
await page.waitForTimeout(1900);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
{
  const s = await page.evaluate(() => ({ sub: Game.sub, open: !$('#screen-fish').classList.contains('hidden') }));
  check('R6 ESC 回地圖', s.sub === 'map' && s.open === false, JSON.stringify(s));
}

/* R7：重載 → startGame()（繼續）→ fish.caught 保留 */
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => typeof startGame === 'function', null, { timeout: 20000 });
await page.evaluate(() => startGame());
await page.waitForTimeout(500);
{
  const c = await page.evaluate(() => Game.fish ? Game.fish.caught : null);
  check('R7 重載保留釣魚數', c === 1, `caught=${c}`);
}

check('0 pageerror', errs.length === 0, errs[0] ? String(errs[0]).slice(0, 160) : '');
console.log(fails === 0 ? '\n.q304 ALL PASS' : `\n${fails} FAILURES`);
await browser.close(); server.close();
process.exit(fails === 0 ? 0 : 1);
