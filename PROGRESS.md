# 🎮 可愛國 — 開發進度

> 純 HTML/CSS/JS 網頁遊戲（無框架、無建構工具）
> 目標：可愛風、Q 版人物、等距房間、建造與探索

## 📋 總覽

- [x] 專案初始化
- [x] 角色自定義系統
- [x] 等距房間 + 角色動畫
- [x] 對話系統
- [x] 遊戲主流程（wake→talk→tutBuild→placeBed→praise→goOut→outside→free）
- [x] Playwright 流程測試（test/flow.mjs，24 張截圖）
- [x] 角色外觀對照 art/ 設定圖（小島男女版、小宥）

## 0️⃣ 初始化 ✅

- [x] 建立資料夾結構
- [x] index.html / css / js 骨架
- [x] 背景配色：淺咖啡 #EDD3AE + 深咖啡 #5A3E2B 波點（避開人物配色衝突）
- [x] 遊戲視窗 VW=980 VH=660，CSS 縮放適配

## 1️⃣ 角色自定義 ✅（js/character.js）

- [x] Canvas 2D 繪製 Q 版角色（頭 25r、身體 50×30）
- [x] 性別男/女
- [x] 髮型：蓬蓬短髮 / 波波頭 / 側馬尾 / 雙馬尾 / 長髮 / 卷卷頭（含背面視角）
- [x] 呆毛：短髮與長髮（對照設定圖新增）
- [x] 髮色 10 色（新增可可 #7A564A、拿鐵 #A97C62，取自 art/ 參考圖）
- [x] 眼型 4 種、眼色 7 色（新增可可棕）、鼻型 3 種、嘴型 4 種
- [x] 皮膚 4 色
- [x] 衣服：4 上衣（黑長袖＝開襟外套+白T內搭）× 3 褲子（新增深咖長褲）
- [x] 角色預覽卡（create 左側即時繪製）
- [x] 預設造型對照 art/ 設定圖：可可髮色 + 白T + 牛仔短褲
- [x] NPC 小宥：可可短髮+呆毛、黑外套白T、深咖長褲（art/小宥.png）
- [x] 行走 bob、左右側視（手臂/腿擺動）、背面（朝上走）、躺姿（剛醒）

## 2️⃣ 等距房間 ✅（js/world.js）

- [x] TILE 64×32（2:1），10×10 地板
- [x] 地板格線 + 交替色
- [x] 牆高 WALL_H=118（可蓋過角色）
- [x] 粉紅門（左牆）、窗戶（右牆）
- [x] 家具：床 / 桌子 / 椅子 / 地毯（可放置，深度排序）
- [x] 屋外場景（草地、小樹、路徑）

## 3️⃣ 對話系統 ✅（js/dialogue.js）

- [x] 對話盒（角色頭像 + 名牌 + 逐字打字機效果）
- [x] 小宥：棕髮呆毛、黑外套白T（對照設定圖）
- [x] 頭像即角色本體（drawPortrait）
- [x] 對話推進：點擊 / 空白鍵 / Enter
- [x] 多段對話、立繪彈出動畫

## 4️⃣ 遊戲主流程 ✅（js/game.js）

- [x] 封面 → 標題 → 角色自定義
- [x] 剛醒：角色躺著，點擊睜眼（左看右看）
- [x] 「這是哪裡？」→ 小宥登場對話
- [x] 建造教學：建造面板（tab：家具/牆面/地板/裝飾）+ 拖放家具 + 粉色提示圈
- [x] 小宥誇獎
- [x] 出門按鈕 + 提示 → loading → 屋外
- [x] 屋外自由移動（WASD/方向鍵 + 點地板走）
- [x] 存檔（localStorage）：角色、家具、stage、pos；載入時還原
- [x] 續玩：reload 後從上次 stage 恢復（goOut 等）

### 流程狀態機
`cover → title → create → wake → talk → tutBuild → placeBed → praise → goOut → outside → free`

## 5️⃣ 視覺細節 ✅

- [x] 波點背景、卡片陰影、圓角
- [x] 角色配色避開咖啡色系，改用莓果/靛藍/天空藍/薄荷/粉/金
- [x] 家具 ghost 預覽（透明 + 粉色提示圈）
- [x] 提示系統：粉色光圈 + ⬇️ 箭頭 + 氣泡（氣泡置中且 clamp 不超出畫面）
- [x] 按鈕 hover / active 效果、pop-in 動畫

