# Terminated 失敗分析與解法 Plan

> 建立時間：2026-11-04｜動機：AGENTS.md「分析一直失敗 terminated 的原因，針對原因提出解法 plan，先記錄在檔案再去解問題」
> 数据来源：`~/.pi/agent/sessions/--home-obot-Projects-20261023-3rd-game--/*.jsonl`（8 個 session、共 100+ 次失敗記錄）

## 1. 症狀

| Session | terminated | Request timed out | Connection error | session 大小 |
|---|---|---|---|---|
| 10-23 | 1 | 3 | – | 2.8M |
| 10-24 (a) | 10 | – | – | 6.2M |
| 10-24 (b) | 2 | 4 | – | 16M |
| 10-26 | 4 | – | – | 4.6M |
| 10-27 | 1 | – | – | 11M |
| 10-28 | 6 | 4 | – | 11M |
| 10-30 | 21 | 26 | 2 | **24M** |
| 11-03（目前） | **22** | – | – | 2.0M |

- 目前 session 22 次失敗 **100% 是 `terminated`**。
- 失敗呈「連續 4～5 次、每次間隔約 5 分鐘」的叢集（pi 自動重試 `retry.maxRetries=3`，一整輪白等 20～30 分鐘）。

## 2. 數據證據（jq 抽樣）

**terminated 請求的 durationMs（從發起到中斷的總時長）：**

```
314.7s  316.7s  317.3s  317.7s  318.5s  319.2s  322.8s  324.6s  324.7s
325.9s  326.0s  327.5s  331.5s  332.5s  338.1s  341.3s  393.0s  446.2s
453.6s  485.6s  598.5s  600.2s  603.7s  609.4s  757.0s  786.9s  893.2s
```

**成功請求的 durationMs：** 19s～176s（全部 ≤176s）。

解讀：
1. 成功/失敗之間有乾淨的空檔（176s ↔ 314s），且失敗集中在 **~300s（5 分鐘）** 界線上方 → 存在一個 300s 的斷線機制。
2. 600s 的案例 ≈ 2×300s、757s/787s ≈ 2.5×300s → openai SDK 內部 `maxRetries=2` 重試累加，進一步印證每次「單發」都在 ~300s 被切。
3. 10.5s 的 `Request timed out.`（10/30～11/2，成串 3～4 次）→ 伺服器端短暫不可用（vLLM 重啟/OOM/排隊），屬瞬態問題、重試後自然恢復，**不是目前主因**。

## 3. 根因（已驗證，非猜測）

### 3.1 pi 的 HTTP idle timeout = 300s（直接兇手）

- 來源：`pi-coding-agent/dist/core/http-dispatcher.js`
  ```js
  export const DEFAULT_HTTP_IDLE_TIMEOUT_MS = 300_000;   // 5 分鐘
  // configureHttpDispatcher() → undici 全域 dispatcher：
  //   bodyTimeout: 300000, headersTimeout: 300000
  ```
- 文件：`docs/settings.md` — `httpIdleTimeoutMs`（number，預設 300000，**0=關閉**）：「HTTP header and body idle timeout in milliseconds」。
- 行為：伺服器若 **5 分鐘沒送出任何 header/資料**，undici 直接切連線 → 串流中斷 → 上層報 `terminated`。

### 3.2 為什麼本地模型會「靜默超過 5 分鐘」

- 模型：`huginnfork/Qwen3.8-27B-FP8`，跑在 **本地 LAN vLLM**（`http://192.168.220.201:18080/qwen27b/v1`，models.json 確認，`max_model_len=131072`）。
- 推理開 thinking（`PI_REASONING_LEVEL=medium`，模型 `reasoning: true`）。
- 觸發鏈：

```
context 變大（128k 視窗、session JSONL 2MB+、compaction 已觸發 3 次）
   → prefill 120k tokens + thinking 階段耗時長、期間無 token 輸出
   → 靜默 > 300s
   → undici bodyTimeout/headersTimeout 切線 → "terminated"
   → pi 重試 3 次（每次又是完整的 5 分鐘）→ 失敗叢集
```

### 3.3 旁證：compaction 之後就變好

目前 session 的 3 次 compaction（11-03 14:34、16:08、11-04 13:37）之後，請求全部成功且變快（61s、173s、175s…）→ **context 越小越安全**，與 3.2 的觸發鏈一致。

## 4. 解法 Plan

### P0：調高 idle timeout（✅ 已執行）

- `~/.pi/agent/settings.json` 加入 `"httpIdleTimeoutMs": 900000`（15 分鐘）。
- `retry.provider.timeoutMs` 預設跟隨 `httpIdleTimeoutMs`，不需另改。
- retry 參數維持預設（`enabled=true / maxRetries=3 / baseDelayMs=2000`）。
- **生效時機：pi 重新啟動 / 新 session**（設定檔在啟動時讀取）。目前 session 仍是 300s，所以本輪仍要守 P2 紀律。

### P1：把工作切細（14c 拆成 5 個小 commit，每步可獨立回溯）

| 步 | 內容 | 風險 |
|---|---|---|
| c1 | world.js：7 個節慶 draw 函式（純新增、無人引用 → 零風險） | 低 |
| c2 | world.js：7 個 BUILD_ITEMS 條目（tab:'fest'、onFurn）＋ floorValid blocked/cls ＋ itemDepthAt | 低 |
| c3 | game.js：lift×3＋score、BUILD_TABS、selectBuildTab（wall 過濾＋fest 分支）＋ index.html 🎉 按鈕 | 中 |
| c4 | test/peek-fest.mjs（教學鎖＋7 件放置＋onFurn＋移除＋存檔）＋ 跑測＋截圖 | 中 |
| c5 | 回歸（flow.mjs／peek-build.mjs）＋ PROGRESS.md 14c ✅＋ 交接筆記 | 低 |

每步 = 1 個小 commit；中斷就從下一步接，不用重做。

### P2：context 紀律（每個 turn 遵守）

1. 工具輸出用 `grep -n`＋`head`、`sed -n '起,止p'` 精取，**不 cat 整個檔案、不讀大檔**。
2. 每 turn 只做 1～3 個小編輯＋少量驗證，回覆精簡。
3. 截圖只在視覺 QA 需要時看，**一次最多 2～3 張**（image 很吃 token）。
4. 每 commit 後把 checkpoint 寫進 PROGRESS.md 交接筆記。
5. 長代碼（>100 行）盡量拆成多次 edit 呼叫、分步提交。

### P3：後備（若 P0 之後仍斷）

1. 在 checkpoint 打 `/compact`；不行就**新開 session**，靠 PROGRESS.md 交接（session 檔控制在 ~10MB 內，10-30 的 24MB session 正是失敗重災區）。
2. 伺服器端（192.168.220.201）：檢查 vLLM VRAM/`max-num-seqs`、有沒有被其他任務搶卡；必要時改用較快的模型（omlx provider 已配置）。
3. 極端情況：`httpIdleTimeoutMs: 0`（完全關閉，靠手動 ESC 中斷兜底）。

## 5. 驗證方式

- 新 session 開頭觀察：大 context 請求（>80k tokens）是否還會在 300s 整斷線 → 若變成 900s 或成功，P0 生效。
- 14c 的 c1～c5 全程用 P2 紀律執行，目標 **0 terminated**。
