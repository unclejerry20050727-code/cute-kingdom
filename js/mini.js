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

/* ══════════ 第三十輪 30-4：釣魚（釣魚課）══════════ */
const FISH_TABLE = {
  minnow: { id: 'minnow', name: '小魚', coins: 8,  win: 1.1 },
  color:  { id: 'color',  name: '彩魚', coins: 15, win: 0.9 },
  crab:   { id: 'crab',   name: '青蟹', coins: 25, win: 0.7 },
  puffer: { id: 'puffer', name: '金魚', coins: 40, win: 0.5 },
};
/* 32-1：分區魚表——越遠越稀有（金魚只在深處）；wait=等待秒數範圍 */
const FISH_ZONES = [
  { id: 'near', label: '近・淺水', x: 470, y: 480, wait: [1.2, 2.6], table: [['minnow', 70], ['color', 25], ['crab', 5]] },
  { id: 'mid',  label: '中・中湖', x: 620, y: 465, wait: [2.0, 4.0], table: [['minnow', 30], ['color', 50], ['crab', 20]] },
  { id: 'far',  label: '遠・深處', x: 770, y: 450, wait: [3.0, 6.0], table: [['color', 40], ['crab', 35], ['puffer', 25]] },
];

let Fish = null;

function rollZoneFish(zoneIdx) {
  const zone = FISH_ZONES[zoneIdx];
  const total = zone.table.reduce((s, r) => s + r[1], 0);
  let r = Math.random() * total;
  for (const [id, w] of zone.table) { r -= w; if (r <= 0) return FISH_TABLE[id]; }
  return FISH_TABLE[zone.table[0][0]];
}

/* 33-3：抽一輪（魚+size 0.6~4.0+等待+假咬+魚影） */
function rollWaitFish(F) {
  F.fish = rollZoneFish(F.zoneIdx);
  const r = Math.random();
  F.size = r < 0.55 ? 0.6 + Math.random() * 0.6      /* 小 0.6~1.2 */
         : r < 0.85 ? 1.2 + Math.random() * 1.0      /* 中 1.2~2.2 */
         : 2.2 + Math.random() * 1.8;                /* 大 2.2~4.0（=舊最大 4×） */
  const [w0, w1] = FISH_ZONES[F.zoneIdx].wait;
  F.biteAt = w0 + Math.random() * (w1 - w0);
  F.nibbles = [];
  const n = Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) F.nibbles.push(0.35 + Math.random() * 0.55);
  F.nibbles.sort((a, b) => a - b);
  F.dipT = null;
  F.jig = null;
  F.jigglesLeft = 2; /* 33-1：每次拋竿限 2 次逗引 */
  F.hover = false; F.patienceAt = 0; /* 34-2：猶豫期 */
  const z = F.castLand;
  F.shade = { x0: z.x + (Math.random() < 0.5 ? -1 : 1) * (140 + Math.random() * 80), y0: z.y + 12 + Math.random() * 26, st: 'in', t: 0, leave: false }; /* 33-3：魚影 */
}

function startFishing() {
  if (!hasCourse('fishing')) { showToast('🎣 先上『釣魚課』才能釣魚喔～'); return; }
  sfx('pop');
  Fish = {
    state: 'ready', t: 0, power: 0, zoneIdx: 1, biteAt: 0, nibbles: [], dipT: null,
    fish: null, size: 1, coins: 0, floaters: [], splashes: [],
    castFrom: null, castLand: null, releaseAngle: -0.44,
    school: initFishSchool(), jumpAt: 5 + Math.random() * 6,
    jig: null, jigglesLeft: 2, shade: null, reel: null, hover: false, patienceAt: 0, /* 33-1~34-2：逗引/搏鬥/魚影/猶豫期 */
  };
  $('#screen-fish').classList.remove('hidden');
  setSub('fish');
  setFishUI('長按 🎣 蓄力，放開拋竿！越遠越稀有～'); /* 32-1 */
}

function exitFishing() {
  $('#screen-fish').classList.add('hidden');
  Fish = null;
  setSub('map');
}

function setFishUI(msg) {
  const btn = $('#fish-act');
  if (!btn || !Fish) return;
  const rec = $('#fish-recast');
  if (rec) rec.classList.toggle('hidden', !['wait', 'bite', 'reel'].includes(Fish.state)); /* 34-4：竿在水中才顯示 */
  if (Fish.state === 'ready') { btn.textContent = '🎣 長按蓄力'; btn.disabled = false; btn.classList.remove('hot'); }
  else if (Fish.state === 'charge') { btn.textContent = '🎣 蓄力中…'; btn.disabled = false; btn.classList.remove('hot'); }
  else if (Fish.state === 'cast') { btn.textContent = '🎣 拋竿…'; btn.disabled = true; btn.classList.remove('hot'); }
  else if (Fish.state === 'wait') {
    if (Fish.jig) { btn.textContent = '🪝 拉線中…'; btn.classList.remove('hot'); }
    else if (Fish.hover) { btn.textContent = '🪝 輕輕拉！'; btn.classList.add('hot'); } /* 34-2：魚來了，誘咬時機 */
    else { btn.textContent = '🎣 長按輕拉逗魚'; btn.classList.remove('hot'); }
    btn.disabled = false;
  }
  else if (Fish.state === 'bite') { btn.textContent = '💦 撈！'; btn.disabled = false; btn.classList.add('hot'); }
  else if (Fish.state === 'reel') { btn.textContent = '🪝 猛按收線！'; btn.disabled = false; btn.classList.add('hot'); } /* 33-2 */
  else { btn.textContent = '🎣 …'; btn.disabled = true; btn.classList.remove('hot'); } /* caught/missed：短暫動畫 */
  if (msg) $('#fish-msg').textContent = msg;
}

