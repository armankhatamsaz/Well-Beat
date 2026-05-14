import http from 'k6/http';
import { check, sleep } from 'k6';

// پیکربندی تست فشار طبق برنامه TRR
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // افزایش به 100 کاربر
    { duration: '1m', target: 100 },  // حفظ فشار 500 کاربر همزمان [cite: 120]
    { duration: '30s', target: 0 },   // کاهش بار
  ],
  thresholds: {
    // آستانه‌های مهندسی طبق TRR [cite: 115]
    http_req_duration: ['p(95)<400'], // p95 باید زیر 400 میلی‌ثانیه باشد [cite: 121]
    http_req_failed: ['rate<0.01'],   // نرخ خطا کمتر از 1% [cite: 122]
  },
};

export default function () {
  // آدرس دقیق API Gateway شما
  const url = 'https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com/risk/static';
  
  const payload = JSON.stringify({
    user_id: 2000,
    age: 45,
    gender: 'male',
    height: 175,
    weight: 75,
    smoker: false,
    systolic_bp: 120,
    ldl: 100,
    hdl: 50,
    diabetes: false,
    family_history: false,
    arrhythmia: false,
    high_pollution_exposure: false
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // توکنی که از URL مرحله قبل کپی کردی را اینجا بگذار
      'Authorization': 'Bearer eyJraWQiOiJ2Wmd0TmRKUmNFV3FVQnRCUmUyZTc5NFRFUUVCN1grS1ZIUklhdkRCUklZPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiY3FxTFZPRWREWV8xNUtNTzNUc2JOUSIsInN1YiI6IjY2N2U4MmMwLWIwMDEtNzBmYi1lYmM3LWJkNDQ4MmY0OTFmOCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtc291dGgtMS5hbWF6b25hd3MuY29tXC9ldS1zb3V0aC0xX2NoZDd0R0FBdyIsImNvZ25pdG86dXNlcm5hbWUiOiI2NjdlODJjMC1iMDAxLTcwZmItZWJjNy1iZDQ0ODJmNDkxZjgiLCJhdWQiOiIxZnNxZW1iOGZobWhvbjE5OG9hZm5idjQ4dSIsImV2ZW50X2lkIjoiZDE4ZDVlNmMtOWIyMC00M2YyLWI1NGUtZGVmODhlNDJiYWZlIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3Nzg3ODkzNzgsIm5hbWUiOiJBcm1hbiIsImV4cCI6MTc3ODc5Mjk3OCwiaWF0IjoxNzc4Nzg5Mzc4LCJqdGkiOiI2OTdmMWZjMy01NjRjLTQ5MjctYmMyYS1kZjQwMGJmM2E4NDUiLCJlbWFpbCI6ImFybWFuLmt0ekBob3RtYWlsLmNvbSJ9.eRRLLvZVVdAbPHVWphtxgFMrJ9bZmAgSHojaE0qpen1AH80lkkwI0AOTg4mQgkWGcUzLlf4KXoCdpTY-UBFWSs-ZHOfA2IyhqCbysEPo9fWRlzRP6ZGoybO967xDla9sbBnDop0WKFA0_dpTjsENVjlw3KnbpSYxVpCJg25zYluZdvNq3ZgvRAZKGL3HDbXdojX1BMmd-dmggXk8hzOD8x-Yw88OeLFdYvI4_F10JALkpbAaCnTsTpMnI0TLloWcslOOI5Bsl-gABLkoaduNEkNjTsOLGgjXaoyU-SC1vy24r1qvf_drr4sSn8VX-9Dm4HPHhuj4QsO96RBQIIHfmw',
    },
  };

  const res = http.post(url, payload, params);
  
  // بررسی صحت عملکرد لایه پردازشی [cite: 115]
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has risk score': (r) => r.json().calculated_risk_score !== undefined,
  });

  sleep(1); 
}