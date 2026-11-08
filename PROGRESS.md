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
- [x] BGM 實音軌（Sugar Cookie‑Daystar／Marshmallow・Sunset‑Lukrembo，music/）
- [x] 字體換資源圓體 RHR（子集 WOFF2 516KB，tools/make-font.py 可重跑）
- [x] 房間建造系統（第九輪：家具 8／擺飾 4／地飾 4／牆飾 6 款＋裝潢 10 色＋移除）
- [x] README.md（玩法／操作／建造表／測試說明）

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

## 🎨 第五輪：真實音樂 + 資源圓體字體（2026-10-27）

**Jerry 的要求**：
- N. BGM 換三首：Sugar Cookie（Daystar）／Marshmallow（Lukrembo）／Sunset（Lukrembo）
- O. 字體換「資源漢圓粗」：不要太大、不要太粗、也不要太細

### 完成
- [x] **BGM 實音軌**（music/ 共 8.5MB，160kbps）：
  - sugar-cookie.mp3 — Daystar（샛별／별 헤는 다락방），官方 Google Drive 下載
  - marshmallow.mp3、sunset.mp3 — Lukrembo，freetouse.com 直連
  - 版權見 music/CREDITS.txt；封面加「BGM：Daystar ・ Lukrembo」謝卡
  - ⚠️ Daystar 授權：免費範圍限影片/社群平台；遊戲/網站屬「可付費授權」用途。
    本遊戲為本地個人作品不公開故無問題；**若要公開上架或商業化，需先向 Daystar 取得付費授權**
- [x] **js/audio.js**：移除合成 BGM，改 `<audio>` + `createMediaElementSource` 接 master gain（靜音鈕同步有效）；三首隨機播放、ended 自動換下一首（不連重複）；SFX 維持 Web Audio 合成
- [x] **字體資源圓體（RHR）**：
  - 來源：CyanoHao/Resource-Han-Rounded v1.910（OFL，CFF2 變體字 wght 200-900 + ROND 圓度軸）
  - TW 地區子集 OTF（10.9MB 7z）→ pyftsubset 子集化（遊戲用到的 747 字）→ `fonts/rhr.woff2`（516KB）
  - `tools/make-font.py`：從 index.html/js/css 重新收集字元並重跑子集（⚠️ 遊戲新增中文字後要重跑）
  - `tools/full/` 本地留存完整 VF（已 gitignore），需要時從 GitHub Releases 重下
  - CSS：`@font-face RHR`（font-weight 200 900）＋ `--font` 改 'RHR'；**字重統一 700（Bold）**＝「粗」但不超粗、不偏細
  - 移除 Google Fonts 的 Baloo 2／M PLUS Rounded 1c（保留 Caveat + Long Cang 手寫體）
  - Canvas 繪字（dialogue 的 ?／game 的 !）同步改 RHR 700
- [x] **字級調整（不要太大）**：封面標題 84→62px、標題畫面大字 110→84px、小螢幕 media query 等比縮
- [x] **規避 Chromium CFF2 渲染 bug**：`-webkit-text-stroke` 套在 CFF2 字體的有封閉空間字形（國/園/回）會畫出毛線內框 → `.t-char` 改 8 方向 `text-shadow` 偽外框，效果一樣且不挑字體格式
- [x] 驗證：test/flow.mjs 31 張截圖全過、0 pageerror；headless 確認 BGM 真的在播（currentTime 增加）、靜音/取消靜音無錯
  - ⚠️ 後記：此驗證有盲點——headless Chromium 不強制 autoplay 政策，無法重現真實 Chrome 擋播情境（見第六輪）

### 檔案
- 新增：`fonts/rhr.woff2`、`music/*.mp3` + `CREDITS.txt`、`tools/make-font.py`、`test/peek-audio.mjs`（抓 freetouse 音訊直連 URL 用）
- 修改：`css/style.css`、`js/audio.js`、`js/dialogue.js`、`js/game.js`、`index.html`、`.gitignore`、`shots/*`

## 🎧 第六輪：Chrome BGM 無聲排查與修復（2026-10-28）

### 現象（Jerry 回報）
- 同一個 MP3 拖曳進 Chrome 能播；但遊戲裡完全聽不到 BGM
- 音樂開關鈕反覆切換也沒用

### 根因分析（js/audio.js）
1. **`play().catch(() => {})` 吞掉所有失敗**：首次 play() 若被 Chrome autoplay 政策擋（NotAllowedError），BGM 永久中斷、无任何回饋、無重試機制
2. **靜音鈕不會重播 BGM**：`toggleMute` 只改 master gain；若 BGM element 是 paused 狀態，怎麼切都靜音 → 正好對上「反覆切換都聽不到」
3. **換歌 play() 無 gesture**：`ended` handler 裡的 play() 不是使用者互動，政策邊緣時可能被擋 → 第一首播完就沒了

### 修復
- [x] `playBgmNow()`：統一出口——先 `ctx.resume()` 再 `el.play()`；NotAllowedError 時 console.warn（DevTools 看得見）＋一次性 toast「🔊 瀏覽器擋了自動播放，點一下畫面就能開 BGM 囉」
- [x] `bindBgmRetry()`：首次被擋後監聽 `pointerdown`/`keydown`，下一次互動自動重試播放
- [x] `toggleMute` 取消靜音時：若 BGM 該播但 paused → 立即 `playBgmNow()`（音樂開關真正「開」音樂）
- [x] BGM element 加 `preload='auto'`；`stopBGM` 重置 blocked 狀態
- [x] test/flow.mjs 自帶 server 補 `.mp3`/`.woff2` MIME（之前是 octet-stream）

### 驗證（headless，test/peek-bgm-*.mjs）
- [x] 基礎：點封面→BGM 起播、Analyser 量 master gain 輸出 RMS≈0.03-0.08（真有声波）、靜音 gain 1→0.0001→1
- [x] 模擬被擋（hook play 強制 reject NotAllowedError）：
  - 情境1：首次被擋→toast+warn 出現→點畫面→BGM 自動恢復（RMS 0.048）✅
  - 情境2：首次被擋→mute→unmute→BGM 恢復（RMS 0.048）✅
- [x] ended 換歌鏈：短音檔連續觸發 23 次 play() 零失敗
- [x] flow.mjs 31 步全流程回歸、0 pageerror
- ⚠️ headless 無法開嚴格 autoplay 政策（試過 `--autoplay-policy=user-gesture-required` 仍放行；且此 build 上 `--disable-field-trial-config` 與 `--autoplay-policy=document-user-activation` 會 crash，需 `ignoreDefaultArgs` 移除），所以真實 Chrome 政策行為靠「模擬 reject」驗證

### 若 Jerry 的 Chrome 修完還是不響（使用者端檢查清單）
1. **最可能：網站被瀏覽器層級靜音**——地址列 🔒/🔊 圖示 → 看 Sound 是否被關；`chrome://settings/content/sound` 看「不允許播放聲音」清單有沒有遊戲的 origin（被擋時頁面內所有音效+ BGM 都靜，但單獨開 MP3 的 tab 正常，正符合症狀）
2. DevTools Console 看有沒有 `[BGM] play() 被拒絕： NotAllowedError`（新代碼會印出來）
3. 確認有點「點擊進入 ✨」按鈕（BGM 從封面那一下 gesture 開始）
4. `file://` 開與 http server 開都可行，但 localhost/127.0.0.1 最穩（安全環境）

### 檔案
- 新增：`test/peek-bgm-diag.mjs`（基礎診斷+RMS）、`test/peek-bgm-strict.mjs`（政策旗標+ended 鏈）、`test/peek-bgm-blocked.mjs`（模擬 NotAllowedError）、`test/short.mp3`（0.4s 測試音檔）
- 修改：`js/audio.js`、`test/flow.mjs`、`shots/*`（回歸重拍）

## ✏️ 第七輪：角色美術 v2（對照 art/ 立繪 + 書包）

### 動機
- Jerry 要求用 svg-creator 參考 `art/小宥.png`、`art/小島-女版.png`、`art/小島-男版.png` 重新設計角色，再搬回 Canvas 程式碼
- 舊版問題：女長髮太平板像安全帽、男短髮是三角幾何刺刺、兩性都沒書包

### 設計流程（svg-creator 迴圈）
- 新建 `design/character-v2.svg`：四格設計圖（女前/女背/男前/男背），用遊戲同一套座標系（腳為原點、頭心 (0,-58)、R=25）方便搬運
- `rsvg-convert` 渲染 `design/character-v2-preview.png` 反覆對照（3 輪：修女版瀏海「長角」、男版鋸齒瀏海、後頸碎髮被頭蓋住）
- 最終版已過目：女＝中分簾幕瀏海+長側髮+白短袖+牛仔短褲+米色書包；男＝蓬蓬短髮（深色底+髮片+碎刺）+深藍連帽外套+深咖長褲+棕色書包

### 程式碼（js/character.js）
- [x] `defaultConfig`：女＝long/whiteS/shortDenim/pack:beige；男＝short/blackL/coffeeLong/pack:brown
- [x] 新增 `PACKS`（beige/brown）、`drawPackStraps`（正面/側面背帶+釦環）、`drawPackBody`（背面包體+口袋+提把）
- [x] 書包畫在手臂之後（背帶穿在最外層）；`gear.uniform` 時不畫（制服覆蓋）
- [x] `drawBangs` 重構：`long`/`short` 走新 helper（`drawLongBangsCap` 中分簾幕+中分細髮；`drawShortBangsCap` 深色底+耳朵+平滑髮線+四撮寬圓髮片+四顆碎刺+兩條高光），bob/pony/twins/curly 保留舊路徑
- [x] 長髮側髮改到鎖骨（對照小島女版）；`drawBackHair` long 改四尖波浪垂髮+髮絲陰影
- [x] `drawBackViewHair`：long 改四尖垂髮（髮尾垂到書包下方）+髮絲；default 改後頸小鋸齒，short 加三撮後頭頂碎刺+高光
- [x] `XIAOYOU_CFG` 對照小宥：女/long/白T/牛仔短褲/beige 書包

### 程式碼（js/game.js）
- [x] 建角換性別：同步重置 hairStyle/top/bottom/pack（造型模板跟性別走）
- [x] `beginGame`：舊存檔缺 `pack` 時依性別補預設值（向后相容）

### 驗證
- [x] `node --check` character.js / game.js 通過
- [x] `test/flow.mjs` 31 步全流程回歸、0 pageerror
- [x] 截圖確認：03/04 建角頁男女新造型+書包帶、10 小宥對話、27 背面視角（書包蓋在垂髮前、後腦碎刺）

### 檔案
- 新增：`design/character-v2.svg`、`design/character-v2-preview.png`
- 修改：`js/character.js`、`js/game.js`、`shots/*`（回歸重拍）

## 🎙️ 第八輪：BGM file:// 無聲真凶（CORS 零輸出）+ BGM 脫離 Web Audio（2026-10-29）

### Jerry 的八平台測試矩陣（mp3-test.html）
| 平台 | 1️⃣純audio | 2️⃣MediaElementSource | 4️⃣蜂鳴器 | index.html 遊戲 BGM |
|---|---|---|---|---|
| macOS Safari | ✅ | ✅ | ✅ | ✅ |
| macOS Chrome / Firefox | ✅ | ❌ | ✅ | ❌ |
| Win Edge / Chrome / Firefox | ✅ | ❌ | ✅ | ❌ |
| SteamOS Chrome | ✅ | ❌ | ✅ | ❌ |
| Omarchy Chrome | ✅ | ❌ | ✅ | ❌ |

規律：除 Safari 外全平台 2️⃣（MediaElementSource）與遊戲 BGM 同時沒聲，但 1️⃣（純 audio）與 4️⃣（Web Audio 震盪器）都正常。

### 排查過程
1. **MP3 檔案無恙**：ffprobe 三首都正常（44.1kHz/160kbps/立體聲）；decodeAudioData 在 Chromium 全部解得出
2. **headless Chromium + http server：四層全通、遊戲 BGM RMS 正常** → 圖形邏輯沒問題，差異在「環境」
3. **關鍵轉折：改用 file:// 載入** → 重現！Chrome console 直接宣判：
   `MediaElementAudioSource outputs zeroes due to CORS access restrictions for file:///...sugar-cookie.mp3`
   - file:// 頁面是 opaque origin（null）；Chromium/Gecko 對 file:// 媒體資源視為跨域 → `createMediaElementSource` 依 spec 輸出零（跟 canvas tainting 同款保護）
   - 同場 fetch() 也被 CORS 擋（測試 3️⃣ 全平台失敗的原因）
   - WebKit(Safari) 對同目錄 file:// 寬容當同源 → 只有 Safari 全通
   - 純 `<audio>`（1️⃣）與震盪器（4️⃣）不涉跨域 → 全平台正常
   **＝ Jerry 各平台都是雙擊 index.html 用 file:// 開的**
4. **第六輪為什麼沒抓到**：當時 headless 驗證都用 http:// server，正好繞過 file:// 的 CORS 情境；「play() 被 autoplay 擋」是假根因（file:// 下 play() 根本不被拒，元素照播，只是 Web Audio 端收到零）

### 修復（js/audio.js）
- [x] **BGM 改純 `<audio>` 直接輸出，不再走 createMediaElementSource** → file:// 與 http、全瀏覽器一致有效
- [x] 靜音鈕：BGM 改用 `el.muted` 控制（SFX 仍走 Web Audio master gain）；BGM 音量改 `el.volume = 0.5`（BGM_VOLUME 常數）
- [x] playBgmNow 簡化（不需要 ctx.resume）；ended 換歌鏈、被擋重試兜底保留
- [x] mp3-test.html 加 file:// 說明（2️⃣/3️⃣ 在 file:// 下沒聲是瀏覽器 spec 行為，非 bug）

