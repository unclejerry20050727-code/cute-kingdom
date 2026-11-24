/* ════════════════════════════════════════════════════════════════
   第十八輪18g：摩天輪小遊戲（ParkWheel）
   - 坐上 0 號座艙，輪子加速（0.25→0.5 rad/s）慢轉一圈（約 13 秒）
   - 4 顆星星浮在座艙軌道外側（r=8.6）；座艙轉到該角度時自動收集
   - 星星輕鬆向（不用操作）；24-2：鳥群俯衝啄擊——A/D 閃躲
   - 相機跟 0 號座艙（+z 前方）；一圈轉完→3 秒結算→cleanup
   24-2：3 隻鳥在星星外環（r=10.5）盤旋；每 3.2s 派一隻（輪流）
        0.8s 蓄力（紅光+轉向+flap）→0.9s 直線撲「預測 1.7s 後玩家位置」
        →擦過 0.45s→回歸 0.8s；被啄 -1★（1.5s 無敵）；躲過 +1★
   25-6：閃躲改 ⚡ 跳（1.0s 拋物線跳 2.2u，冷卻 1.4s）——鳥鎖定座艙基礎位置，
        落點那一幀 jumpH>0.95 = 鳥從腳下過
  26-2：輪放大 1.5x（r 7.5→11.25、hub 9→13.5、星星/鳥環/座艙/支架同步），
        RIDE_SPEED 0.5→0.34（一圈 12.6s→18.5s 遊玩更久）
  26-3：A/D 左右閃躲加回（pOff±1.2），與 ⚡ 跳躲並存——鳥鎖定「當時 pOff」位置，
        落點幀玩家實際位置（含 pOff/jumpH）偏離 >0.95 = 閃過
   接口：start(park) / update(dt) / action() / abort()
   ════════════════════════════════════════════════════════════════ */
'use strict';

