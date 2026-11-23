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

---

# 第二十三輪：剩餘少部份軌道再修順（12-?? Jerry：「大部分軌道都順了，少部份軌道不順再修順一點」）

## 23-1 ✅ 精測量測（N=4000→8000，.smooth22.mjs）

N=8000 揭露真實峰（N=4000 全低估）：
| t | k | 區域 | 結構 |
|---|---|---|---|
| 0.7748 | **4.51** | L4 出弧 (-2.6,0.7,4.4) | cp(-2.8,4.6)→(-2.2,4.4) 間 38° 急轉集中 |
| 0.2066 | **3.66** | L1 環底入口 (25.0,-9.0) | U 尾 -x 向抵達 B，B 強迫切線 40° 錯角 |
| 0.6985 | **3.05** | L4 入口 dip (-3.7,5.4) | B4 切線 35° 離 +x → dip+急轉 |
| 0.7004 | 2.90 | L4 θ15 區 | 環底→圓弧過渡（結構性） |
| 0.2802 | 2.58 | L1 θ345 出弧 | 出弧 cp 拽 θ345 往 -x 34° |
| 0.2880 | 2.44 | L1 出弧 cp(23.8,-9.2) | cp 角 |
| 0.6402 | 2.50 | L3 環底入口 | 29° 切線錯角 |

其餘全場 <2.5（山丘/隧道/进站/低谷 U 皆 OK）。S 彎清單不變（皆設計 U 彎）。

## 23-2 ✅ 修法（一處一修，每修完重測 top15+xIntersect+route）

1. [x] **L4 出弧**（k4.51）：22a 三 cp 換成 z 梯度分散三 cp `(-3.35,0.62,4.85)/(-2.4,0.68,4.55)/(-1.2,0.8,4.4)`（z 底 4.4 延伸、轉角均攤）。中途試過加密 cp `(-0.5,1.1,4.7)` → k6.35（y 過衝尖峰，廢棄）。結果：k4.51→out of top15（≤2.5），probe 出弧 vs 環 min d=0.107（僅 B4 匯入點本質連續段）
2. [x] **L1 環底入口**（k3.66）：U 尾末 cp (26.0,-8.3)→**(25.9,-7.9)**（plan 原案 25.7,-8.0；(25.75,-8.5) 試過 → k5.43 z 段 Hermite 速度集中，廢棄；取 Δ/slope≤1.5 平衡點）。結果：k3.66→out of top15；probe 尾 vs 環出弧 min d=0.477、d<0.6 長 0.86u（B 匯入＋θ345 kiss，22a 乾淨版 min 0.65 但有 k3.6 紬——順暢 vs 淨空取順暢）
3. [x] **L4 入口 dip**（k3.05）：末入口 cp (-5.2,6.8)→**(-5.4,6.4)**（B4 切線 35°→23°）。結果：k3.05→out of top15；新 xIntersect 4 pair d0.60-0.65（入口路徑 vs 環 θ345 弧 5cm 管縫，與 22a 豁免區內 kiss 同量級，只是新近點落在 nearB 1.0u 半径外，記錄在案可接受）
4. [~] **L1 θ345 出弧**（2.58）：**不動**——已達 ≤2.6 目標；移 (23.8,-9.2) 會改 B 切線、反噬剛修好的入口側
5. [~] **L3 環底入口**（2.52）：**不動**——已達目標

**最終（N=8000）**：max k = **2.579**（L1 θ345 出弧，達標 ≤2.6）；L=230.2；getLength 227.4 不變；minTrackY -4.5；loops `[[0.2,0.285],[0.337,0.423],[0.565,0.647],[0.69,0.772]]`（L4 起 0.692→0.690）；tunnelT {0.436,0.537}；stars {0.136,0.38,0.537,0.9}（**STAR_TS 不需改**）；xIntersect 4 pair（上列 L4 入口 kiss）

commit：`ce02e58` Round23 23-2（js/park3d.js 三組 cp + .smooth22 resync）

## 23-3 ✅ 驗證

- [x] **物理 sim（.sim22.mjs）**：aggressive 22.7s/4星/0停/maxV11.2、gentle 30.2s/4星/0停/maxV10.4——與 22a 完全一致 PASS
- [x] **ride QA（.ride22.cjs，真踏板+計量）**：`{time:23.6, wallSec:149, maxV:10.7, minY:-4.5, stops:0, stars:4/4, bankMaxDeg:24.3, faceFwd:0.67, frames:466, finished:true, pageErr:0}` PASS
- [x] **截圖目視**：L1 U 入口（軌道平滑無融合）/ L4 環＋入口坡道（外觀乾淨）/ L4 出弧→終點爬坡（平滑）——shots/r23-*.png 3 張
- [x] **11 套件回歸全 PASS**：flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park（跑完 git checkout -- shots/ 還原基線）

## 23-4 ✅ 部署

- [x] push `b987582..9b68f62`（23-1/23-2/23-3 共 3 commit）
- [x] live smoke PASS（three 128、L 227.4、pageErr 0）＋live park3d.js 確認 5 個 23a cp 生效

---

# 第二十四輪：小遊戲新功能（Jerry 要求：甜甜圈接接樂 3 項＋摩天輪鳥群 1 項）

1. 甜甜圈接接樂：
   - (a) 接到時手向上伸出的視覺效果
   - (b) 來不及接時可「飛撲接」（動作鈕撲出去擴大接取範圍）
   - (c) 新增不能接的物品（🧨 炸彈：接到扣星）
2. 摩天輪：空中鳥群攻擊，玩家要閃躲（A/D 座艙內移動）

## 24-1a 基礎：catch pose＋redrawPlayer pose 參數＋新 sfx（flap/boom）
## 24-1b 接住反饋：0.6s 舉手 pose＋prompt「接住!」
## 24-1c 飛撲接：action() 0.45s 衝刺＋傾身＋大接取盒＋冷卻
## 24-1d 炸彈：25% 出 🧨，接到 -2★＋boom＋爆炸視覺
## 24-2a 鳥群：3 隻（身體/頭/喙/拍翼）繞輪 r=10.5
## 24-2b 俯衝 AI（預警→直線撲→迴位）＋A/D 閃躲＋中 -1★／閃過 +1★
## 24-2c headless 截圖目測（catch 3 狀態＋wheel 鳥撲/閃躲）
## 24-3 驗證：11 回歸＋push＋live smoke

## 24-1 ✅ 甜甜圈接接樂完成（3 commit）

- [x] `1263ffb` 24-1a：catch 舉手 pose（character.js POSES）＋redrawPlayer(dir,t,walking,pose)＋sfx flap/boom
- [x] `c9adb10` 24-1bcd：park-catch.js——接住 0.6s 舉手 pose＋⚡飛撲（action 0.45s、2.6x 速、傾身 -0.55rad、大接取盒 3.0x2.6、冷卻 1.2s）＋🧨 炸彈（後 5 秒 25% 出現、接到 -2★＋爆炸 fx＋boom、漏掉不罰）
- [x] `408c5d0` 24-1e：特寫鏡頭（start+update：camera (px,3.4,1.0) lookAt (px,2.0,Z)；3/4 角試過但站牌擋臉→改正面，細桿居中可接受）
- [x] headless 驗證 .catch24.cjs PASS：站點流（nearStation+Park3D.action()）＋清甜甜圈強生成：接住 score+1+pose／飛撲 score+1+lean／炸彈 score-2+flash+fx／abort 清理全過
  - **教訓：ParkCatch.start() 不能直接呼叫**（park.ride 沒設→Park3D.update 不會 drive 它，timeLeft 凍結）→ 要用 Park3D.action() 站點流（ride22 同款）
