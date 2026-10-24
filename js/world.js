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

/* 格座標 → 世界座標（oy 為往上偏移的像素） */
function P(tx, ty, oy = 0) {
  return [OX + (tx - ty) * TW / 2, OY + (tx + ty) * TH / 2 + oy];
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
  /* 地板大菱形（帶柔和陰影） */
  const [ax, ay] = P(0, 0), [bx, by] = P(N, 0), [cx2, cy2] = P(N, N), [dx, dy] = P(0, N);
  ctx.save();
  ctx.shadowColor = 'rgba(90,62,43,0.35)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = c.floorB;
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* 地板磚 */
  for (let ty = 0; ty < N; ty++) {
    for (let tx = 0; tx < N; tx++) {
      const [x0, y0] = P(tx, ty), [x1, y1] = P(tx + 1, ty), [x2, y2] = P(tx + 1, ty + 1), [x3, y3] = P(tx, ty + 1);
      ctx.fillStyle = (tx + ty) % 2 === 0 ? c.floorA : c.floorB;
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
  const [ax, ay] = P(0, 0), [bx, by] = P(N, 0);
  /* 牆面 */
  ctx.fillStyle = c.wall;
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
  const [ax, ay] = P(0, 0), [bx, by] = P(0, N);
  ctx.fillStyle = c.wall;
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
