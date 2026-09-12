# FINDINGS — WellBeat outage and configuration cleanup

**Date:** 2026-09-12
**Scope:** restore `POST /risk/static` and `GET /risk/history/{user_id}` end to end, and move
database configuration out of source code.
**Outcome:** restored and verified. Every check below was run against the live deployment.

---

## 1. What was broken

Every request that touched the database returned HTTP 500. The frontend additionally showed 401
on history, which turned out to be separate and correct behaviour, not a second fault.

The exact error from `/aws/lambda/WellBeat-Risk-Engine`:

```
psycopg2.OperationalError: connection to server at
"well-beat-db.cxm8ui4akb82.eu-south-1.rds.amazonaws.com" (51.118.81.28),
port 5432 failed: timeout expired
```

## 2. Why

When the AWS account was suspended at the end of the Free Tier, AWS disabled the KMS key that
encrypted the original RDS instance. That instance, `well-beat-db`, fell into the terminal
`inaccessible-encryption-credentials` state and cannot be recovered. A snapshot was restored to
a **new** instance, `wellbeat-db-new`, which has a **different endpoint hostname**.

`main.py` carried the old hostname, username and password as one hardcoded string:

```python
DATABASE_URL = "postgresql://wellbeat_admin:<redacted>@well-beat-db.cxm8ui4akb82.eu-south-1.rds.amazonaws.com:5432/wellbeatdb"
```

The old hostname still resolves in DNS, which is why the failure was a five second connect
timeout rather than an immediate name resolution error. That distinction is worth remembering,
because a timeout reads like a network or security group problem when it was neither.

The 401 on history was unrelated. Every route sits behind a Cognito JWT authorizer on the HTTP
API, so an unauthenticated or expired call is rejected at the gateway before it reaches Lambda.

## 3. What changed

### Code, `main.py` and its identical copy at `backend/AWS/Lambda/main.py`

| Area | Before | After |
|---|---|---|
| Connection string | hardcoded host, user, plaintext password | built at import from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Missing config | not possible, the values were literals | `RuntimeError` naming the missing variable, no value echoed |
| `GET /reset-db` | `drop_all()` then `create_all()` | route deleted |
| Pool | `pool_size=1, max_overflow=0, pool_recycle=3600` | `pool_size=2, max_overflow=3, pool_timeout=3, pool_recycle=300` |
| CORS | `allow_origins=["*"]` with `allow_credentials=True` | single origin from `ALLOWED_ORIGINS`, `allow_credentials=False`, methods and headers narrowed |

On the pool settings: the sizes matter less than `pool_recycle`. A frozen Lambda leaves TCP
sockets that the database has already dropped, and the previous one hour recycle happily handed
those dead sockets back to the application. Five minutes matches the freeze and thaw rhythm of a
Lambda execution environment. `pool_timeout=3` makes a starved container fail quickly instead of
sitting on the 30 second function timeout.

The risk engine was not touched. `calculate_continuous_risk` and `RiskInputSchema` are
byte-identical to the previous commit, asserted programmatically before deploying.

### Code, supporting scripts

- `backend/AWS/Lambda/init_db.py`, new. Calls `create_all()` only, run by hand. There is no drop
  path in the file. It imports the models from `main.py` so the schema cannot drift away from
  what the API expects.
- `backend/AWS/Lambda/reset_db.py`, neutralised. It used to run `DROP TABLE IF EXISTS
  risk_results` against production using a password written on the line above it. It now exits
  with an explanation.
- `backend/AWS/Lambda/acid_test.py` and `latency_test.py`, the hardcoded password was removed and
  replaced with environment variable reads.

Alembic was considered and not adopted. While `risk_results` is a single frozen table, a script
that can only create is the lower risk option. Move to Alembic if the schema has to change shape
after the camera-ready paper, because `create_all()` cannot alter an existing table.

### Infrastructure

