/**
 * gadget.js
 * 道具系統模組 (Inventory Gadget)
 * 負責管理道具的持有狀態、邏輯判斷與 UI 顯示
 */

// 1. 檢查是否持有特定道具 (用於選項過濾)
export function checkReq(gameState, reqItemId) {
    if (!reqItemId) return true; // 沒要求就通過
    return gameState.inventory && gameState.inventory.includes(reqItemId);
}

// 2. 處理選項中的道具變動 (獲得/消耗)
export function handleChoice(gameState, choice) {
    let msg = [];

    // (A) 獲得道具
    if (choice.gainItems && choice.gainItems.length > 0) {
        if (!gameState.inventory) gameState.inventory = [];
        
        choice.gainItems.forEach(itemId => {
            // 避免重複獲得 (假設道具是唯一的)
            if (!gameState.inventory.includes(itemId)) {
                gameState.inventory.push(itemId);
                
                // 嘗試從設定檔找名稱
                const itemConfig = gameState.storyData.config.items.find(i => i.id === itemId);
                const name = itemConfig ? itemConfig.name : itemId;
                msg.push(`獲得道具：${name}`);
            }
        });
    }

    // (B) 消耗道具
    if (choice.loseItems && choice.loseItems.length > 0) {
        if (gameState.inventory) {
            gameState.inventory = gameState.inventory.filter(id => !choice.loseItems.includes(id));
            
            // 顯示消耗提示 (選用)
             choice.loseItems.forEach(itemId => {
                const itemConfig = gameState.storyData.config.items.find(i => i.id === itemId);
                const name = itemConfig ? itemConfig.name : itemId;
                msg.push(`失去道具：${name}`);
             });
        }
    }

    // 如果有變動，顯示提示 (這裡簡單用 alert，也可以改用 UI 顯示)
    if (msg.length > 0) {
        alert(msg.join("\n"));
    }
}

// 3. 切換背包視窗顯示 (UI)
export function toggle(gameState) {
    const overlay = document.getElementById('gadget-overlay');
    if (!overlay) return;

    if (overlay.classList.contains('hidden')) {
        renderInventory(gameState);
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// 4. 渲染背包內容 (內部使用)
function renderInventory(gameState) {
    const container = document.getElementById('gadget-list');
    if (!container) return;

    container.innerHTML = '';

    if (!gameState.inventory || gameState.inventory.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">背包是空的。</p>';
        return;
    }

    gameState.inventory.forEach(itemId => {
        // 從 storyData 設定檔中找道具詳細資料
        const itemConfig = gameState.storyData.config.items.find(i => i.id === itemId) || { name: itemId, desc: "未知道具" };
        
        const card = document.createElement('div');
        card.className = 'gadget-item';
        card.innerHTML = `
            <div class="gadget-name">${itemConfig.name}</div>
            <div class="gadget-desc">${itemConfig.desc}</div>
        `;
        container.appendChild(card);
    });
}