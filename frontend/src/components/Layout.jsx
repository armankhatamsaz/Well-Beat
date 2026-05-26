// Layout.jsx

import React, { useEffect } from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { LogOut, Flame, Activity } from 'lucide-react';
import { useAuth } from 'react-oidc-context'; // بادیگارد آمازون
import GDPRBanner from './GDPRBanner'; // پاپ‌آ‌پ امنیتی

const Layout = ({ children }) => {
    const user = useHealthStore((state) => state.user);
    const loginStore = useHealthStore((state) => state.login);
    const logoutStore = useHealthStore((state) => state.logout);
    const setView = useHealthStore((state) => state.setView);
    const auth = useAuth(); // فعال‌سازی هوک آمازون

    useEffect(() => {
        // اجرا شدن فقط در صورتی که کاربر از سمت آمازون تایید شده باشه
        if (auth.isAuthenticated && auth.user && !user) {
            
            // ۱. استخراج هوشمند و داینامیک نام واقعی (بدون هاردکد کردن هیچ اسمی)
            let finalName = 'User';
            const profile = auth.user.profile;

            if (profile.name) {
                finalName = profile.name;
            } else if (profile.given_name) {
                finalName = profile.given_name;
            } else if (profile.email) {
                // اگر کاربر هیچ اسمی وارد نکرده بود، از قسمت اول ایمیلش استفاده می‌کنیم
                const prefix = profile.email.split('@')[0];
                const cleanPrefix = prefix.split(/[\._-]/)[0];
                finalName = cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1);
            }

            // ارسال توکن و نام صحیح به استور برای دریافت قطعی تاریخچه
            loginStore({
                name: finalName,
                email: profile.email,
            }, auth.user.id_token); 
        }
    }, [auth.isAuthenticated, auth.user, user, loginStore]);

    // ۲. حل مشکل لاگ‌اوت ناقص
    const handleLogout = () => {
        logoutStore(); // پاک کردن استیت از روی مرورگر
        auth.signoutRedirect(); // 👈 هدایت به اندپوینت خروج آمازون برای ابطال کامل کوکی‌ها (نیاز به ورود مجدد)
    };

    const displayDisplayName = user?.name || 'User';
    
    // ۳. گرفتن خودکار دو حرف اول اسم کاربر برای آواتار
    const avatarInitials = displayDisplayName.substring(0, 2).toUpperCase();

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
                                        {/* دایره آواتار با نمایش دو حرف اول اسم */}
                                        <div className="w-9 h-9 rounded-full border-2 border-white shadow-sm bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm group-hover:border-medical-teal/50 transition-colors">
                                            {avatarInitials}
                                        </div>

                                        <div className="hidden md:block">
                                            <p className="text-sm font-bold text-slate-700 group-hover:text-medical-teal transition-colors">
                                                {displayDisplayName}
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