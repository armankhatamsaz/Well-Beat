The lockdown is complete and verified. The database is no longer reachable from the internet, and the application is healthy.

## Result
The network lockdown is done. With AWSLambdaVPCAccessExecutionRole attached, the function
attached to the VPC in 2 minutes 3 seconds, every check passed on the new path while the public
rule was still open, and only then was the 0.0.0.0/0 rule removed. Port 5432 was open from this
laptop before the change and times out after it, while a cold invocation still reaches the
database through the group-to-group rule alone. There is no measurable latency penalty. Log
retention is set to 30 days and the nine March parameter dumps are gone without anyone reading
them. All four files that carried a hardcoded Cognito token are now clean, including the two you
approved after my last report. Both documents are saved under docs/. The commit is ready but not
pushed, because you asked to see its contents first.

## Evidence

Stage 3, attachment and verification on the new path with the public rule still open:

    VpcConfig: 3 subnets across eu-south-1a, 1b, 1c, security group sg-092e73d1fd27b91ce
    wait function-updated -> real 2m3.051s

    direct Lambda invoke  -> statusCode 200, risk 50.4%, bmi 27.8, apob 135.4, heart_age 62
    POST /risk/static     -> 200, same values
    GET  /risk/history    -> 200, rows returned
    CORS amplify / localhost / evil -> 200 / 200 / 400
    error-like lines in CloudWatch since attachment -> 0

Six Lambda interfaces, two per subnet, none with a public address, which is the mechanical reason
the function has no internet route:

    eu-south-1a  172.31.38.45   172.31.37.185
    eu-south-1b  172.31.5.187   172.31.1.57
    eu-south-1c  172.31.25.10   172.31.22.67

Stage 4. Before and after, same laptop, same hostname:

    BEFORE  resolves to 15.161.36.53,  TCP 5432 : OPEN (connected in 0.02s)
    AFTER   resolves to 15.161.36.53,  TCP 5432 : unreachable, TimeoutError after 15.0s

The application check that matters is the cold one, because a warm container could still hold a
connection opened while the old rule existed. Execution environments were recycled first:

    COLD  POST /risk/static  HTTP 200  total 3.159901s  -> risk 50.4%, saved to database
    WARM  POST /risk/static  HTTP 200  total 0.108569s
    WARM  POST /risk/static  HTTP 200  total 0.192095s
    WARM  POST /risk/static  HTTP 200  total 0.111806s

Latency against the recorded baseline. No penalty worth acting on:

    outside the VPC   cold 3.221s wall, Init 2663.28 ms   warm 0.125-0.152s, 9-11 ms
    inside  the VPC   cold 3.240s wall, Init 2616.51 ms   warm 0.095-0.192s, 12-15 ms

The only inbound rule left on the database:

    RuleId sgr-0fe43bf9ad47e72a3  tcp 5432  Cidr null  SourceSG sg-092e73d1fd27b91ce

Stage 5, retention set to 30 days. Counts only, content never read:

    Log events remaining in March 2026                  : 0
    Log events older than the 30-day cutoff, 2026-08-13 : 0
    Bound-parameter dumps remaining in the whole group  : 1

The one remaining dump is 2026-09-12 14:55 UTC, the deliberate pre-fix probe from session 2 with
synthetic user_id 9999999999. It ages out on 2026-10-12.

Stage 6, all four token files clean, verified by a full-tree scan:

    clean: no tokens, no passwords

Synthetic rows cleared using the temporary-access procedure from section 18, twice, each with the
revoke wired to run even on failure. 12 rows then 1 row, all five integrity checks passing each
time, fingerprint b2cfebcf983134c7c3223479e594e4a2 unchanged across both deletes. The table now
holds 17002 rows, all real. Closure was re-confirmed from outside after each cycle.

Final state:

    site 200 | API without a token 401 | /reset-db 401 | evil origin 400
    Lambda VPC vpc-03afb752c708dd477 | RDS inbound rules 1 | retention 30 days
    errors in the last 30 minutes 0 | TCP 5432 from the internet: unreachable

## Findings

- [Resolved, was P0] The database is no longer reachable from the internet. The 0.0.0.0/0 rule on
  port 5432 is revoked and the only remaining path is from the Lambda security group.
- [P2] The instance still has PubliclyAccessible set to true, so it keeps a public address even
  though nothing may connect to it. Setting that flag to false is the thorough fix. It modifies
  the RDS instance, which this session forbade, and it is worth doing after the conference.
- [P2] The function now has no route to the internet. That is correct today because main.py makes
  no outbound calls, proven by the absence of any HTTP client library in the deployed package. If
  anything is ever added that calls an external service, it will fail by timeout with no obvious
  cause. This is recorded in FINDINGS.md so the next person hits an explanation rather than a
  mystery.
- [P2] Four expired tokens and the old database password remain in git history. Removing a secret
  from the working tree does not remove it from history. All are expired or rotated.
- [Note] CloudWatch logging still works inside the VPC, confirmed by reading REPORT lines after
  the move. Log delivery does not travel over the function's network interface, so no VPC endpoint
  is needed. Worth knowing before anyone spends money on one.

## Changed

AWS:
- WellBeat-Risk-Engine attached to vpc-03afb752c708dd477, three subnets across three availability
  zones, security group sg-092e73d1fd27b91ce. Six Lambda interfaces created.
- Revoked sgr-0a302b81325c0cc52, the 0.0.0.0/0 rule on port 5432.
- Set 30-day retention on /aws/lambda/WellBeat-Risk-Engine.
- Deleted 13 synthetic rows, 12 under user_id 999001 and 1 under 999002.
- Two temporary /32 rules added and revoked within the same command, both confirmed gone.
- Function description updated twice, which is how cold starts were forced.

Not changed: main.py, the risk engine, the frontend, the API, the RDS instance settings.
CodeSha256 is still oDA3DFwghKtmntHGgl/zVcbcKZaSrUUMRTy4RT6NdEw=.

Files, uncommitted:
- FINDINGS.md, sections 14 to 22 rewritten to record the completed lockdown, the verification, the
  undo procedure, the retention result and the token scrub.
- backend/AWS/Lambda/phase1_2_validation.py and test_2_2_equivalence.py, token replaced with a
  WELLBEAT_TOKEN environment read.
- docs/aws-quota-request.md and docs/talk-load-test-correction.md, new.

## Open questions for Arman

1. **Blocking: may I push?** The commit is five paths and no frontend file is touched, so Amplify
   will rebuild and produce an identical bundle. Say go and I will commit and push.

       M  FINDINGS.md
       M  backend/AWS/Lambda/phase1_2_validation.py
       M  backend/AWS/Lambda/test_2_2_equivalence.py
       A  docs/aws-quota-request.md
       A  docs/talk-load-test-correction.md

2. One thing I changed against your instruction, and you should overrule me if you disagree. You
   said to leave the section 18 wording as it is. Its opening sentence read "This does not apply
   yet", which became false the moment Stage 4 completed, so I changed that one sentence to "This
   now applies" and added a line saying the scripts will now fail with a connection timeout. The
   six procedure steps you approved are preserved word for word.
3. PubliclyAccessible is still true on the instance. Worth flipping after the conference, not
   before. Tell me if you want it on the post-conference list.
4. Once the quota increase lands, consider a reserved concurrency ceiling of about 20 so a traffic
   spike cannot open more database connections than a db.t3.micro will accept. The reasoning and
   the command are in docs/aws-quota-request.md. AWS will refuse to set it until the quota is
   raised.