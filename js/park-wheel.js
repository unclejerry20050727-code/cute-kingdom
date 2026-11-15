/* ════════════════════════════════════════════════════════════════
   第十八輪18g：摩天輪小遊戲（ParkWheel）
   - 坐上 0 號座艙，輪子加速（0.25→0.5 rad/s）慢轉一圈（約 13 秒）
   - 4 顆星星浮在座艙軌道外側（r=8.6）；座艙轉到該角度時自動收集
   - 星星輕鬆向（不用操作）；24-2：鳥群俯衝啄擊——A/D 閃躲
   - 相機跟 0 號座艙（+z 前方）；一圈轉完→3 秒結算→cleanup
   24-2：3 隻鳥在星星外環（r=10.5）盤旋；每 3.2s 派一隻（輪流）
        0.8s 蓄力（紅光+轉向+flap）→0.9s 直線撲「預測 0.9s 後玩家位置」
        →擦過 0.45s→回歸 0.8s；被啄 -1★（1.5s 無敵）；躲過 +1★
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
  pOff: 0,

  RIDE_SPEED: 0.5,   /* 遊玩時的轉速（rad/s）≈ 12.6 秒一圈 */
  HUB: { x: -20, y: 9, z: -14 },
  R_PATH: 7.5,
  R_STAR: 8.6,
  R_BIRD: 10.5,    /* 24-2：鳥群環（星星外側） */
  BIRD_Z: 0.8,     /* 鳥與玩家同平面（輪面 +z 0.8） */

  /* 星星的固定世界角度 */
  STAR_ANGLES: [0.25, 0.25 + Math.PI / 2, 0.25 + Math.PI, 0.25 + 3 * Math.PI / 2],

  start(park) {
    const THREE = window.THREE;
    this.park = park;
    this.active = true;
    this.startAngle = park.wheelAngle;
    this.collected = 0;
    park.wheelSpeed = this.RIDE_SPEED;

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
    this.pOff = 0;
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
    $('#park-prompt').textContent = '🎡 慢慢轉動中… ★ 0/4 ｜ 🐦 來襲!（A/D 閃躲）';
    $('#park-prompt').classList.remove('hidden');
    sfx('pop');
  },

  action() { /* 24-2：閃躲用 A/D（鍵盤/方向鍵），動作鍵無效 */ },

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

  /* 24-2：預測 tAhead 秒後玩家位置（含座艙轉動＋目前閃躲偏移） */
  _predictPlayer(tAhead) {
    const park = this.park;
    const g0 = park.ferris.gondolas[0];
    const phi = g0.angle + park.wheelAngle + park.wheelSpeed * tAhead;
    return {
      x: this.HUB.x + this.R_PATH * Math.cos(phi) + this.pOff,
      y: this.HUB.y + this.R_PATH * Math.sin(phi) - 0.85 + 2.0,
    };
  },

  update(dt) {
    if (!this.active) return;
    const park = this.park;
    const g0 = park.ferris.gondolas[0];
    const phi = g0.angle + park.wheelAngle;

    /* 座艙世界座標 */
    const gx = this.HUB.x + this.R_PATH * Math.cos(phi);
    const gy = this.HUB.y + this.R_PATH * Math.sin(phi) - 0.85;
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

    /* 玩家坐在座艙上（z 偏離輪面 0.8 避免被紅色環管遮住；面向相機） */
    park.player.position.set(gx, gy + 2.0, gz + 0.8);
    const camTarget = new THREE.Vector3(gx, gy + 3, gz + 13);
    park.player.rotation.y = Math.atan2(camTarget.x - gx, camTarget.z - (gz + 0.8));

    /* 相機跟座艙 */
    const look = new THREE.Vector3(gx, gy + 1.2, gz);
    const k = 1 - Math.exp(-4 * dt);
    park.camera.position.lerp(camTarget, k);
    park.camera.lookAt(look);

    /* 一圈完成？ */
    const lap = park.wheelAngle - this.startAngle;
    if (lap >= Math.PI * 2 - 0.02) {
      this._finish();
      return;
    }

    $('#park-prompt').textContent = `🎡 慢慢轉動中…收集 ${this.collected}/4 ★`;
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
      this.collected >= 4 ? '🎡 完美一圈！收齊 4 顆星星！' : `🎡 一圈完成！收集 ${this.collected}/4 ★`;
    $('#park-prompt').classList.remove('hidden');
    sfx('ding');
  },

  abort() {
    if (!this.active) return;
    this._cleanup(false);
  },

  _cleanup(awarded) {
    const park = this.park;
    for (const s of this.stars) park.scene.remove(s.mesh);
    this.stars = [];
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
    park.ride = null;
    park.nearStation = null;
    park.hidePrompt();
    $('#park-action').classList.remove('near');
    if (awarded) park.awardStars('wheel', this.collected);
  },
};

window.ParkWheel = ParkWheel;
