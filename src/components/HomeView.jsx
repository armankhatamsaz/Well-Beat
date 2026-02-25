import React from 'react';
import { Check, Clock } from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import AssessmentInputForm from './AssessmentInputForm';
import RiskModelInfo from './RiskModelInfo';
import StreakSuccessModal from './StreakSuccessModal';

const HomeView = () => {
    const user = useHealthStore((state) => state.user);
    const streakExtended = useHealthStore((state) => state.streakExtended);
    const resetStreakExtended = useHealthStore((state) => state.resetStreakExtended);

    const handleCloseModal = () => {
        resetStreakExtended();
    };

    const today = new Date().setHours(0, 0, 0, 0);
    const lastEntryDate = user?.history?.[0]?.date ? new Date(user.history[0].date).setHours(0, 0, 0, 0) : null;
    const isCheckedInToday = lastEntryDate === today;

    return (
        <>
            {streakExtended && <StreakSuccessModal onClose={handleCloseModal} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
                {/* Left Column: Greeting & Info */}
                <div className="flex flex-col gap-8">
                    <div>
                        <h1 className="text-4xl font-bold text-deep-blue mb-2">Good Morning, {user?.name?.split(' ')[0]}! ☀️</h1>
                        <div className="flex items-center gap-4">
                            <p className="text-lg text-slate-500">Ready to check in on your heart health?</p>
                            {isCheckedInToday ? (
                                <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 text-medical-teal rounded-full text-sm font-bold border border-teal-100">
                                    <Check size={16} />
                                    Check-in Complete
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm font-bold border border-amber-100">
                                    <Clock size={16} />
                                    Pending
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1">
                        <RiskModelInfo />
                    </div>
                </div>

                {/* Right Column: Input Form */}
                <div className="h-full">
                    <AssessmentInputForm />
                </div>
            </div>
        </>
    );
};

export default HomeView;
