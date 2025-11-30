import React, { useState, useEffect } from 'react';
import { Icons } from '../assets/Icons';
import { useToast } from '../components/Toast';

export default function CompanySettings({ initialData, onSave, onCancel, theme }) {
    const toast = useToast();
    const [formData, setFormData] = useState({
        websites: [''], // 預設至少有一個網站欄位
        ...initialData
    });
    const [isSaving, setIsSaving] = useState(false);

    // [修復] 確保資料載入時同步更新表單，並處理舊資料相容
    useEffect(() => {
        if (initialData) {
            let data = { ...initialData };
            
            // 資料遷移：如果舊資料有 website (單數) 但沒有 websites (複數)
            if (data.website && (!data.websites || data.websites.length === 0)) {
                data.websites = [data.website];
            }
            
            // 確保 websites 至少有一個空字串，讓 UI 有欄位顯示
            if (!data.websites || !Array.isArray(data.websites) || data.websites.length === 0) {
                data.websites = [''];
            }
            
            setFormData(data);
        }
    }, [initialData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // [新增] 處理多個網站輸入
    const handleWebsiteChange = (index, value) => {
        const newWebsites = [...formData.websites];
        newWebsites[index] = value;
        setFormData({ ...formData, websites: newWebsites });
    };

    // [新增] 增加網站欄位
    const addWebsite = () => {
        setFormData(prev => ({ ...prev, websites: [...prev.websites, ''] }));
    };

    // [新增] 移除網站欄位
    const removeWebsite = (index) => {
        const newWebsites = formData.websites.filter((_, i) => i !== index);
        // 如果刪光了，自動補回一個空的，避免欄位消失
        if (newWebsites.length === 0) newWebsites.push('');
        setFormData({ ...formData, websites: newWebsites });
    };

    const handleLogo = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500 * 1024) {
                toast.show("Logo 檔案過大，建議小於 500KB", "error");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, logo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 儲存前過濾掉空白的網站網址
            const cleanData = {
                ...formData,
                websites: formData.websites.filter(url => url.trim() !== '')
            };
            
            await onSave(cleanData);
            toast.show("設定已成功儲存！", "success");
        } catch (error) {
            console.error(error);
            toast.show("儲存失敗，請稍後再試", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const panelClass = theme === 'dark' ? 'bg-dc-panel border-white/10' : 'bg-white border-gray-200 shadow-md';
    const inputClass = theme === 'dark' ? 'bg-dc-dark border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-black';

    return (
        <div className={`max-w-3xl mx-auto p-10 rounded-4xl border animate-fade-in ${panelClass}`}>
            <h2 className={`text-2xl font-bold mb-8 flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                <Icons.Settings className="w-6 h-6 text-dc-orange" /> 公司設定
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
                {/* Logo Upload */}
                <div className="text-center">
                    <div className="w-36 h-36 mx-auto rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center overflow-hidden mb-4 relative group">
                        {formData.logo ? (
                            <img src={formData.logo} className="w-full h-full object-cover" alt="Company Logo" />
                        ) : (
                            <span className="text-gray-500 text-sm">Logo</span>
                        )}
                        <input type="file" accept="image/*" onChange={handleLogo} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-sm pointer-events-none font-bold">
                            更換圖片
                        </div>
                    </div>
                </div>

                {/* Basic Info Fields */}
                <div className="md:col-span-2 space-y-5">
                    <input 
                        name="name" 
                        value={formData.name || ''} 
                        onChange={handleChange} 
                        className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} 
                        placeholder="公司名稱" 
                    />
                    
                    {/* [修改] 多網站管理區塊 */}
                    <div className="space-y-2">
                        <label className={`text-xs font-bold ml-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>官方網站連結</label>
                        {formData.websites.map((site, index) => (
                            <div key={index} className="flex gap-2 items-center group">
                                <input 
                                    value={site} 
                                    onChange={(e) => handleWebsiteChange(index, e.target.value)} 
                                    className={`flex-1 p-4 rounded-2xl border text-lg ${inputClass}`} 
                                    placeholder="https://..." 
                                />
                                <button 
                                    onClick={() => removeWebsite(index)}
                                    className="p-4 rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                                    title="移除此連結"
                                >
                                    <Icons.Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={addWebsite}
                            className={`w-full py-3 rounded-2xl border border-dashed flex items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'border-white/10 text-gray-400 hover:border-dc-orange hover:text-dc-orange' : 'border-gray-300 text-gray-500 hover:border-dc-orange hover:text-dc-orange'}`}
                        >
                            <Icons.Plus className="w-4 h-4" /> 新增另一個網站
                        </button>
                    </div>

                    <input 
                        name="description" 
                        value={formData.description || ''} 
                        onChange={handleChange} 
                        className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} 
                        placeholder="一句話簡介" 
                    />
                    <div className="grid grid-cols-2 gap-5">
                        <input 
                            name="taxId" 
                            value={formData.taxId || ''} 
                            onChange={handleChange} 
                            className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} 
                            placeholder="統一編號" 
                        />
                        <input 
                            name="phone" 
                            value={formData.phone || ''} 
                            onChange={handleChange} 
                            className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} 
                            placeholder="聯絡電話" 
                        />
                    </div>
                    <input 
                        name="address" 
                        value={formData.address || ''} 
                        onChange={handleChange} 
                        className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} 
                        placeholder="公司地址" 
                    />
                    <input 
                        name="email" 
                        value={formData.email || ''} 
                        onChange={handleChange} 
                        className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} 
                        placeholder="電子信箱" 
                    />
                    <textarea 
                        name="bankInfo" 
                        value={formData.bankInfo || ''} 
                        onChange={handleChange} 
                        rows="3" 
                        className={`w-full p-4 rounded-2xl border text-lg ${inputClass}`} 
                        placeholder="匯款資訊與備註 (將顯示於 PDF 底部)" 
                    />
                </div>
            </div>

            {/* EmailJS Settings */}
            <div className="mt-8 pt-8 border-t border-gray-500/20">
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    <Icons.Mail className="w-5 h-5 text-dc-orange" /> Email 通知設定 (EmailJS)
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <input 
                        name="emailjsServiceId" 
                        value={formData.emailjsServiceId || ''} 
                        onChange={handleChange} 
                        className={`w-full p-3 rounded-xl border text-sm ${inputClass}`} 
                        placeholder="Service ID" 
                    />
                    <input 
                        name="emailjsTemplateId" 
                        value={formData.emailjsTemplateId || ''} 
                        onChange={handleChange} 
                        className={`w-full p-3 rounded-xl border text-sm ${inputClass}`} 
                        placeholder="Template ID" 
                    />
                    <input 
                        name="emailjsPublicKey" 
                        value={formData.emailjsPublicKey || ''} 
                        onChange={handleChange} 
                        className={`w-full p-3 rounded-xl border text-sm ${inputClass}`} 
                        placeholder="Public Key" 
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2">請至 EmailJS 申請並填入金鑰，以啟用客戶送單時的自動寄信功能。</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-500/20">
                <button 
                    onClick={onCancel} 
                    className="px-6 py-3 rounded-xl border text-gray-500 hover:bg-gray-100 font-bold transition"
                >
                    取消
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="px-6 py-3 bg-dc-orange text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition hover:brightness-110 disabled:opacity-50"
                >
                    {isSaving ? '儲存中...' : <><Icons.Save className="w-5 h-5" /> 儲存設定</>}
                </button>
            </div>
        </div>
    );
}