### 驗證（test/peek-bgm-filefix.mjs，http + file:// 兩情境 × 10 項）
- [x] BGM 元素在播、進度在走（file:// 下＝真有聲音）、音量 0.5
- [x] 靜音/取消靜音：el.muted + master gain + localStorage 三聯動、靜音中不中斷
- [x] 靜音記憶 reload 後生效（BGM 播但 el.muted=true）
- [x] SFX 震盪器不受影響（peak≈0.018）
- [x] flow.mjs 31 步全流程回歸 0 pageerror

### 給 Jerry
- **现在雙擊開（file://）也有 BGM 了**，不用架 server；若要 http 也可以（`python3 -m http.server` 或 flow.mjs 自帶 server）
- 測試頁 2️⃣3️⃣ 在 file:// 下沒聲是預期（已寫進頁面判讀說明），要看那兩層請用 localhost 開

### 檔案
- 新增：`test/peek-mp3-deep.mjs`（四層逐一 RMS + 解碼測）、`test/peek-fileproto.mjs`（file:// 重現）、`test/peek-bgm-filefix.mjs`（兩情境回歸）
- 修改：`js/audio.js`、`mp3-test.html`、`shots/*`（回歸重拍）

## 🖼️ 進階美術
- [ ] 更多家具（桌子/椅子/立燈/盆栽/地毯）
- [x] 真正的屋外場景（直式道路地圖，麥當勞打工）
- [x] 角色細節（腮紅加深、頭髮高光）→ 見第三輪 J~M
- [x] 角色美術 v2（對照 art/ 立繪：女長髮簾幕瀏海/男蓬蓬短髮/書包）→ 見第七輪
- [ ] 過場動畫

## 📦 打包
- [ ] 可選：加 PWA manifest

## 9b 中斷原因分析與對策

### 失敗（terminated）原因分析
1. **單一 tool call 太大**：一次 edit 塞 8 個 block、heredoc 一次追加 200+ 行 → 單輪輸出 token 過大，易觸發超時/截斷。
2. **oldText 憑記憶猜**：context 壓縮後摘要沒有逐字內容，edit 的 oldText 跟檔案對不上 → 整批原子性失敗 → 重試再燒 context。
3. **128k context 有限**：整檔 read、大量截圖、失敗重試都在吃 context → 加速中斷。

### 對策（9b 起執行）
1. 小步快跑：一次 tool call 只一個小改動（≤60 行），改完立刻 `node -e "new Function(...)"` 語法檢查（輸出小）。
2. 改前必 grep/sed 取「當下」精確文本；大區塊先存 /tmp 備份防壓縮。
3. 輸出控制：不整檔 read，只取必要行段；截圖驗證最後一次做。
4. 每個小單位完成即更新本檔「目前狀態」，必要時 commit。
5. 單輪感覺太大就主動收尾短報告，下輪接續。

### 9b ✅ 完成（本輪 commit）
全部步驟已完成並回歸通過：
1. ✅ game.js：BUILD_TABS 加 remove＋TINT 常數（TINT_NAMES/TINT_SWATCH）
2. ✅ game.js：selectBuildTab 重寫（remove/renovate tint rows/wall/floor 卡；教學期只有床）
3. ✅ game.js：startPlacement(itemId)/startWallPlacement/startRemoveMode/cancelPlacement（回 prevSub+重開面板）/placeItem(itemId,tx,ty)/removeItem/removeTargetFromMouse/canPlaceNow/fullSave/floorCard/wallCard/setTint
4. ✅ index.html：build-tabs 加 🧹 移除 button
5. ✅ css/style.css：.build-item.dis、.tint-row/.tint-label/.tint-chip(.sel)、.build-items max-height+overflow-y
6. ✅ node test/flow.mjs：31 步 0 pageerror
7. ✅ test/peek-build.mjs：15 項檢查全過（8 家具卡/放 3 件/換色/移除/床不可移除/Esc/reload 持久化）＋shots/b01-b10

**本輪抓到的 bug（小步快跑 + 除錯腳本功勞）：**
- **placeItem 用 item.id 但 BUILD_ITEMS 條目沒有 .id 欄位**（id 是 table key）→ 存的床 `{tx,ty}` 缺 id → 渲染被靜默跳過＋床教學分支不觸發。修法：placeItem 改收 itemId（key），push `{id: itemId}`。除錯腳本 test/peek-debug.mjs 一炮打中（furniture dump 出 `{"tx":6,"ty":3}` 無 id）。
- **放完家具 sub 卡在 'placing'**（placement=null 但 sub 沒回）→ placeItem else 分支與 click wall 分支成功後補 `setSub(prevSub||'free'); openBuildPanel();`。
- **floorCard 預覽 y 變換公式錯**：物品全畫到 128×84 卡片畫布下方（卡面空白）。修法：以「足跡中心 OY+96 − h/2」為視覺中心對齊卡片 (64,42)。

**剩餘待辦**：9d 牆飾入 WALL_ITEMS、9e 裝潢 UI 收尾、9f 全回歸＋文件。

### 9c ✅ 完成（本輪 commit）
新增 8 款不擋路品項（擺飾 4＋地飾 4），全部走 9b 的通用放置/移除/存檔管道：

1. ✅ world.js：8 個繪圖函式——drawPlant 盆栽（陶盆＋扇形 5 葉）、drawVase 花瓶（貝茲瓶身＋圓點＋乾燥花）、drawTeddy 泰迪熊（四肢＋耳朵＋臉）、drawBalloon 氣球（曲線線＋高光愛心）、drawRug 地毯（2x2 薄荷＋內框愛心）、drawDoormat 門墊（條紋）、drawDecal 地板貼（粉菱框＋愛心）、drawFlower 小花叢（3 朵 5 瓣）
2. ✅ world.js：BUILD_ITEMS 加 8 條（tab decor/floor、block:false；地毯/門墊/地板貼 layer:'floor' 貼地層；氣球 pv:63 自訂預覽中心）
3. ✅ world.js：floorValid 加「同層不可重疊」規則（地飾互斥、擺飾互斥；地飾可與擺飾/家具共存）
4. ✅ game.js：renderGame 加地飾地層 pass（先於家具與角色繪製、移除模式標紅）＋地飾 ghost 走地層
5. ✅ game.js：floorCard 預覽改用 `it.pv ?? (96 - h/2)` 視覺中心（氣球等高細品項不裁切）
6. ✅ test/peek-build.mjs 擴充：25 項全過（擺飾 4 卡/地飾 4 卡/放 6 件/同層重疊拒絕/移除擺飾/reload 7 件持久化）
7. ✅ node test/flow.mjs：31 步 0 pageerror

**設計決定**：
- 擺飾/地飾 `block:false` → 不進 Game.blocked，角色可走過（rebuildBlocked 原本就認 block 欄位）。
- 地飾（地毯/門墊/地板貼）`layer:'floor'` → 在 drawRoom 後、家具前繪製，貼在地板上；玩家/家具永遠畫在牠們上面。
- 同層重疊規則只限「同層」：地毯不能疊地毯，但盆栽可以站在地毯上（不同層）。

**剩餘待辦**：9d 牆飾入 WALL_ITEMS（心形框/星星框/彩旗/時鐘/海報/牆架）、9e 裝潢 UI 收尾、9f 全回歸＋文件。

### 9-fix ✅ 放床教學卡死自愈（本輪 commit）
**症狀**（Jerry 回報）：建造一直卡在放床教學——房間已有床，點床卡提示「已經有 1 個床囉～」，remove/renovate 又被「先完成放床教學」鎖住 → 整個卡死。
**根因**：異常存檔狀態 `stage:'created'`＋furniture 已有 bed（9b 修復前舊版本產出的存檔；當時 bed 缺 id 或 stage 未推進）。載入時 skipIntro 走 else 分支進 `tutBuild`，但床卡已 disabled → 死路。
**修法（雙重防線）**：
1. `beginGame` 載入時存檔消毒＋一致性：furniture 無 id 者補為 bed（舊格式）、床最多留一張；`stage:'created'` 已有床→升 `'bed'`（進 goOut）；`stage:'bed'` 無床→降 `'created'`（重播教學）。
2. `updateGame` 加 `tutBuild` case 運行時自愈：若 `countItem('bed')>=1` → 直接 `setSub('goOut')`＋出門提示（異常 session 也能自救）。
**驗證**：`test/peek-recover.mjs` 三種異常存檔（created+有床／舊格式無 id／bed 無床）全數自愈、0 pageerror；`flow.mjs` 31 步回歸全過（正常教學不受影響）。

### 9d ✅ 牆飾 6 款入 WALL_ITEMS（本輪 commit）
1. ✅ world.js：6 個牆飾繪圖函式（全部用 wallSpace 等距空間，中心對齊 local x=0）——
   - 心形框 drawWallHeartFrame（hMid 170：白框＋粉邊＋愛心）
   - 星星框 drawWallStarFrame（hMid 165：米框＋天藍邊＋黃星；新增 starPath 五角星 helper）
   - 時鐘 drawWallClock（hMid 185：圓盤＋4 刻度＋約 10:10 時針分針）
   - 海報 drawWallPoster（hMid 150：微傾斜紙張＋膠帶＋愛心＋文字線）
   - 牆架 drawWallShelf（hMid 105：木板＋3 本書＋斜放書＋小盆栽）
   - 彩旗 drawWallGarland（hMid 232、span 2：二次曲線繩＋5 面三角旗＋釘點）
2. ✅ world.js：WALL_ITEMS 填 6 條（tab:'wall'、span、hMid、hitW；max 心形框/星星框/海報/牆架=2、時鐘/彩旗=1）
3. ✅ **座標慣例統一**：所有牆飾 draw 以 local x=0 為中心，呼叫端（renderGame 牆飾 loop、ghost、wallItemHit）一律傳 `pos + 0.5*span` → 視覺中心＝槽位中心（與卡片預覽 pos 0.5 一致）
4. ✅ **wallSlotFromMouse 改以 x 座標投影**（舊版用 2D 點積含 y 高度分碼，游標離地越高槽位越偏 → 放進錯槽、窗戶槽誤判、移除點不中）。現在：A 側 `u=(mx-ax)/(bx-ax)*N`、B 側 `u=(ax-mx)/(ax-cx)*N`，pos=round(u-0.5) clamp
5. ✅ game.js：renderGame 牆飾 loop 與 ghost 改傳 `pos + 0.5*(it.span||1)`
6. ✅ **抓到 9b 遗留 bug：卡片 max 計數用 render 時舊值**（floorCard/wallCard onclick 閉包 capture 舊 n＋openBuildPanel 不重渲）→ 放完同一品項可再點超量。修法：onclick 改即時 `countItem/countWallItem`，且 openBuildPanel 一律重渲當前 tab（卡片 (n/max)、dis 狀態即時更新）
7. ✅ test/peek-build.mjs 擴充：牆飾 6 卡、放 5 件（心形框 A1/時鐘 B2/海報 A8/牆架 A6/彩旗 B0 span2）、槽位精確斷言、窗戶槽(A3)判無效、彩旗 max 拒絕、移除心形框、reload 4 件持久化 → 34 項全過
8. ✅ node test/flow.mjs：31 步 0 pageerror（教學/建造/出門全回歸）

**設計決定**：
- 彩旗 span=2（牆 A 可用連續槽最多 2 格；span 3 以上牆 A 永遠放不下）。
- 窗戶（A 2.7~5.7）、靜態心形框（A 7.6）、門（B 6.2~8.2）槽位由 WALL_FORBID 保護，掛不上去（ghost 轉紅）。

**剩餘待辦**：9e 裝潢 UI 收尾、9f 全回歸＋文件。

### 9e ✅ 裝潢 UI 收尾（本輪 commit）
1. ✅ **修「出門」鈕蓋住第 5 色色塊**（舊版地板檸檬色根本點不到）：寬螢幕（≥900px）建造面板右移改 `right:170px` 左移避開右側按鈕列；小螢幕維持原樣
2. ✅ 標籤顯示目前色：「牆面色：粉嫩」「地板色：薄荷」（selectBuildTab 重渲時即時更新）
3. ✅ setTint toast 帶色名：「牆面換成『檸檬』囉～」、回原色時「牆面換回原色囉～」
4. ✅ 裝潢 tab 底部加混搭提示：「點色塊即換色，牆面、地板可自由混搭～」
5. ✅ test/peek-build.mjs 擴充：標籤初值/第 5 色可點/標籤跟隨/toast 帶色名/提示在/reload tints {wall:4,floor:2} → 48 項全過
6. ✅ node test/flow.mjs：31 步 0 pageerror（面板移位不影響教學 hint 與卡片點擊）

**剩餘待辦**：9f 全回歸＋文件。

### 9f ✅ 全回歸＋文件（本輪 commit）
1. ✅ 六套件全回歸全過：
   - flow.mjs：31 步 0 pageerror
   - peek-build.mjs：48 項建造檢查
   - peek-recover.mjs：3 種異常存檔自愈 0 pageerror
   - peek-bgm-filefix.mjs：BGM＋靜音 http／file:// 雙情境
   - peek-map.mjs：地圖→商店→打工→走回家 0 error
   - peek-character.mjs：角色造型對照截圖
2. ✅ 新增 README.md：快速開始／玩法／操作／建造品項表／音訊說明／專案結構／測試表
3. ✅ 第九輪全部完成（9a 髮型對話徽章 → 9b 建造核心 → 9c 擺飾地飾 → 9d 牆飾 → 9e 裝潢收尾 → 9f 回歸文件），無剩餘待辦

## 第十輪（Jerry 回饋 8 點）

