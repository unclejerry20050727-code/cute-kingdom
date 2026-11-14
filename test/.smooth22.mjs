/* 21-2 新路線量測：環前後坡道橫向錯開（item3）＋L3/L4 拉近 720（item4）＋自相交檢查＋全部量測 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const THREE = require('../lib/three.min.js');
const v = (x, y, z) => new THREE.Vector3(x, y, z);
/* 360° 垂直迴環：th 15..330（22 點；底點 B 另放入 cp，進/出弧線在 B 兩側） */
const loop = (cx, cz, y0, R, plane, side, n = 23) => {
      const pts = [];
      for (let a = 1; a <= n; a++) {
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
      /* L1（yz, x25, 底(25,.8,-9)）：進坡繞 +x 側 U 彎（22a：尖鉤→圓頂 U，起終錯開保留） */
      v(28.2, 0.8, -5.0),       /* 22a */
      v(27.4, 0.8, -4.4),       /* 22a：U 頂圓化（+z 側，離環 3.5u+） */
      v(26.5, 0.8, -4.7),       /* 22a */
      v(26.1, 0.8, -6.2),       /* 22a */
      v(26.0, 0.8, -8.3),       /* 22a：尾走 +x 側下抵 B（避開環出弧 θ345 (25,-8.3)，min 0.65u） */
      v(25, 0.8, -9),           /* L1 底 B */
      ...loop(25, -9, 0.8, 2.8, 'yz', -1),
      v(23.8, 0.8, -9.2),       /* 22a：出弧貼切線（消 θ325 曲率尖峰 k6.2） */
      v(23.3, 0.9, -11.2),      /* 22a：出弧掃 -x 側 */
      /* L2（xy, z-14.5, 底(14,.8,-14.5)）：進坡繞 -z 側，出弧掃 +z 側 */
      v(17, 1.5, -15.5),
      v(15.2, 0.85, -15.3),
      v(14.4, 0.8, -14.7),     /* 21a 原值恢復（22a 試 -15.0 致 B 切線偏 26° k5.5） */
      v(14, 0.8, -14.5),        /* L2 底 B */
      ...loop(14, -14.5, 0.8, 2.8, 'xy', -1, 22),
      v(14.4, 0.85, -13.9),     /* 22a：L2 出弧貼環面漸離（+z 0.6u 漸進，消 θ330 鞭擊） */
      v(13.5, 0.85, -13.1),     /* 22a */
      v(12.2, 0.7, -12.7),      /* 22a */
      v(10.8, -0.6, -12.4),     /* 22a：下地底起 */
      v(7.5, -1.5, -13),        /* 鑽入地底 */
      v(4.5, -3.8, -11),        /* 地底 */
      v(1.0, -4.5, -9),         /* 隧道底 */
      v(-2.5, -3.8, -6.5),      /* 地底 */
      v(-4.5, -1.5, -4),        /* 隧道口 */
      v(-5.8, 0.8, -2.4),       /* 22a：EMERGE 圓坡（21a 2.6u 尖峰 114°→~1.0u 圓弧） */
      v(-7, 0.9, 0),            /* 俯衝#2 底 */
      /* L3（yz, x-10, 底(-10,.8,2)）：進坡繞 +x 側，出弧掃 -x 側 */
      v(-8.2, 0.85, 0.5),
      v(-9.2, 0.8, 1.3),
      v(-10, 0.8, 2),           /* L3 底 B */
      ...loop(-10, 2, 0.8, 2.8, 'yz', 1, 22), /* 22a：L3 回退 330°（345° 的 θ345 點與入口線 0.54u 碰撞） */
      v(-11.2, 0.8, 2.2),       /* 22a：L3 出弧貼切線（θ330 切線錯角 16°，平滑） */
      v(-11.4, 0.85, 4.0),      /* 出弧（-x 側，遠切） */
      /* L4（xy, z5.5, 底(-4,.8,5.5)）：緊接 L3 → 720 感；進坡連續左轉 90°/6u（22a 拉寬，z≥6.3 避環面） */
      v(-10.3, 0.9, 5.3),       /* 22a */
      v(-8.3, 0.9, 6.3),        /* 22a */
      v(-6.4, 0.9, 7.0),        /* 22a：抬高（21a 水位，入口弧離環底管 ≥0.7u） */
      v(-5.2, 0.85, 6.8),       /* 22a */
      v(-4, 0.8, 5.5),          /* L4 底 B */
      ...loop(-4, 5.5, 0.8, 2.5, 'xy', 1),
      v(-4.1, 0.65, 5.35),      /* 22a：L4 出弧漸降 z（三段分散彎角，避開環起弧 θ25-30） */
      v(-3.5, 0.6, 5.05),       /* 22a */
      v(-2.8, 0.7, 4.6),        /* 22a */
      v(-2.2, 0.85, 4.4),       /* 22a */
      v(0, 1.6, 5.2),
      v(3, 1.5, 8.5),
      v(6.0, 3.0, 10.3),        /* 抬高：避開終點回線 (7.5,.7,9)→(7,.7,5.5) */
      v(8, 4.2, 12.5),          /* 山丘1 */
      v(10.5, 1.2, 13.8),       /* 22a：低谷寬 U（21a V 146° 反向→~120°/5u 連續） */
      v(10.8, 0.9, 15.2),       /* 22a */
      v(10, 0.9, 16.5),         /* 22a：谷底朝 +z 過渡 */
      v(7.5, 2.5, 16.8),        /* 22a */
      v(5, 5.5, 15.5),          /* 山丘2 */
      v(3, 4.5, 15.9),          /* 22a：hill2 U 轉拉寬（21a (2,3,14.5) ~92°→~160°/7.5u） */
      v(1.2, 3.3, 15.3),        /* 22a */
      v(0.6, 2.2, 13.8),        /* 22a */
      v(1.2, 1.3, 12.4),        /* 22a */
      v(2.6, 1.0, 11.8),        /* 22a：U 尾→返程平滑併入（消 z 微擺 k2.9） */
      v(5.0, 1.0, 11.8),        /* 22a */
      v(7.5, 0.7, 9),
      v(6.9, 0.7, 7.2),         /* 22a：進站前拉寬（21a (7,.7,5.5) 83°/4.1u） */
      v(5.8, 0.75, 5.6),        /* 22a */
      v(3, 0.8, 4.5),           /* 回到站點旁 */
    ];
const curve = new THREE.CatmullRomCurve3(cp, false, "catmullrom", 0.5);
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
/* 22-3：路線量測（環 t/隧道 t/星位/自相交）— 自 .route21.mjs 移植 */
const LOOPS_DEF = [
  { cx: 25, cz: -9, y0: 0.8, R: 2.8, plane: 'yz' },
  { cx: 14, cz: -14.5, y0: 0.8, R: 2.8, plane: 'xy' },
  { cx: -10, cz: 2, y0: 0.8, R: 2.8, plane: 'yz' },
  { cx: -4, cz: 5.5, y0: 0.8, R: 2.5, plane: 'xy' },
];
const loopsM = LOOPS_DEF.map((lp) => {
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
let s1 = null;
for (let i = 1; i <= N; i++) { if (pts[i - 1].y > 5.4 && pts[i].y <= 5.4 && i / N < 0.3) { s1 = i / N; break; } }
let s4 = null, maxY = -99;
for (let i = 0; i <= N; i++) { if (i / N > 0.8 && pts[i].y > maxY) { maxY = pts[i].y; s4 = i / N; } }
const BOTS = LOOPS_DEF.map((lp) => v(lp.cx, lp.y0, lp.cz));
const M = 1200, mpts = [];
for (let i = 0; i <= M; i++) mpts.push(curve.getPointAt(i / M));
const xhits = [];
for (let i = 0; i <= M; i++) {
  for (let j = i + 60; j <= M; j++) {
    const d = mpts[i].distanceTo(mpts[j]);
    if (d < 0.65) {
      // 環底雙重通過區（入口弧+環底弧+出口弧都經 B 附近 1u 內，<0.65 是結構性）
      const nearB = BOTS.some((B) => mpts[i].distanceTo(B) < 1.0 && mpts[j].distanceTo(B) < 1.0);
      if (!nearB) xhits.push({ i: +((i / M) * 1000).toFixed(0), j: +((j / M) * 1000).toFixed(0), d: +d.toFixed(2), p: [mpts[i].x.toFixed(1), mpts[i].y.toFixed(1), mpts[i].z.toFixed(1)] });
    }
  }
}
console.log('--- 路線量測 ---');
console.log(JSON.stringify({
  L: +total.toFixed(1),
  loops: loopsM.map((l) => [ +l.t0.toFixed(3), +l.t1.toFixed(3), +l.top.toFixed(3) ]),
  tunnelT: { e: +entryT.toFixed(3), x: +exitT.toFixed(3) },
  stars: { s1: +s1.toFixed(3), s2: +loopsM[1].top.toFixed(3), s3: +exitT.toFixed(3), s4: +s4.toFixed(3) },
  minTrackY: +Math.min(...pts.map((p) => p.y)).toFixed(2),
  xIntersect: xhits.length ? xhits.slice(0, 8) : 'NONE'
}, null, 0));
console.log('done');
