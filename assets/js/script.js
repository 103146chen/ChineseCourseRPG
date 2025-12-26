/**
 * RPG Engine Core - script.js
 * 負責處理遊戲邏輯、讀取 JSON 設定、路徑管理與介面更新。
 */

let gameState = {
    stats: {},              // 存放玩家當前數值
    currentSceneId: '',     // 當前場景 ID
    currentDialogueIndex: 0,// 當前對話句數
    storyData: null,        // 載入的完整劇本資料
    basePath: '',           // 故事資源的基礎路徑 (例如 "stories/story1/")
    history: []             // 用來存玩家的選擇歷程
};

// 媒體控制器
const bgmPlayer = document.getElementById('bgm-player');
const sfxPlayer = document.getElementById('sfx-player');

// 初始化遊戲
async function initGame() {
    try {
        // 1. 從網址參數取得要載入的故事資料夾 (預設為 story1)
        const urlParams = new URLSearchParams(window.location.search);
        const storyFolder = urlParams.get('story') || 'story1';
        
        // 設定基礎路徑，所有圖片音樂都會基於此路徑讀取
        gameState.basePath = `stories/${storyFolder}/`;

        console.log(`正在載入故事：${storyFolder}`);

        // 2. 讀取 story.json
        const response = await fetch(`${gameState.basePath}story.json`);
        if (!response.ok) throw new Error(`找不到 ${storyFolder}/story.json`);
        
        gameState.storyData = await response.json();
        
        // 3. 設定網頁標題
        if(gameState.storyData.config.title) {
            document.title = gameState.storyData.config.title;
        }

        // 4. 動態生成數值介面 (UI)
        initStatsUI(gameState.storyData.config.stats);
        
        // 5. 設定初始數值
        gameState.storyData.config.stats.forEach(stat => {
            gameState.stats[stat.id] = stat.init;
        });
        updateStatsUI();

        // 6. 載入序章
        loadScene('intro');

    } catch (error) {
        console.error(error);
        const errorMsg = "⚠️ 遊戲載入失敗。<br>請確認：<br>1. 網址參數是否正確<br>2. 資料夾結構是否正確<br>3. 是否使用 Local Server 開啟";
        document.getElementById('story-text').innerHTML = errorMsg;
    }
}

// 動態建立數值條 UI
function initStatsUI(statsConfig) {
    const container = document.getElementById('stats-container');
    container.innerHTML = ''; // 清空舊內容

    statsConfig.forEach(stat => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `
            <span class="label">${stat.name}</span>
            <div class="bar-bg">
                <div id="bar-${stat.id}" class="bar-fill" style="width: ${stat.init}%; background-color: ${stat.color || '#888'};"></div>
            </div>
            <span id="val-${stat.id}" class="val-text">${stat.init}</span>
        `;
        container.appendChild(row);
    });
}

// 載入場景
function loadScene(sceneId) {
    // 特殊指令：計算結局
    if (sceneId === 'end_calc') {
        evaluateEnding();
        return;
    }

    const scene = gameState.storyData.scenes[sceneId];
    if (!scene) {
        console.error(`錯誤：找不到場景 ID [${sceneId}]`);
        return;
    }

    gameState.currentSceneId = sceneId;
    gameState.currentDialogueIndex = 0;

    // 1. 設定背景 (自動加上 basePath)
    const bgDiv = document.getElementById('game-bg');
    if (scene.bg) {
        bgDiv.style.backgroundImage = `url('${gameState.basePath}${scene.bg}')`;
    }

    // 2. 播放背景音樂 (自動加上 basePath)
    if (scene.bgm) {
        playBGM(`${gameState.basePath}${scene.bgm}`);
    }

    // 3. UI 狀態重置
    document.getElementById('choices-overlay').classList.add('hidden');
    document.getElementById('next-indicator').classList.remove('hidden');
    document.querySelector('.dialogue-container').classList.remove('hidden');

    displayNextDialogue();
}

