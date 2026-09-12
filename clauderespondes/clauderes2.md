# 1
Everything that does not need the password is deployed and verified. I need two things from you to finish stage 7.

1. Add DB_PASSWORD in the Lambda console. Open WellBeat-Risk-Engine, then Configuration, then Environment variables, then Edit. Five variables are already there. Add a sixth:

Key:   DB_PASSWORD
Value: <the master password you rotated>

Do not touch the other five. Adding through the console preserves them.

2. Give me a Cognito ID token so I can run the real curl through the gateway. Every route sits behind the authorizer, so there is no unauthenticated path to test. Open the deployed app, sign in, open the browser network tab, find the request to execute-api, and copy the Authorization header value. Paste it here and I will use it once and redact it everywhere. If you would rather not, give me a test account email and password instead and I will mint a token myself through the USER_AUTH flow.

Here is what is already proven. The new code is live, and with the password absent it fails exactly as designed:

"errorMessage": "Configuration error: required environment variable DB_PASSWORD
 is not set. This function needs DB_HOST, DB_NAME, DB_USER, DB_PASSWORD (and
 optionally DB_PORT, which defaults to 5432) to be configured on the Lambda
 function. No value is shown here on purpose."

No host, no user, no password appears in that message or anywhere in the traceback. The route list on the deployed function is now /risk/static, /risk/history/{user_id}, and the FastAPI docs
pages. The destructive route is gone.

CORS now behaves correctly at the gateway, which is the layer that decides:

Origin: https://main.d184n5jh1hilpp.amplifyapp.com  -> 200, origin echoed back
Origin: https://evil.example.com                    -> 400 Disallowed CORS origi
POST /risk/static with no token                     -> 401, www-authenticate: Bearer

One consequence to be aware of. Local development against localhost:5173 will no if you want that origin added to both the gateway list and the ALLOWED_ORIGINS
variable, and I will add it.

I have also precomputed the expected output for the synthetic patient I will sen the moment the call succeeds. For a 52-year-old male, 178 cm, 88 kg, LDL 160,
HDL 42, systolic 145, smoker, high pollution exposure:

┌──────────────┬──────────┐
│   Quantity   │ Expected │
├──────────────┼──────────┤
│ BMI          │ 27.8     │
├──────────────┼──────────┤
│ ApoB         │ 135.4    │
├──────────────┼──────────┤
│ 10-year risk │ 50.4%    │
├──────────────┼──────────┤
│ Heart age    │ 62       │
└──────────────┴──────────┘


# 2

Restored and verified end to end. Here is the report block.

## Result
The outage is fixed and the system works end to end. The cause was exactly as suspected: the
restored RDS instance has a different hostname, and main.py had the old one hardcoded together
with the username and plaintext password. Configuration now comes from Lambda environment
variables, the destructive GET /reset-db route is gone, the connection pool and CORS are
corrected, and the new package is deployed. A synthetic assessment returns values that match
the published formulas exactly, the row reaches risk_results, and history reads it back. Three
things I found along the way were not in the brief and matter more than some of the listed
defects: the account can only run ten concurrent Lambda executions, the database port is open
to the whole internet, and the stated cause of the connection exhaustion in the paper does not
hold up.

## Evidence

Diagnosis, from /aws/lambda/WellBeat-Risk-Engine:

    psycopg2.OperationalError: connection to server at
    "well-beat-db.cxm8ui4akb82.eu-south-1.rds.amazonaws.com" (51.118.81.28),
    port 5432 failed: timeout expired

Failure path after the change, with DB_PASSWORD deliberately unset. No host, user or password
appears anywhere in the message or the traceback:

    "errorMessage": "Configuration error: required environment variable DB_PASSWORD is not
     set. This function needs DB_HOST, DB_NAME, DB_USER, DB_PASSWORD (and optionally DB_PORT,
     which defaults to 5432) to be configured on the Lambda function. No value is shown here
     on purpose."

