/* ══════════ 可愛國 — 主程式 ══════════ */
'use strict';

const Game = {
  state: 'cover',   // cover | title | create | game
  sub: null,        // fp | talk | meet | tutBuild | placing | praise | goOut | free | loading | map | work
  mapTarget: null,
  t: 0,
  canvas: null,
  ctx: null,
  dpr: 1, ws: 1, offX: 0, offY: 0,
  playerCfg: null,
  player: { x: 4.5, y: 5.5, facing: 'down', walkT: 0, walking: false, gaze: 0, eyesClosed: true, getup: 1 },
  npc: { x: 0.9, y: 7.1, facing: 'right', visible: false, popT: 0, revealed: false },
  blink: makeBlinkState(),
  furniture: [],
  wallItems: [],    // [{ id, wall:'A'|'B', pos }]
  tints: { wall: 0, floor: 0 },
  blocked: new Set(),
  placement: null,   // { mode:'floor'|'wall'|'remove', item, ... }
  moveTarget: null,
  keys: new Set(),
  dpadDir: null,
  stage: 'created',  // created | bed | done
  awakeT: 0, meetT: 0,
  loadingTimer: 0,
  /* 第一人稱剛醒 */
  fp: { on: false, phase: 'closed', openT: 0, t: 0, camX: 710 },
  /* 金錢 / 打工裝備 */
  money: 100,
  gear: { uniform: false, hat: false },
  /* 地圖 */
  mapP: { x: 490, y: 195, facing: 'down', walkT: 0, walking: false },
  mouse: { wx: 0, wy: 0, tx: 0, ty: 0 },
};

/* ══════════ 初始化 ══════════ */
function init() {
  Game.canvas = $('#game-canvas');
  Game.ctx = Game.canvas.getContext('2d');
  Dialogue.init();
  onResize();
  window.addEventListener('resize', onResize);
  setupInput();
  setupCreateUI();
  setupBuildUI();

  $('#cover-enter').onclick = () => { sfx('confirm'); startBGM(); showScreen('title'); };
  $('#btn-start').onclick = () => { sfx('confirm'); startGame(); };
  $('#btn-new').onclick = () => { sfx('click'); newGame(); };
  $('#create-back').onclick = () => { sfx('back'); showScreen('title'); };
  $('#create-confirm').onclick = () => { sfx('confirm'); confirmCreate(); };
  $('#build-btn').onclick = () => { sfx('pop'); toggleBuildPanel(); };
  $('#out-btn').onclick = () => {
    if (Game.sub === 'goOut') hideHint();
    if (Game.sub === 'goOut' || Game.sub === 'free') goOutside();
  };
  $('#map-home').onclick = () => { sfx('whoosh'); homeFromMap(); };
  $('#shop-x').onclick = () => { sfx('back'); closeShop(); };
  $('#work-x').onclick = () => { sfx('back'); exitWork(); };
  $('#buy-uniform').onclick = () => buyGear('uniform');
  $('#buy-hat').onclick = () => buyGear('hat');
  $('#btn-start-work').onclick = () => startWork();
  $('#btn-mute').onclick = toggleMute;
  updateMuteBtn();

  /* 手寫風 loading 圈圈（種子化手繪 path） */
  document.getElementById('ld-ring').setAttribute('d', handCirclePathD(110, 110, 82, 7, 2.6));
  document.getElementById('ld-ring-dash').setAttribute('d', handCirclePathD(110, 110, 96, 13, 3.4));

  requestAnimationFrame(frame);
}

function onResize() {
  const c = Game.canvas;
  const dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  c.style.width = innerWidth + 'px';
  c.style.height = innerHeight + 'px';
  Game.dpr = dpr;
  Game.ws = Math.min(innerWidth / VW, innerHeight / VH);
  Game.offX = (innerWidth - VW * Game.ws) / 2;
  Game.offY = (innerHeight - VH * Game.ws) / 2;
  positionHint();
}

function showScreen(name) {
  for (const id of ['screen-cover', 'screen-title', 'screen-create', 'screen-game', 'screen-loading']) {
    document.getElementById(id).classList.add('hidden');
  }
  hideHint();
  if (name === 'cover') Game.state = 'cover';
  else if (name === 'title') Game.state = 'title';
  else if (name === 'create') Game.state = 'create';
  document.getElementById('screen-' + name).classList.remove('hidden');
}

/* ══════════ 流程 ══════════ */
function startGame() {
  const save = loadGame();
  if (!save || !save.cfg) {
    showToast('還沒有遊戲進度，先來新增遊戲吧！✨');
    setTimeout(newGame, 500);
    return;
  }
  beginGame(save, true);
}

function newGame() {
  Game.playerCfg = defaultConfig('female');
  showScreen('create');
  refreshCreateUI();
}

function confirmCreate() {
  saveGame({ cfg: Game.playerCfg, furniture: [], wallItems: [], tints: { wall: 0, floor: 0 }, stage: 'created' });
  beginGame({ cfg: Game.playerCfg, furniture: [], stage: 'created' }, false);
}

function beginGame(save, skipIntro) {
  Game.playerCfg = save.cfg;
  /* 書包（舊存檔補預設值） */
  if (!Game.playerCfg.pack) {
    Game.playerCfg.pack = Game.playerCfg.gender === 'male' ? 'brown' : 'beige';
  }
  Game.furniture = save.furniture || [];
  Game.wallItems = save.wallItems || [];
  Game.tints = save.tints || { wall: 0, floor: 0 };
  setRoomTints(Game.tints.wall, Game.tints.floor);
  Game.stage = save.stage || 'created';
  rebuildBlocked();
  /* 金錢 / 打工裝備（舊存檔補預設值） */
  Game.money = save.money ?? 100;
  Game.gear = save.gear ?? { uniform: false, hat: false };

  const p = Game.player;
  p.x = 4.5; p.y = 5.5; p.facing = 'down'; p.walkT = 0; p.walking = false;
  p.gaze = 0; p.moveDone = false;
  Game.moveTarget = null;
  Game.placement = null;

  const n = Game.npc;
  n.x = 0.9; n.y = 7.1; n.facing = 'right'; n.popT = 1;

  $('#hud-name').textContent = '小島';
  Game.state = 'game';
  for (const id of ['screen-cover', 'screen-title', 'screen-create', 'screen-loading', 'screen-shop', 'screen-work']) {
    document.getElementById(id).classList.add('hidden');
  }
  $('#screen-game').classList.remove('hidden');
  Dialogue.close();

  if (skipIntro) {
    /* 載入舊進度：小宥已在場，依階段續玩 */
    n.visible = true;
    n.revealed = true;
    p.eyesClosed = false;
    p.getup = 1;
    showBuildBtn();
    showOutBtn();
    if (Game.stage === 'done') {
      setSub('free');
    } else if (Game.stage === 'bed') {
      setSub('goOut');
      setTimeout(() => showHint($('#out-btn'), '點『出門』'), 700);
    } else {
      setSub('tutBuild');
      openBuildPanel(null);
      setTimeout(() => showHint($('#build-tabs .btab[data-tab="furniture"]'), '點『家具』'), 700);
    }
    return;
  }

  /* 全新遊戲：從剛醒開始（第一人稱：閉眼→睜眼→左右看） */
  n.visible = false;
  n.revealed = false;
  p.eyesClosed = true;
  p.getup = 0;
  Game.fp = { on: true, phase: 'closed', openT: 0, t: 0, camX: 710 };
  setSub('fp');
  $('#click-next').textContent = '👆 點擊睜開眼睛';
  $('#click-next').classList.remove('hidden');
}

