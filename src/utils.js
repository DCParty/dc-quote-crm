// src/lib/utils.js
// 放置共用的常數與函式

export const DEFAULT_TEMPLATES = [
    {
        name: "AI 影片廣告製作",
        description: "從腳本到輸出的全自動化影音製作",
        items: [
            { description: "腳本創意發想與分鏡", unit: "式", priceMin: 3000, priceMax: 8000, type: 'service' },
            { description: "AI 圖像/影片生成", unit: "組", priceMin: 10000, priceMax: 20000, type: 'service' },
            { description: "A Copy 製作 (初剪與配樂)", unit: "式", priceMin: 15000, priceMax: 15000, type: 'service' },
            { description: "Final Copy 輸出 (4K)", unit: "式", priceMin: 3000, priceMax: 3000, type: 'service' }
        ]
    },
    {
        name: "AI 視覺設計服務",
        description: "為品牌打造獨一無二的 AI 視覺語言",
        items: [
            { description: "風格定調與 moodboard", unit: "式", priceMin: 3000, priceMax: 5000, type: 'service' },
            { description: "AI 算圖生成 (20組精選)", unit: "式", priceMin: 6000, priceMax: 12000, type: 'service' },
            { description: "商業授權費用", unit: "式", priceMin: 2000, priceMax: 10000, type: 'service' }
        ]
    },
    // ... (可自行加入其他預設模組)
];

export const exportToCSV = (data, filename) => {
    if (!data || !data.length) return alert("無資料可導出");
    const BOM = "\uFEFF";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).map(val => {
        if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) {
            return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
    }).join(","));
    const csvContent = BOM + headers + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};