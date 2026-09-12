import time
import statistics
from sqlalchemy import create_engine, text

# Connection details come from environment variables. Set DB_HOST, DB_NAME,
# DB_USER and DB_PASSWORD in your shell before running this script. The old
# hardcoded credential that lived on this line was exposed and has been rotated;
# never write a password back into this file.
#
# WARNING: this script writes synthetic rows into the live risk_results table.
# Point it at a scratch database, or be prepared to clean up the user_id range
# it uses afterwards.
def _dsn():
    import os
    from urllib.parse import quote_plus
    missing = [v for v in ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD")
               if not os.environ.get(v, "").strip()]
    if missing:
        raise SystemExit(
            "Configuration error: missing environment variable(s): "
            + ", ".join(missing)
        )
    return (
        "postgresql://"
        + quote_plus(os.environ["DB_USER"])
        + ":"
        + quote_plus(os.environ["DB_PASSWORD"])
        + "@"
        + os.environ["DB_HOST"]
        + ":"
        + os.environ.get("DB_PORT", "5432")
        + "/"
        + os.environ["DB_NAME"]
    )


DB_URL = _dsn()
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