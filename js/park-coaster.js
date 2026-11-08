/* ════════════════════════════════════════════════════════════════
   第十八輪18e：雲霄飛車小遊戲（ParkCoaster）
   - 複用公園的裝飾軌道（CatmullRomCurve3）＝你看到的車就是你坐的車
   - 物理：v += -g·tangent.y·dt（重力投影切線）－阻力；Space/E/⚡ 踩踏板 +7 速度
   - 4 顆星星沿軌道；t≥1 過終點 → 結算（星星入 Park3D.stars）
   - 車速過低會停住 → 提示「再踩一下！」
   - 相機跟車（切線後方），玩家 billboard 坐在車上
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

  G: 18,            /* 重力（arcade 感） */
  FRICTION: 0.25,   /* 阻力係數 */
  BOOST: 7,         /* 踩踏板加速 */
  V_MAX: 24,

  /* 軌道上星星位置（t 參數） */
  STAR_TS: [0.33, 0.5, 0.68, 0.88],

  start(park) {
    const THREE = window.THREE;
    this.park = park;
    this.active = true;
    this.t = 0;
    this.v = 5;
    this.stopped = false;
    this.collected = 0;
    this.finished = false;
    this.finishTimer = 0;

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

    /* 物理：重力沿切線投影＋阻力 */
    const tan = curve.getTangentAt(Math.min(this.t, 0.999));
    this.v += -this.G * tan.y * dt - this.v * this.FRICTION * dt;
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
    this.car.position.copy(p);
    const ahead = p.clone().addScaledVector(tan, 1);
    this.car.lookAt(ahead);
    this.car.position.y += 0.55; /* 坐在軌道上 */

    /* 玩家坐在車上（面向相機，避免看到平面背面） */
    const dx = park.camera.position.x - p.x, dz = park.camera.position.z - p.z;
    this.rideBill.rotation.y = Math.atan2(dx, dz);
    this.rideBill.position.copy(p).add(new THREE.Vector3(0, 1.9, 0));

    /* 星星旋轉漂浮 */
    for (const s of this.stars) {
      if (s.got) continue;
      s.mesh.rotation.y += dt * 2.5;
      s.mesh.position.y += Math.sin(park.t * 2 + s.t * 20) * 0.004;
    }

    /* 相機跟車（切線後方） */
    const camT = p.clone().addScaledVector(tan, -6).add(new THREE.Vector3(0, 4, 0));
    const look = p.clone().addScaledVector(tan, 5).add(new THREE.Vector3(0, 1, 0));
    const k = 1 - Math.exp(-5 * dt);
    park.camera.position.lerp(camT, k);
    park.camera.lookAt(look);
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
    /* 恢復停靠列車 */
    if (park.parkedTrain) for (const c of park.parkedTrain) c.visible = true;
    /* 玩家回站點 */
    park.player.visible = true;
    park.shadow.visible = true;
    park.player.position.set(5, 1.5, 6);
    park.player.rotation.y = 0; /* 18e-fix：騎車時 billboard 轉向相機，走路要歸零 */
    park.shadow.position.set(5, 0.03, 6);
    park.facing = 'down';
    park.redrawAll(0.5, false);
    /* 相機回全景 */
    park.camera.position.set(0, 19, 34);
    park.camera.lookAt(0, 4, -5);
    /* 狀態 */
    this.active = false;
    this.finished = false;
    this.stopped = false;
    park.ride = null;
    park.nearStation = null;
    park.hidePrompt();
    $('#park-action').classList.remove('near');
    if (awarded) park.awardStars('coaster', this.collected);
  },
};

window.ParkCoaster = ParkCoaster;