function setSub(sub) {
  Game.sub = sub;
  if (sub !== 'fp') $('#click-next').classList.add('hidden');
  const roomSub = ['meet', 'tutBuild', 'placing', 'praise', 'goOut', 'free'].includes(sub);
  $('#out-btn').classList.toggle('hidden', !roomSub);
  $('#build-btn').classList.toggle('hidden', !roomSub);
  if (!roomSub) closeBuildPanel();
  if (sub !== 'placing' && !roomSub) showDpad(false);
  if (sub === 'free' || sub === 'map') showDpad();
  $('#map-home').classList.toggle('hidden', sub !== 'map');
  syncMoneyUI();
}

function syncMoneyUI() {
  const inWorld = ['free', 'goOut', 'map', 'work'].includes(Game.sub);
  $('#hud-money').classList.toggle('hidden', !inWorld);
  if (typeof Game.money === 'number') $('#hud-money-val').textContent = Game.money;
}

/* ══════════ 子狀態更新 ══════════ */
function updateGame(dt) {
  Game.blink.update(dt, Game.t);
  const p = Game.player;

  switch (Game.sub) {
    case 'fp': {
      const fp = Game.fp;
      if (fp.phase === 'open') {
        fp.openT = clamp(fp.openT + dt / 0.9, 0, 1);
        fp.t += dt;
        fp.camX = fpCamX(fp.t);
        if (fp.t >= FP_PAN_DUR) {
          /* 左右看完 → 問一句（還維持第一人稱） */
          setSub('talk');
          Dialogue.start([
            { who: 'player', name: '小島', text: '這是哪裡？' },
          ], () => {
            Game.fp.on = false; /* 之後小宥說話 → 第三人稱 */
            setSub('meet');
            Game.meetT = 0;
          });
        }
      }
      break;
    }
    case 'talk': {
      /* 第一人稱緩慢晃動（小宥還沒出場的對話） */
      Game.fp.camX = fpCamIdle(Game.t);
      break;
    }
    case 'meet': {
      Game.meetT += dt;
      const t = Game.meetT;
      p.getup = clamp(t / 0.55, 0, 1);
      if (t >= 0.35 && !Game.npc.visible) { Game.npc.visible = true; Game.npc.popT = 0; }
      if (Game.npc.visible) Game.npc.popT = clamp(Game.npc.popT + dt / 0.5, 0, 1);
      if (t >= 0.85) runXiaoyouIntro();
      break;
    }
    case 'free': {
      updateMovement(dt);
      break;
    }
    case 'map': {
      /* 地圖走路：WASD / 點地面 / D-pad，限道路上 */
      const m = Game.mapP, k = Game.keys;
      let dx = 0, dy = 0;
      if (k.has('up')) dy -= 1;
      if (k.has('down')) dy += 1;
      if (k.has('left')) dx -= 1;
      if (k.has('right')) dx += 1;
      if (!dx && !dy && Game.dpadDir) { dx = Game.dpadDir[0]; dy = Game.dpadDir[1]; }
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        Game.mapTarget = null;
        m.x = clamp(m.x + (dx / len) * 235 * dt, ROAD_L + 10, ROAD_R - 10);
        m.y = clamp(m.y + (dy / len) * 235 * dt, 182, 640);
        m.facing = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
        m.walking = true; m.walkT += dt;
      } else if (Game.mapTarget) {
        const { x, y } = Game.mapTarget;
        const d = Math.hypot(x - m.x, y - m.y);
        if (d < 7) { Game.mapTarget = null; m.walking = false; }
        else {
          m.x += (x - m.x) * Math.min(1, dt * 250 / d);
          m.y += (y - m.y) * Math.min(1, dt * 250 / d);
          m.facing = Math.abs(x - m.x) > Math.abs(y - m.y) ? (x > m.x ? 'right' : 'left') : (y > m.y ? 'down' : 'up');
          m.walking = true; m.walkT += dt;
        }
      } else {
        m.walking = false;
      }
      break;
    }
    case 'work':
      updateWork(dt);
      break;
    case 'placing': {
      const pl = Game.placement;
      if (!pl) break;
      if (pl.mode === 'floor') {
        const it = BUILD_ITEMS[pl.item];
        pl.tx = clamp(Math.floor(Game.mouse.tx), 0, N - it.w);
        pl.ty = clamp(Math.floor(Game.mouse.ty), 0, N - it.d);
        pl.valid = floorValid(pl.item, pl.tx, pl.ty);
      } else if (pl.mode === 'wall') {
        const s = wallSlotFromMouse();
        if (s) { pl.wall = s.wall; pl.pos = s.pos; }
        pl.valid = wallSlotValid(pl.item, pl.wall, pl.pos);
      } else if (pl.mode === 'remove') {
        pl.target = removeTargetFromMouse();
      }
      break;
    }
    case 'loading': {
      Game.loadingTimer += dt;
      if (Game.loadingTimer >= 3.2) {
        $('#screen-loading').classList.add('hidden');
        /* 手寫 loading 過場 → 室外地圖 */
        Game.mapP = { x: 490, y: 235, facing: 'down', walkT: 0, walking: false };
        Game.mapTarget = null;
        setSub('map');
        showHint($('#map-home'), '按『回家』回房間');
      }
      break;
    }
  }
}

function gazeTimeline(t) {
  const ease = (a, b, s, e) => {
    if (t < s) return a;
    if (t > e) return b;
    const k = (t - s) / (e - s);
    return a + (b - a) * (k * k * (3 - 2 * k));
  };
  if (t < 0.45) return 0;
  if (t < 1.25) return ease(0, -1, 0.45, 1.1);
  if (t < 1.5) return -1;
  if (t < 2.35) return ease(-1, 1, 1.5, 2.2);
  if (t < 2.6) return 1;
  return ease(1, 0, 2.6, 3.0);
}

