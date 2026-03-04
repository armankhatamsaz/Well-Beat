import React from 'react';
import { Info, User, Activity, HeartPulse, Wind } from 'lucide-react';

const RiskModelInfo = () => {
    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <Info size={20} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">How it works</h3>
            </div>

            <p className="text-slate-500 mb-8 leading-relaxed">
                We use the <strong>Framingham Risk Score</strong> model to estimate your 10-year risk of heart disease. This medically validated algorithm combines your static profile data with your daily health metrics.
            </p>

            <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <User size={18} className="text-blue-500" />
                        Profile Factors
                    </h4>
                    <p className="text-sm text-slate-500">
                        Your <strong>Age</strong>, <strong>Gender</strong>, and <strong>BMI</strong> (Height & Weight) provide the baseline for the calculation. You can enter these directly in the form.
                    </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Activity size={18} className="text-rose-500" />
                        Daily Metrics
                    </h4>
                    <ul className="text-sm text-slate-500 space-y-2">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                            Systolic Blood Pressure
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                            Cholesterol Levels (LDL & HDL)
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            Smoking Habits & Diabetes
                        </li>
                    </ul>
                </div>

                {/* New TRR Section */}
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                        <HeartPulse size={18} className="text-purple-600" />
                        Advanced Factors (TRR)
                    </h4>
                    <ul className="text-sm text-purple-700 space-y-2">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                            Arrhythmia (Irregular Heartbeat)
                        </li>
                        <li className="flex items-center gap-2">
                            <Wind size={14} className="text-purple-500" />
                            High Pollution Exposure (AQI)
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RiskModelInfo;