/* ══════════ 麥當勞打工：固定順序組漢堡給客人 ══════════
 * 主畫布渲染（sub = 'work'），DOM 只剩左上角 X。
 * 固定食譜：麵包胚 → 肉片 → 番茄 → 生菜 → 麵包胚。
 */
'use strict';

const WORK_RECIPE = ['bun', 'meat', 'tomato', 'lettuce', 'bun'];
const WORK_DUR = 60;
const WORK_CARDS = [
  { id: 'bun', name: '麵包胚', x: 130, y: 505 },
  { id: 'meat', name: '肉片', x: 315, y: 505 },
  { id: 'tomato', name: '番茄', x: 500, y: 505 },
  { id: 'lettuce', name: '生菜', x: 685, y: 505 },
];
const CARD_W = 150, CARD_H = 118;

let Work = null;

function startWork() {
  sfx('confirm');
  Work = {
    phase: 'count', t: 0,
    left: WORK_DUR,
    stack: [],
    flying: null,
    shake: 0,
    customer: null,
    count: 0,
    floaters: [],
  };
  spawnCustomer();
  $('#screen-shop').classList.add('hidden');
  $('#screen-work').classList.remove('hidden');
  setSub('work');
  syncMoneyUI();
}

function exitWork() {
  $('#screen-work').classList.add('hidden');
  Work = null;
  setSub('map');
}

function endWork() {
  const n = Work ? Work.count : 0;
  $('#screen-work').classList.add('hidden');
  Work = null;
  setSub('map');
  $('#screen-shop').classList.remove('hidden');
  fillShopUI();
  saveGame({ cfg: Game.playerCfg, furniture: Game.furniture, stage: 'done', money: Game.money, gear: Game.gear });
  showToast(`下工囉！這趟做了 ${n} 個漢堡 🍔`);
}

function spawnCustomer() {
  const hairs = ['#5A3E2B', '#3B2A1F', '#8A5A3B', '#2F2A26', '#7A4A3A'];
  const skins = ['#FFE9D4', '#F8D9B8', '#EFC39A', '#D9A87C'];
  const rnd = Math.random;
  Work.customer = {
    hair: hairs[Math.floor(rnd() * hairs.length)],
    skin: skins[Math.floor(rnd() * skins.length)],
    bob: rnd() * 10,
  };
}

/* 點擊食材卡（game.js 轉調） */
function workClick(i) {
  const w = Work;
  if (!w || w.phase !== 'play' || w.flying) return;
  const need = WORK_RECIPE[w.stack.length];
  if (WORK_CARDS[i].id === need) {
    w.stack.push(need);
    sfx('place');
    if (w.stack.length === WORK_RECIPE.length) {
      w.flying = { t: 0 };
      sfx('fly');
    }
  } else {
    w.shake = 0.35;
    sfx('buzz');
  }
}

function updateWork(dt) {
  const w = Work;
  if (!w) return;
  w.shake = Math.max(0, w.shake - dt);
  w.floaters = w.floaters.filter(f => (f.t += dt) < 1.1);
  for (const f of w.floaters) f.y -= 34 * dt;

  if (w.phase === 'count') {
    w.t += dt;
    if (w.t >= 3) w.phase = 'play';
    return;
  }
  if (w.phase === 'play') {
    if (w.flying) {
      w.flying.t += dt / 0.55;
      if (w.flying.t >= 1) {
        w.flying = null;
        w.stack = [];
        w.count += 1;
        Game.money += 20;
        w.floaters.push({ x: 700, y: 330, t: 0, txt: '+20' });
        sfx('coin');
        syncMoneyUI();
        spawnCustomer();
      }
    }
    w.left -= dt;
    if (w.left <= 0) {
      w.left = 0;
      w.phase = 'end';
      w.t = 0;
    }
    return;
  }
  if (w.phase === 'end') {
    w.t += dt;
    if (w.t >= 1.2) endWork();
  }
}

