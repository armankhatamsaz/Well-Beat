# CLAUDE.md — WellBeat

Project memory for Claude Code. Read this fully before the first action of every session.

---

## 1. What this project is

WellBeat is a serverless cardiovascular-risk platform. It estimates 10-year CVD risk from
a standard lipid panel and adds an estimated Apolipoprotein B (ApoB) value, a BMI term, an
arrhythmia flag, and a chronic air-pollution ("exposome") penalty.

The paper — *"WellBeat: Serverless Cardiovascular Risk Stratification Integrating ApoB and
Environmental Stressors"* — is **accepted at SoftCom 2026 and camera-ready (frozen)**. It
contains a QR code pointing at the live deployment, and the system will be referenced in a
12-minute conference talk.

**Core constraint: the deployed system must not contradict the camera-ready paper.**
If the code disagrees with a claim in the paper, that is a P0 finding. Report it clearly.
Do not silently change either side — Arman decides which one moves.

---

## 2. Known environment

- AWS region: `eu-south-1` (Europe / Milan)
- API Gateway endpoint: `https://plfqx4z54f.execute-api.eu-south-1.amazonaws.com`
- Main backend file: `main.py` — FastAPI, wrapped for Lambda by Mangum (`handler = Mangum(app)`)
- Database: Amazon RDS for PostgreSQL, `db.t3.micro`, database name `wellbeatdb`,
  master user `wellbeat_admin`
- ORM: SQLAlchemy, declarative models, table `risk_results`
- Frontend: React **19.2** SPA (Vite 5), Zustand store, Zod validation.
  Zod was added as a declared production dependency on 2026-09-12 (session 2), pinned to
  4.1.13. Before that it existed only as a transitive development dependency and was not
  imported anywhere. The schema lives in `frontend/src/utils/validation.js` and mirrors
  `RiskInputSchema` in `main.py`. **If a bound changes on one side, change it on the other
  in the same commit.** Client-side validation is an addition; Pydantic still validates
  every request independently and still answers 422.
- Auth: AWS Cognito User Pools

Verified 2026-09-12 (session 1):

- Backend repo path: `backend/AWS/Lambda/main.py` (tracked). An identical untracked copy sits
  at the repo root as `main.py` — byte-for-byte the same file. Root copy is the working copy.
- Frontend repo path: `frontend/` (Vite + React 19, entry `frontend/src/main.jsx`)
- Deployment method: **manual zip upload**. No SAM template, no `serverless.yml`, no CDK app,
  no Terraform anywhere in the repo. `PackageType: Zip`, no Lambda layers, package size
  ~16.5 MB, which is above the 3 MB limit for the console inline editor. Deploy with
  `aws lambda update-function-code --function-name WellBeat-Risk-Engine --zip-file fileb://...`
- Lambda function name: `WellBeat-Risk-Engine`
  - runtime `python3.14`, arch `x86_64`, handler `main.handler`, memory 1024 MB, timeout 30 s
  - `VpcConfig`: none (runs outside the VPC, reaches RDS over the public internet)
  - `Environment.Variables`: none set as of 2026-09-12
  - execution role: `WellBeat-Risk-Engine-role-t9mmq85e`
- CloudWatch log group: `/aws/lambda/WellBeat-Risk-Engine`
- API Gateway: **HTTP API (v2)**, not REST. There are zero REST APIs in the account.
  - API id `plfqx4z54f`, name `WellBeat-API`, stage `$default` (AutoDeploy = true)
  - routes: `ANY /{proxy+}` -> JWT authorizer, `OPTIONS /{proxy+}` -> no auth
  - integration `wyl85kg`, type `AWS_PROXY`, payload format `2.0`
  - JWT authorizer `2la587` name `TRR5.1`, issuer the Cognito pool below,
    audience `1fsqemb8fhmhon198oafnbv48u`, identity source `$request.header.Authorization`
  - gateway-level CORS: `AllowOrigins ["*"]`, `AllowCredentials false`
  - access logging: disabled
- New RDS instance identifier and endpoint:
  - id `wellbeat-db-new`, endpoint `wellbeat-db-new.cxm8ui4akb82.eu-south-1.rds.amazonaws.com:5432`
  - PostgreSQL 17.9, `db.t3.micro`, 20 GB, AZ `eu-south-1b`, created 2026-09-12T13:12:20Z
  - database `wellbeatdb`, master user `wellbeat_admin`, `PubliclyAccessible: true`
  - security group `sg-02ffe13c200596078` (`well-beat-db-sg`)
  - OLD BROKEN INSTANCE: `well-beat-db`, `db.t4g.micro`, status
    `inaccessible-encryption-credentials`. **Do not touch it.**
- Cognito user pool id and app client id:
  - pool `eu-south-1_chd7tGAAw` ("User pool - pspfjw"), hosted domain `eu-south-1chd7tgaaw`
  - app client `1fsqemb8fhmhon198oafnbv48u`, OAuth flow `code`, scopes email/openid/phone/profile
  - callback URL `https://main.d184n5jh1hilpp.amplifyapp.com/`
  - self-service sign-up is **enabled** (`AllowAdminCreateUserOnly: false`)
- Frontend origin (the real one): `https://main.d184n5jh1hilpp.amplifyapp.com`
  - AWS Amplify app `d184n5jh1hilpp` ("Well-Beat"), branch `main`, stage PRODUCTION

---

## 3. Incident history — what just happened

The AWS account was suspended when the Free Tier allowance ended. During suspension AWS
disabled the KMS key used to encrypt the RDS instance, and the database fell into the
terminal `inaccessible-encryption-credentials` state. The account has since been reinstated
on a paid plan.

