/* ══════════ 麥當勞打工：依訂單食譜組餐點給客人 ══════════
 * 主畫布渲染（sub = 'work'），DOM 只剩左上角 X。
 * 第十三輪b：資料驅動——每關有不同菜單/排隊人數/耐心/工資倍率。
 */
'use strict';

/* 第十三輪b：食材（+起司）/ 品項（食譜+價格）/ 五個關卡 */
const WORK_INGREDIENTS = [
  { id: 'bun', name: '麵包胚' },
  { id: 'meat', name: '肉片' },
  { id: 'tomato', name: '番茄' },
  { id: 'lettuce', name: '生菜' },
  { id: 'cheese', name: '起司' },
];
const WORK_ITEMS = {
  burger: { name: '經典漢堡', recipe: ['bun', 'meat', 'tomato', 'lettuce', 'bun'], price: 20 },
  toast: { name: '起司吐司', recipe: ['bun', 'cheese', 'bun'], price: 15 },
  veggie: { name: '蔬菜堡', recipe: ['bun', 'lettuce', 'tomato', 'cheese', 'bun'], price: 25 },
  double: { name: '雙層堡', recipe: ['bun', 'meat', 'cheese', 'meat', 'bun'], price: 30 },
  special: { name: '特製套餐', recipe: ['bun', 'meat', 'cheese', 'tomato', 'lettuce', 'bun'], price: 40 },
};
/* 每關：queue=排隊人數、patience=耐心秒數、payMul=工資倍率、rush=尖峰客機率、goals=[★1,★2,★3 完成數門檻]（第十三輪d） */
const WORK_LEVELS = [
  { id: 1, name: '新人上工', queue: 1, patience: 20, time: 60, payMul: 1.0, rush: 0, menu: ['toast', 'burger'], goals: [4, 8, 12] },
  { id: 2, name: '熟手班', queue: 2, patience: 16, time: 60, payMul: 1.2, rush: 0, menu: ['toast', 'burger', 'veggie'], goals: [4, 8, 12] },
  { id: 3, name: '忙碌時段', queue: 3, patience: 13, time: 60, payMul: 1.5, rush: 0, menu: ['burger', 'veggie', 'double'], goals: [4, 8, 11] },
  { id: 4, name: '午休尖峰', queue: 4, patience: 10, time: 60, payMul: 1.8, rush: 0.25, menu: ['veggie', 'double', 'special'], goals: [5, 8, 11] },
  { id: 5, name: '全店總動員', queue: 5, patience: 8, time: 60, payMul: 2.0, rush: 0.35, menu: ['double', 'special', 'burger'], goals: [5, 9, 12] },
];
const WORK_CARDS = WORK_INGREDIENTS.map((ing, i) => ({ ...ing, x: 110 + i * 190, y: 505 }));
const CARD_W = 150, CARD_H = 118;

let Work = null;

function startWork(lv = 1) {
  sfx('confirm');
  const level = WORK_LEVELS.find(l => l.id === lv) || WORK_LEVELS[0];
  Work = {
    phase: 'count', t: 0,
    left: level.time,
    level, /* 第十三輪b：關卡資料 */
    stack: [],
    flying: null,
    shake: 0,
    queue: [], /* 第十三輪c：排隊客人（[0] = 服務中） */
    customer: null, /* = queue 裡第一個 state 'queue' 的（服務中） */
    count: 0,
    misses: 0, /* 第十三輪c：氣走人數 */
    combo: 0, /* 第十三輪d：連續完成數（每 3 個 → +10 小費） */
    floaters: [],
  };
  while (Work.queue.length < level.queue) spawnCustomer(); /* 第十三輪c：一次補滿排隊 */
  $('#screen-shop').classList.add('hidden');
  $('#screen-work').classList.remove('hidden');
  setSub('work');
  syncMoneyUI();
}

