import os
import requests
import json
import time

URL = "https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/static"
# The Cognito ID token is supplied at run time, never stored in this file.
# A real token used to be hardcoded here and was committed to the repository.
# It carried a live user's email address and Cognito subject id. Do not put one
# back. Set WELLBEAT_TOKEN in your shell before running this script.
_token = os.environ.get("WELLBEAT_TOKEN", "").strip()
if not _token:
    raise SystemExit(
        "WELLBEAT_TOKEN is not set. Export a Cognito ID token before running "
        "this script. Nothing is hardcoded in this file."
    )
TOKEN = _token if _token.startswith("Bearer ") else "Bearer " + _token
HEADERS = {"Content-Type": "application/json", "Authorization": TOKEN}

def run_equivalence_partitioning_test():
    print("--- Running Final Test 2.2: Within Clinical Bounds ---")
    passed_tests = 0
    total_tests = 90
    
    base_data = {
        "user_id": 1, "age": 50, "gender": "male", "height": 175, "weight": 75,
        "smoker": True, "systolic_bp": 120, "ldl": 150, "hdl": 40,
        "diabetes": False, "family_history": True, "arrhythmia": False, "high_pollution_exposure": False
    }

    for i in range(total_tests):
        test_case = base_data.copy()
        # تغییر از 70 تا 248 (همگی زیر مرز 250 هستند)
        test_case["systolic_bp"] = 70 + (i * 2) 
        
        try:
            response = requests.post(URL, data=json.dumps(test_case), headers=HEADERS)
            if response.status_code == 200:
                result = response.json()
                score = float(result["calculated_risk_score"].replace('%', ''))
                actual = result["risk_category"]
                
                # منطق مرجع
                if score < 10.0: expected = "Low"
                elif 10.0 <= score < 20.0: expected = "Intermediate"
                else: expected = "High"
                
                if actual == expected:
                    passed_tests += 1
            else:
                print(f"Error at Case {i+1}: Status {response.status_code}")
        except: pass
        
        time.sleep(0.05)

    accuracy = (passed_tests / total_tests) * 100
    print(f"\nFinal Accuracy: {accuracy:.2f}%")
    if accuracy == 100: print("STATUS: PASSED")

if __name__ == "__main__":
    run_equivalence_partitioning_test()