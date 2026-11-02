/* ══════════ 地圖：直直往下的步道 + 麥當勞 ══════════
 * 世界 = 980×660 單屏（與房間同座標系）。
 * 靜態部分預渲染到離屏畫布，動態（脈衝點、招牌、玩家）每幀畫。
 */
'use strict';

const MAPW = VW, MAPH = VH;
const ROAD = { x: 490, halfW: 95, top: 128, bot: 660 };
const ROAD_L = ROAD.x - ROAD.halfW, ROAD_R = ROAD.x + ROAD.halfW;
const MC = { x: 490, y: 432 };      /* 麥當勞的點 */
const MC_SHOP = { x0: 612, y0: 332 }; /* 小舖 */

let mapCanvas = null;

/* 字體載入後重建（招牌要用手寫體） */
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.ready.then(() => { mapCanvas = null; });
}

function ensureMap() {
  if (mapCanvas) return;
  const c = document.createElement('canvas');
  c.width = MAPW; c.height = MAPH;
  const ctx = c.getContext('2d');

  /* ── 草坪 ── */
  ctx.fillStyle = '#9CCB87';
  ctx.fillRect(0, 0, MAPW, MAPH);
  const prnd = mulberry32(11);
  ctx.fillStyle = 'rgba(143,196,126,0.55)';
  for (let i = 0; i < 7; i++) {
    const x = prnd() * MAPW, y = prnd() * MAPH;
    if (x > ROAD_L - 60 && x < ROAD_R + 60) continue;
    ctx.beginPath(); ctx.ellipse(x, y, 90 + prnd() * 80, 40 + prnd() * 30, prnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  /* 草紋小筆觸 */
  ctx.strokeStyle = '#7FB86B'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 80; i++) {
    let x = prnd() * MAPW, y = prnd() * MAPH;
    if (x > ROAD_L - 30 && x < ROAD_R + 30) x = prnd() < 0.5 ? prnd() * (ROAD_L - 60) : ROAD_R + 40 + prnd() * (MAPW - ROAD_R - 40);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 4, y - 6, x + (prnd() - 0.5) * 8, y - 11);
    ctx.stroke();
  }

  /* ── 道路（米白，兩邊手繪波邊） ── */
  handShape(ctx, [[ROAD_L + 4, ROAD.top], [ROAD_R - 4, ROAD.top], [ROAD_R - 4, MAPH], [ROAD_L + 4, MAPH]],
    { fill: '#F5EBD3', stroke: INK, lw: 3, seed: 5, amp: 3, segs: 6 });
  /* 中線虛線 */
  for (let y = 170; y < 640; y += 52)
    handLine(ctx, 490, y, 490, y + 26, { stroke: '#D9BE93', lw: 6, seed: y, amp: 1.5, segs: 2 });
  /* 小石頭 */
  const srnd = mulberry32(23);
  ctx.fillStyle = '#E4D2AF';
  for (let i = 0; i < 9; i++) {
    const x = ROAD_L + 20 + srnd() * (ROAD.halfW * 2 - 40), y = 180 + srnd() * 460;
    ctx.beginPath(); ctx.ellipse(x, y, 4 + srnd() * 4, 3 + srnd() * 2, srnd() * 3, 0, Math.PI * 2); ctx.fill();
  }

  /* ── 家（地圖頂端） ── */
  ctx.fillStyle = 'rgba(90,62,43,0.15)';
  ctx.beginPath(); ctx.ellipse(490, 156, 92, 16, 0, 0, Math.PI * 2); ctx.fill();
  handShape(ctx, [[424, 98], [556, 98], [556, 154], [424, 154]], { fill: '#FDF2DF', seed: 31 });
  handShape(ctx, [[404, 102], [490, 42], [576, 102]], { fill: '#B98A5F', seed: 32 });
  handShape(ctx, [[476, 118], [504, 118], [504, 154], [476, 154]], { fill: '#F5A8C0', seed: 33 });
  handEllipse(ctx, 490, 141, 3, 3, { fill: '#FFD98A', lw: 2, seed: 331 });
  handShape(ctx, [[516, 118], [544, 118], [544, 142], [516, 142]], { fill: '#CBE9F8', stroke: '#FFF7EA', lw: 3, seed: 34 });
  /* 小木牌「我的家」 */
  handLine(ctx, 352, 182, 352, 214, { stroke: '#B98A5F', lw: 5, seed: 35 });
  handShape(ctx, [[316, 158], [388, 158], [388, 188], [316, 188]], { fill: '#E9CDA9', seed: 36 });
  ctx.fillStyle = '#5A3E2B';
  ctx.font = '700 24px RHR'; /* 第十三輪a：Long Cang(CDN) → 本地 RHR 圓體 */
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('我的家', 352, 175);

  /* ── 麥當勞小舖（路右側） ── */
  const S = MC_SHOP;
  ctx.fillStyle = 'rgba(90,62,43,0.15)';
  ctx.beginPath(); ctx.ellipse(709, 490, 108, 14, 0, 0, Math.PI * 2); ctx.fill();
  /* 牆面 */
  handShape(ctx, [[S.x0, 372], [S.x0 + 194, 372], [S.x0 + 194, 488], [S.x0, 488]], { fill: '#F7EBD3', seed: 41 });
  /* 条纹雨篷（5 條 + 扇形邊） */
  const stripeW = 43.6, cols = ['#E2574C', '#FFF7EA'];
  for (let i = 0; i < 5; i++) {
    const x0 = 600 + stripeW * i;
    handShape(ctx, [[x0, 334], [x0 + stripeW, 334], [x0 + stripeW, 378], [x0, 378]],
      { fill: cols[i % 2], stroke: null, seed: 42 + i, amp: 1.5, segs: 2 });
    ctx.beginPath();
    ctx.arc(x0 + stripeW / 2, 378, stripeW / 2, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = cols[i % 2]; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
  }
  handLineLong(ctx, 600, 334, 818, 334, { seed: 43, amp: 1.5, lw: 3 });
  /* M 圓牌 */
  handEllipse(ctx, 709, 432, 34, 34, { fill: '#FFF8EC', lw: 3.5, seed: 44 });
  drawMLogo(ctx, 709, 432, 30);
  /* 門 */
  handShape(ctx, [[628, 434], [666, 434], [666, 488], [628, 488]], { fill: '#B98A5F', seed: 45 });
  handEllipse(ctx, 659, 462, 3, 3, { fill: '#FFD98A', lw: 2, seed: 451 });

  /* ── 樹 ── */
  drawMapTree(ctx, 150, 250, 1);
  drawMapTree(ctx, 838, 540, 1.15);
  drawMapTree(ctx, 128, 565, 0.9);

  /* ── 小花 ── */
  const frnd = mulberry32(57);
  const petalCols = ['#FFC2D4', '#FFF7EA', '#F7C948'];
  for (let i = 0; i < 14; i++) {
    let x = frnd() * MAPW, y = 160 + frnd() * 480;
    if (x > ROAD_L - 40 && x < ROAD_R + 40) x = frnd() < 0.5 ? frnd() * (ROAD_L - 70) : ROAD_R + 60 + frnd() * (MAPW - ROAD_R - 60);
    if (x > 590 && y > 300 && x < 840 && y < 520) continue; /* 避開小舖 */
    const pc = petalCols[i % 3];
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.fillStyle = pc;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 3.6, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#E8A93C';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }

  /* ── 路邊草叢 ── */
  ctx.strokeStyle = '#6FA85E'; ctx.lineWidth = 2.5;
  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? ROAD_L - 14 : ROAD_R + 14;
    const y = 200 + i * 60;
    for (let b = -1; b <= 1; b++) {
      ctx.beginPath();
      ctx.moveTo(side, y);
      ctx.quadraticCurveTo(side + b * 4, y - 8, side + b * 7, y - 13);
      ctx.stroke();
    }
  }

  mapCanvas = c;
}

function drawMapTree(ctx, x, y, s) {
  handShape(ctx, [[x - 7 * s, y], [x + 7 * s, y], [x + 5 * s, y - 40 * s], [x - 5 * s, y - 40 * s]],
    { fill: '#B98A5F', seed: Math.round(x + y), amp: 1.5 });
  handEllipse(ctx, x - 16 * s, y - 58 * s, 22 * s, 19 * s, { fill: '#7FB86B', stroke: null, seed: Math.round(x) });
  handEllipse(ctx, x + 16 * s, y - 60 * s, 22 * s, 19 * s, { fill: '#8FC47E', stroke: null, seed: Math.round(x) + 1 });
  handEllipse(ctx, x, y - 78 * s, 26 * s, 22 * s, { fill: '#6FA85E', stroke: null, seed: Math.round(x) + 2 });
}

/* 黃色 M 拱（麥當勞風，純圖形） */
function drawMLogo(ctx, x, y, s) {
  ctx.save();
  ctx.strokeStyle = '#F7C948';
  ctx.lineWidth = s * 0.24;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const w = s * 0.53;
  const arch = (x0) => {
    ctx.beginPath();
    ctx.moveTo(x0, y + s * 0.55);
    ctx.lineTo(x0, y - s * 0.12);
    ctx.quadraticCurveTo(x0, y - s * 0.6, x0 + w / 2, y - s * 0.6);
    ctx.quadraticCurveTo(x0 + w, y - s * 0.12, x0 + w, y + s * 0.55);
    ctx.stroke();
  };
  arch(x - w);
  arch(x);
  ctx.restore();
}

/* 動態層：脈衝點 + 招牌 + 玩家 */
function renderMap(ctx, t, player) {
  ensureMap();
  ctx.drawImage(mapCanvas, 0, 0);

  /* 麥當勞脈衝圈 */
  for (let i = 0; i < 2; i++) {
    const pr = ((t * 0.55) + i * 0.5) % 1;
    ctx.strokeStyle = `rgba(122,82,54,${(0.55 * (1 - pr)).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(MC.x, MC.y, 16 + pr * 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  handEllipse(ctx, MC.x, MC.y, 13, 13, { fill: INK, lw: 3, seed: 61 });
  handEllipse(ctx, MC.x, MC.y, 5, 5, { fill: '#FFF8EC', stroke: null, seed: 62 });

  /* 招牌（輕輕上下浮動） */
  const bob = Math.sin(t * 1.8) * 4;
  handShape(ctx, [[MC.x - 75, 322 + bob], [MC.x + 75, 322 + bob], [MC.x + 75, 376 + bob], [MC.x - 75, 376 + bob]],
    { fill: '#FFF8EC', seed: 63, amp: 2 });
  handShape(ctx, [[MC.x - 13, 376 + bob], [MC.x + 13, 376 + bob], [MC.x, 394 + bob]],
    { fill: '#FFF8EC', seed: 64, amp: 1 });
  ctx.fillStyle = '#5A3E2B';
  ctx.font = '900 40px RHR'; /* 第十三輪a：招牌加粗更活潑 */
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('麥當勞', MC.x, 352 + bob);

  /* 玩家 */
  const m = player;
  drawCharacter(ctx, Game.playerCfg, {
    x: m.x, y: m.y,
    facing: m.facing, t: m.walkT,
    walking: m.walking,
    scale: 1,
  });
}