POST /risk/static, synthetic patient user_id 999001, 52yo male, 178cm, 88kg, LDL
systolic 145, smoker, high pollution exposure:

    HTTP 200
    {
        "calculated_risk_score": "50.4%",
        "risk_category": "High",
        "bmi": 27.8,
        "heart_age": 62,
        "estimated_apo_b": 135.4,
        "recommendations": [
            "Quitting smoking could lower your 10-year CVD risk by 19.8%.",
            "Lowering your blood pressure to 120 mmHg could reduce your risk by
            "Reaching a healthy weight can significantly reduce cardiac stress.",
            "High pollution acts like smoking. Consider air purifiers indoors an
             on bad AQI days.",
            "Your estimated ApoB level is elevated. This is a strong, modern indicator of
             cardiovascular risk independent of standard cholesterol."
        ],
        "suggested_checkup": "Every 6 months",
        "message": "Result successfully saved to database."
    }

Hand-check against section 5 of CLAUDE.md:

    BMI  = 88.0 / 1.78**2 = 88.0 / 3.168400 = 27.774271          -> returned 27.8
    ApoB = -49.13 + 0.70*160 + 21.81*ln(27.774271)
         = -49.13 + 112.000 + 21.81*3.324110
         = -49.13 + 112.000 + 72.498841 = 135.368841             -> returned 135
    P10  = 1 - 0.88936 ** exp(25.769260 - 23.9802) = 0.50421986  -> returned "50.4%"

GET /risk/history/999001 returns HTTP 200 with the written rows, ids 16999 to 17
stored at full precision 27.77427092538821.

Route removal and authorisation:

    GET /reset-db with a valid token   -> 404 {"detail":"Not Found"}
    POST /risk/static with no token    -> 401 www-authenticate: Bearer

CORS, checked at the gateway because the gateway overrides the application:

    Origin: https://main.d184n5jh1hilpp.amplifyapp.com  -> 200, origin echoed back
    Origin: https://evil.example.com                    -> 400 Disallowed CORS origin

Input bounds still enforced:

    age 15       -> 422 "Input should be greater than or equal to 20"
    systolic 300 -> 422 "Input should be less than or equal to 250"

Response times. The cold figure was taken after deliberately recycling the execution
environments, because an earlier measurement looked cold and was not.

    COLD  wall 3.221s   Lambda Init 2663.28 ms   Duration 178.59 ms
    WARM  wall 0.125s to 0.152s                  Duration 9 to 11 ms

Privacy check on the last 20 minutes of CloudWatch, 99 log lines. Occurrences of 999001,
systolic_bp, ldl, risk_results, wellbeat_admin and postgresql:// were all zero. The only
matches for DB_PASSWORD are the variable name inside my own error message.

Package integrity. The deployed package was downloaded and rebuilt with only main.py swapped.
All 1445 other entries were asserted byte-identical and permission-bit-identical before
upload, and the deployed main.py was confirmed to match git HEAD, so there was no console-only
drift to lose.

## Findings

- [P0] The account Lambda concurrency ceiling is 10, with no function-level rese
  paper describes behaviour at 500 concurrent users, which this deployment cannot reach: the
  eleventh simultaneous request is throttled by Lambda before it reaches the app
  cannot tell from here whether the limit was different when the experiments were run, or
  whether the suspension and reinstatement reset it. It also means the conference demo breaks
  if more than ten people scan the QR code at once. Raising it is a free support
- [P0] The database security group allows 0.0.0.0/0 on port 5432. Anyone on the internet can
  reach Postgres on the instance holding real users' health data. The rule is currently
  load-bearing, because the Lambda runs outside the VPC and has no stable source address, so
  this is not a one-line fix.
- [P0, fixed] GET /reset-db called drop_all() on the live database. It returns 4
  not quite as exposed as CLAUDE.md states, because ANY /{proxy+} sits behind the Cognito
  authorizer, so a crawler or link preview could not reach it. Self-service sign
  on the pool though, so any member of the public could register and then wipe the database
  with a single GET. Conclusion unchanged, reasoning corrected.
- [P0, fixed] Hardcoded host, username and plaintext password in main.py. Now read from
  environment variables, with a fail-fast error that names the missing variable and shows no
  value.
