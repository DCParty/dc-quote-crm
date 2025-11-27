import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Icons } from '../assets/Icons';
import { exportToCSV } from '../lib/utils';

export default function InquiriesList({ db, appId, userId, theme, onLoadQuote }) {
    const [inquiries, setInquiries] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [viewMode, setViewMode] = useState('list'); 
    const [groupByClient, setGroupByClient] = useState(false);
    
    useEffect(() => {
        if(!db || !userId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'inquiries'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (s) => setInquiries(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [db, appId, userId]);

    const updateStatus = async (id, newStatus) => { await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'inquiries', id), { status: newStatus }); };
    const handleDelete = async (id) => { if(!confirm("確定要刪除此客戶需求嗎？")) return; await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'inquiries', id)); };
    const handleRate = async (id, score) => { await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'inquiries', id), { score }); };
    const startEdit = (inq) => { setEditingId(inq.id); setEditForm({ ...inq }); };
    const saveEdit = async () => { try { await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'inquiries', editingId), { clientName: editForm.clientName, clientPhone: editForm.clientPhone, clientEmail: editForm.clientEmail, note: editForm.note }); setEditingId(null); } catch (e) { alert("更新失敗"); } };
    
    const handleExport = () => {
        const dataToExport = inquiries.map(i => ({ "日期": i.date, "客戶名稱": i.clientName, "電話": i.clientPhone, "Email": i.clientEmail, "狀態": i.status, "備註": i.note, "需求項目": i.items ? i.items.map(it => it.description).join("; ") : "" }));
        exportToCSV(dataToExport, "客戶需求.csv");
    };

    const cardClass = theme === 'dark' ? 'bg-dc-panel border-white/5 hover:border-dc-orange/50' : 'bg-white border-gray-200 hover:border-dc-orange/50 shadow-sm';
    const inputClass = theme === 'dark' ? 'bg-dc-dark border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-black';
    const getStatusColor = (s) => { switch(s) { case 'new': return 'bg-red-500 text-white'; case 'contacted': return 'bg-blue-500 text-white'; case 'negotiating': return 'bg-yellow-500 text-black'; case 'closed': return 'bg-green-500 text-white'; default: return 'bg-gray-500 text-white'; } };
    const groupedInquiries = inquiries.reduce((acc, curr) => { const key = curr.clientName || '未知客戶'; if (!acc[key]) acc[key] = []; acc[key].push(curr); return acc; }, {});

    const renderInquiryCard = (inq, isKanban = false) => (
        <div key={inq.id} className={`${isKanban ? 'p-4 mb-3' : 'p-8'} rounded-4xl border transition-all group relative ${cardClass}`} draggable={isKanban} onDragStart={(e) => e.dataTransfer.setData("inquiryId", inq.id)}>
            {editingId === inq.id ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2"><input value={editForm.clientName} onChange={e=>setEditForm({...editForm, clientName:e.target.value})} className={`p-3 rounded-xl border ${inputClass}`} placeholder="姓名"/><input value={editForm.clientPhone} onChange={e=>setEditForm({...editForm, clientPhone:e.target.value})} className={`p-3 rounded-xl border ${inputClass}`} placeholder="電話"/><input value={editForm.clientEmail} onChange={e=>setEditForm({...editForm, clientEmail:e.target.value})} className={`p-3 rounded-xl border ${inputClass}`} placeholder="Email"/></div>
                    <textarea value={editForm.note} onChange={e=>setEditForm({...editForm, note:e.target.value})} className={`w-full p-3 rounded-xl border h-20 ${inputClass}`} placeholder="備註"/>
                    <div className="flex justify-end gap-2"><button onClick={()=>setEditingId(null)} className="px-3 py-1 rounded-xl bg-gray-500/10 text-gray-500 text-sm">取消</button><button onClick={saveEdit} className="px-3 py-1 rounded-xl bg-dc-orange text-white font-bold text-sm">儲存</button></div>
                </div>
            ) : (
                <>
                    <div className={`flex justify-between items-start ${isKanban ? 'mb-2' : 'mb-4'}`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-bold cursor-pointer hover:text-dc-orange ${isKanban ? 'text-lg' : 'text-2xl'} ${theme==='dark'?'text-white':'text-gray-900'}`} onClick={() => onLoadQuote(inq)}>
                                    {inq.clientName} {inq.score > 0 && <span className="flex text-yellow-400 text-sm">{[...Array(inq.score)].map((_,i)=><Icons.Star key={i} className="w-3 h-3 fill-current"/>)}</span>}
                                </h3>
                                {!isKanban && <select value={inq.status || 'new'} onChange={(e) => updateStatus(inq.id, e.target.value)} className={`text-xs font-bold px-2 py-1 rounded cursor-pointer outline-none ${getStatusColor(inq.status || 'new')}`}><option value="new">新進</option><option value="contacted">已聯繫</option><option value="negotiating">議價中</option><option value="closed">已結案</option></select>}
                            </div>
                            <p className="text-dc-gray flex items-center gap-2 text-sm flex-wrap"><span>{inq.clientPhone}</span></p>
                        </div>
                        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ${isKanban ? 'flex-col' : ''}`}><button onClick={()=>startEdit(inq)} className="p-2 rounded-full hover:bg-blue-500/10 text-blue-400"><Icons.Edit className="w-4 h-4"/></button><button onClick={()=>handleDelete(inq.id)} className="p-2 rounded-full hover:bg-red-500/10 text-red-400"><Icons.Trash2 className="w-4 h-4"/></button><button onClick={() => onLoadQuote(inq)} className="p-2 rounded-full hover:bg-dc-orange/20 text-dc-orange"><Icons.FileText className="w-4 h-4"/></button></div>
                    </div>
                    {!isKanban && <div className="flex gap-2 mb-3 flex-wrap cursor-pointer" onClick={() => onLoadQuote(inq)}>{inq.items.slice(0, 4).map((item, i) => <span key={i} className={`text-xs px-2 py-1 rounded border ${theme==='dark'?'bg-white/5 border-white/10 text-gray-300':'bg-gray-100 border-gray-200 text-gray-600'}`}>{item.description}</span>)}</div>}
                    <div className="flex justify-between items-end pt-2 border-t border-gray-500/10"><div className="text-xs text-dc-gray font-mono">{inq.date}</div>{!isKanban && <div className="flex gap-1">{[1,2,3,4,5].map(star => <button key={star} onClick={()=>handleRate(inq.id, star)} className={`p-1 hover:scale-125 transition ${inq.score >= star ? 'text-yellow-400' : 'text-gray-600'}`}><Icons.Star className={`w-4 h-4 ${inq.score >= star ? 'fill-current' : ''}`}/></button>)}</div>}</div>
                </>
            )}
        </div>
    );

    const columns = [
        { id: 'new', title: '新進需求', color: 'border-red-500' },
        { id: 'contacted', title: '已聯繫', color: 'border-blue-500' },
        { id: 'negotiating', title: '議價中', color: 'border-yellow-500' },
        { id: 'closed', title: '已結案', color: 'border-green-500' }
    ];

    const handleDrop = (e, status) => {
        const id = e.dataTransfer.getData("inquiryId");
        if (id) updateStatus(id, status);
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className={`text-3xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}><div className="bg-dc-orange/10 p-2 rounded-xl"><Icons.Inbox className="w-8 h-8 text-dc-orange"/></div> 客戶需求 CRM</h2>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="bg-dc-orange/10 text-dc-orange px-4 py-2 rounded-lg font-bold hover:bg-dc-orange hover:text-white flex items-center gap-2"><Icons.FileUp className="w-4 h-4"/> 匯出 CSV</button>
                    <button onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${viewMode === 'kanban' ? 'bg-dc-orange text-white' : 'bg-gray-500/10 text-gray-500'}`}>
                        {viewMode === 'list' ? <Icons.Grid className="w-5 h-5" /> : <Icons.List className="w-5 h-5" />} {viewMode === 'list' ? '看板模式' : '列表模式'}
                    </button>
                    <button onClick={() => setGroupByClient(!groupByClient)} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${groupByClient ? 'bg-dc-orange text-white' : 'bg-gray-500/10 text-gray-500'}`}><Icons.UserGroup className="w-5 h-5" /> 分組</button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="grid gap-6">{inquiries.length === 0 && <p className="text-center py-20 text-gray-500 text-xl">目前沒有新的詢價</p>}{groupByClient ? Object.entries(groupedInquiries).map(([client, list]) => (<div key={client} className={`p-6 rounded-4xl border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}><h3 className={`text-xl font-bold mb-4 ml-2 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}><Icons.User className="w-5 h-5 text-dc-orange" /> {client} <span className="text-sm text-gray-500 font-normal">({list.length} 筆詢價)</span></h3><div className="grid gap-4 pl-4 border-l-2 border-dc-orange/30">{list.map(inq => renderInquiryCard(inq))}</div></div>)) : inquiries.map(inq => renderInquiryCard(inq))}</div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-8 h-[calc(100vh-200px)]">
                    {columns.map(col => (
                        <div 
                            key={col.id} 
                            className={`flex-1 min-w-[300px] p-4 rounded-3xl border-t-4 ${col.color} ${theme==='dark'?'bg-black/20':'bg-gray-50'}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <h3 className={`font-bold mb-4 text-lg px-2 ${theme==='dark'?'text-white':'text-gray-800'}`}>{col.title} <span className="text-sm text-gray-500 font-normal">({inquiries.filter(i => (i.status || 'new') === col.id).length})</span></h3>
                            <div className="space-y-3 overflow-y-auto max-h-[calc(100%-50px)] pr-2 custom-scrollbar">
                                {inquiries.filter(i => (i.status || 'new') === col.id).map(inq => renderInquiryCard(inq, true))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}