const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/home/obot/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome", args: ["--no-sandbox"] });
  const p = await (await b.newContext()).newPage();
  await p.goto("file:///home/obot/Projects/20261023-3rd-game/index.html");
  const r = await p.evaluate(async () => {
    Game.playerCfg = defaultConfig("female");
    beginGame({ cfg: Game.playerCfg, furniture: [], stage: "done" }, true);
    setSub("map"); enterPark();
    for (let i = 0; i < 300 && !Park3D.running; i++) await new Promise((r) => setTimeout(r, 100));
    Park3D.player.position.set(5, 1.5, 6);
    Park3D.nearStation = { kind: "coaster" }; Park3D.action();
    window.requestAnimationFrame = () => 1;
    Park3D.renderer.render = () => {};
    const dt = 0.05, P = ParkCoaster, curve = Park3D.coasterCurve;
    let lbEndT = -9, lastLB = false;
    const fails = [];
    while (P.active && !P.finished) {
      if (P.v < 9.5 && !P.stopped) P.action();
      Park3D.update(dt);
      const u = Math.min(P.t, 1), pt = curve.getPointAt(u);
      if (P.lookBackT <= 0 && lastLB) lbEndT = Park3D.t;
      lastLB = P.lookBackT > 0;
      if (P.lookBackT <= 0 && Park3D.t - lbEndT > 0.5) {
        const uA = Math.min(u + 1.2 / curve.getLength(), 0.999);
        const pa = curve.getPointAt(uA);
        const eyaw = Math.atan2(pa.x - pt.x, pa.z - pt.z);
        const d = Math.abs(Math.atan2(Math.sin(P.rideBill.rotation.y - eyaw), Math.cos(P.rideBill.rotation.y - eyaw)));
        if (d > 0.6) fails.push(+P.t.toFixed(3));
      }
    }
    return { n: fails.length, fails: fails.slice(0, 60) };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