function fishAction() {
  if (!Fish) return;
  if (Fish.state === 'ready') {
    Fish.state = 'charge'; Fish.t = 0; Fish.power = 0;
    sfx('blip');
    setFishUI();
  } else if (Fish.state === 'wait') {
    if (!Fish.jig) { Fish.jig = { t: 0 }; sfx('blip'); setFishUI(); } /* 33-1：長按開始逗引 */
  } else if (Fish.state === 'bite') {
    /* 33-2：中魚→搏鬥（不再直接上陸） */
    Fish.state = 'reel'; Fish.t = 0;
    Fish.reel = { prog: 20, burstAt: 1.0 + Math.random() * 0.6, dashT: 0 };
    sfx('ding');
    setFishUI('上鉤了！猛按按鈕拉線，把它拉上來！');
  } else if (Fish.state === 'reel') {
    /* 34-3：每按收一截（魚發力破水中按壓無效） */
    const R = Fish.reel;
    if (R.dashT > 0) {
      sfx('buzz');
    } else {
      R.prog += 8 + Math.random() * 6;
      const z = Fish.castLand;
      if (z) Fish.splashes.push({ x: z.x + (Math.random() * 20 - 10), y: z.y, t: 0.35 });
      sfx('tick');
      if (R.prog >= 100) landFish();
    }
  }
}

/* 33-2：上陸——代幣=基礎×size；size≥2.0 大獲再×1.5 */
function landFish() {
  const f = Fish.fish;
  let coins = Math.round(f.coins * Fish.size);
  const big = Fish.size >= 2.0;
  if (big) coins = Math.round(coins * 1.5);
  Fish.coins = coins;
  Game.fish.caught += 1;
  Game.money += coins;
  Fish.state = 'caught'; Fish.t = 0; Fish.reel = null;
  const lx = Fish.castLand ? Fish.castLand.x : 560;
  Fish.floaters.push({ text: `+${coins}`, x: lx + 60, y: 420, t: 0 });
  scatterSchool();
  sfx('coin');
  syncMoneyUI();
  setFishUI(big ? `🎉 大獲！${f.name}！+${coins} 元` : `撈到${f.name}！+${coins} 元`);
  saveGame(fullSave('done'));
}

/* 32-1：放開→按蓄力力度拋竿；33-1：wait 中放開=結束逗引（輕拉吸引/太猛嚇跑） */
function releaseCast() {
  if (!Fish) return;
  if (Fish.state === 'charge') {
    const p = Fish.power;
    Fish.zoneIdx = p < 0.33 ? 0 : p < 0.66 ? 1 : 2;
    Fish.releaseAngle = rodAngle(Fish); /* 32-3：記下後拉角度供甩竿動畫 */
    const tip = rodTipPos(Fish);
    Fish.castFrom = { x: tip.x, y: tip.y };
    Fish.castLand = FISH_ZONES[Fish.zoneIdx];
    Fish.state = 'cast'; Fish.t = 0;
    sfx('whoosh');
    setFishUI('拋竿中…');
  } else if (Fish.state === 'wait' && Fish.jig) {
    const d = Fish.jig.t;
    Fish.jig = null;
    const z = Fish.castLand;
    const gone = Fish.shade && Fish.shade.st === 'flee'; /* 34-2：魚已逃離 */
    if (d < 0.25) { setFishUI(); return; } /* 太快了不算 */
    if (d <= 1.0) {
      /* 34-2：輕拉=誘魚以為是小蟲 */
      if (gone) { setFishUI(); return; } /* 魚已走，拉了也沒用 */
      if (Fish.hover) {
        Fish.state = 'bite'; Fish.t = 0;
        if (z) Fish.splashes.push({ x: z.x, y: z.y, t: 0.3 });
        sfx('ding');
        setFishUI('⚠️ 咬餌了！快撈！');
        return;
      }
      /* 魚還在游來：輕拉讓它更快靠近（每竿限 2 次） */
      if (Fish.jigglesLeft > 0 && Fish.t < Fish.biteAt - 0.4) {
        Fish.jigglesLeft -= 1;
        Fish.biteAt = Math.max(Fish.t + 0.5, Fish.t + (Fish.biteAt - Fish.t) * 0.55);
        if (z) Fish.splashes.push({ x: z.x, y: z.y, t: 0.3 });
        sfx('blip');
        setFishUI('魚兒好奇地靠過來了～');
      } else setFishUI();
    } else {
      /* 拉太猛→嚇跑 */
      Fish.hover = false;
      scatterSchool();
      Fish.biteAt = Fish.t + 1.2 + Math.random() * 1.8;
      if (Fish.shade) { Fish.shade.st = 'flee'; Fish.shade.t = 0; Fish.shade.leave = false; }
      sfx('buzz');
      setFishUI('啊…拉太猛，把魚嚇跑了～');
    }
  }
}

/* 33-1：重新拋竿——只有玩家按它才回 ready 重新蓄力 */
function recast() {
  if (!Fish || !['wait', 'bite', 'reel'].includes(Fish.state)) return; /* 34-4：caught/missed 已自動處理 */
  Fish.state = 'ready'; Fish.t = 0; Fish.power = 0;
  Fish.jig = null; Fish.reel = null; Fish.shade = null; Fish.dipT = null;
  sfx('whoosh');
  setFishUI('長按 🎣 蓄力，放開拋竿！越遠越稀有～');
}

