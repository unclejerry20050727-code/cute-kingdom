/* 21-8 補充：乾淨彎道傾斜（720 出口彎 t0.76+，|bank|>0.3，無回頭、無俯衝線條） */
const { chromium } = require("playwright");
const T0 = Date.now();
const mark = (s) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}`);
setTimeout(() => { mark("GLOBAL TIMEOUT"); process.exit(2); }, 290000);
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
    const orig = Park3D.update.bind(Park3D);
    Park3D.update = (dt) => {
      const P = ParkCoaster;
      if (P.active && !P.finished && P.v < 9.5 && !P.stopped) P.action();
      orig(dt);
    };
  });
  mark("boarded");
  const r = await p.evaluate(() => new Promise((res) => {
    const t0 = performance.now();
    (function chk() {
      const P = ParkCoaster;
      if (P.active && P.t > 0.76 && Math.abs(P.bank) > 0.3 && P.lookBackT <= 0 && !P.finished)
        return res({ t: +P.t.toFixed(3), v: +P.v.toFixed(1), bank: +P.bank.toFixed(2) });
      if (!P.active || performance.now() - t0 > 150000) return res({ timeout: true, t: +P.t.toFixed(3), active: P.active });
      requestAnimationFrame(chk);
    })();
  }));
  mark("bank2: " + JSON.stringify(r));
  await p.screenshot({ path: "/tmp/r21-05-bank-clean.png" });
  mark("saved. PAGEERRORS(" + errs.length + "):", errs.slice(0, 3).join(" | "));
  process.exit(0);
})();
