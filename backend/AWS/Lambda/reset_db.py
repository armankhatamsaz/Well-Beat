from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://wellbeat_admin:jodke5-qipqew-cokveQ@well-beat-db.cxm8ui4akb82.eu-south-1.rds.amazonaws.com:5432/wellbeatdb"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS risk_results;"))
    conn.commit()
    print("Table successfully dropped! Database is ready for a fresh start.")