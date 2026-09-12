"""DISABLED on 2026-09-12. Do not re-enable.

This script used to open a connection to the production database and run

    DROP TABLE IF EXISTS risk_results;

using a password written in plaintext on the line above it. Both problems are
gone: the password has been rotated and removed, and the destructive statement
has been deleted rather than parameterised, because there is no safe version of
it. risk_results holds real users' cardiovascular assessments, which are
special-category health data under GDPR. Dropping it is not recoverable beyond
the most recent RDS snapshot.

If you need to create the schema on a fresh database, use init_db.py in this
directory. It only calls create_all().

If you genuinely need to destroy data, do it deliberately and by hand against a
named instance, with a fresh snapshot taken first. Do not put it in a script
that sits in the repository waiting to be run by accident.
"""

import sys

sys.exit(
    "reset_db.py is disabled. It used to drop the risk_results table. "
    "Use init_db.py to create the schema instead."
)
