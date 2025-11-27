// src/App.jsx
import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, collection, onSnapshot, addDoc, query, where } from "firebase/firestore";
import { auth, db, googleProvider } from './lib/firebase';
import { DEFAULT_TEMPLATES } from './lib/utils';

// Components
import { Icons } from './assets/Icons';
import { ToastProvider } from './components/Toast';
import NavButton from './components/NavButton';

// Features
import DashboardOverview from './features/DashboardOverview';
import QuoteBuilder from './features/QuoteBuilder';
import QuoteHistory from './features/QuoteHistory';
import InquiriesList from './features/InquiriesList';
import ModuleEditor from './features/ModuleEditor';
import CompanySettings from './features/CompanySettings';
import ClientFormView from './features/ClientFormView';

function App() {
    const [user, setUser] = useState(null);
    const [authInitialized, setAuthInitialized] = useState(false);
    const [view, setView] = useState('overview');
    const [companyInfo, setCompanyInfo] = useState({});
    const [templates, setTemplates] = useState([]);
    const [theme, setTheme] = useState('light'); 
    const [inquiriesCount, setInquiriesCount] = useState(0);
    
    // App ID from Environment or Default
    const appId = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

    // Public Link Logic
    const urlParams = new URLSearchParams(window.location.search);
    const publicUid = urlParams.get('uid');
    const isPublicMode = !!publicUid;
    const targetUserId = publicUid || user?.uid;

    // Theme Effect
    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('bg-dc-black', 'text-dc-light', 'dark');
            document.body.classList.remove('bg-dc-light', 'text-dc-dark');
        } else {
            document.body.classList.add('bg-dc-light', 'text-dc-dark');
            document.body.classList.remove('bg-dc-black', 'text-dc-light', 'dark');
        }
    }, [theme]);

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => { 
            setUser(u); 
            setAuthInitialized(true); 
        });
        return () => unsubscribe();
    }, []);

    // Data Sync
    useEffect(() => {
        if (!targetUserId) return;
        
        // Company Info
        const unsubInfo = onSnapshot(doc(db, 'artifacts', appId, 'users', targetUserId, 'companySettings', 'info'), (s) => { 
            if (s.exists()) setCompanyInfo(s.data()); 
        });

        // Templates
        const templatesRef = collection(db, 'artifacts', appId, 'users', targetUserId, 'templates');
        const unsubTemplates = onSnapshot(templatesRef, async (s) => {
            const t = s.docs.map(d => ({ id: d.id, ...d.data() }));
            if (t.length === 0 && !s.metadata.fromCache && !isPublicMode) { 
                // Auto-populate defaults if empty
                for (const temp of DEFAULT_TEMPLATES) await addDoc(templatesRef, temp); 
            } else { 
                setTemplates(t); 
            }
        });
        
        // Inquiries Badge (Only for owner)
        let unsubInquiries = () => {};
        if (!isPublicMode && user) {
                const inquiriesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'inquiries');
                const q = query(inquiriesRef, where("status", "==", "new"));
                unsubInquiries = onSnapshot(q, (s) => setInquiriesCount(s.size));
        }

        return () => { unsubInfo(); unsubTemplates(); unsubInquiries(); };
    }, [user, targetUserId, isPublicMode]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    
    const handleGoogleLogin = async () => { 
        try { await signInWithPopup(auth, googleProvider); } 
        catch (error) { console.error(error); alert("登入失敗"); } 
    };
    
    const saveCompanyInfo = async (newInfo) => { 
        try { 
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'companySettings', 'info'), newInfo); 
            setView('overview'); 
        } catch (error) { alert("儲存失敗"); } 
    };

    if (!authInitialized) return <div className="min-h-screen flex items-center justify-center font-bold tracking-widest text-xl">SYSTEM LOADING...</div>;

    // Public Client View
    if (isPublicMode) {
        return (
            <ToastProvider>
                <ClientFormView templates={templates} companyInfo={companyInfo} db={db} appId={appId} userId={targetUserId} theme={theme} toggleTheme={toggleTheme} onExit={() => window.location.href = window.location.origin} />
            </ToastProvider>
        );
    }

    // Login View
    if (!user) {
        return (
            <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${theme === 'dark' ? 'bg-dc-black' : 'bg-dc-light'}`}>
                {/* ... Login UI (Copy from HTML) ... */}
                <div className={`p-16 shadow-2xl max-w-md w-full text-center relative z-10 rounded-4xl border backdrop-blur-xl ${theme === 'dark' ? 'bg-dc-panel/80 border-white/10' : 'bg-white/80 border-gray-200'}`}>
                    <div className="w-24 h-24 rounded-3xl bg-dc-orange flex items-center justify-center mx-auto mb-8 shadow-lg shadow-dc-orange/30 rotate-6"><Icons.FileText className="w-12 h-12 text-white" /></div>
                    <h1 className={`text-5xl font-bold mb-4 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>DC QUOTE</h1>
                    <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-4 bg-dc-orange text-white py-5 px-8 rounded-full font-bold text-xl hover:scale-105 transition-all shadow-xl"><Icons.User className="w-6 h-6" /> Google 登入</button>
                </div>
            </div>
        );
    }

    // Main Admin View (Wrapped in ToastProvider)
    return (
        <ToastProvider>
            <div className={`min-h-screen flex flex-col relative ${theme === 'dark' ? 'bg-dc-black text-dc-light' : 'bg-dc-light text-gray-800'}`}>
                {/* Header */}
                <header className={`border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl ${theme === 'dark' ? 'bg-dc-black/80 border-white/5' : 'bg-white/80 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="bg-dc-orange p-2 rounded-xl text-white shadow-lg"><Icons.FileText className="w-5 h-5" /></div>
                        <h1 className="font-bold text-lg tracking-wide">DC QUOTE <span className="text-xs bg-dc-orange text-white px-2 py-1 rounded-full ml-1">PRO</span></h1>
                    </div>
                    
                    {/* Navigation */}
                    <div className="flex-1 flex justify-center px-4 overflow-x-auto no-scrollbar mx-2">
                        <div className="flex items-center gap-1">
                            <NavButton active={view === 'overview'} onClick={() => setView('overview')} icon={Icons.Home} label="總覽" theme={theme} />
                            <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={Icons.FileText} label="報價單" theme={theme} />
                            <NavButton active={view === 'inquiries'} onClick={() => setView('inquiries')} icon={Icons.Inbox} label="需求" theme={theme} badge={inquiriesCount} />
                            <NavButton active={view === 'modules'} onClick={() => setView('modules')} icon={Icons.Layers} label="模組" theme={theme} />
                            <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={Icons.Settings} label="設定" theme={theme} />
                        </div>
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>{theme === 'dark' ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}</button>
                        <button onClick={() => setView('clientForm')} className="p-2 px-4 rounded-full flex items-center gap-2 text-white bg-dc-orange hover:scale-105 transition-all font-bold shadow-lg shadow-dc-orange/20"><Icons.Eye className="w-4 h-4" /> <span className="hidden lg:inline">前台</span></button>
                        <div className="hidden md:flex items-center gap-3 ml-1 pl-2 border-l border-gray-500/20">
                             <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-dc-orange">{user.photoURL ? <img src={user.photoURL} alt="User" /> : <div className="w-full h-full bg-dc-gray flex items-center justify-center text-white"><Icons.User className="w-4 h-4" /></div>}</div>
                        </div>
                        <button onClick={() => signOut(auth)} className="p-2 rounded-full hover:bg-red-500/10 text-red-400 transition-colors"><Icons.LogOut className="w-5 h-5" /></button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-6 md:p-12 overflow-auto relative z-10">
                    {view === 'overview' && <DashboardOverview db={db} appId={appId} userId={user.uid} theme={theme} />}
                    {view === 'settings' && <CompanySettings initialData={companyInfo} onSave={saveCompanyInfo} onCancel={() => setView('overview')} theme={theme} />}
                    {view === 'modules' && <ModuleEditor templates={templates} db={db} appId={appId} userId={user.uid} theme={theme} />}
                    {view === 'inquiries' && <InquiriesList db={db} appId={appId} userId={user.uid} theme={theme} onLoadQuote={(q) => { setView('dashboard'); setTimeout(() => window.loadQuoteIntoBuilder && window.loadQuoteIntoBuilder(q), 100); }} />}
                    {view === 'history' && <QuoteHistory db={db} appId={appId} userId={user.uid} theme={theme} onLoadQuote={(q) => { setView('dashboard'); setTimeout(() => window.loadQuoteIntoBuilder && window.loadQuoteIntoBuilder(q), 100); }} />}
                    {view === 'dashboard' && <QuoteBuilder templates={templates} companyInfo={companyInfo} theme={theme} db={db} appId={appId} userId={user.uid} />}
                    {view === 'clientForm' && <ClientFormView templates={templates} companyInfo={companyInfo} db={db} appId={appId} userId={user.uid} theme={theme} toggleTheme={toggleTheme} onExit={() => setView('overview')} />}
                </main>
            </div>
        </ToastProvider>
    );
}

export default App;