**Plan（切小步、逐 commit）**：
- **10a** 對話與視覺：① 睜眼後新增 `wakeup` 子狀態（小島躺棉被、點一下才起來→meet）② 小宥改帥氣男版（短髮+呆毛/白長袖/深咖長褲/深棕背包，參考 art/小宥.png）③ 對話名字框收進框內留間距 ④ 打字 0.032→0.07s/字（點一下補完既有）→ ✅ 完成（含 flow 更新重跑、舊截圖清掉）
- **10b** 提示與教學狀態：⑤⑦ `homeFromMap` 漏 `hideHint()`（地圖紅圈帶進房間；麥當勞會清是因為 openShop 有 hide）＋ setSub 一律先 hideHint 防殘留；⑥⑧ `placeItem` 放床只存檔 stage='bed'、**runtime Game.stage 沒推進**→inTutorial 整場卡 true（其他 tab 鎖住、床卡又有紅圈）→ 補 `Game.stage='bed'`；牆飾 tab 漏 inTutorial 過濾（漏洞）→ 補鎖
- **10c** 家具轉向：`P()` 加 ROT_FN 等距 90° 仿射 override（u'=(TW/TH)v, v'=-(TH/TW)u 繞中心）、itemTiles/floorValid 吃 rot、放置中 R 旋轉、存檔帶 rot（舊檔預設 0）→ ✅ 完成（peek-build 57 項＋視覺 QA）
- **10d** 全回歸六套件＋文件更新＋清舊截圖 → ✅ 完成（六套件全過、README/PROGRESS 更新）

### 10a ✅ 對話與視覺（本輪 commit）
1. ✅ wakeup 子狀態：talk 結尾→小島躺棉被＋「👆 點擊起來」，點一下（或空白鍵，但同一次按鍵剛結束對話不觸發）才進 meet 坐起
2. ✅ XIAOYOU_CFG 男版：gender male／hairStyle short（蓬蓬短髮+呆毛）／top whiteL／bottom coffeeLong／pack brown
3. ✅ .dlg-name 收進對話框內（top/left 2px、dlg-main padding-top 40px），不再黏邊線
4. ✅ Dialogue.speed 0.032→0.07（看得出逐字；點擊補完維持）
5. ✅ flow.mjs 加 wakeup 檢查＋點擊、新增 check()/fails 計數；flow 32 步 0 pageerror；舊編號截圖已清

### 10b ✅ 提示與教學狀態（本輪 commit）
1. ✅ ⑤⑦ 修「回家後教學紅圈不消失」：`homeFromMap` 補 `hideHint()`＋`setSub` 一律先清提示＋`showHint` 加「目標不可見就不顯示」守衛（防延遲 setTimeout 殘留）
2. ✅ ⑥⑧ 修「放床後還卡放床教學」真凶：`placeItem` 放床只把 stage='bed' 寫進存檔、runtime `Game.stage` 沒推進→`inTutorial` 整場卡 true（其他 tab 鎖住、床卡又有紅圈、重載才恢復）→ 補 `Game.stage='bed'`
3. ✅ ⑥ 修牆飾漏洞：wall tab 補 `inTutorial` 鎖（舊版教學中可掛牆飾跳過教學）
4. ✅ flow.mjs 加 4 項 10b 檢查（教學中牆飾鎖住／放床後家具全開／放床後牆飾解鎖／地圖有回家圈／回房間圈消失）→ flow 32 步 7 項 ✅ 0 pageerror

### 10c ✅ 家具轉向 90°（本輪 commit）
1. ✅ `world.js`：`P()` 加 `ROT_FN` 覆蓋＋`rot90Fn(tx,ty,w,d)`（tile 空間繞原足跡中心轉 90° 再平移到旋轉後足跡中心）＋`drawRot90()` 包裝器（try/finally 確保 ROT_FN 重置）
2. ✅ `faceSpace` 旋轉時側面方向向量隨 tile 軸轉換（shelf/dresser/piano 三款有側面）
3. ✅ `itemTiles`/`floorValid` 吃 `rot`（w/d 互換）、既有家具比對也用 `f.rot`
4. ✅ `game.js`：`Game.placement.rot`、放置中 **R 鍵**旋轉（限非正方形品項）、clamping 與 valid 用有效尺寸、`rebuildBlocked`/`removeTargetFromMouse` 吃 rot、`placeItem` 存 `rot`、renderGame 四處（地飾/深度排序/兩個 ghost）用 `drawRot90` 繪製、移除標記紅框用有效尺寸
5. ✅ `beginGame` 消毒保留 `rot`（舊存檔無 rot 預設 0）
6. ✅ 放置提示：非正方形品項多顯示「（R 旋轉 90°）」
7. ✅ peek-build.mjs 加 9 項旋轉檢查（R 切換/ghost 有效/blocked 跟隨 1×2 足跡/R×2 復原/reload 後 rot 保留）→ 57 項全過
8. ✅ 視覺 QA：旋轉書桌 1×2 入駐（b16）與 ghost（b15）繪製正確、與未旋轉書桌垂直

### 10d ✅ 全回歸＋文件（本輪 commit）
1. ✅ 六套件全回歸全過：
   - flow.mjs：32 步 7 項功能檢查 0 pageerror
   - peek-build.mjs：57 項建造檢查（含 9 項旋轉）
   - peek-recover.mjs：3 種異常存檔自愈 0 pageerror
   - peek-bgm-filefix.mjs：BGM＋靜音 http/file:// 雙情境 8 項
   - peek-map.mjs：地圖→商店→打工→走回家 0 error
   - peek-character.mjs：角色造型對照 0 error
2. ✅ README.md：操作加入 R 旋轉、建造規則加旋轉說明、測試表 48→57
3. ✅ 舊截圖清理：flow 32 張重產、peek-build 17 張重產（b15-rot-ghost/b16-rot-placed 新增、舊 b15-after-reload 改 b17）
4. ✅ **第十輪 8 點回饋全部完成**（10a 對話視覺 → 10b 提示教學 → 10c 轉向 → 10d 回歸文件）

## 第十一輪（Jerry 回饋 4 點）

**Plan（切小步、逐 commit）**：
- **11a** 對話名字框與框線間距再縮短一半：`.dlg-name` top 2→-8px（單行 23→13px≈一半）；flow 加像素量測檢查（getBoundingClientRect 量 dialogue 外框頂 → 名字框頂，目標 15~19px 含 4px 邊框）
- **11b** 擺飾可放在家具上（有高度觀念）：
  - `floorValid`：`tab==='decor'` 跳過 `Game.blocked` 檢查（可放家具格；player/NPC/同層重疊檢查維持）
  - world.js 加 `surfaceHAt(tx,ty)`（該格上方最高家具 h）＋`drawLifted(lift, fn)`（OY 暫時上移）＋`itemDepth(f)`（擺飾站在家具上 → depth 取支撐家具 depth+0.1，確保畫在家具之後）
  - renderGame：深度排序/移除紅框/ghost 三處對 decor 加 lift（lift=surfaceHAt）
  - 高度**動態計算**（不存檔）：家具移除→擺飾落地；後放家具→擺飾站上去
  - peek-build 加：盆栽放書桌格 valid=true、surfaceHAt=書桌h、移除OK、截圖
- **11c** 牆飾高度可調（範圍 50~262px）：
  - `wallItems` 加 `h` 欄（舊檔無→預設 hMid）；6 個牆飾 draw 改 `wallSpace(ctx, wall, pos, o.h ?? 預設)`；`wallItemHit` 用 `w.h ?? it.hMid`
  - 放置中（mode wall）：pl.h 預設 hMid，↑/↓/W/S/滾輪 調整（±10/±6），ghost 傳 o.h，存檔帶 h
  - 已掛好再調：free 狀態**點牆飾**→ mode 'wallAdj'（暫時從 wallItems 拿出→ghost 跟隨高度→點確認/Esc 還原）
  - cancelPlacement 特判 wallAdj 要還原品項
- **11d** 手勢支援（觸控）：新增 `#place-actions` 列（放置中才顯示）：🔄旋轉（floor 且非正方形才顯示，等同 R）、▲▼（wall/wallAdj 顯示，等同 ↑/↓）、✖️取消（等同 Esc）；樣式仿 dpad
- **11e** 全回歸六套件＋README/PROGRESS＋舊截圖清理＋commit＋報告

### 11a ✅ 對話名字框間距（commit cc85171）
- `.dlg-name` top 2px → -8px（間距再縮短一半）
- flow.mjs 加像素量測檢查（14~20px 含 4px 邊框）`✅ 對話名字框與框線間距≈縮半（11a）`

### 11b ✅ 擺飾上家具＋高度觀念（commit 4064817）
- `floorValid`：decor 跳過 blocked 檢查；重疊改三類（floor=2 / decor=1 / furniture=0），只禁同類重疊
- world.js：`surfaceHAt(tx,ty)`（該格上方最高家具頂面高，動態計算不存檔）＋`drawLifted(lift,fn)`（OY 暫移）＋`itemDepthAt/itemDepth`（擺飾 depth＝支撐家具+0.1）
- renderGame：實物/ghost/移除紅框三處跟隨家具高度
- peek-build 9¾ 段 7 項（盆栽上書桌：valid/surfaceHAt=34/放置/標記/移除），57→64 項全過

### 11c ✅ 牆飾高度可調（commit 1f74e4a）
- `wallItems[].h` 存檔（舊檔預設 hMid）；6 個牆飾 draw 改 `o.h ?? hMid`；`wallItemHit` 用 `w.h`
- 放置：初始 h=hMid，↑↓/WS/滾輪 ±6px（clamp 50~262px）
- 已掛：free 狀態點牆飾→`wallAdj`（實物隱藏、ghost 跟新高度）→再點確認存檔；Esc 取消不彈面板
- peek-build 9⅞ 段：11 項放置/調整＋2 項 reload h 保留，64→77 項全過

### 11d ✅ 觸控操作鈕（commit a6eaada）
- `#place-actions` 列（左下、與 dpad 同位、僅放置中顯示）：🔄＝R（僅非正方形家具）、▲▼＝↑↓（僅牆飾/wallAdj）、✖️＝Esc
- `nudgeWallH(delta)` 鍵盤/滾輪/觸控共用；`updatePlaceActions()` 在 setSub＋三個 start* 結尾同步
- dpad 改只在 free/map 顯示（放置中原本殘留且與操作鈕重疊）
- peek-build 9⅞d 段 10 項（顯隱/🔄rot=1/✖️取消/▲▲h=177），77→84 項全過；b23-touch-actions.png 視覺 QA

### 11e ✅ 全回歸＋文件（本輪 commit）
- 六套件全過：flow（32 步 0 pageerror）/ peek-build（84 項）/ peek-recover（3 種異常存檔）/ peek-bgm-filefix（8 項）/ peek-map / peek-character
- README：操作段加牆飾高度（↑↓/WS/滾輪＋已掛點一下再調）與觸控 🔄▲▼✖️；擺飾行「可放家具上」、牆飾行「高度可調」；加 3 條規則 bullet；測試表 57→84 項
- 舊截圖清理：對照實際 shot() 列表刪 3 張舊 after-reload（b17/b19/b23）

## 第十二輪（Jerry 回饋 2 點）

### 12a ✅ 移除優先取最上方（commit 8d7f484）
- Jerry 發現：移除模式只能先拆家具、擺飾落地後才能拆；**床不可移除→床上的擺飾永遠拆不到**
- 根因：`removeTargetFromMouse` 按插入順序回傳第一個匹配（床最早放→永遠先被標）
- 修：收集所有匹配，得分 = `lift*100 + decor?2:0 + 非floor層?1:0`，取最高分（站在家具上的擺飾 lift>0 必贏；平鋪層墊底）
- 意外發現：9¾ 舊檢查只驗 `target.type==='floor'`，之前「移除書桌上的盆栽」其實拆的是書桌（盆栽留在地上）都沒發現——已加強為驗 `id==='plant'`＋拆完書桌仍在
- 新增 9⁞ 段 8 項：盆栽上床（床格 valid/9 件/確在(6,3)）→移除模式床格標盆栽（非床）→拆盆栽 8 件→床仍在→再 hover 標床→點床拆不掉；84→93 項全過

### 12b ✅ 觸控 R/Esc 驗證＋提示可發現性（commit d191340）
- 觸控鈕在 11d（a6eaada）已實作；本輪用 `hasTouch: true`＋`page.touchscreen.tap`（真實觸控事件、非滑鼠模擬）驗證 🔄/▼/✖️ 全有效
- 四處提示列加入手勢說明：放置「R／🔄 旋轉 90°」「Esc／✖️ 取消」、牆飾「↑↓/滾輪/▲▼ 調高度」、wallAdj/移除模式「Esc／✖️ 取消」；文字改「滑鼠移到…點擊」→「移到…點一下」（觸控中性）
- 9⅞e 段 4 項真實觸控檢查（🔄rot 1↔0/✖️取消/▼h=159/✖️取消牆飾）；93→98 項全過

### 12c ✅ 全回歸＋文件（本輪 commit）
- 六套件全過：flow（32 步 0 pageerror）/ peek-build（98 項）/ peek-recover / peek-bgm-filefix / peek-map / peek-character
- README：移除行加優先序、「觸控按鈕」註真實觸控已驗證、新增「移除優先序」bullet、測試表 84→98 項
- 舊截圖：對照 shot() 列表刪 b24-after-reload（b24 讓位給 remove-top-decor）

## 第十三輪（Jerry 回饋 2 點）

### 13a ✅ 字體統一（commit 346a332）
- Jerry：「出門後的字體混亂，又醜，換個可愛活潑一點的」
- 根因：地圖/打工 canvas 用 Google CDN 的 Long Cang（細手寫體，離線 fallback cursive 就亂；與全域圓體 RHR 混著用＝混亂）；shop-title/loading-quote 也用 CDN 字
- 全部換成本地 **RHR**（資源圓體、變體字 200-900、可離線），大字用 900 加粗更可愛活潑；移除 Google Fonts link（preconnect/link/.font-hand inline style）
- 位置：mapscene.js ×2（我的家 700 24px / 麥當勞 900 40px）、mini.js ×10（900~600 重量）、style.css ×3（loading-text 48px/800、loading-quote 500、shop-title 900）
- 子集字重跑：/tmp/fontenv/bin/python tools/make-font.py tools/full/ResourceHanRoundedTW-VF.otf
- 驗證：招牌放大截圖無豆腐字、canvas 全換圓體、flow+peek-map 回歸通過

