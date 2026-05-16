import requests
import json
import time

URL = "https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/static"
TOKEN = "Bearer eyJraWQiOiJ2Wmd0TmRKUmNFV3FVQnRCUmUyZTc5NFRFUUVCN1grS1ZIUklhdkRCUklZPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoid0RydE9tdFNONURwZExGRTA0MnA4dyIsInN1YiI6IjY2N2U4MmMwLWIwMDEtNzBmYi1lYmM3LWJkNDQ4MmY0OTFmOCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtc291dGgtMS5hbWF6b25hd3MuY29tXC9ldS1zb3V0aC0xX2NoZDd0R0FBdyIsImNvZ25pdG86dXNlcm5hbWUiOiI2NjdlODJjMC1iMDAxLTcwZmItZWJjNy1iZDQ0ODJmNDkxZjgiLCJhdWQiOiIxZnNxZW1iOGZobWhvbjE5OG9hZm5idjQ4dSIsImV2ZW50X2lkIjoiOGVmMDBmNjQtMmI3My00NWQ3LWFlNDEtMTBiZmQ4NGEyZDU5IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3Nzg4NTYwMDAsIm5hbWUiOiJBcm1hbiIsImV4cCI6MTc3ODg1OTYwMCwiaWF0IjoxNzc4ODU2MDAwLCJqdGkiOiIxY2I4ZmFjOS02NDcwLTQzMTEtODg1Ni0yNDM3NjBmYTkwODkiLCJlbWFpbCI6ImFybWFuLmt0ekBob3RtYWlsLmNvbSJ9.VEtwfpLoGEV5mFu-TYDUClIeUpIURrlOnQIPFaOLPyDtCVB5lNVXGp4Pi8c5EFTA-F7jEdnbB8PU6lMOTzg6ex07LG0xDbhqnRoxnOIJRJYO1BxQzI7H4wDTXHwEdB0MLF7F2sQ9-izccG8c-jgpU-KOGftbRvKMuhlzJZOjaCFsqnQuNscu4QB8ziFknWmrF1UrAOIihF5XyvYgJAMIN8SZzhG9Io3USiiaJO6gTH5gKglKtjLNLdx7t56BbijEmt-Bqg-kXU6bFMZTwbA2t08H79Q7bYed_p6ftrhQXQLnLgQUCT-qWb6eaP-6MmcWbB6ygSjFMVVEvelZGUnMsQ"
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