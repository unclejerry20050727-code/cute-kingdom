/* 21-8 靜態截圖（獨立 browser，不騎行）：L1 環＋進出坡錯開（沿 x 軸側視） */
const { chromium } = require("playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
setTimeout(() => { console.log("GLOBAL TIMEOUT"); process.exit(2); }, 90000);
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
  });
  await p.evaluate(() => {
    const sl = document.getElementById("park-speedlines");
    if (sl) sl.classList.remove("on");
    const sf = document.getElementById("park-sunflash");
    if (sf) sf.style.opacity = "0";
    const cam = Park3D.camera;
    cam.up.set(0, 1, 0);
    cam.position.set(9, 5.5, -8.5);
    cam.lookAt(24.8, 3.2, -9.6);
  });
  await sleep(700);
  await p.screenshot({ path: "/tmp/r21-04-loop.png" });
  console.log("L1 loop shot done. PAGEERRORS(" + errs.length + "):", errs.slice(0, 3).join(" | "));
  process.exit(0);
})();
