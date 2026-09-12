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
from verification calls made earlier in this session. The same guarded delete was run a second
time at the very end of the session, removing a further two rows created by the post-deployment
checks, so `user_id` 999001 holds nothing. Both runs passed every integrity check.

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

---

# Session 3 — 2026-09-12, network lockdown, retention, token scrub

**Scope:** move the Lambda inside the VPC and close the public database rule, set log retention,
remove the committed Cognito token, draft the quota increase request.
**Outcome:** all of it completed. **The database is no longer reachable from the internet.**

## 14. The network lockdown is done

The first attempt failed. Attaching the function to the VPC was rejected immediately:

```
An error occurred (InvalidParameterValueException) when calling the
UpdateFunctionConfiguration operation: The provided execution role does not have
permissions to call CreateNetworkInterface on EC2
```

That was a clean rejection rather than a partial failure. Lambda validates the execution role
before it changes anything, so `VpcConfig` stayed null, the function never entered a pending
state, and the application was not interrupted.

Arman then attached the managed policy `AWSLambdaVPCAccessExecutionRole` to the execution role
`WellBeat-Risk-Engine-role-t9mmq85e`, and the work resumed and completed. The sequence was:

1. Attach the function to all three subnets with `wellbeat-lambda-sg`. Took 2 minutes 3 seconds
   while Lambda created its network interfaces.
2. Verify on the new path while the public rule was still open.
3. Remove the `0.0.0.0/0` rule.
4. Verify again, including from a cold start so the connection was genuinely new.

**Order mattered.** The public rule was not touched until the VPC path had been proven.

### Verification, with the function inside the VPC and the public rule still open

| Check | Result |
|---|---|
| Direct Lambda invoke, synthetic patient | 200, risk 50.4%, BMI 27.8, ApoB 135.4 |
| `POST /risk/static` through the gateway | 200, same values |
| `GET /risk/history/999001` | 200, rows returned |
| CORS from the two allowed origins | 200 each |
| CORS from `https://evil.example.com` | 400 |
| Error-like lines in CloudWatch since attachment | 0 |

### Verification after the public rule was removed

The important test is a **cold** call, because a warm container may still hold a pooled connection
opened while the old rule existed. Execution environments were recycled first, so the call below
opened a brand-new TCP connection with only the group-to-group rule permitting it.

| Check | Result |
|---|---|
| Cold `POST /risk/static` through the gateway | 200, risk 50.4%, saved to database |
| Three warm calls | 200, 0.109 s to 0.192 s |
| `GET /risk/history` | 200 |
| Port 5432 from a laptop on the public internet, before | **OPEN**, connected in 0.02 s |
| Port 5432 from the same laptop, after | **unreachable**, timed out after 15 s |

### Latency: no measurable penalty

| | Cold wall clock | Cold Init | Warm wall clock | Warm duration |
|---|---|---|---|---|
| Before, outside the VPC | 3.221 s | 2663.28 ms | 0.125 to 0.152 s | 9 to 11 ms |
| After, inside the VPC | 3.240 s | 2616.51 ms | 0.095 to 0.192 s | 12 to 15 ms |

The old multi-second penalty for VPC-attached Lambdas does not apply; AWS moved to shared
Hyperplane interfaces years ago. Warm duration rose by a few milliseconds, which is the private
network path, and is not worth acting on.

**CloudWatch logging still works.** This is worth stating because the function now has no route to
the internet. Log delivery does not travel over the function's network interface, so no VPC
endpoint for CloudWatch Logs is needed. Confirmed by reading the REPORT lines after the move.

## 15. Network facts, established and worth keeping

| Item | Value |
|---|---|
| VPC | `vpc-03afb752c708dd477`, the default VPC, `172.31.0.0/16` |
| Subnet, eu-south-1a | `subnet-08759be0133739e10`, `172.31.32.0/20` |
| Subnet, eu-south-1b | `subnet-082c07f12f86943fe`, `172.31.0.0/20`, **the database lives here** |
| Subnet, eu-south-1c | `subnet-018d5c825e4617fe6`, `172.31.16.0/20` |
| Route table | `rtb-01db225381b8008ab`, main, no explicit associations |
| Routes | `172.31.0.0/16` local, `0.0.0.0/0` to `igw-05d6eeefe7fbf538c` |
| NAT gateways | none |
| VPC endpoints | none |
| ENIs in region | 3, all belonging to RDS. Quota 5000 |
| `enableDnsSupport` / `enableDnsHostnames` | both true |

Two conclusions follow.