function runXiaoyouIntro() {
  setSub('talk');
  Dialogue.start([
    { who: 'mystery', name: '???', text: '這裡是你的家。' },
    { who: 'player', name: '小島', text: '你是誰呀？' },
    { who: 'mystery', name: '???', revealed: true, text: '我是小宥。',
      onEnter: () => { Game.npc.revealed = true; } },
    { who: 'npc', name: '小宥', text: '你在此處可以過著幸福快樂的生活，不用拘束，可以放飛自我，在這裡，你只要開心就好。' },
    { who: 'npc', name: '小宥', text: '你想要去哪一個地方玩都隨便你，大吃大喝也不會胖！' },
    { who: 'npc', name: '小宥', text: '那你先來跟我裝潢一下吧！' },
  ], () => startBuildTutorial());
}

function startBuildTutorial() {
  setSub('tutBuild');
  showBuildBtn();
  openBuildPanel(null);
  setTimeout(() => showHint($('#build-tabs .btab[data-tab="furniture"]'), '點『家具』'), 600);
}

function showBuildBtn() {
  const b = $('#build-btn');
  b.classList.remove('hidden');
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  b.classList.add('pop-in');
}
function showOutBtn() {
  const b = $('#out-btn');
  b.classList.remove('hidden');
  b.classList.add('pop-in');
}
function showDpad(on = true) {
  $('#dpad').classList.toggle('hidden', !on);
}

function goOutside() {
  saveGame(fullSave('done'));
  setSub('loading');
  Game.loadingTimer = 0;
  sfx('whoosh');
  setLoadingQuote();
  $('#screen-loading').classList.remove('hidden');
  hideHint();
}

/* Loading 金句（每次隨機） */
const LOADING_QUOTES = [
  '好東西，都值得慢慢等。',
  '走路不趕，才會看見風景。',
  '今天的我，比昨天多會一點點。',
  '慢慢來，比較快。',
  '肚子餓了，就去找漢堡。',
  '開心是最好的裝潢。',
  '走錯路，也是風景的一部分。',
  '一天一小步，累積一大步。',
];
function setLoadingQuote() {
  const q = LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)];
  document.getElementById('loading-quote').textContent = '「' + q + '」';
}

/* ══════════ 回家 / 麥當勞商店 ══════════ */
function homeFromMap() {
  $('#screen-shop').classList.add('hidden');
  Game.mapTarget = null;
  Game.player.x = 1.5; Game.player.y = 7.2; Game.player.facing = 'down';
  setSub('free');
}

function openShop() {
  sfx('pop');
  hideHint();
  fillShopUI();
  $('#screen-shop').classList.remove('hidden');
}

function closeShop() {
  $('#screen-shop').classList.add('hidden');
  if (Game.sub !== 'work') setSub('map');
}

function fillShopUI() {
  drawShopIcon(document.getElementById('icon-uniform'), 'uniform');
  drawShopIcon(document.getElementById('icon-hat'), 'hat');
  /* 角色預覽（穿裝備） */
  const pc = document.getElementById('shop-char-canvas');
  const c2 = pc.getContext('2d');
  c2.clearRect(0, 0, pc.width, pc.height);
  drawCharacter(c2, Game.playerCfg, {
    x: pc.width / 2, y: pc.height - 24,
    facing: 'down', t: 0.8, walking: false,
    scale: 1.15, gear: Game.gear,
  });
  /* 購買按鈕 */
  const bu = document.getElementById('buy-uniform');
  const bh = document.getElementById('buy-hat');
  bu.disabled = Game.gear.uniform;
  bu.textContent = Game.gear.uniform ? '✅ 已購買' : '購買 50';
  bh.disabled = Game.gear.hat;
  bh.textContent = Game.gear.hat ? '✅ 已購買' : '購買 30';
  document.getElementById('shop-money').textContent = Game.money;
  const ready = Game.gear.uniform && Game.gear.hat;
  const bs = document.getElementById('btn-start-work');
  bs.disabled = !ready;
  bs.textContent = ready ? '⏰ 開始打工' : '集齊制服＋帽子才能打工喔';
}

function drawShopIcon(cv, kind) {
  const c2 = cv.getContext('2d');
  const x = cv.width / 2, y = cv.height / 2;
  c2.clearRect(0, 0, cv.width, cv.height);
  if (kind === 'uniform') {
    /* 白T紅領小制服 */
    c2.fillStyle = '#FFFFFF';
    c2.strokeStyle = '#E4D5BD';
    c2.lineWidth = 2.5;
    c2.beginPath();
    c2.moveTo(x - 16, y - 12);
    c2.lineTo(x + 16, y - 12);
    c2.lineTo(x + 22, y - 2);
    c2.lineTo(x + 14, y + 2);
    c2.lineTo(x + 14, y + 18);
    c2.lineTo(x - 14, y + 18);
    c2.lineTo(x - 14, y + 2);
    c2.lineTo(x - 22, y - 2);
    c2.closePath();
    c2.fill(); c2.stroke();
    c2.strokeStyle = '#D94F4F';
    c2.lineWidth = 3.5;
    c2.lineCap = 'round';
    c2.beginPath(); c2.arc(x, y - 11, 8, 0, Math.PI); c2.stroke();
    c2.fillStyle = '#D94F4F';
    c2.fillRect(x - 9, y + 4, 18, 14);
  } else {
    /* 紅帽子 */
    c2.fillStyle = '#C43F3F';
    c2.beginPath();
    c2.ellipse(x, y + 10, 26, 7, 0, 0, Math.PI * 2);
    c2.fill();
    c2.fillStyle = '#D94F4F';
    c2.beginPath();
    c2.arc(x, y + 6, 20, Math.PI, 0);
    c2.closePath();
    c2.fill();
    c2.strokeStyle = '#F7C948';
    c2.lineWidth = 3.5;
    c2.lineCap = 'round';
    const mw = 7;
    const arch = (x0) => {
      c2.beginPath();
      c2.moveTo(x0, y + 2);
      c2.quadraticCurveTo(x0, y - 8, x0 + mw / 2, y - 8);
      c2.quadraticCurveTo(x0 + mw, y - 8, x0 + mw, y + 2);
      c2.stroke();
    };
    arch(x - mw - 1.5);
    arch(x + 1.5);
  }
}

function buyGear(kind) {
  const price = kind === 'uniform' ? 50 : 30;
  if (Game.gear[kind]) return;
  if (Game.money < price) {
    showToast('錢不夠！先打工賺一點吧 🪙');
    sfx('buzz');
    return;
  }
  Game.money -= price;
  Game.gear[kind] = true;
  sfx('coin');
  syncMoneyUI();
  fillShopUI();
  saveGame(fullSave(Game.stage));
}

