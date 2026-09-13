// Layout.jsx

import React, { useEffect } from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { LogOut, Flame, Activity } from 'lucide-react';
import { useAuth } from 'react-oidc-context'; // بادیگارد آمازون
import GDPRBanner from './GDPRBanner'; // پاپ‌آ‌پ امنیتی
import HistoryStatusBanner from './HistoryStatusBanner'; // پیام خطای تاریخچه

// Hosted UI sign-out. These are published client configuration, not secrets; they
// mirror the values in main.jsx. COGNITO_LOGOUT_URI must stay byte-identical to an
// entry in the app client's LogoutURLs or Cognito redirects to /login and 400s.
const COGNITO_DOMAIN = 'https://eu-south-1chd7tgaaw.auth.eu-south-1.amazoncognito.com';
const COGNITO_CLIENT_ID = '1fsqemb8fhmhon198oafnbv48u';
const COGNITO_LOGOUT_URI = 'https://main.d184n5jh1hilpp.amplifyapp.com/';

const Layout = ({ children }) => {
    const user = useHealthStore((state) => state.user);
    const loginStore = useHealthStore((state) => state.login);
    const logoutStore = useHealthStore((state) => state.logout);
    const setView = useHealthStore((state) => state.setView);
    const auth = useAuth(); // فعال‌سازی هوک آمازون
    // Stable reference: react-oidc-context memoises its methods on the UserManager,
    // which is held in useState and never replaced. Depending on the whole auth
    // object instead would re-run the effect on every auth state change.
    const { signinSilent } = auth;

    useEffect(() => {
        // اجرا شدن فقط در صورتی که کاربر از سمت آمازون تایید شده باشه
        // id_token must already be present: the history request goes through the
        // gateway's JWT authorizer, which answers 401 to a missing or empty header.
        if (auth.isAuthenticated && auth.user?.id_token && !user) {
            
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
            // The third argument lets the store recover from a 401 exactly once:
            // signinSilent() exchanges the refresh token, so it costs a token call
            // rather than a redirect, and it returns a fresh id_token.
            loginStore({
                name: finalName,
                email: profile.email,
            }, auth.user.id_token, async () => {
                const renewed = await signinSilent();
                return renewed?.id_token ?? null;
            });
        }
    }, [auth.isAuthenticated, auth.user, user, loginStore, signinSilent]);

    // ۲. حل مشکل لاگ‌اوت ناقص
    // Cognito's sign-out endpoint is not an OIDC end-session endpoint. It requires
    // client_id and logout_uri, it ignores post_logout_redirect_uri, and logout_uri
    // must be listed in the app client's allowed sign-out URLs. oidc-client-ts
    // signoutRedirect() sends id_token_hint on its own, which Cognito bounces to
    // /login and answers 400. Navigate to Cognito's own form instead. The id_token
    // is deliberately left out of the URL so it never reaches browser history.
    const handleLogout = async () => {
        logoutStore(); // پاک کردن استیت از روی مرورگر
        try {
            await auth.removeUser(); // clears the local OIDC session
        } catch {
            // Sign out at Cognito regardless, so the cookie cannot outlive the click.
        }
        window.location.assign(
            `${COGNITO_DOMAIN}/logout?client_id=${COGNITO_CLIENT_ID}` +
            `&logout_uri=${encodeURIComponent(COGNITO_LOGOUT_URI)}`
        );
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
                <HistoryStatusBanner />
                {children}
            </main>

            <GDPRBanner />
        </div>
    );
};

export default Layout;