/* ── 渲染 ── */
function renderWork(ctx, t) {
  const w = Work;
  if (!w) return;

  /* 廚房背景 */
  ctx.fillStyle = '#FDF3E3';
  ctx.fillRect(0, 0, VW, 470);
  ctx.fillStyle = '#EAD9BF';
  ctx.fillRect(0, 470, VW, VH - 470);
  handLineLong(ctx, 0, 470, VW, 470, { seed: 71, amp: 2, lw: 3 });
  /* 牆上木條線 + 招牌 */
  handLineLong(ctx, 0, 130, VW, 130, { stroke: '#E4CDA8', seed: 72, amp: 1.5, lw: 8 });
  handShape(ctx, [[360, 170], [620, 170], [620, 232], [360, 232]], { fill: '#F7EBD3', seed: 73 });
  ctx.fillStyle = '#B9473F';
  ctx.font = '40px "Long Cang", cursive';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('打工時間！', 490, 204);

  /* 櫃台 */
  handShape(ctx, [[60, 470], [920, 470], [920, 535], [60, 535]], { fill: '#D9A87C', seed: 74 });
  ctx.fillStyle = '#C89468';
  ctx.fillRect(70, 535, 840, 10);

  /* 計時圈 */
  const frac = w.left / WORK_DUR;
  ctx.strokeStyle = '#E8D9C2';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(490, 92, 42, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = w.left < 10 ? '#D94F4F' : '#7A9E5E';
  ctx.beginPath();
  ctx.arc(490, 92, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  ctx.fillStyle = w.left < 10 ? '#D94F4F' : '#5A3E2B';
  ctx.font = '34px "Long Cang", cursive';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(Math.ceil(w.left), 490, 94);

  /* 金額（右上） */
  handEllipse(ctx, 852, 70, 17, 17, { fill: '#FFD98A', lw: 3, seed: 75 });
  ctx.fillStyle = '#5A3E2B';
  ctx.font = '30px "Long Cang", cursive';
  ctx.textAlign = 'left';
  ctx.fillText(String(Game.money), 878, 72);

  /* 完成數（左上） */
  ctx.fillStyle = '#5A3E2B';
  ctx.font = '30px "Long Cang", cursive';
  ctx.textAlign = 'left';
  ctx.fillText(`做了 ${w.count} 個`, 60, 72);

  /* 客人 + 訂單氣泡 */
  if (w.customer) drawCustomer(ctx, 700, 428, w.customer, t);
  const bx = 700, by = 168;
  handShape(ctx, [[bx - 78, by - 46], [bx + 78, by - 46], [bx + 78, by + 40], [bx - 78, by + 40]],
    { fill: '#FFF8EC', seed: 76, amp: 2 });
  handShape(ctx, [[bx + 18, by + 40], [bx + 44, by + 40], [bx + 30, by + 62]], { fill: '#FFF8EC', seed: 77, amp: 1 });
  ctx.fillStyle = '#5A3E2B';
  ctx.font = '26px "Long Cang", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('幫我做這個！', bx, by - 20);
  drawBurger(ctx, bx, by + 16, 0.55);

  /* 盤子 + 疊起的料 */
  handEllipse(ctx, 300, 452, 62, 16, { fill: '#FFFFFF', lw: 3, seed: 78 });
  for (let i = 0; i < w.stack.length; i++)
    drawIngredient(ctx, w.stack[i], 300, 440 - i * 13, 1);

  /* 飛向客人的漢堡 */
  if (w.flying) {
    const ft = easeOutQuad(w.flying.t);
    const x = lerp(300, 700, ft);
    const y = lerp(420, 372, ft) - Math.sin(ft * Math.PI) * 70;
    drawBurger(ctx, x, y, 0.9 + 0.1 * Math.sin(ft * Math.PI));
  }

  /* 食材卡（放錯會整排抖一下） */
  const sh = w.shake > 0 ? Math.sin(w.shake * 40) * 4 * (w.shake / 0.35) : 0;
  for (let i = 0; i < WORK_CARDS.length; i++) {
    const c = WORK_CARDS[i];
    const x0 = c.x - CARD_W / 2 + sh, y0 = c.y;
    handShape(ctx, [[x0, y0], [x0 + CARD_W, y0], [x0 + CARD_W, y0 + CARD_H], [x0, y0 + CARD_H]],
      { fill: i % 2 ? '#FFF3DC' : '#FFFBF2', seed: 80 + i, amp: 2 });
    drawIngredient(ctx, c.id, c.x + sh, y0 + 44, 0.9);
    ctx.fillStyle = '#5A3E2B';
    ctx.font = '24px "Long Cang", cursive';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.name, c.x + sh, y0 + CARD_H - 24);
  }

  /* 3-2-1 倒數 */
  if (w.phase === 'count') {
    const n = 3 - Math.floor(w.t);
    const fr = w.t % 1;
    const sc = 1 + 0.35 * (1 - fr);
    ctx.fillStyle = 'rgba(90,62,43,0.35)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.save();
    ctx.translate(490, 300);
    ctx.scale(sc, sc);
    ctx.fillStyle = '#FFF8EC';
    ctx.font = '900 130px "Long Cang", cursive';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
  }
  if (w.phase === 'end') {
    ctx.fillStyle = 'rgba(90,62,43,0.35)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#FFF8EC';
    ctx.font = '900 84px "Long Cang", cursive';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⏰ 時間到！', 490, 300);
  }

  /* 浮字 +20 */
  for (const f of w.floaters) {
    ctx.globalAlpha = 1 - f.t / 1.1;
    ctx.fillStyle = '#B9793F';
    ctx.font = '36px "Long Cang", cursive';
    ctx.textAlign = 'center';
    ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}

/* ── 圖形小零件 ── */
function drawBurger(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  /* 下麵包 */
  handEllipse(ctx, 0, 16, 34, 13, { fill: '#F2B05C', stroke: null, seed: 91 });
  /* 生菜 */
  ctx.fillStyle = '#8FC47E';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.arc(i * 13, 8, 8, 0, Math.PI); ctx.fill();
  }
  /* 肉片 */
  handShape(ctx, [[-32, -2], [32, -2], [32, 9], [-32, 9]], { fill: '#8A5A3B', stroke: null, seed: 92, amp: 1.5 });
  /* 番茄 */
  ctx.fillStyle = '#E86A5A';
  ctx.beginPath(); ctx.ellipse(-12, -8, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14, -8, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
  /* 上麵包 */
  ctx.fillStyle = '#F2B05C';
  ctx.beginPath(); ctx.arc(0, -10, 34, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  /* 芝麻 */
  ctx.fillStyle = '#FFF3DC';
  for (const [sx, sy] of [[-16, -26], [-4, -31], [10, -28], [19, -21]]) {
    ctx.beginPath(); ctx.ellipse(sx, sy, 2.6, 1.7, 0.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawIngredient(ctx, id, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  switch (id) {
    case 'bun':
      ctx.fillStyle = '#F2B05C';
      ctx.beginPath(); ctx.arc(0, 4, 32, Math.PI, 0); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#FFF3DC';
      for (const [sx, sy] of [[-15, -10], [-3, -14], [10, -11], [18, -4]]) {
        ctx.beginPath(); ctx.ellipse(sx, sy, 2.5, 1.6, 0.4, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'meat':
      handShape(ctx, [[-32, -8], [32, -8], [32, 8], [-32, 8]], { fill: '#8A5A3B', seed: 93, amp: 1.5 });
      ctx.fillStyle = '#6E4429';
      for (const [sx, sy] of [[-16, 0], [2, 2], [16, -2]]) {
        ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'tomato':
      ctx.fillStyle = '#E86A5A';
      ctx.strokeStyle = '#C24F42';
      ctx.lineWidth = 2;
      for (const sx of [-14, 14]) {
        ctx.beginPath(); ctx.ellipse(sx, 0, 15, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      break;
    case 'lettuce':
      ctx.fillStyle = '#8FC47E';
      ctx.strokeStyle = '#6FA85E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-32, 2);
      for (let i = -32; i <= 16; i += 16)
        ctx.quadraticCurveTo(i + 8, -9, i + 16, 2);
      ctx.lineTo(32, 6);
      for (let i = 32; i >= -16; i -= 16)
        ctx.quadraticCurveTo(i - 8, 13, i - 16, 6);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
  }
  ctx.restore();
}

function drawCustomer(ctx, x, y, c, t) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t * 2 + c.bob) * 2;
  /* 身體 */
  ctx.fillStyle = '#7FA8C9';
  roundRectPath(ctx, -26, -34 + bob, 52, 44, 14);
  ctx.fill();
  /* 頭 */
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(0, -52 + bob, 27, 0, Math.PI * 2); ctx.fill();
  /* 頭髮 */
  ctx.fillStyle = c.hair;
  ctx.beginPath(); ctx.arc(0, -54 + bob, 27, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
  /* 臉 */
  ctx.fillStyle = '#3B2A1F';
  ctx.beginPath(); ctx.arc(-9, -50 + bob, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(9, -50 + bob, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3B2A1F';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -42 + bob, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}
