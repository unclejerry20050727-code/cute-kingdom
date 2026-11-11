# TERMINATED-ANALYSIS——會話中斷原因分析＋解法 plan（11-10，第二十輪）

## 症狀
第二十輪開發中會話多次在任务中途被切斷（terminated）。working tree 在磁碟上沒丟，但每次重開要重新對接狀態，耗 context → 更容易再次中斷，形成循環。

## 原因分析（可能性排序）
1. **context window 只 128k，單輪累積太多**：整檔讀取（park3d.js 500+ 行、park-coaster.js 200 行）、edit 的 old/new 大區塊、Node 量測輸出、Playwright log → 長任務還沒做完就逼近上限。
2. **單一長跑操作**：Playwright + SwiftShader headless WebGL ~200ms/幀；一個 QA script 同時做「載入＋多張截圖＋完整騎行模擬」可能跑幾分鐘，單一步驟越長越容易在中段被切。
3. **checkpoint 不夠即時**：中斷時若「哪些 edit 已完成、哪些待做、關鍵數值」不在檔案裡，下場會話要重新調查 → 燒 context → 再中斷。
4. **單 turn 塞太多事**：一次 turn 混「大 edit×N＋驗證×N＋QA」→ 該 turn 輸出體積過大。

## 解法 plan（已執行中）
### A. 狀態即時寫檔（已完成）
- `PROGRESS.md`「20 進行中 checkpoint＋terminated 對策細切（11-10）」＝精確現況＋剩餘 8 小步。
- 本檔＝原因分析＋plan。

### B. 工作細切成 8 小步（每步＝單一動作→驗證→commit）
| 步驟 | 內容 | 上限 |
|---|---|---|
| 20-1 | park3d.js buildCoasterTrack 重寫（單一 edit） | 1 edit |
| 20-2 | node --check＋瀏覽器靜態 smoke（1 script，≤30s）＋commit | 1 載入 |
| 20-3 | 靜態 QA 截圖（1 script，≤3 張） | 3 張 |
| 20-4 | 騎行 QA（dt×3＋waitForFunction，≤60s 遊戲時間） | 1 騎行 |
| 20-5 | commit（20a+20b+20c 全代碼）＋PROGRESS 更新 | — |
| 20-6 | 20d 回歸（peek-park＋11 套件，分兩次跑） | 2 次 |
| 20-7 | README/PROGRESS 收尾＋刪 dotfiles | — |
| 20-8 | 發布（push→Pages→live smoke）＋報告 | — |

### C. 每步限時限體積
- 讀檔：`grep -n`/精確 offset 抽取區域，**不整檔讀**。
- edit：每 edit ≤1 個函數；oldText 貼上前先 `read` 該區域確認逐字匹配。
- QA script：launch 後 `waitForFunction` 帶 timeout；一次 ≤3 張截圖；不同步灌 >100 幀（19b 教訓）。
- 單 turn 產出目標：<1 個大 edit＋≤2 個短 bash＋1 個 commit。

### D. 中斷後接手流程（下一場會照做）
1. `git log --oneline -5`＋`git status --short` → 判斷進行到哪個 20-x 步。
2. 讀 `PROGRESS.md`「20 進行中 checkpoint」節 → 精確現況（含所有關鍵數值）。
3. 從「剩餘小步」第一個 📋 續做，**不重新調查**。
4. 每完成一步就 commit＋更新 PROGRESS.md 的 📋→✅。