## 6️⃣ 測試與工具 ✅

- [x] `test/flow.mjs`：Playwright（chromium）完整流程自動測試 + 24 張截圖到 shots/
- [x] 執行：`node test/flow.mjs`（需 `npm i`；用系統 chromium，CHROMIUM_PATH 可覆蓋）

### 已修復 bug
1. **loading 卡住**：`frame()` 原本 `sub==='loading'` 時整個跳過 updateGame，loadingTimer 不會累加 → 改成 loading 也 update，只是不 render。
2. **提示氣泡出畫面**：out-btn 靠右，氣泡 `left:40px` 固定偏移會超出右緣 → 改 JS 量測氣泡寬度置中並 clamp。
3. **角色外觀不符設定圖**：原預設粉/黑色系與 art/ 參考圖（可可棕髮、呆毛、白T、牛仔短褲）差距大 → 加可可/拿鐵髮色、可可棕眼色、深咖長褲、呆毛、黑長袖外套白T內搭，並更新預設與小宥配置。

## 🎵 音效 / 音樂 ✅（js/audio.js）

- [x] Web Audio 合成音效（無外部音檔）：click / confirm / back / place / pop / blip / toast / whoosh / wake
- [x] BGM：C大調 132bpm 可愛循環（旋律 triangle + 貝斯 sine，32 步循環排程）
- [x] 靜音按鈕（🔊/🔇，右上角，localStorage 記住）
- [x] 首次點擊（封面）才啟動 AudioContext（符合瀏覽器自動播放政策）

## 7️⃣ 第二轮改版（2026-10-25，Jerry 口頭回饋）🚧

### 需求清單
1. **Loading 手寫風**：顏色以棕色為主（不超過棕色系）、圈圈下方加一句笑話/金句（每次隨機）✅
2. **房子比例**：對照 3rd-game-ref.jpg（小森風等距小屋）→ 牆加高成方盒子（WALL_H 118→300），門窗等比放大 ✅
3. **第一人稱剛醒**：左看右看改為第一人稱 → 一張「矮但很寬」的房間全景圖，鏡頭左右平移，眼皮張開動畫（點擊睜眼）✅
4. **小宥說話時切第三人稱**：對話照舊，角色/衣服/頭髮全部用 canvas 圖形繪製（不贴图、不 emoji 代替）✅
5. **地圖**：直直往下、中間米白道路、兩側綠色草坪、手繪風；順著走先看到「麥當勞」的點 ✅
6. **麥當勞打工**：起始 100 元 → 買制服 50＋帽子 30 → 開始打工（3-2-1 倒數）→ 組漢堡（麵包胚/蔬菜/番茄/煎肉片）→ 給客人 1 個 20 元 → 1 分鐘結束自動回「開始打工」畫面；左上角 ✕ 回地圖；地圖「回家」回房間 ✅

### 實作計畫（小步提交）
- [x] A. Loading 重製（手寫字體 Caveat/Long Cang + 手繪 SVG 圈圈 + 棕色單色系 + 金句）
- [x] B. 房間比例（WALL_H=300、門 168、窗 132）
- [x] C. 手繪工具（world.js：handShape/handEllipse/mulberry32，種子化抖動不閃爍）
- [x] D. 第一人稱全景（js/pano.js：離屏 2400×660 全景 + 眼皮張開/鏡頭平移 + fp/talk 子狀態）
- [x] E. 地圖場景（js/mapscene.js：離屏 980×660，道路/草坪/小房子/麥當勞點＋小舖，mapP 像素移動，回家按鈕、錢幣 HUD）
- [x] F. 麥當勞商店（screen-shop：制服/帽子圖示 canvas、購買、開始打工、角色穿裝備預覽）
- [x] G. 組漢堡打工（js/mini.js：sub=work，3-2-1、60 秒、固定食譜、錯點抖動、完成飛給客人 +20、顧客隨機造型、制服帽子圖形）
- [x] H. 音效補充（ding/buzz/coin/tick/fly）
- [x] I. 存檔擴充（money/gear）、test/flow.mjs 新流程 + 截圖（31 張）、PROGRESS 更新

### 流程狀態機（新版）
`cover → title → create → fp(閉眼→睜眼→全景平移) → talk(第一人稱) → meet(第三人稱) → tutBuild → placeBed → praise → goOut → loading → map ⇄ shop → work(60s) → map → 回家 → free`

