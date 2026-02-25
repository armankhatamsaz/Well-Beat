import React from 'react';
import { motion } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import RiskCard from './RiskCard';
import HeartAge from './HeartAge';
import RiskBreakdown from './RiskBreakdown';
import ActionPlan from './ActionPlan';

const HistoricalAnalysis = ({ record, onClose }) => {
    if (!record) return null;

    const { metrics, riskScore, riskCategory, date } = record;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto"
        >
            <div className="bg-slate-50 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="text-blue-500" />
                            Historical Analysis
                        </h2>
                        <p className="text-slate-500">
                            Assessment from {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <RiskCard score={riskScore} category={riskCategory} />
                        {metrics && <HeartAge realAge={metrics.age} heartAge={metrics.age + (riskScore > 10 ? 5 : 0)} />}
                        {/* Note: HeartAge logic is simplified here as we don't store heartAge in history yet, approximating for now or we should update store to save it */}
                    </div>

                    {metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <RiskBreakdown metrics={metrics} />
                            <ActionPlan metrics={metrics} />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default HistoricalAnalysis;