/* ══════════ 移動 ══════════ */
function tileBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= N || ty >= N) return true;
  return Game.blocked.has(tx + ',' + ty);
}

function updateMovement(dt) {
  const p = Game.player;
  let dx = 0, dy = 0;
  const k = Game.keys;
  if (k.has('up')) { dx -= 1; dy -= 1; }
  if (k.has('down')) { dx += 1; dy += 1; }
  if (k.has('left')) { dx -= 1; dy += 1; }
  if (k.has('right')) { dx += 1; dy -= 1; }
  if (dx === 0 && dy === 0 && Game.dpadDir) { dx = Game.dpadDir[0]; dy = Game.dpadDir[1]; }

  if (dx !== 0 || dy !== 0) {
    Game.moveTarget = null;
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    const speed = 4.4 * dt;
    tryMove(p, dx * speed, dy * speed);
    /* 朝向：以畫面速度判斷 */
    const vx = (dx - dy), vy = (dx + dy);
    if (Math.abs(vy) > Math.abs(vx)) p.facing = vy > 0 ? 'down' : 'up';
    else p.facing = vx > 0 ? 'right' : 'left';
    p.walking = true;
    p.walkT += dt;
    p.gaze = 0;
  } else if (Game.moveTarget) {
    const tx = Game.moveTarget.x, ty = Game.moveTarget.y;
    const mx = tx - p.x, my = ty - p.y;
    const d = Math.hypot(mx, my);
    if (d < 0.12) {
      Game.moveTarget = null;
      p.walking = false;
    } else {
      const speed = 4.8;
      const nx = mx / d * speed * dt, ny = my / d * speed * dt;
      const before = [p.x, p.y];
      tryMove(p, nx, ny);
      p.walking = true;
      p.walkT += dt;
      p.gaze = 0;
      const vx = (mx - my), vy = (mx + my);
      if (Math.abs(vy) > Math.abs(vx)) p.facing = vy > 0 ? 'down' : 'up';
      else p.facing = vx > 0 ? 'right' : 'left';
      if (p.x === before[0] && p.y === before[1]) Game.moveTarget = null; /* 被擋住 */
    }
  } else {
    p.walking = false;
  }
}

function tryMove(p, dx, dy) {
  const nx = clamp(p.x + dx, 0.35, N - 0.35);
  if (!tileBlocked(Math.floor(nx), Math.floor(p.y))) p.x = nx;
  const ny = clamp(p.y + dy, 0.35, N - 0.35);
  if (!tileBlocked(Math.floor(p.x), Math.floor(ny))) p.y = ny;
}

function rebuildBlocked() {
  Game.blocked.clear();
  for (const f of Game.furniture) {
    const it = BUILD_ITEMS[f.id];
    if (!it || !it.block) continue;
    for (const [tx, ty] of itemTiles(f.id, f.tx, f.ty)) Game.blocked.add(tx + ',' + ty);
  }
}

/* ══════════ 渲染 ══════════ */
/* ── 渲染分發 ── */
function renderGame() {
  const ctx = Game.ctx;
  const w = innerWidth, h = innerHeight;
  ctx.setTransform(Game.dpr, 0, 0, Game.dpr, 0, 0);
  drawPolkaBg(ctx, w, h);

  if (Game.fp.on && (Game.sub === 'fp' || Game.sub === 'talk')) {
    ctx.setTransform(Game.dpr * Game.ws, 0, 0, Game.dpr * Game.ws, Game.dpr * Game.offX, Game.dpr * Game.offY);
    const skin = (PALETTES.skin.find(s => s.id === Game.playerCfg.skin) || PALETTES.skin[0]).c;
    renderFP(ctx, Game.fp.camX, Game.fp.openT, skin);
    return;
  }

  if (Game.sub === 'map') {
    ctx.setTransform(Game.dpr * Game.ws, 0, 0, Game.dpr * Game.ws, Game.dpr * Game.offX, Game.dpr * Game.offY);
    renderMap(ctx, Game.t, Game.mapP);
    return;
  }

  if (Game.sub === 'work') {
    ctx.setTransform(Game.dpr * Game.ws, 0, 0, Game.dpr * Game.ws, Game.dpr * Game.offX, Game.dpr * Game.offY);
    renderWork(ctx, Game.t);
    return;
  }

  ctx.setTransform(Game.dpr * Game.ws, 0, 0, Game.dpr * Game.ws, Game.dpr * Game.offX, Game.dpr * Game.offY);
  drawRoom(ctx);

  /* 牆飾（移除模式下標紅） */
  const rmTarget0 = Game.placement && Game.placement.mode === 'remove' ? Game.placement.target : null;
  Game.wallItems.forEach((w, i) => {
    const it = WALL_ITEMS[w.id];
    if (!it) return;
    const o = (rmTarget0 && rmTarget0.type === 'wall' && rmTarget0.idx === i) ? { highlight: true } : {};
    it.draw(ctx, w.wall, w.pos, o);
  });
  if (Game.placement && Game.placement.mode === 'wall') {
    const pl = Game.placement, it = WALL_ITEMS[pl.item];
    if (it) it.draw(ctx, pl.wall, pl.pos, { ghost: true, tint: pl.valid ? 'ok' : 'bad' });
  }

  /* 可繪項目（深度排序） */
  const items = [];
  const rmTarget = rmTarget0;
  Game.furniture.forEach((f, i) => {
    const it = BUILD_ITEMS[f.id];
    if (!it) return;
    const isRm = rmTarget && rmTarget.type === 'floor' && rmTarget.idx === i;
    items.push({
      depth: f.tx + f.ty + it.w + it.d - 1,
      draw: () => {
        it.draw(ctx, f.tx, f.ty);
        if (isRm) {
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#E05A6A';
          const g0 = P(f.tx, f.ty), g1 = P(f.tx + it.w, f.ty), g2 = P(f.tx + it.w, f.ty + it.d), g3 = P(f.tx, f.ty + it.d);
          poly(ctx, [g0[0], g0[1]], [g1[0], g1[1]], [g2[0], g2[1]], [g3[0], g3[1]]);
          ctx.globalAlpha = 1;
        }
      },
    });
  });
  if (Game.npc.visible) {
    const n = Game.npc;
    items.push({
      depth: n.x + n.y,
      draw: () => {
        const s = 0.5 + 0.5 * easeOutBack(n.popT);
        drawCharacter(ctx, XIAOYOU_CFG, {
          x: tileScreen(n.x, n.y)[0], y: tileScreen(n.x, n.y)[1],
          facing: n.facing, t: Game.t + 1.7, walking: false,
          scale: s,
        });
        if (n.popT < 1) {
          ctx.fillStyle = '#FF8FB2';
          ctx.font = '700 30px "RHR", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', tileScreen(n.x, n.y)[0], tileScreen(n.x, n.y)[1] - 95 - (1 - n.popT) * 20);
        }
      },
    });
  }
  if (Game.placement && Game.placement.mode === 'floor') {
    const pl = Game.placement, it = BUILD_ITEMS[pl.item];
    if (it) {
      items.push({
        depth: pl.tx + pl.ty + it.w + it.d - 1,
        draw: () => it.draw(ctx, pl.tx, pl.ty, { ghost: true, tint: pl.valid ? 'ok' : 'bad' }),
      });
    }
  }
  /* 玩家 */
  const p = Game.player;
  items.push({
    depth: p.x + p.y + (p.getup < 1 ? -0.5 : 0),
    draw: () => {
      const [sx, sy] = tileScreen(p.x, p.y);
      if (p.getup < 1) {
        const t = easeOutBack(p.getup);
        drawLying(ctx, Game.playerCfg, { x: sx, y: sy, t: Game.t, alpha: 1 - t, gaze: p.gaze, eyesClosed: p.eyesClosed });
        if (t > 0.02) {
          drawCharacter(ctx, Game.playerCfg, {
            x: sx + 6, y: sy - 6, facing: p.facing, t: Game.t, walking: false,
            scale: 0.6 + 0.4 * t, alpha: t, gaze: p.gaze, eyesClosed: p.eyesClosed,
          });
        }
      } else {
        drawCharacter(ctx, Game.playerCfg, {
          x: sx, y: sy, facing: p.facing, t: p.walkT,
          walking: p.walking, gaze: p.gaze, eyesClosed: p.eyesClosed,
          blink: Game.blink.timer > 0 ? 1 : 0,
        });
      }
    },
  });

  items.sort((a, b) => a.depth - b.depth);
  for (const it of items) it.draw();
}

