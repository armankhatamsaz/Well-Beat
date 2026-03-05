import React from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import CalendarView from './CalendarView';
import TrendChart from './TrendChart';

const ProfileView = () => {
    const user = useHealthStore((state) => state.user);
    const setView = useHealthStore((state) => state.setView);
    const assessment = useHealthStore((state) => state.assessment);

    return (
        <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView(assessment ? 'assessment' : 'dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-deep-blue">Personal Profile</h2>
                        <p className="text-slate-500">View your health history and trends</p>
                    </div>
                </div>
            </motion.div>

            <div className="space-y-8">
                <div className="w-full">
                    {user?.history && <TrendChart data={user.history} goal={user?.riskGoal} />}
                </div>

                <div className="w-full">
                    <CalendarView />
                </div>
            </div>
        </div>
    );
};

export default ProfileView;