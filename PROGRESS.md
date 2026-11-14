# 🎮 可愛國 — 開發進度

> 第 1~18 輪細節 → [PROGRESS-archive.md](PROGRESS-archive.md)（11-10 分出，保持主檔輕量）

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
- 19b ✅：FRICTION 0.25→0.18、STAR_TS [0.27,0.585,0.766,0.89]（俯衝中/環頂/丘1/丘2）＋QA 騎行模擬（本 commit）
- 19c ✅：peek-park.mjs 星星步驟改動態讀星 t＋11 套件回歸全 PASS＋README 更新（本 commit）；發布見下

### 19a 完成細節（11-08）
- **軌道**：25 點 cp、L=113.2u；關鍵 t：峰 0.197（y10.7）、俯衝底 0.351（y0.7）、環底入口 0.502、環頂 0.585（y6.8）、環底出口 0.668、丘1 0.766（y5.0）、丘2 0.890（y6.0）
- **迴環視覺**（park-coaster.js _updateVisual）：t∈[0.50,0.67] 時 car/rideBill 改朝環心 (24.5,3.8,9) 偏置（car +0.55、bill +1.9），其餘段世界 up；量測 carY=6.25（環頂軌道 6.8 下方）✓
- **樹位移**：[24,8]（擋迴環）→ [28,4]（全景仍疊環右上角）→ 最終 **[-18,8]**（左側空草地，全景迴環完全露出）
- **QA**（dotfile 已刪）：L=113.2 ✓、非融合區最小距離 0.67u（環底入口/出口相連點，正常）✓、環頂倒掛截圖 ✓、0 pageerror ✓；截圖 /tmp/qa19a-{pano,looptop,loopside}.png
- **已知視覺**（共平面迴環幾何不避免）：入口平直段在環近側牆下、出口平直段在環遠側牆下，兩側各 ~1.5u 管面交疊（max 0.4u）——在軌道實際相連處，全景距離下約幾 px，可接受；不升環底（升 1.7 會使入環速 14.2→10.7 破不踩過環）
- **QA 截圖技巧**（19c 可參考）：靜態截圖前 monkey-patch `ParkCoaster._updateVisual=()=>{}` 凍結跟車相機＋手動相機 (33,6.5,9) lookAt(24.5,4.2,9)（環側視）＋`rideBill.rotation.y=Math.PI/2` 強制朝相機（正常遊戲 rotation 隨跟車相機、無此問題）＋隱藏 #park-prompt

### 19b 完成細節（11-08）
- **常數**：FRICTION 0.25→0.18（比例阻力吃速太狠，舊值不踩也到不了環頂）；STAR_TS [0.33,0.5,0.68,0.88]→[0.27,0.585,0.766,0.89]（依 113u 弧長實測：俯衝中/環頂/丘1頂/丘2頂，環頂星在環上方 y8.4 很醒目）
- **QA 完整騎行**（自動踩 v<10、dt×3 加速）：4/4 星、maxV 18.9、環頂 minV 11.1（輕鬆過）、7 次踩完成；0 pageerror；中途截圖 /tmp/qa19b-hills.png（跟車視角正常）
- **失敗行為修正**（實測 vs 設計文件）：低速入環**不會回溜**（v 下限 -4 是防禦死碼）——停住條件 `v<0.25 && tan.y>=-0.05` 在環牆上坡段必然先觸發→車**停在環牆**（t≈0.513，環底 v3.35 只爬得動 Δh≈0.28u）＋「停住了」提示；踩踏板重試每次爬 ~2.8u 弧，~4 踩可破環（每踩 v=7→7²=49 能量 vs 環頂需 36Δh）——比回溜直覺性更好，保留現行為、不修物理
- 量測：環底入口 v≈3.35（t0.47 v4 純物理）→停 t=0.513；踩後 t→0.523 繼續爬 ✓

