import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Check } from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';

const StreakSuccessModal = ({ onClose }) => {
    const user = useHealthStore((state) => state.user);
    const streak = user?.streak || 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                    className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-orange-50 to-white -z-10" />

                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 relative"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <Flame size={48} className="text-orange-500 fill-orange-500" />
                        </motion.div>

                        {/* Particle effects (simulated with dots) */}
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: [0, 1, 0], scale: [0, 1.5], x: Math.cos(i * 60 * (Math.PI / 180)) * 60, y: Math.sin(i * 60 * (Math.PI / 180)) * 60 }}
                                transition={{ delay: 0.4, duration: 1, repeat: Infinity, repeatDelay: 2 }}
                                className="absolute w-2 h-2 bg-orange-400 rounded-full"
                            />
                        ))}
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold text-slate-900 mb-2"
                    >
                        Streak Extended!
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-500 mb-8"
                    >
                        You're on fire! You've logged your health for <span className="font-bold text-orange-600">{streak} days</span> in a row.
                    </motion.p>

                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        onClick={onClose}
                        className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        See Results
                    </motion.button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default StreakSuccessModal;
