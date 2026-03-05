import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie } from 'lucide-react';

const GDPRBanner = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // چک میکنه آیا کاربر قبلا قوانین رو قبول کرده یا نه
        const consent = localStorage.getItem('gdpr_consent');
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500); // بعد از 1.5 ثانیه ظاهر میشه
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('gdpr_consent', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:max-w-md z-[100] bg-white p-6 rounded-2xl shadow-2xl border border-slate-200"
                >
                    <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                            <ShieldCheck className="text-blue-600" size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-900 mb-1">Privacy & Data Security</h4>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                Following EU <strong>GDPR</strong> guidelines, we use cookies and secure AWS architecture to process your health data safely. Your data is encrypted and never shared.
                            </p>
                            <button
                                onClick={handleAccept}
                                className="w-full bg-deep-blue hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <Cookie size={16} />
                                Accept & Continue
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GDPRBanner;