### 19c 完成細節（11-08）
- **peek-park.mjs**：雲霄星星步驟 t=0.31 固定注入→改動態讀 `ParkCoaster.stars[0].t`（新軌道 1 號星在 0.27 俯衝中，舊值會 miss）
- **11 套件回歸全 PASS**（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park）
- **README**：3D 遊樂園章節雲霄飛車項目改「113u 長線/大俯衝/360° 垂直迴環環頂倒掛/低速入環停環牆重試」
- **回歸重跑 shots/ 113 檔**：逐檔無 fuzz compare 全 0px（純 PNG 重新編碼位元組差異，像素零改變）→ git checkout 還原，不進 commit
- 無新中文 UI 文字→字型不動
- **發布**：push 3adb686→Pages `built`→live smoke PASS（線上 L=113.2/FRICTION 0.18/新 STAR_TS/0 pageerror）

> 📌 **接手筆記**（11-08 更新）：**第十九輪全部完成並發布上線** ✅（19a 8022af0、19b 137ade0、19c 3adb686、發布確認本 commit）。線上版 https://unclejerry20050727-code.github.io/cute-kingdom/ 已可玩新版雲霄飛車（113u 長線/大俯衝/360° 垂直迴環）。等 Jerry 新回饋（尤其實測：迴環倒掛手感、踩踏板節奏、iOS 效能）。

## 第二十輪：雲霄飛車再加長＋重量感＋4 迴環＋地底隧道（Jerry 要求 11-08）

需求原文：「雲霄飛車長度加長 2 倍、速度慢一點才有重量感，太快又沒慣性像假的，360° 的圈圈要有 4 個，還要有個洞鑽進地底再出來，朝上衝出地面來的時候眼睛過曝看到太陽刺眼光芒，在俯衝或刺激的時候有尖叫聲，俯衝時畫面有加速線條」

### 設計決策（11-08）
- **新路線**（目標 ~220-240u＝113u 的 2 倍）：站點→爬坡（峰 y≈11）→**大俯衝#1**（Δh≈10）→**迴環1**→連接段→**迴環2**→**鑽入地底**（軌道沉到 y<0，地面 240×240 平面自然遮住）→地底段 ~15u→**陡坡衝出地面**（EMERGE 點）→俯衝#2→**迴環3**→連接段（踩踏板保勢）→**迴環4**→起伏山丘×2→回站點
- **4 個 360° 垂直迴環**：R≈2.5-3，交替 y-z / y-x 平面；cp 用輔助函數生成（迴環每 30° 取點），不再手寫 25 點
- **物理重量感**（20b 調）：G 18→10、FRICTION 0.18→0.13、BOOST 7→5.5、V_MAX 24→16——加速慢/頂速低/慣性大；Node 模擬驗證：自動踩（v<9 踩）可走完全程、4 環皆可過（環頂 v>0.5）；全 ride 目標 ~35-50s
- **迴環視覺泛化**：park-coaster.js 單 LOOP_T/CENTER→`LOOPS` 陣列（每環 {t0,t1,cx,cy,cz}，t 範圍量測後填），_updateVisual 找 t 所屬環算 up
- **隧道視覺**（20a）：入口/出口各一個圓環拱門（TorusGeometry）＋地底段每 ~2u 一顆自發光小燈（emissive 橘）；**地底暗模式**：t 在隧道區時 scene.background/fog lerp 到暗色 (0x2a2320)、Hemisphere 0.95→0.25、sun 0.75→0.05（出洞還原）
- **太陽過曝**（20c）：index.html 加 `#park-sunflash`（白色徑向漸層、pointer-events none）；t 跨越 EMERGE_T（y 由負轉正）觸發一次：opacity 1→0（~1s CSS transition）＝眼睛過曝刺眼感
- **加速線條**（20c）：`#park-speedlines`（repeating-conic-gradient 放射線＋徑向 mask 只留外緣）；俯衝（tan.y<-0.45）加 .on（opacity/scale transition），離俯衝移除
- **尖叫聲**（20c）：audio.js 加 `sfx('scream')`（合成：saw 880→520 0.3s＋square 1180→700 0.22s＋短 yelp 1400→900；走既有 tone() 模式）；觸發：陡俯衝 tan.y<-0.45 或入環瞬間（t 跨環入口），cool-down 1.8s 防連發
- **星星**：維持 4 顆（文字/字體不動）：俯衝#1 中/迴環2 環頂/出洞後/最後山丘——t 值 20a 量測後填 STAR_TS
- **無新中文 UI 文字**→不用重跑字型、不改 ?v=（style.css 加新規則即可，index.html 本就不加版本號）

