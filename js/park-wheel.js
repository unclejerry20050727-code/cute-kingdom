/* ════════════════════════════════════════════════════════════════
   第十八輪18g：摩天輪小遊戲（ParkWheel）
   - 坐上 0 號座艙，輪子加速（0.25→0.5 rad/s）慢轉一圈（約 13 秒）
   - 4 顆星星浮在座艙軌道外側（r=8.6）；座艙轉到該角度時自動收集
   - 輕鬆向：不需要操作，看風景收星星
   - 相機跟 0 號座艙（+z 前方）；一圈轉完→3 秒結算→cleanup
   接口：start(park) / update(dt) / action() / abort()
   ════════════════════════════════════════════════════════════════ */
'use strict';

const ParkWheel = {
  active: false,
  startAngle: 0,
  collected: 0,
  stars: [],
  park: null,

  RIDE_SPEED: 0.5,   /* 遊玩時的轉速（rad/s）≈ 12.6 秒一圈 */
  HUB: { x: -20, y: 9, z: -14 },
  R_PATH: 7.5,
  R_STAR: 8.6,

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

    park.nearStation = null;
    $('#park-action').classList.remove('near');
    $('#park-prompt').textContent = '🎡 慢慢轉動中…收集 0/4 ★';
    $('#park-prompt').classList.remove('hidden');
    sfx('pop');
  },

  action() { /* 摩天輪不需要操作 */ },

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
