/**
 * script.js
 * 遊戲主控制器 - 包含自動跳過對話與過場的完整邏輯 (修正 Backlog 版)
 */

import * as UI from './ui.js';
import * as Utils from './utils.js';
import * as Debug from './debug.js';
import * as Backlog from './backlog.js'; // 引入 Backlog
import * as Exporter from './export.js';

let gameState = {
    stats: {},              
    currentSceneId: '',     
    currentDialogueIndex: 0,
    storyData: null,        
    basePath: '',           
    history: [],
    backlog: [],       // 確保這裡有初始陣列
    storyId: '',
    isAutoSkip: false, // 自動跳過開關
    isDebug: false     // Debug 模式狀態
};

// 初始化遊戲
async function initGame() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const storyFolder = urlParams.get('story') || 'H1123_LianChi';
        
        gameState.isDebug = urlParams.get('debug') === 'true';
        gameState.storyId = storyFolder;
        gameState.basePath = `stories/${storyFolder}/`;
        console.log(`正在載入故事：${storyFolder}`);

        const response = await fetch(`${gameState.basePath}story.json`);
        if (!response.ok) throw new Error(`找不到 ${storyFolder}/story.json`);
        
        gameState.storyData = await response.json();
        
        if(gameState.storyData.config.title) {
            document.title = gameState.storyData.config.title;
        }

        UI.initStatsUI(gameState.storyData.config.stats);
        
        gameState.storyData.config.stats.forEach(stat => {
            gameState.stats[stat.id] = stat.init;
        });
        UI.updateStatsUI(gameState.stats);

        if (gameState.isDebug) {
            Debug.init(gameState, {
                loadScene: loadScene,
                showChoices: showChoices,
                displayNextDialogue: displayNextDialogue
            });
        }

        if (Utils.hasSave(gameState.storyId)) {
            injectSystemStartScene();
            loadScene('_system_start_');
        } else {
            loadScene('intro');
        }

    } catch (error) {
        console.error(error);
        document.getElementById('story-text').innerHTML = "⚠️ 遊戲載入失敗。<br>請確認網址參數或資料夾名稱是否正確。";
    }
}

function injectSystemStartScene() {
    gameState.storyData.scenes['_system_start_'] = {
        dialogues: ["系統提示：偵測到您上次未完成的遊玩紀錄。"],
        choices: [
            { text: "📂 繼續遊戲", nextScene: "_LOAD_SAVE_" },
            { text: "🔄 重新開始", nextScene: "intro" }
        ]
    };
}

function loadScene(sceneId) {
    if (sceneId === 'end_calc') { evaluateEnding(); return; }

    const scene = gameState.storyData.scenes[sceneId];
    if (!scene) {
        console.error(`錯誤：找不到場景 ID [${sceneId}]`);
        return;
    }

    gameState.currentSceneId = sceneId;
    gameState.currentDialogueIndex = 0;

    const bgDiv = document.getElementById('game-bg');
    if (scene.bg) bgDiv.style.backgroundImage = `url('${gameState.basePath}${scene.bg}')`;
    if (scene.bgm) Utils.playBGM(`${gameState.basePath}${scene.bgm}`);

    document.getElementById('choices-overlay').classList.add('hidden');
    document.getElementById('next-indicator').classList.remove('hidden');
    document.querySelector('.dialogue-container').classList.remove('hidden');

    if (scene.fx) { UI.triggerFX(scene.fx); }

    if (sceneId !== '_system_start_' && sceneId !== 'intro') {
        Utils.saveGame(gameState.storyId, gameState);
    }

    displayNextDialogue();
}

function displayNextDialogue() {
    const scene = gameState.storyData.scenes[gameState.currentSceneId];
    const storyBox = document.getElementById('story-text');
    const nextBtn = document.getElementById('next-indicator');
    
    // 取得當前對話文字
    // 注意：如果 currentDialogueIndex 已經超過範圍 (例如在選項階段)，這裡會是 undefined，需防呆
    let currentText = "";
    if (gameState.currentDialogueIndex < scene.dialogues.length) {
        currentText = scene.dialogues[gameState.currentDialogueIndex];
        
        // ▼▼▼ 【修正 1】將對話加入回顧紀錄 ▼▼▼
        Backlog.pushEntry(gameState, currentText);
        // =====================================
    }

    // === 強制自動跳過文字邏輯 ===
    if (gameState.isDebug && gameState.isAutoSkip) {
        gameState.currentDialogueIndex = scene.dialogues.length;
        
        // 顯示最後一句話
        storyBox.innerHTML = scene.dialogues[scene.dialogues.length - 1];
        storyBox.style.opacity = 1;
        nextBtn.classList.add('hidden');
        showChoices();
        return; 
    }
    // ===================================

    nextBtn.classList.remove('hidden');
    
    // 顯示文字
    storyBox.innerHTML = currentText;
    storyBox.style.opacity = 0;
    setTimeout(() => storyBox.style.opacity = 1, 50);

    UI.bindTooltipEvents(storyBox);

    gameState.currentDialogueIndex++;
    
    if (gameState.currentDialogueIndex >= scene.dialogues.length) {
        nextBtn.innerText = "做出抉擇...";
        nextBtn.onclick = showChoices;
    } else {
        nextBtn.innerText = "▼ 點擊繼續";
        nextBtn.onclick = nextDialogue;
    }
}

