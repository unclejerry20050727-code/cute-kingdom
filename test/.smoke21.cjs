const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/home/obot/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome", args: ["--no-sandbox"] });
  const p = await (await b.newContext()).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
  await p.goto("file:///home/obot/Projects/20261023-3rd-game/index.html");
  const r = await p.evaluate(async () => {
    Game.playerCfg = defaultConfig("female");
    beginGame({ cfg: Game.playerCfg, furniture: [], stage: "done" }, true);
    setSub("map");
    enterPark();
    for (let i = 0; i < 300 && !Park3D.running; i++) await new Promise((r) => setTimeout(r, 100));
    if (!Park3D.running) return { err: "not running" };
    return {
      L: +Park3D.coasterCurve.getLength().toFixed(1),
      loops: Park3D.coasterLoops.map((l) => [ +l.t0.toFixed(3), +l.t1.toFixed(3) ]),
      tunnelT: { e: +Park3D.tunnelT.enter.toFixed(3), x: +Park3D.tunnelT.exit.toFixed(3) }
    };
  });
  console.log(JSON.stringify(r));
  console.log("PAGEERRORS(" + errs.length + "):", errs.slice(0, 3).join(" | "));
  await b.close();
})();
