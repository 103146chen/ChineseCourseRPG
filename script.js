let gameState = {
    stats: { integrity: 50, power: 30, family: 100 },
    currentSceneId: 'intro',
    currentDialogueIndex: 0,
    storyData: null,
    isSecondLife: false // 標記是否進入下半部
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
    if (sceneId === 'end_calc') { calculateFinalEnding(); return; }
    
    // 特殊跳轉邏輯：第五章結束後，決定下半部的出身
    if (sceneId === 'ch5_start') {
        determineLineage();
        return;
    }

    gameState.currentSceneId = sceneId;
    gameState.currentDialogueIndex = 0;
    
    // UI 重置
    document.getElementById('choices-container').classList.add('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
    document.getElementById('next-btn').style.display = 'block';

    displayNextDialogue();
}

// 決定下半部出身的邏輯
function determineLineage() {
    gameState.isSecondLife = true;
    
    // 根據上半部的廉恥值決定下半部路線
    if (gameState.stats.integrity < 40) {
        // 走富貴無恥路線
        loadScene('ch5_rich');
        // 繼承獎勵與懲罰：有錢但無名聲
        gameState.stats.power = 80;
        gameState.stats.family = 100;
        gameState.stats.integrity = 20; 
        showNotification("【世代繼承】先祖選擇了富貴，你出生在豪門，但背負罵名。");
    } else {
        // 走清貧氣節路線
        loadScene('ch5_poor');
        // 繼承獎勵與懲罰：有名聲但貧窮
        gameState.stats.power = 20;
        gameState.stats.family = 60; // 家族勢力較弱
        gameState.stats.integrity = 80;
        showNotification("【世代繼承】先祖堅持氣節，你家道中落，但受人敬重。");
    }
    updateStatsUI();
}

function showNotification(msg) {
    // 簡單的通知效果，可以做得更華麗
    alert(msg); 
}

function displayNextDialogue() {
    const scene = gameState.storyData.scenes[gameState.currentSceneId];
    const storyBox = document.getElementById('story-text');
    
    // 處理圖片顯示 (如果需要)
    // 這裡我們簡單用文字
    const text = scene.dialogues[gameState.currentDialogueIndex];
    storyBox.innerHTML = text;
    storyBox.style.opacity = 0;
    setTimeout(() => storyBox.style.opacity = 1, 100);

    gameState.currentDialogueIndex++;

    if (gameState.currentDialogueIndex >= scene.dialogues.length) {
        const nextBtn = document.getElementById('next-btn');
        nextBtn.innerText = "做出抉擇";
        nextBtn.onclick = showChoices;
    } else {
        const nextBtn = document.getElementById('next-btn');
        nextBtn.innerText = "▼ 繼續劇情";
        nextBtn.onclick = nextDialogue;
    }
}

function nextDialogue() {
    displayNextDialogue();
}

function showChoices() {
    document.getElementById('next-btn').style.display = 'none';
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
    
    // 檢查是否中途死亡 (家族歸零)
    if (gameState.stats.family <= 0) {
        showEnding('tragedy');
        return;
    }

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
    // 結局判定邏輯更嚴格
    if (s.power > 80 && s.integrity < 30) showEnding('corrupt');
    else if (s.integrity > 90) showEnding('saint'); // 聖人結局
    else if (s.integrity > 60 && s.power < 50) showEnding('noble');
    else showEnding('average');
}

function showEnding(type) {
    document.querySelector('main').style.display = 'none';
    document.getElementById('stats-bar').style.display = 'none';
    const screen = document.getElementById('ending-screen');
    screen.classList.remove('hidden');

    const data = {
        'saint': { title: "【完美結局：萬世師表】", desc: "你的一生是所有讀書人的典範。你的《日知錄》流傳千古，顧炎武引你為知己。", quote: "「博學於文，行己有恥。」" },
        'corrupt': { title: "【結局：長樂老再世】", desc: "你兩世為人，都選擇了利益。你的家族或許富可敵國，但在史書上，你永遠是那個反面教材。", quote: "「士大夫之無恥，是謂國恥。」" },
        'noble': { title: "【結局：亂世松柏】", desc: "雖然一生清貧，屢遭磨難，但你守住了讀書人的底線。後世提及那個黑暗的時代，都會想起你。", quote: "「彼眾昏之日，固未嘗無獨醒之人也。」" },
        'tragedy': { title: "【結局：歷史的塵埃】", desc: "亂世太過殘酷，你的家族在動盪中徹底消亡。這是一個令人心碎的悲劇。", quote: "「覆巢之下，安有完卵？」" },
        'average': { title: "【結局：隨波逐流】", desc: "你在夾縫中生存了下來。沒有大惡，也無大善。你是歷史長河中沈默的大多數。", quote: "「無恥之恥，無恥矣。」" }
    };
    
    const end = data[type] || data['average'];
    document.getElementById('ending-title').innerText = end.title;
    document.getElementById('ending-desc').innerText = end.desc;
    document.getElementById('ending-quote').innerText = end.quote;
}

window.onload = initGame;