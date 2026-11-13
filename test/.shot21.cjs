/* 21-8 截圖：實時騎行（auto-pedal hook）＋輪詢時機截圖（坐姿/彎道傾斜）＋結束後靜態（720/環坡錯開） */
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: "/home/obot/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome", args: ["--no-sandbox"] });
  const p = await (await b.newContext()).newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
  await p.goto("file:///home/obot/Projects/20261023-3rd-game/index.html");
  await p.evaluate(async () => {
    Game.playerCfg = defaultConfig("female");
    beginGame({ cfg: Game.playerCfg, furniture: [], stage: "done" }, true);
    setSub("map");
    enterPark();
    for (let i = 0; i < 300 && !Park3D.running; i++) await new Promise((r) => setTimeout(r, 100));
    Park3D.player.position.set(5, 1.5, 6);
    Park3D.nearStation = { kind: "coaster" };
    Park3D.action();
    /* auto-pedal hook（實時） */
    const orig = Park3D.update.bind(Park3D);
    Park3D.update = (dt) => {
      const P = ParkCoaster;
      if (P.active && !P.finished && P.v < 9.5 && !P.stopped) P.action();
      orig(dt);
    };
  });
  const st = () => p.evaluate(() => {
    const P = ParkCoaster;
    return { active: P.active, t: +P.t.toFixed(3), v: +P.v.toFixed(1), bank: +P.bank.toFixed(2), stars: P.collected };
  });
  /* 1) 坐姿面朝前（L1/L2 之間平段 t≈0.30-0.335，跟車視角看背影） */
  let s;
  for (let i = 0; i < 600; i++) {
    s = await st();
    if (s.active && s.t >= 0.30 && s.t <= 0.335) break;
    if (!s.active) break;
    await sleep(25);
  }
  console.log("seat shot:", JSON.stringify(s));
  await p.screenshot({ path: "/tmp/r21-01-seat.png" });
  /* 2) 彎道傾斜（|bank|>0.35 rad≈20°） */
  for (let i = 0; i < 1000; i++) {
    s = await st();
    if (s.active && Math.abs(s.bank) > 0.35) break;
    if (!s.active) break;
    await sleep(25);
  }
  console.log("bank shot:", JSON.stringify(s));
  await p.screenshot({ path: "/tmp/r21-02-bank.png" });
  /* 3) 等完賽＋cleanup */
  for (let i = 0; i < 600; i++) {
    s = await st();
    if (!s.active) break;
    await sleep(100);
  }
  console.log("after ride:", JSON.stringify(s));
  /* 4) 靜態：720 雙環（L3+L4，西南側視） */
  await p.evaluate(() => {
    const sl = document.getElementById("park-speedlines");
    if (sl) sl.classList.remove("on");
    const sf = document.getElementById("park-sunflash");
    if (sf) sf.style.opacity = "0";
    const cam = Park3D.camera;
    cam.up.set(0, 1, 0);
    cam.position.set(-20, 6, -5);
    cam.lookAt(-6.5, 3.2, 4.5);
  });
  await sleep(500);
  await p.screenshot({ path: "/tmp/r21-03-720.png" });
  /* 5) 靜態：L1 環＋進出坡錯開（沿 x 軸側視） */
  await p.evaluate(() => {
    const cam = Park3D.camera;
    cam.position.set(11.5, 4.2, -9);
    cam.lookAt(24.5, 3.6, -9.2);
  });
  await sleep(500);
  await p.screenshot({ path: "/tmp/r21-04-loop.png" });
  console.log("PAGEERRORS(" + errs.length + "):", errs.slice(0, 3).join(" | "));
  await b.close();
})();
