import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Icons } from '../assets/Icons';
import { exportToCSV } from '../lib/utils';

export default function QuoteHistory({ db, appId, userId, theme, onLoadQuote }) {
    const [quotes, setQuotes] = useState([]);

    // 監聽歷史報價單資料
    useEffect(() => {
        if(!db || !userId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'quotations'), orderBy('timestamp', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setQuotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => unsubscribe();
    }, [db, appId, userId]);

    // 刪除報價單
    const handleDelete = async (id, e) => { 
        e.stopPropagation(); 
        if(!confirm("確定要刪除此歷史報價單嗎？此動作無法復原。")) return; 
        
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'quotations', id));
        } catch (error) {
            console.error("Error deleting quote:", error);
            alert("刪除失敗");
        }
    };
    
    // 匯出 CSV
    const handleExport = () => {
        const dataToExport = quotes.map(q => ({
            "日期": q.quoteDate, 
            "單號": q.quoteNo, 
            "版本": q.versionNote || "", // [新增] 匯出版本註記
            "客戶名稱": q.clientName, 
            "電話": q.clientPhone || "",
            "Email": q.clientEmail || "",
            "總金額": q.totalAmount, 
            "項目摘要": q.items ? q.items.map(i => i.description).join("; ") : ""
        }));
        exportToCSV(dataToExport, "報價單歷史.csv");
    };

    const cardClass = theme === 'dark' ? 'bg-dc-panel border-white/5 hover:border-dc-orange/50' : 'bg-white border-gray-200 hover:border-dc-orange/50 shadow-sm';

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className={`text-3xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    <div className="bg-dc-orange/10 p-2 rounded-xl"><Icons.Clock className="w-8 h-8 text-dc-orange"/></div> 
                    歷史報價單
                </h2>
                <button 
                    onClick={handleExport} 
                    className="bg-dc-orange/10 text-dc-orange px-4 py-2 rounded-lg font-bold hover:bg-dc-orange hover:text-white flex items-center gap-2 transition-colors"
                >
                    <Icons.FileUp className="w-4 h-4"/> 匯出 CSV
                </button>
            </div>

            <div className="grid gap-4">
                {quotes.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <p className="text-xl mb-2">尚無歷史紀錄</p>
                        <p className="text-sm">儲存的報價單將會顯示在這裡</p>
                    </div>
                )}
                
                {quotes.map(q => (
                    <div 
                        key={q.id} 
                        className={`p-6 rounded-3xl border transition-all group relative cursor-pointer ${cardClass}`} 
                        onClick={() => onLoadQuote(q)}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className={`text-xl font-bold flex items-center gap-3 ${theme==='dark'?'text-white':'text-gray-900'}`}>
                                    {q.quoteNo} - {q.clientName}
                                    
                                    {/* [新增] 顯示版本註記標籤 */}
                                    {q.versionNote && (
                                        <span className="text-xs bg-dc-orange text-white px-2 py-0.5 rounded-full font-normal tracking-wide shadow-sm">
                                            {q.versionNote}
                                        </span>
                                    )}
                                </h3>
                                <div className="text-dc-gray text-sm mt-1 flex items-center gap-3">
                                    <span>{q.quoteDate}</span>
                                    <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                    <span className={`font-mono font-bold ${theme==='dark'?'text-gray-300':'text-gray-700'}`}>
                                        ${q.totalAmount?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleDelete(q.id, e)} 
                                    className="p-2 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                    title="刪除此報價單"
                                >
                                    <Icons.Trash2 className="w-5 h-5"/>
                                </button>
                                <div className="text-dc-gray">
                                    <Icons.ChevronRight className="w-5 h-5"/>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}