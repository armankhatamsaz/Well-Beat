from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel
import uvicorn
import math

# --- 1. تنظیمات پایگاه داده ---
DATABASE_URL = "postgresql://wellbeat_admin:jodke5-qipqew-cokveQ@well-beat-db.cxm8ui4akb82.eu-south-1.rds.amazonaws.com:5432/wellbeatdb" # آدرس خودت رو بذار

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI(title="WELL-BEAT API - Advanced Continuous Engine")

# --- 2. مدل‌های ورودی ---
class RiskInputSchema(BaseModel):
    user_id: int
    age: int
    gender: str 
    smoker: bool
    systolic_bp: int
    ldl: int
    hdl: int
    diabetes: bool
    family_history: bool

# --- 3. موتور محاسباتی پیشرفته (Continuous Framingham Model) ---
def calculate_continuous_risk(data: RiskInputSchema):
    # تخمین کلسترول کل بر اساس LDL و HDL
    total_chol = data.ldl + data.hdl + 30 
    
    is_male = data.gender.lower() == 'male'
    
    # متغیرهای لگاریتمی
    ln_age = math.log(data.age)
    ln_chol = math.log(total_chol)
    ln_hdl = math.log(data.hdl)
    ln_sbp = math.log(data.systolic_bp)
    
    if is_male:
        # ضرایب دقیق (Beta coefficients) برای مردان
        sum_beta = (3.06117 * ln_age) + (1.12370 * ln_chol) - (0.93263 * ln_hdl) + (1.93303 * ln_sbp)
        if data.smoker: sum_beta += 0.65451
        if data.diabetes: sum_beta += 0.57367
        
        # مقادیر ثابت مدل مردان
        mean_beta = 23.9802
        baseline_survival = 0.88936
    else:
        # ضرایب دقیق (Beta coefficients) برای زنان
        sum_beta = (2.32888 * ln_age) + (1.20904 * ln_chol) - (0.70833 * ln_hdl) + (2.76157 * ln_sbp)
        if data.smoker: sum_beta += 0.52873
        if data.diabetes: sum_beta += 0.69154
        
        # مقادیر ثابت مدل زنان
        mean_beta = 26.1931
        baseline_survival = 0.95012

    # محاسبه نهایی با فرمول نمایی
    risk_prob = 1 - (baseline_survival ** math.exp(sum_beta - mean_beta))
    risk_percentage = min(round(risk_prob * 100, 1), 100.0) # تبدیل به درصد و رند کردن
    
    # دسته‌بندی
    if risk_percentage < 10.0: category = "Low"
    elif 10.0 <= risk_percentage < 20.0: category = "Intermediate"
    else: category = "High"
    
    return risk_percentage, category

# --- 4. رابط API (What-if Analysis) ---
@app.post("/risk/static")
def get_static_risk(data: RiskInputSchema):
    current_risk, risk_category = calculate_continuous_risk(data)
    recommendations = []
    
    # تحلیل کاهش ریسک با قطع سیگار
    if data.smoker:
        ideal_data = data.copy()
        ideal_data.smoker = False
        ideal_risk, _ = calculate_continuous_risk(ideal_data)
        reduction = round(current_risk - ideal_risk, 1)
        if reduction > 0:
            recommendations.append(f"Quitting smoking could lower your 10-year CVD risk by {reduction}%.")
            
    # تحلیل کاهش ریسک با کنترل فشار خون
    if data.systolic_bp > 120:
        ideal_data = data.copy()
        ideal_data.systolic_bp = 120
        ideal_risk, _ = calculate_continuous_risk(ideal_data)
        reduction = round(current_risk - ideal_risk, 1)
        if reduction > 0:
            recommendations.append(f"Lowering your blood pressure to 120 mmHg could reduce your risk by {reduction}%.")

    if risk_category == "Low": checkup = "Every 5 years"
    elif risk_category == "Intermediate": checkup = "Annually (Every 12 Months)"
    else: checkup = "Every 6 months"

    return {
        "calculated_risk_score": f"{current_risk}%",
        "risk_category": risk_category,
        "recommendations": recommendations,
        "suggested_checkup": checkup
    }