- 截圖目視 OK：/tmp/c24-02 舉手／c24-03 飛撲傾身／c24-04 爆炸球（背景過山車管可接受）


## 24-2 ✅ 摩天輪鳥群閃躲完成（2 commit）

- [x] `5438c29` 24-2ab：park-wheel.js——3 鳥盤旋 r10.5（與玩家同平面 z=HUB.z+0.8）＋每 3.2s 輪流鎖定 1.7s 後預測位置（0.8s 蓄力轉向＋0.9s smoothstep 直線俯衝）＋A/D 閃躲 pOff ±1.2（速 2.2、無輸入指數回中）＋prompt 計數＋action 鍵改註解無效
- [x] `3bb5f5a` 24-2：落點幀判定修正＋紅身預警＋headless 驗證
  - **bug 與修正**：連續判定會誤判俯衝弦線中途擦過已閃避的玩家（玩家閃 +1.2x 正好在鳥來路旁，d≈0.76<0.95 誤判被啄；dtg≤0.25 窗口也不夠）→ 改**只在落點那一幀判定**（鳥恰好抵達預測落點：人在 = 被啄、閃開 >0.95 = 閃過）。預測精確：wheelAngle 恆 0.5 rad/s 線性積分，debug 數據證實落點與玩家 base 位置完全重疊
  - 預警色修正：藍身＋紅 emissive 疊成粉紅 → 攻擊時鳥身直接變紅（0xe8504a＋emissive 0x5a1414），藍→紅對比清楚
  - 俯衝排程 guard：lap < 2π-1.2（每 lap 3 撲 @2.0/5.2/8.4s，全周期 2.95s 均在一圈結束前完成）
- headless `.wheel24.cjs` **PASS**：星星 s.got 屏蔽基線 → 第 1 撲站立不動 = 被啄 -1★（col 0、dodges 0、invuln 1.5）／第 2 撲 right 閃 = 閃過 +1★（col 1、dodges 1）／abort cleanup（birds 0、pOff 0、ride 清）／pageErr 0
- 截圖目視 OK：/tmp/w24-01 盤旋（藍鳥×2 可見）／w24-02 俯衝（紅身直撲）／w24-03 閃過（prompt「★ 1（🐦 閃躲 x1）｜🐦 閃過! +1★」）
- 設計備忘：閃過判定 = 落點時 |pOff_now − pOff_lock| > 0.95（預測已烘焙 lock 時 pOff → 防站點卡位）；全閃 1.2 有 0.25 餘裕；invuln 被啄 1.5s／閃過 0.5s（蓋過 pass 0.45s 防回中被擦）

## 24-3 ✅ 回歸＋push＋live smoke 完成
- [x] `57da7a3` 11/11 回歸全 PASS（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park）＋shots/ 還原
- [x] push `9b68f62..57da7a3  main -> main`
- [x] live markers：park-wheel.js:9／park-catch.js:19
- [x] live smoke：`SMOKE22: {…"stars"4/4 參數不變…,"pageErr":0} PASS: smoke22`

---

## Round 25（Jerry 回饋）

1. 雲霄飛車：少數不順軌道改換作法——**鏡頭穩定器**（lookAt 點低通濾波和緩角度，不硬修幾何）
2. 遊樂園 UI：右上角 🌟 星星數與 🔊 聲音開關重疊 → 星星移到左側
3. 甜甜圈接接樂：
   - 接住 pose 手要明顯向上伸（現在只有手、看不出「伸出來接」）
   - 飛撲時手要朝飛撲方向伸
   - 特寫鏡頭太近來不及接 → 拉遠
4. 摩天輪：
   - A/D 閃身太難躲（鳥左右飛來，左右躲沒用）→ 改**跳躲**
   - 輪圈與雲霄飛車軌道同色（都 0xe2574c 紅）→ 換色

## 25-1 雲霄飛車鏡頭穩定器（look 點低通濾波）
## 25-2 UI：🌟 徽章右移 78px 避開 🔊
## 25-3 接住 pose：手舉過頭頂（-58→-105，肘跟進）
## 25-4 飛撲 pose：diveR/diveL 手朝飛撲方向
## 25-5 接接樂鏡頭拉遠：(px,4.6,4.2) lookAt (px,3.0,Z)
## 25-6 摩天輪跳躲：⚡ 抛物線跳 0.9s/2.2u、冷卻 1.4s、落點 3D 判定
## 25-7 摩天輪輪圈換紫 0x9b6fd8
## 25-8 驗證：11 回歸＋push＋live smoke

## ✅ Round 25 完成記錄（25-1~25-8 全完）

| 項 | 作法 | 驗證 |
|---|---|---|
| 25-1 鏡頭穩定器 | park-coaster.js 加 `smLook` 低通濾波（lerp 係數 1-e^(-6dt)），bank 方向與 lookAt 用平滑後點；位置仍跟車 | .ride22 PASS：23.6s/4星/0停，bankMax 24.3° |
| 25-2 UI 重疊 | .park-star right 16px→78px（🔊 46px+16 右距+16 間距） | /tmp/ui25-topright.png：徽章與 🔊 分開 |
| 25-3 接住 pose | character.js catch：手 -45→-108（頭頂≈-88、髮頂≈-88 之上），肘 -55→-87 | canvas 級 /tmp/d25-tex.png 雙手過頭頂；node 純函數 hL/hR y≈-108 |
| 25-4 飛撲 pose | diveR/diveL 手朝飛撲方向平伸；park-catch ~15fps 重繪 dive pose、撲完還原站姿 | .shot25c pageErr 0；/tmp/c25-02-dive-pose.png 右臂平伸 |
| 25-5 接接樂鏡頭 | 相機 (px,4.2,3.2) lookAt (px,3.2,Z)（fov 52 不變）；甜甜圈 y≈7-8 進畫面 ≈1s 反應；站牌柱/招牌退到 local z=-1.5 不擋臉 | .catch24 PASS；/tmp/c25-03-falling.png 3 個甜甜圈在上半部 |
| 25-6 摩天輪跳躲 | A/D 側閃→⚡ 跳（動作鍵/Space/E）：JUMP_T 1.0s、JUMP_H 2.2、冷卻 1.4s；鳥鎖座艙基礎位，落點幀 jumpH>0.95 即閃過（安全窗口 s∈(0.02,0.78)）；_predictPlayer 移除 pOff | .wheel25 PASS：被啄/跳躲+1★/冷卻擋二連/結算 cleanup（player 回站、wheelSpeed 0.25） |
| 25-7 摩天輪換色 | 輪圈 0xe2574c→0x9b6fd8（紫）；內環黃/座艙彩/頂旗紅保留 | /tmp/w25-02-overview.png：紫輪 vs 紅雲霄管清楚區分 |
| 25-8 回歸 | 11/11 PASS（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park）；shots/ 已還原 | 見下方 push/live smoke |

## Round 26（Jerry 回饋）

1. 甜甜圈接接樂：
   - 接到時手已明顯上伸 → 頭頂 🙌 icon 重複，移除（僅 catch pose）
   - 特寫鏡頭還是太近來不及接 → 再退遠（y6.4/z8.6 lookAt y4.2，甜甜圈 y≈10.5 進畫面 ≈1.5s）
2. 摩天輪：
   - 跳躲仍難（鳥上下飛來）→ 改 **A/D 左右躲 ＋ ⚡ 跳躲** 雙模式（鳥鎖定位後玩家再位移即閃過）
   - 特寫鏡頭太近來不及躲 → 改**全景固定鏡頭**（對準輪心、fov 60，整輪＋鳥群全可見）
   - 摩天輪放大 1/2（r 7.5→11.25、hub 9→13.5），RIDE_SPEED 0.5→0.34（一圈 12.6s→18.5s 遊玩更久）

