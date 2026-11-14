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

/* 22-3：物理雙模式模擬（複製 js/park-coaster.js 物理：G5/F0.12/BOOST2.75/V_MAX10/DRAG1.5/v0 2.5）
   aggressive：v<9.5 每幀踩（玩家勤快）；gentle：v<5 才踩（玩家省力）
   目標：4/4 星、0 停、22~30s、maxV ≤ ~11.5 */
const G = 5, FRICTION = 0.12, BOOST = 2.75, V_MAX = 10, DRAG = 1.5;
const STAR_TS = [0.136, 0.380, 0.537, 0.900];
const len = curve.getLength();
function sim(pedalThresh) {
  let t = 0, v = 2.5, time = 0, maxV = 0, stops = 0;
  const got = [false, false, false, false];
  const dt = 0.005;
  let guard = 0;
  while (t < 1 && time < 120 && guard++ < 300000) {
    const tan = curve.getTangentAt(Math.min(t, 0.999));
    if (v < pedalThresh) v = Math.min(v + BOOST, V_MAX);
    v += -G * tan.y * dt - v * FRICTION * dt;
    if (v > V_MAX) v -= (v - V_MAX) * DRAG * dt;
    if (v < 0) v = Math.max(v, -4);
    if (v < 0.25 && tan.y >= -0.05) {
      v = 0;
      if (stops === 0 && time > 1) stops++; /* 計一次停靠（含卡死） */
    }
    t += (v * dt) / len;
    time += dt;
    maxV = Math.max(maxV, v);
    for (let s = 0; s < 4; s++) if (!got[s] && Math.abs(t - STAR_TS[s]) < 0.025) got[s] = true;
  }
  return { mode: pedalThresh >= 9 ? 'aggressive' : 'gentle', finish: t >= 1, time: +time.toFixed(1), maxV: +maxV.toFixed(1), stops, stars: got.filter(Boolean).length + '/4', got: got.map((g) => (g ? 1 : 0)).join('') };
}
const a = sim(9.5), g = sim(5.0);
console.log('--- 22-3 物理模擬 ---');
console.log(JSON.stringify({ L: +len.toFixed(1), aggressive: a, gentle: g }));
const okA = a.finish && a.stops === 0 && a.stars === '4/4' && a.time >= 22 && a.time <= 30 && a.maxV <= 11.5;
const okG = g.finish && g.stars === '4/4' && g.maxV <= 12.5;
console.log('verdict aggressive=' + (okA ? 'PASS' : 'FAIL') + ' gentle=' + (okG ? 'PASS' : 'FAIL'));
