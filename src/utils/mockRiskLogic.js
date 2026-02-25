export const calculateRisk = (metrics) => {
    const { age, gender, sbp, lipids, smoking } = metrics;

    // Simple mock logic to generate "realistic" looking data
    // This is NOT medically accurate

    let baseRisk = 0;

    // Age factor
    if (age > 40) baseRisk += (age - 40) * 0.2;

    // Gender factor (arbitrary mock adjustment)
    if (gender === 'male') baseRisk += 2;

    // SBP factor
    if (sbp > 120) baseRisk += (sbp - 120) * 0.1;

    // Lipids factor (Total Cholesterol)
    // Assuming lipids is an object { total, hdl }
    if (lipids.total > 180) baseRisk += (lipids.total - 180) * 0.05;
    if (lipids.hdl < 40) baseRisk += 2;

    // Smoking factor
    if (smoking > 0) {
        baseRisk += smoking * 0.2; // 0.2% per cigarette roughly
        if (smoking > 20) baseRisk += 2; // Heavy smoker penalty
    }

    // Clamp risk
    const riskScore = Math.min(Math.max(baseRisk, 1), 30).toFixed(1);

    let riskCategory = 'Low';
    if (riskScore >= 10) riskCategory = 'Moderate';
    if (riskScore >= 20) riskCategory = 'High';

    // Heart Age
    const heartAge = Math.floor(age + (riskScore * 0.5));

    // Generate mock history
    const history = [];
    const currentYear = new Date().getFullYear();
    for (let i = 4; i >= 0; i--) {
        history.push({
            year: currentYear - i,
            risk: Math.max(0, parseFloat(riskScore) - (Math.random() * 2) + (i * 0.2)).toFixed(1)
        });
    }

    return {
        riskScore,
        riskCategory,
        heartAge,
        history
    };
};