### 子任務
- 20a 📋：新軌道幾何（輔助函數生成 cp、4 環＋隧道＋山丘、L~220-240u、Tube 段數/支柱/停列車調整）＋Node 量測（L/每環 t 範圍/EMERGE_T/自相交檢查）＋隧道靜態視覺（拱門/地底燈/暗模式）＋QA 截圖（全景/地底/出洞/環）
- 20b 📋：物理重量感常數＋LOOPS 泛化 up 向量＋Node 全 ride 模擬＋瀏覽器騎行 QA
- 20c 📋：太陽過曝 flash＋加速線條＋尖叫聲＋STAR_TS 量測填入＋瀏覽器 QA（flash/speedlines class 觸發、scream 呼叫計數）
- 20d 📋：peek-park.mjs 回歸確認＋11 套件＋README/PROGRESS 收尾＋發布

> 📌 **接手筆記**（11-08）：第二十輪開工。軌道輔助函數放 park3d.js buildCoasterTrack 內（`loop()` 產生 12 點）；量測用 Node require three.min.js（同 19a）；自相交檢查排除共平面迴環融合區（19a 手法）；QA 截圖放 /tmp；地底截圖相機跟車即可（暗模式自帶氛圍）。

### 20 進行中 checkpoint＋terminated 對策細切（11-10）

**terminated 原因分析**：128k context window＋Playwright 長跑（SwiftShader ~200ms/frame）＋一次大量讀檔 → 會話中斷。**對策**：
1. 狀態即時寫檔（本節）✅——任何時候 terminated 都能從這裡接上
2. 剩餘工作切 ≤8 個小步，每步＝單 edit/單 script→驗證→commit
3. QA script：waitForFunction 帶 timeout、一次 ≤3 張截圖、不同步灌 >100 幀
4. 讀檔用精確 grep/sed 抽取，不整檔讀
5. dotfiles（.route20/.m20/.sim20）20 輪收尾後刪

**精確現況**（20a-20c 代碼全部完成＋瀏覽器靜態/騎行 QA 通過，見下方 20-1~20-4 實測）：
- ✅ `test/.route20.mjs` 路線定案：L=221.0、峰 y10.9@0.104、隧道底 y-4.5@0.498、入洞 0.453/出洞(EMERGE) 0.545（地底 20.5u）、L1 0.190→0.283(top .237)/L2 0.338→0.433(top .385)/L3 0.583→0.676(top .629)/L4 0.740→0.825(top .782)、自相交 0；隧道加深到 -4.5（跟車相機能鑽地底）、返程改繞 L4 環東側
- ✅ `test/.sim20.mjs` 物理全過：G8/F0.12/BOOST5.5/VMAX16/DRAG1.5，thresh8/10/12 三檔自動踩皆 done、0 stops、maxV 15.4-17.6、minInLoop ≥8.0、ride 15.4-18.8s
- ✅ STAR_TS 實測：[0.140, 0.385, 0.545, 0.908]（俯衝#1中 y5.43/L2環頂 y6.40/出洞 y0.17/丘2頂 y5.54）
- ✅ `js/park3d.js`（部分）：init 存 hemi/sun 參考＋C_DAY/C_NIGHT/darkK/underground；ground DoubleSide（地底草地天花板）；update() 地底暗模式 lerp（bg/fog/hemi 0.95→0.21/sun 0.75→0.05）
- ✅ `js/park-coaster.js`（全）：新常數＋STAR_TS＋軟上限＋跨越事件（出洞→_sunFlash、入環/陡俯衝→scream cd1.8s）＋多環 up（讀 park.coasterLoops）＋相機地底 clamp（p.y<-0.15→camUp=min(4,max(0.15,-0.35-p.y))、park.underground flag）＋speedlines（tan.y<-0.45 toggle .on）＋_sunFlash（白閃 1.1s+whoosh）＋_cleanup 清特效
- ✅ `js/audio.js`：sfx('scream')（saw 880→520/square 1180→700/yelp 1400→950）
- ✅ `index.html`＋`css/style.css`：#park-sunflash（徑向白閃）＋#park-speedlines（conic 放射線+mask，.on opacity .75）
- ⚠️ 中間狀態安全：park-coaster.js 讀 park.coasterLoops/tunnelT 都有 if 保護，park3d.js 未重寫前不會崩（只是暫時沒多環 up/沒隧道特效）