All three subnets are public, in the sense that they route to an internet gateway. A Lambda
interface never receives a public address, so a function placed in them has **no internet
access**. That is acceptable only because the function needs none, which was proven three ways:
the import list contains no HTTP client, a search for `requests`, `httpx`, `boto3`, `urlopen`,
`urllib.request`, `socket`, `http.client` and `aiohttp` in the running source returns nothing,
and the deployed package bundles **no HTTP client library at all**, not even `urllib3`. The only
network-capable component in the package is `psycopg2`. The single `urllib` import is
`quote_plus`, which is string escaping, and the Amplify URL in the file is a CORS allow-list
entry that is compared against, never fetched. Token validation happens at the API Gateway
authorizer, outside the function.

Because both VPC DNS attributes are true, the database endpoint resolves to a **private** address
from inside the VPC. No code change is needed for the move. From outside it currently resolves to
the public address `15.161.36.53`.

## 16. Final network state

| Resource | Id | State |
|---|---|---|
| Lambda security group | `sg-092e73d1fd27b91ce` (`wellbeat-lambda-sg`) | 6 interfaces in use, 2 per subnet |
| Rule: 5432 from the Lambda group | `sgr-0fe43bf9ad47e72a3` | **the only inbound rule on the database** |
| Rule: 5432 from `0.0.0.0/0` | `sgr-0a302b81325c0cc52` | **revoked** |

The six Lambda interfaces all have private addresses and **no public address**, which is the
mechanical reason the function has no internet access:

```
eu-south-1a  172.31.38.45   172.31.37.185
eu-south-1b  172.31.5.187   172.31.1.57
eu-south-1c  172.31.25.10   172.31.22.67
```

**Still open:** the instance keeps `PubliclyAccessible: true`, so it retains a public address even
though nothing may now connect to it. Setting that flag to false would be the thorough fix. It
modifies the RDS instance, which this session's rules forbade, and it is worth doing after the
conference.

## 17. How to undo this, if it ever has to be undone

```bash
# put the public rule back (about 5 seconds to take effect)
aws ec2 authorize-security-group-ingress --group-id sg-02ffe13c200596078 \
  --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=0.0.0.0/0}]"

# detach the function from the VPC (60 to 120 seconds)
aws lambda update-function-configuration --function-name WellBeat-Risk-Engine \
  --vpc-config "SubnetIds=[],SecurityGroupIds=[]"
aws lambda wait function-updated --function-name WellBeat-Risk-Engine
```

Run the first command alone if the symptom is that the application cannot reach the database. It
is the fastest way back to a working state and it does not require detaching anything.

## 18. Database access from a laptop

**This now applies.** The public rule was removed on 2026-09-12, so `init_db.py`, `acid_test.py`
and `latency_test.py` can no longer be run from a laptop. They will fail with a connection
timeout, and so will any direct `psql` or `psycopg2` session, including the guarded synthetic-row
cleanup used in session 2. That is the intended outcome, not a fault.

**Do not leave a standing rule in place for convenience.** An always-open rule scoped to a home or
university address is still a permanent hole in front of special-category health data, and those
addresses change, which leads to the rule being widened until it is `0.0.0.0/0` again.

The correct procedure when someone genuinely needs direct access:

1. Write down why access is needed and what will be run. A schema migration qualifies. Browsing
   data does not.
2. Take a manual RDS snapshot first if anything will be written.
3. Add a temporary inbound rule for **one address with a /32 mask**, never a range, and put the
   reason and the date in the rule description:
   ```bash
   aws ec2 authorize-security-group-ingress --group-id sg-02ffe13c200596078 \
     --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=<your.ip>/32,Description='<reason>, added <date>, remove same day'}]"
   ```
4. Do the work.
5. Remove the rule in the same working session, and confirm it is gone:
   ```bash
   aws ec2 revoke-security-group-ingress --group-id sg-02ffe13c200596078 \
     --security-group-rule-ids <the rule id returned in step 3>
   aws ec2 describe-security-group-rules --filters Name=group-id,Values=sg-02ffe13c200596078
   ```
6. Confirm from outside that the port is closed again.

The better long-term answer is not to need the rule at all. A schema migration can run from a
small one-off Lambda inside the VPC using the same security group, which leaves no inbound path
open at any point. That is worth building after the conference rather than before it.

This procedure was exercised twice at the end of this session to remove the synthetic rows left by
verification, and it works. Each cycle took under a minute, the rule carried a reason and a date
in its description, the revoke was wired to run even if the work failed, and closure was
re-confirmed from outside afterwards.

## 19. Log retention: the old leak is gone

