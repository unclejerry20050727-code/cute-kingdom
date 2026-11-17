/* ════════════════════════════════════════════════════════════════
   Round 27：海盜船小遊戲（ParkShip）
   - 船尾第一人稱（相機 = pivot − 3.3·f + 2.0·u；θ=180° 畫面翻轉）
   - 物理：單擺 θ,ω；α = -(G/L)·sinθ - c·ω（G=5、L=8；小角度一期≈7.9s 慢而重）
   - ⚡ 泵：最低點（|θ|<16°）按對 → ω += 0.38·sign(ω) 越甩越高；按錯 → 1.8s 慢減速
   - 4 顆星（27-3）：+50°/−50°/+115° 大擺幅、90° 頂端星只在完整轉圈時可拿
   - 加速線條（27-4）：|ω|>1.2 再按對 → #park-speedlines 閃 0.7s
   - 轉一圈（27-5）：|ω|>0.6 過 ±π = 真過頂 → 嘔吐 gag；累積 360° = 圈完成
     → 強阻尼收斂 → 底部穩定/4s → 結束
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

  G: 5, L: 8,
  C_BASE: 0.02, C_WRONG: 0.45, C_SETTLE: 0.8,
  PUMP_WIN: 0.28, OMIN: 0.12, PUMP_KICK: 0.38, OMAX: 2.3,
  DURATION: 40,
  PIVOT: { x: 17.5, y: 11.5, z: 9.5 },
  CAM: { back: 3.3, up: 2.0, look: 10 },

  start(park) {
    this.park = park;
    this.active = true;
    this.theta = 0; this.omega = 0.35; /* 初始小擺（幅≈25°），一上船就看到擺動 */
    this.decayT = 0; this.pumpFlash = null;
    this.t = 0; this.collected = 0; this.stars = [];
    this.loopActive = false; this.loopTotal = 0; this.settleT = 0; this.vomitT = 0;
    park.pirate.ship.rotation.z = 0;

    park.camera.fov = 60; /* 27-2：第一人稱廣角（cleanup 恢復 52） */
    park.camera.updateProjectionMatrix();

    /* 第一人稱：玩家平面隱藏（相機取代船尾主角） */
    park.player.visible = false;
    park.shadow.visible = false;

    park.nearStation = null;
    $('#park-action').classList.remove('near');
    $('#park-prompt').classList.remove('hidden');
    sfx('pop');
  },

  action() { /* 27-2：⚡ 泵（最低點按對加速；按錯慢減速） */
    if (!this.active) return;
    const tw = this._wrap(this.theta);
    if (Math.abs(tw) < this.PUMP_WIN && Math.abs(this.omega) > this.OMIN) {
      this.omega = clamp(this.omega + this.PUMP_KICK * Math.sign(this.omega), -this.OMAX, this.OMAX);
      this.pumpFlash = { t: 0.9, text: '⚡ 泵了! 越甩越高' };
      sfx('whoosh');
    } else {
      this.decayT = 1.8;
      this.pumpFlash = { t: 0.9, text: '🐢 按錯時機、慢慢減速…' };
      sfx('buzz');
    }
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

    /* prompt：甩高角度＋星星＋教學 */
    if (this.pumpFlash) { this.pumpFlash.t -= dt; if (this.pumpFlash.t <= 0) this.pumpFlash = null; }
    const deg = Math.round(Math.abs(this._wrap(this.theta)) * 180 / Math.PI);
    const fl = this.pumpFlash ? `｜${this.pumpFlash.text}` : '';
    $('#park-prompt').textContent =
      `🏴‍☠️ 甩高 ${deg}° ｜ ★ ${this.collected}/4 ｜ 最低點按 ⚡ 加速${fl}`;

    /* 27-5：過頂/整圈/收斂判定（此處佔位，27-5 填入） */

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
    park.ride = {
      update: (dt) => {
        ParkShip._tick(dt, ParkShip.C_SETTLE); /* 結算 3s 內船慢慢擺回 */
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
    park.pirate.ship.rotation.z = 0;
    /* 27-3/27-5：星星/粒子/overlay 清理在此補 */
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