## 🎨 第三輪：角色造型對照 art/ 優化（2026-10-25）
對照 art/小島-女版.png、小島-男版.png、小宥.png 的 Q 版立繪：
- [x] J. 眼睛（大動漫眼：大虹膜+上眼瞼粗線+大高光+小高光；眨眼/眼型變體保留）
- [x] K. 頭髮（女長髮＝中分瀏海+側發+波浪髮尾；男短髮＝碎刺瀏海；呆毛改細捲髮；髮絲高光）
- [x] L. 衣服（帆布鞋鞋帶/鞋底、牛仔褲翻邊、T恤袖口、小宥拉鍊外套+領子、工裝褲口袋）
- [x] M. 測試截圖對照（create 預覽 + 房間 + 頭像）+ PROGRESS/commit

### 第三輪 session 交接筆記（已完成，留檔供回顧）
**J/K/L 實作內容：**
1. **J 眼睛**（js/character.js）：
   - `drawEye(ctx, c, x, y, R, side)` 新增 `side` 參數（左/右眼，貓貓眼外眼角用）；drawFace 呼叫處已改 `drawEye(ctx, c, exx, eyy, R, side)`
   - 虹膜加大（round 預設 R*0.18×0.23）、下半深色陰影（clip+rgba(35,22,14,0.30)）、大高光左上+小高光右下、上眼瞼粗線 `#2E2018`（arc 1.08π→1.92π，lw max(1.8, rx*0.32)）
   - 豆豆眼保持簡潔；貓貓眼外眼角挑線保留
   - 腮紅改兩層（0.22/0.30 alpha、y+0.4R、R*0.24/0.16）
2. **K 頭髮**（js/character.js）：
   - `ahoge()` 改細捲髮（stroke 捕捉 fillStyle 作髮色、lw2.2、小捲）
   - `bangPoints`：`long` 改中分瀏海（9 點，中分 0.08R 高、兩側 0.48R 弧垂）；`short` 改碎刺瀏海（9 點深淺交替）；pony/twins/bob/curly 不變
   - `drawBangs`：short 頭頂 3 顆碎刺三角（-0.52/-0.08/0.45 r 基點，尖 -1.12/-1.3/-1.18 r）；long 兩側側髮（過耳到下巴，±0.92r、到 +0.98r）；髮絲高光（左上大片 arc 1.08π-1.36π lw0.16r + 頂上一小塊 1.44π-1.52π lw0.1r，rgba(255,255,255,0.3)）
   - `drawBackHair long`：髮尾加長到 +50、波浪更深、左側一條高光（0.18 alpha）
   - `drawBackViewHair long`：背面加兩條高光 streak
3. **L 衣服**（js/character.js）：
   - 鞋＝帆布鞋（白鞋面 5.6×3.8 + 鞋底弧 `#D9C8AE` + 雙鞋帶線 `#E8DCC8`）
   - 牛仔短褲翻邊（shade +0.22 淺色滾邊 -6.8 處）
   - T 恤下擺線（-12.5→-10.5 弧線）
   - 小宥 `blackL` 外套：領子兩片小三角 + 拉鍊線 `#9A9AAC`（y0+14→27）+ 拉鍊頭
   - `coffeeLong` 工裝褲：兩腿各一個口袋（5.4×4.6 roundRect）
4. **測試工具**：新建 `test/peek-character.mjs` → `shots/char-lineup.png`（全身 lineup）+ `shots/char-face.png`（頭部特寫+3 頭像）
5. **微調（已做）**：碎刺尖從 -1.2/-1.42/-1.26 降到 -1.12/-1.3/-1.18（太像角）；瀏海碎刺 y 值 0.36/0.42/0.44→0.34/0.38/0.4（太深）；test 頭像 label `[object Object]` bug 已修

**M 完成確認：**
1. ✅ 重跑 peek-character 確認碎刺/瀏海微調效果（char-lineup/char-face 都過）
2. ✅ 跑完整 `node test/flow.mjs`（31 張）無 pageerror、money=40 count=1
3. ✅ 對照 art/ 微調完成；順手修了兩個佈局 bug（見下）
4. ✅ 最終 commit

