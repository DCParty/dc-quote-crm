import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Icons } from '../assets/Icons';

export default function DashboardOverview({ db, appId, userId, theme }) {
    const [stats, setStats] = useState({ total: 0, new: 0, amount: 0 });

    useEffect(() => {
        if (!db || !userId) return;

        // 監聽 inquiries 集合
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'inquiries'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            let newCount = 0;
            let amount = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                total++;
                
                // 統計新進案件
                if (data.status === 'new') {
                    newCount++;
                }

                // 統計潛在金額 (從 items 陣列計算總和)
                if (data.items && Array.isArray(data.items)) {
                    const quoteTotal = data.items.reduce((sum, i) => {
                        // 排除純文字分隔線項目
                        if (i.type === 'text') return sum;
                        return sum + (Number(i.quantity) * Number(i.unitPrice));
                    }, 0);
                    amount += quoteTotal;
                }
            });

            setStats({ total, new: newCount, amount });
        }, (error) => {
            console.error("Error fetching dashboard stats:", error);
        });

        return () => unsubscribe();
    }, [db, appId, userId]);

    const cardClass = theme === 'dark' ? 'bg-dc-panel border-white/5' : 'bg-white border-gray-200 shadow-sm';
    
    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
             <h2 className={`text-3xl font-bold mb-8 flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                <div className="bg-dc-orange/10 p-2 rounded-xl"><Icons.FileText className="w-8 h-8 text-dc-orange" /></div>
                營運總覽
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 卡片 1: 本月詢價總數 */}
                <div className={`p-8 rounded-4xl border ${cardClass} relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-dc-orange/10 rounded-full blur-2xl group-hover:bg-dc-orange/20 transition-colors"></div>
                    <h3 className="text-dc-gray font-bold text-lg mb-2">本月詢價總數</h3>
                    <div className={`text-5xl font-bold ${theme==='dark'?'text-white':'text-gray-900'}`}>{stats.total}</div>
                    <div className="mt-4 text-sm text-dc-gray flex items-center gap-2"><Icons.TrendingUp className="w-4 h-4 text-green-500"/> 較上月成長</div>
                </div>

                {/* 卡片 2: 待處理案件 */}
                <div className={`p-8 rounded-4xl border ${cardClass} relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
                    <h3 className="text-dc-gray font-bold text-lg mb-2">待處理案件</h3>
                    <div className={`text-5xl font-bold ${theme==='dark'?'text-white':'text-gray-900'}`}>{stats.new}</div>
                    <div className="mt-4 text-sm text-dc-gray flex items-center gap-2">需要立即回覆</div>
                </div>

                {/* 卡片 3: 潛在商機總額 */}
                <div className={`p-8 rounded-4xl border ${cardClass} relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors"></div>
                    <h3 className="text-dc-gray font-bold text-lg mb-2">潛在商機總額</h3>
                    <div className={`text-5xl font-bold text-dc-orange`}>${(stats.amount/10000).toFixed(1)}w</div>
                    <div className="mt-4 text-sm text-dc-gray flex items-center gap-2">預估報價總和</div>
                </div>
            </div>
        </div>
    );
}