/* 第十三輪b：商店關卡選擇列 */
function renderLevelList(ready) {
  const list = document.getElementById('level-list');
  list.innerHTML = '';
  const unlocked = (Game.work && Game.work.unlocked) || 1;
  for (const L of WORK_LEVELS) {
    const best = (Game.work && Game.work.best[L.id]) || 0;
    const locked = !ready || L.id > unlocked;
    const d = document.createElement('div');
    d.className = 'level-card' + (locked ? ' locked' : '');
    d.dataset.lv = L.id;
    d.innerHTML =
      `<div class="level-name">${ready && locked ? '🔒 ' : ''}${L.name}</div>` +
      `<div class="level-info">👤${L.queue} · ${L.menu.length}種 · ${L.time}s</div>` +
      `<div class="level-stars">${'★'.repeat(best)}${'☆'.repeat(3 - best)}</div>`;
    if (!locked) d.onclick = () => startWork(L.id);
    else d.onclick = () => {
      sfx('buzz');
      showToast(ready ? '先拿前一關的 ★1 就能解鎖！' : '先買制服＋帽子才能打工喔');
    };
    list.appendChild(d);
  }
}

function exitWork() {
  $('#screen-work').classList.add('hidden');
  Work = null;
  setSub('map');
}

function endWork() {
  const w = Work;
  const n = w ? w.count : 0;
  const stars = w ? calcStars(w) : 0;
  let extra = '';
  /* 第十三輪d：存最佳星數＋解鎖下一關 */
  if (w && stars >= 1) {
    Game.work.best[w.level.id] = Math.max(Game.work.best[w.level.id] || 0, stars);
    const before = Game.work.unlocked;
    if (w.level.id < WORK_LEVELS.length) Game.work.unlocked = Math.max(before, w.level.id + 1);
    if (Game.work.unlocked > before) extra = `、解鎖了「${WORK_LEVELS[Game.work.unlocked - 1].name}」`;
  }
  $('#screen-work').classList.add('hidden');
  Work = null;
  setSub('map');
  $('#screen-shop').classList.remove('hidden');
  fillShopUI();
  saveGameEndShift();
  showToast(stars >= 1
    ? `下工囉！${n} 個品項・${'★'.repeat(stars)}${extra}`
    : (n > 0 ? `下工囉！做了 ${n} 個品項，再快點就能拿 ★ 了` : '下工囉！下次加油 🍔'));
}

/* 第十三輪b：下工存檔用 fullSave（舊版漏存牆飾/換色），並存入關卡進度 */
function saveGameEndShift() {
  const s = fullSave('done');
  s.work = Game.work;
  saveGame(s);
}

/* 第十三輪c：排隊位置（[0] 在櫃台前；越往後越遠＝越小越高） */
function queueSlot(i) {
  return [700 - i * 95, 430 - i * 14, Math.max(0.48, 1 - i * 0.13)];
}

function spawnCustomer() {
  const hairs = ['#5A3E2B', '#3B2A1F', '#8A5A3B', '#2F2A26', '#7A4A3A'];
  const skins = ['#FFE9D4', '#F8D9B8', '#EFC39A', '#D9A87C'];
  const rnd = Math.random;
  const w = Work, L = w.level;
  const item = WORK_ITEMS[L.menu[Math.floor(rnd() * L.menu.length)]]; /* 第十三輪b：隨機點單品項 */
  const rush = rnd() < L.rush; /* 第十三輪c：尖峰客（耐心×0.6、工資×1.5） */
  const pat = Math.round(L.patience * (rush ? 0.6 : 1));
  const [sx, sy, ss] = queueSlot(w.queue.filter(c => c.state === 'queue').length);
  w.queue.push({
    item, /* { name, recipe, price } */
    rush, patience: pat, patienceMax: pat,
    hair: hairs[Math.floor(rnd() * hairs.length)],
    skin: skins[Math.floor(rnd() * skins.length)],
    bob: rnd() * 10,
    x: sx, y: sy, scale: 0, tx: sx, ty: sy, tScale: ss,
    state: 'queue', /* queue → served / angry */
    animT: 0,
  });
}

