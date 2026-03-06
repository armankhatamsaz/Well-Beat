import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const GDPRBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    
    // وضعیتِ سوییچ‌ها (Essential همیشه روشنه و غیرقابل تغییره)
    const [marketing, setMarketing] = useState(false);
    const [functional, setFunctional] = useState(false);

    useEffect(() => {
        // چک میکنه آیا کاربر قبلا قوانین رو قبول کرده یا نه
        const consent = localStorage.getItem('gdpr_consent_v2');
        if (!consent) {
            // جلوگیری از اسکرول شدنِ صفحه تا وقتی پاپ‌آپ بازه
            document.body.style.overflow = 'hidden';
            setIsVisible(true);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const closeAndSave = (type) => {
        // ذخیره وضعیت تو مرورگر
        localStorage.setItem('gdpr_consent_v2', 'true');
        localStorage.setItem('gdpr_preferences', JSON.stringify({
            essential: true,
            marketing: type === 'all' ? true : marketing,
            functional: type === 'all' ? true : functional
        }));
        
        document.body.style.overflow = 'unset';
        setIsVisible(false);
    };

    // کامپوننتِ داخلی برای ساختنِ دکمه‌های سوییچ (Toggle)
    const ToggleSwitch = ({ label, checked, onChange, disabled }) => (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">{label}</span>
            <button
                type="button"
                onClick={() => !disabled && onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    checked ? 'bg-medical-teal' : 'bg-slate-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span 
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        checked ? 'translate-x-6' : 'translate-x-1'
                    }`} 
                />
            </button>
        </div>
    );

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* پس‌زمینه تاریک و تار برای قفل کردنِ سایت */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* باکسِ اصلیِ تنظیمات حریم خصوصی */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative z-10 overflow-hidden flex flex-col"
                    >
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <ShieldCheck className="text-medical-teal" size={28} />
                                <h2 className="text-2xl font-bold text-deep-blue">Privacy Settings</h2>
                            </div>

                            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-8 text-center sm:text-left">
                                This site uses third-party website tracking technologies to provide and continually improve our services, and to display advertisements according to users' interests. I agree and may revoke or change my consent at any time with effect for the future.
                            </p>

                            {/* بخش سوییچ‌ها */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <ToggleSwitch 
                                    label="Marketing" 
                                    checked={marketing} 
                                    onChange={setMarketing} 
                                />
                                <ToggleSwitch 
                                    label="Functional" 
                                    checked={functional} 
                                    onChange={setFunctional} 
                                />
                                <ToggleSwitch 
                                    label="Essential" 
                                    checked={true} 
                                    disabled={true} 
                                />
                            </div>

                            {/* دکمه‌های اکشن (دقیقاً مثل عکس) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <button 
                                    onClick={() => closeAndSave('save')}
                                    className="px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    More
                                </button>
                                <button 
                                    onClick={() => closeAndSave('save')}
                                    className="px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Save Settings
                                </button>
                                <button 
                                    onClick={() => closeAndSave('deny')}
                                    className="px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 rounded-xl transition-colors"
                                >
                                    Deny
                                </button>
                                <button 
                                    onClick={() => closeAndSave('all')}
                                    className="px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/30 rounded-xl transition-colors"
                                >
                                    Accept All
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GDPRBanner;