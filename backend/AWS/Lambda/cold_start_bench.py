import time
import requests
import json

# آدرس دقیق API شما
URL = "https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/static"
# همان توکنی که از URL مرورگر کپی کردی
TOKEN = "Bearer eyJraWQiOiJ2Wmd0TmRKUmNFV3FVQnRCUmUyZTc5NFRFUUVCN1grS1ZIUklhdkRCUklZPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiY3FxTFZPRWREWV8xNUtNTzNUc2JOUSIsInN1YiI6IjY2N2U4MmMwLWIwMDEtNzBmYi1lYmM3LWJkNDQ4MmY0OTFmOCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtc291dGgtMS5hbWF6b25hd3MuY29tXC9ldS1zb3V0aC0xX2NoZDd0R0FBdyIsImNvZ25pdG86dXNlcm5hbWUiOiI2NjdlODJjMC1iMDAxLTcwZmItZWJjNy1iZDQ0ODJmNDkxZjgiLCJhdWQiOiIxZnNxZW1iOGZobWhvbjE5OG9hZm5idjQ4dSIsImV2ZW50X2lkIjoiZDE4ZDVlNmMtOWIyMC00M2YyLWI1NGUtZGVmODhlNDJiYWZlIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3Nzg3ODkzNzgsIm5hbWUiOiJBcm1hbiIsImV4cCI6MTc3ODc5Mjk3OCwiaWF0IjoxNzc4Nzg5Mzc4LCJqdGkiOiI2OTdmMWZjMy01NjRjLTQ5MjctYmMyYS1kZjQwMGJmM2E4NDUiLCJlbWFpbCI6ImFybWFuLmt0ekBob3RtYWlsLmNvbSJ9.eRRLLvZVVdAbPHVWphtxgFMrJ9bZmAgSHojaE0qpen1AH80lkkwI0AOTg4mQgkWGcUzLlf4KXoCdpTY-UBFWSs-ZHOfA2IyhqCbysEPo9fWRlzRP6ZGoybO967xDla9sbBnDop0WKFA0_dpTjsENVjlw3KnbpSYxVpCJg25zYluZdvNq3ZgvRAZKGL3HDbXdojX1BMmd-dmggXk8hzOD8x-Yw88OeLFdYvI4_F10JALkpbAaCnTsTpMnI0TLloWcslOOI5Bsl-gABLkoaduNEkNjTsOLGgjXaoyU-SC1vy24r1qvf_drr4sSn8VX-9Dm4HPHhuj4QsO96RBQIIHfmw"

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