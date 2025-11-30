import React, { useState, useEffect, useRef } from 'react';
import { addDoc, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Icons } from '../assets/Icons';
import { useToast } from '../components/Toast';
import PDFContent from '../components/PDFContent';

export default function QuoteBuilder({ templates, companyInfo, theme, db, appId, userId }) {
    const toast = useToast();
    
    const [clients, setClients] = useState([]);
    const [showClientManager, setShowClientManager] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    
    const [quoteData, setQuoteData] = useState({ 
        clientName: "", clientPhone: "", clientEmail: "", 
        quoteNo: `Q${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(Math.floor(Math.random()*100)).padStart(2,'0')}`, 
        quoteDate: new Date().toISOString().split('T')[0], 
        items: [], 
        note: "",
        title: "QUOTATION", 
        taxRate: 0.05,
        discount: 0,
        versionNote: "" 
    });
    const [showPreview, setShowPreview] = useState(false);
    const pdfRef = useRef(); // 用於參照隱藏的 PDF 內容
    const dragItem = useRef();
    const dragOverItem = useRef();

    window.loadQuoteIntoBuilder = (inq) => setQuoteData({ 
        ...quoteData, 
        clientName: inq.clientName, 
        clientPhone: inq.clientPhone || "", 
        clientEmail: inq.clientEmail || "", 
        items: inq.items || [], 
        note: inq.note || "",
        versionNote: inq.versionNote || "" 
    });

    useEffect(() => {
        if (!db || !userId) return;
        const unsubscribe = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'clients'), (snapshot) => {
            const clientList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setClients(clientList);
        });
        return () => unsubscribe();
    }, [db, appId, userId]);

    useEffect(() => { 
        if (!quoteData.note && companyInfo.bankInfo) setQuoteData(prev => ({ ...prev, note: companyInfo.bankInfo })); 
    }, [companyInfo.bankInfo]);

    const handleSelectClient = (e) => {
        const clientId = e.target.value;
        if (!clientId) return;
        const selectedClient = clients.find(c => c.id === clientId);
        if (selectedClient) {
            setQuoteData(prev => ({
                ...prev,
                clientName: selectedClient.name,
                clientPhone: selectedClient.phone,
                clientEmail: selectedClient.email
            }));
            toast.show("已帶入客戶資料", "success");
        }
    };

    const saveClientToBank = async () => {
        if (!quoteData.clientName) return toast.show("請輸入客戶名稱", "error");
        try {
            const clientRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'clients'));
            await setDoc(clientRef, {
                name: quoteData.clientName,
                phone: quoteData.clientPhone,
                email: quoteData.clientEmail,
                updatedAt: new Date()
            });
            toast.show("客戶已存入常用列表！", "success");
        } catch (e) {
            console.error(e);
            toast.show("儲存客戶失敗", "error");
        }
    };

    const handleDeleteClient = async (id) => {
        if (!confirm("確定要刪除此常用客戶嗎？")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'clients', id));
            toast.show("客戶已刪除", "success");
        } catch (e) {
            toast.show("刪除失敗", "error");
        }
    };

    const handleUpdateClient = async (id, newData) => {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'clients', id), newData);
            setEditingClient(null);
            toast.show("客戶資料已更新", "success");
        } catch (e) {
            toast.show("更新失敗", "error");
        }
    };

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

    const handleDragStart = (e, position) => { dragItem.current = position; };
    const handleDragEnter = (e, position) => { dragOverItem.current = position; };
    const handleDragEnd = (e) => {
        const copyListItems = [...quoteData.items];
        const dragItemContent = copyListItems[dragItem.current];
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(dragOverItem.current, 0, dragItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setQuoteData({ ...quoteData, items: copyListItems });
    };
    
    const updateItem = (id, f, v) => setQuoteData({ ...quoteData, items: quoteData.items.map(i => i.id === id ? { ...i, [f]: v } : i) });
    const delItem = (id) => setQuoteData({ ...quoteData, items: quoteData.items.filter(i => i.id !== id) });
    const appendTerm = (term) => setQuoteData({...quoteData, note: (quoteData.note ? quoteData.note + "\n\n" : "") + term});
    
    const copyPublicLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?uid=${userId}`;
        navigator.clipboard.writeText(url).then(() => toast.show("連結已複製！", "success")).catch(() => prompt("請複製網址:", url));
    };

    const subtotal = quoteData.items.reduce((s, i) => i.type === 'text' ? s : s + (i.quantity * i.unitPrice), 0);
    const taxable = subtotal - quoteData.discount;
    const tax = Math.round(taxable * quoteData.taxRate);
    const total = taxable + tax;

    const saveQuote = async () => {
        if(quoteData.items.length === 0) return toast.show("請至少新增一個項目", "error");
        try {
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'quotations'), { ...quoteData, totalAmount: total, timestamp: new Date() });
            toast.show("報價單已儲存！", "success");
        } catch (e) { toast.show("儲存失敗", "error"); }
    };

    // [修復] 使用 position: fixed 移出畫面外，而非 display: none
    const handleDownloadPDF = async () => {
        const element = pdfRef.current;
        if (!element) return toast.show("PDF 渲染錯誤", "error");
        
        toast.show("正在生成 PDF...", "info");
        
        // 稍微延遲一下，確保 DOM 狀態
        setTimeout(() => {
            html2canvas(element, { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Quote_${quoteData.quoteNo}.pdf`);
                toast.show("下載完成！", "success");
            }).catch(err => {
                console.error(err);
                toast.show("PDF 生成失敗", "error");
            });
        }, 100);
    };

    const panelClass = theme === 'dark' ? 'bg-dc-panel border-white/10' : 'bg-white border-gray-200 shadow-sm';
    const inputClass = theme === 'dark' ? 'bg-dc-dark border-white/10 text-white focus:border-dc-orange' : 'bg-gray-50 border-gray-300 text-black focus:border-dc-orange';

    if (showPreview) {
        return (
            <div className="max-w-4xl mx-auto animate-fade-in pb-20">
                <div className="mb-6 flex justify-between items-center print:hidden sticky top-0 z-50 bg-opacity-80 backdrop-blur-md p-4 rounded-2xl">
                    <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-current flex items-center gap-2 font-bold text-lg"><Icons.ChevronRight className="w-5 h-5 rotate-180" /> 返回編輯</button>
                    <button onClick={handleDownloadPDF} className="bg-dc-orange text-white px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition flex items-center gap-2 font-bold"><Icons.Download className="w-5 h-5" /> 下載 PDF</button>
                </div>
                
                {/* 預覽區塊 */}
                <div className="shadow-2xl overflow-hidden rounded-lg">
                    <PDFContent data={{...quoteData, companyInfo}} />
                </div>

                {/* [關鍵] 修復：保持 render 但移出畫面 */}
                <div ref={pdfRef} style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm', backgroundColor: 'white', zIndex: -1 }}>
                    <PDFContent id="pdf-hidden-source" data={{...quoteData, companyInfo}} />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 lg:pb-12">
            <div className="lg:col-span-2 space-y-6">
                <div className={`p-6 lg:p-8 rounded-3xl border ${panelClass}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h2 className={`text-xl font-bold flex items-center gap-3 ${theme==='dark'?'text-white':'text-gray-800'}`}><span className="bg-dc-orange w-2 h-6 rounded-full"></span> 1. 基本資訊</h2>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                             <select onChange={handleSelectClient} className={`flex-1 p-2 text-sm rounded-xl border outline-none ${inputClass} max-w-[150px]`}>
                                <option value="">選擇常用客戶...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                             <button onClick={() => setShowClientManager(true)} className="p-2 rounded-xl bg-gray-500/10 hover:bg-dc-orange hover:text-white transition text-dc-gray" title="管理客戶"><Icons.Settings className="w-4 h-4" /></button>
                             <button onClick={saveClientToBank} className="p-2 rounded-xl bg-gray-500/10 hover:bg-dc-orange hover:text-white transition text-dc-gray" title="存入常用"><Icons.Save className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <input value={quoteData.clientName} onChange={e => setQuoteData({...quoteData, clientName: e.target.value})} className={`w-full p-3 rounded-xl border text-base ${inputClass}`} placeholder="客戶名稱" />
                        <input value={quoteData.quoteNo} onChange={e => setQuoteData({...quoteData, quoteNo: e.target.value})} className={`w-full p-3 rounded-xl border text-base ${inputClass}`} placeholder="單號" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <input value={quoteData.clientPhone} onChange={e => setQuoteData({...quoteData, clientPhone: e.target.value})} className={`w-full p-3 rounded-xl border text-base ${inputClass}`} placeholder="電話" />
                        <input value={quoteData.clientEmail} onChange={e => setQuoteData({...quoteData, clientEmail: e.target.value})} className={`w-full p-3 rounded-xl border text-base ${inputClass}`} placeholder="Email" />
                    </div>
                    <div className="pt-4 border-t border-gray-500/10 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <input value={quoteData.versionNote} onChange={e=>setQuoteData({...quoteData, versionNote: e.target.value})} className={`w-full p-2 text-sm rounded-lg border text-center ${inputClass}`} placeholder="版本註記 (V2)" />
                        <input value={quoteData.title} onChange={e=>setQuoteData({...quoteData, title: e.target.value})} className={`w-full p-2 text-sm rounded-lg border text-center ${inputClass}`} placeholder="文件標題" />
                        <input type="number" step="0.01" value={quoteData.taxRate} onChange={e=>setQuoteData({...quoteData, taxRate: parseFloat(e.target.value)})} className={`w-full p-2 text-sm rounded-lg border text-center ${inputClass}`} placeholder="稅率 (0.05)" />
                    </div>
                </div>

                <div className={`p-6 lg:p-8 rounded-3xl border ${panelClass}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={`text-xl font-bold flex items-center gap-3 ${theme==='dark'?'text-white':'text-gray-800'}`}><span className="bg-dc-orange w-2 h-6 rounded-full"></span> 2. 項目明細</h2>
                        <div className="flex gap-2">
                            <button onClick={addTextRow} className="text-xs bg-gray-500/10 text-gray-500 px-3 py-2 rounded-xl font-bold hover:bg-gray-500 hover:text-white transition">+ 文字</button>
                            <button onClick={addManual} className="text-xs bg-dc-orange/10 text-dc-orange px-3 py-2 rounded-xl font-bold hover:bg-dc-orange hover:text-white transition">+ 自訂</button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {quoteData.items.map((i, index) => (
                            <div 
                                key={i.id} 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`flex gap-2 items-start p-3 rounded-xl border transition-all cursor-move ${i.type==='text' ? 'border-dashed items-center' : ''} ${theme==='dark'?'bg-black/20 border-white/5':'bg-gray-50 border-gray-200'}`}
                            >
                                <div className="mt-2 cursor-move text-gray-400 hover:text-dc-orange flex-shrink-0"><Icons.Drag className="w-4 h-4" /></div>
                                {i.type === 'text' ? (
                                    <input value={i.description} onChange={e=>updateItem(i.id,'description',e.target.value)} className={`flex-1 bg-transparent text-center font-bold outline-none text-sm ${theme==='dark'?'text-gray-300':'text-gray-600'}`} placeholder="--- 分隔線或備註 ---" />
                                ) : (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <input value={i.description} onChange={e=>updateItem(i.id,'description',e.target.value)} className={`w-full bg-transparent border-b border-gray-500/20 pb-1 mb-1 focus:border-dc-orange outline-none text-base ${theme==='dark'?'text-white':'text-black'}`} placeholder="項目名稱" />
                                            <div className="flex gap-2">
                                                <input value={i.unit} onChange={e=>updateItem(i.id,'unit',e.target.value)} className={`w-14 bg-transparent text-xs text-center border-b border-gray-500/20 outline-none ${theme==='dark'?'text-gray-400':'text-gray-500'}`} placeholder="單位" />
                                                <input type="number" value={i.quantity} onChange={e=>updateItem(i.id,'quantity',Number(e.target.value))} className={`w-16 bg-transparent text-xs text-right border-b border-gray-500/20 outline-none ${theme==='dark'?'text-gray-400':'text-gray-500'}`} placeholder="數量" />
                                                <input type="number" value={i.unitPrice} onChange={e=>updateItem(i.id,'unitPrice',Number(e.target.value))} className={`flex-1 bg-transparent text-sm text-right border-b border-gray-500/20 outline-none font-mono ${theme==='dark'?'text-white':'text-black'}`} placeholder="單價" />
                                            </div>
                                        </div>
                                    </>
                                )}
                                <button onClick={()=>delItem(i.id)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"><Icons.Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className={`p-6 rounded-3xl border ${panelClass}`}>
                    <h3 className="font-bold text-dc-gray mb-4 text-sm uppercase tracking-wider">快速代入模組</h3>
                    <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {templates.map(t => (
                            <button key={t.id} onClick={()=>addItem(t.id)} className={`text-left p-3 border rounded-xl transition-all text-sm font-bold flex justify-between items-center group ${theme==='dark'?'border-white/10 bg-white/5 hover:bg-dc-orange/10 hover:border-dc-orange text-gray-300 hover:text-white':'border-gray-200 bg-gray-50 hover:bg-orange-50 hover:border-dc-orange text-gray-700 hover:text-black'}`}>
                                {t.name} <span className="text-dc-orange opacity-0 group-hover:opacity-100 transition-all">+</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`p-6 rounded-3xl border border-t-4 border-t-dc-orange ${panelClass} sticky top-24`}>
                    <div className="space-y-3 font-mono text-sm mb-6">
                        <div className="flex justify-between text-dc-gray"><span>未稅金額</span><span className="text-right-force">${subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between text-dc-gray items-center">
                            <span>折扣/調整</span>
                            <input type="number" value={quoteData.discount} onChange={e=>setQuoteData({...quoteData, discount: Number(e.target.value)})} className={`w-20 p-1 text-right border-b bg-transparent outline-none text-red-500 ${theme==='dark'?'border-white/20':'border-gray-300'}`} placeholder="0" />
                        </div>
                        <div className="flex justify-between text-dc-gray"><span>稅金 ({(quoteData.taxRate*100)}%)</span><span className="text-right-force">${tax.toLocaleString()}</span></div>
                        <div className={`flex justify-between text-3xl font-bold pt-3 border-t border-gray-500/20 ${theme==='dark'?'text-white':'text-gray-900'}`}><span>總計</span><span className="text-dc-orange text-right-force">${total.toLocaleString()}</span></div>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-dc-gray">備註條款</span>
                            <div className="flex gap-1">
                                <button onClick={()=>appendTerm("本報價單有效期限為 15 天。")} className="text-[10px] bg-gray-500/10 px-2 py-1 rounded hover:bg-dc-orange hover:text-white">一般</button>
                                <button onClick={()=>appendTerm("急件需加收 20% 費用。")} className="text-[10px] bg-gray-500/10 px-2 py-1 rounded hover:bg-dc-orange hover:text-white">急件</button>
                            </div>
                        </div>
                        <textarea value={quoteData.note} onChange={e => setQuoteData({...quoteData, note: e.target.value})} className={`w-full p-3 rounded-xl border min-h-[100px] text-sm ${inputClass}`} />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <button onClick={saveQuote} disabled={quoteData.items.length===0} className={`flex-1 py-3 rounded-xl font-bold text-sm transition shadow-lg flex justify-center gap-2 ${theme==='dark'?'bg-white/10 hover:bg-white/20 text-white':'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                                <Icons.Save className="w-4 h-4"/> 儲存
                            </button>
                            <button onClick={()=>setShowPreview(true)} disabled={quoteData.items.length===0} className="flex-1 bg-dc-orange text-white py-3 rounded-xl font-bold text-sm hover:scale-105 transition shadow-xl disabled:opacity-50 flex justify-center gap-2">
                                <Icons.FileText className="w-4 h-4"/> 預覽
                            </button>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-500/20 flex items-center justify-between">
                            <span className="text-xs text-dc-gray font-bold">前台連結</span>
                            <button onClick={copyPublicLink} className="text-xs text-dc-orange font-bold hover:underline">複製連結</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Client Manager Modal */}
            {showClientManager && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${panelClass}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-xl font-bold ${theme==='dark'?'text-white':'text-gray-900'}`}>常用客戶管理</h3>
                            <button onClick={() => { setShowClientManager(false); setEditingClient(null); }} className="p-2 rounded-full hover:bg-gray-500/10"><Icons.X className="w-5 h-5 text-dc-gray" /></button>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            {clients.length === 0 && <p className="text-center text-dc-gray py-8">暫無儲存的客戶</p>}
                            {clients.map(c => (
                                <div key={c.id} className={`p-4 rounded-2xl border flex flex-col gap-2 ${theme==='dark'?'bg-black/20 border-white/10':'bg-gray-50 border-gray-200'}`}>
                                    {editingClient?.id === c.id ? (
                                        <div className="space-y-2">
                                            <input value={editingClient.name} onChange={e=>setEditingClient({...editingClient, name:e.target.value})} className={`w-full p-2 text-sm rounded-lg border ${inputClass}`} placeholder="名稱" />
                                            <input value={editingClient.phone} onChange={e=>setEditingClient({...editingClient, phone:e.target.value})} className={`w-full p-2 text-sm rounded-lg border ${inputClass}`} placeholder="電話" />
                                            <input value={editingClient.email} onChange={e=>setEditingClient({...editingClient, email:e.target.value})} className={`w-full p-2 text-sm rounded-lg border ${inputClass}`} placeholder="Email" />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={()=>setEditingClient(null)} className="px-3 py-1 text-xs rounded-lg bg-gray-500/20 text-dc-gray">取消</button>
                                                <button onClick={()=>handleUpdateClient(c.id, editingClient)} className="px-3 py-1 text-xs rounded-lg bg-dc-orange text-white">儲存</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className={`font-bold ${theme==='dark'?'text-white':'text-gray-900'}`}>{c.name}</h4>
                                                    <p className="text-xs text-dc-gray">{c.phone} | {c.email}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={()=>setEditingClient(c)} className="p-2 hover:text-dc-orange text-dc-gray"><Icons.Edit className="w-4 h-4" /></button>
                                                    <button onClick={()=>handleDeleteClient(c.id)} className="p-2 hover:text-red-500 text-dc-gray"><Icons.Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}