## 26-1 接接樂：catch pose 去 🙌 icon＋鏡頭再拉遠
## 26-2 摩天輪放大 1.5x（park3d 幾何＋ParkWheel 常數＋RIDE_SPEED 0.34）
## 26-3 摩天輪 A/D 左右躲＋跳躲雙模式
## 26-4 摩天輪全景固定鏡頭（fov 60、cleanup 還原 52）
## 26-5 驗證：.wheel26＋11 回歸＋push＋live smoke

## ✅ Round 26 完成記錄（26-1~26-5 全完）

| 項 | 作法 | 驗證 |
|---|---|---|
| 26-1 接接樂去 icon＋鏡頭 | character.js catch pose 頭頂 🙌 不再繪製（手已舉過頭頂，icon 重複）；鏡頭再退 (px,6.4,8.6) lookAt (px,4.2,Z)，甜甜圈 y≈10 進畫面 ≈1.5s | /tmp/c26-02-catch-pose.png 無 🙌；.catch24 PASS |
| 26-2 摩天輪放大 1.5x | park3d 幾何（r 7.5→11.25、hub 9→13.5、星星/鳥環/座艙/支架/旗同步）；RIDE_SPEED 0.5→0.34（一圈 12.6s→18.5s 遊玩更久） | /tmp/w26-01-overview.png 無碰撞；pageErr 0 |
| 26-3 A/D＋跳雙模式 | A/D 左右側閃 pOff±1.2（加回）與 ⚡ 跳並存；鳥鎖定位含當時 pOff，落點幀用玩家實際位置（pOff+jumpH）判定；prompt「A/D 躲＋⚡ 跳」 | .wheel26 PASS：被啄/A/D閃(pOff1.2)/跳躲(cd1.4)/清理 pOff0 |
| 26-4 全景鏡頭 | 固定鏡頭對 hub（pos HUB+2/+26、lookAt hub、fov 52→60），整輪＋鳥群全入畫；cleanup 恢復 fov 52 | /tmp/w26-05-wide.png 整輪＋3鳥＋4星全見；.wheel26 回歸 PASS |
| 26-5 回歸 | 11/11 PASS（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park）；.catch24＋.wheel26 PASS；shots/ 已還原 | 見下方 push/live smoke |

## Round 26 push / live 驗證
- push：`7be5e70..f9ef4ad main -> main`（26-0~26-5 共 6 commits）
- live smoke：.smoke22 PASS（pageErr 0）
- live 代碼確認：park-wheel.js 含 26 標記 16 行（pOff/fov 60/RIDE_SPEED 0.34）

## Round 27（Jerry 新需求：海盜船）

1. 新增「海盜船」遊樂設施（ pendulum 擺盪船）
2. 主角坐**船尾**，**第一人稱視角**（相機在船尾、世界隨船旋轉，180° 時畫面翻轉）
3. **⚡ 按鈕時機**：最低點按對＝加速（海盜船越甩越高）；按錯＝慢慢減速
4. 整體速度不要太快、避免玩具感（慢而重的擺盪，一期 ~8s）
5. 加速到某速度後，**再加速要出現加速線條**
6. 加速到最快＝**完整轉一圈**（過頂 360°），同時：拿到頂端星星＋主角**緊閉眼睛嘔吐**（gag）

## 海盜船設計（27-0）
- **位置**：(17.5, 0, 9.5)，擺盪面＝X-Y 平面（船頭朝 +X）；站點 (12.5, 0, 10.5)。右前空地，不碰雲霄軌道（z≤6）/摩天輪（x≤-9）/樹（12,15）；全景鏡頭船頭不裁出畫面
- **結構**：A-frame 支架（pivot y=11.5）＋船身（船頭半徑 8／船尾半徑 4，全長 12）；最低點船頭 y=3.5 不碰地
- **第一人稱**：相機＝pivot − 3.3·f + 2.0·u（f=船向 (cosθ,sinθ,0)、u=船上方向；坐高 2.0＞靠背 1.75），lookAt 前方 10u；θ=180° 時 camera.up=(0,-1,0) 全畫面翻轉
- **物理**：θ,ω；α = -(G/L)·sinθ - c·ω；G=5、L=8（ω₀=0.79、小角度一期 7.98s 慢而重）；c 基礎 0.02（能量近守恆）
- **⚡ 泵**：|θ|<0.28rad(16°) 且 |ω|>0.12＝時機對 → ω += 0.38·sign(ω)（約 4~5 次泵到過頂）；按錯 → decay 1.8s（c=0.45 慢慢減速）
- **加速線條**：|ω|>1.2 時按對 → 複用 #park-speedlines 閃 0.7s
- **4 顆星**（船頭半徑 8、角度）：+50°、-50°、+115°（大擺幅）；**90° 頂端星只在完整轉圈時可拿**
- **轉一圈**：θ 未包裹計數，過 ±180° 且 |ω|>0.6＝真過頂 → 嘔吐 gag；累積 360°＝圈完成 → 強阻尼 c=0.8 收斂 → 底部 |ω|<0.5 或 4s → 結束
- **嘔吐 gag（2.2s）**：頭像 overlay（drawPortrait 閉眼＋疊加緊閉 ><＋mouthShape open 张嘴）＋3D 綠色嘔吐粒子（重力）＋prompt「🤮 嘔吐了!!」＋新 sfx 'vomit'（乾嘔+噴濺）
- **時間**：40s；結束→awardStars('ship', n)→cleanup（船歸位 θ=0、玩家回站點、相機回全景）

## 27-1 park3d：海盜船幾何＋站點 ✅（buildPirateShip：base A-frame 11 件＋ship group 20 件；station ship；action 映射 ship:window.ParkShip；截圖 s27-01 全景/s27-02 θ=0/s27-03 θ=90 驗證，pageErr 0）
## 27-2 park-ship.js：物理＋第一人稱＋上船/結束/cleanup（基本慢擺）✅（ParkShip：單擺 G5/L8 c0.02、初始ω0.35、泵±0.38/OMAX2.3、按錯 decay1.8s c0.45、fov60 第一人稱 cam=−3.3f+2.0u、40s→3s結算→cleanup 船歸位/玩家回(12.5,10.5)/fov52；index.html 掛載 park-ship.js；.ship27 PASS（泵對0.347→0.722/按錯E衰減26%/rotation.z同步/cleanup全還原），pageErr 0）
## 27-3 ⚡ 加速/減速時機＋3 星＋prompt 回饋 ✅（4 星置入：R_STAR 8.3、+50/−50/115° 擺幅星＋90° 頂端星（top&&非loopActive不可拿）；角度窗口0.24rad、park.addStar+blip；.ship27 加 R4b/R4c（頂端星拿不到+3星依序拿到+HUD🌟3+cleanup移除），PASS）
## 27-4 加速線條（超速再加速）✅（|ω|>1.2 再泵對→複用 #park-speedlines 閃 0.7s，遊戲時間計時器、結算/清理移除；.ship27 加 R4d（fast閃/到期消失/低速不閃）PASS）
## 27-5 轉一圈＋頂端星＋緊閉眼睛嘔吐 gag ✅（能量上膛：E=½ω²+(G/L)(1−cosθ)>1.43→loopActive（頂端星可拿；正轉時船頭 90° 先於 ±π 過頂，故用能量而非跨頂上膛）；跨 ±π 且 |ω|>0.6 真翻頂→嘔吐 gag 2.2s：drawPortrait(eyesClosed+mouth open)+>< 緊閉眼大頭彈出(#park-vomit-face)+12 綠粒子(重力−5)+#park-vomit 綠暈+sfx vomit；累 360°→settle c0.8 收斂/4s→「傳奇一圈」；cleanup 清粒子/綠暈/加速線；.ship27 加 R4e（gag 觸發+頂端星第4顆+自然收尾 4/4+清理）全 PASS、倒轉 gag 截圖確認）
## 27-6 驗證：.ship27＋回歸＋push＋live smoke ✅（.ship27 全流程 PASS（含 R4e 轉圈 gag 4/4）；.catch24＋.wheel26 PASS；11/11 回歸 PASS（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park）；shots/ 已還原；push 7b211ba，live smoke PASS、live park-ship.js 含 27-5 標記、#park-vomit 在位）

