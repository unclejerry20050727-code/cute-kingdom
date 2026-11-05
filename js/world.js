/* ══════════ 等距世界：房間、家具 ══════════ */
'use strict';

const N = 10;          /* 房間 10x10 格 */
const TW = 64, TH = 32; /* 等距格 2:1 */
const WALL_H = 300;     /* 牆高(px)：對照小森風參考圖，房子要像方盒子 */

const C_BG = { base: '#EDD3AE', dot: '#5A3E2B' };
const C_ROOM = {
  floorA: '#FBEDD9', floorB: '#F6E1C6', floorLine: 'rgba(122,82,54,0.10)',
  wall: '#FDF2DF', wallTop: '#F3DDBC', baseboard: '#E9CDA9',
  windowFrame: '#FFF7EA', sky: '#CBE9F8', sun: '#FFD98A',
  doorFrame: '#FFF7EA', door: '#F5A8C0', doorKnob: '#FFF7EA',
};

/* ══════════ 手繪風工具（種子化抖動，預渲染不會閃爍） ══════════ */
const INK = '#7A5236';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* 手繪多邊形（anchor 點 + 每邊細分抖動） */
function handPoly(ctx, pts, seed = 1, amp = 2.5, segs = 3) {
  const rnd = mulberry32(seed);
  const n = pts.length;
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    for (let s = 0; s <= segs; s++) {
      if (i === n - 1 && s === segs) break;
      const t = s / segs;
      p.push([
        lerp(a[0], b[0], t) + (rnd() - 0.5) * amp * 2,
        lerp(a[1], b[1], t) + (rnd() - 0.5) * amp * 2,
      ]);
    }
  }
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
  ctx.closePath();
}

/* 手繪形狀：填色 + 描邊 */
function handShape(ctx, pts, opt = {}) {
  const { fill, stroke = INK, lw = 3, seed = 1, amp = 2.5, segs = 3 } = opt;
  handPoly(ctx, pts, seed, amp, segs);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.strokeStyle = stroke; ctx.lineWidth = lw;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
  }
}

/* 手繪橢圓/圓 */
function handEllipse(ctx, x, y, rx, ry, opt = {}) {
  const { fill, stroke = INK, lw = 3, seed = 2, amp = 2, n = 26 } = opt;
  const rnd = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const j = 1 + (rnd() - 0.5) * (amp / Math.max(rx, ry)) * 2;
    pts.push([x + Math.cos(a) * rx * j, y + Math.sin(a) * ry * j]);
  }
  ctx.beginPath();
  ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

/* 手繪直線（微抖動） */
function handLine(ctx, x1, y1, x2, y2, opt = {}) {
  const { stroke = INK, lw = 3, seed = 3, amp = 2, segs = 4 } = opt;
  const rnd = mulberry32(seed);
  ctx.beginPath();
  for (let s = 0; s <= segs; s++) {
    const t = s / segs;
    const x = lerp(x1, x2, t) + (s === 0 || s === segs ? 0 : (rnd() - 0.5) * amp * 2);
    const y = lerp(y1, y2, t) + (s === 0 || s === segs ? 0 : (rnd() - 0.5) * amp * 2);
    s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.stroke();
}

/* 長距離手繪直線（自動分段，避免抖動太稀） */
function handLineLong(ctx, x1, y1, x2, y2, opt = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(1, Math.round(len / 240));
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n;
    handLine(ctx, lerp(x1, x2, a), lerp(y1, y2, a), lerp(x1, x2, b), lerp(y1, y2, b),
      { ...opt, seed: (opt.seed || 1) + i * 97 });
  }
}

/* 手繪圓的 SVG path（loading 圈圈用） */
function handCirclePathD(cx, cy, r, seed = 1, amp = 3, n = 42) {
  const rnd = mulberry32(seed);
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + (rnd() - 0.5) * amp * 2;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
  }
  return d + 'Z';
}

/* 虛擬視口（世界座標），由 game.js 縮放貼合視窗 */
const VW = 980, VH = 660;
let OX = VW / 2, OY = 0;
function initWorldOrigin() {
  OX = VW / 2;
  OY = (VH - (N * TH + WALL_H)) / 2 + WALL_H + 16;
}
initWorldOrigin();

/* 格座標 → 世界座標（oy 為往上偏移的像素）
   第十輪：ROT_FN 非空時先把 tile 座標重新映射（繪製旋轉 90° 的地板品項用） */
let ROT_FN = null;
function P(tx, ty, oy = 0) {
  if (ROT_FN) { const r = ROT_FN(tx, ty); tx = r[0]; ty = r[1]; }
  return [OX + (tx - ty) * TW / 2, OY + (tx + ty) * TH / 2 + oy];
}
/* 第十輪：90° 旋轉座標映射——原足跡 (tx,ty) w×d 的繪製座標 → 旋轉後足跡 (tx,ty) d×w
   做法：以「原足跡中心」為中心在 tile 空間轉 90°，再平移到「旋轉後足跡中心」，兩個長方形正好重疊 */
function rot90Fn(tx, ty, w, d) {
  const cx = tx + w / 2, cy = ty + d / 2;
  const nx = tx + d / 2, ny = ty + w / 2;
  return (x, y) => [nx - (y - cy), ny + (x - cx)];
}
/* 以 90° 旋轉方式執行 drawFn()（只用於 floor 品項、w≠d） */
function drawRot90(tx, ty, it, drawFn) {
  ROT_FN = rot90Fn(tx, ty, it.w, it.d);
  try { drawFn(); } finally { ROT_FN = null; }
}
/* 世界座標 → 格座標 */
function screenToTile(wx, wy) {
  const dx = wx - OX, dy = wy - OY;
  return [(dy / (TH / 2) + dx / (TW / 2)) / 2, (dy / (TH / 2) - dx / (TW / 2)) / 2];
}