### 13b ✅ 打工資料層＋關卡選擇（commit 1973dd9）
- WORK_INGREDIENTS 5 種（+起司 cheese、drawIngredient 加 case）
- WORK_ITEMS 5 品項：經典漢堡 5 步$20／起司吐司 3 步$15／蔬菜堡 5 步$25／雙層堡 5 步$30／特製套餐 6 步$40（各自 recipe）
- WORK_LEVELS 5 關：新人上工/熟手班/忙碌時段/午休尖峰/全店總動員；queue 1→5、patience 20s→8s、payMul 1.0→2.0、L4+25%／L5+35% 尖峰客、menu 由簡到繁
- 商店「開始打工」鈕 → 5 張關卡卡（🔒鎖定/★最佳/點卡開工）；訂單氣泡顯示品項名＋drawMenuItem 堆疊小圖示
- 存檔加 work 進度；下工存檔改 fullSave（補上舊版漏存的牆飾/換色）
- 修：舊 #btn-start-work 綁定死引用移除；flow/peek-map 改 .level-card 點卡＋食譜驅動點卡（L1 訂單改隨機）

### 13c ✅ 排隊＋耐心＋尖峰客（commit 2a1f506）
- Work.queue[] 陣列取代單一 customer（customer = 第一個 state 'queue' 的 alias，舊程式碼/測試相容）
- queueSlot：x=700-i*95、y=430-i*14、scale 1→0.48（i*0.13）——越後越小越遠的透視深度；所有人 lerp 移動（服務/氣走時後排自動上前）
- 耐心：服務中客人頭上 patience 條（綠→橘→紅），歸零→💢 氣走左離場（misses++、報廢已疊料＋取消在半空的餐點）、served💖右離場、0.9s 淡出後移除
- 補客：queue 不足 level.queue 就從 0 長大補新客；3-2-1 倒數期間也要長大（否則倒數 3 秒客戶隱形）
- 尖峰客⚡：patience×0.6、pay×1.5、畫⚡；排隊中客人頭上有小訂單圖示
- peek-map 加 patience 測試（強制 0.4s→氣走 miss=1＋補新客）；L5 五人大縮小截圖目視通過

### 13d ✅ 連擊小費＋星星結算＋解鎖（commit 57b11cc）
- 連擊：每 3 連完成 +10 小費（左上 🔥 連擊 xN 顯示）；點錯/氣走中斷
- 結算畫面：下工停 4.2s 顯示星星評價（依 goals 彈出★、新紀錄✨、氣走人數、未達★提示），取代舊版單句「時間到」
- 星星：goals=[★1,★2,★3 完成數門檻] 每關不同（L1 [4,8,12] … L5 [5,9,12]）；★1 起解鎖下一關、Game.work.best 存最佳
- 新 test/peek-work.mjs 18 項：5 卡/鎖定、L1 排隊、3 連小費 money 精算、氣走補客、L5 五人深度遞減、L5 goals、4 單結算★1＋解鎖第 2 關、商店卡列★☆☆、reload 存檔持久、0 pageerror

### 13e ✅ 全回歸＋文件（本輪 commit）
- 七套件全過：flow（32 步）/ peek-build（98 項）/ peek-recover / peek-bgm-filefix / peek-character / peek-map / peek-work（18 項）
- README：打工章節全面更新（五關/排隊/耐心/連擊/星星）、測試表加 peek-work
- 字型子集 914→947 字（含新文案：連擊小費/新紀錄/氣走等）

## 第十四輪（Jerry 回饋 2 點）

> 📌 **接手筆記**（11-06 更新）：第十四輪**全部完成** ✅（14a c5475be、14b 716c7cd、14c 4fc5062/045ca8a/c442294/0f269bb、14d 3ba4d21/884595d/aee3878/9351523/f1d08e5/51be057/f3119b3/fef1383、14e 本 commit：九套件複跑全過＋README 更新）。Jerry 2 點要求皆交付：① 手機操作（14a/14b）② 節慶裝飾含歲數氣球（14c/14d）。**新 session：等 Jerry 新一輪回饋** → 開新輪章節（照 P2 工作流：預查→小 commit 拆分→逐段測試→回歸→文件）。每完成一個子階段就 commit（commit message 用繁體中文）＋把本節對應 📋 改成 ✅＋hash。另見 TERMINATED-ANALYSIS.md §6：舊 session context 過大會 terminated，**新 session 才能吃到 900s timeout**。

### Jerry 的要求
1. **支援手機操作**（直式手機能完整遊玩）
2. **建造新增節慶裝飾**：台灣常見節慶（春節、萬聖節、聖誕節…）＋生日的蛋糕、牆壁掛歲數氣球、各種裝飾

### 14a ✅ 手機基礎：canvas 觸控＋viewport＋CSS＋基礎手機測試（commit c5475be）
1. ✅ viewport meta：補 `maximum-scale=1, user-scalable=no, viewport-fit=cover`
2. ✅ `#game-canvas { touch-action: none; }`＋game.js：`touchstart/touchmove`（passive）取 `touches[0]`、與 mousemove 同公式寫 `Game.mouse`＋`contextmenu` preventDefault（tap→原生 click 全數重用既有邏輯；拖曳→只移 ghost 不誤放）
3. ✅ 手機 CSS（≤820px）：`100dvh`（iOS 動態視口）、建角預覽框 300→**484px**、建角頁固定高度內部捲動、建造面板全寬、對話框收小、hint-bar 可換行、dpad/place-actions 46×40、place-actions 上移、商店關卡卡折行＋預覽下移＋面板超高可捲動
4. ✅ 新 `test/peek-mobile.mjs` 13 項：390×844 hasTouch 真實觸控全流程（tap 封面→建角→睜眼→對話推進→wakeup→起來→meet→建造教學 tap 床卡→**CDP 手指拖曳 ghost**→tap 放床→誇獎→出門→地圖 tap 走路→回家）0 pageerror（shots/m01-m11）

**本輪抓到的 bug（手機截圖目視 QA）：**
- **建角預覽只剩一顆頭**：canvas `flex:1` 被 replaced element 的 `min-height:auto`（本徵 400px）頂住、300px 框把身體裁掉→手機預覽框改 484px（canvas 完整不壓縮；桌面 400px 本就剛好、未動）
- **放置中 hint-bar（3 行）蓋住 place-actions**（🔄/✖️ 按不到）→ 手機 place-actions 上移到 `bottom:112px`

**驗證**：peek-mobile 13 項全過 0 pageerror；flow.mjs 32 步桌面回歸 0 失敗（手機 CSS 全在 media query 內，不影響桌面）

### 14b ✅ 手機全流程（commit 716c7cd）
- ✅ peek-mobile.mjs 14a 的 13 步 13 項 → **21 步 40 項斷言**（全過 0 pageerror、截圖 m01-m23）：
  - 建造深化：牆飾 tab→心形框→CDP 拖曳上牆 B pos2（ghost 跟手）→tap 掛上→tap 牆飾進 **wallAdj**→tap **▲** 調高→tap 確認寫入→**移除模式** 🧹 卡→tap 牆飾移除→✖️ 退出
  - 商店（手機版）：tap 買制服 50＋帽子 30→錢-80、`Game.gear` 標記
  - 打工 L1：tap 關卡卡→倒數→依訂單食譜 tap 食材卡→上菜 count=1 工資入帳→快轉結算（`Work.left→0`，不等 60s 班）
  - 重新整理續玩：床還在、錢持久（含工資）、子狀態合法
- **調查發現（未改遊戲 code）**：
  - `#work-x`（exitWork）不存檔是既有設計——存檔在班末結算 `endWork→saveGameEndShift`（fullSave＋work 進度）；測試改快轉結算驗證存檔路徑
  - 打工場景手機偏小（場景帶約 263px 高、食材卡約 64×44px 仍可點）→ **記為日後 polish 建議**（手機置景放大，可開新輪）
  - 商店手機版 14a CSS 已撐住：關卡卡 2 欄折行、面板超高可捲、結算/續玩畫面皆可讀

### 14c ✅ 節慶地面裝飾＋🎉 節慶分頁（commits：c1 4fc5062／c2 045ca8a／c3 c442294／c4 0f269bb）
**資料**（BUILD_ITEMS，js/world.js:961，tab:'fest'）：
| id | 名稱 | 節慶 | w×d | max | 備註 |
|---|---|---|---|---|---|
| cake | 生日蛋糕 | 生日 | 1×1 | 1 | onFurn 可放家具上 |
| giftBox | 禮盒 | 聖誕/生日 | 1×1 | 3 | onFurn |
| xmasTree | 聖誕樹 | 聖誕 | 1×1 | 1 | |
| pumpkin | 南瓜 | 萬聖 | 1×1 | 2 | |
| lantern | 紅燈籠 | 春節 | 1×1 | 2 | |
| firecracker | 鞭炮 | 春節 | 1×1 | 2 | |
| balloonBunch | 一束氣球 | 生日 | 1×1 | 2 | |

**onFurn 機制**（蛋糕/禮盒可放家具上，沿用第十一輪 b 的 surfaceHAt/drawLifted）：
- 給品項加 `onFurn: true` 旗標
- 要改的 lift 判定（目前只看 `it.tab === 'decor'`）：game.js ~722（繪製 lift）、~762（ghost lift）、~1365-1366（移除優先序 score）＋ world.js 11b 的 `cls()` 重疊分類
- floorValid 不用改（同類不可重疊邏輯已通用）

**🎉 分頁**：
- index.html:130-135 build-tabs 加 `<button class="btab" data-tab="fest">🎉 節慶</button>`（放地飾之後）
- js/game.js:1068 BUILD_TABS 加 `fest: '🎉 節慶'`
- selectBuildTab（game.js ~1103）加 `tab === 'fest'` 分支：`BUILD_ITEMS` 中 `tab==='fest'` → floorCard ＋ `WALL_ITEMS` 中 `tab==='fest'` → wallCard（14d 才有）
- 現行 'wall' 分支列出**全部** WALL_ITEMS（~1159-1166）→ 要加 filter `it.tab === 'wall'`，否則 14d 的牆上節慶會重複出現
- 教學鎖：inTutorial（stage==='created'）時 fest 分支顯示「先完成放床教學」（照 remove/renovate 分支的 emptyMsg 模式）

**繪製**：world.js 新增 draw 函式（用 handEllipse/handShape 手繪風）；floorCard 預覽用 `s = Math.min(0.72, 78 / (it.h + (it.w + it.d) * 8))` 公式自動縮放（h 記得給合理值）

**✅ 完成紀錄**：
- 按 TERMINATED-ANALYSIS.md plan 拆 4 個小 commit 做（防大 context terminated）：c1 7 個 draw 函式（4fc5062）／c2 目錄＋onFurn（045ca8a）／c3 UI＋lift（c442294）／c4 peek-fest 專測＋修正（0f269bb）
- onFurn 最終實作：cake/giftBox 加 `onFurn: true`；floorValid blocked 判定改 `it.tab !== 'decor' && !it.onFurn`（onFurn 可放家具 blocked 格）；cls 把 onFurn 歸 decor 同類；itemDepthAt 與 game.js lift×3＋移除 score 統一用 `(it.tab === 'decor' || it.onFurn)`
- 🎉 分頁：index.html 加按鈕、BUILD_TABS＋selectBuildTab 加 fest 分支（教學中 emptyMsg「先完成放床教學，就能放節慶裝飾囉～」）；wall tab 加 filter `it.tab === 'wall'`（防 14d 重複）
- 修正：氣球束 3 顆本體漏加 dx 偏移（疊在同一 x 看起來只剩一顆）→ 補 `bxc + b.dx`
- 測試：test/peek-fest.mjs 21 項全過（教學鎖／7 卡／7 件放置／onFurn 書桌 valid＋surfaceHAt=34／max dis／移除／存檔重載）、0 pageerror；南瓜測試位 (5,5)→(3,8)（原位被書桌禮盒遮住）
- 回歸：flow 32 項 ✅／peek-build ✅／peek-mobile 通過（14c 首跑遇 1 次偶發 flake：step 16 移除牆飾 tap，目標在手機上 hit 寬僅 ~12px、touch→mouse 競態）→ peek-mobile 該步加失敗補一拍（獨立小 commit）

### 14d ✅ 節慶牆飾（含歲數氣球）
**資料**（WALL_ITEMS，js/world.js:1227，tab:'fest'）：
| id | 名稱 | 節慶 | span | max | 備註 |
|---|---|---|---|---|---|
| couplet | 春聯 | 春節 | 1 | 2 | 直長條 |
| fuChar | 福字 | 春節 | 1 | 1 | 倒貼紅底 |
| wreath | 冬青花環 | 聖誕 | 1 | 2 | |
| lights | 彩燈串 | 聖誕 | 2 | 1 | 照 garland 跨槽 |
| cobweb | 蜘蛛網 | 萬聖 | 1 | 2 | 角落 |
| numBalloon | 歲數氣球 | 生日 | 1 | 1 | **數字 1-9 可選** |

**歲數氣球設計**：
- wallItems 存 `num`（1-9）；舊存檔/無 num → 預設 8
- 放置中按 R／🔄 循環換數字（1→2→…→9→1）——要讓 place-actions 的 #pa-rot 在**牆飾放置**時也出現（目前 updatePlaceActions 只給非正方形地面品項顯示）
- 已掛的 numBalloon 進 wallAdj 模式時 🔄 也能換數字（點一下確認寫入存檔）
- draw 畫氣球＋中間數字（RHR 900）