# 第二十八輪：學校＋時間系統（Jerry 需求 2026-07）

## 需求（原文要點）
1. **新地點：學校**——沿「出門那條路」繼續**往下**蓋學校（地圖路底端）
2. 學校裡可以上**課程**；**一開始進去先給教學**；教學結束後跳出**很大的字「你想要選哪一堂課上」**；**一次先選 4 堂**
3. **課表 8 門課**：家具課、烹飪課、釣魚課、花藝課、咖啡課（做咖啡，≠烹飪）、體育課（鍛鍊體力）、寵物課（照顧寵物）、跳舞課
4. **時間系統**：從 **1/1 開始、沒有年份**；**1 秒＝1 遊戲分鐘**（1 分鐘＝1 小時）；顯示**左下角、小小的**、**一樣字體（RHR）但較不同顏色**、不與背景重疊

## 設計（28-0）
- **時鐘**：`Game.clock = { day, month, hour, min }`，新遊戲起始 **1/1 08:00**（起床時間）；1 秒＋1 分；min→hour→day→month（月長 [31,28,31,30,31,30,31,31,30,31,30,31]，12→1 循環無年）；`Game.clockAcc` 累計 dt；DOM 小膠囊 `#clock-badge`（#screen-game 內左下角，RHR 字、藍色系配色 `#EAF6FC` 底＋`#4A9BC4` 邊＋`#2F6E96` 字，與綠草地/米白路都區分）；顯示格式 `🕐 1/1 08:05`（純數字+:/，無新 CJK）；僅分鐘變動寫 DOM；state==='game' 才走時；存檔 `clock` 進 fullSave（舊檔補預設 1/1 08:00）
- **學校位置（mapscene.js）**：`SC = { x: 490, y: 585 }` 路底端脈衝點（紫色系，區分麥當勞棕/遊樂園粉）；學校建築畫靜態底圖：x 350~630、y 505~655（壓住路尾，像路的終點站）——紅磚牆＋大屋頂＋門廊＋招牌「學校」＋校鐘＋旗杆＋兩棵小樹；點擊 34px 內 → `enterSchool()`
- **學校 screen（仿 shop/work 的 .screen 覆蓋層）**：`#screen-school`＋sub 'school'；setSub 掛 screen 顯示/隱藏；Esc/✕ → 回 map
- **流程**：首次進入 → Dialogue 教學（小宥帶路：歡迎來學校/這裡能選課/一次選4堂/學到技能）→ 結束後大標題 `school-big-q`「你想要選哪一堂課上？」（彈跳動畫大字）＋課卡格（8 張：emoji+名稱+一句介紹，點擊 toggles 選/不選，上限 4、選滿才可按「選好啦！」）→ 確認：sfx ding、toast「選定 4 堂課！」、`Game.school.selected` 存檔、顯示課表（4 張已選卡＋✅已學會）；**再進入**（visited）：跳過教學直接顯示課表＋「重新選課」按鈕
- **資料**：`SCHOOL_COURSES`（game.js 頂端）：furniture 🪑家具課/做家具、cooking 🍳烹飪課/做菜、fishing 🎣釣魚課/釣魚、flower 💐花藝課/插花、coffee ☕咖啡課/做咖啡、sport ⚽體育課/鍛鍊體力、pet 🐾寵物課/照顧寵物、dance 💃跳舞課/跳舞
- **狀態**：`Game.school = { visited: false, selected: [] }`；fullSave 加 `school`；beginGame 補預設（舊檔 `visited:false`）
- **技能效果（本輪範圍）**：選課＝「已學會」徽章＋課表（存檔）；每門課的實際玩法（做家具/煮咖啡/釣魚…）留待後續輪
- **字型**：新中文（學校/課程/選課/教學/體育/寵物/跳舞/烹飪/釣魚/花藝/咖啡/家具…）→ 重跑 `/tmp/fontenv/bin/python tools/make-font.py tools/full/ResourceHanRoundedTW-VF.otf`＋`?v=` +1（與 28-3 同 commit）
- **注意**：map 走路範圍 y 182~640 不變（學校門前 585 可走到）；地圖花/草随机生成要避開學校區；flow.mjs 等回歸若斷言地圖內容需留意

## 28-1 時間系統（Game.clock＋#clock-badge＋存檔）
## 28-2 地圖學校（mapscene 建築＋紫色脈衝點 SC＋enterSchool 觸發）
## 28-3 學校 screen＋教學＋選課 UI（8 課選 4＋大標題＋課表＋再進跳教學）
## 28-4 選課存檔＋技能狀態＋字型重跑
## 28-5 測試 .school28（時鐘走針/進學校/教學/選4/課表/再進/回歸）
## 28-6 回歸 11 套＋.ship27/.catch24/.wheel26＋push＋live smoke

## 28-1 時間系統（Game.clock＋#clock-badge＋存檔）
- ✅ **完成（commit 6970f95）**：`Game.clock` 1/1 08:00 起、無年、1 秒=1 遊戲分（`clockAcc` 累計 dt、`advanceClockMinute` 進位 min→hour→day→month→12月回1月）；`tickClock(dt)` 掛 frame 主迴圈（state==='game' 才走）；`#clock-badge` 左下角小膠囊（藍色系 #EAF6FC/#4A9BC4/#2F6E96，**bottom:176px 貼 dpad 上方**避免重疊）；fullSave/beginGame 帶 clock（舊檔補預設）；`.clock28.cjs` PASS（R1 起始/R2 3秒走3分/R3 進位+12月回1月/R4 存檔）＋地圖截圖確認

## 28-2 地圖學校（mapscene 建築＋紫色脈衝點 SC＋enterSchool 觸發）
- ✅ **完成**：`drawSchool(ctx)` 畫學校（路**左側**底端 x120~375、y462~655：棕大屋頂＋中塔鐘樓＋紅旗＋米白牆＋「學校」紅字招牌＋校門＋兩窗＋階梯＋灌木），`ensureMap` 在花草後繪製（蓋住隨機花）；`SC = { x: 420, y: 600 }` 紫色脈衝圈（`#9B6EC4`，雙圈擴散＋「學」字）——**位置從計畫的 (490,585) 路中改為 (420,600) 路左側**（不壓住路尾行走空間、避開麥當勞）；map click 34px → `enterSchool()`
- 截圖確認：地圖學校建築完整、脈衝圈在路邊、不擋走路

## 28-3 學校 screen＋教學＋選課 UI（8 課選 4＋大標題＋課表＋再進跳教學）
- ✅ **完成**：`#screen-school`（.screen 覆蓋層、紫色主題、z20）＋sub 'school'（setSub 掛顯示/隱藏、Esc/✕ → exitSchool→map）
- **教學**：不用 Dialogue（它在 #screen-game z5 會墊底）→ 自建 `school-tut` 面板（小宥頭像 canvas `drawPortrait(XIAOYOU_CFG)`＋4 段文字，點一下逐段推進，最後 ding 進選課）
- **選課**：大字 `school-big`「你想要選哪一堂課上？」（bounce-down 彈跳）＋8 課卡（2 行×4、emoji+名稱+一句話、選中紫色高亮＋✅、上限 4 toast 擋第5門）＋`school-foot`（已選 n/4＋確認鈕選滿才啟用）
- **確認/換課**：確認→visited+confirmed、toast「📚 選課完成！」、課表模式（按鈕變「換課」）；換課→回到選擇（保留已選）再確認
- **再進入**：visited=true 跳教學直接課表

