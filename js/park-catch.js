/* ════════════════════════════════════════════════════════════════
   第十八輪18f：甜甜圈接接樂（ParkCatch）
   - 30 秒接住從天上掉下來的甜甜圈（torus）
   - 左/右移動（A/D/方向鍵/dpad）；接一顆 +1 星（Park3D.addStar）
   - 難度漸進：出圈間隔 1.0s → 0.55s
   - 固定全景相機（站在氣球站點前接）
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

  action() { /* 接接樂不需要動作鈕 */ },

  _setPrompt() {
    $('#park-prompt').textContent =
      `⏰ ${Math.max(0, Math.ceil(this.timeLeft))}s ｜ 🍩 分數：${this.score}（A/D 移動接甜甜圈）`;
    $('#park-prompt').classList.remove('hidden');
  },

  _spawn(THREE) {
    const m = new THREE.Group();
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
    m.position.set(
      this.X_MIN + 1 + Math.random() * (this.X_MAX - this.X_MIN - 2),
      12,
      this.Z + (Math.random() * 3 - 1.5)
    );
    m.rotation.z = Math.random() * Math.PI;
    this.park.scene.add(m);
    this.donuts.push({ mesh: m, vy: 2 + Math.random() * 2, spin: (Math.random() - 0.5) * 3 });
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
    this.walking = dx !== 0;
    if (this.walking) {
      this.px = Math.min(this.X_MAX, Math.max(this.X_MIN, this.px + dx * this.SPEED * dt));
      this.walkT += dt * 2.2;
      const f = Math.floor(this.walkT * 4) % 4;
      if (f !== this.animFrame) {
        this.animFrame = f;
        park.redrawPlayer('down', 0.2 + f * 0.25, true);
      }
    }
    park.player.position.x = this.px;
    park.shadow.position.x = this.px;

    /* 出圈（難度漸進） */
    const prog = 1 - this.timeLeft / this.DURATION;
    const interval = 1.0 - prog * 0.45;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.donuts.length < 8) {
      this.spawnTimer = interval;
      this._spawn(THREE);
    }

    /* 甜甜圈落下／接住／漏掉 */
    for (let i = this.donuts.length - 1; i >= 0; i--) {
      const d = this.donuts[i];
      d.vy += 6 * dt;
      d.mesh.position.y -= d.vy * dt;
      d.mesh.rotation.z += d.spin * dt;
      const dy = d.mesh.position.y;
      if (dy < 1.9 && dy > 0.6 && Math.abs(d.mesh.position.x - this.px) < 1.7 && Math.abs(d.mesh.position.z - this.Z) < 2) {
        /* 接到！ */
        park.scene.remove(d.mesh);
        this.donuts.splice(i, 1);
        this.score++;
        park.addStar(1);
      } else if (dy <= 0.2) {
        /* 漏掉 */
        park.scene.remove(d.mesh);
        this.donuts.splice(i, 1);
        sfx('buzz');
      }
    }

    this._setPrompt();
  },

  _finish() {
    const park = this.park;
    this.active = false;
    /* 清甜甜圈 */
    for (const d of this.donuts) park.scene.remove(d.mesh);
    this.donuts = [];
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
