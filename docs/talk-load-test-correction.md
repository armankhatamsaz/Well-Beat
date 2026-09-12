# Load test correction, for the conference talk

Prepared 2026-09-12 for the SoftCom 2026 presentation, 17 to 19 September 2026.

The paper is camera-ready and frozen. Arman's decision is to correct this in the talk rather than
in the paper. The paragraph below is written as a transparent correction, not as a retraction of
the work and not as an accusation.

---

## Paragraph to deliver

> A note on the load test results. After the paper was finalised we re-examined the performance
> data using CloudWatch metrics from the test day, and the evidence points to a different cause
> than the one we reported. Across the whole test day the Lambda Errors metric was zero, which
> means the application itself never failed once. The number of 5xx responses recorded by the API
> Gateway was exactly equal to the number of Lambda throttles, so every failed request is
> explained by the function being refused a new execution environment rather than by the database.
> Peak concurrent executions stayed at 10 throughout, which was the account's concurrency limit at
> the time. We have also confirmed that the load script in our repository reaches 100 virtual
> users rather than 500. We therefore believe the bottleneck was the concurrency limit of the
> serverless tier, not connection exhaustion at the database, and that the failing requests never
> reached the database at all. We are reporting this so that the result is interpreted correctly.

---

## The supporting numbers, if asked

Test date 2026-05-14. The date is pinned by the expiry of the Cognito token that was embedded in
the load script, which was valid only between 20:09 and 21:09 UTC that day. Metrics are at
one-hour resolution because finer granularity is no longer retained.

| Hour UTC | Lambda invocations | Throttles | Lambda errors | Peak concurrent | Gateway requests | 4xx | 5xx |
|---|---|---|---|---|---|---|---|
| 19:00 | 10196 | 16313 | 0 | 10 | 26509 | 10194 | 16313 |
| 20:00 | 15543 | 16850 | 0 | 10 | 32393 | 0 | 16850 |

Three points carry the argument.

1. **Lambda Errors was zero for the entire day.** A database connection failure raises an
   exception inside the function, which increments this metric. It never happened.
2. **Gateway 5xx equals Lambda Throttles exactly**, in both hours, request for request. Nothing is
   left over to attribute to the database.
3. **Peak concurrency was exactly 10**, the account ceiling, for the whole test.

## What we could not reproduce, and should say honestly if pressed

The specific figure of 64.38 percent could not be derived from the retained metrics. The closest
measures are 52.02 percent of requests returning 5xx in the 20:00 hour, and 73.6 percent returning
either 4xx or 5xx across both hours. No k6 output or summary file survives in the repository or in
its git history, so the original calculation cannot be checked. The causal claim is contradicted
whichever denominator was used, but the exact number cannot be confirmed either way. If someone
asks, say that.

## Anticipated questions

**Why did the limit sit at 10?** The account had been temporarily suspended when its Free Tier
allowance ended and was reinstated on a paid plan. The reduced quota appears to date from that
period. An increase to the standard default of 1000 has been requested.

**Does this invalidate the architecture?** No. It means the reported saturation point measured the
account's concurrency quota rather than the database tier. The database was never reached by the
failing requests, so its behaviour under that load remains untested rather than disproven.

**Will you re-run the test?** Only after the quota increase lands, and against a database that
holds no real patient records. Re-running it now would prove nothing, because the ceiling is still
10, and it would write rows into a table containing real users' health data.
