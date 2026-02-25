import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Droplet, User, Calendar, Cigarette, AlertCircle } from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';

const AssessmentInputForm = () => {
    const userMetrics = useHealthStore((state) => state.userMetrics);
    const setMetrics = useHealthStore((state) => state.setMetrics);
    const runAssessment = useHealthStore((state) => state.runAssessment);
    const setView = useHealthStore((state) => state.setView);
    const updateProfile = useHealthStore((state) => state.updateProfile);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        age: userMetrics.age || 45,
        gender: userMetrics.gender || 'male',
        sbp: userMetrics.sbp || 120,
        smoker: userMetrics.smoker || false,
        ldl: userMetrics.ldl || 100,
        hdl: userMetrics.hdl || 50,
        diabetes: userMetrics.diabetes || false,
        familyHistory: userMetrics.familyHistory || false
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCalculate = async () => {
        setIsLoading(true);
        setMetrics({
            age: Number(formData.age),
            gender: formData.gender,
            sbp: Number(formData.sbp),
            smoker: formData.smoker === 'true' || formData.smoker === true,
            ldl: Number(formData.ldl),
            hdl: Number(formData.hdl),
            diabetes: formData.diabetes === 'true' || formData.diabetes === true,
            familyHistory: formData.familyHistory === 'true' || formData.familyHistory === true
        });

        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - Number(formData.age);
        const mockBirthDate = `${birthYear}-01-01`;

        updateProfile({ birthDate: mockBirthDate, gender: formData.gender });

        // ارسال درخواست به آمازون
        await runAssessment();
        
        setIsLoading(false);
        setView('assessment');
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 h-full overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Enter Medical Data</h3>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Calendar size={18} className="text-slate-500" /> Age
                        </label>
                        <input type="number" value={formData.age} onChange={(e) => handleChange('age', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none font-medium" />
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
                        <input type="number" value={formData.ldl} onChange={(e) => handleChange('ldl', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium" />
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Droplet size={18} className="text-emerald-500" /> HDL Chol.
                        </label>
                        <input type="number" value={formData.hdl} onChange={(e) => handleChange('hdl', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
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
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><User size={18} className="text-indigo-500" /> Family Hist.</label>
                        <select value={formData.familyHistory} onChange={(e) => handleChange('familyHistory', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium">
                            <option value={false}>No</option>
                            <option value={true}>Yes</option>
                        </select>
                    </div>
                </div>

                <button onClick={handleCalculate} disabled={isLoading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-4 disabled:opacity-50">
                    <Activity size={20} />
                    {isLoading ? "Calculating on AWS..." : "Calculate & Save"}
                </button>
            </div>
        </motion.div>
    );
};

export default AssessmentInputForm;