**測試**：peek-build.mjs 加節慶段（地面放置/onFurn 上家具/牆飾掛/歲數氣球換數/reload 持久/移除）

**📋 預查（11-05，給新 session 直接接手；14c 插碼後行號已位移）**：
- **座標慣例**：wallSlotFromMouse 的 `pos`＝tile 索引（0..N-span）；`wallSpace`（world.js:1557）origin＝slot 左緣 `P(pos)`，local x 沿牆、y 向下；span-1 品項在 local `(0,0)` 附近畫（跟 heartFrame 等一致）、span-2（garland）local 0 為中心 ±36；**繪製與 hit 都用 `pos + 0.5*span` 當 draw 中心**（game.js 682/685/688、wallItemHit world.js:1566）→ 新 draw 照既有 local 慣例畫即可，勿「修正」中心。
- **WALL_ITEMS**（world.js:1511）結構 `{ name, tab, max, span, hMid, hitW, draw }`；draw 簽名 `draw(ctx, wall, pos, o)`；`o.ghost`→alpha×0.62、`o.tint==='bad'`→bad 色（#DE8794 主色、#C96A7A 線）。
- **品項參數（擬定）**：couplet hMid175 hitW14／fuChar hMid160 hitW15／wreath hMid185 hitW17／lights hMid235 hitW36 span2／cobweb hMid245 hitW16／numBalloon hMid185 hitW16 ＋ `numSelectable: true`。
- **num 邏輯整合點（11 處，全部已定位）**：
  1. world.js draw×6：插在 drawWallGarland 之後、`WALL_H_MIN` 註解前（~1505）；numBalloon 數字用 `ctx.font='700 19px "RHR", sans-serif'`、`o.num ?? 8`、textBaseline middle
  2. world.js WALL_ITEMS（1511）：＋6 項（tab:'fest'）
  3. game.js fullSave（1333）：wallItems.map 加 `num: w.num`（undefined 會被 JSON 剔除、不影響其他品項）
  4. game.js load（138）：map 加 `num: w.num != null ? w.num : 8`（舊存檔預設 8）
  5. game.js startWallPlacement（1291-1299）：placement 加 `num: 8`；numBalloon 時 hint 文字補「R/🔄 換數字」
  6. game.js wall 確認（962）：push 加 `num: pl.num`
  7. game.js R 鍵（854）：＋wall/wallAdj 分支，`WALL_ITEMS[pl.item].numSelectable` 時 `pl.num = pl.num % 9 + 1`
  8. game.js pa-rot（1024-1030）：＋wall/wallAdj numBalloon 分支（同 7，含 updatePlaceActions()）
  9. game.js updatePlaceActions（412-426）：wall 分支 showRot＝品項 numSelectable（目前只 floor 非正方形才顯示 🔄）
  10. game.js wallAdj init（940）：加 `num: w.num != null ? w.num : 8`；hint 補「R/🔄 換數字」；wallAdj 確認（973）：numSelectable 時 `Game.wallItems[pl.idx].num = pl.num`
  11. game.js 渲染（675-689）：實物 `o={h:w.h}` 加 `num: w.num`；wall ghost 加 `num: pl.num`；wallAdj ghost 加 `num: adjPl.num`
- **字型（重要）**：子集缺 16 字（含 14c 漏跑的）：`蛋 糕 禮 聖 誕 南 瓜 爆 竹 春 聯 冬 蜘 蛛 網 歲`（福 已有✓）。加字後**必重跑** `/tmp/fontenv/bin/python tools/make-font.py tools/full/ResourceHanRoundedTW-VF.otf`，`fonts/rhr.woff2` 併入同一 commit（腳本自動掃 index.html/js/css 收字；canvas 數字 1-9 已在子集✓）。
- **繪製小提醒**：牆面是奶油色（wallC tint）→ 蜘蛛網線用灰調 `rgba(140,150,180,.9)`（白色對比不足）；fuChar 倒貼＝紅菱（rotate 45° 正方形）＋福字 rotate(PI)。
- **拆分**（照 14c c1-c4 模式）：
  - d1 ✅（3ba4d21 draw×3 春聯/福字/冬青花環、884595d draw×3 彩燈串/蜘蛛網/歲數氣球、aee3878 WALL_ITEMS×6＋字型重跑 947→1013 字，14c 漏字 16 個全補進✓；視覺 QA 13 卡/6 件放置/數字 8/0 pageerror）
  - d2 ✅（9351523 d2a 存檔/載入/placement/確認、f1d08e5 d2b R 鍵/🔄 鈕/updatePlaceActions＋draw NaN 防呆、51be057 d2c wallAdj＋渲染 o.num×3；11 處全整合）
  - d3 ✅（peek-build 加 section 10½ 共 29 項：13 卡/移除騰槽×3/掛 4 件/彩燈串 🔄 隱藏＋R 不崩/歲數氣球初始 8/R→9/🔄→1/🔄→2/掛上 num=2/wallAdj num 2→3 確認寫入/reload num=3 持久＋其他補 num=8/移除；修 3 小問題：balloonPt 與 section 9 重名、Esc 移除模式後面板停 remove tab、section 7 JSON 精確比對多 num:8；125 項全過、新增截圖 b26-b29）
  - d4 ✅（全 9 套件回歸全過：flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile；修 peek-fest 卡數預期 7→13，因 14d 加 6 牆飾卡；本 commit）

### 14e ✅ 全回歸＋文件＋報告
- ✅ 九套件全過：flow / peek-build / peek-recover / peek-bgm-filefix / peek-character / peek-map / peek-work / **peek-fest** / **peek-mobile**（14e 複跑確認無回歸，9/9 exit=0）
- ✅ README：新增「手機操作（第十四輪）」章節、建造表加節慶行（7 地＋6 牆）、操作說明補歲數氣球 R/🔄 換數字、測試表更新（peek-build 98→125 項、加 peek-fest/peek-mobile 兩行）
- ✅ PROGRESS 收尾＋向 Jerry 報告（本輪 summary）

### 關鍵位置速查
| 東西 | 位置 |
|---|---|
| viewport meta | index.html:5 |
| canvas mouse 事件（mousemove/wheel/click） | js/game.js ~876/883/890 |
| ws/offX/offY 縮放 | js/game.js 83-85（onResize 45） |
| click 主 dispatch（fp/wakeup/free/placing…） | js/game.js ~890 起 |
| BUILD_ITEMS（地面/家具/擺飾/地飾） | js/world.js:961 |
| WALL_ITEMS＋WALL_FORBID＋wallSlotValid | js/world.js:1227 |
| BUILD_TABS | js/game.js:1068 |
| setupBuildUI/openBuildPanel/selectBuildTab | js/game.js 1080-1103 |
| floorCard（卡片預覽 canvas 128x84） | js/game.js ~1178 |
| wallCard | js/game.js（floorCard 附近） |
| build-tabs HTML | index.html:128-135 |
| 小螢幕 media query | css/style.css:665-670 |
| dpad / place-actions CSS | css/style.css:319-355 |
| #game-canvas CSS（加 touch-action 處） | css/style.css:29 |
| surfaceHAt/drawLifted/itemDepth（onFurn 重用） | js/world.js（第十一輪 b） |
| 字型子集重跑（新增中文後必做） | `/tmp/fontenv/bin/python tools/make-font.py tools/full/ResourceHanRoundedTW-VF.otf`（現 947 字） |
| 存檔 key | `cute-kingdom-save-v1` |

### 檔案規模（供估算）
index.html 263 / css/style.css 670 / js/game.js 1521 / js/world.js 1293 / js/mini.js 584 / js/mapscene.js 206 行

## 第十五輪：人物擺拍姿勢（Jerry 要求：支援人物各種擺拍姿勢；已批准 10 姿勢含 🧘/🫡/💪/😉）

> 📌 **接手筆記**（11-07 更新）：**第十五輪全部完成**（e1 繪製層 10 姿勢＋坐姿/啾咪/前層手臂、e2 狀態機 P 鍵/📷 鈕、e3 拍照 C 鍵/📸 鈕、e4 29 項專測、e5 十套件回歸＋README）。字型 1036 字。等 Jerry 新回饋；地圖場景擺拍為加分項未做（→已於第十六輪 16a 實作 ✅）。另見 TERMINATED-ANALYSIS.md §6。

### 功能設計（已批准）
- **10 種擺拍姿勢**（character.js `POSES` 表＋`drawCharacter` 新增 `o.pose = { id, t }` 參數）：
  | id | 名稱 | 特效 emoji | 實作要點 |
  |---|---|---|---|
  | peace | 比耶 | ✌️ | 右手舉頭旁 (26,-70)、elbow (22,-48)、hand:'peace'（V 兩指線） |
  | wave | 揮手 | 👋 | 右手 (25+sin(t*10)*4, -72)、elbow (22,-48) |
  | cheer | 歡呼 | 🙌 | 雙手 (±24,-70±sin 錯相)、elbow (±20,-50) |
  | dance | 跳舞 | ♪ | 全身 sway：ctx.rotate(sin(t*6)*0.09) 以腳為樞；雙手交替 (±24, -55∓sin(t*6)*12) |
  | hug | 張開雙臂 | 💕 | 雙手水平 (±28,-30)、elbow (±22,-33) |
  | pray | 比心合掌 | ❤️ | 雙手胸前合十 (∓2,-30)、elbow (±16,-28)、hand:'prayer'（單顆豎長合掌） |
  | meditate | 打坐 | 🧘 | **seated**：站姿腿換盤腿（上身體 translate(0,8) 下移、盤腿畫在最後最前層）、eyes 閉、雙手放膝 (±13,-16) |
  | salute | 敬禮 | 🫡 | 右手到額前 (12,-68)、elbow (24,-42)、hand:'fist' |
  | flex | 秀肌肉 | 💪 | 雙臂彎屈：elbow (±26,-42)、手 (±22, -60+sin 錯相)、hand:'fist' |
  | wink | 啾咪 | 😉 | **臉**：drawFace 加第 9 參 `winkSide`（單眼閉＝闭眼弧線、另眼照畫）＋頭頂 😉 特效；手臂 idle |
- 坐姿（meditate）畫法：腿段改畫盤腿兩條 capsule＋鞋；torso→arms→head→gear 段包 `ctx.save(); ctx.translate(0,8); … ctx.restore()`；盤腿在 restore 後畫（最前層）；影子改寬扁
- 姿勢手臂畫法（通用）：shoulder=(side*15.5+fx*2.5, -36+bob*0.3)；有 pose 手標時畫 upper(shoulder→elbow)＋forearm(elbow→hand)；短袖上段衣色 7/前段膚色 6、長袖全衣色 7；hand 膚色 ellipse 3.7（fist 4.2）；peace 加兩指線
- **特效**：headY-R-12 上方填 emoji（fillText 16px，bob sin(t*3)*3）；dance 兩邊各一個 ♪
- **互動**（game.js）：
  - 只在 `sub==='free'`（房間）可用；按 **P** 或 📷 鈕循環下一姿勢：`p.pose = { id, t: 0 }`、`p.facing='down'`、`p.walking=false`、sfx('pop')、toast（label）
  - 姿勢 1.8s 自動恢復（tick 累加 `p.pose.t`）；**按移動鍵取消**
  - **📸 拍照**：C 鍵或 📸 鈕 → `#game-canvas`.toDataURL → a.download `cute-kingdom-<ts>.png`（全程序化繪製無跨域，安全）；sfx('blip')＋toast
  - UI：index.html 右下新增 `.pose-actions`（📷＋📸 兩鈕，bottom:16px right:16px——注意與右下「出門/建造」鈕不重疊，看 CSS 定位置）；setSub('free') 顯示、其他隱藏
- **不存檔**（姿勢是瞬間動作）；地圖场景不做（加分項，之後要再加 mapP.pose）

### 拆細
- e1a ✅（7fd45c6）：character.js `POSES` 表＋drawCharacter pose 手臂/sway/特效支援（peace/wave/cheer/dance/hug/pray/salute/flex 八個站姿）
- e1b ✅（7fd45c6）：character.js 坐姿（meditate 盤腿＋下移）＋wink（drawFace winkSide 參）
  - 目視 QA 全過（shots/p1-*.png，test/peek-pose-qa.mjs）；Jerry 回饋修正：**高舉的手（y≤-50）改在 head 之後前層畫**（frontArms＋drawPoseArmSeg），比耶/揮手/敬禮的手不再被臉擋
  - 字型子集重跑：1013→1035 字（POSES label 新字），fonts/rhr.woff2 已併入
- e2 📋：game.js 姿勢狀態機（P 鍵/tick 1.8s 自動恢復/移動取消/toast/sfx）＋📷 鈕＋show/hide
- e3 ✅（bd87f1e）：📸 拍照（C 鍵＋📸 鈕＋PNG 下載 cute-kingdom-<ts>.png）＋按鈕疊在擺拍鈕上方（bottom:270px）；字型 1036 字
- e4 ✅（ca61569）：test/peek-pose.mjs 29 項全過＋十姿勢遊戲內截圖 pp01-pp11
- e5 ✅：九套件回歸全過（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile）＋新 peek-pose 共 10/10；README 操作說明＋擺拍拍照 bullet＋測試表加 peek-pose 29 項；截圖 115 張隨回歸更新

