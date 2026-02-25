import React, { useState, useEffect } from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { motion } from 'framer-motion';
import { User, Save, ArrowLeft } from 'lucide-react';
import CalendarView from './CalendarView';
import TrendChart from './TrendChart';

        // ارسال درخواست به آمازون
const ProfileView = () => {
    const user = useHealthStore((state) => state.user);
    const updateProfile = useHealthStore((state) => state.updateProfile);
    const setView = useHealthStore((state) => state.setView);
    const assessment = useHealthStore((state) => state.assessment);

    const [formData, setFormData] = useState(user || {});

    useEffect(() => {
        if (user) setFormData(user);
    }, [user]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        updateProfile(formData);
    };

    return (
        <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView(assessment ? 'assessment' : 'dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-deep-blue">Personal Profile</h2>
                        <p className="text-slate-500">Manage your health data and view history</p>
                    </div>
                </div>
            </motion.div>

            <div className="space-y-8">
                <div className="w-full">
                    {user?.history && <TrendChart data={user.history} goal={user?.riskGoal} />}
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
                    <h3 className="text-lg font-bold text-deep-blue mb-6 flex items-center gap-2">
                        <User size={20} className="text-medical-teal" />
                        Profile Details
                    </h3>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600">Display Name</label>
                                <input type="text" value={formData.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">Height (cm)</label>
                                    <input type="number" value={formData.height || ''} onChange={(e) => handleChange('height', Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">Weight (kg)</label>
                                    <input type="number" value={formData.weight || ''} onChange={(e) => handleChange('weight', Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={handleSave} className="px-8 py-3 bg-medical-teal hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-medical-teal/30 flex items-center gap-2 transition-all active:scale-[0.98]">
                                <Save size={20} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full">
                    <CalendarView />
                </div>
            </div>
        </div>
    );
};

export default ProfileView;