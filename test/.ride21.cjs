/* 21-7 騎行 QA：凍結 RAF 後手動 drive Park3D.update(dt=0.05)；auto-pedal v<9.5；
   量測：星/maxV/minY/underTime/maxDarkK/flash/scream/loops/lookBack/faceForward/bank */
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/home/obot/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome", args: ["--no-sandbox"] });
  const p = await (await b.newContext()).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
  await p.goto("file:///home/obot/Projects/20261023-3rd-game/index.html");
  const r = await p.evaluate(async () => {
    Game.playerCfg = defaultConfig("female");
    beginGame({ cfg: Game.playerCfg, furniture: [], stage: "done" }, true);
    setSub("map");
    enterPark();
    for (let i = 0; i < 300 && !Park3D.running; i++) await new Promise((r) => setTimeout(r, 100));
    if (!Park3D.running) return { err: "not running" };
    /* 到站點上車（walk 到 station 再 action） */
    Park3D.player.position.set(5, 1.5, 6);
    Park3D.redrawAll(0.1, false);
    Park3D.nearStation = { kind: "coaster" }; /* 走真實上車流程 */
    Park3D.action();
    /* 凍結主迴圈＋關渲染（純量測，免 SwiftShader 慢幀） */
    window.requestAnimationFrame = () => 1;
    Park3D.renderer.render = () => {};
    const dt = 0.05;
    const P = ParkCoaster, curve = Park3D.coasterCurve;
    let maxV = 0, minY = 99, underTime = 0, maxDarkK = 0, scream = 0, steps = 0, lbCount = 0, lastLB = false;
    let ffNum = 0, ffDen = 0, maxBank = 0, minT = 0, lbEndT = -9;
    const sfxReal = window.sfx;
    window.sfx = (n) => { if (n === "scream") scream++; sfxReal(n); };
    while (P.active && !P.finished && steps < 4000) {
      if (P.v < 9.5 && !P.stopped) P.action();
      Park3D.update(dt);
      const u = Math.min(P.t, 1), pt = curve.getPointAt(u), tan = curve.getTangentAt(Math.min(u, 0.999));
      maxV = Math.max(maxV, P.v); minY = Math.min(minY, pt.y); minT = Math.min(minT, P.t);
      maxDarkK = Math.max(maxDarkK, Park3D.darkK || 0);
      if (pt.y < -0.15) underTime += dt;
      if (P.lookBackT > 0 && !lastLB) { lbCount++; lastLB = true; }
      if (P.lookBackT <= 0 && lastLB) lbEndT = Park3D.t;
      lastLB = P.lookBackT > 0;
      maxBank = Math.max(maxBank, Math.abs(P.bank));
      if (P.lookBackT <= 0 && Park3D.t - lbEndT > 0.5 && u < 0.995) {
        ffDen++;
        const uA = Math.min(u + 1.2 / curve.getLength(), 0.999);
        const pa = curve.getPointAt(uA);
        const eyaw = Math.atan2(pa.x - pt.x, pa.z - pt.z);
        const d = Math.abs(Math.atan2(
          Math.sin(P.rideBill.rotation.y - eyaw),
          Math.cos(P.rideBill.rotation.y - eyaw)));
        if (d < 0.6) ffNum++;
      }
      steps++;
    }
    for (let i = 0; i < 90 && P.active; i++) Park3D.update(dt);
    const loopsDone = (Park3D.coasterLoops || []).map((L) => P.prevT >= L.t1);
    return {
      finish: P.t >= 1, t: +P.t.toFixed(3), sec: +(steps * dt).toFixed(1), stars: P.collected,
      maxV: +maxV.toFixed(1), minY: +minY.toFixed(2), minT: +minT.toFixed(3),
      underTime: +underTime.toFixed(1), maxDarkK: +maxDarkK.toFixed(2),
      flash: P.emerged ? 1 : 0, scream,
      loops: loopsDone, lookBacks: lbCount,
      faceFwd: ffDen ? +(ffNum / ffDen).toFixed(2) : 1,
      maxBankDeg: +(maxBank * 180 / Math.PI).toFixed(1),
      camUp: (Park3D.camera.up && +Park3D.camera.up.y.toFixed(2)) || null
    };
  });
  console.log(JSON.stringify(r));
  console.log("PAGEERRORS(" + errs.length + "):", errs.slice(0, 3).join(" | "));
  await b.close();
})();
