import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

const RiskBreakdown = ({ metrics }) => {
    // Normalize metrics to a 0-100 scale where 100 is "High Risk"
    // This is simplified logic for visualization
    const data = [
        {
            subject: 'Systolic BP',
            A: Math.min(100, Math.max(0, (metrics.sbp - 110) * 2)), // 120 -> 20, 140 -> 60, 160 -> 100
            fullMark: 100,
        },
        {
            subject: 'Cholesterol',
            A: Math.min(100, Math.max(0, (metrics.lipids.total - 150) * 1)), // 200 -> 50, 250 -> 100
            fullMark: 100,
        },
        {
            subject: 'Smoking',
            A: metrics.smoking > 0 ? 100 : 0,
            fullMark: 100,
        },
        {
            subject: 'Age',
            A: Math.min(100, Math.max(0, (metrics.age - 30) * 1.5)), // 50 -> 30, 70 -> 60
            fullMark: 100,
        },
        {
            subject: 'HDL (Good)',
            A: Math.min(100, Math.max(0, (60 - metrics.lipids.hdl) * 3)), // Lower is worse risk. 40 -> 60, 60 -> 0
            fullMark: 100,
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 h-full flex flex-col"
        >
            <h3 className="text-lg font-bold text-deep-blue mb-2">Risk Factor Breakdown</h3>
            <p className="text-sm text-slate-500 mb-4">Visualizing your primary risk contributors</p>

            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="Risk Level"
                            dataKey="A"
                            stroke="#0d9488"
                            strokeWidth={3}
                            fill="#0d9488"
                            fillOpacity={0.3}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default RiskBreakdown;
