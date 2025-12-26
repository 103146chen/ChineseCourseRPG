// 遊戲狀態全域變數
let gameState = {
    stats: {
        integrity: 50, // 廉恥
        power: 30,     // 權勢
        family: 100    // 家族
    },
    currentScene: 'intro',
    storyData: null
};

// 初始化：載入 JSON 檔案
async function initGame() {
    try {
        const response = await fetch('story.json');
        if (!response.ok) throw new Error("無法讀取 story.json");
        gameState.storyData = await response.json();
        
        // 設定初始數值
        gameState.stats = { ...gameState.storyData.initialStats };
        updateStatsUI();
        loadScene('intro');
        
    } catch (error) {
        console.error(error);
        document.getElementById('story-text').innerHTML = 
            "⚠️ 讀取遊戲數據失敗。<br>請確保您是使用 Local Server (如 VS Code Live Server) 開啟此網頁，而非直接雙擊 html 檔案。";
    }
}

// 載入場景
function loadScene(sceneId) {
    // 特殊結局判斷：如果直接跳轉到特殊結局 ID
    if (sceneId === 'end_martyr') {
        showEnding('martyr');
        return;
    }
    if (sceneId === 'calc_ending') {
        calculateFinalEnding();
        return;
    }

    const scene = gameState.storyData.scenes[sceneId];
    if (!scene) return;

    // 更新文字
    const storyBox = document.getElementById('story-text');
    storyBox.innerHTML = scene.text;
    storyBox.style.opacity = 0;
    setTimeout(() => storyBox.style.opacity = 1, 100); // 簡單淡入效果

    // 生成選項按鈕
    const choicesContainer = document.getElementById('choices-container');
    choicesContainer.innerHTML = ''; // 清空舊選項

    scene.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.innerHTML = choice.text;
        btn.className = 'choice-btn';
        btn.onclick = () => makeChoice(choice);
        choicesContainer.appendChild(btn);
    });
}

// 處理玩家選擇
function makeChoice(choice) {
    // 1. 更新數值
    const effects = choice.effects;
    gameState.stats.integrity += effects.integrity;
    gameState.stats.power += effects.power;
    gameState.stats.family += effects.family;

    // 2. 邊界檢查 (數值不能超過 0-100，或根據需求調整)
    // 這裡我們允許破表，但在 UI 上限制顯示
    updateStatsUI();

    // 3. 檢查是否因為數值過低導致遊戲提前結束 (例如家族全滅)
    if (gameState.stats.family <= 0 && choice.nextScene !== 'end_martyr') {
        showEnding('tragedy_family');
        return;
    }

    // 4. 前往下一章
    loadScene(choice.nextScene);
}

// 更新 UI 數值條
function updateStatsUI() {
    updateBar('integrity', gameState.stats.integrity);
    updateBar('power', gameState.stats.power);
    updateBar('family', gameState.stats.family);
}

function updateBar(type, value) {
    // 限制顯示範圍 0-100
    let displayValue = Math.max(0, Math.min(100, value));
    document.getElementById(`bar-${type}`).style.width = `${displayValue}%`;
    document.getElementById(`val-${type}`).innerText = value;
    
    // 顏色變化邏輯 (可選)
    const bar = document.getElementById(`bar-${type}`);
    if (value < 30) bar.style.backgroundColor = '#d9534f'; // 紅色警示
    else bar.style.backgroundColor = '#8b0000'; // 正常深紅
}

// 計算最終結局
function calculateFinalEnding() {
    const s = gameState.stats;
    
    if (s.power > 80 && s.integrity < 20) {
        showEnding('corrupt'); // 長樂老結局
    } else if (s.integrity > 80 && s.power < 40) {
        showEnding('noble'); // 松柏後凋結局
    } else {
        showEnding('average'); // 凡人結局
    }
}

// 顯示結局畫面
function showEnding(type) {
    // 隱藏遊戲主介面
    document.querySelector('main').style.display = 'none';
    document.getElementById('stats-bar').style.display = 'none';
    
    const endingScreen = document.getElementById('ending-screen');
    endingScreen.classList.remove('hidden');
    
    const title = document.getElementById('ending-title');
    const desc = document.getElementById('ending-desc');
    const quote = document.getElementById('ending-quote');

    // 結局內容定義
    const endings = {
        'martyr': {
            title: "結局：捨生取義",
            desc: "你選擇了最慘烈但也最壯烈的方式。你的家人或許因此受難，但你的名字被刻在歷史的豐碑上。",
            quote: "「孔曰成仁，孟曰取義；惟其義盡，所以仁至。」"
        },
        'tragedy_family': {
            title: "結局：家破人亡",
            desc: "在亂世中，你既沒能保住氣節，也沒能保住家人。這是一個徹頭徹尾的悲劇。",
            quote: "「覆巢之下，安有完卵？」"
        },
        'corrupt': {
            title: "結局：長樂老再世",
            desc: "你一生榮華富貴，歷經多朝而不倒。然而，史書將你列入《貳臣傳》，你的名字成為無恥的代名詞。",
            quote: "「士大夫之無恥，是謂國恥。」"
        },
        'noble': {
            title: "結局：亂世松柏",
            desc: "你一生清貧，屢遭磨難，但你守住了讀書人的底線。後世提及那個黑暗的時代，都會想起你這盞明燈。",
            quote: "「彼眾昏之日，固未嘗無獨醒之人也。」"
        },
        'average': {
            title: "結局：隨波逐流",
            desc: "你像大多數人一樣，在夾縫中求生存。沒有大惡，也無大善。歷史不會記住你，但你平安地活過了亂世。",
            quote: "「無恥之恥，無恥矣。」"
        }
    };

    const result = endings[type] || endings['average'];
    
    title.innerText = result.title;
    desc.innerText = result.desc;
    quote.innerText = result.quote;
}

// 啟動遊戲
window.onload = initGame;