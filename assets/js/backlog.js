/**
 * backlog.js
 * 對話回顧系統模組
 * 負責紀錄歷史對話、渲染回顧視窗
 */

// 1. 新增對話紀錄
export function pushEntry(gameState, text) {
    // 確保 backlog 陣列存在
    if (!gameState.backlog) {
        gameState.backlog = [];
    }

    // 防呆：如果最後一筆跟現在這筆不一樣，才加入 (防止來回點擊造成的重複)
    if (gameState.backlog.length === 0 || gameState.backlog[gameState.backlog.length - 1] !== text) {
        gameState.backlog.push(text);
    }
}

// 2. 切換視窗顯示 (開/關)
export function toggle(gameState) {
    const overlay = document.getElementById('backlog-overlay');
    
    if (!overlay) return;

    if (overlay.classList.contains('hidden')) {
        // 要開啟前，先渲染內容
        render(gameState.backlog);
        overlay.classList.remove('hidden');
    } else {
        // 關閉
        overlay.classList.add('hidden');
    }
}

// 3. 渲染內容 (內部使用)
function render(backlogData) {
    const container = document.getElementById('backlog-content');
    if (!container) return;

    container.innerHTML = ''; // 清空舊內容

    if (!backlogData || backlogData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; margin-top: 20px;">尚無對話紀錄。</p>';
        return;
    }

    backlogData.forEach(text => {
        const item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML = text; // 保持原本的 HTML 格式
        container.appendChild(item);
    });

    // 自動捲動到底部 (顯示最新訊息)
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 0);
}