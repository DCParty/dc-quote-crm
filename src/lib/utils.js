// 報價單的 8 組預設模組資料
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
    {
        name: "商業影片製作",
        description: "專業團隊實拍，提升品牌形象",
        items: [
            { description: "前置腳本與分鏡腳本", unit: "式", priceMin: 5000, priceMax: 15000, type: 'service' },
            { description: "拍攝器材與燈光組", unit: "天", priceMin: 12000, priceMax: 25000, type: 'service' },
            { description: "專業攝影團隊 (導演/攝影/燈光)", unit: "班", priceMin: 30000, priceMax: 60000, type: 'service' },
            { description: "後期剪輯與特效包裝", unit: "式", priceMin: 20000, priceMax: 50000, type: 'service' }
        ]
    },
    {
        name: "商業平面攝影",
        description: "產品、人像、空間專業攝影",
        items: [
            { description: "情境風格企劃", unit: "式", priceMin: 3000, priceMax: 8000, type: 'service' },
            { description: "專業攝影師與助理 (含器材)", unit: "小時", priceMin: 5000, priceMax: 10000, type: 'service' },
            { description: "精修圖檔 (調色/修膚/去背)", unit: "張", priceMin: 500, priceMax: 1500, type: 'service' },
            { description: "攝影棚租借費用", unit: "小時", priceMin: 1000, priceMax: 3000, type: 'service' }
        ]
    },
    {
        name: "客製化軟體開發",
        description: "量身打造的企業級系統解決方案",
        items: [
            { description: "系統架構規劃與 SA 文件", unit: "式", priceMin: 30000, priceMax: 80000, type: 'service' },
            { description: "UI/UX 介面設計", unit: "頁", priceMin: 3000, priceMax: 6000, type: 'service' },
            { description: "前端功能開發 (Web/App)", unit: "式", priceMin: 50000, priceMax: 150000, type: 'service' },
            { description: "後端 API 與資料庫建置", unit: "式", priceMin: 50000, priceMax: 150000, type: 'service' }
        ]
    },
    {
        name: "RWD 品牌官網",
        description: "響應式設計，全裝置完美呈現",
        items: [
            { description: "網站視覺風格設計", unit: "式", priceMin: 15000, priceMax: 30000, type: 'service' },
            { description: "RWD 響應式切版", unit: "頁", priceMin: 3000, priceMax: 8000, type: 'service' },
            { description: "CMS 後台管理系統", unit: "式", priceMin: 20000, priceMax: 50000, type: 'service' },
            { description: "主機環境架設與網域設定", unit: "年", priceMin: 5000, priceMax: 10000, type: 'service' }
        ]
    },
    {
        name: "訪談拍攝",
        description: "人物專訪、企業形象訪談",
        items: [
            { description: "訪談大綱與流程擬定", unit: "式", priceMin: 3000, priceMax: 6000, type: 'service' },
            { description: "雙機位拍攝 (含燈光/收音)", unit: "班", priceMin: 15000, priceMax: 30000, type: 'service' },
            { description: "剪輯與字幕製作", unit: "分鐘", priceMin: 3000, priceMax: 8000, type: 'service' },
            { description: "B-Roll 畫面補拍", unit: "組", priceMin: 5000, priceMax: 15000, type: 'service' }
        ]
    },
    {
        name: "平面設計服務",
        description: "品牌識別、行銷素材設計",
        items: [
            { description: "主視覺 Key Visual 設計", unit: "款", priceMin: 10000, priceMax: 30000, type: 'service' },
            { description: "社群媒體素材 (FB/IG)", unit: "組", priceMin: 3000, priceMax: 8000, type: 'service' },
            { description: "DM / 海報排版設計", unit: "頁", priceMin: 2000, priceMax: 5000, type: 'service' },
            { description: "印刷完稿處理", unit: "式", priceMin: 1000, priceMax: 3000, type: 'service' }
        ]
    }
];

// CSV 匯出功能 (請確認這段程式碼是否存在)
export const exportToCSV = (data, filename) => {
    if (!data || !data.length) return alert("無資料可導出");
    
    // 加入 BOM 以支援 Excel 中文顯示
    const BOM = "\uFEFF";
    const headers = Object.keys(data[0]).join(",");
    
    const rows = data.map(row => {
        return Object.values(row).map(val => {
            // 處理包含逗號或換行符的字串，用雙引號包起來
            if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(",");
    });

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