function tileScreen(tx, ty) {
  return P(tx, ty);
}

/* ══════════ 主迴圈 ══════════ */
let lastTs = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  Game.t += dt;
  Dialogue.update(dt);
  if (Game.state === 'create') updatePreview();
  if (Game.state === 'game' && Game.sub) {
    updateGame(dt);
    if (Game.sub !== 'loading') renderGame();
  }
  requestAnimationFrame(frame);
}

/* ══════════ 輸入 ══════════ */
function setupInput() {
  window.addEventListener('keydown', (e) => {
    const keyMap = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
    };
    if (Game.sub === 'free' && keyMap[e.key]) {
      Game.keys.add(keyMap[e.key]);
      e.preventDefault();
    }
    if (Game.sub === 'map' && keyMap[e.key]) {
      Game.keys.add(keyMap[e.key]);
      e.preventDefault();
    }
    if ((e.key === ' ' || e.key === 'Enter') && Dialogue.active) {
      Dialogue.advance();
      e.preventDefault();
    }
    if ((e.key === ' ' || e.key === 'Enter') && Game.sub === 'fp' && !Dialogue.active) {
      Game.canvas.dispatchEvent(new MouseEvent('click', { clientX: innerWidth / 2, clientY: innerHeight / 2 }));
      e.preventDefault();
    }
    if (e.key === 'Escape') {
      if (Game.sub === 'placing') cancelPlacement();
      else if (!$('#build-panel').classList.contains('hidden')) closeBuildPanel();
    }
  });
  window.addEventListener('keyup', (e) => {
    const keyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (keyMap[e.key]) Game.keys.delete(keyMap[e.key]);
  });

  Game.canvas.addEventListener('mousemove', (e) => {
    const wx = (e.clientX - Game.offX) / Game.ws;
    const wy = (e.clientY - Game.offY) / Game.ws;
    Game.mouse.wx = wx; Game.mouse.wy = wy;
    const [tx, ty] = screenToTile(wx, wy);
    Game.mouse.tx = tx; Game.mouse.ty = ty;
  });

  Game.canvas.addEventListener('click', (e) => {
    if (Dialogue.active) { Dialogue.advance(); return; }
    const wx = (e.clientX - Game.offX) / Game.ws;
    const wy = (e.clientY - Game.offY) / Game.ws;
    const [tx, ty] = screenToTile(wx, wy);
    Game.mouse.tx = tx; Game.mouse.ty = ty;

    switch (Game.sub) {
      case 'fp':
        if (Game.fp.phase === 'closed') {
          Game.fp.phase = 'open';
          Game.fp.openT = 0;
          Game.fp.t = 0;
          Game.player.eyesClosed = false;
          $('#click-next').classList.add('hidden');
          sfx('wake');
        } else {
          /* 加速看完 */
          Game.fp.t = FP_PAN_DUR;
        }
        break;
      case 'free': {
        if (tx > 0.2 && ty > 0.2 && tx < N - 0.2 && ty < N - 0.2) {
          Game.moveTarget = { x: clamp(tx, 0.4, N - 0.4), y: clamp(ty, 0.4, N - 0.4) };
        }
        break;
      }
      case 'placing': {
        const pl = Game.placement;
        if (!pl) break;
        if (pl.mode === 'floor') {
          if (pl.valid) placeItem(pl.item, pl.tx, pl.ty);
          else showToast('這裡放不了喔，換個位置試試～');
        } else if (pl.mode === 'wall') {
          if (pl.valid) {
            const prevSub = pl.prevSub;
            Game.wallItems.push({ id: pl.item, wall: pl.wall, pos: pl.pos });
            Game.placement = null;
            $('#hint-bar').classList.add('hidden');
            sfx('place');
            saveGame(fullSave(Game.stage));
            showToast(`掛上${WALL_ITEMS[pl.item].name}～`);
            setSub(prevSub || 'free');
            openBuildPanel();
          } else showToast('這裡掛不了喔，換個位置試試～');
        } else if (pl.mode === 'remove') {
          if (pl.target) removeItem(pl.target);
          else showToast('點家具或牆飾把它移走');
        }
        break;
      }
      case 'map': {
        /* 點麥當勞 → 商店；點道路 → 走過去 */
        if (Math.hypot(wx - MC.x, wy - MC.y) < 34) { openShop(); break; }
        if (wx > ROAD_L && wx < ROAD_R && wy > 175 && wy < 645) {
          Game.mapTarget = { x: clamp(wx, ROAD_L + 10, ROAD_R - 10), y: clamp(wy, 182, 640) };
        }
        break;
      }
      case 'work': {
        /* 點食材卡 */
        for (let i = 0; i < WORK_CARDS.length; i++) {
          const c = WORK_CARDS[i];
          if (wx > c.x - CARD_W / 2 && wx < c.x + CARD_W / 2 && wy > c.y && wy < c.y + CARD_H) {
            workClick(i);
            return;
          }
        }
        break;
      }
    }
  });

  /* 方向鍵 DOM */
  for (const btn of document.querySelectorAll('.dpad button')) {
    const [dx, dy] = btn.dataset.d.split(',').map(Number);
    const on = () => { Game.dpadDir = [dx, dy]; };
    const off = () => { if (Game.dpadDir && Game.dpadDir[0] === dx && Game.dpadDir[1] === dy) Game.dpadDir = null; };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); on(); });
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointerleave', off);
    btn.addEventListener('pointercancel', off);
  }
}

