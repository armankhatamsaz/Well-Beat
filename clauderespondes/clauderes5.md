Stage 3 is blocked and I stopped there as instructed. The database is still open to the internet. Stages 5 to 7 are complete.

Here is the support case text.

Subject: Request to increase Lambda concurrent executions quota in eu-south-1

Account:   947095430580
Region:    eu-south-1 (Europe, Milan)
Quota:     Lambda concurrent executions
Current:   10
Requested: 1000

This account has a Lambda concurrent executions limit of 10 in eu-south-1, which is
below the standard regional default. The account was temporarily suspended when its
Free Tier allowance ended and has since been reinstated on a paid plan. We believe the
reduced limit dates from that period.

The account runs a single Lambda function, WellBeat-Risk-Engine, behind an HTTP API. It
supports an academic research prototype in cardiovascular risk estimation that will be
presented at an international conference between 17 and 19 September 2026. The published
material includes a link to the live deployment, so we expect a short burst of concurrent
traffic from attendees. At the current limit, the eleventh simultaneous request is
throttled.

Please raise the concurrent executions quota for eu-south-1 to 1000, the standard default.

Thank you.

And the paragraph for the talk.

A note on the load test results. After the paper was finalised we re-examined the
performance data using CloudWatch metrics from the test day, and the evidence points to a
different cause than the one we reported. Across the whole test day the Lambda Errors
metric was zero, which means the application itself never failed once. The number of 5xx
responses recorded by the API Gateway was exactly equal to the number of Lambda throttles,
so every failed request is explained by the function being refused a new execution
environment rather than by the database. Peak concurrent executions stayed at 10
throughout, which was the account's concurrency limit at the time. We have also confirmed
that the load script in our repository reaches 100 virtual users rather than 500. We
therefore believe the bottleneck was the concurrency limit of the serverless tier, not
connection exhaustion at the database, and that the failing requests never reached the
database at all. We are reporting this so the result is interpreted correctly.

## Result
The network lockdown is not done. Attaching the Lambda to the VPC was rejected because the
execution role cannot create network interfaces, and per your instruction I stopped there rather
than working around it. The rejection was clean: Lambda validates the role before changing
anything, so nothing entered a pending state and the application was never interrupted. The
preparation from Stage 2 is in place and harmless, so the change can be resumed in one command
once the IAM policy is attached. Stage 4 did not run, which means the database is still reachable
from the internet on port 5432. That remains the highest-severity open item. Stages 5, 6 and 7
all completed: retention is set and the nine March parameter dumps are gone, the committed token
is out of the two named scripts, and both pieces of text are above.

## Evidence

Stage 3, the blocker, verbatim:

    An error occurred (InvalidParameterValueException) when calling the
    UpdateFunctionConfiguration operation: The provided execution role does not have
    permissions to call CreateNetworkInterface on EC2

Immediately afterwards, nothing had changed and the application was healthy:

    Lambda VpcConfig : None
    State            : Active,  LastUpdate: Successful
    POST /risk/static -> 50.4% | bmi 27.8 | apob 135.4 | Result successfully saved to database.
    site 200,  API with no token 401

Stage 1 facts that made the plan safe. All three subnets sit on one main route table,
rtb-01db225381b8008ab, with 172.31.0.0/16 local and 0.0.0.0/0 to igw-05d6eeefe7fbf538c. There is
no NAT gateway and there are no VPC endpoints. Both enableDnsSupport and enableDnsHostnames are
true, which is what makes the database endpoint resolve to a private address inside the VPC. Three
ENIs exist in the region against a quota of 5000.

Outbound calls from the function: none. Proven three ways rather than by reading imports alone.
The import list has no HTTP client. A search for requests, httpx, boto3, urlopen, urllib.request,
socket, http.client and aiohttp in the running source returns nothing. The deployed package
bundles no HTTP client library at all, not even urllib3; the only network-capable component is
psycopg2. The deployed main.py is byte-identical to the working copy.

Stage 2, both paths open as designed:

    RuleId                  Port  Cidr       SourceSG
    sgr-0fe43bf9ad47e72a3   5432  None       sg-092e73d1fd27b91ce
    sgr-0a302b81325c0cc52   5432  0.0.0.0/0  None

    ENIs using sg-092e73d1fd27b91ce: 0

