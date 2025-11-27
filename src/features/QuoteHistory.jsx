import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Icons } from '../assets/Icons';
import { exportToCSV } from '../lib/utils';

export default function QuoteHistory({ db, appId, userId, theme, onLoadQuote }) {
    const [quotes, setQuotes] = useState([]);
    useEffect(() => {
        if(!db || !userId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'quotations'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (s) => setQuotes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [db, appId, userId]);

    const handleDelete = async (id, e) => { 
        e.stopPropagation(); 
        if(!confirm("確定要刪除此歷史報價單嗎？")) return; 
        await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'quotations', id)); 
    };
    
    const handleExport = () => {
        const dataToExport = quotes.map(q => ({
            "日期": q.quoteDate, "單號": q.quoteNo, "客戶名稱": q.clientName, "總金額": q.totalAmount, "項目摘要": q.items ? q.items.map(i => i.description).join("; ") : ""
        }));
        exportToCSV(dataToExport, "報價單歷史.csv");
    };

    const cardClass = theme === 'dark' ? 'bg-dc-panel border-white/5 hover:border-dc-orange/50' : 'bg-white border-gray-200 hover:border-dc-orange/50 shadow-sm';

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className={`text-3xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}><div className="bg-dc-orange/10 p-2 rounded-xl"><Icons.Clock className="w-8 h-8 text-dc-orange"/></div> 歷史報價單</h2>
                <button onClick={handleExport} className="bg-dc-orange/10 text-dc-orange px-4 py-2 rounded-lg font-bold hover:bg-dc-orange hover:text-white flex items-center gap-2"><Icons.FileUp className="w-4 h-4"/> 匯出 CSV</button>
            </div>
            <div className="grid gap-4">
                {quotes.length === 0 && <p className="text-center py-20 text-gray-500 text-xl">尚無紀錄</p>}
                {quotes.map(q => (
                    <div key={q.id} className={`p-6 rounded-3xl border transition-all group relative cursor-pointer ${cardClass}`} onClick={() => onLoadQuote(q)}>
                        <div className="flex justify-between items-center">
                            <div><h3 className={`text-xl font-bold ${theme==='dark'?'text-white':'text-gray-900'}`}>{q.quoteNo} - {q.clientName}</h3><p className="text-dc-gray text-sm mt-1">{q.quoteDate} | 總計: ${q.totalAmount?.toLocaleString()}</p></div>
                            <div className="flex items-center gap-3"><button onClick={(e) => handleDelete(q.id, e)} className="p-2 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition"><Icons.Trash2 className="w-5 h-5"/></button><Icons.ChevronRight className="w-5 h-5 text-dc-gray"/></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}