### 預查備忘
- drawCharacter：js/character.js:129（手臂段 ~262-284、頭段 ~300-318、gear ~320-372）；drawFace :885（簽名 `(ctx,c,x,y,R,gz,closed,t)`，閉眼弧線樣式可複製給 wink）；drawEye :978
- 既有 o 參：x,y,scale,alpha,t,walking,facing,gaze,eyesClosed,blink,gear；新增 o.pose
- drawFace 呼叫點：drawCharacter(~311)、drawLying(~1079)、drawPortrait(~1108)、dialogue.js:77——winkSide 用第 9 參預設 0，不改其他呼叫
- sfx 可用：click/confirm/back/place/pop/blip/toast/whoosh/wake/ding/buzz/coin/tick/fly（js/audio.js:71）
- toast：showToast（game.js）；鍵盤 dispatch ~843-873（P/C 未佔用）；setSub :205（dpad show 邏輯 :214 可參考）
- player state：`Game.player = { x, y, facing, walkT, walking, gaze, eyesClosed, getup }`（game.js:13）
- peek-build.mjs 的 done 存檔注入法可照抄給 peek-pose（localStorage `cute-kingdom-save-v1`）
- capsule/ellipse/roundRectPath/shade 等 helper 都在 character.js 同檔可用

---

# 第十六輪（11-07 開工）：地圖擺拍＋牆飾同槽疊掛＋封面圖

Jerry 需求三點：
1. 地圖場景也支援擺拍
2. 建造的牆飾支援同槽多個（上下錯開即可，垂直範圍不重疊就 OK）
3. art/game-cover.png 作為遊戲封面

## 預查備忘
- **地圖角色**：`Game.mapP = { x, y, facing, walkT, walking }`（game.js:35，loading 結束重置 :352）；draw 點 `js/mapscene.js:200` `drawCharacter(ctx, Game.playerCfg, { x, y, facing, t, walking, scale: 1 })`——加 `pose: m.pose || undefined` 即可
- **地圖移動**：game.js 'map' case（~:297）：WASD/dpad 直移＋mapTarget 滑動；取消姿勢在「有方向鍵或 mapTarget 時」清 m.pose
- **startPose**（game.js:592）：目前 `if (Game.sub !== 'free' || p.getup < 1 || Dialogue.active) return;`——mapP 沒有 getup 屬性（undefined<1 會誤殺），要拆條件；takePhoto（:607）`Game.sub !== 'free'` 同要放寬
- **setSub**（:205）：pose-btn/photo-btn 目前 `sub !== 'free'` 隱藏→改成 free/map 都顯示；map 子狀態已有 map-home 鈕（bottom:26）＋dpad，pose(194)/photo(270) 不衝突
- **P/C 鍵綁定**：已直接呼叫 startPose()/takePhoto()，不用改
- **牆飾驗證**：`wallSlotValid(id, wall, pos)`（world.js:1706）目前同槽有品即拒（`w.pos === p`）→ 改垂直範圍檢查：加 `sizeH` 欄（量自各 draw 函數 local y 範圍）＋簽名加 `(h, excludeIdx)`
- **sizeH 量測**（wallSpace local 座標、原點=中心 h）：heartFrame ±23→46、starFrame ±22→44、clock r17→34、poster -24..21→46、wallShelf -19..11→30、garland -10..12→24、couplet -33..33→66、fuChar 菱 ±14.8→30、wreath 環+蝴蝶結→36、lights -10..14→26、cobweb →32、numBalloon -13.5..17→32
- **碰撞公式**：slot 有交疊 且 `|h1-h2| < (sizeH1+sizeH2)/2 + 2` → 拒（留 2px 縫）
- **wallSlotValid 呼叫點**：game.js:341（mousemove，mode 'wall' 分支）；:1371（startWallPlacement 初始 valid:false 不用改）；**wallAdj 目前 mousemove 沒有 valid 分支、確認段（:1033）直接寫 h 不驗證**→要加 wallAdj 分支＋確認時檢查（excludeIdx=pl.idx）
- **封面**：`#screen-cover`（index.html:17-23）`.cover-card` 內有 hearts/title/note「（封面製作中）」/credit/enter 鈕→加 `<img class="cover-art" src="art/game-cover.png">`＋刪 note；css `.cover-art { height:min(58vh,...); object-fit:contain; border-radius }`；圖 1086×1448 直式 3.35MB（離線本地遊戲可接受）
- **測試**：peek-pose.mjs 加地圖段（#out-btn→等 sub==='map'→P/mapP.pose/按鈕顯示/C 下載/移動取消）；peek-build.mjs 加同槽疊掛段（同 pos 不同 h 可掛、垂直重疊拒、wallAdj 拖入重疊拒）
- **commit 拆細**：16a 地圖擺拍→16b 牆飾疊掛→16c 封面圖→16d 回歸+README+報告

## 子任務
- 16a ✅：地圖擺拍（mapscene.js pose 參數＋game.js map case tick/取消＋startPose/takePhoto/setSub 放寬 map）＋peek-pose 地圖段
- 16b ✅：牆飾同槽疊掛（world.js sizeH＋wallSlotValid(h,excludeIdx)＋game.js 呼叫點+wallAdj 驗證）＋peek-build 新段
- 16c ✅：封面圖（index.html＋css＋刪「封面製作中」備註）
- 16d ✅：十套件回歸 10/10 全過（分兩段 5+5 跑）＋README 6 處（操作說明/建造表×2/擺拍 bullet/第十六輪 bullet/測試表 peek-build 138 項、peek-pose 35 項）＋截圖 121 張重拍（含新封面 01-cover）；字型維持 1042 字

> 📌 **接手筆記**（11-07 更新）：**第十六輪全部完成** ✅（16a b02c338、16b b2cfe14、16c ac741cb、16d 本 commit；另 30a26ff 為 Jerry 自加的 README 版權條款）。三點需求皆交付：① 地圖場景擺拍＋拍照 ② 牆飾同槽多件（上下錯開）③ 正式封面海報。字型 1042 字。等 Jerry 新回饋 → 開新輪章節（照 P2 工作流）。

## 發布上線（GitHub Pages）流程（11-07 建立）
Jerry 一句「把這版可愛國發布上線」＝執行以下：
1. 前提：git 樹乾淨（先 commit 完所有改動）、`gh auth status` 已登入
2. `git push -u origin main --force`（origin = https://github.com/unclejerry20050727-code/cute-kingdom.git；本地 main 是唯一 source of truth，遠端舊歷史是 11-07 前手動推的 2 個 commit，已不相關，故 force）
3. Pages 自動從 main 分支 root 重新部署 → 約 1 分鐘後生效
4. 驗證：`gh api repos/unclejerry20050727-code/cute-kingdom/pages` 看 status=built；再 `curl -s https://unclejerry20050727-code.github.io/cute-kingdom/ | head` 確認 200
- 線上版：https://unclejerry20050727-code.github.io/cute-kingdom/
- 注意：push 前確認 `git log origin/main..main` 的 diff 是預期內容（避免把半成品推上去）

### 發布紀錄
- **11-08 第 2 次發布**（第十七輪 3 bug 修復）：`b5b1d3f..37c7f92`（5 commit：9999779 字型、c70a333 iOS 下載、ba7fb59 卷卷頭、625de19 AGENTS、37c7f92 e5）；Pages build `built/37c7f92`；驗證：rhr-500/700/900.woff2 皆 200、舊 rhr.woff2 404、CSS 三權重皆 `?v=17`、game.js 有 toBlob、character.js 有 drawCurlyBangsCap。待 Jerry iPhone 實測確認①攻擊②拍照③卷卷頭。

## 第十七輪：Jerry 回報 3 個 bug（11-08）

需求：
1. **e1/e2 拍照按鈕偶發顯示成「攻擊」**（ Jerry 猜是英文翻譯問題）
2. **e3 iPhone 拍照後「檢視或下載」提示出來但看不到圖**
3. **e4 卷卷頭正面沒有捲**（背面有捲，正面變光頭圓球）
4. **e5 回歸＋報告**

> 📌 **接手筆記**（11-08 更新）：**第十七輪全部完成** ✅（e2 9999779、e3 c70a333、e4 ba7fb59、e5 本 commit）。三個 bug 皆修：① 拍照按鈕偶發「攻擊」→ CFF2 VF 改靜態 glyf 三權重 woff2 ② iPhone 拍照看不到圖 → toBlob+objectURL ③ 卷卷頭正面無捲 → drawCurlyBangsCap 扇貝捲＋捲瀏海＋旋渦紋。**待 Jerry 在 iPhone 實測確認**（尤其①②，需 iOS 實機）；若①還出現請回報 iOS 版本。

### e1 調查記錄
- `fonts/rhr.woff2` cmap 驗證正確：拍 U+62CD→uni62CD、照 U+7167→uni7167、擊 U+64CA→uni64CA、攻 U+653B 不在字庫（遊戲從沒用過）
- git 歷史 8 個版本 rhr.woff2 的 cmap 全部正確
- 全 repo grep「攻擊/attack」無此文字（只有 audio.js 音訊包絡的 `attack` 參數）
- index.html 按鈕是靜態 `<span>拍照</span>`，不是動態產生
- Chromium 全部正常（Playwright 截圖從沒出過錯字）→ 只可能出在 Jerry iPhone 的 WebKit
- 網路線索：google/fonts#7196（WOFF/WOFF2 在 iOS 17 之前的 Apple 裝置渲染錯字）＋ WebKit 對 CFF2/VF 的已知處理問題
- **結論**：舊版 iOS WebKit 誤渲染 **CFF2 變體字** woff2（glyph 錯位），「有時」與字型快取狀態有關
- 本地 WebKit 裝不起來（缺 libflite/libWPE 等系統庫＋無 sudo）→ 改走「相容性最大化」修復

### e2 字型重建（修 e1）
- 新格式：**靜態 TrueType(glyf) 輪廓 woff2 × 3 字重（500/700/900）**——一次消除 CFF2＋VF 兩個風險點
- 新工具 `tools/cff2_to_glyf.py`：cu2qu 三次貝茲→二次貝茲（max_err=1.0）
- `tools/make-font.py` 重寫：子集 VF（去 layout features）→ instancer 固定 500/700/900（ROND=100 預設圓度）→ glyf → woff2
- 字數 1042 不變；總量 652KB（219884+222628+209352）< 舊單一 VF 727KB
- CSS：3 個 @font-face（同 family 'RHR'，各 font-weight 500/700/900）＋`?v=17` cache-buster（強迫手機重下載，順帶排掉舊快取）
- 瀏覽器字重捨入：canvas 600→700、800→900；CSS 200 那處只是舊 @font-face 範圍宣告已移除
- Chromium A/B 對照截圖：舊 VF vs 新 glyf 字形/粗細/圓潤度幾乎無差 ✅
- ⚠️ 以後重跑 make-font.py 記得把 CSS 的 ?v= 加一

## 第十七輪子任務
- e1 ✅：調查（見上）
- e2 ✅：字型重建（9999779）
- e3 ✅：iPhone 拍照下載修（c70a333）：toDataURL→toBlob+objectURL（iOS 13+ blob 下載正常）；peek-pose「拍照不中斷姿勢」改點擊後立即檢查（toBlob 異步延遲會讓 1.8s 姿勢到期）
- e4 ✅：卷卷頭正面加捲（ba7fb59）：新增 drawCurlyBangsCap＝上半圓 9 顆扇貝捲外緣＋下緣 4 段深 U 捲瀏海＋3 個旋渦捲紋；正面/側面都有捲，跟背面風格一致（QA 截圖 /tmp/curly-front-qa.png 確認）
- e5 ✅：十套件回歸 10/10 全過（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose；peek-build 與 peek-map 首跑各 flaky 一次（機器忙碌 timeout / Work.customer 計時 race），重跑皆過）；截圖 121 張因字型重新渲染全部更新，隨本 commit 提交

## 第十八輪：作者署名＋3D 遊樂園（Jerry 要求 11-08）

需求：
1. ✅ 第十七輪字型問題 iPhone 實測**已修好**（Jerry 確認）
2. **18a 首頁署名**：遊戲首頁（封面）標注作者為 **Rainbow**
3. **18b~18j 3D 遊樂園**：出門後地圖新增「遊樂園」地點；進去用 **Three.js** 變成 3D 遊戲；設計幾個有趣的遊樂園遊戲，**指定要有雲霄飛車**

### 設計決策（11-08）
- **Three.js**：UMD 版 r128（`build/three.min.js`，全局 `THREE`）下載到 `lib/three.min.js`（~600KB），保持無建構工具；**延遲載入**（第一次進遊樂園才 `loadScript`，不拖慢首屏）
- **進入動線**：2D 地圖路左側新建築「遊樂園」（摩天輪＋雲霄飛車剪影＋大門口）＋路上脈衝點 PK(490,250)；點/走進 → `sub='park3d'` 全屏 WebGL
- **3D 玩家**：重用現有 `drawCharacter` 畫 4 方向 canvas → `THREE.CanvasTexture` billboard（Sprite），維持美術風格一致
- **控制**：鍵盤 WASD/方向鍵＋既有觸控 `.dpad` 同邏輯（讀 `Game.dpadDir`）；動作鈕（上車/踩踏板/接）新增觸控大按鈕（桌面用 Space/E）
- **三個遊戲**：
  1. **雲霄飛車**（指定）：CatmullRom 軌道（起伏＋1 個迴環）→ 車廂沿軌道；物理＝重力投影到軌道切線＋阻力＋踩踏板加速（Space/🦶 鈕）；收集星星；過終點結算；車速過低停住要重踩
  2. **甜甜圈接接樂**：3D 廣場，左移右移（A/D 或 dpad）拿著籃子接 30 秒內掉下的甜甜圈（torus），計分
  3. **摩天輪**：坐上座艙，輪子慢轉一輪；沿途星星點一下（tap/click 射線）收集；輕鬆向
- **獎勵**：每遊戲星星換硬幣（1★=2🪙）直接加 `Game.money`；`Game.park={stars,best:{coaster,catch,wheel}}` 存檔（fullSave 加欄位，舊檔缺欄位時補預設）
- **離開**：Esc / 「離開遊樂園」鈕 → 回地圖（sub='map'，玩家站回 PK 附近）
- **WebGL 測試**：Playwright headless Chromium 預設有 SwiftShader WebGL；`test/peek-park.mjs` 驗證：three 載入、進園、移動、進雲霄飛車、車廂位移、星星收集、離開無 pageerror
- 音效：复用 `sfx()` 既有音（pop/blip/win 等）