/* ══════════ 教學提示（箭頭+圈圈） ══════════ */
let hintTarget = null;
function showHint(el, label) {
  hintTarget = el;
  $('#hint-label').textContent = label;
  const h = $('#hint');
  h.classList.remove('hidden');
  positionHint();
}
function positionHint() {
  if (!hintTarget) return;
  const r = hintTarget.getBoundingClientRect();
  const h = $('#hint');
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  h.style.left = cx + 'px';
  h.style.top = (r.top + r.height / 2) + 'px';
  /* 氣泡置中在目標上方，且不出畫面；若目標靠畫面上方（如「回家」鈕）則翻到下方 */
  const flip = r.top < 200;
  const a = $('#hint .hint-arrow');
  if (a) {
    a.textContent = flip ? '⬆️' : '⬇️';
    a.style.top = flip ? (r.bottom - cy + 12) + 'px' : '';
  }
  const b = $('#hint .hint-bubble');
  if (b && b.offsetWidth) {
    const pad = 10;
    let left = -b.offsetWidth / 2;
    let bl = cx + left, br = cx + left + b.offsetWidth;
    if (br > innerWidth - pad) left -= br - (innerWidth - pad);
    if (bl < pad) left += pad - bl;
    b.style.left = left + 'px';
    b.style.top = flip ? (r.bottom - cy + 66) + 'px' : '';
  }
}
function hideHint() {
  hintTarget = null;
  $('#hint').classList.add('hidden');
}

/* ══════════ 建造 UI ══════════ */
let buildTab = null;
const BUILD_TABS = {
  furniture: '🛏️ 家具',
  decor: '⭐ 擺飾',
  wall: '🖼️ 牆飾',
  floor: '🌸 地飾',
  renovate: '🎨 裝潢',
  remove: '🧹 移除',
};
const TINT_NAMES = { wall: ['原色', '粉嫩', '天空', '薄荷', '檸檬'], floor: ['原色', '粉嫩', '天空', '薄荷', '檸檬'] };
const TINT_SWATCH = { wall: ['#FDF2DF', '#FCE4EC', '#DDEEF9', '#E5F2DF', '#FBF0CE'], floor: ['#FBEDD9', '#FBE3EA', '#E7F0F8', '#ECF3E3', '#F9EFD0'] };

function setupBuildUI() {
  for (const tab of document.querySelectorAll('.btab')) {
    tab.onclick = () => { sfx('click'); selectBuildTab(tab.dataset.tab); };
  }
}

function openBuildPanel(tab) {
  $('#build-panel').classList.remove('hidden');
  if (tab) selectBuildTab(tab, true);
}
function closeBuildPanel() {
  $('#build-panel').classList.add('hidden');
}
function toggleBuildPanel() {
  const panel = $('#build-panel');
  if (panel.classList.contains('hidden')) {
    openBuildPanel(buildTab || 'furniture');
    if (Game.sub === 'tutBuild') showHint($('.btab[data-tab="' + (buildTab || 'furniture') + '"]'), '點『家具』');
  } else {
    closeBuildPanel();
    hideHint();
  }
}

function selectBuildTab(tab, force) {
  buildTab = tab;
  for (const b of document.querySelectorAll('.btab')) b.classList.toggle('sel', b.dataset.tab === tab);
  const box = $('#build-items');
  box.innerHTML = '';
  const inTutorial = Game.stage === 'created';

  const emptyMsg = (msg) => {
    const empty = document.createElement('div');
    empty.className = 'build-empty';
    empty.innerHTML = msg;
    box.appendChild(empty);
  };

  if (tab === 'remove') {
    if (inTutorial) { emptyMsg('🌟 先完成放床教學，才能移除喔～ 🌟'); return; }
    const item = document.createElement('div');
    item.className = 'build-item pop-in';
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 84;
    const c2 = cv.getContext('2d');
    c2.font = '44px serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText('🧹', 64, 42);
    const nm = document.createElement('div'); nm.className = 'bi-name'; nm.textContent = '移除品項';
    item.append(cv, nm);
    item.onclick = () => { sfx('click'); startRemoveMode(); };
    box.appendChild(item);
    return;
  }

  if (tab === 'renovate') {
    if (inTutorial) { emptyMsg('🌟 先完成放床教學，就能裝潢囉～ 🌟'); return; }
    for (const kind of ['wall', 'floor']) {
      const row = document.createElement('div');
      row.className = 'tint-row';
      const lab = document.createElement('div');
      lab.className = 'tint-label';
      lab.textContent = kind === 'wall' ? '牆面色' : '地板色';
      row.appendChild(lab);
      TINT_SWATCH[kind].forEach((sw, i) => {
        const chip = document.createElement('button');
        chip.className = 'tint-chip' + (Game.tints[kind] === i ? ' sel' : '');
        chip.style.background = sw;
        chip.title = TINT_NAMES[kind][i];
        chip.onclick = () => setTint(kind, i);
        row.appendChild(chip);
      });
      box.appendChild(row);
    }
    return;
  }

  if (tab === 'wall') {
    const list = Object.entries(WALL_ITEMS);
    if (!list.length) {
      emptyMsg(inTutorial ? '🌟 先完成放床教學，就能掛牆飾囉～ 🌟' : `🌟 ${BUILD_TABS[tab]} 敬請期待 🌟<br><small style="opacity:.7">之後會開更多好玩的東西！</small>`);
      return;
    }
    for (const [id, it] of list) box.appendChild(wallCard(id, it));
    return;
  }

  const list = Object.entries(BUILD_ITEMS).filter(([id, it]) => it.tab === tab && (!inTutorial || id === 'bed'));
  if (!list.length) {
    emptyMsg(inTutorial ? '🌟 先完成放床教學，就能放更多家具囉～ 🌟' : `🌟 ${BUILD_TABS[tab]} 敬請期待 🌟<br><small style="opacity:.7">之後會開更多好玩的東西！</small>`);
    return;
  }
  for (const [id, it] of list) box.appendChild(floorCard(id, it));
  if (inTutorial && tab === 'furniture' && !force) {
    setTimeout(() => showHint(box.querySelector('.build-item'), '點選『床』'), 500);
  }
}

