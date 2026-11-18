/* ════════════════════════════════════════════════════════════════
   Round 27：海盜船小遊戲（ParkShip）
   - 船尾第一人稱（相機 = pivot − 3.3·f + 2.0·u；θ=180° 畫面翻轉）
   - 物理：單擺 θ,ω；α = -(G/L)·sinθ - c·ω（G=5、L=8；小角度一期≈7.9s 慢而重）
   - ⚡ 泵：最低點（|θ|<16°）按對 → ω += 0.38·sign(ω) 越甩越高；按錯 → 1.8s 慢減速
   - 4 顆星（27-3）：+50°/−50°/+115° 大擺幅、90° 頂端星只在完整轉圈時可拿
   - 加速線條（27-4）：|ω|>1.2 再按對 → #park-speedlines 閃 0.7s
   - 轉一圈（27-5）：|ω|>0.6 過 ±π = 真過頂 → 嘔吐 gag；累積 360° = 圈完成
     → 強阻尼收斂 → 底部穩定/4s → 結束
   - 28.5-A：主角臉部特寫小框（右上角，FPV 看不到自己→旁側小框全程顯示表情：
     calm/fun/excited/panic/vomit 五層＋眨眼/gaze/頭汗/落淚）
   - 40s 限時；結束 → awardStars('ship', n) → cleanup（船歸位、玩家回站點）
   接口：start(park) / update(dt) / action() / abort()
   ════════════════════════════════════════════════════════════════ */
'use strict';

