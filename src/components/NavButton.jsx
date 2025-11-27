// src/components/NavButton.jsx
import React from 'react';

export default function NavButton({ active, onClick, icon: Icon, label, theme, badge }) {
    const activeClass = theme === 'dark' ? 'bg-white/10 text-white shadow-inner' : 'bg-gray-100 text-black shadow-inner';
    const inactiveClass = 'text-dc-gray hover:text-current hover:bg-gray-500/10';
    return (
        <button onClick={onClick} className={`relative p-2 px-3 rounded-xl flex items-center gap-2 transition-all duration-200 font-medium flex-shrink-0 ${active ? activeClass : inactiveClass}`}>
            <Icon className="w-4 h-4" /> <span className="hidden lg:inline">{label}</span>
            {badge > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow-sm animate-pulse">{badge}</span>}
        </button>
    );
}