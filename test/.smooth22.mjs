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
/* 22-1：軌道順暢度量測——曲率峰值（k=1/u）＋S 彎/髮夾（短弧內轉向角） */
const N = 4000, pts = [], tans = [];
for (let i = 0; i <= N; i++) { pts.push(curve.getPointAt(i / N)); tans.push(curve.getTangentAt(Math.min(i / N, 0.9999))); }
let total = 0; const cum = [0];
for (let i = 1; i <= N; i++) { total += pts[i].distanceTo(pts[i - 1]); cum.push(total); }
console.log('L =', total.toFixed(1));
console.log('--- 曲率峰值 Top 15（k 1/u, rho u；環正常≈0.357/2.8）---');
const spikes = [];
for (let i = 1; i < N; i++) {
  const a = tans[i - 1].angleTo(tans[i]);
  spikes.push({ t: i / N, k: a / (cum[i] - cum[i - 1]), p: pts[i] });
}
spikes.sort((x, y) => y.k - x.k);
for (const s of spikes.slice(0, 15)) console.log(`t=${s.t.toFixed(4)} k=${s.k.toFixed(3)} rho=${(1 / s.k).toFixed(2)}u pos=(${s.p.x.toFixed(1)},${s.p.y.toFixed(1)},${s.p.z.toFixed(1)})`);
console.log('--- S 彎/髮夾（~4u 弧內轉向 >70°）---');
const wStep = Math.max(1, Math.round(4 / (total / N)));
const hits = [];
for (let i = 0; i + wStep < N; i++) {
  const dAng = tans[i].angleTo(tans[i + wStep]);
  if (dAng > 70 * Math.PI / 180) hits.push({ t: (i + wStep / 2) / N, deg: dAng * 180 / Math.PI, span: cum[i + wStep] - cum[i], p: pts[Math.round(i + wStep / 2)] });
}
hits.sort((a, b) => b.deg - a.deg);
const kept = [];
for (const h of hits) if (!kept.some(k2 => Math.abs(k2.t - h.t) < 0.06)) kept.push(h);
for (const h of kept.slice(0, 12)) console.log(`t=${h.t.toFixed(3)} 轉向=${h.deg.toFixed(0)}°/${h.span.toFixed(1)}u pos=(${h.p.x.toFixed(1)},${h.p.y.toFixed(1)},${h.p.z.toFixed(1)})`);
console.log('done');
