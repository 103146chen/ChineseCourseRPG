# RPG Engine 程式碼維護說明文件

## 1. 專案概述

本專案是一個基於 Web 技術（HTML/CSS/JavaScript）的互動式視覺小說/RPG 引擎。採用 ES Modules 模組化設計，包含核心遊戲迴圈、UI 渲染、存檔管理、除錯工具及學習歷程匯出功能。

## 2. 檔案結構與職責

| 檔案路徑 | 模組名稱 | 主要職責 |
| --- | --- | --- |
| `assets/js/script.js` | **核心控制器 (Core)** | 遊戲初始化、場景流轉、對話推進、選項邏輯、主遊戲迴圈。 |
| `assets/js/ui.js` | **介面管理 (UI)** | 負責 DOM 操作，包括數值條更新、畫面特效、結局畫面渲染、Tooltip 顯示。 |
| `assets/js/utils.js` | **工具庫 (Utils)** | 後端運算邏輯（如結局判定）、音訊控制、LocalStorage 存檔管理。 |
| `assets/js/backlog.js` | **回顧系統 (Backlog)** | 記錄並顯示歷史對話內容。 |
| `assets/js/debug.js` | **除錯模式 (Debug)** | 提供「上帝模式」面板，支援跳轉場景與自動跳過對話。 |
| `assets/js/export.js` | **匯出系統 (Export)** | 生成學習歷程檔案並觸發瀏覽器列印功能。 |
| `editor.html` | **視覺化編輯器** | 提供 GUI 介面編輯 `story.json`，管理場景、結局與數值設定。 |
| `flowchart.html` | **流程圖檢視器** | 使用 Mermaid.js 將 JSON 劇本轉換為視覺化流程圖，並包含路徑計算器。 |

---

## 3. 核心資料結構

### 3.1 全域遊戲狀態 (`gameState`)

位於 `script.js`，維護遊戲執行期間的所有動態資料。

```javascript
let gameState = {
    stats: {},              // 玩家當前數值 (key: statId, value: number)
    currentSceneId: '',     // 當前場景 ID
    currentDialogueIndex: 0,// 當前對話在場景 dialogues 陣列中的索引
    storyData: null,        // 載入的完整 JSON 劇本資料
    basePath: '',           // 資源檔案的基礎路徑 (例: stories/H1123_LianChi/)
    history: [],            // 玩家的關鍵選擇紀錄 (用於學習歷程回顧)
    backlog: [],            // 對話文字紀錄 (用於 Backlog 視窗)
    storyId: '',            // 故事識別碼 (用於區分存檔)
    isAutoSkip: false,      // (Debug) 是否開啟自動跳過
    isDebug: false          // 是否處於除錯模式
};

```

### 3.2 劇本資料結構 (`story.json`)

這是靜態資料，由 `script.js` 載入。

```javascript
{
    "config": {
        "title": "故事標題",
        "stats": [ // 定義遊戲中的數值
            { "id": "hp", "name": "生命", "init": 100, "color": "#e74c3c" }
        ]
    },
    "scenes": { // 場景集合
        "scene_id": {
            "bg": "images/bg.jpg",      // 背景圖片路徑
            "bgm": "audio/music.mp3",   // 背景音樂路徑
            "fx": "shake",              // (選填) 進入場景時的特效
            "dialogues": ["對話1", "對話2"], // 對話內容陣列
            "choices": [                // 選項陣列
                {
                    "text": "選項文字",
                    "nextScene": "target_scene_id",
                    "req": { "stat": "hp", "op": ">", "val": 50 }, // (選填) 出現條件
                    "effects": { "hp": -10 }, // 數值影響
                    "isReset": false,         // 若為 true，則 effects 會覆蓋原數值而非累加
                    "analysis": {             // (選填) 學習歷程分析資料
                        "status": "warning",  // status: info/success/warning
                        "title": "分析標題",
                        "content": "詳細分析內容"
                    }
                }
            ]
        }
    },
    "endings": [ // 結局定義
        {
            "id": "bad_end",
            "priority": 10, // 優先權，高者優先判定
            "conditions": [ // 觸發條件 (AND 邏輯)
                { "stat": "hp", "op": "<=", "val": 0 }
            ],
            "title": "結局標題",
            "desc": "結局描述",
            "image": "images/end.jpg"
        }
    ]
}

```

---

## 4. 模組功能詳解

### 4.1 script.js (核心控制器)

負責協調各個模組，控制遊戲流程。

* **`initGame()`**
* **功能**: 讀取 URL 參數決定故事資料夾與 Debug 模式，Fetch `story.json`，初始化 UI 與狀態。
* **錯誤處理**: 若 JSON 載入失敗，會在介面上顯示錯誤訊息。
* **邏輯**: 若偵測到存檔 (`Utils.hasSave`)，會插入一個系統場景 `_system_start_` 詢問玩家是否讀檔。


* **`loadScene(sceneId)`**
* **功能**: 切換場景。更新背景、播放音樂、觸發特效 (`UI.triggerFX`)，並重置對話索引。
* **錯誤處理**: 若 `sceneId` 不存在，會在 Console 報錯並停止。
* **自動存檔**: 除了系統場景外，每次切換場景都會觸發 `Utils.saveGame`。


* **`displayNextDialogue()`**
* **功能**: 顯示下一句對話。將文字推入 `Backlog`。
* **Debug 邏輯**: 若 `isAutoSkip` 為真，直接跳到該場景最後一句並呼叫 `showChoices`。


