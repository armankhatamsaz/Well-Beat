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
| 8 | **P2** | Silence the recharts `width(-1) and height(-1)` warning | Cosmetic: `ResponsiveContainer` in recharts 3.5.0 warns once on every mount because it initialises its size to `-1` before measuring, and recharts ships that warning to production. Both charts render correctly. The only fix is an `initialDimension`, which risks a one-frame flash in Figure 4, so it was not worth doing the week of the talk. Check whether a later recharts release drops the warning before changing any chart code. |
| 9 | **P2** | Make local development work end to end against Cognito | `http://localhost:5173/` is in neither `CallbackURLs` nor `LogoutURLs` on the app client, so neither login nor logout can be exercised locally. Session 4 added the production sign-out URL only. Adding both localhost entries is a one-field change but widens the app client, so do it deliberately rather than in a hurry. |
| 10 | **P2** | Review the `react-hooks/set-state-in-effect` error in `App.jsx` | Surfaced when the ESLint tally was recounted in session 4. It is a real rule, not the `motion` false positive, and it flags the login-sync effect pattern that produced the history race. Worth understanding now that the duplicate call is gone. |

## Suggested order

Item 1 first, because it is the only one that is a live compliance exposure rather than an
engineering debt. Item 2 is time-coupled: it has to happen in the same change as the quota
increase, not afterwards. Items 3 to 10 can be done in any order and are safe to batch.

## Items deliberately not on this list

- The load-test claim in the paper. The paper is frozen and the correction is being delivered in
  the talk instead. See `docs/talk-load-test-correction.md`.
- The modelling assumptions in the risk engine, including `total_chol = ldl + hdl + 30`, the
  arrhythmia term and the BMI terms. These are published and frozen; they are documented in
  section 4 of `CLAUDE.md` as reporting items, not defects to fix.
- The 21 ESLint errors in the frontend, **with one exception now split out as item 10**. Session 2
  recorded all 21 as the same `motion.div` false positive; a recount in session 4 showed the tally
  is 16 `no-unused-vars`, 3 `react-hooks/static-components`, 1 `react-hooks/set-state-in-effect`
  and 1 `no-useless-escape`. The 16 are the false positive and remain not worth a rule change that
  might mask a real unused import later.