- Lambda `WellBeat-Risk-Engine`: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `ALLOWED_ORIGINS`
  set from the CLI. `DB_PASSWORD` was set by Arman in the console so the value never passed
  through tooling, a command line or a file.
- HTTP API `plfqx4z54f`: CORS changed from `AllowOrigins ["*"]` to the single frontend origin,
  headers narrowed to `authorization, content-type`, `MaxAge` raised to 600.
- Deployment: the running package was downloaded, `main.py` swapped inside it, and the result
  re-uploaded. The other 1445 entries were asserted byte-identical and permission-bit-identical
  before upload, so no dependency changed version. This matters because the package has no
  requirements file and could not be rebuilt from source.

## 4. Verification

Synthetic patient, `user_id` 999001: 52 year old male, 178 cm, 88 kg, LDL 160, HDL 42, systolic
145, smoker, high pollution exposure.

Hand-check against section 5 of CLAUDE.md:

```
BMI  = 88.0 / 1.78**2 = 88.0 / 3.168400 = 27.774271           -> API returned 27.8
ApoB = -49.13 + 0.70*160 + 21.81*ln(27.774271)
     = -49.13 + 112.000 + 21.81*3.324110
     = -49.13 + 112.000 + 72.498841 = 135.368841              -> API returned 135.4
P10  = 1 - 0.88936 ** exp(25.769260 - 23.9802) = 0.50421986   -> API returned "50.4%"
```

| Check | Result |
|---|---|
| `POST /risk/static` with a valid token | 200, values match the hand-check exactly |
| Row written to `risk_results` | yes, ids 16999 to 17005 |
| `GET /risk/history/999001` | 200, returns the rows |
| `GET /reset-db` with a valid token | 404, the route no longer exists |
| Any request with no token | 401, `www-authenticate: Bearer` |
| Preflight from the frontend origin | 200, origin echoed back |
| Preflight from `https://evil.example.com` | 400 Disallowed CORS origin |
| Age 15 | 422 |
| Systolic 300 | 422 |
| Health data or credentials in CloudWatch | none found |

Response times:

| Invocation | Wall clock | Lambda Init | Lambda Duration |
|---|---|---|---|
| Cold | 3.221 s | 2663.28 ms | 178.59 ms |
| Warm | 0.125 to 0.152 s | not applicable | 9 to 11 ms |

The cold figure was taken after deliberately recycling the execution environments. An earlier
measurement looked cold but was not, because the function had already been warmed by other
traffic. Do not trust a single unverified cold number.

## 5. If the same symptom returns

Work in this order. The first two steps resolve most cases.

1. **Read the log, do not guess.**

   ```
   MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/WellBeat-Risk-Engine --since 30m
   ```

   On Git Bash the prefix is required. Without it the leading slash in the log group name is
   rewritten into a Windows path and the CLI rejects it with an unhelpful regex validation error
   that looks like a permissions problem.

2. **Identify which of the three failure shapes you have.**

   - `Configuration error: required environment variable X is not set` means an environment
     variable was dropped. This happens when someone calls `update-function-configuration
     --environment` without listing every existing key, because that call replaces the whole map
     rather than merging into it.
   - `psycopg2.OperationalError ... timeout expired` means `DB_HOST` points at something that is
     not accepting connections. Compare it against the live instance list:

     ```
     aws rds describe-db-instances --query "DBInstances[].{Id:DBInstanceIdentifier,Status:DBInstanceStatus,Endpoint:Endpoint.Address}"
     ```

     A restored instance always gets a new hostname. This is exactly what caused this outage.
   - `password authentication failed` means the master password was rotated without updating
     `DB_PASSWORD`.

3. **A 401 is not this bug.** It comes from the JWT authorizer at the gateway and usually means
   an expired token. Confirm by sending a request with no token at all, which should also return
   401 with `www-authenticate: Bearer`.

4. **Blocked in the browser but fine under curl means CORS.** The HTTP API has its own CORS block
   and it overrides whatever the FastAPI middleware sets, so check the gateway first:

   ```
   aws apigatewayv2 get-api --api-id plfqx4z54f --query CorsConfiguration
   ```

   Changing only the FastAPI middleware will appear to do nothing.

