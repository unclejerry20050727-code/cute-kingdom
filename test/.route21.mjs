/* 21-2 新路線量測：環前後坡道橫向錯開（item3）＋L3/L4 拉近 720（item4）＋自相交檢查＋全部量測 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const THREE = require('../lib/three.min.js');
const v = (x, y, z) => new THREE.Vector3(x, y, z);
/* 360° 垂直迴環：th 15..330（22 點；底點 B 另放入 cp，進/出弧線在 B 兩側） */
const loop = (cx, cz, y0, R, plane, side) => {
  const pts = [];
  for (let a = 1; a <= 22; a++) {
    const th = a * (Math.PI / 12);
    const y = y0 + R - R * Math.cos(th);
    const off = R * Math.sin(th) * side;
    pts.push(plane === 'yz' ? v(cx, y, cz + off) : v(cx + off, y, cz));
  }
  return pts;
};
const cp = [
  v(6, 0.6, 4),             /* 站點旁起步 */
  v(11, 3.5, -1),
  v(17, 8.5, -6),           /* 爬坡 */
  v(22, 10.8, -10),         /* 峰頂 y10.8 */
  v(26, 5.5, -12),          /* 大俯衝#1 */
  v(28, 0.8, -8),           /* 俯衝底 */
  /* L1（yz, x25, 底(25,.8,-9)）：進坡繞 +x 側，出弧掃 -x 側（起終錯開） */
  v(25.8, 0.8, -6.8),
  v(26.6, 0.85, -7.8),
  v(25.6, 0.8, -8.7),
  v(25, 0.8, -9),           /* L1 底 B */
  ...loop(25, -9, 0.8, 2.8, 'yz', -1),
  v(23.3, 0.85, -11.0),     /* 出弧（-x 側，離底 0.8u 外） */
  v(23.4, 0.9, -12.0),
  v(23, 2.2, -14.2),
  /* L2（xy, z-14.5, 底(14,.8,-14.5)）：進坡繞 -z 側，出弧掃 +z 側 */
  v(17, 1.5, -15.5),
  v(15.2, 0.85, -15.3),
  v(14.4, 0.8, -14.7),
  v(14, 0.8, -14.5),        /* L2 底 B */
  ...loop(14, -14.5, 0.8, 2.8, 'xy', -1),
  v(13.4, 0.85, -12.8),     /* 出弧（+z 側，早切 +z） */
  v(10.5, 1.2, -12.8),
  v(7.5, -1.5, -13),        /* 鑽入地底 */
  v(4.5, -3.8, -11),        /* 地底 */
  v(1.0, -4.5, -9),         /* 隧道底 */
  v(-2.5, -3.8, -6.5),      /* 地底 */
  v(-4.5, -1.5, -4),        /* 隧道口 */
  v(-5.5, 2.6, -2),         /* 陡坡衝出地面（EMERGE） */
  v(-7, 0.9, 0),            /* 俯衝#2 底 */
  /* L3（yz, x-10, 底(-10,.8,2)）：進坡繞 +x 側，出弧掃 -x 側 */
  v(-8.2, 0.85, 0.5),
  v(-9.2, 0.8, 1.3),
  v(-10, 0.8, 2),           /* L3 底 B */
  ...loop(-10, 2, 0.8, 2.8, 'yz', 1),
  v(-11.4, 0.85, 4.0),      /* 出弧（-x 側，遠切） */
  v(-9.5, 0.9, 5.0),        /* 連接線（走 -x 側避 +z 環墻） */
  /* L4（xy, z5.5, 底(-4,.8,5.5)）：緊接 L3 → 720 感；進坡繞 +z 側，出弧掃 -z 側 */
  v(-6.6, 0.85, 7.0),
  v(-5.4, 0.8, 6.6),
  v(-4, 0.8, 5.5),          /* L4 底 B */
  ...loop(-4, 5.5, 0.8, 2.5, 'xy', 1),
  v(-2.8, 0.85, 4.3),       /* 出弧（-z 側） */
  v(0, 1.6, 5.2),
  v(3, 1.5, 8.5),
  v(6.0, 3.0, 10.3),        /* 抬高：避開終點回線 (7.5,.7,9)→(7,.7,5.5) */
  v(8, 4.2, 12.5),          /* 山丘1 */
  v(10, 0.9, 14.5),         /* 低谷 */
  v(5, 5.5, 15.5),          /* 山丘2 */
  v(2, 3.0, 14.5),
  v(4.5, 1.0, 12.5),        /* 返程 */
  v(7.5, 0.7, 9),
  v(7, 0.7, 5.5),
  v(3, 0.8, 4.5),           /* 回到站點旁 */
];
const curve = new THREE.CatmullRomCurve3(cp, false, 'catmullrom', 0.5);
const L = curve.getLength();
const N = 2400, pts = [];
for (let i = 0; i <= N; i++) pts.push(curve.getPointAt(i / N));
const LOOPS_DEF = [
  { cx: 25, cz: -9, y0: 0.8, R: 2.8, plane: 'yz' },
  { cx: 14, cz: -14.5, y0: 0.8, R: 2.8, plane: 'xy' },
  { cx: -10, cz: 2, y0: 0.8, R: 2.8, plane: 'yz' },
  { cx: -4, cz: 5.5, y0: 0.8, R: 2.5, plane: 'xy' },
];
const loops = LOOPS_DEF.map((lp) => {
  const cy = lp.y0 + lp.R;
  let t0 = 1, t1 = 0;
  for (let i = 0; i <= N; i++) {
    const p = pts[i], t = i / N;
    const inPlane = lp.plane === 'yz' ? Math.abs(p.x - lp.cx) < 0.9 : Math.abs(p.z - lp.cz) < 0.9;
    const a = lp.plane === 'yz' ? p.z - lp.cz : p.x - lp.cx;
    if (inPlane && Math.hypot(p.y - cy, a) < lp.R + 0.45) { if (t < t0) t0 = t; if (t > t1) t1 = t; }
  }
  return { t0, t1, top: (t0 + t1) / 2 };
});
let entryT = null, exitT = null;
for (let i = 1; i <= N; i++) {
  const a = pts[i - 1], b = pts[i];
  if (a.y >= 0 && b.y < 0 && entryT === null) entryT = i / N;
  if (a.y < 0 && b.y >= 0 && exitT === null) exitT = i / N;
}
/* 星候選：s1 俯衝#1 中(y=5.4 下穿) / s2 L2 環頂 / s3 出洞 / s4 山丘2 頂 */
let s1 = null;
for (let i = 1; i <= N; i++) { if (pts[i - 1].y > 5.4 && pts[i].y <= 5.4 && i / N < 0.3) { s1 = i / N; break; } }
let s4 = null, maxY = -99;
for (let i = 0; i <= N; i++) { if (i / N > 0.8 && pts[i].y > maxY) { maxY = pts[i].y; s4 = i / N; } }
/* 自相交：非相鄰管段最小距離 <0.65 即旗標；環底「進/出同點」設計允許（兩點皆貼近某環底 B 則跳過） */
const BOTS = LOOPS_DEF.map((lp) => v(lp.cx, lp.y0, lp.cz));
const M = 1200, mpts = [];
for (let i = 0; i <= M; i++) mpts.push(curve.getPointAt(i / M));
const hits = [];
for (let i = 0; i <= M; i++) {
  for (let j = i + 60; j <= M; j++) {
    const d = mpts[i].distanceTo(mpts[j]);
    if (d < 0.65) {
      /* 環底會合區（兩點皆在某環底 B 0.6u 內）= 設計內的小交越，放行；長融合帶會延伸超過 0.6u 仍會被抓到 */
      const nearB = BOTS.some((B) => mpts[i].distanceTo(B) < 0.75 && mpts[j].distanceTo(B) < 0.75);
      if (!nearB) hits.push({ i: +((i / M) * 1000).toFixed(0), j: +((j / M) * 1000).toFixed(0), d: +d.toFixed(2), p: [mpts[i].x.toFixed(1), mpts[i].y.toFixed(1), mpts[i].z.toFixed(1)], nb: nearB ? 1 : 0 });
    }
  }
}
console.log(JSON.stringify({
  L: +L.toFixed(1),
  loops: loops.map((l) => [ +l.t0.toFixed(3), +l.t1.toFixed(3), +l.top.toFixed(3) ]),
  tunnelT: { e: +entryT.toFixed(3), x: +exitT.toFixed(3) },
  stars: { s1: +s1.toFixed(3), s2: +loops[1].top.toFixed(3), s3: +exitT.toFixed(3), s4: +s4.toFixed(3) },
  minTrackY: +Math.min(...pts.map((p) => p.y)).toFixed(2),
  hits: hits.length ? hits.slice(0, 8) : 'NONE'
}, null, 0));
if (process.env.DBG) {
  const rows = [];
  for (let i = 0; i <= N; i++) {
    const p = pts[i];
    if (p.x > 24 && p.x < 28 && p.z > -12 && p.z < -5 && p.y < 2.5) rows.push(`${(i / N).toFixed(3)} (${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)})`);
  }
  console.log('DBG:'); console.log(rows.join('\n'));
}
if (process.env.DBG2) {
  const rows = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    if ((t > 0.83 && t < 0.85) || (t > 0.95 && t < 0.965)) {
      const p = pts[i];
      rows.push(`${t.toFixed(4)} (${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)})`);
    }
  }
  console.log('DBG2:'); console.log(rows.join('\n'));
}
