/**
 * utils.js
 * 負責後端運算邏輯 (結局判定) 與 媒體控制 (音樂/音效) 與 存檔管理
 */

// 1. 檢查結局條件的核心邏輯
export function checkEndingConditions(endings, currentStats, minPriority = -1) {
    const sortedEndings = [...endings].sort((a, b) => b.priority - a.priority);

    for (const ending of sortedEndings) {
        if (ending.priority < minPriority) continue;
        if (!ending.conditions || ending.conditions.length === 0) return ending;

        let allMet = true;
        for (const cond of ending.conditions) {
            const currentVal = currentStats[cond.stat] || 0;
            
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

// 2. 音樂控制
const bgmPlayer = document.getElementById('bgm-player');
const sfxPlayer = document.getElementById('sfx-player');

export function playBGM(src) {
    if (!src) return;
    if (!bgmPlayer.src.includes(src)) {
        bgmPlayer.src = src;
        bgmPlayer.volume = 0.5; 
        bgmPlayer.play().catch(e => {
            console.log("瀏覽器阻擋自動播放，等待使用者互動...");
        });
    }
}

export function playSFX(src) {
    if (!src) return;
    sfxPlayer.src = src;
    sfxPlayer.play().catch(e => {});
}

// 3. 存檔系統 (Save/Load System)
// 使用 localStorage，並根據 storyId 區分不同故事的存檔
export function saveGame(storyId, state) {
    const saveData = {
        stats: state.stats,
        currentSceneId: state.currentSceneId,
        history: state.history,
        backlog: state.backlog,
        timestamp: new Date().getTime()
    };
    localStorage.setItem(`rpg_save_${storyId}`, JSON.stringify(saveData));
    console.log("Game Auto-Saved", saveData);
}

export function loadGame(storyId) {
    const data = localStorage.getItem(`rpg_save_${storyId}`);
    return data ? JSON.parse(data) : null;
}

export function hasSave(storyId) {
    return !!localStorage.getItem(`rpg_save_${storyId}`);
}

export function clearSave(storyId) {
    localStorage.removeItem(`rpg_save_${storyId}`);
}