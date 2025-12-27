/**
 * debug.js
 * 上帝模式控制模組 (Auto-Skip 狀態即時觸發版)
 */

export function init(gameState, gameFunctions) {
    console.log("🔧 上帝模式模組已載入");
    
    const { loadScene, showChoices, displayNextDialogue } = gameFunctions;

    // 定義切換 Auto Skip 的邏輯
    const toggleAutoSkip = (btnElement) => {
        // 1. 切換狀態
        gameState.isAutoSkip = !gameState.isAutoSkip;
        console.log("🔧 AutoSkip 狀態:", gameState.isAutoSkip);
        
        // 2. 更新按鈕外觀
        if (gameState.isAutoSkip) {
            btnElement.classList.add('active');
            btnElement.innerText = "⏩ 自動跳過：ON";
            
            // 3. 【即時觸發】
            const scene = gameState.storyData.scenes[gameState.currentSceneId];
            if (!scene) return;

            // 情況 A: 如果還在講對話 -> 呼叫 displayNextDialogue (它會檢測到開啟並跳過)
            if (gameState.currentDialogueIndex < scene.dialogues.length) {
                displayNextDialogue(); 
            } 
            // 情況 B: 如果已經講完對話，停在等待選項 -> 呼叫 showChoices (它會檢測是否要連鎖跳過過場)
            else {
                showChoices();
            }

        } else {
            btnElement.classList.remove('active');
            btnElement.innerText = "⏩ 自動跳過：OFF";
        }
    };

    const handleJump = (sceneId) => {
        console.log(`🔧 Debug 跳轉至：${sceneId}`);
        loadScene(sceneId);
    };

    createDebugPanel(gameState.storyData.scenes, toggleAutoSkip, handleJump);
}

function createDebugPanel(scenes, onToggleSkip, onJump) {
    if (document.querySelector('.debug-panel')) return;

    const panel = document.createElement('div');
    panel.className = 'debug-panel'; 

    // Header
    const header = document.createElement('div');
    header.className = 'debug-header';
    const title = document.createElement('span');
    title.className = 'debug-title';
    title.innerText = 'DEBUG';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.innerHTML = '−'; 
    toggleBtn.onclick = () => {
        panel.classList.toggle('minimized');
        toggleBtn.innerHTML = panel.classList.contains('minimized') ? '⚙️' : '−';
    };
    header.appendChild(title);
    header.appendChild(toggleBtn);
    panel.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.className = 'debug-content';

    // Auto Skip 切換按鈕
    const skipBtn = document.createElement('button');
    skipBtn.className = 'debug-btn'; 
    skipBtn.innerText = '⏩ 自動跳過：OFF';
    skipBtn.onclick = () => onToggleSkip(skipBtn);
    content.appendChild(skipBtn);

    // Jump Select
    const selectGroup = document.createElement('div');
    selectGroup.className = 'debug-select-group';
    const label = document.createElement('span');
    label.className = 'debug-label';
    label.innerText = '跳轉場景 (Jump to):';
    const selector = document.createElement('select');
    selector.className = 'debug-select';
    const defaultOpt = document.createElement('option');
    defaultOpt.text = "選擇場景...";
    selector.appendChild(defaultOpt);
    Object.keys(scenes).forEach(sceneId => {
        const opt = document.createElement('option');
        opt.value = sceneId;
        opt.text = sceneId;
        selector.appendChild(opt);
    });
    selector.onchange = (e) => {
        const targetScene = e.target.value;
        if (targetScene && targetScene !== "選擇場景...") {
            onJump(targetScene);
            selector.value = "選擇場景...";
        }
    };
    selectGroup.appendChild(label);
    selectGroup.appendChild(selector);
    content.appendChild(selectGroup);

    panel.appendChild(content);
    document.body.appendChild(panel);
}