**剩餘小步**（每步做完即 commit）：
- 20-1 ✅：park3d.js buildCoasterTrack 重寫（cp 抄 .route20.mjs＋loop() helper＋Tube 400＋52 支柱＋coasterLoops/tunnelT 量測＋隧道拱門×2＋地底燈×19）
- 20-2 ✅：node --check 通過＋瀏覽器靜態 smoke（L=221、coasterLoops 4 環、tunnelT e0.453/x0.545、0 error）→ commit cd8dfd6
- 20-3 ✅：靜態 QA 截圖 3 張（/tmp/r20-01-pano / r20-02-underground / r20-03-emerge）：全景 4 環＋支柱＋站台正常；地底=綠草地天花板＋橘燈串＋黃拱環
- 20-4 ✅：騎行 QA（dt×3、自動踩 thresh10，test/.ride20.mjs）：**4/4 星、maxV 16.07、minY -4.5、maxT 1（全程）、underTime 1.34s、maxDarkK 0.98、flash 1、whoosh 1、scream 6、loopDone [T,T,T,T]、pageerror 0**——全數達標
- 20-5 ✅：commit（代碼 cd8dfd6＋QA/PROGRESS 6c95517）
- 20-6 ✅：20d 回歸 **11/11 全 PASS**（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park）
- 20-7 ✅：README 雲霄條目改 20（221u/4環/隧道/過曝/尖叫/加速線）＋PROGRESS 收尾＋dotfiles（.m20/.route20/.sim20/.ride20）已刪
- 20-8 ✅：push 8f25404→Pages 部署完成；live smoke（https://unclejerry20050727-code.github.io/cute-kingdom/）：L=221、4 環 t 全對、tunnelT 0.453/0.545、#park-sunflash/#park-speedlines 存在、0 pageerror——**第二十輪完工** 🎉

### terminated 事故诊断（11-12 修正版，已用 session JSONL＋server 實證完成）

**先前「context 爆掉」的推測不準——真兇是模型生不成大 tool call：**
1. 中斷 session 檔 21MB/1858 行；最後模式＝assistant(edit) → context_edit(replacement:null 刪訊息) ×3 → 死
2. 三個 edit toolCall 的 arguments **只有 `path`、缺 `edits`**＝輸出在巨大 tool call 剛開始時就結束
3. 三次嘗試各跑 6~6.5 分鐘（server 實測 10.6 tok/s）≈3800~4100 output tokens（含 thinking）後被切
4. 對 server 做受控實驗：裸 4600-token 串流**正常完成**（478s、HTTP 200、finish_reason=length）→ server 串流健康、maxTokens 32768 也沒問題
5. 小 tool call（bash/短 edit）全部成功
→ 結論：**27B 小模型對超長結構化輸出（~100 行 JS 的 edits JSON）提前收尾/JSON 破損**，pi 缺參數→刪訊息重試→再失敗×3→terminated

