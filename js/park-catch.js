/* ════════════════════════════════════════════════════════════════
   第十八輪18f：甜甜圈接接樂（ParkCatch）
   - 30 秒接住從天上掉下來的甜甜圈（torus）
   - 左/右移動（A/D/方向鍵/dpad）；接一顆 +1 星（Park3D.addStar）
   - 難度漸進：出圈間隔 1.0s → 0.55s
   - 固定全景相機（站在氣球站點前接）
   24-1：(b) Space/E/⚡ 飛撲接（0.45s 衝刺+傾身+大接取盒，冷卻 1.2s）
         (a) 接住雙手舉頭頂 0.6s（catch pose） (c) 5s 後 25% 出 🧨（接到 -2★）
   接口：start(park) / update(dt) / action() / abort()
   ════════════════════════════════════════════════════════════════ */
'use strict';

const ParkCatch = {
  active: false,
  timeLeft: 0,
  score: 0,
  spawnTimer: 0,
  donuts: [],
  px: 0,          /* 玩家 x（z 固定 -6） */
  walking: false,
  walkT: 0,
  animFrame: -1,
  park: null,

  /* 24-1：catch pose／飛撲／炸彈 */
  poseT: 0, poseAge: 0, poseLast: -9,
  dive: null,        /* { t, dir } */
  diveCd: 0, lean: 0,
  flash: null,       /* { t, text } */
  fx: [],

  DURATION: 30,
  Z: -6,          /* 接圈位置（氣球站點） */
  X_MIN: -11,
  X_MAX: 11,
  SPEED: 9,

  COLORS: [0xf48fb1, 0x85c1e9, 0xf9e79f, 0xa9dfbf, 0xd7bde2],

  start(park) {
    const THREE = window.THREE;
    this.park = park;
    this.active = true;
    this.timeLeft = this.DURATION;
    this.score = 0;
    this.spawnTimer = 0.5;
    this.donuts = [];
    this.px = 0;
    this.walking = false;
    this.walkT = 0;
    this.animFrame = -1;
    this.poseT = 0; this.poseAge = 0; this.poseLast = -9;
    this.dive = null; this.diveCd = 0; this.lean = 0;
    this.flash = null; this.fx = [];
    park.player.rotation.z = 0;

    /* 玩家到氣球站點 */
    park.player.visible = true;
    park.shadow.visible = true;
    park.player.position.set(this.px, 1.5, this.Z);
    park.player.rotation.y = 0;
    park.shadow.position.set(this.px, 0.03, this.Z);
    park.facing = 'down';
    park.redrawAll(0.5, false);

    park.nearStation = null;
    $('#park-action').classList.remove('near');
    this._setPrompt();
    sfx('pop');
  },

  /* 24-1b：飛撲接——Space/E/⚡ */
  action() {
    if (!this.active || this.dive || this.diveCd > 0) return;
    const k = Game.keys;
    let dir = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0);
    if (dir === 0 && this.park.dpadDir) dir = this.park.dpadDir[0];
    if (dir === 0) {
      /* 無方向輸入：撲向最近的落下物 */
      let best = null, bd = 99;
      for (const d of this.donuts) {
        const dist = Math.abs(d.mesh.position.x - this.px);
        if (d.mesh.position.y > 0.5 && dist < bd) { bd = dist; best = d; }
      }
      dir = best ? (best.mesh.position.x >= this.px ? 1 : -1) : 1;
    }
    this.dive = { t: 0.45, dir };
    sfx('whoosh');
  },

  _setPrompt() {
    const sec = Math.max(0, Math.ceil(this.timeLeft));
    const extra = this.dive ? '🌪 飛撲中!' : (this.diveCd > 0 ? '⚡ 冷卻中' : '⚡ 可飛撲');
    const flashTxt = this.flash ? '｜' + this.flash.text : '';
    $('#park-prompt').textContent =
      `⏰ ${sec}s ｜ 🍩 ${this.score}${flashTxt}（A/D 移動・${extra}・別接 🧨）`;
    $('#park-prompt').classList.remove('hidden');
  },

  _spawn(THREE, isBomb) {
    const m = new THREE.Group();
    const spin = (Math.random() - 0.5) * 3;
    if (isBomb) {
      /* 24-1d：炸彈（不可接，接到 -2★） */
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10),
        new THREE.MeshLambertMaterial({ color: 0x3a3f4a }));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.2, 8),
        new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
      cap.position.set(0.18, 0.5, 0); cap.rotation.z = 0.6;
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffb13d }));
      spark.position.set(0.32, 0.6, 0);
      m.add(body, cap, spark);
    } else {
      const base = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.34, 10, 18),
        new THREE.MeshLambertMaterial({
          color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
        })
      );
      m.add(base);
      /* 糖霜（白色小圈） */
      const icing = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.2, 8, 16),
        new THREE.MeshLambertMaterial({ color: 0xfff8ec })
      );
      icing.rotation.x = Math.PI / 2;
      icing.position.y = 0.22;
      m.add(icing);
    }
    m.position.set(
      this.X_MIN + 1 + Math.random() * (this.X_MAX - this.X_MIN - 2),
      12,
      this.Z + (Math.random() * 3 - 1.5)
    );
    m.rotation.z = Math.random() * Math.PI;
    this.park.scene.add(m);
    this.donuts.push({ mesh: m, vy: 2 + Math.random() * 2, spin, kind: isBomb ? 'bomb' : 'donut' });
  },

  /* 24-1d：炸彈爆炸（橙色球體擴大淡出） */
  _explode(pos) {
    const THREE = window.THREE;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff9d3d, transparent: true, opacity: 0.9 }));
    m.position.copy(pos);
    this.park.scene.add(m);
    this.fx.push({ mesh: m, t: 0.45 });
  },

  /* 24-1a：接住→舉手 pose 0.6s */
  _catchPose() {
    this.poseT = 0.6;
    this.poseAge = 0;
    this.poseLast = -9;
  },

  update(dt) {
    if (!this.active) return;
    const park = this.park, THREE = window.THREE;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this._finish();
      return;
    }

    /* 玩家左右移動（18f-fix：Game.keys 在 Game 上，不在 park 上） */
    const k = Game.keys;
    let dx = 0;
    if (k.has('left')) dx -= 1;
    if (k.has('right')) dx += 1;
    if (dx === 0 && park.dpadDir) dx = park.dpadDir[0];

    /* 24-1b：飛撲——覆蓋方向、2.6× 速 */
    if (this.dive) {
      this.dive.t -= dt;
      dx = this.dive.dir;
      if (this.dive.t <= 0) { this.dive = null; this.diveCd = 1.2; }
    }
    this.diveCd = Math.max(0, this.diveCd - dt);
    this.walking = dx !== 0;
    if (this.walking) {
      const sp = this.dive ? this.SPEED * 2.6 : this.SPEED;
      this.px = Math.min(this.X_MAX, Math.max(this.X_MIN, this.px + dx * sp * dt));
      this.walkT += dt * 2.2;
      const f = Math.floor(this.walkT * 4) % 4;
      if (f !== this.animFrame) {
        this.animFrame = f;
        if (this.poseT <= 0) park.redrawPlayer('down', 0.2 + f * 0.25, true);
      }
    }
    park.player.position.x = this.px;
    park.shadow.position.x = this.px;

    /* 24-1b：傾身（撲）＋小跳 */
    const targetLean = this.dive ? -this.dive.dir * 0.55 : 0;
    this.lean += (targetLean - this.lean) * Math.min(1, dt * 12);
    park.player.rotation.z = this.lean;
    const diveK = this.dive ? Math.sin(Math.PI * (1 - this.dive.t / 0.45)) : 0;
    park.player.position.y = 1.5 + diveK * 0.35;

    /* 出圈（難度漸進；24-1d：5s 後 25% 炸彈） */
    const prog = 1 - this.timeLeft / this.DURATION;
    const interval = 1.0 - prog * 0.45;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.donuts.length < 8) {
      this.spawnTimer = interval;
      this._spawn(THREE, this.timeLeft < this.DURATION - 5 && Math.random() < 0.25);
    }

    /* 甜甜圈落下／接住／漏掉（24-1b：撲擴大接取盒；24-1d：炸彈罰） */
    const inDive = !!this.dive;
    const rx = inDive ? 3.0 : 1.7, yLo = inDive ? 0.4 : 0.6, yHi = inDive ? 3.4 : 1.9, rz = inDive ? 2.6 : 2;
    for (let i = this.donuts.length - 1; i >= 0; i--) {
      const d = this.donuts[i];
      d.vy += 6 * dt;
      d.mesh.position.y -= d.vy * dt;
      d.mesh.rotation.z += d.spin * dt;
      const dy = d.mesh.position.y;
      if (dy < yHi && dy > yLo && Math.abs(d.mesh.position.x - this.px) < rx && Math.abs(d.mesh.position.z - this.Z) < rz) {
        park.scene.remove(d.mesh);
        this.donuts.splice(i, 1);
        if (d.kind === 'bomb') {
          /* 24-1d：接到炸彈！ */
          this.score = Math.max(0, this.score - 2);
          this.flash = { t: 1.4, text: '🧨 接錯了! -2★' };
          this._explode(d.mesh.position);
          sfx('boom');
        } else {
          this.score++;
          park.addStar(1);
          this._catchPose();
          sfx('coin');
        }
      } else if (dy <= 0.2) {
        /* 漏掉（漏過炸彈沒關係） */
        park.scene.remove(d.mesh);
        this.donuts.splice(i, 1);
        if (d.kind === 'donut') sfx('buzz');
      }
    }

    /* 24-1d：爆炸視覺 */
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t -= dt;
      f.mesh.scale.multiplyScalar(1 + dt * 6);
      f.mesh.material.opacity = Math.max(0, f.t / 0.45) * 0.9;
      if (f.t <= 0) { park.scene.remove(f.mesh); this.fx.splice(i, 1); }
    }
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }

    /* 24-1a：接住 pose（雙手舉頭頂，~15fps 重繪） */
    if (this.poseT > 0) {
      this.poseT -= dt;
      this.poseAge += dt;
      if (this.poseAge - this.poseLast > 0.07) {
        this.poseLast = this.poseAge;
        park.redrawAll(0.5, this.walking, { id: 'catch', t: this.poseAge });
      }
      if (this.poseT <= 0) park.redrawAll(0.5, false);
    }

    this._setPrompt();
  },

  _finish() {
    const park = this.park;
    this.active = false;
    /* 清甜甜圈＋爆炸視覺 */
    for (const d of this.donuts) park.scene.remove(d.mesh);
    this.donuts = [];
    for (const f of this.fx) park.scene.remove(f.mesh);
    this.fx = [];
    /* 結算提示 3 秒（headless 慢渲染會更久，無妨） */
    park.ride = {
      update: (dt) => {
        park.ride._t = (park.ride._t || 3) - dt;
        if (park.ride._t <= 0) {
          ParkCatch._cleanup(true);
        }
      },
      abort: () => ParkCatch._cleanup(false),
      action: () => {},
    };
    $('#park-prompt').textContent = `🍩 時間到！本次接了 ${this.score} 個甜甜圈`;
    $('#park-prompt').classList.remove('hidden');
    sfx('ding');
  },

  abort() {
    if (!this.active) return;
    this._cleanup(false);
  },

  _cleanup(awarded) {
    const park = this.park;
    for (const d of this.donuts) park.scene.remove(d.mesh);
    this.donuts = [];
    for (const f of this.fx) park.scene.remove(f.mesh);
    this.fx = [];
    this.dive = null;
    this.poseT = 0;
    this.lean = 0;
    park.player.rotation.z = 0;
    this.active = false;
    /* 玩家回站點 */
    park.player.visible = true;
    park.shadow.visible = true;
    park.player.position.set(0, 1.5, this.Z);
    park.player.rotation.y = 0;
    park.shadow.position.set(0, 0.03, this.Z);
    park.facing = 'down';
    park.redrawAll(0.5, false);
    park.camera.position.set(0, 19, 34);
    park.camera.lookAt(0, 4, -5);
    park.ride = null;
    park.nearStation = null;
    park.hidePrompt();
    $('#park-action').classList.remove('near');
    if (awarded) park.awardStars('catch', this.score);
  },
};

window.ParkCatch = ParkCatch;