/* ── 波點背景（screen 座標，蓋滿整個視窗） ── */
function drawPolkaBg(ctx, w, h) {
  ctx.fillStyle = C_BG.base;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C_BG.dot;
  const gap = 64, r = 9;
  for (let row = 0, y = -gap / 2; y < h + gap; row++, y += gap) {
    const off = (row % 2) * gap / 2;
    for (let x = -gap / 2 + off; x < w + gap; x += gap) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ── 房間 ── */
function drawRoom(ctx) {
  const c = C_ROOM;
  const floorA = roomFloorTint || c.floorA;
  const floorB = roomFloorTint ? shade(roomFloorTint, -0.05) : c.floorB;
  /* 地板大菱形（帶柔和陰影） */
  const [ax, ay] = P(0, 0), [bx, by] = P(N, 0), [cx2, cy2] = P(N, N), [dx, dy] = P(0, N);
  ctx.save();
  ctx.shadowColor = 'rgba(90,62,43,0.35)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = floorB;
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* 地板磚 */
  for (let ty = 0; ty < N; ty++) {
    for (let tx = 0; tx < N; tx++) {
      const [x0, y0] = P(tx, ty), [x1, y1] = P(tx + 1, ty), [x2, y2] = P(tx + 1, ty + 1), [x3, y3] = P(tx, ty + 1);
      ctx.fillStyle = (tx + ty) % 2 === 0 ? floorA : floorB;
      ctx.strokeStyle = c.floorLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  /* 後緣陰影（牆腳） */
  drawWallEdgeShadow(ctx, 0, N, 0, 0);      /* ty=0 邊（右後牆下） */
  drawWallEdgeShadow(ctx, 0, 0, 0, N);      /* tx=0 邊（左後牆下） */

  /* 牆 A：ty=0 邊（往右後延伸） */
  drawWallA(ctx);
  /* 牆 B：tx=0 邊（往左後延伸） */
  drawWallB(ctx);

  /* 內角 */
  ctx.strokeStyle = 'rgba(122,82,54,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(OX, OY - WALL_H);
  ctx.lineTo(OX, OY);
  ctx.stroke();
}

function drawWallEdgeShadow(ctx, tx0, tx1, ty0, ty1) {
  const [x0, y0] = P(tx0, ty0, 0), [x1, y1] = P(tx1, ty1, 0);
  const [x2, y2] = P(tx1, ty1, 3), [x3, y3] = P(tx0, ty0, 3);
  ctx.fillStyle = 'rgba(90,62,43,0.08)';
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

/* 右後牆（沿 ty=0，從 P(0,0) 到 P(N,0)）：窗戶在這面 */
function drawWallA(ctx) {
  const c = C_ROOM;
  const wallC = roomWallTint || c.wall;
  const [ax, ay] = P(0, 0), [bx, by] = P(N, 0);
  /* 牆面 */
  ctx.fillStyle = wallC;
  ctx.beginPath();
  ctx.moveTo(ax, ay - WALL_H); ctx.lineTo(bx, by - WALL_H);
  ctx.lineTo(bx, by); ctx.lineTo(ax, ay);
  ctx.closePath();
  ctx.fill();
  /* 頂緣 */
  ctx.fillStyle = c.wallTop;
  ctx.beginPath();
  ctx.moveTo(ax, ay - WALL_H); ctx.lineTo(bx, by - WALL_H);
  ctx.lineTo(bx, by - WALL_H + 14); ctx.lineTo(ax, ay - WALL_H + 14);
  ctx.closePath();
  ctx.fill();
  /* 牆裙 */
  ctx.fillStyle = c.baseboard;
  ctx.beginPath();
  ctx.moveTo(ax, ay - 14); ctx.lineTo(bx, by - 14);
  ctx.lineTo(bx, by); ctx.lineTo(ax, ay);
  ctx.closePath();
  ctx.fill();

  /* 窗戶（tx 2.7~5.7，距頂 52~184） */
  const w0 = 2.7, w1 = 5.7, top = -WALL_H + 52, bot = -WALL_H + 184;
  const [wx0, wy0] = P(w0, 0, bot), [wx1, wy1] = P(w1, 0, bot), [wx2, wy2] = P(w1, 0, top), [wx3, wy3] = P(w0, 0, top);
  ctx.fillStyle = c.windowFrame;
  poly(ctx, [wx0, wy0], [wx1, wy1], [wx2, wy2], [wx3, wy3]);
  ctx.fillStyle = c.sky;
  const in0 = 5;
  poly(ctx,
    [wx0 + in0, wy0 + in0 * 0.42], [wx1 - in0, wy1 - in0 * 0.42],
    [wx2 - in0, wy2 - in0 * 0.42], [wx3 + in0, wy3 + in0 * 0.42]);
  /* 太陽 + 小雲 */
  const [sx, sy] = P(3.4, 0, -WALL_H + 106);
  ctx.fillStyle = c.sun;
  ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const [cx1, cy1] = P(4.9, 0, -WALL_H + 81);
  ellipse(ctx, cx1, cy1, 15, 8);
  ellipse(ctx, cx1 + 11, cy1 - 4, 10, 6);
  /* 窗框十字 */
  ctx.strokeStyle = c.windowFrame;
  ctx.lineWidth = 6;
  const [mx0, my0] = P(4.2, 0, bot), [mx1, my1] = P(4.2, 0, top);
  ctx.beginPath(); ctx.moveTo(mx0, my0); ctx.lineTo(mx1, my1); ctx.stroke();
  const [my0a, my0b] = [bot, top];
  const [hz0, hz1] = P(w0, 0, (bot + top) / 2), [hz2, hz3] = P(w1, 0, (bot + top) / 2);
  ctx.beginPath(); ctx.moveTo(hz0, hz1); ctx.lineTo(hz2, hz3); ctx.stroke();
  /* 窗台 */
  ctx.fillStyle = c.baseboard;
  const [sb0, sb1] = P(w0 - 0.15, 0, bot), [sb2, sb3] = P(w1 + 0.15, 0, bot);
  ctx.beginPath();
  ctx.moveTo(sb0, sb1); ctx.lineTo(sb2, sb3);
  ctx.lineTo(sb2, sb3 + 10); ctx.lineTo(sb0, sb1 + 10);
  ctx.closePath();
  ctx.fill();

  /* 小愛心畫框 */
  const [hx, hy] = P(7.6, 0, -WALL_H + 132);
  ctx.fillStyle = c.windowFrame;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.265);
  ctx.fillRect(-16, -21, 32, 42);
  ctx.fillStyle = '#FF8FB2';
  drawHeartPath(ctx, 0, 0, 11);
  ctx.fill();
  ctx.restore();
}

/* 左後牆（沿 tx=0，從 P(0,0) 到 P(0,N)）：門在這面 */
function drawWallB(ctx) {
  const c = C_ROOM;
  const wallC = roomWallTint || c.wall;
  const [ax, ay] = P(0, 0), [bx, by] = P(0, N);
  ctx.fillStyle = wallC;
  ctx.beginPath();
  ctx.moveTo(ax, ay - WALL_H); ctx.lineTo(bx, by - WALL_H);
  ctx.lineTo(bx, by); ctx.lineTo(ax, ay);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.wallTop;
  ctx.beginPath();
  ctx.moveTo(ax, ay - WALL_H); ctx.lineTo(bx, by - WALL_H);
  ctx.lineTo(bx, by - WALL_H + 14); ctx.lineTo(ax, ay - WALL_H + 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.baseboard;
  ctx.beginPath();
  ctx.moveTo(ax, ay - 14); ctx.lineTo(bx, by - 14);
  ctx.lineTo(bx, by); ctx.lineTo(ax, ay);
  ctx.closePath();
  ctx.fill();

  /* 門（ty 6.2~8.2） */
  const d0 = 6.2, d1 = 8.2, doorH = 168;
  const [dx0, dy0] = P(0, d0, 0), [dx1, dy1] = P(0, d1, 0);
  /* 門框 */
  ctx.fillStyle = c.doorFrame;
  ctx.beginPath();
  ctx.moveTo(dx0, dy0 - doorH - 12); ctx.lineTo(dx1, dy1 - doorH - 12);
  ctx.lineTo(dx1, dy1); ctx.lineTo(dx0, dy0);
  ctx.closePath();
  ctx.fill();
  /* 門板 */
  ctx.fillStyle = c.door;
  const m = 9;
  ctx.beginPath();
  ctx.moveTo(dx0 + m, dy0 - doorH); ctx.lineTo(dx1 - m, dy1 - doorH);
  ctx.lineTo(dx1 - m, dy1 - 2); ctx.lineTo(dx0 + m, dy0 - 2);
  ctx.closePath();
  ctx.fill();
  /* 門上的小窗 + 把手 */
  const [px, py] = P(0, 7.2, -doorH + 44);
  ctx.fillStyle = c.doorFrame;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.265);
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const [kx, ky] = P(0, 7.85, -doorH * 0.42);
  ctx.fillStyle = '#FFD98A';
  ellipse(ctx, kx, ky, 4.5, 4.5);
  /* 門檻小地毯 */
  const [rx0, ry0] = P(0.15, d0 + 0.15, 2), [rx1, ry1] = P(0.15, d1 - 0.15, 2);
  ctx.fillStyle = 'rgba(255,182,205,0.85)';
  ctx.beginPath();
  ctx.moveTo(rx0, ry0); ctx.lineTo(rx1, ry1);
  ctx.lineTo(rx1 - 14, ry1 + 8); ctx.lineTo(rx0 - 14, ry0 + 8);
  ctx.closePath();
  ctx.fill();
}

function poly(ctx, ...pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}
function drawHeartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.5, x - s * 0.5, y - s * 1.1, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s, y - s * 0.5, x, y + s * 0.35);
  ctx.closePath();
}

/* ══════════ 家具：床 ══════════ */
const BED = { id: 'bed', name: '床', w: 2, d: 1, h: 26 };

function drawBed(ctx, tx, ty, o = {}) {
  const { w, d, h } = BED;
  const A = P(tx, ty, -h), B = P(tx + w, ty, -h), C2 = P(tx + w, ty + d, -h), D = P(tx, ty + d, -h);
  const A0 = P(tx, ty), B0 = P(tx + w, ty), C0 = P(tx + w, ty + d), D0 = P(tx, ty + d);

  const savedAlpha = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;

  /* 側面 */
  ctx.fillStyle = o.tint === 'bad' ? '#E89AA6' : '#F0C08F';
  poly(ctx, [B0[0], B0[1]], [C0[0], C0[1]], [C2[0], C2[1]], [B[0], B[1]]);
  ctx.fillStyle = o.tint === 'bad' ? '#DE8794' : '#E2AE7C';
  poly(ctx, [C0[0], C0[1]], [D0[0], D0[1]], [D[0], D[1]], [C2[0], C2[1]]);

  /* 床面 */
  ctx.fillStyle = o.tint === 'bad' ? '#F3B7C1' : '#FFF6E9';
  poly(ctx, [A[0], A[1]], [B[0], B[1]], [C2[0], C2[1]], [D[0], D[1]]);

  if (!o.ghost) {
    /* 被單（靠 B/C 那側 62%） */
    const s = 0.38;
    const E1 = [lerp(A[0], B[0], s), lerp(A[1], B[1], s)];
    const E2 = [lerp(D[0], C2[0], s), lerp(D[1], C2[1], s)];
    ctx.fillStyle = '#FFC2D4';
    poly(ctx, [E1[0], E1[1]], [B[0], B[1]], [C2[0], C2[1]], [E2[0], E2[1]]);
    ctx.strokeStyle = 'rgba(240,98,146,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(E1[0], E1[1]); ctx.lineTo(E2[0], E2[1]); ctx.stroke();
    /* 小愛心在被單上 */
    const [hxx, hyy] = P(tx + 1.45, ty + 0.5, -h);
    ctx.fillStyle = '#FF8FB2';
    drawHeartPath(ctx, hxx, hyy, 6);
    ctx.fill();
    /* 枕頭 */
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#F2D5DE';
    ctx.lineWidth = 2;
    const p0 = 0.06, p1 = 0.26;
    const F1 = [lerp(A[0], B[0], p0), lerp(A[1], B[1], p0)];
    const F2 = [lerp(A[0], B[0], p1), lerp(A[1], B[1], p1)];
    const F3 = [lerp(D[0], C2[0], p1), lerp(D[1], C2[1], p1)];
    const F4 = [lerp(D[0], C2[0], p0), lerp(D[1], C2[1], p0)];
    ctx.beginPath();
    ctx.moveTo(F1[0], F1[1]); ctx.lineTo(F2[0], F2[1]); ctx.lineTo(F3[0], F3[1]); ctx.lineTo(F4[0], F4[1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    /* 床沿高光 */
    ctx.strokeStyle = 'rgba(122,82,54,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C2[0], C2[1]); ctx.lineTo(D[0], D[1]);
    ctx.closePath();
    ctx.stroke();
  }

  if (o.ghost) {
    /* 有效範圍提示 */
    ctx.globalAlpha *= 0.25;
    ctx.fillStyle = o.tint === 'bad' ? '#E05A6A' : '#58C27D';
    const g0 = P(tx, ty), g1 = P(tx + w, ty), g2 = P(tx + w, ty + d), g3 = P(tx, ty + d);
    poly(ctx, [g0[0], g0[1]], [g1[0], g1[1]], [g2[0], g2[1]], [g3[0], g3[1]]);
  }
  ctx.globalAlpha = savedAlpha;
}

/* 家具佔用格 */
function bedTiles(tx, ty) {
  const out = [];
  for (let dx = 0; dx < BED.w; dx++)
    for (let dy = 0; dy < BED.d; dy++)
      out.push([Math.floor(tx) + dx, Math.floor(ty) + dy]);
  return out;
}

/* ══════════ 建造系統：目錄、放置、家具繪製 ══════════ */

/* 房間換色（0＝原色） */
const WALL_TINTS = [null, '#FCE4EC', '#DDEEF9', '#E5F2DF', '#FBF0CE'];
const FLOOR_TINTS = [null, '#FBE3EA', '#E7F0F8', '#ECF3E3', '#F9EFD0'];
let roomWallTint = null, roomFloorTint = null;
function setRoomTints(w, f) {
  roomWallTint = WALL_TINTS[w] || null;
  roomFloorTint = FLOOR_TINTS[f] || null;
}

/* 等距箱子（顶面＋前右面＋前左面）：h0/h1 為離地高度 */
function isoBox(ctx, tx, ty, w, d, h0, h1, opt = {}) {
  const { top = '#FFF6E9', right = '#F0C08F', left = '#E2AE7C', stroke = INK, lw = 3 } = opt;
  const A = P(tx, ty, -h1), B = P(tx + w, ty, -h1), C = P(tx + w, ty + d, -h1), D = P(tx, ty + d, -h1);
  const A0 = P(tx, ty, -h0), B0 = P(tx + w, ty, -h0), C0 = P(tx + w, ty + d, -h0), D0 = P(tx, ty + d, -h0);
  ctx.fillStyle = right;
  poly(ctx, [B0[0], B0[1]], [C0[0], C0[1]], [C[0], C[1]], [B[0], B[1]]);
  ctx.fillStyle = left;
  poly(ctx, [C0[0], C0[1]], [D0[0], D0[1]], [D[0], D[1]], [C[0], C[1]]);
  ctx.fillStyle = top;
  poly(ctx, [A[0], A[1]], [B[0], B[1]], [C[0], C[1]], [D[0], D[1]]);
  if (stroke) {
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    poly(ctx, [A[0], A[1]], [B[0], B[1]], [C[0], C[1]], [D[0], D[1]]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(B0[0], B0[1]); ctx.lineTo(B[0], B[1]);
    ctx.moveTo(C0[0], C0[1]); ctx.lineTo(C[0], C[1]);
    ctx.moveTo(D0[0], D0[1]); ctx.lineTo(D[0], D[1]);
    ctx.stroke();
  }
}

/* 立面空間：which='tx' → +tx 面（朝前右）；'ty' → +ty 面（朝前左）。
   進入後用 2D 座標繪製（x 沿牆向右、y 向下），自動帶上等距斜度 */
function faceSpace(ctx, tx, ty, h, which) {
  const [px, py] = P(which === 'tx' ? tx + 1 : tx, ty, -h);
  let ux = which === 'tx' ? -0.8944 : 0.8944, uy = 0.4472;
  if (ROT_FN) { /* 第十輪：旋轉時側面方向隨 tile 軸轉（(0,1)→(−1,0)、(1,0)→(0,1)） */
    ux = -0.8944;
    uy = which === 'tx' ? -0.4472 : 0.4472;
  }
  ctx.transform(ux, uy, 0, 1, px, py);
}

/* 幽靈放置足跡提示 */
function ghostFootprint(ctx, tx, ty, w, d, o) {
  ctx.globalAlpha *= 0.25;
  ctx.fillStyle = o.tint === 'bad' ? '#E05A6A' : '#58C27D';
  const g0 = P(tx, ty), g1 = P(tx + w, ty), g2 = P(tx + w, ty + d), g3 = P(tx, ty + d);
  poly(ctx, [g0[0], g0[1]], [g1[0], g1[1]], [g2[0], g2[1]], [g3[0], g3[1]]);
}

/* ── 家具：書桌 ── */
function drawDesk(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  isoBox(ctx, tx + 0.12, ty + 0.18, 0.3, 0.64, 0, 21, { top: '#E2AE7C', right: '#D8A26F', left: '#C8905C' });
  isoBox(ctx, tx + 1.58, ty + 0.18, 0.3, 0.64, 0, 21, { top: '#E2AE7C', right: '#D8A26F', left: '#C8905C' });
  isoBox(ctx, tx, ty, 2, 1, 21, 26, { top: '#FBE3BC', right: '#E9C28F', left: '#DBB27E' });
  if (!o.ghost) {
    isoBox(ctx, tx + 0.32, ty + 0.22, 0.5, 0.5, 26, 29.5, { top: '#FF9FBE', right: '#F287A9', left: '#E27399', lw: 2 });
    isoBox(ctx, tx + 1.28, ty + 0.28, 0.36, 0.36, 26, 33, { top: '#BFE3F2', right: '#A8D8EC', left: '#93CBDF', lw: 2 });
    ctx.fillStyle = '#FF8FB2';
    const [hx, hy] = P(tx + 1.46, ty + 0.46, -33.5);
    drawHeartPath(ctx, hx, hy, 3.4);
    ctx.fill();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 2, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 家具：椅子 ── */
function drawChair(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  /* 靠背（後側直板） */
  const b1 = P(tx + 0.12, ty + 0.08, -42), b2 = P(tx + 0.88, ty + 0.08, -42);
  const b3 = P(tx + 0.88, ty + 0.08, -17), b4 = P(tx + 0.12, ty + 0.08, -17);
  ctx.fillStyle = o.tint === 'bad' ? '#DE8794' : '#FF9FBE';
  poly(ctx, [b1[0], b1[1]], [b2[0], b2[1]], [b3[0], b3[1]], [b4[0], b4[1]]);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
  ctx.stroke();
  /* 四腳 */
  for (const [lx, lz] of [[0.12, 0.14], [0.74, 0.14], [0.12, 0.72], [0.74, 0.72]]) {
    isoBox(ctx, tx + lx, ty + lz, 0.12, 0.12, 0, 15, { top: '#E2AE7C', right: '#D8A26F', left: '#C8905C', lw: 1.6 });
  }
  /* 坐墊 */
  isoBox(ctx, tx + 0.06, ty + 0.1, 0.88, 0.84, 14, 18, { top: '#FFD3E0', right: '#F5A9C2', left: '#EA94B0' });
  if (!o.ghost) {
    ctx.fillStyle = '#FF8FB2';
    const [hx, hy] = P(tx + 0.5, ty + 0.52, -18.5);
    drawHeartPath(ctx, hx, hy, 3.2);
    ctx.fill();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 家具：沙發 ── */
function drawSofa(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  /* 底座 */
  isoBox(ctx, tx, ty, 2, 1, 0, 13, { top: '#F5A9C3', right: bad ? '#DE8794' : '#E88FAC', left: bad ? '#D47A88' : '#D97B9A' });
  /* 後背 */
  isoBox(ctx, tx, ty, 2, 0.42, 0, 32, { top: '#F7B7CC', right: bad ? '#DE8794' : '#E88FAC', left: bad ? '#D47A88' : '#D97B9A' });
  /* 坐墊 ×2 */
  isoBox(ctx, tx + 0.1, ty + 0.42, 0.84, 0.52, 13, 19, { top: '#FFD3E0', right: '#F5A9C2', left: '#EA94B0', lw: 2 });
  isoBox(ctx, tx + 1.06, ty + 0.42, 0.84, 0.52, 13, 19, { top: '#FFD3E0', right: '#F5A9C2', left: '#EA94B0', lw: 2 });
  /* 扶手 ×2 */
  isoBox(ctx, tx - 0.06, ty + 0.3, 0.3, 0.64, 13, 27, { top: '#FFD3E0', right: '#F5A9C2', left: '#EA94B0' });
  isoBox(ctx, tx + 1.76, ty + 0.3, 0.3, 0.64, 13, 27, { top: '#FFD3E0', right: '#F5A9C2', left: '#EA94B0' });
  if (!o.ghost) {
    ctx.fillStyle = '#FF8FB2';
    const [hx, hy] = P(tx + 0.52, ty + 0.68, -19.5);
    drawHeartPath(ctx, hx, hy, 3.4);
    ctx.fill();
    const [hx2, hy2] = P(tx + 1.48, ty + 0.68, -19.5);
    drawHeartPath(ctx, hx2, hy2, 3.4);
    ctx.fill();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 2, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 家具：書架 ── */
function drawShelf(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  isoBox(ctx, tx, ty, 1, 1, 0, 58, { top: '#F0C08F', right: '#E2AE7C', left: '#D8A26F' });
  if (!o.ghost) {
    /* 前右面：書格 ×2 + 小書本 */
    ctx.save();
    faceSpace(ctx, tx, ty, 58, 'tx');
    const W = 35.78; /* 1 格 ≈ 35.8px */
    ctx.fillStyle = '#FFF6E9';
    ctx.fillRect(3, 8, W - 6, 20);
    ctx.fillRect(3, 32, W - 6, 20);
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.strokeRect(3, 8, W - 6, 20);
    ctx.strokeRect(3, 32, W - 6, 20);
    const books = ['#FF8FB2', '#7EC8E3', '#FFD98A', '#9F8FEF', '#7BC8A4'];
    for (let r = 0; r < 2; r++) {
      const y0 = 8 + r * 24;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = books[(i + r * 2) % books.length];
        ctx.fillRect(6 + i * 7, y0 + 20 - 14 - ((i * 13 + r * 7) % 5), 5, 14 + ((i * 13 + r * 7) % 5));
      }
    }
    ctx.restore();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 家具：五斗櫃 ── */
function drawDresser(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  isoBox(ctx, tx, ty, 1, 1, 0, 44, { top: '#FBE3BC', right: bad ? '#DE8794' : '#EFC99A', left: bad ? '#D47A88' : '#E2B483' });
  if (!o.ghost) {
    ctx.save();
    faceSpace(ctx, tx, ty, 44, 'ty');
    const W = 35.78;
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let r = 0; r < 3; r++) {
      ctx.strokeRect(4, 5 + r * 13, W - 8, 10);
      ctx.fillStyle = '#B98A5C';
      ctx.beginPath();
      ctx.arc(W / 2, 10 + r * 13, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    /* 頂上小盆栽 */
    isoBox(ctx, tx + 0.32, ty + 0.24, 0.3, 0.3, 44, 48, { top: '#D98E6A', right: '#C97E5B', left: '#B96E4C', lw: 1.6 });
    ctx.fillStyle = '#7BC8A4';
    const [cx, cy] = P(tx + 0.47, ty + 0.39, -48);
    ellipse(ctx, cx, cy - 4, 5, 6);
    ellipse(ctx, cx - 4, cy - 1, 3.4, 4);
    ellipse(ctx, cx + 4, cy - 1, 3.4, 4);
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 家具：落地燈 ── */
function drawLamp(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const c = P(tx + 0.5, ty + 0.5);
  /* 底座 */
  ctx.fillStyle = '#D98E6A';
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(c[0], c[1] - 2, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  /* 燈杆 */
  ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(c[0], c[1] - 3); ctx.lineTo(c[0], c[1] - 58); ctx.stroke();
  /* 光暈 */
  ctx.fillStyle = 'rgba(255,217,138,0.30)';
  ctx.beginPath(); ctx.ellipse(c[0], c[1] - 44, 22, 20, 0, 0, Math.PI * 2); ctx.fill();
  /* 燈罩 */
  ctx.fillStyle = o.tint === 'bad' ? '#DE8794' : '#FFD98A';
  ctx.beginPath();
  ctx.moveTo(c[0] - 17, c[1] - 56);
  ctx.quadraticCurveTo(c[0], c[1] - 62, c[0] + 17, c[1] - 56);
  ctx.lineTo(c[0] + 11, c[1] - 78);
  ctx.quadraticCurveTo(c[0], c[1] - 83, c[0] - 11, c[1] - 78);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke();
  /* 燈罩頂緣 */
  ctx.fillStyle = '#FFF3D6';
  ctx.beginPath(); ctx.ellipse(c[0], c[1] - 78, 11, 4.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.stroke();
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 家具：直立式鋼琴 ── */
function drawPiano(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  /* 琴身 */
  isoBox(ctx, tx, ty, 2, 1, 0, 52, { top: '#F7B7CC', right: bad ? '#DE8794' : '#EFA0BC', left: bad ? '#D47A88' : '#E28BA9' });
  /* 琴鍵（前左面下緣） */
  ctx.save();
  faceSpace(ctx, tx, ty, 52, 'ty');
  const W = 71.56;
  ctx.fillStyle = '#2E2018';
  ctx.fillRect(6, 34, W - 12, 11);
  ctx.fillStyle = '#FFF8EC';
  for (let i = 0; i < 9; i++) ctx.fillRect(8 + i * 7, 36, 4.6, 8);
  ctx.restore();
  /* 琴頂蓋板 */
  isoBox(ctx, tx - 0.05, ty - 0.04, 2.1, 1.08, 52, 56, { top: '#FFF0F6', right: '#F5A9C2', left: '#EA94B0' });
  if (!o.ghost) {
    ctx.fillStyle = '#FF8FB2';
    const [hx, hy] = P(tx + 1, ty + 0.5, -40);
    drawHeartPath(ctx, hx, hy, 5);
    ctx.fill();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 2, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 擺飾：盆栽 ── */
function drawPlant(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  isoBox(ctx, tx + 0.3, ty + 0.3, 0.4, 0.4, 0, 14, { top: '#EDB289', right: o.tint === 'bad' ? '#DE8794' : '#DE9C6C', left: o.tint === 'bad' ? '#D47A88' : '#C98A58', lw: 2.4 });
  const [bx, by] = P(tx + 0.5, ty + 0.5, -13);
  const leaf = (ang, len, wid, col) => {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(wid, -len * 0.55, 0, -len);
    ctx.quadraticCurveTo(-wid, -len * 0.55, 0, 0);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  };
  leaf(-0.62, 30, 8, '#8CCB7E');
  leaf(0.62, 30, 8, '#8CCB7E');
  leaf(-0.3, 38, 8.5, '#79BE6C');
  leaf(0.3, 38, 8.5, '#79BE6C');
  leaf(0, 44, 9, '#9AD88B');
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 擺飾：花瓶 ── */
function drawVase(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const [cx, cy] = P(tx + 0.5, ty + 0.5, -17);
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + 17);
  ctx.bezierCurveTo(cx - 12, cy + 10, cx - 11, cy - 4, cx - 3.5, cy - 12);
  ctx.lineTo(cx - 4.5, cy - 16);
  ctx.lineTo(cx + 4.5, cy - 16);
  ctx.lineTo(cx + 3.5, cy - 12);
  ctx.bezierCurveTo(cx + 11, cy - 4, cx + 12, cy + 10, cx + 4, cy + 17);
  ctx.closePath();
  ctx.fillStyle = o.tint === 'bad' ? '#DE8794' : '#A9D3E8';
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 16, 4.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#7FB8D4';
  ctx.fill(); ctx.stroke();
  if (!o.ghost) {
    ctx.fillStyle = '#FFF6E9';
    for (const [dx, dy, r] of [[-5, 2, 1.7], [5, 6, 1.7], [0, -6, 1.7], [-6, -8, 1.4], [6, -3, 1.4]]) {
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#B08D5F'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx - 1, cy - 16); ctx.quadraticCurveTo(cx - 5, cy - 26, cx - 3, cy - 31); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, cy - 16); ctx.quadraticCurveTo(cx + 6, cy - 25, cx + 4, cy - 30); ctx.stroke();
    ctx.fillStyle = '#FFD166';
    ctx.beginPath(); ctx.arc(cx - 3, cy - 32, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, cy - 31, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 擺飾：泰迪熊 ── */
function drawTeddy(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  const fur = bad ? '#DE8794' : '#D9A066', furL = bad ? '#F2B4C0' : '#F0D5B0';
  const [cx, cy] = P(tx + 0.5, ty + 0.5, -10);
  ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + s * 6.5, cy + 6, 4.5, 3.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = fur; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + s * 6.5, cy + 6.5, 2.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = furL; ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(cx, cy, 10, 8.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = fur; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, 5.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = furL; ctx.fill();
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + s * 10, cy - 3, 3.8, 5, s * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = fur; ctx.fill(); ctx.stroke();
  }
  const [hx, hy] = P(tx + 0.5, ty + 0.5, -22);
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.arc(hx + s * 6, hy - 6.5, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = fur; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + s * 6, hy - 6.5, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = furL; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2);
  ctx.fillStyle = fur; ctx.fill(); ctx.stroke();
  if (!o.ghost) {
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(hx - 2.8, hy - 1.5, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 2.8, hy - 1.5, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx, hy + 2.2, 3, 2.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = furL; ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy + 1.6, 1, 0, Math.PI * 2);
    ctx.fillStyle = INK; ctx.fill();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hx, hy + 3, 1.6, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 擺飾：氣球 ── */
function drawBalloon(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const [bx, by] = P(tx + 0.5, ty + 0.5, -68);
  const [sx, sy] = P(tx + 0.5, ty + 0.5, 0);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(sx, sy);
  ctx.bezierCurveTo(sx - 5, sy - 20, sx + 5, sy - 42, bx, by + 13);
  ctx.stroke();
  ctx.beginPath(); ctx.ellipse(bx, by, 12.5, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = o.tint === 'bad' ? '#DE8794' : '#FF9FBE';
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx - 3, by + 13); ctx.lineTo(bx + 3, by + 13); ctx.lineTo(bx, by + 17);
  ctx.closePath();
  ctx.fillStyle = o.tint === 'bad' ? '#D47A88' : '#F27DA4';
  ctx.fill(); ctx.stroke();
  if (!o.ghost) {
    ctx.beginPath(); ctx.ellipse(bx - 4.5, by - 5.5, 3, 4.2, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.fillStyle = '#FFF0F5';
    drawHeartPath(ctx, bx + 1.5, by + 0.5, 4.5);
    ctx.fill();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 地飾：地毯（貼地層） ── */
function drawRug(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  isoBox(ctx, tx + 0.08, ty + 0.08, 1.84, 1.84, 0, 4, {
    top: bad ? '#E3AEBB' : '#CDE8D5',
    right: bad ? '#DE8794' : '#AFCFBB',
    left: bad ? '#D47A88' : '#9FC0AB',
    stroke: null,
  });
  const i0 = 0.34;
  const r0 = P(tx + i0, ty + i0, -4), r1 = P(tx + 2 - i0, ty + i0, -4), r2 = P(tx + 2 - i0, ty + 2 - i0, -4), r3 = P(tx + i0, ty + 2 - i0, -4);
  ctx.strokeStyle = bad ? '#C96A7A' : '#8FBCA4'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.lineTo(r3[0], r3[1]);
  ctx.closePath(); ctx.stroke();
  if (!o.ghost) {
    ctx.fillStyle = bad ? '#E05A6A' : '#7FB89A';
    const [hx, hy] = P(tx + 1, ty + 1, -4.5);
    drawHeartPath(ctx, hx, hy, 5);
    ctx.fill();
    for (const [dx, dy] of [[0.55, 0.55], [1.45, 0.55], [0.55, 1.45], [1.45, 1.45]]) {
      const [px, py] = P(tx + dx, ty + dy, -4);
      ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 2, 2, o);
  ctx.globalAlpha = saved;
}

/* ── 地飾：門墊（貼地層） ── */
function drawDoormat(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  isoBox(ctx, tx + 0.1, ty + 0.1, 0.8, 0.8, 0, 2.5, {
    top: bad ? '#E3AEBB' : '#EBCFA4',
    right: bad ? '#DE8794' : '#D8B586',
    left: bad ? '#D47A88' : '#C7A26F',
    lw: 2.2,
  });
  ctx.strokeStyle = bad ? '#C96A7A' : '#B08D5F'; ctx.lineWidth = 1.6;
  for (const k of [0.32, 0.5, 0.68]) {
    const a = P(tx + 0.2, ty + k, -2.5), b = P(tx + 0.8, ty + k, -2.5);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 地飾：地板貼（貼地層） ── */
function drawDecal(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  const d0 = P(tx + 0.16, ty + 0.16), d1 = P(tx + 0.84, ty + 0.16), d2 = P(tx + 0.84, ty + 0.84), d3 = P(tx + 0.16, ty + 0.84);
  ctx.strokeStyle = bad ? '#E05A6A' : '#F0A9C2'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(d0[0], d0[1]); ctx.lineTo(d1[0], d1[1]); ctx.lineTo(d2[0], d2[1]); ctx.lineTo(d3[0], d3[1]); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = bad ? '#E05A6A' : '#FF9FBE';
  const [hx, hy] = P(tx + 0.5, ty + 0.5, -1);
  drawHeartPath(ctx, hx, hy, 4.5);
  ctx.fill();
  if (!o.ghost) {
    ctx.fillStyle = '#FFC9D8';
    for (const [dx, dy] of [[0.5, 0.3], [0.5, 0.7], [0.3, 0.5], [0.7, 0.5]]) {
      const [px, py] = P(tx + dx, ty + dy, -0.5);
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 地飾：小花叢 ── */
function drawFlower(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  const blooms = [
    { x: 0.32, y: 0.62, h: 10, c: bad ? '#E3AEBB' : '#FFD3E0' },
    { x: 0.58, y: 0.34, h: 14, c: bad ? '#E3AEBB' : '#CDB7F0' },
    { x: 0.5, y: 0.72, h: 8, c: bad ? '#E3AEBB' : '#FFE3B8' },
  ];
  for (const b of blooms) {
    const [bx, by] = P(tx + b.x, ty + b.y, 0);
    const [tx2, ty2] = P(tx + b.x, ty + b.y, -b.h);
    ctx.strokeStyle = bad ? '#C96A7A' : '#7FB89A'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 2, by - b.h * 0.6, tx2, ty2); ctx.stroke();
    if (!o.ghost) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath(); ctx.arc(tx2 + Math.cos(a) * 3.4, ty2 + Math.sin(a) * 3.4, 2.3, 0, Math.PI * 2);
        ctx.fillStyle = b.c; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(tx2, ty2, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD166'; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(tx2, ty2, 2, 0, Math.PI * 2); ctx.stroke();
    }
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 第十四輪c：節慶地面裝飾（tab:'fest' 🎉 頁；onFurn＝可放家具上，重用 11b surfaceHAt/drawLifted） ── */

/* 生日蛋糕（onFurn） */
function drawCake(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  const [cx, cy] = P(tx + 0.5, ty + 0.5, 0);
  /* 盤子 */
  ctx.beginPath(); ctx.ellipse(cx, cy - 1.5, 15.5, 6.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = bad ? '#E7B9C3' : '#FFFFFF'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  /* 下層 / 上層 */
  isoBox(ctx, tx + 0.15, ty + 0.15, 0.7, 0.7, 1.5, 14, {
    top: bad ? '#E3AEBB' : '#FFD3E2', right: bad ? '#DE8794' : '#F5A9C4', left: bad ? '#D47A88' : '#E88FB0', lw: 2,
  });
  isoBox(ctx, tx + 0.26, ty + 0.26, 0.48, 0.48, 14, 24, {
    top: bad ? '#EFD6DD' : '#FFF0F5', right: bad ? '#DE8794' : '#F7BFD2', left: bad ? '#D47A88' : '#EEA3BE', lw: 2,
  });
  /* 櫻桃裝飾（下層前緣） */
  if (!o.ghost) {
    for (const [dx, dy] of [[0.32, 0.8], [0.5, 0.84], [0.68, 0.8]]) {
      const [px, py] = P(tx + dx, ty + dy, -14.5);
      ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = bad ? '#D47A88' : '#E85A6A'; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  /* 蠟燭＋火苗 */
  for (const [dx, dy, c] of [
    [0.38, 0.38, bad ? '#E3AEBB' : '#F9E04E'],
    [0.56, 0.5, bad ? '#DE8794' : '#7EC8E3'],
    [0.44, 0.62, bad ? '#D47A88' : '#FF9FBE'],
  ]) {
    const [px, py] = P(tx + dx, ty + dy, -24);
    roundRectPath(ctx, px - 1.6, py - 8, 3.2, 8, 1.4);
    ctx.fillStyle = c; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    if (!o.ghost) {
      const [fx, fy] = P(tx + dx, ty + dy, -34);
      ctx.beginPath(); ctx.ellipse(fx, fy, 2, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFC94E'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(fx, fy + 0.8, 0.9, 1.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF3C4'; ctx.fill();
    }
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* 禮盒（onFurn） */
function drawGiftBox(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  /* 盒身＋盒蓋 */
  isoBox(ctx, tx + 0.2, ty + 0.2, 0.6, 0.6, 0, 15, {
    top: bad ? '#E3AEBB' : '#F08A9A', right: bad ? '#DE8794' : '#E86A80', left: bad ? '#D47A88' : '#D95570', lw: 2,
  });
  isoBox(ctx, tx + 0.13, ty + 0.13, 0.74, 0.74, 15, 20, {
    top: bad ? '#EFD6DD' : '#F5A3B1', right: bad ? '#DE8794' : '#E87C92', left: bad ? '#D47A88' : '#DA627C', lw: 2,
  });
  /* 絲帶（頂面十字＋兩正面垂落） */
  const rb = bad ? '#E7B9C3' : '#FFD166';
  ctx.strokeStyle = rb; ctx.lineWidth = 4;
  for (const [a, b] of [
    [P(tx + 0.5, ty + 0.13, -20.5), P(tx + 0.5, ty + 0.87, -20.5)],
    [P(tx + 0.13, ty + 0.5, -20.5), P(tx + 0.87, ty + 0.5, -20.5)],
    [P(tx + 0.5, ty + 0.87, -20), P(tx + 0.5, ty + 0.87, -1)],
    [P(tx + 0.87, ty + 0.5, -20), P(tx + 0.87, ty + 0.5, -1)],
  ]) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  /* 蝴蝶結 */
  const [bx, by] = P(tx + 0.5, ty + 0.5, -22);
  ctx.fillStyle = rb; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(bx + s * 5.5, by - 2, 4.5, 3.4, s * 0.4, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* 聖誕樹 */
function drawXmasTree(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  const [cx] = P(tx + 0.5, ty + 0.5, 0);
  const yAt = z => P(tx + 0.5, ty + 0.5, -z)[1];
  /* 樹幹 */
  isoBox(ctx, tx + 0.4, ty + 0.4, 0.2, 0.2, 0, 7, {
    top: bad ? '#DE8794' : '#A9744F', right: bad ? '#D47A88' : '#96653F', left: bad ? '#C96A7A' : '#83573A', lw: 1.8,
  });
  /* 三層葉片 */
  for (const t of [
    { w: 19, z0: 5, z1: 30, c: bad ? '#DE8794' : '#5FA463', seed: 41 },
    { w: 14, z0: 24, z1: 46, c: bad ? '#E3AEBB' : '#6FB573', seed: 42 },
    { w: 9, z0: 40, z1: 59, c: bad ? '#EFD6DD' : '#7FC483', seed: 43 },
  ]) {
    handShape(ctx, [[cx - t.w, yAt(t.z0)], [cx + t.w, yAt(t.z0)], [cx, yAt(t.z1)]], {
      fill: t.c, stroke: INK, lw: 2, seed: t.seed, amp: 1.8,
    });
  }
  /* 頂星（重用既有 starPath） */
  const [sx, sy] = P(tx + 0.5, ty + 0.5, -62);
  starPath(ctx, sx, sy, 7.5);
  ctx.fillStyle = bad ? '#E7B9C3' : '#FFD166'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  /* 裝飾球 */
  if (!o.ghost) {
    for (const [dx, z, c] of [[-8, 19, '#E85A6A'], [7, 17, '#FFD166'], [-4, 37, '#7EC8E3'], [3, 41, '#FF9FBE']]) {
      ctx.beginPath(); ctx.arc(cx + dx, yAt(z), 2.3, 0, Math.PI * 2);
      ctx.fillStyle = c; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* 南瓜 */
function drawPumpkin(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  const [cx, c12] = P(tx + 0.5, ty + 0.5, -12);
  ctx.lineWidth = 2.2; ctx.strokeStyle = INK;
  /* 側瓣→中央瓣 */
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + s * 8.5, c12, 8, 10.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = bad ? '#D47A88' : '#E0742E'; ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(cx, c12, 11.5, 11.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = bad ? '#DE8794' : '#F5883C'; ctx.fill(); ctx.stroke();
  /* 瓜蒂 */
  const [sx, sy] = P(tx + 0.5, ty + 0.5, -21);
  roundRectPath(ctx, sx - 2, sy - 6, 4.4, 7, 1.6);
  ctx.fillStyle = bad ? '#DE8794' : '#7FB89A'; ctx.fill(); ctx.stroke();
  /* 表情 */
  if (!o.ghost) {
    ctx.fillStyle = '#5C3A1E';
    ctx.beginPath(); ctx.arc(cx - 4, c12 - 1.5, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, c12 - 1.5, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5C3A1E'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, c12 + 2.5, 3.2, 0.25, Math.PI - 0.25); ctx.stroke();
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* 紅燈籠 */
function drawLantern(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  /* 木座 */
  isoBox(ctx, tx + 0.32, ty + 0.32, 0.36, 0.36, 0, 4, {
    top: bad ? '#DE8794' : '#C7A26F', right: bad ? '#D47A88' : '#B08D5F', left: bad ? '#C96A7A' : '#9A7A4E', lw: 1.8,
  });
  /* 燈身＋縱肋 */
  const [lx, ly] = P(tx + 0.5, ty + 0.5, -18);
  handEllipse(ctx, lx, ly, 12, 13.5, { fill: bad ? '#DE8794' : '#E84A3C', stroke: INK, lw: 2.2, seed: 7 });
  ctx.strokeStyle = bad ? '#C96A7A' : '#C93A2E'; ctx.lineWidth = 1.1;
  for (const rx of [4.5, 8.5]) {
    ctx.beginPath(); ctx.ellipse(lx, ly, rx, 13.2, 0, 0, Math.PI * 2); ctx.stroke();
  }
  /* 上下金箍＋絨球流蘇 */
  const [tcx, tcy] = P(tx + 0.5, ty + 0.5, -31);
  ctx.fillStyle = bad ? '#E7B9C3' : '#FFD166'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(tcx, tcy, 5.5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const [bcx, bcy] = P(tx + 0.5, ty + 0.5, -5.5);
  ctx.beginPath(); ctx.ellipse(bcx, bcy, 4.5, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = bad ? '#C96A7A' : '#E84A3C'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(bcx, bcy + 1); ctx.lineTo(bcx, bcy + 4.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(bcx, bcy + 6, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = bad ? '#E7B9C3' : '#FFD166'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* 鞭炮 */
function drawFirecracker(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  const [cx, cy] = P(tx + 0.5, ty + 0.5, 0);
  const red = bad ? '#DE8794' : '#E84A3C', gold = bad ? '#E7B9C3' : '#FFD166';
  const knot = P(tx + 0.5, ty + 0.5, -17);
  /* 引線（兩條） */
  ctx.strokeStyle = bad ? '#C96A7A' : '#B08D5F'; ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(knot[0], knot[1] + 2);
    ctx.quadraticCurveTo(cx + s * 6, cy - 9, cx + s * 13, cy - 4);
    ctx.stroke();
  }
  /* 鞭炮（每側 4 枚） */
  const drawOne = (x, y, ang) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    roundRectPath(ctx, -3.4, -5, 6.8, 10, 2);
    ctx.fillStyle = red; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = gold; ctx.fillRect(-3.4, -1.2, 6.8, 2.4);
    ctx.restore();
  };
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const t = (i + 1) / 4.6;
      const x = cx + s * (4 + t * 11);
      const y = P(tx + 0.5, ty + 0.5, -(17 - t * 12))[1] - 1;
      drawOne(x, y, s * 0.38);
    }
  }
  /* 節結 */
  ctx.beginPath(); ctx.arc(knot[0], knot[1], 2.8, 0, Math.PI * 2);
  ctx.fillStyle = gold; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  /* 火花 */
  if (!o.ghost) {
    ctx.fillStyle = gold;
    for (const [dx, dy] of [[-15, -3], [15, -4], [-10, -1], [10, -2]]) {
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* 一束氣球 */
function drawBalloonBunch(ctx, tx, ty, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  const bad = o.tint === 'bad';
  const knotP = P(tx + 0.5, ty + 0.5, -4);
  const balloons = [
    { dx: -13, z: 52, rx: 10, ry: 12, c: bad ? '#DE8794' : '#FF9FBE', d: bad ? '#D47A88' : '#F27DA4' },
    { dx: 1, z: 64, rx: 11, ry: 13, c: bad ? '#E3AEBB' : '#7EC8E3', d: bad ? '#D47A88' : '#5FB0CC' },
    { dx: 13, z: 49, rx: 9, ry: 11, c: bad ? '#EFD6DD' : '#FFD166', d: bad ? '#DE8794' : '#E8B94E' },
  ];
  /* 繩子 */
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3;
  for (const b of balloons) {
    const [bxc, by] = P(tx + 0.5, ty + 0.5, -b.z);
    const bx = bxc + b.dx; /* 第十四輪c修：氣球本體要帶 dx 偏移（之前 3 顆疊在同一 x） */
    ctx.beginPath(); ctx.moveTo(knotP[0], knotP[1] - 2);
    ctx.quadraticCurveTo((knotP[0] + bx) / 2, (knotP[1] + by) / 2, bx, by + b.ry);
    ctx.stroke();
  }
  /* 氣球 */
  for (const b of balloons) {
    const [bxc, by] = P(tx + 0.5, ty + 0.5, -b.z);
    const bx = bxc + b.dx; /* 第十四輪c修：同繩子迴圈 */
    ctx.beginPath(); ctx.ellipse(bx, by, b.rx, b.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = b.c; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 2.6, by + b.ry); ctx.lineTo(bx + 2.6, by + b.ry); ctx.lineTo(bx, by + b.ry + 4);
    ctx.closePath();
    ctx.fillStyle = b.d; ctx.fill(); ctx.stroke();
    if (!o.ghost) {
      ctx.beginPath(); ctx.ellipse(bx - b.rx * 0.38, by - b.ry * 0.4, b.rx * 0.3, b.ry * 0.38, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
    }
  }
  /* 蝴蝶結（結點） */
  ctx.fillStyle = bad ? '#DE8794' : '#E85A6A'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(knotP[0] + s * 3.6, knotP[1] - 4, 3.2, 2.4, s * 0.4, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(knotP[0], knotP[1] - 3, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (o.ghost) ghostFootprint(ctx, tx, ty, 1, 1, o);
  ctx.globalAlpha = saved;
}

/* ── 建造品項目錄（floor 類：w/d 為佔格、h 為高度、max 上限、block 是否擋路、layer:'floor' 貼地層） ── */
const BUILD_ITEMS = {
  bed:     { name: '床',     tab: 'furniture', w: 2, d: 1, h: 30, max: 1, block: true,  draw: drawBed },
  desk:    { name: '書桌',   tab: 'furniture', w: 2, d: 1, h: 34, max: 2, block: true,  draw: drawDesk },
  chair:   { name: '椅子',   tab: 'furniture', w: 1, d: 1, h: 42, max: 4, block: true,  draw: drawChair },
  sofa:    { name: '沙發',   tab: 'furniture', w: 2, d: 1, h: 32, max: 2, block: true,  draw: drawSofa },
  shelf:   { name: '書架',   tab: 'furniture', w: 1, d: 1, h: 58, max: 3, block: true,  draw: drawShelf },
  dresser: { name: '五斗櫃', tab: 'furniture', w: 1, d: 1, h: 48, max: 2, block: true,  draw: drawDresser },
  lamp:    { name: '落地燈', tab: 'furniture', w: 1, d: 1, h: 83, max: 3, block: true,  draw: drawLamp },
  piano:   { name: '鋼琴',   tab: 'furniture', w: 2, d: 1, h: 56, max: 1, block: true,  draw: drawPiano },
  /* 第九輪c：擺飾（不擋路） */
  plant:   { name: '盆栽',   tab: 'decor', w: 1, d: 1, h: 57, max: 3, block: false, draw: drawPlant },
  vase:    { name: '花瓶',   tab: 'decor', w: 1, d: 1, h: 34, max: 3, block: false, draw: drawVase },
  teddy:   { name: '泰迪熊', tab: 'decor', w: 1, d: 1, h: 30, max: 2, block: false, draw: drawTeddy },
  balloon: { name: '氣球',   tab: 'decor', w: 1, d: 1, h: 82, max: 2, block: false, pv: 63, draw: drawBalloon },
  /* 第九輪c：地飾（layer:'floor' 貼地層繪製） */
  rug:     { name: '地毯',   tab: 'floor', w: 2, d: 2, h: 6,  max: 2, block: false, layer: 'floor', draw: drawRug },
  doormat: { name: '門墊',   tab: 'floor', w: 1, d: 1, h: 3,  max: 1, block: false, layer: 'floor', draw: drawDoormat },
  decal:   { name: '地板貼', tab: 'floor', w: 1, d: 1, h: 2,  max: 4, block: false, layer: 'floor', draw: drawDecal },
  flower:  { name: '小花叢', tab: 'floor', w: 1, d: 1, h: 16, max: 3, block: false, draw: drawFlower },
  /* 第十四輪c：節慶裝飾（tab:'fest' 🎉 頁；onFurn＝可放家具上，高度跟 surfaceHAt） */
  cake:         { name: '生日蛋糕', tab: 'fest', w: 1, d: 1, h: 38, max: 1, block: false, onFurn: true, draw: drawCake },
  giftBox:      { name: '禮物盒', tab: 'fest', w: 1, d: 1, h: 28, max: 3, block: false, onFurn: true, draw: drawGiftBox },
  xmasTree:     { name: '聖誕樹', tab: 'fest', w: 1, d: 1, h: 70, max: 1, block: false, draw: drawXmasTree },
  pumpkin:      { name: '南瓜', tab: 'fest', w: 1, d: 1, h: 27, max: 2, block: false, draw: drawPumpkin },
  lantern:      { name: '紅燈籠', tab: 'fest', w: 1, d: 1, h: 34, max: 2, block: false, draw: drawLantern },
  firecracker:  { name: '爆竹', tab: 'fest', w: 1, d: 1, h: 20, max: 2, block: false, draw: drawFirecracker },
  balloonBunch: { name: '氣球束', tab: 'fest', w: 1, d: 1, h: 78, max: 2, block: false, draw: drawBalloonBunch },
};

/* 品項佔用格 */
function itemTiles(id, tx, ty, rot = 0) {
  const it = BUILD_ITEMS[id];
  if (!it) return [];
  const w = rot ? it.d : it.w, d = rot ? it.w : it.d; /* 第十輪：rot=1 時 w/d 互換 */
  const out = [];
  for (let dx = 0; dx < w; dx++)
    for (let dy = 0; dy < d; dy++)
      out.push([tx + dx, ty + dy]);
  return out;
}

/* 地板品項可否放在 (tx,ty)（rot=1 時用旋轉後的 w/d） */
function floorValid(id, tx, ty, rot = 0) {
  const it = BUILD_ITEMS[id];
  if (!it) return false;
  const w = rot ? it.d : it.w, d = rot ? it.w : it.d;
  if (tx < 0 || ty < 0 || tx + w > N || ty + d > N) return false;
  for (const [x, y] of itemTiles(id, tx, ty, rot)) {
    if (x < 0 || y < 0 || x >= N || y >= N) return false;
    if (Game.blocked.has(x + ',' + y) && it.tab !== 'decor' && !it.onFurn) return false; /* 第十一輪b：擺飾可放家具上；第十四輪c：onFurn（蛋糕/禮盒）同理（高度由 surfaceHAt 處理） */
    if (Math.floor(Game.player.x) === x && Math.floor(Game.player.y) === y) return false;
    if (Game.npc.visible && Math.floor(Game.npc.x) === x && Math.floor(Game.npc.y) === y) return false;
  }
  /* 同類品項不可重疊（第十一輪b：三類 floor/decor/furniture；擺飾可與家具同格＝站上去） */
  const cls = x => (x.layer === 'floor' ? 2 : ((x.tab === 'decor' || x.onFurn) ? 1 : 0)); /* 第十四輪c：onFurn 與擺飾同類（可上家具、彼此不可重疊） */
  const myL = cls(it);
  const mine = new Set(itemTiles(id, tx, ty, rot).map(([x, y]) => x + ',' + y));
  for (const f of Game.furniture) {
    const oit = BUILD_ITEMS[f.id];
    if (!oit || cls(oit) !== myL) continue;
    for (const [x, y] of itemTiles(f.id, f.tx, f.ty, f.rot)) if (mine.has(x + ',' + y)) return false;
  }
  return true;
}

/* 第十一輪b：該格上方最高家具的頂面高度（擺飾放家具上用；地層/擺飾不算支撐） */
function surfaceHAt(tx, ty) {
  let h = 0;
  for (const f of Game.furniture) {
    const it = BUILD_ITEMS[f.id];
    if (!it || it.layer === 'floor' || it.tab === 'decor') continue;
    const w = f.rot ? it.d : it.w, d = f.rot ? it.w : it.d;
    if (tx >= f.tx && tx < f.tx + w && ty >= f.ty && ty < f.ty + d) h = Math.max(h, it.h);
  }
  return h;
}

/* 第十一輪b：整體上移 lift px 繪製（OY 暫時平移，finally 還原） */
function drawLifted(lift, drawFn) {
  if (!lift) { drawFn(); return; }
  const saved = OY;
  OY -= lift;
  try { drawFn(); } finally { OY = saved; }
}

/* 第十一輪b：深度（含「站在家具上」——取支撐家具 depth+0.1，確保畫在家具之後） */
function itemDepthAt(id, tx, ty, rot = 0) {
  const it = BUILD_ITEMS[id];
  if (!it) return tx + ty;
  let depth = tx + ty + (rot ? it.d : it.w) + (rot ? it.w : it.d) - 1;
  if (it.tab === 'decor' || it.onFurn) { /* 第十四輪c：onFurn 同樣畫在承托家具之後 */
    for (const g of Game.furniture) {
      const git = BUILD_ITEMS[g.id];
      if (!git || git.layer === 'floor' || git.tab === 'decor') continue;
      const gw = g.rot ? git.d : git.w, gd = g.rot ? git.w : git.d;
      if (tx >= g.tx && tx < g.tx + gw && ty >= g.ty && ty < g.ty + gd && git.h > 0)
        depth = Math.max(depth, g.tx + g.ty + gw + gd - 1 + 0.1);
    }
  }
  return depth;
}
function itemDepth(f) { return itemDepthAt(f.id, f.tx, f.ty, f.rot); }

function countItem(id) {
  return Game.furniture.filter(f => f.id === id).length;
}

/* ── 牆飾（第九輪d）＋槽位規則 ──
   牆 A：ty=0 右後牆（窗戶 2.7~5.7、心形框 7.6）
   牆 B：tx=0 左後牆（門 6.2~8.2）
   draw(ctx, wall, pos, o)：pos = 跨幅中心座標（左槽+0.5*span）；
   用 wallSpace 進本地 2D（x 沿牆向右 px、y 向下、原點 = 離地 hMid） */
function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawWallHeartFrame(ctx, wall, pos, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  wallSpace(ctx, wall, pos, o.h ?? 170); /* 第十一輪c：高度可調 */
  const bad = o.tint === 'bad';
  ctx.fillStyle = bad ? '#DE8794' : '#FFF6FA';
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.rect(-17, -23, 34, 46); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = bad ? '#C96A7A' : '#FF9FBE'; ctx.lineWidth = 3;
  ctx.strokeRect(-12.5, -18.5, 25, 37);
  ctx.fillStyle = bad ? '#DE8794' : '#FF6E97';
  drawHeartPath(ctx, 0, 0, 10);
  ctx.fill();
  wallSpaceEnd(ctx);
  ctx.globalAlpha = saved;
}

function drawWallStarFrame(ctx, wall, pos, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  wallSpace(ctx, wall, pos, o.h ?? 165); /* 第十一輪c：高度可調 */
  const bad = o.tint === 'bad';
  ctx.fillStyle = bad ? '#DE8794' : '#FFFDF4';
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.rect(-16, -22, 32, 44); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = bad ? '#C96A7A' : '#9FD8E8'; ctx.lineWidth = 3;
  ctx.strokeRect(-11.5, -17.5, 23, 35);
  ctx.fillStyle = bad ? '#DE8794' : '#FFC94D';
  starPath(ctx, 0, 0, 10.5);
  ctx.fill();
  wallSpaceEnd(ctx);
  ctx.globalAlpha = saved;
}
function drawWallClock(ctx, wall, pos, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  wallSpace(ctx, wall, pos, o.h ?? 185); /* 第十一輪c：高度可調 */
  const bad = o.tint === 'bad';
  ctx.fillStyle = bad ? '#DE8794' : '#FFF8E7';
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = bad ? '#C96A7A' : '#E8B4B8'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 12.5, Math.sin(a) * 12.5);
    ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
    ctx.stroke();
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -4.5); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
  wallSpaceEnd(ctx);
  ctx.globalAlpha = saved;
}

function drawWallPoster(ctx, wall, pos, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  wallSpace(ctx, wall, pos, o.h ?? 150); /* 第十一輪c：高度可調 */
  const bad = o.tint === 'bad';
  ctx.save();
  ctx.rotate(-0.05);
  ctx.fillStyle = bad ? '#DE8794' : '#FFFDF4';
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.rect(-15, -21, 30, 42); ctx.fill(); ctx.stroke();
  ctx.fillStyle = bad ? 'rgba(222,135,148,.85)' : 'rgba(255,214,230,.95)';
  ctx.fillRect(-12, -24, 10, 6);
  ctx.fillRect(3, -24, 10, 6);
  ctx.fillStyle = bad ? '#C96A7A' : '#FF6E97';
  drawHeartPath(ctx, 0, -6, 7);
  ctx.fill();
  ctx.strokeStyle = bad ? '#C96A7A' : '#E8B4B8';
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(9, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, 14); ctx.lineTo(4, 14); ctx.stroke();
  ctx.restore();
  wallSpaceEnd(ctx);
  ctx.globalAlpha = saved;
}

function drawWallShelf(ctx, wall, pos, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  wallSpace(ctx, wall, pos, o.h ?? 105); /* 第十一輪c：高度可調 */
  const bad = o.tint === 'bad';
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.fillStyle = bad ? '#DE8794' : '#FF9FBE';
  ctx.beginPath(); ctx.rect(-15, -16, 7, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = bad ? '#DE8794' : '#9FD8E8';
  ctx.beginPath(); ctx.rect(-7, -19, 7, 19); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(4, 0); ctx.rotate(0.18);
  ctx.fillStyle = bad ? '#DE8794' : '#B8E0C0';
  ctx.beginPath(); ctx.rect(-3, -15, 7, 15); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = bad ? '#DE8794' : '#E8A87C';
  ctx.beginPath(); ctx.rect(11, -8, 9, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = bad ? '#C96A7A' : '#7FC98F';
  ellipse(ctx, 15.5, -11, 4, 5.5);
  ctx.fillStyle = bad ? '#DE8794' : '#D9A05B';
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.rect(-19, 0, 38, 5); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-14, 5); ctx.lineTo(-14, 11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14, 5); ctx.lineTo(14, 11); ctx.stroke();
  wallSpaceEnd(ctx);
  ctx.globalAlpha = saved;
}

function drawWallGarland(ctx, wall, pos, o = {}) {
  const saved = ctx.globalAlpha;
  if (o.ghost) ctx.globalAlpha *= 0.62;
  wallSpace(ctx, wall, pos, o.h ?? 232); /* 第十一輪c：高度可調 */
  const bad = o.tint === 'bad';
  const P0 = [-36, -10], P1 = [0, 12], P2 = [36, -10];
  ctx.strokeStyle = bad ? '#C96A7A' : INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P0[0], P0[1]);
  ctx.quadraticCurveTo(P1[0], P1[1], P2[0], P2[1]);
  ctx.stroke();
  const cols = bad
    ? ['#DE8794', '#DE8794', '#DE8794', '#DE8794', '#DE8794']
    : ['#FF9FBE', '#FFF6E5', '#A8DFC0', '#9FD8E8', '#FF9FBE'];
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    const x = (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t ** 2 * P2[0];
    const y = (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t ** 2 * P2[1];
    ctx.fillStyle = cols[i - 1];
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 5.5, y);
    ctx.lineTo(x + 5.5, y);
    ctx.lineTo(x, y + 11);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = bad ? '#C96A7A' : '#B08968';
  ctx.beginPath(); ctx.arc(P0[0], P0[1], 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(P2[0], P2[1], 1.8, 0, Math.PI * 2); ctx.fill();
  wallSpaceEnd(ctx);
  ctx.globalAlpha = saved;
}

/* 第十一輪c：牆飾高度可調範圍（離地 px） */
const WALL_H_MIN = 50, WALL_H_MAX = 262;
function clampWallH(h) { return Math.max(WALL_H_MIN, Math.min(WALL_H_MAX, h)); }

/* id → { name, tab:'wall', max, span, hMid, hitW, draw(ctx, wall, pos, o) } */
const WALL_ITEMS = {
  heartFrame: { name: '心形框', tab: 'wall', max: 2, span: 1, hMid: 170, hitW: 17, draw: drawWallHeartFrame },
  starFrame:  { name: '星星框', tab: 'wall', max: 2, span: 1, hMid: 165, hitW: 16, draw: drawWallStarFrame },
  clock:      { name: '時鐘',   tab: 'wall', max: 1, span: 1, hMid: 185, hitW: 17, draw: drawWallClock },
  poster:     { name: '海報',   tab: 'wall', max: 2, span: 1, hMid: 150, hitW: 15, draw: drawWallPoster },
  wallShelf:  { name: '牆架',   tab: 'wall', max: 2, span: 1, hMid: 105, hitW: 19, draw: drawWallShelf },
  garland:    { name: '彩旗',   tab: 'wall', max: 1, span: 2, hMid: 232, hitW: 36, draw: drawWallGarland },
};

const WALL_FORBID = { A: [2, 3, 4, 5, 7], B: [6, 7, 8] };

function wallSlotValid(id, wall, pos) {
  const it = WALL_ITEMS[id];
  if (!it) return false;
  const span = it.span || 1;
  if (pos < 0 || pos + span > N) return false;
  for (let p = pos; p < pos + span; p++) {
    if (WALL_FORBID[wall].includes(p)) return false;
    if (Game.wallItems.some(w => w.wall === wall && w.pos === p)) return false;
  }
  return true;
}

function countWallItem(id) {
  return Game.wallItems.filter(w => w.id === id).length;
}

/* 滑鼠世界座標 → 牆槽（游標在地板線以上才算在牆上） */
function wallSlotFromMouse() {
  const mx = Game.mouse.wx, my = Game.mouse.wy;
  const [ax, ay] = P(0, 0);
  const [bx, by] = P(N, 0);
  const [cx, cy] = P(0, N);
  /* 槽位由 x 座標決定（P 的 z 偏移只動 y，不影響 x）；高度不影響投影 */
  if (mx >= ax && mx <= bx && my < ay + (mx - ax) * 0.5 + 8) {
    const u = (mx - ax) / (bx - ax) * N;
    return { wall: 'A', pos: clamp(Math.round(u - 0.5), 0, N - 1) };
  }
  if (mx >= cx && mx <= ax && my < ay + (ax - mx) * 0.5 + 8) {
    const u = (ax - mx) / (ax - cx) * N;
    return { wall: 'B', pos: clamp(Math.round(u - 0.5), 0, N - 1) };
  }
  return null;
}

/* 牆面 2D 繪製空間：local x 沿牆向右（px）、y 向下；原點 = (pos, 離地 hBase) */
function wallSpace(ctx, wall, pos, hBase) {
  const [px, py] = P(wall === 'A' ? pos : 0, wall === 'A' ? 0 : pos, -hBase);
  const ux = wall === 'A' ? 0.8944 : -0.8944;
  ctx.save();
  ctx.transform(ux, 0.4472, 0, 1, px, py);
}
function wallSpaceEnd(ctx) { ctx.restore(); }

/* 牆飾點選命中 */
function wallItemHit(w, mx, my) {
  const it = WALL_ITEMS[w.id];
  const hMid = w.h != null ? w.h : (it ? (it.hMid ?? 110) : 110); /* 第十一輪c：用已存高度 */
  const span = it ? (it.span || 1) : 1;
  const [cx, cy] = P(w.wall === 'A' ? w.pos + 0.5 * span : 0, w.wall === 'A' ? 0 : w.pos + 0.5 * span, -hMid);
  const ux = w.wall === 'A' ? 0.8944 : -0.8944;
  const relx = mx - cx, rely = my - cy;
  const along = relx * ux + rely * 0.4472;
  const vert = rely - along * 0.4472;
  const hw = it ? (it.hitW ?? 30) : 30;
  return Math.abs(along) <= hw && Math.abs(vert) <= 48;
}