const ParkShip = {
  active: false,
  park: null,
  theta: 0, omega: 0, /* θ 不包裹（迴圈/圈數計數用） */
  decayT: 0,           /* 按錯減速剩餘秒 */
  pumpFlash: null,     /* prompt 回饋 {t, text} */
  t: 0,
  collected: 0,
  stars: [],           /* 27-3 */
  loopActive: false,   /* 27-5：完整轉圈進行中（頂端星可拿） */
  loopTotal: 0,        /* 27-5：本圈累積角度 */
  settleT: 0,          /* 27-5：圈完成後收斂計時 */
  vomitT: 0,           /* 27-5：嘔吐 gag 剩餘秒 */
  speedlineT: 0,       /* 27-4：加速線閃現剩餘秒 */
  _prevTheta: null,    /* 27-5：上一幀 θ（跨頂偵測） */
  vomitParts: [],      /* 27-5：嘔吐粒子 [{m, vx, vy, vz, life}] */

  G: 5, L: 8,
  C_BASE: 0.02, C_WRONG: 0.45, C_SETTLE: 0.8,
  PUMP_WIN: 0.28, OMIN: 0.12, PUMP_KICK: 0.38, OMAX: 2.3,
  SPEED_OMEGA: 1.2, /* 27-4：超速線——再泵時 |ω|>此值才閃加速線 */
  LOOMIN: 0.6,      /* 27-5：真轉頂——跨 ±π 時 |ω|>此值才嘔吐 gag */
  /* 27-5：計圈/頂端星上膛——能量 E = ½ω² + (G/L)(1−cosθ) > 翻頂屏障(1.25) + ½·LOOMIN²(0.18) */
  LOOP_ENGARM: 1.43,
  DURATION: 40,
  PIVOT: { x: 17.5, y: 11.5, z: 9.5 },
  CAM: { back: 3.3, up: 2.0, look: 10 },
  /* 27-3：4 顆星（船頭半徑 8.3 的固定世界角；+90° 頂端星只在完整轉圈 loopActive 時可拿） */
  R_STAR: 8.3,
  STAR_ANGLES: [50 * Math.PI / 180, -50 * Math.PI / 180, 115 * Math.PI / 180, Math.PI / 2],
  STAR_WIN: 0.24,

  start(park) {
    this.park = park;
    this.active = true;
    this.theta = 0; this.omega = 0.35; /* 初始小擺（幅≈25°），一上船就看到擺動 */
    this.decayT = 0; this.pumpFlash = null;
    this.t = 0; this.collected = 0; this.stars = [];
    this.loopActive = false; this.loopTotal = 0; this.settleT = 0; this.vomitT = 0; this.speedlineT = 0;
    this._prevTheta = null; this.vomitParts = [];
    park.pirate.ship.rotation.z = 0;

    /* 27-3：4 顆星（金色八面體，繞軸旋轉漂浮） */
    const THREE = window.THREE;
    this.stars = [];
    for (const a of this.STAR_ANGLES) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.6),
        new THREE.MeshLambertMaterial({ color: 0xffd34d, emissive: 0x8a6a00 }));
      m.position.set(this.PIVOT.x + this.R_STAR * Math.cos(a), this.PIVOT.y + this.R_STAR * Math.sin(a), this.PIVOT.z);
      park.scene.add(m);
      this.stars.push({ mesh: m, angle: a, got: false, top: a === Math.PI / 2 });
    }

    park.camera.fov = 60; /* 27-2：第一人稱廣角（cleanup 恢復 52） */
    park.camera.updateProjectionMatrix();

    /* 第一人稱：玩家平面隱藏（相機取代船尾主角） */
    park.player.visible = false;
    park.shadow.visible = false;

    park.nearStation = null;
    $('#park-action').classList.remove('near');
    $('#park-prompt').classList.remove('hidden');
    sfx('pop');

    /* 28.5-A：臉部特寫小框（FPV 看不到自己→旁側顯示表情） */
    this._ensureFacebox();
    this._blinkTimer = 1.5 + Math.random() * 2; this._blinkOn = 0;
    this._faceboxShow(true);
  },

  action() { /* 27-2：⚡ 泵（最低點按對加速；按錯慢減速） */
    if (!this.active) return;
    const tw = this._wrap(this.theta);
    if (Math.abs(tw) < this.PUMP_WIN && Math.abs(this.omega) > this.OMIN) {
      this.omega = clamp(this.omega + this.PUMP_KICK * Math.sign(this.omega), -this.OMAX, this.OMAX);
      this.pumpFlash = { t: 0.9, text: '⚡ 泵了! 越甩越高' };
      sfx('whoosh');
      /* 27-4：超速（|ω|>1.2）再泵 → 加速線閃 0.7s（複用雲霄 #park-speedlines） */
      if (Math.abs(this.omega) > this.SPEED_OMEGA) {
        this.speedlineT = 0.7;
        const slEl = document.getElementById('park-speedlines');
        if (slEl) slEl.classList.add('on');
      }
    } else {
      this.decayT = 1.8;
      this.pumpFlash = { t: 0.9, text: '🐢 按錯時機、慢慢減速…' };
      sfx('buzz');
    }
  },

  /* ── 27-5：嘔吐 gag（緊閉><眼大頭彈出 + 綠色粒子 + 綠暈） ── */
  /* >< 緊閉眼（28.5-A：嘔吐大頭與臉部小框共用）——drawFace 眼中心 = x±0.38R, y+0.1R 附近 */
  _drawSquint(ctx, cx, cy, R) {
    const ex = R * 0.38, ey = cy + R * 0.10, l = R * 0.17;
    ctx.strokeStyle = '#3a2417';
    ctx.lineWidth = Math.max(3, R * 0.055);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const x = cx + side * ex;
      ctx.beginPath();
      ctx.moveTo(x - l, ey - l); ctx.lineTo(x + l, ey + l);
      ctx.moveTo(x + l, ey - l); ctx.lineTo(x - l, ey + l);
      ctx.stroke();
    }
  },
  _ensureFace() {
    if (this._faceCvs) return;
    const c = document.createElement('canvas');
    c.width = c.height = 200;
    c.id = 'park-vomit-face';
    const ctx = c.getContext('2d');
    const cfg = Object.assign({}, Game.playerCfg, { mouthShape: 'open' });
    drawPortrait(ctx, cfg, 200, { eyesClosed: true, t: 0.2, gaze: 0 });
    /* >< 緊閉眼：蓋掉溫柔閉眼弧 */
    this._drawSquint(ctx, 100, 112, 72);
    this._faceCvs = c;
  },

  /* ── 28.5-A：主角臉部特寫小框（FPV 看不到自己的表情→旁側小框全程顯示）── */
  _ensureFacebox() {
    if (this._facebox) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const box = document.createElement('div');
    box.id = 'park-facebox';
    Object.assign(box.style, {
      position: 'absolute', top: '72px', right: '14px',
      width: '128px', height: '128px',
      pointerEvents: 'none', zIndex: '7',
      background: 'var(--panel)', border: '4px solid var(--panel-border)',
      borderRadius: '28px', boxShadow: 'var(--shadow)',
      opacity: '0', transform: 'scale(.6)',
      transition: 'opacity .22s ease, transform .22s cubic-bezier(.34,1.56,.64,1)',
    });
    const c = document.createElement('canvas');
    c.width = c.height = Math.round(128 * dpr);
    c.style.cssText = 'width:100%;height:100%;display:block';
    box.appendChild(c);
    document.getElementById('screen-park3d').appendChild(box);
    this._facebox = box;
    this._faceboxCvs = c;
    this._blinkTimer = 1.5 + Math.random() * 2;
    this._blinkOn = 0;
    this._faceState = null;
  },
  _faceboxShow(on) {
    if (!this._facebox) return;
    this._facebox.style.opacity = on ? '1' : '0';
    this._facebox.style.transform = on ? 'scale(1)' : 'scale(.6)';
  },
  /* 28.5-A：表情分層——calm(小擺微笑)→fun(中等擺)→excited(|ω|>0.95 張嘴)
     →panic(loopActive 或 |ω|>1.45：張嘴＋頭汗)→vomit(><＋張嘴＋落淚＋綠暈＋頭抖) */
  _updateFace(dt) {
    if (!this._faceboxCvs) return;
    const c = this._faceboxCvs, ctx = c.getContext('2d');
    const S = c.width;
    const w = Math.abs(this.omega);
    const vom = this.vomitT > 0;
    const panic = vom || this.loopActive || w > 1.45;
    const excited = !panic && w > 0.95;

    /* 自然眨眼（panic/vomit 不眨） */
    if (!panic) {
      this._blinkTimer -= dt;
      if (this._blinkTimer <= 0) { this._blinkTimer = 2.2 + Math.random() * 2.4; this._blinkOn = 0.12; }
    }
    let blink = 0;
    if (this._blinkOn > 0) { this._blinkOn -= dt; blink = 1; }

    const cfg = Object.assign({}, Game.playerCfg, {
      mouthShape: panic || excited ? 'open' : 'smile',
    });
    const gaze = panic ? 0 : clamp(this.omega * 0.6, -1, 1);

    ctx.clearRect(0, 0, S, S);
    ctx.save();
    /* 頭部：嘔吐時抖動，否則隨角速度傾斜＋輕微浮動 */
    let rot = 0, shx = 0, shy = 0;
    if (vom) {
      rot = (Math.random() - 0.5) * 0.14;
      shx = (Math.random() - 0.5) * S * 0.04;
    } else {
      rot = clamp(this.omega * 0.1, -0.22, 0.22);
      shy = Math.sin(this.t * 2.2) * S * 0.012;
    }
    ctx.translate(S / 2 + shx, S / 2 + shy);
    ctx.rotate(rot);
    ctx.translate(-S / 2, -S / 2);
    drawPortrait(ctx, cfg, S, { t: this.t, gaze, blink });

    /* 疊加（與 drawPortrait 臉對齊：x=S/2, y=S*0.56, R=S*0.36） */
    const x = S / 2, y = S / 2 + S * 0.06, R = S * 0.36;
    if (vom) {
      this._drawSquint(ctx, x, y, R);
      /* 淚：眼下落淚滴（循環落下） */
      const ph = (this.t * 1.4) % 1;
      ctx.fillStyle = 'rgba(110,190,235,0.95)';
      for (const side of [-1, 1]) {
        const tx = x + side * R * 0.38, ty = y + R * 0.26 + ph * R * 0.3;
        ctx.beginPath();
        ctx.ellipse(tx, ty, R * 0.05, R * 0.075, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(140,210,80,0.14)';
      ctx.fillRect(0, 0, S, S);
    } else if (panic) {
      /* 頭汗：兩太陽穴（輕彈跳） */
      ctx.fillStyle = 'rgba(120,190,235,0.9)';
      const b = Math.sin(this.t * 9);
      for (const [sx, sy] of [[x - R * 0.8, y - R * 0.5 + b * R * 0.05], [x + R * 0.84, y - R * 0.36 - b * R * 0.05]]) {
        ctx.beginPath();
        ctx.moveTo(sx, sy - R * 0.24);
        ctx.quadraticCurveTo(sx + R * 0.14, sy - R * 0.02, sx, sy + R * 0.12);
        ctx.quadraticCurveTo(sx - R * 0.14, sy - R * 0.02, sx, sy - R * 0.24);
        ctx.fill();
      }
    }
    ctx.restore();
    this._faceState = vom ? 'vomit' : panic ? 'panic' : excited ? 'excited' : w > 0.5 ? 'fun' : 'calm';
  },
  _spawnVomit() {
    const THREE = window.THREE, park = this.park;
    const cam = park.camera.position;
    const fx = Math.cos(this.theta), fy = Math.sin(this.theta); /* 船身朝前 */
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.1 + Math.random() * 0.12, 6, 5),
        new THREE.MeshLambertMaterial({ color: 0x8fd34e, emissive: 0x2f5c12 })
      );
      m.position.set(
        cam.x + fx * 1.4 + (Math.random() - 0.5) * 0.5,
        cam.y - 0.25 + (Math.random() - 0.5) * 0.4,
        cam.z + (Math.random() - 0.5) * 0.3
      );
      park.scene.add(m);
      this.vomitParts.push({
        m,
        vx: fx * (3 + Math.random() * 3) + (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.4) * 1.6,
        vz: (Math.random() - 0.5) * 1.2,
        life: 0.9 + Math.random() * 0.3,
      });
    }
  },
  _triggerVomit() {
    this.vomitT = 2.2;
    this.pumpFlash = { t: 2.2, text: '🤮 嘔吐了!!' };
    this._ensureFace();
    const el = document.getElementById('park-vomit');
    if (el) {
      if (!el.contains(this._faceCvs)) el.appendChild(this._faceCvs);
      el.classList.add('on');
    }
    this._spawnVomit();
    sfx('vomit');
  },
  _endVomit() {
    const el = document.getElementById('park-vomit');
    if (el) el.classList.remove('on');
  },

  /* θ → (−π, π] */
  _wrap(th) {
    let d = th % (2 * Math.PI);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d <= -Math.PI) d += 2 * Math.PI;
    return d;
  },

  /* 27-2：物理＋船身旋轉＋第一人稱相機（結算期也復用，c 可覆蓋） */
  _tick(dt, cOverride) {
    const park = this.park;
    const THREE = window.THREE;
    this.decayT = Math.max(0, this.decayT - dt);
    const c = cOverride != null ? cOverride
      : (this.settleT > 0 ? this.C_SETTLE : (this.decayT > 0 ? this.C_WRONG : this.C_BASE));
    this.omega += (-(this.G / this.L) * Math.sin(this.theta) - c * this.omega) * dt;
    this.theta += this.omega * dt;
    park.pirate.ship.rotation.z = this.theta;

    /* 第一人稱：f=船向、u=船上方向；相機坐高 2.0（> 靠背 1.75） */
    const p = this.PIVOT;
    const fx = Math.cos(this.theta), fy = Math.sin(this.theta);
    const ux = -Math.sin(this.theta), uy = Math.cos(this.theta);
    const cx = p.x - this.CAM.back * fx + this.CAM.up * ux;
    const cy = p.y - this.CAM.back * fy + this.CAM.up * uy;
    park.camera.up.set(ux, uy, 0);
    park.camera.position.set(cx, cy, p.z);
    park.camera.lookAt(cx + this.CAM.look * fx, cy + this.CAM.look * fy, p.z);
  },

  update(dt) {
    if (!this.active) return;
    const park = this.park;
    this.t += dt;

    this._tick(dt);

    /* 28.5-A：臉部小框每幀重繪（表情隨 ω/loopActive/vomitT） */
    this._updateFace(dt);

    /* 27-5：轉圈——能量足夠（E>LOOP_ENGARM）即上膛（頂端星可拿）；
       跨 ±π 且 |ω|>LOOMIN = 真翻頂 → 嘔吐 gag；累滿 360° → settle 收斂 */
    const prev = this._prevTheta != null ? this._prevTheta : this.theta;
    this._prevTheta = this.theta;
    if (!this.settleT) {
      const jump = Math.abs(this.theta - prev);
      const E = 0.5 * this.omega * this.omega + (this.G / this.L) * (1 - Math.cos(this.theta));
      if (E > this.LOOP_ENGARM) this.loopActive = true;
      if (jump < 1 && Math.abs(this.omega) > this.LOOMIN &&
          ((prev < Math.PI && this.theta >= Math.PI) || (prev > -Math.PI && this.theta <= -Math.PI))) {
        this._triggerVomit(); /* 真過頂（船身倒轉）gag */
      }
      if (this.loopActive) {
        this.loopTotal += jump;
        if (this.loopTotal >= 2 * Math.PI) {
          this.loopActive = false;
          this.settleT = 4; /* 一圈完成→強阻尼收斂，4s 後結束（或船先停穩） */
          this.pumpFlash = { t: 1.5, text: '🌀 完成一圈!!' };
          sfx('ding');
        }
      }
    }

    /* 27-4：加速線計時器到期移除 */
    if (this.speedlineT > 0) {
      this.speedlineT -= dt;
      if (this.speedlineT <= 0) {
        const slEl = document.getElementById('park-speedlines');
        if (slEl) slEl.classList.remove('on');
      }
    }

    /* 27-5：嘔吐 gag 計時＋粒子（重力 -5、落地/到期移除） */
    if (this.vomitT > 0) {
      this.vomitT -= dt;
      for (let i = this.vomitParts.length - 1; i >= 0; i--) {
        const q = this.vomitParts[i];
        q.life -= dt;
        q.vy -= 5 * dt;
        q.m.position.x += q.vx * dt;
        q.m.position.y += q.vy * dt;
        q.m.position.z += q.vz * dt;
        if (q.life <= 0 || q.m.position.y < 0.05) {
          this.park.scene.remove(q.m);
          this.vomitParts.splice(i, 1);
        }
      }
      if (this.vomitT <= 0) this._endVomit();
    }

    /* 27-3：星星收集（船頭經過角度窗口 0.24rad；頂端星要 loopActive） */
    for (const s of this.stars) {
      if (s.got) continue;
      s.mesh.rotation.y += dt * 2.5;
      if (s.top && !this.loopActive) continue;
      let d = (this.theta - s.angle) % (2 * Math.PI);
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) < this.STAR_WIN) {
        s.got = true; s.mesh.visible = false;
        this.collected++;
        park.addStar(1);
      }
    }
    /* prompt：甩高角度＋星星＋教學 */
    if (this.pumpFlash) { this.pumpFlash.t -= dt; if (this.pumpFlash.t <= 0) this.pumpFlash = null; }
    const deg = Math.round(Math.abs(this._wrap(this.theta)) * 180 / Math.PI);
    const fl = this.pumpFlash ? `｜${this.pumpFlash.text}` : '';
    $('#park-prompt').textContent =
      `🏴‍☠️ 甩高 ${deg}° ｜ ★ ${this.collected}/4 ｜ 最低點按 ⚡ 加速${fl}`;

    /* 結束：40s 或（27-5）整圈收斂 */
    if (this.settleT > 0) {
      this.settleT -= dt;
      const w = this._wrap(this.theta);
      if (this.settleT <= 0 || (Math.abs(w) < 0.15 && Math.abs(this.omega) < 0.5)) {
        this._finish(); return;
      }
    } else if (this.t >= this.DURATION) {
      this._finish();
    }
  },

  _finish() {
    const park = this.park;
    this.active = false;
    this.speedlineT = 0; /* 27-4：結算期不再閃加速線 */
    const slEl = document.getElementById('park-speedlines');
    if (slEl) slEl.classList.remove('on');
    park.ride = {
      update: (dt) => {
        ParkShip._tick(dt, ParkShip.C_SETTLE); /* 結算 3s 內船慢慢擺回 */
        ParkShip._updateFace(dt); /* 28.5-A：結算期繼續顯示（慢慢回 calm） */
        park.ride._t = (park.ride._t || 3) - dt;
        if (park.ride._t <= 0) ParkShip._cleanup(true);
      },
      abort: () => ParkShip._cleanup(false),
      action: () => {},
    };
    $('#park-prompt').textContent =
      this.collected >= 4 ? `🏴‍☠️ 傳奇一圈! ★ ${this.collected}/4`
                          : `🏴‍☠️ 本次結束! ★ ${this.collected}/4`;
    $('#park-prompt').classList.remove('hidden');
    sfx('ding');
  },

  abort() {
    if (!this.active) return;
    this._cleanup(false);
  },

  _cleanup(awarded) {
    const park = this.park;
    this._faceboxShow(false); /* 28.5-A：收小框 */
    park.pirate.ship.rotation.z = 0;
    const slEl = document.getElementById('park-speedlines'); /* 27-4：清特效 */
    if (slEl) slEl.classList.remove('on');
    this.speedlineT = 0;
    for (const q of this.vomitParts) park.scene.remove(q.m); /* 27-5：清嘔吐粒子 */
    this.vomitParts = [];
    this._endVomit(); /* 27-5：收綠暈/大頭 */
    this._prevTheta = null;
    for (const s of this.stars) park.scene.remove(s.mesh); /* 27-3 */
    this.stars = [];
    park.player.visible = true;
    park.shadow.visible = true;
    park.player.position.set(12.5, 1.5, 10.5);
    park.player.rotation.y = 0;
    park.shadow.position.set(12.5, 0.03, 10.5);
    park.facing = 'down';
    park.redrawAll(0.5, false);
    park.camera.position.set(0, 19, 34);
    park.camera.up.set(0, 1, 0);
    park.camera.lookAt(0, 4, -5);
    park.camera.fov = 52;
    park.camera.updateProjectionMatrix();
    park.ride = null;
    park.nearStation = null;
    park.hidePrompt();
    $('#park-action').classList.remove('near');
    if (awarded) park.awardStars('ship', this.collected);
  },
};

window.ParkShip = ParkShip;
