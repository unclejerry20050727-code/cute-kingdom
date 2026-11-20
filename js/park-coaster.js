/* ════════════════════════════════════════════════════════════════
   第十八輪18e：雲霄飛車小遊戲（ParkCoaster）
   - 複用公園的裝飾軌道（CatmullRomCurve3）＝你看到的車就是你坐的車
   - 物理：v += -g·tangent.y·dt（重力投影切線）－阻力－20b軟速上限；Space/E/⚡ 踩踏板 +5.5
   - 20b 重量感（G8/F0.12/BOOST5.5/V_MAX16/DRAG1.5）＋20c 特效（出洞過曝/俯衝加速線/尖叫/地底暗模式）
   - 4 顆星星沿軌道；t≥1 過終點 → 結算（星星入 Park3D.stars）
   - 車速過低會停住 → 提示「再踩一下！」
   - 相機跟車（切線後方，25-1 幾何不動），玩家 billboard 坐在車上；28.5-B：相機 up 改環感知
     （環內朝環心＋lowpass＋邊界 smoothstep 混合）→ 真跟軌道繞 360°（修「2 次 180° 快速反轉」）
   接口：start(park) / update(dt) / action() / abort()
   ════════════════════════════════════════════════════════════════ */
'use strict';

const ParkCoaster = {
  active: false,
  t: 0,
  v: 0,
  stopped: false,
  collected: 0,
  finished: false,
  finishTimer: 0,
  stars: [],
  car: null,
  rideBill: null,
  park: null,

  G: 5,             /* 重力（21-4：再降——半速重量感，環 coasting 仍可過） */
  FRICTION: 0.12,   /* 阻力係數（20b：再調低，長線程） */
  BOOST: 2.75,      /* 踩踏板加速（21-4：半速） */
  V_MAX: 10,        /* 軟速度上限（21-4：16→10 半速感） */
  DRAG: 1.5,        /* 20b：超過 V_MAX 的額外拖曳（指數回落，保留慣性） */

  /* 軌道上星星位置（t 參數）——21-2 依 221.3u 新軌道實測：俯衝#1中/L2環頂/出洞/丘2頂 */
  STAR_TS: [0.136, 0.380, 0.537, 0.900], /* 22a 實測 */

  start(park) {
    const THREE = window.THREE;
    this.park = park;
    this.active = true;
    this.t = 0;
    this.v = 2.5;   /* 21-4：初速 5→2.5（半速） */
    this.stopped = false;
    this.collected = 0;
    this.finished = false;
    this.finishTimer = 0;
    this.prevT = 0;            /* 20c：前一幀 t（偵測出洞/入環跨越） */
    this.emerged = false;      /* 20c：太陽過曝閃光（只一次） */
    this.lastScream = -9;      /* 20c：上次尖叫時間（1.8s 冷卻） */
    this.speedOn = false;      /* 20c：加速線狀態 */
    this.bank = 0;             /* 21-5：相機 bank 角（rad，左彎+） */
    const t0 = park.coasterCurve.getTangentAt(0);
    this.fwdYaw = Math.atan2(t0.x, t0.z); /* 21-5：面朝前的穩定航向（弧長前顧） */
    this.lookBackT = 0;        /* 21-5：「回頭看螢幕」剩餘秒數 */
    this.lastLookStart = -9;   /* 21-5：上次回頭起始時間（頻率控制） */
    this.nextLookBack = park.t + 6 + Math.random() * 5; /* 21-5：下次隨機回頭 */

    /* 隱藏停靠列車 */
    if (park.parkedTrain) for (const c of park.parkedTrain) c.visible = false;

    /* 遊玩車廂 */
    this.car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 2.0),
      new THREE.MeshLambertMaterial({ color: 0xe2574c }));
    this.car.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.22, 2.04),
      new THREE.MeshLambertMaterial({ color: 0xfff8ec }));
    stripe.position.y = 0.12;
    this.car.add(stripe);
    park.scene.add(this.car);

    /* 玩家坐在車上（billboard 複用） */
    this.rideBill = park.player;
    park.player.visible = true;
    park.shadow.visible = false;
    park.player.position.set(0, 1.5, 6); /* 預設，update 會改 */

    /* 星星 */
    this.stars = [];
    const curve = park.coasterCurve;
    for (const st of this.STAR_TS) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.5),
        new THREE.MeshLambertMaterial({ color: 0xffd34d, emissive: 0x8a6a00 }));
      m.position.copy(curve.getPointAt(st)).add(new THREE.Vector3(0, 1.6, 0));
      park.scene.add(m);
      this.stars.push({ mesh: m, t: st, got: false });
    }

    park.nearStation = null;
    park.hidePrompt();
    $('#park-action').classList.add('near');
    $('#park-prompt').textContent = '🦶 踩踏板衝坡！按 Space / E 或點 ⚡';
    $('#park-prompt').classList.remove('hidden');
    sfx('pop');
  },

  action() {
    if (!this.active || this.finished) return;
    this.v = Math.min(this.v + this.BOOST, this.V_MAX);
    this.stopped = false;
    sfx('blip');
  },

  update(dt) {
    if (!this.active) return;
    const park = this.park, THREE = window.THREE;
    const curve = park.coasterCurve;
    const len = curve.getLength();

    /* 結算中：等定時器 */
    if (this.finished) {
      this.finishTimer -= dt;
      if (this.finishTimer <= 0) { this._cleanup(true); return; } /* 18e-fix：cleanup 後 car=null，不能再 _updateVisual */
      this._updateVisual(dt);
      return;
    }

    /* 物理：重力沿切線投影＋阻力＋20b 軟速上限 */
    const tan = curve.getTangentAt(Math.min(this.t, 0.999));
    this.v += -this.G * tan.y * dt - this.v * this.FRICTION * dt;
    if (this.v > this.V_MAX) this.v -= (this.v - this.V_MAX) * this.DRAG * dt; /* 20b 軟上限 */
    if (this.v < 0) this.v = Math.max(this.v, -4); /* 允許略微往回溜 */
    if (this.v < 0.25 && tan.y >= -0.05) {
      this.v = 0;
      if (!this.stopped) {
        this.stopped = true;
        $('#park-prompt').textContent = '😱 停住了！踩 Space / ⚡ 再衝一次！';
        sfx('pop');
      }
    }
    this.t += (this.v * dt) / len;
    if (this.t <= 0) this.t = 0;

    /* 20c：跨越事件（prevT→t）：出洞太陽過曝＋尖叫（陡俯衝/入環） */
    const tt = park.tunnelT;
    if (tt && !this.emerged && this.prevT < tt.exit && this.t >= tt.exit) {
      this.emerged = true;
      this._sunFlash(); /* 衝出隧道朝太陽→過曝閃光 */
    }
    let loopEntry = false;
    const loops = park.coasterLoops;
    if (loops) for (const Lp of loops) {
      if (this.prevT < Lp.t0 && this.t >= Lp.t0) { loopEntry = true; break; }
    }
    if ((tan.y < -0.45 || loopEntry) && park.t - this.lastScream > 1.8) {
      this.lastScream = park.t;
      sfx('scream');
      if (park.t - this.lastLookStart > 4.0) { this.lookBackT = 1.2; this.lastLookStart = park.t; } /* 21-5：尖叫回頭看一眼（4s 頻率控制） */
    }
    this.prevT = this.t;

    /* 星星收集 */
    for (const s of this.stars) {
      if (!s.got && Math.abs(this.t - s.t) < 0.025) {
        s.got = true;
        s.mesh.visible = false;
        this.collected++;
        park.addStar(1);
      }
    }

    /* 終點 */
    if (this.t >= 1) {
      this.t = 1;
      this.finished = true;
      this.finishTimer = 3.0;
      $('#park-prompt').textContent =
        this.collected >= 4 ? '🎉 完美！收齊 4 顆星星！' : `🎉 到站！本次收集 ${this.collected}/4 ★`;
      sfx('ding');
    } else if (this.stopped) {
      /* 保持提示 */
    } else {
      $('#park-prompt').textContent = '🦶 踩踏板衝坡！按 Space / E 或點 ⚡';
    }

    this._updateVisual(dt);
  },

  /* 車廂/玩家/星星/相機 */
  _updateVisual(dt) {
    const park = this.park, THREE = window.THREE;
    const curve = park.coasterCurve;
    const u = Math.min(Math.max(this.t, 0), 1);
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(Math.min(u, 0.999));
    /* 20b：4 迴環（t 範圍/環心由 Park3D.coasterLoops 量測）：環內車廂/玩家朝環心偏置
       （掛在軌道內側，環頂倒掛）；環底處環心在正上方，與世界 up 無縫接軌 */
    let up = new THREE.Vector3(0, 1, 0);
    let inLoop = false; /* 28.5-B：環內核心區——相機 up 朝環心（見下方相機段） */
    const loops = park.coasterLoops;
    if (loops) for (const Lp of loops) {
      if (u >= Lp.t0 && u <= Lp.t1) {
        up = new THREE.Vector3(Lp.cx, Lp.cy, Lp.cz).sub(p).normalize();
        inLoop = true;
        break;
      }
    }
    this.car.position.copy(p).addScaledVector(up, 0.55); /* 坐在軌道上 */
    const ahead = p.clone().addScaledVector(tan, 1);
    this.car.lookAt(ahead);

    /* 21-5：主角坐姿面朝前——航向取弧長前顧 1.2u 的水平投影（環頂/環牆切線近垂直，
       直接用切線 atan2 會抖）；偶爾回頭看螢幕（隨機＋尖叫觸發，1.2s，短角 lerp） */
    const camYaw = Math.atan2(park.camera.position.x - p.x, park.camera.position.z - p.z);
    if (this.lookBackT <= 0 && park.t >= this.nextLookBack) {
      this.lookBackT = 1.2;
      this.lastLookStart = park.t;
      this.nextLookBack = park.t + 10 + Math.random() * 8;
    }
    if (this.lookBackT > 0) this.lookBackT -= dt;
    /* 21-5：bill 紋理——面朝前（背朝相機）＝背影 up／回頭或完賽慶祝＝正臉 down（同一 plane 雙面會看到鏡像臉，必須切圖） */
    this.rideBill.material.map = (this.lookBackT > 0 || this.finished) ? park.playerTex.down : park.playerTex.up;
    if (u < 0.995) {
      const uA = Math.min(u + 1.2 / curve.getLength(), 0.999);
      const pa = curve.getPointAt(uA);
      const ahx = pa.x - p.x, ahz = pa.z - p.z;
      if (ahx * ahx + ahz * ahz > 0.02) this.fwdYaw = Math.atan2(ahx, ahz);
    }
    const yawTarget = (this.finished || this.lookBackT > 0) ? camYaw : this.fwdYaw;
    const dyaw = Math.atan2(Math.sin(yawTarget - this.rideBill.rotation.y), Math.cos(yawTarget - this.rideBill.rotation.y));
    this.rideBill.rotation.y += dyaw * (1 - Math.exp(-12 * dt));
    this.rideBill.position.copy(p).addScaledVector(up, 1.9);
    /* 28.5-B：環內淡出主角 sprite——v6 環內 chase 相機距 billboard（2.4×3.0）2.4~4.8u、
       sprite 佔 30~50° 仍偏大；入環淡出（25/s ~0.15s）、出環淡回（8/s ~0.3s），慢放不跳 */
    if (this.billO === undefined || this.billO === null) this.billO = 1;
    this.billO += ((inLoop ? 0 : 1) - this.billO) * (1 - Math.exp(-(inLoop ? 25 : 8) * dt));
    if (this.billO < 0.02) this.billO = 0;
    this.rideBill.material.opacity = this.billO;

    /* 星星旋轉漂浮 */
    for (const s of this.stars) {
      if (s.got) continue;
      s.mesh.rotation.y += dt * 2.5;
      s.mesh.position.y += Math.sin(park.t * 2 + s.t * 20) * 0.004;
    }

    /* 20c：加速線條（陡俯衝） */
    const speedNow = tan.y < -0.45;
    if (speedNow !== this.speedOn) {
      this.speedOn = speedNow;
      const slEl = document.getElementById('park-speedlines');
      if (slEl) slEl.classList.toggle('on', speedNow);
    }

    /* 相機跟車（切線後方）；20b：車在地底時相機高度壓在地面下（跟車鑽進山洞） */
    const under = p.y < -0.15;
    park.underground = under; /* 20c：Park3D.update 地底暗模式 */
    const camUp = under ? Math.min(4, Math.max(0.15, -0.35 - p.y)) : 4;
    /* 28.5-B v6.1：chase＋環外平面偏移 3.4＋look 提前 5u（環法線 rhat×tan 自動適應環面）
       v6(偏移 2.0, look=車) 否決：靜態掃描實測環頂視向死穿入環山脊管（0.03~0.07）——
       山脊在 L1 -z 側後方 (x 25.3~26.4, y 4.7~6.7, z≈-12.05)，2.0 偏移的視向正好從它中間穿過。
       v5 flyaround 否決：靜態掃描實測 +x R3.4 軌道圈擦入環山坡 0.92／地面 U 形軌 0.83，
       x 偏移加大到 3.4 環底更鑽進 U 形管內 0.26；-x 側撞出環軌道→L1 環四周全被軌道包圍。
       v6.1 實測：環底視向穿 -z 側環點 x≈25.8（管帶 24.7~25.3 外 0.5）；山脊處視向距脊
       1.3~4u；U 形軌最近 0.34（在鏡頭外/背後）；方位角累積 350.6° 近單調（t0/t1 邊界
       偏移方向擺動產生 2 次小回跳，低通 20/s 抹平）。look=車箱中心＋5u 切線提前（同 25-1
       環外 look 的提前量，進出環無框架跳變）；up＝世界 up（視向永不垂直→無翻轉）；
       不需位置硬切（t0/t1 目標留在高位、低通滑動干淨，snap 是單幀跳變＝閃爍） */
    const chaseT = p.clone().addScaledVector(tan, -6).add(new THREE.Vector3(0, camUp, 0));
    const chaseLook = p.clone().addScaledVector(tan, 5).add(new THREE.Vector3(0, 1, 0));
    let camT = chaseT, look = chaseLook, upV = new THREE.Vector3(0, 1, 0);
    const loopS = inLoop ? 1 : 0;
    if (inLoop && loops) {
      for (const Lp of loops) {
        if (u < Lp.t0 || u > Lp.t1) continue;
        const c = new THREE.Vector3(Lp.cx, Lp.cy, Lp.cz);
        const rhat = p.clone().sub(c).normalize(); /* 環心→車 */
        const nrm = Lp.fixedN
          ? new THREE.Vector3(Lp.fixedN[0], Lp.fixedN[1], Lp.fixedN[2]) /* 28.5-B v8：L3 固定 +x（動態 nrm 入口指 −x−z 會穿越環面） */
          : rhat.clone().cross(tan).normalize(); /* 環法線（環內恒定、自動適應 yz/xy 環） */
        camT = chaseT.clone().addScaledVector(nrm, 3.4);
        if (camT.y < 0.8) camT.y = 0.8; /* 安全：不鑽地（環內實測 chase+4u 已夠高、不觸發） */
        look = this.car.position.clone().addScaledVector(tan, 5); /* 5u 提前（同環外 chaseLook 提前量） */
        break;
      }
      /* 28.5-B v8：軌道推離護衛——環底進/出口走廊兩側都被進出環軌道佔據（U 形彎/爬坡/出口段），
         v6.1 基礎路徑的鏡頭/視向會擦入（實測 0.05~0.64）；對最近違規管沿「離管中心」方向把目標點
         推出安全距離（鏡頭 0.8→1.15、視向車前段 0.45→0.8），迭代 3 次。目標端平滑＋低通 20/s
         → 視覺上是鏡頭輕輕側移讓軌道，不閃不跳。靜態掃描驗證：四環 losBefore 全清、camClose≥1.3 */
      if (!this._tp) {
        const NP = 1200; this._tp = new Float32Array((NP + 1) * 3); this._tpN = NP;
        for (let j = 0; j <= NP; j++) { const q = curve.getPointAt(j / NP); this._tp[j * 3] = q.x; this._tp[j * 3 + 1] = q.y; this._tp[j * 3 + 2] = q.z; }
      }
      const tp = this._tp, NP = this._tpN;
      for (let iter = 0; iter < 3; iter++) {
        const ax = camT.x, ay = camT.y, az = camT.z;
        const lx = look.x, ly = look.y, lz = look.z;
        const abx = lx - ax, aby = ly - ay, abz = lz - az;
        const ab2 = abx * abx + aby * aby + abz * abz || 1e-9;
        const vl = Math.sqrt(ab2);
        const sCar = ((this.car.position.x - ax) * abx + (this.car.position.y - ay) * aby + (this.car.position.z - az) * abz) / ab2;
        let bestNeed = 0, bx = 0, by = 0, bz = 0;
        for (let j = 0; j <= NP; j++) {
          const t = j / NP, ix = j * 3;
          const qxx = tp[ix], qyy = tp[ix + 1], qzz = tp[ix + 2];
          if (Math.abs(t - u) < 0.008) continue; /* 排除車自身局部軌道 */
          const dx = qxx - ax, dy = qyy - ay, dz = qzz - az;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > 100) continue;
          const d = Math.sqrt(d2);
          let need = 0;
          if (d < 0.8) { /* 鏡頭離管太近（且在前/側方） */
            const dotV = (dx * abx + dy * aby + dz * abz) / (d * vl);
            if (dotV > -0.3) need = 1.15 - d;
          }
          const s = ((qxx - ax) * abx + (qyy - ay) * aby + (qzz - az) * abz) / ab2;
          if (s > 0.05 && s < sCar - 0.02) { /* 管在視向上、車前方 */
            const ex = qxx - (ax + abx * s), ey = qyy - (ay + aby * s), ez = qzz - (az + abz * s);
            const dL = Math.sqrt(ex * ex + ey * ey + ez * ez);
            if (dL < 0.45) { const n2 = 0.8 - dL; if (n2 > need) need = n2; }
          }
          if (need > bestNeed) {
            bestNeed = need;
            const inv = 1 / (d || 1);
            bx = -dx * inv; by = -dy * inv; bz = -dz * inv; /* 推離方向：離該管中心 */
          }
        }
        if (bestNeed <= 0) break;
        camT.x += bx * bestNeed; camT.y += by * bestNeed; camT.z += bz * bestNeed;
        if (camT.y < 0.8) camT.y = 0.8;
      }
    }
    /* 25-1 鏡頭穩定器＋28.5-B：濾波速率隨 loopS 平滑提速（look 6→20、pos 5→20、up 6→14）——
       環內目標變化快（chase 環軌跡）、高速率直接跟住（低速率滯後軌跡漂移）；
       環外維持慢濾波吸粗糙段切線抖動 */
    const k = 1 - Math.exp(-(5 + 15 * loopS) * dt);
    if (!this.smLook) this.smLook = look.clone();
    this.smLook.lerp(look, 1 - Math.exp(-(6 + 14 * loopS) * dt));
    /* 28.5-B：相機 up 低通追蹤 upV（吸 t0/t1 邊界跳變） */
    if (!this.smUp) this.smUp = upV.clone();
    this.smUp.lerp(upV, 1 - Math.exp(-(6 + 8 * loopS) * dt));
    if (this.smUp.lengthSq() < 1e-8) this.smUp.set(0, 1, 0);
    this.smUp.normalize();
    /* 21-5：相機 bank ∝ v²・水平曲率（clamp ±25°）；
       28.5-B v6：環內歸零——世界 up 不 roll，且環牆切線水平投影≈0、dh 雜訊大 */
    const uB = Math.min(u, 0.993);
    const t2 = uB + 0.006;
    const tan2 = curve.getTangentAt(t2);
    const dh = Math.atan2(Math.sin(Math.atan2(tan2.x, tan2.z) - Math.atan2(tan.x, tan.z)),
      Math.cos(Math.atan2(tan2.x, tan2.z) - Math.atan2(tan.x, tan.z)));
    const curv = dh / (t2 - uB) / curve.getLength(); /* 1/u，+=左彎 */
    const bankT = inLoop ? 0 : Math.max(-0.44, Math.min(0.44, this.v * this.v * curv * 0.03));
    this.bank += (bankT - this.bank) * (1 - Math.exp(-4 * dt));
    const fwd = this.smLook.clone().sub(park.camera.position).normalize();
    park.camera.up.copy(this.smUp).applyAxisAngle(fwd, this.bank);
    park.camera.position.lerp(camT, k);
    park.camera.lookAt(this.smLook);
  },

  /* 20c：太陽過曝閃光（出洞：白閃快速淡出） */
  _sunFlash() {
    const el = document.getElementById('park-sunflash');
    if (el) {
      el.style.transition = 'none';
      el.style.opacity = '1';
      void el.offsetWidth; /* 強迫 reflow，讓下方淡出 transition 生效 */
      el.style.transition = 'opacity 1.1s ease-out';
      el.style.opacity = '0';
    }
    sfx('whoosh'); /* 出洞風聲 */
  },

  abort() {
    if (!this.active) return;
    this._cleanup(false);
  },

  _cleanup(awarded) {
    const park = this.park;
    /* 移除車與星星 */
    if (this.car) park.scene.remove(this.car);
    for (const s of this.stars) park.scene.remove(s.mesh);
    this.stars = [];
    this.car = null;
    this.smLook = null; /* 25-1：下趟重新收斂 */
    this.smUp = null;   /* 28.5-B：下趟重新收斂 */
    /* 恢復停靠列車 */
    if (park.parkedTrain) for (const c of park.parkedTrain) c.visible = true;
    /* 玩家回站點 */
    park.player.visible = true;
    park.shadow.visible = true;
    park.player.position.set(5, 1.5, 6);
    park.player.rotation.y = 0; /* 18e-fix：騎車時 billboard 轉向相機，走路要歸零 */
    park.player.material.map = park.playerTex[park.facing] || park.playerTex.down; /* 21-5：還原走路紋理 */
    park.player.material.opacity = 1; /* 28.5-B v4：還原環內淡出 */
    this.billO = 1;
    park.shadow.position.set(5, 0.03, 6);
    park.facing = 'down';
    park.redrawAll(0.5, false);
    /* 相機回全景 */
    park.camera.up.set(0, 1, 0); /* 21-5：還原 bank */
    this.bank = 0;
    this.lookBackT = 0;
    park.camera.position.set(0, 19, 34);
    park.camera.lookAt(0, 4, -5);
    /* 狀態 */
    this.active = false;
    this.finished = false;
    this.stopped = false;
    /* 20c：清特效（地底暗模式恢復、移除加速線/過曝殘留） */
    park.underground = false;
    this.speedOn = false;
    const slEl = document.getElementById('park-speedlines');
    if (slEl) slEl.classList.remove('on');
    const sfEl = document.getElementById('park-sunflash');
    if (sfEl) sfEl.style.opacity = '0';
    park.ride = null;
    park.nearStation = null;
    park.hidePrompt();
    $('#park-action').classList.remove('near');
    if (awarded) park.awardStars('coaster', this.collected);
  },
};

window.ParkCoaster = ParkCoaster;
