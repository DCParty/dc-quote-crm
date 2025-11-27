// src/components/Toast.jsx
import React, { useState, createContext, useContext } from 'react';
import { Icons } from '../assets/Icons';

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const show = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => remove(id), 3000);
    };

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`px-6 py-3 rounded-xl shadow-xl text-white flex items-center gap-3 animate-slide-in pointer-events-auto ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
                        {t.type === 'success' ? <Icons.Success className="w-5 h-5"/> : t.type === 'error' ? <Icons.Error className="w-5 h-5"/> : <Icons.Info className="w-5 h-5"/>}
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}