**順手修的佈局 bug（本輪發現）：**
- **對話框遮角色/床**：WALL_H 300 後房間變高，玩家（feet y≈541@1280×720）和教學放的床（底邊 y≈541）都被對話框（top≈500）遮住。修法：`css/style.css` 的 `.dialogue` `bottom: 96px → 36px`，對話框 top 降到 ≈548，玩家/床/小宥全部完整可見
- **地圖「回家」提示被 mute 鈕吃掉**：`.hint-bubble` 固定在按鈕上方 -126px，但「回家」鈕在螢幕右上角（top:74px），氣泡被頂到畫面外。修法：`js/game.js` `positionHint()` 加 `flip` 判斷（目標 `r.top < 200` 時），氣泡/箭頭翻到按鈕**下方**、箭頭換 ⬆️；下方按鈕（出門/建造）維持原本 ⬇️ 朝上氣泡

**驗證結果：**
- `node test/flow.mjs` 31 張全過、0 pageerror、money=40 count=1
- `node test/peek-map.mjs`：買裝備/打工/錯點 shake/回地圖/回家 free 全過
- `node test/peek-fp.mjs`：第一人稱睜眼/平移/對話/切第三人稱全過
- 目視對照 art/：女（中分長髮+側髮+呆毛+大眼）、男（碎刺短髮）、小宥（拉鍊外套+工裝褲口袋）皆符合；create 預覽/房間/商店預覽/對話頭像/地圖全场景正常

**注意：**
- `drawCharacter` 有 `o.blink` 參數（0/1）；test 用 `{ blink: 1 }` 測眨眼
- 頭像 `drawPortrait(ctx, cfg, size, o)` 會自帶 clearRect + 後髮，scale 由 R/25 決定
- 第三人稱房間 / 地圖 / 商店預覽 / 對話頭像都用同一套 drawCharacter/drawPortrait，改動會全面生效
- mini.js 的顧客 `drawCustomer` 是另一套簡易臉，**不在本輪範圍**（未改）
- 無 git 衝突風險：J/K/L 已 commit 到 `2e6ac45`，M（佈局修復+截圖+PROGRESS）隨最終 commit 收尾

## 🎨 第四輪：瀏海修高 + 安裝 svg-creator skill（2026-10-27）

### 需求（Jerry 口頭回饋）
1. 安裝 svg-creator skill（https://github.com/upbrew-tech/svg-creator-skill）提升人物美觀 ✅
2. 人物前額的頭髮（瀏海）太低、看起來恐怖 → 對照 art/ 三張立繪把髮線修高並更精緻 ✅

### 實作
- [x] N. 安裝 skill 到 `~/.agents/skills/svg-creator/`（git archive 排除 .git；含 SKILL.md 170 行 + references/advanced-techniques.md 885 行 + scripts/svg_loop.py；`python3 scripts/svg_loop.py status` 驗證 OK，render 用系統 chromium）
- [x] O. 瀏海髮線全面修高（js/character.js `bangPoints`，對照 art/ 立繪：前額露出大半、最低發絲只到眉上方）：
  - **short 碎刺**：舊最低點 +0.4R（蓋過眉毛、貼到眼睛＝恐怖主因）→ 新髮線拱形：中心谷 -0.5R、4 顆碎刺尖 -0.22~-0.3R、耳側錨點 +0.08R；眉頂約 -0.29R 完全露出
  - **long 中分**：舊中心 +0.08R、兩側 +0.48R → 新中分最高 -0.52R、±0.16R 兩撮細發絲垂到 -0.36R、兩側弧垂 -0.4~-0.22R、耳錨 +0.1R
  - **bob**：深 U +0.42R → 高拱（中心 -0.44R）
  - **pony/twins**：+0.4R → 微掃高拱（-0.4~-0.18R）
  - **curly**：+0.34R → 高拱（-0.42R）+ 波浪控制點 0.16R→0.12R（避免波峰壓到眉）

### 驗證
- `node test/peek-character.mjs`：正面/側視/背面/眨眼/頭像全確認前額露出、眉毛可見（shots/char-face.png、char-lineup.png）
- `node test/flow.mjs`：31 張全過、0 pageerror、money=40 count=1

## 🖼️ 進階美術
- [ ] 更多家具（桌子/椅子/立燈/盆栽/地毯）
- [x] 真正的屋外場景（直式道路地圖，麥當勞打工）
- [x] 角色細節（腮紅加深、頭髮高光）→ 見第三輪 J~M
- [ ] 過場動畫

## 📦 打包
- [ ] 可選：加 PWA manifest
