let gameState = {
    stats: {},
    currentSceneId: '',
    currentDialogueIndex: 0,
    storyData: null
};

// 媒體控制器
const bgmPlayer = document.getElementById('bgm-player');
const sfxPlayer = document.getElementById('sfx-player');

// 初始化
async function initGame() {
    try {
        const response = await fetch('story.json');
        if (!response.ok) throw new Error("找不到 story.json");
        gameState.storyData = await response.json();
        
        // 1. 設定標題
        if(gameState.storyData.config.title) {
            document.title = gameState.storyData.config.title;
        }

        // 2. 初始化數值 UI
        initStatsUI(gameState.storyData.config.stats);
        
        // 3. 設定初始數值
        gameState.storyData.config.stats.forEach(stat => {
            gameState.stats[stat.id] = stat.init;
        });
        updateStatsUI();

        // 4. 載入序章
        loadScene('intro');

    } catch (error) {
        console.error(error);
        document.getElementById('story-text').innerHTML = "⚠️ 遊戲載入失敗。<br>請確認 story.json 是否存在且格式正確。";
    }
}

// 動態建立數值條
function initStatsUI(statsConfig) {
    const container = document.getElementById('stats-container');
    container.innerHTML = '';
    statsConfig.forEach(stat => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `
            <span class="label">${stat.name}</span>
            <div class="bar-bg">
                <div id="bar-${stat.id}" class="bar-fill" style="width: ${stat.init}%; background-color: ${stat.color};"></div>
            </div>
            <span id="val-${stat.id}" class="val-text">${stat.init}</span>
        `;
        container.appendChild(row);
    });
}

// 載入場景
function loadScene(sceneId) {
    // 檢查是否為結算指令
    if (sceneId === 'end_calc') {
        evaluateEnding();
        return;
    }

    const scene = gameState.storyData.scenes[sceneId];
    if (!scene) {
        console.error(`找不到場景 ID: ${sceneId}`);
        return;
    }

    gameState.currentSceneId = sceneId;
    gameState.currentDialogueIndex = 0;

    // 設定背景與音樂
    const bgDiv = document.getElementById('game-bg');
    if (scene.bg) bgDiv.style.backgroundImage = `url('${scene.bg}')`;
    if (scene.bgm) playBGM(scene.bgm);

    // UI 狀態重置
    document.getElementById('choices-overlay').classList.add('hidden');
    document.getElementById('next-indicator').classList.remove('hidden');
    document.querySelector('.dialogue-container').classList.remove('hidden');

    displayNextDialogue();
}

// 顯示下一句對話
function displayNextDialogue() {
    const scene = gameState.storyData.scenes[gameState.currentSceneId];
    const storyBox = document.getElementById('story-text');
    
    // 顯示文字
    storyBox.innerHTML = scene.dialogues[gameState.currentDialogueIndex];
    storyBox.style.opacity = 0;
    setTimeout(() => storyBox.style.opacity = 1, 50); // 淡入效果

    gameState.currentDialogueIndex++;

    const nextBtn = document.getElementById('next-indicator');
    
    // 判斷是否還有下一句
    if (gameState.currentDialogueIndex >= scene.dialogues.length) {
        nextBtn.innerText = "做出抉擇...";
        nextBtn.onclick = showChoices;
    } else {
        nextBtn.innerText = "▼ 點擊繼續";
        nextBtn.onclick = nextDialogue;
    }
}

function nextDialogue() {
    playSFX('assets/audio/sfx_click.mp3');
    displayNextDialogue();
}

// 顯示選項 (包含條件檢查 logic)
function showChoices() {
    const overlay = document.getElementById('choices-overlay');
    const container = document.getElementById('choices-container');
    container.innerHTML = '';
    overlay.classList.remove('hidden');

    const scene = gameState.storyData.scenes[gameState.currentSceneId];
    
    scene.choices.forEach(choice => {
        // **關鍵功能：檢查選項是否符合條件 (Requirement)**
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

        // 產生按鈕
        const btn = document.createElement('button');
        btn.innerHTML = choice.text;
        btn.className = 'choice-btn';
        btn.onclick = () => {
            playSFX('assets/audio/sfx_click.mp3');
            makeChoice(choice);
        };
        container.appendChild(btn);
    });
}

// 執行選擇結果
function makeChoice(choice) {
    // 1. 應用數值變化 (若 effects 存在)
    if (choice.effects) {
        for (const [key, value] of Object.entries(choice.effects)) {
            // 如果是 "=" 開頭，代表直接設定數值 (例如繼承身世時)
            // 為了簡化，這裡假設 effects 裡的數字都是增減值，若要直接設定可以把邏輯寫複雜點
            // 這裡我做一個特殊判斷：如果新的場景是 ch5_rich 或 ch5_poor，代表是重置數值
            if (choice.nextScene.includes('ch5_')) {
                 gameState.stats[key] = value; // 直接設定
            } else {
                 gameState.stats[key] += value; // 累加
            }
        }
    }
    updateStatsUI();

    // 2. 檢查是否有強制觸發的結局 (例如死亡) - Priority >= 100
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
        // 限制 0-100
        const clampedVal = Math.max(0, Math.min(100, value));
        const bar = document.getElementById(`bar-${key}`);
        const text = document.getElementById(`val-${key}`);
        if (bar) bar.style.width = `${clampedVal}%`;
        if (text) text.innerText = value;
    }
}

// 評估結局 (檢查所有結局條件)
function evaluateEnding() {
    const result = checkEndingConditions(-1); // -1 代表檢查所有優先級
    if (result) {
        showEndingScreen(result);
    } else {
        alert("找不到符合條件的結局，請檢查 story.json 設定。");
    }
}

// 檢查結局條件的核心邏輯
function checkEndingConditions(minPriority = -1) {
    // 依照 priority 從大到小排序
    const sortedEndings = [...gameState.storyData.endings].sort((a, b) => b.priority - a.priority);

    for (const ending of sortedEndings) {
        if (ending.priority < minPriority) continue;
        if (!ending.conditions || ending.conditions.length === 0) return ending; // 無條件結局 (預設)

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
            if (!allMet) break;
        }
        if (allMet) return ending;
    }
    return null;
}

// 顯示結局畫面
function showEndingScreen(endingData) {
    document.querySelector('.game-window').classList.add('ending-mode');
    document.getElementById('choices-overlay').classList.add('hidden');
    document.querySelector('.dialogue-container').classList.add('hidden');
    document.querySelector('.stats-overlay').classList.add('hidden');

    const screen = document.getElementById('ending-screen');
    screen.classList.remove('hidden');

    document.getElementById('ending-title').innerText = endingData.title;
    document.getElementById('ending-desc').innerText = endingData.desc;
    document.getElementById('ending-quote').innerText = endingData.quote || "";
    
    if (endingData.image) {
        document.getElementById('game-bg').style.backgroundImage = `url('${endingData.image}')`;
    }
}

// 音樂播放 helper
function playBGM(src) {
    if (!src) return;
    if (!bgmPlayer.src.includes(src)) {
        bgmPlayer.src = src;
        bgmPlayer.volume = 0.5;
        bgmPlayer.play().catch(() => console.log("等待互動以播放音樂"));
    }
}

function playSFX(src) {
    if (!src) return;
    sfxPlayer.src = src;
    sfxPlayer.play().catch(() => {});
}

window.onload = initGame;