## 28-4 選課存檔＋技能狀態＋字型重跑
- ✅ **完成**：`Game.school = { visited, confirmed, selected:[] }` 進 fullSave/beginGame（舊檔補預設）；`SCHOOL_COURSES`（8 門：furniture🪑/cooking🍳/fishing🎣/flower💐/coffee☕/sport⚽/pet🐾/dance💃）＋`SCHOOL_MAX=4`
- **字型**：/tmp/fontenv 被系統清掉 fontTools 的 .py → 重建 venv（pip install fonttools brotli）→ 重跑 make-font（1254 字元）→ `?v=20→21`

## 28-5 測試 .school28（時鐘走針/進學校/教學/選4/課表/再進/回歸）
- ✅ **完成**：`.school28.cjs` **PASS**（pageErr 0）：R1 地圖點 SC 進校/R2 教學4段→大字+8課/R3 選4（第5門被擋）/R4 確認→課表+存檔/R5 離開重進→無教學+4門已選+換課/R6 換課→取消烹飪(3)→選體育(4)→再確認
- 4 張截圖：s28-02 地圖學校 / s28-03 教學 / s28-04 選課(4選中) / s28-05 課表+toast

## 28-6 回歸 11 套＋.ship27/.catch24/.wheel26＋push＋live smoke
- ✅ **完成**：14 套回歸全 PASS（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park/.ship27/.catch24/.wheel26）＋本輪 .clock28/.school28；shots/ 已還原；push `686acbe..135a6e2`（28-0/28-1/28-2~28-5 三 commit）
- ✅ **live smoke**：`node test/.smoke22.cjs` **PASS**（pageErr 0）；live 標記確認：index 含 clock-badge＋screen-school、game.js 含 SCHOOL_COURSES、mapscene 含 drawSchool、style.css ?v=21、fonts/rhr-900.woff2 新尺寸 254008B（今日重建）

> **第二十八輪完成 ✅**（2026-11-18）：學校上線（地圖建築＋小宥教學＋8選4選課＋課表/換課＋存檔）＋時間系統（1/1 08:00 起無年、1秒=1遊戲分、左下角藍膠囊）；14 套回歸＋.clock28/.school28 全 PASS；push 135a6e2、live smoke PASS。

# 第二十八點五輪：遊樂園 2 修復（Jerry 要求 2026-11-19，第29輪暫停先做）

## 需求（原文要點）
1. **海盜船**：第一人稱看不到自己嘔吐 → 玩海盜船時旁邊加一個**主角臉部特寫小框**，顯示豐富表情
2. **雲霄飛車**：慢動作錄影發現「360° 鏡頭」不是真跟軌道繞一圈，而是 **2 次 180° 快速反轉**（繞圈畫面閃太快不順）→ 改**真跟軌道繞一圈**，鏡頭穩定性也要保持

## 根因分析
- **雲霄飛車 180° 翻跳**：park-coaster.js 相機 `camera.up` 恆為世界向上＋bank。垂直迴環內切線在垂直平面轉 360°，環牆段視向近垂直 → 繞世界 Y 的方位角退化（水平投影≈0）→ lookAt 基數翻 180°，一個環發生兩次＝「2 次 180° 快速反轉」。
  **修法**：環內（u∈[t0,t1]，與車廂同一 up＝環心方向）相機改用車體座標——`camT=p−6·tan+up·4`、`look=p+5·tan+up·1`、`camera.up` 低通追蹤車體 up（`smUp`，環底兩 up 重合→無縫）；環內濾波/跟隨速率提高（look 6→14、pos 5→8、up 6→14）才跟得動 360° 旋轉；環內 bank 歸零（避免雙重滾轉＋環牆 dh 雜訊）。環外全部維持 25-1 原穩定器不變。
- **海盜船嘔吐看不到**：第一人稱相機在船尾，嘔吐 gag 只有大頭彈出＋粒子；FPV 下玩家看不到「自己的臉」在反應。
  **修法**：動態建立 `#park-facebox`（右上角小圓框，canvas 隨 DPR 放大），海盜船全程顯示主角頭像（drawPortrait，與立繪同源），表情分層：**calm**（小擺微笑）→**fun**（中等擺）→**excited**（|ω|>0.95 張嘴）→**panic**（loopActive 或 |ω|>1.45：張嘴＋頭汗）→**vomit**（>< 緊閉眼＋張嘴＋落淚＋綠暈＋頭抖）；眨眼定時器、gaze 隨 ω 擺頭、頭部微傾斜；結算 3s 期繼續顯示（慢慢擺回→calm）；cleanup 隱藏。無新 CJK 文字→字型/`?v=` 不動（樣式全 inline，不碰 style.css）。

## 子任務
- 28.5-A ✅（ff50359）：海盜船臉部特寫小框（park-ship.js：_ensureFacebox/_updateFace/_drawSquint 共用＋start/update/ride/cleanup 掛載）＋.shipfix 測試（5 層全中＋pageErr 0）＋截圖
- 28.5-B ✅（v8）：雲霄飛車 360° 跟環相機（見下方最終設計）＋.coasterfix（L1 方位角 334° 單圈、逐幀最大跳轉 33.3°、0 flip、4 星 0 pageErr）＋6 張環內快照確認
- 28.5-C ✅：回歸 .ride22（4/4 星）＋.ship27 全 PASS
- 28.5-D ✅：雲霄飛車主角真 billboard——修「繞圈時主角突然消失」（見下方設計）＋.bill285 PASS＋回歸 .coasterfix/.ride22 PASS

## 28.5-D 主角真 billboard（修「繞圈主角消失」）
- **Jerry 觀察（2026-11-20）**：雲霄飛車繞圈時主角突然消失，猜測是「主角只有站立角度、沒有顛倒角度畫不出來」
- **根因**：猜測方向對、位置不同——(1) 28.5-B 時代的 workaround：環內（inLoop）把主角 sprite 淡出到 opacity 0（當時原因是直立-only 的 2.4×3.0 平面在環內佔 30~50° 偏大）；(2) 主角 plane 只有 yaw 旋轉、平面恆直立（永遠「站立」姿態），不會跟車體翻轉
- **修法**（park-coaster.js _updateVisual）：
  1. 廢掉環內淡出（billO 邏輯整段刪除），opacity 恆 1
  2. 真 billboard：平面法線（+Z）恆指相機（去頭向分量→垂直頭向平面內投影＋退化保護；右手系 x=y×z 保紋理不鏡射）；平面 +Y（頭向）跟車體 up（環外＝世界向上／環內＝朝環心）→ **環頂頭朝下、倒立角度畫得出**
  3. 四元數直接跟（copy 非 slerp）：相機位置本身已低通平滑→目標平滑；slerp 14/s 會滯後環內高速視角（face 73.6%→改直接跟）
  4. 回頭/慶祝仍只切紋理（背影 up↔正臉 down）；fwdYaw/camYaw 航向 lerp 刪除（dead code）；_cleanup 加 quaternion.identity() 還原