**強制規則（20-1 起執行，已驗證有效）**：
1. 單一 edit 的 oldText+newText ≤ ~4KB（超了就拆多個小 edit）
2. tool call 前文字極簡（1~2 行），不寫長解釋
3. 大 write 拆成多次 append；QA 輸出只留關鍵數字
4. 每小步即 commit（斷了可續）

**建議 Jerry（可選）**：pi 改用 `--thinking low`（thinking 吃 token 又吃時間）；45 分鐘 compaction 產出 92KB 垃圾摘要（27B 不擅長長摘要）
**server 實測**：vLLM 0.28.0 @192.168.220.201:18080、10.6 tok/s、max_model_len 131072、串流健康

## 第二十一輪：雲霄飛車手感修正（Jerry 要求 11-13）

6 項需求：
1. **速度降一半**（太快太假玩具）：V_MAX 16→8、BOOST 5.5→2.75、初速 5→2.5（G 不變）
2. **主角坐姿面朝前**（背朝後跟車），**偶爾回頭看螢幕**（隨機+尖叫時回看一下）
3. **360° 環起終點錯開**（現在重疊）：環前後 cp 抬高→入環下坡/出環上坡，坡道分歧
4. **L3/L4 拉近**→720 雙連環感
5. **加速線條更明顯**（style.css #park-speedlines 強化）
6. **左右彎道畫面水平傾斜**（相機 bank：∝v²·水平曲率，上限 ~25°，平滑 lerp；出遊玩還原 up）

### 子任務（每步 ≤4KB edit＋commit）
- 21-0 ✅：PROGRESS 計畫＋commit
- 21-1 ✅：讀 park3d.js cp 陣列＋loop() 現狀（診斷重疊/L3-L4 間距）
- 21-2 ✅：test/.route21.mjs 新路線（環坡錯開＋L4 拉近 L3）＋Node 量測（L/環 t/tunnelT/星 t/自相交）