function nextDialogue() {
    displayNextDialogue();
}

function showChoices() {
    const overlay = document.getElementById('choices-overlay');
    const container = document.getElementById('choices-container');
    container.innerHTML = '';
    overlay.classList.remove('hidden');

    const scene = gameState.storyData.scenes[gameState.currentSceneId];
    let availableChoices = [];

    scene.choices.forEach(choice => {
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
            if (!met) return;
        }

        availableChoices.push(choice);

        const btn = document.createElement('button');
        btn.innerHTML = choice.text;
        btn.className = 'choice-btn';
        btn.onclick = () => {
            Utils.playSFX('assets/ui_sounds/click.mp3');
            makeChoice(choice);
        };
        container.appendChild(btn);
    });

    // === 連鎖跳過邏輯 ===
    if (gameState.isDebug && gameState.isAutoSkip && availableChoices.length === 1) {
        const onlyChoice = availableChoices[0];
        if (onlyChoice.nextScene === '_LOAD_SAVE_' || onlyChoice.nextScene === 'intro') {
            return;
        }
        console.log("⏩ 過場自動跳過:", onlyChoice.text);
        setTimeout(() => { makeChoice(onlyChoice); }, 100); 
    }
}

function makeChoice(choice) {
    if (choice.nextScene === '_LOAD_SAVE_') {
        const savedData = Utils.loadGame(gameState.storyId);
        if (savedData) {
            gameState.stats = savedData.stats;
            gameState.history = savedData.history;
            gameState.currentSceneId = savedData.currentSceneId;
            
            // ▼▼▼ 【修正 2】讀檔時恢復 Backlog ▼▼▼
            gameState.backlog = savedData.backlog || [];
            // ===================================

            UI.updateStatsUI(gameState.stats);
            loadScene(savedData.currentSceneId);
        } else {
            alert("讀取失敗，請重新開始。");
            loadScene('intro');
        }
        return;
    }

    if (choice.analysis) {
        const sceneTitleRaw = gameState.storyData.scenes[gameState.currentSceneId].dialogues[0];
        const sceneTitle = sceneTitleRaw.replace(/<[^>]*>?/gm, '');
        
        gameState.history.push({
            sceneTitle: sceneTitle,
            choiceText: choice.text,
            analysis: choice.analysis
        });
    }

    if (choice.effects) {
        for (const [key, value] of Object.entries(choice.effects)) {
            if (choice.isReset) {
                 gameState.stats[key] = value; 
            } else {
                 gameState.stats[key] += value; 
            }
        }
    }
    UI.updateStatsUI(gameState.stats);

    const forcedEnding = Utils.checkEndingConditions(gameState.storyData.endings, gameState.stats, 100);
    if (forcedEnding) {
        Utils.clearSave(gameState.storyId);
        UI.showEndingScreen(forcedEnding, gameState.basePath);
    } else {
        loadScene(choice.nextScene);
    }
}

function evaluateEnding() {
    const result = Utils.checkEndingConditions(gameState.storyData.endings, gameState.stats, -1);
    if (result) {
        Utils.clearSave(gameState.storyId);
        UI.showEndingScreen(result, gameState.basePath);
    } else {
        alert("錯誤：找不到符合條件的結局。");
    }
}

window.showReview = function() {
    UI.renderReviewList(gameState.history);
    document.getElementById('review-container').classList.remove('hidden');
}

window.closeReview = function() {
    document.getElementById('review-container').classList.add('hidden');
}

window.printPortfolio = function() {
    const currentEnding = Utils.checkEndingConditions(gameState.storyData.endings, gameState.stats, -1);
    if (currentEnding) {
        Exporter.exportPortfolio(
            gameState.history, 
            currentEnding, 
            gameState.stats, 
            gameState.storyData.config.stats 
        );
    } else {
        alert("尚未達成結局，無法列印。");
    }
}

window.toggleBacklog = function() {
    Backlog.toggle(gameState);
}

window.onload = initGame;