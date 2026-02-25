import requests

# این همون لینک Invoke URL هست که تو عکس فرستادی
URL = "https://jdh0ow7wh9.execute-api.eu-north-1.amazonaws.com/risk/static"

# دیتای تستی که می‌خوایم بفرستیم به سرور آمازون
data = {
    "user_id": 1,
    "age": 55,
    "gender": "male",
    "smoker": True,
    "systolic_bp": 145,
    "ldl": 165,
    "hdl": 35,
    "diabetes": False,
    "family_history": True
}

print("--- Sending request to AWS Cloud ---")
response = requests.post(URL, json=data)

if response.status_code == 200:
    print("Success! Response from Amazon:")
    print(response.json())
else:
    print(f"Error! Status Code: {response.status_code}")
    print(response.text)