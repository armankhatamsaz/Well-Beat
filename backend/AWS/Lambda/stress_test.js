import http from 'k6/http';
import { check, sleep } from 'k6';

// The Cognito ID token is supplied at run time, never stored in this file.
// A real token used to be hardcoded here and was committed to the repository.
// It carried a live user's email address and Cognito subject id. Do not put
// one back. Run this script as:
//
//   k6 run -e WELLBEAT_TOKEN="<id token>" stress_test.js
//
const TOKEN = __ENV.WELLBEAT_TOKEN;
if (!TOKEN) {
  throw new Error(
    'WELLBEAT_TOKEN is not set. Pass a Cognito ID token with ' +
    '-e WELLBEAT_TOKEN="<id token>". Nothing is hardcoded in this file.'
  );
}

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
      'Authorization': `Bearer ${TOKEN}`,
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