/* 點擊食材卡（game.js 轉調） */
function workClick(i) {
  const w = Work;
  if (!w || w.phase !== 'play' || w.flying || !w.customer) return;
  const need = w.customer.item.recipe[w.stack.length]; /* 第十三輪b：依當前訂單食譜 */
  if (WORK_CARDS[i].id === need) {
    w.stack.push(need);
    sfx('place');
    if (w.stack.length === w.customer.item.recipe.length) {
      w.flying = { t: 0 };
      sfx('fly');
    }
  } else {
    w.shake = 0.35;
    w.combo = 0; /* 第十三輪d：點錯中斷連擊 */
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
    for (const c of w.queue) c.scale += (c.tScale - c.scale) * Math.min(1, dt * 4); /* 第十三輪c：倒數時排隊客長大入場 */
    if (w.t >= 3) w.phase = 'play';
    return;
  }
  if (w.phase === 'play') {
    if (w.flying) {
      w.flying.t += dt / 0.55;
      if (w.flying.t >= 1) {
        w.flying = null;
        const c = w.customer;
        const pay = Math.round(c.item.price * w.level.payMul * (c.rush ? 1.5 : 1)); /* 第十三輪c：尖峰客 +50% */
        c.state = 'served'; c.animT = 0; /* 第十三輪c：滿意走人 */
        w.stack = [];
        w.count += 1;
        Game.money += pay;
        w.floaters.push({ x: 700, y: 330, t: 0, txt: `+${pay}` });
        /* 第十三輪d：連擊小費（每 3 個連環完成 +10） */
        w.combo += 1;
        if (w.combo % 3 === 0) {
          Game.money += 10;
          w.floaters.push({ x: 300, y: 392, t: 0, txt: '🔥 連擊小費 +10' });
        }
        sfx('coin');
        syncMoneyUI();
      }
    }
    /* 第十三輪c：排隊動畫＋耐心值＋補客 */
    for (const c of w.queue)
      if (c.state !== 'queue') c.animT += dt;
    w.queue = w.queue.filter(c => !(c.state !== 'queue' && c.animT >= 0.9));
    w.customer = w.queue.find(c => c.state === 'queue') || null;
    let qi = 0;
    for (const c of w.queue) {
      if (c.state !== 'queue') {
        c.x += (c.state === 'served' ? 240 : -240) * dt; /* 滿意→右、氣走→左 */
        c.scale = Math.max(0, c.scale - dt * 0.8);
        continue;
      }
      const [qx, qy, qs] = queueSlot(qi++);
      c.tx = qx; c.ty = qy; c.tScale = qs;
      const k = Math.min(1, dt * 5);
      c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.scale += (c.tScale - c.scale) * k;
    }
    while (w.queue.filter(c => c.state === 'queue').length < w.level.queue) spawnCustomer();
    const act = w.customer;
    if (act) {
      act.patience -= dt;
      if (act.patience <= 0) {
        act.patience = 0; act.state = 'angry'; act.animT = 0;
        w.misses += 1;
        w.combo = 0; /* 第十三輪d：連擊中斷 */
        if (w.flying) w.flying = null; /* 在半空的餐點作廢 */
        w.stack = []; /* 已疊的料報廢 */
        w.floaters.push({ x: act.x, y: act.y - 120, t: 0, txt: '💢 走了！' });
        sfx('buzz');
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
    if (w.t >= 4.2) endWork(); /* 第十三輪d：結算畫面停 4.2s */
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
  ctx.font = '900 42px RHR'; /* 第十三輪a：RHR 圓體加粗 */
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('打工時間！', 490, 204);

  /* 櫃台 */
  handShape(ctx, [[60, 470], [920, 470], [920, 535], [60, 535]], { fill: '#D9A87C', seed: 74 });
  ctx.fillStyle = '#C89468';
  ctx.fillRect(70, 535, 840, 10);

  /* 計時圈 */
  const frac = w.left / w.level.time;
  ctx.strokeStyle = '#E8D9C2';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(490, 92, 42, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = w.left < 10 ? '#D94F4F' : '#7A9E5E';
  ctx.beginPath();
  ctx.arc(490, 92, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  ctx.fillStyle = w.left < 10 ? '#D94F4F' : '#5A3E2B';
  ctx.font = '700 34px RHR';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(Math.ceil(w.left), 490, 94);
  /* 第十三輪b：關卡名 */
  ctx.fillStyle = '#8A6E52';
  ctx.font = '700 22px RHR';
  ctx.fillText(`${w.level.id} 關・${w.level.name}`, 490, 152);

  /* 金額（右上） */
  handEllipse(ctx, 852, 70, 17, 17, { fill: '#FFD98A', lw: 3, seed: 75 });
  ctx.fillStyle = '#5A3E2B';
  ctx.font = '700 30px RHR';
  ctx.textAlign = 'left';
  ctx.fillText(String(Game.money), 878, 72);

  /* 完成數（左上） */
  ctx.fillStyle = '#5A3E2B';
  ctx.font = '700 30px RHR';
  ctx.textAlign = 'left';
  ctx.fillText(`做了 ${w.count} 個`, 60, 72);
  /* 第十三輪d：連擊顯示 */
  if (w.combo >= 2) {
    ctx.fillStyle = '#B9473F';
    ctx.font = '800 22px RHR';
    ctx.textAlign = 'left';
    ctx.fillText(`🔥 連擊 x${w.combo}`, 60, 106);
  }

  /* 第十三輪c：排隊客人（由後往前畫＝遠的在後、近的前）＋訂單氣泡＋耐心條 */
  for (let i = w.queue.length - 1; i >= 0; i--) {
    const c = w.queue[i];
    const leaving = c.state !== 'queue';
    ctx.globalAlpha = leaving ? Math.max(0, 1 - c.animT / 0.9) : 1;
    drawCustomer(ctx, c.x, c.y, c, t);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (c.state === 'queue' && c.rush) {
      ctx.font = '700 24px RHR';
      ctx.fillText('⚡', c.x + 36 * c.scale, c.y - 84 * c.scale);
    }
    if (c.state === 'served') { ctx.font = '700 28px RHR'; ctx.fillText('💖', c.x, c.y - 96); }
    if (c.state === 'angry') { ctx.font = '700 30px RHR'; ctx.fillText('💢', c.x, c.y - 96); }
    if (c.state === 'queue' && c !== w.customer)
      drawMenuItem(ctx, c.item, c.x, c.y - 104 * c.scale, 0.2); /* 排隊中的訂單小圖示 */
    ctx.globalAlpha = 1;
  }
  if (w.customer) {
    const c = w.customer;
    const bx = 700, by = 168;
    handShape(ctx, [[bx - 78, by - 46], [bx + 78, by - 46], [bx + 78, by + 40], [bx - 78, by + 40]],
      { fill: '#FFF8EC', seed: 76, amp: 2 });
    handShape(ctx, [[bx + 18, by + 40], [bx + 44, by + 40], [bx + 30, by + 62]], { fill: '#FFF8EC', seed: 77, amp: 1 });
    ctx.fillStyle = '#5A3E2B';
    ctx.font = '700 26px RHR';
    ctx.textAlign = 'center';
    ctx.fillText(c.item.name, bx, by - 20); /* 第十三輪b：顯示品項名 */
    drawMenuItem(ctx, c.item, bx, by + 14, 0.5);
    /* 第十三輪c：耐心條（服務中客人頭上） */
    const pf = c.patience / c.patienceMax, pw = 74;
    ctx.fillStyle = 'rgba(90,62,43,.18)';
    roundRectPath(ctx, 700 - pw / 2, 328, pw, 9, 4.5);
    ctx.fill();
    if (pf > 0) {
      ctx.fillStyle = pf > 0.5 ? '#7A9E5E' : pf > 0.25 ? '#E8A13C' : '#D94F4F';
      roundRectPath(ctx, 700 - pw / 2, 328, Math.max(6, pw * pf), 9, 4.5);
      ctx.fill();
    }
  }

  /* 盤子 + 疊起的料 */
  handEllipse(ctx, 300, 452, 62, 16, { fill: '#FFFFFF', lw: 3, seed: 78 });
  for (let i = 0; i < w.stack.length; i++)
    drawIngredient(ctx, w.stack[i], 300, 440 - i * 13, 1);

  /* 飛向客人的餐點 */
  if (w.flying) {
    const ft = easeOutQuad(w.flying.t);
    const x = lerp(300, 700, ft);
    const y = lerp(420, 372, ft) - Math.sin(ft * Math.PI) * 70;
    drawMenuItem(ctx, w.customer.item, x, y, 0.75 + 0.05 * Math.sin(ft * Math.PI));
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
    ctx.font = '600 24px RHR';
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
    ctx.font = '900 130px RHR';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
  }
  /* 第十三輪d：下工結算（星星評價＋新紀錄，取代舊版單句「時間到」） */
  if (w.phase === 'end') {
    const p = Math.min(1, w.t / 0.4);
    ctx.fillStyle = `rgba(90,62,43,${0.45 * p})`;
    ctx.fillRect(0, 0, VW, VH);
    ctx.save();
    ctx.globalAlpha = p;
    const px = 490, py = 300;
    handShape(ctx, [[px - 215, py - 135], [px + 215, py - 135], [px + 215, py + 135], [px - 215, py + 135]],
      { fill: '#FFF8EC', seed: 93, amp: 3 });
    const stars = calcStars(w);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#B9473F';
    ctx.font = '900 40px RHR';
    ctx.fillText('⏰ 下工時間到！', px, py - 84);
    ctx.fillStyle = '#5A4632';
    ctx.font = '700 26px RHR';
    ctx.fillText(`做了 ${w.count} 個品項`, px, py - 32);
    if (w.misses > 0) {
      ctx.fillStyle = '#8A6E52';
      ctx.font = '600 20px RHR';
      ctx.fillText(`氣走 ${w.misses} 人`, px, py);
    }
    for (let i = 0; i < 3; i++) {
      const st = w.t - 0.8 - i * 0.3;
      const pop = st < 0 ? 0.55 : 1 + 0.35 * Math.sin(Math.min(1, st / 0.3) * Math.PI / 2);
      ctx.save();
      ctx.translate(px + (i - 1) * 66, py + 56);
      ctx.scale(pop, pop);
      ctx.globalAlpha = p * (st < 0 ? 0.35 : 1);
      ctx.font = '900 56px RHR';
      ctx.fillStyle = i < stars ? '#F5B84C' : 'rgba(90,62,43,.22)';
      ctx.fillText('★', 0, 0);
      ctx.restore();
    }
    const prevBest = (Game.work.best[w.level.id]) || 0;
    ctx.globalAlpha = p;
    if (stars > prevBest && stars >= 1) {
      ctx.fillStyle = '#B9473F';
      ctx.font = '800 24px RHR';
      ctx.fillText('✨ 新紀錄！', px, py + 106);
    } else if (stars >= 1) {
      ctx.fillStyle = '#8A6E52';
      ctx.font = '600 20px RHR';
      ctx.fillText('回商店看進度', px, py + 106);
    } else {
      ctx.fillStyle = '#8A6E52';
      ctx.font = '600 20px RHR';
      ctx.fillText(`做滿 ${w.level.goals[0]} 個就能拿 ★ 了！`, px, py + 106);
    }
    ctx.restore();
  }

  /* 浮字 +20 */
  for (const f of w.floaters) {
    ctx.globalAlpha = 1 - f.t / 1.1;
    ctx.fillStyle = '#B9793F';
    ctx.font = '700 36px RHR';
    ctx.textAlign = 'center';
    ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}

/* 第十三輪d：依完成數算星星 */
function calcStars(w) {
  const g = w.level.goals;
  return w.count >= g[2] ? 3 : w.count >= g[1] ? 2 : w.count >= g[0] ? 1 : 0;
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

/* 第十三輪b：品項小圖示（依食譜疊出，每樣餐點長得不一樣） */
function drawMenuItem(ctx, item, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const r = item.recipe, gap = 13, y0 = (r.length - 1) * gap / 2;
  for (let i = 0; i < r.length; i++)
    drawIngredient(ctx, r[i], 0, y0 - i * gap, 0.55);
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
    case 'cheese': /* 第十三輪b：新食材 */
      ctx.fillStyle = '#FFD966';
      ctx.strokeStyle = '#E8B93C';
      ctx.lineWidth = 2.5;
      roundRectPath(ctx, -30, -12, 60, 24, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F0BE45';
      for (const [sx, sy] of [[-16, -4], [2, 3], [18, -5]]) {
        ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      }
      break;
  }
  ctx.restore();
}

function drawCustomer(ctx, x, y, c, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(c.scale || 1, c.scale || 1); /* 第十三輪c：排隊深度縮放 */
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