// 顯示下一句對話
function displayNextDialogue() {
    const scene = gameState.storyData.scenes[gameState.currentSceneId];
    const storyBox = document.getElementById('story-text');
    
    // 顯示文字 (支援 HTML 標籤)
    storyBox.innerHTML = scene.dialogues[gameState.currentDialogueIndex];
    
    // 簡單的淡入效果
    storyBox.style.opacity = 0;
    setTimeout(() => storyBox.style.opacity = 1, 50);

    gameState.currentDialogueIndex++;

    const nextBtn = document.getElementById('next-indicator');
    
    // 判斷對話是否結束
    if (gameState.currentDialogueIndex >= scene.dialogues.length) {
        // 對話結束，準備顯示選項
        nextBtn.innerText = "做出抉擇...";
        nextBtn.onclick = showChoices;
    } else {
        // 還有下一句
        nextBtn.innerText = "▼ 點擊繼續";
        nextBtn.onclick = nextDialogue;
    }
}

// 點擊「繼續」按鈕
function nextDialogue() {
    playSFX('assets/ui_sounds/click.mp3'); // 假設你有這個共用音效，若無可註解掉
    displayNextDialogue();
}

// 顯示選項清單
function showChoices() {
    const overlay = document.getElementById('choices-overlay');
    const container = document.getElementById('choices-container');
    container.innerHTML = '';
    overlay.classList.remove('hidden');

    const scene = gameState.storyData.scenes[gameState.currentSceneId];
    
    scene.choices.forEach(choice => {
        // 【條件檢查】檢查這個選項是否符合顯示條件 (req)
        if (choice.req) {
            const currentVal = gameState.stats[choice.req.stat];
            const targetVal = choice.req.val;
            let met = false;
            
            switch(choice.req.op) {
                case '>': met = currentVal > targetVal; break;
                case '>=': met = currentVal >= targetVal; break;
                case '<': met = currentVal < targetVal; break;
                case '<=': met = currentVal <= targetVal; break;
                case '==': met = currentVal == targetVal; break;
            }
            // 如果條件不符，就不產生這個按鈕 (隱藏選項)
            if (!met) return;
        }

        // 建立按鈕
        const btn = document.createElement('button');
        btn.innerHTML = choice.text;
        btn.className = 'choice-btn';
        btn.onclick = () => {
            playSFX('assets/ui_sounds/click.mp3');
            makeChoice(choice);
        };
        container.appendChild(btn);
    });
}

// 執行玩家選擇
function makeChoice(choice) {
    // 1. 新增解析紀錄
    if (choice.analysis) {
        gameState.history.push({
            sceneTitle: gameState.storyData.scenes[gameState.currentSceneId].dialogues[0], // 抓該場景第一句話當標題(通常包含章節名)
            choiceText: choice.text,
            analysis: choice.analysis
        });
    }
    // 2. 應用數值變化 (effects)
    if (choice.effects) {
        for (const [key, value] of Object.entries(choice.effects)) {
            // 特殊邏輯：如果是切換世代 (ch5_)，通常代表數值重置，所以直接賦值 (=)
            // 否則一般情況下是累加 (+=)
            if (choice.nextScene.includes('ch5_') && value > 0) {
                 gameState.stats[key] = value; 
            } else {
                 gameState.stats[key] += value; 
            }
        }
    }
    updateStatsUI();

    // 2. 檢查強制結局 (例如死亡，Priority >= 100)
    const forcedEnding = checkEndingConditions(100);
    if (forcedEnding) {
        showEndingScreen(forcedEnding);
    } else {
        loadScene(choice.nextScene);
    }
}

// 更新畫面上的數值條
function updateStatsUI() {
    for (const [key, value] of Object.entries(gameState.stats)) {
        // 限制顯示範圍 0-100
        const clampedVal = Math.max(0, Math.min(100, value));
        
        const bar = document.getElementById(`bar-${key}`);
        const text = document.getElementById(`val-${key}`);
        
        if (bar) bar.style.width = `${clampedVal}%`;
        if (text) text.innerText = value;
    }
}