A 30-day retention policy was set on `/aws/lambda/WellBeat-Risk-Engine`, which previously had none
and kept everything forever.

The nine bound-parameter dumps from 2026-03-04 are **gone**. They were never read. Verified by
count, not by content:

| Check | Result |
|---|---|
| Log events remaining in March 2026 | 0 |
| Log events older than the 30-day cutoff of 2026-08-13 | 0 |
| Bound-parameter dumps remaining in the whole group | 1 |

The single remaining dump is from 2026-09-12 at 14:55 UTC. That is the deliberate pre-fix probe
from session 2, carrying the synthetic record with `user_id` 9999999999. It ages out on
2026-10-12.

## 20. Committed tokens removed

Four files carried a hardcoded Cognito ID token. All four now read `WELLBEAT_TOKEN` from the
environment and fail with a clear message naming the variable when it is missing. Neither a token
nor the email address it carried was printed at any point.

| File | Previously held |
|---|---|
| `backend/AWS/Lambda/stress_test.js` | ID token expired 2026-05-14 |
| `backend/AWS/Lambda/cold_start_bench.py` | ID token expired 2026-05-14 |
| `backend/AWS/Lambda/phase1_2_validation.py` | ID token expired 2026-05-15 |
| `backend/AWS/Lambda/test_2_2_equivalence.py` | ID token expired 2026-05-15 |

Each token carried a real email address, Cognito username, subject id and display name. All were
expired and granted nothing, but all were personal data committed to the repository.

```bash
k6 run -e WELLBEAT_TOKEN="<id token>" stress_test.js
export WELLBEAT_TOKEN="<id token>" && python phase1_2_validation.py
```

A full working-tree scan found nothing else. The Cognito pool and app client ids in `CLAUDE.md`
and `frontend/src/main.jsx` are published client configuration, not secrets. The email address in
`Login.jsx` is a placeholder on `example.com`. The connection string quoted in this file carries
the literal text `<redacted>`, not a password.

Note that removing a secret from the working tree does not remove it from git history. The four
tokens and the old database password all remain in earlier commits. All are expired or rotated.

## 21. Quota increase and the talk correction

**The quota request was submitted by Arman himself** through the AWS CLI on 2026-09-12, and AWS
has acknowledged it. The text in `docs/aws-quota-request.md` is therefore a **backup copy only**,
kept in case the case has to be reopened, escalated or repeated for another region. That file also
records how to check whether the increase has landed, and why a reserved concurrency ceiling is
worth setting once it has.

`docs/talk-load-test-correction.md` holds the paragraph to deliver at the conference, the
supporting metrics table, an honest note that the 64.38 percent figure could not be reproduced,
and answers to the questions most likely to follow. Arman's decision is to correct this in the
talk rather than in the frozen paper.

### Action once the quota increase lands: set reserved concurrency to 20

The concurrency ceiling of 10 is currently the only thing protecting the database from being
overwhelmed by connections. Raising the quota to 1000 removes that accidental protection, so a
deliberate ceiling has to replace it in the same change, not later.

A `db.t3.micro` allows roughly 112 connections, and the SQLAlchemy pool is configured for up to
five per execution environment (`pool_size=2`, `max_overflow=3`). A reservation of 20 caps the
worst case at about 100 connections, which stays inside the limit with a little room.

```bash
aws lambda get-account-settings --query 'AccountLimit.ConcurrentExecutions'   # wait for 1000
aws lambda put-function-concurrency \
  --function-name WellBeat-Risk-Engine --reserved-concurrent-executions 20
```

AWS refuses to set a reservation unless at least 100 unreserved concurrent executions remain in
the account, so this is only possible after the increase lands. Verify afterwards with
`aws lambda get-function-concurrency --function-name WellBeat-Risk-Engine`.

Tracked in `POST-CONFERENCE.md`.

## 22. State at the end of this session

| Item | Value |
|---|---|
| Database reachable from the internet | **no** |
| Only inbound rule on the database | TCP 5432 from `sg-092e73d1fd27b91ce` |
| Lambda VPC attachment | 3 subnets, 3 AZs, `sg-092e73d1fd27b91ce` |
| Lambda `CodeSha256` | `oDA3DFwghKtmntHGgl/zVcbcKZaSrUUMRTy4RT6NdEw=`, unchanged since session 2 |
| Log retention | 30 days |
| Synthetic rows in `risk_results` | none; 13 removed across two guarded transactions |
| Total rows | 17002, all real |
| Site, API, CORS | 200, 401 without a token, evil origin 400 |

`main.py`, the risk engine and the frontend were not touched in this session.
