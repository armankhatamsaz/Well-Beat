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

engine = create_engine(DATABASE_URL)
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

Base.metadata.create_all(bind=engine)

# --- Smart Database Migration (Auto-add new columns safely) ---
with engine.begin() as conn:
    columns_to_add = [
        "bmi FLOAT", 
        "arrhythmia BOOLEAN", 
        "high_pollution_exposure BOOLEAN"
    ]
    for col in columns_to_add:
        try:
            conn.execute(text(f"ALTER TABLE risk_results ADD COLUMN {col}"))
        except Exception:
            pass # If column exists, just move on to the next one safely

app = FastAPI(title="WELL-BEAT API - TRR Version")

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

# --- 3. Input Models (Updated for TRR) ---
class RiskInputSchema(BaseModel):
    user_id: int
    age: int
    gender: str 
    height: float
    weight: float
    smoker: bool
    systolic_bp: int
    ldl: int
    hdl: int
    diabetes: bool
    family_history: bool
    arrhythmia: bool
    high_pollution_exposure: bool

# --- 4. Engine (With BMI & New Factors) ---
def calculate_continuous_risk(data: RiskInputSchema):
    total_chol = data.ldl + data.hdl + 30 
    is_male = data.gender.lower() == 'male'
    
    # Calculate BMI
    bmi = data.weight / ((data.height / 100) ** 2)
    
    ln_age = math.log(data.age)
    ln_chol = math.log(total_chol)
    ln_hdl = math.log(data.hdl)
    ln_sbp = math.log(data.systolic_bp)
    
    if is_male:
        sum_beta = (3.06117 * ln_age) + (1.12370 * ln_chol) - (0.93263 * ln_hdl) + (1.93303 * ln_sbp)
        if data.smoker: sum_beta += 0.65451
        if data.diabetes: sum_beta += 0.57367
        
        # TRR Custom Risk Factors
        if data.high_pollution_exposure: sum_beta += 0.65451 # Doubles smoking effect
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
        if data.high_pollution_exposure: sum_beta += 0.52873 # Doubles smoking effect
        if data.arrhythmia: sum_beta += 0.60
        if bmi >= 30: sum_beta += 0.25
        elif bmi >= 25: sum_beta += 0.11
        
        mean_beta = 26.1931
        baseline_survival = 0.95012

    risk_prob = 1 - (baseline_survival ** math.exp(sum_beta - mean_beta))
    risk_percentage = min(round(risk_prob * 100, 1), 100.0) 
    
    if risk_percentage < 10.0: category = "Low"
    elif 10.0 <= risk_percentage < 20.0: category = "Intermediate"
    else: category = "High"
    
    return risk_percentage, category, bmi

# --- 5. API Endpoint 1: محاسبه و ذخیره ---
@app.post("/risk/static")
def get_static_risk(data: RiskInputSchema, db: Session = Depends(get_db)):
    current_risk, risk_category, calculated_bmi = calculate_continuous_risk(data)
    
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
    if data.smoker:
        ideal_data = data.copy()
        ideal_data.smoker = False
        ideal_risk, _, _ = calculate_continuous_risk(ideal_data)
        reduction = round(current_risk - ideal_risk, 1)
        if reduction > 0:
            recommendations.append(f"Quitting smoking could lower your 10-year CVD risk by {reduction}%.")
            
    if data.systolic_bp > 120:
        ideal_data = data.copy()
        ideal_data.systolic_bp = 120
        ideal_risk, _, _ = calculate_continuous_risk(ideal_data)
        reduction = round(current_risk - ideal_risk, 1)
        if reduction > 0:
            recommendations.append(f"Lowering your blood pressure to 120 mmHg could reduce your risk by {reduction}%.")
            
    # New TRR Recommendations
    if calculated_bmi >= 25:
        recommendations.append(f"Your BMI is {round(calculated_bmi, 1)}. Reaching a healthy weight can significantly reduce cardiac stress.")
    if data.arrhythmia:
        recommendations.append("Irregular heartbeat (Arrhythmia) detected. Medical supervision is strongly recommended.")
    if data.high_pollution_exposure:
        recommendations.append("High pollution acts like smoking. Consider air purifiers indoors and N95 masks on bad AQI days.")

    if risk_category == "Low": checkup = "Every 5 years"
    elif risk_category == "Intermediate": checkup = "Annually (Every 12 Months)"
    else: checkup = "Every 6 months"

    return {
        "calculated_risk_score": f"{current_risk}%",
        "risk_category": risk_category,
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