// 評估最終結局
function evaluateEnding() {
    // 傳入 -1 代表檢查所有優先級
    const result = checkEndingConditions(-1);
    
    if (result) {
        showEndingScreen(result);
    } else {
        alert("找不到符合條件的結局，請檢查 story.json 設定。");
    }
}

// 檢查結局條件的核心邏輯
function checkEndingConditions(minPriority = -1) {
    // 1. 依照優先級排序 (高 -> 低)
    const sortedEndings = [...gameState.storyData.endings].sort((a, b) => b.priority - a.priority);

    // 2. 逐一檢查
    for (const ending of sortedEndings) {
        // 跳過優先級不足的結局 (用於中途死亡檢測)
        if (ending.priority < minPriority) continue;

        // 如果沒有 conditions，代表是預設結局 (Default)
        if (!ending.conditions || ending.conditions.length === 0) return ending;

        let allMet = true;
        for (const cond of ending.conditions) {
            const currentVal = gameState.stats[cond.stat];
            
            switch (cond.op) {
                case '>': if (!(currentVal > cond.val)) allMet = false; break;
                case '>=': if (!(currentVal >= cond.val)) allMet = false; break;
                case '<': if (!(currentVal < cond.val)) allMet = false; break;
                case '<=': if (!(currentVal <= cond.val)) allMet = false; break;
                case '==': if (!(currentVal == cond.val)) allMet = false; break;
            }
            
            if (!allMet) break; // 只要有一個條件不符，就換下一個結局
        }

        if (allMet) return ending;
    }
    return null;
}

// 顯示結局畫面
function showEndingScreen(endingData) {
    // 隱藏遊戲介面
    document.querySelector('.game-window').classList.add('ending-mode');
    document.getElementById('choices-overlay').classList.add('hidden');
    document.querySelector('.dialogue-container').classList.add('hidden');
    document.querySelector('.stats-overlay').classList.add('hidden');

    // 顯示結局層
    const screen = document.getElementById('ending-screen');
    screen.classList.remove('hidden');

    // 填入結局內容
    document.getElementById('ending-title').innerText = endingData.title;
    document.getElementById('ending-desc').innerText = endingData.desc;
    document.getElementById('ending-quote').innerText = endingData.quote || "";
    
    // 如果結局有專屬圖片，加上 basePath
    if (endingData.image) {
        document.getElementById('game-bg').style.backgroundImage = `url('${gameState.basePath}${endingData.image}')`;
    }
}

// 顯示回顧
function showReview() {
    const list = document.getElementById('review-list');
    list.innerHTML = ''; // 清空

    gameState.history.forEach((item, index) => {
        const card = document.createElement('div');
        // 根據 status 設定顏色樣式
        card.className = `review-card ${item.analysis.status}`;

        // 清理標題HTML標籤 (只保留純文字)
        const cleanTitle = item.sceneTitle.replace(/<[^>]*>?/gm, '').substring(0, 15) + '...';

        card.innerHTML = `
            <div class="review-header">
                <span class="step-num">抉擇 ${index + 1}</span>
                <span class="scene-name">${cleanTitle}</span>
            </div>
            <div class="player-choice">你選擇了：${item.choiceText}</div>
            <div class="analysis-content">
                <strong>${item.analysis.title}</strong><br>
                ${item.analysis.content}
            </div>
        `;
        list.appendChild(card);
    });

    document.getElementById('review-container').classList.remove('hidden');
}

function closeReview() {
    document.getElementById('review-container').classList.add('hidden');
}

// 音樂播放輔助函式
function playBGM(src) {
    if (!src) return;
    
    // 避免重複播放同一首
    if (!bgmPlayer.src.includes(src)) {
        bgmPlayer.src = src;
        bgmPlayer.volume = 0.5; // 預設音量
        bgmPlayer.play().catch(e => {
            console.log("瀏覽器阻擋自動播放，等待使用者互動...");
        });
    }
}

function playSFX(src) {
    if (!src) return;
    // 音效不需防止重複，直接播放
    sfxPlayer.src = src;
    sfxPlayer.play().catch(e => {});
}

// 啟動遊戲
window.onload = initGame;