### 21-2 最終路線設計（已量測通過，test/.route21.mjs）
**量測**：L=221.3；環 t：L1[.190,.275] L2[.337,.423] L3[.581,.668] L4[.710,.789]（頂 .232/.380/.625/.750）；tunnelT e.451/x.544；星 s1 .140 s2 .380 s3 .544 s4 .908；minY -4.5；**自相交 hits: NONE**
**環設計**（關鍵）：
- loop() 改為 **15° 密度、th 15..330（22 點，不含底點）**；底點 B 另放 cp（進/出各過 B 一次，環=330°弧＋進出弧線≈完整 360°）
- 每環：進坡沿**環面法線側（橫向）**繞行、只貼底才匯入 B；出弧（L330→dep1）掃向**對側** → 起終點錯開、不再與環底側墻同走廊重疊
- L1 yz x25：進坡 +x 繞（25.8/.8,-6.8→26.6/.85,-7.8→25.6/.8,-8.7→B），出弧 -x 側（dep1 23.3/.85,-11.0）
- L2 xy z-14.5：進坡 -z 繞（17/1.5,-15.5→15.2/.85,-15.3→14.4/.8,-14.7→B），出弧 +z 側（dep1 13.4/.85,-12.8）
- L3 yz x-10：進坡 +x 繞（-8.2/.85,.5→-9.2/.8,1.3→B），出弧 -x 側遠切（dep1 -11.4/.85,4.0→-9.5/.9,5.0）
- L4 xy z5.5（從 (2,9) 移到 (-4,5.5)，緊接 L3→720 感）：進坡 +z 繞（-6.6/.85,7.0→-5.4/.8,6.6→B），出弧 -z 側（dep1 -2.5/.85,4.3）
- 結尾：L4 後連接線抬高 (3/1.5,8.5→6.0/3.0,10.3) 避開終點回線 (7.5/.7,9)→(7/.7,5.5)
**教訓**（重要）：
1. 環底交會殘差（進坡末段 vs 出弧跨底帶）無法幾何消滅（兩管皆終/始於 B）→ 檢查器對「兩點皆在環底 B 0.75u 內」的對豁免（設計內小交越）；長融合帶（>0.75u）仍會被抓
2. 出弧 dep1 要「遠切」（離底 1u+、側向 1.3u+）才不會在底帶與進坡相撞
3. 管中心線距離 <0.65 = 管面相交（半徑 0.3×2）；0.65-0.75 貼臉不算撞
- 21-3 ✅：park3d.js route 21a（commit 4cd3e3e，瀏覽器量測對 Node）
- 21-4 ✅：park-coaster.js 半速常數（G5/BOOST2.75/VMAX10/v0 2.5）＋STAR_TS [0.140,0.380,0.544,0.908]＋sim 兩模式全過（aggressive 22.1s 4/4 星 0 停 maxV11.2；gentle 29.6s 4/4 星 0 停）
- 21-5 ✅：park-coaster.js 相機 bank（∝v²・水平曲率、clamp ±25°、camera.up 傾斜）＋主角坐姿面朝前（弧長前顧 1.2u 穩定航向）＋偶爾回頭（隨機＋尖叫觸發 1.2s）＋完賽面朝相機
- 21-6 ✅：style.css 加速線條強化（線更粗密亮、mask 外扩、fade 更快）
- 21-7 ✅：靜態 smoke（L=221.3/4環/隧道 .452/.544 全對）＋騎行 QA（實時：4/4 星、maxV 11.2、minY -4.5、flash 1、scream 8、4環全過、lookBacks 8、faceFwd 0.95、maxBank 24.7°、camUp 還原 1、0 pageerror）
- 21-8 ✅：截圖驗證（shots/r21-01~05：坐姿背影/彎道傾斜 20.6°/720 雙環/環坡錯開/乾淨 bank 17°）
- 21-9 ✅：回歸 11/11 全 PASS（peek-park 踏板斷言改 3 連踩——半速 BOOST 2.75 單踩 v≈2.4）＋README 雲霄飛車段更新（半速/坐姿面朝前/回頭/720/彎道傾斜）＋刪 8 個 temp dotfile
- 21-10 ✅：push bd8d44f→Pages 部署；live smoke（https://unclejerry20050727-code.github.io/cute-kingdom/）：THREE r128、L=221.3、VMAX10/BOOST2.75/G5、#park-speedlines/#park-sunflash 在、紋理切換在、0 pageerror——**第二十ー輪完工** 🎉

### ✅ 第二十一輪完成（11-14）——等 Jerry 新回饋
> 📌 **接手筆記**（11-14 更新）：**第二十一輪全部完成並發布上線** ✅（21-3 4cd3e3e、21-4 f33dec9、21-5 f2a1e8f、21-6 00e9508、21-7 7bedf38、21-8 eb5ccc7、21-9 75cba0f/bd8d44f）。21 輪 6 項手感修正全完成：半速（頂速 16→10）／坐姿面朝前＋偶爾回頭／環坡錯開／720 雙連環／加速線條強化／彎道相機傾斜 ±25°。截圖 shots/r21-01~05。線上版 https://unclejerry20050727-code.github.io/cute-kingdom/ 已可玩。等 Jerry 實測回饋（半速感/回頭頻率/720 連環感/bank 傾斜度）。截圖教訓：SwiftShader ~4fps（22s 車程實時 ~137s）、browser close 會卡→腳本末尾 process.exit(0)、長等待用頁內 rAF Promise。

---

## 第二十二輪：軌道順暢度（2026-07-27 晚間）

> Jerry：「部份軌道不順再修順一點」。目標：消除 route 21a 毛刺/急 S 彎，保留 4 環＋隧道＋星光結構與物理平衡。

### 22-1 順暢度量測 ✅（test/.smooth22.mjs，4000 點取樣）

