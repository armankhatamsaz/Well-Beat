import React, { useState } from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Mail, Lock, User, ArrowRight, Activity } from 'lucide-react';
import medicalBg from '../assets/medical_login_bg.png';

const Login = () => {
    const login = useHealthStore((state) => state.login);
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.email && formData.password) {
            login({
                name: formData.name || 'User',
                email: formData.email,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.email}`
            });
        }
    };

    const handleGoogleLogin = () => {
        login({
            name: 'Alex Doe',
            email: 'alex.doe@example.com',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
        });
    };

    return (
        <div className="min-h-screen flex bg-soft-surface">
            {/* Left Side - Image & Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-deep-blue">
                <div className="absolute inset-0 bg-gradient-to-br from-medical-teal/40 to-deep-blue/90 z-10" />
                <img
                    src={medicalBg}
                    alt="Medical Background"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
                />

                <div className="relative z-20 flex flex-col justify-between h-full p-12 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                            <Activity className="text-medical-teal" size={24} />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">WellBeat</span>
                    </div>

                    <div className="max-w-md">
                        <h2 className="text-4xl font-bold mb-6 leading-tight">
                            Advanced Cardiac Health Monitoring
                        </h2>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            Join thousands of users who trust WellBeat for real-time heart analysis, risk assessment, and personalized health insights.
                        </p>
                    </div>

                    <div className="flex gap-4 text-sm text-slate-400">
                        <span>© 2024 WellBeat Health</span>
                        <span>Privacy Policy</span>
                        <span>Terms of Service</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
                <motion.div
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-md space-y-8"
                >
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="w-12 h-12 bg-medical-teal rounded-xl flex items-center justify-center text-white shadow-lg shadow-medical-teal/30">
                                <Heart size={24} fill="currentColor" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-deep-blue mb-2">
                            {isRegistering ? 'Create Account' : 'Welcome Back'}
                        </h1>
                        <p className="text-slate-500">
                            {isRegistering
                                ? 'Start your heart health journey today.'
                                : 'Sign in to access your health dashboard.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <AnimatePresence mode="popLayout">
                            {isRegistering && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="relative group">
                                        <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-medical-teal transition-colors" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-medical-teal transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="Email Address"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all"
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-medical-teal transition-colors" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3.5 bg-medical-teal hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-medical-teal/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
                        >
                            <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                            <ArrowRight size={20} />
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-soft-surface text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-3"
                    >
                        <img
                            src="https://www.google.com/favicon.ico"
                            alt="Google"
                            className="w-5 h-5"
                        />
                        <span>Google</span>
                    </button>

                    <div className="text-center">
                        <p className="text-slate-600">
                            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                            <button
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="ml-2 text-medical-teal font-bold hover:text-teal-700 transition-colors"
                            >
                                {isRegistering ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
