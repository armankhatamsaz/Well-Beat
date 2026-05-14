import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { useHealthStore } from '../store/useHealthStore';

const RiskBreakdown = ({ metrics }) => {
    const assessment = useHealthStore((state) => state.assessment);

    // Normalize metrics to a 0-100 scale where 100 is "High Risk"
    const data = [
        {
            subject: 'Systolic BP (mmHg)',
            A: Math.min(100, Math.max(0, (metrics.sbp - 110) * 2)), 
            fullMark: 100,
        },
        {
            subject: 'LDL (mg/dL)',
            A: Math.min(100, Math.max(0, (metrics.ldl - 100) * 1.5)), 
            fullMark: 100,
        },
        {
            subject: 'Smoking',
            A: metrics.smoking > 0 ? 100 : 0,
            fullMark: 100,
        },
        {
            subject: 'Age',
            A: Math.min(100, Math.max(0, (metrics.age - 30) * 1.5)), 
            fullMark: 100,
        },
        {
            subject: 'HDL (mg/dL)',
            A: Math.min(100, Math.max(0, (60 - metrics.lipids.hdl) * 3)), 
            fullMark: 100,
        },
        {
            subject: 'BMI (kg/m²)',
            A: assessment?.bmi ? Math.min(100, Math.max(0, (assessment.bmi - 24) * 10)) : 0,
            fullMark: 100,
        },
        {
            subject: 'ApoB (mg/dL)',
            A: assessment?.apoB ? Math.min(100, Math.max(0, (assessment.apoB - 80) * 2)) : 0,
            fullMark: 100,
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 h-full flex flex-col"
        >
            <h3 className="text-lg font-bold text-deep-blue mb-2">Risk Factor Breakdown</h3>
            <p className="text-sm text-slate-500 mb-4">Visualizing your primary risk contributors with clinical units</p>

            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
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