function updateFish(dt) {
  if (!Fish) return;
  Fish.t += dt;
  if (Fish.state === 'charge') {
    Fish.power = Math.min(1, Fish.t / 1.2); /* 32-1：1.2s 滿力 */
  } else if (Fish.state === 'cast' && Fish.t >= 0.9) {
    /* 32-1：落水→33-3 抽一輪（魚/size/假咬/魚影） */
    Fish.state = 'wait'; Fish.t = 0;
    rollWaitFish(Fish);
    Fish.splashes.push({ x: Fish.castLand.x, y: Fish.castLand.y, t: 0 });
    sfx('splash');
    setFishUI('魚影快來了…到了輕輕拉線誘它咬～');
  } else if (Fish.state === 'wait') {
    if (Fish.jig) Fish.jig.t += dt; /* 33-1：逗引計時 */
    const frac = Fish.t / Fish.biteAt;
    if (Fish.nibbles.length && frac >= Fish.nibbles[0]) { /* 假咬（小抖+tick） */
      Fish.nibbles.shift();
      Fish.dipT = 0;
      sfx('tick');
    }
    if (Fish.t >= Fish.biteAt && Fish.shade && Fish.shade.st === 'in') { /* 34-2：魚到才猶豫（逃離中不計） */
      if (!Fish.hover) {
        /* 34-2：魚到浮標旁開始猶豫——要輕輕拉線誘它咬（大魚沒耐心） */
        Fish.hover = true;
        Fish.patienceAt = Fish.t + (Fish.size >= 2 ? 1.6 + Math.random() * 1.2 : 2.6 + Math.random() * 2.0);
        sfx('blip');
        setFishUI('🐟 魚來了！輕輕拉線誘它咬～');
      } else if (Fish.t >= Fish.patienceAt) {
        /* 34-2：等太久→魚失去興趣離開，換新魚影 */
        Fish.hover = false;
        Fish.jig = null;
        if (Fish.shade) { Fish.shade.st = 'flee'; Fish.shade.t = 0; Fish.shade.leave = true; }
        sfx('buzz');
        setFishUI('魚等得不耐煩走了…再等一條～');
      }
    }
  } else if (Fish.state === 'bite' && Fish.t > (Fish.fish ? Fish.fish.win : 0.9)) {
    Fish.state = 'missed'; Fish.t = 0;
    sfx('buzz');
    scatterSchool();
    setFishUI('魚跑掉了…浮標還在水中，等下一條～'); /* 33-1：不換竿 */
  } else if (Fish.state === 'reel') {
    /* 33-2：搏鬥——持續流失＋定時發力破水 */
    const R = Fish.reel;
    R.prog -= (8 + 3 * Fish.size) * dt; /* 34-3：加難 */
    if (Fish.t >= R.burstAt) {
      R.prog -= 6 + 2 * Fish.size;
      R.burstAt = Fish.t + 0.9 + Math.random() * 0.6;
      R.dashT = 0.5;
      Fish.splashes.push({ x: Fish.castLand.x, y: Fish.castLand.y, t: 0 });
      Fish.splashes.push({ x: Fish.castLand.x + 16, y: Fish.castLand.y - 6, t: 0.1 });
      sfx('splash');
    }
    if (R.dashT > 0) R.dashT -= dt;
    if (R.prog <= 0) {
      Fish.state = 'missed'; Fish.t = 0; Fish.reel = null;
      sfx('buzz');
      scatterSchool();
      setFishUI('掙脫了！魚跑掉了…浮標還在水中～');
    }
  } else if ((Fish.state === 'caught' || Fish.state === 'missed') && Fish.t > 0.9) {
    if (Fish.state === 'missed') {
      /* 33-1：不換竿——自動換新魚繼續等 */
      Fish.state = 'wait'; Fish.t = 0;
      rollWaitFish(Fish);
      setFishUI('魚影快來了…到了輕輕拉線誘它咬～');
    } else {
      /* 34-4：成功上陸→重新拋竿（回 ready） */
      Fish.state = 'ready'; Fish.t = 0; Fish.power = 0;
      Fish.jig = null; Fish.shade = null;
      setFishUI('🎣 上來了！再拋一竿？（長按蓄力）');
    }
  }
  /* 33-3/34-2：魚影逃離——嚇跑=同條魚從更遠回來；失去興趣=換新魚 */
  if (Fish.shade && Fish.shade.st === 'flee') {
    Fish.shade.t += dt;
    if (Fish.shade.t > 0.8) {
      if (Fish.shade.leave) {
        rollWaitFish(Fish);
        Fish.t = 0; /* 34-2：等新魚影重新接近（重計時） */
        setFishUI('又一條魚影游過來了～');
      } else {
        Fish.shade.st = 'in';
        const z = Fish.castLand;
        Fish.shade.x0 = z.x + (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 80);
        Fish.shade.y0 = z.y + 12 + Math.random() * 26;
        Fish.shade.t = 0;
      }
    }
  }
  if (Fish.dipT !== null) { Fish.dipT += dt; if (Fish.dipT > 0.35) Fish.dipT = null; }
  updateFishSchool(Fish, dt); /* 32-2：魚群 AI */
  for (const sp of Fish.splashes) sp.t += dt;
  Fish.splashes = Fish.splashes.filter(s => s.t < 0.6);
  for (const fl of Fish.floaters) fl.t += dt;
  Fish.floaters = Fish.floaters.filter(f => f.t < 1.2);
}

