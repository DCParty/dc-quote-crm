import React from 'react';

export default function NavButton({ active, onClick, icon: Icon, label, theme, badge }) {
    const activeClass = theme === 'dark' ? 'bg-white/10 text-white shadow-inner' : 'bg-gray-100 text-black shadow-inner';
    const inactiveClass = 'text-dc-gray hover:text-current hover:bg-gray-500/10';
    
    return (
        <button 
            onClick={onClick} 
            className={`relative p-2 lg:px-3 rounded-xl flex items-center justify-center lg:justify-start gap-2 transition-all duration-200 font-medium flex-shrink-0 ${active ? activeClass : inactiveClass}`}
            title={label} // 手機版長按或滑鼠懸停可看到提示
        >
            <Icon className="w-4 h-4 lg:w-5 lg:h-5" /> 
            <span className="hidden lg:inline text-sm">{label}</span>
            {badge > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-red-500 text-white text-[10px] lg:text-xs rounded-full flex items-center justify-center shadow-sm animate-pulse">
                    {badge}
                </span>
            )}
        </button>
    );
}