function floorCard(id, it) {
  const item = document.createElement('div');
  item.className = 'build-item pop-in';
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 84;
  const c2 = cv.getContext('2d');
  c2.save();
  const s = Math.min(0.72, 78 / (it.h + (it.w + it.d) * 8));
  c2.translate(64, 42);
  c2.scale(s, s);
  c2.translate(-OX, -(OY + 96 - it.h / 2)); /* 視覺中心（含高度一半）對齊卡片中央 */
  it.draw(c2, 3 - it.w / 2, 3 - it.d / 2);
  c2.restore();
  const nm = document.createElement('div');
  nm.className = 'bi-name';
  const n = countItem(id);
  nm.textContent = it.name + (n >= it.max ? `（${n}/${it.max}）` : '');
  item.append(cv, nm);
  if (n >= it.max) item.classList.add('dis');
  item.onclick = () => {
    sfx('click');
    if (n >= it.max) { showToast(`已經有 ${it.max} 個${it.name}囉～`); return; }
    if (!canPlaceNow()) return;
    startPlacement(id);
  };
  return item;
}

function wallCard(id, it) {
  const item = document.createElement('div');
  item.className = 'build-item pop-in';
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 84;
  const c2 = cv.getContext('2d');
  const n = countWallItem(id);
  const [wx, wy] = P(0.5, 0, -(it.hMid ?? 110));
  c2.save();
  c2.translate(64, 40);
  c2.scale(0.7, 0.7);
  c2.translate(-wx, -wy);
  const wpts = [P(-0.9, 0, -180), P(1.9, 0, -180), P(1.9, 0, -20), P(-0.9, 0, -20)];
  c2.fillStyle = '#FDF2DF';
  poly(c2, ...wpts);
  c2.strokeStyle = '#E4CBA5'; c2.lineWidth = 2;
  c2.beginPath(); c2.moveTo(wpts[0][0], wpts[0][1]);
  for (let i = 1; i < 4; i++) c2.lineTo(wpts[i][0], wpts[i][1]);
  c2.closePath(); c2.stroke();
  it.draw(c2, 'A', 0.5);
  c2.restore();
  const nm = document.createElement('div');
  nm.className = 'bi-name';
  nm.textContent = it.name + (n >= it.max ? `（${n}/${it.max}）` : '');
  item.append(cv, nm);
  if (n >= it.max) item.classList.add('dis');
  item.onclick = () => {
    sfx('click');
    if (n >= it.max) { showToast(`已經有 ${it.max} 個${it.name}囉～`); return; }
    if (!canPlaceNow()) return;
    startWallPlacement(id);
  };
  return item;
}

function canPlaceNow() {
  return ['tutBuild', 'free', 'goOut'].includes(Game.sub);
}

function startPlacement(itemId) {
  const item = BUILD_ITEMS[itemId];
  if (!item) return;
  const prevSub = Game.sub;
  closeBuildPanel();
  hideHint();
  setSub('placing');
  Game.placement = { mode: 'floor', item: itemId, prevSub, tx: 0, ty: 0, valid: false };
  const bar = $('#hint-bar');
  bar.textContent = `🛏️ 滑鼠移到喜歡的位置，點擊放下${item.name}！（Esc 取消）`;
  bar.classList.remove('hidden');
}

function startWallPlacement(id) {
  const item = WALL_ITEMS[id];
  if (!item) return;
  const prevSub = Game.sub;
  closeBuildPanel();
  hideHint();
  setSub('placing');
  const s = wallSlotFromMouse() || { wall: 'A', pos: 3 };
  Game.placement = { mode: 'wall', item: id, prevSub, wall: s.wall, pos: s.pos, valid: false };
  const bar = $('#hint-bar');
  bar.textContent = `🖼️ 把滑鼠移到牆上，點擊掛上${item.name}！（Esc 取消）`;
  bar.classList.remove('hidden');
}

function startRemoveMode() {
  const prevSub = Game.sub;
  closeBuildPanel();
  hideHint();
  setSub('placing');
  Game.placement = { mode: 'remove', prevSub, target: null };
  const bar = $('#hint-bar');
  bar.textContent = '🧹 移除模式：點家具或牆飾把它移走！（Esc 取消）';
  bar.classList.remove('hidden');
}

function cancelPlacement() {
  const prev = Game.placement ? Game.placement.prevSub : null;
  Game.placement = null;
  $('#hint-bar').classList.add('hidden');
  if (Game.sub === 'placing') {
    setSub(prev || (Game.stage === 'created' ? 'tutBuild' : 'free'));
    openBuildPanel();
  }
}

function fullSave(stage) {
  return {
    cfg: Game.playerCfg,
    furniture: Game.furniture,
    wallItems: Game.wallItems,
    tints: Game.tints,
    stage,
    money: Game.money ?? 100,
    gear: Game.gear ?? { uniform: false, hat: false },
  };
}

function setTint(kind, i) {
  Game.tints[kind] = i;
  setRoomTints(Game.tints.wall, Game.tints.floor);
  sfx('click');
  saveGame(fullSave(Game.stage));
  selectBuildTab('renovate', true);
  showToast(kind === 'wall' ? '牆面換色囉～' : '地板換色囉～');
}

function placeItem(itemId, tx, ty) {
  const item = BUILD_ITEMS[itemId];
  const prevSub = Game.placement ? Game.placement.prevSub : null;
  Game.furniture.push({ id: itemId, tx, ty });
  rebuildBlocked();
  Game.placement = null;
  $('#hint-bar').classList.add('hidden');
  sfx('place');
  if (itemId === 'bed' && Game.stage === 'created') {
    saveGame(fullSave('bed'));
    setSub('praise');
    Dialogue.start([
      { who: 'npc', name: '小宥', text: '哇塞，你真的是做得太好了！' },
    ], () => {
      setSub('goOut');
      showOutBtn();
      setTimeout(() => showHint($('#out-btn'), '點『出門』'), 700);
    });
  } else {
    saveGame(fullSave(Game.stage));
    showToast(`放好${item.name}囉～`);
    setSub(prevSub || 'free');
    openBuildPanel();
  }
}

