import requests
import json
import random
import string

# آدرس API شما که روی آن Cognito فعال است
URL = "https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/static"

# دیتای فیک برای ارسال
payload = {
    "user_id": 999, "age": 30, "gender": "male", "height": 170, "weight": 70,
    "smoker": False, "systolic_bp": 120, "ldl": 100, "hdl": 50,
    "diabetes": False, "family_history": False, "arrhythmia": False, "high_pollution_exposure": False
}

def generate_malformed_token():
    # تولید یک رشته رندوم که شبیه توکن نیست
    return ''.join(random.choices(string.ascii_letters + string.digits, k=150))

def run_security_test():
    total_tests = 500
    blocked_count = 0
    
    print(f"--- Starting Test 5.1: JWT Penetration (Sample Size: {total_tests}) ---")
    
    for i in range(total_tests):
        test_type = random.choice(['absent', 'malformed', 'manipulated'])
        
        if test_type == 'absent':
            # ۱. تست بدون هدر Authorization
            headers = {'Content-Type': 'application/json'}
        elif test_type == 'malformed':
            # ۲. تست با توکن کاملاً غلط
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {generate_malformed_token()}'
            }
        else:
            # ۳. تست با دستکاری یک حرف در توکن واقعی (اگر توکن قبلی را داری اینجا بذار)
            headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJraWQiOiJ2Wmd0TmRKUmNFV3FVQnRCUmUyZTc5NFRFUUVCN1grS1ZIUklhdkRCUklZPSIsI...' # توکن واقعی را ناقص بگذار
            }

        response = requests.post(URL, data=json.dumps(payload), headers=headers)
        
        # اگر کد ۴۰۱ یا ۴۰۳ بدهد، یعنی تست موفقه و بلاک شده
        if response.status_code in [401, 403]:
            blocked_count += 1
            
        if (i + 1) % 50 == 0:
            print(f"Progress: {i+1}/{total_tests} requests processed...")

    success_rate = (blocked_count / total_tests) * 100
    print(f"\n--- Final Results ---")
    print(f"Total Unauthorized Requests Sent: {total_tests}")
    print(f"Total Blocked by API Gateway: {blocked_count}")
    print(f"Block Rate: {success_rate}%")
    
    if success_rate >= 99.99:
        print("STATUS: PASSED (Threshold met)")
    else:
        print("STATUS: FAILED (Threshold not met)")

if __name__ == "__main__":
    run_security_test()