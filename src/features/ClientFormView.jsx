import React, { useState, useRef } from 'react';
import { addDoc, collection } from "firebase/firestore";
import emailjs from '@emailjs/browser'; 
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Icons } from '../assets/Icons';
import { useToast } from '../components/Toast';
import PDFContent from '../components/PDFContent';
import { DEFAULT_TEMPLATES } from '../lib/utils';

export default function ClientFormView({ templates, companyInfo, db, appId, userId, theme, toggleTheme, onExit }) {
    const toast = useToast();
    const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
    const [step, setStep] = useState(1); 
    const [clientData, setClientData] = useState({ name: "", phone: "", email: "", note: "" });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successData, setSuccessData] = useState(null);
    
    // 參考：用於 PDF 截圖的 DOM 元素
    const pdfRef = useRef();

    const toggleTemplate = (id) => setSelectedTemplateIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);

    const validateForm = () => {
        let newErrors = {};
        if (!clientData.name.trim()) newErrors.name = "請輸入稱呼";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) newErrors.email = "Email 格式不正確";
        if (!/^(\+|00)?[0-9\-\s]{8,}$/.test(clientData.phone)) newErrors.phone = "電話格式不正確";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        
        let allItems = [];
        // 使用資料庫模組，若無則使用預設模組作為備案
        const sourceTemplates = templates && templates.length > 0 ? templates : DEFAULT_TEMPLATES;

        selectedTemplateIds.forEach(id => { 
            // 透過 ID 或名稱比對模組 (相容預設模組沒有 ID 的情況)
            const t = sourceTemplates.find(temp => (temp.id || temp.name) === id); 
            if(t) {
                allItems = [...allItems, ...t.items.map(i => ({ 
                    ...i, 
                    quantity: 1, 
                    unitPrice: Math.floor((Number(i.priceMin) + Number(i.priceMax))/2) 
                }))];
            }
        });

        const quoteNo = `Q${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`;
        
        // [新增] 收集裝置與來源資訊 (GA-like Tracking)
        const metadata = {
            userAgent: navigator.userAgent,
            screen: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            platform: navigator.platform || 'Unknown',
            referrer: document.referrer || "Direct",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString()
        };

        const finalData = { 
            clientName: clientData.name, 
            clientPhone: clientData.phone, 
            clientEmail: clientData.email, 
            note: clientData.note, 
            quoteNo, 
            date: new Date().toISOString().split('T')[0], 
            items: allItems, 
            status: 'new', 
            timestamp: new Date(),
            meta: metadata // 寫入追蹤資料
        };
        
        try { 
            // 1. 存入 Firebase 資料庫
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'inquiries'), finalData); 
            
            // 2. 發送 Email (如果有設定)
            if (companyInfo.emailjsServiceId && companyInfo.emailjsTemplateId && companyInfo.emailjsPublicKey) {
                emailjs.send(
                    companyInfo.emailjsServiceId, 
                    companyInfo.emailjsTemplateId, 
                    { 
                        to_name: companyInfo.name, 
                        from_name: clientData.name, 
                        client_email: clientData.email, 
                        client_phone: clientData.phone, 
                        message: `Inquiry: ${selectedTemplateIds.length} services selected.\nNote: ${clientData.note}\n\n[Client Info]\nDevice: ${metadata.platform}\nSource: ${metadata.referrer}`, 
                        reply_to: clientData.email 
                    }, 
                    companyInfo.emailjsPublicKey
                );
            }

            setSuccessData({...finalData, companyInfo}); 
            setStep(3); 
            toast.show("需求單已送出！", "success"); 
        } catch (e) { 
            console.error(e);
            toast.show("送出失敗，請稍後再試", "error"); 
        }
        setIsSubmitting(false);
    };

    // [修復] 前台 PDF 下載功能
    const handleDownloadPDF = async () => {
        const element = pdfRef.current;
        if (!element) return toast.show("PDF 渲染錯誤", "error");
        toast.show("正在生成 PDF...", "info");
        
        try {
            element.style.display = 'block';
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            element.style.top = '0';

            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Quote_${successData.quoteNo}.pdf`);
            
            element.style.display = 'none';
            toast.show("下載完成！", "success");
        } catch (err) {
            console.error(err);
            toast.show("PDF 生成失敗", "error");
            if (element) element.style.display = 'none';
        }
    };

    const bgClass = theme === 'dark' ? 'bg-dc-black text-white' : 'bg-dc-light text-gray-900';
    const panelClass = theme === 'dark' ? 'bg-dc-panel/80 border-white/10' : 'bg-white/90 border-gray-200 shadow-2xl';
    const inputClass = theme === 'dark' ? 'bg-dc-dark border-white/20 text-white focus:border-dc-orange' : 'bg-white border-gray-300 text-black focus:border-dc-orange';
    
    // 確保有模組可選 (資料庫空時使用預設值)
    const activeTemplates = templates && templates.length > 0 ? templates : DEFAULT_TEMPLATES;

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${bgClass} overflow-x-hidden relative pb-40`}>
            {/* 背景動畫 */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute -top-40 -right-40 w-[800px] h-[800px] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob ${theme === 'dark' ? 'bg-dc-orange' : 'bg-blue-200'}`}></div>
                <div className={`absolute -bottom-40 -left-40 w-[800px] h-[800px] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob animation-delay-2000 ${theme === 'dark' ? 'bg-purple-600' : 'bg-orange-200'}`}></div>
            </div>
            
            <div className="max-w-5xl mx-auto px-6 py-8 lg:py-12 min-h-screen flex flex-col relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 lg:mb-12">
                    <div className="flex items-center gap-3 lg:gap-5">
                        {companyInfo.logo && <img src={companyInfo.logo} className="w-12 h-12 lg:w-16 lg:h-16 rounded-full object-cover border-2 lg:border-4 border-dc-orange shadow-lg" alt="Logo" />}
                        <div>
                            <h1 className="text-xl lg:text-3xl font-bold tracking-tight">{companyInfo.name || "DC QUOTE"}</h1>
                            <p className="text-xs lg:text-base text-dc-gray font-medium">Service Request</p>
                        </div>
                    </div>
                    <div className="flex gap-2 lg:gap-4">
                        <button onClick={toggleTheme} className="p-2 lg:p-3 rounded-full hover:bg-gray-500/10 transition">
                            {theme === 'dark' ? <Icons.Sun className="w-5 h-5 lg:w-6 lg:h-6" /> : <Icons.Moon className="w-5 h-5 lg:w-6 lg:h-6" />}
                        </button>
                        <button onClick={onExit} className="text-sm lg:text-base font-bold text-dc-gray hover:text-dc-orange transition flex items-center gap-1">
                             <Icons.User className="w-5 h-5 lg:w-6 lg:h-6" />
                        </button>
                    </div>
                </div>
                
                {/* Step 1 */}
                {step === 1 && (
                    <div className="flex-1 animate-fade-in">
                        <h2 className="text-2xl lg:text-3xl font-bold mb-8 flex items-center justify-center gap-3">
                            <span className="bg-dc-orange text-white w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-base lg:text-lg shadow-lg shadow-dc-orange/30">1</span> 
                            選擇您感興趣的服務
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-32 relative z-20">
                            {activeTemplates.map((t, idx) => { 
                                const uniqueKey = t.id || t.name || idx;
                                const isSelected = selectedTemplateIds.includes(uniqueKey); 
                                return (
                                    <div 
                                        key={uniqueKey} 
                                        onClick={() => toggleTemplate(uniqueKey)} 
                                        className={`cursor-pointer p-6 lg:p-8 rounded-3xl lg:rounded-4xl border-4 transition-all duration-300 relative overflow-hidden group backdrop-blur-sm 
                                            ${isSelected 
                                                ? 'border-dc-orange bg-dc-orange/10 scale-[1.02] shadow-xl' 
                                                : `${theme==='dark'?'border-white/10 hover:border-white/30 bg-dc-panel/60':'border-gray-300 hover:border-gray-400 bg-white/80 shadow-sm'}`
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className={`text-xl lg:text-2xl font-bold ${isSelected ? 'text-dc-orange' : (theme==='dark' ? 'text-white' : 'text-gray-900')}`}>{t.name}</h3>
                                            {isSelected && <div className="bg-dc-orange text-white p-1.5 rounded-full shadow-lg"><Icons.Check className="w-4 h-4" /></div>}
                                        </div>
                                        <p className={`mb-4 text-base lg:text-lg ${theme==='dark' ? 'text-dc-gray' : 'text-gray-600'}`}>{t.description}</p>
                                        <div className="space-y-2">
                                            {t.items.map((item, i) => (
                                                <div key={i} className={`flex justify-between text-xs lg:text-sm font-mono border-b border-dashed pb-2 ${theme==='dark' ? 'text-dc-gray border-gray-500/20' : 'text-gray-500 border-gray-300'}`}>
                                                    <span>{item.description}</span>
                                                    <span className={isSelected?'text-dc-orange font-bold':''}>${Number(item.priceMin).toLocaleString()} ~</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ); 
                            })}
                        </div>
                        <div className="fixed bottom-0 left-0 w-full px-6 py-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none z-50 flex justify-center">
                            <button 
                                onClick={() => { if(selectedTemplateIds.length === 0) return toast.show("請至少選擇一項", "error"); setStep(2); }} 
                                className="pointer-events-auto bg-dc-orange text-white px-12 lg:px-16 py-4 lg:py-5 rounded-full font-bold text-lg lg:text-xl hover:scale-105 transition-all shadow-2xl shadow-dc-orange/40 flex items-center gap-3 mx-auto active:scale-95"
                            >
                                下一步 <Icons.ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                    <div className="flex-1 max-w-3xl mx-auto w-full animate-fade-in">
                        <button onClick={() => setStep(1)} className="mb-6 text-dc-gray hover:text-dc-orange flex items-center gap-2 text-base font-bold transition"><Icons.ArrowLeft className="w-5 h-5"/> 返回選擇</button>
                        <div className={`p-6 lg:p-10 rounded-3xl lg:rounded-4xl border backdrop-blur-md ${panelClass}`}>
                            <h2 className="text-xl lg:text-2xl font-bold mb-8 flex items-center justify-center gap-3">
                                <span className="bg-dc-orange text-white w-8 h-8 rounded-full flex items-center justify-center text-base shadow-lg">2</span> 填寫聯絡資訊
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-dc-gray">稱呼 / 公司名稱</label>
                                    <input value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} className={`w-full p-4 rounded-xl border outline-none text-base transition-all ${inputClass} ${errors.name ? 'border-red-500' : ''}`} placeholder="請輸入您的稱呼" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-dc-gray">聯絡電話</label>
                                        <input value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} className={`w-full p-4 rounded-xl border outline-none text-base transition-all ${inputClass} ${errors.phone ? 'border-red-500' : ''}`} placeholder="0912-345-678" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-dc-gray">電子信箱</label>
                                        <input value={clientData.email} onChange={e => setClientData({...clientData, email: e.target.value})} className={`w-full p-4 rounded-xl border outline-none text-base transition-all ${inputClass} ${errors.email ? 'border-red-500' : ''}`} placeholder="name@company.com" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-dc-gray">專案備註 (選填)</label>
                                    <textarea value={clientData.note} onChange={e => setClientData({...clientData, note: e.target.value})} className={`w-full p-4 rounded-xl border outline-none min-h-[140px] text-base transition-all ${inputClass}`} placeholder="請簡述您的需求..." />
                                </div>
                            </div>
                            <div className="mt-8 pt-8 border-t border-gray-500/20 flex justify-center">
                                <button 
                                    onClick={handleSubmit} 
                                    disabled={isSubmitting} 
                                    className="bg-dc-orange text-white px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 disabled:scale-100 w-full md:w-auto justify-center"
                                >
                                    {isSubmitting ? '處理中...' : '送出需求'} <Icons.Check className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Step 3: 成功畫面 */}
                {step === 3 && successData && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
                        <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-dc-orange/10 flex items-center justify-center mb-6 lg:mb-8 border-4 border-dc-orange shadow-2xl shadow-dc-orange/40 animate-bounce-slight">
                            <Icons.Check className="w-12 h-12 lg:w-16 lg:h-16 text-dc-orange" />
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-bold mb-4">需求單已成功送出</h2>
                        <p className="text-dc-gray mb-12 max-w-md text-base lg:text-lg leading-relaxed">感謝您的詢問！我們已收到您的資料。<br/>您可以下載初步報價單留存。</p>
                        
                        <button 
                            onClick={handleDownloadPDF} 
                            className="bg-dc-orange text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-all flex items-center gap-3 shadow-xl mb-6 active:scale-95"
                        >
                            <Icons.Download className="w-5 h-5" /> 下載初步報價單 PDF
                        </button>

                        <button onClick={() => { setStep(1); setSelectedTemplateIds([]); setClientData({name:'',phone:'',email:'',note:''}); }} className="text-dc-gray hover:text-dc-orange text-base font-bold mt-4 underline decoration-2 underline-offset-4">
                            發起新的詢價
                        </button>
                        
                        {/* 隱藏的 PDF 內容，用於生成截圖 */}
                        <div ref={pdfRef} style={{ display: 'none', width: '210mm' }}>
                            <PDFContent data={successData} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}