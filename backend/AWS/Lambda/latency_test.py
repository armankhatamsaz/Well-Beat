import time
import statistics
from sqlalchemy import create_engine, text

# آدرس دیتابیس شما
DB_URL = "postgresql://wellbeat_admin:jodke5-qipqew-cokveQ@well-beat-db.cxm8ui4akb82.eu-south-1.rds.amazonaws.com:5432/wellbeatdb"
engine = create_engine(DB_URL)

def measure_latency():
    latencies = []
    print(f"--- Starting Test 3.2: Retrieval Latency (100 iterations) ---")
    
    # آیدی کاربری که الان کلی دیتای تستی براش ساختیم
    user_id = 2000 
    
    for i in range(100):
        start_time = time.time()
        with engine.connect() as conn:
            # شبیه‌سازی کوئری داشبورد برای دیدن تاریخچه [cite: 1433]
            query = text("SELECT * FROM risk_results WHERE user_id = :u ORDER BY test_date DESC LIMIT 100")
            conn.execute(query, {"u": user_id})
        
        end_time = time.time()
        # تبدیل به میلی‌ثانیه
        latencies.append((end_time - start_time) * 1000)
    
    # محاسبه آمار فنی [cite: 1435, 1437]
    p95 = statistics.quantiles(latencies, n=20)[18] # محاسبه صدک ۹۵ام
    avg_lat = sum(latencies) / len(latencies)
    
    print(f"Average Latency: {round(avg_lat, 2)} ms")
    print(f"p95 Latency: {round(p95, 2)} ms")
    
    if p95 < 200:
        print("STATUS: PASSED (p95 < 200ms)")
    else:
        print("STATUS: FAILED (Check DB Indexing)")

if __name__ == "__main__":
    measure_latency()