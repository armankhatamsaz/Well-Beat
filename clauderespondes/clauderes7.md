Git is clean and in sync. Both documents are written.

Git state confirmed. Your working tree was clean before I started and local main matches origin/main at 916ae24. All five files from the last session are present in the remote commit, alongside your clauderes6.md.

FINDINGS.md gained a subsection under 21 covering the reserved concurrency action. The reasoning it records is the part worth remembering: the ceiling of 10 is currently the only thing protecting the database from connection exhaustion, so raising the quota removes an accidental safeguard. The deliberate cap has to go in as part of the same change rather than as a follow-up. A db.t3.micro allows roughly 112 connections and the pool takes up to five per execution environment, so 20 reservations caps the worst case near 100.

POST-CONFERENCE.md lists all seven deferred items in a table with severities, one line each.

┌──────────┬────────────────────────────────────────────────────────┐
│ Severity │                          Item                          │
├──────────┼────────────────────────────────────────────────────────┤
│ P0       │ Archive the real user records off the live deployment  │
├──────────┼────────────────────────────────────────────────────────┤
│ P1       │ Reserved concurrency of 20, the moment the quota lands │
├──────────┼────────────────────────────────────────────────────────┤
│ P2       │ PubliclyAccessible=false on the instance               │
├──────────┼────────────────────────────────────────────────────────┤
│ P2       │ Bound user_id in the Pydantic schema                   │
├──────────┼────────────────────────────────────────────────────────┤
│ P2       │ Purge the secrets still in git history                 │
├──────────┼────────────────────────────────────────────────────────┤
│ P2       │ Stop tracking frontend/node_modules                    │
├──────────┼────────────────────────────────────────────────────────┤
│ P2       │ Delete or wire up the dead check-in form               │
└──────────┴────────────────────────────────────────────────────────┘

I ranked the archiving item P0 rather than leaving it level with the rest. It is the only entry on the list that is a live compliance exposure rather than engineering debt. The table holds 17002 real health records, the deployment is advertised by a QR code in a published paper, and self-service sign-up is open. Everything else on the list is something that could go wrong. That one already is.

The file also records two ordering constraints and a short section naming what was deliberately left off, so nobody reopens the frozen modelling assumptions or the cosmetic lint errors thinking they were missed.

Uncommitted right now: the FINDINGS.md edit and the new POST-CONFERENCE.md. Neither touches the frontend, so a push would rebuild an identical bundle.