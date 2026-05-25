import React, { useEffect } from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { LogOut, Flame, Activity } from 'lucide-react';
import { useAuth } from 'react-oidc-context'; // بادیگارد آمازون
import GDPRBanner from './GDPRBanner'; // پاپ‌آ‌پ امنیتی

const Layout = ({ children }) => {
    const user = useHealthStore((state) => state.user);
    const loginStore = useHealthStore((state) => state.login); // واکشی اکشن لاگین استور
    const logoutStore = useHealthStore((state) => state.logout);
    const setView = useHealthStore((state) => state.setView);
    const auth = useAuth(); // فعال‌سازی هوک آمازون

    // 🌟 همگام‌سازی کاربر + حل مشکل ارور رفرش (Wipe Out Query Parameters)
    useEffect(() => {
        if (auth.isAuthenticated && auth.user) {
            
            // ✅ حل قطعی ارور رفرش: به محض لاگین موفق، پارامترهای ?code= ته URL را پاک می‌کند
            if (window.location.search.includes('code=') || window.location.search.includes('state=')) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            if (!user) {
                const profile = auth.user.profile;
                const userEmail = profile.email;
                
                // استخراج داینامیک نام
                let dynamicName = profile.name || profile.given_name || profile.nickname || profile.preferred_username;
                
                if (!dynamicName && userEmail) {
                    const prefix = userEmail.split('@')[0];
                    const cleanPrefix = prefix.split(/[\._-]/)[0];
                    dynamicName = cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1);
                }
                
                if (!dynamicName) {
                    dynamicName = 'User';
                }

                loginStore({
                    name: dynamicName, 
                    email: userEmail,   
                }, auth.user.id_token); 
            }
        }
    }, [auth.isAuthenticated, auth.user, user, loginStore]);

    // 🌟 حل مشکل لوپ لاگ‌اوت (Complete Federated Logout)
    const handleLogout = () => {
        logoutStore(); // ۱. پاک کردن دیتای استور از روی مرورگر
        
        // ۲. خروج کامل و هدایت به صفحه لاگ‌اوت کلود آمازون برای از بین بردن کوکی سشن
        if (auth && auth.signoutRedirect) {
            auth.signoutRedirect(); 
        } else {
            auth.removeUser();
        }
    };

    return (
        <div className="min-h-screen bg-soft-surface text-slate-900 font-sans selection:bg-medical-teal/20 selection:text-medical-teal">
            <div className="fixed inset-0 -z-10 h-full w-full bg-soft-surface [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,#e0f2f1_100%)] opacity-60 pointer-events-none"></div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
                <div className="px-6 py-4 flex justify-between items-center max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
                        <div className="w-9 h-9 bg-gradient-to-br from-medical-teal to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-medical-teal/20 group-hover:shadow-medical-teal/40 transition-all">
                            <Activity size={20} />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-deep-blue">WellBeat</span>
                    </div>

                    <nav className="flex items-center gap-4">
                        {user && (
                            <>
                                <div className="hidden sm:flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 shadow-sm">
                                    <Flame className="text-orange-500 fill-orange-500" size={16} />
                                    <span className="text-sm font-bold text-orange-700">{user.streak || 0} Day Streak</span>
                                </div>

                                <div className="flex items-center gap-3 pl-6 sm:border-l border-slate-200">
                                    <button
                                        onClick={() => setView('profile')}
                                        className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-all text-left group border border-transparent hover:border-slate-200"
                                    >
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-9 h-9 rounded-full border-2 border-white shadow-sm bg-slate-100 group-hover:border-medical-teal/30 transition-colors"
                                        />
                                        <div className="hidden md:block">
                                            <p className="text-sm font-bold text-slate-700 group-hover:text-medical-teal transition-colors">
                                                {user.name}
                                            </p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                                        title="Sign Out"
                                    >
                                        <LogOut size={18} />
                                    </button>
                                </div>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 relative">
                {children}
            </main>

            <GDPRBanner />
        </div>
    );
};

export default Layout;