- **幾何上限**：face＝dot(法線, 朝相機)＝√(1−(toCam·head)²)；環頂頭向朝環心（下）而相機在環外上方→該視角最佳解 face≈0.76（≈40° 傾角），非 bug
- **測試 .bill285.cjs** PASS：minOpacity 1.000（全程無淡出）、環內中段頭向朝環心 >0.75 占比 100%（avg 1.00）、face>0.5 占 98.3%／>0.75 占 90.9%（不側對）、逐幀最大跳轉 34.9°／0 flip、4 星 0 pageErr；快照環頂/環牆/entry/exit 主角皆在（環頂倒掛、環側側傾）＋ride22 L3 環快照主角可見＋完賽回站點主角直立（quaternion 已還原）
- **回歸**：.coasterfix PASS（L1 方位 334.4°、0 flip、4 星 0 pageErr，相機行為不變）、.ride22 PASS（4/4 星、0 停、0 pageErr）
- **push/live（2026-11-20 晚）**：push `20d8e35` 上線 GitHub Pages；live park-coaster.js 確認含 28.5-D 標記×3、billO 0 處；.livesmoke285 PASS（pageErr 0、4 環、L3 fixedN 在位）；⚠️ js 無 ?v= 防快取→使用者需強制重新整理（Ctrl/Cmd+Shift+R）

## 28.5-B 最終設計（v8，多輪迭代後的收斂解）
- **演進**：v3 chase+guard（最近點 guard 不夠）→ v4 環內 orbit（環面視向必穿出管→支柱/管遮蔽，結構死）→ v5 環外 flyaround（入口坡遮蔽）→ v6 chase+2.0（環頂撞山脊）→ v6.1 偏移 3.4＋lead 5u（L1 入口坡 0.128／L3 遠牆 0.18 遮蔽）→ v6.2 固定法線（L1 雙側皆敗）→ v7 純 orbit（底端 Rcam−LIFT=R 內切環、與不夾地衝突＋入口/出口佔據底端走廊）→ **v8＝v6.1 基礎＋L3 固定 +x 法線＋3D 軌道推離護衛**
- **v8 核心**（park-coaster.js 環內）：
  1. `nrm = Lp.fixedN ? fixedN : rhat×tan`；L3 固定 [1,0,0]（動態法線在 L3 入口指 −x−z→視向穿越環面撞 −z 外緣 0.18；park3d.js LOOPS_DEF 加 fixedN）
  2. `camT = chaseT + nrm·3.4`、`look = carPos + tan·5`、world up（無翻轉）
  3. **推離護衛**：1200 軌道點（Float32Array 緩存，無每幀配置）；鏡頭離管 <0.8u 且前/側方→推至 1.15u；視向車前段離管 <0.45u→推至 0.8u；3 次迭代、目標 y≥0.8；低通 20/s 抹平＝鏡頭輕輕側移讓軌道
- **靜態掃描**（.dbgcl.cjs 四環）：losBefore 全清（≥0.484 或 null）、camClose ≥1.3u@≤41°（僅畫面角落細條）、L1 方位角 346°／L3 −352°
- **關鍵洞察**：環底進/出口走廊兩側都被進出環軌道佔據（L1 +x U 形彎/−x 出口、L3 +x L4 環），任何環底相機路徑都會擦入→局部推離比改軌跡更穩

> 📌 做完接回第二十九輪 29-2（家具課→黑板）。

> ✅ **第二十八點五輪完成**（2026-11-20）：28.5-A 海盜船臉部小框（ff50359）＋28.5-B 雲霄飛車 v8 跟環相機（見上）全 PASS；慢放复查無 180° 翻跳；28.5-D 主角真 billboard 修「繞圈主角消失」（見上）。

# 第二十九輪：課程生效（選的課要有實際效果）

## 來源
- Jerry 在第二十八輪完成後說「continue」→ 接 28-0 明確留的尾巴：「每門課的實際玩法（做家具/煮咖啡/釣魚…）留待後續輪」
- 本輪範圍＝**第一階段**：先做 3 個輕量效果（速度/新家具/新牆飾），樹立 needsCourse 門控模式；重的（新 mini-game/場景）留後續輪

## 調查結果（2026-11-18，行號以當時 js/game.js 1900+ 行版本為準，用 grep 重新定位）
- **走路速度**（js/game.js）：
  - 房間 WASD：`const speed = 4.4 * dt;`（updateGame，tryMove 前）
  - 房間點地面走：`const speed = 4.8;`（moveTarget 分支）
  - 地圖 WASD：`m.x = clamp(m.x + (dx / len) * 235 * dt, ROAD_L + 10, ROAD_R - 10)`（case 'map'）
  - 地圖點地面：`m.x += (x - m.x) * Math.min(1, dt * 250 / d)`（比例式，可同步乘 speedMul 保持一致）
- **BUILD_ITEMS**（js/world.js:1237）：`{ id: { name, tab: 'furniture'|'decor'|'floor', w, d, h, max, block, draw: fn } }`；現有 furniture：bed/desk/chair/sofa/shelf/dresser/lamp/piano；decor：plant/vase/teddy/balloon…
- **WALL_ITEMS**（js/world.js:1688）：`{ id: { name, tab: 'wall'|'fest', max, span, hMid, hitW, sizeH, draw: fn } }`；現有：heartFrame/starFrame/clock/poster/wallShelf/garland(彩旗)/couplet…（注意「彩旗」已存在，花藝課新項用「花環」避免撞名）
- **POSES**（js/character.js:131）：**dance 姿勢已存在**（label 跳舞、emoji ♪、sway+手臂動畫）→ 跳舞課**不需要**新姿勢；startPose（game.js:834）依 POSE_ORDER 輪替
- **WORK_LEVELS**（js/mini.js:23）：打工關卡是獨立 mini-game → 咖啡/烹飪課若要做關卡，體量大，**留後續輪**
- **學校狀態**（js/game.js）：`Game.school = { visited, confirmed, selected: [] }`（已存檔）；`SCHOOL_COURSES` ids：furniture/cooking/fishing/flower/coffee/sport/pet/dance；`SCHOOL_MAX=4`
- **建造 UI**：建頁卡由 BUILD_ITEMS/WALL_ITEMS 生成（game.js 的 setupBuildUI/fillBuildTabs 一帶，grep `BUILD_ITEMS` 可找到迭代點）；放置流程 Game.placement { item, mode, ... }

## 本輪設計
- **共用 helper（game.js，放 SCHOOL_COURSES 下方）**：
  ```js
  function hasCourse(id) { return !!(Game.school && Game.school.selected && Game.school.selected.includes(id)); }
  function speedMul() { return hasCourse('sport') ? 1.25 : 1; } /* 第二十九輪：體育課 */
  ```
- **29-1 體育課 ⚽ 速度×1.25**：4.4/4.8（房間）、235/250（地圖）全部乘 speedMul()
- **29-2 家具課 🪑 黑板**：BUILD_ITEMS 加 `board: { name: '黑板', tab: 'decor', w: 2, d: 1, h: 50, max: 1, block: true, needsCourse: 'furniture', draw: drawBoard }`；drawBoard＝木框+墨綠板面+白粉筆線（手寫風，參照 drawPlant/drawVase 的寫法與位置）；商店：未上家具課→卡片灰色+🔒+提示「上家具課解鎖」且不可放
- **29-3 花藝課 💐 花環**：WALL_ITEMS 加 `flowerWreath: { name: '花環', tab: 'wall', max: 2, span: 1, hMid: 160, hitW: 18, sizeH: 44, needsCourse: 'flower', draw: drawWallFlowerWreath }`；同樣商店門控
- **留後續輪（寫進 PROGRESS 記錄即可）**：跳舞課（姿勢已有→可考虑跳舞時發 ♪ 粒子）、烹飪/咖啡/釣魚/寵物（需新 mini-game 或場景）
- **字型**：新 CJK（黑/環/解鎖…部分已有）→ 重跑 make-font＋`?v=21→22`；⚠️ /tmp/fontenv 若再被清：`python3 -m venv /tmp/fontenv --clear && /tmp/fontenv/bin/python -m pip install fonttools brotli` 再重跑
- **測試 .course29.cjs**：R1 speedMul（無課=1/有體育課=1.25）＋地圖走 1s 位移比較（約 235 vs 294px）；R2 無家具課→黑板卡鎖定不可選；R3 有課→可選可放可存檔（reload 後還在）；R4 花環同上（抽一測）；pageErr 0

