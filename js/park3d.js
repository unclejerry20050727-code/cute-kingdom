/* ════════════════════════════════════════════════════════════════
   第十八輪18d：3D 遊樂園基礎（Three.js r128）
   - enter()/exit()：進出公園（全屏覆蓋層 #screen-park3d）
   - 環境：天空霧、草地、廣場、裝飾摩天輪（轉動）、雲霄飛車軌道、樹、氣球
   - 玩家：既有 drawCharacter 畫 4 方向 canvas → 3D 平面（固定相機，永遠面向相機換姿）
   - 三個站點：雲霄飛車 / 甜甜圈接接樂 / 摩天輪（18e~18g 實作遊玩）
   - 控制：WASD/方向鍵（Game.keys）＋觸控 dpad（Game.dpadDir）；Space/E/⚡ = action()
   ════════════════════════════════════════════════════════════════ */
'use strict';

const Park3D = {
  inited: false,
  running: false,
  t: 0,
  stars: 0,
  ride: null,          // 目前進行中的小遊戲模組（{ start, abort, action, update }）
  nearStation: null,
  wheelAngle: 0,
  wheelSpeed: 0.25, /* 18g：遊玩時加速 */

  /* ── 進入 ── */
  async enter() {
    if (!window.THREE) await loadScript('lib/three.min.js');
    if (!window.THREE) throw new Error('THREE 載入失敗');
    $('#screen-park3d').classList.remove('hidden');
    if (!this.inited) this.init();
    this.size();
    this.running = true;
    /* 18h：本次遊玩星星歸零、best 連結到存檔 */
    this.stars = 0;
    this.best = Game.park.best;
    this.resetPlayer();
    this.syncHUD();
  },

  /* ── 離開（回地圖，玩家站回入口附近） ── */
  exit() {
    if (!this.running) return;
    if (this.ride && this.ride.abort) this.ride.abort();
    this.ride = null;
    this.running = false;
    this.nearStation = null;
    this.hidePrompt();
    $('#park-action').classList.remove('near');
    Game.keys.clear();
    Game.dpadDir = null;
    $('#screen-park3d').classList.add('hidden');
    if (Game.mapP) {
      Game.mapP.x = 490; Game.mapP.y = 330;
      Game.mapP.facing = 'down'; Game.mapP.walking = false;
    }
    /* 18h：本次星星累計進生涯＋存檔 */
    Game.park.stars += this.stars;
    saveGame(fullSave(Game.stage));
    if (this.stars > 0) showToast(`🌟 本次遊樂園共 ${this.stars} 顆星星`);
    sfx('pop');
    setSub('map');
  },

  /* ── 動作鍵（Space/E/⚡）：站點附近→上車；遊戲中→交給遊戲 ── */
  action() {
    if (!this.running) return;
    if (this.ride && this.ride.action) { this.ride.action(); return; }
    if (this.nearStation) {
      const st = this.nearStation;
      const R = { coaster: window.ParkCoaster, catch: window.ParkCatch, wheel: window.ParkWheel }[st.kind];
      if (R && R.start) {
        sfx('pop');
        this.ride = R;
        this.hidePrompt();
        R.start(this);
      } else {
        showToast('🚧 這座設施還在建造中～換一座試試！');
      }
    }
  },

  addStar(n) {
    this.stars += n;
    $('#park-star').textContent = `🌟 ${this.stars}`;
    sfx('blip');
  },

  /* 18h：獎勵結算（1★=2🪙，直接加 Game.money＋存檔 best） */
  awardStars(kind, n) {
    const best = (this.best = this.best || {});
    best[kind] = Math.max(best[kind] || 0, n);
    if (n > 0) {
      const coins = n * 2;
      Game.money += coins;
      const el = document.getElementById('hud-money-val');
      if (el) el.textContent = Game.money;
      showToast(`收到 ${n} 顆🌟，換成 🪙+${coins}！`);
      sfx('coin');
    }
  },

  resetPlayer() {
    this.player.position.set(0, 1.5, 6); /* 18d-fix：平面高 3，中心 y=1.5 才站在地面 */
    this.player.rotation.y = 0;
    this.shadow.position.set(0, 0.03, 6);
    this.facing = 'down';
    this.walkT = 0;
    this.animFlip = 0;
    this.redrawAll(0.5, false);
  },

  /* ══════════ 初始化（一次） ══════════ */
  init() {
    const THREE = window.THREE;
    const canvas = $('#park-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fd8ef);
    this.scene.fog = new THREE.Fog(0x9fd8ef, 60, 150);
    this.camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 300);
    this.camera.position.set(0, 19, 34);
    this.camera.lookAt(0, 4, -5);

    /* 燈（20a：留參考；20c 地底暗模式調強度） */
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8fc47e, 0.95);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 0.75);
    this.sun.position.set(25, 40, 18);
    this.scene.add(this.sun);
    /* 20c：地底暗模式（白天/洞穴色 + 過渡係數） */
    this.C_DAY = new THREE.Color(0x9fd8ef);
    this.C_NIGHT = new THREE.Color(0x1a1410);
    this.darkK = 0;
    this.underground = false;

    /* 地面＋廣場 */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshLambertMaterial({ color: 0x8fc47e, side: THREE.DoubleSide }) /* 20a：地底看得到草地下面 */
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(13, 40),
      new THREE.MeshLambertMaterial({ color: 0xf7e7c8 })
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.01, 4);
    this.scene.add(plaza);

    /* ── 裝飾摩天輪（左後；18d-fix：降高+後移避免出畫面頂端） ── */
    this.ferris = this.buildFerrisWheel(THREE);
    this.scene.add(this.ferris.base);

    /* ── 裝飾雲霄飛車軌道（右後） ── */
    this.buildCoasterTrack(THREE);

    /* ── 樹 ── */
    for (const [tx, tz, s] of [[-26, 6, 1.2], [-18, 8, 1.0], [28, -14, 1.4], [-27, -16, 1.1], [12, 15, 0.9], [-6, -16, 1.3]]) {
      this.scene.add(this.buildTree(THREE, tx, tz, s));
    }

    /* ── 氣球 ── */
    this.balloons = [];
    for (const [bx, bz, col] of [[3, 13, 0xff8fb2], [5.5, 11.5, 0x7ec8e3], [-2, 14, 0xf7c948]]) {
      const b = this.buildBalloon(THREE, bx, bz, col);
      this.balloons.push(b);
      this.scene.add(b.group);
    }

    /* ── 三個站點 ── */
    this.stations = [
      { kind: 'coaster', label: '雲霄飛車', emoji: '🎢', pos: new THREE.Vector3(5, 0, 6) },
      { kind: 'catch', label: '甜甜圈接接樂', emoji: '🍩', pos: new THREE.Vector3(0, 0, -6) }, /* 18f：搬到廣場上（接圈舞台） */
      { kind: 'wheel', label: '摩天輪', emoji: '🎡', pos: new THREE.Vector3(-16, 0, -2) },
    ];
    for (const st of this.stations) this.scene.add(this.buildStation(THREE, st));

    /* ── 玩家（4 方向 canvas billboard） ── */
    this.playerCanvases = {};
    this.playerTex = {};
    for (const d of ['down', 'up', 'left', 'right']) {
      const cv = document.createElement('canvas');
      cv.width = 160; cv.height = 200;
      this.playerCanvases[d] = cv;
      this.playerTex[d] = new THREE.CanvasTexture(cv);
    }
    this.facing = 'down';
    this.player = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 3.0),
      new THREE.MeshBasicMaterial({ map: this.playerTex.down, transparent: true, side: THREE.DoubleSide })
    );
    this.player.position.set(0, 1.5, 6);
    this.scene.add(this.player);
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(0, 0.03, 6);
    this.scene.add(this.shadow);
    this.redrawAll(0.5, false);

    /* ── HUD 按鈕 ── */
    $('#park-exit').onclick = () => this.exit();
    $('#park-action').addEventListener('pointerdown', (e) => { e.preventDefault(); this.action(); });

    window.addEventListener('resize', () => { if (this.inited) this.size(); });
    this.inited = true;
    this.resetPlayer();
  },

  size() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  },

  /* ══════════ 環境物件 ══════════ */
  buildFerrisWheel(THREE) {
    const base = new THREE.Group();
    base.position.set(-20, 0, -14);
    const legMat = new THREE.MeshLambertMaterial({ color: 0xb98a5f });
    const legLen = 9.3;
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, legLen, 8), legMat);
      leg.position.set(side * 1.5, 4.6, 0);
      leg.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-side * 3, 8.8, 0).normalize()
      );
      base.add(leg);
    }
    base.add(this.mkMesh(THREE, new THREE.SphereGeometry(0.8, 12, 10), 0xfff8ec, [0, 9, 0]));
    const wheel = new THREE.Group();
    wheel.position.set(0, 9, 0);
    wheel.add(this.mkMesh(THREE, new THREE.TorusGeometry(7.5, 0.4, 10, 40), 0xe2574c));
    wheel.add(this.mkMesh(THREE, new THREE.TorusGeometry(6.8, 0.15, 8, 36), 0xf7c948));
    const spokeMat = new THREE.MeshLambertMaterial({ color: 0xfff8ec });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7.5, 6), spokeMat);
      sp.position.set(Math.cos(a) * 3.75, Math.sin(a) * 3.75, 0);
      sp.rotation.z = a - Math.PI / 2;
      wheel.add(sp);
    }
    const gondolaCols = [0xff9ec4, 0x7fc8f8, 0xb6e388, 0xf7c948, 0xc9a6f0, 0xffb27a];
    const gondolas = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      const pivot = new THREE.Group();
      pivot.rotation.z = a;
      const g = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 1.3),
        new THREE.MeshLambertMaterial({ color: gondolaCols[i] }));
      g.position.set(7.5, -0.85, 0);
      pivot.add(g);
      wheel.add(pivot);
      gondolas.push({ mesh: g, angle: a });
    }
    base.add(wheel);
    /* 頂端小旗 */
    base.add(this.mkMesh(THREE, new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), 0xb98a5f, [0, 17.4, 0]));
    base.add(this.mkMesh(THREE, new THREE.ConeGeometry(0.5, 0.9, 4), 0xe2574c, [0.45, 17.6, 0]));
    return { base, wheel, gondolas };
  },

  buildCoasterTrack(THREE) {
    /* 20a 新路線（~221u，19a 113u 的 2 倍）：站點旁起步→爬坡(峰 y10.8)→大俯衝#1→迴環1→平→迴環2
       →鑽地底(隧道底 y-4.5)→陡坡衝出地面(EMERGE)→俯衝#2→迴環3→踏板丘→迴環4→山丘×2→回站點
       4×360° 垂直迴環（每 30° 取 12 點）；幾何與 test/.route20.mjs 同源 */
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    /* 360° 垂直迴環：plane 'yz'=x 固定(圈在 y-z) / 'xy'=z 固定(圈在 y-x)；side=前半圈往哪側(=行進方向) */
    const loop = (cx, cz, y0, R, plane, side) => {
      const pts = [];
      for (let a = 1; a <= 12; a++) {
        const th = a * (Math.PI / 6);
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
      v(25, 0.8, -6.5),
      v(25, 0.8, -9),           /* L1 底 */
      ...loop(25, -9, 0.8, 2.8, 'yz', -1),    /* 迴環1（far wall -z） */
      v(25, 0.9, -13),
      v(19, 0.9, -14.5),
      v(16.5, 0.9, -14.5),
      v(14, 0.8, -14.5),        /* L2 底 */
      ...loop(14, -14.5, 0.8, 2.8, 'xy', -1),/* 迴環2（far wall -x） */
      v(9.5, 0.9, -14),
      v(7.5, -1.5, -13),        /* 鑽入地底 */
      v(4.5, -3.8, -11),        /* 地底 */
      v(1.0, -4.5, -9),         /* 隧道底 */
      v(-2.5, -3.8, -6.5),      /* 地底 */
      v(-4.5, -1.5, -4),        /* 隧道口 */
      v(-5.5, 2.6, -2),         /* 陡坡衝出地面（EMERGE） */
      v(-7, 0.9, 0),            /* 俯衝#2 底 */
      v(-10, 0.9, 1.5),
      v(-10, 0.8, 2),           /* L3 底 */
      ...loop(-10, 2, 0.8, 2.8, 'yz', 1),     /* 迴環3（far wall +z） */
      v(-10, 1.0, 6.5),
      v(-6, 1.6, 8.5),          /* 踏板丘 */
      v(-2, 0.8, 9),
      v(0, 0.9, 9),
      v(2, 0.8, 9),             /* L4 底 */
      ...loop(2, 9, 0.8, 2.5, 'xy', 1),       /* 迴環4（far wall +x） */
      v(6.5, 1.2, 10.5),
      v(8, 4.2, 12.5),          /* 山丘1 */
      v(10, 0.9, 14.5),         /* 低谷 */
      v(5, 5.5, 15.5),          /* 山丘2 */
      v(2, 3.0, 14.5),
      v(4.5, 1.0, 12.5),        /* 返程：從 L4 環東側繞過（不切 L4 進環線） */
      v(7.5, 0.7, 9),
      v(7, 0.7, 5.5),
      v(3, 0.8, 4.5),           /* 回到站點旁 */
    ];
    const curve = new THREE.CatmullRomCurve3(cp, false, 'catmullrom', 0.5);
    this.coasterCurve = curve; /* 18e 雲霄飛車遊玩用 */
    this.scene.add(this.mkMesh(THREE, new THREE.TubeGeometry(curve, 400, 0.3, 8, false), 0xe2574c));
    /* 20b/20c 量測：迴環 t 範圍（多迴環 up vector）＋隧道 t 範圍（暗模式/出口閃白） */
    const N = 1200, pts = [];
    for (let i = 0; i <= N; i++) pts.push(curve.getPointAt(i / N));
    const LOOPS_DEF = [
      { cx: 25, cz: -9, y0: 0.8, R: 2.8, plane: 'yz' },
      { cx: 14, cz: -14.5, y0: 0.8, R: 2.8, plane: 'xy' },
      { cx: -10, cz: 2, y0: 0.8, R: 2.8, plane: 'yz' },
      { cx: 2, cz: 9, y0: 0.8, R: 2.5, plane: 'xy' },
    ];
    this.coasterLoops = LOOPS_DEF.map((lp) => {
      const cy = lp.y0 + lp.R;
      let t0 = 1, t1 = 0;
      for (let i = 0; i <= N; i++) {
        const p = pts[i], t = i / N;
        const inPlane = lp.plane === 'yz' ? Math.abs(p.x - lp.cx) < 0.9 : Math.abs(p.z - lp.cz) < 0.9;
        const a = lp.plane === 'yz' ? p.z - lp.cz : p.x - lp.cx;
        if (inPlane && Math.hypot(p.y - cy, a) < lp.R + 0.45) { if (t < t0) t0 = t; if (t > t1) t1 = t; }
      }
      return { t0, t1, cx: lp.cx, cy, cz: lp.cz };
    });
    let entryT = null, exitT = null;
    for (let i = 1; i <= N; i++) {
      const a = pts[i - 1], b = pts[i];
      if (a.y >= 0 && b.y < 0 && entryT === null) entryT = i / N;
      if (a.y < 0 && b.y >= 0 && exitT === null) exitT = i / N;
    }
    this.tunnelT = { enter: entryT, exit: exitT };
    /* 支柱（20a：221u 長線用 52 根；地底 y<0 自動跳過） */
    const postMat = new THREE.MeshLambertMaterial({ color: 0xc9a27c });
    for (let i = 1; i <= 51; i++) {
      const p = curve.getPointAt(i / 52);
      if (p.y < 0.6) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, p.y, 6), postMat);
      post.position.set(p.x, p.y / 2, p.z);
      this.scene.add(post);
    }
    /* 20a：隧道口拱環×2（y=0 交叉點，朝向切線） */
    for (const tArch of [entryT, exitT]) {
      if (tArch === null) continue;
      const p = curve.getPointAt(tArch);
      const tan = curve.getTangentAt(Math.min(tArch, 0.999));
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 8, 24),
        new THREE.MeshLambertMaterial({ color: 0xf7c948 }));
      arch.position.copy(p);
      arch.lookAt(p.clone().add(tan));
      this.scene.add(arch);
    }
    /* 20a：地底燈×19（暖橘自發光；basic material 不受暗模式影響） */
    if (entryT !== null && exitT !== null) {
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xffa544 });
      for (let i = 0; i < 19; i++) {
        const t = entryT + ((i + 0.5) / 19) * (exitT - entryT);
        const p = curve.getPointAt(t);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lampMat);
        lamp.position.set(p.x, Math.min(p.y + 1.15, -0.25), p.z);
        this.scene.add(lamp);
      }
    }
    /* 靜止小列車（2 節；18e 遊玩時隱藏；19a 搬到站點旁平段） */
    this.parkedTrain = [];
    const p1 = curve.getPointAt(0.02), p2 = curve.getPointAt(0.045);
    for (let i = 0; i < 2; i++) {
      const car = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 1.5),
        new THREE.MeshLambertMaterial({ color: i === 0 ? 0x7fc8f8 : 0xf7c948 }));
      car.position.copy(p1).addScaledVector(p2.clone().sub(p1).normalize(), -i * 1.7);
      car.lookAt(p2);
      this.scene.add(car);
      this.parkedTrain.push(car);
    }
  },

  buildTree(THREE, x, z, s) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const trunk = this.mkMesh(THREE, new THREE.CylinderGeometry(0.35 * s, 0.5 * s, 1.8 * s, 8), 0xb98a5f, [0, 0.9 * s, 0]);
    const leaf1 = this.mkMesh(THREE, new THREE.SphereGeometry(1.7 * s, 10, 8), 0x7fb86b, [0, 2.6 * s, 0]);
    const leaf2 = this.mkMesh(THREE, new THREE.SphereGeometry(1.2 * s, 10, 8), 0x8fc47e, [0.9 * s, 3.2 * s, 0]);
    g.add(trunk, leaf1, leaf2);
    return g;
  },

  buildBalloon(THREE, x, z, color) {
    const g = new THREE.Group();
    const body = this.mkMesh(THREE, new THREE.SphereGeometry(0.55, 10, 8), color, [x, 3.4, z]);
    const str = this.mkMesh(THREE, new THREE.CylinderGeometry(0.02, 0.02, 3.2, 4), 0x8a6e52, [x, 1.7, z]);
    g.add(body, str);
    return { group: g, body, baseY: 3.4, phase: x };
  },

  buildStation(THREE, st) {
    const g = new THREE.Group();
    g.position.set(st.pos.x, 0, st.pos.z);
    const pad = this.mkMesh(THREE, new THREE.CircleGeometry(2.8, 26), 0xf3ddb8, [0, 0.02, 0]);
    pad.rotation.x = -Math.PI / 2;
    g.add(pad);
    g.add(this.mkMesh(THREE, new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8), 0x7a5236, [0, 1.2, 0]));
    const tex = this.makeSignTexture(st.emoji + ' ' + st.label);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    sign.position.set(0, 3.3, 0);
    g.add(sign);
    return g;
  },

  mkMesh(THREE, geo, color, pos) {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    return m;
  },

  /* 站點招牌（canvas 文字，RHR 圓體） */
  makeSignTexture(text) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 156;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#FFF8EC';
    c2.strokeStyle = '#7A5236';
    c2.lineWidth = 10;
    const r = 34, w = 512, h = 156;
    c2.beginPath();
    if (c2.roundRect) c2.roundRect(8, 8, w - 16, h - 16, r);
    else c2.rect(8, 8, w - 16, h - 16);
    c2.fill(); c2.stroke();
    c2.fillStyle = '#E2574C';
    c2.font = '900 62px RHR, "PingFang TC", sans-serif';
    c2.textAlign = 'center';
    c2.textBaseline = 'middle';
    c2.fillText(text, w / 2, h / 2 + 6);
    const tex = new window.THREE.CanvasTexture(cv);
    return tex;
  },

  /* ══════════ 玩家素材（drawCharacter → 4 方向） ══════════ */
  redrawPlayer(dir, t, walking) {
    const cv = this.playerCanvases[dir];
    const c2 = cv.getContext('2d');
    c2.clearRect(0, 0, 160, 200);
    drawCharacter(c2, Game.playerCfg, {
      x: 80, y: 188, facing: dir, t, walking, scale: 1.6,
    });
    this.playerTex[dir].needsUpdate = true;
  },
  redrawAll(t, walking) {
    for (const d of ['down', 'up', 'left', 'right']) this.redrawPlayer(d, t, walking);
  },

  /* ══════════ 每幀 ══════════ */
  update(dt) {
    if (!this.running) return;
    this.t += dt;

    /* 摩天輪轉動（座艙反向保持直立） */
    if (this.ferris) {
      this.wheelAngle += dt * this.wheelSpeed; /* 18g：遊玩時可調 speed */
      this.ferris.wheel.rotation.z = this.wheelAngle;
      for (const g of this.ferris.gondolas) {
        g.mesh.rotation.z = -(this.wheelAngle + g.angle);
      }
    }
    /* 氣球上下浮 */
    for (const b of this.balloons) {
      b.body.position.y = b.baseY + Math.sin(this.t * 1.2 + b.phase) * 0.25;
    }

    /* 遊戲進行中交給遊戲更新；否則玩家移動 */
    if (this.ride && this.ride.update) {
      this.ride.update(dt);
    } else {
      this.movePlayer(dt);
    }

    /* 20c：地底暗模式（車在地底→天空漸暗成洞穴；出洞漸亮回白天） */
    const dkTarget = this.underground ? 1 : 0;
    this.darkK += (dkTarget - this.darkK) * (1 - Math.exp(-3 * dt));
    if (this.darkK > 0.003) {
      this.scene.background.copy(this.C_DAY).lerp(this.C_NIGHT, this.darkK);
      this.scene.fog.color.copy(this.scene.background);
      this.hemi.intensity = 0.95 * (1 - 0.78 * this.darkK);
      this.sun.intensity = 0.75 * (1 - 0.93 * this.darkK);
    } else if (this.darkK !== 0) {
      this.darkK = 0;
      this.scene.background.copy(this.C_DAY);
      this.scene.fog.color.copy(this.C_DAY);
      this.hemi.intensity = 0.95;
      this.sun.intensity = 0.75;
    }

    this.renderer.render(this.scene, this.camera);
  },

  movePlayer(dt) {
    const k = Game.keys;
    let dx = 0, dz = 0;
    if (k.has('up')) dz -= 1;
    if (k.has('down')) dz += 1;
    if (k.has('left')) dx -= 1;
    if (k.has('right')) dx += 1;
    if (Game.dpadDir) { dx += Game.dpadDir[0]; dz += Game.dpadDir[1]; }
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len; dz /= len;
      const sp = 9 * dt;
      this.player.position.x = clamp(this.player.position.x + dx * sp, -27, 27);
      this.player.position.z = clamp(this.player.position.z + dz * sp, -18, 23);
      this.shadow.position.x = this.player.position.x;
      this.shadow.position.z = this.player.position.z;
      /* 面向（固定相機→平面永遠朝相機，只換姿） */
      let f;
      if (Math.abs(dx) > Math.abs(dz)) f = dx > 0 ? 'right' : 'left';
      else f = dz > 0 ? 'down' : 'up';
      if (f !== this.facing) { this.facing = f; this.player.material.map = this.playerTex[f]; }
      /* 走路動畫（4 幀循環） */
      this.walkT += dt * 2.2;
      const q = Math.floor(this.walkT * 4) % 4;
      if (q !== this.animFlip) {
        this.animFlip = q;
        this.redrawAll([0.25, 0.5, 0.75, 0.5][q], true);
      }
    } else if (this.animFlip !== -1) {
      this.animFlip = -1;
      this.redrawAll(0.5, false);
    }

    /* 站點接近 → 提示 */
    let best = null, bestD = 4.5;
    for (const st of this.stations) {
      const d = Math.hypot(this.player.position.x - st.pos.x, this.player.position.z - st.pos.z);
      if (d < bestD) { bestD = d; best = st; }
    }
    if (best !== this.nearStation) {
      this.nearStation = best;
      if (best) {
        const el = $('#park-prompt');
        el.textContent = `${best.emoji} ${best.label} — 按 Space 或點 ⚡ 上車`;
        el.classList.remove('hidden');
        $('#park-action').classList.add('near');
      } else {
        this.hidePrompt();
        $('#park-action').classList.remove('near');
      }
    }
  },

  hidePrompt() {
    $('#park-prompt').classList.add('hidden');
  },

  syncHUD() {
    $('#park-star').textContent = `🌟 ${this.stars}`;
  },
};

window.Park3D = Park3D;