5. **Confirm you are looking at the live instance.** `well-beat-db` is permanently in
   `inaccessible-encryption-credentials`. The live instance is `wellbeat-db-new`. Do not delete
   the dead one without a deliberate decision, it is the last artefact of the original data.

## 6. Open risks not fixed in this session

- **The Lambda concurrency ceiling is 10** for the entire account, with no function level
  reservation set. More than ten simultaneous users are throttled by Lambda before they reach
  the application. This also means the deployment cannot currently reproduce the 500 concurrent
  user conditions the paper describes. Raising the limit is a free AWS support request and
  should be done before the conference talk, since the paper publishes a QR code to this
  deployment.
- **The database security group allows 0.0.0.0/0 on port 5432.** Anyone on the internet can
  reach the Postgres port. The rule is currently load-bearing, because the Lambda runs outside
  the VPC and so has no stable source address. The correct fix is to attach the Lambda to the
  same VPC and replace the open rule with a security group reference. That needs no NAT gateway
  and costs nothing, but it changes cold start behaviour and should be tested, not done the
  week of a talk.
- **SQLAlchemy can put health data into logs on a failed INSERT.** A `StatementError` carries a
  `[parameters: ...]` section holding the bound values, and Mangum logs the whole traceback to
  CloudWatch. It did not happen during this outage because the failure was at connect time, so
  no statement had been prepared. Passing `hide_parameters=True` to `create_engine` closes it.
- **The old password remains in two commits of git history**, in five files. It has been rotated
  and is dead. Removing it would require a history rewrite and a force push.
- **Seven synthetic rows** sit in `risk_results` under `user_id` 999001 from this verification.
  They are harmless but they are not real data.
- **FastAPI documentation pages** are served at `/docs`, `/redoc` and `/openapi.json`. They sit
  behind the authorizer, so only a signed in user sees them, but self-service sign up is enabled
  on the user pool, so that is a low bar.
- **Secrets Manager was considered and not adopted.** It would cost about USD 0.40 per secret per
  month plus USD 0.05 per 10,000 API calls, so roughly USD 0.45 per month at this traffic. It
  buys managed rotation and an audit trail, neither of which this project needs yet. Plain Lambda
  environment variables are the right level until rotation becomes a requirement.

---

# Session 2 — 2026-09-12, hardening and evidence

**Scope:** close the CloudWatch health-data leak, remove the synthetic rows, restore local
development, settle the load-test claim with evidence, and add client-side validation.
**Outcome:** all five completed. One claim in the paper is contradicted by AWS metrics.

## 7. The CloudWatch leak was real, not theoretical

Session 1 listed this as a possible risk. It is now confirmed, reproduced, and closed.

A `StatementError` was forced deliberately by sending `user_id` 9999999999. That exceeds the
PostgreSQL `int4` maximum of 2147483647 but passes Pydantic, which puts no bound on `user_id`,
so the INSERT fails and rolls back. Every value used was synthetic.

Before the fix, CloudWatch received the complete patient record:

```
sqlalchemy.exc.DataError: (psycopg2.errors.NumericValueOutOfRange) integer out of range
[SQL: INSERT INTO risk_results (...) VALUES (...)]
[parameters: {'user_id': 9999999999, 'age': 44, 'gender': 'male', 'smoker': False,
 'systolic_bp': 133, 'ldl': 111, 'hdl': 55, 'diabetes': False, 'family_history': False,
 'bmi': 24.221453287197235, ...}]
```

After adding `hide_parameters=True` to `create_engine`, the same probe produces:

```
sqlalchemy.exc.DataError: (psycopg2.errors.NumericValueOutOfRange) integer out of range
[SQL: INSERT INTO risk_results (...) VALUES (...)]
[SQL parameters hidden due to hide_parameters=True]
```

