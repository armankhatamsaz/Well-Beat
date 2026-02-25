import React from 'react';
import { Info, User, Activity, Scale, Droplet, Cigarette } from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';

const RiskParametersInfo = () => {
    const user = useHealthStore((state) => state.user);
    const userMetrics = useHealthStore((state) => state.userMetrics);

    // Calculate age for display
    const birthDate = user?.birthDate;
    let age = userMetrics.age; // Fallback
    if (birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
    }

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <Info size={20} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Calculation Parameters</h3>
            </div>

            <p className="text-slate-500 mb-8">
                Your heart health risk is calculated using the Framingham model, which combines your static profile data with your daily check-in metrics.
            </p>

            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <User size={20} className="text-slate-400" />
                        <span className="font-medium text-slate-700">Profile Data</span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{age} years, {userMetrics.gender}</p>
                        <p className="text-xs text-slate-400">Static (from Profile)</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Daily Inputs</h4>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 border border-slate-100 rounded-xl flex items-center gap-2">
                            <Activity size={16} className="text-rose-500" />
                            <span className="text-sm font-medium text-slate-600">Blood Pressure</span>
                        </div>
                        <div className="p-3 border border-slate-100 rounded-xl flex items-center gap-2">
                            <Scale size={16} className="text-blue-500" />
                            <span className="text-sm font-medium text-slate-600">Weight</span>
                        </div>
                        <div className="p-3 border border-slate-100 rounded-xl flex items-center gap-2">
                            <Droplet size={16} className="text-amber-500" />
                            <span className="text-sm font-medium text-slate-600">Cholesterol</span>
                        </div>
                        <div className="p-3 border border-slate-100 rounded-xl flex items-center gap-2">
                            <Cigarette size={16} className="text-slate-500" />
                            <span className="text-sm font-medium text-slate-600">Smoking</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiskParametersInfo;