/* ── 釣魚場景（側視：天空/遠山/湖/岸/碼頭/小宥/浮標/魚）── */
function renderFish(ctx, t) {
  const W = VW, H = VH;
  /* 天空 */
  ctx.fillStyle = '#CBE9F8';
  ctx.fillRect(0, 0, W, H);
  /* 太陽 */
  ctx.beginPath(); ctx.arc(858, 88, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD98A'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(858, 88, 43, 0, Math.PI * 2); ctx.stroke();
  /* 雲 */
  drawFishCloud(ctx, 180, 84 + Math.sin(t * 0.4) * 3, 1);
  drawFishCloud(ctx, 560, 58 + Math.sin(t * 0.3 + 2) * 3, 0.75);
  /* 遠山 */
  ctx.fillStyle = '#A8D8B9';
  fishHill(ctx, 150, 252, 240, 62);
  fishHill(ctx, 540, 252, 280, 84);
  fishHill(ctx, 880, 252, 230, 56);
  /* 湖水 */
  ctx.fillStyle = '#8FD3E8';
  ctx.fillRect(0, 252, W, H - 252);
  /* 水波紋 */
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const rx = 90 + i * 130 + Math.sin(t * 0.8 + i * 1.7) * 10;
    const ry = 300 + ((i * 89) % 320);
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx + 18, ry - 4, rx + 36, ry); ctx.stroke();
  }
  /* 32-2：魚群（游動/被吸引/繞圈/跳魚，取代舊的 2 條固定淡影） */
  drawFishSchool(ctx, Fish);
  /* 左岸 */
  ctx.fillStyle = '#8FC47E';
  ctx.beginPath();
  ctx.moveTo(0, 236); ctx.lineTo(150, 252); ctx.quadraticCurveTo(110, 340, 70, 420); ctx.lineTo(0, 430);
  ctx.closePath(); ctx.fill();
  /* 右岸 */
  ctx.fillStyle = '#7FB86B';
  ctx.beginPath();
  ctx.moveTo(W, 236); ctx.lineTo(W - 140, 252); ctx.quadraticCurveTo(W - 100, 340, W - 56, 420); ctx.lineTo(W, 430);
  ctx.closePath(); ctx.fill();
  /* 蘆葦 */
  drawReeds(ctx, 46, 252, t);
  drawReeds(ctx, W - 96, 254, t + 1.3);
  /* 睡蓮 */
  drawLily(ctx, 690, 356, 1, t);
  drawLily(ctx, 850, 540, 0.8, t + 0.7);
  /* 碼頭 */
  ctx.fillStyle = 'rgba(47,84,102,0.18)';
  for (const lx of [166, 268, 372]) { ctx.fillRect(lx, 412, 12, 52); }
  ctx.fillStyle = '#B98A5F';
  for (const lx of [166, 268, 372]) { ctx.fillRect(lx, 412, 12, 34); }
  ctx.fillStyle = '#D9B98C';
  roundRectPath(ctx, 138, 394, 264, 18, 5); ctx.fill();
  ctx.strokeStyle = '#B98A5F'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(185,138,95,0.7)'; ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(138 + i * 52, 396); ctx.lineTo(138 + i * 52, 410); ctx.stroke(); }
  /* 水桶（碼頭左端） */
  ctx.fillStyle = '#B8C4CC';
  ctx.beginPath(); ctx.moveTo(196, 372); ctx.lineTo(224, 372); ctx.lineTo(220, 394); ctx.lineTo(200, 394); ctx.closePath();
  ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  /* 小宥（坐碼頭右端、持釣竿）＋32-3 蓄力條/目標圈 */
  drawFisher(ctx, t, Fish);
  drawFishChargeUI(ctx, Fish);
  /* 32-3：浮標（蓄力/飛行/漂浮/咬餌）＋釣線 */
  const bp = fishBobPos(Fish, t);
  if (bp) {
    const tip = rodTipPos(Fish);
    const sag = bp.fly ? 4 : Fish.state === 'bite' ? -8 : 30;
    ctx.strokeStyle = 'rgba(90,62,43,0.7)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    ctx.quadraticCurveTo((tip.x + bp.x) / 2, (tip.y + bp.y) / 2 + sag, bp.x, bp.y - 8);
    ctx.stroke();
    /* 咬餌漣漪 */
    if (Fish.state === 'bite' || (Fish.state === 'missed' && Fish.t < 0.8)) {
      const rp = Fish.state === 'bite' ? (Fish.t % 0.5) / 0.5 : Fish.t / 0.8;
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - rp)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(bp.x, bp.y + 8, 10 + rp * 26, 4 + rp * 10, 0, 0, Math.PI * 2); ctx.stroke();
    }
    drawBobber(ctx, bp.x, bp.y);
    /* 32-1：咬餌時魚影在浮標下掙扎 */
    if (Fish.state === 'bite' && Fish.fish) {
      ctx.save(); ctx.globalAlpha = 0.6;
      drawCatchFish(ctx, Fish.fish, bp.x, bp.y + 34, 0.9 * Math.min(4, Fish.size), Math.sin(t * 14) * 0.2); /* 33-3：隨 size */
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  /* 33-3：魚影慢慢接近（wait 從 140~220px 外游來；bite 到位） */
  if ((Fish.state === 'wait' || Fish.state === 'bite') && Fish.shade && Fish.castLand) {
    const z = Fish.castLand, sh = Fish.shade;
    let sx, sy, vis;
    if (sh.st === 'flee') {
      const k = Math.min(1, sh.t / 0.8);
      const side = sh.x0 >= z.x ? 1 : -1;
      sx = z.x + side * (40 + 180 * k);
      sy = z.y + 18 - 6 * k;
      vis = 1 - 0.7 * k;
    } else {
      const k = Fish.state === 'bite' ? 1 : Math.min(1, Fish.t / Math.max(0.1, Fish.biteAt - 0.4));
      sx = sh.x0 + (z.x - sh.x0) * k;
      sy = sh.y0 + (z.y + 18 - sh.y0) * k;
      vis = 1;
    }
    ctx.save();
    ctx.globalAlpha = 0.32 * vis;
    ctx.fillStyle = '#2C4A5E';
    const L = 24 * Fish.size; /* 魚越大影越大（最大 4×） */
    ctx.translate(sx, sy + Math.sin(t * 3) * 2);
    if (sx >= z.x) ctx.scale(-1, 1); /* 頭朝浮標 */
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, Math.max(4, L * 0.2), 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-L * 0.5, 0);
    ctx.lineTo(-L * 0.75, -Math.max(4, L * 0.18));
    ctx.lineTo(-L * 0.75, Math.max(4, L * 0.18));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* 33-2：搏鬥——計條＋發力時魚破水抵抗（濺水花） */
  if (Fish.state === 'reel' && Fish.reel && Fish.castLand) {
    const z = Fish.castLand;
    if (Fish.reel.dashT > 0) {
      const k = Fish.reel.dashT / 0.5;
      ctx.save();
      ctx.globalAlpha = 0.85;
      drawCatchFish(ctx, Fish.fish, z.x + Math.sin(t * 30) * 4, z.y - 14 - 10 * Math.sin(k * Math.PI), 1.2 * Math.min(4, Fish.size), Math.sin(t * 25) * 0.3);
      ctx.restore();
    }
    const bx = z.x - 45, by = z.y - 74;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    roundRectPath(ctx, bx - 3, by - 3, 96, 14, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    const p = Math.max(0, Math.min(1, Fish.reel.prog / 100));
    ctx.fillStyle = p > 0.66 ? '#7BC8A4' : p > 0.33 ? '#FFD98A' : '#E85A6A';
    if (p > 0.01) { roundRectPath(ctx, bx, by, 90 * p, 8, 4); ctx.fill(); }
    ctx.fillStyle = INK;
    ctx.font = '800 12px RHR, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('拉線！', z.x, by - 8);
  }

  /* 32-3：水花粒子（落水/跳魚） */
  drawFishSplashes(ctx, Fish);
  /* 咬餌「!」（32-3：跟隨浮標落點） */
  if (Fish.state === 'bite' && bp) {
    ctx.fillStyle = '#FFF8EC';
    ctx.beginPath(); ctx.arc(bp.x, bp.y - 46, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#E85A6A';
    ctx.font = '800 22px RHR, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', bp.x, bp.y - 45);
  }
  /* 撈到：魚飛出動畫（32-1：按 size 放大） */
  if (Fish.state === 'caught' && Fish.t < 0.7 && Fish.fish) {
    const z = Fish.castLand || { x: 560, y: 470 };
    const f = Math.min(Fish.t / 0.7, 1);
    const fx = z.x + 110 * f;
    const fy = z.y - 130 * Math.sin(f * Math.PI) + 30 * f;
    drawCatchFish(ctx, Fish.fish, fx, fy, 1.4 * Math.min(4, Fish.size), -f * 2.2 + 0.4); /* 33-3：最大 4× */
    /* 水花 */
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(z.x + s * 12, z.y - 2 - f * 16, 5 * (1 - f) + 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  /* 漂走：水花 */
  if (Fish.state === 'missed' && Fish.t < 0.8) {
    const z = Fish.castLand || { x: 560, y: 470 };
    const f = Fish.t / 0.8;
    ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - f)})`;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(z.x + s * 14, z.y - 2 - f * 20, 5 * (1 - f) + 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  /* 浮字 +N */
  for (const fl of Fish.floaters) {
    const a = 1 - fl.t / 1.2;
    const fy = fl.y - fl.t * 46;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#E8A93C';
    ctx.beginPath(); ctx.arc(fl.x - 16, fy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#B26F22'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#5A3E2B';
    ctx.font = '800 22px RHR, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(fl.text, fl.x - 3, fy);
    ctx.globalAlpha = 1;
  }
  /* 右上角：已釣 N 隻（避開錢幣 HUD） */
  ctx.fillStyle = '#FFF8EC';
  roundRectPath(ctx, W - 210, 20, 128, 40, 20); ctx.fill();
  ctx.strokeStyle = '#5FA8C4'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#5A3E2B';
  ctx.font = '800 20px RHR, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`已釣 ${Game.fish.caught} 隻`, W - 146, 41);
}

function drawFishCloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 22 * s, y - 8 * s, 15 * s, 0, Math.PI * 2);
  ctx.arc(x + 44 * s, y, 17 * s, 0, Math.PI * 2);
  ctx.arc(x + 22 * s, y + 6 * s, 16 * s, 0, Math.PI * 2);
  ctx.fill();
}

function fishHill(ctx, cx, base, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, base);
  ctx.quadraticCurveTo(cx, base - h * 2, cx + w / 2, base);
  ctx.closePath(); ctx.fill();
}

function drawReeds(ctx, x, y, t) {
  ctx.strokeStyle = '#5F9E52'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const sw = Math.sin(t * 1.4 + i) * 4;
    const hx = x + i * 9 - 9;
    ctx.beginPath(); ctx.moveTo(hx, y);
    ctx.quadraticCurveTo(hx + sw * 0.5, y - 22, hx + sw, y - 40 - (i === 1 ? 8 : 0));
    ctx.stroke();
    ctx.fillStyle = '#8A5A3B';
    ctx.beginPath(); ctx.ellipse(hx + sw, y - 46 - (i === 1 ? 8 : 0), 3.5, 8, sw * 0.03, 0, Math.PI * 2); ctx.fill();
  }
}

function drawLily(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x + Math.sin(t * 0.7) * 2, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#7BC8A4';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.arc(0, 0, 15, 0.35, Math.PI * 2 - 0.35);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(47,84,102,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#FFC2D4';
  ctx.beginPath(); ctx.arc(6, -6, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFisher(ctx, t, fish) {
  const bob = Math.sin(t * 1.8) * 1.5;
  /* 33-4：主角本人（drawCharacter：跟家裡/學校同一張臉、同一髮型），坐碼頭邊腿垂下 */
  const px = 352, py = 388 + bob;
  const lean = fish && fish.state === 'charge' ? fish.power * 0.07 : 0; /* 蓄力微後仰 */
  /* 34-5：主角的手拿釣竿——手臂先畫（被身體/帽子遮住），拳頭畫在竿上才有握持感 */
  const base = FISH_ROD_BASE;
  const tip = fish ? rodTipPos(fish) : { x: 474, y: 290 };
  const cc = Game.playerCfg ? resolveConfig(Game.playerCfg) : null;
  const grip = { x: (base.x + tip.x) / 2, y: (base.y + tip.y) / 2 - 4 }; /* 手把位置（竿曲線中點） */
  const sx = px + 13, sy = py - 44; /* 肩 */
  const ex = sx + (grip.x - sx) * 0.45, ey = sy + (grip.y - sy) * 0.45; /* 袖口 */
  ctx.strokeStyle = cc ? cc.topColor : '#F4F0E6'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = cc ? cc.skinColor : '#F7CBA4'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(grip.x - 2, grip.y + 1); ctx.stroke();
  ctx.save();
  ctx.translate(px, py - 30);
  ctx.rotate(-lean);
  ctx.translate(-px, -(py - 30));
  if (Game.playerCfg) drawCharacter(ctx, Game.playerCfg, { x: px, y: py, facing: 'right', t, walking: false, scale: 1.05 });
  /* 釣魚帽（草陽帽，維持主角外觀＋漁夫風） */
  const hx2 = px + 2, hy2 = py - 87;
  ctx.fillStyle = '#F2D091';
  ctx.beginPath(); ctx.ellipse(hx2, hy2, 30, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.beginPath(); ctx.arc(hx2, hy2 - 2, 16, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#E85A6A'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(hx2, hy2 - 2, 16, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.restore();
  /* 釣竿（手臂之後、拳頭之前） */
  ctx.strokeStyle = '#8A5A3B'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(base.x, base.y);
  ctx.quadraticCurveTo((base.x + tip.x) / 2, (base.y + tip.y) / 2 - 8, tip.x, tip.y); ctx.stroke();
  /* 拳頭（在竿上，握住手把） */
  ctx.fillStyle = cc ? cc.skinColor : '#F7CBA4';
  ctx.beginPath(); ctx.arc(grip.x - 1, grip.y, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
}

/* 撈到的魚（小魚/彩魚/青蟹/金魚；rot 旋轉、s 縮放） */
function drawCatchFish(ctx, f, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (f.id === 'crab') {
    /* 青蟹：身体+鉗+腳+眼柄 */
    ctx.strokeStyle = '#3F7E76'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(sd * 10, 2 + i * 4); ctx.lineTo(sd * (20 + i * 2), 8 + i * 3); ctx.stroke();
    }
    ctx.fillStyle = '#5FA8A0';
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sd * 13, -10, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sd * 13, -16); ctx.lineTo(sd * 9, -13); ctx.stroke();
    }
    ctx.fillStyle = '#FFF';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 5, -8, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = INK;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 5, -8, 1.6, 0, Math.PI * 2); ctx.fill(); }
  } else if (f.id === 'puffer') {
    /* 金魚（河豚）：圓身+小刺+大眼 */
    ctx.strokeStyle = '#D98F2B'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 11);
      ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 16); ctx.stroke();
    }
    ctx.fillStyle = '#FFB84C';
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = '#FFF';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 5, -4, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = INK;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 5, -4, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, 4, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {
    /* 魚身（小魚=藍、彩魚=粉+紋） */
    const body = f.id === 'minnow' ? '#7FB4D9' : '#FF8FB2';
    const fin = f.id === 'minnow' ? '#5F93B8' : '#FFD98A';
    ctx.fillStyle = fin;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-22, -8); ctx.lineTo(-22, 8); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (f.id === 'color') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(2, 0, 7, -1.1, 1.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(-4, 0, 7, -1.1, 1.1); ctx.stroke();
    }
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(8, -2, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(8.8, -2, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ═════ 第三十二輪 32-2：釣魚魚群 AI（游動/被吸引/繞圈咬餌/逃散/跳魚）════ */
function initFishSchool() {
  const mk = (kind, y0, sp, size) => ({
    kind, x: 250 + Math.random() * 620, y: y0, baseY: y0,
    dir: Math.random() < 0.5 ? 1 : -1, sp, size,
    phase: Math.random() * 6.28, st: 'swim', t: Math.random() * 3,
    turnAt: 1.5 + Math.random() * 3, ang: 0, jx: 0,
    orb: 16 + Math.random() * 26, orbSp: 1.6 + Math.random() * 1.8, /* 34-1：每條魚個別繞軌 */
  });
  const s = [];
  for (let i = 0; i < 5; i++) s.push(mk('minnow', 375 + i * 13, 26 + Math.random() * 22, 0.75 + Math.random() * 0.3)); /* 34-1：微調大一點易見 */
  for (let i = 0; i < 4; i++) s.push(mk('color', 435 + i * 17, 20 + Math.random() * 16, 0.85 + Math.random() * 0.3));
  s.push(mk('crab', 580, 16, 0.9));
  s.push(mk('crab', 594, 13, 0.8));
  s.push(mk('turtle', 606, 7, 1.3));
  return s;
}

function scatterSchool() {
  if (!Fish) return;
  for (const f of Fish.school) { if (f.st !== 'jump') { f.st = 'flee'; f.t = 0; } }
}

function updateFishSchool(fish, dt) {
  /* 環境跳魚：每 7~15s 一條小魚跳出水面 */
  fish.jumpAt -= dt;
  if (fish.jumpAt <= 0) {
    fish.jumpAt = 7 + Math.random() * 8;
    const c = fish.school.filter(f => (f.kind === 'minnow' || f.kind === 'color') && f.st === 'swim');
    if (c.length) {
      const j = c[Math.floor(Math.random() * c.length)];
      j.st = 'jump'; j.t = 0; j.jx = j.x;
      fish.splashes.push({ x: j.x, y: 252, t: 0 });
      sfx('splash');
    }
  }
  const bob = (fish.state === 'wait' || fish.state === 'bite') ? fish.castLand : null;
  for (const f of fish.school) {
    f.t += dt;
    if (f.st === 'swim') {
      f.x += f.dir * f.sp * dt;
      if (f.kind === 'crab') { /* 橫走小步 */
        if (f.t > f.turnAt) { f.t = 0; f.turnAt = 0.7 + Math.random() * 1.1; f.dir *= -1; }
        if (f.x < 200 || f.x > 820) f.dir *= -1; /* 34-1：避開右岸遮蔽區 */
        f.y = f.baseY + Math.sin(f.t * 9) * 2;
      } else {
        f.y = f.baseY + Math.sin(fish.t * 1.5 + f.phase) * 7;
        if (f.x < 190 || f.x > 830) f.dir *= -1; /* 34-1 */
        else if (f.kind !== 'turtle' && Math.random() < dt * 0.22) f.dir *= -1;
      }
      /* 浮標落水後：附近的魚被吸引過去（34-1：最多 3 條，其餘繼續游，不再擠成一堆） */
      const nearN = fish.school.filter(g => g.st === 'approach' || g.st === 'circle').length;
      if (bob && f.kind !== 'turtle' && nearN < 3 && Math.abs(f.x - bob.x) < 170 && Math.random() < dt * 0.5) {
        f.st = 'approach'; f.t = 0;
      }
    } else if (f.st === 'approach' && bob) {
      const tx = bob.x, ty = bob.y + 44;
      const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1;
      f.x += (dx / d) * 62 * dt; f.y += (dy / d) * 62 * dt;
      f.dir = dx >= 0 ? 1 : -1;
      if (d < 26) { f.st = 'circle'; f.t = 0; f.ang = Math.atan2(f.y - ty, f.x - tx); }
      if (!bob) f.st = 'swim';
    } else if (f.st === 'circle' && bob) {
      f.ang += dt * f.orbSp * f.dir; /* 34-1：個別軌道（半徑/速度不同，不再重疊） */
      f.x = bob.x + Math.cos(f.ang) * f.orb;
      f.y = bob.y + 44 + Math.sin(f.ang) * f.orb * 0.55;
      if (fish.state !== 'wait' && fish.state !== 'bite') f.st = 'swim';
    } else if (f.st === 'flee') {
      const bx = bob ? bob.x : 560, by = bob ? bob.y + 40 : 470;
      const fx = bx - f.x, fy = by - f.y, fd = Math.hypot(fx, fy) || 1;
      f.x -= (fx / fd) * 135 * dt; f.y -= (fy / fd) * 135 * dt;
      f.y = Math.max(345, Math.min(612, f.y));
      if (f.t > 0.9) { f.st = 'swim'; f.t = 0; f.baseY = Math.max(370, Math.min(600, f.y)); f.turnAt = 2 + Math.random() * 3; }
    } else if (f.st === 'jump') {
      if (f.t < 1.1) {
        const k = f.t / 1.1;
        f.x = f.jx + f.dir * 85 * k;
        f.y = 252 - 54 * Math.sin(k * Math.PI) + 30 * k;
      } else { f.st = 'swim'; f.t = 0; f.baseY = 380 + Math.random() * 70; f.y = f.baseY; }
    }
  }
}

/* ═════ 第三十二輪 32-3：釣魚視覺（甩竿/蓄力條/目標圈/魚群/水花/浮標）════ */
const FISH_ROD_BASE = { x: 370, y: 340 }; /* 33-4：主角手部位置 */
const FISH_ROD_LEN = 117;

function rodAngle(fish) {
  const REST = -0.44;
  if (fish.state === 'charge') return REST + (-2.0 - REST) * fish.power; /* 後拉 */
  if (fish.state === 'cast') {
    if (fish.t < 0.3) { const k = 1 - Math.pow(1 - fish.t / 0.3, 3); return fish.releaseAngle + (0.35 - fish.releaseAngle) * k; } /* 前甩 */
    const k = Math.min(1, (fish.t - 0.3) / 0.5);
    return 0.35 + (REST - 0.35) * k; /* 收回 */
  }
  if (fish.state === 'reel') return REST - 0.3 - Math.sin(fish.t * 14) * 0.06; /* 33-2：拚命拉，竿尖顫 */
  return REST;
}

function rodTipPos(fish) {
  const a = rodAngle(fish);
  return { x: FISH_ROD_BASE.x + FISH_ROD_LEN * Math.cos(a), y: FISH_ROD_BASE.y + FISH_ROD_LEN * Math.sin(a) };
}

/* 浮標位置（蓄力/飛行/漂浮/咬餌） */
function fishBobPos(fish, t) {
  if (fish.state === 'cast') {
    const k = Math.min(1, fish.t / 0.9);
    const from = fish.castFrom, to = fish.castLand;
    if (!from || !to) return null;
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 120, fly: true };
  }
  if (fish.state === 'wait' || fish.state === 'bite' || fish.state === 'caught' || fish.state === 'missed' || fish.state === 'reel') {
    const z = fish.castLand;
    if (!z) return null;
    let dip = 0, jx = 0;
    if (fish.state === 'wait') {
      dip = Math.sin(t * 2.2) * 3;
      if (fish.dipT !== null) dip += Math.sin(Math.min(1, fish.dipT / 0.35) * Math.PI) * 6; /* 假咬小沉 */
      if (fish.jig) jx = -Math.min(1, fish.jig.t) * 10; /* 33-1：逗引中浮標被慢慢往竿側拉 */
    } else if (fish.state === 'bite') dip = 13 + Math.sin(t * 20) * 3; /* 真咬大沉+顫 */
    else if (fish.state === 'reel') dip = -5 + Math.sin(fish.t * 18) * 4; /* 33-2：被拉得上下亂跳 */
    return { x: z.x + jx, y: z.y + dip };
  }
  return null;
}

function drawBobber(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = '#FFF8EC'; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI, 0); ctx.fillStyle = '#E85A6A'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -15); ctx.stroke();
  ctx.restore();
}

/* 魚群（水下魚半透明、龜/蟹各自畫法、跳魚全透明度高） */
function drawFishSchool(ctx, fish) {
  for (const f of fish.school) {
    if (f.kind === 'turtle') { drawFishTurtle(ctx, f); continue; }
    if (f.kind === 'crab') {
      ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.dir * f.size, f.size);
      ctx.globalAlpha = 0.75;
      drawCatchFish(ctx, FISH_TABLE.crab, 0, 0, 1, 0);
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.dir * f.size, f.size);
    ctx.rotate(Math.sin(fish.t * 6 + f.phase) * 0.08); /* 擺尾搖擺 */
    ctx.globalAlpha = f.st === 'jump' ? 0.95 : 0.62; /* 34-1：微調易見 */
    drawCatchFish(ctx, FISH_TABLE[f.kind], 0, 0, 1, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawFishTurtle(ctx, f) {
  ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.dir, 1); ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#8FBF7A';
  for (const i of [-8, 8]) {
    ctx.beginPath(); ctx.ellipse(i, 9, 6, 3, i < 0 ? 0.5 : -0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#6B9E5F';
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(47,84,102,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, -8); ctx.lineTo(-4, 8);
  ctx.moveTo(0, -9); ctx.lineTo(0, 9);
  ctx.moveTo(8, -8); ctx.lineTo(4, 8);
  ctx.stroke();
  ctx.fillStyle = '#8FBF7A';
  ctx.beginPath(); ctx.arc(19, -2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2F5466';
  ctx.beginPath(); ctx.arc(21, -3, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* 水花粒子（落水/跳魚） */
function drawFishSplashes(ctx, fish) {
  for (const sp of fish.splashes) {
    const k = sp.t / 0.6;
    ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - k)})`;
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * 13 * k, dy = -32 * k + 58 * k * k;
      ctx.beginPath(); ctx.arc(sp.x + dx, sp.y + dy, 4 * (1 - k) + 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 8 + k * 26, 3 + k * 8, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

/* 蓄力條＋近/中/遠目標圈 */
function drawFishChargeUI(ctx, fish) {
  if (fish.state === 'ready' || fish.state === 'charge') {
    const cur = fish.power < 0.33 ? 0 : fish.power < 0.66 ? 1 : 2;
    for (let i = 0; i < 3; i++) {
      const z = FISH_ZONES[i];
      const active = fish.state === 'charge' && cur === i;
      ctx.strokeStyle = active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = active ? 3 : 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.ellipse(z.x, z.y, 26, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = active ? '#FFF8EC' : 'rgba(255,248,236,0.55)';
      ctx.font = '800 15px RHR, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(['近', '中', '遠'][i], z.x, z.y - 18);
    }
  }
  if (fish.state === 'charge') {
    const bx = 288, by = 274, bw = 124;
    ctx.fillStyle = 'rgba(255,248,236,0.92)';
    roundRectPath(ctx, bx - 5, by - 5, bw + 10, 22, 11); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#7BC8A4'); g.addColorStop(0.6, '#FFD98A'); g.addColorStop(1, '#E85A6A');
    ctx.fillStyle = g;
    roundRectPath(ctx, bx, by, Math.max(6, bw * fish.power), 12, 6); ctx.fill();
    ctx.fillStyle = '#5A3E2B';
    ctx.font = '800 14px RHR, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('蓄力', bx - 24, by + 6);
  }
}
