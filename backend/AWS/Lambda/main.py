from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, Field
from mangum import Mangum
import math
from datetime import datetime

# --- 1. Database Configuration ---
DATABASE_URL = "postgresql://wellbeat_admin:jodke5-qipqew-cokveQ@well-beat-db.cxm8ui4akb82.eu-south-1.rds.amazonaws.com:5432/wellbeatdb" 

# تنظیمات بهینه برای کاهش تاخیر در اولین اتصال
engine = create_engine(
    DATABASE_URL,
    pool_size=1,           # در محیط سرورلس نیازی به استخر بزرگ نداریم
    max_overflow=0,
    pool_recycle=3600,
    pool_pre_ping=True,    # قبل از استفاده سلامت اتصال را چک می‌کند
    connect_args={
        "connect_timeout": 5 # زمان انتظار برای اتصال را محدود می‌کند
    }
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 2. Database Models ---
class RiskResultDB(Base):
    __tablename__ = "risk_results"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    age = Column(Integer)
    gender = Column(String)
    smoker = Column(Boolean)
    systolic_bp = Column(Integer)
    ldl = Column(Integer)
    hdl = Column(Integer)
    diabetes = Column(Boolean)
    family_history = Column(Boolean)
    
    # TRR Fields
    bmi = Column(Float)
    arrhythmia = Column(Boolean)
    high_pollution_exposure = Column(Boolean)
    
    calculated_risk_score = Column(Float)
    risk_category = Column(String)
    test_date = Column(DateTime, default=datetime.utcnow)

app = FastAPI(title="WELL-BEAT API - Advanced TRR Version")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- دکمه‌ی جادویی برای حل مشکل دیتابیس (فقط برای مواقع اضطراری) ---
@app.get("/reset-db")
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"message": "Database successfully reset and updated to TRR schema!"}

# --- 3. Input Models (Updated for TRR) ---
class RiskInputSchema(BaseModel):
    user_id: int
    age: int = Field(..., ge=20, le=100) # سن بین ۱ تا ۱۲۰
    gender: str 
    height: float = Field(..., ge=50, le=250)
    weight: float = Field(..., ge=11, le=300)
    smoker: bool
    systolic_bp: int = Field(..., ge=60, le=250) # فشار خون منطقی
    ldl: int = Field(..., ge=10, le=500)
    hdl: int = Field(..., ge=5, le=150)
    diabetes: bool
    family_history: bool
    arrhythmia: bool
    high_pollution_exposure: bool

# --- 4. Engine (With BMI, ApoB, Heart Age & New Factors) ---
def calculate_continuous_risk(data: RiskInputSchema):
    total_chol = data.ldl + data.hdl + 30 
    is_male = data.gender.lower() == 'male'
    
    # 1. Calculate BMI
    bmi = data.weight / ((data.height / 100) ** 2)
    
    # 2. Calculate Apolipoprotein B (ApoB) using Hwang Model 2 (from Professor's paper)
    # Formula: Apo B = -49.13 + (0.70 * LDLc) + (21.81 * ln(BMI))
    estimated_apo_b = -49.13 + (0.70 * data.ldl) + (21.81 * math.log(bmi))
    
    ln_age = math.log(data.age)
    ln_chol = math.log(total_chol)
    ln_hdl = math.log(data.hdl)
    ln_sbp = math.log(data.systolic_bp)
    
    if is_male:
        sum_beta = (3.06117 * ln_age) + (1.12370 * ln_chol) - (0.93263 * ln_hdl) + (1.93303 * ln_sbp)
        if data.smoker: sum_beta += 0.65451
        if data.diabetes: sum_beta += 0.57367
        
        # TRR Custom Risk Factors
        if data.high_pollution_exposure: sum_beta += 0.65451
        if data.arrhythmia: sum_beta += 0.60
        if bmi >= 30: sum_beta += 0.25
        elif bmi >= 25: sum_beta += 0.11
        
        mean_beta = 23.9802
        baseline_survival = 0.88936
    else:
        sum_beta = (2.32888 * ln_age) + (1.20904 * ln_chol) - (0.70833 * ln_hdl) + (2.76157 * ln_sbp)
        if data.smoker: sum_beta += 0.52873
        if data.diabetes: sum_beta += 0.69154
        
        # TRR Custom Risk Factors
        if data.high_pollution_exposure: sum_beta += 0.52873
        if data.arrhythmia: sum_beta += 0.60
        if bmi >= 30: sum_beta += 0.25
        elif bmi >= 25: sum_beta += 0.11
        
        mean_beta = 26.1931
        baseline_survival = 0.95012

    risk_prob = 1 - (baseline_survival ** math.exp(sum_beta - mean_beta))
    risk_percentage = min(round(risk_prob * 100, 1), 100.0) 
    
    if risk_percentage < 10.0: 
        category = "Low"
        heart_age = max(20, data.age - 5) # سن قلب جوان‌تر از سن واقعی!
    elif 10.0 <= risk_percentage < 20.0: 
        category = "Intermediate"
        heart_age = data.age + 5
    else: 
        category = "High"
        heart_age = data.age + 10
    
    return risk_percentage, category, bmi, heart_age, estimated_apo_b

