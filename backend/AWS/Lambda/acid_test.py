import threading
import time
from sqlalchemy import create_engine, text

# این آدرس دقیقاً از فایل main.py خودت کپی شده است
DB_URL = "postgresql://wellbeat_admin:jodke5-qipqew-cokveQ@well-beat-db.cxm8ui4akb82.eu-south-1.rds.amazonaws.com:5432/wellbeatdb"
engine = create_engine(DB_URL)

success_count = 0
failure_count = 0
lock = threading.Lock()

def concurrent_insert(user_id):
    global success_count, failure_count
    # تستی برای درج دیتا در جدول ریسک‌ها
    query = text("""
        INSERT INTO risk_results (user_id, age, gender, smoker, systolic_bp, ldl, hdl, calculated_risk_score, risk_category, test_date)
        VALUES (:u, 45, 'male', false, 120, 100, 50, 4.7, 'Low', now())
    """)
    try:
        with engine.connect() as conn:
            conn.execute(query, {"u": user_id})
            conn.commit() # این بخش ACID بودن (Commit/Rollback) را تست می‌کند
            with lock: success_count += 1
    except Exception as e:
        print(f"Error in transaction: {e}")
        with lock: failure_count += 1

def run_test_cycle(cycle_name, total_tx, concurrent_workers):
    global success_count, failure_count
    success_count = 0
    failure_count = 0
    threads = []
    
    print(f"\n--- Starting {cycle_name}: {total_tx} Transactions with {concurrent_workers} concurrent workers ---")
    start_time = time.time()
    
    for i in range(total_tx):
        t = threading.Thread(target=concurrent_insert, args=(2000 + i,))
        threads.append(t)
        t.start()
        # کنترل تعداد کارگرهای همزمان برای فشار آوردن به دیتابیس
        if len(threads) >= concurrent_workers:
            for t in threads: t.join()
            threads = []
            
    end_time = time.time()
    rollback_rate = (failure_count / total_tx) * 100
    print(f"Results: Success: {success_count}, Failures: {failure_count}")
    print(f"Rollback Rate: {rollback_rate}%")
    return rollback_rate

# اجرای ۳ سیکل تست طبق برنامه TRR شما
print("WELLBEAT - PHASE 3.1 ACID TESTING")
for i in range(1, 4):
    run_test_cycle(f"Run #{i}", 167, 50)