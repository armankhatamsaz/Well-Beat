import os
import time
import requests
import json

# آدرس دقیق API شما
URL = "https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/static"
# The Cognito ID token is supplied at run time, never stored in this file.
# A real token used to be hardcoded here and was committed to the repository.
# It carried a live user's email address and Cognito subject id. Do not put one
# back. Set WELLBEAT_TOKEN in your shell before running this script.
_token = os.environ.get("WELLBEAT_TOKEN", "").strip()
if not _token:
    raise SystemExit(
        "WELLBEAT_TOKEN is not set. Export a Cognito ID token before running "
        "this benchmark. Nothing is hardcoded in this file."
    )
TOKEN = _token if _token.startswith("Bearer ") else "Bearer " + _token

payload = {
    "user_id": 2000, "age": 45, "gender": "male", "height": 175, "weight": 75,
    "smoker": False, "systolic_bp": 120, "ldl": 100, "hdl": 50,
    "diabetes": False, "family_history": False, "arrhythmia": False, "high_pollution_exposure": False
}
headers = {"Content-Type": "application/json", "Authorization": TOKEN}

def measure_one_request():
    start = time.time()
    try:
        response = requests.post(URL, data=json.dumps(payload), headers=headers)
        end = time.time()
        if response.status_code == 200:
            print(f"Latency: {round((end - start) * 1000, 2)} ms")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    measure_one_request()