### 子任務
- 18a ✅：封面署名「作者：Rainbow」（index.html .cover-credit）＋字型 1042→1054 重建＋?v=18（`d8135ad`）
- 18b ✅：lib/three.min.js（r128 UMD 603KB，REVISION=128 驗證）＋util.js `loadScript()` 延遲載入（Promise 快取）（`0e3c7ab`）
- 18c ✅：2D 地圖畫遊樂園（摩天輪＋雲霄飛車鐵軌＋大門口「遊樂園」招牌）＋粉紅「玩」脈衝點 PK(490,300)＋移樹（`26538bc`）
- 18d ✅：3D 基礎（js/park3d.js）：場景/天空霧/廣場/裝飾摩天輪＋雲霄飛車軌道/3 站點/玩家 billboard/移動/離開/HUD
- 18e ✅：雲霄飛車小遊戲（js/park-coaster.js）：軌道物理/踏板加速/4 星星/結算/相機跟車
- 18f ✅：甜甜圈接接樂（js/park-catch.js）：30 秒接 torus（糖霜）／左右移動／難度漸進／結算
- 18g ✅：摩天輪小遊戲（js/park-wheel.js）：坐 0 號座艙慢轉一圈／4 星星自動收集／相機跟座艙
- 18h ✅：存檔＋獎勵（星星換硬幣 1★=2🪙 加 Game.money、Game.park 進存檔、舊檔補預設、離開時存檔）
- 18i ✅：test/peek-park.mjs 正式回歸測試（進園/全景/移動/雲霄飛車含⚡觸控/接接樂/摩天輪/獎勵/存檔/離開，18 項全過）
- 18j ✅：十+1 套件全回歸＋README＋PROGRESS 收尾＋shots 重跑 commit＋發布

> 📌 **接手筆記**（11-08 更新）：**第十八輪全部完成** ✅（18a d8135ad、18b 0e3c7ab、18c 26538bc、18d 20edb4e、18e 5d55dd0、18f 5b5fc34、18g 6a0cb73、18h fe60485、18i 1400c47、18j 本 commit）。署名＋3D 遊樂園（三座設施可玩＋星星換硬幣＋存檔）＋11 套件全回歸＋README 更新。已發布上線。等 Jerry 新回饋（尤其 iPhone 實測 3D 遊樂園：WebGL 效能、觸控操作）。

### 18a 封面署名 ✅（11-08，`d8135ad`）

- `index.html` `.cover-credit`：`作者：Rainbow ・ BGM：Daystar ・ Lukrembo`
- 重跑 make-font.py（1042→1054 字，含「作者」）；CSS ?v=17→18；封面截圖 QA 署名顯示正常

### 18b Three.js ✅（11-08，`0e3c7ab`）

- 下載 `lib/three.min.js`（r128 UMD，603,445 bytes，MIT，驗證 REVISION=128/Scene/CatmullRomCurve3）
- `js/util.js` 新增 `loadScript(url)`：Promise 化＋`_scriptPromises` Map 快取（重複載入回同一個）＋onerror 移除快取可重試

### 18c 2D 地圖遊樂園 ✅（11-08，`26538bc`）

- `js/mapscene.js` 新增 `drawPark(ctx)`：地影、摩天輪（中心 155,270 R=70、A 字支架、外環紅內環黃、8 輻條、6 彩色座艙、軸心、頂端小旗）、
  雲霄飛車（x245~388 y200~335、支柱+X 撐、兩條 bezier 鐵軌、2 車廂小列車）、大門口（310~370、雙紅柱、黃拱頂、
  招牌「遊樂園」RHR 900 26px、門口小氣球）；`renderMap` 加粉紅 PK 脈衝圈（中心紅「玩」字）
- `const PK = { x: 490, y: 300 }`；原樹 (150,250) 移到 (95,470) 避開摩天輪
- 字型 1054→1064（+遊樂園）；CSS ?v=18→19；QA 全圖＋放大截圖確認手繪風格一致
- 手滑修正 2 處（誤刪 drawMLogo 的 save、誤寫怪三元式）已還原

### 18d 3D 基礎 ✅（11-08）

**新增 `js/park3d.js`**（`window.Park3D`，Three.js r128，~430 行）：
- `enter()`：loadScript('lib/three.min.js') → init（一次）→ size → 顯示 `#screen-park3d`；`exit()`：回地圖（mapP 放 490,330）
- 場景：天空/霧 0x9fd8ef、草地、奶油廣場、6 棵樹、3 氣球（上下浮）
- 裝飾摩天輪（-20,0,-14）：A 字支架、紅環 R7.5＋黃內環、8 輻條、6 座艙（`rotation.z = -(wheelAngle+a)` 反向保持直立）、頂端小旗
- 裝飾雲霄飛車軌道：CatmullRomCurve3（6 控制點、峰頂 y6.5）＋TubeGeometry 紅軌＋支柱＋2 車廂靜止小列車
- 3 站點（圓墊＋立杆＋canvas 招牌 emoji+文字）：🎢 雲霄飛車 (5,0,6)、🍩 甜甜圈接接樂 (-11,0,9)、🎡 摩天輪 (-16,0,-2)
- 玩家：4 方向 160×200 canvas（drawCharacter scale 1.6、baseline y188）→ PlaneGeometry(2.4,3) billboard；
  固定相機（0,19,34）fov52 面向 -z→平面永遠朝相機、走路 4 幀換姿重繪 texture；半透明圓影
- 移動：Game.keys＋Game.dpadDir（與 2D 地圖同一套數字對應）、速度 9/s、邊界 x[-27,27] z[-18,23]、出生 (0,0,6)
- 站點接近 <4.5 → 提示條＋⚡按鈕 pink 高亮；`action()`：dispatch `window.ParkCoaster/ParkCatch/ParkWheel`（18e~g 實作），
  未實作 → toast「🚧 這座設施還在建造中～換一座試試！」；遊戲中 `ride.action/update` 優先
- `addStar(n)`：星星計數＋sfx blip（18h 接換硬幣）

**index.html**：`#screen-park3d`（canvas#park-canvas＋#park-exit「🏠 離開遊樂園」＋#park-star「🌟 0」＋#park-prompt＋#park-action「⚡」）；
**`#dpad` 移出 `#screen-game` 成為頂層 sibling**（stacking context：#screen-game z5 會把 dpad 關在 3D 層 z50 下面；JS 綁定用全局選擇器，搬 DOM 不受影響）；
script 順序：mapscene.js 後、mini.js 前加 `js/park3d.js`

**css/style.css**：`.dpad` absolute→**fixed＋z-index 60＋pointer-events auto**（跨 2D/3D 可用）；park HUD 樣式
（#screen-park3d z50、.park-exit-btn/.park-star/.park-prompt/.park-action-btn 圓角奶油風、.near 粉紅高亮）

**js/game.js**：
- `setSub`：park3d 也 showDpad；#screen-park3d 顯示/隱藏隨 sub（enter/exit 雙保險）
- `updateGame` 加 `case 'park3d': Park3D.update(dt)`
- `renderGame`：park3d 提前 return（2D canvas 停最後一幟、被覆蓋）
- keydown：park3d 加 WASD/方向鍵→Game.keys；Space/E→`Park3D.action()`；Esc→`Park3D.exit()`
- 地圖 click：點 PK（<34px）→ `enterPark()`（async：sfx＋toast→await Park3D.enter()→setSub('park3d')；失敗 toast 不支援 3D）

**QA（test/.park-18d.mjs，18i 升級為 peek-park.mjs）**：進園→THREE.REVISION=128、running=true、WebGL 渲染成功、
D 鍵移動 px 0→1.35＋facing right、傳送到雲霄飛車站→nearStation=coaster＋提示條＋⚡near 高亮、Space→toast 建造中、
Esc→sub=map＋mapP(490,330)＋park 層隱藏、0 pageerror
**截圖**（/tmp/park3d-18d*.png）：全景（摩天輪完整、雲霄飛車、玩家站立影子、3 招牌）＋站點提示特寫，風格與 2D 一致
**bug 修復（QA 抓到）**：
1. `resetPlayer` 寫成 y=0（應 1.5）→ 角色沉地只露頭（量 bbox：texture 角色佔 canvas y27~199，平面中心 y1.5 才落地）
2. 摩天輪頂端出畫面→降高（hub 9、R7.5）＋後移 z-14；相機 (0,15,27)fov48→(0,19,34)fov52；雲霄飛車峰頂 7.5→6.5
3. 氣球高 4.6 像棒棒糖→降 3.4
**回歸**：peek-map、peek-mobile 全過（dpad 搬家無影響）

### 第十八輪 18e：雲霄飛車小遊戲 ✅

**設計**：複用公園裝飾軌道＝你看到的車就是你坐的車（`Park3D.coasterCurve`）。車廂沿
CatmullRom 軌道（`getPointAt`/`getTangentAt` 弧長參數化），物理：`v += -g·tangent.y·dt - v·f·dt`
（g=18 arcade、阻力 0.25、v≤24），Space/E/⚡ 踩踏板 +7；停住（v<0.25 且非下坡）提示「再踩一下」。
軌道 4 顆金色 octahedron 星星（t=0.33/0.5/0.68/0.88，`|t-車|<0.025` 收集→`Park3D.addStar(1)`）；
t≥1 到站→3 秒結算提示（「🎉 完美！收齊 4 顆星星！」或「到站！收集 n/4 ★」）→cleanup：玩家回站點(5,0,6)、
停靠列車復原、相機回全景(0,19,34)、`Park3D.best.coaster` 更新。相機跟車：`carPos - tangent*6 + (0,4,0)`
lookAt `carPos + tangent*5`（指數平滑 lerp）。玩家 billboard 坐在車上（p+(0,1.9,0)、`rotation.y=atan2(dx,dz)`
面向相機）。

**檔案**：
- `js/park-coaster.js` 新增（~200 行）：`ParkCoaster={start(park),update(dt),action(),abort(),_updateVisual,_cleanup}`；
  `start` 隱藏停靠列車＋建車廂（紅 body＋白 stripe）＋4 星＋提示「🦶 踩踏板衝坡！」；`_cleanup(awarded)` 復原一切＋
  `park.ride=null`＋best 更新
- `js/park3d.js`：`buildCoasterTrack` 存 `this.coasterCurve`（18e 遊玩用）＋停靠車存 `this.parkedTrain`；
  玩家 material 加 `side: THREE.DoubleSide`（騎車時相機在車後方）；`resetPlayer` 加 `rotation.y=0`
- `index.html`：park3d.js 後加 `<script src="js/park-coaster.js">`

**QA（test/.coaster-18e.mjs）**：上車→ride/active/parkedHidden 全 true、提示正確；真實時間騎行（踩踏板×14）→
到站 t=1.000、4/4 星、Park3D.stars=4、提示「🎉 完美！」；cleanup→ride=false、玩家(5,1.5,6)、列車復原、
提示隱藏、car 移除、相機(0,19,34)、best={coaster:4}、0 pageerror
**截圖**（/tmp/coaster-18e-riding2.png）：玩家坐在車上面向相機、星星在前、提示條＋⚡高亮
**bug 修復（QA 抓到）**：
1. finished 分支 `_cleanup(true)` 後仍呼叫 `_updateVisual`→car=null 崩潰→cleanup 後直接 return
2. 玩家 billboard 單面→騎車時相機在後方看不到→`rotation.y=atan2` 面向相機＋DoubleSide；cleanup 歸零 rotation
**headless 注意**：SwiftShader 慢渲染（~200ms/frame）＋dt clamp→遊戲時間只有真實 1/5；測試用
`waitForFunction` 等 finished＋快轉 `finishTimer`（真實裝置 3 秒自然到期）；勿在 evaluate 同步灌 >100 幟
`Park3D.update`（SwiftShader 會撐爆、截圖 timeout）

### 第十八輪 18f：甜甜圈接接樂 ✅

**設計**：30 秒接住天上掉下來的甜甜圈（TorusGeometry 0.7/0.34 五色＋白色糖霜小圈）；玩家站廣場上
（0,-6，氣球站點）左右移動（A/D/方向鍵/dpad，x∈[-11,11]，speed 9）；接到（y∈[0.6,1.9] 且 |dx|<1.7）→+1 星＋score；
漏掉→buzz；出圈間隔 1.0s→0.55s 難度漸進（同屏≤8）；時間到→3 秒結算提示→cleanup（玩家回站、相機回全景）；
`Park3D.best.catch` 記錄。計時/分數顯示在 #park-prompt（每幟更新）。

**檔案**：
- `js/park-catch.js` 新增（~200 行）：`ParkCatch={start,update,action,no-op,abort,_finish,_cleanup,_spawn,_setPrompt}`；
  走路動畫複用 `park.redrawPlayer('down', t, true)` 4 幟循環；時間到用暫存 `park.ride={update,abort,action}` 跑 3 秒結算
- `js/park3d.js`：catch 站點 (−11,0,9)→(0,0,−6)（廣場中央＝接圈舞台，背景有摩天輪＋雲霄飛車軌道）
- `index.html`：park-coaster.js 後加 `<script src="js/park-catch.js">`

**QA（test/.catch-18f.mjs＋.catch-verify.mjs）**：開始→ride/active/prompt「⏰ 30s｜🍩 分數：0」、
D 鍵移動 px 0→1.4（billboard＋影子同步）、甜甜圈生成＋接住（score 1 stars 1）、時間到 cleanup→
ride=false、玩家(0,1.5,-6)、相機(0,19,34)、best.catch 更新、0 pageerror
**截圖**（/tmp/catch-18f-play.png）：甜甜圈下落中（糖霜）、分數條、廣場舞台完整
**bug 修復（QA 抓到）**：
1. `park.keys` 不存在（keys 在 `Game.keys`）→每幟 TypeError 殺 rAF 迴圈→改用 `Game.keys`
2. catch 站點原在 (−11,9) 與遊戲區 (0,-6) 不一致→站點移到遊戲區