| # | 位置 | t | 嚴重度 |
|---|------|---|--------|
| 1 | L1 入口鉤 (25.8,.8,-6.8) | 0.180 | k=**93** 尖鉤（最糟） |
| 2 | 低谷 V (10,.9,14.5) | 0.877 | 146°/3.2u 反向 |
| 3 | 隧道出口尖峰 (-5.5,2.6,-2) | 0.556 | 114°/4.3u |
| 4 | L1 出口擺 (23,2.2,-14.2) | 0.296 | 107°/3.7u |
| 5 | L4 入口 S (-6.6,.85,7.0) | 0.772 | 105°/3.9u |
| 6 | L3 出口 (-11.4,.9,4.0) | 0.673 | 104°/4.2u |
| 7 | L2 出口→地底 x 反向 (10.5,1.2,-12.8) | 0.408 | 91°/3.9u |
| 8 | 進站前 (7,.7,5.5) | 0.978 | 83°/4.1u |
| 9 | hill2 頂 U 轉 (2,3,14.5) | ~0.94 | ~92°（cp 推估） |

### 22-2 修復設計（cp 重排，環/隧道/星光結構不變）

1. **L1 入口**：移除 U 形 S 鉤 → 陡坡底掃到 +z 側 (29,.8,-5.5)，平滑左轉進 B（方向角連續 ~135°/4.5u）
2. **低谷**：V→寬 U（10.5,1.2,13.8）→（10.8,.9,15.2）→（10,.9,16.5）→（7.5,2.5,16.8）
3. **隧道出口**：尖峰 2.6u 降為 ~0.9u 圓坡 (-5.8,.8,-2.4)
4. **L1 出口**：加中點 (22.6,1.5,-13.2)、(20.5,1.8,-14.8) 拉寬
5. **L4 入口**：連續左轉 90°/6u，z≥6.3 避環面
6. **L2 出口**：x 反向改平滑掃（14.2,.85,-13.3）→（12.6,.7,-12.7）→（10.8,-.6,-12.4）
7. **hill2 U 轉**：（3,4.5,15.8）→（1.4,3.2,15）→（1,2,13.4）→（3.2,1,12.2）
8. **進站前**：加 (6.9,.7,7.2)、(5.8,.75,5.6)

### 22-3 重測＋物理驗證（待做）

- 重測自交/環 t/隧道 t/星光 t/max k/S 彎；STAR_TS 按新 t 更新（同一特徵點）
- 重寫 .sim22.mjs 雙模式：4/4 星、0 停、22~30s、maxV≤~11.5
- ride QA＋截圖＋11 回歸＋部署

### 交接（22-1 完成）

- 量測腳本 test/.smooth22.mjs 保留到收尾；cp 改在 js/park3d.js buildCoasterTrack 21a 區塊
- 地界：地面 240×240，新線 x≤29 / z≤16.8 安全
- 環體安全距：管 r0.3，中心線 <0.6 = 撞；L4 環面 z=5.5（環體 z 5.2~5.8）
- 若物理失衡：微調 G/boost，勿再改 V_MAX

### 22-2 實施結果（✅ xIntersect NONE，max k 2.73）

最終 cp 調整歷程（.smooth22.mjs 每步重測，L 224.9→230.4）：

1. **L1 入口**：最終採「大 U 繞開環」：(28,.8,-8)→(28.2,.8,-5.0)→(27.4,.8,-4.4)→(26.5,.8,-4.7)→(26.1,.8,-6.2)→(26.0,.8,-8.3)→B(25,.8,-9)。
   - 尾段走 +x 側下抵 B：θ345 續弧點 (25,-8.28) 離 U 尾 0.49u 碰撞 → 尾點改 (26.1,-6.2)/(26.0,-8.3) 後 clearance 1.05u ✓
