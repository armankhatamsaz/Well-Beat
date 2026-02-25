import React from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import RiskCard from './RiskCard';
import HeartAge from './HeartAge';
import RiskBreakdown from './RiskBreakdown';
import ActionPlan from './ActionPlan';
import StreakSuccessModal from './StreakSuccessModal';

const Dashboard = () => {
    const assessment = useHealthStore((state) => state.assessment);
    const userMetrics = useHealthStore((state) => state.userMetrics);
    const resetAssessment = useHealthStore((state) => state.resetAssessment);
    const saveAssessment = useHealthStore((state) => state.saveAssessment);
    const setView = useHealthStore((state) => state.setView);
    const streakExtended = useHealthStore((state) => state.streakExtended);
    const resetStreakExtended = useHealthStore((state) => state.resetStreakExtended);

    if (!assessment) return null;



    const handleCloseModal = () => {
        resetStreakExtended();
    };

    const handleProfile = () => {
        setView('profile');
    };

    return (
        <>
            {streakExtended && <StreakSuccessModal onClose={handleCloseModal} />}

            <div className="space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <div>
                        <h2 className="text-3xl font-bold text-deep-blue">Your Assessment</h2>
                        <p className="text-slate-500">Based on your provided metrics</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={resetAssessment}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-deep-blue hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        >
                            <ArrowLeft size={20} />
                            Recalculate
                        </button>
                        <button
                            onClick={handleProfile}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-deep-blue hover:border-medical-teal/50 hover:text-medical-teal hover:bg-slate-50 rounded-xl transition-all font-bold shadow-sm"
                        >
                            <User size={20} />
                            Profile
                        </button>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RiskCard score={assessment.riskScore} category={assessment.riskCategory} />
                    <HeartAge realAge={userMetrics.age} heartAge={assessment.heartAge} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RiskBreakdown metrics={userMetrics} />
                    <ActionPlan metrics={userMetrics} />
                </div>
            </div>
        </>
    );
};

export default Dashboard;
