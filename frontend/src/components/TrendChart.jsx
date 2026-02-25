import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';

const TrendChart = ({ data, goal }) => {
    // Format data for chart
    const chartData = data ? [...data].reverse().map(item => ({
        ...item,
        dateFormatted: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })) : [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 bg-white rounded-3xl shadow-xl border border-slate-200 h-[400px] flex flex-col"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-deep-blue">Risk Trend</h3>
                    <p className="text-sm text-slate-500">Your heart health evolution over time</p>
                </div>
                {goal && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 text-medical-teal rounded-full text-sm font-medium border border-teal-100">
                        <span>Target: {goal}%</span>
                    </div>
                )}
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="dateFormatted"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                            labelStyle={{ color: '#64748b', marginBottom: '0.5rem' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="riskScore"
                            name="Risk Score"
                            stroke="#0d9488"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorRisk)"
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        {goal && (
                            <ReferenceLine
                                y={goal}
                                stroke="#10b981"
                                strokeDasharray="4 4"
                                strokeWidth={2}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default TrendChart;
