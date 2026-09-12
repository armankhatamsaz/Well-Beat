# AWS support case: Lambda concurrency quota increase

**Status: backup copy. Not submitted from here.**

Arman submitted this request himself through the AWS CLI on 2026-09-12 and AWS has acknowledged
it. This file is kept only so the wording is available if the case has to be reopened, escalated,
or repeated for another region.

**Background.** The account's Lambda concurrent executions limit in `eu-south-1` is 10, far below
the standard regional default. Evidence from CloudWatch shows this limit was already 10 during
the load tests on 2026-05-14, where peak concurrent executions sat pinned at exactly 10 while
33,163 requests were throttled. See section 10 of `FINDINGS.md`.

---

## Case text

```
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
```

---

## Checking whether it has been applied

```bash
aws lambda get-account-settings --query 'AccountLimit.ConcurrentExecutions'
```

A value of 10 means the increase has not taken effect yet. Once it reads 1000, consider setting a
**reserved concurrency** ceiling on the function so that a traffic spike cannot open more database
connections than a `db.t3.micro` can accept. That instance class allows roughly 112 connections,
and the pool is configured for up to 5 per execution environment, so a reservation of about 20 is
a sensible starting point.

```bash
aws lambda put-function-concurrency \
  --function-name WellBeat-Risk-Engine --reserved-concurrent-executions 20
```

Note that AWS refuses to set a reservation unless at least 100 unreserved concurrent executions
remain in the account, so this is only possible after the quota increase lands.
