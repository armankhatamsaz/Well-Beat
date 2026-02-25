import { create } from 'zustand';

// Helper function to calculate streak
const calculateStreak = (history) => {
    if (!history || history.length === 0) return 0;
    const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    const lastEntryDate = new Date(sortedHistory[0].date).setHours(0, 0, 0, 0);
    const diffDays = (today - lastEntryDate) / (1000 * 60 * 60 * 24);

    if (diffDays > 1) return 0;
    streak = 1;
    let currentDate = lastEntryDate;

    for (let i = 1; i < sortedHistory.length; i++) {
        const entryDate = new Date(sortedHistory[i].date).setHours(0, 0, 0, 0);
        const diff = (currentDate - entryDate) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
            streak++;
            currentDate = entryDate;
        } else if (diff === 0) {
            continue;
        } else {
            break;
        }
    }
    return streak;
};

const calculateAge = (birthDate) => {
    if (!birthDate) return 45;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

export const useHealthStore = create((set, get) => ({
    isAuthenticated: false,
    user: null,
    currentView: 'dashboard',
    streakExtended: false,

    setView: (view) => set({ currentView: view }),
    resetStreakExtended: () => set({ streakExtended: false }),

    userMetrics: {
        age: 45,
        gender: 'male',
        sbp: 120,
        ldl: 100,
        hdl: 50,
        smoker: false,
        diabetes: false,
        familyHistory: false
    },

    assessment: null,

    // --- ۱. گرفتن تاریخچه از AWS هنگام ورود ---
    login: async (userData) => {
        try {
            // اتصال به دیتابیس میلان (آیدی ۱ به عنوان تست)
            const response = await fetch("https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/history/1");
            const dbData = await response.json();
            
            let realHistory = [];
            if (response.ok && dbData.data) {
                realHistory = dbData.data.map(item => ({
                    date: item.test_date,
                    riskScore: item.calculated_risk_score,
                    riskCategory: item.risk_category,
                    metrics: { 
                        age: item.age, gender: item.gender, sbp: item.systolic_bp, 
                        smoker: item.smoker ? 1 : 0, lipids: { total: item.ldl + item.hdl, hdl: item.hdl } 
                    }
                }));
            }

            const currentStreak = calculateStreak(realHistory);
            
            set({
                isAuthenticated: true,
                user: {
                    name: userData.name || 'Alex Doe',
                    email: userData.email || 'alex.doe@example.com',
                    avatar: userData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
                    height: 175,
                    weight: 70,
                    streak: currentStreak,
                    riskGoal: 5,
                    history: realHistory,
                    birthDate: '1980-01-01',
                }
            });
        } catch (error) {
            console.error("Error fetching AWS history:", error);
            // Fallback in case of network error
            set({ isAuthenticated: true, user: { ...userData, history: [], streak: 0 } });
        }
    },

    logout: () => set({ isAuthenticated: false, user: null, assessment: null }),

    updateProfile: (updates) => set((state) => {
        const updatedUser = { ...state.user, ...updates };
        let updatedMetrics = { ...state.userMetrics };
        if (updates.birthDate) {
            updatedMetrics.age = calculateAge(updates.birthDate);
        }
        return { user: updatedUser, userMetrics: updatedMetrics };
    }),

    setMetrics: (metrics) => set((state) => ({
        userMetrics: { ...state.userMetrics, ...metrics }
    })),

    // --- ۲. ارسال دیتا به AWS برای محاسبه ---
    runAssessment: async () => {
        const { userMetrics, user } = get();
        const currentAge = calculateAge(user?.birthDate);
        const metricsWithAge = { ...userMetrics, age: currentAge };

        // پکیج کردن دیتا دقیقاً مطابق مدل پایتون
        const payload = {
            user_id: 1, 
            age: metricsWithAge.age,
            gender: metricsWithAge.gender,
            smoker: metricsWithAge.smoker,
            systolic_bp: metricsWithAge.sbp,
            ldl: metricsWithAge.ldl,
            hdl: metricsWithAge.hdl,
            diabetes: metricsWithAge.diabetes,
            family_history: metricsWithAge.familyHistory
        };

        try {
            const response = await fetch("https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/static", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            // مپ کردن دیتای بک‌اند برای نمایش در فرانت‌اند
            const parsedScore = parseFloat(data.calculated_risk_score);
            const result = {
                riskScore: parsedScore,
                riskCategory: data.risk_category,
                heartAge: metricsWithAge.age + (data.risk_category === "High" ? 10 : data.risk_category === "Intermediate" ? 5 : 0)
            };

            // برای اینکه کدهای اکشن‌پلن الکس کار کنه (تبدیل به فرمت قبلی)
            const legacyMetrics = {
                ...metricsWithAge,
                smoking: metricsWithAge.smoker ? 1 : 0,
                lipids: { total: metricsWithAge.ldl + metricsWithAge.hdl, hdl: metricsWithAge.hdl }
            };

            set({ assessment: result, userMetrics: legacyMetrics });
            
            // فراخوانی ذخیره محلی برای آپدیت گرافیک‌ها
            get().saveAssessment(result, legacyMetrics);

        } catch (error) {
            console.error("AWS Validation/Network Error:", error);
            alert("Error connecting to AWS Server. Check console.");
        }
    },

    saveAssessment: (assessment, legacyMetrics) => {
        const { user } = get();
        if (!assessment || !user) return;

        const newHistoryItem = {
            date: new Date().toISOString(),
            riskScore: assessment.riskScore,
            riskCategory: assessment.riskCategory,
            metrics: legacyMetrics
        };

        const newHistory = [newHistoryItem, ...user.history];
        const newStreak = calculateStreak(newHistory);
        const streakExtended = newStreak > (user.streak || 0);

        set({
            user: { ...user, history: newHistory, streak: newStreak },
            streakExtended
        });
    },

    resetAssessment: () => set({ assessment: null })
}));