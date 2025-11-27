import React, { useState, useEffect, useRef } from 'react';
import { addDoc, collection } from "firebase/firestore";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Icons } from '../assets/Icons';
import { useToast } from '../components/Toast';
import PDFContent from '../components/PDFContent';

export default function QuoteBuilder({ templates, companyInfo, theme, db, appId, userId }) {
    const toast = useToast();
    const [quoteData, setQuoteData] = useState({ 
        clientName: "", clientPhone: "", clientEmail: "", 
        quoteNo: `Q${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(Math.floor(Math.random()*100)).padStart(2,'0')}`, 
        quoteDate: new Date().toISOString().split('T')[0], 
        items: [], 
        note: "",
        title: "QUOTATION", 
        taxRate: 0.05,
        discount: 0
    });
    const [showPreview, setShowPreview] = useState(false);
    const [copied, setCopied] = useState(false);
    const dragItem = useRef();
    const dragOverItem = useRef();

    // Hook for loading existing quote
    window.loadQuoteIntoBuilder = (inq) => setQuoteData({ 
        ...quoteData, 
        clientName: inq.clientName, 
        clientPhone: inq.clientPhone, 
        clientEmail: inq.clientEmail, 
        items: inq.items, 
        note: inq.note || "" 
    });

    useEffect(() => { 
        if (!quoteData.note && companyInfo.bankInfo) setQuoteData(prev => ({ ...prev, note: companyInfo.bankInfo })); 
    }, [companyInfo.bankInfo]);

    const addItem = (tId) => { 
        const t = templates.find(temp => temp.id === tId); 
        if(!t) return; 
        const newItems = t.items.map(i => ({ 
            id: Math.random(), 
            description: i.description, 
            unit: i.unit, 
            quantity: 1, 
            unitPrice: Math.floor((Number(i.priceMin)+Number(i.priceMax))/2), 
            isManual: false,
            type: 'service'
        })); 
        setQuoteData({ ...quoteData, items: [...quoteData.items, ...newItems] }); 
    };

    const addManual = () => setQuoteData({ 
        ...quoteData, 
        items: [...quoteData.items, { id: Math.random(), description: "自訂項目", unit: "式", quantity: 1, unitPrice: 0, isManual: true, type: 'service' }] 
    });

    const addTextRow = () => setQuoteData({
        ...quoteData,
        items: [...quoteData.items, { id: Math.random(), description: "--- 分隔線 / 備註 ---", type: 'text' }]
    });

    const handleDragStart = (e, position) => {
        dragItem.current = position;
    };

    const handleDragEnter = (e, position) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = (e) => {
        const copyListItems = [...quoteData.items];
        const dragItemContent = copyListItems[dragItem.current];
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(dragOverItem.current, 0, dragItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setQuoteData({ ...quoteData, items: copyListItems });
    };
    
    const updateItem = (id, f, v) => setQuoteData({ 
        ...quoteData, 
        items: quoteData.items.map(i => i.id === id ? { ...i, [f]: v } : i) 
    });

    const delItem = (id) => setQuoteData({ 
        ...quoteData, 
        items: quoteData.items.filter(i => i.id !== id) 
    });

    const appendTerm = (term) => setQuoteData({...quoteData, note: (quoteData.note ? quoteData.note + "\n\n" : "") + term});
    
    const copyPublicLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?uid=${userId}`;
        const fallbackCopyTextToClipboard = (text) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                toast.show("連結已複製！", "success");
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                prompt("請手動複製網址:", text);
            }
            document.body.removeChild(textArea);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                toast.show("連結已複製！", "success");
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => fallbackCopyTextToClipboard(url));
        } else {
            fallbackCopyTextToClipboard(url);
        }
    };

    const subtotal = quoteData.items.reduce((s, i) => i.type === 'text' ? s : s + (i.quantity * i.unitPrice), 0);
    const taxable = subtotal - quoteData.discount;
    const tax = Math.round(taxable * quoteData.taxRate);
    const total = taxable + tax;

    const panelClass = theme === 'dark' ? 'bg-dc-panel border-white/10' : 'bg-white border-gray-200 shadow-sm';
    const inputClass = theme === 'dark' ? 'bg-dc-dark border-white/10 text-white focus:border-dc-orange' : 'bg-gray-50 border-gray-300 text-black focus:border-dc-orange';
    
    const saveQuote = async () => {
        if(quoteData.items.length === 0) return toast.show("請至少新增一個項目", "error");
        try {
            const quoteToSave = { ...quoteData, totalAmount: total, timestamp: new Date() };
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'quotations'), quoteToSave);
            toast.show("報價單已儲存！", "success");
        } catch (e) { toast.show("儲存失敗", "error"); }
    };

    if (showPreview) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex justify-between items-center print:hidden">
                    <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-current flex items-center gap-2 font-bold text-lg"><Icons.ChevronRight className="w-5 h-5 rotate-180" /> 返回編輯</button>
                    <button onClick={() => { 
                        const { jsPDF } = window.jspdf; 
                        const el = document.getElementById('pdf-content'); 
                        html2canvas(el, { scale: 2 }).then(c => { 
                            const img = c.toDataURL('image/png'); 
                            const pdf = new jsPDF('p', 'mm', 'a4'); 
                            const w = pdf.internal.pageSize.getWidth(); 
                            const h = (c.height * w) / c.width; 
                            pdf.addImage(img, 'PNG', 0, 0, w, h); 
                            pdf.save(`Quote_${quoteData.quoteNo}.pdf`); 
                        }); 
                    }} className="bg-dc-orange text-white px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition flex items-center gap-2 font-bold"><Icons.Download className="w-5 h-5" /> 下載 PDF</button>
                </div>
                <PDFContent id="pdf-content" data={{...quoteData, companyInfo}} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className={`p-8 rounded-4xl border ${panelClass}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={`text-xl font-bold flex items-center gap-3 ${theme==='dark'?'text-white':'text-gray-800'}`}><span className="bg-dc-orange w-2 h-8 rounded-full"></span> 1. 基本資訊</h2>
                        <div className="flex gap-2">
                            <input value={quoteData.title} onChange={e=>setQuoteData({...quoteData, title: e.target.value})} className={`w-32 p-2 text-sm rounded-xl border text-center ${inputClass}`} placeholder="標題" />
                            <input type="number" step="0.01" value={quoteData.taxRate} onChange={e=>setQuoteData({...quoteData, taxRate: parseFloat(e.target.value)})} className={`w-20 p-2 text-sm rounded-xl border text-center ${inputClass}`} placeholder="稅率" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <input value={quoteData.clientName} onChange={e => setQuoteData({...quoteData, clientName: e.target.value})} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="客戶名稱" />
                        <input value={quoteData.quoteNo} onChange={e => setQuoteData({...quoteData, quoteNo: e.target.value})} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="單號" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <input value={quoteData.clientPhone} onChange={e => setQuoteData({...quoteData, clientPhone: e.target.value})} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="電話" />
                        <input value={quoteData.clientEmail} onChange={e => setQuoteData({...quoteData, clientEmail: e.target.value})} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="Email" />
                    </div>
                </div>

                <div className={`p-8 rounded-4xl border ${panelClass}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={`text-xl font-bold flex items-center gap-3 ${theme==='dark'?'text-white':'text-gray-800'}`}><span className="bg-dc-orange w-2 h-8 rounded-full"></span> 2. 項目明細</h2>
                        <div className="flex gap-2">
                            <button onClick={addTextRow} className="text-sm bg-gray-500/10 text-gray-500 px-3 py-2 rounded-xl font-bold hover:bg-gray-500 hover:text-white transition">+ 純文字/分隔</button>
                            <button onClick={addManual} className="text-sm bg-dc-orange/10 text-dc-orange px-4 py-2 rounded-xl font-bold hover:bg-dc-orange hover:text-white transition">+ 自訂項目</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {quoteData.items.map((i, index) => {
                            if (i.type === 'text') {
                                return (
                                    <div 
                                        key={i.id} 
                                        draggable 
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragEnter={(e) => handleDragEnter(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`flex gap-3 items-center p-3 rounded-2xl border border-dashed cursor-move ${theme==='dark'?'border-white/20 bg-white/5':'border-gray-300 bg-gray-50'}`}
                                    >
                                        <Icons.Drag className="w-5 h-5 text-gray-400 mr-2 cursor-move flex-shrink-0" />
                                        <input value={i.description} onChange={e=>updateItem(i.id,'description',e.target.value)} className={`flex-1 bg-transparent text-center font-bold outline-none ${theme==='dark'?'text-gray-300':'text-gray-600'}`} placeholder="--- 分隔線或備註 ---" />
                                        <button onClick={()=>delItem(i.id)} className="text-gray-400 hover:text-red-500"><Icons.Trash2 className="w-5 h-5"/></button>
                                    </div>
                                );
                            }
                            return (
                                <div 
                                    key={i.id} 
                                    draggable 
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex gap-3 items-start p-4 rounded-2xl border transition-all cursor-move ${i.isManual ? 'border-l-4 border-l-dc-orange bg-dc-orange/5' : theme==='dark'?'bg-black/20 border-white/5':'bg-gray-50 border-gray-200'}`}
                                >
                                    <div className="mt-3 cursor-move text-gray-400 hover:text-dc-orange"><Icons.Drag className="w-5 h-5" /></div>
                                    <input value={i.description} onChange={e=>updateItem(i.id,'description',e.target.value)} className={`flex-1 bg-transparent border-b border-gray-500/20 text-lg pb-2 focus:border-dc-orange outline-none ${theme==='dark'?'text-white':'text-black'}`} />
                                    <input value={i.unit} onChange={e=>updateItem(i.id,'unit',e.target.value)} className={`w-20 bg-transparent border-b border-gray-500/20 text-lg pb-2 text-center focus:border-dc-orange outline-none ${theme==='dark'?'text-white':'text-black'}`} />
                                    <input type="number" value={i.quantity} onChange={e=>updateItem(i.id,'quantity',Number(e.target.value))} className={`w-20 bg-transparent border-b border-gray-500/20 text-lg pb-2 text-right-force focus:border-dc-orange outline-none ${theme==='dark'?'text-white':'text-black'}`} />
                                    <input type="number" value={i.unitPrice} onChange={e=>updateItem(i.id,'unitPrice',Number(e.target.value))} className={`w-28 bg-transparent border-b border-gray-500/20 text-lg pb-2 text-right-force focus:border-dc-orange outline-none font-mono ${theme==='dark'?'text-white':'text-black'}`} />
                                    <button onClick={()=>delItem(i.id)} className="text-gray-400 hover:text-red-500 pt-2 pl-2"><Icons.Trash2 className="w-6 h-6"/></button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={`p-8 rounded-4xl border ${panelClass}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className={`text-xl font-bold ${theme==='dark'?'text-white':'text-gray-800'}`}>3. 備註與條款</h2>
                        <div className="flex gap-2">
                            <button onClick={()=>appendTerm("本報價單有效期限為 15 天。")} className="text-xs bg-gray-500/10 px-2 py-1 rounded hover:bg-dc-orange hover:text-white">一般</button>
                            <button onClick={()=>appendTerm("急件需加收 20% 費用。")} className="text-xs bg-gray-500/10 px-2 py-1 rounded hover:bg-dc-orange hover:text-white">急件</button>
                            <button onClick={()=>appendTerm("雙方同意對本專案內容保密。")} className="text-xs bg-gray-500/10 px-2 py-1 rounded hover:bg-dc-orange hover:text-white">保密</button>
                        </div>
                    </div>
                    <textarea value={quoteData.note} onChange={e => setQuoteData({...quoteData, note: e.target.value})} className={`w-full p-4 rounded-2xl border min-h-[120px] text-lg ${inputClass}`} />
                </div>
            </div>

            <div className="space-y-8">
                <div className={`p-8 rounded-4xl border ${panelClass}`}>
                    <h3 className="font-bold text-dc-gray mb-6 text-base uppercase tracking-wider">快速代入模組</h3>
                    <div className="grid gap-3 max-h-[400px] overflow-auto pr-1">
                        {templates.map(t => (
                            <button key={t.id} onClick={()=>addItem(t.id)} className={`text-left p-4 border rounded-2xl transition-all text-base font-bold flex justify-between items-center group ${theme==='dark'?'border-white/10 bg-white/5 hover:bg-dc-orange/10 hover:border-dc-orange text-gray-300 hover:text-white':'border-gray-200 bg-gray-50 hover:bg-orange-50 hover:border-dc-orange text-gray-700 hover:text-black'}`}>
                                {t.name} <span className="text-dc-orange opacity-0 group-hover:opacity-100 transition-all text-xl">+</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className={`p-8 rounded-4xl border border-t-4 border-t-dc-orange ${panelClass}`}>
                    <div className="space-y-4 font-mono text-lg">
                        <div className="flex justify-between text-dc-gray"><span>未稅金額</span><span className="text-right-force">${subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between text-dc-gray items-center">
                            <span>折扣/調整</span>
                            <input type="number" value={quoteData.discount} onChange={e=>setQuoteData({...quoteData, discount: Number(e.target.value)})} className={`w-24 p-1 text-right border-b bg-transparent outline-none text-red-500 ${theme==='dark'?'border-white/20':'border-gray-300'}`} placeholder="0" />
                        </div>
                        <div className="flex justify-between text-dc-gray"><span>稅金 ({(quoteData.taxRate*100)}%)</span><span className="text-right-force">${tax.toLocaleString()}</span></div>
                        <div className={`flex justify-between text-4xl font-bold pt-4 border-t border-gray-500/20 ${theme==='dark'?'text-white':'text-gray-900'}`}><span>總計</span><span className="text-dc-orange text-right-force">${total.toLocaleString()}</span></div>
                    </div>
                    
                    <div className="mt-8 flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button onClick={saveQuote} disabled={quoteData.items.length===0} className={`flex-1 py-4 rounded-2xl font-bold text-lg transition shadow-lg flex justify-center gap-2 ${theme==='dark'?'bg-white/10 hover:bg-white/20 text-white':'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                                <Icons.Save className="w-6 h-6"/> 儲存草稿
                            </button>
                            <button onClick={()=>setShowPreview(true)} disabled={quoteData.items.length===0} className="flex-1 bg-dc-orange text-white py-4 rounded-2xl font-bold text-lg hover:scale-105 transition shadow-xl disabled:opacity-50 flex justify-center gap-2">
                                <Icons.FileText className="w-6 h-6"/> 預覽下載
                            </button>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-500/20">
                            <p className="text-xs font-bold mb-2 text-dc-gray uppercase tracking-wider">前台客戶填寫連結</p>
                            <div className="relative flex items-center">
                                <input 
                                    readOnly 
                                    value={`${window.location.origin}${window.location.pathname}?uid=${userId}`} 
                                    className={`w-full py-3 px-4 pr-20 rounded-xl border text-sm font-bold ${theme==='dark'?'bg-black/30 border-white/10 text-gray-400':'bg-gray-50 border-gray-300 text-gray-600'}`} 
                                />
                                <button 
                                    onClick={copyPublicLink} 
                                    className="absolute right-1 top-1 bottom-1 px-3 rounded-lg bg-dc-orange text-white text-xs font-bold hover:brightness-110 transition shadow-md"
                                >
                                    {copied ? "已複製" : "複製"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Company Settings ---
function CompanySettings({ initialData, onSave, onCancel, theme }) {
    const [formData, setFormData] = useState(initialData);
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleLogo = (e) => { const f = e.target.files[0]; if(f){ if(f.size>500*1024)return alert("太大"); const r = new FileReader(); r.onloadend=()=>setFormData({...formData,logo:r.result}); r.readAsDataURL(f); }};
    const panelClass = theme === 'dark' ? 'bg-dc-panel border-white/10' : 'bg-white border-gray-200 shadow-md';
    const inputClass = theme === 'dark' ? 'bg-dc-dark border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-black';

    return (
        <div className={`max-w-3xl mx-auto p-10 rounded-4xl border animate-fade-in ${panelClass}`}>
            <h2 className={`text-2xl font-bold mb-8 flex items-center gap-3 ${theme==='dark'?'text-white':'text-gray-800'}`}><Icons.Settings className="w-6 h-6 text-dc-orange"/> 公司設定</h2>
            <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center"><div className="w-36 h-36 mx-auto rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center overflow-hidden mb-4 relative group">{formData.logo ? <img src={formData.logo} className="w-full h-full object-cover"/> : <span className="text-gray-500 text-sm">Logo</span>}<input type="file" accept="image/*" onChange={handleLogo} className="absolute inset-0 opacity-0 cursor-pointer" /><div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-sm pointer-events-none font-bold">更換圖片</div></div></div>
                <div className="md:col-span-2 space-y-5"><input name="name" value={formData.name} onChange={handleChange} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="公司名稱" /><input name="website" value={formData.website} onChange={handleChange} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="網站" /><input name="description" value={formData.description} onChange={handleChange} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="簡介" /><div className="grid grid-cols-2 gap-5"><input name="taxId" value={formData.taxId} onChange={handleChange} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="統編" /><input name="phone" value={formData.phone} onChange={handleChange} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="電話" /></div><input name="address" value={formData.address} onChange={handleChange} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="地址" /><input name="email" value={formData.email} onChange={handleChange} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="Email" /><textarea name="bankInfo" value={formData.bankInfo} onChange={handleChange} rows="3" className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="匯款資訊與備註" /></div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-500/20"><h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme==='dark'?'text-white':'text-gray-800'}`}><Icons.Mail className="w-5 h-5 text-dc-orange"/> Email 通知設定 (EmailJS)</h3><div className="grid md:grid-cols-3 gap-4"><input name="emailjsServiceId" value={formData.emailjsServiceId || ''} onChange={handleChange} className={`w-full p-3 rounded-xl border text-sm ${inputClass}`} placeholder="Service ID" /><input name="emailjsTemplateId" value={formData.emailjsTemplateId || ''} onChange={handleChange} className={`w-full p-3 rounded-xl border text-sm ${inputClass}`} placeholder="Template ID" /><input name="emailjsPublicKey" value={formData.emailjsPublicKey || ''} onChange={handleChange} className={`w-full p-3 rounded-xl border text-sm ${inputClass}`} placeholder="Public Key" /></div><p className="text-xs text-gray-500 mt-2">請至 EmailJS 申請並填入金鑰，以啟用客戶送單時的自動寄信功能。</p></div>
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-500/20"><button onClick={onCancel} className="px-6 py-3 rounded-xl border text-gray-500 hover:bg-gray-100 font-bold">取消</button><button onClick={()=>onSave(formData)} className="px-6 py-3 bg-dc-orange text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition"><Icons.Save className="w-5 h-5"/> 儲存設定</button></div>
        </div>
    );
}