## 子任務
## 29-0 計畫（本節）
## 29-1 hasCourse/speedMul＋體育課速度×1.25
- ✅ **完成**：game.js 加 `hasCourse(id)`＋`speedMul()`（體育課=1.25）；房間 4.4/4.8、地圖 235/250 全部乘 speedMul；`.q291.cjs` PASS（base=1/withSport=1.25/地圖 1s 實測 293.75px=235×1.25、pageErr 0）
## 29-2 家具課→黑板（BUILD_ITEMS+drawBoard+商店門控）＋ 29-2b 旋轉缺面修復
- ✅ **29-2 完成**：
  - world.js `drawBoard`（4 腳＋木框 isoBox 2×1 h12-46＋墨綠板面＋白粉筆 A+/波浪/愛心/太陽＋粉筆托 2 支粉筆；bad tint 換色）
  - `BUILD_ITEMS.board: { name:'黑板', tab:'decor', w:2, d:1, h:50, max:1, block:true, needsCourse:'furniture', draw:drawBoard }`（surfaceHAt 跳 decor→黑板上不會疊小東西；rebuildBlocked 不看 tab→block 生效）
  - game.js：`COURSE_NAMES` const＋floorCard 門控（無課→卡片 `dis locked`＋🔒＋「上 X 課解鎖」提示、點擊 showToast 不放置）
  - style.css：`.bi-lock`/`.locked`（grayscale＋降透明）
  - 字型免重建：黑/板/花/環/解/鎖/先 全在 rhr-900.woff2（fontTools cmap 驗證）
  - `.qa292.mjs` **ALL PASS**（12 項：鎖定卡 UI/toast/選課解鎖/進入放置/BUILD_ITEMS 參數/pageErr 0）
- 🔍 **QA 發現既有 bug（29-2b）**：rot=1 時所有旋轉家具**缺前右寬面**（床/書桌/沙發/鋼琴/黑板）——根因 `isoBox` 側面/描邊硬編碼原座標 BC/CD 面，rot90 後該兩面變背面/窄面，螢幕真正可見的 B'-C' 寬面沒人畫；`drawBed` 同樣硬編碼；另 `faceSpace` 原點錯：'ty' rot0 原點 A 非 D（五斗櫃抽屜畫到頂面/背面、鋼琴鍵掛背邊）、ROT 分支 'tx' 原點對 w>1 會到盒中心
- ✅ **29-2b 修復**（world.js）：
  - `isoBox`：以菱形最底角 bi 決定兩個可見側面（bi 相鄰兩邊），midpoint x 對比盒子中心定 right/left 色；描邊＝底角＋兩相鄰角豎線＋頂菱形 → 任意 rot 都畫對
  - `drawBed`：同法選面；顏色物理正確（長邊 AB/CD 深 #E2AE7C、端頭 BC/DA 淺 #F0C08F）
  - `faceSpace(ctx,tx,ty,h,which,w,d)`：rot0 'tx' 原點 B=(tx+w,ty)→C；rot0 'ty' 原點 D=(tx,ty+1)→C；ROT 'tx' 原點 f(tx+w,ty+1)→前左窄面；ROT 'ty' 原點 f(tx,ty)→前右寬面（內容始終顯示在朝向鏡頭面）；drawShelf/drawDresser/drawPiano 呼叫補 w/d
  - `drawBoard` 板面：同 isoBox 邏輯選「最底角的較長前邊」為綠板面，g1=螢幕左端點保證 A+ 不鏡射；rot0 座標與原實作完全一致
- ✅ **驗證**（test/.proberot.mjs 1800×2000 12 格 before/after）：rot0 床/書桌/書架/沙發像素級一致（magick compare 僅 58 px × 1-3 階 AA 抖動＝無回歸）；rot1 床/書桌/沙發/鋼琴/黑板缺面全補上、腳不懸浮；五斗櫃抽屜/鋼琴鍵 rot0 從背面移到前面（faceSpace 原點修正的預期變化）；`.qa292.mjs` 重跑 **ALL PASS**＋截圖（/tmp/292-*.png）確認 rot0/rot1 黑板、鎖定卡、房間視圖皆正確
- ⚠️ 已知小限制（不影響本輪）：rot1 鋼琴鍵仍顯示在前右寬面（物理上鍵盤可能背對鏡頭）＝「永遠可見」取捨；rot1 沙發靠背在寬邊（朝向取捨）。若要更真可加 rot=2/3，留後續輪
## 29-3 花藝課→花環（WALL_ITEMS+drawWallFlowerWreath+商店門控）
- ✅ **完成**：
  - world.js `drawWallFlowerWreath`（春花環：12 片綠葉環 #8FD49B/#63B57B＋5 朵 5 瓣小花（粉/黃/藍/橘/粉，角度偏 36° 讓頂部空出）＋頂部粉紅蝴蝶結＋中心小愛心；bad tint 全換；與冬青花環同結構但顏色/結位置/中心愛心區隔）
  - `WALL_ITEMS.flowerWreath: { name:'花環', tab:'wall', max:2, span:1, hMid:170, hitW:17, sizeH:36, needsCourse:'flower', draw:drawWallFlowerWreath }`（「花環」vs 既有「冬青花環」不撞名）
  - game.js `wallCard` 加與 floorCard 同款課程門控（無課→dis+locked+🔒＋「上花藝課解鎖」＋toast 不可放置）
  - 字型免重建：花/藝/課/環/解/鎖/先 全在 rhr-900.woff2（fontTools cmap）→ 不需 ?v= bump
  - `.qa293.mjs` **ALL PASS**（12 項：wall 頁鎖定卡 UI/toast/選課解鎖/startWallPlacement wall 模式/WALL_ITEMS 參數/無 pageerror）＋截圖：花環放大（/tmp/293-closeup.png）與冬青花環並排風格一致、房間掛牆視圖、商店鎖定卡
## 29-4 字型重跑 ?v=22＋.course29 測試
- ✅ **完成**：
  - 字型免重建：29-2/29-3 新增 CJK（黑板/花環/花藝/解鎖/先）全在 rhr-900.woff2 cmap（fontTools 驗證）→ 不需 ?v=22，font 維持 `?v=21`
  - `test/.course29.mjs` 整合測試 **ALL PASS**（14 項）：R1 speedMul 1/1.25；R2 黑板卡鎖定/提示/解鎖；存檔含黑板＋花環＋選課；reload→startGame 續玩後黑板/花環/選課/speedMul 全持久化、黑板卡仍解鎖；0 pageerror
