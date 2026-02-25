import React from 'react';
import { motion } from 'framer-motion';

const HeartAge = ({ realAge, heartAge }) => {
    const isOlder = heartAge > realAge;
    const isEqual = heartAge === realAge; // اینجا حالت مساوی رو اضافه کردیم

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-white rounded-3xl shadow-xl border border-slate-200"
        >
            <h3 className="text-lg font-bold text-deep-blue mb-6">Heart Age Comparison</h3>

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                        <span>Actual Age</span>
                        <span>{realAge} years</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((realAge / 100) * 100, 100)}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="h-full bg-slate-400 rounded-full"
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                        <span>Heart Age</span>
                        <span className={isOlder ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                            {heartAge} years
                        </span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((heartAge / 100) * 100, 100)}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className={`h-full rounded-full ${isOlder ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 p-4 bg-medical-teal/5 rounded-xl text-sm text-slate-600 border border-medical-teal/10">
                {isOlder ? (
                    <p>Your heart age is <strong className="text-rose-600">older</strong> than your actual age. Consider lifestyle changes to lower your risk.</p>
                ) : isEqual ? (
                    <p>Good job! Your heart age exactly <strong className="text-emerald-600">matches</strong> your actual age. Keep maintaining a healthy lifestyle.</p>
                ) : (
                    <p>Great job! Your heart age is <strong className="text-emerald-600">younger</strong> than your actual age.</p>
                )}
            </div>
        </motion.div>
    );
};

export default HeartAge;