- [P1] The stated cause of the connection exhaustion is wrong. pool_size=1 was not the driver.
  At 500 concurrent users the arithmetic that matters is concurrent Lambda containers times
  connections per container against a db.t3.micro ceiling of about 112 connections. Raising the
  pool size makes that worse, not better. I set pool_size=2 with max_overflow=3, which is safe
  while the concurrency ceiling is 10, and would need a function-level reservati
  ceiling is raised. If the paper attributes the failure to the pool size, the paper and the
  system disagree.
- [P1, fixed] CORS was allow_origins=["*"] with allow_credentials=True. Both the application
  and the gateway are now restricted to the Amplify origin, with credentials off
  frontend authenticates with a bearer token rather than cookies.
- [P1] CLAUDE.md described the frontend as React 18 with Zod validation. It is React 19.2, and
  zod is not a dependency and is not imported anywhere in frontend/src. All inpu
  server-side in Pydantic. I corrected CLAUDE.md. If the paper makes the same claim, that is a
  contradiction you need to decide about.
- [P2] SQLAlchemy can leak health data into CloudWatch on a failed INSERT. A StatementError
  carries a [parameters: ...] section with the bound values, and Mangum logs the whole
  traceback. It did not happen during this outage because the failure was at con
  no statement had been prepared. Passing hide_parameters=True to create_engine closes it. I
  did not apply this, since it was outside the approved plan.
- [P2] The old password remains in two commits of git history across five files. It is rotated
  and dead. Clearing it needs a history rewrite and a force push.
- [P2] FastAPI serves /docs, /redoc and /openapi.json. Behind the authorizer, but self-service
  sign-up makes that a low bar.
- [P2] The undocumented modelling assumptions are all still present and unchange
  instructed: total_chol = ldl + hdl + 30, the +0.60 arrhythmia term, and the +0.25 / +0.11
  BMI terms.

## Changed

Files:
- main.py and backend/AWS/Lambda/main.py, kept identical. Env-var configuration,
  removed, pool and CORS settings. The risk engine and the Pydantic schema are byte-identical
  to the previous commit, asserted programmatically.
- backend/AWS/Lambda/init_db.py, new. create_all() only, run by hand, no drop path.
- backend/AWS/Lambda/reset_db.py, neutralised. It used to DROP TABLE risk_result
- backend/AWS/Lambda/acid_test.py and latency_test.py, hardcoded password removed.
- CLAUDE.md section 2, filled in with verified values.
- FINDINGS.md, new.

Nothing is committed. Working tree only, per the no-commits-to-main rule.

AWS:
- Lambda WellBeat-Risk-Engine, code updated and DB_HOST, DB_PORT, DB_NAME, DB_USER,
  ALLOWED_ORIGINS set. You set DB_PASSWORD yourself in the console. Description updated, which
  is also how I forced the cold start.
- HTTP API plfqx4z54f, CORS restricted to the Amplify origin.

Nothing was deleted. The broken instance well-beat-db was not touched.

## Open questions for Arman

1. Do you want me to raise a support request to lift the concurrency ceiling fro
   it needs doing before the talk if the QR code will be scanned live.
2. The paper describes connection exhaustion at 500 concurrent users. Does it name the pool size
   as the cause? If so, the paper and the system now disagree and you need to de
3. Same question for React 18 and Zod. Does the paper claim either?
4. Shall I apply hide_parameters=True to create_engine? One line, and it closes the only route I
   found by which health data could reach CloudWatch.
5. Seven synthetic rows sit in risk_results under user_id 999001. Want them removed? That is a
   targeted DELETE, which I did not run without asking.
6. Local development against localhost:5173 is now blocked by CORS. Say the word and I will add
   it to both the gateway list and ALLOWED_ORIGINS.

Two security notes outside the report. You pasted your Cognito account password ange it when convenient. The database password is in the transcript too; it isonly in the Lambda environment now, never in a file or a command I ran, but the same reasoning applies before the deployment goes in front of an audience.