- **peek-build.mjs 期望值更新**（tracked 測試）：牆飾卡 6→7（29-3 花環）、擺飾卡 4→5（29-2 黑板）——新卡即使鎖定也計入 `.build-item` 數量
## 29-5 回歸 14 套＋.clock28/.school28＋push＋live smoke
- ✅ 14 套回歸＋.clock28/.school28 全 PASS（flow/peek-build/peek-recover/peek-bgm-filefix/peek-character/peek-map/peek-work/peek-fest/peek-mobile/peek-pose/peek-park/.ship27/.catch24/.wheel26/.clock28/.school28）
- ✅ **push＋live smoke**：push `01f9d8c..d4035ae`（29-2/29-3/29-4 三 commit）上線 GitHub Pages；`.livesmoke29.cjs` **PASS**（live drawBoard/drawWallFlowerWreath/speedMul 皆 function、board[2,1,furniture]/wreath[2,flower]/COURSE_NAMES.花藝課、黑板卡＋花環卡在商店、0 pageErr）
- ⚠️ js 無 ?v= 防快取：使用者需強制重新整理（Ctrl/Cmd+Shift+R）
> **第二十九輪完成 ✅**（2026-11-20）：課程正式生效——體育課⚽行走速度×1.25（speedMul 唯一出口）＋家具課🪑解鎖黑板（2×1 裝飾家具：木框＋墨綠板面＋粉筆塗鴉＋粉筆托）＋花藝課💐解鎖花環（春花環牆飾：綠葉環＋5 朵小花＋蝴蝶結＋愛心）；商店卡片課程門控（無課→灰卡🔒＋提示＋toast）；順手修復 29-2b 既有旋轉 90° 缺面 bug（isoBox/drawBed 硬編碼側面→最底角選面、faceSpace 四分支原點修正、drawBoard 板面選面）。測試：.q291/.qa292/.qa293/.course29 全 PASS＋.proberot before/after 驗證（rot0 像素一致、rot1 缺面全補）＋14 套回歸＋.clock28/.school28 全 PASS；字型免重建（新 CJK 全在 cmap）；push d4035ae、.livesmoke29 PASS。

## 第三十輪：課程內容補完（跳舞/烹飪/釣魚/咖啡/寵物）（Jerry 要求 11-21）

需求：「繼續補完課程內容」——第 29 輪只做 3 堂（體育/家具/花藝），補上剩下 5 堂，讓 8 堂課全部有實質效果。

### 設計（沿用 29 模式：課程＝具體效果、複用既有系統、商店 needsCourse 門控通用自動生效）
- **30-1 跳舞課 💃**：跳舞姿勢（pose=dance）時若 hasCourse('dance') → 頭上冒 ♪/♫ 音符粒子（上浮+搖擺+淡出 1.2s，每 0.4s 一個）＋sfx('note') 短音（audio.js 新增：sine 659→880）。spawn 在 updateGame 'free'、draw 在 renderGame（玩家畫完後）。
- **30-2 烹飪課 🍳→爐子**：world.js drawStove（白灰爐身 isoBox 1×1 h≈26＋黑爐面 2 爐頭＋鐵鍋＋蓋＋蒸汽 3 條）＋BUILD_ITEMS.stove { name:'爐子', tab:'decor', w:1, d:1, h:26, max:2, block:true, needsCourse:'cooking' }（floorCard 門控自動：灰卡🔒「上烹飪課解鎖」）。
- **30-3 咖啡課 ☕→咖啡機**：world.js drawCoffeeMaker（復古銀白機身＋按鈕＋玻璃壺咖啡＋杯子＋蒸汽）＋BUILD_ITEMS.coffee { name:'咖啡機', tab:'decor', w:1, d:1, h:34, max:1, block:true, needsCourse:'coffee' }。
- **30-4 釣魚課 🎣→池塘＋釣魚小游戏**：
  - mapscene.js 畫池塘（**實作在右上角 (770,185)**——原計畫 (705,500) 被麥當勞擋住；POND={x,y,rx:62,ry:34}＋drawPond：水塘橢圓#8FD3E8＋漣漪＋睡蓮×2＋小木碼頭+釣竿+釣牌）
  - game.js 地圖點擊：命中池塘（橢圓式含+10 容差）→ startFishing()（內含 hasCourse('fishing') 門控：無課 toast '🎣 先上『釣魚課』才能釣魚喔～'）
  - #screen-fish（HTML 只有 ✕＋訊息 bubble＋按鈕，畫面全 canvas 畫，同 screen-work 模式；sub='fish'）
  - 釣魚狀態機（mini.js：FISH_TABLE/Fish/startFishing/exitFishing/setFishUI/fishAction/updateFish/renderFish；case 'fish' in updateGame）：ready（點「🎣 拋竿」sfx blip）→ wait（1.5~4.0s 隨機 biteAt，魚影接近）→ bite（浮標沉＋「!」＋sfx ding，0.9s 窗口，按鈕變紅「💦 撈！」）→ 撈=caught（魚表：小魚8/彩魚15/青蟹25/金魚40，權重50/30/15/5；Game.money 加幣+Game.fish.caught++＋saveGame(fullSave('done'))；魚飛出弧線動畫+水花+「+N」浮字 1.6s）→ ready；bite 沒撈=missed（水花，1.6s 後 ready）
  - renderFish 側視場景：天空/太陽/雲/遠山/湖水/水波/水下魚影/左右岸+蘆葦/睡蓮/碼頭+水桶/小宥（草帽白衫藍背帶褲坐碼頭持竿）/釣線+浮標/右上角「已釣 N 隻」
  - ESC 支援（同 school 模式）；Game.fish {caught} 進 newGame/beginGame/fullSave
- **實作備註（30-1~30-4 已完成）**：30-1 已過 .q301（7 項）；30-2 faceSpace 的 h 要用「物體頂部高度」（爐門 faceSpace h=22）；30-3 咖啡機實作 h=36（plan 寫 34，以實作為準）；30-4 已過 .q304（14 項：門控/開屏/拋竿/咬餌/撈到/漏掉/ESC/存檔重載）
- **30-5 寵物課 🐾→小貓跟隨**：hasCourse('pet') → Game.pet {x,y}（tile 座標，init=玩家位置）；updateGame 'free' lerp 追玩家（落後玩家右後方 ~0.45 tile、6 tile/s）；renderGame items 加 drawCat（depth p.x+p.y+0.2 畫玩家前面）；world.js drawCat：橘色虎斑（頭+三角耳+內耳+開心閉眼弧+鵝蛋身+環尾擺動+胸前的白+走路微顛）~30px 高
- **30-6 字型重建**：新 CJK（塘/池/咬/快/溜/甩/竿/爐/機/蟹/彩/金/小/到/太/早/慢/貓…）→ make-font 重跑＋?v=21→22（fontenv 若被清先重建）
- **30-7 .course30.mjs 整合測試**：R1 跳舞課音符（pose dance+課→notes>0；無課→0）；R2 爐子鎖/解/放/存檔重載持久；R3 咖啡機同（抽一）；R4 釣魚（有課開屏/無課 toast、強制 bite 流程 catch 加錢加數、0 pageErr）；R5 小貓（有課 Game.pet 存在且 2s 內靠近玩家；無課無 pet）
- **30-8 收尾**：peek-build 期望更新（decor 卡 5→7）＋14 套回歸＋.clock28/.school28/.course29＋push＋live smoke

### 子任務
- 30-0 ✅：計畫（本節）
- 30-1 ✅：跳舞課音符（.q301 7 項過；startPose 會先 ++poseIdx，測試要 poseIdx=2 才到 dance）
- 30-2 ✅：爐子（faceSpace h=頂高 22；screenshot 驗證）
- 30-3 ✅：咖啡機（h=36；screenshot 驗證）
- 30-4 ✅：池塘＋釣魚小游戏（.q304 14 項過；三態 screenshot 驗證）
- 30-5 📋：小貓跟隨
- 30-6 📋：字型＋?v=
- 30-7 📋：.course30 整合測試
- 30-8 📋：回歸＋push＋live smoke

> 📌 接手筆記：門控/存檔/商店卡全自動（needsCourse）；釣魚畫面走主迴圈 sub='fish'（同 work）；新中文都靠 make-font 自動收集，最後統一重建字型。