A search of the 90 seconds of log around the second probe found zero occurrences of any value
from the request. Doing the before-and-after in that order matters: without the "before", an
absence of parameters would not prove the guard works, only that the test never reached the
code path.

**Pre-existing leak, not remediated.** A search of the entire retained log history found ten
bound-parameter dumps. One is the pre-fix probe from today, which is synthetic. The other nine
are from 2026-03-04, spread over 39 minutes across five log streams, which is the shape of hand
testing rather than an automated burst. They were **not read**, because they may contain real
patient records and rule 8 forbids it. The log group has **no retention policy**, so they are
kept indefinitely. Arman needs to decide what happens to them. Setting a retention period on
the log group would age them out without anyone having to read them.

## 8. Synthetic rows removed

Nine rows under `user_id` 999001 were deleted, seven from the session 1 verification and two
from verification calls made earlier in this session.

```sql
DELETE FROM risk_results WHERE user_id = 999001;
```

The delete ran inside a transaction that would only commit if an integrity fingerprint over
every other user was unchanged. The fingerprint is one md5 over the sorted list of
`user_id:row_count` pairs excluding the target, so it proves nothing else moved without
revealing anything about anyone.

| Measure | Before | After |
|---|---|---|
| Total rows | 17007 | 16998 |
| Rows for user_id 999001 | 9 | 0 |
| Distinct user_id values | 208 | 207 |
| Fingerprint of all other users | 1c75446ff02d63ca5b2082af71beec7f | 1c75446ff02d63ca5b2082af71beec7f |

No row contents were read, printed or exported at any point.

## 9. Local development restored

`http://localhost:5173` was added alongside the Amplify origin, in both places that matter.

The Lambda variable map was rebuilt from the live one rather than retyped, so every existing
key was carried across. This is the failure mode that `update-function-configuration` invites:
the call replaces the whole map, and a partial list silently deletes `DB_PASSWORD`. After the
change all six variables are present and `DB_PASSWORD` is still 20 characters.

```
https://main.d184n5jh1hilpp.amplifyapp.com -> HTTP 200, origin echoed back
http://localhost:5173                      -> HTTP 200, origin echoed back
https://evil.example.com                   -> HTTP 400 Disallowed CORS origin
```

## 10. The load-test claim: the metrics contradict the paper

The paper states that the failure rate at 500 virtual users was caused by connection exhaustion
at the t3.micro database, and that the bottleneck was not the serverless tier. No k6 output or
summary file exists anywhere in the working tree or in git history, so the run was reconstructed
from CloudWatch metrics.

The test date is pinned by the Cognito ID token hardcoded in `stress_test.js`, which was issued
2026-05-14 at 20:09 UTC and expired one hour later. CloudWatch shows two load bursts that day
and almost no traffic on any other day in the period.

2026-05-14, hourly:

| Hour UTC | Lambda invocations | Throttles | Lambda errors | Max concurrent | Gateway count | 4xx | 5xx |
|---|---|---|---|---|---|---|---|
| 19:00 | 10196 | 16313 | 0 | 10 | 26509 | 10194 | 16313 |
| 20:00 | 15543 | 16850 | 0 | 10 | 32393 | 0 | 16850 |

Three facts settle it.

1. **Lambda `Errors` was zero for the entire day.** Not one application-level failure. A database
   connection exhaustion raises an exception inside the function, which increments `Errors`. It
   never happened.
2. **Gateway 5xx equals Lambda `Throttles` exactly**, in both hours, to the request. Every 5xx is
   accounted for by Lambda refusing to start a new execution environment. None is left over to be
   attributed to the database.
3. **Peak concurrent executions was exactly 10** in both hours, which is the account ceiling. The
   system sat pinned against that ceiling for the whole test.

The failing requests never reached the database, so the database cannot have been the
bottleneck. The bottleneck was the serverless tier, specifically the account concurrency limit.

Two further problems with the evidence base:

- **The committed k6 script never reaches 500 virtual users.** Its stages ramp to 50, hold at
  100, then ramp down. A comment claims 500 while the code says `target: 100`.
