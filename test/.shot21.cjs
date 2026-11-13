/* 21-8 騎行截圖 v3：頁內等待（零 round-trip）＋坐姿/彎道截圖；結束即 exit（避免 close 卡住） */
const { chromium } = require("playwright");
const T0 = Date.now();
const mark = (s) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}`);
setTimeout(() => { mark("GLOBAL TIMEOUT"); process.exit(2); }, 200000);
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
  /* 頁內等待器：cond(P) 為真或 75s 超時才回 */
  const waitInPage = (fn, name) => p.evaluate((fnSrc) => new Promise((res) => {
    const cond = eval("(" + fnSrc + ")");
    const t0 = performance.now();
    (function chk() {
      try {
        const r = cond(ParkCoaster, Park3D);
        if (r) return res(r);
      } catch (e) { /* 繼續 */ }
      if (performance.now() - t0 > 75000) return res({ timeout: true, t: ParkCoaster.t, active: ParkCoaster.active });
      requestAnimationFrame(chk);
    })();
  }), fn);
  /* 1) 坐姿：爬坡段 t 0.078-0.102（無回頭） */
  let r = await waitInPage("(P, X) => (P.active && P.t >= 0.078 && P.t <= 0.102) ? { t: +P.t.toFixed(3), v: +P.v.toFixed(1) } : null", "seat");
  mark("seat: " + JSON.stringify(r));
  await p.screenshot({ path: "/tmp/r21-01-seat.png" });
  mark("seat shot saved");
  /* 2) 彎道傾斜：|bank|>0.35 */
  r = await waitInPage("(P, X) => (P.active && Math.abs(P.bank) > 0.35) ? { t: +P.t.toFixed(3), v: +P.v.toFixed(1), bank: +P.bank.toFixed(2) } : null", "bank");
  mark("bank: " + JSON.stringify(r));
  await p.screenshot({ path: "/tmp/r21-02-bank.png" });
  mark("bank shot saved");
  /* 3) 等完賽＋cleanup（active=false） */
  r = await waitInPage("(P, X) => (!P.active) ? { t: +P.t.toFixed(3), stars: P.collected } : null", "end");
  mark("ride end: " + JSON.stringify(r));
  console.log("PAGEERRORS(" + errs.length + "):", errs.slice(0, 3).join(" | "));
  process.exit(0);
})();