2. **loop() 加 n 參數**：L1/L4 用 23 點（345° 續弧消出弧曲率尖峰 k6.2/3.4）；**L2 用 22 點（330°）**：345° 的 θ345 點 (14.725,-14.5) 擠出弧→B 切線，B 尖峰 k5.5；**L3 也用 22 點**：θ345 點 (-10,1.275) 離入口線 0.54u 碰撞
3. **L2 出口**：θ330 切線方向 (0.966,0,0.26) → cp (14.4,.85,-13.9)→(13.5,.85,-13.1)→(12.2,.7,-12.7)→(10.8,-.6,-12.4)
4. **L4 入口**：(-10.3,.9,5.3)→(-8.3,.9,6.3)→(-6.4,.9,7.0)→(-5.2,.85,6.8)：末兩點 z 須 ≥6.8（入口弧 sag 到 z6.05 會撞環底弧，21a 水位 z6.6-7.0 安全）
5. **L4 出弧**：θ345 切線 (+x) 但須避環起弧 θ25-30（z5.5）→ 三段漸降 z：(-4.1,.65,5.35)→(-3.5,.6,5.05)→(-2.8,.7,4.6)→(-2.2,.85,4.4)（各段彎角 13-21°）
6. **低谷**：(10.5,1.2,13.8)→(10.8,.9,15.2)→(10,.9,16.5)→(7.5,2.5,16.8)（V→U，129°/3.6u）
7. **hill2**：(5,5.5,15.5)→(3,4.5,15.9)→(1.2,3.3,15.3)→(0.6,2.2,13.8)→(1.2,1.3,12.4)→(2.6,1.0,11.8)→(5.0,1.0,11.8)（97°/3.9u）
8. **隧道出口**：(-5.5,2.6,-2)→(-5.8,.8,-2.4)（尖峰 2.6u→圓坡）
9. **L1 出口**：(23.8,.8,-9.2)→(23.3,.9,-11.2)→(17,1.5,-15.5)
10. **進站前**：(7.5,.7,9)→(6.9,.7,7.2)→(5.8,.75,5.6)

**最終量測（node test/.smooth22.mjs）**：
- L=230.4u；minY -4.5（隧道底）；xIntersect **NONE**
- loops t：[.203,.285,.244] [.338,.423,.38] [.565,.647,.606] [.693,.773,.733]
- tunnelT {e:.437, x:.537}；stars {s1:.136, s2:.38, s3:.537, s4:.9}
- max k=2.73 @ t.6983 (B4 入口 dip 單點)；其餘峰 ≤2.57（L1 B 2.57、L1 出弧 2.57、L3 B 2.51）
- S 彎 10 處全為連續轉/環身（最大 169°/4.0u @ L1 U 頂），無髮夾

**自交檢查規則（.smooth22.mjs）**：M=1200、d<0.65 報、雙點同在環底 B 1.0u 內豁免（環底雙重通過區是結構性的：入口弧+環底弧+出口弧都經 B 附近）

**已知小瑕疵**：L4 環底 B4 處入口 dip（z5.36）與出弧（z5.2）管面重疊 ~0.3u（21a 就有，環底最低點 y0.6-0.8，遊戲中幾乎不可見；後續有空再磨）

### 22-3 重測＋物理驗證（✅ 完成）

- [x] **STAR_TS** 更新 [0.140,0.380,0.544,0.908]→**[0.136,0.380,0.537,0.900]**（22a 實測）
- [x] **test/.sim22.mjs 雙模式**（複製 park-coaster.js 物理 G5/F0.12/BOOST2.75/V_MAX10/DRAG1.5/v0 2.5）：
  - aggressive（v<9.5 每幀踩）：22.7s、4/4 星、0 停、maxV 11.2 → **PASS**
  - gentle（v<5 才踩）：30.2s、4/4 星、0 停、maxV 10.4 → **PASS**
- [x] **ride QA**（test/.ride22.cjs：真實 Space 每 200ms＋page 內 recorder patch Park3D.update 累 dt）：
  - 23.6s、maxV 10.7、minY -4.5、**0 停、4/4 星**、bankMax 24.4°、faceFwd 0.75（≈5 次回頭，同 21a）、0 pageErr
  - 5 截圖 committed：shots/r22-01-l1u / 02-l1loop / 03-l3loop / 04-l4loop / 05-valley
- [x] **11 套件回歸全 PASS**：flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park（跑完 git checkout -- shots/ 還原基線）
- [x] 部署＋live smoke
