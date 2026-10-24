/* ══════════ 第一人稱全景（剛醒來，眼皮張開 + 左右看） ══════════
 * 一張「矮但很寬」的房間全景圖（離屏畫布只畫一次），
 * 鏡頭 camX 左右平移；眼皮用皮膚色帶 + 睫毛覆蓋螢幕。
 */
'use strict';

const PAN = { W: 2400, H: 660 };
let panCanvas = null;

/* 眼皮邊緣的固定抖動（normalized，預計算不閃爍） */
const LID_N = 26;
const lidTopJit = [], lidBotJit = [];
(function () {
  const r1 = mulberry32(31), r2 = mulberry32(37);
  for (let i = 0; i <= LID_N; i++) {
    lidTopJit.push((r1() - 0.5) * 2);
    lidBotJit.push((r2() - 0.5) * 2);
  }
})();

function ensurePano() {
  if (panCanvas) return;
  const c = document.createElement('canvas');
  c.width = PAN.W; c.height = PAN.H;
  const ctx = c.getContext('2d');
  const W = PAN.W, H = PAN.H;
  const ceilY = 112, floorY = 470, cornerX = 1200;

  /* 天花板 / 牆 / 地板 / 牆裙 */
  ctx.fillStyle = '#FFF7EA'; ctx.fillRect(0, 0, W, ceilY);
  ctx.fillStyle = '#FDF2DF'; ctx.fillRect(0, ceilY, W, floorY - ceilY);
  ctx.fillStyle = '#F3E2C8'; ctx.fillRect(0, floorY, W, H - floorY);
  ctx.fillStyle = '#E9CDA9'; ctx.fillRect(0, floorY - 18, W, 18);

  /* 地板格線（淡） */
  for (let x = 60; x < W; x += 120)
    handLine(ctx, x, floorY + 4, x + 8, H, { stroke: 'rgba(122,82,54,0.10)', lw: 2, seed: x + 3, amp: 2, segs: 3 });

  /* 邊緣線：天花板、地板、內角 */
  handLineLong(ctx, 0, ceilY, W, ceilY, { seed: 21, amp: 2.2, lw: 3 });
  handLineLong(ctx, 0, floorY, W, floorY, { seed: 22, amp: 2.2, lw: 3 });
  handLine(ctx, cornerX, ceilY, cornerX, floorY, { seed: 55, amp: 2, lw: 3 });

  /* ── 左牆：門 ── */
  handShape(ctx, [[356, 148], [614, 148], [614, floorY], [356, floorY]], { fill: '#FFF7EA', seed: 3 });
  handShape(ctx, [[380, 182], [590, 182], [590, floorY - 2], [380, floorY - 2]], { fill: '#F5A8C0', seed: 4 });
  handEllipse(ctx, 485, 268, 20, 20, { fill: '#FFF7EA', lw: 3, seed: 5 });
  handEllipse(ctx, 560, 334, 8, 8, { fill: '#FFD98A', lw: 2.5, seed: 6 });
  handEllipse(ctx, 485, 502, 96, 24, { fill: '#FFC2D4', stroke: 'rgba(240,98,146,0.45)', lw: 3, seed: 7 });

  /* ── 左牆：愛心畫框 + 小置物架 ── */
  handShape(ctx, [[818, 206], [908, 206], [908, 324], [818, 324]], { fill: '#FFF7EA', seed: 8 });
  ctx.fillStyle = '#FF8FB2';
  ctx.save(); ctx.translate(863, 266); drawHeartPath(ctx, 0, 0, 15); ctx.fill(); ctx.restore();

  handShape(ctx, [[968, 298], [1152, 298], [1152, 312], [968, 312]], { fill: '#D9B992', seed: 9 });
  handShape(ctx, [[994, 272], [1018, 272], [1013, 298], [999, 298]], { fill: '#C97B5A', seed: 10 });
  handEllipse(ctx, 1006, 264, 8, 12, { fill: '#7FB86B', stroke: 'rgba(122,82,54,0.4)', lw: 2, seed: 101 });
  handShape(ctx, [[1082, 276], [1106, 276], [1101, 298], [1087, 298]], { fill: '#B98A5F', seed: 11 });
  handEllipse(ctx, 1094, 268, 8, 12, { fill: '#8FC47E', stroke: 'rgba(122,82,54,0.4)', lw: 2, seed: 111 });

  /* ── 右牆：窗戶 ── */
  handShape(ctx, [[1378, 178], [1722, 178], [1722, 402], [1378, 402]], { fill: '#FFF7EA', seed: 12 });
  handShape(ctx, [[1400, 200], [1700, 200], [1700, 380], [1400, 380]], { fill: '#CBE9F8', stroke: 'rgba(122,82,54,0.35)', lw: 2, seed: 13 });
  handEllipse(ctx, 1500, 258, 24, 24, { fill: '#FFD98A', stroke: '#E8B96F', lw: 2, seed: 14 });
  handEllipse(ctx, 1610, 322, 30, 14, { fill: '#FFFFFF', stroke: 'rgba(122,82,54,0.2)', lw: 2, seed: 15 });
  handEllipse(ctx, 1642, 312, 20, 11, { fill: '#FFFFFF', stroke: 'rgba(122,82,54,0.2)', lw: 2, seed: 16 });
  handLineLong(ctx, 1550, 200, 1550, 380, { stroke: '#FFF7EA', lw: 9, seed: 17, amp: 1.5 });
  handLineLong(ctx, 1400, 290, 1700, 290, { stroke: '#FFF7EA', lw: 9, seed: 18, amp: 1.5 });
  handShape(ctx, [[1368, 380], [1732, 380], [1732, 398], [1368, 398]], { fill: '#E9CDA9', seed: 19 });

  /* ── 右牆：時鐘 + 愛心畫框 + 盆栽 ── */
  handEllipse(ctx, 1806, 250, 36, 36, { fill: '#FFF7EA', lw: 3.5, seed: 20 });
  handLine(ctx, 1806, 250, 1806, 228, { lw: 3.5, seed: 201 });
  handLine(ctx, 1806, 250, 1820, 258, { lw: 3.5, seed: 202 });
  handShape(ctx, [[1920, 218], [2010, 218], [2010, 334], [1920, 334]], { fill: '#FFF7EA', seed: 21 });
  ctx.fillStyle = '#FF8FB2';
  ctx.save(); ctx.translate(1965, 276); drawHeartPath(ctx, 0, 0, 15); ctx.fill(); ctx.restore();

  handShape(ctx, [[2080, 488], [2128, 488], [2118, 542], [2090, 542]], { fill: '#C97B5A', seed: 22 });
  handEllipse(ctx, 2092, 468, 11, 24, { fill: '#7FB86B', stroke: 'rgba(122,82,54,0.35)', lw: 2, seed: 221 });
  handEllipse(ctx, 2104, 452, 11, 28, { fill: '#8FC47E', stroke: 'rgba(122,82,54,0.35)', lw: 2, seed: 222 });
  handEllipse(ctx, 2116, 468, 11, 24, { fill: '#7FB86B', stroke: 'rgba(122,82,54,0.35)', lw: 2, seed: 223 });

  /* ── 最下方：被子（我們正躺著） ── */
  const rnd = mulberry32(77);
  const edge = [];
  for (let i = 0; i <= 40; i++)
    edge.push(575 + (rnd() - 0.5) * 12);
  ctx.beginPath();
  ctx.moveTo(0, edge[0]);
  for (let i = 1; i <= 40; i++) ctx.lineTo((W / 40) * i, edge[i]);
  ctx.lineTo(W, H); ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = '#FFE1EA'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.stroke();
  /* 被子圓點 */
  const dr = mulberry32(88);
  ctx.fillStyle = '#FFC2D4';
  for (let i = 0; i < 26; i++) {
    const x = dr() * W, y = 600 + dr() * 50;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  panCanvas = c;
}

/* 第一人稱畫面：全景切片 + 眼皮（需在 world transform 下呼叫） */
function renderFP(ctx, camX, openT, skin) {
  ensurePano();
  ctx.drawImage(panCanvas, clamp(camX, 0, PAN.W - VW), 0, VW, VH, 0, 0, VW, VH);
  /* 轉回螢幕座標畫眼皮 */
  ctx.setTransform(Game.dpr, 0, 0, Game.dpr, 0, 0);
  drawLids(ctx, innerWidth, innerHeight, openT, skin);
}

/* 眼皮：上、下兩條皮膚色帶 + 睫毛 + 中間暗縫 */
function drawLids(ctx, w, h, openT, skin) {
  const k = 1 - openT;
  if (k > 0.002) {
    ctx.fillStyle = `rgba(43,30,20,${(0.9 * k).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
  const ink = '#5A4632';
  const amp = 6;

  /* 上眼皮 */
  const th = lerp(h * 0.46, Math.max(26, h * 0.05), openT);
  const topEdge = (x) => {
    const i = clamp(x / w, 0, 1) * LID_N;
    const i0 = Math.floor(i), f = i - i0;
    const j = lerp(lidTopJit[i0], lidTopJit[Math.min(LID_N, i0 + 1)], f);
    return th + j * amp + Math.sin(Math.PI * (x / w)) * 10;
  };
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(w, 0);
  for (let x = w; x >= 0; x -= w / LID_N) ctx.lineTo(x, topEdge(x));
  ctx.closePath();
  ctx.fillStyle = skin; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = 0; x <= w; x += w / LID_N) {
    const y = topEdge(x);
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = 1; i <= 7; i++) {
    const x = w * (0.05 + 0.12 * i), y = topEdge(x);
    handLine(ctx, x, y + 2, x + 5, y + 15, { stroke: ink, lw: 3, seed: 900 + i, amp: 1 });
  }

  /* 下眼皮 */
  const bh = lerp(h * 0.5, Math.max(34, h * 0.06), openT);
  const botEdge = (x) => {
    const i = clamp(x / w, 0, 1) * LID_N;
    const i0 = Math.floor(i), f = i - i0;
    const j = lerp(lidBotJit[i0], lidBotJit[Math.min(LID_N, i0 + 1)], f);
    return h - bh + j * amp - Math.sin(Math.PI * (x / w)) * 12;
  };
  ctx.beginPath();
  ctx.moveTo(0, h); ctx.lineTo(w, h);
  for (let x = w; x >= 0; x -= w / LID_N) ctx.lineTo(x, botEdge(x));
  ctx.closePath();
  ctx.fillStyle = skin; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= w; x += w / LID_N) {
    const y = botEdge(x);
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = 1; i <= 7; i++) {
    const x = w * (0.05 + 0.12 * i), y = botEdge(x);
    handLine(ctx, x, y - 2, x - 5, y - 15, { stroke: ink, lw: 3, seed: 950 + i, amp: 1 });
  }
}

/* 鏡頭平移時間線：中 → 左 → 右 → 中 */
const FP_PAN_DUR = 5.4;
function fpCamX(t) {
  const min = 60, max = PAN.W - VW - 60, c = (min + max) / 2;
  const e = (a, b, s, e2) => {
    if (t < s) return a;
    if (t > e2) return b;
    const k = (t - s) / (e2 - s);
    return a + (b - a) * (k * k * (3 - 2 * k));
  };
  if (t < 0.5) return c;
  if (t < 2.1) return e(c, min, 0.5, 1.9);
  if (t < 2.6) return min;
  if (t < 4.2) return e(min, max, 2.7, 4.0);
  if (t < 4.7) return max;
  return e(max, c, 4.8, 5.3);
}
/* 對話時的緩慢左右晃 */
function fpCamIdle(t) {
  const c = (60 + (PAN.W - VW - 60)) / 2;
  return c + Math.sin(t * 0.55) * 40;
}
