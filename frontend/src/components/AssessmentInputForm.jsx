import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Droplet, User, Calendar, Cigarette, AlertCircle, Wind, HeartPulse, Users } from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { useAuth } from 'react-oidc-context'; // 👈 اضافه شدن هوک بادیگارد آمازون

const AssessmentInputForm = () => {
    const auth = useAuth(); // 👈 نمونه‌سازی برای استخراج توکن زنده کاربر
    const userMetrics = useHealthStore((state) => state.userMetrics);
    const setMetrics = useHealthStore((state) => state.setMetrics);
    const runAssessment = useHealthStore((state) => state.runAssessment);
    const setView = useHealthStore((state) => state.setView);
    const updateProfile = useHealthStore((state) => state.updateProfile);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        age: userMetrics.age || 45,
        gender: userMetrics.gender || 'male',
        sbp: userMetrics.sbp || 120,
        smoker: userMetrics.smoker || false,
        ldl: userMetrics.ldl || 100,
        hdl: userMetrics.hdl || 50,
        diabetes: userMetrics.diabetes || false,
        familyHistory: userMetrics.familyHistory || false,
        height: userMetrics.height || 175,
        weight: userMetrics.weight || 70,
        arrhythmia: userMetrics.arrhythmia || false,
        highPollution: userMetrics.high_pollution_exposure || false
    });

    const handleChange = (field, value) => {
        setError(""); 
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCalculate = async () => {
        if (formData.age < 20 || formData.age > 100) {
            setError("Age must be between 20 and 100.");
            return;
        }
        if (formData.ldl < 10 || formData.ldl > 400 || formData.hdl < 10 || formData.hdl > 150) {
            setError("Lipid values are out of physiological range.");
            return;
        }

        setIsLoading(true);
        setMetrics({
            age: Number(formData.age),
            gender: formData.gender,
            sbp: Number(formData.sbp),
            smoker: formData.smoker === 'true' || formData.smoker === true,
            ldl: Number(formData.ldl),
            hdl: Number(formData.hdl),
            diabetes: formData.diabetes === 'true' || formData.diabetes === true,
            familyHistory: formData.familyHistory === 'true' || formData.familyHistory === true,
            height: Number(formData.height),
            weight: Number(formData.weight),
            arrhythmia: formData.arrhythmia === 'true' || formData.arrhythmia === true,
            high_pollution_exposure: formData.highPollution === 'true' || formData.highPollution === true
        });

        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - Number(formData.age);
        const mockBirthDate = `${birthYear}-01-01`;

        updateProfile({ birthDate: mockBirthDate, gender: formData.gender });

        // 👈 استخراج آیدی توکن دریافتی از آمازون کوگنیتو بعد از ورود کاربر
        const token = auth.user?.id_token;

        await runAssessment(token); // 👈 ارسال توکن به تابع برای تزریق در هدر درخواست
        
        setIsLoading(false);
        setView('assessment');
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 h-full overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Enter Medical Data</h3>

            {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Calendar size={18} className="text-slate-500" /> Age
                        </label>
                        <input type="number" min="20" max="100" value={formData.age} onChange={(e) => handleChange('age', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none font-medium" />
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <User size={18} className="text-blue-500" /> Gender
                        </label>
                        <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium">
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            Height (cm)
                        </label>
                        <input type="number" value={formData.height} onChange={(e) => handleChange('height', e.target.value)} min="50" max="250" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none font-medium" />
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            Weight (kg)
                        </label>
                        <input type="number" value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} min="20" max="300" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none font-medium" />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Activity size={18} className="text-rose-500" /> Systolic Blood Pressure
                    </label>
                    <div className="flex items-center gap-4">
                        <input type="range" min="80" max="250" value={formData.sbp} onChange={(e) => handleChange('sbp', e.target.value)} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                        <div className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-900">{formData.sbp}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Droplet size={18} className="text-amber-500" /> LDL Chol.
                        </label>
                        <input type="number" min="10" max="400" value={formData.ldl} onChange={(e) => handleChange('ldl', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium" />
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Droplet size={18} className="text-emerald-500" /> HDL Chol.
                        </label>
                        <input type="number" min="10" max="150" value={formData.hdl} onChange={(e) => handleChange('hdl', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><Cigarette size={18} className="text-slate-500" /> Smoker</label>
                        <select value={formData.smoker} onChange={(e) => handleChange('smoker', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium">
                            <option value={false}>No</option>
                            <option value={true}>Yes</option>
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><AlertCircle size={18} className="text-purple-500" /> Diabetes</label>
                        <select value={formData.diabetes} onChange={(e) => handleChange('diabetes', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium">
                            <option value={false}>No</option>
                            <option value={true}>Yes</option>
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><Users size={18} className="text-indigo-500" /> Family Hist.</label>
                        <select value={formData.familyHistory} onChange={(e) => handleChange('familyHistory', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium">
                            <option value={false}>No</option>
                            <option value={true}>Yes</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 mt-2">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-rose-600"><HeartPulse size={18} /> Arrhythmia</label>
                        <select value={formData.arrhythmia} onChange={(e) => handleChange('arrhythmia', e.target.value)} className="w-full p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl outline-none font-medium focus:ring-2 focus:ring-rose-500">
                            <option value={false}>No</option>
                            <option value={true}>Yes</option>
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><Wind size={18} className="text-slate-400" /> High Pollution</label>
                        <select value={formData.highPollution} onChange={(e) => handleChange('highPollution', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none font-medium focus:ring-2 focus:ring-slate-500">
                            <option value={false}>No</option>
                            <option value={true}>Yes</option>
                        </select>
                    </div>
                </div>

                <button onClick={handleCalculate} disabled={isLoading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-4 disabled:opacity-50">
                    <Activity size={20} />
                    {isLoading ? "Validating & Calculating..." : "Calculate & Save"}
                </button>
            </div>
        </motion.div>
    );
};

export default AssessmentInputForm;