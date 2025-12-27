/**
 * export.js
 * 負責將遊戲資料自動填入 HTML 模板，並觸發列印
 */

export function exportPortfolio(history, endingData, currentStats, statsConfig) {
    // 1. 自動填入日期
    const today = new Date();
    const dateStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
    document.getElementById('print-date').innerText = dateStr;

    // 2. 填入結局資料
    const titleEl = document.getElementById('print-ending-title');
    const descEl = document.getElementById('print-ending-desc');
    const quoteEl = document.getElementById('print-ending-quote');

    if (titleEl) titleEl.innerText = endingData.title;
    if (descEl) descEl.innerText = endingData.desc;
    if (quoteEl) quoteEl.innerText = endingData.quote || "";

    // 3. 填入數值 (製作簡易表格)
    const statsContainer = document.getElementById('print-stats-container');
    if (statsContainer && currentStats) {
        statsContainer.innerHTML = '';
        
        // 嘗試從設定檔找中文名稱，找不到就用 key
        Object.entries(currentStats).forEach(([key, val]) => {
            // 找出對應的設定 (為了拿中文名)
            const config = statsConfig ? statsConfig.find(s => s.id === key) : null;
            const name = config ? config.name : key;

            const div = document.createElement('div');
            div.className = 'print-stat-item';
            div.innerHTML = `
                ${name}
                <span class="print-stat-val">${val}</span>
            `;
            statsContainer.appendChild(div);
        });
    }

    // 4. 生成歷史紀錄列表
    const list = document.getElementById('print-history-list');
    if (list) {
        list.innerHTML = '';

        if (history.length === 0) {
            list.innerHTML = '<p>尚無有效遊玩紀錄。</p>';
        } else {
            history.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'print-history-item';
                
                // 根據狀態設定標籤文字
                let statusText = "一般";
                if (item.analysis.status === 'success') statusText = "符合課文";
                if (item.analysis.status === 'warning') statusText = "背離課文";
                if (item.analysis.status === 'info') statusText = "生存選擇";

                div.innerHTML = `
                    <div class="history-header">
                        <span>第 ${index + 1} 關：${item.sceneTitle}</span>
                        <span>[${statusText}]</span>
                    </div>
                    <div class="history-body">
                        <div class="history-row">
                            <span class="label-tag">你的選擇</span>
                            ${item.choiceText}
                        </div>
                        <div class="history-row">
                            <span class="label-tag">課文對照</span>
                            <span class="analysis-text">${item.analysis.content}</span>
                        </div>
                        
                        <div class="handwriting-box">
                            <span class="hw-label">📝 自我反思（請手寫）：我當時為什麼這樣選？這讓我聯想到...</span>
                            <div class="hw-line"></div>
                            <div class="hw-line"></div>
                        </div>
                    </div>
                `;
                list.appendChild(div);
            });
        }
    }

    // 5. 觸發列印
    window.print();
}