- **The specific figure of 64.38% could not be reproduced** from the retained metrics. The
  closest measures are 52.02% of requests returning 5xx in the 20:00 hour, and 73.6% returning
  4xx or 5xx across both hours. The causal claim is contradicted regardless of which denominator
  the paper used.

Verdict: **contradicts the paper.** This is a P0 under the rule in CLAUDE.md section 1.

## 11. Client-side validation with Zod

`zod` was a transitive development dependency of the ESLint plugin, so importing it would have
worked by accident and broken the moment that plugin changed. It is now a declared production
dependency pinned to the version already resolved in the lockfile, 4.1.13, so the Amplify
`npm ci` build installs exactly what was tested.

`frontend/src/utils/validation.js` holds one schema mirroring `RiskInputSchema`. Validation runs
in two places: the submit handler, which renders a message under the offending field, and the
store immediately before `fetch`, which is the single point every assessment passes through.
The store logs field names only, never values.

The bounds in `RiskInputSchema` are age 20-100, height 50-250, weight 11-300, systolic 60-250,
LDL 10-500, HDL 5-150. The schema mirrors them exactly. The frontend's previous hand-rolled
checks disagreed with the server in four places, all of them stricter than the server, so users
were being refused values the API would have accepted:

| Field | Frontend before | Server | Now |
|---|---|---|---|
| LDL upper | 400 | 500 | 500 |
| HDL lower | 10 | 5 | 5 |
| Weight lower | 20 (input attribute only) | 11 | 11 |
| Systolic lower | 80 (slider floor) | 60 | 60 |

Height, weight and systolic were not checked at all in the submit handler. The `min` and `max`
attributes on a number input do not block a typed value without a native form submit, so
out-of-range values could reach the API.

One deliberate deviation: the schema bounds `user_id` to the PostgreSQL `int4` range. Pydantic
does not, which is exactly the gap that turns a bad id into HTTP 500 instead of 422. The existing
`generateUserId` already keeps the value inside that range, so the bound cannot reject a
legitimate request.

The server-side Pydantic layer was not weakened or removed. It still answers 422 independently.

## 12. New findings from this session

- **A real Cognito ID token is hardcoded in `backend/AWS/Lambda/stress_test.js` and committed.**
  It carries a real user's email address and Cognito subject id. It expired on 2026-05-14 at
  21:09 UTC so it grants nothing now, but it is personal data in a git repository.
  `cold_start_bench.py` has the same pattern.
- **`user_id` has no bound in `RiskInputSchema`.** Any value above 2147483647 produces HTTP 500
  rather than 422. The Zod schema now guards it on the client, but the server is still open to it
  from any other client.
- **`frontend/node_modules` is tracked in git**, 5644 files, and `.gitignore` does not exclude it.
  This is why the repository is large and why dependency changes produce noisy diffs.
- **ESLint fails on 21 pre-existing errors**, all of them the same false positive where the rule
  does not recognise `motion.div` as a use of the imported `motion`. Not introduced by this work.
- **`QuickCheckInForm.jsx` is dead code.** Nothing imports it. It also calls `runAssessment()`
  with no token, which would produce 401, and `saveAssessment()` with no arguments, which returns
  early. It was left untouched.

## 13. Rollback

Every change in this session is reversible.

- Lambda code: the package running before this session was saved before deploying. The
  pre-deploy `CodeSha256` was `yBBm53GKP22grlTCAbX9m4qWq8O7jcOrNLk1WE+5Bg8=`; after, it is
  `oDA3DFwghKtmntHGgl/zVcbcKZaSrUUMRTy4RT6NdEw=`.
- Lambda variables and gateway CORS: revert by removing `http://localhost:5173` from both.
- Frontend: `git revert` the commit and push. Amplify rebuilds from `main` automatically.
- The deleted synthetic rows are the one irreversible change, and they were synthetic. The
  manual snapshot `before-lockdown-12sep` predates the deletion.
