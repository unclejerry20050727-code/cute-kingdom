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
const page = await browser.newPage({ viewport: { width: 980, height: 660 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => typeof beginGame === 'function', null, { timeout: 20000 });
await page.evaluate(() => {
  Game.playerCfg = defaultConfig('female');
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'done' }, true);
  Game.school.selected = ['cooking'];
  Game.furniture.push({ id: 'stove', tx: 3, ty: 4, rot: 0 });
  Game.furniture.push({ id: 'stove', tx: 5, ty: 5, rot: 1 });
  rebuildBlocked();
});
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/302-stove.png' });
/* 商店卡檢查：無課鎖定 / 有課解鎖 */
const gate = await page.evaluate(() => {
  Game.school.selected = [];
  openBuildPanel('decor');
  const c1 = [...document.querySelectorAll('.build-item')].find(el => (el.querySelector('.bi-name')?.textContent || '').startsWith('爐子'));
  const noCourse = { locked: c1.classList.contains('locked'), dis: c1.classList.contains('dis'), hint: c1.querySelector('.bi-lock')?.textContent || null };
  Game.school.selected = ['cooking'];
  closeBuildPanel(); openBuildPanel('decor');
  const c2 = [...document.querySelectorAll('.build-item')].find(el => (el.querySelector('.bi-name')?.textContent || '').startsWith('爐子'));
  const withCourse = c2.classList.contains('locked');
  closeBuildPanel();
  return { noCourse, withCourse };
});
console.log('gate:', JSON.stringify(gate), 'pageErr:', errs.length ? errs[0] : 0);
await browser.close(); server.close();
