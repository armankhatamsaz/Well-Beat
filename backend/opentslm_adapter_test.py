from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]  # ریشه‌ی پروژه
OPENTSLM_DIR = ROOT / "vendor" / "OpenTSLM"  # اگر مسیر ساب‌ماژولت فرق دارد، این خط را عوض کن
sys.path.append(str(OPENTSLM_DIR))

try:
    import src  # دایرکتوری اصلی کدهای OpenTSLM
    print("OpenTSLM import OK")
except Exception as e:
    print("OpenTSLM import FAILED:", repr(e))