# --- 5. API Endpoint 1: محاسبه و ذخیره ---
@app.post("/risk/static")
def get_static_risk(data: RiskInputSchema, db: Session = Depends(get_db)):
    current_risk, risk_category, calculated_bmi, heart_age, estimated_apo_b = calculate_continuous_risk(data)
    
    db_record = RiskResultDB(
        user_id=data.user_id,
        age=data.age,
        gender=data.gender,
        smoker=data.smoker,
        systolic_bp=data.systolic_bp,
        ldl=data.ldl,
        hdl=data.hdl,
        diabetes=data.diabetes,
        family_history=data.family_history,
        bmi=calculated_bmi,
        arrhythmia=data.arrhythmia,
        high_pollution_exposure=data.high_pollution_exposure,
        calculated_risk_score=current_risk,
        risk_category=risk_category
    )
    db.add(db_record)  
    db.commit()        
    
    # Dynamic Recommendations List
    recommendations = []
    
    # 1. هشدار دیابت و ریسک بالا (درخواست استاد)
    if data.diabetes and risk_category == "High":
        recommendations.append("High risk profile combined with diabetes suggests potentially uncontrolled high glucose levels. Strict glycemic management is urgently required.")

    if data.smoker:
        ideal_data = data.copy()
        ideal_data.smoker = False
        ideal_risk, _, _, _, _ = calculate_continuous_risk(ideal_data)
        reduction = round(current_risk - ideal_risk, 1)
        if reduction > 0:
            recommendations.append(f"Quitting smoking could lower your 10-year CVD risk by {reduction}%.")
            
    if data.systolic_bp > 120:
        ideal_data = data.copy()
        ideal_data.systolic_bp = 120
        ideal_risk, _, _, _, _ = calculate_continuous_risk(ideal_data)
        reduction = round(current_risk - ideal_risk, 1)
        if reduction > 0:
            recommendations.append(f"Lowering your blood pressure to 120 mmHg could reduce your risk by {reduction}%.")
            
    if calculated_bmi >= 25:
        recommendations.append(f"Reaching a healthy weight can significantly reduce cardiac stress.")
        
    if data.arrhythmia:
        recommendations.append("Irregular heartbeat (Arrhythmia) detected. Medical supervision is strongly recommended.")
        
    if data.high_pollution_exposure:
        recommendations.append("High pollution acts like smoking. Consider air purifiers indoors and N95 masks on bad AQI days.")
        
    # هشدار ApoB (بر اساس مقاله)
    if estimated_apo_b > 90:
        recommendations.append("Your estimated ApoB level is elevated. This is a strong, modern indicator of cardiovascular risk independent of standard cholesterol.")

    if risk_category == "Low": checkup = "Every 5 years"
    elif risk_category == "Intermediate": checkup = "Annually (Every 12 Months)"
    else: checkup = "Every 6 months"

    return {
        "calculated_risk_score": f"{current_risk}%",
        "risk_category": risk_category,
        "bmi": round(calculated_bmi, 1),
        "heart_age": heart_age,
        "estimated_apo_b": round(estimated_apo_b, 1),
        "recommendations": recommendations,
        "suggested_checkup": checkup,
        "message": "Result successfully saved to database." 
    }

# --- 6. API Endpoint 2: دریافت تاریخچه ---
@app.get("/risk/history/{user_id}")
def get_user_history(user_id: int, db: Session = Depends(get_db)):
    history = db.query(RiskResultDB).filter(RiskResultDB.user_id == user_id).order_by(RiskResultDB.test_date.desc()).all()
    
    if not history:
        raise HTTPException(status_code=404, detail="No history found for this user.")
        
    return {
        "message": "History fetched successfully.",
        "data": history
    }

handler = Mangum(app)