### 第十八輪 18g：摩天輪小遊戲 ✅

**設計**：坐 0 號座艙（`Park3D.ferris.gondolas[0]`，a_0=0.5），`Park3D.wheelSpeed` 0.25→0.5 rad/s
（~12.6 秒一圈）；4 顆星星固定在座艙軌道外側 r=8.6（世界角度 0.25+k·π/2），座艙角度
（a_0+wheelAngle）與星角度差 <0.25 rad 時自動收集＋`Park3D.addStar(1)`；一圈（wheelAngle 累積 2π）→
3 秒結算提示（暫存 `park.ride={update,abort,action}` 模式同 ParkCatch）→cleanup：玩家回站點(−16,1.5,−2)、
wheelSpeed 還原 0.25、相機回全景、`best.wheel` 更新。相機跟座艙：`pos+(0,3,13)` lookAt `pos+(0,1.2,0)`
（指數平滑）；玩家 billboard 在座艙中心 +2.0、**z 偏離輪面 +0.8**（避免被紅色環管 z=−14±0.4 遮住）、
`rotation.y=atan2` 面向相機。輕鬆向：不需要任何操作。

**檔案**：
- `js/park-wheel.js` 新增（~170 行）：`ParkWheel={start,update,action,no-op,abort,_finish,_cleanup}`
- `js/park3d.js`：加 `wheelSpeed: 0.25`（init 值）、update 改用 `dt * this.wheelSpeed`
- `index.html`：park-catch.js 後加 `<script src="js/park-wheel.js">`

**QA（test/.wheel-18g.mjs）**：上座艙→ride/active/prompt「🎡 慢慢轉動中…收集 0/4 ★」、shadow 隱藏；
測試加速 wheelSpeed=4 跑完一圈→4/4 星、提示「🎡 完美一圈！收齊 4 顆星星！」；cleanup→ride=false、
wheelSpeed=0.25、玩家(−16,1.5,−2)、best={wheel:4}、相機(0,19,34)、0 pageerror；18d 回歸全過
**截圖**（/tmp/wheel-18g-still.png）：玩家坐在粉色座艙、整輪視野、星星浮在軌道外側
**bug 修復（QA 抓到）**：
1. billboard 與輪面同 z（−14）→下半身被紅色環管（z=−13.6 外緣）遮住→billboard z 偏 +0.8、相機拉遠 z+13
2. 測試注意：wheelSpeed 開到 4 時座艙 30u/s 超相機 lerp（真實 0.5 沒問題）——截圖 QA 要先 `wheelSpeed=0` 凍結等收斂

### 第十八輪 18h：存檔＋獎勵 ✅

**設計**：每局結束（_cleanup(awarded)）統一走 `Park3D.awardStars(kind, n)`：
`Game.money += n*2`（1★=2🪙）、更新 `#hud-money-val`、toast「收到 N 顆🌟，換成 🪙+X！」、sfx('coin')、
`Game.park.best[kind] = max(...)`。離開遊樂園（exit）：`Game.park.stars += 本次星星`、
`saveGame(fullSave(...))`、有星則 toast「🌟 本次遊樂園共 N 顆星星」。存檔：`fullSave` 加 `park` 欄位；
載入時舊存檔補預設（`Object.assign({coaster:0,catch:0,wheel:0}, save.park?.best)`）。`Park3D.enter` 每次
進園 `stars=0`（本次遊玩計數）、`this.best = Game.park.best`（同一物件引用）。
觸控動作鈕：`#park-action` 18d 已綁 pointerdown（觸控可用，18i 實測確認）。

**檔案**：
- `js/game.js`：Game 加 `park: { stars: 0, best: {...} }`；fullSave 加 `park: Game.park`；載入補預設
- `js/park3d.js`：enter 重置+連結 best；新增 `awardStars(kind,n)`；exit 累計生涯星＋存檔＋toast
- `js/park-coaster.js` / `park-catch.js` / `park-wheel.js`：_cleanup(awarded) 改 `park.awardStars(...)`
- **字型重建 1064→1108**（+44：18d~18g 所有遊玩提示文字從未收進字型，這次一次補齊）、CSS ?v=19→20

**QA（test/.reward-18h.mjs）**：摩天輪 4 星→money 100→108、toast「收到 4 顆🌟，換成 🪙+8！」、
best.wheel=4；exit→career stars=4、存檔 park={stars:4,best:{wheel:4}}、moneyInSave=108；
reload+startGame→stars/best/money 全部還原、0 pageerror

**注意**：shots/m* 有舊 session（11:35）mobile 回歸重新生成的 pixel diff，留 18j 全回歸時一併重跑 commit

### 第十八輪 18i：test/peek-park.mjs 正式回歸測試 ✅

由 18d~18h 的五個 dotfile 測試（.park-18d/.coaster-18e/.catch-18f/.wheel-18g/.reward-18h）升級整合為正式
回歸套件 `test/peek-park.mjs`（dotfile 保留待 18j 清理）。18 項檢查全過：

1. 3D 場景初始化（THREE r128＋玩家）
2. pk01 全景截圖（凍結 wheelAngle/t）
3. D 鍵往右移動（px 0→0.90）
4. 雲霄飛車上車
5. **⚡ 觸控動作鈕**（hasTouch context＋`p.tap('#park-action')`）：車停住後 tap 踩踏板重新啟動（v 0→5.7）
6. 雲霄飛車收集星星（t 跳到 0.31、v=12 過 1 號星）
7. 雲霄飛車結算（1★→🪙+2、best.coaster=1）
8. 甜甜圈開始
9. pk02 接接樂截圖（甜甜圈定點 (1.5,8.5,−6)、vy 放慢、凍結輪角/時間）
10. 強接甜甜圈（移到玩家 px/Z 高度 1.2→score 1）
11. 接接樂結算（1★→🪙+2）
12. 摩天輪上座艙
13. pk03 摩天輪截圖（凍結 wheelAngle=1.2 等相機收斂）
14. 摩天輪一圈 4★（🪙+8、best.wheel=4）
15. 本次遊玩星星累計 6（雲霄 1＋接接 1＋摩天輪 4）
16. 離開回地圖（玩家站回 PK 下方 490,330）
17. 生涯星星存檔（6★ 進 cute-kingdom-save-v1）
18. 0 pageerror

**測試技巧（新學到）**：
- hasTouch context：`b.newContext({ viewport, hasTouch: true })` 才能 `p.tap`（預設 context 不支援）
- `THREE.REVISION` 是**字串** "128" 非數字（比對用 `String(x)==='128'`）
- 雲霄飛車起步坡陡（t≈0 上坡 tan.y≈0.5）：v=5 約 1 遊戲秒就停住（v 被 stop 條件歸零）——⚡ 測試改為
  「先停住再 tap 重新啟動」（設定 v=0/stopped=true 後 tap，v 應回到 ~5.7）；星星/終點跳 t 時 v 給 12 避免中途停
- 甜甜圈物件是 `{mesh, vy, spin}`（位置在 `d.mesh.position`）；強接前 vy 放慢避免截圖期間掉出界
- page.evaluate 內讀不到 Node 端變數（money0）→ 用參數傳入
- 3D 截圖不進 shots/ 基線（渲染有幟計時抖動），存 /tmp 同 18d~18h 慣例

**截圖**：/tmp/pk01-park3d-pano.png（全景）、/tmp/pk02-park3d-catch.png（接接樂）、/tmp/pk03-park3d-wheel.png（座艙）

### 第十八輪 18j：回歸＋文件＋發布 ✅

**十+1 套件全回歸（11-08，全部 PASS）**：
flow（32 步全流程）、peek-build（138 項）、peek-recover（3 種自愈）、peek-bgm-filefix（雙情境）、
peek-character（造型對照）、peek-map（地圖→打工→回家）、peek-work（18 項）、peek-fest（21 項）、
peek-mobile（21 步 40 項）、peek-pose（35 項）、**peek-park（18 項，新）**——全部 0 pageerror。

**shots/ 重跑 commit（122 張）**：
- 全部小幅 pixel diff（最大 22-map 約 1%）＝字型 1108 重建的 sub-pixel 渲染噪聲＋地圖角色/PK 脈衝動畫相位
- 驗證 22-map diff 圖：遊樂園（摩天輪/軌道/大門口）在新舊圖都在（非缺功能）
- 含舊 session（11:35）遺留的 m* mobile 回歸 diff，這次一併 commit

**README 更新**：
- 玩法第 3 點加遊樂園入口
- 新增「3D 遊樂園（第十八輪）」章節（操作/三遊戲/獎勵/存檔/封面署名）
- 專案結構加 park3d 四檔＋lib/three.min.js；util.js 說明加 loadScript
- 測試表加 peek-park.mjs（18 項）

**清理**：刪除 18d~18h 六個 dotfile 測試（.park-18d/.coaster-18e/.catch-18f/.catch-verify/.wheel-18g/.reward-18h.mjs；功能已整合進 peek-park.mjs）

**發布**：git clean → force push origin main → Pages build → live 驗證

## 第十九輪：雲霄飛車升級（Jerry 要求 11-08）

需求：路線要長一點；最初爬升後要有令人加跳加速的大俯衝；中間要有 360 度旋轉（垂直迴環）。

### 設計決策（11-08）
- **新路線**（~100u，舊 ~40u，2.5 倍長）：站點(6,0.6,4)→爬坡(峰 y≈10.5~11)→**大俯衝**(Δh≈10，底速≈17)→平直段→**垂直 360° 迴環**(R=3，x≈24.5，底 y0.8 頂 y6.8)→起伏山丘×2→回到站點旁結束(3,0.8,4)
- **物理調整**：FRICTION 0.25→0.18（比例阻力吃速太狠，18e 調太硬）；G/BOOST/V_MAX 不變
- **迴環門檻**：v≥~15 入環可過（√(4gR)+損耗）；大俯衝底速 17.3 扣除平直段 10u 後 ≈15.5 → 不踩也能過、踩了更猛（V_MAX 24）
- **失敗行為**（保留）：低速入環→過不了頂→車往回溜出迴環（v 下限 -4）→踩踏板重試；環頂停住（tan.y=0 觸發停住條件）也能踩踏板再衝
- **車廂視覺**：迴環區（t∈LOOP_T）車廂/玩家改朝環心偏置（掛在軌道內側），其餘區段世界 up；parkedTrain 從 t0.18（爬坡段）搬到 t0.02（站點平段）
- **星星**：STAR_TS 重設——俯衝中 1 顆、環頂 1 顆、後段山丘 2 顆（依弧長實測定 t）
- 無新中文文字 → 不用重跑字型

### 子任務
- 19a ✅：新軌道幾何（park3d.js buildCoasterTrack 新點列+管 220 段+支柱 28+parkedTrain 搬站點）＋迴環車廂偏置（park-coaster.js _updateVisual）＋QA 截圖（本 commit）
- 19b 📋：FRICTION/STAR_TS 調整＋QA 騎行模擬（爬坡→俯衝→迴環過/失敗回溜→結算）
- 19c 📋：peek-park.mjs 更新＋11 套件回歸＋README/PROGRESS＋發布

### 19a 完成細節（11-08）
- **軌道**：25 點 cp、L=113.2u；關鍵 t：峰 0.197（y10.7）、俯衝底 0.351（y0.7）、環底入口 0.502、環頂 0.585（y6.8）、環底出口 0.668、丘1 0.766（y5.0）、丘2 0.890（y6.0）
- **迴環視覺**（park-coaster.js _updateVisual）：t∈[0.50,0.67] 時 car/rideBill 改朝環心 (24.5,3.8,9) 偏置（car +0.55、bill +1.9），其餘段世界 up；量測 carY=6.25（環頂軌道 6.8 下方）✓
- **樹位移**：[24,8]（擋迴環）→ [28,4]（全景仍疊環右上角）→ 最終 **[-18,8]**（左側空草地，全景迴環完全露出）
- **QA**（dotfile 已刪）：L=113.2 ✓、非融合區最小距離 0.67u（環底入口/出口相連點，正常）✓、環頂倒掛截圖 ✓、0 pageerror ✓；截圖 /tmp/qa19a-{pano,looptop,loopside}.png
- **已知視覺**（共平面迴環幾何不避免）：入口平直段在環近側牆下、出口平直段在環遠側牆下，兩側各 ~1.5u 管面交疊（max 0.4u）——在軌道實際相連處，全景距離下約幾 px，可接受；不升環底（升 1.7 會使入環速 14.2→10.7 破不踩過環）
- **QA 截圖技巧**（19c 可參考）：靜態截圖前 monkey-patch `ParkCoaster._updateVisual=()=>{}` 凍結跟車相機＋手動相機 (33,6.5,9) lookAt(24.5,4.2,9)（環側視）＋`rideBill.rotation.y=Math.PI/2` 強制朝相機（正常遊戲 rotation 隨跟車相機、無此問題）＋隱藏 #park-prompt

> 📌 **接手筆記**（11-08）：19a 完成。19b：park-coaster.js FRICTION 0.25→0.18、STAR_TS [0.33,0.5,0.68,0.88]→[0.27,0.585,0.766,0.89]（依上表實測 t），QA 騎行模擬（dotfile）：自動踩→俯衝→入環→環頂（v≈2.4 可過）→山丘→到站；注意低速入環會回溜（v 下限 -4）是設計行為。19c：peek-park.mjs 雲霄星星步驟現用 t=0.31 v=12 注入——新 STAR_TS[0]=0.27 會 miss，改動態讀 `ParkCoaster.stars[0].t`。