function removeTargetFromMouse() {
  for (let i = 0; i < Game.wallItems.length; i++) {
    if (wallItemHit(Game.wallItems[i], Game.mouse.wx, Game.mouse.wy)) return { type: 'wall', idx: i };
  }
  const mtx = Math.floor(Game.mouse.tx), mty = Math.floor(Game.mouse.ty);
  for (let i = 0; i < Game.furniture.length; i++) {
    const f = Game.furniture[i];
    const it = BUILD_ITEMS[f.id];
    if (!it) continue;
    if (itemTiles(f.id, f.tx, f.ty).some(([x, y]) => x === mtx && y === mty)) return { type: 'floor', idx: i };
  }
  return null;
}

function removeItem(target) {
  if (!target) return;
  if (target.type === 'wall') {
    const w = Game.wallItems[target.idx];
    const it = WALL_ITEMS[w.id];
    Game.wallItems.splice(target.idx, 1);
    sfx('back');
    saveGame(fullSave(Game.stage));
    showToast(`移除了${it.name}～`);
  } else {
    const f = Game.furniture[target.idx];
    const it = BUILD_ITEMS[f.id];
    if (f.id === 'bed') { showToast('床是全屋最重要的家具，不能移除喔～'); return; }
    Game.furniture.splice(target.idx, 1);
    rebuildBlocked();
    sfx('back');
    saveGame(fullSave(Game.stage));
    showToast(`移除了${it.name}～`);
  }
  Game.placement.target = null;
}

/* ══════════ 角色自定義 UI ══════════ */
function setupCreateUI() {
  /* 性別 */
  for (const btn of document.querySelectorAll('#opt-gender .chip')) {
    btn.onclick = () => {
      sfx('click');
      const d = defaultConfig(btn.dataset.val);
      Game.playerCfg.gender = d.gender;
      /* 切換性別時同步重置造型模板（髮型/上衣/下裝/書包） */
      Game.playerCfg.hairStyle = d.hairStyle;
      Game.playerCfg.top = d.top;
      Game.playerCfg.bottom = d.bottom;
      Game.playerCfg.pack = d.pack;
      refreshCreateUI();
    };
  }
  /* 髮型 */
  fillChips('#opt-hairstyle', HAIR_STYLES, 'hairStyle');
  /* 顏色 */
  fillSwatches('#group-skin .swatches', PALETTES.skin, 'skin');
  fillSwatches('#group-hair .swatches', PALETTES.hair, 'hair');
  fillSwatches('#group-eye .swatches', PALETTES.eye, 'eye');
  fillSwatches('#group-nose .swatches', PALETTES.nose, 'nose');
  fillSwatches('#group-mouth .swatches', PALETTES.mouth, 'mouth');
  /* 形狀 */
  fillChips('#opt-eyeShape', EYE_SHAPES, 'eyeShape');
  fillChips('#opt-noseShape', NOSE_SHAPES, 'noseShape');
  fillChips('#opt-mouthShape', MOUTH_SHAPES, 'mouthShape');
  /* 服裝 */
  fillClothChips('#opt-top', PALETTES.top, 'top');
  fillClothChips('#opt-bottom', PALETTES.bottom, 'bottom');
}

function fillChips(sel, opts, key) {
  const box = document.querySelector(sel);
  box.innerHTML = '';
  for (const o of opts) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = o.name;
    b.onclick = () => { sfx('click'); Game.playerCfg[key] = o.id; refreshCreateUI(); };
    box.appendChild(b);
  }
}
function fillSwatches(sel, opts, key) {
  const box = document.querySelector(sel);
  box.innerHTML = '';
  for (const o of opts) {
    const s = document.createElement('button');
    s.className = 'swatch';
    s.style.background = o.c;
    s.dataset.name = o.name;
    s.setAttribute('aria-label', o.name);
    s.onclick = () => { sfx('click'); Game.playerCfg[key] = o.id; refreshCreateUI(); };
    box.appendChild(s);
  }
}
function fillClothChips(sel, opts, key) {
  const box = document.querySelector(sel);
  box.innerHTML = '';
  for (const o of opts) {
    const b = document.createElement('button');
    b.className = 'chip';
    const dot = document.createElement('i');
    dot.style.cssText = `display:inline-block;width:14px;height:14px;border-radius:50%;background:${o.c};border:2px solid rgba(122,82,54,.3);margin-right:6px;vertical-align:-2px;`;
    b.append(dot, document.createTextNode(o.name));
    b.onclick = () => { sfx('click'); Game.playerCfg[key] = o.id; refreshCreateUI(); };
    box.appendChild(b);
  }
}

function refreshCreateUI() {
  const cfg = Game.playerCfg;
  if (!cfg) return;
  for (const btn of document.querySelectorAll('#opt-gender .chip'))
    btn.classList.toggle('sel', btn.dataset.val === cfg.gender);
  const markChip = (sel, id) => {
    const box = document.querySelector(sel);
    if (!box) return;
    for (const c of box.children) {
      const txt = c.textContent;
      const opt = [...HAIR_STYLES, ...EYE_SHAPES, ...NOSE_SHAPES, ...MOUTH_SHAPES, ...PALETTES.top, ...PALETTES.bottom].find(o => o.name === txt);
      if (opt) c.classList.toggle('sel', opt.id === id);
    }
  };
  markChip('#opt-hairstyle', cfg.hairStyle);
  markChip('#opt-eyeShape', cfg.eyeShape);
  markChip('#opt-noseShape', cfg.noseShape);
  markChip('#opt-mouthShape', cfg.mouthShape);
  markChip('#opt-top', cfg.top);
  markChip('#opt-bottom', cfg.bottom);
  for (const group of ['skin', 'hair', 'eye', 'nose', 'mouth']) {
    const box = document.querySelector(`#group-${group} .swatches`);
    let i = 0;
    for (const s of box.children) {
      s.classList.toggle('sel', PALETTES[group][i].id === cfg[group]);
      i++;
    }
  }
  $('#preview-name').textContent = '小島（' + (cfg.gender === 'female' ? '女生' : '男生') + '）';
}

const previewBlink = makeBlinkState();
function updatePreview() {
  const cv = $('#preview-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  /* 小地板 */
  ctx.fillStyle = '#F6E1C6';
  ellipse(ctx, W / 2, H - 52, 105, 34);
  ctx.strokeStyle = 'rgba(122,82,54,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(W / 2, H - 52, 105, 34, 0, 0, Math.PI * 2);
  ctx.stroke();
  previewBlink.update(1 / 60, Game.t);
  drawCharacter(ctx, Game.playerCfg, {
    x: W / 2, y: H - 58,
    facing: 'down', t: Game.t, walking: false,
    scale: 2.1,
    blink: previewBlink.timer > 0 ? 1 : 0,
  });
}

/* ══════════ 啟動 ══════════ */
window.addEventListener('DOMContentLoaded', init);
