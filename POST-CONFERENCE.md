# POST-CONFERENCE.md

Deferred work, collected 2026-09-12. **Nothing here is to be done before the SoftCom 2026 talk on
17 to 19 September 2026.** Each item was found during the restore and hardening sessions and
deliberately left alone because the risk of changing it that week outweighed the benefit.

Full reasoning for every item is in `FINDINGS.md`. Severities use the same scale as that document.

| # | Severity | Item | One line |
|---|---|---|---|
| 1 | **P0** | Archive the real user records off the live deployment | `risk_results` holds 17002 real health records on a public demo advertised by a QR code, with self-service sign-up enabled; decide a lawful basis and retention period, then archive or delete. |
| 2 | **P1** | Reserved concurrency of 20, the moment the quota increase lands | The ceiling of 10 is currently the only thing stopping a spike from exhausting the roughly 112 connections a `db.t3.micro` allows; raising the quota removes that accidental protection, so the deliberate cap must replace it in the same change. |
| 3 | **P2** | Set `PubliclyAccessible=false` on `wellbeat-db-new` | The security group is closed, but the instance still carries a public address, so this is defence in depth rather than an open door. |
| 4 | **P2** | Bound `user_id` in `RiskInputSchema` | Any value above 2147483647 passes Pydantic and fails on INSERT, so the user sees HTTP 500 where 422 is correct; the Zod schema already guards the browser, the server does not. |
| 5 | **P2** | Purge the secrets still in git history | Four expired Cognito ID tokens carrying a real email address and the rotated database password remain in earlier commits; removing them needs a history rewrite and a force push. |
| 6 | **P2** | Stop tracking `frontend/node_modules` | 5644 dependency files are committed and `.gitignore` does not exclude them, which is why the repository is large and dependency changes produce unreadable diffs. |
| 7 | **P2** | Delete or wire up `QuickCheckInForm.jsx` | Nothing imports it, and it calls `runAssessment()` with no token and `saveAssessment()` with no arguments, so it would fail if it ever were wired up. |

## Suggested order

Item 1 first, because it is the only one that is a live compliance exposure rather than an
engineering debt. Item 2 is time-coupled: it has to happen in the same change as the quota
increase, not afterwards. Items 3 to 7 can be done in any order and are safe to batch.

## Items deliberately not on this list

- The load-test claim in the paper. The paper is frozen and the correction is being delivered in
  the talk instead. See `docs/talk-load-test-correction.md`.
- The modelling assumptions in the risk engine, including `total_chol = ldl + hdl + 30`, the
  arrhythmia term and the BMI terms. These are published and frozen; they are documented in
  section 4 of `CLAUDE.md` as reporting items, not defects to fix.
- The 21 ESLint errors in the frontend. All are the same false positive where the rule does not
  recognise `motion.div` as a use of the imported `motion`. Cosmetic, and not worth a rule change
  that might mask a real unused import later.