const ParkWheel = {
  active: false,
  startAngle: 0,
  collected: 0,
  stars: [],
  park: null,
  /* 24-2：鳥群狀態 */
  birds: [],
  birdT: 0,
  diveIdx: 0,
  diveTimer: 2.0,
  dodges: 0,
  invuln: 0,
  hitFlash: null,
  jump: 0, jumpCd: 0, /* 25-6：⚡ 跳躲（拋物線） */
  pOff: 0, /* 26-3：A/D 左右閃躲（與跳躲並存） */

  RIDE_SPEED: 0.34,   /* 26-2：輪放大 1.5x 後保持直線速度≈不變（一圈 12.6s→18.5s 遊玩更久） */
  HUB: { x: -20, y: 13.5, z: -14 }, /* 26-2：hub 9→13.5 */
  R_PATH: 11.25, /* 26-2：7.5→11.25 */
  R_STAR: 12.9, /* 26-2：8.6→12.9 */
  R_BIRD: 15.75,    /* 24-2：鳥群環（星星外側）；26-2：10.5→15.75 */
  BIRD_Z: 1.2,     /* 鳥與玩家同平面（輪面 +z）；26-2：0.8→1.2 */
  JUMP_T: 1.0,    /* 25-6：跳躍持續時間（略長於俯衝 0.9s，起跳容錯大） */
  JUMP_H: 2.2,    /* 25-6：跳躍高度（落點幀 >0.95 即閃過） */

  /* 星星的固定世界角度 */
  STAR_ANGLES: [0.25, 0.25 + Math.PI / 2, 0.25 + Math.PI, 0.25 + 3 * Math.PI / 2],

  start(park) {
    const THREE = window.THREE;
    this.park = park;
    this.active = true;
    this.startAngle = park.wheelAngle;
    this.collected = 0;
    park.wheelSpeed = this.RIDE_SPEED;
    /* 26-4：全景 fov（cleanup 恢復 52） */
    park.camera.fov = 60;
    park.camera.updateProjectionMatrix();

    /* 玩家坐上 0 號座艙 */
    park.player.visible = true;
    park.shadow.visible = false;
    park.facing = 'down';
    park.redrawAll(0.5, false);

    /* 星星（座艙軌道外側） */
    this.stars = [];
    for (const a of this.STAR_ANGLES) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.5),
        new THREE.MeshLambertMaterial({ color: 0xffd34d, emissive: 0x8a6a00 }));
      m.position.set(
        this.HUB.x + this.R_STAR * Math.cos(a),
        this.HUB.y + this.R_STAR * Math.sin(a),
        this.HUB.z
      );
      park.scene.add(m);
      this.stars.push({ mesh: m, angle: a, got: false });
    }

    /* 24-2：3 隻鳥（120° 均勻分佈） */
    this.birds = [];
    this.birdT = 0;
    this.diveIdx = 0;
    this.diveTimer = 2.0;
    this.dodges = 0;
    this.invuln = 0;
    this.hitFlash = null;
    this.jump = 0; this.jumpCd = 0; this.pOff = 0; /* 26-3 */
    for (let i = 0; i < 3; i++) {
      const b = this._makeBird(THREE);
      b.orbit.a = (i * Math.PI * 2) / 3;
      b.phase = i * 1.7;
      b.group.position.set(
        this.HUB.x + this.R_BIRD * Math.cos(b.orbit.a),
        this.HUB.y + this.R_BIRD * Math.sin(b.orbit.a),
        this.HUB.z + this.BIRD_Z
      );
      park.scene.add(b.group);
      this.birds.push(b);
    }

    park.nearStation = null;
    $('#park-action').classList.remove('near');
    document.querySelectorAll('.dpad button[data-d="-1,1"], .dpad button[data-d="1,-1"]').forEach(b => b.classList.add('lr-hint')); /* 31-2：脈動提示左右鍵 */
    $('#park-prompt').textContent = '🎡 慢慢轉動中… ★ 0/4 ｜ 🐦 來襲!（← → 左右躲＋⚡ 跳）'; /* 31-2：A/D→← → */
    $('#park-prompt').classList.remove('hidden');
    sfx('pop');
  },

  action() { /* 25-6：⚡ 跳躲（動作鍵/Space/E；A/D 側閃移除） */
    if (!this.active || this.jumpCd > 0) return;
    this.jump = this.JUMP_T;
    this.jumpCd = 1.4;
    sfx('whoosh');
  },

  /* 24-2：造卡通鳥（正面視角：圓身+頭喙+雙翼拍動；local +x = 前進方向） */
  _makeBird(THREE) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x5a7ec2, emissive: 0x000000 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), bodyMat);
    body.scale.set(1.25, 0.95, 0.95);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), bodyMat);
    head.position.set(0.62, 0.28, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.38, 8),
      new THREE.MeshLambertMaterial({ color: 0xffb13d }));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(1.0, 0.28, 0);
    const wGeoL = new THREE.PlaneGeometry(1.05, 0.5); wGeoL.translate(0, 0.42, 0);
    const wGeoR = new THREE.PlaneGeometry(1.05, 0.5); wGeoR.translate(0, -0.42, 0);
    const wMat = new THREE.MeshBasicMaterial({ color: 0x3d5f9e, side: THREE.DoubleSide });
    const wL = new THREE.Mesh(wGeoL, wMat); wL.position.set(-0.12, 0.05, 0.06);
    const wR = new THREE.Mesh(wGeoR, wMat); wR.position.set(-0.12, 0.05, 0.06);
    g.add(body, head, beak, wL, wR);
    return {
      group: g, bodyMat, wL, wR, phase: 0,
      orbit: { a: 0, speed: 0.9 },
      state: 'orbit', t: 0,
      from: null, to: null, retFrom: null,
    };
  },

  /* 24-2/25-6/26-3：預測 tAhead 秒後玩家位置（含當時的 A/D 側閃 pOff；跳躲用高度差） */
  _predictPlayer(tAhead) {
    const park = this.park;
    const g0 = park.ferris.gondolas[0];
    const phi = g0.angle + park.wheelAngle + park.wheelSpeed * tAhead;
    return {
      x: this.HUB.x + this.R_PATH * Math.cos(phi) + this.pOff, /* 26-3：鎖定位含側閃 */
      y: this.HUB.y + this.R_PATH * Math.sin(phi) - 1.28 + 3.0, /* 26-2 */
    };
  },

  update(dt) {
    if (!this.active) return;
    const park = this.park;
    const g0 = park.ferris.gondolas[0];
    const phi = g0.angle + park.wheelAngle;

    /* 座艙世界座標 */
    const gx = this.HUB.x + this.R_PATH * Math.cos(phi);
    const gy = this.HUB.y + this.R_PATH * Math.sin(phi) - 1.28; /* 26-2：0.85→1.28 */
    const gz = this.HUB.z;

    /* 星星收集（角度接近） */
    for (const s of this.stars) {
      if (s.got) continue;
      let d = (phi - s.angle) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 0.25) {
        s.got = true;
        s.mesh.visible = false;
        this.collected++;
        park.addStar(1);
      }
    }

    /* 星星旋轉漂浮 */
    for (const s of this.stars) {
      if (s.got) continue;
      s.mesh.rotation.y += dt * 2.5;
    }

    /* 24-2b/26-3：A/D 左右閃躲（加回），無輸入緩慢回中 */
    const ks = Game.keys;
    let dx = (ks.has('right') ? 1 : 0) - (ks.has('left') ? 1 : 0);
    if (dx === 0 && park.touchDir) dx = park.touchDir[0]; /* 31-1：dpad 在 Game 上，park.touchDir=remap 後（原 park.dpadDir 永遠 undefined） */
    this.pOff += dx * 2.2 * dt;
    if (dx === 0) this.pOff -= this.pOff * Math.min(1, dt * 2.5);
    if (this.pOff > 1.2) this.pOff = 1.2;
    if (this.pOff < -1.2) this.pOff = -1.2;

    /* 25-6：⚡ 跳躲——拋物線跳 4Hτ(1-τ)；落點幀 jumpH>0.95 = 鳥從腳下過 */
    this.jumpCd = Math.max(0, this.jumpCd - dt);
    let jumpH = 0;
    if (this.jump > 0) {
      this.jump = Math.max(0, this.jump - dt);
      const tau = 1 - this.jump / this.JUMP_T;
      jumpH = this.JUMP_H * 4 * tau * (1 - tau);
    }

    /* 玩家坐在座艙上（z 偏離輪面 1.2 避免被輪圈管遮住；面向相機）；26-2：2.0→3.0 */
    park.player.position.set(gx + this.pOff, gy + 3.0 + jumpH, gz + 1.2); /* 26-3：含側閃 */

    /* 24-2：鳥群盤旋／俯衝／命中判定（玩家實際位置，含側閃與跳高） */
    this._updateBirds(dt, gx + this.pOff, gy + 3.0 + jumpH);

    /* 26-4：固定全景鏡頭對 hub——整個大輪＋鳥群逼近全入畫（取代跟座艙近景） */
    const camPos = new THREE.Vector3(this.HUB.x, this.HUB.y + 2, this.HUB.z + 26);
    park.player.rotation.y = Math.atan2(camPos.x - (gx + this.pOff), camPos.z - (gz + 1.2));
    park.camera.position.copy(camPos);
    park.camera.lookAt(this.HUB.x, this.HUB.y, this.HUB.z);

    /* 一圈完成？ */
    const lap = park.wheelAngle - this.startAngle;
    if (lap >= Math.PI * 2 - 0.02) {
      this._finish();
      return;
    }

    const fl = this.hitFlash ? `｜${this.hitFlash.text}` : '';
    $('#park-prompt').textContent =
      `🎡 慢慢轉動中… ★ ${this.collected}（🐦 閃躲 x${this.dodges}）${fl}｜← → 躲＋⚡ 跳`; /* 31-2 */
  },

  /* 24-2：鳥群更新（orbit/tele/dive/pass/ret） */
  _updateBirds(dt, pxNow, pyNow) {
    const park = this.park;
    const BZ = this.HUB.z + this.BIRD_Z;
    this.birdT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.hitFlash) { this.hitFlash.t -= dt; if (this.hitFlash.t <= 0) this.hitFlash = null; }

    /* 排程：每 3.2s 派一隻空閒鳥（輪流）；剩餘時間不足以完成整輪（1.7s 撲+擦過）就不再派 */
    const lap = park.wheelAngle - this.startAngle;
    this.diveTimer -= dt;
    if (this.diveTimer <= 0 && lap < Math.PI * 2 - 1.2) {
      const b = this.birds[this.diveIdx % this.birds.length];
      if (b.state === 'orbit') {
        b.state = 'tele'; b.t = 0.8;
        b.from = { x: b.group.position.x, y: b.group.position.y };
        b.to = this._predictPlayer(1.7); /* 鎖定到命中 = 蓄力 0.8 + 俯衝 0.9 */
        this.diveIdx++;
        this.diveTimer = 3.2;
        sfx('flap');
      } else {
        this.diveTimer = 0.5;
      }
    }

    for (const b of this.birds) {
      const g = b.group;
      if (b.state === 'orbit') b.orbit.a += b.orbit.speed * dt; /* 俯衝期 a 凍結 */
      const ox = this.HUB.x + this.R_BIRD * Math.cos(b.orbit.a);
      const oy = this.HUB.y + this.R_BIRD * Math.sin(b.orbit.a) + Math.sin(this.birdT * 2 + b.phase) * 0.15;
      let tx, ty, face;
      if (b.state === 'orbit') {
        tx = ox; ty = oy;
        face = b.orbit.a + Math.PI / 2;
      } else if (b.state === 'tele') {
        b.t -= dt;
        tx = ox; ty = oy;
        face = Math.atan2(b.to.y - oy, b.to.x - ox);
        if (b.t <= 0) { b.state = 'dive'; b.t = 0.9; }
      } else if (b.state === 'dive') {
        b.t -= dt;
        const u = 1 - Math.max(0, b.t) / 0.9;
        const e = u * u * (3 - 2 * u);
        tx = b.from.x + (b.to.x - b.from.x) * e;
        ty = b.from.y + (b.to.y - b.from.y) * e;
        face = Math.atan2(b.to.y - b.from.y, b.to.x - b.from.x);
        /* 只在落點那一幀判定（鳥恰好抵達預測點）：人還在那裡 = 被啄，
           已閃開（>0.95u）= 閃過。避免直線路徑中途擦過閃避玩家的誤判。 */
        if (b.t <= 0) {
          const d = Math.hypot(b.to.x - pxNow, b.to.y - pyNow);
          b.state = 'pass'; b.t = 0.45;
          if (d < 0.95 && this.invuln <= 0) {
            this.collected = Math.max(0, this.collected - 1);
            this.hitFlash = { t: 1.3, text: '🐦 被啄了! -1★' };
            this.invuln = 1.5;
            sfx('buzz');
          } else {
            this.dodges++;
            this.collected++;
            park.addStar(1);
            this.hitFlash = { t: 1.3, text: '🐦 閃過! +1★' };
            this.invuln = 0.5; /* 短暫寬限，避免回中被擦到 */
            sfx('coin');
          }
        }
      } else if (b.state === 'pass') {
        b.t -= dt;
        const L = Math.hypot(b.to.x - b.from.x, b.to.y - b.from.y) || 1;
        const vx = (b.to.x - b.from.x) / L, vy = (b.to.y - b.from.y) / L;
        const sp = L / 0.9;
        tx = b.to.x + vx * sp * (0.45 - Math.max(0, b.t));
        ty = b.to.y + vy * sp * (0.45 - Math.max(0, b.t));
        face = Math.atan2(vy, vx);
        const d = Math.hypot(tx - pxNow, ty - pyNow);
        if (d < 0.95 && this.invuln <= 0) {
          this.collected = Math.max(0, this.collected - 1);
          this.hitFlash = { t: 1.3, text: '🐦 被啄了! -1★' };
          this.invuln = 1.5;
          sfx('buzz');
        }
        if (b.t <= 0) { b.state = 'ret'; b.t = 0.8; b.retFrom = { x: tx, y: ty }; }
      } else { /* ret：回到盤旋點 */
        b.t -= dt;
        const u = 1 - Math.max(0, b.t) / 0.8;
        const e = u * u * (3 - 2 * u);
        tx = b.retFrom.x + (ox - b.retFrom.x) * e;
        ty = b.retFrom.y + (oy - b.retFrom.y) * e;
        face = Math.atan2(oy - b.retFrom.y, ox - b.retFrom.x);
        if (b.t <= 0) b.state = 'orbit';
      }
      g.position.set(tx, ty, BZ);
      g.rotation.z = face;
      const freq = (b.state === 'tele' || b.state === 'dive') ? 18 : 8;
      const f = 0.45 + Math.sin(this.birdT * freq + b.phase) * 0.4;
      b.wL.rotation.z = f;
      b.wR.rotation.z = -f;
      const atk = (b.state === 'tele' || b.state === 'dive');
      b.bodyMat.color.setHex(atk ? 0xe8504a : 0x5a7ec2);
      b.bodyMat.emissive.setHex(atk ? 0x5a1414 : 0x000000);
    }
  },

  _finish() {
    const park = this.park;
    this.active = false;
    park.ride = {
      update: (dt) => {
        park.ride._t = (park.ride._t || 3) - dt;
        if (park.ride._t <= 0) ParkWheel._cleanup(true);
      },
      abort: () => ParkWheel._cleanup(false),
      action: () => {},
    };
    $('#park-prompt').textContent =
      this.collected >= 4 ? `🎡 完美一圈！★ ${this.collected}（含 🐦 閃躲 x${this.dodges}）`
                          : `🎡 一圈完成！★ ${this.collected}（🐦 閃躲 x${this.dodges}）`;
    $('#park-prompt').classList.remove('hidden');
    sfx('ding');
  },

  abort() {
    if (!this.active) return;
    this._cleanup(false);
  },

  _cleanup(awarded) {
    const park = this.park;
    document.querySelectorAll('.dpad button.lr-hint').forEach(b => b.classList.remove('lr-hint')); /* 31-2 */
    for (const s of this.stars) park.scene.remove(s.mesh);
    this.stars = [];
    for (const b of this.birds) park.scene.remove(b.group);
    this.birds = [];
    this.jump = 0; this.jumpCd = 0; this.pOff = 0; /* 26-3 */
    this.active = false;
    park.wheelSpeed = 0.25;
    /* 玩家回站點 */
    park.player.visible = true;
    park.shadow.visible = true;
    park.player.position.set(-16, 1.5, -2);
    park.player.rotation.y = 0;
    park.shadow.position.set(-16, 0.03, -2);
    park.facing = 'down';
    park.redrawAll(0.5, false);
    park.camera.position.set(0, 19, 34);
    park.camera.lookAt(0, 4, -5);
    park.camera.fov = 52; /* 26-4：恢復全景 fov */
    park.camera.updateProjectionMatrix();
    park.ride = null;
    park.nearStation = null;
    park.hidePrompt();
    $('#park-action').classList.remove('near');
    if (awarded) park.awardStars('wheel', this.collected);
  },
};

window.ParkWheel = ParkWheel;