Recovery already performed manually:

1. The KMS key was confirmed enabled.
2. A system snapshot roughly 20 days old was restored to a **new RDS instance**, which is
   now `Available`.
3. The master password was rotated.

**Consequence and current cause of failure:** the new instance has a **different endpoint
address** from the old one, and `main.py` has the old connection string hardcoded. Every
request to `/risk/static` therefore returns HTTP 500.

Observed browser symptoms before the fix:

```
POST .../risk/static  -> 500 Internal Server Error
GET  .../risk/history -> 401
```

---

## 4. Known defects in the current code

These were identified by reading `main.py`. Confirm each one still exists, then fix it as
instructed by the session prompt.

**P0 — destructive unauthenticated endpoint**

```python
@app.get("/reset-db")
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
```

Any person who opens this URL in a browser wipes the entire database. There is no
authentication and it is a GET request, so a crawler or a link preview can trigger it. The
paper advertises a live deployment via QR code. This must go.

**P0 — hardcoded credentials**

`DATABASE_URL` contains the host, username, and plaintext password as a literal string in
source. The password has been exposed and must never be reintroduced into code.

**P1 — CORS is fully open**

`allow_origins=["*"]` together with `allow_credentials=True`. Should be restricted to the
real frontend origin.

**P1 — connection pool of size 1**

`pool_size=1, max_overflow=0`. This is a direct contributor to the connection exhaustion
the paper reports at 500 concurrent users.

**P2 — undocumented modelling assumptions**

- `total_chol = ldl + hdl + 30` is an implicit Friedewald-style approximation that assumes
  a fixed triglyceride value. The paper cites Friedewald / Martin–Hopkins but does not
  state this constant.
- The arrhythmia term (`+0.60`) and the BMI terms (`+0.25` / `+0.11`) are applied to the
  Framingham linear predictor without a cited source. The paper mentions these terms exist
  but gives no coefficients.

Report these; do not change the numbers without being asked.

**P2 — health data may reach logs**

Check whether request bodies containing health metrics are written to CloudWatch. If they
are, this contradicts the paper's privacy-by-design claim and is a GDPR finding.

---

## 5. Domain invariants — never change these

Published in the paper. Frozen.

**ApoB (Hwang Model 2)**, LDL-C in mg/dL, BMI in kg/m²:

```
ApoB_est = -49.13 + (0.70 * LDL_C) + (21.81 * ln(BMI))
```

**Framingham 10-year risk (continuous Cox form):**

```
P10 = 1 - S0 ** exp( sum(beta_i * X_i) - sum(beta_i * Xbar_i) )
```

Male: `mean_beta = 23.9802`, `S0 = 0.88936`.
Female: `mean_beta = 26.1931`, `S0 = 0.95012`.

**Pollution penalty** — additive on the linear predictor, never a multiplier on the output
probability:

```
sum(beta*X)_adj = sum(beta*X)_base + delta_poll
delta_poll      = ln(HR_poll) * 1[E_PM > 50 days]
```

`HR_poll` is deliberately set equal to the current-smoking hazard as a conservative upper
bound. That is a stated modelling assumption, not a bug.

**BMI:** `weight_kg / height_m²`.

**Input bounds (Pydantic):** age 20–100, systolic BP 60–250 mmHg. Out-of-range input must
return HTTP 422.

---

## 6. Operating rules

1. **Never delete AWS resources.** No `delete-*`, `terminate-*`, `destroy`, or
   `drop`/`truncate` SQL. Describe it and stop.
2. **Never silently fix a failure.** A failure is often the most valuable finding. Report
   the exact error and your hypothesis, then propose a fix.
3. **Plan before changing.** Present the plan and wait for approval before mutating
   infrastructure, code, or data.
4. **Read logs before forming a theory.** CloudWatch first, then configuration, then code.
5. **One change at a time when debugging.** Change, re-test, record. Do not bundle three
   fixes and then report that it works now.
6. **Cost awareness.** This account was suspended once for cost. State the monthly cost of
   any resource before creating it. Never create a NAT Gateway, an extra RDS instance, or
   provisioned concurrency without approval.
7. **Never print or commit secrets.** Redact passwords, client secrets, and JWTs in all
   output.
8. **Health data is special-category data under GDPR.** Never copy real rows out of RDS.
   Use synthetic records only.
9. **No force-push and no commits to `main` without approval.**

---

## 7. Useful commands

```bash
aws sts get-caller-identity
aws configure get region

aws rds describe-db-instances \
  --query 'DBInstances[].{Id:DBInstanceIdentifier,Status:DBInstanceStatus,Endpoint:Endpoint.Address,Class:DBInstanceClass}'

aws lambda list-functions --query 'Functions[].FunctionName'
aws lambda get-function-configuration --function-name <FUNCTION> \
  --query '{Env:Environment.Variables,Vpc:VpcConfig,Timeout:Timeout,Memory:MemorySize}'

aws logs tail /aws/lambda/<FUNCTION> --since 2h

aws apigateway get-rest-apis
aws lambda get-account-settings
```

---

## 8. How to report back

Arman pastes your output into another Claude session for review. End every substantial
piece of work with a self-contained markdown block:

```markdown
## Result
<one paragraph: what you did and whether it worked>

## Evidence
<log lines, command output, HTTP responses — secrets redacted>

## Findings
- [P0/P1/P2] <finding> — <why it matters>

## Changed
<files and resources touched, or "nothing">

## Open questions for Arman
<decisions you could not make alone>
```

Write in clear, professional English at an intermediate level. No emoji.
