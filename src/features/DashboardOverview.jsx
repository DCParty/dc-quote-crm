import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Icons } from '../assets/Icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// 註冊 Chart.js 元件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export default function DashboardOverview({ db, appId, userId, theme }) {
    const [stats, setStats] = useState({ total: 0, new: 0, amount: 0 });
    const [charts, setCharts] = useState({
        trendData: { labels: [], datasets: [] },
        deviceData: { labels: [], datasets: [] },
        sourceData: [] // Array for list view
    });

    useEffect(() => {
        if (!db || !userId) return;
        // 抓取所有資料以進行統計 (實務上資料量大時應改用後端聚合或限制筆數)
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'inquiries'), orderBy('timestamp', 'asc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            let newCount = 0;
            let amount = 0;
            
            // 統計變數
            const dateMap = {};
            const deviceMap = {};
            const sourceMap = {};

            // 初始化最近 7 天的日期
            for(let i=6; i>=0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0].slice(5); // MM-DD
                dateMap[dateStr] = 0;
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                
                // 1. 基礎計數
                total++;
                if (data.status === 'new') newCount++;
                if (data.items && Array.isArray(data.items)) {
                    amount += data.items.reduce((sum, i) => {
                        if (i.type === 'text') return sum;
                        return sum + (Number(i.quantity) * Number(i.unitPrice));
                    }, 0);
                }

                // 2. 趨勢分析 (Trend) - 基於 inquiry.date
                // 如果日期格式是 YYYY-MM-DD
                if (data.date) {
                    const dateKey = data.date.slice(5); // MM-DD
                    if (dateMap.hasOwnProperty(dateKey)) {
                        dateMap[dateKey]++;
                    }
                }

                // 3. 裝置分析 (Devices) - 基於 meta.platform
                const platform = data.meta?.platform || 'Unknown';
                // 簡單分類邏輯
                let deviceKey = 'Desktop';
                // 這裡只做簡單判斷，實際可依需求調整
                if (/iPhone|iPad|iPod|Android/i.test(data.meta?.userAgent || platform)) {
                    deviceKey = 'Mobile';
                } else if (platform === 'Unknown') {
                    deviceKey = 'Unknown';
                }
                
                deviceMap[deviceKey] = (deviceMap[deviceKey] || 0) + 1;

                // 4. 來源分析 (Sources) - 基於 meta.referrer
                let source = data.meta?.referrer || 'Direct';
                
                // 清理來源字串，只留網域
                if (source.includes('google')) source = 'Google Search';
                else if (source.includes('facebook')) source = 'Facebook';
                else if (source.includes('instagram')) source = 'Instagram';
                else if (source === '' || source === 'Direct') source = 'Direct / None';
                else {
                    try {
                        const url = new URL(source);
                        source = url.hostname;
                    } catch { 
                        // 如果不是 URL 格式，就維持原樣或歸類
                    }
                }
                sourceMap[source] = (sourceMap[source] || 0) + 1;
            });

            setStats({ total, new: newCount, amount });

            // 準備圖表資料
            setCharts({
                trendData: {
                    labels: Object.keys(dateMap),
                    datasets: [
                        {
                            label: '每日詢價',
                            data: Object.values(dateMap),
                            borderColor: '#FF5F1F',
                            backgroundColor: 'rgba(255, 95, 31, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#FF5F1F'
                        }
                    ]
                },
                deviceData: {
                    labels: Object.keys(deviceMap),
                    datasets: [
                        {
                            data: Object.values(deviceMap),
                            backgroundColor: ['#FF5F1F', '#3b82f6', '#10b981', '#8b5cf6'],
                            borderWidth: 0
                        }
                    ]
                },
                sourceData: Object.entries(sourceMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5) // 取前 5 名
            });

        }, (error) => {
            console.error("Error fetching dashboard stats:", error);
        });

        return () => unsubscribe();
    }, [db, appId, userId]);

    // Chart Options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: { 
                grid: { display: false, drawBorder: false },
                ticks: { color: theme === 'dark' ? '#888' : '#666' }
            },
            y: { 
                grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                ticks: { color: theme === 'dark' ? '#888' : '#666', precision: 0 }
            }
        }
    };

    const cardClass = theme === 'dark' ? 'bg-dc-panel border-white/5' : 'bg-white border-gray-200 shadow-sm';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const textSecondary = 'text-dc-gray';

    return (
        <div className="max-w-6xl mx-auto animate-fade-in pb-10">
            <h2 className={`text-3xl font-bold mb-8 flex items-center gap-3 ${textPrimary}`}>
                <div className="bg-dc-orange/10 p-2 rounded-xl"><Icons.FileText className="w-8 h-8 text-dc-orange" /></div>
                營運總覽 & 流量分析
            </h2>

            {/* 1. 核心指標 (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={`p-8 rounded-4xl border ${cardClass} relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-dc-orange/10 rounded-full blur-2xl group-hover:bg-dc-orange/20 transition-colors"></div>
                    <h3 className={`font-bold text-lg mb-2 ${textSecondary}`}>本月詢價總數</h3>
                    <div className={`text-5xl font-bold ${textPrimary}`}>{stats.total}</div>
                    <div className={`mt-4 text-sm flex items-center gap-2 ${textSecondary}`}><Icons.TrendingUp className="w-4 h-4 text-green-500"/> 較上月成長</div>
                </div>
                <div className={`p-8 rounded-4xl border ${cardClass} relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
                    <h3 className={`font-bold text-lg mb-2 ${textSecondary}`}>待處理案件</h3>
                    <div className={`text-5xl font-bold ${textPrimary}`}>{stats.new}</div>
                    <div className={`mt-4 text-sm flex items-center gap-2 ${textSecondary}`}>需要立即回覆</div>
                </div>
                <div className={`p-8 rounded-4xl border ${cardClass} relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors"></div>
                    <h3 className={`font-bold text-lg mb-2 ${textSecondary}`}>潛在商機總額</h3>
                    <div className="text-5xl font-bold text-dc-orange">${(stats.amount/10000).toFixed(1)}w</div>
                    <div className={`mt-4 text-sm flex items-center gap-2 ${textSecondary}`}>預估報價總和</div>
                </div>
            </div>

            {/* 2. 圖表區塊 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 趨勢圖 (佔 2 格) */}
                <div className={`p-8 rounded-4xl border lg:col-span-2 ${cardClass}`}>
                    <h3 className={`text-xl font-bold mb-6 ${textPrimary}`}>近 7 日詢價趨勢</h3>
                    <div className="h-64 w-full">
                        {/* 確保有資料才渲染圖表，避免 canvas 錯誤 */}
                        {charts.trendData.labels.length > 0 && (
                            <Line data={charts.trendData} options={commonOptions} />
                        )}
                    </div>
                </div>

                {/* 裝置分佈 (佔 1 格) */}
                <div className={`p-8 rounded-4xl border ${cardClass} flex flex-col`}>
                    <h3 className={`text-xl font-bold mb-6 ${textPrimary}`}>訪客裝置分佈</h3>
                    <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
                        <div className="w-48 h-48 relative z-10">
                            {charts.deviceData.labels.length > 0 && (
                                <Doughnut 
                                    data={charts.deviceData} 
                                    options={{
                                        cutout: '70%',
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        elements: { arc: { borderWidth: 0 } }
                                    }} 
                                />
                            )}
                        </div>
                        {/* 中間顯示主要裝置佔比 */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                            <span className="text-3xl font-bold text-dc-orange">
                                {charts.deviceData.datasets[0]?.data.length > 0 
                                    ? Math.round((charts.deviceData.datasets[0].data[0] / stats.total) * 100) + '%'
                                    : '0%'}
                            </span>
                            <span className={`text-xs ${textSecondary}`}>主要裝置</span>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2">
                        {charts.deviceData.labels.map((label, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="w-3 h-3 rounded-full" style={{backgroundColor: charts.deviceData.datasets[0].backgroundColor[i]}}></span>
                                <span className={textSecondary}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 來源列表 (佔 3 格寬度) */}
                <div className={`p-8 rounded-4xl border lg:col-span-3 ${cardClass}`}>
                    <h3 className={`text-xl font-bold mb-6 ${textPrimary}`}>流量來源分析 (Top 5)</h3>
                    <div className="space-y-4">
                        {charts.sourceData.length === 0 && <p className="text-center text-dc-gray py-4">尚無流量資料</p>}
                        {charts.sourceData.map(([source, count], idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-dc-orange text-white' : 'bg-gray-500/20 text-dc-gray'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className={`font-medium ${textPrimary}`}>{source}</span>
                                        <span className={textSecondary}>{count} 次</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-500/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-dc-orange rounded-full transition-all duration-1000" 
                                            style={{width: `${(count / stats.total) * 100}%`}}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}