import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, X, Sparkles, AlertCircle } from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';

const ActionPlan = ({ metrics }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const assessment = useHealthStore((state) => state.assessment);

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
        <>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 h-full flex flex-col"
            >
                <h3 className="text-lg font-bold text-deep-blue mb-6 flex items-center gap-2">
                    <CheckCircle2 className="text-medical-teal" />
                    Personalized Action Plan
                </h3>

                <div className="space-y-4 flex-1">
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

                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full mt-6 py-3 flex items-center justify-center gap-2 text-medical-teal font-bold hover:bg-teal-50 rounded-xl transition-colors"
                >
                    View Full Guide <ArrowRight size={18} />
                </button>
            </motion.div>

            {/* Modal - Full Guide */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                                <h2 className="text-xl font-bold text-deep-blue flex items-center gap-2">
                                    <Sparkles className="text-medical-teal" />
                                    Comprehensive Health Guide
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto space-y-8">
                                {/* Static Actions */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Baseline Interventions</h3>
                                    <div className="grid gap-3">
                                        {actions.map((act, i) => (
                                            <div key={i} className={`p-4 rounded-xl border ${act.color}`}>
                                                <h4 className="font-bold mb-1">{act.title}</h4>
                                                <p className="text-sm opacity-90">{act.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic AWS Recommendations */}
                                {assessment?.recommendations && assessment.recommendations.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <AlertCircle className="text-blue-500" size={20} />
                                            AI-Generated Medical Insights
                                        </h3>
                                        <div className="space-y-3">
                                            {assessment.recommendations.map((rec, i) => (
                                                <div key={i} className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-sm font-medium leading-relaxed flex items-start gap-3 shadow-sm">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                                    {rec}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ActionPlan;