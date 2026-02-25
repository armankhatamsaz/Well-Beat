import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const RiskCard = ({ score, category }) => {
    const getColor = () => {
        if (category === 'Low') return 'text-emerald-700 bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-emerald-100/50';
        if (category === 'Moderate') return 'text-amber-700 bg-gradient-to-br from-amber-50 to-white border-amber-100 shadow-amber-100/50';
        return 'text-rose-700 bg-gradient-to-br from-rose-50 to-white border-rose-100 shadow-rose-100/50';
    };

    const getIcon = () => {
        if (category === 'Low') return <CheckCircle size={32} className="text-emerald-500" />;
        if (category === 'Moderate') return <AlertTriangle size={32} className="text-amber-500" />;
        return <AlertCircle size={32} className="text-rose-500" />;
    };

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-6 rounded-3xl border shadow-lg flex flex-col items-center justify-center gap-4 ${getColor()}`}
        >
            <div className="flex items-center gap-3">
                {getIcon()}
                <h3 className="text-xl font-bold uppercase tracking-wider">{category} Risk</h3>
            </div>

            <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="opacity-20"
                    />
                    <motion.circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={440}
                        strokeDashoffset={440}
                        animate={{ strokeDashoffset: 440 - (440 * Math.min(score, 30) / 30) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{score}%</span>
                    <span className="text-sm font-medium opacity-80">10-Year Risk</span>
                </div>
            </div>
        </motion.div>
    );
};

export default RiskCard;
