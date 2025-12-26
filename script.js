let gameState = {
    stats: { integrity: 50, power: 30, family: 100 },
    currentSceneId: 'intro',
    currentDialogueIndex: 0,
    storyData: null
};

async function initGame() {
    try {
        const response = await fetch('story.json');
        gameState.storyData = await response.json();
        gameState.stats = { ...gameState.storyData.initialStats };
        updateStatsUI();
        loadScene('intro');
    } catch (error) {
        console.error(error);
        document.getElementById('story-text').innerText = "載入失敗，請檢查 story.json";
    }
}

function loadScene(sceneId) {
    if (sceneId === 'end_martyr') { showEnding('martyr'); return; }
    if (sceneId === 'end_calc') { calculateFinalEnding(); return; }

    gameState.currentSceneId = sceneId;
    gameState.currentDialogueIndex = 0; // 重置對話進度
    
    // 隱藏選項，顯示繼續按鈕
    document.getElementById('choices-container').classList.add('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
    document.getElementById('next-btn').style.display = 'block';

    displayNextDialogue();
}

function displayNextDialogue() {
    const scene = gameState.storyData.scenes[gameState.currentSceneId];
    const storyBox = document.getElementById('story-text');
    
    // 取得目前這句話
    const text = scene.dialogues[gameState.currentDialogueIndex];
    
    // 簡單的打字機效果或直接顯示
    storyBox.innerHTML = text;
    storyBox.style.opacity = 0;
    setTimeout(() => storyBox.style.opacity = 1, 100);

    gameState.currentDialogueIndex++;

    // 檢查是否還有下一句
    if (gameState.currentDialogueIndex >= scene.dialogues.length) {
        // 沒有下一句了，隱藏繼續按鈕，顯示選項
        const nextBtn = document.getElementById('next-btn');
        nextBtn.innerText = "做出抉擇"; // 提示文字變化
        nextBtn.onclick = showChoices; // 改變按鈕行為
    } else {
        // 還有下一句
        const nextBtn = document.getElementById('next-btn');
        nextBtn.innerText = "▼ 繼續劇情";
        nextBtn.onclick = nextDialogue;
    }
}

// 這是綁定在按鈕上的函式
function nextDialogue() {
    displayNextDialogue();
}

function showChoices() {
    document.getElementById('next-btn').style.display = 'none'; // 隱藏繼續按鈕
    const choicesContainer = document.getElementById('choices-container');
    choicesContainer.innerHTML = '';
    choicesContainer.classList.remove('hidden');

    const scene = gameState.storyData.scenes[gameState.currentSceneId];
    scene.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.innerHTML = choice.text;
        btn.className = 'choice-btn';
        btn.onclick = () => makeChoice(choice);
        choicesContainer.appendChild(btn);
    });
}

function makeChoice(choice) {
    const effects = choice.effects;
    gameState.stats.integrity += effects.integrity;
    gameState.stats.power += effects.power;
    gameState.stats.family += effects.family;
    updateStatsUI();
    loadScene(choice.nextScene);
}

function updateStatsUI() {
    updateBar('integrity', gameState.stats.integrity);
    updateBar('power', gameState.stats.power);
    updateBar('family', gameState.stats.family);
}

function updateBar(type, value) {
    let val = Math.max(0, Math.min(100, value));
    document.getElementById(`bar-${type}`).style.width = `${val}%`;
}

function calculateFinalEnding() {
    const s = gameState.stats;
    if (s.power > 80 && s.integrity < 30) showEnding('corrupt');
    else if (s.integrity > 70 && s.power < 40) showEnding('noble');
    else if (s.family <= 0) showEnding('tragedy');
    else showEnding('average');
}

function showEnding(type) {
    document.querySelector('main').style.display = 'none';
    document.getElementById('stats-bar').style.display = 'none';
    const screen = document.getElementById('ending-screen');
    screen.classList.remove('hidden');

    const data = {
        'martyr': { title: "【結局：捨生取義】", desc: "你死了，但你的血喚醒了無數人。歷史將永遠記住你的氣節。", quote: "孔曰成仁，孟曰取義。" },
        'corrupt': { title: "【結局：長樂老】", desc: "你一生榮華，子孫滿堂。但死後，你的名字被寫進了奸臣傳。", quote: "士大夫之無恥，是謂國恥。" },
        'noble': { title: "【結局：亂世松柏】", desc: "雖然一生清貧，但你守住了底線。你是黑暗時代的一盞明燈。", quote: "松柏後凋於歲寒。" },
        'tragedy': { title: "【結局：家破人亡】", desc: "亂世無情，你失去了一切。這是一個令人心碎的悲劇。", quote: "天地不仁，以萬物為芻狗。" },
        'average': { title: "【結局：隨波逐流】", desc: "你在夾縫中生存了下來，或許心中有愧，或許慶幸活著。", quote: "無恥之恥，無恥矣。" }
    };
    
    const end = data[type] || data['average'];
    document.getElementById('ending-title').innerText = end.title;
    document.getElementById('ending-desc').innerText = end.desc;
    document.getElementById('ending-quote').innerText = end.quote;
}

window.onload = initGame;