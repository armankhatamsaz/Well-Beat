import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const ActionPlan = ({ metrics }) => {
    const getActions = () => {
        const actions = [];

        if (metrics.sbp >= 130) {
            actions.push({
                priority: 'High',
                title: 'Lower Blood Pressure',
                desc: 'Your systolic BP is elevated. Reduce sodium intake and aim for 30 mins of cardio.',
                color: 'text-rose-600 bg-rose-50 border-rose-100'
            });
        }

        if (metrics.smoking > 0) {
            actions.push({
                priority: 'Critical',
                title: 'Smoking Cessation',
                desc: 'Stopping smoking is the single best thing you can do for your heart.',
                color: 'text-orange-600 bg-orange-50 border-orange-100'
            });
        }

        if (metrics.lipids.total > 200) {
            actions.push({
                priority: 'Medium',
                title: 'Manage Cholesterol',
                desc: 'Total cholesterol is high. Consider a diet rich in fiber and healthy fats.',
                color: 'text-blue-600 bg-blue-50 border-blue-100'
            });
        }

        if (actions.length === 0) {
            actions.push({
                priority: 'Maintenance',
                title: 'Keep it up!',
                desc: 'Your metrics are in a healthy range. Maintain your current lifestyle.',
                color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
            });
        }

        return actions;
    };

    const actions = getActions();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 h-full"
        >
            <h3 className="text-lg font-bold text-deep-blue mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-medical-teal" />
                Personalized Action Plan
            </h3>

            <div className="space-y-4">
                {actions.map((action, index) => (
                    <div
                        key={index}
                        className={`p-4 rounded-xl border ${action.color} transition-all hover:shadow-md hover:border-medical-teal/30`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold">{action.title}</h4>
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50">
                                {action.priority}
                            </span>
                        </div>
                        <p className="text-sm opacity-90 leading-relaxed">{action.desc}</p>
                    </div>
                ))}
            </div>

            <button className="w-full mt-6 py-3 flex items-center justify-center gap-2 text-medical-teal font-bold hover:bg-teal-50 rounded-xl transition-colors">
                View Full Guide <ArrowRight size={18} />
            </button>
        </motion.div>
    );
};

export default ActionPlan;