Stage 5, retention. The policy went from none to 30 days, and the old leak is gone. Counts only,
content never read:

    Log events remaining in March 2026                  : 0
    Log events older than the 30-day cutoff, 2026-08-13 : 0
    Bound-parameter dumps remaining in the whole group  : 1

The one remaining dump is 2026-09-12 14:55 UTC, the deliberate pre-fix probe from session 2 with
synthetic user_id 9999999999. It ages out on 2026-10-12.

Stage 6, after the scrub:

    files still holding a JWT: phase1_2_validation.py  test_2_2_equivalence.py
    no passwords anywhere in the working tree

Synthetic rows cleared while access still exists, with the same guarded transaction as before:
total 17004 to 17002, user_id 999001 from 2 to 0, fingerprint b2cfebcf983134c7c3223479e594e4a2
unchanged across the delete, all five integrity checks passed.

## Findings

- [P0] The database is still reachable from the internet on port 5432. The lockdown did not
  complete, so nothing about the exposure changed today. The instance also still has
  PubliclyAccessible set to true.
- [P0] The execution role WellBeat-Risk-Engine-role-t9mmq85e lacks the EC2 network interface
  permissions Lambda needs for VPC access. It needs the managed policy
  AWSLambdaVPCAccessExecutionRole. I could not check or fix this because your settings file
  denies aws iam:*, which is the correct setting and I am not asking you to change it.
- [P1] Two more files carry the same class of committed Cognito ID token and were left alone
  because your instruction named only two files. phase1_2_validation.py and
  test_2_2_equivalence.py each hold an ID token that expired on 2026-05-15, carrying a real email
  address, Cognito username, subject id and name. Expired, so they grant nothing, but they are
  personal data in the repository. One line each to fix.
- [P1] Stage 3 passing would not have proven the new rule works. While 0.0.0.0/0 is present it
  also permits private source addresses, so a VPC-attached function connects regardless. The real
  test is the moment the public rule is removed. This is written into FINDINGS.md so whoever
  resumes does not skip the second verification.
- [P2] Removing a secret from the working tree does not remove it from git history. Four tok

## Changed

AWS:
- Created security group sg-092e73d1fd27b91ce, wellbeat-lambda-sg, no inbound rules, zero
  members. Cost zero.
- Added rule sgr-0fe43bf9ad47e72a3 to the RDS group, TCP 5432 from that group. Cost zero. It
  grants nothing today because the group has no members.
- Set 30-day retention on /aws/lambda/WellBeat-Risk-Engine.
- Deleted 2 synthetic rows under user_id 999001.

Not changed: the Lambda configuration, including VpcConfig which is still null; the 0.0.0.0/0
rule; the RDS instance; the API; the frontend; main.py and the risk engine. CodeSha256 is still
oDA3DFwghKtmntHGgl/zVcbcKZaSrUUMRTy4RT6NdEw=.

Files, all uncommitted in the working tree:
- backend/AWS/Lambda/stress_test.js and cold_start_bench.py, token replaced by a WELLBEAT_TOKEN
  environment read with a clear message when it is missing.
- FINDINGS.md, new section 14 to 21 covering the blocker, the network facts, how to resume, the
  future database access procedure, the retention result and the token scrub.

Nothing needs rolling back.

## Open questions for Arman

1. Attach AWSLambdaVPCAccessExecutionRole to WellBeat-Risk-Engine-role-t9mmq85e, then tell me and
   I will resume from Stage 3. The exact commands are in section 17 of FINDINGS.md. My honest
   read on timing: this is a five minute change plus verification, but it is the only step in the
   whole programme that can take the demo down, and you have five days. I would rather do it now
   with time to roll back than the night before, but that is your call and waiting until after
   the conference is a defensible answer.
2. Shall I scrub the token from phase1_2_validation.py and test_2_2_equivalence.py? You named two
   files and I stayed inside that, but leaving two identical tokens behind seems like the wrong
   place to stop.
3. Section 18 of FINDINGS.md documents the future laptop-access procedure you asked for, written
   as taking effect once the public rule is removed rather than as already in force, since it is
   not. Tell me if you want it worded as though the lockdown is already done.
4. The support case and the talk paragraph are above, not submitted and not in a file. Say the
   word if you want them saved into the repository.