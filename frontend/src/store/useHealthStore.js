import { create } from 'zustand';
import { validateRiskInput, invalidFieldNames } from '../utils/validation';

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

// One shape for the user object on every path through login(). The failure paths
// used to build a thinner object that was missing birthDate, riskGoal and avatar,
// which quietly changed how age and the trend goal were derived after an error.
const buildUser = (userData, history) => ({
    name: userData.name,
    email: userData.email,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${userData.name || userData.email}&backgroundColor=2563eb&textColor=ffffff`,
    height: 175,
    weight: 70,
    streak: calculateStreak(history),
    riskGoal: 5,
    history,
    birthDate: '1980-01-01',
});

// --- موتور هش با سقف امنیتی دیتابیس ---
const generateUserId = (email) => {
    if (!email) return 1;
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 2147483647; 
};

export const useHealthStore = create((set, get) => ({
    isAuthenticated: false,
    user: null,
    currentView: 'dashboard',
    streakExtended: false,
    // null when the history request succeeded. 'expired' when the session could not
    // be renewed, 'failed' for anything else. An empty history with historyError
    // null means the user genuinely has no assessments.
    historyError: null,

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
        familyHistory: false,
        height: 175,
        weight: 70,
        arrhythmia: false,
        high_pollution_exposure: false
    },

    assessment: null,

    login: async (userData, token, refreshToken) => { // 👈 توکن امنیتی اینجا دریافت می‌شود
        const uniqueUserId = generateUserId(userData.email);

        const fetchHistory = (bearer) => fetch(
            `https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/history/${uniqueUserId}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${bearer}` // 👈 ارسال توکن برای دریافت تاریخچه
                }
            }
        );

        try {
            let response = await fetchHistory(token);

            // One retry, and only one. The gateway authorizer answers 401 for an
            // expired token; ask the OIDC client for a fresh one and try again.
            if (response.status === 401 && typeof refreshToken === 'function') {
                const renewed = await refreshToken().catch(() => null);
                if (renewed) {
                    response = await fetchHistory(renewed);
                }
            }

            // Still 401 after the retry: the session is genuinely gone. Surface it
            // rather than presenting an empty history as if it were the truth.
            if (response.status === 401) {
                set({ isAuthenticated: true, historyError: 'expired', user: buildUser(userData, []) });
                return;
            }

            if (!response.ok) {
                console.error("History request failed with HTTP", response.status);
                set({ isAuthenticated: true, historyError: 'failed', user: buildUser(userData, []) });
                return;
            }

            const dbData = await response.json();

            let realHistory = [];
            if (dbData.data) {
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

            set({ isAuthenticated: true, historyError: null, user: buildUser(userData, realHistory) });
        } catch (error) {
            // Network-level failure. No health data is logged, only the error itself.
            console.error("Error fetching AWS history:", error);
            set({ isAuthenticated: true, historyError: 'failed', user: buildUser(userData, []) });
        }
    },

    logout: () => set({ isAuthenticated: false, user: null, assessment: null, historyError: null }),

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

    runAssessment: async (token) => { // 👈 توکن امنیتی اینجا دریافت می‌شود
        const { userMetrics, user } = get();
        const currentAge = calculateAge(user?.birthDate);
        const metricsWithAge = { ...userMetrics, age: currentAge };
        
        const uniqueUserId = generateUserId(user?.email);

        const payload = {
            user_id: uniqueUserId, 
            age: metricsWithAge.age,
            gender: metricsWithAge.gender,
            smoker: metricsWithAge.smoker,
            systolic_bp: metricsWithAge.sbp,
            ldl: metricsWithAge.ldl,
            hdl: metricsWithAge.hdl,
            diabetes: metricsWithAge.diabetes,
            family_history: metricsWithAge.familyHistory,
            height: metricsWithAge.height || 175,
            weight: metricsWithAge.weight || 70,
            arrhythmia: metricsWithAge.arrhythmia || false,
            high_pollution_exposure: metricsWithAge.high_pollution_exposure || false
        };

        // Second validation gate. The form checks its own fields, but this is the
        // single place every assessment request passes through, so the guarantee
        // that only plausible data reaches the API is enforced here. The server
        // still validates independently; this does not replace it.
        const validation = validateRiskInput(payload);
        if (!validation.success) {
            // Field names only. The values are health data and must never be logged.
            console.error(
                "Assessment blocked by client-side validation. Invalid fields:",
                invalidFieldNames(validation.fieldErrors).join(", ")
            );
            return;
        }

        try {
            const response = await fetch("https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/static", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": token ? `Bearer ${token}` : "" // 👈 ارسال توکن به عنوان هدر برای اندپونیت اصلی
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                 const errorData = await response.json();
                 console.error("AWS Validation Error Details:", errorData);
                 throw new Error("Validation Error from AWS");
            }
            
            const data = await response.json();
            const parsedScore = parseFloat(data.calculated_risk_score);
            
            const result = {
                riskScore: parsedScore,
                riskCategory: data.risk_category,
                heartAge: data.heart_age, 
                apoB: data.estimated_apo_b, 
                bmi: data.bmi, 
                recommendations: data.recommendations
            };

            const legacyMetrics = {
                ...metricsWithAge,
                smoking: metricsWithAge.smoker ? 1 : 0,
                lipids: { total: metricsWithAge.ldl + metricsWithAge.hdl, hdl: metricsWithAge.hdl }
            };

            set({ assessment: result, userMetrics: legacyMetrics });
            get().saveAssessment(result, legacyMetrics);

        } catch (error) {
            console.error("AWS Request Failed:", error);
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