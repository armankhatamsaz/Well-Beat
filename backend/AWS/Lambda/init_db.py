"""One-off schema bootstrap for the WellBeat database.

Replaces the GET /reset-db route that was removed from main.py on 2026-09-12.

Run this by hand from a workstation. It is deliberately not reachable over HTTP
and it is deliberately not destructive: it only ever calls create_all(), which
creates tables that do not yet exist and leaves existing tables, columns and
rows untouched. There is no drop path in this file.

The model definitions are imported from main.py rather than restated here, so
the created schema cannot drift away from what the API expects.

Usage, PowerShell:

    $env:DB_HOST = "wellbeat-db-new.cxm8ui4akb82.eu-south-1.rds.amazonaws.com"
    $env:DB_NAME = "wellbeatdb"
    $env:DB_USER = "wellbeat_admin"
    $env:DB_PASSWORD = "<paste, do not commit>"
    python backend/AWS/Lambda/init_db.py

A note on migrations: create_all() can add a missing table but it cannot alter
an existing one. While risk_results is a single frozen table this is enough. If
the schema ever has to change shape after the camera-ready paper, move to
Alembic rather than extending this script.
"""

import sys

from sqlalchemy import inspect

from main import Base, engine


def main():
    inspector = inspect(engine)
    before = set(inspector.get_table_names())
    print("Tables present before: " + (", ".join(sorted(before)) or "(none)"))

    Base.metadata.create_all(bind=engine)

    after = set(inspect(engine).get_table_names())
    created = sorted(after - before)
    print("Tables created: " + (", ".join(created) or "(none, schema already present)"))
    print("Tables present after:  " + ", ".join(sorted(after)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
