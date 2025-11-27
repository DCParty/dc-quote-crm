import React, { useState } from 'react';
import { collection, addDoc, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Icons } from '../assets/Icons';
import { DEFAULT_TEMPLATES } from '../lib/utils';

export default function ModuleEditor({ templates, db, appId, userId, theme }) {
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: "", description: "", items: [] });
    
    const startEdit = (t) => { setEditingId(t.id); setFormData(JSON.parse(JSON.stringify(t))); };
    const startNew = () => { setEditingId('new'); setFormData({ name: "新模組", description: "", items: [{ description: "項目", unit: "式", priceMin: 0, priceMax: 0 }] }); };
    const handleItem = (idx, f, v) => { const ni = [...formData.items]; ni[idx][f] = v; setFormData({ ...formData, items: ni }); };
    
    const saveModule = async () => { 
        const ref = collection(db, 'artifacts', appId, 'users', userId, 'templates'); 
        try { 
            if (editingId === 'new') await addDoc(ref, formData); 
            else await setDoc(doc(ref, editingId), formData); 
            setEditingId(null); 
        } catch (e) { alert("Error"); } 
    };
    
    const delModule = async (id) => { 
        if(confirm("刪除?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'templates', id)); 
    };
    
    const resetDefaults = async () => {
        const confirmation = prompt("【嚴重警告】\n此操作將刪除所有自訂模組並還原為 8 組預設值，動作無法復原。\n\n若確定執行，請輸入「RESET」：");
        if (confirmation !== "RESET") return alert("輸入錯誤，已取消操作。");
        
        const batch = writeBatch(db);
        templates.forEach(t => batch.delete(doc(db, 'artifacts', appId, 'users', userId, 'templates', t.id)));
        DEFAULT_TEMPLATES.forEach(t => {
            const newRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'templates'));
            batch.set(newRef, t);
        });
        await batch.commit();
        alert("模組已重置！");
    };

    const panelClass = theme === 'dark' ? 'bg-dc-panel border-white/10' : 'bg-white border-gray-200 shadow-md';
    const inputClass = theme === 'dark' ? 'bg-dc-dark border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-black';
    
    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className={`text-3xl font-bold flex items-center gap-3 ${theme==='dark'?'text-white':'text-gray-800'}`}><div className="bg-dc-orange/20 p-2 rounded-xl text-dc-orange"><Icons.Layers className="w-8 h-8"/></div> 模組管理</h2>
                <div className="flex gap-2">
                    <button onClick={resetDefaults} className="bg-gray-500/10 text-dc-gray px-4 py-2 rounded-2xl hover:bg-gray-500/20 hover:text-white flex items-center gap-2 font-bold text-sm"><Icons.RefreshCw className="w-4 h-4"/> 重置預設</button>
                    <button onClick={startNew} className="bg-dc-orange text-white px-6 py-3 rounded-2xl hover:scale-105 transition flex items-center gap-2 font-bold text-lg shadow-lg"><Icons.Plus className="w-5 h-5"/> 新增</button>
                </div>
            </div>
            {editingId ? (
                <div className={`p-10 rounded-4xl border ${panelClass} animate-fade-in`}>
                    <div className="flex justify-between mb-8 border-b border-gray-500/20 pb-6"><h3 className="text-2xl font-bold text-dc-orange">編輯模組內容</h3><div className="gap-3 flex"><button onClick={()=>setEditingId(null)} className="px-5 py-2 text-gray-500 hover:text-current border rounded-xl font-bold">取消</button><button onClick={saveModule} className="px-6 py-2 bg-dc-orange text-white rounded-xl flex items-center gap-2 font-bold hover:shadow-lg transition"><Icons.Save className="w-5 h-5"/> 儲存</button></div></div>
                    <div className="grid md:grid-cols-2 gap-6 mb-8"><input value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="模組名稱" /><input value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} placeholder="描述" /></div>
                    <div className={`p-6 rounded-3xl border ${theme==='dark'?'bg-black/20 border-white/5':'bg-gray-50 border-gray-200'}`}><div className="flex justify-between mb-4"><h4 className="font-bold text-lg text-gray-500">細項列表</h4><button onClick={()=>setFormData({...formData,items:[...formData.items,{description:"",unit:"式",priceMin:0,priceMax:0}]})} className="text-dc-orange text-sm font-bold bg-dc-orange/10 px-3 py-1 rounded-lg hover:bg-dc-orange hover:text-white transition">+ 新增項目</button></div>{formData.items.map((it, i) => (<div key={i} className="flex gap-3 mb-3 items-center"><input value={it.description} onChange={e=>handleItem(i,'description',e.target.value)} className={`flex-1 p-3 rounded-xl border text-base ${inputClass}`} placeholder="項目說明" /><input value={it.unit} onChange={e=>handleItem(i,'unit',e.target.value)} className={`w-20 p-3 rounded-xl border text-base text-center ${inputClass}`} placeholder="單位" /><input type="number" value={it.priceMin} onChange={e=>handleItem(i,'priceMin',Number(e.target.value))} className={`w-28 p-3 rounded-xl border text-base text-right ${inputClass}`} placeholder="Min" /><input type="number" value={it.priceMax} onChange={e=>handleItem(i,'priceMax',Number(e.target.value))} className={`w-28 p-3 rounded-xl border text-base text-right ${inputClass}`} placeholder="Max" /><button onClick={()=>setFormData({...formData,items:formData.items.filter((_,idx)=>idx!==i)})} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition"><Icons.Trash2 className="w-5 h-5"/></button></div>))}</div>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">{templates.map(t => (<div key={t.id} className={`p-8 rounded-4xl border transition-all group ${panelClass} hover:border-dc-orange hover:shadow-xl`}><div className="flex justify-between mb-4"><h3 className={`text-2xl font-bold group-hover:text-dc-orange transition-colors ${theme==='dark'?'text-white':'text-gray-900'}`}>{t.name}</h3><div className="flex gap-2 opacity-50 group-hover:opacity-100 transition"><button onClick={()=>startEdit(t)} className="p-2 rounded-full hover:bg-blue-500/10 text-gray-400 hover:text-blue-400"><Icons.Edit className="w-6 h-6"/></button><button onClick={()=>delModule(t.id)} className="p-2 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-400"><Icons.Trash2 className="w-6 h-6"/></button></div></div><p className="text-base text-gray-500 mb-6 text-center">{t.description}</p><div className={`text-sm p-3 rounded-2xl font-mono text-center ${theme==='dark'?'bg-black/30 text-gray-400':'bg-gray-100 text-gray-600'}`}>包含 {t.items.length} 個項目</div></div>))}</div>
            )}
        </div>
    );
}