* **`showChoices()`**
* **功能**: 渲染選項按鈕。
* **邏輯**: 依據 `choice.req` 過濾不符合條件的選項。
* **Debug 邏輯**: 若開啟 `isAutoSkip` 且只有一個選項，會自動延遲觸發點擊 (連鎖跳過)。


* **`makeChoice(choice)`**
* **功能**: 處理玩家點擊選項後的邏輯。
* **邏輯**:
1. 若目標是 `_LOAD_SAVE_`，則執行讀檔。
2. 記錄 `history` (若選項有 `analysis` 屬性)。
3. 更新數值：根據 `isReset` 決定是累加還是覆蓋。
4. 檢查是否有「強制結局」(Priority 100)。
5. 若無強制結局，載入 `nextScene`。





### 4.2 utils.js (邏輯運算與工具)

* **`checkEndingConditions(endings, currentStats, minPriority)`**
* **功能**: 遍歷結局列表，找出符合條件且優先權大於 `minPriority` 的最高優先權結局。
* **回傳**: 符合的 `ending` 物件或 `null`。


* **`playBGM(src)` / `playSFX(src)**`
* **功能**: 控制 `<audio>` 標籤。
* **錯誤處理**: 包含 `catch` 區塊以處理瀏覽器自動播放策略阻擋的問題。


* **`saveGame(storyId, state)` / `loadGame(storyId)**`
* **功能**: 封裝 `localStorage` 操作，將 `gameState` 序列化/反序列化。



### 4.3 ui.js (介面渲染)

* **`initStatsUI(statsConfig)` / `updateStatsUI(stats)**`
* **功能**: 動態生成數值條 HTML，並依據數值 (0-100) 更新 CSS `width`。


* **`triggerFX(effectName)`**
* **功能**: 觸發 CSS 動畫 (如 `shake`, `flash-red`)。
* **技巧**: 使用 `void element.offsetWidth` 強制瀏覽器 Reflow，確保動畫可以重複觸發。


* **`renderReviewList(history)`**
* **功能**: 將 `gameState.history` 轉換為 HTML 卡片，用於遊戲結束後的回顧。


* **`bindTooltipEvents(container)`**
* **功能**: 為帶有 `.glossary` class 的元素綁定滑鼠事件，顯示浮動解釋框。
* **RWD**: 針對手機版 (寬度 < 768px) 改為點擊觸發，電腦版為滑鼠懸停觸發。



### 4.4 backlog.js (紀錄系統)

* **`pushEntry(gameState, text)`**
* **功能**: 新增對話紀錄。
* **防呆**: 檢查最後一筆是否相同，避免重複紀錄。


* **`toggle(gameState)`**
* **功能**: 切換紀錄視窗的顯示/隱藏，並在開啟時呼叫 `render`。



### 4.5 debug.js (上帝模式)

* **`init(gameState, gameFunctions)`**
* **功能**: 注入 Debug 面板至 DOM。


* **功能特性**:
* **Auto Skip**: 切換 `gameState.isAutoSkip`，並即時觸發 `displayNextDialogue` 或 `showChoices` 以推進進度。
* **Scene Jump**: 下拉選單列出所有場景，選擇後直接呼叫 `loadScene`。



### 4.6 export.js (列印匯出)

* **`exportPortfolio(history, endingData, currentStats, statsConfig)`**
* **功能**: 將遊戲數據填入 `index.html` 中的 `#print-area` 區塊，並呼叫 `window.print()`。
* **內容**: 包含日期、結局資訊、最終數值表、詳細的選擇歷程 (含教師分析與手寫反思區)。



---

## 5. 錯誤處理機制

1. **資源載入失敗**:
* 在 `script.js` 的 `initGame` 中，使用 `try...catch` 包覆 `fetch` 請求。若失敗，將在 `#story-text` 區域顯示「遊戲載入失敗」與提示。


2. **場景 ID 錯誤**:
* `loadScene` 會檢查 `storyData.scenes[sceneId]` 是否存在。若不存在，Console 輸出 `console.error`，防止程式崩潰但遊戲會卡住（開發者需注意 Console）。


3. **音訊播放阻擋**:
* 瀏覽器通常禁止未經互動的自動播放。`utils.js` 中的 `play().catch(...)` 捕獲此 Promise rejection，避免報錯中斷程式，並在 Console 提示。



## 6. 特殊樣式與特效 (CSS)

* **`assets/css/FxVisualOverlay.css`**: 定義了震動 (`shake`)、閃光 (`flash-red/white`)、模糊 (`blur`) 的 Keyframes 動畫。
* **`assets/css/exportHTML.css`**: 使用 `@media print` 查詢。
* **重要**: 設定 `.game-window { display: none !important; }` 在列印時隱藏遊戲介面。
* 設定 `.print-only { display: block; }` 僅在列印時顯示學習單內容。
* 強制背景色與字體，模擬正式證書/文件質感。



## 7. 編輯器與工具 (`editor.html` & `flowchart.html`)

* **Editor**:
* 純前端運作，利用 `Blob` 與 `URL.createObjectURL` 實現 JSON 檔案的下載與匯入。
* `deleteCurrentItem` 有防呆機制，禁止刪除 `intro` 場景。


* **Flowchart**:
* 使用 `mermaid.js` 繪製。
* 內建「結局計算器 (`calculateAllEndings`)」：使用遞迴 (DFS) 遍歷所有選項路徑，模擬數值變化，計算各結局的達成率與路徑覆蓋。
* **注意**: 計算器需處理 `isReset` 邏輯，確保模擬結果與遊戲實際運算一致。