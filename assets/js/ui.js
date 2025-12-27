/**
 * ui.js
 * 負責所有畫面元素的更新 (數值條、對話框、提示框、回顧視窗)
 */

// 1. 初始化數值 UI
export function initStatsUI(statsConfig) {
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

// 2. 更新數值 UI
export function updateStatsUI(stats) {
    for (const [key, value] of Object.entries(stats)) {
        // 限制顯示範圍 0-100
        const clampedVal = Math.max(0, Math.min(100, value));
        
        const bar = document.getElementById(`bar-${key}`);
        const text = document.getElementById(`val-${key}`);
        
        if (bar) bar.style.width = `${clampedVal}%`;
        if (text) text.innerText = value;
    }
}

// 3. 顯示結局畫面
export function showEndingScreen(endingData, basePath) {
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
        document.getElementById('game-bg').style.backgroundImage = `url('${basePath}${endingData.image}')`;
    }
}

// 4. 渲染回顧列表 (Review System)
export function renderReviewList(history) {
    const list = document.getElementById('review-list');
    list.innerHTML = ''; 

    if (history.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px;">尚無紀錄</p>';
    }

    history.forEach((item, index) => {
        const card = document.createElement('div');
        // 根據 status 設定顏色樣式 (success, warning, info)
        card.className = `review-card ${item.analysis.status}`;
        
        // 截斷太長的標題
        const shortTitle = item.sceneTitle.length > 20 ? item.sceneTitle.substring(0, 20) + '...' : item.sceneTitle;

        card.innerHTML = `
            <div class="review-header">
                <span class="step-num">抉擇 ${index + 1}</span>
                <span class="scene-name">${shortTitle}</span>
            </div>
            <div class="player-choice">你的選擇：${item.choiceText}</div>
            <div class="analysis-content">
                <strong>${item.analysis.title}</strong><br>
                ${item.analysis.content}
            </div>
        `;
        list.appendChild(card);
    });
}

// 5. 綁定難詞提示事件 (Tooltip System)
export function bindTooltipEvents(container) {
    const tooltipBox = document.getElementById('global-tooltip');
    if (!tooltipBox) return; // 防止找不到元素報錯

    const glossaries = container.querySelectorAll('.glossary');
    
    glossaries.forEach(item => {
        // 電腦版：滑鼠移入
        item.addEventListener('mouseenter', (e) => {
            const text = e.target.getAttribute('data-tip');
            if (text) {
                tooltipBox.innerHTML = text;
                tooltipBox.classList.remove('hidden');
                updateTooltipPosition(e, tooltipBox);
            }
        });

        // 電腦版：滑鼠移動
        item.addEventListener('mousemove', (e) => {
            updateTooltipPosition(e, tooltipBox);
        });

        // 電腦版：滑鼠移出
        item.addEventListener('mouseleave', () => {
            tooltipBox.classList.add('hidden');
        });

        // 手機版：點擊切換
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = e.target.getAttribute('data-tip');
            if (text) {
                if (!tooltipBox.classList.contains('hidden') && tooltipBox.innerHTML === text) {
                    tooltipBox.classList.add('hidden');
                } else {
                    tooltipBox.innerHTML = text;
                    tooltipBox.classList.remove('hidden');
                }
            }
        });
    });

    // 點擊背景關閉
    document.addEventListener('click', () => {
        tooltipBox.classList.add('hidden');
    });
}

// 輔助函式：更新 Tooltip 位置
function updateTooltipPosition(e, tooltipBox) {
    if (window.innerWidth > 768) {
        const x = e.clientX;
        const y = e.clientY;
        
        let top = y - 10;
        let left = x + 20;

        // 防止超出右邊界
        if (left + 250 > window.innerWidth) {
            left = x - 260;
        }

        // 防止超出下邊界
        if (top + 100 > window.innerHeight) {
            top = y - 100;
        }

        tooltipBox.style.top = `${top}px`;
        tooltipBox.style.left = `${left}px`;
    }
}


// 6. 儲存遊戲進度功能
export function saveGame(state) {
    localStorage.setItem('rpg_save_data', JSON.stringify(state));
}

export function loadGame() {
    const data = localStorage.getItem('rpg_save_data');
    return data ? JSON.parse(data) : null;
}

// 7. 觸發視覺特效
export function triggerFX(effectName) {
    if (!effectName) return;

    const gameWindow = document.querySelector('.game-window');
    const overlay = document.getElementById('fx-overlay');

    // 移除舊的動畫 class，確保可以重複觸發
    gameWindow.classList.remove('fx-shake');
    overlay.className = 'fx-layer'; // 重置 overlay

    // 強制瀏覽器重繪 (Reflow)，否則連續同樣的動畫不會觸發
    void gameWindow.offsetWidth; 
    void overlay.offsetWidth;

    // 根據特效名稱應用 class
    switch (effectName) {
        case 'shake':
            gameWindow.classList.add('fx-shake');
            // 動畫結束後自動移除 class
            setTimeout(() => gameWindow.classList.remove('fx-shake'), 500);
            break;
            
        case 'flash-red':
            overlay.classList.add('fx-flash-red');
            break;
            
        case 'flash-white':
            overlay.classList.add('fx-flash-white');
            break;

        case 'blur':
            overlay.classList.add('fx-blur');
            break;

        default:
            console.warn(`未知的特效: ${effectName}`);
    }
}